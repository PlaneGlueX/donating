# Gun revamp plan: Pixel Gun 3D style (2026-10-05)

## The owner's answers (2026-10-05)

1. The look: "i want to take the risk with the skins, cubic games does not go for small scale projects like this
   one". So the four guns are **recreations of real PG3D guns**, drawn by hand in our own model tool from public
   reference pictures (the owner's informed choice). Nothing is extracted from the game's files. "Pixel Gun" still
   stays out of the server's name, MOTD and store (trademark filings).
2. "wait to add new guns, just perfect the first few in the new style": only the four (pistol, SMG, shotgun,
   rifle), same internal WeaponMechanics titles (50_GS, Uzi, R9_0, AK_47), levels, prices and damage rule; new looks,
   names, sounds and animations.
3. The reload sweep: "keep the sweep for now, but if something needs to be in that area then remove it."
4. Gloves: later, "maybe different gloves with small bonuses like speed or something" (a gameplay perk: if ever
   sold, MONETIZATION.md).
5. More Java in DonatingPhone: OK.
6. "lets migrate to 26.1+ move all the plugins and other things to that new version, i want the animations"; then
   "make sure all the plugins can go on 26.3 before switching (i think 26.1 has more available versions)". So the
   server moves to the newest of Paper 26.1 / 26.2 / 26.3 that every plugin supports, on Java 25 (portable in
   tools\jdk25), and the pack requires 26.1+ clients.
7. Sounds: "get new ones, try to replicate the ones from pg3d": new sounds made by us (synthesized) to sound like
   PG3D's; no recordings taken from the game.
8. "nothings on minehut yet": the swap needs no migration of players' guns.
The owner: "switch over the version and get all files in order before executing and take control of my pc as the
last thing you need to do to continue ... if you need to take control then no need to ask me even if im in the
middle of something".

## What was built (2026-10-05)

- The server moved to **Paper 26.1.2** (build 74) on Java 25: the newest version every plugin has a build for
  (WeaponMechanics 4.3.1 stops at 26.1; MTVehicles, DecentHolograms, CoreProtect and Skript stop before 26.3). Your
  26.3 client joins through ViaVersion as before. The whole bot suite passes on it (1,453 checks).
- The four guns, by hand with the gun kit (`tools\guns\pg.js`), same titles, prices, levels, damage and fire rates:
  **Classic Pistol** (50_GS), **Machine Gun** (Uzi, an MP5-style SMG), **Shotgun** (R9_0, a pump gun, still two
  shots per pump), **AK-48** (AK_47, with its scope and laser).
- First-person animations, all drawn by the pack from a clock DonatingPhone starts (GunFx): a draw for the automatic
  guns, a reload for every gun (magazine out and in, the bolt or the slide, the shotgun a shell at a time), the
  slide's kick on the pistol, the kick and the pump on the shotgun (only the kick on the shot that doesn't pump),
  a flickering muzzle flash and kick while the automatic guns fire (only while a shot really goes off).
- New sounds for every shot, reload, slide, pump, bolt and draw, synthesized (`tools\sounds\make-gun-sounds.js`),
  timed to the frames.
- The reload sweep stays (answer 3). Gloves wait (answer 4).
- Left for you: how it all feels in game (PLAYTEST 179).

## More guns and gun skins (2026-10-06)

The owner: "try adding more guns from pg3d after you are done (make sure the ones you pick fit well with the game
style, and then balance it). See if you can revamp the gun skin system to have different skin variants of specific
guns aswell."
- Four more, picked for a grounded heist/cops city (no lasers or explosives) and balanced under the damage rule
  (PROPOSAL prices and levels): the **Old Revolver** ($20,000, L10), the **Brave Patriot** ($80,000, L25, a drum-fed
  automatic), the **Combat Rifle** ($160,000, L40, 3-round bursts) and the **Sniper Rifle** ($500,000, L70, 2 body
  shots and never 1, a scope glint others can see). The AK-48 stays the strongest automatic.
- **Gun skins**: 18 looks over the eight guns, colors only (the sights, lens and muzzle flash never change), worn per
  gun from the wardrobe, from crates and two level rewards, tradeable with serials. Each look is the gun's own
  texture repainted, with its own item definition; DonatingPhone puts it on the player's guns.
- Then the stretch goal, the **Veteran** (MG34, $800,000, L90): a Bren-style LMG, 9 rounds a second from a 50-round
  top magazine, 4.6 a body shot (5 shots), spread that grows as you hold the trigger, 22% slower walking while held.
- Left for you: PLAYTEST 180, 181 and 182 (the feel, the prices, the crate odds, the Veteran).

## The original plan (before the answers)

The owner: "im thinking of revamping the gun system to use guns from pixel gun 3d ... can you come up with a way
that could replicate/dupe the guns from pg3d and replace the existing guns with those? and if possible keep the
current gun plugin and use that as a base for the new revamped ones? if not let me know. just make plan for now".

Researched by a workflow (4 lenses: PG3D itself, the 26.3 client's item rendering in its bytecode, WeaponMechanics
4.3.1 in its jars, our art pipeline; then a completeness critic). Sources and evidence are in the session's
workflow results; the key ones are quoted below.

## The two answers

1. **Copying Pixel Gun 3D's guns: no.** Neither ripping them out of the game nor rebuilding them by hand with the
   same designs and names.
   - Cubic Games (owned by GDEV) claims every model, texture, animation and sound in its Terms
     (pixelgun3d.com/terms). Its Fan Content Policy (pixelgun3d.com/fan) bans any "material benefits" and "new
     software products or content" made from its materials. Donating sells ranks, keys and boosters.
   - Our pack goes to every player who joins, so copied art would be handed out publicly from a monetized
     server. Tebex's rules (AUP 1.4) ban stores whose sales infringe copyright.
   - Rebuilding a gun by hand from screenshots is still copying (a court said so about a Tetris clone that
     took no files, Tetris v. Xio, 2012).
   - "PIXEL GUN" has trademark filings: keep the name out of the server's name, MOTD and store.
   - What's free to use: the **style** (chunky, blocky, saturated "toy" guns with glowing parts), the **ideas**
     (weapon categories, rarities, ricochet, burning and so on) and real-world gun types. So the plan is
     **original guns in the PG3D style, with our own designs and names.**
2. **Keeping the current gun plugin (WeaponMechanics 4.3.1): yes.** It already does most of PG3D's gameplay for
   free (fire modes, recoil, spread, scopes, ricochet, piercing, burning, slowing, knockback, pump and bolt
   actions), and it has hooks for the rest. Replacing it would mean rewriting the ammo, the shops, the HUD ammo
   bar, the cops' guns and the tests, and gain nothing. (The alternatives are weaker: QualityArmory has fewer
   features, CrackShot is dead, and ModelEngine/BetterModel animate entities, not the gun in your hand.)

## What you'd get, and what you wouldn't

Think of each gun as a flip-book: a few still poses (idle, aiming, sprinting, reloading, empty) plus short
flip-book animations. The server says "reload started" once, and your game flips the pages on its own clock.

| You get | You don't get |
|---|---|
| New blocky, colorful models with pixel-art detail and glowing parts | The real PG3D guns or names |
| Reload and draw animations in first person (magazine out and in, slide back, a dip and rise), up to 20 frames a second | Animations other players see: they see the still poses (aim, sprint, reloading, empty), unless the optional packet layer below is built |
| A muzzle flash and kick in first person while you hold fire | A flash on exactly each shot for semi-auto guns (it shows while the button is held) |
| Gloved hands holding the gun in first person (optional) | Your skin's arms (Minecraft never draws the arm with an item held) |
| Glowing, animated energy parts (cores, cells, crystals) | Smoother than 20 frames a second (the game steps item animations once a tick) |
| Ricochet, piercing, burning, slowing, knockback, scopes, pump and bolt actions (all free in WeaponMechanics) | Wall-breaking or explosive guns (heists are built to be immune; "Not sold: explosives" stays) |
| Later, with a bit of Java: minigun spin-up, overheating, homing shots, chain lightning, beam and trail effects | Dual wielding (the offhand is the bag; only a two-gun look in one item) |

One side effect to accept: the reload animation runs on Minecraft's item cooldown, so the gun's hotbar slot shows
the white cooldown sweep while reloading. It doubles as a reload bar (WeaponMechanics' own paid add-on uses the same
sweep for reloads).

## How it works (the technical shape)

- **Gameplay**: one WeaponMechanics file per gun, as today (damage, fire rate, magazine, ammo type, recoil,
  projectile, firearm action). Our bullet tracers stay.
- **Poses everyone sees**: WeaponMechanics picks one model per state (Default, Scope, Sprint, Reload, No_Ammo)
  by writing a number on the item. Today's guns use Default, Scope and Sprint; the new ones add Reload and No_Ammo.
  (As built: Reload only. No_Ammo beats Scope and Sprint in WeaponMechanics, so an empty gun dropped out of the
  sights; it was left out after the review, 2026-10-05.)
- **Flip-book frames only you see** (checked in the 26.3 client's bytecode, not yet in game):
  - Reload and draw: a vanilla item cooldown, started by one packet when WeaponMechanics starts a reload or a
    draw. The pack picks the frame from how far the cooldown has run. A small DonatingPhone listener sets the
    cooldown from WeaponMechanics' own reload timing (WeaponReloadEvent carries it).
  - Moving parts (magazine, slide, recoil kick) are the same model moved by a per-frame transform (a 26.1+
    feature), so frames cost almost no pack size.
  - Fire: the model's first-person version shows a flash and a kick while the use key is held, flickering at
    random each tick, with a glow (light_emission).
  - Idle effects: animated textures on glowing parts.
- **Art**: a new generator for tools\guns. Each gun is drawn as a pixel sprite in text (e.g. 32 x 12 characters,
  each a color with a thickness), and the tool turns it into a blocky 3D model (about 27 boxes for a rifle,
  measured), its inventory icon and its aim points. Round parts (scopes, drums) stay hand-built boxes, shared
  attachments (scopes, muzzle brakes) are reused. Skins later (crate cosmetics) are recolors of the same sprite:
  no new geometry.
- **Optional later: a packet frame layer** in DonatingPhone (like the car camera's packet handlers) so other
  players see reloads and recoil too. It costs bandwidth for every animating player (an estimated 10-20 KB/s,
  unmeasured), so it's a separate phase with a measurement first.

## Roster (PROPOSAL; names are placeholders, the owner picks)

v1 replaces the four guns one for one, on the same ladder, prices, levels and damage rule (the strongest gun kills
an unarmored player in 4 shots and the best-armored in 10-12), so the economy, the story's "buy a gun" and the
cops don't change:

| Slot | Replaces | Level | Price | Idea |
|---|---|---|---|---|
| Pistol | .50 GS | 5 | $7,500 | "Sparkplug": a chunky semi-auto with a glowing cell for a magazine |
| SMG | Uzi | 15 | $45,000 | "Buzzsaw": a stubby full-auto with a drum on the side |
| Shotgun | R9-0 | 30 | $110,000 | "Thunderpump": an oversized pump with a wide muzzle |
| Rifle | AK-47 | 50 | $225,000 | "Kingmaker": the strongest, a long blocky rifle with a red sight |

v2 adds new categories (each an owner yes/no):

| Slot | Level | Price | Idea | Note |
|---|---|---|---|---|
| Sniper | 70 | $350,000 | "Longshot" | 2 shots unarmored, never 1 (d ≥ 10 and < 20). The scope's zoom is free; a scope picture over the screen is unverified (WeaponMechanics' overlay is paid) |
| Heavy | 90 | $500,000 | "Grinder": a minigun that spins up | Spin-up needs the DonatingPhone listener |

The Combat Knife, Bat, Dagger and the consumables stay as they are (they can get the new style later).

## Phases

0. **The owner's decisions** (below).
1. **Test the unknowns** (one session, local server and the owner's client by computer use):
   an active item cooldown doesn't stop shooting (single and full-auto); the cooldown and item-model parts
   survive WeaponMechanics' item rewrites; named skins work in free WeaponMechanics; ViaVersion passes the
   extra item data to 26.3; what a native 1.21.11 client does with the new 26.1+ model fields.
2. **The generator** (1-2 sessions): the sprite-to-model tool in tools\guns, and tools\render-item.js taught the
   new features (transforms, frames) so each design can be previewed as a picture before the client.
3. **One prototype gun, end to end** (1 session): its model, poses, reload and draw frames, flash, hands and
   the DonatingPhone cooldown listener, on a test copy of the .50 GS. **The owner judges it in the client.**
   Only if it's right does the rest follow.
4. **The v1 roster** (2-3 sessions): the four guns' models and weapon files, sounds, the shop icons, the cops'
   and bodyguards' guns, the pack build's gun numbers, the bot tests (wm-ammo, wm-damage, shop, cops, hits),
   DEPLOY.md.
5. **Optional, each on its own**: the v2 guns, the Java extras (spin-up, overheat, homing, chain lightning,
   beams), the packet frame layer for other players, gun skins as crate cosmetics (MONETIZATION.md).

The unlocks (`wpn::<W>`) and saved loadouts are keyed by the weapon's name. The server isn't on Minehut yet, so a
clean swap before launch needs no migration of real players' guns (to confirm).

## Decisions for the owner

1. **Original guns in the PG3D style** (our own designs and names) instead of PG3D's guns: OK?
2. **The roster**: the four replacements first (recommended), and do the sniper and the heavy come in v2?
3. **The reload sweep** on the hotbar slot (it doubles as a reload bar): OK?
4. **Gloved hands** in first person: yes or no?
5. **More Java in DonatingPhone** (the one approved plugin) for the animation clock and later the extras: OK?
6. **Players on Minecraft 1.21.11** (not 26.x): moving parts need 26.1+.
   - Cautious: keep 1.21.11 players; their guns show the still poses only (parts don't move for them).
   - Realistic: the pack needs 26.1+; native 1.21.11 players can't load it.
   (What a 1.21.11 client does with the new fields is tested in phase 1; it needs a 1.21.11 client, a download.)
7. **Sounds**: keep WeaponMechanics' gun sounds (merged and hosted, never sold), or new sounds (a download or an
   encoder needs your OK).
8. **Is anything live on Minehut yet?** (If not, the swap needs no migration.)

## What the research rests on

- PG3D's ownership and rules: pixelgun3d.com /terms and /fan quoted verbatim; Tebex AUP 1.4; US law: 17 USC
  102(b), 37 CFR 202.1, Tetris v. Xio (2012). Not legal advice.
- WeaponMechanics can't animate on its own: one static model per state, written with setCustomModelData(Integer)
  (which wipes any extra item data) on events only; muzzle flash, trails, third-person poses and the reload
  sweep are the paid WeaponMechanicsCosmetics (checked in the 4.3.1 jars).
- The client's animation tools (26.3 bytecode): `minecraft:cooldown` frames step once a tick (Cooldown.get passes
  partial tick 0), only the holder sees them, every cooldown draws the hotbar sweep; `keybind_down` for the flash;
  per-entry `transformation` (26.1+); models are boxes only; no arm with a held item.
- An item cooldown doesn't stop WeaponMechanics shooting into the air (bytecode: the client still sends the use packet,
  Paper fires the interact event before its cooldown check). It does stop a click on a block within reach (Paper marks
  the item use DENY, which WeaponMechanics ignores: found by the review, 2026-10-05), so DonatingPhone's GunFx turns
  that back to a normal click for a gun whose animation runs.
