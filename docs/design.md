# Game design: the owner's decisions

Moved word for word from CLAUDE.md on 2026-11-03. Grep a heading, then read that part: don't read the whole file.

### Heists
- Shared: any number of robbers in one building at once.
- Every heist: avoid traps that hurt you (lasers, pressure plates, cameras, collapsing floors). Owner, 2026-09-25: traps do fair damage, not an instant kill (see Traps).
- Heists with an escape countdown: when it hits 0, anyone still inside is teleported to that heist's exit spot and loses whatever they got from that heist.
- Advanced heists only: an alarm that anyone can trip.
  - 20-second warning, then a new wave of NPC cops every 10 seconds.
  - Waves continue until every robber has left the cops' range or died/failed.
- Decided 2026-09-25 (owner):
  - Heist crew: robbers inside the same heist can't hurt each other, so nobody can kill everyone as the heist starts and take all the loot. Anyone outside can still shoot in (through a door or window) and robbers can shoot out. Buildings are immune to explosives.
  - Combat-tagged players may run into an open heist; the tag keeps running.
  - Some heists can be PvP heists (per heist): no crew rule inside, and passive players can't enter.
  - Advanced heists: windows lock up when the alarm trips (lockdown boxes per heist, like Jailbreak's jewelry store).
  - The escape clock starts at the first robbery (until loot.sk exists: at the first entry).
  - At 0:00 everyone inside loses all loot from that heist's run, also loot from an earlier trip carried back in.
  - Logging out inside (not in combat) counts as failing: that heist's loot is lost, and rejoining puts you at spawn. A kick (restart, staff) costs nothing.
  - Timers ("medium"): escape 4/6/8/10 min and cooldown 6/10/15/30 min for difficulty 1-4, each can be changed per heist.
  - Heist chat (owner, 2026-09-26: "i dont want the heist related messages to flood the chat"): only "The Bank is open!" and "The Bank is closed. It reopens in 10:00." go to everyone (heists.sk heistAnnounce, cfg heist::announce); everything else (the clock starting, time warnings, the alarm, thrown out) goes only to the robbers in that heist (heistNotify). The first opening after a restart or Minehut waking up isn't announced (every heist opens at once then); a cooldown that ran through a restart is.
  - Loot: every loot spot rolls its value in a range at each opening (the owner sets the ranges when designing each heist), and the loot you can see matches it, so a spot visibly empties as it's robbed (loot.sk). A heist is a race for the most loot, not a fixed payout for whoever bought the biggest bag. The competition (owner, 2026-09-25): "the robbers compete for the loot by just their speed while completing the task of the heist (whether its collecting, cracking a code, etc.)". Built: see "Loot (loot.sk)" in Verified notes.
  - Loot answers (owner, 2026-09-25): whoever opens a safe or a vault gets a head start, and opening must be active work ("a quicktime event or a problem to solve"): safes have the code puzzle, and a drill's jams are a timing minigame whose last winner gets the vault's head start. Less room than a piece (or a dropped duffel): take what fits. Everything emptied: the time left is halved, never below 1:00, and under a minute it stays.
- Loot spots copy KoyaRobbery's style (cash tables, jewelry cases, safes that need a tool, a vault door you drill), rebuilt in Skript with our own textures (loot.sk); KoyaRobbery itself was dropped.
- Store robberies like Payday's (owner, 2026-10-21: "instead of cash laying on the counter easily, at the gas station, you go inside and hit the employee thats standing at the register to activate the heist, then the employee will run around the store to grab things to throw at you while you take money from the register"): a store's register stays shut until someone hits the clerk at it; the hit starts the robbery and the clerk throws things from the shelves at the robbers. See "Store clerks and the police assaults" in Verified notes.
- No police at stores (owner, the same day: "for low tier stores like donut shop and grocery store, no need for police"): stores (difficulty 0) have no police by default, so a store robbery never makes anyone wanted (read as every store: the town's two, the Donut Shop and the gas station's 24/7 mart, Claude's call). Per heist `/dheist set <id> police true|false` (a bigger store later can have them: then the clerk hits the panic button and the store's police come).
- Dynamic police waves (owner, the same day: "also implement some aspects of the dynamic police waves"): every alarm brings the cops in assaults (a pool of cops for a set time, repelled early when they're all down) with breaks between them, each assault bigger and tougher (heavies later). A store with its police switched on gets its own gentler numbers.
- Stores are shops too (owner, 2026-10-21: "stores first, allow players to actually buy things in the stores (food, other consumables). keep stores open even when heist is on cooldown, just disable the robbing mechanics"): a calm clerk sells food (Donut, Sandwich, Hot Dog) and a few consumables (Bandage, Energy Drink); a store stays open to walk into while it cools down or is cleaned out, only the robbing is off.
- The armed clerk (owner, the same day: "5% chance for donut/gas/small stores to have 3x more money for one run but the clerk is equipped with a weapon (melee or weak gun)", then "change 5% to 10% and 75% chance the weapon is melee and 25% armed (armed will have a little more money)"): 10% of store openings; of those 75% a melee clerk (3x the register's cash), 25% a gun (3.5x).
- Only the bases are safe zones (owner, the same day: "only safe zone is bases that have the crates", then "everything but the bases, but if a player is actively is in a garage choosing their car, its safe until they come out", and "the garage app on phone doesnt let you be safe, only while in the garage building (the valet/phone spawning would be unbalanced if it made you safe)"): spawn, shops, quest givers and garages aren't safe; a player in the garage menu while standing in a garage site is, until they close it (never one already in combat). The dealership too (owner, 2026-10-29: "make the car shop/where the crates are a safe zone"): region `safe_zone_dealer` (466 40 1010 .. 543 160 1105, passthrough allow, weapon-shoot deny); `safe_zone*` (core.sk `pvp::safe-zone-prefix`) is a safe zone that doesn't sell loot, `safe_base*` one that does (pvp.sk `isSafeId`).
- Furniture with our own textures (owner, the same day: "custom furnature for buildings (custom textures)", "stores first"): models as item displays, the stores first (the gas station's mart and the Donut Shop).
- The city heists east of the prison (owner, 2026-10-28): the Museum finale is replaced by a Casino vault heist (ideas from GTA and Payday 2, "so the server isnt a direct copy from jailbreak"), and the casino floor is playable "just like gta" (chips, slots, blackjack, roulette, a lucky wheel; tools/build/city/design/casino-games.md). Gambling with in-game money that crate keys bought for real money can pay: the owner was told it may break Mojang's usage guidelines, Tebex's rules and some countries' laws, and took the risk ("ill take the risk with the guidelines").

- The map expansion (owner, 2026-10-29: "add them all, and expand the map to more cities and add some to the current ones", after picking the 3 easiest, least-laggy small, medium and big heist ideas): the site plan is `tools/build/expand/PLAN.md` (Port Ashby west of the prison: Federal Reserve, Police HQ evidence room, Art Gallery, Lucky Pawn, a base and a garage; Ironvale east of Rising City: the Power Plant and the Mansion; Rising City gets a Nightclub, Mountainside a Car Wash; 12 ATMs over the four; all PROPOSALS). Fixed buildings only, existing loot/trap/clerk/cop systems only. Built so far: **ATMs** (atm.sk: `/datm add [x y z]|remove|list|dump|ready`, a 6 s hold with loot.sk's hold rules pays $300-700 into the bag as an `atm#<unix>` line, 15 min out of order, refused in safe zones, heists, below level 1, a full bag; a click box and a floating screen, not persistent, only in loaded chunks; core.sk `atm::*`; botsun.js atm 10/10) and the **bullion** loot style ($5,000 a piece, 4 s; the gold bar art at 0.85). Changed the same day (owner: "just add to the district with the bank and jewlery store then add a new city/district with others. go one by one plan the layout first then build everything building by building"): five heists go into **Rising City North** (x 481..940, z 0..225: the Federal Reserve, Art Gallery, Nightclub, Lucky Pawn, Car Wash) and three into the new city **Ironvale** (east: the Power Plant, Police HQ, the Mansion); Port Ashby dropped; built by Claude alone, one building at a time, each planned first in `tools/build/north/PLAN.md` (Ironvale: `tools/build/iron/`). `tools/build/city.js` has build sets: `CITY_SET=north|iron` (default the city), each with its own COMMON in `<set>/plan-layout.js`; paste with `--world overworld` (the dimension). Built: North's streets (Bank Street North, Gallery Row, 2 ATMs, GPS 5001-5005 joined to the city's 3017; the city's own GPS file `tools/city-gps-paths.txt` was loaded then too) and the **Federal Reserve** (heist `reserve`, difficulty 4, level 50; PLAYTEST 276) and the **Art Gallery** (heist `gallery`, difficulty 2, level 12, not advanced: turret cameras; PLAYTEST 277) and the **Nightclub** (heist `club`, "Club Neon" on the city's Bank Street, difficulty 2, level 10, not advanced; PLAYTEST 278) and **Lucky Pawn** (heist `pawn`, a store with a clerk; its back cabinet is glass, since loot.sk refuses safes in a store; PLAYTEST 279). and the **Car Wash** (heist `carwash`, "Suds Car Wash", a store with no clerk: open coin boxes, no traps; PLAYTEST 280). North's GPS lines: `tools/build/north/north-gps-paths.txt` (run after the city's). Bots: `bots/run.js north [heist...]` (reserve 8/8, gallery 7/7, club 8/8, pawn 7/7, carwash 5/5; add each new North heist to its HEISTS table; `clerk: true` for a store). All five North buildings are built. **Ironvale** (`CITY_SET=iron`, plan `tools/build/iron/PLAN.md`, COMMON `iron/plan-layout.js`): its streets are built (Main Avenue East from the roundabout to x 1280, Hill Drive climbing to Mansion Hill's y 90, ATMs 11-12, `district_ironvale`, GPS 6001-6005 in `tools/build/iron/iron-gps-paths.txt`, joined to 3008; PLAYTEST 281) and the **Power Plant** (heist `power`, difficulty 3, level 25, advanced; the turbine hall's collapsing catwalk or the laser walkways; PLAYTEST 282). and the **Police HQ** (heist `evidence`, difficulty 3, level 30, advanced; a laser corridor down to the basement evidence cage; GPS 6020; PLAYTEST 283). Bots: `bots/run.js iron [heist...]` (north.js's runner with Ironvale's HEISTS table; power 8/8, evidence 7/7, mansion 8/8; `bots/run.js irontraps` 12/12: the Mansion's laser hall, the library floor walked (one hit, alive) and sprinted (across), its ledge camera (alarm), the Police HQ's corridor lasers, the catwalk walked and sprinted, the GPS up Hill Drive, the phone map). And **the Mansion** (heist `mansion`, Holloway Manor on Mansion Hill, difficulty 4, level 60, advanced; the laser hall, the library's collapsing floor and code door, the vault, the gallery's cases, the study's master safe; GPS 6030; PLAYTEST 284). All three Ironvale buildings are built. The phone map and GPS grid were rescanned over Ironvale the same day (`/dphone city scan -40 -30 1500 1300 0 world confirm`: 1541x1331 px, ~9 min; `/dphone roads scan`: 514x444 cells of 3 blocks). POIs 44 (Police HQ) and 45 (Holloway Manor) added, DEPLOY.md has the expansion's section, `/dsetup` 0 missing (2026-11-03): the expansion is finished, pending the owner's playtests.

### The city clock (owner, 2026-10-21)
- "add a 12 hour clock system for the server (1min = 1sec irl) make sure the day/night time cycle in game follows it (missions that take days like the hitlist mission will now follow the new clock system)". Read as: a 12-hour (AM/PM) clock where a game minute is a real second (an hour a real minute, a day 24 minutes, a week 2.8 hours), every world's day and night following it, and the missions counted in days and weeks (the hit list, Vic's list) on game days and weeks. Kept on real time, Claude's call (on the game clock they'd come 60 times as often): /daily, car-job and contact-job cooldowns, seasons, boosters, cooldowns in minutes. A hit sighting lasts 6 game hours (5 real minutes; 1 game hour would be under a real minute, too short to hunt). See "The city clock" in Verified notes.
- Changed the same day (owner: "the clock time is making the server lag, build it around the default minecraft day/night cycle time"): the clock reads the world's own vanilla time (a day 20 real minutes, 1.2 game minutes a real second, a week 140 real minutes) and never sets the sky's speed or time by itself; sleeping works again.

### Heist bag
- Loot never goes in your inventory; it goes into a virtual heist bag.
- Bags come in tiers with different sizes, bought in a shop.
- The bag is carried in the offhand (a duffel model per tier), so helmets and vests stay free as gear.
- Bag fill (owner, 2026-09-25): shown in the bag's name (e.g. "Duffel Bag (45%)") and on the action bar when loot goes in, no longer on the XP bar. A full bag looks enchanted (glint) and takes no more loot (bag.sk).
- Everything in the bag sells automatically when you reach the base (bag.sk part 1, built 2026-09-25: see "The bag (bag.sk part 1)" in Verified notes).
- Future idea: a stash to keep some robbed items.

### Heist UI (while in a heist)
- XP bar = ammo (owner, 2026-09-25; everywhere, not only in heists): the level number is every round left for the held gun (magazine + that ammo type in the inventory), the bar is how full the magazine is and drains as you shoot. Melee: full bar, no number; a Stim stack: its count. hud.sk sets it; vanilla XP never changes it. Hunger stays vanilla (the owner dropped the hunger-bar idea: Minecraft blocks sprinting at 3 or fewer icons).
- Boss bar: heist name + escape countdown. Turns red on alarm: "Cops in 20s", then wave number + next wave timer. Built 2026-09-26 (hud.sk): see "The boss bar (hud.sk)" in Verified notes.
- Sidebar: TAB switches to a heist board inside heists (heist name, difficulty, what you'd lose if you died now, bag value / size, robbers inside, loot spots left, wanted status). Built: the heist name, its difficulty and the robbers inside (2026-09-26), loot left, spots with loot left, your haul this run, the bag ($ and %), at risk (bag + a death's balance loss), and WANTED while an alarm hunts you. Outside heists the main board (2026-09-26, PROPOSAL): cash, level, bag, heists open, the daily reward, WANTED.
- Action bar for quick events; combat-tag messages take priority. Titles and sounds for big moments (hud.sk's hudNotify: a sound per heist moment, the ALARM title; loot.sk has its own titles).
- Extras: arrow pointing to the exit, then to the base while carrying loot (a locator-bar waypoint, see Navigation); glow on loot spots you can still rob.

### Weapons, gear and inventory
- Players start with nothing. Shops sell some melee weapons, mostly guns (WeaponMechanics), ammo, consumables, helmets and armor vests.
- Guns and melee weapons are unlocked once when bought; after that you equip and unequip them for free.
- Completely fixed inventory; players can't move anything:
  - Slots 1–5: equipped weapons and consumables (empty if nothing equipped). Only changeable at a gun shop.
  - Slots 6–8: quest items.
  - Slot 9: phone. While driving, it turns into the car key (right-click to lock/unlock).
  - Upper inventory: ammo, locked in place. Ammo has to be bought again and again.
  - Offhand: the bag.

### Death and combat
- Every death (player, trap, or cop) drops the loot in your bag as one duffel on the ground (decided 2026-09-24):
  - Only the loot drops. The bag itself is lost too (it never drops, nobody can take it), but its tier stays unlocked: buy a new one of that tier at the shop.
  - Someone picking up the duffel only gets it if their own bag has enough room (owner: "it only picks up if they have enough space in their own bag"); answered 2026-09-25: as much as fits (the rest stays in the duffel). Built 2026-09-26: see "The dropped duffel (bag.sk part 2)" in Verified notes.
- You also lose your equipped weapons, consumables and all ammo. Nothing drops for other players; weapons stay unlocked.
- Helmets and vests are lost on death and bought again (decided 2026-09-24). They don't drop.
- Balance loss: L = min(B × p, C)
  - B = balance.
  - p = heist difficulty %: player/trap deaths 1–5%, cop deaths 5–10%.
  - C = the most your equipped bag can hold in that heist = min(bag capacity, heist loot pool).
  - Example: bag holds $4,000, p = 5%, B = $200,000 → min(10,000, 4,000) = $4,000.
  - Lost balance disappears (money sink).
- Combat logging = instant death credited to whatever damaged you last.
- Being wanted counts as a cop combat tag: logging out while wanted = cop death, unless a player hit you in the last 5 seconds (then player death).
- A cop death during a chase outside the heist building counts as that heist's (owner, 2026-09-27): death.sk's deathHeist uses the heist whose alarm hunts the player (its cop-p and loot pool), not the easy tier. "Cop death" = killed by a cop; killing a cop never costs anything (every 4th adds $100 of bounty).
- Any death while an alarm hunts you (abuse review, 2026-09-28): it counts for the hunting heist (or the heist you died in, if that one is harder), whatever killed you and wherever, at that heist's cop-p at least. Before, a fall or a friend's shot cost difficulty 1's p, and dying inside a difficulty-1 heist priced a difficulty-4 chase at difficulty 1.
- Hot loot (abuse review 2026-09-28; owner: 5 minutes): a robber the cops hunt drops a HOT duffel ("HOT" in its name). Whoever takes it (the robber too, after respawning) can't sell those lines for `duffel::hot-time` (5 min): data `hot::<h>#<run>` = unix time; the base keeps them with an action-bar countdown ("HOT LOOT $1,500 can't be sold for 3:12"); a death passes the heat on. Before, a friend walked a hunted robber's loot into the base without ever losing the cops.

### PvP, passive mode, bounties
- PvP on, with safe zones, spawn shield, bounties, and PvP-only heists.
- Passive mode:
  - Players can't hurt you or take your loot, and you can't pick up loot other players dropped.
  - Robbery payouts are reduced.
  - Traps hurt you as normal, and cops can kill you when you're wanted.
- Bounties:
  - Grow from player kills and robberies. Killing the same player again within 15 minutes doesn't add to your bounty.
  - A bounty stays until a player kills you, then goes to that player (new money for the killer). Owner, 2026-09-28: the victim of that kill also pays 10% of their bounty on top of the death's cost (`bounty::victim-fee`; it disappears: a money sink). The same-IP rule also covers a killer who is offline at the claim (their data `last-ip`).
  - You can't go passive while you have a bounty. Passive players can't gain one, and nobody can place one on them.
- `/bounty <name> <amount>` takes the name as text and looks it up in the server's own name cache (`offlineplayer(name, false)`): an `<offline player>` argument made Paper ask Mojang on the main thread for a name that never joined, a freeze per command (lag audit, 2026-11-10). Open (owner's call, DECISIONS.md): two friends can farm earned bounty (the killer is paid new money for the victim's 10% robbery share).
- Owner, 2026-11-10: a kill bounty from the same victim only once every 10 minutes (core.sk bounty::repeat-kill-window, was 15).

### Cars (MTVehicles)
- You can only drive car models you own. No stealing other players' cars (one plate per car keeps ownership clean for trading).
- Car locks keep passengers out. No locking near car spawn areas.
- No NPC cars at car spawn areas (owner, 2026-09-26: "Skip NPC cars"; npc-cars.sk isn't built).
- Car-theft contracts (owner, 2026-09-26: "Cash, car not kept"): hold the job's lockpick, pass a quick-time challenge, drive the car to a chop shop for cash and XP; the stolen car is scrapped, never kept (contracts.sk).
- Cars parked in every lot (owner, 2026-10-21: "get started on the car jacking quests, cars will spawn all around the map in different parking lots", then "spots in every lot, non owned/player cars despawn and get replaced with a new one every 5 minutes (unless a player is driving or trying to unlock it)"): every car spot shows a parked car, a new one every 30 real minutes unless a job holds it (changed the same day, owner: "change the random car spawning to every real life 30 minutes (less lag)"); a job's offer is one of those cars.
- Despawn: empty 5 minutes; owner drives another car for 1 minute; owner logs out. Cars return to the garage, never lost.

### Later
- Car wraps and rarities: built 2026-09-28 (see "The car expansion"); trading is built too (trade.sk).
- Resource packs: done (build-pack.js merges MTVehicles, WeaponMechanics and ours into one pack).

## Default rules (adjustable)
- Heist tools bought in shops (drill, safe tools) are consumables in slots 1–5. Quest items (contract lockpicks) go in slots 6–8.
- On death, quest items and the phone are kept.
- Saved loadout: one click at a gun shop puts your layout back (pay only for consumables and ammo). A gun shop at every respawn point.
- Robbery bounty: each sale at the base adds 10% of its value to your bounty (never for passive players).
- Kill bounties are capped. Players can pay to place bounties (not on themselves). No payout for same-IP alts.
- Alarm: max 6 cops alive per heist; waves only refill up to the cap; all cops despawn when the alarm ends. Cops chase within about 100 blocks; wanted clears once you escape the radius.
- Wanted counts as combat-tagged, and combat-tagged players can't enter safe zones, so you can't reach the base to sell until you lose the cops.
- Passive mode: robbery payouts −25%, can't enter PvP heists, can't switch inside any heist, can't place or claim bounties, 10-minute switch cooldown, can't switch while combat-tagged or carrying loot.
- Spawn shield: 10 seconds after respawn/join, ends if you attack.
- Dropped duffel: only loot (never the bag). Pickup needs room in your own bag (see Death and combat). Despawns after 2 minutes.
- Deaths outside a heist use the easiest tier's % and your bag cap.
- Quick-time challenge: a menu minigame (click when the marker lines up); 3 failed attempts break the lockpick.
- Money values (heist payouts, bag sizes, prices) aren't set yet. Proposed numbers are in `loadSettings()` in core.sk, marked PROPOSAL, waiting for the owner.


## Monetization rules
- Changed 2026-09-26 (owner): paid perks may affect gameplay a little ("custom (but balanced) bags"; a money booster whose buyer gets more). The owner asked Minehut staff, who said it's OK as long as Minehut gets a private document listing every paid perk that affects gameplay: **MONETIZATION.md**. Keep it current and tell the owner to send the new version whenever a paid item changes. (Minehut's OK covers Minehut; Mojang's usage guidelines, which forbid selling a "competitive gameplay advantage", are separate: the owner took that risk knowingly.)
- Sold (all through Tebex, see MONETIZATION.md): paid ranks (a tag, tab-list order, bag skins, +5/10/20/25% bag capacity, crate keys with /daily, Heist Refresh and Valet (take your car out anywhere, citygarage.sk) for Elite and Legend: ranks.sk), server-wide money boosters (everyone 1.5×, the buyer 2×: boosters.sk) and crate keys (common to legendary, $0.49 / $0.99 / $1.99 / $3.99 / $8.99 each, owner 2026-09-26: crates.sk; they can give in-game money, ammo, Stims and heist tools at random, and cosmetics; since 2026-09-29 the same keys are also bought in game with in-game money, PROPOSAL $1,500 / $4,000 / $10,000 / $25,000 / $60,000).
- Still never sold directly: guns, gear, bags themselves (bags are bought with in-game money; a rank adds a percentage), loot, robber levels, heist access, protection from traps or cops, cars, car mods and the car crates' keys (in-game money only, owner 2026-09-28). In-game money, ammo, Stims and heist tools only come at random from crate keys. MONETIZATION.md has every crate's odds (generate them from core.sk when the lines change).
- The server never pays out real money and never sells in-game money directly. Players selling cars and crate cosmetics to each other for real money outside the game is the owner's plan (2026-09-26, see "Trading (trade.sk)"; the risks were explained); the server only moves the items.

Street patrols (owner, 2026-11-06): scale with active players; chase only players carrying loot on the street; stores stay police-free inside. Details: docs/heists.md, Street patrols.
