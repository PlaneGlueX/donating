// Combat Knife (WeaponMechanics weapons\melee\Combat_Knife.yml, Skin Default -10; no Scope or Sprint).
// Our tactical knife (2026-09-29): a black-coated clip-point blade with a bright ground edge, a sawback
// spine (diamond teeth), a gunmetal guard with a finger stop, a ribbed black grip and a steel glass
// breaker on the pommel, and PG3D's two white rivets on the grip (2026-10-13). Apart from the Karambit (bright grey
// claw, finger ring) at a glance.
// Built blade up along +y (the edge toward -x, the flats facing ±z) and held blade up like WeaponMechanics'
// knife: in first person the whole knife stands in the lower right, turned a little so the flat shows. 3D in the
// shop and the hotbar too (its gui transform; no 2D icon since 2026-10-13).
module.exports = ({ solid, display }) => {
  const name = 'combat_knife'
  // Swatches: 0-2 steel light, mid, dark; 3-4 the blade's coat, its lit face; 5-7 gunmetal mid, light,
  // dark; 8-9 grip black, its lit face; 10 grip ribs; 11 rivets.
  const colors = [
    [236, 240, 246], [182, 188, 200], [112, 118, 132],
    [64, 66, 76], [98, 102, 114],
    [70, 74, 84], [120, 126, 138], [46, 49, 56],
    [36, 36, 40], [58, 58, 64], [84, 86, 96],
    [236, 236, 228]
  ]
  const coat = { all: 3, up: 4, east: 4 }
  const bevel = { all: 1, west: 0, up: 0, down: 2 }
  const parts = [
    { from: [7.4, -0.5, 7.4], to: [8.6, 0.2, 8.6], c: { all: 1, down: 2 } }, // glass breaker
    { from: [6.7, 0.2, 7], to: [9.3, 1.5, 9], c: { all: 5, up: 6, down: 7 } }, // pommel
    { from: [7, 1.5, 7.1], to: [9, 6.5, 8.9], c: { all: 8, west: 9, up: 9 } }, // grip
    ...[2.3, 3.6, 4.9].map(y => ({ from: [6.8, y, 6.9], to: [9.2, y + 0.55, 9.1], c: 10 })), // ribs
    // Two rivets between the ribs, a white dot 0.05 proud of each flat (north and south faces only).
    ...[3.0, 4.3].map(y => ({ from: [7.7, y, 7.05], to: [8.3, y + 0.5, 8.95], c: 11, dirs: ['north', 'south'] })),
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
    // On the slot's diagonal (the client turns z, then y, then x): tip upper right, glass breaker lower left, the
    // ground edge along the lower right, the sawback along the upper left and both rivets showing; the tip and the
    // pommel a bit under a unit inside the slot (the translation centres it).
    gui: { rotation: [15, -160, 45], translation: [-0.47, 0.43, 0], scale: [1.05, 1.05, 1.05] },
    ground: { rotation: [0, 0, -45], translation: [0, 2, 0], scale: [0.6, 0.6, 0.6] },
    fixed: { rotation: [0, 180, -45], translation: [0, 0, 0], scale: [0.8, 0.8, 0.8] }
  }))
  return { '-10': { type: 'minecraft:model', model: `donating:item/${name}` } }
}
