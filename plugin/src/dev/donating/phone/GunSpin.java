package dev.donating.phone;

import me.deecaad.weaponmechanics.WeaponMechanics;
import me.deecaad.weaponmechanics.weapon.shoot.FullAutoTask;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponFullAutoEvent;
import me.deecaad.weaponmechanics.weapon.weaponevents.WeaponReloadEvent;
import me.deecaad.weaponmechanics.wrappers.HandData;
import org.bukkit.Bukkit;
import org.bukkit.SoundCategory;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.player.PlayerChangedWorldEvent;
import org.bukkit.event.player.PlayerItemHeldEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.scheduler.BukkitTask;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * The Hand Minigun's spin-up (2026-10-12; the owner: "a spin-up minigun at level 125"). WeaponMechanics 4.3.1 has no
 * spin-up setting, but its full-auto task's rate can be changed every tick (bytecode: ShootHandler.fullAutoShot fires
 * WeaponFullAutoEvent with the file's shots a second, builds a FullAutoTask from the event's number and runs it every
 * tick; each tick it fires perShot + AUTO[rate][tick] rounds, and setRate / setPerShot change that live). So every burst
 * starts at 0 rounds a second and the spool s (0 still, 1 full spin) climbs by 1/up a tick while the trigger is held:
 * no rounds below fire-at, then from min-rate up to the file's rate. After the trigger lets go s falls by 1/down a tick,
 * so pressing again soon fires at once.
 *
 * Never give the event 0 rounds a second: WeaponFullAutoEvent.isCancelled() is getShotsPerSecond() == 0 (bytecode), and
 * a cancelled burst falls through to burstShot and singleShot (a round at once on every use packet: a 5-a-second
 * semi-automatic that never spins up). So a burst starts at 1 a second at least (startRate), and this class's tick sets
 * the task to the spool's rate (0 from cold) before its first run. Rate 0 fires nothing (AUTO[0] is all zeros) and uses
 * no ammo, so the task just idles while the trigger is held.
 *
 * The order in a tick (Paper 26.1.2 bytecode): the use packet that fires the event is handled before tickChildren
 * (MinecraftServer's PacketProcessor: between ticks or at the tick's start); in tickChildren the Bukkit scheduler runs
 * before the entity schedulers, and MechanicsCore runs the FullAutoTask on Paper's entity scheduler from the next tick
 * (its Folia path: Server#isOwnedByCurrentRegion exists on Paper). So this tick sets the rate before the task fires in
 * that tick, its first included (AUTO[r][0] is a round for every r >= 1: a task run first would fire one at the start's
 * 1 a second), and a task that ended on letting go is gone by the next one.
 *
 * The frames: the spin-up and spin-down are GunFx clocks with custom_model_data flags 3 and 4 (the pack turns the
 * barrels by the cooldown); past fire-at the rounds' firing flag (0) draws the flash. A spin-up clock only starts under
 * fire-at; the spin-down's is the barrels' coast, only from fire-at (see downTicks). Sounds (on the player, so everyone
 * tracking them gets them): the spin-up whine with each spin-up clock (stopped on letting go for everyone within
 * sound-range: a sound stops by its name, so another spin gun's whine there stops too), the spin-down with each
 * spin-down clock at volume s, pitched to start on the whine's note at s.
 *
 * Config gunfx.guns.<title>.spin: up, down (ticks from still to full spin and back), fire-at (the spool at which rounds
 * start), min-rate (rounds a second there), sound-range (blocks). gunfx.enabled false only takes the frames away (the
 * flags and clocks): the spin-up is gameplay and stays. Anything WeaponMechanics no longer has turns it off (logged
 * once): the gun then fires at its file's rate from the first tick.
 */
final class GunSpin implements Listener {
    /** A spin gun's settings (gunfx.guns.<title>.spin); null when the gun has none. */
    record Spin(int up, int down, double fireAt, int minRate, double soundRange) {
        static Spin read(ConfigurationSection s) {
            if (s == null) return null;
            return new Spin(Math.max(1, s.getInt("up", 24)), Math.max(1, s.getInt("down", 30)), Math.min(1, Math.max(0, s.getDouble("fire-at", 0.3))),
                Math.max(0, s.getInt("min-rate", 5)), Math.max(0, s.getDouble("sound-range", 32)));
        }

        @Override public String toString() { return up + "/" + down + "/" + num(fireAt) + "/" + minRate; } // GunFx's status
    }

    // The spin sounds (the pack's sounds.json; the others are WeaponMechanics').
    static final String SOUND_UP = "donating.gun.minigun.spinup";
    static final String SOUND_DOWN = "donating.gun.minigun.spindown";

    private static final class State {
        final String title;
        double s;     // the spool: 0 still, 1 full spin
        boolean held; // a burst is on (WeaponMechanics' full-auto task runs)
        int max;      // the file's rounds a second (the event's)
        State(String title) { this.title = title; }
    }

    private final PhonePlugin plugin;
    private final GunFx fx;
    // Only players whose spin gun is held and spinning (or spooling down).
    private final Map<UUID, State> states = new HashMap<>();
    private BukkitTask task;
    private String off; // why the spin-up is off for good (null: on)

    GunSpin(PhonePlugin plugin, GunFx fx) {
        this.plugin = plugin;
        this.fx = fx;
        off = probe();
        if (off != null) plugin.getLogger().warning("gunspin: off (" + off + "): spin guns fire at their file's rate");
    }

    /**
     * Every WeaponMechanics method the spin-up needs, checked once (a missing one would leave a burst at 0 rounds a
     * second); null when they're all there, else what's missing.
     */
    static String probe() {
        try {
            FullAutoTask.class.getMethod("setRate", int.class);
            FullAutoTask.class.getMethod("setPerShot", int.class);
            HandData.class.getMethod("getFullAutoTask");
            HandData.class.getMethod("isReloading");
            WeaponFullAutoEvent.class.getMethod("getShotsPerSecond");
            WeaponFullAutoEvent.class.getMethod("setShotsPerSecond", int.class);
            return null;
        } catch (NoSuchMethodException | LinkageError ex) {
            return "WeaponMechanics has no " + ex.getMessage();
        }
    }

    // ---------- The numbers (static: tools for the harness) ----------

    /** Rounds a second at spool s: 0 below fire-at, then min-rate up to max at full spin. */
    static int rate(double s, Spin c, int max) {
        if (max <= 0 || s < c.fireAt - 1e-9) return 0;
        int lo = Math.min(c.minRate, max);
        if (c.fireAt >= 1) return max;
        double k = Math.min(1, Math.max(0, (s - c.fireAt) / (1 - c.fireAt)));
        return (int) Math.round(lo + (max - lo) * k);
    }

    /** The event's rounds a second for a burst starting at spool s: never 0 (that cancels it); the tick sets the real one. */
    static int startRate(double s, Spin c, int max) { return Math.max(1, rate(s, c, max)); }

    /** The spool after a tick held, and after a tick let go (snapped at the ends: 24 steps of 1/24 add up to 0.999...). */
    static double spinUp(double s, int up) { double n = s + 1.0 / up; return n >= 1 - 1e-9 ? 1 : n; }
    static double spinDown(double s, int down) { double n = s - 1.0 / down; return n <= 1e-9 ? 0 : n; }

    /** The spin-up clock from spool s (ticks to full spin; only started under fire-at). */
    static int upTicks(double s, int up) { return (int) Math.max(1, Math.round((1 - s) * up)); }

    // The spin-down clock is the barrels' coast, not the spool's: the pack turns them a fixed 360 (2p - p^2) degrees
    // over it (a whole turn: the model's light is painted from above, so only that ends on the rest pose), reading only
    // the cooldown's fraction, so it starts at 720 / L degrees a tick. L = down / s makes that 24 s (s 1: 30 ticks at 24
    // degrees; s 0.67: 45 at 16), near the 30 s a spin-up leaves them at (720 / 24 x s), and at most 2 x down (60 ticks
    // at 12 degrees from s 0.5 down to fire-at); s x down would start a short tap at 48-80 degrees a tick, past the 45 at
    // which a cluster that repeats every 90 degrees reads as turning backwards. So it outlasts the spool from under s 1.
    static int downTicks(double s, int down) { return (int) Math.min(2L * down, Math.max(1, Math.round(down / Math.max(s, 1e-3)))); }

    // The sounds' pitch (tools\sounds\guns\minigun.js): the whine is made for 0.85 from cold, and the spin-down starts on
    // the whine's note at spin s when played at 0.4 + 0.6 s (0.58 from fire-at 0.3: over the client's 0.5 floor).
    static double upPitch(double s) { return 0.85 + 0.3 * s; }
    static double downPitch(double s) { return 0.4 + 0.6 * s; }

    private static String num(double d) { return d == Math.rint(d) ? String.valueOf((long) d) : String.valueOf(d); }

    // ---------- Events ----------

    // A burst starts: its first rate from the spool, the spin-up clock and its whine.
    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onFullAuto(WeaponFullAutoEvent e) {
        if (off != null || !e.isMainHand() || !(e.getShooter() instanceof Player p)) return;
        GunFx.Gun g = fx.gun(e.getWeaponTitle());
        if (g == null || g.spin() == null) return;
        State st = states.get(p.getUniqueId());
        if (st == null || !st.title.equals(e.getWeaponTitle())) states.put(p.getUniqueId(), st = new State(e.getWeaponTitle()));
        try {
            st.max = e.getShotsPerSecond();
            e.setShotsPerSecond(startRate(st.s, g.spin(), st.max));
        } catch (RuntimeException | LinkageError ex) {
            fail(ex);
            return; // the file's rate
        }
        if (task == null) task = plugin.getServer().getScheduler().runTaskTimer(plugin, this::tick, 1L, 1L);
        // A burst that took over from one this never saw end (WeaponMechanics let go and the next click came before this
        // tick ran): still the same hold, so its clock and whine go on.
        if (st.held) return;
        st.held = true;
        ItemStack held = p.getInventory().getItemInMainHand();
        // Still coasting from the last burst (flag 4) but under fire-at: the coast goes on (a spin-up clock starts its
        // drawing at 0 degrees, a visible snap) until the first round hands over to the blur (GunFx.onShot).
        boolean coasting = st.s < g.spin().fireAt() && GunFx.flagged(held, GunFx.SPIN_DOWN);
        // The old spin flag (and a draw's) off before the new clock: flagClock only takes the last clock's flag off on its
        // next tick, and for that tick the pack would draw the old one.
        if (!coasting) GunFx.flag(held, GunFx.SPIN_DOWN, false);
        GunFx.flag(held, GunFx.DRAW, false);
        stopNear(p, g.spin(), SOUND_DOWN);
        if (st.s < g.spin().fireAt()) {
            if (!coasting) fx.flagClock(p, st.title, g, upTicks(st.s, g.spin().up()), GunFx.SPIN_UP);
            p.getWorld().playSound(p, SOUND_UP, SoundCategory.PLAYERS, 1f, (float) upPitch(st.s));
        }
        // Spinning fast enough to fire already (pressed again soon after letting go): no spin-up clock, the spin-down's
        // ends; the rounds go out in the next tick and their firing flag draws the full spin. The pack's spin-up turns the
        // barrels 360 p^2 degrees over the clock, so a short one ends too fast: from s 0.67 (8 ticks) 90 degrees a tick,
        // which reads as turning backwards (below fire-at the clock is 17 ticks or more, and the pack draws only its
        // slow part, p < 0.55: 23 degrees a tick at most). No whine either: it
        // rises from a standstill over 1.2 s, and tapping the trigger restarted it on every tap.
        else fx.clock(p, st.title, 0);
    }

    // A reload that really starts (WeaponMechanics fires the event before it checks the ammo: GunFx.reloadStarts):
    // the barrels stop; GunFx's own handler starts the reload clock, which ends the spin's.
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onReload(WeaponReloadEvent e) {
        if (!(e.getShooter() instanceof Player p) || !states.containsKey(p.getUniqueId()) || !fx.reloadStarts(e)) return;
        drop(p, false);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onHeld(PlayerItemHeldEvent e) { drop(e.getPlayer(), true); }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onDeath(PlayerDeathEvent e) { drop(e.getPlayer(), true); }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onWorld(PlayerChangedWorldEvent e) { drop(e.getPlayer(), true); }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) { drop(e.getPlayer(), false); } // GunFx takes every flag off a quitting player

    // ---------- The tick ----------

    private void tick() {
        if (off != null) { shutdown(); return; }
        for (Iterator<Map.Entry<UUID, State>> it = states.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<UUID, State> en = it.next();
            State st = en.getValue();
            Player p = plugin.getServer().getPlayer(en.getKey());
            GunFx.Gun g = fx.gun(st.title);
            // Gone, or a /dphone reload took the spin away (the running clock takes its flag off when it ends; a burst
            // held now goes on at the file's rate).
            if (p == null || g == null || g.spin() == null) { it.remove(); if (p != null) fileRate(p, st); continue; }
            if (!st.title.equals(fx.title(p.getInventory().getItemInMainHand()))) { // the gun left the hand some other way
                it.remove();
                stop(p, st, g, true);
                continue;
            }
            FullAutoTask t;
            boolean reloading;
            try {
                HandData h = WeaponMechanics.getInstance().getPlayerWrapper(p).getMainHandData();
                t = h.getFullAutoTask();
                reloading = h.isReloading();
                if (st.held && t != null && !reloading) { // only a burst this saw start
                    st.s = spinUp(st.s, g.spin().up());
                    int r = rate(st.s, g.spin(), st.max);
                    t.setRate(r % 20);
                    t.setPerShot(r / 20);
                    continue;
                }
            } catch (RuntimeException | LinkageError ex) {
                fail(ex);
                return;
            }
            if (st.held) { // let go (WeaponMechanics ends the task about 4 ticks after the last right-click), or sprinting
                st.held = false;
                if (reloading || st.s <= 0) { it.remove(); stop(p, st, g, false); continue; }
                release(p, st, g);
            } else {
                st.s = spinDown(st.s, g.spin().down());
                if (st.s <= 0) it.remove(); // the spin-down clock runs out by itself (the coast outlasts the spool)
            }
        }
        if (states.isEmpty() && task != null) { task.cancel(); task = null; }
    }

    // The trigger let go: the whine stops, flag 3 off; from fire-at the spin-down plays with its clock (flag 4).
    private void release(Player p, State st, GunFx.Gun g) {
        stopNear(p, g.spin(), SOUND_UP);
        GunFx.flag(p.getInventory().getItemInMainHand(), GunFx.SPIN_UP, false);
        // Under fire-at the barrels turn 9 degrees a tick or less: they just stop (the spin-down coasts a fixed 360
        // degrees, far too much after a tap: the model snaps back to rest from about 31 degrees at most); the spool
        // still falls, so pressing again soon picks up where it was. A tap during a coast leaves the coast running.
        if (st.s < g.spin().fireAt()) { if (!GunFx.flagged(p.getInventory().getItemInMainHand(), GunFx.SPIN_DOWN)) fx.clock(p, st.title, 0); return; }
        p.getWorld().playSound(p, SOUND_DOWN, SoundCategory.PLAYERS, (float) st.s, (float) downPitch(st.s));
        fx.flagClock(p, st.title, g, downTicks(st.s, g.spin().down()), GunFx.SPIN_DOWN);
    }

    /** Stops a player's spin at once (a reload, a slot change, death, quit, a world change). */
    private void drop(Player p, boolean endClock) {
        State st = states.remove(p.getUniqueId());
        if (st == null) return;
        GunFx.Gun g = fx.gun(st.title);
        if (g != null && g.spin() != null) stop(p, st, g, endClock);
        if (states.isEmpty() && task != null) { task.cancel(); task = null; }
    }

    // The sounds stopped, the spin flags off; endClock: the running spin clock too (not for a reload, whose clock GunFx
    // has just started).
    private void stop(Player p, State st, GunFx.Gun g, boolean endClock) {
        stopNear(p, g.spin(), SOUND_UP);
        stopNear(p, g.spin(), SOUND_DOWN);
        fx.unflag(p, st.title, GunFx.SPIN_UP);
        fx.unflag(p, st.title, GunFx.SPIN_DOWN);
        if (endClock && p.isOnline()) fx.clock(p, st.title, 0);
    }

    // A sound stops by its name for each listener: another spin gun's within range stops too (one whine at most). An
    // entity's sound goes to everyone tracking it (up to 128 blocks), but at volume 1 a client hears it within the
    // sound's attenuation_distance (16 unless sounds.json says more); 32 also covers walking in during the 1.4 s whine.
    private static void stopNear(Player p, Spin c, String sound) {
        double r2 = c.soundRange() * c.soundRange();
        for (Player o : p.getWorld().getPlayers()) if (o.getLocation().distanceSquared(p.getLocation()) <= r2) o.stopSound(sound, SoundCategory.PLAYERS);
    }

    // A burst this stops steering (the spin-up off, the plugin disabled, the spin taken out of the config) goes on at
    // the file's rate, not the last spool's (from cold that's 0 until the trigger lets go).
    private static void fileRate(Player p, State st) {
        if (!st.held || st.max <= 0) return;
        try {
            FullAutoTask t = WeaponMechanics.getInstance().getPlayerWrapper(p).getMainHandData().getFullAutoTask();
            if (t != null) { t.setRate(st.max % 20); t.setPerShot(st.max / 20); }
        } catch (RuntimeException | LinkageError ignored) {
        }
    }

    // Something WeaponMechanics no longer has (or throws): the spin-up off for good. A burst running now goes on at the
    // file's rate if WeaponMechanics still lets it, and so does the next press.
    private void fail(Throwable ex) {
        if (off == null) {
            off = ex.getClass().getSimpleName() + ": " + ex.getMessage();
            plugin.getLogger().warning("gunspin: off (" + off + "): spin guns fire at their file's rate");
        }
        shutdown();
    }

    /** Plugin disable (and the spin-up turned off): every spin stops, no flag stays, a held burst at the file's rate. */
    void shutdown() {
        for (Map.Entry<UUID, State> en : states.entrySet()) {
            Player p = plugin.getServer().getPlayer(en.getKey());
            GunFx.Gun g = fx.gun(en.getValue().title);
            if (p == null) continue;
            fileRate(p, en.getValue());
            if (g != null && g.spin() != null) stop(p, en.getValue(), g, false);
        }
        states.clear();
        if (task != null) { task.cancel(); task = null; }
    }

    /** GunFx's status: whether the spin-up works and who's spinning. */
    String summary() { return "spinup=" + (off == null ? "on" : "off") + " spinning=" + states.size(); }

    /** /dphone gunfx spin <player>: one line for tests. */
    boolean command(CommandSender sender, String[] args) {
        if (args.length < 3) { sender.sendMessage("GUNSPIN usage: /dphone gunfx spin <player>"); return true; }
        Player p = Bukkit.getPlayerExact(args[2]);
        if (p == null) { sender.sendMessage("GUNSPIN " + args[2] + ": not online"); return true; }
        State st = states.get(p.getUniqueId());
        GunFx.Gun g = st == null ? null : fx.gun(st.title);
        if (st == null || g == null || g.spin() == null) { sender.sendMessage("GUNSPIN " + p.getName() + " none" + (off != null ? " (off: " + off + ")" : "")); return true; }
        sender.sendMessage("GUNSPIN " + p.getName() + " s=" + String.format(Locale.ROOT, "%.2f", st.s) + " held=" + st.held
            + " rate=" + (st.held ? rate(st.s, g.spin(), st.max) : 0) + " max=" + st.max);
        return true;
    }
}
