package dev.donating.phone;

import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.SwingAnimation;
import io.papermc.paper.datacomponent.item.UseCooldown;
import me.deecaad.weaponmechanics.WeaponMechanics;
import me.deecaad.weaponmechanics.weapon.firearm.FirearmAction;
import me.deecaad.weaponmechanics.weapon.firearm.FirearmState;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponEquipEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponGenerateEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponPostShootEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadCancelEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadCompleteEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadEvent;
import net.kyori.adventure.key.Key;
import org.bukkit.NamespacedKey;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerItemHeldEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataType;

import java.util.HashMap;
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
 * Sprint, Reload, No_Ammo: the skin number), the cooldown only says how far into the action it is. The hotbar shows the
 * cooldown's white sweep meanwhile (the owner: "keep the sweep for now").
 *
 * The group: each gun carries a use_cooldown component naming donating:gun/<title> (set here when WeaponMechanics makes
 * the gun, and on any gun held without it), so its cooldown is its own (a feather's cooldown would be every gun's).
 * A feather is never "used", so the component's seconds never start a cooldown by themselves. Also the arm swing off
 * (swing_animation none): a left-click (the aim) or a click on a block doesn't swing the gun; the frames move it.
 * Config gunfx.*: enabled, swing, guns.<title>.shot|draw (ticks; 0 = none), guns.<title>.alone (ticks: a shot that
 * works no firearm action plays only this much of the shot's frames, its kick; 0 = always the whole shot).
 */
final class GunFx implements Listener {
    private record Gun(Key group, int shot, int draw, int alone) {}

    private final PhonePlugin plugin;
    private final NamespacedKey titleKey = new NamespacedKey("weaponmechanics", "weapon-title");
    private final NamespacedKey ammoKey = new NamespacedKey("weaponmechanics", "ammo-left");
    // Each player's last clock (a number that only grows), so a shot's early end can't end a clock started after it
    // (an empty gun's reload starts in the same tick as its last shot).
    private final Map<UUID, Long> clocks = new HashMap<>();
    private long clockNo;
    private final Map<String, Gun> guns = new HashMap<>();
    private boolean enabled = true;
    private boolean swing = false;
    long started; // cooldowns started (status)

    GunFx(PhonePlugin plugin) { this.plugin = plugin; }

    void configure(FileConfiguration c) {
        enabled = c.getBoolean("gunfx.enabled", true);
        swing = c.getBoolean("gunfx.swing", false);
        guns.clear();
        ConfigurationSection s = c.getConfigurationSection("gunfx.guns");
        if (s != null) for (String title : s.getKeys(false)) {
            String id = title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_.-]", "_");
            guns.put(title, new Gun(Key.key("donating", "gun/" + id), Math.max(0, s.getInt(title + ".shot", 0)), Math.max(0, s.getInt(title + ".draw", 0)), Math.max(0, s.getInt(title + ".alone", 0))));
        }
        plugin.getLogger().info("gunfx: " + (enabled ? guns.size() + " guns" : "off"));
    }

    String status() {
        StringBuilder b = new StringBuilder("GUNFX enabled=" + enabled + " swing=" + swing + " started=" + started + " guns=");
        guns.forEach((t, g) -> b.append(t).append('{').append(g.group.asString()).append(" shot=").append(g.shot).append(" draw=").append(g.draw).append(" alone=").append(g.alone).append('}'));
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
        if (!swing) {
            SwingAnimation sw = s.getData(DataComponentTypes.SWING_ANIMATION);
            if (sw == null || sw.type() != SwingAnimation.Animation.NONE)
                s.setData(DataComponentTypes.SWING_ANIMATION, SwingAnimation.swingAnimation().type(SwingAnimation.Animation.NONE).duration(6).build());
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
        clocks.put(p.getUniqueId(), n);
        return n;
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
    public void onGenerate(WeaponGenerateEvent e) {
        if (enabled) prepare(e.getWeaponStack());
    }

    // A gun that loads a few rounds at a time (Ammo_Per_Reload set: the shotgun, a shell each) gets one event per
    // load, and its clock is that load's reload task alone. WeaponMechanics 4.3.1 (ReloadHandler.startReloadWithoutTrigger,
    // bytecode) fills in the firearm's Open/Close times on the first load after the magazine ran dry, so
    // getReloadCompleteTime() says 18 for the shotgun (7 + 4 + 7), but for a PUMP gun with Ammo_Per_Reload it only
    // chains the 4-tick reload task (the pump is just set open): an 18-tick clock was cut at 4 by the next shell's.
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onReload(WeaponReloadEvent e) {
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

    @EventHandler(priority = EventPriority.MONITOR)
    public void onShot(WeaponPostShootEvent e) {
        Gun g = guns.get(e.getWeaponTitle());
        if (g == null || g.shot <= 0) return;
        long n = clock(e.getShooter(), e.getWeaponTitle(), g.shot);
        if (n == 0 || g.alone <= 0 || g.alone >= g.shot || firearmActs(e.getWeaponTitle(), e.getWeaponStack())) return;
        // No pump this time: the kick only (the shot's frames are back at rest by then), not a pump nobody works.
        Player p = (Player) e.getShooter();
        plugin.getServer().getScheduler().runTaskLater(plugin, () -> {
            if (p.isOnline() && Long.valueOf(n).equals(clocks.get(p.getUniqueId()))) p.setCooldown(g.group, 0);
        }, g.alone);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onEquip(WeaponEquipEvent e) {
        Gun g = guns.get(e.getWeaponTitle());
        if (g != null && g.draw > 0) clock(e.getShooter(), e.getWeaponTitle(), g.draw);
    }

    // Guns given before GunFx (or by something that skips WeaponGenerateEvent) get their group when held.
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onHeld(PlayerItemHeldEvent e) {
        if (!enabled) return;
        Player p = e.getPlayer();
        plugin.getServer().getScheduler().runTask(plugin, () -> { if (p.isOnline()) prepare(p.getInventory().getItemInMainHand()); });
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        clocks.remove(e.getPlayer().getUniqueId());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        if (!enabled) return;
        Player p = e.getPlayer();
        plugin.getServer().getScheduler().runTaskLater(plugin, () -> {
            if (!p.isOnline()) return;
            for (int i = 0; i < 9; i++) prepare(p.getInventory().getItem(i));
        }, 5L);
    }
}
