// Uzi (WeaponMechanics weapons\sub_machine_guns\Uzi.yml, Skin Default 1, Scope +1000, Sprint +2000).
// Our compact SMG (2026-09-29, owner: "i dont want it to look too realistic"): a boxy olive-drab receiver
// with a ribbed top cover, a stubby barrel, the folded stock along its sides, a straight black grip with
// the magazine sticking out under it (a brass floor plate), a red front post between two guard ears.
// Cops of difficulty 3 hold it. Built along x, muzzle toward -x, centred on z = 8; sight line y = SY.
module.exports = ({ solid, icon, art, iconOr3d, state, aim, display }) => {
  const name = 'gun_uzi'
  const SY = 10.2
  icon(name, art([
    '................',
    '................',
    '...kkk.....k.k..',
    '...kRkkkkkkDkDk.',
    '..kHHHHHHHHHHHHk',
    'kkkGGGGGGGGGGGGk',
    'kSSGGDDDDGGGGGGk',
    'kkkGGGGGGGGGGGGk',
    '..kDDDDDDDDDDDDk',
    '..kkkkkkkKFFkkk.',
    '....kDkSkKFFk...',
    '....kkkkkKFFk...',
    '........kdddk...',
    '........kdddk...',
    '.......kYYYYYk..',
    '.......kkkkkkk..'
  ], { H: [124, 136, 88, 255], G: [92, 102, 66, 255], D: [60, 68, 44, 255], d: [112, 118, 132, 255],
    S: [182, 188, 200, 255], F: [36, 36, 40, 255], K: [58, 58, 64, 255], R: [214, 48, 52, 255], Y: [226, 182, 76, 255] }))
  solid(name, [
    [92, 102, 66], [124, 136, 88], [60, 68, 44], [36, 36, 40], // 0-3 olive body, light, dark; black
    [58, 58, 64], [236, 240, 246], [182, 188, 200], [112, 118, 132], // 4-7 black light, steel light, mid, dark
    [226, 182, 76], [160, 118, 40], [214, 48, 52], [22, 22, 26] // 8-11 brass, brass dark, red, the bore
  ], [
    { from: [2.5, 5.6, 6.5], to: [13.2, 8.6, 9.5], c: { all: 0, up: 1, down: 2 } }, // receiver
    { from: [3.2, 8.6, 6.8], to: [12.6, 9.2, 9.2], c: 1 }, // top cover
    { from: [5, 9.2, 7], to: [5.6, 9.5, 9] , c: 2 }, // its ribs
    { from: [7.4, 9.2, 7], to: [8, 9.5, 9], c: 2 },
    { from: [9.8, 9.2, 7], to: [10.4, 9.5, 9], c: 2 },
    { from: [4.6, 6.4, 6.4], to: [8.4, 7.9, 9.6], c: 2 }, // ejection port (both sides)
    { from: [1.4, 6.2, 7], to: [2.5, 8.2, 9], c: { all: 6, up: 5, down: 7 } }, // barrel nut
    { from: [-0.6, 6.7, 7.45], to: [1.4, 7.7, 8.55], c: { all: 7, up: 6 } }, // barrel
    { from: [-0.65, 6.9, 7.65], to: [-0.55, 7.5, 8.35], c: 11, dirs: ['west'] }, // the bore
    { from: [2.6, 9.2, 7.55], to: [3.4, SY, 8.45], c: 10 }, // front post (red) between two ears
    { from: [2.6, 8.6, 6.75], to: [3.4, SY, 7.15], c: 2 },
    { from: [2.6, 8.6, 8.85], to: [3.4, SY, 9.25], c: 2 },
    { from: [11.8, 9.2, 6.9], to: [12.6, SY, 7.55], c: 2 }, // rear notch, two posts
    { from: [11.8, 9.2, 8.45], to: [12.6, SY, 9.1], c: 2 },
    { from: [8.4, 1.4, 7], to: [11.4, 5.6, 9], c: { all: 3, up: 4, west: 4 } }, // grip
    { from: [11.4, 2.2, 7.3], to: [11.9, 5.2, 8.7], c: 2 }, // grip safety
    { from: [8.7, -1.2, 7.25], to: [11.1, 1.4, 8.75], c: { all: 7, up: 6 } }, // the magazine
    { from: [8.4, -1.8, 7], to: [11.4, -1.2, 9], c: { all: 8, down: 9 } }, // its brass floor plate
    { from: [5, 3, 7.3], to: [8.4, 3.6, 8.7], c: 2 }, // trigger guard: bottom, front
    { from: [5, 3.6, 7.3], to: [5.6, 5.6, 8.7], c: 2 },
    { from: [6.9, 3.6, 7.7], to: [7.4, 5.6, 8.3], c: 6 }, // trigger
    { from: [13.2, 5.8, 6.7], to: [14, 8.2, 9.3], c: { all: 2, east: 0 } }, // stock hinge
    { from: [4, 5.1, 6.2], to: [14, 5.6, 6.6], c: 3 }, // folded stock arms along the sides
    { from: [4, 5.1, 9.4], to: [14, 5.6, 9.8], c: 3 },
    { from: [3.4, 4.9, 6.2], to: [4, 5.8, 9.8], c: 4 } // the butt plate folded under the barrel
  ], display({
    firstperson: { rotation: [0, -78, 0], translation: [-5, 4.5, 0], scale: [0.8, 0.8, 0.8] },
    thirdperson: { rotation: [0, -90, -80], translation: [0, 3, 3], scale: [1, 1, 1] },
    ground: { rotation: [0, 0, -50], translation: [0.75, 4, 0], scale: [1.2, 1.2, 1.2] },
    fixed: { rotation: [0, 0, -45], translation: [0, 1.5, 0], scale: [1, 1, 1] },
    head: { rotation: [0, -90, 0], translation: [0, 13, 7], scale: [1, 1, 1] }
  }))
  state(`${name}_ads`, name, aim({ sightY: SY, rearX: 12.6, rearDepth: 1.1 }))
  state(`${name}_sprint`, name, { rotation: [-20, -40, 0], translation: [-5, 2.5, -2], scale: [0.8, 0.8, 0.8] })
  return { 1: iconOr3d(name), 1001: iconOr3d(name, `${name}_ads`), 2001: iconOr3d(name, `${name}_sprint`) }
}
