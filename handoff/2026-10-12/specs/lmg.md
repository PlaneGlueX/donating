# Veteran (lmg.js) remake: design spec

The gun: PG3D's "Veteran", a WWII Bren Mk 3 light machine gun. It has offset sights, a top magazine and a bipod. The remake brings it up to the Photon Shotgun's level of detail and keeps its design.
- Module: `tools\guns\lmg.js`. WeaponMechanics title `MG34`, shown as "Veteran". Numbers 11 / 1011 / 2011 / 3011.
- Reference: `remake\refs\Veteran_Weapon\`. It holds **one picture**, the 256 px Appearance icon (a WebP named .png; a PNG copy is in `work\lmg\ref.png`). There is no older look and no in-use screenshot. page.txt says: "wooden brown stock with a blue stripe around the end and a white star decal", "a wooden pistol grip, a grey receiver, a light grey ammo magazine loaded on top of the receiver, a grey barrel with a front iron sight and muzzle, and a folded bipod". On reload, "the magazine from the top is taken out from the gun and is replaced by a spare one". The picture shows the bipod **deployed**, not folded (see 1.7).
- Work files: `remake\work\lmg\` (listed at the end). The blockout is `work\lmg\proto\lmg_proto.js`. It builds with the proposed kit (`work\style\proto\pg.js`, style 'pg', density 4) through `proto\run.js`, and renders gui, side, hip, ADS, tp, reload, draw, fire and sprint.

**Recommendation in one line:** rebuild on the blockout's `real` layout. It keeps the grip, both sights, the aim numbers and every frame. The changes:
- A big square muzzle box replaces the cone, with a tall eared front sight behind it.
- The bipod is **deployed**: thick black legs with light-blue inlays, splayed 18° sideways, big feet.
- A chunkier receiver (4.0 x 2.4) and barrel (1.8).
- A taller magazine, nearly straight, with its top sloping down to the front.
- The stock is 3.2 units shorter (butt at 26.6), in orange wood.
- The PG detail pass in section 3: black ink, panel seams, slots, rivets, cream wear chips, a tan streak on the magazine.

The cautious option (`LMG_LAYOUT=safe`) keeps the bipod folded and the stock as long as now, with the same detail pass.

---

## 1. What the reference looks like, part by part

The icon is a 3/4 view from slightly below:
- The muzzle points up-right at about 38°.
- It shows the gun's **right** side (-z in our model), the muzzle's end face and the bottom of the muzzle box.
- The gun's "up" axis is almost screen-vertical: the front sight post and the magazine both stand upright on screen.

I rotated it 31° to level the barrel (`ref_rot31.png`, and `ref_rot_grid.png` with a 4 px grid, a red line every 20 px) and measured positions along the barrel. The figures below are shares of the length, muzzle = 0 %, butt = 100 %. They are ±5 %: the 3/4 view adds the muzzle box's depth to its length, and the perspective is mild but present. `ref_annotated.png` numbers the parts 1-12. Crops: `ref_z_muzzle.png` (x8), `ref_z_mid.png` (bipod, x6), `ref_z_mag.png` (x10, 4 px grid), `ref_z_receiver.png` (x8), `ref_z_rear.png` (x6).

| # | Part | Reference | Ours now | Recommended (blockout `real`) |
|---|---|---|---|---|
| 1 | **Muzzle**: a big square-section box flash hider. Silver faces split in quarters (light upper-left, darker lower-right). Its end face is a silver frame around a large dark square bore. Thick black edges. | 0-15 %. In the icon it is about 1.35x the receiver's height. | Conical, 3 steps, at most 2.4 square, x -14.25..-11 | Box x -14.25..-11.45, y/z 6.2..9.8 (3.6 square, 2.8 long), split at x -12.85, y 8, z 8. Dark neck x -11.45..-11.1 (2.2 square). Bore x -14.27..-14.25, 1.9 square (KEEP `bore`). The aim caps the size: see 5.4. |
| 2 | **Front sight**: a tall block right behind the muzzle. A light vertical window in its side (the gap between two ears, seen through). | 15-25 %, rising about 0.9 receiver-heights above the barrel | A thin blade on a small bracket, ears below the tip (SY - 0.45) | Collar x -11.1..-9.5 (2.6 square around the bore). Bracket to the left x -10.95..-9.65, y 8.2..9.35, z 9.3..11.3. **Two ears** y 9.35..**SY + 0.15**, z 9.2..9.6 and 10.6..11.0, each with a cream window stripe on its outer face. Post unchanged in z and height: x -10.5..-10.1, tip at SY, z SZ ± 0.2 (KEEP `post`). |
| 3 | **Gas block** under the front sight: a dark block with a silver face, and a plug. | under 2 | Regulator x -10.2..-9.2 | x -9.5..-8.0, y 5.3..7.2, z 7.0..9.0, with a silver inset on its sides. Plug x -9.1..-8.4, y 4.7..5.3. |
| 4 | **Barrel**: thick, near-black edges, a grey body and a silver streak along each side | 25-37 % | 1.4 square, `chrome` pattern | 1.8 square (y/z 7.1..8.9), x -9.5..1.2, with a silver band at y 8.15..8.6 on the front half. Finned sleeve x -3.2..1.2 (2.4 square), silver ribs on its sides and top. |
| 5 | **Bumps on top ahead of the magazine** (barrel nut, latch). Each has a cream/peach chip on its top-left corner. | 37-66 % | Barrel nut x 1.0..3.0, as tall as the receiver | Nut x 1.2..3.4, y 6.0..10.0, z 6.6..9.4 (wider than the receiver), split at x 2.3, cream band on top, two rivets per side. Keep its top at 10.0 and z ≤ 9.4: anything higher shows in the sight picture. |
| 6 | **Bipod yoke**: a black block under the barrel. Each leg's top carries a grey square hinge plate with a dark pin. | about 41-56 % | Clamp x -8.6..-7.4, legs folded back to 3.7 | Yoke x -6.3..-4.3, y 4.9..7.3, z 6.4..9.6, grey rivets on its sides |
| 7 | **Bipod legs, DEPLOYED**: thick black/navy square tubes. One light-blue inlay on each visible face. They splay sideways (the near leg leans toward the viewer) and rake back a little. | Legs about 3 receiver-heights long, feet well below the grip | Folded, thin (0.6), grey; the "blue" is unused | x -5.95..-4.65 (1.3 thick). Top y 5.7, bottom -3.4. Z centres 9.55 / 6.45 (± 0.65). Element rotation **axis x, ∓18°** about [-5.3, 5.7, zc]: the left (+z) leg is -18, the right is +18. Blue band down the outer face and the front (west) face, inset 0.35, from top - 1.6 to bottom + 1.2. Grey hinge-plate stamp (4x4 texels, dark 2x2 pin) at the top of the outer face. One 2x2 grey rivet near the bottom. |
| 8 | **Feet**: wide flat black pads with grey panels on their sides | | none | x -6.8..-3.8, y -4.3..-3.4, z zc ± 1.0, same rotation as the leg, grey `inset` panels on the sides and ends |
| 9 | **Magazine**: tall and nearly straight. Its top slopes down to the front (high at the back). The narrow faces are light grey with a tan wear streak. The broad faces are dark, with a silver window and a white slot near the top. | 57-75 %, rising about 1.9 receiver-heights above it | A light-grey banana curving forward: steps 4°, 15°, 27°, 4.0 wide, top ≈ 16.9 | Steps [w, h, angle] = [4.2, 2.8, 2], [4.15, 2.6, 7], [4.1, 1.7, 21], from x1 = 9.9, y0 = 10.6, z 7.1..8.9. Top back corner (8.9, 17.6), top front corner (5.0, 16.1). Cap 0.5 thick. Each step's sides: a light rim 0.8 wide around a dark `inset`, a silver window band on steps 2 and 3. Front and back: a `tan` band, 0.6 in from each edge. Well lip x 5.6..10.0, y 10.4..10.8. |
| 10 | **Receiver**: grey plates split by black seams. Rows of black slots, silver bars, a light sawtooth strip next to the magazine well. Cream chips on the top edges. | Front at about 50 %, back where the stock starts (≈ 86 %) | 2.0 wide, 3.6 tall, flat grey, one light line, one dark band | x 3.4..16.4, **y 6.0..10.0, z 6.8..9.2**, split at x 10.2, 13.0 and y 7.6. Slots, the sawtooth stamp, rivets: section 3. Cocking-handle slot (`bore`, south only) at z 9.2. Well x 5.4..10.2, y 10.0..10.6. Catch x 10.2..11.0, y 10.0..11.1. Port cover underneath x 4.4..9.2, y 5.6..6.0. |
| 11 | **Pistol grip**: orange wood, a dark-brown frame and a lighter raised panel | 81-91 % | Plain wood with grain | Same box and rake (x 13.0..15.8, y 0.6..5.0, z 6.8..9.2, GRIP 15° about [14.3, 5.3, 8]) and the same cap. Sides get a `woodL` band inset 0.4 (the raised panel). |
| 12 | **Stock**: short and chunky. Orange wood, a big cream star on the side, a **thin** light-blue band with navy rims near the end, a dark-brown staircase underneath, a black butt plate. | ≈ 14 % of the length | 16.4..29.8 (30 %), a 1.2-wide saturated blue band, a near-white star | Buffer cap x 16.4..18.4 (dark, rivets). Butt x 18.4..25.6, y 4.8..9.8, z 6.8..9.2, with a `woodL` streak along the top. Steps x 20.4..25.6, y 3.8..4.8 and x 22.6..25.6, y 2.8..3.8 (woodD). Blue band x 23.7..24.6, y 2.6..10.0, z 6.7..9.3, ink `navy`. Star centred (21.2, 7.3), cell 0.42, on both sides. Plate x 25.6..**26.6**, y 2.4..10.2, z 6.7..9.3, `plates` pattern. |

Unchanged in place and shape:
- The carrying handle, folded down on the right: arms x 0..1.1, y 7.7..8.8, z 5.8..6.8; wooden bar x -3.8..1.1, y 7.5..9.1, z 5.1..5.8, with 4 grip slots. The icon shows it; first person never does.
- The trigger housing, guard and trigger.
- The rear sight: the drum (x 13.2..15.6, y 7.4..10.0, z 9.2..10.8, graduated `ribs`) and the aperture ring (4 boxes, x 14.0..14.5, around (SY, SZ); its base now starts at y 10.0).

### Proportions, and what moving things breaks

Relative to the grip, the reference puts the magazine, the receiver front and the bipod roughly where ours are (within about 2 units). The big differences:
- **The stock is short.** Ours: 13.4 units behind the receiver. Reference: about 6.
- **The front is long.** In the reference, muzzle box plus front sight is about 25 % of the length; ours is about 9 %.

Matching the reference exactly would mean moving the grip, receiver, magazine and rear sight about 9 units back. That breaks too much:
- `aim({ rearX })`: the rear sight would sit about 9 units nearer the eye, and rearDepth would have to be re-tuned.
- `SHOULDER` and `GRIP`: they pivot every kick, the draw and the grip's rake.
- The reload pivot [9, 6, 8] and `MAG_LIP`.
- The first-person display: the magazine would land at the screen's right edge.
- Third person.
- And the muzzle can't move forward: the model limit is -16, and the flash is already drawn FX = 8 back.

So the blockout gets the look another way:
- It keeps the grip, rear sight, front post and muzzle mouth where they are. aim(), SIGHT_SHIFT, ADS/ADS_L and the kicks are byte-identical.
- It makes the front heavier: a 3.6-square box and a chunky front sight assembly.
- It cuts the stock 3.2 units. The butt goes from 29.8 to 26.6; the gun is 40.85 long instead of 44.05.

What the shorter stock changes:
- The gui framing: `rotation [0, 180, -30], translation [-0.4, 0.1, 0], scale 0.40` (was [0.4, 0.3, 0], 0.40), checked in `proto\B_gui.png`.
- Nothing in first person except less wood in the hip view's lower-right corner. ADS hides the stock part.
- Third person: the grip doesn't move, so the hold stays. Checked in `proto\B_tp.png`: the legs point forward, away from the body, and nothing clips.

Moving the front post along x (-10.6 to -10.3) is free: aim() doesn't read it.

## 2. Colors (sampled from the icon)

Method: k-means per region (`work\uzi\pal.js` on `ref.png`) and pixel samples. Near-black is 42-70 % of every region (heavy outlines plus black parts). PG3D's look here is mostly black lines over neutral greys, with a few warm and blue accents.

| Material | Sampled tones (dark -> light) | Key = blockout value |
|---|---|---|
| Ink / black parts | #000000-#0e0000, #170000 | spec.ink [8,8,10] |
| Receiver grey (neutral) | #1e1e22, #444447, #61646a, #86868b, #b2b0b5; highlight #e6e5e9 | `metalD` [72,72,76] (mat dark), `metal` [128,128,134] (mat metal), `metalL` [178,176,182], `dark` [30,30,34] |
| Barrel | #1d1d1e, #454546, #69696a, #8b8a8a, #ada9ab; streak #e0dde0 | `metal` + `silver` band |
| Muzzle box silver (slightly cool) | #2b2c2d, #6f7075, #909196, #acacb2, #cfcfd5 | `silver` [176,176,184] (mat chrome) |
| Magazine light grey (slightly warm) | #7a7575, #9f9a9b, #cbc3c0, #f4f3f6 | `mag` [206,200,198] |
| Magazine dark panel | #2f2c2b, #504d4d | `magD` [70,66,66] (mat dark) |
| Magazine window / chips | #e2e0e3, #fefdff | `magW` [222,220,226] (mat chrome) |
| Warm wear (cream chips, tan streak) | cream #fff1d2, #fce4c5, #f4d6bc; tan #f6d0af, #d7b595, #c29f84; shadow #96765a, #715347 | `cream` [244,222,196], `tan` [200,164,128] |
| Stock wood (orange) | #220806, #482815, #7b481f, #b16c2d; highlight #dba26e | `wood` [176,106,46] (mat wood), `woodL` [216,160,108], `woodD` [96,54,26] |
| Grip wood | #2f0f07, #5f3819, #9b5f28, #c88958 | the same three keys |
| Star | #f0e2d2, #f0d2b3 | `star` [240,226,210] (now [244,244,238]) |
| Stock band blue | rims #13345b / #133459; light #6e96c2, #769ac6, #78a1ce | `blue` [112,152,200], `navy` [20,50,90] (the band's ink) |
| Bipod legs | black #000105 (69 %), navy #0a172d, #2e4055 | `leg` [18,26,42] (mat dark) |
| Bipod inlays | #3e5f86, #5077a2, #6b94c6 | `blue` (one accent key for the gun: the kit's rims give the darker tones) |
| Feet panels, hinge plates | #1b1b1c, #3b3b3d, #4e4f52, #7b7b7e | `feet` [110,110,114] (mat metal) |
| Sights (KEEP) | dark, unchanged | `post` [26,27,32], `sight` [62,64,72] |
| Bore, flash (KEEP) | unchanged | `bore` [10,10,12], `flash` [255,196,64], `flashCore` [255,248,210] |

Our current colors are off in three places:
- `blue` [40,92,200] is far more saturated and darker than the reference's steel blue.
- `wood` [150,92,52] is redder and duller than its orange.
- `star` is pure white where the reference is cream.

## 3. Details to add

The detail pass uses the proposed kit (`work\style\proto\pg.js`). The decal kinds named here (`split`, `band`, `inset`, `slots`, `ribs`, `rivets`, `stamp`, `plates`) are that kit's; the blockout uses them all. If the final kit differs, keep the intent and the positions.

Global:
- **Density 4, black ink** [8,8,10], `inkW` 1. Try inkW 2 on the four big boxes (receiver, muzzle box, butt, magazine steps): the reference's lines are heavy.
- **Metal grain ≈ 0.07.** The reference's metal is flat tones with bevels and few speckles. The kit's metal default of 0.18 reads as noise at this size (compare `proto\A_gui.png` with `B_gui.png`). The blockout sets per-box `grain` through a wrapper.
- Every face gets the kit's bands and bevels. Metal and silver faces get the bevel's glint corner. That is the "light upper-left" quartering the reference's box faces show.

Part by part (both sides unless noted; face coordinates are the kit's: [x, y] on N/S, [z, y] on E/W, [x, z] on up/down):

1. **Muzzle box**:
   - `split { x: [-12.85], y: [8], z: [8] }` (the quarters).
   - West face: an `inset` z 6.55..9.45, y 6.55..9.45 (the silver frame), with the `bore` box over it.
   - One vertical `slots` groove at x -11.95..-11.65 (a ring line near the back).
   - Optional: inkW 2 on this box only.
2. **Front sight**:
   - Collar: two 2x2 silver rivets low on each side.
   - Ears: a vertical `cream` band on the outer face, x -10.6..-10.0, y 9.6..10.6. This is the reference's "window".
   - The bracket stays plain dark.
3. **Gas block**: a silver `inset` on its sides (x -9.3..-8.2, y 5.5..7.0). The plug is silver.
4. **Barrel**:
   - A `silver` band, x -9.5..-3.2, y 8.15..8.6.
   - Finned sleeve: `ribs` (1-texel slats, silver) on N/S, x -3.0..1.0, y 7.0..9.0, and on top across z.
5. **Barrel nut**: `split x 2.3`. A `cream` band on top (x 1.4..2.1, the full width: the reference's peach chip). Two 2x2 silver rivets on each side, low.
6. **Receiver**:
   - `split { x: [10.2, 13.0], y: [7.6] }`.
   - Two `slots` rows under the magazine (x 4.0..9.8, y 6.3..7.4); one row behind the grip (x 13.3..16.1).
   - A sawtooth `stamp` (rows `+.+.+.`, `++.++.`, `------`) at x 3.6..6.6, y 9.0..9.8: the reference's light zigzag.
   - Three 2x2 `metalL` rivets along the top of the middle panel (x 10.5..12.7, y 9.3..9.6).
   - Three vertical `slots` on top behind the magazine (x 11.0..12.6).
   - Well: a `metalL` band along its top edge.
7. **Rear sight drum**: `ribs` in `metalL` on the outer (south) face (the range graduations). A `cream` band on top.
8. **Trigger housing**: two `metalL` rivets at the back.
9. **Grip**: a `woodL` band inset 0.4 (the reference's lighter panel inside a dark frame). The cap is `woodD`.
10. **Stock**:
    - Buffer cap: two rivets.
    - Butt: a `woodL` streak along its top (x 18.6..25.4, y 9.2..9.6).
    - Steps underneath in `woodD` (the reference's dark staircase).
    - Blue band with `navy` ink. Keep it 0.9 wide (4 texels = ink, 2 blue, ink).
    - Star from the existing `star()` boxes, centred at (BUTT - 5.4, 7.3).
    - Butt plate: `dark` with `plates`.
11. **Magazine** (per step, in the step's own unrotated coordinates):
    - Sides: an `inset` in `magD`, 0.8 in from the front and back edges.
    - Steps 2 and 3: a `magW` window band.
    - Front and back: a `tan` band (the wear streak).
    - Cap: `magD`, with a `mag` band on its front edge.
12. **Bipod**, from 1.7/1.8:
    - Legs: blue bands on the outer and front faces, the hinge stamp `gggg/g##g/g##g/gggg` (g = `feet`), one rivet.
    - Feet: `inset` panels in `feet`.
    - Yoke: two rivets per side.
13. **Glow**: none on the gun. The reference has no emissive parts, and the flash stays the only glow.

Flash:
- Grow the core to the box's mouth: `flash` core y BORE ± 1.9, z 6.1..9.9; `flash2` core ± 1.5.
- The cross spikes grow 0.2. The jet is unchanged.
- Everything else as now (drawn FX = 8 back, moved out by `OUT`).

## 4. What our model gets wrong or lacks

Side by side: `cmp_gui.png` (reference / ours / blockout `real` / blockout `safe`), `cmp_fp.png` (ours vs blockout, hip and ADS), `cmp_ads_zoom.png` (the sight picture).

1. **The bipod is the most visible miss.** The reference's legs are deployed, thick and black, with bright blue inlays and big feet: about a third of the icon's silhouette. Ours are folded thin grey rods under the barrel, and the palette's blue goes unused.
2. **Muzzle:** ours is a small cone. The reference's square box is its single most recognisable shape.
3. **Front sight:** ours is a thin blade. The reference's is a tall block with a window.
4. **Magazine:**
   - Shape: ours is a smooth light banana bending 27° forward. The reference's is nearly straight, with a sloped top.
   - Colors: the reference is two-tone (light rims and narrow faces, dark panels with a silver window) with warm wear. Ours is one flat grey.
5. **Receiver, barrel and nut:** ours are thin flat grey slabs. The reference is chunky, with black seams, slots, rivets, a sawtooth strip, silver bars and cream chips.
6. **Stock:**
   - Ours is twice the reference's share of the length.
   - The blue band is wide and over-saturated.
   - The star is pure white where the reference's is cream.
   - The staircase is weak.
7. **Grip:** no raised panel.
8. **Line weight:** the reference's outlines are heavy black on every edge. Ours are thin, often light (`ink: 'metalD'`, `magS`) or missing (`outline: false` on the bands).
9. **No warm wear.** PG3D's grey metal carries cream/tan highlights; ours has none.

## 5. Hard constraints the rebuild must keep

1. **Numbers:** exactly `{ 11, 1011, 2011, 3011 }` (make-item-art.js GUNS.lmg).
   - 11 = `byContext('', cooldown('', 40, draw))`, with its fallback = `firing('', fire(1))`.
   - 1011 = `byContext('ads', firing('ads', fire(0.45, AIMED), AIMED))`, where AIMED = `{ hide: ['stock'] }`.
   - 2011 = `byContext('sprint', composite('sprint'))`.
   - 3011 = `byContext('', cooldown('', 96, reload))`.
2. **Parts** (the names the frames move): `body`, `stock`, `bolt`, `mag`, `flash`, `flash2`. `hidden: ['flash', 'flash2']`, `noFull: ['flash', 'flash2']`.
   - Every pose moves `gun`.
   - `mag`: the fire shake, the draw's lift and seat about [5.9, 10.5, 8], and the reload's tip, lift and swing about `MAG_LIP` (the blockout moves both pivots to the new front lip [5.7, 10.6, 8]). The reload hides it at 0.34 < p < 0.44.
   - `bolt` slides +4.4 in x (draw and reload). The slot must still hold the knob: knob x 3.3..4.8, racked to 7.7..9.2, slot x 3.4..9.4.
   - `stock` is hidden while aiming. Everything behind x 16.4 that could block the ADS view must be in `stock`.
   - `flash` and `flash2` are moved out by `OUT` = rig t [-FX, 0, 0].
   - Keep the legs in `body`. A new part would get its `_ads` file from the loop (bots\scenarios\wm-ammo.js checks the seven listed ones), but nothing animates the legs.
3. **States:** `ads` and `sprint`.
   - The ads models are **written again per hand**: right ADS, left ADS_L with translation x = right - 10.08 (2 × SIGHT_SHIFT). wm-ammo.js checks this on `gun_lmg_{body,stock,bolt,mag,flash,flash2,full}_ads.json`.
   - sprint: `{ rotation [-10, -46, 16], translation [-4.4, 2.6, -2.6], scale 0.52 }`, unchanged.
4. **Aim alignment:** `SY = 10.7`, `SZ = 10.1`, `aim({ sightY: 10.7, rearX: 14.5, rearDepth: 1.6, scale: [1.6, 2.4, 2.4] })`, `SIGHT_SHIFT = (SZ - 8) × 2.4 = 5.04`. The sight line runs along x at (y 10.7, z 10.1) and passes through:
   - the rear aperture ring at x 14.0..14.5 (hole ± 0.45 around the line; KEEP `sight`);
   - the post's tip at x ≈ -10.3 (tip exactly at y 10.7, z 10.1 ± 0.2; KEEP `post`).

   Rules for everything else:
   - Nothing may enter the box y ≥ 10.25, z 9.65..10.55 between x -10.5 and 14.0. In the blockout the ears (z ≤ 9.6 and ≥ 10.6) and everything else clear it.
   - Things beyond the post show inside the aperture's lower right in perspective.
     - The muzzle box's corner (y 9.8, z 9.8) shows as a small block there (`cmp_ads_zoom.png`). Accepted in the blockout.
     - y/z ≤ 9.5 (a 3.0 box) keeps the picture clean.
     - Don't go above 9.8.
   - The receiver, nut and well must stay at y ≤ 10.0 with z ≤ 9.2-9.4 ahead of x 14, or they crowd the ring's lower right.
5. **Pivots** (the kicks, the draw and the grip's rake):
   - `SHOULDER [14.3, 5.6, 8]`
   - `GRIP { angle 15, axis z, origin [14.3, 5.3, 8] }`
   - the reload's gun pivot `[9, 6, 8]`
   - `MAG_LIP` (moves with the magazine's front lip)
6. **Frame timing is tied to sounds.** Don't change the frame functions' windows, only their pivots and amounts.
   - Reload (MG34.yml Start_Mechanics, delayBeforePlay 8 / 45 / 59 = 88p - 4):
     - catch tug p 0.1-0.16, magazine off at 0.16;
     - hook at 0.555, latch at 0.6, slap at 0.62-0.68;
     - handle back 0.72-0.77, let go 0.80-0.815.
   - Draw (tools\sounds\guns\lmg.js, 40 ticks = 2.0 s):
     - settle at 0.42 (0.84 s);
     - magazine lifted at 0.6 (1.2 s) and pressed home at 0.645 (1.29 s);
     - handle at 0.7 (1.4 s), 0.76 (1.52 s) and 0.81 (1.62 s).
7. **GunFx clocks** (DonatingPhone config.yml `MG34: { shot: 0, draw: 40, fire: 5 }`):
   - The cooldown on the Default state is the draw (40 frames).
   - The reload clock is max(80, WeaponMechanics' reload): 80 ticks with rounds left, 96 from empty (the silent Firearm_Action's 8 + 8). That is why the reload dispatch has 96 frames.
   - No shot clock and no action clock, so **flags 1 and 2 are unused**. **Flag 0** (firing) gates the fire flicker together with key.use. wm-ammo.js counts 11 and 1011 among the 8 gated automatic entries, so keep `firing()` on both.
8. **Palette keys:**
   - tools\guns\skins.js has **no Veteran skins yet**, so no theme constrains the keys.
   - The KEEP keys this gun uses (never recolored by a skin; pg.js refuses): `post`, `sight`, `bore`, `flash`, `flashCore`. "flash2" is a part name here, not a palette key.
   - For future skins, the recolorable keys are `metal`, `metalL`, `metalD`, `dark`, `silver`, `mag`, `magD`, `magW`, `cream`, `tan`, `wood`, `woodL`, `woodD`, `blue`, `navy`, `leg`, `feet`, `star`.
   - Keep `blue` as the single accent key: one skin color recolors both the butt band and the leg inlays.
9. **Model limits:** every box and rotation origin within -16..32.
   - The blockout runs x -14.27..26.6 and y -4.3..18.1. The lowest point is a foot after rotation.
   - The flash, drawn FX back, stays within bounds while MUZZLE ≥ -16.5.
10. **Element rotations:**
    - The magazine steps and the grip use axis z; the legs and feet use axis x. All are single-axis `{ angle, axis, origin }`, a form the pack already ships.
    - The blockout can also rake the legs back 14° with the 26.x multi-axis form `{ x, z, origin }`. render-item.js draws it, but no shipped model uses it yet, so it is unchecked in the client. `cmp_legs.png` shows the difference is small. Use single-axis (`LMG_RAKE=0` in the blockout) unless it is checked in the client first.
11. **Display:**
    - First person (`rotation [0, -76, 0], translation [-4.2, 4.5, -1.6], scale 0.56`), third person, ground and fixed: unchanged. Checked in the blockout: the legs hang into the lower middle of the hip view, clear of the crosshair, and they don't clip in third person.
    - gui: re-framed for the shorter stock (section 1).
12. **Kit:** the blockout needs the proposed kit (the `plates` pattern, `deco`, `split`, `mats`). The current pg.js throws on `plates`. Everything else (boxes, parts, frames) runs on either kit.

## 6. Choices for the owner

- **Bipod. Realistic (recommended):** deployed and splayed, like the icon. It shows in first person under the barrel (`cmp_fp.png`), in the shop icon and in third person. **Cautious:** folded along the gas tube as now, but thick, black and blue-inlaid (`LMG_LAYOUT=safe`, `cmp_safe_fp.png`). The wiki text says "folded"; the picture shows them deployed.
- **Stock. Realistic:** 3.2 shorter (butt 26.6). **Cautious:** keep 29.8. Both keep every first-person number.
- **Shop icon. Cautious (recommended unless all nine change):** keep the side view every gun uses. **Realistic:** a 3/4 view like PG3D's gallery, `rotation [25, 150, -28], translation [-0.6, 0.4, 0], scale 0.42` (`blockout_gui_34.png`). It shows both legs, the muzzle's square bore and the magazine's light narrow face, as in the reference. Only worth it if every remade gun's icon goes 3/4.
- **Muzzle box size. Realistic:** 3.6 (a corner shows in the aperture's lower right). **Cautious:** 3.0 (a clean sight picture; reads less like the reference).

## Work files (`remake\work\lmg\`)

- Reference:
  - `ref.png` (PNG of the icon), `ref_x2.png`, `ref_x4.png`
  - `ref_annotated.png` (parts 1-12) with `annot_ref.json`
  - `ref_rot31.png`, `ref_rot_grid.png`, `ref_rot_rear.png` (leveled, gridded)
  - `ref_z_muzzle.png`, `ref_z_mid.png`, `ref_z_mag.png`, `ref_z_receiver.png`, `ref_z_rear.png`
  - `rot.js`, `rotc.js` (rotate and crop helpers)
- Ours now: `ours_full_gui.png`, `ours_full_side.png`, `ours_fp_hip.png`, `ours_fp_ads.png`, `ours_fp_reload_out.png` (p 0.3), `ours_fp_reload_rack.png` (p 0.75), `ours_fp_fire.png`, `ours_fp_sprint.png`, `ours_tp.png`.
- Comparisons: `cmp_gui.png`, `cmp_fp.png`, `cmp_ads_zoom.png`, `cmp_safe_fp.png`, `cmp_legs.png`, `blockout_gui_34.png`, `blockout_frames.png` (reload p 0.16/0.3/0.58/0.75, draw p 0.45/0.7, fire hip and aimed, sprint).
- Blockout (`proto\`):
  - `lmg_proto.js`. Env `LMG_LAYOUT=real|safe`, `LMG_RAKE=0` for single-axis legs, `LMG_GRAIN`.
  - `run.js <module> <tag> [style|real] [name=item|view|W|H|flags ...]`
  - `cur_lmg.js` (the current module; its sandbox renders are byte-identical to the real pack's)
  - Renders: `B_*` (real), `S_*` (safe), `N_*` (single-axis legs), `A_*` (the first pass: taller ears, metal grain 0.18).
