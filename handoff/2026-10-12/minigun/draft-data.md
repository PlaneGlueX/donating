<!-- wf_7a4941fe-721 draft:data: an agent's final report, kept for the cloud session -->

The data track is finished and installed in the repo. Static checks pass. Nothing ran against the server, so none of the bot tests have been run yet.

**Agent skills plugin:** I used addyosmani/agent-skills' `planning-and-task-breakdown`. The skills in `.claude/skills/` are set to owner-invoke only, so the Skill tool can't run them; I followed the method by hand. The plan is at `...\scratchpad\remake\work\minigun\build\data\plan.md` (all 9 tasks ticked).

**Repo files changed**
- `server\plugins\WeaponMechanics\weapons\assault_rifles\FN_FAL.yml`: rewritten to spec section 6 in MG34.yml's block style with the Donating comments.
  - Hand Minigun, skins 6/+1000/+2000/+3000, `donating_rifle_bullet`, Donating_Rifle ammo, 100 rounds, 90-tick reload with the sound delays 13/54/67/74.
  - 16/s, 3.4 damage, dropoff 10 −0.6 / 25 −1.2 / 50 −1.9, Armor_Damage 2, movement_speed −0.03, Swap_Hands and Drop_Item cancelled.
  - Lore sheet 52.2. No Selective_Fire, Delay_Between_Shots, Firearm_Action, Dual_Wielding, Cosmetics, Trail or Show_Time.
- `server\plugins\Skript\scripts\core.sk`: `"FN_FAL"` added after MG34 in shop::weapons; `wpn::FN_FAL::` name "Hand Minigun", kind "Minigun", price 1500000, ammo rifle, mag 100, model 6, level 125; `ammo::rifle::max` 300 → 400.
- `server\plugins\DonatingPhone\config.yml` (live and gitignored): the exact interface FN_FAL line.
- `tools\make-item-art.js`: GUNS `minigun: [6, 1006, 2006, 3006]`.
- `tools\build-pack.js`: OUR_FEATHER_NUMBERS 38 → 42; GUN_SOUND_FILES gets `assault_rifles/FN_FAL.yml`.
- `DEPLOY.md`: `assault_rifles/FN_FAL.yml` added to the weapon files to upload. It turned up in the MG34 grep; a one-line change to the upload list.
- `bots\scenarios\wm-ammo.js`:
  - FN_FAL added to GUNS. Because the minigun has to spin up first, the bag-in-offhand loop holds the trigger for 1.5 s (a click every 100 ms) instead of single clicks.
  - The pack check now expects 42 numbers, and 6 and 1006 join the fire-flash gating check.
  - New check on the barrels: flags 3 and 4 run on the cooldown in first person (default and aimed), the sprint keeps flag 4, the draw is flag 2. Third person, ground, fixed and head never read the cooldown or the held key; the icon stays still.
  - New check that both hands aim with the same translation, plus a sweep check that nothing static sits in the spinning cluster's way.
- `bots\scenarios\wm-damage.js`:
  - A check from the files of all four dropoff bands: 6/8/10/14 hits bare and 18/22/27/40 in the best gear. It also checks the AK-48 is stronger per hit and never slower to a kill, using WeaponMechanics' fire-rate table rows 10 and 16.
  - Live checks with the trigger held: 3.4 bare, 2.8 from 12 blocks (on a second glass platform), and 1.156 in the best gear. Each uses the median of 5 hits, because the target's regen can merge with a hit landing in the same tick.
- `bots\scenarios\gunfx.js`:
  - The status line with `spin=24/30/0.3/5` and `spinup=on`.
  - The draw: its 40-tick clock and flag 2.
  - From cold: no spin state before; held, rate 0, flag 3, the 24-tick clock, the spin-up whine, and no round fired yet.
  - Held 3 s: s = 1, rate 16, flag 0 on, flag 3 off, 30–46 rounds used.
  - On release: flag 4, a 25–30-tick clock, s falling, the whine stopped and the spin-down heard. A quick re-press fires at once. After the stop: none.
  - Q (reload): none, flags 3 and 4 off, the 90-tick reload clock.
- `bots\scenarios\shop.js`: CELL[12] shows "Hand Minigun", $1,500,000 and "Needs level 125"; rifle max reads 400.
- `bots\scenarios\levels.js`: `/levels` lists "125. - 137,877 XP · the Hand Minigun".

**Checks run**
- **YAML:** I parsed FN_FAL.yml and the live config with SnakeYAML 2.2 from `server\libraries`, with duplicate keys refused, via my `YamlCheck.java`. Both came back OK. FN_FAL's key paths match MG34.yml's except no Firearm_Action and a fourth reload sound.
- **Syntax:** `node --check` passes on all 7 JS files I touched.
- **Dropoff bands** (`bands.js`): `mg [3.4,2.8,2.2,1.5]`, hits `6 8 10 14 / 18 22 27 40`. Ticks to kill are minigun `7 9 12 17 22 27 33 49` vs AK-48 `7 9 11 15 21 25 31 41`, so the AK-48 is never slower.
- **Minigun pack checks** (`mgcheck.js`): all pass on the prototype's `final.zip` and on the model track's `build\model\r\a.zip`. The axis comes out at y 8.60, z 8.00 with 0 collisions. I also fed it two deliberate faults, a raised comb and a shifted left-hand aim, and it failed on both as it should.
- **wm-ammo file checks without the server** (`static-wm-ammo.js`): every config check passes, FN_FAL included. Four pack checks fail as expected because the live `extras\packs` zip hasn't been rebuilt with the minigun: 42 numbers, gating, the two minigun model checks, and the quieter-sounds check (the 5 minigun events aren't in the pack yet).
- **progress-sim:** the median player can buy it at **34.4 h**, the same moment they reach level 125 (day 18 at 2 h a day). So the level gate is what limits it, not the money. For comparison: Viper 24.5 h, Riviera 38.3 h. A grinder gets it at 30.4 h; a casual player hasn't reached level 125 after 30 h (they're at 114).

**Problems and open questions**
1. `make-item-art.js` now requires `tools\guns\minigun.js` from the model track; it isn't installed in the repo yet, and until it is, make-item-art.js throws. The pack checks in wm-ammo need make-item-art, make-gun-sounds and build-pack run in that order.
2. The Java track starts no spin-up clock when a burst begins with the spin already past fire-at; it just ends the spin-down clock. The spec only said there's no clock at s = 1. I wrote gunfx's quick re-press check to match the Java track: no new clock, a 0-tick cut, flag 4 off, flag 0 on.
3. On Minehut, if a DonatingPhone `config.yml` already exists from an earlier upload, it won't get the FN_FAL line, because the plugin never rewrites config.yml. Without that line there's no spin-up. DEPLOY.md doesn't cover this, and the Veteran's line had the same gap.
4. The lore's Damage stat of 50 is the spec's number; it sits below the other guns' 65–76 range, which matches 3.4 being the lightest hit.
5. I left CLAUDE.md and PLAYTEST.md to you.

Work files are in `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\build\data\`: plan.md, YamlCheck.java, bands.js, mgcheck.js, static-wm-ammo.js, the patch scripts, and backups of the originals.
