package dev.donating.phone;

import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.SwingAnimation;
import io.papermc.paper.datacomponent.item.UseCooldown;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponGenerateEvent;
import net.kyori.adventure.key.Key;
import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.NamespacedKey;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.Configuration;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerAnimationEvent;
import org.bukkit.event.player.PlayerAnimationType;
import org.bukkit.event.player.PlayerItemHeldEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataType;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The melee weapons' swings (2026-10-13; the owner: "make sure to have swing animations if applicable"). Each listed
 * melee (meleefx.melee.<WeaponMechanics title>) gets the client's own attack animation on its item, the swing_animation
 * component: stab (the spear's forward jab), whack (the normal swing) or none, over ticks.
 *
 * chain N > 0: the item also gets a use_cooldown group of its own (donating:melee/<title>), and every arm swing with it
 * in hand starts an N-tick cooldown on that group, but only once more than half of the last one has passed (spam clicks
 * don't restart it every tick). Swings in back-to-back ticks (holding left-click on a block: the 26.3 client sends a punch
 * every tick while it mines) let each clock finish first, so the frames loop whole instead of replaying their first half.
 * The pack's first-person frames read it (minecraft:cooldown, like the guns'), so keep chain equal to the frame count;
 * the hotbar shows its sweep. An amethyst shard has no use, so the cooldown never blocks anything.
 *
 * Only the holder's 26.3 client sees a stab, a none or a non-default duration: ViaVersion sends other players the
 * default whack. A melee drawn with our gloves must be none: the client's swing turns the whole item model, sleeve
 * included, and its punch is the frames. swing_animation none doesn't stop the attack (the client still sends the swing
 * packet, so ARM_SWING still fires here).
 *
 * With no meleefx.melee in the server's config.yml, the jar's list applies. enabled: false puts every listed melee back
 * to vanilla as it's touched. The components are saved on the items: before taking the jar out, set enabled: false and
 * /dphone reload, and keep the jar until every owner of a listed melee has joined once (a join puts their hotbar back;
 * else a none swing stays on the items with no frames to show the punch, until a death or a fresh copy from the shop). A title that's also a gunfx gun is ignored with a warning (GunFx owns its swing and group);
 * any other WeaponMechanics item that carries a swing or one of our groups without being listed loses them.
 */
final class MeleeFx implements Listener {
    record Melee(SwingAnimation.Animation type, int ticks, Key group, int chain) {}
    private static final String GROUP_PREFIX = "donating:melee/";

    private final PhonePlugin plugin;
    private final NamespacedKey titleKey = new NamespacedKey("weaponmechanics", "weapon-title");
    private final Map<String, Melee> melee = new LinkedHashMap<>();
    private final Set<String> guns = new HashSet<>(); // gunfx.guns' titles (the server's and the jar's): never touched here
    private final Map<UUID, Integer> lastSwing = new HashMap<>(); // the tick of each player's last swing with a listed melee
    private boolean enabled = true;
    private String source = "config";
    long chains; // clocks started (status)

    MeleeFx(PhonePlugin plugin) { this.plugin = plugin; }

    void configure(FileConfiguration c) {
        enabled = c.getBoolean("meleefx.enabled", true);
        melee.clear();
        guns.clear();
        Configuration d = c.getDefaults();
        for (Configuration src : new Configuration[] { c, d }) {
            if (src == null || !src.isSet("gunfx.guns")) continue;
            ConfigurationSection g = src.getConfigurationSection("gunfx.guns");
            if (g != null) guns.addAll(g.getKeys(false));
        }
        // Bukkit: a path missing from the file gives an empty section (not the defaults'), so the jar's list is read
        // explicitly when the server's config.yml has none.
        ConfigurationSection s = c.isSet("meleefx.melee") ? c.getConfigurationSection("meleefx.melee") : null;
        source = "config";
        if (s == null) { s = d == null ? null : d.getConfigurationSection("meleefx.melee"); source = "jar"; }
        if (s != null) for (String title : s.getKeys(false)) {
            if (guns.contains(title)) { plugin.getLogger().warning("meleefx: " + title + " is a gunfx gun, ignored"); continue; }
            SwingAnimation.Animation type;
            try { type = SwingAnimation.Animation.valueOf(s.getString(title + ".swing", "whack").toUpperCase(Locale.ROOT)); }
            catch (IllegalArgumentException ex) { plugin.getLogger().warning("meleefx: " + title + ": swing is none, whack or stab"); continue; }
            int ticks = Math.max(1, Math.min(100, s.getInt(title + ".ticks", 6)));
            int chain = Math.max(0, s.getInt(title + ".chain", 0));
            String id = title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_.-]", "_");
            melee.put(title, new Melee(type, ticks, Key.key("donating", "melee/" + id), chain));
        }
        plugin.getLogger().info("meleefx: " + (enabled ? melee.size() + " melee weapons (" + source + ")" : "off"));
        for (Player p : plugin.getServer().getOnlinePlayers()) for (int i = 0; i < 9; i++) prepare(p.getInventory().getItem(i));
    }

    /** One status word for /dphone gunfx. */
    String summary() {
        return "meleefx=" + (enabled ? "on" : "off") + " melee=" + melee.size() + " chains=" + chains;
    }

    String title(ItemStack s) {
        if (s == null || s.getType().isAir() || !s.hasItemMeta()) return null;
        return s.getItemMeta().getPersistentDataContainer().get(titleKey, PersistentDataType.STRING);
    }

    private static boolean meleeGroup(ItemStack s) {
        UseCooldown uc = s.getData(DataComponentTypes.USE_COOLDOWN);
        return uc != null && uc.cooldownGroup() != null && uc.cooldownGroup().asString().startsWith(GROUP_PREFIX);
    }

    /** A listed melee gets its swing (and chain group); off or unlisted: ours taken off. Guns are GunFx's. */
    void prepare(ItemStack s) {
        String t = title(s);
        if (t == null || guns.contains(t)) return;
        Melee m = melee.get(t);
        if (m == null || !enabled) {
            if (meleeGroup(s)) s.resetData(DataComponentTypes.USE_COOLDOWN);
            if (s.isDataOverridden(DataComponentTypes.SWING_ANIMATION)) s.resetData(DataComponentTypes.SWING_ANIMATION);
            return;
        }
        SwingAnimation sw = s.getData(DataComponentTypes.SWING_ANIMATION);
        if (!s.isDataOverridden(DataComponentTypes.SWING_ANIMATION) || sw == null || sw.type() != m.type() || sw.duration() != m.ticks())
            s.setData(DataComponentTypes.SWING_ANIMATION, SwingAnimation.swingAnimation().type(m.type()).duration(m.ticks()).build());
        if (m.chain() > 0) {
            UseCooldown uc = s.getData(DataComponentTypes.USE_COOLDOWN);
            if (uc == null || uc.cooldownGroup() == null || !m.group().equals(uc.cooldownGroup()))
                s.setData(DataComponentTypes.USE_COOLDOWN, UseCooldown.useCooldown(0.05f).cooldownGroup(m.group()).build());
        } else if (meleeGroup(s)) s.resetData(DataComponentTypes.USE_COOLDOWN);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onGenerate(WeaponGenerateEvent e) { prepare(e.getWeaponStack()); }

    // Melees given by something that skips WeaponGenerateEvent (or before this existed) get theirs when held.
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onHeld(PlayerItemHeldEvent e) {
        Player p = e.getPlayer();
        plugin.getServer().getScheduler().runTask(plugin, () -> { if (p.isOnline()) prepare(p.getInventory().getItemInMainHand()); });
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        Player p = e.getPlayer();
        plugin.getServer().getScheduler().runTaskLater(plugin, () -> {
            if (p.isOnline()) for (int i = 0; i < 9; i++) prepare(p.getInventory().getItem(i));
        }, 5L);
    }

    // Every arm swing (an attack, a miss, a click on a block) with a chain melee in hand: its clock, once more than half
    // of the last has passed (getCooldown = ticks left). Swings in back-to-back ticks are mining: the clock finishes first.
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onSwing(PlayerAnimationEvent e) {
        if (!enabled || e.getAnimationType() != PlayerAnimationType.ARM_SWING) return;
        Player p = e.getPlayer();
        if (p.getGameMode() == GameMode.SPECTATOR) return;
        ItemStack held = p.getInventory().getItemInMainHand();
        String t = title(held);
        Melee m = t == null ? null : melee.get(t);
        if (m == null) return;
        prepare(held); // a WeaponMechanics rewrite may have dropped it (compares first: nothing resent when unchanged)
        int now = Bukkit.getCurrentTick();
        Integer last = lastSwing.put(p.getUniqueId(), now);
        int left = p.getCooldown(m.group());
        boolean everyTick = last != null && now - last <= 1;
        if (m.chain() <= 0 || (everyTick ? left > 0 : left * 2 >= m.chain())) return;
        p.setCooldown(m.group(), m.chain());
        chains++;
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) { lastSwing.remove(e.getPlayer().getUniqueId()); }

    /** /dphone melee [player]: the list, or what a player holds. */
    boolean command(CommandSender sender, String[] args) {
        if (args.length < 2) {
            StringBuilder b = new StringBuilder("MELEE enabled=" + enabled + " source=" + source + " chains=" + chains + " melee=");
            boolean first = true;
            for (Map.Entry<String, Melee> en : melee.entrySet()) {
                Melee m = en.getValue();
                b.append(first ? "" : ",").append(en.getKey()).append('{').append(m.type().name().toLowerCase(Locale.ROOT)).append(' ').append(m.ticks());
                if (m.chain() > 0) b.append(" chain ").append(m.chain()).append(' ').append(m.group().asString());
                b.append('}');
                first = false;
            }
            sender.sendMessage(b.toString());
            return true;
        }
        Player p = Bukkit.getPlayerExact(args[1]);
        if (p == null) { sender.sendMessage("MELEE " + args[1] + ": not online"); return true; }
        ItemStack held = p.getInventory().getItemInMainHand();
        String t = title(held);
        String swing = "-";
        String group = "none";
        int left = 0;
        if (held != null && !held.getType().isAir()) {
            SwingAnimation sw = held.isDataOverridden(DataComponentTypes.SWING_ANIMATION) ? held.getData(DataComponentTypes.SWING_ANIMATION) : null;
            if (sw != null) swing = sw.type().name().toLowerCase(Locale.ROOT) + "/" + sw.duration();
            UseCooldown uc = held.getData(DataComponentTypes.USE_COOLDOWN);
            if (uc != null && uc.cooldownGroup() != null) { group = uc.cooldownGroup().asString(); left = p.getCooldown(uc.cooldownGroup()); }
        }
        sender.sendMessage("MELEE " + p.getName() + " held=" + (t == null ? "none" : t) + " swing=" + swing + " group=" + group + " cooldown=" + left);
        return true;
    }
}
