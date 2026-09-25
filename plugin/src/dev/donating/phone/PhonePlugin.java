package dev.donating.phone;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import io.papermc.paper.entity.LookAnchor;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import java.io.File;
import java.io.IOException;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.MapMeta;
import org.bukkit.map.MapCanvas;
import org.bukkit.map.MapCursor;
import org.bukkit.map.MapCursorCollection;
import org.bukkit.map.MapRenderer;
import org.bukkit.map.MapView;
import org.bukkit.map.MinecraftFont;
import org.bukkit.metadata.FixedMetadataValue;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * Draws the phone's screen. Skript owns every rule; this plugin only reads two scoreboard tags
 * (passive-tag, open-tag) and tells Skript each player's phone map id (metadata "donating_phone_map").
 *
 * Picture source: the city, one locked map or a grid of locked maps of the same scale (config
 * city-maps), read once into one big image with its banner labels.
 * Held phone: north-up GPS centered on you (zoomed in). Open phone (open-tag): the whole city, shrunk
 * to fit, with a cursor you move by turning your head; a passive player's name shows while the cursor
 * is on their arrow.
 * Players drawn: you (white arrow) and players with passive-tag (green arrow). Nobody else.
 *
 * Every online player gets their own map id from a small pool. Paper marks a map's pixels dirty for
 * EVERY player carrying that map id, so a shared id would re-send each player's scrolling to everyone.
 */
public final class PhonePlugin extends JavaPlugin implements Listener {
    static final String META = "donating_phone_map";
    static final byte STRIP = (byte) 119; // near-black (map color BLACK, darkest shade)
    static final byte WHITE = (byte) 34;
    static final byte BLACK = (byte) 119;
    // Small arrows for the zoomed-out big map. The resource pack redraws these two (unused) icons as a
    // smaller white and green arrow (pack\assets\minecraft\textures\map\decorations).
    static final MapCursor.Type SMALL_SELF = MapCursor.Type.JUNGLE_TEMPLE;
    static final MapCursor.Type SMALL_PASSIVE = MapCursor.Type.SWAMP_HUT;
    // Big-map cursor: white plus, black outline (offsets from its center).
    static final int[][] CURSOR_WHITE = {{0, 0}, {-1, 0}, {1, 0}, {-2, 0}, {2, 0}, {0, -1}, {0, 1}, {0, -2}, {0, 2}};
    static final int[][] CURSOR_BLACK = {{-3, 0}, {3, 0}, {0, -3}, {0, 3}, {-1, -1}, {1, -1}, {-1, 1}, {1, 1}};

    private int zoom, step, openPitch, hoverRadius;
    private double cursorSpeed;
    private boolean smallArrows;
    private String passiveTag, openTag, hint;
    private String cityDesc = "none";

    // The city: tiles[row][col] (rows north to south, columns west to east), all the same scale.
    private MapView[][] tiles;
    private World world;
    private int bpp;          // blocks per city pixel
    private double x0, z0;    // world position of the image's top-left corner
    private int imgW, imgH;
    private byte[] img;       // imgW x imgH city pixels, read on the first render
    private final List<Poi> pois = new ArrayList<>();

    private final List<MapView> pool = new ArrayList<>();
    private final Map<UUID, MapView> assigned = new HashMap<>();
    private final Map<UUID, State> states = new HashMap<>();
    private final Renderer renderer = new Renderer();

    /** A banner label on the city map, in image pixels. */
    private record Poi(double ix, double iz, byte dir, MapCursor.Type type, Component caption) {}

    private static final class State {
        double cx = Double.NaN, cz;      // held-view center in image pixels
        long drawn = Long.MIN_VALUE;     // which view the canvas shows now
        int viewId = -1;
        int seen = 0;                    // holding (1) + open (2), last value the watcher saw
        MapCanvas canvas;                // this player's canvas (the watcher draws the cursor on it)
        final byte[] base = new byte[128 * 128]; // the current view without the cursor
        boolean baseOpen;                // base holds the big map
        int curX = -1, curY = -1;        // where the cursor is drawn now (-1 = not drawn)
        float yaw0, pitch0;              // head rotation that puts the cursor in the middle
        boolean anchored;                // yaw0/pitch0 are set for this opening
        int settle;                      // ticks left to wait for the camera tilt to arrive
        boolean tilted;                  // the client reported the tilted camera
    }

    @Override
    public void onEnable() {
        saveDefaultConfig();
        load();
        getServer().getPluginManager().registerEvents(this, this);
        getServer().getScheduler().runTaskTimer(this, this::watch, 1L, 1L);
        for (Player p : Bukkit.getOnlinePlayers()) assign(p);
    }

    private void load() {
        reloadConfig();
        FileConfiguration c = getConfig();
        zoom = Math.max(1, c.getInt("zoom", 2));
        step = Math.max(1, c.getInt("follow-step", 4));
        openPitch = c.getInt("open-pitch", 70);
        cursorSpeed = Math.max(0.5, c.getDouble("cursor-speed", 3.0));
        hoverRadius = Math.max(1, c.getInt("hover-radius", 6));
        smallArrows = c.getBoolean("small-arrows", true);
        passiveTag = c.getString("passive-tag", "donating_passive");
        openTag = c.getString("open-tag", "donating_phone_open");
        hint = c.getString("hint", "R-click: map  F: apps");
        if (!MinecraftFont.Font.isValid(hint)) hint = "";
        img = null;
        pois.clear();
        for (State s : states.values()) s.drawn = Long.MIN_VALUE; // redraw everyone
        loadCity(c);

        World poolWorld = world != null ? world : Bukkit.getWorlds().get(0);
        List<Integer> cityIds = new ArrayList<>();
        if (tiles != null) for (MapView[] row : tiles) for (MapView t : row) cityIds.add(t.getId());
        // The pool lives in pool.yml, so the plugin never rewrites the owner's config.yml.
        File poolFile = new File(getDataFolder(), "pool.yml");
        YamlConfiguration saved = YamlConfiguration.loadConfiguration(poolFile);
        List<Integer> ids = new ArrayList<>();
        for (int id : saved.getIntegerList("pool")) if (!cityIds.contains(id) && !ids.contains(id) && Bukkit.getMap(id) != null) ids.add(id);
        while (ids.size() < Math.max(1, c.getInt("pool-size", 16))) ids.add(Bukkit.createMap(poolWorld).getId());
        saved.set("pool", ids);
        saved.options().setHeader(List.of("Phone map ids, one per online player. Made by the plugin; don't edit."));
        try { saved.save(poolFile); } catch (IOException e) { getLogger().warning("Can't save pool.yml: " + e.getMessage()); }
        pool.clear();
        for (int id : ids) {
            MapView v = Bukkit.getMap(id);
            v.setLocked(true);               // vanilla never paints terrain into it
            v.setTrackingPosition(false);    // vanilla adds no player arrows
            for (MapRenderer r : v.getRenderers()) if (r != renderer) v.removeRenderer(r);
            if (!v.getRenderers().contains(renderer)) v.addRenderer(renderer);
            pool.add(v);
        }
        getLogger().info("Phone maps " + ids + ", city " + cityDesc);
    }

    /** city-maps: rows of map ids (north to south), each row west to east. Old configs: city-map: <id>. */
    private void loadCity(FileConfiguration c) {
        tiles = null;
        world = null;
        List<List<Integer>> rows = new ArrayList<>();
        for (Object row : c.getList("city-maps", List.of())) {
            List<Integer> ids = new ArrayList<>();
            if (row instanceof List<?> list) { for (Object o : list) if (o instanceof Number n) ids.add(n.intValue()); }
            else if (row instanceof Number n) ids.add(n.intValue());
            if (!ids.isEmpty()) rows.add(ids);
        }
        if (rows.isEmpty() && c.isInt("city-map")) rows.add(List.of(c.getInt("city-map")));
        cityDesc = rows.toString();
        if (rows.isEmpty()) { getLogger().warning("No city-maps set: phones stay blank."); return; }
        int cols = rows.get(0).size();
        MapView[][] t = new MapView[rows.size()][cols];
        for (int r = 0; r < rows.size(); r++) {
            if (rows.get(r).size() != cols) { getLogger().warning("city-maps: every row needs " + cols + " maps: phones stay blank."); return; }
            for (int col = 0; col < cols; col++) {
                MapView v = Bukkit.getMap(rows.get(r).get(col));
                if (v == null) { getLogger().warning("city map " + rows.get(r).get(col) + " has no map file: phones stay blank."); return; }
                t[r][col] = v;
            }
        }
        MapView first = t[0][0];
        int scale = first.getScale().getValue();
        int span = 128 << scale;
        for (int r = 0; r < t.length; r++) for (int col = 0; col < cols; col++) {
            MapView v = t[r][col];
            if (v.getScale().getValue() != scale || v.getWorld() != first.getWorld()
                    || v.getCenterX() != first.getCenterX() + col * span || v.getCenterZ() != first.getCenterZ() + r * span) {
                getLogger().warning("city map " + v.getId() + " isn't the same scale/world as map " + first.getId()
                        + " or doesn't sit at row " + r + ", column " + col + " next to it: phones stay blank.");
                return;
            }
        }
        tiles = t;
        world = first.getWorld();
        bpp = 1 << scale;
        x0 = first.getCenterX() - 64.0 * bpp;
        z0 = first.getCenterZ() - 64.0 * bpp;
        imgW = 128 * cols;
        imgH = 128 * t.length;
        cityDesc += " (" + (imgW * bpp) + "x" + (imgH * bpp) + " blocks)";
    }

    // ---------- Pool: one map id per online player (Skript reads the metadata) ----------

    private void assign(Player p) {
        MapView pick = pool.get(0); // pool full: share one (still correct, just more traffic)
        for (MapView v : pool) if (!assigned.containsValue(v)) { pick = v; break; }
        assigned.put(p.getUniqueId(), pick);
        states.put(p.getUniqueId(), new State());
        p.setMetadata(META, new FixedMetadataValue(this, pick.getId()));
    }

    @EventHandler(priority = EventPriority.LOWEST) // before Skript's join handlers build the phone
    public void onJoin(PlayerJoinEvent e) { assign(e.getPlayer()); }

    /** Rotation from the client: notes when the camera tilt of a just-opened big map has arrived. */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onMove(PlayerMoveEvent e) {
        State s = states.get(e.getPlayer().getUniqueId());
        if (s != null && s.settle > 0 && !s.tilted && Math.abs(e.getTo().getPitch() - openPitch) <= 2) s.tilted = true;
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        UUID id = e.getPlayer().getUniqueId();
        assigned.remove(id);
        states.remove(id);
        e.getPlayer().removeMetadata(META, this);
    }

    /** True when the player holds this phone map in the main hand (not some other map). */
    private static boolean holds(Player p, MapView v) {
        ItemStack item = p.getInventory().getItemInMainHand();
        return item.getType() == Material.FILLED_MAP && item.getItemMeta() instanceof MapMeta m
                && m.hasMapId() && m.getMapId() == v.getId();
    }

    /**
     * Every tick: sends the whole map right away when a player takes the phone out or opens/closes it,
     * and moves the big map's cursor with the player's head (pixels can go out every tick; icons and
     * names only 4 times a second).
     */
    private void watch() {
        for (Player p : Bukkit.getOnlinePlayers()) {
            State s = states.get(p.getUniqueId());
            MapView v = assigned.get(p.getUniqueId());
            if (s == null || v == null) continue;
            boolean holding = holds(p, v);
            boolean open = p.getScoreboardTags().contains(openTag);
            int now = (holding ? 1 : 0) | (open ? 2 : 0);
            if (now != s.seen && holding) {
                if (open && (s.seen & 2) == 0) {
                    // Just opened: tilt the camera (a two-handed map only faces the camera at about 50
                    // degrees down), and center the cursor once the tilt has arrived.
                    s.anchored = false;
                    s.tilted = false;
                    s.settle = 0;
                    if (openPitch > 0) { lookDown(p); s.settle = 20; }
                }
                p.sendMap(v);
            }
            s.seen = now;
            if (s.settle > 0) s.settle--;
            if (open && holding) moveCursor(p, s);
        }
    }

    private void moveCursor(Player p, State s) {
        if (s.canvas == null || !s.baseOpen) return;
        float yaw = p.getYaw(), pitch = p.getPitch();
        if (!s.anchored) {
            // Wait until the client says its camera reached the tilt (1 second at most). lookAt also
            // sets the server's copy of the rotation at once, so getPitch() alone can't tell.
            if (s.settle > 0 && !s.tilted) { drawCursor(s, 64, 64); return; }
            s.anchored = true;
            s.yaw0 = yaw;
            s.pitch0 = pitch;
        }
        double dx = wrap(yaw - s.yaw0) * cursorSpeed, dy = (pitch - s.pitch0) * cursorSpeed;
        // Like a mouse pointer at the screen edge: keep moving the head and the cursor stays at the
        // edge; turning back moves it again right away.
        if (dx > 62) { s.yaw0 += (float) ((dx - 62) / cursorSpeed); dx = 62; }
        if (dx < -62) { s.yaw0 += (float) ((dx + 62) / cursorSpeed); dx = -62; }
        if (dy > 62) { s.pitch0 += (float) ((dy - 62) / cursorSpeed); dy = 62; }
        if (dy < -62) { s.pitch0 += (float) ((dy + 62) / cursorSpeed); dy = -62; }
        drawCursor(s, 64 + (int) Math.round(dx), 64 + (int) Math.round(dy));
    }

    private static double wrap(double deg) { return ((deg % 360) + 540) % 360 - 180; }

    /** Moves the cursor's pixels on the canvas (restoring what was under it from the base view). */
    private void drawCursor(State s, int x, int y) {
        if (x == s.curX && y == s.curY) return;
        if (s.curX >= 0) {
            for (int[] o : CURSOR_WHITE) restore(s, s.curX + o[0], s.curY + o[1]);
            for (int[] o : CURSOR_BLACK) restore(s, s.curX + o[0], s.curY + o[1]);
        }
        for (int[] o : CURSOR_BLACK) pixel(s.canvas, x + o[0], y + o[1], BLACK);
        for (int[] o : CURSOR_WHITE) pixel(s.canvas, x + o[0], y + o[1], WHITE);
        s.curX = x;
        s.curY = y;
    }

    private static void restore(State s, int x, int y) {
        if (x >= 0 && y >= 0 && x < 128 && y < 128) s.canvas.setPixel(x, y, s.base[y * 128 + x]);
    }

    private static void pixel(MapCanvas c, int x, int y, byte color) {
        if (x >= 0 && y >= 0 && x < 128 && y < 128) c.setPixel(x, y, color);
    }

    /** Turns the camera down to open-pitch, keeping the direction the player faces. */
    private void lookDown(Player p) {
        Location eye = p.getEyeLocation();
        double yaw = Math.toRadians(eye.getYaw()), pitch = Math.toRadians(openPitch);
        p.lookAt(eye.getX() - Math.sin(yaw) * Math.cos(pitch), eye.getY() - Math.sin(pitch),
                eye.getZ() + Math.cos(yaw) * Math.cos(pitch), LookAnchor.EYES);
    }

    /** /dphone: reload. /dphone status <player>: one line for tests and staff. */
    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (args.length == 2 && args[0].equalsIgnoreCase("status")) {
            Player p = Bukkit.getPlayerExact(args[1]);
            MapView v = p == null ? null : assigned.get(p.getUniqueId());
            if (v == null) { sender.sendMessage("PHONE " + args[1] + " none"); return true; }
            State s = states.get(p.getUniqueId());
            sender.sendMessage("PHONE " + p.getName() + " map=" + v.getId() + " holding=" + holds(p, v)
                    + " open=" + p.getScoreboardTags().contains(openTag) + " cityRead=" + (img != null)
                    + " pois=" + pois.size() + " cursor=" + (s == null ? "none" : s.curX + "," + s.curY));
            return true;
        }
        load();
        sender.sendMessage("DonatingPhone reloaded: " + pool.size() + " phone maps, city " + cityDesc + ".");
        return true;
    }

    // ---------- Drawing ----------

    private final class Renderer extends MapRenderer {
        Renderer() { super(true); } // contextual: one canvas per player

        @Override
        public void render(MapView view, MapCanvas canvas, Player p) {
            if (tiles == null || !holds(p, view)) return; // nobody sees a phone in the pocket
            if (img == null) readCity(canvas, p);
            if (img == null) return;
            State s = states.computeIfAbsent(p.getUniqueId(), k -> new State());
            s.canvas = canvas;
            boolean open = p.getScoreboardTags().contains(openTag);
            Location l = p.getLocation();
            boolean here = world.equals(l.getWorld());
            // The player in image pixels.
            double px = here ? (l.getX() - x0) / bpp : imgW / 2.0;
            double pz = here ? (l.getZ() - z0) / bpp : imgH / 2.0;

            // Held view follows you: re-center once you're `step` screen pixels from the middle.
            if (Double.isNaN(s.cx) || Math.abs(px - s.cx) * zoom >= step || Math.abs(pz - s.cz) * zoom >= step) {
                s.cx = Math.round(px * zoom) / (double) zoom;
                s.cz = Math.round(pz * zoom) / (double) zoom;
            }
            // The view: center (cx, cz) in image pixels, f image pixels per screen pixel.
            double f = open ? Math.max(1, Math.max(imgW, imgH) / 128.0) : 1.0 / zoom;
            double cx = open ? imgW / 2.0 : s.cx, cz = open ? imgH / 2.0 : s.cz;

            long key = open ? Long.MAX_VALUE : ((long) Math.round(cx * zoom) << 32) ^ (Math.round(cz * zoom) & 0xffffffffL);
            if (key != s.drawn || s.viewId != view.getId()) {
                for (int y = 0; y < 128; y++) {
                    int iz = (int) Math.floor(cz + (y - 64 + 0.5) * f);
                    for (int x = 0; x < 128; x++) {
                        int ix = (int) Math.floor(cx + (x - 64 + 0.5) * f);
                        boolean in = ix >= 0 && iz >= 0 && ix < imgW && iz < imgH;
                        s.base[y * 128 + x] = in ? img[iz * imgW + ix] : 0; // 0 = see-through: the phone's screen texture
                    }
                }
                if (!open && !hint.isEmpty()) for (int i = 119 * 128; i < 128 * 128; i++) s.base[i] = STRIP;
                for (int i = 0; i < s.base.length; i++) canvas.setPixel(i % 128, i / 128, s.base[i]); // only changed pixels are re-sent
                if (!open && !hint.isEmpty()) {
                    canvas.drawText(Math.max(0, (128 - MinecraftFont.Font.getWidth(hint)) / 2), 120, MinecraftFont.Font, "§34;" + hint);
                }
                s.drawn = key;
                s.viewId = view.getId();
                s.baseOpen = open;
                s.curX = s.curY = -1; // the redraw wiped the cursor
                if (open) moveCursor(p, s);
            }

            MapCursorCollection cursors = new MapCursorCollection();
            for (Poi poi : pois) put(cursors, poi.ix, poi.iz, cx, cz, f, poi.dir, poi.type, poi.caption);
            // Passive players: a green arrow. Name only on the big map, while the cursor is on it.
            Player hovered = null;
            double best = hoverRadius + 0.5;
            List<Player> shown = new ArrayList<>();
            for (Player o : world.getPlayers()) {
                if (o == p || !o.getScoreboardTags().contains(passiveTag) || !p.canSee(o)) continue;
                shown.add(o);
                if (open && s.curX >= 0) {
                    Location ol = o.getLocation();
                    double d = Math.hypot(((ol.getX() - x0) / bpp - cx) / f + 64 - s.curX, ((ol.getZ() - z0) / bpp - cz) / f + 64 - s.curY);
                    if (d < best) { best = d; hovered = o; }
                }
            }
            for (Player o : shown) {
                Location ol = o.getLocation();
                MapCursor.Type type = open && smallArrows ? SMALL_PASSIVE : MapCursor.Type.FRAME;
                Component name = o == hovered ? Component.text(o.getName(), NamedTextColor.GREEN) : null;
                put(cursors, (ol.getX() - x0) / bpp, (ol.getZ() - z0) / bpp, cx, cz, f, dir(ol.getYaw()), type, name);
            }
            MapCursor.Type self = open && smallArrows ? SMALL_SELF : MapCursor.Type.PLAYER;
            if (here && !put(cursors, px, pz, cx, cz, f, dir(l.getYaw()), self, null)) {
                // outside the city (big map): small marker on the nearest edge
                byte ex = (byte) Math.max(-128, Math.min(127, Math.round((px - cx) / f * 2)));
                byte ez = (byte) Math.max(-128, Math.min(127, Math.round((pz - cz) / f * 2)));
                cursors.addCursor(new MapCursor(ex, ez, (byte) 0, MapCursor.Type.PLAYER_OFF_MAP, true, (Component) null));
            }
            canvas.setCursors(cursors);
        }

        /** City pixels + banner labels, read once from each city map's own vanilla renderer. */
        private void readCity(MapCanvas canvas, Player p) {
            byte[] px = new byte[imgW * imgH];
            List<Poi> found = new ArrayList<>();
            for (int r = 0; r < tiles.length; r++) for (int col = 0; col < tiles[r].length; col++) {
                MapView t = tiles[r][col];
                List<MapRenderer> base = t.getRenderers();
                if (base.isEmpty() || base.get(0) == this) { // a city map must not be a phone map
                    getLogger().warning("city map " + t.getId() + " can't be read (is it one of the phone maps?)");
                    return;
                }
                base.get(0).render(t, canvas, p);
                for (int y = 0; y < 128; y++) for (int x = 0; x < 128; x++) px[(r * 128 + y) * imgW + col * 128 + x] = canvas.getPixel(x, y);
                MapCursorCollection c = canvas.getCursors();
                for (int i = 0; i < c.size(); i++) {
                    MapCursor m = c.getCursor(i);
                    MapCursor.Type type = m.getType();
                    if (type == MapCursor.Type.PLAYER || type == MapCursor.Type.PLAYER_OFF_MAP || type == MapCursor.Type.PLAYER_OFF_LIMITS || type == MapCursor.Type.FRAME) continue;
                    found.add(new Poi(col * 128 + 64 + m.getX() / 2.0, r * 128 + 64 + m.getY() / 2.0, m.getDirection(), type, m.caption()));
                }
            }
            pois.clear();
            pois.addAll(found);
            img = px;
            for (State s : states.values()) s.drawn = Long.MIN_VALUE; // the scratch reads drew over this canvas
            getLogger().info("Read city " + cityDesc + ": " + found.size() + " labels.");
        }

        /** Image-pixel point -> icon on this screen. False when it's off the screen. */
        private boolean put(MapCursorCollection cursors, double ix, double iz, double cx, double cz, double f, byte dir, MapCursor.Type type, Component caption) {
            long mx = Math.round((ix - cx) / f * 2), mz = Math.round((iz - cz) / f * 2); // icon units = half pixels
            if (mx < -128 || mx > 127 || mz < -128 || mz > 127) return false;
            cursors.addCursor(new MapCursor((byte) mx, (byte) mz, dir, type, true, caption));
            return true;
        }

        private byte dir(float yaw) { return (byte) Math.floorMod(Math.round(yaw / 22.5f), 16); }
    }
}
