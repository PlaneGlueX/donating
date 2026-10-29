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

## 3. The Art Gallery (`north/gallery.js`)

A medium heist (expand/PLAN.md 1.3): difficulty 2, level 12, **not advanced** (no alarm, no cops: cameras here are turrets that shoot, `effect=damage`), pool $18,000, escape 6:00 / cooldown 10:00. A white modern gallery with a glass front on Gallery Row.

Changed before building (COMMON): the Gallery's and the Car Wash's lots start at z 126 (Gallery Row's south walk ends at 125) and Lucky Pawn's ends at z 109 (the north walk starts at 110), so their fronts meet the sidewalk; Gallery Row has GPS junctions 5006 (x 595, the Gallery), 5007 (x 520, the Car Wash) and 5008 (x 618, the Pawn) on the road, the link 5002-5004 split through them.

**Footprint** (the module owns x 556..636, z 126..222):
- The building: walls x 562..630, z 140..200, one tall floor (floor 64, rooms y 65..74, roof y 75 with skylight strips, a parapet). White walls; the north front a glass curtain (x 566..626, y 66..73) with black mullions, the doorway x 594..597, y 65..68; "ART GALLERY" on the white band above (a label).
- The plaza x 576..615, z 126..139 from the sidewalk to the door, planters and benches.

**Heist region** `heist_gallery` x 561..631, y 60..77, z 139..201 (80,514 blocks; down to y 60 for the collapsing floor's pit).

**Rooms** (inside x 563..629):
1. **The lobby** z 141..152: the reception desk, benches, plants. Openings in the wall z 153: x 576..579 into the Sculpture Court, x 612..615 into the Jewel Room.
2. **The Sculpture Court** x 563..594, z 154..199 (the wall x 595 to the east): two art plinths (P5 x 570..571, z 166; P6 x 586..587, z 186), open to grab but behind nine blinking floor lasers across the court (y 65.4, jump them, alternate offsets). Paintings (block art in frames) on both long walls.
3. **The Jewel Room** x 596..629, z 154..176: four glass-case islands (the Jewelry store's: a 1 x 4 plinth, the smash front 4 x 2, permanent glass behind, a lid), the cases' fronts G1-G4 and the jewels P1-P4 behind them; two sweeping turret cameras. The opening x 611..614 in the wall z 177 leads on.
4. **The Modern Wing** x 596..629, z 178..199: the masterpiece P7 (x 612..613, z 189) on a quartz dais; a collapsing floor x 611..614, z 183..185 (pit 3 deep) in the straight path from the doorway; two blinking lasers across the wing; one turret camera. Paintings on the walls.

**Loot** (≈ $15,000 on an average roll):

| Pile | Where | Value | Style | Behind |
|---|---|---|---|---|
| P1-P4 Display cases | islands x 602..605 / 618..621, z 160 / 170, y 65 | $1,000-2,000 each | jewel | G1-G4 |
| P5 / P6 Sculptures | x 570..571, z 166 / x 586..587, z 186, y 65 | $2,000-4,000 each | art (2,000, 3 s) | open |
| P7 Masterpiece | x 612..613, z 189, y 65 | $2,000-4,000 | art | open |

**Spots:** exit (595.5, 65, 133.5) facing north, the hologram (595.5, 70, 133.5). No cops (not advanced). GPS 5020 the plaza (595.5, 65, 131.5), linked to 5006. POI: landmark "Art Gallery". Budget 90,000 blocks.
- **Built 2026-10-29**: 14,380 blocks (`city.js check` passes), pasted with `--box 556,126,636,222`; the label placed; region, heist (not advanced), 4 smash gates, 7 piles, 15 traps (11 blinking lasers, 3 turret cameras at damage 0.5, the collapsing floor), the snapshot, the hologram, POI 38 and GPS 5020 set up over RCON. Its 34-long lasers warn "less than 2 blocks inside" in game: harmless, their ends are inside the walls. The roll came to $15,250 on its first opening. `bots/run.js north gallery` 7/7: open and armed, level 11 kept out at the door, level 12 in, G1 smashed, the jewels behind it and a sculpture paid into the bag; it ends the run and reopens the Gallery after. `bots/scenarios/north.js` (was reserve.js) takes a heist id; `north reserve` still 8/8.

## 4. The Nightclub (`north/club.js`)

A medium heist (expand/PLAN.md 1.3): difficulty 2, level 10, **not advanced** (no alarm or cops; its cameras are turrets, `effect=damage`), pool $14,000, escape 6:00 / cooldown 10:00. "Club Neon": a black box with a neon band, its door on the city's Bank Street.

Changed before building (COMMON): the club's box starts at x 664 (was 668), so the module lays its own forecourt from the end of Bank Street's east walk (x 663); the region is the building's (below). Its door lines up with the city's GPS node 3017 (BANK_ST_N, z 262.5).

**Footprint** (the module owns x 664..740, z 228..278):
- The forecourt x 664..669 (sidewalk, light gray), a red carpet z 261..264 to the door, a black canopy x 666..669, z 259..266 at y 69, and an ATM at (667, 256) facing the street.
- The building: walls x 670..737, z 240..276, one tall floor (floor 64, rooms y 65..74, roof 75 with a parapet). Dark stone walls, a pink and light blue neon band at y 70 and "CLUB NEON" (a label) above the door. The doorway x 670, z 261..264, y 65..68. The rest of the lot grass, a few trees.

**Heist region** `heist_club` x 669..738, y 63..77, z 239..277 (40,950 blocks; from y 63 so the plates sit 2 inside).

**Rooms** (inside x 671..736, z 241..275):
1. **The lobby** x 671..680: the coat check (counter along the north), the bouncer's stand, couches on the south wall. An opening in the wall x 681 at z 261..264.
2. **The main room** x 682..722:
   - The bar along the north: the back counter z 242 with three tills (P1-P3), the bartenders' lane z 243..245, the front counter z 246 (x 686..718) with glass on top; G1 the glass over the counter at x 700..703 (smash), the bar's ends closed.
   - The dance floor x 688..716, z 251..271: lit glass (magenta and light blue over sea lanterns), speakers at its corners.
   - **Six lasers blinking to a beat** across the whole room (x 689.5, 693.5, 697.5 | 707.5, 711.5, 715.5; z 247.0..276.0, y 66.2: too high to jump, so you time the gap), on 2 s / off 2 s, rippling west to east (offsets 0, 1, 2); the strip x 699..706 in front of the bar is a breather. A turret over the bar's east end.
   - The DJ booth x 717..721, z 265..274 (raised one block): the decks and the DJ's cash box (P4, open).
3. **The VIP lounge** x 724..736, z 241..264 (the wall x 723, a rope gap at z 249..252): red couches round two tables with cash (P5, P6, open); a row of 4 plates just inside the gap (jump it); a sweeping turret on the east wall.
4. **The manager's office** x 724..736, z 266..275 (the wall z 265; a staff door in x 723 at z 270..271): the desk, a bookshelf row at x 731 with a 2-wide gap of plates (z 270..271), and the wall safe G2 (x 733, z 270..271, y 65..66, a Safe Kit) into a closet holding P7.

**Loot** (≈ $10,450 on an average roll; the pool caps it at $14,000):

| Pile | Where | Value | Style | Behind |
|---|---|---|---|---|
| P1-P3 Tills | x 691 / 702 / 713, z 242, y 65 | $600-1,200 each | register (250, 2 s) | G1 |
| P4 DJ's cash box | (720, 66, 266) | $500-1,000 | cash (250, 2 s) | open |
| P5 / P6 VIP tables | x 729..730, z 247 / 258, y 65 | $1,000-2,000 each | cash (500, 3 s) | open |
| P7 The office safe | x 736, z 270..271, y 65 | $3,000-5,000 | cash (1,000, 4 s) | G2 (safe, 4 digits) |

**Spots:** exit (666.5, 65, 262.5) facing west, the hologram (666.5, 70, 262.5). No cops. GPS 5030 the forecourt (666.5, 65, 262.5), linked to 3017. POI: landmark "Nightclub". ATM 7 at (667, 65, 256). Budget 70,000 blocks.
- **Built 2026-10-29**: 10,542 blocks (`city.js check` passes), pasted with `--box 664,228,740,278`; the label and the ATM display placed; region, heist (not advanced), 2 gates, 7 piles, 14 traps (6 blinking lasers, 2 turrets at damage 0.5, 6 plates), the snapshot, the hologram, ATM 7, POI 39 and GPS 5030 (linked to 3017) set up over RCON. The lasers warn "less than 2 blocks inside" in game: harmless, their ends are in the south wall. The roll came to $9,250 and $12,250 on its first two openings. `bots/run.js north club` 8/8: open and armed, level 9 kept out at the door, level 10 in, the bar glass smashed, a till and a VIP table paid into the bag, the office safe with its hitboxes.
