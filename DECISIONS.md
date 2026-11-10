# Owner decisions before launch

All numbers are in `server\plugins\Skript\scripts\core.sk` (written `core.sk:<line>` below).
After a change: `/sk reload core` (never while someone is playing, never while you are in the prison).
Reading time: about 15 minutes. Part 1 is the only part that needs real thought.

Checked with the simulator (`tools\node\node.exe tools\progress-sim.js`, 40 runs per profile, the map guess in its ASSUME block):

| Reached at (hours played) | Casual 1 h/day | Median 2 h/day | Grinder 4 h/day |
|---|---|---|---|
| Gym Bag | 0.2 | 0.2 | 0.2 |
| First gun (Classic Pistol, L5) | 0.7 | 0.6 | 0.6 |
| Level 5 | 0.6 | 0.5 | 0.5 |
| Level 45 (Advanced heists) | 7.9 | 6.1 | 5.2 |
| Level 100 | 23.7 | 20.4 | 17.9 |
| Level 150 | not in 30 h (L112) | 60.9 | 56.7 |
| Money left over at the end | $1.7M | $7.2M | $25.7M |

What looks off:
- Levels come in two lumps. XP per hour jumps from about 2,100 (levels 40-45) to about 35,000 (45-55) and 46,000 (60-65), then settles near 4,000.
  At 45 (Advanced heists) and 60 (Vault Bag, Master jobs), one or two sales give 5-10 levels. Players skip the AK-48 (L50) and Jeep (L50) gates without feeling them.
- Money piles up after about level 100: a median player sits on $7.2M with nothing left to buy except the car crates.
  The $1M and $2.5M car crate keys are the only big drain. That is fine, as long as they stay.
- A 1 h/day player earns more from car jobs ($3.5M) than from heists ($2.9M), because the job cooldowns (1 h / 3 h / 6 h) are always over when they log in. You asked for "a lot more pay", so I'd keep it. Check it in the beta.

---

## 1. Decide before launch

These are the numbers players notice if they change later. Lowering a price later is safe. Raising one, or lowering pay, makes players angry.

| # | Item | Now | What a player feels | Recommendation |
|---|---|---|---|---|
| 1 | **Loot money per heist** (`core.sk:1047-1051`, piece values `core.sk:1306-1347`) | Pool per run: Store $3k, Easy $6k, Medium $24k, Hard $80k, Advanced $240k. Pieces: cash $100, valuables $200, jewels $250, gold $500, artifact $2k, bullion $5k | How rich one run makes them; each tier is worth 3-4× the last | **Keep.** The jumps match the bag sizes, and the simulator's timeline hits your month target |
| 2 | **Death loss** L = min(B × p, C) (`core.sk:990-1010`) | p (player/trap) / cop-p: Store 1% / 5%, Easy 1% / 5%, Medium 2% / 6%, Hard 3.5% / 8%, Advanced 5% / 10%. C = bag capacity in that heist | A rich player dying in an Advanced heist loses up to $100k (the Vault Bag cap); a new player loses a few dollars | **Keep.** The cap C stops it from feeling unfair, and the cop-p doubling makes cops the thing to fear |
| 3 | **Bags** (`core.sk:1024-1044`, replace `core.sk:2124-2128`) | Gym $2k holds / $2.4k / L0; Duffel $6k / $7.2k / L5; Hockey $15k / $18k / L10; Armored $40k / $48k / L25; Vault $100k / $120k / L60. Price = 1.2 × capacity, replace after death = 0.2 × capacity | First bag at 12 minutes, Vault Bag at about 8 h (median) | **Keep.** |
| 4 | **Gun prices and level gates** (`core.sk:1475-1610`) | Knife $500 L0, Wrench $1k L0, Knuckles $1.5k L2, Katana $15k L12, Nunchucks $25k L15. Pistol $7.5k L5, Revolver $20k L10, Machine Gun $45k L15, Brave Patriot $80k L25, Shotgun $110k L30, Combat Rifle $160k L40, AK-48 $225k L50, Sniper $500k L70, Veteran $800k L90, Hand Minigun $1.5M L125 | A new gun every 1-3 hours up to the AK-48 at about 9.5 h, then a long climb to the Minigun at about 36 h | **Keep.** Price and level rise together with no gaps |
| 5 | **Car prices and level gates** (`core.sk:168-244`) | Sedan $40k L20, Sport Sedan $90k L35, Jeep $150k L50, Sports Car $250k L75, Hotrod $450k L100, **SUV $1M L150**, Viper $1.25M L110, Riviera $2M L130, Apex $3.5M L150 | Cars are the mid- and late-game goal | **Change the SUV only:** level 60, $200,000 (`core.sk:190-191`). It is the slowest car in the game (top speed 0.6, `core.sk:213`, slower than the $40k Sedan) but sits at the same level as the Apex, so nobody will buy it. At level 60 it becomes the long-range car (biggest tank, 90 L). This also makes the Supercar crate's SUV pull worth less, which is fine because that crate is meant to drain money |
| 6 | **Level curve** (`core.sk:1740-1745`) | level::first = 49 XP; each level needs 8% more than the one before, easing to 2% by level 60. XP = ⌊P / 100⌋ + 10 per heist in a sale | Level 10 in 48 min, 45 at 6 h, 150 at 61 h (median), the month target you set | **Keep 49.** You can lower it after the beta (everyone catches up at once). Raising it later strands players. The lumps at 45 and 60 come from the Advanced pool and the Master jobs, not from the curve. Leave them until real beta data shows players skipping too fast |
| 7 | **Paid ranks** (`core.sk:1758-1800`) | VIP `[VIP]` green +5% bag, VIP+ `[VIP+]` aqua +10% + daily common key, Elite `[Elite]` gold +20% + 2 keys + Heist Refresh every 12 h + valet, Legend `[Legend]` pink +25% + 3 keys + Refresh every 6 h + valet + retired cosmetics | The tag shows in chat and tab; the bag bonus is the pay-to-win part (disclosed in MONETIZATION.md) | **Keep.** You already set Elite and Legend; VIP and VIP+ step up to them evenly |
| 8 | **Crate key prices** (game money, `core.sk:1867-1878`) and contents (`core.sk:1913-1919`) | Common $1.5k, Uncommon $4k, Rare $10k, Epic $25k, Legendary $60k (about 4× what a key pays back on average). Supercar $1M, Hypercar $2.5M | Keys drain money and pay out mostly cosmetics; they are never a way to make money | **Keep.** They stop crates from becoming a money farm, and the car crates are the only big drain once players hit level 100 |
| 9 | **Boosters** (`core.sk:2083-2096`) | Highest multiplier allowed 2×, buyer gets +0.5 on top, longest 240 min | A money or XP booster: everyone 1.5×, the buyer 2× (as MONETIZATION.md promises) | **Change:** money and XP `max-multiplier` from 2 to **1.5** (`core.sk:2083`, `2086`, old copy `2095`). Right now a 2× booster is allowed, which gives its buyer 2.5×. That breaks the published 1.5× / 2× promise to Minehut and players. Keep Heist Rush at 2× and the 240 min limit |
| 10 | **Season prizes** (`core.sk:927-937`, Season crate `core.sk:1892`) | #1 $25k + 3 keys, #2-3 $10k + 2, #4-10 $5k + 1, plus the board's title. Season crate: $500-$3,000, ammo, Stims, tools | By week 4 a top player earns about $365k an hour, so $25k is 4 minutes of play. The prize feels like nothing | **Change:** #1 **$250k**, #2-3 **$100k**, #4-10 **$50k**. The title stays the real prize. This changes nothing about how hard heists are; it only gives top players a reward they notice. Keep the Season crate as is (it is a small extra) |
| 11 | **Combat tag** (`core.sk:34`) | 15 s; while tagged no /spawn, /home, /warp, /tpa, /back... | Logging out or teleporting away from a fight costs you | **Keep 15 s.** It is the common length on PvP servers, and logging out while tagged counts as a death |
| 12 | **Car job, hit and contact job pay** (`core.sk:423-457`, `2321-2341`, `2174-2200`) | Car jobs: Street $12k L5 every 1 h, Pro $40k L30 every 3 h, Master $100k L60 every 6 h (first job $1.5k). Hits: Easy $10k L15, Medium $25k L30, Hard $60k + a key L50. Contact jobs: one every 6 h, 3 slots, at least $250 | Side money: hits are about 13% of a median player's income, car jobs about 20% | **Keep.** Check the casual player's heists-vs-car-jobs split in the beta (see above) |

Also checked and fine: start money $1,000 (`core.sk:1016`) plus the first car job's $1,500 just covers the Gym Bag ($2,500 − $2,400 = $100 left).

---

## 2. Fine to launch as is

One line per PROPOSAL group. "Keep" unless noted.

| Group | Where | Headline values | Verdict |
|---|---|---|---|
| Chat | `core.sk:32-33` | 2 s between messages, a tip every 5 min | Keep |
| Cops | `core.sk:58-160` | Health 16 / 16 / 20 / 26 / 32, damage 2 / 2 / 2.5 / 3 / 4 (store to Advanced); 6 cops max (store 3); assault 45 s +15 s, at most 90 s; a heavy cop every 3rd from wave 3 | Keep |
| Street patrols | `core.sk:110-114` | 1 patrol per 2 players, at most 4; spot at 18 blocks; lost after 45 s | Keep (see question B) |
| Cars, extras | `core.sk:161-330` | 60 cars per garage; grades Stock to Mythic; crate cars Vandal, Specter, Overclock | Keep (the names are placeholders, PLAYTEST 106) |
| Fuel | `core.sk:343-366` | $25 a liter, 4 L/s, ×2 at a garage, Sedan full tank $1,250 ≈ 48 min | Keep |
| Stolen bikes | `core.sk:369-390` | Speed 0.62, 20 min ride, respawn 2 min, 15 s alarm lock | Keep |
| City Garage | `core.sk:392-417` | 5 s between takeouts, 90 s pickup wait | Keep |
| Car jobs (how they play) | `core.sk:418-457` | Lockpick quick-time 3 / 3 / 4 hits; cooldowns 1 / 3 / 6 h | Keep |
| Quest giver names | `core.sk:494-550` | Car contracts, Mara, Vic, Hits; inmates Lefty, Rusty, Tank, Whisper, Sparks | Keep |
| Story (Mara) | `core.sk:551-886` | Chapter ends $1k / $3k / $7.5k / $15k / $25k + 150 to 4,000 XP + a tool or keys; "Made" title | Keep (see question A) |
| Vic and the Wanted List | `core.sk:573-640` | Opens at L45; missions $2k-$6k; list rate 0.3, caps $12k / $30k / $80k | Keep |
| Seasons (scoring) | `core.sk:887-938` | 28 days; heist points 25 / 50 / 90 / 150; milestones at 500 / 2k / 5k / 10k points; 5 h played to get a prize | Keep (prizes in part 1) |
| Trading | `core.sk:939-950` | 5 blocks, 30 s to accept, 5 s countdown | Keep |
| Map colors | `core.sk:962-975` | Heists gray, green, yellow, gold, dark red by difficulty | Keep |
| Heist clock | `core.sk:1060-1063` | Doors lock with 20 s left; warnings at 60 / 30 / 10 s | Keep |
| Heist level gates | `core.sk:1088-1091`, `1186-1189` | 0 / 0 / 5 / 20 / 45 (store to Advanced), yours from 2026-09-28 | Keep |
| No PvP in stores | `core.sk:1099-1102` | On; a cleaned-out store moves people out after 15 s | Keep |
| Store clerk | `core.sk:1103-1180` | Throws every 1.5 s for 1.5 damage, 25% chance of blindness or slowness; stunned 3 s; armed 10% of openings | Keep |
| Trap damage | `core.sk:1216-1222` | D = max(1, round(d × 2 × m)) / 2 hearts; m = 0.75 / 1 / 1.25 / 1.5 / 1.75 | Keep |
| Traps | `core.sk:1224-1280` | Laser 3 hearts every 1 s, 2 s on / 2 s off; camera 60° cone | Keep |
| Loot handling | `core.sk:1281-1300` | Hold to take, 0.3 s per click; cleaned out halves the clock (at least 60 s) | Keep |
| Casino | `core.sk:1348-1374` | L5; slots pay back 95%; cash-out fee 2%; buy $100k / cash out $250k a day; free wheel every 20 h (about $3.6k on average) | Keep |
| ATMs | `core.sk:1375-1381` | L1, 6 s hold, $300-$700, 15 min | Keep |
| Shop rules | `core.sk:1446-1455` | Confirm over $1,000; sell back at 50% | Keep (see question C) |
| Prison weapons | `core.sk:1517-1527` | Shiv, Mop Spear, Taped Club, all weaker than the Combat Knife | Keep (PLAYTEST 221 asks about names) |
| Ammo | `core.sk:1614-1631` | Light $1, rifle $3, shells $5 a round; 4 spare 100-round boxes | Keep |
| Consumables | `core.sk:1636-1661` | Bandage $150 L0, Stim $400, Throwing Knife $250 L5, Energy Drink $250 L10 (Speed II 3 s) | Keep |
| Heist tools | `core.sk:1664-1690` | Safe Kit $400 L5, Drill $2.5k L15, Grappler $750 L30 (15 s cooldown) | Keep |
| Store food | `core.sk:1692-1700` | Donut $40, Sandwich $60, Hot Dog $80 | Keep |
| Level rewards | `core.sk:1750-1751` | L100 title + gun skin + 2 Epic keys ... L300 title + 5 Legendary keys | Keep |
| Gun skins | `core.sk:1910`, `2059-2075` | One in every crate; names and rarities | Keep |
| Contact jobs (rules) | `core.sk:2157-2200` | 1 job per 6 h, 3 slots (4 for family), cold bonus +25% after 24 h | Keep |
| Hit contracts (rules) | `core.sk:2312-2390` | 5 min window + 5 min overtime; 3% death loss; streak +5% a hit, at most 4 | Keep |
| Prison gate, fence, dig | `core.sk:2470-2495` | Fuse 10 punches, console 3 s, gate open 15 s, 30 s cooldown; fence ½ heart every 1.5 s; dig 6 s / open 20 s / 45 s cooldown; 1 magazine | Keep |
| Prison guards | `core.sk:2585-2640` | Notice 24 blocks (12 sneaking), 75° cone, 1 s; armed prisoner hunt: 20 HP, at most 9 | Keep |
| Inmate names and texts | `core.sk:2674-2845` | Lefty, Rusty, Tank, Whisper, Sparks | Keep |
| Prison jobs | `core.sk:2846-2880` | $150 / $150 / $200, cooldown 10-15 min | Keep |

Stale text (comments only, the game doesn't use them; all five fixed 2026-11-10):
- `core.sk:162-163` says cars cost "about $40,000 at level 2 ... $1M at level 6" (also `docs/cars.md:19`). The real gates are 20 to 150.
- `core.sk:1013-1014` talks about $5,000 start money. It's $1,000 now (the next line explains).
- `core.sk:2129-2131` still mentions a free Gym Bag. You chose no free bag.
- `core.sk:30` says the timers are "decided in CLAUDE.md". They're in docs/design.md now.
- MONETIZATION.md:244 says "nothing gives XP by itself", but the casino wheel gives 500 XP (`core.sk:1372`) and the story gives XP. It isn't paid, so it isn't pay-to-win, but the sentence is wrong.

---

## 3. Open design questions

Each has my recommended answer. Reply "yes to all" or name the ones you'd change.

| # | Question | My answer |
|---|---|---|
| A | The Combat Knife mission comes after the first store robbery (`core.sk:668`: bag, rob, sell, knife), so new players punch the clerk bare-handed. Move it earlier? | **Keep the order.** They can't afford it earlier ($100 left after the Gym Bag, and the knife costs $500). The bare-handed first robbery is the challenge, and the knife right after is the reward |
| B | Street patrols (patrols.sk) can chase a brand-new player carrying their first store loot. Keep, or add a level floor? | **Keep, no floor.** The store already teaches running from cops; a floor would make it easier |
| C | Selling a bag back pays half of a new bag's price (Gym Bag $200), not half of the unlock ($1,200). Right? (PLAYTEST 267) | **Keep.** Half the unlock would be a money exploit: sell for $1,200, buy again for $400, repeat |
| D | The phone hides things until 5 levels before they unlock (PLAYTEST 270). Right window? Lock the /commands (/crates, /garage...) in the prison too? | **5 levels: keep. Lock the commands in the prison too:** otherwise typing /crates gets around what the phone hides |
| E | The later ideas not built: Pistol in the Window, Close Call Receipt, Door Records, Rival Line. Build which? | **Pistol in the Window first** (a goal players can see). **Skip Close Call Receipt** (it clashes with your "no CLOSE CALL! text" rule, PLAYTEST line 888). Door Records and Rival Line after launch. Only the names are written down (docs/status.md:4), so this is my reading of them |
| F | Season 1 length (`/dseason start 28`, `core.sk:890`)? | **28 days.** It matches the "level 150 in a month" target |
| G | Bounties: $250 a kill, $25k cap from kills, $1k minimum to place one, announce claims to everyone? (PLAYTEST 62) | Keep all four |
| H | Bikes: may a wanted player steal one as a getaway? (PLAYTEST 229) | Yes, keep (the cops chase twice as far near cars) |
| I | Fuel Tank upgrade on crate and extreme cars? Chase view pausing for the big map? (PLAYTEST 248) | Fuel Tank on crate cars yes, on extreme cars no (they're bought finished); keep the pause |
| J | Prison numbers: 20/30 guards, busy above 3 players, armed hunt, "Dig" as an exit? (PLAYTEST 240) | Keep as built; adjust after watching real players escape |
| K | Sparks: weapon names, and Lefty's order (Sparks second, Gun Shop after the keycard)? (PLAYTEST 221) | Keep both |
| L | Five new Lefty voice lines to record (PLAYTEST 223) | Record them; the text is in PLAYTEST 223 |
| M | Building looks: showroom cars, dealership colors, houses, safehouse, crane, Pool Hall neon (PLAYTEST 225) | Look at them in-game once; no number depends on them |
| N | Older ones still open (PLAYTEST 158, 253): Energy Drink carry limit, Grappler 15 s, a tuning level gate, clerk throw pace, store's 30 s response time | Keep all as built. Add no tuning gate: cars already have level gates |
| O | Quest messages: does the chat feel right during a mission? (PLAYTEST 272); Shotgun reload 2.8 s? (PLAYTEST line 501) | Judge both in one playtest; keep until something feels off |

---

## The owner's answers (2026-11-10, the form)

| # | Answer | Done? |
|---|---|---|
| 5 SUV | Keep $1M L150; make it faster, a little below the top cars ("it can carry a whole squad") | see status |
| 9 Boosters | Cap money/XP at 1.5x (buyer 2x) | see status |
| 10 Season prizes | Money for the lower ranks (raised a bit); titles and keys for the top ranks | see status |
| A Knife | Keep the order; make melees more desirable: each melee gets its own special effect | see status |
| B Patrols | Keep, no floor; mention street patrols in the tutorial | see status |
| C Bag resale | Keep half of the new price | no change |
| D Phone | 5 levels; lock the commands in the prison too | see status |
| E Later ideas | Pistol in the Window; teams (max 4 = the biggest car's seats; disband when everyone leaves or disconnects) | see status |
| F Season length | Decide after launch | open |
| G Bounties | Keep all four; a kill bounty from the same victim only every 10 min | see status |
| H Getaway rides | Yes | no change |
| I Fuel Tank | Crate cars yes, extreme no; keep the map pause | no change |
| J Prison | Keep; tune after launch | no change |
| K Sparks | Keep both | no change |
| L Lefty lines | Record them | see status |
| N Older items | Keep all | no change |
| Wheel chips | Can be cashed out (keep the 24 h rule) | no change |
