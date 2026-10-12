# GunSpin vs WeaponMechanics 4.3.1: source review (cloud, 2026-10-12)

Read against WeaponMechanics at tag `v4.3.1` (github.com/WeaponMechanics/WeaponMechanics, commit f9d2c42) and
FoliaScheduler (github.com/CJCrafter/FoliaScheduler, master; WeaponMechanics 4.3.1 shades 0.7.5, whose platform
choice is the same code). Not compiled, not run. Paths below are inside `weaponmechanics-core/src/main/java/me/deecaad/weaponmechanics/`.

**Verdict:** every WeaponMechanics call GunSpin makes exists with the signature it uses, and the semantics it relies on hold. No threading problem on Paper. No missing reset path. One cosmetic gap (a re-press frame, below) is left as it is, with a patch proposal.

## The API GunSpin uses (all present in 4.3.1)
| GunSpin call | Source | Notes |
|---|---|---|
| `WeaponFullAutoEvent.getShotsPerSecond()` / `setShotsPerSecond(int)` | `weapon/weaponevents/WeaponFullAutoEvent.java` | `isCancelled()` is `getShotsPerSecond() == 0` (a comment says "the handler will try to use burst/semi"). So GunSpin's `startRate` (at least 1) is required. |
| `e.isMainHand()`, `getShooter()`, `getWeaponTitle()` | `weapon/weaponevents/WeaponEvent.java` lines 36-90 | |
| `FullAutoTask.setRate(int)` / `setPerShot(int)` | `weapon/shoot/FullAutoTask.java` | `setRate` throws outside 0..20 and `setPerShot` below 0. GunSpin passes `r % 20` and `r / 20` with r >= 0: always in range. Each run fires `perShot + AUTO[rate][currentTick]` rounds, read live. |
| `HandData.getFullAutoTask()`, `isReloading()` | `wrappers/HandData.java` lines 142, 223 | `getFullAutoTask()` is null once the task ends (`setFullAutoTask(null, null)` in every end path of `FullAutoTask.accept`). |
| `WeaponMechanics.getInstance().getPlayerWrapper(p).getMainHandData()` | `WeaponMechanics.java` | |
| `WeaponReloadEvent` (MONITOR) | `weapon/reload/ReloadHandler.java` line 181 | Fired before the ammo check (line 217), as `GunFx.reloadStarts` assumes. |

## The order in a tick
- `ShootHandler.fullAutoShot` (line 342) fires the event, builds the `FullAutoTask` from the event's number and schedules it with `getFoliaScheduler().entity(shooter).runAtFixedRate(task, 1, 1)`: first run one tick later.
- FoliaScheduler's `FoliaCompatibility` picks its Folia implementation when `Server#isOwnedByCurrentRegion(Location)` exists. Paper has that method, so on Paper the task runs on Paper's entity scheduler, not the Bukkit scheduler.
- GunSpin's tick is a Bukkit timer (delay 1, period 1). Paper runs the Bukkit scheduler's heartbeat before the entity schedulers in `tickChildren`. That was checked in Paper 26.1.2's bytecode by the local Java fixer; the cloud can't reach papermc.io to recheck it. So GunSpin sets the rate before the task fires in that tick, the first tick included. `AUTO[r][0]` is 1 for every r >= 1, so a task run before GunSpin's tick would fire one stray round at the start's 1 a second.
- The use packet that fires the event is handled before `tickChildren`, so both first runs land in the same tick.

## Threading
- On Paper everything runs on the main thread: the event (packet handling), GunSpin's Bukkit timer, GunFx's timers and the entity scheduler's tasks. `states` (a HashMap) is only touched there.
- On Folia it would break (a HashMap shared across regions, a Bukkit scheduler). Folia isn't a target: Minehut and the local server run Paper.

## Reset paths (each one ends the spin, the sounds and the flags)
| Path | What happens |
|---|---|
| Letting go | `FullAutoTask.accept` ends itself when `keepFullAutoOn` is false (right-click no longer held, or a Circumstance such as sprinting). GunSpin sees `getFullAutoTask() == null` on its next tick and calls `release`. |
| Out of rounds mid-burst | The task ends, then `startReloadIfBothWeaponsEmpty`. If the reload really starts, `onReload` drops the state; with no spare ammo, the tick's release plays the spin-down. |
| Reload key while held | `ReloadHandler.startReloadWithoutTrigger` (line 93) refuses while a full-auto task exists, so Q does nothing until the trigger lets go. It's the same for every automatic gun. |
| Slot change / gun moved some other way | `onHeld` drops; the tick also checks the held title each tick. |
| Death, quit (kick too), world change | Their handlers drop. |
| `/wm reload` | `WeaponMechanics.init()` calls `cancelTasks()` on every hand, which nulls the task, so the tick releases normally. |
| `/dphone reload` without the spin | The tick removes the state and puts a held burst back on the file's rate. |
| WeaponMechanics API missing or throwing | `fail` → `shutdown()` (it clears `states` while the tick's iterator is abandoned by the `return`: no ConcurrentModificationException). |
| Plugin disable | `shutdown()`. |

## Small findings (no change made)
1. **A frame of the rest pose on a quick re-press** (the data fixer's SHOULD 9). On a re-press at s >= 0.3, `onFullAuto` takes flag 4 off at once. Flag 0 comes with the first round in the next tick, and in a new task `currentTick` is 0, so that round fires at once. So the pack draws the plain gun for at most one tick between the spin-down's angle and the full spin. A closer fix would leave flag 4 (and its clock) on at the re-press and have `GunFx.onShot` take flag 4 off and end the clock for spin guns when it marks the first round. That is a GunFx change that needs a client check, so it's left for a local session.
2. **The first round from cold lands on the task's own pattern.** The task's `currentTick` keeps counting through the idle ticks (rate 0), so once s reaches fire-at the first round waits 0-3 ticks for `AUTO[5]`'s next 1. That is already in the "about 0.4 s" figure; the fixer's harness models it.
3. **Idle ticks rewrite the ammo tag.** At rate 0, `consumeAmmo(stack, title, 0)` still sets `AMMO_LEFT` to the same value every tick. That's harmless: WeaponMechanics does the same on every round at 16 a second.
4. **A task with no scheduled run.** `runAtFixedRate` returns null for an invalid entity, leaving `HandData` with a task object and no running task. Only a dead or removed player hits this, and death drops GunSpin's state.
