// Stim (WeaponMechanics weapons\consumables\Stim.yml: a lightning rod whose Skin turns it into a feather
// with custom model data -1). Our auto-injector (2026-09-29): a fat glass vial of lime stim between steel
// collars, a white grip with a black band and a pocket clip, a big red push button on top and an orange
// needle shroud with the needle below. Next to the Energy Drink (black and lime) and the Bandage (white
// and red). Held upright like any item (vanilla's generated display, HELD, like the Energy Drink).
module.exports = ({ solid, icon, iconOr3d, display, art, bar, HELD }) => {
  const name = 'stim'
  icon(name, art([
    '..............k.',
    '.............kNk',
    '...........kkNk.',
    '..........kOOk..',
    '.........kOOok..',
    '........kSSSDk..',
    '.......kMLLlk...',
    '......kMLLlk....',
    '.....kMLLlk.....',
    '....kSSSDk......',
    '...kWWWwk.......',
    '..kBBBBk........',
    '.kRRrkk.........',
    'kRRrk...........',
    '.kkk............',
    '................'
  ], {
    N: [236, 240, 246, 255], O: [236, 124, 36, 255], o: [180, 84, 20, 255], S: [182, 188, 200, 255], D: [112, 118, 132, 255],
    M: [200, 255, 160, 255], L: [124, 252, 60, 255], l: [72, 176, 30, 255], W: [236, 238, 240, 255], w: [190, 196, 206, 255],
    B: [36, 36, 40, 255], R: [214, 48, 52, 255], r: [150, 30, 34, 255]
  }))
  // Swatches: 0-1 white grip, its shade; 2-3 red button, dark; 4-6 steel light, mid, dark; 7-9 lime, dark,
  // light; 10-11 orange, dark; 12 glass; 13 black band.
  const colors = [
    [236, 238, 240], [190, 196, 206],
    [214, 48, 52], [150, 30, 34],
    [236, 240, 246], [182, 188, 200], [112, 118, 132],
    [124, 252, 60], [72, 176, 30], [200, 255, 160],
    [236, 124, 36], [180, 84, 20],
    [214, 240, 230],
    [36, 36, 40]
  ]
  const ring = { all: 5, up: 4, down: 6 }
  solid(name, colors, [
    bar(0.15, 0.15, 0, 2.4, { all: 4, down: 5 }), // needle
    bar(0.9, 0.9, 2.4, 3.2, { all: 10, down: 11 }), // needle shroud, stepped
    bar(1.3, 1.3, 3.2, 4.3, { all: 10, down: 11 }),
    bar(1.75, 1.75, 4.3, 5, ring), // lower collar
    bar(1.5, 1.5, 5, 9.2, { all: 7, down: 8 }), // the vial of stim
    bar(1.5, 1.5, 9.2, 10, 12), // the air gap at its top
    bar(1.56, 0.4, 5.6, 9.6, 9, { dirs: ['east', 'west'] }), // glass shine down each side
    bar(0.4, 1.56, 5.6, 9.6, 9, { dirs: ['north', 'south'] }),
    ...[6.4, 7.6, 8.8].map(y => bar(1.56, 1.56, y, y + 0.25, 8, { from: [8.3, y, 8.3], to: [9.58, y + 0.25, 9.58] })), // dose marks
    bar(1.75, 1.75, 10, 10.7, ring), // upper collar
    bar(1.45, 1.45, 10.7, 13.4, { all: 0, down: 1, east: 1, west: 1 }), // grip
    bar(1.55, 1.55, 11.5, 12.5, 13), // black band
    { from: [9.45, 10.9, 7.6], to: [9.95, 13.1, 8.4], c: { all: 5, east: 4 } }, // pocket clip
    bar(1.1, 1.1, 13.4, 13.9, { all: 6, up: 5 }), // button collar
    bar(1, 1, 13.9, 15.2, { all: 2, down: 3 }) // the red push button
  ], display({
    firstperson: HELD.firstperson_righthand,
    // Third person: the needle forward (a stab), a bit bigger than a plain item so it reads.
    thirdperson: { rotation: [180, 0, 0], translation: [0, 1, 1], scale: [0.65, 0.65, 0.65] },
    ground: HELD.ground,
    fixed: HELD.fixed
  }, true)) // plain mirror: an injector has no front
  return { '-1': iconOr3d(name) }
}
