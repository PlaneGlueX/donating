# Critique of tools/build/city/PLAN.md (2026-10-28)

Checked against the real code: server/plugins/Skript/scripts/loot.sk, traps.sk, heists.sk, cops.sk, core.sk, story.sk,
bikes.sk, tools/build/jail/outdoors.js, tools/build/town/SETUP.md and town-gps-paths.txt. Each finding gives where,
severity, problem, evidence and fix, so a later session can run only the fixes.

## What passed (no change needed)

- Region sizes and overlaps: jewelry 37x42x41 = 63,714, bank 36x56x42 = 84,672, casino 58x17x42 = 41,412; no overlap,
  no safe zone nearby (pvp.sk safe prefix is "safe_base").
- City box x 481..940, z 226..470 clears the prison (x <= 480) and the town approach (z >= 471). The avenue profile
  matches jail/outdoors.js:254-266 (asphalt z 419..441, white 420/440, yellow dash z 430 with x%6<3, sidewalks
  416..418 / 442..444, slab curbs on 418 / 442).
- Every /dloot pile passes lootValidate (loot.sk:2262-2304) with the core.sk:1258-1318 defaults: cells <= 12,
  pieces <= 24 per pile (the casino Vault_gold is exactly 24, bank Deposit_jewels and Cash_trolley exactly 24),
  capacity cells x per-cell x layers is enough everywhere, every range holds a whole piece, no same-layer overlap,
  behind= points at gates added first. Heist piece totals: jewelry 124 (126 with P14), bank 147, casino 147 (cap 150).
  Spots: 23 (24 with P14), 19, 20 (cap 24). All gates are <= 27 blocks; key names (digits, claim, time, jams, alarm,
  take, per-cell, piece, style, name, behind) are all accepted by lootKeyType (loot.sk:83-121).
- Drills trip the alarm by default (core.sk:1341 loot::drill::alarm true), so Casino G4 `alarm=false` is honoured
  (loot.sk:1536). Smash `alarm=true` works (loot.sk:1222).
- Trap counts <= 40 (core.sk:1188), lasers <= 32 long (core.sk:1204), every laser/camera >= 2 blocks inside its region in
  x and z (traps.sk:1276-1283), the casino false floor T6 pit (y 61..63) is inside the region (traps.sk:1447-1453).
- Story needs are covered at the right levels (story.sk:191-261, core.sk story missions): c2_safe (level 5) -> jewelry
  d2 L5 with G9/G10, Safe Kit level 5 (core.sk:1584); c3_drill (level 20) -> bank G4, Drill level 15 (core.sk:1585);
  c3_spread heist3 -> jewelry + bank + the town's two stores; c4_getaway adv -> bank/casino; c4_big d4 -> casino L45;
  c5_finale "finale" = d4 + advanced + a safe + a drill -> casino (G1/G3/G6/G7 safes, G4/G5 drills). Vic v2 d2+,
  v4 safe+d3 (bank), v5 adv+drill (bank). Drill credit goes to the last fixer still inside (loot.sk:1818-1820).
- Pools: bank 80,000 and casino 240,000 equal the core.sk:1033-1034 defaults; jewelry 26,000 is set; average rolled
  values (whole pieces) 26,125 / 79,750 / 236,750 fit.

## Findings

### F1. Casino mantrap laser wall can kill outright and has no safe window (BLOCKER)
- Where: PLAN 7.4 T16-T20 (casino mantrap, x 880.5); same pattern in 7.3 "With M1" bank bay T20-T27.
- Problem: five beams at h 0.4 / 0.9 / 1.4 / 1.65 / 2.2, blink on=2 off=1, offsets 0/0.6/1.2/1.8/2.4 are evenly
  phased over the 3 s cycle, so 3-4 beams are always on; four of them hit a standing robber (h <= 1.78), so at least 2
  and up to 4 hit at once. Each is its own trap with its own min-gap, so hits stack. d4: max(1, round(2 x 2 x 1.75)) / 2
  = 3.5 hearts each -> 7 to 14 hearts in one crossing: death from full health. Sneaking still meets 3 beams, a jump
  meets the 2.2 beam at the head. "Time the moving laser wall" (6.3) is impossible. The mantrap is the only way to the
  vault, so every robber pays it. Breaks the rule "traps hurt, never kill outright".
- Evidence: traps.sk:412-432 (phase = (tick + offset) mod cycle, live after 4 ticks), traps.sk:130-137 (damage
  formula), core.sk:1185 (trap-damage 1.75 at d4), CLAUDE.md Traps (jump h < 1.27, duck 1.49-1.78).
- Fix: three beams only (h 0.4, 1.0, 1.65), damage=1 each, on=1.5 off=1.5, offsets 0 / 0.5 / 1.0, so a 0.5 s all-dark
  window exists and the worst case is 3 x 2 = 6 hearts at d4; or one beam plane that moves (static low + blinking duck).
  Drop T20 (2.2 hits nobody standing). Apply the same rule to the bank M1 bay: at most 3 stacked beams, damage=1.

### F2. Casino deposit-room wall stacks to 10.5 hearts (BLOCKER)
- Where: PLAN 7.4 T21-T23 (z 345.5, h 0.4 / 1.0 / 1.65, damage=2, on 1.5 off 1.5, offsets 0 / 0.5 / 1).
- Problem: all three are live together for 0.3 s each cycle; a standing robber crossing then takes 3 x 3.5 = 10.5
  hearts = dead from full health (20 HP). The dark window (0.7 s) exists, but one mistimed step kills.
- Evidence: same formula as F1; live windows computed from traps.sk:419-425.
- Fix: damage=1 on all three (3 x 2 = 6 hearts worst case at d4), or keep damage=2 on the low beam only.

### F3. Vertical "pillar" lasers are single 0.06-thick poles, not walls (MAJOR)
- Where: PLAN 7.2 T16-T21 (jewelry obby 2: `604.5 80 386.5 604.5 86 386.5` etc.), 7.3 T9-T10 (bank bay
  `602.5 57 302.5 602.5 63 302.5`).
- Problem: both ends share x and z, so each laser is a vertical rod at one point. Obby 2 (a 30 x 35 floor) has six thin
  poles to walk around: the whole "Moving Lasers" floor is no obstacle. The bank's "pillar wall" is two poles in an
  8-wide bay.
- Evidence: traps.sk:140-168 (a laser is the segment A-B with radius thickness/2 = 0.03, core.sk:1203).
- Fix: make them horizontal or diagonal spans between the pillar pairs, e.g. obby 2 pairs as walls across the floor:
  `601.0 80.4 386.5 615.0 80.4 386.5` (low) and `601.0 81.65 396.5 615.0 81.65 396.5` (duck) style beams, blinking, one
  per pillar pair; bank T9/T10 as `599.0 57.4 302.5 607.0 57.4 302.5` and `599.0 58.65 302.5 607.0 58.65 302.5`
  blinking with offsets 0 and 2. Re-check the stack rule from F1 (<= 2 beams on one line).

### F4. Casino cop spots C2 and C3 cannot reach the heist (MAJOR)
- Where: PLAN 7.4 `/dcops casino add` C2 (870.5 73 388.5 plaza), C3 (810.5 65 430.5 roundabout); 7.5.
- Problem: cops.sk makes cops round-robin over the spots, so 2 of every 3 cops appear at C2/C3. The only public way
  into B1/B2 is the staff stair, which L1 bars when the alarm trips; the drain hatch G7 is a closed safe gate. Those cops
  stand on the plaza or the roundabout while robbers fight the C1 third in the antechamber; an assault is never
  "repelled" early (its unreachable cops stay alive), and the finale's defence is a third of what the numbers say.
- Evidence: cops.sk:114-122 (`mod({-cop::next::h}, size of spots) + 1`), PLAN 6.3 / 7.4 L1.
- Fix: put all three spots on the east lawn by the tunnel portal (e.g. 925.5 65 349.5, 925.5 65 353.5, 925.5 65
  358.5), or keep one plaza spot only if the east terrace stair gives a short path to the portal (test 2.9d). Same check
  for the bank: (662.5 65 337.5) and (662.5 65 262.5) are ~130 path blocks from the vault (Citizens range 100); move
  them to Bank Street level with the door, e.g. (660.5 65 296.5) and (660.5 65 305.5).

### F5. Jewelry office turret T27 watches the safecracker (MAJOR)
- Where: PLAN 7.2 T27 `camera 615.5 90.0 404.5 180 20 ... angle=30 range=8`, G10 `615 87 405 616 88 405`.
- Problem: the lens hangs 0.5 block in front of G10 looking north at the doorway, so a robber standing at the keypad
  (z ~403, head y ~88.6) is 23 degrees off its axis inside range: it is shot 1.5 hearts every 0.5 s (d2) for the whole
  crack, and a hit closes the keypad. The plan's "watches the doorway, not the safe" is false.
- Evidence: vector cam->head (0, -1.4, -1.5) vs view (0, -0.34, -0.94): dot 0.92 -> 23 deg < 30; CLAUDE.md Loot ("a hit
  or walking away closes it"); traps.sk:206-212 (turret every 0.5 s).
- Fix: move T27 to the doorway side looking into the office from above the curtain, e.g. `615.5 90.0 399.5 0 35
  effect=damage damage=1 angle=25 range=6`, and test that a robber at the keypad (x 615..616, z 403..404) is outside its
  cone; or remove it (the VIP curtain is the office's trap).

### F6. Bank T2 cone contains the manager's safe G2 (rule 2.1) (MAJOR)
- Where: PLAN 7.3 T2 `camera 612.5 73.5 288.5 90 15 effect=alarm` (default angle 30, range 12), G2 `601 71 284 602 72 284`.
- Problem: the nearest G2 cell is 10.8 blocks away and 23 degrees off the view axis, inside the cone. city.js check's cone
  test (9.3) fails, and if the office wall isn't opaque the alarm trips on whoever cracks G2, contradicting "Quiet: ...
  the mezzanine safe".
- Evidence: core.sk:1224-1225 (angle 30, range 12); vector (-10, -1, -4) vs (-0.966, -0.259, 0) -> dot 0.918.
- Fix: `angle=20 range=9` and yaw 70 (aims at the office door south of the safe), or move G2 to the office's west wall
  (x 597 face) out of the cone; run the cone test again.

### F7. Region setup lines use the wrong WorldEdit coordinate syntax (MAJOR)
- Where: PLAN 7.1 `//pos1 598 56 374   //pos2 634 97 414` (all four regions).
- Problem: WorldEdit's `//pos1 <coordinates>` takes one comma-separated vector; three space-separated numbers are
  refused, so no region gets defined.
- Evidence: the town's working setup writes `//pos1 472,63,774` (tools/build/town/SETUP.md:53, town.js:589).
- Fix: `//pos1 598,56,374`, `//pos2 634,97,414`, and the same for bank, casino and district_rising_city; city.js setup
  should print them like town.js:589, one command per line.

### F8. "2..3 air above every pile" check fails most piles (MAJOR)
- Where: PLAN 9.1 shared rules and 9.3 city.js check "pile cells have 2..3 air above".
- Problem: as written, almost every pile breaks it: the bank and casino vault piles at y 49 / 57 have 5-6 air above
  (rooms 7 high), the bank tills (lobby double height: air to y 76), casino B1 desks (5), jewelry P8 (obby 1 landing at
  y 73: air 74..78) and P9 (obby 2 at y 80: air 81..85), casino P6 (ledge y 58: air 59..62). A builder running the
  check either fails or adds lids everywhere.
- Evidence: PLAN table heights (4.2, 5.2, 6.2) vs the pile y in 7.2-7.4; loot.sk itself checks nothing about air.
- Fix: define it as "the pile's block is solid and the next 2 blocks up (3 when layers=3) are air; anything higher may
  be a lid or open", and check exactly that.

### F9. The jewelry roof route skips both laser floors (MAJOR)
- Where: PLAN 4.2 Roof, 4.3 steps 1 and 6.
- Problem: the fire escape (outside the region) climbs to the roof, the three hut doorways are open, and flights A/B
  go straight down to the final floor: P10, the office, G10 and the Blue Heart ($6,000 of $26,000) are reached with only
  T22-T26 in the way, and the vent drops to the ground floor. Obby 1 and obby 2 become optional; "climb two laser
  floors" doesn't happen.
- Evidence: PLAN 4.2 ("three open doorways (no door blocks)"; vent ladder down to the ground floor).
- Fix: make the roof an exit only: the fire escape's top 3 rungs start at y 92 but the bottom stops 4 blocks above the
  alley (a drop down, no climb up), and the vent's ladder ends 3 blocks above the ground floor (drop only); or put the
  north hut's doorway behind the office (so the way down leads through obby 2 first) and keep G1 the only way in.

### F10. plan-layout.js still draws the Museum region (MAJOR)
- Where: PLAN 1, 8 ("out of step"), 12 call 6; tools/build/city/plan-layout.js:44, 51, 80, 198, 200.
- Problem: plan-layout.js says museum [841, 60, 330, 898, 97, 371] (a region over the public floor) and "museum
  module"; PLAN says the numbers are generated together and plan-layout.js is the source of truth. A builder copying
  COMMON from it gets the wrong REGION and BOX names.
- Evidence: plan-layout.js:44 `museum: [820, 296, 920, 400]`, :51 `museum: [841, 60, 330, 898, 97, 371]`.
- Fix: regenerate plan-layout.js from PLAN section 8 (casino box and region y 55..71), rename COLOR/spot comments,
  re-render, before any module is written.

### F11. Solo carry limits: one Drill, three Safe Kits (MINOR)
- Where: PLAN 5.3 (Box 167 "a second, short drill"), 6.3 (G4 and G5), 7.4 clear time.
- Problem: tool::drill::max 1 and tool::safe-kit::max 3. A solo bank robber can't do G4 and Box 167 in one trip, and
  needs G3 + G7 (+ G6) kits just to get in and out, leaving G2 unopened. The casino solo route uses all 3 kits
  (G1, G6, G7). Not wrong, but the plan's solo numbers and "crack G7 while it drills" should say so.
- Evidence: core.sk:1574, 1580.
- Fix: state in 5.3 / 7.3 that Box 167 and the deposit shutter are crew objectives; optionally make the bank's G7 a
  plain one-way drop (no kit) so the cold exit doesn't cost a kit.

### F12. Bikes double the chase radius (MINOR)
- Where: PLAN 6.1 / 6.3 (getaway by the drain to the channel bikes), 7.5.
- Problem: once a hunted robber sits on any vehicle the chase radius is 2 x 100 = 200 for the rest of the chase, so
  the "cold" drain-and-bike getaway has to get 200 blocks from (870, 63.5, 351) (past Bank Street), on foot only 100.
- Evidence: heists.sk:919-928, core.sk:406.
- Fix: say it in 6.3 / 7.4 (the bike trades speed for distance), and put the GPS hand path and a second bike stand
  toward x <= 670 on 2nd Street, or drop the channel bikes and keep the foot getaway.

### F13. Staff-stair lock L1 leaves a gap above it (MINOR)
- Where: PLAN 7.4 `/dheist lock casino add 844 66 338 846 70 338 iron_bars`.
- Problem: the stair hole (x 844..846, z 338..344) is cut through the ceiling y 71 and slab 72, so y 71+ above the bars
  is open; a jump from the z 343 step (feet 71) can land on the bars and drop to the landing (cops' chase onto the
  public floor is the reverse risk).
- Evidence: PLAN 6.2 stair (feet 73 at z 345 to 66 at z 338) and the region top 71.
- Fix: `add 844 66 338 846 71 338` and keep the ceiling y 71 solid over z 338..340 (cut the hole only z 341..344).

### F14. polished_andesite_wall does not exist (MINOR)
- Where: PLAN 5.2 manhole bollards (also design/decision.md:244).
- Problem: vanilla has andesite_wall; polished andesite has only slab and stairs. The registry check fails.
- Evidence: 26.1.2 block list (polished_andesite, _slab, _stairs only).
- Fix: `andesite_wall` or `polished_blackstone_wall`.

### F15. COMMON uses MIX.walk, which isn't defined (MINOR)
- Where: PLAN 3.2 "sidewalks MIX.walk (light gray)", 8 MIX.
- Problem: MIX has no `walk`; a streets builder writing `pick(..., MIX.walk)` crashes.
- Evidence: PLAN 8 lines 547-559.
- Fix: add `walk: [['light_gray_concrete', 100]]` to MIX (the prison uses plain light_gray_concrete,
  jail/outdoors.js:263-264).

### F16. Bank lockdown boxes overwrite the pylon and may seal the mezzanine (MINOR)
- Where: PLAN 7.3 L2 `628 65 303 628 76 318`, L4 `608 65 319 627 75 319`, L5 `607 71 292 607 74 315`.
- Problem: heistLockdown fills the whole box with bars (`set blocks within`), so the 4-wide brick pylon at the SE
  corner (x 625..628, z 316..319) turns to bars during an alarm; L5 runs the full mezzanine edge, and if the mezzanine
  stair arrives at x 607 robbers on the mezzanine are boxed in (7.5 "never boxes the last way out").
- Evidence: heists.sk:1024-1034.
- Fix: stop L2 at z 315 and L4 at x 624; split L5 around the stair's top (name its z in 5.2).

### F17. Bank manhole is an open 15-block drop on a public plaza (MINOR)
- Where: PLAN 5.2 manhole x 574..575, z 299..300, open to y 64, ladder to the tunnel floor y 48.
- Problem: a 2x2 hole with corner bollards; walking players fall 15 blocks (about 6 hearts) where the ladder isn't.
- Fix: a 1x1 shaft with the ladder on its wall, or a 2x2 shaft with ladders on two walls and an iron-bar ring with a
  1-wide gap at the ladder.

### F18. Small inconsistencies to fix in the text (MINOR)
- 1 table: "mid (duck) = feet + 1.0 (alarm)": 1.0 is a jump beam (h < 1.27); duck is 1.65.
- 3.1 LEG z 296..339 vs COMMON `LEG.z2 355`; 3.3 cites "section 9.4" (doesn't exist: 9.2); 4.2 "deck x 632..634 over
  Bank Street" (it is the region's east forecourt, Bank Street starts at x 640).
- 4.2 workshop "z 403..410 with G9 in its south wall" but G9 is at z 409 and P13 at z 410: the workshop is z 403..408.
  The vent shaft (z 388..389) enters the "NW corner" (z ~377): say "the west wall at z 388..389".
- 6.2 back stair "from feet 64": B1 feet are 65.
- 9.1 "safe and drill gates iron" vs the deepslate/gold vault faces: say "solid, non-glass".
- "2nd Street" duplicates the town's 2nd Street (tools/build/town/streets.js:67): name it e.g. "Vault Street".
- The bike stands `dbike spotat jailbreak 601 65 360 90` sit on block corners: use 601.5 65 360.5 (bikes.sk:550 centres
  `spot add` the same way); same for 565 / 866 lines.
- Setup lines carry `# comments`; /dtrap and /dloot only ignore them by luck (a number in a comment, e.g. "obby 1",
  becomes a positional number; harmless today because 6 numbers come first). city.js setup should strip comments.
- 7.3 / 7.4 state pool and escape settings without commands; print `/dheist set bank pool 80000` etc. so
  `/dheist dump` and a later core.sk change don't drift.

### F19. Obby 1 lasers leave a free strip; stepping blocks do nothing (MINOR)
- Where: PLAN 7.2 T8-T15 (all z 381..404 or x-spans at z 388.5 / 398.5), 4.2 stepping blocks.
- Problem: z 377..380 along the north wall has no beam, so both halves are crossed with 2 low jumps each; every beam is
  h 0.4 (jumpable), so the stepping blocks aren't needed.
- Fix: run T10/T11/T14/T15 from z 377.0 to 404.0, and make two of the eight beams duck beams (h 1.65) so the stepping
  blocks (feet 74) matter: a duck beam at 75.65 over a block forces the floor route, etc.

### F20. Duck lasers on the flights (T22/T23) depend on unspecified step heights (MINOR)
- Where: PLAN 7.2 T22/T23 at y 91.65; 4.2 flights A/B x 611..613 (no step table).
- Problem: duck needs h in [1.49, 1.78] above the feet at that z; with stairs or slabs feet vary by 0.5 per step.
- Fix: put each beam over a flat landing of the switchback at a known feet height (e.g. landing feet 90.0 -> beam
  91.65) and list the flight steps in 4.2.

### F21. Diamonds plates T24-T27 are avoidable (MINOR)
- Where: PLAN 7.4 T24-T27 around P12 (853, 57, 354).
- Problem: loot reach is 4.5 from the eye (core.sk:1245); robbers grab from 2 blocks away without stepping on a plate.
- Fix: a 5x5 ring of plates (radius 2) or a low blinking laser ring instead.

### F22. Turrets out-damage level-5/45 robbers fast (MINOR)
- Where: PLAN 7.2 T4 (d2, damage=1 -> 1.5 hearts every 0.5 s), 7.4 T10 (d4, damage=1 -> 2 hearts every 0.5 s).
- Problem: 3-4 hearts a second for anyone not sneaking; at the jewelry (the level-5 safe mission) a first-timer dies
  in about 3 s of island looting.
- Evidence: traps.sk:137, 212; core.sk:1183-1185, 1230.
- Fix: `every=1.0` on T4 and T10 (1.5 / 2 hearts a second), or damage=0.5.

### F23. The casino floor's games are a fourth new system (MINOR)
- Where: PLAN 6.1 / 6.2 "the games are casino.sk's" (design/casino-games.md), furniture `city_display` models.
- Problem: casino.sk and the slot/table models don't exist; the brief allowed up to 3 new mechanics (M1-M3 used).
  The heist itself doesn't depend on it (good), but at launch the gaming floor is an empty hall.
- Fix: list casino.sk as an owner-requested separate system (CLAUDE.md 2026-10-28) with its own plan, and add a launch
  fallback for the floor (static props) in 6.2.
