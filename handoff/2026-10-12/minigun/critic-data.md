<!-- wf_7a4941fe-721 critic:data: an agent's final report, kept for the cloud session -->

I followed addyosmani/agent-skills' `planning-and-task-breakdown` verification checklist by hand. The repo's four skills are set to `disable-model-invocation: true`, so the Skill tool can't run them. By that checklist, the drafter's tasks 5-8 (the bot tests) aren't done yet: their checks need bot runs, and nothing has run against the server.

**Verdict:** the data files match the spec (section 6) and the shared interface exactly. That covers FN_FAL.yml, core.sk (FN_FAL entries, shop::weapons, ammo::rifle::max 400), both config.yml copies, make-item-art GUNS, build-pack's 42 numbers and the sound file list. One test can't catch the failure it names, and one integration-order hazard is live in the owner's tree.

**Checks I ran** (work files in `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\critic\data\`):
- **YAML:** SnakeYAML 2.2 with duplicate keys refused (`Y.java`). FN_FAL.yml, the live config and the plugin config all parse. FN_FAL.yml matches section 6 key for key (lore mean 52.2). Encoding and CRLF match MG34.yml.
- **wm-ammo pack checks** against the model track's `build\model\r\final.zip`, with build-pack's wrap emulated (`static.js`): both minigun checks pass. `tools\guns\minigun.js` in the repo is byte-identical to the model track's file.
- **Mutation tests** (`mut.js`):
  - Flag 3 taken off the clock in the aimed state: FAIL, as it should.
  - Third person reading the cooldown: FAIL, as it should.
  - A static box inside the barrels' sweep: FAIL, as it should.
  - The sight moved 1 unit in z: still PASS. This is MUST 2.
- **wm-damage file check:** passes (bands 3.4/2.8/2.2/1.5; ticks to kill 7 9 12 17 22 27 33 49 against the AK-48's 7 9 11 15 21 25 31 41).
- **progress-sim:** a median player buys FN_FAL at 34.4 h, between the Viper (24.5 h) and the Riviera (38.3 h).
- **Sound events:** `tools\sounds\guns\minigun.js` defines exactly the seven interface events.
- **Other gun lists:** no other file needs FN_FAL. shop/levels/crates/story/zz-testkit read core.sk's lists, and no other scenario hardcodes the gun list.

**MUST**
1. **Integration order (process, for the orchestrator).** Don't restart the local server, or press Playtest R/K, until the minigun is fully integrated.
   - What's live now: core.sk sells the gun at the next Skript load. FN_FAL.yml (02:55) and build-pack.js are newer than `extras\packs\Donating-pack.zip` (02:37). `pack\assets\minecraft\sounds.json` has 0 minigun events.
   - What a Playtest start would do: rebuild the jar, then rebuild the pack. build-pack.js would throw on 6/1006/2006/3006 and the server would start with the old pack. The Hand Minigun would be in the shop with WeaponMechanics' FN FAL model and silent sounds.
   - Do it in one step with the server stopped: build-plugin.ps1, make-gun-sounds.js, make-item-art.js, build-pack.js, then start.
2. **wm-ammo's "sights land on the crosshair in both hands" check can't fail for an off-centre sight.** It only compares the two hands' translations, so the mutation above still passes. Tie it to the dot using aim()'s formula `ty = 8.32 - scale.y × (sightY - 8)`. Add before that check:
   ```js
   const mgBody = mgJson('assets/donating/models/item/gun_minigun_body.json')
   const mgFp = ((mgJson('assets/donating/models/item/gun_minigun_body_ads.json') || {}).display || {}).firstperson_righthand
   const sightY = mgFp ? 8 + (8.32 - mgFp.translation[1]) / mgFp.scale[1] : NaN
   const dot = ((mgBody || {}).elements || []).filter(e => (e.light_emission || 0) > 0 && e.from[1] > 12 &&
     Math.abs((e.from[1] + e.to[1]) / 2 - sightY) < 0.05 && Math.abs((e.from[2] + e.to[2]) / 2 - 8) < 0.05)
   ```
   Then add `&& dot.length >= 1` to the condition and `sight y ${sightY.toFixed(2)}, dot ${dot.length}` to the detail. On final.zip, sightY is 13.250 and the dot sits at y 13.250, z 8.000, so it passes. The mutation now fails.

**SHOULD**
1. **wm-damage, the 12-block check is flaky.** WeaponMechanics' spread (javap'd `Spread`) is uniform per axis at ±Base_Spread/100. At 12 blocks, head hits (3.22) pull the median off 2.8. A Monte Carlo of the check (`farsim.js`) fails 5.6% of the time aiming at 1.0 and 0.9% at 0.8. Set `height = 0.8` before `holdW('FN_FAL', 4, 5, 15000)` and back to 1.0 after. The 4-block check fails 0.8% (target regen landing in a hit's tick), which is acceptable.
2. **gunfx.js, the "held 3 s" upper bound of 46 is fixed.** From cold the gun fires 38 rounds by 3.0 s, 46 by 3.5 s and 48 by 3.6 s, and the ammo read lands 3.0-3.3 s in (six RCON calls, each waiting for a tick). A slow server pushes it past 46. Use `used >= 30 && used <= 38 + Math.ceil(16 * Math.max(0, heldMs - 3000) / 1000) + 3`.
3. **gunfx.js has no slot-change test** (spec 5.2: switching items drops the spin). Add after the reload check:
   ```js
   await sleep(4700); const tSw = Date.now(); press(); await sleep(600); bot.setQuickBarSlot(0); release(); await sleep(250)
   const sw = await spinLine(); const swItem = await cmd(SLOT)
   check('switching away mid-spin: no spin state, flags 3 and 4 off, the whine stopped', /GUNSPIN \S+ none/.test(sw) && !flagsOf(swItem)[3] && !flagsOf(swItem)[4] && heard(tSw, 'spinup', true), `${sw}; ${swItem}`)
   ```
4. **Nothing checks the 30% slowdown live.** A typo in the attribute line would pass silently. While the gun is held in gunfx.js:
   ```js
   const spd = Number(((await rcon.cmd(`attribute ${NAME} minecraft:movement_speed get`)).match(/is (-?[\d.]+)/) || [])[1])
   ```
   Check `Math.abs(spd - 0.07) < 1e-4`.
5. **wm-ammo's barrel check reads only the right-hand contexts.** Also check `firstperson_lefthand` in fpSpin and `thirdperson_lefthand` in tpFlags. final.zip passes both (`lefthand.js`).
6. **The sweep check skips any static box the axis passes through.** Skip only a box that contains the overlapping spin box's whole swept disc: `st.y0 <= AY-r && st.y1 >= AY+r && st.z0 <= AZ-r && st.z1 >= AZ+r`. Count everything else as in the way. final.zip passes with 2 housed boxes (`sweep2.js`).
7. **DEPLOY.md:** add that an existing `plugins/DonatingPhone/config.yml` never gets new `gunfx.guns` lines. The plugin reads only the file's keys in that section. Without the FN_FAL line the minigun fires at 16 a second from the first tick, with no spin and no draw frames. Add the line by hand or delete the file before the restart.
8. **FN_FAL.yml comment:** "keeps the barrels turning 1.5 s after letting go (a burst started then fires at once)" is wrong. A re-press fires at once only while s ≥ 0.3, which is the first ~1.05 s (21 ticks) after letting go.
9. **Cross-track, Java (drafter's point 2):** on a warm re-press, GunSpin removes flag 4 and cuts the spin-down clock, but flag 0 waits for the first round. Near fire-at (rate 5) the barrels stand still for up to 4 ticks between the spin-down and the full spin. Keep flag 4 until the first shot, or flag the gun as firing at once in the warm branch.
