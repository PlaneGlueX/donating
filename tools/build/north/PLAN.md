# Rising City North: the build plan, building by building

The site plan is `tools/build/expand/PLAN.md` section 1.1. This file holds each module's detailed plan, written before its module (the owner, 2026-10-29: "go one by one plan the layout first then build everything building by building"). COMMON (the frame every module shares) is `north/plan-layout.js`; `CITY_SET=north tools/node/node.exe tools/build/city.js check` builds every module present and checks it.

Order: the streets, the Federal Reserve, the Art Gallery, the Nightclub, Lucky Pawn, the Car Wash.

## 1. Streets (`north/streets.js`)

- **Bank Street North**, x 640..663, z 0..229: road x 643..660 (asphalt mix), the yellow dash x 651..652 where z % 6 < 3, curbs x 642 / 661 (smooth stone with a slab on top), walks x 640..641 and 662..663. It meets the built Bank Street at z 230.
- **Gallery Row**, x 481..930, z 110..125: road z 113..122, the dash z 117..118 where x % 6 < 3, curbs z 112 / 123, walks z 110..111 and 124..125. The crossing (x 640..663) is plain asphalt.
- **Curb cuts** (no slab): the Car Wash's bays on Gallery Row (x 500..509 north and south, x 520..529 south) and the Reserve's armored-truck gate on Bank Street North (x 661, z 205..214).
- **Lamps**: the city's `streetLamp` every 24 blocks on both walks, arm over the road; none at the crossing (Bank Street z 104..131, Gallery Row x 634..669) or next to an ATM.
- **ATMs** built by this module (three barriers under the `donating:furn_atm` furniture display, like the Bank's): Gallery Row's north walk (700, 65, 110) and beside Bank Street North's west walk (639, 65, 60). The third, at the Reserve's frontage (666, 65, 180), comes with the Reserve. Setup: `datm add 700 65 110`, `datm add 639 65 60`.
- **GPS**: 5001 Bank Street North at z 200, 5002 the crossing, 5003 its north end, 5004 / 5005 Gallery Row's ends; links 3017-5001-5002, 5002-5003, 5002-5004, 5002-5005.
- **District**: `district_rising_city` widened to x 481..940, z 0..470.
- Budget 120,000 blocks (it uses ~14,400).
- **Built 2026-10-29**: 14,362 blocks, 52 lamps, pasted with `CITY_SET=north tools/node/node.exe tools/build/city.js paste --world overworld` (`--world` is the DIMENSION for the paste: `world` fails as "Unknown dimension 'minecraft:world'"; setup and gps lines keep the world name). ATMs 4 and 5, district widened, GPS 5001-5005 loaded and linked to 3017 (the city's own paths, `tools/city-gps-paths.txt`, weren't loaded before: loaded the same day, 30 nodes).

## 2. The Federal Reserve (`north/reserve.js`)

The biggest heist in North (expand/PLAN.md 1.3): difficulty 4, level 50, advanced (alarm, cops, lockdown), pool $70,000, escape 10:00 / cooldown 30:00 (difficulty 4's defaults). A white neoclassical bank: a columned portico on Bank Street North, a marble banking hall, and the gold vault in the basement.

**Footprint** (the module owns x 664..800, z 132..222):
- The building: walls x 684..747, z 154..199 (inside x 685..746, z 155..198). Calcite walls with smooth-quartz pilasters, y 65..80; roof y 81 with a parapet; the hall's ceiling y 76.
- The portico: x 674..683, z 164..189 on the west front, six quartz columns (z 165, 169, 173, 180, 184, 188; y 65..75), an entablature y 76..77 and a stepped pediment y 78..83. "FEDERAL RESERVE" on the frieze (a label).
- The front plaza x 664..673, z 140..213 (polished andesite), two planters, two lamps. The ATM (666, 65, 192), facing the street. The getaway lot south of the building, x 684..747, z 203..214, reached by the drive from Bank Street North's curb cut (z 205..214).
- The front door: the open doorway x 684, z 175..178, y 65..68; a transom window above.

**Heist region** `heist_reserve` x 683..748, y 51..77, z 153..200 (85,536 blocks): the building and the basement, not the portico or the plaza.

**The way in, room by room:**
1. **The banking hall** (feet 65), x 685..717: a marble floor, two rows of quartz columns, benches. Two sweeping cameras over the hall (alarm).
2. **The teller line** x 719..726, z 162..191, behind the counter x 718: the counter's glass G1 (smash, z 170..182, y 66..67; iron bars either side) and above it a wall to the ceiling. The tills P1-P3 on three teller desks at x 721.
3. **The security door** G2 (safe, x 727, z 175..177, y 65..67) in the back wall into **the secure wing** x 728..746: the cash carts P4, a camera, and the stair down (z 176..177, east from x 730 at feet 65 to x 742 at feet 53, rails along it).
4. **B1** (floor 52, feet 53..57, ceiling 58): the stair's landing x 743..746, z 168..179, then **the laser gallery** x 712..742, z 168..172 west: 10 laser lines across it (low, duck, timed pairs, two alarm lines).
5. **Vault door 1** G3 (drill, x 711, z 168..172, y 53..57; time 90, jams 2, claim 10) into **the cage room** x 697..710, z 160..180: the cash pallets P7, plates in front of each alcove, and two deposit alcoves behind safes: north G4 (x 702..704, z 159, y 53..55) with deposit boxes P5, south G5 (x 702..704, z 181) with P6.
6. **Vault door 2** G6 (drill, x 696, z 168..172, y 53..57; time 120, jams 3, claim 15) into **the gold vault** x 686..695, z 157..183: bullion pallets P8 (north end), P9 (south end), P10 (west wall), timed lasers across both ends.

**Loot** (≈ $65,000 on an average roll):

| Pile | Where | Value | Style | Behind |
|---|---|---|---|---|
| P1-P3 Tills | x 721, z 172 / 176 / 180, y 65 | $1,000-2,000 each | register (250, 2.0 s) | G1 |
| P4 Cash carts | x 735..737, z 158, y 65 | $4,000-8,000 | cash (1,000, 4 s) | G2 |
| P5 / P6 Deposit boxes | x 700..706, z 155 / 185, y 53 | $3,000-6,000 each | jewel | G4 / G5 |
| P7 Cash pallets | x 701..705, z 177, y 53 | $6,000-10,000 | cash (1,000, 4 s) | G3 |
| P8 / P9 Bullion | x 687..688, z 158 / 182, y 53 | $10,000-15,000 each | bullion (5,000, 4 s) | G6 |
| P10 Bullion | x 687, z 169..171, y 53 | $10,000-20,000 | bullion | G6 |

**Lockdown** (iron bars): each window on the north, south and west faces (7 + 7 + 6, 3 wide, y 67..73) and the transom over the door.

**Spots:** exit (676.5, 65, 176.5) facing west, the hologram (672.5, 71, 176.5), the chase centre (715.5, 60, 176.5), cops on Bank Street North (655.5, 65, 168.5) and (655.5, 65, 185.5). GPS 5010 the portico, linked to 5001. POI: landmark "Federal Reserve". Budget 150,000 blocks.
- **Built 2026-10-29**: 55,498 blocks (`city.js check` passes, 48 block states valid against the 26.1 registry from bots/node_modules/minecraft-data), pasted with `--box 664,132,800,222`; the label and the ATM display placed; region, heist, 6 gates, 10 piles, 31 traps, 21 lockdown boxes, 2 cop spots, the snapshot (6 sections), the hologram, ATM 6, POI 37 and GPS 5010 set up over RCON (`zzregion` locally: on Minehut the //pos lines). The roll came to $71,000 on its first opening. `bots/run.js reserve` 8/8: open and armed, level 49 kept out, level 50 in, G1 smashed, a till paid into the bag, G2 and G3 with hitboxes; it ends the run and reopens the Reserve after.
