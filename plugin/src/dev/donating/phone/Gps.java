package dev.donating.phone;

import java.io.File;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.bukkit.Bukkit;
import org.bukkit.ChunkSnapshot;
import org.bukkit.Color;
import org.bukkit.HeightMap;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.Tag;
import org.bukkit.World;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.ArmorStand;
import org.bukkit.entity.Player;
import org.bukkit.metadata.FixedMetadataValue;

/**
 * The GPS (2026-09-26). Skript (gps.sk) keeps each player's targets in slots (pin, quest, loot), says which one
 * is active, and sends them with /dphone gps; this finds the way to the active one along the city's roads and
 * shows it. The other slots only show as icons on the phone map.
 *
 * The way: a FlowField over the Roads grid (made by /dphone roads scan): like water running downhill to a
 * drain, from any spot the next step is known, so a player who takes another street (or is teleported) is on
 * a new best route at once, with no rerouting. A target can be several spots (any chop shop, any base): the
 * nearest along the roads wins. Cars and walkers get different costs (walkers may cut through an alley, cars
 * keep to the roads). Before the first scan, outside the city or in another world it points straight at the
 * target ("direct").
 *
 * Shown on the phone (PhonePlugin's renderer: the route, the targets' icons, the name and distance in the
 * strip) and in the world, to that player only: a dust trail on the way ahead, a ring on the ground around the
 * target's area, and a dot on the locator bar at the next corner. Trail, ring and dot go away while the player
 * is inside the area ("arrived") or while Skript pauses the GPS (the tag donating_gps_paused: inside a heist).
 *
 * Only this plugin writes the player metadata Skript reads (up to 5 ticks old): donating_gps_next (Location:
 * the next corner), donating_gps_left (Double: blocks left along the way, or in a straight line),
 * donating_gps_state (route | direct | arrived | paused), donating_gps_turn (left | right | "") and
 * donating_gps_turn_in (Double: blocks to that turn).
 */
final class Gps {
    static final String META_NEXT = "donating_gps_next", META_LEFT = "donating_gps_left", META_STATE = "donating_gps_state";
    static final String META_TURN = "donating_gps_turn", META_TURN_IN = "donating_gps_turn_in";
    static final String STAND_TAG = "donating_gps";
    static final double SQRT2 = Math.sqrt(2);

    private final PhonePlugin plugin;
    private final ExecutorService worker = daemon("DonatingPhone-GPS");     // flow fields
    private final ExecutorService scanner = daemon("DonatingPhone-roads");  // the road scan (never delays a route)

    private static ExecutorService daemon(String name) {
        return Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, name);
            t.setDaemon(true);
            t.setPriority(Thread.MIN_PRIORITY);
            return t;
        });
    }

    // Config
    private Set<Material> roadBlocks = Set.of();
    private Set<Material> solid = Set.of(), noStand = Set.of(); // made on the main thread, read by the scan thread
    private Integer streetMin, streetMax;
    private int[] footCost = {15, 10, 150}, carCost = {60, 10, 400}; // tenths per step onto OPEN, ROAD, BLOCKED
    private int maxCells = 262_144;
    private double leadMin = 16, leadMax = 40, trailMin = 24, trailMax = 64, ringRange = 48, carPinRadius = 14;
    private String pausedTag = "donating_gps_paused";
    private net.kyori.adventure.key.Key waypointStyle; // gps.style
    private final Map<String, Color> colors = new HashMap<>();

    // The city (from PhonePlugin) and its grid
    private World cityWorld;
    private double cx0, cz0;
    private int imgW, imgH, bpp;
    private volatile Roads roads;  // null = no valid grid: everyone goes "direct"
    private String roadsNote = "no scan yet";
    private Scan scan;

    private final Map<UUID, Nav> navs = new HashMap<>();
    private final Map<UUID, Boolean> showRoads = new HashMap<>();
    // Flow fields shared by players with the same target (a base, the chop shops): the last few.
    private final Map<String, FlowField> cache = new LinkedHashMap<>(16, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<String, FlowField> e) { return size() > 12; }
    };
    private int ticks;

    /** One player's GPS: the targets by slot, which is active, the dot, how fast they move (main thread only). */
    static final class Nav {
        final Map<String, Target> slots = new LinkedHashMap<>();
        String active = "";
        ArmorStand stand;
        double lastX = Double.NaN, lastZ;
        World lastWorld;
        boolean lastHeld;          // the last sample was paused or dead (a respawn or eviction follows)
        long lastT;
        double speed; // blocks per second, smoothed

        Target active() { return slots.get(active); }
    }

    /** One target and, while it's the active one, the way to it. */
    static final class Target {
        final String kind, label;
        final World world;
        final double[][] pts;      // the spots (x, y, z): one, or several (any chop shop)
        final double radius;
        double x, y, z;            // the spot being headed for (the nearest one, or where the way ends)
        int[] cells = new int[0];  // the spots' grid cells
        FlowField field;
        Roads fieldRoads;
        boolean fieldCar, pending;
        int requestId;
        long requestedAt;
        int version;               // the phone redraws when this changes
        int[] walk = new int[0];   // cells from the player to the target
        double left, turnIn;
        String turn = "";
        Location next;
        String state = "direct";
        boolean arrived;
        long arrivedAt;            // arrived stays at least 1.5 s (Skript checks once a second; a car passes an area fast)

        Target(String kind, World world, double[][] pts, double radius, String label) {
            this.kind = kind;
            this.world = world;
            this.pts = pts;
            this.radius = Math.max(1, radius);
            this.label = label;
            x = pts[0][0];
            y = pts[0][1];
            z = pts[0][2];
        }
    }

    Gps(PhonePlugin plugin) { this.plugin = plugin; }

    // ---------- Setup ----------

    void configure(FileConfiguration c) {
        Set<Material> set = new java.util.HashSet<>();
        for (String name : c.getStringList("gps.road-blocks")) {
            Material m = Material.matchMaterial(name);
            if (m == null || !m.isBlock()) plugin.getLogger().warning("gps.road-blocks: " + name + " isn't a block");
            else set.add(m);
        }
        roadBlocks = set;
        java.util.EnumSet<Material> sol = java.util.EnumSet.noneOf(Material.class), no = java.util.EnumSet.noneOf(Material.class);
        for (Material m : Material.values()) {
            if (m.isLegacy() || !m.isBlock()) continue;
            if (m.isSolid()) sol.add(m);
            if (Tag.FENCES.isTagged(m) || Tag.WALLS.isTagged(m) || Tag.FENCE_GATES.isTagged(m) || m.name().endsWith("_PANE") || m == Material.IRON_BARS) no.add(m);
        }
        solid = sol;
        noStand = no;
        streetMin = c.isInt("gps.street-y-min") ? c.getInt("gps.street-y-min") : null;
        streetMax = c.isInt("gps.street-y-max") ? c.getInt("gps.street-y-max") : null;
        footCost = costs(c, "gps.foot-cost", footCost);
        carCost = costs(c, "gps.car-cost", carCost);
        maxCells = Math.max(4096, c.getInt("gps.max-cells", 262_144));
        leadMin = c.getDouble("gps.lead-min", 16);
        leadMax = Math.max(leadMin, c.getDouble("gps.lead-max", 40));
        trailMin = c.getDouble("gps.trail-min", 24);
        trailMax = Math.max(trailMin, c.getDouble("gps.trail-max", 64));
        ringRange = c.getDouble("gps.ring-range", 48);
        carPinRadius = c.getDouble("gps.car-pin-radius", 14);
        pausedTag = c.getString("gps.paused-tag", "donating_gps_paused");
        waypointStyle = styleKey(c.getString("gps.style", "donating:gps"));
        colors.clear();
        for (String kind : List.of("pin", "quest", "loot")) colors.put(kind, color(c.getString("gps.color." + kind), kind.equals("pin") ? 0xD040E0 : kind.equals("quest") ? 0xFF5A1F : 0x30C8C0));
        cache.clear();
    }

    private int[] costs(FileConfiguration c, String key, int[] def) {
        return new int[] {
            (int) Math.round(10 * c.getDouble(key + ".open", def[0] / 10.0)),
            (int) Math.round(10 * c.getDouble(key + ".road", def[1] / 10.0)),
            (int) Math.round(10 * c.getDouble(key + ".blocked", def[2] / 10.0))};
    }

    private static Color color(String hex, int def) {
        try { if (hex != null) return Color.fromRGB(Integer.parseInt(hex.replace("#", ""), 16)); } catch (NumberFormatException ignored) {}
        return Color.fromRGB(def);
    }

    Color colorOf(String kind) { return colors.getOrDefault(kind, Color.WHITE); }

    /**
     * A locator-bar icon (the pack's waypoint styles, toolsmake-waypoint-art.js), or null for vanilla's dot ("default",
     * empty or not a key). A client without the pack draws an unknown style as the missing texture (26.3:
     * WaypointStyleManager's MISSING): Minehut's pack is required.
     */
    static net.kyori.adventure.key.Key styleKey(String s) {
        if (s == null || s.isBlank() || s.equalsIgnoreCase("default")) return null;
        try { return net.kyori.adventure.key.Key.key(s.trim()); } catch (RuntimeException e) { return null; }
    }

    /** The city changed (or the config was reloaded): the grid it needs, and roads.bin if it fits. */
    void city(World world, double x0, double z0, int imgW, int imgH, int bpp) {
        // A running road scan goes on when nothing it depends on changed (review fix: a city scan of the same box cancelled it).
        boolean same = scan != null && world == cityWorld && x0 == cx0 && z0 == cz0 && imgW == this.imgW && imgH == this.imgH && bpp == this.bpp
                && world != null && fingerprint(world).equals(scan.startPrint);
        if (scan != null && !same) {
            scan.cancelled = true;
            scan.who.sendMessage("ROADS scan cancelled: the city or the settings changed (/dphone roads scan again)");
            scan = null;
        }
        cityWorld = world;
        cx0 = x0;
        cz0 = z0;
        this.imgW = imgW;
        this.imgH = imgH;
        this.bpp = bpp;
        roads = null;
        cache.clear();
        for (Nav n : navs.values()) for (Target t : n.slots.values()) t.field = null;
        if (world == null) { roadsNote = "no city map"; return; }
        File f = file();
        if (!f.exists()) { roadsNote = "no roads.bin yet: /dphone roads scan"; return; }
        try {
            Roads r = Roads.load(f);
            Roads e = empty();
            // The same cells, the city drawn at another scale: keep them, drawn at the new pixels per cell (review fix).
            if (!e.fits(r) && e.sameCells(r)) r = r.withK(e.k);
            if (!e.fits(r)) { roadsNote = "roads.bin is for another city map: /dphone roads scan"; return; }
            roads = r;
            roadsNote = r.fingerprint.equals(fingerprint(world)) ? "ok" : "ok, but scanned with other road blocks or street heights: /dphone roads scan";
        } catch (IOException e) {
            roadsNote = "roads.bin can't be read (" + e.getMessage() + "): /dphone roads scan";
        }
    }

    private File file() { return new File(plugin.getDataFolder(), "roads.bin"); }

    /** An empty grid over the city: city pixels, grouped k x k so it stays under max-cells. */
    private Roads empty() {
        int k = (int) Math.max(1, Math.ceil(Math.sqrt((double) imgW * imgH / maxCells)));
        return new Roads(cityWorld.getName(), cx0, cz0, (imgW + k - 1) / k, (imgH + k - 1) / k, k, bpp * k);
    }

    private int yMin(World w) { return streetMin != null ? Math.max(w.getMinHeight(), streetMin) : w.getMinHeight(); }
    private int yMax(World w) { return streetMax != null ? Math.min(w.getMaxHeight() - 3, streetMax) : w.getMaxHeight() - 3; }

    private String fingerprint(World w) {
        TreeSet<String> names = new TreeSet<>();
        for (Material m : roadBlocks) names.add(m.getKey().getKey());
        return String.join(",", names) + "|" + yMin(w) + ".." + yMax(w);
    }

    Roads roads() { return roads; }
    String roadsNote() { return roadsNote; }

    void shutdown() {
        worker.shutdownNow();
        scanner.shutdownNow();
        if (scan != null) scan.cancelled = true;
        scan = null;
        for (Nav n : navs.values()) removeStand(n);
        navs.clear();
    }

    // ---------- Targets (gps.sk: /dphone gps ...) ----------

    Nav nav(Player p) { return navs.get(p.getUniqueId()); }

    /** The active target (null if none). */
    Target target(Player p) {
        Nav n = navs.get(p.getUniqueId());
        return n == null ? null : n.active();
    }

    void set(Player p, String slot, World world, double[][] pts, double radius, String label) {
        Nav n = navs.computeIfAbsent(p.getUniqueId(), k -> new Nav());
        Target old = n.slots.get(slot);
        boolean samePlace = old != null && old.world.equals(world) && samePts(old.pts, pts);
        if (samePlace && old.label.equals(label) && old.radius == Math.max(1, radius)) return;
        Target t = new Target(slot, world, pts, radius, label);
        if (old != null) {
            // The same spots (a label or radius change): keep the way already found.
            if (samePlace) {
                t.field = old.field;
                t.fieldRoads = old.fieldRoads;
                t.fieldCar = old.fieldCar;
            }
            t.version = old.version + 1;
        }
        n.slots.put(slot, t);
        plugin.redraw(p);
        if (slot.equals(n.active)) update(p, n, false);
    }

    void active(Player p, String slot) {
        Nav n = navs.computeIfAbsent(p.getUniqueId(), k -> new Nav());
        String s = slot.equals("none") ? "" : slot;
        if (s.equals(n.active)) return;
        n.active = s;
        Target t = n.active();
        if (t != null) { t.version++; t.arrived = false; }
        plugin.redraw(p);
        update(p, n, false);
    }

    void clear(Player p, String slot) {
        Nav n = navs.get(p.getUniqueId());
        if (n == null) return;
        if (slot == null) n.slots.clear();
        else n.slots.remove(slot);
        plugin.redraw(p);
        if (n.active() == null) quiet(p, n);
        if (n.slots.isEmpty() && n.active.isEmpty()) navs.remove(p.getUniqueId());
    }

    private static boolean samePts(double[][] a, double[][] b) {
        if (a.length != b.length) return false;
        for (int i = 0; i < a.length; i++) for (int j = 0; j < 3; j++) if (Math.abs(a[i][j] - b[i][j]) > 0.01) return false;
        return true;
    }

    /** Nothing active: no dot, no metadata. */
    private void quiet(Player p, Nav n) {
        removeStand(n);
        for (String k : List.of(META_NEXT, META_LEFT, META_STATE, META_TURN, META_TURN_IN)) p.removeMetadata(k, plugin);
    }

    boolean showRoads(Player p) { return showRoads.getOrDefault(p.getUniqueId(), false); }

    void quit(Player p) {
        Nav n = navs.remove(p.getUniqueId());
        quiet(p, n != null ? n : new Nav());
        showRoads.remove(p.getUniqueId());
    }

    // ---------- Every tick (PhonePlugin's watcher) ----------

    void tick() {
        ticks++;
        if (scan != null) scan.pump();
        if (ticks % 5 != 0) return;
        boolean draw = ticks % 10 == 0;
        for (Player p : Bukkit.getOnlinePlayers()) {
            Nav n = navs.get(p.getUniqueId());
            if (n != null) update(p, n, draw);
        }
    }

    private void update(Player p, Nav n, boolean draw) {
        Location l = p.getLocation();
        long now = System.currentTimeMillis();
        double px = n.lastX, pz = n.lastZ;
        boolean moved = !Double.isNaN(px) && now > n.lastT && l.getWorld().equals(n.lastWorld);
        // A real move, not a teleport, respawn or eviction: those never "pass through" a target.
        boolean walked = moved && !n.lastHeld && Math.hypot(l.getX() - px, l.getZ() - pz) <= 20;
        // Speed (for how far ahead the dot and the trail go).
        if (walked) {
            double v = Math.hypot(l.getX() - px, l.getZ() - pz) / ((now - n.lastT) / 1000.0);
            n.speed = n.speed * 0.6 + Math.min(v, 60) * 0.4;
        }
        boolean paused = p.getScoreboardTags().contains(pausedTag) || p.isDead();
        n.lastX = l.getX();
        n.lastZ = l.getZ();
        n.lastWorld = l.getWorld();
        n.lastHeld = paused;
        n.lastT = now;
        Target t = n.active();
        if (t == null) { quiet(p, n); return; }
        boolean sameWorld = t.world.equals(l.getWorld());
        boolean car = p.isInsideVehicle();

        // The nearest spot. Arrived: inside its area (flat distance; a few blocks of height either way, except
        // for a pin), also when the last 5 ticks' real move passed through it (a car covers 6 blocks in that
        // time; not a teleport), and not arrived again until a bit outside it (no flicker at the edge). A pin is
        // a bigger area for a car.
        if (sameWorld) nearest(t, l);
        double flat = sameWorld ? Math.hypot(l.getX() - t.x, l.getZ() - t.z) : Double.MAX_VALUE;
        double r = t.kind.equals("pin") && car ? Math.max(t.radius, carPinRadius) : t.radius;
        if (!paused) {
            if (!t.arrived && sameWorld && (t.kind.equals("pin") || Math.abs(l.getY() - t.y) <= 12)) {
                boolean in = flat <= r;
                if (!in && walked) for (double[] q : t.pts) if (distToSegment(q[0], q[2], px, pz, l.getX(), l.getZ()) <= r) { in = true; break; }
                if (in) { t.arrived = true; t.arrivedAt = now; }
            } else if (t.arrived && now - t.arrivedAt > 1500 && flat > r + Math.max(4, r / 2)) t.arrived = false;
        }

        // The way.
        Roads rd = roads;
        int from = -1;
        t.cells = new int[0];
        if (rd != null && sameWorld && t.world.getName().equals(rd.world)) {
            t.cells = cellsOf(t, rd);
            from = rd.cellAt(l.getX(), l.getZ());
        }
        boolean fieldOk = t.field != null && t.fieldRoads == rd && t.cells.length > 0 && t.field.sameTargets(t.cells);
        if (t.cells.length > 0 && (!fieldOk || t.fieldCar != car)) request(p, t, rd, car, now, fieldOk);
        fieldOk = t.field != null && t.fieldRoads == rd && t.cells.length > 0 && t.field.sameTargets(t.cells); // the cache may have filled it
        double lead = Math.max(leadMin, Math.min(leadMax, n.speed * 2));
        t.turn = "";
        t.turnIn = -1;
        if (from >= 0 && fieldOk) {
            walk(t, rd, from);
            headFor(t, rd);
            t.left = length(t, rd, l);
            t.next = corner(t, rd, l, lead);
            t.state = "route";
        } else {
            t.walk = new int[0];
            t.left = sameWorld ? Math.hypot(flat, l.getY() - t.y) : -1;
            t.next = sameWorld ? toward(l, t, Math.min(lead, flat)) : null;
            t.state = "direct";
        }
        if (t.arrived) t.state = "arrived";
        if (paused) t.state = "paused";

        p.setMetadata(META_STATE, new FixedMetadataValue(plugin, t.state));
        p.setMetadata(META_LEFT, new FixedMetadataValue(plugin, t.left));
        p.setMetadata(META_TURN, new FixedMetadataValue(plugin, t.turn));
        p.setMetadata(META_TURN_IN, new FixedMetadataValue(plugin, t.turnIn));
        if (t.next != null) p.setMetadata(META_NEXT, new FixedMetadataValue(plugin, t.next.clone()));
        else p.removeMetadata(META_NEXT, plugin);

        // In the world: nothing while arrived or paused.
        if (paused || t.arrived || t.next == null) { removeStand(n); return; }
        stand(p, n, t);
        if (draw) {
            trail(p, n, t, rd, l);
            ring(p, t, l);
        }
    }

    /** The spots' grid cells (inside the grid, no repeats). */
    private static int[] cellsOf(Target t, Roads r) {
        int[] out = new int[t.pts.length];
        int n = 0;
        outer:
        for (double[] q : t.pts) {
            int c = r.cellAt(q[0], q[2]);
            if (c < 0) continue;
            for (int i = 0; i < n; i++) if (out[i] == c) continue outer;
            out[n++] = c;
        }
        return Arrays.copyOf(out, n);
    }

    /** Heads for the nearest spot (flat distance). */
    private static void nearest(Target t, Location l) {
        double best = Double.MAX_VALUE;
        for (double[] q : t.pts) {
            double d = Math.hypot(q[0] - l.getX(), q[2] - l.getZ());
            if (d < best) { best = d; t.x = q[0]; t.y = q[1]; t.z = q[2]; }
        }
    }

    /** With several spots: head for the one the way ends at (the nearest along the roads). */
    private static void headFor(Target t, Roads r) {
        if (t.pts.length < 2 || t.walk.length == 0) return;
        int end = t.walk[t.walk.length - 1];
        for (double[] q : t.pts) if (r.cellAt(q[0], q[2]) == end) { t.x = q[0]; t.y = q[1]; t.z = q[2]; return; }
    }

    private static String cacheKey(Roads r, boolean car, int[] cells) {
        int[] s = cells.clone();
        Arrays.sort(s);
        return System.identityHashCode(r) + (car ? "c" : "f") + Arrays.toString(s);
    }

    private void request(Player p, Target t, Roads r, boolean car, long now, boolean fieldOk) {
        if (t.pending) return;
        FlowField cached = cache.get(cacheKey(r, car, t.cells));
        if (cached != null) {
            t.field = cached;
            t.fieldRoads = r;
            t.fieldCar = car;
            t.version++;
            return;
        }
        // A new target is worked out at once; the same target again (e.g. getting into a car) once a second.
        if (fieldOk && now - t.requestedAt < 1000) return;
        t.pending = true;
        t.requestedAt = now;
        int id = ++t.requestId;
        int[] goal = t.cells.clone();
        int[] cost = car ? carCost : footCost;
        UUID who = p.getUniqueId();
        String key = cacheKey(r, car, goal);
        worker.execute(() -> {
            FlowField f = new FlowField(r.w, r.h, r.kind, cost, goal);
            if (!plugin.isEnabled()) return;
            Bukkit.getScheduler().runTask(plugin, () -> {
                t.pending = false;
                if (roads == r) cache.put(key, f);
                Nav n = navs.get(who);
                if (n == null || !n.slots.containsValue(t) || t.requestId != id) return; // replaced meanwhile
                t.field = f;
                t.fieldRoads = r;
                t.fieldCar = car;
                t.version++;
            });
        });
    }

    /** The cells from `from` to the target along the field. */
    private static void walk(Target t, Roads r, int from) {
        int[] out = new int[64];
        int n = 0, c = from, guard = r.w * r.h;
        while (guard-- > 0) {
            if (n == out.length) out = Arrays.copyOf(out, n * 2);
            out[n++] = c;
            int nx = t.field.next(c);
            if (nx == c || nx < 0) break;
            c = nx;
        }
        t.walk = Arrays.copyOf(out, n);
    }

    /** Blocks left along the way: from the player to the first cell centre, then cell to cell. */
    private static double length(Target t, Roads r, Location l) {
        if (t.walk.length == 0) return 0;
        double d = Math.hypot(r.centerX(t.walk[0]) - l.getX(), r.centerZ(t.walk[0]) - l.getZ());
        for (int i = 1; i < t.walk.length; i++) {
            boolean diag = t.walk[i] % r.w != t.walk[i - 1] % r.w && t.walk[i] / r.w != t.walk[i - 1] / r.w;
            d += r.cellBlocks * (diag ? SQRT2 : 1);
        }
        return d + Math.hypot(t.x - r.centerX(t.walk[t.walk.length - 1]), t.z - r.centerZ(t.walk[t.walk.length - 1]));
    }

    /** The farthest walk index j after i0 that is straight from (sx, sz): every cell between within a cell's width. */
    private static int straightFrom(Target t, Roads r, double sx, double sz, int i0, double maxAlong) {
        double along = 0, px = sx, pz = sz;
        int best = i0;
        for (int j = i0 + 1; j < t.walk.length; j++) {
            double jx = r.centerX(t.walk[j]), jz = r.centerZ(t.walk[j]);
            along += Math.hypot(jx - px, jz - pz);
            px = jx;
            pz = jz;
            if (along > maxAlong) break;
            boolean straight = true;
            for (int i = i0 + 1; i < j && straight; i++) {
                if (distToSegment(r.centerX(t.walk[i]), r.centerZ(t.walk[i]), sx, sz, jx, jz) > r.cellBlocks * 1.01) straight = false;
            }
            if (!straight) break;
            best = j;
        }
        return best;
    }

    /**
     * Where the dot goes: the next corner of the way (the farthest point along it you can see in a straight
     * line), no farther than `lead` blocks; the target itself when that's closer. Also the turn there (left or
     * right, if it bends 30° or more) and how far ahead it is.
     */
    private Location corner(Target t, Roads r, Location l, double lead) {
        double sx = l.getX(), sz = l.getZ();
        int j = straightFrom(t, r, sx, sz, 0, Math.max(lead, 200));
        double jx = r.centerX(t.walk[j]), jz = r.centerZ(t.walk[j]);
        double toCorner = Math.hypot(jx - sx, jz - sz);
        if (j < t.walk.length - 1) {
            // The turn: from the way in to the way out over the next few cells.
            int k = Math.min(t.walk.length - 1, j + Math.max(2, (int) Math.ceil(6.0 / r.cellBlocks)));
            double ix = jx - sx, iz = jz - sz, ox = r.centerX(t.walk[k]) - jx, oz = r.centerZ(t.walk[k]) - jz;
            double ang = Math.toDegrees(Math.atan2(ix * oz - iz * ox, ix * ox + iz * oz));
            if (Math.abs(ang) >= 30 && Math.hypot(ix, iz) > 0.5) {
                t.turn = ang > 0 ? "right" : "left"; // x east, z south: a positive cross product turns clockwise
                t.turnIn = toCorner;
            }
        }
        if (j == t.walk.length - 1 && Math.hypot(t.x - sx, t.z - sz) <= lead) return at(t.world, t.x, t.z, l);
        if (toCorner > lead) {
            double f = lead / toCorner;
            return at(t.world, sx + (jx - sx) * f, sz + (jz - sz) * f, l);
        }
        if (j == 0) j = Math.min(t.walk.length - 1, 1);
        return at(t.world, r.centerX(t.walk[j]), r.centerZ(t.walk[j]), l);
    }

    private static double distToSegment(double x, double z, double ax, double az, double bx, double bz) {
        double dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
        double u = len2 == 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
        return Math.hypot(x - (ax + u * dx), z - (az + u * dz));
    }

    private Location toward(Location l, Target t, double dist) {
        double dx = t.x - l.getX(), dz = t.z - l.getZ(), d = Math.hypot(dx, dz);
        if (d < 1e-6) return at(t.world, t.x, t.z, l);
        return at(t.world, l.getX() + dx / d * dist, l.getZ() + dz / d * dist, l);
    }

    /** A spot at x, z: on the ground there if its chunk is loaded, else at the player's height. */
    private static Location at(World w, double x, double z, Location player) {
        int bx = (int) Math.floor(x), bz = (int) Math.floor(z);
        double y = player.getY();
        if (w.isChunkLoaded(bx >> 4, bz >> 4)) y = w.getHighestBlockYAt(bx, bz, HeightMap.MOTION_BLOCKING_NO_LEAVES) + 1;
        return new Location(w, x, y, z);
    }

    // ---------- In the world, for that player only ----------

    /** The locator-bar dot: one invisible marker stand per player, only they ever see it. */
    private void stand(Player p, Nav n, Target t) {
        Location at = t.next;
        if (!at.getWorld().isChunkLoaded(at.getBlockX() >> 4, at.getBlockZ() >> 4)) return;
        if (n.stand != null && (!n.stand.isValid() || !n.stand.getWorld().equals(at.getWorld()))) removeStand(n);
        Color c = colorOf(t.kind);
        if (n.stand == null) {
            ArmorStand a = at.getWorld().spawn(at, ArmorStand.class, e -> {
                e.setVisibleByDefault(false); // first, and before it's in the world: nobody else is ever sent it
                e.setPersistent(false);
                e.setInvisible(true);
                e.setMarker(true);
                e.setGravity(false);
                e.setInvulnerable(true);
                e.setSilent(true);
                e.addScoreboardTag(STAND_TAG);
            });
            if (!a.isValid()) return; // the spawn was refused
            n.stand = a;
            p.showEntity(plugin, a);
            // Only now a waypoint: giving it a range starts tracking at once, to whoever may see it then (the
            // color first, so the first packet already has it).
            a.setWaypointColor(c);
            if (waypointStyle != null) a.setWaypointStyle(waypointStyle); // the pin icon on the bar
            AttributeInstance range = a.getAttribute(Attribute.WAYPOINT_TRANSMIT_RANGE);
            if (range != null) range.setBaseValue(6.0E7);
        } else {
            if (!c.equals(n.stand.getWaypointColor())) n.stand.setWaypointColor(c);
            // Every pass (review fix: a reload to "default" left live dots on the old icon). Paper does nothing when it's
            // the same style, and null is vanilla's dot.
            n.stand.setWaypointStyle(waypointStyle);
            if (n.stand.getLocation().distanceSquared(at) > 1) n.stand.teleport(at);
        }
    }

    private static void removeStand(Nav n) {
        if (n.stand != null) n.stand.remove();
        n.stand = null;
    }

    /** Dust on the way ahead, farther the faster you go, along the way's straight stretches (no zig-zag). */
    private void trail(Player p, Nav n, Target t, Roads r, Location l) {
        Particle.DustOptions dust = new Particle.DustOptions(colorOf(t.kind), 1.4f);
        double len = Math.max(trailMin, Math.min(trailMax, n.speed * 3));
        World w = l.getWorld();
        List<double[]> pts = new ArrayList<>();
        if (t.walk.length > 0) {
            // String-pulled: from the player, each farthest straight point along the way.
            double sx = l.getX(), sz = l.getZ();
            int i = 0;
            double along = 0;
            while (i < t.walk.length - 1 && along < len) {
                int j = straightFrom(t, r, sx, sz, i, len - along + r.cellBlocks);
                if (j <= i) j = i + 1;
                double jx = r.centerX(t.walk[j]), jz = r.centerZ(t.walk[j]);
                along += Math.hypot(jx - sx, jz - sz);
                pts.add(new double[] {jx, jz});
                sx = jx;
                sz = jz;
                i = j;
            }
            if (i >= t.walk.length - 1) pts.add(new double[] {t.x, t.z});
        } else pts.add(new double[] {t.x, t.z});
        double px = l.getX(), pz = l.getZ(), along = 0, next = 2.5;
        for (double[] q : pts) {
            double dx = q[0] - px, dz = q[1] - pz, seg = Math.hypot(dx, dz);
            while (seg > 0 && next <= along + seg) {
                if (next > len) return;
                double u = (next - along) / seg, x = px + dx * u, z = pz + dz * u;
                int bx = (int) Math.floor(x), bz = (int) Math.floor(z);
                if (!w.isChunkLoaded(bx >> 4, bz >> 4)) return;
                double y = w.getHighestBlockYAt(bx, bz, HeightMap.MOTION_BLOCKING_NO_LEAVES) + 1.25;
                p.spawnParticle(Particle.DUST, x, y, z, 1, 0, 0, 0, 0, dust, true);
                next += 2;
            }
            along += seg;
            px = q[0];
            pz = q[1];
            if (along > len) return;
        }
    }

    /** The target's area as a ring on the ground, while you're near it and not inside yet. */
    private void ring(Player p, Target t, Location l) {
        Particle.DustOptions dust = new Particle.DustOptions(colorOf(t.kind), 1.6f);
        World w = t.world;
        int n = (int) Math.max(12, Math.min(48, t.radius * 4));
        for (double[] q : t.pts) {
            if (Math.hypot(q[0] - l.getX(), q[2] - l.getZ()) > ringRange + t.radius) continue;
            for (int i = 0; i < n; i++) {
                double a = 2 * Math.PI * i / n, x = q[0] + Math.cos(a) * t.radius, z = q[2] + Math.sin(a) * t.radius;
                int bx = (int) Math.floor(x), bz = (int) Math.floor(z);
                if (!w.isChunkLoaded(bx >> 4, bz >> 4)) continue;
                double y = w.getHighestBlockYAt(bx, bz, HeightMap.MOTION_BLOCKING_NO_LEAVES) + 1.2;
                p.spawnParticle(Particle.DUST, x, y, z, 1, 0, 0, 0, 0, dust, true);
            }
        }
    }

    // ---------- /dphone gps and /dphone roads ----------

    boolean command(CommandSender sender, String[] a) {
        if (a[0].equalsIgnoreCase("gps")) {
            if (a.length < 2) {
                sender.sendMessage("/dphone gps <player> [set <pin|quest|loot> <world> <radius> <x,y,z[;x,y,z...]> <label...> | active <slot|none> | clear [slot]]");
                return true;
            }
            Player p = Bukkit.getPlayerExact(a[1]);
            if (p == null) { sender.sendMessage("GPS " + a[1] + " offline"); return true; }
            if (a.length == 2) { sender.sendMessage(status(p)); return true; }
            String sub = a[2].toLowerCase();
            if (sub.equals("clear")) { clear(p, a.length > 3 ? a[3].toLowerCase() : null); return true; }
            if (sub.equals("active") && a.length > 3) { active(p, a[3].toLowerCase()); return true; }
            if (sub.equals("set") && a.length >= 7) {
                World w = Bukkit.getWorld(a[4]);
                try {
                    if (w == null) throw new NumberFormatException("no world " + a[4]);
                    double radius = Double.parseDouble(a[5]);
                    String[] spots = a[6].split(";");
                    double[][] pts = new double[spots.length][];
                    for (int i = 0; i < spots.length; i++) {
                        String[] v = spots[i].split(",");
                        if (v.length != 3) throw new NumberFormatException("a spot is x,y,z: " + spots[i]);
                        pts[i] = new double[] {Double.parseDouble(v[0]), Double.parseDouble(v[1]), Double.parseDouble(v[2])};
                    }
                    String label = a.length > 7 ? String.join(" ", Arrays.copyOfRange(a, 7, a.length)) : a[3];
                    set(p, a[3].toLowerCase(), w, pts, radius, label);
                } catch (NumberFormatException e) {
                    sender.sendMessage("GPS bad set: " + e.getMessage());
                }
                return true;
            }
            sender.sendMessage("GPS usage: /dphone gps <player> [set ... | active <slot|none> | clear [slot]]");
            return true;
        }
        // roads
        String sub = a.length > 1 ? a[1].toLowerCase() : "info";
        switch (sub) {
            case "scan" -> {
                if (cityWorld == null) { sender.sendMessage("ROADS no city yet: /dphone city scan first (or set city-maps)"); return true; }
                if (scan != null) { sender.sendMessage("ROADS a scan is running (" + scan.progress() + ")"); return true; }
                int x1, z1, x2, z2;
                if (a.length >= 6) {
                    try {
                        x1 = Integer.parseInt(a[2]); z1 = Integer.parseInt(a[3]); x2 = Integer.parseInt(a[4]); z2 = Integer.parseInt(a[5]);
                    } catch (NumberFormatException e) { sender.sendMessage("ROADS scan [x1 z1 x2 z2]"); return true; }
                } else {
                    x1 = (int) Math.floor(cx0); z1 = (int) Math.floor(cz0);
                    x2 = (int) Math.floor(cx0 + imgW * bpp) - 1; z2 = (int) Math.floor(cz0 + imgH * bpp) - 1;
                }
                // Never beyond the city (a typo can't queue millions of chunks).
                int cx1 = (int) Math.floor(cx0), cz1 = (int) Math.floor(cz0), cx2 = (int) Math.floor(cx0 + imgW * bpp) - 1, cz2 = (int) Math.floor(cz0 + imgH * bpp) - 1;
                int bx1 = Math.max(cx1, Math.min(x1, x2)), bz1 = Math.max(cz1, Math.min(z1, z2)), bx2 = Math.min(cx2, Math.max(x1, x2)), bz2 = Math.min(cz2, Math.max(z1, z2));
                if (bx1 > bx2 || bz1 > bz2) { sender.sendMessage("ROADS that box is outside the city (" + cx1 + " " + cz1 + " to " + cx2 + " " + cz2 + ")"); return true; }
                if (roadBlocks.isEmpty()) sender.sendMessage("ROADS warning: gps.road-blocks is empty, so nothing will count as road");
                Roads into = roads != null ? roads.copy() : empty();
                scan = new Scan(sender, into, bx1, bz1, bx2, bz2);
                sender.sendMessage("ROADS scanning " + scan.total + " chunks (" + (scan.bx2 - scan.bx1 + 1) + "x" + (scan.bz2 - scan.bz1 + 1) + " blocks, heights " + yMin(cityWorld) + ".." + yMax(cityWorld) + ")");
            }
            case "cancel" -> { if (scan != null) { scan.cancelled = true; scan = null; sender.sendMessage("ROADS scan cancelled"); } }
            case "show" -> {
                Player p = a.length > 2 ? Bukkit.getPlayerExact(a[2]) : sender instanceof Player pl ? pl : null;
                if (p == null) { sender.sendMessage("ROADS show <player> [on|off]"); return true; }
                boolean on = a.length > 3 ? a[3].equalsIgnoreCase("on") : !showRoads(p);
                showRoads.put(p.getUniqueId(), on);
                plugin.redraw(p);
                sender.sendMessage("ROADS " + p.getName() + " sees the road grid on the big map: " + on);
            }
            default -> {
                Roads r = roads;
                sender.sendMessage("ROADS " + roadsNote + (r == null ? "" : " cells=" + r.w + "x" + r.h + " cell=" + r.cellBlocks + "b road=" + r.roads + " blocked=" + r.blocked + " open=" + (r.w * r.h - r.roads - r.blocked))
                        + " blocks=" + (cityWorld == null ? "-" : fingerprint(cityWorld)) + (scan != null ? " scanning=" + scan.progress() : ""));
            }
        }
        return true;
    }

    String status(Player p) {
        Nav n = navs.get(p.getUniqueId());
        if (n == null) return "GPS " + p.getName() + " none";
        StringBuilder b = new StringBuilder("GPS " + p.getName() + " active=" + (n.active.isEmpty() ? "none" : n.active) + " slots=" + String.join(",", n.slots.keySet()));
        Target t = n.active();
        if (t != null) {
            b.append(" label=").append(t.label.replace(' ', '_')).append(" target=").append(fmt(t.x)).append(',').append(fmt(t.y)).append(',').append(fmt(t.z))
                    .append(" spots=").append(t.pts.length).append(" r=").append(fmt(t.radius)).append(" state=").append(t.state).append(" left=").append(fmt(t.left))
                    .append(" next=").append(t.next == null ? "none" : fmt(t.next.getX()) + "," + fmt(t.next.getY()) + "," + fmt(t.next.getZ()))
                    .append(" turn=").append(t.turn.isEmpty() ? "none" : t.turn + "@" + fmt(t.turnIn)).append(" field=").append(t.field != null).append(" car=").append(t.fieldCar)
                    .append(" walk=").append(t.walk.length);
            Roads r = roads;
            if (t.walk.length > 0 && r != null && t.fieldRoads == r) {
                int roadCells = 0, blockedCells = 0;
                for (int c : t.walk) { if (r.kind[c] == Roads.ROAD) roadCells++; else if (r.kind[c] == Roads.BLOCKED) blockedCells++; }
                b.append(" walkRoad=").append(roadCells).append(" walkBlocked=").append(blockedCells).append(" end=").append(fmt(r.centerX(t.walk[t.walk.length - 1]))).append(',').append(fmt(r.centerZ(t.walk[t.walk.length - 1])));
            }
            b.append(" version=").append(t.version);
        }
        b.append(" speed=").append(fmt(n.speed)).append(" stand=").append(n.stand != null && n.stand.isValid());
        return b.toString();
    }

    static String fmt(double v) { return String.valueOf(Math.round(v * 10) / 10.0); }

    // ---------- The road scan: a few chunks at a time, never making new land ----------

    private final class Scan {
        final CommandSender who;
        final Roads into;
        final int bx1, bz1, bx2, bz2, total, yMin, yMax, worldMax;
        final String startPrint; // the road settings it scans with
        final World world;
        final ArrayDeque<int[]> queue = new ArrayDeque<>();
        final AtomicInteger done = new AtomicInteger();
        final long started = System.currentTimeMillis();
        int inFlight, lastTenth;
        volatile boolean cancelled;
        boolean finishing;

        Scan(CommandSender who, Roads into, int bx1, int bz1, int bx2, int bz2) {
            this.who = who;
            this.into = into;
            this.bx1 = bx1;
            this.bz1 = bz1;
            this.bx2 = bx2;
            this.bz2 = bz2;
            world = cityWorld;
            yMin = yMin(world);
            yMax = yMax(world);
            worldMax = world.getMaxHeight();
            startPrint = fingerprint(world);
            for (int cx = bx1 >> 4; cx <= bx2 >> 4; cx++) for (int cz = bz1 >> 4; cz <= bz2 >> 4; cz++) queue.add(new int[] {cx, cz});
            total = queue.size();
            scanner.execute(() -> into.startBox(bx1, bz1, bx2, bz2));
        }

        String progress() { return done.get() + "/" + total; }

        /** Every tick: at most one new chunk request, at most 4 waiting, none while the server is behind. */
        void pump() {
            if (cancelled) return;
            int tenth = total == 0 ? 10 : done.get() * 10 / total;
            if (tenth > lastTenth && tenth < 10) { lastTenth = tenth; who.sendMessage("ROADS " + tenth * 10 + "% (" + progress() + ")"); }
            if (queue.isEmpty()) {
                if (inFlight == 0 && !finishing) {
                    finishing = true;
                    scanner.execute(this::finish);
                }
                return;
            }
            if (inFlight >= 4 || Bukkit.getAverageTickTime() > 40) return;
            int[] c = queue.poll();
            inFlight++;
            world.getChunkAtAsync(c[0], c[1], false, false, chunk -> {
                inFlight--;
                if (cancelled) return;
                if (chunk == null) { done.incrementAndGet(); return; } // never generated: open ground
                ChunkSnapshot s = chunk.getChunkSnapshot(false, false, false, false); // no light data
                scanner.execute(() -> {
                    into.scan(s, roadBlocks, solid, noStand, yMin, yMax, worldMax, bx1, bz1, bx2, bz2);
                    done.incrementAndGet();
                });
            });
        }

        /** On the scan thread: finish, save, then swap the new grid in on the main thread. */
        void finish() {
            if (cancelled) return;
            into.finish();
            into.fingerprint = fingerprint(world);
            // The file is written here but only put in place on the main thread while the scan still counts (review fix,
            // 2026-09-29: a cancel during this step replaced roads.bin anyway).
            File tmp;
            String saved;
            try { tmp = into.writeTmp(file()); saved = "saved roads.bin"; } catch (IOException e) { tmp = null; saved = "NOT saved (" + e.getMessage() + ")"; }
            File written = tmp;
            String savedNote = saved;
            if (!plugin.isEnabled()) { if (written != null) written.delete(); return; }
            Bukkit.getScheduler().runTask(plugin, () -> {
                if (scan != this) { if (written != null) written.delete(); return; }
                String note = savedNote;
                if (written != null) {
                    try { Roads.commit(written, file()); } catch (IOException e) { note = "NOT saved (" + e.getMessage() + ")"; }
                }
                scan = null;
                roads = into;
                roadsNote = "ok";
                cache.clear();
                for (Nav n : navs.values()) for (Target t : n.slots.values()) t.field = null;
                plugin.publishState();
                who.sendMessage("ROADS done in " + (System.currentTimeMillis() - started) / 1000 + " s: " + into.roads + " road, " + into.blocked + " blocked, "
                        + (into.w * into.h - into.roads - into.blocked) + " open cells (" + into.cellBlocks + "x" + into.cellBlocks + " blocks each); " + note);
                for (Player p : Bukkit.getOnlinePlayers()) plugin.redraw(p);
            });
        }
    }
}
