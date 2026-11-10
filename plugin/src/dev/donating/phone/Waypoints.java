package dev.donating.phone;

import com.github.retrooper.packetevents.PacketEvents;
import com.github.retrooper.packetevents.protocol.color.Color;
import com.github.retrooper.packetevents.protocol.world.waypoint.TrackedWaypoint;
import com.github.retrooper.packetevents.protocol.world.waypoint.Vec3iWaypointInfo;
import com.github.retrooper.packetevents.protocol.world.waypoint.WaypointIcon;
import com.github.retrooper.packetevents.resources.ResourceLocation;
import com.github.retrooper.packetevents.util.Either;
import com.github.retrooper.packetevents.util.Vector3i;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerWaypoint;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.World;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.ArmorStand;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerRespawnEvent;
import org.bukkit.event.world.EntitiesLoadEvent;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * nav.sk's points of interest on the locator bar, sent straight to each client with no entity. A waypoint entity is only
 * tracked while its chunk is loaded, and a forced chunk keeps every chunk within 13 of it in memory once visited: the old
 * stands pinned 5,900 chunks, about 250 MB of Minehut's 1 GB, and caused a full GC every few seconds (bots, 2026-11-05).
 * The client works out the direction and distance itself, so a place needs no updates while players move.
 */
final class Waypoints implements Listener {
    private record Way(UUID id, String world, int x, int y, int z, int rgb, String style) {}

    private final PhonePlugin plugin;
    private final Map<String, Way> ways = new LinkedHashMap<>();
    /** What each client was last given: their world, or "" while they receive nothing (robbers in a heist, nav.sk's attribute). */
    private final Map<UUID, String> synced = new HashMap<>();

    Waypoints(PhonePlugin plugin) { this.plugin = plugin; }

    void start() {
        plugin.getServer().getScheduler().runTaskTimer(plugin, this::tick, 20L, 20L);
        // The old stands already loaded with the world (the rest go in onEntitiesLoad).
        for (World w : plugin.getServer().getWorlds()) for (ArmorStand a : w.getEntitiesByClass(ArmorStand.class)) removeOldStand(a);
    }

    private void tick() {
        for (Player p : plugin.getServer().getOnlinePlayers()) {
            AttributeInstance range = p.getAttribute(Attribute.WAYPOINT_RECEIVE_RANGE);
            String want = range != null && range.getValue() > 0 ? p.getWorld().getName() : "";
            String had = synced.put(p.getUniqueId(), want);
            if (want.equals(had)) continue;
            if (had != null) for (Way w : ways.values()) send(p, WrapperPlayServerWaypoint.Operation.UNTRACK, w);
            for (Way w : ways.values()) if (w.world().equals(want)) send(p, WrapperPlayServerWaypoint.Operation.TRACK, w);
        }
    }

    private void set(String name, String world, int x, int y, int z, int rgb, String style) {
        UUID id = UUID.nameUUIDFromBytes(("poi:" + name).getBytes(StandardCharsets.UTF_8));
        Way w = new Way(id, world, x, y, z, rgb, style);
        Way old = ways.put(name, w);
        if (w.equals(old)) return;
        for (Player p : plugin.getServer().getOnlinePlayers()) {
            String at = synced.get(p.getUniqueId());
            if (at == null) continue; // tick() gives a new player everything
            // Track replaces an entry on the client with the same id.
            if (w.world().equals(at)) send(p, WrapperPlayServerWaypoint.Operation.TRACK, w);
            else if (old != null) send(p, WrapperPlayServerWaypoint.Operation.UNTRACK, old);
        }
    }

    private void remove(String name) {
        Way w = ways.remove(name);
        if (w == null) return;
        for (Player p : plugin.getServer().getOnlinePlayers()) {
            if (synced.containsKey(p.getUniqueId())) send(p, WrapperPlayServerWaypoint.Operation.UNTRACK, w);
        }
    }

    private void send(Player p, WrapperPlayServerWaypoint.Operation op, Way w) {
        ResourceLocation style = w.style().equalsIgnoreCase("default") ? WaypointIcon.ICON_STYLE_DEFAULT : new ResourceLocation(w.style());
        TrackedWaypoint t = new TrackedWaypoint(Either.createLeft(w.id()), new WaypointIcon(style, new Color(w.rgb())),
            new Vec3iWaypointInfo(new Vector3i(w.x(), w.y(), w.z())));
        PacketEvents.getAPI().getPlayerManager().sendPacket(p, new WrapperPlayServerWaypoint(op, t));
    }

    /** /dphone way set <id> <world> <x> <y> <z> <color> <style> | remove <id> | list. Silent on success: nav.sk calls it. */
    boolean command(CommandSender sender, String[] args) {
        String sub = args[1].toLowerCase();
        if (sub.equals("set") && args.length == 9) {
            NamedTextColor color = NamedTextColor.NAMES.value(args[7].toLowerCase());
            try {
                int x = (int) Math.floor(Double.parseDouble(args[4]));
                int y = (int) Math.floor(Double.parseDouble(args[5]));
                int z = (int) Math.floor(Double.parseDouble(args[6]));
                if (color != null) { set(args[2], args[3], x, y, z, color.value(), args[8]); return true; }
            } catch (NumberFormatException ignored) { }
            sender.sendMessage("WAY bad color or position: " + String.join(" ", args));
            return true;
        }
        if (sub.equals("remove") && args.length == 3) { remove(args[2]); return true; }
        if (sub.equals("list")) {
            List<String> out = new ArrayList<>();
            ways.forEach((name, w) -> out.add(name + "=" + w.id() + "@" + w.x() + "," + w.y() + "," + w.z() + "#" + Integer.toHexString(w.rgb()) + "/" + w.style()));
            sender.sendMessage("WAYS " + ways.size() + ": " + String.join(" | ", out));
            return true;
        }
        sender.sendMessage("/dphone way set <id> <world> <x> <y> <z> <color> <style> | remove <id> | list");
        return true;
    }

    private static void removeOldStand(Entity e) {
        if (e instanceof ArmorStand && e.getScoreboardTags().contains("donating_poi")) e.remove();
    }

    @EventHandler
    public void onEntitiesLoad(EntitiesLoadEvent e) { for (Entity x : e.getEntities()) removeOldStand(x); }

    // Gives them everything again at the next tick: harmless if the client still has them.
    @EventHandler
    public void onRespawn(PlayerRespawnEvent e) { synced.remove(e.getPlayer().getUniqueId()); }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) { synced.remove(e.getPlayer().getUniqueId()); }
}
