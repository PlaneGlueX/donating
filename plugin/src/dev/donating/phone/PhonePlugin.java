package dev.donating.phone;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
import org.bukkit.event.player.PlayerToggleSneakEvent;
import org.bukkit.event.entity.EntitySpawnEvent;
import org.bukkit.entity.Entity;
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
    // The big map's zoom levels (sneak while it's open): 1 = the whole city, then that many times closer around you.
    private int[] bigZooms = {1, 2, 4, 8};
    static final double MIN_F = 0.25; // at most 4 screen pixels per city pixel

    // The main city: tiles[row][col] when it's made of city-maps (rows north to south, columns west to east), same scale.
    private MapView[][] tiles;
    private City main;        // null: no city (phones stay blank)
    private boolean scanCity; // the main city is city.bin (/dphone city scan), not the city-maps
    // Other worlds' own cities (CityScan: cities/<world>.bin) by world name: a player in that world sees it instead
    // (2026-10-14: the prison world, before it becomes the main world).
    private final Map<String, City> others = new HashMap<>();
    private final CityScan cityScan = new CityScan(this);
    private final WallMaps wallMaps = new WallMaps(this, BLACK);

    /** A city image: pixel (x, z) is img[z * w + x], its top-left corner at block (x0, z0), bpp blocks a pixel. */
    static final class City {
        final String world;
        final double x0, z0;
        final int bpp, w, h;
        byte[] img;                                // a city of map tiles: read on its first render
        final List<Poi> pois = new ArrayList<>();  // the city maps' banner labels

        City(String world, double x0, double z0, int bpp, int w, int h, byte[] img) {
            this.world = world;
            this.x0 = x0;
            this.z0 = z0;
            this.bpp = bpp;
            this.w = w;
            this.h = h;
            this.img = img;
        }

        double ix(double wx) { return (wx - x0) / bpp; }
        double iz(double wz) { return (wz - z0) / bpp; }
        double fit() { return Math.max(1, Math.max(w, h) / 128.0); } // the whole city on the big map: image pixels per screen pixel
    }

    /** The city a player in world w sees: that world's own, else the main city (null: none). */
    City cityFor(World w) {
        City o = w == null ? null : others.get(w.getName());
        return o != null ? o : main;
    }

    private final List<MapView> pool = new ArrayList<>();
    private final Map<UUID, MapView> assigned = new HashMap<>();
    private final Map<UUID, State> states = new HashMap<>();
    private final Renderer renderer = new Renderer();
    private final Gps gps = new Gps(this);
    private final Marks marks = new Marks(this);
    private final CarSmooth carSmooth = new CarSmooth(this);
    private final CarCam carCam = new CarCam(this);
    // The guns' first-person animation clock (only with WeaponMechanics: its classes load only then).
    private GunFx gunFx;
    // The melee weapons' swings and chain clocks (also only with WeaponMechanics).
    private MeleeFx meleeFx;
    private Nametags nametags; // null without TAB
    /** Personal views (pv.sk): entities tagged this are invisible to everyone before they exist; Skript reveals them. */
    static final String PV_TAG = "donating_pv";
    // GPS colors on the map (the route line; the road grid when staff look at it).
    private byte routePin, routeQuest, routeLoot, gridRoad, gridBlocked;

    /** A banner label on the city map, in image pixels. */
    record Poi(double ix, double iz, byte dir, MapCursor.Type type, Component caption) {}

    /**
     * A place on the phone's map, sent by Skript (nav.sk: staff POIs, open heists, quest givers): a colored banner
     * icon, its name while the big map's cursor is on it. /dphone place set|remove|clear|list.
     */
    record Place(String world, double x, double z, MapCursor.Type type, String label, NamedTextColor color) {}
    private final Map<String, Place> places = new LinkedHashMap<>();
    private long placesVersion; // every change of the places (the wall maps redraw their icons)
    private boolean placesOn, placesHeld;

    /** A place type's icon and name color; null for an unknown type. */
    private static Map.Entry<MapCursor.Type, NamedTextColor> placeStyle(String type) {
        return switch (type.toLowerCase()) {
            case "base" -> Map.entry(MapCursor.Type.BANNER_LIGHT_BLUE, NamedTextColor.AQUA);
            case "shop" -> Map.entry(MapCursor.Type.BANNER_ORANGE, NamedTextColor.GOLD);
            case "spawn" -> Map.entry(MapCursor.Type.BANNER_WHITE, NamedTextColor.WHITE);
            case "landmark" -> Map.entry(MapCursor.Type.BANNER_MAGENTA, NamedTextColor.LIGHT_PURPLE);
            case "garage" -> Map.entry(MapCursor.Type.BANNER_CYAN, NamedTextColor.DARK_AQUA);
            case "quest" -> Map.entry(MapCursor.Type.BANNER_BLUE, NamedTextColor.BLUE);
            case "heist0" -> Map.entry(MapCursor.Type.BANNER_LIGHT_GRAY, NamedTextColor.GRAY);
            case "heist1" -> Map.entry(MapCursor.Type.BANNER_LIME, NamedTextColor.GREEN);
            case "heist2" -> Map.entry(MapCursor.Type.BANNER_YELLOW, NamedTextColor.YELLOW);
            case "heist3" -> Map.entry(MapCursor.Type.BANNER_RED, NamedTextColor.RED);
            case "heist4" -> Map.entry(MapCursor.Type.BANNER_BLACK, NamedTextColor.DARK_RED);
            default -> null;
        };
    }

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
        int bigZoom = 1;                 // the big map's zoom (big-zoom: 1 = the whole city), kept for the session
        double bcx = Double.NaN, bcz, bf; // the zoomed big map's center (image pixels) and scale it was centered at
        String zoomHint = "";            // the strip's zoom part ("Shift: x2"; "" = can't zoom here)
        City vc;                         // the view drawn now: its city, center and image pixels per screen pixel
        double vcx, vcz, vf = 1;
    }

    @Override
    public void onEnable() {
        saveDefaultConfig();
        gps.paths.load(); // once: /dphone reload keeps the paths in memory (a queued save may not be written yet)
        load();
        getServer().getPluginManager().registerEvents(this, this);
        getServer().getPluginManager().registerEvents(wallMaps, this);
        // Classic chest menus draw their vanilla top panel from the title (the pack's generic_54.png is see-through there).
        getServer().getPluginManager().registerEvents(new MenuPanels(this), this);
        getServer().getPluginManager().registerEvents(new PathWand(this, gps.paths), this); // the GPS path wand (staff)
        getServer().getPluginManager().registerEvents(carSmooth, this);
        getServer().getPluginManager().registerEvents(carSmooth.bundle, this);
        getServer().getPluginManager().registerEvents(carCam, this);
        carSmooth.start();
        carCam.start();
        if (getServer().getPluginManager().isPluginEnabled("WeaponMechanics")) {
            gunFx = new GunFx(this);
            gunFx.configure(getConfig());
            getServer().getPluginManager().registerEvents(gunFx, this);
            getServer().getPluginManager().registerEvents(gunFx.spin, this); // the spin guns' spin-up (GunSpin)
            getServer().getPluginManager().registerEvents(gunFx.bag, this); // the offhand hidden while a gun reloads (BagHide)
            getServer().getPluginManager().registerEvents(gunFx.shells, this); // the ends of a shell-by-shell reload (ShellLoad), after GunFx
            meleeFx = new MeleeFx(this);
            meleeFx.configure(getConfig());
            getServer().getPluginManager().registerEvents(meleeFx, this); // the melee weapons' swings (MeleeFx)
        } else getLogger().info("WeaponMechanics not found: no gun animations");
        getServer().getScheduler().runTaskTimer(this, this::watch, 1L, 1L);
        marks.start();
        // TAB loads first (softdepend); its API is ready once the server has started.
        Bukkit.getScheduler().runTask(this, () -> {
            nametags = Nametags.create(this);
            if (nametags != null) nametags.start();
            else getLogger().info("TAB not found: nametags show through walls as in vanilla");
        });
        for (Player p : Bukkit.getOnlinePlayers()) assign(p);
    }

    @Override
    public void onDisable() {
        carCam.shutdown(); // every driver's camera back to them before the displays go
        // A server stop saves players after the plugins are disabled: out of the car seats first (CarSmooth.leaveCar).
        if (Bukkit.isStopping()) for (Player p : Bukkit.getOnlinePlayers()) if (CarSmooth.leaveCar(p)) getLogger().info("carsmooth: " + p.getName() + " out of the car seat before the stop saves them");
        carSmooth.shutdown();
        if (gunFx != null) gunFx.shutdown(); // no gun keeps the firing flag
        gps.shutdown(); // the worker thread, a running road scan, and every GPS dot stand
        cityScan.shutdown();
        marks.shutdown();
        if (nametags != null) nametags.stop();
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
        placesOn = c.getBoolean("places.enabled", true);
        placesHeld = c.getBoolean("places.held", true);
        passiveTag = c.getString("passive-tag", "donating_passive");
        openTag = c.getString("open-tag", "donating_phone_open");
        hint = c.getString("hint", "R-click: map  F: apps");
        if (!MinecraftFont.Font.isValid(hint)) hint = "";
        List<Integer> zs = new ArrayList<>(List.of(1));
        for (int z : c.getIntegerList("big-zoom")) if (z > 1 && z <= 64 && !zs.contains(z)) zs.add(z);
        if (!c.isList("big-zoom")) zs = List.of(1, 2, 4, 8);
        bigZooms = zs.stream().mapToInt(Integer::intValue).sorted().toArray();
        for (State s : states.values()) s.drawn = Long.MIN_VALUE; // redraw everyone
        // The pool lives in pool.yml, so the plugin never rewrites the owner's config.yml.
        File poolFile = new File(getDataFolder(), "pool.yml");
        YamlConfiguration saved = YamlConfiguration.loadConfiguration(poolFile);
        loadCity(c, saved.getIntegerList("pool"));
        others.clear();
        for (CityScan.Image im : cityScan.others()) {
            if (main != null && im.world().equals(main.world)) continue; // the main city wins in its own world
            others.put(im.world(), new City(im.world(), im.x0(), im.z0(), im.bpp(), im.w(), im.h(), im.px()));
            getLogger().info("City of " + im.world() + ": scan " + im.box() + " (" + im.w() * im.bpp() + "x" + im.h() * im.bpp() + " blocks)");
        }
        routePin = mapColor(c.getString("gps.route.pin", "#D040E0"));
        routeQuest = mapColor(c.getString("gps.route.quest", "#FF5A1F"));
        routeLoot = mapColor(c.getString("gps.route.loot", "#30C8C0"));
        gridRoad = mapColor("#F0E040");
        gridBlocked = mapColor("#E02020");
        gps.configure(c);
        carSmooth.configure(c);
        carCam.configure(c);
        if (gunFx != null) gunFx.configure(c);
        if (meleeFx != null) meleeFx.configure(c);
        World mw = cityWorld();
        if (main == null || mw == null) gps.city(null, 0, 0, 0, 0, 1);
        else gps.city(mw, main.x0, main.z0, main.w, main.h, main.bpp);
        getLogger().info("GPS roads: " + (gps.roads() == null ? "none" : gps.roads().w + "x" + gps.roads().h + " cells"));

        World poolWorld = mw != null ? mw : Bukkit.getWorlds().get(0);
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
        wallMaps.load();
        publishState();
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

    boolean hasCity() { return main != null; }
    boolean isScanCity() { return scanCity; }

    // For CityScan: the city the phones show now.
    String cityDesc() { return cityDesc; }
    World cityWorld() { return main == null ? null : Bukkit.getWorld(main.world); }
    /** The main city's box {x1, z1, x2, z2, blocks per pixel}, or null; with a world, that world's own city's (or null). */
    int[] cityBox() { return box(main); }
    int[] cityBox(String world) { return box(main != null && main.world.equals(world) ? main : others.get(world)); }
    private static int[] box(City c) {
        if (c == null) return null;
        int x1 = (int) Math.floor(c.x0), z1 = (int) Math.floor(c.z0);
        return new int[] {x1, z1, x1 + c.w * c.bpp - 1, z1 + c.h * c.bpp - 1, c.bpp};
    }
    /** For CityScan's info: the other worlds' cities. */
    java.util.Set<String> otherCities() { return others.keySet(); }
    /** A scan finished or /dphone city use: load the city again (the GPS's road grid with it). */
    void cityChanged() { load(); }
    boolean gpsRoadsFit() { return gps.roads() != null; }

    /** For setup.sk's /dsetup: the city and the GPS road grid, as metadata on the main world (Skript reads it there). */
    void publishState() {
        World w = Bukkit.getWorlds().get(0);
        w.setMetadata("donating_phone_city", new FixedMetadataValue(this, scanCity ? "scan" : tiles != null ? "maps" : "none"));
        w.setMetadata("donating_phone_city_desc", new FixedMetadataValue(this, cityDesc));
        w.setMetadata("donating_phone_roads", new FixedMetadataValue(this, gps.roads() != null ? "ok" : gps.roadsNote()));
    }

    // For WallMaps: the city image (read from the city maps on first use, like a phone does), its size and places.
    byte[] cityImage(MapCanvas canvas, Player p) {
        if (main == null) return null;
        if (main.img == null && tiles != null) renderer.readCity(canvas, p);
        return main.img;
    }
    int imgW() { return main.w; }
    int imgH() { return main.h; }
    double toImageX(double wx) { return main.ix(wx); }
    double toImageZ(double wz) { return main.iz(wz); }
    long placesVersion() { return placesVersion; }
    java.util.Collection<Place> placeList() { return places.values(); }
    List<Poi> poiList() { return main.pois; }
    boolean placesShown() { return placesOn; }
    boolean isPhoneOrCityMap(int id) {
        for (MapView v : pool) if (v.getId() == id) return true;
        if (tiles != null) for (MapView[] row : tiles) for (MapView t : row) if (t.getId() == id) return true;
        return false;
    }

    /**
     * The city: city.bin when city.yml says "source: scan" (/dphone city scan), else city-maps: rows of map ids
     * (north to south), each row west to east. Old configs: city-map: <id>.
     */
    private void loadCity(FileConfiguration c, List<Integer> poolIds) {
        tiles = null;
        main = null;
        scanCity = false;
        if (cityScan.useScan()) {
            CityScan.Image im = cityScan.image();
            World w = im == null ? null : Bukkit.getWorld(im.world());
            if (w == null) {
                getLogger().warning("city.yml says scan, but " + (im == null ? "city.bin is missing or unreadable" : "its world " + im.world() + " isn't loaded") + ": using city-maps");
            } else {
                main = new City(w.getName(), im.x0(), im.z0(), im.bpp(), im.w(), im.h(), im.px());
                scanCity = true;
                cityDesc = "scan " + im.world() + " " + im.box() + " (" + (im.w() * im.bpp()) + "x" + (im.h() * im.bpp()) + " blocks, scale " + im.scale() + ")";
                return;
            }
        }
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
                if (wallMaps.allIds().contains(rows.get(r).get(col))) { getLogger().warning("city map " + rows.get(r).get(col) + " is a wall map (walls.yml), not a city map: phones stay blank."); return; }
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
        if (first.getWorld() == null) { getLogger().warning("city map " + first.getId() + "'s world isn't loaded: phones stay blank."); return; }
        tiles = t;
        int bpp = 1 << scale;
        main = new City(first.getWorld().getName(), first.getCenterX() - 64.0 * bpp, first.getCenterZ() - 64.0 * bpp, bpp, 128 * cols, 128 * t.length, null);
        cityDesc += " (" + (main.w * bpp) + "x" + (main.h * bpp) + " blocks)";
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
        marks.remove(id);
        e.getPlayer().removeMetadata(META, this);
    }

    /**
     * Personal views: an entity Skript tags "donating_pv" inside its spawn section is made invisible to everyone
     * here, before it's added to the world (so no player is ever sent it); pv.sk then reveals it to its owner.
     * Skript and SkBee can't set visibleByDefault, and a hide after the spawn line would already have leaked a packet.
     * Every entity spawn event (creatures, items, projectiles) goes through EntitySpawnEvent.
     */
    @EventHandler(priority = EventPriority.LOWEST)
    public void onPersonalSpawn(EntitySpawnEvent e) {
        if (e.getEntity().getScoreboardTags().contains(PV_TAG)) e.getEntity().setVisibleByDefault(false);
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
        City c = cityFor(p.getWorld());
        return v != null && states.containsKey(p.getUniqueId()) && c != null && c.img != null && holds(p, v) && p.getScoreboardTags().contains(openTag);
    }

    /**
     * Sneak with the big map open: the next zoom level around you (2026-10-14, the owner: "load the whole island then allow
     * the player to zoom in on their location"). Sneak because every other key already does something there: left-click
     * pins, right-click and the hotbar close it, F opens the apps. Not in a vehicle (sneaking gets out).
     */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onSneak(PlayerToggleSneakEvent e) {
        Player p = e.getPlayer();
        if (!e.isSneaking() || p.isInsideVehicle() || !bigMapOpen(p)) return;
        City c = cityFor(p.getWorld());
        List<Integer> lv = zoomLevels(c);
        if (lv.size() < 2 || !c.world.equals(p.getWorld().getName())) return; // another world's map: nothing to zoom around
        State s = states.get(p.getUniqueId());
        int i = lv.indexOf(s.bigZoom);
        setZoom(s, lv.get((i + 1) % lv.size()));
        p.playSound(p.getLocation(), org.bukkit.Sound.UI_BUTTON_CLICK, 0.35f, s.bigZoom == 1 ? 1.2f : 1.6f);
    }

    private static void setZoom(State s, int z) {
        s.bigZoom = z;
        s.bcx = Double.NaN;
        s.drawn = Long.MIN_VALUE;
    }

    /** The big map's zoom levels for a city (big-zoom; levels that would look the same as the one before are left out). */
    private List<Integer> zoomLevels(City c) {
        List<Integer> out = new ArrayList<>();
        double last = -1;
        for (int z : bigZooms) {
            double f = Math.max(MIN_F, c.fit() / z);
            if (f != last) out.add(z);
            last = f;
        }
        return out;
    }

    private void pick(Player p) {
        State s = states.get(p.getUniqueId());
        if (!s.anchored || !s.baseOpen || s.curX < 0 || s.vc == null) return; // the cursor isn't placed yet
        City c = s.vc;
        if (!c.world.equals(p.getWorld().getName())) return; // another world's city: a pin there would land in this world
        long now = System.currentTimeMillis();
        if (now - s.clickedAt < 400) return;
        s.clickedAt = now;
        double ix = s.vcx + (s.curX - 64 + 0.5) * s.vf, iz = s.vcz + (s.curY - 64 + 0.5) * s.vf;
        if (ix < 0 || iz < 0 || ix >= c.w || iz >= c.h) return; // off the city
        double wx = c.x0 + ix * c.bpp, wz = c.z0 + iz * c.bpp, reach = hoverRadius * s.vf * c.bpp;
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
        cityScan.tick();
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
                    // (Drivers and passengers get the tilt too, or the cursor sits at the edge; CarCam pauses a driver's
                    // chase view meanwhile.)
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
        City c = s.vc;
        if (t != null && c != null && t.world.getName().equals(c.world)) {
            double sx = (c.ix(t.x) - s.vcx) / s.vf + 64, sy = (c.iz(t.z) - s.vcz) / s.vf + 64;
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
        if (!s.zoomHint.isEmpty()) {
            String z = (s.overPin ? "L: unpin  " : "L: pin  ") + s.zoomHint;
            if (MinecraftFont.Font.getWidth(z) <= 124) text = z;
        }
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

    /** Tab completion for /dphone (owner, 2026-09-27: every command completes its arguments; 2026-10-19: "if the player
     *  has permission for the command make sure it has the tab fill option so they can see all command arguments").
     *  Every part at every position: the players the sender can see, the worlds, the sender's own block coordinates
     *  where a part takes coordinates, the ids that exist now (places, walls, path nodes nearest first, driven plates,
     *  personal-view entities nearby). Bukkit never asks without donating.phone.admin (the command's permission). */
    @Override
    public List<String> onTabComplete(CommandSender sender, Command cmd, String label, String[] args) {
        List<String> options = new ArrayList<>();
        List<String> players = new ArrayList<>();
        // Only the players the sender can see (EssentialsX vanish), like Bukkit's own name completion.
        for (Player p : Bukkit.getOnlinePlayers()) if (!(sender instanceof Player viewer) || viewer.canSee(p)) players.add(p.getName());
        List<String> worlds = new ArrayList<>();
        for (World w : Bukkit.getWorlds()) worlds.add(w.getName());
        Player me = sender instanceof Player p ? p : null;
        int n = args.length; // the word being typed
        String a0 = n > 0 ? args[0].toLowerCase() : "", a1 = n > 1 ? args[1].toLowerCase() : "";
        boolean markTarget = n > 2 && !args[2].equalsIgnoreCase("off") && !args[2].equalsIgnoreCase("status");
        if (n == 1) {
            options.addAll(List.of("reload", "status", "roads", "path", "zoom", "city", "wall", "gps", "mark", "pv", "nametag", "carstat", "carfuel", "place", "carsmooth", "carprobe", "carbundle", "cam", "steer", "gunfx", "gunskin", "melee"));
        } else if (n == 2) {
            switch (a0) {
                case "status", "gps", "mark", "nametag", "melee", "zoom" -> options.addAll(players);
                case "roads" -> options.addAll(List.of("info", "scan", "cancel", "show"));
                case "city" -> options.addAll(List.of("info", "scan", "cancel", "use", "pixel", "remove"));
                case "wall" -> options.addAll(List.of("create", "remove", "repair", "list"));
                case "place" -> options.addAll(List.of("set", "remove", "clear", "list"));
                // The plates driven now (CarStats changes a driven car).
                case "carstat", "carfuel" -> { for (Player p : Bukkit.getOnlinePlayers()) { String pl = CarSmooth.driverPlate(p); if (pl != null) options.add(pl); } }
                // Personal-view entities around the sender (pv.sk's displays).
                case "pv" -> { if (me != null) for (Entity e : me.getNearbyEntities(32, 32, 32)) if (e.getScoreboardTags().contains("donating_pv")) options.add(e.getUniqueId().toString()); }
                default -> { }
            }
        } else if (n == 3) {
            if (a0.equals("gps")) options.addAll(List.of("set", "clear", "active"));
            else if (a0.equals("nametag")) options.addAll(players);
            else if (a0.equals("roads") && a1.equals("show")) options.addAll(players);
            else if (a0.equals("roads") && a1.equals("scan")) options.addAll(at(me, 'x'));
            else if (a0.equals("city") && a1.equals("use")) options.addAll(List.of("scan", "maps"));
            else if (a0.equals("city") && a1.equals("remove")) options.addAll(others.keySet());
            else if (a0.equals("city") && a1.equals("pixel")) options.addAll(at(me, 'x'));
            else if (a0.equals("zoom")) for (int z : bigZooms) options.add(String.valueOf(z));
            else if (a0.equals("wall") && (a1.equals("remove") || a1.equals("repair"))) options.addAll(wallMaps.names());
            else if (a0.equals("place") && (a1.equals("remove") || a1.equals("set"))) options.addAll(places.keySet());
            else if (a0.equals("mark")) {
                // off, status, or the entity the sender looks at (its uuid).
                options.addAll(List.of("off", "status"));
                Entity t = me == null ? null : me.getTargetEntity(16);
                if (t != null) options.add(t.getUniqueId().toString());
            }
        } else if (n == 4) {
            if (a0.equals("gps")) {
                if (args[2].equalsIgnoreCase("active")) options.addAll(List.of("pin", "quest", "loot", "none"));
                else options.addAll(List.of("pin", "quest", "loot"));
            } else if (a0.equals("roads") && a1.equals("show")) options.addAll(List.of("on", "off"));
            else if (a0.equals("roads") && a1.equals("scan")) options.addAll(at(me, 'z'));
            else if (a0.equals("city") && a1.equals("pixel")) options.addAll(at(me, 'z'));
            else if (a0.equals("wall") && a1.equals("create")) options.addAll(List.of("1", "2", "3", "4", "5", "6", "7", "8"));
            else if (a0.equals("place") && a1.equals("set")) options.addAll(List.of("base", "shop", "spawn", "landmark", "garage", "quest", "heist0", "heist1", "heist2", "heist3", "heist4"));
            else if (a0.equals("mark") && markTarget) options.addAll(List.of("red", "yellow", "green", "blue", "white", "purple", "orange", "#FF3B30"));
        } else if (n == 5) {
            if (a0.equals("gps") && args[2].equalsIgnoreCase("set")) options.addAll(worlds);
            else if (a0.equals("roads") && a1.equals("scan")) options.addAll(at(me, 'x'));
            else if (a0.equals("city") && a1.equals("pixel")) options.addAll(worlds);
            else if (a0.equals("wall") && a1.equals("create")) options.addAll(List.of("1", "2", "3", "4", "5", "6", "7", "8"));
            else if (a0.equals("place") && a1.equals("set")) options.addAll(worlds);
            else if (a0.equals("mark") && markTarget) options.addAll(List.of("64", "128", "256"));
        } else if (n == 6) {
            if (a0.equals("gps") && args[2].equalsIgnoreCase("set")) options.addAll(List.of("8", "12"));
            else if (a0.equals("roads") && a1.equals("scan")) options.addAll(at(me, 'z'));
            else if (a0.equals("wall") && a1.equals("create")) options.addAll(worlds);
            else if (a0.equals("place") && a1.equals("set")) options.addAll(at(me, 'x'));
        } else if (n == 7) {
            if (a0.equals("gps") && args[2].equalsIgnoreCase("set") && me != null) {
                Location l = me.getLocation();
                options.add(l.getBlockX() + "," + l.getBlockY() + "," + l.getBlockZ()); // x,y,z[;x,y,z...]
            } else if (a0.equals("wall") && a1.equals("create")) options.addAll(at(me, 'x'));
            else if (a0.equals("place") && a1.equals("set")) options.addAll(at(me, 'z'));
        } else if (n == 8 && a0.equals("wall") && a1.equals("create")) options.addAll(at(me, 'y'));
        else if (n == 9 && a0.equals("wall") && a1.equals("create")) options.addAll(at(me, 'z'));
        else if (n == 10 && a0.equals("wall") && a1.equals("create")) options.addAll(List.of("north", "south", "east", "west"));
        // city scan [x1 z1 x2 z2] [scale 0-4] [world] [confirm]: what can come after the numbers typed so far.
        if (n >= 3 && a0.equals("city") && a1.equals("scan")) {
            int nums = 0;
            boolean word = false;
            for (int i = 2; i < n - 1; i++) { if (!word && args[i].matches("-?\\d+")) nums++; else word = true; }
            List<String> scales = List.of("0", "1", "2", "3", "4");
            if (word) options.add("confirm");
            else if (nums == 0) { options.addAll(at(me, 'x')); options.addAll(scales); options.addAll(worlds); }
            else if (nums == 1) { options.addAll(at(me, 'z')); options.addAll(worlds); options.add("confirm"); }
            else if (nums == 2) options.addAll(at(me, 'x'));
            else if (nums == 3) options.addAll(at(me, 'z'));
            else if (nums == 4) { options.addAll(scales); options.addAll(worlds); options.add("confirm"); }
            else if (nums == 5) { options.addAll(worlds); options.add("confirm"); }
        }
        if (n >= 2 && (a0.equals("carsmooth") || a0.equals("carprobe") || a0.equals("carbundle"))) options.addAll(carSmooth.complete(args, players));
        if (n >= 2 && a0.equals("steer")) options.addAll(carSmooth.steer.complete(args, players));
        if (n >= 2 && a0.equals("cam")) options.addAll(carCam.complete(args, players));
        if (n >= 2 && a0.equals("gunskin") && gunFx != null) options.addAll(gunFx.gunskinComplete(args, players));
        if (n >= 2 && a0.equals("path")) options.addAll(gps.paths.complete(args, me));
        if (n == 2 && a0.equals("gunfx")) options.add("spin");
        if (n == 3 && a0.equals("gunfx") && a1.equals("spin")) options.addAll(players);
        String typed = n == 0 ? "" : args[n - 1].toLowerCase();
        java.util.LinkedHashSet<String> out = new java.util.LinkedHashSet<>();
        for (String o : options) if (o.toLowerCase().startsWith(typed)) out.add(o);
        return new ArrayList<>(out);
    }

    /** The sender's own block coordinate on one axis, for a part that takes coordinates (nothing for the console). */
    private static List<String> at(Player me, char axis) {
        if (me == null) return List.of();
        Location l = me.getLocation();
        return List.of(String.valueOf(axis == 'x' ? l.getBlockX() : axis == 'y' ? l.getBlockY() : l.getBlockZ()));
    }

    /** Car mods (CarStats), made at first use: MTVehicles may load after this plugin. */
    private CarStats carStats;

    /** /dphone: reload. /dphone status <player>: one line for tests and staff. /dphone gps|roads: the GPS. */
    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (args.length >= 1 && args[0].equalsIgnoreCase("carstat")) {
            // carstat <plate> [<max speed> <acceleration> <steering>]: garage.sk's car mods (a driven car's stats).
            if (carStats == null) carStats = new CarStats(carSmooth.steer);
            if (args.length == 2) { sender.sendMessage(carStats.get(args[1].toUpperCase())); return true; }
            if (args.length != 5) { sender.sendMessage("CARSTAT usage: /dphone carstat <plate> [<max speed> <acceleration> <steering>]"); return true; }
            try {
                sender.sendMessage(carStats.set(args[1].toUpperCase(), Double.parseDouble(args[2]), Double.parseDouble(args[3]), (int) Math.round(Double.parseDouble(args[4]))));
            } catch (NumberFormatException ex) {
                sender.sendMessage("CARSTAT: numbers please");
            }
            return true;
        }
        if (args.length >= 1 && args[0].equalsIgnoreCase("carfuel")) {
            // carfuel <plate> [level <0..100>] [add <points>] [usage <a pedal tick>] [enabled true|false]: fuel.sk (town
            // PLAN 15.2). The answer also goes on the main world's metadata "donating_carfuel" ("plate|level|usage|enabled|driven",
            // "" when unknown), which fuel.sk reads right after running the command.
            if (carStats == null) carStats = new CarStats(carSmooth.steer);
            // "quiet" (fuel.sk, once a second per driver and filler): the answer only goes on the metadata.
            List<String> parts = new ArrayList<>();
            for (String x : args) if (!x.isEmpty()) parts.add(x);
            boolean quiet = parts.size() > 2 && parts.get(parts.size() - 1).equalsIgnoreCase("quiet");
            if (quiet) parts.remove(parts.size() - 1);
            Bukkit.getWorlds().get(0).setMetadata("donating_carfuel", new FixedMetadataValue(this, ""));
            if (parts.size() < 2 || parts.size() % 2 != 0) { sender.sendMessage("CARFUEL usage: /dphone carfuel <plate> [level <n>] [add <n>] [usage <n>] [enabled true|false] [quiet]"); return true; }
            Double level = null, add = null, usage = null;
            Boolean enabled = null;
            try {
                for (int i = 2; i + 1 < parts.size(); i += 2) {
                    switch (parts.get(i).toLowerCase(Locale.ROOT)) {
                        case "level" -> level = Double.parseDouble(parts.get(i + 1));
                        case "add" -> add = Double.parseDouble(parts.get(i + 1));
                        case "usage" -> usage = Double.parseDouble(parts.get(i + 1));
                        case "enabled" -> enabled = Boolean.parseBoolean(parts.get(i + 1));
                        default -> { sender.sendMessage("CARFUEL: unknown part " + parts.get(i)); return true; }
                    }
                }
            } catch (NumberFormatException ex) {
                sender.sendMessage("CARFUEL: numbers please");
                return true;
            }
            String reply = carStats.fuel(parts.get(1).toUpperCase(Locale.ROOT), level, add, usage, enabled);
            Bukkit.getWorlds().get(0).setMetadata("donating_carfuel", new FixedMetadataValue(this, carStats.lastFuel));
            if (!quiet) sender.sendMessage(reply);
            return true;
        }
        if (args.length >= 1 && (args[0].equalsIgnoreCase("carsmooth") || args[0].equalsIgnoreCase("carprobe") || args[0].equalsIgnoreCase("carbundle"))) return carSmooth.command(sender, args);
        if (args.length >= 2 && args[0].equalsIgnoreCase("gunfx") && args[1].equalsIgnoreCase("spin")) { if (gunFx == null) { sender.sendMessage("GUNSPIN off (no WeaponMechanics)"); return true; } return gunFx.spin.command(sender, args); }
        if (args.length >= 1 && args[0].equalsIgnoreCase("gunfx")) { sender.sendMessage(gunFx == null ? "GUNFX off (no WeaponMechanics)" : gunFx.status() + (meleeFx == null ? "" : " " + meleeFx.summary())); return true; }
        if (args.length >= 1 && args[0].equalsIgnoreCase("melee")) { if (meleeFx == null) { sender.sendMessage("MELEE off (no WeaponMechanics)"); return true; } return meleeFx.command(sender, args); }
        if (args.length >= 1 && args[0].equalsIgnoreCase("gunskin")) { if (gunFx == null) { sender.sendMessage("GUNSKIN off (no WeaponMechanics)"); return true; } return gunFx.gunskinCommand(sender, args); }
        if (args.length >= 1 && args[0].equalsIgnoreCase("cam")) return carCam.command(sender, args);
        if (args.length >= 1 && args[0].equalsIgnoreCase("steer")) return carSmooth.steer.command(sender, args);
        if (args.length >= 1 && (args[0].equalsIgnoreCase("gps") || args[0].equalsIgnoreCase("roads"))) return gps.command(sender, args);
        if (args.length >= 1 && args[0].equalsIgnoreCase("path")) return gps.paths.command(sender, args);
        if (args.length >= 2 && args[0].equalsIgnoreCase("zoom")) {
            // zoom <player> [level]: the big map's zoom (sneak cycles it in game); for tests and staff.
            Player p = Bukkit.getPlayerExact(args[1]);
            State s = p == null ? null : states.get(p.getUniqueId());
            City c = p == null ? null : cityFor(p.getWorld());
            if (s == null || c == null) { sender.sendMessage("ZOOM " + args[1] + " none (offline or no city)"); return true; }
            List<Integer> lv = zoomLevels(c);
            if (args.length > 2) {
                int z;
                try { z = Integer.parseInt(args[2].replace("x", "")); } catch (NumberFormatException ex) { z = -1; }
                if (!lv.contains(z)) { sender.sendMessage("ZOOM levels for this city: " + lv); return true; }
                setZoom(s, z);
            }
            sender.sendMessage("ZOOM " + p.getName() + " x" + s.bigZoom + " levels=" + lv);
            return true;
        }
        if (args.length >= 1 && args[0].equalsIgnoreCase("mark")) {
            if (args.length == 3 && args[2].equalsIgnoreCase("status")) {
                Player p = Bukkit.getPlayerExact(args[1]);
                sender.sendMessage(p == null ? "MARK no player " + args[1] : marks.status(p));
                return true;
            }
            return marks.command(sender, args);
        }
        if (args.length >= 1 && args[0].equalsIgnoreCase("nametag")) {
            // NAMETAG <viewer> sees <target> hidden=<TAB hides it> los=<a ray reaches it now> running=<checking>
            Player v = args.length == 3 ? Bukkit.getPlayerExact(args[1]) : null;
            Player t = args.length == 3 ? Bukkit.getPlayerExact(args[2]) : null;
            if (nametags == null) sender.sendMessage("NAMETAG off (no TAB)");
            else if (v == null || t == null) sender.sendMessage("NAMETAG usage: /dphone nametag <viewer> <target>");
            else sender.sendMessage(nametags.status(v, t));
            return true;
        }
        if (args.length == 2 && args[0].equalsIgnoreCase("pv")) {
            // PV <uuid> default=<visibleByDefault> tracked=<players it's sent to> see=<players who can see it>
            Entity en;
            try { en = Bukkit.getEntity(UUID.fromString(args[1])); } catch (IllegalArgumentException ex) { en = null; }
            if (en == null) { sender.sendMessage("PV " + args[1] + " none"); return true; }
            List<String> tracked = new ArrayList<>();
            for (Player p : en.getTrackedBy()) tracked.add(p.getName());
            List<String> see = new ArrayList<>();
            for (Player p : Bukkit.getOnlinePlayers()) if (p.canSee(en)) see.add(p.getName());
            sender.sendMessage("PV " + args[1] + " default=" + en.isVisibleByDefault() + " tracked=" + String.join(",", tracked) + " see=" + String.join(",", see));
            return true;
        }
        if (args.length >= 2 && args[0].equalsIgnoreCase("place")) return placeCommand(sender, args);
        if (args.length >= 1 && args[0].equalsIgnoreCase("city")) return cityScan.command(sender, args);
        if (args.length >= 1 && args[0].equalsIgnoreCase("wall")) return wallMaps.command(sender, args);
        if (args.length == 2 && args[0].equalsIgnoreCase("status")) {
            Player p = Bukkit.getPlayerExact(args[1]);
            MapView v = p == null ? null : assigned.get(p.getUniqueId());
            if (v == null) { sender.sendMessage("PHONE " + args[1] + " none"); return true; }
            State s = states.get(p.getUniqueId());
            City c = cityFor(p.getWorld());
            sender.sendMessage("PHONE " + p.getName() + " map=" + v.getId() + " holding=" + holds(p, v)
                    + " open=" + p.getScoreboardTags().contains(openTag) + " city=" + (scanCity ? "scan" : tiles != null ? "maps" : "none") + " cityRead=" + (main != null && main.img != null)
                    + " pois=" + (main == null ? 0 : main.pois.size()) + " places=" + places.size() + " cursor=" + (s == null ? "none" : s.curX + "," + s.curY) + " route=" + routePin + "," + routeQuest + "," + routeLoot
                    + " shown=" + (c == null ? "none" : c == main ? "main:" + c.world : "own:" + c.world) + " zoom=" + (s == null ? 1 : s.bigZoom)
                    + " view=" + (s == null || s.vc == null ? "none" : Paths.num(s.vcx) + "," + Paths.num(s.vcz) + "," + Paths.num(s.vf) + (s.baseOpen ? ",big" : ",held")));
            return true;
        }
        if (args.length > 1 || (args.length == 1 && !args[0].equalsIgnoreCase("reload"))) {
            sender.sendMessage("/dphone [reload]: reload the config and re-read the city (after adding banner labels)");
            sender.sendMessage("/dphone status <player>: that player's phone map, view and cursor");
            sender.sendMessage("/dphone roads [info | scan [x1 z1 x2 z2] | cancel | show <player> [on|off]]: the GPS road grid");
            sender.sendMessage("/dphone path [info | add [name] [--nolink] | addat <world> <x> <y> <z> [id=<n>] [nolink] [name] | link|unlink <a> <b> | remove <id> | list [world] | show [on|off] | near | clear <world> confirm | dump [world]]: GPS paths the way goes along (floors, doors: no straight lines through walls)");
            sender.sendMessage("/dphone city [info | scan [x1 z1 x2 z2] [scale 0-4] [world] | cancel | use scan|maps | pixel <x> <z> [world] | remove <world>]: draw the phone's city from the world (no flying over it with maps); another world than the main city's gets its own");
            sender.sendMessage("/dphone zoom <player> [level]: the big map's zoom (sneak cycles it while it's open)");
            sender.sendMessage("/dphone wall create <name> <cols> <rows> [<world> <x> <y> <z> <face>] | remove <name> | repair <name> | list: a big city map on a wall (look at its bottom-left block)");
            sender.sendMessage("/dphone gps <player> [set <pin|quest|loot> <world> <radius> <x,y,z[;x,y,z...]> <label...> | active <slot|none> | clear [slot]]: the GPS target (gps.sk)");
            sender.sendMessage("/dphone mark <player> <entity-uuid> <color|#RRGGBB> <range> | <player> off | <player> status: a locator dot on an entity for one player (hits.sk)");
            sender.sendMessage("/dphone pv <entity-uuid>: who a personal-view entity is sent to (tests)");
            sender.sendMessage("/dphone nametag <viewer> <target>: whether TAB hides the target's name from the viewer (behind walls)");
            sender.sendMessage("/dphone carstat <plate> [<max speed> <acceleration> <steering>]: a driven car's stats in MTVehicles (garage.sk's mods)");
            sender.sendMessage("/dphone carfuel <plate> [level <n>] [add <n>] [usage <n>] [enabled true|false]: a car's fuel in MTVehicles (fuel.sk)");
            sender.sendMessage("/dphone place set <id> <base|shop|spawn|landmark|garage|quest|heist0-4> <world> <x> <z> <name...> | remove <id> | clear | list: icons on the phone's map (nav.sk)");
            sender.sendMessage("/dphone carsmooth [off|sync|track|all | together on|off | bundle on|off | via-clock on|off] | carprobe <plate> [<ticks>] | carbundle [player]: smoother MTVehicles cars (car stands sent every tick, as far as their driver, resynced together, one bundle per car and tick) and a probe log");
            sender.sendMessage("/dphone cam <player> | cam tune [<key> <value>] | cam probe <player> <ticks>: the chase camera in cars (carcam.sk; the probe logs a row a tick to camprobe.log)");
            sender.sendMessage("/dphone melee [player]: the melee weapons' swings and chain clocks (MeleeFx), or what a player holds");
            return true;
        }
        load();
        if (nametags != null) nametags.start(); // the nametags settings
        sender.sendMessage("DonatingPhone reloaded: " + pool.size() + " phone maps, city " + cityDesc + ".");
        return true;
    }

    /** /dphone place: Skript's places on the map. set, remove and clear answer nothing (nav.sk sends them every 10 s). */
    private boolean placeCommand(CommandSender sender, String[] args) {
        String sub = args[1].toLowerCase();
        if (sub.equals("set") && args.length >= 8) {
            Map.Entry<MapCursor.Type, NamedTextColor> st = placeStyle(args[3]);
            double x, z;
            try { x = Double.parseDouble(args[5]); z = Double.parseDouble(args[6]); } catch (NumberFormatException ex) { st = null; x = z = 0; }
            if (st == null) { sender.sendMessage("PLACE bad type or position: " + String.join(" ", args)); return true; }
            String name = String.join(" ", java.util.Arrays.copyOfRange(args, 7, args.length));
            Place np = new Place(args[4], x, z, st.getKey(), name, st.getValue());
            if (!np.equals(places.put(args[2], np))) placesVersion++;
            return true;
        }
        if (sub.equals("remove") && args.length == 3) { if (places.remove(args[2]) != null) placesVersion++; return true; }
        if (sub.equals("clear")) { places.clear(); placesVersion++; return true; } // silent: nav.sk clears every minute before sending them all again
        if (sub.equals("list")) {
            List<String> out = new ArrayList<>();
            for (Map.Entry<String, Place> e : places.entrySet()) out.add(e.getKey() + "=" + e.getValue().type().getKey().getKey() + "@" + Math.round(e.getValue().x()) + "," + Math.round(e.getValue().z()) + " " + e.getValue().label());
            sender.sendMessage("PLACES " + places.size() + ": " + String.join(" | ", out));
            return true;
        }
        sender.sendMessage("/dphone place set <id> <type> <world> <x> <z> <name...> | remove <id> | clear | list");
        return true;
    }

    // ---------- Drawing ----------

    private final class Renderer extends MapRenderer {
        Renderer() { super(true); } // contextual: one canvas per player


        @Override
        public void render(MapView view, MapCanvas canvas, Player p) {
            if (!holds(p, view)) return; // nobody sees a phone in the pocket
            City c = cityFor(p.getWorld());
            if (c == null) return;
            if (c.img == null && c == main && tiles != null) readCity(canvas, p);
            if (c.img == null) return;
            State s = states.computeIfAbsent(p.getUniqueId(), k -> new State());
            s.canvas = canvas;
            boolean open = p.getScoreboardTags().contains(openTag);
            Location l = p.getLocation();
            boolean here = c.world.equals(l.getWorld().getName());
            // The player in image pixels.
            double px = here ? c.ix(l.getX()) : c.w / 2.0;
            double pz = here ? c.iz(l.getZ()) : c.h / 2.0;

            // Held view follows you: re-center once you're `step` screen pixels from the middle.
            if (Double.isNaN(s.cx) || Math.abs(px - s.cx) * zoom >= step || Math.abs(pz - s.cz) * zoom >= step) {
                s.cx = Math.round(px * zoom) / (double) zoom;
                s.cz = Math.round(pz * zoom) / (double) zoom;
            }
            // The view: center (cx, cz) in image pixels, f image pixels per screen pixel. The big map: the whole city
            // (zoom 1), or zoomed in around you (sneak), re-centered like the held view and never past the city's edge.
            List<Integer> levels = open ? zoomLevels(c) : List.of(1);
            int bz = open && here && levels.contains(s.bigZoom) ? s.bigZoom : 1;
            double f = open ? Math.max(MIN_F, c.fit() / bz) : 1.0 / zoom;
            double cx = s.cx, cz = s.cz;
            if (open && bz == 1) { cx = c.w / 2.0; cz = c.h / 2.0; }
            else if (open) {
                if (Double.isNaN(s.bcx) || s.bf != f || Math.abs(px - s.bcx) / f >= step || Math.abs(pz - s.bcz) / f >= step) {
                    s.bcx = Math.round(px / f) * f;
                    s.bcz = Math.round(pz / f) * f;
                    s.bf = f;
                }
                cx = clampView(s.bcx, c.w, f);
                cz = clampView(s.bcz, c.h, f);
            }
            // The strip's zoom part (not for passengers: sneaking gets them out).
            String zh = !open || !here || levels.size() < 2 || p.isInsideVehicle() ? "" : bz == 1 ? "Shift: zoom" : "Shift: x" + bz;
            if (!zh.equals(s.zoomHint)) { s.zoomHint = zh; s.drawn = Long.MIN_VALUE; }

            // The GPS: its route on the map, the target's name and distance in the held phone's strip.
            Gps.Target gt = gps.target(p);
            boolean gpsHere = gt != null && gt.world.getName().equals(c.world);
            // Drivers open the big map too since 2026-10-21 (the key's right-click; F locks the car: garage.sk).
            boolean carKey = holdsKey(p);
            String strip = !open && gt != null ? gpsStrip(gt, false) : carKey ? "R: map  F: lock" : hint;
            boolean grid = open && c == main && gps.showRoads(p);
            // Redraw only when the view, the route, the strip or the grid view changed (the held view already
            // redraws on every re-center, so the route follows you there; the big map every 4 screen pixels of the way).
            long gpsKey = gt == null ? 0 : gt.version * 1_000_003L + (open ? Math.round(gt.left / Math.max(2, 4 * f * c.bpp)) : 0);
            long key = open ? (((bz * 1_000_003L + Math.round(cx / f)) * 1_000_003L + Math.round(cz / f)) * 31 + gpsKey) * 2 + (grid ? 1 : 0)
                    : ((((long) Math.round(cx * zoom) << 32) ^ (Math.round(cz * zoom) & 0xffffffffL)) * 31 + gpsKey) * 31 + strip.hashCode();
            if (key != s.drawn || s.viewId != view.getId() || s.vc != c || open != s.baseOpen) {
                for (int y = 0; y < 128; y++) {
                    int iz = (int) Math.floor(cz + (y - 64 + 0.5) * f);
                    for (int x = 0; x < 128; x++) {
                        int ix = (int) Math.floor(cx + (x - 64 + 0.5) * f);
                        boolean in = ix >= 0 && iz >= 0 && ix < c.w && iz < c.h;
                        s.base[y * 128 + x] = in ? c.img[iz * c.w + ix] : 0; // 0 = see-through: the phone's screen texture
                    }
                }
                if (grid) drawGrid(s, c, cx, cz, f);
                if (gpsHere) drawRoute(s, gt, c, here ? px : Double.NaN, pz, cx, cz, f, open);
                if (!open && !strip.isEmpty()) for (int i = 119 * 128; i < 128 * 128; i++) s.base[i] = STRIP;
                for (int i = 0; i < s.base.length; i++) canvas.setPixel(i % 128, i / 128, s.base[i]); // only changed pixels are re-sent
                if (!open && !strip.isEmpty()) {
                    canvas.drawText(Math.max(0, (128 - MinecraftFont.Font.getWidth(strip)) / 2), 120, MinecraftFont.Font, "§34;" + strip);
                }
                s.drawn = key;
                s.viewId = view.getId();
                s.baseOpen = open;
                s.vc = c;
                s.vcx = cx;
                s.vcz = cz;
                s.vf = f;
                s.curX = s.curY = -1; // the redraw wiped the cursor
                if (open) {
                    bigStrip(s);
                    moveCursor(p, s);
                }
            }

            MapCursorCollection cursors = new MapCursorCollection();
            for (Poi poi : c.pois) put(cursors, poi.ix, poi.iz, cx, cz, f, poi.dir, poi.type, poi.caption);
            // Places (nav.sk): colored banners; the name only on the big map, while the cursor is on it.
            if (placesOn && (open || placesHeld)) {
                Place hp = null;
                double hb = hoverRadius + 0.5;
                if (open && s.curX >= 0) for (Place pl : places.values()) {
                    if (!pl.world().equals(c.world)) continue;
                    double d = Math.hypot((c.ix(pl.x()) - cx) / f + 64 - s.curX, (c.iz(pl.z()) - cz) / f + 64 - s.curY);
                    if (d < hb) { hb = d; hp = pl; }
                }
                for (Place pl : places.values()) {
                    if (!pl.world().equals(c.world)) continue;
                    Component cap = pl == hp ? Component.text(pl.label(), pl.color()) : null;
                    // Direction 8, like vanilla's banners (MapItemSavedData.toggleBanner adds them at 180 degrees): 0 draws them upside down.
                    put(cursors, c.ix(pl.x()), c.iz(pl.z()), cx, cz, f, (byte) 8, pl.type(), cap);
                }
            }
            // Passive players: a green arrow. Name only on the big map, while the cursor is on it.
            Player hovered = null;
            double best = hoverRadius + 0.5;
            List<Player> shown = new ArrayList<>();
            World cw = Bukkit.getWorld(c.world);
            if (cw != null) for (Player o : cw.getPlayers()) {
                if (o == p || !o.getScoreboardTags().contains(passiveTag) || !p.canSee(o)) continue;
                shown.add(o);
                if (open && s.curX >= 0) {
                    Location ol = o.getLocation();
                    double d = Math.hypot((c.ix(ol.getX()) - cx) / f + 64 - s.curX, (c.iz(ol.getZ()) - cz) / f + 64 - s.curY);
                    if (d < best) { best = d; hovered = o; }
                }
            }
            for (Player o : shown) {
                Location ol = o.getLocation();
                MapCursor.Type type = open && smallArrows ? SMALL_PASSIVE : MapCursor.Type.FRAME;
                Component name = o == hovered ? Component.text(o.getName(), NamedTextColor.GREEN) : null;
                put(cursors, c.ix(ol.getX()), c.iz(ol.getZ()), cx, cz, f, dir(ol.getYaw()), type, name);
            }
            MapCursor.Type self = open && smallArrows ? SMALL_SELF : MapCursor.Type.PLAYER;
            if (here && !put(cursors, px, pz, cx, cz, f, dir(l.getYaw()), self, null)) {
                // outside the city (big map): small marker on the nearest edge
                byte ex = (byte) Math.max(-128, Math.min(127, Math.round((px - cx) / f * 2)));
                byte ez = (byte) Math.max(-128, Math.min(127, Math.round((pz - cz) / f * 2)));
                cursors.addCursor(new MapCursor(ex, ez, (byte) 0, MapCursor.Type.PLAYER_OFF_MAP, true, (Component) null));
            }
            // The GPS targets: a red X for a pin, a target mark for a quest, a white X for the base; names on
            // the big map. The one on hold shows too (without a route). Off the view only the active one sits on
            // the edge, toward it.
            Gps.Nav nav = gps.nav(p);
            if (nav != null) for (Gps.Target t : nav.slots.values()) {
                if (!t.world.getName().equals(c.world)) continue;
                MapCursor.Type type = t.kind.equals("pin") ? MapCursor.Type.RED_X : t.kind.equals("quest") ? MapCursor.Type.TARGET_POINT : MapCursor.Type.TARGET_X;
                NamedTextColor tc = t.kind.equals("pin") ? NamedTextColor.LIGHT_PURPLE : t.kind.equals("quest") ? NamedTextColor.GOLD : NamedTextColor.AQUA;
                Component cap = open ? Component.text(t.label, tc) : null;
                for (double[] q : t.pts) {
                    double tix = c.ix(q[0]), tiz = c.iz(q[2]);
                    if (put(cursors, tix, tiz, cx, cz, f, (byte) 0, type, cap)) continue;
                    if (t != gt || q[0] != gt.x || q[2] != gt.z) continue;
                    double mx = (tix - cx) / f * 2, mz = (tiz - cz) / f * 2, m = Math.max(Math.abs(mx), Math.abs(mz));
                    cursors.addCursor(new MapCursor((byte) Math.round(mx * 120 / m), (byte) Math.round(mz * 120 / m), (byte) 0, type, true, (Component) null));
                }
            }
            canvas.setCursors(cursors);
        }

        /** A zoomed view's center along one side: half a screen from each edge (a city smaller than the view stays centered). */
        private static double clampView(double v, int size, double f) {
            double half = 64 * f;
            return size <= 2 * half ? size / 2.0 : Math.max(half, Math.min(size - half, v));
        }

        /**
         * The GPS route over the view: from where you are (px, pz in image pixels; NaN = not in this city's world) along
         * a staff path's points, or cell by cell over the road grid, to the target.
         */
        private void drawRoute(State s, Gps.Target t, City c, double px, double pz, double cx, double cz, double f, boolean open) {
            int n;
            double[] ixs, izs;
            if (t.line != null) {
                if (Double.isNaN(px)) return;
                n = t.line.length + 1;
                ixs = new double[n];
                izs = new double[n];
                ixs[0] = px;
                izs[0] = pz;
                for (int i = 1; i < n; i++) { ixs[i] = c.ix(t.line[i - 1][0]); izs[i] = c.iz(t.line[i - 1][2]); }
            } else {
                Roads r = gps.roads();
                if (c != main || r == null || t.fieldRoads != r || t.walk.length == 0) return;
                n = t.walk.length + 1;
                ixs = new double[n];
                izs = new double[n];
                for (int i = 0; i < t.walk.length; i++) { ixs[i] = (t.walk[i] % r.w + 0.5) * r.k; izs[i] = (t.walk[i] / r.w + 0.5) * r.k; }
                ixs[n - 1] = c.ix(t.x); // on to the target itself
                izs[n - 1] = c.iz(t.z);
            }
            byte col = t.kind.equals("pin") ? routePin : t.kind.equals("quest") ? routeQuest : routeLoot;
            int[] xs = new int[n], ys = new int[n];
            for (int i = 0; i < n; i++) {
                xs[i] = (int) Math.floor((ixs[i] - cx) / f + 64);
                ys[i] = (int) Math.floor((izs[i] - cz) / f + 64);
            }
            // The held phone: 2 pixels wide with a black edge (it has to stand out on any street); the big map: 1.
            if (!open) for (int i = 1; i < n; i++) line(s.base, xs[i - 1], ys[i - 1], xs[i], ys[i], BLACK, -1, 2);
            for (int i = 1; i < n; i++) line(s.base, xs[i - 1], ys[i - 1], xs[i], ys[i], col, 0, open ? 0 : 1);
        }

        /** Staff view (/dphone roads show): road cells yellow, walls and water red, on the big map. */
        private void drawGrid(State s, City c, double cx, double cz, double f) {
            Roads r = gps.roads();
            if (r == null) return;
            for (int y = 0; y < 128; y++) {
                int iz = (int) Math.floor(cz + (y - 64 + 0.5) * f);
                for (int x = 0; x < 128; x++) {
                    int ix = (int) Math.floor(cx + (x - 64 + 0.5) * f);
                    if (ix < 0 || iz < 0 || ix >= c.w || iz >= c.h) continue;
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
            int imgW = main.w;
            byte[] px = new byte[imgW * main.h];
            List<Poi> found = new ArrayList<>();
            for (int r = 0; r < tiles.length; r++) for (int col = 0; col < tiles[r].length; col++) {
                MapView t = tiles[r][col];
                List<MapRenderer> base = t.getRenderers();
                if (base.isEmpty() || base.get(0) == this || base.get(0) instanceof WallMaps.Tile) { // a city map must not be a phone or wall map
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
            main.pois.clear();
            main.pois.addAll(found);
            main.img = px;
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
