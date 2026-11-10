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

Changed 2026-10-29 (owner: "just add to the district with the bank and jewlery store then add a new city/district with others. go one by one plan the layout first then build everything building by building"): five heists go into Rising City on new blocks north of it, and the other three go into one new city, Ironvale. I build them myself, one building at a time, with no workflow. Port Ashby is dropped.

```
 x: -40 ........... 480 | 481 ............ 940 | 941 .............. 1500
z 0                      |  RISING CITY NORTH   |
z 110                    |  == Gallery Row ===  |
z 132                    | [GALLERY] | [RESERVE]|
z 226                    |  .. [CLUB] ..        |
z 226..470    PRISON     |  RISING CITY (built) |  IRONVALE [POWER PLANT]
z 419  === highway ======|== Main Avenue ====(o)|== Main Avenue East =====
z 450                    |                      |  [POLICE HQ]   [MANSION HILL]
z 800                                                                  
```

### 1.1 Rising City North (added to the Rising City district)

- **Area:** x 481..940, z 0..225, plus the old kept-free strip x 664..930, z 226..279 for the Nightclub.
- **Build set:** its own build driver (`tools/build/north.js`, a mirror of city.js) with its own COMMON (`tools/build/north/plan-layout.js`). The built city's modules are never touched.
- **District:** `district_rising_city` is widened to z 0..470.

**Streets:** the same profile as the city's Bank Street. Road blocks are from `gps.road-blocks`, so the road scan finds them.

| Street | Box | Profile |
|---|---|---|
| Bank Street North | x 640..663, z 0..229 | road x 643..660, yellow dash x 651..652 (z % 6 < 3), curbs x 642 / 661, walks x 640..641 and 662..663. It joins the built Bank Street at z 230. |
| Gallery Row | x 481..930, z 110..125 | road z 113..122, yellow dash z 117..118 (x % 6 < 3), curbs z 112 / 123, walks z 110..111 and 124..125. The crossing with Bank Street North is asphalt. |

Street lamps every 24 blocks on both sidewalks (the city's `streetLamp`).

**Buildings:**

| Building | Box | Front | Heist | Difficulty, level |
|---|---|---|---|---|
| Federal Reserve | x 670..800, z 132..222 | west, a plaza on Bank Street | `reserve` | 4, level 50, advanced |
| Art Gallery | x 556..636, z 132..222 | north, on Gallery Row | `gallery` | 2, level 12 |
| Nightclub | x 668..740, z 228..278 | west, on Bank Street (sidewalk x 664..667) | `club` | 2, level 10 |
| Lucky Pawn | x 600..636, z 66..106 | south, on Gallery Row | `pawn` | 0 (a store), level 1 |
| Car Wash | x 490..550, z 132..200 | north, on Gallery Row | `carwash` | 0 (a store), level 1 |

Everything else north of Gallery Row stays grass and kept free for later.

**ATMs (3):**
- the Reserve's frontage at x 666, z 180 (between Bank Street North's east walk and the building);
- Gallery Row's north walk at x 700;
- Bank Street North's west walk at z 60.

### 1.2 Ironvale (the new city, east)

- **Area:** x 941..1500, z 150..800. District `district_ironvale` "Ironvale".
- **Connection:** Main Avenue East leaves the roundabout's east side. It runs x 831..1300, z 419..441, with the avenue's profile (sidewalks z 416..418 and 442..444) and no parking bays.
- **Build set:** `tools/build/iron.js` with its own COMMON (`tools/build/iron/plan-layout.js`).

| Street | Box | Profile |
|---|---|---|
| Main Avenue East | x 831..1300, z 416..444 | as Main Avenue |
| Hill Drive | x 1240..1251, z 445..594 | road x 1242..1249. It climbs from y 64 to the summit's y 90, 1 block every 6 (z 445..600), with retaining walls. |

**Buildings:**

| Building | Box | Front | Heist | Difficulty, level |
|---|---|---|---|---|
| Power Plant | x 960..1110, z 280..405 | south, its gate on Main Avenue East | `power` | 3, level 25, advanced |
| Police HQ | x 960..1060, z 450..545 | north, on Main Avenue East | `evidence` | 3, level 30, advanced |
| The Mansion | the hill centred x 1250, z 640 (a hollow shell, top y 90); the house x 1205..1295, z 595..685 | south, at the top of Hill Drive | `mansion` | 4, level 60, advanced |

**ATMs (2):** Main Avenue East's north walk at x 1000 and at x 1180.

### 1.3 What goes in each building

- **Federal Reserve:**
  - the lobby, with cameras;
  - vault door 1 (a drill), then the antechamber's lasers;
  - vault door 2 (a blast charge since 2026-11-04);
  - bullion piles;
  - deposit boxes (safes).
- **Art Gallery:**
  - paintings (the art style) on the walls;
  - glass cases (smash) with jewels;
  - blinking floor lasers and sweeping cameras;
  - not advanced.
- **Nightclub:**
  - dance-floor lasers blinking to a beat;
  - the bar's register behind glass (smash);
  - the VIP lounge's cash;
  - the manager's office safe.
- **Lucky Pawn:** a clerk at the register, and the back room's safe (a Safe Kit). No police.
- **Car Wash:** two bays and a coin room with 3 open cash boxes. No clerk, no police.
- **Power Plant:**
  - the turbine hall, with blinking lasers and a collapsing catwalk over the pit;
  - the control room's payroll safe;
  - copper spools (the goods style) behind a drilled cage;
  - two hollow cooling towers outside the region.
- **Police HQ:**
  - the front desk and offices, with cameras;
  - the evidence cage (a drill) holding seized cash, jewels and goods;
  - cop spots inside, so the alarm answers fast.
- **The Mansion:**
  - the foyer, with cameras;
  - the laser hall;
  - the library, with a collapsing floor and the code door (a safe);
  - the gallery, with smash cases;
  - the study's master safe;
  - the vault room, with a drill and bullion and cash.
  - The existing cop assaults come up Hill Drive. There is no custom boss.

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

## 3. Shared

- Districts:
  - `district_rising_city` widened to x 481..940, z 0..470;
  - `district_ironvale`: x 941..1500, z 150..800, y 0..200, named "Ironvale".
- After each paste:
  - `/dphone city scan -40 -30 1500 1300 0 world confirm` (the phone's city map over everything; the automatic scale goes up if a side passes 2,048 pixels);
  - then `/dphone roads scan`.
- GPS path nodes: ids from 5001 (Rising City North) and 6001 (Ironvale).
- POIs: landmark Federal Reserve, Power Plant and Mansion.

## 4. New code (small)

1. **atm.sk** (built 2026-10-29: botsun.js atm 10/10).
   - An ATM is one block spot with a furniture model (built as blocks by the street module) and a click box and floating screen from atm.sk.
   - "Hold right-click · Crack the ATM": 6 s with loot.sk's hold rules (repeat every 4 ticks, a pause over 1 s starts over, a hit resets).
   - It pays a rolled $300-700 into the bag through bag.sk, so it sells at a base. A full bag takes nothing.
   - Then it's out of order (the screen says so) for 15 min.
   - Not in safe zones; level 1 and up; no police and no wanted status; passive players can crack them and get passive's payout at the base like other robberies.
   - Staff: `/datm add [x y z] | remove <n> | list | dump | ready [n]`. Saved in `{atm::<n>}`.
   - Lag: one display and one hitbox per ATM, and only in loaded chunks.
   - Bots: atm.js (hold, pay, cooldown, refusals).
2. **The bullion style** (built 2026-10-29) in core.sk `loot::bullion::*`: piece $5,000, take 4 s.
   - One bar fills most of a starter bag, so the gold vaults are crew work, with no new carry rule.
   - Later, if the owner wants it: slowness while carrying bullion.
3. **Setup (setup.sk):** add the new heists to `/dsetup heists` and the ATMs to `/dsetup places`.

M1-M3 from city/PLAN.md section 10 (pick groups, security switches, blast charges) stay later. The Federal Reserve's second door would become a blast charge with M3.

## 5. Order of work (one at a time)

1. The layout: this file, and the render `expand/layout.png` (`tools/node/node.exe tools/build/render.js tools/build/expand/layout.js tools/build/expand/layout --views top`).
2. Rising City North:
   - the streets;
   - the Federal Reserve;
   - the Art Gallery;
   - the Nightclub;
   - Lucky Pawn;
   - the Car Wash.
   Each building gets a short section in north/PLAN.md, then its module, `north.js check`, a backup, the paste, the setup (region, heist, loot, traps, cop spots, ATMs) and a bot check that it opens and pays.
3. Ironvale: the streets and Hill Drive's hill, then the Power Plant, the Police HQ and the Mansion, the same way.
4. The map rescans, districts, POIs and PLAYTEST items.
