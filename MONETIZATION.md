# Donating: what players can buy

This is the disclosure Minehut asked for. On 2026-09-26 Minehut staff told the owner that paid perks which affect gameplay are OK, as long as Minehut gets a private document listing every one of them. Keep this file current: when a paid item is added or changed, update the table and send the new version to Minehut.

Everything is sold through **Tebex** (the official Tebex plugin). When someone buys, Tebex runs one of our console commands on the server. Only the console (Tebex) and the owner can run those commands: they need the permission `donating.store`, which plain staff don't get.

## Everything a player can buy

Rank prices were picked on 2026-09-26 with the owner's OK (one-time purchases, the rank is kept for good); the booster price is the owner's; the owner sets the key prices. The perk numbers and crate contents are still proposals. The server's settings are in `server/plugins/Skript/scripts/core.sk`.

| Purchase | What the player gets | Affects gameplay? | Numbers (proposal) | Tebex command |
|---|---|---|---|---|
| **VIP** rank | Green `[VIP]` tag before their name in the tab list, chat and join messages; sorted above players without a rank in the tab list; the Camo bag look; their bags hold **+5%** | **Yes:** +5% bag capacity | $4.99 once | `dranks give {username} vip` |
| **VIP+** rank | Aqua `[VIP+]` tag, sorted above VIP; Arctic and Camo bag looks; bags hold **+10%**; a **Common crate key** with every /daily | **Yes:** +10% bag capacity; a daily Common key | $9.99 once | `dranks give {username} vipplus` |
| **Elite** rank | Gold `[Elite]` tag, sorted above VIP+; Gilded and lower bag looks; bags hold **+20%**; **Common and Uncommon keys** with every /daily; **Heist Refresh** every 12 hours | **Yes:** +20% bag capacity; daily keys; Heist Refresh | $19.99 once | `dranks give {username} elite` |
| **Legend** rank | Pink `[Legend]` tag, sorted above Elite; Neon (glows in the dark) and every lower bag look; bags hold **+25%**; **Common, Uncommon and Rare keys** with every /daily; **Heist Refresh** every 6 hours; every retired and testing cosmetic | **Yes:** +25% bag capacity; daily keys; Heist Refresh | $34.99 once | `dranks give {username} legend` |
| **Money booster** | For its time, every loot sale pays **1.5×** for everyone on the server; the buyer's own sales pay **2×** | **Yes:** everyone earns more while it runs; the buyer earns a bit more than others | **$1 per 5 minutes** (any quantity) | `dbooster add {username} 1.5 5 {purchaseQuantity}` |
| **Crate keys** (Common, Uncommon, Rare, Epic, Legendary) | One opening of that crate per key: a random reward from its list below (the odds are shown in game: /crates, right-click a crate) | **Yes:** crates can give in-game money, ammo, Stims and heist tools; the rest are looks only | Owner sets the prices (suggested: $0.99 / $1.99 / $3.99 / $7.99 / $14.99), any quantity | `dcrate give {username} <crate> {purchaseQuantity}` |

A player has one rank at a time. Buying a higher rank replaces the lower one, and buying a lower rank never takes away a higher one.

**Not sold:** Daily keys (everyone gets one free with /daily every 20 hours) and Hacked keys (only given out at special events).

### Heist Refresh (Elite and Legend)

`/heistrefresh <heist>` reopens a heist that's cooling down, **for everyone**: it opens as soon as its room reset is done, and the whole server is told who refreshed it. It only works on a closed heist (never a running or open one) that the player's robber level allows, and it gives no head start. Elite can use it every 12 hours, Legend every 6.

### What's in each crate

A crate gives exactly one reward per key, picked at random with the chances below. Ammo, Stims and tools that don't fit (full inventory, carry limit, a tool above the player's level) pay their normal shop price in in-game money instead. A cosmetic the player already has pays its rarity's repeat value ($400 Common, $1,000 Uncommon, $3,000 Rare, $8,000 Epic, $20,000 Legendary, $25,000 Hacked). Titles, bag skins and kill effects are looks only.
**Daily Crate**

| Reward | Kind | Chance |
|---|---|---|
| $250 | in-game money | 25% |
| $500 | in-game money | 18% |
| $1,000 | in-game money | 8% |
| 32 Light Rounds | ammo | 12% |
| 14 Shotgun Shells | ammo | 8% |
| 30 Rifle Rounds | ammo | 8% |
| 1 Stim | consumable | 10% |
| 1 Safe Kit | heist tool | 5% |
| Rookie (title, Common) | looks only | 2% |
| Lookout (title, Common) | looks only | 2% |
| Poof (kill effect, Common) | looks only | 1% |
| Denim (bag skin, Common) | looks only | 1% |

Gameplay items (money, ammo, consumables, tools): 94% of openings.

**Common Crate**

| Reward | Kind | Chance |
|---|---|---|
| $500 | in-game money | 19% |
| $1,000 | in-game money | 14% |
| $2,000 | in-game money | 6% |
| 64 Light Rounds | ammo | 10% |
| 28 Shotgun Shells | ammo | 8% |
| 60 Rifle Rounds | ammo | 8% |
| 2 Stims | consumable | 8% |
| 1 Safe Kit | heist tool | 6% |
| Rookie (title, Common) | looks only | 4% |
| Lookout (title, Common) | looks only | 4% |
| Wheelman (title, Common) | looks only | 3% |
| Hustler (title, Common) | looks only | 3% |
| Poof (kill effect, Common) | looks only | 3% |
| Smoke Bomb (kill effect, Common) | looks only | 2% |
| Denim (bag skin, Common) | looks only | 1% |
| Desert (bag skin, Common) | looks only | 1% |

Gameplay items (money, ammo, consumables, tools): 79% of openings.

**Uncommon Crate**

| Reward | Kind | Chance |
|---|---|---|
| $1,500 | in-game money | 18% |
| $2,000 | in-game money | 5% |
| $3,000 | in-game money | 12% |
| $5,000 | in-game money | 4% |
| 128 Light Rounds | ammo | 8% |
| 56 Shotgun Shells | ammo | 6% |
| 120 Rifle Rounds | ammo | 6% |
| 3 Stims | consumable | 8% |
| 2 Safe Kits | heist tool | 6% |
| Ghost (title, Uncommon) | looks only | 5% |
| Smooth Operator (title, Uncommon) | looks only | 4% |
| Night Owl (title, Uncommon) | looks only | 4% |
| Flames (kill effect, Uncommon) | looks only | 4% |
| Sparks (kill effect, Uncommon) | looks only | 4% |
| Urban (bag skin, Uncommon) | looks only | 3% |
| Cherry (bag skin, Uncommon) | looks only | 3% |

Gameplay items (money, ammo, consumables, tools): 73% of openings.

**Rare Crate**

| Reward | Kind | Chance |
|---|---|---|
| $4,000 | in-game money | 18% |
| $6,000 | in-game money | 3% |
| $8,000 | in-game money | 10% |
| $12,000 | in-game money | 4% |
| 240 Rifle Rounds | ammo | 8% |
| 112 Shotgun Shells | ammo | 6% |
| 3 Stims | consumable | 6% |
| 1 Drill | heist tool | 8% |
| 3 Safe Kits | heist tool | 5% |
| Inside Man (title, Rare) | looks only | 6% |
| Phantom (title, Rare) | looks only | 6% |
| Cash Burst (kill effect, Rare) | looks only | 5% |
| Souls (kill effect, Rare) | looks only | 5% |
| Cash Print (bag skin, Rare) | looks only | 5% |
| Crimson (bag skin, Rare) | looks only | 5% |

Gameplay items (money, ammo, consumables, tools): 68% of openings.

**Epic Crate**

| Reward | Kind | Chance |
|---|---|---|
| $10,000 | in-game money | 18% |
| $20,000 | in-game money | 10% |
| $30,000 | in-game money | 5% |
| 1 Drill | heist tool | 8% |
| 3 Stims | consumable | 5% |
| Untouchable (title, Epic) | looks only | 9% |
| Big Fish (title, Epic) | looks only | 9% |
| Fireworks (kill effect, Epic) | looks only | 8% |
| Storm Cloud (kill effect, Epic) | looks only | 8% |
| Tiger (bag skin, Epic) | looks only | 10% |
| Carbon (bag skin, Epic) | looks only | 10% |

Gameplay items (money, ammo, consumables, tools): 46% of openings.

**Legendary Crate**

| Reward | Kind | Chance |
|---|---|---|
| $25,000 | in-game money | 20% |
| $50,000 | in-game money | 10% |
| $75,000 | in-game money | 5% |
| Most Wanted (title, Legendary) | looks only | 11% |
| The Boss (title, Legendary) | looks only | 11% |
| Dragon's Breath (kill effect, Legendary) | looks only | 11% |
| Totem (kill effect, Legendary) | looks only | 11% |
| Diamond (bag skin, Legendary) | looks only | 11% |
| Molten (bag skin, Legendary) | looks only | 10% |

Gameplay items (money, ammo, consumables, tools): 35% of openings.

**Hacked Crate**

| Reward | Kind | Chance |
|---|---|---|
| $50,000 | in-game money | 20% |
| H4CK3R (title, Hacked) | looks only | 16% |
| Zero Day (title, Hacked) | looks only | 16% |
| Glitch (kill effect, Hacked) | looks only | 24% |
| Matrix (bag skin, Hacked) | looks only | 24% |

Gameplay items (money, ammo, consumables, tools): 20% of openings.

## Limits that keep it fair

- **Bags are never sold.** The rank's capacity bonus only applies to bags bought with in-game money. They're still lost on death and have to be bought again with in-game money.
- **A bigger bag also risks more.** When a player dies, the balance they lose is capped at their bag's capacity, so the bonus raises that cap too.
- **The bag tiers are the same for everyone,** unlocked and bought with in-game money. A rank adds its percentage to whichever tier the player carries. For example, the top bag (the Vault Bag) holds $100,000, or $125,000 for a Legend.
- **Never sold directly:** guns, helmets, vests, bags, loot, robber levels, access to heists, trap or cop protection. In-game money, ammo, Stims and heist tools only come from paid items at random, through crate keys (the chances are above and in game).
- **Heist Refresh helps everyone.** A refreshed heist opens for the whole server, with no head start for the player who refreshed it.
- **Boosters are server-wide.**
  - Everyone online gets the multiplier.
  - They run one at a time; more queue behind.
  - The time only counts down while someone is online.
  - The start and end are announced, and everyone's tab list shows the booster and who bought it.
- **Robber levels can't be bought.** They're earned by selling loot, and boosters and crates don't add level XP.
- **Crates can't be opened inside a heist or in combat,** so nobody restocks mid-fight.

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
   - For the booster, allow a quantity of up to 10,000: `{purchaseQuantity}` turns 6 × "5 minutes" into 30 minutes.
   - For each crate key, allow a quantity, and add `dcrate take {username} <crate> {purchaseQuantity}` as its **chargeback** and **refund** command (it takes back the keys not opened yet; opened ones are logged).
     - Crate ids: `common`, `uncommon`, `rare`, `epic`, `legendary`. Example: `dcrate give {username} rare {purchaseQuantity}`.
5. **Show the store in game.** Put the store's address in `core.sk` as `store::url` (e.g. `donating.tebex.io`). `/store` and `/ranks` show it.
6. **Create the rank groups.** On a new server (Minehut), run `/dranks setup` once in the console. It creates the LuckPerms groups with their tags and order.
7. **Crate stands (optional).** Look at a block in game and run `/dcrate place <crate>`: clicking it shows that crate with an Open button, with a hologram above. `/dcrate remove` (looking at it), `/dcrate list`.

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
> - Never wasted: if another booster is running, yours waits its turn, and the clock only runs while players are online
>
> Every purchase helps keep Donating online and growing.

**Crate keys.** One package per crate. The owner adds their own line about what the rewards are worth.

> **Common Crate Key**: cash, ammo, Stims, a Safe Kit, or a Common title, kill effect or bag skin.
> **Uncommon Crate Key**: bigger cash, more ammo, Stims, Safe Kits, or an Uncommon title, kill effect or bag skin.
> **Rare Crate Key**: up to $12,000 cash, a Drill, Safe Kits, or a Rare title, kill effect or bag skin (Cash Print, Crimson).
> **Epic Crate Key**: up to $30,000 cash, a Drill, or an Epic title, kill effect (Fireworks, Storm Cloud) or bag skin (Tiger, Carbon).
> **Legendary Crate Key**: up to $75,000 cash, or a Legendary title, kill effect (Dragon's Breath, Totem) or glowing bag skin (Diamond, Molten).
>
> Every key opens one crate. See every reward and its exact chance in game: /crates, then right-click a crate. Already have a cosmetic? You get cash instead. Stack keys: buy as many as you like.
>
> Every purchase helps keep Donating online and growing.

## Commands the store uses (the owner can run them too)

- `dranks give <player> <legend|elite|vipplus|vip|none>`: gives one paid rank and removes any other. A player who already has a higher rank keeps it. Works for players who haven't joined yet.
- `dranks take <player> <rank>`: removes that rank, but only if it's the player's current rank (for refunds and chargebacks).
- `dbooster add <player> <multiplier> <minutes> [count]`:
  - Queues a server-wide money booster lasting minutes × count.
  - The multiplier is rounded to 2 decimals and must be more than 1 and at most 2.
  - The count is 1 to 10,000. One booster lasts at most 240 minutes; a longer purchase is split into several queued boosters.
  - A refused delivery is logged, so it can be refunded.
- `dcrate give <player> <crate> [count]`: adds keys (count 1 to 10,000; the player is told if online). `dcrate take <player> <crate> [count]`: takes back up to that many unused keys. `dcrate info <player>`: their keys. Hacked keys are given this way at events.
- `dbooster stop | clear | info`, `dranks list`, `dcrate list`: manage and inspect.

Logs: `plugins/Skript/logs/ranks.log` (ranks, Heist Refresh), `boosters.log` and `crates.log` (every key given, taken and used, and what each opening paid) record who ran what, including refusals.