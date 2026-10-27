# City core heists: the GTA-forward concept

Jailbreak's Jewelry Store, Bank and Museum, each still recognisable from the street and inside, re-staged with GTA's
set pieces: a front, a back and a top way into every building, a vault reveal worth the trip, bonus targets you choose
to risk, and a getaway you plan on the way in (it ends in a storm drain on stolen bikes, as in GTA's Jewel Store Job).
Everything runs on today's loot.sk, traps.sk, heists.sk, cops.sk and bikes.sk. Two new mechanics (M1 pick groups, M2
fuse boxes) are a bonus layer; every heist works without them, and the fallback is written next to each use.

Revised 2026-10-26 after checking the scripts: a draft of this file had glass lids sitting right on loot cells (it
breaks the 2..3 air rule), smash gates of iron trapdoors (smash says "Smash the glass"), cop routes behind gates and
doors (Citizens never opens a door), a $10,000 d4 sales goal (it is $40,000) and wrong bike yaws. All fixed below.

---------------------------------------------------------------------------------------------------------------------

## 0. What this design leans on (checked in the code)

- **Any gate is a door.** Opening a gate turns its blocks to air for the run (loot.sk `lootOpenGate` -> `lootGateAir`).
  So a safe gate can be a keypad door into a room, and a smash gate can be a skylight. A gate box must be solid (no
  air) and at most 27 blocks. `smash` plays glass sounds and says "Smash the glass", so smash gates are glass only.
- **Any gate can trip the alarm.** Smash, safe and drill gates all take `alarm=true|false` (`lootKeyType`). It fires
  when the glass breaks, when the safe cracks, or when the drill is mounted (the drill's default is true), and only in
  an advanced heist with police. This is Jailbreak's "greed trips the alarm" with no new code.
- **Clicks need you inside.** You can only click loot or a gate while standing in the region (`lootClick`: "Get
  inside the ... first"). So every entry gate has region floor on its outer side (a roof deck, for example).
- **Limits:**
  - per heist: 24 spots (gates plus piles), at most 150 pieces (the sum of every pile's maximum), 40 traps;
  - per pile: 12 cells and 24 pieces; `per-cell` 1, 2 or 4; `layers` 1-3;
  - safes take `digits` 3-5; drills take `jams` 0-5;
  - collapsing floors: at most 64 tiles, and the pit must be inside the region (bottom = tile y + 1 - depth);
  - `effect=alarm` only in an advanced heist; alarm cameras stand down once the alarm runs (`trapCamera`);
  - a pile always rolls at least 1 piece (`lootRollPile`), so "one of three plinths" needs M1.
- **Trap damage:** D = max(1, round(d x 2 x m)) / 2 hearts. Defaults d: laser 3, plate 4, floor 4, turret shot 1.5;
  m = 1.25 / 1.5 / 1.75 for difficulty 2 / 3 / 4. A d4 laser does 5.5 hearts; a `damage=2` plate does 2.5 / 3 / 3.5.
- **Cops never open doors.** Citizens' `open-doors: false` and pathfinding range 100. So every route the cops are
  meant to use is an open doorway with no door block. An iron door with its button on the inside only is a robbers-only
  exit. Cops come in round-robin from the heist's cop spots (`copSpawn`).
- **Lockdown** fills every block of each box with the block (iron bars), so it can seal a doorway too. Box glass runs
  only (between frame piers), and never box the last way out.
- **The chase:** everyone inside when the alarm trips is hunted (`heistTripAlarm`). The chase radius is measured from
  the region's centre: 100 blocks (per difficulty), and twice that for the rest of the chase once you have been in a
  vehicle. A stolen bike is an MTVehicles seat (`carSeatOf`), so it doubles the radius and also earns jobs.sk's
  Wheelman bonus.
- **Story credit:**
  - A getaway counts only with that run's loot and only after the first wave came (story.sk: `heistWave >= 1`).
  - The drill counts for whoever gets its head start (the last jam fixer, else the mounter), and only if they are
    still inside when it opens (loot.sk, "drilled").
- **Bikes** (bikes.sk): scrapped inside a heist, so bike spots stay outside every region. Three missed hotwires lock
  that bike for 15 s, and a stolen bike's spot refills after 120 s.
- **The Grappler** never works on a heist or within 6 blocks of one, so no grapple exits.
- **What the story asks for (core.sk):**
  - Mara: c2_safe at level 5; c3_drill and c3_spread (3 heists) at level 20; c4_getaway (`adv`) and c4_big (sell
    **$40,000** from d4 heists); c5_finale `combo|d4` (crack, drill and getaway in one run of an advanced d4 heist
    with a safe and a drill).
  - Vic (from level 45): v2 sell $20,000 from d2+ heists; v4 crack a safe in d3+; v5 `combo|adv|drill,getaway`.

---------------------------------------------------------------------------------------------------------------------

## 1. Site sketch: Rising City (east of the prison, x >= 481)

```
 z 333                                                                     [service yard y64, gate x870]<-lane x886-890
 z 352          lane                                    CASINO LOT      culvert  [ MUSEUM x802-859, z352-395 ]  Hill
 z 360 [==== Back Alley z360-368, x488-620 ==|========] (reserved)      chamber  [ on the terrace y72          ]  Road
 z 369   x488 [yard] V |  [BANK x556-595]               x610-770        x780-786 [ x788-874, z352-405          ]  x878
 z 378   -495 [JEWELRY ] a |  [ z370-401   ]             z300-415          |      [                            ]  -884
 z 401        [x497-526] u |  [            ]                                |      [____________________________]   |
 z 403          forecourt  l |  plaza z402-415                              |       plaza z396-405, stairs z406-415 |
 z 416 ------ sidewalk ---- t ---------------------------------------------------------------------------------------
 z 419 ================== HIGHWAY (x 481-960, the prison's profile: asphalt, centre line z430, edges z420/440) =======
 z 441 ===============================================================================================================
 z 444 ------ sidewalk ----------------------------------------------------------------------------------------------
 z 451 \ramp x485-500 ===== THE RUN-OFF (sunken storm drain, floor y60, z451-459) ===^tunnel x574===^culvert x783== ramp/
 z 460 ...... verge to z 470 (the town's approach starts at z 471: keep clear) .................................x900-915
```

- **District.** A district region `district_rising_city` (x 481..960, z 290..470, passthrough allow) named
  "Rising City", Jailbreak's city. The Museum hill gets `district_museum_hill` (x 776..900, z 325..415) nested in it.
- **The highway** continues from x 481 to x 960 in the prison's profile:
  - asphalt at y 64 (black concrete mixes);
  - the yellow dashed centre line at z 430 and white edge lines at z 420 and z 440;
  - light-gray concrete sidewalks at z 416..418 and z 442..444, with smooth stone slab curbs at y 65 on z 418 and
    z 442.
- **The way in.** Escaped prisoners walk east from the front gate. Town players take the N-S road (x 431..466) north
  to the highway, then head east. In order they pass:
  1. the Jewelry Store (level 5), right on the doorstep;
  2. Vault Street and the Bank (level 20);
  3. the reserved Casino lot;
  4. the Museum on its hill (level 45), at the end of the strip.
- **Vault Street** (N-S): asphalt x 532..541 with sidewalks at x 528..531 and x 542..545. It runs from the highway
  north to the Back Alley. It separates the Jewelry Store from the Bank, and its two corners are where the cops land.
- **Back Alley** (z 360..368, x 488..620): stone bricks and cobblestone, a walking alley rather than a road. It has the
  Jewelry Store's service yard and the Bank's garage ramp. The Bank's alley cops arrive at its east end.
- **The Run-off** (GTA's storm drain):
  - A sunken service road on the highway's south side, open to the sky. Floor y 60 (black concrete: it is a road, and
    the GPS should route along it), z 451..459, with tuff-brick walls to y 64 on z 450 and z 460, topped by an iron-bar
    railing at y 65.
  - It runs from x 485 to x 915, with slab-step ramps (built like the town approach's, so cars climb them) at
    x 485..500 and x 900..915 up to the highway's south lane through curb cuts.
  - The Bank's escape tunnel (x 574) and the Museum's culvert (x 783) open into its north wall through open grates.
  - Riding west, you come up at x 485, take the highway to the N-S road, and ride south to the Safehouse in town.
  - `gps.street-y-min` is unset today (the whole height). If it is ever set, keep it at 59 or lower so the scan sees
    the Run-off. Lay `/dphone path` nodes through the tunnel and the culvert, because the road grid cannot see under the
    highway.
- **Cop approach corners:**
  - Jewelry: the Vault Street corner on the highway, and the alley mouth.
  - Bank: the plaza's two corners and the alley's east end.
  - Museum: the plaza, the Hill Road bend and the service-yard gate.
  - None of them sits on a heist's planned cold exit (the side lane, the tunnel, the culvert).
- **Room for later:**
  - the Casino at x 610..770, z 300..415, between the Bank and the Museum;
  - everything north of z 300;
  - east of x 900 (the power plant).
  - The verge south of the Run-off (z 461..470) stays green, so the town's approach starts clean at z 471.
- **Rescan afterwards:** `/dphone city scan -40 -30 960 1300 0 jailbreak`, then `/dphone roads scan`.
- **Build rules:**
  - No open-sky black, gray, white or yellow concrete except on real roads (the highway, Vault Street, the Run-off).
  - No polished blackstone, blackstone, their slabs, smooth quartz slab or bamboo slab on open-sky surfaces at
    y 62..71 (the approach's road-block list).
  - Forecourts and plazas are polished andesite; roofs are smooth quartz, calcite or polished deepslate.
  - Loot is item displays only. Nothing with a menu, and no containers, banners or pots within reach.
  - Light level 8 or more wherever there are plates or collapsing floors.
  - Every loot cell has 2..3 air above it, so no glass lid sits right on a cell (the case design in 2.2 shows how).

---------------------------------------------------------------------------------------------------------------------

## 2. The Jewelry Store (`jewelry`, difficulty 2, level 5)

### 2.1 Theme and hook
This is Jailbreak's corner jewelry store:
- blue glass in a black frame, with the cyan diamond on the corner;
- glass islands on the showroom floor with floor lasers between them;
- a basement workshop and an obstacle floor upstairs;
- a roof you leave from.

GTA's Vangelico job gives the run its shape. There are two approaches: walk in the front, or take the "smart" way in
through the roof vent, which drops you into the manager's office past the obstacle floor. Then a smash rush on the
cases, and a short window once the alarm goes, ending on stolen bikes. Payday adds the prize in the back office (the
manager's safe).

The bonus target is the wired Centerpiece. The run stays quiet unless someone smashes it. If they do:
- there is a 40-second window, then the cops come;
- iron shutters drop over the showroom glass (Jailbreak's lockdown);
- the way out is the roof or the back door to the bikes.

It's fun because a level-5 robber's first real heist teaches smashing, dodging traps and cracking a safe in six
minutes. The cops come into it as a choice someone makes, not as a punishment.

Set pieces: the fullest cases visible from the street; dropping through the skylight into the office; the shutters
slamming down; the roof exit; and the bikes in the side lane.

### 2.2 Footprint and look
- **Building:** 30 x 24, at x 497..526, z 378..401.
  - Basement: floor y 58, room y 59..62.
  - Showroom: floor y 64, room y 65..70.
  - Upper floor: floor y 71, room y 72..78.
  - Roof slab y 79, parapet y 80, vent hut to y 81.
- **Region** `heist_jewelry`: x 496..527, z 377..402, y 55..84 = 32 x 26 x 30 = **24,960** blocks.
- **Outside:**
  - full-height light-blue stained-glass panes on the showroom's south and east faces;
  - a frame of black terracotta and polished deepslate;
  - the cyan diamond (cyan and light-blue glass) on the SE corner at the parapet;
  - "JEWELRY" in the tall sign font over the corner door;
  - a polished-andesite forecourt at z 403..415.
- **Entrances:**
  - the **corner door** at the SE: two open doorways with no door blocks, x 524..525 on the south face and z 398..399
    on the east face;
  - the **service door**: an open doorway in the north face (x 500..501) from the service yard (z 369..377) off the
    Back Alley;
  - the **roof**: a fire escape (iron-bar landings and a ladder) on the west face (x 496, z 386..388), from the side
    lane (x 488..495) to the roof.
- **Windows:**
  - the showroom glass;
  - a ribbon window across the upper floor's south face (the obstacle floor's lasers glow through it at night);
  - none in the basement.
- **Roof:** a smooth-quartz deck with two huts. The stair hut opens onto the roof through an open doorway. The vent hut
  holds the skylight over the office's ladder shaft.
- **Inside:**
  - Showroom: the corner vestibule at the SE; six cases in two east-west rows of three with 3-block aisles; the
    counter along the north wall with the turret above it; a stockroom door into the stair core (NW, x 498..502,
    z 379..383), which runs from the basement to the roof hut.
  - Basement: the setter's workshop, reached only by the stair core.
  - Upper floor:
    - the **obstacle hall** (x 498..516): a course deck at y 74 over a pit at y 72..73, with steps up at both ends;
    - the **Showcase** (x 517..526, z 386..401): three glass columns;
    - the **Manager's office** (x 517..526, z 379..385): the wall safe, with the vent ladder coming down from the
      skylight.
- **The case:** a 2-cell counter of smooth quartz at y 65. These are the loot cells; the pieces lie on top. Air at
  y 66..67, then a permanent glass lid at y 68, with permanent glass on the sides and back. The gate is the
  **front**: 2 glass blocks wide by 2 high (y 66..67, 4 blocks), facing the aisle. Smash the front and reach in over
  the counter. Use full glass blocks, so that turning to air without block updates leaves no stray pane arms. The
  Showcase columns and the Museum's cases use the same pattern at 1 or 3 cells wide.

### 2.3 The robbery, beat by beat
**Approaches:**
1. **Front (the rush).**
   - Forecourt, then the corner door, then the showroom. The fullest cases show through the glass.
   - Smash a case front (1.5 s; the first smash starts the 6:00 clock). You get its nearest piece at once, then hold
     for the rest.
   - The turret over the counter sweeps the case rows; sneaking halves its reach to 6, so the far cases are safe to a
     sneaker.
   - Low lasers cross both aisles (Jailbreak's floor lasers, so jump them), and plates sit in front of the two middle
     cases.
   - Then the stockroom into the stair core.
2. **Back (the yard).** Back Alley, the service yard, the service door, then straight into the stair core. This skips
   the turret and the showroom. Go down first (bench and tray), then up.
3. **Roof (the smart way).**
   - Climb the fire escape from the side lane to the roof and smash the vent hut's skylight (gate 10).
   - Climb down the ladder shaft (a blinking laser across it) into the Manager's office, next to the safe and the
     Showcase, without crossing the obstacle hall.

**Inside:**
- **Basement:** a 3-laser corridor at the foot of the stairs (jump, duck, time the blink), then a collapsing strip in
  front of the setter's bench. The bench has unset stones and the gold scrap tray.
- **Upstairs by the stairs:** the obstacle hall (Jailbreak's obby): two sets of collapsing tiles on the raised deck and
  two blinking mid lasers. Then the Showcase, then the office door, which has a high laser you duck under.
- **The Centerpiece:** three glass columns in the Showcase, each a 1-cell plinth. With M1, one of them holds the
  Centerpiece; without M1, the middle one does. Each column's front is a smash gate with `alarm=true`. Smashing it
  trips the alarm if the store is advanced.
- **The safe:** the manager's wall safe. A 2x2 iron-block door covers a 2-cell niche (cells at y 72, air y 73..74).
  It needs a Safe Kit (Mara's chapter 1 reward), and every robber gets their own code.

**Gates** (numbered as `/dloot dump` prints them, gates first):

| # | Kind | What, where | Blocks | Settings |
|---|------|-------------|--------|----------|
| 1-6 | smash | Case fronts, showroom (2 rows of 3) | 2x2x1 glass (4) | take 1.5 |
| 7-9 | smash | Showcase column fronts, upstairs | 1x2x1 glass (2) | take 1.5, **alarm=true** |
| 10 | smash | Vent hut skylight, roof (an entry, nothing behind it) | 2x1x2 glass (4) | take 1.5 |
| 11 | safe | Manager's wall safe, office | 2x2x1 iron block (4) | digits 4, claim 6 |

**Piles:**

| # | Name | Style | Cells | Value | Behind |
|---|------|-------|-------|-------|--------|
| 12-17 | Case 1-6 | jewel ($250 / 1.0 s) | 2, per-cell 4 (cap 8) | 1,000-2,000 each | 1-6 |
| 18 | Unset stones (basement bench) | jewel | 2, per-cell 4 (cap 8) | 1,000-2,000 | - |
| 19 | Gold scrap tray (basement) | gold ($500 / 1.5 s) | 2, per-cell 2, layers 2 (cap 8) | 1,000-2,500 | - |
| 20-22 | Centerpiece (M1 group `crown`, pick 1) | art, piece=1500 take=3.0 | 1, per-cell 2 (cap 2) | 1,500-3,000 | 7, 8, 9 |
| 23 | Safe drawer | gold | 2, per-cell 2, layers 2 (cap 8) | 2,000-4,000 | 11 |

That's 23 spots. Without M1, build only pile 21 and gate 8; columns 7 and 9 become plain glass décor, which leaves
19 spots.

**Traps** (d2, m = 1.25; 16 of 40; `damage=2` keeps every hit at 2.5 hearts for level-5 robbers):

| # | Kind | Where | Settings | Hit |
|---|------|-------|----------|-----|
| T1 | camera turret | Over the counter, aimed down the case rows | effect=damage damage=0.5 every=1 sweep=90 period=8 | 0.5 heart a second after 1 s in view |
| T2-T3 | laser low 0.4 | Across both aisles | damage=2 | 2.5 hearts, jump it |
| T4-T5 | plate | In front of the two middle cases | damage=2 | 2.5 hearts |
| T6 | laser low 0.4 | Basement stair corridor | damage=2 | jump |
| T7 | laser high 1.65 | Same corridor | damage=2 | duck |
| T8 | laser mid 1.0 | Same corridor | blink on=2 off=2 offset=1, damage=2 | time it |
| T9 | floor | 1x6 strip in front of the bench (floor y 58) | depth=3 delay=0.5 restore=10 damage=2 | back to the rim |
| T10-T11 | floor | Obstacle deck (y 74), two checker sets of up to 24 tiles | depth=3 restore=10 damage=2 | |
| T12-T13 | laser mid 1.0 | Across the obstacle deck | blink on=2 off=2, offsets 0 and 2, damage=2 | |
| T14 | camera turret | Over the Showcase | as T1 | |
| T15 | laser mid 1.0 | Across the vent ladder shaft | blink on=2 off=2, damage=2 | climb in the gap |
| T16 | laser high 1.65 | The office door, from the Showcase side | damage=2 | duck |

**The alarm** (only from the Centerpiece columns; there are no alarm cameras):
- `advanced true` is a PROPOSAL. With it, d2 gets its own gentle numbers (also a PROPOSAL; the same keys the stores
  use):
  - `difficulty::2::alarm::warning` 40 s (the window);
  - `max-cops` 3, `cops-per-extra-robber` 1, `per-wave` 1;
  - `pool` 3, `pool-step` 1, `pool-per-robber` 1;
  - `assault-time` 30, `assault-step` 10, `assault-max` 60;
  - `chase-radius` 80, `heavy-from` 99.
- The cops are d2's: 20 HP and the Old Revolver.
- **Lockdown** (iron bars, one box per glass run between the frame piers): the showroom's south glass, the showroom's
  east glass, the corner door's two openings, and the upper ribbon window.
- The service door and the roof never lock.
- **Cop spots:**
  - Vault Street corner, `(530, 65, 413)`;
  - alley mouth on Vault Street, `(530, 65, 364)`.
  - Both are east of the building. The cops come in through the service door (an open doorway). The side lane
    (west) stays cold.

**Way out:**
- Quiet run: the corner door.
- After the alarm: the roof (stair hut, then the fire escape down into the side lane), or the service door if you beat
  the cops to it.
- Two bikes wait in the side lane: `/dbike spotat jailbreak 491 65 396 0` and `491 65 392 0` (facing south).
- Ride west on the highway and south down the N-S road. You are out of the 160-block bike radius (80 x 2) at about
  z 540, roughly 170 blocks or 14 s.

**Settings:**
- `/dheist create jewelry 2`, `set jewelry name Jewelry Store`.
- Escape 6:00, cooldown 10:00, pool $24,000, level 5 (all difficulty-2 defaults); `advanced true` (PROPOSAL; the
  fallback is `false`), police true.
- `/dheist exit jewelry` at **(511.5, 65, 410.5)**, on the forecourt 9 blocks out.
- Hologram over the corner door.

### 2.4 Replayability
**With what exists now:**
- Each case rolls 4-8 pieces, so the fullest cases move every run, and you can see them through the glass from the
  forecourt. That's GTA's scoping, done by eye.
- Three approaches, each skipping a different set of traps.
- Everyone gets their own safe code.
- Whoever smashes first sets the clock for everyone. Whoever goes for the Centerpiece decides whether the cops come,
  for everyone inside. That's the shared-race version of GTA's "the alarm's tripped, move".
- The fastest robbers take the best cases.

**M1** (group `crown`, pick 1 of 3): the Centerpiece moves between the three columns. Only the live column's gate shows
a white marker. A dark one is still wired, so smashing it costs 1.5 s and trips the alarm for nothing. That stands in
for Jailbreak's randomised obby floors (traps can't be randomised with what exists).

**Contact-job bonuses that fit** (existing ★s): Quiet Hands (leave the Centerpiece alone), Ghost, In and Out, and
Wheelman (the bikes).

### 2.5 Balance check
- **r ($ a second):** cases 250, bench 250, tray 333, Centerpiece 500, safe drawer 333.
- **Holding everything at the maximum:** 12,000/250 + 2,000/250 + 2,500/333 + 3,000/500 + 4,000/333 = 48 + 8 + 7.5 +
  6 + 12 = **81.5 s**.
- **Gates:** 7 smashes x 1.5 = 10.5 s, plus about 45 s for the safe (4-6 guesses).
- **Walking and traps:** about 120 s.
- **One robber's full clear:** T ~ 257 s ~ **4:17 against E = 6:00**. A robber who knows the route empties it alone
  with a minute and a half to spare, and the cleaned-out rule then halves the time left.
- **Bags (t = C / r at jewel speed):**

  | Bag | Capacity | Fill time | When |
  |---|---|---|---|
  | Gym | $2K | 8 s | |
  | Duffel | $6K | 24 s | level 5 |
  | Hockey | $15K | 60 s | level 10 |

  A level-5 robber fills a Duffel from about three cases, so the $24K pool feeds 3-4 robbers. That's the race.
- **Pool:**
  - the ranges add up to $11,500-$23,500, against the d2 default of $24,000;
  - pieces: at most 48 + 8 + 5 + 6 + 8 = 75 of 150.
- **Seasons:** "full" for d2 is $3,000, which one Duffel trip clears.
- **Story:**
  - Mara c1 "rob a heist", and c2 "crack a safe" (the manager's safe at level 5, with the Safe Kit she gave).
  - c3's "3 different heists" counts it.
  - Vic's v2 counts its sales (d2+).
  - With `advanced true` it also offers an easy c4 getaway (level 45), which is fine: the missions only guide.

---------------------------------------------------------------------------------------------------------------------

## 3. The Bank (`bank`, difficulty 3, level 20)

### 3.1 Theme and hook
This is Jailbreak's green-glass bank tower, with the vertical BANK brick pylon and the helipad. Inside: a laser course
to the octagonal X-pattern vault door with its star handwheel, and the alternate blast-door exit that leads out to a
hatch.

From GTA it borrows Pacific Standard's **ladder of security**:
1. the lobby tills;
2. the keypad door to the deposit room;
3. the laser hall;
4. the vault door you drill;
5. the inner cage, Fleeca's "Box 167".

From Payday, **loud against quiet**: the lobby cameras, the tellers' panic pedals and the blue alarm lasers call the
cops, but a careful robber can reach the vault unseen. The drill is always loud: mounting it trips the alarm. So the
vault is a hold-out:
- the drill runs 60 s;
- two jams are fixed under turret fire;
- the cops come down from the lobby and the garage.

The GTA ending is the storm drain. The blast door opens only from inside, and leads to an 80-block tunnel that comes
up in the Run-off, where two bikes wait.

It's fun because it's the first heist where the cops come into the building, and where the crew decides how loud it
gets before the drill makes it loud anyway. The best way out is the one farthest from the cops.

Set pieces:
- the octagon door with the drill on it ("DRILL 47%");
- **VAULT OPEN**: the 5x5 door vanishes and light from the froglight-lit vault floods the dim antechamber;
- the gold racks and cash trolleys;
- the blast door's hiss (an iron door, button inside) and the run down the tunnel to the grate;
- the bikes in the drain.

**Decision: the Bank is advanced** (a PROPOSAL; the d3 default is false), with gentler d3 alarm numbers (below). The
cautious fallback is `advanced false`. Then:
- the alarm cameras, lasers and pedals go inert (nothing to remove);
- the drill turns silent;
- the tunnel stays;
- c4_getaway and Vic's v5 still have the Museum.

### 3.2 Footprint and look
- **Building:** 40 x 32, at x 556..595, z 370..401.

  | Level | Floor | Room | What's there |
  |---|---|---|---|
  | B2 (vault level) | y 50 | y 51..55 | the antechamber at the south (z 392..400); the vault at the north (z 380..390), behind the door in the antechamber's north wall (x 573..577, z 391) |
  | B1 | y 57 | y 58..62 | the garage (NE); the hub corridor; the deposit room (W); the fuse room; the Laser Hall (running south, to the stairs down into the antechamber) |
  | Lobby | y 64 | y 65..73 | the teller counter along the north; behind it, the staff stairs down to B1; the mezzanine (manager's office) at y 69 along the back |
  | Floors 2-5 | | y 74..95 | a sealed office façade; only the stair core (NW) is open |
  | Roof | y 96 | | the pylon rises to y 100 |

- **Region** `heist_bank`: x 555..596, z 369..402, y 49..100 = 42 x 34 x 52 = **74,256** blocks.
- **Outside:**
  - green stained-glass panes in a white smooth-quartz grid;
  - the brick pylon on the SW corner (x 556..559, z 398..401) carrying "BANK" vertically in the tall font;
  - four lobby columns;
  - a polished-andesite plaza (z 402..415, x 546..605) with planters.
- **Entrances:**
  - the **lobby**: an open vestibule with no door blocks (x 573..578, z 401);
  - the **garage ramp** from the Back Alley: an open doorway in the north wall (x 586..594, z 370) with a raised
    roll-up shutter as décor; slab steps lead down to B1 inside the NE corner;
  - the **roof**: a maintenance ladder on the pylon's west face (x 555, z 399..400), from the street to the roof
    bulkhead (an open doorway into the stair core).
  - The **blast door** is an exit only: a double iron door in the antechamber's south wall (x 574..575, z 401,
    y 51..52), with stone buttons on the inside only.
- **Windows:** two lobby glass runs either side of the vestibule, the lobby's east side glass, and the sealed tower.
- **Roof:** smooth quartz, a polished-deepslate helipad ring, and the bulkhead.
- **The tunnel:**
  - it starts at the blast door and runs level at y 51..53, 3 wide (x 573..575), under the plaza, the sidewalks and
    the highway;
  - from z 441 to z 450 it climbs a stair to the Run-off's floor;
  - it opens through an open grate in the Run-off's north wall (x 573..575, z 450);
  - everything from z 403 on is outside the region, so walking it is leaving the heist.

### 3.3 The robbery, beat by beat
**Approaches:**
1. **Front (loud by default).**
   - Plaza, then the lobby. Cam A (over the doors, looking north) sweeps the floor. Cam B (high on the back wall over
     the tills, fixed, looking south) watches the lobby floor in front of the counter.
   - **The quiet line:** sneak along the east wall while Cam A pans away, and round the counter's east end. Cam B looks
     over your head, so behind the counter you are out of its cone.
   - The four tills are reached from behind the counter. Two panic pedals (alarm plates) sit behind tills 2 and 3:
     step around them.
   - The staff stairs behind the counter go down to the B1 hub. This is an open doorway, so it is a cop route too.
2. **Garage (back, quieter).**
   - Back Alley, the ramp, then the B1 garage: one sweeping alarm camera (cross it while it looks away) and two damage
     plates.
   - A corridor leads to the hub. No keypad: this is the quick way to the vault, and the alley cops' way in.
3. **Roof (stealth, slow).**
   - The pylon ladder to the roof, the bulkhead, then five landings down. Each landing has a blinking laser.
   - A sweeping alarm camera watches the mezzanine corridor: time the pan.
   - The mezzanine has the manager's desk (cash). The mezzanine stairs come down behind the teller counter, behind
     both lobby cameras' cones.

**B1:**
- **The deposit room:** a keypad door (gate 1, a safe gate). Behind it are two tables of pulled-out deposit drawers
  and an alarm camera in group `hall`.
- **The fuse room** (M2): an open room off the hub. Cutting the breaker switches group `hall` off for 45 s, quietly.
- **The Laser Hall** (Jailbreak's laser course): six damage lasers and two light-blue **alarm** lasers at its
  doorways, all in group `hall`, plus a collapsing strip (with no B2 room under it). Stairs at its south end go down
  to the antechamber.

**B2, the reveal:**
- The antechamber is dim: lanterns, and the yellow pointers of two turrets that cover the stair mouth and the door.
- Mounting the Drill on the 5x5 octagon door **trips the alarm**. It drills for 60 s and jams twice, so whoever fixes a
  jam does it under fire.
- With the PROPOSAL numbers, the first cops spawn 30 s after the mount. They walk in through the vestibule and the
  garage (both open) and reach B2 around the time the vault opens.
- **VAULT OPEN:**
  - the door turns to air, and the froglight-lit vault lights the antechamber;
  - the last jam fixer gets a 10 s head start;
  - inside are four bays (with M1, two of them are live each run) and, at the back, the **inner cage** with Box 167
    (gate 3, a keypad).

**Gates:**

| # | Kind | What, where | Blocks | Settings |
|---|------|-------------|--------|----------|
| 1 | safe | Deposit room door (the keypad door), B1 | 2x3x1 iron block (6) | digits 4, claim 6 |
| 2 | drill | Vault door, B2: an octagon with an X and a star wheel drawn in iron blocks, polished deepslate and chiseled tuff | 5x5x1 (25) | time=60 jams=2 claim=10 (the alarm on mount is the default) |
| 3 | safe | Inner cage door, at the back of the vault | 3x3x1 iron bars (9) | digits 4, claim 6 |

**Piles:**

| # | Name | Style | Cells | Value | Behind |
|---|------|-------|-------|-------|--------|
| 4-7 | Teller till 1-4 | register, piece=500 take=2.0 | 1 (cap 12) | 1,000-2,500 each | - |
| 8 | Manager's desk (mezzanine) | cash, piece=250 take=1.0 | 1, per-cell 4, layers 2 (cap 8) | 500-1,000 | - |
| 9-10 | Deposit drawers A, B | goods, piece=500 take=1.8 | 6, per-cell 2 (cap 12) | 3,000-6,000 each | 1 |
| 11-12 | Gold racks (M1 group `vault`) | gold, piece=1000 take=2.0 | 5, per-cell 2, layers 2 (cap 20) | 12,000-20,000 each | 2 |
| 13-14 | Cash trolleys (M1 group `vault`) | cash, piece=1000 take=1.6 | 4, per-cell 2, layers 2 (cap 16) | 10,000-16,000 each | 2 |
| 15 | Box 167 (bearer bonds) | art, piece=2000 take=3.0 | 2, per-cell 2, layers 2 (cap 8) | 8,000-16,000 | 3 |
| 16 | Breaker (M2) | fuse traps=hall hold=3 off=45 rearm=90 alarm=false | the breaker panel (3 blocks) | | |

- `/dloot pick bank vault 2` (M1).
- The racks are iron-block shelves; the trolleys are smooth-stone slabs on iron-trapdoor frames (the bottom-slab lift
  is automatic).
- The tills use the register style, so they draw as real tills. A heist's register is never "shut": that only happens
  in a store with a clerk.
- That's 16 spots. Without M1, build one rack and one trolley (14 spots). Without M2, skip the breaker; the hall stays
  on.

**Traps** (d3, m = 1.5; 23 of 40):

| # | Kind | Where | Settings | Effect |
|---|------|-------|----------|--------|
| T1 | camera, alarm | Cam A, over the doors, looking north | sweep=60 period=8 range=12 | alarm |
| T2 | camera, alarm | Cam B, high on the back wall over the tills, looking south | fixed, range=12 | alarm |
| T3-T4 | plate, effect=alarm | Panic pedals behind tills 2 and 3 | | alarm |
| T5 | camera, alarm | The mezzanine corridor, from its far end | sweep=60 period=8 | alarm |
| T6-T8 | laser mid 1.0 | Stair core landings 2-4 | blink on=2 off=2, offsets 0/1/2 | 4.5 hearts |
| T9 | camera, alarm | B1 garage | sweep=90 period=8 | alarm |
| T10-T11 | plate | B1 garage floor | damage=2 | 3 hearts |
| T12 | camera, alarm | Deposit room corner, `group=hall` (M2) | | alarm |
| T13 | laser low 0.4 | Laser Hall, group hall | | 4.5 hearts, jump |
| T14 | laser high 1.65 | Laser Hall, group hall | | duck |
| T15 | laser mid 1.0 | Laser Hall, group hall | blink on=2 off=2 | time it |
| T16 | laser, diagonal | Laser Hall, floor to ceiling across a corner, group hall | | go round |
| T17 | laser low 0.4 | Laser Hall, group hall | blink on=2 off=2 offset=2 | |
| T18 | laser high 1.65 | Laser Hall, group hall | blink on=3 off=1 | |
| T19-T20 | laser mid 1.0, effect=alarm (light blue) | The Laser Hall's two doorways, group hall | | jump it (1.0 < 1.27) |
| T21 | floor | Mid-hall strip of 8 tiles (floor y 57, pit y 55..56 in solid stone) | depth=3 restore=10 damage=2 | 3 hearts |
| T22-T23 | camera turret | B2 antechamber, covering the stair mouth and the door | damage=1 every=1 sweep=60 | 1.5 hearts a second |

**The alarm:**
- Triggers: Cam A, Cam B, the mezzanine camera, the garage camera, the deposit camera, the two pedals, the two blue
  lasers, and **the drill** (always).
- d3 numbers (PROPOSAL; the Bank is the city's only d3 heist):
  - `difficulty::3::alarm::warning` 30 s;
  - `max-cops` 4, `per-wave` 1;
  - `pool` 4, `pool-step` 2;
  - `assault-time` 40;
  - `heavy-from` 4.
  - Everything else (chase radius 100) stays global.
  - d3 cops: 26 HP, the Combat Rifle, 3 damage a shot.

**Lockdown** (iron bars):
- the west lobby glass (x 557..572, y 65..72, z 401);
- the east lobby glass (x 579..594, y 65..72, z 401);
- the lobby's east side glass (x 595, z 379..400, y 65..72), split at the piers.

The vestibule and the garage stay open; they're the cops' way in. The roof and the blast door stay too, so no way out
is ever sealed.

**Cop spots** (`/dcops bank add`):
- plaza SW `(550, 65, 412)`;
- plaza SE `(601, 65, 412)`;
- alley E `(606, 65, 364)`.

Their paths: about 75-90 blocks to the antechamber, inside Citizens' 100. Check with bots that a cop walks from each
spot to B2. If one doesn't, move that spot closer, for example to the alley right at the ramp.

**Way out** (choose under fire):
1. **Front** (hot): straight into the plaza cops.
2. **Garage** (hot): into the alley cops.
3. **Roof** (warm): up five landings of lasers, then down the pylon ladder to Vault Street's side.
4. **Blast door** (cold):
   - The button opens the iron door, and the cops can't follow (no NPC opens a door). Then 80 blocks of tunnel to the
     grate.
   - Bikes: `/dbike spotat jailbreak 571 61 455 90` and `578 61 455 90`, facing west.
   - On foot you are out of range about 30 blocks west of the grate (100). On a bike you must pass 200: up the west
     ramp, west on the highway and down the N-S road to about z 560, roughly 250 blocks or 20 s.

**Settings:**
- `/dheist exit bank` at **(575.5, 65, 410.5)**, 9 blocks out on the plaza. A robber thrown out at 0:00 lands in front
  of the cops.
- Hologram over the vestibule.
- Escape 8:00, cooldown 15:00, pool $80,000, level 20 (defaults); **advanced true** (PROPOSAL), police true.

### 3.4 Replayability
**With what exists now:**
- **Quiet or loud:** the run is quiet until someone trips a camera, a pedal or a blue laser, or mounts the drill.
  Whoever trips it decides when the assaults start for everyone.
- **Three ways in, four ways out**, each with its own risk.
- **Who holds the drill:** every jam is a timing minigame under the turrets, and the last fixer gets the vault's head
  start (and the story's "vault").
- Every robber gets their own keypad codes; the assaults grow; each pile rolls a new value.
- The cops really come in (open routes), so which corridor the robbers hold changes with where they entered.

**M1** (2 of 4 bays): the vault holds two gold racks (rich and slow: r 500), two cash trolleys (lighter and faster:
r 625), or one of each. That's Jailbreak's random vault floors and GTA's "the vault contents vary".

**M2:** the breaker opens a 45 s quiet window through the Laser Hall and the deposit camera. Since it rearms 90 s after
the power returns, it rewards a crew that splits up: one holds the breaker, the others run.

**Contact-job bonuses that fit** (existing ★s): Code Breaker (the keypads), Wheelman (the bikes), In and Out. Quiet
Hands is only possible on a run that skips the drill (deposit room and tills only), which is a real choice.

### 3.5 Balance check
- **r ($ a second):** tills 250, desk 250, deposit 278, gold 500, cash 625, Box 167 667.
- **Holding at the maximum** (worst case: two gold racks): 10,000/250 + 1,000/250 + 12,000/278 + 40,000/500 +
  16,000/667 = 40 + 4 + 43 + 80 + 24 = **191 s**.
- **Gates:** deposit keypad ~45 s, drill 60 + 2 jams x ~4 = 68 s, cage ~45 s, breaker 3 s: about **161 s**.
- **Walking and traps:** about 120 s.
- **One robber's full clear:** T ~ 472 s ~ **7:52, just inside E = 8:00**. A solo barely empties it, so it's a heist
  for 2-3 robbers; the cleaned-out rule then halves the time left.
- **A typical loud solo run:**
  1. garage to the vault door: ~50 s;
  2. the drill: 68 s; the alarm starts at the mount, and the first cops reach B2 near the reveal;
  3. fill a Hockey bag ($15K) on a gold rack (30 s), or an Armored Duffel ($40K, level 25: 80 s on gold, 64 s on cash);
  4. out by the blast door and the tunnel: ~25 s.

  That's about **3:00-4:00**, well inside 8:00.
- **Pool:**
  - the ranges add up to $38,500-$79,000 (two live bays), against the d3 default of $80,000;
  - pieces: at most 20 + 4 + 24 + 72 + 8 = 128 of 150, counting all four bays (the validator counts every pile).
- **Seasons:** "full" for d3 is $7,500, which one Hockey trip clears.
- **Story:**
  - Mara c3 "drill a vault" at level 20 (the vest from the same chapter matters against d3 cops) and "rob 3 different
    heists" (Jewelry, Bank and a store).
  - c4 "get away with loot" (advanced: the tunnel).
  - Vic's v4 "crack a safe in d3+" (the deposit door or the cage) and v5 "drill and lose the cops in one run" (the drill
    and the tunnel).
  - Mara's contact jobs (haul, safe, vault, getaway) can name it.

---------------------------------------------------------------------------------------------------------------------

## 4. The Museum (`museum`, difficulty 4, advanced, level 45): the finale

### 4.1 Theme and hook
This is Jailbreak's sandstone museum on a hill with one road:
- four columns under a Triceratops pediment;
- the T-Rex hall with sweeping spotlights;
- a roof entry;
- the blue-jewel room and the Pharaoh room;
- the upstairs gallery of parody paintings;
- greed that trips the alarm.

From GTA's Kortz Center job (an art museum, the closest match):
- four ways in: the front, the loading dock, the sewer manhole, and the dome skylight down a scaffold;
- laser grids a power panel switches off;
- a primary target in a wired case.

From Cayo Perico:
- one primary worth half a big bag, plus secondaries all over;
- the escape through a drainage tunnel.

From Payday's The Diamond: the cash office and the curator's strongroom, and a vault you drill under fire.

The finale is Mara's chapter 5 in one run:
1. crack a safe (the Cash Office door is right by the Archive);
2. drill the **Archive** vault, which trips the alarm;
3. make the **Culvert Run**.

The lockdown bars the front doors the moment the alarm trips, so "walk out the front" is never the getaway:
- the dock is where the yard cops come in;
- the roof leads down to the Hill Road cops;
- the cold way is down the boiler-room manhole to the bikes in the culvert, south under the highway, and west along the
  Run-off.

It's fun because the Crown moves, the route follows it, and the run ends in the chase you planned on the way in.

Set pieces:
- breaking the dome's oculus at night and climbing down the scaffold into the T-Rex hall, above the spotlight cones;
- the Crown alarm;
- the sun-disc vault door and **VAULT OPEN** under fire;
- the iron bars slamming over the front;
- the bikes waiting in the dark culvert;
- coming out into the Run-off with the Museum's lights behind you.

### 4.2 Footprint and look
- **Museum Hill:** a built terrace at y 72 (top block; you stand at y 73), x 788..874, z 352..405, with smooth-sandstone
  retaining walls.
  - The grand stairs (x 822..839, z 406..415) come down to the highway sidewalk.
  - The plaza in front of the portico is z 396..405.
  - The **service yard** is at ground level (y 64) north of the terrace (x 790..874, z 333..350).
- **Roads:**
  - **Hill Road**, the only road up: from the highway at x 878..884, north up the terrace's east flank to the bend
    (z 390..396, y 72), then west onto the plaza.
  - The **service lane** stays low: from the highway at x 886..890 north to z 338, then west into the yard through the
    service gate (x 870..874).
- **Building:** 58 x 44, at x 802..859, z 352..395, on a cross plan.

  | Level | Floor | Room | What's there |
  |---|---|---|---|
  | Basement | y 64 | y 65..71 | at ground level on the north side, where the dock opens straight onto the yard; under the east wing it is solid (the Gold Room's pits) |
  | Ground floor | y 72 | y 73..81 | the Great Hall in the middle (x 820..841) rises to the dome; the Gem Room (west wing, x 802..819); the Gold Room (east wing, x 842..859) |
  | Upper floor | y 82 | y 83..89 | the Gallery (west), the Curator's office and strongroom (NE), a balcony ring round the hall at y 82 |
  | Roof | y 90 | | the dome: a stepped calcite drum to y 93, with a 3x3 glass oculus in its top (gate 2); you stand on the drum's rim at y 94 |

- **Region** `heist_museum`: x 801..860, z 351..396, y 62..95 = 60 x 46 x 34 = **93,840** blocks (under 100,000).
- **Outside:**
  - smooth and cut sandstone;
  - four quartz-pillar columns under a pediment with a Triceratops relief (bone blocks and chiseled sandstone);
  - bronze doors (waxed copper frame, an open doorway);
  - tall arched windows in each wing;
  - the calcite dome.
- **Renovation scaffolding** (scaffolding blocks and spruce poles) climbs the east wing's wall (x 860) from the terrace
  to the roof. It's GTA's roof approach, and it works.
- **Entrances:**
  1. the **front doors**: south, x 828..833, an open doorway;
  2. the **loading dock**: north wall, x 834..838, y 65..68. An open doorway onto the yard, under a raised roll-up
     shutter used as décor;
  3. the **sewer manhole**: in the basement boiler room (NW, x 803..810, z 353..360), an open shaft with a ladder;
  4. the **dome oculus**, from the roof.
- **Basement plan:**
  - the service corridor runs east-west (z 360..363) from the boiler room to the dock;
  - the Cash Office opens off it (x 812..820, z 364..370), through a keypad door in its north wall;
  - the main stairs from the Great Hall come down into it (x 822..825);
  - the **Archive corridor** runs south from it (x 829..832, z 364..372) to the **antechamber** (z 373..380). The vault
    door is in the antechamber's south wall (x 828..832, z 381, y 65..69), and the **Archive** is behind it
    (z 382..392).
  - The cops' route (dock, then east of the Archive corridor's mouth) and the robbers' cold route (west to the boiler
    room) split at that mouth.
- **The back exit, the culvert:**
  - The manhole shaft drops from the boiler-room floor to y 57, below the region.
  - A passage (y 58..60, 2 wide) runs west to the **culvert chamber** (x 780..786, z 352..360, floor y 57, outside
    the region), where the bikes stand.
  - A 5-wide culvert (x 781..785) runs south from z 361 along the hill's west foot and under the highway. It is
    4 high, and 3 high under the road so the road's dirt stays. Its floor rises to y 60 and it opens into the Run-off
    through an open grate at z 450.

### 4.3 The robbery, beat by beat
**Approach** (one of four):
1. **Front (hot).**
   - Plaza, then the Great Hall.
   - Three spotlight cameras on the balcony sweep the T-Rex floor with periods of 6, 8 and 10 s, so they drift in and
     out of step.
   - Plates ring the skeleton's platform.
   - Anyone the lights catch trips the alarm before the drill is even mounted.
2. **Loading dock (warm).**
   - The yard, then the open dock: a sweeping alarm camera (cross while it looks away).
   - Then the service corridor (a low and a high laser). From there it is a short way to the Cash Office and the
     Archive.
   - The fastest finale route, and the one the cops will use.
3. **Sewer (cold).**
   - Down the Run-off to the culvert mouth (x 783), and walk 95 blocks up the culvert to the chamber.
   - The passage, then the shaft ladder up through the open manhole into the boiler room. There is no gate, and it is
     the same way you will leave.
4. **Skylight (stealth).**
   - Climb the east scaffolding, cross the roof crouching, and smash the oculus (gate 2, 9 glass blocks).
   - Climb down the inner scaffold tower under it to the balcony at y 82.
   - The spotlights point down at the hall floor, and the Gallery's two cameras watch the stair heads, not the tower.

**Inside:**
- **The Cash Office** (basement):
  - A keypad door (gate 1); the finale's quickest safe, 15 blocks from the Archive.
  - Inside: the ticket-office takings on the counter, and the **breaker** (M2) on the wall beside the door.
  - The camera over the door looks at the counter, so the breaker is out of its view. Cutting the power also blinds
    that camera (it is in group `grid`).
- **The Gem Room** (west): an alarm laser at the doorway (jump), a six-laser grid (group `grid`), and two display
  tables with smash fronts (Jailbreak's blue jewel room).
- **The Gold Room** (east, Jailbreak's Pharaoh room):
  - a checkerboard of collapsing tiles (pits y 70..71), two static lasers and a sweeping turret;
  - two open gold pedestals, "Sun Idols" and "Pharaoh's Gold", with no glass: the fastest open money, under the
    turret.
- **The Gallery** (upstairs west): three tables of crated paintings, the grid (group `grid`) and two alarm cameras at
  the stair heads.
- **The Curator's strongroom** (upstairs NE):
  - behind a high alarm laser at the Gallery's east doorway (duck under it);
  - one alarm camera and two plates;
  - a **5-digit** keypad door (gate 8) into the strongroom with the private collection.
- **The Sun Crown** (the primary; M1 group `primary`, 1 of 3 plinths):
  - one plinth in the Gallery, one in the Gem Room, one in the Gold Room;
  - each is a 1-cell plinth in a glass case whose front is an **alarmed** smash gate;
  - each sits inside its room's traps, so the run's route follows the Crown;
  - the live case shows a white marker you can spot through the arched windows from the plaza (GTA's scoping, done by
    eye).
- **The Archive** (basement): the reveal and the hold-out.
  - The corridor of collapsing tiles, then the antechamber. Two turrets sweep it.
  - The 5x5 sun-disc door (chiseled sandstone, gold blocks, polished deepslate). Mounting the Drill **trips the
    alarm**.
  - It drills for 90 s and jams 3 times.
  - The first cops spawn 20 s after the mount. The yard cops come in through the open dock, and the others path round
    to it, because the front is barred. They reach the antechamber during the drilling, so the jams get fixed under
    fire.
  - **VAULT OPEN:** the disc turns to air and the gold-lit relic shelves and crown jewels show. The last jam fixer gets
    a 10 s head start.

**The getaway** (the finale's real choice):

| Route | How | Heat |
|---|---|---|
| **Front** | | barred by the lockdown |
| **Loading dock** | | that's where the service-gate cops come in |
| **Roof** | back up to the balcony, the scaffold, the oculus, then down the east scaffolding | lands next to the Hill Road bend's cops |
| **The Culvert Run** | west along the service corridor (away from the dock), down the manhole, the passage, a bike in the chamber | cold |

**The Culvert Run, step by step:**
1. Hotwire a bike: 3 good hits. Miss 3 times and that bike locks for 15 s, so take the next.
2. Ride 95 blocks down the culvert and under the highway, then turn west in the Run-off.
3. Get out of range:
   - The Museum's centre is about (830.5, 78.5, 373.5). On a bike the radius is 200, so you are clear at about x 640
     in the Run-off: roughly 240 blocks from the chamber, or 20 s at the bike's 12.4 blocks a second.
   - On foot you'd be clear (at 100) just past the culvert mouth.
4. The "getaway" counts with that run's loot, because the first wave has long come by then.
5. Ride on to the Safehouse in town and sell.

**Gates:**

| # | Kind | What, where | Blocks | Settings |
|---|------|-------------|--------|----------|
| 1 | safe | Cash Office door, basement | 2x3x1 iron block (6) | digits 4, claim 6 |
| 2 | smash | Dome oculus, roof (an entry) | 3x1x3 glass (9) | take 1.5 |
| 3-4 | smash | Gem table fronts, Gem Room | 3x2x1 glass (6) each | take 1.5 |
| 5-7 | smash | Sun Crown case fronts (Gallery, Gem Room, Gold Room) | 1x2x1 glass (2) | take 1.5, **alarm=true** |
| 8 | safe | Curator's strongroom door, upstairs NE | 2x3x1 iron block (6) | **digits 5**, claim 6 |
| 9 | drill | Archive vault door, basement | 5x5x1 (25) | time=90 jams=3 claim=10 (the alarm on mount is the default) |

**Piles:**

| # | Name | Style | Cells | Value | Behind |
|---|------|-------|-------|-------|--------|
| 10-11 | Gem tables A, B | jewel, piece=1000 take=2.0 | 3, per-cell 4 (cap 12) | 6,000-10,000 each | 3, 4 |
| 12-13 | Sun Idols, Pharaoh's Gold (open pedestals) | gold, piece=2000 take=3.0 | 3, per-cell 2, layers 2 (cap 12) | 12,000-18,000 each | - |
| 14-16 | Crated paintings 1-3 (Gallery tables) | art, piece=4000 take=5.0 | 4, per-cell 1 (cap 4) | 12,000-16,000 each | - |
| 17-19 | The Sun Crown (M1 group `primary`, pick 1) | art, piece=8000 take=6.0 | 1, per-cell 4 (cap 4) | 24,000-32,000 | 5, 6, 7 |
| 20 | Private collection (strongroom shelf) | goods, piece=2000 take=2.5 | 5, per-cell 2 (cap 10) | 12,000-20,000 | 8 |
| 21 | Relic shelves (Archive) | gold, piece=3000 take=3.5 | 4, per-cell 2, layers 2 (cap 16) | 36,000-48,000 | 9 |
| 22 | Crown jewels (Archive) | jewel, piece=2500 take=2.5 | 3, per-cell 4 (cap 12) | 15,000-25,000 | 9 |
| 23 | Ticket takings (Cash Office counter) | cash, piece=500 take=1.2 | 3, per-cell 4, layers 2 (cap 24) | 6,000-10,000 | 1 |
| 24 | Breaker (M2) | fuse traps=grid hold=3 off=45 rearm=90 alarm=false | the breaker panel (3 blocks) | | |

- `/dloot pick museum primary 1` (M1).
- That's **24 spots, the cap**. Without M1, build only the Gallery plinth (gate 5 and pile 17); the other two cases
  become glass décor (20 spots). Without M2, skip the breaker; the grids stay on.

**Traps** (d4, m = 1.75; 38 of 40). Default damage: a laser 5.5 hearts; a `damage=2` plate or floor 3.5; a `damage=1`
turret 2 hearts a second.

| # | Kind | Where | Settings |
|---|------|-------|----------|
| T1-T3 | camera, alarm ("spotlights") | Balcony over the Great Hall, aimed down at the T-Rex | sweep=90, period=6 / 8 / 10, range=12 |
| T4-T7 | plate | Around the skeleton's platform | damage=2 |
| T8 | laser mid 1.0, effect=alarm | Gem Room doorway | jump it |
| T9-T14 | laser, group=grid | Gem Room grid: low 0.4, high 1.65, two diagonals, two mid blinking (offsets 0 and 2) | default damage |
| T15-T16 | floor | Gold Room checkerboard, 2 x 24 tiles (y 72, pits y 70..71) | depth=3 delay=0.5 restore=10 damage=2 |
| T17-T18 | laser | Gold Room: high 1.65 and low 0.4 | |
| T19 | camera turret | Gold Room, over the pedestals | damage=1 every=1 sweep=90 |
| T20-T21 | camera, alarm | Gallery, at both stair heads | fixed, range=12 |
| T22-T26 | laser, group=grid | Gallery grid round the tables and the plinth: 3 blinking, 2 static | |
| T27 | laser high 1.65, effect=alarm | Gallery east doorway (to the curator's) | duck under it |
| T28 | camera, alarm | Curator's office | sweep=60 period=8 |
| T29-T30 | plate | Curator's office | damage=2 |
| T31 | floor | Archive corridor, 10 tiles (y 64, pit y 63, region floor y 62) | depth=2 damage=2 |
| T32-T33 | camera turret | Archive antechamber, over the door | damage=1 every=1 sweep=60 |
| T34 | camera, alarm | Loading dock | sweep=90 period=8 |
| T35-T36 | laser | Service corridor: low 0.4 and high 1.65 | |
| T37 | laser mid 1.0 | In front of the Cash Office door | blink on=2 off=2 |
| T38 | camera, alarm, group=grid | Cash Office, over the door, looking at the counter | fixed |

**The alarm:**
- Triggers:
  - the three spotlights and the two Gallery cameras;
  - the curator's, dock and Cash Office cameras;
  - the two alarm lasers;
  - the three Crown cases;
  - **the drill** (always).
- The d4 alarm numbers stay global: 20 s warning, 2 a wave, a pool of 6 growing by 2, heavies from assault 3. d4 cops:
  32 HP, the AK-48, 4 damage a shot.

**Lockdown** (iron bars, 7 boxes):
- the front doorway (x 828..833, y 73..77, z 395);
- the Great Hall's two front window bays;
- the Gem Room's window run;
- the Gold Room's window run;
- the Gallery's windows (2 boxes).

The dock, the manhole and the oculus never lock.

**Cop spots:**
- plaza W `(812, 73, 403)`: covers the front, then paths round to the dock;
- Hill Road bend `(881, 73, 393)`: covers the scaffolding and the roof route;
- service gate `(872, 65, 341)`: the yard and the dock, about 75 blocks of path to the antechamber.

None is west of the building. The culvert chamber is about 90 blocks from the nearest spot, and underground.

**Bikes** (outside the region, facing south down the culvert):
- `/dbike spotat jailbreak 781 58 357 0`;
- `783 58 357 0`;
- `785 58 357 0`.

There are 3 bikes for a crew of up to 3 (plus refills every 120 s); the rest run. Running is fine: on foot you're out
of range just past the culvert mouth.

**Settings:**
- `/dheist exit museum` at **(830.5, 73, 403.5)**, on the plaza 8 blocks from the doors.
- Hologram on the pediment.
- Escape 10:00, cooldown 30:00, pool $240,000, level 45, advanced true, police true (all difficulty-4 defaults).

### 4.4 Replayability
**With what exists now:**
- Four entries, and which alarm (or the drill) sets off the first assault.
- Three jams to fix under the turrets while the cops come down the dock corridor.
- Per-robber codes, including the curator's 5 digits.
- Assaults that grow the longer the run lasts.
- Four ways out, one of them barred, each with its own risk.
- Every pile's roll (the relic shelves alone range from $36K to $48K).
- The day-night cycle: the spotlights' pointers and the lit Archive read best at night, and the oculus route is
  easiest then.

**M1:** the Sun Crown is in the Gallery, the Gem Room or the Gold Room. The route, the traps you must beat and the
timing of the drill all change with it. That's GTA's rotating primary target and the Kortz weekly painting. Smashing a
dark case still trips the alarm (Jailbreak's greed rule), so look for the white marker first.

**M2:** the breaker turns the Gem Room's and the Gallery's damage grids and the Cash Office camera off for 45 s. The
spotlights, the alarm lasers and the turrets stay on. Who cuts it, and when, is the crew's call each run (Kortz's
deactivation panels, Payday's circuit boxes).

**Contact-job bonuses that fit:** Wheelman (the Culvert Run), Code Breaker (the 5-digit strongroom), In and Out (2:00
left after the Archive is hard, and worth it).

### 4.5 Balance check
- **r ($ a second):** gems 500, gold pedestals 667, paintings 800, Crown 1,333, private collection 800, relic shelves
  857, crown jewels 1,000, takings 417.
- **Holding at the maximum:** 20,000/500 + 36,000/667 + 48,000/800 + 32,000/1,333 + 20,000/800 + 48,000/857 +
  25,000/1,000 + 10,000/417 = 40 + 54 + 60 + 24 + 25 + 56 + 25 + 24 = **308 s**.
- **Gates:** smashes ~6 s; the Cash Office keypad ~45 s; the strongroom's 5 digits ~60 s; the drill 90 + 3 jams x ~4
  = 102 s; the breaker 3 s. About **216 s**.
- **Walking and traps:** about 180 s.
- **One robber's full clear:** T ~ 704 s ~ **11:44, more than E = 10:00**. Nobody empties it alone; it's a crew heist,
  and the pool is far larger than any bag.
- **The finale run, solo, through the sewer** (the clock starts at the first keypad guess):
  1. Cash Office keypad: 45 s (the "safe");
  2. Archive corridor: 15 s;
  3. the drill: 102 s (the "vault"; the alarm starts at the mount, and the cops are in the corridor by the second jam);
  4. fill an Armored Duffel on the relic shelves (40,000 / 857 ~ 47 s);
  5. west to the manhole and onto a bike: ~30 s.

  That's about **4:00 on the clock**, well inside 10:00, then a 20 s ride (the "getaway"). Be the one who fixes the
  last jam, and stay inside until it opens, or the drill counts for someone else.
- **Bags:**

  | Bag | Capacity | On the relic shelves | On the Crown |
  |---|---|---|---|
  | Armored Duffel | $40K (level 25) | 47 s | 30 s |
  | Vault Bag | $100K (level 60) | 117 s | |

- **Pool:**
  - the ranges add up to $165,000-$239,000 (one Crown live), against the d4 default of $240,000;
  - pieces: at most 20 + 18 + 12 + 12 + 10 + 16 + 10 + 20 = 118 of 150, counting all three Crown plinths.
- **Seasons:** "full" for d4 is $20,000, which one Armored Duffel trip clears.
- **Story:**
  - Mara c4 "get away from the cops with loot" and c4_big "sell **$40,000** from d4 heists" (one full Armored Duffel
    from here).
  - c5 "The Big Score" (`combo|d4`): all three parts are built in, and the Cash Office keypad keeps the safe on the
    finale's path.
  - Vic's v4 (either safe) and v5 (the drill and the Culvert Run).
  - Mara's jobs (haul, safe, vault, getaway) can name the Museum.

---------------------------------------------------------------------------------------------------------------------

## 5. New mechanics (two; a third slot is left free on purpose)

### M1. Pick groups: "this run's target"
- **Why:** GTA's rotating primary target, the Kortz weekly painting, and Payday's random vault contents. It's the
  cheapest way to make a fixed build play differently every run, and only loot.sk changes.
- **Setup:**
  - a new pile key, `group=<name>` (1-12 lowercase letters), on `/dloot add` and `/dloot set`, and in `dump`;
  - per heist, `/dloot pick <h> <group> <k|all>`, saved as `{loot::<h>::pick::<group>}` and shown in `/dloot list`
    and `dump`. The default is `all` (every pile live, as today).
- **At every roll** (each opening and `/dloot roll`), for each group with a pick:
  - choose k piles at random; if the result equals the last run's set and the group is bigger than k, re-roll once;
  - the rest go **dark** for the run: lootRollPile's new 0-piece branch, so no pieces, no hitbox and no marker;
  - a dark pile is left out of "$ inside", spots left, `heistLootPool` and the cleaned-out check (it counts as empty).
- **A gate whose piles are all dark** is still a gate:
  - it can be smashed, cracked or drilled, and its `alarm=` still fires;
  - but it shows no white marker, and opening it says "Empty this time."
  - So the live one is found by looking.
- **Checks:**
  - `lootValidate`'s 150-piece sum is unchanged: it counts every pile, which is the safe side.
  - `/dloot check` uses the k smallest minimums and the k largest maximums of each group for the value range and the
    clear time.
  - `/dloot preview` shows every pile.
- **Log:** `pick <h> <group> live=<ids>` in loot.log.
- **Without it:** each group's home pile is built and the others are décor (written per heist above).

### M2. Fuse boxes: cut the power
- **Why:**
  - Kortz's deactivation panels, Payday's circuit boxes, and Jailbreak's lever rooms;
  - it trades a detour and time for a safe crossing, and rewards a crew that splits up;
  - it reuses loot.sk's hold input and traps.sk's per-trap switches.
- **Setup:**
  - a new loot kind: `/dloot add <h> fuse [x1 y1 z1 x2 y2 z2] traps=<tag> hold=3 off=45 rearm=90 alarm=false
    name=Breaker`. The box is at most 27 solid blocks and never turns to air.
  - It counts against the 24 spots. It isn't a gate (`behind=` refuses it), and it's left out of "$ inside" and the
    cleaned-out check.
  - Traps join a group with a new trap key, `/dtrap set <id> group <tag>` (default none). `/dtrap show` and `dump`
    mark it.
- **Use:**
  - Hold right-click on the box like a pile (personal progress, `hold` seconds). Cutting it starts the escape clock,
    like any task (heistStartRun).
  - On finishing, traps.sk's new `trapGroupOff(h, tag, off)` runs. With `alarm=true` in an advanced heist it also
    trips the alarm (a loud breaker).
- **While the power is off:**
  - the group's lasers hide their rods and never hit;
  - its cameras (alarm and turret) see nothing and hide their pointers;
  - its plates and floors don't fire.
  - The box's marker turns gray, and robbers inside see "POWER OFF 0:32" (hudBar priority 1).
- **Power coming back:** 5 s before, the lasers flicker (0.25 s blinks) and "POWER BACK IN 5" shows. Then everything is
  live again, including a laser someone is standing in (they were warned).
- **Rearming:** the box can be cut again `rearm` seconds after the power returns. Its marker is white when ready.
- **Resets:** the heist's end, a disable or a reset restores the power.
- **Log:** `fuse <name> <uuid> <h> <tag> off=<s>` in loot.log.
- **Without it:** the grids stay on. Every grid has a jump, duck or blink line with at least 2 blocks between beams, so
  it's always crossable.

**Why not a third:** the getaway needs no new code. Cop spots on the street side, lockdown boxes over the front, open
doorways the cops use, a robbers-only iron door, bike spots and the chase radius already make each way out hot, warm
or cold. If the owner wants a third later, the best fit is a keycard reader for the Bank (Jailbreak's keycard entry,
reusing the prison's readers) as a shortcut next to the deposit keypad.

---------------------------------------------------------------------------------------------------------------------

## 6. Summary table

| | Jewelry Store | Bank | Museum |
|---|---|---|---|
| Difficulty, level | 2, 5 | 3, 20 | 4, 45 |
| Advanced | yes, alarm only from the Centerpiece (PROPOSAL; fallback no) | yes (PROPOSAL; fallback no) | yes |
| Escape, cooldown | 6:00, 10:00 | 8:00, 15:00 | 10:00, 30:00 |
| Pool (default), loot range | $24K, $11.5-23.5K | $80K, $38.5-79K | $240K, $165-239K |
| Region (blocks) | 32x26x30 = 24,960 | 42x34x52 = 74,256 | 60x46x34 = 93,840 |
| Spots, pieces, traps | 23, 75, 16 | 16, 128, 23 | 24, 118, 38 |
| Ways in | front, back yard, roof skylight | lobby, garage, roof | front, dock, sewer, oculus |
| The reveal | the cases through the glass; the wired Centerpiece | the 5x5 octagon door, 60 s drill, VAULT OPEN | the sun-disc Archive door, 90 s drill; the Sun Crown |
| Bonus targets | Centerpiece, manager's safe | Box 167, manager's desk | Sun Crown, curator's strongroom (5 digits), takings |
| The way out | front (quiet); roof or back to the side-lane bikes (alarm) | front, garage (hot); roof (warm); blast-door tunnel to the Run-off bikes (cold) | front barred; dock and roof hot; the Culvert Run (cold) |
| Solo clear vs clock | 4:17 vs 6:00 | 7:52 vs 8:00 | 11:44 vs 10:00 (crew heist) |
| Story | c1 rob, c2 safe, c3 spread | c3 drill and spread, c4 getaway, Vic v4 and v5 | c4 getaway and $40K, c5 finale, Vic v4 and v5 |

## 7. Calls for the owner (all PROPOSALs; each heist works either way)
1. **Jewelry Store advanced** (the alarm only from the Centerpiece) with gentle d2 numbers, or not advanced (no cops at
   level 5).
2. **Bank advanced** with gentler d3 numbers, or not advanced (a silent drill; the tunnel stays).
3. **The district's name:** "Rising City" (Jailbreak's), or another.
4. **Build M1 and M2 now, or later.** The heists launch without them.
