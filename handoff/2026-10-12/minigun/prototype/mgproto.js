// PROTOTYPE (spec writer, 2026-10-06; outside the repo): the Hand Minigun in the proposed PG style (work\style\proto's
// kit, style 'pg'), for the spec's renders (specs\minigun.md). WeaponMechanics weapons\assault_rifles\FN_FAL.yml (title
// FN_FAL, skins Default 6, Scope +1000, Sprint +2000, Reload +3000). A recreation of Pixel Gun 3D's Hand Minigun in our
// style: a rifle-shaped body (black, cyan digital-camo plates, an orange counter window, red lights) with four barrels
// in a "+" around a core, four silver clamps and a stepped black muzzle cap, all of which SPIN about the axis (y AY,
// z AZ); a box magazine with an X emblem, a mauve grip, a short black stock, a red-dot sight on a riser.
// Frames (GunFx): Default = flag 2 the draw (40), flag 3 the spin-up (24), flag 4 the spin-down (30), else fire held
// (flag 0 + key) = full spin; Scope reads flags 3/4 too, Sprint flag 4; Reload (+3000) the reload (90 ticks).
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_minigun'
  const AY = 8.6; const AZ = 8.0 // the spin axis
  const MUZ = -15.0 // the muzzle's front face
  const FX = 8 // the flash is drawn FX back and moved out
  const SY = 13.3 // the sight line (the red-dot tube's centre)
  const TUBE = env0('MG_TUBE', [19.0, 20.6]) // the red-dot tube (front lens, eye end); inner half size 0.8 (y) x 1.0 (z)
  // A clamp ring around the barrels: a stepped octagon of three boxes (arms 2r long and 2w wide, a square 2c).
  function env0 (k, d) { return process.env[k] ? JSON.parse(process.env[k]) : d }
  const ring = (x0, x1, r, w, c, key, extra = {}) => [
    { from: [x0, AY - r, AZ - w], to: [x1, AY + r, AZ + w], c: key, ...extra },
    { from: [x0, AY - w, AZ - r], to: [x1, AY + w, AZ + r], c: key, ...extra },
    { from: [x0, AY - c, AZ - c], to: [x1, AY + c, AZ + c], c: key, ...extra }
  ]
  const D = 1.5; const H = 0.85 // a barrel's centre distance from the axis, a barrel's half size
  const BX0 = -12.4; const BX1 = 10.6
  // A barrel (its centre dy, dz off the axis): black, panel seams, a light grey line along each long face near its
  // upper/outer edge (PG3D's grey grooves between black barrels).
  const barrel = (dy, dz) => {
    const y0 = AY + dy - H; const y1 = AY + dy + H; const z0 = AZ + dz - H; const z1 = AZ + dz + H
    return { from: [BX0, y0, z0], to: [BX1, y1, z1], c: 'barrel', split: { x: [-1.0, 6.0] },
      deco: [{ k: 'band', face: 'sides', at: [BX0, y1 - 0.25], to: [BX1, y1 - 0.5], c: 'steel' }, { k: 'band', face: 'flats', at: [BX0, z1 - 0.5], to: [BX1, z1 - 0.25], c: 'steel' }] }
  }
  const env = (k, d) => process.env[k] ? JSON.parse(process.env[k]) : d
  const gun = pgGun(name, {
    style: 'pg',
    density: 4,
    palette: {
      recv: [26, 27, 32], barrel: [30, 31, 35], steel: [196, 200, 208], cyan: [30, 160, 205],
      magG: [70, 84, 96], magL: [139, 151, 163], grip: [87, 76, 97], org: [222, 138, 57], red: [214, 26, 24],
      // KEEP keys (never recolored by skins)
      bore: [8, 8, 10], lens: [46, 120, 216], lensB: [110, 176, 248], dot: [255, 40, 40], post: [20, 20, 24],
      flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: { recv: 'dark', barrel: 'dark', steel: 'metal', cyan: 'metal', magG: 'metal', magL: 'metal', grip: 'rubber', org: 'glow', red: 'glow', bore: 'flat', lens: 'glass', lensB: 'glass', dot: 'glow', post: 'flat', flash: 'glow', flashCore: 'glow' },
    keep: ['org', 'red'],
    parts: {
      // ---------- the static body ----------
      body: [
        // the rotor housing (the barrels come out of its front face): wider than the receiver, cyan corner plates
        { from: [9.9, AY - 3.2, AZ - 3.2], to: [12.7, AY + 3.2, AZ + 3.2], c: 'recv', split: { x: [11.3] },
          deco: [{ k: 'band', at: [10.1, AY + 2.9], to: [11.1, AY + 1.8], c: 'cyan' }, { k: 'band', at: [11.5, AY - 1.8], to: [12.5, AY - 2.9], c: 'cyan' },
            { k: 'rivets', at: [10.2, AY - 0.4], to: [11.0, AY + 0.4], n: 1, size: 2, c: 'steel' }, { k: 'rivets', at: [11.6, AY - 0.4], to: [12.4, AY + 0.4], n: 1, size: 2, c: 'steel' },
            { k: 'holes', face: 'up', at: [10.2, AZ - 2.6], to: [12.4, AZ + 2.6], pitch: [2, 3] }] },
        // the receiver: black, panel seams, cyan digital-camo bands, a fin vent, the orange counter window, rivets
        { from: [12.7, 4.8, 5.9], to: [23.2, 11.6, 10.1], c: 'recv', split: { x: [16.0, 19.6], y: [8.4] },
          deco: [
            { k: 'band', at: [12.9, 11.4], to: [19.4, 10.4], c: 'cyan' },
            { k: 'band', at: [16.2, 8.2], to: [23.0, 7.2], c: 'cyan' },
            { k: 'vent', at: [13.0, 8.1], to: [15.7, 5.4], c: 'cyan', zig: true },
            { k: 'glow', at: [19.9, 11.2], to: [22.8, 8.8], c: 'org', emit: true },
            { k: 'slots', at: [16.4, 10.1], to: [19.3, 8.7], n: 2 },
            { k: 'rivets', at: [16.4, 5.4], to: [22.8, 5.0], n: 4, c: 'steel' },
            { k: 'holes', face: 'up', at: [13.0, 6.4], to: [15.6, 9.6], pitch: [2, 2] }
          ] },
        // the rail on top, and the red-dot sight on its riser: a hollow tube (walls around the sight line), a lens at
        // the front (west face only: see-through from inside), the dot on a thin post, red lights on its top
        { from: [12.9, 11.6, 6.9], to: [23.0, 12.1, 9.1], c: 'recv', deco: [{ k: 'rail', face: ['north', 'south'], at: [12.9, 12.1], to: [23.0, 11.6], c: 'steel' }] },
        
        { from: [TUBE[0], SY - 0.9, AZ + 1.1], to: [TUBE[1], SY + 0.9, AZ + 1.6], c: 'recv', deco: [{ k: 'slots', at: [17.6, SY + 0.6], to: [20.0, SY - 0.6], dir: 'v', n: 2 }] },
        { from: [TUBE[0], SY - 0.9, AZ - 1.6], to: [TUBE[1], SY + 0.9, AZ - 1.1], c: 'recv', deco: [{ k: 'slots', at: [17.6, SY + 0.6], to: [20.0, SY - 0.6], dir: 'v', n: 2 }] },
        { from: [TUBE[0], SY + 0.9, AZ - 1.6], to: [TUBE[1], SY + 1.5, AZ + 1.6], c: 'recv', split: { x: [18.8] } },
        { from: [TUBE[0], 12.1, AZ - 1.6], to: [TUBE[1], SY - 0.9, AZ + 1.6], c: 'recv' },
        ...(process.env.MG_NOLENS ? [] : [{ from: [TUBE[0] - 0.02, SY - 0.9, AZ - 1.1], to: [TUBE[0], SY + 0.9, AZ + 1.1], c: 'lens', dirs: ['west'], outline: false }]),
        { from: [TUBE[0] + 0.3, SY - 0.15, AZ - 0.15], to: [TUBE[0] + 0.4, SY + 0.15, AZ + 0.15], c: 'dot', glow: true },
        { from: [TUBE[0] + 0.32, SY - 0.9, AZ - 0.05], to: [TUBE[0] + 0.38, SY - 0.15, AZ + 0.05], c: 'post', outline: false },
        { from: [TUBE[0] + 0.3, SY + 1.5, 7.5], to: [TUBE[0] + 1.1, SY + 1.9, 8.5], c: 'red', glow: true },
        { from: [TUBE[1] - 1.1, SY + 1.5, 7.5], to: [TUBE[1] - 0.3, SY + 1.9, 8.5], c: 'red', glow: true },
        // the lower handguard under the barrels (clear of the clamps' sweep, r 3.05: top AY - 3.25), the toothed cyan
        // comb on it (clear of the barrels' sweep, r 2.5: top AY - 2.55), red lights at its front
        { from: [3.0, 3.0, 6.2], to: [12.7, AY - 3.25, 9.8], c: 'recv', split: { x: [6.2, 9.6] },
          deco: [{ k: 'band', at: [3.1, 4.6], to: [12.5, 4.0], c: 'cyan' }, { k: 'slots', at: [6.4, 3.8], to: [9.4, 3.3], n: 1 }, { k: 'leds', face: 'west', at: [6.6, 5.2], to: [9.4, 3.6], n: 2, c: 'red', emit: true }] },
        { from: [3.0, AY - 3.25, 6.6], to: [8.0, AY - 2.55, 9.4], c: 'cyan', deco: [{ k: 'ribs', at: [3.0, AY - 2.55], to: [8.0, AY - 3.25], c: 'cyan' }] },
        { from: [2.7, 4.2, 9.8], to: [3.3, 5.2, 10.1], c: 'red', glow: true },
        { from: [2.7, 4.2, 5.9], to: [3.3, 5.2, 6.2], c: 'red', glow: true },
        // the trigger guard and the trigger
        { from: [18.6, 3.3, 7.4], to: [20.2, 3.7, 8.6], c: 'recv' },
        { from: [18.6, 3.7, 7.4], to: [19.0, 4.8, 8.6], c: 'recv' },
        { from: [19.3, 3.8, 7.8], to: [19.7, 4.8, 8.2], c: 'steel' },
        // the mauve pistol grip, raked back, a black cap
        { from: [20.0, 0.7, 6.7], to: [22.6, 4.8, 9.3], c: 'grip', rot: { angle: 15, axis: 'z', origin: [21.3, 4.8, 8] } },
        { from: [19.9, 0.3, 6.6], to: [22.7, 0.7, 9.4], c: 'recv', rot: { angle: 15, axis: 'z', origin: [21.3, 4.8, 8] } }
      ],
      // ---------- the spinning cluster ----------
      spin: [
        { from: [BX0, AY - 0.8, AZ - 0.8], to: [BX1, AY + 0.8, AZ + 0.8], c: 'bore' },
        ...[[D, 0], [-D, 0], [0, D], [0, -D]].map(([dy, dz]) => barrel(dy, dz)),
        // the clamps: rear, middle (the big one), a thin third, front
        ...ring(8.2, 9.8, 2.85, 1.3, 2.25, 'steel', { deco: [{ k: 'rivets', face: 'all', at: [8.4, AY + 0.3], to: [9.6, AY - 0.3], n: 1, c: 'recv' }] }),
        ...ring(0.6, 2.8, 2.95, 1.4, 2.3, 'steel', { split: { x: [1.7] } }),
        ...ring(-5.6, -4.6, 2.75, 1.25, 2.15, 'steel'),
        ...ring(-11.0, -9.2, 2.9, 1.35, 2.3, 'steel'),
        // the stepped black muzzle cap, vents on its sides, a smaller front plate, the four bores and the hub
        ...ring(-14.6, -11.0, 3.15, 1.55, 2.5, 'recv', { deco: [{ k: 'slots', at: [-14.2, AY + 1.2], to: [-11.4, AY - 1.2], dir: 'v', n: 3 }] }),
        ...ring(MUZ, -14.6, 2.4, 1.2, 2.0, 'recv'),
        ...[[D, 0], [-D, 0], [0, D], [0, -D]].map(([dy, dz]) => ({ from: [MUZ - 0.02, AY + dy - 0.55, AZ + dz - 0.55], to: [MUZ, AY + dy + 0.55, AZ + dz + 0.55], c: 'bore', dirs: ['west'], outline: false })),
        { from: [MUZ - 0.02, AY - 0.35, AZ - 0.35], to: [MUZ, AY + 0.35, AZ + 0.35], c: 'steel', dirs: ['west'], outline: false }
      ],
      // the box magazine (an ammo can): blue-grey steel, an X emblem in an inset on each side, grooves front and back
      mag: [
        { from: [12.9, 0.0, 5.6], to: [18.5, 4.8, 10.4], c: 'magG', split: { y: [4.0] },
          deco: [
            { k: 'inset', at: [13.3, 3.7], to: [17.0, 0.4], c: 'magG' },
            { k: 'stamp', at: [13.7, 3.3], to: [16.6, 0.8], rows: ['L.......L', '.L.....L.', '..L...L..', '...L.L...', '....L....', '...L.L...', '..L...L..', '.L.....L.', 'L.......L'], keys: { L: 'magL' } },
            { k: 'slots', at: [17.2, 3.6], to: [18.3, 0.4], dir: 'v', n: 2 },
            { k: 'slots', face: 'ends', at: [6.0, 3.7], to: [10.0, 0.4], n: 3 }
          ] },
        { from: [13.2, 4.8, 6.4], to: [18.2, 5.1, 9.6], c: 'recv' }
      ],
      // the short black stock (hidden while aiming): a cyan U frame, a stepped bottom, a ribbed butt pad
      stock: [
        { from: [23.2, 5.4, 6.4], to: [29.6, 10.8, 9.6], c: 'recv', split: { x: [26.4] },
          deco: [{ k: 'band', at: [23.4, 10.5], to: [29.4, 9.9], c: 'cyan' }, { k: 'inset', at: [24.0, 9.4], to: [26.0, 6.2], c: 'recv' }, { k: 'inset', at: [26.8, 9.4], to: [29.0, 6.2], c: 'recv' }, { k: 'band', at: [23.4, 5.9], to: [29.4, 5.6], c: 'cyan' }, { k: 'rail', face: 'up', at: [23.4, 6.6], to: [29.4, 9.4], c: 'recv' }] },
        { from: [25.4, 4.2, 6.6], to: [29.6, 5.4, 9.4], c: 'recv' },
        { from: [29.6, 4.0, 6.2], to: [30.6, 11.2, 9.8], c: 'grip', deco: [{ k: 'slots', face: 'ends', at: [6.4, 10.8], to: [9.6, 4.4], n: 5 }] }
      ],
      // the flash (drawn FX back; frames move it out): a hot core, a jet, a star of spikes
      flash: [
        { from: [MUZ - 3.6 + FX, AY - 2.3, AZ - 2.3], to: [MUZ + FX, AY + 2.3, AZ + 2.3], c: 'flashCore', glow: true },
        { from: [MUZ - 8.0 + FX, AY - 0.7, AZ - 0.7], to: [MUZ - 3.2 + FX, AY + 0.7, AZ + 0.7], c: 'flash', glow: true },
        { from: [MUZ - 2.4 + FX, AY - 5.6, AZ - 0.7], to: [MUZ - 1.2 + FX, AY + 5.6, AZ + 0.7], c: 'flash', glow: true },
        { from: [MUZ - 2.4 + FX, AY - 0.7, AZ - 5.6], to: [MUZ - 1.2 + FX, AY + 0.7, AZ + 5.6], c: 'flash', glow: true },
        { from: [MUZ - 2.2 + FX, AY - 4.6, AZ - 0.55], to: [MUZ - 1.4 + FX, AY + 4.6, AZ + 0.5], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZ - 1.8 + FX, AY, AZ] } },
        { from: [MUZ - 2.2 + FX, AY - 0.55, AZ - 4.6], to: [MUZ - 1.4 + FX, AY + 0.55, AZ + 4.6], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZ - 1.8 + FX, AY, AZ] } }
      ],
      flash2: [
        { from: [MUZ - 2.4 + FX, AY - 1.3, AZ - 1.3], to: [MUZ + FX, AY + 1.3, AZ + 1.3], c: 'flashCore', glow: true },
        { from: [MUZ - 5.0 + FX, AY - 0.45, AZ - 0.45], to: [MUZ - 2.4 + FX, AY + 0.45, AZ + 0.45], c: 'flash', glow: true },
        { from: [MUZ - 1.8 + FX, AY - 2.8, AZ - 0.4], to: [MUZ - 1.0 + FX, AY + 2.8, AZ + 0.4], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZ - 1.4 + FX, AY, AZ] } },
        { from: [MUZ - 1.8 + FX, AY - 0.4, AZ - 2.8], to: [MUZ - 1.0 + FX, AY + 0.4, AZ + 2.8], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZ - 1.4 + FX, AY, AZ] } }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: env('MG_FP', { rotation: [0, -66, 0], translation: [-1.0, 2.2, -2.0], scale: [0.42, 0.42, 0.42] }),
      thirdperson: env('MG_TP', { rotation: [0, -90, 0], translation: [0, 1.2, -11], scale: [0.66, 0.66, 0.66] }),
      gui: env('MG_GUI', { rotation: [0, 180, -30], translation: [0.6, 0.0, 0], scale: [0.36, 0.36, 0.36] }),
      ground: { rotation: [0, 0, -45], translation: [-1, 7, 0], scale: [0.7, 0.7, 0.7] },
      fixed: { rotation: [0, 0, -45], translation: [-0.5, 0.5, -1], scale: [0.7, 0.7, 0.7] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: TUBE[1], rearDepth: env('MG_RD', 0.45), scale: [1.6, 2.4, 2.4] }),
      sprint: env('MG_SPRINT', { rotation: [-12, -44, 18], translation: [-3.2, 1.4, -2.2], scale: [0.42, 0.42, 0.42] })
    }
  })
  // ---------- frames ----------
  const SHOULDER = [21.3, 5.4, 8]
  const OUT = rig({ t: [-FX, 0, 0] })
  const turn = a => rig({ rot: [[[1, 0, 0], a]], pivot: [0, AY, AZ] })
  // Full spin (fire held, flag 0): a fresh random pose every frame (wobble off): the cluster at one of six angles
  // (90-degree symmetry: 0..75 are all different), the flash big / small / none, a small steady kick.
  const ANG = [0, 15, 30, 45, 60, 75]
  const FULL = (k, also = {}) => ANG.map((a, i) => {
    const aimed = k < 1
    const fl = i % 3 === 2 ? [] : [aimed || i % 3 === 1 ? 'flash2' : 'flash']
    const j = [0.06, -0.05, 0.04, -0.06, 0.05, -0.03][i]
    return { ...also, show: fl, flash: OUT, flash2: OUT, spin: turn(a), gun: rig({ t: [(0.5 + j) * k, 0.04 * k, 0], rot: [[[0, 0, 1], -(0.8 + 4 * j) * k]], pivot: SHOULDER }) }
  })
  // At a fixed cluster angle, the flash flickers while it really fires (spin-up past fire-at).
  const firingAt = (state, a, k, also = {}) => gun.firing(state, FULL(k, also).map(p => ({ ...p, spin: turn(a) })), { ...also, spin: turn(a) })
  // Spin-up (flag 3, 24 ticks): the angle grows as p^2 (one turn; the last frame turns 30 degrees a tick).
  const upAngle = p => 360 * p * p
  // Spin-down (flag 4, 30 ticks): from 30 degrees a tick to 0, 450 degrees in all.
  const downAngle = p => 450 * (2 * p - p * p)
  const r4 = v => Math.round(v * 10000) / 10000
  const spinUp = (state, k, also) => ({ type: 'minecraft:range_dispatch', property: 'minecraft:cooldown', entries: Array.from({ length: 24 }, (_, i) => ({ threshold: r4(i / 24 + 1e-4), model: firingAt(state, upAngle(1 - (i + 0.5) / 24), k, also) })), fallback: gun.firing(state, FULL(k, also), also) })
  const spinDown = (state, also) => gun.cooldown(state, 30, p => ({ ...also, spin: turn(downAngle(p)) }), also)
  // The draw (flag 2, 40 ticks): swings up, sags, turns its left side to you and the barrels are given a test spin.
  const draw = p => {
    const e = 1 - ease.out(Math.min(1, p / 0.4))
    const sag = ease.bump(p, 0.38, 0.54, 0.44)
    const side = ease.ramp(p, 0.52, 0.62) * (1 - ease.ramp(p, 0.84, 0.96))
    return {
      gun: rig({ t: [2.4 * e, -12 * e - 0.7 * sag + 0.6 * side, 0.6 * side], rot: [[[1, 0, 0], -18 * e - 12 * side], [[0, 1, 0], 9 * side], [[0, 0, 1], 32 * e - 1.8 * sag]], pivot: SHOULDER }),
      spin: turn(300 * ease.out(ease.ramp(p, 0.6, 0.92)))
    }
  }
  // The reload (90 ticks): the box magazine drops out and a new one goes in, slapped home; the cluster is ratcheted a
  // quarter turn twice by hand (the feed checked).
  const reload = p => {
    const a = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.66, 0.74))
    const b = ease.ramp(p, 0.68, 0.74) * (1 - ease.ramp(p, 0.88, 0.97))
    const tug = ease.bump(p, 0.1, 0.15, 0.12)
    const seat = ease.bump(p, 0.58, 0.64, 0.6)
    const slap = ease.bump(p, 0.62, 0.68, 0.64)
    const down = p < 0.4 ? ease.ramp(p, 0.15, 0.32) : 1 - ease.ramp(p, 0.46, 0.6)
    const r1 = ease.bump(p, 0.74, 0.79, 0.76); const r2 = ease.bump(p, 0.81, 0.86, 0.83)
    return {
      gun: rig({ t: [0.2 * tug, -0.6 * a + 0.6 * b - 0.3 * seat + 0.4 * slap, 1.2 * a + 0.5 * b], rot: [[[1, 0, 0], 22 * a - 14 * b], [[0, 1, 0], 8 * a + 10 * b], [[0, 0, 1], -5 * a - 1.5 * seat + 1.5 * slap - 1.2 * (r1 + r2)]], pivot: [14, 6, 8] }),
      mag: rig({ t: [0.6 * down, -11 * down, 3 * down], rot: [[[1, 0, 0], 20 * down]], pivot: [15.7, 4.8, 8] }),
      spin: turn(45 * ease.ramp(p, 0.74, 0.78) + 45 * ease.ramp(p, 0.81, 0.85)),
      hide: p > 0.32 && p < 0.46 ? ['mag'] : []
    }
  }
  const AIMED = { hide: ['stock'] }
  const fpDefault = gun.flag(2, gun.cooldown('', 40, draw), gun.flag(3, spinUp('', 1, {}), gun.flag(4, spinDown('', {}), gun.firing('', FULL(1), {}))))
  const fpAds = gun.flag(3, spinUp('ads', 0.4, AIMED), gun.flag(4, spinDown('ads', AIMED), gun.firing('ads', FULL(0.4, AIMED), AIMED)))
  const fpSprint = gun.flag(4, spinDown('sprint', {}), gun.composite('sprint'))
  // Elsewhere (third person, the ground, frames): the cluster spins for everyone (a random angle each frame) while
  // the gun fires or winds up/down (flags 0, 3, 4 are on the item, so every viewer sees them); the icon stays still.
  const tpSpin = { type: 'minecraft:range_dispatch', property: 'minecraft:time', source: 'random', wobble: false, entries: ANG.map((a, i) => ({ threshold: r4(i / ANG.length), model: gun.composite('', { spin: turn(a) }) })), fallback: gun.composite('', {}) }
  const still = { type: 'minecraft:model', model: gun.id('full', '') }
  const elsewhere = gun.flag(0, tpSpin, gun.flag(3, tpSpin, gun.flag(4, tpSpin, still)))
  const ctx = fp => ({ type: 'minecraft:select', property: 'minecraft:display_context', cases: [{ when: ['firstperson_righthand', 'firstperson_lefthand'], model: fp }, { when: ['gui'], model: still }], fallback: elsewhere })
  return {
    6: ctx(fpDefault),
    1006: ctx(fpAds),
    2006: ctx(fpSprint),
    3006: ctx(gun.cooldown('', 90, reload))
  }
}
