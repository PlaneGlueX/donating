// R9-0 pump shotgun (WeaponMechanics weapons\shotguns\R9_0.yml, Skin Default 14, Scope +1000, Sprint +2000).
// Our shotgun (2026-09-29, owner: "i dont want it to look too realistic"): a fat steel barrel with a vent
// rib and a red bead, the magazine tube under it, a big light-wood pump with three dark grooves (the part
// that reads first), a gunmetal receiver and a straight light-wood stock with a black recoil pad. The pump
// action has no skin state in WeaponMechanics, so nothing moves.
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the tops of the bead and the rear
// notch, y = SY.
module.exports = ({ solid, icon, art, iconOr3d, state, aim, display }) => {
  const name = 'gun_r90'
  const SY = 10
  icon(name, art([
    '................',
    '................',
    '................',
    '.k......kkk.....',
    'kRkkkkkkBBBkkk..',
    'kSSSSSSSBBBWWWk.',
    'kDPPPPPDGGGWWWWk',
    '.kPpPpPkGGGwWWWk',
    '.kWpWpWkkGkkwWWk',
    '..kkkkk.kkk.kwwk',
    '.............kk.',
    '................',
    '................',
    '................',
    '................',
    '................'
  ], { S: [182, 188, 200, 255], D: [70, 74, 84, 255], R: [214, 48, 52, 255], B: [104, 110, 122, 255], G: [70, 74, 84, 255],
    P: [232, 198, 140, 255], p: [166, 126, 76, 255], W: [206, 166, 106, 255], w: [166, 126, 76, 255] }))
  const WOOD = { all: 4, up: 3, down: 5 }
  const METAL = { all: 0, up: 1, down: 2 }
  const groove = x => ({ from: [x, 4.6, 6.5], to: [x + 0.5, 7.9, 9.5], c: 5, dirs: ['north', 'south', 'up', 'down'] })
  solid(name, [
    [70, 74, 84], [104, 110, 122], [46, 49, 56], // 0-2 gunmetal: mid, light, dark
    [232, 198, 140], [206, 166, 106], [166, 126, 76], // 3-5 light wood: light, mid, dark
    [182, 188, 200], [112, 118, 132], // 6-7 steel light, dark
    [214, 48, 52], // 8 the red bead
    [36, 36, 40], [58, 58, 64] // 9-10 recoil pad black, its light face
  ], [
    { from: [-4.4, 7.4, 7.3], to: [11, 8.8, 8.7], c: { all: 7, up: 6, down: 2 } }, // barrel
    { from: [-4.9, 7.2, 7.1], to: [-4.2, 9, 8.9], c: 2 }, // muzzle ring
    { from: [-4.2, 8.8, 7.75], to: [11, 9.1, 8.25], c: 6 }, // vent rib
    { from: [-4.1, 9.1, 7.7], to: [-3.5, SY, 8.3], c: 8 }, // red bead (front sight)
    { from: [-2.9, 5.9, 7.4], to: [11, 7.4, 8.6], c: METAL }, // magazine tube
    { from: [-3.5, 5.8, 7.3], to: [-2.9, 7.4, 8.7], c: 6 }, // its cap
    { from: [-2.3, 5.8, 7.2], to: [-1.6, 8.9, 8.8], c: 2 }, // barrel clamp
    { from: [2.5, 4.8, 6.6], to: [9.5, 7.7, 9.4], c: WOOD }, // the pump, with three grooves
    groove(3.9),
    groove(5.75),
    groove(7.6),
    { from: [9.5, 5.4, 7.2], to: [11, 5.9, 8.8], c: 2 }, // action bars to the receiver
    { from: [11, 4.6, 6.9], to: [17.4, 8.9, 9.1], c: { all: 0, up: 2, down: 2 } }, // receiver
    { from: [12, 7, 9.1], to: [15.2, 8.4, 9.25], c: 2 }, // ejection port (both sides)
    { from: [12, 7, 6.75], to: [15.2, 8.4, 6.9], c: 2 },
    { from: [11.4, 4.3, 7.3], to: [16.6, 4.6, 8.7], c: 2 }, // loading port
    { from: [11, 8.9, 7.2], to: [11.8, SY, 7.65], c: 2 }, // rear notch: the bead shows between the posts
    { from: [11, 8.9, 8.35], to: [11.8, SY, 8.8], c: 2 },
    { from: [12.4, 3.2, 7.6], to: [15.6, 3.7, 8.4], c: 2 }, // trigger guard and trigger
    { from: [12.4, 3.7, 7.6], to: [12.9, 4.3, 8.4], c: 2 },
    { from: [15.1, 3.7, 7.6], to: [15.6, 4.3, 8.4], c: 2 },
    { from: [13.7, 3.7, 7.75], to: [14.2, 4.3, 8.25], c: 6 },
    { from: [17.4, 4.3, 7.15], to: [20.4, 8.8, 8.85], c: WOOD }, // stock: wrist, body, the drop, recoil pad
    { from: [20.4, 3.3, 7.05], to: [25, 8.6, 8.95], c: WOOD },
    { from: [22, 2.3, 7.05], to: [25, 3.3, 8.95], c: WOOD },
    { from: [25, 2.1, 6.9], to: [26, 8.8, 9.1], c: { all: 9, up: 10 } }
  ], display({
    firstperson: { rotation: [0, -84, 0], translation: [-4.5, 4.5, -3], scale: [0.9, 0.9, 0.9] },
    thirdperson: { rotation: [0, -90, 0], translation: [0, 2, -4.5], scale: [0.8, 0.8, 0.8] },
    gui: { rotation: [30, 45, 0], translation: [-0.2, 1.25, 0], scale: [0.72, 0.72, 0.72] },
    ground: { rotation: [0, 0, -45], translation: [0.75, 7.75, 0], scale: [0.9, 0.9, 0.9] },
    fixed: { rotation: [0, 0, -45], translation: [0.5, 0.75, -1.25], scale: [0.9, 0.9, 0.9] }
  }))
  state(`${name}_ads`, name, aim({ sightY: SY, rearX: 11.8, rearDepth: 0.8 }))
  state(`${name}_sprint`, name, { rotation: [19.88, -26.19, 4.92], translation: [-8, 4.75, 2.25], scale: [0.9, 0.9, 0.9] })
  return { 14: iconOr3d(name), 1014: iconOr3d(name, `${name}_ads`), 2014: iconOr3d(name, `${name}_sprint`) }
}
