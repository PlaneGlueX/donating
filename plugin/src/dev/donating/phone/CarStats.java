package dev.donating.phone;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Locale;
import java.util.Map;

/**
 * Car mods (garage.sk, owner 2026-09-28: hardware upgrades): sets one car's top speed, acceleration and steering in
 * MTVehicles while it's driven. MTVehicles copies a car's stats from its data into memory maps each time someone gets in
 * (VehicleUtils.enterVehicle -> VehicleData.setSpeed / setRotationSpeed, checked in its 2.5.9 bytecode), so garage.sk
 * calls this a moment after the driver is seated, with the finished numbers. Reached by reflection: without MTVehicles
 * the phone plugin still loads and this just says so.
 */
final class CarStats {
    private Method setSpeed;
    private Method getSpeed;
    private Method setRotation;
    private Method getRotation;
    private Object maxSpeed;
    private Object acceleration;
    private String error;
    /** While CarSteer steers (2026-09-30), the steering number is its handling base and MTVehicles' own stays 0. */
    private final CarSteer steer;
    // Fuel (fuel.sk, 2026-10-21; town PLAN 15.2): MTVehicles keeps a car's level (0..100), its usage a pedal tick and its
    // on/off switch in vehicleData (ConfigModule.vehicleDataConfig, memory, saved to disk now and then), and copies the
    // level and the usage into VehicleData.fuel / fuelUsage when someone gets in (VehicleUtils.enterVehicle); its
    // movement takes the usage from the map each tick the pedal is held, and the level goes back into vehicleData when
    // the car is despawned. So a change goes into both: the data always, the maps when the plate is in them.
    private Field fuelMap;
    private Field usageMap;
    private Field dataConfig;
    private Method cfgGet;
    private Method cfgSet;
    private Object optEnabled;
    private Object optFuel;
    private Object optUsage;
    private String fuelError;

    CarStats(CarSteer steer) {
        this.steer = steer;
        try {
            Class<?> data = Class.forName("nl.mtvehicles.core.infrastructure.vehicle.VehicleData");
            Class<?> kind = Class.forName("nl.mtvehicles.core.infrastructure.vehicle.VehicleData$DataSpeed");
            setSpeed = data.getMethod("setSpeed", kind, String.class, Double.class);
            getSpeed = data.getMethod("getSpeed", kind, String.class);
            setRotation = data.getMethod("setRotationSpeed", String.class, Integer.class);
            getRotation = data.getMethod("getRotationSpeed", String.class);
            for (Object k : kind.getEnumConstants()) {
                String n = ((Enum<?>) k).name();
                if (n.equals("MAXSPEED")) maxSpeed = k;
                if (n.equals("ACCELERATION")) acceleration = k;
            }
            if (maxSpeed == null || acceleration == null) error = "MTVehicles' speed kinds changed";
        } catch (ReflectiveOperationException | LinkageError ex) {
            error = "MTVehicles not found (" + ex.getClass().getSimpleName() + ")";
        }
        try {
            Class<?> data = Class.forName("nl.mtvehicles.core.infrastructure.vehicle.VehicleData");
            fuelMap = data.getField("fuel");
            usageMap = data.getField("fuelUsage");
            dataConfig = Class.forName("nl.mtvehicles.core.infrastructure.modules.ConfigModule").getField("vehicleDataConfig");
            Class<?> cfg = Class.forName("nl.mtvehicles.core.infrastructure.dataconfig.VehicleDataConfig");
            Class<?> opt = Class.forName("nl.mtvehicles.core.infrastructure.dataconfig.VehicleDataConfig$Option");
            cfgGet = cfg.getMethod("get", String.class, opt);
            cfgSet = cfg.getMethod("set", String.class, opt, Object.class);
            for (Object k : opt.getEnumConstants()) {
                switch (((Enum<?>) k).name()) {
                    case "FUEL_ENABLED" -> optEnabled = k;
                    case "FUEL" -> optFuel = k;
                    case "FUEL_USAGE" -> optUsage = k;
                    default -> { }
                }
            }
            if (optEnabled == null || optFuel == null || optUsage == null) fuelError = "MTVehicles' fuel options changed";
        } catch (ReflectiveOperationException | LinkageError ex) {
            fuelError = "MTVehicles not found (" + ex.getClass().getSimpleName() + ")";
        }
    }

    private static double num(Object o) {
        if (o instanceof Number n) return n.doubleValue();
        try { return o == null ? Double.NaN : Double.parseDouble(o.toString()); } catch (NumberFormatException ex) { return Double.NaN; }
    }

    /** The last answer of {@link #fuel}: "plate|level|usage|enabled|driven", "" when the plate is unknown or fuel is off. */
    String lastFuel = "";

    /**
     * A car's fuel: sets what's given (level 0..100, add = percent points, usage a pedal tick 0..1, enabled), then answers
     * "CARFUEL <plate> level=.. usage=.. enabled=.. driven=..". Values go in as doubles: MTVehicles casts them back with
     * (double) and an Integer would throw there.
     */
    @SuppressWarnings("unchecked")
    String fuel(String plate, Double level, Double add, Double usage, Boolean enabled) {
        lastFuel = "";
        if (fuelError != null) return "CARFUEL off: " + fuelError;
        try {
            Object cfg = dataConfig.get(null);
            Map<String, Double> fuel = (Map<String, Double>) fuelMap.get(null);
            Map<String, Double> use = (Map<String, Double>) usageMap.get(null);
            if (cfgGet.invoke(cfg, plate, optFuel) == null && cfgGet.invoke(cfg, plate, optEnabled) == null) return "CARFUEL " + plate + " unknown";
            double now = fuel.containsKey(plate) ? fuel.get(plate) : num(cfgGet.invoke(cfg, plate, optFuel));
            if (Double.isNaN(now)) now = 100.0;
            if (level != null || add != null) {
                double l = Math.max(0.0, Math.min(100.0, level != null ? level : now + add));
                cfgSet.invoke(cfg, plate, optFuel, l);
                if (fuel.containsKey(plate)) fuel.put(plate, l);
                now = l;
            }
            if (usage != null) {
                double u = Math.max(0.0, Math.min(1.0, usage));
                cfgSet.invoke(cfg, plate, optUsage, u);
                if (use.containsKey(plate)) use.put(plate, u);
            }
            if (enabled != null) cfgSet.invoke(cfg, plate, optEnabled, enabled);
            double u = use.containsKey(plate) ? use.get(plate) : num(cfgGet.invoke(cfg, plate, optUsage));
            Object on = cfgGet.invoke(cfg, plate, optEnabled);
            boolean driven = fuel.containsKey(plate);
            lastFuel = plate + "|" + String.format(Locale.ROOT, "%.3f", now) + "|" + String.format(Locale.ROOT, "%.5f", u) + "|" + Boolean.TRUE.equals(on) + "|" + driven;
            return "CARFUEL " + plate + " level=" + String.format(Locale.ROOT, "%.2f", now) + " usage=" + String.format(Locale.ROOT, "%.5f", u)
                    + " enabled=" + Boolean.TRUE.equals(on) + " driven=" + driven;
        } catch (ReflectiveOperationException | ClassCastException ex) {
            return "CARFUEL failed: " + ex;
        }
    }

    /** "CARSTAT <plate> max=.. accel=.. turn=.." (what MTVehicles uses for it now), or why not. */
    String get(String plate) {
        if (error != null) return "CARSTAT off: " + error;
        try {
            Integer base = steer == null ? null : steer.baseOf(plate);
            return "CARSTAT " + plate + " max=" + getSpeed.invoke(null, maxSpeed, plate) + " accel=" + getSpeed.invoke(null, acceleration, plate)
                    + " turn=" + (base != null ? base + " (carsteer)" : getRotation.invoke(null, plate));
        } catch (ReflectiveOperationException ex) {
            return "CARSTAT failed: " + ex;
        }
    }

    /** Sets the three numbers for that plate until the next time someone gets in. */
    String set(String plate, double max, double accel, int turn) {
        if (error != null) return "CARSTAT off: " + error;
        if (!(max > 0 && max < 5 && accel > 0 && accel < 1 && turn > 0 && turn < 60)) return "CARSTAT refused: out of range";
        try {
            setSpeed.invoke(null, maxSpeed, plate, max);
            setSpeed.invoke(null, acceleration, plate, accel);
            if (steer == null || !steer.takeBase(plate, turn)) setRotation.invoke(null, plate, turn);
            return get(plate);
        } catch (ReflectiveOperationException ex) {
            return "CARSTAT failed: " + ex;
        }
    }
}
