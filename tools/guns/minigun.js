// The minigun slot (WeaponMechanics weapons\assault_rifles\FN_FAL.yml, title FN_FAL, shown as "Hand Minigun"; skins
// Default 6, Scope +1000, Sprint +2000, Reload +3000; 2026-10-12, at the Photon Shotgun's level of detail: the kit's
// PG painter, style 'pg', density 4). A recreation of Pixel Gun 3D's Hand Minigun in its current look (drawn by hand
// from the fan wiki's icons, nothing taken from the game): a rifle-shaped microgun. Four black barrels in a "+" round
// a core (a light groove line along each), four silver clamps (stepped octagons: their faces along the barrels a step
// darker) and a big stepped black muzzle cap with dark vents on its faces and the four bores in its end, all of which
// SPIN about the axis (y AY, z AZ); a chunky black rotor housing where the barrels go in (cyan corner plates, studs); a
// black receiver in plates with cyan digital-camo plates on both sides (real thin boxes: blotches of light, mid and
// deep cyan in 2x2 texels, a black circuit trace), a cyan fin vent, the orange counter window (lit), rivets; a rail and
// a short reflex hood on its rear top (the red dot inside on a thin post, red lights on its roof); a black handguard
// under the barrels with a cyan toothed comb on its top and red lights at its front; a blue-grey box magazine (an ammo
// can) with a framed X on each side and ribs on its ends; a mauve pistol grip, raked back; a short black stock with
// cyan strips and a mauve butt pad.
// Frames (DonatingPhone GunFx and GunSpin: FN_FAL draw 40, fire 4, spin up 24, down 30-60; custom_model_data flags 0
// firing, 2 the draw, 3 spinning up, 4 spinning down):
//   - first person (minecraft:cooldown, keybind_down and the flags): flag 2 the draw (40 ticks: up from below, a sag,
//     a turn across the screen and a full-turn test spin of the barrels); flag 3 the spin-up (17-24 ticks), flag 4 the
//     spin-down (30-60); else, while rounds go out (flag 0), a full spin.
//   - the spin-up turns the cluster 360 p^2 degrees (p = the share of the clock gone) and the spin-down 360 (2p - p^2)
//     (720 / L degrees a tick down to 0). The light is painted from above, so only a whole turn looks like the rest
//     pose: every spin the model draws ends on one (a quarter turn would pop). A cluster turned 45 degrees or more a
//     tick seems to turn backward. GunSpin (GunSpin.java) starts the spin-up only from under fire-at (s < 0.3: L =
//     (1 - s) x 24, 17 ticks at least) and the spin-down only from s >= 0.3 (L = 30 / s, at most 60: 24 degrees a tick
//     at most), and the model reads only the cooldown's fraction, never L: so the spin-up draws only its slow part as
//     angles (p < 0.55: 23 degrees a tick at most at L 17), the fast part is the full spin's blur, and the spin-down
//     draws the whole clock. After a tap under fire-at GunSpin just turns flag 3 off (no spin-down): the cluster snaps
//     back to rest from at most about 31 degrees.
//   - the full spin: a fresh pose every frame (pg.js: time random, wobble off), the cluster at one of six angles (0 to
//     75 degrees: all different), the flash big, small or none, a small steady kick while fire is held; with the key up
//     (flag 0 lasts a few ticks after the last round) the cluster still turns, with no flash.
//   - elsewhere (third person, the ground, item frames: the cooldown and the key are the viewer's own, never read
//     there) the flags alone: 0, 3 or 4 turn the cluster at a random angle each frame, else it stands still; the icon is
//     the still full model.
//   - Reload (90 ticks): the gun comes up, muzzle up, its belly toward you (the box on the screen), the box drops out, a
//     new one comes up, seats and is slapped home; it turns across the screen, the cluster is ratcheted a quarter
//     turn twice by hand and coasts on a half turn as the gun levels (a whole turn in all). The sounds are timed to it
//     in FN_FAL.yml (Start_Mechanics, delayBeforePlay ticks): mag_out 13, mag_in 54 (its slap 4 later), ratchet 67
//     and 74.
//   - Scope: aim() on the reflex hood (its lens has only a front face: from inside it's culled; a cyan rim round its
//     window), the stock hidden, the small flash only; the dot sits over the barrels, and the spinning cluster shows
//     under it with the flash's arms either side.
// Built along x, muzzle toward -x, centred on z = 8 (+z is the gun's left: the side first person sees). The spin
// axis is y 8.6 (the cluster's boxes are symmetric about it, so their y edges are off the 1/4 grid; every static box
// is on it). Every box stays within -16..32: the gun runs from the muzzle cap's face at x = -15 to the butt pad at
// 30.5; the muzzle flash is drawn FX units back inside the bounds and moved out to the muzzle by its frames.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_minigun'
  const AY = 8.6 // the spin axis (y, z)
  const AZ = 8.0
  const MUZ = -15.0 // the muzzle cap's face
  const FX = 8 // the flash is drawn this far back (+x) and moved out in its frames
  const SY = 13.25 // the sight line: the reflex hood's window centre
  const HOOD = [19.0, 20.5] // the hood's front (the lens) and rear
  const GRIP = { angle: 15, axis: 'z', origin: [21.25, 4.75, 8] }
  // A seeded random (pg.js's mulberry32), so the camo is the same every build.
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  // Digital camo (the reference's cyan plates): a stamp of 2x2-texel cells in the plate's own tones ('+' its hi, '.'
  // its base, '-' its lo, 'd' its deep: a skin's cyan recolours them all), blotched by a smoothed noise, with one black
  // circuit trace ('#': a line along it, a drop, a 2x2 pad). w x h = the face's tile in texels.
  const camo = (w, h, seed) => {
    const r = rng(seed)
    const cw = (w >> 1) + 3; const ch = (h >> 1) + 3
    const n = Array.from({ length: ch }, () => Array.from({ length: cw }, () => r()))
    const v = (i, j) => { let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += n[j + a][i + b]; return s / 9 + (n[j + 1][i + 1] - 0.5) * 0.4 }
    const rows = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => { const t = v(x >> 1, y >> 1); return t < 0.39 ? 'd' : t < 0.47 ? '-' : t < 0.57 ? '.' : '+' }))
    const ty = 2 + Math.floor(r() * Math.max(1, h - 5)); const tx0 = 1 + Math.floor(r() * 3); const tx1 = Math.min(w - 4, tx0 + 6 + Math.floor(r() * Math.max(1, w - 12)))
    for (let x = tx0; x <= tx1; x++) rows[ty][x] = '#'
    const down = ty < h / 2 ? 1 : -1
    let y = ty
    for (let k = 0; k < 2 && y + down > 0 && y + down < h - 1; k++) { y += down; rows[y][tx1] = '#' }
    for (const [dx, dy] of [[0, 0], [1, 0], [0, down], [1, down]]) if (y + dy > 0 && y + dy < h - 1 && tx1 + dx < w - 1) rows[y + dy][tx1 + dx] = '#'
    return rows.map(row => row.join(''))
  }
  // A camo plate: a thin box 0.05 proud of a face (side +1 = the left, south face at z = z1; -1 the right, north at
  // z0), from x0..x1, y0..y1; its big face carries the camo stamp, its edges are outline.
  let plates = 0
  const plate = (x0, x1, y0, y1, side, z0, z1, extra = []) => {
    const face = side > 0 ? 'south' : 'north'
    const rows = camo(Math.ceil((x1 - x0) * 4 - 1e-6), Math.ceil((y1 - y0) * 4 - 1e-6), 1009 + 37 * plates++)
    return { from: [x0, y0, side > 0 ? z1 : z0 - 0.05], to: [x1, y1, side > 0 ? z1 + 0.05 : z0], c: 'cyan', grain: 0, deco: [{ k: 'stamp', face, at: [x0, y1], to: [x1, y0], rows, keys: { d: 'cyanD' } }, ...extra.map(d => ({ ...d, face }))] }
  }
  const both = (x0, x1, y0, y1, z0, z1, extra) => [plate(x0, x1, y0, y1, 1, z0, z1, extra), plate(x0, x1, y0, y1, -1, z0, z1, extra)]
  // A ring round the cluster (a clamp, the muzzle cap): a stepped octagon of three boxes about the axis, arms 2r long
  // and 2w wide, a square 2c; on its end faces (east, west: the rings round the barrels first person sees) a bolt near
  // each arm's tip and in each corner of the square (bolt = their key).
  const ring = (x0, x1, r, w, c, key, bolt, extra = {}) => {
    const ends = more => ({ deco: [...(extra.deco || []), ...more.map(d => ({ k: 'rivets', n: 2, size: 2, c: bolt, face: 'ends', ...d }))] })
    return [
      { from: [x0 + 0.02, AY - r, AZ - w], to: [x1 - 0.02, AY + r, AZ + w], c: key, ...extra, ...ends([{ at: [AZ - 0.25, AY + r - 0.25], to: [AZ + 0.25, AY - r + 0.25] }]) },
      { from: [x0 + 0.04, AY - w, AZ - r], to: [x1 - 0.04, AY + w, AZ + r], c: key, ...extra, ...ends([{ at: [AZ - r + 0.25, AY + 0.25], to: [AZ + r - 0.25, AY - 0.25] }]) },
      { from: [x0, AY - c, AZ - c], to: [x1, AY + c, AZ + c], c: key, ...extra, ...ends([{ at: [AZ - c + 0.25, AY + c - 0.25], to: [AZ + c - 0.25, AY + c - 0.75] }, { at: [AZ - c + 0.25, AY - c + 0.75], to: [AZ + c - 0.25, AY - c + 0.25] }]) }
    ]
  }
  // The clamps: silver, their faces along the barrels (east, west) a step darker, like the reference's bands.
  const CLAMP = { all: 'steel', east: 'steelD', west: 'steelD' }
  const D = 1.375; const H = 0.875 // a barrel's centre off the axis, its half size (z edges on the grid)
  const BX0 = -12.5; const BX1 = 10.5 // the barrels' ends (the rear one inside the rotor housing)
  const AROUND = [[D, 0], [-D, 0], [0, D], [0, -D]]
  // A barrel: black (little grain: the reference's are flat), panel seams, a light groove line along each long face near
  // its outer edge (the reference's grey lines between the black barrels).
  const barrel = (dy, dz) => {
    const y0 = AY + dy - H; const y1 = AY + dy + H; const z0 = AZ + dz - H; const z1 = AZ + dz + H
    const inner = dy > 0 ? 'down' : dy < 0 ? 'up' : dz > 0 ? 'north' : 'south'; return { dirs: ['north', 'south', 'up', 'down'].filter(d => d !== inner), from: [BX0, y0, z0], to: [BX1, y1, z1], c: 'barrel', grain: 0.07, split: { x: [-1.0, 6.0] },
      deco: [{ k: 'band', face: 'sides', at: [BX0, y1 - 0.25], to: [BX1, y1 - 0.75], c: 'groove' }, { k: 'band', face: 'flats', at: [BX0, z1 - 0.75], to: [BX1, z1 - 0.25], c: 'groove' }] }
  }
  // Decal helpers (model units; north/south faces [x, y], up/down [x, z], east/west [z, y]).
  const stud = (x, y, c = 'steel', face) => ({ k: 'rivets', at: [x, y + 0.5], to: [x + 0.5, y], n: 1, size: 2, c, ...(face ? { face } : {}) })
  // The magazine's emblem: a chunky X in a frame (11 x 11 texels, light steel).
  const XMARK = ['LLLLLLLLLLL', 'L.........L', 'L.LL...LL.L', 'L..LL.LL..L', 'L...LLL...L', 'L....L....L', 'L...LLL...L', 'L..LL.LL..L', 'L.LL...LL.L', 'L.........L', 'LLLLLLLLLLL']
  // ---------- the hands (pg.js spec.hands; handoff/2026-10-12/hands/PLAN.md) ----------
  // The right glove on the mauve grip (its top centre, raked 15 degrees; 2.5 deep and wide: 1.15 times the shared
  // glove); the left hand (only in the reload) palm up under the box, cupping it (the glove's C turned across the box,
  // 1.3 times the shared one): it pulls the box down and away, brings the new one up and slaps it home, then turns the
  // cluster a quarter turn twice by the middle clamp's arm.
  const { then, hands } = pg
  const { OR, OL } = hands
  const RH = rig({ t: [21.3 - OR[0], 4.7 - OR[1], 8 - OR[2]], rot: [[[0, 0, 1], 15]], pivot: OR })
  const LH = rig({ t: [15.6 - OL[0], -1.1 - OL[1], 8 - OL[2]], rot: [[[1, 0, 0], 90]], pivot: OL })
  const gun = pgGun(name, {
    hands: { right: { at: RH, scale: 1.15, armScale: 0.95 }, left: { at: LH, shown: false, scale: 1.3, armScale: 0.95 }, leftTree: false },
    style: 'pg',
    density: 4,
    palette: {
      // the black body, cap and stock (sampled #191a1b #2d2f31 #434548), its lit tops; the barrels and their light
      // grooves (#5d5e62 #74787c: the barrels' glint tone, so a skin's barrels bring their own)
      recv: [26, 27, 32], recvT: { of: 'recv', k: 1 }, barrel: [30, 31, 35], groove: { of: 'barrel', k: 2 },
      // the silver clamps, studs (#8b9095 #a5a7ad #bcbec1 #d6d9db)
      steel: [196, 200, 208], steelD: { of: 'steel', k: -1 },
      // the digital camo's cyan (#034560 #187792 #1892bc #31bdd9): its deep tone for the blotches
      cyan: [30, 160, 205], cyanD: { of: 'cyan', k: -2 },
      // the magazine's blue-grey steel (#454d59 #636f79 #7b8993) and its light X and ribs (#8b97a3)
      magG: [70, 84, 96], magL: [139, 151, 163],
      // the mauve grip and butt pad (#41374a #574c5f #81748a)
      grip: [87, 76, 97],
      // lights (kept by skins): the orange counter window, the red lights
      org: [222, 138, 57], red: [214, 26, 24],
      // the aimed-through parts (KEEP keys: skins never recolour them)
      lens: [46, 120, 216], dot: [255, 40, 40], post: [20, 20, 24], bore: [8, 8, 10], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: { recv: 'dark', recvT: 'dark', barrel: 'dark', steel: 'metal', steelD: 'metal', cyan: 'metal', cyanD: 'metal', magG: 'metal', magL: 'metal', grip: 'rubber', org: 'glow', red: 'glow', lens: 'glass', dot: 'glow', post: 'flat', bore: 'flat', flash: 'glow', flashCore: 'glow' },
    keep: ['org', 'red'],
    parts: {
      // ---------- the static body ----------
      body: [
        // ---- the rotor housing (the barrels go into its front face): wider than the receiver, cyan corner plates,
        // studs, holes on top, a seam round it ----
        { from: [10.0, 5.25, 4.75], to: [12.75, 12.0, 11.25], c: { all: 'recv', up: 'recvT' }, split: { x: [11.5] },
          deco: [
            { k: 'band', at: [10.25, 11.75], to: [11.25, 10.75], c: 'cyan' }, { k: 'band', at: [11.75, 6.5], to: [12.5, 5.5], c: 'cyan' },
            stud(10.5, 7.0), stud(11.75, 9.75),
            { k: 'holes', face: 'up', at: [10.25, 5.25], to: [11.25, 10.75], pitch: [2, 3] },
            { k: 'slots', face: 'down', at: [10.25, 5.5], to: [12.5, 10.5], dir: 'v', n: 3 },
            { k: 'inset', face: 'west', at: [5.0, 11.75], to: [6.0, 10.75], c: 'recv' }, { k: 'inset', face: 'west', at: [10.0, 11.75], to: [11.0, 10.75], c: 'recv' },
            { k: 'rivets', face: 'ends', at: [5.0, 6.0], to: [11.0, 5.5], n: 2, size: 2, c: 'steel' }, { k: 'slots', face: 'east', at: [5.0, 11.75], to: [11.0, 11.5], n: 1 }
          ] },
        // ---- the receiver: black and chunky, plates (seams), a cyan fin vent at its front bottom, the orange counter
        // window (lit: a flat bar on its top row just in front of the hood, like the reference's), slots, rivets along
        // the bottom, holes on its top front ----
        { from: [12.75, 4.75, 5.75], to: [23.25, 11.5, 10.25], c: { all: 'recv', up: 'recvT' }, split: { x: [16.0, 19.75], y: [8.5] },
          deco: [
            { k: 'vent', at: [13.0, 8.25], to: [15.75, 5.25], c: 'cyan', zig: true },
            { k: 'glow', at: [16.75, 11.25], to: [19.0, 10.0], c: 'org', emit: true },
            { k: 'rivets', at: [16.25, 5.5], to: [22.75, 5.0], n: 5, c: 'steel' },
            { k: 'holes', face: 'up', at: [13.0, 6.25], to: [15.5, 9.75], pitch: [2, 2] },
            { k: 'slots', face: 'up', at: [21.0, 6.25], to: [23.0, 9.75], n: 3 },
            { k: 'inset', face: 'east', at: [6.5, 11.0], to: [9.5, 9.0], c: 'recv' }
          ] },
        // the camo plates on both sides: the upper front plate (to the window), the lower rear plate (from the vent)
        ...both(13.0, 16.5, 9.25, 11.25, 5.75, 10.25, [stud(15.75, 10.5, 'steel')]),
        ...both(16.25, 23.0, 6.25, 8.25, 5.75, 10.25),
        // ---- the rail on top (steel teeth on its sides only: a bright top would glare in the hood), the hood's mount
        // (wider, so the side isn't a chimney) ----
        { from: [13.0, 11.5, 7.0], to: [23.0, 12.0, 9.0], c: 'recv', deco: [{ k: 'rail', face: ['north', 'south'], at: [13.0, 12.0], to: [23.0, 11.5], c: 'steel' }] },
        { from: [17.75, 12.0, 6.75], to: [21.0, 12.25, 9.25], c: 'recv', outline: false, deco: [{ k: 'band', face: 'sides', at: [18.0, 12.25], to: [18.5, 12.0], c: 'steel' }] },
        // ---- the reflex hood: four walls round the window (0.5 thick), a cyan rim round the window on its rear face
        // (the eye's side), the lens on its front face only (from inside the eye sees through it), the dot on a thin post,
        // red lights on its roof ----
        { from: [HOOD[0], 12.25, 9.0], to: [HOOD[1], 14.25, 9.5], c: 'recv', deco: [{ k: 'slots', face: 'south', at: [19.25, 14.0], to: [20.25, 13.0], dir: 'v', n: 2 }, { k: 'band', face: 'south', at: [19.25, 12.75], to: [20.25, 12.5], c: 'cyan' }] },
        { from: [HOOD[0], 12.25, 6.5], to: [HOOD[1], 14.25, 7.0], c: 'recv', deco: [{ k: 'slots', face: 'north', at: [19.25, 14.0], to: [20.25, 13.0], dir: 'v', n: 2 }, { k: 'band', face: 'north', at: [19.25, 12.75], to: [20.25, 12.5], c: 'cyan' }] },
        { from: [HOOD[0], 14.25, 6.5], to: [HOOD[1], 14.75, 9.5], c: { all: 'recv', up: 'recvT' } },
        ...[[12.25, 14.5, 9.0, 9.25], [12.25, 14.5, 6.75, 7.0], [14.25, 14.5, 7.0, 9.0]].map(([y0, y1, z0, z1]) => ({ from: [HOOD[1], y0, z0], to: [HOOD[1] + 0.02, y1, z1], c: 'cyan', dirs: ['east'], outline: false })),
        { from: [HOOD[0] - 0.02, 12.25, 7.0], to: [HOOD[0], 14.25, 9.0], c: 'lens', dirs: ['west'], outline: false },
        { from: [19.25, SY - 0.075, 7.925], to: [19.4, SY + 0.075, 8.075], c: 'dot', glow: true },
        { from: [19.3, 12.25, 7.975], to: [19.35, SY - 0.075, 8.025], c: 'post', outline: false },
        { from: [HOOD[0], 14.75, 7.5], to: [19.5, 15.0, 8.5], c: 'red', glow: true },
        { from: [20.0, 14.75, 7.5], to: [HOOD[1], 15.0, 8.5], c: 'red', glow: true },
        // ---- the handguard under the barrels (its top under the clamps' sweep: AY - 3.35), a cyan band, a slot, red
        // LEDs on its front face and red lights on its front corners; the cyan toothed comb on it (under the barrels'
        // sweep, AY - 2.6; between the middle clamp and the rear one) ----
        { from: [3.0, 3.0, 6.25], to: [12.75, 5.25, 9.75], c: { all: 'recv', up: 'recvT' }, split: { x: [6.25, 10.0] },
          deco: [{ k: 'band', at: [3.25, 4.5], to: [9.75, 4.0], c: 'cyan' }, { k: 'slots', at: [6.5, 3.75], to: [9.75, 3.25], n: 1 }, { k: 'leds', face: 'west', at: [6.75, 5.0], to: [9.25, 3.5], n: 2, c: 'red', emit: true }, { k: 'slots', face: 'down', at: [3.5, 6.5], to: [9.5, 9.5], dir: 'v', n: 4 }] },
        { from: [3.25, 5.25, 6.75], to: [8.0, 6.0, 9.25], c: 'cyan', deco: [{ k: 'ribs', at: [3.25, 6.0], to: [8.0, 5.25], c: 'cyan' }, { k: 'ribs', face: 'up', at: [3.25, 6.75], to: [8.0, 9.25], c: 'cyan' }] },
        { from: [2.5, 4.0, 9.75], to: [3.25, 5.0, 10.0], c: 'red', glow: true },
        { from: [2.5, 4.0, 6.0], to: [3.25, 5.0, 6.25], c: 'red', glow: true },
        // ---- the trigger guard and the trigger ----
        { from: [18.5, 3.25, 7.5], to: [20.25, 3.75, 8.5], c: 'recv' },
        { from: [18.5, 3.75, 7.5], to: [19.0, 4.75, 8.5], c: 'recv' },
        { from: [19.25, 3.75, 7.75], to: [19.75, 4.75, 8.25], c: 'steel', outline: false },
        // ---- the mauve pistol grip, raked back: finger grooves on its front, a black cap ----
        { from: [20.0, 0.75, 6.75], to: [22.5, 4.75, 9.25], c: 'grip', rot: GRIP, deco: [{ k: 'slots', face: 'west', at: [7.0, 4.0], to: [9.0, 1.25], n: 3 }, { k: 'band', face: 'sides', at: [20.25, 4.5], to: [20.75, 1.0], c: 'recv' }] },
        { from: [19.75, 0.25, 6.5], to: [22.75, 0.75, 9.5], c: 'recv', rot: GRIP, deco: [{ k: 'slots', face: 'down', at: [20.25, 7.0], to: [22.25, 9.0], dir: 'v', n: 3 }] }
      ],
      // ---------- the spinning cluster (everything here turns about the axis) ----------
      spin: [
        ...AROUND.map(([dy, dz]) => barrel(dy, dz)),
        // the clamps: rear, middle (the big one, a seam round it), a thin third, front
        ...ring(8.25, 9.75, 2.75, 1.25, 2.3, CLAMP, 'recv', { deco: [{ k: 'rivets', at: [8.5, AY + 0.25], to: [9.5, AY - 0.25], n: 2, c: 'recv' }, { k: 'rivets', face: 'flats', at: [8.5, AZ - 0.25], to: [9.5, AZ + 0.25], n: 2, c: 'recv' }] }),
        ...ring(0.5, 2.75, 3.0, 1.5, 2.3, CLAMP, 'recv', { split: { x: [1.75] } }),
        ...ring(-5.5, -4.5, 2.75, 1.25, 2.0, CLAMP, 'recv'),
        ...ring(-11.0, -9.25, 3.0, 1.25, 2.3, CLAMP, 'recv'),
        // the stepped black muzzle cap (dark vents on its faces), a smaller front plate, the four bores and the hub
        ...ring(-14.5, -11.0, 3.25, 1.5, 2.5, { all: 'recv', up: 'recvT' }, 'steel', { deco: [{ k: 'inset', at: [-14.0, AY + 0.75], to: [-12.75, AY - 0.75], c: 'recv' }, { k: 'inset', face: 'flats', at: [-14.0, AZ - 0.75], to: [-12.75, AZ + 0.75], c: 'recv' }, { k: 'slots', at: [-12.5, AY + 1.0], to: [-11.25, AY - 1.0], dir: 'v', n: 2 }, { k: 'slots', face: 'flats', at: [-12.5, AZ - 1.0], to: [-11.25, AZ + 1.0], dir: 'v', n: 2 }] }),
        ...ring(MUZ, -14.5, 2.5, 1.25, 2.0, 'recv', 'steel'),
        ...AROUND.map(([dy, dz]) => ({ from: [MUZ - 0.02, AY + dy - 0.5, AZ + dz - 0.5], to: [MUZ, AY + dy + 0.5, AZ + dz + 0.5], c: 'bore', dirs: ['west'], outline: false })),
        { from: [MUZ - 0.02, AY - 0.25, AZ - 0.25], to: [MUZ, AY + 0.25, AZ + 0.25], c: 'steel', dirs: ['west'], outline: false }
      ],
      // The box magazine (an ammo can): blue-grey steel, a framed X on each side, a seam near its top, ribs on its ends.
      mag: [
        { from: [12.75, 0.0, 5.5], to: [18.5, 4.75, 10.5], c: { all: 'magG', up: 'magL' }, split: { y: [4.0] },
          deco: [
            { k: 'inset', at: [13.25, 3.75], to: [16.25, 0.5], c: 'magG' },
            { k: 'stamp', at: [13.5, 3.5], to: [16.25, 0.75], rows: XMARK, keys: { L: 'magL' } },
            { k: 'slots', at: [16.75, 3.5], to: [18.25, 0.5], dir: 'v', n: 2 },
            { k: 'slots', face: 'ends', at: [6.0, 3.5], to: [10.0, 0.5], n: 3 },
            { k: 'rivets', face: 'ends', at: [6.0, 4.5], to: [10.0, 4.25], n: 2, c: 'magL' },
            { k: 'slots', face: 'down', at: [13.25, 6.0], to: [18.0, 10.0], dir: 'v', n: 4 },
            { k: 'inset', face: 'up', at: [13.25, 5.75], to: [18.0, 10.25], c: 'magG' }
          ] }
      ],
      // The short black stock (hidden while aiming): cyan strips top and bottom (camo plates), two insets between,
      // a stepped bottom, the mauve butt pad (grooves).
      stock: [
        { from: [23.25, 5.5, 6.5], to: [29.5, 10.75, 9.5], c: { all: 'recv', up: 'recvT' }, split: { x: [26.25] },
          deco: [{ k: 'inset', at: [24.0, 8.75], to: [26.0, 7.0], c: 'recv' }, { k: 'inset', at: [26.5, 8.75], to: [29.0, 7.0], c: 'recv' }, { k: 'rail', face: 'up', at: [23.5, 6.75], to: [29.25, 9.25], c: 'recv' }] },
        ...both(23.5, 29.25, 9.25, 10.5, 6.5, 9.5),
        ...both(23.5, 29.25, 5.75, 6.5, 6.5, 9.5),
        { from: [25.5, 4.25, 6.75], to: [29.5, 5.5, 9.25], c: 'recv', deco: [{ k: 'slots', at: [26.0, 5.25], to: [29.0, 4.5], dir: 'v', n: 3 }] },
        { from: [29.5, 4.0, 6.25], to: [30.5, 11.25, 9.75], c: 'grip', deco: [{ k: 'slots', face: 'east', at: [6.5, 10.75], to: [9.5, 4.5], n: 5 }] }
      ],
      // The flash (drawn FX back; its frames move it out), centred on the axis: a hot core, a jet, a star of spikes.
      flash: [
        { from: [MUZ - 3.5 + FX, AY - 2.25, AZ - 2.25], to: [MUZ + FX, AY + 2.25, AZ + 2.25], c: 'flashCore', glow: true },
        { from: [MUZ - 8.0 + FX, AY - 0.75, AZ - 0.75], to: [MUZ - 3.25 + FX, AY + 0.75, AZ + 0.75], c: 'flash', glow: true },
        { from: [MUZ - 2.5 + FX, AY - 5.5, AZ - 0.75], to: [MUZ - 1.25 + FX, AY + 5.5, AZ + 0.75], c: 'flash', glow: true },
        { from: [MUZ - 2.5 + FX, AY - 0.75, AZ - 5.5], to: [MUZ - 1.25 + FX, AY + 0.75, AZ + 5.5], c: 'flash', glow: true },
        { from: [MUZ - 2.25 + FX, AY - 4.5, AZ - 0.5], to: [MUZ - 1.5 + FX, AY + 4.5, AZ + 0.5], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZ - 1.875 + FX, AY, AZ] } },
        { from: [MUZ - 2.25 + FX, AY - 0.5, AZ - 4.5], to: [MUZ - 1.5 + FX, AY + 0.5, AZ + 4.5], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZ - 1.875 + FX, AY, AZ] } }
      ],
      // A smaller flash (the flicker's second size, and the only one aiming shows): a thin X whose arms reach past the
      // cap (r 3.54 at its corners: from behind, a flash inside it is hidden by the cap); aimed, its upper arms show
      // either side of the cap under the dot (an upright spike would sit behind the dot's post, or cross the dot).
      flash2: [
        { from: [MUZ - 2.25 + FX, AY - 1.0, AZ - 1.0], to: [MUZ + FX, AY + 1.0, AZ + 1.0], c: 'flashCore', glow: true },
        { from: [MUZ - 5.0 + FX, AY - 0.5, AZ - 0.5], to: [MUZ - 2.25 + FX, AY + 0.5, AZ + 0.5], c: 'flash', glow: true },
        { from: [MUZ - 1.75 + FX, AY - 4.5, AZ - 0.375], to: [MUZ - 1.0 + FX, AY + 4.5, AZ + 0.375], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZ - 1.375 + FX, AY, AZ] } },
        { from: [MUZ - 1.75 + FX, AY - 0.375, AZ - 4.5], to: [MUZ - 1.0 + FX, AY + 0.375, AZ + 4.5], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZ - 1.375 + FX, AY, AZ] } }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -72, 0], translation: [-3.0, 3.6, -1.2], scale: [0.5, 0.5, 0.5] },
      thirdperson: { rotation: [0, -90, 0], translation: [0, 1.2, -11], scale: [0.66, 0.66, 0.66] },
      gui: { rotation: [0, 180, -32], translation: [0.4, 0.2, 0], scale: [0.38, 0.38, 0.38] },
      ground: { rotation: [0, 0, -45], translation: [-1, 7, 0], scale: [0.7, 0.7, 0.7] },
      fixed: { rotation: [0, 0, -45], translation: [-0.5, 0.5, -1], scale: [0.7, 0.7, 0.7] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: HOOD[1], rearDepth: 0.6, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [-12, -44, 18], translation: [-3.6, 2.4, -2.2], scale: [0.5, 0.5, 0.5] }
    }
  })

  // ---------- frames ----------
  const r4 = v => Math.round(v * 10000) / 10000
  const SHOULDER = [21.25, 5.5, 8] // the grip's top: kicks turn the muzzle up about it
  const OUT = rig({ t: [-FX, 0, 0] }) // the flash moved out to the muzzle
  // The cluster turned a degrees about the axis, clockwise as the shooter sees it (from behind).
  const turn = a => rig({ rot: [[[1, 0, 0], -a]], pivot: [0, AY, AZ] })
  // The blur: the cluster at one of six angles (the "+" repeats every 90 degrees: all different), a fresh one every
  // frame; third person makes do with three.
  const ANG = [0, 15, 30, 45, 60, 75]
  const JIT = [0.06, -0.05, 0.04, -0.06, 0.05, -0.03]
  // Fire held while rounds go out: the flash big, small or none in turn (aimed: small or none) and a small steady kick
  // (0.5 back, 0.8 degrees up, k scales it: aimed 0.4) with a little jitter; at each of the angles, or at one (at).
  const shots = (k, also, at) => (at === undefined ? ANG : [at, at, at]).map((a, i) => ({
    ...also,
    ...(i % 3 !== 2 ? { show: [k < 1 || i % 3 === 1 ? 'flash2' : 'flash'] } : {}),
    flash: OUT, flash2: OUT,
    spin: turn(a),
    gun: rig({ t: [(0.5 + JIT[i]) * k, 0.04 * k, 0], rot: [[[0, 0, 1], -(0.8 + 4 * JIT[i]) * k]], pivot: SHOULDER })
  }))
  const spins = (also, angles = ANG) => angles.map(a => ({ ...also, spin: turn(a) }))
  // One of the poses afresh every frame (time random, wobble off: pg.js firing's flicker). The entry at 0 covers every
  // value, so the fallback is never drawn (a plain model, kept small).
  const random = (state, ps) => ({ type: 'minecraft:range_dispatch', property: 'minecraft:time', source: 'random', wobble: false, entries: ps.map((p, i) => ({ threshold: r4(i / ps.length), model: gun.composite(state, p) })), fallback: { type: 'minecraft:model', model: gun.id('full', state) } })
  const key = (on, off) => ({ type: 'minecraft:condition', property: 'minecraft:keybind_down', keybind: 'key.use', on_true: on, on_false: off })
  // The full spin (flag 0: rounds went out in the last few ticks): fire held, the shots; the key up, the cluster still
  // turns. idle: without flag 0.
  const spinning = (state, k, also, idle) => gun.flag(0, key(random(state, shots(k, also)), random(state, spins(also))), idle)
  // At one angle of the spin-up's slow part: the shots there while rounds go out (past fire-at) and fire is held.
  const at = (state, k, also, a) => { const still = gun.composite(state, { ...also, spin: turn(a) }); return gun.flag(0, key(random(state, shots(k, also, a)), still), still) }
  // The spin-up (flag 3, 17-24 ticks): 360 p^2 degrees while it's slow (p < 0.55: under 17 degrees a tick from cold, 23
  // at the shortest clock), then the blur (one entry for the whole fast part: the cooldown's share left under 0.45, and
  // 0 when the clock is out).
  const spinUp = (state, k, also) => ({
    type: 'minecraft:range_dispatch',
    property: 'minecraft:cooldown',
    entries: [
      { threshold: 0, model: spinning(state, k, also, random(state, spins(also))) },
      ...Array.from({ length: 24 }, (_, i) => i).filter(i => 1 - (i + 0.5) / 24 < 0.55).map(i => { const p = 1 - (i + 0.5) / 24; return { threshold: r4(i / 24 + 1e-4), model: at(state, k, also, 360 * p * p) } })
    ],
    fallback: { type: 'minecraft:model', model: gun.id('full', state) }
  })
  // The spin-down (flag 4): 360 (2p - p^2) degrees over the whole clock (p = the share of it gone), read from the
  // cooldown's fraction, so one drawing fits every clock GunSpin starts (L = 30 / s ticks, 30-60: it starts only from
  // s >= fire-at 0.3). It starts at 720 / L degrees a tick (24 at most, 12 at L 60) and slows to 0, ending a whole turn
  // round (the light is painted from above: only a whole turn looks like the rest pose). Drawn in steps of at most 15
  // degrees and 1/60 of the clock (one a tick for the longest clock, 60: with 1/30 a 45-tick clock held every other
  // angle two ticks, a stutter), each at its middle (the last ones round to the rest pose); no flash (the
  // trigger is up). The cooldown runs 1 -> 0: the step from p0 to p1 is the entry at 1 - p1.
  const DOWN = (() => {
    const cut = [0]
    for (let p = 0; p < 1 - 1e-9;) { const a = 360 * (2 * p - p * p); p = Math.min(1, p + 1 / 60, 1 - Math.sqrt(Math.max(0, 1 - (a + 15) / 360))); cut.push(p) }
    const down = cut.slice(1).map((p1, i) => { const p = (cut[i] + p1) / 2; const a = 360 * (2 * p - p * p); return { threshold: r4(1 - p1 + 1e-4), angle: 360 - a < 1 ? 0 : r4(a) } }).reverse()
    down[0].threshold = 0 // (the tie bias as in pg.js's cooldown; the lowest entry from 0)
    return down
  })()
  const spinDown = (state, also) => ({
    type: 'minecraft:range_dispatch',
    property: 'minecraft:cooldown',
    entries: DOWN.map(d => ({ threshold: d.threshold, model: gun.composite(state, d.angle ? { ...also, spin: turn(d.angle) } : also) })),
    fallback: gun.composite(state, also)
  })
  // The draw (flag 2, 40 ticks; FN_FAL.yml Weapon_Equip_Delay 40): the heavy gun swings up from below, muzzle down and
  // rolled out, arrives at p 0.4 and sags under its weight (0.38-0.54); it turns across the screen (0.52-0.62, like the
  // reload's ratchet pose) and the barrels are given a full-turn test spin (0.5-0.96: 29 degrees a tick at most, ending
  // on the rest pose; the draw sound's whir 1.0-1.92 s); level by 0.96.
  const draw = p => {
    const e = 1 - ease.out(Math.min(1, p / 0.4))
    const sag = ease.bump(p, 0.38, 0.54, 0.44)
    const side = ease.ramp(p, 0.52, 0.62) * (1 - ease.ramp(p, 0.84, 0.96))
    return {
      gun: rig({ t: [2.4 * e, -12 * e - 0.7 * sag + 2.0 * side, 1.8 * side], rot: [[[1, 0, 0], -18 * e + 4 * side], [[0, 1, 0], 20 * side], [[0, 0, 1], 32 * e - 1.8 * sag - 4 * side]], pivot: SHOULDER }),
      spin: turn(360 * ease.ramp(p, 0.5, 0.96))
    }
  }
  // The reload (90 ticks): the gun comes up, muzzle up, its belly toward you (0-0.1), so the box is on the screen; the
  // catch is pressed (a tug, 0.1-0.15) and the box drops out down and toward you (0.15-0.32); gone (0.32-0.46); a new one
  // comes up (0.46-0.6), seats (a jolt at 0.6) and is slapped home (0.64); the gun turns across the screen (0.64-0.74)
  // and the cluster is ratcheted a quarter turn twice by hand (0.744-0.8 and 0.822-0.878, with the ratchet
  // sounds: 27 degrees a tick at most), then coasts on a half turn as the gun levels (0.87-0.98: a whole turn in all,
  // so it ends on the rest pose); level by 0.97.
  const MAG_TOP = [15.5, 4.75, 8] // the box's top middle
  // The two poses: t (model units), then turns about x (the roll: + top toward you), y (+ muzzle across the screen) and
  // z (- muzzle up), about the receiver's middle. The box pose lifts the gun high, muzzle up and rolled, its belly to the
  // eye (lower, the box would change below the screen's edge); the ratchet pose turns it across the screen, so the
  // cluster shows from the side and its quarter turns read. MD: where the box goes when it's out (and turned).
  const MP = { t: [0, 8, 4], x: -30, y: 15, z: -18 }
  const BP = { t: [0, 3, 2.5], x: 5, y: 25, z: -6 }
  const MD = { t: [0.5, -9, 3], x: -18, z: 8 }
  // The left hand: below the screen (where the bag was), under the box, on the middle clamp's arm that faces you (the
  // "+" repeats every quarter turn, so after each turn the next arm is where the first one was).
  const boxRig = out => rig({ t: [MD.t[0] * out, MD.t[1] * out, MD.t[2] * out], rot: [[[1, 0, 0], MD.x * out], [[0, 0, 1], MD.z * out]], pivot: MAG_TOP })
  const BELOW = then(LH, rig({ t: [3, -13, 7], rot: [[[1, 0, 0], -20]], pivot: [15.6, -1.1, 8] }))
  const CLAMP_ARM = rig({ t: [1.6 - OL[0], AY - OL[1], AZ + 3.3 - OL[2]], pivot: OL })
  const reload = p => {
    const a = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.62, 0.72)) // belly toward you: the box changed
    const b = ease.ramp(p, 0.64, 0.74) * (1 - ease.ramp(p, 0.88, 0.97)) // its left side toward you: the ratchet
    const tug = ease.bump(p, 0.1, 0.15, 0.12)
    const seat = ease.bump(p, 0.58, 0.64, 0.6)
    const slap = ease.bump(p, 0.62, 0.68, 0.64)
    const out = p < 0.4 ? ease.ramp(p, 0.15, 0.32) : 1 - ease.ramp(p, 0.46, 0.6)
    const r1 = ease.bump(p, 0.744, 0.8, 0.76); const r2 = ease.bump(p, 0.822, 0.878, 0.84)
    // the left hand: up under the box (0.02-0.1), its thumb on the catch (the tug), with the box down and away and the
    // new one up, the slap's push (0.62-0.68), forward to the clamp (0.66-0.744), the first quarter turn riding the arm
    // (0.744-0.8), back to the next arm (0.8-0.822), the second (0.822-0.878), away off the lower left (0.88-0.935) as the
    // cluster coasts
    let place
    const onArm = q => then(CLAMP_ARM, turn(90 * q))
    if (p < 0.1) place = hands.mix(BELOW, LH, ease.ramp(p, 0.02, 0.1))
    else if (p < 0.66) place = then(then(LH, boxRig(out)), rig({ t: [0, 0.8 * slap, 0] }))
    else if (p < 0.744) place = hands.mix(LH, onArm(0), ease.ramp(p, 0.66, 0.744))
    else if (p < 0.8) place = onArm(ease.ramp(p, 0.744, 0.8))
    else if (p < 0.822) place = hands.mix(onArm(1), onArm(0), ease.ramp(p, 0.8, 0.822))
    else if (p < 0.88) place = onArm(ease.ramp(p, 0.822, 0.878))
    else place = hands.mix(onArm(1), then(onArm(1), rig({ t: [-2, -26, 5] })), ease.ramp(p, 0.88, 0.935))
    return {
      gun: rig({ t: [MP.t[0] * a + 0.3 * tug, MP.t[1] * a - 0.3 * seat + 0.3 * slap + BP.t[1] * b, MP.t[2] * a + BP.t[2] * b], rot: [[[1, 0, 0], MP.x * a + BP.x * b], [[0, 1, 0], MP.y * a + BP.y * b], [[0, 0, 1], MP.z * a + BP.z * b - 1.5 * seat + 1.5 * slap - 1.2 * (r1 + r2)]], pivot: [17, 7, 8] }),
      mag: boxRig(out),
      spin: turn(90 * ease.ramp(p, 0.744, 0.8) + 90 * ease.ramp(p, 0.822, 0.878) + 180 * ease.ramp(p, 0.87, 0.98)),
      lhand: hands.pose(LH, place),
      show: p > 0.015 && p < 0.95 ? ['lhand'] : [],
      hide: p > 0.32 && p < 0.46 ? ['mag'] : []
    }
  }
  const AIMED = { hide: ['stock'] }
  // Elsewhere (third person, the ground, item frames): the flags alone (the cooldown and the key are the viewer's own);
  // the icon still.
  const tpSpin = random('', spins({ hide: ['rhand'] }, [0, 30, 60])) // (no hands outside first person)
  const still = { type: 'minecraft:model', model: gun.id('full', '') }
  const elsewhere = gun.flag(0, tpSpin, gun.flag(3, tpSpin, gun.flag(4, tpSpin, still)))
  const ctx = fp => ({ type: 'minecraft:select', property: 'minecraft:display_context', cases: [{ when: ['firstperson_righthand', 'firstperson_lefthand'], model: fp }, { when: ['gui'], model: still }], fallback: elsewhere })
  const fpDefault = gun.flag(2, gun.cooldown('', 40, draw), gun.flag(3, spinUp('', 1, {}), gun.flag(4, spinDown('', {}), spinning('', 1, {}, gun.composite('')))))
  const fpAds = gun.flag(2, gun.composite('ads', AIMED), gun.flag(3, spinUp('ads', 0.4, AIMED), gun.flag(4, spinDown('ads', AIMED), spinning('ads', 0.4, AIMED, gun.composite('ads', AIMED)))))
  // Sprinting stops the shots (FN_FAL.yml: Sprinting DENY): the cluster runs down on the sprint pose.
  const sprintSpin = random('sprint', spins({}))
  const fpSprint = gun.flag(3, sprintSpin, gun.flag(4, spinDown('sprint', {}), gun.flag(0, sprintSpin, gun.composite('sprint'))))
  return {
    6: ctx(fpDefault),
    1006: ctx(fpAds),
    2006: ctx(fpSprint),
    3006: ctx(gun.cooldown('', 90, reload))
  }
}
