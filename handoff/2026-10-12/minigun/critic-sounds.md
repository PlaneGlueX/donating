<!-- wf_7a4941fe-721 critic:sounds: an agent's final report, kept for the cloud session -->

**Sounds track review: the Hand Minigun's sounds (`tools\sounds\guns\minigun.js`)**

**Verdict:** the module is sound, with 1 MUST and 2 SHOULD fixes for this file, plus 4 SHOULD items for the other tracks. Nothing clips, the levels are right, and the event names match the interface, `GunSpin.java` and `FN_FAL.yml`.

**About the agent skills you asked for.** The four installed skills from addyosmani/agent-skills are set so only the owner can start them (`disable-model-invocation`, CLAUDE.md line 62). The Skill tool can't run them. I used the spec as the single source of truth (the `spec-driven-development` approach) and the drafter's `plan.md` acceptance criteria (written with `planning-and-task-breakdown`) as my checklist.

**What I checked myself.** All my files are in `critic\sounds\` (`crit.js`, `crit2.js`, the `harness\` copy, and output in `out\`).
- **Same output:** running the repo's `make-gun-sounds.js --preview --only minigun` gives 9 WAVs byte-identical to the drafter's.
- **Ogg build:** a full encode through a scratch copy pointed away from the pack wrote 58 events and 74 files, all passing the mono Vorbis check. The minigun adds about 109 KB.
- **Pack untouched:** the pack's `sounds.json` md5 is still `ec70d941…`.
- **Sound category:** MechanicsCore's CustomSound plays in the PLAYERS category by default (checked with javap). That is the same category GunSpin uses, so one volume slider covers both.
- **Real firing rhythm:** WeaponMechanics' AUTO[16] table fires four rounds 50 ms apart, then skips a tick. It does not fire evenly every 62.5 ms as the drafter assumed. At this rhythm and the 0.65 level every gun sound ends at:
  - Loudness by gun (perceived, K-weighted LUFS; higher is louder):

    | Gun | Rate | Loudness | Peak |
    |---|---|---|---|
    | Hand Minigun | 16/s | −15.8 | 0.657 |
    | AK-48 | 10/s | −14.1 | |
    | Veteran | 9/s | −14.6 | |
    | Brave Patriot | 9/s | −15.9 | |
    | Machine Gun | 11/s | −16.6 | |

  - So the spec's "lighter than the AK" holds.
  - A burst from cold, with the spin-up under it, peaks at 0.741 at most.
  - Two shots landing in the same client frame peak at 1.128, the same as the AK's 1.137, so the minigun is no worse than any other gun.
  - While firing, the whine sits at −23.5 against −16.1 for everything together. That confirms the drafter's choice to set the spin sounds by average loudness rather than peak.
- **File edges:** every file starts and ends at zero. The small DC offset is the same as the other guns' shots.
- **Timing against the model's frames:** the draw lines up (0.8 / 1.05 / 1.2 / 1.84 s), so do the first ratchet and the mag_in slap. The mag_in latch is off (SHOULD 2).

---

**MUST 1: the whine jumps up in pitch when you let go.**
- GunSpin plays the spin-up at pitch 0.85 from cold, so its top is 442 Hz. It plays the spin-down at pitch 1, which starts at 520 Hz.
- Measured jumps on release:

  | Held for | Spin s | Before | After | Jump |
  |---|---|---|---|---|
  | 8 ticks | 0.50 | 298 Hz | 511 Hz | +9.3 semitones |
  | 12 ticks | 0.67 | 340 Hz | 511 Hz | +7.0 |
  | 16 ticks | 0.83 | 378 Hz | 511 Hz | +5.2 |
  | 20 ticks | 1.00 | 414 Hz | 511 Hz | +3.6 |
  | 24 ticks | 1.00 | 440 Hz | 511 Hz | +2.6 |

- So every burst ends with the motor revving up.
- **Fix (line 145):**
  ```js
  const w = t => 0.85 * (0.25 + 0.75 * v(t)) // starts at 442 Hz: the spin-up's top as GunSpin plays it from cold (pitch 0.85)
  ```
- Update the spindown line in the header to say "(GunSpin on release, volume s, pitch 1) … from the spin-up's top as heard from cold (442 Hz)".
- **Tested:** a release at full spin now goes 414→432 Hz (+0.8 semitones) and 440→432 Hz (−0.3). Releases before full spin drop to +2.3 to +6.4 semitones. The cross-track GunSpin item below fixes the rest.

**SHOULD 2: the mag_in latch lands 90 ms after the frame it belongs to.**
- With `delayBeforePlay` 54, the seat's jolt peaks at tick 54 (p 0.6), but the latch clack lands at 54 + 1.8 = tick 55.8.
- The slap frame is tick 57.6 (p 0.64), so latch to slap should be 0.18 s, not 0.11.
- **Fix (lines 192–198):**
  ```js
  add(b, scrape(r, 0.03, 3000, 1800, 0.012), 0, 0.3)
  add(b, click(r, 2, 2400), 0.004, 0.7) // the front hooks in
  add(b, env(ring(0.15, [1650, 3400], 0.025, r), 0.03), 0.004, 0.2)
  clack(b, r, 0.025, 1, 1700, [560, 1350, 2700, 4200]) // latched: the seat's jolt (reload p 0.6 = tick 54)
  rattle(b, r, 0.03, 0.12, 3, 0.25)
  knock(b, r, 0.18, 1, 115, 68) // the palm slap (p 0.64, 3.6 ticks after the seat)
  rattle(b, r, 0.19, 0.3, 4, 0.2)
  ```
- Update the mag_in line in the header to match.
- This change and MUST 1 are tested in `critic\sounds\harness\guns\minigun.js`, with renders in `critic\sounds\fix\`.

**SHOULD 3: two comments are wrong.**
- **shoot:** it is 90 ms, not about 60. And at 16 a second WeaponMechanics fires "four rounds a tick (50 ms) apart, then a skipped tick", so each shot is down about 17 dB by the next one. A 62.5 ms spacing with a 20 dB drop never happens.
- **draw (header and line 163):** "the barrels spin 300 degrees" should be "a half-turn test spin". The model (`build\model\minigun.js`) turns them 180° between p 0.58 and 0.92.

---

**For the other tracks (SHOULD)**

1. **GunSpin `release()`: set the spin-down's pitch from the spin.**
   ```java
   playSound(p, SOUND_DOWN, SoundCategory.PLAYERS, (float) st.s, (float) Math.max(0.5, 0.4 + 0.6 * st.s))
   ```
   - Together with MUST 1, every release then stays within 0.8 semitones: s 0.5 298→302 Hz, 0.67 340→345, 0.83 378→390, 1.0 414→432.
   - A release at full spin still lasts exactly 1.5 s, matching the 30-tick clock.
   - The cost: after a short burst the wind-down outlasts its clock, for example 2.14 s against 0.75 s at s 0.5, but at −6 dB.
   - The module's header should then say "pitch 0.4 + 0.6 s".
2. **GunSpin `onFullAuto`: only play the spin-up when the spin-up clock starts** (`st.s < fireAt`). Keep `stopNear(SOUND_DOWN)` either way.
   - Today, pressing again at s 0.67 restarts the rising whine from 0.4 of the top: 378 → 244 Hz (−7.5 semitones).
   - It then rises for 1.1 s under rounds that are already going out at 13 a second.
3. **Tests (wm-ammo): check the built pack's `sounds.json` has `donating.gun.minigun.spinup` and `.spindown`, with their .ogg files in the zip.**
   - GunSpin plays these two sounds by name. build-pack.js only checks the sounds `FN_FAL.yml` plays, and gunfx.js only looks at the sound packets.
   - Without these entries the spin is silent in the game and every test still passes.
4. **`FN_FAL.yml`: move the second ratchet's `delayBeforePlay` from 74 to 73.**
   - The frames turn the barrels between ticks 72.9 and 76.5.
   - At 73 the click lands at 73.0 and the detent at 76.6; at 74 both are 1.1 ticks late.
   - The model's comment "ratchet 67 and 74" needs the same change.

**For the integrator and the owner**
- Running `make-gun-sounds.js` for real rewrites all 74 OGGs, because each Ogg stream gets a random serial number. The Veteran's commit carried 65 unrelated changed OGGs this way. Optional: run `git checkout` on the non-minigun OGGs afterwards to keep the diff clean.
- Other players hear the spin sounds only within 16 blocks (volume 1), while the shots carry 96 blocks. `sound-range` 32 only sets how far the stop reaches. If the owner wants enemies to hear the spin-up from further away, GunSpin can play it at volume 2: that reaches 32 blocks and sounds the same up close, because the client caps the gain at 1. The spin-down must stay at volume s.
