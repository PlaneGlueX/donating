# Hand-off to the cloud session (2026-10-12)

The local session ran out of usage. Everything it had is in this folder and on the branch `claude/minigun`.
`main` is stable: it has the remade guns (merged and checked in the client) and the Claude Code add-ons.
Read CLAUDE.md first (its Status section and "The Photon-detail remake (2026-10-12)").

## State of `claude/minigun` (pushed, NOT tested, NOT merged)

The Hand Minigun (level 125, spin-up) from a build workflow. Its four tracks each had a drafter, a critic and a fixer.
The model's fixer was stopped before it finished.

| Track | Files in the repo | State |
|---|---|---|
| Java (GunSpin) | `plugin/src/dev/donating/phone/GunSpin.java` (new), `GunFx.java`, `PhonePlugin.java`, `plugin/resources/config.yml` | Fixed. Compiled in a scratch folder. Never run on the server. Hand-over: `minigun/fix-java.md` |
| Sounds | `tools/sounds/guns/minigun.js` (new) | Fixed. Previewed as WAVs. Not yet in the pack. Hand-over: `minigun/fix-sounds.md` |
| Data and tests | `FN_FAL.yml`, `core.sk`, `make-item-art.js`, `build-pack.js`, `DEPLOY.md`, `bots/scenarios/{wm-ammo,wm-damage,gunfx,shop,levels}.js` | Fixed. Static checks only. Hand-over: `minigun/fix-data.md` |
| Model | `tools/guns/minigun.js` (new: the DRAFT) | Critiqued, NOT fixed. 2 MUST + 4 SHOULD in `minigun/critic-model.md`, with a ready patch for both MUSTs + SHOULD 1 and 3 in `minigun/critic-model-mg-fix.diff` (and `mg-fix.js`, the patched file) |

Specs: `specs/minigun.md` (the agreed design), `specs/STYLE.md` (the PG painting rules), one spec per remade gun.
The prototype is in `minigun/prototype/`. The reference pictures aren't committed: `specs/fetch-refs.js` gets them from the fan wiki's API, if the cloud's network allows it.

## Done by the cloud (2026-10-12, same day; pushed to `claude/minigun`, NOT merged, NOT run)

All five items below are done; each commit on the branch says what it changed.

| # | What | Where |
|---|---|---|
| 1 | The minigun model finished: the critic's MUSTs and SHOULDs. The spin-down reads the whole 30-60-tick clock, 24 degrees a tick at most. Checks: 0 coplanar pairs, nothing hits the spin sweep (0.097 clearance), a 256x256 texture (pg.js packs in a skyline when shelves don't fit; every other gun is byte-identical). | `tools/guns/minigun.js`, `tools/guns/pg.js`, GunSpin's comments, the draw whir in `tools/sounds/guns/minigun.js` (1.0-1.92 s) |
| 2 | The small fixes: FN_FAL.yml main hand only, its comments, the sound module's comments, a CLAUDE.md section "The Hand Minigun" with the shop/levels lines, and PLAYTEST 184 (the owner's questions). | as listed |
| 3 | GunSpin read against WeaponMechanics 4.3.1's source: no change needed. One cosmetic note (a rest frame on a quick re-press) comes with a proposed fix. | `minigun/review-gunspin.md` |
| 4 | The hands, designed then built: the kit, all ten guns, the Shotgun's shell loop with the left hand, the bag hide (pack + BagHide.java, untested), `tools/guns/dev/hands.js` and `skinlint.js` (all pass). | `hands/PLAN.md`, CLAUDE.md "Hands in the gun frames", PLAYTEST 185 |
| 5 | The docs: CLAUDE.md (Status, the two sections), PLAYTEST 184-185, DEPLOY.md (the release order: the jar and the pack together). | as listed |

Not done in the cloud:
- `pack/` (tracked) wasn't regenerated. make-item-art.js and build-pack.js run clean on a scratch copy, but the release order is the local session's (below).
- The sounds weren't encoded (no npm packages; the WAV preview runs).
- The plugin wasn't built, so BagHide compiles only against API stubs.

## What the cloud session can do (GitHub only)

The cloud has no local server, no Minecraft client, no Windows tools, no bots, and no plugin jars (`papermc.io`, Modrinth and other download sites were blocked in the last cloud session).
GitHub works. Node may work. Mark anything you can't run as "untested (cloud)" in PLAYTEST.md.

1. **Finish the minigun model.**
   - Apply the critic's fixes to `tools/guns/minigun.js`: MUST 1 (coplanar faces) and MUST 2 (every spin must end on a quarter/half turn, or the barrels pop at the end of each clock). The diff is against the installed file. Then do the SHOULDs.
   - Follow the Java track's notes for the model (`fix-java.md`, "Model/pack track"): read the spin-down from the cooldown fraction (30-60 ticks, not a fixed 30); a spin-down clock starts only from s >= 0.3; after a tap under fire-at, flag 3 just turns off.
   - If Node runs, check with `node tools/guns/dev/lint.js tools/guns/minigun.js minigun --kit tools/guns/pg.js` and `node tools/guns/dev/preview.js tools/guns/minigun.js minigun <out> --kit tools/guns/pg.js --views gui,fp,fpads,fpreload`. The spin check is `minigun/prototype/sweep.js`; the coplanar check is `minigun/coplanar.js` (adapt their paths).
2. **Small fixes the minigun fixers listed.**
   - The sound module's comments (`fix-java.md` item 4).
   - FN_FAL.yml line 69's comment.
   - The Off_Hand trigger: remove it, or accept that an off-hand minigun fires at once (only bypass staff can reach that).
   - CLAUDE.md: a "Hand Minigun" section (`fix-java.md` item 6 lists the facts) and the shop/levels lines.
   - A PLAYTEST item with the owner's open questions (`fix-data.md` and `fix-sounds.md`).
3. **Check the Java against WeaponMechanics' source.**
   - Clone github.com/WeaponMechanics/WeaponMechanics at 4.3.1 and verify every call GunSpin makes: WeaponFullAutoEvent.setShotsPerSecond, the FullAutoTask's setRate/setPerShot, HandData.getFullAutoTask, and the reload events.
   - Look for threading problems and missing reset paths. Don't compile; you have no jars.
4. **Design, then build the owner's hands request** (PLAYTEST 183's answers): both hands in every gun's first-person animations, the bag hidden while a reload plays, a shell-by-shell reload for the Shotgun, and every gun skin-ready.
   - The research is done; the designer was stopped before writing PLAN.md.
   - Inputs:
     - `hands/research-client.md`: how 26.3 draws both hands, the item-model limits, and the bag. Recommended option B: GunFx sends only the holder a look-alike bag that draws nothing in first person during the reload. No cooldown sweep, server inventory untouched. Cautious option A: a cooldown on minecraft:leather/paper, which shows a sweep on the offhand slot.
     - `hands/research-refs.md`: PG3D's hands and a choreography per gun.
     - `hands/research-frames.md`: our frames, the mechanics, and an AK-48 prototype with hands (`hands/prototype/frames/`: `pg.diff`, `ak47.diff`, `hands-kit.js`, the render sheets).
   - Write `handoff/2026-10-12/hands/PLAN.md`, then implement the parts that are pure Node/pack art:
     - the hands helper in `tools/guns/pg.js`, first person only, with palette keys gun skins never recolor;
     - the poses and reload choreography in each `tools/guns/<key>.js`, including the minigun;
     - the Shotgun's new reload;
     - a skin-readiness lint: every gun texel comes from a recolorable palette key or KEEP.
   - Write the GunFx bag code (Java) carefully, marked untested.
   - Keep the gameplay timing: WeaponMechanics' reload durations, the sound delays and the GunFx clock lengths stay. The aim points stay on the crosshair in both hands.
5. **Keep the docs current.** CLAUDE.md (status, the sections you change), PLAYTEST.md, DEPLOY.md (the plugin jar and pack files to upload for the minigun).

Don't merge `claude/minigun` into `main` from the cloud: nothing on it has run on a server yet.

## What only the local session can do (next time on the PC)

1. **Integrate the minigun.** Do these in order, with the server stopped (`fix-data.md` MUST 1):
   1. `tools\build-plugin.ps1`
   2. `tools\node\node.exe tools\sounds\make-gun-sounds.js` (`npm install` in `tools\sounds` first if needed). It rewrites every OGG with new stream serials: `git checkout` the non-minigun OGGs afterwards.
   3. `tools\node\node.exe tools\make-item-art.js`
   4. `tools\node\node.exe tools\build-pack.js`
   5. Start the server.
2. **Run the tests.**
   - `bots\run-all.js wm-ammo wm-damage gunfx shop levels menus crates tabcomplete story inventory-lock death`. The expected numbers are in `fix-data.md`. Then the full suite.
   - The client check (computer use): the spin-up, firing, reload, aim and F5.
   - A review workflow, then merge.
3. **The hands work** (built in the cloud: CLAUDE.md "Hands in the gun frames", PLAYTEST 185). Compile BagHide (`tools\build-plugin.ps1`; fix anything javac finds: it was only checked against stubs). Build, then:
   - a bot test that the server inventory never changes during a reload;
   - the client check: the bag slides out and back, the hands look right at the hip, aimed and reloading;
   - the full suite, then merge.
4. **Restart the Claude app** once, so the Ponytail trial (installed 2026-10-12) loads.

Until the minigun is integrated, start the local server from `main`. `claude/minigun`'s core.sk already sells the gun, but its plugin and pack aren't built yet.
