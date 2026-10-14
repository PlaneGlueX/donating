// The Gold Nunchucks (WeaponMechanics weapons\melee\Gold_Nunchucks.yml, amethyst shard 7; 2026-10-13). From PG3D's
// Double Cashback (drawn by hand, nothing taken from the game; one hand only: the offhand holds the bag, and no stun
// contacts): two thick gold handles with darker gold end caps and bands, a dollar sign stamped on the held one, a red
// button near the free one's chain end, joined by a short black chain.
// Built upright: the held handle along +y (x = z = 8, y -0.6..9.6) and the free one hanging from the chain's pivot P on
// top of it, turned 45 degrees about z (element rotations) so the rest pose is a V with the free end toward -x (in first
// person: away from you and down). Two parts: held and flail. The frames (first person only, on DonatingPhone MeleeFx's
// 12-tick clock donating:melee/gold_nunchucks, started on every arm swing) are the whole strike: no client swing
// (MeleeFx swing none: a whack carries this short item below the screen for its ticks 2-6, the same ticks the turn
// takes, and hid it). The free handle twirls one turn about model x (nearly the view axis), across the crosshair,
// overshoots 20 degrees and settles. Elsewhere the still V (_full).
module.exports = ({ pg, display }) => {
  const { pgGun, rig } = pg
  const name = 'melee_nunchucks'
  const P = [8, 9.6, 8] // the chain's pivot on top of the held handle
  const HANG = { angle: -45, axis: 'z', origin: P }
  const hang = b => ({ ...b, rot: HANG })
  const bands = ys => ys.map(y => ({ from: [7.05, y, 7.05], to: [8.95, y + 0.4, 8.95], c: 'goldD', outline: false }))
  // a $ on both flats of the held handle (5 x 7 texels: the face's whole width inside its outline)
  const dollar = { k: 'stamp', face: 'sides', at: [7.4, 8.0], to: [8.65, 6.25], keys: { d: 'goldD' }, rows: ['..d..', '.dddd', 'd.d..', '.ddd.', '..d.d', 'dddd.', '..d..'] }
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
      // Held upright in the lower right like the Combat Knife, turned 14 degrees past side-on.
      firstperson: { rotation: [0, -76, -6], translation: [-2.75, 4.5, -0.5], scale: [0.8, 0.8, 0.8] },
      // In the fist, the free handle hanging forward.
      thirdperson: { rotation: [0, -90, -45], translation: [0, -0.41, 3.75], scale: [0.85, 0.85, 0.85] },
      // The V tilted so its faces catch the light (flat on, half of it goes).
      gui: { rotation: [-15, 25, -20], translation: [5.02, 3.35, 0], scale: [1.05, 1.05, 1.05] },
      ground: { translation: [2.26, 3.69, 0], scale: [0.5, 0.5, 0.5] },
      fixed: { rotation: [0, 180, 0], translation: [-4.98, 3.71, 0], scale: [1.1, 1.1, 1.1] }
    })
  })
  // The twirl: one turn about model x through P (the free end right and up first), a 20-degree overshoot, then rest.
  // psi = 380 easeOutQuad(p / 0.5) for p <= 0.5, else 360 + 20 (1 - smoothstep((p - 0.5) / 0.5)).
  const outQuad = t => 1 - (1 - t) * (1 - t)
  const smooth = t => t * t * (3 - 2 * t)
  const psi = p => p <= 0.5 ? 380 * outQuad(p / 0.5) : 360 + 20 * (1 - smooth((p - 0.5) / 0.5))
  // The left hand's display is the right one mirrored and turned about the model's y (pg.js display): the turn about x
  // runs the other way there (z = -1), so the left hand's twirl is the right one's mirror image (outward first).
  const whip = z => p => ({ flail: rig({ rot: [[[1, 0, 0], psi(p) * z]], pivot: P }) })
  return { 7: n.byContext('', n.cooldown('', 12, whip(1)), n.cooldown('', 12, whip(-1))) }
}
