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
