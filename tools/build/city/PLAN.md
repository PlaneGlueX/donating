# Rising City: the site plan for the three heists east of the prison

Written 2026-10-27 from the judge's decision (`scratchpad/city/decision.md`, 2026-10-26): the Jewelry Store, the Bank and the Museum, Jailbreak's three city heists, on Main Avenue east of the prison.

Changed 2026-10-28 (owner): the Museum is replaced by the **Casino**, a d4 vault heist after GTA's Diamond Casino and Payday 2's Golden Grin, "so the server isn't a copy of Jailbreak", with a public gaming floor that works like GTA's (sections 6 and 7.4; the games are `design/casino-games.md`; the summary is `design/decision.md` section 9). The Jewelry Store and the Bank are unchanged.

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

Main Avenue carries the prison highway's profile on east from the last prison lamp (x 476) to a roundabout at x 810. Walking east a robber passes the three heists in level order: the **Jewelry Store**'s blue glass corner at Bank Street (level 5, not advanced), the green **Bank** tower one block north across Vault Street (level 20, advanced), and the white-and-gold **Casino** alone on its podium at the avenue's end (level 45, advanced: the finale; its gaming floor is an open public building, the heist is the two levels under it). It sits here because jewelry and bank on one street with the finale alone on a hill reads well from the avenue, because the land east of the prison and north of the town ridge (z ≤ 470) is free, and because the spacing keeps chases apart: Jewelry-Bank centres 94 (the Jewelry has no alarm), Bank-Casino 262 (a Bank chase never reaches the Casino). Vault Street is the back route that links all three; Bank Street north of z 280, x > 930 and a base lot stay free for later.

## 1. Frame, ground and heights

| Thing | Value |
|---|---|
| World | `jailbreak` now (`world` at launch) |
| City box | x 481..940, z 226..470, y 44..110 (`CITY`) |
| Ground | flat grass, top block y 64 (`GROUND_Y`); feet stand at y 65 |
| Floor convention | "floor y" is the floor block; feet stand at floor + 1 |
| Laser heights | above the feet where the robber stands: jump beams below 1.27 (0.4 low, 1.0 high-jump), duck beams 1.49..1.78 (1.65 used); a beam over a stair stands over a flat landing with known feet |
| Yaw | 0 S, 90 W, 180 N, −90 E |
| Tags | text displays `city_label`, item displays `city_display` |

Module boxes `[x1, z1, x2, z2]` (the module owns every column inside, y 44..110):

| Module | Box | Contains |
|---|---|---|
| `jewelry` | 596, 356 .. 639, 415 | the store, its alley (z 356..373), the fire escape, the forecourt |
| `bank` | 560, 280 .. 639, 321 | the tower, Hatch Plaza (x 560..590), the front plaza (x 629..639), the tunnel and shaft |
| `casino` | 820, 296 .. 920, 400 | the podium, the plaza, the terraces, the casino building, B1 / B2, the security tunnel (x 899..920), the drain tunnel (z 296..329) |
| `streets` | every other city column | section 3 |
| (free) | 506, 356 .. 550, 410; 931, 226 .. 940, 470; 664, 226 .. 930, 279 | nobody writes here: the base lot, the power-plant strip, the later blocks north of the channel |

Heist regions `[x1 y1 z1 .. x2 y2 z2]`:

| Region | Box | Size |
|---|---|---|
| `heist_jewelry` | 598 56 374 .. 634 97 414 | 37 × 42 × 41 = 63,714 |
| `heist_bank` | 595 47 280 .. 630 102 321 | 36 × 56 × 42 = 84,672 |
| `heist_casino` | 841 55 330 .. 898 71 371 | 58 × 17 × 42 = 41,412 (B1 and B2 only; the gaming floor, y ≥ 72, is outside) |

No region overlaps another or touches a safe zone. No exit, cop spot or bike lies in a region.

## 2. Map

```
 x: 481 490-505  560-590    597-628  640-663                776-787   820 ......... 920  931-940
z 226                                 | Bank |  ######## kept free (later blocks) z 226..279 ######## |power
z 280      .    [Hatch Plaza]  [BANK]  | St.  |            ~~~ storm channel z 280..295, floor y 59 ~~~   |plant
z 296   W  .== Hatch Lane ==== 595..630|      |            |leg|   [PODIUM x 820..920, z 300..400, y 72]|kept
z 321   e  .  (z 296..304)    region   |      |            |up |   [CASINO; region 841..898 x 330..371,|free
z 330      .                           |      |            |   |    y 55..71 under the floor] tunnel->x 920
z 340   s ===================== Vault Street z 340..355 ===============/     plaza z 372..400
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
| Vault Street (`VAULT_ST`) | z 340..355, x 490..787 | asphalt z 343..352, dash z 347..348, curbs z 342 / 353 |
| West Street (`WEST_ST`) | x 490..505, z 296..415 | asphalt x 493..502, curbs x 492 / 503 |
| Hatch Lane (`HATCH_LANE`) | x 506..559, z 296..304 | polished andesite (`MIX.plaza`), never concrete; into Hatch Plaza (bank module) |
| Storm channel (`CHAN`) | x 776..930, z 280..295 | floor y 59 polished andesite; stone-brick walls to y 64 on z 280, x 776, x 930 and z 295 (east of the leg), iron-bar rail at y 65; the **culvert mouth** x 868..870 in wall z 295 stays open (no rail, no wall) |
| Channel west leg (`LEG`) | x 776..787, z 296..339 | rises from y 59 to y 64 (`legFloor(z)`: 59 to z 296, + 1 every 8, 64 from z 336) into Vault Street's east end; walls on x 776 and 787 |

`drainFloor(z)` (59 + floor((z − 294) / 7)) is the casino's drain tunnel floor, in COMMON so the channel and drain meet: the casino module builds the drain, the streets module only leaves the mouth open.

### 3.2 Surface and furniture

- Asphalt `MIX.asphalt`, lines `white_concrete` / `yellow_concrete`, sidewalks `MIX.walk` (light gray), curbs `smooth_stone_slab` at top + 1, island grass with a shrub ring, lane and channel floor `MIX.plaza`.
- A 4-light junction at Bank Street × Main Avenue; stop bars at Vault Street × Bank Street and West Street.
- Street lamps (`streetLamp`) every 24 blocks on both avenue sidewalks, on Bank Street and Vault Street; none inside a module box. Street trees (`oak`, `shrub`) in the parking strip every 10 between bays.
- A "Rising City" sign on the roundabout island (a text-display label, `city_label`), and the POI there (section 7.6).
- The ramp wall gets a lamp at x 846, 862, 878. The channel rail is iron bars on the wall tops.

### 3.3 Rules

- Every street surface at y 64 is a road block only where the GPS should read a street (asphalt and lines); plazas, the lane, the channel and the ramp's top are `MIX.plaza` / stone (section 9.2's open-sky rule; `city.js check`, 9.3).
- Nothing the streets module writes is inside a module box or a kept-free box (`own` refuses it anyway).

## 4. The Jewelry Store (module `jewelry`; heist `jewelry`, difficulty 2, level 5, not advanced)

### 4.1 Theme

Jailbreak's black-framed blue-glass corner store and its vertical smash-and-grab: smash in at the red X, empty the showroom and basement cases, climb two laser floors, leave over the roof (exit only: the fire escape, the vent and the deck ladder all end in a drop) to the bikes. Grafted on: Payday's one-Duffel stone (the **Blue Heart**, $6,000, in the manager's safe at the top), a counter turret over the showroom (sneak along the walls), a blinking 3-beam **VIP curtain** at the office door, and a fire escape into an alley with stolen bikes. No cops: the threat is traps, the clock and other robbers.

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
- **Basement**: ring counter on the west wall (front x 603, z 390..399), watch counter on the east wall (front x 628, z 391..398), the aisle between; the **workshop** x 610..621, z 403..408; its south wall z 409 holds the small safe G9 (x 615..616, y 59..60), and the repair tray P13 sits in a niche behind it at z 410 (y 58, air 59..60, solid above).
- **Obby 1**: crossed east to west. Partition x 615..616 (gap z 405..410). Low beams (y 73.4, jump) and duck beams (y 74.65, 1.65 over the floor) mixed; every z-running beam spans z 377..404, so the north strip is covered. Twelve 1-high stepping blocks (full light_blue_stained_glass at y 73; standing on one, feet 74, the low beams pass under your feet and you never have to jump next to a duck beam): east half (618, 385), (623, 386), (629, 391), (623, 393), (618, 396), (624, 401); west half (612, 401), (607, 403), (603, 395), (609, 393), (604, 386), (610, 385). Mid-floor landing with P8 at x 615..616, z 407..408.
- **Obby 2**: crossed west to east; five pillar pairs (a pillar on the north wall z 377 and one on the south wall z 410) at x 604, 609, 614, 619, 625, each pair joined by a blinking beam across the full floor (z 377..410): low (80.4, jump) or duck (81.65), at most 2 beams a line (x 625.5 has a low and a duck in turn: one is always on, jump or duck by which); landing P9 at x 622..623, z 389..390; exit landing NE with the **fuse box** prop at (630, 81, 389) (M2; a plain breaker prop until then).
- **Final floor** (4 high, feet 87): two flights A and B at x 611..613 up to the huts, each with a flat landing at feet 90 (floor block y 89; the roof slab cut above it) where its duck laser hangs (T22 / T23 at 91.65 = feet + 1.65). Flight A climbs north: feet 88 at z 388, 89 at z 387, landing z 384..386, feet 91 at z 383, 92 at z 382 (the north hut). Flight B climbs south: feet 88 at z 389, 89 at z 390, landing z 391..393, feet 91 at z 394, 92 at z 395 (the west hut's south end); the landing P10 at x 624..625, z 380..381; the **manager's office** in the south half behind a glass-pane wall at z 398 whose 2-wide doorway x 615..616 is the VIP curtain; the office wall safe G10 at x 615..616, z 405 in a polished_blackstone frame; a closet x 612..619, z 406..410.
- **Roof** (exit only: nothing climbs onto it from outside, so G1 is the only way in and every floor is on the way up): two calcite huts in an L (x 606..614, z 377..397) with three open doorways (no door blocks): north to the landing z 374..375 and the steel **fire escape** z 370..373 (outside the region) down to the alley, its lowest rung 4 blocks above the alley (y 69: a drop, no climb); west to the **vent shaft** x 598..599, z 388..389 (2 × 2 outside the west wall, sealed from the obby floors), its ladder ending 3 blocks above the shaft floor (y 68 over floor 64), entering the ground floor through the west wall at z 388..389; east to a deck on the region's east forecourt (x 632..634, z 389..393, y 91) with a ladder at x 632, z 391 ending 4 blocks above the forecourt (y 69).

### 4.3 The robbery

1. In: smash the X window G1 from the forecourt (the clock starts, 6:00). The only way in: the fire escape, the vent and the deck ladder start 3-4 blocks up.
2. Showroom: the five islands G2-G6 / P1-P5 under three low lasers and the counter turret T4 (sneak to stay out of its 6-block range).
3. Basement: rings G7 / P6, watches G8 / P7, three blinking lasers, the workshop safe G9 / P13 (the no-climb safe for Mara c2).
4. Obby 1, obby 2: lasers and loose gems P8, P9.
5. Final floor: duck lasers, gems P10, the curtain, the office turret T27 (over the curtain inside the office, looking north at the doorway: the keypad at z 403..404 is behind it), the safe G10 with office cash P11 and the Blue Heart P12.
6. Out: north hut, the fire escape (drop into the alley), alley bikes or Vault Street west; the vent (drop to the ground floor and out the X window); the deck ladder (drop to the forecourt); or back down and out the X window.

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
- **Back (west)**: a blank wall onto Hatch Plaza and the **manhole**: a 1 × 1 open shaft at x 575, z 300 (top y 64, no trapdoor), its ladder on the west wall (ladders at x 575 facing east, against solid x 574) all the way down, and an iron-bar ring round it at y 65 with a 1-wide gap on the ladder side; four andesite_wall bollards at the ring's corners.
- **Inside**:
  - Lobby: prismarine-brick and dark-prismarine floor, pale gray walls. Teller counter on the west side: a 6 × 2 blue-glass screen G1 (x 603, z 297..302) over three register tills at x 600 (P1-P3). The **mezzanine stair** climbs west along the lobby's north side, x 608..613, z 289..290 (feet 65 at x 613 up to feet 70 at x 608), onto the mezzanine (feet 71) at x 607, z 289..290; the mezzanine office x 597..606, z 283..287 (door at z 288) and its wall safe G2 (x 601..602, z 284, y 71..72). SW corner: the **security gate** G3 (3 × 3 iron-block door with a keypad prop, x 599..601, z 316) in a 3-deep alcove, then stairs down. The stairwell runs inside x 597..606.
  - B1: the bay x 599..606, z 291..312 (red_nether_bricks floor, iron-block and polished_blackstone walls). The counting room x 608..614, z 300..308 off the bay, three plates at its doorway, cash tables P4. Stairs down at the far (north) end.
  - B2: the antechamber; the vault door G4 (a 5 × 5 face at x 614, z 298..302, y 49..53: polished_deepslate X, chiseled stone wheel) and the barred viewing port beside it; the **vault** x 615..626, z 293..306 (froglight-lit): gold pallets P6, P7, cash trolley P8, deposit walls P9, P10, **Box 167** G5 (x 623, z 307) with P11, the **Reserve cage** G6 (x 623..625, z 303) with P12. West: the exit vestibule x 596..601 (lasers T16-T18) ending in the alternate exit G7 in the region's west face (x 595, z 299..300, y 49..51: opens only from inside).
  - Outside the region: the tunnel x 576..594, z 299..300, floor y 48 (feet 49..52), to the shaft x 575, z 300 and its ladder up to the manhole.

### 5.3 The robbery

Quiet: tills (sneak past the teller camera T19), the mezzanine safe (camera T2 watches the mezzanine stair's top, not the office or the safe), the security gate (camera T1 sweeps the floor in front of the alcove), the bay (jump, duck, time the blinking wall T9-T10; jump the two alarm lasers T11-T12), the counting room. Loud: mount the drill on G4 (alarm), crack G7 while it drills, defend the antechamber while the cops come down, load, leave by the tunnel and the manhole to Hatch Lane (cold; the cops come from Bank Street), or out the front (hot).

Tools: a robber carries at most 1 Drill and 3 Safe Kits (core.sk `tool::drill::max`, `tool::safe-kit::max`). **Box 167 (G5) is a crew objective**: its drill is a second Drill, so a solo robber either drills it on a second trip or leaves it. Solo, the kits go G3, G6 and G7 (the cold exit); a solo robber who wants G2 too leaves by the front instead of G7.

## 6. The Casino (module `casino`; heist `casino`, difficulty 4, level 45, advanced: the finale)

Replaced the Museum on 2026-10-28 (owner). Same box, podium (the old mesa), ramp, plaza, exit, hologram, drain and channel bikes; everything on and under the podium is new.

### 6.1 Theme

A white-and-gold casino alone on its podium at the avenue's end. Its **gaming floor is a normal open building**: no region, open to everyone at any time, the games are casino.sk's (`design/casino-games.md`). casino.sk and its slot and table models don't exist yet: they are a separate system (the owner's 2026-10-28 request, planned on its own, not one of M1-M3). The heist doesn't depend on them; until they exist the floor launches with static props (below). The heist is the **back of house under the floor**: B1 security and cash, B2 the vault level. The region never covers the floor, so the floor stays usable while the heist runs or cools down.

From GTA's Diamond Casino: a staff door off the floor with a keypad (the quiet way in), the armored-car **security tunnel** (the loud way in, and the cops' way in), the **mantrap** before the vault (M2: two keycard readers within 3 s), cash trolleys, the **daily vault** cage beside the main vault, vault contents that change (M1). From Payday 2's Golden Grin: the counting room's **cash cage**, the **security PC** that drops lasers (M2), and the **high-roller deposit room** behind a quiet drilled shutter and a moving laser wall (the Dentist's room). The getaway is the drain to the storm channel bikes (GTA's sewer). Not taken (each needs a new mechanic): disguises, guards on patrol, Golden Grin's three briefcase digits, the BFD's upkeep, a C4 hole from a roulette table into the vault (the floor is outside the region).

### 6.2 Footprint and levels

- **Podium** (the old mesa, same box): x 820..920, z 300..400, top y 72, 8-block retaining walls of polished andesite over stone bricks, built closed (hollow is fine if sealed), with B1, B2, the security tunnel and the drain carved in. The plaza x 841..898, z 372..400 (polished andesite with calcite bands; preview polished andesite), a fountain at x 846..855, z 382..391 (clear of the exit spot). Terraces on each side with stairs down the podium walls at x 822..824 and x 916..918 (outside the region; the east stairs keep clear of the tunnel portal, z 351..356). The ramp road reaches the plaza at x 887..894.
- **Casino building** (public, outside the region): x 843..896, z 331..371, floor slab y 72, one double-height gaming hall y 73..83, roof y 84 (smooth_quartz; preview calcite), the marquee tower x 862..877, z 365..371 to y 97.
- **Region** `heist_casino` x 841..898, z 330..371, y 55..71 = 58 × 17 × 42 = **41,412**: B1 and B2 only, its top the underside of the floor slab. A robber on the gaming floor is never in the heist.

| Level | Floor slab y | Interior y |
|---|---|---|
| B2 vault level | 56 | 57..62, ceiling 63 |
| B1 security and cash | 64 | 65..70, ceiling 71 (the false floor's pit 61..63) |
| Gaming floor (public) | 72 | 73..83 |
| Roof | 84 | marquee tower to 97 |

- **Outside**: calcite and smooth_quartz walls; gold_block pilasters every 6 blocks; yellow_stained_glass bands; an ochre_froglight cornice; a black_stained_glass canopy over the entrance; "CASINO" as gold `city_label` text on the marquee. No windows below y 73.
- **Doors** (open, no door blocks): the public entrance 8 × 5 in the south face (x 866..873, z 371, y 73..77); the staff doorway off the floor (x 849, z 348..349, y 73..75); the tunnel portal in the podium's east face (x 920, z 352..355, y 65..68).
- **Launch fallback for the floor**: until casino.sk exists the slots, tables, wheel and cashier are static `city_display` item displays over barriers (the same models later, or plain block props: a slot is a polished_blackstone cabinet with a light_blue_stained_glass screen and a lever-free face; a table green_carpet on dark_oak slabs), nothing clickable; the hall reads as a closed-for-renovation casino with its staff door still there.
- **Gaming floor** (y 73; the games and their numbers are casino-games.md; furniture as `city_display` item displays over barriers, nothing with a menu): the **cashier cage** x 850..858, z 351..358 (counter x 858; the cashier at (854.5, 73, 354.5) facing east); four rows of six slot machines x 862..884 at z 335, 339, 343, 347; the **table pit** z 352..362: blackjack at (866.5, 73, 357.5) and (874.5, 73, 357.5), roulette at (884.5, 73, 357.5); the **Lucky Wheel** on a podium x 868..871, z 363..366 facing the entrance; the **Inside Track** screen on the east wall (x 895, z 333..345, y 75..81) with 6 seats at x 889..890; the **staff corridor** x 844..848, z 332..350 behind a wall at x 849 (the staff doorway), with the stair hole x 844..846, z 341..344 (cut through the floor slab y 72 and B1's ceiling y 71; over z 338..340 both stay solid, so the lockdown bars L1 at z 338 meet a solid ceiling). These are the module's `points`: CASHIER, BJ_1, BJ_2, ROULETTE, WHEEL, SLOT_1..SLOT_24, TRACK.
- **Inside the region**:
  - **B1** (feet 65):
    - The staff stair x 844..846 from the floor (top step z 345, feet 73) down north to z 338 (feet 66); the landing x 843..847, z 332..337. The **staff door** G1 (2 × 3 iron with a keypad prop) at x 848, z 334..335.
    - The **corridor** x 849..896, z 333..336. North wall z 332 with the maintenance alcove x 866..871, z 331..332 and the **drain hatch** G7 in the region's north face (x 868..869, z 330, y 65..66: opens only from inside). Doorways 2 × 3 in its south wall z 337 at x 854..855 (security), 870..871 (counting), 884..885 (office); x 893..896 open onto the back stair. A false floor x 874..877, z 333..335 (T6; z 336 stays a 1-wide strip).
    - The **security room** x 849..861, z 338..349: a monitor wall (block mosaic) on z 350, desks, the **security PC** prop at (851, 66, 344) (M2; a prop until then), Seized cash P1.
    - The **counting room** x 863..879, z 338..349: the **cash cage**, a glass front G2 at z 343, x 867..875, y 65..66 (smash, alarm), permanent glass above it (y 67..70) and iron bars from x 863..866 and 876..879; plates T7-T9 at z 342; behind it the cash carts P2, P3 and the chip racks P4.
    - The **manager's office** x 881..891, z 338..349: the wall safe G3 (x 889..890, y 66..67, z 350) over a niche at z 351 with the stash P5.
    - The **back stair** x 893..896, z 338..345, down south from feet 65 at z 338 to feet 58 at z 345, landing z 346..349 at feet 57 (B1's floor open above it, walled at x 892).
    - z 351..369 apart from the niche: sealed.
  - **B2** (feet 57):
    - The stair landing x 893..896, z 346..349, a passage x 891..892, z 346..349 west into the **loading bay** x 885..890, z 346..358.
    - The **security tunnel**'s inner end, a passage x 891..898, z 352..355 (4 high) from the bay to the region's east face; the alarm curtain T13-T14 at x 893.5.
    - The **mantrap** x 877..883, z 353..355, from the bay (its west wall x 884) to the antechamber: the moving laser wall T16-T18 at x 880.5 (three blinking beams, a 0.5 s all-dark window each 3 s cycle), and two keycard readers (props until M2) on the bay's west wall at (884, 58, 351) and (884, 58, 357).
    - The **antechamber** x 862..876, z 349..359: north wall z 348 with the deposit shutter G4 (x 868..870, y 57..59, iron and tinted glass), south wall z 360 with the daily vault cage G6 (x 868..870, y 57..59, iron bars; test 2.9c), west wall x 861 with the **vault door** G5 (a 5 × 5 round face, x 861, z 352..356, y 57..61: polished_deepslate ring, gold_block bolts, a chiseled stone hub).
    - The **deposit room** x 864..874, z 340..347: the moving laser wall T19-T21 at z 345.5, the deposit boxes P6 on a ledge (y 58) along the back wall, the high roller's case P7 on a plinth.
    - The **daily vault** x 866..872, z 361..366: Daily cash P13.
    - The **vault** x 846..860, z 344..368 (gold-lit, froglights): cash trolleys P8, P9, Vault gold P10, Vault art P11, and the Diamonds P12 on a central plinth under the turret T22 (in the ceiling straight above it: sneak to take them).
  - Outside the region: the **security tunnel** x 899..920, z 352..355, 4 high, feet clamp(57 + floor((x − 901) / 2), 57, 65) (57 to x 902, 65 from x 917), out through the portal onto the grass east of the podium; the **drain** x 868..870, z 296..329, floor `drainFloor(z)`, 3 high, out of the podium's north face through the culvert mouth into the storm channel.

### 6.3 The robbery

Quiet: walk in off the gaming floor through the staff doorway and down the stair, crack the staff door G1 (T1 has its back to it). B1: corridor cameras T1-T2 and the ankle laser T5 trip the alarm; jump T3, duck T4, keep to the strip past the false floor T6. Seized cash; the manager's safe G3 (quiet); the cash cage G2 is loud (rob it last or skip it). Down the back stair; the bay camera T15 sweeps the landing passage and the tunnel mouth. The mantrap: time the moving laser wall (with M2, two robbers swipe the readers within 3 s and it goes dark for the run). In the antechamber the deposit shutter G4 drills quietly (60 s, 2 jams; **a crew objective**: a robber carries one Drill, and G5 needs it), then the deposit room's laser wall; the vault door G5 is loud (90 s, 3 jams): drill it, crack the daily vault G6 while it drills, hold the antechamber against the cops coming in by the tunnel and the mantrap. Solo, the Safe Kits go G1, G6 and G7 (all three a robber carries): the manager's safe G3 is for a crew or a second trip. Loud: in by the security tunnel past the curtain T13-T14 and straight to the drills. Out: the drain (cold: back up the stair, west along the corridor, the hatch G7, the drain into the channel) or the tunnel (hot: every cop spot is at its portal). On foot the chase radius is 100 from the chase centre (869.5, 63.5, 350.5): the leg's foot at x 781 is just past it. A bike doubles it to 200 for the rest of the chase (heists.sk heistChaseRadius, `alarm::car-chase-factor` 2), so a robber who takes a channel bike must ride up the leg and west along Vault Street past Bank Street to x ≤ 669 (the GPS hand path 3025-3024-3023-3022-3021-3014 runs it). The alarm bars the staff stair (L1), so once the cops come nobody leaves through the gaming floor and the chase never runs across it.

## 7. Gameplay: regions, spots and the setup commands

Players stand at y 65 unless noted. `W` = `jailbreak` now, `world` at launch. Each line of `city.js setup` is tagged (G) in game, (C) console, (L) launch only. Loot syntax as in CLAUDE.md: gates first (gate k is the k-th added; `behind=k` names it), then piles, then `/dloot check`. The `#` notes in the blocks below are for the reader: `city.js setup` strips everything from `#` to the end of a line and drops note-only lines.

### 7.1 Regions

Every region gets `passthrough allow`.

| Region | Box | Notes |
|---|---|---|
| `heist_jewelry` | 598 56 374 .. 634 97 414 | 63,714 |
| `heist_bank` | 595 47 280 .. 630 102 321 | 84,672; the tunnel and shaft stay outside (x < 595) |
| `heist_casino` | 841 55 330 .. 898 71 371 | 41,412; B1 and B2 only: the gaming floor (y ≥ 72), the security tunnel (x > 898) and the drain (z < 330) stay outside |
| `district_rising_city` (L) | 481 44 226 .. 940 110 470 | `/ddistrict name rising_city Rising City` |

```
(G) //pos1 598,56,374
(G) //pos2 634,97,414
(G) /rg define heist_jewelry
(G) //pos1 595,47,280
(G) //pos2 630,102,321
(G) /rg define heist_bank
(G) //pos1 841,55,330
(G) //pos2 898,71,371
(G) /rg define heist_casino
(C) rg flag -w W heist_jewelry passthrough allow
(C) rg flag -w W heist_bank passthrough allow
(C) rg flag -w W heist_casino passthrough allow
(L) //pos1 481,44,226
(L) //pos2 940,110,470
(L) /rg define district_rising_city
(C) rg flag -w world district_rising_city passthrough allow
(L) /ddistrict name rising_city Rising City
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
(G) /dtrap add jewelry camera 615.5 70.5 379.5 0 25 effect=damage damage=1 angle=30 range=12 sweep=70 period=6 every=1.0   # T4 counter turret
(G) /dtrap add jewelry laser 604.0 58.4 389.5 628.0 58.4 389.5 damage=1.5 blink=true on=2 off=1.5 offset=0
(G) /dtrap add jewelry laser 604.0 58.4 394.5 628.0 58.4 394.5 damage=1.5 blink=true on=2 off=1.5 offset=0.7
(G) /dtrap add jewelry laser 604.0 58.4 399.5 628.0 58.4 399.5 damage=1.5 blink=true on=2 off=1.5 offset=1.4
(G) /dtrap add jewelry laser 617.0 73.4 388.5 631.0 73.4 388.5 damage=2           # T8  obby 1 east
(G) /dtrap add jewelry laser 617.0 74.65 398.5 631.0 74.65 398.5 damage=2         # T9  (duck)
(G) /dtrap add jewelry laser 620.5 73.4 377.0 620.5 73.4 404.0 damage=2           # T10
(G) /dtrap add jewelry laser 626.5 74.65 377.0 626.5 74.65 404.0 damage=2         # T11 (duck)
(G) /dtrap add jewelry laser 601.0 73.4 398.5 615.0 73.4 398.5 damage=2           # T12 obby 1 west
(G) /dtrap add jewelry laser 601.0 74.65 388.5 615.0 74.65 388.5 damage=2         # T13 (duck)
(G) /dtrap add jewelry laser 605.5 73.4 377.0 605.5 73.4 404.0 damage=2           # T14
(G) /dtrap add jewelry laser 611.5 73.4 377.0 611.5 73.4 404.0 damage=2           # T15
(G) /dtrap add jewelry laser 604.5 80.4 377.0 604.5 80.4 410.0 damage=2 blink=true on=1.5 off=1.5 offset=0       # T16 obby 2, pair 1 (low)
(G) /dtrap add jewelry laser 609.5 81.65 377.0 609.5 81.65 410.0 damage=2 blink=true on=1.5 off=1.5 offset=0.5   # T17 pair 2 (duck)
(G) /dtrap add jewelry laser 614.5 80.4 377.0 614.5 80.4 410.0 damage=2 blink=true on=1.5 off=1.5 offset=1       # T18 pair 3 (low)
(G) /dtrap add jewelry laser 619.5 81.65 377.0 619.5 81.65 410.0 damage=2 blink=true on=1.5 off=1.5 offset=1.5   # T19 pair 4 (duck)
(G) /dtrap add jewelry laser 625.5 80.4 377.0 625.5 80.4 410.0 damage=2 blink=true on=1.5 off=1.5 offset=2       # T20 pair 5 (low)
(G) /dtrap add jewelry laser 625.5 81.65 377.0 625.5 81.65 410.0 damage=2 blink=true on=1.5 off=1.5 offset=0.5   # T21 pair 5 (duck, in turn with T20)
(G) /dtrap add jewelry laser 611.0 91.65 385.5 614.0 91.65 385.5 damage=2         # T22 flight A landing (feet 90, duck)
(G) /dtrap add jewelry laser 611.0 91.65 392.5 614.0 91.65 392.5 damage=2         # T23 flight B landing (feet 90, duck)
(G) /dtrap add jewelry laser 615.0 87.4 398.5 617.0 87.4 398.5 damage=1 blink=true on=2 off=2 offset=0     # T24 VIP curtain
(G) /dtrap add jewelry laser 615.0 88.0 398.5 617.0 88.0 398.5 damage=1 blink=true on=2 off=2 offset=0     # T25
(G) /dtrap add jewelry laser 615.0 88.65 398.5 617.0 88.65 398.5 damage=1 blink=true on=2 off=2 offset=0   # T26
(G) /dtrap add jewelry camera 615.5 90.0 401.5 180 35 effect=damage damage=1 angle=25 range=5 every=1.0   # T27 office turret: inside, over the curtain, looking north at the doorway
# cops (unused while not advanced), hologram, open
(G) /dcops jewelry add 596.5 65 417.5
(G) /dcops jewelry add 662.5 65 417.5
(G) /dheist snapshot jewelry
(G) /dheist holo jewelry 632.5 70 413.5
(G) /dheist enable jewelry
(C) dbike spotat jailbreak 601.5 65 360.5 90
(C) dbike spotat jailbreak 603.5 65 360.5 90
(C) dbike spotat jailbreak 605.5 65 360.5 90
```

With M1 (later): obby 1 group `obby1` gets a second layout "gems" (six low / mid lasers along x: east half x 617→631 at z 383.5 y 74.0, z 393.5 y 74.65, z 403.5 y 74.0; west half x 601→615 at z 403.5 y 74.65, z 393.5 y 74.0, z 383.5 y 74.65); obby 2 group `obby2` gets "classic" (x 601→615 low z 382.5, mid z 391.5, low z 401.5; x 617→631 mid z 402.5, low z 393.5, mid z 384.5; low 80.4, mid 81.65). With M2: `/dtrap set` T24-T26 `tag curtain` and a fuse box at (630, 81, 389).

### 7.3 Bank (`bank`)

Settings: advanced true, escape 8:00, cooldown 15:00, level 20, pool 80000, police true. Exit (636.5, 65, 300.5) yaw −90; hologram (633.5, 71, 300.5). Chase centre (612.5, 74.5, 300.5). PROPOSAL (core.sk, owner's call): `difficulty::3::alarm::warning` 25, `::max-cops` 5, `::pool` 5, `::heavy-from` 4.

```
(G) /dheist create bank 3
(G) /dheist set bank name Bank
(G) /dheist set bank advanced true
(G) /dheist set bank pool 80000
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
(G) /dtrap add bank camera 612.5 73.5 288.5 70 15 effect=alarm angle=20 range=9                       # T2 mezzanine stair top
(G) /dtrap add bank laser 599.0 57.4 310.5 607.0 57.4 310.5 damage=2    # T3 bay low
(G) /dtrap add bank laser 599.0 57.4 307.5 607.0 57.4 307.5 damage=2    # T4
(G) /dtrap add bank laser 599.0 57.4 300.5 607.0 57.4 300.5 damage=2    # T5
(G) /dtrap add bank laser 599.0 57.4 297.5 607.0 57.4 297.5 damage=2    # T6
(G) /dtrap add bank laser 599.0 58.65 305.5 607.0 58.65 305.5 damage=2  # T7 duck
(G) /dtrap add bank laser 599.0 58.65 298.5 607.0 58.65 298.5 damage=2  # T8
(G) /dtrap add bank laser 599.0 57.4 302.5 607.0 57.4 302.5 damage=2 blink=true on=2 off=2 offset=0     # T9 timed wall (low)
(G) /dtrap add bank laser 599.0 58.65 302.5 607.0 58.65 302.5 damage=2 blink=true on=2 off=2 offset=2   # T10 (duck, in turn with T9)
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
(G) /dheist lock bank add 628 65 303 628 76 315 iron_bars    # L2 front glass south (stops short of the pylon x 625..628, z 316..319)
(G) /dheist lock bank add 608 65 282 627 75 282 iron_bars    # L3 north side glass
(G) /dheist lock bank add 608 65 319 624 75 319 iron_bars    # L4 south side glass (stops short of the pylon)
(G) /dheist lock bank add 607 71 292 607 74 315 iron_bars    # L5 mezzanine inner glass (the stair arrives at z 289..290, outside it)
(G) /dcops bank add 660.5 65 296.5   # Bank Street, level with the door
(G) /dcops bank add 660.5 65 305.5
(G) /dheist snapshot bank
(G) /dheist holo bank 633.5 71 300.5
(G) /dheist enable bank
(C) dbike spotat jailbreak 565.5 65 297.5 90
(C) dbike spotat jailbreak 565.5 65 303.5 90
```

With M1 (later): group `vault` picks one of two bays (P8b `620 49 303 621 49 305` cash, the second trolley); group `rare` (pick-chance) adds P13 `621 49 300` art piece=12000 take=6 (the Founder's Box); group `bay` adds T20-T24 (a moving wall at z 308.5, x 599.0..607.0: three beams at y 57.4 / 58.0 / 58.65, damage=1, blink on=1.5 off=1.5, offsets 0 / 0.5 / 1.0, a 0.5 s all-dark window each cycle; and at z 296.5 a low 57.4 and a duck 58.65, damage=1, on=1.5 off=1.5, offsets 0 / 1.5, in turn; never more than 3 beams a line). With M2: a breaker box at the bay entry `tags=bay hold=3 for=45 rearm=90` (T3-T10 tagged `bay`). With M3: G7 becomes `blast fuse=10 alarm=true`.

### 7.4 Casino (`casino`)

Settings: advanced true, escape 10:00, cooldown 30:00, level 45, pool 240000, police true. Exit (869.5, 73, 380.5) yaw 0 on the plaza; hologram (869.5, 80, 373.5) on the marquee. Chase centre (869.5, 63.5, 350.5).

```
(G) /dheist create casino 4
(G) /dheist set casino name Casino
(G) /dheist set casino advanced true
(G) /dheist set casino pool 240000
(G) /dheist exit casino 869.5 73 380.5 0
# gates (G1..G7)
(G) /dloot add casino safe 848 65 334 848 67 335                               # G1 staff door keypad (the quiet way in)
(G) /dloot add casino smash 867 65 343 875 66 343 alarm=true                   # G2 cash cage glass
(G) /dloot add casino safe 889 66 350 890 67 350                               # G3 manager's wall safe
(G) /dloot add casino drill 868 57 348 870 59 348 time=60 jams=2 alarm=false   # G4 deposit-room shutter (quiet)
(G) /dloot add casino drill 861 57 352 861 61 356 time=90 jams=3 claim=10      # G5 vault door (alarm)
(G) /dloot add casino safe 868 57 360 870 59 360                               # G6 daily vault cage (test 2.9c)
(G) /dloot add casino safe 868 65 330 869 66 330                               # G7 drain hatch (region face)
# piles (P1..P13)
(G) /dloot add casino pile 855 65 346 857 65 347 value=4000-8000 style=cash piece=1000 take=4 per-cell=2 name=Seized_cash
(G) /dloot add casino pile 867 65 346 869 65 347 value=10000-20000 style=cash piece=2000 take=4 per-cell=2 behind=2 name=Cash_cart
(G) /dloot add casino pile 873 65 346 875 65 347 value=10000-20000 style=cash piece=2000 take=4 per-cell=2 behind=2 name=Cash_cart
(G) /dloot add casino pile 867 65 349 875 65 349 value=5000-10000 style=goods piece=1000 take=4 behind=2 name=Chip_racks
(G) /dloot add casino pile 889 65 351 890 65 351 value=4500-9000 style=cash piece=1500 take=4 per-cell=4 behind=3 name=Manager_stash
(G) /dloot add casino pile 866 58 340 872 58 340 value=10000-20000 style=goods piece=2000 take=4 per-cell=2 behind=4 name=Deposit_boxes
(G) /dloot add casino pile 869 57 343 869 57 343 value=10000-20000 style=goods piece=5000 take=5 per-cell=4 behind=4 name=High_roller_case
(G) /dloot add casino pile 848 57 346 850 57 348 value=15000-27000 style=cash piece=1500 take=4.5 per-cell=2 behind=5 name=Cash_trolley
(G) /dloot add casino pile 848 57 362 850 57 364 value=15000-27000 style=cash piece=1500 take=4.5 per-cell=2 behind=5 name=Cash_trolley
(G) /dloot add casino pile 855 57 346 858 57 348 value=21000-36000 style=gold piece=1500 take=4.5 behind=5 name=Vault_gold
(G) /dloot add casino pile 855 57 363 858 57 364 value=20000-35000 style=art piece=5000 take=6 behind=5 name=Vault_art
(G) /dloot add casino pile 853 57 354 853 57 354 value=25000-50000 style=jewel piece=12500 take=10 behind=5 name=Diamonds
(G) /dloot add casino pile 866 57 364 872 57 364 value=15000-27000 style=cash piece=1500 take=4 per-cell=4 behind=6 name=Daily_cash
(G) /dloot check casino
# traps (T1..T22)
(G) /dtrap add casino camera 850.5 69.0 334.5 -90 20 effect=alarm angle=25 range=12 sweep=60 period=8   # T1 corridor west (its back to G1)
(G) /dtrap add casino camera 895.5 69.0 334.5 90 20 effect=alarm angle=25 range=12 sweep=60 period=9    # T2 corridor east
(G) /dtrap add casino laser 858.5 65.4 333.0 858.5 65.4 337.0 damage=2       # T3 corridor low (jump)
(G) /dtrap add casino laser 860.5 66.65 333.0 860.5 66.65 337.0 damage=2     # T4 corridor duck
(G) /dtrap add casino laser 882.5 65.3 333.0 882.5 65.3 337.0 effect=alarm   # T5 ankle alarm laser
(G) /dtrap add casino floor 874 64 333 877 64 335 damage=2 depth=3          # T6 false floor (z 336 stays a strip)
(G) /dtrap add casino plate 868 65 342 damage=2   # T7 cash cage plates
(G) /dtrap add casino plate 871 65 342 damage=2   # T8
(G) /dtrap add casino plate 874 65 342 damage=2   # T9
(G) /dtrap add casino camera 871.5 69.5 338.5 0 30 effect=damage damage=1 angle=30 range=8 sweep=60 period=6 every=1.0   # T10 counting-room turret
(G) /dtrap add casino plate 884 65 338 damage=2   # T11 office doorway
(G) /dtrap add casino plate 885 65 338 damage=2   # T12
(G) /dtrap add casino laser 893.5 57.4 352.0 893.5 57.4 356.0 effect=alarm blink=true on=2 off=1.5 offset=0       # T13 tunnel curtain (jump)
(G) /dtrap add casino laser 893.5 58.65 352.0 893.5 58.65 356.0 effect=alarm blink=true on=2 off=1.5 offset=1.75  # T14 (duck)
(G) /dtrap add casino camera 885.5 61.5 357.5 -135 25 effect=alarm angle=25 range=12 sweep=60 period=8   # T15 loading bay
(G) /dtrap add casino laser 880.5 57.4 353.0 880.5 57.4 356.0 damage=1 blink=true on=1.5 off=1.5 offset=0      # T16 mantrap laser wall (dark 1.5..2.0 s of each 3 s)
(G) /dtrap add casino laser 880.5 58.0 353.0 880.5 58.0 356.0 damage=1 blink=true on=1.5 off=1.5 offset=0.5    # T17
(G) /dtrap add casino laser 880.5 58.65 353.0 880.5 58.65 356.0 damage=1 blink=true on=1.5 off=1.5 offset=1.0  # T18
(G) /dtrap add casino laser 864.0 57.4 345.5 875.0 57.4 345.5 damage=1 blink=true on=1.5 off=1.5 offset=0     # T19 deposit-room laser wall
(G) /dtrap add casino laser 864.0 58.0 345.5 875.0 58.0 345.5 damage=1 blink=true on=1.5 off=1.5 offset=0.5   # T20
(G) /dtrap add casino laser 864.0 58.65 345.5 875.0 58.65 345.5 damage=1 blink=true on=1.5 off=1.5 offset=1   # T21
(G) /dtrap add casino camera 853.5 62.5 354.5 0 90 effect=damage damage=1 angle=50 range=6.5 every=1.0   # T22 Diamonds turret (straight down; sneaking halves its range: sneak to take them)
# lockdown (iron bars), cops, hologram, open
(G) /dheist lock casino add 844 66 338 846 70 338 iron_bars   # L1 staff stair foot (the ceiling y 71 is solid over z 338..340: no gap over the bars)
(G) /dcops casino add 925.5 65 349.5   # C1 east lawn by the tunnel portal (every cop comes in by the tunnel)
(G) /dcops casino add 925.5 65 353.5   # C2
(G) /dcops casino add 925.5 65 358.5   # C3
(G) /dheist snapshot casino
(G) /dheist holo casino 869.5 80 373.5
(G) /dheist enable casino
(C) dbike spotat jailbreak 866.5 60 290.5 90
(C) dbike spotat jailbreak 869.5 60 290.5 90
(C) dbike spotat jailbreak 872.5 60 290.5 90
```

Numbers: 7 gates (4 safes, 2 drills, 1 smash) + 13 piles = 20 spots, 147 pieces at most. Value $164,500-309,000, average ~$236,750 (P1 6,000, P2-P3 15,000 each, P4 7,500, P5 6,750, P6 15,000, P7 15,000, P8-P9 21,000 each, P10 28,500, P11 27,500, P12 37,500, P13 21,000). Rates: Diamonds 1,250 $/s, the high roller's case 1,000, Vault art 833, cash carts and deposit boxes 500, the stash and daily cash 375, trolleys and gold 333, seized cash and chip racks 250. Clear time: piles 507.5 s + 1 smash 1.5 + 4 safes 120 + drills 61.5 + 91.5 = 782 s (13:02) vs 10:00: a crew only (and a solo robber's 1 Drill and 3 Safe Kits cover G1, G5, G6, G7 at most: G3 and G4 are crew objectives). Solo finale: stair and G1 0:45, B1 0:20, mantrap 0:30, vault drill 90 s + 3 jams through the warning and assault 1 (2:00, cracking G6 meanwhile), load 1:00, back up and out the drain to a bike 1:10 = ~5:45 of 10:00. Alarm sources: T1, T2, T5, T13-T15, G2, G5 (always); G4 is quiet. Alarm cameras stand down once the alarm runs. No camera sees G1, G3, G4, G5, G6 or G7 (rule 2.1; the Diamonds turret T22 is 7.5 from G5's face, past its range 6.5). The worst laser crossing at d4 is 3 beams × 2 hearts (damage=1 → round(1 × 2 × 1.75) / 2 = 2) = 6 hearts. Cops: all three spots stand on the east lawn by the tunnel portal (cops.sk takes the spots in turn, so a spot on the plaza or the roundabout would send cops that can't reach B2: L1 bars the staff stair and G7 opens only from inside). Getaway: on foot 100 blocks from the chase centre, 200 once on a bike (6.3).

With M1 (later): group `vault` picks 2 of 3 contents at each opening (cash: P8, P9; gold: P10; art: P11: GTA's vault of the day; `/dheist set casino pick vault 2`), and group `rare` (`pick-chance rare 0.35`) holds P12 Diamonds; run `/dloot check casino` again (the pool counts the 2 largest variants and the rare pile). With M2: the mantrap readers `/dswitch add casino 884 58 351 kind=lever link=mantrap need=2 within=3 tags=mantrap for=run miss=alarm name=Reader_A` and the same at `884 58 357 ... name=Reader_B` (T16-T18 tagged `mantrap`: two robbers within 3 s, GTA's mantrap), and the security PC `/dswitch add casino 851 66 344 kind=box tags=cams,deposit hold=3 for=60 rearm=120 name=Security_PC` (T1, T2, T15 tagged `cams`; T19-T21 `deposit`: Golden Grin's security hack). With M3: G4 may become `blast fuse=10 alarm=false` (GTA's thermal charge; the casino then has one drill).

### 7.5 Lockdown and cop rules (all three)

- Lockdown never boxes the last way out: the Bank's front doorway and alternate exit, the Casino's security tunnel and drain stay open (its one lock box bars only the staff stair to the public floor).
- Cops never open doors: every cop route is an open doorway (rule 2.5 of the decision). cops.sk takes a heist's spots in turn, so every spot must reach the vault within Citizens' range: the Bank's are on Bank Street level with the door, the Casino's at the tunnel portal. Test the paths (2.9d).
- Bikes stand outside every region, on block centres (.5); a bike doubles the chase radius (100 to 200) for the rest of the chase (the Casino's channel bikes: 6.3).

### 7.6 Points of interest and the phone map

- (L) `/dpoi add landmark Rising City` standing at (810.5, 65, 430.5) on the roundabout island.
- (C) `/dphone city scan -40 -30 940 1300 0 jailbreak` (prison, town and city in one map: 981 × 1331 pixels), then the hand paths (7.8).

### 7.7 Order of the setup (after a paste; not this run)

1. Regions (7.1).
2. Heists in level order: jewelry, bank, casino (7.2-7.4): `create`, `set name`, `exit`, gates, piles, `dloot check`, traps, locks, cops, `snapshot` (room clean), `holo`, `enable`.
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
| 3013 | 869.5 73 380.5 | CASINO_EXIT |
| 3014 | 651.5 65 347.5 | BANK_ST_VAULT |
| 3015 | 651.5 65 300.5 | BANK_FRONT |
| 3016 | 636.5 65 300.5 | BANK_EXIT |
| 3017 | 651.5 65 262.5 | BANK_ST_N |
| 3018 | 497.5 65 347.5 | WEST_ST_N |
| 3019 | 619.5 65 347.5 | VAULT_ALLEY |
| 3020 | 619.5 65 364.5 | ALLEY |
| 3021 | 781.5 65 347.5 | VAULT_E |
| 3022 | 781.5 65 337.5 | CH_LEG_TOP |
| 3023 | 781.5 60 295.5 | CH_LEG_FOOT |
| 3024 | 781.5 60 288.5 | CH_BEND |
| 3025 | 869.5 60 288.5 | CH_CASINO |
| 3026 | 869.5 60 294.5 | DRAIN_MOUTH |
| 3027 | 869.5 65 329.5 | DRAIN_TOP |
| 3028 | 497.5 65 300.5 | WEST_ST_HATCH |
| 3029 | 570.5 65 300.5 | HATCH_PLAZA |
| 3030 | 612.5 65 417.5 | JEWELRY_EXIT |

**Links**: 1002-3001, 3001-3002, 3002-3003, 3003-3030, 3003-3004, 3004-3005, 3005-3006; 3006-3007, 3007-3008, 3008-3009, 3009-3006; 3007-3010, 3010-3011, 3011-3012, 3012-3013; 3004-3014, 3014-3015, 3015-3016, 3015-3017; 3002-3018, 3018-3019, 3019-3014, 3019-3020, 3014-3021; 3021-3022, 3022-3023, 3023-3024, 3024-3025, 3025-3026, 3026-3027; 3018-3028, 3028-3029.

3027 DRAIN_TOP sits just outside the casino region (z 329), at the hatch; 3029 HATCH_PLAZA is beside the manhole.

## 8. COMMON (copy verbatim into every city module)

The town's helpers (section 9 of the town plan: the hash, `MIX`, `door`, `bed`, `rect`), two city mixes, the city's frame and street geometry, and the town's shared props. `tools/build/city/plan-layout.js` holds this exact text and is the source of truth; both files are generated together, so they never drift. Regenerated 2026-10-28 after the critique (BOX and REGION `casino`, `MIX.walk`, `LEG.z2` 339, `VAULT_ST`): `plan-layout.js` carries this exact text again.

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
  walk: [['light_gray_concrete', 100]],                                      // sidewalks (plain, as the prison's: jail/outdoors.js)
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
  casino: [820, 296, 920, 400]   // the podium (x 820..920, z 300..400, top y 72), the plaza, the casino, the tunnels
}
const BUILDINGS = Object.keys(BOX)
// the heist regions [x1, y1, z1, x2, y2, z2] (section 7.1)
const REGION = {
  jewelry: [598, 56, 374, 634, 97, 414],
  bank: [595, 47, 280, 630, 102, 321],
  casino: [841, 55, 330, 898, 71, 371] // B1 and B2 under the public gaming floor
}
// owned by nobody: no module writes a block here (the base lot, the power plant strip, the later blocks)
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
const RAMP = { x1: 830, x2: 894, z1: 402, z2: 409, curb: 401, wall: 410, top: 887 } // the ramp road up the podium's south wall
const BANK_ST = { x1: 640, x2: 663, road: [643, 660], z1: 230 }   // north from the avenue to z 230
const VAULT_ST = { z1: 340, z2: 355, road: [343, 352], x1: 490, x2: 787 }
const WEST_ST = { x1: 490, x2: 505, road: [493, 502], z1: 296 }   // north from the avenue to z 296
const HATCH_LANE = [506, 296, 559, 304]                            // polished andesite, into Hatch Plaza (bank module)
const CHAN = { x1: 776, x2: 930, z1: 280, z2: 295, floor: 59, mouth: [868, 870] } // the storm channel, walls at its edges
const LEG = { x1: 776, x2: 787, z1: 296, z2: 339 }                 // its west leg, up into Vault Street (which starts at z 340)

const rbD = (x, z) => Math.hypot(x + 0.5 - RB.cx, z + 0.5 - RB.cz)
const rampFeet = x => x >= RAMP.top ? 73 : 65 + Math.floor((x - RAMP.x1) / 8) // where feet stand on the ramp at column x
const legFloor = z => z <= 296 ? 59 : z >= 336 ? 64 : 59 + Math.floor((z - 296) / 8) // the leg's floor block
const drainFloor = z => 59 + Math.floor((z - 294) / 7) // the drain tunnel's floor block, z 296..329 (casino module)

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
  if (x >= LEG.x1 && x <= LEG.x2 && z >= LEG.z1 && z < VAULT_ST.z1) {
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
  // Bank Street, Vault Street, West Street (crossings are asphalt)
  const inBank = x >= BANK_ST.x1 && x <= BANK_ST.x2 && z >= BANK_ST.z1 && z < AVE.walk[0][0]
  const inVault = z >= VAULT_ST.z1 && z <= VAULT_ST.z2 && x >= VAULT_ST.x1 && x <= VAULT_ST.x2
  const inWest = x >= WEST_ST.x1 && x <= WEST_ST.x2 && z >= WEST_ST.z1 && z < AVE.walk[0][0]
  if (inBank || inVault || inWest) {
    const roadB = inBank && x >= BANK_ST.road[0] && x <= BANK_ST.road[1]
    const roadS = inVault && z >= VAULT_ST.road[0] && z <= VAULT_ST.road[1]
    const roadW = inWest && x >= WEST_ST.road[0] && x <= WEST_ST.road[1]
    if (roadB || roadS || roadW) {
      const dashB = roadB && !inVault && (x === 651 || x === 652) && z % 6 < 3
      const dashS = roadS && !inBank && !inWest && (z === 347 || z === 348) && x % 6 < 3
      return dashB || dashS ? { kind: 'line', top: 64, color: 'yellow' } : { kind: 'road', top: 64 }
    }
    const curb = (inBank && (x === 642 || x === 661)) || (inVault && (z === 342 || z === 353)) || (inWest && (x === 492 || x === 503))
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
| `streets` | `city/streets.js` | everything `ownerOf` calls `streets` | section 3: avenue, roundabout, spur, ramp, Bank / Vault / West Streets, Hatch Lane, storm channel and leg, lamps, trees, the city sign; the GPS export | ≤ 250K |
| `jewelry` | `city/jewelry.js` | `BOX.jewelry` | section 4 | ≤ 70K |
| `bank` | `city/bank.js` | `BOX.bank` | section 5 | ≤ 90K |
| `casino` | `city/casino.js` | `BOX.casino` | section 6 (the podium is most of it) | ≤ 200K |

About 610K blocks at most. Kept-free boxes and grass elsewhere: the world's flat ground is already grass at y 64, so no module lays plain grass.

**Shared rules:**
- Everything a module needs from another (street heights at a box edge, the drain floor, the region boxes) is in COMMON. No module requires another.
- Keep trees and tall things at least 4 blocks from your box's edge.
- A heist module builds its region's floor-to-roof shell closed: no gap that lets a robber in except the planned ways in.
- Traps ≥ 2 blocks inside the region edge; a pile's block is solid and the next 2 blocks up are air (anything higher may be open or a lid; loot.sk itself tests no air); gates solid and ≤ 27 blocks; smash gates full glass; safe and drill gates solid blocks as drawn (iron, iron bars where test 2.9c allows, polished_deepslate and gold vault faces) (rules 2.3, 2.4, 2.7).

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
const MODULES = ['streets', 'jewelry', 'bank', 'casino']
```

- `build()` runs each module into one Build, skipping a missing file with a warning; `CITY_ONLY=a,b` limits it. It exports `{ build, labels, points, setup, displays, gps }`.
- `node tools/build/city.js` prints blocks per module and the bounds.
- `city.js check [--registry <blocks.json>]` exits non-zero on any problem. It checks that:
  - every module's blocks lie in its own columns (`ownerOf`) and in the city box, and none in a kept-free box;
  - each heist region is under 100,000 blocks, regions don't overlap, and no region touches a safe zone;
  - exits, cop spots and bikes lie outside every region;
  - every pile cell's block is solid and the 2 blocks above it are air (higher air or a lid is fine); gate boxes are all solid and ≤ 27 blocks; no pile overlaps another;
  - traps are ≥ 2 blocks inside their region; collapsing-floor pits are ≥ 2 deep and inside the region;
  - no camera's cone (angle, range, sweep) contains a safe or drill gate's cells (rule 2.1);
  - no open-sky block at y 62..71 outside a street cell is a road block;
  - with `--registry`, every block state against the 26.1.2 registry.
- `city.js setup --world jailbreak|world` prints section 7's lines with real coordinates, tagged (G) / (C) / (L), one command a line, with every `#` note stripped (a line that is only a note is dropped).
- `city.js gps` writes `tools/city-gps-paths.txt`: `dphone path addat <W> ...` with ids, then the links.

Later only, with the owner's OK: `city.js paste [--box ...]` (plus `city_late` for wall-mounted blocks), `city.js labels` (kills `city_label` only), `city.js displays` (`city_display`).

## 10. New mechanics (later; every heist above works without them)

Each is a Skript change for a later run, in this order if the owner takes them. Until then the launch versions in section 7 stand, and nothing in the build depends on them (the fuse box and levers are props).

### M1. Pick groups (later; rank 1)

- `/dloot set <id> pick <group>[:<variant>]`, `/dtrap set <id> pick <group>[:<variant>]`; per heist `/dheist set <h> pick <group> <k>` and `pick-chance <group> <p>`.
- At each opening every group draws k variants (redraw once if it repeats last run's set); unpicked piles roll 0 pieces, unpicked gates are plain walls, unpicked traps aren't armed. Saved in memory, logged in loot.log.
- `/dloot check` and the 150-piece cap count the k largest variants; overlapping traps across variants of one group are allowed. `/dheist info` shows the picks; `/dheist pick` forces one for tests.
- Uses: Jewelry obby1 / obby2 layouts; Bank vault bay, bay lasers, the rare box; Casino vault of the day and its rare Diamonds. About 120-150 lines over loot.sk, traps.sk, heists.sk.

### M2. Security switches (later; rank 2)

- Trap tags (`/dtrap set <id> tag <t>`) and `/dswitch add <h> [x y z] kind=lever|box tags=... [hold] [for=<s>|run] [rearm] [quiet] [link need within] [miss=alarm|none] [lift=<lock ids>] [name]`, at most 8 a heist, ≥ 2 inside the region.
- A lever flips once per run; a box is a hold (loot.sk's hold rules). Linked switches fire when `need` different robbers pull within `within` s. Firing silences tagged traps for `for` s and clears the `lift` lockdown boxes; 5 s before power returns the lasers flicker.
- Uses: Casino mantrap readers (two robbers within 3 s: the mantrap lasers off for the run) and security PC (cameras and the deposit-room lasers off 60 s); Bank breaker (bay lasers 45 s); Jewelry fuse box (curtain 60 s). About 120 lines.

### M3. Blast charges (later; rank 3)

- Gate kind `blast` in loot.sk: `/dloot add <h> blast [corners] [fuse=10] [alarm] [claim=6] [radius=4] [damage=3]`, ≤ 27 blocks, refused in stores.
- Hold 2 s to plant (no item), a countdown display, then a bang with no block damage: players within `radius` take `damage`, the gate opens for the run, an advanced heist's alarm trips unless `alarm=false`.
- Uses: Bank G7 (fuse 10, alarm), Casino G4 (the deposit shutter as a thermal charge, quiet; optional). About 80 lines.

## 11. Checks every builder runs before handing back (all offline)

```bash
cd "/c/Users/matti/OneDrive/Desktop/Donating Test Server"
SP="<your scratchpad>"
tools/node/node.exe tools/build/render.js tools/build/city/<module>.js "$SP/city-render/<module>" --views top,plan,iso --y 65,73 --px 6
tools/node/node.exe tools/build/render.js tools/build/city/plan-layout.js "$SP/city-render/plan" --views top --px 2   # where your box sits
tools/node/node.exe tools/build/city.js check --registry <blocks.json>   # once city.js exists
tools/node/node.exe tools/build/city.js setup --world jailbreak          # read your heist's lines against section 7
```

- Render each level of a heist (`--y` at every floor + 1) and compare against sections 4-6: the cases' plinth / air / lid pattern, stepping blocks, the octagon face, the Casino vault door face and that no gaming-floor block lies in `heist_casino`.
- Count your blocks against the budget (9.1).
- Magenta in a render only means render.js has no texture for that name; the registry check is the real one.
- Never call python on this machine (it hangs); use `tools/node/node.exe`.

## 12. Calls for the owner, tests and open questions

**Calls (each has the default the builders use):**
1. Bank advanced, with the gentler d3 alarm numbers (7.3). Default: yes.
2. Jewelry not advanced, pool $26,000. Default: yes (an advanced variant is 3 commands later: `advanced true`, ground-floor lockdown boxes, T27 to `effect=alarm`).
3. Mechanics order M1, M2, M3, or none at launch. Default: none at launch; M1 first.
4. Names: "Rising City", "Jewelry Store", "Bank", "Casino", the Blue Heart, Box 167, the Diamonds, the high roller's case. Default: these.
5. A City Criminal Base lot x 506..550, z 356..410. Default: kept free, not built.
6. The casino's games: the cautious or the realistic gambling option (`design/casino-games.md` section 1). Decided (owner, 2026-10-28): realistic (chips cash back into money at the cashier; the owner took the guidelines risk). plan-layout.js draws the Casino since the 2026-10-28 critique.

**Tests on the server before the setup (decision 2.9):**
- (a) a smash gate with no pile behind it as an entry (Jewelry G1; fallback P14);
- (b) a register-style pile in a non-store heist (Bank tills; fallback cash on 2 cells);
- (c) iron bars as a safe gate's blocks (Bank G6, Casino G6; fallback iron blocks drawn as a cage door);
- (d) cops pathing from each cop spot to the vault (Citizens range 100): the Bank's from Bank Street (660.5, 65, 296.5 / 305.5) through the door, G3 and the bay to the antechamber; the Casino's from the east lawn (925.5, 65, 349.5 / 353.5 / 358.5) up the tunnel to the bay and through the mantrap.

**Open questions (default in bold):**
- The octagon and round vault doors are 5 × 5 gate boxes (25 blocks, corners included) because a gate box must be solid. **Keep the corners as gate blocks** (drawn as frame); an octagon with open corners needs loot.sk to accept a non-box gate.
- The Casino's only lock box (L1) bars the staff stair, so robbers who came in that way leave by the tunnel or the drain once the alarm runs. **Keep it** (the chase stays off the public floor).
- The heist's entry pushback at the staff stair foot (a closed heist cancels the region enter): a stair, not a doorway. **Keep it** and test that a player walking down while the Casino cools down is stopped at y 71 and never reaches the landing.
- The Bank's T1 cone (yaw 50, 30°, range 12) passes near G3's alcove. **Keep it**: the 3-deep alcove hides the keypad; `city.js check`'s cone test confirms.
- The Jewelry hologram (632.5, 70, 413.5) sits inside the region's forecourt. **Keep it** (a hologram is not an exit); move it to (636.5, 70, 413.5) if the hologram refuses a spot inside the region.

## Critique log

2026-10-28, the critic's 23 findings (`design/fixes.md`): all 23 checked against the code and fixed. Where a fix differs from the one suggested:
- T27 (Jewelry office turret): the suggested spot (615.5, 90.0, 399.5) looking south still sees a robber at the keypad (16° off its axis, 4.2 blocks away), so it hangs at z 401.5 looking north at the doorway instead, with the keypad behind it.
- Diamonds plates (Casino T24-T27): a ring of plates can't work, because loot reach is 4.5 from the eye, so a robber grabs from 3-4 blocks out, past any 5 × 5 ring. Replaced with one ceiling turret T22 (sneak to take them); the casino now has traps T1..T22.
- L1 (Casino staff stair): kept y 66..70 and made the ceiling y 71 solid over z 338..340 (the stair hole is z 341..344 only); bars at y 71 would only replace that solid ceiling.
- polished_andesite_wall: fixed here (andesite_wall); `design/decision.md:244` is outside this step's files and still says it.
- Channel bikes: kept, with the 200-block bike chase radius stated (6.3, 7.4) and the existing GPS path along Vault Street. The Bank's G7 stays a safe gate (the optional one-way drop wasn't taken: a solo robber leaves by the front instead).
- Same rule applied without a finding: the Jewelry VIP curtain T24-T26 (3 beams on together) went to damage=1.
