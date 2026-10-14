// The Katana (WeaponMechanics weapons\melee\Dagger.yml, title Dagger, amethyst shard 1; 2026-10-13, replacing the
// Karambit). From PG3D's Katana in the older, straighter shape of its Last Samurai (drawn by hand from the fan wiki's
// pictures, nothing taken from the game; the banner, the sheaths and the blue glow dropped): a long straight steel
// blade with a bright ground edge along its front, a navy spine strip along its back and two small red marks near the
// collar, a stepped point (the kissaki, its seam the yokote) sweeping up to the spine, a gold collar (habaki), a navy
// square guard (tsuba) with a dark rim, a gold ferrule (fuchi), a red diamond-wrapped hilt (tsuka) with a gold ornament
// (menuki) under the wrap on both sides, and a dark pommel cap (kashira).
// Built upright along +y (the edge toward -x, the spine +x, the flats facing +-z), centred on x = z = 8, y -6.0..25.2;
// painted with the kit's PG painter (style 'pg', 4 texels a unit).
// The slash (2026-10-14; the owner: "fix the katana slash animation"): no client swing (DonatingPhone MeleeFx: swing
// none, its 10-tick clock donating:melee/dagger on every arm swing; the client's whack only tipped the long blade to
// the lower left). First-person frames on that clock, a pose a tick: the blade raised up and to the right, its edge
// toward the cut (tick 0: the rest pose is already a raised blade, so one tick of wind-up, and the cut reaches the
// crosshair a tick after the hit), cuts from the upper right across the crosshair to the lower left with the edge
// leading and the flat to the camera (1-2, a pale streak behind the blade on both), follows through (3-4) and comes
// back under to the rest pose (5-9) with its flat still toward the camera (a negative roll this low on the screen
// turns the flat away and the blade reads as a thin wire), turning the edge forward over the last two ticks; tick 9 is
// the rest pose itself, so the clock ends without a snap. All inside the 16-tick hit pace. Each frame is a pose of the
// sword in the camera's space (the grip's place on the screen and its depth, the blade's angle on the screen, its tilt
// toward the camera, the edge's roll) turned into the model-space transformation the item definition carries, worked
// out against the first-person display FP; the left hand gets the mirror image.
// Everywhere else (third person, the ground, frames, the icon) the plain _full model, without the streak.
module.exports = ({ pg, display }) => {
  const { pgGun } = pg
  const name = 'melee_katana'
  const BLADE = { all: 'blade', west: 'edge', east: 'spine' }
  // Strips on the flats only (north and south), 0.03 proud of the blade (their other faces would lie on its faces).
  const flats = (x0, y0, x1, y1, c, z = 0.03) => ({ from: [x0, y0, 7.72 - z], to: [x1, y1, 8.28 + z], c, dirs: ['north', 'south'], outline: false })
  // Blade up in the lower right, the edge forward, leaning a little into the screen.
  const FP = { rotation: [90, -65, 85], translation: [0.5, 5.5, -1], scale: [0.58, 0.58, 0.58] }
  const k = pgGun(name, {
    style: 'pg',
    density: 4,
    ink: [20, 20, 26],
    palette: {
      blade: [208, 216, 228], edge: [244, 248, 255], spine: [44, 60, 96], tsuba: [36, 46, 82],
      gold: [222, 176, 70], goldD: { of: 'gold', k: -1 }, wrap: [176, 34, 40], kashira: [40, 40, 46], mark: [200, 40, 44],
      streak: [214, 234, 255]
    },
    mats: { blade: 'chrome', edge: 'flat', spine: 'paint', tsuba: 'metal', gold: 'gold', wrap: 'rubber', kashira: 'dark', mark: 'paint', streak: 'glow' },
    parts: {
      sword: [
        { from: [7.05, -6.0, 7.05], to: [8.95, -5.3, 8.95], c: 'kashira', outline: false }, // the pommel cap
        { from: [7.15, -5.3, 7.2], to: [8.85, 1.3, 8.8], c: 'wrap' }, // the hilt (rubber: knurl = the diamond wrap)
        { from: [7.6, -2.6, 7.12], to: [8.4, -1.8, 8.88], c: 'gold', dirs: ['north', 'south'], ink: 'goldD' }, // the menuki, both sides
        { from: [7.05, 1.3, 7.1], to: [8.95, 1.8, 8.9], c: 'gold', ink: 'goldD' }, // the ferrule
        { from: [5.7, 1.8, 6.1], to: [10.3, 2.55, 9.9], c: 'tsuba', bevel: 1, deco: [{ k: 'inset', face: 'flats', at: [6.2, 6.6], to: [9.8, 9.4], c: 'tsuba' }] }, // the guard, its rim the ink, a recess round the collar
        { from: [6.6, 2.55, 7.45], to: [9.4, 3.4, 8.55], c: 'gold', ink: 'goldD' }, // the collar round the blade
        { from: [6.8, 3.4, 7.72], to: [9.2, 23.4, 8.28], c: BLADE, ink: 'spine', grain: 0 }, // the blade (one box: no seams across the flats)
        { from: [7.1, 23.4, 7.75], to: [9.2, 24.4, 8.25], c: BLADE, ink: 'spine', grain: 0 }, // the kissaki (its lower seam reads as the yokote)
        { from: [7.9, 24.4, 7.78], to: [9.2, 25.2, 8.22], c: 'edge', outline: false }, // the point
        flats(6.8, 3.4, 7.3, 23.4, 'edge'), // the ground edge along the front of both flats
        flats(7.1, 23.4, 7.6, 24.4, 'edge', 0.0), // ...on up the kissaki to the point
        flats(8.85, 3.4, 9.2, 23.4, 'spine'), // the navy spine along the back
        flats(8.2, 3.8, 8.5, 4.1, 'mark'), // two red marks near the collar
        flats(8.2, 4.4, 8.5, 4.7, 'mark')
      ],
      // The streak: thin glowing lines behind the spine (the trailing side of the cut), fanning out from the hand, longer
      // toward the tip (it moves fastest); only the cut's two frames show it.
      streak: [
        { from: [9.7, 11.0, 7.95], to: [9.95, 25.0, 8.05], c: 'streak', glow: true },
        { from: [10.75, 14.0, 7.95], to: [11.0, 24.8, 8.05], c: 'streak', glow: true },
        { from: [12.0, 17.0, 7.95], to: [12.25, 24.4, 8.05], c: 'streak', glow: true },
        { from: [13.5, 20.0, 7.95], to: [13.75, 23.8, 8.05], c: 'streak', glow: true }
      ]
    },
    hidden: ['streak'],
    noFull: ['streak'],
    display: display({
      firstperson: FP,
      // Held forward and up, the fist on the hilt between the pommel and the guard.
      thirdperson: { rotation: [0, -90, 10], translation: [0, 3.4, 0.6], scale: [0.6, 0.6, 0.6] },
      // On the slot's diagonal (the Combat Knife's turn): the point upper right, the pommel lower left.
      gui: { rotation: [15, -160, 48], translation: [-0.44, -0.68, 0], scale: [0.6, 0.6, 0.6] },
      ground: { rotation: [0, 0, -45], translation: [-0.46, 1.68, 0], scale: [0.38, 0.38, 0.38] },
      fixed: { rotation: [0, 180, -45], translation: [0.73, -0.5, 0], scale: [0.6, 0.6, 0.6] }
    })
  })

  // ---------- the slash: camera-space poses -> model-space transformations ----------
  // Camera space (blocks): x right, y up, the camera looking down -z; the client puts first-person model point p (units)
  // at D(p) = R (s (p / 16 - 1/2)) + c0, R the display's turn (XYZ), s its scale, c0 its translation + the arm offset
  // (0.56, -0.52, -0.72). A frame's transformation T (model units, applied before the display) that puts the sword at
  // the camera-space pose F(p) = Rk s (p - HM) / 16 + H (HM the grip point, held at H; Rk the blade's turn) is
  // T = D^-1 F: its turn R^T Rk and its move (16 / s) R^T (H - c0) + 8 - R^T Rk HM.
  const RAD = Math.PI / 180
  const T35 = Math.tan(35 * RAD) // the client's first-person field of view is 70 degrees high whatever the setting
  const mul = (a, b) => a.map(r => [0, 1, 2].map(j => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]))
  const app = (m, v) => m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
  const tr = m => [0, 1, 2].map(i => [0, 1, 2].map(j => m[j][i]))
  const rx = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[1, 0, 0], [0, c, -s], [0, s, c]] }
  const ry = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[c, 0, s], [0, 1, 0], [-s, 0, c]] }
  const rz = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[c, -s, 0], [s, c, 0], [0, 0, 1]] }
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const quat = m => { // a rotation matrix -> [x, y, z, w]
    const tr0 = m[0][0] + m[1][1] + m[2][2]
    let q
    if (tr0 > 0) { const s = Math.sqrt(tr0 + 1) * 2; q = [(m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s, s / 4] }
    else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; q = [s / 4, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s, (m[2][1] - m[1][2]) / s] }
    else if (m[1][1] > m[2][2]) { const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; q = [(m[0][1] + m[1][0]) / s, s / 4, (m[1][2] + m[2][1]) / s, (m[0][2] - m[2][0]) / s] }
    else { const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; q = [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, s / 4, (m[1][0] - m[0][1]) / s] }
    return q[3] < 0 ? q.map(v => -v) : q
  }
  const R = mul(mul(rx(FP.rotation[0]), ry(FP.rotation[1])), rz(FP.rotation[2]))
  const S = FP.scale[0]
  const C0 = FP.translation.map((v, i) => v / 16 + [0.56, -0.52, -0.72][i])
  const HM = [8, -2, 8] // the grip: the middle of the hilt
  // A pose [sx, sy, d, th, ph, ps]: the grip at screen point (sx, sy) (1 = the screen's top edge; 4:3 ends at 1.33,
  // 16:9 at 1.78) d blocks in front; the blade (guard to point) at th degrees on the screen (counterclockwise from
  // right), tilted ph degrees toward the camera; the edge rolled ps degrees about the blade from the way a
  // counterclockwise turn moves it (0: the edge leads the cut, the flat faces the camera; -90: the edge away).
  const camOf = ([sx, sy, d, th, ph, ps]) => {
    const a = [Math.cos(th * RAD), Math.sin(th * RAD), 0]
    const u = [0, 1, 2].map(i => Math.cos(ph * RAD) * a[i] + Math.sin(ph * RAD) * [0, 0, 1][i])
    const b = [-Math.sin(th * RAD), Math.cos(th * RAD), 0]
    const n = cross(u, b)
    const e = [0, 1, 2].map(i => Math.cos(ps * RAD) * b[i] + Math.sin(ps * RAD) * n[i])
    const x = e.map(v => -v) // model +x is the spine side: the edge is -x
    const z = cross(x, u)
    return { Rk: [0, 1, 2].map(i => [x[i], u[i], z[i]]), H: [sx * d * T35, sy * d * T35, -d] }
  }
  // T = D^-1 F as a kit rig (model units; the kit writes translation / 16)
  const rigOf = pose => {
    const { Rk, H } = camOf(pose)
    const Q = mul(tr(R), Rk)
    const QH = app(Q, HM)
    const t = app(tr(R), H.map((v, i) => v - C0[i])).map((v, i) => 16 / S * v + 8 - QH[i])
    return { t, q: quat(Q) }
  }
  // The left hand's frame: the left display is the right one mirrored in x on the screen and in z in the model (pg.js
  // display), so the right frame's mirror image is Mz T Mz (Mz: z -> 16 - z): with T(p) = Q p + t, its turn is Q's
  // with the axis' x and y negated and its move Mz(Q (0, 0, 16) + t).
  const mirrorZ = ({ t, q }) => {
    const Qc = app(rigM(q), [0, 0, 16])
    return { t: [Qc[0] + t[0], Qc[1] + t[1], 16 - Qc[2] - t[2]], q: [-q[0], -q[1], q[2], q[3]] }
  }
  const rigM = ([x, y, z, w]) => [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
  // The frames, a tick each (MeleeFx's clock: 10 ticks; frame i shows at the clock's p = (i + 0.5) / 10), then the rest
  // pose (the display's own: no transformation).
  const N = 10
  const FRAMES = [
    { pose: [1.06, -0.12, 0.92, 84, 12, -4] }, // raised: up and to the right, the flat to the camera
    { pose: [0.62, -0.02, 0.94, 162, -2, 0], show: ['streak'] }, // the cut: across the crosshair
    { pose: [-0.02, -0.28, 0.94, 203, -6, 0], show: ['streak'] }, // to the lower left
    { pose: [-0.38, -0.40, 0.92, 214, -10, -8] }, // the follow-through
    { pose: [-0.44, -0.46, 0.90, 218, -12, -16] }, // a beat
    { pose: [-0.10, -0.66, 0.88, 204, -18, -20] }, // back under, the flat still to the camera
    { pose: [0.48, -0.82, 0.86, 172, -14, -24] },
    { pose: [0.98, -0.88, 0.84, 140, -6, -40] },
    { pose: [1.24, -0.89, 0.82, 121, 2, -70] }, // the edge turning forward again
    { pose: [1.305, -0.883, 0.814, 115, 5, -90] } // = the rest pose (the display's own)
  ]
  const slash = left => p => {
    const f = FRAMES[Math.max(0, Math.min(N - 1, Math.round(p * N - 0.5)))]
    const m = rigOf(f.pose)
    return { gun: left ? mirrorZ(m) : m, show: f.show || [] }
  }
  return { 1: k.byContext('', k.cooldown('', N, slash(false)), k.cooldown('', N, slash(true))) }
}
