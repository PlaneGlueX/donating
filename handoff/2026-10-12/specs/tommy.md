# Brave Patriot remake (tools\guns\tommy.js): design spec

The target is PG3D's Brave Patriot (a WWII M1928 Thompson) at the Photon Shotgun's level of detail. Keep its design: a long grey receiver with a groove along it, a long square barrel, a long three-band wooden handguard, a big raked wooden grip, and a dropped, fanning "banana" stock in orange over red. Keep our own changes: the 50-round drum instead of the stick magazine, the Cutts compensator, the cooling fins, the brass top knob and the aperture sight.

**Recommendation:** rebuild from **blockout B** (`work\tommy\proto\tommy_proto.js`, `VARIANT=B`). It is a real gun module with this module's frames, pivots, sight line and numbers unchanged, and it builds and renders in every view and frame. It needs:
- the PG painter (`style: 'pg'`, density 4, materials and decals; the prototype is `work\style\proto\pg.js`);
- one small kit addition, **open edges** (`open: ['east', 'west']`: no ink seam where a box continues into its neighbour). Without it the stepped stock reads as stacked planks. Diff: `work\tommy\proto\open-edges.diff`; patched kit: `work\tommy\proto\pg-open.js`.

Blockout A (`VARIANT=A`) is the layout closer to the reference: a receiver tail behind the grip, and the whole stock below the receiver line. A costs most of the wood in the first-person view (section 1, "Options").

Rebuild the blockout's frames (`node build.js tommy_proto.js <prefix> "<name>|<what>|<view>|<extra>"` with env `KIT`, `VARIANT` and `SKINS`; see `work\tommy\proto\build.js`):
```
KIT=<abs>\pg-open.js VARIANT=B SKINS=<repo>\tools\guns\skins.js tools\node\node.exe build.js tommy_proto.js p7 "gui|donating:item/gun_tommy_full|gui" "fp|feather@15|fp"
```

## Work files (`scratchpad\remake\work\tommy\`)
- `tommy-ref-annotated.png`: the wiki Appearance icon unsheared into a right-side profile in our units (grid 1 unit), with 14 numbered callouts. Section 1 uses these numbers.
- `tommy-compare-icon.png`: the reference icon, our current gui icon, and the B and A gui icons.
- `tommy-compare-profile.png`: the reference profile, ours now, B and A, all from the right side in the same frame and scale. This is the proportion check.
- `tommy-compare-fp.png`: hip, ADS and reload for ours now, B and A. `tommy-blockout-frames.png` has every B frame: hip, fire, draw, ADS, ADS fire, sprint and three reload frames.
- `tommy-blockout-annotated.png`: B's left side (the side first person sees), with 18 callouts carrying coordinates.
- `tommy-compare-left-top.png`: the left side and the top for ours now and B. `tommy-compare-tp.png`: third person. `tommy-skin-neon.png`: the existing Neon skin on B.
- `tommy-kit-options.png`: B built with the repo's pg.js, with the PG painter, and with the painter plus open edges.
- `tommy-colors.png`: color swatches for the reference, ours now and the proposal.
- Raw material:
  - `ref-app.png`, `ref-app-x2.png`, `ref-app-x4.png`, `ref-old-inuse.png`, `ref-old-x3.png`: the reference images (the wiki files are WebP; converted with `..\style\webp2png.ps1`).
  - `z-*.png`: zooms of the reference.
  - `ref-unsheared.png` and `unshear.js`: the reference profile and the script that makes it.
  - `profile.txt` and `profile.js`: per-x runs of material classes in the reference.
  - `ours-*.png`: renders of our current gun.
  - `ortho.js`: an orthographic face renderer for any model JSON plus texture.
  - `proto\`: the blockout module, the build sandbox, renders `p7*` (B; `p8*` is B with the grip's swell and ridges widened to 0.75, the module's current state) and `p7A*` (A), `guifit.js` (a gui bounding-box calculator).

There is **no in-use or first-person picture** of PG3D's Brave Patriot. The only other picture is the 2014 armory screenshot (`ref-old-*`), which shows the old model from the same 3/4 angle. The first-person composition is therefore ours, and B keeps it.

---

## 1. What the reference looks like, part by part

**Method.** The Appearance icon (256 px) is a 3/4 view with the gun's right side toward the camera. The barrel axis runs 31° up and to the right, and the gun's verticals stay vertical in the image. I sheared it into a side profile:
- x = -8.6 + (245 - u) × 0.1588
- y = 9.4 + ((146 - 0.6u) - v) × 0.136

Here (u, v) is the icon pixel. The muzzle maps to our -8.6, the butt to our 28.4 and the receiver top to our 9.4.

Error bars: lengths ±10%, heights ±20%. The view is in perspective and the axis is foreshortened, so heights are probably *overstated*, and the drop angles are too steep by about 5°.

| # | Part (reference) | Reference, our units | Ours now (tommy.js) |
|---|---|---|---|
| 1 | **Muzzle block**: a chunky dark-grey block at the very end with the bore on its end face. It is taller than the barrel: it also caps the handguard's line below. | x -6.0..-8.6, y ≈ 5.1..8.8 | Cutts comp x -8.6..-6.2, y 7.0..9.0 (no cap below) |
| 2 | **Barrel**: one long square tube, black-outlined, with a light middle band (#9c9c9c). Its top sits ≈ 0.7 under the receiver top. No fins. | x 7.5..-6.0; side y 7.1..8.6 (≈ 1.5 tall) | front tube x -6.2..-3.0 (y 7.3..8.7), fins x -3.0..2.8 (y 7.0..9.0) |
| 3 | **Handguard**: long and deep, in **three bands separated by black lines**: an orange strip (y 7.0..6.1) with a peach streak near its rear, a red middle (5.9..4.8), a deep-red bottom (4.7 down). | x 6.3..-5.5 (≈ 80% of the barrel section). Top 7.1. Bottom 3.3 at the front, 2.7 at the rear (x ≥ -1). | x -2.6..2.6 (46% of the barrel section), y 5.0..7.3, two tones and a metal cap |
| 4 | **Its steps**: the bottom edge steps (deepest at the rear). The front end climbs toward the muzzle in lit orange stair tiles. | 2-3 steps of ≈ 0.6 | flat |
| 5 | **Receiver front section** over the magazine (the page's "charging handle on the top"): a separate block, lighter grey with an L-shaped highlight. Its top is **flush** with the receiver. | x 7.5..10.5 | the knob on top (x 4.9..6.3), a thin ring x 2.4..3.2 |
| 6 | **Receiver**: a long grey box with a light top band (8.7..8.9). It runs **≈ 6 units behind the grip** and sits on the stock's front. | x 23..7.5 (≈ 15.5 long). Top 9.3-9.4. Bottom 6.2-6.4 (x 13-16) and 6.9-7.0 (x 17-22). | x 2.6..15.0 plus a back end 15..16 (13.4), y 6.4..9.4 |
| 7 | **Side groove**: a long black line with a light lip under it. It is the metal's only panel detail. | x ≈ 11..22, line at y ≈ 8.0, lip 7.5..7.7 | none (two light levers on the left, a port on the right) |
| 8 | **Stick magazine**: thin, dark grey, a light band on each face. | x 6.6..9.6, from y 7.4 down to ≈ -3.3..-4.5 | **drum** at (7.4, 2.7), r 3.6, on a rail (ours, keep) |
| 9 | **Trigger**: small reddish/dark tiles in front of the grip. | x ≈ 12, y 2.8..4.9 | guard x 10.8..13.8 (y 4.3..5.4), trigger x 12..12.5 |
| 10 | **Pistol grip**: big. Orange with a light front edge; the rear edge is a staircase of lit tiles. Raked back ≈ 11-15°. | x ≈ 13..16.5 at the top. Top ≈ 5.0, bottom -0.8 (front) to -2.5 (rear). 6-7.4 long, 2.5-3 wide. | x 12.8..15.4, y 0.4..5.4 (5 long), rot 15° about (14.1, 5.4) |
| 11 | **Junction** under the receiver's rear: dark frame and tang with small orange and grey tiles. | x ≈ 17..20.5, y 3..6.3 | the back end x 15..16 |
| 12 | **Stock top**: flat under the receiver (y ≈ 7.0, x 17..22), then dropping in voxel steps to the butt. A peach band follows the stepped top edge. | y 6.0 at x 23 down to 3.7 at x 28 | flat at y 9.1, x 15.8..27.6 |
| 13 | **Stock underside**: a long staircase of **lit stair tiles**, each riser lit orange or peach with a black outline. The side's lower part is red. | bottom 1.9 at x 19, -1.2 at x 23, -4.0 at x 26 (≈ 40° apparent) | three dark steps (y 4.4 / 3.4 / 2.6); at density 2 they read black |
| 14 | **Butt**: tall, fanning, no separate plate visible. Its end shows the deep-red underside. | x 26..28.5, y ≈ -2.6..3.7 (6-7.7 tall) | butt plate x 27.6..28.4, y 2.2..9.3 (black) |

**Overall proportions** (the reference matched to our overall length):

| | Barrel section (muzzle to receiver front) | Receiver | Stock (horizontal) |
|---|---|---|---|
| Reference | 16 units (43%) | 15.5 (42%) | ≈ 6 (≈ 15%), dropping steeply |
| Ours | 11.2 (30%) | 13.4 (36%) | 12.4 (34%), level |

Heights in the reference: receiver ≈ 3, handguard ≈ 4, grip ≈ 6-7, butt ≈ 6-7.7. Everything below the receiver is bigger than ours. The drum explains part of the length difference: it is 7.2 wide against the stick's 3, so our receiver must reach over it to x 2.6.

**Old look (2014 armory screenshot):** the same layout. Lighter, more orange wood (#d25412 over red #9c2424), lighter greys (#666666 / #787878), a stick magazine with a light stripe, and an open bore at the muzzle box.

### What to keep, what to move (with what moving breaks)

Keep: the overall length (-8.6..28.4), `SY` 11.2, the rear aperture (x 12.3..12.9), the front blade (x -5.95..-5.45), the drum centre (7.4, 2.7), the knob and its slot, the grip's top and its pivot, and the receiver x 2.6..15/16. Every frame pivot hangs off these. The reference differs clearly in four places, and B follows it in each:
- **Stock dropped and fanning** (B: top 9.0 → 5.0, bottom 5.4 → -1.4, eight slabs). It is hidden while aiming, so ADS is unaffected. Two things change:
  - **GUI**: the icon no longer fits. New gui transform: rotation `[0, 180, -45]`, translation `[0.1, 1.9, 0]`, scale `[0.46, 0.46, 0.46]`. `guifit.js` gives a box of -5.75..6.22 × -7.86..7.62 in the -8..8 slot. The old transform cut the butt off; ours now already pokes out to -8.66.
  - **Third person**: the butt pokes out behind the arm. Use thirdperson rotation `[0, -90, 8]`, which lies the stock along the arm like today (`tommy-compare-tp.png`). This matters because the hit bodyguards hold this gun.
  - First person keeps its wood (B only).
- **Handguard long and deep** (B: x -5.0..2.6, y 3.4..7.3, three layers). It is body geometry that no frame moves. It stays clear of the drum (x ≥ 3.8) and of the reload (the drum slides along +z). It is under the ADS clearance line (section 5).
- **Muzzle cap and taller front**: a cap box under the compensator, x -8.3..-6.45, y 5.5..7.0. The flash starts at x -8.7, so nothing moves.
- **Bigger grip** (B: down to y -0.7 with a 0.4 cap, a rear swell, finger ridges). The same `GRIP` rotation and origin, so the draw, kick and reload pivots are unchanged. It is included in the new gui fit.

Not followed:
- **The receiver's length behind the grip.** A adds a 1.4-unit tail (x 16..17.4) and drops the stock under it. In first person the tail becomes a big grey block in the lower right and the wood nearly disappears (`tommy-compare-fp.png`, A hip).
- **The full reference drop** (butt bottom -4). The butt would hang 3 units below the drum, and the gui would need scale ≈ 0.42.

### Options (key decision: the stock)
- **Cautious: B (recommended).** The stock's top starts at the receiver line (9.0) and drops 4 units to the butt; the bottom drops 6.8 (≈ 19° and 30°). First person, ADS and the overall length stay as they are. The silhouette clearly reads as the reference's dropped banana.
- **Realistic: A.** The reference's layout: a metal receiver tail x 16..17.4, the stock's top at 6.7 dropping to 3.7, the bottom 3.4 to -2.0. It is closer in the icon and in third person. In first person you mostly see metal (the tail) and a sliver of wood.

---

## 2. Colors per material (sampled from the current Appearance)

The icon is lossy WebP. The values below are cluster centres of opaque pixels; see `tommy-colors.png`. **Every grey in the reference is neutral** (R = G = B), and the outline is pure black.

| Material | Reference tones (dark → light) | Ours now | Proposed palette key = value |
|---|---|---|---|
| Ink | #000000 (outline, about 1/4 to 1/3 of the pixels) | [16,18,24] | the PG painter's ink [10,10,12] |
| Gunmetal | #282828, #464646, #646464-#6e6e6e (base), #969696-#a0a0a0 (top band and light band), glint ≈ #b4b4b4 | metalD #383a40, metal #5c5e66, metalL #92949c, dark #1c1d22 (all bluish) | `dark` [38,38,42] #26262a, `metalD` [70,70,74] #46464a, `metal` [104,104,108] #68686c, `metalL` [158,158,162] #9e9ea2. The painter adds hi, lo and glint. |
| Wood | deep #3c1414 / #5a1e1e, dark red #aa3232, base #e65a28-#f05a28, light #ffa06e, peach #ffb482 | woodD #902a22, wood #d05624, woodL #ec9a66 | `woodDD` [92,32,28] #5c201c (**new**), `woodD` [168,50,46] #a8322e, `wood` [236,92,42] #ec5c2a, `woodL` [255,178,128] #ffb280 |
| Magazine / drum | as gunmetal (#2a2a2a … #9c9c9c) | drumD #18191d, drum #50525a | `drumD` [40,40,44] #28282c, `drum` [100,100,104] #646468 |
| Brass (ours, not in the reference) | none | brassD #9e7024, brass #e8b84a | unchanged |
| Aim points | none in the reference | post [28,29,34] | `post` unchanged; `sight` [34,34,38] (**new**, already in pg.js KEEP) for the rear ring |
| Flash | none | flash, flashCore | unchanged |

**Ramps.** Use the PG painter's materials: `metal` for metal, metalL, metalD, drum, brass and brassD; `dark` for dark and drumD; `wood` for all four wood keys; `flat` for post, sight and bore; `glow` for the flash. It derives 4-5 tones per base: hi ≈ ×1.4 toward warm light, lo ≈ ×0.68, deep ≈ ×0.42, and glint. That matches the reference's ramps:
- greys: 40, 70, 106, 156, 180;
- wood: deep red (#5a1e1e), red, orange, light, peach.

Don't use brass's `gold` material: its sparkles read as noise on a 1.4-unit knob.

---

## 3. Every detail to add (B coordinates; all boxes are in `proto\tommy_proto.js`)

**Density rule (PG painter, density 4).** The outline is 1 texel = 0.25 units on every edge, so a face under 0.75 units across shows no color: it is all ink. Use this on purpose for black rings and seams (the comp lip, the barrel band). Give small colored parts at least 0.75 units, or `outline: false`. In the blockout, the grip's swell (0.45) and ridges (0.35) are still all ink: widen them to 0.75.

**Muzzle and barrel**
1. Compensator x -8.6..-6.45, y 7.0..9.0, lit top. Keep the 3 top slots (bore) and the bore on its end face.
2. **Lip ring** x -6.45..-6.15, y 6.85..9.15, z 6.85..9.15 (metalD, ink dark). It reads as a black ring: a silhouette step.
3. **Muzzle cap** x -8.3..-6.45, y 5.5..7.0, z 7.15..8.85 (metalD, lit top). This is the reference's tall front block.
4. Front barrel x -6.15..-3.0, y 7.3..8.7 (chrome pattern).
5. Front sight: base x -6.12..-5.1, y 8.7..9.2 (metalD); blade `post` as now.
6. **Barrel band** x -5.35..-5.0, y 4.75..9.05, z 6.6..9.4 (metalD): a black ring around the handguard's nose.
7. **Fins** x -3.0..2.6, y 7.0..9.0. Better than the blockout's `groove`: a `ribs` decal on both sides (slats with a lit top texel and black gaps, Combat Rifle style) and grooves across the top.

**Handguard (three layers; each its own box, so the black line between bands comes free)**

8. Layer 1, x -5.0..2.6, y 6.2..7.3, z 6.7..9.3: `wood`, the up and west faces `woodL`, grain on the sides. A **peach streak** (`woodL`, outline false, sides only) x -2.4..1.6, y 6.85..7.05, z 6.66..9.34.
9. Layer 2, x -5.0..2.6, y 4.9..6.2, z 6.75..9.25: `woodD`, west face `wood` (a lit riser). One `slots` groove along it at y ≈ 5.5.
10. Layer 3 (stepping up toward the muzzle), z 6.8..9.2: x -1.2..2.6, y 3.4..4.9, and x -3.6..-1.2, y 4.0..4.9. `woodDD`, west risers `woodD`.

**Receiver**

11. **Receiver ring** x 2.6..4.2, y 6.2..9.6, z 6.85..9.15 (metalD, lit top, ink dark), with 2 rivets (metalL) down its side. It is 0.2 above the receiver; the reference is flush there, so 9.4 is also fine.
12. Receiver x 4.2..15.0, y 6.4..9.4. Details:
    - a lit top band and bevels from the painter;
    - a **panel seam** at x 10.0 (`split`);
    - the **long side groove** x 10.3..14.7, y 7.75..8.25, on both sides (`slots`, n 1). This is the reference's groove;
    - **3 rivets** in metalD along y ≈ 6.8 over the drum, x 4.6..9.6;
    - a **brass star** stamp on the left side only (the side first person sees), x 6.4..7.65, y 7.35..8.6. Rows `..b.. / bbbbb / .bbb. / .b.b. / b...b`, b = brass. It's our flourish for the name; in the Neon skin it turns cyan.
13. Knob slot (bore line on top) x 4.4..9.8, as now.
14. Ejection port (right side) x 6.0..9.2, y 7.3..8.7: an `inset` decal (black frame, shadowed floor), or the current dark plate.
15. **Fire selector and safety** (left side): two levers x 11.0..12.3 and 12.9..14.2, y 6.75..7.35, z 9.0..9.25 (metalL), each with a dark pivot. They sit below the groove so they don't merge with it.
16. Drum **rail** x 3.8..11.0, y 6.0..6.4, z 6.6..9.4 (metalD) with 4 rivets (metalL).
17. **Rear sight**:
    - base x 12.0..13.2, y 9.4..9.9;
    - the aperture ring as now, but in key `sight`;
    - **ears** x 12.3..12.9, y 9.9..10.9, z 6.95..7.3 and 8.7..9.05 (metalD). In ADS they frame the aperture (`p7-ads.png`).
18. **Trigger guard**, chunkier: bottom x 10.8..13.9, y 4.2..4.8; front post x 10.8..11.4, y 4.8..5.4. Trigger metalL x 12.0..12.5, y 4.7..5.4.
19. Back end x 15.0..16.0, y 6.0..9.4 (metalD, lit top), as now.

**Grip** (all with `rot: GRIP` = 15° about z at [14.1, 5.4, 8])

20. Main x 12.8..15.3, y -0.3..5.4, z 7..9: `wood`, grain on the sides, a `woodD` band on its lower ≈ 30% (`band` decal y -0.3..1.4).
21. **Rear swell** x 15.3..16.05, y 0.6..3.6 (wood, east face `woodL`): the reference's stair-stepped rear edge. Two narrower steps above it would complete the staircase.
22. **Finger ridges** x 12.05..12.8, y 1.2..2.0 and 2.8..3.6 (woodD).
23. Cap x 12.7..15.45, y -0.7..-0.3 (`woodDD`).

**Stock (the `stock` part)**

24. Wrist x 15.9..17.0, y 5.4..9.0, open east.
25. **8 slabs** x 17.0..27.6, each 1.325 wide, z 7..9. Top and bottom snapped to 0.25:

    | Slab x | y |
    |---|---|
    | 17.0..18.33 | 5.0..8.75 |
    | 18.33..19.65 | 4.25..8.25 |
    | 19.65..20.98 | 3.25..7.75 |
    | 20.98..22.3 | 2.5..7.25 |
    | 22.3..23.63 | 1.5..6.75 |
    | 23.63..24.95 | 0.75..6.25 |
    | 24.95..26.28 | 0.0..5.75 |
    | 26.28..27.6 | -1.0..5.25 |

    Each slab:
    - colors: sides `wood` with grain; up `wood`; east and west risers `woodL` (the lit stair tiles); down `woodDD`;
    - a `woodD` **band** decal on its lower 42%, so the band's edge steps like the reference;
    - **`open: ['east', 'west']`** (first and last slabs: only the inner edge), so the side faces join without seams.
26. **Butt plate** x 27.6..28.4, y -1.6..5.6, z 6.9..9.1 (`dark`, ink metalD), with **2 screws** (2×2 rivets, metalL) on its back face. A `knurl` pattern on its back face is optional.

**Knob (the `bolt` part)**

27. Stem x 5.2..6.0, y 9.4..9.65 (brassD). Cap x 4.9..6.3, y 9.65..10.1 (brass, ink brassD, `serr` knurling on its sides).

**Drum (the `mag` part)**

28. Feed tab as now.
29. Four stacked pixel discs, each 0.1 prouder on both sides so no faces fight (the k-th box of a disc is 0.025 thinner, so a step of at least 0.1 keeps every box of the next disc in front):

    | Disc | r | z | Key | Notes |
    |---|---|---|---|---|
    | Rim | 3.6 | 6.5..9.5 | drumD | |
    | Face | 3.15 | 6.42..9.58 | drum | `chrome` pattern |
    | Ring | 2.15 | 6.32..9.68 | drumD | |
    | Centre plate | 1.75 | 6.22..9.78 | drum | |

30. **4 bolts** (metalL, ink dark, 0.48 square) at 45° on r 2.65: (DX ± 1.87, DY ± 1.87), z 9.5..9.66 and 6.34..6.5.
31. Brass winding key:
    - base DX ± 0.75, DY ± 0.75, z 9.78..10.05;
    - wing DX ± 1.45, DY ± 0.32, z 10.05..10.3;
    - back key z 5.95..6.22.

**Glow.** None besides the flash. The reference is a plain WWII gun and has no lit parts. An emissive accent would clash with the brass, and the Photon's "glow" budget belongs to energy guns.

**Optional extras** (cheap, within the rules):
- a sling swivel loop (metalD) under slab 5 and under the barrel band;
- a stamped arrow or "50" on the drum face near the key;
- a `knurl` back on the butt plate.

---

## 4. What our current model gets wrong or lacks

1. **The stock** is a level, straight 12-unit box flush with the receiver top, and its stepped underside reads as black because 1-unit steps at density 2 are all outline. The reference's defining shape is the opposite: a dropped, fanning banana in orange over red, with lit stair tiles on its stepped edges and no black.
2. **The handguard** covers 46% of the barrel section, against the reference's ≈ 80%. It is 2.3 tall (reference ≈ 4) and painted in two flat tones with a metal end cap. The reference has three bands with black lines between them, a peach streak and a stepped bottom and front.
3. **The grip** is smaller (5 long, one tone). The reference's is big, with a light front edge and a stair-stepped rear.
4. **The metal** is bluish (#5c5e66) and nearly flat. The reference's greys are neutral, with a lit top band and the long groove with a lit lip.
5. **No muzzle mass.** The reference ends in a tall dark block; ours ends in a 2-unit compensator above empty space.
6. **The receiver** stops at the grip. The reference's runs ≈ 6 units past it over the stock (A does this partially; B doesn't, by choice).
7. **Density 2** makes small parts black: the stock's steps, the levers, the knob's base, the comp slots. The PG3D look is 1-texel ink on faces 10-15 texels wide, which needs density 4.
8. **Little surface detail:** no rivets, seams, stair tiles, ribs or highlights. The Photon level needs about 25-30 of them across the gun (section 3).
9. **Intentional differences, keep them:** the drum instead of the stick magazine (50 rounds), the Cutts compensator (its slots feed the fire frames' jets), the fins, the brass knob (the reload and draw rack it), and the aperture and blade sights (ADS). The reference shows no sights.

---

## 5. Hard constraints the rebuild must keep

- **Returns exactly** `{ 15, 1015, 2015, 3015 }`. make-item-art.js `GUNS.tommy` is `[15, 1015, 2015, 3015]`, and the build fails on a missing or extra number. These are WeaponMechanics' `Skin:` values in `assault_rifles\STG44.yml`: Default 15, Scope +1000, Sprint +2000, Reload +3000.
  - `15`: `byContext('', cooldown('', 22, draw))` with `fallback = firing('', fire(1))`.
  - `1015`: `byContext('ads', firing('ads', fire(0.45, AIMED), AIMED))`, where `AIMED = { hide: ['stock'] }`.
  - `2015`: `byContext('sprint', composite('sprint'))`.
  - `3015`: `byContext('', cooldown('', 60, reload))`.
- **Name** `gun_tommy`. Model ids are `donating:item/gun_tommy_<part>[_<state>]` and `_full`. paintSkin maps skins by this prefix (the Neon look's models are `gunskin/tommy/neon/<rest>`, and core.sk's cos model is `donating:gunskin_tommy_neon`).
- **Parts the frames use**, names unchanged. Anything new goes into one of these parts:

  | Part | What moves or hides it |
  |---|---|
  | `body` | static under the whole-gun `gun` rig |
  | `stock` | hidden while aiming, so it holds everything near the cheek (B's wrist; A's tail) |
  | `bolt` | fire cycle +0.8..3.0 in x; draw and reload +3.4 in x |
  | `mag` | reload: tug -0.3 y; slide +z `SLIDE` 6.5; drop -12 y; hidden at p 0.32..0.4; slap -0.25 z |
  | `flash`, `flash2` | `hidden` and `noFull`; shown only by fire poses (`flash2` is the ADS size) |

- **States**:
  - `ads: aim({ sightY: 11.2, rearX: 12.9, rearDepth: 1.0, scale: [1.6, 2.4, 2.4] })`;
  - `sprint: { rotation: [-8, -48, 18], translation: [-4.2, 3.4, -2.4], scale: 0.58 }`.
- **Display**:
  - firstperson unchanged: `[0, -76, 0]`, `[-4.4, 4.6, -1.6]`, scale 0.62;
  - ground and fixed unchanged;
  - **gui** → `[0, 180, -45]`, `[0.1, 1.9, 0]`, 0.46 (B) or `[0.0, 2.0, 0]`, 0.45 (A);
  - **thirdperson** → rotation `[0, -90, 8]`.
- **Pivots**:
  - `SHOULDER` [14.1, 5.6, 8] (kick, draw);
  - the reload pivot [9, 6, 8];
  - `GRIP` element rotation `{ angle: 15, axis: 'z', origin: [14.1, 5.4, 8] }`;
  - `BORE_Y` 8.0;
  - drum centre DX 7.4, DY 2.7.
- **Aim alignment.** The sight line is y = 11.2 on z = 8. It passes through:
  - the rear aperture's hole (ring x 12.3..12.9, opening y 10.7..11.7, z 7.65..8.35);
  - the front blade's tip (`post`, x -5.95..-5.45, z 7.78..8.22, top exactly 11.2). Only rearX, sightY, rearDepth and scale enter `aim()`, so the blade's x can move without breaking the aim.

  **Clearance:** between the sights, within z 8 ± 1, nothing but the blade may rise above y = 11.2 - 0.47 × (1 + 0.1 × (12.9 - x)). That is 10.2 at the receiver front and 9.9 at the barrel band. Above it a part shows inside the aperture.
  - Blockout B's highest points: knob 10.1 (limit 10.3), ring 9.6 (10.18), band 9.05 (9.89), comp 9.0 (9.75).
  - Behind the rear sight, keep `body` below ≈ 10.0. Anything near the cheek goes in `stock`.
  - The ADS `flash2` jets stay under 10.3, as now.
- **Flags and clocks**:
  - only flag 0 (firing; `gun.firing` checks custom_model_data flag 0 and the use key);
  - GunFx `STG44: { shot: 0, draw: 22, fire: 5 }`: no shot clock, a 22-tick draw cooldown, the firing flag cleared 5 ticks after the last shot (9 shots a second, full auto);
  - no flag 1 or 2;
  - the reload clock is 60 frames (WeaponMechanics' reload is 50 ticks with rounds left, 60 from empty).

  The sound timing ties to the frames, so don't retime the frames:
  - mag_out at 6 (p 0.155), mag_in at 28 (0.555), bolt at 38 (0.736);
  - the draw's clicks at 0.66 s and 0.82 s (p ≈ 0.6 and 0.75; `tools\sounds\guns\tommy.js`).
- **Reload clearance.** The drum (all its boxes, z 5.95..10.3) slides +6.5 in z, so its back is at 12.45, clear of the body's maximum z (9.4 on the rail; levers 9.35). Then it drops 12. The knob's travel stays inside its slot (4.9 + 3.4 → 9.7 < 9.8).
- **Palette keys** that `tools\guns\skins.js` (Neon, legendary) themes for this gun must all stay: `metal metalL metalD dark wood woodD woodL drum drumD brass brassD`. paintSkin throws on a theme key that the gun lacks.
  - The new `woodDD` needs a Neon entry, e.g. `woodDD: [70, 8, 26]`. Without one it stays brown-red, which the render shows is acceptable.
  - The new `sight` is in pg.js `KEEP`, so no skin may recolor it, which is right for an aim point.
  - A released look is never renamed.
  - At density 4 the Neon texture becomes 256 × 256, which is fine.
- **KEEP keys in this gun:** `post`, `bore`, `flash`, `flashCore`, plus the new `sight`. Never theme them. Note that `flash2` here is a part, not a palette key.
- **Model limits.** Every box and rotation origin must stay within -16..32 (pg.js checks). The flash reaches -15.
- **Tests that touch it:**
  - `bots\run.js wm-ammo`: feather.json's 34 numbers are ours, and the models exist;
  - `gunskins`: the Neon look and its item definition;
  - render-item views: gui, fp, fpl, side, tp;
  - `--cooldown` frames: draw 0.4; reload 0.75, 0.47 and 0.27;
  - `--fire --time` for the flicker.
  - The left hand (fpl) mirrors the +z side detail (the star, the levers) to the screen's right. Check it once.

---

## Open for the owner and the in-client check
- B or A (the stock's height and the receiver tail). B is recommended.
- The brass star on the left side: keep it or drop it.
- How the stair tiles on the stock's top feel at hip. Near the camera they are big (`tommy-blockout-frames.png`). If it's busy, use 12 slabs with 0.25 steps on top.
- The open-edges kit addition (or the fallback of fewer, longer slabs with seams; `tommy-kit-options.png`).
