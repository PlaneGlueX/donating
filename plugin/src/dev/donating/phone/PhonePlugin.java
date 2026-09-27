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
import io.papermc.paper.event.player.PrePlayerAttackEntityEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.map.MapPalette;
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
    private final Gps gps = new Gps(this);
    // GPS colors on the map (the route line; the road grid when staff look at it).
    private byte routePin, routeQuest, routeLoot, gridRoad, gridBlocked;

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
        boolean overPin;                 // the big map's cursor is on the GPS pin (the strip says so)
        long clickedAt;                  // last left-click on the big map (a pin)
    }

    @Override
    public void onEnable() {
        saveDefaultConfig();
        load();
        getServer().getPluginManager().registerEvents(this, this);
        getServer().getScheduler().runTaskTimer(this, this::watch, 1L, 1L);
        for (Player p : Bukkit.getOnlinePlayers()) assign(p);
    }

    @Override
    public void onDisable() {
        gps.shutdown(); // the worker thread, a running road scan, and every GPS dot stand
    }

    /** Makes a player's phone draw its whole view again (the GPS route or the road grid changed). */
    void redraw(Player p) {
        State s = states.get(p.getUniqueId());
        if (s != null) s.drawn = Long.MIN_VALUE;
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
        // The pool lives in pool.yml, so the plugin never rewrites the owner's config.yml.
        File poolFile = new File(getDataFolder(), "pool.yml");
        YamlConfiguration saved = YamlConfiguration.loadConfiguration(poolFile);
        loadCity(c, saved.getIntegerList("pool"));
        routePin = mapColor(c.getString("gps.route.pin", "#D040E0"));
        routeQuest = mapColor(c.getString("gps.route.quest", "#FF5A1F"));
        routeLoot = mapColor(c.getString("gps.route.loot", "#30C8C0"));
        gridRoad = mapColor("#F0E040");
        gridBlocked = mapColor("#E02020");
        gps.configure(c);
        gps.city(tiles == null ? null : world, x0, z0, imgW, imgH, bpp);
        getLogger().info("GPS roads: " + (gps.roads() == null ? "none" : gps.roads().w + "x" + gps.roads().h + " cells"));

        World poolWorld = world != null ? world : Bukkit.getWorlds().get(0);
        List<Integer> cityIds = new ArrayList<>();
        if (tiles != null) for (MapView[] row : tiles) for (MapView t : row) cityIds.add(t.getId());
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

    /** The held phone's strip while a GPS target is set: its name and how far along the way ("Chop shop 340m"). */
    /** Holding the car key (garage.sk's carKey: the phone's map with custom model data "donating:carkey"). */
    private static boolean holdsKey(Player p) {
        ItemStack item = p.getInventory().getItemInMainHand();
        return item.getType() == Material.FILLED_MAP && item.hasItemMeta() && item.getItemMeta().hasCustomModelDataComponent()
                && item.getItemMeta().getCustomModelDataComponent().getStrings().contains("donating:carkey");
    }

    private static String gpsStrip(Gps.Target t, boolean noMap) {
        String dist = t.state.equals("arrived") ? "here" : t.left < 0 ? "" : t.left < 1000 ? (Math.round(t.left / 10) * 10) + "m"
                : String.format(java.util.Locale.ROOT, "%.1fkm", t.left / 1000);
        String name = MinecraftFont.Font.isValid(t.label) ? t.label : t.kind;
        String text = noMap ? name + " " + dist : name + " " + dist + "  R:map";
        if (MinecraftFont.Font.getWidth(text) > 124) text = name + " " + dist;
        while (MinecraftFont.Font.getWidth(text) > 124 && name.length() > 3) {
            name = name.substring(0, name.length() - 1);
            text = name + ". " + dist;
        }
        return text;
    }

    /** The map palette color nearest to "#RRGGBB". */
    @SuppressWarnings("deprecation") // MapPalette.matchColor: still the way to pick a palette color
    private static byte mapColor(String hex) {
        int rgb;
        try { rgb = Integer.parseInt(hex.replace("#", ""), 16); } catch (NumberFormatException e) { rgb = 0xD040E0; }
        return MapPalette.matchColor((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255);
    }

    /** city-maps: rows of map ids (north to south), each row west to east. Old configs: city-map: <id>. */
    private void loadCity(FileConfiguration c, List<Integer> poolIds) {
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
                if (poolIds.contains(rows.get(r).get(col))) { getLogger().warning("city map " + rows.get(r).get(col) + " is one of the phone maps (pool.yml), not a city map: phones stay blank."); return; }
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
        gps.quit(e.getPlayer());
        e.getPlayer().removeMetadata(META, this);
    }

    /**
     * Left-click on the big map: the GPS pin. The plugin only reports where the cursor points (and how near
     * counts as "on the pin" at this zoom); gps.sk decides (a new pin, or removing the one there).
     */
    // LOWEST and cancelled: with the big map open the camera looks at the ground within reach, so the click
    // is a LEFT_CLICK_BLOCK (starting to dig); Skript's handlers (a crate stand...) then skip it.
    @EventHandler(priority = EventPriority.LOWEST)
    public void onLeftClick(PlayerInteractEvent e) {
        if (!e.getAction().isLeftClick()) return;
        if (e.getHand() != EquipmentSlot.HAND) return;
        if (!bigMapOpen(e.getPlayer())) return;
        e.setCancelled(true);
        pick(e.getPlayer());
    }

    /** A left-click on an entity under the crosshair (a player, a car stand) while the big map is open: a pick, not a hit. */
    @EventHandler(priority = EventPriority.LOWEST)
    public void onAttack(PrePlayerAttackEntityEvent e) {
        if (!bigMapOpen(e.getPlayer())) return;
        e.setCancelled(true);
        pick(e.getPlayer());
    }

    private boolean bigMapOpen(Player p) {
        MapView v = assigned.get(p.getUniqueId());
        return v != null && states.containsKey(p.getUniqueId()) && tiles != null && img != null && holds(p, v) && p.getScoreboardTags().contains(openTag);
    }

    private void pick(Player p) {
        State s = states.get(p.getUniqueId());
        if (!s.anchored || !s.baseOpen || s.curX < 0) return; // the cursor isn't placed yet
        long now = System.currentTimeMillis();
        if (now - s.clickedAt < 400) return;
        s.clickedAt = now;
        double f = Math.max(1, Math.max(imgW, imgH) / 128.0);
        double ix = imgW / 2.0 + (s.curX - 64 + 0.5) * f, iz = imgH / 2.0 + (s.curY - 64 + 0.5) * f;
        if (ix < 0 || iz < 0 || ix >= imgW || iz >= imgH) return; // off the city
        double wx = x0 + ix * bpp, wz = z0 + iz * bpp, reach = hoverRadius * f * bpp;
        Bukkit.dispatchCommand(Bukkit.getConsoleSender(), "gpspick " + p.getName() + " " + Gps.fmt(wx) + " " + Gps.fmt(wz) + " " + Gps.fmt(reach));
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
        gps.tick();
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
                    // (Drivers can't open it: phone.sk; passengers get the tilt too, or the cursor sits at the edge.)
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
        // The strip says what a left-click does: drop a pin, or remove the one under the cursor.
        Gps.Nav nav = gps.nav(p);
        Gps.Target t = nav == null ? null : nav.slots.get("pin");
        boolean over = false;
        if (t != null && t.world.equals(world)) {
            double f = Math.max(1, Math.max(imgW, imgH) / 128.0);
            double sx = ((t.x - x0) / bpp - imgW / 2.0) / f + 64, sy = ((t.z - z0) / bpp - imgH / 2.0) / f + 64;
            over = Math.hypot(sx - s.curX, sy - s.curY) <= hoverRadius;
        }
        if (over != s.overPin) {
            s.overPin = over;
            bigStrip(s);
        }
    }

    /** The big map's bottom strip: what a left-click does (kept in the base so the cursor can pass over it). */
    private void bigStrip(State s) {
        if (s.canvas == null || !s.baseOpen) return;
        String text = s.overPin ? "L-click: remove pin" : "L-click: set a pin";
        for (int i = 119 * 128; i < 128 * 128; i++) { s.base[i] = STRIP; s.canvas.setPixel(i % 128, i / 128, STRIP); }
        s.canvas.drawText(Math.max(0, (128 - MinecraftFont.Font.getWidth(text)) / 2), 120, MinecraftFont.Font, "§34;" + text);
        for (int i = 119 * 128; i < 128 * 128; i++) s.base[i] = s.canvas.getPixel(i % 128, i / 128);
        // The cursor may sit on the strip: draw it again on top.
        int x = s.curX, y = s.curY;
        s.curX = s.curY = -1;
        if (x >= 0) drawCursor(s, x, y);
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
        // The client turns toward this point from its own eye position, which is ahead of the
        // server's copy when the player moves: a far point makes that difference not matter.
        Location eye = p.getEyeLocation();
        double yaw = Math.toRadians(eye.getYaw()), pitch = Math.toRadians(openPitch), far = 1000;
        p.lookAt(eye.getX() - Math.sin(yaw) * Math.cos(pitch) * far, eye.getY() - Math.sin(pitch) * far,
                eye.getZ() + Math.cos(yaw) * Math.cos(pitch) * far, LookAnchor.EYES);
    }

    /** Tab completion for /dphone (owner, 2026-09-27: every command completes its arguments). */
    @Override
    public List<String> onTabComplete(CommandSender sender, Command cmd, String label, String[] args) {
        List<String> options = new ArrayList<>();
        List<String> players = new ArrayList<>();
        // Only the players the sender can see (EssentialsX vanish), like Bukkit's own name completion.
        for (Player p : Bukkit.getOnlinePlayers()) if (!(sender instanceof Player viewer) || viewer.canSee(p)) players.add(p.getName());
        if (args.length == 1) {
            options.addAll(List.of("reload", "status", "roads", "gps"));
        } else if (args.length == 2) {
            switch (args[0].toLowerCase()) {
                case "status", "gps" -> options.addAll(players);
                case "roads" -> options.addAll(List.of("info", "scan", "cancel", "show"));
                default -> { }
            }
        } else if (args.length == 3) {
            if (args[0].equalsIgnoreCase("gps")) options.addAll(List.of("set", "clear", "active"));
            else if (args[0].equalsIgnoreCase("roads") && args[1].equalsIgnoreCase("show")) options.addAll(players);
        } else if (args.length == 4) {
            if (args[0].equalsIgnoreCase("gps")) {
                if (args[2].equalsIgnoreCase("active")) options.addAll(List.of("pin", "quest", "loot", "none"));
                else options.addAll(List.of("pin", "quest", "loot"));
            } else if (args[0].equalsIgnoreCase("roads") && args[1].equalsIgnoreCase("show")) {
                options.addAll(List.of("on", "off"));
            }
        } else if (args.length == 5 && args[0].equalsIgnoreCase("gps") && args[2].equalsIgnoreCase("set")) {
            for (org.bukkit.World w : Bukkit.getWorlds()) options.add(w.getName());
        }
        String typed = args.length == 0 ? "" : args[args.length - 1].toLowerCase();
        List<String> out = new ArrayList<>();
        for (String o : options) if (o.toLowerCase().startsWith(typed)) out.add(o);
        return out;
    }

    /** /dphone: reload. /dphone status <player>: one line for tests and staff. /dphone gps|roads: the GPS. */
    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (args.length >= 1 && (args[0].equalsIgnoreCase("gps") || args[0].equalsIgnoreCase("roads"))) return gps.command(sender, args);
        if (args.length == 2 && args[0].equalsIgnoreCase("status")) {
            Player p = Bukkit.getPlayerExact(args[1]);
            MapView v = p == null ? null : assigned.get(p.getUniqueId());
            if (v == null) { sender.sendMessage("PHONE " + args[1] + " none"); return true; }
            State s = states.get(p.getUniqueId());
            sender.sendMessage("PHONE " + p.getName() + " map=" + v.getId() + " holding=" + holds(p, v)
                    + " open=" + p.getScoreboardTags().contains(openTag) + " cityRead=" + (img != null)
                    + " pois=" + pois.size() + " cursor=" + (s == null ? "none" : s.curX + "," + s.curY) + " route=" + routePin + "," + routeQuest + "," + routeLoot);
            return true;
        }
        if (args.length > 1 || (args.length == 1 && !args[0].equalsIgnoreCase("reload"))) {
            sender.sendMessage("/dphone [reload]: reload the config and re-read the city (after adding banner labels)");
            sender.sendMessage("/dphone status <player>: that player's phone map, view and cursor");
            sender.sendMessage("/dphone roads [info | scan [x1 z1 x2 z2] | cancel | show <player> [on|off]]: the GPS road grid");
            sender.sendMessage("/dphone gps <player> [set <pin|quest|loot> <world> <radius> <x,y,z[;x,y,z...]> <label...> | active <slot|none> | clear [slot]]: the GPS target (gps.sk)");
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

            // The GPS: its route on the map, the target's name and distance in the held phone's strip.
            Gps.Target gt = gps.target(p);
            boolean gpsHere = gt != null && gt.world.equals(world);
            // In a vehicle a right-click doesn't open the map (drivers can't; the car key locks): no "R:map".
            boolean carKey = holdsKey(p), riding = p.isInsideVehicle();
            String strip = !open && gt != null ? gpsStrip(gt, carKey || riding) : carKey ? "R-click: lock / unlock" : riding ? "" : hint;
            boolean grid = open && gps.showRoads(p);
            // Redraw only when the view, the route, the strip or the grid view changed (the held view already
            // redraws on every re-center, so the route follows you there; the big map every 16 blocks).
            long gpsKey = gt == null ? 0 : gt.version * 1_000_003L + (open ? Math.round(gt.left / 16) : 0);
            long key = open ? Long.MAX_VALUE - gpsKey * 2 - (grid ? 1 : 0)
                    : ((((long) Math.round(cx * zoom) << 32) ^ (Math.round(cz * zoom) & 0xffffffffL)) * 31 + gpsKey) * 31 + strip.hashCode();
            if (key != s.drawn || s.viewId != view.getId()) {
                for (int y = 0; y < 128; y++) {
                    int iz = (int) Math.floor(cz + (y - 64 + 0.5) * f);
                    for (int x = 0; x < 128; x++) {
                        int ix = (int) Math.floor(cx + (x - 64 + 0.5) * f);
                        boolean in = ix >= 0 && iz >= 0 && ix < imgW && iz < imgH;
                        s.base[y * 128 + x] = in ? img[iz * imgW + ix] : 0; // 0 = see-through: the phone's screen texture
                    }
                }
                if (grid) drawGrid(s, cx, cz, f);
                if (gpsHere) drawRoute(s, gt, cx, cz, f, open);
                if (!open && !strip.isEmpty()) for (int i = 119 * 128; i < 128 * 128; i++) s.base[i] = STRIP;
                for (int i = 0; i < s.base.length; i++) canvas.setPixel(i % 128, i / 128, s.base[i]); // only changed pixels are re-sent
                if (!open && !strip.isEmpty()) {
                    canvas.drawText(Math.max(0, (128 - MinecraftFont.Font.getWidth(strip)) / 2), 120, MinecraftFont.Font, "§34;" + strip);
                }
                s.drawn = key;
                s.viewId = view.getId();
                s.baseOpen = open;
                s.curX = s.curY = -1; // the redraw wiped the cursor
                if (open) {
                    bigStrip(s);
                    moveCursor(p, s);
                }
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
            // The GPS targets: a red X for a pin, a target mark for a quest, a white X for the base; names on
            // the big map. The one on hold shows too (without a route). Off the held view only the active one
            // sits on the edge, toward it.
            Gps.Nav nav = gps.nav(p);
            if (nav != null) for (Gps.Target t : nav.slots.values()) {
                if (!t.world.equals(world)) continue;
                MapCursor.Type type = t.kind.equals("pin") ? MapCursor.Type.RED_X : t.kind.equals("quest") ? MapCursor.Type.TARGET_POINT : MapCursor.Type.TARGET_X;
                NamedTextColor tc = t.kind.equals("pin") ? NamedTextColor.LIGHT_PURPLE : t.kind.equals("quest") ? NamedTextColor.GOLD : NamedTextColor.AQUA;
                Component cap = open ? Component.text(t.label, tc) : null;
                for (double[] q : t.pts) {
                    double tix = (q[0] - x0) / bpp, tiz = (q[2] - z0) / bpp;
                    if (put(cursors, tix, tiz, cx, cz, f, (byte) 0, type, cap)) continue;
                    if (t != gt || q[0] != gt.x || q[2] != gt.z) continue;
                    double mx = (tix - cx) / f * 2, mz = (tiz - cz) / f * 2, m = Math.max(Math.abs(mx), Math.abs(mz));
                    cursors.addCursor(new MapCursor((byte) Math.round(mx * 120 / m), (byte) Math.round(mz * 120 / m), (byte) 0, type, true, (Component) null));
                }
            }
            canvas.setCursors(cursors);
        }

        /** The GPS route over the view: from where you are, cell by cell, to the target. */
        private void drawRoute(State s, Gps.Target t, double cx, double cz, double f, boolean open) {
            Roads r = gps.roads();
            if (r == null || t.fieldRoads != r || t.walk.length == 0) return;
            byte col = t.kind.equals("pin") ? routePin : t.kind.equals("quest") ? routeQuest : routeLoot;
            int n = t.walk.length + 1;
            int[] xs = new int[n], ys = new int[n];
            for (int i = 0; i < n; i++) {
                double ix, iz;
                if (i < t.walk.length) {
                    ix = (t.walk[i] % r.w + 0.5) * r.k;
                    iz = (t.walk[i] / r.w + 0.5) * r.k;
                } else { // on to the target itself
                    ix = (t.x - x0) / bpp;
                    iz = (t.z - z0) / bpp;
                }
                xs[i] = (int) Math.floor((ix - cx) / f + 64);
                ys[i] = (int) Math.floor((iz - cz) / f + 64);
            }
            // The held phone: 2 pixels wide with a black edge (it has to stand out on any street); the big map: 1.
            if (!open) for (int i = 1; i < n; i++) line(s.base, xs[i - 1], ys[i - 1], xs[i], ys[i], BLACK, -1, 2);
            for (int i = 1; i < n; i++) line(s.base, xs[i - 1], ys[i - 1], xs[i], ys[i], col, 0, open ? 0 : 1);
        }

        /** Staff view (/dphone roads show): road cells yellow, walls and water red, on the big map. */
        private void drawGrid(State s, double cx, double cz, double f) {
            Roads r = gps.roads();
            if (r == null) return;
            for (int y = 0; y < 128; y++) {
                int iz = (int) Math.floor(cz + (y - 64 + 0.5) * f);
                for (int x = 0; x < 128; x++) {
                    int ix = (int) Math.floor(cx + (x - 64 + 0.5) * f);
                    if (ix < 0 || iz < 0 || ix >= imgW || iz >= imgH) continue;
                    int gx = ix / r.k, gz = iz / r.k;
                    if (!r.inside(gx, gz)) continue;
                    byte k = r.kind[gz * r.w + gx];
                    if (k == Roads.ROAD) s.base[y * 128 + x] = gridRoad;
                    else if (k == Roads.BLOCKED) s.base[y * 128 + x] = gridBlocked;
                }
            }
        }

        /** A line of square dots (offsets lo..hi from each point) into a 128x128 buffer; off-screen parts are skipped. */
        private static void line(byte[] px, int x0, int y0, int x1, int y1, byte col, int lo, int hi) {
            if (Math.max(x0, x1) + hi < 0 || Math.min(x0, x1) + lo > 127 || Math.max(y0, y1) + hi < 0 || Math.min(y0, y1) + lo > 127) return;
            int dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
            for (int guard = 0; guard < 1024; guard++) {
                for (int a = lo; a <= hi; a++) for (int b = lo; b <= hi; b++) {
                    int x = x0 + a, y = y0 + b;
                    if (x >= 0 && y >= 0 && x < 128 && y < 128) px[y * 128 + x] = col;
                }
                if (x0 == x1 && y0 == y1) return;
                int e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
            }
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
