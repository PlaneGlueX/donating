# Deploying Donating to Minehut

The exact steps to move the local test server to Minehut (free plan). Local-only settings never go: the local server runs in offline mode with RCON for bots and tests, Minehut runs in online mode behind its proxy.

## 1. Before you start

- Decide the open numbers (PROPOSALs in `server/plugins/Skript/scripts/core.sk`): money, bag sizes, prices, levels, crate contents, cop strength. They can change later, but players notice.
- Build the city (or at least spawn, the base, one gun shop and one heist) in the local world first: the world is uploaded as a folder.
- Build the phone plugin: `powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-plugin.ps1` (makes `server\plugins\DonatingPhone.jar`).
- Build the resource pack: `tools\node\node.exe tools\make-item-art.js`, `tools\node\node.exe tools\make-phone-art.js`, then `tools\node\node.exe tools\build-pack.js` (makes `extras\packs\Donating-pack.zip`).

## 2. Minehut dashboard

- Server type **Paper**, version **1.21.11**.
- **Resource pack**: Minehut takes a URL. Upload `Donating-pack.zip` somewhere with a direct download link (a public file host). It includes WeaponMechanics' official pack, which its README allows merging and hosting for your own players, but never selling or publishing as a pack. Tick "require" so every player gets the guns, bags, phone and tracers.
- **MOTD** (the server list text): the proposal in CLAUDE.md, or your own.
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
| DonatingPhone (ours) | `DonatingPhone.jar` |

Not spark (Paper has it built in). MTVehicles only once cars are built.

Start the server once so every plugin makes its folders, then stop it and upload the configs.

## 4. Upload configs and scripts

| Local file (under `server/`) | Minehut path |
|---|---|
| `plugins/Skript/config.sk` | same |
| `plugins/Skript/scripts/*.sk` **except every `zz-*.sk`** (test helpers: they give items and money) | same |
| `plugins/Essentials/config.yml` | same |
| `plugins/TAB/config.yml`, `plugins/TAB/groups.yml` | same |
| `plugins/LPC/config.yml` | same |
| `plugins/WeaponMechanics/config.yml` and the folders `weapons/`, `ammos/`, `projectiles/` | same |
| `plugins/WorldGuard/config.yml` | same |
| `bukkit.yml`, `spigot.yml` (only if you keep the End off: `allow-end: false`) | server root |
| The world folder (`world/`, with `world/generated/donating/structures/` = the heist rooms, `world/data/map_*.dat` = the city map) and `plugins/WorldGuard/worlds/world/regions.yml` (safe zones, heist regions) | server root / same |
| `plugins/DecentHolograms/holograms/` (heist and crate stand holograms) | same |

Never upload: `server.properties`, `plugins/Skript/variables.csv` (full of test data), `plugins/Tebex/config.yml` (holds the local secret key), `plugins/LuckPerms/` data, CoreProtect's database, `logs/`.

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
lp user Explosde parent add owner
lp group default permission set weaponmechanics.use.* true
lp group default permission set donating.inventory.bypass false
dranks setup
```
(Staff you add later: a group with `donating.staff` and `donating.inventory.bypass` true, never `donating.store`: that one grants paid perks.)

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
- Safe zones: WorldEdit wand (a structure void), `/rg define safe_spawn`, `/rg flag safe_spawn passthrough allow`, `/rg flag safe_spawn weapon-shoot deny`; the base is a safe zone whose id starts with `safe_base` (loot sells there).
- Shopkeepers: `/dshopkeeper add gun|gear|bag|tools`.
- Crate stands (optional): look at a block, `/dcrate place daily|common|uncommon|rare|epic|legendary`.
- The spawn: EssentialsX `/setspawn`.
- The phone's city map: set `city-maps` in `plugins/DonatingPhone/config.yml`, then `/dphone`.

## 6. Check it

- The console after start: `[Skript] All scripts loaded without errors.`, Citizens loaded its libraries (it downloads a few from Maven Central on the first start), Tebex "Connected".
- Join, open `/crates`, `/heists`, the phone (F with the phone), the gun shop.
- A Tebex test purchase (Tebex's test mode or a $0 package): the rank or keys arrive.
- Send Minehut the latest MONETIZATION.md (or the "Donating Paid Perks" page).
