# City core heists: the Jailbreak-faithful concept

Angle: each heist should read as Jailbreak's at first sight, from its outside look to its layout and the order of the
robbery. Each gets one or two GTA or Payday twists, chosen because they fit Donating's existing mechanics. The goal is
low risk and a fast build. Every heist runs at launch on today's loot.sk, traps.sk, heists.sk and cops.sk alone.
Three optional new mechanics are specified at the end (M1-M3); each one adds a layer to a heist that already works
without it.

Sources: research-jailbreak.md, research-gta.md, research-payday.md, CLAUDE.md, core.sk (loadSettings), loot.sk
(lootValidate, dlootAdd, dlootCheck, the gate `alarm` key), traps.sk, heists.sk (heistTripAlarm, the chase), cops.sk
(/dcops), story.sk (storyHeistFits). Every number below is a PROPOSAL for the owner.

---------------------------------------------------------------------------------------------------------------------

## 0. The rules this design is built to (checked in the code today)

- **Per-heist limits.** 24 loot spots, counting gates and piles together (`loot::max-spots`). 150 pieces at most,
  counted as the sum of every pile's maximum (`max-heist-pieces`). 40 traps (`trap::max-per-heist`).
- **Per-pile limits.** A pile has 12 cells and 24 pieces at most. A gate is a solid cuboid (no air in its box) of at
  most 27 blocks.
- **Opening a gate.** When a gate opens, its blocks turn to air for the run. So a safe gate can serve as a keypad
  door, and a smash gate as a window.
- **Gates can trip the alarm.** Every gate takes `alarm=true|false` (`lootKeyType`), but it only fires in an advanced
  heist with police. Defaults: smash false, safe false, drill true.
- **Clicks need you inside.** A robber clicks loot or a gate only while standing in the region ("Get inside the ...
  first"). So the region takes in a forecourt of 2-3 blocks outside every entry gate, and that gate's outer side then can't
  be clicked from the street.
- **Air over pile cells.** A pile's cells need 2 air blocks over them (town.js check rule 232: glass counts as solid).
  So a jewel case here is a plinth row with its glass **in front** (the smash gate) and a glass lid 3 blocks up. The
  glass never sits right over the cells.
- **Trap damage.** D = max(1, round(d x 2 x m)) / 2 hearts, with m = 1.25, 1.5 and 1.75 for difficulty 2, 3 and 4.
  This design sets `damage=1.5` for Jailbreak's "20% a touch" floor lasers (2 hearts at d2). It sets `damage=2` for
  obstacle lasers, plates and floors (2.5, 3 and 3.5 hearts at d2, d3 and d4).
- **The chase.** Everyone inside when the alarm trips is hunted. The radius is 100 blocks from the region's centre,
  and twice that for the rest of the chase once the robber has been in a vehicle. A getaway counts for the story only
  with that run's loot and only after the first wave (`heistWave >= 1`).
- **Cops never open doors.** Every route the cops should take is an open doorway with no door block in it.
- **Lockdown boxes.** Each box is filled with iron bars when the alarm trips. Never box the last way out.
- **Story credit per run.** A safe gives the "crack" credit to the one robber who cracks it. A vault gives the "drill"
  credit to the last jam fixer, or else the mounter. So the more safes and drills a heist has, the more robbers can
  finish a story step in one run. That is why each heist below has 2-4 safes and the Bank and Museum have 2 drills.
- **What the story needs** (story.sk storyHeistFits):

  | Mission | Level | Need | Covered by |
  |---|---|---|---|
  | Mara c1 rob | 0 | any heist | stores, Jewelry |
  | Mara c2 crack | 5 | safe | Jewelry (2 safes) |
  | Mara c3 drill | 20 | drill | Bank (2 drills) |
  | Mara c3 three heists | 20 | heist3 | Donut, Gas, Jewelry, Bank |
  | Mara c4 getaway | 45 | adv | Bank, Museum |
  | Mara c4 d4 sales | 45 | d4 | Museum |
  | Mara c5 finale | 45 | finale: advanced d4 with a safe and a drill | Museum |
  | Vic v2 sales | 45 | d2+ | Jewelry, Bank, Museum |
  | Vic v4 crack | 45 | safe in d3+ | Bank, Museum |
  | Vic v5 drill and lose the cops | 45 | adv,drill | Bank, Museum |

---------------------------------------------------------------------------------------------------------------------

## 1. Site sketch: Rising City, east of the prison

The city is a compact slice of Jailbreak's Rising City. The prison highway carries on east from x 481 as **Main
Avenue**. The Jewelry Store and the Bank stand a block apart on the same north-south street, **Bank Street**, as they
do in Jailbreak. The Museum stands alone on a raised **mesa** at the avenue's east end, as Jailbreak's stands on its
hill east of the grid. Everything sits north of the avenue for x <= 775, because the town ridge starts at z 482. The
Museum is east of x 775.

```
 x: 481  505     560    595    636 640   663 666          765 775  790   820  841       898  920
z 230   .              .              | B |   (Bank Street carries on north: room for the casino etc.)
z 262   .              .              | a |  C2(bank)
z 280   .     [HATCH PLAZA] [BANK 595..630]| n |
        .     manhole 575,300 bikes x2     | k |
z 321   .              .    (region)       |   |                   ~~~~~~ storm channel z 280..295 ~~~~~~~
z 337   .              .               C1  |   |  C1(bank)         ~~ sunk to y 59, x 780..930  ~~~~~~~~~~~
z 340 ==W== 2nd Street (z 340..355, 16 wide) ==|=========================> east end 775,347 ramp<--channel
z 356   e   alley: fire-escape foot, bike rack x3 (600..606,360) |   |      bikes x3 (765..770,336)
z 374   s              [JEWELRY 598..634]  |   |                      MESA x 820..920, z 300..400, top y 72
z 412   t              [ X window, forecourt]  |               [MUSEUM region 841..898 x 330..371, y 60..97]
z 416   .  sidewalk  ..................... jct ...................  C3(m) 925,350 east terrace foot
z 419 ======== MAIN AVENUE (the highway continued, z 419..441) ========= ROUNDABOUT x 790..830 ==ramp==> plaza
z 441                                                       C2(m) 810,430      (z 372..400, y 72) C1(m) 870,388
z 444 sidewalk; z 445..470: parking bays + street trees (no buildings: the ridge foot is at z 482)
```

### 1.1 Streets
- **Main Avenue** (x 481..790, z 419..441) copies outdoors.js exactly: black_concrete mixes, a yellow dash at z 430,
  white edge lines at z 420 and 440, light_gray_concrete sidewalks at z 416..418 and 442..444, and smooth_stone_slab
  curbs at y 65. At **Bank Street** (x 640..663) it has a junction with four traffic lights like the prison's, and it
  ends at a **roundabout** (x 790..830, z 405..455). A ramp road climbs from the roundabout along the mesa's south
  wall (z 402..409, half a block every 4) to the Museum plaza at y 72. That is Jailbreak's spiral road, kept short.
- **Bank Street** (x 640..663, 24 wide like the town approach) runs from the avenue north to z 230 and is left open
  for later city blocks.
- **2nd Street** (z 340..355, 16 wide) runs from **West Street** (x 490..505, joining it back to the avenue) to the
  storm-channel ramp at x 775. It is the back route that links all three heists.
- **Alleys**: Jewelry alley (z 356..373, behind the store) and Hatch Plaza (x 560..590, z 285..315, behind the Bank).
  Paving: polished andesite and stone bricks. Never concrete on open-sky surfaces at y 64, except the streets
  themselves, which the GPS scan should read.
- The phone's city scan grows to the new box, e.g. `/dphone city scan -40 -30 940 1300 0 jailbreak`. The ramp road and
  the channel need hand GPS paths (`dphone path`).

### 1.2 Route from the highway
An escapee walks or drives east along the avenue past the prison's last lamp (x 476). The Jewelry Store's blue glass
corner is the first thing on the left at Bank Street. Turning left up Bank Street, the green Bank tower is one block
north. The Museum's tan pediment shows on the mesa at the end of the avenue.

### 1.3 Getaways and cop corners (the design's main lever: cops come from one side, the clean exit is the other)

| Heist | Hot side (cop spots) | Clean way out | Where the chase ends (100 blocks) |
|---|---|---|---|
| Jewelry (not advanced) | none active. 2 spots set for later: (596.5, 65, 417.5) and (665.5, 65, 417.5) | roof, then fire escape, alley and bikes | n/a (no cops) |
| Bank | Bank Street, east sidewalk: C1 (665.5, 65, 337.5), C2 (665.5, 65, 262.5) | vault, then alt exit, tunnel, manhole in Hatch Plaza, then west down West Street or a bike | about x 512, z 300, or the avenue at x 560 (131 from the centre) |
| Museum | plaza C1 (870.5, 73, 388.5), roundabout C2 (810.5, 65, 430.5), east terrace foot C3 (925.5, 65, 350.5) | vault antechamber, then drain hatch, drain tunnel, storm channel west, then the ramp to 2nd Street and bikes; or the west side door and the west terrace stairs | 2nd Street's east end (767, 65, 337): 105 from the centre |

A bike doubles the chase radius (it is an MTVehicles seat) but gives speed. Both choices are real.

### 1.4 Kept free
- North of z 280 along Bank Street, for the casino and later blocks.
- x > 920, for the power plant and later builds.
- The parking strip south of the avenue, for contract car spots.
- A **City Criminal Base** lot (x 490..550, z 356..410, by the Jewelry alley) is worth reserving: Jailbreak's base is
  a zipline ride from the Jewelry roof, and today the nearest sale point is the town's Safehouse, about 500 blocks
  away. This is the owner's call and not part of this build.

---------------------------------------------------------------------------------------------------------------------

## 2. The Jewelry Store (`jewelry`, difficulty 2, level 5)

### 2.1 Theme and hook
**Jailbreak:** this is the vertical smash-and-grab. You break in through a marked window on the street and smash a
showroom and a basement full of glass cases. Then you climb two laser floors and leave by the roof, where three
stair-hut doors and a vent shaft give you a choice. It is about as close to Jailbreak's 2025 store as a 100k region
allows: the black frame, the blue glass, the cyan diamond on the corner, the red X marks on the pavement and the
gray roof huts.

**Twists:**
- **Payday's manager safe with the best piece in it** (Jewelry Store, Diamond Store). The top floor's office safe
  holds the **Blue Heart**, a single stone worth more than any case. It turns the Jailbreak climb from "the way out"
  into "the way to the prize". It also gives level-5 robbers Mara's chapter-2 safe at the top of a short obby.
- **GTA's Jewel Store Job getaway: bikes out the back.** The roof's fire escape drops into an alley with a stolen-bike
  rack (bikes.sk), so leaving by the roof leads somewhere.

**Why it's fun:** a quick greedy grab downstairs fills a Duffel in about four cases. The climb is optional and pays
for skill. With no cops, the threat outside is other players with guns waiting at the window, so the roof and the
alley give a way past them. That is Jailbreak's roof-door guessing game, played against players instead of cops.

### 2.2 Footprint and look
- **Building:** 32 x 36 (x 600..631, z 376..411), on the north-west corner of Main Avenue and Bank Street. Region
  x 598..634, z 374..414, y 56..97 = 37 x 41 x 42 = **63,714 blocks**. It takes in a 3-block forecourt on the avenue
  side (z 412..414) and the Bank Street side (x 632..634), paved in polished andesite. The sidewalks stay outside.
- **Levels:**

  | Level | Floor slab | Interior |
  |---|---|---|
  | Basement | y 57 | y 58..63 |
  | Ground | y 64 | y 65..71 |
  | Obby 1 | y 72 | y 73..78 |
  | Obby 2 | y 79 | y 80..85 |
  | Final floor (low, Jailbreak's) | y 86 | y 87..90 |
  | Roof | y 91 | parapet y 92, stair huts y 92..95, hut roofs y 96 |

- **Outside:**
  - **Frame:** polished_blackstone piers at the corners and every 6 blocks, blackstone floor bands.
  - **Glass:** full-height light_blue_stained_glass curtain walls on the two street faces. The obby floors show their
    lasers through the glass, which is Jailbreak's "peek before you go up".
  - **Logo:** a 5 x 5 cyan diamond (cyan_stained_glass, prismarine, sea lantern) on the south-east top corner.
  - **Top band:** gray louvres of iron bars and andesite walls.
  - **Front:** two red_terracotta X marks on the forecourt under the **X window**. A fake double door of glass panes
    beside it. A smooth_quartz awning.
  - **North and west walls:** blackstone, with small windows.
- **Roof:** smooth_stone with polished_andesite ribs, a calcite parapet and two light-gray stair huts in an L
  (calcite and smooth_quartz). The huts have **three open doorways**:
  - north: a landing at z 374..375 inside the region, then the steel **fire escape** outside the region (z 370..373)
    down into the alley;
  - west: the **vent shaft**, 2 x 2 with a ladder, down to the ground floor's NW corner (y 72..90, sealed from the obby
    floors);
  - east: a deck with a view over Bank Street, where the hologram sits.
- **Inside, stairs:** the main stair (NE corner) climbs from the ground floor to obby 1's east end. Each obby floor
  makes you cross the room: obby 1 runs east to west, obby 2 west to east. The final floor has two switchback flights
  to the huts. The back stair (NW) goes down to the basement.

### 2.3 The robbery, beat by beat

**Route in**
1. Stand on the forecourt's X and smash the **X window** (gate G1). Or climb the fire escape, cross the roof and come
   down the vent.

**Ground floor** (blue carpet, dark pillars, a light-box ceiling of sea lanterns behind white glass)
2. Five display islands. Each is a 1 x 4 plinth of polished_deepslate at y 65, with a 4 x 2 light_blue glass-pane
   front (the smash gate), pane ends and back, and a glass lid at y 68.
3. Four low red floor lasers (h 0.4, jump them) run between the island rows and along the walls.

**Basement** (Jailbreak's long case room: dark walls, a glowing ceiling)
4. Two wall counters: a 1 x 10 ring counter (west wall) and a 1 x 8 watch counter (east wall), each behind a
   pane-front smash gate.
5. Three blinking floor lasers cross the aisle.
6. The **workshop** at the back has a small safe (G9) holding a tray of loose stones. It is the easy safe for Mara's
   chapter 2: no climb.

**Obby 1 ("Layered Laser")**
7. A grid of crossing low lasers. Twelve 1-high stepping blocks (polished_blackstone topped with blue-glass slabs)
   let you hop across.
8. A 2 x 2 landing in the middle holds **loose gems**.

**Obby 2 ("Moving Lasers")**
9. Five pillar pairs with blinking floor-to-ceiling beams, staggered so a gap "moves" down the room.
10. A landing with loose gems.

**Final floor** (very low, 4 high)
11. Two switchback flights with a duck laser on each.
12. A third landing pile at the stair head.
13. The **manager's office** (south half, a glass-pane wall onto the stair) holds the wall safe (G10) with the office
    cash and the **Blue Heart**. A turret camera sweeps the office.

**Out**
14. Back down the vent, or up to the roof.
15. Take the north hut and the fire escape into the alley, then a bike or 2nd Street west. Or go back out the X
    window, where anyone waiting has a clear shot.

**Gates** (added first, numbered in the order added)

| # | Kind | What and where | Blocks | Settings |
|---|---|---|---|---|
| G1 | smash | X window: south face, x 606..607, y 65..66, z 411 (2 wide x 2 high) | 4 | default (no pile behind: an entry) |
| G2-G6 | smash | island fronts, 4 x 2 panes each, facing the room's centre aisle | 8 each | default |
| G7 | smash | basement ring counter front, 10 x 2 | 20 | default |
| G8 | smash | basement watch counter front, 8 x 2 | 16 | default |
| G9 | safe | workshop safe door, 2 x 2 iron blocks in the workshop wall | 4 | digits 4, claim 6 |
| G10 | safe | office wall safe, 2 x 2 iron blocks with a polished_blackstone frame | 4 | digits 4, claim 6 |

**Piles**

| # | Name | Style (piece / take) | Cells | Value | Pieces | Behind |
|---|---|---|---|---|---|---|
| P1-P5 | Display case | jewel 250 / 1.0 | 4 (1 x 4) | 1,250-2,250 | 5-9 | G2-G6 |
| P6 | Rings | jewel 250 / 1.0 | 10 | 2,000-3,500 | 8-14 | G7 |
| P7 | Watches | goods 200 / 1.0, `per-cell=4` | 8 | 2,000-3,400 | 10-17 | G8 |
| P8, P9, P10 | Loose gems | jewel 250 / 1.0 | 4 (2 x 2 landing) | 500-1,250 | 2-5 | none |
| P11 | Office cash | cash 100 / 0.8 | 6 | 1,200-2,400 | 12-24 | G10 |
| P12 | Blue Heart | jewel, piece=2500 take=2.5 | 1 | 2,500-5,000 | 1-2 | G10 |
| P13 | Repair tray | jewel 250 / 1.0 | 2 | 1,000-2,000 | 4-8 | G9 |

Spots: 10 gates + 13 piles = **23** (1 spare). Pieces max: **125** of 150. Every pile's box holds its maximum: cells x per-cell x layers, with the style defaults of jewel 4x1, goods 2x1, cash 4x2, gold 2x2, art 1x1, and `per-cell=4` where the table says so.

**Traps** (24; d2, m = 1.25)

| Trap | Kind | Where | Settings | Damage at d2 |
|---|---|---|---|---|
| T1-T4 | laser, low h 0.4 | ground floor, between island rows and along the walls | static, `damage=1.5` | 2 hearts |
| T5-T7 | laser, low h 0.4 | basement, across the aisle | `blink=true on=2 off=1.5`, offsets 0 / 0.7 / 1.4, `damage=1.5` | 2 hearts |
| T8-T15 | laser, low h 0.4 | obby 1: 4 along x, 4 along z, crossing; a robber standing on a stepping block (y 73, so feet at y 74) clears them | `damage=2` | 2.5 hearts |
| T16-T21 | laser, vertical, y 80 to y 85 | obby 2, between pillar pairs | `blink=true on=1.5 off=1.5`, offsets 0, 0.5, 1.0, 1.5, 2.0, 2.5, `damage=2` | 2.5 hearts |
| T22-T23 | laser, mid h 1.65 (duck) | the two final-floor flights | `damage=2` | 2.5 hearts |
| T24 | camera | office ceiling, watching the safe | `effect=damage angle=30 range=10 sweep=70 period=6` (a turret) | 2 hearts a shot |

Every trap is at least 2 blocks inside the region edge. The forecourt holds no traps.

**Alarm, lockdown and cops:** none. The store is not advanced (d2 default), as Jailbreak's lockdown is a d4-feel
mechanic and level-5 robbers should not meet cops yet. The two cop spots above are set only so `/dsetup` is quiet and
the store can be switched to advanced later (section 2.4).

**Exit spot:** (612.5, 65, 417.5), on the avenue sidewalk, 6 blocks out from the X window. **Hologram:** the roof's
east deck edge over the corner, or (632.5, 70, 413.5) over the forecourt corner.

**Settings:** `/dheist create jewelry 2`, `name Jewelry Store`. Defaults for everything else: escape 6:00, cooldown
10:00, level 5, pool 24,000, advanced false, pvp false, police true. The clock starts when G1 is smashed (the first
finished task) or at the first take via the vent.

### 2.4 Replayability
**With existing mechanics:**
- Every pile rolls at each opening, so which island is rich changes run to run (5-9 jewels).
- The Blue Heart is 1 or 2 stones: a "jackpot" run happens half the time.
- Each robber has a personal safe code per safe and run.
- The blink offsets and two exits make every climb a little different.
- The race against other robbers is the real variable.

**Optional advanced variant** (the owner's call, no code): `/dheist set jewelry advanced true` and
`/dheist set jewelry trap-damage default`.
- Lockdown boxes over the ground-floor glass (the X window gate is then sealed, which is Jailbreak's security
  shutter).
- The office camera becomes `effect=alarm`.
- The cops arrive at the two avenue spots and the roof becomes the real exit.

That gives level-5 robbers an early chase, so it is held back by default.

**With M1** (section 5): each obby floor rolls one of two layouts per opening, which is Jailbreak's randomized floors.
- Obby 1: `layered` (T8-T15) or `gems`, six horizontal lasers at h 1.0 (jump) and h 1.65 (duck) in alternating rows,
  `damage=2`.
- Obby 2: `moving` (T16-T21) or `classic`, six static beams (3 low, 3 mid) in a zig-zag.
- The blocks are shared, so the layouts differ only in their beams, and those show through the street glass: you can
  scout the floor before you climb.
- Traps go up to 36 of 40. Loot is unchanged.

### 2.5 Balance check
- **Rates:** jewel $250/s, cash $125/s, Blue Heart $1,000/s. A Duffel ($6,000, level 5) fills in 24 s of holding,
  about 3.5 islands. A Gym Bag ($2,000) fills in 8 s, and bare hands ($1,000) in 4 s.
- **A first-timer's run:** smash the window, smash and take 3-4 cases, then leave. That is about 1:00 of the 6:00
  clock.
- **One robber's full clear** (/dloot check's sum):

  | Part | Seconds |
  |---|---|
  | Piles: 45 + 14 + 17 + 15 + 19.2 + 5 + 8 | 123 |
  | 8 smashes x 1.5 | 12 |
  | 2 safes x 30 | 60 |
  | **Total** | **195 (3:15)** |

  That is over half the 6:00 clock, so `check` warns "meant for a crew", which is right. Nobody carries $24K at level
  5 anyway (four Duffels do), and "everything emptied" halves the clock for the last crew in.
- **Pool:** average roll $23,875 (8,750 islands + 5,450 basement + 2,625 gems + 5,550 office + 1,500 workshop),
  against the d2 default of $24,000. The range is $16,450 to $31,300.
- **Story:** two safes give two Mara chapter-2 crack credits per run: one with no climb (the workshop), one at the top
  (the office). Rob ✓. Vic v2 (d2+ sales) ✓.

---------------------------------------------------------------------------------------------------------------------

## 3. The Bank (`bank`, difficulty 3, level 20, advanced)

### 3.1 Theme and hook
**Jailbreak:** the green-glass tower with the brick **B-A-N-K pylon**. Its lobby has a teller counter, ATMs and a
keycard gate to the stairs. Below is a laser bay ("Classic" floor), then a big octagonal **vault door**. You defend
it while it opens, stand inside to load cash, and leave through the **alternate exit**: a blast door, a tunnel and a
ladder up to a **manhole** across the back plaza. The cops pouring down the stairs into the vault is Donating's
version of Jailbreak's Bank Bust.

**Twists:**
- **Payday's stealth-then-loud bank** (Harvest & Trustee, Big Bank). The lobby tills, the counting room and the
  manager's safe can be robbed quietly if you dodge two cameras and two light-blue alarm lasers. The vault drill is
  always loud. You choose a quiet $15K or a loud $80K race.
- **GTA Fleeca's deposit box ("Box 167")**: a one-box drill gate on the vault's deposit wall. It is a second, short
  drill with a fat reward, and it means two robbers can earn Mara's chapter-3 drill credit in one run.

**Why it's fun:** a ladder of small wins (glass, keypad, laser bay, vault, cage) inside a defended standoff. The cops
come from the street side, so the escape plan matters: blow the back way early or fight out the front.

The Bank is advanced, unlike the d3 default. Jailbreak's bank is the heist where the cops come. An advanced Bank gives
the city's level-20 getaway, and it gives Vic's "drill and lose the cops" and Mara's getaway jobs a second heist.

### 3.2 Footprint and look
- **Building:** 32 x 38 (x 597..628, z 282..319) on the west side of Bank Street, one block north of the Jewelry Store
  across 2nd Street. Region x 595..630, z 280..321, y 47..102 = 36 x 42 x 56 = **84,672 blocks**.
- **Levels:**

  | Level | Floor slab | Interior |
  |---|---|---|
  | B2 vault | y 48 | y 49..55 |
  | B1 laser bay and counting room | y 56 | y 57..63 |
  | Lobby | y 64 | y 65..76, double height; a mezzanine slab at y 70 over the west third |
  | Tower floors 2-5 | y 77, 83, 89, 95 | sealed: no stairs, dark-tinted windows |

  The roof (y 98) has a helipad drawn in calcite and yellow terracotta and can't be reached. The pylon rises to
  y 102. The tower is shorter than Jailbreak's 120-stud one so that "basement to roof" fits under 100k.
- **Outside:**
  - **Walls:** green_stained_glass curtain walls in a navy frame (blue_terracotta and polished_deepslate).
  - **Pylon:** a 4-wide brick pylon on the south-east corner, with "B A N K" stacked as white text-display labels.
  - **Trim:** one band of blue windows, and a neon line of light-blue glass over sea lanterns around the base.
  - **Lobby front:** a double-height glass front on Bank Street.
- **Front door:** an **open doorway** 4 wide x 4 high in the middle of the east face (z 298..301), so the cops can
  walk in. A white quartz door surround, and a red "CLOSED" label beside it while the bank cools down (a hologram
  line).
- **Exit spot plaza:** x 631..636 (6 wide) in front, paved in polished andesite.
- **Back (west):** a blank granite wall onto **Hatch Plaza**, where the manhole is. It is a ring of 4 bollards
  (polished_andesite walls) around an open ladder shaft with no trapdoor, at (575, 64, 300).

### 3.3 The robbery, beat by beat

**Lobby** (green polished floor: prismarine bricks and dark prismarine, pale gray walls)
1. Walk in the front door.
2. The **teller counter** along the west side has a 6 x 2 blue-glass window (G1 smash) over 3 tills. The ATMs are
   furniture item displays (`furn_atm`).
3. Stairs on the north side climb to the **mezzanine**: the manager's office and its wall safe (G2).
4. In the south-west corner, the **security gate** (G3, a safe gate: a 3 x 3 iron door with a keypad, Jailbreak's
   keycard gate) leads to the stairs down.
5. Camera T1 sweeps the gate. Camera T2 watches the office door. Sneak: the cone is halved.

**B1, "Classic"**
6. A red-floored laser bay, 8 wide x 22 long (red_nether_bricks floor, diamond-plate walls of iron blocks and
   polished blackstone): jump the low beams, duck the mid ones, time the two blinking walls.
7. Two light-blue alarm lasers at h 1.0 near the end (jump them, or the alarm goes).
8. The **counting room** opens off the bay, behind three plates at its doorway, with cash on two tables. It sits
   behind G3, so whoever cracked the keypad gets 6 s on it.
9. Stairs down at the far end.

**B2, the vault level**
10. An antechamber. On its east wall is the **vault door** (G4 drill): a 5 x 5 octagon (21 blocks of iron_block with a
    polished_deepslate X and a central "wheel" of chiseled stone). Mounting the drill **trips the alarm** (75 s,
    2 jams).
11. On the antechamber's west wall is the **alternate exit** (G7 safe: 2 x 3 iron blocks). Crack it early, while the
    drill runs, as Jailbreak players blow the exit first.
12. **The vault** (12 x 14):
    - two gold pallets and two cash trolleys side by side;
    - the deposit-box walls, ledges of polished blackstone with jewels and valuables;
    - **Box 167** (G5 drill, a 1 x 2 box face in the deposit wall: 30 s, 1 jam);
    - the **Reserve cage** (G6 safe: iron-bar front, 3 x 3) with the reserve gold.

**Out**
13. Through the alternate exit: a corridor with 3 lasers, then the region edge at x 595, then the tunnel x 576..594
    (y 49..52), then the ladder up to the manhole in Hatch Plaza. From there, 2 bike spots or West Street. The cops
    are on the Bank Street side.
14. Or back up through the lobby and out the front, into the cops.

**Alarm triggers:** cameras T1 and T2 (seen for 1 s), alarm lasers T11 and T12, the vault drill G4 (always), and
Box 167 G5 (`alarm=true`; by then it's usually loud already). The safes and the teller glass are quiet (defaults).

**Gates**

| # | Kind | What | Blocks | Settings |
|---|---|---|---|---|
| G1 | smash | teller window, 6 x 2 panes | 12 | default |
| G2 | safe | manager's wall safe | 4 | default |
| G3 | safe | security gate to the stairs: a door | 9 | default |
| G4 | drill | vault door, octagon | 21 | `time=75 jams=2` (alarm default true) |
| G5 | drill | Box 167, 1 x 2 | 2 | `time=30 jams=1 alarm=true` |
| G6 | safe | Reserve cage front | 9 | default |
| G7 | safe | alternate exit: a door into the tunnel | 6 | default; its outer side is outside the region, so it opens only from inside |

**Piles**

| # | Name | Style (piece / take) | Cells | Value | Pieces | Behind |
|---|---|---|---|---|---|---|
| P1-P3 | Till cash | cash, piece=250 take=2.0 | 2 | 1,000-2,000 | 4-8 | G1 |
| P4 | Counting room | cash, piece=500 take=4.0 | 6 | 3,000-6,000 | 6-12 | G3 |
| P5 | Bearer bonds | cash, piece=1000 take=4.0 | 2 | 4,000-8,000 | 4-8 | G2 |
| P6, P7 | Gold pallet | gold, piece=1000 take=3.0 | 6 (2 x 3) | 8,000-12,000 | 8-12 | G4 |
| P8 | Cash trolleys | cash, piece=500 take=4.0 | 6 (2 x 3) | 8,000-12,000 | 16-24 | G4 |
| P9 | Deposit jewels | jewel 250 / 1.0 | 8 (ledge) | 3,000-6,000 | 12-24 | G4 |
| P10 | Deposit valuables | goods, piece=500 take=2.5, `per-cell=4` | 6 | 4,000-8,000 | 8-16 | G4 |
| P11 | Box 167 | goods, piece=2500 take=5.0, `per-cell=4` | 1 | 5,000-7,500 | 2-3 | G5 |
| P12 | Reserve gold | gold, piece=2000 take=4.5 | 6 | 12,000-24,000 | 6-12 | G6 |

Spots: 7 gates + 12 piles = **19** (5 spare). Pieces max: **147** of 150. That is tight on purpose: the cash is in big
bundles, so the vault isn't 200 tiny clicks.

**Traps** (18; d3, m = 1.5)

| Trap | Kind | Where | Settings | Damage at d3 |
|---|---|---|---|---|
| T1 | camera | lobby, over the security gate | `effect=alarm angle=30 range=12 sweep=60 period=8` | alarm |
| T2 | camera | mezzanine landing, on the office door | `effect=alarm`, fixed | alarm |
| T3-T6 | laser, low h 0.4 | B1 bay | static, `damage=2` | 3 hearts |
| T7-T8 | laser, mid h 1.65 (duck) | B1 bay | static, `damage=2` | 3 hearts |
| T9-T10 | laser, vertical, y 57 to y 62 | B1 bay: a 2-wide gap between pillars | `blink=true on=2 off=2`, offsets 0 / 2 (they alternate), `damage=2` | 3 hearts |
| T11-T12 | laser, h 1.0 (jump) | last third of the bay | `effect=alarm` | alarm |
| T13-T15 | plate | counting room doorway | `damage=2` | 3 hearts |
| T16-T17 | laser, low h 0.4 | alternate-exit corridor | `damage=2` | 3 hearts |
| T18 | laser, mid h 1.65 | alternate-exit corridor | `damage=2` | 3 hearts |

**Lockdown boxes** (iron bars):
- L1, L2: the lobby glass front north and south of the doorway (x 628, z 283..296 and z 303..318, y 65..76).
- L3, L4: the lobby's north and south side glass.
- L5: the mezzanine's inner glass.

The **front doorway and the alternate exit stay open**. The cops come in the front, down the security stairs (G3
open by then: they never need a door) and on to B2. That standoff at the vault doorway is the Bank Bust.

**Cop spots:** C1 (665.5, 65, 337.5) and C2 (665.5, 65, 262.5), both on Bank Street's east side. **Exit spot:**
(636.5, 65, 300.5), 8 blocks out from the front. **Hologram:** (633.5, 71, 300.5) over the plaza.

**Settings:** `/dheist create bank 3`, `name Bank`, `advanced true`. Defaults for everything else: escape 8:00,
cooldown 15:00, level 20, pool 80,000, police true. The d3 cops: 26 HP, 3 damage, the global assault numbers, chase
100.

### 3.4 Replayability
**With existing mechanics:**
- The rolls swing the total from $58K to $101.5K, and the Reserve and Box 167 swing the most.
- Quiet or loud is each robber's choice every run, and anyone's mistake makes it loud for all.
- The cops' assault size grows with the number of robbers hunted (pool-per-robber), so a crowded run is a harder
  fight.
- The escape varies: back tunnel or front, bike or on foot.
- Four keypads give four personal codes.

**With M1:**
- **Floor of the day** (Jailbreak's 8 vault floors in miniature): slot `hall` = `classic` (T3-T10) or `presidential`,
  8 traps in total.
  - 5 horizontal beams across the bay at h 0.4, 0.9, 1.4, 1.65 and 2.2, `blink on=2 off=1`, offsets 0, 0.6, 1.2, 1.8,
    2.4. This is Payday's alternating laser wall: a crouch gap opens for about 1 s.
  - Plus 3 vertical blinkers.
  - The alarm lasers T11 and T12 stay in both. Traps go up to 26.
- **Vault of the day** (Payday's Bank Heist variants): slot `vault` = `gold` or `cash`.
  - Gold: P6 and P7 retuned to 12,000-18,000 each.
  - Cash: P8 plus a second trolley pile P8b on the right bay, each `piece=750 take=6.0`, 12,000-18,000.
  - The unpicked bay stands empty.
  - The deposit wall, Box 167 and the Reserve are always there.
  - Average stays about $80K. Pieces per slot max(36, 48) = 48, so the total is still 147.

**With M2:** the alternate exit G7 becomes a **blast door**: Jailbreak's dynamite, a 10 s fuse, loud. You no longer
need a Safe Kit to plan the back way out.

### 3.5 Balance check
- **Rates:** cash $125/s, jewels $250/s, Box 167 $500/s, gold $333/s, Reserve $444/s. A Hockey Bag ($15K, level 10)
  fills in 45 s of gold. An Armored Duffel ($40K, level 25) fills in 2:00 of gold and bundles.
- **A level-20 solo run:**

  | Step | Time |
  |---|---|
  | Lobby tills (4 s of smashing + 24 s of tills) | 0:30 |
  | Keypad | 0:30 |
  | Bay | 0:20 |
  | Drill: 75 s + jams, defend | 1:40 |
  | Vault: gold until a Hockey bag is full | 0:45 |
  | Crack the alt exit while drilling | 0:00 extra |
  | Tunnel | 0:20 |
  | **Total** | **about 4:10 of 8:00** |

- **One robber's full clear** (/dloot check):

  | Part | Seconds |
  |---|---|
  | Piles | 429 |
  | Teller glass | 1.5 |
  | 4 safes x 30 | 120 |
  | Drills: 76.5 + 31.5 | 108 |
  | **Total** | **658 (11:00)** |

  That is beyond the 8:00 clock. It is a crew race by design, and four full Armored Duffels empty it.
- **Cops:**
  - Warning 20 s after the mount. Assault 1 runs 45 s with 6 cops plus 2 per extra robber, then a 30 s break.
  - The vault opens about 95 s after the mount, so you load the vault during assault 1's tail or the break.
  - Heavies from assault 3, which only a crew that stays too long meets.
- **Pool:** average roll **$79,750** against the d3 default of $80,000:

  | Part | Average |
  |---|---|
  | Tills | 4,500 |
  | Counting room | 4,500 |
  | Bonds | 6,000 |
  | Gold pallets | 20,000 |
  | Cash trolleys | 10,000 |
  | Deposit jewels | 4,500 |
  | Deposit valuables | 6,000 |
  | Box 167 | 6,250 |
  | Reserve | 18,000 |

- **Story:** two drills give Mara chapter 3 two drill credits per run. Four safes give Vic v4 four crack credits.
  "Rob 3 different heists" ✓. Advanced, so Mara's chapter-4 getaway and her getaway jobs ✓, and Vic v5 (adv,drill)
  ✓.

---------------------------------------------------------------------------------------------------------------------

## 4. The Museum (`museum`, difficulty 4, advanced, level 45): the finale

### 4.1 Theme and hook
**Jailbreak:** the tan sandstone temple on its own hill, with four columns, a Triceratops pediment and a T-Rex in a
double-height hall swept by security spotlights.
- **Wings:** an Egyptian room with the Pharaoh mask, and a gem room with the big blue jewel. Each guards a brick door
  into a **security room** with an exit.
- **Upstairs:** the showcase (smash the glass to get in) and the art gallery.
- **Entry and exit:** in through the **roof**, out through the side doors.
- **Greed trips the alarm:** the mask and the jewel cases are alarmed.
- **The puzzles stay as puzzles:** Jailbreak's pipe puzzle becomes the **curator's keypad**, since the Mastermind
  code *is* a puzzle. The jewel-alignment puzzle becomes a **laser crawl**.

**Twists:**
- **Payday's The Diamond.**
  - Behind the hall, upstairs, is the **Diamond Room**: a checkered floor where only a hidden path holds. The rest
    are collapsing tiles over a pit.
  - At its end, an armoured shutter (a quiet drill gate) guards **The Diamond**, the best $/s in the game.
  - Below the museum, a **vault** (the loud drill: the finale's vault) and a **crown-jewel cage** (a safe).
- **GTA Kortz / Payday sewer getaway.** A **drain hatch** in the vault antechamber leads to a tunnel under the mesa,
  out to a storm channel and away from the cops' side: the finale's real getaway route.

**Why it's fun:**
- Two puzzles and a skill crawl make up a quiet first half.
- Then a choice: take the Diamond quietly (it trips nothing if you find the path), or go down to the vault, whose
  drill always brings the d4 cops.
- The finale (safe + vault + getaway in one run) has a natural order: keypad, vault, drain.

### 4.2 Footprint and look
- **Site:** a **mesa** with 8-block retaining walls of sandstone over stone bricks (x 820..920, z 300..400, top
  y 72). It has a paved plaza in front (z 372..400) and terraces on each side with stairs down the mesa walls. The
  ramp road comes up from the roundabout.
  - The mesa is a solid fill: build it closed (hollow is fine if sealed), with the museum's basement and the drain
    carved in.
- **Region:** x 841..898, z 330..371, y 60..97 = 58 x 42 x 38 = **92,568 blocks**. The pit under the basement false
  floor reaches y 61, so it is inside.
- **Cross plan (a scaled 150 x 90 stud cross):**
  - **Centre block** x 857..882 (26) x z 332..371: a portico of four round columns (z 364..371, quartz pillar cores
    clad in smooth sandstone), wide steps down to the plaza and a rear projection.
  - **Wings** x 843..856 and x 883..896 (14 each) x z 338..363.
  - The side terraces at x 841..842 and x 897..898 are inside the region (a 2-block strip). Their stairs down the
    mesa wall are outside it.
- **Levels:**

  | Level | Floor slab | Interior |
  |---|---|---|
  | Basement | y 64 | y 65..70 (pit y 61..63 under the false floor) |
  | Ground (mesa top) | y 72 | central hall y 73..89 (double height, balconies at y 80 on three sides); wing ground rooms y 73..79 |
  | Wing upper rooms | y 80 | y 81..88 |
  | Roof | y 90 | pediment apex y 97 |

  The rear ground room (under the Diamond Room) is y 73..76. Its ceiling slab is y 77, and the Diamond pit is
  y 78..79.
- **Outside:**
  - **Stone:** smooth_sandstone, cut_sandstone and sandstone bricks, with pale salmon trim (terracotta and
    smooth_red_sandstone bands).
  - **Pediment:** a dark Triceratops silhouette (blackstone and deepslate pixel art) on the pediment.
  - **Hangings:** red wool strips hang where Jailbreak has banners (real banners are out of reach rules).
  - **Front:** a big arched window over the doors showing the T-Rex.
  - **Wings:** simple square windows.
  - **Roof:** flat, smooth sandstone, with a **ladder up each wing's outer wall** (Jailbreak's side ladders) from the
    terraces to the roof.
- **Doors:**
  - Front portico: an open 4 x 6 doorway.
  - Each wing's security room: an open 2 x 3 side doorway onto its terrace.
  - The drain hatch, in the basement.

### 4.3 The robbery, beat by beat

**In through the roof**
1. Climb a wing ladder to the roof.
2. Smash the **skylight** (G1: 5 x 5 glass at y 90, quiet).
3. Climb down a ladder on the north balcony's column. Or walk in the front doors before the alarm.

**Central hall** (T-Rex of bone blocks on a red-terracotta octagon, planets of colored wool hanging from chains,
balconies on three sides, twin staircases)
4. Four **spotlights** (alarm cameras, sweeping) cover the floor. The T-Rex pedestal and the stair undersides are
   cover.
5. Loot: a **Fossils** pile on low plinths along the east wall, and **Dino eggs** in a nest behind the T-Rex.

**West ground room, "Egypt"**
6. The **Pharaoh case** (G2 smash, `alarm=true`) holds the Pharaoh's treasures. Four plates ring the pedestal.
7. The **curator's keypad** (G3 safe) is a 2 x 3 sandstone-brick door into the **west security room**. In there:
   the **Mummy** on its sarcophagus plinth, and the west side doorway to the terrace. **This is the finale's safe.**
8. Service stairs go down to the basement.

**East ground room, "Gems"**
9. The **Blue Jewel case** (G4 smash, `alarm=true`).
10. A 3-wide, 10-long **laser crawl** (6 beams: low, mid and blinking) into the **east security room**. In there:
    the east side doorway, and service stairs down.

**Upstairs west, "Showcase"** (off the west balcony; red carpet with a dino-footprint pattern)
11. A 3 x 3 glass wall (G5 smash, Jailbreak's "shoot the middle glass").
12. Inside: **gold bars** and **Oddities** (the giant donut, the traffic cone and spinner rims, shown as the goods
    pile).
13. Two spotlights, and hanging lights to hop onto (calcite and froglight platforms at y 86).

**Upstairs east, "Gallery"**
14. Two **Canvases** piles on plinths under block-mosaic "paintings" in dark-oak frames. (No real paintings or item
    frames: they are out of reach rules.)
15. Two spotlights, and three ankle-high light-blue **alarm lasers** (h 0.3) in front of the plinths: jump them. This
    is the Kortz barrier rule.

**Upstairs rear, "The Diamond Room"** (off the north balcony)
16. Duck two light-blue alarm lasers at the door.
17. A 7 x 7 checkered floor (polished diorite and polished andesite): four collapsing-floor rectangles leave one
    winding solid path. A fall into the 2-deep pit hurts and puts you back at the door.
18. At the end, an alcove behind an **armoured shutter** (G6 drill, `alarm=false`: the quiet "thermal lance", 60 s,
    2 jams).
19. **The Diamond** sits on a pedestal inside.

**Basement** (via either security room's service stairs)
20. **The laser wall**: Payday's alternating beams across a 3-wide corridor.
21. A 2 x 4 **false floor** (collapsing) before the antechamber.
22. In the antechamber:
    - north wall: the **drain hatch** (G9 safe: 2 x 2 iron blocks);
    - east wall: the **vault door** (G7 drill: a 21-block octagon, 90 s, 3 jams, **trips the alarm**).
23. The **vault**: a gold pile, an **Antiquities** pile, and the **Crown cage** (G8 safe: an iron-bar front 3 x 3)
    with the crown jewels.

**Getaway**
24. After the alarm, lockdown seals the portico, the arched window, every wing window and the skylight opening.
25. Ways out:
    - the **west side door** (the cops' C3 is east);
    - the **east side door** (hot);
    - the **drain**: crack the hatch (best done while the vault drills), run the tunnel north (x 868..870, y 65..67,
      z 300..329, outside the region past z 330), come out of the mesa's north face into the **sunken storm
      channel** (floor y 59), go west, then up the ramp to 2nd Street's east end. Three bike spots wait there, 105
      blocks from the centre.
26. A getaway counts after the first wave, with loot.

**Gates**

| # | Kind | What | Blocks | Settings |
|---|---|---|---|---|
| G1 | smash | skylight, 5 x 5 at y 90 | 25 | default (quiet) |
| G2 | smash | Pharaoh case front, 3 x 2 | 6 | `alarm=true` |
| G3 | safe | curator's keypad brick door, 2 x 3 | 6 | default |
| G4 | smash | Blue Jewel case front, 3 x 2 | 6 | `alarm=true` |
| G5 | smash | showcase glass wall, 3 x 3 | 9 | default |
| G6 | drill | Diamond shutter, 3 x 3 iron and tinted glass | 9 | `time=60 jams=2 alarm=false` |
| G7 | drill | vault door, octagon | 21 | `time=90 jams=3` (alarm default true; core.sk suggests 90 for d4) |
| G8 | safe | Crown cage, 3 x 3 bars | 9 | default |
| G9 | safe | drain hatch | 4 | default; its outer side is outside the region |

**Piles**

| # | Name | Style (piece / take) | Cells | Value | Pieces | Behind |
|---|---|---|---|---|---|---|
| P1 | Fossils | goods, piece=1000 take=4 | 6 | 6,000-12,000 | 6-12 | none |
| P2 | Dino eggs | art, piece=6000 take=6 | 2 | 6,000-12,000 | 1-2 | none |
| P3 | Pharaoh's treasures | art, piece=5000 take=5 | 4 (2 x 2) | 10,000-20,000 | 2-4 | G2 |
| P4 | Mummy | art, piece=5000 take=5 | 4 (1 x 4 sarcophagus) | 10,000-20,000 | 2-4 | G3 |
| P5 | Blue Jewel | jewel, piece=5000 take=4 | 1 | 10,000-20,000 | 2-4 | G4 |
| P6 | Gold bars | gold, piece=1000 take=3 | 8 | 8,000-16,000 | 8-16 | G5 |
| P7 | Oddities | goods, piece=1000 take=4 | 6 | 5,000-10,000 | 5-10 | G5 |
| P8, P9 | Canvases | art, piece=3000 take=4.5 | 9 each | 15,000-27,000 | 5-9 | none |
| P10 | The Diamond | jewel, piece=12500 take=10 | 1 | 25,000-50,000 | 2-4 | G6 |
| P11 | Vault gold | gold, piece=1500 take=4.5 | 12 | 21,000-36,000 | 14-24 | G7 |
| P12 | Antiquities | art, piece=5000 take=6 | 7 | 20,000-35,000 | 4-7 | G7 |
| P13 | Crown jewels | jewel, piece=1000 take=4 | 6 | 15,000-24,000 | 15-24 | G8 |

Spots: 9 gates + 13 piles = **22** (2 spare). Pieces max: **129** of 150.

**Traps** (33; d4, m = 1.75; `damage=2` everywhere gives 3.5 hearts, so two touches won't kill a healthy robber)

| Trap | Kind | Where | Settings |
|---|---|---|---|
| T1-T4 | camera ("spotlights") | balcony corners, y 86, pitched down at the hall floor | `effect=alarm angle=25 range=14 sweep=90 period=10`, staggered starts |
| T5-T8 | plate | ring around the Pharaoh pedestal | `damage=2` |
| T9-T14 | laser | gem-room crawl | 2 low h 0.4, 2 mid h 1.65, 2 vertical `blink on=1.5 off=1.5` offsets 0 / 1.5; all `damage=2` |
| T15-T16 | camera | showcase | `effect=alarm sweep=60 period=8` |
| T17-T18 | camera | gallery | `effect=alarm sweep=60 period=8` |
| T19-T21 | laser, h 0.3 | in front of the canvas plinths | `effect=alarm` |
| T22-T25 | floor | Diamond Room, 4 rectangles around the path | `damage=2 delay=0.5 restore=10 depth=2` |
| T26-T27 | laser, h 1.65 (duck) | Diamond Room doorway | `effect=alarm` |
| T28-T32 | laser | basement laser wall: h 0.4, 0.9, 1.4, 1.65, 2.2 | `blink=true on=2 off=1`, offsets 0, 0.6, 1.2, 1.8, 2.4, `damage=2` |
| T33 | floor | basement false floor, 2 x 4 | `damage=2 depth=3` |

Alarm cameras stand down once the alarm runs, so after the vault drill the spotlights stop mattering and the cops take
their place.

**Alarm triggers:** spotlights T1-T4 and T15-T18, alarm lasers T19-T21 and T26-T27, the Pharaoh and Jewel cases (G2,
G4), and the vault drill (G7, always). The Diamond shutter G6 is quiet.

**Lockdown boxes** (iron bars):
- L1: the portico doorway (x 866..873, y 73..78, z 364).
- L2: the arched window.
- L3-L6: the wing windows, ground and upper rows.
- L7: the skylight opening (x 867..871, y 90, z 340..344).

The two side doorways and the drain stay open.

**Cop spots:** C1 plaza (870.5, 73, 388.5), C2 roundabout (810.5, 65, 430.5), C3 east terrace foot
(925.5, 65, 350.5). The cops come round-robin from the front and the east. They enter by the side doors (the portico
is barred) and go down the service stairs to the vault. The **west door and the drain are the cold side.**

**Exit spot:** (869.5, 73, 380.5) on the plaza. **Hologram:** (869.5, 80, 373.5) over the steps.

**Settings:** `/dheist create museum 4`, `name Museum`. Defaults: advanced true, escape 10:00, cooldown 30:00,
level 45, pool 240,000, police true. The d4 cops: 32 HP, 4 damage, accuracy 1.

### 4.4 Replayability
**With existing mechanics:**
- **Order:** the quiet top floor first or the loud vault first. Doing the Diamond quietly before drilling is the
  pro move.
- **Rolls:** the Diamond is 2-4 stones ($25K-$50K) and the totals run $166K-$309K.
- **Who cracks what:** three keypads and two drills spread the credits through a crew.
- **Assaults** scale with the robbers hunted.
- **Exits:** three ways out after the alarm, two of them cold.
- **The Diamond Room's path** is fixed at launch (players learn it, as in Payday's early days). M1 fixes that.

**With M1:** slot `diamond` = path `a` (T22-T25) or path `b` (4 more floor rectangles, on the same tiles, leaving
another path). Traps go to 37. The floor looks the same either way, so the path must be found again every opening.
This is Payday's The Diamond, done with trap groups.

**With M2:** the skylight G1 becomes Jailbreak's **roof dynamite**: a blast gate on a 3 x 3 sandstone roof patch,
`alarm=false`, 10 s fuse, with a knock-back that "drops you in". The drain hatch G9 becomes a blast door (loud: by
then you're in the getaway anyway).

**With M3:** Jailbreak's **twin levers**, one in each security room, about 40 blocks apart.
- Both pulled within 3 s, by two robbers: the spotlights (T1-T4, T15-T18) go dark for the run, and lockdown boxes L1
  and L7 lift, so the portico doors open, exactly Jailbreak's escape.
- One pulled alone: the alarm trips (the Jailbreak rule).
- It's a crew bonus: solo robbers use the side doors and the drain.

### 4.5 Balance check
- **Rates:**

  | Loot | $/s |
  |---|---|
  | Fossils | 250 |
  | Gold bars, vault gold, crown jewels | 333 |
  | Canvases | 667 |
  | Antiquities | 833 |
  | Dino eggs, Pharaoh's treasures, Mummy | 1,000 |
  | Blue Jewel | 1,250 |
  | The Diamond | 1,250 (but 10 s per stone, and a hit resets the hold) |

  An Armored Duffel ($40K, level 25) fills in 32 s of Diamond, 60 s of canvases or 2:00 of vault gold.
- **The finale solo** (safe + vault + getaway in one run):

  | Step | Time |
  |---|---|
  | Roof | 0:30 |
  | Curator's keypad and Mummy (+10 s of holding) | 0:45 |
  | Basement laser wall and false floor | 0:30 |
  | Vault drill: 90 s + 3 jams, holding the antechamber through the 20 s warning and assault 1 | 2:00 |
  | Crack the drain hatch during the drill | 0:00 extra |
  | Load the vault to the bag | 1:00 |
  | Drain and channel | 0:45 |
  | **Total** | **about 5:30 of 10:00** |

  That leaves room for the Diamond first, or for mistakes.
- **One robber's full clear** (/dloot check):

  | Part | Seconds |
  |---|---|
  | Piles | 572 |
  | 4 smashes | 6 |
  | 3 safes x 30 | 90 |
  | Drills: 61.5 + 91.5 | 153 |
  | **Total** | **821 (13:41)** |

  That is over the 10:00 clock: a crew heist, as the finale should be. Six full Armored Duffels empty it.
- **Pool:** average roll **$237,500** against the d4 default of $240,000:

  | Part | Average |
  |---|---|
  | Fossils | 9,000 |
  | Dino eggs | 9,000 |
  | Pharaoh's treasures | 15,000 |
  | Mummy | 15,000 |
  | Blue Jewel | 15,000 |
  | Gold bars | 12,000 |
  | Oddities | 7,500 |
  | Canvases (2) | 42,000 |
  | The Diamond | 37,500 |
  | Vault gold | 28,500 |
  | Antiquities | 27,500 |
  | Crown jewels | 19,500 |

- **Story:**
  - Finale ✓: advanced d4 with a safe and a drill.
  - In one run, up to three robbers can crack (G3, G8, G9) and two can drill (G6, G7), so two crew members can finish
    the finale together.
  - Mara chapter 4 getaway and d4 sales ($40K is one Armored Duffel) ✓. Vic v5 ✓.

---------------------------------------------------------------------------------------------------------------------

## 5. New mechanics (three, all optional; build M1 first)

### M1. Pick groups: "this opening's floor" (traps and loot)
**Why:** it gives Jailbreak's randomized jewelry floors and bank vault floors, Payday's vault variants and The
Diamond's hidden path, all in one small feature. Lasers, cameras and floors are displays or behaviour, not blocks, so
two layouts share one room for free.

**Spec:**
- `/dtrap set <id> group <slot>:<variant>` and `/dloot set <id> group <slot>:<variant>` (`default` clears it).
  Optional weights: `/dheist set <h> pick-weight <slot>:<variant> <w>` (default 1).
- **At each opening** (heistOnOpen, before lootArm and trap arming), every slot of the heist picks one variant by
  weight. It is saved in memory as `{-heist::<h>::pick::<slot>}` and logged.
- **Traps of an unpicked variant** are not armed: no display, no hits. Plates stay silent (their press is still
  cancelled), floors don't crack and cameras don't look.
- **Loot of an unpicked variant:**
  - a pile rolls 0 pieces (a new 0 branch in lootRollPile: no pieces, hitbox or marker);
  - a gate stays closed with no marker or hitbox ("just a wall");
  - piles behind an unpicked gate stay unarmed.
- **Checks:**
  - lootValidate's piece cap and /dloot check sum each slot's **largest** variant (pieces and value max) and its
    **smallest** (value min). Ungrouped spots count as now.
  - Piles of different variants still may not overlap (they get separate cells).
- **Info:** `/dheist info` shows `picks: obby1=gems obby2=moving`. `/dheist pick <h> <slot> <variant>` forces one for
  tests (while open, with nobody inside; it re-arms). The hologram's "$ inside" counts armed spots only.

**Uses:**
- Jewelry: `obby1` and `obby2`, 2 layouts each.
- Bank: `hall` (classic / presidential) and `vault` (gold / cash).
- Museum: `diamond` (path a / b).

**Without it:** every grouped trap and pile is simply left out of the build (or all variants armed: never both
layouts on one floor). The ungrouped heists in sections 2-4 are complete.

**Cost:** traps.sk arming (1 check), loot.sk lootArm/lootRollPile/lootValidate/dlootCheck, heists.sk open/info. About
100 lines. Bots: the open-time pick, the 0-piece pile, a forced pick.

### M2. Blast doors: Jailbreak's dynamite (borrows the prison's C4 timing)
**Why:** Jailbreak's bank floors all have a **blown alternate exit**, and its museum is entered by **blowing the
roof**. Today those must be keypads (a Safe Kit) or glass. A blast door is a no-tool, loud, timed door.

**Spec:**
- **The gate:** a gate kind `blast` in loot.sk. `/dloot add <h> blast [corners] [fuse=10] [alarm=true|false]
  [claim=6]`, solid, at most 27 blocks, refused in stores.
- **Planting:** hold right-click 2 s on the door. No item is needed: Jailbreak places the dynamite for you. Then:
  - a TNT item display on the face, a text display "0:09" counting down, and a fuse hiss;
  - anyone can plant it, once per run;
  - planting starts the clock (heistStartRun).
- **At 0:**
  - explosion particles and sound, but no block damage (heists are explosion-immune);
  - every player within 4 blocks of the door's centre takes `blast-damage` 3 HP (a generic hit, cause "trap", the
    trap combat tag) and is pushed 0.8 away (Jailbreak's blast throw);
  - the gate's blocks turn to air for the run (lootGateAir);
  - piles behind it: the planter's claim (6 s);
  - in an advanced heist the bang trips the alarm unless `alarm=false`.
- **Credit:** it gives no crack or drill credit. It is a door, not a safe.
- **Uses:**
  - Bank G7, the alternate exit.
  - Museum G1, the roof (alarm=false), and G9, the drain hatch.
  - Later city heists (the power plant).
- **Without it:** those gates are the safe and smash gates in sections 3 and 4.
- **Cost:** loot.sk, about 80 lines. It reuses the drill's mount hold and its text display, and the smash's open.

### M3. Security levers: Jailbreak's twin switches (a small "switch" that later doubles as Payday's fuse box)
**Why:** the Museum's "both switches within 3 seconds" is its most remembered beat and its forced co-op. The same
switch with `need=1` is Payday's fuse box, which future heists can use.

**Spec:**
- `/dheist switch <h> add [x y z] link=<name> [need=1] [within=3] [off=<trap tag>] [lift=<lock ids>|all]
  [for=run|<s>] [miss=alarm|none]`.
- **The lever:** a vanilla lever block in the build. Its click is cancelled (no redstone) and handled: pulling flips
  it (block data), with a clunk.
- **Firing:** the link fires when `need` levers of that link are pulled within `within` seconds by **different
  robbers**.
- **Effects when it fires:**
  - traps tagged `off` (`/dtrap set <id> tag <t>`) stop for `for` (displays hidden, no hits; cameras' pointers gone);
  - the lockdown boxes in `lift` are cleared and stay clear for the run, even mid-alarm;
  - "SECURITY OFF" to the robbers inside, and a hologram line.
- **A miss** (some pulled, the window ran out): every lever of the link resets. With `miss=alarm`, an advanced heist's
  alarm trips (Jailbreak).
- **Limits:** works only while the heist is active, once per link per run. The room reset puts the levers back.
- **Museum:** two levers, in the west and east security rooms. `link=sec need=2 within=3 off=spot lift=L1,L7
  for=run miss=alarm`. The spotlights (T1-T4, T15-T18) are tagged `spot`.
- **Without it:** the side doors and the drain are the exits, and the levers are just not built.
- **Cost:** about 120 lines in heists.sk or a small switch.sk: the click, the timing, a lockdown clear (the inverse of
  heistLockdown), and a tag check in traps.sk's arm loop.

**Not taken** (and why):
- A Jewelry roof zipline: a vehicle ride across region edges is risky, and there's no city base to ride to yet.
- Keycards from a manager NPC: it needs a new NPC. The keypad-door does the job.
- A timelock: the drill already is one.

---------------------------------------------------------------------------------------------------------------------

## 6. Summary table

| | Jewelry Store | Bank | Museum |
|---|---|---|---|
| id, difficulty, level | jewelry, 2, 5 | bank, 3, 20 | museum, 4, 45 |
| Advanced | no | **yes** (owner's call; the d3 default is no) | yes |
| Region (blocks) | 37 x 41 x 42 = 63,714 | 36 x 42 x 56 = 84,672 | 58 x 42 x 38 = 92,568 |
| Escape / cooldown | 6:00 / 10:00 | 8:00 / 15:00 | 10:00 / 30:00 |
| Pool (default) / average roll | 24,000 / 23,875 | 80,000 / 79,750 | 240,000 / 237,500 |
| Roll range | 16,450-31,300 | 58,000-101,500 | 166,000-309,000 |
| Spots / pieces / traps | 23 / 125 / 24 | 19 / 147 / 18 | 22 / 129 / 33 |
| Safes / drills | 2 / 0 | 4 / 2 | 3 / 2 |
| Way in | X window, roof vent | front doors | roof skylight, front (before the alarm) |
| Way out | X window, roof fire escape to bikes | front (hot), alternate exit, tunnel, manhole (cold) | side doors (west cold), drain to the storm channel and bikes (cold) |
| Jailbreak core | cases, X entry, obby climb, roof huts and vent | green tower, keypad gate, Classic laser bay, octagon vault, alternate exit, Bank Bust | roof entry, T-Rex hall and spotlights, alarmed mask and jewel, two security rooms, showcase, gallery |
| Twists | Payday manager safe (Blue Heart); GTA alley bikes | Payday quiet-then-loud; GTA Box 167 | Payday The Diamond (floor + quiet shutter) and vault; GTA/Payday drain getaway |

## 7. Calls for the owner
1. **The Bank advanced** (recommended). With it off, the Museum alone carries every "adv" need, and the advanced
   chase starts only at level 45.
2. **The Jewelry Store not advanced** (recommended). Switching it on later is 3 commands (section 2.4).
3. **A City Criminal Base** lot near the Jewelry alley (Jailbreak's base and zipline). Not in this build.
4. **The new mechanics:** M1 alone gives most of the Jailbreak replay feel. M3 is the Museum's signature, and M2 is
   flavour.
