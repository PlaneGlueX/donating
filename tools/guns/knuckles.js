// The Brass Knuckles (WeaponMechanics weapons\melee\Brass_Knuckles.yml, amethyst shard 6; 2026-10-13). From PG3D's
// Steampunk Fists, made grounded (drawn by hand, nothing taken from the game): a brass knuckle-duster over our
// tactical glove (the shared first-person hands, pg.js) - four domed knuckles in front of the fingers on a striking
// plate with grip slots, open finger loops on both sides of the fist (the thumb's row left open), a palm bar
// under the fist and a short horn over it; polished (the kit's gold material) with dark brass outlines (brassD) on the
// bigger boxes and a lighter one (brassLo) on the thin loops.
// Built round the right glove in its grip coordinates g (pg.js handsSpec: the grip's top centre at 0, down -y, the
// fingers' front -x, +z the side first person sees; model = g + G). No client swing (DonatingPhone MeleeFx: swing
// none, its 6-tick clock donating:melee/brass_knuckles on every arm swing): the client's whack would turn the whole
// item, the glove's sleeve too, onto the screen. The punch is frames on that clock: the fist drives toward the
// crosshair in 1.5 ticks, holds and comes back by tick 6; the sleeve is re-aimed every frame (pg.js hands follow
// pose.gun). First person draws the glove and its sleeve; everywhere else (third person, the ground, frames, the icon)
// it's the duster alone (_full: no hands).
module.exports = ({ pg, display }) => {
  const { pgGun, ease, rig, hands } = pg
  const name = 'melee_knuckles'
  const G = [8, 10.25, 8] // the glove's grip point in model units
  const g = (f, t, m = {}) => ({ from: f.map((v, i) => v + G[i]), to: t.map((v, i) => v + G[i]), ...m })
  const { OR } = hands
  const RH = rig({ t: [G[0] - OR[0], G[1] - OR[1], G[2] - OR[2]], pivot: OR })
  const ROWS = [-0.58, -1.50, -2.42, -3.34] // the four fingers' rows (each knuckle's centre, g y)
  const B = 'brass'
  // a finger loop's side in grip coordinates [x0, y from the row, x1, y to the row]: the front and back posts and the
  // bars between them, open in the middle (solid bars read as table legs under the domes in the icon)
  const LOOP = [[-1.8, -0.42, -1.45, 0.42], [-0.55, -0.42, -0.2, 0.42], [-1.45, 0.17, -0.55, 0.42], [-1.45, -0.42, -0.55, -0.17]]
  const k = pgGun(name, {
    hands: { right: { at: RH } },
    style: 'pg',
    density: 4,
    ink: [22, 22, 26],
    palette: { brass: [212, 164, 68], brassHi: { of: 'brass', k: 1 }, brassLo: { of: 'brass', k: -1 }, brassD: { of: 'brass', k: -2 } },
    mats: { brass: 'gold' },
    parts: {
      duster: [
        // the striking plate in front of the fingers (its top over the glove's trigger finger), slots for the grip
        g([-2.35, -4.05, -1.75], [-1.7, -0.15, 1.85], { c: B, ink: 'brassD', deco: [{ k: 'slots', face: 'west', at: [-1.45 + G[2], -0.45 + G[1]], to: [1.55 + G[2], -3.75 + G[1]], n: 3 }] }),
        // four domed knuckles over it (the top one closes over the trigger finger)
        ...ROWS.map(yk => g([-3.1, yk - 0.43, -1.0], [-2.35, yk + 0.43, 1.1], { c: { all: B, west: 'brassHi' }, bevel: 1, ink: 'brassD' })),
        // the finger loops' sides: every row on the back (-z), rows 2-4 on the front (+z: the thumb lies over row 1)
        ...ROWS.flatMap(yk => LOOP.map(([x0, y0, x1, y1]) => g([x0, yk + y0, -1.77], [x1, yk + y1, -1.45], { c: B, ink: 'brassLo' }))),
        ...ROWS.slice(1).flatMap(yk => LOOP.map(([x0, y0, x1, y1]) => g([x0, yk + y0, 1.55], [x1, yk + y1, 1.82], { c: B, ink: 'brassLo' }))),
        // the palm bar under the fist and its rounded end
        g([-1.8, -4.55, -0.85], [0.6, -4.05, 0.85], { c: { all: B, down: 'brassLo' }, ink: 'brassD' }),
        g([0.6, -4.55, -0.7], [1.15, -3.7, 0.7], { c: B, ink: 'brassD' }),
        // the short horn over the fist
        g([-1.8, -0.15, -0.75], [-0.95, 0.3, 0.75], { c: B, ink: 'brassD' })
      ]
    },
    display: display({
      // Domes up, the finger stack across the screen, the back of the glove toward the camera: the whole fist in the
      // lower right, its sleeve out of the bottom right.
      firstperson: { rotation: [160, 0, 90], translation: [-0.5, 3.5, 0], scale: [1.1, 1.1, 1.1] },
      // On the front of the fist (the grip axis along the arm like a gun's, the domes forward), the plate over the hand's
      // knuckles.
      thirdperson: { rotation: [0, -90, -90], translation: [0, -2.19, 1.54], scale: [1.1, 1.1, 1.1] },
      // Side on, tipped so the domes' tops catch the light: the four domes along the top of the plate, the open finger
      // loops hanging under it, the palm bar to one side.
      gui: { rotation: [25, 0, -90], translation: [-0.35, -2.69, 0], scale: [2.84, 2.84, 2.84] },
      ground: { translation: [1.17, 1.85, 0], scale: [1.2, 1.2, 1.2] },
      // The icon's view in a frame (the frame turns its item 180 degrees).
      fixed: { rotation: [-25, 180, -90], translation: [0.33, -2.47, 0], scale: [2.61, 2.61, 2.61] }
    })
  })
  // The punch (6 frames): toward the crosshair in 1.5 ticks, a hold, back by tick 6. At the top of it (s = 1) the
  // domes face the crosshair. The left hand's display is the right one mirrored and turned about the model's y (pg.js
  // display), so its punch is mirrored in z (z = -1: the push along z and the turn about y run the other way), or the
  // fist would come at the camera.
  const punch = z => p => {
    const s = ease.bump(p, 0, 1, 0.25, 0.35)
    return { gun: rig({ t: [-2.6 * s, 2.2 * s, 3.7 * s * z], rot: [[[0, 1, 0], 60 * s * z]], pivot: [7.0, 8.1, z > 0 ? 8.05 : 7.95] }) }
  }
  return { 6: k.byContext('', k.cooldown('', 6, punch(1)), k.cooldown('', 6, punch(-1))) }
}
