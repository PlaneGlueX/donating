# Donating: what players can buy

This is the disclosure Minehut asked for. On 2026-09-26 Minehut staff told the owner that paid perks which affect gameplay are OK, as long as Minehut gets a private document listing every one of them. Keep this file current: when a paid item is added or changed, update the table and send the new version to Minehut.

Everything is sold through **Tebex** (the official Tebex plugin). When someone buys, Tebex runs one of our console commands on the server. Only the console (Tebex) and the owner can run those commands: they need the permission `donating.store`, which plain staff don't get.

## Everything a player can buy

Rank prices were picked on 2026-09-26 with the owner's OK (one-time purchases, the rank is kept for good); the booster and key prices are the owner's (2026-09-26). The perk numbers and crate contents are still proposals. The server's settings are in `server/plugins/Skript/scripts/core.sk`.

| Purchase | What the player gets | Affects gameplay? | Numbers (proposal) | Tebex command |
|---|---|---|---|---|
| **VIP** rank | Green `[VIP]` tag before their name in the tab list, chat and join messages; sorted above players without a rank in the tab list; the Camo bag look; their bags hold **+5%** | **Yes:** +5% bag capacity | $4.99 once | `dranks give {username} vip` |
| **VIP+** rank | Aqua `[VIP+]` tag, sorted above VIP; Arctic and Camo bag looks; bags hold **+10%**; a **Common crate key** with every /daily | **Yes:** +10% bag capacity; a daily Common key | $9.99 once | `dranks give {username} vipplus` |
| **Elite** rank | Gold `[Elite]` tag, sorted above VIP+; Gilded and lower bag looks; bags hold **+20%**; **Common and Uncommon keys** with every /daily; **Heist Refresh** every 12 hours; **Valet**: take their car out anywhere (everyone else takes cars out at a garage) | **Yes:** +20% bag capacity; daily keys; Heist Refresh; Valet (saves the walk to a garage) | $19.99 once | `dranks give {username} elite` |
| **Legend** rank | Pink `[Legend]` tag, sorted above Elite; Neon (glows in the dark) and every lower bag look; bags hold **+25%**; **Common, Uncommon and Rare keys** with every /daily; **Heist Refresh** every 6 hours; every retired and testing cosmetic; **Valet**: take their car out anywhere | **Yes:** +25% bag capacity; daily keys; Heist Refresh; Valet (saves the walk to a garage) | $34.99 once | `dranks give {username} legend` |
| **Money booster** | For its time, every loot sale pays **1.5×** for everyone on the server; the buyer's own sales pay **2×** | **Yes:** everyone earns more while it runs; the buyer earns a bit more than others | **$1 per 5 minutes** (any quantity) | `dbooster add {username} money 1.5 5 {purchaseQuantity}` |
| **XP booster** (added 2026-09-27) | For its time, every loot sale and car contract gives **1.5×** robber-level XP for everyone on the server; the buyer's own XP is **2×** | **Yes:** everyone reaches levels (which unlock heists, tools and cars) sooner while it runs; the buyer a bit sooner than others | Proposal: **$1 per 5 minutes** (any quantity); the owner sets the price | `dbooster add {username} xp 1.5 5 {purchaseQuantity}` |
| **Heist Rush** (added 2026-09-27) | For its time, heists reopen **2× faster** for everyone: a run that ends gets half its cooldown, and heists already cooling down have their time left halved when it starts | **Yes:** more heist runs for the whole server; the buyer gets nothing extra (no head start, no bonus) | Proposal: **$1 per 5 minutes** (any quantity); the owner sets the price | `dbooster add {username} rush 2 5 {purchaseQuantity}` |
| **Crate keys** (Common, Uncommon, Rare, Epic, Legendary) | One opening of that crate per key, at a crate stand on the map: a random reward from its list below (the odds are shown in game: /crates, click a crate) | **Yes:** crates can give in-game money, ammo, Stims and heist tools; the rest (titles, bag skins, kill effects, gun skins, cars) are looks only | $0.49 / $0.99 / $1.99 / $3.99 / $8.99 each (Common to Legendary), any quantity. The same keys are also bought in game with in-game money (2026-09-29, proposal: $1,500 / $4,000 / $10,000 / $25,000 / $60,000; see "Keys for in-game money") | `dcrate give {username} <crate> {purchaseQuantity}` |

A player has one rank at a time. Buying a higher rank replaces the lower one, and buying a lower rank never takes away a higher one.

**Not sold:** Daily keys (everyone gets one free with /daily every 20 hours) and Hacked keys (only given out at special events).

### Heist Refresh (Elite and Legend)

`/heistrefresh <heist>` reopens a heist that's cooling down, **for everyone**: it opens as soon as its room reset is done, and the whole server is told who refreshed it. It only works on a closed heist (never a running or open one) that the player's robber level allows, and it gives no head start. Elite can use it every 12 hours, Legend every 6.

### Valet (Elite and Legend)

Everyone owns and drives cars the same way. Cars come out at garages: one at every respawn point, one at the Car Dealer and one at the Scrap Yard. Elite and Legend can also call their car from anywhere with /garage or the phone's Garage app, with the same limits: never inside a heist, never in combat or while wanted, one car out at a time, once every 20 seconds. It saves the walk to a garage; it gives no car, speed or protection.

### Gun skins (added 2026-10-06)

A gun skin is a different look for one gun (for example the **Golden AK-48** or the **Molten Shotgun**): its colors only. A skinned gun does exactly the same damage, fires at the same rate, reloads the same and sounds the same; the sights, the scope's lens and the muzzle flash keep their own colors, so no skin is easier to aim with. Gun skins are **never sold directly**. They come from crate keys like the other cosmetics (every crate has one or two, inside its cosmetic share below; each Hacked set has one) and two are earned at robber levels 100 and 150 (those two can't be traded). Players wear one per gun from the wardrobe (/cosmetics, /gunskins); crate gun skins can be traded in person (/trade) with their serial number, like the other crate cosmetics. Legends own every retired and testing gun skin, like every other retired cosmetic. Proposal (2026-10-06): 12 crate skins and 2 level skins for the first four guns (the Classic Pistol, the Machine Gun, the Shotgun and the AK-48).

### What's in each crate

A crate gives exactly one reward per key, picked at random with the chances below (every crate's weights add up to 1,000, so they're exact). Crates open only at crate stands, special places on the map inside safe zones; the reward is given when the spin stops (closing the menu gives it at once, and a logout or crash mid-spin gives it at the next join). Ammo, Stims and tools that don't fit (full inventory, carry limit, a tool above the player's level) pay **half** their shop price in in-game money instead. A cosmetic the player already has pays its rarity's repeat value ($200 Daily or Common, $500 Uncommon, $1,500 Rare, $3,000 Epic, $5,000 Legendary, $7,500 Hacked). Titles, bag skins, kill effects, gun skins and cars are looks only. Every cosmetic belongs to one crate only.

**Keys for in-game money** (added 2026-09-29, owner: "allow the other common-legendary crates be able to be bought with game money as well as irl money"). Common to Legendary keys can also be bought in game with in-game money, one at a time, in the crate's page (/crates, click a crate, or at a crate stand). Proposal: **$1,500** Common, **$4,000** Uncommon, **$10,000** Rare, **$25,000** Epic, **$60,000** Legendary. Each is about 4× what a key pays back on average (its money, its items at their shop price and its repeat values: about $373 / $895 / $2,377 / $6,096 / $14,885), so buying keys with in-game money never makes money; it's a money sink that pays out mostly in cosmetics. A key is the same whichever way it was bought, so real money only saves the time it takes to earn the in-game price. A key of $1,000 or more asks for a second click to confirm; buying is refused in combat.

Changed 2026-09-26 (owner): money amounts 55-60% lower than before but more likely (60-75% of openings from Common to Legendary), cosmetics at most 1% (Daily), 3% (Common), 5% (Uncommon), 7% (Rare), 10% (Epic) and 15% (Legendary, its exclusive car included). Cars are in the game since 2026-09-26 (garage.sk): a crate car lands in the player's garage. Since 2026-09-28 a player can own several cars of a model (up to 60 cars), so a car is never a "repeat"; the repeat value is only paid when the garage is full. The Legendary and Hacked crate cars are looks only: each drives exactly like the regular car of its family (Vandal like the Sports Car, Specter like the Sedan, Overclock like the Hotrod).

Changed 2026-10-06 (gun skins, proposal): every crate got a gun skin or two inside its cosmetic share, which stays at the owner's 1 / 3 / 5 / 7 / 10 / 15%, so each other cosmetic became a little rarer (for example a Common cosmetic 0.6% → 0.5%); the money, ammo, Stim and tool chances didn't change. Each Hacked set also gives its gun skin (a set gives the parts the player doesn't have yet).

**Daily Crate**

| Reward | Kind | Chance |
|---|---|---|
| $100 | in-game money | 32% |
| $200 | in-game money | 22% |
| $400 | in-game money | 11% |
| 32 Light Rounds | ammo | 10% |
| 14 Shotgun Shells | ammo | 6% |
| 30 Rifle Rounds | ammo | 6% |
| 1 Stim | consumable | 7% |
| 1 Safe Kit | heist tool | 5% |
| Rookie (title, Daily) | looks only | 0.3% |
| Poof (kill effect, Daily) | looks only | 0.2% |
| Denim (bag skin, Daily) | looks only | 0.2% |
| Safety Orange Classic Pistol (gun skin, Daily) | looks only | 0.3% |

Gameplay items (money, ammo, consumables, tools): 99% of openings.

**Common Crate**

| Reward | Kind | Chance |
|---|---|---|
| $200 | in-game money | 28% |
| $450 | in-game money | 20% |
| $900 | in-game money | 12% |
| 64 Light Rounds | ammo | 10% |
| 28 Shotgun Shells | ammo | 7% |
| 60 Rifle Rounds | ammo | 7% |
| 2 Stims | consumable | 8% |
| 1 Safe Kit | heist tool | 5% |
| Lookout (title, Common) | looks only | 0.5% |
| Wheelman (title, Common) | looks only | 0.5% |
| Hustler (title, Common) | looks only | 0.5% |
| Smoke Bomb (kill effect, Common) | looks only | 0.5% |
| Desert (bag skin, Common) | looks only | 0.5% |
| Desert Machine Gun (gun skin, Common) | looks only | 0.5% |

Gameplay items (money, ammo, consumables, tools): 97% of openings.

**Uncommon Crate**

| Reward | Kind | Chance |
|---|---|---|
| $700 | in-game money | 22% |
| $900 | in-game money | 17% |
| $1,350 | in-game money | 15% |
| $2,250 | in-game money | 8% |
| 128 Light Rounds | ammo | 8% |
| 56 Shotgun Shells | ammo | 6% |
| 120 Rifle Rounds | ammo | 6% |
| 3 Stims | consumable | 7% |
| 2 Safe Kits | heist tool | 6% |
| Ghost (title, Uncommon) | looks only | 0.6% |
| Smooth Operator (title, Uncommon) | looks only | 0.6% |
| Night Owl (title, Uncommon) | looks only | 0.5% |
| Flames (kill effect, Uncommon) | looks only | 0.6% |
| Sparks (kill effect, Uncommon) | looks only | 0.5% |
| Urban (bag skin, Uncommon) | looks only | 0.6% |
| Cherry (bag skin, Uncommon) | looks only | 0.5% |
| Bubblegum Classic Pistol (gun skin, Uncommon) | looks only | 0.6% |
| Urban Camo Shotgun (gun skin, Uncommon) | looks only | 0.5% |

Gameplay items (money, ammo, consumables, tools): 95% of openings.

**Rare Crate**

| Reward | Kind | Chance |
|---|---|---|
| $1,800 | in-game money | 23% |
| $2,700 | in-game money | 17% |
| $3,600 | in-game money | 15% |
| $5,400 | in-game money | 9% |
| 240 Rifle Rounds | ammo | 7% |
| 112 Shotgun Shells | ammo | 5% |
| 3 Stims | consumable | 5% |
| 1 Drill | heist tool | 7% |
| 3 Safe Kits | heist tool | 5% |
| Inside Man (title, Rare) | looks only | 0.9% |
| Phantom (title, Rare) | looks only | 0.9% |
| Cash Burst (kill effect, Rare) | looks only | 0.9% |
| Souls (kill effect, Rare) | looks only | 0.9% |
| Cash Print (bag skin, Rare) | looks only | 0.8% |
| Crimson (bag skin, Rare) | looks only | 0.8% |
| Woodland Camo Machine Gun (gun skin, Rare) | looks only | 0.9% |
| Crimson AK-48 (gun skin, Rare) | looks only | 0.9% |

Gameplay items (money, ammo, consumables, tools): 93% of openings.

**Epic Crate**

| Reward | Kind | Chance |
|---|---|---|
| $4,500 | in-game money | 33% |
| $9,000 | in-game money | 24% |
| $13,500 | in-game money | 13% |
| 1 Drill | heist tool | 12% |
| 3 Stims | consumable | 8% |
| Untouchable (title, Epic) | looks only | 1.3% |
| Big Fish (title, Epic) | looks only | 1.3% |
| Fireworks (kill effect, Epic) | looks only | 1.2% |
| Storm Cloud (kill effect, Epic) | looks only | 1.2% |
| Tiger (bag skin, Epic) | looks only | 1.2% |
| Carbon (bag skin, Epic) | looks only | 1.2% |
| Tiger Shotgun (gun skin, Epic) | looks only | 1.3% |
| Carbon Machine Gun (gun skin, Epic) | looks only | 1.3% |

Gameplay items (money, ammo, consumables, tools): 90% of openings.

**Legendary Crate**

| Reward | Kind | Chance |
|---|---|---|
| $11,000 | in-game money | 38% |
| $22,500 | in-game money | 25% |
| $34,000 | in-game money | 12% |
| 1 Drill | heist tool | 10% |
| Vandal (exclusive car) | looks only | 3% |
| Most Wanted (title, Legendary) | looks only | 1.5% |
| The Boss (title, Legendary) | looks only | 1.5% |
| Dragon's Breath (kill effect, Legendary) | looks only | 1.5% |
| Totem (kill effect, Legendary) | looks only | 1.5% |
| Diamond (bag skin, Legendary) | looks only | 1.5% |
| Molten (bag skin, Legendary) | looks only | 1.5% |
| Golden AK-48 (gun skin, Legendary) | looks only | 1.5% |
| Molten Shotgun (gun skin, Legendary) | looks only | 1.5% |

Gameplay items (money, ammo, consumables, tools): 85% of openings.

**Hacked Crate**

| Reward | Kind | Chance |
|---|---|---|
| Vandal (exclusive car) | looks only | 20% |
| Specter (exclusive car) | looks only | 20% |
| Overclock (exclusive car) | looks only | 20% |
| H4CK3R (title, Hacked) + Matrix (bag skin, Hacked) + H4CK3R AK-48 (gun skin, Hacked) | looks only | 20% |
| Zero Day (title, Hacked) + Glitch (kill effect, Hacked) + Glitch Classic Pistol (gun skin, Hacked) | looks only | 20% |

Gameplay items (money, ammo, consumables, tools): 0% of openings.

The Hacked crate is never sold: its keys only come from special events. Every Hacked prize has the same chance (the owner's rule: about the same odds, all good prizes); its cosmetics come in sets.

### The car crates (added 2026-09-28): not sold

Owner, 2026-09-28: car crate keys are **only bought with in-game money** (proposal: $1,000,000 a Supercar key, $2,500,000 a Hypercar key, in the crate's preview in /crates). They are never sold in the store and never given with a purchase, so they are not a paid perk. They are listed here only because their cars can be traded between players.

Owner, 2026-09-28: "extreme tier car crates that give high and extreme priced cars with the chance to have any (non retired) car skin, any car mods, etc. so its endless combinations of cars". Each key gives exactly one car, rolled in steps: the model, its paint (sometimes a paint only crates give), the wrap's tier (then any wrap of that tier that isn't retired, equally likely), each of the three hardware parts' stage on its own, and the neon and trail by chance. The car arrives **locked as it rolled**: it can't be repainted or tuned afterwards (that keeps its value in trades), and it's numbered of its kind (the 3rd Apex with the H4CK3R wrap is "#3 of N"). A car above the player's level waits in the garage until they reach its level. A full garage (60 cars) refuses the opening before the key is used. The whole roll is shown in game (/crates, click the crate).

What the mods do (the same stages are sold for in-game money at a garage's tuning shop for every dealer car below extreme; extreme cars can only get them from these crates, whose keys are in-game money too): engine = top speed +5% / +10% / +15%; turbo = acceleration +15% / +30% / +45%; handling = steering +1 / +2 / +3 (of 8). Neon (a glow under the car) and trails (particles behind it) are looks only. Wraps are looks only.

The grade shown on a car follows the owner's value order (base < a common wrap < a common wrap with mods = a rare wrap < a rare wrap with mods = an exotic wrap < an exotic wrap with mods): Stock, Custom, Rare, Exotic, Mythic. A car crate pull of grade Exotic or Mythic is announced to the server.

**Supercar Crate** (a key: $1,000,000 in-game money, proposal)

| Step | Chances |
|---|---|
| Car | Sports Car 30%, Hotrod 25%, SUV 20%, Viper (extreme) 12%, Riviera (extreme) 8%, Apex (extreme) 5% |
| Paint | a regular color; 15% a crate-only color (Viper and Apex have them) |
| Wrap | none 40%, a Common wrap 35%, a Rare wrap 18%, an Exotic wrap 7% |
| Each of engine, turbo, handling | stock 55%, stage I 25%, stage II 14%, stage III 6% |
| Neon / trail | 20% / 12% |

**Hypercar Crate** (a key: $2,500,000 in-game money, proposal)

| Step | Chances |
|---|---|
| Car | Viper 45%, Riviera 35%, Apex 20% (all extreme) |
| Paint | a regular color; 30% a crate-only color (Viper and Apex) |
| Wrap | none 20%, a Common wrap 35%, a Rare wrap 30%, an Exotic wrap 15% |
| Each of engine, turbo, handling | stock 30%, stage I 32%, stage II 24%, stage III 14% |
| Neon / trail | 35% / 25% |

Wraps: Common (Matte Black, Primer, Two-Tone, Racing Stripes, Checkered), Rare (Woodland Camo, Arctic Camo, Carbon Fiber, Flames, Tiger), Exotic (H4CK3R, Galaxy, Gold Leaf, Neon Grid, Inferno). A retired wrap isn't rolled any more; cars that have it keep it.

## Limits that keep it fair

- **Bags are never sold.** The rank's capacity bonus only applies to bags bought with in-game money. They're still lost on death and have to be bought again with in-game money.
- **A bigger bag also risks more.** When a player dies, the balance they lose is capped at their bag's capacity, so the bonus raises that cap too.
- **A bigger bag also earns a bit more XP per trip** (added 2026-09-27). Robber-level XP comes mostly from loot sold (1 XP per $100 sold), so a rank's +5-25% bag means up to 5-25% more XP from each full bag. With the new level curve (about level 150 after a month of 2 hours a day) this matters a little more than before. Levels still can't be bought.
- **No free bag, and no bag is sold** (2026-09-27). A player with no bag carries up to $1,000 of loot in their hands (the same for everyone, no rank bonus).
- **The bag tiers are the same for everyone,** unlocked and bought with in-game money. A rank adds its percentage to whichever tier the player carries. For example, the top bag (the Vault Bag) holds $100,000, or $125,000 for a Legend.
- **Gun skins are looks only** (added 2026-10-06): a skin changes a gun's colors, never its damage, fire rate, reload, sights or sound, and it's never sold directly (only from crate keys, at random, and two from robber levels).
- **Never sold directly:** guns, gun skins, helmets, vests, bags, loot, robber levels, access to heists, trap or cop protection. In-game money, ammo, Stims and heist tools only come from paid items at random, through crate keys (the chances are above and in game).
- **Valet only saves a walk.** Taking a car out anywhere is blocked in heists, in combat and while wanted, like any car call.
- **Heist Refresh helps everyone.** A refreshed heist opens for the whole server, with no head start for the player who refreshed it.
- **Boosters are server-wide.**
  - Everyone online gets the multiplier. A money or XP booster's buyer gets a bit more (2× instead of 1.5×); Heist Rush gives its buyer nothing extra.
  - One of each kind runs at a time (a money, an XP booster and a Heist Rush can run together); more of a kind queue behind it.
  - The time only counts down while someone is online.
  - The start and end are announced, and everyone's tab list shows the booster and who bought it.
- **Robber levels can't be bought.** They're earned by selling loot and doing car contracts. An XP booster multiplies the XP a player earns that way while it runs (for everyone); nothing gives XP by itself, and crates never give XP.
- **Seasons and leaderboards** (added 2026-09-27; nothing about them is sold): three boards per season (Top Earners, Master Thieves, Wheelmen) with prizes for the top 10 (a title that can't be traded, in-game money, Season keys).
  - **A rank's bigger bag counts** on Top Earners (it counts money from loot sold, and a rank's bag holds 5-25% more); the other two boards count points per heist run (capped per run: a bigger bag, a rank's included, only reaches the cap in fewer trips), safes, vaults, getaways and car contracts.
  - **A booster's extra never counts** (Top Earners counts loot at its normal price; an XP booster only changes levels). Heist Refresh and Heist Rush open heists for everyone and count like any other run.
  - **Season keys and season titles are never sold**, can't be given by any store command, and season titles can't be traded or won from crates. No rank includes them.
- **Crates only open at crate stands in safe zones,** never inside a heist or in combat, so nobody restocks mid-fight. Only Legendary and Hacked cosmetic pulls are announced to the server.

## Setting up Tebex (the owner does these steps)

1. **Create the webstore.** Make a Tebex account and webstore at [tebex.io](https://www.tebex.io). Choose Minecraft (Java Edition) as the game.
2. **Install the plugin.** Upload the Tebex plugin jar (`tebex-bukkit-<version>.jar`) to the server's `plugins/` folder: locally in `server/plugins`, on Minehut through the File Manager. Then restart the server.
3. **Connect the server.** Copy the store's **secret key** from [creator.tebex.io/game-servers](https://creator.tebex.io/game-servers). Type `tebex secret <your key>` in the server console yourself.
   - Keep the key private and never commit it. It's saved in `plugins/Tebex/config.yml`, which git ignores.
4. **Create the packages** from the table above. For each one:
   - Paste its description from "Store descriptions" below.
   - Set its command as the **initial command**, with "run the command even if the player is offline" chosen: our commands work for offline players.
   - For each rank, also add `dranks take {username} <that rank>` as its **chargeback** and **refund** command.
     - Example: `dranks take {username} vip`.
     - It removes that rank only if the player still has it, so refunding an old VIP never takes away a Legend they bought later.
   - Boosters: make a **Boosters** category with three packages (Money Booster, XP Booster, Heist Rush), each "5 minutes" with a quantity of up to 10,000: `{purchaseQuantity}` turns 6 × "5 minutes" into 30 minutes. Their commands are in the table (`money`, `xp` or `rush`). The older money command without a kind (`dbooster add {username} 1.5 5 {purchaseQuantity}`) still works.
   - For each crate key, allow a quantity, and add `dcrate take {username} <crate> {purchaseQuantity}` as its **chargeback** and **refund** command (it takes back the keys not opened yet; opened ones are logged). Keys are one count per crate whatever their source, so a refund takes unused keys whichever way they came (the store, in-game money, /daily, a rank, an event); `crates.log` shows where each key came from.
     - Crate ids: `common`, `uncommon`, `rare`, `epic`, `legendary`. Example: `dcrate give {username} rare {purchaseQuantity}`.
5. **Show the store in game.** Put the store's address in `core.sk` as `store::url` (e.g. `donating.tebex.io`). `/store` and `/ranks` show it.
6. **Create the rank groups.** On a new server (Minehut), run `/dranks setup` once in the console. It creates the LuckPerms groups with their tags and order.
7. **Crate stands (needed: crates only open there).** Look at a block inside a safe zone and run `/dcrate place <crate>`: clicking it shows that crate with an Open button, with a hologram above (the Hacked one has an animated name). `/dcrate remove` (looking at it), `/dcrate list`.

## Store descriptions

Paste one into each Tebex package's description. Every claim matches what the server does; the bag examples use the current proposal (the Vault Bag holds $100,000), so update them if the bag sizes change.

**VIP Rank** ($4.99)

> Stand out from your first heist.
> - A green **[VIP]** tag before your name in the tab list, in chat and when you join
> - Listed above every player without a rank
> - The **Camo** bag skin
> - **+5% room in every bag** you carry: more loot per trip (a Vault Bag holds $105,000 instead of $100,000)
> - One-time purchase, yours for good
>
> Every purchase helps keep Donating online and growing.

**VIP+ Rank** ($9.99)

> For robbers who mean business.
> - An aqua **[VIP+]** tag before your name, listed above VIP
> - The **Arctic** bag skin, plus Camo (switch any time with /bagskin)
> - FREE Common Crate Keys (addon to /daily)
> - **+10% room in every bag** you carry (ex: a Vault Bag holds $110,000)
> - One-time purchase, yours for good
>
> Every purchase helps keep Donating online and growing.

**Elite Rank** ($19.99)

> Pull every job in style.
> - A gold **[Elite]** tag before your name, listed above VIP+
> - The **Gilded** bag skin, plus Arctic and Camo
> - FREE Common & Uncommon Crate Keys (addon to /daily)
> - **+20% room in every bag** you carry (ex: a Vault Bag holds $120,000)
> - Unlocks Heist Refresh (12 hour cooldown)
> - One-time purchase, yours for good
>
> Every purchase helps keep Donating online and growing.

**Legend Rank** ($34.99)

> The name everyone in the city knows.
> - A pink **[Legend]** tag before your name, at the top of the player list, right under staff
> - The **Neon** bag skin that glows in the dark, plus every other rank's skin
> - FREE Common, Uncommon, & Rare Crate Keys (addon to /daily)
> - **+25% room in every bag** you carry, the biggest bonus on the server (ex: a Vault Bag holds $125,000)
> - Unlocks Heist Refresh (6 hour cooldown)
> - Receives all testing/retired cosmetics
> - One-time purchase, yours for good
>
> Every purchase helps keep Donating online and growing.

**Money Booster (5 minutes)** ($1 each)

> Make it rain for the whole server.
> - Every loot sale pays **1.5×** for everyone online
> - Your own sales pay **2×**
> - The whole server is told you started it, and your name shows in everyone's tab list while it runs
> - Stack it: buy 6 for 30 minutes
> - Never wasted: if another money booster is running, yours waits its turn, and the clock only runs while players are online
> - Runs alongside an XP Booster or a Heist Rush
>
> Every purchase helps keep Donating online and growing.

**XP Booster (5 minutes)** (proposal: $1 each)

> Level up faster, together.
> - Every loot sale and car contract gives **1.5× robber-level XP** to everyone online
> - Your own XP is **2×**
> - Higher levels unlock bigger heists, the Drill and Safe Kit, and faster cars sooner
> - The whole server is told you started it, and your name shows in everyone's tab list while it runs
> - Stack it: buy 6 for 30 minutes
> - Never wasted: if another XP booster is running, yours waits its turn, and the clock only runs while players are online
> - Runs alongside a Money Booster or a Heist Rush
>
> Every purchase helps keep Donating online and growing.

**Heist Rush (5 minutes)** (proposal: $1 each)

> More heists, for everyone.
> - Heists reopen **2× faster**: a heist that closes gets half its usual cooldown
> - Heists already cooling down have their time left **cut in half** the moment it starts
> - Fair for all: everyone robs the extra runs, and you get no head start (just like Heist Refresh)
> - The whole server is told you started it, and your name shows in everyone's tab list while it runs
> - Stack it: buy 6 for 30 minutes
> - Never wasted: if another Heist Rush is running, yours waits its turn, and the clock only runs while players are online
> - Runs alongside a Money Booster or an XP Booster
>
> Every purchase helps keep Donating online and growing.

**Crate keys.** One package per crate (the ranges and chances come from "What's in each crate" above; update these when the crates change).

**Common Crate Key** ($0.49)

> A little something for your next job.
> - Opens one **Common Crate** at a crate stand in the city
> - Mostly cash (**$200 to $900**), ammo (Light Rounds, Shotgun Shells or Rifle Rounds), **2 Stims** or a **Safe Kit**
> - A 3% chance of a Common cosmetic: the titles **Lookout**, **Wheelman** or **Hustler**, the **Smoke Bomb** kill effect, the **Desert** bag skin or the **Desert Machine Gun** skin
> - Already have that cosmetic? You get $200 instead. Ammo or gear that doesn't fit pays half its shop price
> - See every reward and its exact chance in game: /crates, then click the crate
> - Also sold in game for **$1,500** of in-game money (/crates)
> - Buy as many as you like
>
> Every purchase helps keep Donating online and growing.

**Uncommon Crate Key** ($0.99)

> A better cut.
> - Opens one **Uncommon Crate** at a crate stand in the city
> - Mostly cash (**$700 to $2,250**), more ammo, **3 Stims** or **2 Safe Kits**
> - A 5% chance of an Uncommon cosmetic: the titles **Ghost**, **Smooth Operator** or **Night Owl**, the **Flames** or **Sparks** kill effect, the **Urban** or **Cherry** bag skin, or the **Bubblegum Classic Pistol** or **Urban Camo Shotgun** skin
> - Already have that cosmetic? You get $500 instead. Ammo or gear that doesn't fit pays half its shop price
> - See every reward and its exact chance in game: /crates, then click the crate
> - Also sold in game for **$4,000** of in-game money (/crates)
> - Buy as many as you like
>
> Every purchase helps keep Donating online and growing.

**Rare Crate Key** ($1.99)

> Where the real tools are.
> - Opens one **Rare Crate** at a crate stand in the city
> - Mostly cash (**$1,800 to $5,400**), a stack of ammo, **3 Stims**, **3 Safe Kits** or a **Drill** for vault doors
> - A 7% chance of a Rare cosmetic: the titles **Inside Man** or **Phantom**, the **Cash Burst** or **Souls** kill effect, the **Cash Print** or **Crimson** bag skin, or the **Woodland Camo Machine Gun** or **Crimson AK-48** skin
> - Already have that cosmetic? You get $1,500 instead. Gear that doesn't fit pays half its shop price
> - See every reward and its exact chance in game: /crates, then click the crate
> - Also sold in game for **$10,000** of in-game money (/crates)
> - Buy as many as you like
>
> Every purchase helps keep Donating online and growing.

**Epic Crate Key** ($3.99)

> Big money, bigger style.
> - Opens one **Epic Crate** at a crate stand in the city
> - Mostly cash (**$4,500 to $13,500**), a **Drill** or **3 Stims**
> - A 10% chance of an Epic cosmetic: the titles **Untouchable** or **Big Fish**, the **Fireworks** or **Storm Cloud** kill effect, the **Tiger** or **Carbon** bag skin, or the **Tiger Shotgun** or **Carbon Machine Gun** skin
> - Already have that cosmetic? You get $3,000 instead
> - See every reward and its exact chance in game: /crates, then click the crate
> - Also sold in game for **$25,000** of in-game money (/crates)
> - Buy as many as you like
>
> Every purchase helps keep Donating online and growing.

**Legendary Crate Key** ($8.99)

> The best crate you can open.
> - Opens one **Legendary Crate** at a crate stand in the city
> - Mostly cash (**$11,000 to $34,000**) or a **Drill**
> - A 15% chance of a Legendary prize: the exclusive **Vandal** car (3%), the titles **Most Wanted** or **The Boss**, the **Dragon's Breath** or **Totem** kill effect, the glowing **Diamond** or **Molten** bag skin, or the **Golden AK-48** or **Molten Shotgun** skin
> - A Legendary cosmetic or car pull is announced to the whole server
> - Already have that prize? You get $5,000 instead
> - See every reward and its exact chance in game: /crates, then click the crate
> - Also sold in game for **$60,000** of in-game money (/crates)
> - Buy as many as you like
>
> Every purchase helps keep Donating online and growing.

Cosmetics and cars won from crates can be traded with other players in person (/trade). Daily keys (free with /daily), Hacked keys (special events only) and the car crates' keys (in-game money only) are never sold.

## Commands the store uses (the owner can run them too)

- `dranks give <player> <legend|elite|vipplus|vip|none>`: gives one paid rank and removes any other. A player who already has a higher rank keeps it. Works for players who haven't joined yet.
- `dranks take <player> <rank>`: removes that rank, but only if it's the player's current rank (for refunds and chargebacks).
- `dbooster add <player> <money|xp|rush> <multiplier> <minutes> [count]` (without a kind: a money booster):
  - Queues a server-wide booster of that kind lasting minutes × count (money: loot sales pay × multiplier; xp: level XP × multiplier; rush: heists cool down multiplier times faster).
  - The multiplier is rounded to 2 decimals and must be more than 1 and at most 2.
  - The count is 1 to 10,000. One booster lasts at most 240 minutes; a longer purchase is split into several queued boosters.
  - A refused delivery is logged, so it can be refunded.
- `dcrate give <player> <crate> [count]`: adds keys (count 1 to 10,000; the player is told if online). `dcrate take <player> <crate> [count]`: takes back up to that many unused keys. `dcrate info <player>`: their keys. Hacked keys are given this way at events.
- `dbooster stop [kind] | clear [kind] | info [kind]` (no kind: the money booster), `dranks list`, `dcrate list`: manage and inspect.

Logs: `plugins/Skript/logs/ranks.log` (ranks, Heist Refresh), `boosters.log` and `crates.log` (every key given, taken and used, and what each opening paid) record who ran what, including refusals.