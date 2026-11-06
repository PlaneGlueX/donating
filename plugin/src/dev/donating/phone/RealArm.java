package dev.donating.phone;

import com.destroystokyo.paper.event.server.ServerTickEndEvent;
import com.github.retrooper.packetevents.PacketEvents;
import com.github.retrooper.packetevents.protocol.entity.data.EntityData;
import com.github.retrooper.packetevents.protocol.entity.data.EntityDataTypes;
import com.github.retrooper.packetevents.protocol.player.HumanoidArm;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerEntityMetadata;
import io.papermc.paper.datacomponent.DataComponentTypes;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadCancelEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadEvent;
import net.kyori.adventure.key.Key;
import org.bukkit.GameMode;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.player.PlayerChangedWorldEvent;
import org.bukkit.event.player.PlayerItemHeldEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.MainHand;
import org.bukkit.scheduler.BukkitTask;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The player's own arm in a reload (2026-11-04; the owner: "use the player hand on the reload animation instead of the
 * fake looking hand"). An item model can't draw the skin, but the client draws the real arm for an empty main hand, on
 * the side its main arm says, and a player's main arm is entity data the server can send (26.3: Avatar.getMainArm reads
 * DATA_PLAYER_MAIN_HAND; LocalPlayer doesn't override it). So for the holder alone, while the reload plays: main hand
 * empty, main arm the other way round, and the gun in the offhand, which then draws on the gun's usual side with the
 * usual first-person frames and cooldown. The real left arm comes up beside the gun. The server's inventory and what
 * other players see never change, and WeaponMechanics goes on with the real gun.
 *
 * The steps (the client swaps a hand's item over about 3 ticks down and 3 up, and would show an old item on the new side):
 * gun and bag slide down; arm flipped, arm and gun come up; near the end both slide down (an invisible item in the main
 * hand takes the arm down); arm flipped back, gun and bag come up as the reload ends. A tick-end resend covers
 * WeaponMechanics' own slot packets, as in BagHide.
 *
 * gunfx.real-arm lists the guns. Their pack frames draw no glove on the left (spec.hands.realArm). Limits: the arm only has its
 * idle pose and a swing (the server can't pose it), the held hotbar slot looks empty meanwhile, and the holder's own F5
 * shows the arm flipped. shortcut: one fixed metadata index (Avatar's first field), check it when the server's version
 * moves; the plugin's jar is built against 26.1.2.
 */
final class RealArm implements Listener {
    static final int SWAP = 3;         // ticks for the client's slide down
    static final int MIN_TICKS = 16;   // a reload too short to play it out
    static final int MAX_TICKS = 240;  // whatever happens (a missed end)
    private static final int MAIN_ARM_INDEX = 15; // Avatar.DATA_PLAYER_MAIN_HAND: after Entity's 8 and LivingEntity's 7
    private static final Key NOTHING = Key.key("donating", "hand_nothing"); // draws nothing anywhere (make-item-art.js)

    private static final class Run {
        final int start, end, slot;
        final int[] swings;
        boolean flipped, sinking;
        Run(int start, int end, int slot, int[] swings) { this.start = start; this.end = end; this.slot = slot; this.swings = swings; }
    }

    private final PhonePlugin plugin;
    private final GunFx fx;
    private final Set<String> guns = new HashSet<>();
    private boolean on = true;
    private final Map<UUID, Run> runs = new HashMap<>();
    private BukkitTask task;
    long plays;

    RealArm(PhonePlugin plugin, GunFx fx) { this.plugin = plugin; this.fx = fx; }

    void configure(List<String> list) { guns.clear(); guns.addAll(list); }

    boolean covers(String weapon) { return on && guns.contains(weapon); }

    // /dphone gunfx realarm on|off, until the next restart: to compare, and for the bag-hide scenario (the frames keep no glove).
    void set(boolean value) {
        on = value;
        if (!on) shutdown();
    }

    String summary() { return "real-arm=" + (on ? guns : "off") + " playing=" + runs.size() + " plays=" + plays; }

    private int now() { return plugin.getServer().getCurrentTick(); }

    private void arm(Player p, boolean flipped) {
        boolean left = (p.getMainHand() == MainHand.LEFT) != flipped;
        PacketEvents.getAPI().getPlayerManager().sendPacket(p, new WrapperPlayServerEntityMetadata(p.getEntityId(),
            List.of(new EntityData<>(MAIN_ARM_INDEX, EntityDataTypes.HUMANOID_ARM, left ? HumanoidArm.LEFT : HumanoidArm.RIGHT))));
    }

    // The gun's copy: its name, so the hotbar's name line stays the gun's as the arm goes down.
    private static ItemStack nothing(ItemStack gun) {
        ItemStack s = gun.clone();
        s.setData(DataComponentTypes.ITEM_MODEL, NOTHING);
        return s;
    }

    private static final ItemStack AIR = new ItemStack(Material.AIR);

    // What the holder should see in each hand at this step.
    private void send(Player p, Run r) {
        ItemStack gun = p.getInventory().getItem(r.slot);
        p.sendEquipmentChange(p, EquipmentSlot.HAND, r.sinking ? nothing(gun) : AIR);
        p.sendEquipmentChange(p, EquipmentSlot.OFF_HAND, r.flipped && !r.sinking ? gun : AIR);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onReload(WeaponReloadEvent e) {
        if (!fx.enabled() || !e.isMainHand() || !(e.getShooter() instanceof Player p) || !covers(e.getWeaponTitle()) || !fx.reloadStarts(e)) return;
        int ticks = Math.max(e.getReloadCompleteTime(), e.getReloadTime());
        if (ticks < MIN_TICKS || p.getGameMode() == GameMode.CREATIVE || !MenuPanels.packLoaded(p)) return;
        Run r = new Run(now(), now() + Math.min(ticks, MAX_TICKS), p.getInventory().getHeldItemSlot(), new int[] { now() + 6, now() + ticks - 11 });
        runs.put(p.getUniqueId(), r);
        send(p, r);
        plays++;
        if (task == null) task = plugin.getServer().getScheduler().runTaskTimer(plugin, this::tick, 1L, 1L);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onCancel(WeaponReloadCancelEvent e) { if (e.getShooter() instanceof Player p) end(p); }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onHeld(PlayerItemHeldEvent e) { end(e.getPlayer()); }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onDeath(PlayerDeathEvent e) { end(e.getPlayer()); }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onWorld(PlayerChangedWorldEvent e) { end(e.getPlayer()); }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) { runs.remove(e.getPlayer().getUniqueId()); }

    @EventHandler
    public void onTickEnd(ServerTickEndEvent e) {
        for (Map.Entry<UUID, Run> en : runs.entrySet()) {
            Player p = plugin.getServer().getPlayer(en.getKey());
            if (p != null) send(p, en.getValue());
        }
    }

    private void tick() {
        int t = now();
        for (Iterator<Map.Entry<UUID, Run>> it = runs.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<UUID, Run> en = it.next();
            Player p = plugin.getServer().getPlayer(en.getKey());
            Run r = en.getValue();
            if (p == null) { it.remove(); continue; }
            if (t >= r.end - SWAP) { it.remove(); back(p); continue; }
            if (!r.flipped && t >= r.start + SWAP) { r.flipped = true; arm(p, true); }
            if (t >= r.end - 2 * SWAP) r.sinking = true;
            for (int s : r.swings) if (t == s) p.swingMainHand();
        }
        if (runs.isEmpty() && task != null) { task.cancel(); task = null; }
    }

    private void back(Player p) {
        arm(p, false);
        p.sendEquipmentChange(p, EquipmentSlot.OFF_HAND, p.getInventory().getItemInOffHand());
        p.updateInventory();
    }

    /** At once: a slot change, a shot, death, a world change. */
    void end(Player p) { if (runs.remove(p.getUniqueId()) != null && p.isOnline()) back(p); }

    void shutdown() {
        for (UUID u : runs.keySet()) {
            Player p = plugin.getServer().getPlayer(u);
            if (p != null) back(p);
        }
        runs.clear();
        if (task != null) { task.cancel(); task = null; }
    }
}
