# Donating: heist server (context for Claude Code)

This file loads in every session and every subagent, so it stays under 8 KB: only what applies to all work. Everything else is in `docs/` by topic (the index below). Read the file for the area you touch, or Grep it, never all of them. When a decision changes, update that topic file; change this one only for a rule every session needs. Older text saying "Verified notes", "CLAUDE.md" or naming a section means the heading of that name under docs/: `Grep "^### Loot" docs/`.

## What this is
- A Minecraft Java server called **Donating**, hosted on **Minehut (free plan)**. Fresh wipe with a new map.
- A GTA / Roblox Jailbreak–style game where everyone plays a robber. The main challenge is getting through heists without dying to traps (and to NPC cops in advanced heists).
- Built with **free plugins + Skript only**. Don't write a Java plugin unless the owner agrees; tell them if something truly needs one (DonatingPhone in `plugin\` is the approved exception).
- Budget: $0 for now. The owner wants the server to be fun enough that people play regularly and eventually support it (cosmetics only; see Monetization rules in docs/design.md).

## Working with the owner
- Keep answers concise and give a clear recommendation, not a list of maybes.
- For key decisions, give a cautious option and a realistic option.
- Use a short analogy when explaining a new concept.
- Write math as equations (e.g. L = min(B × p, C)), not in words.
- The owner does in-game playtests and also allows Claude to control the PC for Minecraft playtests (docs/setup.md, Testing).

## Platform facts
- **Paper 26.1.2**, Java 25 (portable in `tools\jdk25`). ViaVersion lets 26.2 and 26.3 clients join. WeaponMechanics, MTVehicles, DecentHolograms, CoreProtect and Skript hold it at 26.1.2.
- Minehut free plan: 1 GB RAM, 10 player slots, sleeps when empty, no extra ports, no SFTP, one resource pack (set in its dashboard), jars uploaded through the File Manager. The local test server runs with 2 GB. No plugin that needs its own port.

## Rules that always apply
- Never type passwords or sign in for the owner; never enter API keys or secrets (the owner types the Tebex key). Don't read or share `Desktop\APIs.txt`. Don't sign in to OneDrive.
- Never share `server\logs\latest.log`: it holds the Tebex key. Grepping it locally is fine; never print a tebex line.
- Never port-forward RCON. Never copy local-only settings (offline mode, RCON) to Minehut. Never upload `zz-*.sk` (zz-tab.sk too) or ViaBackwards.
- Identify the owner Explosde by UUID only (Mojang 645aeff2-..., local offline bbcbfbe4-58b2-312c-8cc8-91ce902da8ee): offline mode lets anyone use any name.
- Never use "Pixel Gun" in names. Skript never sets item_model on real guns.
- Never run `jcmd -l` or read javaw's command line (a client's login token). `jcmd <pid from server\server.pid>` is fine.
- Spark: never `--timeout` (it uploads); `spark profiler stop --save-to-file`.
- Build DonatingPhone.jar only while the server is stopped (a running plugin's jar must not change).
- A Skript reload freezes the server 0.8-9 s: never during play. Never reload core.sk while the owner is in the prison (`/zzcfgreload` keeps the prison switch).
- Run `tools\backup.ps1` before a paste, an upgrade or anything risky. Player data goes only to the PRIVATE repo PlaneGlueX/donating-backups through it, never to the code repo.
- Downloads need the owner's OK. Claude Code add-ons get vetted first (source, issues, security history). The Workflow tool needs the owner's opt-in.
- Run bots one at a time. EULA: ask the owner.
- Git: commit or push only when the owner asks; stage files by name; leave out `STORE IMAGES/`, `logs/`, `${m2}`, `server/plugins/WorldGuard/config.yml`, `bots/results`; `server.properties` and the Tebex config never; no force-push.
- Git Bash `sed -i` strips CRLF and PLAYTEST.md has mixed line ends: edit it with node.
- New work: update its docs/ topic and add checks to PLAYTEST.md; a new plugin, config or setup command goes in DEPLOY.md.
- Builds are practical, not roleplay (owner, 2026-10-21): build for how players use a place.

## Skript in short (full list: docs/skript.md, read it before writing Skript)
- Settings live in `loadSettings()` in core.sk as `{-cfg::*}`; options don't cross files.
- `#` starts a comment even inside a variable name: build such keys in a string first.
- An unset value makes `is` false and `is not` true, on either side: test `is set` first when it matters.
- `loop-number-2` is ambiguous: use `loop-value-2`. `set {x::*}` wipes named children. A condition on its own line ends the section (a whole function that returns: use nested ifs).
- A new `every X:` runs for the server's whole life: exit early when nobody qualifies, don't loop everything every tick, and check its cost with `/dphone prof` (docs/performance.md).

## Commands
- `Playtest.bat play|start [1G|2G]|stop|restart|status|pack|log|cmd "<command>"|launcher`; `tools\rcon.ps1 "cmd" "cmd2"` for console commands.
- PowerShell tools run as `powershell -NoProfile -ExecutionPolicy Bypass -File tools\<x>.ps1`: start-server (`-Memory 1G`), stop-server, build-plugin, backup (`-NoUpload`), fetch.
- Bots: `tools\node\node.exe bots\run.js <scenario> [args]` prints the count and the failures; the whole report is `bots\results\<scenario>.last.json` (`--json` prints it). Scenarios: `bots\scenarios\`.
- Pack: `tools\node\node.exe tools\build-pack.js`; art and generators are in docs/setup.md (Local setup).
- Lag: `/dphone prof start|stop` costs every repeating task by script and line; `/lag`, `/lag fix` in game (docs/performance.md).

## Where things are
| File | Size | What's in it |
|---|---|---|
| docs/setup.md | 32K | Local setup, every tool, backups, Workflow, bots, computer-use playtests, cloud sessions, add-ons |
| docs/design.md | 24K | The owner's decisions: heists, bag, HUD, weapons and inventory, death, PvP, bounties, cars; default rules; monetization |
| docs/heists.md | 52K | heists.sk, stores, clerks, police assaults, traps, loot, the bag, duffels, boss bar, cops |
| docs/prison.md | 53K | The map, the prison's design and build, guards, the course, voice lines |
| docs/cars.md | 59K | MTVehicles, garage, wraps, smoothing and the chase camera, contracts, City Garage, fuel, bikes |
| docs/guns.md | 55K | WeaponMechanics, gun models and animation, skins, melee, consumables, the Grappler |
| docs/phone.md | 43K | DonatingPhone's map, phone menus, messages, help, tab completion |
| docs/gps.md | 23K | Locator bar, POIs, the GPS and its paths, personal views |
| docs/economy.md | 44K | Shops, levels, ranks, boosters, crates, cosmetics, seasons, Tebex, trading |
| docs/quests.md | 40K | The clock, story chains, contact jobs, hits, quest givers, tutorial, NPC skins, the launch checklist, town buildings |
| docs/skript.md | 28K | Skript, SkBee, Paper and Minecraft gotchas, fixed-inventory rules, build order |
| docs/plugins.md | 10K | Which plugins, versions, config notes |
| docs/performance.md | 3K | Measuring lag, what was found, rules for repeating scripts |
| docs/status.md | 45K | The log of past sessions, newest first; read its first lines to pick up work |
| DEPLOY.md, MONETIZATION.md, GUNS-PLAN.md | 44K, 35K, 16K | The Minehut upload list, pricing, the gun plan |
| PLAYTEST.md | 270K | Every check and result: Grep it or append, never read it whole |

Scripts are in `server\plugins\Skript\scripts\` (2.1 MB; core.sk alone 190 KB): Grep the function, read that part. `/graphify` builds a knowledge graph on demand, scripts included (`.sk` support: tools/graphify-skript, docs/setup.md).
