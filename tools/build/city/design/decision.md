# City core heists: the judge's decision (2026-10-26)

Inputs: concept-faithful.md (F), concept-payday.md (P), concept-gta.md (G), research-jailbreak.md,
research-payday.md, research-gta.md, CLAUDE.md (Heists, Traps, Loot, Stores/clerks/assaults, story, bags).
Every number is a PROPOSAL for the owner. Every heist below runs at launch on today's heists.sk, loot.sk, traps.sk,
cops.sk and bikes.sk alone; the three new mechanics (section 6) are bonus layers, and each use names its fallback.

Verdict in one line per heist:
- **Jewelry Store**: F's vertical Jailbreak store (basement, 2 obby floors, low final floor, roof huts and vent), with
  P's one-Duffel stone in the top safe, P's counter turret and VIP laser curtain, and F/G's alley bikes.
- **Bank**: F's tower (keypad security gate, Classic laser bay, loud octagon vault, Box 167, alternate exit to a
  manhole), with G's register tills and fixed teller camera, P's barred viewing port and vault-of-the-day.
- **Museum**: F's Jailbreak museum on a mesa (roof drop, spotlit T-Rex hall, alarmed mask and jewel, two security
  rooms, showcase, gallery, Diamond Room, vault, drain), with P's open-hole Diamond floor and G's culvert bikes.
- **Site**: F's Bank Street + mesa layout, with a fixed storm-channel geometry and a back lane for the Bank.
- **New mechanics**: 1. Pick groups (all three concepts asked for it), 2. Security switches (levers and fuse boxes),
  3. Blast charges (Jailbreak's dynamite). All optional.

---------------------------------------------------------------------------------------------------------------------

## 1. Scores

Scale 1-5 per criterion. Fun = fun and replayability; JB = reads and plays as Jailbreak's; Mech = uses the existing
mechanics well (and correctly); Build = buildable in Minecraft within the rules and the 100k region; Bal = value,
clock and damage balance; Story = covers the story's needs (Mara c1-c5, Vic v2/v4/v5).

| Heist | Concept | Fun | JB | Mech | Build | Bal | Story | **Total /30** | Key reasons |
|---|---|---|---|---|---|---|---|---|---|
| Jewelry | F | 5 | 5 | 4 | 3 | 4 | 5 | **26** | The real Jailbreak climb (2 obby floors, roof huts, vent); 2 safes, one with no climb. Flaws: the office turret aims at the safe (a hit closes the keypad: uncrackable), 63.7k region and 6 levels to build |
| Jewelry | P | 4 | 3 | 4 | 5 | 5 | 5 | **26** | Tight 27.8k build; the $6,000 stone = exactly one Duffel is the best hook; counter turret (sneak dance) and VIP curtain are good. Only one obby floor, no final floor or 3-door roof huts: less Jailbreak |
| Jewelry | G | 4 | 3 | 3 | 4 | 3 | 4 | **21** | Three approaches are nice, but open doors replace the X cut-in, advanced at d2 puts cops on level-5 robbers and needs core.sk tuning, value $11.5-23.5K under the pool, one safe |
| Bank | F | 4 | 5 | 5 | 4 | 4 | 5 | **27** | Every Jailbreak beat (pylon, keypad gate, Classic bay, octagon vault, alternate exit, cops at the vault doorway); 2 drills + 4 safes spread story credits. Flaws: alt exit's region edge contradicts its laser corridor; cameras watch keypads; 147 pieces is tight |
| Bank | P | 4 | 3 | 3 | 3 | 4 | 5 | **22** | Quiet drill under sweeping cameras is novel but kills Jailbreak's defend-the-vault standoff; "smash" box walls of chiseled tuff break the glass-only rule; heavy reliance on N1; 36 traps, 2 storeys of offices |
| Bank | G | 5 | 4 | 4 | 3 | 3 | 5 | **24** | Three ways in, four out, blast-door tunnel to the drain: great getaway play. An 80-block tunnel under the highway plus the Run-off is big work; the iron door + button needs a WorldGuard use check; value $38.5-79K under the pool |
| Museum | F | 5 | 5 | 4 | 3 | 4 | 5 | **26** | Most complete Jailbreak museum; finale order is natural (crack the drain hatch while the vault drills, leave by the drain); 3 safes + 2 drills = 2 finale credits a run. Drain end only ~95-105 from the centre; Diamond floor resets every 10 s |
| Museum | P | 5 | 4 | 3 | 3 | 4 | 5 | **24** | The Diamond Hall with holes that stay open is the best floor idea; 155-block drain. 13 alarm cameras crowd it, the iron-bar smash grate is unproven, paintings and Egg need N1/N2 |
| Museum | G | 4 | 3 | 4 | 3 | 4 | 5 | **23** | Four entries and the Culvert Run are good, but the Sun Crown/dome/Kortz identity drifts from Jailbreak's mask, jewel and lever rooms; 24 spots and 38 traps leave no headroom |

| Site | Concept | Score /5 | Reasons |
|---|---|---|---|
| Site | F | **4** | Jailbreak's "Jewelry and Bank on one street, Museum alone on a hill east"; compact; Bank Street north and x > 920 kept free. Storm-channel-to-2nd-Street link is geometrically loose (fixed in 5) |
| Site | P | 4 | Good spacing (Bank to Museum 280); Museum south of the avenue is fine but its drain digs toward the town; more street (Exchange St) than needed now |
| Site | G | 3 | A 430-block sunken Run-off road is a big dig and a concrete road at y 60; Jewelry and Bank 64 apart while both advanced (overlapping chases) |

| Mechanic (as proposed) | Proposed by | Value | Cost | Verdict |
|---|---|---|---|---|
| Pick groups / variants | F M1, P N1, G M1 | Very high: randomized obby floors, vault of the day, Diamond path, rotating prizes, in all 3 heists | ~120-150 lines | **Take, rank 1** |
| Switches: levers, fuse boxes, consoles | F M3, P N3, G M2 | High: Jailbreak's twin levers (the Museum's signature), fuse boxes in all 3 heists | ~120 lines | **Take, rank 2** |
| Blast charges (dynamite) | F M2 | Medium: Jailbreak's alternate exit and roof blast without a Safe Kit; reuses the prison's C4 | ~80 lines | **Take, rank 3** |
| Alarm rules for loot (vanish / lock) | P N2 | Medium-low: stealth payoff, but the drill is loud anyway in the chosen Bank | ~60 lines | Later |
| Keycards / manager NPC | research, G note | Medium, but needs an NPC (clerk.sk-sized) | high | Later |

Tie-break for the Jewelry Store (26 vs 26): the owner asked for "recognisably the Jailbreak heist", so F's structure
wins, and P's three best parts are grafted onto it.

---------------------------------------------------------------------------------------------------------------------

## 2. Rules every planner follows (found while judging; some concepts broke them)

1. **No camera may hold a keypad or a drill door in its cone.** A turret hit closes the keypad (guesses kept) and
   resets holds; an alarm camera on a 30-40 s crack is a guaranteed alarm. Cameras cover approaches; safes and drill
   doors stand in blind alcoves (behind the camera, or behind a wall corner). Loud on purpose = the drill, not a camera.
2. **A gate meant to open only from inside sits in the region's outer face** (its outer side is outside the region,
   so "Get inside first" stops clicks from outside). Traps that guard it go on the inside, >= 2 blocks from the edge.
3. **Smash gates are glass** (full glass blocks, so turning to air leaves no pane arms). Iron bars and iron blocks are
   safe or drill gates.
4. **Case pattern** (no glass over loot): a plinth row = the cells, 2..3 air above, a permanent glass lid 3 up, the
   smash gate is the glass **front** (2 high) facing the aisle.
5. **Cops never open doors**: every cop route is an open doorway; lockdown never boxes the last way out.
6. **Bikes** stand outside every region; a bike doubles the chase radius (100 -> 200) for the rest of the chase.
7. **Pile cells** need 2..3 air above; collapsing-floor pits >= 2 deep inside the region; light level 8+ near plates
   and floors; traps >= 2 blocks inside the region edge.
8. No open-sky black/gray/white/yellow concrete or black/gray concrete powder at street height except the real
   streets; forecourts polished andesite; roofs smooth_quartz, calcite, gray_terracotta, polished_deepslate,
   smooth_sandstone. Nothing with a menu, containers, banners, frames, paintings, pots, candles, armor stands.
9. Test first on the server (before building 20 of them): (a) a smash gate with no pile behind it as an entry
   (fallback below); (b) a register-style pile in a non-store heist; (c) iron bars as a safe gate's blocks
   (fallback: iron blocks drawn as a cage door); (d) cops pathing from each cop spot to the vault (Citizens range 100).

---------------------------------------------------------------------------------------------------------------------

## 3. The Jewelry Store (`jewelry`, difficulty 2, level 5, NOT advanced)

### 3.1 Theme
Jailbreak's black-framed blue-glass corner store and its vertical smash-and-grab: cut in at the red X, smash the
showroom and basement cases, climb two laser floors, leave over the roof by one of three hut doors or down the fire
escape to the bikes. Twists:
- **Payday's Blue Heart** (Jewelry Store / Diamond Store / Dirty Ice): one stone worth exactly a Duffel ($6,000) in
  the manager's safe at the top of the climb. The climb becomes the way to the prize.
- **Payday's camera dance**: a turret over the showroom counter; sneakers along the walls are never shot.
- **Payday's VIP curtain**: a 3-beam laser curtain in front of the office that blinks in sync (a 2 s window every
  4 s), or a fuse box turns it off (M2).
- **GTA's Jewel Store getaway**: the roof fire escape lands in an alley with stolen bikes.
No cops (level-5 robbers learn heists first); the threat is traps, the clock, and other players with guns.

### 3.2 Footprint
- **Building** x 600..631, z 376..411 (32 x 36), on the NW corner of Main Avenue and Bank Street.
- **Region** `heist_jewelry` x 598..634, z 374..414, y 56..97 = 37 x 41 x 42 = **63,714**. It takes in a 3-block
  polished-andesite forecourt on the avenue side (z 412..414) and the Bank Street side (x 632..634), and the roof
  landing z 374..375. Sidewalks stay outside.

| Level | Floor slab | Interior |
|---|---|---|
| Basement | y 57 | y 58..63 |
| Ground | y 64 | y 65..71 |
| Obby 1 | y 72 | y 73..78 |
| Obby 2 | y 79 | y 80..85 |
| Final floor (low) | y 86 | y 87..90 |
| Roof | y 91 | parapet y 92, two stair huts in an L y 92..95, hut roofs y 96 |

- **Outside**: polished_blackstone piers at the corners and every 6 blocks, blackstone floor bands;
  light_blue_stained_glass curtain walls on the south and east faces (the obby floors' beams show through: scout the
  layout from the street); a 5 x 5 cyan diamond (cyan_stained_glass, prismarine, sea_lantern) on the SE top corner;
  a top band of gray louvres (iron bars over andesite walls); two red_terracotta 3 x 3 X marks on the forecourt under
  the X window; a fake glass double door beside it; a smooth_quartz awning. North and west walls blackstone with small
  windows. Roof smooth_stone with polished_andesite ribs, calcite parapet, huts calcite and smooth_quartz.
- **Hut doorways (3, open, no door blocks)**: north to a landing z 374..375 then the steel **fire escape** (outside
  the region, z 370..373) down into the alley; west to the **vent shaft** (2 x 2 with a ladder, down to the ground
  floor's NW corner, sealed from the obby floors: Jailbreak's late-joiner vent); east to a deck over Bank Street.
- **Stairs**: main stair NE, ground -> obby 1's east end; obby 1 is crossed east to west, obby 2 west to east (so
  each floor must be crossed); final floor: two switchback flights to the huts; the back stair (NW) ground ->
  basement.

### 3.3 The robbery
1. **In**: smash the **X window** G1 from the forecourt (hold 1.5 s; the clock starts: 6:00). Or the fire escape,
   roof, vent.
2. **Ground floor** (blue carpet, dark pillars, sea-lantern light box behind white glass): five display islands, each
   a 1 x 4 polished_deepslate plinth at y 65, glass lid y 68, glass-pane ends/back, smash front 4 x 2 (G2-G6) facing
   the centre aisle. Three low floor lasers (T1-T3). The **counter turret** T4 over the cashier counter (north wall)
   sweeps the islands: the two near islands are inside its 6-block sneak range, the three far ones only inside its
   12-block standing range.
3. **Basement** (dark walls, glowing ceiling): ring counter 1 x 10 (G7) on the west wall, watch counter 1 x 8 (G8)
   on the east wall, three blinking floor lasers (T5-T7) across the aisle; the **workshop** at the back with the
   small safe G9 (the no-climb safe for Mara chapter 2).
4. **Obby 1 "Layered Laser"**: 8 crossing low lasers (T8-T15); twelve 1-high stepping blocks (polished_blackstone
   with light_blue glass slab tops: standing on one, feet at y 74, clears the beams); a 2 x 2 landing mid-floor with
   loose gems P8.
5. **Obby 2 "Moving Lasers"**: five pillar pairs with blinking floor-to-ceiling beams (T16-T21) staggered so the gap
   travels; a landing with loose gems P9; on the exit landing the **fuse box** (M2; without M2 it's a plain breaker
   prop).
6. **Final floor** (4 high): duck lasers on both flights (T22-T23); a landing with loose gems P10 at the stair head;
   the **manager's office** in the south half behind a glass-pane wall. Its doorway (2 wide) is the **VIP curtain**
   T24-T26. The **office turret** T27 hangs on the ceiling over the safe wall looking at the doorway: it shoots
   whoever comes through the curtain slowly; the safe G10 is behind it, out of its cone.
7. **Out**: roof north hut -> fire escape -> alley -> bikes (or 2nd Street west); or the vent; or back out the X
   window, where anyone waiting has a clear shot.

### 3.4 Gates (add in this order)

| # | Kind | What / where | Blocks | Settings |
|---|---|---|---|---|
| G1 | smash | X window, south face x 606..607, y 65..66, z 411 | 4 glass | default; an entry (test 2.9a; fallback: pile P14) |
| G2-G6 | smash | island fronts 4 x 2 | 8 each | default |
| G7 | smash | basement ring counter front 10 x 2 | 20 | default |
| G8 | smash | basement watch counter front 8 x 2 | 16 | default |
| G9 | safe | workshop safe, 2 x 2 iron blocks | 4 | digits 4, claim 6 |
| G10 | safe | office wall safe, 2 x 2 iron blocks in a polished_blackstone frame | 4 | digits 4, claim 6 |

### 3.5 Piles

| # | Name | Style | Cells | Value | Pieces | Behind |
|---|---|---|---|---|---|---|
| P1-P5 | Display case | jewel 250 / 1.0 | 4 (1 x 4) | 1,250-2,250 | 5-9 | G2-G6 |
| P6 | Rings | jewel 250 / 1.0 | 10 | 2,000-3,500 | 8-14 | G7 |
| P7 | Watches | goods 200 / 1.0, per-cell=4 | 8 | 2,000-3,400 | 10-17 | G8 |
| P8-P10 | Loose gems | jewel 250 / 1.0 | 4 (2 x 2 landing) | 500-1,250 | 2-5 | none |
| P11 | Office cash | cash 100 / 0.8 | 6 | 1,200-2,400 | 12-24 | G10 |
| P12 | **Blue Heart** | jewel, piece=6000 take=4 | 1 (a blue_wool velvet pedestal) | 6,000-6,000 | 1 | G10 |
| P13 | Repair tray | jewel 250 / 1.0 | 2 | 1,000-2,000 | 4-8 | G9 |
| (P14) | Window sill (only if G1 alone is refused) | jewel 250 / 1.0 | 1 | 250-500 | 1-2 | G1 |

Spots 10 gates + 13 piles = **23** (24 with P14). Pieces max **124** (126). The Heart is one piece: the cracker's 6 s
claim always gets it, and a part-full bag takes a shrunken piece (greed vs bag space).

### 3.6 Traps (d2, m 1.25; 27 at launch, 39 with M1)

| Trap | Kind | Where | Settings | Hit |
|---|---|---|---|---|
| T1-T3 | laser low 0.4 | ground floor, between island rows and along the walls | static, damage=1.5 | 2 hearts |
| T4 | camera turret | over the counter, looking south over the islands | effect=damage damage=1 angle=30 range=12 sweep=70 period=6 | 1.5 hearts a shot; resets holds |
| T5-T7 | laser low 0.4 | basement aisle | blink on=2 off=1.5, offsets 0 / 0.7 / 1.4, damage=1.5 | 2 hearts |
| T8-T15 | laser low 0.4 | obby 1, 4 along x + 4 along z | damage=2 | 2.5 hearts |
| T16-T21 | laser vertical y 80..85 | obby 2, between pillar pairs | blink on=1.5 off=1.5, offsets 0, 0.5 ... 2.5, damage=2 | 2.5 hearts |
| T22-T23 | laser mid 1.65 (duck) | final-floor flights | damage=2 | 2.5 hearts |
| T24-T26 | laser 0.4 / 1.0 / 1.65 | office doorway (the VIP curtain) | blink on=2 off=2 offset 0 (in sync), damage=2, tag `curtain` | 2.5 hearts |
| T27 | camera turret | office ceiling over the safe wall, looking at the doorway | effect=damage damage=1 angle=30 range=8 sweep=60 period=6 | 1.5 hearts a shot |
| M1 T28-T33 | laser | obby 1 variant `gems`: 6 horizontal lasers at 1.0 (jump) and 1.65 (duck), alternating rows | damage=2 | |
| M1 T34-T39 | laser | obby 2 variant `classic`: 6 static beams (3 low, 3 mid) zig-zag | damage=2 | |

With M1: group `obby1` = {layered: T8-T15, gems: T28-T33}, group `obby2` = {moving: T16-T21, classic: T34-T39},
pick 1 each per opening. The stepping blocks serve both layouts. Without M1, T28-T39 aren't added.

### 3.7 Settings, exits, numbers
- `/dheist create jewelry 2`, name "Jewelry Store", **pool 26000** (default 24,000; the Heart adds one Duffel),
  escape 6:00, cooldown 10:00, level 5, **advanced false**, pvp false, police true (all defaults except the pool).
- **Exit** (612.5, 65, 417.5) on the avenue sidewalk, 6 out from the X. **Hologram** (632.5, 70, 413.5).
- **Cop spots** (unused while not advanced; set so /dsetup is quiet and the advanced switch is 3 commands later):
  (596.5, 65, 417.5), (662.5, 65, 417.5).
- **Bikes** (alley, facing west): `/dbike spotat jailbreak 601 65 360 90`, `603 65 360 90`, `605 65 360 90`.
- **Advanced variant (owner's call later)**: `advanced true`, lockdown boxes over the ground-floor glass runs (the X
  window is then shuttered), T27 becomes effect=alarm, cops at the two spots; the roof is the real exit.
- **Value**: average $26,125 (islands 8,750, rings 2,750, watches 2,700, gems 2,625, office 1,800, Heart 6,000,
  tray 1,500); range $19,950-32,300.
- **Clear time (/dloot check)**: piles 45 + 14 + 17 + 15 + 19.2 + 4 + 8 = 122 s; 8 smashes 12 s; 2 safes 60 s:
  **194 s (3:14)** of 6:00 (the "meant for a crew" warning, right).
- **Real runs**: level 5 + Duffel ($6K): 3.5 islands = 24 s of holding, ~1:00 total; or climb + office (~1:30 + 40 s
  keypad) for the Heart alone. Gym Bag fills in 8 s. Worst hit 2.5 hearts; turret 1.5 a shot.
- **Story**: Mara c1 rob, c2 crack (two safes = two crack credits a run, one with no climb), c3 "3 different heists";
  Vic v2 (d2+ sales).

---------------------------------------------------------------------------------------------------------------------

## 4. The Bank (`bank`, difficulty 3, level 20, ADVANCED)

### 4.1 Theme
Jailbreak's green-glass tower with the brick B-A-N-K pylon. Lobby with tellers and the security gate, a "Classic"
laser bay, the octagonal vault door you drill and defend while the cops pour down the stairs (Donating's Bank Bust),
and the alternate exit to a manhole behind the bank. Twists:
- **Payday's stealth-then-loud** (Harvest & Trustee): tills, counting room and manager's safe can be robbed quietly
  past two cameras and two light-blue alarm lasers; the drill is always loud. Quiet $15K or loud $80K.
- **GTA Fleeca's Box 167**: a one-box drill gate in the deposit wall, a second short drill (two Mara c3 drill
  credits a run).
- **GTA's tills** drawn as real registers (style=register), and **Payday's barred port** beside the vault door that
  shows this opening's vault before anyone spends a Drill (pays off with M1's vault of the day).

### 4.2 Footprint
- **Building** x 597..628, z 282..319 (32 x 38), west side of Bank Street, one block north of the Jewelry Store
  across 2nd Street. **Region** `heist_bank` x 595..630, z 280..321, y 47..102 = 36 x 42 x 56 = **84,672**.

| Level | Floor slab | Interior |
|---|---|---|
| B2 vault level | y 48 | y 49..55 |
| B1 laser bay + counting room | y 56 | y 57..63 |
| Lobby | y 64 | y 65..76 double height; mezzanine slab y 70 over the west third |
| Tower floors 2-5 | y 77, 83, 89, 95 | sealed (no stairs), dark-tinted windows |
| Roof | y 98 | helipad drawn in calcite + yellow_terracotta (unreachable); pylon to y 102 |

- **Outside**: green_stained_glass curtain walls in a navy frame (blue_terracotta, polished_deepslate); a 4-wide
  brick pylon on the SE corner with "B A N K" as stacked white text-display labels; one band of blue windows; a neon
  line of light_blue glass over sea lanterns round the base; double-height glass lobby front on Bank Street.
- **Front door**: an open doorway 4 wide x 4 high mid east face (z 298..301), quartz surround; a red "CLOSED"
  hologram line while cooling. Plaza x 631..639 (polished andesite) to the Bank Street sidewalk.
- **Back (west)**: a blank granite wall onto **Hatch Plaza** (x 560..590, z 285..315) with the **manhole**: 4
  andesite_wall bollards round an open ladder shaft (no trapdoor) at (575, 64, 300). **Hatch Lane**
  (z 296..304, polished andesite + stone bricks, not concrete) runs west from the plaza to West Street (x 490..505).

### 4.3 The robbery
**Lobby** (prismarine bricks + dark prismarine floor, pale gray walls):
1. Walk in the front. The **teller counter** on the west side: a 6 x 2 blue-glass screen (G1 smash) over three
   register tills (P1-P3). The **teller camera** T19 is fixed high on the east wall looking west at the counter from
   9 blocks: standing at the glass you're seen (alarm); **sneaking** (range 6) you aren't. ATMs are `furn_atm` item
   displays.
2. Stairs on the north side to the **mezzanine**: the manager's office and its wall safe G2. Camera T2 is fixed on
   the office **door** from across the landing; the safe is inside, out of view.
3. SW corner: the **security gate** G3 (a 3 x 3 iron-block door with a keypad prop: Jailbreak's keycard gate) to the
   stairs down. Camera T1 sweeps the **lobby floor in front of** the gate's 3-deep alcove; the keypad in the alcove
   is out of its cone (rule 2.1). Cross while it pans away, or sneak.

**B1 "Classic"**:
4. A red-floored laser bay 8 wide x 22 long (red_nether_bricks floor; walls of iron blocks and polished_blackstone):
   low beams (jump), mid beams (duck), two blinking pillar walls (T3-T10). Two light-blue **alarm lasers** at h 1.0
   in the last third (T11-T12: jump them or it's loud). The **breaker** (M2) on the bay's entry wall.
5. The **counting room** off the bay, three plates at its doorway (T13-T15), cash on two tables (P4, behind G3: the
   keypad cracker gets 6 s on it).
6. Stairs down at the far end.

**B2 the vault level**:
7. The **antechamber**. East wall: the **vault door** G4, a 5 x 5 octagon (21 iron blocks; polished_deepslate X,
   chiseled-stone wheel in the centre; the 4 corners are frame, not gate). Mounting the Drill **trips the alarm**.
   Beside it the **viewing port**: a 1 x 2 iron-bars window into the vault (shows which bay is stocked with M1).
8. West side: the **exit vestibule** x 596..601, z 297..303 with lasers T16-T18 at x 598..600, ending in the
   **alternate exit** G7: a 2 x 3 iron-block blast door in the region's west face (x 595, z 299..300, y 49..51),
   so it opens only from inside (rule 2.2). Crack it early, while the drill runs. Behind it, outside the region, the
   tunnel (x 576..594, y 49..52) and the ladder up the manhole.
9. **The vault** (12 x 14, froglight-lit): two gold pallets (P6, P7) and two cash trolleys (P8) side by side; the
   deposit-box walls (polished_blackstone ledges: P9 jewels, P10 valuables); **Box 167** G5 (a 1 x 2 box face in
   the deposit wall, P11); the **Reserve cage** G6 (iron-bar front 3 x 3; test 2.9c) with the reserve gold P12.

**Out**: (a) the alternate exit, tunnel, manhole, Hatch Lane west (cold: the cops come from Bank Street); (b) back up
and out the front into the cops (hot).

### 4.4 Gates

| # | Kind | What | Blocks | Settings |
|---|---|---|---|---|
| G1 | smash | teller screen 6 x 2 | 12 | default (quiet) |
| G2 | safe | manager's wall safe | 4 | default |
| G3 | safe | security gate (a door) | 9 | default |
| G4 | drill | vault door, octagon | 21 | time=75 jams=2 claim=10 (alarm default true) |
| G5 | drill | Box 167, 1 x 2 | 2 | time=30 jams=1 alarm=true |
| G6 | safe | Reserve cage front | 9 | default |
| G7 | safe | alternate exit (region face; M3: a blast gate) | 6 | default |

### 4.5 Piles

| # | Name | Style | Cells | Value | Pieces | Behind |
|---|---|---|---|---|---|---|
| P1-P3 | Till | register, piece=250 take=2.0 | 1 | 1,000-2,000 | 4-8 | G1 |
| P4 | Counting room | cash, piece=500 take=4.0 | 6 | 3,000-6,000 | 6-12 | G3 |
| P5 | Bearer bonds | cash, piece=1000 take=4.0 | 2 | 4,000-8,000 | 4-8 | G2 |
| P6, P7 | Gold pallet | gold, piece=1000 take=3.0 | 6 (2 x 3) | 8,000-12,000 | 8-12 | G4 |
| P8 | Cash trolleys | cash, piece=500 take=4.0 | 6 (2 x 3) | 8,000-12,000 | 16-24 | G4 |
| P9 | Deposit jewels | jewel 250 / 1.0 | 8 (ledge) | 3,000-6,000 | 12-24 | G4 |
| P10 | Deposit valuables | goods, piece=500 take=2.5, per-cell=4 | 6 | 4,000-8,000 | 8-16 | G4 |
| P11 | Box 167 | goods, piece=2500 take=5.0, per-cell=4 | 1 | 5,000-7,500 | 2-3 | G5 |
| P12 | Reserve gold | gold, piece=2000 take=4.5 | 6 | 12,000-24,000 | 6-12 | G6 |
| (P13) | Founder's Box (M1 only) | art, piece=12000 take=6 | 1 (pedestal) | 12,000 | 1 | G4 |

If test 2.9b refuses register style in a heist: P1-P3 become cash piece=250 take=2.0 on 2 cells.
Spots 7 + 12 = **19** (20 with P13). Pieces max **147** (148).

**With M1, vault of the day** (group `vault`, pick 1): `gold` = P6, P7 retuned to piece=1500, 12,000-18,000 each
(8-12); `cash` = P8 and a second trolley P8b in the other bay, each piece=750 take=6.0, 12,000-18,000 (16-24). The
unpicked bay stands empty; the port shows which. Group `rare` (chance 0.15) = P13. The deposit wall, Box 167 and the
Reserve are always there. Average stays ~$80K (+$1,800 EV for the Box).

### 4.6 Traps (d3, m 1.5; 19 at launch, 27 with M1)

| Trap | Kind | Where | Settings | Hit |
|---|---|---|---|---|
| T1 | camera | lobby, sweeping the floor in front of the security-gate alcove | effect=alarm angle=30 range=12 sweep=60 period=8 | alarm |
| T2 | camera | mezzanine landing, fixed on the office door | effect=alarm | alarm |
| T3-T6 | laser low 0.4 | B1 bay | damage=2, tag `bay` | 3 hearts |
| T7-T8 | laser mid 1.65 | B1 bay | damage=2, tag `bay` | 3 hearts |
| T9-T10 | laser vertical y 57..62 | B1 bay, a 2-wide gap between pillars | blink on=2 off=2, offsets 0 / 2, damage=2, tag `bay` | 3 hearts |
| T11-T12 | laser 1.0 (jump) | last third of the bay | effect=alarm (light blue) | alarm |
| T13-T15 | plate | counting-room doorway | damage=2 | 3 hearts |
| T16-T17 | laser low 0.4 | exit vestibule | damage=2 | 3 hearts |
| T18 | laser mid 1.65 | exit vestibule | damage=2 | 3 hearts |
| T19 | camera | lobby east wall, fixed on the teller counter from 9 blocks | effect=alarm range=12 | alarm (sneak = unseen) |
| M1 T20-T27 | laser | bay variant `presidential`: 5 horizontal beams at 0.4, 0.9, 1.4, 1.65, 2.2 with blink on=2 off=1, offsets 0/0.6/1.2/1.8/2.4 (Payday's alternating laser wall) + 3 vertical blinkers; damage=2, tag `bay` | | 3 hearts |

M1 group `bay` = {classic: T3-T10, presidential: T20-T27}; T11-T12 armed in both.

### 4.7 Alarm, lockdown, cops
- **Alarm sources**: T1, T2, T19, T11-T12, the vault drill G4 (always), Box 167 G5. Safes and the teller screen are
  quiet.
- **Lockdown** (iron bars): L1, L2 the lobby glass front north and south of the doorway (x 628, z 283..296 and
  z 303..318, y 65..76); L3, L4 the lobby's north and south side glass; L5 the mezzanine's inner glass. The front
  doorway and the alternate exit stay open.
- **Cop spots** (Bank Street east sidewalk): C1 (662.5, 65, 337.5), C2 (662.5, 65, 262.5). They walk in the front,
  through the open G3, down the bay to B2: the standoff at the vault doorway. Test their paths (2.9d).
- **Exit** (636.5, 65, 300.5) on the plaza. **Hologram** (633.5, 71, 300.5).
- **Chase**: centre (612.5, 74.5, 300.5). On foot you're clear at West Street (505, 64, 300): ~108. On a bike
  (radius 200): west on the avenue past x ~420.
- **Bikes** (Hatch Plaza, facing west): `/dbike spotat jailbreak 565 65 297 90`, `565 65 303 90`.

### 4.8 Settings and numbers
- `/dheist create bank 3`, name "Bank", **advanced true**, defaults otherwise: escape 8:00, cooldown 15:00, level 20,
  pool 80,000, police true. d3 cops 26 HP, 3 damage.
- PROPOSAL (core.sk, owner's call; the Bank is the only d3 heist): `difficulty::3::alarm::warning` 25,
  `::max-cops` 5, `::pool` 5, `::heavy-from` 4: level-20 robbers' first cops are a little gentler.
- **Value** average $79,750 (tills 4,500, counting 4,500, bonds 6,000, gold 20,000, trolleys 10,000, jewels 4,500,
  valuables 6,000, Box 167 6,250, Reserve 18,000); range ~$58,000-101,500.
- **Clear time**: piles 429 s + smash 1.5 + 4 safes 120 + drills 76.5 + 31.5 = **658 s (11:00)** vs 8:00: a crew
  race; four Armored Duffels empty it.
- **Solo level 20** (Hockey bag $15K): tills 0:30, keypad 0:30, bay 0:20, drill 75 s + jams and defend 1:40, gold
  0:45 (crack G7 during the drill), tunnel 0:20 = **~4:10 of 8:00**.
- **Cops vs drill**: warning 20-25 s after the mount, assault 1 ~45 s, the vault opens ~95 s after the mount: you load
  during assault 1's tail or the break.
- **Story**: Mara c3 drill (two drills = two credits a run), c3 "3 heists"; c4 getaway (advanced); Vic v4 (four
  safes in d3+), v5 (adv + drill + lose the cops).

---------------------------------------------------------------------------------------------------------------------

## 5. The Museum (`museum`, difficulty 4, advanced, level 45): the finale

### 5.1 Theme
Jailbreak's tan sandstone museum alone on its mesa: four columns, Triceratops pediment, Mr Bones the T-Rex under
sweeping spotlights; in through the roof; the Egyptian room with the alarmed Pharaoh case and the gem room with the
alarmed Blue Jewel, each leading to a security room with a side door; the showcase (smash the middle glass) and the
gallery upstairs. Jailbreak's puzzles stay puzzles: the pipe puzzle becomes the curator's keypad, the jewel-alignment
puzzle a laser crawl. Twists:
- **Payday's The Diamond**: upstairs at the back, a checkered floor where only one path holds, the holes **stay
  open** for the run (the first robber pays in hearts, the crowd follows), and at its end a quiet drill shutter over
  **The Diamond**, the best $/s in the game.
- **Payday's vault + GTA Kortz / Payday sewer getaway**: a loud vault drill in the basement, a keypad drain hatch
  beside it, a tunnel out under the mesa to a storm channel where **stolen bikes** wait (GTA's culvert), away from
  the cops' side.
- **Jailbreak's twin levers** (M2): both security-room levers within 3 s blind the spotlights and open the portico.
The finale (safe + vault + getaway in one run) has a natural order: crack the drain hatch while the vault drills,
load, leave by the drain.

### 5.2 Footprint
- **Mesa** x 820..920, z 300..400, top y 72: 8-block retaining walls of sandstone over stone bricks, built closed
  (hollow is fine if sealed), the museum basement and the drain carved in. A paved plaza (smooth_sandstone, cut
  sandstone) in front (z 372..400); terraces on each side with stairs down the mesa walls (outside the region). The
  ramp road climbs from the roundabout along the mesa's south wall (z 402..409, one block every 8: x 830..894) to
  the plaza.
- **Region** `heist_museum` x 841..898, z 330..371, y 60..97 = 58 x 42 x 38 = **92,568**.
- **Cross plan**: centre block x 857..882 x z 332..371 (portico of 4 round columns at z 364..371: quartz pillar cores
  clad in smooth sandstone, wide steps; rear projection); wings x 843..856 and x 883..896, z 338..363; 2-block
  terrace strips inside the region at x 841..842 and x 897..898.

| Level | Floor slab | Interior |
|---|---|---|
| Basement | y 64 | y 65..70 (pit y 61..63 under the false floor) |
| Ground (mesa top) | y 72 | central hall y 73..89 double height, balconies y 80 on three sides; wing ground rooms y 73..79; rear ground room y 73..76 (ceiling y 77) |
| Upper | y 80 | wing upper rooms y 81..88; Diamond Room floor tiles y 80 over its pit y 78..79 |
| Roof | y 90 | pediment apex y 97 |

- **Outside**: smooth_sandstone, cut_sandstone, sandstone bricks; pale salmon trim (terracotta, smooth_red_sandstone
  bands); a blackstone/deepslate Triceratops silhouette on the pediment; red wool strips where Jailbreak has
  banners; a big arched window over the doors showing the T-Rex; square wing windows; flat smooth_sandstone roof;
  a ladder up each wing's outer wall from the terraces (outside the region).
- **Doors (open, no door blocks)**: portico 4 x 6; each security room's 2 x 3 side doorway onto its terrace.

### 5.3 The robbery
**In**: climb a wing ladder, smash the **skylight** G1 (5 x 5 glass at y 90, quiet), climb down a ladder on the
north balcony's column. Or walk in the front before the alarm.

**Central hall** (Mr Bones of bone blocks on a red_terracotta octagon, planets of colored wool on chains, twin
stairs): four **spotlights** T1-T4 (alarm cameras) sweep the floor; the pedestal and stair undersides are cover.
Loot: **Fossils** P1 on low plinths along the east wall, **Dino eggs** P2 in a nest behind the T-Rex.

**West ground room "Egypt"**: the **Pharaoh case** G2 (smash, alarm=true) with P3, four plates round its pedestal
(T5-T8); the **curator's keypad** G3, a 2 x 3 sandstone-brick door into the **west security room** (the **Mummy** P4
on its sarcophagus plinth, the west lever (M2), the west side doorway). Service stairs to the basement.

**East ground room "Gems"**: the **Blue Jewel case** G4 (smash, alarm=true) with P5; a 3-wide, 10-long **laser
crawl** (T9-T14) into the **east security room** (the east lever (M2), the east side doorway, service stairs down).

**Upstairs west "Showcase"** (red carpet with a dino-footprint pattern): a 3 x 3 glass wall G5 (smash: "shoot the
middle glass"); gold bars P6 and Oddities P7 (giant donut, traffic cone, spinner rims as the goods art); two cameras
T15-T16; hanging calcite/froglight platforms at y 86 to hop onto.

**Upstairs east "Gallery"**: two **Canvases** piles P8, P9 on plinths under block-mosaic "paintings" in dark-oak
frames (no real paintings or item frames); two cameras T17-T18; three ankle-high light-blue alarm lasers (h 0.3,
T19-T21) in front of the plinths.

**Upstairs rear "Diamond Room"** (off the north balcony): two alarm duck lasers at its door (T26-T27); a 9 x 9 floor
of polished_diorite / polished_andesite squares (three bands of three 3 x 3 squares); four **collapsing floors**
(T22-T25) leave one path, one safe square per band, adjacent bands' safe squares touching; **restore=0** (a hole
stays open for the run). A fall into the 2-deep pit hurts and puts you back on your last solid square. At the end an
alcove behind the **armoured shutter** G6 (drill, alarm=false: the quiet "thermal lance") with **The Diamond** P10.

**Basement** (via either security room's service stairs): the **laser wall** (T28-T32, Payday's alternating beams
across a 3-wide corridor); a 2 x 4 **false floor** (T33) before the antechamber. In the antechamber: north wall
(the region's face, z 330) the **drain hatch** G9 (2 x 2 iron blocks at x 868..869, y 65..66: opens only from
inside); east wall the **vault door** G7 (21-block octagon, loud). In the vault: **Vault gold** P11, **Antiquities**
P12 and the **Crown cage** G8 (iron-bar front 3 x 3; test 2.9c) with the **Crown jewels** P13.

**Getaway**: the alarm bars the portico, the arched window, every wing window and the skylight opening. Ways out:
- the **west side door** (cold: no cop spot on the west);
- the **east side door** (hot: C3 is east);
- the **drain**: through G9, the tunnel north (x 868..870, y 65..67, z 296..329, outside the region; it steps down to
  the channel's floor), out of the mesa's north face into the **storm channel**, onto a bike, west along the
  channel and up its west leg into 2nd Street's east end;
- with M2's levers fired: the portico (bars lifted).
A getaway counts after the first wave, with that run's loot.

### 5.4 Gates

| # | Kind | What | Blocks | Settings |
|---|---|---|---|---|
| G1 | smash | skylight 5 x 5 at y 90 (M3: a 3 x 3 sandstone blast patch) | 25 | default (quiet) |
| G2 | smash | Pharaoh case front 3 x 2 | 6 | alarm=true |
| G3 | safe | curator's keypad brick door 2 x 3 | 6 | default |
| G4 | smash | Blue Jewel case front 3 x 2 | 6 | alarm=true |
| G5 | smash | showcase glass wall 3 x 3 | 9 | default |
| G6 | drill | Diamond shutter 3 x 3 (iron + tinted glass) | 9 | time=60 jams=2 alarm=false |
| G7 | drill | vault door, octagon | 21 | time=90 jams=3 claim=10 (alarm default true) |
| G8 | safe | Crown cage 3 x 3 bars | 9 | default |
| G9 | safe | drain hatch (region face) | 4 | default |

### 5.5 Piles

| # | Name | Style | Cells | Value | Pieces | Behind |
|---|---|---|---|---|---|---|
| P1 | Fossils | goods, piece=1000 take=4 | 6 | 6,000-12,000 | 6-12 | none |
| P2 | Dino eggs | art, piece=6000 take=6 | 2 | 6,000-12,000 | 1-2 | none |
| P3 | Pharaoh's treasures | art, piece=5000 take=5 | 4 (2 x 2) | 10,000-20,000 | 2-4 | G2 |
| P4 | Mummy | art, piece=5000 take=5 | 4 (1 x 4) | 10,000-20,000 | 2-4 | G3 |
| P5 | Blue Jewel | jewel, piece=5000 take=4 | 1 | 10,000-20,000 | 2-4 | G4 |
| P6 | Gold bars | gold, piece=1000 take=3 | 8 | 8,000-16,000 | 8-16 | G5 |
| P7 | Oddities | goods, piece=1000 take=4 | 6 | 5,000-10,000 | 5-10 | G5 |
| P8, P9 | Canvases | art, piece=3000 take=4.5 | 9 each | 15,000-27,000 | 5-9 | none |
| P10 | The Diamond | jewel, piece=12500 take=10 | 1 | 25,000-50,000 | 2-4 | G6 |
| P11 | Vault gold | gold, piece=1500 take=4.5 | 12 | 21,000-36,000 | 14-24 | G7 |
| P12 | Antiquities | art, piece=5000 take=6 | 7 | 20,000-35,000 | 4-7 | G7 |
| P13 | Crown jewels | jewel, piece=1000 take=4 | 6 | 15,000-24,000 | 15-24 | G8 |

Spots 9 + 13 = **22**. Pieces max **129**.

### 5.6 Traps (d4, m 1.75; damage=2 everywhere = 3.5 hearts; 33 at launch, 37 with M1)

| Trap | Kind | Where | Settings |
|---|---|---|---|
| T1-T4 | camera "spotlights" | balcony corners y 86, pitched down at the hall floor | effect=alarm angle=25 range=14 sweep=90, periods 7 / 8 / 9 / 10, tag `spot` |
| T5-T8 | plate | ring round the Pharaoh pedestal | damage=2 |
| T9-T14 | laser | gem-room crawl: 2 low 0.4, 2 mid 1.65, 2 vertical blink on=1.5 off=1.5 offsets 0 / 1.5 | damage=2 |
| T15-T16 | camera | showcase | effect=alarm sweep=60 period=8, tag `spot` |
| T17-T18 | camera | gallery | effect=alarm sweep=60 period=8, tag `spot` |
| T19-T21 | laser h 0.3 | in front of the canvas plinths | effect=alarm |
| T22-T25 | floor | Diamond Room: the 4 unsafe square groups of path A | damage=2 delay=0.5 **restore=0** depth=2 |
| T26-T27 | laser 1.65 (duck) | Diamond Room doorway | effect=alarm |
| T28-T32 | laser | basement laser wall at 0.4, 0.9, 1.4, 1.65, 2.2 | blink on=2 off=1, offsets 0/0.6/1.2/1.8/2.4, damage=2 |
| T33 | floor | basement false floor 2 x 4 | damage=2 depth=3 |
| M1 T34-T37 | floor | Diamond Room path B's unsafe groups (same tiles) | as T22-T25 |

No camera sees G3's keypad, the drain hatch G9, the vault door G7 or the shutter G6 (rule 2.1). Alarm cameras stand
down once the alarm runs: after the vault drill the cops replace the spotlights. M1 group `diamond` = {a: T22-T25,
b: T34-T37} pick 1: the floor looks the same either way.

### 5.7 Alarm, lockdown, cops
- **Alarm sources**: T1-T4, T15-T18, T19-T21, T26-T27, G2, G4, G7 (always). G6 is quiet.
- **Lockdown** (iron bars): L1 portico doorway (x 866..873, y 73..78, z 364); L2 the arched window; L3-L6 the wing
  windows (ground and upper); L7 the skylight opening (x 867..871, y 90, z 340..344). Side doorways and the drain
  stay open.
- **Cop spots**: C1 plaza (870.5, 73, 388.5), C2 roundabout (810.5, 65, 430.5), C3 east terrace foot
  (925.5, 65, 350.5). They enter by the side doors (portico barred) and go down the service stairs to the vault. The
  west door and the drain are the cold side.
- **Exit** (869.5, 73, 380.5) on the plaza. **Hologram** (869.5, 80, 373.5).
- **Bikes** (channel floor y 59, facing west): `/dbike spotat jailbreak 866 60 290 90`, `869 60 290 90`,
  `872 60 290 90`.
- **Chase**: centre (869.5, 78.5, 350.5). On foot clear at about x 765 on 2nd Street; on a bike (200) at about x 665.

### 5.8 Settings and numbers
- `/dheist create museum 4`, name "Museum"; defaults: advanced true, escape 10:00, cooldown 30:00, level 45, pool
  240,000, police true. d4 cops 32 HP, 4 damage.
- **Value** average $237,500 (fossils 9,000, eggs 9,000, Pharaoh 15,000, Mummy 15,000, Jewel 15,000, gold bars
  12,000, oddities 7,500, canvases 42,000, Diamond 37,500, vault gold 28,500, antiquities 27,500, crown 19,500);
  range ~$166K-309K.
- **Rates**: Diamond 1,250 $/s (10 s a stone; a hit resets), Blue Jewel 1,250, Pharaoh/Mummy/eggs 1,000, antiquities
  833, canvases 667, gold/crown 333, fossils 250. Armored Duffel ($40K, L25): 32 s of Diamond, 2:00 of vault gold.
- **Clear time**: piles 572 + 4 smashes 6 + 3 safes 90 + drills 61.5 + 91.5 = **821 s (13:41)** vs 10:00: crew only.
- **Finale solo**: roof 0:30, curator keypad + Mummy 0:45, laser wall + false floor 0:30, vault drill 90 s + 3 jams
  holding the antechamber through the warning and assault 1 2:00 (crack G9 meanwhile), load 1:00, drain + bike 0:45
  = **~5:30 of 10:00**.
- **Story**: finale ✓ (advanced d4 with safes and drills; three keypads and two drills = up to two robbers finish it
  in one run); Mara c4 getaway + $40K d4 sales (one Armored Duffel); Vic v4, v5.

---------------------------------------------------------------------------------------------------------------------

## 6. The site: Rising City, east of the prison

```
 x: 481 490-505  560-590   597-628  640-663                  776-787   820 ........ 920   930
z 230    .         .          .      | Bank |                              (kept free: casino, later blocks)
z 280    .    [Hatch Plaza]  [BANK]  | St.  |              ~~~ storm channel z 280..295, floor y 59, x 776..930 ~~~
z 296 W  .== Hatch Lane ==== region  |      |               west leg x 776..787 rises to y 64 by z 340
z 321 e  .  (z 296..304)    595..630 |      |               |      [ MESA x 820..920, z 300..400, top y 72 ]
z 340 s ======== 2nd Street (z 340..355) ===|================/       [ MUSEUM region 841..898 x 330..371  ]
z 356 t   alley (z 356..373): fire escape foot, 3 bikes x 601..605  |      plaza z 372..400; ramp z 402..409
z 374     .       [JEWELRY region 598..634 x 374..414]               |
z 416 ---- sidewalk -------------------------------- junction ---------------------- ROUNDABOUT x 790..830, z 405..455
z 419 ======== MAIN AVENUE (prison highway continued, x 481..790) ===============
z 444 ---- sidewalk; z 445..470 parking bays + street trees (no buildings; the ridge foot is at z 482)
```

- **Main Avenue** x 481..790, z 419..441, a copy of the prison highway's profile (outdoors.js): black_concrete mixes,
  yellow dash z 430, white edges z 420 / 440, light_gray_concrete sidewalks z 416..418 / 442..444, smooth_stone_slab
  curbs y 65 on z 418 / 442. A 4-light junction at Bank Street; it ends at the **roundabout** x 790..830,
  z 405..455, from which the ramp road climbs the mesa's south wall to the plaza.
- **Bank Street** x 640..663 (asphalt x 643..660, sidewalks x 640..642 / 661..663), from the avenue north to z 230,
  open for later blocks.
- **2nd Street** z 340..355 (16 wide), from **West Street** (x 490..505, back to the avenue) east to x 787, where the
  storm channel's west leg comes up into it. The back route linking all three heists.
- **Alleys / plazas** (polished andesite, stone bricks; never concrete): Jewelry alley z 356..373 (x 598..640);
  Hatch Plaza x 560..590, z 285..315; Hatch Lane z 296..304, x 505..560.
- **Storm channel**: sunk to floor y 59, z 280..295, x 788..930, walls of stone bricks to y 64 with an iron-bar rail
  y 65 at the top; its **west leg** x 776..787, z 280..355 rises one block per 8 from y 59 (z 296) to y 64 (z 336)
  and opens into 2nd Street's east end. Floor polished andesite (not concrete: lay `/dphone path` nodes by hand
  through the channel, the drain and the ramp road).
- **Distances**: Jewelry-Bank centres 94 (the Jewelry has no alarm), Bank-Museum 262 (a Bank chase never reaches the
  Museum), Jewelry-Museum 260.
- **Order from the prison**: walk east past the last lamp (x 476): the Jewelry's blue corner at Bank Street (level 5),
  the green Bank tower one block north (level 20), the Museum's pediment on the mesa at the avenue's end (level 45).
- **Kept free**: Bank Street north of z 280 (casino, later blocks); x > 930 (power plant); the parking strip south of
  the avenue (contract car spots); a **City Criminal Base** lot x 490..550, z 356..410 (Jailbreak's zipline base),
  owner's call, not in this build (if built: a `safe_base` region, which must not touch any heist).
- **Rescan**: `/dphone city scan -40 -30 940 1300 0 jailbreak`, then the hand paths.
- **Free-land check**: everything is x >= 481 with z <= 470 for x <= 775 (the roundabout's x 790..830, z 405..455
  and the mesa are east of 775). No region touches a safe zone.

---------------------------------------------------------------------------------------------------------------------

## 7. New mechanics (ranked; each optional; every heist above works without them)

### M1. Pick groups ("this opening's version") — rank 1, build first
**Why**: Jailbreak's randomized obby floors and vault floors, Payday's vault variants and hidden Diamond path, GTA's
rotating target: one feature, 5 uses (Jewelry obby1, obby2; Bank bay, vault, rare; Museum diamond).
**Spec**:
- `/dloot set <id> pick <group>[:<variant>]` and `/dtrap set <id> pick <group>[:<variant>]` (`default` clears).
  A variant may hold piles, gates and traps together; with no `:<variant>` the spot is its own variant (so "1 of N
  piles" needs no names). Groups: 1-12 lowercase letters.
- Per heist: `/dheist set <h> pick <group> <k>` (default 1) and `/dheist set <h> pick-chance <group> <p>` (0-1,
  default 1: with probability 1-p no variant of the group is armed this opening: the rare item).
- **At each opening** (heistOnOpen, before clerkOnOpen/lootArm and the trap arming): each group draws k distinct
  variants uniformly; if the set equals last run's and the group has more than k variants, redraw once. Saved in
  memory `{-heist::<h>::pick::<group>}` and logged (`pick <h> <group> <variants>` in loot.log). A restart re-rolls.
- **Unpicked**: a pile rolls 0 pieces (a new 0 branch in lootRollPile: no displays, hitbox or marker); a gate stays
  closed with no marker, no hitbox, no prompt ("just a wall"); piles behind an unpicked gate stay unarmed; a trap is
  not armed (no display, plates stay silent with their press still cancelled, floors don't crack, cameras don't
  look).
- **Checks**: lootValidate's 150-piece cap and `/dloot check` count, per group, the k largest variants (pieces and
  max value) and the k smallest (min value); ungrouped spots as today. Piles of different variants still may not
  overlap; traps in different variants of one group may (/dtrap add skips its overlap warning for them).
- The hologram's "$ inside", heistLootPool and the cleaned-out check count armed spots only.
- `/dheist info` shows `picks: obby1=gems obby2=moving`; `/dheist pick <h> <group> <variant...>` forces a pick for
  tests (open, nobody inside; re-arms). `/dloot dump` and `/dtrap dump` write the pick keys.
- **Cost**: ~120-150 lines over loot.sk (lootArm, lootRollPile, lootValidate, dlootCheck), traps.sk (one check in the
  arm loop) and heists.sk (open, info, pick). Bots: the open-time pick, a 0-piece pile, an unpicked gate, a forced
  pick, the cap count.
- **Without it**: the launch versions above (one layout per floor, both vault bays armed, no Founder's Box, Diamond
  path A).

### M2. Security switches (levers and fuse boxes) — rank 2
**Why**: Jailbreak's twin levers are the Museum's most remembered beat and its forced co-op; the same switch with one
pull is Payday's fuse box / GTA Kortz's deactivation panel. 3 uses (Museum levers, Bank breaker, Jewelry curtain).
**Spec**:
- Traps get tags: `/dtrap set <id> tag <t>` (several comma-separated).
- `/dswitch add <h> [x y z] kind=lever|box tags=<t1,t2> [hold=3] [for=<s>|run] [rearm=<s>] [quiet=true|false]
  [link=<name> need=<n> within=<s>] [miss=alarm|none] [lift=<lock ids>|none] [name=Fuse_box]`; also `list`, `info`,
  `remove`, `dump` (staff, heist disabled). At most 8 a heist, >= 2 blocks inside the region; not loot spots (they
  don't count toward the 24).
- **lever**: a vanilla lever block in the build; its click is cancelled (no redstone) and handled: it flips (block
  data) with a clunk; once per run. **box**: an interaction hitbox over a prop block; hold right-click `hold` s with
  loot.sk's hold rules (0.3 s credit a click, a 1 s pause resets, a hit resets).
- **Firing**: need=1 fires at once. Linked: fires when `need` switches of the link are pulled by **different robbers**
  within `within` s of the first. Effects: every trap with one of `tags` is off for `for` s (`run` = the rest of the
  run): lasers hide, cameras hide their pointer and see nothing, plates and floors don't fire; lockdown boxes in
  `lift` are cleared and stay clear for the run, even mid-alarm; "SECURITY OFF" (or the switch's name) to the robbers
  inside; it counts as a task for the clock start (heistStartRun).
- **Power back** (timed): 5 s before, lasers flicker (0.25 s blinks) and "POWER BACK IN 5" shows; then all live again.
  A box can be used again `rearm` s after the power returns. Markers: red live, green fired, gray dead.
- **Miss** (linked, window ran out): the pulled levers reset; `miss=alarm` trips the alarm in an advanced heist.
- `quiet=true`: dead once the alarm has tripped ("The panel's dead.").
- Everything resets at the next opening (levers' block data via the room reset).
- **Uses**:
  - Museum: two levers in the west and east security rooms, `link=sec need=2 within=3 tags=spot for=run lift=L1,L7
    miss=alarm`. The spotlights go dark and the portico and skylight bars lift: Jailbreak's escape.
  - Bank: a breaker box at B1's bay entry, `tags=bay hold=3 for=45 rearm=90 quiet=false` (the damage lasers only; the
    alarm lasers T11-T12 stay).
  - Jewelry: a fuse box on obby 2's exit landing, `tags=curtain hold=3 for=60 rearm=60`.
- **Cost**: ~120 lines (a switch.sk or in heists.sk): the click/hold, the link timing, a lockdown clear (the inverse
  of heistLockdown), a tag check in traps.sk's arm loop.
- **Without it**: no levers or boxes are built; the side doors and drain are the Museum's exits; the curtain and bay
  are timed.

### M3. Blast charges (Jailbreak's dynamite; borrows the prison's C4 timing) — rank 3
**Why**: every Jailbreak bank floor has a blown alternate exit and the museum is entered by blowing the roof. Today
those need a Safe Kit or glass. A blast gate is a no-tool, timed, noisy door. 2 uses.
**Spec**:
- A gate kind `blast` in loot.sk: `/dloot add <h> blast [corners] [fuse=10] [alarm=true|false] [claim=6] [radius=4]
  [damage=3]`, solid, at most 27 blocks, refused in stores.
- **Plant**: hold right-click 2 s on the gate (no item: Jailbreak places the dynamite); anyone, once per run; planting
  starts the clock. A TNT item display on the face, a text display counting down ("0:09"), a fuse hiss.
- **At 0**: explosion particles and sound, no block damage (heists are explosion-immune); every player within
  `radius` of the door's centre takes `damage` HP (generic, cause "trap", combat tag "trap") and is pushed 0.8 away;
  the gate's blocks turn to air for the run (lootGateAir); the planter gets `claim` on piles behind it; in an
  advanced heist the bang trips the alarm unless `alarm=false`.
- No crack or drill credit (it's a door).
- **Uses**: Bank G7 alternate exit (fuse=10, alarm=true: by then it's loud anyway; the Bank keeps 3 safes); Museum G1
  roof patch (3 x 3 sandstone, alarm=false). The Museum's drain hatch G9 stays a safe (the finale's natural safe).
- **Cost**: ~80 lines in loot.sk, reusing the drill's mount hold and text display and the smash's open.
- **Without it**: G7 is a safe gate, G1 a smash skylight.

**Not taken**: P's alarm rules for loot (vanish/lock; a fine later add for stealth payoffs), keycards and a manager
NPC (an NPC is clerk.sk-sized work; the keypad doors do the job), timelocks (the drill is one), plate-path consoles
(M1 + restore=0 give the hidden, discovered path for free).

---------------------------------------------------------------------------------------------------------------------

## 8. Summary and calls for the owner

| | Jewelry Store | Bank | Museum |
|---|---|---|---|
| id / difficulty / level | jewelry / 2 / 5 | bank / 3 / 20 | museum / 4 / 45 |
| Advanced | no | **yes** | yes |
| Region | 598..634 x 56..97 x 374..414 = 63,714 | 595..630 x 47..102 x 280..321 = 84,672 | 841..898 x 60..97 x 330..371 = 92,568 |
| Clock / cooldown / pool | 6:00 / 10:00 / **$26,000** | 8:00 / 15:00 / $80,000 | 10:00 / 30:00 / $240,000 |
| Average roll | $26,125 | $79,750 | $237,500 |
| Spots / pieces / traps (launch; with M1) | 23 / 124 / 27; 39 traps | 19 / 147 / 19; 20 / 148 / 27 | 22 / 129 / 33; 37 traps |
| Safes / drills | 2 / 0 | 4 / 2 | 3 / 2 |
| Way in | X window; roof vent | front door | roof skylight; front before the alarm |
| Way out | X window; roof -> fire escape -> alley bikes | front (hot); alternate exit -> tunnel -> manhole -> Hatch Lane (cold) | east door (hot); west door (cold); drain -> channel bikes -> 2nd Street (cold); portico with the levers |
| Story | c1, c2 (2 safes), c3 spread, Vic v2 | c3 drill (2), c3 spread, c4 getaway, Vic v4, v5 | c4 getaway + d4 sales, c5 finale, Vic v2, v4, v5 |

Calls for the owner:
1. Bank advanced (recommended; all three concepts agree) and the gentler d3 alarm numbers in 4.8.
2. Jewelry not advanced (recommended); its pool $26,000.
3. Build order for the mechanics: M1, then M2, then M3, or none at launch.
4. Names: "Rising City", "Jewelry Store", "Bank", "Museum", the Blue Heart, Box 167, The Diamond.
5. A City Criminal Base lot (x 490..550, z 356..410), later.

---------------------------------------------------------------------------------------------------------------------

## 9. 2026-10-28: Museum replaced by the Casino

Owner, 2026-10-28: replace the Museum (the d4 finale) with a casino vault heist from GTA's Diamond Casino and Payday 2's
Golden Grin, so the server isn't a copy of Jailbreak, "but also make the actual casino usable just like gta". Section 5
and the Museum column of section 8 stay as judged; PLAN.md sections 6 and 7.4 are the truth now. The Jewelry Store and
the Bank are unchanged.
- **Kept**: difficulty 4, level 45, advanced, escape 10:00, cooldown 30:00, pool $240,000; the box x 820..920,
  z 296..400 (the mesa is now a podium), the ramp, the plaza, the exit (869.5, 73, 380.5), the hologram, the drain to
  the storm channel bikes, every street, Bank-to-finale 262.
- **New**: heist `casino`. The gaming floor is a public building outside any region (games in casino-games.md, script
  casino.sk, not built); the region `heist_casino` 841 55 330 .. 898 71 371 = 41,412 covers only the two levels under
  it (B1 security and cash, B2 vault), so the floor works while the heist runs or cools down.
- **Flow**: in quietly by the staff stair off the floor and its keypad (G1), or loudly by the armored-car tunnel from
  the east (alarm curtain); B1: corridor cameras and lasers, a false floor, the loud cash cage, the manager's safe;
  B2: the mantrap's moving laser wall, the quiet deposit-room drill (Golden Grin's Dentist room), the loud round vault
  door (crack the daily vault cage while it drills), cash trolleys, gold, art, Diamonds; out by the drain (cold) or the
  tunnel (hot). The alarm bars the staff stair, so the chase never crosses the gaming floor.
- **Numbers**: 7 gates (4 safes, 2 drills, 1 smash), 13 piles, 20 spots, 147 pieces at most, 27 traps; value
  $164.5K-309K, average ~$236,750; clear 782 s vs 10:00 (a crew); solo finale ~5:45. Story needs unchanged (finale
  with safes and drills; Mara c4/c5, Vic v4/v5).
- **Mechanics**: runs on today's scripts. M1 = GTA's vault of the day (2 of 3 contents) and rare Diamonds; M2 = the
  mantrap's two keycard readers (two robbers within 3 s) and the security PC (cameras and deposit lasers 60 s); M3
  optional (the deposit shutter as a thermal charge).
- **Lost**: Jailbreak's museum beats (the roof drop, the spotlit T-Rex hall, the Diamond Room floor puzzle, the twin
  levers).
- **Gambling risk** (casino-games.md section 1): real money reaches in-game money through crate keys, and in-game money
  reaches real value through cars sold between players, so cashable chips may break Mojang's guidelines, Tebex's
  policy and some countries' laws. Recommended: the cautious option (chips one-way, bound prizes; GTA's own model).
- **To do**: plan-layout.js still draws the Museum's box name and region (PLAN.md section 8 says so); bring it in line
  before a builder copies COMMON.
