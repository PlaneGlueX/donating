<!-- wf_7a4941fe-721 fix:java: an agent's final report, kept for the cloud session -->

The java track is fixed, compiled, tested and installed in the repo. Two limits: the live plugin jar has not been rebuilt, and nothing has run on the live server (no bots, no restart, no RCON). All of the critic's points are fixed (M1 and S1–S4; S5 is documented), plus three small additions.

## Agent skills
The addyosmani/agent-skills plugin isn't in the plugin catalog (SearchPlugins found no match). What the repo has is its four planning skills in `.claude\skills\`. They are owner-invoked only (`disable-model-invocation: true`), so the Skill tool can't run them. I followed `planning-and-task-breakdown` by hand: small tasks, each with a check that can fail. The plan is in `...\build\java\plan-fix.md`.

## Repo files changed
- **`C:\Users\matti\OneDrive\Desktop\Donating Test Server\plugin\src\dev\donating\phone\GunSpin.java`** (new file):
  - **M1 (the critic's MUST):** a burst now starts with `startRate(s) = max(1, rate(s))`. Giving the event 0 cancels it: WeaponMechanics' `isCancelled()` is `shotsPerSecond == 0`, and a cancelled burst falls through to a single shot, so the gun was a 5-a-second semi-auto that never spun up. GunSpin's tick then sets the real rate (0 from cold) before the task's first run.
    - I re-checked the order in the Paper 26.1.2 bytecode: the use packet is handled before `tickChildren`, and there the Bukkit heartbeat runs before `EntityScheduler.executeTick`.
    - The class doc now explains this. Its old "never cancel / set 0" paragraph was wrong.
  - **S1:** the spin-down clock is now `min(2·down, round(down/s))`, between 30 and 60 ticks. It never starts faster than 45° a tick: 30° a tick from full spin, 15° a tick at most below s 0.5.
    - A release below fire-at plays no spin-down at all: no flag 4, no sound, and the clock is ended.
    - The clock now outlasts the spool, so `/dphone gunfx spin` can say "none" while flag 4 is still on.
  - **S2:** the spin-up whine and clock only start when s is below fire-at.
  - **S3:** GunSpin no longer reads `gunfx.enabled`. Turning gunfx off removes the animations but keeps the spin-up.
  - **S4:** `fileRate()` puts a held burst back to the file's rate when GunSpin stops steering it (`fail`, `shutdown`, or the spin removed from the config).
  - **Three additions of my own:**
    - A burst that replaces one GunSpin never saw end (`st.held` still true) keeps its clock and whine.
    - The spin-down now plays at pitch 0.4 + 0.6·s, which is how `tools\sounds\guns\minigun.js` designed it. The drafter used pitch 1.
    - `upPitch`, `downPitch` and `startRate` are static, so the harness can test them.
- **`...\plugin\src\dev\donating\phone\GunFx.java`:**
  - `flagClock` returns early when gunfx is disabled.
  - `onEquip` checks `!enabled` first. Before this, a disabled GunFx left flag 2 stuck on guns with a shot clock (this bug was older than the minigun).
  - One line added to the class doc.
- **`...\plugin\resources\config.yml`:** the comment now says "enabled: false only takes the frames away …; the spin-up is gameplay and stays." The FN_FAL line is unchanged.
- **`...\plugin\src\dev\donating\phone\PhonePlugin.java`:** left as the drafter wrote it (the reviewed routing and tab completion).

## Checks (output in `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\build\java\`)
- **Build:** a copy of `build-plugin.ps1` (`-Xlint:all`) compiled the installed repo source with exit 0 (`build-repo-fix.txt`). It gives the same 26 warnings as the unmodified baseline, none in GunSpin, GunFx or the new PhonePlugin lines. The live `server\plugins\DonatingPhone.jar` (Oct 7) and `plugin\build` were not touched.
- **Harness, 37 passed, 0 failed** (`harness-fix\...\SpinHarness.java`, output in `harness-fix-run.txt`):
  - The real `WeaponFullAutoEvent`: 0 cancels it, and `startRate(s)` never does for any s from 0 to 1.
  - Both config files (the plugin's and the live server's) read as 24/30/0.3/5 with sound-range 32.
  - Spin-down clock: 30 ticks from full spin, never over 45° a tick, within 1° a tick of 30·s for s ≥ 0.5, at most 60 ticks.
  - `probe()` finds every method in the real WeaponMechanics 4.3.1 jar, and its AUTO table matches `wm/auto.json`.
  - A press-by-press model of WeaponMechanics, fed by the real `startRate`:
    - From cold: first round on tick 8; 6 / 22 / 38 rounds in 1 / 2 / 3 s; nothing in the first 6 ticks; one burst with no single shot.
    - At full spin: 16 / 32 / 48 rounds in 1 / 2 / 3 s.
    - Re-pressed at s 0.67: fires on tick 1. Re-pressed at s 0.2: fires on tick 4.
    - Kill ticks: 19 / 34 from cold, 7 / 22 at full spin.
  - **Controls:** fed the drafted event value, the same model fires on the press tick and never spins up, so the harness can catch M1. Running the task before GunSpin's tick gives a stray round on tick 1, which pins down the order the fix relies on.
- **The drafter's old harness on the fixed code:** 36 of 39 pass (`harness-drafted-on-fixed.txt`). The 3 that fail checked the old spin-down curve: "from half = 15", "never under 1", and the clock and spool ending in step.

## For the integrator and the other tracks
1. **Rebuild the jar:** run `tools\build-plugin.ps1` with the server stopped, then start it (`Playtest.bat` start does this when `plugin\` is newer than the jar). The live `server\plugins\DonatingPhone\config.yml` already has the FN_FAL line.
2. **Bots (`gunfx.js`):** the current expectations still hold. Note that flag 4 can now last up to 60 ticks (3 s) after letting go at s 0.3–0.5. Worth adding: a tap under 0.35 s fires no round, plays no spin-down sound and sets no flag 4, and then `GUNSPIN … s=<0.3 held=false`.
3. **Model/pack track:**
   - Read the spin-down from the cooldown fraction; don't assume 30 ticks (it is 30–60).
   - A spin-down clock starts only from s ≥ 0.3.
   - After a tap below fire-at, flag 3 just turns off, so the cluster snaps back to rest from at most about 31°.
4. **Sounds track (`tools\sounds\guns\minigun.js`):**
   - Line 11: change "at each burst's start" to "at each burst's start from under fire-at (s < 0.3)".
   - Line 17 is now true as written (pitch 0.4 + 0.6·s, volume s), but only from s ≥ 0.3.
5. **`FN_FAL.yml`:**
   - Line 69 says "a burst started then fires at once". That is only true while s ≥ 0.3, about 1.05 s after letting go from full spin.
   - Line 61's `Off_Hand` trigger is ignored by GunSpin, so an off-hand minigun fires 16/s at once (only bypass staff can reach it). Remove the trigger or accept it.
6. **CLAUDE.md:** add these facts:
   - `WeaponFullAutoEvent.isCancelled()` means `shotsPerSecond == 0`. Spec 5.1 was wrong.
   - A burst starts at 1/s, and GunSpin's tick sets the rate first.
   - `gunfx.enabled false` keeps the spin-up.
   - Sounds stop by name, so one gunner letting go cuts another's whine within 32 blocks.

## For the owner (client check, PLAYTEST)
1. **How a short burst ends:** after letting go at s 0.3–0.5, the barrels coast for up to 3 s at 15° a tick. A tap under about 0.35 s stops them at once, with no wind-down sound. Does that feel right?
2. **Two minigunners close together:** when one lets go, the other's spin-up whine stops too. This is a known limit.
