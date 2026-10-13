# STYLE.md: painting the nine guns like PG3D (the Photon Shotgun's level of detail)

Style analyst, 2026-10-06. Scratch root below = `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake`.
Everything here was measured on the wiki's pictures (refs\, decoded from WebP with WIC into `work\style\png\`) and
checked with a working prototype of the kit upgrade (`work\style\proto\`, outside the repo; the repo was not touched).

**In one paragraph.** A PG3D gun is black ink with coloured plates set into it. Every face carries 3-5 tones of one
material (a lit top band, a dark bottom band, a 1-texel bevel per plate, blocky grain, a glint texel), every big face
is cut by 1-texel ink seams into plates, and the colour budget goes into small decals: slots, vents with fins, LEDs in
ink slots, glowing windows with 4-ring gradients, rivets, rails, holes, ribs, insets. Ours are flat-coloured boxes
with a thick outline and nothing inside. The fix is mostly texture, not geometry: **density 4 texels per unit for all
nine guns**, an opt-in PG painter in `pg.js` (`style: 'pg'`) that derives each material's ramp from one base colour
and paints bands, bevels, grain, seams (`split`) and decals (`deco`) from model coordinates, plus somewhat chunkier
parts (receivers 3-4 units thick). The prototype keeps all nine current guns and 18 skins byte-identical (550 files
compared) and repaints skins with the same details.

---

## 1. What PG3D paints (measured)

### 1.1 Scale: how big a "voxel" is
- Photon Shotgun, gallery shot (texel-sharp, 2340x1080): one texel = 9.5 px, the gun = ~830 px long -> **~88 texels
  long**. A body block is **12-15 texels tall**; the stock ~30x8. In first person (2340x1080) a texel is **~18-22 px**
  at 1080p. Photon Pistol: ~45-50 texels long, ~10 thick. The newer icons (Combat Rifle, Ultimatum, the current
  AK-48) are about twice as fine (texel ~2-2.5 px in a 256 icon: 120-150 texels long).
- So PG3D keeps the **texel the same size in the world** on every gun (a pistol has fewer texels, not bigger ones), and
  a part is 10-15 texels tall.
- Ours today: density 2 -> the AK-48 is 70-80 texels long but its receiver is 3.2 units = **6 texels tall, 2 of them
  outline**; its thickest box is 2.4 units (5 texels). No face of the current AK is 12x12 texels or bigger (lint.js).

### 1.2 Ink (outlines) - the most important rule
- Ink is near-black, warm or cool by a hair: (3,1,1) on the red gun, (0,1,3) on the navy ones, (0,0,0) on grey.
- **1 texel on every face edge.** Where two boxes meet you see 2 texels of ink (one from each face) - that is PG3D's
  seam width. A silhouette edge in a 3/4 view also shows 2 texels (top face + side face). The heavy 2-3 px stroke
  around the wiki icons is the icon renderer's post effect, not texture: don't copy it with 2-texel outlines (seams
  would become 4 texels, see `12-density-2-3-4-ink2.png`).
- **Ink also fills**: seams that cut big faces into plates (1 texel), recesses (vents, slots, insets), gaps between
  parts, holes. In the gallery shot ink covers **35-48 %** of a body's side area, ink + "deep" tones (lum < 50) about
  half. Black is the base colour of PG3D art; colour sits on it in plates.
- A second, "deep" ring sits next to the ink at the bottom/right of plates: the material's deep tone (red (48,1,0),
  navy (9,13,27)), so plates read as raised.

### 1.3 Material ramps (tones per material)
One base colour per material; the other tones are derived. Measured ratios (gallery and icons; `colors.js` k-means):

| material | measured tones (dark -> light) | step | hue shift |
|---|---|---|---|
| red paint (Photon) | ink (3,1,1), deep (48,1,0), lo (99,25,8), **base (152,42,16)**, hi (229,88,44) | hi = 1.5x, lo = 0.65x, deep 0.32x | hi warmer/oranger and less saturated; lo more saturated |
| dark gunmetal (Photon plates) | (25,26,27) (36,42,46) **(51,59,63)** (83,88,92), glint (119,117,121) | ~0.7 per step | cool (bluish) |
| grey (Heavy Shotgun) | 15 / 27 / 44 / 61 / 83 / **112** / 159 | 0.72 per step, 7 tones | neutral |
| navy steel (Combat Rifle) | (9,13,27) (23,28,42) (39,48,66) (58,71,91) **(92,108,132)** (136,160,184) (195,211,224) | 0.68-0.75 | shadows bluer, top whiter |
| lavender (Ultimatum) | (31,29,49) (73,72,105) **(105,99,147)** (147,146,195) | ~0.7 | |
| black parts (AK-48) | (1,1,1) (18,18,19) (41,42,43) (62,63,66) (96,97,102) (149,144,147) | lifted greys, not multiplied | cool |
| chrome (Classic Pistol, Old Revolver) | (70,90,110) (120,150,175) (180,210,230) (235,245,250) | bands | blue-white |
| glow orange (Photon windows) | edge (211,105,54) / (156,74,15), (233,116,7), (235,161,46), core (231,196,83) | 4 rings | toward yellow as it brightens |
| cyan glow (Ultimatum, lenses) | (21,120,158) (102,228,243), white glint | 2-3 + glint | |
| olive fins (Photon vent) | (81,78,25), lit top (133,128,49) | 1.6x | |
| grip red checker | (125,27,4) / (104,21,2) | ~15 % apart | low contrast |

Rule: **4-5 tones per material** (deep, lo, base, hi, glint) + ink; each step **~0.68-0.72x**; hi = base x1.42 mixed
~16 % toward a warm light (paint) or a cool white (metal); lo = base x0.68 with a little cool/saturated shadow; glint
= base x1.85-2 mixed 35-50 % to white, used on 1-2 texels per plate only. Near-black materials can't be multiplied:
their hi/glint are a *lift* toward a cool grey (112,120,138).

### 1.4 How a face is shaded (bands, bevels, grain)
- **Bands** (side faces): the top ~16 % of rows are the hi tone, the bottom ~20 % the lo tone, the rest base (on a
  13-row Photon block: 2 hi rows, 2-3 lo rows). Quantised: never a smooth gradient. Top faces lighter (they are the
  lit side), bottom faces dark but still detailed (grooves, holes: Ultimatum).
- **Bevel per plate** (inside the ink): top row hi, left column half a step up, right column half a step down, bottom
  row lo; metals add one glint texel at the top-left corner. Small blocks keep all 4 rows (hi/base/lo/deep on a
  4-row face: "even tiny parts get shading").
- **Grain**: metal tone varies in **blocks**, not per-texel noise: bars 2-4 texels long, 1-2 tall, a full ramp step
  apart (Photon grey plates; AK-48's black parts sprinkle lighter 1-2 texel blocks). Paint is almost clean (a few
  texels a half step off). Wood has streaks along its length. Rubber/grips: a 1-texel checker of two tones 15 % apart
  (Photon grip) or a knurl.
- **AO**: texels touching a hole/slot are one step darker - fully below/right, about half above/left (the dark
  diamond around each Photon LED).

### 1.5 The detail catalogue (what to put on faces)
| detail | PG3D recipe | where seen |
|---|---|---|
| seams / panel lines | 1-texel ink lines cutting a face into plates; they continue around the box | everywhere |
| slots / grooves | 1 ink row + 1 lo row under it (the inner wall); 1-2 texels apart | Photon vent panel |
| vent with fins | ink recess; fins of another material 1-2 wide, 1-texel gaps, lit top texel, Z-stepped | Photon |
| vent with light behind | 1-texel ink / 1-texel colour columns, colour graded dark-red -> orange -> yellow downward | Photon fp |
| perforations / holes | 1x1 or 1x2 ink holes on a 2-texel grid, a lit texel below-right (or above) | Ultimatum, Heavy Shotgun |
| rivets / studs | single texels of an accent on the ink border every 3-4 texels; 2x2 (glint, base, base, lo) on plates | Photon stock, Heavy Shotgun (brass) |
| LEDs | 1x2 light in a 1-texel ink slot: top texel hot, bottom texel the colour; a grey housing texel under; every 4-5 texels | Photon top rows |
| glow window | ink frame, 4 rings edge->core, hue shifting toward yellow/white; sometimes a grille of teeth over it | Photon |
| neon strip / ring | 1-3 texels: hot centre line, darker rims, emissive | Ultimatum |
| energy cell | diagonal stripes in 3 tones inside an ink frame | Ultimatum |
| lens | base, darker lower right, a 2x2 white glint top-left, a darker rim | Combat Rifle, AK-48 scope |
| rail | lit top row, darker squares every 2 texels under it | Photon |
| ribs / slats | 1-texel slats lit on top, ink gaps | Combat Rifle handguard, Heavy Shotgun top |
| inset window | ink frame cut into a plate, a deep row under the lip, the floor a step darker | Combat Rifle, Heavy Shotgun |
| emblem / screen | a 3x3-5x5 pixel stamp (red diamond, white centre; a grey 2x3 screen with one red texel) | Photon |
| teeth / serrations | 1-2 texel columns of 3 tones shifted per row (diagonal ripple) | Photon top cover |
| chrome | horizontal bands: glint, hi, base, lo (blue-white); vertical ribs at the back of a slide | Classic Pistol, Old Revolver |
| stripes / trims | bands of an accent colour with their own hi/lo rows, framed in ink | AK-48 red/white, Photon L-trims |

### 1.6 Composition
- **Colour budget**: one main material ~60 %, a second ~25 %, accents <= 10 % (glow, LEDs, stripes, a single red
  selector texel); ink + deep about a third to a half of a side.
- **Big faces stay calm**: 2-3 bands plus seams; the detail lives in small decals (Photon's big red faces in first
  person are 3 flat bands, crop 05).
- **Every face >= ~12 texels each way gets at least one seam or decal**; long faces get a seam every 2.5-4 units.
- **First person sees the top and the left (+z) side**: give the top faces detail too (rails, teeth, holes, seams).
- **Silhouettes**: chunky and stepped (boxes stacked with 1-2 texel steps: caps, sight bumps, rails); a rifle body is
  ~0.15 of its length tall and ~0.12 thick (Photon), ours ~0.08 and ~0.06.
- The classic designs (pistol, Uzi-like SMG, pump shotgun, AK-48, revolver, Thompson, M16, hunting rifle, MG) have no
  lights: they get the Photon-level richness from seams, bevels, grain, rivets, screws, vents, grip textures, stripes
  and chrome bands. Glow and LEDs only where the design has them (lenses, the AK-48's laser and dot).

Annotated crops (each with numbered notes): see section 7.

---

## 2. What our guns are missing (the nine, rendered: `work\style\ours\*-gui.png`, `ak47-fp.png`, `r90-fp.png`)
1. **One tone per face** (plus the kit's face tone): no bands, no bevel, no grain, no glint. PG3D faces have 3-5 tones.
2. **Outlines 0.5 units thick** (1 texel at density 2) and on every box alike: in first person they are fat black
   frames; the guns read as outlined boxes, not as plated machines.
3. **No room**: density 2 and thin parts (2-2.5 units thick) leave 2-4 texels inside the outline; at density 2 the
   swatch gun's decals collapse (`12-density-2-3-4-ink2.png`, top left).
4. **No seams** cutting big faces into plates.
5. **No decals**: slots, vents, LEDs, rivets, rails, holes, ribs, insets, emblems.
6. **Glows are 2 tones** (legacy `glow`: rim + one light tone) instead of 4 rings with a hue shift; the beam and
   flashes too.
7. **Lenses are flat**; PG3D lenses have a glint, a gradient and a rim.
8. **Ramps are plain multiplies** (`shade`): no warm highlights / cool shadows; hand-made extra keys (gmD, gmL...) for
   tones the kit could derive.
9. **Black parts can't be shaded**: x1.1 of (24,25,30) is still black; PG3D lifts them toward grey.
10. **Top faces are plain**, which is most of what first person sees.
11. **Silhouettes are thin and smooth**; PG3D's are chunky and stepped.
12. The texture packing wastes space (shelves unsorted): with sorted shelves density 4 costs about what density 2 does
    today (section 4).

`09-ours-vs-pg3d.png` shows it side by side; the bottom-left of it is our AK-48 with only the automatic rules on.

---

## 3. Painting rules (implementable; the prototype implements every number)

R1. **Density 4** texels per unit for all nine (section 4). Box corners on the 0.25 grid (`lint.js` lists off-grid
    outlined boxes; thin ink-only or glow layers may stay off-grid with `outline: false`).
R2. **Ink**: (10,10,12) by default (a gun may tint it, e.g. (6,2,2) red, (2,4,10) navy); width 1 texel on every face
    (`inkW: 1`), never 2 on boxes that touch others.
R3. **One base colour per material** in the palette; tones derive (table below). Extra keys only for real colour
    changes (stripes, accents) or as derived keys `{ of: 'recv', k: 1 }` so skins recolor them with their base.
R4. **Face base** = base x {up 1.1, N/S 1.0, E/W 0.9, down 0.78} (the kit's TONE, unchanged; the client shades items
    on top: up 1, down 0.5, N/S 0.8, E/W 0.6).
R5. **Bands** on side faces with >= 5 inner rows: top round(0.16 h) rows = hi, bottom round(0.2 h) rows = lo. Not on
    chrome, gold, glow, lens, cells or full-repaint skin patterns (code, glitch).
R6. **Grain** (inside the ink): for each texel, with probability p start a cell, 60 % darker / 40 % lighter by one
    step; metals use blocky cells (1x1 55 %, 2x1 30 %, 1x2 10 %, 2x2 5 %), paint 1x1. p: paint 0.04 (+-8 %), metal
    0.18 (+-20 %), dark 0.14 (a full ramp step), chrome 0.05, rubber 0.08, wood 0 (its streaks), glow/glass/gold 0.
R7. **Seams** (`split`): 1-texel ink lines at model-space planes; a long face gets one every 2.5-4 units; they wrap
    around every face of the box that crosses the plane.
R8. **Bevel per plate** (`bevel: 1`): top row hi, bottom row lo, left column 50 % toward hi, right column 50 % toward
    lo; metals add a glint texel at the top-left corner of plates >= 4x3.
R9. **Decals** after the bevel, in the face's plane (section 5.3), each in palette keys (so skins recolor them).
R10. **AO** after the decals: a texel touching a hole/slot/LED slot gets 75 % (below, right) or 40 % (above, left) of
    the way to lo.
R11. **Ink last**, so decals never break the outline.
R12. **Glow**: elements with `light_emission 15` (`glow: true` or a decal's `emit: true` patch 0.02 in front of the
    face): rings edge (x0.74, 30 % redder) -> colour -> 50 % hot -> hot core, hot(c) = (1.05r+20, 1.35g+40, 1.2b+30)
    then 12 % white. LEDs: hot top texel, colour bottom texel. Only where the design has lights.
R13. **Lens**: base, lower-right x0.82, rim x0.62, glint 2x2 at the top-left (80 / 55 / 55 / 35 % white), rim light
    bottom-right 30 %.
R14. **Coverage targets** (lint.js): at most a quarter of faces >= 12x12 texels without a seam, decal or pattern;
    ink + deep 30-55 % of the inventory icon; thickest receiver box >= 3 units; <= ~160 elements in `_full`.
R15. **Silhouette**: rifle receivers 3.5-5 units tall and 3-4 units thick (12-16 texels), pistols ~0.18 of their
    length thick; stepped tops (sight bumps, caps, rails 0.25-0.5 high). Keep the sight line and every part name the
    frames move (body, mag, bolt, pump, slide, shell, flash...), the KEEP keys (flash, lens, bore, scope, dot...) and
    the -16..32 limits.

Material table (prototype `MAT`; all numbers are defaults a box or the gun can override):

| mat | hi (x, tint, mix) | lo (x, tint, mix) | deep | glint (x, white mix) | grain p / step / cells | bands | bevel | corner glint | default pattern |
|---|---|---|---|---|---|---|---|---|---|
| paint | 1.42, (255,214,170), 0.16 | 0.68, (24,18,40), 0.08 | 0.42 | 1.85, 0.35 | 0.04 / 8 % / 1x1 | yes | 1 | no | flat |
| metal | 1.38, (214,226,255), 0.14 | 0.70, (16,20,40), 0.12 | 0.45 | 1.9, 0.45 | 0.18 / 20 % / blocks | yes | 1 | yes | flat |
| dark | 1.5, (112,120,138), 0.28 (a lift) | 0.60 | 0.35 | 2.0, 0.5 | 0.14 / one step / blocks | yes | 1 | yes | flat |
| chrome | as metal | | | | 0.05 | no | 1 | yes | chrome2 |
| wood | 1.42, (255,222,170), 0.16 | as paint | | | 0 | yes | 1 | no | grain |
| rubber | 1.25 | as paint | | | 0.08 | no | 1 | no | knurl |
| gold | as metal, (255,244,200), 0.2 | | | | 0 | no | 1 | yes | gold |
| glow | (none: emissive, no ink) | | | | 0 | no | 0 | no | rings |
| glass | | | | | 0 | no | 0 | no | lens |
| flat | (tiny bits: base + ink only) | | | | 0 | no | 0 | no | flat |

The check against the pictures: red base (152,42,16) -> hi (222,85,47) (measured (229,88,44)), lo (97,28,13) (measured (99,25,8)), deep (61,18,10); hot((233,116,7)) = (255,204,64) (measured core (231,196,83)).
Grey metal (51,59,63) -> hi (90,101,111) (measured (83,88,92)). Black (24,25,30) -> hi (57,61,71) (AK-48 (62,63,66)).

---

## 4. Texel density: 4 texels per unit, the same for all nine

- **Detail per part**: PG3D parts are 10-15 texels tall. Our receivers are 3.2-4 units: density 4 gives 13-16 texels
  (11-14 inside the ink); density 2 gives 6-8 (4-6 inside). Decals need room: an LED slot is 3x4 texels, a vent >= 6,
  a 4-ring glow window >= 7, a plate with a bevel >= 4x3.
- **Ink width**: 1 texel = 0.25 units at density 4, so seams are 2 texels = 0.5 units, PG3D's proportion (2 of 13
  texels); today a single outline is already 0.5 units (seams 1 unit), which is why ours look heavy in first person.
- **One density for all nine**: PG3D keeps the world texel size constant (a pistol has fewer texels, not bigger
  ones); mixed densities would look wrong side by side in the shop's hotbar mirror and in hands. Density 4 gives the
  pistol ~56 texels (Photon Pistol ~45-50) and the rifles 140-190 (the finer, current PG3D icons; the Photon
  Shotgun is ~88). The owner asked for "many small shaded voxels".
- **Cost** (measured with the prototype, sorted shelf packing): all nine guns + 18 skins at density 4 = 27 PNGs,
  310 KB, 1.52 M texels in the atlas (one frame each) = a 1234^2 square; today 70 KB and 0.84 M. Every gun texture
  stays 256^2 (gs50, uzi, r90, rev, tommy, m16 grow from 128^2). Chunkier remakes may need 512^2 for the long guns:
  still small, but check the atlas line in the 26.3 client log after the first build (CLAUDE.md: the block atlas was
  8192x4096). Animated skins stack frames in the PNG, not in the atlas.
- **Fallback**: density 3 for all nine if the owner finds 4 too fine in his client (`12-density-2-3-4-ink2.png`, top
  right). Seams and decals are given in model units, so changing the density repaints everything with no other edit.
  Never mix densities between guns.
- Mipmapping will blend 1-texel details at a distance in third person (normal for Minecraft); first person and the
  inventory don't mip.

---

## 5. The kit upgrade (pg.js): proposal, prototyped

Prototype: `work\style\proto\pg.js` (assembled by `assemble.js` from the repo's pg.js + `parts\painter.js` + guarded
hooks). It is the repo's pg.js with additions only; port it as is or reimplement the same API.

### 5.1 Compatibility (checked)
- Everything new runs only when a gun sets `style: 'pg'`. `test-compat.js` builds all nine current modules and all 18
  skins with the prototype: **550 files byte-identical** to the original kit and to the repo's pack.
- A PG tile stores its recipe (material, pattern, seams, decals in texel coordinates, ink width, its own seed:
  `hash(name + '#' + tileIndex)`). `paintSkin` repaints a PG tile with the same painter and the skin's palette, so
  seams, bevels, decals and the grain land in the same texels in every skin and every animation frame
  (`13-skins-on-pg-tiles.png`: golden, h4ck3r (animated), crimson on the auto-converted AK).
- Skin rules unchanged: `theme.palette` recolors keys (derived tones follow), `theme.pat` replaces a key's pattern
  (bands/bevel/decals/ink stay on top of it), KEEP keys are refused. New, optional: `theme.mats` (key -> material,
  e.g. crimson turns the black receiver into `paint`: `proto\skinmats-*.png`) and the gun's `keep` list.
- Frames, parts, states, `noFull`, `hidden`, `flag`, `cooldown`, `firing` are untouched. Emissive patches are added to
  the same part as their host box, so they move with it.
- **The 18 released looks must survive the remake**: their ids never change, but their themes name palette keys of
  the current modules. A remade gun either keeps those key names for the same roles (recv, gm, red, magG, chrome,
  frame, wood...) or updates the looks in `skins.js` in the same change (`paintSkin` throws on an unknown key, so
  build-pack.js catches it).

### 5.2 Gun spec additions (all optional; ignored on legacy guns)
| key | default (style 'pg') | meaning |
|---|---|---|
| `style` | - | `'pg'` turns the PG painter on for this gun |
| `density` | 4 (legacy stays 2) | texels per unit |
| `ink` | [10, 10, 12] (legacy [16, 18, 24]) | the outline colour |
| `inkW` | 1 | outline width in texels |
| `mats` | guessed per key | `{ key: material }`; name every key (the guess: glow -> glow, chrome/grain/check/gold patterns -> their material, lens* -> glass, bore/post/sight/bead/dot/reticle -> flat, dark colours (r+g+b < 150) -> dark, else paint) |
| `keep` | [] | extra keys no skin may recolor (e.g. LED colours, a fixed emblem) |
| palette values | `[r, g, b]` | or a derived tone `{ of: 'key', k: -2..2 }` / `{ of: 'key', f: 0.8 }` |

Texture packing: PG guns place tiles sorted by height (painting order, and so the random sequence, unchanged).

### 5.3 Box additions
| key | meaning |
|---|---|
| `mat` | the material for this box (or per face, like `c`) |
| `bands`, `bevel` (0/1), `grain` (p), `ao` (bool), `inkW` | override the material's defaults |
| `split: { x: [..], y: [..], z: [..] }` | seams at those model planes, on every face crossing them |
| `deco: [ ... ]` | decals, below |

A decal: `{ k, face, at: [a, b], to: [a, b], c, mat, emit, ...params }`. `face`: a face name, a list, or `'sides'`
(north + south, the default), `'ends'` (east + west), `'flats'` (up + down), `'all'`. `at`/`to`: opposite corners in
**model units in the face's plane**: [x, y] on north/south, [z, y] on east/west, [x, z] on up/down; the kit maps them
with Minecraft's UV orientation (south u = x - from.x, north u = to.x - x, west u = z - from.z, east u = to.z - z,
sides v = to.y - y; up (x - from.x, z - from.z), down (x - from.x, to.z - z)), so the same decal lands at the same x on
both sides. `c`: a palette key (default the face's own colour). Faces with `rotUV` are not supported for decals yet.

| k | params | paints |
|---|---|---|
| `slots` | `n` (1), `dir` 'h' / 'v' | n grooves: an ink line + a lo line after it; AO |
| `vent` | `c` (fin key), `fin` (1), `gap` (1), `zig` | an ink recess with fins (lit top, lo bottom), every other fin a step lower |
| `holes` | `pitch` ([2, 2]) | a grid of ink holes, lit texel below-right; AO |
| `rivets` | `n` (2), `size` 1 / 2, `c` | studs along the rect's long side: 1x1 hi, or 2x2 glint/base/base/lo |
| `leds` | `n` (1), `size` ([1, 2]), `c`, `housing` (key), `emit` | lights in ink slots: hot top, colour bottom; AO halo; `emit` adds emissive patches |
| `glow` | `c`, `emit` | an ink-framed window of 4 rings; `emit` adds an emissive patch over it |
| `band` | `c` | a stripe of another colour with its own hi/lo rows |
| `rail` | `c` | a lit top row, then teeth every 2 texels |
| `ribs` | `c`, `fin` (1) | slats between ink gaps, lit top, lo bottom |
| `inset` | `c` | a recessed window: ink frame, deep row under the lip, darker floor |
| `cells` | `c` | an energy cell: ink frame, diagonal stripes hot/base/dark |
| `stamp` | `rows`, `keys` | pixel art from rows of characters; `#` ink, `+` hi, `-` lo of the face, others via `keys` |

New patterns (also usable by skins via `theme.pat`): `rings`, `lens`, `chrome2` (PG chrome bands), `plates` (dark metal
bars, lifted on near-black), `knurl`, `cells`, `neon`, `led`.

Painting order per PG face: base (face tone) -> bands -> pattern -> grain -> seams -> bevel per plate -> decals -> AO ->
ink. A skin's pattern replaces step 3 only.

Example (from `proto\swatch-module.js`):
```js
{ from: [0, 4, 5], to: [16, 10, 11], c: 'red', split: { x: [6, 11], y: [7.5] },
  deco: [
    { k: 'leds', at: [0.75, 9.5], to: [5.25, 8], n: 3, c: 'org', housing: 'gm', emit: true },
    { k: 'slots', at: [6.75, 9.75], to: [10.25, 7.75], n: 2 },
    { k: 'vent', at: [6.75, 7.25], to: [10.25, 4.5], c: 'olive', zig: true },
    { k: 'glow', at: [11.5, 9.75], to: [15.5, 7.75], c: 'org', emit: true },
    { k: 'rivets', at: [0.5, 5.25], to: [5.5, 4.75], n: 4, c: 'gm', size: 2 } ] }
```
with `style: 'pg', mats: { red: 'paint', gm: 'metal', blk: 'dark', org: 'glow', cyan: 'glass', ... }`.

### 5.4 Tools for the builders (no repo writes)
- `proto\preview.js <module.js> <gun id> <out prefix> [--views gui,side,fp,fpads,fpreload,tp] [--no-skins]`: builds a
  draft module with the prototype kit into `<prefix>-assets` and `<prefix>.zip`, renders through
  `tools\render-item.js --pack`, and copies the gun's texture to `<prefix>-tex.png`.
- `proto\lint.js <module.js> <gun id>`: the R14 numbers (off-grid boxes, empty big faces, thickness, elements, the
  icon's ink share).
- `proto\harness.js`: the same build as make-item-art.js for any module set (used by the two above and the tests).
- `proto\demo-swatch.js [density] [inkW] [tag]`, `proto\demo-auto.js <gun>`: the swatch gun and an existing gun with
  only `style: 'pg'` turned on.
- Tests: `test-compat.js` (legacy byte-identical), `test-skinmats.js` (`keep`, `theme.mats`), `test-derived.js`.

### 5.5 Known limits of the prototype
- Decals on `rotUV` faces, zig fins as true Z shapes, and LED patches on faces whose element has a `rot` with
  `rescale` are not handled.
- `inkW` 2 doubles seams between touching boxes; keep 1.
- The emissive patches are separate elements (one per LED): keep LED counts small (<= ~12 per gun).
- `guessMat` is only a fallback for converting old modules; the remakes should list `mats` for every key.

---

## 6. Per gun: materials to use (each keeps its own PG3D design)
| gun | reference | materials |
|---|---|---|
| Classic Pistol (gs50) | Pixel_Gun_PG3D FirstPistol | chrome slide (chrome2, blue-white, rear serrations as ribs), dark frame, red grip (paint with a speck/marble grain, orange streak) |
| Machine Gun (uzi) | Machine_Gun | navy steel (metal, the Combat Rifle ramp), dark grip/stock, red selector texels; ribs, slots, rivets |
| Shotgun (r90) | Shotgun | chrome2 barrel and receiver, a big inset port, wood pump (grooves = slots 'v') and grip |
| AK-48 (ak47) | AK_48_PG3D | dark receiver (lifted greys, plates), red + white bands with rims, glass lens, the laser beam (glow), banded magazine |
| Old Revolver (rev) | Old_Revolver_PG3D | chrome2 barrel and frame (white top band), cylinder flutes as slots, orange-brown wood grip |
| Brave Patriot (tommy) | Brave_Patriot_PG3D | grey metal (ribbed barrel = ribs), orange wood stock and foregrip (wood) |
| Combat Rifle (m16) | Combat_Rifle_PG3D | navy steel with bevel highlights, insets, ribbed handguard, cyan glass lens |
| Sniper Rifle (sniper) | Sniper_Rifle_PG3D (Hunter Rifle) | navy steel barrel and scope, brown wood stock, light-blue lens |
| Veteran (lmg) | Veteran_Weapon | light grey metal, wood stock, blue-ish bipod (metal), pale drum |

---

## 7. Example crops (annotated, numbered notes under each) - `work\style\`
1. `01-photon-lights-bands.png`: bands (hi top, lo bottom), LEDs in ink slots, AO halos, housing texel, the seam.
2. `02-photon-vent-plates.png`: panel bevel, grooves, the fin vent, dark metal plates in blocks, a glint, an edge-on
   gradient.
3. `03-photon-glow-trims.png`: the 4-ring glow window with its hue shift, a chrome strip, vertical LEDs, a small block's
   full ramp, a grille over a glow, L-trims.
4. `04-photon-stock-grip-rail.png`: rivets on ink, a long plate's bevel, an emblem, teeth, a rail, the checker grip,
   a ribbed rod.
5. `05-photon-first-person.png`: what first person shows: vents with light behind, a glow window close up, a screen
   decal, calm big faces, teeth on top, the texel scale.
6. `06-combat-rifle-bevel-ribs.png`: inset window, ribs, lens, edge highlights, one accent texel, the navy ramp.
7. `07-ultimatum-cells-holes.png`: energy cell, holes with lit rims, a neon ring, a two-band face, the muzzle screen,
   a ribbed dark bottom face.
8. `08-heavy-shotgun-grey.png`: perforations, an inset, side bands, fins, brass rivets, the 7-tone grey ramp.
9. `09-ours-vs-pg3d.png`: PG3D's AK-48, ours today, ours with only the automatic rules, the swatch gun with decals.
10. `10-proposed-kit-swatch.png`: the prototype's texture at density 4, labelled per option.

Also: `11-swatch-gun-d4.png` (the swatch gun's icon), `12-density-2-3-4-ink2.png` (density 2 / 3 / 4 and 4 with
`inkW` 2), `13-skins-on-pg-tiles.png` (skins on PG tiles). Sources: zooms in `work\style\tmp\`, decoded refs in
`work\style\png\`, our current renders in `work\style\ours\`, the annotation specs in `work\style\specs\` (redraw
with `annotate.ps1`).
