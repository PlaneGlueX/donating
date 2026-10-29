# Ironvale: the build plan, building by building

The site plan is `tools/build/expand/PLAN.md` section 1.2. This file holds each module's detailed plan, written before its module (the owner, 2026-10-29: "go one by one plan the layout first then build everything building by building"). COMMON (the frame every module shares) is `iron/plan-layout.js`; `CITY_SET=iron tools/node/node.exe tools/build/city.js check` builds every module present and checks it.

Order: the streets, the Power Plant, the Police HQ (module `evidence`, named after its heist: `city.js check` wants a module's region to be `heist_<module>`), the Mansion.

The ground is flat grass at y 64 over the whole area (checked over RCON at six spots, 2026-10-29), like the rest of the map.

## 0. The frame (COMMON)

- **Area:** x 830..1500, z 150..800, y 44..140. x 830..940 is Rising City's: Ironvale owns only Main Avenue East's first stretch there (z 416..444), from the roundabout's east sidewalk to x 940. Nothing above the ground stands there in the city's build (checked: no lamp or light near the ring's east side).
- **Boxes** (each module owns every column inside):
  - `power` x 950..1120, z 270..415 (the plant, its yard and cooling towers; its gate on the avenue's north walk);
  - `evidence` x 950..1070, z 445..555 (the HQ, its front on the avenue's south walk);
  - `mansion` x 1160..1340, z 560..740 (Mansion Hill and the house on top), less Hill Drive's strip.
- **Regions** are placeholders until each building's plan sets its own.
- Changed from the site plan: Main Avenue East ends at x 1280 (not 1300: nothing stands past Hill Drive, so a short stub and an end curb), and Hill Drive tops out at z 600 with the plateau from z 601 (the house moves north to fit; the Mansion's plan sets it).

## 1. Streets (`iron/streets.js`)

- **Main Avenue East**, x 830..1280, z 416..444, the avenue's profile: road z 419..441 (asphalt mix), white edge lines z 420 and 440, the yellow dash z 430 where x % 6 < 3, curbs z 418 / 442 (smooth stone with a slab on top), walks z 416..417 and 443..444. No parking bays. At x 830..833 it cuts through the roundabout's sidewalk into the ring road (the mirror of the west avenue's end at x 789). At x 1281 an end curb across it (z 416..444, a slab on top) and shrubs behind.
- **Hill Drive**, x 1240..1251, z 445..600: road x 1242..1249, the yellow dash x 1245..1246 where z % 6 < 3, walks x 1241 and 1250, retaining walls x 1240 and 1251 (stone bricks from the ground to the road, a stone brick wall on top as the parapet). The road's surface block is y 64 + floor((z − 444) / 6): flat to z 449, then one block up every 6 (like the city's ramp, 1 in 8), y 90 at z 600. The embankment under it is stone. Where it meets the avenue the south walk and curb are cut (x 1241..1250, z 442..444 road).
- **Lamps**: the city's `streetLamp` every 24 blocks on both avenue walks (x 842, 866, ...), the arm over the road; none on Hill Drive's junction (x 1230..1261) or within 2 of an ATM. On Hill Drive, on both walks every 24 blocks from z 462, standing on the walk's surface.
- **ATMs** (three barriers under the furniture display, like North's): the avenue's north walk at (1000, 65, 416) and (1180, 65, 416), the screen facing south. Setup: `datm add 1000 65 416`, `datm add 1180 65 416`.
- **GPS** (ids from 6001): 6001 the avenue's west end (840.5, 65, 430.5), 6002 (1010.5, 65, 430.5) between the Power Plant and the Police HQ, 6003 Hill Drive's foot (1245.5, 65, 430.5), 6004 the avenue's east end (1276.5, 65, 430.5), 6005 Hill Drive's top (1245.5, 91, 600.5). Links 3008 (the roundabout's east node) - 6001 - 6002 - 6003 - 6004, 6003 - 6005. The buildings add their own nodes from 6010 / 6020 / 6030.
- **District**: `district_ironvale` x 941..1500, z 150..800, y 0..200, named "Ironvale".
- Budget 400,000 blocks.
- **Built 2026-10-29**: 40,673 blocks, 48 lamps, pasted with `CITY_SET=iron tools/node/node.exe tools/build/city.js paste --world overworld` (backup-2026-10-29-0222 before); the ATM displays placed; `district_ironvale` made (passthrough allow), ATMs 11 and 12, GPS 6001-6005 loaded from `tools/build/iron/iron-gps-paths.txt` (run after the city's file) and linked to 3008. Checked with a bot: the sidebar's area says "Ironvale" past x 941 and "Rising City" at x 900; a pin on Hill Drive's top routes `way=path` via 6003 with a right turn at the foot. `city.js`'s iron set joins the city's graph at 3008 (was 3012/3013, the casino plaza, before the plan put the avenue on the roundabout). The placeholder heist regions are small boxes until each building sets its own (`city.js check` refuses a region over 100,000 blocks). Changed with the Power Plant: a curb cut at its gate (x 1028..1037, z 418) and no lamp at x 1034 on the north walk (it stood in the gate's drive); in the world both were removed with a `fill` (47 lamps now).

## 2. The Power Plant (`iron/power.js`)

A big heist (expand/PLAN.md 1.3): difficulty 3, level 25, **advanced** (alarm, cops, lockdown), pool $32,000, escape 8:00 / cooldown 15:00 (difficulty 3's defaults). A coal-and-steam plant behind a fence: a long brick turbine hall, two cooling towers, a transformer yard.

**Footprint** (the module owns x 950..1120, z 270..415):
- **The fence** around the site, x 952..1118, z 272..412: a stone brick wall base with two iron bars above. **The gate** x 1028..1037 on z 412 (open; a guard booth beside it at x 1039..1041), a drive of andesite (MIX.plaza) z 371..411 x 1028..1037 to the plant's door, a parking strip x 1040..1060, z 395..405 (andesite, not asphalt: the GPS reads asphalt as a street). Main Avenue East's north curb gets a cut at x 1028..1037 (the streets module).
- **The cooling towers** (outside the region): hollow shells centred (972, 300) and (972, 350), radius 13 at the foot, 9 at the waist (y 100), 9.6 at the lip (y 112), one block thick, light gray concrete with a white band at y 104..106; a doorway at the foot. Nothing inside.
- **The transformer yard** x 1096..1114, z 330..370: four transformers (iron blocks with lightning rods and chains), a fence of iron bars.
- **The plant**: walls x 1020..1090, z 320..370 (inside x 1021..1089, z 321..369), red brick (MIX.brick) with stone brick pilasters, y 65..80; roof y 81 (dark, with a parapet); "IRONVALE POWER" on the south face (a label). Windows: the south face 3 wide y 66..68 (6), the hall's long walls a clerestory 4 wide y 73..76 every 12 blocks.

**Heist region** `heist_power` x 1020..1090, y 59..81, z 320..370 (83,283 blocks): the plant, down to the turbine pit's floor. The yard, the towers and the transformers stay outside.

**The way in, room by room:**
1. **The entrance hall** x 1046..1089, z 358..369: the front door x 1053..1056 in z 370 (y 65..68, open), a security desk with the petty cash P4 (x 1060..1062, z 362), lockers, benches; a camera. A door in the wall x 1045 (z 362..363) to the control room; a doorway x 1054..1056 in the wall z 357 into the turbine hall.
2. **The control room** x 1021..1044, z 358..369: consoles along the hall wall, a big window into the hall (glass, z 357, x 1026..1040, y 66..68), a camera by the door facing west (G1 out of its range). The **payroll safe** G1 (safe, x 1023, z 363..364, y 65..66) in a steel cabinet on the west wall (x 1021..1023, z 362..365, y 65..68), the payroll P1 behind it (x 1022, z 363..364, y 65).
3. **The turbine hall** z 321..356, floor 64 (feet 65), up to the roof. In the middle **the turbine pit** x 1040..1070, z 330..346, its floor y 59 (feet 60), with two turbines lying along z (x 1043..1050 and 1060..1067, iron and light gray, up to y 70) and a ladder out on its south wall at x 1042. Three ways north:
   - **the catwalk** x 1054..1056, z 330..346 (iron trapdoor look, y 64): the straight way, and a **collapsing floor** (depth 4) that drops you into the pit;
   - **the west and east walkways** x 1021..1039 and x 1071..1089, a pipe run along each long wall beside the pit (x 1021 / 1089, so a laser can't be passed along the wall), each walkway crossed by three blinking lasers at z 334.5, 338.5, 342.5 from the pipe to the pit (on 2 / off 2, offsets 0 / 2 / 0); a reel of copper wire at the far (north) end of each (P5 x 1022, z 323..325; P6 x 1088, z 323..325), open;
   - two sweeping cameras high in the hall's north corners.
4. **The copper cage** x 1046..1064, z 321..327 against the north wall: an iron bars front at z 327 with the **cage door** G2 (drill, x 1054..1056, z 327, y 65..67, iron blocks; time 75, jams 2, claim 10, alarm=true) and two plates in front of it (x 1051 and 1059, z 328). Inside, copper spools P2 (x 1048..1050, z 322) and P3 (x 1060..1062, z 322).

**Loot** (≈ $23,000 on an average roll):

| Pile | Where | Value | Style | Behind |
|---|---|---|---|---|
| P1 Payroll | x 1022, z 363..364, y 65 | $4,000-6,000 | cash (500, 3 s) | G1 |
| P2 / P3 Copper spools | x 1048..1050 / 1060..1062, z 322, y 65 | $5,000-8,000 each | goods (1,500, 3 s) | G2 |
| P4 Petty cash | x 1060..1062, z 362, y 65 | $800-1,500 | register (250, 2 s) | — |
| P5 / P6 Copper wire | x 1022 / 1088, z 323..325, y 65 | $1,500-2,500 each | goods (500, 1.5 s) | — |

**Traps** (damage 2 unless noted): cameras (alarm) in the entrance hall (1088.5, 69.5, 368.5), the control room (1043.5, 69.5, 359.5) and the hall's north corners (1022.5, 77.5, 322.5) and (1088.5, 77.5, 322.5), the last two sweeping; 6 blinking lasers on the walkways (y 65.4: jump, or time the gap); the catwalk's collapsing floor; 2 plates at the cage.

**Lockdown** (iron bars): every window (6 south, the clerestory) and the front door's transom.

**Spots:** exit (1054.5, 65, 374.5) facing south, the hologram (1060.5, 70, 374.5), the chase centre (1055.5, 65, 345.5), cops in the yard at (1032.5, 65, 392.5) and (1078.5, 65, 392.5). GPS 6010 the door (1054.5, 65, 374.5), 6011 the gate (1032.5, 65, 410.5); links 6002-6011-6010. POI: landmark "Power Plant". Budget 150,000 blocks.
- **Built 2026-10-29**: 30,741 blocks (`city.js check` passes), pasted with `--box 950,270,1120,415` (backup-2026-10-29-0230 before); the label placed; region, heist (advanced), 2 gates, 6 piles, 13 traps (4 cameras, 6 blinking lasers, the catwalk's floor, 2 plates), 22 lockdown boxes, 2 cop spots, the snapshot, the hologram, POI 43 and GPS 6010-6011 (linked to 6002) set up over RCON. Changed while setting up: the copper piles' pieces ($1,500 a spool piece, 3 s; $500 a wire piece), since goods hold 2 pieces a cell and the first numbers didn't fit; the roll is $20,000-27,500 (about $23,750), one robber clears it in about 3:20 of the 8:00 clock. The setup ran twice by mistake at first (gates, traps, cop spots and the POI doubled): cleared with `dloot clear`, `dtrap clear`, `dheist lock power clear`, `dcops power clear`, `dpoi remove 41/42` and run once. `bots/run.js iron power` 8/8: open and armed, level 24 kept out at the door, level 25 in, the petty cash and a wire reel paid into the bag, the payroll safe and the cage door with their hitboxes.

## 3. The Police HQ (`iron/evidence.js`)

A big heist (expand/PLAN.md 1.3): difficulty 3, level 30, **advanced** (alarm, cops, lockdown), pool $38,000, escape 8:00 / cooldown 15:00. Ironvale PD: a white station with a navy band on the avenue's south side, the evidence room in its basement.

Changed from the site plan: cops can't stand inside a heist region (`/dcops add` refuses it), so "cop spots inside" are right outside both doors: the front plaza and the back lot, a few steps from the lobby and the stair.

**Footprint** (the module owns x 950..1070, z 445..555):
- **The front plaza** x 985..1035, z 445..459 (polished andesite) from the avenue's south walk to the door, a flagpole at (1000, 452), planters, bollards.
- **The station**: walls x 975..1045, z 460..520 (inside x 976..1044, z 461..519), white concrete with a navy band (MIX.navy) y 70..71; floor 64, rooms y 65..70, ceiling and roof y 72 (a parapet y 73). "IRONVALE POLICE" over the door (a label). The front door x 1008..1011 in z 460 (y 65..68, open); the back door x 1028..1029 in z 520 (y 65..67, open, into the back hall). Windows 3 wide y 66..68: 8 on the front, 7 on each side.
- **The back lot** x 985..1035, z 521..550 (andesite, not asphalt), an iron bars fence with a gap on its west side (z 535..538).

**Heist region** `heist_evidence` x 975..1045, y 55..72, z 460..520 (77,958 blocks): the station and its basement. The plaza and the lot stay outside.

**The way in, room by room:**
1. **The lobby** z 461..474: the front desk (a counter along z 470, x 995..1024) with the fines drawer P1 on it (x 1009..1011); two holding cells behind bars in the west end (x 976..989), waiting chairs in the east end; two cameras in its north corners.
2. **The bullpen** z 476..500, through a doorway x 1009..1011 in the wall z 475: rows of desks, two sweeping cameras in its south corners. The wall z 501 has three doorways: the sergeant's office (x 990..991), the stair (x 1008..1011), the back hall (x 1030..1031; an interview table, lockers, the back door). Two plates in front of the sergeant's door (z 500).
3. **The sergeant's office** x 976..1006, z 502..519: a desk, filing cabinets, and **the safe** G1 (safe, x 978, z 510..511, y 65..66) in a steel cabinet (x 976..978, z 509..512, y 65..68), the bribe money P2 behind it (x 977, z 510..511).
4. **The stair** x 1008..1011, down south from z 504 (a stair block at y 64) to z 511 (y 57), to the basement landing x 1008..1017, z 512..519, open to the roof above it (a glass roof over the stairwell).
5. **The basement corridor** x 1014..1017, z 479..511 (floor 56, feet 57..61, ceiling 62; east of the stair, which would block it), north from the landing, crossed by lasers: low ones to jump (57.4), high ones to duck under (58.65), and two blinking pairs (low and high taking turns).
6. **The evidence room** x 990..1030, z 461..478 (under the lobby): the doorway x 1014..1017 in its wall z 478; **the evidence cage** x 995..1025, z 462..472 behind an iron bars front at z 473 with **the cage door** G2 (drill, x 1009..1011, z 473, y 57..59; time 90, jams 2, claim 12, alarm=true) and two plates in front of it (x 1007 and 1013, z 475); one camera in the room's east end. Inside the cage, on shelves along its back wall (z 462): seized cash P3 (x 997..1001), seized jewels P4 (x 1009..1011), seized goods P5 (x 1019..1023).

**Loot** (≈ $27,500 on an average roll):

| Pile | Where | Value | Style | Behind |
|---|---|---|---|---|
| P1 Fines drawer | x 1009..1011, z 470, y 65 | $1,000-2,000 | register (250, 2 s) | — |
| P2 Bribe money | x 977, z 510..511, y 65 | $3,000-5,000 | cash (500, 3 s) | G1 |
| P3 Seized cash | x 997..1001, z 462, y 57 | $8,000-12,000 | cash (1,000, 4 s) | G2 |
| P4 Seized jewels | x 1009..1011, z 462, y 57 | $5,000-8,000 | jewel (1,000, 2 s) | G2 |
| P5 Seized goods | x 1019..1023, z 462, y 57 | $4,000-7,000 | goods (1,000, 2 s) | G2 |

**Traps** (damage 2): cameras (alarm) in the lobby's north corners (977.5 / 1042.5, 69.5, 462.5), the bullpen's south corners (977.5 / 1042.5, 69.5, 499.5, sweeping) and the evidence room's east end (1028.5, 60.5, 476.5); the corridor's lasers; 4 plates.

**Lockdown** (iron bars): the 22 windows. The doors stay open.

**Spots:** exit (1009.5, 65, 455.5) facing north, the hologram (1015.5, 70, 455.5), the chase centre (1010.5, 60, 490.5), cops on the plaza (1009.5, 65, 450.5) and in the back lot (1009.5, 65, 530.5). GPS 6020 the plaza (1009.5, 65, 455.5), linked to 6002. No POI (the heist shows on the locator bar while open). Budget 90,000 blocks.
- **Built 2026-10-29**: 38,895 blocks (`city.js check` passes), pasted with `--box 950,445,1070,555` (backup-2026-10-29-1120 before); the label "IRONVALE POLICE" placed; region, heist (advanced), 2 gates (the sergeant's safe G1, the evidence cage door G2), 5 piles, the traps, lockdown boxes, 2 cop spots (in front and behind), the snapshot, the hologram, the POI and GPS 6020 (linked to 6002) set up once over RCON; the first opening rolled $26,000. `bots/run.js iron evidence` 7/7: open and armed, level 29 kept out at the door, level 30 in, the fines drawer paid into the bag, the safe and the cage door with their hitboxes.

## 4. The Mansion (`iron/mansion.js`)

The finale (expand/PLAN.md 1.3): difficulty 4, level 60, **advanced** (alarm, cops, lockdown), pool $70,000, escape 10:00 / cooldown 30:00 (difficulty 4's defaults). Holloway Manor: a white quartz two-storey house with a dark tile roof on top of Mansion Hill; the cops' assaults come up Hill Drive.

**Mansion Hill** (a hollow shell, like the site plan's other hills): a plateau x 1195..1305, z 601..705 at y 90 (grass, feet 91), sloping down 1 block every 1.2 to the ground (y 64) by the box's edge: the column's top is y 90 − floor(d / 1.2), d = the distance from the plateau's rectangle, with grass on top and 2 blocks of dirt under it (hollow below). On the north the slope stays under Hill Drive's road, so its retaining walls show. A hedge round the plateau's edge (a gap at the drive), oaks on the plateau, pines on the slopes, a fountain in the back garden at (1250, 692).

**The front court** x 1238..1262, z 601..619 (polished andesite, not asphalt), where Hill Drive arrives (x 1242..1249); four lantern posts; a portico (quartz pillars at x 1245 / 1255, z 616, its roof y 97 over x 1244..1256, z 614..619).

**The house**: walls x 1220..1280, z 620..670 (inside x 1221..1279, z 621..669). Floor y 90, ground rooms y 91..96, the upper floor y 97, upper rooms y 98..102, the roof y 103 (deepslate tiles; a glass skylight over the gallery), a parapet y 104. Walls smooth quartz with quartz pillars at the corners. The front door x 1249..1251 in z 620 (y 91..94, open). Windows 3 wide (y 92..94 and 99..101): the front x 1223, 1230, 1242, 1256, 1268, 1275 (+2); both sides z 628, 640, 655, 663 (+2); the back x 1244, 1254, 1266, 1273 (+2). "HOLLOWAY MANOR" over the portico (a label, y 99.4).

**Heist region** `heist_mansion` x 1218..1282, y 84..104, z 618..672 (75,075 blocks): the house and the library's pit; the court and the gardens stay outside.

**The way in, room by room** (ground floor, then up):
1. **The foyer** x 1240..1260, z 621..636: a red runner to the gallery's door, two cameras in its north corners, the grand stair up the east side (x 1256..1259, z 625..631, y 91..97 rising south; the upper floor open over z 627..630).
2. **The laser hall** x 1221..1238, z 621..624 (through x 1239 at z 622..624), west along the front wall: six lasers across it (low 91.4 to jump, high 92.65 to duck, one blinking pair), to its doorway into the library at its west end (z 625, x 1221..1223).
3. **The library** x 1221..1238, z 626..650: bookshelves on both long walls. Its middle x 1223..1236, z 633..644 is a **collapsing floor** over a pit (floor y 85, a ladder back up at its north end, x 1230, z 632); the 1-wide ledges along the shelves (x 1222, x 1237) are safe but two cameras at the north end look straight down them. **The code door** G1 (safe, x 1229..1230, z 651, y 91..93) in the south wall.
4. **The vault room** x 1221..1238, z 652..669: two plates in front of **the vault** (deepslate walls x 1224..1235, z 659..670) and its door G2 (drill, x 1229..1231, z 659, y 91..93; time 120, jams 3, claim 15, alarm=true). Inside: two bullion pallets and the cash pallets.
5. **The gallery** x 1240..1260, z 638..669 (double height to the skylight), through the foyer's back door (x 1249..1251, z 637): four smash cases (G3..G6, the Jewelry store's island), two sculptures, the masterpiece at the back; three plates in the aisle. No camera (a camera's cone can't hold a gate).
6. **The dining room** x 1262..1279, z 621..645 (through x 1261 at z 628..630): the long table, the silverware on the sideboard (x 1278); one camera. The kitchen behind (z 647..669).
7. **Upstairs**: the hall over the foyer; **the master bedroom** (west, x 1221..1238, z 621..645, through x 1239 at z 632..634) with the jewelry box on the dresser; **the study** (east, x 1262..1279, z 621..645, through x 1261 at z 632..634) with a camera, two plates and **the master safe** G7 (safe, x 1277, z 640..641, y 98..99) in a steel cabinet (x 1277..1279, z 639..642, y 98..101). The rest of the upper floor is closed attic.

**Loot** (≈ $68,000 on an average roll):

| Pile | Where | Value | Style | Behind |
|---|---|---|---|---|
| Silverware | x 1278, z 630..632, y 91 | $1,000-2,000 | goods (500, 2 s) | — |
| Sculpture ×2 | x 1243..1244 / 1256..1257, z 652, y 91 | $2,000-4,000 each | art | — |
| Masterpiece | x 1250..1251, z 667, y 91 | $4,000-6,000 | art | — |
| Display case ×4 | the islands' middle rows, y 91 | $2,000-3,500 each | jewel | G3..G6 |
| Bullion ×2 | x 1226..1227 / 1232..1233, z 668, y 91 | $10,000-15,000 each | bullion | G2 |
| Cash pallets | x 1225, z 662..667, y 91 | $8,000-12,000 | cash (1,000, 4 s) | G2 |
| Master safe | x 1278, z 640..641, y 98 | $6,000-9,000 | cash (2,500, 4 s) | G7 |
| Jewelry box | x 1222..1223, z 640, y 98 | $1,500-3,000 | jewel | — |

**Traps** (damage 2): cameras (alarm) in the foyer's north corners, the library's north end (2), the dining room, the study; the laser hall's six lasers; the library's collapsing floor (depth 4); 7 plates.

**Lockdown** (iron bars): the 36 windows. The front door stays open.

**Spots:** exit (1250.5, 91, 611.5) facing north, the hologram (1256.5, 95, 611.5), the chase centre (1250.5, 95, 645.5), cops in the front court (1250.5, 91, 605.5) and the back garden (1250.5, 91, 682.5). GPS 6030 the court (1250.5, 91, 611.5), linked to 6005. Budget 200,000 blocks.
- **Built 2026-10-29**: 97,302 blocks (`city.js check` passes first time), pasted with `--box 1160,560,1340,740` (backup-2026-10-29-1216 before); the label placed; region (75,075 blocks), heist (advanced), 7 gates, 13 piles, 6 cameras, 6 lasers, the library's floor, 7 plates, 36 lockdown boxes, 2 cop spots, the snapshot, the hologram and GPS 6030 (linked to 6005) set up once over RCON. Changed while setting up: the masterpiece ($3,000 a piece; 2 cells hold 2 art pieces) and the jewelry box ($500 a piece) were refused at the default piece sizes and added again last (in-game ids 19 and 20; the module lists them in that order). `/dloot check`: $56,000-82,500, about $69,250; one robber clears it in about 6:00 of the 10:00 clock (a crew heist). `bots/run.js iron mansion` 8/8: open and armed, level 59 kept out at the door, level 60 in, the silverware paid into the bag, the code door, the vault door and the master safe with their hitboxes.
- **Tested 2026-10-29** (`bots/run.js irontraps`, 12/12; the owner: "test yourself"): two fixes. (1) The library floor was never made: `/dtrap` refused it ("too big (168 tiles > 64)") and the setup check missed the line (grep a setup's output for "too" and "must" too, not only errors); it's six 2-deep strips now (mansion-23..28), and the Power Plant's catwalk the same (nine strips, power-14..22; the one 17-long floor, power-11, removed): one long floor cracks under you and drops 0.5 s later wherever you are, so neither could ever be crossed and "catwalk or lasers" / "floor or ledges" weren't choices. Now a sprinter crosses (each strip falls behind them), a walker falls. (2) traps.sk `floor::grace` (3 s): put back at the edge still holding forward, the bot walked straight back in, hit 3 times in a second, dead. Checked: walking the laser hall upright is 7 HP a laser (dead by the third), the west ledge trips the library camera, the GPS from Main Avenue East routes via 6002, 6003, 6005, the phone map shows the gallery, the dash and the hill.
