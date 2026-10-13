# Minigun spec: the Hand Minigun (level 125, spin-up), tools\guns\minigun.js

Owner, 2026-10-06: a spin-up minigun at level 125, built AFTER the remake, in the new detailed style.
Spec writer, 2026-10-06. Scratch root = `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake`.
Work folder: `work\minigun\`. Nothing in the repo was touched.

**Decisions in one paragraph.** Recreate PG3D's **Hand Minigun** (a rifle-shaped four-barrel microgun: Military/Modern,
scope, box magazine, a documented 1.5 s spin-up) as **"Hand Minigun"** on the unsold WeaponMechanics title **FN_FAL**
(skin numbers **6 / 1006 / 2006 / 3006**). WeaponMechanics 4.3.1 has **no spin-up option**, but its full-auto task's rate
can be changed every tick: a new DonatingPhone class (**GunSpin**, next to GunFx) starts every burst at 0 rounds a second,
ramps to the file's 16/s over 1.2 s, keeps the spin for 1.5 s after release, and drives the barrel-spin frames through
GunFx clocks with two new flags (3 spin-up, 4 spin-down). Numbers (PROPOSAL): **3.4 a body shot, 16/s at full spin,
100-round belt of rifle rounds, 30% slower walking, $1,500,000, level 125**. At full spin it kills exactly as fast as the
AK-48 bare (6 hits / 4 hits, both 0.35 s), ties it bare up to 25 blocks and is slower in the best gear and past 25 blocks; from a cold start it
needs 0.95 s. A prototype of the model (proposed PG kit, density 4) is built and rendered: `work\minigun\mgproto.js`.

| File (work\minigun\) | What it shows |
|---|---|
| `z-hm_new.png`, `z-hm_old.png`, `z-hm_burn.png` | The reference (current look, the pre-24.3.5 look, PG3D's own Burning skin), decoded with alpha (headless Edge, `dec.html`), x4 |
| `hm_rot30.png`, `hmold_rot30.png` | The reference turned 30° to horizontal (for proportions) |
| `z-siege.png`, `z-gatling.png` | The candidates not chosen (Siege Minigun, Hand Gatling) |
| `final-sheet.png` | Reference / our icon / fp hip / fp firing / fp spin-up frame / aimed through the sight (lens removed: the client sees through it) / reload frame / third person spinning |
| `final-elevation.png` | Orthographic left side and top of the prototype (grid lines every 5 units; the first one is x = -15, the muzzle face; blue = y 0) |
| `final-*.png` | Every view and frame singly (`final-fp-flag3cd05` spin-up, `-flag4cd06` spin-down, `-flag2cd03` draw, `final-fpreload-cd075` reload, `final-tex.png` the 512² texture) |
| `spin-frames.png` | Spin-up frames (cooldown 0.9 / 0.5 / 0.1) and three full-spin random frames with the flash |
| `framings-tried.png`, `framing-chosen-fp.png` | First-person transforms tried; the chosen one |
| `ads-reflex-hood.png`, `ads-tall-riser.png` | The two sight designs (section 5.4) |
| `mgproto.js` (+ `prev.js`, `elev.js`, `sweep.js`) | The prototype module, its preview runner (builds with `work\style\proto\pg.js`, renders through render-item.js `--pack`), the elevation renderer, the spin-clearance check |
| `mgproto-tall.js` | The same with the tall-riser sight |
| `wm\FullAutoTask.txt`, `wm\ShootHandler.txt`, `wm\auto.json`, `wm\sim.js` | WeaponMechanics 4.3.1 bytecode read for the spin-up, its AUTO table, the fire-rate simulation |

---

## 1. The reference, and why

Candidates looked at (pixelgun.fandom.com, Category:Minigun and searches): Hand Minigun, Siege Minigun, Hand Gatling,
Warmaster, Heavy Cone Minigun; the rest are sci-fi or joke guns (Laser, Plasma, Impulse, Icicle, Cookie, Shuriken, Nail,
Minigun Shotgun/Pistol/Cannon) and out by the brief.

- **Hand Minigun (chosen).** Wiki: "an assault rifle with four minigun barrels and a scope", theme Military/Modern,
  80-round box magazine, "1.5 Second Spin Up", "might be based on Empty Shell's XM556 microgun". Grounded (a real
  handheld microgun class), and it has a **stock, a pistol grip and a box magazine**, so it is held like our rifles and
  fits the same first-person, third-person (along the arm) and icon framings; a robber can plausibly carry it. Its
  current look (24.3.5) is black with **cyan digital-camo plates**, an **orange window**, **red lights**, silver barrel
  clamps, a grey box magazine with an **X emblem**, a **mauve grip**: a good fit for the PG style (dark ink body,
  coloured plates, small lights) and distinct from every gun we sell (no other cyan/black gun).
- Siege Minigun (not chosen): an M134-style mythical gun, "Blue Archive and Military/Sci-Fi" theme, olive/yellow, three
  barrels "each with five sub-barrels", a cosmetic scope, a damage-on-reload gimmick, no stock or grip: a huge block
  that would fill the first-person screen and reads sci-fi. The classic silhouette, but a worse fit. Kept as the
  fallback if the owner wants the M134 shape.
- Hand Gatling (steampunk brass), Warmaster (fantasy), Heavy Cone (organic): out.

Name: **"Hand Minigun"** (PG3D's name, like Classic Pistol, AK-48, Veteran; never "Pixel Gun"). Hand-made from the
public icons; nothing extracted from the game. PG3D's Burning skin is theirs: don't copy it as one of ours.

## 2. The reference, part by part (current look; proportions from `hm_rot30.png`)

Reading the turned icon along the gun (it's a perspective 3/4 render: the front grows, ±1-1.5 units on anything read
off it): barrels about 2/3 of the length (perspective; ours 55%), receiver ~25%, a short stock ~8%.

1. **Barrel cluster**: four black barrels around a core (from the side three ridges show, with grey highlight lines in
   the grooves between them), turning as one.
2. **Clamps**: silver-white bands around the cluster: one at the receiver, a big stepped one at about a third of the
   way, a thin one at about two thirds, one right behind the muzzle cap. Stepped outlines (a "+" rounded by steps).
3. **Muzzle cap**: a big stepped black block with the four bores on its front face; the widest part of the gun.
4. **Receiver**: black, tall (about as tall as the cluster is wide), with cyan digital-camo plates (light cyan blocks
   on a darker cyan), an **orange window** on its side (an ammo counter look), vents.
5. **Sight**: a black box on the rear top with **red lights** at its ends (the "4x scope").
6. **Lower handguard** under the barrels from the receiver to the big clamp: black with a **cyan toothed comb** along
   its top edge and a **red light** at its front.
7. **Box magazine** under the receiver, ahead of the grip: a grey-blue steel cube (as tall as the receiver's lower
   half), a framed **X emblem** on its side, horizontal ribs on the next face.
8. **Pistol grip**: mauve/lilac, raked back, a small trigger guard in front.
9. **Stock**: short, black, with cyan accents and a pad.

### Colours (sampled from `a-hm_new.png`; `cols.js`, `warm.js`)
| Material | Sampled (dark -> light) | Palette key = base | Material (proposed kit) |
|---|---|---|---|
| Black body, cap, stock | #191a1b #2d2f31 #434548 | `recv` [26, 27, 32] | dark |
| Barrels | #191a1b #2d2f31, grooves #5d5e62 #74787c | `barrel` [30, 31, 35] + `steel` lines | dark |
| Clamps (silver) | #8b9095 #a5a7ad #bcbec1 #d6d9db | `steel` [196, 200, 208] | metal |
| Cyan camo | #021d2c #034560 #187792 #1892bc #2d8baa #31bdd9 | `cyan` [30, 160, 205] | metal (blocky grain = the digital camo) |
| Magazine steel | #1d2b30 #2f3640 #454d59 #4a5861 #636f79 #7b8993 | `magG` [70, 84, 96] | metal |
| X emblem / light ribs | #7b8d9c #8b97a3 | `magL` [139, 151, 163] | metal |
| Grip (mauve) | #292029 #41374a #574c5f #81748a | `grip` [87, 76, 97] | rubber (knurl) |
| Orange window | #bd7122 #c97524 #d98431 #dd8a39 | `org` [222, 138, 57] | glow |
| Red lights | rims #5e0001 #8c0400, #b81e27 #d41715 #d51622 | `red` [214, 26, 24] | glow |
| KEEP keys | | `bore` [8,8,10], `lens` [46,120,216], `lensB`, `dot` [255,40,40], `post`, `flash` [255,196,64], `flashCore` [255,248,210] | flat / glass / glow |

Skins (none yet): their themes would use recv, barrel, steel, cyan, magG, magL, grip. `org` and `red` are lights:
put them in the gun's `keep` list (the prototype does). The pre-24.3.5 look (pale blue digital camo, `z-hm_old.png`) is
a natural first skin idea ("Arctic"), as our own theme.

---

## 3. Our model (the prototype, `mgproto.js`; model units, muzzle toward -x, +z = the left side first person sees)

Overall x -15.0 (muzzle face) .. 30.6 (butt pad), y 0.0 (magazine floor) .. 15.2 (sight lights); every box inside
-16..32 (the flash drawn 8 back, moved out by its frames, like the Veteran's). 59 elements in `_full` (+ emissive
patches), texture 512² at density 4. **Spin axis: y AY = 8.6, z AZ = 8.0, along x.**

### 3.1 Parts
| Part | Moves | Contents |
|---|---|---|
| `body` | static | rotor housing, receiver, rail, sight, handguard + comb, trigger, grip, red lights |
| `spin` | **turns about the axis** | core, 4 barrels, 4 clamps, muzzle cap, front plate, bores |
| `mag` | reload | box magazine + feed lip |
| `stock` | hidden while aiming | stock, bottom step, butt pad |
| `flash`, `flash2` | hidden, shown by fire frames | the muzzle flash (two sizes), centred on the axis |

### 3.2 Boxes (from `mgproto.js`; the builder keeps the numbers that matter: the axis, the sweep clearances, the sight)
- **Barrels** (spin): `D = 1.5` (centre distance from the axis), half size `H = 0.85` (1.7 wide), x -12.4 .. 10.6, at
  12, 3, 6 and 9 o'clock (a "+" at rest: from the side three ridges show, like the reference); a core 1.6² (`bore`);
  each barrel's long faces carry one 0.25 `steel` line near the outer edge (PG3D's grey grooves) and seams at x -1, 6.
- **Clamps** (spin, `steel`): each a stepped octagon of three boxes, arms 2r long and 2w wide plus a square 2c
  (`ring(x0, x1, r, w, c)`): rear x 8.2..9.8 (r 2.85, w 1.3, c 2.25), **middle x 0.6..2.8 (r 2.95, w 1.4, c 2.3, a seam
  at 1.7)**, thin third x -5.6..-4.6 (2.75 / 1.25 / 2.15), front x -11.0..-9.2 (2.9 / 1.35 / 2.3). Dark bolt texels
  on the rear one.
- **Muzzle cap** (spin, `recv`): x -14.6..-11.0, r 3.15 / w 1.55 / c 2.5, three vertical slots on its sides; a smaller
  front plate x -15.0..-14.6 (2.4 / 1.2 / 2.0); on its west face four `bore` squares 1.1² at the barrel centres and a
  0.7² `steel` hub.
- **Rotor housing** (static, `recv`): x 9.9..12.7, AY ± 3.2 x AZ ± 3.2 (wider than the receiver: the chunky step where
  the barrels enter), cyan corner plates, 2x2 steel rivets, holes on top. The barrels end inside it.
- **Receiver** (static, `recv`): x 12.7..23.2, y 4.8..11.6, z 5.9..10.1 (6.8 tall, 4.2 thick), seams at x 16, 19.6 and
  y 8.4; decals: two cyan bands (upper front x 12.9..19.4 y 10.4..11.4, lower rear x 16.2..23 y 7.2..8.2), a zig fin
  vent with cyan fins (x 13..15.7, y 5.4..8.1), the **orange counter window** (glow, emissive, x 19.9..22.8,
  y 8.8..11.2), two slots, four steel rivets along the bottom, holes on the top front.
  **Builder**: make the cyan plates real thin boxes (0.05 proud) with heavy blocky grain (p ~0.35, 2x2 cells) so they
  read as PG3D's digital camo; the bands in the prototype are flat.
- **Rail** (static): x 12.9..23.0, y 11.6..12.1, z 6.9..9.1, dark with steel teeth on the sides only (a bright top
  glared through the sight).
- **Sight** (static): a short reflex hood on a mount at the rear (section 5.4): hood x 19.0..20.6, window y 12.4..14.2
  (SY 13.3 ± 0.9), z AZ ± 1.1, walls 0.5 (thin them to 0.4), roof to SY + 1.5, base down to the rail; `lens` on the
  hood's front face (west only: see-through from inside in the client), the `dot` (glow) at x 19.3..19.4 on a thin
  `post`; two red light blocks on the roof. Give it a wider mount (x ~17.4..21.0, 0.3 tall) so the side view isn't a
  chimney.
- **Handguard** (static, `recv`): x 3.0..12.7, y 3.0..**5.35** (top = AY - 3.25: below the clamps' sweep), z 6.2..9.8,
  a cyan band, a slot, two red LEDs on its front face (emissive) and red light blocks on both front corners. **Comb**:
  x 3.0..8.0, y 5.35..**6.05** (= AY - 2.55: below the barrels' sweep; it must end before the rear clamp at 8.2 and start
  after the middle clamp at 2.8), cyan ribs (teeth).
- **Trigger guard** x 18.6..20.2 (y 3.3..4.8), trigger (steel).
- **Grip** (`grip`, rubber knurl): x 20.0..22.6, y 0.7..4.8, z 6.7..9.3, raked 15° about [21.3, 4.8, 8]; black cap.
- **Magazine** (`magG`): x 12.9..18.5, y 0.0..4.8, z 5.6..10.4 (4.8 wide: wider than the receiver, like the reference's
  cube), a seam at y 4.0; on both sides an inset frame with a 9x9-texel **X** stamp (`magL`) and two vertical grooves;
  three horizontal grooves on the front and back faces; a black feed lip on top (y 4.8..5.1).
- **Stock** (`recv`): x 23.2..29.6, y 5.4..10.8, z 6.4..9.6, cyan strips top and bottom with two black insets between,
  a rail on top; a bottom step x 25.4..29.6 (y 4.2..5.4); butt pad x 29.6..30.6 (y 4.0..11.2, `grip`, grooves).
- **Flash**: core x -18.6..-15 (AY ± 2.3), jet to -23, a cross of spikes ±5.6, an X ±4.6 (45° about x); flash2 smaller.
  Drawn 8 units back (FX), moved out by `rig({ t: [-8, 0, 0] })` in its frames.

### 3.3 The spin clearance (must hold; a build-time check is cheap)
The spin part turns through every angle, so each spin box sweeps a circle of radius r = the farthest corner from the
axis: barrels **2.50**, rear clamp 3.18, middle 3.27, third 3.04, front 3.25, cap **3.54**, front plate 2.83. A static
box overlapping a spin box in x must stay at least that far from the axis (unless the axis passes through it: the
rotor housing the barrels end in). `work\minigun\sweep.js` checks it on a build (0 collisions now; the first draft's
handguard top at AY - 3.1 cut the rear clamp's 3.18). Suggest adding the same check to pg.js for any part declared as
spinning (like its -16..32 check).

---

## 4. Frames

Every frame is the existing kit's composite/cooldown/firing/flag machinery; the only new thing is a part turned about
an axis: `turn(a) = rig({ rot: [[[1, 0, 0], a]], pivot: [0, AY, AZ] })` on `spin`.

| Number | First person | Elsewhere (third person, ground, frames) | Icon |
|---|---|---|---|
| 6 (Default) | flag 2: draw (40 frames) / flag 3: spin-up (24) / flag 4: spin-down (30) / else `firing` (fire held + flag 0) full spin, else rest | flags 0, 3 or 4: the cluster at a random angle each frame (`minecraft:time` random, wobble false, 6 angles), else still | still `_full` |
| 1006 (Scope) | flag 3 spin-up / flag 4 spin-down / full spin (k 0.4, flash2 only), stock hidden | same | same |
| 2006 (Sprint) | flag 4 spin-down on the sprint pose, else the sprint pose | same | same |
| 3006 (Reload) | cooldown 90: the reload | same | same |

The third-person spin works because flags live on the item (every viewer gets them); `minecraft:cooldown` and
`keybind_down` are the viewer's own, so third person must never read them. Use a custom `select` on display_context
(fp cases, a `gui` case = still, fallback = the flag dispatch) instead of `byContext`.

- **Full spin** (fire held + flag 0): 6 poses, the cluster at 0/15/30/45/60/75° (the "+" repeats every 90°, so these are
  all different; a fresh one each frame reads as a fast blur), the flash big / small / none in turn, a small steady kick
  (0.5 back, 0.8° up at the shoulder pivot [21.3, 5.4, 8], jitter ±0.06).
- **Spin-up** (flag 3, 24 frames over the clock): angle = 360·p² (one turn, ending at 30° a tick, under the 45° a tick
  where a 90°-symmetric cluster would seem to turn backwards); each frame nests `firing()` at its angle, so the flash
  flickers on frames where rounds really go out (past fire-at).
- **Spin-down** (flag 4, 30 frames): angle = 450·(2p - p²) (30° a tick down to 0).
- **Draw** (flag 2, 40 ticks): swings up from below (0-0.4), sags (0.38-0.54), turns its left side to you (0.52-0.62),
  a test spin of the barrels 300° easing out (0.6-0.92), level by 0.96. The draw sound's whir at 1.2-1.85 s.
- **Reload** (90 ticks): roll the top toward you (0-0.1), the catch tug (0.1-0.15), the box drops out down and toward
  you (0.15-0.32), gone (0.32-0.46), a new one comes up (0.46-0.6), seated (0.6) and slapped (0.64), the gun turns its
  left side (0.68-0.74) and the cluster is ratcheted a quarter turn twice by hand (0.74-0.78, 0.81-0.85), level by 0.97.
  **Builder:** at rest the box sits below the screen's bottom edge in first person (`final-fpreload-cd075.png` shows
  nothing happening): the reload must lift and roll the gun more (like the AK's mag and BOLTPOSE frames) so the swap
  is seen. Sounds: `mag_out` delayBeforePlay 13 (p 0.14), `mag_in` 54 (0.6, its slap 4 ticks later), `ratchet` 67
  and 74.

Display (prototype starting points, tune in renders and the client):
firstperson rot [0, -66, 0], tr [-1.0, 2.2, -2.0], scale 0.42 (the cluster runs from the lower right to just short of
the crosshair: `framing-chosen-fp.png`; -74°/-76° hid the cluster end-on); thirdperson [0, -90, 0] [0, 1.2, -11] 0.66
(the grip in the hand); gui [0, 180, -30] [0.6, 0, 0] 0.36 (the muzzle touches the slot's corner: 0.34 and tx 0.4);
ground [0, 0, -45] [-1, 7, 0] 0.7; fixed [0, 0, -45] [-0.5, 0.5, -1] 0.7; sprint [-12, -44, 18] [-3.2, 1.4, -2.2] 0.42.
ads = `aim({ sightY: 13.3, rearX: 20.6, rearDepth: 0.45, scale: [1.6, 2.4, 2.4] })` = rot [0, -90, 0],
tr [-8.96, -4.4, -15.84]. The sight is centred on z = 8, so pgGun's mirrored state is right for both hands (no
Veteran-style per-hand fix).

---

## 5. The spin-up (WeaponMechanics 4.3.1 + DonatingPhone)

### 5.1 What WeaponMechanics 4.3.1 can do (javap, `wm\*.txt`)
- **No spin-up setting.** The keys it reads under Shoot are Trigger, Projectile_Speed, Projectiles_Per_Shot,
  Fully_Automatic_Shots_Per_Second, Burst, Delay_Between_Shots, Selective_Fire, Spread (with Changing_Spread), Recoil,
  Mechanics, Ammo_Per_Shot, Consume_Item_On_Shoot, Durability, Haptic, Offsets, Reset_Fall_Distance; the delays are
  Delay_Between_Shots, Shoot_Delay_After_Scope, Shoot_Delay_After_Reload, Weapon_Equip_Delay. No "Delay_Before_Shooting",
  no ramp. (Changing_Spread grows spread per shot, nothing else.)
- **But the full-auto rate is live.** `ShootHandler.fullAutoShot` fires `WeaponFullAutoEvent(title, stack, shooter,
  slot, shotsPerSecond)` (cancellable, **`setShotsPerSecond`**), then builds `FullAutoTask(..., event.getShotsPerSecond())`
  (rate = sps % 20, perShot = sps / 20), runs it every tick from the next tick (`runAtFixedRate(1, 1)`) and stores it in
  `HandData.getFullAutoTask()`. Each tick the task fires `perShot + AUTO[rate][currentTick]` rounds (AUTO: 21 rows of
  20 ticks, `wm\auto.json`; currentTick cycles 0..19) and has public **`setRate(0..20)`** / `setPerShot(n)` (throws
  outside those).
- **Never cancel the event**: a cancelled WeaponFullAutoEvent makes `fullAutoShot` return false and shootWithoutTrigger
  falls through to `burstShot` and then **`singleShot`** (a shot anyway). Set 0 instead: rate 0 fires nothing
  (AUTO[0] is all zeros) and `consumeAmmo(stack, title, 0)` returns true with rounds left, so the task just idles while
  the trigger is held. An empty magazine never gets that far (shootWithoutTrigger starts a reload first).
- The task ends on its own when the trigger lets go (`keepFullAutoOn` -> `isRightClicking`: the last right-click
  within 215 ms, or ping + 15 ms past 215 ping: about 4 ticks after release, as for every automatic gun), when the gun
  leaves the hand, when a reload starts, or when the magazine runs dry (then it starts the reload). Sprinting fails the
  Shoot trigger's `Sprinting: DENY` circumstance and ends it too.

### 5.2 GunSpin (DonatingPhone, new; gameplay in Java because only Java can reach FullAutoTask)
Config under the gun's gunfx entry (the max rate stays in the WeaponMechanics file, read from the event):
```yaml
gunfx:
  guns:
    FN_FAL: { shot: 0, draw: 40, fire: 4, spin: { up: 24, down: 30, fire-at: 0.3, min-rate: 5, sound-range: 32 } }
```
State per player (only the held spin gun): `s` (0..1, the spool), `held`, `max` (the event's shots a second).
`rate(s) = s < fireAt ? 0 : round(minRate + (max - minRate)·(s - fireAt)/(1 - fireAt))`.
- `WeaponFullAutoEvent` (HIGHEST, ignoreCancelled; a spin gun, a Player): `max = e.getShotsPerSecond()` (16 from
  FN_FAL.yml); `e.setShotsPerSecond(rate(s))`; held = true; start the **spin-up clock** (GunFx `flagClock`, flag 3,
  ticks = max(1, round((1 - s)·up)); none when s = 1); play `donating.gun.minigun.spinup` on the player (World#playSound
  on the entity, PLAYERS, volume 1, pitch 0.85 + 0.3·s).
- **Every tick** (a task only while some state exists): look up `HandData h = getPlayerWrapper(p).getMainHandData()`,
  `FullAutoTask t = h.getFullAutoTask()`. Held = t != null, the held item is this title, not reloading.
  - held: s = min(1, s + 1/up); `t.setRate(r % 20); t.setPerShot(r / 20)` (r = rate(s)).
  - just let go (held was true, the task is gone, not reloading): held = false; stop the spin-up sound for everyone
    within sound-range (`stopSound(key, PLAYERS)`), play `spindown` (volume s); take flag 3 off, start the **spin-down
    clock** (flag 4, ticks = max(1, round(s·down))).
  - not held: s = max(0, s - 1/down); at 0 drop the state.
- `WeaponReloadEvent` for the spin gun: s = 0, drop the state, no spin-down clock (GunFx's own handler then starts the
  reload clock, which ends the spin flags). Switching items, death, quit, world change, plugin disable: drop the state,
  take flags 3 and 4 off.
- Take the old spin flag off **before** starting the other clock (flagClock only unflags the previous index on its next
  tick, and for that tick flag 3 would win over flag 4).
- GunFx changes: `Gun` gets `spin` (null when absent); `onEquip` flags the draw (2) when `g.shot > 0 || g.spin != null`;
  `onScope`'s mid-draw rule too; `status()` prints `spin=up/down/fire-at/min-rate`; `/dphone gunfx spin <player>` prints
  s, held, the live rate (tests). Wrap every WeaponMechanics call like GunFx does (`RuntimeException | LinkageError`:
  on failure the gun just fires at its file's 16/s, never not at all).
- Cost: one map lookup and a setRate per spinning player per tick; one cooldown packet per spin-up and spin-down; flag
  writes only when they change (item updates to the holder and an equipment packet to viewers, a few per burst).
- The hotbar shows the cooldown sweep during the spin-up (1.2 s) and spin-down (1.5 s), like the other guns' draws.

### 5.3 What it plays like (simulated on WeaponMechanics' AUTO table: `wm\sim.js`)
| | first round | rounds in 1 s / 2 s / 3 s | unarmored kill (6 hits) | best gear (11 points, 18 hits) |
|---|---|---|---|---|
| From cold (16/s) | tick 8 (0.4 s) | 6 / 22 / 38 | 0.95 s | 1.70 s |
| Re-pressed 0.5 s after letting go (s 0.67) | tick 1 | 16 / 32 / 48 | 0.35 s | 1.10 s |
| At full spin | tick 1 | 16 / 32 / 48 | **0.35 s** | **1.10 s** |
| AK-48 for comparison (10/s, 5.5) | tick 1 | | 0.35 s (4 hits) | 1.05 s (11 hits) |
| At 18/s instead, from cold / full spin | tick 8 | 9 / 27 / 45 | 0.80 s / 0.30 s | 1.50 s / 0.95 s |

The PG3D tip "before you turn a corner, make sure to finish revving it up" becomes "hold the trigger a moment early":
the first 0.35 s spend no ammo. No separate rev button in v1 (left-click is the aim and can't be held; sneak-to-rev is
possible later with a flag and no clock, but sneaking already slows you).

### 5.4 The sight (two designs prototyped)
Looking through any sight over a 6.5-wide spinning cluster: a window big enough to read the world will show the top of
the cluster below the dot (the line from the eye over the window's bottom edge drops 0.06-0.16 a unit and the cap's top
is 3.5 over the axis 35 units ahead). **Recommended: the short reflex hood** (1.6 long, window 2.2 x 1.8, SY 13.3,
rearDepth 0.45: `ads-reflex-hood.png`): a clear window, the dot over the barrels, the top of the spinning cluster and
the flash under it (intended: you see it spin). The alternative, a tall riser with a 5.2-long tube (SY 14.4,
`mgproto-tall.js`, `ads-tall-riser.png`), keeps the cluster out of view but makes a tunnel. The prototype renders draw
the lens solid (render-item doesn't cull back faces); `finalnolens-*` removes it to show what the client sees.

---

## 6. Numbers (all PROPOSAL)

**Cautious (recommended) vs realistic** (CLAUDE.md asks for both on key decisions):
- Rate at full spin: **16/s** (the AK-48 stays the fastest killer at equal aim: a tie bare under 25 blocks once spun,
  faster in the best gear and past 25 blocks) / 18/s (faster than the AK-48 once spun: breaks "the AK-48 on top up
  close": owner's call).
- Walking while spinning: **only the item's 30%** / an extra 15% while the barrels turn (a GunSpin attribute modifier).
- Rifle ammo carry: **raise `ammo::rifle::max` 300 -> 400** (four spare belts, 31 s of fire with the loaded one; harmless
  for the AK-48, Combat Rifle, Sniper Rifle and Veteran) / keep 300 (three belts).

Damage (WeaponMechanics' model: D = base × (1 + Per_Armor_Point·armor + hit spot), clamped 20-300%; Per_Armor_Point
-6%, head +15%, back +5%, feet -5%):
| | < 10 blocks | 10-25 | 25-50 | > 50 |
|---|---|---|---|---|
| Hand Minigun (3.4; dropoff 10 -0.6, 25 -1.2, 50 -1.9), hits bare / best gear | 3.4: 6 / 18 | 2.8: 8 / 22 | 2.2: 10 / 27 | 1.5: 14 / 40 |
| ...ticks to kill at full spin, 16/s (bare / best) | 7 / 22 | 9 / 27 | 12 / 33 | 17 / 49 |
| AK-48 (5.5), hits | 5.5: 4 / 11 | 4.6: 5 / 13 | 3.7: 6 / 16 | 2.8: 8 / 21 |
| ...ticks to kill, 10/s | 7 / 21 | 9 / 25 | 11 / 31 | 15 / 41 |

(Ticks from the first shot's tick, on WeaponMechanics' AUTO table. The first band's -0.6 is deliberate: at -0.5
(2.9, 7 hits) the minigun at full spin killed a tick faster than the AK-48 at 10-25 blocks.)

The rule holds: no non-sniper kills bare in fewer than 4 body shots (6; head 3.91, still 6); the AK-48 is the strongest
a hit; at 16/s the AK-48 is never slower at equal aim (ties bare under 25 blocks, faster everywhere else). The minigun's edge: a 100-round belt (3.3 AK magazines, no
reload mid-fight, crowds and cop waves: 32-HP difficulty-4 cops take 10 hits = 0.6 s each at full spin). Its costs: the
spin-up, 30% slower walking (sprinting about 3.9 blocks a second against the fastest cop's 5.0), spread, a steep
dropoff, ammo ($300 a belt), a 4.5 s reload. `Armor_Damage: 2` (not 3: 16 hits a second would wear gear 60% faster
than the AK-48).

FN_FAL.yml (rework of the unsold default, like 357_Magnum/STG44/M4A1/AX_50/MG34; drop Selective_Fire,
Delay_Between_Shots, Firearm_Action, Cosmetics, Trail and Show_Time):
```yaml
FN_FAL:
  Info:
    Weapon_Item:
      Type: "FEATHER"
      Name: "<gold>Hand Minigun"
      Lore:
        - "<gray>Four spinning barrels on a rifle frame."
        - "<gray>Spins up before it fires; a 100-round belt."
        - ""
        - "<gray>Weapon Statistics <gold>-<gray> 52.2"
        - "<gold>➣<gray> 50 <gold>⟸ <gray>Accuracy"
        - "<gold>➣<gray> 50 <gold>⟸ <gray>Damage"
        - "<gold>➣<gray> 44 <gold>⟸ <gray>Range"
        - "<gold>➣<gray> 79 <gold>⟸ <gray>Fire Rate"
        - "<gold>➣<gray> 30 <gold>⟸ <gray>Mobility"
        - "<gold>➣<gray> 60 <gold>⟸ <gray>Control"
      Unbreakable: true
      Hide_Flags: true
      Attributes:
        - "movement_speed -0.03"      # 0.1 - 0.03 = 0.07: 30% slower while held (the Veteran: -0.022)
      Deny_Use_In_Crafting: true
    Weapon_Info_Display:
      Action_Bar:
        Message: "<gold>Hand Minigun<firearm_state> <gray>«<gold><ammo_left><gray>»<gold><reload>"
    Weapon_Get_Mechanics:
      - "Sound{sound=item.armor.equip_chain, volume=0.65, pitch=0.7, listeners=Source{}}"
    Weapon_Equip_Mechanics:
      - "CustomSound{sound=donating.gun.minigun.draw, volume=0.5, noise=0.05, listeners=Source{}}"
    Weapon_Equip_Delay: 40
    Cancel: { Drop_Item: true, Swap_Hands: true, Arm_Swing_Animation: true, Break_Blocks: true }
  Skin: { Default: 6, Scope: ADD 1000, Sprint: ADD 2000, Reload: ADD 3000 }
  Projectile: "donating_rifle_bullet"
  Shoot:
    Trigger: { Main_Hand: "RIGHT_CLICK", Off_Hand: "RIGHT_CLICK", Circumstance: { Swimming: "DENY", Sprinting: "DENY" } }
    Projectile_Speed: 80
    Fully_Automatic_Shots_Per_Second: 16   # at full spin; DonatingPhone's GunSpin starts every burst at 0 and ramps here
    Spread:
      Base_Spread: 4.6
      Modify_Spread_When: { Zooming: 70%, Sneaking: 60%, In_Midair: 200% }
      Changing_Spread: { Starting_Amount: 0, Reset_Time: 10, Increase_Change_When: { Always: 0.12 }, Bounds: { Minimum: 0, Maximum: 2.4 } }
    Recoil: { Mean_X: 0.15, Mean_Y: 0.45, Variance_X: 0.35, Variance_Y: 0.2, Speed: 3.0, Damping: 0.06, Damping_Recovery: 0.12, Smoothing: 0.4, Max_Accumulation: 10.0 }
    Mechanics:
      - "CustomSound{sound=donating.gun.minigun.shoot, volume=6, noise=0.05}"
  Reload:
    Trigger: { Main_Hand: "DROP_ITEM", Off_Hand: "DROP_ITEM" }
    Magazine_Size: 100
    Ammo: { Ammos: ["Donating_Rifle"] }
    Reload_Duration: 90
    Start_Mechanics:
      - "CustomSound{sound=donating.gun.minigun.mag_out, volume=0.5, noise=0.05, delayBeforePlay=13}"
      - "CustomSound{sound=donating.gun.minigun.mag_in, volume=0.5, noise=0.05, delayBeforePlay=54}"
      - "CustomSound{sound=donating.gun.minigun.ratchet, volume=0.5, noise=0.05, delayBeforePlay=67}"
      - "CustomSound{sound=donating.gun.minigun.ratchet, volume=0.5, noise=0.05, delayBeforePlay=74}"
  Damage:
    Base_Damage: 3.4
    Armor_Damage: 2
    Dropoff: ["10 -0.6", "25 -1.2", "50 -1.9"]
  Scope:
    Trigger: { Main_Hand: "LEFT_CLICK", Off_Hand: "LEFT_CLICK" }
    Zoom_Amount: 1.25
    Shoot_Delay_After_Scope: 10
    Mechanics: ["CustomSound{sound=scope.in, volume=0.5, noise=0.1, listeners=Source{}}"]
    Zoom_Off: { Mechanics: ["CustomSound{sound=scope.out, volume=0.5, noise=0.1, listeners=Source{}}"] }
```
(Write it in the repo's block style with the Donating comments like MG34.yml; the flow style above is for brevity.)

core.sk (after MG34): `shop::weapons` + `"FN_FAL"`; `wpn::FN_FAL::name` "Hand Minigun", `kind` "Minigun", `price`
1500000, `ammo` "rifle", `mag` 100, `model` 6, `level` 125. Price reasoning: between the Viper ($1.25M, L110) and the
Riviera ($2M, L130); tools\progress-sim.js has the median player at level 125 at 34.4 h (day 18) and buying the Viper at
24.5 h and the Riviera at 38.3 h: run it after the change and expect the minigun around 35 h. Never in cops' or NPCs'
hands (like the Sniper Rifle).

## 7. Sounds (tools\sounds\guns\minigun.js, events `donating.gun.minigun.<what>`)
| Event | Length | What | Played by |
|---|---|---|---|
| shoot (3 variants) | ~60 ms | a short punchy "dut" with a metallic tail, lighter than the AK's (16 a second) | WM Shoot.Mechanics, volume 6 |
| spinup | 1.2 s | motor whine rising (pitch ~0.4 -> 1.0) with gear clatter | GunSpin at each burst start; stopped on release |
| spindown | 1.5 s | falling whine, slowing clicks | GunSpin on release, volume × s |
| draw | 2.0 s | the heavy lift (0.3 s), the settle (0.8 s), a short test whir (1.2-1.85 s) | Weapon_Equip_Mechanics |
| mag_out / mag_in | 0.5 / 0.6 s | catch + can drop; hook, latch, slap | Reload.Start_Mechanics |
| ratchet | 0.3 s | a heavy click and a quarter-turn whir | Reload.Start_Mechanics ×2 |

build-pack.js lowers the WM-played ones (add FN_FAL.yml to `GUN_SOUND_FILES`); the GunSpin-played spin sounds aren't
in the YAML, so give them their final loudness in the module/sounds.json (about the 0.65 the others end at).

## 8. Wiring checklist (what the Veteran's commit touched, plus the spin)
- `tools\guns\minigun.js` (from `mgproto.js`, on the remade kit), `make-item-art.js` GUNS `minigun: [6, 1006, 2006, 3006]`.
- `build-pack.js`: `OUR_FEATHER_NUMBERS` + 6, 1006, 2006, 3006 (WeaponMechanics' pack has 6/1006/2006 for its FN FAL;
  3006 would otherwise fall to 2017's model); `GUN_SOUND_FILES` + `assault_rifles/FN_FAL.yml`.
- `server\plugins\WeaponMechanics\weapons\assault_rifles\FN_FAL.yml` (section 6); `core.sk` (section 6, and
  `ammo::rifle::max` if the owner says 400).
- DonatingPhone: `GunSpin.java` + GunFx changes (5.2); `plugin\resources\config.yml` gunfx FN_FAL line; rebuild the jar.
- `tools\sounds\guns\minigun.js`, `make-gun-sounds.js`.
- Tests: wm-ammo (a GUNS line `{ w: 'FN_FAL', file: 'weapons/assault_rifles/FN_FAL.yml', type: 'rifle', mag: 100,
  wrong: 'light', tracer: 'rifle', cmd: 7002 }`, the pack's numbers; **spin**: no bullet in the first 6 ticks of a held
  trigger from cold, 30-45 bullets in 3 s held, firing again within 2 ticks when re-pressed 0.5 s after letting go,
  a reload resets it), wm-damage (3.4 bare -> 6 hits, 1.16 in the best gear -> 18), gunfx (the status line with
  `spin=24/30/0.3/5`, flags 3 then 4 on a held-and-released trigger, the draw's flag 2), shop (`CELL[12]`: its name,
  $1,500,000, "Needs level 125"), levels (/levels lists it at 125), menus, crates, tabcomplete, story's gun check,
  inventory-lock, death.
- CLAUDE.md ("More Pixel Gun 3D guns" or its own section; GunFx flags 3/4; GunSpin), PLAYTEST (a client check: the spin
  in first and third person, the sight picture, the feel of the spin-up), DEPLOY (the weapon file and the jar).
  MONETIZATION.md: nothing (not sold for real money).

## 9. Checks for the builder
1. `sweep.js`-style clearance: 0 static boxes inside any spin box's sweep (3.3).
2. Renders: gui (the whole gun inside the slot), fp hip at rest and firing (`--fire --time v`), spin-up and spin-down
   frames (`--flag 3|4 --cooldown v`), draw (`--flag 2`), the reload's mag swap visible, ADS with the dot on the
   crosshair (render-item draws the lens solid: check without it), third person with `--flag 0 --time v` (spinning)
   and without (still), and the left hand (fpl).
3. The spin reads as turning one way in the client at 20 fps (the 24/30 frame curves never pass 30° a tick); full spin
   reads as a blur, not a shake (if it shakes, drop the kick jitter, keep the angles).
4. In the client: the cooldown sweep during spin-up/down is acceptable; nothing in hand flickers when only the key is
   held on loot (flag 0 gates the flash); other players see the barrels spin while it fires.
5. Bots: the spin numbers in 5.3 (`wm\sim.js` reproduces them from WeaponMechanics' own AUTO table).

## 10. Owner questions
1. The Hand Minigun (rifle-shaped, chosen) or the Siege Minigun (an M134 block) as the model?
2. 16/s (the AK-48 stays on top) or 18/s at full spin?
3. Spin-up 1.2 s with the first round at 0.35 s, spin-down 1.5 s: OK? (PG3D's is 1.5 s.)
4. Rifle ammo carry 400 (recommended) or 300?
5. $1,500,000 at level 125?
6. The sight: the reflex hood that shows the barrels spinning under the dot (recommended), or the tall tube that hides
   them?
