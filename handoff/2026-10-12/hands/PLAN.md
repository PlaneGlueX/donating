# Hands, the hidden bag, the Shotgun's reload and skin-ready guns: the plan (cloud, 2026-10-12)

The owner's answers to PLAYTEST 183 (2026-10-12):
1. Keep the side view. "Redo the animation to include both hands if possible." Hide the heist bag while the reload plays, if that can be done ("fine if not").
2. Keep the Shotgun's bead and the AK-48's blue rim. Give the Shotgun a reload animation like the other guns'.
3. The Combat Rifle's navy is OK, "but keep in mind most of these guns will have additional skins in the future".

Inputs: `research-client.md` (the 26.3 client and the bag), `research-refs.md` (PG3D's hands, a choreography per gun), `research-frames.md` (our frames, the kit, the AK-48 prototype in `prototype/frames/`).

**Built (cloud, same day; untested in game):** the kit, all ten guns, the bag hide (pack and Java), the checks. The tables below say what was built; where building changed the plan, the row says so. PLAYTEST 185 has the client checks and the owner's questions.

**Fixed for every decision below:**
- No gameplay timing changes: WeaponMechanics' reload durations, every sound's `delayBeforePlay` and every GunFx clock length stay as they are.
- The sights stay on the crosshair in both hands; the gun's own display transforms don't change.
- Nothing is pushed to `main` from the cloud.

## 1. The hands (kit: `tools/guns/pg.js`)

**How:** the client never draws the player's arm while a hand holds an item, and an item model can't use the player's skin. So the hands are geometry of our own inside each gun's first-person composites. This is the prototype's design (`prototype/frames/hands-kit.js`), with the changes below.

- **Shared models, painted once:** `donating:item/hands_rglove` (a fist round a pistol grip), `hands_lglove` (a C round a magazine-sized object) and `hands_arm` (cuff, hem and a 28-unit sleeve), all on their own texture `donating:item/hands_tex`.
- **Placement per gun:** `spec.hands = { right: { at }, left: { at, shown: false } }`.
  - The kit writes small per-gun children `donating:item/hands/<gun>_<model>[_<state>]` that carry the gun's display transforms.
  - A pose moves a hand with `pose.rhand` / `pose.lhand`, on top of `at`, and with `pose.gun` like any part.
- **First person only:** never in `_full`, so third person, the ground, item frames and the icon have no hands. They also vanish under the car camera, because build-pack.js's `view_entity` wrapper holds them too.
- **Arms aimed every frame:** each sleeve is turned from the glove's wrist toward an elbow point off the screen's bottom edge, in camera space. The elbow is lowered until the sleeve's far end is off screen at every shape from 4:3 to 21:9, so a cut end never shows.
- **Skins never touch the hands.** They have their own texture, and `paintSkin` passes `donating:item/hands/*` through unchanged. Future gun skins need nothing for the hands, and the gun textures don't grow.
- **The look** (research-refs 2.1, adjusted while building): coyote-tan tactical gloves with dark rubber knuckle pads and a stitched dark cuff; a navy work-jacket sleeve with a gold stripe near the cuff.
  - Palette keys: `glove`, `gloveK`, `stitch`, `cuff`, `sleeve`, `trim`. A future glove or jacket cosmetic would recolor exactly these; gun skins can't reach them.
  - Readability: the refs' charcoal gloves were rendered first and disappeared into the black guns, so the gloves are light (tan). The dark knuckle pads keep two touching gloves apart.
- **Size per gun:** `scale` (and `armScale`) per hand: the shared glove fits a grip 2.25 deep and 2 wide, so thick grips get a bigger glove (the Classic Pistol 1.3, the Shotgun 1.3), and sleeves are slimmed to 0.85-0.95 where they would fill the screen.
- **Aimed: no hands.** A sleeve from the grip to the screen's corner crossed the bottom of the sight picture (`spec.hands.aimed` turns them on per gun).
- **Left-handed players:** one tree serves both hands' views (the prototype's `leftTree: false`). The client never mirrors geometry, so left-handers see the gloves on the far side of the gun, mostly hidden. The elbow search keeps their arms off screen too. A second tree would double the JSON; not worth it for v1.
- **Kit helpers exported** for the gun modules: `hands.inv`, `hands.mix` (rig blend: lerp + nlerp) and `hands.place` (an absolute hand placement → `pose.<hand>`).

### At rest: cautious now, realistic as an owner question
| | Cautious (built) | Realistic (owner's call) |
|---|---|---|
| Hip, aimed, sprint, fire | The right glove is on the grip in every frame. Every gun's grip sits under the screen's bottom edge at the hip, so it only shows when the gun lifts (reloads, draws, sprints). The side view the owner kept is untouched. | Raise each hip pose so the glove peeks in at the bottom right, like PG3D. That visibly changes every gun at rest. |
| Left hand | Only in reloads, entering from the lower left as the bag drops away. | A gloved fist holding the bag at all times (one extra model in the bag's first-person composite), so both hands always show. |

### Rules every pose follows
1. A hand never covers the gun's art: the right hand sits on the grip's far side and back strap; the Shotgun's bead and the AK-48's rim stay clear.
2. A hand never enters the sight picture while aiming.
3. Every hand move takes at least 2 ticks; entries and exits take 3-6 ticks.
4. The left hand enters from the lower left (where the bag was) and leaves the same way.
5. While a magazine is off screen, the left hand stays with it (it carries the old one away and brings the new one).

## 2. Every gun's reload with hands
Each module's `reload(p)` keeps its gun moves and its sound beats. The left hand is added, plus a small lift where the work happened below the screen edge (research-refs section 4 lists the anchors and beats per gun).

| Gun | Left hand | Right hand | Lift |
|---|---|---|---|
| Classic Pistol (gs50, 32 t) | pulls the magazine down out of the grip, brings the new one, slaps it | on the grip (shows at the hip: the pistol's grip is on screen) | +7, 3 toward the middle, and the roll reversed (the grip's bottom toward the middle, out from behind the right sleeve) |
| Old Revolver (rev, 40 t) | swings the cylinder out, slaps the ejector, brings the speedloader, twists, pulls it away | on the grip; the wrist flick closes the cylinder; still while the gun twirls in the draw | none |
| Machine Gun (uzi, 41 t) | pulls the magazine out, inserts the new one, slaps the handle down (the HK slap); the first pull happens by itself (no time for the hand to get there) | on the grip | +2.8 |
| Brave Patriot (tommy, 60 t) | tugs the drum, slides it out, brings the new one, heel slap, racks the knob | on the grip | +1 |
| Shotgun (r90, 4 t a shell) | thumbs each shell into the port (four frames a shell) | on the grip | +2.3, 0.7 toward the middle |
| Combat Rifle (m16, 62 t) | pulls the magazine down, brings the new one, slaps it; the T-handle racks by itself (a hand at the back of the receiver, by the eye, filled the screen) | on the grip (the forward-assist knock is the gun's nudge) | none |
| AK-48 (ak47, 73 t) | rocks the magazine out, brings the new one, rocks it in, slaps it, racks the handle (its arm hangs down there, not across the screen) | on the grip | none |
| Sniper Rifle (sniper, 76 t) | pulls the magazine out and seats the new one | on the stock's wrist just behind the trigger, at the shared size (nearer the eye it looked huge); the bolt still moves by itself | +1.8 |
| Veteran (lmg, 96 t) | tips the top magazine off, brings the new one, rocks it in, slaps it, racks the handle | on the grip | none |
| Hand Minigun (minigun, 90 t) | cups the box out and in, slaps it, turns the cluster twice by the middle clamp's arm (the "+" repeats every quarter turn, so it regrips the same spot) | on the grip; no hands in its third-person spin | already lifted |

**Draws, shots and pumps stay one-handed.** The Shotgun's pump between shots racks by itself, since a bag dip on every second shot would flicker. The Sniper Rifle's bolt after a shot moves by itself. The realistic option (the right hand works the bolt) is an owner question.

**The Shotgun** keeps loading one shell per 4-tick WeaponMechanics reload (gameplay unchanged). Each shell's clock is four frames:
1. the left hand lifts a shell under the port;
2. its nose enters;
3. the thumb pushes it home and the gun nods;
4. the thumb slides off and the hand drops back for the next one.

The canted loading pose holds between shells, so the loop reads as fast thumbing. As now, it snaps on at the first shell and off at the end.

| | Cautious (built) | Realistic (needs GunFx flags 5 and 6; owner's call) |
|---|---|---|
| Entry and exit | The cant snaps on and off, as now | An eased entry on the first shell (flag 5), and a closing pump with the left hand after the last (flag 6, a cosmetic 15-tick clock with the pump sounds) |
| Or | | One whole-tube reload with one clock (drops `Ammo_Per_Reload`): a gameplay change |

## 3. Hiding the bag during a reload (DonatingPhone: `BagHide.java`, untested)
The bag (leather) or the cash stack (paper) sits in the offhand. No item property reads the main hand, but the item the client believes is in its offhand can be changed for that player alone (research-client 3b).

| | Cautious: `gunfx.bag-hide: cooldown` | Realistic (default): `gunfx.bag-hide: lookalike` |
|---|---|---|
| How | A cooldown on `minecraft:leather` and `minecraft:paper` (the bag's and cash's own cooldown groups) for the reload's length. The pack's first-person bag and cash dip out while it runs (rendered: lowered at 0.97, gone from 0.92 to 0.06, rising at 0.02). | At the reload's start, the holder alone gets a copy of their real offhand whose `item_model` (`donating:bag_hidden` / `donating:cash_hidden`) draws nothing in first person, sent with `Player#sendEquipmentChange`. About 3 ticks before the reload ends, a copy that draws normally (`bag_shown` / `cash_shown`); 8 ticks later the real item. Both copies have `hand_animation_on_swap: true`, so the client's own swap animation slides the bag down and back up. |
| Cost | The offhand HUD slot shows the white cooldown sweep | Two or three equipment packets per reload; one `isSimilar` check per tick per hiding player |
| Risk | None: the cooldown runs out by itself | A real resync while hidden (bag.sk redrawing the fill, a menu opening) pops the real bag back. BagHide re-sends the hidden copy at that tick's end. A missed restore leaves the bag invisible in first person until the next resync; the server inventory is never touched. |

Both paths share these rules:
- **Triggers:** WeaponMechanics' reload events. Hide on a reload that really starts (`GunFx.reloadStarts`). Show on complete or cancel, or a tick later while `isReloading()` stays false (the Shotgun's per-shell reloads chain, so the bag stays hidden across shells).
- **Also show on:** slot change, death, quit, world change and plugin disable. Aiming mid-reload doesn't end WeaponMechanics' reload, so the bag stays hidden.
- **Off:** `gunfx.bag-hide: off` turns it off. The pack carries both paths, and each is inert without its trigger.

Also, `paper.json` gets `hand_animation_on_swap: false`, as `leather.json` already has. Today the cash dips every time its fill changes, and the look-alike's return to the real item must be instant.

## 4. Skin-ready guns (`tools/guns/dev/skinlint.js`)
A future skin can only recolor what comes from a palette key or the outline ink. The lint repaints each gun twice with every recolorable key, and the ink, set to wild colors, and compares each pass with the default paint:
- Any texel that changes in neither pass doesn't come from a recolorable key.
- Unless it is in a KEEP tile (aimed-through parts and the gun's own `keep` list), the lint reports it, listed by tile key and decal.

Fixes go in the gun modules or in pg.js's painter (a hard-coded color becomes a key or a derived tone). The hands are out of scope: they have their own texture.

## 5. Checks (cloud) and what needs the PC
**Cloud** (each one fails loudly):
- **Byte-identical without hands.** Before any gun opts in, every gun and skin builds byte-identical with the new kit.
- **`tools/guns/dev/hands.js`:** for every first-person composite of every gun, in both hands' contexts, each sleeve's far end is off screen at 4:3, 16:9 and 21:9, and each wrist is in front of the camera.
- **`lint.js`, `skinlint.js`.**
- **`preview.js` renders** (render-item.js gains near-plane clipping, so a sleeve passing the camera draws as the client draws it): hip, aimed and reload frames per gun.

**PC** (handoff README "What only the local session can do"):
- compile DonatingPhone with BagHide;
- build the pack;
- run `bots/run.js` `wm-ammo` (its counts change: new model files) and `gunskins`;
- add a bot check that the server inventory never changes during a reload;
- the client check: the bag slides out and back, a menu opened mid-reload, left-handed view, each gun's reload with hands, the Shotgun's loop.

## 6. Owner questions (PLAYTEST)
1. The hands at rest: keep the hip poses (hands show when the gun lifts), or raise them so the right glove peeks in like PG3D?
2. A gloved fist holding the bag, so both hands always show?
3. The Shotgun: keep the cant snapping on and off, add the eased entry and a closing pump (Java flags), or one whole-tube reload (a gameplay change)?
4. The Sniper Rifle: the right hand works the bolt after each shot?
5. The bag hide: the look-alike slide (default), or the cooldown dip with its white sweep on the offhand slot?
6. The glove and sleeve colors (charcoal gloves, navy sleeve, gold stripe); a glove cosmetic later?
