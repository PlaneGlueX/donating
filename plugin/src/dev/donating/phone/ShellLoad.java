package dev.donating.phone;

import me.deecaad.weaponmechanics.weapon.firearm.FirearmState;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponFirearmEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponPostShootEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadCancelEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadCompleteEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponScopeEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponSkinEvent;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerItemHeldEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.scheduler.BukkitTask;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The ends of a shell-by-shell reload (2026-10-13; the owner: "give the Shotgun a reload animation like the other
 * guns'"). WeaponMechanics loads a gun with Ammo_Per_Reload one load at a time, each its own reload (the Shotgun: a
 * shell per 4 ticks), so the pack's frames for a load are a loop, and the gun would snap into its loading pose at the
 * first shell and out of it after the last. Two named WeaponMechanics skins mark the ends (the weapon's Skin section:
 * Shell_In ADD 10000, Shell_Out ADD 20000): the first load of a chain is drawn with Shell_In (the pose eases in), and
 * for gunfx.guns.<title>.exit ticks after the last load the gun at rest with Shell_Out and an exit clock (the pose
 * eases out). WeaponMechanics' pump after a reload from empty comes right after the last load: Shell_Out stays on for
 * its action clock (GunFx, flag 1), so the pump starts from the pose. WeaponMechanics writes the skin number itself
 * (WeaponSkinEvent#setSkin), so unlike a custom_model_data flag it isn't lost when it rewrites the item.
 *
 * WeaponMechanics 4.3.1 (ReloadHandler, source): a load's task ends with finishReload (the complete event, then the skin
 * update) and starts the next load in the same call (its reload event, then the skin update), so a load whose reload
 * event comes in the tick of the last one's completion is the same chain. The main hand only (the frames are first
 * person).
 */
final class ShellLoad implements Listener {
    static final String IN = "Shell_In";
    static final String OUT = "Shell_Out";

    private static final class St {
        final String title;
        int loadUntil; // a load is running until about this tick (0: none; a load WeaponMechanics drops without an event runs out)
        boolean in; // ...and it's the chain's first
        int outUntil; // Shell_Out until this tick (0: off)
        int lastDone = Integer.MIN_VALUE; // the tick the last load completed (the next load in that tick is chained)
        boolean pumped; // the exit became the pump
        St(String title) { this.title = title; }
    }

    private final PhonePlugin plugin;
    private final GunFx fx;
    private final Map<UUID, St> states = new HashMap<>();
    private final Set<UUID> recheck = new HashSet<>(); // a state just ended: drop a named skin still on the gun
    private BukkitTask task;
    long ins, outs, pumps, refreshes; // status

    ShellLoad(PhonePlugin plugin, GunFx fx) { this.plugin = plugin; this.fx = fx; }

    String summary() { return "shells{active=" + states.size() + " ins=" + ins + " outs=" + outs + " pumps=" + pumps + " refreshes=" + refreshes + "}"; }

    private int now() { return plugin.getServer().getCurrentTick(); }

    /** True while the reload's pose is still on screen: a load, or the pose easing out (BagHide keeps the bag away). */
    boolean busy(Player p, int slack) {
        St st = states.get(p.getUniqueId());
        return st != null && (st.loadUntil > now() || st.outUntil - slack > now());
    }

    private St mine(Player p, String title) {
        St st = states.get(p.getUniqueId());
        return st != null && st.title.equals(title) ? st : null;
    }

    // ---------- the chain ----------

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onReload(WeaponReloadEvent e) {
        if (!fx.enabled() || !e.isMainHand() || !(e.getShooter() instanceof Player p) || e.getAmmoPerReload() <= 0) return;
        GunFx.Gun g = fx.gun(e.getWeaponTitle());
        if (g == null || g.exit() <= 0 || !fx.reloadStarts(e)) return;
        St st = mine(p, e.getWeaponTitle());
        boolean chained = st != null && st.lastDone == now();
        if (st == null) states.put(p.getUniqueId(), st = new St(e.getWeaponTitle()));
        st.loadUntil = now() + e.getReloadTime() + 10;
        st.in = !chained;
        st.outUntil = 0;
        st.pumped = false;
        if (st.in) ins++;
        startTask();
    }

    // The exit clock replaces the load's (GunFx ends it here first: it's registered before this); the next load, if
    // any, comes in this same tick and replaces it in turn, so the client never sees it between loads.
    @EventHandler(priority = EventPriority.MONITOR)
    public void onComplete(WeaponReloadCompleteEvent e) {
        if (!e.isMainHand() || !(e.getShooter() instanceof Player p)) return;
        St st = mine(p, e.getWeaponTitle());
        GunFx.Gun g = fx.gun(e.getWeaponTitle());
        // Aiming during a load: the next load's start zooms out with no scope event and no skin update (ReloadHandler
        // 4.3.1, ifZoomingForceZoomOut), so after the last load the gun stayed drawn aimed. Its own update a tick later.
        if (g != null && g.exit() > 0 && GunFx.zooming(p))
            plugin.getServer().getScheduler().runTask(plugin, () -> { if (p.isOnline() && !GunFx.zooming(p) && fx.refreshSkin(p)) refreshes++; });
        if (st == null || g == null) return;
        st.loadUntil = 0;
        st.in = false;
        st.lastDone = now();
        st.outUntil = now() + g.exit();
        outs++;
        fx.clock(p, st.title, g.exit());
    }

    // The pump after a reload from empty: WeaponMechanics opens it in the tick of the last load, or (the spare shells ran
    // out first) the player's click does during the exit. Shell_Out for the whole pump, so it starts from the pose
    // (GunFx draws it with its action clock and flag 1). WeaponMechanics reports OPEN again when the pump closes.
    @EventHandler(priority = EventPriority.MONITOR)
    public void onFirearm(WeaponFirearmEvent e) {
        if (!e.isMainHand() || e.getState() != FirearmState.OPEN || !(e.getShooter() instanceof Player p)) return;
        St st = mine(p, e.getWeaponTitle());
        GunFx.Gun g = fx.gun(e.getWeaponTitle());
        if (st == null || g == null || st.pumped || st.outUntil <= now() || g.action() <= 0) return;
        st.pumped = true;
        st.outUntil = now() + g.action();
        pumps++;
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onSkin(WeaponSkinEvent e) {
        if (e.isForceDefault() || !e.isMainHand() || !(e.getShooter() instanceof Player p) || !fx.enabled() || !"default".equals(e.getSkin())) return;
        St st = mine(p, e.getWeaponTitle());
        if (st == null) return;
        if (st.in) e.setSkin(IN);
        else if (st.outUntil > now()) e.setSkin(OUT);
    }

    // ---------- anything else ends it ----------

    @EventHandler(priority = EventPriority.MONITOR)
    public void onCancel(WeaponReloadCancelEvent e) { if (e.isMainHand() && e.getShooter() instanceof Player p) end(p); }

    // A shot ends the pose (the shot's frames take over); a shot WeaponMechanics turns into the pump isn't a shot.
    @EventHandler(priority = EventPriority.MONITOR)
    public void onShot(WeaponPostShootEvent e) { if (e.isMainHand() && e.getShooter() instanceof Player p && mine(p, e.getWeaponTitle()) != null) end(p); }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onScope(WeaponScopeEvent e) { if (e.isMainHand() && e.getShooter() instanceof Player p && mine(p, e.getWeaponTitle()) != null) leave(p); }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onHeld(PlayerItemHeldEvent e) { leave(e.getPlayer()); }

    // Aiming or a slot change during the exit: its clock goes too, or the aimed or resting frames would read it as a
    // shot's (a pump's action clock stays: WeaponMechanics still works the pump).
    private void leave(Player p) {
        St st = states.get(p.getUniqueId());
        if (st != null && st.loadUntil <= now() && st.outUntil > now() && !st.pumped) fx.clock(p, st.title, 0);
        end(p);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) { states.remove(e.getPlayer().getUniqueId()); recheck.remove(e.getPlayer().getUniqueId()); }

    private void end(Player p) {
        if (states.remove(p.getUniqueId()) == null) return;
        recheck.add(p.getUniqueId());
        startTask();
    }

    private void startTask() {
        if (task == null) task = plugin.getServer().getScheduler().runTaskTimer(plugin, this::tick, 1L, 1L);
    }

    // Each tick: an exit (or a pump after one) that ran out ends; a gun still carrying a named skin after its state
    // ended gets WeaponMechanics' own skin update (which no longer adds one).
    private void tick() {
        int t = now();
        for (Iterator<Map.Entry<UUID, St>> it = states.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<UUID, St> en = it.next();
            St st = en.getValue();
            if (st.loadUntil > t || st.outUntil > t) continue;
            it.remove();
            recheck.add(en.getKey());
        }
        for (UUID u : recheck) {
            Player p = plugin.getServer().getPlayer(u);
            if (p != null && !states.containsKey(u)) refresh(p);
        }
        recheck.clear();
        if (states.isEmpty() && task != null) { task.cancel(); task = null; }
    }

    private void refresh(Player p) {
        if (named(p.getInventory().getItemInMainHand()) && fx.refreshSkin(p)) refreshes++;
    }

    // A named skin (ADD 10000..90000) in the skin number: WeaponMechanics' states only add 1000s.
    private static boolean named(ItemStack s) {
        var cmd = s.getData(io.papermc.paper.datacomponent.DataComponentTypes.CUSTOM_MODEL_DATA);
        return cmd != null && !cmd.floats().isEmpty() && cmd.floats().get(0) >= 10000;
    }
}
