package dev.donating.phone;

import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.CustomModelData;
import io.papermc.paper.datacomponent.item.SwingAnimation;
import io.papermc.paper.datacomponent.item.UseCooldown;
import me.deecaad.weaponmechanics.WeaponMechanics;
import me.deecaad.weaponmechanics.weapon.firearm.FirearmAction;
import me.deecaad.weaponmechanics.weapon.firearm.FirearmState;
import me.deecaad.weaponmechanics.weapon.reload.ammo.AmmoConfig;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponEquipEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponFirearmEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponGenerateEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponPostShootEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadCancelEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadCompleteEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponScopeEvent;
import me.deecaad.weaponmechanics.wrappers.HandData;
import net.kyori.adventure.key.Key;
import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.Particle;
import org.bukkit.NamespacedKey;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.event.Event;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerItemHeldEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.scheduler.BukkitTask;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.TreeMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * The guns' first-person animations (2026-10-05; the owner: the sold guns remade as Pixel Gun 3D's, "i want the
 * animations"). The pack draws a gun's frames from the vanilla item cooldown (tools\guns\pg.js: an item definition's
 * minecraft:cooldown, 1 at the start of a cooldown, 0 at its end), so this starts a cooldown on the gun's own cooldown
 * group when WeaponMechanics reloads it (as long as the reload), after each shot (the slide or the pump, for the guns
 * that have one) and when it's drawn (the guns whose fire is drawn from the held key instead). One cooldown packet per
 * action; the client steps the frames on its own clock. WeaponMechanics keeps choosing the state (Default, Scope,
 * Sprint, Reload: the skin number), the cooldown only says how far into the action it is. The hotbar shows the
 * cooldown's white sweep meanwhile (the owner: "keep the sweep for now").
 *
 * The group: each gun carries a use_cooldown component naming donating:gun/<title> (set here when WeaponMechanics makes
 * the gun, and on any gun held without it), so its cooldown is its own (a feather's cooldown would be every gun's).
 * A feather is never "used", so the component's seconds never start a cooldown by themselves. Also the arm swing off
 * (swing_animation none): a left-click (the aim) or a click on a block doesn't swing the gun; the frames move it.
 *
 * The automatic guns' fire flicker (fire held) is drawn only while the gun really fires: their custom_model_data's
 * first flag is set here on each shot and cleared a few ticks after the last (the pack checks it with the held key), so
 * holding right-click on loot or with an empty gun shows no muzzle flash.
 *
 * Config gunfx.*: enabled, swing, guns.<title>.shot|draw (ticks; 0 = none), guns.<title>.alone (ticks: a shot that
 * works no firearm action plays only this much of the shot's frames, its kick; 0 = always the whole shot),
 * guns.<title>.fire (ticks the firing flag stays after the last shot; 0 = no flag), guns.<title>.action (ticks: a firearm
 * action WeaponMechanics works without a shot, like the shotgun's pump after a reload from empty, gets this clock and
 * custom_model_data flag 1, which the pack draws as the action alone; 0 = none). A gun with both shot and draw clocks
 * gets flag 2 while drawn (both read the Default state's clock; the pack picks the draw frames by the flag).
 *
 * Gun skins (2026-10-06; the owner: "revamp the gun skin system to have different skin variants of specific guns"): a
 * skin is an item definition of its own (assets/donating/items/gunskin_<gun>_<look>.json: the gun's states and frames on
 * the skin's models), put on the gun as its minecraft:item_model component. WeaponMechanics only ever writes the
 * custom_model_data floats (the state), so a skinned gun aims, sprints, reloads and fires the same frames. The player's
 * choices live in their PDC (donating:gunskins = "AK_47=donating:gunskin_ak47_golden;50_GS=default"), set by Skript
 * through /dphone gunskin (cosmetics.sk owns who owns what); applied when WeaponMechanics makes a gun, when one is held,
 * at join and when a choice changes, always in place on the live stack. No choice for a gun: the stack is left alone.
 * Config gunfx.skins.enabled (false: every gun back to its own look as it's touched).
 *
 * The Sniper Rifle's scope glint (guns.<title>.glint: ticks): while its holder looks through the scope, a glint at their
 * eye every N ticks for everyone else within 128 blocks (a forced particle), so a sniper can be spotted.
 */
final class GunFx implements Listener {
    private record Gun(Key group, int shot, int draw, int alone, int fire, int action, int glint) {}
    private record Firing(String title, int lastShot, int keep) {}

    private final PhonePlugin plugin;
    private final NamespacedKey titleKey = new NamespacedKey("weaponmechanics", "weapon-title");
    private final NamespacedKey ammoKey = new NamespacedKey("weaponmechanics", "ammo-left");
    // Each player's last clock per gun group (a number that only grows), so a shot's early end can't end a clock
    // started after it on that gun (an empty gun's reload starts in the same tick as its last shot).
    private final Map<UUID, Map<Key, Long>> clocks = new HashMap<>();
    private long clockNo;
    // Players whose automatic gun carries the firing flag, and when they last shot.
    private final Map<UUID, Firing> firing = new HashMap<>();
    // Each player's last shot tick per gun group (a firearm action in the same tick is the shot's own).
    private final Map<UUID, Map<Key, Integer>> lastShot = new HashMap<>();
    // ...and the tick a firearm-action clock started (one per action).
    private final Map<UUID, Map<Key, Integer>> lastAction = new HashMap<>();
    private BukkitTask firingTask;
    private final Map<String, Gun> guns = new HashMap<>();
    private boolean enabled = true;
    private boolean swing = false;
    private boolean skins = true;
    private final NamespacedKey skinsKey = new NamespacedKey("donating", "gunskins");
    private final Map<UUID, Map<String, String>> skinCache = new HashMap<>();
    // Players looking through a glinting scope: their glint task.
    private final Map<UUID, BukkitTask> glints = new HashMap<>();
    long started; // cooldowns started (status)

    GunFx(PhonePlugin plugin) { this.plugin = plugin; }

    void configure(FileConfiguration c) {
        enabled = c.getBoolean("gunfx.enabled", true);
        swing = c.getBoolean("gunfx.swing", false);
        skins = c.getBoolean("gunfx.skins.enabled", true);
        guns.clear();
        ConfigurationSection s = c.getConfigurationSection("gunfx.guns");
        if (s != null) for (String title : s.getKeys(false)) {
            String id = title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_.-]", "_");
            guns.put(title, new Gun(Key.key("donating", "gun/" + id), Math.max(0, s.getInt(title + ".shot", 0)), Math.max(0, s.getInt(title + ".draw", 0)),
                Math.max(0, s.getInt(title + ".alone", 0)), Math.max(0, s.getInt(title + ".fire", 0)), Math.max(0, s.getInt(title + ".action", 0)),
                Math.max(0, s.getInt(title + ".glint", 0))));
        }
        plugin.getLogger().info("gunfx: " + (enabled ? guns.size() + " guns" : "off"));
    }

    String status() {
        StringBuilder b = new StringBuilder("GUNFX enabled=" + enabled + " swing=" + swing + " skins=" + (skins ? "on" : "off") + " glints=" + glints.size() + " started=" + started + " firing=" + firing.size() + " guns=");
        guns.forEach((t, g) -> b.append(t).append('{').append(g.group.asString()).append(" shot=").append(g.shot).append(" draw=").append(g.draw)
            .append(" alone=").append(g.alone).append(" fire=").append(g.fire).append(" action=").append(g.action).append(g.glint > 0 ? " glint=" + g.glint : "").append('}'));
        return b.toString();
    }

    private String title(ItemStack s) {
        if (s == null || s.getType().isAir() || !s.hasItemMeta()) return null;
        return s.getItemMeta().getPersistentDataContainer().get(titleKey, PersistentDataType.STRING);
    }

    /** The gun's cooldown group (and no arm swing) on the stack, if it lacks them. True if the stack is a known gun. */
    private boolean prepare(ItemStack s) {
        String t = title(s);
        Gun g = t == null ? null : guns.get(t);
        if (g == null) return false;
        UseCooldown uc = s.getData(DataComponentTypes.USE_COOLDOWN);
        if (uc == null || uc.cooldownGroup() == null || !g.group.equals(uc.cooldownGroup()))
            s.setData(DataComponentTypes.USE_COOLDOWN, UseCooldown.useCooldown(0.05f).cooldownGroup(g.group).build());
        SwingAnimation sw = s.getData(DataComponentTypes.SWING_ANIMATION);
        if (!swing) {
            if (sw == null || sw.type() != SwingAnimation.Animation.NONE)
                s.setData(DataComponentTypes.SWING_ANIMATION, SwingAnimation.swingAnimation().type(SwingAnimation.Animation.NONE).duration(6).build());
        } else if (sw != null && sw.type() == SwingAnimation.Animation.NONE) {
            s.resetData(DataComponentTypes.SWING_ANIMATION); // gunfx.swing turned on: the feather's own swing back
        }
        return true;
    }

    /** Starts (ticks > 0) or ends (0) the animation clock of the gun the player holds; returns its number (0: none). */
    private long clock(LivingEntity e, String title, int ticks) {
        if (!enabled || !(e instanceof Player p)) return 0;
        Gun g = guns.get(title);
        if (g == null) return 0;
        prepare(p.getInventory().getItemInMainHand()); // the live stack: a gun given before GunFx existed
        p.setCooldown(g.group, Math.max(0, ticks));
        if (ticks > 0) started++;
        long n = ++clockNo;
        clocks.computeIfAbsent(p.getUniqueId(), k -> new HashMap<>()).put(g.group, n);
        return n;
    }

    // custom_model_data flags on the gun: 0 = firing (the automatic guns' flicker), 1 = a firearm action without a shot.
    // WeaponMechanics only writes the floats (the skin number) and drops the flags when it does: the next shot or action
    // sets them again.
    private static final int FIRING = 0;
    private static final int ACTION = 1;
    private static final int DRAW = 2; // the draw of a gun that also has a shot clock (both read the Default state's clock)

    private static boolean flagged(ItemStack s, int index) {
        CustomModelData cmd = s == null ? null : s.getData(DataComponentTypes.CUSTOM_MODEL_DATA);
        return cmd != null && cmd.flags().size() > index && Boolean.TRUE.equals(cmd.flags().get(index));
    }

    private static void flag(ItemStack s, int index, boolean on) {
        if (s == null || s.getType().isAir() || flagged(s, index) == on) return;
        CustomModelData cmd = s.getData(DataComponentTypes.CUSTOM_MODEL_DATA);
        List<Boolean> flags = new ArrayList<>(cmd == null ? List.of() : cmd.flags());
        while (flags.size() <= index) flags.add(false);
        flags.set(index, on);
        while (!flags.isEmpty() && !flags.get(flags.size() - 1)) flags.remove(flags.size() - 1); // no trailing false
        CustomModelData.Builder b = CustomModelData.customModelData().addFlags(flags);
        if (cmd != null) b.addFloats(cmd.floats()).addStrings(cmd.strings()).addColors(cmd.colors());
        s.setData(DataComponentTypes.CUSTOM_MODEL_DATA, b.build());
    }

    private void markFiring(Player p, String title, Gun g) {
        flag(p.getInventory().getItemInMainHand(), FIRING, true);
        firing.put(p.getUniqueId(), new Firing(title, plugin.getServer().getCurrentTick(), g.fire));
        if (firingTask == null) firingTask = plugin.getServer().getScheduler().runTaskTimer(plugin, this::firingTick, 1L, 1L);
    }

    // Clears the flag a few ticks after the last shot, on whichever of the player's guns of that title carries it
    // (they may have switched slots mid-burst).
    private void firingTick() {
        int now = plugin.getServer().getCurrentTick();
        for (Iterator<Map.Entry<UUID, Firing>> it = firing.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<UUID, Firing> en = it.next();
            Firing f = en.getValue();
            if (now - f.lastShot() <= f.keep()) continue;
            Player p = plugin.getServer().getPlayer(en.getKey());
            if (p != null) unflag(p, f.title(), FIRING);
            it.remove();
        }
        if (firing.isEmpty() && firingTask != null) { firingTask.cancel(); firingTask = null; }
    }

    private void unflag(Player p, String titleOrNull, int index) {
        for (int i = 0; i < 9; i++) {
            ItemStack s = p.getInventory().getItem(i);
            String t = title(s);
            if (t != null && (titleOrNull == null || titleOrNull.equals(t)) && guns.containsKey(t)) flag(s, index, false);
        }
    }

    private void unflagAll(Player p) {
        unflag(p, null, FIRING);
        unflag(p, null, ACTION);
        unflag(p, null, DRAW);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onGenerate(WeaponGenerateEvent e) {
        if (!enabled) return;
        prepare(e.getWeaponStack());
        if (e.getShooter() instanceof Player p) applySkin(p, e.getWeaponStack());
    }

    // WeaponMechanics 4.3.1 (ReloadHandler.startReloadWithoutTrigger, bytecode) fires the reload event before it checks
    // the ammo: with no spare rounds (and no creative bypass) the reload never starts and no complete or cancel event
    // follows, so the clock would play the state's frames for nothing (also after a shotgun's last shell, when it tries
    // the next). The same check here.
    private boolean reloadStarts(WeaponReloadEvent e) {
        if (!(e.getShooter() instanceof Player p)) return false;
        try {
            WeaponMechanics wm = WeaponMechanics.getInstance();
            AmmoConfig ac = wm.getWeaponConfigurations().getObject(e.getWeaponTitle() + ".Reload.Ammo", AmmoConfig.class);
            if (ac == null || ac.hasAmmo(e.getWeaponTitle(), e.getWeaponStack(), wm.getPlayerWrapper(p))) return true;
            return p.getGameMode() == GameMode.CREATIVE && wm.getConfiguration().getBoolean("Creative_Mode_Bypass_Ammo");
        } catch (RuntimeException | LinkageError ex) {
            return true; // unknown: animate it, as before
        }
    }

    // A gun that loads a few rounds at a time (Ammo_Per_Reload set: the shotgun, a shell each) gets one event per
    // load, and its clock is that load's reload task alone. WeaponMechanics 4.3.1 (ReloadHandler.startReloadWithoutTrigger,
    // bytecode) fills in the firearm's Open/Close times on the first load after the magazine ran dry, so
    // getReloadCompleteTime() says 18 for the shotgun (7 + 4 + 7), but for a PUMP gun with Ammo_Per_Reload it only
    // chains the 4-tick reload task (the pump is just set open): an 18-tick clock was cut at 4 by the next shell's.
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onReload(WeaponReloadEvent e) {
        if (!guns.containsKey(e.getWeaponTitle()) || !reloadStarts(e)) return;
        int ticks = e.getAmmoPerReload() > 0 ? e.getReloadTime() : Math.max(e.getReloadCompleteTime(), e.getReloadTime());
        clock(e.getShooter(), e.getWeaponTitle(), ticks);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onReloadCancel(WeaponReloadCancelEvent e) {
        clock(e.getShooter(), e.getWeaponTitle(), 0);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onReloadComplete(WeaponReloadCompleteEvent e) {
        clock(e.getShooter(), e.getWeaponTitle(), 0);
    }

    // Aiming during a reload: WeaponMechanics' Scope state wins over Reload, and the aimed frames of the guns with a
    // shot clock are the shot's (muzzle flash included). Their reload's clock ends when the sight comes up.
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onScopeGlint(WeaponScopeEvent e) {
        Gun g = guns.get(e.getWeaponTitle());
        if (g == null || g.glint <= 0 || !enabled || !(e.getShooter() instanceof Player p)) return;
        if (e.getScopeType() == WeaponScopeEvent.ScopeType.OUT) { stopGlint(p.getUniqueId()); return; }
        if (glints.containsKey(p.getUniqueId())) return;
        String title = e.getWeaponTitle();
        glints.put(p.getUniqueId(), plugin.getServer().getScheduler().runTaskTimer(plugin, () -> {
            if (!p.isOnline() || p.isDead() || !title.equals(title(p.getInventory().getItemInMainHand())) || !zooming(p)) { stopGlint(p.getUniqueId()); return; }
            Location eye = p.getEyeLocation();
            Location at = eye.clone().add(eye.getDirection().multiply(0.4));
            for (Player o : p.getWorld().getPlayers()) {
                if (o == p || o.getLocation().distanceSquared(at) > 128 * 128) continue;
                o.spawnParticle(Particle.END_ROD, at, 1, 0, 0, 0, 0, null, true); // forced: seen as far as 128 blocks
            }
        }, 1L, g.glint));
    }

    private void stopGlint(UUID u) {
        BukkitTask t = glints.remove(u);
        if (t != null) t.cancel();
    }

    private static boolean zooming(Player p) {
        try {
            return WeaponMechanics.getInstance().getPlayerWrapper(p).getMainHandData().getZoomData().isZooming();
        } catch (RuntimeException | LinkageError ex) {
            return false;
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onScope(WeaponScopeEvent e) {
        Gun g = guns.get(e.getWeaponTitle());
        // Only the guns whose aimed frames are their shot clock's (shot > 0: the pistol, the shotgun); the automatic guns'
        // aimed frames don't read the clock, and their reload frames go on when the sight comes down.
        if (e.getScopeType() != WeaponScopeEvent.ScopeType.IN || g == null || g.shot <= 0) return;
        try {
            HandData h = e.getHandData(e.isMainHand());
            // Aiming mid-draw ends the draw too: going into the sights rewrites the skin and drops flag 2 for a tick,
            // which shows a shot's frame.
            boolean drawing = e.getShooter() instanceof Player p && flagged(p.getInventory().getItemInMainHand(), DRAW);
            if (h != null && h.isReloading() || drawing) clock(e.getShooter(), e.getWeaponTitle(), 0);
        } catch (RuntimeException | LinkageError ignored) {
        }
    }

    // Whether WeaponMechanics works the gun's firearm action (the pump, the bolt) after this shot. WeaponMechanics 4.3.1
    // (ShootHandler.singleShot, then doShootFirearmActions, bytecode): the shot event comes after the round is used and
    // before the action; an interrupted action (state not READY) always runs; else it runs only with rounds left
    // (an empty gun reloads instead) and when they're a multiple of Firearm_Action_Frequency (the shotgun's 2: a
    // pump after every second shot).
    private boolean firearmActs(String title, ItemStack stack) {
        try {
            FirearmAction fa = WeaponMechanics.getInstance().getWeaponConfigurations().getObject(title + ".Firearm_Action", FirearmAction.class);
            if (fa == null || stack == null || !stack.hasItemMeta()) return false;
            if (fa.getState(stack) != FirearmState.READY) return true;
            Integer left = stack.getItemMeta().getPersistentDataContainer().get(ammoKey, PersistentDataType.INTEGER);
            int f = fa.getFirearmActionFrequency();
            return left != null && left > 0 && f > 0 && left % f == 0 && fa.getFirearmType().hasShootActions();
        } catch (RuntimeException | LinkageError ex) {
            return true; // unknown: the whole shot, as before
        }
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onShot(WeaponPostShootEvent e) {
        Gun g = guns.get(e.getWeaponTitle());
        if (g == null || !enabled || !(e.getShooter() instanceof Player p)) return;
        lastShot.computeIfAbsent(p.getUniqueId(), k -> new HashMap<>()).put(g.group, plugin.getServer().getCurrentTick());
        if (g.action > 0) flag(p.getInventory().getItemInMainHand(), ACTION, false);
        if (g.draw > 0 && g.shot > 0) flag(p.getInventory().getItemInMainHand(), DRAW, false);
        if (g.fire > 0) markFiring(p, e.getWeaponTitle(), g);
        if (g.shot <= 0) return;
        long n = clock(p, e.getWeaponTitle(), g.shot);
        if (n == 0 || g.alone <= 0 || g.alone >= g.shot || firearmActs(e.getWeaponTitle(), e.getWeaponStack())) return;
        // No pump this time: the kick only (the shot's frames are back at rest by then), not a pump nobody works.
        plugin.getServer().getScheduler().runTaskLater(plugin, () -> {
            Map<Key, Long> mine = clocks.get(p.getUniqueId());
            if (p.isOnline() && mine != null && Long.valueOf(n).equals(mine.get(g.group))) p.setCooldown(g.group, 0);
        }, g.alone);
    }

    // A firearm action WeaponMechanics works without a shot (WeaponMechanics 4.3.1, bytecode: a reload from empty sets a
    // PUMP gun loading shells one by one to OPEN and never closes it, so the next click calls doShootFirearmActions instead
    // of shooting: an OPEN event here with no shot this tick; also an interrupted action finishing). A pump right after a
    // shot comes in the same tick as the shot and is the shot clock's own.
    @EventHandler(priority = EventPriority.MONITOR)
    public void onFirearm(WeaponFirearmEvent e) {
        Gun g = guns.get(e.getWeaponTitle());
        if (g == null || g.action <= 0 || !enabled || e.getState() != FirearmState.OPEN || !(e.getShooter() instanceof Player p)) return;
        Map<Key, Integer> shots = lastShot.get(p.getUniqueId());
        Integer last = shots == null ? null : shots.get(g.group);
        int now = plugin.getServer().getCurrentTick();
        if (last != null && last == now) return;
        // WeaponMechanics builds the close half's event with the state it saw when the action started (bytecode:
        // lambda$doShootFirearmActions$1), so an action that started from OPEN reports OPEN again when it closes: one
        // clock per action.
        Map<Key, Integer> acts = lastAction.computeIfAbsent(p.getUniqueId(), k -> new HashMap<>());
        Integer began = acts.get(g.group);
        if (began != null && now - began < g.action) return;
        try {
            HandData h = e.getHandData(e.isMainHand());
            if (h != null && h.isReloading()) return; // a reload building its tasks, not a pump on screen
        } catch (RuntimeException | LinkageError ignored) {
        }
        ItemStack held = p.getInventory().getItemInMainHand();
        if (!e.getWeaponTitle().equals(title(held))) return;
        acts.put(g.group, now);
        flagClock(p, e.getWeaponTitle(), g, g.action, ACTION);
    }

    // A clock whose frames the pack picks by a custom_model_data flag (1 the action, 2 the draw). WeaponMechanics rewrites
    // the skin number while a clock runs (and drops the flags with it), so the flag is put back every tick of the clock,
    // then taken off; a later clock on this gun (a shot, a reload) ends this one and takes the flag off.
    private void flagClock(Player p, String title, Gun g, int ticks, int index) {
        ItemStack held = p.getInventory().getItemInMainHand();
        if (title.equals(title(held))) flag(held, index, true);
        long n = clock(p, title, ticks);
        if (n == 0) return;
        int[] left = { ticks };
        plugin.getServer().getScheduler().runTaskTimer(plugin, task -> {
            Map<Key, Long> mine = clocks.get(p.getUniqueId());
            boolean current = p.isOnline() && mine != null && Long.valueOf(n).equals(mine.get(g.group));
            if (current && --left[0] > 0) {
                ItemStack h = p.getInventory().getItemInMainHand();
                if (title.equals(title(h))) flag(h, index, true);
                return;
            }
            task.cancel();
            if (p.isOnline()) unflag(p, title, index);
        }, 1L, 1L);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onEquip(WeaponEquipEvent e) {
        Gun g = guns.get(e.getWeaponTitle());
        if (g == null || g.draw <= 0) return;
        // A gun with a shot clock too: the draw is told apart by flag 2 (both read the Default state's clock).
        // The event's own stack first: the main hand still holds the old item in this tick, and one tick of the clock
        // without flag 2 is a shot's first frame (a flash and a full kick) on every draw.
        if (g.shot > 0 && e.getShooter() instanceof Player p) { flag(e.getWeaponStack(), DRAW, true); flagClock(p, e.getWeaponTitle(), g, g.draw, DRAW); }
        else clock(e.getShooter(), e.getWeaponTitle(), g.draw);
    }

    // A click on a block within reach while the held gun's cooldown runs: Paper 26.1.2 (ServerPlayerGameMode.useItemOn)
    // marks the item use DENY for an item on cooldown, and WeaponMechanics ignores a click whose item use is DENY, so
    // the gun wouldn't fire at anything close during an animation (a shot into the air was never affected). The clock
    // is only an animation here: the use goes back to DEFAULT (nothing else changes: the block's own use is untouched,
    // a feather has no use of its own, and the follow-up use packet reuses this result).
    @EventHandler(priority = EventPriority.LOWEST)
    public void onInteract(PlayerInteractEvent e) {
        if (!enabled || e.getAction() != Action.RIGHT_CLICK_BLOCK) return;
        if (e.useItemInHand() != Event.Result.DENY || e.useInteractedBlock() == Event.Result.DENY) return;
        String t = title(e.getItem());
        Gun g = t == null ? null : guns.get(t);
        if (g == null || e.getPlayer().getCooldown(g.group) <= 0) return;
        e.setUseItemInHand(Event.Result.DEFAULT);
    }

    // Guns given before GunFx (or by something that skips WeaponGenerateEvent) get their group when held.
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onHeld(PlayerItemHeldEvent e) {
        if (!enabled) return;
        Player p = e.getPlayer();
        plugin.getServer().getScheduler().runTask(plugin, () -> {
            if (!p.isOnline()) return;
            ItemStack h = p.getInventory().getItemInMainHand();
            prepare(h);
            applySkin(p, h);
        });
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        UUID u = e.getPlayer().getUniqueId();
        clocks.remove(u);
        skinCache.remove(u);
        stopGlint(u);
        lastShot.remove(u);
        lastAction.remove(u);
        firing.remove(u);
        unflagAll(e.getPlayer()); // not saved with a flag
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        if (!enabled) return;
        Player p = e.getPlayer();
        plugin.getServer().getScheduler().runTaskLater(plugin, () -> {
            if (!p.isOnline()) return;
            for (int i = 0; i < 9; i++) prepare(p.getInventory().getItem(i));
            applySkins(p);
            unflagAll(p); // a flag saved by a stop mid-burst or mid-pump
        }, 5L);
    }

    /** Plugin disable: no gun keeps a flag. */
    void shutdown() {
        for (Player p : plugin.getServer().getOnlinePlayers()) unflagAll(p);
        firing.clear();
        for (BukkitTask t : glints.values()) t.cancel();
        glints.clear();
        if (firingTask != null) { firingTask.cancel(); firingTask = null; }
    }

    // ---------- Gun skins ----------

    private Map<String, String> choices(Player p) {
        return skinCache.computeIfAbsent(p.getUniqueId(), u -> {
            Map<String, String> m = new TreeMap<>();
            String raw = p.getPersistentDataContainer().get(skinsKey, PersistentDataType.STRING);
            if (raw != null) for (String part : raw.split(";")) {
                int eq = part.indexOf('=');
                if (eq > 0) m.put(part.substring(0, eq), part.substring(eq + 1));
            }
            return m;
        });
    }

    private void saveChoices(Player p, Map<String, String> m) {
        PersistentDataContainer pdc = p.getPersistentDataContainer();
        if (m.isEmpty()) { pdc.remove(skinsKey); return; }
        StringBuilder b = new StringBuilder();
        for (Map.Entry<String, String> en : m.entrySet()) b.append(b.length() == 0 ? "" : ";").append(en.getKey()).append('=').append(en.getValue());
        pdc.set(skinsKey, PersistentDataType.STRING, b.toString());
    }

    /** The player's chosen look on a gun stack, in place: no choice = left alone; default = the feather's own model. */
    private void applySkin(Player p, ItemStack s) {
        String t = title(s);
        if (t == null || !guns.containsKey(t)) return;
        String want = skins ? choices(p).get(t) : "default";
        if (want == null) return;
        if (want.equals("default")) {
            if (s.isDataOverridden(DataComponentTypes.ITEM_MODEL)) s.resetData(DataComponentTypes.ITEM_MODEL);
            return;
        }
        Key k = Key.key(want);
        if (!k.equals(s.getData(DataComponentTypes.ITEM_MODEL))) s.setData(DataComponentTypes.ITEM_MODEL, k);
    }

    private void applySkins(Player p) {
        for (int i = 0; i < 36; i++) applySkin(p, p.getInventory().getItem(i));
        applySkin(p, p.getInventory().getItemInOffHand());
    }

    private static boolean skinKey(String v) {
        if (v.equals("default")) return true;
        if (!v.matches("donating:gunskin_[a-z0-9_]+")) return false;
        return true;
    }

    /**
     * /dphone gunskin <player|uuid> [clear | <title>=<donating:gunskin_*|default> ...]: set a player's looks (Skript's
     * cosmetics.sk calls it); with nothing after the player, print their choices and the looks on their guns.
     */
    boolean gunskinCommand(CommandSender sender, String[] args) {
        if (args.length < 2) { sender.sendMessage("GUNSKIN usage: /dphone gunskin <player|uuid> [clear | <title>=<donating:gunskin_*|default> ...]"); return true; }
        Player p = Bukkit.getPlayerExact(args[1]);
        if (p == null) try { p = Bukkit.getPlayer(UUID.fromString(args[1])); } catch (IllegalArgumentException ignored) { }
        if (p == null) { sender.sendMessage("GUNSKIN " + args[1] + ": not online"); return true; }
        Map<String, String> m = choices(p);
        if (args.length == 2) {
            StringBuilder slots = new StringBuilder();
            for (int i = 0; i < 36; i++) {
                ItemStack s = p.getInventory().getItem(i);
                String t = title(s);
                if (t == null || !guns.containsKey(t)) continue;
                Key k = s.isDataOverridden(DataComponentTypes.ITEM_MODEL) ? s.getData(DataComponentTypes.ITEM_MODEL) : null;
                slots.append(slots.length() == 0 ? "" : ",").append(i).append(':').append(t).append('=').append(k == null ? "default" : k.asString());
            }
            sender.sendMessage("GUNSKIN " + p.getName() + " choices=" + m + " slots={" + slots + "} skins=" + (skins ? "on" : "off"));
            return true;
        }
        Map<String, String> next = new LinkedHashMap<>();
        if (args[2].equalsIgnoreCase("clear")) {
            for (String t : m.keySet()) next.put(t, "default");
        } else {
            for (int i = 2; i < args.length; i++) {
                int eq = args[i].indexOf('=');
                String t = eq > 0 ? args[i].substring(0, eq) : "";
                String v = eq > 0 ? args[i].substring(eq + 1).toLowerCase(Locale.ROOT) : "";
                if (!guns.containsKey(t)) { sender.sendMessage("GUNSKIN refused: " + args[i] + " (not a gun in gunfx.guns)"); return true; }
                if (!skinKey(v)) { sender.sendMessage("GUNSKIN refused: " + args[i] + " (a donating:gunskin_* model or default)"); return true; }
                next.put(t, v);
            }
        }
        m.putAll(next);
        if (args[2].equalsIgnoreCase("clear")) { applySkins(p); m.clear(); }
        saveChoices(p, m);
        applySkins(p);
        sender.sendMessage("GUNSKIN " + p.getName() + " set " + next);
        return true;
    }

    /** Tab completion for /dphone gunskin. */
    List<String> gunskinComplete(String[] args, List<String> players) {
        List<String> out = new ArrayList<>();
        if (args.length == 2) out.addAll(players);
        else if (args.length >= 3) {
            if (args.length == 3) out.add("clear");
            for (String t : guns.keySet()) { out.add(t + "=default"); out.add(t + "=donating:gunskin_"); }
        }
        return out;
    }
}
