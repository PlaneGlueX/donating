# Handoff 2026-10-21 (late night): the city clock, store clerks and the police assaults (cloud → PC)

The owner's two requests, built by a cloud session on `claude/dreamy-mendel-ouutfb` (PR #4 into `claude/jailbreak-map`),
on top of PLAYTEST-NOTES.md (do that one first or together: the same restart). **Nothing here has run on a server or in a
client.** The Skript was never parsed by Skript. PLAYTEST 249-254; CLAUDE.md "The city clock" and "Store clerks and the
police assaults".

| Request | Done here | PLAYTEST |
|---|---|---|
| "a 12 hour clock system for the server (1min = 1sec irl)", the day/night cycle following it | clock.sk (new), core.sk clock::*, ui.sk (the phone's clock), TAB config.yml (the sidebar's first line) | 249 |
| "missions that take days like the hitlist mission will now follow the new clock system" | progress.sk progWeek = the game week; hits.sk (windows in game seconds, 5-hour windows, the streak gap), fence.sk | 250 |
| Payday stores: "hit the employee thats standing at the register to activate the heist ... run around the store to grab things to throw at you" | clerk.sk (new), loot.sk ("shut" registers), heists.sk hooks, death.sk / combat-log.sk ("clerk"), the clerk skin, the town's two stores (donut.js, gas.js, town.js, SETUP.md) | 251 |
| "implement some aspects of the dynamic police waves" | heists.sk (warning, assault, break), cops.sk (pool, cap, escalation, heavies), hud.sk (the assault meter), core.sk alarm::* and a store's difficulty::0::alarm::* | 252 |
| "for low tier stores like donut shop and grocery store, no need for police" (after the above) | a per-heist `police` setting (core.sk `difficulty::<d>::police`: stores false, 1-4 true; `/dheist set <id> police`), heists.sk heistPolice (no alarm at all while off), clerk.sk (no panic button, no "I called the cops!"), setup.sk, tabcomplete.sk, help.sk, Mara's c1_rob brief, SETUP.md | 254 |

Ran offline: `tools/progress-sim.js` (hits now 13% of a median player's money over 60 h, were 1%; level 149 at 60 h,
was 151), `make-keepers-skins.js` (the clerk; the other six PNGs byte-identical), `town.js setup` (the clerk lines), every
new and edited bot scenario loads in Node.

## The order on the PC

1. With PLAYTEST-NOTES.md's steps (one restart). `Playtest.bat stop`.
2. **The clerk skin**: `tools\node\node.exe tools\skins\make-keepers-skins.js` (writes `server\plugins\Citizens\skins\clerk.png`,
   which git doesn't carry). Later, with the server running: `tools\node\node.exe tools\sign-skins.js clerk` (it writes the
   signed values into skins.sk), then `/dclerk <store> spawn` (or the stores reopening). Until then clerks wear the Bag Shop
   keeper.
3. **Start**: `Playtest.bat start`. New scripts: `clock.sk`, `clerk.sk`. Edited: `core.sk`, `heists.sk`, `cops.sk`,
   `hud.sk`, `loot.sk`, `hits.sk`, `fence.sk`, `progress.sk`, `ui.sk`, `death.sk`, `combat-log.sk`, `setup.sk`, `help.sk`,
   `tabcomplete.sk`, `zz-testkit.sk`; TAB `config.yml`. Watch for:
   - clock.sk: `execute in minecraft:overworld run time rate 0.833333` and `... time set <n>` (the 26.1.2 command tree has
     both; Paper keeps them per world). `server\plugins\Skript\logs\clock.log` gets a `rate` and a `set` line per world;
     "rate didn't take" means the world kept running at vanilla speed. A Multiverse world's dimension is `minecraft:<name>`
     (core.sk worldDim): `minecraft:jailbreak`.
   - clerk.sk: `shoot a snowball from {_e}`, `set item of {_pr}`, `make {_e} look at {_t}'s eyes`, `on bed enter`.
   - heists.sk / cops.sk: `heistAlarmNum` returns an object used in sums, `min()` and `max()` (cfg() is used the same way
     elsewhere).
4. **The clock**: `/dclock info` (each world's time next to the clock's), watch the sun for a minute (smooth, at the clock's
   pace), the sidebar's first line, `/clock`.
5. **The town's stores** (jailbreak world, the stores disabled): the `dclerk donut ...` and `dclerk gas ...` lines (SETUP.md
   A5, also printed by `town.js setup`), `dheist enable donut` / `gas`, `/dclerk list`, `/dheist info donut` says
   `police=false` (stores have no police now: no `/dcops` for them). `/dsetup heists`.
6. **Bots**: `clock` (7), `clerk` (24: no police by default, then `police true` for the panic button and the assault),
   `assault` (11) new; `cops` (held in one long assault), `heists` and `hud` (the
   new stage and bar), `progress` (the game week), then `hits` (nobody else online), `fence`, `store` (no clerk: unchanged),
   `setup`, `tabcomplete`, `boards`, `menus`, `story`, `jobs`.
7. **The client** (yours): PLAYTEST 249-254: the sky and the sidebar clock, robbing the Donut Shop and the Gas Station
   (hit the clerk, dodge, no cops), an advanced heist's assaults and breaks.

## Notes

- The week (hits, Vic's list, the heists' weekly heat) turns every 168 real minutes now, so the first upload ends any hit
  contract running then (the old real week number is far from the game week number).
- `/dclock set <time>` moves the clock forward (and may turn the week); `/dclock offset <s>` sets it exactly. The offset
  is saved (`{clock::offset}`).
- A store with no clerk spot keeps the old behaviour (the register open, no police): `bots\run.js store` still tests that.
- "Grocery store" was read as the gas station's 24/7 mart (the only other store on the map), so both town stores have
  no police: every store (difficulty 0) defaults to none. If the owner wants the gas station's police back:
  `/dheist set gas police true` (then a `/dcops gas add` a street corner away).
- The clerk is never hurt: every hit on it is cancelled (clerk.sk, priority lowest); Sentinel isn't set `invincible` on
  purpose (it would cancel first and the hit would never start the robbery).

## The whole PR on the PC: one to-do list

PR #4 holds three hand-offs (README.md: the town's buildings, fuel and bikes, already run locally; PLAYTEST-NOTES.md:
the prison notes; this file: the clock, the clerks, the assaults and no store police). In one go, with one restart:

1. `git fetch` and check out `claude/dreamy-mendel-ouutfb` (or merge PR #4 into `claude/jailbreak-map`). `Playtest.bat stop`.
2. **Plugin**: `tools\build-plugin.ps1` (PathWand, CarCam, Paths, PhonePlugin: PLAYTEST-NOTES.md step 2).
3. **Art and pack**: `tools\node\node.exe tools\skins\make-keepers-skins.js` (the clerk PNG into Citizens' skins), then
   `tools\node\node.exe tools\build-pack.js` (the fonts, filled_map.json).
4. **Start**: `Playtest.bat start`; fix the start report until clean (new scripts: clock.sk, clerk.sk; the edited list is
   in both hand-offs). Then `tools\node\node.exe tools\sign-skins.js clerk` and `/dclerk <store> spawn`.
5. **The world** (the owner's OK): the prison's `jail.js paste --box ...`, `jail.js labels`, `town.js labels`
   (PLAYTEST-NOTES.md step 5), the jail and town GPS lines and `make-jail-gps-paths.js --check` (step 6).
6. **The stores**: the `dclerk donut|gas setat/shelfat` lines (SETUP.md A5), `dheist enable donut` / `gas`, `/dsetup heists`.
7. **The clock**: `/dclock info`, watch the sun for a minute, the sidebar's first line, `/clock`; clock.log has a `rate`
   and a `set` line per world (no "rate didn't take").
8. **Bots**, each on its own, nobody else online:
   - new: `clock`, `clerk`, `assault`;
   - the prison (switched on per run): `prison-cops`, `prison-rules`, `prison-escape`, `prison-course`, `prison-missions`,
     `prison-respawn`, `prison-exits`;
   - changed: `cops`, `heists`, `hud`, `progress`, `hits`, `fence`, `store`, `abuse`, `boards`, `messages`, `garage`,
     `carcam`, `gpspaths`, `fuel`, `bikes`, `menus`, `tabcomplete`, `story`, `jobs`, `shop`, `setup`, `cars`, `citygarage`;
   - then `bots\run-all.js` for everything else, and the counts into CLAUDE.md.
9. **1 GB load test with 30 guards** (PLAYTEST-NOTES.md step 8): numbers into CLAUDE.md's Local setup and PLAYTEST 232.
10. **The owner's client**: PLAYTEST 224 (the town's buildings), 232-248 (the prison notes, the city items), 249-254
    (the clock, the stores with no cops, the assaults in an advanced heist).
11. Update CLAUDE.md's Status, PLAYTEST's results, commit, push, and mark PR #4 ready once it's green.
