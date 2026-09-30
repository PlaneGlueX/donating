package dev.donating.phone;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.destroystokyo.paper.ClientOption;
import com.destroystokyo.paper.SkinParts;
import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.MapId;
import io.papermc.paper.datacomponent.item.ResolvableProfile;
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
 *    yaw, which the client eases in 3 steps as soon as it arrives, while the car's body turns through the queue about a
 *    tick later: the car's part of the yaw is sent carcam.yaw-delay ticks late. Eye height 0 (a marker's size is 0), so
 *    the view is exactly at the stand; its camera_distance 0 (F5 during the view adds no pull-back).
 *  - F5's geometry (Camera.update + getMaxZoom): the pivot is the driver's eye, the camera sits carcam.distance back
 *    along the view (yaw = the car's heading eased + the mouse orbit, pitch = carcam.pitch + the orbit's), pulled in
 *    before blocks like vanilla (8 rays from the pivot +-0.1 on each axis, the shortest hit, minus carcam.clip-margin):
 *    never inside a wall, no x-ray into heists. The pivot follows the seat stand (the driver is only put on the seat
 *    after the tracker has sent it, so the driver's own spot is a tick behind the car).
 *  - The mouse orbits the camera like F5 (carcam.orbit): the client still turns its own player with the mouse and sends
 *    the rotation every tick while riding, so each tick's change in the player's yaw and pitch is added to the orbit;
 *    after carcam.orbit-return seconds without a change it eases back behind the car (like GTA). It lags the mouse by
 *    the ping and about 225 ms (the round trip plus the client's smoothing): fine for looking around, not for aiming.
 *  - No hands: the client draws arms only for an empty main hand or a map (anything with a map_id takes the map path,
 *    whatever its model), everything else only as its item model, which the pack hides in first person while the player
 *    isn't the camera (minecraft:view_entity). So while the view is on, a car key or phone in hotbar 9 is the same item
 *    as a tripwire hook without the map_id (carcam.hook-key; its custom data, name and model string stay, so garage.sk's
 *    "carkey:<plate>" and the right-click lock still work; garage.sk's carKey builds the hook itself while the metadata
 *    donating_carcam is set), and the map comes back on every way out, with the player's phone map id.
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
    /** Hotbar 9: the car key while driving (garage.sk carKey), a filled map showing the phone's GPS view. */
    static final int KEY_SLOT = 8;
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

    // Tunables (config carcam.*; /dphone cam tune changes them until the next reload).
    boolean enabled = true;
    String camera = "stand";
    double distance = 6.5, pitch = 12, pitchMin = -20, pitchMax = 70, yawSmooth = 0.35, yawOffset = 0, seatCameraDistance = 7;
    double clipMargin = 0.15, orbitReturn = 1.5, orbitReturnSpeed = 0.15, orbitSensitivity = 1;
    int yawDelay = 1, teleportDuration = 3;
    boolean orbit = true, hookKey = true;
    boolean onlyWithKey = false;
    boolean selectKey = true;
    boolean body = true;
    private String openTag = "donating_phone_open";

    private Constructor<?> camCtor;
    private Method send;
    private String error;

    private static final class Cam {
        Entity cam;        // the camera: a marker armor stand, or an item display (carcam.camera display)
        boolean stand;
        String plate;
        float yaw;         // the car's heading, eased
        int age;
        int sent;          // camera packets sent (the first goes a tick after the spawn; one more a few ticks later)
        int prevSlot = -1; // the hotbar slot held before the view picked the key (-1: nothing to put back)
        Mannequin body;    // the driver's own body, sent to the driver only
        float bodyYaw = Float.NaN;
        int bodySpawns;    // bodies made in this ride
        int bodyNextTry;   // no new body before this age
        // The mouse orbit: the player's look last tick, the offsets, ticks since the mouse last moved.
        boolean lookInit;
        float lastLookYaw, lastLookPitch, orbitYaw, orbitPitch;
        int idle;
        // The car's eased heading of the last few ticks (the stand's yaw is sent yaw-delay ticks late).
        final float[] yawHist = new float[8];
        int histN;
        Location seatPrev;  // the seat where the driver was put on it last tick
        // The last spot (for /dphone cam).
        Location eye;
        double dist;
        float viewYaw, viewPitch, sentYaw, carYaw;
    }

    CarCam(JavaPlugin plugin) {
        this.plugin = plugin;
        try {
            Class<?> pk = Class.forName("net.minecraft.network.protocol.game.ClientboundSetCameraPacket");
            camCtor = pk.getConstructor(Class.forName("net.minecraft.world.entity.Entity"));
        } catch (ReflectiveOperationException | LinkageError ex) {
            fail("camera packet not found (" + ex + ")");
        }
    }

    void configure(FileConfiguration c) {
        enabled = c.getBoolean("carcam.enabled", true);
        camera = "display".equalsIgnoreCase(c.getString("carcam.camera", "stand")) ? "display" : "stand";
        distance = clamp(c.getDouble("carcam.distance", 6.5), 1, 16);
        pitch = clamp(c.getDouble("carcam.pitch", 12), -60, 80);
        pitchMin = clamp(c.getDouble("carcam.pitch-min", -20), -89, 89);
        pitchMax = clamp(c.getDouble("carcam.pitch-max", 70), pitchMin, 89);
        yawSmooth = clamp(c.getDouble("carcam.yaw-smooth", 0.35), 0.02, 1);
        yawOffset = c.getDouble("carcam.yaw-offset", 0);
        yawDelay = (int) clamp(c.getInt("carcam.yaw-delay", 1), 0, 7);
        clipMargin = clamp(c.getDouble("carcam.clip-margin", 0.15), 0, 1);
        orbit = c.getBoolean("carcam.orbit", true);
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

    void start() {
        if (task != null) return;
        sweep(); // nothing is ours yet: a camera or body left from before (a /reload) goes
        // The global region scheduler runs after every Bukkit task (MTVehicles moves the car in those) and before the
        // entity tracker, so the camera and the car's stands go out together.
        task = Bukkit.getGlobalRegionScheduler().runAtFixedRate(plugin, t -> tick(), 1L, 1L);
    }

    void shutdown() {
        if (task != null) { task.cancel(); task = null; }
        offAll();
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
                    else mapKey(p); // a hook key left over (a reload mid-ride): the map again
                    continue;
                }
                String plate = CarSmooth.driverPlate(p);
                ArmorStand main = mainStand(p, plate);
                if (main == null) { if (c != null) off(p); continue; }
                ArmorStand seat = p.getVehicle() instanceof ArmorStand s ? s : null;
                boolean wantStand = camera.equals("stand");
                if (c == null || !plate.equals(c.plate) || c.cam == null || !c.cam.isValid() || !c.cam.getWorld().equals(main.getWorld()) || c.stand != wantStand) {
                    // A restart mid-ride (the camera lost, or carcam.camera switched) keeps the slot to put back.
                    int carry = c != null ? off(p, false) : -1;
                    if (retryAt.getOrDefault(p.getUniqueId(), 0) > tickNo) continue;
                    c = new Cam();
                    c.prevSlot = carry;
                    c.plate = plate;
                    c.stand = wantStand;
                    c.yaw = main.getLocation().getYaw() + (float) yawOffset;
                    Location want = spot(p, main, seat, c);
                    Entity e = spawnCamera(want, wantStand);
                    if (e == null) { retryAt.put(p.getUniqueId(), tickNo + 20); continue; }
                    retryAt.remove(p.getUniqueId());
                    c.cam = e;
                    cams.put(p.getUniqueId(), c);
                    // Before anyone is sent it: its first resync (the driver starting to track it) takes the car along.
                    if (c.stand) CarSmooth.likeCar(e, plate);
                    p.showEntity(plugin, e);
                    continue; // the camera packet next tick, once the client has the entity (an unknown id is ignored)
                }
                c.age++;
                // Sent at age 1 and again at 5 (in case the first beat the spawn packet): the same entity, harmless.
                if ((c.sent == 0 && c.age >= 1) || (c.sent == 1 && c.age >= 5)) {
                    if (!sendCamera(p, c.cam)) { off(p); continue; }
                    c.sent++;
                    p.setMetadata(META, new FixedMetadataValue(plugin, plate));
                    if (c.sent == 1) pickKey(p, c);
                }
                c.cam.teleport(spot(p, main, seat, c));
                if (c.stand) CarSmooth.likeCar(c.cam, plate);
                if (c.sent > 0) {
                    // A player who picks another slot while driving keeps it: nothing to put back any more.
                    if (c.prevSlot >= 0 && p.getInventory().getHeldItemSlot() != KEY_SLOT) c.prevSlot = -1;
                    hookKey(p);
                    body(p, c);
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
        c.yaw = c.yaw + (float) (wrap(carYaw - c.yaw) * yawSmooth);
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
        if (!orbit) { c.orbitYaw = 0; c.orbitPitch = 0; c.idle = 0; return; }
        if (Math.abs(dy) > 0.01f || Math.abs(dp) > 0.01f) {
            c.orbitYaw = wrap(c.orbitYaw + (float) (dy * orbitSensitivity));
            c.orbitPitch = (float) clamp(c.orbitPitch + dp * orbitSensitivity, pitchMin - pitch, pitchMax - pitch);
            c.idle = 0;
            return;
        }
        if (++c.idle <= Math.round(orbitReturn * 20)) return;
        c.orbitYaw *= (float) (1 - orbitReturnSpeed);
        c.orbitPitch *= (float) (1 - orbitReturnSpeed);
        if (Math.abs(c.orbitYaw) < 0.05f) c.orbitYaw = 0;
        if (Math.abs(c.orbitPitch) < 0.05f) c.orbitPitch = 0;
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

    /** While the view is on: a key or phone in hotbar 9 that is a map becomes the same item as a hook without a map_id. */
    private void hookKey(Player p) {
        if (!hookKey) return;
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
            return;
        }
        // Its body turns with the seat on the client by itself; only the head is sent (whole degrees are enough).
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
        if (c == null) { mapKey(p); return -1; }
        dropBody(c); // before the reset: never a frame of first person from inside its head
        if (p.isOnline() && c.sent > 0) sendCamera(p, p);
        if (c.cam != null) { CarSmooth.forget(c.cam); c.cam.remove(); }
        mapKey(p);
        if (putBack) putSlotBack(p, c);
        return c.prevSlot;
    }

    void offAll() {
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
        String key = " key=" + keyState(p) + " keymap=" + keyMapId(p);
        if (c == null || c.cam == null) {
            String w = why(p);
            return "CARCAM " + p.getName() + " none reason=" + (w.isEmpty() ? "starting" : w) + " slot=" + held + key + (error != null ? " error=" + error : "");
        }
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
                        case "orbit-return" -> orbitReturn = clamp(Double.parseDouble(v), 0, 30);
                        case "orbit-return-speed" -> orbitReturnSpeed = clamp(Double.parseDouble(v), 0.01, 1);
                        case "orbit-sensitivity" -> orbitSensitivity = clamp(Double.parseDouble(v), 0, 4);
                        case "teleport-duration" -> { teleportDuration = (int) clamp(Integer.parseInt(v), 0, 59); applyTeleportDuration(); }
                        case "only-with-key" -> onlyWithKey = Boolean.parseBoolean(v);
                        case "select-key" -> selectKey = Boolean.parseBoolean(v);
                        case "hook-key" -> {
                            hookKey = Boolean.parseBoolean(v);
                            if (!hookKey) for (UUID u : cams.keySet()) { Player q = Bukkit.getPlayer(u); if (q != null) mapKey(q); }
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
            sender.sendMessage(String.format(Locale.ROOT, "CARCAM tune enabled=%s camera=%s distance=%.2f pitch=%.1f pitch-min=%.1f pitch-max=%.1f yaw-smooth=%.2f yaw-offset=%.1f yaw-delay=%d clip-margin=%.2f orbit=%s orbit-return=%.2f orbit-return-speed=%.2f orbit-sensitivity=%.2f teleport-duration=%d only-with-key=%s select-key=%s hook-key=%s body=%s seat-camera-distance=%.1f (until /dphone reload; keep them in config.yml carcam.*)",
                    enabled, camera, distance, pitch, pitchMin, pitchMax, yawSmooth, yawOffset, yawDelay, clipMargin, orbit, orbitReturn, orbitReturnSpeed, orbitSensitivity,
                    teleportDuration, onlyWithKey, selectKey, hookKey, body, seatCameraDistance));
            return true;
        }
        if (a.length != 2) { sender.sendMessage("CARCAM usage: /dphone cam <player> | /dphone cam tune [<key> <value>]"); return true; }
        Player p = Bukkit.getPlayerExact(a[1]);
        sender.sendMessage(p == null ? "CARCAM no player " + a[1] : status(p));
        return true;
    }

    static final List<String> TUNE_KEYS = List.of("enabled", "camera", "distance", "pitch", "pitch-min", "pitch-max", "yaw-smooth", "yaw-offset", "yaw-delay",
            "clip-margin", "orbit", "orbit-return", "orbit-return-speed", "orbit-sensitivity", "teleport-duration", "only-with-key", "select-key", "hook-key",
            "body", "seat-camera-distance");

    /** Tab completion for /dphone cam (args as /dphone gets them). */
    List<String> complete(String[] a, List<String> players) {
        List<String> out = new ArrayList<>();
        if (a.length == 2) { out.add("tune"); out.addAll(players); }
        else if (a.length == 3 && a[1].equalsIgnoreCase("tune")) out.addAll(TUNE_KEYS);
        else if (a.length == 4 && a[1].equalsIgnoreCase("tune") && a[2].equalsIgnoreCase("camera")) out.addAll(List.of("stand", "display"));
        return out;
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

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        off(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onDeath(PlayerDeathEvent e) {
        off(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onRespawn(PlayerRespawnEvent e) {
        off(e.getPlayer());
    }
}
