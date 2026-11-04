package dev.donating.phone;

import com.destroystokyo.paper.event.server.ServerTickEndEvent;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.event.EventHandler;
import org.bukkit.event.HandlerList;
import org.bukkit.event.Listener;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitTask;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.StringJoiner;

/**
 * /dphone prof start|stop: what each repeating task costs, a Skript `every X:` by its script and line, which spark can't
 * tell apart (its stacks only say EvtPeriodical), the ticks' times, and what ran in the ticks over 50 ms. Start wraps
 * every sync task's Runnable with a timer by reflection, stop puts them back, so nothing runs while it's off.
 * shortcut: code after a `wait` runs as its own task and isn't counted, tasks scheduled after start aren't either (a
 * /sk reload needs a new start); enough to rank the triggers.
 */
final class TaskProf implements Listener {
    private static final class Stat {
        final String name;
        long nanos, max;
        int runs;
        Stat(String name) { this.name = name; }
    }

    private final Plugin plugin;
    private final Map<BukkitTask, Runnable> originals = new HashMap<>();
    private final List<Stat> stats = new ArrayList<>();
    private final Map<String, Long> thisTick = new HashMap<>();
    private final List<Double> tickMs = new ArrayList<>();
    private final long[] phase = new long[20];
    private final List<String> worst = new ArrayList<>();
    private long startedAt;

    TaskProf(Plugin plugin) { this.plugin = plugin; }

    boolean command(CommandSender sender, String[] args) {
        String word = args.length >= 2 ? args[1].toLowerCase(Locale.ROOT) : "";
        try {
            if (word.equals("start")) sender.sendMessage(start());
            else if (word.equals("stop")) for (String line : stop()) sender.sendMessage(line);
            else sender.sendMessage("PROF usage: /dphone prof start|stop (" + (startedAt == 0 ? "off" : "running") + ")");
        } catch (ReflectiveOperationException | RuntimeException ex) {
            sender.sendMessage("PROF failed: " + ex);
        }
        return true;
    }

    private String start() throws ReflectiveOperationException {
        if (startedAt != 0) return "PROF already running";
        for (BukkitTask t : Bukkit.getScheduler().getPendingTasks()) {
            if (!t.isSync()) continue;
            Field f = t.getClass().getField("rTask");
            f.setAccessible(true);
            Runnable orig = (Runnable) f.get(t);
            if (orig == null) continue; // a Consumer task
            Stat s = new Stat(label(t, orig));
            stats.add(s);
            originals.put(t, orig);
            f.set(t, (Runnable) () -> {
                long a = System.nanoTime();
                try {
                    orig.run();
                } finally {
                    long d = System.nanoTime() - a;
                    s.nanos += d;
                    s.runs++;
                    if (d > s.max) s.max = d;
                    thisTick.merge(s.name, d, Long::sum);
                }
            });
        }
        Bukkit.getPluginManager().registerEvents(this, plugin);
        startedAt = System.nanoTime();
        return "PROF timing " + originals.size() + " tasks";
    }

    @EventHandler
    public void onTickEnd(ServerTickEndEvent e) {
        long sum = 0;
        for (long v : thisTick.values()) sum += v;
        tickMs.add(e.getTickDuration());
        phase[e.getTickNumber() % 20] += sum;
        if (e.getTickDuration() > 50 && worst.size() < 60) {
            StringJoiner top = new StringJoiner(", ");
            thisTick.entrySet().stream().sorted(Map.Entry.comparingByValue(Comparator.reverseOrder())).limit(5)
                .forEach(x -> top.add(String.format(Locale.ROOT, "%s %.1f", x.getKey().replaceAll(" \\(every.*", ""), x.getValue() / 1e6)));
            worst.add(String.format(Locale.ROOT, "tick %d %.0f ms, tasks %.1f: %s", e.getTickNumber(), e.getTickDuration(), sum / 1e6, top));
        }
        thisTick.clear();
    }

    private List<String> stop() throws ReflectiveOperationException {
        if (startedAt == 0) return List.of("PROF not running");
        HandlerList.unregisterAll(this);
        for (Map.Entry<BukkitTask, Runnable> e : originals.entrySet()) {
            Field f = e.getKey().getClass().getField("rTask");
            f.setAccessible(true);
            f.set(e.getKey(), e.getValue());
        }
        double seconds = (System.nanoTime() - startedAt) / 1e9;
        double ticks = seconds * 20;
        stats.sort(Comparator.comparingLong((Stat s) -> -s.nanos));
        long total = stats.stream().mapToLong(s -> s.nanos).sum();
        Collections.sort(tickMs);
        int n = tickMs.size();
        double mean = tickMs.stream().mapToDouble(Double::doubleValue).sum() / Math.max(1, n);
        long over = tickMs.stream().filter(v -> v > 50).count();
        String head = String.format(Locale.ROOT, "PROF %.0f s, %.2f ms a tick in %d tasks; ticks mean %.1f p50 %.1f p90 %.1f p99 %.1f max %.1f, over 50 ms: %d of %d", seconds, total / 1e6 / ticks, stats.size(), mean, pct(.5), pct(.9), pct(.99), pct(1), over, n);
        List<String> out = new ArrayList<>();
        out.add(head);
        StringJoiner by = new StringJoiner(" ");
        for (long v : phase) by.add(String.format(Locale.ROOT, "%.1f", v / 1e6 / Math.max(1, n / 20.0)));
        out.add("tasks' ms by tick of the second: " + by);
        out.addAll(worst);
        for (Stat s : stats) out.add(String.format(Locale.ROOT, "%7.3f ms/t  %9.1f ms  runs %-6d avg %8.0f us  max %7.1f ms  %s", s.nanos / 1e6 / ticks, s.nanos / 1e6, s.runs, s.runs == 0 ? 0 : s.nanos / 1e3 / s.runs, s.max / 1e6, s.name));
        originals.clear();
        stats.clear();
        thisTick.clear();
        tickMs.clear();
        worst.clear();
        java.util.Arrays.fill(phase, 0);
        startedAt = 0;
        try {
            Files.write(new File(plugin.getDataFolder(), "prof.txt").toPath(), out);
        } catch (IOException ex) {
            return List.of("PROF couldn't write prof.txt: " + ex);
        }
        return List.of(head, "PROF saved plugins/DonatingPhone/prof.txt");
    }

    private double pct(double p) {
        if (tickMs.isEmpty()) return 0;
        return tickMs.get(Math.min(tickMs.size() - 1, (int) (tickMs.size() * p)));
    }

    /** A Skript `every X:` as "file.sk:line (every period)", anything else as its plugin and class. */
    private static String label(BukkitTask t, Runnable r) {
        try {
            for (Field f : r.getClass().getDeclaredFields()) {
                f.setAccessible(true);
                Object v = f.get(r);
                if (v == null || !v.getClass().getName().equals("ch.njol.skript.events.EvtPeriodical")) continue;
                Field trigger = v.getClass().getSuperclass().getDeclaredField("trigger");
                trigger.setAccessible(true);
                Object tr = trigger.get(v);
                Field period = v.getClass().getDeclaredField("period");
                period.setAccessible(true);
                Object script = tr.getClass().getMethod("getScript").invoke(tr);
                Object config = script.getClass().getMethod("getConfig").invoke(script);
                return config.getClass().getMethod("getFileName").invoke(config) + ":" + tr.getClass().getMethod("getLineNumber").invoke(tr) + " (every " + period.get(v) + ")";
            }
        } catch (ReflectiveOperationException | RuntimeException ignored) {
            // falls through to the class name
        }
        return t.getOwner().getName() + " " + r.getClass().getName().replaceAll("/0x.*", "");
    }
}
