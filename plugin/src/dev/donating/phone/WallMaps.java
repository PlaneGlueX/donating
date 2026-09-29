package dev.donating.phone;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.block.BlockFace;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Entity;
import org.bukkit.entity.GlowItemFrame;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.hanging.HangingBreakEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.MapMeta;
import org.bukkit.map.MapCanvas;
import org.bukkit.map.MapCursor;
import org.bukkit.map.MapCursorCollection;
import org.bukkit.map.MapRenderer;
import org.bukkit.map.MapView;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;

/**
 * Wall maps (2026-09-29, the ideas list: "a big wall map at the base"): /dphone wall create <name> <cols> <rows> hangs
 * cols x rows invisible glow item frames on the wall block you look at (it's the bottom-left one), each holding a map
 * of its own id, and together they show the whole city (the phone's city: the scan or the city-maps) with every place
 * named and a "You are here" arrow. Staff: create, remove, list. Saved in walls.yml (the frames and map ids travel with
 * the world); the maps draw nothing without this plugin. Same picture for everyone (no players on it).
 */
final class WallMaps implements Listener {
    static final int MAX = 8; // frames a side

    record Wall(String name, String world, int cols, int rows, List<Integer> ids, int x, int y, int z, BlockFace face) {}

    private final PhonePlugin plugin;
    private final Map<String, Wall> walls = new LinkedHashMap<>();
    private final List<Integer> free = new ArrayList<>(); // map ids of removed walls (every frame gone), used again first
    private final byte background;

    WallMaps(PhonePlugin plugin, byte background) {
        this.plugin = plugin;
        this.background = background;
    }

    private File file() { return new File(plugin.getDataFolder(), "walls.yml"); }

    // Only /dphone wall remove takes a frame down (review fix: a creative builder's click broke a tile, and the block
    // behind being broken popped it). Kill commands still remove them: /dphone wall repair hangs them again.
    // A frame of a removed wall left in an unloaded chunk isn't protected: a builder breaks it in creative.
    @EventHandler(priority = EventPriority.LOWEST)
    public void onBreak(HangingBreakEvent e) { if (liveWall(e.getEntity())) e.setCancelled(true); }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onDamage(EntityDamageEvent e) { if (liveWall(e.getEntity())) e.setCancelled(true); }

    private boolean liveWall(Entity e) {
        if (!e.getScoreboardTags().contains("donating_wall")) return false;
        for (String t : e.getScoreboardTags()) if (t.startsWith("wall_") && walls.containsKey(t.substring(5))) return true;
        return false;
    }

    /** The thin slab a frame hanging in this block on this face takes (review fix: any frame or painting that covers it,
     *  whatever its size, blocks a new frame there). */
    private static org.bukkit.util.BoundingBox slot(Block in, BlockFace face) {
        double x = in.getX(), y = in.getY(), z = in.getZ(), t = 0.0625, e = 0.01;
        return switch (face) {
            case SOUTH -> new org.bukkit.util.BoundingBox(x + e, y + e, z, x + 1 - e, y + 1 - e, z + t);
            case NORTH -> new org.bukkit.util.BoundingBox(x + e, y + e, z + 1 - t, x + 1 - e, y + 1 - e, z + 1);
            case EAST -> new org.bukkit.util.BoundingBox(x, y + e, z + e, x + t, y + 1 - e, z + 1 - e);
            default -> new org.bukkit.util.BoundingBox(x + 1 - t, y + e, z + e, x + 1, y + 1 - e, z + 1 - e);
        };
    }

    /** "Right" along a wall seen from in front of it: {dx, dz}; null for a floor or ceiling. */
    private static int[] right(BlockFace face) {
        return switch (face) {
            case SOUTH -> new int[] {1, 0};
            case NORTH -> new int[] {-1, 0};
            case EAST -> new int[] {0, -1};
            case WEST -> new int[] {0, 1};
            default -> null;
        };
    }

    /** The block tile i's frame hangs in (tile i is row i / cols from the top, column i % cols from the left). */
    private static Block frameBlock(Wall w, World world, int i) {
        int[] rt = right(w.face());
        int c = i % w.cols(), r = w.rows() - 1 - i / w.cols();
        return world.getBlockAt(w.x() + rt[0] * c, w.y() + r, w.z() + rt[1] * c).getRelative(w.face());
    }

    /** The wall's frame at tile i, if its chunk is loaded and it's there. */
    private GlowItemFrame frameAt(Wall w, World world, int i) {
        Block in = frameBlock(w, world, i);
        for (Entity e : world.getNearbyEntities(org.bukkit.util.BoundingBox.of(in), x -> x instanceof GlowItemFrame && x.getScoreboardTags().contains("wall_" + w.name())))
            return (GlowItemFrame) e;
        return null;
    }

    private static ItemStack mapItem(int id) {
        ItemStack map = new ItemStack(Material.FILLED_MAP);
        MapMeta meta = (MapMeta) map.getItemMeta();
        meta.setMapView(Bukkit.getMap(id));
        map.setItemMeta(meta);
        return map;
    }

    private void hang(Wall w, World world, int i) {
        Block in = frameBlock(w, world, i);
        ItemStack map = mapItem(w.ids().get(i));
        world.spawn(in.getLocation(), GlowItemFrame.class, fr -> {
            fr.setFacingDirection(w.face(), true);
            fr.setItem(map, false);
            fr.setFixed(true);
            fr.setVisible(false);
            fr.setInvulnerable(true);
            fr.addScoreboardTag("donating_wall");
            fr.addScoreboardTag("wall_" + w.name());
        });
    }

    List<String> names() { return new ArrayList<>(walls.keySet()); }

    /** At every load: read walls.yml and put a tile renderer on each wall map. */
    void load() {
        walls.clear();
        free.clear();
        YamlConfiguration y = YamlConfiguration.loadConfiguration(file());
        for (int id : y.getIntegerList("free")) if (Bukkit.getMap(id) != null) free.add(id);
        ConfigurationSection s = y.getConfigurationSection("walls");
        if (s != null) for (String name : s.getKeys(false)) {
            ConfigurationSection w = s.getConfigurationSection(name);
            if (w == null) continue;
            BlockFace face;
            try { face = BlockFace.valueOf(w.getString("face", "SOUTH")); } catch (IllegalArgumentException e) { face = BlockFace.SOUTH; }
            Wall wall = new Wall(name, w.getString("world", ""), w.getInt("cols"), w.getInt("rows"), w.getIntegerList("ids"), w.getInt("x"), w.getInt("y"), w.getInt("z"), face);
            if (wall.ids().size() != wall.cols() * wall.rows()) { plugin.getLogger().warning("walls.yml: wall " + name + " has the wrong number of maps"); continue; }
            walls.put(name, wall);
        }
        for (Wall w : walls.values()) for (int i = 0; i < w.ids().size(); i++) {
            if (plugin.isPhoneOrCityMap(w.ids().get(i))) { plugin.getLogger().warning("wall " + w.name() + ": map " + w.ids().get(i) + " is a phone or city map: not drawn"); continue; }
            attach(w, i);
        }
    }

    /** Every wall's map ids (loadCity refuses them as city maps). */
    List<Integer> allIds() {
        List<Integer> out = new ArrayList<>();
        YamlConfiguration y = YamlConfiguration.loadConfiguration(file());
        ConfigurationSection s = y.getConfigurationSection("walls");
        if (s != null) for (String name : s.getKeys(false)) out.addAll(s.getIntegerList(name + ".ids"));
        return out;
    }

    private void save() throws IOException {
        YamlConfiguration y = new YamlConfiguration();
        y.options().setHeader(List.of("Wall maps (/dphone wall create): made by the plugin, don't edit."));
        y.set("free", free);
        for (Wall w : walls.values()) {
            String k = "walls." + w.name() + ".";
            y.set(k + "world", w.world());
            y.set(k + "cols", w.cols());
            y.set(k + "rows", w.rows());
            y.set(k + "ids", w.ids());
            y.set(k + "x", w.x());
            y.set(k + "y", w.y());
            y.set(k + "z", w.z());
            y.set(k + "face", w.face().name());
        }
        y.save(file());
    }

    private void attach(Wall w, int index) {
        MapView v = Bukkit.getMap(w.ids().get(index));
        if (v == null) { plugin.getLogger().warning("wall " + w.name() + ": map " + w.ids().get(index) + " is missing"); return; }
        v.setLocked(true);
        v.setTrackingPosition(false);
        for (MapRenderer r : v.getRenderers()) v.removeRenderer(r);
        v.addRenderer(new Tile(w, index));
    }

    /** /dphone wall create <name> <cols> <rows> [<world> <x> <y> <z> <north|south|east|west>] | remove <name> | list. */
    boolean command(CommandSender who, String[] args) {
        String sub = args.length < 2 ? "list" : args[1].toLowerCase();
        if (sub.equals("list")) {
            for (Wall w : walls.values()) {
                World world = Bukkit.getWorld(w.world());
                int here = 0, loaded = 0;
                if (world != null) for (int i = 0; i < w.ids().size(); i++) {
                    if (!world.isChunkLoaded(frameBlock(w, world, i).getX() >> 4, frameBlock(w, world, i).getZ() >> 4)) continue;
                    loaded++;
                    if (frameAt(w, world, i) != null) here++;
                }
                who.sendMessage("WALL " + w.name() + " " + w.cols() + "x" + w.rows() + " at " + w.world() + " " + w.x() + " " + w.y() + " " + w.z() + " facing " + w.face().name().toLowerCase()
                        + " ids=" + w.ids().toString().replace(" ", "").replace("[", "").replace("]", "") + " frames=" + here + "/" + loaded + " loaded"
                        + (here < loaded ? " (missing: /dphone wall repair " + w.name() + ")" : ""));
            }
            who.sendMessage("WALL " + walls.size() + " wall(s)");
            return true;
        }
        if (sub.equals("remove") && args.length == 3) {
            Wall w = walls.remove(args[2].toLowerCase());
            if (w == null) { who.sendMessage("WALL no wall " + args[2]); return true; }
            int n = 0;
            World world = Bukkit.getWorld(w.world());
            if (world != null) for (Entity e : world.getEntitiesByClass(GlowItemFrame.class)) if (e.getScoreboardTags().contains("wall_" + w.name())) { e.remove(); n++; }
            // Its maps are used again only when no frame of it is left anywhere (one in an unloaded chunk would show the new wall).
            if (n == w.ids().size()) for (int id : w.ids()) {
                MapView v = Bukkit.getMap(id);
                if (v != null) for (MapRenderer r : v.getRenderers()) v.removeRenderer(r);
                free.add(id);
            }
            try { save(); } catch (IOException e) { who.sendMessage("WALL can't save walls.yml: " + e.getMessage()); }
            who.sendMessage("WALL " + w.name() + " removed (" + n + " of " + w.ids().size() + " frames; any in unloaded chunks: break them in creative)");
            return true;
        }
        if (sub.equals("create") && (args.length == 5 || args.length == 10)) return create(who, args);
        if (sub.equals("repair") && args.length == 3) {
            // Hangs any missing frame again with its own map (a kill command or an old world copy lost it).
            Wall w = walls.get(args[2].toLowerCase());
            World world = w == null ? null : Bukkit.getWorld(w.world());
            if (world == null) { who.sendMessage("WALL no wall " + args[2]); return true; }
            int hung = 0, fixed = 0, unloaded = 0;
            for (int i = 0; i < w.ids().size(); i++) {
                Block in = frameBlock(w, world, i);
                if (!world.isChunkLoaded(in.getX() >> 4, in.getZ() >> 4)) { unloaded++; continue; }
                GlowItemFrame fr = frameAt(w, world, i);
                if (fr == null) { hang(w, world, i); hung++; }
                else if (fr.getItem().getType() != Material.FILLED_MAP || !(fr.getItem().getItemMeta() instanceof MapMeta mm) || mm.getMapView() == null
                        || mm.getMapView().getId() != w.ids().get(i)) { fr.setItem(mapItem(w.ids().get(i)), false); fixed++; }
            }
            who.sendMessage("WALL " + w.name() + " repaired: " + hung + " frame(s) hung again, " + fixed + " map(s) put back" + (unloaded > 0 ? ", " + unloaded + " in unloaded chunks (go near them and repair again)" : ""));
            return true;
        }
        who.sendMessage("/dphone wall create <name> <cols> <rows> (look at the wall's bottom-left block) | create <name> <cols> <rows> <world> <x> <y> <z> <north|south|east|west> | remove <name> | repair <name> | list");
        return true;
    }

    private boolean create(CommandSender who, String[] args) {
        String name = args[2].toLowerCase();
        if (!name.matches("[a-z0-9_]{1,24}")) { who.sendMessage("WALL a name is 1-24 letters, digits or _"); return true; }
        if (walls.containsKey(name)) { who.sendMessage("WALL " + name + " exists: /dphone wall remove " + name + " first"); return true; }
        int cols, rows;
        try { cols = Integer.parseInt(args[3]); rows = Integer.parseInt(args[4]); } catch (NumberFormatException e) { who.sendMessage("WALL cols and rows are numbers"); return true; }
        if (cols < 1 || rows < 1 || cols > MAX || rows > MAX) { who.sendMessage("WALL 1-" + MAX + " maps a side"); return true; }
        if (!plugin.hasCity()) { who.sendMessage("WALL there's no city yet (/dphone city scan)"); return true; }
        Block back;
        BlockFace face;
        if (args.length == 10) {
            World world = Bukkit.getWorld(args[5]);
            try {
                face = BlockFace.valueOf(args[9].toUpperCase());
                back = world == null ? null : world.getBlockAt(Integer.parseInt(args[6]), Integer.parseInt(args[7]), Integer.parseInt(args[8]));
            } catch (IllegalArgumentException e) { who.sendMessage("WALL bad position or face"); return true; }
            if (back == null) { who.sendMessage("WALL no world " + args[5]); return true; }
        } else {
            if (!(who instanceof Player p)) { who.sendMessage("WALL in game only (look at the wall), or give the position"); return true; }
            back = p.getTargetBlockExact(8);
            face = p.getTargetBlockFace(8);
            if (back == null || face == null) { who.sendMessage("WALL look at the wall's bottom-left block (within 8 blocks)"); return true; }
        }
        int[] rt = right(face); // "right" along the wall, seen from in front of it
        if (rt == null) { who.sendMessage("WALL only on a wall (a north, south, east or west face)"); return true; }
        int rx = rt[0], rz = rt[1];
        // Every frame needs a solid block behind it and room in front.
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
            Block b = back.getRelative(rx * c, r, rz * c);
            Block in = b.getRelative(face);
            if (!b.getType().isSolid()) { who.sendMessage("WALL needs a solid block behind every frame: " + b.getX() + " " + b.getY() + " " + b.getZ() + " is " + b.getType().getKey().getKey()); return true; }
            if (!in.isPassable() || !in.getWorld().getNearbyEntities(slot(in, face), e -> e instanceof org.bukkit.entity.Hanging).isEmpty()) {
                who.sendMessage("WALL no room for a frame at " + in.getX() + " " + in.getY() + " " + in.getZ());
                return true;
            }
        }
        World world = back.getWorld();
        List<Integer> ids = new ArrayList<>();
        for (int i = 0; i < cols * rows; i++) {
            MapView v = free.isEmpty() ? null : Bukkit.getMap(free.remove(0));
            ids.add((v != null ? v : Bukkit.createMap(world)).getId());
        }
        Wall w = new Wall(name, world.getName(), cols, rows, ids, back.getX(), back.getY(), back.getZ(), face);
        walls.put(name, w);
        try { save(); } catch (IOException e) { who.sendMessage("WALL can't save walls.yml: " + e.getMessage()); }
        for (int i = 0; i < ids.size(); i++) attach(w, i);
        for (int i = 0; i < ids.size(); i++) hang(w, world, i);
        who.sendMessage("WALL " + name + " " + cols + "x" + rows + " made (maps " + ids.toString().replace(" ", "") + "): the whole city, its places named");
        return true;
    }

    /** One map of a wall: its part of the city, drawn again when the city changes; the places every second. */
    final class Tile extends MapRenderer {
        final Wall w;
        final int col, row;
        byte[] drawn;           // the city image it shows
        long cursorsAt;
        long placesSeen = -1;
        MapCursorCollection cursors = new MapCursorCollection();

        Tile(Wall w, int index) {
            super(false); // the same for everyone
            this.w = w;
            col = index % w.cols();
            row = index / w.cols();
        }

        @Override
        public void render(MapView view, MapCanvas canvas, Player p) {
            byte[] img = plugin.cityImage(canvas, p);
            if (img == null) return;
            int imgW = plugin.imgW(), imgH = plugin.imgH();
            int wallW = w.cols() * 128, wallH = w.rows() * 128;
            // The whole city fits the wall, centered: f city pixels per wall pixel.
            double f = Math.max(imgW / (double) wallW, imgH / (double) wallH);
            if (img != drawn) {
                for (int y = 0; y < 128; y++) {
                    int iz = (int) Math.floor((row * 128 + y + 0.5 - wallH / 2.0) * f + imgH / 2.0);
                    for (int x = 0; x < 128; x++) {
                        int ix = (int) Math.floor((col * 128 + x + 0.5 - wallW / 2.0) * f + imgW / 2.0);
                        byte b = ix >= 0 && iz >= 0 && ix < imgW && iz < imgH ? img[iz * imgW + ix] : 0;
                        canvas.setPixel(x, y, b == 0 ? background : b);
                    }
                }
                drawn = img;
                placesSeen = -1;
            }
            long now = System.currentTimeMillis();
            if (placesSeen != plugin.placesVersion() || now - cursorsAt > 1000) {
                placesSeen = plugin.placesVersion();
                cursorsAt = now;
                MapCursorCollection c = new MapCursorCollection();
                World cw = plugin.cityWorld();
                if (cw != null) {
                    // The city maps' own banner labels, like the phones show them (image pixels).
                    for (PhonePlugin.Poi poi : plugin.poiList()) putImage(c, poi.ix(), poi.iz(), f, wallW, wallH, imgW, imgH, poi.dir(), poi.type(), poi.caption());
                    // Places only while the phones show them (config places.enabled: review fix).
                    if (plugin.placesShown()) for (PhonePlugin.Place pl : plugin.placeList()) {
                        if (pl.world().equals(cw.getName())) put(c, pl.x(), pl.z(), f, wallW, wallH, imgW, imgH, (byte) 8, pl.type(), Component.text(pl.label(), pl.color()));
                    }
                    if (cw.getName().equals(w.world())) {
                        byte dir = switch (w.face()) { case SOUTH -> 0; case WEST -> 4; case NORTH -> 8; default -> 12; };
                        put(c, w.x() + 0.5 + w.face().getModX(), w.z() + 0.5 + w.face().getModZ(), f, wallW, wallH, imgW, imgH, dir, MapCursor.Type.FRAME, Component.text("You are here", NamedTextColor.WHITE));
                    }
                }
                cursors = c;
            }
            canvas.setCursors(cursors);
        }

        /** A world point -> an icon on this tile (half pixels from its middle), if it's on this tile. */
        private void put(MapCursorCollection c, double wx, double wz, double f, int wallW, int wallH, int imgW, int imgH, byte dir, MapCursor.Type type, Component caption) {
            putImage(c, plugin.toImageX(wx), plugin.toImageZ(wz), f, wallW, wallH, imgW, imgH, dir, type, caption);
        }

        /** A city-image point -> an icon on this tile, if it's on this tile. */
        private void putImage(MapCursorCollection c, double ix, double iz, double f, int wallW, int wallH, int imgW, int imgH, byte dir, MapCursor.Type type, Component caption) {
            double X = (ix - imgW / 2.0) / f + wallW / 2.0 - col * 128, Y = (iz - imgH / 2.0) / f + wallH / 2.0 - row * 128;
            if (X < 0 || Y < 0 || X >= 128 || Y >= 128) return;
            // Clamped, not dropped: a point in the last quarter pixel of a tile would round off it and show on no tile.
            long mx = Math.max(-128, Math.min(127, Math.round((X - 64) * 2))), mz = Math.max(-128, Math.min(127, Math.round((Y - 64) * 2)));
            c.addCursor(new MapCursor((byte) mx, (byte) mz, dir, type, true, caption));
        }
    }
}
