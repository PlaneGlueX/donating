package dev.donating.phone;

import java.io.File;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.ArmorStand;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.Damageable;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.util.Vector;

/**
 * Steering by speed (the owner, 2026-09-30: "reduce the turning speed by alot, it doesnt match the cars speed and
 * acceleration (test with other cars aswell)"). MTVehicles 2.5.9 turns a car a whole number of degrees every tick
 * (its rotation value, 8 for every car: 160 degrees a second at any speed over 2 blocks a second, a third of that
 * below, reversing and standing still included), so cars spun on the spot. CarSmooth calls step() for every driven car
 * each tick, after MTVehicles' own movement task and before the entity tick and the tracker: MTVehicles' rotation value
 * for the plate is kept at 0 (taken over as the car's handling base: 8 stock, 9-11 with the handling mods), and the car
 * is turned here instead, in fractions of a degree:
 *
 *   v  = MTVehicles' speed for the plate x 20 (blocks a second, signed: backwards is negative)
 *   s  = the steering, eased toward the keys (A +1, D -1) over steer-in (a crawl) to steer-in-top (top speed) seconds,
 *        back to 0 over steer-out seconds (and through 0 when the other key is pressed)
 *   h  = base - 8 (the handling mods)
 *   R  = rmin x (1 - 0.05 h) + v^2 / (grip x (1 + 0.10 h))   the turning circle's radius, wider at speed (blocks)
 *   w  = min(max-rate, rate-scale x |v| / R) in degrees a second; 0 under min-speed (no turning in place)
 *   yaw += -s x sign(v) x w / 20 each tick (a left turn lowers the yaw, like MTVehicles'; reversing turns the nose the
 *        other way, like a real car; carsteer.reverse arcade keeps MTVehicles' way)
 *
 * with rmin and grip per car family (carsteer.profiles, carsteer.families: the family is read from the car model on the
 * SKIN stand's head, its item damage, through MTVehicles' vehicles.yml, so wraps, crate cars and contract cars need
 * nothing). A car stuck against a wall (MAIN moving less than a quarter of its speed for 3 ticks, or its nose in a
 * block at a crawl) turns at creep-rate while a pedal is held, so it can get out. The yaw is always MAIN's own plus this
 * tick's turn (nothing stored), so MTVehicles' drive-up, garage.sk's climb out of the water and teleports keep theirs.
 * MAIN's velocity is turned with it (this tick's move already follows the new heading) and the seats are put where
 * MTVehicles would put them at the new yaw. Any error, /dphone steer off, a driver getting out and the plugin stopping
 * give MTVehicles its rotation value back.
 */
final class CarSteer {
    /** CarSmooth's seat snap (Entity.absSnapTo: keeps the riders). */
    interface Snap { void to(ArmorStand s, double x, double y, double z, float yaw, float pitch) throws ReflectiveOperationException; }

    private final JavaPlugin plugin;
    boolean enabled = true, reverseReal = true, velocity = true;
    double rateScale = 1, maxRate = 100, steerIn = 0.20, steerInTop = 0.30, steerOut = 0.12, minSpeed = 0.1, creepRate = 40;
    int handlingBase = 8;
    double handlingGrip = 0.10, handlingRmin = 0.05;
    String defaultProfile = "sedan";
    final Map<String, double[]> profiles = new LinkedHashMap<>(); // profile -> {rmin, grip}
    final Map<String, String> families = new LinkedHashMap<>();   // MTVehicles family (vehicles.yml name) -> profile
    private final Map<Integer, String> familyByDamage = new HashMap<>();
    private final Map<String, State> states = new HashMap<>();
    private String error;
    private boolean reflTried;
    private Field fSpeed;
    private Method getRot, setRot, getSpeed;
    private Object maxSpeedKind;

    static final class State {
        double s;              // the eased steering, -1..1 (+: left)
        int base = -1;         // MTVehicles' rotation value taken over (8 stock, 9-11 with handling mods)
        int damage = Integer.MIN_VALUE;
        String family = "?", profile;
        int stuckTicks;
        double lastX = Double.NaN, lastZ;
        double v, r, omega;    // this tick: speed (b/s), radius, the turn applied (degrees a second, signed)
        boolean blocked;
        int headBlocked;       // turns refused: a rider's head would have gone into a block
        String keys = "";
    }

    CarSteer(JavaPlugin plugin) { this.plugin = plugin; }

    void configure(FileConfiguration c) {
        enabled = c.getBoolean("carsteer.enabled", true);
        rateScale = clamp(c.getDouble("carsteer.rate-scale", 1.0), 0.05, 5);
        maxRate = clamp(c.getDouble("carsteer.max-rate", 100), 5, 400);
        steerIn = clamp(c.getDouble("carsteer.steer-in", 0.20), 0, 3);
        steerInTop = clamp(c.getDouble("carsteer.steer-in-top", 0.30), 0, 3);
        steerOut = clamp(c.getDouble("carsteer.steer-out", 0.12), 0, 3);
        minSpeed = clamp(c.getDouble("carsteer.min-speed", 0.1), 0, 5);
        creepRate = clamp(c.getDouble("carsteer.creep-rate", 40), 0, 200);
        handlingBase = (int) clamp(c.getInt("carsteer.handling-base", 8), 1, 30);
        handlingGrip = clamp(c.getDouble("carsteer.handling-grip", 0.10), 0, 1);
        handlingRmin = clamp(c.getDouble("carsteer.handling-rmin", 0.05), 0, 0.2);
        reverseReal = !"arcade".equalsIgnoreCase(c.getString("carsteer.reverse", "real"));
        velocity = c.getBoolean("carsteer.velocity", true);
        defaultProfile = c.getString("carsteer.default-profile", "sedan");
        profiles.clear();
        // rmin (the tightest circle at a crawl, blocks) and grip (blocks a second^2: how fast the circle widens with speed).
        profiles.put("sedan", new double[] {4.0, 18});
        profiles.put("jeep", new double[] {4.5, 16});
        profiles.put("suv", new double[] {4.5, 15});
        profiles.put("sports", new double[] {4.0, 22});
        profiles.put("hotrod", new double[] {4.5, 19});
        profiles.put("cabrio", new double[] {4.5, 21});
        profiles.put("racecar", new double[] {4.0, 30});
        profiles.put("motor", new double[] {3.0, 24});
        ConfigurationSection ps = c.getConfigurationSection("carsteer.profiles");
        if (ps != null) for (String k : ps.getKeys(false)) {
            double[] p = parsePair(ps.getString(k, ""));
            if (p != null) profiles.put(k.toLowerCase(Locale.ROOT), p);
        }
        families.clear();
        families.put("Sedan", "sedan");
        families.put("Jeep", "jeep");
        families.put("SUV", "suv");
        families.put("Sportief", "sports");
        families.put("Hotrod", "hotrod");
        families.put("SUV Cabrio", "cabrio");
        families.put("Racecar", "racecar");
        families.put("Motor", "motor");
        ConfigurationSection fs = c.getConfigurationSection("carsteer.families");
        if (fs != null) for (String k : fs.getKeys(false)) families.put(k, fs.getString(k, defaultProfile).toLowerCase(Locale.ROOT));
        if (!enabled) restoreAll();
        familyByDamage.clear();
        if (fSpeed != null) loadFamilies();
        for (State st : states.values()) st.damage = Integer.MIN_VALUE; // the profile is looked up again
    }

    private static double[] parsePair(String s) {
        String[] a = s.split("\\|");
        if (a.length != 2) return null;
        try { return new double[] {Double.parseDouble(a[0].trim()), Double.parseDouble(a[1].trim())}; } catch (NumberFormatException e) { return null; }
    }

    private static double clamp(double v, double lo, double hi) { return Math.max(lo, Math.min(hi, v)); }

    /** MTVehicles' data (by reflection, at first use: it may load after this plugin). */
    private boolean ready() {
        if (error != null) return false;
        if (reflTried) return fSpeed != null;
        reflTried = true;
        try {
            Class<?> data = Class.forName("nl.mtvehicles.core.infrastructure.vehicle.VehicleData");
            Field f = data.getField("speed");
            getRot = data.getMethod("getRotationSpeed", String.class);
            setRot = data.getMethod("setRotationSpeed", String.class, Integer.class);
            Class<?> kind = Class.forName("nl.mtvehicles.core.infrastructure.vehicle.VehicleData$DataSpeed");
            getSpeed = data.getMethod("getSpeed", kind, String.class);
            for (Object k : kind.getEnumConstants()) if (((Enum<?>) k).name().equals("MAXSPEED")) maxSpeedKind = k;
            if (maxSpeedKind == null) throw new NoSuchFieldException("DataSpeed.MAXSPEED");
            fSpeed = f;
            loadFamilies();
            return true;
        } catch (ReflectiveOperationException | LinkageError ex) {
            fail("carsteer: MTVehicles' data not found (" + ex + ")");
            return false;
        }
    }

    /** Car item damage -> MTVehicles family, from vehicles.yml (every variant, wraps included). */
    private void loadFamilies() {
        familyByDamage.clear();
        File f = new File(plugin.getDataFolder().getParentFile(), "MTVehicles" + File.separator + "vehicles.yml");
        if (!f.exists()) { plugin.getLogger().warning("carsteer: no MTVehicles/vehicles.yml: every car steers as " + defaultProfile); return; }
        YamlConfiguration y = YamlConfiguration.loadConfiguration(f);
        for (Map<?, ?> fam : y.getMapList("voertuigen")) {
            Object name = fam.get("name");
            if (name == null) continue;
            putDamage(fam.get("itemDamage"), name.toString());
            if (fam.get("cars") instanceof List<?> cars) for (Object o : cars) if (o instanceof Map<?, ?> car) putDamage(car.get("itemDamage"), name.toString());
        }
    }

    private void putDamage(Object d, String family) {
        if (d instanceof Number n) familyByDamage.putIfAbsent(n.intValue(), family);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> speedMap() throws IllegalAccessException {
        return (Map<String, Object>) fSpeed.get(null);
    }

    private static int damageOf(ArmorStand skin) {
        ItemStack h = skin.getEquipment() == null ? null : skin.getEquipment().getHelmet();
        return h != null && h.getItemMeta() instanceof Damageable d ? d.getDamage() : -1;
    }

    /** A driver was just seated (MTVehicles' enterVehicle set the plate's rotation value): take it over at once. */
    void mounted(String plate) {
        if (!enabled || !ready()) return;
        try {
            Object rv = getRot.invoke(null, plate);
            State st = states.computeIfAbsent(plate, k -> new State());
            st.s = 0;
            st.lastX = Double.NaN;
            if (rv instanceof Integer r && r != 0) { st.base = r; setRot.invoke(null, plate, 0); }
        } catch (ReflectiveOperationException | RuntimeException ex) {
            fail("carsteer: off (" + ex + ")");
        }
    }

    /** /dphone carstat's steering while this runs: the base (MTVehicles keeps 0). False when MTVehicles should get it. */
    boolean takeBase(String plate, int turn) {
        if (!enabled || !ready()) return false;
        try {
            State st = states.computeIfAbsent(plate, k -> new State());
            st.base = turn;
            Object rv = getRot.invoke(null, plate);
            if (rv instanceof Integer) setRot.invoke(null, plate, 0);
            return true;
        } catch (ReflectiveOperationException | RuntimeException ex) {
            fail("carsteer: off (" + ex + ")");
            return false;
        }
    }

    /** The steering value /dphone carstat reports (the base while this runs), or null (ask MTVehicles). */
    Integer baseOf(String plate) {
        State st = states.get(plate);
        return enabled && error == null && st != null && st.base > 0 ? st.base : null;
    }

    /** Before CarSmooth reads the car this tick: turns MAIN, SKIN and the seats. */
    void step(String plate, Player driver, ArmorStand main, ArmorStand skin, List<ArmorStand> seats, List<double[]> offs, Snap snap) {
        if (!enabled || !ready()) return;
        try {
            Object sp = speedMap().get(plate);
            Object rv = getRot.invoke(null, plate);
            if (!(sp instanceof Number spd) || !(rv instanceof Integer rot)) return; // right after an entry: next tick
            State st = states.computeIfAbsent(plate, k -> new State());
            if (rot != 0) { st.base = rot; setRot.invoke(null, plate, 0); }
            if (st.base <= 0) st.base = handlingBase;
            int dmg = damageOf(skin);
            if (dmg != st.damage) {
                st.damage = dmg;
                String fam = familyByDamage.get(dmg);
                st.family = fam == null ? "?" : fam;
                String pr = fam == null ? null : families.get(fam);
                st.profile = pr != null && profiles.containsKey(pr) ? pr : defaultProfile;
            }
            double[] prof = profiles.getOrDefault(st.profile, new double[] {4.0, 18});
            double v = spd.doubleValue() * 20;
            Object top = getSpeed.invoke(null, maxSpeedKind, plate);
            double vTop = top instanceof Number t && t.doubleValue() > 0 ? t.doubleValue() * 20 : 13;
            org.bukkit.Input in = driver.getCurrentInput();
            int u = in.isLeft() == in.isRight() ? 0 : in.isLeft() ? 1 : -1;
            int pedal = in.isForward() ? 1 : in.isBackward() ? -1 : 0;
            st.keys = (in.isForward() ? "W" : "") + (in.isBackward() ? "S" : "") + (in.isLeft() ? "A" : "") + (in.isRight() ? "D" : "");
            // The steering eases in toward the key (slower at speed) and back to the middle when it's let go.
            double tIn = steerIn + (steerInTop - steerIn) * Math.min(1, Math.abs(v) / vTop);
            if (u != 0 && (st.s == 0 || Math.signum(st.s) == u)) st.s = toward(st.s, u, tIn <= 0 ? 2 : 1 / (20 * tIn));
            else st.s = toward(st.s, 0, steerOut <= 0 ? 2 : 1 / (20 * steerOut));
            // Stuck against something: moving under a quarter of its speed for 3 ticks, or the nose in a block at a crawl.
            Location m = main.getLocation();
            double moved = Double.isNaN(st.lastX) ? Double.NaN : Math.hypot(m.getX() - st.lastX, m.getZ() - st.lastZ);
            st.lastX = m.getX();
            st.lastZ = m.getZ();
            double speedAbs = Math.abs(spd.doubleValue());
            if (!Double.isNaN(moved) && speedAbs > 0.005 && moved < 0.25 * speedAbs) st.stuckTicks++;
            else st.stuckTicks = 0;
            boolean nose = false;
            Vector dir = m.getDirection().setY(0);
            if (dir.lengthSquared() > 1e-9) {
                // Only a step over half a block: MTVehicles drives up slabs and over carpet and snow layers itself (a slab
                // or carpet road read as a wall at a crawl: review fix, 2026-09-30).
                org.bukkit.block.Block ahead = m.clone().add(dir.normalize().multiply(0.7)).add(0, 0.4, 0).getBlock();
                if (!ahead.isPassable()) {
                    double rise = ahead.getY();
                    for (org.bukkit.util.BoundingBox bb : ahead.getCollisionShape().getBoundingBoxes()) rise = Math.max(rise, ahead.getY() + bb.getMaxY());
                    nose = rise > m.getY() + 0.55;
                }
            }
            st.blocked = st.stuckTicks >= 3 || (nose && Math.abs(v) < 0.5);
            int h = st.base - handlingBase;
            double rmin = prof[0] * Math.max(0.2, 1 - handlingRmin * h);
            double grip = prof[1] * Math.max(0.2, 1 + handlingGrip * h);
            double av = Math.abs(v);
            double radius = rmin + av * av / grip;
            double omega;
            int sgn;
            if (st.blocked && pedal != 0) { omega = creepRate * Math.max(0.2, 1 + handlingGrip * h); sgn = pedal; }
            else if (st.blocked || av < minSpeed) { omega = 0; sgn = 0; }
            else { omega = Math.min(maxRate, rateScale * av / radius * (180 / Math.PI)); sgn = v > 0 ? 1 : -1; }
            if (!reverseReal && sgn != 0) sgn = 1;
            double delta = -st.s * sgn * omega / 20.0;
            st.v = v;
            st.r = radius;
            st.omega = delta * 20;
            if (Math.abs(delta) < 1e-4) return;
            float yaw = (float) (m.getYaw() + delta);
            // A turn swings the seats round MAIN: never into a spot that puts a rider's head in a block (the owner
            // suffocated turning against a pillar, 2026-09-30; the chase view hides the in-wall overlay). A head that's
            // in one already may turn either way (to steer out).
            Location turned = m.clone();
            turned.setYaw(yaw);
            for (int i = 0; i < seats.size() && i < offs.size(); i++) {
                double[] o = offs.get(i);
                if (Double.isNaN(o[0]) || Double.isNaN(o[1]) || Double.isNaN(o[2])) continue;
                ArmorStand seat = seats.get(i);
                for (org.bukkit.entity.Entity rider : seat.getPassengers()) {
                    if (!(rider instanceof org.bukkit.entity.LivingEntity le)) continue;
                    double up = le.getEyeLocation().getY() - seat.getLocation().getY();
                    double[] at = CarSmooth.seatSpot(turned, o[0], o[1], o[2]);
                    if (at == null) continue;
                    double hw = le.getWidth() * 0.4;
                    if (inWall(seat.getWorld(), at[0], at[1] + up, at[2], hw) && !inWall(le.getEyeLocation(), hw)) {
                        st.omega = 0;
                        st.headBlocked++;
                        return;
                    }
                }
            }
            main.setRotation(yaw, m.getPitch());
            skin.setRotation(yaw, skin.getLocation().getPitch());
            if (velocity) {
                // This tick's move (the entity tick, after this) follows the new heading; the vertical part stays.
                Vector vel = main.getVelocity();
                double a = Math.toRadians(delta), c = Math.cos(a), s = Math.sin(a);
                main.setVelocity(new Vector(vel.getX() * c - vel.getZ() * s, vel.getY(), vel.getX() * s + vel.getZ() * c));
            }
            Location nm = main.getLocation();
            for (int i = 0; i < seats.size() && i < offs.size(); i++) {
                double[] o = offs.get(i);
                if (Double.isNaN(o[0]) || Double.isNaN(o[1]) || Double.isNaN(o[2])) continue;
                double[] at = CarSmooth.seatSpot(nm, o[0], o[1], o[2]);
                if (at != null) snap.to(seats.get(i), at[0], at[1], at[2], yaw, nm.getPitch());
            }
        } catch (ReflectiveOperationException | RuntimeException | LinkageError ex) {
            fail("carsteer: off (" + ex + ")");
        }
    }

    /**
     * Vanilla's Entity.isInWall: a box width × 0.8 wide (and 1e-6 high) round the eye, and any block in it that suffocates
     * (the placed block's own state: double slabs, glowstone, ice too; review fix, 2026-09-30: the type's default state
     * missed them) with a collision shape reaching into the box.
     */
    static boolean inWall(org.bukkit.World w, double x, double y, double z, double hw) {
        org.bukkit.util.BoundingBox eye = new org.bukkit.util.BoundingBox(x - hw, y - 1e-6, z - hw, x + hw, y + 1e-6, z + hw);
        for (int bx = (int) Math.floor(x - hw); bx <= (int) Math.floor(x + hw); bx++)
            for (int by = (int) Math.floor(y - 1e-6); by <= (int) Math.floor(y + 1e-6); by++)
                for (int bz = (int) Math.floor(z - hw); bz <= (int) Math.floor(z + hw); bz++) {
                    org.bukkit.block.Block b = w.getBlockAt(bx, by, bz);
                    if (b.isSuffocating() && b.getCollisionShape().overlaps(eye.clone().shift(-bx, -by, -bz))) return true;
                }
        return false;
    }

    static boolean inWall(Location eye, double hw) {
        return inWall(eye.getWorld(), eye.getX(), eye.getY(), eye.getZ(), hw);
    }

    private static double toward(double x, double goal, double step) {
        return x < goal ? Math.min(goal, x + step) : Math.max(goal, x - step);
    }

    /** Cars no longer driven give MTVehicles their rotation value back. */
    void forget(Set<String> driven) {
        states.entrySet().removeIf(en -> {
            if (driven.contains(en.getKey())) return false;
            restore(en.getKey(), en.getValue());
            return true;
        });
    }

    private void restore(String plate, State st) {
        if (setRot == null || st.base <= 0) return;
        try {
            if (getRot.invoke(null, plate) instanceof Integer) setRot.invoke(null, plate, st.base); // never adds an entry
        } catch (ReflectiveOperationException | RuntimeException ignored) { }
    }

    void restoreAll() {
        for (Map.Entry<String, State> en : states.entrySet()) restore(en.getKey(), en.getValue());
        states.clear();
    }

    private void fail(String why) {
        if (error != null) return;
        error = why;
        plugin.getLogger().warning(why + "; steering is MTVehicles' own again");
        restoreAll();
    }

    /** One line for /dphone steer <player|plate>. */
    String status(String plate) {
        State st = states.get(plate);
        Object mtv = "?";
        try { if (getRot != null) mtv = getRot.invoke(null, plate); } catch (ReflectiveOperationException | RuntimeException ignored) { }
        if (st == null) return "CARSTEER " + plate + " none (not driven, or steering off) mtv=" + mtv;
        return String.format(Locale.ROOT, "CARSTEER %s family=%s profile=%s base=%d mtv=%s keys=%s s=%.3f v=%.2f r=%.2f omega=%.2f blocked=%s stuck=%d headblocked=%d",
                plate, st.family, st.profile, st.base, mtv, st.keys.isEmpty() ? "-" : st.keys, st.s, st.v, st.r, st.omega, st.blocked, st.stuckTicks, st.headBlocked);
    }

    String settings() {
        StringBuilder p = new StringBuilder();
        for (Map.Entry<String, double[]> e : profiles.entrySet()) p.append(' ').append(e.getKey()).append('=').append(fmt(e.getValue()[0])).append('|').append(fmt(e.getValue()[1]));
        return String.format(Locale.ROOT, "CARSTEER %s%s rate-scale=%.2f max-rate=%.1f steer-in=%.2f steer-in-top=%.2f steer-out=%.2f min-speed=%.2f creep-rate=%.1f handling-base=%d handling-grip=%.2f handling-rmin=%.2f reverse=%s velocity=%s default-profile=%s profiles:%s",
                enabled ? "on" : "off", error != null ? " error=" + error : "", rateScale, maxRate, steerIn, steerInTop, steerOut, minSpeed, creepRate, handlingBase, handlingGrip,
                handlingRmin, reverseReal ? "real" : "arcade", velocity, defaultProfile, p);
    }

    private static String fmt(double d) { return d == Math.rint(d) ? String.valueOf((long) d) : String.valueOf(d); }

    static final List<String> TUNE_KEYS = List.of("rate-scale", "max-rate", "steer-in", "steer-in-top", "steer-out", "min-speed", "creep-rate",
            "handling-base", "handling-grip", "handling-rmin", "reverse", "velocity", "default-profile");

    /** /dphone steer [on|off] | steer <player|plate> | steer tune <key> <value> | steer profile <p> <rmin> <grip>. */
    boolean command(CommandSender sender, String[] a) {
        if (a.length == 1) { sender.sendMessage(settings()); return true; }
        String sub = a[1].toLowerCase(Locale.ROOT);
        if (a.length == 2 && (sub.equals("on") || sub.equals("off"))) {
            enabled = sub.equals("on");
            if (enabled) { error = null; reflTried = false; } else restoreAll();
            sender.sendMessage(settings() + " (until /dphone reload; keep it in config.yml carsteer.enabled)");
            return true;
        }
        if (sub.equals("tune") && a.length == 4) {
            String k = a[2].toLowerCase(Locale.ROOT), v = a[3];
            try {
                switch (k) {
                    case "rate-scale" -> rateScale = clamp(Double.parseDouble(v), 0.05, 5);
                    case "max-rate" -> maxRate = clamp(Double.parseDouble(v), 5, 400);
                    case "steer-in" -> steerIn = clamp(Double.parseDouble(v), 0, 3);
                    case "steer-in-top" -> steerInTop = clamp(Double.parseDouble(v), 0, 3);
                    case "steer-out" -> steerOut = clamp(Double.parseDouble(v), 0, 3);
                    case "min-speed" -> minSpeed = clamp(Double.parseDouble(v), 0, 5);
                    case "creep-rate" -> creepRate = clamp(Double.parseDouble(v), 0, 200);
                    case "handling-base" -> handlingBase = (int) clamp(Integer.parseInt(v), 1, 30);
                    case "handling-grip" -> handlingGrip = clamp(Double.parseDouble(v), 0, 1);
                    case "handling-rmin" -> handlingRmin = clamp(Double.parseDouble(v), 0, 0.2);
                    case "reverse" -> {
                        if (!v.equalsIgnoreCase("real") && !v.equalsIgnoreCase("arcade")) { sender.sendMessage("CARSTEER tune: reverse is real or arcade"); return true; }
                        reverseReal = v.equalsIgnoreCase("real");
                    }
                    case "velocity" -> velocity = Boolean.parseBoolean(v);
                    case "default-profile" -> {
                        if (!profiles.containsKey(v.toLowerCase(Locale.ROOT))) { sender.sendMessage("CARSTEER tune: no profile " + v); return true; }
                        defaultProfile = v.toLowerCase(Locale.ROOT);
                        for (State st : states.values()) st.damage = Integer.MIN_VALUE;
                    }
                    default -> { sender.sendMessage("CARSTEER tune: unknown key " + k); return true; }
                }
            } catch (NumberFormatException ex) {
                sender.sendMessage("CARSTEER tune: " + k + " needs a number");
                return true;
            }
            sender.sendMessage(settings() + " (until /dphone reload; keep them in config.yml carsteer.*)");
            return true;
        }
        if (sub.equals("profile") && a.length == 5) {
            try {
                profiles.put(a[2].toLowerCase(Locale.ROOT), new double[] {clamp(Double.parseDouble(a[3]), 0.5, 50), clamp(Double.parseDouble(a[4]), 1, 500)});
            } catch (NumberFormatException ex) {
                sender.sendMessage("CARSTEER profile <name> <rmin> <grip>: numbers please");
                return true;
            }
            for (State st : states.values()) st.damage = Integer.MIN_VALUE;
            sender.sendMessage(settings());
            return true;
        }
        if (a.length == 2) {
            Player p = Bukkit.getPlayerExact(a[1]);
            String plate = p != null ? CarSmooth.driverPlate(p) : a[1].toUpperCase(Locale.ROOT);
            sender.sendMessage(plate == null ? "CARSTEER " + a[1] + " isn't driving" : status(plate));
            return true;
        }
        sender.sendMessage("CARSTEER usage: /dphone steer [on|off] | steer <player|plate> | steer tune <key> <value> | steer profile <name> <rmin> <grip>");
        return true;
    }

    List<String> complete(String[] a, List<String> players) {
        List<String> out = new ArrayList<>();
        if (a.length == 2) { out.addAll(List.of("on", "off", "tune", "profile")); out.addAll(players); }
        else if (a.length == 3 && a[1].equalsIgnoreCase("tune")) out.addAll(TUNE_KEYS);
        else if (a.length == 3 && a[1].equalsIgnoreCase("profile")) out.addAll(profiles.keySet());
        else if (a.length == 4 && a[1].equalsIgnoreCase("tune") && a[2].equalsIgnoreCase("reverse")) out.addAll(List.of("real", "arcade"));
        else if (a.length == 4 && a[1].equalsIgnoreCase("tune") && a[2].equalsIgnoreCase("default-profile")) out.addAll(profiles.keySet());
        return out;
    }
}
