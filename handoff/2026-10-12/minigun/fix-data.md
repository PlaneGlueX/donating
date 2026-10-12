<!-- wf_7a4941fe-721 fix:data: an agent's final report, kept for the cloud session -->

The critic's MUST 2 and all nine SHOULDs are dealt with and installed in my owned files: SHOULDs 1–8 are fixed, and SHOULD 9 belongs to the Java track (handed over below). MUST 1 is a step for the integrator (below). Nothing ran against the server: no bots, RCON, pack build or jar build, so the live bot scenarios are still unrun.

**Agent skills:** the addyosmani/agent-skills plugin in `.claude/skills/` only has the four planning skills, and they are owner-invoke only (`disable-model-invocation: true`), so the Skill tool can't run them. I followed `planning-and-task-breakdown` by hand: five tasks, each with a check that can fail, and two checkpoints, all ticked in `...\work\minigun\build\data\plan-fix.md`.

## Repo files I changed

- **`bots/scenarios/wm-ammo.js`**
  - **MUST 2:** the sight check now ties the aim to the dot. It works out the sight height from the aimed display (8 + (8.32 − ty) / scale.y, from make-item-art.js's `aim()`) and requires:
    - a glowing box in a static part at that height, on z = 8;
    - tx = −8.96 in the aimed display;
    - the same aimed display in both hands and in every part's `_ads` model;
    - the sight above the spinning cluster's reach.
  - **SHOULD 5:** the barrel check now reads both first-person hands and both third-person hands. It expects 10 first-person entries, the sprint's spin-down in both hands, and 6 third-person entries.
  - **SHOULD 6:** the sweep check now skips a static box only when it holds the overlapping spin box's whole swept disc. Any other box the axis crosses counts as in the way.
- **`bots/scenarios/wm-damage.js` (SHOULD 1):** the 12-block minigun check aims at height 0.8. The height goes back to 1.0 in a `finally`.
- **`bots/scenarios/gunfx.js`**
  - **SHOULD 2:** the "held 3 s" upper limit is now `38 + ceil(16·(heldMs − 3000)/1000) + 3` instead of a fixed 46.
  - **SHOULD 3:** new slot-change check, run after the reload. It presses for 600 ms, confirms the gun is spinning, then switches to slot 0. It expects no spin state, flags 3 and 4 off, a 0-tick clock cut and the whine stopped.
  - **SHOULD 4:** the walking speed is 0.07 while the gun is held (after the draw) and 0.1 after the switch.
  - **Warm re-press:** the ammo is now read before the second spin read, and the wait between the two reads is 150 ms (was 250). The press now lands about 0.5 s into the spin-down; s drops below fire-at 0.3 after about 1.1 s.
  - **"Once they stop" wait:** raised from 2500 to 3400 ms. The Java fixer's new spin-down clock can run up to 60 ticks, which the old wait didn't cover.
- **`DEPLOY.md` (SHOULD 7):** a new bullet in section 1. An existing `plugins/DonatingPhone/config.yml` never gets new `gunfx.guns` lines (I checked this in Paper 26.1.2's MemorySection bytecode). It gives the exact FN_FAL line to add by hand, and says the 2026-10-06 guns' lines have the same gap.
- **`FN_FAL.yml` (SHOULD 8):** comment only. A re-press now says it fires at once only in about the first second of the 1.5 s wind-down. The non-comment lines are byte-identical to the drafter's.
- **Unchanged since the drafter:** core.sk, the live `server/plugins/DonatingPhone/config.yml`, make-item-art.js, build-pack.js, shop.js and levels.js.

## Checks run (all pass)

- **YAML:** SnakeYAML 2.2 with duplicate keys refused accepts FN_FAL.yml and both DonatingPhone configs. The FN_FAL line is identical in both configs.
- **Syntax:** `node --check` passes on wm-ammo, wm-damage, gunfx, shop, levels, make-item-art and build-pack.
- **wm-ammo file checks** against the model track's `build\model\r\final.zip`:
  - Barrels: first person R and L 6:3 6:4 1006:3 1006:4 6:2, sprint flag 4 in both hands, third person R and L 6/1006/2006, no viewer-only reads, 4 still icons.
  - Sights: aimed 7/7, tx −8.96, sight y 13.25, dot on the body at x 19.38, reach 3.58, nothing in the way.
  - The critic's builds `out.zip` and `outnl.zip` pass too.
  - The checks for the whole pack fail, as expected: final.zip holds only the minigun.
- **Mutations** (`build\data\mut2.js`): all 13 come out as expected. `none` passes. Each of these fails as it should:
  - the critic's four: fpNoClock, tpCooldown, sweep, sightOff;
  - leftNoClock, leftAimNoDown, tpLeftStill (the hands);
  - axisCross (sweep);
  - adsY, adsOnePart, dotDark, sightLow (sight).
- **wm-damage file check:** passes with bands 3.4 / 2.8 / 2.2 / 1.5 and hits 6 8 10 14 / 18 22 27 40. Ticks to kill are 7 9 12 17 22 27 33 49, against the AK-48's 7 9 11 15 21 25 31 41.
- **The critic's Monte Carlo** of the 12-block check: it failed 5.7% of runs aimed at 1.0 and fails 1.0% at 0.8. The 4-block check fails 0.8%.
- **gunfx timing model** (`build\data\bound.js`, WeaponMechanics' AUTO table): 30 / 38 / 46 / 54 rounds by 2.5 / 3.0 / 3.5 / 4.0 s. The new upper limit always has at least 3 rounds to spare from 3 to 6 s held.
- **progress-sim:** a median player buys FN_FAL at 34.4 h, between the Viper (24.5 h) and the Riviera (38.3 h). Level 125 also comes at 34.4 h, so the level gate is what limits it.

## For the integrator

1. **MUST 1 (order):** don't restart the server or press Playtest R or K before the minigun is fully integrated. With the server stopped, run in this order:
   1. `tools\build-plugin.ps1`
   2. `tools\node\node.exe tools\sounds\make-gun-sounds.js` (run `npm install` in `tools\sounds` first if needed)
   3. `tools\node\node.exe tools\make-item-art.js`
   4. `tools\node\node.exe tools\build-pack.js`
   5. start the server

   core.sk already sells the gun at the next Skript load, and build-pack.js would throw on 6 / 1006 / 2006 / 3006 if the pack were rebuilt before the model.
2. **Tests to run:** `tools\node\node.exe bots\run.js` with each of these, then menus, crates, tabcomplete, story, inventory-lock and death.
   - **wm-ammo:** all 42 feather numbers drawn, 10 guns gated, both minigun checks, and FN_FAL fires with the bag in the offhand using tracer 7002.
   - **wm-damage:**
     - median 3.4 a hit bare (6 shots);
     - 2.8 from 12 blocks (8 shots);
     - 1.156 in the best gear (18 shots).
   - **gunfx:** the status shows `FN_FAL{... spin=24/30/0.3/5}` and `spinup=on`.
     - The draw has its 40-tick clock and flag 2, and the speed is 0.07.
     - From cold the rate is 0, s is under 0.3, ammo stays 100, the 24-tick clock starts and the whine plays.
     - After 3 s held, s = 1 and the rate is 16.
     - On release the clock is 25–30 ticks; a quick re-press fires with no new clock.
     - A reload gives a 90-tick clock; a slot change gives no spin state, a clock cut, the whine stopped and speed 0.1.
   - **shop:** cell 12 shows "Hand Minigun", $1,500,000 and "Needs level 125"; rifle max reads 400.
   - **levels:** `125. - 137,877 XP · the Hand Minigun`.
3. **Java track (SHOULD 9, not fixed):** on a quick re-press GunSpin still turns flag 4 off before flag 0 comes on. Near fire-at the drawn barrels can stand still for up to about 4 ticks. Either keep flag 4 until the first shot, or set flag 0 at once in that branch. My re-press check reads the flags 200 ms in, so it passes with either fix.
4. **Java compatibility (checked against the GunSpin installed at 03:33):** the status line's `rate=` still prints rate(s), which is 0 below fire-at. The spin-down clock from full spin is 30 ticks. There's no whine on a quick re-press, and my checks don't expect one. If the Java side changes `rate=` to the burst's starting rate, gunfx's "from cold" check needs adjusting.
5. **Model track:** if the sight or dot moves, the sight check still needs a glowing box in a static part at aim()'s sight height, on z = 8, above the spinning cluster's reach (3.58 now).
6. **Live config:** `server/plugins/DonatingPhone/config.yml` has the FN_FAL line but not the resource config's spin comment. That's comments only, and the Java track is rewording that comment.
7. **Docs:** CLAUDE.md and PLAYTEST.md are still to write.

## Open questions for the owner (spec section 10, still PROPOSAL)

1. The rifle-shaped Hand Minigun, or the M134-style Siege Minigun?
2. 16 a second at full spin (the AK-48 stays on top) or 18?
3. Spin-up 1.2 s (first round at about 0.4 s) and spin-down 1.5 s: OK?
4. Rifle ammo carry 400 or 300?
5. $1,500,000 at level 125?
6. The reflex-hood sight that shows the barrels spinning, or the tall tube that hides them?

My work files (plan-fix.md, mut2.js, bound.js and the drafter's originals in `fix0\`) are in `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\build\data\`.
