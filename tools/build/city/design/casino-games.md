# The Casino's games (casino.sk): spec

Written 2026-10-28 for the owner's "make the actual casino usable just like gta", next to the Casino heist (PLAN.md section 6). Nothing is built. Every number is a PROPOSAL. casino.sk is a new script; it reuses core.sk (settings, `chargeMoney`, getData), shop.sk's menu rules and the shopkeepers' mannequins.

The gaming floor is the public building on the podium (x 843..896, z 331..371, floor y 72). It is never part of `heist_casino` (y 55..71), so the games work whether the heist is open, running or cooling down.

## 1. Read first: real money and gambling

**The problem.** Real money already turns into in-game money here: crate keys sold on Tebex ($0.49-$8.99) pay in-game money at random, and money boosters raise sale payouts. And in-game money already turns back into real value: it buys cars and car crate keys, cars trade (trade.sk), and the owner's plan lets players sell cars and cosmetics to each other for real money outside the game. A casino where chips are bought with in-game money and cashed back out closes that loop: stake money that can come from a purchase, win money that can become a car someone sells. That is the shape that rules and laws call gambling:
- **Mojang's Minecraft Usage Guidelines** have rules on paid random rewards and on gambling on servers. Not re-read this session: read the current text before switching anything on.
- **Tebex's Acceptable Use Policy** already forbids paid random rewards (1.6; CLAUDE.md "Tebex"); a casino fed by money from paid keys gives Tebex another reason to act on the store.
- **Laws**: several countries treat a game of chance as gambling when the stake or the prize has real-world value (Belgium and the Netherlands have acted against paid loot boxes; the UK Gambling Commission has prosecuted betting with in-game items that cash out). Minecraft's players are often minors. The usual line: no prize of real value (or no way to cash out) = not gambling.
- **Minehut** agreed to the paid perks in MONETIZATION.md; that OK doesn't cover a casino.
- GTA itself (from memory, not re-checked): its chips are bought with GTA$ and can't be turned back into GTA$ (they buy casino-store items), and Rockstar switches the casino games off in some countries.

**Cautious option (recommended, and it is GTA's own model).** Chips are one-way: bought with in-game money at the cashier, never turned back into money, never traded, never given by crates, Tebex or anything paid. Chips buy only casino prizes at the cashier's **prize counter**: bound cosmetics (titles, the High Roller bag skin, a kill effect, a car wrap that can't be traded) that are never tradeable, never sold back and carry no serial. The Lucky Wheel is free once a day and pays chips and bound prizes, never money. Result: no prize of real value can leave the casino; the casino is a money sink with fun attached. Even simpler: `casino::enabled false` (the floor stays a building, the dealers say "Closed").

**Realistic option (the owner's words: chips bought and cashed at the cashier).** Chips cash back into in-game money at the cashier, with guardrails: a 2% cash-out fee, a daily buy cap and a daily cash-out cap per account and per IP, chips never tradeable and never from anything paid, everything logged, the risk written into MONETIZATION.md for Minehut and the owner checking Mojang's and Tebex's current rules first. It is what the owner asked for; the legal and platform risk stays, like the crate keys' (the owner took that one knowingly).

The rest of this spec works for both: `casino::cashout` false (cautious) or true (realistic) is the only switch, plus the prize counter.

## 2. Chips and the cashier

- **Chips**: data `chips` (a whole number; 1 chip = $1 when bought). Not money: not in the balance, not on the sidebar, not lost on death (a death's loss L = min(B × p, C) uses the balance only), no boosters, no rank bonus, no season points, no robber XP. Shown in every casino menu's info slot and by `/chips`.
- **The cashier** (a mannequin at CASHIER, (854.5, 73, 354.5), facing east, behind the cage counter): right-click opens the cashier menu (section 7):
  - **Buy chips**: 1,000 / 5,000 / 25,000 / 100,000 buttons; one `chargeMoney` call, then add the chips, verify, refund on a failed grant (shop.sk's pattern, no wait in between). Buys of $1,000+ need a second click within 5 s (`shop::confirm-above`).
  - **Cash out** (realistic only): all or a chosen amount; pays ⌊chips × (1 − fee)⌋, fee `casino::cashout-fee` 0.02 (also a money sink; stops chips being a free bank). Cautious: the button is the **prize counter** instead.
  - **Prize counter** (cautious, PROPOSAL prices): title "High Roller" 50,000 chips, title "Card Shark" 25,000, the High Roller bag skin 250,000, kill effect "Jackpot" (gold coin burst) 100,000; all bound (cosmetics.sk with a `bound` flag: never in trade.sk, no serial).
- Limits: no buying past `casino::max-chips` 250,000 held (a win may take you over it); buying at most `casino::buy-day` 100,000 chips per real day per account **and** per IP (data `last-ip`, like the bounty rule); realistic cash-out at most `casino::cashout-day` 250,000 per real day per account and per IP. A day = since `casino::day-reset` (UTC midnight).
- Who: level `casino::level` 5 or more (new robbers can't burn their first bag money), not a prisoner of the active prison (phone.sk's `phoneFree`). Refusals: section 6.

## 3. The games

House edge e = 1 − RTP (what the house keeps of every chip bet, on average). The money sink is S = Σ bets × e.

| Game | Where | Bet (chips) | House edge | Biggest win |
|---|---|---|---|---|
| Slots | 24 machines (SLOT_1..24) | 10 / 50 / 250 / 1,000 a spin | 5.0% (exact, table below) | 100 × 1,000 = 100,000 |
| Blackjack | 2 tables (BJ_1, BJ_2), 4 seats each | 100-10,000 a hand (a double up to 20,000) | about 1% with basic strategy (estimate; the sim confirms) | 3:2 on 10,000 = 15,000 |
| Roulette | 1 table (ROULETTE), anyone in 6 blocks | 50-20,000 a spin in total, 1,000 most on one number | 2.70% (single zero) | 35 × 1,000 + the rest |
| Lucky Wheel | WHEEL, once a day | free | none (a giveaway) | the podium prize |
| Inside Track (phase 2) | TRACK screen, 6 seats | 100-10,000 a race | 8% (built into the odds) | ×23 on a 4% long shot (230,000 on 10,000) |

### 3.1 Slots

- A slot machine is an item display (`furn_slot`) over a barrier with an interaction box (tag `donating_casino`). Right-click opens the machine: a 3-row chest, the reels in slots 11, 13, 15, bet buttons 18-21 (10 / 50 / 250 / 1,000, the chosen one glints), Spin at 22, chips at 26. One player a machine (a second gets "In use").
- The outcome is drawn at the Spin click from one weighted table (the reels are then drawn to show it, like digital slots), the chips taken and the win paid in that same call; the 2 s reel animation is only for show. Closing early shows the result at once (crates.sk's spin rule). A spin every `casino::slot-gap` 1.5 s at most; no autoplay (nothing to farm while AFK).

| Result | Pays (× bet) | Chance | RTP part |
|---|---|---|---|
| 3 Diamonds | 100 | 0.0005 | 0.050 |
| 3 Sevens | 25 | 0.004 | 0.100 |
| 3 Bars | 10 | 0.012 | 0.120 |
| 3 Bells | 5 | 0.030 | 0.150 |
| 3 Cherries | 3 | 0.060 | 0.180 |
| 2 Cherries | 2 | 0.100 | 0.200 |
| 1 Cherry | 1 (bet back) | 0.150 | 0.150 |
| nothing | 0 | 0.6435 | 0 |
| **total** | | 1.0000 | **0.950** |

RTP = Σ pays × chance = 0.95, so e = 5%. A win shows "+N chips" and a sound; 3 Diamonds on 1,000 is announced to the casino floor only.

### 3.2 Blackjack

- Two tables, a dealer mannequin at each, four seats (the 4 spots in front of the table, 1.5 blocks apart). Right-click the dealer: take a free seat (the table is full: "Table full"). Each seated player plays their own hand against the dealer, one hand at a time (GTA's table).
- Rules: a 6-deck shoe shuffled for every hand (no card counting), the dealer stands on all 17s, blackjack pays 3:2, double on any first two cards (one card), no split and no insurance in v1 (they cost the player about 0.5%: that is most of the 1% edge), a push returns the bet.
- Menu (a 6-row chest): row 1 the dealer's cards (one face down), row 3 yours, row 4 your total and the dealer's showing card, row 5 Bet − / the bet / Bet + (100, 500, 1,000, 5,000 steps), Deal, Hit, Stand, Double (only what's possible shows). Cards are items named like "K ♠" (art later: `donating:card_<rank><suit>`).
- The bet is taken at Deal and the hand saved (`{casinopending::<uuid>::*}`) in the same call. No action for `casino::turn-time` 20 s, or walking more than 6 blocks from the seat, or closing the menu: the hand **stands** and is played out and paid at once. A quit mid-hand: the same at the quit. A restart mid-hand: the bet is refunded at the next join (logged `pending-refund`).

### 3.3 Roulette

- One table with a dealer and a wheel display; a round every `casino::roulette-round` 30 s: 20 s of bets, "No more bets", the wheel spins 8 s, the result (also on the action bar of everyone within 8 blocks), 2 s. The number is drawn when bets close, never earlier.
- European wheel 0-36 (one zero): e = 1/37 = 2.70%. Bets and pays: a number 35:1; red / black, odd / even, 1-18 / 19-36 1:1; dozens and columns 2:1. 0 loses every outside bet.
- Menu (a 6-row chest, anyone within 6 blocks of the table, by the dealer): slots 0-35 the numbers 1-36 (red or black concrete, named by the number); row 4: 0, Red, Black, Odd, Even, 1-18, 19-36, 1st 12, 2nd 12; row 5: 3rd 12, Column 1-3, the chip size (50 / 250 / 1,000 / 5,000, click to change), Clear my bets, your total on the table, the time left. Left-click adds a chip of the chosen size (taken at once), right-click takes one back while bets are open. A bet's stack amount shows its size in chips (/50).
- Bets are saved per round; a quit leaves them on the table (paid to chips at the result); a restart refunds them.

### 3.4 The Lucky Wheel

- A big wheel (item display `furn_wheel` on the podium, an interaction box). Right-click: one free spin per real 20 hours (like /daily: data `wheel-at`) **and** one per IP in that time (`{casino::wheelip::<ip>}`), any level once out of the prison, no purchase ever. The prize is drawn at the click and saved as pending; the wheel turns about 5 s (interpolated rotation) and stops on it; the prize is given when it stops (or at the next join after a quit).
- 20 segments, PROPOSAL:

| Segments | Prize |
|---|---|
| 4 | 1,000 chips |
| 4 | 2,500 chips |
| 3 | 5,000 chips |
| 1 | 10,000 chips |
| 2 | 500 robber XP |
| 2 | a Common crate key |
| 1 | a Drill (a heist tool; above your level or no room: 2,500 chips) |
| 2 | the title "Lucky" (owned: 2,500 chips) |
| 1 | **the podium prize**: the High Roller bag skin, bound (owned: 25,000 chips) |

Average chips a spin (chip segments only): (4 × 1,000 + 4 × 2,500 + 3 × 5,000 + 10,000) / 20 = 1,950. The podium win is announced to the floor. No money segment in either option (the realistic option still cashes chips out, so the wheel is worth ~$1,950 a day there).

### 3.5 Inside Track (phase 2)

- The screen on the east wall (x 895, z 333..345): 6 lanes as text displays, a horse glyph moving along each. A race every `casino::track-round` 3 real minutes: 2:00 of bets, 0:40 race, 0:20 results.
- At each race the 6 horses get win chances p_i (random weights normalised, each 4%-40%); the shown odds pay m_i = ⌊10 × (1 − 0.08) / p_i⌋ / 10, so every horse's RTP = p_i × m_i ≤ 0.92 (e ≥ 8%). The winner is drawn when bets close; the animation shows it.
- One bet a race (one horse, 100-10,000) from a seat menu; quits keep it, restarts refund it.

## 4. Dealers and the casino's NPCs

- The cashier and the three dealers are **mannequins** like the shopkeepers (look like players, no AI, no locator-bar dot), skin `dealer` (a black vest, white shirt, bow tie; tools/skins), the cashier `cashier`. They stand at the module's points (PLAN.md 6.2: CASHIER, BJ_1, BJ_2, ROULETTE) and never move. The slots, the wheel and the track are item displays with interaction boxes (tag `donating_casino`), like the crate stands.
- Staff: `/dcasino spot <cashier|blackjack|roulette|wheel|slot|track> [x y z yaw]` (where you stand, or the coordinates), `list`, `remove <n>`, `dump` (the lines for Minehut), `enable|disable` (`casino::enabled`), `info <player>` (chips, today's buys / cash-outs / net, pending), `give|take <player> <chips>` (logged; refunds only), `stats [days]`. `/dsetup` lists a missing cashier or dealer as "!".
- Dealers speak on the action bar of players within 6 blocks: "Place your bets", "No more bets", "Dealer has 19", "Blackjack!".
- While the Casino heist's alarm runs the games stay open (`casino::close-on-alarm` false); cops only shoot the hunted, and the hunted can't play.

## 5. Bet limits and caps (PROPOSAL, core.sk `casino::*`)

| Key | Value |
|---|---|
| `casino::enabled` | true |
| `casino::cashout` | false (cautious) / true (realistic) |
| `casino::cashout-fee` | 0.02 |
| `casino::level` | 5 |
| `casino::buy-day` | 100,000 chips (account and IP) |
| `casino::cashout-day` | 250,000 chips (account and IP; realistic only) |
| `casino::max-chips` | 250,000 |
| `casino::slot-bets` | 10, 50, 250, 1,000 |
| `casino::slot-gap` | 1.5 s |
| `casino::bj-min` / `bj-max` | 100 / 10,000 |
| `casino::roulette-min` / `roulette-max` / `roulette-number-max` | 50 / 20,000 / 1,000 |
| `casino::track-min` / `track-max` | 100 / 10,000 |
| `casino::turn-time` | 20 s |
| `casino::roulette-round` / `track-round` | 30 s / 180 s |
| `casino::wheel-hours` | 20 |
| `casino::afk-after` | 120 s |
| `casino::big-win` | 50,000 (logged and flagged) |

The pay tables (slots, the wheel) are core.sk lists, so the sim (section 9) reads the same numbers the game uses.

## 6. Anti-abuse

- **Refused** (a new bet, a chip buy, a cash-out, the wheel; the action bar says why): combat-tagged, wanted or hunted (combat-log.sk `isWanted`), **carrying loot** (bag.sk `bagTotal` > 0: no washing loot or gambling it before the sale), inside a heist (`heistOf`), dead, a prisoner, under the level, AFK (the server's AFK state), passive mode doesn't matter. A hand or round already running is played out.
- **Alts**: chips never move between players (no command, trade.sk refuses them, the prize-counter items are bound); the daily buy cap, the cash-out cap and the wheel count per IP too; the wheel's chips can't be cashed out the same day they're won (realistic: `casino::wheel-lock` 24 h on the wheel's chips, tracked as data `chips-locked`).
- **AFK and macros**: no autoplay anywhere; every spin, deal and bet is a click on a freshly drawn screen; a player AFK for `casino::afk-after` is stood up from a seat (the hand stands).
- **Double clicks and races**: one action per drawn screen (shop.sk's `gen` counter), clicks cancelled and handled a tick later; every chip change is one call with no wait (take, roll, pay); payouts from a pending record that is deleted before paying (crates.sk's rule: paid once).
- **Restarts, quits, crashes**: pending hands, bets and wheel spins are saved; at the next join a played-out result is paid, an unresolved bet refunded. Nothing is lost or paid twice.
- **Fair draws**: the server draws every result (no client input) at the moment the rules say (the slot at the click, the roulette number when bets close, the track winner when bets close); no staff command sets a result (the zz test helpers only, never uploaded).
- **Chips as a bank** (realistic): chips don't count for the death loss, so the cash-out fee and the 250,000 cap keep parking money in chips from being worth it.
- **Fights**: the floor is not a safe zone. Proposal `casino::no-pvp` true: a WorldGuard region `casino_floor` (x 843..896, y 72..97, z 331..371, `passthrough allow`, no "safe_base" prefix, never touching `heist_casino`) where pvp.sk blocks player-on-player hits like a store's ("No fighting in the casino."). Cops and the clerk-style rules are unchanged.

## 7. Menus

Plain chests (CLAUDE.md: minigames, the crate spin, shops and the Car Dealer stay plain chests; DonatingPhone's MenuPanels gives them the vanilla top panel). The decluttered text rule holds: numbers and state (bet, chips, time left, the dealer's total), controls that aren't obvious (left/right-click on the roulette board, "Click again to confirm"), warnings; no explaining sentences. Every menu's last slot is the player's chips. Menus:
- Cashier (3 rows): Buy 1,000 / 5,000 / 25,000 / 100,000; Cash out (realistic) or Prize counter (cautious); today's bought / left of the cap.
- Prize counter (3 rows): the prizes with their chip price, "Owned" on what you have.
- Slot machine (3 rows), Blackjack (6 rows), Roulette board (6 rows), Track bet (3 rows): as in section 3.
Not on the phone: no Casino app (it would put gambling one tap away everywhere). The GPS's Places page lists the Casino POI (a `landmark`), and help.sk gets a "Casino" topic.

## 8. Logging

`plugins\Skript\logs\casino.log`, one line per event, each with the player's name, UUID and chips before -> after:
- `buy amt= money= bal=A->B ip=`, `cashout amt= fee= paid= bal=A->B ip=`, `prize id= cost=`;
- `bet <game> <table/machine> amt= round=`, `result <game> round= outcome= won= paid=`, `stand-timeout`, `pending-refund`, `wheel prize= pending=`, `refuse <reason>`;
- `big-win` for a single win over `casino::big-win`; `staff give|take` with the staff name.
Daily totals per game in `{casino::stats::<day>::<game>::bet|paid|rounds}`; `/dcasino stats [days]` prints bets, paid and the real edge next to the table's edge, the net per player for the top 10 winners and losers (to spot an exploit or an alt farm).

## 9. Tests and the self-check

- `tools/node/node.exe tools/casino-sim.js` (new): reads the pay tables from core.sk; prints the slots' and the wheel's exact RTP and the roulette edge, and simulates 1,000,000 blackjack hands with basic strategy for the real edge (expect ~1%; refuse to pass if any game's RTP ≥ 1).
- bots\run.js casino: buy chips (charged once on a double click, refused over the cap and per IP for a second bot on the same IP), every refusal (combat, wanted, loot carried, heist, level, prisoner, AFK), a slot spin paid exactly per a forced outcome (`/zzcasino force <game> <outcome>`, a test helper), blackjack deal/hit/stand/double and the 20 s auto-stand, a quit mid-hand paid once, roulette bets placed and taken back, the result paid to a bot that quit, the wheel once a day and once per IP, cash-out on/off by the switch, the log lines.
- Test helpers (never uploaded): `/zzchips <player> [n]`, `/zzcasino force|state|reset`, added to make-zz-tab.js's SPEC.

## 10. Build order and size

1. The cashier, chips, the caps and the log (~150 lines). 2. Slots (~150). 3. The Lucky Wheel (~120). 4. Blackjack (~250). 5. Roulette (~250). 6. `/dcasino`, stats, `/dsetup`, help, tab completion (~150). Phase 2: Inside Track (~200). About 1,100 lines at phase 1. Art (make-item-art.js / furniture-art.js): chips, cards, slot symbols, `furn_slot`, `furn_bjtable`, `furn_roulette`, `furn_wheel`, `furn_cashier`, the High Roller bag skin. Not in v1: splits and insurance, three-card poker, a high-limit room, a casino membership or penthouse, chips on the phone.

## 11. Calls for the owner

1. Cautious (chips one-way, prize counter) or realistic (chips cash out with the caps and the fee). Recommended: **cautious** at launch; realistic only after reading Mojang's and Tebex's current rules and telling Minehut.
2. The house edges (slots 5%, blackjack ~1%, roulette 2.7%, track 8%) and the bet limits in section 5.
3. The wheel's segments and the prize counter's prices.
4. Level 5 to buy chips; no PvP on the floor.
