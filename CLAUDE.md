# Donating: heist server (context for Claude Code)

Read this whole file before doing anything. It is the agreed plan from the owner's earlier planning chat. When a decision changes, update this file so the next session has it.

## What this is
- A Minecraft Java server called **Donating**, hosted on **Minehut (free plan)**. Fresh wipe with a new map.
- A GTA / Roblox Jailbreak–style game where everyone plays a robber. The main challenge is getting through heists without dying to traps (and to NPC cops in advanced heists).
- Built with **free plugins + Skript only**. Don't write a Java plugin unless the owner agrees; tell them if something truly needs one.
- Budget: $0 for now. The owner wants the server to be fun enough that people play regularly and eventually support it (cosmetics only; see Monetization).

## Working with the owner
- Keep answers concise and give a clear recommendation, not a list of maybes.
- For key decisions, give a cautious option and a realistic option.
- Use a short analogy when explaining a new concept.
- Write math as equations (e.g. L = min(B × p, C)), not in words.
- The owner does in-game playtests and also allows Claude to control the PC for Minecraft playtests (see Testing).

## Platform facts
- **Paper 1.21.11**, Java 21. ViaVersion lets 26.x clients join.
- Minehut free plan: 1 GB RAM, 10 player slots, server sleeps when empty.
  - No extra network ports and no SFTP (both paid-plan only).
  - One resource pack, set through the Minehut dashboard. Plugins can't push their own packs there.
  - Custom plugin jars are uploaded through the Minehut File Manager.
- Don't use DeveloperMCP or any plugin that needs its own port.

## Local setup (done 2026-09-24)
- The server runs in `.\server` (the owner chose to keep it inside this OneDrive folder; pause OneDrive while testing if files get locked).
- `tools\start-server.ps1` / `tools\stop-server.ps1`: start in the background with 1 GB + Aikar's flags, stop cleanly over RCON. Run with `powershell -NoProfile -ExecutionPolicy Bypass -File tools\<script>.ps1`.
- `tools\rcon.ps1 "cmd" "cmd2"`: console commands. Async plugin replies (e.g. spark) don't come back over RCON; read `server\logs\latest.log`.
- `tools\downloads.json` + `tools\fetch.ps1`: every jar's official URL, size and hash; fetch.ps1 re-downloads missing files and verifies them.
- Local-only settings in `server\server.properties`: `online-mode=false`, `server-ip=127.0.0.1`, RCON on 127.0.0.1:25575 with a random password, `enforce-secure-profile=false`.
- Bots: `tools\node\node.exe bots\run.js <scenario>` (portable Node 24, Mineflayer 4.39.0). Scenarios live in `bots\scenarios\`. The real JVM is a child of the Oracle `javapath` stub; `jcmd` is in `C:\Program Files\Java\jdk-21.0.12.1\bin`.
- Memory baseline: about 435 MB live heap after a full GC with all Phase 1 plugins, no players, 3 worlds loaded.
- Nether and End are off locally (`allow-nether=false` in server.properties, `allow-end: false` in bukkit.yml) to save RAM. Recommended for Minehut too (the owner hasn't decided).
- Local test world: `gamerule spawn_mobs false` (a zombie kept killing bots). A city map probably wants it off on Minehut too (the owner hasn't decided).
- Local owner rank: LuckPerms group `owner` (weight 100, prefix `&4[Owner]`, `*` true, `donating.inventory.bypass` **false** so the lock still applies in playtests, and `donating.wanted` **false**, or `*` makes staff count as wanted, which means always combat-tagged); user Explosde (the owner's Java name). LuckPerms data is per server: redo this on Minehut.
- LuckPerms default group: `weaponmechanics.use.*` (without it nobody can shoot or reload). Redo on Minehut.
- `server\plugins\Skript\scripts\zz-*.sk` are LOCAL TEST HELPERS (`/zztestkit`, `/zzdump`, `/zzperm`, `/zzclear`, `/zzforget`, `/zzbal`, `/zzcfg`, `/zzcfgset`, `/zzafk`, `/zzafkstate`, `/zztip`, `/zzpassive`, `/zzhide`, `/zzshow`, `/zzdata`, `/zzphone`, `/zzcombat`, `/zzcombatend`, `/zzregion`, `/zzshield`, `/zzshieldoff`, `/zzwm`, `/zzammo`, `/zzshopreset`, `/zzfill`, `/zzshop`, `/zztag`, `/zzbounty`, `/zzbountyreset`, `/zzbountyip`, `/zzheist`, `/zzinheist`, `/zzheisttp`, `/zzcfgtime`, `/zzcfgtext`, `/zzcfgreload`, `/zzpapi`, `/zzpassivewhy`, `/zzspawn`, `/zzheistforget`, `/zzkick`, `/zzbagapply`, `/zzpack`, `/zztrap`, `/zztrapstate`, `/zztrapprobe`, `/zztrapbench`, `/zzhp`, `/zzloot`, `/zzlootcode`, `/zzbag`, `/zzbagadd`, `/zzbagclear`, `/zztool`, `/zzoffhand`, `/zzicon`, `/zzdatatext`, `/zzcleancalc`, `/zzduffels`, `/zzheistleft`). Never upload them.
- Owner's Minecraft: launcher at `C:\XboxGames\Minecraft Launcher`, Java client 26.3, username Explosde, game dir `%APPDATA%\.minecraft` (client log: `logs\latest.log` there). The game window (`javaw.exe`) sometimes starts minimized; restore it with Win32 ShowWindow.
- Computer-use tips (verified 2026-09-24):
  - `minecraft:tp Explosde ~ ~ ~ <yaw> <pitch>` turns the real camera (EssentialsX's `/tp` doesn't), e.g. pitch 75 to look at a held map.
  - Windows "Click to Do" can steal focus; bring `javaw` forward with Win32 SetForegroundWindow, or click in the game window.
  - Synthetic Escape didn't close the chat box; Enter on an empty chat line does. Check the chat box is closed before pressing number keys (they get typed into chat).
  - To see a player's crosshair target, place a block with `execute as Explosde at @s anchored eyes positioned ^ ^ ^1.6 run setblock ~ ~ ~ ...`.
  - Screenshots for the owner: the computer-use screenshot saves weren't findable. Capture DPI-aware (SetProcessDPIAware, the screen is 1920x1200 physical) and crop out the Claude window floating on the right.
- Phone plugin and pack (see Phone plugin): `tools\build-plugin.ps1` builds `plugin\` into `server\plugins\DonatingPhone.jar` (restart after); `tools\node\node.exe tools\make-phone-art.js` redraws the phone frame and small-arrow PNGs in `pack\`; `tools\node\node.exe tools\build-pack.js` zips `pack\` to `extras\packs\Donating-pack.zip`. Locally `server.properties` points `resource-pack` at `http://127.0.0.1:8765/pack.zip` (serve it first, or the client shows a pack error).
- `tools\serve-pack.js <pack.zip> [port]`: serves a resource pack on 127.0.0.1 for the local client (Workflow step 7). Plugins that rebuild their pack on start change its hash; leave `resource-pack-sha1` empty locally.

## Workflow
1. **Local test server first**: set up Paper 1.21.11 in `.\server` with the same plugins and configs planned for Minehut. Check Java 21 is installed.
2. **EULA**: ask the owner before setting `eula=true`; it means agreeing to Mojang's EULA.
3. **Run it**: start the server in the background with `-Xms1G -Xmx1G` to match Minehut, so lag shows up early. Read `logs/latest.log`.
4. **Console access**: turn on RCON locally (`enable-rcon=true`, random `rcon.password`) and run commands with a small RCON script. Never port-forward RCON.
5. **Skript loop**: after each change run `/sk reload <script>`, read the output, and fix until it loads clean. Test one script at a time.
6. **Testing**: bot players and playtests; see the Testing section below.
7. **Resource pack testing**: serve the pack zip with a local web server and point `resource-pack` in server.properties at it.
8. **Deploy**: give the owner an exact list of files to upload through Minehut's File Manager. Never copy local-only settings (offline mode, RCON) to Minehut.
9. **Downloads**: most plugins can be downloaded from GitHub/Modrinth/Hangar. SpigotMC usually blocks scripted downloads, so ask the owner to grab those by hand.

## Testing
### Bot players (Claude Code does this)
- Use Mineflayer bots (Mineflayer supports 1.21.11 and offline-mode servers) to test interactions and permissions.
- Give each bot a different rank or state (default, passive, bounty holder, wanted, staff) and check that each one is allowed or blocked correctly.
- Examples:
  - Attacking in a safe zone: blocked.
  - A passive player picking up a dropped duffel: blocked.
  - Moving items in the fixed inventory: blocked.
  - Buying and equipping at the gun shop.
  - Walking into a trap region, tripping an alarm.
  - Logging out while combat-tagged.
- Bots need `online-mode=false`, so run it on the local server only and never port-forward it; in offline mode anyone could join under any name, including the owner's.
- Ranks and data on the local server are separate from Minehut. Set up the owner's rank locally too.

### Playtests with computer use
- The owner runs this project in the **Code section of the Claude desktop app**, where Claude Code can use computer use to see and control the screen. It's off by default: Settings → General → Enable computer use (macOS and Windows; Pro or Max plan; on macOS it also needs Accessibility and Screen Recording permissions). The VS Code extension can't do this; if computer use isn't available, ask the owner to playtest instead.
- The owner allows Claude to launch Minecraft with the owner's account and join the local server for testing. Claude asks permission per app the first time. Never type passwords or sign in for the owner; if the launcher asks, the owner does it.
- Good for: joining localhost, chat commands, clicking through menus, reading the UI (sidebar, boss bar, XP bar, holograms), checking models and textures.
- Weak for: fast movement, aiming, driving and PvP (screenshot-based control is slow). Bots cover scripted actions; the owner covers how things feel.
- Run Minecraft in a window and turn off "pause on lost focus" (F3+P).
- Keep `PLAYTEST.md` in this folder: a numbered list of checks (what to do, what should happen) with the result under each item, so the owner can see what was tested and fill in anything that needs a human.

## Game design (decisions)
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
- Loot spots copy KoyaRobbery's style: cash tables, jewelry cases, safes that need a tool, a vault door you drill. Test KoyaRobbery first; if it doesn't work on 1.21.11 or doesn't allow separate robbers to loot the same building at once, rebuild it in Skript with our own textures. Don't reuse KoyaRobbery's textures without the author's permission.

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
- Sidebar: TAB switches to a heist board inside heists (heist name, difficulty, what you'd lose if you died now, bag value / size, robbers inside, loot spots left, wanted status). Built so far (2026-09-25): the heist name, loot left, spots with loot left, your haul this run, the bag ($ and %), at risk (bag + a death's balance loss).
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

### PvP, passive mode, bounties
- PvP on, with safe zones, spawn shield, bounties, and PvP-only heists.
- Passive mode:
  - Players can't hurt you or take your loot, and you can't pick up loot other players dropped.
  - Robbery payouts are reduced.
  - Traps hurt you as normal, and cops can kill you when you're wanted.
- Bounties:
  - Grow from player kills and robberies. Killing the same player again within 15 minutes doesn't add to your bounty.
  - A bounty stays until a player kills you, then goes to that player.
  - You can't go passive while you have a bounty. Passive players can't gain one, and nobody can place one on them.

### Navigation: no minimap mod (decided 2026-09-24)
- GTA and Jailbreak have a corner minimap, which needs a client mod. Shader-based "vanilla minimap" plugins break on client updates (NMinimap fails on 26.3 and takes the whole server pack down with it), so Donating uses two vanilla features instead:
  - Locator bar (the 1.21.6+ bar above the hotbar) as a compass: POI dots (bank, shops, base, open heists, later your car or a GPS target), colored per type, bigger when closer.
  - The phone (hotbar 9) is the city GPS map: hold it for a GPS view that follows you, right-click for the whole city, with POI labels and yourself (see Phone plugin).
- Passive players show up on everyone's map (green arrow; their name shows when you hover it on the big map) and as a green dot on everyone's locator bar. Non-passive players never show on other players' maps or locator bars (they still see themselves). Turning passive on tells the player they're visible now; turning it off tells them they're hidden again.
- Custom phone plugin: APPROVED by the owner (2026-09-24), the one exception to "no Java plugins". The owner's vision:
  - The phone in hand is a player-centered map (the screen follows you, like a phone GPS).
  - Right-click the phone: the full view of the city map.
  - Buttons or side buttons around the map (resource pack or otherwise), so the phone does its other jobs too (stats, passive, garage, bounties, help), not only the map.
  - Passive players: a green arrow with a green name on the map; non-passive players don't show on other players' maps. (2026-09-25: the name only while hovering the arrow on the big map, and the big map zooms out to fit a big city, with arrows that shrink with it.)
  Keep the plugin small and driven from Skript (commands, scoreboard tags or PDC), with the game rules in Skript. Built 2026-09-25: see "Phone plugin (DonatingPhone)" below.
- Inside heists the XP fill bar (now the ammo bar, hud.sk) needs zero waypoints for that player. Hiding POI entities isn't enough (passive players are waypoints too, and hiding a player hides their body). Instead set the robber's own `waypoint_receive_range` base to 0 on heist entry and back to 6e7 on exit, death and join (verified: ServerPlayer.onAttributeUpdated re-adds the player to the waypoint manager at once). That also takes a passive robber off everyone's bar while inside. An exit/base waypoint and the fill bar can't show together; only the level number (rounds left) shows in both. Outside heists the locator bar shows instead of the ammo bar except for 5 s after each change (so while you shoot).
- Other orientation ideas (not built): district names on the action bar when entering areas (WorldGuard regions), street signs, a big wall map at the base.

### Phone plugin (DonatingPhone, built 2026-09-25)
- Source: `plugin\src\dev\donating\phone\PhonePlugin.java` (one class, about 400 lines) + `plugin\resources\plugin.yml` and `config.yml`. Build with `tools\build-plugin.ps1` (plain javac + jar against `server\libraries`, no Gradle), then restart. The jar isn't in git (`*.jar`); rebuild it from source.
- It only draws. Skript owns every rule and every item. The interface:
  - Plugin → Skript: player metadata `donating_phone_map` = the player's phone map id (set on join at LOWEST, before Skript). inventory.sk's `phoneItem(p)` puts it on the phone. Without the plugin the phone has no map id and shows nothing (fails closed: no positions leak).
  - Skript → plugin: scoreboard tags `donating_passive` (nav.sk) and `donating_phone_open` (phone.sk).
  - `/dphone` (op): reload the config and re-read the city (after adding banner labels). `/dphone status <player>`: one line for tests (map id, open, labels, cursor).
- The city (config `city-maps`): one locked map, or a grid of locked maps of the same scale side by side, like a map wall (`[[12, 13], [14, 15]]`, rows north to south). The plugin reads them into one image (plus their banner labels) and checks they line up. A big city stays sharp this way: e.g. 3x3 scale-1 maps = 768x768 blocks at 2 blocks per pixel.
- Held phone: a north-up GPS view centered on you, the city zoomed 2x (`zoom`), re-centered once you're 4 screen pixels from the middle (`follow-step`), with a hint strip "R-click: map  F: apps". Shown one-handed next to the bag. Passive players are green arrows with no names (owner, 2026-09-25).
- Right-click (phone.sk): the big map. The whole city is shrunk to fit the screen: f = max(W, H) / 128 city pixels per screen pixel, W x H = the city image. phone.sk adds the open tag and takes the bag out of the offhand (a map only shows big and centered with an empty offhand); the plugin tilts the camera to 70° once (`open-pitch`, 0 = off; it aims at a point 1000 blocks away, because the client turns from its own eye position, which is ahead of the server's when moving), because a two-handed map only faces the camera at 49.5° or more (26.3 client). Right-click again, a slot change, F, death (applyLayout on respawn) and quitting close it and put the bag back.
- Big map cursor ("hover"): a held map can't be hovered with the mouse, so turning your head moves a white cursor drawn on the map (`cursor-speed` 3 screen pixels per degree; at the edge it stays put like a mouse pointer). A passive player's name shows in green only while the cursor is within `hover-radius` (6) pixels of their arrow (owner's request). The cursor starts in the middle once the client reports the tilted camera (`Player#lookAt` also sets the server's copy of the rotation at once, so the plugin waits for a PlayerMoveEvent near the target pitch, 1 s at most). Pixels go out every tick, names 4 times a second (Paper sends a custom map's icons every 5th update).
- Arrows on the big map are 2/3 size (`small-arrows`): the plugin sends the unused icon types jungle_temple (you) and swamp_hut (passive), and the pack redraws them as small white and green arrows. Without the pack they'd look like a temple and a hut: set `small-arrows: false` then. Icon positions always follow the zoom.
- F with the phone: the apps menu (phone.sk `openPhone`: stats, passive, garage, bounties, help). The 26.3 client doesn't swap hands locally, so cancelling F doesn't flicker.
- Icons: you (white arrow), passive players (green arrow; players hidden from the viewer with `Player#canSee` stay off), and the city's banner labels. Nobody else, ever.
- One map id per online player, from a pool of 16 maps the plugin creates on first start (ids in `plugins/DonatingPhone/pool.yml`, so the plugin never rewrites config.yml). Reason: Paper's `CraftMapCanvas.setPixel` marks pixels dirty for every player carrying that map id, so a shared id would send everyone's scrolling to everyone. More than 16 online: players share (still correct, more traffic).
- Cost: nothing is drawn while the phone is pocketed; a full redraw (16,384 pixels) only on a re-center or view change; the cursor is 17 pixels. Traffic per player holding the phone: T = (v / d) × 16 KB, with d = follow-step × bpp / zoom blocks (bpp = blocks per city-map pixel). Scale-2 city, driving at 25 blocks/s: about 50 KB/s before compression. Raise `follow-step` if that matters. City image: W × H bytes (3x3 maps = 147 KB).
- Phone icon (owner, 2026-09-25): the phone looks like a phone in the inventory, on the ground and in other players' hands. inventory.sk's `phoneItem` sets custom_model_data strings `["donating:phone"]`; the pack's `assets/minecraft/items/filled_map.json` selects `donating:item/phone` for it and the vanilla map model for every other map (without the pack the phone looks like a map). Held in first person it's still the map.
- Server pack build (2026-09-25): `tools\build-pack.js` merges WeaponMechanics' official pack (`extras\packs\wm\WeaponMechanicsResourcePack-3.0.0.zip`, fetched by `tools\fetch.ps1` with its hash; the owner approved it) with our `pack\` on top into `extras\packs\Donating-pack.zip`. WM's README allows merging it into a server pack and hosting it for our players; it forbids selling it, claiming it as ours, or publishing it in packs/plugins online, so it stays out of git and its README ships in the zip as `WeaponMechanics-README.yml` (credits: Darkman_Bree, Rosstail, Dotoo, Stephen_GFX). It gives every sold weapon its 3D model through WM's skin numbers on the feather (Uzi 1, AK-47 5, .50 GS 9 = a Desert Eagle model, R9-0 14 = a DP-12 model, +1000 scoped, +2000 sprinting; knife -10; Stim -1), plus gun sounds, a crosshair and the scope overlay.
- Item art (`tools\make-item-art.js`, 2026-09-25): the bag per tier (a 16x16 icon in inventories via `display_context` "gui", a 3D duffel everywhere else: carried by its handle in the offhand, a duffel on the ground), ammo icons (light, shells, rifle), the XP bar as a brass ammo belt, and the tab-list glyphs (U+E000 logo, U+E001 coin, U+E002 skull, U+E003 person, U+E004 ping) added to the default font next to vanilla's references. Items pick their art by the first custom_model_data string (`donating:bag_<tier>`, `donating:ammo_<type>`, `donating:phone`: inventory.sk's bagItem/phoneItem, shop.sk's ammoItem); anything else keeps the vanilla look. Bitmap glyphs take the text color, so put `&f` before them. Tuning a model: change it in the script, rebuild, `/zzpack <player>` resends the pack without rejoining.
- Loot and tool art (2026-09-25, same script): 16x16 sprites for the loot pieces (cash stack on paper, jewel on diamond, gold bar on gold_ingot, a watch for valuables on emerald, a golden idol for artifacts on gold_block), the loot marker (gold_nugget, next to the rifle ammo) and the heist tools (Drill on iron_ingot, Safe Kit on flint), picked by `donating:loot_<style>`, `donating:marker`, `donating:tool_<t>`. The script now collects every case per base item and writes each `items/<base>.json` once (WeaponMechanics' pack only overrides feather.json). A clock can't be a base item: its vanilla definition is a time-based dispatch our select would have to copy.
- Bullet and duffel art (2026-09-26, same script): the tracers `donating:item/tracer_<light|rifle|pellet>`, picked by `minecraft/items/iron_nugget.json` from custom model data 7001-7003 (a range_dispatch; see Bullets in the WeaponMechanics notes), and the dropped loot duffel `donating:bag_loot` in leather.json (the bag duffel's shape in canvas with a green band and a gold $). The script writes files with split/join: in JavaScript's `String.replace`, `$$` in the replacement becomes `$` (it drew the $ as a zigzag once).
- Gear art (owner, 2026-09-25: "tactical gear art"): Light Helmet (grey), Tactical Helmet (olive with goggles), Light Vest (navy), Heavy Vest (black plate carrier, olive pouches), each an inventory icon (`donating:gear_<id>` on iron_helmet, diamond_helmet, chainmail_chestplate, diamond_chestplate) and a worn look: shop.sk's `gearItem(id)` gives the item an equippable component with asset id `donating:<helmet|vest>_<n>` (Skript's experimental syntax: `using equippable components` at the top of shop.sk; `a blank equippable component`, `equipped model id of`, `equipment slot of`, `equippable component of`), and the pack has `assets/donating/equipment/<asset>.json` + `textures/entity/equipment/humanoid/<asset>.png` (the 64x32 armor layout; transparent keeps the face and arms visible). The base item keeps its armor points (tested: a Tactical Helmet still gives 3). SkBee NBT couldn't set the equippable component (the item's NBT stayed empty).
- Shop icons look like the real items (owner, 2026-09-25: "its all feathers right now"): shop.sk's `wpnIcon(W)` is a feather with the weapon's WeaponMechanics skin as its custom_model_data float (core.sk `wpn::<W>::model` / `con::<W>::model`: Uzi 1, AK-47 5, .50 GS 9, R9-0 14, knife -10, Stim -1, from `Skin: Default` in each weapon file), `ammoIcon(type)` and `bagIcon(t)` carry the ammo and bag model strings; the hotbar mirror shows what's really in each slot. A new gun needs its `model` number too.
- Resource pack: `pack\` is Donating's own pack source, drawn by `tools\make-phone-art.js`: the phone frame replaces `textures/map/map_background*.png` (a dark bezel with side buttons, and a dark screen that shows where the plugin draws color 0, outside the city), and the two small arrows replace `textures/map/decorations/jungle_temple.png` and `swamp_hut.png`. Without the pack the map has the vanilla paper frame and everything else still works.
- Rules for other scripts: never set the offhand directly while `donating_phone_open` is set; use `applyBag()` (inventory.sk) and `closePhoneMap()` (phone.sk). garage.sk calls `closePhoneMap()` before turning slot 8 into the car key. death.sk: the respawn's `applyLayout` already closes the map.
- Minecraft's own crosshair stays in the middle of the big map (the client draws it; hiding it needs a pack change that would also hide it in fights).
- Ideas (not built): a phone-styled apps menu (a font glyph background in the chest title), POI or GPS-target icons drawn by the plugin, setting a GPS waypoint with the cursor (left-click), closing the big map when hit, a staff command that paints city maps without flying over them.

### Cars (MTVehicles)
- You can only drive car models you own. No stealing other players' cars (one plate per car keeps ownership clean for trading).
- Car locks keep passengers out. No locking near car spawn areas.
- Base NPC cars at car spawn areas: the first player to get in becomes the owner.
- Car-theft quests: hold the matching-rarity lockpick, pass a quick-time challenge, become the owner, drive it to the chop shop for cash.
- Despawn: empty 5 minutes; owner drives another car for 1 minute; owner logs out. Cars return to the garage, never lost.

### Later
- Trading + paid car wraps/rarities.
- Resource packs: merge everything (MTVehicles, WeaponMechanics, our models) into one pack for Minehut.

## Verified technical notes
### MTVehicles (checked in its source code)
- It fires its vehicle-enter event before checking ownership, and Skript can cancel it (quest cars, locks).
- `set vehicle owner of {_car} to player` works from Skript and saves immediately.
- Driving only uses WASD + jump (horn), so right-click hotbar items don't clash. Never use a diamond hoe for custom items (it's MTVehicles' car item).
- Cars are found by license plate: one plate per car, spawned once.
- Settings: `carPickup: true` (true = pickup disabled). Never give players `mtvehicles.ride` or `mtvehicles.oppakken`. Don't use `/vehicle public`.
- NPC cars need an owner account that has joined the server once, or MTVehicles refuses entry.
- Each car is 3+ armor stands, so the despawn rules matter on 1 GB RAM.

### Cops (Citizens + Sentinel)
- Sentinel 2.9.4+ supports up to 26.1. The SpigotMC page still shows 2.9.2; get the newer build via the Sentinel GitHub README.
- Sentinel can target `permission:<node>`. When the alarm trips, give robbers inside a temporary wanted permission (LuckPerms temp permission) so cops only hunt them.
- Sentinel fires bows (crossbows aren't listed) and can't fire WeaponMechanics guns. Cops hold a bow reskinned as a gun, with an enchant glint just for looks.
- Tune cops with `/sentinel damage`, attack rate, health and range per heist difficulty; the docs don't say bow enchantments change damage.
- Cops are a pre-made pool of Citizens NPCs per heist, spawned and despawned by Skript through console commands.
- Citizens NPCs count as players in Skript attacker checks. Detect cop kills with the "NPC" metadata.

### WeaponMechanics
- Ammo can be items, XP or money. We use item ammo in the locked upper inventory. XP ammo is out because the XP bar shows the bag.
- It takes ammo from the inventory itself; the lock only blocks players moving items.
- It can use the drop and swap-hand keys as gun controls, so the inventory lock must run after WeaponMechanics sees those keys. The swap-hand key must never move the bag out of the offhand.
- It downloads its own resource pack; turn off its pack sending.

### Skript features to use
- Skript 2.16 has boss bars. TAB scoreboards support display conditions (switch to a heist board with a placeholder from skript-placeholders).
- SkBee structures can save and paste heist rooms for resets.
- Shared numbers: Skript options (`{@x}`) only work in the file that defines them, so all settings live in `loadSettings()` in core.sk as memory-only `{-cfg::*}` variables. Other scripts read `{-cfg::key}` or `cfg("key")`.
- Placeholders from skript-placeholders must be named `prefix_identifier` (e.g. `%donating_rank%`); current PlaceholderAPI rejects bare names. Install it as a plugin, not as a PAPI expansion.
- WorldGuard regions: every region protects by default, so non-members can't PvP (WorldGuard checks the target's spot and says "Hey! Sorry, but you can't PvP here."), use doors or buttons, or click entities (NPC shops) inside it (verified 2026-09-25). Every Donating region (safe zones, heists, districts) gets `/rg flag <id> passthrough allow`, and Skript owns the rules. Safe zones are regions whose id starts with "safe" (pvp.sk).
- skript-worldguard syntax (1.0.1, from its jar): `on region enter:` / `on region exit:` (cancellable: WorldGuard pushes the player back; also teleports), event value `the worldguard region`, `name of <region>` = its id, `regions at <location>`, `create a cuboid region named <id> in <world> between <loc> and <loc>`.
- WorldGuard in Skript: skript-worldguard 1.0.1 (official addon, installed 2026-09-24, owner decision). Skript's own deprecated hook is off (`config.sk`: disable hooks → regions → worldguard: true). Open upstream issues to watch: #44 region detection, #34 blocks of region.

### Verified in Skript 2.16.2 + SkBee 3.25.4 (loaded on the local server)
- `on inventory click with priority highest:`, `on swap hand items with priority highest:`, `on drop with priority highest:`, `on inventory drag:` all parse.
- SkBee custom data on item variables: `set string tag "donating_id" of custom nbt of {_i} to "phone"` (read back with `string tag "donating_id" of custom nbt of {_i}`).
- `colored "..."` turns `&` codes (also from variables) into colors with Skript's safe parser (colors, bold, gradients, reset). `formatted` parses every tag, including click/hover/run-command, so never use it on text that may contain player input (checked in the 2.16.2 source; core.sk's `msg()` switched from `formatted colored` to `colored` in the cloud session, untested). Bold carries over later color codes: put `&r` after bold text.
- Join/quit messages and titles take text components: `set join message to colored "..."`; `delete` hides it. `prefix of player` reads the LuckPerms prefix through Vault's chat hook.
- A Skript command replaces another plugin's command with the same name (Skript overwrites the command map entry), e.g. join-quit.sk's `/help` replaces EssentialsX's. Its `aliases:` don't: `/broadcast` with `aliases: /bc` still ran EssentialsX's `/bc` (verified locally). Make each name its own command.
- Bots and resource packs: with `resource-pack` set in server.properties, the server waits for the client's answer before letting it in, and Mineflayer never answers; `bots\lib.js` declines the pack for every bot. The creative mode doesn't use up an empty map (the filled map goes to another slot), so bots make maps in survival.
- Mineflayer (bots\lib.js handles both): player chat changed by a plugin (LPC's format, mentions) arrives as unsigned content, which the real client shows; Mineflayer keeps it in `msg.unsigned`. Its `title` event turns 1.21 NBT titles into `[object Object]`, so lib.js decodes the title packets itself.
- Checked in the Skript 2.16.2 / LPC 3.7.2 source (cloud session, untested in-game):
  - `on chat` is Paper's async AsyncChatEvent; `message` is a text component. `"%message%"` gives MiniMessage text (`<` becomes `\<`); `legacyText(message)` (core.sk) gives the typed text with § codes. `raw "..."` makes an unparsed text component. Adding a string to a component parses the string (colors and tags) and nests it under the last part's style, so don't build messages from player text that way.
  - LPC formats chat at HIGHEST (after Skript's high) with a legacy round trip: it strips `&` codes for players without `lpc.colorcodes` but keeps `§` codes. chat-extras.sk colors mentions with `§` inside `raw` text for that reason.
  - A `wait` inside an async event is allowed; the code after it runs on the main thread.
  - A condition written as its own line jumps to what comes after the section it's in: at the top of a trigger it stops the trigger, inside a loop it skips to the next pass (like `continue`), inside an `if` block it skips the rest of that block. At the top level of a function that returns something, a failing one ends the function with nothing returned (found 2026-09-26: trapDropSpot returned no location and duffels dropped nowhere); use nested `if`s and a final `return` there.
  - `regex replace "(?i)..." in {_text} with "..."` exists (Skript 2.10+). `on player turn around` fires on head rotation only; `on press of any input key` fires on movement keys (also while driving). `player` works in `on command` (empty for console commands).
- A list literal needs `and`/`or` (`loop 1, 2 and 3:`), otherwise Skript warns.
- `set {x::*} to ...` deletes every element under `{x::}` first, including named ones like `{x::title}` (found 2026-09-25: the gear and tools shop lists wiped their shop titles). Never put single settings under a key that is also a list; shop titles are `shop::title::<kind>`.
- JVM: `-XX:G1RSetUpdatingPauseIntervalMillis` no longer exists on Java 21 (the JVM refuses to start).
- Handlers without a priority run at Skript's `plugin priority: high`, not normal. `listen to cancelled events by default: false`: a handler doesn't run if an earlier plugin already cancelled the event.
- `on player pick item` (middle-click pick block, Skript 2.15+), `on arrow pickup`, `on recipe book click` (SkBee), `on inventory slot change` (not cancellable) all work.
- Skript 2.16's gamerule expression changed; `execute console command "gamerule keep_inventory true"` is the reliable way.

### Minecraft 1.21.11 / Paper gotchas (verified)
- EssentialsX's spawn-on-respawn is a teleport, so its teleport protection also covers the first 4 s after respawning (tests wait 5 s before hitting a respawned bot).
- Game rules were renamed to snake_case: `keep_inventory`, `spawn_mobs`, `advance_time`, `show_advancement_messages`. The old camelCase names fail with "Incorrect argument".
- EssentialsX `teleport-invulnerability: 4`: for 4 s after ANY command teleport (also `minecraft:tp` and Skript teleports) the player can't hit or be hit by players. Good as spawn/escape protection; remember it in tests and for heist teleports.
- New players can't be hurt until their client says it has loaded; Mineflayer never says so, so bot hits land only about 6 s after joining.
- EssentialsX replaces `/kill`, `/item`, `/list`, `/help`, `/tp`, `/xp`. From the console use `minecraft:kill @e[...]`, `minecraft:item replace ...`, `minecraft:tp` and `minecraft:experience`.
- Some bot scenarios kill every non-player entity to clean up, so hand-placed test entities (like POI armor stands) don't survive a test run.
- LuckPerms runs commands async, so its replies never come back over RCON; check permissions with `/zzperm <player> <node>`.
- `data get entity` output is truncated with "..." for big NBT. Use `/zzdump <player>` for inventories.
- The recipe book moves items into the 2x2 crafting grid without an inventory click (closing puts them in the first free hotbar slot). Blocked with `on recipe book click` (found in the computer-use playtest; bots can't send it).

### WeaponMechanics (verified in its 4.3.1 source and with bots)
- It reads Q (PlayerDropItemEvent) and F (PlayerSwapHandItemsEvent) at LOW with ignoreCancelled=true, schedules the trigger for the next tick, and never re-checks. Cancelling at HIGH/HIGHEST is safe; cancelling at LOWEST/LOW breaks reload and firemode.
- Players need `weaponmechanics.use.<weapon>` (or `.*`) or guns won't shoot or reload.
- No weapon may have a `Dual_Wielding` rule (removed from every weapon file 2026-09-25): WeaponMechanics counts ANY item in the offhand as dual wielding, and its default guns had `Circumstance: Dual_Wielding: DENY` on shooting (the .50 GS also on scoping, plus +50% spread), so with the bag in the offhand no gun fired; grenades worked because they have no such rule. Found by the owner; `bots\run.js wm-ammo` now checks every sold gun fires and reloads with the bag.
- Every weapon we sell needs `Info.Cancel.Drop_Item: true` and `Info.Cancel.Swap_Hands: true` (without Swap_Hands, pressing F cancels a running reload even though Skript cancels the swap).
- Default guns have no `Reload.Ammo` section, so they reload for free. Item ammo needs `Reload.Ammo.Ammos` per gun plus an ammo type in `ammos\*.yml`.
- It takes ammo from slots 0-35 except the held slot, editing stacks in place. Never put ammo in the hotbar.
- Never use `Ammo_Switch_Trigger`, `Unload_Ammo_On_Reload: true`, `Weapon_Converter_Check` or `Ammo_Converter_Check`: they add items with addItem (first free hotbar slot) or rewrite items in place (could turn the bag into a weapon).
- Give guns with amount 1 into a fixed slot: `wm give <player> <weapon> 1 {slot:N}` (N = raw slot, 0-8 hotbar). A stack of 2+ guns drops the extras on every shot. `{ammo:N}` sets the rounds loaded.
- Default grenades use placeable materials (RED_CANDLE, TNT, BEACON...). inventory.sk cancels block placing, so that's covered.
- Its `Weapon_Info_Display.Action_Bar` fights hud.sk's action bar; turn it off or route ammo info elsewhere when building hud.sk. Keep `Show_Ammo_In.Exp_*` off: hud.sk draws the XP bar (magazine + spare rounds, which WM can't show).
- WM keys (PDC): `weaponmechanics:weapon-title`, `weaponmechanics:ammo-left`, `weaponmechanics:ammo-name`.
- Item ammo (verified 2026-09-25, bots\run.js wm-ammo): WeaponMechanics matches ammo items only by the PDC string `weaponmechanics:ammo-name` = the ammo's title, so Skript builds them (SkBee: `set string tag "PublicBukkitValues;weaponmechanics:ammo-name" of custom nbt of {_i}`; ";" is SkBee's path separator). It takes ammo at the END of a reload from slots 0-35 except the held slot, from several stacks, and ignores other types. Without `Reload.Ammo` a gun reloads for free (every installed gun did).
- `wm give <p> <W> 1 {slot:N}` gives a gun with a FULL magazine; shop.sk always adds `ammo:0`, or taking a gun out and back in would be free ammo. A consumable stack is given with `wm give <p> Stim <total> {slot:N}` (safe because Stim has `Consume_Item_On_Shoot`: no "drop the extras").
- Bullets (owner, 2026-09-26: "look like actual bullets, or at least bullet streaks like other games, and not snowballs"): every sold gun's `Projectile:` is one of ours in `projectiles\Donating_Projectiles.yml` (donating_pistol_bullet .50 GS, donating_smg_bullet Uzi, donating_rifle_bullet AK-47, donating_pellet R9-0), each with exactly the physics of the WeaponMechanics default it replaced, but `Type: ITEM_DISPLAY` with `Projectile_Item_Or_Block: {Type: IRON_NUGGET, Custom_Model_Data: 7001|7002|7003}` (light, rifle, pellet). That's a fake entity (packets only, MechanicsCore's FakeEntity) that WeaponMechanics turns along its flight every tick (yaw = atan2(−x, z), pitch = atan(−y / horizontal), checked in AProjectile); the pack's `iron_nugget.json` (range_dispatch on the custom model data) draws a copper bullet with a glowing tracer streak, nose along −z (the 26.3 client turns a fixed display by rotationYXZ(−yaw, pitch, 0), then the item by 180° around Y). Custom model data, not `Item_Model`: an item_model the client doesn't have (no pack, or a failed download) is a 1-block magenta and black cube; this way it's a small iron nugget. For its first tick a bullet sits at the shooter's eye (WeaponMechanics only moves the display from the second tick), so the model is drawn ahead of the true position (z = −16 to 12, the last 0.25 blocks inside the head) and has no backward (south) faces: nothing sticks out of the shooter's head, and the shooter sees nothing on that frame. The display then jumps a tick of flight at a time (Projectile_Speed / 20 blocks: 4 at 80, no interpolation), so it reads as fast dashes (the streak is ~1.75 blocks). Free WeaponMechanics 4.3.1 has no particle trails: the `Trail:` blocks in its weapon files are for the paid WeaponMechanicsCosmetics and do nothing. Model elements use `light_emission: 15` (26.3 has it), so tracers glow at night. The hit box stays WeaponMechanics' default Size 0.1. `bots\run.js wm-ammo` checks every gun's bullets arrive as item displays with the right custom model data, facing within 6° of their flight, and the models' shape. A new gun needs one of these projectiles (or a new one like them).
- Not sold (v1): explosives (Grenade, Semtex, Cluster break blocks: `Block_Damage BREAK`, could open vault walls past traps; Flashbang uses potion effects that also hit passive players and safe zones, which pvp.sk only protects from damage), Airstrike, Sky_Torch, RPG_7, Fatman, MG34.

### Shops (shop.sk, built 2026-09-25)
- Data: `wpn::<W>` (unlocked weapon), `loadout::<n>` + `::count` + `loadout::saved` (Save button), `bag-tier` / `bag-best`. Equipped weapons, loaded rounds, ammo and gear live only in the inventory (death.sk clears them).
- Every purchase: check, charge (`chargeMoney` in core.sk: all or nothing, compares the balance before and after), grant, verify, refund if the grant failed, all in one call with no wait; logged to `plugins\Skript\logs\shop.log`.
- One action per drawn screen: each click is handled a tick later and only if the screen generation is unchanged, so a same-tick double click buys once (tested). Clicks on the player's own inventory, number keys and double clicks do nothing; every click is cancelled, also for staff with the bypass.
- Buys of $1,000 or more (PROPOSAL `shop::confirm-above`), throwing Stims away, replacing worn gear and swapping bags need a second click within 5 s. While armed, that button shows a green "Confirm purchase?" block (a red "Throw away?" block on the hotbar mirror) and turns back after the window (owner, 2026-09-25). Too little money: refused on the first click with the decline sound, no confirm (owner, 2026-09-25). The confirm key is the button's action + the price, so it must match the action shopAction compares against.
- One stack per consumable: Save keeps each consumable once, and Restore only refills the saved slot when that consumable isn't carried in another slot.
- Purchases check `chargeMoney(...) is not true` (fail closed): a missing price setting means the call never runs, and `is false` would then let the buy through for free.
- `auditWeapons()` on join and when a shop opens: removes WeaponMechanics items outside hotbar 1-5, second copies, weapons that aren't unlocked, and trims consumable stacks over the max (not for staff with the bypass).
- Shopkeepers are Paper 1.21.9+ mannequins (look like players, no AI, no locator-bar dot). No shopping while combat-tagged or wanted, and getting hurt into combat closes an open shop.
- Adding a gun later: pick it from WeaponMechanics' list, add `Reload.Ammo` (an existing or new ammo type in Donating_Ammos.yml), `Swap_Hands: true` and a Donating bullet (`Projectile:` from Donating_Projectiles.yml, see Bullets) to its file, add its `wpn::<W>::*` settings (with `model` = its `Skin: Default` number, for the shop icon) and its title to `shop::weapons` in core.sk, then add it to bots\scenarios\wm-ammo.js.
- Heist tools (2026-09-25, for loot.sk): the Drill ($2,500, carry 1) and the Safe Kit ($400, carry 3), PROPOSALs in core.sk `tool::<t>::*`. Sold in the tools shop and the gun shop's Items tab (click 1, shift-click fill up), one stack per tool in the first free hotbar 1-5 slot, thrown away from the hotbar mirror (second click), trimmed or removed by `auditTools` (in `auditWeapons`), lost on death (death.sk clears 0-4), not in Save/Restore. `toolCount`, `toolUse` (lowers the stack) and `toolItem` are for loot.sk.

### Heists (heists.sk, built 2026-09-25)
- A heist = a WorldGuard cuboid `heist_<id>` (ids: 1-16 lowercase letters and digits) + its `/dheist` data. Staff setup, in order:
  1. WorldEdit wand, then `/rg define heist_<id>` over the whole building, basement to roof. Heist regions must not overlap.
  2. `/dheist create <id> <difficulty 1-4>`: sets passthrough and the explosion flags; the heist starts disabled.
  3. `/dheist set <id> name <Name>`, and if needed `escape|cooldown <seconds>`, `pool <$>`, `rank <n>`, `advanced|pvp true|false` (`default` = the difficulty's value in core.sk).
  4. `/dheist exit <id>` standing 5-15 blocks outside the door (refused inside a heist or a safe zone: a safe zone cancels the eviction teleport for tagged robbers).
  5. Build the room clean (doors closed, traps idle), then `/dheist snapshot <id>` (only while disabled; blocks the reset must never touch can be structure void).
  6. `/dheist holo <id>` where the hologram goes (it floats 2.5 blocks up).
  7. Advanced heists: `/dheist lock <id> add x1 y1 z1 x2 y2 z2 [block]` for each window (iron bars by default; `lock <id> test` previews, the next reset clears it).
  8. `/dheist enable <id>`: the room resets, then it opens.
  Also `info`, `list`, `open` (skip the cooldown), `start`, `end` (like 0:00), `reset`, `alarm`, `kick <player>`, `disable`, `dump` (the commands that recreate the heist, for Minehut) and `delete <id> confirm`. Players: `/heists`.
- States: disabled → cooldown (the room resets one 32³ section per second, only while nobody stands inside) → open → active (the clock) → cooldown. Timers are memory dates: a restart or Minehut sleep resets every heist and reopens it. Only the definitions and the run counter are saved; bag.sk tags loot `<id>#<run>`.
- Inside = standing in the region. The skript-worldguard events only gate: they fire before the move, and a cancel pushes a walk back or cancels a teleport. `heistReconcile` sets membership a tick later and every second (it also catches joins and missed events). No teleporting in or out (every teleport: /spawn, /tpa, staff /tp, plugins), and teleport commands are blocked inside, because a teleport within the region fires no event. Evictions use `heistTeleport` (a pass flag + `force teleport`).
- Hooks for later scripts are stub functions at the bottom of heists.sk (edit the one-line body):
  - `heistRankOk` → ranks.sk; `heistForfeit` → bag.sk; `heistNotify` → hud.sk
  - `heistOnOpen/Start/End/Reset/Enter/Leave` → loot.sk, traps.sk, hud.sk, nav.sk, bag.sk
  - `heistOnAlarm/Wave/Hunt/AlarmEnd` → cops.sk
  - loot.sk calls `heistStartRun(id)` at the first robbery (set `heist::start-on` to "rob" then) and `heistTripAlarm(id, source)`; traps.sk calls `heistTripAlarm` and `tagCombat(p, "trap")`.
  - Read API: `heistOf(p)`, `heistAt(loc)`, `heistState`, `heistName`, `heistDifficulty`, `heistLootPool`, `heistSecondsLeft`, `heistRobbers`, `heistAlarmStage`, `heistWave`, `heistNextWaveIn`, `heistHuntedBy`, `heistSameCrew`.
- Placeholders (skript-placeholders, prefix "donating"): `%donating_in_heist%` (yes/no: TAB's heist board condition), `%donating_heist_name%`, and per heist `%donating_heist_title_<id>%`, `%donating_heist_status_<id>%`, `%donating_heist_info_<id>%` (the hologram lines, worked out every second into memory; the placeholder code only reads memory, because DecentHolograms and TAB ask from other threads). placeholders.sk can register the same prefix again: the first handler that sets a result wins.
- Verified in the jars and with bots (bots\run.js heists):
  - skript-worldguard: `the worldguard move type is teleport` parses and works.
  - SkBee 3.25.4: `structure template with id "donating:heist/<id>/<n>"`, `fill structure template {_s} between {_a} and {_b}` (both corners included), `save structure {_s}`, `place structure template {_s} at {_loc}`, `structure template "<key>" exists` / `does not exist`, `delete structure {_s}`. Files: `world\generated\donating\structures\heist\<id>\<n>.nbt` (they travel with the world). SkBee's cache turns "include entities" back on at every lookup, so set `structure include entities of {_s} to false` right before each place. Placing uses no block updates, so traps come back as saved without firing.
  - DecentHolograms 2.10.1: `dh hologram create <name> -l:<world>:<x>:<y>:<z> <line>`, `dh line add <name> 1 <line>`, `dh hologram delete <name>`; files in `plugins\DecentHolograms\holograms\`. Every line change rewrites the file, so lines are placeholders, never updated by command.
  - The waypoint rule: `attribute <p> minecraft:waypoint_receive_range base set 0` inside, `... base reset` outside (the player default 6.0E7), in nav.sk's `applyWaypointReceive`.
  - EssentialsX Spawn's commands are namespaced `essentialsspawn:` (not `essentials:`).
  - Skript: `add <timespan> to {date variable}` works; `1 second * n` makes a timespan; `<timespan> / 1 second` gives a number.
- Review fixes (2026-09-25):
  - A server stop or crash never reaches the quit handlers, so heistJoin saves data `heist-in` = "<h>#<run>" and heistLeave deletes it: still set at the next join means they were inside when it stopped, and that run's loot is forfeited like a logout inside (loot from elsewhere then lands them at the exit). Tested by bots\run.js loot.
- Only staff kicks are free. core.sk's `staffKicked(p)` is true for 3 s after `/kick` or `/ekick` typed in the console or by a player with `essentials.kick`. A kick the player causes (chat or command spam, a timed-out client) counts as a normal logout, in heists.sk and combat-log.sk. RCON commands don't fire Skript's command event, so the tests kick with `/zzkick`. A server stop never reaches quit handlers (Paper disables plugins first).
  - Someone rejoining after logging out inside a heist while still carrying loot (`shopBagLoot` > 0, bag.sk) lands at the heist's exit instead of spawn, so a logout can't carry other heists' loot home. Empty-handed: spawn (owner's rule).
  - Cooldowns survive restarts and Minehut sleep: the reopen time is saved once per run (`{heist::<id>::reopen}`).
  - A new run ends the last run's chase; every death leaves the hunt; dead players don't block the room reset; builders who log out inside keep their spot; `enable` only from disabled; `reset` works while open or closed.
- The crew rule (heists.sk's `on damage`) cancels hits between two members of the same non-PvP heist, with the message "They're in your heist crew"; hits into and out of a heist land.
- Block breaking is locked everywhere for survival players (inventory.sk `on break`); staff build in creative.

### Traps (traps.sk, built 2026-09-25)
- Four kinds, placed per heist with `/dtrap` (staff) and saved with the heist. Every trap hurts (owner, 2026-09-25: "make the traps do damage fairly, not an instant kill") unless it's set to `effect=alarm` (advanced heists only: it calls `heistTripAlarm` and never hurts):
  - A hit does D = max(1, round(d × 2 × m)) / 2 hearts: d = the trap's `damage` (PROPOSAL: laser 3, plate 4, floor 4, turret shot 1.5; per trap `damage=`), m = the heist's `trap-damage` (PROPOSAL 1.0 / 1.25 / 1.5 / 1.75 for difficulty 1-4; per heist `/dheist set <id> trap-damage <m>`). E.g. a laser in a difficulty-4 heist: max(1, round(3 × 2 × 1.75)) / 2 = 5.5 hearts, so two touches kill from full health.
  - Generic damage (Skript `damage`): no attacker, so a death from it is death.sk's cause "trap" (the heist's p, never a player's bounty, even if a player hit you just before); it goes through armor (vests are for bullets; verified: `minecraft:generic` is in the vanilla `bypasses_armor` tag); invulnerability time is set to 0 first, so every hit is exactly D. Each hit tags combat ("trap"), shows "-D ❤ <kind>" on the action bar and logs `hit <name> <uuid> <id> <kind> dmg=<hp> hp=<before>-><after>` (`kill ...` when it killed).
  - When: on each new touch (off it longer than `trap::rearm`, 4 ticks), never twice within `trap::min-gap` (10 ticks) per trap and robber; a laser again every `every` (1 s) while you stay in it; a plate once per step; a turret every `every` (0.5 s) while it sees you. Touches are keyed by the player's name (a player in a Skript variable name is its UUID: keep both sides text).
  - **Lasers**: a thin full-bright rod (a non-persistent block display, red; light blue = alarm) between two points at any angle; static or blinking (`blink=true on=2 off=2 offset=0`, seconds). Hit test: the robber's box (0.6 wide, 1.8 tall, 1.5 sneaking, 0.6 swimming/gliding, shrunk 0.05 per side) against the beam (slab test), sampled every 0.5 blocks along the path so sprinting can't skip one. A blinking beam hurts only 4 ticks after it shows (ping).
  - **Pressure plates**: real stone (or polished blackstone) plates in the room; stepping on one fires it for that heist's robbers. The step is cancelled for everyone (staff, NPCs too), so a trap plate never goes down or powers redstone (a pressed plate would fire nothing for the next robber: Paper only asks while its signal is 0); traps.sk plays the click, un-presses plates when the heist opens, and also finds plates by position in its check, so a plate works whatever state its block is in.
  - **Collapsing floors**: a one-layer area over a pit ≥ 2 deep, and the pit (depth 4) must be inside the heist region (else robbers fall out of the heist before they die); stepping on it cracks it (overlay + sound, everyone on it is combat-tagged "trap"), it drops after `delay` (0.5 s), whoever falls in is hurt and put back on the last solid ground they stood on in the heist (off every floor footprint and touching no trap; else the heist's exit), and it comes back after `restore` (10 s; 0 = until the room reset) once nobody's box crosses the tile layer (waiting on the rim doesn't block it). A 1-wide strip is safe if you keep moving; jumping across still cracks it (the jump event checks the take-off spot).
  - **Cameras**: a view cone (`angle` 30° half-angle, `range` 12, halved while sneaking) with line of sight (glass, panes and bars block it); seen for `grace` (1 s) trips the alarm (advanced heists), `effect=damage` makes it a turret (first shot after `turret-grace` 1 s, then every 0.5 s while it still sees you; the old name `effect=kill` still works). A yellow pointer shows where it looks; `sweep=90 period=8` makes it pan. Only the watched robber sees the "CAMERA" meter.
- Height guide for lasers (feet on the floor, h = beam height): standing is hit ⇔ h ≤ 1.78, sneaking ⇔ h ≤ 1.48, a jump clears it ⇔ h < 1.27. So: jump below 1.27, duck under 1.49-1.78, in between go around or time a blink. `laser here low|mid|high` = 0.4 / 1.0 / 1.65.
- Designing a heist's traps (the owner's workflow):
  1. With the heist disabled, build the room: plates, floor tiles over a pit at least 2 deep, camera housings. Light it (level 8+) so plates and cracks show. Keep traps ≥ 2 blocks inside the region edge.
  2. Add traps: `/dtrap add <h> laser here high` (stand in the gap; wall to wall along your facing) or `laser x1 y1 z1 x2 y2 z2` or `/dtrap pos1`/`pos2` (the block you look at) + `laser`; `plate` (stand on it); `floor` (pos1/pos2 corners or coordinates); `camera` (your eyes at the lens, looking along its view). Extra settings as `key=value` (effect, damage, every, blink, on, off, offset, delay, restore, depth, angle, range, sweep, period, grace).
  3. `/dtrap show <h>` (particle outlines for you), `/dtrap set <id> <key> <value|default>`, `/dtrap list|info|remove <id>|clear <h> confirm`.
  4. `/dheist snapshot <h>` and `/dheist enable <h>`; walk it in survival with `/dtrap dry <you> on` (a "DRY HIT" title instead of the damage; EssentialsX `/god` also blocks trap damage but shows nothing).
  5. For Minehut: `/dheist dump <h>` and `/dtrap dump <h>` print the commands that recreate it.
- Traps are armed only while the heist is open or active (heists.sk hooks + a per-second reconcile); displays exist only then and only in loaded chunks. A disabled heist never has a collapsed floor (disable puts them back), so a snapshot can't capture a hole. Cost: a trap scan is a few µs; one loop every 2 ticks over armed heists' robbers only.
- Verified (2026-09-25, bots\run.js traps 48/48): a block display turned with `yaw of <vector>` / `pitch of <vector>` and scaled `vector(t, t, length)` draws a rod from A to B; `update <block> as air[] without neighbour updates` and back from captured `block data of`; `on pressure plate:`; `<player> has line of sight to <location>`; Skript item type text uses spaces ("stone pressure plate"); Paper ignores all damage (also `kill`) until a respawned or joined client reports it has loaded (bots: wait ~3.5 s after a death). `-{_x}` doesn't parse in function arguments (use `0 - {_x}`); a variable number of ticks is `1 tick * {_n}`.
- Found twice while building: a condition line inside an `if` block only ends that block, so an alarm trap fell through to the kill. Write gates inside `if` blocks as `if …: stop`.
- Review fixes (2026-09-25): a damage trap wins over an alarm trap in the same spot; crawling robbers are 0.6 high (SkBee `pose of`); builders are never hit, even right after switching to creative; a robber's path is seeded from where they crossed into the region (a laser at the door can't be skipped); `/dtrap add` warns about traps less than 2 blocks inside the edge; `/dtrap set` and `reload` refuse while robbers are inside; dry mode on a floor only spares the dry robbers.

### Loot (loot.sk, built 2026-09-25)
- Kinds, placed per heist with `/dloot` (staff) and saved with it:
  - **pile**: pieces lying on one layer of blocks (≤ 12 cells). Its value V = n × piece, n rolled at every opening between ⌈min / piece⌉ and ⌊max / piece⌋, and exactly n pieces show (item displays lying flat, a bit turned at random, shuffled over the cells, a second layer only on top of pieces). Styles (core.sk `loot::<style>::*`, PROPOSAL): cash $100 / 0.8 s, jewel $250 / 1.0 s, gold $500 / 1.5 s, goods $200 / 1.0 s, art $2,000 / 3.0 s (piece value / hold time), so the rate r = piece / take and a bag of capacity C fills in C / r seconds of holding.
  - **smash** (glass): hold 1.5 s; the glass turns to air (no block updates) and the smasher gets the nearest piece behind it at once.
  - **safe**: right-click with a Safe Kit in hotbar 1-5 opens a keypad (a 6-row chest): guess a 4-digit code (digits 1-9, all different); after each guess every digit shows lime (right place), yellow (in the code) or gray, item amount = the digit. Each robber has their own code per safe and run (no sharing). Keys are ignored 1 s after a result; Clear; a hit or walking away closes it (guesses are kept). The kit is used only when it opens; a rival cracker's keypad closes and they keep their kit.
  - **drill** (vault door): hold 1.5 s with a Drill to mount it (used up); it drills by itself for `time` (60 s), jams `jams` times (at k / (jams + 1) of the time), shows a drill on the door and a text display ("DRILL 47% ▮▮▯ 0:32 · name"), trips the alarm (advanced heists), and opens the door. One drill per door; a second driller is refused before anything is used.
  - A jam is a timing minigame (owner, 2026-09-25: opening is active work): right-clicking the jammed door opens "Fix the drill", a 3-row menu where a marker runs along the top row (one slot every `qte-step` 3 ticks) and a click anywhere counts when it's on the green slot (or was one step ago: latency). `qte-hits` 3 in a row fix it; a miss starts over and locks clicks for 10 ticks, a hit for 6 (no double counts). Anyone in the heist can play it; the first to finish fixes it (the others' menus close), and the drill's head start goes to whoever fixed it last (else whoever mounted it), so mounting and walking away doesn't pay.
  - Piles point at a gate with `behind=<gate n>` and stay locked (pieces, no hitbox, no marker) until it opens. Whoever opens a safe (6 s) or holds a vault's drill when it finishes (10 s, if still inside) gets a head start ("claim") on the piles behind it; it ends early when their bag is full, they're 8 blocks away, leave or die.
- The input: invisible, unresponsive Interaction hitboxes (one per pile cell with pieces, one per gate block, 1.02 so the click lands before the block). Holding right-click repeats every 4 ticks; each click credits min(Δt, 0.3 s), a pause over 1 s starts over (so clicking faster gains nothing), and a hit that lands resets it. A loot click never fires a gun or opens the phone (the client consumes clicks on unresponsive interactions), and plain right-clicks are cancelled for 0.5 s after one (`on right click with priority lowest`, which WeaponMechanics' NORMAL handler and phone.sk respect). Right-clicking a crew member ray-traces past them to the loot (SkBee `ray trace ... while only allowing interaction`).
- The race: pieces are shared, progress is personal, and a take is one call on the main thread, so a piece is never paid twice. Less room than a piece: it takes what fits and the piece shrinks and stays (owner question; default on). A full bag takes nothing (BAG FULL).
- The clock starts at the first finished task or safe guess (`heist::start-on` = "rob" now). Every pile empty while it runs (owner, 2026-09-25): T' = max(60, ⌈T / 2⌉) for T > 60 s left, unchanged at or under a minute (`loot::cleaned-out` = the minimum, `loot::cleaned-out-factor` 0.5). `heistLootPool` returns the rolled total while a run is rolled, so death.sk's C uses what's really inside.
- Feedback: a glowing marker per spot (yellow = grab now, white = a gate to open, red = a jammed drill), the prompt on the action bar at the nearest spot ("Hold right-click · Grab Cash stack ($1,700 left)"), progress meters, sounds, the crack overlay on glass, titles (CRACKED, VAULT OPEN). The hologram line adds "· $18.4K inside".
- Staff (`/dloot`, `donating.staff`), with the heist disabled: build the room, then `/dloot pos1`/`pos2` (the block you look at) or coordinates. Gates first: `/dloot add <h> smash|safe|drill [x1 y1 z1 x2 y2 z2] [key=value]` (corners = the gate's blocks, all solid, ≤ 27; their block data is saved), then piles: `/dloot add <h> pile [corners of the blocks the loot lies on] value=MIN-MAX [style= piece= take= per-cell=1|2|4 layers= lift= behind=<gate n> name=Teller_cash]`. Also `set <id> <key> <value|default>`, `list`, `info`, `remove`, `clear <h> confirm`, `show <h> [s]` (outlines), `preview <h>` (every pile at its most for 60 s, disabled only), `roll <h>` (open, nobody inside), `regate <id>` (re-save a rebuilt gate), `check <h>` (the value range against the pool, each pile's rate, one robber's clear time against the escape clock), `dump <h>` (gates first, renumbered, `behind=` mapped: the lines to run on Minehut), `reload`. Refused: robbers inside, piles over two heights, more loot than the box shows, a range with no whole piece, overlapping piles, behind= that isn't a gate, air in a gate box, anything outside the region; warned: less than 1 block inside the edge. A change to an armed heist nobody's in re-rolls it at once.
- Entities (tagged `donating_loot`, not persistent) exist only while the heist is open or active and its chunks are loaded; a reconcile every 2 s brings back anything lost to an unload; `/sk reload loot` keeps the run (the numbers live in memory) and respawns the same loot. Gates are restored from their saved block data at every opening and on disable (the room reset also restores them).
- Verified (2026-09-25, bots\run.js loot 85/85): `spawn an interaction at`, `interaction width|height of`, `make … unresponsive`; Mineflayer `activateEntity` on an interaction = one `on right click on interaction` event per click; `set item of <item display>` keeps custom_model_data; `glowing` and `glow color override` on displays; a text display's text is `text of <display>` (not "display text"); SkBee `ray trace from <player> with max distance <n> while only allowing interaction` + `ray trace hit entity of`; `shuffled`; `draw N poof particles` (`block particles using glass` doesn't parse).
- Review fixes (2026-09-25, a three-lens review with a skeptic): gate blocks follow the gate's state whenever the spot spawns (a drill finishing far from everyone left the vault shut); disable force-restores gates (loads the chunk); the bottom-slab lift is saved at /dloot add (a heist opening with nobody near compiled it wrong); the keypad's guess gap is per safe and robber (closing and reopening skipped it); the first guess starts the clock (no solving safes for free before the run); combat messages go through hudBar at priority 3 (loot bars wiped them); the bag's lore refreshes on every change and the pack's leather.json has hand_animation_on_swap false (no dip); the Safe Kit's model id ("donating:tool_safe-kit") matches the pack.
- Found while building: a `while` loop with a failing condition line inside never reaches its counters, and it froze the server until Paper's watchdog restarted it (never use `while` with condition lines; loot.sk has none now); `loop-value-2 - 1` doesn't parse as math (put it in a local first); a function isn't called with an unset argument, so optional ones are checked before the call.

### The bag (bag.sk part 1, built 2026-09-25)
- Saved per player: `{data::<uuid>::loot::<h>#<run>}` = $ (getData key `loot::<h>#<run>`), plus `loot-sold` and `robberies` totals; a memory cache of the total. Loot survives logouts outside heists and restarts.
- `bagAdd(p, h, $)` adds up to the room (C = the carried tier's capacity) and returns what went in; `bagTotal`, `bagRoom`, `bagPct` (rounded down, 100 only when full), `bagRunLoot`, `bagForfeit(p, h, run)` (heists.sk's `heistForfeit`: 0:00 and logging out inside lose that run's loot only; rejoining with other loot lands at the heist's exit).
- The offhand bag shows "Duffel Bag (45%)", "Loot: $2,700 / $6,000" and the glint when full (inventory.sk `bagItem(tier, loot)`), redrawn only when the percent changes and never while the phone's big map is open.
- Selling: entering a safe zone whose id starts with `bag::base-prefix` ("safe_base"), plus an every-second backstop: alive, not combat-tagged (tagged players can't enter safe zones anyway), not in a heist. P = ⌊T × m⌋, m = 0.75 for passive players; the robbery bounty adds ⌊P × 0.10⌋ (none for passive players); a title, sounds and a chat line per heist. A plain safe zone doesn't buy loot. No switching to passive while carrying loot (pvp.sk), and no bag swaps (shop.sk).
- Death: the loot leaves the bag and drops as one duffel (see "The dropped duffel (bag.sk part 2)"), logged as `death-lost` in bag.log.

### The dropped duffel (bag.sk part 2, built 2026-09-26)
- A death with loot drops it all as one duffel: a normal item entity at the death spot (traps.sk's trapDropSpot: a floor death, or any death over a collapsing floor, drops it on the last safe spot, not into the pit), invulnerable (lava, fire, cactus, explosions), drawn by the pack as the loot duffel, with "Loot duffel $2,700 · 1:42" over it (value and time left, redrawn every second). The loot leaves the bag first (the log's `death-lost ... duffel=true`), so it exists once.
- Everything is in the item's custom data (SkBee custom nbt): `donating_id` "duffel:<n>" (never two alike, so duffels never merge), `donating_duffel` = the lines "<heist>#<run>=<$>;..." (each keeps its tag, so 0:00 of that run still costs it), `donating_duffel_owner` (uuid), `donating_duffel_name`, `donating_duffel_passive`, `donating_duffel_until` (unix seconds). So it survives chunk unloads and restarts; the every-second sweep (`loop all dropped items`) removes one whose time ran out, also one that comes back with its chunk later.
- Walking over it (SkBee `on player attempt item pickup`, always cancelled, so it never lands in an inventory; it also fires with a full inventory) takes as much as fits in your own bag, line by line (bagAddTag keeps each line's tag); the rest stays and the name updates. One call with no wait: the item on the ground is rewritten or removed before anyone else is handled. Refused (action bar at most once a second): no bag, a passive player taking someone else's duffel, anyone but the owner taking a passive player's duffel (nobody takes a passive player's loot), the owner in the other passive mode than the one they died in (else dying and switching would change the payout mode after robbing), a full bag. Builders never pick it up; hoppers, hopper minecarts and mobs can't either (`on inventory pickup`, `on entity pickup` are cancelled for duffels).
- Gone after `duffel::despawn` (2 min, core.sk). A heist's 0:00 (heistOnEnd) treats the duffels inside like its robbers: that run's lines are lost (the duffel is gone if that was all of it) and the rest is moved out to the exit spot; `/dheist disable` (heistOnDisable) costs nothing and moves the whole duffel out (loaded chunks; one in an unloaded chunk runs out before the heist reopens). Logs: `duffel-drop`, `duffel-take` (took, rest), `duffel-expired`, `duffel-cleared`, `duffel-moved`, `duffel-failed` in bag.log. `last dropped item` keeps the previous drop's entity when a drop fails, so duffelDrop checks the entity carries the new duffel's id.
- Verified in Skript 2.16.2 + SkBee 3.25.4 (bots\run.js duffel, 20 checks): `drop <item> at <loc> without velocity` then `last dropped item`; `item of <dropped item>` read and set; `set display name of <entity>` + `show the custom name of <entity>`; `make <entity> invulnerable`; `unix timestamp of now`; `double tag` in custom nbt; `loop all dropped items`; the pickup event's `event-dropped item`. Bots pick items up like players (the attempt event fires for them).

### The boss bar (hud.sk, built 2026-09-26)
- One Skript 2.16 boss bar per player (`{-hud::boss::<p>}`), worked out every 5 ticks; title, color and progress are only sent when they change (progress by more than 0.004).
  - Inside an open heist: "Bank · the clock starts at the first robbery" (white, full).
  - Inside an active heist: "Bank · Escape 3:42", the bar = T / E (T = time left, E = the escape time), green, then yellow at T ≤ E / 2, red at T ≤ 60 s.
  - The alarm, red: "ALARM · Cops in 17s · Escape 3:42" (the bar counts down to the first wave), then "WAVE 2 · next in 7s · Escape 3:42".
  - Hunted outside the heist: "COPS · wave 2 · next in 7s · 42 blocks to lose them" (42 = R − d, R = alarm::chase-radius, d = the distance to the heist's center); the bar = (R − d) / R. Gone once you lose them.
- heistNotify now calls hud.sk's hudNotify: chat as before, a sound per moment (start, warn, alarm, evict, lost-cops), and the ALARM title. `play sound ... to <player>` plays at a fixed spot, so heistEvict notifies after the teleport out. Titles and messages close bold with `&r` ("&4&lALARM&r &c· ..."), or the rest of the line turns bold too.
- Builders (creative, spectator) leave an alarm's chase (heistAlarmTick), so a staff member who switches to creative doesn't keep the alarm and its waves going.
- Skript 2.16.2 syntax (verified with bots\run.js hud): `a new boss bar` (also `titled <text>`), `set title|progress|color of <bar> to ...` (colors: red, yellow, green, white, blue, pink, purple), `add|remove <player> to|from viewers of <bar>`. Mineflayer gets them as `boss_bar` packets (action 0 add, 1 remove, 2 progress, 3 title, 4 style).

### Robber ranks (ranks.sk, built 2026-09-26)
- XP comes from selling loot at the base (bag.sk's bagSell calls rankSale last, so a rank-up's title replaces the sale's): X = ⌊P / 100⌋ + 10 × H, P = what the sale paid (passive players get 75%, so their XP too), H = the heist runs in the sale not credited to this player before (data `rank-haul::<h>` = the last run credited; selling one run's loot in several trips pays the +10 once). E.g. a full Duffel Bag ($6,000) from one heist: 60 + 10 = 70 XP. No XP for kills (it would pay for griefing).
- Ranks (PROPOSAL, core.sk `rank::<n>::name|xp|color`, `rank::max`, `rank::xp-per-dollars`, `rank::xp-per-haul`): 0 Pickpocket 0, 1 Shoplifter 250, 2 Burglar 1,000, 3 Safecracker 3,000, 4 Heister 8,000, 5 Mastermind 20,000, 6 Kingpin 50,000 XP.
- What a rank unlocks: heists (heistRank(h): `/dheist set <id> rank <n>`, else the difficulty's default, PROPOSAL 0 / 1 / 2 / 3 for difficulty 1-4; heists.sk's heistRankOk asks `rankOk`, the entry refusal names the rank, /heists marks locked heists), heist tools (`tool::<t>::rank`, PROPOSAL Safe Kit 1, Drill 2: the shop shows "Needs robber rank 2 (Burglar)" and refuses), and later car models (garage.sk: `rankOk(p, n)`).
- XP is never taken away and a rank never drops by itself; only staff move a rank down (`/drank set` puts the XP at that rank's start, so the two stay in step; `/drank reset` also clears the credited runs). Every 5 s (and on join) a player whose XP is worth a higher rank than they're saved at is caught up (the thresholds were lowered), and the tab-list copies follow a settings reload. A rank whose XP setting is missing can't be reached (fails closed: a typo in core.sk must not promote everyone). A rank-up goes to that player only: the RANK UP title, a sound, and each unlock in chat.
- Saved: data `rank-xp`, `rank` (the rank the XP gave: heists.sk read "rank" before ranks.sk existed) and `rank-haul::<h>`. Memory: `{-ph::rank::<p>}` and `{-ph::rankxp::<p>}` for the tab list. TAB asks from its own thread, so no placeholder may call a function (a function being reloaded is missing for a moment: a Severe Error on TAB's thread, seen 2026-09-26); placeholders.sk copies the balance, the bounty's money texts and the heist name into memory once a second. Log: plugins\Skript\logs\ranks.log.
- Players: `/rank` (rank, XP, a progress bar, what the next rank unlocks), `/ranks` (every rank). The phone's stats and the tab-list footer show the rank; /help mentions it. Staff: `/drank info|set|xp|reset <player> [value]` (`xp` only adds).
- The test heists in bots\scenarios set `rank 0` for themselves (the difficulty defaults would lock the bots out); heists.js checks the default (difficulty 3: rank 2).
- Local: the owner's account (Explosde) starts at rank 0 like everyone. `/drank set Explosde 6` skips the grind for playtests.

### Navigation (verified 2026-09-24 in the Paper 1.21.11 jar with javap, with bots, and in the 26.3 client)
- Maps: every player carrying a copy of the same map id (anywhere in the inventory) is a white arrow on everyone's copy. `MapItemSavedData.tickCarriedBy` adds all carriers, then removes other carriers wearing an item from `#minecraft:map_invisibility_equipment` in an armor slot (hands don't count), but never the viewer itself. `ServerPlayer.doTick` runs that pass right before sending that player's map packet, so the hiding is per viewer and never flickers (12/12 packets in the bot test). Vanilla's tag only holds carved_pumpkin. (Before the phone plugin a datapack added structure_void as a boots-slot "map cloak"; gone now that every player has their own map id, and nav.sk takes old cloaks off.)
- Player arrows never get a name (the server passes null). Item `map_decorations` entries are copied into the shared map data once (null name, never moved or removed until a restart). Named banners clicked with a map become labeled markers for everyone (saved with the map). That's why inventory.sk locks banner right-clicks; staff with bypass can still add labels with a plain copy of the map (not the phone).
- Paper also drops a player's arrow for a viewer who can't see that player (`Player#canSee`), but that hides the player's body too; don't use it for maps.
- The phone's `minecraft:map_id` is set with SkBee: `set int tag "minecraft:map_id" of nbt of {_i} to N`. A map_id with no data file shows an empty map. Locked maps (cartography table + glass pane) keep their pixels but still show arrows, icons and labels.
- Map files: `world\data\map_<id>.dat` (gzip NBT; fields at their default, like `scale: 0`, are left out). `idcounts.dat` holds the next id.
- Locator bar: any living entity (armor stands too) with `waypoint_transmit_range` > 0 is a waypoint for players within min(transmit, receive range). Players transmit 6e7 by default, so vanilla shows every player to everyone; nav.sk sets 0 unless passive. `waypoint modify <entity> color <color>` sets the dot color; custom icons need a resource pack (`waypoint_style`), untested. A waypoint entity is only tracked while its chunk is loaded: far POIs need `forceload`. Paper checks `CraftPlayer#canSee`, so Skript's `hide <entity> from <player>` removes one player's dot only.
- XP bar vs locator bar: while a player has any waypoint, the locator bar replaces the XP fill bar (the level number stays visible above it), except for 5 s after each XP change. With no waypoints the fill bar is back.
- A wall map at the base must be its own map id (a framed map adds a frame marker to every copy of that id).
- Locking a map in a cartography table creates a NEW map id (the original stays unlocked). Use the locked copy's id in `city-maps` (plugins\DonatingPhone\config.yml).
- Paper (javap): a map with a custom renderer renders for a carrier when its pixels are dirty or every 5th tick, and sends icons every 5th tick even while the map is pocketed (the plugin keeps the last icons then; the client only draws a held map). `Player#sendMap` sends the whole map at once (used when the phone comes out). `Player#lookAt` sends the look-at packet, which turns the client camera.
- Held maps render two-handed (big, centered) only with an empty offhand. Players with a bag see the phone one-handed (small, lower corner); players without a bag always hold it two-handed.
- Locator bar: vanilla hides a player's dot while they sneak, are invisible, or wear a head/skull or carved pumpkin (a HEAD-slot `waypoint_transmit_range_hide` modifier).
- Shader minimaps (NMinimap and similar): 26.3 compiles pack shaders to SPIR-V; old `#moj_import` shaders fail and the client rejects the whole server pack.

### Fixed-inventory rules for later scripts
- The boots slot (Skript slot 36) is free since the phone plugin (it held the map cloak before).
- The offhand is empty while the phone's big map is open: use `applyBag()` / `closePhoneMap()`, never set the offhand directly then (see Phone plugin).
- No armor or cosmetic item may use carved_pumpkin or player/mob heads as its base item: they hide the player's locator-bar dot. Build hats and helmets on a neutral base with item_model / equippable components.
- Known limit of Skript's click event: all `on right click` triggers share one tracker, and a second click event in the same tick (hacked client or a lag burst) skips every Skript click lock. Keep shelves, decorated pots, chiseled bookshelves, cakes and banners out of players' reach, or cover them with a WorldGuard region that denies `interact`/`use` (WorldGuard's own listener doesn't depend on Skript).
- The bag item must be unusable from the offhand: not placeable, edible, equippable, throwable, not a bundle/map/book/bucket. It's leather for now (item model later).
- Never put equippable items (armor, heads, pumpkins) in the hotbar: right-click hot-swaps them with worn armor, and Skript can't cancel that event. Shops set helmets/vests straight into armor slots.
- GUI menus: handle clicks at the default priority (they run before the lock's `highest` cancel); use `on any inventory click` if another plugin may cancel first.
- Make shop items unbreakable. Never build shops as villager (Merchant) GUIs: selecting a trade auto-moves payment items.
- MTVehicles: set `trunkEnabled: false`; when installed, check that car entry still works (inventory.sk cancels right-clicks on non-player entities at highest; exempt stands named `MTVEHICLES_*` if needed).
- EssentialsX: `allow-direct-hat: false` (done). Keep essentials.hat/give/item/more/kit/invsee/enderchest/workbench/anvil/repair/condense/exp/keepinv and virtual GUIs out of the default group.
- Never use Skript `give ... to player` / `add ... to player's inventory`, `/wm give` without `{slot:N}`, `/wm giveammo`, or EssentialsX kits: they fill the first free slot, hotbar first. Always `set slot N of player's inventory`.
- Dropped duffels (bag.sk): spawn a normal item entity with the normal pickup delay and handle it in SkBee `on player attempt item pickup` (cancel, move loot to the bag, remove the entity). Plain `on pick up` doesn't fire when the inventory is full.
- death.sk: spawn the duffel entity itself instead of adding it to the drops (inventory.sk clears drops). inventory.sk keeps the inventory on every death; death.sk (it loads first) clears slots 0-4, 9-35, the helmet and the vest, and the bag. A Skript function isn't run when one of its arguments is missing (e.g. the `attacker` of a fall), so death.sk works out the cause inside the event.
- The bag: data `bag-tier` is the bag you carry (death deletes it), `bag-best` the highest tier you unlocked. shop.sk sells a new bag of any tier up to `bag-best` (price for a replacement: owner to decide).
- Staff get `donating.inventory.bypass` true explicitly; the default group has it false.
- Consumables must not leave a leftover item (potion → glass bottle, stew → bowl, honey → bottle, or any 1.21.2+ `use_remainder`): the player couldn't remove it from slots 1–5. Use items without one, or clear the slot in `on consume`.
- Never sell or give items that place entities (armor stands, boats, minecarts, item frames, paintings, end crystals, spawn eggs): they skip the block place event the lock cancels. No tridents either: a thrown trident can't be picked up again (arrow pickup is locked).
- A candle on a cake is an EntityChangeBlockEvent in Paper, not a place event, so inventory.sk also cancels right-clicks on cakes (WeaponMechanics' default grenades are candles).
- The entity right-click lock also stops players boarding boats, minecarts and horses. Exempt those types if the map ever uses them.

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
- Cosmetics only (car wraps, bag skins, trails, titles, ranks with cosmetic perks). Never sell cash, guns, bags or anything that gives an advantage.
- Anything bought with real money can't be cashed out for real money.

## Plugins
Exact files, URLs and hashes are in `tools\downloads.json`. Everything is from the author's own source.
Installed and verified loading (2026-09-24):
- Paper 1.21.11 build 132 (last 1.21.11 build)
- ViaVersion 5.12.0: https://modrinth.com/plugin/viaversion (supports 26.1–26.3 clients; keep it updated for new clients; ViaBackwards not needed)
- LuckPerms 5.5.85: https://luckperms.net/download
- LPC 3.7.2: official Modrinth mirror "lpc-free" by the SpigotMC author PM2 (not "lpc-chat", a different author)
- Vault 1.7.3: https://github.com/MilkBowl/Vault/releases (same author as SpigotMC)
- EssentialsX 2.22.0 + EssentialsX Spawn (not EssentialsX Chat): https://github.com/EssentialsX/Essentials/releases
- WorldEdit 7.3.19: https://modrinth.com/plugin/worldedit (same file as BukkitDev; last 7.3.x)
- WorldGuard **7.0.16** (changed from 7.0.15: 7.0.15 was built for 1.21.10; 7.0.16 is the 1.21.11 build and adds a Paper dupe fix). 7.0.18+ dropped 1.21.11.
- PlaceholderAPI 2.12.3: https://modrinth.com/plugin/placeholderapi
- Skript **2.16.2** (changed from 2.16.1: drop-in bug-fix release; fixes event-location in the pick-up event, which duffel pickup needs)
- SkBee 3.25.4: https://modrinth.com/plugin/skbee (needs Skript 2.15+, MC 1.21.11+)
- skript-placeholders 1.7.1: https://github.com/APickledWalrus/skript-placeholders/releases
- skript-worldguard 1.0.1: https://github.com/SkriptLang/skript-worldguard/releases (needs Skript 2.14+; replaces Skript's deprecated WorldGuard hook)
- WeaponMechanics 4.3.1: https://github.com/WeaponMechanics/WeaponMechanics/releases (repo moved from MechanicsMain)
- MechanicsCore 4.3.1: https://github.com/WeaponMechanics/MechanicsCore/releases (own repo now)
- PacketEvents **2.13.0**: https://modrinth.com/plugin/packetevents (required by WeaponMechanics, needs 2.12.1+; 2.14.0 was 1 day old, so it was skipped)
- TAB 6.2.0: https://modrinth.com/plugin/tab-was-taken (6.x, not 5.x)
- DecentHolograms 2.10.1: https://modrinth.com/plugin/decentholograms (official, SpigotMC not needed)
- CoreProtect CE 23.2: https://modrinth.com/plugin/coreprotect (the author's official free build; GitHub releases have no jars)
- spark: **don't install**. Paper 1.21+ bundles it and ignores the plugin jar.
- DonatingPhone 1.0: our own code (`plugin\`, owner-approved 2026-09-24); see Phone plugin.

Owner downloads by hand (SpigotMC only):
- MTVehicles 2.5.9: https://www.spigotmc.org/resources/mtvehicles-vehicle-plugin-free-downloadable.80910/ (2.5.8 on GitHub stops at 1.21.10). Pack already downloaded: `extras\packs\MTVehicles_Pack_v0.2.3_1.21.4.zip`.
- KoyaRobbery 1.2.2 (test only): https://www.spigotmc.org/resources/robbery-koyarobbery-the-ultimate-robbery-plugin.122431/. A July 2026 review says it doesn't work on 1.21.11, and it's crew-based with per-location cooldowns, so it likely can't do shared heists. Expect to rebuild it in Skript.

Phase 3 (advanced heists), already downloaded to `extras\phase3\` because CI builds can be deleted:
- Citizens **build 4250** (2.0.43): the newest CI builds (4251+) dropped 1.21.11. Never use lastSuccessfulBuild.
- Sentinel 2.9.4-SNAPSHOT build 534: https://ci.citizensnpcs.co/job/Sentinel/ (linked from the GitHub README)

Config notes (applied locally 2026-09-24; copy these files to Minehut):
- EssentialsX: `auto-afk: -1` and AFK broadcasts off (Skript handles AFK). Keep `custom-join-message: "none"` and `custom-quit-message: "none"` (an empty string also hides Skript's messages). `min-money: 0`. No EssentialsX Chat (LPC formats chat). Also `newbies: announce-format: ''` and `kit: ''` (players start with nothing). `disabled-commands: afk` (afk.sk owns /afk; added in the cloud session). chat-extras.sk replaces EssentialsX's `/broadcast` and `/bc`.
- LPC: one format pulling prefixes from LuckPerms; no per-group formats (the default `{prefix}{name}&r: {message}` already does this).
- TAB (tab list designed 2026-09-25): header = the DONATING logo glyph + "Rob it. Run it. Keep it."; names = rank prefix (`%condition:rankprefix%`: the LuckPerms prefix + a space) + the name (green for passive players) + " AFK"; the right-hand column = the bounty; sorted staff first, then biggest bounty, then A-Z; footer = your balance and bounty, your robber rank and XP to the next (2026-09-26), online/max, ping, /help /heists /rank /bounty. Its placeholders come from placeholders.sk (an empty result returns "&r": PlaceholderAPI would show the raw %placeholder% for nothing). TAB joins header/footer lines into one text, so a strikethrough line ends with &r. TAB 6 has no %maxplayers% (`%donating_max_players%`). `groups.yml` is tracked now too. The heist board (sidebar) uses a display condition (`%donating_in_heist%=yes`, listed first). Belowname and TAB's boss bar stay off (belowname is broken on 26.1 clients; Skript runs the boss bar).
- WeaponMechanics `config.yml`: `Resource_Pack_Download.Enabled: false` and `Automatically_Send_To_Player: false`.
- WeaponMechanics weapons, ammo and projectiles (tracked in git): every gun we sell has `Reload.Ammo.Ammos` (`ammos\Donating_Ammos.yml`: Donating_Light, Donating_Shells, Donating_Rifle), `Info.Cancel.Swap_Hands: true` and a Donating bullet (`projectiles\Donating_Projectiles.yml`); the knife and the Stim cancel Q and F too. Upload `plugins/WeaponMechanics/weapons/`, `ammos/` and `projectiles/` to Minehut. Default players need `essentials.sell` / `essentials.worth` false (EssentialsX's worth.yml prices nuggets and feathers, so /sell would turn ammo and guns into money) and no WeaponMechanics command permissions.
- Safe zones: also `/rg flag <id> weapon-shoot deny` (WeaponMechanics' WorldGuard flag): no gunfire in the base, and no stray shot when someone right-clicks a shopkeeper holding a gun. Shopkeepers go inside safe zones, with a gun shop at every respawn point.
- DonatingPhone: build `server\plugins\DonatingPhone.jar` (`tools\build-plugin.ps1`), upload it to `plugins/` and restart once: it creates `plugins/DonatingPhone/config.yml` and 16 phone maps in `world/data`. Then set `city-maps` (it ships empty: phones stay blank until the city map exists; the plugin refuses its own phone maps as city maps) and run `/dphone`. (The earlier `donating` datapack is gone; don't upload it.) Local test city: maps [[0, 20], [23, 24]] (2x2 scale-0 maps around spawn).
- WorldGuard `config.yml`: `regions: wand: minecraft:structure_void` (default leather is the bag's item: staff right-clicking with the bag in the offhand got "No defined regions here!"). Copy it to Minehut.
- City GPS map (when the city exists): make a map covering the city (scale 2-3), fill it in by flying over the city holding it (or draw it), lock it in a cartography table (for a big city, several maps of the same scale side by side, each locked), put named banners on it (a staff account with the inventory bypass, holding a plain copy of the map: the phone opens its big map instead), then set `city-maps` in `plugins\DonatingPhone\config.yml` (`[[id]]`, or rows of ids) and run `/dphone`. The `world\data\map_<id>.dat` file goes to Minehut with the world.
- Skript `config.sk`: default database `pattern: (?!-).*` so `{-...}` variables stay in memory only; `backups to keep: 24`.
- EssentialsX `starting-balance: 0` stays: join-quit.sk gives `cfg("money::start")` on the first join, so the number lives in core.sk with the other money values.
- Heists on Minehut: the regions (WorldGuard `worlds/world/regions.yml`) and room snapshots (`world/generated/donating/structures/`) travel with the world, the holograms in `plugins/DecentHolograms/holograms/`. The heist definitions are saved Skript variables: run the lines `/dheist dump <id>` prints (also in `plugins/Skript/logs/heists.log`) on Minehut instead of uploading variables.csv (it's full of test data).
- Server-list text (MOTD): set it in the Minehut dashboard. Minehut's proxy answers server-list pings, and the server is asleep when nobody's on, so a Skript ping handler would never be seen. PROPOSAL (the owner hasn't picked one): line 1 `&6&lDONATING &8» &7Heists, cars & bounties`, line 2 `&fRob banks, dodge traps, outrun the cops`.

## Skripts (build in this order)
Phase 1 (core, inventory, heists, PvP):
1. core.sk: shared settings (options block with all numbers), money formatting, player data, helper functions
2. join-quit.sk: join/quit messages with rank prefix, first join, /help (server-list text goes in the Minehut dashboard, see Config notes)
3. chat-extras.sk: chat cooldown, @mention highlight (lime) + sound, staff chat, /broadcast, rotating tips
4. afk.sk: 5-minute AFK detection (refresh on every move/chat/command), /afk; AFK players earn nothing
5. inventory.sk: the fixed inventory layout above; blocks every way items move (number keys, shift-click, drag, swap-hand, drop, death drops); runs after WeaponMechanics
6. phone.sk (built 2026-09-24, controls reworked 2026-09-25 for the phone plugin): right-click toggles the big map, F opens the apps menu: stats, passive toggle (pvp.sk rules), how to play, close; garage and bounties are "coming soon" placeholders for garage.sk / bounty.sk.
6b. nav.sk (built early, 2026-09-24): who shows on the phone map (the `donating_passive` tag) and the locator bar (passive players only), `setPassive()` with its messages. Later: POI waypoints, heist exit/base waypoints
7. shop.sk (built 2026-09-25): gun shop (6-row menu: Loadout, Weapons, Ammo, Items tabs, hotbar 1-5 mirror, Save/Restore loadout), gear shop (helmets, vests), bag shop, heist tools (coming soon). Shopkeepers: mannequins tagged `donating_shop` + `shop_<kind>` (staff: `/dshopkeeper add <kind>` / `remove <id>` / `list`; a missing one comes back within 30 s); Citizens NPCs later run the console command `dshop open <p> <kind>`. See "Shops" in Verified notes.
8. death.sk (built 2026-09-25): clears hotbar 1-5, ammo, helmet and vest; the bag is lost (data `bag-tier` = the bag you carry, deleted; `bag-best` = the highest tier unlocked, kept); balance loss L = min(B × p, C) with cop-p for cop deaths (heists.sk gives `deathDifficulty` / `deathLootPool`); saves `last-death-cause` / `last-death-loss`; tells a combat-logger on their next join. The loot duffel is bag.sk's.
9. combat-log.sk (built 2026-09-25): combat tag (15 s PROPOSAL) on player/cop/trap damage, wanted = tagged (permission `donating.wanted`), logout while tagged = death credited by `deathCause()` (5-second player-hit priority, then cops, then last damager), no teleport commands or passive switch while tagged. traps.sk calls `tagCombat(victim, "trap")`; death.sk and bounty.sk read `deathCause()` and the data `last-combat-log`.
10. pvp.sk (2026-09-25: passive switching with the cooldown, bounty and combat-tag rules; no PvP for or against passive players; safe zones; the spawn shield). Still to add: the loot check in `passiveBlockReason()` (bag.sk), PvP-only heists (heists.sk).
11. bounty.sk (built 2026-09-25): kills add $250 (PROPOSAL) to the killer's bounty, capped at $25,000 from kills, not twice for the same victim within 15 min; `addBounty(p, value × robbery-share, "robbery")` for bag.sk's sales; `/bounty <player> <amount>` places one (at least $1,000, paid by the placer); the next player kill (or a combat log credited to a player) pays the killer all of it; passive players can't gain, claim or place bounties, and nobody can place one on them; no payout or kill bounty between same-IP players (`bounty::ip-check`). The phone's Bounties app and `/bounty` list the biggest bounties online.
12. heists.sk (built 2026-09-25): heists defined with /dheist, the state machine (cooldown + room reset → open → the escape clock → 0:00), entry gates, the heist crew, deaths/logouts inside, the alarm timeline and lockdown, room resets (SkBee), status holograms (DecentHolograms) and placeholders. See "Heists (heists.sk)" in Verified notes.
13. traps.sk (built 2026-09-25): lasers (static, blinking, any angle), pressure plates, collapsing floors, cameras (alarm or turret), `/dtrap`. See "Traps (traps.sk)" in Verified notes.
14. loot.sk (built 2026-09-25): loot spots (piles, glass, safes with a code keypad, vault doors to drill), the hold-to-grab race, head starts, markers and prompts, /dloot. See "Loot (loot.sk)" in Verified notes.
15. bag.sk (part 1 built 2026-09-25: storage per heist run, capacity, fill in the name, glint, forfeits, auto-sell at the base; part 2 built 2026-09-26: the dropped duffel and its pickup): still to build: a bag contents menu
16. hud.sk (2026-09-25: the XP bar shows the held gun's ammo; `hudBar(p, text, prio)` action-bar priority: combat 3, traps 2, loot 1, prompts 0; 2026-09-26: the boss bar, heist sounds and the alarm title)
17. ranks.sk (built 2026-09-26): XP to robber ranks; unlocks heists and tools now, car models later (garage.sk: `rankOk`). See "Robber ranks (ranks.sk)" in Verified notes.
18. placeholders.sk (started 2026-09-25 for the tab list: balance, bounty, passive, AFK, max players; bag, bag_pct, heist_loot, heist_spots, heist_haul, heist_risk for the heist board, copied into memory by loot.sk; rank and rank_xp, copied by ranks.sk) (heists.sk answers in_heist / heist_name / the hologram lines)

Phase 2 (cars):
19. garage.sk: dealership, garage menu, wraps, one car out per model, car locks, no-lock zones
20. car-cleanup.sk: 5-minute idle, 1-minute other-car, logout despawns
21. npc-cars.sk: base NPC car spawn areas, first-come ownership, refilling spawn spots
22. contracts.sk: car-theft quests, rarity lockpicks, quick-time challenge, chop shop

Phase 3 (advanced heists):
23. cops.sk: alarm warning, cop waves every 10 s, alive cap, temporary wanted permission, chase radius, despawn

Later:
24. trade.sk: trading, paid wraps/rarities

## Skript lessons from earlier debugging (older Skript; re-check on 2.16)
- Use `set {var} to value`. `set {var} = value` fails.
- `on any movement` isn't valid; use `on player move` and keep it cheap (it fires constantly).
- `loop-player` only exists inside `loop all players`.
- `replace all "a" with "b" in {_text}` is an effect that changes the variable, not an expression.
- Avoid number/timespan math like `15 - {_elapsed}`; compare timespans directly (`difference between X and now >= 15 seconds`).
- Don't nest quoted defaults inside strings (`"%{x} ? ""text""%"`); Skript misreads them (it even tried WorldGuard region names). Set a local variable first.
- If an `or` condition fails to parse, split it into separate branches.
- SkBee boards use `player's board`; `delete player's board` isn't valid. (TAB handles the sidebar now.)
- `set tab header of player` failed on the old setup; TAB handles tab header/footer.
- Paper crash: a `paper-world-defaults.yml` from a newer Paper version fails at startup before plugins load; reset that file.

## Status (2026-09-25): START HERE
Everything is on `main` (PR https://github.com/PlaneGlueX/donating/pull/1 merged 2026-09-25, owner's go-ahead). Work on a new branch per task and merge it when its tests pass.

Built and passing on the local server (details and results in PLAYTEST.md):
- Scripts 1-17 and 6b: core, join-quit, chat-extras, afk, inventory, phone, nav, shop (with heist tools), death, combat-log, pvp (passive mode, safe zones, spawn shield, no passive with loot), bounty, heists (cops plug in through its hooks), traps (they hurt, not kill), loot; bag.sk (storage, fill, glint, forfeits, selling at the base, the dropped duffel); hud.sk (the ammo bar, action-bar priority, the boss bar, heist sounds); ranks.sk (robber ranks from selling loot; they unlock heists and tools); placeholders.sk (the tab list, the heist board, the rank).
- Bullets are tracers (a copper bullet with a glowing streak) instead of snowballs and eggs (WeaponMechanics projectiles + the pack).
- DonatingPhone plugin (see Phone plugin) with the resource pack in `pack\`.
- Bot scenarios (`tools\node\node.exe bots\run.js <name>`): inventory-lock 41, join 4, wm-reload 5, join-quit 15, chat-extras 20, afk 10, phone 33, phone-map 48, pvp 10, combat-log 18, safezone 14, death 11, wm-ammo 33, shop 46, bounty 19, heists 78, hud 23, traps 55, loot 90, duffel 20, ranks 15 = 608 checks.
- Real 26.3 client (computer use): PLAYTEST 13-15, 29, 30 (visible parts), 33 (water), 34, 36-38, 40, 43, 49.

Waiting on the owner:
- Money numbers (PROPOSAL values in core.sk), the rank numbers (XP per rank, XP per $ and per heist, the rank each difficulty and tool needs: PLAYTEST 90), the MOTD text, Nether/End and mob spawning on Minehut, whether to empty EssentialsX's `motd.txt` (PLAYTEST 30).
- Human checks: PLAYTEST 23 (feel of the lock), 30 (first-join sound), 33 (AFK while driving, needs MTVehicles), 41, 44, 50 (how the phone feels).
- Loot: the numbers (PLAYTEST 81; the three questions are answered), and how the keypad, the drill minigame and the new gear art feel (PLAYTEST 76-80, 83, 84).
- The two SpigotMC jars (MTVehicles 2.5.9, KoyaRobbery 1.2.2).

Next in the build order: Phase 2 (cars): garage.sk first. Loot in the real client is PLAYTEST 76. Heist and trap open questions and numbers: PLAYTEST 66 and 72. The shop's prices and catalogue are PROPOSALs (owner questions in PLAYTEST 59) (the helmet/vest and bag-loss answers are in Death and combat).

History: the first local session (2026-09-24) set up the server and built core.sk + inventory.sk; a cloud session wrote join-quit, chat-extras and afk on branch `claude/dreamy-mendel-ouutfb`; the second local session tested and fixed them, added navigation (locator bar + the map phone), phone.sk, pvp.sk and the phone plugin, then merged the branch.

## Cloud and local sessions
- Repo: https://github.com/PlaneGlueX/donating (private), branch `main`. `.gitignore` keeps out jars, the world, logs, LuckPerms/CoreProtect data, `server.properties` (RCON password), `tools\node` and `bots\node_modules`.
- A **cloud session** works on the repo, not on this PC. It can write and review Skripts, configs, docs and bot scenarios. It can't run the local test server, the Windows tools (`tools\*.ps1`, portable Node), bots against the local server, or computer-use playtests. Mark anything it writes but can't test as "untested (cloud)" in PLAYTEST.md.
- Cloud network (checked 2026-09-24): GitHub works, so a cloud session can read the Skript, SkBee and Paper source to check syntax (`git clone --depth 1 --branch 2.16.2 https://github.com/SkriptLang/Skript`). papermc.io, piston-data.mojang.com, cdn.modrinth.com, download.luckperms.net and skunity.com (its online parser) were blocked. The owner allowed skunity.com mid-session but it stayed blocked; domain changes probably only apply to sessions started afterwards. With Paper, Mojang, Modrinth and LuckPerms allowed, a cloud session could run a Linux copy of the test server (it would need the EULA accepted for that copy too).
- Before ending a cloud session: commit and push everything to `main` (or a branch, and say which in this section). The 2026-09-24 cloud session used branch `claude/dreamy-mendel-ouutfb` (PR #1, merged 2026-09-25).
- **Back to local** (e.g. when cloud credits run out): open this folder in a local Code session and run `git pull` (merge the branch if the cloud used one). Then `tools\fetch.ps1` restores any missing jars, `tools\start-server.ps1` starts the server, and `/sk reload scripts` plus the bot scenarios test what the cloud wrote.
- The local folder is inside OneDrive. If git ever reports a corrupt object or index lock, pause OneDrive sync and retry.

## First session checklist
1. Read this file, then tell the owner the plan for the local server setup in a few lines.
2. Check Java 21, download Paper 1.21.11, and ask the owner to accept the EULA.
3. Download the plugins you can; give the owner a list of the SpigotMC ones to download by hand.
4. Start the server, confirm every plugin loads, apply the config notes.
5. Set up Mineflayer and a first test bot; create `PLAYTEST.md` in the format from Testing.
6. Build core.sk and inventory.sk, test them with the console and bots, then playtest the inventory with computer use (or ask the owner) and record the results in `PLAYTEST.md`.
