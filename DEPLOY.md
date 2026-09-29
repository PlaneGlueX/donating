# Deploying Donating to Minehut

The exact steps to move the local test server to Minehut (free plan). Local-only settings never go: the local server runs in offline mode with RCON for bots and tests, Minehut runs in online mode behind its proxy.

## 1. Before you start

- Decide the open numbers (PROPOSALs in `server/plugins/Skript/scripts/core.sk`): money, bag sizes, prices, levels, crate contents, cop strength. They can change later, but players notice.
- Build the city (or at least spawn, the base, one gun shop and one heist) in the local world first: the world is uploaded as a folder.
- Build the phone plugin: `powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-plugin.ps1` (makes `server\plugins\DonatingPhone.jar`; it compiles against `server\plugins\TAB-*.jar` for the nametags, so TAB must be there).
- Build the resource pack: `tools\node\node.exe tools\make-item-art.js`, `tools\node\node.exe tools\make-phone-art.js`, `tools\node\node.exe tools\make-car-wraps.js` (the car wraps: it also writes the wrap variants into `vehicles.yml` and `carwraps.sk`), then `tools\node\node.exe tools\build-pack.js` (makes `extras\packs\Donating-pack.zip`).

## 2. Minehut dashboard

- Server type **Paper**, version **1.21.11**.
- **Resource pack**: Minehut takes a URL. Upload `Donating-pack.zip` somewhere with a direct download link (a public file host). It includes WeaponMechanics' official pack, which its README allows merging and hosting for your own players, but never selling or publishing as a pack, and MTVehicles' car models (merged the same way, with their credits; the file host link must not be shared as a pack download). Tick "require" so every player gets the guns, cars, bags, phone and tracers. After every pack build the file changes: upload the new one and update the URL (and hash, if the dashboard asks).
- **MOTD** (the server list text; owner, 2026-09-28: option c): line 1 `&6&lDONATING &7| &fA city of heists`, line 2 `&aStart with nothing. &6Leave with everything.`
- **Server properties**: `allow-nether` false (owner, 2026-09-27: the Nether and the End stay off; the End is `allow-end: false` in `bukkit.yml`, uploaded below).
- Online mode stays on (Minehut's default). Nothing from the local `server.properties` goes up.

## 3. Upload plugins (File Manager → `plugins/`)

Every jar below is in `server\plugins\` locally (tools\fetch.ps1 re-downloads missing ones and checks their hashes):

| Plugin | File |
|---|---|
| ViaVersion | `ViaVersion-5.12.0.jar` |
| LuckPerms | `LuckPerms-Bukkit-5.5.85.jar` |
| LPC | `LPC-3.7.2.jar` |
| Vault | `Vault-1.7.3.jar` |
| EssentialsX + Spawn | `EssentialsX-2.22.0.jar`, `EssentialsXSpawn-2.22.0.jar` |
| WorldEdit | `worldedit-bukkit-7.3.19.jar` |
| WorldGuard | `worldguard-bukkit-7.0.16.jar` |
| PlaceholderAPI | `PlaceholderAPI-2.12.3.jar` |
| Skript | `Skript-2.16.2.jar` |
| SkBee | `SkBee-3.25.4.jar` |
| skript-placeholders | `skript-placeholders-1.7.1.jar` |
| skript-worldguard | `skript-worldguard-1.0.1.jar` |
| WeaponMechanics + MechanicsCore | `WeaponMechanics-4.3.1.jar`, `MechanicsCore-4.3.1.jar` |
| PacketEvents | `packetevents-spigot-2.13.0.jar` |
| TAB | `TAB-6.2.0.jar` |
| DecentHolograms | `DecentHolograms-2.10.1.jar` |
| CoreProtect CE | `CoreProtect-CE-23.2.jar` |
| Citizens + Sentinel (cops) | `Citizens-2.0.43-b4250.jar`, `Sentinel-2.9.4-SNAPSHOT-b534.jar` |
| Tebex | `tebex-bukkit-2.4.6.jar` |
| MTVehicles (cars; downloaded by hand from SpigotMC) | `MTVehicles.jar` (2.5.9) |
| DonatingPhone (ours) | `DonatingPhone.jar` |

Not spark (Paper has it built in).

Start the server once so every plugin makes its folders, then stop it and upload the configs.

## 4. Upload configs and scripts

| Local file (under `server/`) | Minehut path |
|---|---|
| `plugins/Skript/config.sk` | same |
| `plugins/Skript/scripts/*.sk` **except every `zz-*.sk`** (test helpers: they give items and money) | same |
| `plugins/Essentials/config.yml` | same |
| `plugins/TAB/config.yml`, `plugins/TAB/groups.yml` | same |
| `plugins/LPC/config.yml` | same |
| `plugins/WeaponMechanics/config.yml` (armor: `Per_Armor_Point: -6%`) and the folders `weapons/` (the nerfed gun damage; since 2026-09-28 also `melee/Dagger.yml`, `melee/Baseball_Bat.yml`, `consumables/Throwing_Knife.yml`, `Energy_Drink.yml`, `Bandage.yml`), `ammos/`, `projectiles/` (the thrown knife) | same |
| `plugins/WorldGuard/config.yml` | same |
| `plugins/MTVehicles/config.yml` (no auto-update, no fuel, trunks or pickup), `vehicles.yml` (Donating's cars: the dealer colors, the extreme families Racecar, Motor and SUV Cabrio, and every car's wrap variants; never remove a variant once cars of it exist), `supersecretsettings.yml` (English messages). Never `vehicleData.yml` (local test cars) | same |
| `bukkit.yml` (`allow-end: false`: the End stays off), `spigot.yml` | server root |
| `plugins/Essentials/motd.txt` (empty: no join text) | same |
| The world folder (`world/`, with `world/generated/donating/structures/` = the heist rooms, `world/data/map_*.dat` = the phone maps, wall maps and any old city maps) and `plugins/WorldGuard/worlds/world/regions.yml` (safe zones, heist regions) | server root / same |
| The phone's city and GPS roads, made together on the same server (see the city map step): `plugins/DonatingPhone/city.bin`, `city.yml`, `roads.bin`, and `walls.yml` if there are wall maps | `plugins/DonatingPhone/` |
| `plugins/DecentHolograms/holograms/` (heist and crate stand holograms; not `gbay_*`, the garage bay labels: see Places) | same |

Never upload: `server.properties`, `plugins/Skript/variables.csv` (full of test data), `plugins/MTVehicles/vehicleData.yml` (test cars), `plugins/Tebex/config.yml` (holds the local secret key), `plugins/LuckPerms/` data, CoreProtect's database, `logs/`.

## 5. First start: console commands

Type these in the Minehut console panel, in order.

Ranks and permissions (LuckPerms data is per server):
```
lp creategroup owner
lp group owner setweight 100
lp group owner meta setprefix 100 "&4[Owner]"
lp group owner permission set * true
lp group owner permission set donating.inventory.bypass false
lp group owner permission set donating.wanted false
lp group owner permission set mtvehicles.ride false
lp group owner permission set mtvehicles.oppakken false
lp user Explosde parent add owner
lp group default permission set weaponmechanics.use.* true
lp group default permission set donating.inventory.bypass false
dranks setup
```
(Staff you add later: a group with `donating.staff` and `donating.inventory.bypass` true, never `donating.store` (it grants paid perks) and never `donating.quests.admin` (it pays out and grants progress: `/djobs met|post|rep`, `/dhit give|reset|window`, `/dfence roll|reset`, `/dstory set|reset`). The owner has both through `*`.)

Game rules (keep_inventory is set by inventory.sk itself):
```
gamerule spawn_mobs false
```

The store (type your own key; never paste it anywhere else):
```
tebex secret <your key>
```
Then put the store's address in `core.sk` as `store::url` and upload it again (`/sk reload core`).

The heists, traps, loot, cop spots: locally, run `/dheist dump <id>`, `/dtrap dump <id>`, `/dloot dump <id>` and `/dcops <id> dump` for every heist; the lines are also in `plugins/Skript/logs/heists.log`. Run those lines on Minehut in the same order (heist first, then traps, loot, cops), then `/dheist enable <id>`.

Places, standing where they go:
- Safe zones: WorldEdit wand (a structure void), `/rg define safe_spawn`, `/rg flag safe_spawn passthrough allow`, `/rg flag safe_spawn weapon-shoot deny`; the base is a safe zone whose id starts with `safe_base` (loot sells there). There's no spawn lock any more (2026-09-27).
- Members-only places (2026-09-28, rewards past level 100): a region whose id starts with `lvl<N>_` (`lvl150_lounge`) lets in only robbers of level N and up (walking, teleports and cars are pushed back; staff always pass). Proposed: a level-150 lounge (the Kingpins' club: a bar, a crate stand, the top cars on show). Add `passthrough allow`.
- A heist for level 100+ ("The Reserve", proposed): build it like any difficulty-4 heist, then `/dheist set <id> level 100` and a bigger `/dheist set <id> pool 600000`.
- No-grapple regions: the Grappler (a heist tool from level 30) can't hook onto or near heists anyway (also high above one, and never onto barrier blocks); put a region whose id starts with `nograpple` over roofs and spots players shouldn't reach (the anchor and where you stand are checked). `tool::grappler::enabled` false in core.sk switches every Grappler off at once.
- Shopkeepers: `/dshopkeeper add gun|gear|bag|tools|cars|garage` (a bag shop and a gun shop near spawn; `cars` is the Car Dealer, `garage` a City Garage attendant). Without a City Garage site a car spawns next to the player who calls it (so the dealer wants an open street nearby); with one, cars come out only at garages (Valet: Elite and Legend call them anywhere).
- The GPS road grid: once the city is built, set `gps.street-y-min` / `street-y-max` (a few blocks below the street / the street level + 2) and `gps.road-blocks` (the street's blocks, used nowhere else) in `plugins/DonatingPhone/config.yml` and run `/dphone` (reload). The roads scan comes right after the city scan (the city map step below), on the same server: roads.bin only fits the city box it was made for. Check it with `/dphone roads show <you>` on the big map. Rescan both after changing the streets. Without it the GPS points straight at targets.
- Seasons (seasons.sk): at the public launch, `/dseason start 28` in the console (the first season is Season 1; the next ones start by themselves). Leaderboard holograms: stand where each goes and `/dseason holo earners`, `heisters`, `wheelmen` (DecentHolograms saves them in `plugins/DecentHolograms/holograms/`). Give every staff group `donating.season.exempt` true (staff aren't counted); the owner has it through `*` (set it false to compete). Upload TAB's config.yml (the sidebar's season line). Place a Season crate stand (`/dcrate place season`, in a safe zone with `passthrough allow`): milestones and prizes give Season keys, which only open there. Before launch nothing else is needed: variables.csv (the local test seasons) isn't uploaded.
- The story (story.sk): place Mara where the Safehouse is (`/dquest add story Safehouse`, a safe zone with `passthrough allow`). Name the shop POIs so the missions find them: "Gun Shop", "Bag Shop", "Gear Shop", "Car Dealer" (`/dpoi add shop Gun Shop`...). For every chapter to be playable the map needs a heist with a safe (difficulty 1-2), one with a vault door to drill (difficulty 2-3), a third heist a level-2 player can enter ("Rob 3 different heists"), and an advanced difficulty-4 heist with a safe and a vault (the finale); a mission the map can't do is skipped. Disabling a heist to rebuild it costs nobody their mission: a mission is only skipped once its content has been missing for 15 minutes in a row (core.sk `story::needs-grace`), so re-enable it within that time. Mara can be placed after launch: until then (or while she's being moved) her missions wait, and /missions has a Call Mara button.
- Quest givers (quests.sk): stand where the NPC goes, facing the way it should look, and run `/dquest add contracts Scrap Yard` (the place's name; the NPC is "Scrap Yard Boss"). Jobs and lockpicks only work next to one, so every server with contracts needs at least one. A safe zone around it is best (players in its menu can't be shot there); give that zone `/rg flag <id> passthrough allow` and `/rg flag <id> weapon-shoot deny` like safe_spawn, or WorldGuard cancels the click on the NPC. An NPC in the uploaded world whose giver has no record (the addat lines number them anew) is removed within 30 s. Built locally: `/dquest dump` prints the `dquest addat` lines (also in `plugins/Skript/logs/quests.log`) to run on Minehut.
- Car-theft contracts (contracts.sk): car spots where a stolen car waits, `/dcontract spot add` standing on open, flat street facing the way the car should point (not in a heist or a safe zone; a 3x3x2 clear space), and chop shops, `/dcontract chop add` (the car counts as delivered within 6 blocks). Several of each around the city, every car spot at least 50 blocks from every chop shop (closer ones are refused). Built locally: `/dcontract dump` prints `dcontract spot|chop addat x y z yaw` lines (also in `plugins/Skript/logs/contracts.log`) to run on Minehut. Without spots the job offers say "No car for this job right now".
- Vic the Fence (fence.sk): `/dquest add fence Pawn Shop` where the Pawn Shop is (a safe zone with `passthrough allow` and `weapon-shoot deny`). His arc starts for players at level 3; his weekly Wanted List rolls by itself every Thursday. His car order needs a contract giver, car spots and chop shops on the map.
- Contact jobs (jobs.sk): nothing to place: Mara (the Safehouse) and the Scrap Yard Boss give them. Their boards open by themselves (the Boss's after a player's first delivered car job, Mara's when her story is done).
- Hit contracts (hits.sk): the Broker, `/dquest add hits Pool Hall` (a safe zone with `passthrough allow` and `weapon-shoot deny`; bounties are posted there too, so place him before launch or bounties stay postable anywhere). The targets walk streets that staff lay out: walk or drive the streets with `/dhit route on [district]` (a node every 24 blocks; nodes within 6 blocks become crossings), `/dhit route off` when done, or `/dhit node add [district]` one at a time; never within 6 blocks of a heist or a safe zone (refused). Check them with `/dhit node show` and `/dhit node list`. Built locally: `/dhit node dump` prints `dhit node addat` and `dhit node link` lines (also in `plugins/Skript/logs/hits.log`): on Minehut run `/dhit node clear` first (the numbering starts at 1 again), then the lines in order. Without nodes the Broker has nothing ("The Broker has nothing yet"). The targets' look is the default Minecraft skin until skins are set (core.sk `hit::target::<id>::skin-texture` / `skin-signature`, like the cop skin).
- The City Garage (citygarage.sk): one site at every respawn point, one at the Car Dealer, one at the Scrap Yard (PROPOSAL). Per site: a WorldGuard region `safe_garage_<id>` over the lot (`<id>`: 1-16 lowercase letters or digits; `/rg flag <region> passthrough allow` and `weapon-shoot deny`), then standing inside: `/dgaragesite exit add` in each exit lane (a 3x3, 2-high clear spot, facing the way the car drives out), `/dgaragesite return add` where players drive in to park (at least 7 blocks from every exit, or a car taken out parks at once: the command warns), `/dgaragesite bay add` where each parked car shows (facing along the car; up to 8), `/dgaragesite holo` (the bay labels), `/dpoi add garage <Name>` (the locator dot and /gps place) and an attendant `/dshopkeeper add garage`. Built locally: `/dgaragesite dump` prints `exitat`, `returnat`, `bayat` and `holo` lines (also in `plugins/Skript/logs/garage.log`). Until the first site exists cars still come to players anywhere; after it, only at garages (Valet for Elite and Legend). The bays need DonatingPhone (personal views). Don't upload `plugins/DecentHolograms/holograms/gbay_*`: the `bayat` lines number the bays anew and the dump's `dgaragesite holo <site>` line makes their labels (if they were uploaded anyway, `/dh hologram delete` every gbay_ name `/dgaragesite list` doesn't show). A site id is 1-16 lowercase letters or digits (no `_`: `safe_garage_dealer`, not `safe_garage_car_dealer`).
- Crate stands: look at a block inside a safe zone with `passthrough allow` (crates only open in safe zones), `/dcrate place daily|common|uncommon|rare|epic|legendary|supercar|hypercar|hacked|season`. `/crates` only shows odds and keys, so without stands nobody can open a crate. The car crates (supercar, hypercar) want a stand near the Car Dealer.
- Stores (2026-09-27, for new robbers: no escape clock, up to level 9, closed when cleaned out, reopen after 10 minutes): 2-3 near spawn and the base. Like any heist (the steps above) but `/dheist create <id> 0`; owner, 2026-09-28: "all you have to do is rob the cash register": a register on the counter and its till, `/dloot add <id> pile <the counter block's corners> value=1500-2400 style=register` (quick bills in the register; the cash stack's art), maybe a second one; safes and vault doors are refused; no traps needed. `/dheist dump` makes the lines as usual.
- A new robber's first steps (2026-09-27): Mara (the Safehouse), a contract giver with at least one car spot and a chop shop (the first car job pays for the bag), a Bag Shop, a Gun Shop (the knife), a store or a difficulty-1 heist, and the base, all a short walk from spawn. There's no spawn lock any more.
- NPC skins: skins.sk carries the signed skins; once the shopkeepers and quest givers stand, run `/dskins respawn` so they come back wearing them (`/dskins` lists which exist).
- Points of interest (the locator bar's dots): locally `/dpoi dump` prints a `/minecraft:tp` and a `/dpoi add` line per POI; on Minehut run each pair (the add uses where you stand). Heist dots come by themselves once the heists exist.
- The spawn: EssentialsX `/setspawn`.
- A wall map at the base (optional, after the city scan): stand in front of a wall at least as big as the map (e.g. 3 wide, 2 tall), look at its bottom-left block and run `/dphone wall create base 3 2`: invisible glow frames with the whole city, every place named and "You are here". `/dphone wall remove base` takes it down; `/dphone wall list` shows if a frame is missing and `/dphone wall repair base` hangs it again. Made on the local server, it travels with the world plus `plugins/DonatingPhone/walls.yml`.
- Districts (districts.sk, 2026-09-29): wand two corners, `//expand vert` (a district must reach from under the streets to above the roofs, or players standing on the street are outside it), then `/rg define district_<id>` over each part of the city (e.g. `district_downtown`), `/rg flag district_<id> passthrough allow`, then `/ddistrict name <id> <Name>` (else the id made readable: "old_town" -> "Old Town"). `/ddistrict dump` prints the name lines for Minehut (the regions travel with the world). Entering one shows its name; the sidebar's Area line follows. Copy `plugins/TAB/config.yml` (the Area line).
- The phone's city map: stand anywhere and run `/dphone city scan <x1> <z1> <x2> <z2>` over the whole city (corners in blocks; scale 1 by default: add 0 for 1 block a pixel, 2 for 4 blocks), wait for "CITY done" (about 15-20 chunks a second), then `/dphone roads scan` for the GPS. Or scan on the local server and upload `plugins/DonatingPhone/city.bin`, `city.yml` and `roads.bin`. (The older way, locked city maps in `city-maps` of `plugins/DonatingPhone/config.yml` and `/dphone`, still works: `/dphone city use maps`.) Every POI (/dpoi), open heist and quest giver then shows on the phones as a colored banner by itself (nav.sk; `places.enabled` / `places.held` in that config turn it off or off on the held phone).

## 6. Check it

- `/dsetup` (staff, setup.sk): the launch checklist. Every line with ✘ is something players will miss (a heist not enabled, no base zone to sell loot, no chop shop, a crate with no stand...), each with the command that fixes it; "!" lines are worth a look. It must not warn about the test helpers (zz-*.sk): if it does, delete them from `plugins/Skript/scripts/` and `/sk reload scripts`.
- The console after start: `[Skript] All scripts loaded without errors.`, Citizens loaded its libraries (it downloads a few from Maven Central on the first start), Tebex "Connected".
- Join with a fresh account (or `/dtutorial <you> reset`): $1,000, the welcome title and Mara's first mission on the GPS; her lockpick and the first car job at the Scrap Yard; no free Gym Bag.
- Nametags: another player behind a wall has no name over their head; in the open it shows.
- Open `/crates`, a crate stand, `/cosmetics`, `/heists`, the phone (F with the phone), the gun shop (the Items tab: Bandage, Throwing Knife, Energy Drink, the Grappler), `/help`, `/help commands`, `/adminhelp`.
- The car mods: drive a tuned car (`/dphone carstat <plate>` shows its top speed, acceleration and steering while it's driven; DonatingPhone reaches MTVehicles for it).
- A Tebex test purchase (Tebex's test mode or a $0 package): the rank or keys arrive.
- Send Minehut the latest MONETIZATION.md (or the "Donating Paid Perks" page): it now lists Valet (Elite and Legend take their car out anywhere). The car crates' keys are game money only (owner, 2026-09-28): don't make Tebex packages for them.
- The sidebar (TAB config.yml) shows the mission, jobs (`%donating_jobs%`) and hit (`%donating_hit%`) lines: upload TAB's config.yml again.
- `/hits` at the Broker, `/jobs`, a garage: `/garage` inside a site, a bay's car, driving into a return lane (PARKED).
