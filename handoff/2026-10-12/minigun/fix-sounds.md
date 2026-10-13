<!-- wf_7a4941fe-721 fix:sounds: an agent's final report, kept for the cloud session -->

The fixes are applied and installed in the one repo file this track owns: `C:\Users\matti\OneDrive\Desktop\Donating Test Server\tools\sounds\guns\minigun.js` (new, untracked, not committed). Nothing else in the repo changed. The pack's `sounds.json` md5 is still `ec70d94110c0a0a485e6b91bd743b391`. I didn't touch the server, the jar, the pack, or the bots.

**About the agent skills you asked for.** The four installed addyosmani/agent-skills skills can only be started by the owner (`disable-model-invocation: true`, CLAUDE.md line 62), so the Skill tool can't run them. I followed `planning-and-task-breakdown` by hand, with a plan and acceptance criteria for each task. I used the spec as the single source of truth, as `spec-driven-development` does.

## What changed in minigun.js
1. **MUST 1, the spin-down's start pitch:** its whine now starts at 442 Hz, which is the spin-up's top when GunSpin plays it from cold at pitch 0.85: `w = 0.85 * (0.25 + 0.75 v)`.
2. **The spin-up is retimed for pitch 0.85 (an extra fix):** this makes MUST 1 exact.
   - The speed now rises linearly, the same way GunSpin's `s` does (`T = 1.2 * 0.85`). Before, it eased into the top.
   - The whine reaches the top at 1.2 s as heard, which is the 24-tick clock, and fades from there.
   - The file is 1.3 s long (1.53 s as heard).
   - So at spin `s` the whine is 442·(0.4 + 0.6 s) Hz.
3. **SHOULD 2, mag_in:** this is the critic's code. The box hooks in and latches at ticks 54.0 and 54.5, which is the seat's jolt. The palm slap lands at tick 57.6, matching the slap frame.
4. **The ratchet, retimed to the model's newer frames:** the model track changed its frames after the review. The quarter turns now run at p 0.744–0.8 and 0.822–0.878, which is ticks 66.96–72.0 and 73.98–79.0.
   - The whir now lasts 0.235 s and the detent clacks at 0.24 s. That is heard at ticks 71.8 and 78.8, against the frames landing at 72.0 and 79.0.
   - The file is 0.45 s long.
   - Before this fix the detent landed about 1.6 ticks early.
   - **The critic's SHOULD 4 (move the second ratchet from 74 to 73) no longer applies:** 74 now matches the frame at 73.98. Keep `delayBeforePlay` 67 and 74 in FN_FAL.yml.
5. **The draw, retimed the same way:** the test whir now runs from 1.16 to 1.84 s, matching the model's p 0.58–0.92. Before, it started at 1.2 s.
6. **SHOULD 3, the comments:**
   - The shot is 90 ms.
   - The real firing rhythm is four rounds 50 ms apart, then a skipped tick, so each shot is down about 17 dB by the next.
   - The draw's test spin is a half turn.
   - The header now describes the spin-down without claiming what GunSpin does.

## Checks
- **Same output from the repo copy:** the repo's `make-gun-sounds.js --preview <dir> --only minigun` previewed 7 events, and all 9 WAVs are byte-identical to my harness copy's.
- **Full preview and Ogg build** (a harness copy pointed away from the pack):
  - The preview built all 58 events.
  - The encode wrote 58 events and 74 files, and all of them passed the mono Vorbis check.
  - The minigun's files add 111,598 bytes.
  - The other guns' 65 WAVs are byte-identical to the critic's.
- **Levels:**
  - The 16/s shot train at 0.65 measures −15.8 LUFS with a peak of 0.657 (the AK-48 is −14.1).
  - Two shots in the same frame peak at 1.128, against the AK's 1.137.
  - A burst from cold with the spin-up under it peaks at 0.803 (it was 0.741).
  - The spin-up's peak is −11.9 dBFS and the spin-down's −9.5 dBFS.
- **Spin-up pitch at 0.85:** 202 / 289 / 400 / 436 Hz at 0.1 / 0.5 / 1.0 / 1.2 s. That is within 1.5% of 442·(0.4 + 0.6·t/1.2).
- **Pitch jump on release, with GunSpin as it is now** (spin-down at pitch 1):

  | Held for | Spin s | Jump now | Jump before the fix |
  |---|---|---|---|
  | 20 ticks | 1.00 | 0.0 st | +3.6 st |
  | 24 ticks | 1.00 | −0.3 st | +2.6 st |
  | 8 to 16 ticks | 0.50–0.83 | +6.2 to +1.9 st | |

- **Pitch jump on release with the spin-down pitch I propose for GunSpin**, `max(0.5, 0.4 + 0.6 s)`: every release lands within 0.3 semitones.
- **Timing:**
  - mag_out: 13.0 / 15.6.
  - mag_in: 54.0 / 54.5 / 57.6.
  - ratchet: 67.0 → 71.8, then 74.0 → 78.8.
  - draw: 0.80 / 1.05 / 1.16 / 1.84 s.
- **Files:** every file starts and ends at 0.

## What the other tracks need to do
1. **GunSpin `release()` (the Java track):**
   ```java
   playSound(p, SOUND_DOWN, SoundCategory.PLAYERS, (float) st.s, (float) Math.max(0.5, 0.4 + 0.6 * st.s))
   ```
   - Without this, letting go before full spin jumps the whine up by 2 to 6 semitones.
   - The cost: after a short burst the wind-down outlasts the barrels, for example 2.14 s against 0.75 s at s 0.5, though at −6 dB.
2. **GunSpin `onFullAuto`:** play the spin-up only when `st.s < fireAt`, and keep `stopNear(SOUND_DOWN)` either way. Re-pressing at s 0.67 now drops from the spin-down's 327 Hz to the spin-up's opening clunk (−17.8 semitones).
3. **wm-ammo test:** check the built pack's `sounds.json` has `donating.gun.minigun.spinup` and `.spindown`, and that their .ogg files are in the zip. GunSpin plays these two by name, and no current test would catch them missing.
4. **Integrator:**
   - Run `tools\node\node.exe tools\sounds\make-gun-sounds.js` for real, then `build-pack.js` with FN_FAL.yml in `GUN_SOUND_FILES`.
   - Leave the spin events out of the lowering (`build-pack.js` only lowers sounds the weapon files play).
   - The real run rewrites all 74 OGGs with new stream serials, so `git checkout` the non-minigun OGGs afterwards to keep the diff clean.
   - Numbers the tests should expect: 58 events and 74 files in all, and 7 minigun events with 3 shot variants.

## Questions for the owner (in the game)
- Does the spin-up stand out enough before the first round at 0.40 s? It starts quiet, around −26 dB.
- Do the shots feel heavy enough? They're lighter than the AK-48 on purpose.
- The whine fades once full spin is reached, so long bursts are shots only. Is that right?
- Other players hear the spin sounds only within 16 blocks, while the shots carry 96. If you want enemies to hear the spin-up from 32 blocks, GunSpin can play it at volume 2; that changes nothing up close.

All my work files are in `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\build\sounds\fix\`:
- `plan.md`
- `minigun.before.js` and `minigun.final.js`
- `harness\` (the generator copy)
- `all\` (every event's WAVs)
- `repo-only\` (the WAVs from the repo copy)
- `out\`:
  - `crit.txt`
  - `timing.txt`
  - `burst_*.wav` (listenable bursts)
  - `spectro-spin.png` and `spectro-mech.png`
