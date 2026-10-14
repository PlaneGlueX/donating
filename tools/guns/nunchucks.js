// The Gold Nunchucks (WeaponMechanics weapons\melee\Gold_Nunchucks.yml, amethyst shard 7; 2026-10-13). From PG3D's
// Double Cashback (drawn by hand, nothing taken from the game; one hand only: the offhand holds the bag, and no stun
// contacts): two thick gold handles with darker gold end caps and bands, a dollar sign stamped on the held one, a red
// button near the free one's chain end, joined by a short black chain.
// Built upright: the held handle along +y (x = z = 8, y -0.6..9.6) and the free one hanging from the chain's pivot P on
// top of it, turned 45 degrees about z (element rotations) so the rest pose is a V with the free end toward -x (in first
// person: away from you and down). Two parts: held and flail.
// Third person (2026-10-14, the owner: "adjust the way ... nunchucks are held in 3rd person"): the held handle in the
// fist like a stick, pointing forward a little below level, and the chain and the free handle hanging straight down
// from its tip (the free half turned about z for that context only). Elsewhere (the icon, the ground, frames) the V.
// First person: the strike is frames (DonatingPhone MeleeFx: swing none, its 12-tick clock donating:melee/
// gold_nunchucks started on every arm swing; a client whack would carry this short item below the screen). The owner
// (2026-10-14): "the person swings the nunchucks while the other half of it swings as well": the held handle cocks
// back to the right, then swings across to the left toward the crosshair (the hand's arc, the arm implied below the
// screen), while the free half trails on the chain, whips round one full turn and hits at the crosshair on the 4th tick,
// wraps past and settles back to the V; at rest by the 9th (the 9-tick hit pace restarts it there).
module.exports = ({ pg, display }) => {
  const { pgGun, rig, then, hands } = pg
  const name = 'melee_nunchucks'
  const P = [8, 9.6, 8] // the chain's pivot on top of the held handle
  const HANG = { angle: -45, axis: 'z', origin: P }
  const hang = b => ({ ...b, rot: HANG })
  const bands = ys => ys.map(y => ({ from: [7.05, y, 7.05], to: [8.95, y + 0.4, 8.95], c: 'goldD', outline: false }))
  // a $ on both flats of the held handle (5 x 7 texels: the face's whole width inside its outline)
  const dollar = { k: 'stamp', face: 'sides', at: [7.4, 8.0], to: [8.65, 6.25], keys: { d: 'goldD' }, rows: ['..d..', '.dddd', 'd.d..', '.ddd.', '..d.d', 'dddd.', '..d..'] }
  // Held upright in the lower right like the Combat Knife, turned 14 degrees past side-on.
  const FP = { rotation: [0, -76, -6], translation: [-2.75, 4.5, -0.5], scale: [0.8, 0.8, 0.8] }
  // In the fist like a stick (the handle 8 degrees below level, its bottom cap at the back of the fist).
  const TP_DOWN = 8
  const TP = { rotation: [0, -90, 18 + TP_DOWN], translation: [0, 3.6, -0.2], scale: [0.85, 0.85, 0.85] }
  const n = pgGun(name, {
    style: 'pg',
    density: 4,
    ink: [24, 20, 14],
    palette: { gold: [232, 186, 64], goldD: { of: 'gold', k: -1 }, chain: [44, 46, 52], button: [214, 48, 52] },
    mats: { gold: 'gold', chain: 'dark', button: 'paint' },
    parts: {
      held: [
        { from: [7.0, -0.6, 7.0], to: [9.0, 0, 9.0], c: 'goldD', ink: 'goldD' }, // bottom cap
        { from: [7.15, 0, 7.15], to: [8.85, 8.4, 8.85], c: 'gold', bevel: 1, deco: [dollar] }, // the handle, a $ on both flats
        ...bands([1.6, 3.6, 5.6]),
        { from: [7.0, 8.4, 7.0], to: [9.0, 9.0, 9.0], c: 'goldD', ink: 'goldD' }, // top cap
        { from: [7.7, 9.0, 7.85], to: [8.3, 9.6, 8.15], c: 'chain', outline: false } // the chain's eye
      ],
      flail: [
        // six links down from P, turned every other way
        ...Array.from({ length: 6 }, (_, i) => hang(i % 2
          ? { from: [7.85, 9.6 - 0.6 * (i + 1), 7.6], to: [8.15, 9.6 - 0.6 * i - 0.05, 8.4], c: 'chain', outline: false }
          : { from: [7.6, 9.6 - 0.6 * (i + 1), 7.85], to: [8.4, 9.6 - 0.6 * i - 0.05, 8.15], c: 'chain', outline: false })),
        hang({ from: [7.7, 5.97, 7.85], to: [8.3, 6.3, 8.15], c: 'chain', outline: false }), // the free handle's eye (its foot sunk a hair into the cap: the last link's foot is at 6.0)
        hang({ from: [7.0, 5.4, 7.0], to: [9.0, 6.0, 9.0], c: 'goldD', ink: 'goldD' }), // its top cap
        hang({ from: [7.15, -3.0, 7.15], to: [8.85, 5.4, 8.85], c: 'gold', bevel: 1 }), // the handle
        ...bands([-1.2, 0.8, 2.8]).map(hang),
        hang({ from: [7.0, -3.6, 7.0], to: [9.0, -3.0, 9.0], c: 'goldD', ink: 'goldD' }), // bottom cap
        hang({ from: [8.85, 4.0, 7.55], to: [9.2, 4.9, 8.45], c: 'button', outline: false }) // the red button
      ]
    },
    display: display({
      firstperson: FP,
      thirdperson: TP,
      // The V tilted so its faces catch the light (flat on, half of it goes).
      gui: { rotation: [-15, 25, -20], translation: [5.02, 3.35, 0], scale: [1.05, 1.05, 1.05] },
      ground: { translation: [2.26, 3.69, 0], scale: [0.5, 0.5, 0.5] },
      fixed: { rotation: [0, 180, 0], translation: [-4.98, 3.71, 0], scale: [1.1, 1.1, 1.1] }
    })
  })
  const ID = [0, 0, 0, 1]
  // Third person: the free half straight down from P. The handle points TP_DOWN degrees below level, so down is
  // 90 - TP_DOWN degrees from it in the V's plane (model x-y), where the free half hangs at 135: turned about z by the
  // difference. A turn about z through P (z = 8) is the same in the left hand (pg.js display mirrors model z there).
  const tp = n.composite('', { flail: rig({ rot: [[[0, 0, 1], -(135 - (90 - TP_DOWN))]], pivot: P }) })

  // First person: the camera's axes in model space (the display's turn R: camera = R model), so the frames below are
  // written as the eye sees them.
  const rad = d => d * Math.PI / 180
  const [rx, ry, rz] = FP.rotation.map(rad)
  const R = [ // JOML rotationXYZ (Rx Ry Rz), like the client
    [Math.cos(ry) * Math.cos(rz), -Math.cos(ry) * Math.sin(rz), Math.sin(ry)],
    [Math.sin(rx) * Math.sin(ry) * Math.cos(rz) + Math.cos(rx) * Math.sin(rz), -Math.sin(rx) * Math.sin(ry) * Math.sin(rz) + Math.cos(rx) * Math.cos(rz), -Math.sin(rx) * Math.cos(ry)],
    [-Math.cos(rx) * Math.sin(ry) * Math.cos(rz) + Math.sin(rx) * Math.sin(rz), Math.cos(rx) * Math.sin(ry) * Math.sin(rz) + Math.sin(rx) * Math.cos(rz), Math.cos(rx) * Math.cos(ry)]
  ]
  const toModel = c => [0, 1, 2].map(i => R[0][i] * c[0] + R[1][i] * c[1] + R[2][i] * c[2]) // R^T c
  const VIEW = toModel([0, 0, 1]) // out of the screen: + turns counter-clockwise as seen
  const ACROSS = toModel([1, 0, 0]) // the screen's left-right: + tips the top toward the camera
  const GRIP = [8, 1.6, 8] // the fist round the held handle (below the screen at rest)
  // The free half's rest direction as seen (from P, down and mostly into the screen).
  const REST = [0, 1, 2].map(i => R[i][0] * -Math.SQRT1_2 + R[i][1] * -Math.SQRT1_2)
  // The strike, a key a tick (12; frame j shows p = (j + 0.5) / 12): [roll, tip, right, up, near, free, flat]: the held
  // handle's roll about the view axis at the fist (+ = its top to the left) and tip (+ = its top toward you), degrees;
  // the fist's move in blocks (right, up, toward you); the free half's turn about the view axis through P from its rest
  // V (+ = counter-clockwise as seen: down, right, up, left; 360 = one full turn, the rest again) and how far it's
  // swung out of the screen toward its plane (degrees; at rest it points ~50 into the screen and would be
  // foreshortened, swung fast it stands out).
  const KEYS = [
    [-24, 8, 0, 0.08, 0.01, -45, 30], // the wind-up: the handle cocked back to the right (the fist stays put: moved right, the top went off a 4:3 screen), the free half flung left
    [0, 2, -0.02, 0.09, 0, 60, 20], // the swing: across to the left, the free half dragged behind it
    [16, -8, -0.08, 0.08, -0.03, 160, 30], // ...and whipping over the top
    [26, -14, -0.12, 0.06, -0.05, 252, 5], // the hit: the free half out at the crosshair
    [34, -12, -0.14, 0.02, -0.04, 318, 10], // past it
    [30, -9, -0.11, 0, -0.02, 368, 8],
    [18, -5, -0.06, 0, -0.01, 374, 5], // back, the free half swinging past its rest and settling
    [8, -2, -0.02, 0, 0, 368, 0],
    [2, 0, -0.005, 0, 0, 362, 0],
    [0, 0, 0, 0, 0, 358, 0],
    [0, 0, 0, 0, 0, 359, 0],
    [0, 0, 0, 0, 0, 360, 0]
  ]
  const strike = p => {
    const [roll, tip, mx, my, mz, free, flat] = KEYS[Math.min(KEYS.length - 1, Math.floor(p * KEYS.length))]
    const gun = rig({ t: toModel([mx, my, mz]).map(v => v * 16 / FP.scale[0]), rot: [[ACROSS, tip], [VIEW, roll]], pivot: GRIP })
    const at = then({ t: P, q: ID }, gun).t // where P went
    // the free half turned about P (about the view axis, then out toward the screen's plane: about the axis across
    // it in that plane) and carried there; a part's rig is applied before the whole item's (pg.js composite), so
    // it's this undone by the item's
    const a = rad(free); const d = [REST[0] * Math.cos(a) - REST[1] * Math.sin(a), REST[0] * Math.sin(a) + REST[1] * Math.cos(a)]
    const flail = rig({ t: at.map((v, i) => v - P[i]), rot: [[VIEW, free], [toModel([d[1], -d[0], 0]), flat]], pivot: P })
    return { gun, flail: then(flail, hands.inv(gun)) }
  }
  // The left hand's display is the right one mirrored and turned about the model's y (pg.js display): a rig mirrored in
  // model z (z -> 16 - z) draws the right hand's strike mirrored across the screen.
  const mirror = m => { const c = then({ t: [0, 0, 16], q: ID }, m).t; return { t: [c[0], c[1], 16 - c[2]], q: [-m.q[0], -m.q[1], m.q[2], m.q[3]] } }
  const strikeLeft = p => { const s = strike(p); return { gun: mirror(s.gun), flail: mirror(s.flail) } }
  const def = n.byContext('', n.cooldown('', KEYS.length, strike), n.cooldown('', KEYS.length, strikeLeft))
  def.cases.push({ when: ['thirdperson_righthand', 'thirdperson_lefthand'], model: tp })
  return { 7: def }
}
