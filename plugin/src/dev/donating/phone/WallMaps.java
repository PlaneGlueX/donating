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
final class WallMaps {
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
        for (Wall w : walls.values()) for (int i = 0; i < w.ids().size(); i++) attach(w, i);
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
            for (Wall w : walls.values()) who.sendMessage("WALL " + w.name() + " " + w.cols() + "x" + w.rows() + " at " + w.world() + " " + w.x() + " " + w.y() + " " + w.z() + " facing " + w.face().name().toLowerCase()
                    + " ids=" + w.ids().toString().replace(" ", "").replace("[", "").replace("]", ""));
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
        who.sendMessage("/dphone wall create <name> <cols> <rows> (look at the wall's bottom-left block) | create <name> <cols> <rows> <world> <x> <y> <z> <north|south|east|west> | remove <name> | list");
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
        int rx, rz; // "right" along the wall, seen from in front of it
        switch (face) {
            case SOUTH -> { rx = 1; rz = 0; }
            case NORTH -> { rx = -1; rz = 0; }
            case EAST -> { rx = 0; rz = -1; }
            case WEST -> { rx = 0; rz = 1; }
            default -> { who.sendMessage("WALL only on a wall (a north, south, east or west face)"); return true; }
        }
        // Every frame needs a solid block behind it and room in front.
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
            Block b = back.getRelative(rx * c, r, rz * c);
            Block in = b.getRelative(face);
            if (!b.getType().isSolid()) { who.sendMessage("WALL needs a solid block behind every frame: " + b.getX() + " " + b.getY() + " " + b.getZ() + " is " + b.getType().getKey().getKey()); return true; }
            if (!in.isPassable() || !in.getWorld().getNearbyEntities(org.bukkit.util.BoundingBox.of(in).expand(-0.1), e -> e instanceof org.bukkit.entity.Hanging).isEmpty()) {
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
        // Tile i is row i / cols from the top, column i % cols from the left.
        for (int i = 0; i < ids.size(); i++) {
            int c = i % cols, r = rows - 1 - i / cols;
            Block in = back.getRelative(rx * c, r, rz * c).getRelative(face);
            ItemStack map = new ItemStack(Material.FILLED_MAP);
            MapMeta meta = (MapMeta) map.getItemMeta();
            meta.setMapView(Bukkit.getMap(ids.get(i)));
            map.setItemMeta(meta);
            BlockFace f = face;
            world.spawn(in.getLocation(), GlowItemFrame.class, fr -> {
                fr.setFacingDirection(f, true);
                fr.setItem(map, false);
                fr.setFixed(true);
                fr.setVisible(false);
                fr.setInvulnerable(true);
                fr.addScoreboardTag("donating_wall");
                fr.addScoreboardTag("wall_" + name);
            });
        }
        who.sendMessage("WALL " + name + " " + cols + "x" + rows + " made (maps " + ids.toString().replace(" ", "") + "): the whole city, its places named");
        return true;
    }

    /** One map of a wall: its part of the city, drawn again when the city changes; the places every second. */
    private final class Tile extends MapRenderer {
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
                    for (PhonePlugin.Place pl : plugin.placeList()) {
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
            double ix = plugin.toImageX(wx), iz = plugin.toImageZ(wz);
            double X = (ix - imgW / 2.0) / f + wallW / 2.0 - col * 128, Y = (iz - imgH / 2.0) / f + wallH / 2.0 - row * 128;
            if (X < 0 || Y < 0 || X >= 128 || Y >= 128) return;
            long mx = Math.round((X - 64) * 2), mz = Math.round((Y - 64) * 2);
            if (mx < -128 || mx > 127 || mz < -128 || mz > 127) return;
            c.addCursor(new MapCursor((byte) mx, (byte) mz, dir, type, true, caption));
        }
    }
}
