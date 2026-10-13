package dev.donating.phone;

import com.destroystokyo.paper.event.server.ServerTickEndEvent;
import io.papermc.paper.datacomponent.DataComponentTypes;
import me.deecaad.weaponmechanics.WeaponMechanics;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadCancelEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadEvent;
import net.kyori.adventure.key.Key;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.inventory.InventoryOpenEvent;
import org.bukkit.event.player.PlayerChangedWorldEvent;
import org.bukkit.event.player.PlayerItemHeldEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.ItemStack;
import org.bukkit.scheduler.BukkitTask;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The offhand out of the left hand's way while a gun reloads (2026-10-12; the owner, PLAYTEST 183: hide the heist bag
 * while the reload plays, "fine if not"; handoff/2026-10-12/hands/PLAN.md section 3). UNTESTED: written in a cloud
 * session, never compiled or run; the client check is in PLAYTEST.
 *
 * The pack's gun frames draw a gloved left hand doing each reload, but the offhand holds the bag (leather) or the cash
 * in hand (paper), drawn in the same spot. No item-model property reads the main hand, so the offhand's own item has to
 * change, for its holder only. gunfx.bag-hide picks how:
 *
 * lookalike (default): the holder alone is sent a copy of their offhand (Player#sendEquipmentChange to themselves: a
 * ClientboundSetEquipmentPacket, which the client applies to its own offhand) whose item_model is donating:bag_hidden or
 * donating:cash_hidden (tools\make-item-art.js: the real tree with nothing in first person). About SHOW_EARLY ticks
 * before the reload ends, a copy with donating:bag_shown / cash_shown (the real tree); both have
 * hand_animation_on_swap true, so the client's own swap animation slides the bag down and back up. Then the real item
 * (its definition has the flag false: an instant, identical swap). The server's inventory never changes: Skript, the
 * offhand watchdog, bag.sk and WeaponMechanics see nothing. A real resync while hidden (bag.sk redrawing the fill, a
 * menu opening) would put the real bag back: each tick the real offhand is compared with the one copied, and on a
 * change or a menu opening the hidden copy is sent again at the tick's end (after the tick's own slot packets).
 *
 * cooldown: a cooldown on the offhand item's own group (minecraft:leather / minecraft:paper: neither has a use_cooldown)
 * for the reload's length; the pack's first-person bag and cash dip out over its first tenth and come back over its
 * last (bagDip). Simpler, but the hotbar's offhand slot shows the white sweep meanwhile, and a reload that ends early
 * pops the bag back.
 *
 * off: nothing.
 *
 * When: a WeaponMechanics reload that really starts (GunFx.reloadStarts) of a gun in gunfx.guns, in the main hand.
 * The Shotgun loads one shell per reload: the first shell hides, later shells keep it hidden, and it shows once
 * WeaponMechanics has not been reloading for IDLE ticks in a row, or a tick after the chain is cancelled. Aiming mid-reload
 * doesn't end WeaponMechanics' reload, so the bag stays hidden. A slot change, death, a world change and the plugin's
 * disable show it at once; a quit just forgets it (the client is gone). gunfx.enabled false (no frames, no hands) turns
 * it off too.
 */
final class BagHide implements Listener {
    enum Mode { LOOKALIKE, COOLDOWN, OFF }

    // Ticks before the reload ends that the shown copy is sent (the client's swap: about 3 ticks down, 3 up).
    static final int SHOW_EARLY = 3;
    // Ticks after the shown copy that the real item is sent (its rise is over).
    static final int REAL_AFTER = 8;
    // The longest a bag stays hidden, whatever happens (a missed end).
    static final int MAX_HIDDEN = 240;
    // Ticks in a row WeaponMechanics isn't reloading before the bag comes back (the Shotgun's shells chain: a tick's gap
    // between two must not bob it).
    static final int IDLE = 3;

    private static final Key LEATHER = Key.key("minecraft", "leather");
    private static final Key PAPER = Key.key("minecraft", "paper");

    private static final class Hidden {
        ItemStack source; // the real offhand when it was copied
        final int start;  // the tick it was hidden
        int end;          // the tick the reload should end (-1: unknown, the Shotgun's shells)
        int shownAt = -1; // the tick the shown copy went out (-1: still hidden)
        int idle;         // ticks in a row WeaponMechanics wasn't reloading
        Hidden(ItemStack source, int start, int end) { this.source = source; this.start = start; this.end = end; }
    }

    private final PhonePlugin plugin;
    private final GunFx fx;
    private Mode mode = Mode.LOOKALIKE;
    private final Map<UUID, Hidden> hidden = new HashMap<>();
    private final Set<UUID> resend = new HashSet<>(); // hidden copies to send again at this tick's end
    private final Map<UUID, Integer> cooled = new HashMap<>(); // players with an offhand cooldown from here: its end tick
    private BukkitTask task;
    long hides; // reloads hidden (status)

    BagHide(PhonePlugin plugin, GunFx fx) { this.plugin = plugin; this.fx = fx; }

    void configure(String value) {
        Mode m;
        try {
            m = Mode.valueOf(value == null ? "LOOKALIKE" : value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            plugin.getLogger().warning("gunfx.bag-hide: " + value + "? (lookalike, cooldown or off): lookalike");
            m = Mode.LOOKALIKE;
        }
        if (m != mode) shutdown(); // whatever the old mode hid comes back
        mode = m;
    }

    String summary() { return "bag-hide=" + mode.name().toLowerCase(Locale.ROOT) + " hidden=" + (mode == Mode.COOLDOWN ? cooled.size() : hidden.size()) + " hides=" + hides; }

    private int now() { return plugin.getServer().getCurrentTick(); }

    // "bag" for the heist bag, "cash" for the cash in hand, null for anything else (nothing to hide).
    private static String kind(ItemStack s) {
        if (s == null) return null;
        if (s.getType() == Material.LEATHER) return "bag";
        if (s.getType() == Material.PAPER) return "cash";
        return null;
    }

    private static ItemStack lookalike(ItemStack real, String look) {
        ItemStack copy = real.clone();
        copy.setData(DataComponentTypes.ITEM_MODEL, Key.key("donating", kind(real) + "_" + look));
        return copy;
    }

    private static boolean reloading(Player p) {
        try {
            return WeaponMechanics.getInstance().getPlayerWrapper(p).getMainHandData().isReloading();
        } catch (RuntimeException | LinkageError ex) {
            return false; // unknown: let the bag come back
        }
    }

    // ---------- Events ----------

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onReload(WeaponReloadEvent e) {
        if (mode == Mode.OFF || !fx.enabled() || !e.isMainHand() || !(e.getShooter() instanceof Player p) || fx.gun(e.getWeaponTitle()) == null || !fx.reloadStarts(e)) return;
        // A gun that loads a few rounds at a time gets one event per load: the length of the whole chain is unknown.
        int ticks = e.getAmmoPerReload() > 0 ? -1 : Math.max(e.getReloadCompleteTime(), e.getReloadTime());
        hide(p, ticks, e.getMagazineSize());
    }

    // A completed reload needs nothing here: a magazine gun's shown copy is already on its way (SHOW_EARLY), and the
    // Shotgun's next shell may follow; the tick shows the bag once WeaponMechanics stays idle (IDLE ticks).
    @EventHandler(priority = EventPriority.MONITOR)
    public void onReloadCancel(WeaponReloadCancelEvent e) { if (e.getShooter() instanceof Player p) checkSoon(p); }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onHeld(PlayerItemHeldEvent e) { show(e.getPlayer(), true); }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onDeath(PlayerDeathEvent e) { show(e.getPlayer(), true); }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onWorld(PlayerChangedWorldEvent e) { show(e.getPlayer(), true); }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        UUID u = e.getPlayer().getUniqueId();
        hidden.remove(u); resend.remove(u); cooled.remove(u);
    }

    // A menu opening resends every slot, the offhand's real item too (Paper's sendAllDataToRemote): hide it again
    // after that, at the tick's end.
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onOpen(InventoryOpenEvent e) {
        if (e.getPlayer() instanceof Player p) { Hidden h = hidden.get(p.getUniqueId()); if (h != null && h.shownAt < 0) resend.add(p.getUniqueId()); }
    }

    @EventHandler
    public void onTickEnd(ServerTickEndEvent e) {
        if (resend.isEmpty()) return;
        for (UUID u : resend) {
            Player p = plugin.getServer().getPlayer(u);
            Hidden h = hidden.get(u);
            if (p == null || h == null || h.shownAt >= 0) continue;
            ItemStack off = p.getInventory().getItemInOffHand();
            if (kind(off) != null) p.sendEquipmentChange(p, EquipmentSlot.OFF_HAND, lookalike(off, "hidden"));
        }
        resend.clear();
    }

    // ---------- Hide and show ----------

    private void hide(Player p, int ticks, int magazine) {
        ItemStack off = p.getInventory().getItemInOffHand();
        String kind = kind(off);
        if (kind == null) return;
        UUID u = p.getUniqueId();
        if (mode == Mode.COOLDOWN) {
            Integer until = cooled.get(u);
            if (until != null && until > now() && ticks < 0) return; // the Shotgun's next shell: already dipping
            // The Shotgun: the shells still to load at 4 ticks each, as a guess (fewer carried: the bag pops back early).
            int t = ticks >= 0 ? ticks : Math.max(8, 4 * Math.max(1, magazine - ammoLeft(p)));
            p.setCooldown(LEATHER, t);
            p.setCooldown(PAPER, t);
            cooled.put(u, now() + t);
            hides++;
            return;
        }
        Hidden h = hidden.get(u);
        if (h != null && h.shownAt < 0) { // already hidden (the Shotgun's next shell)
            if (ticks >= 0) h.end = now() + ticks;
            return;
        }
        hidden.put(u, new Hidden(off.clone(), now(), ticks >= 0 ? now() + ticks : -1));
        p.sendEquipmentChange(p, EquipmentSlot.OFF_HAND, lookalike(off, "hidden"));
        hides++;
        if (task == null) task = plugin.getServer().getScheduler().runTaskTimer(plugin, this::tick, 1L, 1L);
    }

    private int ammoLeft(Player p) {
        try {
            ItemStack gun = p.getInventory().getItemInMainHand();
            Integer left = gun.hasItemMeta() ? gun.getItemMeta().getPersistentDataContainer().get(new org.bukkit.NamespacedKey("weaponmechanics", "ammo-left"), org.bukkit.persistence.PersistentDataType.INTEGER) : null;
            return left == null ? 0 : left;
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    // A reload was cancelled: next tick, if WeaponMechanics isn't reloading again, the bag comes back.
    private void checkSoon(Player p) {
        UUID u = p.getUniqueId();
        if (!hidden.containsKey(u) && !cooled.containsKey(u)) return;
        plugin.getServer().getScheduler().runTaskLater(plugin, () -> { if (p.isOnline() && !reloading(p)) show(p, false); }, 1L);
    }

    /** The bag back for p: now = the real item at once (a slot change, death), else the shown copy's slide first. */
    void show(Player p, boolean now) {
        UUID u = p.getUniqueId();
        resend.remove(u);
        Integer until = cooled.remove(u);
        if (until != null && until > now()) { p.setCooldown(LEATHER, 0); p.setCooldown(PAPER, 0); }
        Hidden h = hidden.get(u);
        if (h == null) return;
        ItemStack off = p.getInventory().getItemInOffHand();
        if (now || kind(off) == null) {
            hidden.remove(u);
            if (p.isOnline()) p.sendEquipmentChange(p, EquipmentSlot.OFF_HAND, off);
        } else if (h.shownAt < 0) {
            h.shownAt = now();
            p.sendEquipmentChange(p, EquipmentSlot.OFF_HAND, lookalike(off, "shown"));
        }
    }

    private void tick() {
        int t = now();
        for (Iterator<Map.Entry<UUID, Hidden>> it = hidden.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<UUID, Hidden> en = it.next();
            Player p = plugin.getServer().getPlayer(en.getKey());
            Hidden h = en.getValue();
            if (p == null) { it.remove(); continue; }
            ItemStack off = p.getInventory().getItemInOffHand();
            if (h.shownAt >= 0) { // the slide up is over: the real item (an instant, identical swap)
                if (t - h.shownAt >= REAL_AFTER) { it.remove(); p.sendEquipmentChange(p, EquipmentSlot.OFF_HAND, off); }
                continue;
            }
            if (kind(off) == null) { it.remove(); continue; } // the offhand emptied (the bag sold, lost): nothing to hide
            if (!off.isSimilar(h.source)) { h.source = off.clone(); resend.add(en.getKey()); } // a resync put the real one back
            h.idle = reloading(p) ? 0 : h.idle + 1;
            boolean due = h.end >= 0 && t >= h.end - SHOW_EARLY;
            if (due || h.idle >= IDLE || t - h.start >= MAX_HIDDEN) {
                h.shownAt = t;
                resend.remove(en.getKey());
                p.sendEquipmentChange(p, EquipmentSlot.OFF_HAND, lookalike(off, "shown"));
            }
        }
        if (hidden.isEmpty() && task != null) { task.cancel(); task = null; }
    }

    /** Plugin disable or a mode change: every hidden bag back, every offhand cooldown off. */
    void shutdown() {
        for (UUID u : hidden.keySet()) {
            Player p = plugin.getServer().getPlayer(u);
            if (p != null) p.sendEquipmentChange(p, EquipmentSlot.OFF_HAND, p.getInventory().getItemInOffHand());
        }
        hidden.clear();
        resend.clear();
        for (Map.Entry<UUID, Integer> en : cooled.entrySet()) {
            Player p = plugin.getServer().getPlayer(en.getKey());
            if (p != null && en.getValue() > now()) { p.setCooldown(LEATHER, 0); p.setCooldown(PAPER, 0); }
        }
        cooled.clear();
        if (task != null) { task.cancel(); task = null; }
    }
}
