// .50 GS (WeaponMechanics weapons\pistols\50_GS.yml, Skin Default 9, Scope +1000, Sprint +2000).
// Our hand cannon (2026-09-29, owner: "i dont want it to look too realistic"): a chunky polished slide with
// a dark top rib and a big square muzzle brake, a gunmetal frame, a raked wooden grip with a brass
// medallion, a red front post. Cops of difficulty 0-2 and the hit bodyguards hold it (third person matters).
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the top of the posts, y = SY.
module.exports = ({ solid, icon, art, iconOr3d, state, aim, display }) => {
  const name = 'gun_gs50'
  const SY = 10.2
  icon(name, art([
    '................',
    '................',
    '.kkk..k....k.k..',
    'kSSSkkRkkkkDkDkk',
    'kWWWDWWWWWWWWWWk',
    'kSdSDWWWWWWWWWSk',
    'kSdSDSSSSddddSSk',
    'kDDDDDDDDDDDDDDk',
    '.kkkkGGGGGGGkkk.',
    '....kGkkYkkLLMk.',
    '....kGk.YkkLLLMk',
    '....kkkkkkkLYLMk',
    '...........kLLMk',
    '...........kLLMk',
    '...........kkkkk',
    '................'
  ], { W: [236, 240, 246, 255], S: [182, 188, 200, 255], D: [112, 118, 132, 255], G: [70, 74, 84, 255],
    R: [214, 48, 52, 255], Y: [226, 182, 76, 255], L: [206, 166, 106, 255], M: [166, 126, 76, 255], d: [46, 49, 56, 255] }))
  const rake = { angle: 22.5, axis: 'z', origin: [13.4, 4.4, 8] }
  solid(name, [
    [236, 240, 246], [182, 188, 200], [112, 118, 132], [70, 74, 84], // 0-3 steel light, mid, dark; frame
    [104, 110, 122], [46, 49, 56], [206, 166, 106], [166, 126, 76], // 4-7 frame light, frame dark, wood, wood dark
    [232, 198, 140], [226, 182, 76], [160, 118, 40], [214, 48, 52], // 8-11 wood light, brass, brass dark, red
    [22, 22, 26] // 12 the bore
  ], [
    { from: [0.4, 6, 6.6], to: [16, 9.2, 9.4], c: { all: 1, up: 0, down: 2 } }, // slide
    { from: [0.4, 9.2, 7.4], to: [14.2, 9.6, 8.6], c: 2 }, // top rib
    { from: [12.4, 6.5, 6.5], to: [13, 8.9, 9.5], c: 2 }, // grip grooves at the back of the slide
    { from: [13.6, 6.5, 6.5], to: [14.2, 8.9, 9.5], c: 2 },
    { from: [14.8, 6.5, 6.5], to: [15.4, 8.9, 9.5], c: 2 },
    { from: [5, 7.1, 6.5], to: [8.6, 8.5, 9.5], c: 5 }, // ejection port
    { from: [-2, 5.8, 6.4], to: [0.4, 9.4, 9.6], c: { all: 2, up: 1 } }, // the square muzzle brake
    { from: [-1.4, 6.4, 6.35], to: [-0.6, 8.8, 9.65], c: 5 }, // its side port
    { from: [-2.05, 6.8, 7.3], to: [-1.9, 8.2, 8.7], c: 12, dirs: ['west'] }, // the bore
    { from: [0.4, 4.2, 6.9], to: [16, 6, 9.1], c: { all: 3, down: 5 } }, // frame
    { from: [0.3, 4.8, 6.8], to: [3.2, 6, 9.2], c: 4 }, // frame nose
    { from: [15.2, 4.6, 7.3], to: [16.8, 6, 8.7], c: 3 }, // beavertail
    { from: [16, 6.6, 7.4], to: [17, 8.4, 8.6], c: 2 }, // hammer
    { from: [6, 2, 7.3], to: [12.3, 2.8, 8.7], c: 3 }, // trigger guard: bottom, front
    { from: [6, 2.8, 7.3], to: [6.8, 4.2, 8.7], c: 3 },
    { from: [8.4, 2.8, 7.6], to: [9, 4.2, 8.4], c: 9 }, // trigger
    { from: [11.4, -1.4, 6.8], to: [15.4, 5.4, 9.2], c: { all: 6, up: 3, east: 7, west: 7 }, rot: rake }, // grip
    { from: [11.1, -1.4, 7.1], to: [11.4, 5.4, 8.9], c: 5, rot: rake }, // front strap
    { from: [12.7, 0.6, 6.7], to: [14.1, 2, 9.3], c: { all: 9, down: 10, east: 10 }, rot: rake }, // medallion
    { from: [11.2, -2.2, 6.7], to: [15.6, -1.4, 9.3], c: 5, rot: rake }, // butt plate
    { from: [0.9, 9.6, 7.55], to: [1.9, SY, 8.45], c: 11 }, // front post (red)
    { from: [14.3, 9.2, 6.8], to: [15.3, SY, 7.55], c: 5 }, // rear notch, two posts
    { from: [14.3, 9.2, 8.45], to: [15.3, SY, 9.2], c: 5 }
  ], display({
    firstperson: { rotation: [0, -80, 0], translation: [-5.35, 4.44, -1.13], scale: [0.56, 0.56, 0.56] },
    thirdperson: { rotation: [0, -90, -80], translation: [0, 3, 3], scale: [0.7, 0.7, 0.7] },
    ground: { rotation: [0, 0, -45], translation: [0, 4, 0], scale: [0.7, 0.7, 0.7] },
    fixed: { rotation: [0, 0, -45], translation: [0.25, 1.75, -0.25], scale: [0.7, 0.7, 0.7] },
    head: { rotation: [0, -90, 0], translation: [0, 13, 7], scale: [1, 1, 1] }
  }))
  state(`${name}_ads`, name, aim({ sightY: SY, rearX: 15.3, rearDepth: 2, scale: [1.6, 2.4, 2.4] }))
  state(`${name}_sprint`, name, { rotation: [-25, -60, 0], translation: [-6.56, 2.09, -1.96], scale: [0.56, 0.56, 0.56] })
  return { 9: iconOr3d(name), 1009: iconOr3d(name, `${name}_ads`), 2009: iconOr3d(name, `${name}_sprint`) }
}
