# Donating: playtest log

How to read this: each check says what to do and what should happen. The result goes under it.
Results: PASS / FAIL / TODO (not run yet) / HUMAN (needs the owner in-game).
Tester: `bot` (Mineflayer), `rcon` (console), `cu` (Claude with computer use), `owner`.
Rerun the bot checks any time: `tools\node\node.exe bots\run.js <scenario>` (server running, `zz-testkit.sk` loaded).

**Start here (next local session):** the cloud session left items 25–34 untested. Follow the handoff steps in CLAUDE.md (Status, cloud session), then run items 25 → 34 in order and write each result under its item.

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

## Cloud session 2026-09-24: written but untested (run these locally first)

The cloud session couldn't run a server, so everything below is "untested (cloud)". Its Skript syntax was checked by hand against the Skript 2.16.2 source only. Changed: core.sk (`msg`/`broadcastMsg` use `colored`, not `formatted`; `cfg()` logs missing keys; `giveMoney` ignores amounts <= 0; new `legacyText()` and `chat::tip-interval`), inventory.sk (cakes locked, respawn skips players who left), new join-quit.sk, chat-extras.sk and afk.sk, EssentialsX `disabled-commands: afk`, new zz-testkit helpers (`/zzforget`, `/zzbal`, `/zzcfg`, `/zzafk`, `/zzafkstate`, `/zztip`).

25. **Everything loads.** Restart the server (EssentialsX reads `disabled-commands` at startup); the log shows core, inventory, join-quit, chat-extras, afk and zz-testkit loading with no errors or warnings. Fix them in that order with `/sk reload <script>`.
    - Lines most likely to fail, with a fallback for each (never switch player text to `formatted`):
      - core.sk `send colored "..."` in `msg()`: if colors show as raw `&7`, `colored` isn't parsing the inserted text. Find another safe-parser way; `formatted` is only OK for text the server wrote.
      - join-quit.sk `prefix of {_p}`: fails if Skript didn't hook Vault's chat (LuckPerms provides it). Fallback: the LuckPerms prefix through skript-placeholders (needs `/papi ecloud download LuckPerms`).
      - join-quit.sk `set join message to colored "..."`: if it's rejected, a plain string also works (Skript turns it into a component with the safe parser).
      - chat-extras.sk `character from codepoint 167`: fallback is a literal `§` in the string.
      - chat-extras.sk `legacyText(message)`: if Skript won't pass the message as text, use `set {_text} to "%message%"` plus `replace all "\<" with "<" in {_text}` (MiniMessage escapes `<`).
      - chat-extras.sk `regex replace "..." in {_text} with "..."`: the other word order is `regex replace "..." with "..." in {_text}`.
      - chat-extras.sk `set message to raw {_text}`: if it's rejected, drop the lime highlight and keep the ping. Don't use `colored` there (it would let players color their text).
      - afk.sk `on press of any input key`: if it doesn't parse, use `on player move` (AFK pools would then count as activity).
      - afk.sk `on command` with `player is set`: fallback `sender is a player`.
      - zz-testkit.sk `set balance of arg-1 to 0`: fallback `execute console command "eco set %arg-1% 0"`.
    - Result: PASS (rcon, 2026-09-24, local). "All scripts loaded without errors", 6 scripts, no warnings on the first start. None of the fallbacks were needed.
26. **Inventory lock still holds** (`bots\run.js inventory-lock`, now 41 checks): adds "right-click cake holding a candle" (the lock keeps the candle) and its bypass control (without the lock the candle is used up).
    - Result: PASS (bot, 2026-09-24, local). 41/41.
27. **Earlier scenarios still pass** after the `msg()` change: `bots\run.js join`, `bots\run.js wm-reload`.
    - Result: PASS (bot, 2026-09-24, local). join 4/4, wm-reload 5/5. TestBot1 has stone tools in hotbar 1-4 from its first join, before `newbies.kit` was set to ''. A brand-new player (KitCheck15) gets only the phone, so it's leftover data, not a bug.
28. **Join/quit** (`bots\run.js join-quit`, 15 checks): a first join shows `[+] Name joined for the first time (#N)` to others, gives the new player the welcome title, the welcome message and `cfg("money::start")` once; a quit shows `[-] Name`; a rejoin with a LuckPerms prefix shows `[+] [Test] Name` with no welcome and no second payout; `/help` and `/help 2` show the how-to-play page; no vanilla "joined/left the game" lines; no raw `&` codes or `<tags>`; the prefix's bold doesn't leak into `msg()` text.
    - Result: PASS (bot, 2026-09-24, local). 15/15 after a test fix. The welcome title arrived, but Mineflayer's `title` event logged 1.21 NBT titles as "[object Object]"; `bots\lib.js` now decodes the title packets itself. If the start money is paid twice, check EssentialsX `starting-balance` is still 0. If the prefix check fails but the rest passes, LuckPerms' reply was slow: raise the 2-second wait after `meta setprefix`.
29. **Missing settings are reported.** `tools\rcon.ps1 "zzcfg no::such::key"`, then `logs\latest.log` shows `[Donating] Missing setting: no::such::key`.
    - Result: PASS (rcon, 2026-09-24, local).
30. **Join/quit look right in the real client:** gray brackets, green `+` / red `-`, the owner prefix in dark red, the welcome title and sound on a first join (use `/zzforget Explosde` from the console first; it resets your balance to $0).
    - Result: HUMAN / TODO
31. **Chat extras** (`bots\run.js chat-extras`, 20 checks): a second message within `chat::cooldown` is blocked with "Slow down!" (staff exempt); `hey @chatb, look` shows `@ChatB` in lime to everyone (the text after it isn't lime) and pings ChatB only; `@ChatBx` pings nobody; `&cred <bold>big</bold> @ChatB` stays uncolored and literal; `/sc` and `/broadcast` are refused without `donating.staff`; `/sc msg` and staff chat mode reach staff only; `/bc` reaches everyone with the prefix; `/zztip` sends a tip.
    - Result: PASS (bot, 2026-09-24, local). 20/20 after one script fix and two test fixes:
      - Script: `/bc` still ran EssentialsX's broadcast ("denied access"): Skript's `aliases:` don't take over another plugin's alias. `/bc` is now its own command.
      - Test: Mineflayer showed the typed text instead of what the client sees (LPC's format and the lime mention come as unsigned content). `bots\lib.js` now records that.
      - Test: `colorOf` didn't look inside a translation's arguments (player chat is translate "%s"). The "text after the mention is not lime" check also passed without finding the text; it now has to find it.
    - Needs chat-extras.sk, core.sk and join-quit.sk (for `rankedName`) loaded. If the mention isn't lime but the ping works, check that LPC still keeps `§` codes (its `processMessage` only strips `&` codes).
32. **AFK** (`bots\run.js afk`, 10 checks): AFK within 10 s of `/zzafk` (last activity set 10 minutes back) with a message; idle position packets don't end it; looking around, `/afk`, chatting, any command, and a movement key each end it; `/afk` toggles.
    - Result: TODO (not run yet locally). If only the movement-key check fails, Mineflayer may not send input packets; check with the real client instead (item 33).
33. **AFK while driving and in water (real client):** `/afk`, then hold W in a car (after MTVehicles): AFK ends. Stand in a water stream without touching anything for 5 minutes: you still go AFK.
    - Result: HUMAN / TODO
34. **EssentialsX /afk is off:** `/afk` shows afk.sk's message ("You're now AFK"), not EssentialsX's.
    - Result: TODO (not run yet locally)

## Needs a human (owner)

23. **Feel of the lock:** open the inventory, try to drag things around, press F/Q while holding a gun. Nothing should flicker badly or feel broken.
    - Result: HUMAN / TODO
24. **Car entry with MTVehicles** (after installing it): right-clicking a car still lets you get in (the lock cancels right-clicks on entities after other plugins run).
    - Result: TODO (MTVehicles not installed yet)
