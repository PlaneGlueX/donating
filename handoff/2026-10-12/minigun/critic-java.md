<!-- wf_7a4941fe-721 critic:java: an agent's final report, kept for the cloud session -->

JAVA TRACK CRITIC: GunSpin / GunFx / PhonePlugin / plugin\resources\config.yml

**Verdict:** one MUST. As installed, the spin-up does not work: the Hand Minigun becomes a semi-automatic that fires one round per use packet and never spins up. The fix is one line. There are five SHOULDs. The repo files compile cleanly. I did not modify any repo file, the live jar, the server, the bots or the pack.

**Agent skills:** the addyosmani/agent-skills plugin in `.claude\skills` has only its four planning skills, and all are owner-invoked only (`disable-model-invocation: true`). None of them is a review skill. As my review lens I used the planning skill's rule that every task needs a verification step that can fail. The drafter's harness had none for the event path, which is exactly where the bug is.

## MUST

**M1. Setting the event to 0 cancels the burst.**
- WeaponMechanics 4.3.1 defines `WeaponFullAutoEvent.isCancelled()` as `getShotsPerSecond() == 0`, and `setCancelled(true)` sets it to 0 (javap of the real jar).
- `ShootHandler.fullAutoShot` checks `isCancelled()` after `callEvent`, returns false, and falls through to `burstShot` (FN_FAL has no Burst section, so false) and then `singleShot`.
- `GunSpin.onFullAuto` calls `e.setShotsPerSecond(rate(st.s, …))`, which is 0 from cold and for any press below fire-at. The result:
  - One round fires immediately on every use packet. FN_FAL has no Delay_Between_Shots, so that is about 5 rounds a second for a client and 10 for the bots.
  - No FullAutoTask is created, so the next tick sees `t == null`, the spool resets to 0, and the whine and flag-3 clock restart on every packet.
- Spec 5.1's claim "set 0 instead: rate 0 fires nothing" is wrong. It holds for the task (`setRate(0)`), but not for the event.
- Proven by `critic\java\critic-run.txt`, which builds the real event:
  - `setShotsPerSecond(0)` makes `isCancelled()` true; 1 and 16 do not.
  - The modelled installed path fires rounds at ticks 0, 4, 8, … and the spool never moves.
- **Fix, in `GunSpin.onFullAuto`:**
  ```java
  e.setShotsPerSecond(Math.max(1, rate(st.s, g.spin(), st.max))); // 0 would cancel it
  ```
  The task starts at rate 1. GunSpin's tick sets it to 0 before the task's first run. I confirmed that order in the Paper 26.1.2 bytecode: `MinecraftServer.tickChildren` calls `CraftScheduler.mainThreadHeartbeat` at offset 28, then `EntityScheduler.executeTick` at offset 81. MechanicsCore uses the entity scheduler on Paper because `isOwnedByCurrentRegion` exists.
- That order now matters: `AUTO[r][0]` is 1 for every r ≥ 1, so a task that ran first would fire one stray round on tick 1. Say so in the class Javadoc and replace the wrong "Never cancel the event … Rate 0" paragraph. The patched text is in `GunSpin.patch`.
- Re-simulated with the fix: first round on tick 8 from cold; 6/22/38 rounds in 1/2/3 s; re-press at s 0.67 fires on tick 1; s 0.20 first fires on tick 4 (all in `critic-run-patched.txt`).
- **The harness must be able to catch this.** Add a check that the real event with 0 reports `isCancelled() == true`. Make `sim()` start the task from the event's value (`max(1, r)`) instead of from the first tick. Today `sim()` begins after the event, so it passed 39/39 with the bug in place.
- gunfx.js's first spin check (`earlyAmmo === 100`, `early.held`, `early.rate === 0`) would fail on the installed code, so the bot test can catch it.
- Docs (orchestrator / CLAUDE.md): record that `WeaponFullAutoEvent.isCancelled()` means `shotsPerSecond == 0`.

## SHOULD (exact code in `critic\java\GunSpin.patch` and `GunFx.patch`; the patched sources compile with the same 26 warnings, none in our files)

**S1. Spin-down clock length (drafter's open question 2).**
- The pack turns the barrels a fixed 450°, starting at 900/L° a tick. The current `L = round(s·30)` starts a tap at s 0.33 at 90°/tick, s 0.5 at 60°/tick, and s 0.04 at 900°/tick (a 1-tick clock). Anything past 45°/tick looks like the barrels are turning backwards.
- A spin-up from cold leaves the barrels at 30·s°/tick. Use:
  ```java
  static int downTicks(double s, int down) { return (int) Math.min(2L * down, Math.max(1, Math.round(down / Math.max(s, 1e-3)))); }
  ```
  This gives s 1 → 30 ticks at 30°/tick; s 0.8 → 38 at 23.7; s 0.67 → 45 at 20; s ≤ 0.5 → 60 at 15. It never exceeds 45°/tick, and the gunfx.js range of 25-30 at full spin still holds.
- In `release()`, below fire-at: no spin-down clock or sound. Call `fx.clock(p, title, 0)` and return; the barrels were turning 9°/tick or less.
- No interface change and no pack change. The drafter's harness checks "downTicks from half = 15", "never under 1 (== 1)" and "clock and spool within a tick" encode the old curve and need replacing (`drafter-harness-on-patched.txt`).

**S2. No spin-up whine at s ≥ fire-at.**
- The 1.2 s whine rises from a standstill (from pitch 0.85 it lasts 1.41 s). Replaying it on every re-press past fire-at stutters during tap-fire and after any >215 ms packet gap.
- Move `playSound(SOUND_UP …)` inside the `s < fireAt` branch, consistent with the deviation that already skips the spin-up clock there. Keep `stopNear(SOUND_DOWN)` before the branch.

**S3. Gameplay should not depend on an animation switch.**
- Today `gunfx.enabled: false` also turns the spin-up off, so the minigun fires 16/s instantly from cold, a silent buff.
- Remove `!fx.enabled()` from `onFullAuto`'s gate and from `tick()`'s shutdown check.
- Add `if (!enabled) return;` at the top of `GunFx.flagClock`, and `!enabled ||` to `onEquip`'s first return. This is also a pre-existing bug: with gunfx disabled, `onEquip` sets flag 2 on Classic Pistol, Shotgun and other shot-clock guns, and nothing ever clears it.
- Fix the config.yml comment ("enabled: false only takes the frames away; the spin-up stays").

**S4. Give an orphaned burst back its file rate.**
- When GunSpin stops steering a held burst (`fail()`, `shutdown()` on plugin disable, or a `/dphone` reload that removes `spin`), the task keeps its last rate. From cold that is 0 rounds until release.
- Add a `fileRate(p, st)` helper: `t.setRate(max % 20); t.setPerShot(max / 20)`, wrapped in try/catch. Call it in `shutdown()` and on the tick's spin-removed path.

**S5. Two-player sound cross-talk.** `stopSound` works by name, so one gunner's release silences another's whine for everyone in range, including that gunner. Keep this documented. The current sound range (32) covers every listener who can still hear it: the spin sounds have no attenuation_distance in the pack, so a client hears them out to 16 blocks.

## Checked and fine
- Every WeaponMechanics call exists in 4.3.1: `isMainHand`, `getShooter`, `get/setShotsPerSecond`, `getPlayerWrapper(Player)`, `getMainHandData`, `HandData.getFullAutoTask` / `isReloading`, `FullAutoTask.setRate` (range 0-20; `r % 20` stays inside it) and `setPerShot` (≥ 0).
- When a burst ends, the task calls `setFullAutoTask(null, null)`, so release is detected.
- `consumeAmmo(stack, 0)` returns true while rounds are left and false at 0, so an empty magazine still reloads.
- WeaponMechanics' `WeaponListeners.itemHeld` cancels hand tasks on a slot swap; GunSpin drops its state with the clock ended.
- Reload mid-spin: GunFx's MONITOR handler (registered first) starts the 90-tick clock, then GunSpin drops the state without ending it.
- Death, world change, quit and plugin disable all clean up.
- Threading: everything runs on the main thread, and there is no concurrent modification inside `tick()`.
- Without WeaponMechanics, GunSpin is never loaded, and `/dphone gunfx spin` answers "GUNSPIN off".
- Flag order is right: the other spin flag is cleared before each clock, and draw flag 2 is cleared on a burst.
- Both config files parse with `Spin.read` to 24/30/0.3/5 with sound range 32. The live `server\plugins\DonatingPhone\config.yml` already has the FN_FAL line.
- The status and GUNSPIN formats match gunfx.js's regexes.
- Not a java file: FN_FAL.yml line 69 ("a burst started then fires at once") is only true while s ≥ 0.3, about 1.05 s after full spin. FN_FAL.yml also keeps an Off_Hand shoot trigger, which GunSpin ignores (an off-hand minigun fires at 16/s instantly; the offhand is the bag, so only bypass staff could hit this).

Files are in `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\critic\java\`:
- `critic-run.txt`
- `critic-run-patched.txt`
- `drafter-harness-on-patched.txt`
- `GunSpin.patch`
- `GunFx.patch`
- `src\dev\donating\phone\GunSpin.java` (patched copy)
- `src\dev\donating\phone\GunFx.java` (patched copy)
- `harness\dev\donating\phone\CriticSpin.java`
- `ShootHandler.txt`
