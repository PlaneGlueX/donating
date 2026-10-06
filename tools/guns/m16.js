// The Combat Rifle (WeaponMechanics weapons\assault_rifles\M4A1.yml; skins Default 7, Scope +1000, Sprint +2000,
// Reload +3000). 2026-10-06: a recreation of Pixel Gun 3D's "Combat Rifle" (drawn by hand from the wiki's pictures and
// descriptions, nothing taken from the game): an M16 with an ACOG-like scope on its carry handle and a bayonet under the
// barrel. Black metal with a slight blue hue (the reworked gun's theme) and the classic's snow camo with a cyan tint on
// the furniture (the stepped handguard and the fixed stock); a birdcage flash hider, a low front sight, a straight
// magazine, a grey ribbed butt plate, a chrome bayonet, the scope's teal lens (aiming looks through the hollow tube at a
// black post with an amber tip), the T charging handle at the back and the forward assist on the right.
// Frames (GunFx: M4A1 shot 4 ticks, draw 26 with flag 2): a 3-round burst restarts the 4-tick shot clock on every
// round (rounds 2 ticks apart), so each round shows a flash (one of two shapes at random) and a 1.2-unit, 3-degree kick
// for its first frame and the gun eases back over the rest; drawn, the gun rises and the T-handle is racked; the reload
// tilts the gun, drops the magazine straight out, seats a new one with a palm slap, then rolls the gun to rack the
// T-handle and knocks it with the forward assist (on the right side, which first person never sees: the gun's nudge and
// the knock's sound carry it; a moving plunger was measured invisible there, so it's a fixed part of the body).
// Colours (a deviation from the plan's "a black M16", 2026-10-06): the reworked gun's black metal with the classic's
// snow camo furniture, so it reads as PG3D's Combat Rifle and stands apart from the AK-48 (also a dark rifle with a
// box scope) in the hotbar.
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the scope's axis, y = SY.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_m16'
  const SY = 11.9
  // A hollow tube along x (the scope's sections): four walls around an opening, so aiming looks through it.
  const tube = (x0, x1, [y0, y1, z0, z1], [yi0, yi1, zi0, zi1], c, more = {}) => [
    { from: [x0, y0, zi1], to: [x1, y1, z1], c, ...more }, // left (z+), full height: one face from the side
    { from: [x0, y0, z0], to: [x1, y1, zi0], c, ...more }, // right (z-)
    { from: [x0, yi1, zi0], to: [x1, y1, zi1], c, ...more }, // top
    { from: [x0, y0, zi0], to: [x1, yi0, zi1], c, ...more } // bottom
  ]
  const BLACK = { c: { all: 'recv', up: 'recvT' }, ink: 'gmD' } // black metal: a lighter top, dark gunmetal edges
  const SCOPE = { c: { all: 'scope', up: 'scopeT' }, ink: 'gmD' } // the scope's own key (a skin may keep it dark)
  const CAMO = { c: { all: 'camo', up: 'camoT' }, ink: 'camoD' } // the snow camo furniture (blotches below)
  const GRIP = { angle: 20, axis: 'z', origin: [18.4, 5.4, 8] }
  // Camo blotches: thin unoutlined patches on both sides of a box (zs: its two side planes), [x0, x1, y0, y1, key].
  const blotches = (zs, list, more = {}) => list.flatMap(([x0, x1, y0, y1, c]) => [
    { from: [x0, y0, zs[1]], to: [x1, y1, zs[1] + 0.03], c, outline: false, dirs: ['south'], ...more },
    { from: [x0, y0, zs[0] - 0.03], to: [x1, y1, zs[0]], c, outline: false, dirs: ['north'], ...more }
  ])
  const STOCK = { angle: -16.4, axis: 'z', origin: [19.8, 5.8, 8] } // the stock's bottom line, down toward the butt
  const gun = pgGun(name, {
    palette: {
      recv: [28, 31, 39], recvT: [50, 56, 68], gm: [72, 78, 92], gmD: [40, 44, 54], gmL: [120, 128, 144], edge: [176, 184, 198],
      camo: [200, 224, 234], camoT: [222, 238, 246], camoD: [64, 96, 112], camoB: [92, 168, 200], camoS: [124, 142, 158], camoW: [240, 248, 252],
      scope: [30, 34, 42], scopeT: [54, 60, 72], cyan: [40, 200, 220],
      lens: [36, 188, 196], lensB: [150, 244, 238], dot: [255, 176, 48],
      steel: [206, 214, 226], steelD: [128, 136, 150], handle: [46, 46, 50],
      mag: [92, 100, 116], magK: [36, 38, 46], butt: [124, 130, 140], gripP: [70, 76, 88],
      bore: [10, 10, 12], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    parts: {
      body: [
        // The birdcage flash hider (its slots: serrations), the bore, the barrel.
        { from: [-5.8, 7.0, 7.2], to: [-3.6, 8.6, 8.8], c: { all: 'gm', up: 'gmL' }, pat: { all: 'serr', west: 'flat', east: 'flat' }, ink: 'recv' },
        { from: [-5.82, 7.45, 7.65], to: [-5.8, 8.15, 8.35], c: 'bore', dirs: ['west'], outline: false },
        { from: [-3.6, 7.4, 7.6], to: [1.2, 8.2, 8.4], c: 'gm', pat: 'chrome' },
        // The front sight: a block around the barrel and a low post (aiming looks over it through the scope).
        { from: [-2.6, 6.9, 7.2], to: [-1.2, 8.8, 8.8], ...BLACK },
        { from: [-2.2, 8.8, 7.7], to: [-1.6, 9.5, 8.3], c: 'recv', outline: false },
        // The bayonet: a ring over the flash hider, the grip back under the barrel to the lug, the blade forward with a
        // stepped point (chrome, a darker spine).
        { from: [-4.3, 6.75, 7.0], to: [-3.7, 8.85, 9.0], c: 'steelD', ink: 'gmD' },
        { from: [-4.3, 5.5, 7.3], to: [-3.7, 6.75, 8.7], c: 'steelD', ink: 'gmD' },
        { from: [-3.7, 5.75, 7.45], to: [-1.0, 6.8, 8.55], c: 'handle', pat: 'groove' },
        { from: [-1.0, 5.75, 7.4], to: [-0.5, 6.95, 8.6], c: 'steelD', ink: 'gmD' },
        { from: [-10.8, 5.6, 7.75], to: [-4.3, 6.2, 8.25], c: { all: 'steel', down: 'steelD' }, pat: 'chrome', ink: 'steelD' },
        { from: [-9.8, 6.2, 7.8], to: [-4.3, 6.6, 8.2], c: 'steelD', ink: 'gmD' },
        { from: [-11.6, 5.6, 7.8], to: [-10.8, 5.95, 8.2], c: 'steel', outline: false },
        // The handguard: snow camo, round and ribbed, a step along its top; the metal cap at the front, the delta ring.
        { from: [1.2, 6.2, 6.9], to: [1.9, 8.9, 9.1], c: 'gm', ink: 'recv' },
        { from: [1.9, 6.0, 6.7], to: [9.8, 9.0, 9.3], ...CAMO },
        { from: [2.2, 9.0, 7.2], to: [9.6, 9.5, 8.8], ...CAMO },
        ...blotches([6.7, 9.3], [[2.4, 4.4, 6.4, 7.5, 'camoB'], [3.6, 5.2, 7.5, 8.3, 'camoB'], [5.6, 7.4, 7.3, 8.8, 'camoS'], [7.9, 9.5, 6.2, 7.3, 'camoB'], [4.8, 6.0, 6.0, 6.7, 'camoW'], [8.4, 9.4, 8.0, 8.9, 'camoW']]),
        // vent slots along the top of each side
        { from: [2.4, 8.35, 9.3], to: [9.2, 8.75, 9.34], c: 'camoD', pat: 'groove', outline: false, dirs: ['south'] },
        { from: [2.4, 8.35, 6.66], to: [9.2, 8.75, 6.7], c: 'camoD', pat: 'groove', outline: false, dirs: ['north'] },
        { from: [3.0, 9.5, 7.2], to: [4.8, 9.53, 8.4], c: 'camoB', outline: false, dirs: ['up'] },
        { from: [6.6, 9.5, 7.6], to: [8.4, 9.53, 8.8], c: 'camoS', outline: false, dirs: ['up'] },
        { from: [9.8, 5.8, 6.55], to: [10.5, 9.7, 9.45], c: { all: 'gm', up: 'gmL' }, ink: 'recv' },
        // The upper receiver: the ejection port and the brass deflector on the right (-z), the forward assist (its
        // housing and plunger); the lower receiver with the magazine well, the bolt catch and the selector on the left
        // (+z, the side first person sees).
        { from: [10.5, 7.2, 6.9], to: [19.8, 9.4, 9.1], ...BLACK },
        { from: [13.6, 7.8, 6.86], to: [16.6, 8.8, 6.9], c: 'bore', ink: 'gm', dirs: ['north'] },
        { from: [16.6, 8.4, 6.6], to: [17.3, 9.2, 6.9], ...BLACK },
        { from: [17.4, 7.8, 6.45], to: [19.2, 9.2, 6.9], c: { all: 'gm', north: 'gmL' }, outline: false },
        { from: [17.8, 8.0, 5.85], to: [18.8, 9.0, 6.45], c: { all: 'gmL', north: 'edge' }, outline: false },
        { from: [10.8, 5.4, 7.0], to: [19.6, 7.2, 9.0], ...BLACK },
        // the seam between the upper and the lower, both sides; the takedown pins
        { from: [10.6, 7.1, 9.1], to: [19.7, 7.3, 9.14], c: 'gm', outline: false, dirs: ['south'] },
        { from: [10.6, 7.1, 6.86], to: [19.7, 7.3, 6.9], c: 'gm', outline: false, dirs: ['north'] },
        { from: [11.6, 6.3, 6.94], to: [12.1, 6.8, 7.0], c: 'gmL', outline: false, dirs: ['north'] },
        { from: [18.6, 6.3, 6.94], to: [19.1, 6.8, 7.0], c: 'gmL', outline: false, dirs: ['north'] },
        { from: [14.6, 5.9, 6.88], to: [15.3, 6.6, 7.0], c: 'gmL', outline: false, dirs: ['north'] },
        { from: [11.0, 4.2, 6.85], to: [15.0, 5.4, 9.15], ...BLACK },
        { from: [15.4, 5.8, 9.0], to: [16.4, 6.8, 9.14], c: 'gm', outline: false },
        { from: [17.5, 6.0, 9.0], to: [18.7, 6.6, 9.2], c: 'gmL', outline: false },
        { from: [11.6, 7.6, 9.1], to: [12.1, 8.1, 9.16], c: 'gmL', outline: false, dirs: ['south'] },
        { from: [18.6, 6.3, 9.0], to: [19.1, 6.8, 9.06], c: 'gmL', outline: false, dirs: ['south'] },
        // The trigger guard and the trigger; the pistol grip raked back, checkered panels and a finger bump.
        { from: [14.8, 4.8, 7.6], to: [17.6, 5.2, 8.4], ...BLACK },
        { from: [14.8, 5.2, 7.6], to: [15.2, 5.4, 8.4], ...BLACK },
        { from: [16.0, 4.9, 7.75], to: [16.5, 5.4, 8.25], c: 'gmL', outline: false },
        { from: [17.2, 0.6, 7.0], to: [19.6, 5.4, 9.0], ...BLACK, rot: GRIP },
        { from: [17.1, 0.1, 6.9], to: [19.7, 0.6, 9.1], c: 'gm', ink: 'recv', rot: GRIP },
        { from: [17.5, 1.2, 9.0], to: [19.3, 4.6, 9.12], c: 'gripP', pat: 'check', rot: GRIP },
        { from: [17.5, 1.2, 6.88], to: [19.3, 4.6, 7.0], c: 'gripP', pat: 'check', rot: GRIP },
        { from: [16.8, 2.8, 7.2], to: [17.2, 3.8, 8.8], ...BLACK, rot: GRIP },
        // The carry handle: the front post, the rear sight housing, the bar (open under it between them; it ends on
        // the posts' inner faces, so no face of it lies in a post's).
        { from: [11.0, 9.4, 7.2], to: [12.2, 10.5, 8.8], ...BLACK },
        { from: [17.0, 9.4, 7.0], to: [18.6, 10.7, 9.0], ...BLACK },
        { from: [12.2, 10.0, 7.3], to: [17.0, 10.5, 8.7], ...BLACK },
        // The scope: a mount, the objective bell with the teal lens (no back face, so it's culled from inside), the
        // body, the eyepiece; the black post with an amber tip inside, turrets and a cyan stripe each side.
        { from: [12.6, 10.5, 7.4], to: [15.6, 10.7, 8.6], c: 'gm', ink: 'recv' },
        ...tube(10.4, 11.6, [SY - 1.5, SY + 1.5, 6.5, 9.5], [SY - 1.1, SY + 1.1, 6.9, 9.1], SCOPE.c, { ink: 'gmD' }),
        ...tube(11.6, 16.8, [SY - 1.25, SY + 1.25, 6.75, 9.25], [SY - 0.85, SY + 0.85, 7.15, 8.85], SCOPE.c, { ink: 'gmD' }),
        ...tube(16.8, 17.8, [SY - 1.0, SY + 1.0, 7.0, 9.0], [SY - 0.8, SY + 0.8, 7.2, 8.8], SCOPE.c, { ink: 'gmD' }),
        { from: [9.9, SY - 1.1, 6.9], to: [10.4, SY + 1.1, 9.1], c: 'lens', glow: true, dirs: ['west', 'north', 'south', 'up', 'down'] },
        { from: [9.86, SY + 0.3, 7.3], to: [9.9, SY + 0.8, 7.8], c: 'lensB', glow: true, dirs: ['west'] },
        { from: [10.95, SY - 1.1, 7.92], to: [11.05, SY - 0.15, 8.08], c: 'bore', outline: false },
        { from: [10.9, SY - 0.15, 7.85], to: [11.1, SY + 0.15, 8.15], c: 'dot', glow: true },
        { from: [13.6, SY + 1.25, 7.4], to: [14.8, SY + 1.85, 8.6], ...SCOPE },
        { from: [13.6, SY - 0.6, 9.25], to: [14.8, SY + 0.6, 9.75], ...SCOPE },
        { from: [11.8, SY + 0.45, 9.25], to: [16.6, SY + 0.7, 9.31], c: 'cyan', outline: false },
        { from: [11.8, SY + 0.45, 6.69], to: [16.6, SY + 0.7, 6.75], c: 'cyan', outline: false },
        // The fixed stock: snow camo, a straight comb and the bottom sloping down to the grey ribbed butt plate.
        { from: [19.8, 6.2, 7.0], to: [26.6, 8.5, 9.0], ...CAMO },
        { from: [19.8, 5.8, 7.05], to: [26.9, 8.4, 8.95], ...CAMO, rot: STOCK },
        ...blotches([7.0, 9.0], [[20.6, 22.4, 6.7, 7.9, 'camoB'], [23.2, 25.0, 7.3, 8.48, 'camoS'], [25.3, 26.4, 6.4, 7.3, 'camoW']]),
        ...blotches([7.05, 8.95], [[22.2, 24.0, 6.0, 6.9, 'camoS'], [24.4, 26.4, 6.0, 7.4, 'camoB']], { rot: STOCK }),
        { from: [26.6, 3.7, 6.9], to: [27.6, 8.8, 9.1], c: { all: 'butt', east: 'magK' }, pat: { all: 'groove', east: 'flat' }, ink: 'gmD' }
      ],
      // The T charging handle at the back of the upper receiver (pulled back +x); its stem shows when pulled.
      charge: [
        { from: [17.2, 8.85, 7.7], to: [19.8, 9.25, 8.3], c: 'gmL', outline: false },
        { from: [19.8, 8.75, 6.6], to: [20.6, 9.35, 9.4], c: { all: 'gm', up: 'gmL' }, outline: false },
        { from: [19.8, 8.8, 9.4], to: [20.3, 9.3, 9.9], c: 'gmL', outline: false }
      ],
      // The straight magazine: grey with a dark band, a black floor plate.
      mag: [
        { from: [11.6, -1.0, 7.25], to: [14.4, 4.8, 8.75], c: { all: 'mag', up: 'magK' } },
        { from: [11.55, 2.2, 7.2], to: [14.45, 2.6, 8.8], c: 'magK', outline: false },
        { from: [11.4, -1.4, 7.15], to: [14.6, -1.0, 8.85], c: 'magK', ink: 'gm' }
      ],
      flash: [
        { from: [-8.0, 6.7, 6.9], to: [-5.8, 8.9, 9.1], c: 'flashCore', glow: true },
        { from: [-11.6, 7.4, 7.6], to: [-8.0, 8.2, 8.4], c: 'flash', glow: true },
        { from: [-7.4, 8.9, 7.6], to: [-6.4, 10.9, 8.4], c: 'flash', glow: true },
        { from: [-7.4, 4.7, 7.6], to: [-6.4, 6.7, 8.4], c: 'flash', glow: true },
        { from: [-7.4, 7.4, 4.9], to: [-6.4, 8.2, 6.9], c: 'flash', glow: true },
        { from: [-7.4, 7.4, 9.1], to: [-6.4, 8.2, 11.1], c: 'flash', glow: true }
      ],
      // A second flash (an X), so the rounds of a burst differ. The X's second arm is a little longer along x, so the
      // two arms' end faces never lie in one plane where they cross.
      flash2: [
        { from: [-7.6, 6.95, 7.15], to: [-5.8, 8.65, 8.85], c: 'flashCore', glow: true },
        { from: [-10.4, 7.4, 7.6], to: [-7.6, 8.2, 8.4], c: 'flash', glow: true },
        { from: [-7.2, 7.4, 5.0], to: [-6.2, 8.2, 11.0], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-6.7, 7.8, 8] } },
        { from: [-7.3, 4.8, 7.6], to: [-6.1, 10.8, 8.4], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-6.7, 7.8, 8] } }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -82, 0], translation: [-5.26, 3.6, -1.79], scale: [0.64, 0.64, 0.64] },
      thirdperson: { rotation: [0, -90, 0], translation: [0, 1.5, -5.5], scale: [0.76, 0.76, 0.76] },
      gui: { rotation: [0, 180, -30], translation: [0.2, 1.2, 0], scale: [0.48, 0.48, 0.48] },
      ground: { rotation: [0, 0, -45], translation: [-1, 8.25, 0], scale: [0.85, 0.85, 0.85] },
      fixed: { rotation: [0, 0, -45], translation: [-0.5, 1, -1], scale: [0.85, 0.85, 0.85] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 17.8, rearDepth: 0.8, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [21.5, -25.25, 0], translation: [-10.6, 2.6, 1.38], scale: [0.68, 0.68, 0.68] }
    }
  })

  // The shoulder pivot (the grip's top, behind the trigger): kicks turn the muzzle up about it.
  const SHOULDER = [18.4, 5.6, 8]
  // A round (GunFx: a 4-tick clock on every round; the 26.3 client shows p = 0.125, 0.375, 0.625, 0.875, a frame a
  // tick): the first frame the whole kick (1.2 back, 3 degrees up) and a flash, then it eases back (0.69, 0.25, 0.03).
  // In a burst the next round restarts the clock 2 ticks later, so the gun jolts three times and the flash blinks.
  const kickAt = p => p < 0.25 ? 1 : Math.pow(1 - (p - 0.25) / 0.75, 2)
  const pose = (k, p, yaw = 0, flash = null) => {
    const kk = kickAt(p) * k
    return { ...(flash ? { show: [flash] } : {}), gun: rig({ t: [1.2 * kk, 0.15 * kk, 0], rot: [[[0, 0, 1], -3 * kk], [[0, 1, 0], yaw * kk]], pivot: SHOULDER }) }
  }
  // The shot clock: its first frame picks one of the two flashes at random (minecraft:time, a fresh value each frame,
  // with a small yaw each way), so a burst's flashes differ.
  const shots = (state, k, flashes) => {
    const c = gun.cooldown(state, 4, p => pose(k, p))
    const first = c.entries[c.entries.length - 1]
    first.model = {
      type: 'minecraft:range_dispatch',
      property: 'minecraft:time',
      source: 'random',
      wobble: false,
      entries: flashes.map((f, i) => ({ threshold: i / flashes.length, model: gun.composite(state, pose(k, 0.125, i % 2 ? -0.5 : 0.5, f)) })),
      fallback: gun.composite(state, pose(k, 0.125, 0.5, flashes[0]))
    }
    return c
  }
  // The reload's and the draw's poses: t (model units), then turns about x (the roll: top toward the eye +), y (muzzle
  // inward +) and z (muzzle down +), about the receiver's middle. mag: the gun lifted, its bottom rolled toward the eye
  // and the muzzle turned in, so the magazine shows; handle: lifted, its top rolled toward the eye and turned across, so
  // the T-handle at the back of the receiver comes into view (in the rest pose it's below the screen's edge); assist: a
  // bit more roll, the gun held for the forward assist's knock.
  const POSES = {
    mag: { t: [-2, 5, 1.5], x: -34, y: 16, z: -3 },
    handle: { t: [-4, 4, 1], x: 25, y: 22, z: 4 },
    assist: { t: [-3.5, 4.5, 1.5], x: 42, y: 20, z: 3 }
  }
  const POSE_PIVOT = [14, 7, 8]
  const posed = (q, w) => rig({ t: q.t.map(v => v * w), rot: [[[1, 0, 0], q.x * w], [[0, 1, 0], q.y * w], [[0, 0, 1], q.z * w]], pivot: POSE_PIVOT })
  // The draw (GunFx: 26 ticks with custom_model_data flag 2): the gun comes up from below the screen, muzzle down and
  // rolled out, into the handle pose (by 0.5), the T-handle is racked (pulled 0.58-0.64, let go 0.67-0.70: M4A1.yml
  // plays the charge sound at tick 16, its release click 2.5 ticks later), and the gun snaps back to rest (0.76-0.95).
  const draw = p => {
    const k = 1 - ease.out(Math.min(1, p / 0.45))
    const h = ease.ramp(p, 0.2, 0.5) * (1 - ease.ramp(p, 0.76, 0.95))
    const pull = p < 0.67 ? ease.ramp(p, 0.58, 0.64) : 1 - ease.ramp(p, 0.67, 0.7)
    const snap = ease.bump(p, 0.69, 0.8, 0.72)
    const below = rig({ t: [2 * k + 0.4 * snap, -9 * k, 0], rot: [[[1, 0, 0], -20 * k], [[0, 0, 1], 28 * k + 2 * snap]], pivot: SHOULDER })
    return { gun: pg.then(posed(POSES.handle, h), below), charge: rig({ t: [2.6 * pull, 0, 0] }) }
  }
  // The reload (GunFx: a clock as long as WeaponMechanics' reload: 50 ticks, 62 from empty when the silent SLIDE's
  // Open 6 and Close 6 come with it): the magazine pose (0-0.1), the magazine drops straight out along its well
  // (0.16-0.30), is gone, a new one rises (0.40-0.50) and seats with a jolt (0.52), a palm slap (0.54); the handle pose
  // (0.57-0.64), the T-handle is pulled (0.68-0.70) and let go (0.725-0.74, a snap); the assist pose (0.75-0.8), the
  // forward assist knocks the gun (0.82-0.86: the palm on the far side jolts it toward the eye and rolls it 3 degrees,
  // with the knock's sound), and it settles by 0.97.
  // The sounds (M4A1.yml Start_Mechanics, delayBeforePlay in ticks): from empty the open's 6 ticks come first and the
  // frames run over 62 ticks, so the delays split the difference, d = 56p - 3: mag_out 6 (p 0.16), mag_in 26 (0.52),
  // charge 35 (0.68; its release click 2.5 ticks later), assist 44 (0.84); each within about 3 ticks of its frame.
  const MAG_AXIS = [0, -1, 0]
  const reload = p => {
    const w = {
      mag: ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.57, 0.64)),
      handle: ease.ramp(p, 0.57, 0.64) * (1 - ease.ramp(p, 0.75, 0.8)),
      assist: ease.ramp(p, 0.75, 0.8) * (1 - ease.ramp(p, 0.87, 0.97))
    }
    const sum = k => Object.entries(POSES).reduce((s, [n, q]) => s + q[k] * w[n], 0)
    const sumT = i => Object.entries(POSES).reduce((s, [n, q]) => s + q.t[i] * w[n], 0)
    const seat = ease.bump(p, 0.5, 0.56, 0.52)
    const slap = ease.bump(p, 0.53, 0.6, 0.55)
    let drop = 0
    if (p < 0.4) drop = ease.ramp(p, 0.16, 0.3); else drop = 1 - ease.ramp(p, 0.4, 0.5)
    const d = 14 * drop
    const pull = p < 0.725 ? ease.ramp(p, 0.68, 0.7) : 1 - ease.ramp(p, 0.725, 0.74)
    const snap = ease.bump(p, 0.735, 0.8, 0.75)
    const tap = ease.bump(p, 0.82, 0.86, 0.835)
    return {
      gun: rig({
        t: [0, 1, 2].map(i => sumT(i) + [0.4 * snap - 0.2 * tap, 0.4 * seat + 0.6 * slap + 0.2 * tap, 0.6 * tap][i]),
        rot: [[[1, 0, 0], sum('x') + 3 * tap], [[0, 1, 0], sum('y')], [[0, 0, 1], sum('z') - 2 * seat - 3 * slap + 2 * snap]],
        pivot: POSE_PIVOT
      }),
      mag: rig({ t: [MAG_AXIS[0] * d, MAG_AXIS[1] * d, 0] }),
      charge: rig({ t: [2.6 * pull, 0, 0] }),
      hide: p > 0.3 && p < 0.4 ? ['mag'] : []
    }
  }
  const def = gun.flag(2, gun.cooldown('', 26, draw), shots('', 1, ['flash', 'flash2']))
  const ads = gun.flag(2, gun.composite('ads'), shots('ads', 0.45, ['flash2', 'flash2']))
  return {
    7: gun.byContext('', def),
    1007: gun.byContext('ads', ads),
    2007: gun.byContext('sprint', gun.composite('sprint')),
    3007: gun.byContext('', gun.cooldown('', 50, reload))
  }
}
