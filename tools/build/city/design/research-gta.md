# GTA heist research for the city's Jewelry Store, Bank and Museum

Research for the owner's 2026-10-26 request: Jailbreak's Jewelry Store, Bank and Museum, "but maybe change up the heist
themes a little bit, maybe find some ideas from gta or payday 2". This file covers GTA only: what each GTA heist is made
of, what makes it fun to replay, and how each piece maps onto Donating's existing mechanics (or a small new one). Facts
are paraphrased from the sources at the end. Anything marked *(memory)* comes from general knowledge of the games and
was not confirmed by a source fetched today. Donating facts come from CLAUDE.md, core.sk, loot.sk and story.sk as of
2026-10-26.

## 0. The short version

1. **Two ways in, one loud and one quiet** (Jewel Store smart/loud, Big Score subtle/obvious, Casino's three
   approaches, Kortz Center's four entrances). On Donating the choice happens in the world: every building gets a
   front door the cameras watch and a second way in (roof hatch, vent crawl, sewer, loading bay) that skips a
   different set of traps. No menu, no prep missions.
2. **A short window, then a chase** (Jewel Store, Pacific Standard). This is the escape clock plus the advanced
   alarm's warning, assaults and chase radius we already have. GTA's only extra is that the window is *visible and
   short*. Show it, and keep the smash part fast.
3. **One big primary target and many small secondaries** (Cayo Perico, Kortz Center, Casino vault). This already
   works on Donating: a pile can set its own `piece=` and `take=`, so one centerpiece worth $10-20K with a 5-6 s hold
   sits next to $250 jewels.
4. **Random loot at fixed spots** (Cayo's secondary loot types change per run; the Casino vault holds cash, art, gold
   or diamonds; Kortz rotates the painting weekly). Donating already rolls each pile's value per opening, but a pile
   always shows at least one piece (loot.sk `lootRollPile`: `lo = max(1, ...)`), so nothing *moves* between runs. A
   tiny "one of N plinths" or "style per opening" option would give a lot of replay value (new mechanic N5).
5. **Each gate type is a GTA role.** Smash = Jewel Store grab, Safe Kit keypad = the hacker's minigame, Drill with jam
   QTE = the Fleeca/Casino drill, the alarm and the cop assaults = crowd control and the shootout. The head-start rule
   (whoever opens it gets the piles behind it first) rewards the player who does the work, as GTA's roles do.
6. **Any gate is a door.** loot.sk turns a gate's blocks to air when it opens (`lootGateAir`). So a drill gate can be
   a walk-through vault door (up to 27 blocks), a safe gate can be a keypad door into a room, and a smash gate with
   no pile can be a glass skylight you break to drop in. Casino keypad doors and the Kortz skylight need nothing new.
7. **GTA's elite challenges are jobs.sk's ★ bonuses.** These already exist: In and Out, Quiet Hands, Ghost, Code
   Breaker, Wheelman. Heist-specific ones would fit well: Clean Sweep (every case in one run), Quick Grab (cases
   inside 60 s), No Laser.
8. **A getaway is a route, not a vehicle.** The exits that worked in GTA were bikes through a storm drain, tunnels,
   rooftops, the loading bay and a vehicle swap. On Donating these are cop-spot placement (the heat comes from the
   street side), lockdown boxes that shut the front door when the alarm trips, and a back route to bike spots
   (bikes.sk's hotwire), a drain or a rooftop line for the Grappler.
9. **Best new mechanics (pick up to 3):** N5 rotating centerpiece and vault contents, N2 fuse box / laser group off
   (Kortz panels, Casino EMP), N1 keycard from a guard plus a reader door (Casino passes, Union Depository elevator
   key, reusing the prison's reader code). Runners-up: N3 thermite breach, N7 quiet-run sale bonus, N4 bank tellers
   who reach for the panic button.
10. **What does not carry over:** long freemode prep chains, instanced private crews, fail states, hostages you must
    not kill, and payout cuts. Donating heists are shared races that never fail; the risk is losing loot at 0:00 or
    on death.

## 1. Donating's toolbox (the targets of every mapping)

| Tool | What it does (short) | GTA equivalent |
|---|---|---|
| `pile` | up to 12 cells and 24 pieces; value rolled per opening; hold right-click; styles cash $100/0.8 s, jewel $250/1.0 s, gold $500/1.5 s, goods $200/1.0 s, art $2,000/3.0 s; `piece=` and `take=` can be overridden per pile | cash trolleys, gold stacks, paintings, display jewels, deposit-box contents |
| `smash` gate | hold 1.5 s; the glass turns to air for the run; the smasher gets the nearest piece behind it at once; up to 27 blocks; sounds like glass | Jewel Store cases, Kortz display cases, a skylight |
| `safe` gate | 4-digit Mastermind keypad, a Safe Kit (level 5), a personal code per safe, 6 s head start; **its blocks turn to air** | the hacker's keypad or fingerprint hack, an office wall safe, Casino keypad doors |
| `drill` gate | a Drill (level 15), 60 s, jams that are a timing QTE, trips the alarm in advanced heists, the last fixer gets 10 s head start; **turns to air** | Fleeca box drill, Casino vault drill or laser, Pacific Standard vault |
| lasers | static or blinking, any angle; jump under 1.27, duck 1.49-1.78; `effect=alarm` (light blue) only trips the alarm | Casino and Kortz laser grids, Jailbreak's lasers |
| plates, collapsing floors | hurt; a floor drops into a pit at least 2 deep inside the region | (Payday more than GTA) |
| cameras | a view cone with optional sweep; trip the alarm (advanced) or act as turrets (`effect=damage`) | Casino and Kortz CCTV, Cayo guards' sight |
| alarm (advanced) | warning (`difficulty::<d>::alarm::warning`, default 20 s), then assaults and breaks, lockdown boxes, WANTED until out of the chase radius (100 on foot, x2 once in a car) | GTA's wanted level, Pacific Standard's "every cop outside in two minutes", Cayo's compound alert |
| lockdown boxes | `/dheist lock <h> add x1 y1 z1 x2 y2 z2 [block]`: any box, shut when the alarm trips | Jailbreak jewelry lockdown, GTA doors sealing |
| cop spots | where every wave arrives (street corners) | which side the heat comes from, so the designer picks the "clean" exit |
| escape clock | 6 / 8 / 10 min (d2-d4), starts at the first robbery, halved when everything is emptied, 0:00 loses the run | the hacker's window, Kortz thermal sensors |
| bikes.sk | bike spots near a building; hotwire QTE; a stolen bike to ride off | Jewel Store dirt bikes, Pacific Standard Lectros |
| Grappler (level 30) | grapple hook | rooftop escapes |
| dropped duffel | a death drops the bag's loot; anyone can pick it up for 2 min | the Jewel Store crew member who drops his diamonds |
| jobs.sk ★ bonuses | paid extras on contact jobs | elite challenges, payphone hit bonuses |
| Vic's Wanted List | weekly +30% on one heist, +15% on one difficulty | the Casino buyer, Kortz's buyer requests |
| prison code (borrowable) | keycards and readers, C4 breach on a gate (timed), punch box, hold-to-search spots, guards with view cones, handcuffs | Casino passes, thermite, EMP, guard patrols |

Pools: d2 $24K, d3 $80K, d4 $240K. Bags: $2K, $6K (level 5), $15K (10), $40K (25), $100K (60). Bag room is counted in
dollars, so GTA's "value per bag space" choice (gold over cash in Cayo) becomes **value per second of holding** on
Donating (art $667/s, gold $333/s, jewel $250/s, goods $200/s, cash $125/s) plus how dangerous the spot is.

## 2. The heists

### 2.1 GTA V: The Jewel Store Job (Vangelico, story mode)

**What it is.** In planning you pick an approach. In the **Loud** approach, the hacker cuts security, Michael takes
down the guard and a gunman controls the crowd. In the **Smart** approach, Franklin climbs to the roof and drops BZ
gas into the store's air-conditioning, and the crew walks in on sleeping staff. Inside there are about 20 glass
cabinets to smash before the alarm resets. The hacker announces the window, and its length depends on the hacker's
skill. The gold-medal targets are "Quick Grab" (all the jewelry within 50 s) and "Clean Sweep" (all 20 cabinets).
Staying inside when the alarm comes back on fails the mission. The escape is on dirt bikes through a construction
tunnel under the freeway and down the storm drains of the LS River to a truck. A weak crew member (Norm) crashes and
drops his share, and the player can pick it up.

**Why it plays well.** A short, readable burst with a visible count of cases. The value of everything else in the
mission depends on how many cases you get. The exit route is different from the way in. A crew loss turns into loot
lying on the ground.

**Mapping onto Donating**

| GTA piece | Donating (existing) | New? |
|---|---|---|
| ~20 glass cabinets | 16-20 `smash` gates (one glass block or 1x2 glass per case), each with a `jewel` pile of 1-2 cells and 2-4 pieces `behind=` it. The 1.5 s smash and the free piece is the burst. | none |
| The hacker's window, Quick Grab | the d2 escape clock (6:00), halved when emptied. In an advanced version, the alarm warning is the window. A ★ "Quick Grab: every case you smash within 60 s of the first". | ★ only |
| Clean Sweep (all 20) | ★ "Clean Sweep: smash 10+ cases in one run" (shared heist, so per robber) | ★ only |
| Smart approach: roof AC vent | a rooftop AC unit with a 1-high vent crawl (the prison course already uses crawling) dropping into the back office, past the showroom lasers. The front door is watched by cameras (turrets if not advanced). | none |
| Loud approach | the front doors; lasers across the aisles; a camera sweeping the counter | none |
| The manager (Michael subdues him) | the manager's office **safe** (needed for Mara ch. 2 at level 5): a wall safe gate with cash and jewel piles behind it ($3-5K) | optional: N1 manager keycard |
| Bikes through the storm drain | bike spots (`/dbike spotat`) in the back alley; a storm-drain culvert next to the store as a route away from the cop spots on the main street | none |
| Norm drops his diamonds | the dropped duffel on death already does this (PvP and cops) | none |
| BZ gas | skip it (no NPC staff to knock out); the vent crawl carries the theme | - |

### 2.2 GTA Online: The Fleeca Job (2015, two players)

**What it is.** The first Online heist, made to teach the format. Two setups: scope the bank while the passenger
practises the hacking minigame, then steal a Kuruma armoured car. In the finale, one player (driver and security)
hacks the bank's doors and keeps the staff intimidated, and the other drills **one specific safety-deposit box,
167**, in a wall of boxes. The GTA drill is about steady pressure: push gently, the pressure drops after each pin
breaks, and pushing too hard or too long overheats it (it turns red and smokes), so "slow and steady" wins (one
guide gives about 30 s for a clean drill). Escape: drive the Kuruma to a spot under a bridge where a Cargobob
helicopter lifts the car away. Elite: under 5:20, under 6% car damage, nobody dies.

**Why it plays well.** It is tiny. One clear goal, one skill minigame, a short drive, and an extraction moment.

**Mapping**

| GTA piece | Donating | New? |
|---|---|---|
| Wall of deposit boxes, the one target box | a deposit-box room (walls of iron and polished-deepslate "box doors", no clickable blocks) with many small `goods`/`jewel` piles on ledges. Box 167 = a **small drill gate** (1-3 blocks, a single box) with a high-value `gold` or `piece=5000` pile behind it. The vault door is the second drill. | none |
| The drill minigame | the drill's jam QTE (3 hits in a row on the green slot) is our version; no change | none |
| Hack the door | a **safe gate used as a keypad door** into the box room (Safe Kit) | none |
| Crowd control | no NPC hostages; see N4 (tellers) if wanted | N4 |
| Kuruma / Cargobob extraction | losing the cops; a car doubles the chase radius (`alarm::car-chase-factor` 2), so GTA's "armoured car" fantasy is already a trade-off | optional N10 |
| Elite: time, no deaths | ★ In and Out (2:00+ left on the clock), Ghost (no trap touched) | none |

### 2.3 GTA Online: The Pacific Standard Job (2015, four players)

**What it is.** The big Online bank. Setups: track vans, hack, steal a convoy (for the thermal charges), and steal
four Lectro bikes from the Lost MC. Finale roles: **Hacker**, **Demolition** and two on **Crowd Control**. Crowd
control keeps an intimidation meter up by aiming at the civilians. If it falls too far the alarm trips, and killing
a hostage brings NOOSE (losing an elite challenge). Demolition puts **thermal charges** (they burn, they don't
explode) on the barred metal gate in the lobby, then on the door at the top of the stairs, then a third security
gate. The **hacker** opens the vault at a terminal, and the hack starts a timer (guides say about 5 min, and
"about two minutes" before every cop is waiting outside). Inside, two **cash trolleys**. **Money is lost when the
carrier is shot**, so guides say to give all the money to one player and protect them. Escape: fight out to the
four bikes; the map suggests a route, and taking a different turn skips the first roadblocks.

**Why it plays well.** Everyone has a job at once. There is a chain of breach doors, each a small win. The loot can
shrink under fire, so the crew protects the carrier. The street outside is a gauntlet, and route knowledge pays.

**Mapping**

| GTA piece | Donating | New? |
|---|---|---|
| Barred lobby gate, stair door, third gate | a chain of gates down to the vault: a **safe gate as the barred security door** (keypad), then the **drill** vault door. Any gate's blocks go to air when it opens, so each one really opens the way. | N3 thermite would be the loud alternative to the keypad on the same door |
| Hacker at the vault terminal | the Safe Kit keypad on an inner cage (a safe gate) inside the vault | none |
| Two cash trolleys | `cash` piles on cart builds (iron trapdoor sides, chains, a smooth stone slab top; pile cells on top with 2-3 air above) | none |
| Gold and the bonds | `gold` piles on pallets inside the vault, an inner cage (safe gate) with a big-piece pile | none |
| Intimidation meter, hostages | NPC tellers who go for the panic button unless a robber is near (N4). Without it, the cameras and lasers are the alarm triggers. | N4 |
| Timer after the hack, cops outside in ~2 min | advanced alarm: the drill trips it; warning, then assaults from the cop spots on the street side | none (set the warning per difficulty) |
| Money lost when shot | do NOT copy at launch (see N8). Death already drops everything as a duffel. | - |
| Four Lectro bikes, roadblock route | bike spots behind the bank; cop spots on the main street so the back alley is the smart way out | none |

### 2.4 GTA V: The Big Score (Union Depository), plus Online's Union Depository Contract

**What it is.** The story finale, with two approaches. **Subtle:** stinger strips stop two Gruppe Sechs armoured
trucks, the crew takes their place, is escorted into the vault, loads **gold onto trolleys** and wheels them to the
**lift** and the vans. Under a freeway the gold moves into modified Gauntlet cars (a vehicle swap). Franklin
**changes traffic lights** to guide the getaway, and the gold-medal goal asks for fewer than 10 light changes.
**Obvious:** Franklin drills down into the vault with a mining driller from the subway side, the gold is pushed to
a spot where **helicopters winch it out**, the crew fights NOOSE, and the helicopters **drop the gold onto a moving
train** (gold-medal goal: within 30 s). Online's *Union Depository Contract* (LS Tuners, 2021) is the small
version: preps get an **elevator key** (from a businessman), a security vehicle and the **vault code** (from a
blackmailed manager); the finale parks in the depository's underground **loading bay**, uses the ID on the
elevator keypad, opens the vault, takes the gold, then fights back up past snipers.

**Why it plays well.** The gold is heavy and slow, so moving it is the set piece. The way in uses a staff route (a
truck, the loading bay, the elevator). Helicopter, train and vehicle swap give a big, memorable getaway.

**Mapping**

| GTA piece | Donating | New? |
|---|---|---|
| Gold on trolleys | `gold` piles on pallets and carts in the vault (gold is $500 a piece in 1.5 s holds: slow, valuable) | none |
| Loading bay + elevator with a key | the bank's back: a loading bay with a parked armoured truck (decor) and a staff stair or lift shaft down to the vault level. A keycard (N1) from a guard opens it; without N1 it is a **safe gate keypad door**. | N1 optional |
| Vault code from the manager | the Safe Kit keypad already is a code puzzle; a manager NPC who "gives" the code is not needed | - |
| Subway driller | a basement maintenance tunnel or old subway platform under the street, reaching the vault level from outside, as an entry and escape | none |
| Helicopter winch / train drop | not buildable as a mechanic; a rooftop helipad as a Grappler line to the next roof is the closest | - |
| Vehicle swap, traffic lights | the chase radius; a car doubles it. A "drop" where the chase ends (N10) is the vehicle-swap idea. | N10 optional |

### 2.5 GTA Online: The Diamond Casino Heist (2019)

**What it is.** The most replayable GTA heist. Three approaches, each with its own preps: **Silent & Sneaky**
(stealth: nano drone, vault cutting tool, infiltration suits, an EMP), **The Big Con** (disguises: in as Gruppe
Sechs, out as NOOSE), **Aggressive** (thermal charges, vault explosives, a boring machine, heavy armour). Scoping
the casino unlocks more entrances (main door, two side doors, roof terrace keypad doors, helipad doors, the
**security tunnel** under the racetrack, the **sewer**) and more options. Inside: **keypad and fingerprint hacks**
on doors *(memory: the fingerprint hack matches print pieces; the keypad hack is a pattern/timing match)*, guards on
patrol routes, cameras, **Level 1/Level 2 security passes** that skip some locked doors (the Level 2 pass is a prep;
the Level 1 detail is *(memory)*). The vault is behind a **mantrap where two players swipe vault keycards at the
same moment**, on the way in and out. The **vault contents vary**: cash (most common), art, gold, or diamonds (rare,
event-only). Plus a small secondary vault with the **daily cash**. The hired hacker gives a time window that is
longer while undetected than once detected (e.g. 3:30 vs 2:26 for one hacker). The exit is through any of the
entry points, then to a **buyer** (failing if the buyer is killed). Optional preps give a **decoy** getaway and a
**clean vehicle** stashed to swap into *(memory)*. **The same approach can't be run twice in a row**, and the one
you just did comes back in **Hard Mode** (more pay).

**Why it plays well.** The same building with different routes each time. A layered security ladder (outer doors,
passes, keypads, mantrap, vault door). A vault whose contents are a surprise. The window shrinks once you are seen,
so stealth pays without being required. Forced variety (no repeating an approach).

**Mapping**

| GTA piece | Donating | New? |
|---|---|---|
| Many entrances (roof, sewer, tunnel, staff) | every big heist gets 2-4 entrances, each skipping or adding different traps: the front past cameras, the roof (smash a skylight gate or a hatch), the sewer or tunnel into the basement | none |
| Keypad / fingerprint doors | **safe gates as keypad doors** (they turn to air when cracked; the cracker gets the head start on the room's piles) | none |
| Security passes from guards | N1: a keycard dropped by a hit guard opens a reader door (the prison's readers) | N1 |
| Mantrap: two keycards at once | N9 two-key door; bonus room only, never on the main route | N9 (not recommended at launch) |
| Guards on patrol | prison guards' view cones (jailcops.sk) could be borrowed; at launch, **sweeping cameras** play the guards' role | - |
| EMP: lights and cameras off | N2: a fuse box held 3 s turns a camera or laser group off for 30 s | N2 |
| Vault contents vary | N5: a pile option that picks its style per opening (cash 60 / gold 30 / art 10) | N5 |
| Daily cash in a side vault | a small side room (safe gate) with a `cash` pile: quick, reliable money for the first in | none |
| Shrinking window once detected | the escape clock + the alarm: stealthy robbers have the whole clock to themselves; once the alarm trips, assaults eat the time | none (N7 rewards staying quiet) |
| Buyer, decoy, clean vehicle | selling at the base; Vic's Wanted List is the "buyer bonus"; N10 drop points for the vehicle swap | N10 optional |
| No same approach twice, Hard Mode | not needed: Donating heists are shared and the race changes each run. A weekly "hot" heist already exists in Vic's list. | - |

### 2.6 GTA Online: The Cayo Perico Heist (2020, solo-able)

**What it is.** An island heist. Scope it (the primary target, secondary loot, entry points, the compound's
layout), pick an approach vehicle and an infiltration point (airstrip, docks, beaches, the **drainage tunnel**
whose grate you cut). In the compound: the **primary target in a glass case in the basement** (it **rotates** after
the first run: tequila, a ruby necklace, bearer bonds, a pink diamond, the Madrazo Files, a panther statue), El
Rubio's office with a **wall safe whose cash takes no bag space** and painting slots, and storage rooms with **cash
or gold tables and paintings** (the storage rooms need two keycards swiped together). Outside on the island:
cash, weed and cocaine in **padlocked lockups** (bolt cutters or a cutting torch), the airstrip warehouse, **dock
shutters held up by a lever while a teammate loots**. The positions are fixed, but **what spawns at each changes
between runs**. Each player's bag has limited room. A forum breakdown gives gold about two-thirds of a solo bag per
stack, a painting about half, cash about a quarter. So players choose by value per space, and solo players can't
carry everything. Escape: off the island (main dock, airstrip, the sea). Stealth is optional; the finale continues
if the alarm trips. There is a "hard mode" if you replan within 48 real minutes.

**Why it plays well.** One guaranteed big prize plus more loot than you can carry, so you choose every run. Fixed
spots with changing contents mean knowing the map pays off without the run being solved. The stealth-or-loud arc
belongs to the player.

**Mapping**

| GTA piece | Donating | New? |
|---|---|---|
| Primary target in a glass case | a single big-ticket pile behind a smash gate (or the vault) with `piece=10000-20000 take=5-6`; the one moment everyone races to | none |
| Primary rotates per run | N5 "one of N plinths": the centerpiece appears on one of 3 plinths per opening, so the race goes somewhere new each run | N5 |
| Secondary loot types change at fixed spots | N5 "style per opening" on the same piles | N5 |
| Office wall safe | a safe gate (the finale's safe) | none |
| Bag-space choice | dollar-capped bags + holding time; art is the fastest money per second but the slowest single grab (3 s exposed to cameras and lasers), cash the slowest. A good design puts the best rate in the worst spot. | none |
| Padlocked lockups | small `safe` gates (Safe Kit) or `smash` gates; on Donating the head start makes these mini-races | none |
| Lever shutters (one holds, one loots) | co-op: N9's family; skip at launch | - |
| Drainage tunnel grate cut | a sewer entry; the grate could be a 1-3 block smash gate in iron-bar style *(check: smash plays glass sounds; use glass panes in a grate frame)* | none |

### 2.7 GTA Online: The Contract (2021, Franklin's Agency)

**What it is.** Not a vault heist: a 13-mission story to recover Dr. Dre's phone, with two setups, three "data
leak" strands **playable in any order**, and a two-part finale. Alongside it run **Security Contracts** (Asset
Protection, Recover Valuables, Vehicle Recovery and others) in three tiers with higher pay per tier, three offered
at a time, plus **Payphone Hits**: a small base pay (~$15K) and a large **bonus (~$70K) for doing the kill the
specific way the caller asked**, with a 20 min cooldown.

**Why it plays well.** Non-linear strands, quick repeatable contracts on top of the big story, and the bonus
condition that turns a routine job into a puzzle.

**Mapping**

| GTA piece | Donating | New? |
|---|---|---|
| Payphone hit bonus condition | jobs.sk's ★ bonuses already pay extra (Quiet Hands, Ghost, Code Breaker, In and Out, Wheelman). Add heist-specific ★s per new heist: Jewelry "Clean Sweep", Bank "Box 167" (open the small deposit-box drill), Museum "No Laser" or "Quiet Pro" (the centerpiece without the alarm). | small: new ★ ids |
| Strands in any order | Mara's chapter 3 "rob 3 different heists" already does this; the three city heists are three strands | none |
| Tiered contracts | Mara's and Vic's jobs already pick a heist the player can rob | none |

### 2.8 GTA Online: The Doomsday Heist (2017-18, three acts)

**What it is.** Three acts of preps and finales against a rogue AI (Avenger mobile base, Bogdan's submarine, an
orbital cannon). The finale's core mechanic: a **node hacking puzzle** (route a signal through blue nodes and avoid
red ones; too many red hits restart it) done at several servers **while a teammate defends the hacker**. Once all
four are hacked, enemy spawns stop. Then the orbital cannon room destroys more servers, and a chase ends it.

**Why it plays well.** "Hold the point while someone works" is the most co-op beat in GTA heists. It ends with a
spectacle.

**Mapping**

| GTA piece | Donating | New? |
|---|---|---|
| Hack while a teammate defends | the **drill** already is this: 60 s, jams with a QTE anyone can fix, the alarm on mount, cop assaults during it. Build the vault approach as a defendable room (one door to watch, cover, a window to the street the cops shoot through). | none |
| Several servers in turn | several gates in a chain (keypad door, drill door, inner cage) | none |
| Enemy spawns stop when done | assaults already have breaks; no change | - |

### 2.9 GTA Online: The Kortz Center Heist (July 2026, an art museum: the closest match to our Museum)

**What it is.** A night raid on the Kortz Center art museum, run from a mansion Art Studio where a counterfeiter
makes a **forgery to swap for the week's primary painting**. Scouting is by CCTV, finding the primary and secondary
targets as in Cayo. **Four entrances**: the staff door with a cloned keycard (the slowest, with an elevator that
can be hacked), the **loading bay** (drive in a delivery van, a keycard by the containers; the fastest to the server
room), the **sewer** (a manhole in the hedge maze whose key spawns in one of five places per run), and the
**skylight** (rappel through the roof; for stealth). Three public gallery levels over a restricted basement
(security room, loading bay, vault). Guard patrols are fixed between runs. Cameras escalate suspicion; a **display
case alarm** at reception must be disabled before opening cases. In the basement: a **fingerprint door** (or noisy
**thermite**), a **code terminal** (6 digits from a prep), a **laser grid**: touching a laser hurts and trips the
alarm, but the run continues; three **deactivation panels** each switch off the lasers you have already passed.
Then a **vault keypad** memory puzzle, and **thermal sensors** that put a clock on your time inside. The **primary
painting is swapped for the forgery and takes no bag room**; secondary art fills the bag (a gallery painting is
about half a bag). **Taking damage while carrying loot lowers its value, and living witnesses and vault CCTV lower
the sale price** (wipe the footage at the computer outside the vault). Getaways: a dirt bike at the rear, a
helicopter on the roof (needs exit keys), or an armoured car in the car park. The buyer wants three specific
secondaries, with a bonus for all three.

**Why it plays well (for us).** It *is* a museum heist: galleries of art, a basement vault, lasers you can switch
off, a big-ticket primary, a rooftop or rear getaway, and a reason to stay quiet that isn't a fail state.

**Mapping (most of the Museum design can come from here)**

| Kortz piece | Donating | New? |
|---|---|---|
| Four entrances | front doors (cameras), **skylight = a smash gate with no pile** (glass in the roof; break it and drop to the top gallery onto a scaffold or ladder), **loading bay** (a keypad door: safe gate), **sewer** from a manhole in the plaza to the basement | none |
| Display-case alarm at reception | in an advanced heist, a camera over the cases and `effect=alarm` lasers in front of them; or N2 (a fuse box shuts the case alarm group) | N2 optional |
| Fingerprint door / thermite | safe gate (keypad) on the security room door; N3 thermite as the loud alternative | N3 optional |
| Laser grid, touching trips the alarm but you go on | `effect=alarm` lasers (light blue, no damage) mixed with damage lasers (red); low (jump), mid (duck), high; blinking | none |
| Deactivation panels behind you | N2: a fuse box beyond each laser section turns that section's group off (for the run or for 60 s), so the second robber in has it easier: rewards whoever goes first and gives late robbers a path | N2 |
| Vault keypad + thermal sensors clock | the drill on the vault door + the escape clock (d4 10:00); the alarm on drill is the "sensors" | none |
| Primary painting, no bag room | one big `art` pile with `piece=15000`, 1-2 pieces, `take=6` in the vault (it does take bag room on Donating: a d4 robber at level 45 has at least a $40K bag) | none |
| Secondary art about half a bag | `art` piles on plinths in the galleries, each behind a smash gate (a glass dome), $2,000 / 3 s | none |
| Damage and witnesses lower the value | N7: loot from a run whose alarm never tripped sells for +15% (inverted: a bonus, not a penalty) | N7 optional |
| Wipe the footage | a fuse box (N2) in the security room that shuts every camera group = "wiping the cameras" | N2 |
| Bike at the rear, roof helicopter, armoured car | bike spots by the loading bay; a rooftop with a Grappler line to the next roof; cop spots at the front | none |
| Buyer wants three specific pieces | Vic's Wanted List (+30% on one heist) already; a weekly "requested exhibit" is a possible later extension | - |

## 3. What makes GTA heists fun and replayable (and the Donating version)

1. **Choice of approach every run.** GTA does it with a planning menu and preps. Donating should do it in the world:
   every building gets at least two ways in (front past the cameras, plus a roof, vent, sewer or loading bay), each
   with a different trap set, and the vault reachable from both. A new robber takes the front; a veteran takes the
   vent.
2. **A ladder of security.** Casino: outer door, pass, keypad, mantrap, vault. Pacific Standard: gate, door, gate,
   vault. Each layer is a small win and a choke point. On Donating: glass, then keypad door (safe gate), then laser
   hall, then vault (drill), then inner cage (safe gate). Every gate turns to air when it opens, so this is buildable
   now.
3. **A guaranteed big prize plus more small loot than you can carry** (Cayo, Kortz, Casino). The dollar-capped bag
   and the holding times make the choice: the fastest $/s should sit in the most exposed spot.
4. **Fixed spots, changing contents** (Cayo types, Casino vault, Kortz painting, sewer key in one of five places).
   Donating rolls values but never moves the loot; N5 fixes that cheaply.
5. **Pressure that grows when you are seen** (Casino's shorter window when detected, Pacific Standard's two
   minutes). Donating's alarm, assaults and lockdown already do this; N7 would add the reason to stay quiet.
6. **A set-piece exit that differs from the entrance** (Jewel Store storm drain on bikes, Big Score train, Kortz
   roof or rear bike). Donating: cop spots on the main street, lockdown boxes that shut the front doors when the
   alarm trips (the box can be any box, not only windows; keep a second exit open), bikes or a drain or a Grappler
   roof line out the back.
7. **Roles without a lobby.** GTA assigns hacker, driller, crowd control. On Donating the roles emerge: the Safe Kit
   cracker, the driller and jam fixer, whoever holds the drill room against the assault. The head start pays the one
   who did the work, and the crew rule stops robbers inside from killing each other.
8. **Bonus conditions** (elite challenges, payphone-hit bonuses). jobs.sk's ★s plus new heist-specific ones.
9. **Rotation pressure** (Casino's no-repeat, Cayo's 48-minute hard mode, Vic's weekly list). Vic's Wanted List
   already picks the least robbed heist each week; the city's three heists should each be a natural pick for it.
10. **Don't copy:** long preps (Mara's chapters are our story layer), fail states (a run never fails, only loot is
    lost), hostages and killing penalties (no civilians in heists), cutscenes, instanced crews (Donating heists are
    shared races), losing money when shot (punishing on a server where cops focus one player).

## 4. Applied to the three city heists (set-piece menus, existing mechanics first)

These are menus for the designer, not a final layout. Each heist works with today's mechanics alone; "bonus" lines
are the new mechanics of section 5.

### 4.1 Jewelry Store (difficulty 2, level 5, 6:00, cooldown 10 min, pool $24K, needs a safe)

- **Jailbreak core kept:** a showroom of glass cases full of jewels, lasers and cameras, an upstairs, a roof way out,
  the lockdown.
- **GTA twists:** the Jewel Store Job's smash rush (16-20 cases: smash gates + jewel piles of 2-4 pieces, $500-1,000
  each), the Smart entry (roof AC unit, a vent crawl into the back office past the lasers), the manager's **wall
  safe** in the office (cash and jewel piles, $3-5K; Mara ch. 2), a centerpiece (a single `piece=3000` jewel or art
  pile under a glass dome on a plinth inside a ring of low and mid lasers: the Cayo primary at small scale), the
  back alley with **bike spots** and a drain culvert as the escape away from the street.
- **Advanced or not (decision):** default d2 is not advanced, so cameras can only be turrets. Jailbreak's signature
  lockdown and GTA's alarm window both need `advanced true`. Option A (default): turrets and damage lasers, no cops,
  quick and friendly at level 5. Option B: `advanced true` with a longer warning (e.g. 40 s: the hacker's window),
  d2's gentle cops (20 HP, revolver), lockdown boxes over the showroom glass and the front doors, cop spots on the
  street, so the alley, bikes and drain are the getaway. B gives level-5 players a taste of the chase.
- **Size:** about 30 x 22 x 16 (10,560 blocks).
- **★ ideas:** Quick Grab (every case you smash within 60 s of the first), Clean Sweep (10+ cases in one run), Ghost
  (no trap, exists).

### 4.2 Bank (difficulty 3, level 20, 8:00, cooldown 15 min, pool $80K, needs a vault door and safes)

- **Jailbreak core kept:** a lobby, a hallway of lasers down to the vault, a big round vault door, cash inside.
- **GTA twists:**
  - Pacific Standard's **breach chain**: lobby counter with teller tills (cash piles, $1-2K each: quick money for the
    first in), a barred security door to the stairs = a **safe gate keypad door**, a laser stairwell, the **drill**
    vault door, an inner **cage** (safe gate) with gold and the bearer bonds (`piece=5000`).
  - Fleeca's **deposit-box room**: walls of boxes with `goods` and `jewel` piles on ledges, and "box 167", a one-block
    **small drill gate** with a high-value pile (★ "Box 167").
  - Union Depository's **staff route**: a loading bay at the back with a parked armoured truck (decor) and a staff
    stair down to the vault level behind a second keypad door (or N1's keycard reader), and an old **maintenance
    tunnel** from the basement to a manhole across the street (the quiet way out).
  - **Cash trolleys and gold pallets** in the vault (cash on carts, gold stacked: slow and valuable).
- **Advanced or not (decision):** default d3 is not advanced. Pacific Standard is the loud bank, and an advanced Bank
  gives a level-20 getaway before the Museum and more variety for Mara's "getaway" contact jobs (they pick advanced
  heists). Vic's "drill a vault and lose the cops" (`adv,drill`, from level 45) is already covered by the Museum.
  Recommendation: advanced, the drill as the trigger, cop spots on the main street, lockdown boxes on the front doors
  and lobby windows, the loading bay or tunnel as the getaway.
- **Size:** about 40 x 32 x 26 with a two-level basement (33,280 blocks).

### 4.3 Museum (difficulty 4, advanced, level 45, 10:00, cooldown 30 min, pool $240K, the finale: safe + vault + getaway in one run)

- **Jailbreak core kept:** exhibit halls (the designer's Jailbreak research says which), lasers, a roof route.
- **GTA twists (mostly Kortz Center):**
  - **Four entrances:** front doors (sweeping cameras with `effect=alarm`), a **glass skylight** (a smash gate with no
    pile; drop onto a scaffold in the top gallery), the **loading bay** (keypad door: safe gate), the **sewer**
    (manhole in the plaza, tunnel to the basement).
  - **Galleries:** art piles under glass domes (smash, $2,000/3 s), jewel and goods cases, an antiquities room. A
    collapsing floor in one hall over a pit at least 2 deep (inside the region).
  - **Security room:** the **safe** (curator's wall safe; the finale's safe), and the fuse boxes if N2 is built
    ("wipe the cameras").
  - **Laser hall to the vault:** red damage lasers and light-blue `effect=alarm` lasers (touching one starts the
    alarm, the Kortz rule), static and blinking, low/mid/high; fuse boxes past each section if N2 is built.
  - **Vault:** the **drill** door trips the alarm (the finale's "vault"), then the defended drill room (Doomsday's
    "hold while it works"); inside, the **primary** (one or two `art` pieces at `piece=15000 take=6`), gold, and a
    small inner cage (safe gate) for a second Safe Kit run. With N5, the primary sits on one of three plinths per
    opening.
  - **Getaway (finale):** cop spots on the main avenue; lockdown boxes shut the front doors and the gallery windows;
    the ways out are the roof (a Grappler line or stairs down the back of the next building), the loading bay (bike
    spots, the player's own car within reach), or the sewer back out to a storm-drain outfall beyond the chase
    radius (100 blocks on foot).
- **Size:** about 52 x 44 x 34 (77,792 blocks; stay under 100K: keep the sewer tunnel outside the region and enter
  the region at the basement wall).

## 5. Candidate new mechanics (short specs; a design may take at most 3; none is required at launch)

Ranked by value for these three heists against build cost.

**N5. Rotating centerpiece and vault contents (Cayo primary, Casino vault, Kortz weekly painting).** Cheapest, and
it most improves replayability.
- `/dloot set <id> group <name>` on 2-4 piles: at each opening loot.sk rolls one pile per group (equal chance), and
  the others roll 0 pieces (no pieces, no hitbox, no marker; today `lootRollPile` forces at least 1 piece, so it
  needs a 0 branch).
- `/dloot set <id> styles cash:60,gold:30,art:10`: each opening picks the pile's style by weight and re-derives
  `piece`, `take` and the art from that style, with the value range unchanged (so the pool check still holds).
- `/dloot check` reports a group's value range as min/max over its members.

**N2. Fuse box: a trap group off (Kortz deactivation panels, Casino EMP, wiping the footage).**
- Traps get `group=<name>` (`/dtrap set <id> group vaulthall`).
- `/dheist fuse <h> add [x y z] group=<name> hold=3 off=60|run`: a block in the room; hold right-click 3 s (loot.sk's
  hold meter and prompt "Hold right-click · Cut the power"); every trap in the group is off for `off` seconds (or
  the rest of the run): laser displays hidden, cameras' cones and pointers gone, hits skipped; a spark sound and a
  "POWER CUT 0:59" action bar for robbers in the heist; the box shows a red LED while off.
- A fuse box sits **past** the section it switches (the Kortz rule), so it helps the next robbers, not the first.
- One use per run per box; armed traps come back at the next opening (the room reset).

**N1. Keycard from a guard + a reader door (Casino passes, Union Depository elevator key, Kortz staff card).**
Borrows the prison's readers and guard drop.
- `/dheist reader <h> add [x y z] door=x1 y1 z1 x2 y2 z2 open=8`: a reader block and a door box (iron, built
  closed); a robber holding the heist's keycard who clicks the reader opens the box (air) for `open` seconds (a
  follower gets through), or for the run with `open=run`.
- The keycard: a heist-run jail-style item in hotbar 6-8 (`keycard:<h>#<run>`), dropped by a heist **guard NPC**
  (clerk.sk-style, standing or walking a short route inside, never shooting: hit it twice with any weapon and it
  drops the card and ducks) or found at a hold-to-search spot (the prison's search code: "Hold right-click ·
  Search the desk", 2 s). Lost on leaving the heist, at 0:00 and on death.
- The reader door is always a shortcut next to a route that works without it (the laser hall).

**N3. Thermite breach (Pacific Standard thermal charges, Casino Aggressive, Kortz thermite door).**
- A gate kind `breach` (`/dloot add <h> breach [corners] [time=5]`, up to 27 blocks): hold 2 s with a Thermite (a
  shop tool, level 20, consumed) to plant; it burns `time` seconds (fire particles, a fizz) and the blocks turn to
  air for the run; in an advanced heist planting trips the alarm (loud); the planter gets the piles' head start.
- The loud twin of a keypad door: put a safe gate and a breach gate on two doors into the same room, so the robber
  without a Safe Kit, or in a hurry, blows the other one.

**N7. Quiet-run sale bonus (Kortz witnesses and CCTV, Casino stealth payouts).**
- bag.sk bagSell: a loot line `<h>#<run>` whose run never tripped the alarm (progress.sk's run note "loud" unset)
  sells for P x (1 + `heist::quiet-bonus` 0.15); the sale line says "Quiet run +15%". Never for stores. The finale
  always trips the alarm (its drill), so this rewards a robber who takes the galleries quietly and skips the vault:
  a real stealth-or-vault choice.

**N4. Tellers and the silent alarm (Pacific Standard and Fleeca crowd control).** For the Bank only.
- 2-3 Teller NPCs (clerk.sk reuse: `/dclerk <h> teller add`, no throwing). Once the run starts each teller's panic
  meter fills over `teller::panic` 25 s unless a robber holding a weapon stands within `teller::calm-range` 5 blocks
  in sight; a hit resets it. Full = `heistTripAlarm(h, "panic")` (advanced only), "A teller hit the silent alarm".
  A run where nobody watches the tellers goes loud sooner.

**N10. Getaway drop (Fleeca extraction, Casino clean vehicle, Big Score vehicle swap).**
- A WorldGuard region `drop_<h>` (a storm-drain mouth, a parking-garage level): a hunted robber of that heist inside
  it with no cop within 24 blocks in line of sight is released from the chase (counts as a getaway). Gives the
  escape a destination.

**Not recommended at launch:** N8 money lost when shot (Pacific Standard: harsh when cops focus one player; the
death duffel already covers it), N9 two-key doors and lever shutters (Casino mantrap, Cayo storage and docks: they
need two cooperating strangers; fine later for a bonus room only), loot weight slowing the carrier (Big Score gold:
the bag is virtual; a later idea), a hard mode for back-to-back runs (Cayo/Casino; Vic's list already rotates).

## 6. Things to check when building (found while mapping)

- A pile under a glass case: the pile's cell sits under the smash gate's glass block. The 2-3 air rule for pile cells
  probably can't count the gate. Try one case with `/dloot add` before building twenty.
- `smash` takes any solid block but plays glass sounds and says "Smash the glass": keep it to glass and panes (a
  skylight, cases, a grate made of panes).
- A safe gate used as a door: each Safe Kit cracks it once and it is open for everyone for the run. Only one
  `behind=` per pile, so the room's piles hang off the door, and the cracker gets a 6 s head start on them.
- `pile` value ranges can't roll 0 today (`lootRollPile`), so "sometimes empty" plinths need N5.
- Lockdown boxes can cover a doorway. Never seal the last exit (keep the roof, loading bay or sewer open). The 0:00
  eviction is the backstop.
- Cop spots decide which exit is "hot": put them on the main street or avenue and keep the back route clear.
- Vic's `adv,drill` mission starts at level 45 (fence::level), so the Museum alone covers it. Mara's `adv` getaway is
  at level 45 too. An advanced Jewelry Store or Bank is a design choice, not a requirement.

## Sources

GTA V, The Jewel Store Job
- [Grand Theft Wiki: The Jewel Store Job](https://www.grandtheftwiki.com/The_Jewel_Store_Job)
- [PowerPyx: Jewel Store Job, Smart approach gold medal](https://www.powerpyx.com/gta-v-the-jewel-store-job-smart-approach-gold-medal-walkthrough/)
- [PowerPyx: Jewel Store Job, Loud approach gold medal](https://www.powerpyx.com/gta-v-the-jewel-store-job-loud-approach-gold-medal-walkthrough/)
- [Gamer Guides: Jewelry Heist, Smart approach](https://gamerguides.com/grand-theft-auto-v/guide/walkthrough/main-missions/jewelry-heist-smart-approach)
- [GTABase: The Jewel Store Job, Smart approach](https://gtabase.com/grand-theft-auto-v/missions/the-jewel-store-job-smart-approach)

The Fleeca Job
- [GTA Boom: The Fleeca Job](https://www.gtaboom.com/GTA_Online_Heist:_The_Fleeca_Job)
- [GTABase: The Fleeca Job](https://www.gtabase.com/gta-online/jobs/heists/the-fleeca-job)
- [Gfinity: How to drill in GTA Online heists](https://www.gfinityesports.com/article/how-to-drill-in-gta-online-heists-fleeca-job-pacific-standard-cayo-perico-rockstar-games-xbox-one-series-x-ps4-ps5-pc)

The Pacific Standard Job
- [SegmentNext: Pacific Standard guide](https://segmentnext.com/gta-5-online-heists-pacific-standard-job/)
- [Gamer Journalist: Pacific Standard guide](https://gamerjournalist.com/gta-online-the-pacific-standard-job-heist-guide/)
- [GTA Boom: Pacific Standard guides](https://www.gtaboom.com/pacific-standard-heist-guides/)
- [GTABoss: Pacific Standard payouts and setups](https://www.gtaboss.gg/gta-5-online/guides/how-to-complete-the-pacific-standard-job-in-gta-online)

The Big Score / Union Depository
- [Grand Theft Wiki: The Big Score](https://www.grandtheftwiki.com/The_Big_Score_(GTA_V))
- [PowerPyx: The Big Score, Subtle approach](https://www.powerpyx.com/gta-v-the-big-score-subtle-approach-gold-medal-walkthrough/)
- [PowerPyx: The Big Score, Obvious approach](https://www.powerpyx.com/gta-v-the-big-score-obvious-approach-gold-medal-walkthrough/)
- [GTABase: The Big Score, Obvious approach](https://www.gtabase.com/grand-theft-auto-v/missions/the-big-score-obvious-approach)
- [GTABase: The Union Depository Contract](https://www.gtabase.com/gta-online/jobs/the-union-depository-contract)
- [GTA Boom: LS Tuners Union Depository Contract guide](https://gtaboom.com/los-santos-tuners-the-union-depository-contract-guide-0af9)

The Diamond Casino Heist
- [GTA Boom: The Diamond Casino Heist](https://www.gtaboom.com/The_Diamond_Casino_Heist)
- [GTABase: The Diamond Casino Heist](https://gtabase.com/gta-online/jobs/heists/the-diamond-casino-heist)
- [TheGamer: Casino Heist setup and approaches](https://www.thegamer.com/gta-online-diamond-casino-heist-setup-approaches-prep-guide/)
- [GTA Boom: Casino Heist access points and POIs](https://www.gtaboom.com/diamond-casino-heist-access-points-pois-guide/)
- [Sportskeeda: Silent and Sneaky guide](https://www.sportskeeda.com/gta/gta-online-silent-and-sneaky-guide)
- [GTA Boom: Silent and Sneaky guide](https://www.gtaboom.com/Silent_and_Sneaky_Diamond_Casino_Heist_Guide)

The Cayo Perico Heist
- [GTA Boom: Cayo Perico secondary targets](https://www.gtaboom.com/Cayo_Perico_Heist:_Secondary_Targets_Guide)
- [GTA Boom: Cayo Perico finale, solo elite hard mode](https://www.gtaboom.com/cayo-perico-heist-finale-guide-elite-challenge-hard-mode-solo-run/)
- [GTABase: The Cayo Perico Heist](https://www.gtabase.com/gta-online/jobs/heists/the-cayo-perico-heist)
- [Steam forum: Cayo bag shares (user post, weak source)](https://steamcommunity.com/app/271590/discussions/0/3315233673127588346/?l=latam)
- [Steam forum: alarm after the primary target (user posts)](https://steamcommunity.com/app/271590/discussions/0/6966596977776282816)

The Contract
- [GTA Boom: The Contract DLC overview](https://www.gtaboom.com/the-contract-dlc-guide)
- [GTA Boom: Payphone Hits](https://www.gtaboom.com/the-contract-payphone-hits-c9a3)
- [Sportskeeda: Payphone hit bonuses](https://www.sportskeeda.com/gta/gta-online-payphone-hits-assassination-missions-a-beginner-s-guide-earn-extra-bonuses)
- [GTABoss: The Contract walkthrough](https://www.gtaboss.gg/guides/the-contract-with-dr-dre-in-gta-v-online-full-walkthrough)

The Doomsday Heist
- [GTA Boom: Doomsday Scenario finale walkthrough](https://www.gtaboom.com/Doomsday_Heist:_The_Doomsday_Scenario_Finale_Walkthrough)
- [GTA Boom: Doomsday Heist Act 3 guide](https://www.gtaboom.com/doomsday-heist-scenario-act-3-guide/)

The Kortz Center Heist (2026)
- [GTABoss: Kortz Center Heist finale walkthrough](https://www.gtaboss.gg/gta-5-online/guides/kortz-center-heist-finale-walkthrough)
- [Power Up Gaming: everything to know about the Kortz Center Heist](https://powerupgaming.co.uk/2026/07/14/everything-to-know-about-the-kortz-center-heist-update-in-gta-online/)
- [IDC Games: GTA Online's Kortz Center Heist](https://idcgames.com/en/grand-theft-auto-v/news/gta-online-turns-los-santos-high-society-into-a-target-with-the-kortz-center-heist-2026-07-15-08-45-13472)
- [Shacknews: Kortz Center Heist announcement](https://www.shacknews.com/article/149690/gta-online-the-kortz-center-heist-update-announcement)
- [GTABase: The Kortz Center Heist](https://www.gtabase.com/missions/gta-online/heists/the-kortz-center-heist)

Roblox Jailbreak (context only; another file covers Jailbreak)
- [Jailbreak Wiki: Crown Jewel](https://jailbreak.fandom.com/wiki/Crown_Jewel)
- [TheTopTens: Jailbreak bank floors](https://www.thetoptens.com/roblox/bank-sections-roblox-jailbreak/)
