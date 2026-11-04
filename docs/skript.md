# Skript, Paper and Minecraft gotchas

Moved word for word from CLAUDE.md on 2026-11-03. Grep a heading, then read that part: don't read the whole file.

### Skript features to use
- Skript 2.16 has boss bars. TAB scoreboards support display conditions (switch to a heist board with a placeholder from skript-placeholders).
- SkBee structures can save and paste heist rooms for resets.
- Shared numbers: Skript options (`{@x}`) only work in the file that defines them, so all settings live in `loadSettings()` in core.sk as memory-only `{-cfg::*}` variables. Other scripts read `{-cfg::key}` or `cfg("key")`.
- Placeholders from skript-placeholders must be named `prefix_identifier` (e.g. `%donating_level%`); current PlaceholderAPI rejects bare names. Install it as a plugin, not as a PAPI expansion.
- WorldGuard regions: every region protects by default, so non-members can't PvP (WorldGuard checks the target's spot and says "Hey! Sorry, but you can't PvP here."), use doors or buttons, or click entities (NPC shops) inside it (verified 2026-09-25). Every Donating region (safe zones, heists, districts) gets `/rg flag <id> passthrough allow`, and Skript owns the rules. Safe zones are regions whose id starts with "safe_base" since 2026-10-21 (pvp.sk; "safe" before).
- skript-worldguard syntax (1.0.1, from its jar): `on region enter:` / `on region exit:` (cancellable: WorldGuard pushes the player back; also teleports), event value `the worldguard region`, `name of <region>` = its id, `regions at <location>`, `create a cuboid region named <id> in <world> between <loc> and <loc>`.
- WorldGuard in Skript: skript-worldguard 1.0.1 (official addon, installed 2026-09-24, owner decision). Skript's own deprecated hook is off (`config.sk`: disable hooks → regions → worldguard: true). Open upstream issues to watch: #44 region detection, #34 blocks of region.

### Verified in Skript 2.16.2 + SkBee 3.25.4 (loaded on the local server)
- `on inventory click with priority highest:`, `on swap hand items with priority highest:`, `on drop with priority highest:`, `on inventory drag:` all parse.
- SkBee custom data on item variables: `set string tag "donating_id" of custom nbt of {_i} to "phone"` (read back with `string tag "donating_id" of custom nbt of {_i}`).
- `colored "..."` turns `&` codes (also from variables) into colors with Skript's safe parser (colors, bold, gradients, reset). `formatted` parses every tag, including click/hover/run-command, so never use it on text that may contain player input (checked in the 2.16.2 source; core.sk's `msg()` switched from `formatted colored` to `colored` in the cloud session, untested). Bold carries over later color codes: put `&r` after bold text.
- Join/quit messages and titles take text components: `set join message to colored "..."`; `delete` hides it. `prefix of player` reads the LuckPerms prefix through Vault's chat hook.
- A Skript command replaces another plugin's command with the same name (Skript overwrites the command map entry), e.g. join-quit.sk's `/help` replaces EssentialsX's. Its `aliases:` don't: `/broadcast` with `aliases: /bc` still ran EssentialsX's `/bc` (verified locally). Make each name its own command.
- Bots and resource packs: with `resource-pack` set in server.properties, the server waits for the client's answer before letting it in, and Mineflayer never answers; `bots\lib.js` declines the pack for every bot (`join(name, { pack: 'declined' | 'loaded' })`, default declined; until 2026-09-29 Mineflayer's own resource_pack plugin answered "accepted, loaded" after lib.js's decline in the configuration phase, so the server counted every bot as having the pack: its plugin is off now; 'loaded' answers accepted, downloaded, loaded without downloading anything, for panels.js). The creative mode doesn't use up an empty map (the filled map goes to another slot), so bots make maps in survival.
- Mineflayer (bots\lib.js handles both): player chat changed by a plugin (LPC's format, mentions) arrives as unsigned content, which the real client shows; Mineflayer keeps it in `msg.unsigned`. Its `title` event turns 1.21 NBT titles into `[object Object]`, so lib.js decodes the title packets itself.
- Mineflayer 4.39 on 1.21.9+ divides entity velocity packets by 8000 (the old unit), so bots barely feel a pull or knockback: a test that needs it applies the bot's own velocity packets itself (grapple.js: `bot._client.on('entity_velocity', ...)`). It also misfiles attribute updates (movement speed): wm-melee.js applies the speed itself. Bots do drive MTVehicles cars with their own keys: `bot._client.write('player_input', { inputs: { forward, backward, left, right, jump, shift, sprint } })` is the packet MTVehicles reads (carsmooth.js, 2026-09-29; the old note said they couldn't); some tests still call car logic through zz helpers (`/zzcarclimb`).
- Checked in the Skript 2.16.2 / LPC 3.7.2 source (cloud session, untested in-game):
  - `on chat` is Paper's async AsyncChatEvent; `message` is a text component. `"%message%"` gives MiniMessage text (`<` becomes `\<`); `legacyText(message)` (core.sk) gives the typed text with § codes. `raw "..."` makes an unparsed text component. Adding a string to a component parses the string (colors and tags) and nests it under the last part's style, so don't build messages from player text that way.
  - LPC formats chat at HIGHEST (after Skript's high) with a legacy round trip: it strips `&` codes for players without `lpc.colorcodes` but keeps `§` codes. chat-extras.sk colors mentions with `§` inside `raw` text for that reason.
  - A `wait` inside an async event is allowed; the code after it runs on the main thread.
  - A condition written as its own line jumps to what comes after the section it's in: at the top of a trigger it stops the trigger, inside a loop it skips to the next pass (like `continue`), inside an `if` block it skips the rest of that block. At the top level of a function that returns something, a failing one ends the function with nothing returned (found 2026-09-26: trapDropSpot returned no location and duffels dropped nowhere); use nested `if`s and a final `return` there.
  - `regex replace "(?i)..." in {_text} with "..."` exists (Skript 2.10+). `on player turn around` fires on head rotation only; `on press of any input key` fires on movement keys (also while driving). `player` works in `on command` (empty for console commands).
- Particles (2.16, jar-checked, 2026-09-28): `draw 8 rgb(190, 60, 255) dust particles of size 1.6 with offset vector(0.9, 0.02, 0.9) at {_l}`; `... with an extra value of 0` (the particle speed) goes after the offset. Dragon breath, electric spark and end rod particles drift with the default speed (a car's neon flew across the sky).
- `kill <entity>` on an entity whose damage a handler cancels ends with a plain remove (no drops, no death event): a quiet way to remove stands. The vanilla kill command run by the console echoes "[Server: Killed ...]" into every op's chat.
- `set item cooldown of <itemtype> for <player> to <timespan>` shows the hotbar's cooldown sweep. `<player> is pressing forward key` (input keys, 2.15+) works while driving an MTVehicles car. `%blocks% is passable`.
- An unset value in a comparison makes `is` false and `is not` true (2.16.2: SimpleExpression.check returns the negation flag when there are no values), whichever side is unset. So when an unset value must not pass a negated check (`{data::...} is not "done"` before giving something), test `is set` first. crates.sk's `{crateblock::%{_key}%} is not {_t}` relies on a removed (unset) stand counting as "not". `cfg("x") is not true` with the setting missing is true: fail closed. (Review 2026-09-28 corrected an earlier note that had it backwards.)
- Two nested entity loops: the inner one's value is `loop-entity-2` (`loop-entity` alone doesn't parse).
- `loop-index` in a loop over a function's returned list counts from 0, not 1 (found 2026-10-14: jailcourse.sk's jcStepNum read every course step one lower, so Rusty's door never opened from inside at the office step). Count with your own counter there.
- A list literal needs `and`/`or` (`loop 1, 2 and 3:`), otherwise Skript warns.
- A quoted text inside a string's %...% works (`"%cfg("a::b")%"`), but not one that has its own %...% (`"%cfg("a::%{_x}%")%"` fails to parse): build the key in a local first.
- `loop-number-2` is ambiguous: when the loops around it aren't both number loops (e.g. `loop {list::*}:` around `loop 3 times:`), Skript reads it as `loop-number` minus 2 (found 2026-09-27: jobs.sk saw slots -1, 0, 1). Use `loop-value-2` (the 2nd enclosing loop, whatever it loops over), or put the number in a local first.
- `#` starts a comment anywhere in a script line outside quotes, even inside a variable name: `{ss::%{_h}%#%{_r}%}` cuts the line, the script loads without it (one "Invalid amount or placement of brackets" error in the log; found 2026-09-27: every season getaway was refused). Build such keys in a string first (`set {_k} to "%{_h}%#%{_r}%"`). After a restart, check the log for `Line N: (<script>)` errors, not only "Loaded N scripts".
- A list variable that holds only sub-lists (`{x::1::a}`, nothing at `{x::1}`) is never "set": `{x::1::*} is set` is false. Use a flag. `loop {x::*}` skips such entries too (found 2026-09-27: `loop {traps::*}` ran zero times; loop the heists and then `{traps::<h>::*}`).
- SkBee tab completion: see "Tab completion (tabcomplete.sk)" (empty lists become a blank entry, remove can't trim Bukkit's lists, list the /skript: label too).
- `set {x::*} to ...` deletes every element under `{x::}` first, including named ones like `{x::title}` (found 2026-09-25: the gear and tools shop lists wiped their shop titles). Never put single settings under a key that is also a list; shop titles are `shop::title::<kind>`.
- JVM: `-XX:G1RSetUpdatingPauseIntervalMillis` no longer exists on Java 21 (the JVM refuses to start).
- Handlers without a priority run at Skript's `plugin priority: high`, not normal. `listen to cancelled events by default: false`: a handler doesn't run if an earlier plugin already cancelled the event.
- `on player pick item` (middle-click pick block, Skript 2.15+), `on arrow pickup`, `on recipe book click` (SkBee), `on inventory slot change` (not cancellable) all work.
- `event-slot` of `on inventory slot change` is only right in the player's own inventory view (found 2026-10-04 in the owner's session log, Paper 1.21.11 + Skript 2.16.2 bytecode and source, reproduced with bots). While another menu is open, the player's own InventoryMenu still reports its armor and offhand slots (raw 5-8 and 45: ServerPlayer.tick runs inventoryMenu.broadcastNonContainerSlotChanges whenever containerMenu isn't it), and Paper's PlayerInventorySlotChangeEvent turns that raw slot into a slot number with the OPEN view's convertSlot: with a 6-row menu an offhand change is slot 45, which Skript maps to an equipment slot only for 36-40, so evaluating event-slot throws ("bukkitSlot cannot be null", a Severe Error); with a 3-row menu it's slot 27, a hopper 13 and so on, and with a menu of 9+ slots a boots change reads as hotbar 9 (slot 8). Slots 0-35 changed through the open menu are numbered right. So read event-slot only when `type of player's current inventory is crafting table inventory` (InventoryType.CRAFTING: the 2x2 grid of the player's own view), and treat any change with a menu open as unknown (inventory.sk's watchdog checks the layout then, at most once a tick). Also: a new menu's first sync reports every filled player slot as changed (old = air).
- Skript 2.16's gamerule expression changed; `execute console command "gamerule keep_inventory true"` is the reliable way.

### Minecraft 1.21.11 / Paper gotchas (verified)
- EssentialsX's spawn-on-respawn is a teleport, so its teleport protection also covers the first 4 s after respawning (tests wait 5 s before hitting a respawned bot).
- Game rules were renamed to snake_case: `keep_inventory`, `spawn_mobs`, `advance_time`, `show_advancement_messages`. The old camelCase names fail with "Incorrect argument".
- Teleport immunity (owner, 2026-09-27: 3 s, "test out different scenarios to find points of abuse"): EssentialsX's `teleport-invulnerability` is 0, because it also covered WorldGuard pushing a combat-tagged player back at a safe zone's edge (bumping the edge kept them immune; found with bots). pvp.sk gives its own `pvp::teleport-immunity` (3 s) after a command teleport (cause COMMAND: /spawn, /tpa, staff /tp, `minecraft:tp` from RCON) and after a heist eviction or a rejoin at a heist's exit (heists.sk `tpImmune`): nobody hurts them and they hurt nobody; cops and traps ignore it; plugin teleports (zzheisttp, pushbacks) give none. bots\run.js tpimmune (6 checks). Tests still wait ~3 s after a `minecraft:tp`.
- New players can't be hurt until their client says it has loaded; Mineflayer never says so, so bot hits land only about 6 s after joining.
- EssentialsX replaces `/kill`, `/item`, `/list`, `/help`, `/tp`, `/xp`. From the console use `minecraft:kill @e[...]`, `minecraft:item replace ...`, `minecraft:tp` and `minecraft:experience` (plain `kill @e[...]` from Skript or RCON is EssentialsX's: "Player not found", nothing dies). Bot tests too: inventory-lock's watchdog checks and traps' "a vest doesn't soften it" used plain `item replace` until 2026-10-04 (RCON gets "Only in-game players can use item.") and so moved nothing.
- `execute if entity <selector>` answers "Test passed. Count: N" (capital C) over RCON.
- Some bot scenarios kill every non-player entity to clean up, so hand-placed test entities (like POI armor stands) don't survive a test run.
- LuckPerms runs commands async, so its replies never come back over RCON; check permissions with `/zzperm <player> <node>`.
- `data get entity` output is truncated with "..." for big NBT. Use `/zzdump <player>` for inventories.
- The recipe book moves items into the 2x2 crafting grid without an inventory click (closing puts them in the first free hotbar slot). Blocked with `on recipe book click` (found in the computer-use playtest; bots can't send it).

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

## Skripts (build in this order)
Phase 1 (core, inventory, heists, PvP):
1. core.sk: shared settings (options block with all numbers), money formatting, player data, helper functions
2. join-quit.sk: join/quit messages with rank prefix, first join, /help (server-list text goes in the Minehut dashboard, see Config notes)
3. chat-extras.sk: chat cooldown, @mention highlight (lime) + sound, staff chat, /broadcast, rotating tips
4. afk.sk: 5-minute AFK detection (refresh on every move/chat/command), /afk; AFK players earn nothing
5. inventory.sk: the fixed inventory layout above; blocks every way items move (number keys, shift-click, drag, swap-hand, drop, death drops); runs after WeaponMechanics
6. phone.sk (built 2026-09-24, controls reworked 2026-09-25 for the phone plugin): right-click toggles the big map, F opens the apps menu: stats, passive toggle (pvp.sk rules), how to play, close; garage and bounties are "coming soon" placeholders for garage.sk / bounty.sk.
6b. nav.sk (built early, 2026-09-24): who shows on the phone map (the `donating_passive` tag) and the locator bar (passive players only), `setPassive()` with its messages. Later: POI waypoints, heist exit/base waypoints
6c. gps.sk (built 2026-09-26): the GPS (pins, quest targets, the base while carrying loot; the phone plugin finds the way along the roads). See "GPS (gps.sk + DonatingPhone)".
7. shop.sk (built 2026-09-25): gun shop (6-row menu: Loadout, Weapons, Ammo, Items tabs, hotbar 1-5 mirror, Save/Restore loadout), gear shop (helmets, vests), bag shop, heist tools (coming soon). Shopkeepers: mannequins tagged `donating_shop` + `shop_<kind>` (staff: `/dshopkeeper add <kind>` / `remove <id>` / `list`; a missing one comes back within 30 s); Citizens NPCs later run the console command `dshop open <p> <kind>`. See "Shops" in Verified notes.
8. death.sk (built 2026-09-25): clears hotbar 1-5, ammo, helmet and vest; the bag is lost (data `bag-tier` = the bag you carry, deleted; `bag-best` = the highest tier unlocked, kept); balance loss L = min(B × p, C) with cop-p for cop deaths (heists.sk gives `deathDifficulty` / `deathLootPool`); saves `last-death-cause` / `last-death-loss`; tells a combat-logger on their next join. The loot duffel is bag.sk's.
9. combat-log.sk (built 2026-09-25): combat tag (15 s PROPOSAL) on player/cop/trap damage, wanted = tagged (hunted by an alarm, or the permission `donating.wanted` for tests), logout while tagged = death credited by `deathCause()` (5-second player-hit priority, then cops, then last damager), no teleport commands or passive switch while tagged. traps.sk calls `tagCombat(victim, "trap")`; death.sk and bounty.sk read `deathCause()` and the data `last-combat-log`.
10. pvp.sk (2026-09-25: passive switching with the cooldown, bounty and combat-tag rules; no PvP for or against passive players; safe zones; the spawn shield). Still to add: the loot check in `passiveBlockReason()` (bag.sk), PvP-only heists (heists.sk).
11. bounty.sk (built 2026-09-25): kills add $250 (PROPOSAL) to the killer's bounty, capped at $25,000 from kills, not twice for the same victim within 15 min; `addBounty(p, value × robbery-share, "robbery")` for bag.sk's sales; `/bounty <player> <amount>` places one (at least $1,000, paid by the placer); the next player kill (or a combat log credited to a player) pays the killer all of it; passive players can't gain, claim or place bounties, and nobody can place one on them; no payout or kill bounty between same-IP players (`bounty::ip-check`). The phone's Bounties app and `/bounty` list the biggest bounties online.
12. heists.sk (built 2026-09-25): heists defined with /dheist, the state machine (cooldown + room reset → open → the escape clock → 0:00), entry gates, the heist crew, deaths/logouts inside, the alarm timeline and lockdown, room resets (SkBee), status holograms (DecentHolograms) and placeholders. See "Heists (heists.sk)" in Verified notes.
13. traps.sk (built 2026-09-25): lasers (static, blinking, any angle), pressure plates, collapsing floors, cameras (alarm or turret), `/dtrap`. See "Traps (traps.sk)" in Verified notes.
14. loot.sk (built 2026-09-25): loot spots (piles, glass, safes with a code keypad, vault doors to drill), the hold-to-grab race, head starts, markers and prompts, /dloot. See "Loot (loot.sk)" in Verified notes.
15. bag.sk (part 1 built 2026-09-25: storage per heist run, capacity, fill in the name, glint, forfeits, auto-sell at the base; part 2 built 2026-09-26: the dropped duffel and its pickup; the contents menu /bag, also the phone's Bag app, 2026-09-26: one line per heist run with its value, the run you're robbing marked "get out before 0:00", looking only)
16. hud.sk (2026-09-25: the XP bar shows the held gun's ammo; `hudBar(p, text, prio)` action-bar priority: combat 3, traps 2, loot 1, prompts 0; 2026-09-26: the boss bar, heist sounds and the alarm title)
17. levels.sk (built 2026-09-26 as ranks.sk, renamed): XP to robber levels; unlocks heists and tools now, car models later (garage.sk: `levelOk`). See "Robber levels (levels.sk)" in Verified notes.
17b. ranks.sk (built 2026-09-26): paid ranks (LuckPerms groups) with a tag in the tab list and chat, sorted higher in the tab list, a bag skin and more bag room; /store. See "Paid ranks (ranks.sk)" in Verified notes.
17c. boosters.sk (built 2026-09-26): server-wide money boosters (Tebex). See "Money boosters (boosters.sk)".
17d. crates.sk (built 2026-09-26): crates, virtual keys, /daily, the spin, crate stands, /dcrate (Tebex). See "Crates, keys and /daily".
17e. cosmetics.sk (built 2026-09-26): titles, crate bag skins, kill effects, the /cosmetics wardrobe. See "Cosmetics (cosmetics.sk)".
17f. tutorial.sk (built 2026-09-26): the first-join tutorial (buy a bag before leaving spawn). See "The first-join tutorial".
18. placeholders.sk (started 2026-09-25 for the tab list: balance, bounty, passive, AFK, max players; bag, bag_pct, heist_loot, heist_spots, heist_haul, heist_risk for the heist board, copied into memory by loot.sk; level, level_num and level_xp, copied by levels.sk) (heists.sk answers in_heist / heist_name / the hologram lines)

Phase 2 (cars):
19. garage.sk (built 2026-09-26): the Car Dealer, the garage menu, repaints (wraps stay a later paid idea), one car out per player, car locks, no-lock zones, the car key, crate cars. See "Cars (garage.sk, car-cleanup.sk)".
20. car-cleanup.sk (built 2026-09-26): 5-minute idle, 1-minute other-car, logout despawns, the stand sweep
21. npc-cars.sk: skipped (owner, 2026-09-26: "Skip NPC cars").
22. contracts.sk (built 2026-09-26): car-theft jobs, tier lockpicks, the lock-picking minigame, chop shops; see "Car-theft contracts (contracts.sk)" in Verified notes.
22b. quests.sk (built 2026-09-26): quest givers you visit in person (an NPC at a place; contracts are the first kind). See "Quest givers (quests.sk)".
25. progress.sk + seasons.sk (built 2026-09-27): the event hub, seasons, three leaderboards, prizes. See "Seasons and leaderboards".
26. story.sk (built 2026-09-27): Mara's missions, the personal questline. See "The story: Mara's missions".
27. tabcomplete.sk (built 2026-09-27): tab completion for every command that takes arguments. See "Tab completion (tabcomplete.sk)".
28. jobs.sk and fence.sk (built 2026-09-27): contact jobs from Mara and the Boss; Vic the Fence's arc and weekly Wanted List. See "Contact jobs" and "Vic the Fence".
29. hits.sk (built 2026-09-27): weekly hit contracts from the Broker, a per-hunter NPC copy. See "Hit contracts (hits.sk)".
30. pv.sk (built 2026-09-27): personal views (entities one player sees). See "Personal views".
31. citygarage.sk (built 2026-09-27): cars out and back at garages in person; Valet for Elite and Legend; the bays show each player's own cars. See "The City Garage".
32. 2026-09-28: carwraps.sk (generated), items.sk (item rules), grapple.sk (the Grappler), help.sk (/help, /adminhelp), messages.sk (the phone's Messages app); 2026-09-29: districts.sk (district names), setup.sk (/dsetup, the launch checklist). See "The car expansion", "New melee weapons and consumables", "The Grappler", "Help".
33. ui.sk (2026-09-29): the phone-style menus' titles and app icons (phoneTitle, appIcon, phonePage...). See "Phone-style menus (ui.sk)".
34. carcam.sk (2026-09-29): /carcam and the chase view's action bar. See "Smoother cars and the chase camera".
35. voice.sk and the generated voicelines.sk (2026-10-20): the inmates' voice lines, /voiceline. See "Voice lines (voice.sk)".
36. fuel.sk and bikes.sk (2026-10-21, a cloud session, untested on a server): fuel, the gas pumps, the garage's Refuel; the stolen bikes at the bike shop. See "Fuel and the pumps" and "Stolen bikes".
37. clock.sk and clerk.sk (2026-10-21, a cloud session, untested): the city clock (on the play world's vanilla day/night time, /clock) and the stores' clerks (hit to start, the panic button, thrown props); heists.sk's alarm in assaults. See "The city clock" and "Store clerks and the police assaults".

Phase 3 (advanced heists):
23. cops.sk (built 2026-09-26): Citizens + Sentinel cops for the alarm's waves, targets = the hunted players, cleanup; see "Cops (cops.sk)" in Verified notes.

Later:
24. trade.sk (built 2026-09-26): trading cars and crate cosmetics in person; see "Trading (trade.sk)". Car wraps: built 2026-09-28 (carwraps.sk).

## Skript lessons from earlier debugging (older Skript; re-check on 2.16)
- (2.16, found 2026-09-27) Skript doesn't wait for a called function that itself waits: the caller runs on at once without its result (hits.sk's first spawn made a target NPC every second). Put the waits in the function that needs the result.
- (2.16) `x-coordinate of {_a} + {_b}` (and `- x-coordinate of ...`) parses as the coordinate of a sum: <none>. Put each coordinate in a local first.
- (2.16) Inside a string's %...% a quoted text is written with plain quotes (`"%cfg("a::b")%"`); doubled quotes (`""a::b""`) fail to parse. `loop-value-2 - 1` fails too ("no loop that matches"): put it in a local.
- (Sentinel 2.9.4) It sets the damage of every hit its NPC deals to its own `damage` setting (a /damage 100 by a Sentinel NPC does 2.5), and `safeshot` cancels hits on anyone who isn't its target yet.
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
