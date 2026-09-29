package dev.donating.phone;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.WeakHashMap;

import com.destroystokyo.paper.event.server.ServerTickEndEvent;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandler;
import io.papermc.paper.threadedregions.scheduler.ScheduledTask;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.ArmorStand;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.util.Vector;

/**
 * Smoother MTVehicles cars (owner, 2026-09-29: "research if theres a way for the cars to ride smoother, test it out
 * using bots"). A car is four invisible armor stands: MAIN does the physics, SKIN wears the model, MAINSEAT carries the
 * driver, SEAT&lt;n&gt; the passengers. Armor stands are sent to clients only every 3rd tick (EntityType's updateInterval 3,
 * checked in Paper 1.21.11 and the 26.3 client), so a car moves on screen in 150 ms steps and a server hitch stalls it.
 * Measured with bots (carsmooth.js, 2026-09-29): off 6.6 moves a second per stand, every gap 150 ms; track 19.9 a second,
 * gaps 50 ms (the longest 54-77), about 1.2 KB/s instead of 0.6 per watcher and moving car, no measurable tick cost.
 * The research also read two other causes out of MTVehicles' bytecode (the seats one tick behind the model, a key change
 * skipping a movement tick); the probe never saw either (seat error 0.000, no skipped tick in 220+ moving ticks per run),
 * so "sync" is kept only as an A/B switch and the default is "track".
 *
 * Each tick, after every Bukkit task (MTVehicles' included) and before the entity tracker sends anything (Paper's global
 * region scheduler runs between the two), for every driven car:
 *  - track: SKIN, MAINSEAT and SEAT&lt;n&gt; are sent every tick (the tracker's updateInterval 3 -> 1) and to everyone within
 *    carsmooth.range blocks (128, like the driver: an armor stand is tracked within spigot.yml's 64 while the seat that
 *    carries a player gets the player's 128, so between 64 and 128 blocks others saw a driver floating with no car); set
 *    again whenever Paper starts tracking a stand anew.
 *  - sync: MAINSEAT and SEAT&lt;n&gt; are snapped to MTVehicles' own seat spot from MAIN (the same formula and offsets, read
 *    from its VehicleData maps), SKIN is put on MAIN, and a skipped movement tick gets MAIN's last velocity again.
 * Every reflective step switches only its own part off, with one log line, when it fails.
 * /dphone carsmooth [off|sync|track|all]: a live A/B switch (kept in carsmooth.yml). /dphone carprobe: per-tick numbers.
 */
final class CarSmooth implements Listener {
    enum Mode {
        OFF, SYNC, TRACK, ALL;
        boolean sync() { return this == SYNC || this == ALL; }
        boolean track() { return this == TRACK || this == ALL; }
    }

    static final String MAIN = "MTVEHICLES_MAIN_", SKIN = "MTVEHICLES_SKIN_", MAINSEAT = "MTVEHICLES_MAINSEAT_", SEAT = "MTVEHICLES_SEAT";

    private final JavaPlugin plugin;
    private Mode mode = Mode.TRACK;
    private int interval = 1;
    private int range = 128;
    private ScheduledTask task;
    private long tickNo;
    private double lastMspt;
    private long reappliedTotal;

    // MTVehicles' VehicleData (static maps), found at the first tick: it may load after this plugin.
    private static boolean dataTried;
    private static String dataError;
    private static Field fAutostand, fMainx, fMainy, fMainz, fSeatx, fSeaty, fSeatz, fSeatsize;

    // Paper internals.
    private String syncError, trackError;
    private Method mAbsSnapTo, mGetTrackedEntity;
    private Field fServerEntity, fUpdateInterval, fRange;
    /** Each ServerEntity we changed and its own interval (put back when "track" goes off). Weak: a new tracking drops it. */
    private final Map<Object, Integer> changed = new WeakHashMap<>();
    /** Each TrackedEntity whose range we raised and its own range. */
    private final Map<Object, Integer> ranged = new WeakHashMap<>();

    /** What the last tick saw of each driven car (by plate). */
    private static final class CarState {
        double mx = Double.NaN, my, mz; // MAIN where it was at the last sample
        Vector vel;                     // MAIN's velocity as MTVehicles set it, the last time its movement ran
        boolean ran;                    // MTVehicles' movement ran in the last tick
        long seen;
    }
    private final Map<String, CarState> cars = new HashMap<>();

    /** A running (or the last) /dphone carprobe. */
    private static final class Probe {
        String plate, mode;
        int want, done;
        BufferedWriter out;
        double msptSum, msptMax, errSum, errMax, moved;
        int errN, skips, reapplied, hitches;
        String ids = "";
        double sx = Double.NaN, sy, sz; // SKIN at the last sample
        double lastMx = Double.NaN, lastMy, lastMz; // MAIN at the last sample
        String result;
    }
    private Probe probe;

    CarSmooth(JavaPlugin plugin) { this.plugin = plugin; }

    /** Settings: config.yml carsmooth.*, then the live switch kept in carsmooth.yml (/dphone carsmooth). */
    void configure(FileConfiguration c) {
        interval = Math.max(1, Math.min(3, c.getInt("carsmooth.update-interval", 1)));
        range = Math.max(16, Math.min(512, c.getInt("carsmooth.range", 128)));
        Mode m = parse(c.getString("carsmooth.mode", "track"));
        File f = new File(plugin.getDataFolder(), "carsmooth.yml");
        if (f.exists()) {
            Mode saved = parse(YamlConfiguration.loadConfiguration(f).getString("mode", ""));
            if (saved != null) m = saved;
        }
        setMode(m == null ? Mode.TRACK : m);
    }

    private static Mode parse(String s) {
        if (s == null) return null;
        try { return Mode.valueOf(s.trim().toUpperCase(Locale.ROOT)); } catch (IllegalArgumentException e) { return null; }
    }

    private void setMode(Mode m) {
        mode = m;
        if (!m.track()) restoreIntervals();
    }

    void start() {
        if (task != null) return;
        task = Bukkit.getGlobalRegionScheduler().runAtFixedRate(plugin, t -> tick(), 1L, 1L);
    }

    void shutdown() {
        if (task != null) { task.cancel(); task = null; }
        restoreIntervals();
        endProbe("stopped");
        cars.clear();
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onTickEnd(ServerTickEndEvent e) {
        lastMspt = e.getTickDuration();
    }

    // ---------------------------------------------------------------- MTVehicles' data

    private static void loadData(JavaPlugin plugin) {
        if (dataTried) return;
        dataTried = true;
        try {
            Class<?> d = Class.forName("nl.mtvehicles.core.infrastructure.vehicle.VehicleData");
            fAutostand = d.getField("autostand");
            fMainx = d.getField("mainx"); fMainy = d.getField("mainy"); fMainz = d.getField("mainz");
            fSeatx = d.getField("seatx"); fSeaty = d.getField("seaty"); fSeatz = d.getField("seatz");
            fSeatsize = d.getField("seatsize");
        } catch (ReflectiveOperationException | LinkageError ex) {
            dataError = "MTVehicles' VehicleData not found (" + ex.getClass().getSimpleName() + ")";
            plugin.getLogger().warning("carsmooth: " + dataError + "; cars stay as MTVehicles moves them");
        }
    }

    @SuppressWarnings("unchecked")
    private static Object mapGet(Field f, String key) {
        try {
            Map<String, ?> m = (Map<String, ?>) f.get(null);
            return m == null ? null : m.get(key);
        } catch (ReflectiveOperationException | ClassCastException ex) {
            return null;
        }
    }

    /** One of a car's stands by its full name (MTVEHICLES_MAIN_&lt;plate&gt; ...), from MTVehicles' own map; null if unknown. */
    static ArmorStand stand(JavaPlugin plugin, String name) {
        loadData(plugin);
        if (dataError != null) return null;
        Object o = mapGet(fAutostand, name);
        return o instanceof ArmorStand a && a.isValid() ? a : null;
    }

    private static double num(Field f, String key) {
        Object o = mapGet(f, key);
        return o instanceof Number n ? n.doubleValue() : Double.NaN;
    }

    /** The plate of the car a player drives, or null (garage.sk carSeatOf's "driver:"). */
    static String driverPlate(Player p) {
        Entity v = p.getVehicle();
        if (!(v instanceof ArmorStand)) return null;
        String n = v.getName();
        return n.startsWith(MAINSEAT) ? n.substring(MAINSEAT.length()) : null;
    }

    /** MTVehicles' seat spot (VehicleMovement.mainSeat, 2.5.9): x along the car, y up, z across; x and z cast to float like it does. */
    static double[] seatSpot(Location main, double ox, double oy, double oz) {
        Location loc = main.clone();
        Vector dir = loc.getDirection().setY(0);
        if (dir.lengthSquared() < 1e-12) return null;
        Location f = loc.add(dir.normalize().multiply(ox));
        double yaw = Math.toRadians(f.getYaw());
        float z = (float) (f.getZ() + oz * Math.sin(yaw));
        float x = (float) (f.getX() + oz * Math.cos(yaw));
        return new double[] {x, main.getY() + oy, z};
    }

    // ---------------------------------------------------------------- Paper internals

    private Object handle(Entity e) throws ReflectiveOperationException {
        return e.getClass().getMethod("getHandle").invoke(e);
    }

    private void snap(Entity e, double x, double y, double z, float yaw, float pitch) throws ReflectiveOperationException {
        Object h = handle(e);
        if (mAbsSnapTo == null) {
            for (Class<?> c = h.getClass(); c != null && mAbsSnapTo == null; c = c.getSuperclass()) {
                try { mAbsSnapTo = c.getDeclaredMethod("absSnapTo", double.class, double.class, double.class, float.class, float.class); }
                catch (NoSuchMethodException ignored) { }
            }
            if (mAbsSnapTo == null) throw new NoSuchMethodException("Entity.absSnapTo");
            mAbsSnapTo.setAccessible(true);
        }
        mAbsSnapTo.invoke(h, x, y, z, yaw, pitch);
    }

    /** The stand's ServerEntity (null while nobody tracks it). */
    private Object serverEntity(Entity e) throws ReflectiveOperationException {
        Object h = handle(e);
        if (mGetTrackedEntity == null) {
            mGetTrackedEntity = findMethod(h.getClass(), "moonrise$getTrackedEntity");
            mGetTrackedEntity.setAccessible(true);
        }
        Object tracked = mGetTrackedEntity.invoke(h);
        if (tracked == null) return null;
        if (fServerEntity == null) {
            fServerEntity = tracked.getClass().getField("serverEntity");
        }
        raiseRange(tracked);
        Object se = fServerEntity.get(tracked);
        if (se != null && fUpdateInterval == null) {
            fUpdateInterval = se.getClass().getDeclaredField("updateInterval");
            fUpdateInterval.setAccessible(true);
        }
        return se;
    }

    /** ChunkMap.TrackedEntity's (private final) range up to carsmooth.range, remembering its own; a failure only logs once. */
    private boolean rangeFailed;
    private void raiseRange(Object tracked) {
        if (rangeFailed) return;
        try {
            if (fRange == null) {
                fRange = tracked.getClass().getDeclaredField("range");
                fRange.setAccessible(true);
            }
            int now = fRange.getInt(tracked);
            if (now >= range) return;
            if (!ranged.containsKey(tracked)) ranged.put(tracked, now);
            fRange.setInt(tracked, range);
        } catch (ReflectiveOperationException | RuntimeException ex) {
            rangeFailed = true;
            plugin.getLogger().warning("carsmooth range: off (" + ex + ")");
        }
    }

    private static Method findMethod(Class<?> c, String name) throws NoSuchMethodException {
        for (Class<?> k = c; k != null; k = k.getSuperclass()) {
            for (Method m : k.getDeclaredMethods()) if (m.getName().equals(name) && m.getParameterCount() == 0) return m;
        }
        throw new NoSuchMethodException(name);
    }

    private void track(Entity e) {
        if (trackError != null || e == null) return;
        try {
            Object se = serverEntity(e);
            if (se == null) return;
            int now = fUpdateInterval.getInt(se);
            if (now == interval) return;
            if (!changed.containsKey(se)) changed.put(se, now);
            fUpdateInterval.setInt(se, interval);
        } catch (ReflectiveOperationException | RuntimeException ex) {
            trackError = String.valueOf(ex);
            plugin.getLogger().warning("carsmooth track: off (" + trackError + ")");
        }
    }

    private void restoreIntervals() {
        if (fRange != null) {
            for (Map.Entry<Object, Integer> en : new ArrayList<>(ranged.entrySet())) {
                try { fRange.setInt(en.getKey(), en.getValue()); } catch (ReflectiveOperationException | RuntimeException ignored) { }
            }
        }
        ranged.clear();
        if (fUpdateInterval == null) { changed.clear(); return; }
        for (Map.Entry<Object, Integer> en : new ArrayList<>(changed.entrySet())) {
            try { fUpdateInterval.setInt(en.getKey(), en.getValue()); } catch (ReflectiveOperationException | RuntimeException ignored) { }
        }
        changed.clear();
    }

    // ---------------------------------------------------------------- the tick

    private void tick() {
        tickNo++;
        loadData(plugin);
        if (dataError != null) return;
        Set<String> driven = new HashSet<>();
        for (Player p : Bukkit.getOnlinePlayers()) {
            String plate = driverPlate(p);
            if (plate == null || !driven.add(plate)) continue;
            try {
                car(plate);
            } catch (RuntimeException ex) {
                plugin.getLogger().warning("carsmooth " + plate + ": " + ex);
            }
        }
        cars.keySet().removeIf(k -> !driven.contains(k));
        if (probe != null && probe.out != null && !driven.contains(probe.plate) && probe.done > 0) endProbe("car not driven");
    }

    private void car(String plate) {
        ArmorStand main = stand(plugin, MAIN + plate), skin = stand(plugin, SKIN + plate), seat = stand(plugin, MAINSEAT + plate);
        if (main == null || skin == null || seat == null) return;
        if (!main.getWorld().equals(skin.getWorld()) || !main.getWorld().equals(seat.getWorld())) return;
        CarState st = cars.computeIfAbsent(plate, k -> new CarState());
        Location m = main.getLocation();
        Location s0 = skin.getLocation();
        boolean skinAtMain = close(s0, m.getX(), m.getY(), m.getZ(), 1e-4);
        boolean mainMoved = !Double.isNaN(st.mx) && !close(m, st.mx, st.my, st.mz, 1e-4);
        // MTVehicles' movement puts SKIN on MAIN; when it skipped this tick, SKIN still sits where MAIN was a tick ago.
        boolean skipped = !skinAtMain && mainMoved && close(s0, st.mx, st.my, st.mz, 1e-4);
        boolean ran = !skipped;
        boolean reapplied = false;

        List<ArmorStand> seats = new ArrayList<>();
        List<double[]> offs = new ArrayList<>();
        seats.add(seat);
        offs.add(new double[] {num(fMainx, MAINSEAT + plate), num(fMainy, MAINSEAT + plate), num(fMainz, MAINSEAT + plate)});
        Object size = mapGet(fSeatsize, plate);
        int n = size instanceof Number k ? k.intValue() : 0;
        for (int i = 2; i <= n && i < 32; i++) {
            ArmorStand s = stand(plugin, SEAT + i + "_" + plate);
            if (s == null) continue;
            seats.add(s);
            String key = SEAT + i + "_" + plate;
            offs.add(new double[] {num(fSeatx, key), num(fSeaty, key), num(fSeatz, key)});
        }

        if (mode.sync() && syncError == null) {
            try {
                // MTVehicles turns MAIN in a task of its own, which may run after SKIN was put on it: the yaw too.
                if (!skinAtMain || Math.abs(s0.getYaw() - m.getYaw()) > 1e-3) snap(skin, m.getX(), m.getY(), m.getZ(), m.getYaw(), m.getPitch());
                for (int i = 0; i < seats.size(); i++) {
                    double[] o = offs.get(i);
                    if (Double.isNaN(o[0]) || Double.isNaN(o[1]) || Double.isNaN(o[2])) continue;
                    double[] at = seatSpot(m, o[0], o[1], o[2]);
                    if (at == null) continue;
                    ArmorStand s = seats.get(i);
                    Location sl = s.getLocation();
                    if (!close(sl, at[0], at[1], at[2], 1e-5) || Math.abs(sl.getYaw() - m.getYaw()) > 1e-3) snap(s, at[0], at[1], at[2], m.getYaw(), m.getPitch());
                }
                // A skipped tick coasts at about half speed: give MAIN the velocity MTVehicles set a tick ago, once.
                if (skipped && st.ran && st.vel != null && !main.isDead()) {
                    main.setVelocity(st.vel);
                    reapplied = true;
                    reappliedTotal++;
                }
            } catch (ReflectiveOperationException | RuntimeException ex) {
                syncError = String.valueOf(ex);
                plugin.getLogger().warning("carsmooth sync: off (" + syncError + ")");
            }
        }
        if (mode.track()) {
            track(skin);
            for (ArmorStand s : seats) track(s);
        }
        // Before the entity tick, MAIN's velocity is still the one MTVehicles just set (a skip tick's is ours or friction's).
        if (skinAtMain) st.vel = main.getVelocity();
        st.ran = !skipped;
        st.mx = m.getX(); st.my = m.getY(); st.mz = m.getZ();
        st.seen = tickNo;

        if (probe != null && probe.out != null && plate.equals(probe.plate)) sample(probe, m, skin, seat, offs.get(0), skipped, reapplied, ran, main, seats);
    }

    private static boolean close(Location l, double x, double y, double z, double eps) {
        return Math.abs(l.getX() - x) < eps && Math.abs(l.getY() - y) < eps && Math.abs(l.getZ() - z) < eps;
    }

    // ---------------------------------------------------------------- the probe

    private void sample(Probe pr, Location m, ArmorStand skin, ArmorStand seat, double[] off, boolean skipped, boolean reapplied, boolean ran, ArmorStand main, List<ArmorStand> seats) {
        Location s = skin.getLocation(), t = seat.getLocation();
        double err = Double.NaN;
        double[] want = Double.isNaN(off[0]) ? null : seatSpot(s, off[0], off[1], off[2]);
        if (want != null) err = Math.sqrt(sq(t.getX() - want[0]) + sq(t.getY() - want[1]) + sq(t.getZ() - want[2]));
        boolean eq = close(s, m.getX(), m.getY(), m.getZ(), 1e-4);
        double skinStep = Double.isNaN(pr.sx) ? 0 : Math.sqrt(sq(s.getX() - pr.sx) + sq(s.getY() - pr.sy) + sq(s.getZ() - pr.sz));
        double mainStep = 0;
        if (pr.done == 0) {
            StringBuilder ids = new StringBuilder("MAIN:" + main.getEntityId() + ",SKIN:" + skin.getEntityId());
            for (int i = 0; i < seats.size(); i++) ids.append(i == 0 ? ",MAINSEAT:" : ",SEAT" + (i + 1) + ":").append(seats.get(i).getEntityId());
            pr.ids = ids.toString();
        }
        boolean moving = !Double.isNaN(pr.lastMx) && Math.sqrt(sq(m.getX() - pr.lastMx) + sq(m.getZ() - pr.lastMz)) > 0.05;
        if (!Double.isNaN(pr.lastMx)) {
            mainStep = Math.sqrt(sq(m.getX() - pr.lastMx) + sq(m.getY() - pr.lastMy) + sq(m.getZ() - pr.lastMz));
            pr.moved += mainStep;
        }
        boolean hitch = !Double.isNaN(pr.sx) && mainStep > 0.01 && skinStep < 0.001;
        pr.done++;
        pr.msptSum += lastMspt;
        pr.msptMax = Math.max(pr.msptMax, lastMspt);
        if (moving && !Double.isNaN(err)) { pr.errSum += err; pr.errMax = Math.max(pr.errMax, err); pr.errN++; }
        if (skipped) pr.skips++;
        if (reapplied) pr.reapplied++;
        if (hitch) pr.hitches++;
        try {
            pr.out.write(String.format(Locale.ROOT, "%d,%d,%.2f,%s,%.4f,%.4f,%.4f,%.2f,%.4f,%.4f,%.4f,%.2f,%.4f,%.4f,%.4f,%.2f,%s,%.4f,%s,%s,%s,%s,%.4f,%.4f%n",
                    tickNo, System.nanoTime(), lastMspt, mode.name().toLowerCase(Locale.ROOT),
                    m.getX(), m.getY(), m.getZ(), m.getYaw(), s.getX(), s.getY(), s.getZ(), s.getYaw(), t.getX(), t.getY(), t.getZ(), t.getYaw(),
                    eq, err, ran, skipped, reapplied, hitch, mainStep, skinStep));
        } catch (IOException ex) {
            plugin.getLogger().warning("carprobe: " + ex.getMessage());
            endProbe("write failed");
            return;
        }
        pr.sx = s.getX(); pr.sy = s.getY(); pr.sz = s.getZ();
        pr.lastMx = m.getX(); pr.lastMy = m.getY(); pr.lastMz = m.getZ();
        if (pr.done >= pr.want) endProbe("done");
    }

    private static double sq(double d) { return d * d; }

    private String summary(Probe pr, String state) {
        return String.format(Locale.ROOT, "CARPROBE %s %s ticks=%d/%d mode=%s mspt=%.1f/%.1f seatErr=%.3f/%.3f skips=%d reapplied=%d hitches=%d moved=%.2f ids=%s",
                pr.plate, state, pr.done, pr.want, pr.mode, pr.done == 0 ? 0 : pr.msptSum / pr.done, pr.msptMax,
                pr.errN == 0 ? 0 : pr.errSum / pr.errN, pr.errMax, pr.skips, pr.reapplied, pr.hitches, pr.moved, pr.ids);
    }

    private void endProbe(String why) {
        Probe pr = probe;
        if (pr == null || pr.out == null) return;
        pr.result = summary(pr, why.equals("done") ? "done" : "ended(" + why + ")");
        try {
            pr.out.write("# " + pr.result + System.lineSeparator());
            pr.out.close();
        } catch (IOException ignored) { }
        pr.out = null;
        plugin.getLogger().info(pr.result);
    }

    // ---------------------------------------------------------------- commands

    /** /dphone carsmooth [off|sync|track|all | input &lt;player&gt; &lt;keys&gt;] and /dphone carprobe &lt;plate&gt; [&lt;ticks&gt;]. */
    boolean command(CommandSender sender, String[] a) {
        if (a[0].equalsIgnoreCase("carprobe")) return probeCommand(sender, a);
        if (a.length >= 2 && a[1].equalsIgnoreCase("input")) return inputCommand(sender, a);
        if (a.length == 2) {
            Mode m = parse(a[1]);
            if (m == null) { sender.sendMessage("CARSMOOTH usage: /dphone carsmooth [off|sync|track|all]"); return true; }
            setMode(m);
            YamlConfiguration y = new YamlConfiguration();
            y.set("mode", m.name().toLowerCase(Locale.ROOT));
            y.options().setHeader(List.of("The live /dphone carsmooth switch (overrides config.yml carsmooth.mode). Made by the plugin."));
            try { y.save(new File(plugin.getDataFolder(), "carsmooth.yml")); } catch (IOException ex) { sender.sendMessage("CARSMOOTH can't save carsmooth.yml: " + ex.getMessage()); }
        }
        loadData(plugin);
        sender.sendMessage("CARSMOOTH mode=" + mode.name().toLowerCase(Locale.ROOT) + " interval=" + interval
                + " data=" + (dataError == null ? "ok" : dataError) + " sync=" + (syncError == null ? "ok" : syncError)
                + " track=" + (trackError == null ? "ok" : trackError) + " driven=" + cars.size() + " tracked=" + changed.size() + " reapplied=" + reappliedTotal);
        return true;
    }

    private boolean probeCommand(CommandSender sender, String[] a) {
        if (a.length < 2) { sender.sendMessage("CARPROBE usage: /dphone carprobe <plate> [<ticks>]"); return true; }
        String plate = a[1].toUpperCase(Locale.ROOT);
        if (a.length == 2) {
            Probe pr = probe;
            if (pr == null || !pr.plate.equals(plate)) sender.sendMessage("CARPROBE " + plate + " none");
            else sender.sendMessage(pr.out != null ? summary(pr, "running") : pr.result);
            return true;
        }
        int ticks;
        try { ticks = Integer.parseInt(a[2]); } catch (NumberFormatException ex) { sender.sendMessage("CARPROBE: ticks must be a number"); return true; }
        ticks = Math.max(1, Math.min(6000, ticks));
        endProbe("replaced");
        Probe pr = new Probe();
        pr.plate = plate;
        pr.want = ticks;
        pr.mode = mode.name().toLowerCase(Locale.ROOT);
        try {
            plugin.getDataFolder().mkdirs();
            pr.out = new BufferedWriter(new FileWriter(new File(plugin.getDataFolder(), "carprobe.log"), true));
            pr.out.write("# carprobe " + plate + " ticks=" + ticks + " mode=" + pr.mode + " at " + new java.util.Date() + System.lineSeparator());
            pr.out.write("tick,nano,mspt,mode,mainX,mainY,mainZ,mainYaw,skinX,skinY,skinZ,skinYaw,seatX,seatY,seatZ,seatYaw,skinEqMain,seatErr,ran,skipped,reapplied,hitch,mainStep,skinStep" + System.lineSeparator());
        } catch (IOException ex) {
            sender.sendMessage("CARPROBE can't write carprobe.log: " + ex.getMessage());
            return true;
        }
        probe = pr;
        sender.sendMessage("CARPROBE " + plate + " started ticks=" + ticks + " mode=" + pr.mode);
        return true;
    }

    // Test-only: /dphone carsmooth input <player> <keys> hands MTVehicles' handler a player-input packet as if the client
    // had sent it (keys: any of w a s d j, or "none"), for bots whose own input packets don't reach it.
    private Constructor<?> inputCtor, packetCtor;

    private boolean inputCommand(CommandSender sender, String[] a) {
        if (a.length != 4) { sender.sendMessage("CARINPUT usage: /dphone carsmooth input <player> <w|a|s|d|j...|none>"); return true; }
        Player p = Bukkit.getPlayerExact(a[2]);
        if (p == null) { sender.sendMessage("CARINPUT no player " + a[2]); return true; }
        String k = a[3].toLowerCase(Locale.ROOT);
        if (k.equals("none")) k = "";
        try {
            if (inputCtor == null) {
                Class<?> in = Class.forName("net.minecraft.world.entity.player.Input");
                inputCtor = in.getConstructor(boolean.class, boolean.class, boolean.class, boolean.class, boolean.class, boolean.class, boolean.class);
                packetCtor = Class.forName("net.minecraft.network.protocol.game.ServerboundPlayerInputPacket").getConstructor(in);
            }
            Object input = inputCtor.newInstance(k.contains("w"), k.contains("s"), k.contains("a"), k.contains("d"), k.contains("j"), false, false);
            Object packet = packetCtor.newInstance(input);
            Object sp = handle(p);
            Object listener = sp.getClass().getField("connection").get(sp);
            Object connection = listener.getClass().getField("connection").get(listener);
            Channel ch = (Channel) connection.getClass().getField("channel").get(connection);
            ChannelHandler h = ch.pipeline().get(p.getName());
            ChannelHandlerContext ctx = ch.pipeline().context(p.getName());
            if (!(h instanceof ChannelInboundHandler ih) || ctx == null) { sender.sendMessage("CARINPUT " + p.getName() + " no MTVehicles handler"); return true; }
            ch.eventLoop().execute(() -> {
                try { ih.channelRead(ctx, packet); } catch (Exception ex) { plugin.getLogger().warning("carinput: " + ex); }
            });
            sender.sendMessage("CARINPUT " + p.getName() + " keys=" + (k.isEmpty() ? "none" : k));
        } catch (ReflectiveOperationException | RuntimeException | LinkageError ex) {
            sender.sendMessage("CARINPUT failed: " + ex);
        }
        return true;
    }

    /** Tab completion for /dphone carsmooth and carprobe (args as /dphone gets them). */
    List<String> complete(String[] a) {
        List<String> out = new ArrayList<>();
        if (a.length == 2 && a[0].equalsIgnoreCase("carsmooth")) out.addAll(List.of("off", "sync", "track", "all"));
        if (a.length == 2 && a[0].equalsIgnoreCase("carprobe")) {
            for (Player p : Bukkit.getOnlinePlayers()) { String pl = driverPlate(p); if (pl != null) out.add(pl); }
        }
        if (a.length == 3 && a[0].equalsIgnoreCase("carprobe")) out.addAll(List.of("100", "200", "400"));
        return out;
    }
}
