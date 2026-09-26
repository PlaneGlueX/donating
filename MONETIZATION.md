# Donating: what players can buy

This is the disclosure Minehut asked for. On 2026-09-26 Minehut staff told the owner that paid perks which affect gameplay are OK, as long as Minehut gets a private document listing every one of them. Keep this file current: when a paid item is added or changed, update the table and send the new version to Minehut.

Everything is sold through **Tebex** (the official Tebex plugin). When someone buys, Tebex runs one of our console commands on the server. Only the console (Tebex) and the owner can run those commands: they need the permission `donating.store`, which plain staff don't get.

## Everything a player can buy

Rank prices were picked on 2026-09-26 with the owner's OK (one-time purchases, the rank is kept for good); the booster price is the owner's. The perk numbers are still proposals. The server's settings are in `server/plugins/Skript/scripts/core.sk`.

| Purchase | What the player gets | Affects gameplay? | Numbers (proposal) | Tebex command |
|---|---|---|---|---|
| **VIP** rank | Green `[VIP]` tag before their name in the tab list, chat and join messages; sorted above players without a rank in the tab list; the Camo bag look; their bags hold **+5%** | **Yes:** +5% bag capacity | $4.99 once | `dranks give {username} vip` |
| **VIP+** rank | Aqua `[VIP+]` tag, sorted above VIP; Arctic and Camo bag looks; bags hold **+10%** | **Yes:** +10% bag capacity | $9.99 once | `dranks give {username} vipplus` |
| **Elite** rank | Gold `[Elite]` tag, sorted above VIP+; Gilded and lower bag looks; bags hold **+15%** | **Yes:** +15% bag capacity | $19.99 once | `dranks give {username} elite` |
| **Legend** rank | Pink `[Legend]` tag, sorted above Elite; Neon (glows in the dark) and every lower bag look; bags hold **+20%** | **Yes:** +20% bag capacity | $34.99 once | `dranks give {username} legend` |
| **Money booster** | For its time, every loot sale pays **1.5×** for everyone on the server; the buyer's own sales pay **2×** | **Yes:** everyone earns more while it runs; the buyer earns a bit more than others | **$1 per 5 minutes** (any quantity) | `dbooster add {username} 1.5 5 {purchaseQuantity}` |

A player has one rank at a time. Buying a higher rank replaces the lower one, and buying a lower rank never takes away a higher one.

## Limits that keep it fair

- **Bags are never sold.** The rank's capacity bonus only applies to bags bought with in-game money. They're still lost on death and have to be bought again with in-game money.
- **A bigger bag also risks more.** When a player dies, the balance they lose is capped at their bag's capacity, so the bonus raises that cap too.
- **The bag tiers are the same for everyone,** unlocked and bought with in-game money. A rank adds its percentage to whichever tier the player carries. For example, the top bag (the Vault Bag) holds $100,000, or $120,000 for a Legend.
- **Never sold:** guns, ammo, helmets, vests, heist tools, loot, in-game money, robber levels, access to heists, trap or cop protection.
- **Boosters are server-wide.**
  - Everyone online gets the multiplier.
  - They run one at a time; more queue behind.
  - The time only counts down while someone is online.
  - The start and end are announced, and everyone's tab list shows the booster and who bought it.
- **Robber levels can't be bought.** They're earned by selling loot, and boosters don't add level XP.

## Setting up Tebex (the owner does these steps)

1. **Create the webstore.** Make a Tebex account and webstore at [tebex.io](https://www.tebex.io). Choose Minecraft (Java Edition) as the game.
2. **Install the plugin.** Upload the Tebex plugin jar (`tebex-bukkit-<version>.jar`) to the server's `plugins/` folder: locally in `server/plugins`, on Minehut through the File Manager. Then restart the server.
3. **Connect the server.** Copy the store's **secret key** from [creator.tebex.io/game-servers](https://creator.tebex.io/game-servers). Type `tebex secret <your key>` in the server console yourself.
   - Keep the key private and never commit it. It's saved in `plugins/Tebex/config.yml`, which git ignores.
4. **Create the packages** from the table above. For each one:
   - Set its command as the **initial command**, with "run the command even if the player is offline" chosen: our commands work for offline players.
   - For each rank, also add `dranks take {username} <that rank>` as its **chargeback** and **refund** command.
     - Example: `dranks take {username} vip`.
     - It removes that rank only if the player still has it, so refunding an old VIP never takes away a Legend they bought later.
   - For the booster, allow a quantity of up to 10,000: `{purchaseQuantity}` turns 6 × "5 minutes" into 30 minutes.
5. **Show the store in game.** Put the store's address in `core.sk` as `store::url` (e.g. `donating.tebex.io`). `/store` and `/ranks` show it.
6. **Create the rank groups.** On a new server (Minehut), run `/dranks setup` once in the console. It creates the LuckPerms groups with their tags and order.

## Commands the store uses (staff can run them too)

- `dranks give <player> <legend|elite|vipplus|vip|none>`: gives one paid rank and removes any other. A player who already has a higher rank keeps it. Works for players who haven't joined yet.
- `dranks take <player> <rank>`: removes that rank, but only if it's the player's current rank (for refunds and chargebacks).
- `dbooster add <player> <multiplier> <minutes> [count]`:
  - Queues a server-wide money booster lasting minutes × count.
  - The multiplier is rounded to 2 decimals and must be more than 1 and at most 2.
  - The count is 1 to 10,000. One booster lasts at most 240 minutes; a longer purchase is split into several queued boosters.
  - A refused delivery is logged, so it can be refunded.
- `dbooster stop | clear | info`, `dranks list`: manage and inspect.

Logs: `plugins/Skript/logs/ranks.log` and `plugins/Skript/logs/boosters.log` record every give, take, booster, refusal, stop and cleared queue entry, with who ran it.
