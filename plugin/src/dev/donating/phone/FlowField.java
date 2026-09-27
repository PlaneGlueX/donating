package dev.donating.phone;

import java.util.Arrays;

/**
 * The way to a target from everywhere in the city. Like water running downhill to a drain: one search
 * (Dijkstra) outward from the target gives every cell the neighbour to step to next, so from wherever the
 * player is, following those steps is the cheapest way there. Taking another street never needs a new
 * search: the next step from the new spot is already known.
 *
 * A target can be several spots at once (any chop shop): the search starts from all of them, so each cell
 * leads to the one nearest along the roads.
 *
 * Costs are whole numbers: a straight step 10, a diagonal 14, times the factor (tenths: 10 = x1) of the
 * kind of ground stepped onto (road, open ground, wall/water), so routes keep to the roads and only leave
 * them where that saves more. A diagonal step also pays for the two cells it squeezes between (no cutting
 * across a building's corner). Nothing is impassable, so every target can be reached.
 *
 * Built on the GPS worker thread, then only read (dir and cost never change after the constructor).
 */
final class FlowField {
    static final byte NONE = -1, HERE = 8;
    // Neighbour offsets, index = direction. Even = straight, odd = diagonal.
    static final int[] DX = {1, 1, 0, -1, -1, -1, 0, 1};
    static final int[] DZ = {0, 1, 1, 1, 0, -1, -1, -1};

    final int w, h;
    final int[] targets; // the target cells (sorted)
    final byte[] dir;    // per cell: the direction of the next step, HERE at a target (the costs are only kept while searching)

    /** kind[cell] = Roads.OPEN / ROAD / BLOCKED; factor[kind] = tenths per step onto it. */
    FlowField(int w, int h, byte[] kind, int[] factor, int[] targets) {
        this.w = w;
        this.h = h;
        this.targets = targets.clone();
        Arrays.sort(this.targets);
        int n = w * h;
        dir = new byte[n];
        int[] cost = new int[n];
        Arrays.fill(dir, NONE);
        Arrays.fill(cost, Integer.MAX_VALUE);
        boolean[] done = new boolean[n];
        Heap heap = new Heap(4096);
        for (int t : targets) {
            cost[t] = 0;
            dir[t] = HERE;
            heap.push(t, 0);
        }
        while (heap.size > 0) {
            int c = heap.popCell();
            if (done[c]) continue;
            done[c] = true;
            int cx = c % w, cz = c / w;
            int fc = factor[kind[c]];
            for (int d = 0; d < 8; d++) {
                // A neighbour m that would step in direction d onto c.
                int mx = cx - DX[d], mz = cz - DZ[d];
                if (mx < 0 || mz < 0 || mx >= w || mz >= h) continue;
                int m = mz * w + mx;
                if (done[m]) continue;
                int f = fc, base = 10;
                if ((d & 1) == 1) {
                    // The two cells beside a diagonal step: (m.x + dx, m.z) and (m.x, m.z + dz).
                    f = Math.max(f, Math.max(factor[kind[mz * w + cx]], factor[kind[cz * w + mx]]));
                    base = 14;
                }
                int nc = cost[c] + base * f / 10;
                if (nc < cost[m]) {
                    cost[m] = nc;
                    dir[m] = (byte) d; // from m, step in direction d to reach c
                    heap.push(m, nc);
                }
            }
        }
    }

    boolean sameTargets(int[] cells) {
        int[] s = cells.clone();
        Arrays.sort(s);
        return Arrays.equals(s, targets);
    }

    /** The next cell from `cell` (the cell itself at a target, -1 if unknown). */
    int next(int cell) {
        byte d = dir[cell];
        if (d == HERE) return cell;
        if (d == NONE) return -1;
        return (cell / w + DZ[d]) * w + (cell % w + DX[d]);
    }

    /** A binary min-heap of (cell, cost) in parallel int arrays. */
    private static final class Heap {
        int[] cell, key;
        int size;

        Heap(int cap) { cell = new int[cap]; key = new int[cap]; }

        void push(int c, int k) {
            if (size == cell.length) { cell = Arrays.copyOf(cell, size * 2); key = Arrays.copyOf(key, size * 2); }
            int i = size++;
            while (i > 0) {
                int p = (i - 1) >>> 1;
                if (key[p] <= k) break;
                cell[i] = cell[p];
                key[i] = key[p];
                i = p;
            }
            cell[i] = c;
            key[i] = k;
        }

        int popCell() {
            int top = cell[0];
            int lc = cell[--size], lk = key[size];
            int i = 0;
            while (true) {
                int ch = 2 * i + 1;
                if (ch >= size) break;
                if (ch + 1 < size && key[ch + 1] < key[ch]) ch++;
                if (key[ch] >= lk) break;
                cell[i] = cell[ch];
                key[i] = key[ch];
                i = ch;
            }
            if (size > 0) { cell[i] = lc; key[i] = lk; }
            return top;
        }
    }
}
