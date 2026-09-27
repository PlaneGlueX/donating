package dev.donating.phone;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import me.neznamy.tab.api.TabAPI;
import me.neznamy.tab.api.TabPlayer;
import me.neznamy.tab.api.nametag.NameTagManager;
import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

/**
 * Nametags only in the open (owner, 2026-09-27: "hide nametags for players behind walls, keep them if out in the
 * open"). Vanilla draws a player's name through walls within 64 blocks, which gives hidden players away. Every
 * few ticks this checks each pair of players within range: the viewer's eyes to the other's head, chest and legs,
 * through see-through blocks (glass, leaves, bars, slabs: only full opaque blocks stop a ray). Any clear ray
 * shows the name to that viewer at once; all rays blocked for hide-after passes in a row hides it. TAB draws the
 * names (its teams also sort the tab list), so the hiding goes through TAB's per-viewer API; this class is only
 * made when TAB is installed.
 */
final class Nametags {
    private final JavaPlugin plugin;
    private final NameTagManager tags;
    private final Map<String, Integer> blocked = new HashMap<>(); // "viewer:target" -> passes in a row with no clear ray
    private BukkitTask task;
    private double range;
    private int hideAfter;

    private Nametags(JavaPlugin plugin, NameTagManager tags) { this.plugin = plugin; this.tags = tags; }

    /** Null when TAB is missing or its nametag feature is off (then vanilla names show as always). */
    static Nametags create(JavaPlugin plugin) {
        if (Bukkit.getPluginManager().getPlugin("TAB") == null) return null;
        TabAPI api = TabAPI.getInstance();
        if (api == null || api.getNameTagManager() == null) return null;
        return new Nametags(plugin, api.getNameTagManager());
    }

    void start() {
        stop();
        if (!plugin.getConfig().getBoolean("nametags.enabled", true)) return;
        range = plugin.getConfig().getDouble("nametags.range", 64);
        hideAfter = Math.max(1, plugin.getConfig().getInt("nametags.hide-after", 2));
        long every = Math.max(1, plugin.getConfig().getInt("nametags.every", 5));
        task = Bukkit.getScheduler().runTaskTimer(plugin, this::tick, every, every);
    }

    /** Stops checking and shows every name it hid. */
    void stop() {
        if (task != null) { task.cancel(); task = null; }
        for (Player v : Bukkit.getOnlinePlayers()) for (Player t : Bukkit.getOnlinePlayers()) if (v != t) set(v, t, false);
        blocked.clear();
    }

    private void tick() {
        double r2 = range * range;
        for (Player v : Bukkit.getOnlinePlayers()) {
            for (Player t : Bukkit.getOnlinePlayers()) {
                if (v == t) continue;
                String key = v.getUniqueId() + ":" + t.getUniqueId();
                boolean hide = false;
                if (v.getWorld() == t.getWorld() && v.getLocation().distanceSquared(t.getLocation()) <= r2
                        && t.getGameMode() != GameMode.SPECTATOR && !canSeeName(v, t)) {
                    int n = blocked.getOrDefault(key, 0) + 1;
                    blocked.put(key, n);
                    hide = n >= hideAfter;
                } else {
                    blocked.remove(key);
                }
                set(v, t, hide);
            }
        }
        // Forget pairs whose players left.
        blocked.keySet().removeIf(k -> {
            String[] ids = k.split(":");
            return Bukkit.getPlayer(UUID.fromString(ids[0])) == null || Bukkit.getPlayer(UUID.fromString(ids[1])) == null;
        });
    }

    /** Tells TAB, only when its state differs (also after a /tab reload forgot it). */
    private void set(Player viewer, Player target, boolean hide) {
        TabAPI api = TabAPI.getInstance();
        if (api == null) return;
        TabPlayer tv = api.getPlayer(viewer.getUniqueId());
        TabPlayer tt = api.getPlayer(target.getUniqueId());
        if (tv == null || tt == null || !tt.isLoaded() || !tv.isLoaded()) return;
        boolean now = tags.hasHiddenNameTag(tt, tv);
        if (hide && !now) tags.hideNameTag(tt, tv);
        else if (!hide && now) tags.showNameTag(tt, tv);
    }

    /** Whether any of the three rays from the viewer's eyes reaches the target. */
    boolean canSeeName(Player v, Player t) {
        Location eye = v.getEyeLocation();
        Location base = t.getLocation();
        double h = t.getHeight();
        double[] ys = { h - 0.1, h * 0.6, 0.3 };
        for (double y : ys) {
            if (clear(eye.getWorld(), eye.getX(), eye.getY(), eye.getZ(), base.getX(), base.getY() + y, base.getZ())) return true;
        }
        return false;
    }

    /** Walks the blocks along the segment (Amanatides and Woo); a full opaque block, or an unloaded chunk, stops it. */
    private static boolean clear(World w, double x0, double y0, double z0, double x1, double y1, double z1) {
        double dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
        int x = floor(x0), y = floor(y0), z = floor(z0);
        int ex = floor(x1), ey = floor(y1), ez = floor(z1);
        int sx = (int) Math.signum(dx), sy = (int) Math.signum(dy), sz = (int) Math.signum(dz);
        double tdx = sx == 0 ? Double.MAX_VALUE : Math.abs(1 / dx);
        double tdy = sy == 0 ? Double.MAX_VALUE : Math.abs(1 / dy);
        double tdz = sz == 0 ? Double.MAX_VALUE : Math.abs(1 / dz);
        double tmx = sx == 0 ? Double.MAX_VALUE : ((sx > 0 ? (x + 1 - x0) : (x0 - x)) * tdx);
        double tmy = sy == 0 ? Double.MAX_VALUE : ((sy > 0 ? (y + 1 - y0) : (y0 - y)) * tdy);
        double tmz = sz == 0 ? Double.MAX_VALUE : ((sz > 0 ? (z + 1 - z0) : (z0 - z)) * tdz);
        for (int steps = 0; steps < 400; steps++) {
            if (x == ex && y == ey && z == ez) return true;
            if (tmx < tmy && tmx < tmz) { x += sx; tmx += tdx; }
            else if (tmy < tmz) { y += sy; tmy += tdy; }
            else { z += sz; tmz += tdz; }
            if (x == ex && y == ey && z == ez) return true; // the target's own block never hides it
            if (!w.isChunkLoaded(x >> 4, z >> 4)) return false;
            if (w.getBlockAt(x, y, z).getType().isOccluding()) return false;
        }
        return true;
    }

    private static int floor(double d) { return (int) Math.floor(d); }

    /** One line for tests: whether TAB hides target's name from viewer, and whether a ray reaches it now. */
    String status(Player v, Player t) {
        TabAPI api = TabAPI.getInstance();
        TabPlayer tv = api == null ? null : api.getPlayer(v.getUniqueId());
        TabPlayer tt = api == null ? null : api.getPlayer(t.getUniqueId());
        String hidden = tv == null || tt == null ? "unknown" : String.valueOf(tags.hasHiddenNameTag(tt, tv));
        return "NAMETAG " + v.getName() + " sees " + t.getName() + " hidden=" + hidden + " los=" + canSeeName(v, t)
                + " running=" + (task != null);
    }
}
