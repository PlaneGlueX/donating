# Old Revolver remake: design spec (tools\guns\rev.js)

Target: PG3D's Old Revolver (a Smith & Wesson Model 29 look, per the wiki's trivia) at the Photon Shotgun's level of detail. Keep its design: a long square silver barrel, a boxy frame with the cylinder in a window, a black hammer and sights, and a red-orange wooden target grip with silver screws. Add PG3D-style art on top: two-tone faces with dark seams, steps in the silhouette, screws, knurling, a roll mark and one glowing accent (the front-sight insert).

Work files are in `scratchpad\remake\work\rev\`:
- `rev-ref-annotated.png`: the wiki Appearance image unsheared into a side profile and mapped to our units, with 14 numbered callouts.
- `rev-compare-icon.png`: the reference icon next to our current `gun_rev_full` gui render.
- `rev-compare-fp.png`: the reference "in use" screenshot next to our current first-person hip view.
- `rev-blueprint.png`: the proposed layout (filled) over the current model (magenta outlines), side and top views, with the sight line drawn.
- `proposal.js`: every proposed box as data (coordinates, palette key). `blueprint.js` redraws the blueprint from it.
- Zooms: `ref-appearance-gray-x4.png` (the icon on a light background), `ref-unsheared-x4-grid10.png`, `ref-orig-frame-x8.png`, `ref-inuse-x2.png`, `ref-inuse-top-x4.png`.
- `profile.txt`: an ASCII class map of the unsheared reference.
- Our current renders: `ours-full-gui.png`, `ours-fp-hip.png`, `ours-fp-ads.png`, `ours-fp-shot.png`, `ours-fp-reload-open.png`, `ours-fp-reload-load.png`, `ours-side.png` and `ours-tex-x8.png` (the current texture sheet).
- Detail-level target: `photon-app.png` and `photon-inuse.png`.

Note on the source files: the wiki "png" and "jpg" files are WebP. `webpraw.ps1` decodes them through Windows' WIC with alpha. The pixels come out as RGBA and premultiplied, and `img.js` un-premultiplies them.

---

## 1. What the reference looks like, part by part

Method: I unsheared the Appearance icon (a 3/4 render) into a side profile. In image coordinates, the barrel's axis runs 31.5° up and right, and the gun's vertical runs along the frame's front edge (3/48 lean). I then mapped the profile to our units at **0.106 units per icon pixel**, with the rear sight's rear face at x 12.6 and the frame's top at y 12.45. Expect ±0.4 units of error, because the icon is a perspective-ish 3/4 view with a thick black edge. The in-use screenshot confirms the shapes from behind and to the left, which is what our first person sees.

With that mapping, **the frame block, the vertical proportions and the grip match ours almost exactly. The barrel does not: it is about 70% longer.**

| Part | Reference (our units) | Ours now |
|---|---|---|
| Muzzle | x ≈ -6.5 | XM = -2.6 |
| Barrel | One square-section box, ≈2.3-2.5 tall. From the in-use view the top face is about 0.6-0.7× the side's height, so ≈1.6-1.7 wide. Length from the frame ≈13.5 (≈63% of the gun's length). Its top sits ≈0.65 **below** the frame's top strap. | Stepped octagon (2 crossed boxes) 2.3 × 2.0, 8.1 long, top 0.3 below the strap |
| Barrel side | Two-tone: the upper ~55% bright, the lower ~45% light grey, a dark lower edge. The top face is white in first person. | `chrome` gradient, bluish |
| Front sight | One chunky block ≈1.7 long and ≈0.75 tall above the barrel, set ≈0.6 back from the muzzle face. It is black in first person. | A thin blade 1.1 long |
| Underlug / ejector shroud | A box under the rear ≈40% of the barrel (≈5.5 units forward from the frame), ≈1 unit deep, mid grey, darker than the barrel. Its front end is stepped (a small grey end face). | None: an exposed ejector rod with a knob |
| Frame block | Frame front to the back of the recoil shield ≈7.1; top strap to bottom strap ≈5.2. The frame is a chunky box that reads as a **window**: a bright front post, a top strap, a bottom strap and the recoil shield framing the cylinder. | 5.5-12.6 (7.1) ✓; the window is thin straps, and the cylinder bulges past them |
| Cylinder | Shown as a box seen through the window. Its side is painted in horizontal bands, top to bottom: mid grey, light, mid-light, near-white. There is a bright narrow vertical strip at its front (the window's post). It looks shorter than ours (≈2.5-3 of the 7.1). | 12-gon 6.8-10.95, radius 1.6, light and dark flats alternating |
| Rear sight | Two chunky black posts on the back of the top strap. Their tops are level with the front sight (≈0.15 over the strap). | Two thin posts 0.5 × 0.55 |
| Hammer | A big black stepped block behind the strap, with the backstrap stepping down behind it to the grip. | Cocked dark hammer ✓ (smaller, blue-grey) |
| Trigger guard | A rounded square loop (black edge) with a grey trigger. x ≈ 6-11, bottom ≈ 5. | Square loop 8.3-11.5, bottom 4.6 ✓ |
| Grip | A square-butt **target stock**: nearly straight (rake ≤ ~12°), from the frame bottom (≈7) down to y ≈ 1.5-1.75, x ≈ 12.5-15.1. The rear edge is stair-stepped (3 pixel steps). There is a **front swell** under the trigger guard (x ≈ 11.0-12.3) separated by a dark groove. Two silver escutcheons sit on the rear panel (upper and lower). The butt is dark, with no metal cap. Red-orange wood. | A plow handle bending 16°→32°→42° with a silver butt cap; brown wood; bottom at ≈0.5, rear at ≈16.4 |
| Overall | ≈ -6.5 → 15.1 (21.6 long); y 1.5 → 12.6 | -2.6 → ≈16.4 (19); y ≈0.4 → 13 |

First person (in use; see `rev-compare-fp.png`): PG3D shows the gun from behind, to the left and above. You see:
- the white barrel top;
- the two-tone left side;
- the cylinder's banded left side and a bright vertical strip;
- two big black rear-sight blocks and a black hammer;
- a light-grey frame rear and grip-frame top;
- a dark red-brown grip with a black stair-step edge and a silver screw.

Black outlines are everywhere, about 10% of the barrel's height thick. The PG3D gun is held pointing more into the screen than ours; that is a display choice, not geometry.

## 2. Colors per material (sampled)

The Appearance icon (unlit) gives the base tones. The in-use screenshot (lit) gives what the player sees. The metal is **neutral grey, with no blue**. The frame is the same bright silver as the barrel, not darker.

| Material | Tones (light → dark), Appearance | In use (lit) |
|---|---|---|
| Barrel / frame silver | `#ffffff` (highlight), `#ececec` (side upper band), `#d6d6d6` (side lower band), `#a2a2a2` (bottoms), `#4a4a4a`/`#343434` (seam/edge) | top `#d2d3cc`, sides `#d4d3da` / `#9a999e` |
| Cylinder bands | `#f0f0f0`, `#d7d7d7`, `#aeaeae`, `#838383` | `#d2d1d4` / `#5e5e60` |
| Underlug / shaded metal | `#9f9f9f`, `#838383`, `#6f6f6f`, `#595959` | frame rear `#999999` |
| Outline | `#000000` (pure black) | `#010101` |
| Wood (target stock) | `#b84016` (light), `#a93d14` (main), `#8a2f0e` (front swell in shade), `#882121` (rear edge), `#591515` / `#3c0000` (shadow) | `#532411`, `#3b100f` |
| Escutcheons / screws | `#ece6e6` (highlight), `#c8c0c0` / `#bbaaaa` (core), `#6a5a5a` (rim) | silver |
| Hammer / trigger steel | `#656565`, `#535353`, `#353535`, `#161616` | black |

Proposed palette, ready for `pgGun`. Existing keys keep their names and roles; ⊕ marks a new key; KEEP marks a pg.js KEEP key.

```js
ink: [8, 8, 10],
palette: {
  chromeHi: [250, 250, 250], // ⊕ barrel top face, the window's bright front post
  chrome: [236, 236, 236],   // barrel upper band (side)
  chromeMid: [214, 214, 214], // ⊕ barrel lower band, roll-mark plate
  chromeDark: [162, 162, 162], // barrel bottom, ramp, collar
  chromeInk: [72, 72, 76],   // seams, engraving, bolt notches
  frame: [226, 226, 226],    // frame members, guard, tang, backstrap
  frameDark: [131, 131, 131], // underlug, crane arm, frame bottoms, strap ink
  frameInk: [48, 48, 52],    // sight channel, screw slots
  cyl: [222, 222, 222], cylDark: [150, 150, 150], cylEnd: [176, 176, 176], // flats, flutes, ends + muzzle crown ring
  wood: [169, 61, 20], woodLight: [184, 66, 24] /* ⊕ optional */, woodDark: [136, 33, 33], woodDeep: [70, 16, 10] /* ⊕ grip ink, butt */,
  steel: [58, 58, 62], steelHi: [100, 100, 104] /* ⊕ spur, rod tip, trigger face */,
  screw: [204, 196, 196], screwHi: [244, 240, 240], // ⊕ escutcheons, frame screws
  sight: [22, 22, 26], bore: [10, 10, 12],          // KEEP
  bead: [235, 32, 32], beadHi: [255, 150, 130],     // ⊕ KEEP: the glowing front insert
  post: [242, 242, 242],                            // ⊕ KEEP: the rear sight's white outline
  brass: [228, 184, 78], brassDark: [160, 118, 40], tip: [196, 112, 62],
  loader: [40, 40, 44], loaderHi: [96, 96, 100],    // neutralised (was bluish)
  flash: [255, 196, 64], flashCore: [255, 248, 210] // KEEP
}
```

## 3. Details to add (where)

Recommended: **`density: 4`** for this gun. At density 2 a 0.5-unit outline swallows every strap and screw. At 4 an edge is 0.25 units, which matches PG3D's in-use line weight, and the texture grows to about 256². The edge cases:
- Give the big silhouette boxes the black `ink`.
- Give thin members (straps under 1 unit) a softer ink (`frameDark`), as now.
- Every box under 0.5 units on a face (screws, notches, white outline strips, the channel, the roll mark) needs `outline: false`, or it paints as solid ink, because the kit's minimum tile is 2 texels.
- Drop hidden internal faces with `dirs`.

The coordinates below assume XM = -6.0 (see §5 for why -6.0 and not -6.5). They are all in `proposal.js`, and the blueprint shows them. Faces: `south` = +z (the first-person side), `north` = -z, `east` = +x (toward the eye), `west` = the muzzle side.

**Barrel and muzzle (body)**
1. **Two stacked boxes for the two-tone side.** Upper `[XM, 11.0, 7.15]→[5.6, 12.15, 8.85]`: c `{all: chrome, up: chromeHi}`, pat `{north: chrome, south: chrome, up: groove}`. The groove gives the top face glare serrations, which are visible from first person. Lower `[XM, 9.85, 7.15]→[5.6, 11.0, 8.85]`: c `{all: chromeMid, down: chromeDark}`. Their shared outline is the PG3D panel seam. This replaces the crossed octagon boxes.
2. **Muzzle crown.** A ring `[XM-0.05, 10.1, 7.3]→[XM, 11.9, 8.7]`: `cylEnd`, ink `chromeInk`, dirs without east. Then the bore `[XM-0.07, 10.55, 7.55]→[XM-0.05, 11.45, 8.45]`: `bore`, west only, no outline. That gives a lighter ring and a step at the muzzle face.
3. **Front sight, a chunky stepped ramp** (the reference's black block).
   - Ramp base `[XM+0.35, 12.15, 7.6]→[XM+2.6, 12.45, 8.4]`: `chromeDark`, pat `{east: serr}`.
   - Ramp step `[XM+0.55, 12.45, 7.7]→[XM+2.0, 12.7, 8.3]`: `chromeDark`.
   - Blade `[XM+0.65, 12.7, 7.75]→[XM+1.85, SY, 8.25]`: `sight`.
   - **Red insert** `[XM+0.8, 12.63, 7.73]→[XM+1.87, 12.87, 8.27]`: `bead`, `glow: true`, pat `glow`. It stands 0.02 proud of the blade's sides and back, so it shows as a glowing red bar 0.13-0.37 under the blade top, from the side and from the eye. This is the gun's one glowing part, the Photon-style accent: a fiber-optic insert, sensible on a western gun.
4. **Roll mark (decal)** on the +z lower band: a plate `[-3.0, 10.1, 8.85]→[2.6, 10.85, 8.87]`, south only, `chromeMid`, pat `serr`, `outline: false`. It must be ≥ 0.75 tall (3 texels) or `serr` draws nothing. Dark ticks read as stamped lettering; no real text. Optionally a shorter one on -z, `[-3, 10.1, 7.13]→[1.2, 10.85, 7.15]`, north only.
5. **Collar** where the barrel enters the frame: `[5.35, 9.7, 7.0]→[5.65, 12.3, 9.0]`, `chromeDark`, ink `chromeInk`. A silhouette step.
6. **Underlug / ejector shroud**: `[1.2, 8.95, 7.35]→[5.5, 9.85, 8.65]`, c `{all: frameDark, down: chromeInk}`. Front step `[0.75, 9.25, 7.5]→[1.2, 9.85, 8.5]`, `frameDark`. A lug pin (screw) `[4.7, 9.2, 8.65]→[5.1, 9.6, 8.7]` (+z), mirrored on -z: `screw`, no outline.

**Frame (body)**

The window members are widened so the cylinder sits flush and inset, which gives the PG3D box. The frame z is FZ0 = 6.45 to FZ1 = 9.55 (now 6.95-9.05), and TOP = 12.5 (now 12.45).

7. **Frame front (shank)** `[5.5, 7.9, FZ0]→[6.55, TOP, FZ1]`, c `{all: frame, down: frameDark}`. **Yoke screw** on +z: `[5.85, 8.3, FZ1]→[6.25, 8.7, FZ1+0.05]`, `screw`.
8. **Bright front post of the window**: `[6.55, 8.0, FZ0+0.05]→[6.75, 12.4, FZ1-0.05]`, `chromeHi`, ink `frameInk`. This is the vertical white strip seen in the reference.
9. **Top strap** `[6.75, CY+CR/cos15°+0.08, FZ0+0.1]→[11.0, TOP, FZ1-0.1]`: `frame`, up `chromeHi`, ink `frameDark`. **Sight channel** along its top: `[7.0, TOP, 7.85]→[11.3, TOP+0.02, 8.15]`, `frameInk`, up only, no outline.
10. **Bottom strap** `[6.75, 7.55, FZ0+0.1]→[11.0, CY-CR/cos15°-0.08, FZ1-0.1]`: `frame`, ink `frameDark`.
11. **Recoil shield** `[11.0, 7.3, FZ0-0.15]→[12.6, TOP, FZ1+0.15]`, plus the plain rear plate `[12.6, 7.35, FZ0-0.1]→[12.62, TOP-0.05, FZ1+0.1]` (east only, no outline). Keep the existing reason: the sights view must not read black.
12. **Cylinder latch** (thumbpiece) on +z, behind the cylinder: `[11.25, 9.15, FZ1+0.15]→[12.35, 9.75, FZ1+0.4]`, `steel`, pat `serr` (knurled). This is the classic revolver detail first person sees.
13. **Rear sight, chunky.**
    - Base `[11.2, TOP, 7.1]→[12.65, TOP+0.15, 8.9]`: `sight`.
    - Posts `[11.75, TOP+0.15, 7.15]→[12.65, SY, 7.7]` and `[11.75, TOP+0.15, 8.3]→[12.65, SY, 8.85]`: `sight`. The notch is 0.6 wide, as now.
    - **White outline** (the target-sight look) on the posts' rear faces: `[12.65, TOP+0.2, 7.6]→[12.68, SY-0.05, 7.7]`, `[12.65, TOP+0.2, 8.3]→[12.68, SY-0.05, 8.4]` and the bottom strip `[12.65, TOP+0.15, 7.7]→[12.68, TOP+0.25, 8.3]`: `post`, east only, no outline.
14. **Tang** `[12.6, 7.0, 7.15]→[14.3, 10.9, 8.85]`: `frame`. **Backstrap** (metal behind the grip's top, as in the in-use view): `[14.55, 5.0, 7.3]→[14.85, 7.3, 8.7]`: `frame`.
15. **Lower frame** `[8.0, 6.7, 7.05]→[12.6, 7.6, 8.95]`: `frame`. **Side-plate screws** on -z: `[8.6, 6.95, 7.0]→[9.0, 7.35, 7.05]`, `[11.4, 7.6, 6.25]→[11.8, 8.0, 6.3]` and `[12.0, 10.8, 6.25]→[12.4, 11.2, 6.3]`: `screw`. Optionally a `screwHi` 0.2 dot in each.
16. **Trigger guard**: the same three bars, plus two inner corner fillets `[8.9, 5.2, 7.5]→[9.2, 5.5, 8.5]` and `[10.6, 5.2, 7.5]→[10.9, 5.5, 8.5]` (the rounded loop): `frame`. **Trigger**: a wider target trigger `[9.5, 5.45, 7.7]→[10.15, 6.7, 8.3]`, `steel`, pat `{north: groove, south: groove}`, rotation as now (15° about z at [9.85, 6.7, 8]).

**Grip (body)**: the square-butt target stock, replacing the plow handle and the silver butt cap.

17. **Three straight boxes stepping back.** These are PG3D's stair-stepped rear edge, an effective rake of about 10°.
    - `[12.2, 4.7, 6.75]→[14.6, 7.25, 9.25]`
    - `[12.35, 2.7, 6.75]→[14.9, 4.7, 9.25]`
    - `[12.5, 1.5, 6.8]→[15.1, 2.7, 9.2]`

    c `{all: wood, east: woodDark, down: woodDeep}`, pat `grain`, ink `woodDeep`.
18. **Front swell** under the trigger guard: `[11.3, 1.8, 6.95]→[12.35, 4.55, 9.05]`, c `{all: wood, south: woodDark, north: woodDark, west: woodDark}`, ink `woodDeep`. Its outline against the stock is the reference's dark groove.
19. **Checker panels** on both sides: `[12.6, 2.9, 9.25]→[14.3, 6.6, 9.28]` and `[12.6, 2.9, 6.72]→[14.3, 6.6, 6.75]`, `woodDark`, pat `check`, ink `woodDeep`. They give the rich texture.
20. **Escutcheons**, two per side: `[13.25, 5.75, 9.28]→[13.75, 6.25, 9.31]` and `[13.5, 3.05, 9.28]→[14.0, 3.55, 9.31]` (+z), mirrored at z 6.69-6.72 (-z). `screw`, no outline, plus a 0.2 `screwHi` center.

**Hammer (part `hammer`; pin [13.5, 10.7, 8] and COCK 27° unchanged)**

21. Body `[13.05, 10.5, 7.45]→[14.05, 12.7, 8.55]`: `steel`, ink `sight`. Spur `[13.5, 12.0, 7.3]→[15.0, 12.85, 8.7]`: `steelHi`, pat `serr` (knurled, chunkier). Both use the existing -27° rotation. The cocked spur's highest point is ≈11.94 + its thickness, which stays below SY.

**Cylinder (part `cyl`)**

Keep the **12-gon**. It is invariant under the shot's 60° turn: light and dark flats alternate with period 60°, so the snap back at the end of the shot is invisible. Every new cylinder detail must also come in a sixfold set.

22. Set **CR 1.45** (from 1.6), so it sits inside the wider window: z 6.55-9.45 against the members' 6.45-9.55. The strap clearance is CY + CR/cos 15° + 0.08 = 11.58. The chambers (CHR 1.0, mouths ±0.3) still fit: their farthest corner is at 1.34 < 1.45.
23. Colors `cyl` (light flats) and `cylDark` (flutes) at the reference's contrast (`#dedede` / `#969696`). Ends `cylEnd`. Chamber mouths `bore` front and back, as now.
24. **Bolt notches**: six small dark slots near the rear on the six light flats: one thin `T` box at 0° (±z faces) and two `U` boxes at ±30° (±y faces), x CX1-1.0→CX1-0.55, 0.24 wide, 0.02 proud, `chromeInk`, no outline.
25. **Ratchet** on the rear face (visible when swung out in the reload): `[CX1+0.01, CY-0.35, 7.65]→[CX1+0.04, CY+0.35, 8.35]`, east only, `steel`.

**Crane (part `crane`)**

26. The ejector rod now lives inside the shroud: `[0.75, 9.25, 7.85]→[CX0, 9.55, 8.15]`, `steel`. Its **knurled tip** pokes out of the shroud's front step: `[0.35, 9.15, 7.75]→[0.75, 9.65, 8.25]`, `steelHi`, pat `serr`. The crane arm stays as now. With the wider frame front (z up to 9.55), most of the arm is inside the frame when the gun is closed, which is right for a revolver; it shows when it swings. In the reload the rod swings out with the cylinder about the same HINGE; it passes through the shroud's side for 2-3 frames, which is acceptable.

**Shells, rounds, loader, flash, flashads**: same geometry (they are relative to CX0/CX1/CY/CHR and XM). Recolor the loader neutral.

**Not added, on purpose:**
- Vents, grilles and a vented rib. They are not in PG3D's design and would turn the gun into a Python.
- Extra glow.
- Copper bullet noses in the front chamber mouths. They would show in the empty cylinder during the reload.

The detail budget goes to the revolver's real equivalents: seams, steps, screws, knurling, the roll mark, notches and the sight inserts.

## 4. What our model gets wrong or lacks

1. **The barrel is too short** (muzzle -2.6; the reference is ≈ -6.5). This is the biggest silhouette difference: PG3D's gun is about two-thirds barrel. It is also an octagon, where PG3D has a two-tone square box.
2. **There is no underlug**, and the ejector rod is exposed instead. The reference has a ~40% shroud with a stepped front.
3. **The front sight is a thin blade**, not PG3D's chunky raised block. The barrel top is too close to the strap: PG3D's frame stands ≈0.65 above the barrel. With the two-tone barrel and the ramp, our top strap at 12.5 against the barrel top at 12.15 keeps a visible step.
4. **The frame doesn't read as a window.** The straps (z 7.1-8.9) are narrower than the cylinder (±1.6), so the cylinder bulges out and the bright front post is missing.
5. **Colors.**
   - The metal is bluish (`[224,230,240]` and similar), where the reference is neutral grey.
   - The frame is a darker blue-grey than the barrel; PG3D's frame is the same bright silver.
   - The wood is dull brown (`[128,70,32]`), where the reference is red-orange `#a93d14`.
   - The loader is bluish.
6. **The grip is a strongly raked plow handle with a silver cap.** The reference is a nearly straight square-butt target stock with a stair-stepped back, a front swell under the guard, two silver escutcheons and a dark butt.
7. **The sights are thin.** PG3D's rear posts are chunky black blocks. The white outline and the red insert are our own accents in the Model 29's spirit.
8. **There is no detail layer.** No seams, screws, latch, knurling, roll mark, bolt notches or ratchet. Most faces are 1-3 texels, all outline, as `ours-tex-x8.png` shows.
9. **Outlines are a 0.5-unit ink everywhere** (density 2). Thin members read as black bars.

## 5. Hard constraints for the rebuild

- **Name and returns.** `pgGun('gun_rev', …)`, and the module returns exactly `{ 8, 1008, 2008, 3008 }`; make-item-art.js refuses anything else. Keep the shape of each entry:
  - 8: `byContext('', flag(2, cooldown('',12,draw), cooldown('',8,shot(1))))`
  - 1008: `byContext('ads', flag(2, composite('ads'), cooldown('ads',8,shot(0.45,'flashads'))))`
  - 2008: `byContext('sprint', composite('sprint'))`
  - 3008: `byContext('', cooldown('',40,reload))`
- **Parts the frames move (names must stay):** `body` (moves only with the whole gun), `hammer`, `cyl`, `crane`, `shells`, `rounds`, `loader`, `flash`, `flashads`. Keep `hidden` and `noFull` = `['flash','flashads','shells','rounds','loader']`. A new detail goes in the part it must move with: cylinder details in `cyl`, the rod and knob in `crane`, the spur in `hammer`, everything else in `body`.
- **States:** `ads` = `aim({ sightY: SY, rearX: 12.6, rearDepth: 1.7, scale: [1.6, 2.4, 2.4] })` and `sprint` (rotation [-28,-55,12], translation [-5.2,1.4,-2.0], scale 0.6). The pack's skin numbers are Default 8, Scope +1000, Sprint +2000, Reload +3000 (357_Magnum.yml `Skin:`).
- **Aim alignment.** The sight line is **y = SY = 13.0, z = 8**. It passes through the rear notch (the gap z 7.7-8.3 between the posts, whose tops are exactly at SY) and grazes the **front blade's top** (SY). Nothing else between the eye and the blade may reach above y = SY - 0.05 inside z 7.6-8.4:
  - barrel top 12.15
  - ramp 12.7
  - top strap and channel 12.52
  - rear base 12.65
  - spur ≤ ~12.85 even uncocked
  - red insert ≤ 12.87, which is meant to sit just under the crosshair

  `rearX` (12.6) must stay the rear sight's rear face. The white strips protrude only 0.03; update `rearX` if the posts move. **Moving SY or rearX re-aims the ADS view** (aim() recomputes the translation, but the tuned look and `rearDepth` change). Keep both.
- **Constants and pivots the frames use.** Keep these, or move the frames with them:
  - BY 11.0, CY 10.0, CX0 6.8, CX1 10.95, CHR 1.0, HINGE [8, 8.4, 9.5], COCK 27
  - GRIP [13.0, 6.4, 8] (the kick), FINGER [10.0, 6.0, 8] (the twirl), HAMMER [13.5, 10.7, 8]
  - CAXIS [8.9, CY, 8], AXIS [9, 9.5, 8] (the reload roll), LOADER_FROM [6, -7, 2.5], LOADER_BEHIND [1.4, 0, 0], shells pivot [10.5, CY, 8]
  - The top chamber (k = 0) must stay on the barrel's axis (CY + CHR = BY).
  - Changing **CR** is safe: only the cylinder's flats and the straps' clearance use it.
  - Changing **TOP** is safe as long as it stays below SY - 0.35.
- **Flags.** Only **flag 2** (GunFx's draw on a gun with a shot clock). No flag 0 (not automatic) and no flag 1 (no firearm action).
- **GunFx clocks** (`gunfx.guns.357_Magnum: { shot: 8, draw: 12 }`), the reload (`Reload_Duration: 40`), and the sounds the frames are timed to:
  - shot: `rev.cock` at tick 4, which is the hammer cocking from p 0.45
  - reload: open 4 (p 0.11), eject 11 (0.29), load 22 (0.56), close 30 (0.76)
  - `Weapon_Equip_Delay` 12 = the draw; `Delay_Between_Shots` 10 > the 8-tick shot.

  Don't change the frame counts or the phase windows.
- **Skins** (skins.js `gilded`, the gun's only look). It themes `chrome, chromeDark, frame, frameDark, cyl, cylDark, cylEnd, wood, woodDark`, with pat `chrome/frame/cyl → gold`.
  - **All nine keys must stay in the palette**, or paintSkin throws and the pack build stops. They must keep their roles: barrel, frame, cylinder flats, flutes, ends, grip.
  - New metal keys would stay silver on the gold gun. Add them to `gilded` in skins.js: `chromeHi [255,228,140]`, `chromeMid [214,172,64]`, `screw [240,206,96]`, `screwHi [255,240,180]`, `woodDeep [8,8,10]`, and optionally `steelHi`.
  - Geometry changes are fine, because paintSkin repaints whatever tiles the gun made.
- **KEEP keys** (never recolored by a skin, and pg.js refuses to theme them). This gun uses `sight`, `bore`, `flash`, `flashCore`, plus the new `bead`, `beadHi` and `post`. Use exactly these for the aim and glow pieces, so no skin can hide the sights.
- **Model limits.** Every box and rotation origin must be within -16..32 (pg.js throws). With XM = -6.0 the flash reaches -11.6 and flashads -11.0, and z 4.6-11.4 is fine. Keep element rotations within ±45° (the kit's current practice).
- **Why XM = -6.0 rather than the measured -6.5, and what a longer barrel touches.** The grip, the hand, the frame and the sights don't move, so these are only re-tuning, but they must be checked with renders:
  - `display.firstperson` (rotation [0,-73,0], translation [-4.2,3.6,-2.4], scale 0.6): the muzzle and the hip flash reach about 2 screen units further toward the crosshair. The flash must not cover it.
  - `gui` (rotation [0,180,-34], scale 0.76): the gun is now ≈21 long. Expect scale ≈0.68-0.7 and a re-centred translation so the icon fills the slot like the others. The shop icon and the gilded icon use it too.
  - The **draw** twirl about FINGER: the muzzle's radius grows from ≈13.6 to ≈16.8. The back-swing may come at the camera; raise the spin's `out` push (-10 → about -13) if it clips.
  - The **reload**'s 40° muzzle-up tip may push the muzzle off the top of the screen.
  - Sprint and third person (NPC cops at difficulty 2 hold feather 8, and in third person the hand is at the grip, which didn't move).

  Render to check: `render-item.js feather@8 … fp 640 400 --flag 2 --cooldown 0.9/0.7/0.5/0.3`, `--cooldown 0.95/0.6` (shot), `feather@3008 … --cooldown 0.85/0.7/0.45/0.3/0.2`, `feather@1008 fp` (the sight picture with the red bar under the crosshair), `feather@2008 fp`, `donating:item/gun_rev_full gui 512 512`.
- **Optional, not recommended.** The reference's cylinder looks shorter (≈2.5-3 units). It could be shortened to CX0 ≈ 7.3: the rounds (8.5-11.3) and shells (9.3-11.3) still fit, and the crane arm moves to ≈7.0. That buys a longer, chunkier frame front. But it is a second geometry change in the reload's key piece, for a small gain. Keep 6.8-10.95.
