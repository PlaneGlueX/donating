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
 *
 * Resyncing together (owner, 2026-09-29, in the 26.3 client: "sometimes, player velocity doesnt match the car and their
 * head glitches out"; research glitch-research.md "Fix A", checked in the Paper 1.21.11 bytecode). ViaVersion turns each
 * per-tick move of a stand into a 1-tick step for a 26.3 client, but a full position resync (ENTITY_POSITION_SYNC) into a
 * 3-tick step, and the client only catches up once more than 3 ticks are queued: a stand that resyncs stays 2 ticks behind
 * until the car stops. A stand resyncs on its own every 400 sends (20 s at one a tick; ServerEntity.teleportDelay), when a
 * player starts tracking it (onPlayerAdd sets forceStateResync) and when its onGround flips; the model (SKIN) and the seat
 * (MAINSEAT) doing it on different ticks put the driver up to 2 blocks off the car model. So, with carsmooth.together
 * (track mode), every tick before the tracker, for each driven car's visible stands and the driver's chase camera
 * (CarCam registers it with likeCar): teleportDelay back to 0 (the periodic resync never fires while driving: relative
 * moves are exact 1/4096 steps, nothing drifts), an onGround flip isn't passed on as a resync (every move packet carries
 * the flag), and when any one of them would resync this tick (its flag already set by a player who started tracking it
 * outside the tracker, or a player about to start tracking it: the tracker's own range, view-distance, canSee and chunk
 * checks), forceStateResync on all of them. The tracker handles each entity in one pass (updatePlayers, then
 * sendChanges), so a new tracker found only there (PlayerTrackEntityEvent, which Paper fires just before onPlayerAdd;
 * usually a player whose chunks just arrived) flags the rest of the car too: the ones after it in the list resync in the
 * same tick, the ones before it one tick later (the probe counts those). /dphone carsmooth together on|off (kept in
 * carsmooth.yml) for A/B drives.
 */
final class CarSmooth implements Listener {
    enum Mode {
        OFF, SYNC, TRACK, ALL;
        boolean sync() { return this == SYNC || this == ALL; }
        boolean track() { return this == TRACK || this == ALL; }
    }

    static final String MAIN = "MTVEHICLES_MAIN_", SKIN = "MTVEHICLES_SKIN_", MAINSEAT = "MTVEHICLES_MAINSEAT_", SEAT = "MTVEHICLES_SEAT";

    /** The running instance (for CarCam's camera stand: likeCar); null while the plugin is stopped. */
    private static CarSmooth instance;

    private final JavaPlugin plugin;
    private Mode mode = Mode.TRACK;
    private boolean together = true;
    private int interval = 1;
    private int range = 128;
    // Ticks a rider may stay with the head in a block, no suffocation, before being put out of the car (onSeatSuffocate).
    private int wallGrace = 40;
    private final Map<java.util.UUID, int[]> wallRun = new HashMap<>(); // rider -> {first, last} tick of suffocation hits
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

    // Resyncing together (ServerEntity's private teleportDelay, forceStateResync, wasOnGround; TrackedEntity's seenBy
    // and getEffectiveRange; ServerPlayer's connection).
    private String resyncError;
    private Field fTeleportDelay, fForceResync, fWasOnGround, fSeenBy, fConnection;
    private Method mEffectiveRange;
    private boolean effRangeFailed;
    /** This tick's groups: each driven car's visible stands and its chase camera (rebuilt every tick). */
    private final Map<String, List<Entity>> groups = new HashMap<>();
    private final Map<Integer, String> groupPlate = new HashMap<>();
    /** Entities that go with a car (CarCam's camera stand), refreshed by likeCar every tick. */
    private static final class Extra {
        final Entity e;
        long stamp;
        Extra(Entity e, long stamp) { this.e = e; this.stamp = stamp; }
    }
    private final Map<String, Map<Integer, Extra>> extras = new HashMap<>();
    /** Which stands resync in which tick, per car: "now" (this tick, still growing during the tracker), "prev". */
    private static final class SyncState {
        long tick = -1;
        Set<Integer> now = new HashSet<>();
        Set<Integer> prev = new HashSet<>();
        /** Stands a new tracker's event flagged in this tick / the last (one the tracker had already passed resyncs a tick late). */
        Set<Integer> flaggedNow = new HashSet<>();
        Set<Integer> flaggedPrev = new HashSet<>();
    }
    private final Map<String, SyncState> syncs = new HashMap<>();
    /** "entityId|player uuid" -> the tick a new tracker was predicted (not again for 40 ticks if it didn't happen). */
    private final Map<String, Long> predicted = new HashMap<>();
    private long forcedTotal, eventsTotal, flaggedTotal;

    /** What resync() saw of one stand this tick (for the probe). */
    private static final class Read {
        int td = -1;
        boolean fsr, ground, tracked;
    }
    private static final class SyncView {
        final Map<Integer, Read> reads = new HashMap<>();
        Set<Integer> prevResynced = new HashSet<>();
        boolean forced, predictedAdd;
    }

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
        // Resyncs (the rows' last columns): ticks where exactly one of SKIN and MAINSEAT resynced (target 0), both did,
        // the whole car was forced to, and new trackers seen (PlayerTrackEntityEvent) since the probe started.
        int oneResync, bothResync, forcedTicks;
        long events0;
        boolean together;
    }
    private Probe probe;

    /** Steering by speed (CarSteer): run first for every driven car each tick. */
    final CarSteer steer;

    CarSmooth(JavaPlugin plugin) { this.plugin = plugin; this.steer = new CarSteer(plugin); }

    /** Settings: config.yml carsmooth.*, then the live switch kept in carsmooth.yml (/dphone carsmooth). */
    void configure(FileConfiguration c) {
        steer.configure(c);
        interval = Math.max(1, Math.min(3, c.getInt("carsmooth.update-interval", 1)));
        range = Math.max(16, Math.min(512, c.getInt("carsmooth.range", 128)));
        wallGrace = Math.max(0, Math.min(400, c.getInt("carsmooth.wall-grace", 40)));
        Mode m = parse(c.getString("carsmooth.mode", "track"));
        boolean tog = c.getBoolean("carsmooth.together", true);
        File f = new File(plugin.getDataFolder(), "carsmooth.yml");
        if (f.exists()) {
            YamlConfiguration y = YamlConfiguration.loadConfiguration(f);
            Mode saved = parse(y.getString("mode", ""));
            if (saved != null) m = saved;
            if (y.isBoolean("together")) tog = y.getBoolean("together");
        }
        together = tog;
        setMode(m == null ? Mode.TRACK : m);
    }

    private void saveSwitches(CommandSender sender) {
        YamlConfiguration y = new YamlConfiguration();
        y.set("mode", mode.name().toLowerCase(Locale.ROOT));
        y.set("together", together);
        y.options().setHeader(List.of("The live /dphone carsmooth switches (override config.yml carsmooth.mode and carsmooth.together). Made by the plugin."));
        try { y.save(new File(plugin.getDataFolder(), "carsmooth.yml")); } catch (IOException ex) { sender.sendMessage("CARSMOOTH can't save carsmooth.yml: " + ex.getMessage()); }
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
        instance = this;
        if (task != null) return;
        task = Bukkit.getGlobalRegionScheduler().runAtFixedRate(plugin, t -> tick(), 1L, 1L);
    }

    void shutdown() {
        if (task != null) { task.cancel(); task = null; }
        steer.restoreAll(); // MTVehicles steers the cars again
        restoreIntervals();
        endProbe("stopped");
        cars.clear();
        groups.clear();
        groupPlate.clear();
        extras.clear();
        syncs.clear();
        if (instance == this) instance = null;
    }

    /**
     * An entity that goes with a driven car (CarCam's camera stand): sent like the car's stands (the same update interval
     * and tracking range while "track" is on, vanilla's otherwise, exactly like them) and resynced together with them.
     * Call it every tick the entity exists, before the entity tracker (a global-region task), and before showing a new
     * one to anyone, so its first resync (the new tracker) brings the car's stands along in the same tick.
     */
    static void likeCar(Entity e, String plate) {
        CarSmooth s = instance;
        if (s == null || e == null || plate == null || !e.isValid()) return;
        Extra x = s.extras.computeIfAbsent(plate, k -> new HashMap<>()).get(e.getEntityId());
        if (x == null) s.extras.get(plate).put(e.getEntityId(), new Extra(e, s.tickNo));
        else x.stamp = s.tickNo;
        // Into this tick's group at once (the tracker and a new tracker's event come after this).
        List<Entity> g = s.groups.get(plate);
        if (g != null && !s.groupPlate.containsKey(e.getEntityId())) { g.add(e); s.groupPlate.put(e.getEntityId(), plate); }
        if (s.mode.track()) s.track(e);
    }

    /** No longer with a car (CarCam's camera removed). */
    static void forget(Entity e) {
        CarSmooth s = instance;
        if (s == null || e == null) return;
        for (Map<Integer, Extra> m : s.extras.values()) m.remove(e.getEntityId());
        String plate = s.groupPlate.remove(e.getEntityId());
        if (plate != null && s.groups.get(plate) != null) s.groups.get(plate).remove(e);
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

    /** The entity's ChunkMap.TrackedEntity (null while it isn't in the tracker). */
    private Object trackedOf(Entity e) throws ReflectiveOperationException {
        Object h = handle(e);
        if (mGetTrackedEntity == null) {
            mGetTrackedEntity = findMethod(h.getClass(), "moonrise$getTrackedEntity");
            mGetTrackedEntity.setAccessible(true);
        }
        return mGetTrackedEntity.invoke(h);
    }

    private Object serverEntityOf(Object tracked) throws ReflectiveOperationException {
        if (fServerEntity == null) fServerEntity = tracked.getClass().getField("serverEntity");
        return fServerEntity.get(tracked);
    }

    /** The stand's ServerEntity (null while nobody tracks it). */
    private Object serverEntity(Entity e) throws ReflectiveOperationException {
        Object tracked = trackedOf(e);
        if (tracked == null) return null;
        raiseRange(tracked);
        Object se = serverEntityOf(tracked);
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

    // ---------------------------------------------------------------- resyncing together

    private boolean resyncReady(Object tracked, Object se) {
        if (resyncError != null) return false;
        if (fTeleportDelay != null && fSeenBy != null) return true;
        try {
            Class<?> c = se.getClass();
            Field td = c.getDeclaredField("teleportDelay"), fsr = c.getDeclaredField("forceStateResync"), og = c.getDeclaredField("wasOnGround");
            td.setAccessible(true);
            fsr.setAccessible(true);
            og.setAccessible(true);
            fSeenBy = tracked.getClass().getField("seenBy");
            fForceResync = fsr;
            fWasOnGround = og;
            fTeleportDelay = td;
            return true;
        } catch (ReflectiveOperationException | RuntimeException ex) {
            resyncError = String.valueOf(ex);
            plugin.getLogger().warning("carsmooth together: off (" + resyncError + ")");
            return false;
        }
    }

    private Object connection(Player p) {
        try {
            Object h = handle(p);
            if (fConnection == null) fConnection = h.getClass().getField("connection");
            return fConnection.get(h);
        } catch (ReflectiveOperationException | RuntimeException ex) {
            return null;
        }
    }

    /** TrackedEntity.getEffectiveRange() (its range, or a passenger's if bigger), else the range field or ours. */
    private int effectiveRange(Object tracked) {
        if (!effRangeFailed) {
            try {
                if (mEffectiveRange == null) {
                    mEffectiveRange = tracked.getClass().getDeclaredMethod("getEffectiveRange");
                    mEffectiveRange.setAccessible(true);
                }
                return (Integer) mEffectiveRange.invoke(tracked);
            } catch (ReflectiveOperationException | RuntimeException ex) {
                effRangeFailed = true;
                plugin.getLogger().warning("carsmooth: TrackedEntity.getEffectiveRange unreadable (" + ex + "); using the range field");
            }
        }
        try { if (fRange != null) return fRange.getInt(tracked); } catch (ReflectiveOperationException | RuntimeException ignored) { }
        return range;
    }

    /** What ChunkMap.TrackedEntity.updatePlayer checks before it adds a player (Paper 1.21.11; tracking-range-y left out: off by default). */
    private boolean wouldTrack(Object tracked, Entity e, Player p) {
        if (p == e || !p.getWorld().equals(e.getWorld())) return false;
        Location l = e.getLocation(), pl = p.getLocation();
        double dx = pl.getX() - l.getX(), dz = pl.getZ() - l.getZ();
        int r = Math.min(effectiveRange(tracked), p.getSendViewDistance() * 16);
        if (dx * dx + dz * dz > (double) r * r) return false;
        if (!p.canSee(e)) return false;
        return p.isChunkSent(org.bukkit.Chunk.getChunkKey(l.getBlockX() >> 4, l.getBlockZ() >> 4));
    }

    /**
     * One car's group before the tracker: reads each stand's resync state, sets teleportDelay back to 0 and, when any of
     * them resyncs this tick, makes all of them resync (track mode with carsmooth.together; otherwise only reads). Also
     * works out which stands resynced in the tick before (the probe's numbers). Null when the fields can't be read.
     */
    private SyncView resync(String plate, List<Entity> group) {
        SyncState st = syncs.computeIfAbsent(plate, k -> new SyncState());
        boolean last = st.tick == tickNo - 1;
        st.prev = last ? st.now : new HashSet<>();
        st.flaggedPrev = last ? st.flaggedNow : new HashSet<>();
        st.now = new HashSet<>();
        st.flaggedNow = new HashSet<>();
        st.tick = tickNo;
        SyncView v = new SyncView();
        List<Object> ses = new ArrayList<>();
        boolean any = false;
        Map<Player, Object> conns = new HashMap<>();
        try {
            for (Entity e : group) {
                Read r = new Read();
                v.reads.put(e.getEntityId(), r);
                Object tracked = trackedOf(e);
                if (tracked == null) continue;
                Object se = serverEntityOf(tracked);
                if (se == null || !resyncReady(tracked, se)) { if (resyncError != null) return null; continue; }
                r.tracked = true;
                r.td = fTeleportDelay.getInt(se);
                r.fsr = fForceResync.getBoolean(se);
                r.ground = fWasOnGround.getBoolean(se) != e.isOnGround();
                ses.add(se);
                // A flag still set now was set after its own sendChanges last tick: it resyncs in this tick, not the last
                // one. When our event handler set it (the rest of the car resynced last tick), it's only late: forcing
                // the others again would put them a second resync behind it. Any other flag (a player starting to track
                // it outside the tracker, e.g. showEntity in a task) brings the whole car along.
                if (r.fsr) st.prev.remove(e.getEntityId());
                boolean late = r.fsr && st.flaggedPrev.contains(e.getEntityId());
                boolean ours = together && mode.track();
                // An onGround flip resyncs a stand only to send the flag, which every move packet carries anyway: while
                // driving, the tracker is told it didn't flip (no lone resync; it never forces the whole car either).
                if (r.ground && ours) fWasOnGround.setBoolean(se, e.isOnGround());
                boolean own = r.fsr || (!ours && (r.ground || r.td + 1 > 400));
                if (own) st.now.add(e.getEntityId());
                if (own && !late) any = true;
                if (!any && ours && predictAdd(tracked, e, conns)) { any = true; v.predictedAdd = true; }
            }
            if (together && mode.track()) {
                for (Object se : ses) fTeleportDelay.setInt(se, 0);
                if (any && ses.size() > 1) {
                    for (Object se : ses) fForceResync.setBoolean(se, true);
                    for (Entity e : group) if (v.reads.get(e.getEntityId()).tracked) st.now.add(e.getEntityId());
                    v.forced = true;
                    forcedTotal++;
                }
            }
        } catch (ReflectiveOperationException | RuntimeException ex) {
            resyncError = String.valueOf(ex);
            plugin.getLogger().warning("carsmooth together: off (" + resyncError + ")");
            return null;
        }
        v.prevResynced = st.prev;
        return v;
    }

    /** A player the tracker is about to add for this entity (not predicted again for 40 ticks when it didn't happen). */
    private boolean predictAdd(Object tracked, Entity e, Map<Player, Object> conns) throws ReflectiveOperationException {
        Set<?> seen = (Set<?>) fSeenBy.get(tracked);
        for (Player p : e.getWorld().getPlayers()) {
            Object conn = conns.computeIfAbsent(p, this::connection);
            if (conn == null) continue;
            String key = e.getEntityId() + "|" + p.getUniqueId();
            if (seen.contains(conn)) { predicted.remove(key); continue; }
            if (!wouldTrack(tracked, e, p)) continue;
            Long at = predicted.get(key);
            if (at != null && tickNo - at < 40) continue;
            predicted.put(key, tickNo);
            return true;
        }
        return false;
    }

    /** A driver sat down: MTVehicles' enterVehicle has just set the plate's rotation value; CarSteer takes it over. */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onSeatMount(org.bukkit.event.entity.EntityMountEvent e) {
        if (!(e.getEntity() instanceof Player) || !(e.getMount() instanceof ArmorStand a)) return;
        String n = a.getName();
        if (n.startsWith(MAINSEAT)) steer.mounted(n.substring(MAINSEAT.length()));
    }

    /**
     * Takes a player out of a car's seat. Vanilla saves a player's vehicle with the player (the seat stand goes from the
     * world into their data) and puts it back at their next join: a lone copy of the seat that the car cleanup then
     * removes as a stray, which threw the player out a few seconds after joining (found 2026-09-30 by the seat-exit log,
     * after a server restart). A normal logout is fine (MTVehicles' LeaveListener takes a quitting driver out), but a
     * server stop disables the plugins before the players are saved: PhonePlugin.onDisable takes everyone out first.
     */
    static boolean leaveCar(Player p) {
        return p.getVehicle() instanceof ArmorStand s && s.getName().startsWith("MTVEHICLES_") && p.leaveVehicle();
    }

    /**
     * A head in a block while seated: no suffocation for carsmooth.wall-grace ticks (40), then out of the car (vanilla's
     * dismount finds a free spot). A seat can end up with its rider's head in a block (MTVehicles moves only MAIN against
     * blocks and the seats sit beside it; CarSteer refuses its own turns into a wall, MTVehicles' moves it can't), and the
     * chase view hid the in-wall overlay, so the owner died without seeing it (2026-09-30); CarCam gives a walled driver
     * first person now. Not forever (review fix): a rider sitting in a wall could look through it with F5 for as long as
     * they liked. The damage comes every tick while cancelled (no invulnerability ticks), so the hits' ticks time the stay.
     */
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onSeatSuffocate(org.bukkit.event.entity.EntityDamageEvent e) {
        if (e.getCause() != org.bukkit.event.entity.EntityDamageEvent.DamageCause.SUFFOCATION) return;
        if (!(e.getEntity().getVehicle() instanceof ArmorStand s) || !s.getName().startsWith("MTVEHICLES_")) return;
        e.setCancelled(true);
        if (!(e.getEntity() instanceof Player p)) return; // the chase view's body: CarCam's, never looked through
        int now = Bukkit.getCurrentTick();
        if (wallRun.size() > 64) wallRun.values().removeIf(r -> now - r[1] > 15);
        int[] run = wallRun.get(p.getUniqueId());
        if (run == null || now - run[1] > 15) wallRun.put(p.getUniqueId(), run = new int[] {now, now});
        else run[1] = now;
        if (now - run[0] < wallGrace) return;
        wallRun.remove(p.getUniqueId());
        String seat = s.getName();
        if (leaveCar(p)) {
            plugin.getLogger().info("carsmooth: " + p.getName() + "'s head was in a block for " + wallGrace + " ticks in " + seat + ": out of the car");
            p.sendActionBar(net.kyori.adventure.text.Component.text("Your head was in a wall: out of the car", net.kyori.adventure.text.format.NamedTextColor.GRAY));
            // Vanilla's dismount puts them on top of the seat, and they drop back into the block a few ticks later (seen with
            // bots): watched for a second, moved to a free spot the tick the head is in a block (tasks run before the
            // entity ticks, so before the suffocation check).
            int[] left = {20};
            Bukkit.getScheduler().runTaskTimer(plugin, task -> {
                if (!p.isOnline() || p.isDead() || p.getVehicle() != null || --left[0] < 0) { task.cancel(); return; }
                if (!CarSteer.inWall(p.getEyeLocation(), p.getWidth() * 0.4)) return;
                task.cancel();
                Location free = freeSpotNear(p.getLocation());
                if (free != null && p.teleport(free)) plugin.getLogger().info("carsmooth: " + p.getName() + " moved out of the wall to " + free.getBlockX() + " " + free.getBlockY() + " " + free.getBlockZ());
                else plugin.getLogger().info("carsmooth: " + p.getName() + " is in a wall and no free spot within 3 blocks");
            }, 1L, 1L);
        }
    }

    /**
     * The nearest spot within 3 blocks a player can stand in with the head clear (feet and head passable, solid below):
     * the same level first (beside the car), then a step up or down, then on top of what's there.
     */
    static Location freeSpotNear(Location at) {
        org.bukkit.World w = at.getWorld();
        int bx = at.getBlockX(), by = at.getBlockY(), bz = at.getBlockZ();
        for (int dy : new int[] {0, 1, -1, 2})
            for (int r = 0; r <= 3; r++)
                for (int dx = -r; dx <= r; dx++)
                    for (int dz = -r; dz <= r; dz++) {
                        if (Math.max(Math.abs(dx), Math.abs(dz)) != r) continue;
                        org.bukkit.block.Block feet = w.getBlockAt(bx + dx, by + dy, bz + dz);
                        if (!feet.isPassable() || !feet.getRelative(0, 1, 0).isPassable() || feet.getRelative(0, -1, 0).isPassable()) continue;
                        Location l = feet.getLocation().add(0.5, 0, 0.5);
                        if (CarSteer.inWall(w, l.getX(), l.getY() + 1.62, l.getZ(), 0.24)) continue;
                        l.setYaw(at.getYaw());
                        l.setPitch(at.getPitch());
                        return l;
                    }
        return null;
    }

    /** A seat that came back with a player anyway (a crash, a player file from before this): out of it at once. */
    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoinInCar(org.bukkit.event.player.PlayerJoinEvent e) {
        Player p = e.getPlayer();
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (p.isOnline() && leaveCar(p)) plugin.getLogger().info("carsmooth: " + p.getName() + " joined in a car seat saved with them: out of it");
        }, 1L);
    }

    /**
     * A driver or passenger leaving a car's seat: one log line with what took them out (the call stack's frames outside
     * the event system), the keys they held and the car's speed. Exits are rare, so it's always on: it's how an
     * unexpected ejection gets found (the owner, 2026-09-30: popped out while going back and forth fast).
     */
    @EventHandler(priority = EventPriority.MONITOR)
    public void onSeatLeave(org.bukkit.event.entity.EntityDismountEvent e) {
        if (!(e.getDismounted() instanceof ArmorStand seat)) return;
        String name = seat.getName();
        if (!name.startsWith(MAINSEAT) && !name.startsWith(SEAT)) return;
        // A player, or the chase camera's body of the driver (CarCam.BODY_TAG: what the driver sees in the seat).
        Player p = e.getEntity() instanceof Player q ? q : null;
        if (p == null && !e.getEntity().getScoreboardTags().contains(CarCam.BODY_TAG)) return;
        String plate = name.substring(name.lastIndexOf('_') + 1);
        ArmorStand main = stand(plugin, MAIN + plate);
        String keys = "";
        if (p != null) {
            org.bukkit.Input in = p.getCurrentInput();
            keys = (in.isForward() ? "W" : "") + (in.isBackward() ? "S" : "") + (in.isLeft() ? "A" : "") + (in.isRight() ? "D" : "")
                    + (in.isJump() ? " jump" : "") + (in.isSneak() ? " sneak" : "") + (in.isSprint() ? " sprint" : "");
        }
        StringBuilder stack = new StringBuilder();
        int n = 0;
        for (StackTraceElement f : new Throwable().getStackTrace()) {
            String c = f.getClassName();
            if (c.startsWith("dev.donating.phone.CarSmooth") || c.startsWith("org.bukkit.plugin.") || c.startsWith("io.papermc.paper.plugin.")
                    || c.startsWith("co.aikar.") || c.startsWith("jdk.internal.") || c.startsWith("java.lang.reflect.") || c.contains("EventExecutor")
                    || c.startsWith("com.destroystokyo.paper.event.executor")) continue;
            if (stack.length() > 0) stack.append(" < ");
            stack.append(c.substring(c.lastIndexOf('.') + 1)).append('.').append(f.getMethodName()).append(':').append(f.getLineNumber());
            if (++n >= 14) break;
        }
        Vector v = main != null ? main.getVelocity() : null;
        plugin.getLogger().info(String.format(Locale.ROOT, "CARLEAVE %s from %s tick=%d keys=[%s] sneaking=%s dead=%s seatValid=%s mainVel=%s cancelled=%s by %s",
                p != null ? p.getName() : "body(" + e.getEntity().getEntityId() + ")", name, tickNo, keys.trim(), p != null && p.isSneaking(), e.getEntity().isDead(), seat.isValid(),
                v == null ? "none" : String.format(Locale.ROOT, "%.3f,%.3f,%.3f", v.getX(), v.getY(), v.getZ()), e.isCancelled(), stack));
    }

    /**
     * A player starts tracking a car's stand (or its camera): Paper fires this in ChunkMap.TrackedEntity.updatePlayer,
     * just before ServerEntity.onPlayerAdd sets that stand's forceStateResync (also when the event is cancelled, so
     * cancelled ones count too). The rest of the car gets the flag now: the stands the tracker handles after this one
     * resync in the same tick. Usually the pre-tracker prediction already flagged them all.
     */
    @EventHandler(priority = EventPriority.MONITOR)
    public void onTrack(io.papermc.paper.event.player.PlayerTrackEntityEvent e) {
        Entity en = e.getEntity();
        String plate = groupPlate.get(en.getEntityId());
        if (plate == null) return;
        eventsTotal++;
        SyncState st = syncs.get(plate);
        List<Entity> g = groups.get(plate);
        boolean flag = g != null && together && mode.track() && resyncError == null && fForceResync != null;
        // Already resyncing in this tick (forced before the tracker, or flagged/added by an earlier event this tick):
        // left alone, or a stand the tracker has passed would resync a second time next tick.
        Set<Integer> already = st != null ? new HashSet<>(st.now) : Set.of();
        if (st != null) st.now.add(en.getEntityId());
        if (!flag) return;
        try {
            for (Entity o : g) {
                if (o == en || !o.isValid() || already.contains(o.getEntityId())) continue;
                Object tracked = trackedOf(o);
                if (tracked == null) continue;
                Object se = serverEntityOf(tracked);
                if (se == null || fForceResync.getBoolean(se)) continue;
                fForceResync.setBoolean(se, true);
                flaggedTotal++;
                if (st != null) { st.now.add(o.getEntityId()); st.flaggedNow.add(o.getEntityId()); }
            }
        } catch (ReflectiveOperationException | RuntimeException ex) {
            resyncError = String.valueOf(ex);
            plugin.getLogger().warning("carsmooth together: off (" + resyncError + ")");
        }
    }

    // ---------------------------------------------------------------- the tick

    private void tick() {
        tickNo++;
        loadData(plugin);
        groups.clear();
        groupPlate.clear();
        if (dataError != null) return;
        Set<String> driven = new HashSet<>();
        for (Player p : Bukkit.getOnlinePlayers()) {
            String plate = driverPlate(p);
            if (plate == null || !driven.add(plate)) continue;
            try {
                car(plate, p);
            } catch (RuntimeException ex) {
                plugin.getLogger().warning("carsmooth " + plate + ": " + ex);
            }
        }
        steer.forget(driven);
        cars.keySet().removeIf(k -> !driven.contains(k));
        syncs.keySet().removeIf(k -> !driven.contains(k));
        extras.entrySet().removeIf(en -> {
            en.getValue().values().removeIf(x -> !x.e.isValid() || tickNo - x.stamp > 20);
            return en.getValue().isEmpty();
        });
        if (tickNo % 200 == 0) predicted.values().removeIf(t -> tickNo - t > 200);
        if (probe != null && probe.out != null && !driven.contains(probe.plate) && probe.done > 0) endProbe("car not driven");
    }

    private void car(String plate, Player driver) {
        ArmorStand main = stand(plugin, MAIN + plate), skin = stand(plugin, SKIN + plate), seat = stand(plugin, MAINSEAT + plate);
        if (main == null || skin == null || seat == null) return;
        if (!main.getWorld().equals(skin.getWorld()) || !main.getWorld().equals(seat.getWorld())) return;
        CarState st = cars.computeIfAbsent(plate, k -> new CarState());

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
        // Steering first: everything below (sync, the probe, the chase camera after) sees this tick's heading.
        steer.step(plate, driver, main, skin, seats, offs, (a, x, y, z, yaw, pitch) -> snap(a, x, y, z, yaw, pitch));

        Location m = main.getLocation();
        Location s0 = skin.getLocation();
        boolean skinAtMain = close(s0, m.getX(), m.getY(), m.getZ(), 1e-4);
        boolean mainMoved = !Double.isNaN(st.mx) && !close(m, st.mx, st.my, st.mz, 1e-4);
        // MTVehicles' movement puts SKIN on MAIN; when it skipped this tick, SKIN still sits where MAIN was a tick ago.
        boolean skipped = !skinAtMain && mainMoved && close(s0, st.mx, st.my, st.mz, 1e-4);
        boolean ran = !skipped;
        boolean reapplied = false;

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
        // The group that resyncs together: the model, the seats and whatever goes with the car (the chase camera).
        List<Entity> group = new ArrayList<>();
        group.add(skin);
        group.addAll(seats);
        Map<Integer, Extra> ex = extras.get(plate);
        if (ex != null) {
            for (Extra x : ex.values()) {
                if (x.e.isValid() && x.e.getWorld().equals(skin.getWorld()) && tickNo - x.stamp <= 2 && !group.contains(x.e)) group.add(x.e);
            }
        }
        if (mode.track()) {
            for (Entity e : group) track(e);
        }
        groups.put(plate, group);
        for (Entity e : group) groupPlate.put(e.getEntityId(), plate);
        SyncView sv = resync(plate, group);
        // Before the entity tick, MAIN's velocity is still the one MTVehicles just set (a skip tick's is ours or friction's).
        if (skinAtMain) st.vel = main.getVelocity();
        st.ran = !skipped;
        st.mx = m.getX(); st.my = m.getY(); st.mz = m.getZ();
        st.seen = tickNo;

        if (probe != null && probe.out != null && plate.equals(probe.plate)) sample(probe, m, skin, seat, offs.get(0), skipped, reapplied, ran, main, seats, sv);
    }

    private static boolean close(Location l, double x, double y, double z, double eps) {
        return Math.abs(l.getX() - x) < eps && Math.abs(l.getY() - y) < eps && Math.abs(l.getZ() - z) < eps;
    }

    // ---------------------------------------------------------------- the probe

    private void sample(Probe pr, Location m, ArmorStand skin, ArmorStand seat, double[] off, boolean skipped, boolean reapplied, boolean ran, ArmorStand main, List<ArmorStand> seats, SyncView sv) {
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
        // Resyncs: this tick's reads of SKIN and MAINSEAT, and which of them resynced in the tick before (known only now).
        Read rs = sv == null ? null : sv.reads.get(skin.getEntityId()), rt = sv == null ? null : sv.reads.get(seat.getEntityId());
        boolean prevSkin = sv != null && sv.prevResynced.contains(skin.getEntityId());
        boolean prevSeat = sv != null && sv.prevResynced.contains(seat.getEntityId());
        if (sv != null && pr.done > 1) { // the first row's "tick before" is from before the probe
            if (prevSkin != prevSeat) pr.oneResync++;
            else if (prevSkin) pr.bothResync++;
        }
        if (sv != null && sv.forced) pr.forcedTicks++;
        try {
            pr.out.write(String.format(Locale.ROOT, "%d,%d,%.2f,%s,%.4f,%.4f,%.4f,%.2f,%.4f,%.4f,%.4f,%.2f,%.4f,%.4f,%.4f,%.2f,%s,%.4f,%s,%s,%s,%s,%.4f,%.4f,%d,%s,%s,%d,%s,%s,%s,%s,%s,%s%n",
                    tickNo, System.nanoTime(), lastMspt, mode.name().toLowerCase(Locale.ROOT),
                    m.getX(), m.getY(), m.getZ(), m.getYaw(), s.getX(), s.getY(), s.getZ(), s.getYaw(), t.getX(), t.getY(), t.getZ(), t.getYaw(),
                    eq, err, ran, skipped, reapplied, hitch, mainStep, skinStep,
                    rs == null ? -1 : rs.td, rs != null && rs.fsr, rs != null && rs.ground,
                    rt == null ? -1 : rt.td, rt != null && rt.fsr, rt != null && rt.ground,
                    sv != null && sv.forced, sv != null && sv.predictedAdd, prevSkin, prevSeat));
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
        return String.format(Locale.ROOT, "CARPROBE %s %s ticks=%d/%d mode=%s mspt=%.1f/%.1f seatErr=%.3f/%.3f skips=%d reapplied=%d hitches=%d moved=%.2f together=%s oneResync=%d bothResync=%d forced=%d events=%d ids=%s",
                pr.plate, state, pr.done, pr.want, pr.mode, pr.done == 0 ? 0 : pr.msptSum / pr.done, pr.msptMax,
                pr.errN == 0 ? 0 : pr.errSum / pr.errN, pr.errMax, pr.skips, pr.reapplied, pr.hitches, pr.moved,
                pr.together, pr.oneResync, pr.bothResync, pr.forcedTicks, eventsTotal - pr.events0, pr.ids);
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
        if (a.length == 3 && a[1].equalsIgnoreCase("together")) {
            String v = a[2].toLowerCase(Locale.ROOT);
            if (!v.equals("on") && !v.equals("off")) { sender.sendMessage("CARSMOOTH usage: /dphone carsmooth together on|off"); return true; }
            together = v.equals("on");
            saveSwitches(sender);
        } else if (a.length == 2) {
            Mode m = parse(a[1]);
            if (m == null) { sender.sendMessage("CARSMOOTH usage: /dphone carsmooth [off|sync|track|all] | together on|off"); return true; }
            setMode(m);
            saveSwitches(sender);
        }
        loadData(plugin);
        sender.sendMessage("CARSMOOTH mode=" + mode.name().toLowerCase(Locale.ROOT) + " interval=" + interval
                + " data=" + (dataError == null ? "ok" : dataError) + " sync=" + (syncError == null ? "ok" : syncError)
                + " track=" + (trackError == null ? "ok" : trackError) + " driven=" + cars.size() + " tracked=" + changed.size() + " reapplied=" + reappliedTotal
                + " together=" + (together ? "on" : "off") + " resync=" + (resyncError == null ? "ok" : resyncError)
                + " forced=" + forcedTotal + " events=" + eventsTotal + " flagged=" + flaggedTotal);
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
        pr.together = together && mode.track();
        pr.events0 = eventsTotal;
        try {
            plugin.getDataFolder().mkdirs();
            pr.out = new BufferedWriter(new FileWriter(new File(plugin.getDataFolder(), "carprobe.log"), true));
            pr.out.write("# carprobe " + plate + " ticks=" + ticks + " mode=" + pr.mode + " at " + new java.util.Date() + System.lineSeparator());
            // skinTd..seatGround: this tick's teleportDelay / forceStateResync already set / onGround flipping, before the
            // tracker; forced: the whole car made to resync this tick; predicted: a new tracker seen coming; prevSkinResync,
            // prevSeatResync: whether each resynced in the tick before (known one tick later).
            pr.out.write("tick,nano,mspt,mode,mainX,mainY,mainZ,mainYaw,skinX,skinY,skinZ,skinYaw,seatX,seatY,seatZ,seatYaw,skinEqMain,seatErr,ran,skipped,reapplied,hitch,mainStep,skinStep,skinTd,skinForce,skinGround,seatTd,seatForce,seatGround,forced,predicted,prevSkinResync,prevSeatResync" + System.lineSeparator());
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
        if (a.length == 2 && a[0].equalsIgnoreCase("carsmooth")) out.addAll(List.of("off", "sync", "track", "all", "together"));
        if (a.length == 3 && a[0].equalsIgnoreCase("carsmooth") && a[1].equalsIgnoreCase("together")) out.addAll(List.of("on", "off"));
        if (a.length == 2 && a[0].equalsIgnoreCase("carprobe")) {
            for (Player p : Bukkit.getOnlinePlayers()) { String pl = driverPlate(p); if (pl != null) out.add(pl); }
        }
        if (a.length == 3 && a[0].equalsIgnoreCase("carprobe")) out.addAll(List.of("100", "200", "400"));
        return out;
    }
}
