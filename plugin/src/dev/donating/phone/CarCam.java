package dev.donating.phone;

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
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import com.destroystokyo.paper.ClientOption;
import com.destroystokyo.paper.SkinParts;
import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.MapId;
import io.papermc.paper.datacomponent.item.ResolvableProfile;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelOutboundHandlerAdapter;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.ChannelPromise;
import io.papermc.paper.threadedregions.scheduler.ScheduledTask;
import org.bukkit.Bukkit;
import org.bukkit.FluidCollisionMode;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.ArmorStand;
import org.bukkit.entity.Entity;
import org.bukkit.entity.ItemDisplay;
import org.bukkit.entity.Mannequin;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.entity.EntityDismountEvent;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.player.PlayerChangedWorldEvent;
import org.bukkit.event.player.PlayerItemHeldEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerRespawnEvent;
import org.bukkit.event.player.PlayerTeleportEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.MainHand;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.metadata.FixedMetadataValue;
import org.bukkit.metadata.MetadataValue;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.util.RayTraceResult;
import org.bukkit.util.Vector;

/**
 * The chase camera for drivers (owner, 2026-09-29: "make the user go into 3rd person mode automatically when entering
 * the car and back into 1st person when exiting"; research camera.md, checked in the 26.3 client). The server can't
 * switch the client's F5 view, but it can make the client look through another entity (ClientboundSetCameraPacket, by
 * reflection: the Paper API only allows spectators). The keys still drive the car (the client sends its input whatever it
 * looks through). The price, all vanilla: no hotbar, hearts or food while the view is on (carcam.sk shows health on the
 * action bar).
 *
 * Rebuilt 2026-09-29 after the owner's drive ("the carcam is kinda glitchy, is there any way to make it more like 3rd
 * person f5 mode? like how the camera movement works and also get rid of the hands in the carcam"; research
 * camera-research.md, verified in the 26.3 client and Paper 1.21.11 jars):
 *  - The camera is an invisible marker armor stand (carcam.camera stand; "display" keeps the first version's item display
 *    for an A/B). A 26.3 client smooths a living entity's moves through the same stepped queue as the car's armor stands,
 *    while a display eased toward each packet on a curve of its own, so the car slid about in the frame. The stand gets
 *    the car stands' update interval and tracking range and resyncs together with them (CarSmooth.likeCar: its first
 *    resync, when the driver starts tracking it, brings the whole car along in the same tick). Its view yaw is its head
 *    yaw (how that's sent: "The turning" below; carcam.yaw-delay can still hold it back some ticks, 0 now). Eye height 0 (a marker's size is 0), so
 *    the view is exactly at the stand; its camera_distance 0 (F5 during the view adds no pull-back).
 *  - F5's geometry (Camera.update + getMaxZoom): the pivot is the driver's eye, the camera sits carcam.distance back
 *    along the view (yaw = the car's heading eased + the mouse orbit, pitch = carcam.pitch + the orbit's), pulled in
 *    before blocks like vanilla (8 rays from the pivot +-0.1 on each axis, the shortest hit, minus carcam.clip-margin):
 *    never inside a wall, no x-ray into heists. The pivot follows the seat stand (the driver is only put on the seat
 *    after the tracker has sent it, so the driver's own spot is a tick behind the car).
 *  - The mouse orbits the camera like F5 (carcam.orbit): the client still turns its own player with the mouse and sends
 *    the rotation every tick while riding, so each tick's change in the player's yaw and pitch is added to the orbit;
 *    after carcam.orbit-return seconds without a change it eases back behind the car (like GTA). It lags the mouse by
 *    the ping and about 175 ms (the round trip plus carcam.orbit-smooth; worked out, not measured): fine for looking around, not for aiming.
 *  - No hands: the client draws arms only for an empty main hand or a map (anything with a map_id takes the map path,
 *    whatever its model), everything else only as its item model, which the pack hides in first person while the player
 *    isn't the camera (minecraft:view_entity). So while the view is on without the minimap (below: carcam.minimap false,
 *    an empty offhand, or no self-invisibility), a car key or phone in hotbar 9 is the same item
 *    as a tripwire hook without the map_id (carcam.hook-key; its custom data, name and model string stay, so garage.sk's
 *    "carkey:<plate>" and the right-click lock still work; garage.sk's carKey builds the hook itself while the metadata
 *    donating_carcam is set), and the map comes back on every way out, with the player's phone map id.
 *
 * Tuned 2026-09-29 (owner: "try to keep the key/minimap on screen if possible ... and fix the raggedy feel of turning
 * the camera"; checked in the 26.3 client and Paper 1.21.11 bytecode, see the scratchpad's carcam3 notes):
 *  - The minimap stays (carcam.minimap): the key stays a filled map and only the driver's own client is told the driver
 *    is invisible (shared flags bit 0x20 in the entity-data packets the server sends that player about themself: a netty
 *    handler on their channel, SelfFlags below; everyone else still sees the driver as they are). The 26.3 client's
 *    FirstPersonHandsAndItemsRenderer draws a held map without arms (and an empty main hand not at all) when the local
 *    player's render state says invisible (Entity.isInvisible = shared flag 5); the map path draws the map itself and
 *    ignores the item model, so the pack's first-person rule doesn't hide it, while the offhand bag (an item model) stays
 *    hidden by it. A map with an empty offhand would be drawn two-handed in the middle of the screen: a driver with nothing
 *    in the offhand (no bag, no cash in hand) still gets the hook, and so does everyone when the handler can't be set up.
 *    The metadata donating_carcam_hook says when the key must be the hook (garage.sk's carKey reads it).
 *  - The turning: a living camera's view yaw is its head yaw, which the client moves 1/3 of the way to each rotate-head
 *    packet's target per tick (LivingEntity.lerpHeadTo(yaw, 3), aiStep), while a 26.3 client (through ViaVersion) puts
 *    the camera's position exactly where each move packet says in the tick it arrives. So in a turn the view lagged the
 *    camera's spot by 2 ticks of turning, plus the old 1-tick yaw delay: the camera looked up to ~34 degrees past the car
 *    and the car swam sideways in the frame whenever the turn rate changed. Now (carcam.head exact) the plugin sends the
 *    camera's head packets itself, one a tick, with the target worked out from what the client's head is (it models the
 *    client: target = head + 3 x (wanted - head), to a byte), so the head lands on the wanted yaw in the same tick as the
 *    position (off by 0.23 degrees at most, never piling up); the stand's own yaw stays fixed so the tracker never sends
 *    one. Native 1.21.11 and 26.1-26.2 clients ease positions by 1/3 a packet too, so they get the plain yaw each tick
 *    (carcam.head filtered: both eased the same way; auto picks by ViaVersion's player version). The car's heading is
 *    followed by a critically damped spring (carcam.yaw-follow spring: carcam.yaw-lag seconds behind in a steady turn,
 *    no jolt when a turn starts) with a little look-ahead into the turn (carcam.look-ahead), and the mouse orbit goes
 *    through its own short spring (carcam.orbit-smooth: rotation packets arrive 0 or 2 in a server tick).
 *
 * Kept from the first version:
 *  - hotbar 9 (the key) is selected when the view starts; getting out puts the slot from before back, but only if the
 *    player is still on 8 and never picked another slot during the ride (their choice wins). carcam.select-key.
 *  - The client never draws its own player under another camera, so the driver gets a body of their own: a mannequin
 *    with their skin, invisible to everyone before it exists and then shown to the driver only, riding the driver's seat
 *    stand. Invulnerable and not collidable, so it never shields the driver. carcam.body.
 *
 * Off = the body goes first (never a frame of first person from inside its head), then the camera packet with the
 * player's own entity (the client never resets it by itself when the entity goes), then the camera entity is removed,
 * then the key's map and the slot come back; on getting out, a teleport, a world change, quitting, death, the phone's big
 * map (tag donating_phone_open), the opt-out tag donating_carcam_off (carcam.sk's /carcam off), the car's MAIN stand
 * missing, any error, and the plugin stopping. While on, the player has metadata "donating_carcam" = the plate.
 *
 * Fallback for everyone (the cautious option): the driver's seat stand gets camera_distance
 * carcam.seat-camera-distance, so F5 in a car sits farther back when the chase view is off.
 */
final class CarCam implements Listener {
    static final String TAG = "donating_cam";
    static final String BODY_TAG = "donating_carcam_body";
    static final String OFF_TAG = "donating_carcam_off";
    static final String META = "donating_carcam";
    /** Set while the key in hotbar 9 must be the hook (the minimap is off for this driver); garage.sk's carKey reads it. */
    static final String HOOK_META = "donating_carcam_hook";
    /** Hotbar 9: the car key while driving (garage.sk carKey), a filled map showing the phone's GPS view. */
    static final int KEY_SLOT = 8;
    /** Ticks of view history kept per camera (the queue model never shows the camera more than a few ticks late). */
    private static final int HIST = 32;
    /** Bodies made in one ride before giving up on it (something keeps removing or ejecting it). */
    private static final int BODY_MAX = 5;
    /** The model strings of the items in hotbar 9 that are maps: the car key and the phone. */
    private static final String KEY_MODEL = "donating:carkey", PHONE_MODEL = "donating:phone";

    private final JavaPlugin plugin;
    private final Map<UUID, Cam> cams = new HashMap<>();
    /** No new camera for a player before this tick (a spawn that failed: a plugin or a region cancelled it). */
    private final Map<UUID, Integer> retryAt = new HashMap<>();
    private ScheduledTask task;
    private int tickNo;
    // /dphone cam probe <player> <ticks>: a row a tick into camprobe.log (for judging the turning offline).
    private UUID probeWho;
    private int probeLeft;
    private java.io.BufferedWriter probeOut;

    // Tunables (config carcam.*; /dphone cam tune changes them until the next reload).
    boolean enabled = true;
    String camera = "stand";
    double distance = 5.5, pitch = 18, pitchMin = -20, pitchMax = 70, yawSmooth = 0.35, yawOffset = 0, seatCameraDistance = 7;
    double clipMargin = 0.15, orbitReturn = 1.5, orbitReturnSpeed = 0.15, orbitSensitivity = 1;
    int yawDelay = 0, teleportDuration = 3;
    boolean orbit = false, hookKey = true;
    // Locked (orbit off): the player's own look is held where it was when the view switched (see holdLook).
    boolean holdLook = true;
    boolean minimap = true, selfInvisible = true;
    /** TAB's sidebar off while the view is on (it covers the top of the corner minimap); back on every exit. */
    boolean hideSidebar = true;
    private final java.util.Set<UUID> sidebarHidden = new java.util.HashSet<>();
    /** Exact heads aim at the tick the client shows the camera at (its movement queue, modelled). */
    boolean queueModel = true;
    /** How the camera stand's head (its view yaw) is sent: auto, exact, filtered or tracker (see the class notes). */
    String head = "auto";
    /** spring (critically damped, yawLag seconds behind in a steady turn) or lerp (yawSmooth of the angle a tick). */
    String yawFollow = "spring";
    double yawLag = 0.15, lookAhead = 0.05, lookAheadMax = 15, orbitSmooth = 0.05;
    boolean onlyWithKey = false;
    boolean selectKey = true;
    boolean body = true;
    private String openTag = "donating_phone_open";

    private Constructor<?> camCtor, headCtor;
    private Method send;
    private String error;
    /** The driver's own client told the driver is invisible (the minimap without arms). */
    private final SelfFlags flags;
    // ViaVersion's player versions (by reflection; null: Via isn't there or its API changed).
    private boolean viaTried;
    private Object viaApi, via263;
    private Method viaVersionOf, viaNewerOrEqual;

    /** How a camera's head is sent to its driver. */
    enum Head { EXACT, FILTERED, TRACKER }

    private static final class Cam {
        Entity cam;        // the camera: a marker armor stand, or an item display (carcam.camera display)
        boolean stand;
        String plate;
        float yaw;         // the car's heading, followed (spring or lerp), look-ahead included
        double yawVel;     // the spring's speed (degrees a second)
        float prevCarYaw = Float.NaN; // the car's heading last tick (its turn rate, for the look-ahead)
        float lead;        // this tick's look-ahead (degrees)
        Head head = Head.EXACT;
        String headSetting; // carcam.head when this camera was made (a change remakes the camera)
        float fixedYaw;    // the stand's own yaw (exact/filtered: never changes, so the tracker never sends a head packet)
        double headH;      // the driver's client's head yaw after this tick, as modelled (exact/filtered)
        int headSent;      // head packets sent
        double headWantPrev = Double.NaN; // last tick's wanted view yaw (standing still: the head settles on a byte)
        byte headByte;
        boolean hook;      // the key must be the hook this tick (no minimap)
        int age;
        int sent;          // camera packets sent (the first goes a tick after the spawn; one more a few ticks later)
        int resendAt;      // the driver's client made the camera again (it left its view and came back): send at this age
        boolean walled;    // the driver's head is in a block: first person meanwhile (see the tick)
        int clearTicks;    // ticks since the head was last in a block
        int walls;         // times the view went back to first person for it
        float holdYaw, holdPitch; // the look the client's hand bob froze at (holdLook)
        boolean holdSet;
        int holds;         // times the look was put back
        int exactFor;      // head packets still to correct exactly after a re-send (whatever carcam.head says)
        int prevSlot = -1; // the hotbar slot held before the view picked the key (-1: nothing to put back)
        Mannequin body;    // the driver's own body, sent to the driver only
        float bodyYaw = Float.NaN;
        int bodySpawns;    // bodies made in this ride
        int bodyNextTry;   // no new body before this age
        final double[] bodyHead = {0, Double.NaN}; // its head as the driver's client has it (headByte's state)
        boolean bodyTracker;                       // its head through the server's own packets (a send failed)
        // The mouse orbit: the player's look last tick, the offsets, ticks since the mouse last moved.
        boolean lookInit;
        float lastLookYaw, lastLookPitch, orbitYaw, orbitPitch; // orbitYaw/Pitch: what the view uses (smoothed)
        float orbitWantYaw, orbitWantPitch;                     // the mouse's sum (the smoothing follows it)
        double orbitVelYaw, orbitVelPitch;
        int idle;
        // The car's eased heading of the last few ticks (the stand's yaw is sent yaw-delay ticks late).
        final float[] yawHist = new float[8];
        int histN;
        // The view yaw and the seat's yaw of the last HIST ticks (by tickNo), and the model of the 26.3 client's movement
        // queue for this camera (which tick's spot it shows; exact heads are aimed at that tick's view).
        final double[] viewHist = new double[HIST], seatHist = new double[HIST];
        long histFirst = -1;
        StepQueue queue;      // the client's queue through the last tick whose packets were seen
        long queueTick;       // that tick
        long lastPacketTick;  // the camera's last move or resync sent
        final long[] seen = new long[3]; // the watcher's counts (resyncs, moves, turns) already fed to the queue
        Location lastAt;      // where the camera was put last tick (did it move this tick?)
        double shown = Double.NaN; // the tick (fractional) the driver's client shows the camera at, this tick
        boolean movedPrev;    // the camera moved last tick (so the tracker sent it a move)
        Location seatPrev;  // the seat where the driver was put on it last tick
        // The last spot (for /dphone cam).
        Location eye;
        double dist;
        float viewYaw, viewPitch, sentYaw, carYaw;
    }

    CarCam(JavaPlugin plugin) {
        this.plugin = plugin;
        this.flags = new SelfFlags(plugin);
        try {
            Class<?> ent = Class.forName("net.minecraft.world.entity.Entity");
            Class<?> pk = Class.forName("net.minecraft.network.protocol.game.ClientboundSetCameraPacket");
            camCtor = pk.getConstructor(ent);
            // Optional: without it every camera's head goes through the tracker (carcam.head tracker).
            try {
                headCtor = Class.forName("net.minecraft.network.protocol.game.ClientboundRotateHeadPacket").getConstructor(ent, byte.class);
            } catch (ReflectiveOperationException | LinkageError ex) {
                plugin.getLogger().warning("carcam: no head packet (" + ex + "); the camera's yaw goes through the tracker");
            }
        } catch (ReflectiveOperationException | LinkageError ex) {
            fail("camera packet not found (" + ex + ")");
        }
    }

    void configure(FileConfiguration c) {
        enabled = c.getBoolean("carcam.enabled", true);
        camera = "display".equalsIgnoreCase(c.getString("carcam.camera", "stand")) ? "display" : "stand";
        distance = clamp(c.getDouble("carcam.distance", 5.5), 1, 16);
        pitch = clamp(c.getDouble("carcam.pitch", 18), -60, 80);
        pitchMin = clamp(c.getDouble("carcam.pitch-min", -20), -89, 89);
        pitchMax = clamp(c.getDouble("carcam.pitch-max", 70), pitchMin, 89);
        yawSmooth = clamp(c.getDouble("carcam.yaw-smooth", 0.35), 0.02, 1);
        yawOffset = c.getDouble("carcam.yaw-offset", 0);
        yawDelay = (int) clamp(c.getInt("carcam.yaw-delay", 0), 0, 7);
        yawFollow = "lerp".equalsIgnoreCase(c.getString("carcam.yaw-follow", "spring")) ? "lerp" : "spring";
        yawLag = clamp(c.getDouble("carcam.yaw-lag", 0.15), 0, 2);
        lookAhead = clamp(c.getDouble("carcam.look-ahead", 0.05), 0, 1);
        lookAheadMax = clamp(c.getDouble("carcam.look-ahead-max", 15), 0, 60);
        orbitSmooth = clamp(c.getDouble("carcam.orbit-smooth", 0.05), 0, 1);
        head = parseHead(c.getString("carcam.head", "auto"));
        if (head == null) head = "auto";
        minimap = c.getBoolean("carcam.minimap", true);
        selfInvisible = c.getBoolean("carcam.self-invisible", true);
        hideSidebar = c.getBoolean("carcam.hide-sidebar", true);
        queueModel = c.getBoolean("carcam.queue-model", true);
        clipMargin = clamp(c.getDouble("carcam.clip-margin", 0.15), 0, 1);
        orbit = c.getBoolean("carcam.orbit", false);
        holdLook = c.getBoolean("carcam.hold-look", true);
        orbitReturn = clamp(c.getDouble("carcam.orbit-return", 1.5), 0, 30);
        orbitReturnSpeed = clamp(c.getDouble("carcam.orbit-return-speed", 0.15), 0.01, 1);
        orbitSensitivity = clamp(c.getDouble("carcam.orbit-sensitivity", 1), 0, 4);
        teleportDuration = (int) clamp(c.getInt("carcam.teleport-duration", 3), 0, 59);
        onlyWithKey = c.getBoolean("carcam.only-with-key", false);
        seatCameraDistance = clamp(c.getDouble("carcam.seat-camera-distance", 7), 0, 32);
        selectKey = c.getBoolean("carcam.select-key", true);
        hookKey = c.getBoolean("carcam.hook-key", true);
        body = c.getBoolean("carcam.body", true);
        openTag = c.getString("open-tag", "donating_phone_open");
        applyTeleportDuration();
        if (!body) dropBodies();
        if (!enabled) offAll();
    }

    private void applyTeleportDuration() {
        for (Cam cam : cams.values()) if (cam.cam instanceof ItemDisplay d && d.isValid()) d.setTeleportDuration(teleportDuration);
    }

    private static double clamp(double v, double lo, double hi) { return Math.max(lo, Math.min(hi, v)); }

    private static String parseHead(String s) {
        if (s == null) return null;
        s = s.trim().toLowerCase(Locale.ROOT);
        return List.of("auto", "exact", "filtered", "tracker").contains(s) ? s : null;
    }

    /**
     * The head mode for one driver: exact for a client that puts a living entity where each move says in the tick it
     * arrives (26.3 and newer through ViaVersion: its move packets become 1-tick steps), filtered for one that eases
     * toward each move by 1/3 a tick like the head (native 1.21.11, 26.1, 26.2; inferred from the 1.21.5+ client's
     * interpolation, no such client jar here). Unknown (Via's API missing or changed): exact, the owner's client.
     */
    private Head headFor(Player p) {
        if (headCtor == null || head.equals("tracker")) return Head.TRACKER;
        if (head.equals("exact")) return Head.EXACT;
        if (head.equals("filtered")) return Head.FILTERED;
        if (!viaTried) {
            viaTried = true;
            try {
                org.bukkit.plugin.Plugin vv = Bukkit.getPluginManager().getPlugin("ViaVersion");
                if (vv != null) {
                    // Through ViaVersion's own class loader (not a declared dependency) and its public API interface.
                    ClassLoader cl = vv.getClass().getClassLoader();
                    Class<?> via = Class.forName("com.viaversion.viaversion.api.Via", true, cl);
                    viaApi = via.getMethod("getAPI").invoke(null);
                    Class<?> pv = Class.forName("com.viaversion.viaversion.api.protocol.version.ProtocolVersion", true, cl);
                    via263 = pv.getField("v26_3").get(null);
                    viaVersionOf = Class.forName("com.viaversion.viaversion.api.ViaAPI", true, cl).getMethod("getPlayerProtocolVersion", UUID.class);
                    viaNewerOrEqual = pv.getMethod("newerThanOrEqualTo", pv);
                }
            } catch (ReflectiveOperationException | LinkageError | RuntimeException ex) {
                viaApi = null;
                plugin.getLogger().warning("carcam: ViaVersion's player versions unreadable (" + ex + "); every camera head is sent exact");
            }
        }
        if (Bukkit.getPluginManager().getPlugin("ViaVersion") == null) return Head.FILTERED; // every client is native
        if (viaApi == null) return Head.EXACT;
        try {
            Object v = viaVersionOf.invoke(viaApi, p.getUniqueId());
            if (v == null) return Head.EXACT;
            return Boolean.TRUE.equals(viaNewerOrEqual.invoke(v, via263)) ? Head.EXACT : Head.FILTERED;
        } catch (ReflectiveOperationException | RuntimeException ex) {
            return Head.EXACT;
        }
    }

    void start() {
        if (task != null) return;
        sweep(); // nothing is ours yet: a camera or body left from before (a /reload) goes
        // The global region scheduler runs after every Bukkit task (MTVehicles moves the car in those) and before the
        // entity tracker, so the camera and the car's stands go out together.
        task = Bukkit.getGlobalRegionScheduler().runAtFixedRate(plugin, t -> tick(), 1L, 1L);
    }

    void shutdown() {
        if (task != null) { task.cancel(); task = null; }
        endProbe();
        offAll();
        flags.shutdown(); // every handler out of the pipelines (a reload must not leave this class loader's code there)
    }

    private void fail(String why) {
        if (error != null) return;
        error = why;
        plugin.getLogger().warning("carcam: off (" + why + ")");
    }

    /** The camera packet: the client looks through that entity (the player itself = back to normal). */
    private boolean sendCamera(Player p, Entity through) {
        if (camCtor == null) return false;
        try {
            Object nmsPlayer = p.getClass().getMethod("getHandle").invoke(p);
            Object nmsEntity = through.getClass().getMethod("getHandle").invoke(through);
            Object packet = camCtor.newInstance(nmsEntity);
            Object conn = nmsPlayer.getClass().getField("connection").get(nmsPlayer);
            if (conn == null) return false;
            if (send == null) send = conn.getClass().getMethod("send", Class.forName("net.minecraft.network.protocol.Packet"));
            send.invoke(conn, packet);
            return true;
        } catch (ReflectiveOperationException | LinkageError | RuntimeException ex) {
            fail("camera packet failed (" + ex + ")");
            return false;
        }
    }

    /** Why a player gets no chase view now ("" = they get one). */
    private String why(Player p) {
        if (error != null) return "error";
        if (!enabled) return "disabled";
        if (!p.isOnline() || p.isDead()) return "dead";
        if (CarSmooth.driverPlate(p) == null) return "not-driving";
        if (p.getScoreboardTags().contains(OFF_TAG)) return "off";
        if (p.getScoreboardTags().contains(openTag)) return "phone-open";
        if (onlyWithKey && p.getInventory().getHeldItemSlot() != KEY_SLOT) return "no-key";
        return "";
    }

    private ArmorStand mainStand(Player p, String plate) {
        ArmorStand a = CarSmooth.stand(plugin, CarSmooth.MAIN + plate);
        if (a != null && a.getWorld().equals(p.getWorld())) return a;
        String want = CarSmooth.MAIN + plate;
        for (Entity e : p.getNearbyEntities(6, 4, 6)) if (e instanceof ArmorStand s && want.equals(s.getName())) return s;
        return null;
    }

    private void tick() {
        tickNo++;
        for (Player p : Bukkit.getOnlinePlayers()) {
            Cam c = cams.get(p.getUniqueId());
            try {
                seatDistance(p);
                if (!why(p).isEmpty()) {
                    if (c != null) off(p);
                    else {
                        mapKey(p); // a hook key left over (a reload mid-ride): the map again
                        if (flags.isOn(p)) flags.set(p, false);
                    }
                    continue;
                }
                String plate = CarSmooth.driverPlate(p);
                ArmorStand main = mainStand(p, plate);
                if (main == null) { if (c != null) off(p); continue; }
                ArmorStand seat = p.getVehicle() instanceof ArmorStand s ? s : null;
                boolean wantStand = camera.equals("stand");
                if (c == null || !plate.equals(c.plate) || c.cam == null || !c.cam.isValid() || !c.cam.getWorld().equals(main.getWorld()) || c.stand != wantStand
                        || !head.equals(c.headSetting)) {
                    // A restart mid-ride (the camera lost, or carcam.camera or carcam.head switched) keeps the slot to put back.
                    int carry = c != null ? off(p, false) : -1;
                    if (retryAt.getOrDefault(p.getUniqueId(), 0) > tickNo) continue;
                    c = new Cam();
                    c.prevSlot = carry;
                    c.plate = plate;
                    c.stand = wantStand;
                    c.headSetting = head;
                    c.head = wantStand ? headFor(p) : Head.TRACKER;
                    c.yaw = main.getLocation().getYaw() + (float) yawOffset;
                    Location want = spot(p, main, seat, c);
                    // The stand's own yaw is the first view yaw and stays so (exact/filtered: the head goes by our packets).
                    c.fixedYaw = want.getYaw();
                    c.headH = unpackDegrees(packFloor(c.fixedYaw)); // what the spawn packet gives the client's head
                    Entity e = spawnCamera(want, wantStand);
                    if (e == null) { retryAt.put(p.getUniqueId(), tickNo + 20); continue; }
                    retryAt.remove(p.getUniqueId());
                    c.cam = e;
                    cams.put(p.getUniqueId(), c);
                    // Before anyone is sent it: its first resync (the driver starting to track it) takes the car along.
                    if (c.stand) CarSmooth.likeCar(e, plate);
                    // The client's movement queue for it starts where the spawn packet puts it (this tick); the watcher
                    // counts the resyncs the tracker sends it from now on.
                    c.queue = new StepQueue(tickNo);
                    c.queueTick = tickNo - 1;
                    c.lastPacketTick = tickNo;
                    c.lastAt = want.clone();
                    if (c.head == Head.EXACT && queueModel) flags.watch(p, e.getEntityId());
                    p.showEntity(plugin, e);
                    continue; // the camera packet next tick, once the client has the entity (an unknown id is ignored)
                }
                c.age++;
                // Sent at age 1 and again at 5 (in case the first beat the spawn packet): the same entity, harmless.
                if ((c.sent == 0 && c.age >= 1) || (c.sent == 1 && c.age >= 5 && !c.walled)) {
                    if (!sendCamera(p, c.cam)) { off(p); continue; }
                    c.sent++;
                    p.setMetadata(META, new FixedMetadataValue(plugin, plate));
                    if (c.sent == 1) { pickKey(p, c); sidebarOff(p); anchorLook(p, c); }
                }
                Location at = spot(p, main, seat, c); // also this tick's eye (c.eye), which the camera's clip starts from
                // The driver's head in a block (MTVehicles pushed the car's seat into a wall: nobody suffocates in a car,
                // CarSmooth.onSeatSuffocate): the camera's clip starts at the eye, so it would sit in the wall and see
                // through it, and the client draws the in-wall overlay only in first person (the owner suffocated unwarned,
                // 2026-09-30). First person until the head has been clear for 10 ticks.
                boolean walled = CarSteer.inWall(c.eye != null ? c.eye : p.getEyeLocation(), p.getWidth() * 0.4);
                c.clearTicks = walled ? 0 : c.clearTicks + 1;
                if (c.sent > 0 && walled && !c.walled && sendCamera(p, p)) {
                    c.walled = true;
                    c.walls++;
                    if (c.body != null && c.body.isValid()) p.hideEntity(plugin, c.body); // it sits round the eye
                } else if (c.walled && c.clearTicks >= 10) {
                    if (!sendCamera(p, c.cam)) { off(p); continue; }
                    c.walled = false;
                    anchorLook(p, c); // the bob ran again in first person
                    if (c.body != null && c.body.isValid()) p.showEntity(plugin, c.body);
                }
                // The client drops its camera when the camera entity goes (a car teleported far: the stand left the
                // driver's view and was sent again) and never looks through the new copy by itself.
                if (c.resendAt > 0 && c.age >= c.resendAt && !c.walled) {
                    c.resendAt = 0;
                    if (!sendCamera(p, c.cam)) { off(p); continue; }
                    plugin.getLogger().info("carcam " + p.getName() + ": the camera was sent to the client again, looking through it again");
                    anchorLook(p, c);
                }
                boolean ownHead = c.stand && c.head != Head.TRACKER;
                if (ownHead) at.setYaw(c.fixedYaw);
                boolean moved = c.lastAt == null || at.distanceSquared(c.lastAt) > 1e-8 || packFloor(at.getPitch()) != packFloor(c.lastAt.getPitch());
                c.lastAt = at.clone();
                c.cam.teleport(at);
                remember(p, c, seat, moved);
                if (c.stand) CarSmooth.likeCar(c.cam, plate);
                // Sent before the tracker sends this tick's move: the client applies both in the same tick.
                if (ownHead && !sendHead(p, c)) c.head = Head.TRACKER;
                if (probeOut != null && p.getUniqueId().equals(probeWho)) probeRow(c, main, at);
                if (c.sent > 0) {
                    // A player who picks another slot while driving keeps it: nothing to put back any more.
                    if (c.prevSlot >= 0 && p.getInventory().getHeldItemSlot() != KEY_SLOT) c.prevSlot = -1;
                    handsAndKey(p, c);
                    holdLookTick(p, c);
                    if (!c.walled) body(p, c);
                    if (tickNo % 10 == 0) sidebarTheirs(p);
                    if (c.age % 40 == 0 && flags.isOn(p)) flags.resend(p); // a flags packet that got past the handler
                }
            } catch (RuntimeException ex) {
                plugin.getLogger().warning("carcam " + p.getName() + ": " + ex);
                off(p);
            }
        }
        if (error != null && !cams.isEmpty()) offAll();
        if (tickNo % 100 == 0) {
            sweepBodies(); // a body no ride owns (every 5 s)
            retryAt.values().removeIf(t -> t <= tickNo);
        }
    }

    /** The camera entity, sent to nobody until the driver is shown it; null if it can't be made. */
    private Entity spawnCamera(Location at, boolean stand) {
        Entity e;
        if (stand) {
            e = at.getWorld().spawn(at, ArmorStand.class, s -> {
                s.setVisibleByDefault(false); // before it's in the world: nobody else is ever sent it
                s.setPersistent(false);
                s.setMarker(true);            // no hitbox (no bullet, click or ray ever hits it) and eye height 0
                s.setInvisible(true);
                s.setGravity(false);
                s.setInvulnerable(true);
                s.setSilent(true);
                s.setBasePlate(false);
                AttributeInstance cd = s.getAttribute(Attribute.CAMERA_DISTANCE);
                if (cd != null) cd.setBaseValue(0); // F5 during the view: no pull-back from the camera
                AttributeInstance w = s.getAttribute(Attribute.WAYPOINT_TRANSMIT_RANGE);
                if (w != null) w.setBaseValue(0);   // never a locator-bar dot
                s.addScoreboardTag(TAG);
            });
        } else {
            final int td = teleportDuration;
            e = at.getWorld().spawn(at, ItemDisplay.class, d -> {
                d.setVisibleByDefault(false);
                d.setPersistent(false);
                d.setTeleportDuration(td);
                d.setInvulnerable(true);
                d.addScoreboardTag(TAG);
            });
        }
        if (!e.isValid()) { e.remove(); return null; }
        return e;
    }

    // ---------------------------------------------------------------- where the camera is (F5's geometry)

    /**
     * F5 around the driver's eye: carcam.distance back along the view, pulled in before blocks. The view is the car's
     * eased heading plus the mouse orbit; the stand's own yaw is the car's part yaw-delay ticks late (see the class notes).
     */
    private Location spot(Player p, ArmorStand main, ArmorStand seat, Cam c) {
        float carYaw = main.getLocation().getYaw() + (float) yawOffset;
        // Look-ahead: a little into the turn (the car's turn rate x carcam.look-ahead seconds, at most look-ahead-max).
        float rate = Float.isNaN(c.prevCarYaw) ? 0 : wrap(carYaw - c.prevCarYaw) * 20f; // degrees a second
        c.prevCarYaw = carYaw;
        c.lead = (float) clamp(rate * lookAhead, -lookAheadMax, lookAheadMax);
        float target = wrap(carYaw + c.lead);
        if (yawFollow.equals("lerp")) {
            c.yaw = c.yaw + (float) (wrap(target - c.yaw) * yawSmooth);
            c.yawVel = 0;
        } else {
            double[] r = smoothDamp(c.yaw, target, c.yawVel, yawLag);
            c.yaw = wrap((float) r[0]);
            c.yawVel = r[1];
        }
        orbit(p, c);
        float yaw = wrap(c.yaw + c.orbitYaw);
        float pit = (float) clamp(pitch + c.orbitPitch, pitchMin, pitchMax);
        Location eye = pivot(p, seat, c);
        Vector look = direction(yaw, pit);
        double d = clip(eye, look, distance);
        Location at = eye.clone().subtract(look.clone().multiply(d));
        // The car's heading a few ticks back (the history starts full of the first value).
        if (c.histN == 0) java.util.Arrays.fill(c.yawHist, c.yaw);
        c.yawHist[c.histN % c.yawHist.length] = c.yaw;
        int back = c.stand ? Math.min(yawDelay, Math.min(c.histN, c.yawHist.length - 1)) : 0;
        float delayed = c.yawHist[(c.histN - back + c.yawHist.length * 4) % c.yawHist.length];
        c.histN++;
        float sent = wrap(delayed + c.orbitYaw);
        at.setYaw(sent);
        at.setPitch(pit);
        c.eye = eye;
        c.dist = d;
        c.viewYaw = yaw;
        c.viewPitch = pit;
        c.sentYaw = sent;
        c.carYaw = wrap(carYaw);
        return at;
    }

    /**
     * The driver's eye, where the seat puts it this tick. The seat stand moves in MTVehicles' task (before this), the
     * driver only when the server ticks them on it (after the tracker): their eye against where the seat was last tick is
     * the riding offset, added to where the seat is now.
     */
    private static Location pivot(Player p, ArmorStand seat, Cam c) {
        Location eye = p.getEyeLocation();
        if (seat == null) { c.seatPrev = null; return eye; }
        Location s = seat.getLocation();
        Location out = eye;
        if (c.seatPrev != null && c.seatPrev.getWorld() != null && c.seatPrev.getWorld().equals(s.getWorld())) {
            Vector off = eye.toVector().subtract(c.seatPrev.toVector());
            if (off.lengthSquared() < 9) out = new Location(s.getWorld(), s.getX() + off.getX(), s.getY() + off.getY(), s.getZ() + off.getZ());
        }
        c.seatPrev = s;
        return out;
    }

    /** Vanilla's look vector for a yaw and pitch (Location#getDirection). */
    private static Vector direction(float yaw, float pitch) {
        double y = Math.toRadians(yaw), x = Math.toRadians(pitch);
        double xz = Math.cos(x);
        return new Vector(-xz * Math.sin(y), -Math.sin(x), xz * Math.cos(y));
    }

    /**
     * Camera.getMaxZoom: 8 rays back along the view from the pivot +-0.1 on each axis, the shortest distance from the pivot
     * to a hit; then carcam.clip-margin more (the client draws the camera between two ticks' spots, which cuts corners).
     */
    private double clip(Location eye, Vector look, double d) {
        World w = eye.getWorld();
        Vector back = look.clone().multiply(-1);
        Vector pv = eye.toVector();
        double best = d;
        for (int i = 0; i < 8; i++) {
            double fx = ((i & 1) * 2 - 1) * 0.1, fy = ((i >> 1 & 1) * 2 - 1) * 0.1, fz = ((i >> 2 & 1) * 2 - 1) * 0.1;
            Location from = eye.clone().add(fx, fy, fz);
            RayTraceResult hit = w.rayTraceBlocks(from, back, d, FluidCollisionMode.NEVER, true);
            if (hit != null) {
                double h = hit.getHitPosition().distance(pv);
                if (h < best) best = h;
            }
        }
        if (best < d) best = Math.min(best, Math.max(0.1, best - clipMargin));
        return best;
    }

    /** The mouse: the change in the player's look since last tick turns the camera; idle, it eases back behind the car. */
    private void orbit(Player p, Cam c) {
        Location l = p.getLocation();
        float py = l.getYaw(), pp = l.getPitch();
        if (!c.lookInit) { c.lastLookYaw = py; c.lastLookPitch = pp; c.lookInit = true; return; }
        float dy = wrap(py - c.lastLookYaw), dp = pp - c.lastLookPitch;
        c.lastLookYaw = py;
        c.lastLookPitch = pp;
        if (!orbit) {
            c.orbitYaw = c.orbitPitch = c.orbitWantYaw = c.orbitWantPitch = 0;
            c.orbitVelYaw = c.orbitVelPitch = 0;
            c.idle = 0;
            return;
        }
        if (Math.abs(dy) > 0.01f || Math.abs(dp) > 0.01f) {
            c.orbitWantYaw = wrap(c.orbitWantYaw + (float) (dy * orbitSensitivity));
            c.orbitWantPitch = (float) clamp(c.orbitWantPitch + dp * orbitSensitivity, pitchMin - pitch, pitchMax - pitch);
            c.idle = 0;
        } else if (++c.idle > Math.round(orbitReturn * 20)) {
            // Idle: the wanted orbit eases back behind the car (the smoothing below rounds it off).
            c.orbitWantYaw *= (float) (1 - orbitReturnSpeed);
            c.orbitWantPitch *= (float) (1 - orbitReturnSpeed);
            if (Math.abs(c.orbitWantYaw) < 0.05f) c.orbitWantYaw = 0;
            if (Math.abs(c.orbitWantPitch) < 0.05f) c.orbitWantPitch = 0;
        }
        // The client's rotation packets come 0, 1 or 2 to a server tick: the view follows the sum through a short spring.
        if (orbitSmooth <= 0) {
            c.orbitYaw = c.orbitWantYaw;
            c.orbitPitch = c.orbitWantPitch;
            c.orbitVelYaw = c.orbitVelPitch = 0;
        } else {
            double[] y = smoothDamp(c.orbitYaw, c.orbitWantYaw, c.orbitVelYaw, orbitSmooth);
            double[] q = smoothDamp(c.orbitPitch, c.orbitWantPitch, c.orbitVelPitch, orbitSmooth);
            c.orbitYaw = wrap((float) y[0]);
            c.orbitVelYaw = y[1];
            c.orbitPitch = (float) q[0];
            c.orbitVelPitch = q[1];
            if (c.orbitWantYaw == 0 && Math.abs(c.orbitYaw) < 0.02f) { c.orbitYaw = 0; c.orbitVelYaw = 0; }
            if (c.orbitWantPitch == 0 && Math.abs(c.orbitPitch) < 0.02f) { c.orbitPitch = 0; c.orbitVelPitch = 0; }
        }
    }

    /**
     * A critically damped spring toward target (angles wrap), one server tick (0.05 s): {value, speed}. In a steady turn it
     * trails by exactly smoothTime seconds of turning; unlike a fixed fraction a tick, it never jolts when a turn starts
     * (its speed changes smoothly). Unity's SmoothDamp formula (stable for any step).
     */
    static double[] smoothDamp(double current, double target, double vel, double smoothTime) {
        if (smoothTime <= 1e-4) return new double[] {target, 0};
        double dt = 0.05, omega = 2 / smoothTime, x = omega * dt;
        double exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        double change = wrapD(current - target);
        double temp = (vel + omega * change) * dt;
        double v = (vel - omega * temp) * exp;
        return new double[] {target + (change + temp) * exp, v};
    }

    private static double wrapD(double a) {
        a %= 360;
        if (a >= 180) a -= 360;
        if (a < -180) a += 360;
        return a;
    }

    // ---------------------------------------------------------------- the camera's head (its view yaw)

    /** Mth.packDegrees (the server's floor to a 256th of a turn). */
    private static byte packFloor(float deg) {
        return (byte) (int) Math.floor(deg * 256.0 / 360.0);
    }

    /** ClientboundRotateHeadPacket.getYHeadRot on the client. */
    private static float unpackDegrees(byte b) {
        return b * 360.0F / 256.0F;
    }

    /**
     * This tick's head packet to the driver. The client sets it as the head's target with 3 steps left and, in the same
     * tick, moves the head 1/3 of the way (LivingEntity.lerpHeadTo + aiStep's lerpHeadRotationStep, Mth.rotLerp in
     * doubles, then a float). exact: the target that makes that 1/3 land on the view yaw (head + 3 x the gap, to the
     * nearest byte); filtered: the view yaw itself (the head eases like the position does on such a client). The model
     * then does what the client does, so a byte's rounding never piles up. False when the packet can't be sent.
     */
    private boolean sendHead(Player p, Cam c) {
        // The view of the tick the client shows the camera's spot at (exact with the queue model; else this tick's).
        c.sentYaw = (float) histAt(c.viewHist, c, c.shown - yawDelay);
        double[] st = {c.headH, c.headWantPrev};
        byte b = headByte(st, c.sentYaw, c.head == Head.EXACT || c.exactFor > 0);
        if (c.exactFor > 0) c.exactFor--;
        try {
            Object nmsCam = c.cam.getClass().getMethod("getHandle").invoke(c.cam);
            if (!sendPacket(p, headCtor.newInstance(nmsCam, b))) return false;
        } catch (ReflectiveOperationException | LinkageError | RuntimeException ex) {
            plugin.getLogger().warning("carcam " + p.getName() + ": head packet failed (" + ex + "); this camera's yaw goes through the tracker");
            return false;
        }
        c.headH = st[0];
        c.headWantPrev = st[1];
        c.headByte = b;
        c.headSent++;
        return true;
    }

    /** One camprobe.log row: tick, head mode, the car (MAIN) x z yaw, the camera x z, view/sent/eased yaw, the modelled head, lead, orbit, shown. */
    private void probeRow(Cam c, ArmorStand main, Location at) {
        Location m = main.getLocation();
        try {
            probeOut.write(String.format(Locale.ROOT, "%d,%s,%.4f,%.4f,%.3f,%.4f,%.4f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.2f%n",
                    tickNo, c.head.name().toLowerCase(Locale.ROOT), m.getX(), m.getZ(), wrap(m.getYaw()), at.getX(), at.getZ(),
                    c.viewYaw, c.sentYaw, c.yaw, c.headH, c.lead, c.orbitYaw, Double.isNaN(c.shown) ? 0 : tickNo - c.shown));
            probeOut.flush();
            if (--probeLeft <= 0) endProbe();
        } catch (java.io.IOException ex) {
            plugin.getLogger().warning("camprobe: " + ex.getMessage());
            endProbe();
        }
    }

    private void endProbe() {
        try { if (probeOut != null) probeOut.close(); } catch (java.io.IOException ignored) { }
        probeOut = null;
        probeWho = null;
    }

    /**
     * This tick's view and seat yaw into the history, and which (fractional) tick's camera spot the driver's client will
     * show in this tick (c.shown). A 26.3 client through ViaVersion queues a living entity's moves (26.3's
     * SteppedInterpolationHandler; ViaVersion turns each move into a step of the ticks since the entity's last one, 1 while
     * it moves every tick, and each resync into a 3-tick step): after a resync (the camera's first, when the driver starts
     * tracking it, and the car's stands with it: CarSmooth.likeCar) the camera and the car are shown about 2 ticks late
     * until they stand still. The exact head is aimed at the view of the tick that's shown, so the view turns with the
     * camera's spot, not ahead of it. The model is the research's interp263.js (checked against the 26.3 bytecode), fed
     * with the resyncs the watcher saw (SelfFlags.watch) and the moves this plugin made; filtered and tracker heads, and a
     * missing watcher, use this tick.
     */
    private void remember(Player p, Cam c, ArmorStand seat, boolean moved) {
        long n = tickNo;
        if (c.histFirst < 0) c.histFirst = n;
        c.viewHist[(int) (n % HIST)] = c.viewYaw;
        c.seatHist[(int) (n % HIST)] = seat != null ? seat.getLocation().getYaw() : c.carYaw;
        c.shown = n;
        long[] w = c.head == Head.EXACT && queueModel && c.queue != null ? flags.counts(p) : null;
        if (w == null) { c.movedPrev = moved; return; }
        boolean sync = w[0] > c.seen[0], movedSeen = w[1] > c.seen[1];
        System.arraycopy(w, 0, c.seen, 0, 3);
        // The ticks up to the last one (normally just the last): a resync if the watcher saw one, else a move if it moved.
        for (long k = Math.max(c.queueTick + 1, n - HIST); k < n; k++) {
            boolean last = k == n - 1;
            // A resync is a 3-tick step; ViaVersion times the next move from the last relative move, not from it.
            if (last && sync) c.queue.packet(k, true, 3);
            else if (last && (c.movedPrev || movedSeen)) { c.queue.packet(k, false, viaTicks(k - c.lastPacketTick)); c.lastPacketTick = k; }
            c.queue.tick();
        }
        c.queueTick = n - 1;
        // This tick as it will be: the tracker sends a move if the camera moved.
        StepQueue q = c.queue.copy();
        if (moved) q.packet(n, false, viaTicks(n - c.lastPacketTick));
        q.tick();
        c.shown = Math.max(n - HIST + 2, Math.min(n, q.pos));
        c.movedPrev = moved;
    }

    /** "resyncs/moves/turns" the watcher counted for the player's camera, or "none" (for /dphone cam). */
    private String watchText(Player p) {
        long[] w = flags.counts(p);
        return w == null ? "none" : w[0] + "/" + w[1] + "/" + w[2];
    }

    /** ViaVersion 26.2 -> 26.3: a move becomes a step of max(1, (ms + 25) / 50) ticks since the entity's last, 1 past 250 ms. */
    private static int viaTicks(long ticksSinceLast) {
        return ticksSinceLast > 5 ? 1 : (int) Math.max(1, ticksSinceLast);
    }

    /** A yaw from a camera's history at a fractional tick (between two ticks along the shorter way round). */
    private double histAt(double[] hist, Cam c, double t) {
        long n = tickNo;
        long first = Math.max(c.histFirst < 0 ? n : c.histFirst, n - HIST + 1);
        if (Double.isNaN(t) || t >= n) return hist[(int) (n % HIST)];
        if (t <= first) return hist[(int) (first % HIST)];
        long k = (long) Math.floor(t);
        double f = t - k, a = hist[(int) (k % HIST)], b = hist[(int) ((k + 1) % HIST)];
        return a + f * wrapD(b - a);
    }

    /**
     * The 26.3 client's SteppedInterpolationHandler for an armor stand (interpolationSteps 3), in one dimension: positions
     * are server ticks, so pos after tick() is the tick whose spot the client shows. A port of the research's interp263.js
     * (scratchpad glitch\), which was checked against the 26.3 bytecode.
     */
    static final class StepQueue {
        static final int N = 3;
        double pos, last, cur, rem, speed = 1, target;
        final java.util.ArrayDeque<double[]> steps = new java.util.ArrayDeque<>(); // {tick, ticks long}

        StepQueue(double start) { pos = start; last = start; target = start; }

        StepQueue copy() {
            StepQueue q = new StepQueue(pos);
            q.last = last; q.cur = cur; q.rem = rem; q.speed = speed; q.target = target;
            for (double[] s : steps) q.steps.add(s.clone());
            return q;
        }

        boolean active() { return !steps.isEmpty(); }

        /** interpolateTo: a resync (or a move to where it already is) is a 3-tick step, a move one of its own ticks. */
        void packet(double p, boolean resync, int ticks) {
            if (!active()) { last = pos; cur = 1; }
            if (p == target && active()) return;
            int t = resync || p == target ? N : Math.max(1, ticks);
            steps.add(new double[] {p, t});
            rem += t;
            target = p;
        }

        /** One client tick (commonTick -> interpolate). */
        void tick() {
            if (!active()) { rem = 0; speed = 1; return; }
            double out;
            for (;;) {
                if (steps.isEmpty()) { out = last; break; }
                double[] s = steps.peekFirst();
                if (cur < s[1]) { out = last + (s[0] - last) * cur / s[1]; break; }
                cur -= s[1];
                last = s[0];
                steps.pollFirst();
            }
            pos = out;
            double g = Math.max(rem / N, 1);
            speed = speed + (g - speed) / N;
            double d = speed;
            if (d >= rem) { d = rem; speed = 1; }
            cur += d;
            rem -= d;
        }
    }

    /**
     * One tick of the client's head model: the byte to send for the wanted yaw, and {head, wanted} updated to what the
     * client's head is after its step (state = {modelled head, last tick's wanted yaw (NaN at first)}).
     */
    static byte headByte(double[] state, double want, boolean exact) {
        double h = state[0];
        double target = want;
        if (exact) {
            // While the wanted yaw stands still the head eases onto the byte nearest it and stays there (like filtered):
            // correcting every tick would make it shimmer by ~0.2 degrees around it at rest.
            boolean still = !Double.isNaN(state[1]) && Math.abs(wrapD(want - state[1])) < 0.05;
            // At most 59 degrees of gap a tick: the client wraps (target - head) into +-180 before its third, so a
            // tripled gap past 180 would turn the head the wrong way (and lock it 120 degrees off while the view keeps
            // moving). A bigger gap (a fast flick) is caught up over the next ticks; the model follows what was sent.
            if (!still) target = h + 3 * clamp(wrapD(want - h), -59, 59);
        }
        byte b = (byte) Math.round(target * 256.0 / 360.0);
        state[0] = (float) (h + (1.0 / 3.0) * wrapD(unpackDegrees(b) - h));
        state[1] = want;
        return b;
    }

    /** Any packet to one player (their connection's send: through their pipeline, like the server's own). */
    private boolean sendPacket(Player p, Object packet) {
        try {
            Object nmsPlayer = p.getClass().getMethod("getHandle").invoke(p);
            Object conn = nmsPlayer.getClass().getField("connection").get(nmsPlayer);
            if (conn == null) return false;
            if (send == null) send = conn.getClass().getMethod("send", Class.forName("net.minecraft.network.protocol.Packet"));
            send.invoke(conn, packet);
            return true;
        } catch (ReflectiveOperationException | LinkageError | RuntimeException ex) {
            return false;
        }
    }

    private static float wrap(float a) {
        a %= 360;
        if (a >= 180) a -= 360;
        if (a < -180) a += 360;
        return a;
    }

    // ---------------------------------------------------------------- the car key in hand

    /** The view just started: select the car key (the client draws the held item at the camera). */
    private void pickKey(Player p, Cam c) {
        if (!selectKey) return;
        int held = p.getInventory().getHeldItemSlot();
        if (held == KEY_SLOT) return; // already on it (or a restart that carried the old slot over)
        if (selectSlot(p, held, KEY_SLOT)) c.prevSlot = held;
    }

    /** The view ended: the slot from before, if the player is still on the key (and never chose another slot meanwhile). */
    private void putSlotBack(Player p, Cam c) {
        if (c.prevSlot < 0 || !p.isOnline()) return;
        if (p.getInventory().getHeldItemSlot() != KEY_SLOT) return;
        selectSlot(p, KEY_SLOT, c.prevSlot);
    }

    /**
     * Like the client scrolling to a slot: PlayerItemHeldEvent first (WeaponMechanics ends a reload or scope on it,
     * phone.sk closes the big map; a plugin that cancels it keeps the slot), then Paper's setHeldItemSlot, which sends the
     * slot to the client (the client then reports the same slot back, which the server ignores).
     */
    private boolean selectSlot(Player p, int from, int to) {
        if (from == to || to < 0 || to > 8) return false;
        PlayerItemHeldEvent ev = new PlayerItemHeldEvent(p, from, to);
        Bukkit.getPluginManager().callEvent(ev);
        if (ev.isCancelled() || !p.isOnline()) return false;
        p.getInventory().setHeldItemSlot(to);
        return true;
    }

    private static boolean modelString(ItemStack it, String s) {
        if (it == null || !it.hasItemMeta()) return false;
        ItemMeta m = it.getItemMeta();
        return m.hasCustomModelDataComponent() && m.getCustomModelDataComponent().getStrings().contains(s);
    }

    /** The car key or the phone (their model strings), whether it's a map now or a hook. */
    private static boolean keyOrPhone(ItemStack it) {
        return modelString(it, KEY_MODEL) || modelString(it, PHONE_MODEL);
    }

    /**
     * While the view is on, every tick: the driver's own client is told the driver is invisible (carcam.self-invisible;
     * no arms with a map, no bare hand), and the key or phone in hotbar 9 stays the map (the GPS minimap in the corner)
     * when the minimap can be drawn one-handed: carcam.minimap, the invisibility in place, and something in the offhand
     * (with an empty offhand the client draws a held map two-handed in the middle of the screen). Otherwise the hook
     * (carcam.hook-key), with the metadata donating_carcam_hook for garage.sk's carKey.
     */
    private void handsAndKey(Player p, Cam c) {
        boolean inv = selfInvisible && flags.set(p, true);
        if (!selfInvisible && flags.isOn(p)) flags.set(p, false);
        ItemStack off = p.getInventory().getItemInOffHand();
        boolean offhand = off != null && !off.getType().isAir();
        boolean map = minimap && inv && offhand;
        c.hook = !map && hookKey;
        if (c.hook) {
            if (!p.hasMetadata(HOOK_META)) p.setMetadata(HOOK_META, new FixedMetadataValue(plugin, true));
            toHook(p);
        } else {
            if (p.hasMetadata(HOOK_META)) p.removeMetadata(HOOK_META, plugin);
            mapKey(p);
        }
    }

    /** A key or phone in hotbar 9 that is a map becomes the same item as a hook without a map_id. */
    private void toHook(Player p) {
        ItemStack it = p.getInventory().getItem(KEY_SLOT);
        if (it == null || it.getType() != Material.FILLED_MAP || !keyOrPhone(it)) return;
        ItemStack h = it.withType(Material.TRIPWIRE_HOOK);
        h.unsetData(DataComponentTypes.MAP_ID); // the renderer takes anything with a map_id down the map path (arms)
        p.getInventory().setItem(KEY_SLOT, h);
    }

    /** The view is off: a hooked key or phone in hotbar 9 is the map again, with the player's phone map id. */
    private void mapKey(Player p) {
        if (!p.isOnline()) return;
        ItemStack it = p.getInventory().getItem(KEY_SLOT);
        if (it == null || it.getType() != Material.TRIPWIRE_HOOK || !keyOrPhone(it)) return;
        ItemStack m = it.withType(Material.FILLED_MAP);
        Integer id = phoneMapId(p);
        if (id != null) m.setData(DataComponentTypes.MAP_ID, MapId.mapId(id));
        p.getInventory().setItem(KEY_SLOT, m);
    }

    /** The player's phone map id (PhonePlugin's metadata "donating_phone_map"), or null. */
    private Integer phoneMapId(Player p) {
        for (MetadataValue v : p.getMetadata(PhonePlugin.META)) {
            if (v.getOwningPlugin() == plugin && v.value() instanceof Number n) return n.intValue();
        }
        return null;
    }

    /**
     * The 26.3 client moves the hand's sway (LocalPlayer.applyInput: xBob and yBob chase the look) only while the player
     * is its own camera, so under the chase view the bob stays where the view switched and the held map is turned by
     * (look - bob) x 0.1 degrees: with the view locked, the minimap slid across the screen whenever the look moved
     * (checked in the owner's client, 2026-09-30). So the look is held where the bob froze: the mouse does nothing then,
     * which is what a locked view means. Taken at each switch into the chase view (the bob ran until then).
     */
    private void anchorLook(Player p, Cam c) {
        Location l = p.getLocation();
        c.holdYaw = l.getYaw();
        c.holdPitch = l.getPitch();
        c.holdSet = true;
    }

    private void holdLookTick(Player p, Cam c) {
        if (!holdLook || orbit || c.walled || !c.holdSet) return;
        Location l = p.getLocation();
        if (Math.abs(wrap(l.getYaw() - c.holdYaw)) > 0.5f || Math.abs(l.getPitch() - c.holdPitch) > 0.5f) {
            p.setRotation(c.holdYaw, c.holdPitch); // Entity.forceSetRotation: the player's rotation packet, still seated
            c.holds++;
        }
    }

    /** "hook", "map", "none" or "other": what hotbar 9 holds (for /dphone cam). */
    private static String keyState(Player p) {
        ItemStack it = p.getInventory().getItem(KEY_SLOT);
        if (it == null || it.getType().isAir()) return "none";
        if (!keyOrPhone(it)) return "other";
        String kind = modelString(it, KEY_MODEL) ? "key" : "phone";
        if (it.getType() == Material.TRIPWIRE_HOOK) return kind + "-hook";
        if (it.getType() == Material.FILLED_MAP) return kind + "-map";
        return "other";
    }

    private static String keyMapId(Player p) {
        ItemStack it = p.getInventory().getItem(KEY_SLOT);
        if (it == null || !it.hasData(DataComponentTypes.MAP_ID)) return "none";
        MapId id = it.getData(DataComponentTypes.MAP_ID);
        return id == null ? "none" : String.valueOf(id.id());
    }

    // ---------------------------------------------------------------- the driver's own body

    /** Keeps the driver's body on the seat (made once the view is on, remade if lost, the head along the car). */
    private void body(Player p, Cam c) {
        if (!body) { dropBody(c); return; }
        if (!(p.getVehicle() instanceof ArmorStand seat)) return;
        Mannequin m = c.body;
        if (m != null && (!m.isValid() || m.getVehicle() == null || !m.getVehicle().getUniqueId().equals(seat.getUniqueId()))) {
            plugin.getLogger().info("carcam " + p.getName() + ": the body left the seat (valid=" + m.isValid() + " vehicle=" + (m.getVehicle() == null ? "none" : m.getVehicle().getName()) + "), made again");
            dropBody(c);
            m = null;
            c.bodyNextTry = c.age + 10;
        }
        float yaw = seat.getLocation().getYaw();
        if (m == null) {
            if (c.bodySpawns >= BODY_MAX || c.age < c.bodyNextTry) return;
            if (++c.bodySpawns == BODY_MAX) plugin.getLogger().warning("carcam " + p.getName() + ": body made " + BODY_MAX + " times this ride (something removes it or blocks it); the last try");
            try {
                m = spawnBody(p, seat, yaw);
            } catch (RuntimeException | LinkageError ex) {
                // A body that can't be made never costs the chase view: no more tries this ride.
                plugin.getLogger().warning("carcam " + p.getName() + ": no body (" + ex + ")");
                c.bodySpawns = BODY_MAX;
                return;
            }
            if (m == null) { c.bodyNextTry = c.age + 20; return; }
            c.body = m;
            c.bodyYaw = yaw;
            c.bodyHead[0] = unpackDegrees(packFloor(yaw)); // the spawn packet's head
            c.bodyHead[1] = Double.NaN;
            return;
        }
        // Its body turns with the seat on the client by itself; only the head is sent. With the camera's own head
        // packets (exact/filtered) the body's head gets them the same way, landing on the seat's yaw in the tick the
        // seat turns (the server's own head packets eased it over 3 ticks after a 1-degree step: it swam against the car).
        if (c.head != Head.TRACKER && headCtor != null && !c.bodyTracker) {
            byte b = headByte(c.bodyHead, histAt(c.seatHist, c, c.shown), c.head == Head.EXACT);
            try {
                Object nmsBody = m.getClass().getMethod("getHandle").invoke(m);
                if (sendPacket(p, headCtor.newInstance(nmsBody, b))) return;
            } catch (ReflectiveOperationException | LinkageError | RuntimeException ignored) { }
            c.bodyTracker = true; // a packet that can't be sent: the server's own head packets from now on
        }
        if (Float.isNaN(c.bodyYaw) || Math.abs(wrap(yaw - c.bodyYaw)) >= 1f) {
            m.setRotation(yaw, 0);
            c.bodyYaw = yaw;
        }
    }

    /** A mannequin with the driver's skin, riding the driver's seat, sent to the driver only; null if it can't be made. */
    private Mannequin spawnBody(Player p, ArmorStand seat, float yaw) {
        Location at = p.getLocation(); // where the driver sits: the riding spot the body gets too
        at.setYaw(yaw);
        at.setPitch(0);
        ResolvableProfile profile = ResolvableProfile.resolvableProfile(p.getPlayerProfile());
        SkinParts parts = p.getClientOption(ClientOption.SKIN_PARTS);
        MainHand hand = p.getMainHand();
        Mannequin m = at.getWorld().spawn(at, Mannequin.class, e -> {
            e.setVisibleByDefault(false); // first, and before it's in the world: nobody else is ever sent it
            e.setPersistent(false);
            e.setInvulnerable(true);      // no damage, and WeaponMechanics' bullets pass through it
            e.setCollidable(false);       // not pickable: arrows pass through it (it must never shield the driver)
            e.setSilent(true);
            e.setGravity(false);
            e.setImmovable(true);
            e.setDescription(null);       // no "NPC" line under it
            e.setProfile(profile);
            if (parts != null) e.setSkinParts(parts);
            if (hand != null) e.setMainHand(hand);
            AttributeInstance w = e.getAttribute(Attribute.WAYPOINT_TRANSMIT_RANGE);
            if (w != null) w.setBaseValue(0); // never a locator-bar dot
            e.addScoreboardTag(BODY_TAG);
        });
        if (!m.isValid()) { m.remove(); return null; }           // a plugin cancelled the spawn
        if (!seat.addPassenger(m)) { m.remove(); return null; }  // or the mount
        p.showEntity(plugin, m); // its spawn goes out with the seat's passengers (sendPairingData)
        return m;
    }

    private static void dropBody(Cam c) {
        if (c.body != null) { c.body.remove(); c.body = null; }
        c.bodyYaw = Float.NaN;
    }

    private void dropBodies() {
        for (Cam c : cams.values()) dropBody(c);
        sweepBodies();
    }

    /** Removes every body no ride owns (a /kill that left a copy, a plugin that re-added it, a reload). */
    private void sweepBodies() {
        Set<UUID> owned = new HashSet<>();
        for (Cam c : cams.values()) if (c.body != null) owned.add(c.body.getUniqueId());
        for (World w : Bukkit.getWorlds())
            for (Mannequin e : w.getEntitiesByClass(Mannequin.class))
                if (e.getScoreboardTags().contains(BODY_TAG) && !owned.contains(e.getUniqueId())) e.remove();
    }

    /** Every camera (stand or display) and body (only when no ride is running: start, and after offAll). */
    private void sweep() {
        for (World w : Bukkit.getWorlds()) {
            for (ItemDisplay e : w.getEntitiesByClass(ItemDisplay.class)) if (e.getScoreboardTags().contains(TAG)) e.remove();
            for (ArmorStand e : w.getEntitiesByClass(ArmorStand.class)) if (e.getScoreboardTags().contains(TAG)) e.remove();
            for (Mannequin e : w.getEntitiesByClass(Mannequin.class)) if (e.getScoreboardTags().contains(BODY_TAG)) e.remove();
        }
    }

    /** The cautious fallback: F5 in the driver's seat sits carcam.seat-camera-distance back. */
    private void seatDistance(Player p) {
        if (seatCameraDistance <= 0) return;
        if (CarSmooth.driverPlate(p) == null || !(p.getVehicle() instanceof ArmorStand seat)) return;
        AttributeInstance a = seat.getAttribute(Attribute.CAMERA_DISTANCE);
        if (a != null && Math.abs(a.getBaseValue() - seatCameraDistance) > 1e-6) a.setBaseValue(seatCameraDistance);
    }

    /** The body first, then the camera back to the player, then the camera entity goes, then the key's map and the slot. */
    void off(Player p) {
        off(p, true);
    }

    /** Returns the slot there was to put back (-1: none); putBack false keeps it for a view that starts again at once. */
    private int off(Player p, boolean putBack) {
        Cam c = cams.remove(p.getUniqueId());
        p.removeMetadata(META, plugin);
        p.removeMetadata(HOOK_META, plugin);
        if (putBack || c == null) sidebarBack(p); // a camera remade at once (putBack false) keeps it hidden
        if (putBack && c != null && probeOut != null && p.getUniqueId().equals(probeWho)) endProbe(); // the ride ended: so does its probe
        if (c == null) { mapKey(p); if (flags.isOn(p)) flags.set(p, false); return -1; }
        dropBody(c); // before the reset: never a frame of first person from inside its head
        if (p.isOnline() && c.sent > 0) sendCamera(p, p);
        if (c.cam != null) { CarSmooth.forget(c.cam); c.cam.remove(); }
        if (flags.isOn(p)) flags.set(p, false); // after the reset: the real flags again (arms back in first person)
        flags.watch(p, -1);
        mapKey(p);
        if (putBack) putSlotBack(p, c);
        return c.prevSlot;
    }

    /** The chase view started: TAB's sidebar off for the ride (only if it showed: a player's own /sb stays theirs). */
    private void sidebarOff(Player p) {
        if (!hideSidebar || sidebarHidden.contains(p.getUniqueId()) || !Sidebar.present()) return;
        try {
            if (Sidebar.hide(p)) sidebarHidden.add(p.getUniqueId());
        } catch (LinkageError | RuntimeException ex) {
            plugin.getLogger().warning("carcam: can't hide TAB's sidebar (" + ex + "); it stays on");
            hideSidebar = false;
        }
    }

    /** The player turned the sidebar on again mid-ride (/sb): it's theirs from now on (a later /sb off stays off at the exit). */
    private void sidebarTheirs(Player p) {
        if (!sidebarHidden.contains(p.getUniqueId()) || !Sidebar.present()) return;
        try {
            if (Sidebar.visible(p)) sidebarHidden.remove(p.getUniqueId());
        } catch (LinkageError | RuntimeException ex) {
            sidebarHidden.remove(p.getUniqueId()); // TAB's scoreboard went away (a /tab reload): nothing to put back
        }
    }

    /** The sidebar back, if the view hid it. */
    private void sidebarBack(Player p) {
        if (!sidebarHidden.remove(p.getUniqueId()) || !p.isOnline() || !Sidebar.present()) return;
        try {
            Sidebar.show(p);
        } catch (LinkageError | RuntimeException ex) {
            plugin.getLogger().warning("carcam: can't show TAB's sidebar again (" + ex + ")");
        }
    }

    void offAll() {
        for (UUID u : new ArrayList<>(sidebarHidden)) {
            Player p = Bukkit.getPlayer(u);
            if (p == null) sidebarHidden.remove(u);
        }
        for (UUID u : new ArrayList<>(cams.keySet())) {
            Player p = Bukkit.getPlayer(u);
            if (p != null) off(p);
            else {
                Cam c = cams.remove(u);
                if (c != null) { dropBody(c); if (c.cam != null) { CarSmooth.forget(c.cam); c.cam.remove(); } }
            }
        }
        sweep();
    }

    String status(Player p) {
        Cam c = cams.get(p.getUniqueId());
        int held = p.getInventory().getHeldItemSlot();
        String key = " key=" + keyState(p) + " keymap=" + keyMapId(p) + " self=" + flags.state(p) + " sidebar=" + (sidebarHidden.contains(p.getUniqueId()) ? "hidden" : "kept");
        if (c == null || c.cam == null) {
            String w = why(p);
            return "CARCAM " + p.getName() + " none reason=" + (w.isEmpty() ? "starting" : w) + " slot=" + held + key + (error != null ? " error=" + error : "");
        }
        key += String.format(Locale.ROOT, " hook=%s head=%s headyaw=%.2f headbyte=%d heads=%d sentyaw=%.2f shownlag=%.2f watch=%s lead=%.2f spring=%.1f walled=%s walls=%d hold=%.1f,%.1f holds=%d",
                c.hook, c.head.name().toLowerCase(Locale.ROOT), wrap((float) c.headH), c.headByte, c.headSent, c.sentYaw, Double.isNaN(c.shown) ? 0 : tickNo - c.shown, watchText(p), c.lead, c.yawVel, c.walled, c.walls, c.holdYaw, c.holdPitch, c.holds);
        Location l = c.cam.getLocation();
        Mannequin b = c.body != null && c.body.isValid() ? c.body : null;
        Location e = c.eye != null ? c.eye : l;
        Location pl = p.getLocation();
        return String.format(Locale.ROOT, "CARCAM %s plate=%s type=%s cam=%s id=%d marker=%s sent=%d age=%d at=%.3f,%.3f,%.3f yaw=%.2f pitch=%.2f"
                        + " eye=%.3f,%.3f,%.3f view=%.2f,%.2f dist=%.3f want=%.2f caryaw=%.2f eased=%.2f look=%.2f,%.2f orbit=%.2f,%.2f idle=%d td=%d"
                        + " slot=%d restore=%d body=%s bodyid=%d bodyseat=%s%s",
                p.getName(), c.plate, c.stand ? "stand" : "display", c.cam.getUniqueId(), c.cam.getEntityId(),
                c.cam instanceof ArmorStand s ? String.valueOf(s.isMarker()) : "-", c.sent, c.age,
                l.getX(), l.getY(), l.getZ(), l.getYaw(), l.getPitch(),
                e.getX(), e.getY(), e.getZ(), c.viewYaw, c.viewPitch, c.dist, distance, c.carYaw, wrap(c.yaw), pl.getYaw(), pl.getPitch(),
                c.orbitYaw, c.orbitPitch, c.idle,
                c.cam instanceof ItemDisplay d ? d.getTeleportDuration() : -1, held, c.prevSlot,
                b == null ? "none" : b.getUniqueId().toString(), b == null ? -1 : b.getEntityId(),
                b == null ? "-" : String.valueOf(b.getVehicle() != null && p.getVehicle() != null && b.getVehicle().getUniqueId().equals(p.getVehicle().getUniqueId())),
                key);
    }

    /** /dphone cam &lt;player&gt; | /dphone cam tune &lt;key&gt; &lt;value&gt; | /dphone cam tune (the values). */
    boolean command(CommandSender sender, String[] a) {
        if (a.length >= 2 && a[1].equalsIgnoreCase("tune")) {
            if (a.length == 4) {
                String k = a[2].toLowerCase(Locale.ROOT);
                String v = a[3];
                try {
                    switch (k) {
                        case "enabled" -> { enabled = Boolean.parseBoolean(v); if (!enabled) offAll(); }
                        case "camera" -> {
                            if (!v.equalsIgnoreCase("stand") && !v.equalsIgnoreCase("display")) { sender.sendMessage("CARCAM tune: camera is stand or display"); return true; }
                            camera = v.toLowerCase(Locale.ROOT); // running views switch on the next tick
                        }
                        case "distance" -> distance = clamp(Double.parseDouble(v), 1, 16);
                        case "pitch" -> pitch = clamp(Double.parseDouble(v), -60, 80);
                        case "pitch-min" -> pitchMin = clamp(Double.parseDouble(v), -89, pitchMax);
                        case "pitch-max" -> pitchMax = clamp(Double.parseDouble(v), pitchMin, 89);
                        case "yaw-smooth" -> yawSmooth = clamp(Double.parseDouble(v), 0.02, 1);
                        case "yaw-offset" -> yawOffset = Double.parseDouble(v);
                        case "yaw-delay" -> yawDelay = (int) clamp(Integer.parseInt(v), 0, 7);
                        case "clip-margin" -> clipMargin = clamp(Double.parseDouble(v), 0, 1);
                        case "orbit" -> orbit = Boolean.parseBoolean(v);
                        case "hold-look" -> holdLook = Boolean.parseBoolean(v);
                        case "orbit-return" -> orbitReturn = clamp(Double.parseDouble(v), 0, 30);
                        case "orbit-return-speed" -> orbitReturnSpeed = clamp(Double.parseDouble(v), 0.01, 1);
                        case "orbit-sensitivity" -> orbitSensitivity = clamp(Double.parseDouble(v), 0, 4);
                        case "teleport-duration" -> { teleportDuration = (int) clamp(Integer.parseInt(v), 0, 59); applyTeleportDuration(); }
                        case "only-with-key" -> onlyWithKey = Boolean.parseBoolean(v);
                        case "select-key" -> selectKey = Boolean.parseBoolean(v);
                        case "hook-key" -> hookKey = Boolean.parseBoolean(v); // running views follow on the next tick
                        case "minimap" -> minimap = Boolean.parseBoolean(v);
                        case "self-invisible" -> selfInvisible = Boolean.parseBoolean(v);
                        case "hide-sidebar" -> {
                            hideSidebar = Boolean.parseBoolean(v);
                            if (!hideSidebar) for (UUID u : new ArrayList<>(sidebarHidden)) { Player q = Bukkit.getPlayer(u); if (q != null) sidebarBack(q); else sidebarHidden.remove(u); }
                        }
                        case "head" -> {
                            String h = parseHead(v);
                            if (h == null) { sender.sendMessage("CARCAM tune: head is auto, exact, filtered or tracker"); return true; }
                            head = h; // running views are remade on the next tick
                        }
                        case "yaw-follow" -> {
                            if (!v.equalsIgnoreCase("spring") && !v.equalsIgnoreCase("lerp")) { sender.sendMessage("CARCAM tune: yaw-follow is spring or lerp"); return true; }
                            yawFollow = v.toLowerCase(Locale.ROOT);
                        }
                        case "yaw-lag" -> yawLag = clamp(Double.parseDouble(v), 0, 2);
                        case "look-ahead" -> lookAhead = clamp(Double.parseDouble(v), 0, 1);
                        case "look-ahead-max" -> lookAheadMax = clamp(Double.parseDouble(v), 0, 60);
                        case "orbit-smooth" -> orbitSmooth = clamp(Double.parseDouble(v), 0, 1);
                        case "queue-model" -> queueModel = Boolean.parseBoolean(v); // new cameras (a head change remakes them)
                        case "preset" -> {
                            // The turning in one go, for an A/B: old = the camera before the turning fix (the tracker's
                            // head, the car's heading a tick late, the plain lerp, no look-ahead, the raw orbit); new = the
                            // shipped defaults. Distance, pitch and everything else stay as they are.
                            if (v.equalsIgnoreCase("old")) {
                                head = "tracker"; yawDelay = 1; yawFollow = "lerp"; lookAhead = 0; orbitSmooth = 0;
                            } else if (v.equalsIgnoreCase("new")) {
                                head = "auto"; yawDelay = 0; yawFollow = "spring"; yawLag = 0.15; lookAhead = 0.05; lookAheadMax = 15; orbitSmooth = 0.05;
                            } else { sender.sendMessage("CARCAM tune: preset is old or new"); return true; }
                        }
                        case "body" -> { body = Boolean.parseBoolean(v); if (!body) dropBodies(); }
                        case "seat-camera-distance" -> seatCameraDistance = clamp(Double.parseDouble(v), 0, 32);
                        default -> { sender.sendMessage("CARCAM tune: unknown key " + k); return true; }
                    }
                } catch (NumberFormatException ex) {
                    sender.sendMessage("CARCAM tune: " + k + " needs a number");
                    return true;
                }
            }
            sender.sendMessage(String.format(Locale.ROOT, "CARCAM tune enabled=%s camera=%s distance=%.2f pitch=%.1f pitch-min=%.1f pitch-max=%.1f yaw-smooth=%.2f yaw-offset=%.1f yaw-delay=%d clip-margin=%.2f orbit=%s hold-look=%s orbit-return=%.2f orbit-return-speed=%.2f orbit-sensitivity=%.2f teleport-duration=%d only-with-key=%s select-key=%s hook-key=%s minimap=%s self-invisible=%s hide-sidebar=%s head=%s yaw-follow=%s yaw-lag=%.3f look-ahead=%.3f look-ahead-max=%.1f orbit-smooth=%.3f queue-model=%s body=%s seat-camera-distance=%.1f (until /dphone reload; keep them in config.yml carcam.*)",
                    enabled, camera, distance, pitch, pitchMin, pitchMax, yawSmooth, yawOffset, yawDelay, clipMargin, orbit, holdLook, orbitReturn, orbitReturnSpeed, orbitSensitivity,
                    teleportDuration, onlyWithKey, selectKey, hookKey, minimap, selfInvisible, hideSidebar, head, yawFollow, yawLag, lookAhead, lookAheadMax, orbitSmooth, queueModel, body, seatCameraDistance));
            return true;
        }
        if (a.length == 4 && a[1].equalsIgnoreCase("probe")) {
            Player who = Bukkit.getPlayerExact(a[2]);
            if (who == null) { sender.sendMessage("CARCAM no player " + a[2]); return true; }
            endProbe();
            try {
                probeLeft = (int) clamp(Integer.parseInt(a[3]), 1, 12000);
                probeOut = new java.io.BufferedWriter(new java.io.FileWriter(new java.io.File(plugin.getDataFolder(), "camprobe.log"), true));
                probeOut.write("# camprobe " + who.getName() + " ticks=" + probeLeft + " head=" + head + " yaw-follow=" + yawFollow + " yaw-lag=" + yawLag + " yaw-delay=" + yawDelay
                        + " look-ahead=" + lookAhead + " orbit-smooth=" + orbitSmooth + " at " + new java.util.Date() + System.lineSeparator());
                probeOut.write("# tick,head,carx,carz,caryaw,camx,camz,view,sent,eased,headmodel,lead,orbit,shownlag" + System.lineSeparator());
                probeWho = who.getUniqueId();
                sender.sendMessage("CARCAM probe " + who.getName() + " for " + probeLeft + " ticks -> camprobe.log");
            } catch (NumberFormatException ex) {
                sender.sendMessage("CARCAM probe: ticks is a number");
            } catch (java.io.IOException ex) {
                endProbe();
                sender.sendMessage("CARCAM probe: can't write camprobe.log: " + ex.getMessage());
            }
            return true;
        }
        if (a.length != 2) { sender.sendMessage("CARCAM usage: /dphone cam <player> | /dphone cam tune [<key> <value>] | /dphone cam probe <player> <ticks>"); return true; }
        Player p = Bukkit.getPlayerExact(a[1]);
        sender.sendMessage(p == null ? "CARCAM no player " + a[1] : status(p));
        return true;
    }

    static final List<String> TUNE_KEYS = List.of("enabled", "camera", "distance", "pitch", "pitch-min", "pitch-max", "yaw-smooth", "yaw-offset", "yaw-delay",
            "clip-margin", "orbit", "orbit-return", "orbit-return-speed", "orbit-sensitivity", "teleport-duration", "only-with-key", "select-key", "hook-key",
            "minimap", "self-invisible", "hide-sidebar", "head", "yaw-follow", "yaw-lag", "look-ahead", "look-ahead-max", "orbit-smooth", "queue-model", "preset", "body", "seat-camera-distance");

    /** Tab completion for /dphone cam (args as /dphone gets them). */
    List<String> complete(String[] a, List<String> players) {
        List<String> out = new ArrayList<>();
        if (a.length == 2) { out.add("tune"); out.add("probe"); out.addAll(players); }
        else if (a.length == 3 && a[1].equalsIgnoreCase("probe")) out.addAll(players);
        else if (a.length == 4 && a[1].equalsIgnoreCase("probe")) out.addAll(List.of("200", "400"));
        else if (a.length == 3 && a[1].equalsIgnoreCase("tune")) out.addAll(TUNE_KEYS);
        else if (a.length == 4 && a[1].equalsIgnoreCase("tune") && a[2].equalsIgnoreCase("camera")) out.addAll(List.of("stand", "display"));
        else if (a.length == 4 && a[1].equalsIgnoreCase("tune") && a[2].equalsIgnoreCase("head")) out.addAll(List.of("auto", "exact", "filtered", "tracker"));
        else if (a.length == 4 && a[1].equalsIgnoreCase("tune") && a[2].equalsIgnoreCase("yaw-follow")) out.addAll(List.of("spring", "lerp"));
        else if (a.length == 4 && a[1].equalsIgnoreCase("tune") && a[2].equalsIgnoreCase("preset")) out.addAll(List.of("old", "new"));
        return out;
    }

    /** The driver's client being sent the camera again after it lost it (not the first time: that one's ours). */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onCamTracked(io.papermc.paper.event.player.PlayerTrackEntityEvent e) {
        Cam c = cams.get(e.getPlayer().getUniqueId());
        if (c == null) return;
        UUID id = e.getEntity().getUniqueId();
        // The body sent again: its head is what its spawn packet gives (the body's own yaw), not what the model had.
        if (c.body != null && id.equals(c.body.getUniqueId())) {
            if (!Float.isNaN(c.bodyYaw)) { c.bodyHead[0] = unpackDegrees(packFloor(c.bodyYaw)); c.bodyHead[1] = Double.NaN; }
            return;
        }
        if (c.cam == null || c.sent == 0 || !id.equals(c.cam.getUniqueId())) return;
        c.resendAt = c.age + 1; // after the tracker's spawn packet (it goes out this tick)
        // The spawn packet (sent right after this event) puts the client's head at the stand's own yaw and starts its
        // movement queue again: the models start from there, and the head is corrected exactly for two ticks (a
        // filtered client would otherwise ease over from the stand's yaw, the camera's yaw when it was made).
        c.headH = unpackDegrees(packFloor(c.fixedYaw));
        c.headWantPrev = Double.NaN;
        c.exactFor = 2;
        if (c.queue != null) {
            c.queue = new StepQueue(tickNo);
            c.queueTick = tickNo - 1;
            c.lastPacketTick = tickNo;
            c.movedPrev = false;
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onDismount(EntityDismountEvent e) {
        // (A body's own dismount, when it's removed or ejected, isn't a player's: the tick remakes it while the ride goes on.)
        if (e.getEntity() instanceof Player p) off(p);
    }

    /** A body killed anyway (/kill ignores invulnerability) leaves nothing behind. */
    @EventHandler(priority = EventPriority.MONITOR)
    public void onBodyDeath(EntityDeathEvent e) {
        if (!e.getEntity().getScoreboardTags().contains(BODY_TAG) && !e.getEntity().getScoreboardTags().contains(TAG)) return;
        e.getDrops().clear();
        e.setDroppedExp(0);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onTeleport(PlayerTeleportEvent e) {
        off(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onWorld(PlayerChangedWorldEvent e) {
        off(e.getPlayer());
    }

    /**
     * First thing on quitting: forget the sidebar the view hid. MTVehicles takes a quitting driver out of the seat at
     * NORMAL (its LeaveListener), and that exit's sidebarBack must not call TAB for a player who is leaving.
     */
    @EventHandler(priority = EventPriority.LOWEST)
    public void onQuitEarly(PlayerQuitEvent e) {
        sidebarHidden.remove(e.getPlayer().getUniqueId());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        // Never TAB for a quitting player: TAB removes them on its own threads, and a sidebar shown now could leave them on
        // its board (remember-toggle-choice is false: a rejoin starts with the sidebar anyway).
        sidebarHidden.remove(e.getPlayer().getUniqueId());
        off(e.getPlayer());
        flags.remove(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onDeath(PlayerDeathEvent e) {
        off(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onRespawn(PlayerRespawnEvent e) {
        off(e.getPlayer());
    }

    // ---------------------------------------------------------------- the driver invisible to themself only

    /**
     * Makes one player's own client think that player is invisible (checked in the 26.3 client: shared flag 5 = bit 0x20
     * of entity data 0, Entity.isInvisible, read into the first-person render state), while every other client still gets
     * the real flags. A netty outbound handler on the player's channel, tail-side of the unbundler and the encoder (it sees
     * packet objects in the server's own version, before ViaVersion translates the bytes; data 0 is the shared flags byte
     * in 1.21.11 and 26.x alike), ORs 0x20 into every ClientboundSetEntityDataPacket about the player's own entity id while
     * on, inside bundles too. Turning it on or off sends the player's current flags again at once (their own connection
     * only, through the same handler). Everything the server sends goes in at the channel's tail, so nothing passes around
     * it; a packet a plugin writes from further down the pipeline could, so CarCam re-sends the flags every 2 s.
     * The server's own entity data never changes (Bukkit's isInvisible stays false; nothing is saved).
     * What an invisible local player changes in the client (checked or inferred): no arms with a held map, no bare hand
     * (FirstPersonHandsAndItemsRenderer, checked), the inventory screen's player preview is empty (inferred: the living
     * renderer skips invisible entities), fewer potion-effect particles (inferred); it isn't drawn under a foreign camera.
     */
    static final class SelfFlags {
        static final String HANDLER = "donating_carcam_self";
        private final JavaPlugin plugin;
        private String error;
        private boolean tried;
        private Class<?> cData, cBundle, cSync, cTeleport, cMove;
        private Field fMoveId, fXa, fYa, fZa;
        private Method mHasRot;
        private Method mSyncId, mTeleportId, mHasPos;
        private Method mDataId, mItems, mDvId, mDvSer, mDvValue, mSubs, mCreate, mEntityData, mGet;
        private Constructor<?> ctorData, ctorDv, ctorBundle;
        private Object flagsAccessor;
        private final Map<UUID, Rewriter> handlers = new HashMap<>();

        SelfFlags(JavaPlugin plugin) { this.plugin = plugin; }

        private boolean ready() {
            if (!tried) {
                tried = true;
                try {
                    cData = Class.forName("net.minecraft.network.protocol.game.ClientboundSetEntityDataPacket");
                    cBundle = Class.forName("net.minecraft.network.protocol.game.ClientboundBundlePacket");
                    Class<?> dv = Class.forName("net.minecraft.network.syncher.SynchedEntityData$DataValue");
                    Class<?> ser = Class.forName("net.minecraft.network.syncher.EntityDataSerializer");
                    Class<?> acc = Class.forName("net.minecraft.network.syncher.EntityDataAccessor");
                    Class<?> sed = Class.forName("net.minecraft.network.syncher.SynchedEntityData");
                    Class<?> ent = Class.forName("net.minecraft.world.entity.Entity");
                    mDataId = cData.getMethod("id");
                    mItems = cData.getMethod("packedItems");
                    ctorData = cData.getConstructor(int.class, List.class);
                    mDvId = dv.getMethod("id");
                    mDvSer = dv.getMethod("serializer");
                    mDvValue = dv.getMethod("value");
                    ctorDv = dv.getConstructor(int.class, ser, Object.class);
                    mCreate = dv.getMethod("create", acc, Object.class);
                    mSubs = Class.forName("net.minecraft.network.protocol.BundlePacket").getMethod("subPackets");
                    ctorBundle = cBundle.getConstructor(Iterable.class);
                    Field f = ent.getDeclaredField("DATA_SHARED_FLAGS_ID");
                    f.setAccessible(true);
                    flagsAccessor = f.get(null);
                    mEntityData = ent.getMethod("getEntityData");
                    mGet = sed.getMethod("get", acc);
                    cSync = Class.forName("net.minecraft.network.protocol.game.ClientboundEntityPositionSyncPacket");
                    cTeleport = Class.forName("net.minecraft.network.protocol.game.ClientboundTeleportEntityPacket");
                    cMove = Class.forName("net.minecraft.network.protocol.game.ClientboundMoveEntityPacket");
                    mSyncId = cSync.getMethod("id");
                    mTeleportId = cTeleport.getMethod("id");
                    mHasPos = cMove.getMethod("hasPosition");
                    fMoveId = cMove.getDeclaredField("entityId");
                    fMoveId.setAccessible(true);
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
            if (plugin != null) plugin.getLogger().warning("carcam self-invisible: off, the key is the hook again (" + why + ")");
            else System.err.println("carcam self-invisible: " + why);
        }

        /** Turns it on or off for a player; false if it can't be on (the caller falls back to the hook). */
        boolean set(Player p, boolean on) {
            Rewriter rw = handlers.get(p.getUniqueId());
            if (!on) {
                if (rw != null && rw.on) { rw.on = false; resend(p); }
                return true;
            }
            rw = ensure(p);
            if (rw == null) return false;
            rw.selfId = p.getEntityId();
            if (!rw.on) { rw.on = true; resend(p); }
            return true;
        }

        /** The player's handler, installed if it isn't (yet, or any more); null if it can't be. */
        private Rewriter ensure(Player p) {
            if (!ready() || !p.isOnline()) return null;
            Rewriter rw = handlers.get(p.getUniqueId());
            if (rw != null && rw.error != null) { fail("rewrite (" + rw.error + ")"); return null; }
            if (rw == null || !rw.channel.isActive() || rw.channel.pipeline().get(HANDLER) != rw) {
                int watch = rw != null ? rw.watchId : -1;
                rw = install(p);
                if (rw == null) return null;
                rw.watchId = watch;
            }
            return rw;
        }

        /**
         * Counts, from now on, the resyncs (position syncs and teleports), moves and turns the server sends this player
         * for one entity (the chase camera: CarCam's model of the client's movement queue); -1 stops it.
         */
        void watch(Player p, int entityId) {
            Rewriter rw = entityId < 0 ? handlers.get(p.getUniqueId()) : ensure(p);
            if (rw == null) return;
            rw.watchId = -1;
            rw.wSync.set(0);
            rw.wMove.set(0);
            rw.wTurn.set(0);
            rw.watchId = entityId;
        }

        /** {resyncs, moves, turns} sent for the watched entity since watch(), or null (no handler, nothing watched). */
        long[] counts(Player p) {
            Rewriter rw = handlers.get(p.getUniqueId());
            if (rw == null || rw.watchId < 0 || rw.error != null) return null;
            return new long[] {rw.wSync.get(), rw.wMove.get(), rw.wTurn.get()};
        }

        boolean isOn(Player p) {
            Rewriter rw = handlers.get(p.getUniqueId());
            return rw != null && rw.on;
        }

        /** "on", "off" or "error" (with the rewrite count while there's a handler), for /dphone cam. */
        String state(Player p) {
            if (error != null) return "error";
            Rewriter rw = handlers.get(p.getUniqueId());
            if (rw == null) return "off";
            return (rw.on ? "on" : "off") + " rewrites=" + rw.count.get();
        }

        private Rewriter install(Player p) {
            try {
                Object sp = p.getClass().getMethod("getHandle").invoke(p);
                Object listener = sp.getClass().getField("connection").get(sp);
                if (listener == null) return null;
                Object connection = listener.getClass().getField("connection").get(listener);
                Channel ch = (Channel) connection.getClass().getField("channel").get(connection);
                if (ch == null || !ch.isActive()) return null;
                Rewriter rw = new Rewriter(ch, p.getEntityId());
                ChannelPipeline pl = ch.pipeline();
                if (pl.get(HANDLER) != null) pl.remove(HANDLER); // left by an earlier copy of the plugin
                if (pl.get("packet_handler") != null) pl.addBefore("packet_handler", HANDLER, rw);
                else pl.addLast(HANDLER, rw);
                Rewriter old = handlers.put(p.getUniqueId(), rw);
                if (old != null && old != rw) old.on = false;
                return rw;
            } catch (ReflectiveOperationException | LinkageError | RuntimeException ex) {
                fail("install (" + ex + ")");
                return null;
            }
        }

        /** The player's current shared flags, sent to them alone (the handler adds the bit while on). */
        void resend(Player p) {
            if (!ready() || !p.isOnline()) return;
            try {
                Object sp = p.getClass().getMethod("getHandle").invoke(p);
                Object data = mEntityData.invoke(sp);
                Object flagsNow = mGet.invoke(data, flagsAccessor);
                Object dv = mCreate.invoke(null, flagsAccessor, flagsNow);
                Object packet = ctorData.newInstance(p.getEntityId(), List.of(dv));
                Object listener = sp.getClass().getField("connection").get(sp);
                if (listener == null) return;
                listener.getClass().getMethod("send", Class.forName("net.minecraft.network.protocol.Packet")).invoke(listener, packet);
            } catch (ReflectiveOperationException | LinkageError | RuntimeException ex) {
                fail("resend (" + ex + ")");
            }
        }

        /** A player leaving: the handler goes with their channel; forget it. */
        void remove(Player p) {
            Rewriter rw = handlers.remove(p.getUniqueId());
            if (rw != null) { rw.on = false; detach(rw); }
        }

        /** The plugin stopping: everyone's real flags again, every handler out of the pipelines. */
        void shutdown() {
            for (Map.Entry<UUID, Rewriter> en : new ArrayList<>(handlers.entrySet())) {
                Rewriter rw = en.getValue();
                boolean was = rw.on;
                rw.on = false;
                Player p = Bukkit.getPlayer(en.getKey());
                if (was && p != null) resend(p);
                detach(rw);
            }
            handlers.clear();
        }

        private static void detach(Rewriter rw) {
            try {
                // Queued on the channel's own thread: after the re-sent flags already on their way.
                rw.channel.eventLoop().execute(() -> {
                    try { if (rw.channel.pipeline().get(HANDLER) == rw) rw.channel.pipeline().remove(rw); } catch (RuntimeException ignored) { }
                });
            } catch (RuntimeException ignored) { }
        }

        /** The handler on one player's channel (runs on netty's thread). */
        final class Rewriter extends ChannelOutboundHandlerAdapter {
            final Channel channel;
            volatile boolean on;
            volatile int selfId;
            volatile String error;
            final AtomicLong count = new AtomicLong();
            volatile int watchId = -1;
            final AtomicLong wSync = new AtomicLong(), wMove = new AtomicLong(), wTurn = new AtomicLong();

            Rewriter(Channel channel, int selfId) { this.channel = channel; this.selfId = selfId; }

            @Override
            public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
                if (error == null && (on || watchId >= 0)) {
                    try {
                        if (watchId >= 0) watch(msg);
                        if (on) msg = rewrite(msg);
                    } catch (Throwable t) {
                        error = String.valueOf(t);
                        on = false;
                        watchId = -1;
                    }
                }
                super.write(ctx, msg, promise);
            }

            private void watch(Object msg) throws ReflectiveOperationException {
                if (cBundle.isInstance(msg)) {
                    for (Object sub : (Iterable<?>) mSubs.invoke(msg)) watchOne(sub);
                } else watchOne(msg);
            }

            private void watchOne(Object pk) throws ReflectiveOperationException {
                int w = watchId;
                if (cMove.isInstance(pk)) {
                    if (fMoveId.getInt(pk) != w) return;
                    boolean pos = Boolean.TRUE.equals(mHasPos.invoke(pk));
                    // A keepalive (a zero move): CarBundle drops it on the way to the client, so it isn't one.
                    if (pos && CarBundle.keepaliveDrop && !Boolean.TRUE.equals(mHasRot.invoke(pk)) && fXa.getShort(pk) == 0 && fYa.getShort(pk) == 0 && fZa.getShort(pk) == 0) return;
                    if (pos) wMove.incrementAndGet();
                    else wTurn.incrementAndGet();
                } else if (cSync.isInstance(pk)) {
                    if ((Integer) mSyncId.invoke(pk) == w) wSync.incrementAndGet();
                } else if (cTeleport.isInstance(pk)) {
                    if ((Integer) mTeleportId.invoke(pk) == w) wSync.incrementAndGet();
                }
            }

            private Object rewrite(Object msg) throws ReflectiveOperationException {
                if (cData.isInstance(msg)) return rewriteData(msg);
                if (!cBundle.isInstance(msg)) return msg;
                List<Object> out = new ArrayList<>();
                boolean changed = false;
                for (Object sub : (Iterable<?>) mSubs.invoke(msg)) {
                    Object r = cData.isInstance(sub) ? rewriteData(sub) : sub;
                    changed |= r != sub;
                    out.add(r);
                }
                return changed ? ctorBundle.newInstance(out) : msg;
            }

            private Object rewriteData(Object packet) throws ReflectiveOperationException {
                int id = (Integer) mDataId.invoke(packet);
                if (id != selfId) return packet;
                List<?> items = (List<?>) mItems.invoke(packet);
                List<Object> out = null;
                for (int i = 0; i < items.size(); i++) {
                    Object dv = items.get(i);
                    if ((Integer) mDvId.invoke(dv) != 0) continue;
                    if (!(mDvValue.invoke(dv) instanceof Byte b) || (b & 0x20) != 0) continue;
                    if (out == null) out = new ArrayList<>(items);
                    out.set(i, ctorDv.newInstance(0, mDvSer.invoke(dv), (byte) (b | 0x20)));
                }
                if (out == null) return packet;
                count.incrementAndGet();
                return ctorData.newInstance(id, out);
            }
        }
    }
}
