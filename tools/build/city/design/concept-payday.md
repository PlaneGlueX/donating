# City core heists: the Payday-forward concept

Written 2026-10-26 for the owner's request ("build Jailbreak's Jewelry Store, Bank and Museum, but change the themes
a little, with ideas from GTA or Payday 2"). This version leans on Payday 2's strengths:
- runs that differ from one opening to the next;
- a quiet line that avoids the alarm, and a loud line;
- one special piece of loot per heist;
- a vault moment worth waiting for.

Each building still reads as Jailbreak's from the street and plays as Jailbreak's inside. Everything works at launch
with the existing mechanics. Three small new mechanics (N1-N3, section 5) are bonus layers.

Sources:
- research-jailbreak.md, research-payday.md and research-gta.md in this folder;
- CLAUDE.md (Heists, Traps, Loot, Stores, clerks and assaults, the prison, builds);
- the code itself: heists.sk heistTripAlarm/heistLockdown/heistRelease, loot.sk lootKeyType/lootRollPile/dlootCheck,
  traps.sk, cops.sk, core.sk loadSettings, story.sk storyHeistFits.

Every number is a PROPOSAL.

---

## 0. What this design relies on (checked in the code today)

| Fact | Where | Used for |
|---|---|---|
| A non-advanced heist never alarms: `heistTripAlarm` returns false unless `heistIsAdvanced` (stores: only panic/staff) | heists.sk 841 | The Jewelry Store (d2, not advanced) uses **turret** cameras (`effect=damage`), not alarm ones |
| Every gate kind takes `alarm=true/false` per gate (`lootKeyType`: "alarm" is a bool for smash, safe and drill); defaults: smash false, safe false, drill true | loot.sk 104, 1222/1443/1536; core.sk `loot::*::alarm` | An **alarmed showpiece case** (Jailbreak's mask: greed trips the alarm) and a **quiet vault drill** (Bank) with no new code |
| Per-gate `time`, `mount` (secs ≤ 600), `jams` 0-5, `claim` 0-120 s (safe, drill), `digits` 3/4/5 (safe) | loot.sk 107-120, lootParse | Museum vault 90 s / 3 jams; Diamond case `claim=20`; a 3-digit emergency hatch |
| Pile overrides `piece=`, `take=`, `per-cell` 1/2/4, `layers` 1-3, `value=MIN-MAX`; ≤ 12 cells, ≤ 24 pieces a pile, ≤ 24 spots and **≤ 150 pieces (sum of every pile's maximum)** a heist | core.sk 1258-1264, loot.sk 2278-2325 | All piece counts below are checked against these |
| A pile's pieces are **shuffled over its cells** at every opening (`lootRollPile`: `shuffled`) and the count is rolled in the range; at least 1 piece always shows | loot.sk 376-406 | Free variety: a 12-cell counter with 5-10 pieces looks different every run |
| Lockdown boxes: any box inside the heist, any block, set when the alarm trips; restored by the room reset | heists.sk 1024 | Shutters on windows, teller windows and the diamond's pedestal (visual) |
| Cop spots round-robin per wave; else the exit spot | cops.sk 114-122 | Cops come from the front; the quiet back way stays cooler |
| The getaway = released for `range`: distance (3D) from the heist's centre > chase radius (100; × 2 `car-chase-factor` in a car) | heists.sk 886-912, core.sk 54/406 | The Museum's storm drain ends ~155 blocks from its centre |
| `/dloot check` clear time G = Σ(pile max pieces × take) + Σ smash take + 30 s a safe + drill mount + time; warns over half the clock | loot.sk 2702-2749 | Section 5 of every heist |
| Story filters: `safe` / `drill` = the heist has that gate kind; `adv`; `d4`; `finale` = d4 + advanced + safe + drill; `d<n>+` | story.sk 191-227 | Story coverage per heist |
| Contact-job bonuses already reward quiet play: "Quiet Hands" (the cops never chase you) and "Ghost" (untouched) | core.sk 2152-2158 | The stealth line has a payoff on day one |
| Trap damage D = max(1, round(d × 2 × m)) / 2 hearts, m = 1.25 / 1.5 / 1.75 for d2 / d3 / d4 | CLAUDE.md Traps, core.sk 1181-1185 | Every trap below lists `damage=` and the hearts it costs |

Two things I could not prove from reading, so the builder checks them on the test server:
- A smash gate with **no piles behind it** (used as a breakable entry: the Jewelry panels, the Museum skylight and drain
  grate). `/dloot add` doesn't refuse one, but check its marker and whether the first smash starts the escape clock.
  It should (`heist::start-on` "rob" = the first finished task).
- Iron bars as a gate's blocks ("all solid"). If they're refused, use iron blocks drawn as a cage door.

---

## 1. Site sketch: the city east of the prison (x ≥ 481)

```
 x: 481         566    593 600   623 632        671 674 681        775   812      840            909   960
z 230 ============================ EXCHANGE STREET (z 230..253) ===========|      (future city north of here:
      (future: casino, power plant)  |       |                          |       |       casino, power plant)
z 254                                | V     |                          | B     |
z 300                                | A     |  [ CITY BANK ]           | A     |
      (free lots)                    | U     |  40x38, doors face WEST  | N     |      (free)
z 337                                | L     |  emergency hatch ->  *   | K     |
z 370 ====== DIAMOND ALLEY ==========| T     |    (677,64,341)          |       |
z 379         [JEWELRY STORE]        |       |                          | L     |
z 410          28x32, faces SOUTH    | S T   |  (free)                  | N     |
z 411..415     plaza + 2 red X marks |       |                          |       |
z 416 ---- sidewalk -----------------+       +--------------------------+       +---------------------------------
z 419 ======================== CITY AVENUE: the prison highway continued, x 481..960 ======================
z 441 ==================================================================================================
z 444 ---- sidewalk ---- (thin strip z 445..470: bus stops, parking; the town's ridge is south of z 470) -+ MUSEUM
z 446                                                                                       DRIVE x 812..819 climbs
z 452                                                                       [ MUSEUM HILL plateau y 70, x 826..923 ]
z 470                                                                                [   MUSEUM 70x36   ]
z 505                                                                                  drain grate (856..858)
z 506..630                                                                       storm drain south (floor y 58)
z 540..560                                                         staff car park + mid manhole (875,64,552)
z 631..650                                                                       dry spillway (the outfall)
```

- **City Avenue**: the highway carries on east from x 481 to x 960 with the prison's profile:
  - asphalt z 419..441 (black concrete mixes), a yellow dash at z 430, white edges at z 420/440;
  - sidewalks of light gray concrete at z 416..418 and 442..444, curb slabs on z 418/442.
  
  Junctions at Vault Street and Museum Drive copy the prison's x 431..466 junction (no centre line, traffic lights
  on the 4 corners).
- **Vault Street** (N-S, x 600..623, 24 wide like the town's streets, sidewalks x 597..599 and 624..626), from the
  Avenue north to **Exchange Street** (E-W, z 230..253, x 481..775). This is Jailbreak's "Bank and Jewelry on the same
  straight street, a few blocks apart". From the Bank's front steps you see the Jewelry Store's cyan diamond
  ~105 blocks down the street.
- **Diamond Alley** (E-W, z 370..377, x 540..599): the Jewelry Store's back, where its fire escape lands.
  **Bank Lane** (N-S, x 674..681, z 254..415): the Bank's loading dock and its emergency hatch open onto it.
  Both are asphalt, so the GPS scan reads them as streets.
- **Museum Hill**: east of the Jailbreak grid, as in Jailbreak, at x > 775 where the land is free on every side.
  - A hollow-shell hill (the town's `hillColumn` way) with a flat top at y 70 over x 826..923, z 452..530.
  - Reached by Museum Drive (x 812..819, from the Avenue at z 442, climbing the hill's west flank to the forecourt
    at y 70) and by a grand stair (x 866..883) straight up the north slope from the Avenue's sidewalk.
  - Behind the hill: a staff car park (x 850..900, z 540..560, y 64) and the storm drain's outfall.
- **Distances** (between heist centres): Jewelry (579, 72, 394) ↔ Bank (651, 79, 318) ≈ 105; Bank ↔ Museum
  (874, 78, 487) ≈ 280; Jewelry ↔ Museum ≈ 310. A Bank chase (100 on foot, 200 in a car) never drags cops into the
  Museum, and the Jewelry Store has no alarm.
- **From the prison**: an escapee leaving the front gate (x 252..292) walks east along the highway. The Jewelry Store
  is the first city building (~290 blocks), the Bank one turn north, and the Museum on its hill at the end of the
  Avenue. That is the order of the levels (5, 20, 45). The town's junction (x 431..466) stays the way south to Mara.
- **Getaway routes**:
  - Bank: out of the back dock into Bank Lane, then north to Exchange Street (~80 blocks), then either way along it.
  - Museum: down the storm drain to the spillway (~155 from its centre), or up the mid manhole into the staff car
    park and away in a car.
  
  Both escapes lead *away* from the cop spots.
- **Cop approach corners**:
  - Bank: the two Vault Street corners of its block, (625, 65, 297) and (625, 65, 340), so the front is hot.
  - Museum: the forecourt's two corners (836, 71, 462) and (913, 71, 462), plus the foot of the drive (816, 65, 446).
  - Jewelry (not advanced, spots only for later): (598, 65, 414) and the Diamond Alley mouth (598, 65, 373).
- **Room for later**: everything north of Exchange Street, the lots x 481..560 and x 682..775 between the Avenue and
  Exchange Street, and everything east of x 960. A City Hideout (a `safe_base` selling point near the heists, as
  Jailbreak's Rising City Criminal Base) is the owner's call. If built, put it ≥ 200 blocks from the Bank and the
  Museum so a car getaway still has to happen first.
- **The phone's city scan** must be rerun after the paste:
  `/dphone city scan -40 -30 960 1300 0 jailbreak` covers x 481..960 and z 230..660. The Museum Drive ramp and the
  plateau aren't street height; the forecourt is cut sandstone, so it never reads as a street.

---

## 2. The Jewelry Store (`jewelry`, difficulty 2, level 5, not advanced)

### 2.1 Theme and hook
Jailbreak's black-framed, blue-glass corner store:
- you cut in at the red X on the pavement;
- smash the glass cases under the floor lasers;
- dip into the basement, climb a laser floor, and leave over the roof.

The Payday twist is Payday 2's *Jewelry Store / Ukrainian Job* and PD3's *Dirty Ice*. The run's prize is one rare
stone, **the Blue Facet** ($6,000, exactly one Duffel Bag). It sits behind one of two safes: the basement strongroom or
the manager's office upstairs. Which one changes every opening (N1). Without N1 it's always upstairs.

Every newcomer meets Payday's oldest choice here:
- smash cases fast and leave;
- or spend 40 s on a keypad for a stone that fills the bag on its own (and, with N1, maybe pick the wrong safe).

There are no cops (difficulty 2 isn't advanced, so the level-5 crowd learns heists without assaults). The danger is
the store's security: turret cameras you get past by sneaking, and floor lasers. It is Mara's chapter-2 safe heist.

### 2.2 Footprint and look
- **Building** x 566..593 (28) × z 379..410 (32). **Region** `heist_jewelry` x 566..593, z 379..410, y 57..87 =
  27,776 blocks.
- **Levels**:

  | Level | Floor block | Rooms |
  |---|---|---|
  | Basement B1 | y 58 | 59..63 |
  | Ground floor | y 64 | 65..70 |
  | Upper floor | y 71 | 72..76 |
  | Roof deck | y 77 | parapet y 78, stair hut y 78..81 |

  Above the roof: a cyan glass diamond sign on the SE (Avenue / Vault Street) corner, y 78..86.
- **Outside**:
  - a black frame: polished_blackstone piers and floor bands, black_terracotta spandrels;
  - full-height blue_stained_glass on the two street faces (south and east), light_blue_stained_glass on the upper
    floor;
  - a grey louvre band at the top (polished_andesite with iron trapdoors laid flat, out of reach);
  - a small diamond over the sealed glass double door (it doesn't open, as in Jailbreak).
  
  The roof is polished_deepslate.
  
  A 3-wide grass verge with a row of shrubs on the Vault Street side (x 594..596; Jailbreak's green verge).
- **Front plaza** z 411..415, polished_andesite. Two **red X marks** (red_terracotta, 3×3) at x 570..572 and
  x 585..587 in front of the two cuttable panels.
- **Entrances**:
  1. **Two cut-in panels** (the Jailbreak laser-cut slot as smash gates). Each is the lower 2 × 2 of the front glass
     at the X: x 571..572 and x 586..587, z 410, y 65..66. Smashing either opens it for the run.
  2. **The roof**, by the fire escape: steel stairs down the north face outside the region, from the hut's north door
     (landing at z 378) to Diamond Alley. Late joiners come in this way (Jailbreak's vent rope), and most robbers
     leave by it.
- **Windows**: every street face is glass. No lockdown boxes (the store isn't advanced).
  If the owner ever makes it advanced, list these boxes: the 2 panels, the south face y 65..76, and the east face
  y 65..76 (4 boxes, iron bars).

### 2.3 The robbery, beat by beat
**Exit spot** (579.5, 65, 416.5): the Avenue sidewalk, 6 blocks from the glass. **Hologram** (579.5, 70, 413.5).

**Ground floor, the showroom** (z 386..409; the cashier counter across z 386):
1. **Cut in**: hold 1.5 s at either panel (gates S1, S2: smash, 4 glass blocks each, `alarm=false`). The clock
   starts. 6:00.
2. **Four island cases** (Jailbreak's low glass islands). Each is a 2×3 plinth set into the floor (the cells), with
   glass sides as plain decor and a glass top at y 67:

   | Gate (smash, 6 glass tops) | Pile behind it |
   |---|---|
   | I1 x 571..572, z 392..394 | jewel $250 / 1.0 s, **1,250-2,500** (5-10), 6 cells |
   | I2 x 571..572, z 400..402 | same |
   | I3 x 586..587, z 392..394 | same |
   | I4 x 586..587, z 400..402 | same |

   The smasher gets the nearest ring at once, then it's a race.
3. **Floor lasers** (Jailbreak's glowing floor bars; d2: `damage=2` = 2.5 hearts):
   - L1 and L2 run E-W at z 389 and z 397, h 0.4, x 568..591: jump them.
   - L3 runs N-S at x 579, h 0.4, z 388..406, between the island rows.
   - L4 runs at z 406, h 0.4, x 568..591, just inside the panels: the first jump.
4. **The counter turret** T1: a camera at (579.5, 69.5, 386.5) looking south over the showroom, `effect=damage`,
   `damage=1` (1.5 hearts a shot), range 12, `sweep=70 period=6`. It fires after 1 s in its cone, then every 0.5 s.
   Sneaking halves its range to 6, so a robber who sneaks along the side walls never draws fire (Payday's camera
   dance, turret edition). Anyone standing still at the islands in its sweep eats shots. The two stairs (down at the
   west end of the counter, up at the east end) are behind the counter, inside its sweep.

**Basement, the strongroom** (y 59..63, under the back two-thirds):
5. **The vault row**: a 1×10 counter case, cells x 572..581, z 395 at y 59, glass top y 62. Gate R (smash, 10 glass).
   Pile: jewel $250 / 1.0 s, **2,000-3,500** (8-14), 10 cells.
6. **Lasers**:
   - L5 and L6: N-S at x 576 and x 584, h 0.4, z 382..399. Jump them.
   - L7: a blinking high beam (h 1.65, duck) at x 571, z 386..392, `blink=true on=2 off=2`. It guards the strongroom
     door.
   - Plates P1 and P2 (`damage=2`) at (572, 59, 388) and (572, 59, 389), right in front of the safe door. A 3-block
     detour by x 573 avoids them.
7. **Safe A, the strongroom door**: a 2×2 steel door (iron blocks) at x 570, z 388..389, y 59..60. Safe gate, 4
   digits, `claim=6`. Behind it, a 3×6 niche (x 567..569, z 386..391) with:
   - **Gold A**: gold $500 / 1.5 s, **1,500-2,500** (3-5), 4 cells on a shelf;
   - **[N1] Blue Facet A**: jewel, `piece=6000 take=4`, value 6000, 1 cell on a blue velvet pedestal (blue_wool).

**Upper floor** (y 72..76):
8. **The laser parlour** (z 393..409, Jailbreak's obby floor). One of two layouts per opening with N1 (group
   `parlour`, pick 1); without N1, layout A always:
   - **A "Layered"**: 5 static low beams L8-L12 (h 0.4, `damage=2`) E-W at z 395, 398, 401, 404, 407, plus a zigzag of
     smooth_quartz stepping pedestals 1 high. Hop the pedestals (your feet clear the beams) or jump each beam.
   - **B "Moving"**: 6 vertical beams L13-L18 (y 72.0 → 76.9, `damage=2`) at (572/579/586, z 398) and
     (575/582/589, z 404). Each blinks `on=1.5 off=1.5` with offsets 0 / 0.5 / 1.0 along each row, so a gap travels
     across the room. Weave through behind the wave.

   The upper floor's street windows show which layout is live from outside (Jailbreak's scouting windows).
9. **The manager's office** (x 567..578, z 380..391):
   - **Safe B**, a wall safe door (2×2 iron, x 569, z 384..385, y 72..73), 4 digits, `claim=6`. Behind it a 2×3
     niche:
     - **Cash B**: cash `piece=200 take=1.2`, **1,200-2,400** (6-12), 3 cells;
     - **Blue Facet B**: jewel `piece=6000 take=4`, value 6000, 1 cell. Without N1 this is the only Blue Facet.
   - The **desk drawer**, an open pile on the desk: cash $100 / 0.8 s, **400-1,000** (4-10), 3 cells.
   - [N3] the **fuse box** by the door: hold 3 s and the VIP laser curtain goes off for the run.
10. **The VIP salon** (x 581..592, z 380..391), Payday's Diamond Store / Dirty Ice VIP room:
    - **The curtain**: 3 beams L19-L21 across its doorway (x 581, z 387..389) at h 0.4 / 1.0 / 1.65 (you can't jump
      or duck all three), blinking in sync `on=2 off=2` (a 2-s walk-through window every 4 s), `damage=2`, `tag=vip`
      (N3).
    - **Two VIP cases**, each a smash gate (2×2 glass top) over a jewel pile `piece=500 take=1.5`, **1,500-3,000**
      (3-6), 4 cells:
      - V1 at x 584..585, z 384..385;
      - V2 at x 588..589, z 384..385.
    - **The VIP turret** T2 in the salon's NE corner (`effect=damage damage=1`, range 10, `sweep=60 period=7`).
11. **Out**: the corridor (x 579..580) leads north to the roof stair. The hut's north door opens onto the fire escape,
    which goes down to Diamond Alley. Or go back down and out through a cut panel. Both are fine: nobody chases you.

**Escape clock** 6:00 (default). **Cooldown** 10:00 (default). **Level** 5 (default). **Advanced** false (default).
**Pool** **$26,000** (`/dheist set jewelry pool 26000`; the default is $24,000, see 2.5).
**Cop spots**: none needed. Add the two in section 1 only if it is ever made advanced.

**Spots** (≤ 24): gates S1, S2, I1-I4, R, A, B, V1, V2 = 11. Piles I1-I4, R, Gold A, [Facet A], Cash B, Facet B,
drawer, V1, V2 = 12. Total **23** (22 without N1).

**Traps** (≤ 40): L1-L21 (21; A or B armed, so at most 16 live), T1, T2, P1, P2 = **25**. All ≥ 2 blocks inside the
region edge.

### 2.4 Replayability
**With existing mechanics (launch):**
- Every pile's piece count rolls in its range, and the pieces are **shuffled over its cells**. Each island shows 5-10
  rings in different places, so the race for "the nearest case" differs every run.
- Every robber's code for each safe is new each run (no sharing).
- The turrets' sweeps (6 s and 7 s periods) drift against each other, so the safe moments to cross move during a run.
- The crowd is the variable (Payday's public lobby): one robber smashing I1 tells everyone where to go, and the two
  safes split the crowd.
- The two ways out (fire escape or panels) carry no risk here, so they're about speed.

**With N1 (bonus):**
- The Blue Facet is behind safe A **or** safe B (group `stone`, pick 1, `else=none`). Each safe door has a 1-block
  tinted_glass slit (part of the gate). From up close you can see whether the velvet pedestal holds the stone:
  Jailbreak's one-way scouting windows turned into Payday's "check before you commit". Both safes still pay
  (gold / cash), so cracking the wrong one isn't wasted.
- The parlour layout is A or B (group `parlour`, pick 1). That's Jailbreak's randomized obby floor.

**With N3 (bonus):** the office fuse box switches the VIP curtain off. Solo players time the blink. A crew sends one
robber to the office first.

### 2.5 Balance check
- **Value**: rolls **$19,100-31,400**, about **$25,850** on average. The islands give 5,000-10,000, the row
  2,000-3,500, VIP 3,000-6,000, gold 1,500-2,500, cash 1,200-2,400 and the drawer 400-1,000. The Facet is 6,000.
  Pool $26,000, against the d2 default of $24,000 (+8%: the Facet is one extra Duffel). About 37% sits behind safes,
  close to Payday's "the front alone isn't enough".
- **Pieces** (sum of maxima): 40 + 14 + 12 + 5 + 12 + 10 + 2 = **95** ≤ 150.
- **`/dloot check` G**:
  - piles 40×1.0 + 14×1.0 + 12×1.5 + 5×1.5 + 12×1.2 + 10×0.8 + 2×4 = 109.9 s;
  - 9 smashes × 1.5 = 13.5 s;
  - 2 safes × 30 = 60 s;
  - total ≈ **183 s = 3:03** against a **6:00** clock (51%: the "fine for a crew" warning).
- **One robber, as they really play** (rates r = piece / take):

  | Robber and bag | Plan | Time |
  |---|---|---|
  | Level 5, Duffel Bag, C = $6,000 | **Cases**: jewel r = 250/s fills the bag in 6,000 / 250 = **24 s** of holding, + 2-3 smashes + walking | about 1:00 |
  | Level 5, Duffel Bag, C = $6,000 | **The stone**: about 30 s up the parlour, about 40 s on the keypad, then 4 s | about 1:30, bag full from one piece |
  | Level 10, Hockey Bag, C = $15,000 | Cases + the row (~45 s holding) + a safe + the Facet | about 3:00-3:30 |
  | Gym Bag, C = $2,000 | A few rings | about 8 s of holding |

  Gym Bag robbers learn that bags matter. All of these fit the 6:00 clock with room for laser mistakes.
- **Damage**: the worst single hit is a plate or laser at 2.5 hearts. A turret burst is 1.5 hearts per 0.5 s.
  Forgiving, as fits level 5.
- **The story**:
  - Mara chapter 1 (any heist) and chapter 2 at level 5 ("crack a safe": two safes, level 5);
  - chapter 3's "3 different heists" (with the town's two stores and the Bank);
  - Vic's "sell $20,000 from d2+" (about one Hockey Bag run, or 3-4 Duffel runs).

---

## 3. The City Bank (`bank`, difficulty 3, level 20, **advanced**)

### 3.1 Theme and hook
Jailbreak's green-glass tower with the vertical **B A N K** pylon:
- a lobby with tellers;
- a vault floor downstairs whose laser course changes every opening;
- a giant round vault door;
- an alternate exit to a street hatch.

The Payday twist is Payday 2's *Bank Heist* (Harvest & Trustee) plus *GO Bank*'s laser door and *The Big Bank*'s
security room. The vault holds **Cash, Gold or Deposit boxes** this week (N1; the Bank Heist variants, and Jailbreak's
"a different vault each opening"). A barred port beside the vault door lets you look in before you spend a drill.

**This is the city's stealth-or-loud heist.** I argue it should be advanced (the default is d4 only; see 3.6):
- **The vault drill is quiet** (`alarm=false`), but two sweeping alarm cameras watch the vault door. Mounting the
  drill and fixing its jams in their blind windows is the bank's signature moment: Payday's camera dance on a
  60-second clock.
- **Going loud**:
  - any camera, a teller's foot pedal, or the staff corridor's alarm fence trips the alarm;
  - the teller drawers lock (N2), the windows bar up, and d3 assaults pour in from Vault Street;
  - you finish the vault under fire and leave by the back dock or the vault's emergency hatch.
- **Quiet** rewards you with:
  - no cops and no deaths (deaths drop a duffel);
  - the tellers' cash (with N2);
  - the jobs' "Quiet Hands" and "Ghost" bonuses.
- **Loud** rewards you with the shortcut through the alarm fence to the dock, where the alarm no longer matters.
- In a busy server one careless robber takes everyone loud, like a Payday public lobby. Both lines always work.

### 3.2 Footprint and look
- **Building** x 632..671 (40) × z 300..337 (38), front (doors) facing **west** onto Vault Street. **Region**
  `heist_bank` x 632..671, z 300..337, y 55..104 = **76,000** blocks.
- **Levels**:

  | Level | Floor block | Rooms |
  |---|---|---|
  | B1 (vault floor) | y 56 | 57..62, ceiling y 63 |
  | Ground floor | y 64 | lobby double height 65..74; east-wing rooms 65..70 |
  | Floor 2 | y 75 | east wing only, 76..80 |
  | Tower (sealed, no interior: the silhouette) | from y 81 | to y 104, 24×24 at x 640..663, z 307..330 |

- **Outside**:
  - green glass curtain walls (green_stained_glass, lime_stained_glass bands on one floor) in a dark navy frame
    (blue_terracotta / polished_deepslate);
  - the brick **pylon** on the NW corner (x 632..636, z 333..337, bricks + polished_blackstone) carrying B, A, N, K
    in white quartz letters stacked from y 70 to y 100;
  - a sea_lantern "neon" line round the base at y 64 (Jailbreak's open light);
  - the roofs are gray_terracotta.
- **Front plaza** x 626..631 (steps, smooth_stone). Glass doors at x 632, z 316..320.
- **Back**: the **loading dock** on the east face (x 668..671, z 328..336), a 5-wide opening onto Bank Lane.
  The **emergency hatch**: a steel trapdoor block set in Bank Lane at (677, 64, 341), ringed by 4 bollards
  (polished_blackstone_wall).
- **Windows**: lobby glass on the west, south and north faces; east-wing and floor-2 windows. All get lockdown bars.

### 3.3 The robbery, beat by beat
**Exit spot** (625.5, 65, 318.5): Vault Street's east sidewalk, 7 from the doors.
**Hologram** (628.5, 70, 318.5).
**Cop spots** (625, 65, 297) and (625, 65, 340): the front corners, so the cops come in through the front.

**Ground floor**
1. **The lobby** (x 637..654, z 301..336, marble: polished_diorite + smooth_quartz). The front doors stay open; the
   cops need them.
   - Alarm cameras (tag `cams` for N3):
     - C1 over the vestibule looking east (`sweep=60 period=7`);
     - C2 over the teller line looking west (`sweep=90 period=9`);
     - C3 in the manager's office corner (`sweep=60 period=8`);
     - C4 fixed on the head of the B1 stair.
   - Range 12, half while sneaking. Sneak, read the sweeps, never stand still in a cone for 1 s.
2. **The teller line**: a counter at x 650, z 305..332, with 4 windows. Behind it, two cash strips on the back shelf
   (x 653, y 65 shelf blocks):

   | Pile | Cells | Contents |
   |---|---|---|
   | Teller A | z 304..315 | cash `piece=400 take=2.0`, **2,000-4,000** (5-10) |
   | Teller B | z 322..333 | same |

   [N2] both `on-alarm=vanish`: the tellers' shutters (lockdown iron bars over the 4 windows) slam and the drawers
   are gone. Two **foot pedals** in the 2-wide walkway, at (651, 65, 311) and (651, 65, 325): plates
   `effect=alarm`. Step round them.
3. **The manager's office** (x 656..666, z 301..311, glass partition: watched by C3). **Safe M**: a 2×2 wall safe at
   x 665, z 305..306, y 65..66, 4 digits, `claim=6`. Behind it a 2×4 niche (x 666..667, z 304..307):
   - **Manager's cash**: cash `piece=500 take=2.0`, **3,000-5,000** (6-10), 4 cells;
   - **Bearer bonds**: goods `piece=1000 take=2.0`, **2,000-5,000** (2-5), 3 cells.
4. **The deposit room** (x 656..666, z 326..336), through the teller area. **Gate D**: the box wall (smash, 27 faces
   at x 666, z 327..335, y 65..67; chiseled_tuff box faces with iron trim, "pry the boxes"). Behind it, the slot
   shelf x 667, z 327..335, y 65: **Deposit boxes**, jewel `piece=750 take=1.5`, **4,500-6,750** (6-9), 9 cells.
5. **The staff corridor** (x 668..670, z 301..336) to the dock. Across it at z 326 runs the **alarm fence**: 3 alarm
   lasers (light blue) at h 0.4 / 1.0 / 1.65. You can't jump or duck all three, so this way is loud-only. The moment
   the alarm has tripped it's a free shortcut to the dock.
6. **The counting room** (x 656..666, z 313..324): the stair down to B1 (x 657..660) and a door to the staff corridor.

**Floor 2** (east wing, the public stair from the lobby's NW corner and a balcony along the lobby's east side)
7. **The corridor** to the security room: L4 low (h 0.4) then L5 high (h 1.65), `damage=2` (3 hearts at d3). Jump,
   then duck.
8. **The security room** (x 656..666, z 313..324, over the counting room):
   - a desk with **petty cash**: cash `piece=200`, **400-800** (2-4), 2 cells;
   - [N3] the **console**: hold 3 s and every `cams` camera (C1-C6) goes dark for the run. `quiet=true`: it's dead
     once the alarm has tripped. This is Payday's camera operator.
9. **The VP offices**: VP-A (x 656..666, z 326..336) and VP-B (x 656..666, z 301..311). Each has a wall safe
   (4 digits, `claim=6`) with **VP gold** behind it: gold $500 / 1.5 s, **2,000-4,000** (4-8), 4 cells.
   - With N1 (group `vp`, pick 1) only one office's safe is real this run. The other stays a shut door, no marker.
   - Without N1, only VP-A is built as a gate.

**B1, the vault floor**
10. **The vault lobby** (x 637..664, z 302..314), from the stair foot (x 657..660) west to the vault door. The **laser
    floor** (x 648..656, 9 long) is one of three layouts with N1 (group `vfloor`, pick 1; each named on a brass
    plaque so robbers can call it out). These are Jailbreak's vault floors in miniature:

    | Layout | Traps | How you cross |
    |---|---|---|
    | **A "Classic"** | L6, L7 low (h 0.4), L8 high (h 1.65), L9 a blinking mid (h 1.0, `on=2 off=2`); all `damage=2` | Jump, jump, duck, then time the last |
    | **B "Corridor"** | L10-L18: 3 laser walls, each 3 beams at 0.4 / 1.0 / 1.65, `blink on=2 off=1.5` with wall offsets 0 / 0.6 / 1.2 | Dash from wall to wall in the gaps (the Presidential Vault's sweeping wall) |
    | **C "Mint"** | P3-P10: 8 plates on a 4×4 checkerboard (`damage=2`); L19, L20 low beams at both ends | Pick your way across |

    Without N1 it's layout A plus one blinking wall from B.
11. **The vault door**: **gate V**, a drill gate. A round 5×5 door (21 iron blocks; the 4 corners are
    polished_deepslate frame, not gate) in the vault's south wall at z 315, x 642..646, y 57..61. Settings:
    `time=60`, `jams=2`, `claim=10`, **`alarm=false`** (the quiet thermal drill).

    Two alarm cameras watch it from the lobby's west corners: C5 `sweep=90 period=8`, C6 `sweep=90 period=11`.
    Their blind windows line up only now and then. Mounting (1.5 s) and each jam fix (the 3-hit timing game, ~1-3 s)
    must happen while both look away. Or sneak (range 6) along the wall.

    **The barred port**: a 1×2 iron-bars port in the wall at x 648, z 315, y 58..59 shows what this week's vault
    holds.
12. **Inside the vault** (x 637..652, z 316..335, gold-lit: shroomlights behind smooth_quartz). Always armed:
    - **The trolley** (on a 2×2 cart, x 644..645, z 318..319): cash `piece=500 take=1.5`, **4,000-8,000** (8-16),
      behind V.

    **This week's vault** (N1 group `vault`, pick 1, `else=none`):

    | Variant | Where | Pile |
    |---|---|---|
    | **Cash** | pallets x 638..639, z 320..325 | cash `piece=2500 take=3.5`, `per-cell=2`, **40,000-55,000** (16-22), 12 cells, behind V |
    | **Gold** | behind **gate G**, the gold cage (smash; iron bars 4×3 at x 642..645, z 330, y 57..59) | gold `piece=4000 take=5`, **40,000-56,000** (10-14), 6 cells (x 642..644, z 332..333) |
    | **Deposit** | behind **gate K**, the vault's box wall (smash, 27 faces at x 651, z 320..328, y 57..59) | the slot shelf (x 652): jewel `piece=2500 take=3`, **40,000-55,000** (16-22), 9 cells |

    [N1] **The Founder's Box** (group `rare`, `chance=0.15`): art `piece=12000 take=6`, 1 cell on a pedestal at
    (644, 57, 325), behind V. It's Payday's secret item, there one opening in seven.

    Without N1 all three variants are armed at a third of the range (each **13,000-19,000**) and the Box isn't built.
    The vault is then a mixed haul, still varied by the rolls.
13. **The emergency hatch** (Jailbreak's alternate exit): **gate E**, a safe gate on the vault's north wall (2×2 steel
    hatch at x 648..649, z 336, y 57..58).
    - **3 digits**, `claim=0`, `alarm=false`. It costs a Safe Kit and about 15 s.
    - It opens a tunnel outside the region (z 338..341, then east along z 340..341 to x 677) to a ladder up to the
      Bank Lane hatch.
    - It's the way out that skips the lobby and the cops' side. Blow it early (Jailbreak players do) or not at all.
    - It doesn't count for chapter 2: robbers here are level 20.

**The alarm** (advanced, 20 s warning):
- **Sources**: C1-C6, the two pedals, the alarm fence. Not the drill. Not the safes or smashes (all `alarm=false`).
- **Lockdown boxes** (iron bars):
  - the lobby's west windows (2 boxes: z 301..313 and z 323..336, y 65..74);
  - the south and north lobby faces (2 boxes);
  - the east-wing windows (2 boxes);
  - floor 2's windows (2 boxes);
  - the 4 teller windows (x 650: z 307..309, 313..315, 321..323, 327..329; y 66..67).
  
  That's 12 boxes. The front doors and the dock stay open.
- **Getaway**: the dock or the hatch, then Bank Lane, then north. The bank's centre is (651.5, 79.5, 318.5):
  - on foot: Exchange Street's far side (z 230) is ~90 away; keep going along it to pass 100;
  - in a car (radius 200): drive from Bank Lane.

**Escape clock** 8:00 (default). **Cooldown** 15:00 (default). **Level** 20 (default).
**Advanced** **true** (`/dheist set bank advanced true`; see 3.6). **Pool** $80,000 (default).

**Spots** (≤ 24): gates M, VP-A, [VP-B], D, V, G, K, E = 8. Piles Teller A, B, manager's cash, bonds, VP-A gold,
[VP-B gold], deposit boxes, petty cash, trolley, Cash, Gold, Deposit, [Founder's Box] = 13. Total **21** (18 without
N1).

**Traps** (≤ 40):
- lobby C1-C4, pedals 2, fence 3;
- floor 2 L4, L5;
- vault door C5, C6;
- floor layouts A 4, B 9, C 10.

That's **36** (at most 23 live at once with N1).

### 3.4 Replayability
**With existing mechanics (launch):**
- Every pile's count rolls, and the pieces shuffle over 12-cell strips.
- C5/C6's 8 s and 11 s sweeps drift, so the vault-door window opens at different moments every run.
- The camera periods in the lobby are all different (7, 8, 9 s), so a stealth line is read, not memorized.
- Personal safe codes.
- **Who goes loud, and when**, changes everything:
  - a quiet run ends with the trolley and an empty street;
  - a run that goes loud in the lobby turns into a 3-assault siege at the vault door;
  - a run that goes loud late is a sprint for the hatch.

**With N1 (bonus):**
- Cash / Gold / Deposit, each played differently:
  - cash: fast 3.5 s bricks;
  - gold: a cage to break, then heavy 5 s bars;
  - deposit: a wall to pry, then 3 s pieces.
- The 1-in-7 Founder's Box.
- The laser floor (Classic / Corridor / Mint).
- Which VP office holds the second safe.

Robbers scout through the port before spending a Drill.

**With N2 (bonus):** the teller drawers lock at the alarm. With N3: the security console blinds every camera for the
run (quiet only). Together they make Payday's loop: a stealth crew does the security room first.

### 3.5 Balance check
- **Value** (one variant armed): Teller A+B 4,000-8,000; manager 5,000-10,000; VP 2,000-4,000; deposit room
  4,500-6,750; petty cash 400-800; trolley 4,000-8,000; the variant ~40,000-56,000.

  That's **$59,900-93,550**, about **$76,600** average, plus the Box's EV (0.15 × 12,000 = 1,800): **≈ $78,400**
  against the d3 default **$80,000**. Without N1 the mixed vault (3 × 13-19K) gives about the same total.
- **Pieces** (sum of maxima, every N1 candidate counted as `/dloot add` does today):
  10 + 10 + 10 + 5 + 8 + 8 + 9 + 4 + 16 + 22 + 14 + 22 + 1 = **139** ≤ 150.
- **`/dloot check` G**:
  - piles (one variant, gold): 10×2 + 10×2 + 10×2 + 5×2 + 8×1.5 + 9×1.5 + 4×0.8 + 16×1.5 + 14×5 = 192.7 s
    (+ 6 if the Box is in);
  - gates: drill 61.5 + 3 safes 90 + 2 smashes 3 = 154.5 s;
  - total ≈ **347 s = 5:47** against **8:00** (72%: a crew heist).
- **One robber**:

  | Robber and bag | Plan | Time |
  |---|---|---|
  | Level 20, Hockey Bag, C = $15,000 | **Quiet**: tellers (r 200/s, 8K max ≈ 40 s) + the manager's safe (~40 s + 20 s) | bag full by ~2:30 |
  | Level 20, Hockey Bag, C = $15,000 | **Vault**: walk down and the floor (~40 s), mount + 60 s drill + 2 jams (~70 s), then the variant at r 714-833/s | 15K in **~20 s** of holding; ~3:30 for the vault alone |
  | Level 25+, Armored Duffel, C = $40,000 | The vault | bag full in ~50 s of holding |

  All fit 8:00. A loud run spends some of it fighting.
- **Damage at d3** (m 1.5): `damage=2` lasers and plates = 3 hearts. Default d3 cops (26 HP, 3 damage). Alarm
  defaults: warning 20 s, waves of 2, a cap of 6.
- **The story**:

  | Need | How the Bank covers it |
  |---|---|
  | Chapter 3 at level 20, "drill a vault" | Gate V; the quiet drill means a level-20 player can do it without a fight |
  | Chapter 3, 3 different heists | The Jewelry Store, the Bank and the stores |
  | Chapter 4's getaway from an advanced heist | Reachable from level 20 instead of 45 (harmless: the mission still asks for one at 45) |
  | Vic's "crack a safe in d3+" | Safes M, VP and E |
  | Vic's "drill + lose the cops in one run" | Drill quietly, trip the alarm (on purpose or not), get away |

### 3.6 Why advanced, and the fallback
- Without an advanced d3 heist, a robber's first cops (and first getaway) come at level 45, in the finale's heist.
  The Bank gives the 20-44 band a loud option and a getaway to practise before the Museum. It also matches the owner's
  wish for Payday's quiet-or-loud bank.
- Gentler numbers for this band (PROPOSAL, core.sk; the Bank is the only d3 heist):
  `difficulty::3::alarm::warning` 25 s, `::max-cops` 5, `::pool` 5, `::heavy-from` 4.
- **If the owner keeps it non-advanced**, everything still runs, but the alarm sources do nothing:
  - make C1-C6 turrets (`effect=damage damage=1`) and the fence and pedals `damage=2`;
  - drop the lockdown boxes, the cop spots and N2/N3's quiet flags.

  The heist becomes a plain race: still a vault, still the variants.

---

## 4. The Museum (`museum`, difficulty 4, advanced, level 45): the finale

### 4.1 Theme and hook
Jailbreak's tan neoclassical museum on its hill:
- a portico with 4 columns, and a Triceratops on the pediment;
- **Mr Bones** the T-Rex in a double-height hall;
- an Egyptian room with the Pharaoh's mask, a gem room, upstairs galleries;
- the roof drop, and one road down.

The Payday twist is Payday 2's ***The Diamond*** (McKendrick Museum). **The Starfall Diamond** ($25,000) sits on a
pedestal at the end of a hall whose floor gives way off the safe path. That path changes every opening (N1); the
crowd finds it by falling. The diamond is under a keypad case (**the finale's safe**). If the alarm sounds first,
the case drops into a floor safe that only a drill opens (N2, Payday's own rule).

Other borrowed pieces:
- the basement **Archive Vault** behind a 90-second drill (**the finale's vault**, loud by design);
- **real vs replica paintings** (N1, Payday's GenSec stickers: the replicas are drawn 10% smaller);
- the lever pair that blinds the cameras, and the fuse boxes that drop the gallery's laser grid (N3; Jailbreak's
  two-lever co-op and Payday's circuit boxes);
- **a storm drain** (Payday's GO Bank sewer escape): a quiet way in, and the real getaway out.

Mara's finale asks for all three in one run: a safe, a vault and a getaway. The expert line is Payday's "quiet,
then loud":
1. sneak in by the drain;
2. take the diamond quietly;
3. then go loud on the vault;
4. ride out the first assault while the drill runs;
5. leave by the drain.

### 4.2 Footprint and look
- **Building** x 840..909 (70) × z 470..505 (36), front (north) facing the Avenue, on the plateau at y 70.
  **Region** `heist_museum` x 840..909, z 470..505, y 61..95 = **88,200** blocks. It's a cuboid, so every room fits
  inside the wings' box (no cross-shape corners wasted).
- **Levels**:

  | Level | Floor block | Rooms |
  |---|---|---|
  | Basement (inside the hill) | y 62 | 63..69 |
  | Ground floor | y 70 | 71..77; the Great Hall double height 71..85 |
  | Upper floor | y 78 | 79..85 |
  | Roof | y 86 | the pediment up to y 95 on the north front |

- **Outside**:
  - smooth_sandstone and cut_sandstone walls, a terracotta (light orange / pink) trim band, red banners as block
    patterns (red wool strips: no banner blocks);
  - the portico just outside the region (z 462..469): 4 round columns (sandstone walls stacked on chiseled sandstone
    bases), wide steps;
  - the pediment over it with a dark Triceratops silhouette (brown/black terracotta);
  - a big arched window above the doors showing the T-Rex;
  - a flat smooth_sandstone roof, with the **skylight** (3×3 glass) over the Great Hall and the roof hut
    (x 873..877, z 500..504).
- **Ladders** up the outside of both wing ends (x 839 and x 910, outside the region) to the wing roofs (Jailbreak's
  side ladders; the Grappler is barred within 6 blocks of a heist).
- **Forecourt** x 826..923, z 452..469 at y 70, cut sandstone with planters.
- **Ways in**:
  1. the front doors (open, under the cameras);
  2. the roof skylight (smash, drop onto the north balcony);
  3. **the storm drain**: from the spillway (z 631..650) up the culvert (3×3, x 856..858, floor y 58) to the
     basement's south wall and its iron grate (smash).

### 4.3 The robbery, beat by beat
**Exit spot** (874.5, 71, 462.5): the forecourt, 8 from the doors. **Hologram** (874.5, 76, 464.5).

**Cop spots**: (836, 71, 462) and (913, 71, 462) (the forecourt corners) and (816, 65, 446) (the foot of the drive).
None on the hill's south side, so the drain stays the cool way out.

**Getaway geometry**: the centre is (874.5, 78, 487.5). The drain's outfall (857, 58, 640) is ~155 away on foot
(radius 100). The mid manhole (875, 64, 552) comes up in the staff car park ~65 away: from there a car (radius 200)
has ~135 more to drive.

**Entry gates** (no piles behind them; both start the clock):
- **Gate S, the skylight**: smash, 9 glass at x 873..875, z 486..488, y 86. You drop 8 blocks onto the north
  balcony's landing (y 78; a hay-block landing pad, decorated as a crate, takes the fall).
- **Gate W, the drain grate**: smash, iron bars 3×3 at x 856..858, z 503, y 63..65. Then a 2-block stub inside the
  region (z 504..505), and the culvert stairs down to y 58 outside it.

**Ground floor**
1. **The Great Hall** (x 862..887, z 471..504; a balcony at y 78 along both long walls; two stairs at the south end).
   - **Mr Bones** (bone blocks) on a red octagonal pedestal (red_nether_bricks; x 869..880, z 482..493). On the
     pedestal's ring:
     - **Fossils**: goods `piece=800 take=1.2`, **4,800-9,600** (6-12), 6 cells, open;
     - [N1, group `egg`, `chance=0.2`; N2 `on-alarm=vanish`] **The Golden Egg**: art `piece=15000 take=6`, 1 cell
       behind the skull. A rare, quiet-only treasure.
   - L1 and L2: low static lasers (h 0.4, `damage=2` = 3.5 hearts at d4) ringing the pedestal. Jump in.
   - Alarm cameras C1-C4 at the balcony corners (y 80), sweeping the floor with periods 7, 8, 9 and 10. C5 fixed on
     the skylight landing from 8 blocks away: drop in, sneak, and its halved range (6) misses you. All tag `cams`.
2. **The Egyptian Hall** (west wing, x 842..860, z 471..493):
   - **Gate X, the relic cases**: smash, a row of glass tops ≤ 27. Behind it **Relics**: goods
     `piece=1500 take=1.8`, **12,000-21,000** (8-14), 8 cells.
   - **Gate P, the Pharaoh's Mask case**: smash, 2×2 glass, **`alarm=true`** (Jailbreak: the best piece trips the
     alarm). Behind it **the Mask**: art `piece=12000 take=5`, 1 cell.
   - F1, a **collapsing floor** strip (3×6, `damage=1.5` = 2.5 hearts, `restore=10`) on the straight line to the
     mask, over the basement storage (pit 7 deep, inside the region).
   - C6, an alarm camera (tag `cams`).
3. **The lever rooms** (Jailbreak's two switch rooms):
   - **West** (x 842..852, z 495..504), behind the Egyptian Hall;
   - **East** (a narrow security office, x 889..891, z 489..504), beside the Diamond Hall.
   
   Each holds [N3] a **lever** (link `levers`, `need=2 within=3`): pulled within 3 s of each other, every `cams`
   camera goes dark for the run (`quiet=true`). Two players, two rooms: the social heist. Each room's door is in a
   camera's cone, so getting there is the test.
4. **The Gem Room** (east wing, x 889..907, z 471..487):
   - **Gate J, the gem cases**: smash, glass tops ≤ 27. Behind it **Gems**: jewel `piece=1000 take=1.6`,
     **12,000-20,000** (12-20), 6 cells.
   - L3 low (h 0.4) and L4 high (h 1.65) round the cases, `damage=2`.
   - C7, an alarm camera.
5. **The Diamond Hall** (x 893..907, z 489..504; the door from the Gem Room on its north side).
   - **The floor**: a 9 × 9 zone of pale tiles (z 491..499 × x 896..904) between the door and the pedestal, over the
     basement storage (pit 7 deep). It's three bands of three 3×3 squares. Each **layout** leaves one square per band
     safe, and adjacent bands' safe squares touch. The rest are **collapsing floors** (`damage=1.5` = 2.5 hearts,
     **`restore=0`**: a hole stays open for the run, so falls mark the danger squares for everyone).

     | Layout | Safe squares (west to east) | Floor traps |
     |---|---|---|
     | L1 | left, middle, right | F2-F5 |
     | L2 | right, middle, left | F6-F9 |
     | L3 | left, left, middle | F10-F13 |

     - **With N1** (group `dfloor`, pick 1): the layout is hidden and rolled each opening.
     - **Without N1**: L1 always, plus 2 blinking low lasers across the zone (`on=2 off=2`, `damage=2`) so a known
       path still costs timing.

     You fall into the closed storage below and are put back on the last solid square you stood on.
   - C8 and C9: alarm cameras in the hall's front corners, facing the pedestal (sneak).
   - **Gate Q, the diamond case keypad**: a safe gate, 2 glass-and-steel blocks on the pedestal's front (y 71..72),
     **4 digits**, **`claim=20`** (enough for the 8 s take before the crowd), `alarm=false`. Behind it **the
     Starfall Diamond**: art `piece=25000 take=8`, 1 cell, value 25000. The safe for Mara's finale and Vic's d3+
     safe.
   - [N2] the diamond's pile has `on-alarm=lock:F` (F is a gate, see below). If the alarm trips while the diamond is
     still there, it drops behind **gate F, the floor safe**: a drill gate of 3 iron blocks in the pedestal's base,
     `time=60 jams=1 claim=15 alarm=true`. A lockdown box drops iron bars round the pedestal (x 899..901,
     z 501..503, y 71..73) as the visual. Loud robbers need a second Drill (or a crewmate with one) for the diamond.
     Without N2, gate F isn't built and the diamond stays behind the keypad either way.

**Upper floor** (both galleries open onto the balconies)
6. **The West and East Galleries** (x 842..860 and x 889..907, z 471..487). Paintings on easels (spruce frames with
   wool "canvas" faces, built as blocks; no painting entities). Each pile is art `piece=4000 take=4`,
   **12,000-20,000** (3-5), 5 cells:

   | Gallery | Candidate piles |
   |---|---|
   | West | **8a**, **8b** |
   | East | **9a**, **9b** |

   With N1 (group `real`, pick 2, `else=decoy`): two candidates are genuine, two are replicas paying 10% ($400 a
   piece) and drawn 10% smaller. Without N1 only 8a and 9a are built.
   - **The grid**: 3 alarm lasers (h 0.4 / 1.0 / 1.65, light blue, tag `grid`) across each gallery doorway (L5-L10).
     They're impassable quietly. The quiet way round is the long way along the balcony ledge, under C10 and C11
     (one per gallery, `cams`).
   - [N3] Three **fuse boxes** (link `fuses`, `need=3`, `within=0`: any order, any time; `quiet=true`) drop the grid
     for the run. They're in:
     - the basement boiler room;
     - the west lever room;
     - the roof hut.
   - Once loud, the grid is just light: walk through.
7. **The Curator's office** (upstairs, back west, x 842..860, z 495..504). **Gate O, the curator's safe**: a wall
   safe, 4 digits, `claim=6`, `alarm=false`. Behind it **Curator's cash**: cash `piece=1000 take=1.5`,
   **6,000-12,000** (6-12), 3 cells. This is the finale's second safe, for anyone who skips the Diamond Hall's floor.

**Basement**: Conservation & Archives, inside the hill
8. **The corridor** from the grate (z 503) north to the vault antechamber (z 476..488), with the boiler room
   (x 842..852, z 476..486; fuse box 1) and the service stairs to the Great Hall (behind Mr Bones, x 862..864,
   z 495..503) and to the Egyptian Hall. C12 and C13: alarm cameras sweeping the corridor (periods 6 and 9; tag
   `cams`).
9. **The Archive Vault**: **gate A**, a drill gate. A round 5×5 door (21 iron blocks) in the vault's north wall at
   z 489, x 873..877, y 63..67. Settings: **`time=90`** (core.sk's own note: "90 suggested for difficulty 4"),
   **`jams=3`**, `claim=10`, **`alarm=true`**. Mounting it is how a quiet run goes loud on purpose.

   Inside (x 864..885, z 490..503, gold-lit):
   - **Bullion**: gold `piece=5000 take=5`, **40,000-60,000** (8-12), 6 cells on steel shelving
     (`per-cell=2 layers=1`);
   - **Antiquities**: art `piece=6000 take=5`, **24,000-48,000** (4-8), 8 cells on plinths;
   - **Coins**: jewel `piece=1500 take=2`, **18,000-30,000** (12-20), 6 cells in open trays.

**The alarm** (advanced, 20 s warning):
- **Sources**: cameras C1-C13; gate P (the mask); gate A (the vault drill); gate F (if it's ever mounted); the alarm
  grid.
- **Lockdown boxes** (iron bars):
  - the ground windows of both wings (4 boxes);
  - the upper gallery windows (2 boxes);
  - the arched front window;
  - the skylight's opening one layer below the glass (x 873..875, z 486..488, y 85): the roof route closes;
  - [N2 visual] the bars round the diamond pedestal.

  The front doors stay open (the cops' way in). The drain stays open (the robbers' way out).
- **Assaults**: d4 cops (32 HP, 4 damage, accuracy 1) round-robin from the forecourt corners and the drive. They come
  in through the front, so the fight is in the Great Hall and the stairs, while the vault drills downstairs.

**Escape clock** 10:00 (default). **Cooldown** 30:00 (default). **Level** 45 (default). **Advanced** true (default).
**Pool** $240,000 (default).

**Spots** (≤ 24): gates S, W, X, P, J, Q, O, A, [F] = 9. Piles Fossils, [Egg], Relics, Mask, Gems, Diamond, 8a,
[8b], 9a, [9b], Curator's cash, Bullion, Antiquities, Coins = 14. Total **23** (19 with neither N1 nor N2).

**Traps** (≤ 40):
- C1-C13 (13);
- L1-L4 (4); the grid L5-L10 (6);
- F1 (1); the floor layouts F2-F13 (12).

That's **36**. Without N1: L1's 4 floor traps + 2 blinking lasers instead of 12, so 30.

### 4.4 Replayability
**With existing mechanics (launch):**
- All counts roll in wide ranges (the vault alone swings $82K-138K), and the pieces shuffle over their cells.
- 13 cameras on 6 different periods drift against each other, so no two quiet runs read the same.
- The Diamond Hall's holes stay open (`restore=0`). The first robber through pays in hearts for everyone behind them,
  and the open holes are a different picture every run.
- Three ways in (front, roof, drain) and two ways out (drain, front into the cops). The alarm closes the roof.
- **The quiet / loud order**:
  - who takes the mask (alarm);
  - who mounts the vault drill (alarm);
  - whether the diamond went quietly before that.
  
  The heist plays differently depending on what the crowd does first.

**With N1:**
- the Diamond Hall layout (3);
- which 2 of the 4 paintings are real (6 pairs; the replicas' 10%-smaller draw is the expert's tell);
- the 1-in-5 Golden Egg.

**With N2:** the diamond's fate depends on the alarm. Quiet = keypad. Loud = keypad *and* a floor-safe drill. The Egg
exists only in quiet runs.

**With N3:**
- the levers (two robbers within 3 s) kill every camera;
- the three fuse boxes drop the grid.

The stealth line goes from hard to clever.

### 4.5 Balance check
- **Value**:

  | Pile | Range | Average |
  |---|---|---|
  | Diamond | 25,000 | 25,000 |
  | Bullion | 40,000-60,000 | 50,000 |
  | Antiquities | 24,000-48,000 | 36,000 |
  | Coins | 18,000-30,000 | 24,000 |
  | Mask | 12,000 | 12,000 |
  | Relics | 12,000-21,000 | 16,500 |
  | Gems | 12,000-20,000 | 16,000 |
  | 2 real paintings | 24,000-40,000 | 32,000 |
  | Fossils | 4,800-9,600 | 7,200 |
  | Curator's cash | 6,000-12,000 | 9,000 |
  | Golden Egg (EV) | 0.2 × 15,000 | 3,000 |

  Total **≈ $230,700** average (+ about $3,200 of replicas), against the d4 default **$240,000**. The rolls run
  ~$178K-293K.
- **Pieces** (sum of maxima, all candidates): 1 + 12 + 8 + 20 + 1 + 14 + 20 + 4×5 + 12 + 12 + 1 = **121** ≤ 150.
- **`/dloot check` G** (N1 picks: 2 paintings):
  - piles 8 + 60 + 40 + 40 + 5 + 25.2 + 32 + 40 + 14.4 + 18 + 6 = 288.6 s;
  - 5 smashes 7.5 s;
  - 2 safes 60 s;
  - the vault 91.5 s;
  - total ≈ **448 s = 7:28** against **10:00** (75%: a crew heist).
- **Bag**: a level-45 robber has at most the Armored Duffel (C = $40,000; the Vault Bag is level 60). The diamond
  alone is 5/8 of it. The vault fills it in about 40-50 s of holding at r ≈ 750-1,200/s. The greed decision is
  diamond + 3 bars, or bars + coins.
- **The finale, solo**:

  | Step | Time |
  |---|---|
  | Drain in + grate | ~35 s |
  | Service stair to the Gem Room | ~20 s |
  | The floor (one or two falls) | ~30 s |
  | Keypad | ~40 s |
  | The diamond (25K in the bag) | 8 s |
  | Back to the basement | ~20 s |
  | Mount + 90 s drill + 3 jams, under assault 1 (cops after 20 s) | ~110 s |
  | 3 bars (15K, bag full) | 15 s |
  | Down the drain, past 100 blocks | ~30 s |

  That's **≈ 5:10** of a 10:00 clock: room for fights and missed jams.
  
  A crew splits it: one on the floor and keypad, one mounting the drill, one holding the stairs.
- **Damage at d4** (m 1.75): every trap is set to `damage=2` (lasers, 3.5 hearts) or `1.5` (floors, 2.5 hearts),
  well under the defaults (laser 3 = 5.5 hearts). The cops are the threat at d4, not the furniture.
- **The story**:

  | Need | How the Museum covers it |
  |---|---|
  | Chapter 4 at level 45, a getaway from an advanced heist | The drain getaway |
  | Chapter 4, "sell $40,000 from d4" | One full Armored Duffel |
  | Chapter 5, `finale` (d4 + advanced + safe + drill) | Safes Q and O, drill A; the getaway by the drain |
  | Vic's "drill + lose the cops" | Also covered |
  | Vic's "safe in d3+" | Also covered |

---

## 5. The new mechanics (three, each a bonus layer; every heist above works without them)

### N1. Pick groups: "this run's version"
*Why*: it's Payday's main replay tool (which safe, which vault, which floor, which painting is real, the rare
secret). It also covers Jailbreak's randomized floors and vault floors. One small loot.sk + traps.sk change pays off
in all three heists: 9 uses above.
- **Setup**:
  - `/dloot set <id> group=<g>` on any pile or gate;
  - `/dtrap set <id> group <g>` on any trap;
  - a group holds one family only: piles, gates or traps.
  
  Per heist: `/dheist set <h> pick-<g> <k>` (default 1) and `/dheist set <h> chance-<g> <p>` (0-1, default 1: with
  probability 1-p nothing in the group is armed this opening).
- **At each opening** (heistOnOpen, before lootArm and the trap arming), for each group k members are drawn uniformly
  without repeats and saved in memory for the run. A restart re-rolls, which is fine. What happens to the members:

  | Member | Picked | Not picked |
  |---|---|---|
  | Pile | Armed as today | Nothing spawns (`else=none`, the default). With `else=decoy`, armed at `piece × loot::decoy-mult` (0.1, core.sk), drawn at `loot::decoy-scale` (0.9), its prompt name gets "Replica " after its first take |
  | Gate | Works as today | Stays shut: no marker, no hitbox, no prompt |
  | Trap | Armed as today | Not armed: no display, a plate or floor never fires |

  A gate whose piles behind it are all unpicked also stays shut (no empty cage to smash). Traps in different members
  of one group may overlap (only one is ever armed): `/dtrap add` skips its overlap warning for them.
- **Checks**:
  - `/dloot check` reports the lowest and highest pick totals and G for the slowest pick;
  - the hologram's "$ inside" and the sidebar count armed loot only;
  - `/dloot info` and `/dtrap info` show `picked=yes|no` for the run;
  - `/dheist dump`, `/dloot dump` and `/dtrap dump` write the group lines.
  
  The 150-piece cap stays a sum of maxima over every pile, so candidates count. Every design above fits.

### N2. Alarm rules for loot: "loud changes the prize"
*Why*: stealth needs a reason beyond "no cops". This gives Payday's two rules in one setting:
- a prize that only exists while it's quiet (Rock the Cradle's wallet; here the Egg and the tellers' drawers);
- a prize that turns into a drill job when you go loud (The Diamond's floor safe).
- **Setup**: pile setting `on-alarm=keep|vanish|lock:<gate n>` (default `keep`); `/dloot dump` maps the gate number
  like `behind=`.
- **When the alarm trips** (heistTripAlarm → heistOnAlarm → loot.sk), for each pile of that heist with pieces left:
  - `vanish`: its pieces are removed with a poof, and the heist's robbers get one line ("The teller drawers locked.",
    the pile's `name=`);
  - `lock:<n>`: the pile is `behind=<n>` for the rest of the run, any running head start on it ends, and it locks
    (no hitbox) until gate n opens. If gate n is already open, nothing changes.
  
  The next opening restores everything. It only matters in advanced heists (non-advanced never alarm).
- **Cost**: one loop in heistOnAlarm and a run-scoped `behind` override in the pile's compile. The lockdown box that
  draws the shutter is the existing `/dheist lock`.

### N3. Security panels: fuse boxes, levers, consoles
*Why*: Payday's stealth tools (kill the camera operator, rewire the circuit boxes) and Jailbreak's two-lever co-op
are one mechanic: switch a group of traps off. Used 4 times: the Jewelry's VIP curtain, the Bank's console, the
Museum's levers and its fuse boxes. It is the prison's hold-to-use spot, aimed at traps.
- **Setup**: `/dtrap set <id> tag <t>` on traps. Then
  `/dswitch add <h> [x y z] tags=<t1,t2> [hold=3] [for=0] [quiet=true|false] [link=<name> need=<n> within=<s>] [name=Fuse_box]`
  (staff, heist disabled; also `list`, `info`, `remove`, `dump`).
  
  A panel is an interaction box over a block prop (a lever block set with no redstone behind it, a breaker-box prop,
  a console), with the loot's glowing marker:
  - red = live;
  - green = fired;
  - grey = dead (quiet and alarmed).
- **Using it**: hold right-click for `hold` seconds, with the loot hold rules (0.3 s credit a click, a 1 s pause
  resets). Firing it (or, with `link`, the `need`-th panel of that link firing within `within` seconds of the first;
  `within=0` = any time this run):
  - disarms every trap carrying one of `tags` for `for` seconds (0 = the rest of the run), displays and all;
  - announces it to the heist's robbers ("Cameras down.");
  - counts as a task for the clock start.
  
  With `quiet=true` a panel does nothing once the heist's alarm has tripped ("The panel's dead."). Everything resets
  at the next opening.
- **Limits**: ≤ 8 panels a heist. A panel ≥ 2 blocks inside the region, like a trap.

*Mechanics considered and left out*:
- the per-run plate path console: N1 floor layouts + `restore=0` give the hidden, discovered path for free;
- keycards and a manager NPC: the prison's keycards are gone after the escape, and a manager NPC is clerk.sk-sized
  work;
- rolled drill jams: each gate's fixed `jams` already differs per heist;
- dye packs and timed events: later, if a fourth slot ever opens.

---

## 6. Summary table

| | Jewelry Store | City Bank | Museum |
|---|---|---|---|
| id / difficulty / level | `jewelry` / 2 / 5 | `bank` / 3 / 20 | `museum` / 4 / 45 |
| Advanced | no (turrets, no cops) | **yes** (PROPOSAL; fallback in 3.6) | yes (the finale) |
| Region | 28×32×31 = 27,776 | 40×38×50 = 76,000 | 70×36×35 = 88,200 |
| Clock / cooldown | 6:00 / 10:00 | 8:00 / 15:00 | 10:00 / 30:00 |
| Pool (avg roll) | $26,000 (≈ $25,850) | $80,000 (≈ $78,400) | $240,000 (≈ $230,700) |
| Gates | 2 entry panels, 7 cases, 2 safes | 3 safes (1 a 3-digit hatch), 3 smash, **quiet drill** V | 2 entries, 3 cases (mask alarmed), 2 safes, **90 s drill** A, [floor safe F] |
| Special loot | the Blue Facet $6,000 (one Duffel) | this week's vault (Cash / Gold / Deposit), the Founder's Box (15%) | the Starfall Diamond $25,000, the Mask, the Golden Egg (20%, quiet only), real paintings |
| Quiet line | sneak under turrets | sneak the cameras, drill in the blind windows | drain in, sneak, diamond by keypad |
| Loud line | none | alarm: tellers lock, bars, assaults from the front; out by dock or hatch | mask or vault; assaults through the front; out by the drain |
| Getaway | fire escape / panels | Bank Lane → Exchange St | storm drain (~155 out) or car park |
| Spots / pieces / traps | 23 / 95 / 25 | 21 / 139 / 36 | 23 / 121 / 36 |
| Story | ch. 1, ch. 2 safe, ch. 3 spread, Vic d2+ sales | ch. 3 drill, ch. 4 getaway (early), Vic safe d3+, Vic drill + getaway | ch. 4 getaway + d4 sales, ch. 5 finale, Vic all |
| N1 / N2 / N3 uses | stone safe, parlour / none / VIP curtain | VP safe, vault variant, floor, Box / tellers vanish / console | floor, paintings, Egg / diamond lock, Egg vanish / levers, fuses |

## 7. Calls for the owner (each heist works either way)
1. **Make the Bank advanced** (3.6). It's the d3 stealth-or-loud heist and the first getaway at level 20, with
   gentler d3 alarm numbers. Or keep it plain and turn its cameras into turrets.
2. **Pools**: the Jewelry at $26,000 (one Blue Facet above the default); Bank and Museum on their defaults.
3. **Which new mechanics** (N1 pick groups, N2 alarm rules for loot, N3 security panels): all three, any subset, or
   none at launch.
4. **The city layout**: Vault Street, Exchange Street, Museum Hill east of x 775 with its drain, and whether a City
   Hideout (a selling base) comes later, ≥ 200 blocks from the Bank and the Museum.
5. **Names**: "Jewelry Store", "City Bank", "Museum"; the Blue Facet, the Starfall Diamond, the Founder's Box, the
   Golden Egg.
