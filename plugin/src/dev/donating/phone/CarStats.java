package dev.donating.phone;

import java.lang.reflect.Method;

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

    CarStats() {
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
    }

    /** "CARSTAT <plate> max=.. accel=.. turn=.." (what MTVehicles uses for it now), or why not. */
    String get(String plate) {
        if (error != null) return "CARSTAT off: " + error;
        try {
            return "CARSTAT " + plate + " max=" + getSpeed.invoke(null, maxSpeed, plate) + " accel=" + getSpeed.invoke(null, acceleration, plate)
                    + " turn=" + getRotation.invoke(null, plate);
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
            setRotation.invoke(null, plate, turn);
            return get(plate);
        } catch (ReflectiveOperationException ex) {
            return "CARSTAT failed: " + ex;
        }
    }
}
