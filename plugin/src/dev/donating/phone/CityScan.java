package dev.donating.phone;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.BitSet;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import org.bukkit.Bukkit;
import org.bukkit.ChunkSnapshot;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.BlockFace;
import org.bukkit.block.BlockSupport;
import org.bukkit.block.data.BlockData;
import org.bukkit.block.data.Waterlogged;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.map.MapPalette;

/**
 * The city map drawn from the world (/dphone city scan), so nobody has to fly over the city holding maps: the phone's
 * city image is made the way vanilla fills a map (MapItem.update in 1.21.11: each pixel is the most common map color
 * of its blocks' tops, shaded by how much higher it is than the pixel north of it; water by its depth, in a checker),
 * saved as city.bin and used instead of the city-maps once city.yml says "source: scan". Labels come from the places
 * (nav.sk's POIs), not banners.
 * The scan reads chunk snapshots like the road scan: at most 1 new chunk a tick, 4 at a time, none while the server
 * is behind, never generating land (a missing chunk stays see-through), the work on its own thread.
 */
final class CityScan {
    static final int MAGIC = 0x44504331; // "DPC1"
    static final int MAX_SIDE = 2048;    // image pixels per side
    static final int MAX_CHUNKS = 40_000; // more needs "confirm" (a 3.2 km square; a typo can't queue millions)

    /** The saved image: pixel (x, z) is px[z * w + x], its top-left corner at block (x0, z0), bpp blocks per pixel. */
    record Image(String world, int x0, int z0, int bpp, int w, int h, long made, byte[] px) {
        int scale() { return Integer.numberOfTrailingZeros(bpp); }
        String box() { return x0 + " " + z0 + " " + (x0 + w * bpp - 1) + " " + (z0 + h * bpp - 1); }
    }

    private final PhonePlugin plugin;
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "DonatingPhone-city");
        t.setDaemon(true);
        t.setPriority(Thread.MIN_PRIORITY);
        return t;
    });
    private Job job;

    CityScan(PhonePlugin plugin) { this.plugin = plugin; }

    File file() { return new File(plugin.getDataFolder(), "city.bin"); }
    private File useFile() { return new File(plugin.getDataFolder(), "city.yml"); }

    /** city.yml: which city the phones show (the scan or the config's city-maps). The plugin owns it, like pool.yml. */
    boolean useScan() { return "scan".equalsIgnoreCase(YamlConfiguration.loadConfiguration(useFile()).getString("source", "maps")); }

    private void setUse(boolean scan) throws IOException {
        YamlConfiguration y = new YamlConfiguration();
        y.set("source", scan ? "scan" : "maps");
        y.options().setHeader(java.util.List.of("Which city the phones show: scan (city.bin, /dphone city scan) or maps (config.yml's city-maps).",
                "Made by the plugin: change it with /dphone city use scan|maps."));
        y.save(useFile());
    }

    static Image load(File f) throws IOException {
        try (DataInputStream in = new DataInputStream(new GZIPInputStream(new FileInputStream(f)))) {
            if (in.readInt() != MAGIC) throw new IOException("not a city.bin");
            String world = in.readUTF();
            int x0 = in.readInt(), z0 = in.readInt(), bpp = in.readInt(), w = in.readInt(), h = in.readInt();
            long made = in.readLong();
            if (bpp < 1 || bpp > 16 || Integer.bitCount(bpp) != 1 || w < 1 || h < 1 || w > MAX_SIDE || h > MAX_SIDE) throw new IOException("bad size");
            byte[] px = new byte[w * h];
            in.readFully(px);
            return new Image(world, x0, z0, bpp, w, h, made, px);
        }
    }

    /** Writes the image to f's .tmp (the worker); commit() puts it in place (the main thread, only if the scan still counts). */
    private static File writeTmp(Image im, File f) throws IOException {
        File tmp = new File(f.getParentFile(), f.getName() + ".tmp");
        try (DataOutputStream out = new DataOutputStream(new GZIPOutputStream(new FileOutputStream(tmp)))) {
            out.writeInt(MAGIC);
            out.writeUTF(im.world);
            out.writeInt(im.x0);
            out.writeInt(im.z0);
            out.writeInt(im.bpp);
            out.writeInt(im.w);
            out.writeInt(im.h);
            out.writeLong(im.made);
            out.write(im.px);
        }
        return tmp;
    }

    /** Replaces f with tmp in one step (review fix: deleting first lost the old file when the rename then failed). */
    static void commit(File tmp, File f) throws IOException {
        try {
            Files.move(tmp.toPath(), f.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(tmp.toPath(), f.toPath(), StandardCopyOption.REPLACE_EXISTING);
        }
    }

    /** The scanned image, or null (none, unreadable). */
    Image image() {
        File f = file();
        if (!f.exists()) return null;
        try { return load(f); } catch (IOException e) { plugin.getLogger().warning("city.bin can't be read: " + e.getMessage()); return null; }
    }

    void tick() { if (job != null) job.pump(); }

    void shutdown() {
        if (job != null) job.cancelled = true;
        job = null;
        worker.shutdownNow();
    }

    /** /dphone city [info | scan [x1 z1 x2 z2] [scale] | cancel | use scan|maps | pixel <x> <z>]. */
    boolean command(CommandSender who, String[] args) {
        String sub = args.length < 2 ? "info" : args[1].toLowerCase();
        switch (sub) {
            case "info" -> {
                Image im = image();
                who.sendMessage("CITY source=" + (useScan() ? "scan" : "maps") + " shown=" + plugin.cityDesc()
                        + " file=" + (im == null ? "none" : im.world + " " + im.box() + " scale " + im.scale() + " (" + im.w + "x" + im.h + " px, made "
                        + new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm").format(new java.util.Date(im.made)) + ")")
                        + (job == null ? "" : " scanning=" + job.progress()));
            }
            case "cancel" -> {
                if (job == null) { who.sendMessage("CITY no scan running"); return true; }
                job.cancelled = true;
                job = null;
                who.sendMessage("CITY scan cancelled (the phones keep their city)");
            }
            case "use" -> {
                if (args.length != 3 || !(args[2].equalsIgnoreCase("scan") || args[2].equalsIgnoreCase("maps"))) {
                    who.sendMessage("CITY usage: /dphone city use scan|maps");
                    return true;
                }
                boolean scan = args[2].equalsIgnoreCase("scan");
                Image im = scan ? image() : null;
                if (scan && im == null) { who.sendMessage("CITY no city.bin yet: /dphone city scan first"); return true; }
                if (scan && Bukkit.getWorld(im.world) == null) { who.sendMessage("CITY city.bin is of the world " + im.world + ", which isn't loaded here"); return true; }
                try { setUse(scan); } catch (IOException e) { who.sendMessage("CITY can't save city.yml: " + e.getMessage()); return true; }
                if (job != null) job.chose = true;
                plugin.cityChanged();
                who.sendMessage("CITY the phones show " + (plugin.isScanCity() ? "the scan" : "the city-maps") + ": " + plugin.cityDesc() + roadsNote());
            }
            case "pixel" -> {
                // Tests: one pixel of the saved scan at a block.
                Image im = image();
                int x, z;
                try { x = Integer.parseInt(args[2]); z = Integer.parseInt(args[3]); } catch (RuntimeException e) { who.sendMessage("CITY usage: /dphone city pixel <x> <z>"); return true; }
                if (im == null) { who.sendMessage("CITY pixel none (no city.bin)"); return true; }
                int ix = Math.floorDiv(x - im.x0, im.bpp), iz = Math.floorDiv(z - im.z0, im.bpp);
                if (ix < 0 || iz < 0 || ix >= im.w || iz >= im.h) { who.sendMessage("CITY pixel " + x + "," + z + " outside"); return true; }
                int b = im.px[iz * im.w + ix] & 255;
                who.sendMessage("CITY pixel " + x + "," + z + " = " + b + " color=" + (b >> 2) + " shade=" + (b & 3) + " at=" + ix + "," + iz);
            }
            case "scan" -> scanCommand(who, args);
            default -> who.sendMessage("/dphone city [info | scan [x1 z1 x2 z2] [scale 0-4] | cancel | use scan|maps | pixel <x> <z>]: draw the phone's city from the world");
        }
        return true;
    }

    private String roadsNote() {
        return plugin.gpsRoadsFit() ? "" : " (the GPS goes straight at targets until /dphone roads scan)";
    }

    private void scanCommand(CommandSender who, String[] rawArgs) {
        if (job != null) { who.sendMessage("CITY a scan is running (" + job.progress() + "): /dphone city cancel first"); return; }
        boolean confirm = rawArgs.length > 2 && rawArgs[rawArgs.length - 1].equalsIgnoreCase("confirm");
        String[] args = confirm ? java.util.Arrays.copyOf(rawArgs, rawArgs.length - 1) : rawArgs;
        World world;
        int x1, z1, x2, z2, scale;
        try {
            if (args.length == 6 || args.length == 7) {
                x1 = Integer.parseInt(args[2]);
                z1 = Integer.parseInt(args[3]);
                x2 = Integer.parseInt(args[4]);
                z2 = Integer.parseInt(args[5]);
                scale = args.length == 7 ? Integer.parseInt(args[6]) : -1;
                world = who instanceof Player p ? p.getWorld() : plugin.cityWorld() != null ? plugin.cityWorld() : Bukkit.getWorlds().get(0);
            } else if (args.length == 2 || args.length == 3) {
                // The city the phones show now (the maps' box or the last scan's), at its scale or a new one.
                int[] box = plugin.cityBox();
                if (box == null) { who.sendMessage("CITY no city yet: /dphone city scan <x1> <z1> <x2> <z2> [scale]"); return; }
                x1 = box[0];
                z1 = box[1];
                x2 = box[2];
                z2 = box[3];
                scale = args.length == 3 ? Integer.parseInt(args[2]) : Integer.numberOfTrailingZeros(box[4]);
                world = plugin.cityWorld();
            } else {
                who.sendMessage("CITY usage: /dphone city scan [<x1> <z1> <x2> <z2>] [scale 0-4]");
                return;
            }
        } catch (NumberFormatException e) {
            who.sendMessage("CITY usage: /dphone city scan [<x1> <z1> <x2> <z2>] [scale 0-4] (whole numbers)");
            return;
        }
        if (scale > 4) { who.sendMessage("CITY scale is 0-4 (1, 2, 4, 8 or 16 blocks a pixel)"); return; }
        int lx = Math.min(x1, x2), hx = Math.max(x1, x2), lz = Math.min(z1, z2), hz = Math.max(z1, z2);
        if (scale < 0) {
            // Default: 2 blocks a pixel (like the recommended scale-1 city maps), coarser only when the city is too big.
            scale = 1;
            while (scale < 4 && Math.max(Math.floorDiv(hx, 1 << scale) - Math.floorDiv(lx, 1 << scale) + 1, Math.floorDiv(hz, 1 << scale) - Math.floorDiv(lz, 1 << scale) + 1) > MAX_SIDE) scale++;
        }
        int bpp = 1 << scale;
        // Pixels line up with multiples of bpp (like vanilla maps), so each pixel's blocks lie in one chunk.
        int x0 = Math.floorDiv(lx, bpp) * bpp, z0 = Math.floorDiv(lz, bpp) * bpp;
        int w = Math.floorDiv(hx, bpp) - x0 / bpp + 1, h = Math.floorDiv(hz, bpp) - z0 / bpp + 1;
        if (w > MAX_SIDE || h > MAX_SIDE) { who.sendMessage("CITY too big: " + w + "x" + h + " pixels at scale " + scale + " (at most " + MAX_SIDE + " a side): use a higher scale"); return; }
        long chunks = (long) (((x0 + w * bpp - 1) >> 4) - (x0 >> 4) + 1) * (((z0 + h * bpp - 1) >> 4) - ((z0 - bpp) >> 4) + 1);
        if (chunks > MAX_CHUNKS && !confirm) { who.sendMessage("CITY that box is " + chunks + " chunks (about " + chunks / 15 / 60 + " min): add confirm at the end if you mean it"); return; }
        job = new Job(who, world, x0, z0, bpp, w, h);
        who.sendMessage("CITY scanning " + world.getName() + " " + x0 + " " + z0 + " " + (x0 + w * bpp - 1) + " " + (z0 + h * bpp - 1) + " at scale " + scale
                + " (" + w + "x" + h + " px, " + job.total + " chunks, about " + Math.max(1, job.total / 15) + " s)");
    }

    // ---------- The scan ----------

    private final class Job {
        final CommandSender who;
        final World world;
        final int x0, z0, bpp, w, h, minY, maxY;
        final int zTop;                        // the pixel row north of the image (shades the first row, like vanilla)
        final int cx1, cz1, rowsZ;             // the chunks: index i = (cx - cx1) * rowsZ + (cz - cz1)
        int next;                              // the next chunk to ask for
        boolean chose;                         // staff ran /dphone city use while it ran: keep their choice
        final AtomicInteger done = new AtomicInteger();
        final long started = System.currentTimeMillis();
        final int total;
        // Rows 0..h: row 0 is the row north of the image. Worker thread only.
        final byte[] ids;                      // the pixel's map color id (0 = nothing)
        final int[] sumH;                      // its blocks' heights added up
        final byte[] depth;                    // water depth (vanilla: the sum / blocks, whole numbers)
        final BitSet got;                      // the pixel's chunk was read
        final Map<Integer, Integer> colorIds = new HashMap<>();
        final int water, lava;
        final int[] count = new int[256];
        final int[] order = new int[256];
        int inFlight, lastTenth;
        volatile boolean cancelled;
        boolean finishing;

        Job(CommandSender who, World world, int x0, int z0, int bpp, int w, int h) {
            this.who = who;
            this.world = world;
            this.x0 = x0;
            this.z0 = z0;
            this.bpp = bpp;
            this.w = w;
            this.h = h;
            minY = world.getMinHeight();
            maxY = world.getMaxHeight();
            zTop = z0 - bpp;
            ids = new byte[w * (h + 1)];
            sumH = new int[w * (h + 1)];
            depth = new byte[w * (h + 1)];
            got = new BitSet(w * (h + 1));
            water = idOf(Material.WATER.createBlockData().getMapColor().asRGB());
            lava = idOf(Material.LAVA.createBlockData().getMapColor().asRGB());
            cx1 = x0 >> 4;
            cz1 = zTop >> 4;
            rowsZ = ((z0 + h * bpp - 1) >> 4) - cz1 + 1;
            total = (((x0 + w * bpp - 1) >> 4) - cx1 + 1) * rowsZ;
        }

        String progress() { return done.get() + "/" + total + " chunks"; }

        /** A base map color (its RGB) -> its id: the palette's full-bright shade of it is id * 4 + 2. */
        @SuppressWarnings("deprecation") // MapPalette.matchColor: still the way to find a palette color
        int idOf(int rgb) {
            if (rgb == 0) return 0; // MapColor.NONE
            Integer id = colorIds.get(rgb);
            if (id == null) {
                id = (MapPalette.matchColor((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255) & 255) >> 2;
                colorIds.put(rgb, id);
            }
            return id;
        }

        /** Every tick: at most one new chunk request, at most 4 waiting, none while the server is behind. */
        void pump() {
            if (cancelled) return;
            int tenth = total == 0 ? 10 : done.get() * 10 / total;
            if (tenth > lastTenth && tenth < 10) { lastTenth = tenth; who.sendMessage("CITY " + tenth * 10 + "% (" + progress() + ")"); }
            if (next >= total) {
                if (inFlight == 0 && !finishing) {
                    finishing = true;
                    worker.execute(this::finish);
                }
                return;
            }
            if (inFlight >= 4 || Bukkit.getAverageTickTime() > 40) return;
            int cx = cx1 + next / rowsZ, cz = cz1 + next % rowsZ;
            next++;
            inFlight++;
            world.getChunkAtAsync(cx, cz, false, false, chunk -> {
                inFlight--;
                if (cancelled) return;
                if (chunk == null) { done.incrementAndGet(); return; } // never generated: stays see-through
                ChunkSnapshot s = chunk.getChunkSnapshot(true, false, false, false); // the heightmap, no light
                worker.execute(() -> {
                    if (!cancelled) read(s);
                    done.incrementAndGet();
                });
            });
        }

        /** Worker: every pixel whose blocks lie in this chunk. */
        void read(ChunkSnapshot s) {
            int bx0 = s.getX() << 4, bz0 = s.getZ() << 4;
            int px1 = Math.max(0, Math.floorDiv(bx0 - x0, bpp)), px2 = Math.min(w - 1, Math.floorDiv(bx0 + 15 - x0, bpp));
            int r1 = Math.max(0, Math.floorDiv(bz0 - zTop, bpp)), r2 = Math.min(h, Math.floorDiv(bz0 + 15 - zTop, bpp));
            int n = bpp * bpp;
            for (int r = r1; r <= r2; r++) for (int px = px1; px <= px2; px++) {
                int bx = x0 + px * bpp, bz = zTop + r * bpp;
                if (bx < bx0 || bz < bz0 || bx + bpp > bx0 + 16 || bz + bpp > bz0 + 16) continue; // not this chunk's
                int kinds = 0, sum = 0, deep = 0, best = 0;
                try {
                    // x outer, like vanilla: a tie goes to the color seen first in that order.
                    for (int dx = 0; dx < bpp; dx++) for (int dz = 0; dz < bpp; dz++) {
                        long col = column(s, bx + dx - bx0, bz + dz - bz0);
                        int id = (int) (col & 255);
                        sum += (int) (col >> 16);
                        deep += (int) ((col >> 8) & 255);
                        if (count[id]++ == 0) order[kinds++] = id;
                    }
                    best = order[0];
                    for (int k = 1; k < kinds; k++) if (count[order[k]] > count[best]) best = order[k];
                } finally {
                    for (int k = 0; k < kinds; k++) count[order[k]] = 0;
                }
                int i = r * w + px;
                ids[i] = (byte) best;
                sumH[i] = sum;
                depth[i] = (byte) Math.min(127, deep / n);
                got.set(i);
            }
        }

        /** One block column: its top's map color id (bits 0-7), water depth (8-15), height (16+). */
        long column(ChunkSnapshot s, int lx, int lz) {
            int y = Math.min(maxY - 1, s.getHighestBlockYAt(lx, lz) + 3); // the heightmap skips flowers, grass, rails...
            BlockData d = s.getBlockData(lx, y, lz);
            int rgb = d.getMapColor().asRGB();
            while (rgb == 0 && y > minY) {
                y--;
                d = s.getBlockData(lx, y, lz);
                rgb = d.getMapColor().asRGB();
            }
            if (rgb == 0) return ((long) y << 16); // nothing down to the bottom
            int deep = 0;
            int fluid = y > minY ? fluid(d) : 0; // like vanilla: no depth for the bottom block
            if (fluid != 0) {
                int l = y - 1;
                BlockData below;
                do {
                    below = s.getBlockData(lx, l--, lz);
                    deep++;
                } while (l > minY && fluid(below) != 0);
                // Vanilla's getCorrectStateForFluidBlock: the fluid's color unless the block's top is solid.
                if (!d.isFaceSturdy(BlockFace.UP, BlockSupport.FULL)) rgb = fluid == 1 ? -1 : -2;
            }
            int id = rgb == -1 ? water : rgb == -2 ? lava : idOf(rgb);
            return ((long) y << 16) | ((long) Math.min(255, deep) << 8) | id;
        }

        /** 1 = water (also waterlogged blocks, kelp, seagrass, bubble columns), 2 = lava, 0 = none. */
        int fluid(BlockData d) {
            Material m = d.getMaterial();
            if (m == Material.WATER || m == Material.BUBBLE_COLUMN || m == Material.KELP || m == Material.KELP_PLANT
                    || m == Material.SEAGRASS || m == Material.TALL_SEAGRASS) return 1;
            if (d instanceof Waterlogged wl && wl.isWaterlogged()) return 1;
            return m == Material.LAVA ? 2 : 0;
        }

        /** Worker: shade every pixel (vanilla's rules), save city.bin, then show it on the main thread. */
        void finish() {
            if (cancelled) return;
            byte[] px = new byte[w * h];
            for (int x = 0; x < w; x++) {
                for (int z = 0; z < h; z++) {
                    int i = (z + 1) * w + x, north = z * w + x;
                    int id = ids[i] & 255;
                    if (id == 0) continue;
                    double d1 = sumH[i] / (double) (bpp * bpp);
                    double d0 = got.get(north) ? sumH[north] / (double) (bpp * bpp) : d1;
                    int odd = (x + z) & 1;
                    int shade; // 0 dark, 1 normal, 2 bright (MapColor.Brightness LOW, NORMAL, HIGH)
                    if (id == water) {
                        double d2 = depth[i] * 0.1 + odd * 0.2;
                        shade = d2 < 0.5 ? 2 : d2 > 0.9 ? 0 : 1;
                    } else {
                        double d3 = (d1 - d0) * 4.0 / (bpp + 4) + (odd - 0.5) * 0.4;
                        shade = d3 > 0.6 ? 2 : d3 < -0.6 ? 0 : 1;
                    }
                    px[z * w + x] = (byte) (id * 4 + shade);
                }
            }
            Image im = new Image(world.getName(), x0, z0, bpp, w, h, System.currentTimeMillis(), px);
            // Written here, put in place on the main thread only while the scan still counts (review fix: a cancel during
            // this step replaced city.bin anyway).
            File tmp;
            String saved;
            try { tmp = writeTmp(im, file()); saved = null; } catch (IOException e) { tmp = null; saved = e.getMessage(); }
            File written = tmp;
            String writeErr = saved;
            if (!plugin.isEnabled()) { if (written != null) written.delete(); return; }
            Bukkit.getScheduler().runTask(plugin, () -> {
                if (job != this) { if (written != null) written.delete(); return; }
                job = null;
                long secs = (System.currentTimeMillis() - started) / 1000;
                String err = writeErr;
                if (written != null) {
                    try { commit(written, file()); } catch (IOException e) { err = e.getMessage(); written.delete(); }
                }
                if (err != null) { who.sendMessage("CITY scanned in " + secs + " s but NOT saved (" + err + "): the phones keep their city"); return; }
                String done = "CITY done in " + secs + " s: " + w + "x" + h + " px at scale " + Integer.numberOfTrailingZeros(bpp) + ", saved city.bin";
                // Staff chose a city with /dphone city use while it ran: keep that choice (review fix).
                if (chose) { who.sendMessage(done + "; the phones keep the city you chose meanwhile (/dphone city use scan)"); return; }
                try { setUse(true); } catch (IOException e) { who.sendMessage(done + " but can't save city.yml (" + e.getMessage() + "): /dphone city use scan"); return; }
                plugin.cityChanged();
                who.sendMessage(done + "; the phones show it now" + roadsNote());
            });
        }
    }
}
