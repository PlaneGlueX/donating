package dev.donating.phone;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import com.destroystokyo.paper.event.server.ServerTickEndEvent;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelOutboundHandlerAdapter;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.ChannelPromise;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * A car's stands step together on the client (owner, 2026-09-30: "drive in the hotrod car and look how the player lags
 * into the back seat"). Seen in the owner's 26.3 client: while a car moved, its driver (and the chase view's body) was
 * drawn up to about a block behind the model, at the back of the Hotrod, and stayed there until the car stopped; parked
 * they lined up. The server keeps the seat (MAINSEAT) exactly with the model (SKIN) every tick and sends both the same
 * moves (carprobe, and a watching bot: the same deltas tick for tick).
 * The cause (found 2026-10-03, ViaVersion 5.12 and 26.3 client bytecode, then drive-pasts in the owner's client):
 * ViaVersion turns each relative move into a step of max(1, (ms since that entity's last relative move + 25) / 50)
 * client ticks (EntityPacketRewriter26_3.tickOffset), and the client's interpolation queue (SteppedInterpolationHandler,
 * 3 ticks for an armor stand) only catches up once more than 3 ticks wait. When a car sets off, MTVehicles turns and
 * snaps the seat once (a move of the seat alone, about 100 ms before the car's first real move), so the seat's first
 * step is 2 ticks and the model's (idle for seconds) 1, and the client keeps that extra tick on the seat for as long as
 * the car moves: the seat, and whoever sits on it, v/20 blocks behind the model (0.7 at 14 b/s). It depends on the tick
 * phase (2 of 3 straight drive-pasts from a standstill without the fix). Bots never showed it (they speak 1.21.11:
 * ViaVersion's 26.3 timing never runs for them, and Mineflayer has no such queue).
 * The fix, the shared clock (carsmooth.via-clock): before a car's packets go out to a 26.3 client, every visible stand of
 * the car that moves in them gets the same step, the smallest ViaVersion would have given any of them from the times the
 * server sent them (set through each one's LastMovement on that connection; Holder.shareClock), and their keepalives
 * (a zero move every 60th send, which the client queues as a 3-tick step going nowhere) are dropped. In the owner's
 * client: 3 of 3 drive-pasts with the driver in the middle of the car, and their own chase view the same at rest and at
 * speed.
 * How: a netty outbound handler on every player's channel (tail side of the unbundler and the encoder, like CarCam's
 * SelfFlags) holds the moves, position syncs, teleports, head turns and velocities of every entity of a driven car
 * (CarSmooth's groups: SKIN, the seats, the chase camera, and MAIN), in order, and at the end of the server tick
 * (ServerTickEndEvent, after the tick's own flush: a task queued on the channel's event loop then runs after every send
 * of the tick, which Paper queues there in order) sets the steps and writes each car's as one bundle
 * (ClientboundBundlePacket: one packet to the client, handleBundlePacket handles every sub-packet in the same call, so a
 * frame can't start between the model's move and the seat's either; on its own that didn't fix the glitch) and flushes.
 * ViaVersion encodes them in that write, on the same thread. Everything else goes out as before. An entity stays on the
 * list for 40 ticks after its car was last driven (the netty thread may still be writing the last tick's packets), and a
 * car's packets that pile up past 30 (a server that stopped ticking) go out at once. /dphone carsmooth bundle on|off and
 * via-clock on|off (kept in carsmooth.yml; the clock needs the bundle) for A/B drives; /dphone carbundle [player] for
 * tests (evened = releases where the stands' own steps would have differed). Mineflayer bots unpack bundles of up to 32
 * packets (minecraft-protocol's client.js), which a car's tick stays under.
 */
final class CarBundle implements Listener {
    static final String HANDLER = "donating_carbundle";
    /** Held packets per car before they go out without waiting for the tick's end (and minecraft-protocol's 32). */
    static final int MAX_HELD = 30;
    /** Ticks an entity stays on the list after its car was last driven. */
    static final int KEEP_TICKS = 40;

    private final JavaPlugin plugin;
    private volatile boolean on = true;
    /** Whether car stands' keepalive moves are being dropped (CarCam's watcher then doesn't count them). */
    static volatile boolean keepaliveDrop;
    private volatile String error;
    private boolean tried;

    // Server thread: entity id -> {plate, last tick seen}; published to the netty threads as an immutable map.
    private final Map<Integer, String> plates = new HashMap<>();
    private final Map<Integer, Long> seenAt = new HashMap<>();
    private volatile Map<Integer, String> live = Map.of();
    // The visible ones (MAIN's moves, every 3rd tick, keep ViaVersion's own timing), for the shared clock.
    private final Set<Integer> timed = new java.util.HashSet<>();
    private volatile Set<Integer> timedLive = Set.of();
    // The chase cameras among them (CarCam's stands, sent to their driver only).
    private final Set<Integer> cams = new java.util.HashSet<>();
    private volatile Set<Integer> camsLive = Set.of();
    private long tick;

    private final Map<UUID, Holder> holders = new ConcurrentHashMap<>();
    private final AtomicLong bundles = new AtomicLong(), bundled = new AtomicLong(), early = new AtomicLong();
    private final AtomicLong shared = new AtomicLong(), evened = new AtomicLong();

    // ViaVersion 5.12 (javap-checked), through its own class loader (not a declared dependency): a 26.3 connection's
    // entity tracker (UserConnection.getEntityTracker(Protocol26_2To26_3)) and each tracked entity's LastMovement, the
    // time EntityPacketRewriter26_3.tickOffset counts a relative move's step from.
    private volatile boolean clockOn = true;
    private volatile String viaError;
    private Method mGetManager, mGetConnMgr, mGetClient, mGetTracker, mEntity, mTeGet, mTePut, mLastTime, mSetTime;
    private Method mHasPos, mHasRot;
    private Field fXa, fYa, fZa;
    private Class<?> cLast, cProto;
    private Constructor<?> ctorLast;

    // Paper internals (1.21.11, javap-checked): which packets carry an entity's movement, and the id in each.
    private Class<?> cMove, cSync, cTeleport, cHead, cMotion, cBundle;
    private Field fMoveId, fHeadId, fMotionId;
    private Method mSyncId, mTeleportId;
    private Constructor<?> ctorBundle;

    CarBundle(JavaPlugin plugin) { this.plugin = plugin; }

    private boolean ready() {
        if (!tried) {
            tried = true;
            try {
                cMove = Class.forName("net.minecraft.network.protocol.game.ClientboundMoveEntityPacket");
                cSync = Class.forName("net.minecraft.network.protocol.game.ClientboundEntityPositionSyncPacket");
                cTeleport = Class.forName("net.minecraft.network.protocol.game.ClientboundTeleportEntityPacket");
                cHead = Class.forName("net.minecraft.network.protocol.game.ClientboundRotateHeadPacket");
                cMotion = Class.forName("net.minecraft.network.protocol.game.ClientboundSetEntityMotionPacket");
                cBundle = Class.forName("net.minecraft.network.protocol.game.ClientboundBundlePacket");
                fMoveId = cMove.getDeclaredField("entityId");
                fHeadId = cHead.getDeclaredField("entityId");
                fMotionId = cMotion.getDeclaredField("id");
                fMoveId.setAccessible(true);
                fHeadId.setAccessible(true);
                fMotionId.setAccessible(true);
                mSyncId = cSync.getMethod("id");
                mTeleportId = cTeleport.getMethod("id");
                ctorBundle = cBundle.getConstructor(Iterable.class);
                mHasPos = cMove.getMethod("hasPosition");
                mHasRot = cMove.getMethod("hasRotation");
                fXa = cMove.getDeclaredField("xa");
                fYa = cMove.getDeclaredField("ya");
                fZa = cMove.getDeclaredField("za");
                fXa.setAccessible(true);
                fYa.setAccessible(true);
                fZa.setAccessible(true);
            } catch (ReflectiveOperationException | LinkageError | RuntimeException ex) {
                fail("setup (" + ex + ")");
            }
        }
        return error == null;
    }

    private void fail(String why) {
        if (error != null) return;
        error = why;
        keepaliveDrop = false;
        plugin.getLogger().warning("carsmooth bundle: off, car packets go out one by one (" + why + ")");
    }

    boolean isOn() { return on; }

    boolean isClockOn() { return clockOn; }

    void setClockOn(boolean v) { clockOn = v; }

    /** ViaVersion's classes and methods (main thread, at start); off with one log line when anything is missing. */
    private void viaSetup() {
        org.bukkit.plugin.Plugin vv = Bukkit.getPluginManager().getPlugin("ViaVersion");
        if (vv == null) { viaError = "no ViaVersion"; return; }
        try {
            ClassLoader cl = vv.getClass().getClassLoader();
            Class<?> via = Class.forName("com.viaversion.viaversion.api.Via", true, cl);
            mGetManager = via.getMethod("getManager");
            Class<?> mgr = Class.forName("com.viaversion.viaversion.api.ViaManager", true, cl);
            mGetConnMgr = mgr.getMethod("getConnectionManager");
            Class<?> cm = Class.forName("com.viaversion.viaversion.api.connection.ConnectionManager", true, cl);
            mGetClient = cm.getMethod("getConnectedClient", UUID.class);
            Class<?> uc = Class.forName("com.viaversion.viaversion.api.connection.UserConnection", true, cl);
            mGetTracker = uc.getMethod("getEntityTracker", Class.class);
            Class<?> et = Class.forName("com.viaversion.viaversion.api.data.entity.EntityTracker", true, cl);
            mEntity = et.getMethod("entity", int.class);
            Class<?> te = Class.forName("com.viaversion.viaversion.api.data.entity.TrackedEntity", true, cl);
            Class<?> so = Class.forName("com.viaversion.viaversion.api.connection.StorableObject", true, cl);
            mTeGet = te.getMethod("get", Class.class);
            mTePut = te.getMethod("put", so);
            cProto = Class.forName("com.viaversion.viaversion.protocols.v26_2to26_3.Protocol26_2To26_3", true, cl);
            cLast = Class.forName("com.viaversion.viaversion.protocols.v26_2to26_3.storage.LastMovement", true, cl);
            ctorLast = cLast.getConstructor(long.class);
            mLastTime = cLast.getMethod("lastMovementTime");
            mSetTime = cLast.getMethod("setLastMovementTime", long.class);
        } catch (ReflectiveOperationException | LinkageError | RuntimeException ex) {
            viaError = String.valueOf(ex);
            plugin.getLogger().warning("carsmooth via-clock: off, 26.3 clients time each car stand on its own (" + viaError + ")");
        }
    }

    /** ViaVersion's step for a relative move made ms after the entity's last (EntityPacketRewriter26_3.tickOffset). */
    static int viaStep(long ms) { return ms > 250 ? 1 : (int) Math.max(1, (ms + 25) / 50); }

    /** The A/B switch; turning it off sends whatever is held at once. */
    void setOn(boolean v) {
        on = v;
        keepaliveDrop = v && error == null;
        if (!v) for (Holder h : holders.values()) h.schedule();
    }

    void start() {
        if (!ready()) return;
        keepaliveDrop = on;
        viaSetup();
        for (Player p : Bukkit.getOnlinePlayers()) install(p);
    }

    void shutdown() {
        on = false;
        keepaliveDrop = false;
        for (Holder h : new ArrayList<>(holders.values())) h.detach();
        holders.clear();
        plates.clear();
        seenAt.clear();
        live = Map.of();
        timed.clear();
        timedLive = Set.of();
        cams.clear();
        camsLive = Set.of();
    }

    /**
     * An entity of a driven car this tick (CarSmooth: every tick, before the entity tracker). A new one is published at
     * once, so this tick's packets for it are already held.
     */
    void mark(int id, String plate, boolean visible) { mark(id, plate, visible, false); }

    /** camera: CarCam's chase camera (on its driver's connection its own step leads: CarCam models exactly that). */
    void mark(int id, String plate, boolean visible, boolean camera) {
        seenAt.put(id, tick);
        String was = plates.put(id, plate);
        if (!plate.equals(was)) live = Map.copyOf(plates);
        if (visible && timed.add(id)) timedLive = Set.copyOf(timed);
        if (camera && cams.add(id)) camsLive = Set.copyOf(cams);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onTickEnd(ServerTickEndEvent e) {
        tick++;
        if (tick % 20 == 0) {
            boolean dropped = false;
            for (Iterator<Map.Entry<Integer, Long>> it = seenAt.entrySet().iterator(); it.hasNext(); ) {
                Map.Entry<Integer, Long> en = it.next();
                if (tick - en.getValue() > KEEP_TICKS) { it.remove(); plates.remove(en.getKey()); timed.remove(en.getKey()); cams.remove(en.getKey()); dropped = true; }
            }
            if (dropped) { live = Map.copyOf(plates); timedLive = Set.copyOf(timed); camsLive = Set.copyOf(cams); }
            // A handler whose player is gone without a quit event (kicked inside the join event) goes too.
            holders.entrySet().removeIf(en -> {
                if (en.getValue().channel.isActive() && Bukkit.getPlayer(en.getKey()) != null) return false;
                en.getValue().detach();
                return true;
            });
        }
        // Every channel's release queued behind this tick's sends (cheap when nothing is held).
        for (Holder h : holders.values()) h.schedule();
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        if (ready()) install(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        Holder h = holders.remove(e.getPlayer().getUniqueId());
        if (h != null) h.detach();
    }

    private void install(Player p) {
        try {
            Object sp = p.getClass().getMethod("getHandle").invoke(p);
            Object listener = sp.getClass().getField("connection").get(sp);
            if (listener == null) return;
            Object connection = listener.getClass().getField("connection").get(listener);
            Channel ch = (Channel) connection.getClass().getField("channel").get(connection);
            if (ch == null || !ch.isActive()) return;
            Holder h = new Holder(ch, p.getUniqueId());
            ch.eventLoop().execute(() -> {
                try {
                    ChannelPipeline pl = ch.pipeline();
                    if (pl.get(HANDLER) != null) pl.remove(HANDLER); // left by an earlier copy of the plugin
                    if (pl.get("packet_handler") != null) pl.addBefore("packet_handler", HANDLER, h);
                    else pl.addLast(HANDLER, h);
                } catch (RuntimeException ex) {
                    h.err = String.valueOf(ex);
                }
            });
            Holder old = holders.put(p.getUniqueId(), h);
            if (old != null && old != h) old.detach();
        } catch (ReflectiveOperationException | LinkageError | RuntimeException ex) {
            fail("install (" + ex + ")");
        }
    }

    /** "CARBUNDLE ..." for /dphone carbundle [player]. */
    String status(Player p) {
        StringBuilder b = new StringBuilder("CARBUNDLE on=").append(on).append(" state=").append(error == null ? "ok" : error)
                .append(" entities=").append(live.size()).append(" bundles=").append(bundles.get()).append(" packets=").append(bundled.get())
                .append(" early=").append(early.get()).append(" players=").append(holders.size())
                .append(" clock=").append(clockOn ? "on" : "off").append(" via=").append(viaError == null ? "ok" : viaError)
                .append(" shared=").append(shared.get()).append(" evened=").append(evened.get());
        Map<String, Integer> per = new java.util.TreeMap<>();
        for (String pl : live.values()) per.merge(pl, 1, Integer::sum);
        b.append(" cars=").append(per.isEmpty() ? "none" : per.toString().replace(" ", ""));
        if (p != null) {
            Holder h = holders.get(p.getUniqueId());
            if (h == null) b.append(" ").append(p.getName()).append("=none");
            else b.append(" ").append(p.getName()).append("=bundles:").append(h.bundles.get()).append(",packets:").append(h.packets.get())
                    .append(",max:").append(h.maxPer).append(",shared:").append(h.shared).append(",evened:").append(h.evened).append(",keepalives:").append(h.keepalives)
                    .append(",via26_3:").append(h.via263).append(",installed:").append(h.ctx != null).append(h.err == null ? "" : ",error:" + h.err);
        }
        return b.toString();
    }

    /** The plate a movement packet's entity belongs to, or null (not a movement packet, or not a car's). */
    private String plateOf(Object msg, Map<Integer, String> m) throws ReflectiveOperationException {
        int id;
        if (cMove.isInstance(msg)) id = fMoveId.getInt(msg);
        else if (cHead.isInstance(msg)) id = fHeadId.getInt(msg);
        else if (cSync.isInstance(msg)) id = (Integer) mSyncId.invoke(msg);
        else if (cTeleport.isInstance(msg)) id = (Integer) mTeleportId.invoke(msg);
        else if (cMotion.isInstance(msg)) id = fMotionId.getInt(msg);
        else return null;
        return m.get(id);
    }

    /** The handler on one player's channel; everything but schedule() runs on netty's thread. */
    final class Holder extends ChannelOutboundHandlerAdapter {
        final Channel channel;
        final UUID uuid;
        volatile long shared, evened;
        volatile String via263 = "?";
        private Object tracker; // ViaVersion's 26.3 entity tracker for this connection (null: not a 26.3 client)
        private boolean trackerLooked;
        // Each visible stand's relative moves as the server sent them (written into this handler, before the hold):
        // the last one's time, and this batch's (ViaVersion would have timed them from these without the hold).
        private final Map<Integer, Long> moveWrite = new HashMap<>();
        private final Map<Integer, Long> batchMove = new HashMap<>();
        volatile long keepalives;
        volatile ChannelHandlerContext ctx;
        volatile String err;
        volatile int maxPer;
        final AtomicLong bundles = new AtomicLong(), packets = new AtomicLong();
        private final LinkedHashMap<String, List<Object[]>> held = new LinkedHashMap<>();

        Holder(Channel channel, UUID uuid) { this.channel = channel; this.uuid = uuid; }

        @Override
        public void handlerAdded(ChannelHandlerContext ctx) { this.ctx = ctx; }

        @Override
        public void handlerRemoved(ChannelHandlerContext ctx) { releaseAll(ctx, true); this.ctx = null; }

        @Override
        public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
            // The hold just switched off: what's still held goes first, so nothing overtakes it.
            if (!on && !held.isEmpty()) releaseAll(ctx, false);
            Map<Integer, String> m = live;
            if (on && error == null && err == null && !m.isEmpty()) {
                String plate;
                boolean keepalive = false;
                try {
                    plate = plateOf(msg, m);
                    if (plate != null && cMove.isInstance(msg) && Boolean.TRUE.equals(mHasPos.invoke(msg)) && timedLive.contains(fMoveId.getInt(msg))) {
                        // A keepalive (ServerEntity sends a zero move every 60th send, standing still too): the 26.3
                        // client queues it as a 3-tick step going nowhere, so a stand that got one just before the car
                        // sets off would start up to 3 ticks behind the others. Nothing moves: dropped (CarCam's
                        // watcher doesn't count it either: keepaliveDrop).
                        keepalive = !Boolean.TRUE.equals(mHasRot.invoke(msg)) && fXa.getShort(msg) == 0 && fYa.getShort(msg) == 0 && fZa.getShort(msg) == 0;
                        if (!keepalive) batchMove.putIfAbsent(fMoveId.getInt(msg), System.nanoTime());
                    }
                } catch (ReflectiveOperationException | RuntimeException ex) {
                    err = String.valueOf(ex);
                    keepaliveDrop = false;
                    releaseAll(ctx, true);
                    plate = null;
                    keepalive = false;
                }
                if (keepalive) {
                    keepalives++;
                    if (!promise.isVoid()) promise.trySuccess();
                    return;
                }
                if (plate != null) {
                    List<Object[]> l = held.computeIfAbsent(plate, k -> new ArrayList<>());
                    l.add(new Object[] {msg, promise});
                    if (l.size() >= MAX_HELD) { // no tick end coming: out now
                        early.incrementAndGet();
                        held.remove(plate);
                        emit(ctx, plate, l);
                        ctx.flush();
                    }
                    return;
                }
            }
            ctx.write(msg, promise);
        }

        /** Queues this channel's release behind everything already sent this tick (server thread). */
        void schedule() {
            if (ctx == null || !channel.isActive()) return;
            try { channel.eventLoop().execute(() -> { ChannelHandlerContext c = ctx; if (c != null) releaseAll(c, true); }); }
            catch (RuntimeException ignored) { }
        }

        private void releaseAll(ChannelHandlerContext ctx, boolean flush) {
            if (held.isEmpty()) return;
            List<Map.Entry<String, List<Object[]>>> all = new ArrayList<>(held.entrySet());
            held.clear();
            for (Map.Entry<String, List<Object[]>> en : all) emit(ctx, en.getKey(), en.getValue());
            batchMove.clear();
            if (flush) ctx.flush();
        }

        /**
         * The shared clock for a 26.3 client. ViaVersion times a relative move from that entity's own last one on this
         * connection (LastMovement); found in the owner's client (2026-10-03): when a car sets off, MTVehicles turns and
         * snaps the seat (MAINSEAT) once, a move of its own, about 100 ms before the first real move, so ViaVersion timed
         * the seat's first step at 2 ticks and the model's (SKIN, idle for seconds) at 1, and the client kept that extra
         * tick on the seat until the car stopped: the driver a tick of travel behind the model, in the back seat. Here
         * every visible stand of the car that moves in this release gets the same step: the smallest of the steps
         * ViaVersion would have given each from the times the server sent them (moveWrite, not this release's time: a
         * slow end of tick must not stretch the steps), set through its LastMovement just before ViaVersion encodes
         * them in this write. Steady driving: 1 for all, as before; a hitch before the tracker: 2 for all; a stand that
         * moved alone just before (the seat snap): the others' 1; stands moving every 3rd tick (carsmooth off): 3.
         * On a driver's connection the chase camera's own step leads instead (CarCam models the client's queue from the
         * camera's own moves; the car's stands take the camera's step, so they still step together).
         */
        private void shareClock(String plate, List<Object[]> l) {
            if (!clockOn || viaError != null) return;
            try {
                if (!trackerLooked) {
                    trackerLooked = true;
                    Object user = mGetClient.invoke(mGetConnMgr.invoke(mGetManager.invoke(null)), uuid);
                    tracker = user == null ? null : mGetTracker.invoke(user, cProto);
                    via263 = tracker != null ? "yes" : "no";
                }
                Set<Integer> vis = timedLive;
                List<Integer> ids = new ArrayList<>(4);
                List<Integer> steps = new ArrayList<>(4);
                for (Object[] o : l) {
                    if (!cMove.isInstance(o[0]) || !Boolean.TRUE.equals(mHasPos.invoke(o[0]))) continue;
                    int id = fMoveId.getInt(o[0]);
                    if (!vis.contains(id) || ids.contains(id)) continue;
                    Long tw = batchMove.get(id);
                    if (tw == null) continue;
                    Long prev = moveWrite.put(id, tw);
                    ids.add(id);
                    steps.add(prev == null ? 1 : viaStep((tw - prev) / 1_000_000L));
                }
                if (moveWrite.size() > 256) { long n0 = System.nanoTime(); moveWrite.values().removeIf(v -> n0 - v > 60_000_000_000L); }
                if (tracker == null || ids.isEmpty()) return;
                int step = Integer.MAX_VALUE;
                for (int st : steps) step = Math.min(step, st);
                Set<Integer> cam = camsLive;
                for (int i = 0; i < ids.size(); i++) if (cam.contains(ids.get(i))) { step = steps.get(i); break; }
                boolean differ = false;
                for (int st : steps) if (st != step) differ = true;
                // ViaVersion's step for a gap of step x 50 ms is exactly step (max(1, (50s + 25) / 50) = s, s <= 5).
                long t = System.nanoTime() - step * 50_000_000L;
                for (int id : ids) {
                    Object te = mEntity.invoke(tracker, id);
                    if (te == null) continue;
                    Object lm = mTeGet.invoke(te, cLast);
                    if (lm == null) mTePut.invoke(te, ctorLast.newInstance(t)); else mSetTime.invoke(lm, t);
                }
                shared++;
                CarBundle.this.shared.incrementAndGet();
                if (differ) { evened++; CarBundle.this.evened.incrementAndGet(); }
            } catch (ReflectiveOperationException | RuntimeException ex) {
                viaError = String.valueOf(ex);
                plugin.getLogger().warning("carsmooth via-clock: off (" + viaError + ")");
            }
        }

        /** One car's held packets: as they were when there's one, else in one bundle (their promises follow it). */
        private void emit(ChannelHandlerContext ctx, String plate, List<Object[]> l) {
            shareClock(plate, l);
            if (l.size() == 1) { ctx.write(l.get(0)[0], (ChannelPromise) l.get(0)[1]); return; }
            List<Object> msgs = new ArrayList<>(l.size());
            for (Object[] o : l) msgs.add(o[0]);
            Object bundle;
            try {
                bundle = ctorBundle.newInstance(msgs);
            } catch (ReflectiveOperationException | RuntimeException ex) {
                err = String.valueOf(ex);
                for (Object[] o : l) ctx.write(o[0], (ChannelPromise) o[1]);
                return;
            }
            ChannelPromise bp = ctx.newPromise();
            bp.addListener(f -> {
                boolean anyVoid = false;
                for (Object[] o : l) {
                    ChannelPromise p = (ChannelPromise) o[1];
                    if (p.isVoid()) { anyVoid = true; continue; }
                    if (f.isSuccess()) p.trySuccess(); else p.tryFailure(f.cause());
                }
                // A failed write the server never sees through a promise (sent with a void one) goes up the pipeline,
                // as netty does for a void promise: the connection handles it (Paper disconnects) instead of it vanishing.
                if (!f.isSuccess() && anyVoid) ctx.fireExceptionCaught(f.cause());
            });
            ctx.write(bundle, bp);
            bundles.incrementAndGet();
            packets.addAndGet(l.size());
            CarBundle.this.bundles.incrementAndGet();
            CarBundle.this.bundled.addAndGet(l.size());
            if (l.size() > maxPer) maxPer = l.size();
        }

        /** Out of the pipeline (whatever is held goes out first). */
        void detach() {
            try {
                channel.eventLoop().execute(() -> {
                    try { if (channel.pipeline().get(HANDLER) == this) channel.pipeline().remove(this); } catch (RuntimeException ignored) { }
                });
            } catch (RuntimeException ignored) { }
        }
    }
}
