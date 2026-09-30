// AK-47 (WeaponMechanics weapons\assault_rifles\AK_47.yml, Skin Default 5, Scope +1000, Sprint +2000).
// Our rifle (2026-09-29, owner: "i dont want it to look too realistic"): the strongest gun, so the meanest
// look: black metal, red-brown wood furniture, a chunky slanted muzzle brake, the AK's hooded front post,
// a banana magazine curved forward in three 22.5° steps and a stepped wooden stock. Cops of difficulty 4
// hold it (third person matters).
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the tops of the front post and the
// rear notch, y = SY.
module.exports = ({ solid, icon, art, iconOr3d, state, aim, display }) => {
  const name = 'gun_ak47'
  const SY = 10
  icon(name, art([
    '................',
    '................',
    '................',
    '..k.............',
    'kkLkkkkkkkkkkkk.',
    'kLLLLWWWWBBBBWWk',
    'kkkkkwwwwBBBBWWk',
    '....kkkkkbbbbwWk',
    '........kMMkWkwk',
    '........kMMkwWkk',
    '.......kMMk.kwk.',
    '......kMMk..kkk.',
    '......kkk.......',
    '................',
    '................',
    '................'
  ], { L: [182, 188, 200, 255], W: [206, 128, 64, 255], w: [150, 84, 40, 255], B: [70, 74, 84, 255], b: [46, 49, 56, 255],
    M: [58, 58, 64, 255] }))
  const MAG = { all: 8, up: 9, north: 9, south: 9 }
  const WOOD = { all: 4, up: 3, down: 5 }
  const METAL = { all: 0, up: 1, down: 2 }
  solid(name, [
    [70, 74, 84], [104, 110, 122], [46, 49, 56], // 0-2 black metal: mid, light, dark
    [206, 128, 64], [170, 98, 48], [124, 68, 34], // 3-5 red-brown wood: light, mid, dark
    [182, 188, 200], [112, 118, 132], // 6-7 steel light, dark
    [36, 36, 40], [58, 58, 64], // 8-9 magazine black, its light face
    [214, 48, 52] // 10 the red front post (the aim point, like the other guns)
  ], [
    { from: [-6.5, 7.1, 7.1], to: [-4.5, 8.9, 8.9], c: { all: 7, up: 6, down: 2 } }, // muzzle brake
    { from: [-6.5, 8.9, 7.3], to: [-5.4, 9.1, 8.7], c: 2 }, // its top plate
    { from: [-4.5, 7.5, 7.5], to: [0.4, 8.5, 8.5], c: { all: 2, up: 0 } }, // barrel
    { from: [-3.6, 6.8, 7.25], to: [-1.9, 9.2, 8.75], c: METAL }, // front sight block
    { from: [-3.05, 9.2, 7.7], to: [-2.45, SY, 8.3], c: 10 }, // front post
    { from: [-3.3, 9.2, 7.05], to: [-2.2, 10.4, 7.4], c: 0 }, // its hood (two ears)
    { from: [-3.3, 9.2, 8.6], to: [-2.2, 10.4, 8.95], c: 0 },
    { from: [0.2, 8.5, 7.35], to: [2.2, 9.3, 8.65], c: METAL }, // gas block
    { from: [0.4, 5.6, 6.8], to: [1.2, 8.5, 9.2], c: METAL }, // front band
    { from: [1.2, 5.8, 6.9], to: [8.6, 8.5, 9.1], c: WOOD }, // lower handguard
    { from: [2.2, 8.5, 7.3], to: [8.2, 9.4, 8.7], c: WOOD }, // upper handguard over the gas tube
    { from: [8.6, 5.6, 6.8], to: [9.2, 8.6, 9.2], c: METAL }, // rear band
    { from: [9.2, 4.8, 7], to: [19.5, 9, 9], c: { all: 0, up: 2, down: 2 } }, // receiver
    { from: [10.8, 9, 7.35], to: [19.2, 9.5, 8.65], c: { all: 1, up: 0, down: 2 } }, // dust cover
    { from: [9.2, 9, 7.2], to: [10.8, 9.4, 8.8], c: METAL }, // rear sight base and its notch (the post shows through)
    { from: [9.6, 9.4, 7.2], to: [10.4, SY, 7.6], c: 2 },
    { from: [9.6, 9.4, 8.4], to: [10.4, SY, 8.8], c: 2 },
    { from: [15.2, 7.7, 9], to: [16.2, 8.3, 9.7], c: 7 }, // charging handle
    { from: [15.2, 7.7, 6.3], to: [16.2, 8.3, 7], c: 7 }, // (both sides: either hand sees one)
    { from: [11, 6.8, 6.85], to: [15, 7.3, 9.15], c: 2 }, // selector rail
    { from: [9.8, 2.2, 7.3], to: [12.8, 5, 8.7], c: MAG }, // magazine, curving forward in three steps
    { from: [9.8, -0.9, 7.3], to: [12.8, 2.5, 8.7], c: MAG, rot: { angle: -22.5, axis: 'z', origin: [11.3, 2.2, 8] } },
    { from: [8.65, -3.6, 7.3], to: [11.65, -0.3, 8.7], c: MAG, rot: { angle: -45, axis: 'z', origin: [10.15, -0.57, 8] } },
    { from: [8.45, -4.1, 7.2], to: [11.85, -3.5, 8.8], c: 2, rot: { angle: -45, axis: 'z', origin: [10.15, -0.57, 8] } }, // its base plate
    { from: [12.9, 3.4, 7.6], to: [16.8, 3.9, 8.4], c: 2 }, // trigger guard and trigger
    { from: [12.9, 3.9, 7.6], to: [13.4, 4.8, 8.4], c: 2 },
    { from: [14.1, 3.9, 7.75], to: [14.6, 4.8, 8.25], c: 6 },
    { from: [16, -0.4, 7.2], to: [18.6, 5.6, 8.8], c: WOOD, rot: { angle: 22.5, axis: 'z', origin: [17.3, 4.8, 8] } }, // grip, raked back
    { from: [19.5, 4.6, 7.2], to: [22.5, 8.6, 8.8], c: WOOD }, // stock: wrist, body, the drop, butt plate
    { from: [22.5, 3.6, 7.05], to: [26, 8.4, 8.95], c: WOOD },
    { from: [23.8, 2.5, 7.05], to: [26, 3.6, 8.95], c: WOOD },
    { from: [26, 2.3, 6.9], to: [26.8, 8.6, 9.1], c: METAL }
  ], display({
    firstperson: { rotation: [0, -82, 0], translation: [-5.26, 4.11, -1.79], scale: [0.68, 0.68, 0.68] },
    thirdperson: { rotation: [0, -90, 0], translation: [0, 1.5, -5.5], scale: [0.8, 0.8, 0.8] },
    gui: { rotation: [30, 45, 0], translation: [-0.5, 0.5, 0], scale: [0.72, 0.72, 0.72] },
    ground: { rotation: [0, 0, -45], translation: [-1, 8.25, 0], scale: [0.9, 0.9, 0.9] },
    fixed: { rotation: [0, 0, -45], translation: [-0.5, 1, -1], scale: [0.9, 0.9, 0.9] }
  }))
  state(`${name}_ads`, name, aim({ sightY: SY, rearX: 10.4, rearDepth: 0.8, scale: [1.6, 2.4, 2.4] }))
  state(`${name}_sprint`, name, { rotation: [21.5, -25.25, 0], translation: [-10.6, 2.84, 1.38], scale: [0.72, 0.72, 0.72] })
  return { 5: iconOr3d(name), 1005: iconOr3d(name, `${name}_ads`), 2005: iconOr3d(name, `${name}_sprint`) }
}
