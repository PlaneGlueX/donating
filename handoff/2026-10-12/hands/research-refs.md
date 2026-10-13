<!-- wf_7c6d8b83-7b2 research:refs: an agent's final report, kept for the cloud session -->

# CHOREO.md: hands in first person, the bag during reloads, and every gun's choreography

File: `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\hands\refs\CHOREO.md`

This covers the owner's asks of 2026-10-12 (PLAYTEST 183): "redo the animation to include both hands if possible ... hide the heist bag while the reload animation plays", "add a reload animation to the shotgun similar to the other guns", and "most of these guns will have additional skins in the future".

The scratch root is R = `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake`. The repo was only read. The renders come from the built pack (`extras\packs\Donating-pack.zip`, 2026-10-12) and from a throwaway mock in R\hands\refs\mock\.

## 0. In short (for the owner)

- **Both hands can be done.** Minecraft draws no arm while the hand holds an item. So the hands become part of each gun's first-person model: dark tactical gloves and a navy jacket sleeve. An item model can't read the player's skin, but gloves work with every skin.
- **Right hand:** always on the gun (hip, aimed, sprinting, drawing, firing, reloading).
  - It sits mostly behind the grip, so the grip's art and every gun skin stay visible.
  - Its sleeve runs to the bottom-right corner, like PG3D's.
- **Left hand:** shows during the reload, while the bag drops out of view and comes back at the end.
  - Hiding the bag doesn't touch the inventory. DonatingPhone puts a cooldown on the bag item for as long as the reload lasts.
  - The pack draws the bag lowered and then gone while that cooldown runs. The 26.3 client code supports this.
- **Shotgun:** a new reload in PG3D's style.
  - The gun tips its loading port toward you.
  - The left hand thumbs the shells in one at a time.
  - The reload ends with the left hand racking the pump.
- **Between shots:**
  - The Shotgun's pump keeps racking by itself. The bag is in that hand, and dropping it every second shot would flicker.
  - The Sniper Rifle's bolt is worked by the **right** hand, so the bag stays.

| Decision | Cautious | Realistic (recommended) |
|---|---|---|
| Hands overall | Right hand on every gun; left hand only in reloads | Same, plus a gloved fist holding the bag at all times, so both hands always show |
| Hiding the bag | A cooldown on the item types `minecraft:leather` and `minecraft:paper` (nothing in Skript changes) | A cooldown group of its own on the bag and the cash stack (`donating:offhand`, set in inventory.sk's bagItem/handsItem), so no other leather or paper is ever caught |
| Shotgun reload | Shells loaded by hand. The gun snaps into and out of the loading pose. From empty, WeaponMechanics' pump comes at the first click, as now | An eased entry, shells by hand, and a closing pump on every reload. From empty it is WeaponMechanics' own pump, started by DonatingPhone at the end of the reload. Otherwise it is a cosmetic pump with the pump sounds |
| Left hand in draws (switching to a gun) | No: draws stay one-handed and the bag never dips on a switch | Same, because a dip on every weapon switch would be busy in fights. Later, if wanted: the Combat Rifle, Brave Patriot and Veteran rack their handles with the left hand |
| Sniper bolt between shots | The bolt moves by itself, as now | The right hand works it (the wiki: "you can see your hand operating the bolt after each shot") |

## 1. How PG3D shows hands (the references)

**Pictures:** annotated crops in R\hands\refs\pg3d\:
- `a-ak.png`: AK-48, current
- `b-photonsg.png`: Photon Shotgun
- `c-rev.png`: Old Revolver
- `d-pixelgun.png`: Pixel Gun, 2014
- `e-heavysg.png`: Heavy Shotgun
- `f-sniper.png`: Sniper Rifle

**Sources:** the wiki's "in use" screenshots in R\refs\<page>\, which are WebP files decoded to R\hands\refs\png\. The wiki texts I read for the reloads are in R\refs\*\page.txt.

**What they show:**
1. **The arms are the player's own skin arms, not gloves.**
   - Each is a Minecraft-style arm box with the skin texture: 4 skin pixels across, low-res, flat.
   - The sleeve's colour is on top and the skin colour below (`d-pixelgun.png`: a dark sleeve, a tan hand).
   - They look huge because the camera is right at them.
2. **Right arm:** always there, from the **bottom-right corner** up to the back of the grip.
   - The hand itself is hidden behind and under the grip; what shows is the sleeve.
   - On one-handed guns (`c-rev.png`) the whole grip stays in view and the arm joins its back strap.
3. **Left arm:** only on two-handed guns, coming from the **bottom left or bottom centre** up under the forend (`b-photonsg.png`, `e-heavysg.png`, `f-sniper.png`, `a-ak.png`). Pistols and revolvers have none.
4. **No fingers are drawn at the hip.** The arms are plain boxes and the detail is on the gun.
5. **Reloads (from the wiki):**
   - AK-48, Machine Gun, Brave Patriot, Hand Minigun, Photon Sniper: "the player takes out the magazine from the bottom of the weapon and puts another one in".
   - Veteran: "the magazine from the top is taken out ... and is replaced".
   - Old Revolver: "the cylinder is taken out, takes out the used ammo, the player puts the new ammo and puts back in the cylinder".
   - Shotgun:
     - "a pumping animation ... the player inserts bullets inside the shotgun".
     - Later changed "from loading the shells into the barrel to loading it properly in the magazine loading port".
     - "after the animation, the player pumps the gun again".
   - Sniper Rifle: "You can see your hand operating the bolt after each shot".
   - Pixel Gun (our Classic Pistol's ancestor): "one of the few reload animations where the player does not manually pull back the slide".

**What we can't copy:** an item model can't sample the player's skin. So **ours are gloves and a jacket sleeve**, which suits robbers and every skin.

## 2. Our hands

### 2.1 Look (kit style: `tools\guns\pg.js` style 'pg', density 4)

The mock is in `R\hands\refs\mock-sheet.png` (8 frames). Close-ups: `mock\zoom-gs50.png`, `mock\zoom-bagfist.png`, `mock\zoom-r90.png`, `mock\zoom-ak47.png`. It only shows rough placement (boxes, anchors and lifts set by eye); the builder draws the real thing.

- **Glove:** a charcoal tactical glove made of chunky boxes, in Minecraft proportions rather than realistic fingers.
  - A fist block, with the four fingers as one block split by 1-texel seams.
  - The thumb as its own bar.
  - Lighter knuckle pads (a row of 2x2 studs) and a darker stitched cuff at the wrist.
- **Sleeve:** a navy work-jacket sleeve. One long box with a square section, a seam halfway, and a gold stripe near the cuff.
- **Faces stay calm** (bands, a seam, a stud row), so the gun keeps the detail budget.
- **Size** is the same in the world on every gun:
  - Fist about 0.22 x 0.25 x 0.22 blocks.
  - Sleeve section 0.15 blocks, which is 2.4 player pixels: a bit slimmer than a vanilla arm, so the guns stay the star.
- **Size in a gun's own units:** size = k / s, where s is the gun's first-person scale.
  - The scales: Classic Pistol 0.56, Old Revolver 0.6, Machine Gun 0.52, Brave Patriot 0.62, Shotgun 0.72, Combat Rifle 0.64, AK-48 0.68, Sniper Rifle 0.58, Veteran 0.56, Hand Minigun 0.42 (from its spec).
  - In practice: author the hands once at s = 0.6, and give their placement transformation the scale 0.6 / s.

**Palette keys and defaults.** A future glove cosmetic recolours these; a gun skin never does.

| key | default | mat | what |
|---|---|---|---|
| `glove` | (92, 94, 104) | paint | the glove (charcoal, lighter than every gun's darkest parts) |
| `gloveK` | (150, 154, 166) | paint | knuckle pads, fingertip ridges |
| `stitch` | (196, 196, 204) | flat | the cuff's stitching |
| `cuff` | (52, 54, 62) | dark | the glove's cuff |
| `sleeve` | (62, 80, 118) | paint | the jacket sleeve (navy) |
| `trim` | (214, 170, 72) | paint | the stripe round the sleeve's end (gold) |

**Readability rule** (from the mock): the glove must sit at least two ramp steps above the gun's darkest material. In the first mock, pure black gloves (grey 40-46) disappeared against the AK-48 and the Combat Rifle.

### 2.2 Rules

1. **The hands have their own texture.**
   - Hand faces use their own texture variable (`#h` → `donating:item/hands_tex`), never the gun's `#t`.
   - pg.js's gun skin child models only override `t`, so every gun skin, now or later, leaves the hands alone.
   - The hands need no KEEP entries.
2. **Never in `_full`** (third person, the ground, item frames, the inventory icon). The side-view icons stay as they are. The hands appear only in first-person contexts, which pg.js byContext already handles.
3. **Never over the gun's art.**
   - The right hand sits on the grip's right side (-z) and its back strap.
   - From first person only the thumb along the frame, the fingertips round the front strap and the wrist show.
   - Grips and their skins stay in view, and so do the Shotgun's glowing bead and the AK-48's blue eyepiece rim.
4. **Never in the sight picture.** While aiming, no part of a hand rises above (sight line - 2.5 units) in front of the rear sight, and the thumb stays under the top of the frame.
5. **Sleeves point at the shoulders, not along the gun.**
   - A sleeve's direction is fixed to the camera. The right one goes to the bottom-right corner, the left one to the bottom left or bottom centre. Only the wrist end follows the hand.
   - In model space, after the gun's display rotation:
     - right sleeve about (0.5, -0.6, -0.62);
     - left sleeve about (0.7, -0.45, 0.55);
     - +x points toward the eye and -z toward the screen's right.
6. **Authored small, placed by transformations.**
   - Hand and sleeve boxes live in their own small spaces, inside the -16..32 limits.
   - The item definition's per-model transformation places them, so a sleeve can reach the screen corner whatever the gun's size.
7. **Left-handed players** see a mirrored first-person view, so the right glove would face the eye over the grip. For v1, drop the hands for them with a `minecraft:main_hand` select (left → no hand models). Mirrored copies can come later.
8. **Hand motion:**
   - Every move takes at least 2 ticks. Frames are per tick, because the 26.3 client reads the cooldown at partial tick 0.
   - Entries, exits and moves between targets take 3–6 ticks.
   - The left hand enters from where the bag was (the lower left) and leaves the same way.

### 2.3 The bag in the left hand (realistic option)

- The bag's first-person model gets a gloved fist on its handle and a sleeve running to the lower left. In the mock it is `mock\zoom-bagfist.png` and frame 1 of `mock-sheet.png`.
- It is one extra model in the bag's first-person composite, covering every tier, every bag skin and the cash stack.
- It is not in the inventory icon or in third person.
- With it, both hands are always on screen, and "the left hand leaves the bag to reload" reads naturally.

## 3. Hiding the bag during a reload

**Checked in the 26.3 client jar (javap):**
- The item property `minecraft:cooldown` (`client.renderer.item.properties.numeric.Cooldown.get`) reads `Player.getCooldowns().getCooldownPercent(stack)` for **whatever stack is drawn**, including the offhand's.
- A stack's cooldown group (`ItemCooldowns.getCooldownGroup`) is its `use_cooldown` component's group. Without one, it is **the item type's id**: `minecraft:leather` for the bag, `minecraft:paper` for the cash in hand.
- The HUD's offhand slot is drawn by `Hud.extractSlot`, which calls `itemDecorations` → `itemCooldown`. So **the bag's slot shows the white sweep while the cooldown runs.** That works as a reload timer next to the gun's own sweep; the owner can say no to it.
- Other players' clients don't know your cooldowns, so third person and other viewers are unaffected.

**How it works:**
1. **DonatingPhone (GunFx):**
   - Wherever GunFx starts a gun's reload clock, it starts a clock of the same length on the offhand group, with `Player#setCooldown(Key, ticks)` as it already does for guns.
   - Wherever it ends or cuts the gun's reload clock (a cancel, aiming in, a weapon swap, death), it ends the offhand one with `setCooldown(key, 0)`.
   - The one rule: **the bag is away exactly while a reload's frames play.**
   - If WeaponMechanics shows Sprint over Reload mid-reload (check SkinSelector's order), treat it like aiming in.
2. **The pack:** the first-person contexts of `leather.json`'s bag cases (make-item-art.js bagCase) and `paper.json`'s cash case get a `range_dispatch` on `minecraft:cooldown`. Here c is the share of the cooldown left, going 1 → 0:
   - c ≥ 0.9: the bag lowers, drop = (1 - c) / 0.1. It goes down about 0.75 blocks and tips 30 degrees, eased.
   - 0.1 < c < 0.9: `minecraft:empty`.
   - c ≤ 0.1: the bag rises, drop = c / 0.1.
   - No cooldown: the bag shows as it does now.
   - For a 32-tick reload the drop takes about 3 ticks; for a 96-tick one about 10.
3. **The cooldown group:**
   - Cautious: the item types `minecraft:leather` and `minecraft:paper`. Nothing else changes. The bag shop's leather icons are in a menu nobody has open while reloading.
   - Realistic: `donating:offhand`, set by inventory.sk's bagItem and handsItem as a `use_cooldown` component with seconds 0.05.
     - Leather and paper are never "used", so the cooldown never starts by itself.
     - bagItem already writes components through SkBee NBT (the custom_model_data strings, for example).
4. **Nothing moves in the inventory:** no slot changes, nothing for the watchdog, no risk to the fixed-inventory rules. (CLAUDE.md: never set the offhand directly; applyBag owns it.) I considered and rejected a server-side swap that empties the offhand for that reason.

**Shotgun:** its reload is one WeaponMechanics reload per shell, 4 ticks each.
- GunFx sets the bag's clock once, at the first shell: ticks = 4n + 15.
  - n = min(14 - rounds loaded, shells carried).
  - The 15 is the closing pump.
- It cuts the clock if the chain stops early (firing mid-reload).

## 4. Choreography per gun

**Notation:**
- p = the share of the reload clock done (the frames' own p).
- t = the tick with rounds left; [brackets] give the tick count from empty.
- R = right hand, L = left hand, B = the bag.

**Timing:** every beat sits on a frame beat and sound that already exist. No timings change and no sound delays move, except where marked NEW.

**Lift** means how much higher the reload pose must hold the gun so L's work is on screen.
- In the current frames, the magazine swaps of the Classic Pistol, Machine Gun, AK-48 and Sniper Rifle happen at or below the screen's bottom edge (`sheet-now-*.png`).
- The mock confirmed L is invisible there without the lift.

**Common to all guns:**
- **Hip, aimed, sprint, firing:** R is on the grip and moves with every kick. B is in the left hand, with the fist in the realistic option.
  - On the rifles R is under the screen's bottom edge at the hip, as in PG3D (last frame of `mock-sheet.png`).
  - R shows in reloads, sprints and draws.
- **Reload, bag:** B lowers over p 0–0.1, is gone, and rises over p 0.9–1 (section 3).
- **Reload, left hand:** L enters from the lower left at p ≈ 0.06 and leaves the same way by about 0.9.
- **Off-screen magazine** (the "gone" windows): L stays attached to the magazine. It carries the old one away and brings the new one, and both are hidden while off screen.

### 4.1 Classic Pistol (gs50): reload 32 t [38], shot 6, no draw clock

The grip's top centre is at (12.3, 7.4, 8), raked 15 degrees. It is fired one-handed like PG3D's Pixel Gun, with no slide pull (per the wiki).

**Hip:** R's thumb runs along the frame's left side, the fingertips sit on the front strap, and the sleeve goes to the bottom-right corner (`mock-sheet.png` frames 1–3).

**Reload:** lift +6 to +7 units and 1.5 toward the middle, so the grip's bottom is on screen.

| p | t | beat |
|---|---|---|
| 0–0.12 | 0–4 | the gun lifts and rolls its side up; B drops; L rises toward the grip's bottom |
| 0.12–0.32 | 4–10 | L pulls the old magazine down out of the grip (mag_out at t3) |
| 0.32–0.46 | 10–15 | L carries it off screen and comes back with the new one (hidden 0.40–0.46) |
| 0.46–0.70 | 15–22 | L pushes the new magazine up into the grip, palm under its base plate (14.0, 0.45) |
| 0.70–0.80 | 22–26 | L's palm slaps it home (mag_in at t24) |
| 0.80–1 | 26–32 | L goes back to the lower left; the gun rolls back; B rises over 0.9–1 |

### 4.2 Old Revolver (rev): reload 40 t (full or empty), draw 12 (flag 2), shot 8

R holds the grip at (13.0, 6.4, 8). The cylinder axis is at y 10.0, the crane hinge at (8, 8.4, 9.5), and the cylinder swings out to the left (+z, toward you).

**Hip:** R holds it as on the pistol.

**Shot:** the hammer cocks itself, so no thumb is needed.

**Draw (the twirl):** R must not spin with the gun.
- R holds still with an open hand, index finger through the guard, following only the rise.
- The gun turns in the hand over 0–0.67.
- R closes round the grip as the gun settles, over 0.67–0.78.

**Reload:** no extra lift needed, because the cylinder work is already well on screen.

| p | t | beat |
|---|---|---|
| 0–0.12 | 0–5 | the gun lifts and rolls its left side up; B drops; L comes in under the frame |
| 0.10–0.19 | 4–8 | L's thumb on the latch, fingers swing the cylinder out (open at t4) |
| 0.19–0.27 | 8–11 | the muzzle tips up; L moves in front of the open cylinder |
| 0.27–0.31 | 11–12 | L's palm slaps the ejector rod (eject at t11); the cases fall over 0.31–0.45 |
| 0.31–0.44 | 12–18 | L drops to the lower left (the belt) |
| 0.44–0.55 | 18–22 | L brings the speedloader up from below and behind, its knob between the fingers |
| 0.55–0.59 | 22–24 | L pushes the rounds in (load at t22) |
| 0.59–0.63 | 24–25 | L twists the knob (the loader turns 40 degrees) |
| 0.63–0.71 | 25–28 | L pulls the empty loader away and lets it drop; L leaves |
| 0.70–0.76 | 28–30 | R flicks the wrist and the cylinder snaps shut (close at t30); this is the existing "flick" |
| 0.76–1 | 30–40 | the cylinder spins half a turn and settles; B rises over 0.9–1 |

### 4.3 Machine Gun (uzi): reload 31 t [41; the frames follow the empty one], draw 20

- The grip is raked 15 degrees, around (12, 5.5, 8).
- The charging handle sits front-left of the handguard: x -2.25..-0.5, y 9.25..10.5, z 10.5..11.75.
- Lift +3 to +4 units, because the curved magazine currently drops at the bottom edge.

| p | t (of 41) | beat |
|---|---|---|
| 0–0.03 | 0–1 | B starts down; L shoots up from the lower left to the charging handle |
| 0.01–0.07 | 0–3 | L pulls the handle back and locks it, HK style (the existing "pull") |
| 0.07–0.12 | 3–5 | L slides down to the magazine |
| 0.12–0.30 | 5–12 | L pulls it out along its axis (mag_out) |
| 0.30–0.50 | 12–21 | the swap happens off screen (magazine hidden) |
| 0.50–0.78 | 21–32 | L inserts the new one |
| 0.78–0.85 | 32–35 | palm slap (mag_in) |
| 0.85–0.88 | 35–36 | L moves up to the locked handle |
| 0.88–0.92 | 36–38 | L's palm knocks the handle down out of its notch: the HK slap (the existing "kick") |
| 0.92–1 | 38–41 | L goes away; B rises |

### 4.4 Brave Patriot (tommy): reload 50 t [60], draw 22

- The grip is near (14.1, 5.6, 8).
- The drum is centred at (7.5, 2.75), with its faces at z 6.5 / 9.5, on a rail.
- The knob is on top: x 5..6.25, y 9.5..10.25.
- No extra lift is needed, because the drum's slide and drop already show; +1 helps L's entry.

| p | t | beat |
|---|---|---|
| 0–0.1 | 0–5 | the gun comes up, underside toward you; B drops; L goes to the drum's near face |
| 0.10–0.155 | 5–8 | L tugs the drum to work the catch (mag_out at t6) |
| 0.155–0.32 | 8–16 | L slides it out toward you along the rail and lets it drop away |
| 0.32–0.40 | 16–20 | off screen (L fetches the new one) |
| 0.40–0.545 | 20–27 | L brings the new drum up and slides it in |
| 0.555–0.63 | 28–32 | L's heel slaps it home from the side (mag_in at t28) |
| 0.63–0.70 | 32–35 | the gun rolls its top toward you; L goes over the top to the knob |
| 0.70–0.736 | 35–37 | L racks the knob back (bolt at t38) |
| 0.77–0.785 | 38–39 | L lets go (the snap) |
| 0.80–1 | 40–50 | L goes away; the gun settles; B rises over 0.9–1 |

**Draw:** one-handed; the knob racks itself (section 0).

### 4.5 Shotgun (r90): NEW reload; shot 15 (pump every 2nd shot), alone 5, action 15 (flag 1)

**Where things are:**
- The grip starts at (17.5, 7), raked 22 then 34 degrees.
- The pump: x 4.5..8.75, y 6..8.75, z 6.5..9.5.
- The loading port is under the receiver, around x 12–16, y ≈ 6.6.
- The shell spot: (14.7, 9.8, 9.2).
- In the loading pose, lift +4 and 1.5 toward the middle. Keep the cant as now (24 degrees, 10 of yaw); at 30 degrees the port was edge-on.

**Hip:** R holds the raked grip. With no stock it is held like a big pistol, as PG3D's short pump gun is. B stays in the left hand.

**Shot:** the gun kicks. On pump shots the pump racks **by itself**, because L holds the bag and a dip every second shot would flicker.

**Reload entry (NEW).**
- Realistic: GunFx sets flag 5 on the first shell's 4-tick clock.
  - Over t0–4 the gun eases into the loading pose (cant + lift) instead of snapping.
  - B drops; its clock is 4n + 15.
  - L rises from the lower left with the first shell.
- Cautious: no flag; the pose snaps on at the first shell, as now.

**Each shell:** WeaponMechanics' 4-tick reload, with frames at p 1/8, 3/8, 5/8 and 7/8, looped n times.

| frame | beat |
|---|---|
| 1 | L lifts the shell (red hull forward, brass back) to just under the port |
| 2 | the shell's nose enters the port; L's thumb is behind its brass base |
| 3 | the thumb pushes it forward into the tube; the gun nods (the shell sound plays at the reload's end) |
| 4 | the thumb slides off; L drops a little toward the belt for the next shell |

Between shells the pose holds (there is no clock then), so the loop reads as fast thumbing, not a wobble.

**Reload exit = the closing pump (NEW):** 15 ticks, the shot's pump frames with L added.
- t0–3: L moves forward from the port to the pump (palm under it, thumb up its left side), and the gun eases back toward level.
- t5–8: L racks the pump back.
- t9–12: L pushes it forward (a jolt).
- t12–15: L leaves; B rises over the last frames.

**The pump from empty (realistic):**
- **The problem:** after a shell-by-shell reload from empty, WeaponMechanics leaves the pump open and pumps again at the first click.
  - Checked in the bytecode: ReloadHandler sets FirearmState.OPEN and chains only the reload task when Ammo_Per_Reload != -1.
  - So its Close comes at the next trigger.
- **The fix:** GunFx starts that action itself at the end of the chain.
  - `ShootHandler.doShootFirearmActions` is public; ReloadHandler calls it across packages.
  - Still to verify: that it closes OPEN → READY and plays its sounds.
- The flag-1 clock then draws the pump with L, so every reload ends with exactly one pump, a real one from empty.

**The pump with rounds left:** GunFx runs its own 15-tick clock (flag 6) and plays the two pump sounds itself at t5 and t9. It is cosmetic, like the other guns' handle racks heard on every reload; PG3D pumps after every reload too.

**Cautious:** no closing pump. From empty the pump comes at the first click, as now, drawn without a hand once B is back.

**Knob for the owner** (a balance change, not needed): at 4 ticks a shell a full reload takes 56 ticks. 5–6 ticks a shell (70–84 ticks) would read calmer.

### 4.6 Combat Rifle (m16): reload 50 t [62], draw 26 (flag 2), burst shots 4

- The grip is raked 20 degrees about (18.4, 5.4, 8).
- The magazine: x 11.5..14.5, y -1.0..4.75.
- The T-handle is at the back top: x 17.25..20.5, y 8.75..9.5.
- The forward assist is on the right side.
- Lift +2.

| p | t | beat |
|---|---|---|
| 0–0.1 | 0–5 | magazine pose; B drops; L comes to the well |
| 0.16–0.30 | 8–15 | L pulls the magazine straight down out of the well (mag_out at t6) |
| 0.30–0.40 | 15–20 | off screen |
| 0.40–0.50 | 20–25 | L brings the new one up |
| 0.50–0.52 | 25–26 | it seats (mag_in at t26) |
| 0.53–0.60 | 26–30 | L's palm slaps its base |
| 0.57–0.68 | 29–34 | handle pose; L travels over the top to the T-handle |
| 0.68–0.70 | 34–35 | L pulls the T-handle with two fingers hooked (charge at t35) |
| 0.725–0.74 | 36–37 | L lets go (the snap) |
| 0.75–0.86 | 37–43 | assist pose; the knock (assist at t44) is R's (see below); L leaves |
| 0.9–1 | 45–50 | B rises |

**The forward-assist knock:**
- The forward assist sits by the right hand, on the side first person never sees.
- So R stays on the grip and the gun's nudge carries the knock, as it does now.

**Draw:** one-handed; the T-handle racks itself (section 0).

### 4.7 AK-48 (ak47): reload 57 t [73], draw 30

- The grip is raked 20 degrees about (17.6, 5.0, 8).
- The magazine pivots about its front top at (12.5, 5.0); its base plate is around (12.5, -2.9).
- The charging handle is on the RIGHT side: x 12.5..13.75, y 7..8.25, z 5.25..6.75.
- Lift +3 in the magazine pose; more brought the gun onto the camera in the mock.

| p | t | beat |
|---|---|---|
| 0–0.1 | 0–6 | magazine pose; B drops; L goes to the magazine's front edge |
| 0.12–0.17 | 7–10 | L rocks it forward (mag_out at t4 with rounds left) |
| 0.17–0.32 | 10–18 | L pulls it down and away |
| 0.32–0.40 | 18–23 | off screen |
| 0.40–0.50 | 23–29 | L brings the new one up the same path |
| 0.50–0.56 | 29–32 | L hooks its front lip and rocks it back |
| 0.56–0.62 | 32–35 | L's heel slaps it home (mag_in at t33) |
| 0.58–0.72 | 33–41 | the gun rolls its right side up toward you; L goes over the top to the handle |
| 0.725–0.755 | 41–43 | L pulls the handle back and holds it (bolt at t43) |
| 0.775–0.79 | 44–45 | L lets go (the snap) |
| 0.79–0.88 | 45–50 | L goes away; B rises over 0.9–1 |

R stays on the grip, so the gun stays steady while L racks. In the rolled pose the handle faces you.

### 4.8 Sniper Rifle (sniper): reload 60 t [76], draw 40 (flag 2), shot 20, alone 6, action 16 (flag 1)

- There is no pistol grip: R wraps the stock's wrist at (20, 7, 8), thumb over the top and fingers under.
- The bolt's axis is (15.6, 9.2, 8). Its L-shaped handle is on the gun's LEFT side; the knob is at x 15..16.25, y 6.25..7.25, z 9.25..10.5.
- The magazine centre is (12.75, 5.5).
- Lift +2.

**Shot + bolt (realistic):** R works the bolt and B stays in the left hand.

| tick | beat |
|---|---|
| 0–6 | the kick (R on the wrist) |
| 5–6 | R leaves the wrist, going over the stock's comb behind the eyepiece |
| 6–7.6 | R's fingers on the knob lift it (bolt_open at t6) |
| 7.6–9.6 | R pulls it back (the case flips out at about 8.4) |
| 10.4–12 | R pushes it forward |
| 12–13.6 | R turns it down (bolt_close at t12) |
| 13.6–16 | R goes back to the wrist; at rest by t17 |

- The same beats at the same ticks apply to the bolt alone (flag 1) and to the draw's bolt check (t20–27.6 of the draw).
- Aimed: nothing. The Scope state never draws the bolt, and Unscope_After_Shot makes it play at the hip.
- Cautious: no hand.

**Reload:** both hands work.

| p | t | beat |
|---|---|---|
| 0–0.07 | 0–4 | cant (belly toward the eye); B drops |
| 0.06–0.15 | 4–9 | R opens the bolt (up, back); a case flips out over 0.12–0.2 |
| 0.10–0.18 | 6–11 | L arrives under the magazine, thumb on the release |
| 0.18–0.32 | 11–19 | L pulls it down and out (mag_out at t8) |
| 0.32–0.44 | 19–26 | off screen |
| 0.44–0.58 | 26–35 | L brings the new one up |
| 0.57–0.66 | 34–40 | L seats it with a jolt at 0.6 (mag_in at t37); L leaves |
| 0.80–0.885 | 48–53 | R goes to the bolt |
| 0.885–0.97 | 53–58 | R closes it (forward, then down; the lock nod) |
| 0.97–1 | 58–60 | R goes back to the wrist; B rises over 0.9–1 |

Between 0.15 and 0.80, R rests on the wrist or on the open bolt's knob.

### 4.9 Veteran (lmg): reload 80 t [96], draw 40

- The grip is raked 15 degrees about (14.3, 5.3, 8).
- The top magazine hooks into the well at its front lip, (5.75, 10.5).
- The cocking handle is front-left: x 3.5..4.75, y 6.75..8, z 9.75..10.75.
- No lift is needed: the top magazine is always on screen, which makes this the best-placed reload.

| p | t | beat |
|---|---|---|
| 0–0.1 | 0–8 | the gun comes down a little, top toward you; B drops; L goes up to the top magazine |
| 0.10–0.16 | 8–13 | L's fingers press the catch at the well's rear (the tug) (mag_out at t8) |
| 0.16–0.24 | 13–19 | L tips it forward off its front lip |
| 0.20–0.34 | 16–27 | L lifts it up and away toward you |
| 0.34–0.44 | 27–35 | off screen |
| 0.44–0.55 | 35–44 | L brings the new one, tipped forward |
| 0.55–0.60 | 44–48 | L hooks the front lip and rocks it back (mag_in at t45) |
| 0.62–0.68 | 50–54 | L's palm slaps it down |
| 0.64–0.72 | 51–58 | the gun turns its left side to you; L goes to the cocking handle |
| 0.72–0.77 | 58–62 | L pulls it back (charge at t59) |
| 0.80–0.815 | 64–65 | L lets go (the snap) |
| 0.82–1 | 66–80 | L goes away; the gun is level by 0.96; B rises over 0.9–1 |

**Draw:** one-handed; the magazine check and the rack happen by themselves (section 0).

### 4.10 Hand Minigun (minigun, being built): reload 90 t, draw 40 (flag 2), spin-up 24 (flag 3), spin-down 30 (flag 4)

From the spec (R\specs\minigun.md):
- The grip spans x 20..22.6, y 0.7..4.8, raked 15 degrees about (21.3, 4.8, 8).
- The box magazine spans x 12.9..18.5, y 0..4.8, z 5.6..10.4.
- The spin axis is at y 8.6, z 8, with clamps on the barrel cluster.
- It is held like a rifle, as PG3D's Hand Minigun is.
- The spec already says the reload pose must lift and roll more so the box swap shows; with L added it has to.

**Spin-up, full spin, spin-down:** the hands stay still (the cluster turns by itself). R stays on the grip and B stays in the left hand.

**Draw:** one-handed; the test spin over 0.6–0.92 runs by itself.

**Reload:**

| p | t | beat |
|---|---|---|
| 0–0.1 | 0–9 | the gun rolls its top toward you (lift it); B drops; L goes under the box |
| 0.10–0.15 | 9–14 | L's thumb presses the catch at the box's rear (mag_out at t13) |
| 0.15–0.32 | 14–29 | L pulls the box down and toward you |
| 0.32–0.46 | 29–41 | off screen |
| 0.46–0.60 | 41–54 | L brings the new box up and seats it (mag_in at t54) |
| 0.60–0.64 | 54–58 | L's palm slaps it |
| 0.64–0.74 | 58–67 | L moves forward to a clamp; the gun turns its left side to you |
| 0.74–0.78 | 67–70 | L pushes the cluster a quarter turn (ratchet at t67), riding the clamp as it turns with the spin part |
| 0.78–0.81 | 70–73 | L re-grips on the next clamp |
| 0.81–0.85 | 73–77 | a second quarter turn (ratchet at t74) |
| 0.85–1 | 77–90 | L goes away; the gun is level by 0.97; B rises over 0.9–1 |

## 5. Notes for the builders

**Where things are:**
- The anchors above come from each module's own constants (GRIP, SHOULDER, MAG_PIVOT, BOLT) and part boxes.
- Elevations with a unit grid: `R\hands\refs\render\elev-<gun>.png`, made by `tools\elev2.js <gun> <out>`.
  - Magenta lines every 5 units, blue at 0.
  - x = px / 39.78 - 16 - offset; the script prints the offset.

**Current first person** (gun + bag composited where the client draws it):
- `R\hands\refs\sheet-now-<gun>.png`, made by `tools\fpsheet.js <gun|all>`.
- Frames: rest, aimed, sprint, the reload beats, and the Shotgun's and Sniper Rifle's shot beats.

**The mock's machinery** (R\hands\refs\mock\, not for the repo). It proves the approach, not the final art: shared hand geometry, placement by transformation, and the left hand following the magazine, the shell or the pump.
- `wrap.js` wraps a repo gun module and adds hand parts (hidden, out of `_full`).
  - It walks the returned item definitions and appends the hand models to every first-person composite.
  - R's transformation comes from the body's; L's from the part it follows.
  - Sleeves are aimed at fixed directions, and an optional extra reload lift can be added.
- `choreo.js` holds the per-gun anchors and the p windows.
- `handsgeo.js` holds the boxes and the palette.
- `build.js gs50,ak47,r90` renders the frames and composites the bag (lowered while L works).
- `bagfist.js` renders the bag held by the fist.

**Model layout (suggested):**
- Shared geometry: `donating:item/hands/<handR|handL|armR|armL|fist_bag>` with `textures: { h: donating:item/hands_tex }`.
- Per gun: a child `gun_<g>_<part>` with the gun's display, plus the _ads/_sprint children pg.js makes for every part.
- These ids sit inside the gun's prefix, so paintSkin's id map and child models keep working; a skin child only overrides `t`.

**Flags:**
- 0–2 are GunFx's (firing, action, draw); 3–4 are the minigun's spin.
- New ones start at 5:
  - 5 = the Shotgun's first shell (eased entry).
  - 6 = the Shotgun's cosmetic closing pump.
- Optional later: 7 = the offhand is empty (no bag, no cash: a new robber). It would draw L on the foregrip at the hip, like PG3D's two-handed hold.

**The bag's cooldown** is per player and per group, so it never blocks anything. Leather and paper are never used. GunFx already resets Paper's DENY for clicks with an item on cooldown, but only for guns, and nobody clicks with the bag.

**The phone** is a vanilla map, so holding it draws the player's real (skin) arms. Gloves on guns and bare arms on the phone is a small mismatch the pack can't fix, because the vanilla arm always uses the skin. Accept it.

**Size:** each frame's composite gains 2–4 models (a hand and a sleeve per hand). feather.json (3.3 MB) grows by perhaps 10–20%. That's fine.

**Melee weapons and consumables** (knife, bat, dagger, Stim and so on) are out of scope here and keep no hands for now.

## 6. Pictures used

- **PG3D in use, annotated:**
  - R\hands\refs\pg3d\: a-ak.png, b-photonsg.png, c-rev.png, d-pixelgun.png, e-heavysg.png, f-sniper.png.
  - Close crops in R\hands\refs\crops\: rev-inuse, photonsg-inuse, ak-inuse-new, ak-inuse-old.
- **Originals** (WebP saved as .png/.jpg):
  - R\refs\AK_48_PG3D\04 and 05
  - R\refs\Photon_Shotgun\02
  - R\refs\Old_Revolver_PG3D\02
  - R\refs\Pixel_Gun_PG3D\06
  - R\refs\Heavy_Shotgun\02
  - R\refs\Sniper_Rifle_PG3D\05
  - Also looked at Photon_Sniper_Rifle\02, Ultimatum\06 and \08, and Shotgun\02 and \03 (gallery shots, no hands).
  - Wiki texts: R\refs\*\page.txt.
- **Ours now:** R\hands\refs\sheet-now-{gs50,rev,uzi,tommy,r90,m16,ak47,sniper,lmg}.png.
- **Mock:** R\hands\refs\mock-sheet.png; R\hands\refs\mock\sheet-mock-{gs50,ak47,r90}.png and zoom-*.png.
- **Code read:**
  - tools\guns\pg.js and every gun module's frames.
  - The weapon files' Reload sections and sound delays (server\plugins\WeaponMechanics\weapons\**).
  - plugin\src\dev\donating\phone\GunFx.java (clocks, flags).
  - The 26.3 client: the Cooldown property, ItemCooldowns, Hud.extractSlot.
  - WeaponMechanics 4.3.1 ReloadHandler (the PUMP chain from empty).
  - The disassemblies are kept in R\hands\refs\wm\.
