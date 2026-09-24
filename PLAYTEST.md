# Donating: playtest log

How to read this: each check says what to do and what should happen. The result goes under it.
Results: PASS / FAIL / TODO (not run yet) / HUMAN (needs the owner in-game).
Tester: `bot` (Mineflayer), `rcon` (console), `cu` (Claude with computer use), `owner`.
Rerun the bot checks any time: `tools\node\node.exe bots\run.js <scenario>` (server running, `zz-testkit.sk` loaded).

## Setup (local server)

1. **Paper boots on 1 GB with no plugins.** Run `tools\start-server.ps1`; the log shows `Done (...)`.
   - Result: PASS (rcon, 2026-09-24). Paper 1.21.11 #132, Java 21.0.12, started in 16.8 s. RCON bound to 127.0.0.1:25575 only.
2. **RCON works from this PC only.** Run `tools\rcon.ps1 "list"`; it replies with the player list.
   - Result: PASS (rcon, 2026-09-24). Multi-packet replies come back complete. (Fixed: the end marker must be sent after the first reply, or the server drops the connection.)
3. **Clean stop.** Run `tools\stop-server.ps1`; the world saves and the process exits.
   - Result: PASS (rcon, 2026-09-24).
4. **All planned plugins load with no errors on 1 GB.** Start the server; `plugins` lists them all; no `ERROR`/`Exception` lines in `logs\latest.log`.
   - Result: PASS (rcon, 2026-09-24). 18 plugins (15 Bukkit + 3 Paper). Startup 26.5 s. Live heap after full GC: about 435 MB of 1024 MB with no players.
5. **A bot can join (offline mode, local only).** `bots\run.js join`: it spawns, runs `/list`, reads its inventory.
   - Result: PASS (bot, 2026-09-24). A new player gets no EssentialsX welcome broadcast and no starter kit.
6. **A 26.x client joins through ViaVersion.** Join `localhost` with the current Minecraft client.
   - Result: PASS (cu, 2026-09-24). Owner's account Explosde, client 26.3, joined via ViaVersion 5.12.0. TAB sidebar "DONATING / Player / Online" shows. Note: vanilla "joined the game" message still shows (join-quit.sk will replace it).

## core.sk

7. **Money formatting.** `formatMoney` / `formatMoneyShort` on 0, 5, 999, 1000, 1001, 100005, 1234567.89, -1500, 1000000, 987654321012.
   - Result: PASS (rcon, 2026-09-24). "$1,234,567" / "$1.2M", "-$1,500" / "-$1.5K", "$987,654,321,012" / "$987.6B".
8. **Settings read from other scripts.** `cfg("bag::2::capacity")` = 6000, `cfg("afk::after")` = 5 minutes.
   - Result: PASS (rcon, 2026-09-24).
9. **Item ids.** `tagItem` then `itemId` returns "phone"; an untagged item returns "".
   - Result: PASS (rcon, 2026-09-24).
10. **Messages keep colors.** `msg()` turns `&` codes into colors, and the prefix's bold doesn't leak into the message.
    - Result: PASS (bot, 2026-09-24) after a fix (`&r` after the bold prefix).
11. **Balance can't go below $0.** Give $1,000, take $1,500: takes exactly $1,000; taking from $0 takes $0.
    - Result: PASS (rcon, 2026-09-24).

## inventory.sk: fixed inventory (bot: `bots\run.js inventory-lock`, 39 checks)

Every check compares the full server-side inventory (all 41 slots + cursor) before and after, and checks that nothing appeared on the ground.

12. **Layout on join:** phone in hotbar 9, bag in the offhand. PASS (bot).
13. **Inventory clicks can't move anything:** pick up + place, shift-click, number key, F on an item and on the bag slot, Q and Ctrl+Q over a slot, double-click collect, click outside with an item, drag across slots. PASS (bot) and PASS (cu, real 26.3 client).
14. **Keys outside the inventory:** F with the sword and with an empty hand, Q with the sword, Ctrl+Q with the phone. PASS (bot) and PASS (cu).
15. **Middle-click pick block** (would pull a matching block from the upper inventory into the hotbar). PASS (bot, with a bypass control that proves the move happens without the lock) and PASS (cu).
16. **Recipe book auto-fill** (clicking a craftable recipe moves items into the crafting grid; closing puts them in the first free hotbar slot).
    - Result: FAIL (cu) before the fix: stone moved from the upper inventory to hotbar 2. PASS (cu) after adding `on recipe book click`. Not bot-testable (needs recipe book ids).
17. **Right-click entities and blocks holding an item:** armor stand, item frame, allay, decorated pot, potted plant. PASS (bot, each with a bypass control).
18. **Ground items and arrows can't be picked up.** PASS (bot).
19. **Death drops nothing** and the phone and bag are back after respawn (keep_inventory on). PASS (bot).
20. **Watchdog:** if a command moves the bag out of the offhand or the phone out of hotbar 9, they are swapped back within a tick. PASS (bot).
21. **Staff bypass:** with `donating.inventory.bypass`, items can be moved. PASS (bot). An opped player without it is still locked. PASS (bot).
22. **Guns still work with the lock** (`bots\run.js wm-reload`): WeaponMechanics AK-47 given into hotbar 1, right-click shoots (5 -> 3 rounds), Q reloads (-> 30), the gun stays in hotbar 1, nothing drops.
    - Result: PASS (bot) after giving the default group `weaponmechanics.use.*` (without it WeaponMechanics refuses to shoot or reload: "You do not have permission to use...").

## Needs a human (owner)

23. **Feel of the lock:** open the inventory, try to drag things around, press F/Q while holding a gun. Nothing should flicker badly or feel broken.
    - Result: HUMAN / TODO
24. **Car entry with MTVehicles** (after installing it): right-clicking a car still lets you get in (the lock cancels right-clicks on entities after other plugins run).
    - Result: TODO (MTVehicles not installed yet)
