# Sniper Rifle remake: design spec (tools\guns\sniper.js)

Target: PG3D's default **Sniper Rifle** (wiki: "a simple, wooden sniper rifle", a left-handed M40A1, "a metal barrel
and scope", bolt on the LEFT, 10x scope, the clip comes out of the bottom on reload), drawn the way its **current
Appearance** icon looks (orange wood, blue steel everywhere, a heavy square barrel, a black-rimmed objective with a
blue lens, a silver bolt) at the Photon Shotgun's level of detail. Hand-made from the wiki's pictures; nothing taken
from the game; never named "Pixel Gun".

A working prototype of everything below exists and was rendered (gui, side, tp, first person hip / shot / bolt /
reload / ADS at 16:9 and 21:9, elevations, the Arctic skin):
`scratchpad\remake\work\sniper\sniper-proto.js` (a full module in the prototype kit's format: `style: 'pg'`, `mats`,
`deco`, `split`; frames copied from the repo's sniper.js with only the magazine pivot moved). Preview it with
`tools\node\node.exe work\style\proto\preview.js work\sniper\sniper-proto.js sniper <prefix> --views gui,side,tp,fp,fpads,fpreload`.
The builder can start from it; every number in this spec is in it.

## Work files (`scratchpad\remake\work\sniper\`)
- `annot-ref01-parts.png`: the current Appearance x4 with 9 numbered parts and sampled colours.
- `annot-ref05-firstperson.png`: PG3D in use (2015 look) x3: eyepiece checker glass, the L bolt handle, the receiver.
- `annot-ref06-scopeview.png`: PG3D's 10x scope view (window, reticle, ranging ladder).
- `annot-profile-units.png`: side profiles in our units, three rows: PG3D (shop picture unrotated 37 deg), ours
  today, the proposal; grid every 4 units, bore and sight lines.
- `annot-icon-compare.png`, `annot-fp-compare.png`: Appearance vs ours vs proposal (icon; first person).
- `blueprint-left.png`, `blueprint-top.png`: the proposal's flat elevations with the ADS limits drawn (magenta: the
  window's lower edge in front of the lens; orange: the screen's lower edge behind the eyepiece; cyan: the side-edge
  limit; yellow: the bolt handle's sweep).
- `proto\p5-*.png` (the final prototype renders), `proto-sheet.png`, `cmp-reload.png`, `cmp-arctic.png`.
- Zooms: `ref01-x4.png`, `ref01-scope-x10.png`, `ref01-butt-x10.png`, `ref01-muzzle-x14.png`, `ref01-forend-x10.png`,
  `ref05-fp.png`, `ref05-scope-x3.png`, `rot07.png` (the side view unrotated), `rot01.png`.
- Ours today: `ours-full-gui.png`, `ours-side.png`, `ours-tp.png`, `ours-fp-hip.png`, `ours-fp-ads.png`,
  `ours-fp-ads-219.png`, `ours-fp-shot.png`, `ours-fp-bolt.png`, `ours-fp-reload-bolt.png`, `ours-fp-reload-mag.png`,
  `ours-elev-left|right|top.png`.
- Tools: `boltcheck.js` (the handle's clearance under the eyepiece through the lift and pull), `limits.js` (the ADS
  limits table and the blueprint lines), `umap.js` (a class map of a rotated reference in model units), `pal.js`
  (palette sampling), `mkdef.js` + `def-*.json` (flat elevations through render-item.js `--def`), `comp.js`, `row.js`.

Note on previews: `tools\render-item.js` has no back-face culling, so in every ADS preview the window shows the lens's
outward (west) face from behind (cyan today, blue in the proposal). The client culls it: the world shows through.

---

## 1. What the reference looks like, part by part (our units)

Our frame: 1 unit = 1/16 block, the gun along x, muzzle toward -x (face at x = -16), butt pad at 32, sight line
(the scope's axis) y = SY = 12.8 on z = 8, bore y = 8.6. +z = the gun's LEFT side = the **south** faces = what first
person sees (and where PG3D's bolt is).

Measured from the side view (`rot07.png`, the shop picture unrotated 37 deg, 48 units = butt to muzzle; it's a
perspective render, so +-0.5 unit) and checked against the current Appearance (`01`, a strong perspective from the
front-left, used for shapes and colours, not lengths):

| Part | PG3D | Ours today | Proposal |
|---|---|---|---|
| Overall | 48 long | 48 (-16..32) | keep 48 |
| Barrel | old art: thin (~1); **current: heavy square, ~2/3 of the forend's height**, one long gradient, no bands | 1.4 square, 3 chrome bands | **2.0 square** (y 7.6..9.6, z 7..9), x -14.2..6.0, no bands |
| Muzzle | a bigger dark block, front face a hollow square (ink frame, grey ring, black bore), a small front-sight post on top | cap 1.7 square | block -15.98..-14.6, 2.6 square; collar -14.6..-14.2 (2.3); bore 1.0 square; post base -15.5..-14.7 y 9.9..10.2, blade -15.3..-14.9 to **y 10.5** |
| Barrel exposed | ~15 units (31%) | 12.8 | 11.0 + the muzzle (forend tip at -3.2) |
| Forend | encloses the barrel (the barrel exits its front face low); current art: the underside **steps up toward the tip**, a dark front | thin shelf 6.1..8.5 under a half-sunk barrel | x -2.0..6.6, top **9.9**, bottom 6.8; steps under it to 6.4 (x 1.0..6.6) and 6.0 (x 3.8..6.6); end-grain tip cap -3.2..-2.0, y 7.0..9.75 |
| Stock under the action | wood level with the forend (receiver inletted) | top 8.3 | top **8.6** (the port at 8.85+ must stay visible: section 5), bottom 5.6, x 6.6..18.6 |
| Magazine | ~x 11.3..15.8, hangs ~1.5-2 below, a big blue-steel box | 9.4..12.4, mostly hidden | **10.9..14.5**, body y 3.8..7.6, floor plate 3.3..3.8 (x 10.7..14.7) |
| Trigger guard | ~15.8..18, just behind the mag | 13..17.2 | **14.8..18.4**, y 4.2..5.6; trigger at 16.3..16.8 |
| Grip | **none**: a straight wrist, then the belly steps down to the butt | a raked pistol grip down to 2.6 | wrist x 18.6..21.2, y 5.6..9.3 |
| Belly | 3-4 voxel steps down to a tall butt | one heel step | 5.6 (wrist) / 5.0 (x 21.2) / 4.4 (x 24.4) / 3.8 (x 27.6) |
| Butt | ~6.5 tall, a comb step up at x ~22, top line rising toward the comb | 3.4..9.7 + comb 9.7..10.6 | 3.8..**10.6**, comb x 22.6..29.6 to **11.4** |
| Pad | dark brown rubber + a light steel spacer line | white spacer, black pad | spacer 30.85..31.15 (y 3.6..10.7), pad 31.15..32 (y 3.5..10.8) |
| Scope | x ~1.6..18.6; objective bell the biggest (and the hero of the icon), rings + turret dark cubes, eyepiece box | 1.8..16.8 | keep 2.0..16.8 (rearX fixed, section 5) |
| Objective | big bell, thick black front rim, rounded blue lens | bell ho 1.95, a cyan block standing 0.8 out in front | bell x **2.0..5.0, ho 2.2**, west faces black; lens **recessed** at 2.2..2.6 |
| Main tube | steel-blue | black, ho 1.5 | ho 1.5 (keep: HI + 0.3) |
| Rings | dark navy cubes on the receiver | chrome, on posts | x 7.0..8.4 and 12.2..13.6, ho **1.8**, dark; bases 10.6..11.1 |
| Turret | a dark block on top with a lit cap | chrome cap | base 9.2..10.6 y SY+1.5..+2.0; cap 9.0..10.8 to SY+2.7, ribbed |
| Eyepiece | 2015 first person: the big near block, its glass a **3x3 blue checker** | rubber ho 1.7, teal glass | steel collar 14.2..14.9 (ho 1.75) + ribbed rubber 14.9..16.8 (**ho 1.8**); checker glass (noads) |
| Bolt | silver, **L-shaped**: out of the receiver's left side, straight down over the wood, a square knob | a rod drooping 22.5 deg + a knob | arm x 15.2..16.0, y 8.7..9.3, z 8.9..9.9; drop 15.25..15.95, y 7.0..9.3, z 9.4..9.9; knob 14.95..16.25, y 6.2..7.3, z 9.35..10.55; **no element rotation** |
| Receiver | a long dark box on the wood under the scope | 6.4..16.6, y 8.3..10.4 | 6.4..**17.6**, y 8.3..**10.6**; recoil-lug block 5.6..6.8 (y 8.0..10.9, z 6.8..9.2); shroud 17.6..18.6 |
| Wood width | chunky | 2.3-2.4 | forend/bed z 6.7..9.3 (2.6), wrist/butt 6.75..9.25 |

Kept on purpose (moving them breaks things, section 5): SY 12.8, HI 1.2, BORE 8.6, rearX 16.8, the bolt axis
(15.6, 9.2, 8), the port and chamber (x 10..14, y 8.85..9.95), the 48-unit length and the bounds. PG3D's scope runs
~1.8 units further back (to ~18.6): not copied, because rearX moves the aimed view and an eyepiece over the bolt's
path would collide with the lifted handle.

## 2. Colours (sampled from the Appearance icon; the render is lit, so palette values are a step brighter)

Sampled with `pal.js` (k-means per material) and pixel histograms on `01-Hunter_Rifle_icon1_big`:

| Material | Sampled tones (lit render) | Proposal palette (key: value) |
|---|---|---|
| Wood, lit side/top | #b5601e, #a7571d, #974c18, #864215, #793810 | wood #c46822 (196,104,34); woodL #e28634 (226,134,52) |
| Wood, undersides / risers | #683210, #582909, #46240a | woodD #803e14 (128,62,20) |
| Wood, grain marks / end grain / seams | #3e2415, #2b1c0e, #382519 | woodDD #46240e (70,36,14) (also the wood ink) |
| Barrel / receiver / mag steel | glint #cbe4f4, #b3cfe2, #8aa8bf; base #6a849b, #4f5b69; low #313a44 | gun #5c768e (92,118,142); gunL #96b4cc (150,180,204); gunD #283442 (40,52,66) |
| Mag steel (darker) | #667a8f, #3f5367, #2d3f51, #21313f | (gun / gunD with the band) |
| Scope steel | #6184a4, #405c7b, #2d445d, #273745, #172430 (rings) | scope #3e5a7a (62,90,122); scopeT #6c90b4 (108,144,180); rings on gunD |
| Bolt, trigger, studs, floor plate (silver) | #cbe3f3 glint, #aec1cf, #88a2b8 | chrome #b8ccdc (184,204,220); chromeD #788ea4 (120,142,164) |
| Objective lens | #78a0c2 / #6fa3cf light, #5082b0 mid, #3d668d dark, glint #c1d2e3 | lens #548cc4 (84,140,196), glows; lensB #c8e6fa (200,230,250) |
| Eyepiece glass (2015 first person) | #0c4c7c, #1e64a0, #64a0c8 | glass #144c7c (20,76,124); glassB #64a0c8 (100,160,200) |
| Pad / spacer | #2b1c0e, #382519 / #aec1cf | pad #2c1e16 (44,30,22); spacer #b0c4d4 (176,196,212) |
| Funnel inside, rim | near-black | scopeIn #0a0c10 (unchanged); rubber #1a1e24 |
| Ink | #010001 (pure black on metal), dark brown on wood | kit default black; wood boxes `ink: 'woodDD'` |

Unchanged: brass #e4b84e / brassD #a87c2c, bore #08080a, reticle #060608, flash #ffc440, flashCore #fff8d2.
Materials in the proto: wood* wood; gun, gunL metal; gunD dark; chrome*, spacer chrome; scope, scopeT metal (the tube
boxes `mat: 'chrome'`); scopeIn, bore, reticle, lensB, glassB flat; lens, glass glass; rubber, pad rubber; flash* glow.

## 3. Every detail to add (all in the proto)

Barrel and muzzle
- Barrel: `pat: 'chrome2'`, `mat: 'chrome'` (quantised bands: a glint band along the top quarter of each side, light
  up face, dark down face) - the Appearance's one long bright streak. No bands/rings.
- Collar step -14.6..-14.2 (gunD) and the muzzle block (gunD, up face gun): silhouette steps.
- Muzzle face (west): `inset` decal z 6.95..9.05, y BORE±1.05 in gun (the grey ring inside an ink frame) + the bore box
  (1.0 square, black, 0.02 proud).
- Front sight: a gunD base (y BORE+1.3..+1.6) and a gunL blade with a chrome top (to BORE+1.9 = 10.5).

Forend and stock (wood: `W = { all: wood, up: woodL, down: woodD }`, `ink: 'woodDD'`)
- Forend body one box (no vertical seams on the side); the two steps under it as separate boxes with `ink: 'woodD'`
  (soft horizontal seams that read as grain, the PG3D stepped underside with dark risers).
- A long routed slot near the top of each side: `inset` x 1.0..6.2, y 8.7..9.45, woodD (the dark slot in the
  Appearance's orange face).
- Knot dashes (`slots`, vertical, 1-3 each): forend x -1.6..0.4 (y 7.2..8.0) and 4.0..6.2 (7.2..8.2); bed x 7.0..10.4
  (6.0..7.0); butt x 22.0..24.6 (6.2..7.4) and 26.4..29.6 (5.8..7.0).
- Tip cap: woodDD with grain (the dark front of the Appearance's forend).
- Butt: one box 21.2..30.85 (y 5.0..10.6) + the belly steps under it (`ink: 'woodD'`); a routed slot x 25.6..30.3,
  y 9.2..10.0; the comb box woodL with grain.
- Wrist checkering (optional, not in PG3D's art): 0.02-proud panels x 18.9..21.0, y 6.1..8.9 on both sides, woodD
  `pat: 'check'` (a low-contrast 1-texel checker).
- Pad: `slots` n 6 across its rear face (ribs); spacer: a 0.3 light-steel slab, no outline.
- Sling studs (chrome): under the forend x 0.0..0.8 (y 6.3..6.8), under the butt x 28.4..29.2 (y 3.3..3.8).

Action
- Receiver: `split: { x: [10, 14] }` (panel seams either side of the port), a 2x2 screw (`rivets`) at the front
  (x 7..8, y 8.9..9.9) and one at the rear top (x 15..16, y 9.9..10.4); the kit's bevels give the lit top edge.
- Recoil-lug block 5.6..6.8 (gunD, 2 small screws a side): hides the 1.3 step from the forend down to the bed.
- Ejection port (black, `ink: gunD`) and the bolt track (black line) on the left - unchanged positions.
- Bolt shroud 17.6..18.6: `ribs` (a turned-metal look).
- Trigger guard: three gunD boxes (bar + two posts); the trigger chrome, raked 22.5 deg (unchanged shape).
- Magazine: gun with a gunL `band` (y 5.0..5.5: the Appearance's light band), one `slots` seam (y 4.2..4.6), a chrome
  floor plate wider by 0.2 all round.

Scope
- Ring bases on the receiver (gunD), rings ho 1.8 in gunD with gun tops, two 2x2 clamp screws on each ring's **top**
  face (on top, never on the sides: section 5's side-edge rule).
- Objective bell: west faces `scopeIn` (the thick black PG3D rim), sides chrome2; a lit bevel ring 5.0..5.4 (ho 2.0,
  scopeT), a step 5.4..5.8 (ho 1.8), the main tube chrome2, a steel collar, the rubber eyepiece (`mat: rubber` =
  knurl texture).
- Lens recessed 0.2 in the bell (its sides hidden in the walls; the octagon corner slabs now start at the bell's
  front, 2.0, so they round the lens face from the front), `mat: 'glass'` (darker lower right, a white glint top
  left), glowing; an extra lensB glint chip 0.02 in front.
- Turret: a gunD base and a ribbed cap (`ribs` on sides and ends), gun top.
- Eyepiece glass (noads): a 3x3 checker `stamp` of glass / glassB in an ink rim + the glassB glint (PG3D 2015 first
  person). Windage turret (noads, right): ribbed the same way.
- Reticle: the duplex posts unchanged + **3 ranging ticks** on the lower thin post (PG3D's ladder): at
  y = SY - k·HI, k = 0.24 / 0.34 / 0.44, half-width 0.06, half-thickness 0.013, XP 2.75..2.85, east face only.

Glow: only the lens (and the flash). PG3D's sniper has no other light; don't add LEDs.

## 4. What ours gets wrong or lacks

1. A raked **pistol grip** PG3D's rifle doesn't have (it has a straight wrist and a stepped belly to a tall butt).
2. **Colours**: dull brown wood and grey/black metal vs PG3D's saturated orange wood and blue steel everywhere; a
   white spacer vs a light steel one; a cyan lens vs a blue one.
3. **Barrel**: thin (1.4) with three chrome bands vs a heavy square barrel with one long gradient; the muzzle lacks the
   hollow-square face and the front-sight post.
4. **Forend**: a thin shelf under a half-sunk barrel; PG3D's forend is tall, encloses the barrel and steps up to a
   dark tip.
5. **Scope**: black with chrome rings on posts; PG3D: steel-blue, dark rings sitting on the receiver, a big objective
   with a thick black rim around a recessed rounded lens (ours sticks 0.8 out in front as a cyan block).
6. **Eyepiece glass**: plain teal; PG3D's is a 3x3 blue checker.
7. **Bolt handle**: a drooping rod and knob; PG3D's is an L (out, then down, a square knob). Found while checking:
   **today's knob clips into the eyepiece by ~0.3 units** while the bolt lifts (`boltcheck.js`: its knob corner reaches
   y 11.39 at z 9.56, the eyepiece's bottom is 11.1). The proposal's L clears it by 0.075 through the whole lift.
8. **Magazine** small and mostly hidden; PG3D's is a big box clearly below the wood in front of the guard (ours sits
   ~1.5 units too far forward; the guard ~1.7 too far forward).
9. **Butt** too low for PG3D's line (the comb and butt top sit ~1 unit higher in PG3D).
10. **Detail**: 2 texels a unit, one flat tone per face, no seams, bevels, screws, grain dashes, knurling or ribs.
11. Not changed on purpose: PG3D draws the gun much bigger in first person; ours stays at its size (the owner made
    every gun 20% smaller in first person on 2026-09-29). PG3D's scope view is a round ~85% window with thin white
    lines; ours keeps its octagon (~55%) and black duplex (readable on bright skies), adding only the ladder ticks.

## 5. Hard constraints for the rebuild

Returns and states
- `module.exports` returns exactly **{ 13, 1013, 2013, 3013 }** (make-item-art.js GUNS.sniper): 13 = Default (draw /
  action / shot), 1013 = Scope, 2013 = Sprint, 3013 = Reload. Model name **`gun_sniper`** (the skins' models are
  `gunskin/sniper/<look>/<rest>`).
- States: `ads: aim({ sightY: SY, rearX: 16.8, rearDepth: 0.45, scale: [0.41, 4, 4] })`,
  `sprint: { rotation: [-20, -25, 0], translation: [-9.5, 2.4, 1.4], scale: [0.5, 0.5, 0.5] }`. Display transforms
  unchanged.
- Parts (the frames move them; keep the names): **body** (the gun rig moves every part), **noads** (hidden while
  aiming: the eyepiece glass and the windage turret, plus anything else that breaks the side-edge rule), **bolt**
  (boltRig: turned -62 deg (LIFT) about BOLT, then back +3.2 (TRAVEL) along x), **mag** (drops 12 along its own axis,
  turned 8 deg, hidden 0.32 < p < 0.44), **case** (hidden; shown flying from the chamber at shot t 8.4..14.8, reload
  p 0.12..0.2), **flash** (hidden; shown p < 0.1 of a shot, drawn FLASH_BACK = 9 units back and moved out by its
  frame). `hidden: ['flash', 'case']`, `noFull: ['flash', 'case']`.
- Pivots: SHOULDER (20, 7, 8), BOLT (15.6, 9.2, 8), CANT (12, 9, 8), case (12, 9.3, 8), MAG **(12.7, 5.6, 8)** in
  the proposal (was 10.9: it's the magazine's centre; MAGPOSE unchanged, `cmp-reload.png` shows it clears).
  TRAVEL 3.2, LIFT 62, FLASH_BACK 9.

Clocks and flags (DonatingPhone `gunfx.guns.AX_50`: shot 20, draw 40, alone 6, action 16, glint 10)
- Default 13: `flag(2, cooldown 40 draw, flag(1, cooldown 16 action, cooldown 20 shot))`. Flag 2 = the draw,
  flag 1 = a bolt worked without a shot.
- The shot's kick must be spent by **tick 6** (GunFx cuts the last round's clock there: `alone 6`), the bolt cycle
  runs at ticks 6-13.6 (WeaponMechanics' LEVER: Open at 0 with its sound at tick 6, Close at 8 with its sound at 12).
- Reload 3013: one 60-tick clock (76 from empty; the frames are in p); the magazine sounds (AX_50.yml Start_Mechanics)
  are timed to the frames as delay = 68p - 4 - keep the drop at p 0.18-0.32 and the seat at 0.6 if the frames are
  touched.
- Scope 1013: the kick only, as translations; nothing for the draw or action clocks; `noads` hidden always.
- glint 10 is a particle, not geometry.

Aim alignment (the sight line passes through)
- SY 12.8, z 8: the scope's octagonal hollow tube from the lens to rearX 16.8, inner half-size **HI = 1.2**, walls'
  inner faces `scopeIn` (flat, no glints: in the prototype kit force `mat: flat` and `pat: flat` on every inner face -
  a tube's `mat`/`pat` override the key's material, so the helper must set the inner face per box), the corner slabs
  (`scopeIn`, no outline), the bell's inner faces `lens` (flat), the posts and ticks at XP 2.75..2.85 (east faces
  only, behind the lens), the lens (**no east face**: the world shows through), the eyepiece glass and its glint
  (noads). Every tube wall ho >= HI + 0.3. The lens must sit in front of XP (proposal 2.2..2.6).
- ADS limits, with d(x) = 0.45 + 0.0256 (16.8 - x) blocks (`limits.js`, drawn in the blueprints):
  - In front of the lens nothing may rise above the window's lower edge **y = SY - 1.476 d**: 10.90 at x -16, 10.93
    at -15, 11.12 at -10, 11.39 at -3, 11.50 at 0 (the front-sight blade's 10.5 and the forend's 9.9 pass).
  - Side edge (16:9 and wider): a box in front of the eyepiece is seen past it at the screen's sides when it reaches
    **|z - 8| > 4.0 d** while within **|y - SY| < 2.8 d**: o_max = 3.30 at x 2.2, 3.01 at 5, 2.70 at 8, 2.50 at 10,
    2.20 at 12.9, 2.07 at 14.2, 1.80 at 16.8 (4.0 = the eyepiece's outer 1.8 / 0.45; with a 1.7 eyepiece it's 3.78 d).
    That's why the windage turret is in noads and the ring screws are on top. Check with
    `render-item.js feather@1013 x.png fp 1260 540` (21:9).
  - Behind the eyepiece (x > 16.8, d = 0.45 - 0.0256 (x - 16.8)) nothing may rise above **y = SY - 2.8 d** (the
    screen's lower edge): 11.60 at 17.6, 11.96 at 22.6, 12.20 at 26, 12.46 at 29.6, 12.63 at 32 (the comb at 11.4
    passes; don't raise it past ~11.6).
- What moving the fixed numbers would break: SY or rearX recompute the aim translation (fine) but move the gun on
  screen in hip and the whole ADS geometry (re-check every limit above); HI changes the window size and the posts and
  corner slabs (they derive from it); BORE moves the flash; BOLT moves the port, chamber, case pivot and the handle's
  clearance (keep it 1.9 under the eyepiece's bottom); a longer eyepiece (PG3D's ~18.6) covers the bolt's path.

Bolt clearance
- Every handle point, turned 0..62 deg about BOLT and pulled back 0..3.2, must stay out of the eyepiece/collar box
  (x 14.2..16.8, |z - 8| <= 1.8, y >= 11.0): run `boltcheck.js '<boxes json>' 0` (last argument = an element droop in
  degrees). The proposal's L: smallest gap 0.075. At rest the knob must stay outside the wood's side (z >= 9.35) and
  the handle must not dip into the wrist when back (wrist top 9.3 for x < ~19.6; raising the wrist breaks this).

Palette keys
- **Skins (tools\guns\skins.js, Arctic Sniper Rifle, epic)** theme `wood, woodL, woodD, woodDD, gun, gunL, gunD`
  with `pat: { wood: 'camo', gun: 'camo' }`: all seven must exist (paintSkin throws otherwise) and keep their meaning
  (main wood / lit wood / dark wood / darkest wood and the wood ink; steel / light steel / dark steel). Put every part
  that should turn arctic on them (in the proposal: barrel, receiver, mag, rings, turret, guard on gun*; the scope
  tube stays steel-blue under Arctic: `cmp-arctic.png`). Never rename or remove a key a skin names.
- **KEEP (pg.js, never recoloured by skins)** keys this gun uses: `flash, flashCore, lens, lensB, bore, scope,
  scopeT, scopeIn, glass, glassB, reticle`. Keep the aimed-through faces (funnel insides, corner slabs, bell insides,
  lens, posts, eyepiece glass) on these keys. New keys are fine (no skin needs them); prefer the existing ones.

Other
- Every box, `to`, `from` and rotation origin within -16..32 (the client drops the whole model otherwise; the module
  checks it). The muzzle face stays at -16 (bore box -16.0..-15.98, block from -15.98: no z-fighting).
- The bolt is its own part with its handle on +z; the case boxes stay inside the chamber; the port stays visible
  (bed top < 8.85 under x 10..14).
- Texture: the prototype at density 4 packs into 256x256 (the same size as today's at density 2).

## 6. Choices (cautious / realistic)

- Wood line at the action: **cautious (proposal)**: forend top 9.9, a step down to the bed's 8.6 under the receiver
  (hidden by the recoil-lug block), so the bolt, port and aim stay exactly where they are. **Realistic**: PG3D's level
  wood line needs the bolt axis ~0.6 above the wood and the scope ~1.5 higher (SY ~14.3): every ADS number and the
  hip view change. Recommended: cautious.
- Bolt handle: **cautious**: keep today's drooping rod (it clips the eyepiece by ~0.3 for a tick or two). **Realistic
  (proposal)**: PG3D's L, no element rotation, clears by 0.075. Recommended: the L.
- Butt seams: the proposal stacks the belly steps under one butt box (soft woodD seams along the grain); separate
  full-height boxes per step read as planks (tried, `proto\p2-elev-left.png`).

## 7. Checks for the builder
1. `preview.js` renders: gui (the stepped belly and forend, the black-rimmed bell), side, tp, fp (the L handle, the
   checker glass), shot at cooldown 0.97 / 0.62 / 0.5 (flash, bolt up, bolt back + case), draw `--flag 2`, action
   `--flag 1`, reload at 0.78 / 0.5 / 0.45 / 0.4 (mag out and back, bolt open).
2. ADS at 960x540 and 1260x540: nothing at the window's edges or the screen's sides but the funnel; the posts and
   ticks centred.
3. `boltcheck.js` gap > 0; `limits.js` limits respected (boxes vs the table).
4. The Arctic skin (`donating:item/gunskin/sniper/arctic/full`) still paints: wood and steel camo, scope dark.
