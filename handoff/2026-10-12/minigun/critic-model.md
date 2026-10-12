<!-- wf_7a4941fe-721 critic:model: an agent's final report, kept for the cloud session -->

**Model critic verdict on `tools\guns\minigun.js`: two MUST fixes and four SHOULD fixes.** Everything else checks out. I built and rendered the model with the repo's `pg.js` in my own folder only. Nothing live was written: `pack\` has no minigun files, and the plugin jar and `extras\packs` are unchanged.

A ready patch for both MUSTs plus SHOULD 1 and SHOULD 3 is in `critic\model\mg-fix.diff`. With it applied the model has 0 coplanar face pairs, the spin sweep has 0 collisions (smallest clearance 0.097), and nothing pops at the end of any clock.

On the agent-skills plugin: only its four planning skills are installed (`.claude\skills`: interview-me, idea-refine, spec-driven-development, planning-and-task-breakdown). They are owner-invoked only (`disable-model-invocation`) and none of them covers review. I read them and checked the build against the spec by hand, which is spec-driven-development's validation step.

**MUST 1: overlapping faces in the same plane (z-fighting).**
- The model has 64 pairs of overlapping same-plane faces; the Veteran has 2 and the AK-48 has 5, all small. The house rule against this is written in `rev.js`, `tommy.js` and `uzi.js`: "staggered a hair (no coplanar faces where they overlap)".
- **Ring ends:** `ring()` builds each clamp, the cap and the front plate from three boxes with the same x0/x1, so their end faces overlap on the same plane. The east faces point at the shooter in every first-person view.
- **Clamps on the barrels:** the rear, middle and front clamps use c = 2.25, which equals D + H, so each clamp's flat face sits exactly on the barrels' outer faces. The black barrel and the silver clamp fight over a 1.75-wide strip in the middle of every band, on all four sides.
- **Fix:**
  - In `ring()`, the first arm becomes `x0 + 0.02 .. x1 - 0.02` and the second arm `x0 + 0.04 .. x1 - 0.04`; the square keeps `x0 .. x1`.
  - Use c = 2.3 for the rings at 8.25, 0.5 and -11.0. The rear clamp then sweeps r = 3.253 against the handguard at 3.35: clearance 0.097, no hits.
  - Delete the `bore` core box. It is fully enclosed by the four barrels and its ends sit inside the cap and the rotor housing.
  - Give each barrel `dirs` without its inner face and without its ends.

**MUST 2: every spin ends on a quarter or half turn, so the barrels pop at the end of each clock.**
- The texture's light is painted in "from above": the face tones (up 1.1, down 0.78), the side bands and the bevels. So the "+" cluster turned 90° or 180° doesn't look like its rest pose.
- Rendered against the rest pose, the cluster turned exactly 90° changes 4,634 pixels and 180° changes 4,990; turned 360° changes 0.
- In the built frames:
  - The spin-down ends at 450° (the same as 90°): its last frame differs from rest by 4,682 pixels. This pops after every burst.
  - The draw ends at 180° and the reload at 2 × 90° = 180°: 4,990 pixels each.
- **Fix:**
  - Spin-down: `turn(360 * (2 * p - p * p))`.
  - Draw: `turn(360 * ease.ramp(p, 0.5, 0.96))`, peaking at 29.3° a tick.
  - Reload: add a free half turn as the gun levels, `+ 180 * ease.ramp(p, 0.87, 0.98)`, peaking at 27.1° a tick.
- **Verified after the fix:**
  - 0 pixels change at the end of the draw and the reload, and 141 at the end of the spin-down (its last frame is 0.1° short of a whole turn).
  - The spin-down after a full spin peaks at 10.4° a tick.
  - The spin-down after a short tap peaks at 36.8° a tick at a 9-tick clock; it was 44.0°, which reads as turning backward.
- **Comments to update:** lines 19–24 ("the '+' repeats every 90"), the draw's "half-turn", and the reload's two quarter turns.
- **Cross-track follow-ups:**
  - The draw sound's whir in `tools\sounds\guns\minigun.js` (1.16–1.84 s, "half-turn") should move to about 1.0–1.92 s for a full turn.
  - The comment in `FN_FAL.yml` saying "60-92%" should say "50-96%".
  - If the sound has to stay where it is, `360 * ease.ramp(p, 0.58, 0.92)` peaks at 39.7° a tick. That still turns forward (under 45°) but is over the spec's 30° target.

**SHOULD**
1. **The red dot is too big.** It is 0.25 units about 0.73 blocks from the eye, which is 0.052 rad. The AK-48's and Combat Rifle's dots are 0.030–0.032 rad. It shows as 20 px at 960×540, about 40 px at 1080p.
   - Change it to `{ from: [19.25, SY - 0.075, 7.925], to: [19.4, SY + 0.075, 8.075] }`.
   - Change the post to `{ from: [19.3, 12.25, 7.975], to: [19.35, SY - 0.075, 8.025] }`.
   - Measured after the change: 12 px, centred within 0.01 px in both hands.
2. **Stale comment (lines 21–24) about GunSpin's clocks.**
   - `GunSpin.onFullAuto` starts no spin-up clock when the spool s is at or above fire-at, and below it the clock is 17 ticks or more. Simulated, a re-press then turns at most 28.8° a tick. So the drafter's "brief slow restart" question is moot.
   - The only short clock left is the spin-down after a tap: `round(30 × s)` gives 6–10 ticks.
   - Optional for the java track: `Math.max(10, downTicks(...))` brings that to 26.4° a tick or less.
3. **The texture is 512² and 76% empty.** Every other gun is 256², the pistol 128². Each skin copies the whole texture, once per frame if it's animated, and the owner wants every gun skin-ready.
   - The hidden-face cuts in MUST 1 take the tile area from 62.0K to 57.0K texels, but the kit's shelf packing still needs 272 rows at 256 wide.
   - It needs about 6% more: for example, drop the flash core's east face, which is always behind the cap, or change the packer in `pg.js` (a kit change, your call).
4. **Likeness of the orange window.**
   - In the reference it is a flat bar, about twice as wide as tall, on the receiver's top row just in front of the sight box.
   - Ours is a near-square hot glow (2.75 × 2.5) under and behind the hood. In the hip view it shows as a glowing block of about 80 × 85 px in the bottom-right corner.
   - Suggestion: a flat lit bar at x 16.75–19.0, y 10.0–11.25, with the upper camo plate shortened to x 13–16.5. The spec placed the window where it is, so this is your call.

**Checked and passing**
- **Numbers and parts:** exactly 6/1006/2006/3006; part names are lowercase.
- **Sweep:** my own check on the built models finds 0 hits, smallest clearance 0.168 before the fix.
- **States:** no composite mixes states; the stock is hidden in every aimed frame; the flash sits at the muzzle in every composite.
- **Elsewhere:** third person, the ground and item frames read only flags 0, 3 and 4, never the cooldown or the held key. The inventory icon is the still model.
- **Aim:** the dot is within 0.03 px of the crosshair in both hands.
- **Size:** the hip view covers 13.2% of the screen against the Veteran's 13.0%.
- **Reload:** the box swap is on screen in both hands.
- **Frame speeds:**
  - Spin-up from still: up to 15° a tick.
  - Draw: the gun turns up to 7.7° a tick.
  - Reload: the gun turns up to 6.0° a tick.
- **Shared interface:**
  - Flags 0, 2, 3 and 4 and the clock lengths (draw 40, reload 90) are used as agreed.
  - The sound delays 13, 54, 67 and 74 land on the tug, the seat and the two ratchets.

Files are in `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\critic\model\`:
- mg-fix.diff
- mg-fix.js
- sim.js
- ev.js
- sweep2.js
- coplanar.js
- snap.png
- r\
