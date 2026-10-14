// The Katana (WeaponMechanics weapons\melee\Dagger.yml, title Dagger, amethyst shard 1; 2026-10-13, replacing the
// Karambit). From PG3D's Katana in the older, straighter shape of its Last Samurai (drawn by hand from the fan wiki's
// pictures, nothing taken from the game; the banner, the sheaths and the blue glow dropped): a long straight steel
// blade with a bright ground edge along its front, a navy spine strip along its back and two small red marks near the
// collar, a stepped point (the kissaki, its seam the yokote) sweeping up to the spine, a gold collar (habaki), a navy
// square guard (tsuba) with a dark rim, a gold ferrule (fuchi), a red diamond-wrapped hilt (tsuka) with a gold ornament
// (menuki) under the wrap on both sides, and a dark pommel cap (kashira).
// Built upright along +y (the edge toward -x, the spine +x, the flats facing +-z), centred on x = z = 8, y -6.0..25.2;
// painted with the kit's PG painter (style 'pg', 4 texels a unit). One part, no frames: the swing is the client's own
// whack (DonatingPhone MeleeFx, 10 ticks), so the item is the plain _full model in every context.
module.exports = ({ pg, display }) => {
  const { pgGun } = pg
  const name = 'melee_katana'
  const BLADE = { all: 'blade', west: 'edge', east: 'spine' }
  // Strips on the flats only (north and south), 0.03 proud of the blade (their other faces would lie on its faces).
  const flats = (x0, y0, x1, y1, c, z = 0.03) => ({ from: [x0, y0, 7.72 - z], to: [x1, y1, 8.28 + z], c, dirs: ['north', 'south'], outline: false })
  pgGun(name, {
    style: 'pg',
    density: 4,
    ink: [20, 20, 26],
    palette: {
      blade: [208, 216, 228], edge: [244, 248, 255], spine: [44, 60, 96], tsuba: [36, 46, 82],
      gold: [222, 176, 70], goldD: { of: 'gold', k: -1 }, wrap: [176, 34, 40], kashira: [40, 40, 46], mark: [200, 40, 44]
    },
    mats: { blade: 'chrome', edge: 'flat', spine: 'paint', tsuba: 'metal', gold: 'gold', wrap: 'rubber', kashira: 'dark', mark: 'paint' },
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
      ]
    },
    display: display({
      // Blade up in the lower right, the edge forward, leaning a little into the screen.
      firstperson: { rotation: [90, -65, 85], translation: [0.5, 5.5, -1], scale: [0.58, 0.58, 0.58] },
      // Held forward and up, the fist on the hilt between the pommel and the guard.
      thirdperson: { rotation: [0, -90, 10], translation: [0, 3.4, 0.6], scale: [0.6, 0.6, 0.6] },
      // On the slot's diagonal (the Combat Knife's turn): the point upper right, the pommel lower left.
      gui: { rotation: [15, -160, 48], translation: [-0.44, -0.68, 0], scale: [0.6, 0.6, 0.6] },
      ground: { rotation: [0, 0, -45], translation: [-0.46, 1.68, 0], scale: [0.38, 0.38, 0.38] },
      fixed: { rotation: [0, 180, -45], translation: [0.73, -0.5, 0], scale: [0.6, 0.6, 0.6] }
    })
  })
  return { 1: { type: 'minecraft:model', model: `donating:item/${name}_full` } }
}
