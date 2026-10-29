# Map expansion: two new cities and nine heists

Written 2026-10-29 from the owner's requests: "find more big and small heist ideas from all games", "give the top 3 from each that can be easily implemented and cause the least amount of lag", "add them all, and expand the map to more cities and add some to the current ones".

This is the site plan. Each module gets its own detailed plan (boxes, blocks, spots, setup commands), following `tools/build/city/PLAN.md`. Every number is a PROPOSAL for the owner.

## 0. Rules for every new heist (the "least lag" pick)

- Fixed buildings only. Nothing moves: no trains, trucks, moving blocks or minecarts.
- Only what already exists:
  - loot.sk: pile, smash, safe, drill;
  - traps.sk: laser, plate, floor, camera;
  - clerk.sk;
  - cops.sk alarm assaults, under the same caps.
- New code is limited to two small pieces (section 4): `atm.sk` and a heavy loot style.
- No looping particles. No lights or blocks changed across a city. Entities exist only while the heist is open (loot.sk and traps.sk already work this way).
- Hollow shells for tall things: cooling towers, hills and the mansion's hill, the way the town's hills are built.
- Every heist building sits in a region that touches no safe zone and no other heist, with 15 blocks of gap.

## 1. Where everything goes

```
 x: -700 ........ -41 | -40 ....... 480 | 481 ....... 940 | 941 ......... 1500
z 150  PORT ASHBY      |                 |                 |  IRONVALE
z 226  (harbor west)   |     PRISON      |  RISING CITY    |  [POWER PLANT]
z 419  == Harbor Road =|== highway =====|== Main Avenue ==(o)== Main Avenue East ==
z 471                  |   ridge/tunnel  |                 |        [MANSION HILL]
z 686                  |  MOUNTAINSIDE (the town) .........|
z 1300
```

| District | Box | New things |
|---|---|---|
| Port Ashby (new) | x -700..-41, z 150..700 | Federal Reserve (big), Police HQ evidence room (big), Art Gallery (medium), Lucky Pawn (small), 4 ATMs, a base, a garage |
| Ironvale (new) | x 941..1500, z 150..800 | Power Plant (medium), the Mansion (big), 2 ATMs |
| Rising City (existing) | x 481..940, z 226..470 | Nightclub (medium) on the kept-free north blocks, 3 ATMs |
| Mountainside (existing) | x 120..770, z 686..1300 | Car Wash (small), 3 ATMs |

### 1.1 Port Ashby (west, the harbor)

- **Connection:** the prison highway (z 419..441, ending at x -40) carries on west as Harbor Road, with the same profile as outdoors.js `roads()`, out to x -600.
- **Streets:**
  - Harbor Road: x -600..-41, z 419..441.
  - Bay Street: x -330..-307, z 160..690.
  - Dock Street: x -520..-497, z 160..690.
  - North Street: z 260..275, x -600..-60.
  - South Street: z 580..595, x -600..-60.
- **Water:** the harbor fills x -700..-601 (top water y 60 and the bed dug out, like the town's river). Piers run out at z 300, 420 and 540.
- **Lots** (each building's box; its region is inside the box):

| Building | Box | Heist | Difficulty, level | Inside |
|---|---|---|---|---|
| Federal Reserve | x -290..-170, z 285..405 | `reserve` | 4, level 50, advanced | Lobby with cameras. A drill door to the vault antechamber. A second vault door (a drill again, until M3 blast charges exist). Gold bars (the heavy style). Deposit boxes as safes. |
| Police HQ | x -150..-65, z 285..405 | `evidence` | 3, level 30, advanced | A working station look. The evidence cage (a drill) holds seized cash, jewels and goods piles. Cameras sweep the halls, and the cops' spots are inside, so the alarm answers fast. |
| Art Gallery | x -290..-200, z 450..570 | `gallery` | 2, level 12 | Paintings (the art style). Glass cases (smash) for sculptures and jewels. Blinking lasers and sweeping cameras. Not advanced. |
| Lucky Pawn | x -180..-140, z 450..495 | `pawn` | 0 (a store), level 1 | A clerk at the register. The back room's safe needs a Safe Kit. No police (the store rule). |
| Harbor Hideout | x -120..-70, z 450..520 | none | base | `safe_base_harbor`, so loot sells here. 2 crate stands. |
| Port Garage | x -180..-120, z 520..575 | none | garage site | `safe_garage_port` |
| Warehouses and docks | x -600..-331 | none | props only | Kept low and hollow. Contract car spots in the lots. |

### 1.2 Ironvale (east, industrial)

- **Connection:** Main Avenue East leaves the roundabout's east side, x 831..1300, z 419..441, with the avenue's profile and no parking bays.
- **Power Plant:** box x 960..1110, z 300..405, north of the avenue. Heist `power`, difficulty 3, level 25, advanced.
  - The turbine hall has blinking lasers between the turbines and a collapsing catwalk over the pit.
  - The control room's safe holds the payroll.
  - Copper spool piles (the goods style) sit behind a drilled cage.
  - Two hollow cooling towers stand outside the region, as decoration only.
- **The Mansion:** a hill centred on x 1250, z 640, top y 90, built as a hollow shell. The house is x 1205..1295, z 595..685 on the summit, and its driveway climbs from the avenue at x 1240..1251. Heist `mansion`, difficulty 4, level 60, advanced. Rooms in order:
  - the foyer, with cameras;
  - a laser hall;
  - the library, with a collapsing floor and the code door (a safe);
  - the gallery, with smash cases;
  - the study, with the master safe;
  - the vault room, with a drill and the bullion and cash behind it.
  - When the alarm trips, the existing cop assaults come up the driveway. There is no custom boss.
- **2 ATMs** on the avenue.

### 1.3 Rising City (additions)

- **Nightclub:** box x 668..740, z 228..278, on the kept-free north blocks. Its door faces Bank Street (the west face, with a sidewalk at x 664..667). Heist `club`, difficulty 2, level 10, not advanced.
  - Dance-floor lasers blink to the beat (`blink=true`, the trap system's own).
  - The bar's register is a smash gate.
  - The VIP lounge has cash piles.
  - The manager's office has a safe.
- **3 ATMs:** two on Main Avenue's north sidewalk and one on Hatch Plaza.

### 1.4 Mountainside (additions)

- **Car Wash:** heist `carwash`, difficulty 0, level 1.
  - Two wash bays and a coin room with 3 cash-box piles. There's no clerk: the boxes are open to grab.
  - It goes on a land-owned lot of at least 40 × 30 that touches a street, outside `KEEP_FREE`. The module's builder picks the lot with town `plan-layout.js`'s ownership and writes it into this table.
- **3 ATMs:** in front of the gas station, the Gun Shop lot and the dealership.

## 2. Heist numbers (proposals, following heists.sk's difficulty table)

| Heist | Difficulty | Level | Pool | Escape / cooldown | Advanced |
|---|---|---|---|---|---|
| ATM (each) | — (atm.sk) | 1 | $300-700 | 15 min per ATM | no police |
| pawn | 0 | 1 | $1,500-3,000 + safe $1,000-2,000 | store | no |
| carwash | 0 | 1 | $1,200-2,400 | store | no |
| club | 2 | 10 | $8,000-14,000 | 6 / 10 min | no |
| gallery | 2 | 12 | $10,000-18,000 | 6 / 10 min | no |
| power | 3 | 25 | $20,000-32,000 | 8 / 15 min | yes |
| evidence | 3 | 30 | $24,000-38,000 | 8 / 15 min | yes |
| reserve | 4 | 50 | $45,000-70,000 | 10 / 30 min | yes |
| mansion | 4 | 60 | $50,000-80,000 | 10 / 30 min | yes |

## 3. Shared for both new cities

- Streets use the town and city COMMON helpers: asphalt mix, curbs, lamps every 24 blocks. Sidewalks are light gray concrete. Road blocks come from `gps.road-blocks`, so the road scan finds them.
- **Districts:**
  - `district_port_ashby`: x -700..-41, z 150..700, y 0..200, named "Port Ashby".
  - `district_ironvale`: x 941..1500, z 150..800, named "Ironvale".
- **After the paste:**
  - The phone's city map grows to cover all four cities: `/dphone city scan -700 -30 1500 1300 [scale] world confirm`. The automatic scale goes to 2 if a side passes 2,048 pixels.
  - Then `/dphone roads scan`, which groups cells k × k over 262,144.
- **GPS path nodes:** ids from 5001 (Port Ashby) and 6001 (Ironvale).
- **POIs:**
  - landmark: Federal Reserve, Power Plant, Mansion;
  - base: Harbor Hideout;
  - garage: Port Garage.

## 4. New code (small)

1. **atm.sk** (about 120 lines).
   - An ATM is one block spot with a furniture model (an item display drawn by make-item-art.js, `donating:atm`) and an interaction hitbox.
   - "Hold right-click · Crack the ATM": 6 s with loot.sk's hold rules (repeat every 4 ticks, a pause over 1 s starts over, a hit resets).
   - It pays a rolled $300-700 into the bag through bag.sk, so it sells at a base. A full bag takes nothing.
   - Then it's dark (a red screen) for 15 min.
   - Not in safe zones; level 1 and up; no police and no wanted status; not for passive players, who get passive's payout like other robberies.
   - Staff: `/datm add [x y z yaw] | remove <n> | list | dump`. Saved in `{atm::<n>}`.
   - Lag: one display and one hitbox per ATM, and only in loaded chunks.
   - Bots: atm.js (hold, pay, cooldown, refusals).
2. **The bullion style** in core.sk `loot::bullion::*`: piece $5,000, take 4 s.
   - One bar fills most of a starter bag, so the gold vaults are crew work, with no new carry rule.
   - Later, if the owner wants it: slowness while carrying bullion.
3. **Setup (setup.sk):** add the new heists to `/dsetup heists` and the ATMs to `/dsetup places`.

M1-M3 from city/PLAN.md section 10 (pick groups, security switches, blast charges) stay later. The Federal Reserve's second door would become a blast charge with M3.

## 5. Order of work

1. This site plan (the owner can rename the cities or move things).
2. Detailed plans per module, critiqued.
   - The modules: `port/streets`, `port/reserve`, `port/police`, `port/gallery`, `port/pawn+hideout+garage`, `iron/streets`, `iron/power`, `iron/mansion`, `city/club`, `town/carwash`.
   - Plus the ATM art, atm.sk and the bullion style.
3. Build the modules offline, then review and check them: the build tools' `check`, and laser heights against the trap height guide.
4. Run a backup (tools/backup.ps1) before pasting. Paste Port Ashby, then Ironvale, then the club and the car wash.
5. Setup on the server: regions, heists, loot, traps, cop spots, POIs, garages, the base, crates, ATMs, districts, the city and road rescans, and GPS paths.
6. Bots: one scenario per heist (it opens, its loot pays, its traps fire, and the alarm for advanced heists), plus atm.js. Then PLAYTEST items for the owner.
