# Rising City: the site plan for the three heists east of the prison

Written 2026-10-27 from the judge's decision (`scratchpad/city/decision.md`, 2026-10-26): the Jewelry Store, the Bank and the Museum, Jailbreak's three city heists, on Main Avenue east of the prison.

This is a plan. Nothing has been pasted.

**Rules for the builders of this run:**
- Write only under `tools/build/city/` and `tools/build/city.js`.
- Don't paste anything.
- Don't send RCON commands. That includes `jail.js paste`, `town.js paste` and every `labels` / `displays` command.
- Don't run bot scenarios, don't touch Skript files, the prison modules (`tools/build/jail/*`) or the town modules (`tools/build/town/*`), and don't commit.
- Every number is a PROPOSAL for the owner (section 12). Each heist runs at launch on today's heists.sk, loot.sk, traps.sk, cops.sk and bikes.sk alone; M1-M3 (section 10) are later layers.

The numbers in the tables are the truth. Section 8 is the shared code every module copies verbatim, and `tools/build/city/plan-layout.js` draws all of it (streets, module boxes, keep-free lots, footprints at roof height, regions in red at y 99, spots in gold at y 100). Render it with:

```
tools/node/node.exe tools/build/render.js tools/build/city/plan-layout.js <out> --views top --px 2
```

Add `CROP=x1,z1,x2,z2` for a close look (for example `CROP=590,350,640,420` for the Jewelry Store).

## 0. The city in one paragraph

Main Avenue carries the prison highway's profile on east from the last prison lamp (x 476) to a roundabout at x 810. Walking east a robber passes the three heists in level order: the **Jewelry Store**'s blue glass corner at Bank Street (level 5, not advanced), the green **Bank** tower one block north across 2nd Street (level 20, advanced), and the **Museum**'s pediment alone on a sandstone mesa at the avenue's end (level 45, advanced: the finale). It sits here because that is Jailbreak's own layout (jewelry and bank on one street, the museum alone on a hill), because the land east of the prison and north of the town ridge (z ≤ 470) is free, and because the spacing keeps chases apart: Jewelry-Bank centres 94 (the Jewelry has no alarm), Bank-Museum 262 (a Bank chase never reaches the Museum). 2nd Street is the back route that links all three; Bank Street north of z 280, x > 930 and a base lot stay free for later.

## 1. Frame, ground and heights

| Thing | Value |
|---|---|
| World | `jailbreak` now (`world` at launch) |
| City box | x 481..940, z 226..470, y 44..110 (`CITY`) |
| Ground | flat grass, top block y 64 (`GROUND_Y`); feet stand at y 65 |
| Floor convention | "floor y" is the floor block; feet stand at floor + 1 |
| Laser heights | low = feet + 0.4, mid (duck) = feet + 1.0 (alarm) or + 1.65 (duck), as written per trap |
| Yaw | 0 S, 90 W, 180 N, −90 E |
| Tags | text displays `city_label`, item displays `city_display` |

Module boxes `[x1, z1, x2, z2]` (the module owns every column inside, y 44..110):

| Module | Box | Contains |
|---|---|---|
| `jewelry` | 596, 356 .. 639, 415 | the store, its alley (z 356..373), the fire escape, the forecourt |
| `bank` | 560, 280 .. 639, 321 | the tower, Hatch Plaza (x 560..590), the front plaza (x 629..639), the tunnel and shaft |
| `museum` | 820, 296 .. 920, 400 | the mesa, the plaza, the terraces, the drain tunnel (z 296..329) |
| `streets` | every other city column | section 3 |
| (free) | 506, 356 .. 550, 410; 931, 226 .. 940, 470; 664, 226 .. 930, 279 | nobody writes here: the base lot, the power-plant strip, the casino blocks |

Heist regions `[x1 y1 z1 .. x2 y2 z2]`:

| Region | Box | Size |
|---|---|---|
| `heist_jewelry` | 598 56 374 .. 634 97 414 | 37 × 42 × 41 = 63,714 |
| `heist_bank` | 595 47 280 .. 630 102 321 | 36 × 56 × 42 = 84,672 |
| `heist_museum` | 841 60 330 .. 898 97 371 | 58 × 38 × 42 = 92,568 |

No region overlaps another or touches a safe zone. No exit, cop spot or bike lies in a region.

## 2. Map

```
 x: 481 490-505  560-590    597-628  640-663                776-787   820 ......... 920  931-940
z 226                                 | Bank |  ######## kept free (casino, later) z 226..279 ######## |power
z 280      .    [Hatch Plaza]  [BANK]  | St.  |            ~~~ storm channel z 280..295, floor y 59 ~~~   |plant
z 296   W  .== Hatch Lane ==== 595..630|      |            |leg|   [ MESA x 820..920, z 300..400, y 72 ]|kept
z 321   e  .  (z 296..304)    region   |      |            |up |   [ MUSEUM region 841..898 x 330..371 ]|free
z 340   s ===================== 2nd Street z 340..355 ===============/     plaza z 372..400
z 356   t  [base lot 506..550] alley z 356..373 (bikes 601..605)            ramp z 402..409 (x 830..894)
z 374   .   (kept free)      [JEWELRY 598..634 x 374..414]   |            spur 812..829 x 402..414
z 416  ------- sidewalk -------------------------------------------- ( ROUNDABOUT centre 810, 430 )
z 419  ======== MAIN AVENUE x 481..789, z 419..441 (dash z 430) =====(  r 20, island 8, walk 3   )
z 442  ------- sidewalk; z 445..470 parking bays (no buildings; the town ridge foot is at z 482)
```

The render (`plan-layout.js`) is the exact version of this sketch.

## 3. Streets (module `streets`: every column `ownerOf` gives `streets`; `streetCell(x, z)` says what goes there)

### 3.1 Layout

| Street | Box | Profile |
|---|---|---|
| Main Avenue (`AVE`) | x 481..789, z 419..441 | asphalt; white edge lines z 420 / 440; yellow dash z 430 (x % 6 < 3); sidewalks z 416..418 and 442..444 with curbs on z 418 and 442; parking strip z 445..470 with white bay lines every 5 x (z ≤ 452) |
| Roundabout (`RB`) | centre 810, 430 | grass island d < 8, asphalt 8..20, sidewalk 20..23; drawn after the avenue so its ring never cuts the avenue's end |
| Spur (`SPUR`) | x 812..829, z 402..414 | asphalt from the roundabout's NE to the ramp foot |
| Ramp road (`RAMP`) | x 830..894, z 402..409 | climbs 1 block every 8 (`rampFeet(x)` = 65 + floor((x − 830) / 8), 73 from x 887); curb z 401, stone-brick wall z 410 to the ramp's height; joins the plaza at y 72 |
| Bank Street (`BANK_ST`) | x 640..663, z 230..415 | asphalt x 643..660, yellow dash x 651..652, sidewalks with curbs on x 642 / 661; crosses the avenue sidewalk as asphalt |
| 2nd Street (`SECOND`) | z 340..355, x 490..787 | asphalt z 343..352, dash z 347..348, curbs z 342 / 353 |
| West Street (`WEST_ST`) | x 490..505, z 296..415 | asphalt x 493..502, curbs x 492 / 503 |
| Hatch Lane (`HATCH_LANE`) | x 506..559, z 296..304 | polished andesite (`MIX.plaza`), never concrete; into Hatch Plaza (bank module) |
| Storm channel (`CHAN`) | x 776..930, z 280..295 | floor y 59 polished andesite; stone-brick walls to y 64 on z 280, x 776, x 930 and z 295 (east of the leg), iron-bar rail at y 65; the **culvert mouth** x 868..870 in wall z 295 stays open (no rail, no wall) |
| Channel west leg (`LEG`) | x 776..787, z 296..339 | rises from y 59 to y 64 (`legFloor(z)`: 59 to z 296, + 1 every 8, 64 from z 336) into 2nd Street's east end; walls on x 776 and 787 |

`drainFloor(z)` (59 + floor((z − 294) / 7)) is the museum's drain tunnel floor, in COMMON so the channel and drain meet: the museum module builds the drain, the streets module only leaves the mouth open.

### 3.2 Surface and furniture

- Asphalt `MIX.asphalt`, lines `white_concrete` / `yellow_concrete`, sidewalks `MIX.walk` (light gray), curbs `smooth_stone_slab` at top + 1, island grass with a shrub ring, lane and channel floor `MIX.plaza`.
- A 4-light junction at Bank Street × Main Avenue; stop bars at 2nd Street × Bank Street and West Street.
- Street lamps (`streetLamp`) every 24 blocks on both avenue sidewalks, on Bank Street and 2nd Street; none inside a module box. Street trees (`oak`, `shrub`) in the parking strip every 10 between bays.
- A "Rising City" sign on the roundabout island (a text-display label, `city_label`), and the POI there (section 7.6).
- The ramp wall gets a lamp at x 846, 862, 878. The channel rail is iron bars on the wall tops.

### 3.3 Rules

- Every street surface at y 64 is a road block only where the GPS should read a street (asphalt and lines); plazas, the lane, the channel and the ramp's top are `MIX.plaza` / stone (section 9.4).
- Nothing the streets module writes is inside a module box or a kept-free box (`own` refuses it anyway).

## 4. The Jewelry Store (module `jewelry`; heist `jewelry`, difficulty 2, level 5, not advanced)

### 4.1 Theme

Jailbreak's black-framed blue-glass corner store and its vertical smash-and-grab: smash in at the red X, empty the showroom and basement cases, climb two laser floors, leave over the roof by one of three hut doorways or down the fire escape to the bikes. Grafted on: Payday's one-Duffel stone (the **Blue Heart**, $6,000, in the manager's safe at the top), a counter turret over the showroom (sneak along the walls), a blinking 3-beam **VIP curtain** at the office door, and a fire escape into an alley with stolen bikes. No cops: the threat is traps, the clock and other robbers.

### 4.2 Footprint and levels

- **Building** x 600..631, z 376..411 (32 × 36), the NW corner of Main Avenue × Bank Street. Region adds a 3-block polished-andesite forecourt south (z 412..414) and east (x 632..634) and the roof landing z 374..375.
- **Alley** x 598..639, z 356..373, polished andesite (`MIX.plaza`), floor y 64: the fire escape's foot and three bikes.

| Level | Floor slab y | Interior y |
|---|---|---|
| Basement | 57 | 58..63 |
| Ground (showroom) | 64 | 65..71 |
| Obby 1 "Layered Laser" | 72 | 73..78 |
| Obby 2 "Moving Lasers" | 79 | 80..85 |
| Final floor (low) | 86 | 87..90 |
| Roof | 91 | parapet 92; huts 92..95, hut roofs 96 |

- **Outside**: polished_blackstone piers at the corners and every 6 blocks with blackstone floor bands; light_blue_stained_glass curtain walls south and east (the obby beams show through); a 5 × 5 cyan diamond (cyan glass, prismarine, sea lantern) at the SE top corner; a top band of iron bars over andesite; two red_terracotta 3 × 3 X marks on the forecourt under the X window; a fake glass double door beside it; a smooth_quartz awning. North and west walls blackstone with small windows. Roof smooth_quartz with polished_andesite ribs, calcite parapet, huts calcite and smooth_quartz (preview: hut roofs gray_terracotta at y 96).
- **Inside, ground floor**: blue carpet, dark pillars, a sea-lantern light box behind white glass. Cashier counter x 609..622 at z 379 (north wall). Five islands, each a 1 × 4 polished_deepslate plinth at y 65 (the pile cells), 2 air above, a permanent glass lid at y 68, glass-pane ends, the smash front 4 × 2 facing the centre aisle (z 384..386). Main stair NE x 628..630 up to obby 1's east end; back stair NW x 601..603 down to the basement.
- **Basement**: ring counter on the west wall (front x 603, z 390..399), watch counter on the east wall (front x 628, z 391..398), the aisle between; the **workshop** x 610..621, z 403..410 with the small safe G9 in its south wall.
- **Obby 1**: crossed east to west. Partition x 615..616 (gap z 405..410). Twelve 1-high stepping blocks (full light_blue_stained_glass at y 73; feet at y 74 clear the low beams): east half (618, 385), (623, 386), (629, 391), (623, 393), (618, 396), (624, 401); west half (612, 401), (607, 403), (603, 395), (609, 393), (604, 386), (610, 385). Mid-floor landing with P8 at x 615..616, z 407..408.
- **Obby 2**: crossed west to east; five pillar pairs with floor-to-ceiling blinking beams; landing P9 at x 622..623, z 389..390; exit landing NE with the **fuse box** prop at (630, 81, 389) (M2; a plain breaker prop until then).
- **Final floor** (4 high): two switchback flights A and B at x 611..613 (duck lasers T22-T23) up to the huts; the landing P10 at x 624..625, z 380..381; the **manager's office** in the south half behind a glass-pane wall at z 398 whose 2-wide doorway x 615..616 is the VIP curtain; the office wall safe G10 at x 615..616, z 405 in a polished_blackstone frame; a closet x 612..619, z 406..410.
- **Roof**: two calcite huts in an L (x 606..614, z 377..397) with three open doorways (no door blocks): north to the landing z 374..375 and the steel **fire escape** z 370..373 (outside the region) down to the alley; west to the **vent shaft** x 598..599, z 388..389 (2 × 2 with a ladder down to the ground floor's NW corner, sealed from the obby floors); east to a deck x 632..634 over Bank Street with a ladder at x 632, z 391.

### 4.3 The robbery

1. In: smash the X window G1 from the forecourt (the clock starts, 6:00), or climb the fire escape to the roof and the vent.
2. Showroom: the five islands G2-G6 / P1-P5 under three low lasers and the counter turret T4 (sneak to stay out of its 6-block range).
3. Basement: rings G7 / P6, watches G8 / P7, three blinking lasers, the workshop safe G9 / P13 (the no-climb safe for Mara c2).
4. Obby 1, obby 2: lasers and loose gems P8, P9.
5. Final floor: duck lasers, gems P10, the curtain, the office turret T27 (it watches the doorway, not the safe), the safe G10 with office cash P11 and the Blue Heart P12.
6. Out: north hut, fire escape, alley bikes or 2nd Street west; the vent; or back out the X window.

## 5. The Bank (module `bank`; heist `bank`, difficulty 3, level 20, advanced)

### 5.1 Theme

Jailbreak's green-glass tower with the brick B-A-N-K pylon: a lobby with tellers and a keypad security gate, a red "Classic" laser bay, a loud octagon vault door you drill and defend while cops pour down the stairs, and an alternate exit to a manhole behind the bank. Grafted on: Payday's quiet-then-loud play (tills, counting room and manager's safe past two cameras and two alarm lasers; the drill is always loud), GTA's Box 167 (a second, short drill) and register tills, and a barred port beside the vault door.

### 5.2 Footprint and levels

- **Building** x 597..628, z 282..319 (32 × 38), west side of Bank Street. **Front plaza** x 629..639 (polished andesite) to the sidewalk. **Hatch Plaza** x 560..590, z 285..315 behind it.

| Level | Floor slab y | Interior y |
|---|---|---|
| B2 vault level | 48 | 49..55 |
| B1 laser bay + counting room | 56 | 57..63 |
| Lobby | 64 | 65..76 double height; mezzanine slab 70 over the west third |
| Tower floors 2-5 | 77, 83, 89, 95 | sealed (no stairs), dark-tinted windows |
| Roof | 98 | helipad in calcite + yellow_terracotta (unreachable); pylon to y 102. Preview roof polished_deepslate at y 101 |

- **Outside**: green_stained_glass curtain walls in a navy frame (blue_terracotta, polished_deepslate); a 4-wide brick pylon at the SE corner with "B A N K" as stacked white `city_label` text; one band of blue windows; a light_blue glass neon line over sea lanterns round the base; a double-height glass lobby front on Bank Street.
- **Front door**: an open doorway 4 wide × 4 high mid east face (z 298..301), quartz surround.
- **Back (west)**: a blank wall onto Hatch Plaza and the **manhole**: four polished_andesite_wall bollards round an open ladder shaft x 574..575, z 299..300, top at y 64 (no trapdoor).
- **Inside**:
  - Lobby: prismarine-brick and dark-prismarine floor, pale gray walls. Teller counter on the west side: a 6 × 2 blue-glass screen G1 (x 603, z 297..302) over three register tills at x 600 (P1-P3). Stairs north to the mezzanine office and its wall safe G2 (x 601..602, z 284, y 71..72). SW corner: the **security gate** G3 (3 × 3 iron-block door with a keypad prop, x 599..601, z 316) in a 3-deep alcove, then stairs down. The stairwell runs inside x 597..606.
  - B1: the bay x 599..606, z 291..312 (red_nether_bricks floor, iron-block and polished_blackstone walls). The counting room x 608..614, z 300..308 off the bay, three plates at its doorway, cash tables P4. Stairs down at the far (north) end.
  - B2: the antechamber; the vault door G4 (a 5 × 5 face at x 614, z 298..302, y 49..53: polished_deepslate X, chiseled stone wheel) and the barred viewing port beside it; the **vault** x 615..626, z 293..306 (froglight-lit): gold pallets P6, P7, cash trolley P8, deposit walls P9, P10, **Box 167** G5 (x 623, z 307) with P11, the **Reserve cage** G6 (x 623..625, z 303) with P12. West: the exit vestibule x 596..601 (lasers T16-T18) ending in the alternate exit G7 in the region's west face (x 595, z 299..300, y 49..51: opens only from inside).
  - Outside the region: the tunnel x 576..594, z 299..300, floor y 48 (feet 49..52), to the shaft x 574..575 and its ladder up to the manhole.

### 5.3 The robbery

Quiet: tills (sneak past the teller camera T19), the mezzanine safe (camera T2 watches the door, not the safe), the security gate (camera T1 sweeps the floor in front of the alcove), the bay (jump, duck, time the blinking walls; jump the two alarm lasers T11-T12), the counting room. Loud: mount the drill on G4 (alarm), crack G7 while it drills, defend the antechamber while the cops come down, load, leave by the tunnel and the manhole to Hatch Lane (cold; the cops come from Bank Street), or out the front (hot).

## 6. The Museum (module `museum`; heist `museum`, difficulty 4, level 45, advanced: the finale)

### 6.1 Theme

Jailbreak's tan sandstone museum alone on its mesa: four columns, a Triceratops pediment, Mr Bones the T-Rex under sweeping spotlights; in through the roof; the Egyptian room with the alarmed Pharaoh case and the gem room with the alarmed Blue Jewel, each leading to a security room with a side door; the showcase and the gallery upstairs. The pipe puzzle becomes the curator's keypad, the jewel puzzle a laser crawl. Grafted on: Payday's Diamond Room (a checkered floor where one path holds and holes stay open for the run) behind a quiet drill shutter; a loud basement vault with a keypad drain hatch beside it; a drain tunnel out to the storm channel where stolen bikes wait; Jailbreak's twin levers (M2).

### 6.2 Footprint and levels

- **Mesa** x 820..920, z 300..400, top y 72 (smooth_sandstone): 8-block retaining walls of sandstone over stone bricks, built closed. The plaza x 841..898, z 372..400 (smooth_sandstone, cut sandstone; preview polished andesite). Terraces on each side with stairs down the mesa walls at x 822..824 and x 916..918 (outside the region). The ramp road reaches the plaza at x 887..894.
- **Cross plan**: centre block x 857..882, z 331..371 (portico z 365..371 of four round columns: quartz pillar cores in smooth sandstone, wide steps); wings x 843..856 and x 883..896, z 338..363; terrace strips inside the region at x 841..842 and x 897..898.

| Level | Floor slab y | Interior y |
|---|---|---|
| Basement | 64 | 65..70 (false-floor pit 61..63) |
| Ground (mesa top) | 72 | central hall 73..89 double height, balconies at y 80 on three sides; wing ground rooms 73..79 |
| Upper | 80 | wing upper rooms 81..88; Diamond Room tiles at y 80 over its pit 78..79 |
| Roof | 90 | hall roof (preview calcite y 96), wings y 89, portico y 88; pediment apex 97 |

- **Outside**: smooth_sandstone, cut_sandstone, sandstone bricks; pale salmon trim (terracotta, smooth_red_sandstone bands); a blackstone / deepslate Triceratops silhouette on the pediment; red wool strips where Jailbreak has banners; a big arched window over the doors showing the T-Rex; square wing windows; flat smooth_sandstone roof. Ladder towers x 839..840 and x 899..900, z 349..351 up the wing walls from the terraces, joined by a bridge at y 89 to the roof.
- **Doors** (open, no door blocks): the portico 4 × 6 (x 866..873 opening, z 364); each security room's 2 × 3 side doorway at x 843 and x 896, z 340..341.
- **Inside**:
  - Hall x 858..881, z 343..363: Mr Bones (bone blocks) on a red_terracotta octagon x 866..873, z 351..358; twin stairs to the balconies; a ladder (869, 81..89, 345) from the north balcony to the skylight G1 (x 867..871, z 343..347, y 90). Fossils P1 along the east wall (x 880), eggs P2 behind the T-Rex.
  - West wing ground "Egypt": the Pharaoh case G2 / P3 with four plates T5-T8; the curator's keypad G3 (x 849..850, z 352) into the **west security room** (Mummy P4, lever at (848, 74, 339), side door, service stairs down).
  - East wing ground "Gems": the Blue Jewel case G4 / P5; the laser **crawl** x 888..890 (T9-T14) into the **east security room** (lever at (891, 74, 339), side door, service stairs).
  - Upper west "Showcase": glass wall G5, gold bars P6, oddities P7, cameras T15-T16, hanging calcite / froglight platforms at y 86.
  - Upper east "Gallery": canvases P8, P9 under block-mosaic "paintings" (no paintings or frames), cameras T17-T18, ankle lasers T19-T21.
  - Upper rear "Diamond Room" off the north balcony: tiles at y 80, x 866..874, three bands of three 3 × 3 squares (b1 z 339..341, b2 z 336..338, b3 z 333..335), landing z 332, pit y 78..79 (2 deep); the alcove x 876..878 behind the drill shutter G6 (x 875, z 332..334) with The Diamond P10.
  - Basement: corridor z 351..353 from both service stairs, a branch x 868..870 north through the laser wall T28-T32 and the false floor T33, the antechamber x 862..877, z 331..341; the drain hatch G9 in the region's north face (x 868..869, z 330); the vault door G7 (x 878, z 334..338) into the **vault** x 879..890, z 331..342 (P11, P12, the Crown cage G8 at x 888 with P13).
  - Outside the region: the **drain** x 868..870, z 296..329, floor `drainFloor(z)`, 3 high, out of the mesa's north face through the culvert mouth into the storm channel.

### 6.3 The robbery

Climb a wing ladder, smash the skylight (quiet), drop to the north balcony. Spotlights sweep the hall floor; the pedestal and stair undersides are cover. West: the Pharaoh case (loud), the keypad into the Mummy room. East: the Blue Jewel (loud), the crawl. Upstairs: showcase, gallery, the Diamond Room's one safe path (a fall puts you back on your last solid square; the hole stays). Basement: laser wall, false floor, the vault drill (loud) while you crack the drain hatch, then out by the drain to the channel bikes and up the leg into 2nd Street (cold); or the west door (cold), the east door (hot), or the portico once M2's levers are pulled.

## 7. Gameplay: regions, spots and the setup commands

Players stand at y 65 unless noted. `W` = `jailbreak` now, `world` at launch. Each line of `city.js setup` is tagged (G) in game, (C) console, (L) launch only. Loot syntax as in CLAUDE.md: gates first (gate k is the k-th added; `behind=k` names it), then piles, then `/dloot check`.

### 7.1 Regions

Every region gets `passthrough allow`.

| Region | Box | Notes |
|---|---|---|
| `heist_jewelry` | 598 56 374 .. 634 97 414 | 63,714 |
| `heist_bank` | 595 47 280 .. 630 102 321 | 84,672; the tunnel and shaft stay outside (x < 595) |
| `heist_museum` | 841 60 330 .. 898 97 371 | 92,568; the drain stays outside (z < 330) |
| `district_rising_city` (L) | 481 44 226 .. 940 110 470 | `/ddistrict name rising_city Rising City` |

```
(G) //pos1 598 56 374   //pos2 634 97 414   /rg define heist_jewelry
(G) //pos1 595 47 280   //pos2 630 102 321  /rg define heist_bank
(G) //pos1 841 60 330   //pos2 898 97 371   /rg define heist_museum
(C) rg flag -w W heist_jewelry passthrough allow
(C) rg flag -w W heist_bank passthrough allow
(C) rg flag -w W heist_museum passthrough allow
(L) //pos1 481 44 226   //pos2 940 110 470  /rg define district_rising_city ; (C) rg flag -w world district_rising_city passthrough allow ; /ddistrict name rising_city Rising City
```

### 7.2 Jewelry Store (`jewelry`)

Settings: pool 26000 (default 24,000 + the Heart), escape 6:00, cooldown 10:00, level 5, advanced false, pvp false, police true. Exit (612.5, 65, 417.5) yaw 0; hologram (632.5, 70, 413.5) (inside the region's forecourt: section 12). Cop spots set but unused while not advanced. Bikes in the alley facing west.

```
(G) /dheist create jewelry 2
(G) /dheist set jewelry name Jewelry Store
(G) /dheist set jewelry pool 26000
(G) /dheist exit jewelry 612.5 65 417.5 0
# gates (G1..G10)
(G) /dloot add jewelry smash 606 65 411 607 66 411                    # G1 X window (entry; test 2.9a)
(G) /dloot add jewelry smash 607 66 383 610 67 383                    # G2 island 1 front
(G) /dloot add jewelry smash 620 66 383 623 67 383                    # G3 island 2
(G) /dloot add jewelry smash 603 66 387 606 67 387                    # G4 island 3
(G) /dloot add jewelry smash 613 66 387 616 67 387                    # G5 island 4
(G) /dloot add jewelry smash 623 66 387 626 67 387                    # G6 island 5
(G) /dloot add jewelry smash 603 59 390 603 60 399                    # G7 ring counter
(G) /dloot add jewelry smash 628 59 391 628 60 398                    # G8 watch counter
(G) /dloot add jewelry safe 615 59 409 616 60 409 digits=4 claim=6    # G9 workshop safe
(G) /dloot add jewelry safe 615 87 405 616 88 405 digits=4 claim=6    # G10 office safe
# piles (P1..P13)
(G) /dloot add jewelry pile 607 65 382 610 65 382 value=1250-2250 style=jewel behind=2 name=Display_case
(G) /dloot add jewelry pile 620 65 382 623 65 382 value=1250-2250 style=jewel behind=3 name=Display_case
(G) /dloot add jewelry pile 603 65 388 606 65 388 value=1250-2250 style=jewel behind=4 name=Display_case
(G) /dloot add jewelry pile 613 65 388 616 65 388 value=1250-2250 style=jewel behind=5 name=Display_case
(G) /dloot add jewelry pile 623 65 388 626 65 388 value=1250-2250 style=jewel behind=6 name=Display_case
(G) /dloot add jewelry pile 602 58 390 602 58 399 value=2000-3500 style=jewel behind=7 name=Rings
(G) /dloot add jewelry pile 629 58 391 629 58 398 value=2000-3400 style=goods per-cell=4 behind=8 name=Watches
(G) /dloot add jewelry pile 615 73 407 616 73 408 value=500-1250 style=jewel name=Loose_gems
(G) /dloot add jewelry pile 622 80 389 623 80 390 value=500-1250 style=jewel name=Loose_gems
(G) /dloot add jewelry pile 624 87 380 625 87 381 value=500-1250 style=jewel name=Loose_gems
(G) /dloot add jewelry pile 612 87 408 614 87 409 value=1200-2400 style=cash behind=10 name=Office_cash
(G) /dloot add jewelry pile 618 87 409 618 87 409 value=6000-6000 style=jewel piece=6000 take=4 behind=10 name=Blue_Heart
(G) /dloot add jewelry pile 615 58 410 616 58 410 value=1000-2000 style=jewel behind=9 name=Repair_tray
#   fallback P14 only if test 2.9a fails (a smash gate needs a pile behind it):
#   /dloot add jewelry pile 605 65 410 605 65 410 value=250-500 style=jewel behind=1 name=Window_tray
(G) /dloot check jewelry
# traps (T1..T27)
(G) /dtrap add jewelry laser 601.0 65.4 390.5 631.0 65.4 390.5 damage=1.5
(G) /dtrap add jewelry laser 601.0 65.4 385.5 631.0 65.4 385.5 damage=1.5
(G) /dtrap add jewelry laser 628.5 65.4 388 628.5 65.4 410 damage=1.5
(G) /dtrap add jewelry camera 615.5 70.5 379.5 0 25 effect=damage damage=1 angle=30 range=12 sweep=70 period=6
(G) /dtrap add jewelry laser 604.0 58.4 389.5 628.0 58.4 389.5 damage=1.5 blink=true on=2 off=1.5 offset=0
(G) /dtrap add jewelry laser 604.0 58.4 394.5 628.0 58.4 394.5 damage=1.5 blink=true on=2 off=1.5 offset=0.7
(G) /dtrap add jewelry laser 604.0 58.4 399.5 628.0 58.4 399.5 damage=1.5 blink=true on=2 off=1.5 offset=1.4
(G) /dtrap add jewelry laser 617.0 73.4 388.5 631.0 73.4 388.5 damage=2           # T8  obby 1 east
(G) /dtrap add jewelry laser 617.0 73.4 398.5 631.0 73.4 398.5 damage=2           # T9
(G) /dtrap add jewelry laser 620.5 73.4 381 620.5 73.4 404 damage=2               # T10
(G) /dtrap add jewelry laser 626.5 73.4 381 626.5 73.4 404 damage=2               # T11
(G) /dtrap add jewelry laser 601.0 73.4 398.5 615.0 73.4 398.5 damage=2           # T12 obby 1 west
(G) /dtrap add jewelry laser 601.0 73.4 388.5 615.0 73.4 388.5 damage=2           # T13
(G) /dtrap add jewelry laser 605.5 73.4 381 605.5 73.4 404 damage=2               # T14
(G) /dtrap add jewelry laser 611.5 73.4 381 611.5 73.4 404 damage=2               # T15
(G) /dtrap add jewelry laser 604.5 80 386.5 604.5 86 386.5 damage=2 blink=true on=1.5 off=1.5 offset=0     # T16 obby 2
(G) /dtrap add jewelry laser 611.5 80 386.5 611.5 86 386.5 damage=2 blink=true on=1.5 off=1.5 offset=0.5   # T17
(G) /dtrap add jewelry laser 607.5 80 396.5 607.5 86 396.5 damage=2 blink=true on=1.5 off=1.5 offset=1     # T18
(G) /dtrap add jewelry laser 615.5 80 407.5 615.5 86 407.5 damage=2 blink=true on=1.5 off=1.5 offset=1.5   # T19
(G) /dtrap add jewelry laser 620.5 80 398.5 620.5 86 398.5 damage=2 blink=true on=1.5 off=1.5 offset=2     # T20
(G) /dtrap add jewelry laser 627.5 80 398.5 627.5 86 398.5 damage=2 blink=true on=1.5 off=1.5 offset=2.5   # T21
(G) /dtrap add jewelry laser 611.0 91.65 384.5 614.0 91.65 384.5 damage=2         # T22 flight A (duck)
(G) /dtrap add jewelry laser 611.0 91.65 391.5 614.0 91.65 391.5 damage=2         # T23 flight B
(G) /dtrap add jewelry laser 615.0 87.4 398.5 617.0 87.4 398.5 damage=2 blink=true on=2 off=2 offset=0     # T24 VIP curtain
(G) /dtrap add jewelry laser 615.0 88.0 398.5 617.0 88.0 398.5 damage=2 blink=true on=2 off=2 offset=0     # T25
(G) /dtrap add jewelry laser 615.0 88.65 398.5 617.0 88.65 398.5 damage=2 blink=true on=2 off=2 offset=0   # T26
(G) /dtrap add jewelry camera 615.5 90.0 404.5 180 20 effect=damage damage=1 angle=30 range=8 sweep=60 period=6   # T27 office turret
# cops (unused while not advanced), hologram, open
(G) /dcops jewelry add 596.5 65 417.5
(G) /dcops jewelry add 662.5 65 417.5
(G) /dheist snapshot jewelry
(G) /dheist holo jewelry 632.5 70 413.5
(G) /dheist enable jewelry
(C) dbike spotat jailbreak 601 65 360 90
(C) dbike spotat jailbreak 603 65 360 90
(C) dbike spotat jailbreak 605 65 360 90
```

With M1 (later): obby 1 group `obby1` gets a second layout "gems" (six low / mid lasers along x: east half x 617→631 at z 383.5 y 74.0, z 393.5 y 74.65, z 403.5 y 74.0; west half x 601→615 at z 403.5 y 74.65, z 393.5 y 74.0, z 383.5 y 74.65); obby 2 group `obby2` gets "classic" (x 601→615 low z 382.5, mid z 391.5, low z 401.5; x 617→631 mid z 402.5, low z 393.5, mid z 384.5; low 80.4, mid 81.65). With M2: `/dtrap set` T24-T26 `tag curtain` and a fuse box at (630, 81, 389).

### 7.3 Bank (`bank`)

Settings: advanced true, escape 8:00, cooldown 15:00, level 20, pool 80000, police true. Exit (636.5, 65, 300.5) yaw −90; hologram (633.5, 71, 300.5). Chase centre (612.5, 74.5, 300.5). PROPOSAL (core.sk, owner's call): `difficulty::3::alarm::warning` 25, `::max-cops` 5, `::pool` 5, `::heavy-from` 4.

```
(G) /dheist create bank 3
(G) /dheist set bank name Bank
(G) /dheist set bank advanced true
(G) /dheist exit bank 636.5 65 300.5 -90
# gates (G1..G7)
(G) /dloot add bank smash 603 66 297 603 67 302                         # G1 teller screen
(G) /dloot add bank safe 601 71 284 602 72 284                          # G2 manager's wall safe
(G) /dloot add bank safe 599 65 316 601 67 316                          # G3 security gate
(G) /dloot add bank drill 614 49 298 614 53 302 time=75 jams=2 claim=10 # G4 vault door (alarm)
(G) /dloot add bank drill 623 50 307 623 51 307 time=30 jams=1 alarm=true   # G5 Box 167
(G) /dloot add bank safe 623 49 303 625 51 303                          # G6 Reserve cage (test 2.9c)
(G) /dloot add bank safe 595 49 299 595 51 300                          # G7 alternate exit (region face)
# piles (P1..P12)
(G) /dloot add bank pile 600 65 298 600 65 298 value=1000-2000 style=register piece=250 take=2.0 behind=1 name=Till
(G) /dloot add bank pile 600 65 300 600 65 300 value=1000-2000 style=register piece=250 take=2.0 behind=1 name=Till
(G) /dloot add bank pile 600 65 302 600 65 302 value=1000-2000 style=register piece=250 take=2.0 behind=1 name=Till
#   fallback if test 2.9b fails: style=cash on 2 cells each
(G) /dloot add bank pile 610 57 303 612 57 304 value=3000-6000 style=cash piece=500 take=4.0 behind=3 name=Counting_room
(G) /dloot add bank pile 601 70 283 602 70 283 value=4000-8000 style=cash piece=1000 take=4.0 behind=2 name=Bonds
(G) /dloot add bank pile 617 49 294 618 49 296 value=8000-12000 style=gold piece=1000 take=3.0 behind=4 name=Gold_pallet
(G) /dloot add bank pile 617 49 303 618 49 305 value=8000-12000 style=gold piece=1000 take=3.0 behind=4 name=Gold_pallet
(G) /dloot add bank pile 620 49 294 621 49 296 value=8000-12000 style=cash piece=500 take=4.0 behind=4 name=Cash_trolley
(G) /dloot add bank pile 626 50 295 626 50 302 value=3000-6000 style=jewel behind=4 name=Deposit_jewels
(G) /dloot add bank pile 619 50 293 624 50 293 value=4000-8000 style=goods piece=500 take=2.5 per-cell=4 behind=4 name=Valuables
(G) /dloot add bank pile 623 49 308 623 49 308 value=5000-7500 style=goods piece=2500 take=5.0 per-cell=4 behind=5 name=Box_167
(G) /dloot add bank pile 623 49 305 625 49 306 value=12000-24000 style=gold piece=2000 take=4.5 behind=6 name=Reserve
(G) /dloot check bank
# traps (T1..T19)
(G) /dtrap add bank camera 608.5 72.0 306.5 50 36 effect=alarm angle=30 range=12 sweep=60 period=8   # T1 gate floor
(G) /dtrap add bank camera 612.5 73.5 288.5 90 15 effect=alarm                                       # T2 office door
(G) /dtrap add bank laser 599.0 57.4 310.5 607.0 57.4 310.5 damage=2    # T3 bay low
(G) /dtrap add bank laser 599.0 57.4 307.5 607.0 57.4 307.5 damage=2    # T4
(G) /dtrap add bank laser 599.0 57.4 300.5 607.0 57.4 300.5 damage=2    # T5
(G) /dtrap add bank laser 599.0 57.4 297.5 607.0 57.4 297.5 damage=2    # T6
(G) /dtrap add bank laser 599.0 58.65 305.5 607.0 58.65 305.5 damage=2  # T7 duck
(G) /dtrap add bank laser 599.0 58.65 298.5 607.0 58.65 298.5 damage=2  # T8
(G) /dtrap add bank laser 602.5 57 302.5 602.5 63 302.5 damage=2 blink=true on=2 off=2 offset=0   # T9 pillar wall
(G) /dtrap add bank laser 603.5 57 302.5 603.5 63 302.5 damage=2 blink=true on=2 off=2 offset=2   # T10
(G) /dtrap add bank laser 599.0 58.0 295.5 607.0 58.0 295.5 effect=alarm   # T11 alarm laser
(G) /dtrap add bank laser 599.0 58.0 293.5 607.0 58.0 293.5 effect=alarm   # T12
(G) /dtrap add bank plate 607 57 304 damage=2   # T13 counting-room door
(G) /dtrap add bank plate 607 57 305 damage=2   # T14
(G) /dtrap add bank plate 608 57 305 damage=2   # T15
(G) /dtrap add bank laser 598.5 49.4 297.0 598.5 49.4 304.0 damage=2    # T16 vestibule low
(G) /dtrap add bank laser 600.5 49.4 297.0 600.5 49.4 304.0 damage=2    # T17
(G) /dtrap add bank laser 599.5 50.65 297.0 599.5 50.65 304.0 damage=2  # T18 duck
(G) /dtrap add bank camera 611.5 71.0 293.5 53 24 effect=alarm range=12   # T19 teller camera (sneak passes)
# lockdown (iron bars), cops, hologram, open
(G) /dheist lock bank add 628 65 283 628 76 296 iron_bars    # L1 front glass north of the door
(G) /dheist lock bank add 628 65 303 628 76 318 iron_bars    # L2 front glass south
(G) /dheist lock bank add 608 65 282 627 75 282 iron_bars    # L3 north side glass
(G) /dheist lock bank add 608 65 319 627 75 319 iron_bars    # L4 south side glass
(G) /dheist lock bank add 607 71 292 607 74 315 iron_bars    # L5 mezzanine inner glass
(G) /dcops bank add 662.5 65 337.5
(G) /dcops bank add 662.5 65 262.5
(G) /dheist snapshot bank
(G) /dheist holo bank 633.5 71 300.5
(G) /dheist enable bank
(C) dbike spotat jailbreak 565 65 297 90
(C) dbike spotat jailbreak 565 65 303 90
```

With M1 (later): group `vault` picks one of two bays (P8b `620 49 303 621 49 305` cash, the second trolley); group `rare` (pick-chance) adds P13 `621 49 300` art piece=12000 take=6 (the Founder's Box); group `bay` adds T20-T27 (z 308.5 at y 57.4 / 57.9 / 58.4 / 58.65 / 59.2, blink on=2 off=1, offsets 0 / 0.6 / 1.2 / 1.8 / 2.4; verticals at z 296.5, x 600.5 / 602.5 / 604.5). With M2: a breaker box at the bay entry `tags=bay hold=3 for=45 rearm=90` (T3-T10 tagged `bay`). With M3: G7 becomes `blast fuse=10 alarm=true`.

### 7.4 Museum (`museum`)

Settings: advanced true, escape 10:00, cooldown 30:00, level 45, pool 240000, police true. Exit (869.5, 73, 380.5) yaw 0; hologram (869.5, 80, 373.5). Chase centre (869.5, 78.5, 350.5).

```
(G) /dheist create museum 4
(G) /dheist set museum name Museum
(G) /dheist exit museum 869.5 73 380.5 0
# gates (G1..G9)
(G) /dloot add museum smash 867 90 343 871 90 347                          # G1 skylight
(G) /dloot add museum smash 851 74 356 851 75 358 alarm=true               # G2 Pharaoh case
(G) /dloot add museum safe 849 73 352 850 75 352                           # G3 curator's keypad
(G) /dloot add museum smash 889 74 357 889 75 359 alarm=true               # G4 Blue Jewel case
(G) /dloot add museum smash 849 81 350 851 83 350                          # G5 showcase glass
(G) /dloot add museum drill 875 81 332 875 83 334 time=60 jams=2 alarm=false   # G6 Diamond shutter
(G) /dloot add museum drill 878 65 334 878 69 338 time=90 jams=3 claim=10  # G7 vault door (alarm)
(G) /dloot add museum safe 888 65 334 888 67 336                           # G8 Crown cage (test 2.9c)
(G) /dloot add museum safe 868 65 330 869 66 330                           # G9 drain hatch (region face)
# piles (P1..P13)
(G) /dloot add museum pile 880 73 344 880 73 349 value=6000-12000 style=goods piece=1000 take=4 name=Fossils
(G) /dloot add museum pile 869 73 350 870 73 350 value=6000-12000 style=art piece=6000 take=6 name=Dino_eggs
(G) /dloot add museum pile 849 73 357 850 73 358 value=10000-20000 style=art piece=5000 take=5 behind=2 name=Pharaoh
(G) /dloot add museum pile 850 73 340 853 73 340 value=10000-20000 style=art piece=5000 take=5 behind=3 name=Mummy
(G) /dloot add museum pile 890 73 358 890 73 358 value=10000-20000 style=jewel piece=5000 take=4 behind=4 name=Blue_Jewel
(G) /dloot add museum pile 846 81 341 849 81 342 value=8000-16000 style=gold piece=1000 take=3 behind=5 name=Gold_bars
(G) /dloot add museum pile 851 81 341 853 81 342 value=5000-10000 style=goods piece=1000 take=4 behind=5 name=Oddities
(G) /dloot add museum pile 885 81 340 887 81 342 value=15000-27000 style=art piece=3000 take=4.5 name=Canvases
(G) /dloot add museum pile 891 81 340 893 81 342 value=15000-27000 style=art piece=3000 take=4.5 name=Canvases
(G) /dloot add museum pile 877 81 333 877 81 333 value=25000-50000 style=jewel piece=12500 take=10 behind=6 name=The_Diamond
(G) /dloot add museum pile 881 65 333 884 65 335 value=21000-36000 style=gold piece=1500 take=4.5 behind=7 name=Vault_gold
(G) /dloot add museum pile 881 65 341 887 65 341 value=20000-35000 style=art piece=5000 take=6 behind=7 name=Antiquities
(G) /dloot add museum pile 889 65 334 890 65 336 value=15000-24000 style=jewel piece=1000 take=4 behind=8 name=Crown_jewels
(G) /dloot check museum
# traps (T1..T33)
(G) /dtrap add museum camera 858.5 86 345.5 -45 40 effect=alarm angle=25 range=14 sweep=90 period=7    # T1 spotlights
(G) /dtrap add museum camera 880.5 86 345.5 45 40 effect=alarm angle=25 range=14 sweep=90 period=8     # T2
(G) /dtrap add museum camera 858.5 86 362.5 -135 40 effect=alarm angle=25 range=14 sweep=90 period=9   # T3
(G) /dtrap add museum camera 880.5 86 362.5 135 40 effect=alarm angle=25 range=14 sweep=90 period=10   # T4
(G) /dtrap add museum plate 852 73 357 damage=2   # T5 Pharaoh plates
(G) /dtrap add museum plate 852 73 358 damage=2   # T6
(G) /dtrap add museum plate 848 73 356 damage=2   # T7
(G) /dtrap add museum plate 848 73 359 damage=2   # T8
(G) /dtrap add museum laser 888.0 73.4 350.5 891.0 73.4 350.5 damage=2     # T9 crawl
(G) /dtrap add museum laser 888.0 74.65 349.5 891.0 74.65 349.5 damage=2   # T10
(G) /dtrap add museum laser 888.0 73.4 347.5 891.0 73.4 347.5 damage=2     # T11
(G) /dtrap add museum laser 888.0 74.65 346.5 891.0 74.65 346.5 damage=2   # T12
(G) /dtrap add museum laser 888.5 73 344.5 888.5 76 344.5 damage=2 blink=true on=1.5 off=1.5 offset=0     # T13
(G) /dtrap add museum laser 890.5 73 344.5 890.5 76 344.5 damage=2 blink=true on=1.5 off=1.5 offset=1.5   # T14
(G) /dtrap add museum camera 845.5 87 361.5 -135 40 effect=alarm sweep=60 period=8   # T15 showcase
(G) /dtrap add museum camera 855.5 87 361.5 135 40 effect=alarm sweep=60 period=8    # T16
(G) /dtrap add museum camera 884.5 87 361.5 -135 40 effect=alarm sweep=60 period=8   # T17 gallery
(G) /dtrap add museum camera 894.5 87 361.5 135 40 effect=alarm sweep=60 period=8    # T18
(G) /dtrap add museum laser 884.0 81.3 343.5 896.0 81.3 343.5 effect=alarm   # T19 ankle lasers
(G) /dtrap add museum laser 884.0 81.3 345.5 896.0 81.3 345.5 effect=alarm   # T20
(G) /dtrap add museum laser 884.0 81.3 347.5 896.0 81.3 347.5 effect=alarm   # T21
(G) /dtrap add museum floor 866 80 339 868 80 341 damage=2 delay=0.5 restore=0 depth=2   # T22 Diamond floor, path A
(G) /dtrap add museum floor 872 80 339 874 80 341 damage=2 delay=0.5 restore=0 depth=2   # T23
(G) /dtrap add museum floor 866 80 336 871 80 338 damage=2 delay=0.5 restore=0 depth=2   # T24
(G) /dtrap add museum floor 866 80 333 871 80 335 damage=2 delay=0.5 restore=0 depth=2   # T25
(G) /dtrap add museum laser 869.0 82.65 342.5 871.0 82.65 342.5 effect=alarm   # T26 Diamond door (duck)
(G) /dtrap add museum laser 866.0 82.65 340.5 875.0 82.65 340.5 effect=alarm   # T27
(G) /dtrap add museum laser 868.0 65.4 347.5 871.0 65.4 347.5 damage=2 blink=true on=2 off=1 offset=0     # T28 laser wall
(G) /dtrap add museum laser 868.0 65.9 347.5 871.0 65.9 347.5 damage=2 blink=true on=2 off=1 offset=0.6   # T29
(G) /dtrap add museum laser 868.0 66.4 347.5 871.0 66.4 347.5 damage=2 blink=true on=2 off=1 offset=1.2   # T30
(G) /dtrap add museum laser 868.0 66.65 347.5 871.0 66.65 347.5 damage=2 blink=true on=2 off=1 offset=1.8 # T31
(G) /dtrap add museum laser 868.0 67.2 347.5 871.0 67.2 347.5 damage=2 blink=true on=2 off=1 offset=2.4   # T32
(G) /dtrap add museum floor 869 64 342 870 64 345 damage=2 depth=3   # T33 false floor
# lockdown (iron bars), cops, hologram, open
(G) /dheist lock museum add 866 73 364 873 78 364 iron_bars   # L1 portico doorway
(G) /dheist lock museum add 866 80 364 873 87 364 iron_bars   # L2 arched window
(G) /dheist lock museum add 843 74 354 843 77 361 iron_bars   # L3 west wing ground windows
(G) /dheist lock museum add 843 82 342 843 86 361 iron_bars   # L4 west wing upper windows
(G) /dheist lock museum add 896 74 354 896 77 361 iron_bars   # L5 east wing ground windows
(G) /dheist lock museum add 896 82 342 896 86 361 iron_bars   # L6 east wing upper windows
(G) /dheist lock museum add 867 90 343 871 90 347 iron_bars   # L7 skylight opening (G1's cells)
(G) /dcops museum add 870.5 73 388.5
(G) /dcops museum add 810.5 65 430.5
(G) /dcops museum add 925.5 65 350.5
(G) /dheist snapshot museum
(G) /dheist holo museum 869.5 80 373.5
(G) /dheist enable museum
(C) dbike spotat jailbreak 866 60 290 90
(C) dbike spotat jailbreak 869 60 290 90
(C) dbike spotat jailbreak 872 60 290 90
```

The Diamond path at launch (path A): b1's safe square is x 869..871 (T22 and T23 either side), b2's x 872..874, b3's x 872..874; b1's and b2's safe squares touch only at a corner (section 12), b2's and b3's share an edge. With M1 (later): group `diamond` picks one of four paths (T34-T37 add 866..868 b1, 872..874 b1, 869..874 b2, 869..874 b3 as the other variants' floors). With M2: the twin levers `link=sec need=2 within=3 tags=spot for=run lift=L1,L7 miss=alarm` (T1-T4 tagged `spot`). With M3: G1 becomes a 3 × 3 sandstone `blast alarm=false`.

### 7.5 Lockdown and cop rules (all three)

- Lockdown never boxes the last way out: the Bank's front doorway and alternate exit, the Museum's side doorways and drain stay open.
- Cops never open doors: every cop route is an open doorway (rule 2.5 of the decision). Test the paths (2.9d).
- Bikes stand outside every region; a bike doubles the chase radius (100 to 200) for the rest of the chase.

### 7.6 Points of interest and the phone map

- (L) `/dpoi add landmark Rising City` standing at (810.5, 65, 430.5) on the roundabout island.
- (C) `/dphone city scan -40 -30 940 1300 0 jailbreak` (prison, town and city in one map: 981 × 1331 pixels), then the hand paths (7.8).

### 7.7 Order of the setup (after a paste; not this run)

1. Regions (7.1).
2. Heists in level order: jewelry, bank, museum (7.2-7.4): `create`, `set name`, `exit`, gates, piles, `dloot check`, traps, locks, cops, `snapshot` (room clean), `holo`, `enable`.
3. Bikes (the `(C) dbike` lines).
4. GPS paths (7.8): load `tools/city-gps-paths.txt` after the prison's and the town's files.
5. The phone scan (7.6).
6. At launch: the district, the POI, the owner's core.sk d3 numbers (if taken), and `gps.road-blocks` unchanged (the city's roads are the prison's concrete mixes).

`city.js setup --world jailbreak|world` prints all of these from the modules' `setup` exports (section 9.3).

### 7.8 GPS path nodes (`module.exports.gps` of `streets`; ids from 3001)

The channel, the drain and the ramp are not concrete, so the road grid can't route them: these hand paths do. The first link joins the prison's node 1002 JUNCTION (448.5 65 426.5).

| Id | Coordinates | Name |
|---|---|---|
| 3001 | 482.5 65 426.5 | AVE_W |
| 3002 | 497.5 65 426.5 | AVE_WEST_ST |
| 3003 | 612.5 65 426.5 | AVE_JEWELRY |
| 3004 | 651.5 65 426.5 | AVE_BANK_ST |
| 3005 | 780.5 65 426.5 | AVE_E |
| 3006 | 795.5 65 430.5 | RB_W |
| 3007 | 810.5 65 415.5 | RB_N |
| 3008 | 825.5 65 430.5 | RB_E |
| 3009 | 810.5 65 445.5 | RB_S |
| 3010 | 831.5 65 405.5 | RAMP_FOOT |
| 3011 | 890.5 73 405.5 | RAMP_TOP |
| 3012 | 890.5 73 396.5 | PLAZA |
| 3013 | 869.5 73 380.5 | MUSEUM_EXIT |
| 3014 | 651.5 65 347.5 | BANK_ST_2ND |
| 3015 | 651.5 65 300.5 | BANK_FRONT |
| 3016 | 636.5 65 300.5 | BANK_EXIT |
| 3017 | 651.5 65 262.5 | BANK_ST_N |
| 3018 | 497.5 65 347.5 | WEST_ST_N |
| 3019 | 619.5 65 347.5 | 2ND_ALLEY |
| 3020 | 619.5 65 364.5 | ALLEY |
| 3021 | 781.5 65 347.5 | 2ND_E |
| 3022 | 781.5 65 337.5 | CH_LEG_TOP |
| 3023 | 781.5 60 295.5 | CH_LEG_FOOT |
| 3024 | 781.5 60 288.5 | CH_BEND |
| 3025 | 869.5 60 288.5 | CH_MUSEUM |
| 3026 | 869.5 60 294.5 | DRAIN_MOUTH |
| 3027 | 869.5 65 329.5 | DRAIN_TOP |
| 3028 | 497.5 65 300.5 | WEST_ST_HATCH |
| 3029 | 570.5 65 300.5 | HATCH_PLAZA |
| 3030 | 612.5 65 417.5 | JEWELRY_EXIT |

**Links**: 1002-3001, 3001-3002, 3002-3003, 3003-3030, 3003-3004, 3004-3005, 3005-3006; 3006-3007, 3007-3008, 3008-3009, 3009-3006; 3007-3010, 3010-3011, 3011-3012, 3012-3013; 3004-3014, 3014-3015, 3015-3016, 3015-3017; 3002-3018, 3018-3019, 3019-3014, 3019-3020, 3014-3021; 3021-3022, 3022-3023, 3023-3024, 3024-3025, 3025-3026, 3026-3027; 3018-3028, 3028-3029.

3027 DRAIN_TOP sits just outside the museum region (z 329), at the hatch; 3029 HATCH_PLAZA is beside the manhole.

## 8. COMMON (copy verbatim into every city module)

The town's helpers (section 9 of the town plan: the hash, `MIX`, `door`, `bed`, `rect`), two city mixes, the city's frame and street geometry, and the town's shared props. `tools/build/city/plan-layout.js` holds this exact text and is the source of truth; both files are generated together, so they never drift.

```js
// ---- COMMON (tools/build/city/PLAN.md section 8: copy verbatim into every city module) ----
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
  // city additions
  plaza: [['polished_andesite', 75], ['andesite', 15], ['stone', 10]],      // alleys, plazas, Hatch Lane, the channel floor
  curb: [['smooth_stone', 85], ['stone', 15]]
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

// ---- the city's frame ----------------------------------------------------------------------------------------------
const WORLD = 'jailbreak'
const CITY = { x1: 481, z1: 226, x2: 940, z2: 470, y1: 44, y2: 110 } // every block of Rising City lies in here
const GROUND_Y = 64 // the generated grass's top block; feet stand at 65
const LABEL_TAG = 'city_label', DISPLAY_TAG = 'city_display' // the tags of the city's text displays and item displays

// module boxes [x1, z1, x2, z2]: the module owns every column inside, y CITY.y1..CITY.y2
const BOX = {
  jewelry: [596, 356, 639, 415], // the store, its alley (z 356..373) and the fire escape
  bank: [560, 280, 639, 321],    // the tower, Hatch Plaza (x 560..590), the front plaza (x 629..639), the tunnel and shaft
  museum: [820, 296, 920, 400]   // the mesa (x 820..920, z 300..400, top y 72), the plaza, the terraces, the drain tunnel
}
const BUILDINGS = Object.keys(BOX)
// the heist regions [x1, y1, z1, x2, y2, z2] (section 7.1)
const REGION = {
  jewelry: [598, 56, 374, 634, 97, 414],
  bank: [595, 47, 280, 630, 102, 321],
  museum: [841, 60, 330, 898, 97, 371]
}
// owned by nobody: no module writes a block here (the base lot, the power plant strip, the casino blocks)
const KEEP_FREE = [[506, 356, 550, 410], [931, 226, 940, 470], [664, 226, 930, 279]]

const inBox = (x, z, boxes) => boxes.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
const ownerOf = (x, z) => {
  if (x < CITY.x1 || x > CITY.x2 || z < CITY.z1 || z > CITY.z2) return null
  if (inBox(x, z, KEEP_FREE)) return 'free'
  for (const m of BUILDINGS) if (inBox(x, z, [BOX[m]])) return m
  return 'streets'
}
const ownFor = mod => (x, y, z) => y >= CITY.y1 && y <= CITY.y2 && ownerOf(x, z) === mod

// ---- streets (module `streets`; the numbers are section 3's) -------------------------------------------------------
const AVE = { x1: 481, x2: 789, z1: 419, z2: 441, dash: 430, edge: [420, 440], walk: [[416, 418], [442, 444]], park: [445, 470] }
const RB = { cx: 810, cz: 430, r: 20, island: 8, walk: 3 } // the roundabout: island d < 8, asphalt 8..20, sidewalk 20..23
const SPUR = [812, 402, 829, 414]   // asphalt from the roundabout's north-east to the ramp's foot
const RAMP = { x1: 830, x2: 894, z1: 402, z2: 409, curb: 401, wall: 410, top: 887 } // the ramp road up the mesa's south wall
const BANK_ST = { x1: 640, x2: 663, road: [643, 660], z1: 230 }   // north from the avenue to z 230
const SECOND = { z1: 340, z2: 355, road: [343, 352], x1: 490, x2: 787 }
const WEST_ST = { x1: 490, x2: 505, road: [493, 502], z1: 296 }   // north from the avenue to z 296
const HATCH_LANE = [506, 296, 559, 304]                            // polished andesite, into Hatch Plaza (bank module)
const CHAN = { x1: 776, x2: 930, z1: 280, z2: 295, floor: 59, mouth: [868, 870] } // the storm channel, walls at its edges
const LEG = { x1: 776, x2: 787, z1: 296, z2: 355 }                 // its west leg, up into 2nd Street

const rbD = (x, z) => Math.hypot(x + 0.5 - RB.cx, z + 0.5 - RB.cz)
const rampFeet = x => x >= RAMP.top ? 73 : 65 + Math.floor((x - RAMP.x1) / 8) // where feet stand on the ramp at column x
const legFloor = z => z <= 296 ? 59 : z >= 336 ? 64 : 59 + Math.floor((z - 296) / 8) // the leg's floor block
const drainFloor = z => 59 + Math.floor((z - 294) / 7) // the drain tunnel's floor block, z 296..329 (museum module)

// What the streets module lays at (x, z), or null (grass at GROUND_Y). top = the surface block's y.
// kinds: road (asphalt), line (white / yellow), walk (sidewalk), curb (sidewalk edge, a slab at top + 1), island,
// park (parking bay), ramp, rampwall (to top), lane (polished andesite), chan (channel floor), wall (to top, rail above)
function streetCell (x, z) {
  // the storm channel and its west leg
  if (x >= CHAN.x1 && x <= CHAN.x2 && z >= CHAN.z1 && z <= CHAN.z2) {
    if (z === CHAN.z1 || x === CHAN.x1 || x === CHAN.x2) return { kind: 'wall', top: 64 }
    if (z === CHAN.z2 && x >= LEG.x2) return x >= CHAN.mouth[0] && x <= CHAN.mouth[1] ? { kind: 'wall', top: 64, mouth: true } : { kind: 'wall', top: 64 }
    return { kind: 'chan', top: x < LEG.x2 ? legFloor(z) : CHAN.floor }
  }
  if (x >= LEG.x1 && x <= LEG.x2 && z >= LEG.z1 && z < SECOND.z1) {
    if (x === LEG.x1 || x === LEG.x2) return { kind: 'wall', top: 64 }
    return { kind: 'chan', top: legFloor(z) }
  }
  // the ramp road, its spur and the roundabout
  if (x >= RAMP.x1 && x <= RAMP.x2) {
    if (z >= RAMP.z1 && z <= RAMP.z2) return { kind: 'ramp', top: rampFeet(x) - 1 }
    if (z === RAMP.curb) return x >= RAMP.top ? { kind: 'ramp', top: 72 } : { kind: 'curb', top: rampFeet(x) - 1 }
    if (z === RAMP.wall) return { kind: 'rampwall', top: rampFeet(x) }
  }
  if (inBox(x, z, [SPUR])) return { kind: 'road', top: 64 }
  // Main Avenue, its sidewalks and the parking strip
  if (x >= AVE.x1 && x <= AVE.x2) {
    if (z >= AVE.z1 && z <= AVE.z2) {
      if (z === AVE.edge[0] || z === AVE.edge[1]) return { kind: 'line', top: 64, color: 'white' }
      if (z === AVE.dash && x % 6 < 3) return { kind: 'line', top: 64, color: 'yellow' }
      return { kind: 'road', top: 64 }
    }
    const cross = (x >= BANK_ST.road[0] && x <= BANK_ST.road[1]) || (x >= WEST_ST.road[0] && x <= WEST_ST.road[1])
    if (z >= AVE.walk[0][0] && z <= AVE.walk[0][1]) return cross ? { kind: 'road', top: 64 } : { kind: z === AVE.walk[0][1] ? 'curb' : 'walk', top: 64 }
    if (z >= AVE.walk[1][0] && z <= AVE.walk[1][1]) return { kind: z === AVE.walk[1][0] ? 'curb' : 'walk', top: 64 }
    if (z >= AVE.park[0] && z <= AVE.park[1]) return { kind: 'park', top: 64, bay: x % 5 === 0 && z <= 452 }
  }
  const d = rbD(x, z) // after the avenue, so the ring's sidewalk never cuts the avenue's end
  if (d < RB.r + RB.walk) return d < RB.island ? { kind: 'island', top: 64 } : d < RB.r ? { kind: 'road', top: 64 } : { kind: 'walk', top: 64 }
  // Bank Street, 2nd Street, West Street (crossings are asphalt)
  const inBank = x >= BANK_ST.x1 && x <= BANK_ST.x2 && z >= BANK_ST.z1 && z < AVE.walk[0][0]
  const inSecond = z >= SECOND.z1 && z <= SECOND.z2 && x >= SECOND.x1 && x <= SECOND.x2
  const inWest = x >= WEST_ST.x1 && x <= WEST_ST.x2 && z >= WEST_ST.z1 && z < AVE.walk[0][0]
  if (inBank || inSecond || inWest) {
    const roadB = inBank && x >= BANK_ST.road[0] && x <= BANK_ST.road[1]
    const roadS = inSecond && z >= SECOND.road[0] && z <= SECOND.road[1]
    const roadW = inWest && x >= WEST_ST.road[0] && x <= WEST_ST.road[1]
    if (roadB || roadS || roadW) {
      const dashB = roadB && !inSecond && (x === 651 || x === 652) && z % 6 < 3
      const dashS = roadS && !inBank && !inWest && (z === 347 || z === 348) && x % 6 < 3
      return dashB || dashS ? { kind: 'line', top: 64, color: 'yellow' } : { kind: 'road', top: 64 }
    }
    const curb = (inBank && (x === 642 || x === 661)) || (inSecond && (z === 342 || z === 353)) || (inWest && (x === 492 || x === 503))
    return { kind: curb ? 'curb' : 'walk', top: 64 }
  }
  if (inBox(x, z, [HATCH_LANE])) return { kind: 'lane', top: 64 }
  return null
}

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

## 9. Modules for parallel builders

### 9.1 The split

Each module owns exactly the columns `ownerOf(x, z)` gives it, y 44..110. Boxes don't overlap, so the build order doesn't matter.

| Module | File | Columns | Contents | Block budget |
|---|---|---|---|---|
| `streets` | `city/streets.js` | everything `ownerOf` calls `streets` | section 3: avenue, roundabout, spur, ramp, Bank / 2nd / West Streets, Hatch Lane, storm channel and leg, lamps, trees, the city sign; the GPS export | ≤ 250K |
| `jewelry` | `city/jewelry.js` | `BOX.jewelry` | section 4 | ≤ 70K |
| `bank` | `city/bank.js` | `BOX.bank` | section 5 | ≤ 90K |
| `museum` | `city/museum.js` | `BOX.museum` | section 6 (the mesa is most of it) | ≤ 200K |

About 610K blocks at most. Kept-free boxes and grass elsewhere: the world's flat ground is already grass at y 64, so no module lays plain grass.

**Shared rules:**
- Everything a module needs from another (street heights at a box edge, the drain floor, the region boxes) is in COMMON. No module requires another.
- Keep trees and tall things at least 4 blocks from your box's edge.
- A heist module builds its region's floor-to-roof shell closed: no gap that lets a robber in except the planned ways in.
- Traps ≥ 2 blocks inside the region edge; pile cells with 2..3 air above; gates solid and ≤ 27 blocks; smash gates full glass; safe and drill gates iron (rules 2.3, 2.4, 2.7).

### 9.2 Module file pattern

```js
'use strict'
// <module>: what it builds (tools/build/city/PLAN.md section <n>).
// ---- COMMON ... (section 8, verbatim) ... ---- end COMMON ----
const MOD = 'bank'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s) }
module.exports = (b = new (require('../mcstruct').Build)()) => { B = b; /* ...build... */ B = null; return b }
module.exports.labels = [ /* { x, y, z, facing, text, color, scale } tagged city_label (the B A N K letters, the city sign) */ ]
module.exports.displays = [ /* { x, y, z, item, cmd, yaw, pitch, scale } tagged city_display (ATMs: furn_atm) */ ]
module.exports.points = { /* NAME: [x, y, z, yaw] (section 7's spots that live in this module) */ }
module.exports.setup = { regions: [], heists: [], keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [], bikes: [] }
module.exports.gps = { nodes: [/* [id, x, y, z, name] */], links: [/* [a, b] */] } // streets only
```

- `heists` entries carry their section 7 lines in order (each tagged G / C / L); `bikes` the `dbike spotat` lines.
- COMMON's `door` and `bed` call `b.set` directly: pass them `{ set: S }`, never `B`.
- Labels: tag `city_label`, 0.03 off the face, coordinates with decimals. Displays: tag `city_display`, summoned later, never in the structure.
- Blocks to keep out of reach: containers, anything with a menu, beds, cakes, candles, banners, pots, item frames, paintings, armor stands. Wall-mounted lanterns, signs and ladders need their support in the same 48 × 48 column or the late paste pass.
- Open-sky surfaces at street height never use the road blocks (black, gray, white, yellow concrete and powders): forecourts and plazas `MIX.plaza`, roofs smooth_quartz, calcite, gray_terracotta, polished_deepslate or smooth_sandstone.

### 9.3 `tools/build/city.js` (mirror of town.js)

```
const MODULES = ['streets', 'jewelry', 'bank', 'museum']
```

- `build()` runs each module into one Build, skipping a missing file with a warning; `CITY_ONLY=a,b` limits it. It exports `{ build, labels, points, setup, displays, gps }`.
- `node tools/build/city.js` prints blocks per module and the bounds.
- `city.js check [--registry <blocks.json>]` exits non-zero on any problem. It checks that:
  - every module's blocks lie in its own columns (`ownerOf`) and in the city box, and none in a kept-free box;
  - each heist region is under 100,000 blocks, regions don't overlap, and no region touches a safe zone;
  - exits, cop spots and bikes lie outside every region;
  - pile cells have 2..3 air above; gate boxes are all solid and ≤ 27 blocks; no pile overlaps another;
  - traps are ≥ 2 blocks inside their region; collapsing-floor pits are ≥ 2 deep and inside the region;
  - no camera's cone (angle, range, sweep) contains a safe or drill gate's cells (rule 2.1);
  - no open-sky block at y 62..71 outside a street cell is a road block;
  - with `--registry`, every block state against the 26.1.2 registry.
- `city.js setup --world jailbreak|world` prints section 7's lines with real coordinates, tagged (G) / (C) / (L).
- `city.js gps` writes `tools/city-gps-paths.txt`: `dphone path addat <W> ...` with ids, then the links.

Later only, with the owner's OK: `city.js paste [--box ...]` (plus `city_late` for wall-mounted blocks), `city.js labels` (kills `city_label` only), `city.js displays` (`city_display`).

## 10. New mechanics (later; every heist above works without them)

Each is a Skript change for a later run, in this order if the owner takes them. Until then the launch versions in section 7 stand, and nothing in the build depends on them (the fuse box and levers are props).

### M1. Pick groups (later; rank 1)

- `/dloot set <id> pick <group>[:<variant>]`, `/dtrap set <id> pick <group>[:<variant>]`; per heist `/dheist set <h> pick <group> <k>` and `pick-chance <group> <p>`.
- At each opening every group draws k variants (redraw once if it repeats last run's set); unpicked piles roll 0 pieces, unpicked gates are plain walls, unpicked traps aren't armed. Saved in memory, logged in loot.log.
- `/dloot check` and the 150-piece cap count the k largest variants; overlapping traps across variants of one group are allowed. `/dheist info` shows the picks; `/dheist pick` forces one for tests.
- Uses: Jewelry obby1 / obby2 layouts; Bank vault bay, bay lasers, the rare box; Museum Diamond path. About 120-150 lines over loot.sk, traps.sk, heists.sk.

### M2. Security switches (later; rank 2)

- Trap tags (`/dtrap set <id> tag <t>`) and `/dswitch add <h> [x y z] kind=lever|box tags=... [hold] [for=<s>|run] [rearm] [quiet] [link need within] [miss=alarm|none] [lift=<lock ids>] [name]`, at most 8 a heist, ≥ 2 inside the region.
- A lever flips once per run; a box is a hold (loot.sk's hold rules). Linked switches fire when `need` different robbers pull within `within` s. Firing silences tagged traps for `for` s and clears the `lift` lockdown boxes; 5 s before power returns the lasers flicker.
- Uses: Museum twin levers (spotlights off, portico and skylight bars lifted); Bank breaker (bay lasers 45 s); Jewelry fuse box (curtain 60 s). About 120 lines.

### M3. Blast charges (later; rank 3)

- Gate kind `blast` in loot.sk: `/dloot add <h> blast [corners] [fuse=10] [alarm] [claim=6] [radius=4] [damage=3]`, ≤ 27 blocks, refused in stores.
- Hold 2 s to plant (no item), a countdown display, then a bang with no block damage: players within `radius` take `damage`, the gate opens for the run, an advanced heist's alarm trips unless `alarm=false`.
- Uses: Bank G7 (fuse 10, alarm), Museum G1 (3 × 3 sandstone patch, quiet). About 80 lines.

## 11. Checks every builder runs before handing back (all offline)

```bash
cd "/c/Users/matti/OneDrive/Desktop/Donating Test Server"
SP="<your scratchpad>"
tools/node/node.exe tools/build/render.js tools/build/city/<module>.js "$SP/city-render/<module>" --views top,plan,iso --y 65,73 --px 6
tools/node/node.exe tools/build/render.js tools/build/city/plan-layout.js "$SP/city-render/plan" --views top --px 2   # where your box sits
tools/node/node.exe tools/build/city.js check --registry <blocks.json>   # once city.js exists
tools/node/node.exe tools/build/city.js setup --world jailbreak          # read your heist's lines against section 7
```

- Render each level of a heist (`--y` at every floor + 1) and compare against sections 4-6: the cases' plinth / air / lid pattern, stepping blocks, the octagon faces, the Diamond squares.
- Count your blocks against the budget (9.1).
- Magenta in a render only means render.js has no texture for that name; the registry check is the real one.
- Never call python on this machine (it hangs); use `tools/node/node.exe`.

## 12. Calls for the owner, tests and open questions

**Calls (each has the default the builders use):**
1. Bank advanced, with the gentler d3 alarm numbers (7.3). Default: yes.
2. Jewelry not advanced, pool $26,000. Default: yes (an advanced variant is 3 commands later: `advanced true`, ground-floor lockdown boxes, T27 to `effect=alarm`).
3. Mechanics order M1, M2, M3, or none at launch. Default: none at launch; M1 first.
4. Names: "Rising City", "Jewelry Store", "Bank", "Museum", the Blue Heart, Box 167, The Diamond. Default: these.
5. A City Criminal Base lot x 506..550, z 356..410. Default: kept free, not built.

**Tests on the server before the setup (decision 2.9):**
- (a) a smash gate with no pile behind it as an entry (Jewelry G1; fallback P14);
- (b) a register-style pile in a non-store heist (Bank tills; fallback cash on 2 cells);
- (c) iron bars as a safe gate's blocks (Bank G6, Museum G8; fallback iron blocks drawn as a cage door);
- (d) cops pathing from each cop spot to the vault (Citizens range 100).

**Open questions (default in bold):**
- The octagon vault doors are 5 × 5 gate boxes (25 blocks, corners included) because a gate box must be solid. **Keep the corners as gate blocks** (drawn as frame); an octagon with open corners needs loot.sk to accept a non-box gate.
- L7 shares G1's cells (the skylight). **Keep it**: lockdown fills the smashed opening with bars; check that a lockdown over an open gate restores cleanly at the next opening.
- The Diamond Room's safe squares touch only at corners between bands. **Keep it** (a diagonal step is the puzzle) and test it in game; if the step can't be made, widen the touch to one block.
- The Bank's T1 cone (yaw 50, 30°, range 12) passes near G3's alcove. **Keep it**: the 3-deep alcove hides the keypad; `city.js check`'s cone test confirms.
- The Jewelry hologram (632.5, 70, 413.5) sits inside the region's forecourt. **Keep it** (a hologram is not an exit); move it to (636.5, 70, 413.5) if the hologram refuses a spot inside the region.
