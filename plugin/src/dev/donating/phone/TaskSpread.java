package dev.donating.phone;

import org.bukkit.Bukkit;
import org.bukkit.scheduler.BukkitScheduler;
import org.bukkit.scheduler.BukkitTask;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Skript starts every `every X:` of every script in the same tick, so once a second one tick ran them all (31.5 ms of
 * tasks in that tick with 10 players, 0.4-5 ms in the other 19). This moves each to the tick of its period with the fewest
 * others, keeping the period. Runs once after the start and on /dphone spread: a /sk reload starts that script's blocks
 * together again until then (harmless). Through Skript's own task ids, so unloading a script still cancels them; a Skript
 * whose fields differ is left alone.
 */
final class TaskSpread {
    /** The longest `every` is 60 s; every period we use divides it. */
    private static final int CYCLE = 1200;

    private record Entry(BukkitTask task, Runnable run, Object event, int period) {}

    private TaskSpread() {}

    static String run() {
        List<Entry> list = new ArrayList<>();
        int moved = 0;
        try {
            for (BukkitTask t : Bukkit.getScheduler().getPendingTasks()) {
                if (!t.isSync() || !t.getOwner().getName().equals("Skript")) continue;
                Runnable r = (Runnable) t.getClass().getField("rTask").get(t);
                Object event = r == null ? null : periodicEvent(r);
                if (event == null) continue;
                Method period = t.getClass().getDeclaredMethod("getPeriod");
                period.setAccessible(true);
                int p = (int) (long) period.invoke(t);
                if (p >= 2 && CYCLE % p == 0) list.add(new Entry(t, r, event, p));
            }
            // The shortest periods first: they have the fewest ticks to choose from.
            list.sort(Comparator.comparingInt(Entry::period));
            int[] load = new int[CYCLE];
            BukkitScheduler scheduler = Bukkit.getScheduler();
            int now = Bukkit.getCurrentTick();
            for (Entry e : list) {
                Field ids = e.event.getClass().getDeclaredField("taskIDs");
                ids.setAccessible(true);
                int[] taskIds = (int[]) ids.get(e.event);
                int slot = indexOf(taskIds, e.task.getTaskId());
                if (slot < 0) continue;
                int phase = quietestPhase(load, e.period);
                for (int i = phase; i < CYCLE; i += e.period) load[i]++;
                int delay = Math.floorMod(phase - now, e.period);
                int id = scheduler.scheduleSyncRepeatingTask(e.task.getOwner(), e.run, delay == 0 ? e.period : delay, e.period);
                if (id == -1) continue;
                e.task.cancel();
                taskIds[slot] = id;
                moved++;
            }
        } catch (ReflectiveOperationException | RuntimeException ex) {
            return "SPREAD stopped after " + moved + " of " + list.size() + " blocks: " + ex;
        }
        return "SPREAD moved " + moved + " of " + list.size() + " Skript every-blocks";
    }

    private static int quietestPhase(int[] load, int period) {
        int best = 0, bestLoad = Integer.MAX_VALUE;
        for (int phase = 0; phase < period; phase++) {
            int sum = 0;
            for (int i = phase; i < CYCLE; i += period) sum += load[i];
            if (sum < bestLoad) { bestLoad = sum; best = phase; }
        }
        return best;
    }

    private static int indexOf(int[] a, int v) {
        for (int i = 0; i < a.length; i++) if (a[i] == v) return i;
        return -1;
    }

    /** The Skript EvtPeriodical a task's lambda captured, or null for any other task. */
    private static Object periodicEvent(Runnable r) throws IllegalAccessException {
        for (Field f : r.getClass().getDeclaredFields()) {
            f.setAccessible(true);
            Object v = f.get(r);
            if (v != null && v.getClass().getName().equals("ch.njol.skript.events.EvtPeriodical")) return v;
        }
        return null;
    }
}
