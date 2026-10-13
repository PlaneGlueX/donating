<!-- wf_7c6d8b83-7b2 research:frames: an agent's final report, kept for the cloud session -->

REPORT.md could not be written: the harness blocks report files from subagents, so the full report is below. Everything else is in F = `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\hands\frames`. Nothing in the repo was touched.

# Hands in the gun frames: our frames, the mechanics and an AK-48 prototype (2026-10-12)

## Recommendation
- **Hands: possible, and working on the AK-48 prototype.** The gloved hands are our own geometry, drawn by each gun's first-person composites. They are shared models with their own texture, so gun skins never repaint them. The kit aims each sleeve off the screen's bottom edge every frame.
  - The right glove stays on the grip.
  - The left hand does the whole reload: rocks the magazine out, brings a new one, slaps it home, racks the handle.
  - Every arm end is off the screen in all 308 placements, at screen shapes from 4:3 to 21:9.
- **Hiding the bag during the reload: possible, with no Skript or inventory change.**
  - GunFx starts a cooldown on `minecraft:leather` and `minecraft:paper` for as long as the reload. The bag and the cash stack have no `use_cooldown` component, so those are their cooldown groups.
  - The pack's bag and cash item definitions read that cooldown and dip out of view, in first person only.
  - I checked the mechanism in the 26.3 client jar and rendered the dip.
- **At rest, neither hand shows** (hip, aimed, sprint, draw, fire). Every gun's grip sits below the screen's bottom edge.
  - Cautious (recommended now): keep the hip poses. The hands appear whenever the gun lifts, which means in the reloads.
  - Realistic: re-pose each gun's hip so the right glove peeks in at the bottom right, like PG3D. This visibly changes how every gun looks at rest. One variant is rendered.
  - The left hand can't rest on the handguard while the bag is in the offhand. That would need Skript to empty the offhand whenever a gun is held. I don't recommend it.
- **Shotgun reload:**
  - Cautious: keep loading one shell at a time and add the left hand thumbing each shell in, plus GunFx flags for a lift-in and an exit.
  - Realistic (recommended, since the owner asked for "similar to the other guns"): make it one whole-magazine reload with one clock, like the others. This changes gameplay, so it's the owner's call.
- **Skins:** the hands live outside the gun textures. Future skins need nothing for the hands, and the gun textures don't grow.

## 1. What exists today
**The kit (`tools\guns\pg.js`).** `pgGun(name, spec)` writes:
- one model per part, all on the gun's own texture;
- a `_full` model with every part except hidden ones (used for third person, the ground, item frames and the icon);
- `_ads` and `_sprint` children that only change the first-person display.

The frame helpers:
- `composite(state, pose)`: each part is a `minecraft:model` with a transformation `then(pose[part], pose.gun)`. A pose is a rotation about a pivot plus a translation, in model units. Hidden parts show only when a pose lists them in `show`.
- `cooldown(state, n, poseAt, rest)`: a `range_dispatch` on `minecraft:cooldown` with n frames (frame k shows p = 1 − (k + 0.5)/n); with no cooldown it shows `rest`.
- `firing`: firing flag 0, then the use key held, then a random pose each frame.
- `flag(i, on, off)`.
- `byContext`: first person gets the animated tree; every other context gets `_full`.

Every gun returns four entries: Default N, Scope N+1000, Sprint N+2000 (one pose, no clock) and Reload N+3000 (one clock).

**GunFx.**
- **Magazine guns:** one clock per reload, `max(getReloadCompleteTime, getReloadTime)`. An empty reload's open, reload and close run as a single clock, so the frames stretch.
- **Shells (`Ammo_Per_Reload`, the Shotgun):** one clock per shell, the 4-tick reload task alone.
- Cancel or complete cuts the clock. A reload refused for want of ammo starts no clock. Aiming mid-reload ends the clock on guns that have a shot clock.
- Flags: 0 firing, 1 a firearm action on its own, 2 draw, 3 and 4 the minigun's spin.

| Gun (module, skin no.) | Parts | Default-state clocks | Reload frames | WeaponMechanics reload | gunfx |
|---|---|---|---|---|---|
| Classic Pistol (gs50, 9) | body slide mag flash | shot 6 | 32: roll; magazine out of the grip, new one in; slap | 7 rounds, 32 t, SLIDE 3+3 | shot 6 |
| Old Revolver (rev, 8) | body hammer cyl crane rounds loader flash flashads | draw 12 (flag 2) or shot 8 | 40: speedloader | 6, 40 t, no action | shot 8, draw 12 |
| Machine Gun (uzi, 1) | body stock bolt flash flash2 | draw 20, firing | 41 (31 full): handle; magazine through the grip | 32, 31 t + SLIDE 5+5 | draw 20, fire 5 |
| Brave Patriot (tommy, 15) | body stock bolt mag flash flash2 | draw 22, firing | 60 (50): drum; knob | 50, 50 t + 5+5 | draw 22, fire 5 |
| Shotgun (r90, 14) | body pump shell flash | pump 15 (flag 1) or shot 15 | **4 per shell**: canted, shell pushed into the port; the cant is held between shells and snaps in and out | 14, **1 shell per 4 t**, PUMP 7+7 | shot 15, alone 5, action 15 |
| Combat Rifle (m16, 7) | body charge mag flash flash2 | draw 26 (flag 2) or burst 4 | 50 (62): magazine, T-handle, forward assist | 30, 50 t + 6+6 | shot 4, draw 26 |
| AK-48 (ak47, 5) | fore body bolt mag flash flash2 | draw 30, firing | 57 (73): magazine rock; handle | 30, 57 t + 8+8 | draw 30, fire 5 |
| Sniper Rifle (sniper, 13) | body noads bolt mag case flash | draw 40, bolt 16 or shot 20 | 60 (76): bolt; magazine | 5, 60 t, LEVER 8+8 | shot 20, draw 40, alone 6, action 16 |
| Veteran (lmg, 11) | body stock bolt mag flash flash2 | draw 40, firing | 96 (80): top magazine; handle | 50, 80 t + 8+8 | draw 40, fire 5 |
| Hand Minigun (FN_FAL) | being built | draw 40, spin flags 3 and 4 | 90: box; barrel ratchet | 100, 90 t | draw 40, fire 4, spin 24/30 |

The Shotgun already has a reload animation, but it reads poorly: four frames per 4-tick shell, no hand, a cant that snaps on and off, and no entry or exit move.

## 2. Mechanics checked (26.3 client jar, Paper 26.1.2, WeaponMechanics 4.3.1)
- **Arms.** The client draws the player's skin arm only when the main hand is empty. An empty offhand draws nothing. So hands must be item geometry, and they can't use the player's skin.
- **Cooldown property.** The client reads `minecraft:cooldown` from the local player's own cooldowns only (0 for other players and entities). The cooldown group is the item's `use_cooldown` group, else its item id. Paper's `setCooldown(Key, int)` reaches the bag (leather) and the cash stack (paper) directly. Neither item can be used, so the cooldown has no gameplay effect.
  - Expected side effect: the offhand HUD slot will show the white cooldown sweep during the reload, like the gun's sweep in the hotbar. Check this in the client.
- **Transformations.** The 26.3 client accepts `transformation` on `model`, `composite`, `condition`, `range_dispatch`, `select` and `special` item models. The bag dip only uses it on `minecraft:model`, which pg.js already relies on for 26.1+.
- **Limits.** Element rotation angles have no limit. Only element from/to must stay within −16..32. Transformations are unlimited.

## 3. How the hands fit the kit (built in `F\pg.js`; diff in `F\pg.diff`)
**Shared models**, built once by `buildHands()` through `pgGun('hands')`:

| Model | Elements | Shape |
|---|---|---|
| `hands_rglove` | 5 | Built round a pistol grip (grip top at the origin, front −x, +z the visible side): fingertips on +z, thumb along the top, trigger finger forward, wrist stub at the back |
| `hands_lglove` | 5 | A C round an upright 3×2 object such as a magazine |
| `hands_arm` | 3 | Elastic band, hem and a 28-unit navy sleeve |

One texture, `hands_tex` (256×256, 3.7 KB), serves every gun.

**Per gun:** `spec.hands = { right: { at }, left: { at, shown: false }, leftTree: false }`.
- `at` places each glove in the gun's space. For the AK that's the grip's top centre at its 20° rake.
- The kit writes small child models `donating:item/hands/<gun>_<model>[_ads|_sprint]` that carry the gun's display transforms.
- Composites add the hand entries. A pose moves a hand with `pose.rhand` or `pose.lhand`, on top of `at` and moved with the gun (for example the magazine's own pose). A hand with `shown: false` appears only when a pose lists it in `show`.
- `_full` never includes hands, so third person, the ground and icons have none.

**Arms are aimed every frame.**
- The kit draws a line from the wrist to an elbow point in camera space: right (0.42, −0.62, −0.22), left (−0.40, −0.62, −0.22).
- It converts the elbow back through the state's display transform and turns the sleeve toward it.
- If the sleeve's far end would still show on any screen shape up to 21:9, it lowers the elbow step by step until it doesn't.
- So the arm always leaves through the bottom edge, which is the same on every screen shape, and its cut end never shows.

**Left-handed players** (`leftTree: false`, recommended).
- One tree serves both hands' views, and the elbow search satisfies both.
- Left-handed players see the gloves on the far side of the gun, mostly hidden, because the client never mirrors geometry. Their arms still run off the screen.
- `leftTree: true` gives the left hand its own tree, at about twice the JSON. Not worth it.

**Skins:** `paintSkin` passes `donating:item/hands/*` through unchanged.

**Limits:** the shared boxes stay within −16..32. Transformations can place them anywhere.

**Cost.**
- Per frame: 2 extra model entries, or 4 while the left hand shows. That's 13 elements against the gun's 100+.
- AK item definition: 88 KB → 154 KB (3.9 → 9.5 KB compressed).
- Across all guns and their skins: roughly +2 MB of uncompressed JSON, about +0.15 MB in the zipped 8.6 MB pack.
- Guns without `spec.hands` build byte-identical: I built all nine repo guns and 18 skins with both kits (565 files) and found 0 differences.

## 4. The AK-48 prototype (`F\ak47.js`; diff in `F\ak47.diff`)
**Choreography** (57 ticks, 73 from empty). The gun moves and the sound timings are unchanged.

| Reload share | What happens |
|---|---|
| first 10% | The bag dips out of view |
| 0.02–0.12 | The left hand rises from below to the magazine |
| 0.12–0.30 | It rocks the magazine out and pulls it out of view |
| 0.34–0.45 | It brings the new magazine up (the rise used to be 0.40–0.50) |
| 0.50–0.62 | Rocks it in and slaps it home |
| 0.60–0.72 | Lets go and reaches over to the handle as the gun rolls |
| 0.725–0.79 | Pulls the handle and lets it snap |
| 0.80–0.92 | Drops away |

The right glove stays on the grip throughout.

**Renders** (render-item.js's maths plus near-plane clipping):
- **Before:** `F\base\ak-fp.png`, `F\base\ak-fpads.png`, `F\base\ak-fpreload.png`.
- **Rest poses:** `F\sheetA\sheet.png` (hip, aimed, sprint, draw at 0.85, fire, left-handed). The sights stay on the crosshair. No hand is visible at rest; the grip is below the screen in all six.
- **Reload:** `F\sheetB\sheet.png`, at cooldown 1, 0.8, 0.6, 0.4, 0.2 (frame p ≈ 0.01, 0.20, 0.39, 0.605, 0.79), plus the Golden skin at 0.8 (gun gold, hands unchanged) and left-handed at 0.8 and 0.2. Individual PNGs sit alongside.
- **Raised-hip option:** `F\hipup\hip.png` and `fire.png`. The right glove peeks in beside the banana magazine. `F\hipvariants2.png` compares the current hip with three raised variants.
- **Bag dip:** `F\bag\bag-dip.png`, the left-hand view at clock 0, 0.99, 0.96, 0.93, 0.5, 0.05. The wrap is `F\bag\bag-def.json`, generated by `bagHide()` in `F\bagwrap.js`.
- **Check:** `F\verify.js` reports 308 arm placements with 0 ends on screen, at 4:3, 16:9 and 21:9, for both hands, and also for the raised hip.

**Compared with PG3D** (refs 04 and 05): PG3D shows both skin arms at rest because its gun sits higher. Ours only show when the gun lifts. The chunky boxy style matches.

**Known issues to tune**
1. The handle grab is close to the camera, so the glove looks big (`r020`). Moving the grab further away made it worse, so the bolt pose itself needs to keep the receiver further out.
2. At `r060` the hand shows more than the new magazine does.
3. The two tan gloves blend together where they meet (`r040`).

## 5. Hiding the bag (cautious option, no Skript)
**GunFx (reload clocks only, not shots or draws):**
- Call `p.setCooldown(Key.key("minecraft","leather"), ticks)` and the same for `"paper"`.
- Set both to 0 on reload cancel or complete, and when aiming cuts a reload.
- Shotgun: start one bag clock at the first shell, lasting shells × 4 ticks (+14 if the pump is open). End it only on cancel or after the last shell; restarting it per shell would make the bag bob.
- Add a config switch, `gunfx.bag-hide`.

**Pack:** where make-item-art.js writes leather.json and paper.json, wrap each bag's 3D model (including skin duffels) and `loot_cash` with `bagHide(model)`.
- It only affects first person, so the HUD icon, third person and loot displays are unchanged.
- It adds 13 entries per bag. The dip takes 10% of the reload: 3 ticks on the pistol, longer on the rifles.

## 6. Changes needed
1. **pg.js** (splice source `F\hands-kit.js`; `F\patch-kit.js` rebuilds `F\pg.js` from the repo's copy):
   - `spec.hands`: per-gun child models, the hand entries in composites, the elbow search, `leftTree`;
   - the shared hands (`buildHands`, `HANDS`, `handAnchor`, `handWorld`, `onScreen`, `fromTo`);
   - `paintSkin` passes hand models through;
   - `byContext` adds a left-hand case only when `leftTree` is true.
2. **Hand blend helpers** in the kit: `inv`, `nlerp`, `mixRig`, `asPose` (copy them from `F\ak47.js`).
3. **render-item.js near-plane clipping** (`F\render-item-clip.js`, about 25 lines). The repo version drops any face with a corner behind the camera, so a sleeve passing the camera disappears in previews even though the client draws it.
4. **A build check** like `F\verify.js` (every arm's far end off the screen in every first-person frame).
5. **Per gun:**
   - the right glove's `at` from the grip box and rake;
   - left-hand choreography in its reload, keeping the same clocks and sounds;
   - optionally `pose.rhand` where the right hand should leave the grip (the Sniper Rifle's bolt);
   - the Machine Gun and Classic Pistol load through the grip, so their magazine passes through the right fist: shift that hand down or let go during the swap.
6. **Shotgun:**
   - Cautious:
     - keep 4 ticks per shell;
     - the left hand thumbs each shell in;
     - GunFx flag 5 on the first shell for the lift-in, and a short exit clock on complete (flag 6) to un-cant;
     - optionally 6 ticks per shell so the loop reads (a small nerf: a full load goes from 56 to 84 ticks).
   - Realistic (recommended):
     - drop `Ammo_Per_Reload` and set `Reload_Duration` to about 45 ticks (59 from empty with the pump's 7 + 7), giving one clock;
     - the animation: lift and cant, the left hand feeds three shells, rack the pump, settle;
     - balance: from empty it gets faster (59 vs 70 ticks), topping up 2 shells gets slower (45 vs 8), and the reload can no longer be stopped partway to shoot.

## Files in F
- Kit: `pg.js`, `pg.diff`, `hands-kit.js`, `patch-kit.js`
- AK-48: `ak47.js`, `ak47.diff`, `ak47-hipup.js`
- Tools: `shots.js`, `verify.js`, `proj.js`, `render-item-clip.js`
- Bag: `bagwrap.js`, `bag\bag-dip.png`, `bag\bag-def.json`
- Renders: `sheetA\*.png`, `sheetB\*.png`, `hipup\*.png`, `hipvariants2.png`, `base\*.png`
