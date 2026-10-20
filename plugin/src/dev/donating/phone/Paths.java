package dev.donating.phone;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;
import org.bukkit.Bukkit;
import org.bukkit.Color;
import org.bukkit.FluidCollisionMode;
import org.bukkit.Location;
import org.bukkit.Particle;
import org.bukkit.World;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.util.Vector;

/**
 * GPS paths staff lay down in game (2026-10-14; the owner, playtesting the prison: "have a way to set paths that the GPS
 * follows (so then it doesnt go through walls)"). The road grid (Roads, FlowField) is one flat layer over one city: it
 * can't see floors, basements or a fence's gate, so in the prison world the GPS pointed straight through walls. A path
 * graph is per world: nodes (spots someone can stand on) and links (walk between two in a straight line). Saved in
 * paths.yml (upload it to Minehut with the plugin folder, or run the lines /dphone path dump prints).
 *
 * The way in a world with a graph (Gps asks route()): like the road FlowField, one Dijkstra outward from the target gives
 * every node its next node, so wherever the player joins the graph the rest is known. The player joins on the link (or
 * the lone node) that makes the whole trip shortest: the walk off the graph to it (a block of height counts
 * vertical-weight times, so a link on another floor isn't "near"; off the graph counts off-cost times) plus the way on.
 * Links the player can see are preferred (a ray from the eyes; at most 8 rays a pass), and the current one is kept until
 * another is hysteresis blocks better (no flicker). The target end works the same way (the link nearest the target that
 * it can see). No link within range of the player: the road grid or a straight line, as before.
 */
final class Paths {
    static final class Node {
        final int id;
        final String world;
        final double x, y, z;
        final String name;
        final TreeSet<Integer> links = new TreeSet<>();

        Node(int id, String world, double x, double y, double z, String name) {
            this.id = id;
            this.world = world;
            this.x = x;
            this.y = y;
            this.z = z;
            this.name = name == null ? "" : name;
        }
    }

    /** One world's graph as arrays (rebuilt when the graph changes): node i at (x[i], y[i], z[i]), links ea[e]-eb[e]. */
    static final class Graph {
        final int version, n;
        final int[] id;
        final double[] x, y, z;
        final int[][] adj;   // neighbour indexes
        final int[] ea, eb;  // links (indexes)
        final boolean[] lone; // a node with no links (joined as a point)

        Graph(int version, List<Node> nodes) {
            this.version = version;
            n = nodes.size();
            id = new int[n];
            x = new double[n];
            y = new double[n];
            z = new double[n];
            Map<Integer, Integer> at = new HashMap<>();
            for (int i = 0; i < n; i++) {
                Node d = nodes.get(i);
                id[i] = d.id;
                x[i] = d.x;
                y[i] = d.y;
                z[i] = d.z;
                at.put(d.id, i);
            }
            adj = new int[n][];
            lone = new boolean[n];
            List<int[]> edges = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                List<Integer> nb = new ArrayList<>();
                for (int l : nodes.get(i).links) {
                    Integer j = at.get(l);
                    if (j == null) continue;
                    nb.add(j);
                    if (i < j) edges.add(new int[] {i, j});
                }
                adj[i] = nb.stream().mapToInt(Integer::intValue).toArray();
                lone[i] = adj[i].length == 0;
            }
            ea = new int[edges.size()];
            eb = new int[edges.size()];
            for (int e = 0; e < edges.size(); e++) { ea[e] = edges.get(e)[0]; eb[e] = edges.get(e)[1]; }
        }

        double len(int i, int j) { return Math.sqrt(sq(x[i] - x[j]) + sq(y[i] - y[j]) + sq(z[i] - z[j])); }
    }

    /** The way to one target from every node (Dijkstra outward from it). next[i] = the node to go to, -1 = off to the target. */
    static final class Field {
        final int version;
        final double[][] pts;  // the target's spots it was made for
        final boolean losKnown; // every spot's chunk was loaded (its rays could be cast)
        final double[] dist;
        final int[] next;
        final double[][] exitPt; // where a node with next -1 leaves the graph
        final int[] exitSpot;
        final double[] edgeExitT, edgeExitCost; // per link: the best place on it to leave for the target (t along it, NaN: none)
        final int[] edgeExitSpot;

        Field(int version, double[][] pts, boolean losKnown, int n, int edges) {
            this.version = version;
            this.pts = pts;
            this.losKnown = losKnown;
            dist = new double[n];
            next = new int[n];
            exitPt = new double[n][];
            exitSpot = new int[n];
            edgeExitT = new double[edges];
            edgeExitCost = new double[edges];
            edgeExitSpot = new int[edges];
            Arrays.fill(dist, Double.POSITIVE_INFINITY);
            Arrays.fill(next, -2);
            Arrays.fill(edgeExitT, Double.NaN);
            Arrays.fill(edgeExitCost, Double.POSITIVE_INFINITY);
        }
    }

    /** Per target (Gps.Target keeps one): its field and the way in picked last (the hysteresis). */
    static final class Memo {
        Field field;
        String pick = "";
    }

    /** A way along the graph: the points after the player, the spot it ends at, the nodes it passes. */
    record Route(double[][] line, double[] spot, String pick, int[] via) {}

    private final PhonePlugin plugin;
    private final Map<Integer, Node> nodes = new TreeMap<>();
    private final Map<String, Graph> graphs = new HashMap<>();
    private final Map<String, Integer> lastAdded = new HashMap<>(); // per sender: the node "add" links the next one to
    private final Map<UUID, Boolean> showing = new HashMap<>();
    private int nextId = 1, version = 1;
    private boolean saveQueued;
    private int ticks;

    // Config (paths.*)
    private double range = 24, vWeight = 3, offCost = 1.5, hyst = 2, arriveHeight = 4, showRange = 40;

    Paths(PhonePlugin plugin) { this.plugin = plugin; }

    void configure(FileConfiguration c) {
        range = Math.max(4, c.getDouble("paths.range", 24));
        vWeight = Math.max(1, c.getDouble("paths.vertical-weight", 3));
        offCost = Math.max(1, c.getDouble("paths.off-cost", 1.5));
        hyst = Math.max(0, c.getDouble("paths.hysteresis", 2));
        arriveHeight = Math.max(1, c.getDouble("paths.arrive-height", 4));
        showRange = Math.max(8, c.getDouble("paths.show-range", 40));
        version++; // fields are rebuilt with the new numbers
    }

    double arriveHeight() { return arriveHeight; }

    private File file() { return new File(plugin.getDataFolder(), "paths.yml"); }

    // ---------- The graph ----------

    boolean has(World w) { return w != null && graph(w.getName()) != null; }

    /** The world's graph (null: none). */
    Graph graph(String world) {
        Graph g = graphs.get(world);
        if (g != null && g.version == version) return g;
        List<Node> list = new ArrayList<>();
        for (Node d : nodes.values()) if (d.world.equals(world)) list.add(d);
        if (list.isEmpty()) { graphs.remove(world); return null; }
        g = new Graph(version, list);
        graphs.put(world, g);
        return g;
    }

    private void changed() {
        version++;
        if (saveQueued || !plugin.isEnabled()) return;
        // At most one write a second (a dump of hundreds of addat lines is one save).
        saveQueued = true;
        Bukkit.getScheduler().runTaskLater(plugin, this::save, 20L);
    }

    void load() {
        nodes.clear();
        YamlConfiguration y = YamlConfiguration.loadConfiguration(file());
        nextId = Math.max(1, y.getInt("next-id", 1));
        ConfigurationSection s = y.getConfigurationSection("nodes");
        if (s != null) for (String k : s.getKeys(false)) {
            String[] v = String.valueOf(s.getString(k)).split("\\|", 5);
            try {
                int id = Integer.parseInt(k);
                nodes.put(id, new Node(id, v[0], Double.parseDouble(v[1]), Double.parseDouble(v[2]), Double.parseDouble(v[3]), v.length > 4 ? v[4] : ""));
                nextId = Math.max(nextId, id + 1);
            } catch (RuntimeException e) {
                plugin.getLogger().warning("paths.yml: bad node " + k + ": " + s.getString(k));
            }
        }
        for (String l : y.getStringList("links")) {
            String[] ab = l.split("-");
            try {
                Node a = nodes.get(Integer.parseInt(ab[0])), b = nodes.get(Integer.parseInt(ab[1]));
                if (a != null && b != null && a.world.equals(b.world)) { a.links.add(b.id); b.links.add(a.id); }
            } catch (RuntimeException e) {
                plugin.getLogger().warning("paths.yml: bad link " + l);
            }
        }
        version++;
        if (!nodes.isEmpty()) plugin.getLogger().info("GPS paths: " + nodes.size() + " nodes");
    }

    void save() {
        saveQueued = false;
        YamlConfiguration y = new YamlConfiguration();
        y.options().setHeader(List.of("GPS paths (/dphone path): nodes \"world|x|y|z|name\" by id, links \"a-b\". Made by the plugin; change them in game."));
        y.set("next-id", nextId);
        List<String> links = new ArrayList<>();
        for (Node d : nodes.values()) {
            y.set("nodes." + d.id, d.world + "|" + num(d.x) + "|" + num(d.y) + "|" + num(d.z) + "|" + d.name);
            for (int l : d.links) if (l > d.id) links.add(d.id + "-" + l);
        }
        y.set("links", links);
        try { y.save(file()); } catch (IOException e) { plugin.getLogger().warning("Can't save paths.yml: " + e.getMessage()); }
    }

    void shutdown() { if (saveQueued) save(); }

    // ---------- Routing (main thread: it casts rays) ----------

    /**
     * The way from feet (eyes for the rays) to the nearest of pts along the world's graph, or null when there's no
     * graph there or no link within range of the player (then the road grid or a straight line).
     */
    Route route(Memo m, double[][] pts, Location feet, Location eye) {
        World w = feet.getWorld();
        Graph g = graph(w.getName());
        if (g == null) return null;
        Field f = m.field;
        // A field made while the target's chunk was unloaded is made again once it loads (its rays can be cast then).
        if (f == null || f.version != g.version || f.pts != pts || (!f.losKnown && spotsLoaded(w, pts))) f = m.field = field(g, w, pts);
        double px = feet.getX(), py = feet.getY(), pz = feet.getZ();

        // Every way in: a link (the closest point on it), a lone node, or straight to a spot nearby.
        List<double[]> cands = new ArrayList<>(); // {score, kind (0 link, 1 node, 2 spot), index, t, via (0 a, 1 b, 2 the link's own exit), d}
        for (int e = 0; e < g.ea.length; e++) {
            int a = g.ea[e], b = g.eb[e];
            double t = closestT(px, py, pz, g.x[a], g.y[a], g.z[a], g.x[b], g.y[b], g.z[b]);
            double qx = lerp(g.x[a], g.x[b], t), qy = lerp(g.y[a], g.y[b], t), qz = lerp(g.z[a], g.z[b], t);
            double d = wdist(px, py, pz, qx, qy, qz);
            if (d > range) continue;
            double L = g.len(a, b);
            double va = t * L + f.dist[a], vb = (1 - t) * L + f.dist[b];
            double vo = Double.isNaN(f.edgeExitT[e]) ? Double.POSITIVE_INFINITY : Math.abs(t - f.edgeExitT[e]) * L + f.edgeExitCost[e];
            double best = Math.min(va, Math.min(vb, vo));
            if (Double.isInfinite(best)) continue;
            cands.add(new double[] {offCost * d + best, 0, e, t, best == vo ? 2 : best == va ? 0 : 1, d});
        }
        for (int i = 0; i < g.n; i++) {
            if (!g.lone[i] || Double.isInfinite(f.dist[i])) continue;
            double d = wdist(px, py, pz, g.x[i], g.y[i], g.z[i]);
            if (d <= range) cands.add(new double[] {offCost * d + f.dist[i], 1, i, 0, 0, d});
        }
        for (int s = 0; s < pts.length; s++) {
            double d = wdist(px, py, pz, pts[s][0], pts[s][1], pts[s][2]);
            if (d <= range) cands.add(new double[] {offCost * d, 2, s, 0, 0, d});
        }
        if (cands.isEmpty()) { m.pick = ""; return null; }
        cands.sort((u, v) -> Double.compare(u[0], v[0]));

        // The best one the player can see (at most 8 rays); none seen: the best link or node (never a spot through a wall).
        double[] pick = null, prev = null;
        int rays = 0;
        for (double[] c : cands) {
            if (key(c).equals(m.pick)) prev = c;
            if (pick != null || rays >= 8) continue;
            rays++;
            if (sees(w, eye, at(g, pts, c))) pick = c;
        }
        if (pick == null) for (double[] c : cands) if (c[1] != 2) { pick = c; break; }
        if (pick == null) { m.pick = ""; return null; }
        // Keep the way in from last time unless this one is clearly better (and the old one is still seen).
        if (prev != null && prev != pick && prev[0] <= pick[0] + hyst && sees(w, eye, at(g, pts, prev))) pick = prev;
        m.pick = key(pick);

        // The points from there on.
        List<double[]> line = new ArrayList<>();
        List<Integer> via = new ArrayList<>();
        int spot;
        double[] q = at(g, pts, pick);
        int kind = (int) pick[1], idx = (int) pick[2], u;
        if (kind == 2) {
            spot = idx;
        } else {
            if (pick[5] > 1.0) line.add(q); // standing on the link already: no point to walk to first
            if (kind == 0 && pick[4] == 2) {
                int e = idx;
                double t = f.edgeExitT[e];
                add(line, new double[] {lerp(g.x[g.ea[e]], g.x[g.eb[e]], t), lerp(g.y[g.ea[e]], g.y[g.eb[e]], t), lerp(g.z[g.ea[e]], g.z[g.eb[e]], t)});
                spot = f.edgeExitSpot[e];
                u = -1;
            } else {
                u = kind == 1 ? idx : pick[4] == 0 ? g.ea[idx] : g.eb[idx];
                spot = 0;
            }
            for (int guard = 0; u >= 0 && guard <= g.n; guard++) {
                add(line, new double[] {g.x[u], g.y[u], g.z[u]});
                via.add(g.id[u]);
                if (f.next[u] == -1) {
                    add(line, f.exitPt[u]);
                    spot = f.exitSpot[u];
                    break;
                }
                u = f.next[u];
            }
        }
        double[] sp = pts[spot];
        add(line, sp);
        return new Route(line.toArray(new double[0][]), sp, m.pick, via.stream().mapToInt(Integer::intValue).toArray());
    }

    private static String key(double[] c) { return (c[1] == 0 ? "e" : c[1] == 1 ? "n" : "s") + (int) c[2]; }

    /** A candidate's point (where the player walks to first). */
    private static double[] at(Graph g, double[][] pts, double[] c) {
        int i = (int) c[2];
        if (c[1] == 2) return pts[i];
        if (c[1] == 1) return new double[] {g.x[i], g.y[i], g.z[i]};
        int a = g.ea[i], b = g.eb[i];
        double t = c[3];
        return new double[] {lerp(g.x[a], g.x[b], t), lerp(g.y[a], g.y[b], t), lerp(g.z[a], g.z[b], t)};
    }

    /** Adds p unless it's (nearly) the last point already. */
    private static void add(List<double[]> line, double[] p) {
        if (!line.isEmpty()) {
            double[] l = line.get(line.size() - 1);
            if (sq(l[0] - p[0]) + sq(l[1] - p[1]) + sq(l[2] - p[2]) < 0.25) return;
        }
        line.add(p);
    }

    private static boolean spotsLoaded(World w, double[][] pts) {
        for (double[] q : pts) if (!w.isChunkLoaded((int) Math.floor(q[0]) >> 4, (int) Math.floor(q[2]) >> 4)) return false;
        return true;
    }

    /** Dijkstra outward from the target: where each spot can be reached from the graph (the links near it it can see). */
    private Field field(Graph g, World w, double[][] pts) {
        boolean known = spotsLoaded(w, pts);
        Field f = new Field(g.version, pts, known, g.n, g.ea.length);
        for (int s = 0; s < pts.length; s++) {
            double[] q = pts[s];
            boolean loaded = w.isChunkLoaded((int) Math.floor(q[0]) >> 4, (int) Math.floor(q[2]) >> 4);
            Location from = new Location(w, q[0], q[1] + 1.2, q[2]);
            // {kind (0 link, 1 node), index, t, d, seen}
            List<double[]> seeds = new ArrayList<>();
            for (int e = 0; e < g.ea.length; e++) {
                int a = g.ea[e], b = g.eb[e];
                double t = closestT(q[0], q[1], q[2], g.x[a], g.y[a], g.z[a], g.x[b], g.y[b], g.z[b]);
                double d = wdist(q[0], q[1], q[2], lerp(g.x[a], g.x[b], t), lerp(g.y[a], g.y[b], t), lerp(g.z[a], g.z[b], t));
                if (d <= range) seeds.add(new double[] {0, e, t, d, 0});
            }
            for (int i = 0; i < g.n; i++) {
                if (!g.lone[i]) continue;
                double d = wdist(q[0], q[1], q[2], g.x[i], g.y[i], g.z[i]);
                if (d <= range) seeds.add(new double[] {1, i, 0, d, 0});
            }
            boolean anySeen = false;
            if (loaded) for (double[] sd : seeds) {
                double[] r = sd[0] == 1 ? new double[] {g.x[(int) sd[1]], g.y[(int) sd[1]], g.z[(int) sd[1]]} : at(g, pts, new double[] {0, 0, sd[1], sd[2]});
                if (sees(w, from, r)) { sd[4] = 1; anySeen = true; }
            }
            if (seeds.isEmpty()) {
                // Nothing near the target: from the graph's nearest node on to it in a straight line.
                int best = 0;
                for (int i = 1; i < g.n; i++) if (wdist(q[0], q[1], q[2], g.x[i], g.y[i], g.z[i]) < wdist(q[0], q[1], q[2], g.x[best], g.y[best], g.z[best])) best = i;
                seeds.add(new double[] {1, best, 0, wdist(q[0], q[1], q[2], g.x[best], g.y[best], g.z[best]), 1});
                anySeen = true;
            }
            for (double[] sd : seeds) {
                if (anySeen && sd[4] == 0) continue; // links it can see beat links behind a wall
                double c = offCost * sd[3];
                if (sd[0] == 1) {
                    int i = (int) sd[1];
                    seed(f, i, c, new double[] {g.x[i], g.y[i], g.z[i]}, s);
                } else {
                    int e = (int) sd[1], a = g.ea[e], b = g.eb[e];
                    double t = sd[2], L = g.len(a, b);
                    double[] r = {lerp(g.x[a], g.x[b], t), lerp(g.y[a], g.y[b], t), lerp(g.z[a], g.z[b], t)};
                    seed(f, a, t * L + c, r, s);
                    seed(f, b, (1 - t) * L + c, r, s);
                    if (c < f.edgeExitCost[e]) { f.edgeExitCost[e] = c; f.edgeExitT[e] = t; f.edgeExitSpot[e] = s; }
                }
            }
        }
        PriorityQueue<double[]> heap = new PriorityQueue<>((u, v) -> Double.compare(u[0], v[0]));
        for (int i = 0; i < g.n; i++) if (f.next[i] == -1) heap.add(new double[] {f.dist[i], i});
        boolean[] done = new boolean[g.n];
        while (!heap.isEmpty()) {
            int u = (int) heap.poll()[1];
            if (done[u]) continue;
            done[u] = true;
            for (int v : g.adj[u]) {
                double nd = f.dist[u] + g.len(u, v);
                if (nd < f.dist[v]) {
                    f.dist[v] = nd;
                    f.next[v] = u;
                    heap.add(new double[] {nd, v});
                }
            }
        }
        return f;
    }

    private static void seed(Field f, int i, double cost, double[] exit, int spot) {
        if (cost >= f.dist[i]) return;
        f.dist[i] = cost;
        f.next[i] = -1;
        f.exitPt[i] = exit;
        f.exitSpot[i] = spot;
    }

    /** A ray from an eye to a standing spot's eye height: nothing solid between (open doors and plants let it through). */
    private static boolean sees(World w, Location eye, double[] p) {
        Vector d = new Vector(p[0] - eye.getX(), p[1] + 1.2 - eye.getY(), p[2] - eye.getZ());
        double len = d.length();
        if (len < 0.5) return true;
        if (!w.isChunkLoaded((int) Math.floor(p[0]) >> 4, (int) Math.floor(p[2]) >> 4)) return false;
        return w.rayTraceBlocks(eye, d.multiply(1 / len), len, FluidCollisionMode.NEVER, true) == null;
    }

    /** Distance with height counted vertical-weight times (a spot on another floor is far). */
    private double wdist(double ax, double ay, double az, double bx, double by, double bz) {
        return Math.sqrt(sq(ax - bx) + sq((ay - by) * vWeight) + sq(az - bz));
    }

    /** The point on a-b nearest p (in the same weighted space), as t along it (0 at a, 1 at b). */
    private double closestT(double px, double py, double pz, double ax, double ay, double az, double bx, double by, double bz) {
        double vx = bx - ax, vy = (by - ay) * vWeight, vz = bz - az, L2 = vx * vx + vy * vy + vz * vz;
        if (L2 < 1e-9) return 0;
        return Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vWeight * vy + (pz - az) * vz) / L2));
    }

    private static double lerp(double a, double b, double t) { return a + (b - a) * t; }
    private static double sq(double v) { return v * v; }
    static String num(double v) { return String.valueOf(Math.round(v * 100) / 100.0); }

    // ---------- Staff view: /dphone path show ----------

    void tick() {
        if (++ticks % 10 != 0 || showing.isEmpty()) return;
        Particle.DustOptions node = new Particle.DustOptions(Color.LIME, 1.6f), lone = new Particle.DustOptions(Color.RED, 1.6f), link = new Particle.DustOptions(Color.YELLOW, 0.9f);
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (!showing.getOrDefault(p.getUniqueId(), false)) continue;
            Graph g = graph(p.getWorld().getName());
            if (g == null) continue;
            Location l = p.getLocation();
            double r2 = showRange * showRange;
            for (int i = 0; i < g.n; i++) {
                if (sq(g.x[i] - l.getX()) + sq(g.y[i] - l.getY()) + sq(g.z[i] - l.getZ()) > r2) continue;
                p.spawnParticle(Particle.DUST, g.x[i], g.y[i] + 0.4, g.z[i], 3, 0.05, 0.2, 0.05, 0, g.lone[i] ? lone : node, true);
            }
            int budget = 400;
            for (int e = 0; e < g.ea.length && budget > 0; e++) {
                int a = g.ea[e], b = g.eb[e];
                double L = g.len(a, b);
                for (double s = 0.5; s < L && budget > 0; s += 1) {
                    double t = s / L, x = lerp(g.x[a], g.x[b], t), y = lerp(g.y[a], g.y[b], t) + 0.3, z = lerp(g.z[a], g.z[b], t);
                    if (sq(x - l.getX()) + sq(y - l.getY()) + sq(z - l.getZ()) > r2) continue;
                    p.spawnParticle(Particle.DUST, x, y, z, 1, 0, 0, 0, 0, link, true);
                    budget--;
                }
            }
        }
    }

    void quit(Player p) { showing.remove(p.getUniqueId()); }

    // ---------- /dphone path ----------

    /** Tab completion for /dphone path (args as /dphone gets them; me = the player asking, or null). Node ids for link,
     *  unlink and remove are the 20 nearest to the player in their world (any 20 for the console); addat gets the
     *  worlds, then the player's own block coordinates, then id=, nolink. */
    List<String> complete(String[] a, Player me) {
        if (a.length == 2) return List.of("add", "addat", "link", "unlink", "remove", "list", "show", "near", "clear", "dump", "info");
        String sub = a[1].toLowerCase();
        if (a.length == 3 && (sub.equals("addat") || sub.equals("clear") || sub.equals("list") || sub.equals("dump"))) {
            List<String> w = new ArrayList<>();
            for (World x : Bukkit.getWorlds()) w.add(x.getName());
            return w;
        }
        if (a.length == 3 && sub.equals("show")) return List.of("on", "off");
        if (a.length == 3 && sub.equals("add")) return List.of("--nolink");
        if (a.length == 4 && sub.equals("clear")) return List.of("confirm");
        if ((a.length == 3 && sub.equals("remove")) || ((a.length == 3 || a.length == 4) && (sub.equals("link") || sub.equals("unlink")))) {
            List<Node> list = new ArrayList<>();
            for (Node d : nodes.values()) if (me == null || d.world.equals(me.getWorld().getName())) list.add(d);
            if (me != null) {
                Location l = me.getLocation();
                list.sort(java.util.Comparator.comparingDouble(d -> (d.x - l.getX()) * (d.x - l.getX()) + (d.y - l.getY()) * (d.y - l.getY()) + (d.z - l.getZ()) * (d.z - l.getZ())));
            }
            List<String> out = new ArrayList<>();
            for (Node d : list) { if (out.size() >= 20) break; out.add(String.valueOf(d.id)); }
            return out;
        }
        if (sub.equals("addat") && me != null && a.length >= 4 && a.length <= 6) {
            Location l = me.getLocation();
            return List.of(String.valueOf(a.length == 4 ? l.getBlockX() : a.length == 5 ? l.getBlockY() : l.getBlockZ()));
        }
        if (sub.equals("addat") && a.length >= 7) return List.of("id=", "nolink");
        return List.of();
    }

    boolean command(CommandSender who, String[] a) {
        String sub = a.length < 2 ? "info" : a[1].toLowerCase();
        String me = who instanceof Player p ? p.getUniqueId().toString() : "console";
        switch (sub) {
            case "add" -> {
                if (!(who instanceof Player p)) { who.sendMessage("PATH add is for players (console: addat <world> <x> <y> <z>)"); return true; }
                List<String> rest = new ArrayList<>(Arrays.asList(a).subList(2, a.length));
                boolean noLink = rest.remove("--nolink") | rest.remove("nolink");
                Location l = p.getLocation();
                // Where the feet are, in the middle of the block (a node on a slab or a stair keeps its height).
                add(who, me, l.getWorld().getName(), l.getBlockX() + 0.5, Math.round(l.getY() * 100) / 100.0, l.getBlockZ() + 0.5, 0, noLink, String.join(" ", rest));
            }
            case "addat" -> {
                if (a.length < 6) { who.sendMessage("PATH usage: /dphone path addat <world> <x> <y> <z> [id=<n>] [nolink] [name...]"); return true; }
                if (Bukkit.getWorld(a[2]) == null) { who.sendMessage("PATH no world " + a[2]); return true; }
                double x, y, z;
                try { x = Double.parseDouble(a[3]); y = Double.parseDouble(a[4]); z = Double.parseDouble(a[5]); } catch (NumberFormatException e) { who.sendMessage("PATH x y z are numbers"); return true; }
                int id = 0;
                boolean noLink = false;
                List<String> name = new ArrayList<>();
                for (int i = 6; i < a.length; i++) {
                    if (a[i].startsWith("id=")) { try { id = Integer.parseInt(a[i].substring(3)); } catch (NumberFormatException e) { who.sendMessage("PATH bad " + a[i]); return true; } }
                    else if (a[i].equalsIgnoreCase("nolink") || a[i].equalsIgnoreCase("--nolink")) noLink = true;
                    else name.add(a[i]);
                }
                add(who, me, a[2], x, y, z, id, noLink, String.join(" ", name));
            }
            case "link", "unlink" -> {
                Node na = a.length > 3 ? node(a[2]) : null, nb = a.length > 3 ? node(a[3]) : null;
                if (na == null || nb == null || na == nb) { who.sendMessage("PATH usage: /dphone path " + sub + " <a> <b> (two node ids)"); return true; }
                if (!na.world.equals(nb.world)) { who.sendMessage("PATH #" + na.id + " and #" + nb.id + " are in different worlds"); return true; }
                if (sub.equals("link")) { na.links.add(nb.id); nb.links.add(na.id); }
                else { na.links.remove(nb.id); nb.links.remove(na.id); }
                changed();
                who.sendMessage("PATH " + (sub.equals("link") ? "linked #" : "unlinked #") + na.id + " - #" + nb.id + " (" + num(dist(na, nb)) + " blocks)");
            }
            case "remove" -> {
                Node d = a.length > 2 ? node(a[2]) : null;
                if (d == null) { who.sendMessage("PATH usage: /dphone path remove <id>"); return true; }
                for (int l : d.links) { Node o = nodes.get(l); if (o != null) o.links.remove(d.id); }
                nodes.remove(d.id);
                lastAdded.values().removeIf(v -> v == d.id);
                changed();
                who.sendMessage("PATH removed #" + d.id + " (" + d.links.size() + " links with it)");
            }
            case "list" -> {
                String world = a.length > 2 ? a[2] : who instanceof Player p ? p.getWorld().getName() : null;
                List<String> out = new ArrayList<>();
                int links = 0;
                for (Node d : nodes.values()) {
                    if (world != null && !d.world.equals(world)) continue;
                    links += d.links.size();
                    out.add("#" + d.id + "@" + num(d.x) + "," + num(d.y) + "," + num(d.z) + (d.name.isEmpty() ? "" : "(" + d.name + ")") + "->" + join(d.links));
                }
                who.sendMessage("PATH " + (world == null ? "all worlds" : world) + ": " + out.size() + " nodes, " + links / 2 + " links: " + String.join(" ", out));
            }
            case "show" -> {
                if (!(who instanceof Player p)) { who.sendMessage("PATH show is for players"); return true; }
                boolean on = a.length > 2 ? a[2].equalsIgnoreCase("on") : !showing.getOrDefault(p.getUniqueId(), false);
                showing.put(p.getUniqueId(), on);
                who.sendMessage("PATH show " + (on ? "on: nodes green (red: no links), links yellow, within " + (int) showRange + " blocks" : "off"));
            }
            case "near" -> {
                if (!(who instanceof Player p)) { who.sendMessage("PATH near is for players"); return true; }
                Location l = p.getLocation();
                List<Node> list = new ArrayList<>();
                for (Node d : nodes.values()) if (d.world.equals(l.getWorld().getName())) list.add(d);
                list.sort((u, v) -> Double.compare(wdist(u.x, u.y, u.z, l.getX(), l.getY(), l.getZ()), wdist(v.x, v.y, v.z, l.getX(), l.getY(), l.getZ())));
                List<String> out = new ArrayList<>();
                for (Node d : list.subList(0, Math.min(6, list.size()))) {
                    out.add("#" + d.id + " " + num(Math.sqrt(sq(d.x - l.getX()) + sq(d.y - l.getY()) + sq(d.z - l.getZ()))) + "m"
                            + (sees(l.getWorld(), p.getEyeLocation(), new double[] {d.x, d.y, d.z}) ? " seen" : " hidden") + (d.name.isEmpty() ? "" : " " + d.name) + " ->" + join(d.links));
                }
                who.sendMessage("PATH near: " + (out.isEmpty() ? "no nodes in this world" : String.join(" | ", out)));
            }
            case "clear" -> {
                if (a.length < 4 || !a[3].equalsIgnoreCase("confirm")) { who.sendMessage("PATH usage: /dphone path clear <world> confirm"); return true; }
                int before = nodes.size();
                nodes.values().removeIf(d -> d.world.equals(a[2]));
                changed();
                who.sendMessage("PATH cleared " + a[2] + ": " + (before - nodes.size()) + " nodes");
            }
            case "dump" -> {
                String world = a.length > 2 ? a[2] : who instanceof Player p ? p.getWorld().getName() : null;
                List<String> lines = dump(world);
                for (String l : lines) who.sendMessage(l);
                File out = new File(plugin.getDataFolder(), "paths-dump.txt");
                try {
                    Files.write(out.toPath(), lines, StandardCharsets.UTF_8);
                    who.sendMessage("PATH " + (lines.size() - 1) + " lines, also in plugins/DonatingPhone/paths-dump.txt");
                } catch (IOException e) {
                    who.sendMessage("PATH can't write paths-dump.txt: " + e.getMessage());
                }
            }
            default -> {
                Map<String, int[]> per = new TreeMap<>();
                for (Node d : nodes.values()) { int[] c = per.computeIfAbsent(d.world, k -> new int[2]); c[0]++; c[1] += d.links.size(); }
                List<String> out = new ArrayList<>();
                for (Map.Entry<String, int[]> e : per.entrySet()) out.add(e.getKey() + "=" + e.getValue()[0] + "n/" + e.getValue()[1] / 2 + "l");
                who.sendMessage("PATH " + (out.isEmpty() ? "no paths" : String.join(" ", out)) + " next-id=" + nextId + " range=" + num(range) + " vweight=" + num(vWeight)
                        + " offcost=" + num(offCost) + " | /dphone path add [name] [--nolink] | addat <world> <x> <y> <z> [id=<n>] [nolink] [name] | link|unlink <a> <b> | remove <id> | list [world] | show [on|off] | near | clear <world> confirm | dump [world]");
            }
        }
        return true;
    }

    private void add(CommandSender who, String me, String world, double x, double y, double z, int id, boolean noLink, String name) {
        if (id > 0 && nodes.containsKey(id)) { who.sendMessage("PATH #" + id + " exists already (/dphone path remove " + id + " first)"); return; }
        if (name.contains("|")) { who.sendMessage("PATH a name can't have |"); return; }
        int nid = id > 0 ? id : nextId;
        nextId = Math.max(nextId, nid + 1);
        Node d = new Node(nid, world, x, y, z, name);
        nodes.put(nid, d);
        String linked = "";
        Integer last = lastAdded.get(me);
        Node prev = last == null ? null : nodes.get(last);
        if (!noLink && prev != null && prev.world.equals(world)) {
            d.links.add(prev.id);
            prev.links.add(d.id);
            double len = dist(prev, d);
            linked = " linked to #" + prev.id + " (" + num(len) + " blocks" + (len > 48 ? ": a long link, add one between if it bends" : "") + ")";
        }
        lastAdded.put(me, nid);
        changed();
        who.sendMessage("PATH added #" + nid + " at " + world + " " + num(x) + " " + num(y) + " " + num(z) + linked);
    }

    /** The lines that make this world's graph again (or every world's): clear, every node with its id, then the links. */
    List<String> dump(String world) {
        List<String> out = new ArrayList<>();
        TreeSet<String> worlds = new TreeSet<>();
        for (Node d : nodes.values()) if (world == null || d.world.equals(world)) worlds.add(d.world);
        for (String w : worlds) out.add("dphone path clear " + w + " confirm");
        for (Node d : nodes.values()) if (worlds.contains(d.world)) out.add("dphone path addat " + d.world + " " + num(d.x) + " " + num(d.y) + " " + num(d.z) + " id=" + d.id + " nolink" + (d.name.isEmpty() ? "" : " " + d.name));
        for (Node d : nodes.values()) if (worlds.contains(d.world)) for (int l : d.links) if (l > d.id) out.add("dphone path link " + d.id + " " + l);
        out.add(0, "# GPS paths " + String.join(",", worlds) + ": " + (out.size() - worlds.size()) + " lines (run them in order: /dphone path dump)");
        return out;
    }

    private Node node(String s) {
        try { return nodes.get(Integer.parseInt(s.replace("#", ""))); } catch (NumberFormatException e) { return null; }
    }

    private static double dist(Node a, Node b) { return Math.sqrt(sq(a.x - b.x) + sq(a.y - b.y) + sq(a.z - b.z)); }

    private static String join(TreeSet<Integer> s) {
        StringBuilder b = new StringBuilder();
        for (int i : s) b.append(b.length() == 0 ? "" : ",").append(i);
        return b.length() == 0 ? "-" : b.toString();
    }
}
