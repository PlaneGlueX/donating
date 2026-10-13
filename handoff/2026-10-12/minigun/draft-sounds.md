<!-- wf_7a4941fe-721 draft:sounds: an agent's final report, kept for the cloud session -->

I wrote the minigun's seven sounds in one new repo file, `tools\sounds\guns\minigun.js`, and installed it. Nothing else in the repo changed: I didn't commit, the pack's `sounds.json` is untouched (same md5), and I didn't touch the server or the bots. The other changed files in `git status` belong to other tracks. All checks here are numeric. Nobody has listened to the sounds in the game yet.

**Agent Skills (addyosmani/agent-skills).** The four skills in `.claude\skills\` are set so only the owner can start them (`disable-model-invocation: true`), so the Skill tool couldn't run them. I read `planning-and-task-breakdown` and followed it by hand: a written plan with acceptance criteria for each task and a checkpoint. It's in my work folder (`plan.md`), not `tasks\` or `extras\plans\`, because this track may only write its own file. `spec-driven-development` wasn't needed because the spec already exists.

**What each sound does** (the events are `donating.gun.minigun.<what>`, matching the interface and `FN_FAL.yml`'s lines):
- **shoot** (3 variants, 90 ms): a short "dut" with a thin metal ring. It has far less low bass than the AK-48 (63 Hz band −19 dB against the AK's 0 dB). It is down about 20 dB by the next shot, 62.5 ms later.
- **spinup** (1.2 s): a motor clunk, then a whine rising from 0.4 to full pitch with gear clicks speeding up. It fades from 0.95 s, when the shots take over.
- **spindown** (1.5 s): the whine falls and fades, the clicks slow to a stop, and the barrels settle with a soft knock at 1.38 s.
- **draw** (2.0 s): the lift, the gun settling at 0.8 s, a click as it turns sideways at 1.05 s, then a short test whir from 1.2 to 1.84 s that ends with a clack. These times follow the prototype's draw frames.
- **mag_out** (0.5 s): the catch, the box sliding out, coming free at 0.13 s, and the rounds rattling.
- **mag_in** (0.6 s): the box hooks in, latches at 0.09 s, and the palm slap lands at 0.2 s (4 ticks after the hook, matching the slap frame).
- **ratchet** (0.3 s): a heavy click, a quarter-turn whir, and the detent clicking into place at 0.18 s.

**Spin sound loudness: I went against the brief here.** The spin sounds are never turned down by `build-pack.js`, so their level in the file is what players hear. Mastered at a peak of about 0.65 as asked, the steady whine came out as loud as the 16-a-second shots and drowned them out. The shots plus the whine also went over full scale (peak 1.031). So I set them by average loudness instead: −22 dB for the spin-up (−21 for the spin-down), about 8 dB under the shots, with the peak capped at −9.5 dB.

**Checks** (full output in `analysis.txt`):
- **Same output from the repo copy:** the repo's `make-gun-sounds.js --preview --only minigun` gives "previewed 7 events", and all 9 WAVs are byte-identical to my scratch copy's.
- **Full preview:** all 58 events build with no name clashes.
- **Ogg check:** encoding through a scratch copy of the generator (pointed away from the pack) passes the mono Vorbis check. The minigun adds about 109 KB.
- **Shot train at 16 a second, at the 0.65 level every gun sound ends at:**

| Train | Peak | Dip between shots | Average loudness |
|---|---|---|---|
| Minigun shots alone | 0.623 | 18.8–21.7 dB | −14.9 dB |
| Shots + spin-up | 0.771 | 12.4–18.9 dB | |
| Shots + spin-down | 0.723 | | |
| AK-48, 10 a second | | | −12.2 dB |
| Machine Gun, 11 a second | | | −15.2 dB |
| Veteran, 9 a second | | | −11.5 dB |

- **Spin-up pitch:** rises 217 → 521 Hz (0.42 → 1.0 of the top). The spin-down falls 513 → 149 Hz. Click counts rise during the spin-up and fall during the spin-down.
- **Timing:** onsets land at draw 0.8 / 1.05 / 1.2 / 1.84 s, mag_in 0.09 / 0.2 s, mag_out 0.13 s, ratchet 0.18 s.
- **Mechanics level:** peaks at −2 to −4 dB, the same masters as the Veteran's.

**Open questions for the other tracks:**
1. **GunSpin, re-pressing while spinning.** The spin-up always plays from its start. At pitch 0.85 + 0.3·s, re-pressing at s = 1 plays a rising whine while the barrels are already at full speed. I'd suggest GunSpin skips the spin-up sound when s ≥ about 0.5. From cold, pitch 0.85 stretches it to 1.41 s, which is fine.
2. **GunSpin, releasing early.** The spin-down always runs 1.5 s, but released at s = 0.5 the barrels stop drawing after 0.75 s. It's quiet by then (volume s), so I'd accept it.
3. **FN_FAL.yml, second ratchet.** The second ratchet at `delayBeforePlay=74` lands its click about 1 tick after the frames' second quarter turn ends (72.9–76.5). 73 would line it up.
4. **Owner, in the game:** whether the spin-up stands out enough before the first round (it starts quiet, about −25 dB), and whether the shots feel heavy enough. They're lighter than the AK-48 on purpose.

Files are in `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\build\sounds\`:
- `plan.md`
- `analysis.txt`
- `analyze.js` and `spectro.js` (the analysis tools)
- `v4\spectro-spin.png` (spectrograms of the spin-up, spin-down, draw, and shots with the whine underneath)
- `v4\spectro-mech.png` (spectrograms of the shot, mag_out, mag_in and ratchet, with AK-48 and Veteran shots below)
- `v4\train16.wav`, `v4\train16w.wav`, `v4\train16d.wav` (listenable mixes of 16-a-second shots, alone, with the spin-up, with the spin-down)
- `repo-only\` (the WAVs from the repo copy)
- `ref\` (the AK-48 and Veteran reference WAVs)
