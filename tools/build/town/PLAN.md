# Mountainside: the site plan for the town south of the prison

Written 2026-10-20 for the owner's request: "start building the next part of the city. take inspiration from how the road leads down to a town nearby with small shops and gun store like jailbreak. use images from the wiki to aid in building."

This is a plan. Nothing has been pasted.

**Rules for the builders of this run:**
- Write only under `tools/build/town/` and `tools/build/town.js`.
- Don't paste anything.
- Don't send RCON commands that change blocks or entities. That includes `jail.js paste` and `jail.js labels`.
- Don't run bot scenarios, don't touch Skript files or the prison modules (`tools/build/jail/*`), and don't commit.
- Why: another workflow is testing the prison on the live server.

The numbers in the tables are the truth. Section 9 is the shared code every module copies verbatim, and `tools/build/town/plan-layout.js` draws all of it. Render it with:

```
tools/node/node.exe tools/build/render.js tools/build/town/plan-layout.js <out> --views top --px 2
```

Add `CROP=x1,z1,x2,z2` for a close look.

## 0. The town in one paragraph

The prison's north-south road (x 431..466) carries on south past z 470 and narrows from 36 to 24 blocks. It climbs half a block every 4 blocks into a ridge, then runs level through a 64-block tunnel at y 70. It comes out high on the ridge's south face with the town spread out below. From there it drops half a block every 6 blocks down to the river, crosses a bridge and becomes Main Street.

Driving in, you pass:
- on the left (east), the Gun Shop, with its lot by the river and a giant target sign;
- on the right (west), the pink Donut Shop with its roof donut, and the Garage behind it;
- after the donut, the Gas Station and Convenience Store;
- across the street, the Gear Shop and Bag Shop (Jailbreak's Glider Store and Pet Shop, repurposed for Donating);
- further on the left, the 1M Dealership;
- on the right, a loop road with 12 houses and Mara's Safehouse, plus a cul-de-sac.

The river wraps around the town's north and west sides into a lake with a beach. There are wind turbines on the east hills and a water tower on a hill at the far (south) end.

This is Jailbreak's Mountainside Town turned 90 degrees. Its west-to-east Main Street runs north to south here, so the side Jailbreak has on the north (the gun shop, the dealership) is east here. Its houses' side is west.

**Why south:**
- The prison's N-S road already ends at the edge of the prison's box (z 470), pointing south.
- Everything south of z 470 is generated flat grass. It was read from the region files, so nothing on the server was loaded.
- The highway's two ends (x -40 and x 480) stay free for the rest of the map later (the city). The volcano gets its own site south-east of the town (section 5, "Kept free"), where Jailbreak has it.

## 1. Frame, ground and heights

| What | Value |
|---|---|
| World | `jailbreak` (superflat: grass y 64, dirt 61..63, stone ≤ 60) |
| Town box (every block of the town lies in it) | x 120..770, z 471..1300, y 50..160 |
| The prison's box (never written) | x -40..480, z -30..470: the town starts at z 471 |
| Approach / town split | z ≤ 728 is the `approach` module; z ≥ 729 is the town |
| Ground floor of every building | y 64 (the floor block); players stand at y 65 |
| Street surface | y 64 everywhere in town; curb slabs at y 65 |
| Water (river and lake) | top water block y 60, bed y 55..58, banks rising to y 64 over 6 blocks (the beach over 14) |
| Tunnel road | road block y 70 (stand y 71), tunnel z 551..614 |
| Highest things | ridge peak y 108, dealership tower y 96, water tower top ~y 116, turbines ~y 145 |

**"The road leads down."** The approach climbs 6 blocks (z 503..550) and runs through the tunnel. It comes out 6 blocks above the town and drops over 72 blocks (z 615..686) to the bridge, with the whole town in view.

**The town sits in a bowl built up around it:**
- the ridge to the north (peaks up to y 108);
- the east hills (up to about y 94), with three turbines;
- the water tower hill to the south (y 84);
- low hills west of the river.

Hills are closed shells (`hillColumn`), so their insides stay air. The world isn't dug out anywhere except for the river and the lake.

**One height for every hill.** COMMON's `groundTop(x, z)` (section 9) is the height of every hill column in the town box, and both terrain modules (`approach` and `land`) build every hill column with `hill(S, x, z)`, which reads its neighbours' heights from the same function, whichever module owns them. So a hollow hill always closes across a module edge. With two separate height rules, 92 columns at the z 728/729 seam stepped 2-6 blocks, and the shells would have opened there.

**Hollow hills and mobs.** The sealed, dark insides have the world's grass as their floor, so they spawn hostile mobs whenever mob spawning is on. Keep `gamerule spawn_mobs false` in this world (Q16).

`approachLevel(z)` (COMMON) gives the road's surface in half blocks over y 64:

| z | Level L | Surface |
|---|---|---|
| 471..502 | 0 | road block at y 64 |
| 503..550 | 1..12, +1 every 4 blocks | odd L: a bottom slab on a full block; even L: a full block |
| 551..614 (tunnel) | 12 | road block at y 70 |
| 615..686 | 11..0, −1 every 6 blocks | as above |
| 687..728 (bridge) | 0 | deck at y 64 |

## 2. Map

North is up. This sketch isn't to scale; the tables are the truth.

```
 x: 120    210  280 300    386 433 465          557  579        770
z 471 .............. prison N-S road continues, taper 36 -> 24 wide .....
      .   hills         |    climb (z 503..550)     |         RIDGE  .
z 551 .   (to y 94)  [====== TUNNEL z 551..614, y 70 =====]   (y 108) .
z 615 .                 |   descent (z 615..686)    |                 .
z 686 ~~~~~~~~~~~~~~~~~~=== BRIDGE z 686..728 ===~~~~~~~~~~~~~~~~~~~~~| culvert x 739
z 730 ~ park     [GARAGE][DONUT ]| M |[gun lot][GUN SHOP][RANGE]        east hills
z 846 ~   /----------- 1st Street ---------------------------\          + 3 turbines
z 865 ~ [SAFE ] E [H1][GAS +  ]| a |[GEAR ][BAG ] [rear lot] | E
z 948 ~ [HOUSE] l [H2][C-STORE]| i |[SHOP ][SHOP]            | a
z 990 ~ [H7 ]   m ---------- 2nd Street ---------------------| s
z1009 ~ [H8 ]     [H3]  [H4]   | n |[lot][1M DEALERSHIP]     | t    [SCRAP YARD]
z1058 ~ [H9 ]     [H5]  [H6]   |   |                         |
z1110 ~    \---------- Hill Road ---------------------------/
z1135 ~        [H10] Birch Ct [H12]      (water tower hill)       (volcano: kept free)
z1186 ~ LAKE        ( circle )
z1205 ~ + beach    [H11 for sale]
```

## 3. The approach (module `approach`, z 471..728, x 120..770)

### 3.1 Road

**z 471..478.** Continue the prison's pattern exactly (outdoors.js `roads()`):
- asphalt x 431..466;
- white at x 432 and 465;
- dashed white at x 440 and 457 where `((z % 6) + 6) % 6 < 3`;
- yellow at x 448 and 449.

**Taper, z 479..502.** Let `k = min(6, ceil((z − 478) / 4))`.
- Asphalt x 431+k..466−k, with white at 432+k and 465−k and yellow at 448/449.
- The dashes at 440/457 continue only for z ≤ 486.
- Cells x 433..464 outside the asphalt are walkway (`light_gray_concrete`). x 431..432 and 465..466 outside the asphalt are grass.

**z 503..728 cross-section (`APPROACH`):**
- road x 437..460: white x 438/459, solid yellow x 448/449, `MIX.asphalt`;
- walkways x 433..436 and 461..464;
- verges x 431..432 and 465..466;
- the cutting's retaining walls x 429..430 and 467..468.

**Slab steps (odd L).** Every cell gets a bottom slab on a full block:
- asphalt: `blackstone_slab` 55 / `polished_blackstone_slab` 45;
- white line: `smooth_quartz_slab`;
- yellow line: `bamboo_slab` (there's no yellow slab; `bamboo_mosaic_slab` read dull and patterned);
- walkway: `stone_slab` (a smooth stone slab is lighter than the walkway's `light_gray_concrete`: a stripe every 4 or 6 rows; plain stone is nearly the same gray).

**Resurfacing on the slopes.** On the climb and the descent (z 503..550 and 615..686, the portals' rows included) a full row and a slab row are the same block family, so the road reads as one surface from a car:
- the road `blackstone` 55 / `polished_blackstone` 45, the slabs' own mix (`black_concrete` has no slab and showed as black squares);
- the yellow line `bamboo_planks` (the bamboo slab's texture; yellow concrete against the olive slabs striped the line);
- the white line `smooth_quartz` under `smooth_quartz_slab` (white concrete is a cooler white).

The flat stretches, the tunnel and the bridge deck keep black concrete (`MIX.asphalt`, `MIX.deck`) with yellow and white concrete lines. Each of the four seams blends one into the other over 6 rows, a cell at a time (a cell takes the slope's blocks when a hash is under the slope's share): z 497..502 ((z − 496)/7), z 551..556 in the tunnel ((557 − z)/7), z 609..614 ((z − 608)/7) and the deck's z 687..692 ((693 − z)/7).

Under the surface, fill the whole cross-section (x 429..468) solid from y 65 up (stone; dirt for the top 3), because the hill shells are hollow.

**Lamps:**
- the climb: `prisonLamp` (axis z) on the walkways' outer cells (x 433 and 464), about every 30, staggered;
- the descent: the town's `streetLamp` in pairs at z 626, 644, 662 and 680, at (435, z, +1, 0) and (462, z, −1, 0), in step with the bridge's pairs (z 698, 716), so the town's look starts at the south portal;
- none inside the tunnel.

### 3.2 Cutting

Retaining walls at x 429..430 and 467..468 wherever `inCutting(z)` (z 485..547 and 618..686; COMMON):
- `MIX.stonebrick` with a `smooth_stone_slab` cap;
- solid from the road fill up to `retainY(z, west)` (COMMON): as high as the hill beside them, at least 1 over the walkway, never above `capY(z)`;
- the module takes its running maximum from the cutting's far end (z 485, z 686) toward the portal, so the top never drops on the way to a headwall (it dipped from y 90 to 88 over z 543..547). Where the hill behind is lower the wall stands up to 2 over it as a parapet;
- the cap is a bottom slab, or a full `smooth_stone` where the next row toward the portal is 2 or more higher (the climb into a portal steps 2..3 a row);
- the last 6 rows before each portal (z 542..547 and 618..623) stand full height: stone brick to y 93 under a full `smooth_stone` cap at y 94, level with the headwall's cornice, so the walls frame the face instead of climbing into it 2 a row. The hill behind them is y 88..90 there, so they stand over it as wing returns.

`capY(z)` is 4 over where people stand, rising 2 a block over the last 14 blocks before a portal, so the walls climb into the headwall with no step. `groundTop` shaves the hill behind a wall to `capY + d` (d = the distance from the wall).

The plan first gave the walls a flat +4 cap with the full hill only within 14 blocks of a portal. That left an 11-12-block cliff across the cutting at z 534/535 and 630/631. The ramp keeps every step along z at 4 or less.

### 3.3 Tunnel (`TUNNEL`)

**Shape:**
- Inside x 434..463, z 551..614, road block y 70.
- Walls x 432..433 and 464..465 (2 thick), vertical over y 71..78, then a vault.
- At `u = |x + 0.5 − 449|`, the inside's height over the road block is `8 + 4·sqrt(1 − (u/15)²)`: 8 at the walls, 12 in the middle.
- The lining is 2 thick all round.

**Inside:**
- Road: `MIX.asphalt`.
- Walkways x 434..436 and 461..463, with a `smooth_stone_slab` curb at x 436/461 (y 71).
- Walls: `polished_andesite` base course at y 71, `smooth_stone` at y 72..74, `light_gray_concrete` above.
- Lights: `sea_lantern` strips on both walls at y 77 every 6 z, and two ceiling rows at x 441 and 456 every 4 z.
- Write every inside cell as air explicitly, so terrain near the portals can't fill it.

**Portals** (north z 548..550, south z 615..617):
- A headwall of `light_gray_concrete` with a 2-wide ring around the opening: `polished_diorite` on the face rows (z 548, 617), so it reads against the concrete; `polished_andesite` behind. On the face rows the ring's stepped outline is rounded: an upside-down `polished_diorite_stairs` (facing away from the crown, its open quarter toward the bore) on each step of its inner edge, and a right-way-up one (facing the crown) in each notch of its outer edge. The bore is symmetric about x 449.0, so x ≤ 448 is the west half.
- Wing walls out to x 418 and x 479.
- Over the cutting (x 429..468) all three rows are solid from y 65 to one fixed top, `portalTop()`: y 94, the face's design height, or the highest `64 + groundTop` over both portals' rows (x 418..479) if that's ever higher. `groundTop` there varies (it once stepped the cornice between y 90 and 94); since its patchy ±1 went it peaks at y 92 there, which left the name panel right under the cornice. On the face row: a `polished_andesite` cornice at y 94 and an `andesite_wall` parapet at y 95; the rows behind it are grass over dirt, their sides above a lower neighbour banded like a hill's.
- The wing walls (x 418..428, 469..479) are solid from y 65 to `64 + groundTop(x, z)` under a grass top, their sides over a lower neighbour banded like a hill's (16 wing columns stand 2 over the hill in front of them, and showed their dirt). Every portal column is at least as high as `groundTop` says (minus the opening and its ring), so the hollow hill is sealed. The portal code builds these columns itself, not `hill()`.
- The face's name panel (`smooth_quartz` in a `polished_andesite` frame) is x 439..458, y 87..91, centred between the ring's top (y 84) and the cornice.
- The face's concrete is jointed into panels like a cast face (a plain 40 × 29 gray wall otherwise): `smooth_stone` bands at y 80 and 86, and `polished_andesite` joints at x 439 and 458, the panel frame's own columns carried down to the ring and up to the cornice.
- Labels: "MOUNTAINSIDE" over the north opening (facing north) and "PRISON" over the south one (facing south), at y 88.6, scale 7.5 (centred on the panel; at scale 6 "MOUNTAINSIDE" was about 10 wide on the 18-wide panel and sat 0.5 low), with their own light (`brightness` sky 15, block 15: the panel's only light is the pilasters' sea lanterns at y 79).

**Cover:** `groundTop` keeps x 424..473, z 548..617 at least 26 over y 64 (y 90). `hill()` builds the columns over the tunnel too, corridor included (x 429..468, z 551..614), as a shell above the lining.

### 3.4 Ridge (terrain)

**Peaks** `[cx, cz, r, H]` (`dome`):

| Peak | Value | Note |
|---|---|---|
| R1 | [449, 582, 95, 34] | over the tunnel |
| R2 | [565, 566, 115, 44] | highest, y 108 |
| R3 | [345, 596, 100, 30] | |
| R4 | [668, 612, 85, 26] | |
| R5 | [748, 668, 55, 22] | holds the culvert |
| R6 | [258, 616, 75, 16] | |
| R7 | [175, 650, 55, 10] | |

These peaks are COMMON's `RIDGE`.

**Height:** `groundTop(x, z)` (COMMON), the same function the land module uses:
- the highest peak of `RIDGE` and `HILLS` at the column (E5 and E1 reach into z ≤ 728 too);
- on the ridge (z < 709, faded out over z 689..709, so the town's side is untouched), a smooth warp of up to ±2 (COMMON's `fieldN`, a 48-block field; less on low hills), so the contours wander instead of running in rings;
- above 10 (on the ridge a threshold that itself wanders 7..13), rounded down to even numbers. The patchy ±1 (4×4 patches) that came before the rounding is gone: above 10 it made a patchwork of 2-high bumps with thin orange stripes, and the line where it began showed. Even terraces are Jailbreak's low-poly faces with orange cliff bands (`hillColumn` adds the bands where a column stands 2+ above a neighbour: `CLIFF` cycles 3-high bands of `orange_terracotta`, `smooth_red_sandstone` and `red_sandstone`, Jailbreak's salmon orange; the old `terracotta` / `red_terracotta` / `white_terracotta` bands read pink and brown);
- 0 for z < 482, and at most `ridgeFoot(x, z)`: 0.6 a block from z 482 (to about 487 along a slow wave in x). A plain z − 482 was one straight 1:1 bank, up to 18 high by z 500, seen from the prison;
- at most `floor(dryD) − 2` (the hills meet the river banks);
- at most `builtD − 3` (streets, building boxes and the north-west strip);
- at most the distance to the town box's west, east and south edges. Without it E2, E4 and R5 were cut off at x 770 by sheer faces up to 17 high;
- 0 in the corridor x 429..468 outside the tunnel zone (the approach builds it), with the cutting's shave beside it and the cover over the tunnel.

**Columns:** `hill(S, x, z)` for every hill column. It calls `hillColumn` with minN from `groundTop` of the 4 neighbours.

**Hill surface** (the height never changes):
- `hillColumn`'s top is `grass_block`, except orange ground (`red_sand` 75 / `orange_terracotta` 25; `coarse_dirt` where red sand would sit over the hollow inside) on a real cliff's rim (4+ over its lowest neighbour) and, through `hill()`, on any column within 2 steps (4-connected) of a riser (2+ over a neighbour) inside `fieldN`'s coherent patches (about half of them: with every one orange, a dome's steep side read as solid orange rings). Jailbreak's orange hugs its cliffs;
- with no patchy ±1 there are no 2-high bumps for the approach to dress in `moss_block`: every riser is a terrace's or a cliff's edge and keeps its bands;
- Jailbreak's orange patches: COMMON's `orangeAt` (the town's small blobs) plus the approach's own `bigOrange` (ragged ellipses of radius 6..14, each turned its own way, in 35 of every 100 cells of a 28 × 28 grid; none that would reach z 729, so the town's side of the seam meets no cut-off patch), on the flat and on any hill column within 2 of its 4 neighbours (a 3+ step is a cliff's). Before, radius 3..8 in 22 cells of 100, only where all 4 neighbours were within 1: specks.

**Trees and grass:**
- trees on slopes where the neighbours' `groundTop` differ by at most 1: one candidate a 13×13 cell, 45 in 100 kept, a third of those a round `oak` and the rest `pine` (12..18 tall by hash); on the flat a pine 1 in 4. Jailbreak scatters lone cone trees and round gem trees, not a forest (283 pines read as one);
- none within 6 blocks of the corridor, except over the tunnel (z 556..609), where the hill is whole: with 12 plants in a 52 × 54 strip it read as a firebreak from town;
- none within 6 of the culvert's headwall and wings (x 733..747, z 675..727): three pines hung their leaves over its cap and railing;
- grass clumps like the prison's `greenery()` loop (over the tunnel too).

**The river's east end:** the river stops at x 739 (`RIVER_END_X`).
- A culvert headwall at x 739..741, z 685..717, y 56..69: `smooth_stone` with a `polished_andesite` cap.
- The mouth spans the waterline, over z 693..709:
  - an opening at x 739..740, y 58..63;
  - `iron_bars[waterlogged=true]` at x 739 for y 58..60, dry `iron_bars` for y 61..63;
  - water sources at x 740 for y 58..60, `black_concrete` at x 740 for y 61..63 and at x 741 for y 58..63.
  - Before this fix the bars sat above the water (y 61..64), so the river looked like it ended at a wall.
- R5's hill rises behind it: east of x 742, `dryD` is the value at x 741 plus the distance from it, so the hill climbs 1:1 from the river's end. It used to be 999 there, which stood a cliff up to 23 high along x 742 from z 663 to 715.
- Behind the headwall `dryD` adds COMMON's `CULVERT_RISE`: 7 over z 685..717, stepping down 1 a block over the wings (6..3). Without it the hill at x 742 was 0 and climbed 1 a block, which left the headwall standing 5-6 high with a ditch behind it. Now the hill at x 742 stands at y 70 (the railing's height) over z 685..711, then falls to y 66 by z 717 where R5 itself does.
- Wing walls (`smooth_stone`, a `polished_andesite` cap) over z 681..684 and 718..721, x 739..741, their top stepping down 1 a block (y 68..65), so the bank's low cells at x 738 meet stone instead of the world's bare dirt.

### 3.5 The river's north branch (z ≤ 728)

The branch meanders (COMMON's `northBend`): a point every 8 blocks swinging up to 8 off the old straight line (`NORTH`), half-width 10..15, straight with half 13 under the bridge (|x + 0.5 − 449| ≤ 40, so the bridge still spans it), at the culvert (x 712 on) and into the bend (x 290 and west). Its south bank never reaches z 729, and west of x 540 never passes the straight line's. Straight and always 26 wide it read as a canal.

For every column where `riverAt(x, z)` is set:
- **Water column:** the bed block (`MIX.riverbed`) at `bed`, water from bed+1 to y 60 (state `water`, a source), air from y 61 to 64.
- **Bank column:** the top block at `top`, air above it to y 64. The top is `sand` at y ≤ 61, Jailbreak's solid orange rim at y 62..63 (`red_sand` 80, `orange_terracotta` 20: coarse dirt read as dark dots in a brick-like band), and `grass_block` at y 64, except `red_sand` on the lip (a y-64 cell beside a lower bank cell or the water). The old per-block mix of sand, coarse dirt and red sand, with 45% of the y-64 tops brown or orange at random, read as a dotted line from town. Under the top, `sand` from y 56 (the deepest water's bottom) up to it, at most y 60, so the water's sides at the banks are sand: with sand only at y 61 the world's stone faced the water at y 59..60 (2,240 faces), a gray stripe along both edges. Land's bank and beach columns do the same (section 5: 0 stone faces).
- **Biome (at paste time, with the owner's OK):** plains water is deep blue, Jailbreak's river turquoise. `module.exports.biomes` lists `fillbiome` boxes (`minecraft:warm_ocean`, the river's water columns, y 56..63, one box per 16-wide strip of x, 4 wide over x 216..299 where the river bends and a 16-wide box took in land). fillbiome works in 4 × 4 × 4 cells: a box to y 64 took in the 64..67 cell and tinted the banks' grass warm-ocean green in 4-block steps (the game's biome blending can still tint a y-64 grass block by the water a little, never in steps); land exports its river, lake and pond the same way (section 5).

A handful of `lily_pad` on the water at y 61.

The water keeps away from the streets and buildings by construction: 0 river cells lie in them.

### 3.6 Bridge (`BRIDGE`, z 686..728, x 431..466)

**Deck at y 64:**
- road x 437..460 in `MIX.deck` (no powder over air), white x 438/459, yellow x 448/449;
- walkways x 433..436 and 461..464 in `light_gray_concrete`, curb slab at x 436/461 (y 65);
- parapets x 432 and 465: `light_blue_terracotta` at y 65, `smooth_quartz` posts at y 65..66 every 6 z, `smooth_stone_slab` caps.

**Under it, z 689..726:**
- beam layer at y 63 (`smooth_stone`, x 431..466);
- girders at y 62 under x 434..435, 448..449 and 462..463 (`polished_andesite`), set in from the fascia (x 431 and 466 at y 63), so from the side a shadow line shows under the deck between the piers (with the girders under the fascia the only gap was the 1-block air row at y 61, and the bridge read as a causeway);
- piers in `MIX.stonebrick` at z 701..702 and 713..714, columns x 432..434, 447..450 and 463..465, from the bed to y 62;
- abutments at z 686..688 and 727..728, solid from y 61 to 63.

The bridge is written after the river, so it overwrites the bank cells under it.

**Lamps:** `streetLamp` at (435, z, +1, 0) and (462, z, −1, 0) for z 698 and 716.

### 3.7 Welcome sign

On a levelled pad on the east side (x 469..479, z 674..686: COMMON's `PAD`, where `groundTop` is 0):
- a board 9 wide × 4 tall at x 470..478, z 680, y 68..71 (at y 66..69 the cutting's east wall hid its lower half from a driver), on two posts;
- `smooth_quartz` face, `light_blue_concrete` frame (light blue terracotta rendered a dull lavender gray; the bridge's parapets keep it, Jailbreak's bridge walls are gray-blue);
- facing north (toward the cars coming down);
- labels "WELCOME TO" / "MOUNTAINSIDE", and "COME BACK SOON" on its back (z 681.03, facing south, between the posts) for everyone leaving town;
- the labels carry their own light (`brightness` sky 15, block 15): the board has none;
- the playtest spot `APPROACH_WELCOME` (474.5 67 668.5, on the slope where the ground's top is y 66) faces it at yaw 0 (south); from 4.5 blocks it looked up at the posts.

**Guide sign** over the southbound lanes just past the prison (z 476): a `polished_blackstone_wall` pole on the west verge (x 429), an arm at y 73 to x 446 with a diagonal brace from the pole (430, 70) up to it (433, 73) (17 long on one pole it read as hanging), and a board x 436..447, y 69..72 in `dark_prismarine` with a `smooth_quartz` border, facing the cars heading south; labels "MOUNTAINSIDE" and "↓  TOWN  ↓" in white, with their own light.

## 4. Streets (module `streets`: every column where `streetCell(x, z)` is set and z ≥ 729)

### 4.1 Layout

| Street | Asphalt (cells) | Width | Sidewalks | Lines |
|---|---|---|---|---|
| Main Street | x 437..460, z 729..1109 | 24 | 4 each side (x 433..436, 461..464) | yellow x 448/449, white x 438/459 |
| 1st Street | z 846..861, x 312..543 | 16 | 3 (z 843..845, 862..864) | yellow z 853/854, white z 847/860 |
| 2nd Street | z 990..1005, x 296..559 | 16 | 3 (z 987..989, 1006..1008) | yellow z 997/998, white z 991/1004 |
| Hill Road | z 1110..1125, x 312..543 | 16 | 3 (z 1107..1109, 1126..1128) | yellow z 1117/1118, white z 1111/1124 |
| Elm Road (west) | x 280..295, z 878..1093 | 16 | 3 (x 277..279, 296..298) | yellow x 287/288, white x 281/294 |
| East Street | x 560..575, z 878..1093 | 16 | 3 (x 557..559, 576..578) | yellow x 567/568, white x 561/574 |
| Birch Court (spur) | x 330..345, z 1126..1186 | 16 | 3 (x 327..329, 346..348) | yellow x 337/338 only |
| The 4 loop corners | arcs: centres (312, 878), (544, 878), (312, 1094), (544, 1094) | r 16..32 | r 13..16 and 32..35 | yellow and white continue round the arc |
| The turning circle | centre (338, 1186), r < 16 | | r 16..19 | none |

**Junctions:**
- 4-way: Main × 1st (x 437..460, z 846..861) and Main × 2nd (z 990..1005).
- T: Main into Hill Road (Main ends at z 1109), 2nd into Elm Road and into East Street, Birch Court into Hill Road.
- Lines stop inside every junction (`streetCell` gives no line where two streets' asphalt meets).

### 4.2 Surface

**Asphalt and lines** (y 64):
- `MIX.asphalt`, with lines in `yellow_concrete` and `white_concrete` (stay within the road blocks the GPS scan knows).
- The sidewalks are `light_gray_concrete`.

**Curbs:**
- A curb is a `smooth_stone_slab[type=bottom]` at y 65 on every sidewalk cell that touches asphalt on one of its 4 sides.
- No curb on a `DRIVEWAYS` cell or at a crosswalk's ends.

**Crosswalks** (`white_concrete` zebra, 1-wide stripes along the walking direction with 1-wide gaps):
- On all four arms of Main × 1st and Main × 2nd, and on Main at Hill Road.
- Across Main at z 843..845 and 862..864, z 987..989 and 1006..1008, and z 1107..1109.
- Across the cross streets at x 433..436 and 461..464.

**Stop bars:** one white row across the lanes heading into a crosswalk, 2 cells before it. Traffic keeps right:
- southbound uses x 439..447 and northbound x 450..458;
- eastbound uses the south half of an E-W street and westbound the north half.

### 4.3 Furniture

**Traffic lights** at the 4 corners of Main × 1st and Main × 2nd, and 2 at Main × Hill:
- The prison's design (outdoors.js `roads()`), with `diorite_wall` poles instead of blackstone (Jailbreak's lavender-grey poles).
- The pole stands on the corner square's outer cell, with a 4-long arm over the lanes coming toward it.

**Stop signs** (a `polished_blackstone_wall` post at y 65..67, `red_concrete` at y 68, a "STOP" label on the face toward the traffic). Main at Hill Road has traffic lights, so it gets no stop sign (the first draft had both):
- (299, 988), 2nd at Elm Road;
- (556, 1007), 2nd at East Street;
- (347, 1130), Birch Court.

**Street lamps** (`streetLamp`):
- Main, both sides, every 30, staggered 15 between the sides: west posts at x 435 with the arm +x, east posts at x 462 with the arm −x.
- Side streets every 40, on the side without power poles.
- Skip driveways, crosswalks and the 6 cells next to them.

**Power lines:**
- Poles: `stripped_spruce_log` at y 65..76 with a 3-wide crossarm at y 76, every 24.
- They stand on the MIDDLE sidewalk cell, so the crossarm spans the sidewalk: Elm Road's west side (x 278), 2nd Street's south side west of Main (z 1007), Hill Road's north side west of Main (z 1108), and Birch Court's west side (x 328). On the outer cell (the first draft's x 277, z 1008, z 1107, x 327), one arm end lands in a plot and `S` cuts it off.
- Skip driveway cuts, crosswalks and the 6 cells next to them (like the lamps).
- Two `iron_chain` wires along the street's axis at y 76, from crossarm end to crossarm end.
- No wires over the corner arcs: put poles at the arcs' ends.

**Street name signs:**
- One per junction and one at each arc's middle.
- A `diorite_wall` post at y 65..67 with a `green_concrete` block at y 68, and two labels (the two street names).

**Also:**
- `manhole` (the prison's) on Main at z 760, 930 and 1060, and once on each side street. COMMON doesn't have it or the traffic-light head: copy both from `tools/build/jail/outdoors.js` (`manhole`, the lights in `roads()`) into `streets.js`. Read the prison's file, never edit it.
- Four trash bins (`lime_concrete` with an `iron_trapdoor` lid) on Main's sidewalks.

**GPS:** `module.exports.gps` holds the town's path nodes and links (section 8.4).

## 5. Land (module `land`: every town column, z ≥ 729, that no other module owns)

**The river.** The west branch, the bend at the north-west and the lake: the same rules as 3.5, with COMMON's geometry:
- the west branch meanders westward only (`RIVER`'s `[x, z, half]` points from z 856, half 11..13): its east bank stays at x 207 or less (x + half ≤ 201 down to z 1170), clear of the safehouse and the plots at x 212. It stays straight where the north-west road will cross it (z 843..864). Straight at x 188..192 for 400 blocks it read as a canal.
- The lake is COMMON's `lakeE`: an ellipse (centre 192, 1240; radii 60, 46) whose radius wobbles, r × (1 + 0.07 sin(3θ + 1) + 0.04 sin(5θ + 2)), θ = atan2((z − 1240)/46, (x − 192)/60), so it isn't a perfect oval.
- Bank columns as 3.5: `sand` at y ≤ 61, the orange rim (`BANK_RIM`: `red_sand` 80, `orange_terracotta` 20) at y 62..63, `grass_block` at y 64 with a `red_sand` lip, and `sand` from y 56 up under every bank and beach column (no world stone faces the water).

**The beach**, the lake's east and south-east shore (`riverAt(...).beach`: x > 182 and z > 1210): sand right through, with long streaks of `red_sand` (town_2025). Where it stops (the cuts at x 182 and z 1210) the bank side turns sand too, tapering from 14 wide to the bank's 6 over about 10 blocks, and sandstone boulders with dead bushes sit on the step between the two. On it:
- a lifeguard stand (white legs, a red and white roof, a ladder), facing the lake;
- beach umbrellas (`birch_fence` poles under 8-sector `*_wool` canopies in 6 colour pairs), each with two deckchairs and a towel;
- two palms (a `jungle_log` trunk leaning toward the lake, a crown of drooping fronds);
- 3-4 cacti, 2-3 tall, each with all four sides clear (town_2025, town_view_to_volcano);
- pines behind it.

**Hills** `[cx, cz, r, H]` (COMMON's `HILLS`). Their heights are `groundTop` (section 3.4's rules, the same function): kept clear of streets, building boxes and the north-west strip (`builtD − 3`), of the river (`floor(dryD) − 2`) and of the town box's edges. Every hill fits inside the box (none is cut by its edge: cut by it, E2, E4, W1, W2 and S1 ended in straight 1:1 ramps, which would show once the map grows).

| Hills | Peaks |
|---|---|
| East hills | E1 [660, 800, 70, 26], E2 [700, 870, 70, 30], E3 [650, 930, 60, 20], E4 [715, 985, 55, 24], E5 [700, 760, 60, 18] |
| Water tower hill | T1 [500, 1186, 50, 20], with a flat top at exactly H inside r 10 |
| West of the river | W1 [152, 900, 32, 12], W2 [150, 1060, 30, 14] |
| South | S1 [420, 1258, 42, 10] |

Build every hill column with `hill(S, x, z)`. On top, `land` dresses the surface (never the heights):
- grass, or orange in coherent patches (`hillOrange`'s ragged stretched blobs and a smooth noise patch; more on real cliffs' rims and at the hills' feet), never a per-block speckle;
- a 2-high side that isn't a real cliff (a terrace's gentle edge, a clamp's bump) is dressed in its top's material (`moss_block` under grass), so the hills read as Jailbreak's smooth green slopes; only real cliffs (steps of 3+, or 2-steps bunched together) keep `hillColumn`'s salmon-orange bands;
- pines on level terrace cells with grass on top, a third of them round oaks (Jailbreak's lone cone and gem trees).

**Wind turbines** at the tops of E1, E2 and E4, (660, 800), (700, 870) and (715, 985), all facing west:
- a `white_concrete` tower 2×2 (x cx−1..cx, z cz−1..cz), 36 tall with a `light_gray_concrete` foot and `smooth_quartz` bands every 12, standing on the highest ground of its 4 cells on a 4×4 `polished_andesite` foundation flush at that height (the terraces can step under a 2×2); an iron service door on its west face;
- a nacelle 5 long, 3 wide, 3 high, its back `light_gray_concrete`, with an aviation light: a `redstone_block` in its roof at the back and a lit `redstone_lamp` on it;
- a hub (`smooth_quartz`, an `end_rod` nose) and three blades 16 long in the plane facing west, 120° apart, one pointing straight up: lines of `smooth_quartz`, 2 wide over their first 8 blocks (a 1-block line vanishes beyond about 150 blocks).

**Water tower** on T1's flat top (ground y 84), current look (lime), centred on the block corner (500, 1186):
- a round concrete pad (r 9.4) and the walk from the top of the stairs;
- 4 outer legs, 2×2 `blue_concrete` on the diagonals, y 85..109 (a `blue_terracotta` cap at y 110), past the middle ring as in water_tower; 4 thin inner legs y 85..98 and a thick centre column y 85..99;
- the bottom ring, y 99..100 (r 9.4, the tank's floor), a 2-wide walk round the tank with an `iron_bars` railing at y 101, open where the ladder (up the north-west leg) comes up;
- the tank, y 101..110 and rounded to y 112: `lime_stained_glass` with `yellow_stained_glass` streaks out to r 7.4 (against the diagonal legs at r 7.8: no gap between them) over a lit core of `verdant_froglight` with `ochre_froglight` streaks;
- the middle ring at y 106, r 7..8.4: a navy band about 1 block proud of the glass;
- the cap: a navy plate at y 113, `light_blue_stained_glass` round `sea_lantern`s at y 114..116.

From Hill Road's south sidewalk at x 498..500, a stair path climbs T1's north slope to the top (COMMON's `STAIRS`, x 498..500, z 1129..1176: `groundTop` gives it its own even climb, 20 up over 48 blocks):
- build its columns solid from y 65 to `64 + groundTop`, not with `hill()` (`MIX.stonebrick`), with `stone_brick_stairs` (facing south, up the slope) where the column north of it is lower and `smooth_stone` elsewhere; its foot (groundTop 0) is `smooth_stone` at y 64, level with the sidewalk (streets keeps its lamps off it);
- a `diorite_wall` post with a `lantern` on the path's edge every 8 blocks, on alternate sides (z 1133 west, 1141 east, ...), so the path is lit and never narrower than 2;
- a railing only where the ground beside the path drops 2 or more: an `iron_trapdoor` standing open against the outer edge (nobody can open it by hand), so all 3 blocks stay walkable;
- grass berms, 3 columns a side, stepping down 1 a block from the path's height, built solid (dirt, a grass top) from y 65 wherever that's over the ground there: the path climbs faster than T1's flank at its foot (z 1131..1152), which left a stone-brick causeway with bare 1-3-high sides. With them the railing appears nowhere on the current hill.

Because `groundTop` knows the path, the hill columns beside it close their shells against it. A path cut into the hill afterwards would have opened the hollow inside.

**Riverside Park.** The inside of the river's bend (x 204..299, z 729..842, minus streets; the strip z 843..864 south of it is the north-west road's kept-free ground):
- a lawn, with only an orange fringe along the bank;
- `dirt_path` paths: one along the bank (1.5..4 blocks beyond it), a trail from the trailhead (293.5, 842.5) to it and a spur up to the north bank, and on across the kept-free strip to the loop's north-west sidewalk;
- 4 benches (`spruce_stairs` with `spruce_trapdoor` arms) facing the river, each with a bin (`green_terracotta`, an `iron_trapdoor` lid), lamps (`dark_oak_fence` posts with a `lantern`) along the paths, 2 picnic tables, 3 flower beds (a `mud_bricks` ring);
- a spruce pier into the west branch (deck at y 61, z 811..815, 9 long, `spruce_fence` railings, a lantern at its end) with steps up the bank;
- the RIVERSIDE PARK sign over the trailhead (x 289..297, z 842: a `green_terracotta` board on dark oak posts, its name on both faces);
- trees on a jittered 10-block grid, about 45% of its cells kept (all of them read as an orchard), a third of them pines, 6+ from the water, clear of the paths and the furniture, and none within 7 of the line from the bridge's south end (434.5, 726.5) to the park's sign, so the sign shows from the bridge;
- no buildings.

**The satellite dish** on E3's top (650, 930) (town_view1: a big dish on a hill beside the town; the brief's optional landmark): a 9×9 pad flush at the highest ground under it, a white `calcite` pedestal, and a paraboloid bowl about 22 across (depth r²/40: 3 deep at its rim) tilted 68° up and leaning west, its face `light_blue_terracotta`, its back `polished_diorite`, a `calcite` rim, a feed horn on its axis with an `end_rod`. No trees within 24 of it.

**The meadow pond** (the brief's other optional landmark; town_view1: a pond in the grass with the water tower beside it), in the open meadow south-east of T1 (x 533..587, z 1246..1280: flat, 30+ from any street, box or the volcano's site): two overlapping ellipses ([556, 1260, 15, 9] and [572, 1268, 9, 7]) with a ragged edge, water at y 63 (its own level, one under the meadow: nothing flows), 1..3 deep on sand, clay and gravel, a sand and red-sand shore ring at y 63, a ragged `red_sand` lip at the meadow's height, lily pads and reeds (tall grass) round it. No trees within 4 of it.

**Ground character:**
- orange patches on flat grass: `orangeAt`'s blobs, a smooth noise patch (more of it next to the hills' feet) and a fringe along the banks. The material is picked per 9-block blob (Jailbreak's patches are one flat colour): `red_sand`, some patches `orange_terracotta`, never `coarse_dirt` (it read as brown spots);
- then a clean-up over the flat and the hills alike (after the park's paths): an orange piece of 6 cells or fewer (4-connected) goes back to grass, and a grass hole of 4 cells or fewer with orange all round it turns orange (Jailbreak has fewer, bigger patches: 10% of the flat is orange, no piece under 7 cells);
- the orange verge (town_view_to_prison_tunnel, town_view_to_volcano: a thin orange strip outside every sidewalk): `red_sand` on the 2 columns beside the street network, in ragged stretches (a noise threshold), never in front of a driveway, in the park or on the kept-free ground. Land meets the streets at Hill Road's south lawn (z 1129..1134), East Street's east side, the loop corners' outer lawns and Birch Court's circle. `TOWN_VERGE=0` leaves those 2 columns grass (the first draft's rule);
- grass, tall grass and flowers in clumps (none on the column next to a street or box; more flowers and some wildflowers in the park), shrubs;
- pines on the hills; on the open ground mostly oaks near the river (within 30 of a bank) and mostly pines elsewhere, at least 9 apart and 7 from anything built.

**Biomes** (at paste time, with the owner's OK): `module.exports.biomes`, `minecraft:warm_ocean` boxes over the river's, the lake's and the pond's water, one per 16 × 16 tile, y 56..63 like the approach's (a box to y 64 tints the banks' grass in 4-block steps).

**Kept free** (COMMON's `KEEP_FREE`: plain grass, nothing taller than a shrub, `groundTop` 0):
- the volcano's future site, x 600..770, z 1110..1300;
- the future north-west road and its bridge, x 120..311, z 843..864. That's 1st Street carried on west from where the loop's NW corner turns south: at x 311 the corner's asphalt still covers exactly z 846..861, so the extension forks off at the corner's start (the later run repaints the fork's lines). Hills slope down to the strip (`builtD` counts it).
  - The first draft called this the south-west road, at z 755..800. It's north-west of the town, and that strip ran into the garage's north lot (x 300..385, z 752..786), with no street there to join.

## 6. Buildings

Each building module owns its box's columns at every height. Street cells inside a box still belong to `streets`: the loop's rounded corners cut a few cells off the corners of `shops`, `dealer`, H1 and H5 (34 cells at most), so keep those corners empty.

In the facing column, the facing is the direction the main entrance faces. Yaw: 0 = facing south, 90 = west, 180 = north, −90 = east.

Every look below comes from the wiki pictures listed. Build it in the prison's detailed style:
- `MIX` hashes on every big surface;
- trims, bands, bevels and base courses;
- rooms you can walk into, where noted.

### 6.1 `gunshop`: Gun Shop, its shooting range and lot

Box x 465..556, z 730..842. Pictures: `gunshop_current`, `gunshop_view`, `gunshop_view2`, `gunshop_interior`, `gunshop_interior2`, `gunshop_range`, `town_view_to_volcano`.

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Lot (asphalt, white stalls 4 wide) | x 466..554, z 731..770 | y 64 | from Main's driveway at z 744..757; `dark_oak_fence` (2 high) along z 731 |
| Gun Shop | x 478..509, z 776..831 | walls y 64..74, roof y 75 (overhang 1) | west; open doorway x 478, z 802..803, y 65..67, glass transom y 68..71 |
| Shooting range annex | x 510..545, z 786..821 (shares the shop's east wall) | walls y 64..74, solid roof y 75 | doorway in the shop's east wall x 509, z 788..789 (navy frame) |
| Range forecourt | x 518..532, z 771..785 (`MIX.asphalt`) | y 64 | the lot's asphalt runs on to the range's dark opening (x 519..531, z 786); no curb slab at z 770 there; the service yard (condensers, dumpster) at x 533..541, z 778..779 |
| Target sign | navy pole x 470..471, z 782..783 (2x2), y 65..79 on a footing x 469..472, z 781..784; disc radius 8 round the column (471, 783) at y 88, in the plane 2(x − 471) + (z − 783) = −1..1 (a 1:2 staircase 1.3 blocks thick, turned 27° off the front) | y 80..96 | double-sided, facing west-north-west: 40° off its axis from the bridge's south end, 27° from directly across Main (an x-plane disc: 67° and 0°); in front of the window block at the end nearest the bridge (`gunshop_current`, `gunshop_view`) |
| Small roof target | disc radius 4.5 round the block (z 812, y 81), plane x 492..493, on navy legs at (492..493, 76, 811) and (492..493, 76, 813) | y 77..85 | faces west, 15 back from the roof edge: from Main Street only its upper half shows over the roof, between the door and the end (`gunshop_current`), clear of the pennant |
| Pennant | pole (471, 65..80, 826) with a red flag at y 77..80 flying south | | above the roofline, against the sky (`gunshop_view`) |

**Look:**
- lavender-grey walls: `clay` outside (the pictures' pale tone; `light_blue_terracotta` read dark purple-grey there, darker still on the shaded west face) and `light_blue_terracotta` inside; the south end face (z 831, its corners too) navy in the module's own navy (`blue_concrete` 55 / `lapis_block` 30 / `blue_wool` 15, toward the pictures' blue: `MIX.navy`'s blue terracotta read purple-grey, so it stays only in the indoor skirting); the front's lavender runs right to the corner (the navy is the end face seen at an angle, not a bay on the front);
- three `black_concrete` stripes, measured on `gunshop_current` from the ground up: the thick band y 66, a thin stripe y 68 and one under the fascia y 73 (lavender y 65, 67 and 69..72), a navy base course at y 64 and a navy fascia at y 74, on every outer face (the range's east face too, so it reads as part of the shop); the inner faces have the same stripes, so they line up through the glass;
- a white roof slab (`smooth_quartz` and `calcite`, never white concrete: section 10.2's roof rule) with a 1-block `smooth_quartz` overhang and a light line along its top edge: `end_rod`s laid along each edge at y 76 (Jailbreak's glow runs along the top of the white slab);
- the front, north to south: 4 blocks of corner wall (z 776..779), one block of dark windows (`blue_stained_glass_pane`, four panes of 2 between `blue_concrete` mullions at z 783, 786 and 789, glass y 66..71, frame at z 780 and 792; the y 68 stripe runs on across it as a black transom, the y 66 band stops at the frame), the wall again (z 793..797), the glazed entrance as tall as the window block (z 798..807: navy posts at z 798, 801, 804 and 807 and a navy head at y 72, sidelights y 65..71, the doorway with a transom y 68..71, iron doors held open inward at x 479), then blank wall to the corner (`gunshop_current`);
- "GUN SHOP" labels in navy (`#232a7a`) on the pale clay (the front one on the blank wall south of the entrance, z 819.5);
- the target's rings in proportion to its radius r like the pictures' (d = the distance from the centre): white d < 0.5r, black d ≤ 0.72r, the red rim (`red_wool`, nearer the pictures' coral than `red_concrete`; never concrete powder: the disc floats) out to r; a pink bullseye 3 cells square on the big sign (one cell on the roof target; d ≤ 0.16r drew a red-cross "+"); the disc's edge is red.

**Inside:**
- bright red checker floor (`red_concrete` / `red_concrete_powder`; `red_terracotta` read brownish), a white ceiling with `sea_lantern` strips, and the black stripes inside too;
- an L-shaped counter: the long arm 1 deep at x 495, z 795..812, the short arm along z 812 over x 488..494; cyan-lit glass fronts (`light_blue_stained_glass` over `sea_lantern`), a `smooth_quartz_slab` top and a navy register block; the staff side behind both arms (`gunshop_interior2`): the keeper's box x 496..506, z 795..812 and the strip x 488..506, z 813..820, closed by 1.5-high quartz walls at z 794 and along x 487 (z 814..820), with a pegboard on the partition (z 821, y 66..71, not round the staff door) over staff shelving at x 489..493;
- pegboard gun walls on the east inner face (x 508) and the north inner face (z 777): a `light_blue_concrete` backing with open `iron_trapdoor` pegs, guns as item displays (`displays`);
- a free-standing double-sided pegboard right behind the window block (`gunshop_interior`), so its guns show from Main Street: core x 483, z 782..790 (navy foot y 65, `light_blue_concrete` y 66..70, navy cap y 71), pegs and a lit glass case on both faces (x 482 and 484), 12 guns;
- a white outline on the floor in front of the counter, with thin `end_rod` posts nearly to the ceiling (y 65..71) on its four corners (`gunshop_interior2`); a lit glass island at x 488..496, z 786..787 (aisles x 485..486 and 498..506);
- glass between the shop and the range corridor (x 509, z 795..815, y 66..68).

**Range:**
- a red corridor x 510..514: `red_concrete` walls, a `red_nether_bricks` base, `pink_terracotta` floor tiles, and a "SHOOTING RANGE" label;
- 8 booths: shooters stand at x 515..516 between `polished_deepslate` partitions (x 515..517, y 65..68) every 4 z (z 787, 791, ..., 819), behind a booth window at x 517 (`gunshop_range`): `deepslate_tiles` panels at y 65 and 67..68 round a 1-high shooting slit at y 66, with `blue_concrete` frames. Standing eyes (66.62) and sneaking eyes (66.27) are in the slit and the targets in full view; nobody fits through, so nobody walks downrange (the first draft's 1-high counter could be jumped onto);
- lanes x 518..543, a brick far wall at x 544 (inside; the outer face x 545 is the shop's striped wall), and `target` blocks on `white_concrete` boards at x 542, y 66..68;
- a solid roof with red and white trim beams and lit panels.

The range's region starts at x 515, the cell shooters stand on. The first draft started it at the booth line x 516, with nowhere to stand inside it, so no gun would have fired: WeaponMechanics checks where the shooter stands.

There is no glass toward the outside, which keeps bullets in (most bullets pass one glass block). A shot west through the corridor's glass can still leave the building through the window block (z 781..791) or the entrance's glass (z 799..806); the rest of the front is solid wall. It can't hurt anyone: pvp.sk cancels every hit by an attacker standing in a safe zone.

### 6.2 `donut`: Donut Shop (a store) and its lot

Box x 386..432, z 730..842. Pictures: `donut_current`, `donut_front`, `donut_interior`, `donut_wide_with_garage`. No drive-thru (owner, 2026-10-21: builds are practical; everyone walks in to rob it).

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Donut Shop | x 401..430, z 782..827 | walls y 64..73, roof deck y 74 over x 400..432, z 781..828 (an overhang of 1 west, north and south, 2 east over the front apron) | east (Main); double `pale_oak_door` at x 430, z 804..805 (hinges on the outer sides; closed at the snapshot); back door `iron_door` x 401, z 812 |
| South window | in the south wall z 827 over the booths: glass x 423..427, y 66..69, a mullion in the middle (x 425); frame x 422..428, y 65..70 | | `glass_pane` in a `pink_concrete` frame (closed) |
| Lot | x 386..430, z 731..780 and the west strip x 386..398, z 781..842 (the lot's way to the 1st Street cut) | y 64 | Main driveway z 744..757; 1st Street cut x 388..399; `dark_oak_fence` 2 high on x 386 and z 731; a planting row (grass, oaks, lamps) z 731..738 with a curb on its south side (x 387..430); the dumpster pen in the north-west corner (x 387..391, z 740..746), so the west strip x 387..392 stays a clear way from the 1st Street cut to the lot |
| South lawn | x 399..432, z 829..842 (south of the walk round the shop, z 828) | y 64 | the world's grass with two oaks (x 405 and 414, z 836) |
| Giant donut | torus, centre (415.5, 87, 804.5), major radius 7.5, tube 3.5, its ring plane tilted 60° from flat with the hole facing east (Main Street and the Gun Shop, like `donut_front`) and up; its lowest block y 77 | y 77..96 | on a slim pink truss from the roof deck (two A-frames with splayed legs, a strut up the back) |

**Look:**
- white walls (`MIX.white`), 1 thick, striped the same outside and in: a pink base course at y 64..65, a thin `pink_wool` line at y 68, a hot-pink band 2 high at y 70..71 (`pink_concrete`), white above it;
- the roof deck dark (`polished_deepslate` with a few `smooth_basalt` patches: no road blocks, section 10.2's roof rule);
- the fascia 2 high round the deck's edge, about a sixth of the wall like `donut_front`: a dark lower edge (`polished_deepslate_slab`, top half, y 73) with the white `smooth_quartz` soffit showing under it, a pink neon line (`pink_stained_glass` at y 74, `pearlescent_froglight` behind it) and a half-block `polished_deepslate_slab` parapet (y 75);
- the storefront (east, x 430): one glass block off-centre to the north like `donut_front` (mirrored), `glass_pane` in `pink_concrete` mullions at z 786, 790, 794, 798, 803, 806 and 811 (z 786..811, y 65..70, a pink head at y 71), the double door at z 804..805; z 812..827 a plain striped wall;
- on the front apron: a lilac box (an ATM look, `purpur_block` under a `purpur_slab`) at (431, 65..67, 803) beside the door, in front of the mullion (the door's spot 431.5 804.5 stays clear), and hedge planters against the solid wall (z 782..785, 821..824);
- "DONUTS" labels on the roof sign box, the north wall (the lot), over the door, the plain front wall (z 820), the south wall over its window, both faces of the pole sign and the back wall inside.

**The donut:**
- frosting (`pink_wool` with a few `pink_concrete` flecks and a `pearlescent_froglight` gloss streak) on the faces turned up and east, its lower edge in short drips;
- dough (`pink_concrete`; no terracotta, which reads brown) underneath, and the hole's inner face light pink (`pink_wool`) lit with `pearlescent_froglight` on its upper faces;
- the truss: two A-frames with splayed legs 1 thick and a tie each, and a back prop (2 thick) rising behind the tube to the ring's upper back, standing straight on the deck (no foot pads); its feet at x 402..424, z 795..814, clear of the AC units, the vent stacks and the hatch;
- a black "DONUTS" sign box (`black_concrete`, with a pink label) set into the front of the ring's upper tube below its crown (x 415..416, y 91..93, z 800..809, a `polished_blackstone_slab` cap at y 94), its face east; about 2 rows of tube show over it from across Main and the hole stays clear under it. That's the 2022 look, chosen as the default; the owner can pick the 2026 face instead (Q8).

**Inside:**
- light pink tile floor (`pink_wool` with `pink_concrete` lines every 4), a white ceiling with `sea_lantern` strips;
- a long white counter 1 deep at x 412, z 793..814 (`smooth_quartz` with a `quartz_slab` look on the ends);
- a glass donut case in front of it at x 413 (glass at y 65, level with the counter; donuts as item displays);
- the decorative cash register (`polished_blackstone` with a lime pane) on (412, 66, 803);
- a gap at the counter's north end (z 792) to walk behind it;
- lilac seating (`purpur_slab` tables, `purpur_stairs` benches) on `light_blue_carpet` at x 420..428;
- a 6 tall pink donut-man statue by the north-east window (x 428, z 793..799, y 65..70: his ring z 794..798, the eyes behind the panes z 795..797, seen from Main), and pink arcade cabinets in two corners;
- a kitchen at x 402..408 made of lookalikes only (no furnaces or smokers: no block with a menu within reach).

**Gameplay:** see section 8. It's `heist_donut`, with one register on (412, 65, 800..802): the whole $3,000 pool.

### 6.3 `garage`: the Town Garage (2 bays)

Box x 300..385, z 730..842. Pictures: `garage_new` (the current look, the default), `town_garage_2022`, `donut_wide_with_garage`.

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Garage | x 330..359, z 787..810 | walls y 64..73, roof y 74, red fascia overhang 1 | south; bay openings x 334..340 and 349..355 in z 810, y 65..70, framed by posts at x 333, 341, 348, 356 (the frames take 18 of the front's 30 columns, garage_new's 55-60%; x 330..332, 342, 347 and 357..359 are striped wall) (both open; each sectional door raised inside, as wide as its opening, lying on two chain tracks behind the jambs under the ceiling at y 72 over the bay's front half: the west one white glass, the east one white); office door `birch_door` x 344..345, z 810 |
| Office between the bays | x 342..347, z 788..809 | | a counter facing south; the attendant's spot |
| Apron (asphalt, stalls west of x 328) | x 300..385, z 811..842 | y 64 | onto 1st Street's cut x 330..375, split by a curbed island at x 343..345, z 836..842 (in line with a curbed plinth between the exit lanes, x 343..345, z 823..825; both lit by light blocks with no post: a post on either stands on the facade's axis and hides the office door from 1st Street) |
| North lot (striped) | x 300..385, z 752..786 | y 64 | reached past the building's sides; `dark_oak_fence` on z 731 and x 300; grass and trees at z 731..751 |

**Look:**
- grey-blue brick (`stone_bricks` 82, `cracked_stone_bricks` 12, `tuff_bricks` 6: garage_new's brick is clean and even) with 3 `red_concrete` stripes (y 66, 68, 70) on all four faces, a red fascia and `smooth_quartz` bay frames standing 1 proud: posts y 64..71, a head at y 71 just over the top stripe, a quartz threshold at y 64, plain brick over them (y 72..73) up to the fascia. (garage_new's red band is more compact, at about 45-75% of the wall with plain brick under it: stripes at 68 and 70 only would match it better: the owner's call, Q18);
- "GARAGE" in 3 × 5 block letters of `calcite`, 5 high (y 69..73), inlaid flush in the east face (x 359, reading south to north) and the west face (x 330, its mirror, toward the W1/W2 stalls and the future north-west road, garage_new's lettered side), both over z 787..809 (23 columns on a 24-block face: they start at the back corner, keeping the front corners clean). The top stripe (y 70) is plain brick along the letters (only its corner cells stay red), so they sit on the y 68 stripe on plain brick, as in garage_new. Flush, not proud: the east face is seen from Main Street (z 735..775) and the bridge's south end, across the donut's north lot, 29-41° off its normal, where 1-proud strokes would close up the 1-block gaps (tan 40° ≈ 0.84). A white text label at scale 3 would be about 0.75 high and 3.5 wide;
- bay floors `smooth_stone` with `polished_deepslate` oil stains inside the yellow outlines; orange cones, tyre stacks (`blackstone`), a parts rack on each back wall and tool boards in the east bay;
- light: lot lights (a post with lantern heads) about every 20 blocks on the planter, row A's curb, the back aisle's corners and the side rows' curbs; everywhere a post would stand against the building (the pad's corners and the west side's middle) or on the facade's axis (the plinth and the island), invisible `light[level=15]` blocks instead (no posts, no fittings), also under the fascia over the bays and its other faces, and under the eave in front of both GARAGEs (2 out from the face, y 68); cobra heads either side of the cut. Each lamp head has a `light[level=15]` at y 66 under it (a head at y 73 lights the ground under it only to about 7). About 15% of the open lot's cells still have block light 0 (mid-aisle, between lamps): if `spawn_mobs` is ever on, deny mob spawning with WorldGuard rather than lighting a lot that size;
- the roof deck an even maroon (`nether_wart_block` 85, `red_nether_bricks` 15) inside the `red_concrete` fascia ring and its 1-high lip (y 75); the AC plant, a hatch and a vent clear of the car;
- the sign: a `red_concrete` panel standing across 1st Street's direction on the east planter (a `diorite_wall` post x 381, y 65..69, z 842; the panel x 381, y 70..73, z 838..842 with a `quartz_slab` cap, 5 clear under it), "TOWN" / "GARAGE" labels on both faces (the east one about 11° off the line of sight from the Main / 1st junction): the building stands 32 back and the donut hides it from Main Street, and a south-facing sign is seen almost edge-on from 1st Street. The CAR RETURN sign stands at the head of the return box, facing south;
- a red car on the roof as an item display (`displays`) at (344.5, 83.76, 802.5) on a 2-high `polished_deepslate` podium (x 337..352, z 799..806, y 75..76: on the deck the fascia and its lip hid everything under about y 78 there from 1st Street and the junction, all of its wheels), its wheels on the podium's top face (y 77.0): the head transform puts the model about 1.69 × s / 0.625 below the entity (citygarage.sk's bay lift 1.69 at bay scale 0.625), so y = 77.0 + 1.69 × 2.5 / 0.625 at scale 2.5; `view_range` 3: the client draws a display out to 64 × view_range × its entity distance setting (64 at the default 1.0), and the server sends displays within 128 blocks (spigot.yml `display: 128`, view-distance 8), so the car shows from the Main / 1st junction (~118) and the bridge's south end (~125).

### 6.4 `gas`: Gas Station and Convenience Store (a store)

Box x 366..432, z 865..986. Pictures: `gas_current`, `gas_top`, `gas_view`, `gas_view0`, `convenience_store`.

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Forecourt | x 392..432, z 866..985 | y 64 | Main driveways z 868..879 (in) and 952..963 (out) |
| Canopy | x 406..423, z 873..941 (3 past the first and the last island tip) | underside y 72, body y 72..73, glass panels y 74 | 6 teal pillars 2×2 (`cyan_concrete`) at x 414..415, z 879..880, 890..891, 901..902, 912..913, 923..924, 934..935 |
| Pump islands | at each pillar: x 413..416, z p−3..p+4 (p = the pillar's first z) | pumps 3 high (y 65..67) | two pumps across each island (x 414..415, z p−2 and p+3: pump, pillar, pump), their screens and hoses toward the lanes x 412 (west) and 417 (east) where cars stop |
| Convenience Store | x 370..391, z 885..930: north part z 885..903 (walls y 64..71, roof y 72), south part z 904..930 (walls y 64..72, roof y 73) | | east (the canopy); double `birch_door` x 391, z 907..908; grey side door `iron_door` at (380, z 885) |
| Price sign | box x 428..430, z 966..970, y 68..74, on two posts, in a planter | | both faces (Main and the pumps): a "GAS" header over the prices |
| Back fence | `dark_oak_fence` 2 high on x 366 | | |

**Canopy:**
- a glowing cyan fascia all round (`sea_lantern` behind `light_blue_stained_glass`, y 73..74) over a navy `blue_concrete` lip (y 72); "FUEL" on its Main side, centred on the band;
- underside `blue_concrete` with `sea_lantern` panels; the top in 4 sections of `light_blue_stained_glass` over `blue_concrete` (mid blue from the descent into town) inside a lit rim, with `smooth_quartz` dividers.

**Pumps and forecourt:**
- islands of `smooth_stone` with a `smooth_stone_slab` rim;
- pumps with `purple_concrete` bodies, a `magenta_concrete` head lit by a `light` block over it (a froglight head read white, a carpet cap was invisible), a black screen (a button) on each lane face and an `iron_chain` hose;
- yellow bollards (`bamboo_fence` posts: concrete cubes read as boxes) at the islands' tips;
- a pair of lime bins at each end of the row, on their own curbed pads at z 871..873 and 941..943 (on an island tip they merged with the pump behind them).

**Store look:**
- the front mostly frosted lit windows, whole `white_stained_glass` blocks (two white faces read milky and lit; a pane is one face), 5 wide between `light_blue_concrete` piers;
- side and rear walls `light_blue_concrete` (10% `light_blue_concrete_powder` flecks) over a `blue_concrete` base, with `blue_concrete` corners and pilasters;
- roof dark slate (`polished_deepslate` 60, `deepslate_tiles` 30, `blue_concrete` 10: `blue_terracotta` read purple) with a thin cyan neon line; the "24/7 MART" roof box over the door is seen from the forecourt, the side streets and the approach (from Main the canopy hides it; the sign band over the door faces Main).

**Store inside:**
- low shelving aisles made of lookalikes (`stripped_birch_wood` units, `oak_trapdoor` fronts, coloured terracotta "goods"; never `*_shelf`, barrels or chests);
- a fridge wall at x 371 (`light_blue_stained_glass` over `sea_lantern`);
- a checkout counter 1 deep at x 386, z 912..919, with the clerk side west of it and a gap at z 911;
- the decorative register on (386, 66, 916);
- a small lottery counter in the north part, its till on (380, 65, 890);
- an ATM.

### 6.5 `shops`: Gear Shop and Bag Shop

Box x 465..556, z 865..986. Pictures: `town_view_to_volcano`, `gunshop_view` (the Glider Store), `pet_shop` (ignore the snow).

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Gear Shop (Jailbreak's Glider Store) | x 470..495, z 872..899 | walls y 64..72, roof y 73 | west; open doorway x 470, z 885..886, y 65..67 |
| Gear counter | 1 deep at x 486, z 876..895 | | keepers behind it at x 487.5 |
| Bag Shop wing (Jailbreak's Pet Shop) | x 470..497, z 912..941 | walls y 64..73, roof y 74 | west; open doorway x 470, z 926..927 with a `red_carpet` path under a flat canopy on posts (x 465..469, z 923..930) |
| Bag counter | 1 deep at x 485, z 920..934 | | keeper at x 486.5 |
| Bag Shop glass box | x 470..491, z 942..963 | y 64..82, roof y 83, white ledge band y 74..75 | open to the wing through z 941/942 at x 478..481 |
| Walkway between them | z 900..911 | y 64 | `light_gray_concrete`, benches, a planter |
| Rear lot | x 500..554, z 868..984 | y 64 | cuts at 1st Street x 520..533, 2nd Street x 520..533, East Street z 920..933 |
| Lit sign box by the road | post at (466, 909), the box x 465..467, z 908..910 (over the walkway's mouth, at the wing's far end from the glass box) | y 67..72 | "BAGS" north and south |

**Gear Shop look:**
- white and blue walls, a blue glass storefront (`light_blue_stained_glass`, y 65..70);
- on the roof, a giant olive tactical helmet with goggles, about 10 tall: the Donating version of the glider sails (Q1). Helmets and vests on display inside are item displays.

**Bag Shop look:**
- the wing white with `red_concrete` and `pink_concrete` stripes, black-trimmed windows and a "BAGS" label;
- the glass box framed in bright blue (`lapis_block` or `blue_concrete`), with `magenta_stained_glass` and `pink_stained_glass` panes lit pink inside;
- on its roof, a giant duffel bag about 12 long and 6 tall (canvas `brown_concrete` and `terracotta`, black straps, a green band and a gold $) instead of the dog statue (Q1);
- bag tiers on display as item displays.

### 6.6 `dealer`: the 1M Dealership

Box x 465..556, z 1009..1106. Pictures: `dealership_1m`, `town_birdseye`, `town_view_to_prison_tunnel`.

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Grass strip with round oaks | x 465..469, z 1010..1105 | | an `oak` every 12 z, skipping the driveways |
| Lot (white stalls) | x 470..500, z 1011..1104 | y 64 | Main driveways z 1020..1031 and 1080..1091 |
| Wing (showroom 2) | x 503..542, z 1012..1059 | walls y 64..75, roof y 76 | west; glass front with a doorway z 1034..1036 |
| Tower (main showroom) | x 503..542, z 1060..1103 | 3 floors: slabs at y 64, 75, 86, roof y 96 | west; glass curtain front with doorways z 1071..1073 and 1087..1089, y 65..67 |
| Stairs | x 534..541, z 1061..1066 (switchback) | to both upper floors | |
| "1M" sign | block letters at x 502, z 1072..1091, y 77..90 | | faces west |

**Wing look:**
- vivid blue glass panels (`blue_stained_glass` over `light_blue_concrete`) between navy piers (`MIX.navy`);
- red vertical fins (`red_concrete` 1×4), an orange neon strip along the fascia (`orange_concrete` with `ochre_froglight`);
- a light roof with 2 navy HVAC boxes.

**Tower look:**
- navy walls with light bands (`light_gray_concrete`);
- the glass curtain (`light_blue_stained_glass_pane` in `blue_concrete` mullions every 5);
- an orange and red checker floor on the ground floor;
- the roof as a grate (`iron_bars` over `gray_terracotta`; gray concrete would break section 10.2's roof rule).

**Cars:** on every floor, as item displays of our car models (never real MTVehicles cars). The Extreme cars go upstairs.

**The "1M":** `gold_block` and `yellow_concrete` faces with `ochre_froglight` behind, so it glows.

**Inside the tower:**
- the sales desk at x 515, z 1078..1085;
- 4 car bays on the floor at x 526..530 (section 8);
- 2 crate pedestals (`gold_block`, 3 clear above).

### 6.7 `houses`: 12 houses (section 7)

Boxes: `PLOTS` H1..H12.

### 6.8 `safehouse`: Mara's Safehouse (the base)

Box x 212..276, z 880..944. Pictures: `houses`, `modern_town_home` (for detail level).

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| House | x 236..258, z 896..927 | 2 storeys: walls y 64..78, flat roof y 79 with a parapet | east; open doorway (2 wide) x 258, z 911..912, y 65..67 |
| Porch / pergola (the crate stands: two staggered rows at x 260 and x 265, section 8.2) | x 259..266, z 897..915 | floor y 64, roof beams at y 70..71 | |
| Garage | x 246..258, z 929..938 | walls y 64..71, roof y 72 | door on the east face at z 932..936 |
| Driveway | x 259..276, z 932..936 | y 64 | Elm Road cut z 932..936 |
| Front yard (the leaderboard holograms) | x 237..276, z 881..895 | | |
| Back garden, fenced | x 213..235 | | |

**Look:**
- the ground floor `MIX.brick`, the upper floor `MIX.navy`;
- black-framed windows with blinds (as for houses);
- a warm porch with `lantern`s standing on the beams and `dark_oak` beams;
- a small "M." label on the mailbox.

It's the only house with an inside:
- Mara's front room x 247..257, z 897..925, with the wall-map wall on the inside of the north wall (x 250..252, y 66..67, on z 896);
- a lounge and a kitchen made of lookalikes;
- the upper floor closed off.

### 6.9 `scrapyard`: the Scrap Yard (car contracts: a Donating addition)

Box x 579..662, z 1012..1100. There's no Jailbreak picture; use the town's style.

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Yard fence | x 580..661, z 1013..1099: `dark_oak_fence` 2 high with `iron_bars` panels | | gate opening on x 580, z 1050..1057 (8 wide) onto East Street's cut |
| The Boss's booth | x 590..601, z 1020..1029 | walls y 64..71, roof y 72 (corrugated look: `iron_trapdoor` tops) | south; a counter window in z 1029 at x 593..598, y 66..67, over a counter at y 65 (no door) |
| Chop bay (car crusher / lift) | around (632, 1068): a concrete pad 9×9 with yellow and black edge stripes and a crusher frame | | open to the gate |

**Yard:** car wrecks as block sculptures (rusted `orange_terracotta` and `brown_concrete` with `iron_block`), tyre stacks, crushed-car cubes, a yellow crane (`yellow_concrete` lattice with an `iron_chain` hook), and oil drums (`polished_basalt` and coloured concrete, never barrels or cauldrons). The floor is coarse dirt and gravel paths (`gravel` only on solid ground).

## 7. Houses (module `houses`, plus the rules the Safehouse follows outside)

**Kit:**

| Kind | Walls | Roof | Garage |
|---|---|---|---|
| Ranch (1 storey) | y 64..71 (y 64 a darker base course) | a low mono-pitch shed roof at y 72..73 in slabs, or flat with a thick fascia, overhang 1..2 | 10 × 12, walls y 64..71, a white garage door 5 wide × 4 high (y 65..68) |
| Two-storey | y 64..78 | y 79..80 | same |

**Doors and windows:**
- Front doors are `iron_door` (closed): houses are locked shells with no inside.
- Windows look like Jailbreak's opaque blue panels: `light_blue_stained_glass` in `white_concrete` frames, with a `white_concrete` blind block right behind each window cell, so the empty inside never shows.

**Yard:**
- front lawn (grass), a 2-wide walkway (`light_gray_concrete`) to the front door with a slab doorstep;
- the driveway (`smooth_stone`, 5 wide) from the sidewalk to the garage door;
- a mailbox (`smooth_quartz` on a `birch_fence` post with a `crimson_button` flag) beside the driveway, 1 block inside the plot;
- shrubs and 1-2 trees at least 4 blocks from the plot's edges;
- back and side yards fenced with `dark_oak_fence` 2 high behind the house's front line.

The car spot (8.2) sits on the driveway. Nothing may overhang it: the roof stops at the garage door line.

**Colours.** No two neighbours share a wall colour:
- walls: cream `smooth_sandstone`, peach `white_terracotta`, pink `pink_concrete_powder` or `cherry_planks`, lavender `light_blue_terracotta`, periwinkle `light_blue_concrete_powder`, white `MIX.white`, tan `stripped_birch_wood`, yellow `yellow_terracotta`;
- roofs: brown (`spruce_slab`, `mud_brick_slab`), navy (`deepslate_tile_slab`), slate (`polished_andesite_slab`), maroon (`mangrove_slab`, `nether_brick_slab`).

In the table, footprint, garage and driveway are x1..x2, z1..z2. The front door is one cell, on the house's street face.

| Plot | Box | Faces | Kind, walls / roof | House | Garage | Driveway | Front door |
|---|---|---|---|---|---|---|---|
| H1 | 299,866 .. 365,925 | west (Elm) | ranch, cream / brown | 308..325, 877..902 | 308..319, 903..912 | 299..307, 905..909 | (308, 889) |
| H2 | 299,926 .. 365,985 | west | two-storey, lavender / navy | 308..325, 935..958 | 308..319, 959..968 | 299..307, 961..965 | (308, 946) |
| H3 | 299,1009 .. 365,1057 | north (2nd) | ranch, peach / maroon | 309..334, 1018..1035 | 335..344, 1018..1029 | 338..342, 1009..1017 | (321, 1018) |
| H4 | 366,1009 .. 432,1057 | north | two-storey, pink / slate | 376..399, 1018..1035 | 400..409, 1018..1029 | 403..407, 1009..1017 | (387, 1018) |
| H5 | 299,1058 .. 365,1106 | south (Hill) | ranch, periwinkle / brown | 309..334, 1080..1097 | 335..344, 1086..1097 | 338..342, 1098..1106 | (321, 1097) |
| H6 | 366,1058 .. 432,1106 | south, corner of Main | the modern home (below) | 378..423, 1068..1097 | inside volume A | 387..391, 1098..1106 | stairs at x 402..408, z 1094..1101 |
| H7 | 212,948 .. 276,1000 | east (Elm) | two-storey, yellow / brown | 250..267, 956..979 | 256..267, 980..989 | 268..276, 982..986 | (267, 967) |
| H8 | 212,1004 .. 276,1056 | east | ranch, white / navy | 250..267, 1010..1035 | 256..267, 1036..1045 | 268..276, 1038..1042 | (267, 1022) |
| H9 | 212,1060 .. 276,1112 | east | two-storey, tan / maroon | 250..267, 1074..1097 | 256..267, 1064..1073 | 268..276, 1066..1070 | (267, 1085) |
| H10 | 264,1135 .. 326,1170 | east (Birch) | ranch, pink / slate | 300..317, 1139..1164 | carport 306..317, 1165..1169 | 318..326, 1165..1169 | (317, 1151) |
| H11 | 300,1205 .. 375,1250 | north (circle) | the rentable house (below) | 312..335, 1215..1232 | carport 336..345, 1215..1226 | 336..340, 1205..1214 | (324, 1215) |
| H12 | 349,1135 .. 413,1170 | west (Birch) | ranch, cream / brown | 358..375, 1139..1164 | carport 358..369, 1165..1169 | 349..357, 1165..1169 | (358, 1151) |

**H6, the modern home** (`modern_town_home`, `town_view_to_prison_tunnel`). Three stepped volumes on a grassy, orange-soil mound (ground raised to y 66 around the house, never on the driveway):
- **A:** a white box with big corner windows, 2 storeys (y 64..80), at x 378..399, z 1074..1097. A navy garage door with a 4-window strip sits in its south face at x 387..391.
- **B:** a lavender-grey tall wing with cyan ribbon windows (y 64..86), at x 400..423, z 1068..1093.
- **C:** concrete stairs with a parapet up to the front door, at x 402..408, z 1094..1101.

**H11, the rentable house** (`rentable_house`):
- periwinkle walls and a butterfly (V) roof with a deep blue-purple edge;
- a 2-storey black-framed 2×2 window grid;
- a flat-roofed carport;
- a "FOR SALE!" sign at (322, 65..67, 1208): a white board with a red bottom on a white post, with a label.

## 8. Gameplay: regions, spots and the setup commands

### 8.1 Regions

Every region gets `passthrough allow`. Every `safe_*` also gets `weapon-shoot deny`, except the range.

| Region | Box x1 y1 z1 .. x2 y2 z2 | Notes |
|---|---|---|
| `heist_donut` | 401 63 782 .. 430 76 827 | store (difficulty 0). The floor to just over the roof deck; the roof donut stays outside, so resets are cheap. |
| `heist_gas` | 370 63 885 .. 391 75 930 | store, the convenience store building only |
| `safe_gunshop` | 472 63 774 .. 547 95 833 | the shop, the range and the front lawn up to the doorstep |
| `safe_gunrange` | 515 64 787 .. 544 76 820 | priority 10, `weapon-shoot allow`. PvP stays off (the id starts with "safe"). It starts at x 515, the cells the shooters stand on (WeaponMechanics checks the shooter's spot). |
| `safe_shops` | 467 63 870 .. 499 100 966 | Gear and Bag Shop and the walkway between, not the rear lot |
| `safe_garage_town` | 328 63 785 .. 385 90 842 | the garage and its apron from x 328 east (exits, return). It covers the whole cut onto 1st Street (x 330..375, z 841..842), the lot's only way in, so a combat-tagged or wanted driver can't drive into the lot at all, the north lot included. Becomes a City Garage site at launch. |
| `safe_garage_dealer` | 466 63 1010 .. 543 110 1105 | the dealership, its lot and strip (x 543 is just past the tower's east wall at x 542; the first draft's x 553 took in 7 sidewalk cells of the SE loop corner). A site at launch. |
| `safe_base_safehouse` | 213 63 881 .. 276 95 943 | the base: loot sells on entry. House, porch, yards; not the sidewalk. |
| `safe_scrapyard` | 588 63 1018 .. 603 80 1031 | the Boss's booth and the spot in front of its window only |
| `district_mountainside` (launch) | 120 40 686 .. 770 160 1300 | `/ddistrict name mountainside Mountainside`. From x 120 (the town box's west edge), so the lake's west shore and the hills W1 and W2 are in it. |

Checked:
- no heist touches a safe zone (the nearest gap is 15 blocks: donut to `safe_garage_town`);
- no exit spot lies in a heist or a safe zone;
- heist regions don't overlap.

### 8.2 Spots

Players stand at y 65 unless noted. Yaw: 0 S, 90 W, 180 N, −90 E.

| What | Where | Command (W = `jailbreak` now, `world` at launch) |
|---|---|---|
| Donut register (3 cells, the blocks the loot lies on: a register cell holds 12 bills of $100) | 412 65 800 .. 412 65 802 | `/dloot add donut pile 412 65 800 412 65 802 value=1800-3000 style=register name=Front_register` |
| Donut exit spot | 435.5 65 804.5, yaw −90 | `/dheist exit donut` standing there |
| Donut hologram (stand here; it floats 2.5 up) | 431.5 65 811.5 (the apron in front of the glass, clear of the doorway) | `/dheist holo donut` |
| Gas register | 386 65 914 .. 386 65 915 | `/dloot add gas pile 386 65 914 386 65 915 value=1500-2400 style=register name=Register` |
| Gas lottery till | 380 65 890 | `... pile 380 65 890 380 65 890 value=300-600 style=register name=Lottery_till` |
| Gas exit / hologram | exit 397.5 65 907.5 (yaw −90); hologram 392.5 69.6 907.5, its own location (its lines at 69.6, 69.3, 69.0, before the glass over the transom and under the sign band; standing at the door it would hang at head height in the doorway) | `/dheist exit gas` standing there; `/dheist holo gas 392.5 69.6 907.5` (with x y z nothing is added) |
| Gun keeper | 496.5 65 803.5, yaw 90 | `/dshopkeeper add gun` |
| Gear keeper / tools keeper | 487.5 65 880.5 / 487.5 65 891.5, yaw 90 | `/dshopkeeper add gear`, `tools` |
| Bag keeper | 486.5 65 927.5, yaw 90 | `/dshopkeeper add bag` |
| Car Dealer | 516.5 65 1081.5, yaw 90 | `/dshopkeeper add cars` |
| Garage attendants (launch) | town 344.5 65 806.5 (yaw 0); dealer 516.5 65 1071.5 (yaw 90) | `/dshopkeeper add garage` |
| Mara | 250.5 65 911.5, yaw −90 | `/dquest addatw story W 250.5 65 911.5 -90 Safehouse` |
| Scrap Yard Boss | 595.5 65 1028.5, yaw 0 | `/dquest addatw contracts W 595.5 65 1028.5 0 Scrap Yard` |
| Chop shop | 632.5 65 1068.5 | `/dcontract chop add` (in game) |
| Contract car spots (driveways, facing the street) | H1 303.5 907.5 (90); H2 303.5 963.5 (90); H3 340.5 1013.5 (180); H4 405.5 1013.5 (180); H5 340.5 1102.5 (0); H6 389.5 1102.5 (0); H7 272.5 984.5 (−90); H8 272.5 1040.5 (−90); H9 272.5 1068.5 (−90); H10 322.5 1167.5 (−90); H11 338.5 1209.5 (180); H12 353.5 1167.5 (90) | `/dcontract spot add` on each (in game). All 12 are ≥ 28 apart, ≥ 230 from the chop, and outside heists and safe zones. |
| Crate stands, base (blocks, 3 clear above; two rows staggered so no two are closer than 4, because each one's hologram is about 2 wide; the first draft's single row 2 apart overlapped them) | row x 260: daily 260 65 899, common 260 65 903, uncommon 260 65 907, rare 260 65 911; row x 265: epic 265 65 901, legendary 265 65 905, hacked 265 65 909, season 265 65 913 (an aisle at x 261..264) | `/dcrate place <crate>` looking at each |
| Crate stands, dealer | supercar 508 65 1064, hypercar 508 65 1100 | same |
| Town garage site (launch) | exits 337.5 65 824.5 and 352.5 65 824.5 (yaw 0); return 381.5 65 834.5 (yaw 180; against the donut lot's fence, out of the aisles: `garageReturnCheck` parks any garage car driven within 4 blocks of it, with no grace); bays 337.5 65 800.5 and 352.5 65 800.5 (yaw 0; bays are numbered in the order they're added, and bay 1 must be the west one to match the painted "BAY 1"). No holo spot: `holo` hangs one label per bay, 2.4 over its spot | console: `dgaragesite bayat town 337.5 65 800.5 0`, `bayat town 352.5 65 800.5 0`, `exitat town 337.5 65 824.5 0`, `exitat town 352.5 65 824.5 0`, `returnat town 381.5 65 834.5 180`, `holo town` (the garage module's `setup.garages[0].cmds`) |
| Dealer garage site (launch) | exits 484.5 65 1025.5 and 484.5 65 1085.5 (yaw 90, toward the driveways); return 490.5 65 1055.5; bays 528.5 65 1067.5 / 1076.5 / 1085.5 / 1094.5 (yaw 90, 3 wide × 5 long over x 526..530) | same |
| Wall map (launch) | bottom-left block 250 66 896, the wall's south face, 3 × 2 | `/dphone wall create base 3 2` |
| Leaderboards | 242.5 65 885.5, 252.5 65 885.5, 262.5 65 885.5 | `/dseason holo <board>` |
| Points of interest (launch) | shop "Gun Shop" 476.5 65 802.5; shop "Gear Shop" 468.5 65 885.5; shop "Bag Shop" 468.5 65 926.5; shop "Car Dealer" 501.5 65 1072.5; base "Safehouse" 268.5 65 911.5; garage "Town Garage" 352.5 65 830.5; garage "Dealer Garage" 490.5 65 1055.5; landmark "Water Tower" 500.5 85 1176.5 | `/dpoi add <type> <name>` standing there |

### 8.3 Order of the setup (after a paste; not this run)

1. Regions: define each region in game (`//pos1`, `//pos2`, `/rg define <id>`), then the flags from the console (`rg flag -w W <id> ...`, `rg setpriority -w W safe_gunrange 10`).
2. Stores, for each of `donut` and `gas`:
   - `/dheist create <id> 0` in game, standing in W;
   - `/dheist set <id> name Donut Shop` (or `Gas Station`);
   - `exit`, the `dloot` lines, `/dloot check`;
   - `snapshot` with the room clean and the doors closed;
   - `holo`, `enable`.
3. Shopkeepers, quest givers, crate stands, car spots and the chop shop, as in the table.
4. GPS paths (8.4).
5. The phone's map of the jailbreak world, prison and town together: `/dphone city scan -40 -30 770 1300 0 jailbreak` (811 × 1331 pixels, under the 2,048 limit).
6. At launch (the world becomes `world`): POIs, garage sites, the district, the wall map, `/dhit route on`, and `/setspawn`.
7. At launch, before `/dphone roads scan` (the road grid only serves the main world):
   - Add `blackstone`, `polished_blackstone`, `blackstone_slab`, `polished_blackstone_slab`, `smooth_quartz_slab` and `bamboo_slab` to DonatingPhone's `gps.road-blocks`. Otherwise the approach's climb and descent (resurfaced in blackstone, with slab rows) read as open ground.
   - Set `gps.street-y-min/max` to about 62..71: the town is at y 64 and the tunnel's road at y 70.
   - Two things stay wrong in the grid whatever the band: the hollow hills' insides read as open flat land (air over the grass), and the tunnel reads as blocked when the band stops below y 70. The town's GPS paths (8.4) carry every route within 24 blocks of a street, so the grid only matters off the streets.

`town.js setup --world <W>` prints all of these from the modules' `setup` exports (section 10.3), so the same list works now and at launch.

### 8.4 GPS path nodes (`module.exports.gps` of `approach` and `streets`; ids from 1001)

**Nodes** (x y z, name):

| Id | Coordinates | Name |
|---|---|---|
| 1001 | 260.5 65 426.5 | HIGHWAY_GATE |
| 1002 | 448.5 65 426.5 | JUNCTION |
| 1003 | 448.5 65 490.5 | APPROACH |
| 1050 | 448.5 65 502.5 | CLIMB (where the flat road starts to climb) |
| 1004 | 448.5 71 550.5 | TUNNEL_N |
| 1005 | 448.5 71 614.5 | TUNNEL_S |
| 1006 | 448.5 65 688.5 | BRIDGE_N |
| 1007 | 448.5 65 730.5 | MAIN_N |
| 1008 | 448.5 65 790.5 | MAIN_SHOPS |
| 1009 | 448.5 65 853.5 | MAIN_1ST |
| 1010 | 448.5 65 925.5 | MAIN_GAS |
| 1011 | 448.5 65 997.5 | MAIN_2ND |
| 1012 | 448.5 65 1055.5 | MAIN_DEALER |
| 1013 | 448.5 65 1117.5 | MAIN_HILL |
| 1014 | 360.5 65 853.5 | |
| 1015 | 520.5 65 853.5 | |
| 1016 | 295.0 65 861.0 | NW_CORNER |
| 1017 | 561.0 65 861.0 | NE_CORNER |
| 1018 | 288.0 65 911.5 | ELM_SAFEHOUSE |
| 1019 | 288.0 65 997.5 | ELM_2ND |
| 1020 | 288.0 65 1060.5 | |
| 1021 | 295.0 65 1111.0 | SW_CORNER |
| 1022 | 337.5 65 1117.5 | HILL_BIRCH |
| 1023 | 520.5 65 1117.5 | |
| 1024 | 561.0 65 1111.0 | SE_CORNER |
| 1025 | 568.0 65 925.5 | |
| 1026 | 568.0 65 997.5 | EAST_2ND |
| 1027 | 568.0 65 1053.5 | EAST_SCRAP |
| 1028 | 360.5 65 997.5 | |
| 1029 | 520.5 65 997.5 | |
| 1030 | 337.5 65 1160.5 | |
| 1031 | 337.5 65 1186.0 | BIRCH_CIRCLE |
| 1051 | 499.5 65 1117.5 | HILL_STAIRS (land's: on Hill Road's centre line, splitting 1013-1023) |
| 1052 | 499.5 65 1128.5 | STAIRS_FOOT (land's) |
| 1053 | 499.5 85 1176.5 | WATER_TOWER (land's: the top of the stairs, the Water Tower POI's spot) |

**Doors:**

| Id | Coordinates | Name |
|---|---|---|
| 1040 | 476.5 65 802.5 | GUN_SHOP |
| 1041 | 431.5 65 804.5 | DONUT |
| 1042 | 352.5 65 830.5 | GARAGE |
| 1043 | 392.5 65 907.5 | GAS |
| 1044 | 468.5 65 885.5 | GEAR_SHOP |
| 1045 | 468.5 65 926.5 | BAG_SHOP |
| 1046 | 501.5 65 1072.5 | DEALER |
| 1047 | 267.5 65 911.5 | SAFEHOUSE |
| 1048 | 584.5 65 1053.5 | SCRAP_YARD |
| 1049 | 402.5 65 953.5 | GAS_FORECOURT (keeps the gas link off the pumps and the south bin pad; the link on to 1010 meets Main's strip on its footpath) |

**Links:**
- the spine: 187-1001-1002-1003-1050-1004-1005-1006-1007-1008-1009-1010-1011-1012-1013;
- the loop: 1009-1014-1016-1018-1019-1020-1021-1022-1013-1051-1023-1024-1027-1026-1025-1017-1015-1009 (1013-1051-1023 are land's links, so streets has no 1013-1023: it would lie on top of them);
- 2nd Street: 1011-1028-1019 and 1011-1029-1026;
- Birch Court: 1022-1030-1031;
- the water tower's stairs (land's): 1051-1052-1053. The POI is about 59 blocks from the nearest street link (paths reach 24), so without them a pin on it stopped on Hill Road;
- doors: 1040-1008, 1041-1008, 1042-1014, 1043-1049-1010, 1044-1010, 1045-1010, 1046-1012, 1047-1018, 1048-1027.

187 is the prison's `LOT_EXIT` (in tools/jail-gps-paths.txt). Every link stays on asphalt or open ground; this was checked against the plan's geometry.

The trail and the dot follow a link's straight line at its height (+0.25, +1). Without 1050, the climb's one link 1003-1004 rose through the flat stretch z 490..502 and floated 1.2 over the road where the climb starts. The rest of the ramp stays within half a block of its line. The ramps are too gentle for an "up" or "down" prompt: DonatingPhone's Gps.lineCorner wants a 2.5 climb at 0.4 a block, and the road climbs 0.125.

## 9. COMMON (copy verbatim into every town module, like the prison's)

It has:
- the prison's helpers (`h`, `pick`, `MIX`, `door`, `bed`, `line4`), extended;
- the town's frame and every module's box;
- the street network and the curb cuts;
- the river;
- the approach's levels;
- terrain helpers and the terrain heights: `RIDGE`, `HILLS`, `groundTop`, `hill`, `builtD`, `capY`, `retainY`, `KEEP_FREE`, `STAIRS`, `PAD` (section 1, "One height for every hill");
- prop helpers.

All of it is pure: it reads no blocks and writes only through the `S` a module passes in.

`groundTop` and `builtD` are memoized in typed arrays over the town box. The first call runs a BFS over its 540,000 columns, under a second.

`ownFor(mod)` is each module's region test. Every write goes through `const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s) }`.

```js
// ---- COMMON (tools/build/town/PLAN.md section 9: copy verbatim into every town module) ----
const h = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 100
const pick = (x, y, z, mix) => { const v = h(x, y, z); let a = 0; for (const [s, p] of mix) { a += p; if (v < a) return s } return mix[mix.length - 1][0] }
const MIX = {
  white: [['white_concrete', 70], ['smooth_quartz', 20], ['calcite', 10]],
  brick: [['bricks', 85], ['polished_granite', 8], ['terracotta', 7]],
  asphalt: [['black_concrete', 75], ['black_concrete_powder', 15], ['gray_concrete_powder', 10]],
  darkstone: [['blackstone', 40], ['cobbled_deepslate', 35], ['polished_basalt', 25]],
  navy: [['blue_terracotta', 80], ['blue_concrete', 20]],
  // town additions
  deck: [['black_concrete', 90], ['gray_concrete', 10]], // asphalt with no powder: bridge decks and anything over air
  stonebrick: [['stone_bricks', 70], ['cracked_stone_bricks', 12], ['tuff_bricks', 18]],
  riverbed: [['sand', 55], ['gravel', 25], ['clay', 20]],
  bank: [['sand', 40], ['coarse_dirt', 35], ['red_sand', 25]],
  orange: [['red_sand', 50], ['coarse_dirt', 30], ['orange_terracotta', 20]] // Jailbreak's orange ground patches
}
// both halves of a door; y = the lower half. Iron doors can't be opened by hand.
const door = (b, x, y, z, facing, hinge = 'left', open = false, block = 'iron_door') => {
  b.set(x, y, z, `${block}[facing=${facing},half=lower,hinge=${hinge},open=${open},powered=false]`)
  b.set(x, y + 1, z, `${block}[facing=${facing},half=upper,hinge=${hinge},open=${open},powered=false]`) }
// both parts of a bed; (x,y,z) = the head, the foot is one block opposite to facing. Beds are decoration only.
const bed = (b, color, x, y, z, facing) => {
  const d = { north: [0, 1], south: [0, -1], east: [-1, 0], west: [1, 0] }[facing]
  b.set(x, y, z, `${color}_bed[facing=${facing},part=head,occupied=false]`)
  b.set(x + d[0], y, z + d[1], `${color}_bed[facing=${facing},part=foot,occupied=false]`) }
// a diagonal line rasterized 4-connected (an extra cell wherever x and z both change), for fences and bars
const line4 = (x1, z1, x2, z2, fn) => { const n = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1)); let px = null, pz = null
  for (let i = 0; i <= n; i++) { const x = Math.round(x1 + (x2 - x1) * i / n), z = Math.round(z1 + (z2 - z1) * i / n)
    if (px !== null && x !== px && z !== pz) fn(x, pz); fn(x, z); px = x; pz = z } }
const rect = (x1, z1, x2, z2, fn) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) fn(x, z) }

// ---- the town's frame --------------------------------------------------------------------------------------------
const WORLD = 'jailbreak'
const TOWN = { x1: 120, z1: 471, x2: 770, z2: 1300, y1: 50, y2: 160 } // every block of the town lies in here
const TOWN_Z = 729   // z < 729: the approach module; z >= 729: the town
const WATER_Y = 60   // the river's and the lake's top water block
const LABEL_TAG = 'town_label', DISPLAY_TAG = 'town_display' // the tags of the town's text displays and item displays
// The building modules' column boxes [x1, z1, x2, z2] (all y). A street cell inside a box still belongs to the streets.
const PLOTS = {
  H1: [299, 866, 365, 925], H2: [299, 926, 365, 985], H3: [299, 1009, 365, 1057], H4: [366, 1009, 432, 1057],
  H5: [299, 1058, 365, 1106], H6: [366, 1058, 432, 1106], H7: [212, 948, 276, 1000], H8: [212, 1004, 276, 1056],
  H9: [212, 1060, 276, 1112], H10: [264, 1135, 326, 1170], H11: [300, 1205, 375, 1250], H12: [349, 1135, 413, 1170]
}
const BOX = {
  gunshop: [[465, 730, 556, 842]],
  donut: [[386, 730, 432, 842]],
  garage: [[300, 730, 385, 842]],
  gas: [[366, 865, 432, 986]],
  shops: [[465, 865, 556, 986]],
  dealer: [[465, 1009, 556, 1106]],
  safehouse: [[212, 880, 276, 944]],
  scrapyard: [[579, 1012, 662, 1100]],
  pawnshop: [[579, 940, 614, 985]], // Vic's Pawn Shop (section 15.4, 2026-10-21)
  poolhall: [[418, 1129, 479, 1172]], // the Broker's Pool Hall (section 15.5)
  houses: Object.values(PLOTS)
}
const BUILDINGS = Object.keys(BOX)

// ---- streets (z >= 729; the approach road and the bridge are the approach module's) ----------------------------------
// Straight streets: the asphalt cells, the axis traffic runs along, the sidewalk width, and the lines: a cell is yellow
// (white) when its centre is `yellow` (`white`) blocks from the asphalt's centre line.
const STREETS = [
  { id: 'main', name: 'Main Street', x1: 437, z1: 729, x2: 460, z2: 1109, axis: 'z', walk: 4, yellow: 0.5, white: 10.5 },
  { id: 'first', name: '1st Street', x1: 312, z1: 846, x2: 543, z2: 861, axis: 'x', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'second', name: '2nd Street', x1: 296, z1: 990, x2: 559, z2: 1005, axis: 'x', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'hill', name: 'Hill Road', x1: 312, z1: 1110, x2: 543, z2: 1125, axis: 'x', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'elm', name: 'Elm Road', x1: 280, z1: 878, x2: 295, z2: 1093, axis: 'z', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'east', name: 'East Street', x1: 560, z1: 878, x2: 575, z2: 1093, axis: 'z', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'birch', name: 'Birch Court', x1: 330, z1: 1126, x2: 345, z2: 1186, axis: 'z', walk: 3, yellow: 0.5, white: null }
]
// The loop's four rounded corners: the arc's centre and its quadrant (sx, sz: the side of the centre it lies on).
// Asphalt where the distance r from the centre is 16..32 (centre line at 24), sidewalks 13..16 and 32..35.
const CORNERS = [{ cx: 312, cz: 878, sx: -1, sz: -1 }, { cx: 544, cz: 878, sx: 1, sz: -1 },
  { cx: 312, cz: 1094, sx: -1, sz: 1 }, { cx: 544, cz: 1094, sx: 1, sz: 1 }]
const CORNER = { r: 24, half: 8, walk: 3 }
const CIRCLE = { cx: 338, cz: 1186, r: 16, walk: 3 } // Birch Court's turning circle: asphalt r < 16, sidewalk 16..19
// Curb cuts [x1, z1, x2, z2]: sidewalk cells with no curb slab where a lot or a driveway meets the street (the module
// behind paves its side right up to the sidewalk there).
const DRIVEWAYS = [
  [433, 744, 436, 757], // donut: the lot (Main, west side)
  [433, 868, 436, 879], [433, 952, 436, 963], // gas station forecourt in and out
  [461, 744, 464, 757], // gun shop lot (Main, east side)
  [461, 1020, 464, 1031], [461, 1080, 464, 1091], // dealer lot
  [330, 843, 375, 845], [388, 843, 399, 845], // town garage apron, donut west strip (1st Street, north side)
  [520, 862, 533, 864], [520, 987, 533, 989], [557, 920, 559, 933], // the shops' rear lot (1st, 2nd, East Street)
  [576, 1050, 578, 1057], // scrap yard gate (East Street, east side)
  [296, 905, 298, 909], [296, 961, 298, 965], // H1, H2 (Elm Road, east side)
  [338, 1006, 342, 1008], [403, 1006, 407, 1008], // H3, H4 (2nd Street, south side)
  [338, 1107, 342, 1109], [387, 1107, 391, 1109], // H5, H6 (Hill Road, north side)
  [277, 932, 279, 936], [277, 982, 279, 986], [277, 1038, 279, 1042], [277, 1066, 279, 1070], // safehouse, H7, H8, H9
  [327, 1165, 329, 1169], [336, 1202, 340, 1204], [346, 1165, 348, 1169] // H10, H11, H12 (Birch Court)
]
// What a column of the street network is: null, or { kind: 'asphalt' | 'walk', line: 'yellow' | 'white' | null, street }.
// Asphalt wins over a sidewalk; a cell in two streets' asphalt (a junction) has no line. Pure: no blocks are read.
function streetCell (x, z) {
  if (z < TOWN_Z) return null
  const px = x + 0.5, pz = z + 0.5
  let asph = null, n = 0, walk = null
  for (const s of STREETS) {
    const inX = x >= s.x1 && x <= s.x2, inZ = z >= s.z1 && z <= s.z2
    if (inX && inZ) {
      n++
      const o = s.axis === 'z' ? Math.abs(px - (s.x1 + s.x2 + 1) / 2) : Math.abs(pz - (s.z1 + s.z2 + 1) / 2)
      asph = { kind: 'asphalt', line: o === s.yellow ? 'yellow' : o === s.white ? 'white' : null, street: s.id }
    } else if (!walk && (s.axis === 'z' ? inZ : inX)) {
      const d = s.axis === 'z' ? (x < s.x1 ? s.x1 - x : x - s.x2) : (z < s.z1 ? s.z1 - z : z - s.z2)
      if (d >= 1 && d <= s.walk) walk = { kind: 'walk', line: null, street: s.id }
    }
  }
  for (const c of CORNERS) {
    const dx = px - c.cx, dz = pz - c.cz
    if (dx * c.sx < 0 || dz * c.sz < 0) continue
    const o = Math.hypot(dx, dz) - CORNER.r, f = Math.floor(o)
    if (o >= -CORNER.half && o < CORNER.half) { n++; asph = { kind: 'asphalt', line: f === -1 || f === 0 ? 'yellow' : f === -7 || f === 6 ? 'white' : null, street: 'corner' } }
    else if (!walk && Math.abs(o) < CORNER.half + CORNER.walk) walk = { kind: 'walk', line: null, street: 'corner' }
  }
  const rc = Math.hypot(px - CIRCLE.cx, pz - CIRCLE.cz)
  if (rc < CIRCLE.r) { n++; asph = { kind: 'asphalt', line: null, street: 'birch' } } else if (!walk && rc < CIRCLE.r + CIRCLE.walk) walk = { kind: 'walk', line: null, street: 'birch' }
  if (asph) { if (n > 1) asph.line = null; return asph }
  return walk
}
const SC = new Int8Array((TOWN.x2 - TOWN.x1 + 1) * (TOWN.z2 - TOWN.z1 + 1)) // 0 unknown, 1 no street, 2 street
const inStreet = (x, z) => {
  if (x < TOWN.x1 || x > TOWN.x2 || z < TOWN.z1 || z > TOWN.z2) return false
  const i = (x - TOWN.x1) * (TOWN.z2 - TOWN.z1 + 1) + (z - TOWN.z1)
  if (!SC[i]) SC[i] = streetCell(x, z) ? 2 : 1
  return SC[i] === 2
}
const inDriveway = (x, z) => DRIVEWAYS.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
// Which module owns a column: 'approach', 'streets', a building module, or 'land' (everything else in the town).
const inBox = (x, z, boxes) => boxes.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
const ownerOf = (x, z) => {
  if (x < TOWN.x1 || x > TOWN.x2 || z < TOWN.z1 || z > TOWN.z2) return null
  if (z < TOWN_Z) return 'approach'
  if (inStreet(x, z)) return 'streets'
  for (const m of BUILDINGS) if (inBox(x, z, BOX[m])) return m
  return 'land'
}
const ownFor = mod => (x, y, z) => y >= TOWN.y1 && y <= TOWN.y2 && ownerOf(x, z) === mod

// ---- the approach road (z 471..728) ----------------------------------------------------------------------------------
// Its surface in half blocks over y 64: L 0 = the road block at y 64; L even = the road block at y 64 + L/2; L odd = a
// bottom slab at y 65 + (L-1)/2 on a full block. Half a block up every 4 blocks (z 503..550), level in the tunnel
// (L 12, z 551..614: the road block at y 70), half a block down every 6 blocks (z 615..686), level over the bridge.
const approachLevel = z => z <= 502 ? 0 : z <= 550 ? Math.floor((z - 503) / 4) + 1 : z <= 614 ? 12 : z <= 686 ? 11 - Math.floor((z - 615) / 6) : 0
const levelTop = L => ({ full: 64 + Math.floor(L / 2), slab: L % 2 === 1, stand: 65 + L / 2 }) // stand: where feet are
const TUNNEL = { z1: 551, z2: 614, x1: 434, x2: 463, floor: 70 } // the tunnel's inside (walls x 432..433 and 464..465)
// The approach's cross-section outside the tunnel (x ranges): the road (lines as Main Street: white 438 and 459, yellow
// 448 and 449), walkways, verges, the cutting's retaining walls. The bridge carries road and walkways over z 686..728.
const APPROACH = { road: [437, 460], walk: [[433, 436], [461, 464]], verge: [[431, 432], [465, 466]], wall: [[429, 430], [467, 468]] }
const BRIDGE = { z1: 686, z2: 728 }

// ---- the river and the lake (shared by approach and land) ----------------------------------------------------------
// The north branch (x 270..745, z <= 728) is generated from NORTH, the straight line it used to be: a point [x, z, half]
// every 8 blocks, swinging up to 8 off that line with a half-width of 10..15 (northBend). It stays straight with half 13
// under the bridge (|x + 0.5 - 449| <= 40), at the culvert (x 712 on) and into the bend (x 290 and west), and its south
// bank never reaches z 729 (west of x 540 never past the straight line's: the town's lots keep their grass). From the bend
// on it's [x, z] points with riverHalf(z), and the west branch meanders (z 856 on: [x, z, half], half 11..13) westward
// only: its east bank stays at x 207 or less (x + half <= 201), clear of the safehouse and the plots at x 212.
const NORTH = [[745, 701], [640, 704], [540, 707], [449, 708], [350, 706], [270, 711]]
const smooth01 = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)
const northZ = x => { for (let i = 1; i < NORTH.length; i++) { const [ax, az] = NORTH[i - 1], [bx, bz] = NORTH[i]; if (x >= bx) return az + (bz - az) * (ax - x) / (ax - bx) } return NORTH[NORTH.length - 1][1] }
const northBend = x => {
  const env = smooth01((x - 290) / 40) * smooth01((712 - x) / 32) * smooth01((Math.abs(x + 0.5 - 449) - 40) / 30)
  const lim = x < 540 ? 0 : (709.5 - northZ(x)) * smooth01((x - 540) / 60) // how far the south edge may pass the line's
  let m = 8 * Math.sin(2 * Math.PI * (x - 237) / 150), w = 12.5 + 2.5 * Math.sin(2 * Math.PI * (x - 300) / 105)
  const ex = m + w - 13 - lim // past the limit: narrower first, then farther north
  if (ex > 0) { const dw = Math.min(ex, w - 10); w -= dw; m -= ex - dw }
  return [x, northZ(x) + env * m, 13 + env * (w - 13)]
}
const RIVER = [...Array.from({ length: 60 }, (_, i) => northBend(745 - 8 * i)), [270, 711, 13], [228, 728], [203, 760],
  [191, 800], [190, 856, 11], [180, 905, 12], [186, 960, 11], [176, 1010, 13], [184, 1065, 11], [178, 1120, 12],
  [188, 1170, 11], [192, 1196, 11]]
const LAKE = { cx: 192, cz: 1240, rx: 60, rz: 46 }
const riverHalf = z => z <= 740 ? 13 : z >= 790 ? 11 : 13 - 2 * (z - 740) / 50 // half-width of the water
const BANK = 6, BEACH = 14
const RIVER_END_X = 739 // the river comes out of a culvert in the hill: no river east of x 739 (the headwall is x 739..741)
const segT = (px, pz, a, b) => { const vx = b[0] - a[0], vz = b[1] - a[1]
  return Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz))) }
const segD = (px, pz, a, b) => { const t = segT(px, pz, a, b); return Math.hypot(px - a[0] - t * (b[0] - a[0]), pz - a[1] - t * (b[1] - a[1])) }
// How far a point lies outside the river's water (<= 0 in it): the least, over the segments, of the distance minus the
// half-width there (a [x, z, half] segment's own, else riverHalf).
const riverE = (px, pz) => { let e = Infinity
  for (let i = 1; i < RIVER.length; i++) {
    const a = RIVER[i - 1], b = RIVER[i], t = segT(px, pz, a, b)
    const w = a.length > 2 && b.length > 2 ? a[2] + t * (b[2] - a[2]) : riverHalf(pz)
    e = Math.min(e, Math.hypot(px - a[0] - t * (b[0] - a[0]), pz - a[1] - t * (b[1] - a[1])) - w)
  }
  return e }
// The same for the lake (<= 0 in it): an ellipse whose radius wobbles round the shore (up to about 11% in or out), so the
// lake isn't a perfect oval.
const lakeE = (px, pz) => { const u = (px - LAKE.cx) / LAKE.rx, v = (pz - LAKE.cz) / LAKE.rz, a = Math.atan2(v, u)
  return (Math.hypot(u, v) - 1 - 0.07 * Math.sin(3 * a + 1) - 0.04 * Math.sin(5 * a + 2)) * Math.min(LAKE.rx, LAKE.rz) }
// A column of the river or the lake: null (dry land), { water: true, bed } (the bed block at y bed, water from bed + 1 to
// WATER_Y, air above to y 64), or { water: false, top, beach } (a bank or the beach: its top block at y top, air above).
function riverAt (x, z) {
  const px = x + 0.5, pz = z + 0.5
  if (px < 110 || px > RIVER_END_X || pz < 664 || pz > 1300) return null
  let e = riverE(px, pz)
  const el = lakeE(px, pz)
  const lake = el < e
  if (lake) e = el
  if (e <= 0) return { water: true, bed: WATER_Y - 2 - Math.min(3, Math.floor(-e / 4)) }
  const beach = lake && px > LAKE.cx - 10 && pz > LAKE.cz - 30
  const w = beach ? BEACH : BANK
  if (e > w) return null
  return { water: false, top: Math.min(64, WATER_Y + Math.ceil(4 * e / w)), beach }
}
// How far a column is beyond the river's banks (0 on a bank or in the water): hills keep h <= dryD - 2 near the river.
// Behind the culvert (x 742 on) it rises 1:1 from the river's end, plus CULVERT_RISE behind the headwall (z 685..717) and
// its wings (z 681..684, 718..721), so the hill there meets their top instead of leaving a ditch behind them.
const CULVERT_RISE = z => z >= 685 && z <= 717 ? 7 : z >= 681 && z <= 684 ? z - 678 : z >= 718 && z <= 721 ? 724 - z : 0
const dryD = (x, z) => { const px = x + 0.5, pz = z + 0.5; let e = Infinity
  if (px > RIVER_END_X + 3) return dryD(RIVER_END_X + 2, z) + (x - RIVER_END_X - 2) + CULVERT_RISE(z) // behind the culvert
  e = riverE(px, pz) - BANK
  const el = lakeE(px, pz) - BEACH
  return Math.max(0, Math.min(e, el)) }

// ---- terrain helpers (approach and land) -----------------------------------------------------------------------------
// A dome hill [cx, cz, r, H]: H blocks over y 64 at its centre, 0 at radius r.
const dome = (x, z, p) => { const t = Math.hypot(x + 0.5 - p[0], z + 0.5 - p[1]) / p[2]; return t >= 1 ? 0 : Math.round(p[3] * Math.pow(1 - t * t, 1.3)) }
const CLIFF = ['orange_terracotta', 'smooth_red_sandstone', 'orange_terracotta', 'red_sandstone', 'orange_terracotta', 'smooth_red_sandstone']
// One hill column as a closed shell: blocks from max(65, minN - 2) up to top (minN = the lowest of the 4 neighbours'
// tops; the inside of a big hill stays air, unseen). Grass on top, dirt under it; wherever the column stands 2+ above a
// neighbour its exposed blocks are banded salmon orange (Jailbreak's cliffs). rim (hill(): a real cliff's top, or near a
// riser) gives it orange ground on top instead: red sand, a quarter orange terracotta, coarse dirt where red sand would
// sit over air (only a column 2+ under all its neighbours has nothing under its top). S = the clipped setter.
function hillColumn (S, x, z, top, minN, rim = top - minN >= 4) {
  const held = top - 1 <= 64 || top - 1 >= Math.max(65, minN - 2)
  for (let y = Math.max(65, minN - 2); y <= top; y++) {
    let s
    if (y === top) { s = !rim ? 'grass_block' : h(x, y, z) < 75 ? 'red_sand' : 'orange_terracotta'; if (s === 'red_sand' && !held) s = 'coarse_dirt' }
    else if (y > minN) s = CLIFF[Math.floor(y / 3) % CLIFF.length]
    else s = y >= top - 3 ? 'dirt' : 'stone'
    S(x, y, z, s)
  }
}
// Jailbreak's orange ground: ragged blobs of red sand and coarse dirt in the grass (true = this column is one).
const orangeAt = (x, z) => {
  const gx = Math.floor(x / 24), gz = Math.floor(z / 24)
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const cx = gx + i, cz = gz + j
    if (h(cx, 11, cz) >= 22) continue
    const ox = cx * 24 + h(cx, 12, cz) % 24, oz = cz * 24 + h(cx, 13, cz) % 24, r = 3 + h(cx, 14, cz) % 6
    if (Math.hypot(x - ox, (z - oz) * 1.6) < r + (h(x, 15, z) % 3) - 1) return true
  }
  return false
}

// ---- terrain heights: the ONE height of every hill column, for the approach and the land module alike -----------------
// groundTop(x, z) = blocks over y 64 (0 = the world's own flat grass). Each module builds its hill columns with
// hill(S, x, z), which takes minN from groundTop() of the 4 neighbours whichever module owns them, so a hollow hill always
// closes across a module's edge (z 728/729 above all). Pure and memoized; reads no blocks.
const RIDGE = [[449, 582, 95, 34], [565, 566, 115, 44], [345, 596, 100, 30], [668, 612, 85, 26], [748, 668, 55, 22],
  [258, 616, 75, 16], [175, 650, 55, 10]] // R1..R7: the ridge between the prison and the town (section 3.4)
// E2, E4, W1, W2 and S1 fit inside the town's box (2026-10-20: cut by its edge they ended in straight 1:1 ramps, which
// will show once the map grows past it).
const HILLS = [[660, 800, 70, 26], [700, 870, 70, 30], [650, 930, 60, 20], [715, 985, 55, 24], [700, 760, 60, 18],
  [500, 1186, 50, 20], [152, 900, 32, 12], [150, 1060, 30, 14], [420, 1258, 42, 10]] // E1..E5, T1, W1, W2, S1 (section 5)
const T1_TOP = { cx: 500, cz: 1186, r: 10, h: 20 } // the water tower hill's flat top: ground y 84
const STAIRS = [498, 1129, 500, 1176] // the water tower's stair path [x1, z1, x2, z2]: its own even climb, 20 up over 48
const KEEP_FREE = [[600, 1110, 770, 1300], [120, 843, 311, 864]] // the volcano's site; the future north-west road (flat)
const PAD = [469, 674, 479, 686] // the welcome sign's levelled pad (section 3.7)
const PORTAL_N = 548, PORTAL_S = 617 // the portals' outer faces (headwalls z 548..550 and 615..617)
const standY = z => 65 + approachLevel(z) / 2 // where feet are on the approach road
const portalD = z => z < PORTAL_N ? PORTAL_N - z : z > PORTAL_S ? z - PORTAL_S : 0
const inCutting = z => (z >= 485 && z < PORTAL_N) || (z > PORTAL_S && z <= 686)
// The cutting's cap (a y): 4 over the walkway, rising 2 a block over the last 14 blocks before a portal, so the retaining
// walls and the hill behind them climb into the headwall with no step.
const capY = z => Math.floor(standY(z)) + 4 + 2 * Math.max(0, 14 - portalD(z))
let BUILT = null // steps (4-connected) from each town column to the nearest street, building box or the north-west strip
const builtD = (x, z) => {
  const W = TOWN.x2 - TOWN.x1 + 1, D = TOWN.z2 - TOWN.z1 + 1
  if (!BUILT) {
    BUILT = new Int16Array(W * D).fill(32767); const q = new Int32Array(W * D); let n = 0
    for (let i = TOWN.x1; i <= TOWN.x2; i++) for (let k = TOWN.z1; k <= TOWN.z2; k++) {
      const o = ownerOf(i, k)
      if ((o !== 'land' && o !== 'approach') || inBox(i, k, [KEEP_FREE[1]])) { const j = (i - TOWN.x1) * D + (k - TOWN.z1); BUILT[j] = 0; q[n++] = j }
    }
    for (let r = 0; r < n; r++) {
      const j = q[r], i = Math.floor(j / D), k = j % D, d = BUILT[j] + 1
      if (i > 0 && BUILT[j - D] > d) { BUILT[j - D] = d; q[n++] = j - D }
      if (i < W - 1 && BUILT[j + D] > d) { BUILT[j + D] = d; q[n++] = j + D }
      if (k > 0 && BUILT[j - 1] > d) { BUILT[j - 1] = d; q[n++] = j - 1 }
      if (k < D - 1 && BUILT[j + 1] > d) { BUILT[j + 1] = d; q[n++] = j + 1 }
    }
  }
  return BUILT[(x - TOWN.x1) * D + (z - TOWN.z1)]
}
// A smooth field 0..1 (bilinear over a c x c grid of hashed values, smoothstepped): wide, gentle variation, never a bump.
const fieldN = (x, z, c, salt) => { const gx = Math.floor(x / c), gz = Math.floor(z / c), fx = smooth01(x / c - gx), fz = smooth01(z / c - gz)
  const v = (i, j) => h(gx + i, salt, gz + j) / 99
  return (v(0, 0) * (1 - fx) + v(1, 0) * fx) * (1 - fz) + (v(0, 1) * (1 - fx) + v(1, 1) * fx) * fz }
// The ridge's foot on the prison's side: 0 at z 482 (to 487 along a slow wave in x, so its contours don't run parallel
// to the prison's fence), then 0.6 a block (a 1:1 ramp read as one straight bank from the prison).
const ridgeFoot = (x, z) => Math.floor(0.6 * (z - 482) - 1.5 + 1.5 * Math.sin(x / 19 + 0.7) * Math.cos(x / 53))
function groundCalc (x, z) {
  if (z < 482 || riverAt(x, z) || inBox(x, z, KEEP_FREE) || inBox(x, z, [PAD])) return 0
  if (inBox(x, z, [STAIRS])) return Math.min(T1_TOP.h, Math.floor((z - STAIRS[1] + 1) * T1_TOP.h / 48))
  const tunnel = z >= PORTAL_N && z <= PORTAL_S && x >= 424 && x <= 473 // over the tunnel, its headwalls and their ends
  if (!tunnel && z <= 728 && x >= 429 && x <= 468) return 0 // the approach road's corridor: approach builds it itself
  let t = 0
  for (const p of RIDGE) t = Math.max(t, dome(x, z, p))
  for (const p of HILLS) t = Math.max(t, dome(x, z, p))
  if (t > 0) { // the ridge (z < 709; none on the town's side): wavy contours and a wandering terrace line, not rings
    const k = smooth01((TOWN_Z - 20 - z) / 20)
    t = Math.round(t + k * 4 * (fieldN(x, z, 48, 61) - 0.5) * Math.min(1, t / 8))
    if (t > 10 + Math.round(k * 6 * (fieldN(x, z, 40, 62) - 0.5))) t -= t % 2 // even terraces: steps of 2 with cliff bands
  }
  if (Math.hypot(x + 0.5 - T1_TOP.cx, z + 0.5 - T1_TOP.cz) <= T1_TOP.r) t = T1_TOP.h
  if (tunnel) t = Math.max(t, 26) // the cover over the tunnel's lining reaches y 90
  t = Math.min(t, ridgeFoot(x, z), x - TOWN.x1, TOWN.x2 - x, TOWN.z2 - z, Math.floor(dryD(x, z)) - 2, builtD(x, z) - 3)
  if (inCutting(z) && (x < 429 || x > 468)) t = Math.min(t, capY(z) - 64 + (x < 429 ? 429 - x : x - 468))
  return Math.max(0, t)
}
let GT = null
const groundTop = (x, z) => {
  if (x < TOWN.x1 || x > TOWN.x2 || z < TOWN.z1 || z > TOWN.z2) return 0
  const D = TOWN.z2 - TOWN.z1 + 1, j = (x - TOWN.x1) * D + (z - TOWN.z1)
  if (!GT) GT = new Int16Array((TOWN.x2 - TOWN.x1 + 1) * D).fill(-1)
  if (GT[j] < 0) GT[j] = groundCalc(x, z)
  return GT[j]
}
// A riser: a hill column standing 2+ over its lowest neighbour (a terrace's or a cliff's edge).
const riserAt = (x, z) => { const t = groundTop(x, z)
  return t > 0 && t - Math.min(groundTop(x + 1, z), groundTop(x - 1, z), groundTop(x, z + 1), groundTop(x, z - 1)) >= 2 }
// Jailbreak's orange ground hugs its cliffs: a column within 2 steps (4-connected) of a riser, inside fieldN's
// coherent patches (about half the ground near the risers: with every one of them orange, a dome's steep side read as
// solid orange rings).
const nearRiser = (x, z) => { if (fieldN(x, z, 14, 47) < 0.5) return false
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) + Math.abs(dz) <= 2 && riserAt(x + dx, z + dz)) return true
  return false }
// One hill column (false where groundTop is 0). Not for the portals' headwalls and wing walls, the cutting's walls or the
// stair path: those are built solid from y 65 to 64 + groundTop by their own code.
function hill (S, x, z) {
  const t = groundTop(x, z)
  if (t <= 0) return false
  const n = Math.min(groundTop(x + 1, z), groundTop(x - 1, z), groundTop(x, z + 1), groundTop(x, z - 1))
  hillColumn(S, x, z, 64 + t, 64 + n, t - n >= 4 || nearRiser(x, z))
  return true
}
// The y of the top block of the cutting's retaining walls (x 429..430 west, 467..468 east; inCutting(z) only): as high as
// the hill beside them, at least 1 over the walkway, never above capY.
const retainY = (z, west) => Math.max(Math.floor(standY(z)) + 1, Math.min(capY(z), 64 + groundTop(west ? 428 : 469, z)))

// ---- props shared by the modules (S = the module's clipped setter, y0 = the ground block's y) ------------------------
// Town street lamp (a cobra-head): a diorite_wall post y0+1..y0+10, a smooth_quartz cap, an arm of top slabs reaching 3
// cells toward (dx, dz) at y0+11, and a sea_lantern head hanging under the arm's end.
function streetLamp (S, x, z, dx, dz, y0 = 64) {
  for (let y = y0 + 1; y <= y0 + 10; y++) S(x, y, z, 'diorite_wall')
  S(x, y0 + 11, z, 'smooth_quartz')
  for (let k = 1; k <= 3; k++) S(x + dx * k, y0 + 11, z + dz * k, 'smooth_quartz_slab[type=top]')
  S(x + dx * 3, y0 + 10, z + dz * 3, 'sea_lantern')
}
// The prison's lamp (the approach road keeps it): a polished_blackstone_wall pole, 3 ochre froglights under slabs.
function prisonLamp (S, x, z, axis = 'x', y0 = 64) {
  for (let y = y0 + 1; y <= y0 + 7; y++) S(x, y, z, 'polished_blackstone_wall')
  for (let k = -1; k <= 1; k++) {
    const lx = axis === 'x' ? x + k : x, lz = axis === 'x' ? z : z + k
    S(lx, y0 + 8, lz, 'ochre_froglight[axis=y]'); S(lx, y0 + 9, lz, 'polished_blackstone_slab[type=bottom]')
  }
}
// A Jailbreak pine: a spruce trunk and 3 stacked cones of persistent spruce leaves (radius 4, 3, 2), tall 12..18.
function pine (S, x, z, tall = 14, y0 = 64) {
  const t = Math.max(12, Math.min(18, tall)), tiers = [[0.25, 4], [0.5, 3], [0.72, 2]]
  for (let y = y0 + 1; y <= y0 + t - 2; y++) S(x, y, z, 'spruce_log[axis=y]')
  for (const [f, r0] of tiers) {
    const yb = y0 + 1 + Math.round(t * f), hgt = Math.round(t * 0.32)
    for (let k = 0; k < hgt; k++) {
      const r = r0 * (1 - k / hgt) + 0.4
      for (let dx = -r0; dx <= r0; dx++) for (let dz = -r0; dz <= r0; dz++) if ((dx || dz) && dx * dx + dz * dz <= r * r) S(x + dx, yb + k, z + dz, 'spruce_leaves[persistent=true]')
    }
  }
  S(x, y0 + t - 1, z, 'spruce_leaves[persistent=true]'); S(x, y0 + t, z, 'spruce_leaves[persistent=true]')
}
// A round tree (the prison's oak): a trunk under a ball of persistent oak leaves.
function oak (S, x, z, y0 = 64) {
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) {
    if (dx * dx + dy * dy + dz * dz > 10.5) continue
    S(x + dx, y0 + 6 + dy, z + dz, 'oak_leaves[persistent=true]')
  }
  for (let y = y0 + 1; y <= y0 + 5; y++) S(x, y, z, 'oak_log[axis=y]')
}
function shrub (S, x, z, y0 = 64) {
  const s = h(x, 1, z) < 50 ? 'oak_leaves[persistent=true]' : 'azalea_leaves[persistent=true]'
  S(x, y0 + 1, z, s)
  if (h(x, 2, z) < 50) S(x + 1, y0 + 1, z, s)
  if (h(x, 3, z) < 50) S(x, y0 + 1, z + 1, s)
  if (h(x, 4, z) < 40) S(x, y0 + 2, z, s)
}
// ---- end COMMON ----
```

## 10. Modules for parallel builders

### 10.1 The split

Each module owns exactly the columns `ownerOf(x, z)` gives it. Regions can't overlap, and the build order doesn't matter.

| Module | File | Region | Contents | Block budget |
|---|---|---|---|---|
| `approach` | `town/approach.js` | z 471..728 (x 120..770) | road, taper, climb, cutting, tunnel, portals, descent, ridge, river's north branch and culvert, bridge, welcome sign, lamps, pines, grass | ≤ 650K |
| `streets` | `town/streets.js` | `inStreet` cells, z ≥ 729 | asphalt, lines, sidewalks, curbs, corners, circle, crosswalks, stop bars, traffic lights, stop signs, lamps, power lines, name signs, manholes, bins | ≤ 120K |
| `land` | `town/land.js` | the rest of z ≥ 729 | river's west branch and bend, lake, beach, hills, turbines, water tower and its stairs, park, pines and oaks, orange patches, grass | ≤ 520K |
| `gunshop` | `town/gunshop.js` | `BOX.gunshop` | 6.1 | ≤ 80K |
| `donut` | `town/donut.js` | `BOX.donut` | 6.2 | ≤ 60K |
| `garage` | `town/garage.js` | `BOX.garage` | 6.3 | ≤ 30K |
| `gas` | `town/gas.js` | `BOX.gas` | 6.4 | ≤ 50K |
| `shops` | `town/shops.js` | `BOX.shops` | 6.5 | ≤ 60K |
| `dealer` | `town/dealer.js` | `BOX.dealer` | 6.6 | ≤ 90K |
| `houses` | `town/houses.js` | `BOX.houses` (the 12 plots) | section 7 (one parametric kit, two specials) | ≤ 120K |
| `safehouse` | `town/safehouse.js` | `BOX.safehouse` | 6.8 | ≤ 30K |
| `scrapyard` | `town/scrapyard.js` | `BOX.scrapyard` | 6.9 | ≤ 40K |
| `pawnshop` | `town/pawnshop.js` | `BOX.pawnshop` | 15.4 (2026-10-21) | ≤ 25K |
| `poolhall` | `town/poolhall.js` | `BOX.poolhall` | 15.5 (2026-10-21) | ≤ 30K |

The whole town is about 1.9M blocks at most, against 0.4M for the prison. At 48×48 a piece, that's about 250 pieces.

The two terrain budgets were 400K and 300K. Measured with the plan's own heights:
- `approach`: hill shells 339K, the river's north branch 124K (each water column also clears y 61..64), about 420 pines at about 215 blocks each, plus about 75K for the corridor, tunnel, portals, walls and bridge;
- `land`: hill shells 215K, the river and the lake 187K, about 290 pines, plus about 30K for the turbines, tower, park and oaks.

**Shared rules:**
- Everything a module needs from another (driveways, the river, road levels, street cells, every hill's height) is in COMMON. No module requires another.
- `approach` and `land` build every hill column with `hill(S, x, z)` and nothing else, and never change a hill's height in their own code. A column that `groundTop` gives a height but that a module builds some other way (the portals, the cutting's walls, the stair path) is built solid from y 65 to `64 + groundTop`, so its neighbours' shells close against it.
- Keep trees and tall things at least 4 blocks from your region's edge, so `S` never cuts them off.
- A lot or driveway meets the sidewalk exactly at a `DRIVEWAYS` cut.

### 10.2 Module file pattern

```js
'use strict'
// <module>: what it builds (tools/build/town/PLAN.md section <n>).
// ---- COMMON ... (section 9, verbatim) ... ---- end COMMON ----
const MOD = 'gunshop'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s) }
module.exports = (b = new (require('../mcstruct').Build)()) => { B = b; /* ...build... */ B = null; return b }
module.exports.labels = [ /* { x, y, z, facing: 'north'|'south'|'east'|'west'|'up', text, color: '#rrggbb', scale };
  optional: brightness ({ sky, block }: the text display's brightness override, for a label with no light near it) */ ]
module.exports.displays = [ /* { x, y, z, item, cmd: <custom_model_data float or string>, yaw, pitch, scale } (guns, donuts, cars, bags);
  optional: damage (the item's damage), unbreakable (true: the unbreakable component), transform ('head' ...: the item_display
  transform, default none), viewRange (view_range, default 1.0 = about 64 blocks); cmd may be left out (no custom_model_data) */ ]
module.exports.points = { /* NAME: [x, y, z, yaw] (section 8.2's spots that live in this module) */ }
module.exports.setup = { regions: [], heists: [], keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [] }
module.exports.gps = { nodes: [/* [id, x, y, z, name] */], links: [/* [a, b] */] } // approach and streets only
```

**Helpers that write:** COMMON's `door` and `bed` call `b.set` directly, so pass them `{ set: S }`, never `B` (for example `door({ set: S }, x, 65, z, 'east')`). Otherwise half a door can land outside your region.

**Labels:**
- Text displays get the tag `town_label` (`LABEL_TAG`), never `jail_label`.
- A label on a block face sits 0.03 off the face plane.
- Always give coordinates with their decimals: a whole number in a command means the block's centre.

**Displays:** item displays, tagged `town_display`. They're summoned later by `town.js displays`, never part of the structure files.

**Blocks to keep out of anyone's reach:**
- cakes, candles, banners, decorated pots, chiseled bookshelves, any `*_shelf`;
- containers, beds, and anything with a menu;
- item frames, paintings, armor stands.

Some blocks need a support that lands in the same 48×48 column, or they need the second paste pass (mcstruct's ATTACHED list):
- wall signs, wall banners, vines, glow lichen;
- wall-mounted lanterns.

Standing lanterns and blocks that sit on the block below are safe.

**Other block rules:**
- Roofs, roof decks, parapet tops, canopy tops and anything else open to the sky above the street never use the six road blocks: black, gray, white and yellow concrete, black and gray concrete powder, and so `MIX.asphalt`, `MIX.deck` and `MIX.white` too. The launch road scan would read them as streets (the same rule as the prison's). Use `smooth_quartz` or `calcite` for white roofs and `gray_terracotta` or `polished_deepslate` for dark ones. Walls under a roof and floors under a ceiling are fine. The approach's slopes add `blackstone`, `polished_blackstone`, their slabs, `smooth_quartz_slab` and `bamboo_slab` to the road-block list (8.3 step 7): keep those off open-sky surfaces at street height (y 62..71) away from the roads too.
- No sand, gravel or concrete powder over air (`MIX.deck` on the bridge).
- Every water block is a source, with a solid or water neighbour at its level on all 4 sides.
- No concrete powder next to water.

### 10.3 `tools/build/town.js` (mirror of jail.js)

```
const MODULES = ['approach', 'streets', 'land', 'gunshop', 'donut', 'garage', 'gas', 'shops', 'dealer', 'houses', 'safehouse', 'scrapyard']
```

- `build()` runs each module into one Build. It skips a module whose file doesn't exist yet, with a warning, so parallel work can be previewed. `TOWN_ONLY=a,b` limits it.
- Run it with `node --max-old-space-size=4096`: about 1.9M blocks in one Build's Map. A later paste should go module by module (`TOWN_ONLY`) or by `--box`.
- It exports `{ build, labels, points, setup, displays, gps }`.

**Commands:**
- `node tools/build/town.js` prints the blocks per module and the bounds.
- `town.js check` exits non-zero on any problem. It checks that:
  - every module's blocks lie in its own columns (`ownerOf`) and in the town box;
  - point names are unique;
  - no setup region leaves the town box;
  - stores don't overlap or touch safe zones, and exits aren't in a safe zone or a heist;
  - car spots are ≥ 6 apart, ≥ 50 from a chop shop, and outside heists and safe zones;
  - keepers and crate stands are inside a safe zone;
  - crate stands and loot cells have 2..3 air above them;
  - each heist region is under 100,000 blocks;
  - every hill column of `approach` and `land` has its top block at `64 + groundTop` (outside the corridor, the portals and the stair path).
  - `town.js check --seal` (slow) also floods air from the sky through the whole build and the world's flat ground. It fails if the flood reaches a cell under a hill column's top: a hollow hill that doesn't close.
- `town.js setup --world jailbreak|world` prints section 8.3's command list with real coordinates. Each line is tagged (G) in game, (C) console, or (L) only once the world is `world`.
- `town.js gps` writes `tools/town-gps-paths.txt`: `dphone path addat <W> ...` lines with ids, then the link lines.

Later only, with the owner's OK:
- `town.js paste [--box x1,z1,x2,z2;...]` calls `place(pb, { name: 'town', world: 'jailbreak' })`, plus a second `place` named `town_late` for wall-mounted blocks.
- `town.js labels` kills `town_label` only, then summons them like jail.js, adding `brightness:{sky:N,block:N}` to the NBT of a label that has `brightness`.
- `town.js displays` does the same for `town_display`.

## 11. Checks every builder runs before handing back (all offline)

```bash
cd "/c/Users/matti/OneDrive/Desktop/Donating Test Server"
SP="/c/Users/matti/AppData/Local/Temp/claude/C--Users-matti-OneDrive-Desktop-Donating-Test-Server/5944d0e9-47cc-4054-88a5-4d1865761078/scratchpad"
tools/node/node.exe "$SP/check-states.js" tools/build/town/<module>.js   # every block state against the 26.1.2 registry
tools/node/node.exe tools/build/render.js tools/build/town/<module>.js "$SP/town-render/<module>" --views top,plan,iso --y 65,70 --px 6
tools/node/node.exe tools/build/render.js tools/build/town/plan-layout.js "$SP/town-render/plan" --views top --px 2   # where your box sits
tools/node/node.exe tools/build/town.js check   # once town.js exists
```

Look at the renders against the wiki pictures in `$SP/wiki`: proportions, colours, the details named in section 6.

Magenta in a render only means render.js has no texture for that name. `check-states.js` is the real check.

## 12. After this run (needs the owner)

1. A paste: `town.js paste`, then `labels` and `displays`.
2. The setup commands (8.3).
3. GPS paths: load `town-gps-paths.txt` after every reload of the prison's file, which clears the world's graph.
4. The phone city scan.
5. DEPLOY.md: the world travels with the build; the setup lines run on Minehut.
6. PLAYTEST checks in the owner's client: the view from the south portal, the bridge, the donut on the roof, both stores robbed, the range, the shops' keepers, the dealer, cars climbing the slab steps and driving the tunnel.

## 13. Defaults chosen (the builders go ahead with these) and questions for the owner

| # | Question | Default built |
|---|---|---|
| Q1 | The Glider Store and Pet Shop are the Gear Shop (gear and tools keepers, a giant tactical helmet on the roof) and the Bag Shop (a giant duffel instead of the dog). OK, or keep the sails and the dog? | Gear Shop with the helmet, Bag Shop with the duffel |
| Q2 | Both the Donut Shop and the gas station's store are robbable stores (difficulty 0, $1,500-2,400 at the register plus $300-600 at a second till, within the $3,000 pool)? | both stores |
| Q3 | Should the shooting range let you shoot (its own region, PvP still off, a closed roof so no bullet leaves)? | usable |
| Q4 | The road climbs into the tunnel and drops into town (built), or stays level the whole way? | climb and drop |
| Q5 | Is the town south of the prison (built) OK, or should it sit east along the highway? | south |
| Q6 | Garage look: the current grey brick with red, or the 2022 navy with yellow? | current |
| Q7 | Water tower: the current lime or the old blue (the prison's is blue)? | lime |
| Q8 | Roof donut: the 2022 "DONUTS" sign box or the 2026 face? | sign box |
| Q9 | Should Mara's Safehouse be the town's base (loot sells there, crate stands on its porch), with the Volcano Base as a second base later? | Safehouse base |
| Q10 | The Scrap Yard (the car-contract Boss and the chop shop) is a Donating addition; Jailbreak's town has none. OK? | built |
| Q11 | Town name: "Mountainside" (Jailbreak's) or your own? | Mountainside |
| Q12 | `nav.sk` refuses POIs outside the main world, so the shops have no locator dots or `/gps` Places, and Mara's routes don't reach them until launch. A one-line change (accept `prison::world` like quests.sk does) would fix it now. OK? | not changed |
| Q13 | The town has no real heist yet; Mara's chapter 2 needs one with a safe for level 5. Build the city's heists before launch, or add a small one to the town? | none yet |
| Q14 | An escapee walks the road on foot: about 600 blocks from the front gate to the Gun Shop, and about 880 to Mara (2.5-3.5 minutes; the highway's 188 blocks east to the N-S road are the prison's). Options: (a) a footpath over the low west ridge with a footbridge into Riverside Park, about 510 to Mara, though it skips the Gun Shop the gameplay plan puts first; (b) a road from the front gate straight south, which needs the prison's `outdoors.js` changed for z 442..470; (c) keep the walk. | keep the walk (c) |
| Q15 | Vic the Fence's Pawn Shop and the Broker's Pool Hall have no storefronts here. Vic's chain and posting bounties in person need them, and hit hunts need the main world anyway. Add two small storefronts later (East Street or Hill Road)? | not built |
| Q16 | The hills are hollow shells, and their dark insides spawn mobs whenever mob spawning is on. Keep `gamerule spawn_mobs false` in this world on Minehut too (the local test world already has it)? | off |
| Q17 | Jailbreak's town has about 22 houses; this plan has 12 plus the Safehouse, on roomy plots. There's room for more later on Hill Road's south side (x 414..455) and around Birch Court's circle. Add them in a later run? | 12 |
| Q18 | The Town Garage's red stripes: three (y 66, 68, 70: they stripe most of the wall), or two (y 68 and 70 only: garage_new's compact band at about 45-75% of the wall, plain brick under it)? | three |

## 14. Owner's answers (2026-10-21)
- Next: wire the 8 built parts first (shopkeepers, safe zones, GPS paths, stores), before building the rest.
- Deaths: every death respawns in the prison, free players in town too (current rule kept).
- Q14: keep the walk, but add a small shop in front of the prison with a little parking lot where small vehicles (bikes) spawn; a player steals one with a quick-time event (like the car-theft lockpick minigame).
- Q15: build Vic's Pawn Shop and the Broker's Pool Hall in town (with the dealer, houses, Safehouse and Scrap Yard).
- Builds are practical, not roleplay: build for how players use a place (walking in to rob it), no props nobody uses. The Donut Shop's drive-thru is gone (its lane, windows, canopy, till, menu board and Main's driveway at z 829..838): a lawn, one south window and a single register holding the $3,000 pool (Q2's second till dropped there; the gas store keeps its lottery till).

## 15. The cloud run (2026-10-21): fuel, the bike shop, the Pawn Shop, the Pool Hall and the four unbuilt modules

The owner, 2026-10-21, after the local session's list (wire the 8 built parts, the bike shop, the 6 missing buildings, the gas
station's trim): "plans, scripts, builds, then local checks in the end"; on the gas station: "keep as built, enable fuel for
cars, and make adding fuel like an actual gas pump (grab pump, fill it into car, wait until full, pay money, different cars
have different size tanks)". A cloud session wrote everything in this section (plans, Skript, DonatingPhone Java, build
modules); nothing of it has run on a server or in the client. The local session builds, pastes, wires and tests it
(`handoff/2026-10-21/README.md`). The wiring of the 8 built parts (SETUP.md parts A and B) needs the server and stays the
local session's.

Offline checks the cloud ran: `town.js check --seal --registry` (a 26.1 block registry made from minecraft-data), each module's
renders (block colours from the 26.1 textures), and the prison's `jail.js check`. The wiki pictures were out of reach
(network policy), so the looks follow this plan's text and the wiki's descriptions; compare them with the local wiki pictures.

### 15.1 COMMON changes (every town module's copy)

- `BOX` gets `pawnshop: [[579, 940, 614, 985]]` and `poolhall: [[418, 1129, 479, 1172]]`.
- Nothing else in COMMON changes. `ownerOf` gives those columns to the two new modules; `builtD` counts them, so the hills
  near them (E3's west foot, T1's west flank) stay 3+ blocks away.
- `town.js`: `MODULES` adds `pawnshop` and `poolhall`; `SETUP_KEYS` adds `pumps` (15.2) and setup prints them.
- `streets` GPS: node 1055 EAST_PAWN (568.0, 65, 962.5) on East Street splits the link 1025-1026 (1025-1055-1026), for the
  Pawn Shop's door.

### 15.2 Fuel (fuel.sk, DonatingPhone CarStats, garage.sk, the gas station's pumps)

MTVehicles 2.5.x keeps fuel per car as a level 0..100 and, while a driver holds the pedal, takes `fuelMultiplier ×
fuelUsage` a tick (its VehicleMovement.putFuelUsage; checked in its source); at under 1 the car doesn't move. Its own fuel
bar (a boss bar, "63% Fuel") shows while driving. Donating turns it on and adds tanks, pumps and prices:

- **Switches:** MTVehicles `config.yml` `fuelEnabled: true` (`fuelMultiplier: 1`); every family in `vehicles.yml`
  `benzineEnabled: true` (make-car-wraps.js writes it for the families it adds). A car made before keeps its own
  `benzineEnabled false` in vehicleData.yml: garage.sk turns it on (and sets the model's usage) every time its owner gets
  in, through DonatingPhone `/dphone carfuel <plate> enabled true usage <u>`. core.sk `fuel::enabled` false stops all of
  it in Donating's scripts (cars then run on MTVehicles' own setting).
- **Tanks** (PROPOSAL, core.sk `car::<id>::tank` liters and `car::<id>::burn` minutes of pedal per full tank):

  | Car | Tank | Burn | Usage a tick u = 100 / (burn × 1200) | A full tank at $25/L |
  |---|---|---|---|---|
  | Sedan | 50 L | 12 min | 0.00694 | $1,250 |
  | Sport Sedan | 55 L | 11 min | 0.00758 | $1,375 |
  | Jeep | 70 L | 11 min | 0.00758 | $1,750 |
  | Sports Car | 60 L | 9 min | 0.00926 | $1,500 |
  | Hotrod | 65 L | 8 min | 0.01042 | $1,625 |
  | SUV | 90 L | 12 min | 0.00694 | $2,250 |
  | Viper | 18 L | 10 min | 0.00833 | $450 |
  | Riviera | 75 L | 10 min | 0.00833 | $1,875 |
  | Apex | 80 L | 7 min | 0.01190 | $2,000 |
  | Crate cars | as their family (Vandal = Sports Car, Specter = Sport Sedan, Overclock = Hotrod) | | | |
  | Stolen bike (15.3) | 12 L | 8 min | 0.01042 | $300 |

  The level in liters is L = level / 100 × tank. A contract car uses its model's tank (it's scrapped within 10 minutes).
- **The pump** (fuel.sk; the gas station's 12 pumps registered with `/dfuel pumpat`, lines from the gas module's
  `setup.pumps`):
  1. **Grab the nozzle:** right-click a pump (any block of its box). Hotbar slot 9 (the phone) becomes the nozzle (a
     tagged item like the car key) and is selected; a hose of dust particles runs from the pump's holster to the player.
     Refused: in a car, combat-tagged or wanted, the pump busy (someone holds its nozzle), dead, in a heist.
  2. **Fill:** with the nozzle in hand, right-click a car (any of its stands) within the hose's reach (`fuel::hose` 6
     blocks from the pump) that has nobody in the driver's seat and fuel turned on. The pump runs: `fuel::flow` 4 L a
     second, paid as it flows (each second's liters × `fuel::price` $25, all or nothing: the pump stops when the money
     runs out), a meter over the pump ("PUMP 5 · 23.4 L · $585.00", a text display everyone sees), a fill sound, the
     action bar ("⛽ 38.2 / 50 L · $585 · right-click the car to stop").
  3. **Full:** it clicks off by itself at 100% ("FULL"), or stops when the player right-clicks the car again, walks more
     than 4 blocks from the car, someone gets into the car, or the nozzle goes back.
  4. **Pay:** every second's fuel is paid as it flows (a real pump's meter); hanging up prints the receipt ("Pump 5:
     23.4 L, $585").
  5. **Hang up:** right-click the pump again. The nozzle also goes back by itself when the player selects another slot,
     walks more than `fuel::hose` + 2 from the pump, gets into a car, is combat-tagged, dies, quits or teleports, and
     after `fuel::idle` 60 s with no fuel flowing. Slot 9 is the phone again.
- **The garage's tank service** (a car in the garage, not out): its options page gets "Refuel" at `fuel::garage-factor`
  2× the pump's price, instant (a second click from $1,000 up), only at a garage site when the map has one (like
  repaints). That's the way back for a car that ran dry: send it back (free), refuel it there, call it out again.
- **Warnings:** at `fuel::low` 15% a chime and "Low fuel" on the action bar (once a ride); empty: "Out of fuel: /garage
  can send it back and refuel it". The chase camera's action bar shows "⛽ 63%".
- **New cars** come full (MTVehicles makes every new car at 100); crate cars and contract cars too.
- **Players:** `/fuel` (the driven or nearest own car's fuel, liters, tank and the price to fill; pins the nearest pump on
  the GPS). **Staff:** `/dfuel pumpat|remove|list|dump`, `/dfuel car <plate> [level]`, `/dfuel info <player>`. Log:
  plugins/Skript/logs/fuel.log.

### 15.3 The bike shop and stolen bikes (prison module `bikeshop`, bikes.sk)

The owner, 2026-10-21 (Q14): "keep the walk, but add a small shop in front of the prison with a little parking lot where
small vehicles (bikes) spawn; a player steals one with a quick-time event (like the car-theft lockpick minigame)".

**The build** (`tools/build/jail/bikeshop.js`, a sixth prison module; jail.js `MODULES` adds it and outdoors.js's region
leaves its box out):

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Box | x 304..347, z 398..415 (between the front fence z 396 and the highway's sidewalk z 416..418, east of tower T11's deck x 290..302, west of the oak whose leaves reach x 348) | y 62..90 | |
| Lot | x 305..331, z 399..414, asphalt | y 64 | open to the sidewalk on the south (z 415 meets z 416), a dropped curb across it at x 316..321 (outdoors.js `crossing`); 4 stalls (white lines at x 308, 313, 318, 323, 328 over z 402..410), wheel stops at z 402 |
| Shop | x 333..346, z 400..413 (a walk at x 332) | walls y 64..71, roof y 72 | west onto the lot: an open doorway x 333, z 406..407 (iron doors held open); a roll-up door (iron trapdoors, closed) at x 333, z 409..412 |

- **Look:** a small corrugated workshop: light grey walls (`light_gray_concrete` with `iron_trapdoor`-ribbed bands), an
  orange stripe at y 69, a dark roof (`polished_deepslate`), a "BIKES" sign (orange board, white label) over the
  doorway, a tyre sign on the corner. Inside: a workbench look (no blocks with a menu: `stripped_spruce_wood` and
  `iron_trapdoor`s), a tyre rack (`blackstone`), a parts wall.
- **The prison's side:** outdoors.js leaves the box out of its own(), drops the oak at [320, 406] and the cypress at
  [310, 404] (inside the box), and the module clears y 65..80 of its box (the first paste put them in the world).
  `jail.js check` passes (2026-10-21).
- **Spots:** the bikes stand at BIKE_1..4 = (310.5 | 315.5 | 320.5 | 325.5, 65, 406.5), yaw 0 (facing south, out to the
  highway). The GPS point BIKE_SHOP (320.5, 65, 412.5); tools/make-jail-gps-paths.js walks LOT_EXIT → BIKE_SHOP.
- **Setup** (console): `dbike spotat jailbreak 310.5 65 406.5 0`, `... 315.5 ...`, `... 320.5 ...`, `... 325.5 ...`.

**The bikes** (bikes.sk; PROPOSAL numbers in core.sk `bike::*`):
- **Parked bikes** are item displays of the bike model at each free spot (tag `donating_bike`, not persistent, made again
  when the chunk loads or after a restart), each with an unresponsive interaction box (right-click to steal). The model:
  MTVehicles' motorbike (the Viper's shape) in its own wrap **Scrapper** (rusty orange primer; `tools/car-wraps.json`,
  made by make-car-wraps.js, never rolled in crates: core.sk `carwrap::scrapper::retired` true), so a stolen bike never
  looks like a Viper anyone paid for. Until make-car-wraps.js has run, bikes.sk has no bike look and parks none (/dsetup
  says so).
- **Stealing:** right-click a parked bike: the hotwire minigame (contracts.sk's lock-picking menu, "Hotwire the bike":
  `bike::qte-hits` 3 in a row, the marker a slot every `bike::qte-step` 3 ticks). No tool needed (escapees have
  nothing). `bike::max-fails` 3 misses sound the bike's alarm and lock that bike for that player for `bike::alarm-lock`
  15 s. Getting hurt or walking 4 blocks away closes it.
- **The ride:** the display goes; a real MTVehicles bike (the Scrapper motorbike variant) is made at the spot, owned by
  the thief (only they drive; one seat), slowed to `bike::stats` "0.62|0.014|8" (top speed, acceleration, steering:
  DonatingPhone `/dphone carstat`), with a tank of `bike::fuel-min` 40 .. `bike::fuel-max` 100% fuel (15.2), and the
  thief is put in it.
- **The end:** the bike is scrapped (despawned and deleted) when it stands with no rider for `bike::abandon` 60 s, after
  `bike::max-ride` 20 min (the rider is put out: "The bike died"), when the thief logs out, dies, steals another bike or
  gets into one of their own cars, and when it's taken into a heist (garage.sk's tow rules: not allowed). Its spot gets a
  new bike `bike::respawn` 120 s after it was stolen. One bike at a time per player; a restart scraps every stolen bike
  (`{bike::plates::*}`, saved).
- **Who:** anyone free (escaped prisoners and free players), wanted or not (a getaway), passive or not; never staff in
  creative; never from inside a heist.
- **Staff:** `/dbike spotat <world> <x> <y> <z> <yaw>`, `spot add` (where you stand), `remove <n>`, `list`, `dump`,
  `reset` (every spot gets a bike now). Log: plugins/Skript/logs/bikes.log.

### 15.4 Vic's Pawn Shop (module `pawnshop`)

Q15 answered (2026-10-21): build it in town. Box x 579..614, z 940..985, on East Street's east side, across from the shops'
rear lot; E3's satellite-dish hill stays 30+ blocks east.

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Forecourt | x 579..584, z 941..984, paved (`light_gray_concrete`, flush with East Street's sidewalk) | y 64 | |
| Pawn Shop | x 585..608, z 948..978 | walls y 64..72, flat roof y 73 under a parapet y 74 | west; open doorway x 585, z 962..963, y 65..67 (iron doors held open inward), a transom y 68..69 |
| Side and back yard | the rest of the box: grass, a fence on its east and south edges, trees | | |

- **Look:** dark red brick (`bricks` 70, `red_nether_bricks` 15, `mud_bricks` 15) on a `polished_blackstone` base course; a
  mustard sign band (`yellow_terracotta`) at y 70..71 with "PAWN" (big) and "VIC'S" over the door; two display windows
  (x 585, z 951..958 and 967..975, y 66..69) behind `iron_bars` (x 584) with a roll-up shutter box over each
  (`iron_trapdoor`s at y 70); the pawnbroker's three gold balls hanging from a bracket at the north-west corner; the roof
  `gray_terracotta` with `polished_blackstone_brick_wall` parapets and an AC unit.
- **Inside:** a checker floor (`polished_andesite` / `polished_basalt`); a glass-fronted counter at x 597, z 952..973
  (`glass` over `smooth_stone`, a `dark_oak_slab` top at y 66) with a gap at its north end; Vic behind it at (600.5, 65,
  962.5), yaw 90 (facing the door); shelving and a pegboard on the back wall (x 607) and the side walls with goods as
  item displays (`displays`: clocks, gold, jewels, a guitar look) and in both windows; hanging lanterns.
- **Region:** `safe_pawnshop` 579 63 940 .. 614 85 985 (the whole box) (passthrough allow, weapon-shoot deny).
- **Giver:** `dquest addatw fence W 600.5 65 962.5 90 Pawn Shop` (Vic, quest kind `fence`).
- **GPS:** door node 1054 PAWN_SHOP (582.5, 65, 962.5) linked to 1055 EAST_PAWN (15.1).

### 15.5 The Broker's Pool Hall (module `poolhall`)

Box x 418..479, z 1129..1172: across Hill Road from where Main Street ends, so the hall closes Main's view to the south.
T1's stair path (x 498..500) stays 19 blocks east.

| Part | Box | Height | Facing / doors |
|---|---|---|---|
| Forecourt | x 418..479, z 1129..1137: paving from Hill Road's sidewalk to the door, two planters, lamps | y 64 | |
| Pool Hall | x 431..466, z 1138..1165 | walls y 64..74, roof y 75 under a parapet y 76 | north; open doorway x 447..450, z 1138, y 65..67 (iron doors held open inward at x 448..449, sidelights at 447 and 450), a transom y 68..69 |
| Back | z 1166..1172: grass, the AC units, a fence | | |

- **Look:** a night-club box in black and green: `polished_blackstone_bricks` walls with a `green_concrete` band at y 66
  and a lit green neon line (`lime_stained_glass` over `verdant_froglight`) at y 72; a big sign over the door: an
  8-ball (a black disc with a white circle and a black "8" label) beside "POOL" in lime letters; dark green awnings
  (`green_terracotta` stairs) over the windows; tall windows (`green_stained_glass_pane`) either side of the door; a
  `gray_terracotta` roof.
- **Inside:** dark wood (`dark_oak_planks` floor, a `dark_oak_planks` wainscot to y 66, `green_terracotta` above); four
  pool tables (3 × 6: a top slab of `dark_oak_slab` at y 65 with `green_carpet` on it, `black_carpet` pockets, fence
  posts as legs) at x 435..437 and 460..462, z 1143..1148 and 1153..1158, each under a hanging lantern pair; the
  Broker's corner at the back: a raised platform (`dark_oak_slab`, z 1159..1164, x 443..454) with a desk and two
  armchairs, the Broker at (448.5, 65.5, 1161.5) yaw 180 (facing the door); a "WANTED" board on the back wall (labels).
- **Region:** `safe_poolhall` 418 63 1129 .. 479 90 1172 (passthrough allow, weapon-shoot deny).
- **Giver:** `dquest addatw hits W 448.5 65.5 1161.5 180 Pool Hall` (the Broker, quest kind `hits`).
- **GPS:** door node 1056 POOL_HALL (448.5, 65, 1131.5) linked to 1013 MAIN_HILL.

### 15.6 The four modules section 6 planned (dealer, houses, safehouse, scrapyard)

Built from 6.6..6.9, 7 and 8 as written, with the owner's "practical, not roleplay" rule: no rooms or props nobody uses (the
houses stay locked shells with blinds; the dealership's upper floors keep their car displays because players come to look at
cars; the scrap yard keeps its wrecks because they're the yard). Their setup lines (regions, keepers, givers, crate stands,
car spots, the chop shop, garages, POIs, the wall map, the leaderboards) are the modules' `setup` exports.
