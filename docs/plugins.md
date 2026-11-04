# Plugins

Moved word for word from CLAUDE.md on 2026-11-03. Grep a heading, then read that part: don't read the whole file.

## Plugins
Exact files, URLs and hashes are in `tools\downloads.json`. Everything is from the author's own source.
Installed and verified loading (2026-09-24):
- Paper 26.1.2 build 74 (the last 26.1.2 build; 2026-10-05, from Paper 1.21.11 build 132), on Java 25 (Temurin 25.0.4.1, `tools\jdk25`)
- ViaVersion 5.12.0: https://modrinth.com/plugin/viaversion (supports 26.1–26.3 clients; keep it updated for new clients; ViaBackwards not needed)
- LuckPerms 5.5.85: https://luckperms.net/download
- LPC 3.7.2: official Modrinth mirror "lpc-free" by the SpigotMC author PM2 (not "lpc-chat", a different author)
- Vault 1.7.3: https://github.com/MilkBowl/Vault/releases (same author as SpigotMC)
- EssentialsX 2.22.0 + EssentialsX Spawn (not EssentialsX Chat): https://github.com/EssentialsX/Essentials/releases
- WorldEdit 7.4.5: https://modrinth.com/plugin/worldedit (same file as BukkitDev; 26.1)
- WorldGuard **7.0.18** (the 26.1 build; 7.0.16 was the 1.21.11 one)
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
- CoreProtect CE 24.1: https://modrinth.com/plugin/coreprotect (the author's official free build; GitHub releases have no jars). `error-reporting: false` in its config.yml (it would send error reports to its author).
- ViaBackwards 5.12.0 (LOCAL ONLY, 2026-10-05): lets the 1.21.11 Mineflayer bots join the 26.1.2 server. Never upload it.
- spark: **don't install**. Paper 1.21+ bundles it and ignores the plugin jar.
- DonatingPhone 1.0: our own code (`plugin\`, owner-approved 2026-09-24); see Phone plugin.
- Citizens 2.0.43 build 4250 and Sentinel 2.9.4-SNAPSHOT build 534 (installed 2026-09-26 from `extras\phase3\`, SHA-256 in tools\downloads.json): the cops (cops.sk). Upload both jars to Minehut.
- Tebex 2.4.6 (`tebex-bukkit-2.4.6.jar`, github.com/tebexio/Tebex-Minecraft, SHA-256 checked; downloaded 2026-09-26 with the owner's OK): the store. It loads at the next restart and does nothing until the owner types `tebex secret <key>` in the console. See Tebex (the store) and MONETIZATION.md.

Owner downloads by hand (SpigotMC only):
- MTVehicles 2.5.9: https://www.spigotmc.org/resources/mtvehicles-vehicle-plugin-free-downloadable.80910/ (2.5.8 on GitHub stops at 1.21.10). The owner put `MTVehicles.jar` (2.5.9) in `server\plugins\` on 2026-09-26 (it loads at the next restart; not uploaded to Minehut until cars are built). Pack already downloaded: `extras\packs\MTVehicles_Pack_v0.2.3_1.21.4.zip`.
- KoyaRobbery: dropped (owner, 2026-09-27): loot.sk rebuilt robbery in Skript, and a July 2026 review says it doesn't work on 1.21.11.

Phase 3 (advanced heists): installed (see above); the jars also stay in `extras\phase3\` because CI builds can be deleted:
- Citizens **build 4250** (2.0.43): it has the 26.1 module (v26_1_R1) and loads on 26.1.2 (b4258 is the fallback). Never use lastSuccessfulBuild.
- Sentinel 2.9.4-SNAPSHOT build 534: https://ci.citizensnpcs.co/job/Sentinel/ (linked from the GitHub README)

Config notes (applied locally 2026-09-24; copy these files to Minehut):
- EssentialsX: `auto-afk: -1` and AFK broadcasts off (Skript handles AFK). Keep `custom-join-message: "none"` and `custom-quit-message: "none"` (an empty string also hides Skript's messages). `min-money: 0`. No EssentialsX Chat (LPC formats chat). Also `newbies: announce-format: ''` and `kit: ''` (players start with nothing). `disabled-commands: afk` (afk.sk owns /afk; added in the cloud session). chat-extras.sk replaces EssentialsX's `/broadcast` and `/bc`.
- LPC: the default format `{prefix}{name}%donating_title%&r: {message}` and group-formats for owner and the paid ranks (`{prefix}&r &f{name}%donating_title%&r: {message}`); `%donating_title%` is the crate title (cosmetics.sk).
- TAB (tab list designed 2026-09-25): header = the DONATING logo glyph + "Rob it. Run it. Keep it."; names = rank prefix (`%condition:rankprefix%`: the LuckPerms prefix + a space) + the name (green for passive players) + " AFK"; the right-hand column = the bounty; sorted staff first, then biggest bounty, then A-Z; footer = your balance and bounty, your robber level and XP to the next (2026-09-26), online/max, ping, /help /heists /level /bounty. Paid ranks (ranks.sk) sort above players without one. Its placeholders come from placeholders.sk (an empty result returns "&r": PlaceholderAPI would show the raw %placeholder% for nothing). A result of "" (set, empty) makes TAB drop the sidebar line instead of leaving it blank (TAB 6.2's line removes its score when the text is empty; skript-placeholders passes "" through; checked 2026-10-20): `%donating_jobs%` and `%donating_hit%` are "" for a prisoner (`{-ph::jailed::<p>}`, copied once a second; owner: "dont show /jobs in the leaderboard until the player escapes from the jail"). zzpapi shows both "" and the raw placeholder as <none>; prisonlib's `papi` uses `/papi parse <p> [%x%]`, which shows "" as "[]". TAB joins header/footer lines into one text, so a strikethrough line ends with &r. TAB 6 has no %maxplayers% (`%donating_max_players%`). `groups.yml` is tracked now too. The heist board (sidebar) uses a display condition (`%donating_in_heist%=yes`, listed first). The main board is compact since 2026-10-21 (the owner: "more compact, or wrap long lines"): no blank lines, short labels, and the season, mission, jobs and hit lines wrapped in two at 22 visible characters (placeholders.sk phWrap, `%donating_<season|mission|jobs|hit>_a%` and `_b`: the second line in the first's last colour, cut with "…" past 22; "" drops a line; the full-line placeholders stay for the tests). Belowname and TAB's boss bar stay off (belowname is broken on 26.1 clients; Skript runs the boss bar).
- WeaponMechanics `config.yml`: `Resource_Pack_Download.Enabled: false` and `Automatically_Send_To_Player: false`.
- WeaponMechanics weapons, ammo and projectiles (tracked in git): every gun we sell has `Reload.Ammo.Ammos` (`ammos\Donating_Ammos.yml`: Donating_Light, Donating_Shells, Donating_Rifle), `Info.Cancel.Swap_Hands: true` and a Donating bullet (`projectiles\Donating_Projectiles.yml`); the knife and the Stim cancel Q and F too. Upload `plugins/WeaponMechanics/weapons/`, `ammos/` and `projectiles/` to Minehut. Default players need `essentials.sell` / `essentials.worth` false (EssentialsX's worth.yml prices nuggets and feathers, so /sell would turn ammo and guns into money) and no WeaponMechanics command permissions.
- Safe zones: also `/rg flag <id> weapon-shoot deny` (WeaponMechanics' WorldGuard flag): no gunfire in the base, and no stray shot when someone right-clicks a shopkeeper holding a gun. Shopkeepers go inside safe zones, with a gun shop at every respawn point.
- DonatingPhone: build `server\plugins\DonatingPhone.jar` (`tools\build-plugin.ps1`), upload it to `plugins/` and restart once: it creates `plugins/DonatingPhone/config.yml` and 16 phone maps in `world/data`. Then set `city-maps` (it ships empty: phones stay blank until the city map exists; the plugin refuses its own phone maps as city maps) and run `/dphone`. (The earlier `donating` datapack is gone; don't upload it.) Local test city: maps [[16, 17], [18, 19]] (2x2 scale-0 maps over x -64..191, z -704..-449, remade 2026-10-26; [[0, 20], [23, 24]] before the world was lost).
- WorldGuard `config.yml`: `regions: wand: minecraft:structure_void` (default leather is the bag's item: staff right-clicking with the bag in the offhand got "No defined regions here!"). Copy it to Minehut.
- City GPS map (when the city exists): `/dphone city scan <x1> <z1> <x2> <z2> [scale]` over the city (see "The city scan" in Phone plugin), then `/dphone roads scan`; POIs label it (places). The old way still works (`/dphone city use maps`): make a map covering the city (scale 2-3), fill it in by flying over the city holding it, lock it in a cartography table (for a big city, several maps of the same scale side by side, each locked), put named banners on it (a staff account with the inventory bypass, holding a plain copy of the map), then set `city-maps` in `plugins\DonatingPhone\config.yml` (`[[id]]`, or rows of ids) and run `/dphone`; the `world\data\minecraft\maps\<id>.dat` files go to Minehut with the world.
- Text colors (owner, 2026-09-26: dark gray was hard to read): no `&8` (dark gray) for text in chat, titles or item lore; use `&7`. `&8` stays only for chest menu titles (drawn on the menu's light background), filler glass panes, a progress bar's empty part and the chat prefix's "»".
- Skript `config.sk`: default database `pattern: (?!-).*` so `{-...}` variables stay in memory only; `backups to keep: 24`.
- EssentialsX `starting-balance: 0` stays: join-quit.sk gives `cfg("money::start")` on the first join, so the number lives in core.sk with the other money values.
- Heists on Minehut: the regions (WorldGuard `worlds/world/regions.yml`) and room snapshots (`world/generated/donating/structure/`) travel with the world, the holograms in `plugins/DecentHolograms/holograms/`. The heist definitions are saved Skript variables: run the lines `/dheist dump <id>` prints (also in `plugins/Skript/logs/heists.log`) on Minehut instead of uploading variables.csv (it's full of test data).
- Server-list text (MOTD): set it in the Minehut dashboard. Minehut's proxy answers server-list pings, and the server is asleep when nobody's on, so a Skript ping handler would never be seen. Owner, 2026-09-28: "MOTD c": line 1 `&6&lDONATING &7| &fA city of heists`, line 2 `&aStart with nothing. &6Leave with everything.` (DEPLOY.md).
