# Machine Gun (uzi.js) remake: design spec

The gun: PG3D's default primary "Machine Gun" (an MP5A3-style SMG). The remake brings it up to the Photon Shotgun's level of detail without changing the design.
- Module: `tools\guns\uzi.js`. Title `Uzi`, shown as "Machine Gun". Numbers 1 / 1001 / 2001 / 3001.
- Reference: `remake\refs\Machine_Gun\`. It has only 2 images, both 256 px WebP files named .png: the current Appearance and the Old appearance. There is no in-use screenshot. The page text says: "matte black", "a red firing selector near the centre", "a shoulder stock and a slightly curved magazine", "MP5A3-like, base more big, longer stock". On reload, "takes out the black magazine and replaces it with another one".
- Work files: `remake\work\uzi\` (the list is at the end).

**Recommendation in one line:** rebuild on blockout B (`work\uzi\proto\uzi_protoB.js`). B uses texel density 4 and black ink. It has a 2-unit longer front, chunkier sections and a receiver 1.8 units shorter behind the grip. The rear sight moves forward over the trigger (rearX 14.4 -> 12.6), as in the reference. Then add the detail pass in section 3 and the new `quilt` pattern. Option A is the cautious version of the same layout: the front gets longer but the rear sight stays where it is.

Blockouts B and A are real pg.js modules. They build with the actual kit through a sandbox (`proto\build.js`, a stored zip passed to `render-item.js --pack`) and render correctly in gui, fp, ads, sprint, reload, draw, fire and tp. ADS alignment holds in both. They are blockouts only: no final texture work.

---

## 1. What the reference looks like, part by part

The Appearance icon shows the gun's **right** side (-z in our model). The muzzle points up-right at about 33°. The view is nearly orthographic (checker squares and handguard height are the same at both ends) and slightly from above (the top faces show as thin strips). Our first person shows the **left** side (+z) and the top. So every side detail below goes on **both** faces, and the top needs its own detail.

`ref_annotated.png` numbers the parts 1-15 as used below. I measured positions along the gun axis on the 256 px icon (`measure.js`) and give them as a share of the overall length, muzzle = 0 %, butt = 100 %.

| # | Part (ref) | Ref position / size | Ours now | Recommended (B) |
|---|---|---|---|---|
| 1 | **Muzzle block**: a chunky black box sticking out in front of the sight block. It has a long **silver window** on the upper side, a **dark-gray slot** on the lower side and a front face with an inset square (bevelled bore). | 0-13 % with the sight block; about 55 % as tall as the front section | barrel stub 1.2 x 1.2 at x -4.2..-1.2 | x -6.3..-4.6, y 7.1..9.7, z 6.8..9.2. A neck at x -4.6..-4.4 (y 7.6..9.2, z 7.1..8.9). Bore centred on y 8.4 |
| 2 | **Front sight block**: a black block rising about 1 unit above the receiver line. A pale steel-blue chip sits on its top-rear corner (the hooded post). | about 13-16 % | thin hood ring on a small base at x -1.4..0.2 | block x -4.4..-2.9, y 7.4..10.9, z 6.85..9.15. Hood as now (0.5-thick walls, opening z 7.45..8.55, y 10.9..12.6, top to 13.1) at x -4.3..-2.9. Post x -3.85..-3.35, y 10.9..**11.8**, z 7.75..8.25. `sight` chip x -3.45..-2.95, y 12.15..12.65 |
| 3 | **Top rail**: a light lilac-gray strip along the whole top edge (receiver and front), with black lines above and below | full length | a 0.15 bodyHi line | side band y 9.45..10.45 (ink), plus light lips on the top edges (section 3) |
| 4 | **Tile band**: two rows of bevelled square tiles (light slate on navy, about 0.5-0.6 u each), on the front section just under the rail | from the band to the sight block | none | y 7.95..9.45, x -3.0..4.6, both sides. New `quilt` pattern (section 6) |
| 5 | **Handguard lower**: a big near-black mass with a slightly lighter strip at its top. It is the dominant shape of the gun. | about 36 % of the length, 2.5 u tall | 6.2 long, grooves | x -3.0..4.6, y 5.4..7.95, **wider than the tube** (z 6.45..9.55). Its top face is a visible ledge. Bottom bevel x -2.8..4.4, y 4.95..5.4 |
| 6 | **Band**: a vertical dark ring at the handguard's rear, with a light vertical highlight | at the mag well's front | none | x 4.6..5.3, y 5.0..10.6, z 6.35..9.65; bodyLight edge x 4.65..4.95 |
| 7 | **Receiver side** (behind the band): light-slate plates, then rail, black slot, light bar, black slot | the ref's receiver behind the well is short (≈ 20 % of the length) | flat body with one thin line; port on the right | plate x 5.3..13.8 (bodyLight). Bar x 5.6..10.6, y 8.65..9.3 (bodyHi). Slots y 8.45..8.65 and 8.1..8.45 (bodyDeep). Ejection port on the right only, x 6.2..9.4, y 8.5..9.35 |
| 8 | **Rear drum sight**: a pale steel-blue drum (a "+" profile from the side) in dark navy housing ears. It sits over the trigger and grip front, **not** behind the grip. | ≈ 67-69 % | 12.8..14.4 (behind the grip top) | B: base x 10.8..12.8 (y 10.45..11.2). Ears x 10.6..12.8 (y 10.45..12.7, z 6.7..7.05 and 8.95..9.3). Ring x 11.0..**12.6** (= rearX). Hubs x 11.3..12.1, y 11.2..12.0, z 6.5..6.7 / 9.3..9.5 |
| 9 | **Red selector**: a red bar (the lever) with one bright pixel near the well, and a red square ("F" mark) further back, both on the housing's light top strip | lever ≈ 59 %, mark ≈ 69 %, about 3.7 u under the top | one red bar over the grip | lever x 8.6..10.4, y 6.55..7.45; redHi texel x 10.0..10.25, y 6.95..7.2. Mark x 10.75..11.75, y 6.55..7.45. Both sides |
| 10 | **Housing trims**: a light strip along the housing top and a stepped light lower edge | under the receiver | none | strip y 7.5..7.95, x 8.4..13.8. Lower step y 6.3..6.55, x 8.4..12.4 |
| 11 | **End cap**: a dark vertical plate with a slot and a light pin | right behind the grip top | 15.6..16.6 | x 13.8..14.6, y 6.6..10.6. Latch slot x 13.95..14.45, y 8.0..9.2. Pin y 9.6..10.0 |
| 12 | **Stock**: a chunky A3 frame. A light top strut sloping down about 1.5 u to the butt, a light lower strut running diagonally from the cap's bottom to the butt's bottom, a **dark web filling** the space between them, and a tall butt plate with a light chip (sling point) | ≈ 20-23 % of the length; butt ≈ 4 u tall | thin black wire rails | top strut 5.2 long, rot -12° about the cap top. Lower strut 5.5 long, rot -24°. Webs (stock, z 7.45..8.55 / 7.5..8.5) between them. Butt plate y 4.2..9.4, pad 0.5. B: x 14.6..20.9 |
| 13 | **Grip**: near-black, flared at the bottom (palm swell). The front edge carries a stepped slate highlight. Rear rake ≈ 35°, front ≈ 16°. | top ≈ 71-77 %; about 4 u tall | a uniform raked box with a checker | rot 15° about (12, 6.3, 8). Upper x 10.8..13.2, y 3.4..6.3. Swell x 10.6..13.5, y 1.6..3.4, z 6.9..9.1. Base y 1.15..1.6. gripHi steps x 10.8..11.15 (y 3.6..6.0) and x 10.6..10.95 (y 1.8..3.3) |
| 14 | **Trigger guard**: a solid chunky block hanging in front of the grip, with a light trigger in the gap | ≈ 63-71 % | thin wire loop | front post x 8.4..9.0, y 4.5..6.3. Bottom bar x 8.4..11.4, y 4.5..5.1, z 7.3..8.7. Trigger (steel) x 9.7..10.2, y 5.3..6.3. Mag release paddle x 8.4..9.0, y 5.2..5.8 |
| 15 | **Magazine**: long, **only slightly** curved. Black body with a **wide light stripe** over its front half and a black floor plate with a light front-bottom chip. | about 7.4 u long, 2.9 u wide, ≈ 10° total sweep | 3 gray segments at -5/-15/-26° (≈ 15°), 5.9 u | MAG_TOP (6.85, 6.4). Segments [-4°, 2.3], [-9°, 2.2], [-15°, 2.2], width 2.8 (cx ± 1.4), z 7.1..8.9 (-0.04 per segment). Floor plate ± 1.6 x 0.6. Bottom reaches y ≈ -0.75 (was 0.6) |

**Proportions.** The reference's mag well sits at about 49 % of the length and its grip under the rear sight. Ours puts the well at 40 % and the rear sight 2 units behind the grip. A: well 40 %, rear sight unchanged. B: well 43 %, rear sight over the trigger and grip front, end cap right behind the grip, which is the reference's balance. Reaching 49 % would need the muzzle another ≈ 2.5 u forward, which crowds the crosshair in hip fire, so I stopped at B.

- Overall: B runs -6.4..20.9 = 27.3 u (now 26.85).
- Heights: receiver top 10.45 to handguard bottom 4.95 = 5.5 u, about 20 % of the length (ref 23 %, now 20 %).
- Widths: tube 2.3 u, handguard 3.1 u (ref chunkier than ours: a step out of 0.4 per side).

**What moving things breaks:**
- **Muzzle forward 2.05 (A and B):** every flash and flash2 box moves by DX = -2.05, and `MUZZLE` moves to [-7.55, 8.4, 8]. The gui, ground and fixed scales shrink: A 0.58 with translation [0.6, 0.4, 0], B 0.6 with [0.2, 0.4, 0], ground/fixed 0.56-0.58. All checked in renders. Hip fire puts the muzzle about 15 px nearer the crosshair at 640x400 (checked, clear).
- **Front post forward (-0.9 -> -3.6):** nothing in `aim()` depends on it. The sight picture gets slightly finer. The checked ADS renders are identical in framing.
- **Rear sight forward (B only):** `aim({ rearX: 12.6 })` (was 14.4). sightY, rearDepth and scale stay the same. The ADS render is identical in framing. Needs one in-client check (PLAYTEST).
- **Mag well 0.3 back and the longer mag:** MAG_TOP, MAG_DIR (-4°) and the reload travel (12, was 11) so the longer mag fully clears the well. The hide window 0.3-0.5 stays.
- **Charging handle 2.0 forward:** the slot (x -2.0..2.8) must still hold the 3.8 pull plus the stem (-1.7..-1.1 rests, pulled to 2.1..2.7).
- **GRIP pivot [12, 5.5, 8]** stays (draw, kick and reload rotate about the grip).

## 2. Colors (sampled from the Appearance icon)

I used k-means per region (`pal.js`), ignoring the black outline and shadow (47 % of the gun's pixels are near-black). Hex values are the sampled tones. "Key" gives the palette value I used in the blockouts.

| Material | Sampled tones (dark -> light) | Keys (blockout values) |
|---|---|---|
| Navy body (receiver, housing, handguard) | #0b0c11, #11131c, #1a1d28, #272c3b, #373e53 | `bodyDeep` [20,23,33], `dark` [26,29,40], `body` [42,48,66], `bodyMid` [58,66,92] |
| Slate trims (rail, plates, bars) | #4e556d, #636a7e, #767d92, #8d94a8, #a3a9ba (glint #bdc4d2) | `bodyLight` [104,113,140], `bodyHi` [163,170,189] |
| Tile band | dark cells #2d374f / #313c5b, light cells #555f7d / #687394, bevel #939aae | `bodyMid` + quilt (light = shade(col, ~1.45), glint ~1.75) |
| Handguard lower | #141824, #161b25, #181d29 | `bodyDeep` |
| Receiver side plates | #51576f, #848ca2, #a6adc0 | `bodyLight`, `bodyHi` |
| Grip | #0a0c11, #101319, #191b26, #23293b; highlight #363e51 | `grip` [26,30,43], `gripHi` [58,66,90] |
| Stock | #111218, #20222c, #434756; struts #676b7e, #8f94a7 | `stock` [30,33,45]; struts `bodyLight` |
| Magazine (neutral cool gray, less blue than the body) | body #16171b / #202125; stripe #5d6472, #717989, #8990a1; highlight #9aa1b1 | `magDark` [30,32,38], `magMid` [88,95,110], `mag` [113,121,137], `magHi` [156,164,180] |
| Muzzle block (neutral black and silver) | #17171b, #343539, #5d5e63; silver #a5a6b0, glint #cbced8 | `muzzle` [24,24,29], `slot` [60,61,68], `silver` [168,170,182] |
| Sights (pale steel blue) | #515e70 (shade), #8299b5, #849bb6, #a8b7c7, #adbed2 | `sight` [168,184,202] (a KEEP key) |
| Red selector | ≈ #6e1a1c (shade), #a52827 (median), #c62427, #d12930 (brightest) | `red` [168,38,40], `redHi` [226,70,70] |
| Trigger, pins, knob | #7c839c | `steel` [124,131,156] |
| Outline | #000000-#0b0c11 | spec.ink [8,9,13] (was the default [16,18,24]) |
| Bore | — | `bore` [10,11,15] (KEEP) |
| Flash | (unchanged) | `flash` [255,196,64], `flashCore` [255,248,210] (KEEP) |

The Old appearance, a gray straight-mag version, is a possible future skin ("Old Machine Gun"). It isn't needed now.

## 3. Details to add (both sides unless noted)

- **Outlines:** black ink on every box (spec.ink [8,9,13]). Drop the current `ink: 'bodyLight'` everywhere: PG3D has black lines, and light outlines are the main reason ours reads pale and flat.
- **Texel density 4** (spec.density 4). A 1-texel outline is then 0.25 u, close to PG3D's line weight; at density 2 it is 0.5 u. The texture becomes 256x256 (it was 128) and stays at 256 with the blockout's decals.
- **Top (first person sees it most):**
  - Light lips along both top edges: bodyHi, no outline, x -3.0..10.6, y 10.45..10.6, z 6.85..7.3 and 8.7..9.15.
  - Ribs on the receiver top, our addition (the reference's top stair-steps are aliasing): x 5.9, 7.0, 8.1, 9.2 (0.6 long, y 10.45..10.75, z 7.35..8.65, bodyMid, ink).
  - A bodyDeep seam down the middle of the front top: x -2.9..4.5, z 7.85..8.15.
  - The band's top at 10.6 and the end cap's top at 10.6 add steps to the silhouette.
- **Front:**
  - The tile band (item 4).
  - The handguard ledge: an up-face of bodyMid on the wider handguard.
  - A dark top strip on the handguard sides (y 7.35..7.95, no outline).
  - The bottom bevel.
- **Muzzle block:**
  - Silver window x -6.05..-4.85, y 8.5..9.5 (ink). At least 1.0 tall, or density 4 leaves only one silver row.
  - Slot x -5.85..-4.95, y 7.35..7.85 (slot gray, no outline).
  - Front face: a slot-gray bevel (west, y 7.35..9.45, z 7.05..8.95) and the 1x1 bore.
- **Charging tube** (+z only): x -2.8..4.4, y 9.2..10.3, z 9.15..9.7. Its slot is x -2.0..2.8, y 9.55..9.95, bodyDeep. Knob: steel with `serr`.
- **Receiver plates** and the **ejection port** (right only): item 7.
- **Housing:**
  - Light top strip and stepped lower trims (item 10).
  - Selector lever and F mark (item 9).
  - **Push pins**: steel, 0.5 squares at y 6.85..7.35, x 11.6 and 13.0 in B (12.6 and 14.6 in A).
  - **Paddle mag release** behind the well.
  - Mag-well lip: bodyLight, y 5.6..6.0.
- **End cap:** the latch slot and the pin.
- **Rear sight:** dark ears with a stepped top, the pale drum ring, and side hubs that make the "+" profile.
- **Stock:**
  - The two light struts and the recessed dark web (struts z 7.05..8.95 stand 0.4 proud of the web on each side). This gives PG3D's layered look while keeping the A3 frame.
  - Butt plate with a bodyLight front edge (x +0.05..0.35 into it).
  - Dark pad and a steel sling chip near the top rear.
- **Grip:** `speck` texture on the sides, gripHi stepped strips along the front edge, dark base cap.
- **Magazine, per segment:** the black body, plus three decals on each side:
  - the wide `mag` stripe over the front half (cx -1.25..-0.05),
  - a `magHi` front edge (cx -1.25..-0.95),
  - a `magMid` shade line at the stripe's rear (cx -0.3..-0.05).
  - The stripe starts 0.9 under the top of the first segment (that part sits hidden in the well). Floor plate with a magHi chip at the front-bottom.
- **Glow:** none. The reference has no glowing part; the red selector is the gun's only accent, and making it glow would change the design. If the owner wants one in the client, the redHi texel is the place.
- **Decal technique** (the blockout's `side()` helper): a box with `dirs: ['north','south']` set 0.05 proud of the faces it sits on. When stacking, use 0.03 for the plate under and 0.06 for the bars on top so nothing z-fights. A decal under 0.75 u tall at density 4 is all ink: give it `outline: false`, or make it at least 1.0 u.

## 4. What the current model gets wrong or lacks

1. **Pale and flat.** Light ink (bodyLight) outlines everywhere, while PG3D uses black lines. Mid-slate faces where the reference is near-black (handguard, grip, stock, mag body).
2. **Coarse texels.** At density 2 the outline is 0.5 u, so small parts are all outline and patterns read as big blocks.
3. **Front too short and thin.** The handguard is 6.2 u (the reference's front section ≈ 9 u). The barrel is a 1.2 u stub (the reference has a 2.2-2.6 u black muzzle block with a window). The front sight is a thin ring, not a solid block.
4. **Handguard is wrong.** Vertical dark grooves that the reference doesn't have, and none of its tile band, top rail, wide dark lower, ledge or rear band.
5. **Receiver sides lack the reference's plates and stamped slots.** The rear sight sits 2 u behind the grip, but the reference has it over the trigger.
6. **Magazine.** Mid-gray with dark segment outlines and too curved (-26° last segment). The reference's mag is black with a broad light stripe, longer and straighter.
7. **Stock.** Thin black wire rails. The reference has a chunky frame of light struts, a dark web and a tall butt.
8. **Grip and guard.** The grip is a uniform checkered box; the reference's is flared, near-black, with stepped highlights. The trigger guard is a thin wire; the reference's is a chunky block.
9. **Missing details:** pins, paddle release, end-cap latch, sling chip, drum hubs, the F mark, the muzzle face bevel.
10. **Stale comment:** uzi.js's header says "Cops of difficulty 3 hold it". Since 2026-10-06 cops use models 9 / 8 / 7 / 5 (core.sk `cop-model`), so no cop holds the Machine Gun. Fix the comment.

## 5. Hard constraints

- **Return exactly** `{1, 1001, 2001, 3001}` (make-item-art.js throws otherwise):
  - 1 = `byContext('', drawn)`, where `drawn = cooldown('', 20, draw)` and `drawn.fallback = firing('', fire(1))`.
  - 1001 = `byContext('ads', firing('ads', fire(0.45, AIMED), AIMED))`, AIMED = `{ hide: ['stock'] }`.
  - 2001 = `byContext('sprint', composite('sprint'))`.
  - 3001 = `byContext('', cooldown('', 41, reload))`.
- **Part names** (the frames use them; keep them and keep them separate):
  - `body` (everything fixed),
  - `stock` (hidden while aiming),
  - `bolt` (the reload pulls it +3.8 x),
  - `mag` (the reload slides it along MAG_DIR by d and hides it for p 0.3-0.5),
  - `flash` and `flash2` (shown only in fire poses, turned 45° about MUZZLE). `hidden` and `noFull` are both ['flash', 'flash2'].
  - The `gun` pose key moves all parts about GRIP [12, 5.5, 8].
  - No new moving part is required. If one is added (e.g. a separate trigger), it must not be hidden or moved by an unrelated pose.
- **States:** '' (Default), `ads` and `sprint`. Sprint stays `{ rotation [-15,-40,20], translation [-4.0,2.0,-1.6], scale 0.52 }`, and firstperson keeps `{ [0,-78,0], [-4.6,3.1,-0.8], 0.52 }` (checked: B frames fine).
- **Aim:** `aim({ sightY: 11.8, rearX: 14.4 (A) | 12.6 (B), rearDepth: 1.1, scale: [1.6, 2.4, 2.4] })`.
  - The post's top must be at y = 11.8, centred on z = 8 (0.5 wide).
  - The rear ring's rear face must be at x = rearX, with its opening (z 7.4..8.6, y 11.2..12.4) around the line.
  - The hood's opening (z 7.45..8.55, y 10.9..12.6) must stay clear.
  - **Nothing between the sights may rise above y 11.2 inside z 7.4..8.6.** Ribs top at 10.75, lips 10.6, band and cap 10.6.
  - The sight line passes through the rear ring (a ring of `sight` boxes, drawn black from behind because their walls are all ink), the hood (dark) and the post (`post`).
  - Since the post's x isn't in `aim()`, a front moved forward needs no aim change; a moved rear sight does (B).
- **Flags:** only flag 0 (GunFx's firing flag), through `gun.firing` on 1 and 1001. wm-ammo checks that 1 and 1001 have their `keybind_down` under flag 0's on_true. The Machine Gun has no flag 1 or 2: it has no shot clock, so the Default cooldown is only the draw.
- **GunFx clocks** (DonatingPhone config.yml, `plugin\resources` and `server\plugins\DonatingPhone`; gunfx.js checks the status line): `Uzi: { shot: 0, draw: 20, fire: 5 }`, which matches `cooldown('', 20, draw)`.
  - The reload clock is WeaponMechanics' reload: 41 ticks empty (Firearm_Action Open 5, reload 31, Close 5), 31 with rounds left.
  - Keep the reload pose timed to the sounds: Open click at p 0, mag_out at 5/41 = 0.12 (out 0.12-0.30), mag_in at 32/41 = 0.78 (back 0.5-0.78, slap 0.78-0.85), Close at 36/41 = 0.88 (handle release 0.88-0.92), level again by 0.96.
- **KEEP keys** (pg.js; never recolored by skins): this gun uses `post`, `bore`, `flash`, `flashCore`, plus `sight` if adopted (recommended for the drum and the chip). skins.js must never list them.
- **Skin keys** that tools\guns\skins.js themes for this gun must stay in the palette, or paintSkin throws:
  - desert: body, bodyLight, bodyHi, dark, grip, stock, mag, magHi, magDark
  - woodland: body, bodyLight, bodyHi, stock, mag, grip; pat body, stock, mag = camo; theme.camo
  - carbon: body, bodyLight, bodyHi, stock, mag, magHi, red, redHi; pat body, stock, mag = carbon
  - So keep all of `body, bodyLight, bodyHi, dark, grip, stock, mag, magHi, magDark, red, redHi`.
  - **New keys stay navy or black under the old themes.** Rendered: `cmp_skins_blockoutB_oldthemes.png` shows the desert and woodland handguard and tile band still navy. So the three themes must get the new keys (tested values in section 7). The looks uzi_desert (common), uzi_woodland (rare) and uzi_carbon (epic) are released: never rename or remove them.
- **Density changes skins:** `camo` and `carbon` work in texel coordinates, so at density 4 the camo blotches and carbon weave come out half as big. Check the three looks in the client. They read fine in the renders.
- **Limits and names:** every box and rotation origin within -16..32 (pg.js throws; B's lowest is the flash at x -13.45). No "Pixel Gun" in names. Nothing extracted: everything is drawn from the wiki pictures.
- **Unchanged outside the module:** feather.json's `hand_animation_on_swap false` lives in make-item-art.js, which needs no changes. Shop icons, crates and the skins' item definitions all use model 1 and `_full`, so the gui view is the shop icon.

## 6. Kit needs (pg.js)

1. `density: 4` (per gun, already supported).
2. **A new pattern, `quilt`,** for the tile band:
   - 2x2-texel cells in two staggered rows (odd rows offset 1 texel), alternating base and `shade(col, 1.45)`.
   - Each light cell gets a `shade(col, 1.75)` top-left texel and a `shade(col, 1.2)` bottom-right texel.
   - Derive every color from `col` so skins theme it. The blockout uses `carbon` as a stand-in.
   - Rule for any new pattern: no fixed colors, or skins can't recolor it.
3. Optional: a shared decal helper like the blockout's `side(x0, y0, x1, y1, z0, z1, key, { p })`.

## 7. Skin themes to extend (tested on blockout B, `cmp_skins_blockoutB_newkeys.png`)

- desert: `bodyDeep [98,78,50]`, `bodyMid [156,130,90]`, `gripHi [156,126,86]`, `magMid [142,120,82]`
- woodland: `bodyDeep [38,46,28]`, `bodyMid [62,76,44]`, `gripHi [74,84,54]`, `magMid [66,80,48]`; pat `bodyMid: 'camo'`, `bodyDeep: 'camo'`
- carbon: `bodyDeep [24,25,28]`, `bodyMid [46,48,54]`, `gripHi [150,255,60]` (lime like its other accents), `magMid [44,46,50]`; pat `bodyMid: 'carbon'`, `bodyDeep: 'carbon'`
- Metal stays natural in every look: `muzzle`, `silver`, `slot`, `steel`.
- These are in `work\uzi\proto\skins_uzi_suggest.js`.

## 8. Checks for the builder

- `make-item-art.js --only uzi`, then `render-item.js`:
  - `donating:item/gun_uzi_full` gui 512;
  - `feather@1` fp, also with `--cooldown 0.6` (draw) and `--fire --flag 0 --time 0.1/0.6`;
  - `feather@1001` fp (post on the crosshair, inside the ring);
  - `feather@3001` fp with `--cooldown 0.94 / 0.75 / 0.62 / 0.3`;
  - `feather@2001` fp;
  - tp;
  - the three skins' `_full`.
- Bots: wm-ammo (the feather.json numbers, the flag 0 gating, the pack), gunskins, gunfx.
- Client: PLAYTEST 179/181 (frames, looks) and the ADS picture if rearX moved.

## Files (remake\work\uzi\)

- **Reference:**
  - `01-UziWeapon_icon1_big.real.png` and `02-Machine_Gun.real.png`: the WebP refs decoded with alpha.
  - `ref_cur_x4.png`, `ref_old_x4.png`, `ref_grid16.png` (grid every 16 px for measuring).
  - `ref_annotated.png`: parts 1-15.
  - Zooms: `ref_z_front`, `ref_z_muzzle`, `ref_z_checker`, `ref_z_center`, `ref_z_sights`, `ref_z_maggrip`, `ref_z_grip`, `ref_z_stock`.
- **Current renders:** `ours_full_gui`, `ours_full_side`, `ours_fp_hip`, `ours_fp_ads`, `ours_fp_fire`, `ours_fp_reload_open`, `ours_fp_reload_out`.
- **Comparisons:**
  - `cmp_ref_current_blockout.png` (ref | now | A), `cmp_ref_A_B.png` (ref | A | B),
  - `cmp_fp_current_blockout`, `cmp_ads_current_blockout`, `cmp_fp_A_B`, `cmp_ads_A_B`,
  - `cmp_left_current_blockout` (the +z side),
  - `cmp_reload_fire_blockout` (A), `cmp_frames_blockoutB` (draw, fire, reload open/out/in, sprint),
  - `cmp_skins_blockoutB_oldthemes`, `cmp_skins_blockoutB_newkeys`,
  - `blockout_annotated.png`.
- **Blockouts:** `proto\uzi_protoB.js` (recommended), `proto\uzi_proto.js` (A), `proto\build.js` (sandbox: `node build.js <module> <out>` writes `<out>.zip`, then `render-item.js ... --pack <out>.zip`; `SKINS=<file>` also paints skins).
- **Helpers:** `img.js`, `pal.js`, `measure.js`, `compose.js`, `annotate.js`, `reds.js`.
