// Combat Knife (WeaponMechanics weapons\melee\Combat_Knife.yml, Skin Default -10; no Scope or Sprint).
// Our tactical knife (2026-09-29): a black-coated clip-point blade with a bright ground edge, a sawback
// spine (diamond teeth), a gunmetal guard with a finger stop, a ribbed black grip and a steel glass
// breaker on the pommel. Apart from the Dagger (bright double edge, brass guard, leather grip) at a glance.
// Built blade up along +y (the edge toward -x, the flats facing ±z) and held blade up like WeaponMechanics'
// knife: in first person the whole knife stands in the lower right, turned a little so the flat shows.
module.exports = ({ solid, icon, iconOr3d, display, art }) => {
  const name = 'combat_knife'
  icon(name, art([
    '..............kk',
    '.............kWk',
    '............kcWk',
    '...........kCcWk',
    '.........kSCcWk.',
    '.........kCcWk..',
    '.......kSCcWk...',
    '..kk...kCcWk....',
    '..kYkkSCcWk.....',
    '...kYkCcWk......',
    '...kkYyCk.......',
    '..kBrkYyk.......',
    '.kBrkkkYk.......',
    'kPBk...kk.......',
    'kkk.............',
    '................'
  ], {
    W: [236, 240, 246, 255], S: [182, 188, 200, 255], C: [64, 66, 76, 255], c: [98, 102, 114, 255],
    Y: [120, 126, 138, 255], y: [70, 74, 84, 255], B: [36, 36, 40, 255], r: [84, 86, 96, 255], P: [112, 118, 132, 255]
  }))
  // Swatches: 0-2 steel light, mid, dark; 3-4 the blade's coat, its lit face; 5-7 gunmetal mid, light,
  // dark; 8-9 grip black, its lit face; 10 grip ribs.
  const colors = [
    [236, 240, 246], [182, 188, 200], [112, 118, 132],
    [64, 66, 76], [98, 102, 114],
    [70, 74, 84], [120, 126, 138], [46, 49, 56],
    [36, 36, 40], [58, 58, 64], [84, 86, 96]
  ]
  const coat = { all: 3, up: 4, east: 4 }
  const bevel = { all: 1, west: 0, up: 0, down: 2 }
  const parts = [
    { from: [7.4, -0.5, 7.4], to: [8.6, 0.2, 8.6], c: { all: 1, down: 2 } }, // glass breaker
    { from: [6.7, 0.2, 7], to: [9.3, 1.5, 9], c: { all: 5, up: 6, down: 7 } }, // pommel
    { from: [7, 1.5, 7.1], to: [9, 6.5, 8.9], c: { all: 8, west: 9, up: 9 } }, // grip
    ...[2.3, 3.6, 4.9].map(y => ({ from: [6.8, y, 6.9], to: [9.2, y + 0.55, 9.1], c: 10 })), // ribs
    { from: [5.3, 6.5, 7.2], to: [10.5, 7.4, 8.8], c: { all: 6, down: 7, north: 5, south: 5 } }, // guard
    { from: [5.3, 5.6, 7.3], to: [6.2, 6.5, 8.7], c: { all: 5, down: 7 } }, // finger stop
    { from: [6.7, 7.4, 7.6], to: [9.4, 8.4, 8.4], c: coat }, // ricasso
    { from: [7.3, 8.4, 7.6], to: [9.4, 13.4, 8.4], c: coat }, // blade (coated)
    { from: [6.2, 8.4, 7.5], to: [7.3, 13.4, 8.5], c: bevel }, // the ground edge
    { from: [7.3, 13.4, 7.6], to: [8.5, 14.6, 8.4], c: coat }, // clip point, stepping down to the tip
    { from: [6.2, 13.4, 7.5], to: [7.3, 15.4, 8.5], c: bevel },
    { from: [7.3, 14.6, 7.55], to: [7.9, 15.4, 8.45], c: bevel },
    { from: [6.2, 15.4, 7.6], to: [7.4, 16.3, 8.4], c: { all: 1, west: 0, up: 0 } },
    { from: [6.2, 16.3, 7.7], to: [6.8, 17, 8.3], c: 0 }, // the point
    // Sawback: diamond teeth along the spine (turned 45°, half of each sticks out).
    ...[9, 10.1, 11.2, 12.3].map(y => ({ from: [9, y - 0.35, 7.7], to: [9.7, y + 0.35, 8.3], c: { all: 1, up: 0 }, rot: { angle: 45, axis: 'z', origin: [9.35, y, 8] } }))
  ]
  solid(name, colors, parts, display({
    // Blade up in the lower right, turned 14° past side-on so the flat and the sawback show, leaning in a little.
    firstperson: { rotation: [0, -76, -6], translation: [-2.75, 4.5, -0.5], scale: [0.7, 0.7, 0.7] },
    // Held forward, edge down and the sawback up (the vanilla held-item arm pose).
    thirdperson: { rotation: [0, -90, 0], translation: [0, 0.5, 1], scale: [0.85, 0.85, 0.85] },
    ground: { rotation: [0, 0, -45], translation: [0, 2, 0], scale: [0.6, 0.6, 0.6] },
    fixed: { rotation: [0, 180, -45], translation: [0, 0, 0], scale: [0.8, 0.8, 0.8] }
  }))
  return { '-10': iconOr3d(name) }
}
