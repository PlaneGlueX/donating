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
import io.papermc.paper.datacomponent.item.ResolvableProfile;
import io.papermc.paper.threadedregions.scheduler.ScheduledTask;
import org.bukkit.Bukkit;
import org.bukkit.FluidCollisionMode;
import org.bukkit.Location;
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
import org.bukkit.inventory.MainHand;
import org.bukkit.metadata.FixedMetadataValue;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.util.RayTraceResult;
import org.bukkit.util.Vector;

/**
 * The chase camera for drivers (owner, 2026-09-29: "make the user go into 3rd person mode automatically when entering
 * the car and back into 1st person when exiting"; research camera.md, checked in the 26.3 client). The server can't
 * switch the client's F5 view, but it can make the client look through another entity: an empty item display only the
 * driver is sent (invisible to everyone before it exists, then shown to them), moved every tick behind and above the car
 * (the car's heading eased, pulled in before any block so it never sees through a wall), with the display's
 * teleport_duration smoothing it on the client. The keys still drive the car (the client sends its input whatever it
 * looks through). The price, all vanilla: no hotbar, hearts or food while the view is on (carcam.sk shows health on the
 * action bar), and the mouse doesn't turn the view.
 *
 * Two fixes from the owner's 26.3 client (2026-09-29):
 *  - The held item is still drawn in first person at the camera (a gun covered a third of the view). When the view
 *    starts, hotbar 9 (index 8: the car key, a map with the phone's GPS view) is selected, and the client draws it as a
 *    small GPS map in the corner. Getting out puts back the slot held before, but only if the player is still on 8 and
 *    never picked another slot during the ride (their choice wins). carcam.select-key.
 *  - The client never draws its own player under another camera (a LocalPlayer that isn't the camera is skipped), so the
 *    car looked empty. The driver gets a body of their own: a mannequin with their skin, invisible to everyone before it
 *    exists and then shown to the driver only, riding the driver's seat stand as its second passenger. Riding makes the
 *    client sit it (HumanoidModel's riding pose), place it exactly where the driver sits (players and mannequins share
 *    Avatar's vehicle attachment), move it with the seat every frame, and turn its body with the seat (a rider's body
 *    follows a LivingEntity vehicle's body, and an armor stand's body is its yaw); only its head is sent (the car's
 *    heading). Invulnerable (WeaponMechanics' bullets skip invulnerable entities) and not collidable (a LivingEntity that
 *    doesn't collide isn't pickable: arrows pass through), so it never shields the driver. carcam.body.
 *
 * Off = the body goes first (never a frame of first person from inside its head), then the camera packet with the
 * player's own entity (the client never resets it by itself when the entity goes: the view would freeze and the player
 * couldn't walk), then the display is removed, then the slot goes back; on getting out, a teleport, a world change,
 * quitting, death, the phone's big map (tag donating_phone_open), the opt-out tag donating_carcam_off (carcam.sk's
 * /carcam off), the car's MAIN stand missing, any error, and the plugin stopping.
 * While on, the player has metadata "donating_carcam" = the plate (carcam.sk reads it).
 *
 * Fallback for everyone (the owner's cautious option): the driver's seat stand gets camera_distance
 * carcam.seat-camera-distance, so F5 in a car sits farther back (the client uses the larger of the player's and the
 * vehicle's) when the chase view is off.
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

    private final JavaPlugin plugin;
    private final Map<UUID, Cam> cams = new HashMap<>();
    private ScheduledTask task;
    private int tickNo;

    // Tunables (config carcam.*; /dphone cam tune changes them until the next reload).
    boolean enabled = true;
    double distance = 5.5, height = 2.3, lookHeight = 1.2, yawSmooth = 0.35, yawOffset = 0, seatCameraDistance = 7;
    int teleportDuration = 3;
    boolean onlyWithKey = false;
    boolean selectKey = true;
    boolean body = true;
    private String openTag = "donating_phone_open";

    private Constructor<?> camCtor;
    private Method send;
    private String error;

    private static final class Cam {
        ItemDisplay display;
        String plate;
        float yaw;
        int age;
        int sent;          // camera packets sent (the first goes a tick after the spawn; one more a few ticks later)
        int prevSlot = -1; // the hotbar slot held before the view picked the key (-1: nothing to put back)
        Mannequin body;    // the driver's own body, sent to the driver only
        float bodyYaw = Float.NaN;
        int bodySpawns;    // bodies made in this ride
        int bodyNextTry;   // no new body before this age
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
        distance = clamp(c.getDouble("carcam.distance", 5.5), 1, 16);
        height = clamp(c.getDouble("carcam.height", 2.3), 0, 8);
        lookHeight = clamp(c.getDouble("carcam.look-height", 1.2), 0, 4);
        yawSmooth = clamp(c.getDouble("carcam.yaw-smooth", 0.35), 0.02, 1);
        yawOffset = c.getDouble("carcam.yaw-offset", 0);
        teleportDuration = (int) clamp(c.getInt("carcam.teleport-duration", 3), 0, 59);
        onlyWithKey = c.getBoolean("carcam.only-with-key", false);
        seatCameraDistance = clamp(c.getDouble("carcam.seat-camera-distance", 7), 0, 32);
        selectKey = c.getBoolean("carcam.select-key", true);
        body = c.getBoolean("carcam.body", true);
        openTag = c.getString("open-tag", "donating_phone_open");
        for (Cam cam : cams.values()) if (cam.display != null && cam.display.isValid()) cam.display.setTeleportDuration(teleportDuration);
        if (!body) dropBodies();
        if (!enabled) offAll();
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
        if (onlyWithKey && p.getInventory().getHeldItemSlot() != 8) return "no-key";
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
                if (!why(p).isEmpty()) { if (c != null) off(p); continue; }
                String plate = CarSmooth.driverPlate(p);
                ArmorStand main = mainStand(p, plate);
                if (main == null) { if (c != null) off(p); continue; }
                if (c == null || !plate.equals(c.plate) || c.display == null || !c.display.isValid() || !c.display.getWorld().equals(main.getWorld())) {
                    // A restart mid-ride (the display lost) keeps the slot to put back: the player never left the car.
                    int carry = c != null ? off(p, false) : -1;
                    c = new Cam();
                    c.prevSlot = carry;
                    c.plate = plate;
                    c.yaw = main.getLocation().getYaw() + (float) yawOffset;
                    Location want = spot(main, c);
                    final int td = teleportDuration;
                    ItemDisplay d = want.getWorld().spawn(want, ItemDisplay.class, e -> {
                        e.setVisibleByDefault(false); // before it's in the world: nobody else is ever sent it
                        e.setPersistent(false);
                        e.setTeleportDuration(td);
                        e.setInvulnerable(true);
                        e.addScoreboardTag(TAG);
                    });
                    if (!d.isValid()) { d.remove(); continue; }
                    c.display = d;
                    cams.put(p.getUniqueId(), c);
                    p.showEntity(plugin, d);
                    continue; // the camera packet next tick, once the client has the entity (an unknown id is ignored)
                }
                c.age++;
                // Sent at age 1 and again at 5 (in case the first beat the spawn packet): the same entity, harmless.
                if ((c.sent == 0 && c.age >= 1) || (c.sent == 1 && c.age >= 5)) {
                    if (!sendCamera(p, c.display)) { off(p); continue; }
                    c.sent++;
                    p.setMetadata(META, new FixedMetadataValue(plugin, plate));
                    if (c.sent == 1) pickKey(p, c);
                }
                c.display.teleport(spot(main, c));
                if (c.sent > 0) {
                    // A player who picks another slot while driving keeps it: nothing to put back any more.
                    if (c.prevSlot >= 0 && p.getInventory().getHeldItemSlot() != KEY_SLOT) c.prevSlot = -1;
                    body(p, c);
                }
            } catch (RuntimeException ex) {
                plugin.getLogger().warning("carcam " + p.getName() + ": " + ex);
                off(p);
            }
        }
        if (error != null && !cams.isEmpty()) offAll();
        if (tickNo % 100 == 0) sweepBodies(); // a body no ride owns (every 5 s)
    }

    // ---------------------------------------------------------------- the car key in hand

    /** The view just started: select the car key (the client draws the held item at the camera; the key's map is small). */
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

    /** Every camera display and body (only when no ride is running: start, and after offAll). */
    private void sweep() {
        for (World w : Bukkit.getWorlds()) {
            for (ItemDisplay e : w.getEntitiesByClass(ItemDisplay.class)) if (e.getScoreboardTags().contains(TAG)) e.remove();
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

    /** Behind and above the car along its eased heading, pulled in before a wall (never inside a block). */
    private Location spot(ArmorStand main, Cam c) {
        Location car = main.getLocation();
        float target = car.getYaw() + (float) yawOffset;
        c.yaw = c.yaw + (float) (wrap(target - c.yaw) * yawSmooth);
        float yaw = c.yaw;
        double r = Math.toRadians(yaw);
        Vector forward = new Vector(-Math.sin(r), 0, Math.cos(r));
        Location eye = car.clone().add(0, lookHeight, 0);
        Vector back = forward.clone().multiply(-distance).add(new Vector(0, height - lookHeight, 0));
        double full = back.length();
        double len = full;
        Vector dir = back.clone().normalize();
        RayTraceResult hit = car.getWorld().rayTraceBlocks(eye, dir, full + 0.35, FluidCollisionMode.NEVER, true);
        if (hit != null) len = Math.max(0.3, Math.min(full, hit.getHitPosition().distance(eye.toVector()) - 0.35));
        Location at = eye.clone().add(dir.multiply(len));
        at.setYaw(yaw);
        at.setPitch((float) Math.toDegrees(Math.atan2(height - lookHeight, distance)));
        return at;
    }

    private static float wrap(float a) {
        a %= 360;
        if (a >= 180) a -= 360;
        if (a < -180) a += 360;
        return a;
    }

    /** The body first, then the camera back to the player, then the display goes, then the slot from before. */
    void off(Player p) {
        off(p, true);
    }

    /** Returns the slot there was to put back (-1: none); putBack false keeps it for a view that starts again at once. */
    private int off(Player p, boolean putBack) {
        Cam c = cams.remove(p.getUniqueId());
        p.removeMetadata(META, plugin);
        if (c == null) return -1;
        dropBody(c); // before the reset: never a frame of first person from inside its head
        if (p.isOnline() && c.sent > 0) sendCamera(p, p);
        if (c.display != null) c.display.remove();
        if (putBack) putSlotBack(p, c);
        return c.prevSlot;
    }

    void offAll() {
        for (UUID u : new ArrayList<>(cams.keySet())) {
            Player p = Bukkit.getPlayer(u);
            if (p != null) off(p);
            else {
                Cam c = cams.remove(u);
                if (c != null) { dropBody(c); if (c.display != null) c.display.remove(); }
            }
        }
        sweep();
    }

    String status(Player p) {
        Cam c = cams.get(p.getUniqueId());
        int held = p.getInventory().getHeldItemSlot();
        if (c == null || c.display == null) {
            String w = why(p);
            return "CARCAM " + p.getName() + " none reason=" + (w.isEmpty() ? "starting" : w) + " slot=" + held + (error != null ? " error=" + error : "");
        }
        Location l = c.display.getLocation();
        Mannequin b = c.body != null && c.body.isValid() ? c.body : null;
        return String.format(Locale.ROOT, "CARCAM %s plate=%s display=%s id=%d sent=%d age=%d at=%.2f,%.2f,%.2f yaw=%.1f pitch=%.1f td=%d slot=%d restore=%d body=%s bodyid=%d bodyseat=%s",
                p.getName(), c.plate, c.display.getUniqueId(), c.display.getEntityId(), c.sent, c.age, l.getX(), l.getY(), l.getZ(),
                l.getYaw(), l.getPitch(), c.display.getTeleportDuration(), held, c.prevSlot,
                b == null ? "none" : b.getUniqueId().toString(), b == null ? -1 : b.getEntityId(),
                b == null ? "-" : String.valueOf(b.getVehicle() != null && p.getVehicle() != null && b.getVehicle().getUniqueId().equals(p.getVehicle().getUniqueId())));
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
                        case "distance" -> distance = clamp(Double.parseDouble(v), 1, 16);
                        case "height" -> height = clamp(Double.parseDouble(v), 0, 8);
                        case "look-height" -> lookHeight = clamp(Double.parseDouble(v), 0, 4);
                        case "yaw-smooth" -> yawSmooth = clamp(Double.parseDouble(v), 0.02, 1);
                        case "yaw-offset" -> yawOffset = Double.parseDouble(v);
                        case "teleport-duration" -> {
                            teleportDuration = (int) clamp(Integer.parseInt(v), 0, 59);
                            for (Cam c : cams.values()) if (c.display != null && c.display.isValid()) c.display.setTeleportDuration(teleportDuration);
                        }
                        case "only-with-key" -> onlyWithKey = Boolean.parseBoolean(v);
                        case "select-key" -> selectKey = Boolean.parseBoolean(v);
                        case "body" -> { body = Boolean.parseBoolean(v); if (!body) dropBodies(); }
                        case "seat-camera-distance" -> seatCameraDistance = clamp(Double.parseDouble(v), 0, 32);
                        default -> { sender.sendMessage("CARCAM tune: unknown key " + k); return true; }
                    }
                } catch (NumberFormatException ex) {
                    sender.sendMessage("CARCAM tune: " + k + " needs a number");
                    return true;
                }
            }
            sender.sendMessage(String.format(Locale.ROOT, "CARCAM tune enabled=%s distance=%.2f height=%.2f look-height=%.2f yaw-smooth=%.2f yaw-offset=%.1f teleport-duration=%d only-with-key=%s select-key=%s body=%s seat-camera-distance=%.1f (until /dphone reload; keep them in config.yml carcam.*)",
                    enabled, distance, height, lookHeight, yawSmooth, yawOffset, teleportDuration, onlyWithKey, selectKey, body, seatCameraDistance));
            return true;
        }
        if (a.length != 2) { sender.sendMessage("CARCAM usage: /dphone cam <player> | /dphone cam tune [<key> <value>]"); return true; }
        Player p = Bukkit.getPlayerExact(a[1]);
        sender.sendMessage(p == null ? "CARCAM no player " + a[1] : status(p));
        return true;
    }

    static final List<String> TUNE_KEYS = List.of("enabled", "distance", "height", "look-height", "yaw-smooth", "yaw-offset", "teleport-duration", "only-with-key", "select-key", "body", "seat-camera-distance");

    /** Tab completion for /dphone cam (args as /dphone gets them). */
    List<String> complete(String[] a, List<String> players) {
        List<String> out = new ArrayList<>();
        if (a.length == 2) { out.add("tune"); out.addAll(players); }
        else if (a.length == 3 && a[1].equalsIgnoreCase("tune")) out.addAll(TUNE_KEYS);
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
        if (!e.getEntity().getScoreboardTags().contains(BODY_TAG)) return;
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
