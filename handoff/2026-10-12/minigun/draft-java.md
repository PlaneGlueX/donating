<!-- wf_7a4941fe-721 draft:java: an agent's final report, kept for the cloud session -->

JAVA TRACK (GunSpin): built, compiled, unit-tested and installed. Nothing has run on the live server yet: no bots, no restart, and the live jar has not been rebuilt.

**Agent skills.** The "former Google engineer" plugin is addyosmani/agent-skills. In this repo it is the four planning skills in `.claude/skills/`. They have `disable-model-invocation: true`, so the Skill tool cannot call them. I read `planning-and-task-breakdown/SKILL.md` and followed its process by hand. The spec already existed, so `spec-driven-development` didn't apply. The plan (tasks, checkpoints, risks) is in my work folder, `...\build\java\plan.md`. It is not in `extras/plans/`, because this track may only write the files it owns.

**What I built**
- **`GunSpin.java` (new), following spec 5.1-5.2:**
  - On `WeaponFullAutoEvent` (HIGHEST, ignoreCancelled, main hand, spin guns only) it reads `max`, sets `setShotsPerSecond(rate(s))` and never cancels the event. It takes flags 4 and 2 off, starts the flag-3 spin-up clock (`upTicks`) and plays `donating.gun.minigun.spinup` on the player at pitch 0.85+0.3·s, after stopping any spindown sound nearby.
  - **Each tick, while the trigger is held:** s goes up by 1/up, then `FullAutoTask.setRate(r%20)` and `setPerShot(r/20)`.
  - **On release:** it stops the spinup sound for everyone within sound-range, plays spindown at volume s, takes flag 3 off and starts the flag-4 spin-down clock (`downTicks`).
  - **After release:** s goes down by 1/down per tick, and the state is dropped at 0.
  - **Resets:**
    - A reload that really starts (checked with `fx.reloadStarts`) drops the state and leaves GunFx's reload clock running.
    - Item switch, death, world change, quit and plugin disable drop the state, stop the sounds and take flags 3 and 4 off.
  - **Failure handling:** every WeaponMechanics call is wrapped (`RuntimeException | LinkageError`). A startup `probe()` checks that the methods exist. Any failure turns the spin-up off for good and logs it once; the next press then fires at the file's 16/s.
  - **Tick order:** checked in the Paper 26.1.2 bytecode. The Bukkit scheduler runs before the entity schedulers, and MechanicsCore runs FullAutoTask on Paper's entity scheduler, so the rate is set before the task fires in each tick, as `wm\sim.js` assumes.
- **GunFx:**
  - `Gun` gets `spin` (null when absent); flags 3 and 4 are added as SPIN_UP and SPIN_DOWN.
  - The draw flag now applies when `shot > 0 || spin != null`. The same goes for onScope's mid-draw rule; for a spin gun, aiming mid-reload doesn't end the reload clock.
  - `unflagAll` covers flags 3 and 4.
  - `status()` adds ` spin=24/30/0.3/5` inside FN_FAL's braces, and `spinup=on spinning=N` in the header. The existing gunfx.js regexes still match.
  - The helpers GunSpin needs are now package-private.
- **PhonePlugin:** registers `gunFx.spin` and routes `/dphone gunfx spin <player>`, which answers `GUNSPIN <p> s=0.00 held=false rate=N max=N` or `GUNSPIN <p> none`. Tab completion offers `spin` and then player names.

**Repo files changed:**
- `C:\Users\matti\OneDrive\Desktop\Donating Test Server\plugin\src\dev\donating\phone\GunSpin.java` (new)
- `C:\Users\matti\OneDrive\Desktop\Donating Test Server\plugin\src\dev\donating\phone\GunFx.java`
- `C:\Users\matti\OneDrive\Desktop\Donating Test Server\plugin\src\dev\donating\phone\PhonePlugin.java`
- `C:\Users\matti\OneDrive\Desktop\Donating Test Server\plugin\resources\config.yml` (the FN_FAL line plus a comment explaining spin)

**Checks**
- **Build:** I compiled with a copy of `build-plugin.ps1` (output in my folder only), using the stricter `-Xlint:all`. Both the installed repo source and my work copy compile with exit 0. There are 26 warnings, the same list as the unmodified source; none come from GunSpin, GunFx or the new PhonePlugin lines. The live `server\plugins\DonatingPhone.jar` (Oct 7) and `plugin\build` were not touched.
- **Harness, 39/39 passing** (`harness-run.txt`):
  - `rate(s)` and its edge cases, `Spin.read` with defaults and clamps, the status string `24/30/0.3/5`.
  - The spool reaches 1 in exactly 24 ticks and 0 in exactly 30. `upTicks`/`downTicks` stay in step with the spool to within a tick.
  - `probe()` finds every method in the real WeaponMechanics 4.3.1 jar.
  - The real AUTO table, read by reflection from the jar, equals `wm\auto.json`.
  - The simulation reproduces spec 5.3:
    - From cold: first round on tick 8; 6/22/38 rounds in 1/2/3 s; nothing in the first 6 ticks.
    - At full spin: 16/32/48 rounds in 1/2/3 s.
    - Pressed again 0.5 s after letting go (s 0.67): fires on tick 1.
    - Time to kill: 6 hits at 0.95 s from cold and 0.35 s at full spin; 18 hits at 1.70 s and 1.10 s.

**Work folder:** `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\build\java\` holds `plan.md`, `build-plugin.ps1`, `harness\dev\donating\phone\SpinHarness.java`, `harness-run.txt`, `build.txt` / `baseline-build.txt`, and `orig\` (the pre-edit copies).

**Problems and open questions**
1. **One deviation from the spec.** Pressing again at s ≥ fire-at starts no spin-up clock. Instead the spin-down clock ends, and the next tick's rounds set flag 0, so the full-spin frames show. The spec's short clock is round((1−s)·24), only 8 ticks at s 0.67. Over 8 ticks the pack's 360·p² curve ends at 90° a tick, which reads as the barrels turning backwards. Below fire-at the clock is always 17+ ticks, so at most 42° a tick.
2. **Model/pack track: short taps alias on the spin-down.** A release at s < 0.67 gives a spin-down clock under 20 ticks. On the 450·(2p−p²) curve that starts above 45° a tick: s 0.5 starts at 60°, s 0.3 at 100°, so it reads backwards for a few frames. Java can't fix this without changing the shared interface. One fix is a longer minimum clock, accepting a speed jump at release.
3. **Not my file:** `server\plugins\DonatingPhone\config.yml` still needs the FN_FAL line. The jar must be rebuilt with `tools\build-plugin.ps1` while the server is stopped, then the server restarted.
4. **Not my file:** the FN_FAL.yml comment says a burst started during the 1.5 s spin-down "fires at once". That is only true within about 1.05 s of letting go from full spin (while s ≥ 0.3).
5. `stopSound` works by sound name, so one player's release also stops another nearby minigunner's whine for listeners within range.
6. Paper sends the spin sounds to everyone tracking the player, and the client fades them by the attenuation set in sounds.json. Sound-range (32) needs to be at least that distance, or some listeners keep hearing the whine after release.
7. `gunfx.enabled: false` also turns the spin-up off (the gun then fires at its file's rate). This is written in the config comment.
