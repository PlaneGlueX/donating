package dev.donating.phone;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import org.bukkit.Bukkit;
import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.ArmorStand;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * /dphone mark: a locator-bar dot on an entity (a hit target) for one player only. Skript owns the rules
 * (hits.sk); this only keeps an invisible marker stand 2 blocks above the entity, made invisible to everyone before
 * it exists and shown to that player (the GPS dot's recipe). A new mark replaces the old; the entity missing for up to
 * 40 ticks keeps the stand where it was (Citizens swaps an NPC's entity when its skin loads; Skript sends the new one).
 */
final class Marks {
    static final String TAG = "donating_mark";
    private final JavaPlugin plugin;
    private final Map<UUID, Mark> marks = new HashMap<>();

    private static final class Mark {
        UUID target;
        Color color;
        double range;
        ArmorStand stand;
        int missing;
    }

    Marks(JavaPlugin plugin) { this.plugin = plugin; }

    void start() { Bukkit.getScheduler().runTaskTimer(plugin, this::tick, 5L, 5L); }

    /** /dphone mark <player> <entity-uuid> <color|#RRGGBB> <range>, or /dphone mark <player> off. */
    boolean command(CommandSender sender, String[] a) {
        if (a.length < 3) { sender.sendMessage("/dphone mark <player> <entity-uuid> <color|#RRGGBB> <range> | <player> off"); return true; }
        Player p = Bukkit.getPlayerExact(a[1]);
        if (p == null) { sender.sendMessage("MARK no player " + a[1]); return true; }
        if (a[2].equalsIgnoreCase("off")) { remove(p.getUniqueId()); sender.sendMessage("MARK " + p.getName() + " off"); return true; }
        UUID target;
        try { target = UUID.fromString(a[2]); } catch (IllegalArgumentException ex) { sender.sendMessage("MARK bad uuid " + a[2]); return true; }
        Mark m = marks.get(p.getUniqueId());
        if (m == null) { m = new Mark(); marks.put(p.getUniqueId(), m); }
        m.target = target;
        m.color = color(a.length > 3 ? a[3] : "red");
        m.range = 48;
        if (a.length > 4) { try { m.range = Double.parseDouble(a[4]); } catch (NumberFormatException ignored) {} }
        m.missing = 0;
        if (m.stand != null) m.stand.setWaypointColor(m.color);
        sender.sendMessage("MARK " + p.getName() + " " + target + " range=" + m.range);
        return true;
    }

    /** "MARK <player> target=<uuid|none> stand=<uuid|none>" for tests. */
    String status(Player p) {
        Mark m = marks.get(p.getUniqueId());
        if (m == null) return "MARK " + p.getName() + " target=none stand=none";
        return "MARK " + p.getName() + " target=" + m.target + " stand=" + (m.stand != null && m.stand.isValid() ? m.stand.getUniqueId() : "none");
    }

    private static Color color(String s) {
        switch (s.toLowerCase()) {
            case "red": return Color.fromRGB(0xFF3B30);
            case "yellow": return Color.fromRGB(0xFFD60A);
            case "green": return Color.fromRGB(0x34C759);
            case "blue": return Color.fromRGB(0x0A84FF);
            case "white": return Color.WHITE;
            case "purple": return Color.fromRGB(0xBF5AF2);
            case "orange": return Color.fromRGB(0xFF9F0A);
            default:
                try { return Color.fromRGB(Integer.parseInt(s.replace("#", ""), 16)); } catch (NumberFormatException e) { return Color.RED; }
        }
    }

    private void tick() {
        Iterator<Map.Entry<UUID, Mark>> it = marks.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<UUID, Mark> en = it.next();
            Player p = Bukkit.getPlayer(en.getKey());
            Mark m = en.getValue();
            if (p == null || !p.isOnline()) { removeStand(m); it.remove(); continue; }
            Entity e = Bukkit.getEntity(m.target);
            if (e == null || !e.isValid()) {
                if (++m.missing > 8) removeStand(m);
                continue;
            }
            m.missing = 0;
            if (!e.getWorld().equals(p.getWorld()) || e.getLocation().distanceSquared(p.getLocation()) > m.range * m.range) { removeStand(m); continue; }
            Location at = e.getLocation().add(0, 2, 0);
            if (m.stand != null && (!m.stand.isValid() || !m.stand.getWorld().equals(at.getWorld()))) removeStand(m);
            if (m.stand == null) {
                ArmorStand a = at.getWorld().spawn(at, ArmorStand.class, s -> {
                    s.setVisibleByDefault(false);
                    s.setPersistent(false);
                    s.setInvisible(true);
                    s.setMarker(true);
                    s.setGravity(false);
                    s.setInvulnerable(true);
                    s.setSilent(true);
                    s.addScoreboardTag(TAG);
                });
                if (!a.isValid()) continue;
                m.stand = a;
                p.showEntity(plugin, a);
                a.setWaypointColor(m.color);
                AttributeInstance range = a.getAttribute(Attribute.WAYPOINT_TRANSMIT_RANGE);
                if (range != null) range.setBaseValue(6.0E7);
            } else if (m.stand.getLocation().distanceSquared(at) > 1) {
                m.stand.teleport(at);
            }
        }
    }

    private static void removeStand(Mark m) {
        if (m.stand != null) m.stand.remove();
        m.stand = null;
    }

    void remove(UUID player) {
        Mark m = marks.remove(player);
        if (m != null) removeStand(m);
    }

    void shutdown() {
        for (Mark m : marks.values()) removeStand(m);
        marks.clear();
    }
}
