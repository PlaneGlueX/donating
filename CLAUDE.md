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
- Local owner rank: LuckPerms group `owner` (weight 100, prefix `&4[Owner]`, `*` true, `donating.inventory.bypass` **false** so the lock still applies in playtests); user Explosde (the owner's Java name). LuckPerms data is per server: redo this on Minehut.
- LuckPerms default group: `weaponmechanics.use.*` (without it nobody can shoot or reload). Redo on Minehut.
- `server\plugins\Skript\scripts\zz-*.sk` are LOCAL TEST HELPERS (`/zztestkit`, `/zzdump`, `/zzperm`, `/zzclear`, `/zzforget`, `/zzbal`, `/zzcfg`, `/zzafk`, `/zzafkstate`, `/zztip`). Never upload them.
- Owner's Minecraft: launcher at `C:\XboxGames\Minecraft Launcher`, Java client 26.3, username Explosde. The game window (`javaw.exe`) sometimes starts minimized; restore it with Win32 ShowWindow.

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
- Every heist: avoid traps that kill you (lasers, pressure plates, cameras, collapsing floors).
- Heists with an escape countdown: when it hits 0, anyone still inside is teleported to that heist's exit spot and loses whatever they got from that heist.
- Advanced heists only: an alarm that anyone can trip.
  - 20-second warning, then a new wave of NPC cops every 10 seconds.
  - Waves continue until every robber has left the cops' range or died/failed.
- Loot spots copy KoyaRobbery's style: cash tables, jewelry cases, safes that need a tool, a vault door you drill. Test KoyaRobbery first; if it doesn't work on 1.21.11 or doesn't allow separate robbers to loot the same building at once, rebuild it in Skript with our own textures. Don't reuse KoyaRobbery's textures without the author's permission.

### Heist bag
- Loot never goes in your inventory; it goes into a virtual heist bag.
- Bags come in tiers with different sizes, bought in a shop.
- The bag is carried in the offhand (a duffel model per tier), so helmets and vests stay free as gear.
- Everything in the bag sells automatically when you reach the base.
- Future idea: a stash to keep some robbed items.

### Heist UI (while in a heist)
- XP bar: how full your bag is; the number above it is % full. Block vanilla XP changes.
- Boss bar: heist name + escape countdown. Turns red on alarm: "Cops in 20s", then wave number + next wave timer.
- Sidebar: TAB switches to a heist board inside heists (heist name, difficulty, what you'd lose if you died now, bag value / size, robbers inside, loot spots left, wanted status).
- Action bar for quick events; combat-tag messages take priority. Titles and sounds for big moments.
- Extras: arrow pointing to the exit, then to the base while carrying loot; glow on loot spots you can still rob.

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
- Every death (player, trap, or cop) drops your whole bag as one duffel on the ground.
- You also lose your equipped weapons, consumables and all ammo. Nothing drops for other players; weapons stay unlocked.
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
  - Traps kill you as normal, and cops can kill you when you're wanted.
- Bounties:
  - Grow from player kills and robberies. Killing the same player again within 15 minutes doesn't add to your bounty.
  - A bounty stays until a player kills you, then goes to that player.
  - You can't go passive while you have a bounty. Passive players can't gain one, and nobody can place one on them.

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
- Skript's WorldGuard region hooks are deprecated (warning at startup); the official skript-worldguard addon replaces them. Decide before building pvp.sk/heists.sk.

### Verified in Skript 2.16.2 + SkBee 3.25.4 (loaded on the local server)
- `on inventory click with priority highest:`, `on swap hand items with priority highest:`, `on drop with priority highest:`, `on inventory drag:` all parse.
- SkBee custom data on item variables: `set string tag "donating_id" of custom nbt of {_i} to "phone"` (read back with `string tag "donating_id" of custom nbt of {_i}`).
- `colored "..."` turns `&` codes (also from variables) into colors with Skript's safe parser (colors, bold, gradients, reset). `formatted` parses every tag, including click/hover/run-command, so never use it on text that may contain player input (checked in the 2.16.2 source; core.sk's `msg()` switched from `formatted colored` to `colored` in the cloud session, untested). Bold carries over later color codes: put `&r` after bold text.
- Join/quit messages and titles take text components: `set join message to colored "..."`; `delete` hides it. `prefix of player` reads the LuckPerms prefix through Vault's chat hook.
- A Skript command replaces another plugin's command with the same name (Skript overwrites the command map entry), e.g. join-quit.sk's `/help` replaces EssentialsX's.
- Checked in the Skript 2.16.2 / LPC 3.7.2 source (cloud session, untested in-game):
  - `on chat` is Paper's async AsyncChatEvent; `message` is a text component. `"%message%"` gives MiniMessage text (`<` becomes `\<`); `legacyText(message)` (core.sk) gives the typed text with § codes. `raw "..."` makes an unparsed text component. Adding a string to a component parses the string (colors and tags) and nests it under the last part's style, so don't build messages from player text that way.
  - LPC formats chat at HIGHEST (after Skript's high) with a legacy round trip: it strips `&` codes for players without `lpc.colorcodes` but keeps `§` codes. chat-extras.sk colors mentions with `§` inside `raw` text for that reason.
  - A `wait` inside an async event is allowed; the code after it runs on the main thread.
  - A condition written as its own line jumps to what comes after the section it's in: at the top of a trigger it stops the trigger, inside a loop it skips to the next pass (like `continue`), inside an `if` block it skips the rest of that block.
  - `regex replace "(?i)..." in {_text} with "..."` exists (Skript 2.10+). `on player turn around` fires on head rotation only; `on press of any input key` fires on movement keys (also while driving). `player` works in `on command` (empty for console commands).
- A list literal needs `and`/`or` (`loop 1, 2 and 3:`), otherwise Skript warns.
- JVM: `-XX:G1RSetUpdatingPauseIntervalMillis` no longer exists on Java 21 (the JVM refuses to start).
- Handlers without a priority run at Skript's `plugin priority: high`, not normal. `listen to cancelled events by default: false`: a handler doesn't run if an earlier plugin already cancelled the event.
- `on player pick item` (middle-click pick block, Skript 2.15+), `on arrow pickup`, `on recipe book click` (SkBee), `on inventory slot change` (not cancellable) all work.
- Skript 2.16's gamerule expression changed; `execute console command "gamerule keep_inventory true"` is the reliable way.

### Minecraft 1.21.11 / Paper gotchas (verified)
- Game rules were renamed to snake_case: `keep_inventory`, `spawn_mobs`, `advance_time`, `show_advancement_messages`. The old camelCase names fail with "Incorrect argument".
- EssentialsX replaces `/kill`, `/item`, `/list`, `/help`. From the console use `minecraft:kill @e[...]` and `minecraft:item replace ...`.
- LuckPerms runs commands async, so its replies never come back over RCON; check permissions with `/zzperm <player> <node>`.
- `data get entity` output is truncated with "..." for big NBT. Use `/zzdump <player>` for inventories.
- The recipe book moves items into the 2x2 crafting grid without an inventory click (closing puts them in the first free hotbar slot). Blocked with `on recipe book click` (found in the computer-use playtest; bots can't send it).

### WeaponMechanics (verified in its 4.3.1 source and with bots)
- It reads Q (PlayerDropItemEvent) and F (PlayerSwapHandItemsEvent) at LOW with ignoreCancelled=true, schedules the trigger for the next tick, and never re-checks. Cancelling at HIGH/HIGHEST is safe; cancelling at LOWEST/LOW breaks reload and firemode.
- Players need `weaponmechanics.use.<weapon>` (or `.*`) or guns won't shoot or reload.
- Every weapon we sell needs `Info.Cancel.Drop_Item: true` and `Info.Cancel.Swap_Hands: true` (without Swap_Hands, pressing F cancels a running reload even though Skript cancels the swap).
- Default guns have no `Reload.Ammo` section, so they reload for free. Item ammo needs `Reload.Ammo.Ammos` per gun plus an ammo type in `ammos\*.yml`.
- It takes ammo from slots 0-35 except the held slot, editing stacks in place. Never put ammo in the hotbar.
- Never use `Ammo_Switch_Trigger`, `Unload_Ammo_On_Reload: true`, `Weapon_Converter_Check` or `Ammo_Converter_Check`: they add items with addItem (first free hotbar slot) or rewrite items in place (could turn the bag into a weapon).
- Give guns with amount 1 into a fixed slot: `wm give <player> <weapon> 1 {slot:N}` (N = raw slot, 0-8 hotbar). A stack of 2+ guns drops the extras on every shot. `{ammo:N}` sets the rounds loaded.
- Default grenades use placeable materials (RED_CANDLE, TNT, BEACON...). inventory.sk cancels block placing, so that's covered.
- Its `Weapon_Info_Display.Action_Bar` fights hud.sk's action bar; turn it off or route ammo info elsewhere when building hud.sk. Keep `Show_Ammo_In.Exp_*` off (the XP bar is the bag meter).
- WM keys (PDC): `weaponmechanics:weapon-title`, `weaponmechanics:ammo-left`, `weaponmechanics:ammo-name`.

### Fixed-inventory rules for later scripts
- The bag item must be unusable from the offhand: not placeable, edible, equippable, throwable, not a bundle/map/book/bucket. It's leather for now (item model later).
- Never put equippable items (armor, heads, pumpkins) in the hotbar: right-click hot-swaps them with worn armor, and Skript can't cancel that event. Shops set helmets/vests straight into armor slots.
- GUI menus: handle clicks at the default priority (they run before the lock's `highest` cancel); use `on any inventory click` if another plugin may cancel first.
- Make shop items unbreakable. Never build shops as villager (Merchant) GUIs: selecting a trade auto-moves payment items.
- MTVehicles: set `trunkEnabled: false`; when installed, check that car entry still works (inventory.sk cancels right-clicks on non-player entities at highest; exempt stands named `MTVEHICLES_*` if needed).
- EssentialsX: `allow-direct-hat: false` (done). Keep essentials.hat/give/item/more/kit/invsee/enderchest/workbench/anvil/repair/condense/exp/keepinv and virtual GUIs out of the default group.
- Never use Skript `give ... to player` / `add ... to player's inventory`, `/wm give` without `{slot:N}`, `/wm giveammo`, or EssentialsX kits: they fill the first free slot, hotbar first. Always `set slot N of player's inventory`.
- Dropped duffels (bag.sk): spawn a normal item entity with the normal pickup delay and handle it in SkBee `on player attempt item pickup` (cancel, move loot to the bag, remove the entity). Plain `on pick up` doesn't fire when the inventory is full.
- death.sk: spawn the duffel entity itself instead of adding it to the drops (inventory.sk clears drops). inventory.sk already keeps the inventory on every death; death.sk clears slots 0-4 and 9-35 and handles the bag.
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
- Passive mode: robbery payouts −25%, can't enter PvP-only heists, can't place or claim bounties, 10-minute switch cooldown, can't switch while combat-tagged or carrying loot.
- Spawn shield: 10 seconds after respawn/join, ends if you attack.
- Dropped duffel: picking it up moves loot into your bag up to your capacity; the rest stays. Despawns after 2 minutes.
- Deaths outside a heist use the easiest tier's % and your bag cap.
- Quick-time challenge: a menu minigame (click when the marker lines up); 3 failed attempts break the lockpick.
- Money values (heist payouts, bag sizes, prices) aren't set yet. Proposed numbers are in `loadSettings()` in core.sk, marked PROPOSAL, waiting for the owner.

## Open question
- Helmets and vests: unlocked once like guns (re-equip after death at a shop), or lost on death and bought again like ammo? Ask before building gear.

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
- WeaponMechanics 4.3.1: https://github.com/WeaponMechanics/WeaponMechanics/releases (repo moved from MechanicsMain)
- MechanicsCore 4.3.1: https://github.com/WeaponMechanics/MechanicsCore/releases (own repo now)
- PacketEvents **2.13.0**: https://modrinth.com/plugin/packetevents (required by WeaponMechanics, needs 2.12.1+; 2.14.0 was 1 day old, so it was skipped)
- TAB 6.2.0: https://modrinth.com/plugin/tab-was-taken (6.x, not 5.x)
- DecentHolograms 2.10.1: https://modrinth.com/plugin/decentholograms (official, SpigotMC not needed)
- CoreProtect CE 23.2: https://modrinth.com/plugin/coreprotect (the author's official free build; GitHub releases have no jars)
- spark: **don't install**. Paper 1.21+ bundles it and ignores the plugin jar.

Owner downloads by hand (SpigotMC only):
- MTVehicles 2.5.9: https://www.spigotmc.org/resources/mtvehicles-vehicle-plugin-free-downloadable.80910/ (2.5.8 on GitHub stops at 1.21.10). Pack already downloaded: `extras\packs\MTVehicles_Pack_v0.2.3_1.21.4.zip`.
- KoyaRobbery 1.2.2 (test only): https://www.spigotmc.org/resources/robbery-koyarobbery-the-ultimate-robbery-plugin.122431/. A July 2026 review says it doesn't work on 1.21.11, and it's crew-based with per-location cooldowns, so it likely can't do shared heists. Expect to rebuild it in Skript.

Phase 3 (advanced heists), already downloaded to `extras\phase3\` because CI builds can be deleted:
- Citizens **build 4250** (2.0.43): the newest CI builds (4251+) dropped 1.21.11. Never use lastSuccessfulBuild.
- Sentinel 2.9.4-SNAPSHOT build 534: https://ci.citizensnpcs.co/job/Sentinel/ (linked from the GitHub README)

Config notes (applied locally 2026-09-24; copy these files to Minehut):
- EssentialsX: `auto-afk: -1` and AFK broadcasts off (Skript handles AFK). Keep `custom-join-message: "none"` and `custom-quit-message: "none"` (an empty string also hides Skript's messages). `min-money: 0`. No EssentialsX Chat (LPC formats chat). Also `newbies: announce-format: ''` and `kit: ''` (players start with nothing). `disabled-commands: afk` (afk.sk owns /afk; added in the cloud session). chat-extras.sk replaces EssentialsX's `/broadcast` and `/bc`.
- LPC: one format pulling prefixes from LuckPerms; no per-group formats (the default `{prefix}{name}&r: {message}` already does this).
- TAB: header/footer + sidebar; the heist board uses a display condition (`%donating_in_heist%=yes`, listed first). Belowname and TAB's boss bar stay off (belowname is broken on 26.1 clients; Skript runs the boss bar).
- WeaponMechanics `config.yml`: `Resource_Pack_Download.Enabled: false` and `Automatically_Send_To_Player: false`.
- Skript `config.sk`: default database `pattern: (?!-).*` so `{-...}` variables stay in memory only; `backups to keep: 24`.
- EssentialsX `starting-balance: 0` stays: join-quit.sk gives `cfg("money::start")` on the first join, so the number lives in core.sk with the other money values.
- Server-list text (MOTD): set it in the Minehut dashboard. Minehut's proxy answers server-list pings, and the server is asleep when nobody's on, so a Skript ping handler would never be seen. PROPOSAL (the owner hasn't picked one): line 1 `&6&lDONATING &8» &7Heists, cars & bounties`, line 2 `&fRob banks, dodge traps, outrun the cops`.

## Skripts (build in this order)
Phase 1 (core, inventory, heists, PvP):
1. core.sk: shared settings (options block with all numbers), money formatting, player data, helper functions
2. join-quit.sk: join/quit messages with rank prefix, first join, /help (server-list text goes in the Minehut dashboard, see Config notes)
3. chat-extras.sk: chat cooldown, @mention highlight (lime) + sound, staff chat, /broadcast, rotating tips
4. afk.sk: 5-minute AFK detection (refresh on every move/chat/command), /afk; AFK players earn nothing
5. inventory.sk: the fixed inventory layout above; blocks every way items move (number keys, shift-click, drag, swap-hand, drop, death drops); runs after WeaponMechanics
6. phone.sk: phone menu (garage, stats, passive toggle, bounties)
7. shop.sk: gun shop (unlock-once weapons, loadout editing, saved loadout, ammo); other shops (consumables, heist tools, bags, helmets and vests)
8. death.sk: bag drop as one duffel, clears equipped weapons/consumables/ammo, balance loss formula, respawn
9. combat-log.sk: last-damager tracking, wanted = cop tag, 5-second player-hit priority
10. pvp.sk: safe zones, spawn shield, passive mode and its limits
11. bounty.sk: bounty from kills and robberies, placed bounties, claims, passive immunity, anti-farming
12. heists.sk: heist list, open/closed timers, cooldowns, rank requirements, escape countdown, alarms (advanced heists), room resets, status holograms
13. traps.sk: lasers, pressure plates, cameras, collapsing floors
14. loot.sk: KoyaRobbery-style loot spots, tools, progress bars
15. bag.sk: bag tiers, offhand duffel models, virtual loot storage (tracks which heist each item came from), bag contents menu, dropped duffels, auto-sell at base
16. hud.sk: XP bar bag meter, boss bar, heist-board data for TAB, action bar and titles
17. ranks.sk: XP to robber ranks; unlocks heists, tools, car models
18. placeholders.sk: stats for TAB (rank, bounty, passive, bag value, heist info)

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

## Status (2026-09-24, end of first session)
- Checklist items 1-6 done, except the two SpigotMC jars (MTVehicles 2.5.9, KoyaRobbery 1.2.2) that the owner downloads by hand.
- core.sk and inventory.sk built and passing: `bots\run.js inventory-lock` (39 checks), `wm-reload` (5), `join` (4), plus a computer-use playtest with the real 26.3 client. Results in PLAYTEST.md.
- After the last test run, inventory.sk also got: `keep the inventory and experience` on every death (the gamerule only covers the overworld), a Citizens NPC exemption on the entity right-click lock, and an `on inventory open` backstop for merchant/lectern GUIs. The default group has `donating.inventory.bypass` = false (otherwise ops bypass the lock). All loaded clean and the 39 checks passed.
- Waiting on the owner: money numbers (PROPOSAL values in core.sk), the helmet/vest question, whether death loses only the bag's loot or the bag itself too, the Nether/End and mob-spawning settings for Minehut, skript-worldguard, and the MOTD text.

## Status (2026-09-24, cloud session): START HERE in the next local session
Everything from the cloud session is on branch `claude/dreamy-mendel-ouutfb` (draft PR https://github.com/PlaneGlueX/donating/pull/1, on top of `main`). None of it has run on a server yet.

What it did:
- Code review of core.sk + inventory.sk (read against the Skript 2.16.2 and Paper 1.21.11 source). Fixed: `msg()`/`broadcastMsg()` used `formatted`, so player text passed in later could plant clickable commands (now `colored`); a candle on a cake got past the place lock (cakes added to the right-click lock); `cfg()` logs missing keys; `giveMoney` ignores amounts <= 0; the respawn handler skips players who left. New rules went into "Fixed-inventory rules for later scripts".
- Wrote, untested: join-quit.sk, chat-extras.sk, afk.sk (scripts 2–4), core.sk additions (`legacyText()`, `chat::tip-interval`), bot scenarios `join-quit` (15 checks), `chat-extras` (20), `afk` (10), a cake check in `inventory-lock` (now 41), `colorOf()` + message `motd`/`json` in `bots\lib.js`, test helpers `/zzforget`, `/zzbal`, `/zzcfg`, `/zzafk`, `/zzafkstate`, `/zztip`, and EssentialsX `disabled-commands: afk`.
- Choices made without the owner (easy to change): the first join pays `cfg("money::start")`; going AFK only tells that player (no broadcast); being pushed (water, pistons) doesn't count as activity; tips every 5 minutes (PROPOSAL) and only while someone is online; the tip and /help texts.

Handoff steps for the local session (in order):
1. Get the branch: `git fetch origin`, then `git checkout claude/dreamy-mendel-ouutfb`. Test and fix on the branch so `main` stays at the last tested state. The Skripts and configs are tracked in place (`server\plugins\...`), so the checkout updates the server's files directly; there's nothing to copy.
2. No new jars or npm packages: `tools\fetch.ps1` should report everything present, and `bots\node_modules` stays as is (still Mineflayer 4.39.0).
3. Restart the server (`tools\stop-server.ps1`, then `tools\start-server.ps1`): EssentialsX only reads `disabled-commands` at startup, and the three new scripts load. Read the Skript part of `server\logs\latest.log`.
4. Fix load errors one script at a time in this order: core → inventory → join-quit → chat-extras → afk (chat-extras calls `rankedName()` from join-quit and `legacyText()` from core, so it can't load before them). Run `/sk reload <script>` after each fix. PLAYTEST.md item 25 lists the lines most likely to fail and a fallback for each.
5. Run the bot scenarios in PLAYTEST.md order (items 26–32), fix and rerun until they pass, and write each result under its item. Then the human checks (items 30, 33, 34, and 23).
6. Expect this once: local players who haven't joined since the update (Explosde and the older bots) count as a first join and get the $500 start money on their next join.
7. When everything passes: commit on the branch, push, then merge PR #1 on GitHub (or `git checkout main`, `git merge claude/dreamy-mendel-ouutfb`, `git push`). Rewrite this Status section. (A cloud check-in routine watches the PR hourly and stops by itself once it's merged or closed.)
8. Next script: phone.sk (script 6; inventory.sk, script 5, is done). Its garage, passive and bounty buttons need scripts that don't exist yet, so build the menu with a stats page and placeholder buttons that the later scripts fill in. Ask the owner the helmet/vest and bag-loss questions before shop.sk and death.sk.

## Cloud and local sessions
- Repo: https://github.com/PlaneGlueX/donating (private), branch `main`. `.gitignore` keeps out jars, the world, logs, LuckPerms/CoreProtect data, `server.properties` (RCON password), `tools\node` and `bots\node_modules`.
- A **cloud session** works on the repo, not on this PC. It can write and review Skripts, configs, docs and bot scenarios. It can't run the local test server, the Windows tools (`tools\*.ps1`, portable Node), bots against the local server, or computer-use playtests. Mark anything it writes but can't test as "untested (cloud)" in PLAYTEST.md.
- Cloud network (checked 2026-09-24): GitHub works, so a cloud session can read the Skript, SkBee and Paper source to check syntax (`git clone --depth 1 --branch 2.16.2 https://github.com/SkriptLang/Skript`). papermc.io, piston-data.mojang.com, cdn.modrinth.com, download.luckperms.net and skunity.com (its online parser) were blocked. The owner allowed skunity.com mid-session but it stayed blocked; domain changes probably only apply to sessions started afterwards. With Paper, Mojang, Modrinth and LuckPerms allowed, a cloud session could run a Linux copy of the test server (it would need the EULA accepted for that copy too).
- Before ending a cloud session: commit and push everything to `main` (or a branch, and say which in this section). The 2026-09-24 cloud session used branch `claude/dreamy-mendel-ouutfb` (PR #1); see its Status section for the handoff steps.
- **Back to local** (e.g. when cloud credits run out): open this folder in a local Code session and run `git pull` (merge the branch if the cloud used one). Then `tools\fetch.ps1` restores any missing jars, `tools\start-server.ps1` starts the server, and `/sk reload scripts` plus the bot scenarios test what the cloud wrote.
- The local folder is inside OneDrive. If git ever reports a corrupt object or index lock, pause OneDrive sync and retry.

## First session checklist
1. Read this file, then tell the owner the plan for the local server setup in a few lines.
2. Check Java 21, download Paper 1.21.11, and ask the owner to accept the EULA.
3. Download the plugins you can; give the owner a list of the SpigotMC ones to download by hand.
4. Start the server, confirm every plugin loads, apply the config notes.
5. Set up Mineflayer and a first test bot; create `PLAYTEST.md` in the format from Testing.
6. Build core.sk and inventory.sk, test them with the console and bots, then playtest the inventory with computer use (or ask the owner) and record the results in `PLAYTEST.md`.
