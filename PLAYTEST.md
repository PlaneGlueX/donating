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
    - Result: PASS (cu, 2026-09-24) for everything visible: `[+]` green and `[-]` red in gray brackets, `[Owner]` in dark red, first-join line with `(#21)`, "DONATING / Welcome, robber!" title, "You start with $500" (green) and "/help" (yellow). The sound needs a human: HUMAN / TODO.
    - Note: players with `essentials.motd` (the owner has `*`) also get EssentialsX's MOTD on join ("Type /list to see who else is online", but /list is denied to players). Regular players don't. Decide whether to empty EssentialsX's `motd.txt`.
31. **Chat extras** (`bots\run.js chat-extras`, 20 checks): a second message within `chat::cooldown` is blocked with "Slow down!" (staff exempt); `hey @chatb, look` shows `@ChatB` in lime to everyone (the text after it isn't lime) and pings ChatB only; `@ChatBx` pings nobody; `&cred <bold>big</bold> @ChatB` stays uncolored and literal; `/sc` and `/broadcast` are refused without `donating.staff`; `/sc msg` and staff chat mode reach staff only; `/bc` reaches everyone with the prefix; `/zztip` sends a tip.
    - Result: PASS (bot, 2026-09-24, local). 20/20 after one script fix and two test fixes:
      - Script: `/bc` still ran EssentialsX's broadcast ("denied access"): Skript's `aliases:` don't take over another plugin's alias. `/bc` is now its own command.
      - Test: Mineflayer showed the typed text instead of what the client sees (LPC's format and the lime mention come as unsigned content). `bots\lib.js` now records that.
      - Test: `colorOf` didn't look inside a translation's arguments (player chat is translate "%s"). The "text after the mention is not lime" check also passed without finding the text; it now has to find it.
    - Needs chat-extras.sk, core.sk and join-quit.sk (for `rankedName`) loaded. If the mention isn't lime but the ping works, check that LPC still keeps `§` codes (its `processMessage` only strips `&` codes).
32. **AFK** (`bots\run.js afk`, 10 checks): AFK within 10 s of `/zzafk` (last activity set 10 minutes back) with a message; idle position packets don't end it; looking around, `/afk`, chatting, any command, and a movement key each end it; `/afk` toggles.
    - Result: PASS (bot, 2026-09-24, local). 10/10 after a test fix: Mineflayer only sends the 1.21.2+ `player_input` packet for sneaking, so the movement-key check now sends W as a raw `player_input` packet, the way the real client does. That also proves `on press of any input key` works.
33. **AFK while driving and in water (real client):** `/afk`, then hold W in a car (after MTVehicles): AFK ends. Stand in a water stream without touching anything for 5 minutes: you still go AFK.
    - Result (water): PASS (cu, 2026-09-24). While AFK, flowing water pushed the player (z −656.0 → −655.6) and AFK stayed on. The owner also went AFK on their own after 5 idle minutes during the session.
    - Result (driving): TODO (MTVehicles not installed yet)
34. **EssentialsX /afk is off:** `/afk` shows afk.sk's message ("You're now AFK"), not EssentialsX's.
    - Result: PASS (cu, 2026-09-24). Typed `/afk` twice in the real client: "Welcome back! You're no longer AFK." then "You're now AFK. You won't earn anything until you're back." Nothing from EssentialsX.

## Navigation: no minimap mod (2026-09-24)

35. **Shader minimap plugin** (NMinimap 1.0.8-quickfix-2: a corner minimap drawn by the resource pack's core shader, no client mod).
    - Result: FAIL (cu) on the owner's 26.3 client. 26.3 compiles pack shaders to SPIR-V and rejects the plugin's shader ("invalid directive: moj_import"), so the whole server pack fails to load ("Resource reload failed"). Without the shader, the plugin's hidden map frame covers the screen. Removed from the server; the jars are kept in `extras\nminimap-test` for a retest if it ever supports 26.3.
36. **Locator bar POIs** (the 1.21.6+ bar above the hotbar): invisible marker armor stands with `waypoint_transmit_range` show as dots in their own color, bigger when closer.
    - Result: PASS (cu). Red/blue/green dots at 50/200/600 blocks. A POI in an unloaded chunk disappears (it needs a force-loaded chunk). Hiding the stand from one player (Skript `hide … from player`) hides only their dot.
37. **Bag meter vs locator bar:** with waypoints, the XP level number (bag %) stays visible above the locator bar and the XP fill bar is hidden; with no waypoints, the fill bar comes back.
    - Result: PASS (cu). So inside heists, hide the POIs from that player to show the full bag meter.
38. **Phone as a GPS map:** a filled map held in hotbar 9 shows the area, map icons, and named banner labels ("Bank").
    - Result: PASS (cu). Everyone carrying the same map shows as a white arrow on it.
39. **Passive players on the map** (`bots\run.js map-visibility`, 23 checks): everyone's phone is the same map. Non-passive players wear the map cloak (boots slot) and are missing from other players' maps but still see themselves. Passive players show up for everyone and get a green locator-bar dot. Turning passive on/off tells the player. The cloak survives clicks and death. A phone click on a banner doesn't add a map label (the bypass control does).
    - Result: PASS (bot, 2026-09-24). 23/23. Every map packet in each 3-second window agreed (for example 12/12 with the passive player, 0/12 with the non-passive one). All earlier scenarios still pass with the map phone.
    - Replaced 2026-09-25 by the DonatingPhone plugin (items 46-49): every player has their own phone map now, the cloak and the datapack are gone, and `map-visibility` was replaced by `phone-map`.
40. **Same in the real client:** a passive bot and a non-passive bot stand inside the map.
    - Result: PASS (cu). Only the passive bot's arrow shows, plus your own; the passive bot is a green dot on the locator bar. `zzpassive Explosde on` printed "Passive mode on. Other players can now see you on their map and compass."
41. **How it feels (human):** is the map and compass enough to find your way, and can you tell passive players apart (vanilla arrows can't carry a name)?
    - Result: HUMAN / TODO

## phone.sk + pvp.sk: the phone menu and passive switching

42. **Phone menu** (`bots\run.js phone`, 26 checks): right-clicking the phone (hotbar 9) opens the menu with stats (head), passive, garage, bounties, help and close. Clicking, shift-clicking and number keys can't take or move anything (also with the inventory bypass). Garage and bounties say "coming soon". The passive button closes the menu, turns passive on and tells the player. Switching again right away is refused ("again in 10 minutes"). Going passive with a bounty is refused. Help shows the help page. Right-clicking a lever with the phone opens the menu once and doesn't flip the lever.
    - Result: PASS (bot, 2026-09-24). 26/26 after the review fixes: right-clicking an armor stand or villager with the phone opens no menu (NPC shops and cars keep working), a double click on the passive button runs it once, garage/bounties close the menu before replying, the stats show the real numbers (bounty $500 after setting it), the bypass is confirmed active before the bypass checks, and the test runs on its own sky platform. map-visibility is now 24/24: its banner-label control uses a plain copy of the map, because a phone right-click opens the menu.
43. **Phone menu in the real client:** looks right; the stats tooltip is readable.
    - Result: PASS (cu, 2026-09-24). Tooltip: "Your stats / Name: [Owner] Explosde / Balance: $500 / Bounty: $0 / Bag: none yet / Passive mode: off / Time played: 2h 27m / Playing since: Sep 24, 2026", in the intended colors.
44. **How the phone feels (human):** is right-click to open natural? Do the icons make sense? Holding the phone (the map) and right-clicking a door or button opens the phone instead of using the block: OK, or should blocks win?
    - Result: HUMAN / TODO. Since 2026-09-25 right-click opens the big map and F opens this menu (item 49); the question about blocks still applies to the big map.

## pvp.sk: passive players and PvP

45. **Passive players can't hurt or be hurt by players** (`bots\run.js pvp`, 10 checks). Each blocked case has a positive control: between two non-passive players the same punch does damage and the same AK-47 burst kills. A punch or a gun does nothing to a passive player, and a passive player's punch or gun does nothing to others; the attacker gets an action-bar reason. A passive player still takes non-player damage (traps).
    - Result: PASS (bot, 2026-09-24). 10/10. Found on the way: EssentialsX `teleport-invulnerability: 4` blocks all PvP for 4 s after any command teleport; bots can't be hurt for about 6 s after joining; an AK-47 burst kills in under half a second (the target respawns at full health, so the test counts deaths); WeaponMechanics damage goes through the damage event with the shooter as attacker, so Skript can cancel it. Bots now record 1.21 action bars (their own packet, which Mineflayer ignored).

## DonatingPhone plugin: the phone's screen (2026-09-25)

46. **Phone screen** (`bots\run.js phone-map`, 48 checks, on the local 2x2 test city [[0, 20], [23, 24]]): the city maps line up. Every player gets their own phone map id from the plugin's pool, and the slot-8 phone carries it. No pixels are sent while the phone is pocketed; taking it out sends the whole screen at once. The held screen is the city around you zoomed in (compared pixel by pixel with the map files), a GPS view that follows you (re-centers every few blocks, your arrow stays near the middle), with a hint strip ("R-click: map  F: apps"). Passive players are a green arrow in the right place with no name; nobody else shows up; a passive player the viewer can't see (vanished) stays off; switching passive swaps who shows. Other players moving send you no pixels. Right-click opens the big map: the bag leaves the offhand, the camera tilts once, and the whole city is shrunk to fit (pixel by pixel against the map files). Your arrow and passive players' arrows are the small ones at their real spots. A cursor starts in the middle and follows the head; on a passive arrow it shows that player's name in green, and moving away hides it. Right-click, switching slots, F, dying and reconnecting all close the big map and put the bag back. Banner labels on the city show on held and big phones after `/dphone`; the phone and a plain map copy can't add labels (banner lock), staff with the bypass can. An old map cloak is taken off. Also the passive messages and the locator-bar range.
    - Result: PASS (bot, 2026-09-25). 48/48 (100% of pixels matched in both views). After the review: the pocket check moves the player (a held view would redraw); the banner check reads the phone map's own file; the test first checks that nobody else online is passive (Explosde still was, from item 40); the follow check moves slower than the map updates, with a tight range (10 redraws for 20 blocks); a new check opens the map while sprinting (the camera tilt used to aim at a point 1 block away, so a moving player could be turned around; it now aims 1000 blocks away). Found on the way: `Player#lookAt` sets the server's rotation at once, so the cursor now waits for the client to report the tilt; bots follow the tilt like a real client.
47. **Phone apps menu** (`bots\run.js phone`, 33 checks): the phone item carries the pack's phone model tag; item 42's checks, now opened with F. Right-clicking the phone opens the big map, not the menu; F closes the big map and opens the menu; right-clicking an armor stand or villager opens neither; right-clicking a lever toggles the map once (block + air click) and doesn't flip it; right-clicking again closes it.
    - Result: PASS (bot, 2026-09-25). 32/32, including "holding right-click opens the map once", checked after every repeat (the client repeats the click every 0.2 s while held; the review found it toggled every 0.4 s).
48. **Earlier scenarios with the plugin:** inventory-lock, join, wm-reload, join-quit, chat-extras, afk, pvp.
    - Result: PASS (bot, 2026-09-25). 41, 4, 5, 15, 20, 10 and 10 checks. Bots decline the server resource pack now (`bots\lib.js`), otherwise they can't join while `resource-pack` is set.
49. **Phone in the real client** (pack served with `tools\serve-pack.js`): the phone frame (dark bezel, side buttons) around the held map, the GPS view follows you, the hint strip is readable, a passive bot is a green arrow without a name and a non-passive bot doesn't show; right-click shows the whole city big and centered with the camera tilted, smaller arrows, and the cursor; the cursor on a passive arrow shows the name; F opens the menu and closes the big map.
    - Result: PASS (cu, 2026-09-25). All of the above on the 2x2 test city in the 26.3 client. The pack loads (2 PNGs for the frame, 2 for the small arrows). Minecraft's own crosshair (yellow +) stays in the middle of the big map. Found: WorldGuard's region wand is leather, the bag's item, so staff got "No defined regions here!" when right-clicking with the bag in the offhand; the wand is now structure void.
50. **How the phone feels (human):** zoom level of the held phone, how often the view re-centers, the camera tilt to 70° when opening, cursor speed (3 pixels per degree), whether F is easy to find for the apps, whether the small arrows are big enough. Players without a bag hold every map two-handed (big, only readable when looking down).
    - Result: HUMAN / TODO

## combat-log.sk: combat tags and combat logging (2026-09-25)

51. **Combat tags and logging** (`bots\run.js combat-log`, 18 checks): a punch tags both players, credited to the attacker, and both get the warning. While tagged, /spawn is refused and the phone's passive button says "not in combat" (controls: /spawn isn't refused out of combat). The tag runs out with "You're out of combat". A hit pvp.sk cancels (passive target) tags nobody; dying clears the tag. A wanted player (permission `donating.wanted`) counts as tagged, credited to the cops unless a player hit them in the last 5 s. Logging out while tagged kills you: credited to the cops (wanted, player hit more than 5 s ago) or to the player who hit you, saved as data `last-combat-log`, announced to everyone; after coming back you're respawned, untagged, with the phone. A kick while tagged and an untagged logout don't kill.
    - Result: PASS (bot, 2026-09-25). 18/18. Found: the owner group's `*` also grants `donating.wanted`, so staff counted as wanted (tagged all the time); the group now has `donating.wanted` false. Default players can't use /spawn at all ("You do not have access to that command").
52. **Combat log in the real client (human):** get hit by someone, log out within 15 s, log back in: the death screen, the announcement in chat. Is 15 s (PROPOSAL, `combat::tag` in core.sk) the right length?
    - Result: HUMAN / TODO

## pvp.sk: safe zones and the spawn shield (2026-09-25)

53. **Safe zones and spawn shield** (`bots\r`, 14 checks, test region `safe_ztest` with `passthrough allow`): a punch outside safe zones hurts (control); no hurting a player inside a safe zone, or anyone from inside one, with pvp.sk's message; those cancelled hits tag nobody. A combat-tagged player can't walk or teleport into a safe zone (pushed back, with a message); an untagged one walks in. A respawned player is shielded: no hurting them for 10 s, then hits land. Attacking ends your own shield and the hit lands, so the other player can hit back.
    - Result: PASS (bot, 2026-09-25). 14/14. Found: without `passthrough allow` WorldGuard blocks the hit itself ("Hey! Sorry, but you can't PvP here.") because regions protect against non-members by default; that also blocks doors and NPC clicks, so every Donating region gets `passthrough allow`. pvp and combat-log tests now switch the spawn shield off in their setup.
54. **Safe zones in the real client (human):** how the push-back at the edge feels while tagged, and whether the messages are clear.
    - Result: HUMAN / TODO

## death.sk: what a death costs (2026-09-25)

55. **Death losses** (`bots\run.js death`, 11 checks; deaths outside heists): after a /kill the sword (hotbar 1), ammo, a block from the upper inventory, the helmet, the vest and the bag are gone; the quest item (hotbar 6) and the phone stay; `bag-tier` is gone and `bag-best` = 2. Balance: min(100000 × 1%, 6000) = $1,000 with "You died and lost $1,000"; the bag caps it (min(1,000,000 × 1%, 6000) = $6,000); no bag loses nothing. Killed by a player (`/damage ... by`): credited to that player. A wanted player logging out: a cop death at 5% ($5,000), and on coming back "You logged out in combat, so you died and lost $5,000".
    - Result: PASS (bot, 2026-09-25). 11/11. inventory-lock's death check now expects no bag after respawn.
56. **Death in the real client (human):** the loss message, and whether losing the bag feels fair (buying it again is shop.sk's job).
    - Result: HUMAN / TODO

## shop.sk: the shops (2026-09-25)

57. **Item ammo** (`bots\run.js wm-ammo`, 21 checks): the config files have no forbidden keys, every sold gun has item ammo and Swap_Hands, the knife and Stim cancel Q/F. A gun given without `{ammo:0}` starts full (control). For the .50 GS, Uzi, R9-0 and AK-47: no free reloads, the wrong ammo type isn't used, and Q loads exactly one magazine from the shop's ammo items with F pressed during the reload. A reload takes from several stacks (a 10-round stack first, then the rest from a 64-round one). A Stim heals and uses one of the stack, leaving nothing. Q/F leave the knife in place. Ammo only goes into the upper inventory.
    - Result: PASS (bot, 2026-09-25). 21/21. wm-reload now buys rifle ammo before it reloads (5/5).
58. **Shops** (`bots\run.js shop`, 45 checks): the gun shop layout; buying the .50 GS (charged, unlocked, in hotbar 1 with an empty magazine), not twice, not without the money; the confirm click for $1,000+ and one that ran out; ammo ($16 per 16 light rounds, in the upper inventory; a same-tick double click buys once, two separate clicks twice; fill up to exactly 256; refused at the max and with no free slots); the loadout (a selected gun moves keeping its 5 loaded rounds, taking it out gives the rounds back, equipping again is free and empty); Stims (a stack up to 3, a buy over the confirm limit asks first and then goes through, the 4th refused; throwing away takes two clicks); Save, die, Restore (AK-47, 2 Stims, 90 rifle rounds for $670; with the Stims already in another slot no second stack; with too little money only the weapons, no charge); no shopping in combat, getting hurt in combat closes the shop, passive players can shop; number keys, clicks below the shop and staff with the bypass take nothing; the audit removes an unlocked-less R9-0 and a second AK-47; gear (helmet straight on, unbreakable, the same one refused, a better one asks first and replaces it); bags (a lost unlocked tier costs the replacement price, a new tier unlocks it after a confirm, the carried one is refused); a mannequin shopkeeper opens its shop; /dshopkeeper is staff only, adds a mannequin, a killed keeper comes back within 30 s, remove takes it away.
    - Result: PASS (bot, 2026-09-25), all 41. Found on the way: reopening a shop only stays blocked while that shop really is open (stale state could have locked a player out).
    - Review fixes (2026-09-25): Restore could add a second Stim stack past the max of 3 (paid, but a rule break); a consumable buy over the confirm limit could never be confirmed (not reachable at today's prices); `/dshopkeeper remove` now refuses while the keeper's chunk isn't loaded (the kill can't reach it); purchases fail closed if a price setting is missing. The two new checks fail on the old code and pass now.
    - Owner requests (2026-09-25): too little money for a $1,000+ buy is refused on the first click with the decline sound (no confirm); an armed buy shows a green "Confirm purchase?" block in place of the item (red "Throw away?" for Stims) and turns back when the 5 s run out; shopkeeper numbers are reused after a remove. Found on the way: the gear and tools shops had no title (a list setting wiped it), so `/dshopkeeper add gear` said "Kinds: ...". PASS (bot), 45/45.
59. **Owner decisions (defaults built, all PROPOSALs in core.sk):** weapon prices (knife $150, .50 GS $300, Uzi $3,000, R9-0 $7,500, AK-47 $15,000); ammo per round (light $1, shells $5, rifle $3); Stim $200 (max 3); helmets $750 / $2,500, vests $1,000 / $5,000; a replacement bag = 10% of unlocking that tier; confirm clicks from $1,000; Restore buys 3 magazines per saved gun; explicit Save button (not auto-save); shopkeeper skins (default mannequin skin now); no grenades in v1.
    - Result: OWNER / TODO
60. **Shops in the real client (human):** the menus look right (titles, lore, the glint on the selected weapon and active tab, the status line), the mannequin keeper, the reload feel with bought ammo, helmet/vest look, the bag appears in the offhand, whether the confirm click and Restore are clear.
    - Result: HUMAN / TODO

## bounty.sk: bounties (2026-09-25)

61. **Bounties** (`bots\run.js bounty`, 19 checks; kills with `/damage <victim> 1000 minecraft:player_attack by <killer>`, the same damage event as a hit): a kill adds $250 to the killer (not the victim), not again for the same victim within 15 min; killing someone with a bounty pays the killer all of it, everyone is told, and the killer gets their own kill bounty; kill bounty stops at $25,000; a robbery adds to it, not for passive players; placing $1,000 (paid by the placer), and not on yourself, below $1,000, without the money, on a passive player, or by a passive player; /bounty lists the biggest bounties online; same IP: no payout and no kill bounty; a non-player death leaves the bounty; logging out in combat hands it to the player who hit you. The phone's Bounties button shows the list (phone 32/32).
    - Result: PASS (bot, 2026-09-25). 19/19.
62. **Bounties (owner):** $250 per kill, the $25,000 cap from kills, $1,000 minimum to place, whether a claim should be announced to everyone (it is now).
    - Result: OWNER / TODO

63. **Phone icon and confirm block in the real client (human or computer use):** the phone in hotbar 9 looks like a small phone with a map on its screen (pack served locally), held it still shows the map; a $1,000+ buy shows the green "Confirm purchase?" block with the item name and price.
    - Result: TODO

## Needs a human (owner)

23. **Feel of the lock:** open the inventory, try to drag things around, press F/Q while holding a gun. Nothing should flicker badly or feel broken.
    - Result: HUMAN / TODO
24. **Car entry with MTVehicles** (after installing it): right-clicking a car still lets you get in (the lock cancels right-clicks on entities after other plugins run).
    - Result: TODO (MTVehicles not installed yet)
