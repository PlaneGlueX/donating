// The rifle slot (WeaponMechanics weapons\assault_rifles\AK_47.yml, the strongest gun: full-auto 10 shots a second,
// 30 rounds; skins Default 5, Scope +1000, Sprint +2000, Reload +3000, No_Ammo +4000). Since 2026-10-05 a recreation
// of Pixel Gun 3D's classic scoped AK, the "AK-48" (the owner: the sold guns remade as PG3D's; drawn by hand from the
// wiki's picture, nothing taken from the game): a black receiver with gunmetal edges, a stepped slant compensator, a
// handguard banded red and white, a grey grenade launcher under the barrel, a laser on the left with its red beam,
// an ACOG on top (a hollow tube: aiming looks through it at a red dot; its blue lens stands out of the front, seen
// from the side too, with no back face, so from inside every face of it is culled), a striped banana magazine, a
// checkered grip and a skeleton stock with a red stripe. Cops of difficulty 4 hold it (third person matters).
// Frames (pg.js): drawn (GunFx's 30-tick draw cooldown) it rises from below and levels out; fire held flickers a
// muzzle flash and kicks (and the charging handle cycles); the reload rocks the magazine out forward, a new one in,
// then pulls the charging handle on the right (the gun rolls so it shows); empty, the handle stays back (drawn empty:
// the same draw).
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the scope's axis, y = SY.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_ak47'
  const SY = 10.2
  // A hollow tube along x (the scope's sections): four walls around an opening, so aiming looks through it.
  const tube = (x0, x1, [y0, y1, z0, z1], [yi0, yi1, zi0, zi1], c, more = {}) => [
    { from: [x0, y0, zi1], to: [x1, y1, z1], c, ...more }, // left (z+), full height: one face from the side
    { from: [x0, y0, z0], to: [x1, y1, zi0], c, ...more }, // right (z-)
    { from: [x0, yi1, zi0], to: [x1, y1, zi1], c, ...more }, // top
    { from: [x0, y0, zi0], to: [x1, yi0, zi1], c, ...more } // bottom
  ]
  const BLACK = { c: { all: 'recv', up: 'recvT' }, ink: 'gmD' } // black parts: a lighter top and dark gunmetal edges
  const GRIP = { angle: 20, axis: 'z', origin: [17.6, 5.0, 8] }
  // The magazine curves forward in three steps; each step turns about the back corner of the one above it (so the
  // back stays closed and the front overlaps).
  const MAG1 = { angle: -15, axis: 'z', origin: [13.0, 3.15, 8] }
  const MAG2 = { angle: -30, axis: 'z', origin: [12.34, 0.687, 8] } // MAG1's turn of [13.0, 0.6]
  const gun = pgGun(name, {
    palette: {
      recv: [24, 25, 30], recvT: [44, 46, 54], gm: [76, 80, 92], gmD: [46, 49, 58], gmL: [122, 128, 142], edge: [176, 182, 194],
      red: [210, 30, 40], redB: [255, 60, 60], white: [236, 236, 236], gl: [108, 113, 124],
      beam: [255, 32, 32], lens: [46, 120, 216], lensB: [110, 176, 248],
      magG: [154, 160, 170], magW: [232, 232, 232], magK: [42, 44, 50], gripP: [172, 175, 182],
      bore: [10, 10, 12], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    parts: {
      body: [
        // The compensator: a stepped slant (the lower lip longest; the steps light and unoutlined, so they read as
        // steps), a port on top, the bore.
        { from: [-6.2, 6.7, 6.9], to: [-4.4, 8.9, 9.1], c: { all: 'gm', up: 'gmL' }, pat: 'chrome' },
        { from: [-6.8, 6.7, 7.05], to: [-6.2, 8.2, 8.95], c: 'gmL', outline: false },
        { from: [-7.4, 6.7, 7.2], to: [-6.8, 7.45, 8.8], c: 'edge', outline: false },
        { from: [-6.85, 7.5, 7.6], to: [-6.8, 8.0, 8.4], c: 'bore', dirs: ['west'], outline: false },
        { from: [-5.8, 8.9, 7.55], to: [-4.8, 8.92, 8.45], c: 'bore', dirs: ['up'], outline: false },
        { from: [-4.4, 7.35, 7.55], to: [0.6, 8.15, 8.45], c: 'gm', pat: 'chrome' }, // the barrel
        { from: [-3.4, 6.8, 7.3], to: [-2.0, 8.6, 8.7], ...BLACK }, // the front sight base (low: aiming sees past it)
        // The handguard: black, banded white and red, with the gas tube's cover on top; metal bands at both ends.
        { from: [0.6, 5.6, 6.9], to: [8.6, 8.2, 9.1], ...BLACK },
        { from: [0.6, 7.95, 9.1], to: [19.6, 8.2, 9.14], c: 'edge', outline: false, dirs: ['south'] },
        { from: [0.6, 7.95, 6.86], to: [19.6, 8.2, 6.9], c: 'edge', outline: false, dirs: ['north'] },
        { from: [1.2, 8.2, 7.3], to: [8.6, 8.8, 8.7], ...BLACK },
        { from: [1.6, 5.5, 6.82], to: [3.4, 8.3, 9.18], c: 'white' },
        { from: [3.85, 5.5, 6.82], to: [4.45, 8.3, 9.18], c: { all: 'red', up: 'redB' }, outline: false },
        { from: [4.85, 5.5, 6.82], to: [5.45, 8.3, 9.18], c: { all: 'red', up: 'redB' }, outline: false },
        { from: [5.8, 5.5, 6.82], to: [7.6, 8.3, 9.18], c: 'white' },
        { from: [0.2, 5.5, 6.8], to: [0.9, 8.4, 9.2], c: 'gm', ink: 'recv' },
        { from: [8.4, 5.4, 6.8], to: [9.2, 8.6, 9.2], c: 'gm', ink: 'recv' },
        // The grenade launcher under the barrel: a grey tube with white bands, its bore, the mount and the breech.
        { from: [-2.6, 3.5, 7.0], to: [6.2, 5.4, 9.0], c: 'gl', pat: 'chrome' },
        { from: [-1.6, 3.4, 6.95], to: [-1.0, 5.5, 9.05], c: 'white', outline: false },
        { from: [3.8, 3.4, 6.95], to: [4.4, 5.5, 9.05], c: 'white', outline: false },
        { from: [-2.65, 3.9, 7.4], to: [-2.6, 5.0, 8.6], c: 'bore', dirs: ['west'], outline: false },
        { from: [-0.6, 5.4, 7.5], to: [4.6, 5.6, 8.5], c: 'gm' },
        { from: [6.2, 3.3, 7.2], to: [7.6, 5.5, 8.8], c: 'gm', ink: 'recv' },
        // The laser on the left of the handguard's front, its emitter and the beam (always on).
        { from: [-0.6, 6.0, 9.1], to: [1.8, 7.3, 10.1], ...BLACK },
        { from: [-0.65, 6.35, 9.35], to: [-0.6, 6.95, 9.85], c: 'redB', glow: true, dirs: ['west'] },
        { from: [-12.6, 6.55, 9.5], to: [-0.65, 6.75, 9.7], c: 'beam', glow: true },
        // The receiver: black with light top edges, a gunmetal dust cover, a side plate on the left, the ejection
        // port and the selector lever on the right.
        { from: [9.2, 5.0, 6.9], to: [19.6, 8.2, 9.1], ...BLACK },
        { from: [9.4, 8.2, 7.15], to: [19.4, 8.75, 8.85], c: { all: 'gm', up: 'gmL' }, pat: 'chrome', ink: 'recv' },
        { from: [11.0, 5.8, 9.1], to: [18.0, 7.6, 9.22], c: 'gm', ink: 'edge' },
        { from: [12.4, 6.6, 6.84], to: [16.2, 7.7, 6.9], c: 'bore', ink: 'gm', dirs: ['north'] },
        { from: [11.4, 5.6, 6.76], to: [17.6, 6.2, 6.9], c: 'gmL', ink: 'edge' },
        // The trigger guard, the trigger, the grip raked back with checkered panels.
        { from: [13.0, 4.2, 7.6], to: [17.0, 4.6, 8.4], ...BLACK },
        { from: [13.0, 4.6, 7.6], to: [13.5, 5.0, 8.4], ...BLACK },
        { from: [14.6, 4.4, 7.75], to: [15.1, 5.0, 8.25], c: 'gmL' },
        { from: [16.4, 0.4, 7.0], to: [18.8, 5.2, 9.0], ...BLACK, rot: GRIP },
        { from: [16.3, -0.1, 6.9], to: [18.9, 0.4, 9.1], c: 'gm', ink: 'recv', rot: GRIP },
        { from: [16.8, 1.0, 9.0], to: [18.4, 4.4, 9.12], c: 'gripP', pat: 'check', rot: GRIP },
        { from: [16.8, 1.0, 6.88], to: [18.4, 4.4, 7.0], c: 'gripP', pat: 'check', rot: GRIP },
        // The ACOG: a mount, the objective bell with the blue lens, the body, the eyepiece; the red dot and its post
        // inside (aiming looks through the tube); a red turret on top, red stripes along its sides.
        { from: [10.4, 8.75, 7.3], to: [14.2, 9.0, 8.7], c: 'gm', ink: 'recv' },
        ...tube(9.2, 10.0, [SY - 1.45, SY + 1.45, 6.55, 9.45], [SY - 1.05, SY + 1.05, 6.95, 9.05], BLACK.c, { ink: 'gmD' }),
        ...tube(10.0, 14.6, [SY - 1.2, SY + 1.2, 6.8, 9.2], [SY - 0.85, SY + 0.85, 7.15, 8.85], BLACK.c, { ink: 'gmD' }),
        ...tube(14.6, 15.4, [SY - 0.95, SY + 0.95, 7.05, 8.95], [SY - 0.75, SY + 0.75, 7.25, 8.75], BLACK.c, { ink: 'gmD' }),
        { from: [8.7, SY - 1.05, 6.95], to: [9.2, SY + 1.05, 9.05], c: 'lens', glow: true, dirs: ['west', 'north', 'south', 'up', 'down'] },
        { from: [8.62, SY + 0.25, 7.35], to: [8.66, SY + 0.7, 7.85], c: 'lensB', glow: true, dirs: ['west'] },
        { from: [9.5, SY - 0.15, 7.85], to: [9.7, SY + 0.15, 8.15], c: 'redB', glow: true },
        { from: [9.55, SY - 1.05, 7.95], to: [9.65, SY - 0.15, 8.05], c: 'bore', outline: false },
        { from: [11.6, SY + 1.2, 7.4], to: [12.8, SY + 1.8, 8.6], c: 'redB', ink: 'red' },
        { from: [11.6, SY - 0.5, 6.4], to: [12.8, SY + 0.5, 6.8], ...BLACK },
        { from: [10.2, SY + 0.5, 9.2], to: [14.4, SY + 0.75, 9.26], c: 'red', outline: false },
        { from: [10.2, SY + 0.5, 6.74], to: [14.4, SY + 0.75, 6.8], c: 'red', outline: false },
        // The skeleton stock: a hinge block, the top bar (a red stripe each side), the bottom bar slanting down to the
        // butt plate (its pad gunmetal).
        { from: [19.6, 4.8, 7.2], to: [20.6, 8.4, 8.8], ...BLACK },
        { from: [20.6, 7.2, 7.4], to: [26.4, 8.2, 8.6], ...BLACK },
        { from: [21.0, 7.45, 8.6], to: [26.0, 7.95, 8.66], c: 'red', outline: false },
        { from: [21.0, 7.45, 7.34], to: [26.0, 7.95, 7.4], c: 'red', outline: false },
        { from: [20.6, 4.9, 7.4], to: [26.9, 5.8, 8.6], ...BLACK, rot: { angle: -17, axis: 'z', origin: [20.6, 5.35, 8] } },
        { from: [26.4, 3.0, 7.0], to: [27.6, 8.6, 9.0], c: { all: 'recv', up: 'recvT', east: 'gm' }, ink: 'gmD' }
      ],
      // The charging handle on the right, at the front of the ejection port (pulled back +x along it).
      bolt: [
        { from: [12.7, 7.2, 6.0], to: [13.5, 7.7, 6.9], c: 'gmL' },
        { from: [12.6, 7.0, 5.5], to: [13.6, 7.9, 6.0], c: 'gm', ink: 'edge' }
      ],
      // The banana magazine: grey, white and grey steps with black bands between, a black floor plate.
      mag: [
        { from: [10.2, 3.5, 7.3], to: [13.0, 5.3, 8.7], c: 'magG' },
        { from: [10.15, 3.15, 7.25], to: [13.05, 3.5, 8.75], c: 'magK' },
        { from: [10.2, 0.95, 7.3], to: [13.0, 3.15, 8.7], c: 'magW', rot: MAG1 },
        { from: [10.15, 0.6, 7.25], to: [13.05, 0.95, 8.75], c: 'magK', rot: MAG1 },
        { from: [9.54, -1.213, 7.3], to: [12.34, 0.687, 8.7], c: 'magG', rot: MAG2 },
        { from: [9.39, -1.643, 7.2], to: [12.49, -1.213, 8.8], c: 'magK', ink: 'gm', rot: MAG2 }
      ],
      flash: [
        { from: [-9.4, 6.6, 6.8], to: [-7, 8.9, 9.2], c: 'flashCore', glow: true },
        { from: [-13.4, 7.3, 7.55], to: [-9.4, 8.2, 8.45], c: 'flash', glow: true },
        { from: [-8.8, 8.9, 7.55], to: [-7.6, 11.2, 8.45], c: 'flash', glow: true },
        { from: [-8.8, 4.3, 7.55], to: [-7.6, 6.6, 8.45], c: 'flash', glow: true },
        { from: [-8.8, 7.3, 4.6], to: [-7.6, 8.2, 6.8], c: 'flash', glow: true },
        { from: [-8.8, 7.3, 9.2], to: [-7.6, 8.2, 11.4], c: 'flash', glow: true }
      ],
      // A second flash (an X), so the flicker changes shape.
      flash2: [
        { from: [-9, 6.85, 7.05], to: [-7, 8.65, 8.95], c: 'flashCore', glow: true },
        { from: [-12, 7.35, 7.6], to: [-9, 8.15, 8.4], c: 'flash', glow: true },
        { from: [-8.5, 7.35, 4.8], to: [-7.5, 8.15, 11.2], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-8, 7.75, 8] } },
        { from: [-8.5, 4.55, 7.6], to: [-7.5, 10.95, 8.4], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-8, 7.75, 8] } }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -82, 0], translation: [-5.26, 4.11, -1.79], scale: [0.68, 0.68, 0.68] },
      thirdperson: { rotation: [0, -90, 0], translation: [0, 1.5, -5.5], scale: [0.8, 0.8, 0.8] },
      gui: { rotation: [0, 180, -40], translation: [-0.2, 0.6, 0], scale: [0.47, 0.47, 0.47] },
      ground: { rotation: [0, 0, -45], translation: [-1, 8.25, 0], scale: [0.9, 0.9, 0.9] },
      fixed: { rotation: [0, 0, -45], translation: [-0.5, 1, -1], scale: [0.9, 0.9, 0.9] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 15.4, rearDepth: 0.8, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [21.5, -25.25, 0], translation: [-10.6, 2.84, 1.38], scale: [0.72, 0.72, 0.72] }
    }
  })

  // The shoulder pivot (the grip's top, behind the trigger): kicks turn the muzzle up about it.
  const SHOULDER = [17.6, 5.4, 8]
  // Fire held (no cooldown: a full-auto gun's shots come every 2 ticks, so the frames flicker at random each tick):
  // a flash (one of two shapes, or none for a tick), the gun pushed back with its muzzle up and a little yaw, the
  // handle cycling. k scales the kick (the aim's is smaller); aiming the handle stays put (it's in view there, beside
  // the scope, and would flicker) and shows only the X flash (the star's top spike would cross the dot). A bit more
  // than the SMG's (its push 0.2-0.55 at a smaller scale): the shoulder pivot is far behind the muzzle, so the same
  // angles already lift the muzzle about twice as far.
  const FIRE = (k, big = 'flash') => {
    const cycle = v => k < 1 ? {} : { bolt: rig({ t: [v, 0, 0] }) }
    // A pose is picked afresh every frame (pg.js firing: wobble off), so they share one kick (0.7 back, 2.8 degrees
    // up) with a small jitter; the flash is what flickers.
    const kick = (dx, up, yaw) => rig({ t: [(0.7 + dx) * k, 0.14 * k, 0], rot: [[[0, 0, 1], -(2.8 + up) * k], [[0, 1, 0], yaw * k]], pivot: SHOULDER })
    return [
      { show: [big], gun: kick(0.08, 0.4, 0.3), ...cycle(2.6) },
      { show: ['flash2'], gun: kick(-0.06, -0.3, -0.4), ...cycle(1.4) },
      { show: [big], gun: kick(0.1, 0.6, -0.2), ...cycle(2.8) },
      { gun: kick(-0.12, -0.5, 0.1), ...cycle(0.6) }
    ]
  }
  // The draw (GunFx: a 30-tick cooldown on equip): the gun comes up fast from below, muzzle down and rolled out,
  // slows as it levels out (by two thirds of the way); a small settle at the end.
  const draw = p => {
    const k = 1 - ease.out(Math.min(1, p / 0.65))
    const settle = ease.bump(p, 0.75, 1, 0.85)
    return { gun: rig({ t: [2 * k, -9 * k - 0.3 * settle, 0], rot: [[[0, 0, 1], 28 * k + 1.5 * settle], [[1, 0, 0], -20 * k]], pivot: SHOULDER }) }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' reload, 57 ticks; 73 from empty, when the Firearm_Action
  // adds its 8 + 8). Two poses: for the magazine the gun comes up, turns its muzzle a little inward and rolls its
  // bottom toward you; the magazine rocks forward about its front top and drops out along its own axis, is gone, a
  // new one rises along the same path and rocks back in (a jolt as it seats). Then the gun rolls the other way (over
  // 8 ticks) so the charging handle on the right sticks up, the handle is pulled back and let go (a snap); the gun
  // settles back.
  // The sounds are timed to it in AK_47.yml (Start_Mechanics, delayBeforePlay in ticks after the reload starts):
  // mag_out 7 (p 0.12, the rock out), mag_in 32 (p 0.56, the seat), bolt 42 (p 0.74, the pull; its second click
  // 2.6 ticks later, the release at p 0.775-0.79). From empty the frames stretch to 73 ticks and the sounds start 8
  // ticks later (after the Firearm_Action's open): each lands within 3 ticks of its frame.
  const MAG_PIVOT = [10.3, 5.0, 8]
  const ROCK = -25 // degrees: the magazine's bottom forward
  const AXIS = [Math.sin(ROCK * Math.PI / 180), -Math.cos(ROCK * Math.PI / 180), 0] // down its own (rocked) axis
  // The two poses: t (model units), then turns about x (the roll first, about the barrel: top toward you +), y (muzzle
  // inward +) and z (muzzle down +). In the handle pose the gun also turns across the screen (y 25), so its length
  // reads (seen end-on behind the scope it was a black pipe), and its top rolls toward you so the handle sticks up.
  const MAGPOSE = { t: [0, 2.5, 2.5], y: 10, x: -30, z: -6 }
  const BOLTPOSE = { t: [0, 0.5, 1], y: 25, x: 45, z: -2 }
  const reload = p => {
    const a = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.58, 0.72)) // the magazine pose
    const b = ease.ramp(p, 0.58, 0.72) * (1 - ease.ramp(p, 0.86, 0.98)) // the handle pose
    const seat = ease.bump(p, 0.56, 0.62, 0.58)
    // The magazine: rock out 0.12-0.17, drop 0.17-0.32, gone 0.32-0.4, rise 0.4-0.5, rock in 0.5-0.56.
    let rock = 0
    let drop = 0
    if (p < 0.32) { rock = ease.ramp(p, 0.12, 0.17); drop = ease.ramp(p, 0.17, 0.32) } else if (p < 0.5) { rock = 1; drop = 1 - ease.ramp(p, 0.4, 0.5) } else rock = 1 - ease.ramp(p, 0.5, 0.56)
    const d = 15 * drop
    // The handle: back 0.725-0.755, held, let go 0.775-0.79 (it snaps).
    const pull = p < 0.775 ? ease.ramp(p, 0.725, 0.755) : 1 - ease.ramp(p, 0.775, 0.79)
    const snap = ease.bump(p, 0.785, 0.86, 0.8)
    return {
      gun: rig({
        t: [0, 1, 2].map(i => MAGPOSE.t[i] * a + BOLTPOSE.t[i] * b + [0.5 * snap, 0.5 * seat, 0][i]),
        rot: [[[1, 0, 0], MAGPOSE.x * a + BOLTPOSE.x * b], [[0, 1, 0], MAGPOSE.y * a + BOLTPOSE.y * b], [[0, 0, 1], MAGPOSE.z * a + BOLTPOSE.z * b - 3 * seat + 2 * snap]],
        pivot: [12, 6, 8]
      }),
      mag: rig({ t: [AXIS[0] * d, AXIS[1] * d, 0], rot: [[[0, 0, 1], ROCK * rock]], pivot: MAG_PIVOT }),
      bolt: rig({ t: [2.8 * pull, 0, 0] }),
      hide: p > 0.32 && p < 0.4 ? ['mag'] : []
    }
  }
  const EMPTY = { bolt: rig({ t: [2.4, 0, 0] }) }
  const drawn = gun.cooldown('', 30, draw)
  drawn.fallback = gun.firing('', FIRE(1))
  return {
    5: gun.byContext('', drawn),
    1005: gun.byContext('ads', gun.firing('ads', FIRE(0.4, 'flash2'))),
    2005: gun.byContext('sprint', gun.composite('sprint')),
    3005: gun.byContext('', gun.cooldown('', 57, reload)),
    // Empty: the handle stays back; drawn empty, the same draw with it back.
    4005: gun.byContext('', gun.cooldown('', 30, p => ({ ...draw(p), ...EMPTY }), EMPTY))
  }
}
