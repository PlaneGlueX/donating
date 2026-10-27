# Payday 2 / Payday 3 heists: research for Donating's Jewelry Store, Bank and Museum

Written 2026-10-26 for the city heists step. It reads 20 Payday heists, lists their mechanics and set pieces,
and says how each one maps onto Donating's mechanics (loot.sk, traps.sk, heists.sk, cops.sk, clerk.sk and the
prison's keycard/C4 code) or onto a small new mechanic. The focus is replayability.

How it was gathered: the Payday fan wiki (payday.fandom.com) pages, read through the wiki's own export
(the `api.php` parse output saved earlier in this workflow in `scratchpad/city/pd-raw`), plus guides and forum
threads for details the wiki leaves out (list at the end). Everything here is summarised in my own words.
Numbers come from the wiki and vary by patch and difficulty, so read them as "roughly".

Tags used below:
- **[EXISTS]**: works with Donating's mechanics as they are (a build + `/dheist`, `/dloot`, `/dtrap` setup).
- **[TWEAK]**: a few lines in an existing script (a new setting on something that exists).
- **[NEW-S] / [NEW-M] / [NEW-L]**: a new mechanic, small / medium / large. The candidates are specified in section 4.
- One limit that matters: `loot.sk lootRollPile` rolls every pile with at least 1 piece
  (`set {_lo} to max(1, ...)`, loot.sk line 384), so a pile can never come up empty. "Which of these spots has
  the loot this time" (Payday's random safe / vault / crate contents) cannot be done with today's code;
  it needs candidate C1 below.

---

## 1. The short version (what to steal, ranked)

| # | Payday idea | Where it's from | For Donating | Tag |
|---|---|---|---|---|
| 1 | Loot and objectives in **one of several spots**, rolled each run (which safe, which vault, which crates, which painting is real) | Big Bank, Bank Heist, Shadow Raid, Forest, Diamond District, Surphaze, Rock the Cradle | Pick groups: build every candidate, arm k of them per opening | C1 [NEW-S] |
| 2 | **Bank Heist variants**: the same bank with a Cash, Gold or Deposit-box vault | Bank Heist | Three pile groups in the vault, one picked per opening (or all three rolled with wide value ranges) | C1, or [EXISTS] as wide ranges |
| 3 | **Smash display cases**, a back-office **safe that may hold the best piece** (the tiara) | Jewelry Store, Ukrainian Job, Diamond Store | Smash gates + jewel piles; a safe gate with the "rare stone" pile behind it | [EXISTS] |
| 4 | **Fuse / circuit boxes** that switch a laser grid or case alarms off; **keycards** from a manager | The Diamond, FWB, Gold & Sharke, Surphaze, Diamond Store | A switch: hold at a box, or swipe a keycard, to turn a tagged trap group off / open a door for a while | C2 [NEW-M] |
| 5 | **Alternating laser walls** you cross by waiting for the low beams to switch off, then crouching through | Big Bank, Golden Grin, GO Bank, Surphaze | Blinking lasers with different on/off/offset per beam, low beams to jump, mid to duck | [EXISTS] |
| 6 | **The pressure-plate floor** in front of the Diamond: a box shows a safe path for ~30 s, then it changes; a wrong step = gas, alarm and the diamond drops into a floor safe you must drill | The Diamond | A plate grid with a random safe path, a console that lights it; a wrong plate hurts, trips the alarm and locks the pedestal behind a drill gate | C3 [NEW-M] |
| 7 | **Vault drill with jams** (thermal drill, 0-3 jams rolled when placed; the Beast fixed with spare parts; the BFD with power cables and water tanks the cops sabotage) | Bank Heist, Big Bank, Golden Grin | The drill gate and its timing minigame exist; roll the jam count per mount | [EXISTS] + [TWEAK] |
| 8 | **Two-person locks**: two keycards inserted within 10 s; one holds a button while the other swipes | Shadow Raid, FWB, Dirty Ice, Gold & Sharke | Two readers that must both fire within 10 s (a crew task; a solo robber can still use the drill) | C2 option |
| 9 | **Clue hunting for a code**: three briefcases each hold one digit; fingerprints/blacklight show which of 4 codes is right | Golden Grin, Touch the Sky, NRFTW, Dirty Ice | A clue spot that tells the robber one or two digits of *their own* safe code | C8 [NEW-S] |
| 10 | **A timed event mid-run**: at 5:00 a helicopter either drops a bonus crate or lands guards; players can block it by standing in its landing zone | Shadow Raid | A late pick group that arms a bonus pile (or, in advanced heists, a small cop patrol) at T seconds | C6 [NEW-S], on C1 |
| 11 | **Real vs fake loot** (GenSec stickers on genuine artifacts; a fake painting; UV marks) | The Diamond, Surphaze | Picked art piles pay full, the rest are decoys at 10%; a clue tells them apart | C1 `else=decoy` |
| 12 | **Escape options**: van (quiet), flare + helicopter after a hold-out (loud), bus through a wall, elevator shaft, C4 tunnel, sewer with a 3-minute timer | Big Bank, The Diamond, GO Bank, Forest | Build 2-3 physical ways out (front, loading dock, storm drain / rooftop stairs) that lead out of the chase radius in different directions | [EXISTS] (build) |

The three new mechanics that cover all three heists with one build each: **C1 pick groups**, **C2 switches
(fuse box / keycard reader)** and **C3 the plate path** (Museum only). Every heist still works without them.

---

## 2. Payday's building blocks and their Donating equivalents

| Payday | How it works there | Donating today | Gap / smallest new piece |
|---|---|---|---|
| Stealth vs loud | Most heists start quiet; any alarm (camera, guard, civilian at a panic button, alarmed glass) switches to loud: objectives change (drill instead of keycard, flare + helicopter instead of the van) and assault waves start | Advanced heists only: an alarm anyone can trip (cameras `effect=alarm`, alarm lasers/plates, a drill in an advanced heist, the clerk's panic button), 20 s warning, assaults, window lockdown, WANTED, the getaway | No "quiet route vs loud route" objectives. Cheap version: quiet = do it before the alarm; give quiet a reason (the contact-job bonuses "Quiet Hands" and "Ghost" exist in jobs.sk). A switch (C2) that only works before the alarm (Payday: keycard readers die when the alarm sounds, the timelock must be hacked) is the simplest "loud changes the route" |
| Cameras | A view cone; seeing a masked player, a body or an open vault for ~2 s raises the alarm; 7 s after it is fully alerted the alarm is unstoppable | Cameras: a cone, line of sight (glass/bars block), 1 s grace, sweep, `effect=alarm` (advanced) or a turret | [EXISTS]. Payday's "glass, panes and bars block sight" matches traps.sk |
| Security room / camera operator | Kill the operator in a locked room and every camera on the map goes dead; you can then watch the feeds | none | C2 (a switch with `traps=cams` and `for=0`: "the security room's console shuts every camera off for the run") |
| Camera loop / ECM jammer | Loop: one camera blind for 25 s, re-loopable. ECM: all cameras and phones off for 20 s | none | C2 kind `fuse` aimed at one camera tag with `for=25` |
| Pagers | Each killed guard's pager must be answered (hold 10 s) within 12 s; at most 4 per heist | No guards inside city heists (cops arrive only after an alarm) | Do not copy. The idea of a "limited number of mistakes" can be the camera grace, or a 2nd camera sighting |
| Keycards | Found on a manager / random guard / one of several desks; one per player, used once; open a security room, a gate, or (in pairs, within 10 s) a vault | The prison: keycards in hotbar 6-8, readers that open doors for 3 s, guards drop one when knocked down | C2 + C7 (a manager NPC you hit, built like clerk.sk's clerk, drops a keycard; or a keycard on one of N desks via C1) |
| Timelock | Start it (keycard / hack), wait 1-5 min (GO Bank), 2-3 min (Big Bank), 60-90 s (The Diamond's gates); a phone call must be answered meanwhile | none, but the drill gate is a 60 s timer with jams | Use a **drill gate as the vault timer** [EXISTS]. A free timelock (no tool, opens for everyone, no head start) is C4 [NEW-S], optional |
| Thermal drill | Carried in, placed on the vault, 360 s, jams 0-3 times (rolled when placed), cops switch it off if it's left alone | Drill gate: hold 1.5 s with a Drill, 60 s, `jams` at fixed fractions (core.sk `loot::drill::jams` 2, at 1/3 and 2/3), the jam is a timing minigame anyone can fix, the last fixer gets the head start, trips the alarm in advanced heists | [EXISTS]. [TWEAK]: `jams=1-3` rolled at the mount, and jam times jittered ±10%, so a vault isn't the same 60 s every run |
| The Beast / the BFD | Giant drills with upkeep: spare parts to fix it (Beast); two power cables the police unplug and two water tanks that drain every 60 s and must be refilled at a sink (BFD) | none | [NEW-L] if the cops have to walk to a socket (Citizens AI work). Not for launch |
| Saw (OVE9000) | Fast and loud for deposit boxes, cages, ATMs; eats blades | none (smash gates are hold-to-break, glass-themed but any solid blocks) | A reskinned smash gate (iron bars "cage", deposit-box face) [EXISTS], only the glass sounds/overlay are glass-specific |
| C4 / shaped charges | Blow doors or walls (Big Bank's C4 tunnel escape, FWB's wall into the next building, the Bomb's dock gate) | The prison's C4: parts searched, planted on a gate, 5 s fuse, a hole open 2 min | A new "breach" gate kind using the prison's breach code [NEW-M]; heists are immune to explosives, so it must be scripted, not TNT |
| Thermite through the floor | Burn a hole from the room above into the vault (FWB, Big Bank, NRFTW: ~6 min, faster with more cans) | none | A drill gate laid flat in a floor (the gate blocks are the floor; piles below) [EXISTS], drawn as thermite. The vault's second way in |
| Lasers | Static grids; alternating walls with a gap that comes and goes (wait for the low ones, crouch); lasers ignore thrown bags | Lasers: any angle, static or blinking (`on`, `off`, `offset`), jump < 1.27, duck 1.49-1.78, alarm or damage | [EXISTS]. A Payday "laser wall" = 5-6 blinking beams at 0.4 / 0.9 / 1.4 / 1.65 / 2.2 with staggered offsets so a crouch gap opens for ~1 s every few seconds |
| Pressure plates | The Diamond's whole floor; Surphaze's floor sensors (switched off at a wall switch) | Plates: hurt per step; alarm option | [EXISTS] for a static maze; the per-run path is C3 |
| Alarmed display cases | Diamond Store: every case alarmed until the manager's keycard is used at a keypad (in one of 3-4 spots); Dirty Ice: a basement switch turns the case alarms off | Smash gates never trip anything | [TWEAK]: smash `alarm=true` in advanced heists, cleared by a C2 switch. Only worth it if the Jewelry Store is advanced |
| Safes | Small safes in managers' offices (often random), Titan safes that must be drilled, PD3's dial safe (turn three times to green) | Safe gate: a 4-digit Mastermind keypad per robber, Safe Kit, head start | [EXISTS]. The code-clue (C8) is the cheap upgrade |
| Deposit boxes | Walls of boxes, each a slow pick or a saw cut; a few hold bags, most a little cash; one special box (NRFTW's Wixia box) whose number is on a document | none | Many small smash gates with 1-cell piles behind (cash), one of them picked (C1) as the "executive's box" with a big piece |
| Dye packs | Some cash bundles carry an ink bomb you must disarm first (NRFTW) | none | C5 [NEW-S], optional |
| Human shield on a scanner | Carry/shove an employee or the owner to a retina/iris/biometric scanner (NRFTW, Dirty Ice, Diamond District, Touch the Sky) | Clerk NPC (stores only) | [NEW-L] (a following NPC). Use C7: hit the manager, he drops his keycard |
| Hot-and-cold search | Big Bank: every hack of the server makes the *right* office PC beep for a second, so one player hacks while others look; Hoxton Day 2: look through windows to see which of 4 offices holds the server | none | C1 picks the right spot; a "ping" (sound + particles at the picked spot when someone holds the hint console) is a 10-line extra on C1 |
| Mid-heist events | Shadow Raid's 5:00 helicopter; GO Bank's random phone calls (a blackmailer wants a bag thrown over a fence); Big Bank's dispatcher call; police cutting power (No Mercy's elevator, Hoxton's fuse box, Dirty Ice's scanner) | Assaults and breaks | C6 (late pick groups) for the cheap ones; "cops cut the power" is [NEW-L] |
| Loot bags | Bags by weight (gold/art slow you, can't sprint), thrown between players, dropped through vents/ziplines, secured at the van | Virtual bag; take time per style (gold 1.5 s, art 3.0 s) is the "weight"; a duffel only drops on death | Don't copy bag physics. Payday's "heavy loot is slow" is already the take time |
| Point of no return | No Mercy's escape: 30 s (morgue) or 60 s (roof) to get out | The escape clock, halved when everything is emptied | [EXISTS], same idea |
| Escapes | Van (stealth only; drives off on alarm and comes back to one of 4 spots), flare + helicopter after 2 min, plane, boat zipline, bus through a wall, elevator, sewer maze with a 3 min timer | Exit spot 5-15 blocks outside; the getaway = losing the cops (chase radius per difficulty) | Build 2-3 routes out [EXISTS]. Payday's "escape randomly comes to one of N spots" maps to cop spots: different heists' cops arrive from different corners, so the safe way out changes |

---

## 3. Heist by heist

### Jewelry Store (Payday 2, Bain) and Ukrainian Job (its Vlad variant)
- A one-day smash-and-grab of a small street store, the fastest heist in the game. Big display cases in the
  storefront give bags (3 / 6 / 8 needed by difficulty), small cases in front and in the back offices give extra
  cash. Stealth or loud.
- A safe **may or may not** spawn in the right-hand back office: 1-2 bags and some cash. On the top difficulties
  the front holds only 7 bags so you **must** open a Titan safe in the back for the 8th.
- Ukrainian Job: one target, the tiara, is in **one of the store's safes at random**; metal detectors at the
  door, more cameras, a shutter code to close the front.
- Random per run: a fence in the left alley, a guard inside or not, 0-3 guards in the back alley, two police at a
  hot-dog stand, a shipping container blocking the back windows, a civilian in the alley.
- Escape: the van waits in front; an alarm sends the driver away and he returns after a few minutes to one of
  four spots (left road, right road, either side of the car park), so the crew holds out.
- **For Donating**: [EXISTS] storefront = 8-12 smash gates over jewel piles (Jailbreak's jewelry store already
  has glass cases); the back office safe holds the best piece ("tiara" / rare stone as a single `jewel` pile with a
  big `piece=`), so the d2 safe the story needs is also the run's prize. C1: two back offices, the safe is armed in
  one, the other office holds a small cash pile. Payday's "front alone isn't enough" maps to the value split:
  roughly 55% in the cases, 45% behind the safe.

### Diamond Store (Payday 2, Bain)
- A two-floor diamond store in a busy street with ~20 civilians. Every display case is **alarmed** until the
  store **manager's keycard** (she is the only civilian who goes upstairs) is used at a keypad that sits in one of
  3-4 places (either upstairs office, under the stairs, the security room).
- A security room runs the cameras; its outside alley door sometimes doesn't exist (harder on higher
  difficulties), and a camera may watch that door. Kill the operator and every camera is dead.
- Next door a luxury car showroom has a Titan safe; drilling it loudly lures the store's guards one at a time.
  A vent upstairs lets bags be thrown through to the showroom. ATMs outside give extra cash.
- 4 / 6 / 10 / 14 bags by difficulty ("Bag Throwing Simulator" is its fan nickname).
- **For Donating**: the keycard → keypad → cases-off chain is C2 + C7 (and only matters in an advanced heist).
  The "neighbour's safe as a lure" doesn't translate (no guards). Useful: the keypad in 1 of 3 spots = C1 for a
  switch.

### Dirty Ice (Payday 3, the Butcher): Ashton Fine jewellers
- Stealth: case the store unmasked; doors open with single-use **QR codes on phones that spawn in random
  spots**. A basement room behind a code holds a safe with the **red keycard** and the switch for the **case
  alarms**; the basement code is in one of three places (a whiteboard, a note in the VIP room, or an employee
  ID number).
- The **vault** holds the **Rare Stone** (about twice a jewelry bag): someone (or a hostage shoved onto it)
  holds a red button in the manager's office while another swipes the red keycard at the vault: a two-person lock.
- 13 jewelry bags (8 showroom, 5 VIP showroom); a **scanning machine** in the workshop "cleans" a bag, one at a
  time, doubling its value; in loud, guards cut the machine's power and a switch brings it back.
- Loud: the VIP room locks down until a power switch is flipped; a flare in the street, a helicopter, hold out;
  it leaves if shot at too much and returns elsewhere.
- Random: QR phone spots, which guard has the blue keycard, camera positions, where the basement code is.
- **For Donating**: two showrooms (main + VIP behind a door) [EXISTS]; the vault as a **safe gate** with the rare
  stone pile [EXISTS]; the two-person lock is C2 `need=2 within=10` (button + reader) as the *bonus* way to open
  a second vault; the code-in-1-of-3-places is C8 + C1. The cleaning machine is a nice "value multiplier station"
  but it fights Donating's bag model; skip.

### Diamond District (Payday 3)
- Five jewelry stores on one street, robbed in any order; the cheapest store has unalarmed cases you lockpick.
- The rare stone is in **one of two vaults** (random); the other vault has loose jewelry. One vault opens with the
  manager forced onto a biometric lock (the stone sits in a glass box: smash or cut), the other with a red
  keycard; loud, a thermite bag (in one of two random places) burns both open in a minute.
- **For Donating**: the "which vault has the stone" coin flip is the purest C1 example: two safe gates, the stone
  pile `group=stone pick 1`, the other vault's pile `else=decoy` (or a cash pile). Also a hint for later city
  growth: a strip of small stores (difficulty 0) next to the Jewelry Store reads well as one district.

### Bank Heist / Harvest & Trustee (Payday 2, Bain)
- Harvest & Trustee is the bank chain of Payday 2's Bank Heist (its in-game FBI file: single-storey branches,
  heavy rear doors, roof access, cameras run from a locked security room, 3-4 guards, tellers trained to drop
  shutters). Payday 3's first bank (No Rest for the Wicked) is a different bank, see below.
- Objectives: find the **thermal drill**, set it up at the vault, 360 s of drilling with jams; maybe a **cage door
  inside the vault** (closed at random, more often on high difficulty) needing a drill, saw, C4 or a key.
- **Variants**: Cash (secure 1 bag of money), Gold (1 bag of gold), Deposit (open deposit boxes for $15,000),
  Random (any). Deposit boxes are slow: a saw with ammo bags, or lockpicking that can take ~12 minutes.
- Random per run: the vault sits next to **either** exit of the fax room, the camera room in one of two places,
  the manager carries the keycard or it's on his desk, a small safe and cash may be in his office, how many
  cameras and where, back doors open or shut, roof skylights (civilians below can see you), which teller doors
  are open, the escape van's spot.
- Loud set pieces: tellers and office staff run for panic buttons; planks at random spots to board windows;
  a roof helicopter drops gas into the vents; SWAT turrets in the street.
- **For Donating**: this is the Bank's skeleton. [EXISTS] teller-line cash piles behind the counter, the
  manager's office safe, the vault as a drill gate (60 s fits Donating's pace better than 360 s), an inner cage
  as a smash gate of iron bars (reskinned), a fax/back corridor with blinking lasers. C1: the vault's contents
  rotate between **Cash** (many quick $100 pieces), **Gold** (fewer, slower $500 pieces) and **Deposit** (a wall of
  1-cell smash gates, one picked "special box" with a big piece) each opening. Without C1, [EXISTS] fallback:
  all three in the vault with wide, independent value ranges, so the mix still changes.

### The Big Bank (Payday 2, the Dentist): the Benevolent Bank
- The biggest bank in Payday 2, with **pre-planning** (spend "favors" before the run on keys, doors, drills,
  escape routes).
- Stealth: get into the **server room** (keycard, drill or jammer; in one of 3 spots); hacking it gives the
  timelock key only ~5% of the time, otherwise **one random staff PC** among dozens (either floor) must be found:
  every server hack makes the right PC beep and flash for a second, so one hacks, others watch. Then a 2:00-3:00
  **timelock**, a phone call from the GenSec dispatcher (answer it or two officers come), a fingerprint scanner,
  **two green buttons in separate rooms**, the manager's computer for the vault code. Two keycards in the lobby
  turn the vault corridor's lasers off; the laser grid otherwise always has at least one crouch path.
- Loud: rewire the timelock in a roof maintenance room (in one of several roof spots), swing a crane and drop a
  giant **piggy bank** that holds **the Beast** drill (three bags to carry); it never jams, but it breaks and must be
  fixed with one-use spare parts. Or thermite instead.
- Vault: the door is on the upper or lower level; inside, one or two levels, **2-7 cages** (only two hold
  security boxes) opened by drill, saw, C4 or keys from a key box that spawns somewhere random.
- Escapes (picked in pre-planning): the van (stealth only), a roof helicopter with a loot cage (long, sniper-heavy),
  the elevator-shaft trick to a basement van, a C4 hole + zipline to a dump truck, or a hijacked **bus rammed
  through the wall** next to the vault.
- **For Donating**: the "find the right PC by its beep" is a great co-op moment in a shared race: C1 picks the
  live console; holding the server console 3 s makes the picked one ping (sound, particles) for 2 s; the picked
  console is a C2 switch that opens the vault lobby. The two green buttons in separate rooms = C2 `need=2
  within=10`. Vault door on one of two floors = C1 over two drill gates (the other is a fake door). Cages inside
  = smash gates. Payday's escape menu = build a second exit: a loading dock or a bus-sized hole is too much;
  a back door into an alley is enough.

### First World Bank (Payday 2; from Payday: The Heist)
- Find the manager for his keycard; the insider hid a **drill and two thermite cans** in a photocopier in the
  server room. Stealth: rewire **three electricity boxes** to switch off the metal detectors, read the gate codes
  on a computer (always on the side opposite the vault entrance), then **two keycards inserted quickly**
  (one in the vault camera room, one at the vault door).
- Loud: drill the security gate (jams), free a magnetic lock at an upstairs terminal, pour thermite in the counting
  room **above the vault** and melt the floor (both cans = faster), drop the bags down a vent to the garage, blow a
  wall with C4 into the next building, escape in a garbage truck.
- Random: the drill area and the photocopier room can sit in different spots; money bundles in many small spots.
- **For Donating**: "thermite through the floor from the room above" is a cheap, memorable second way into a
  vault: a floor-laid drill gate [EXISTS]. Three boxes to rewire before a gate opens = C2 with `need=3`.

### GO Bank (Payday 2, Bain), briefly
- Two keycards (the manager's, in his pocket, briefcase or **car trunk**, and a random employee's) start a
  **1-5 minute timelock**; the phone keeps ringing and someone must answer (random calls: GenSec wants the codes
  from folders on a desk; a blackmailer wants one bag thrown over a back fence or he calls the police).
  Lasers in the vault door: wait until the bottom three are off, crouch through; bags don't trip them.
- Loud: the van flees but throws out the thermal drill; a cage dropped by plane must be built in one of three
  random spots, the plane can miss up to three times; then a **sewer escape** from one of three manholes with a
  3-minute timer through a maze.
- **For Donating**: the sewer-maze escape is the best "real getaway route" idea in Payday for a Minecraft map
  (see the Museum pitch).

### No Rest for the Wicked (Payday 3, Shade): Secure Capital Bank
- Stealth: cut the vault gate's power (the switch in one of several spots), a red keycard from a guard opens the
  server room (on the 2nd floor or the roof) for a hack; then **pull the right switch** on two panels by a random
  colour and symbol; carry an employee to the **eye scanner**; a last computer gives **four codes**, and only one
  matches the **fingerprint smudges** on the keypad's digits. Cash bundles carry **dye packs** to disarm. One
  deposit box (its number on a document in a random place) holds the special documents.
- Loud: Bile drops thermite bags every ~30 s, the floor above the vault burns through in ~6 min (faster with
  more); then lower street **bollards** by switching off 2-4 power boxes so the van can drive in; sometimes a
  helicopter instead; an FBI van with an antenna ends an assault early if destroyed.
- Random: the switch, power room (3 spots), security room (2), breaker colour (4), vault code, the special
  deposit box, the manager's spot, the van's approach, van vs helicopter.
- **For Donating**: fingerprints narrowing 4 codes to 1 = C8 (a clue that gives digits of your own code).
  Dye packs = C5. Bollards that must be lowered for the getaway are a nice loud set piece but need a vehicle
  route; skip.

### Gold & Sharke (Payday 3), briefly
- QR codes on phones, a clue in HR says which office (assistant / loan officer / branch manager, random) has the
  red keycard; a server hack and an IT hack for the vault-lobby code; a laser control box where you **flip the
  right switches**; the manager's PC re-enables the vault's card reader; two actions **at nearly the same time**.
  Loud: escort an employee with clearance, then assemble, bolt and defend a drill.

### Shadow Raid (Payday 2, Bain): Murkywater warehouse
- **Stealth-only**: an alarm gives 60 seconds to finish and leave. A crowbar (2 of 4 possible spots) opens crates.
- Loot is a treasure hunt: 9 crates, of which **4-6 hold something** (money, coke, gold or an artifact, rolled);
  painting crates are fixed; 8 shipping containers in the yard hold **4 cash stacks between them**, spread at
  random; loose loot in every room, some easy to miss.
- **Exactly 5 minutes** after someone enters, a helicopter comes and either drops a container with an artifact
  in front of the warehouse or lands 2-4 extra guards on the roof; a PA warning plays 10 s before, and a player
  standing in a landing zone blocks that outcome.
- The vault (the samurai armour, 4 bags) needs **two keycards inserted within 10 s**; keycards are on the camera
  operator, a worker, random guards, sometimes a kitchen counter.
- Routes: front gate, rooftops, a removable manhole into **sewers** (grates need thermite: two cans for three
  or four grates), loot ziplines to a tug or across roofs.
- **For Donating**: the best replayability model in Payday 2. C1 crates: 9 crate piles, 5 picked with value, the
  rest decoys or nothing; C6 the 5-minute event (a "late" group that arms a bonus art pile in the yard).
  The two-keycard vault = C2. The sewer network as alternate routes [EXISTS] (build).

### The Diamond (Payday 2, the Dentist): McKendrick Museum
- A museum of ancient art (Egyptian, Roman, Mongol themed rooms) with two upstairs wings, a middle-floor wing and
  two basement wings; only two ways in (the front door or basement windows behind grates that need thermite).
- Stealth: **rewire 4 circuit boxes** (in random places on all floors, at least 4, sometimes more; some behind
  locked doors) to switch off the security, which drops an upstairs **laser grid**. White staff doors are signed
  "Security" (camera room), "High Voltage" (a circuit box) or "Employees Only" (empty): which door is which
  changes each run.
- Two **timelock gates** (a keycard from any civilian, then 60 s, 90 s on Overkill+; loud: hacked instead).
- Exhibits: many artifact and painting cases, only **some genuine** (a GenSec sticker inside the glass), more
  likely in the two rooms before the diamond hall; a glass-cutter asset takes them quietly.
- **The diamond hall**: the door is picked; the floor between the door and the pedestal is pressure plates.
  A security box beside the door, when rewired, lights the **safe path in green** for a limited time (no limit on
  Normal, 30 s on the hardest), then the path changes and the box needs rewiring again. A wrong plate sounds the
  alarm, releases gas from the vents, and **drops the diamond into a floor safe** that must be drilled. In loud
  play triggering it on purpose and drilling is a valid shortcut.
- Escape: stealth = the van out front; loud = a flare in the courtyard, the helicopter after 120 s; the diamond
  must be loaded first; after 4 other bags it leaves and returns 2 minutes later.
- **For Donating**: the Museum's heart. Plate hall = C3 (or [EXISTS] fallback: a fixed plate maze with blinking
  lasers over it, the diamond behind a safe at the far end). Circuit boxes dropping the laser grid = C2 (`need=4`
  over boxes armed at random spots by C1). Genuine vs fake exhibits = C1 `else=decoy`. Timelock gates = drill
  gates (the story's "vault"). The courtyard helicopter becomes Donating's getaway (lose the cops).

### Under the Surphaze (Payday 3): art gallery, briefly
- Seven galleries, each with its **own security mix** (motion detector, floor sensors, alternating lasers,
  cameras) and its **own off switch** placed somewhere awkward (an outside wall, the back wall, a corner between
  two laser emitters); first-floor rooms need QR codes found in random rooms; upstairs rooms can be entered
  through cut skylights or a roof vent instead (closed after the alarm).
- Real vs fake: two candidate paintings, one fake, told apart with a tool from a locked room; another set shows
  marks only under UV light. Bile lands on one of two roof sides.
- **For Donating**: "one switch per room, in a spot that is itself a small puzzle" (reach the switch between
  two laser emitters) is a perfect C2 use: each gallery's switch turns that gallery's trap tag off for the run.
  Skylight entries = a second, harder route into the upper wing [EXISTS].

### Golden Grin Casino (Payday 2, the Dentist)
- Three colour-coded **briefcases each hold one digit** of the vault code: the manager's (in his office safe),
  the security chief's (in his locker: ~20 lockers, only 6 can hold it), and the pit boss's (at one of several bars
  or tables). Bain reads out the order.
- Stealth chain: blueprints from the archives (scan and fax them), a guest list from reception on a USB stick,
  find the guest, spike the right drink (the bottles by colour), take his room key, pump **sleeping gas** into the
  security room's vent, hack the security PC (60 s) to drop the **vault lasers**; the Dentist's loot room is
  drilled (60 s) and protected by a **moving laser wall**; a dumbwaiter lifts bags.
- Loud: the armory code, C4 on roulette tables (only one is over the vault; the blueprints rule out a decoy),
  winch parts by helicopter, fireworks to call a blimp, hack the skylight, lower **the BFD** (a plasma drill): two
  power cables cops unplug, two water tanks that drain in ~60 s each and must be refilled at a sink in 30 s, an
  overheating breakdown. Escapes: limo, blimp, van.
- **For Donating**: the three digits in three places is C8 at its best (each clue tells *you* one digit of your
  own code; finding all three beats guessing). The moving laser wall in the prize room [EXISTS]. The BFD's upkeep
  is fun but needs cop AI that walks to sockets: later.

### The Bomb: Dockyard and Forest (Payday 2, the Butcher)
- Dockyard: **two keycards in random spots** (4 each side) inserted at two control rooms on opposite sides of the
  dock; a radio frequency on one of several PCs; a GPS terminal marked at random; the ship moves to a quiet berth
  (a wait you can spend looting); search containers (a manifest narrows the bomb to 4). Loud: a flare, C4 dropped
  by helicopter for the dock gate, a 300 s hack while defending power boxes the police trip (each trip pauses it).
- Forest: a derailed train; **which car holds the vault is random**; other cars hold drillable cages (120 s) under
  tarps (debris or crates), crates hold the needed C4, loot or nothing; the vault: thermite hole, fill it with water
  (a lake pump the FBI disrupts, or a helicopter hose), C4, boom; the bomb is 4 heavy bags. Escapes: boat by
  zipline, a plane (fell trees with C4 or a chainsaw, light flares), or a helicopter. A 10% chance of night and fog.
- **For Donating**: "which container / which car" again = C1. "Defend the boxes while a hack runs" = later.
  The 10% night variant is a fun cheap idea for any heist: a rare opening with lights off (light blocks swapped
  by a snapshot variant) and a bigger pool.

### Hoxton Breakout (Payday 2, the Dentist)
- Day 1: blast into a courthouse corridor, escort an armoured truck carrying Hoxton through four obstacles picked
  at random (a police car to move, a SWAT van to drill (60 s), spike strips, a broken road needing tracks, a
  roadblock with a power box), then in a parking garage find the security room behind **one of many "private"
  doors** (empty decoys elsewhere), hack it, lower bollards, strip the truck's armour, use the ticket stub.
- Day 2: in an FBI office Hoxton hacks four monitors (100 s each); the cops go for **one fuse box** (1 of 5 spots)
  to cut his power; three side tasks from four (hack the director's PC; bring a server from **1 of 4 locked
  offices**, visible through the side windows; download keys in an office that fills with gas; search 24
  bookcase sides in the archives; scan DNA boxes 30 s each); keycards (3 always, random spots) open the infirmary,
  armoury or security gates: spend them on what you need.
- **For Donating**: it is the prison-breakout story, which Donating already has as the escape. Steal: the
  decoy doors ("Security / High Voltage / Employees Only", "private" doors) = C1 over several identical doors;
  "look through the window to know which office" is free with glass. Keycards as a spendable resource with several
  uses (medbay vs armoury vs shortcut) is a good C2 design rule.

### No Mercy (Payday: The Heist; remade in Payday 2)
- A hospital: at the start, every camera must be destroyed within **7 seconds**; civilians run for three alarm
  buttons. A doctor's tour of the ICU gives clues about three patients; cut **one of three coloured wires** in an
  alarm box to open that patient's shutter (wrong = saw the others open). Blood samples go into testers that
  validate only some of the time (the wiki gives 28% in Payday 2) and can break; two good samples are needed.
  The police cut the elevator's power; the elevator either reaches the roof helicopter or falls to the basement
  (random), with a **point-of-no-return** timer (30 s or 60 s).
- **For Donating**: "pick one of three wires from clues" is a fun one-shot puzzle (a C1 pick + a clue, C8 style).
  The rest (testers, escorts) doesn't fit.

### Road Rage (Payday 3, Shayu): armoured truck on an unfinished bridge
- Loud only: 90 s to place an EMP and stop civilians from warning the driver; the truck is then either hacked at
  the rear (random) or steered by a remote device (in a random crate) and **escorted** to a ramp along one of two
  paths (a gate opened by a power box in a random spot, or potholes that need two ramps each, ramps in random
  places); drill the hatch (30 s), open the doors, lockpick lockboxes (which ones hold loot is random); signal the
  helicopter (lands at the north or south end, random), hold 90 s, then flee on foot down scaffolding and abseil.
- **For Donating**: a moving heist needs vehicle code; not for this step. Its lesson: a short, fixed-length loud
  heist with **two random forks** (route A/B, landing N/S) feels different each time.

### Rock the Cradle (Payday 3, Vlad): nightclub
- Three ways into the VIP area (forge an invitation via a QR code from the manager's phone, sabotage the speakers
  so the bouncers leave and take one's keycard, or bluff); the crypto wallet: cut power at the right one of
  several **circuit boxes with four coloured switches** (the right box is written on a whiteboard; a wrong switch
  starts a search), hack, or threaten the accountant by phone. The **alarm wipes the wallet**: loud runs must
  settle for the vault and other loot, and the police try to steal bags back from the loot cage.
- Random: **the vault and the wallet room's positions**; the vault code is on a chair or in a safe depending on
  where the vault spawned.
- **For Donating**: a prize that **only exists in a quiet run** is the cleanest stealth incentive: in an advanced
  heist, one pile is disarmed (vanishes) the moment the alarm trips [TWEAK on loot.sk: `quiet=true` piles are
  removed by `heistOnAlarm`]. In the Museum: the diamond's "curator's case" bonus pile could be quiet-only.

### Touch the Sky (Payday 3): Mason Laurent's penthouse
- Entry by a vent; routers around the flat speed up a hack; a **random book** opens a hidden panel; hack the head
  guard's phone for a QR code to the filing room (on a random floor) for the red keycard; a hidden desk button
  (random spot) reveals a panic room with an iris scanner; poison a courier's whiskey so the owner gets sick, then
  walk him to the scanner; a whiteboard with **four codes**, the right one matching the digits that show under
  **blacklight** on the vault keypad; the vault holds jewelry bags and a **dial safe** (turn three times to green)
  with the SSD to decrypt at his PC. Random cat-figurine secret loot.
- Loud: he runs for the panic room; a drill that never jams (unless a sabotage unit comes), or thermite.
- **For Donating**: hidden switches (one of N books / panels, random) are cheap and fun: a C1-picked "switch"
  block among identical decoys. The secret bonus loot that only sometimes spawns (the cat figurine) = a C1 group
  with a low pick chance: a rare art piece players talk about.

---

## 4. Replayability: what Payday randomizes and how Donating could

### 4.1 What Payday rolls each run (the list a designer can pick from)
- **Positions**: server room (1 of 3), security room (1 of 2), vault door (upper / lower, either side of a room),
  keybox, keycards, QR phones, circuit boxes (at least 4 of more spots), the right PC, the right office, the right
  container / train car / crate, the panic-room button, which book.
- **Contents**: which crates hold loot (4-6 of 9) and what (money, gold, art), the vault's loot type (cash / gold /
  deposit), which safe has the tiara, which vault has the rare stone, real vs fake art, a rare secret item.
- **Obstacles**: closed vs open doors, a cage inside the vault or not, skylights, a container blocking windows,
  fences, extra guards, camera count and spots, the plate path, laser patterns, number of jams.
- **Events**: the 5-minute helicopter, random phone calls, police cutting power, where the escape vehicle comes.
- **Approach forks**: 2-3 ways in (front, roof, sewer), 2-4 ways out (van, helicopter, sewer, elevator).

### 4.2 What Donating already varies (no code)
- Pile values per opening (min-max), so the haul and the race differ. Wide ranges give a "variant" feel.
- Every robber's safe code per safe and run (personal Mastermind); the drill's jams and who wins the head start.
- Assault sizes by robbers inside; which cop spots the cops come from (several per heist).
- Blinking lasers (on/off/offset), camera sweeps (`sweep`, `period`), collapsing floors (`delay`, `restore`).
- The crowd: any number of robbers at once, shared piles, personal progress. In Payday the map is the
  variable; in Donating the other players are, so many small parallel tasks beat one long chain.

### 4.3 Candidate new mechanics (each a short exact spec; a design takes at most 3)

**C1. Pick groups ("one of N")** [NEW-S, loot.sk only]
- `/dloot set <id> group=<g>` on any spot (pile or gate). Heist setting `/dheist set <h> pick-<g> <k>` (default
  1), optional `pick-<g>-chance <p>` (0-1: the whole group is skipped with 1-p, for rare secret loot).
- At each opening (`lootArm`), k spots of group g are chosen uniformly at random and armed as today. The others:
  a gate stays shut with no marker or hitbox ("just a locked door"); a pile spawns nothing, or, with the spot
  setting `else=decoy`, spawns at `decoy-mult` × its value (core.sk, PROPOSAL 0.1) and the prompt calls it
  "Replica" only after the first take (so the decoy costs time, the Payday "phony loot" feel).
- Piles `behind=` an unpicked gate stay unarmed. `/dloot check` sums the worst pick (lowest total) against the
  pool, and the hologram's "$ inside" counts only armed spots. `/dloot info` shows `picked=` for the run.
- Optional `late=<s>` on a group: the pick is made and armed s seconds after the run's clock starts (C6).
- Covers: random safe position (Jewelry back office A/B), vault in 1 of 2 spots, the Bank's Cash / Gold / Deposit
  vault, the special deposit box, real vs fake art, Shadow Raid crates, the rare secret piece, decoy doors.

**C2. Switches: fuse boxes and keycard readers** [NEW-M, borrows the prison's reader/door code]
- `/dswitch add <h> fuse|reader [x y z] [key=value]`: a fuse is a hold-right-click (`hold` 3 s, any robber);
  a reader needs a Heist Keycard in hand (used up).
- What it does (any of): `traps=<tag>` switches off every trap carrying that tag (`/dtrap set <id> tag <t>`) for
  `for` seconds (0 = the rest of the run); `door=x1 y1 z1 x2 y2 z2` opens that box of blocks (air, no updates)
  for `for` seconds, then restores it (a robber standing in it is pushed to the side they came from, like the
  prison's sliding gate); `smash-alarm=off` clears alarmed glass.
- `need=<n> within=<s>`: the effect fires only when n switches with the same `link=<name>` fire within s seconds
  (two keycards within 10 s; three fuse boxes in a row without a time limit: `within=0`).
- `quiet=true`: the switch stops working once the heist's alarm has tripped (Payday's dead readers).
- Keycards: a jail-item-style "Heist Keycard" (hotbar 6-8, bound to that heist's run, gone at 0:00 or on
  leaving) from a `keycard` spot (a C1-pickable desk spot, hold 1 s) or from a manager NPC (C7).
- Covers: fuse boxes that drop a laser grid, a security-room console that kills every camera, a camera loop
  (one camera, 25 s), the two-person vault, the keycard gate into the vault lobby, Surphaze's per-room switches.

**C3. The plate path (the Diamond floor)** [NEW-M, traps.sk]
- `/dtrap add <h> path x1 y1 z1 x2 y2 z2 console=x y z [show=30] [width=1]`: a one-layer grid of plates.
  At each opening (and after each show), a random path from the entry row to the far row is rolled
  (each step forward, left or right, never back; length ≤ 2 × rows).
- Holding the console 2 s lights the path for `show` seconds for everyone (glowing lime block displays 0.05
  above the safe tiles, red on the rest), then the lights go out and the path re-rolls; the console can be used
  again after `show` seconds (Payday: the box must be re-hacked).
- A plate off the path: the plate trap's damage, (advanced) the alarm, a burst of gas (Nausea + Slowness 3 s) and
  the pedestal's pile `behind=` the hall's gate becomes locked behind a **drill gate** (the floor safe) for the
  rest of the run. Plates on the path are silent.
- Fallback with no C3 [EXISTS]: a fixed plate maze + blinking lasers across it, the prize behind a safe.

**C4. Timelock gate** [NEW-S, optional] a gate kind `timelock`: hold 2 s at a console to start it (no tool, any
robber), a countdown text display, it opens after `time` (60-120 s) for everyone and gives no head start; in an
advanced heist, an alarm during the countdown pauses it while the assault runs (Payday: loud timelocks must be
hacked). Mostly redundant with the drill gate; use it where the story needs no vault but the pace wants a wait.

**C5. Dye packs** [NEW-S, optional] a pile setting `dye=<p>`: each piece is rigged with chance p; the prompt
shows "Rigged" on its cell; a rigged piece taken normally pays `dye-mult` 0.4 (red particles, "The dye pack
burst"); taken while sneaking it takes 1.5× as long and pays in full. Skill without new UI.

**C6. Timed run events** [NEW-S on C1] a pick group with `late=<s>` (e.g. 300): at 5:00 into the run one of
two outcomes: a bonus pile is armed (a dropped crate in the courtyard) or, in an advanced heist, nothing spawns
but the next assault comes 20 s early. A 10 s warning to the robbers ("A helicopter is circling"). Shadow Raid's
blocking trick (stand in the landing zone) is optional.

**C7. The manager** [NEW-M, clerk.sk] a Citizens NPC like the store clerk, in a back office of a non-store heist:
calm until the run starts; a hit makes him drop a Heist Keycard (C2) and flee to a panic spot (Touch the Sky's
owner running to his panic room); he comes back at the next opening.

**C8. Code clues** [NEW-S, loot.sk] a safe gate setting `clue=<x y z>[,<x y z>...]`: each clue spot (an
interaction box on a desk prop: a ledger, a briefcase, a sticky note) tells the robber who right-clicks it one
digit of **their own** code for that safe and its position ("Digit 3 is 7"), different spots giving different
digits; hint spots can be C1-picked among decoys. Fits Donating's personal codes and rewards exploring over
guessing (Golden Grin's briefcases, Touch the Sky's fingerprints, NRFTW's smudges).

**C9. Layout variants** [NEW-L, later] several snapshots per heist (`/dheist snapshot <id> <variant>`), one picked
at each cooldown reset, with traps and loot spots tagged `variant=`. This is Payday 2's "semi-random map
geometry" (vault on another floor, a wall moved). The reset already rebuilds the room from structure files, but
the setup and checking cost is high. C1 gets most of the value for far less.

**Tweaks** [TWEAK]: drill `jams=1-3` rolled at the mount and jam times ±10%; smash `alarm=true` (advanced
heists, cleared by C2); `quiet=true` piles removed when the alarm trips.

Recommendation: **C1 + C2 + C3**. C1 and C2 are used by all three heists (one build, three payoffs); C3 is the
Museum's signature set piece. C8 is the cheapest add-on if a fourth is ever allowed.

---

## 5. Pitches: the three heists with a Payday twist (for the designers)

Story needs restated: Jewelry Store d2 (level 5) with a safe; Bank d3 (level 20) with a vault door (and safes);
Museum d4 advanced (level 45) with a safe, a vault door and a real getaway route (Mara's finale; Vic's "drill and
lose the cops").

### Jewelry Store (d2): Jailbreak's jewelry store + Payday's Jewelry Store / Diamond Store / Dirty Ice
- Storefront: 8-12 smash cases over jewel piles (the Jailbreak glass cases), a VIP room behind a second, smaller
  door with richer cases [EXISTS].
- Back: two offices; the **safe** (the d2 safe) holds the **rare stone / tiara**, one big jewel piece
  [EXISTS]; with C1 the safe is in office A or B (the other office: a small cash drawer pile). With C8, a ledger in
  the manager's office gives a digit.
- Traps for d2 (not advanced by default, so no alarm): a turret camera over the VIP door (`effect=damage`),
  a blinking laser across the back corridor, a plate at the back door [EXISTS]. If the owner wants Payday's
  "alarmed cases + manager keycard", the store must be advanced (then level-5 robbers meet cops and the
  getaway early: a pacing call for the designer, flag it).
- Ways out: front door (exit spot) and a back alley door; Jailbreak's lockdown shutters on the windows only
  matter if advanced.

### Bank (d3): Jailbreak's bank + Harvest & Trustee / Big Bank / FWB
- Lobby: teller counter cash piles, the manager's office **safe** [EXISTS].
- The vault lobby behind a keycard gate (C2, keycard from the manager C7 or a desk C1) or, without C2, open.
  A laser wall before the vault (blinking beams, a crouch gap) [EXISTS].
- The **vault door** = the drill gate (60-90 s, jams). With the tweak, 1-3 jams.
- Inside: the **variant** (C1): Cash / Gold / Deposit each opening; deposit = a wall of small reskinned smash gates
  with 1-cell cash piles, one picked "executive box". An inner cage (iron-bar smash gate) with gold [EXISTS].
- Second way into the vault: the counting room above, a floor-laid drill gate drawn as thermite [EXISTS] (two
  crews can race two ways in).
- Optional "Big Bank" beat (C1 + C2): the server console pings the live one of 4-6 office consoles; that console
  opens the vault lobby.
- If the bank is advanced too (designer's call), Vic's "drill and lose the cops" has two heists to choose from.

### Museum (d4, advanced): Jailbreak's museum + The Diamond / Surphaze / Golden Grin / Shadow Raid
- Wings with art and artifact piles behind smash cases; with C1 only some are genuine (decoys pay 10%), with a
  clue (a "GenSec sticker": a small item display inside the real cases, visible only up close).
- Upper gallery behind a laser grid that 3-4 **fuse boxes** switch off (C2 `need=4`, boxes at C1-picked spots
  behind "High Voltage" doors; decoy doors "Employees Only").
- Two **gates**: the first a drill gate (the vault the finale needs: gold/artifacts behind it), the second the
  diamond hall door.
- **The diamond hall** (C3): the plate path + console; the diamond as one `art` pile (one huge piece, 3 s take)
  on a pedestal, **behind a safe** (the display case keypad: the finale's safe). A wrong step locks it behind a
  floor-safe drill gate. Fallback [EXISTS]: a fixed plate maze with blinking lasers.
- The alarm: cameras on the hall and the gallery (`effect=alarm`), the drill trips it; lockdown boxes over the
  windows; cop spots on two street corners.
- **Getaway route** (Payday's sewer and courtyard): two exits: the front steps into the open street (short, the cops'
  side) and a staff stair down to a **storm drain / service tunnel** that surfaces 60+ blocks away beyond the chase
  radius (built outside the heist region, part of the city, so it's open to everyone); a parked-car lot near the
  tunnel's mouth for MTVehicles getaways. The Grappler is barred within 6 blocks of a heist, so rooftop routes
  need real stairs or ladders down.
- C6 if allowed: at 5:00 a "night shift guard truck" outcome (assault 20 s early) or a bonus crate in the
  courtyard.

---

## 6. What not to copy (and why)
- **Bag physics** (carrying, throwing, ziplines, loot carts): Donating's bag is virtual and sells at the base;
  "heavy loot" is already the take time. A drop-off that banks loot early would undercut the getaway.
- **Pagers, civilians, hostages, crowd control, sleeping gas, poisoned drinks, human shields**: no guard or
  civilian AI inside city heists; each needs Citizens behaviour work. The clerk-style manager (C7) is the most
  that fits.
- **Long single chains** (Golden Grin's 15-step stealth route, Big Bank's server → PC → timelock → scanner →
  buttons → code): in a shared race the first player through does everything for everyone, and the rest wait.
  Prefer parallel, short tasks (several fuse boxes, several clues), each helping whoever is there.
- **Escorts and defend-the-machine** (Road Rage, Hoxton Day 1, the BFD's sockets, Dockyard's power boxes): need
  moving vehicles or cops that walk to objectives. Later, if ever (an armoured-truck heist would be its own build).
- **Pre-planning favors**: a menu economy on top of the heist; Donating's tools (Safe Kit, Drill, Grappler) already
  play that role.
- **Instant-fail stealth** (Shadow Raid's 60 s after an alarm): Donating's alarm is a phase, not a fail; keep it
  that way. The quiet-only prize (Rock the Cradle) is the gentler version.

---

## Sources
Payday fan wiki (payday.fandom.com; read through the wiki's `api.php` parse export):
- Jewelry Store: https://payday.fandom.com/wiki/Jewelry_Store
- Diamond Store: https://payday.fandom.com/wiki/Diamond_Store
- Bank Heist (Harvest & Trustee): https://payday.fandom.com/wiki/Bank_Heist
- The Big Bank: https://payday.fandom.com/wiki/The_Big_Bank
- First World Bank (Payday 2): https://payday.fandom.com/wiki/First_World_Bank_(Payday_2)
- GO Bank: https://payday.fandom.com/wiki/GO_Bank
- Shadow Raid: https://payday.fandom.com/wiki/Shadow_Raid
- The Diamond: https://payday.fandom.com/wiki/The_Diamond
- Golden Grin Casino: https://payday.fandom.com/wiki/Golden_Grin_Casino
- The Bomb: Dockyard: https://payday.fandom.com/wiki/The_Bomb:_Dockyard
- The Bomb: Forest: https://payday.fandom.com/wiki/The_Bomb:_Forest
- Hoxton Breakout: https://payday.fandom.com/wiki/Hoxton_Breakout
- No Mercy (Payday: The Heist page; Payday 2 remake at No_Mercy_(Payday_2)): https://payday.fandom.com/wiki/No_Mercy
- Dirty Ice: https://payday.fandom.com/wiki/Dirty_Ice
- Diamond District: https://payday.fandom.com/wiki/Diamond_District
- No Rest For The Wicked: https://payday.fandom.com/wiki/No_Rest_For_The_Wicked
- Gold & Sharke: https://payday.fandom.com/wiki/Gold_%26_Sharke
- Road Rage: https://payday.fandom.com/wiki/Road_Rage
- Rock The Cradle: https://payday.fandom.com/wiki/Rock_The_Cradle
- Touch The Sky: https://payday.fandom.com/wiki/Touch_The_Sky
- Under The Surphaze: https://payday.fandom.com/wiki/Under_The_Surphaze
- Mechanics: https://payday.fandom.com/wiki/Drills, https://payday.fandom.com/wiki/Keycard,
  https://payday.fandom.com/wiki/Doors, https://payday.fandom.com/wiki/Stealth,
  https://payday.fandom.com/wiki/ECM_Jammer, https://payday.fandom.com/wiki/Portable_Saw

Guides and threads:
- Dirty Ice vault (keycard + held button): https://ggrecon.com/guides/payday-3-dirty-ice-vault-how-to-open-rewards
- Dirty Ice stealth: https://www.sportskeeda.com/esports/payday-3-stealth-guide-how-complete-dirty-ice-mission,
  https://primagames.com/tips/payday-3-dirty-ice-stealth-guide
- No Rest for the Wicked stealth: https://www.ggrecon.com/guides/payday-3-no-rest-for-the-wicked-stealth/
- Gold & Sharke stealth: https://primagames.com/tips/payday-3-gold-sharke-stealth-guide
- Road Rage walkthrough: https://n4g.com/articles/payday-3-road-rage-heist-walkthrough
- Touch the Sky stealth: https://www.dexerto.com/gaming/payday-3-touch-the-sky-stealth-2305269/
- Rock the Cradle: https://www.siliconera.com/how-to-beat-the-payday-3-rock-the-cradle-club-heist/,
  https://www.thegamer.com/payday-3-rock-the-cradle-heist-nightclub-guide/
- Under the Surphaze: https://primagames.com/tips/payday-3-under-the-surphaze-stealth-guide
- Big Bank loud (correct PC, vault in 4 spots, escapes): https://www.gameplayinside.com/shooter/payday-2/the-big-bank-heist/payday-2-the-big-bank-heist-loud-guide/
- Shadow Raid launch article: https://shacknews.com/article/84730/payday-2-unleashes-stealth-only-shadow-raid-update
- The Diamond plate path (re-hacking for an easier path, the 30 s window): https://steamcommunity.com/app/218620/discussions/8/490123197946665413
- Ukrainian Job tiara in a random safe: https://www.powerpyx.com/guides/payday_2.html, https://www.ludo.guide/guide/payday-2/ukranian-job
- No Mercy community notes: https://steamcommunity.com/app/218620/discussions/8/1736595227838360893

Donating references used for the mappings: CLAUDE.md (Heists, Traps, Loot, Stores, clerks and assaults, the
prison, the Grappler, the bag and duffel, levels), `server/plugins/Skript/scripts/loot.sk` (lootRollPile's
minimum of 1 piece, the gate kinds), `core.sk` (`loot::drill::time` 60, `loot::drill::jams` 2).
