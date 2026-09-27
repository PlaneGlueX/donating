package dev.donating.phone;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Set;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;
import org.bukkit.ChunkSnapshot;
import org.bukkit.Material;

/**
 * The GPS grid over the city: per cell (cellBlocks x cellBlocks blocks, lined up with the city map) the
 * kind of ground at street level: ROAD (a road block you can stand on), OPEN (anything else you can stand
 * on: sidewalks, alleys, plazas, floors) or BLOCKED (walls, water, nowhere to stand). Made by
 * /dphone roads scan from the config's road-blocks within street-y-min..street-y-max, saved in roads.bin.
 *
 * Never changed once published: a scan fills a copy and swaps it in, so GPS searches on the worker thread
 * always read a complete grid.
 */
final class Roads {
    static final byte OPEN = 0, ROAD = 1, BLOCKED = 2;
    private static final byte UNSET = 3; // during a scan only
    static final int MAGIC = 0x44524432; // "DRD2"

    final String world;
    final double x0, z0;  // world position of cell (0, 0)'s north-west corner (= the city image's)
    final int w, h;       // cells
    final int k;          // city-map pixels per cell side
    final int cellBlocks; // blocks per cell side (= bpp * k)
    final byte[] kind;
    String fingerprint = ""; // road blocks and street heights it was scanned with
    int roads, blocked;

    Roads(String world, double x0, double z0, int w, int h, int k, int cellBlocks) {
        this.world = world;
        this.x0 = x0;
        this.z0 = z0;
        this.w = w;
        this.h = h;
        this.k = k;
        this.cellBlocks = cellBlocks;
        kind = new byte[w * h];
    }

    boolean fits(Roads o) {
        return o != null && world.equals(o.world) && x0 == o.x0 && z0 == o.z0 && w == o.w && h == o.h && cellBlocks == o.cellBlocks;
    }

    Roads copy() {
        Roads c = new Roads(world, x0, z0, w, h, k, cellBlocks);
        System.arraycopy(kind, 0, c.kind, 0, kind.length);
        c.fingerprint = fingerprint;
        c.count();
        return c;
    }

    int cellX(double x) { return (int) Math.floor((x - x0) / cellBlocks); }
    int cellZ(double z) { return (int) Math.floor((z - z0) / cellBlocks); }
    boolean inside(int cx, int cz) { return cx >= 0 && cz >= 0 && cx < w && cz < h; }
    int cellAt(double x, double z) {
        int cx = cellX(x), cz = cellZ(z);
        return inside(cx, cz) ? cz * w + cx : -1;
    }
    double centerX(int cell) { return x0 + (cell % w + 0.5) * cellBlocks; }
    double centerZ(int cell) { return z0 + (cell / w + 0.5) * cellBlocks; }

    void count() {
        roads = blocked = 0;
        for (byte b : kind) { if (b == ROAD) roads++; else if (b == BLOCKED) blocked++; }
    }

    // ---------- Scanning (a copy, on the scan thread) ----------

    // Per cell while scanning: road columns seen, and counts of open and blocked columns.
    private boolean[] roadAny;
    private short[] openCount, blockedCount;

    /** Marks the cells whose centre is in the box as not scanned yet (a rescan of that box starts over). */
    void startBox(int bx1, int bz1, int bx2, int bz2) {
        roadAny = new boolean[w * h];
        openCount = new short[w * h];
        blockedCount = new short[w * h];
        for (int cz = 0; cz < h; cz++) {
            double z = z0 + (cz + 0.5) * cellBlocks;
            if (z < bz1 || z > bz2 + 1) continue;
            for (int cx = 0; cx < w; cx++) {
                double x = x0 + (cx + 0.5) * cellBlocks;
                if (x < bx1 || x > bx2 + 1) continue;
                kind[cz * w + cx] = UNSET;
            }
        }
    }

    /**
     * One chunk's columns inside the box (a snapshot, so this is safe off the main thread). A column's ground
     * is the highest spot between yMin and yMax where a solid block has two non-solid blocks above it (room
     * to stand): ROAD if that block is a road block, OPEN otherwise, BLOCKED if water or lava is there, if it's
     * the top of a wall, fence, gate, pane or bars (you can't get up there), or if there's no such spot. Only cells being rescanned (UNSET) take part; finish() decides each one.
     */
    void scan(ChunkSnapshot s, Set<Material> roadBlocks, Set<Material> solid, Set<Material> noStand, int yMin, int yMax, int worldMax, int bx1, int bz1, int bx2, int bz2) {
        int baseX = s.getX() << 4, baseZ = s.getZ() << 4;
        for (int dx = 0; dx < 16; dx++) {
            int bx = baseX + dx;
            if (bx < bx1 || bx > bx2) continue;
            int cx = cellX(bx + 0.5);
            if (cx < 0 || cx >= w) continue;
            for (int dz = 0; dz < 16; dz++) {
                int bz = baseZ + dz;
                if (bz < bz1 || bz > bz2) continue;
                int cz = cellZ(bz + 0.5);
                if (cz < 0 || cz >= h) continue;
                int cell = cz * w + cx;
                if (kind[cell] != UNSET || roadAny[cell]) continue;
                byte col = BLOCKED;
                for (int by = yMax; by >= yMin; by--) {
                    Material b = s.getBlockType(dx, by, dz);
                    if (!solid.contains(b)) continue;
                    if (noStand.contains(b)) break;         // the top of a wall, fence or pane: BLOCKED
                    Material a1 = by + 1 < worldMax ? s.getBlockType(dx, by + 1, dz) : Material.AIR;
                    Material a2 = by + 2 < worldMax ? s.getBlockType(dx, by + 2, dz) : Material.AIR;
                    if (solid.contains(a1)) continue;       // inside a wall or a stack: look lower
                    if (liquid(a1) || liquid(a2)) break;   // water or lava: BLOCKED
                    if (solid.contains(a2)) continue;       // no room to stand (a low ceiling)
                    col = roadBlocks.contains(b) ? ROAD : OPEN;
                    break;
                }
                if (col == ROAD) roadAny[cell] = true;
                else if (col == OPEN) openCount[cell]++;
                else blockedCount[cell]++;
            }
        }
    }

    private static boolean liquid(Material m) {
        return m == Material.WATER || m == Material.LAVA || m == Material.BUBBLE_COLUMN;
    }

    /**
     * Decides every rescanned cell: ROAD if any of its columns is road (a street never breaks), else BLOCKED if
     * at least half its columns are (a wall thinner than a cell doesn't vanish), else OPEN. Cells no chunk
     * covered (ungenerated land) count as open ground.
     */
    void finish() {
        for (int i = 0; i < kind.length; i++) {
            if (kind[i] != UNSET) continue;
            if (roadAny != null && roadAny[i]) kind[i] = ROAD;
            else if (blockedCount != null && blockedCount[i] > 0 && blockedCount[i] >= openCount[i]) kind[i] = BLOCKED;
            else kind[i] = OPEN;
        }
        roadAny = null;
        openCount = blockedCount = null;
        count();
    }

    // ---------- File ----------

    void save(File f) throws IOException {
        File tmp = new File(f.getPath() + ".tmp");
        try (DataOutputStream out = new DataOutputStream(new GZIPOutputStream(new FileOutputStream(tmp)))) {
            out.writeInt(MAGIC);
            out.writeUTF(world);
            out.writeDouble(x0);
            out.writeDouble(z0);
            out.writeInt(w);
            out.writeInt(h);
            out.writeInt(k);
            out.writeInt(cellBlocks);
            out.writeUTF(fingerprint);
            out.write(kind);
        }
        if (f.exists() && !f.delete()) throw new IOException("can't replace " + f);
        if (!tmp.renameTo(f)) throw new IOException("can't write " + f);
    }

    static Roads load(File f) throws IOException {
        try (DataInputStream in = new DataInputStream(new GZIPInputStream(new FileInputStream(f)))) {
            if (in.readInt() != MAGIC) throw new IOException("not a DonatingPhone roads file (or an old one)");
            Roads r = new Roads(in.readUTF(), in.readDouble(), in.readDouble(), in.readInt(), in.readInt(), in.readInt(), in.readInt());
            r.fingerprint = in.readUTF();
            in.readFully(r.kind);
            r.count();
            return r;
        }
    }
}
