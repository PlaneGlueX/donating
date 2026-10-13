// The Veteran (WeaponMechanics weapons\light_machine_guns\MG34.yml, title MG34, shown as "Veteran"; skins Default 11,
// Scope +1000, Sprint +2000, Reload +3000; 2026-10-06, remade the same day at the Photon Shotgun's detail level). A
// recreation of Pixel Gun 3D's WWII light machine gun, the "Veteran" (drawn by hand from the fan wiki's Appearance
// picture, nothing taken from the game): a Bren-style LMG. A big square black box flash hider with a silver plate
// set into each face (lighter toward the front and top) and a silver frame round its square bore, a front sight right
// behind it (a blade between two ears, on a bracket off to the left), a dark gas
// block, a grey barrel with a silver streak and a finned sleeve by the receiver; the bipod deployed under the barrel
// nut (thick near-black legs splayed out sideways, a light-blue inlay down each, big flat feet); a chunky grey receiver
// in plates (black seams, vent slots, rivets, a serrated strip by the well, cream wear chips); a tall light-grey
// magazine standing up out of its top (one tall box, its top stepping down to the front; its broad sides dark inside
// a light rim with a silver window, its narrow ends light with a tan wear streak); the range drum and aperture on the left of the
// receiver (a Bren's sights are offset left of the magazine, so the sight line is z = SZ, not 8); a carrying handle
// folded down on the right, a cocking handle in a slot on the left, an orange wooden pistol grip panel in a dark-brown frame,
// and a short orange wooden stock (a dark staircase underneath, a cream star on each side, a thin light-blue band with
// navy rims near its end, a black butt plate). Full-auto, 9 rounds a second: fire held flickers a star-shaped flash out
// of the box over a heavy, steady kick, the magazine trembling. The Default state's cooldown is the draw (GunFx: 40
// ticks when it's equipped). Built along x, muzzle toward -x, centred on z = 8 (+z is the gun's left: the side first
// person sees). PG painter (style 'pg', density 4): every box on the 1/4 grid; the sights and thin layers have no
// outline. Every box stays within -16..32: the gun runs from the flash hider's mouth at x = -14.25 to the butt plate at
// 26.5, and the muzzle flash is drawn FX units back inside the bounds and moved out to the muzzle by its frame's
// transformation.
module.exports = ({ pg, aim, display, write, mirror }) => {
  const { ease, rig } = pg
  const name = 'gun_lmg'
  const SY = 10.7 // the sight line's height
  const SZ = 10.1 // the sight line's side offset (left of the magazine)
  // The aim (Scope). aim() centres z = 8 on the screen; the sights are SZ - 8 to the gun's left, and after aim's -90
  // degree turn (scale z 2.4) that is (SZ - 8) x 2.4 = 5.04 toward the screen's left in BOTH hands (the client applies
  // the left hand's stored [0, 90, 0] as -90, the same turn), while it negates the left hand's translation x. So each
  // hand gets its own: the right hand moves the gun right, tx = -8.96 + 5.04 = -3.92; the left hand needs the applied
  // tx = 8.96 + 5.04, stored -14.0 (= the right's - 10.08). pgGun's states mirror one transform for both hands (which
  // put the left hand's sights 10.08 units off the crosshair), so the ads models are written again below.
  const r3 = v => Math.round(v * 1000) / 1000
  const SIGHT_SHIFT = (SZ - 8) * 2.4
  const ADS = (a => ({ ...a, translation: [r3(a.translation[0] + SIGHT_SHIFT), a.translation[1], a.translation[2]] }))(aim({ sightY: SY, rearX: 14.5, rearDepth: 1.6, scale: [1.6, 2.4, 2.4] }))
  const ADS_L = { ...mirror(ADS), translation: [r3(ADS.translation[0] - 2 * SIGHT_SHIFT), ADS.translation[1], ADS.translation[2]] }
  const BORE_Y = 8.0
  const MUZZLE = -14.25 // the box's mouth
  const FX = 8 // the flash is drawn this far back (+x) and moved out in its frames
  const GRIP = { angle: 15, axis: 'z', origin: [14.3, 5.3, 8] }
  const BUTT = 26.5 // the butt plate's end
  // Metal faces get a low blocky grain (the reference's metal is mostly flat tones with bevels, few speckles: the
  // material's default 0.18 reads as noise at this size).
  const GRAIN = 0.07
  const METALS = ['metal', 'metalL', 'metalD', 'dark', 'silver', 'leg', 'feet']
  const pgGun = (n, s) => pg.pgGun(n, { ...s, parts: Object.fromEntries(Object.entries(s.parts).map(([p, bs]) => [p, bs.map(b => b.grain === undefined && METALS.includes(typeof b.c === 'string' ? b.c : b.c.all) ? { ...b, grain: GRAIN } : b)])) })
  // A bipod leg: a square tube from the yoke down, splayed out sideways 18 degrees (side +1 = the left leg, +z), a
  // light-blue inlay down its outer and front faces, a hinge plate at the top of the outer face, a big flat foot.
  const LEG_X = [-2.25, -0.25]
  const LEG_TOP = 5.75; const LEG_BOT = -2.25
  const leg = side => {
    const zc = side > 0 ? 9.75 : 6.25
    const z0 = zc - 1.0; const z1 = zc + 1.0
    const rot = { angle: side > 0 ? -18 : 18, axis: 'x', origin: [(LEG_X[0] + LEG_X[1]) / 2, LEG_TOP, zc] }
    const outer = side > 0 ? 'south' : 'north'
    return [
      { from: [LEG_X[0], LEG_BOT, z0], to: [LEG_X[1], LEG_TOP, z1], c: 'leg', rot, split: { y: [LEG_TOP - 1.75] },
        deco: [
          { k: 'band', face: outer, at: [LEG_X[0] + 0.75, LEG_TOP - 2.25], to: [LEG_X[1] - 0.75, LEG_BOT + 1.0], c: 'blue' },
          { k: 'band', face: 'west', at: [z0 + 0.75, LEG_TOP - 2.25], to: [z1 - 0.75, LEG_BOT + 1.0], c: 'blue' },
          { k: 'band', face: side > 0 ? 'north' : 'south', at: [LEG_X[0] + 0.75, LEG_TOP - 2.25], to: [LEG_X[1] - 0.75, LEG_BOT + 1.0], c: 'blue' },
          { k: 'band', face: 'east', at: [z0 + 0.75, LEG_TOP - 2.25], to: [z1 - 0.75, LEG_BOT + 1.0], c: 'blue' },
          { k: 'stamp', face: outer, at: [LEG_X[0] + 0.25, LEG_TOP - 0.25], to: [LEG_X[1] - 0.25, LEG_TOP - 1.5], rows: ['gggg', 'g##g', 'g##g', 'gggg'], keys: { g: 'feet' } },
          { k: 'stamp', face: 'west', at: [z0 + 0.25, LEG_TOP - 0.25], to: [z1 - 0.25, LEG_TOP - 1.5], rows: ['gggg', 'g##g', 'g##g', 'gggg'], keys: { g: 'feet' } },
          { k: 'rivets', face: outer, at: [LEG_X[0] + 0.25, LEG_BOT + 0.75], to: [LEG_X[1] - 0.25, LEG_BOT + 0.25], n: 1, c: 'feet', size: 2 },
          { k: 'rivets', face: 'west', at: [z0 + 0.25, LEG_BOT + 0.75], to: [z1 - 0.25, LEG_BOT + 0.25], n: 1, c: 'feet', size: 2 }
        ] },
      // the foot: a wide flat pad, grey panels on its sides and ends
      { from: [LEG_X[0] - 0.75, LEG_BOT - 0.75, zc - 1.25], to: [LEG_X[1] + 0.75, LEG_BOT, zc + 1.25], c: 'leg', rot,
        deco: [{ k: 'inset', face: 'sides', at: [LEG_X[0] - 0.5, LEG_BOT], to: [LEG_X[1] + 0.5, LEG_BOT - 0.75], c: 'feet' }, { k: 'inset', face: 'ends', at: [zc - 1.0, LEG_BOT], to: [zc + 1.0, LEG_BOT - 0.75], c: 'feet' }] }
    ]
  }
  // The magazine: one tall box (the reference's is a single piece, nearly straight), its top stepping down to the front
  // (a dark cap over the back half); its broad sides dark inside a light rim, a silver window and a white slot near the
  // top; its narrow ends light grey with a tan wear streak down the middle.
  const MAG = { z0: 7.0, z1: 9.0 }
  // The star on the stock's sides (cream on the orange wood), 11 x 10 texels.
  const STAR = ['.....w.....', '....www....', '....www....', 'wwwwwwwwwww', '.wwwwwwwww.', '..wwwwwww..', '..wwwwwww..', '.wwww.wwww.', '.www...www.', 'ww.......ww']
  // ---------- the hands (pg.js spec.hands; handoff/2026-10-12/hands/PLAN.md) ----------
  // The right glove on the grip (its top centre, raked 15 degrees; 2.75 deep and 2.5 wide: 1.15 times the shared
  // glove); the left hand (only in the reload) round the top magazine's rear half: it lifts the magazine off and away,
  // brings the new one, rocks it in, slaps it down and racks the cocking handle on the left.
  const { then, hands } = pg
  const { OR, OL } = hands
  const RH = rig({ t: [14.35 - OR[0], 5.0 - OR[1], 8 - OR[2]], rot: [[[0, 0, 1], 15]], pivot: OR })
  const LH = rig({ t: [8.6 - OL[0], 13.2 - OL[1], 8 - OL[2]], pivot: OL })
  const gun = pgGun(name, {
    hands: { right: { at: RH, scale: 1.15, armScale: 0.9 }, left: { at: LH, shown: false, scale: 1.2, armScale: 0.9 }, leftTree: false },
    style: 'pg',
    density: 4,
    ink: [8, 8, 10],
    palette: {
      // the grey receiver, nut, drum (sampled: #1e1e22 #444447 #61646a #86868b #b2b0b5 #e6e5e9)
      metal: [134, 134, 140], metalL: [176, 174, 182], metalD: [66, 66, 72], dark: [30, 30, 34],
      // the silver of the muzzle box, the barrel streak, studs (#909196 #acacb2 #cfcfd5)
      silver: [176, 176, 184], silverD: { of: 'silver', k: -1 }, silverDD: { of: 'silver', k: -2 },
      // warm wear: the cream chips and the magazine's tan streak (#f4d6bc #d7b595 #c29f84 #96765a)
      cream: [244, 222, 196], tan: [200, 164, 128],
      // the aimed-through parts (KEEP keys: skins never recolor them)
      post: [26, 27, 32], sight: [62, 64, 72],
      // the magazine: light grey, warm (#cbc3c0 #9f9a9b #7a7575), its dark side panel (#504d4d #2f2c2b), the window
      mag: [206, 200, 198], magD: [66, 62, 62], magW: [222, 220, 226],
      // wood: the butt and the grip (#482815 #7b481f #b16c2d #dba26e)
      wood: [176, 106, 46], woodL: [216, 160, 108], woodD: [96, 54, 26],
      // the butt's band (#13345b rims, #6e96c2-#78a1ce) and the bipod's inlays (#3e5f86 #5077a2 #6b94c6)
      blue: [112, 152, 200], navy: [20, 50, 90],
      // the bipod legs (near-black navy #0a172d) and the feet's grey panels (#4e4f52 #7b7b7e)
      leg: [18, 26, 42], feet: [110, 110, 114],
      star: [240, 226, 210],
      bore: [10, 10, 12], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: { metal: 'metal', metalL: 'metal', metalD: 'dark', dark: 'dark', silver: 'chrome', silverD: 'chrome', silverDD: 'chrome', cream: 'paint', tan: 'paint', mag: 'paint', magD: 'dark', magW: 'chrome', wood: 'wood', woodL: 'wood', woodD: 'wood', blue: 'paint', navy: 'dark', leg: 'dark', feet: 'metal', star: 'flat', post: 'flat', sight: 'flat', bore: 'flat' },
    parts: {
      body: [
        // ---- the muzzle: a big square flash hider (3.5 square, 2.75 long): a black box with a silver plate set into each
        // face, quartered (lighter at the front and top, darker at the back and bottom; the plates cover the seams), a
        // square bore in a silver frame on its end, a ring line near its back ----
        { from: [MUZZLE, 6.25, 6.25], to: [-11.5, 9.75, 9.75], c: 'dark', split: { x: [-12.75], y: [8.0], z: [8.0] },
          deco: [
            { k: 'band', face: 'sides', at: [-13.75, 9.25], to: [-12.75, 8.0], c: 'silver' }, { k: 'band', face: 'sides', at: [-12.75, 9.25], to: [-12.0, 8.0], c: 'silverD' },
            { k: 'band', face: 'sides', at: [-13.75, 8.0], to: [-12.75, 6.75], c: 'silverD' }, { k: 'band', face: 'sides', at: [-12.75, 8.0], to: [-12.0, 6.75], c: 'silverDD' },
            { k: 'band', face: 'flats', at: [-13.75, 6.75], to: [-12.75, 8.0], c: 'silver' }, { k: 'band', face: 'flats', at: [-12.75, 6.75], to: [-12.0, 8.0], c: 'silverD' },
            { k: 'band', face: 'flats', at: [-13.75, 8.0], to: [-12.75, 9.25], c: 'silverD' }, { k: 'band', face: 'flats', at: [-12.75, 8.0], to: [-12.0, 9.25], c: 'silverDD' },{ k: 'inset', face: 'west', at: [6.5, 9.5], to: [9.5, 6.5], c: 'silver' }, { k: 'slots', face: 'sides', at: [-12.0, 9.75], to: [-11.75, 6.25], dir: 'v', n: 1 }, { k: 'slots', face: ['up', 'down'], at: [-12.0, 6.25], to: [-11.75, 9.75], dir: 'v', n: 1 }] },
        { from: [MUZZLE - 0.02, 7.0, 7.0], to: [MUZZLE, 9.0, 9.0], c: 'bore', dirs: ['west'], outline: false },
        { from: [-11.5, 7.0, 7.0], to: [-11.0, 9.0, 9.0], c: 'dark' }, // the neck
        // ---- the front sight: a collar, a bracket off to the left, two tall ears (the reference's tall block with its
        // window; their tops 0.45 under the sight line, so the post stands alone in the sight picture), the blade between them (its tip on the sight line) ----
        { from: [-11.0, 6.75, 6.75], to: [-9.5, 9.25, 9.25], c: 'metalD', deco: [{ k: 'rivets', face: 'sides', at: [-10.75, 7.5], to: [-9.75, 7.0], n: 2, c: 'silver', size: 2 }] },
        { from: [-11.0, 8.25, 9.25], to: [-9.75, 9.25, 11.25], c: 'metalD', deco: [{ k: 'slots', face: 'sides', at: [-10.75, 9.0], to: [-10.0, 8.5], n: 1 }] },
        { from: [-11.0, 9.25, 9.0], to: [-9.75, 10.25, 9.5], c: 'metal', deco: [{ k: 'band', face: 'north', at: [-10.75, 10.0], to: [-10.0, 9.5], c: 'silver' }] },
        { from: [-11.0, 9.25, 10.75], to: [-9.75, 10.25, 11.25], c: 'metal', deco: [{ k: 'band', face: 'south', at: [-10.75, 10.0], to: [-10.0, 9.5], c: 'silver' }] },
        { from: [-10.5, 9.25, SZ - 0.2], to: [-10.1, SY, SZ + 0.2], c: 'post', outline: false },
        // ---- under the front: the gas block (a silver face) and its plug ----
        { from: [-9.5, 5.25, 7.0], to: [-8.0, 7.0, 9.0], c: 'metalD', deco: [{ k: 'inset', face: 'sides', at: [-9.25, 6.75], to: [-8.25, 5.5], c: 'silver' }] },
        { from: [-9.0, 4.75, 7.5], to: [-8.5, 5.25, 8.5], c: 'silver' },
        // ---- the barrel (2.0 square): grey, a silver streak along each side; the finned sleeve by the receiver ----
        { from: [-9.5, 7.0, 7.0], to: [1.25, 9.0, 9.0], c: { all: 'metal', up: 'metalL' }, split: { x: [-6.25] }, deco: [{ k: 'band', face: 'sides', at: [-9.25, 8.75], to: [-3.25, 8.25], c: 'silver' }, { k: 'band', face: 'up', at: [-9.25, 7.75], to: [-3.25, 8.25], c: 'silver' }] },
        { from: [-3.25, 6.75, 6.75], to: [1.25, 9.25, 9.25], c: 'metalD', deco: [{ k: 'ribs', face: 'sides', at: [-3.0, 9.0], to: [1.0, 7.0], c: 'silver' }, { k: 'ribs', face: 'up', at: [-3.0, 7.0], to: [1.0, 9.0], c: 'silver' }] },
        // the gas tube under the barrel, back to the receiver
        { from: [-8.0, 5.75, 7.25], to: [1.25, 7.0, 8.75], c: 'metalD', split: { x: [-4.25] } },
        // the bipod's yoke on the gas tube (grey studs on its sides), the legs splayed out of it
        { from: [-2.25, 5.0, 6.5], to: [-0.25, 7.25, 9.5], c: 'dark', deco: [{ k: 'rivets', face: 'sides', at: [-2.0, 6.75], to: [-0.5, 6.25], n: 2, c: 'feet', size: 2 }, { k: 'slots', face: 'ends', at: [6.75, 6.0], to: [9.25, 5.5], n: 1 }] },
        ...leg(1), ...leg(-1),
        // ---- the carrying handle, folded down on the right (the icon shows it): arms off the nut, the grip bar ----
        { from: [0.0, 7.75, 5.75], to: [1.0, 8.75, 6.75], c: 'metalD' },
        { from: [-3.75, 7.5, 5.0], to: [1.0, 9.0, 5.75], c: 'dark', deco: [{ k: 'slots', face: 'north', at: [-3.25, 8.75], to: [0.5, 7.75], dir: 'v', n: 5 }, { k: 'band', face: 'up', at: [-3.5, 5.0], to: [0.75, 5.75], c: 'metalD' }] },
        // ---- the barrel nut: a chunky collar (the reference's first bump ahead of the magazine), a cream chip ----
        { from: [1.25, 6.0, 6.75], to: [3.5, 10.0, 9.25], c: { all: 'metal', up: 'metalL' }, split: { x: [2.25] }, deco: [{ k: 'band', face: 'up', at: [1.5, 6.75], to: [2.0, 9.25], c: 'cream' }, { k: 'rivets', face: 'sides', at: [2.5, 7.0], to: [3.25, 6.5], n: 1, c: 'silver', size: 2 }, { k: 'stamp', face: 'south', at: [1.5, 9.75], to: [2.25, 9.0], rows: ['ccc', 'cc', 'c'], keys: { c: 'cream' } }, { k: 'stamp', face: 'north', at: [1.5, 9.75], to: [2.0, 9.0], rows: ['cc', 'c'], keys: { c: 'cream' } }, { k: 'rivets', face: 'sides', at: [2.5, 9.5], to: [3.25, 9.0], n: 1, c: 'silver', size: 2 }] },
        // ---- the receiver (4.0 tall, 2.5 wide): plates (the front panel under the magazine, a middle panel, the rear
        // behind the grip, split along y too), a vent of slots below the well, a serrated strip by the well (the
        // reference's zigzag), a silver bar, rivets, slots on top behind the well, the cocking handle's slot (left) ----
        { from: [3.5, 6.0, 6.75], to: [16.5, 10.0, 9.25], c: { all: 'metal', up: 'metalL' }, split: { x: [10.25, 13.0], y: [7.5] },
          deco: [
            { k: 'slots', face: 'sides', at: [4.0, 7.25], to: [9.75, 6.25], dir: 'v', n: 10 },
            { k: 'stamp', face: 'sides', at: [3.75, 9.75], to: [7.0, 9.0], rows: ['+.+.+.+.+.+.+', '++.++.++.++.+', '-------------'] },
            { k: 'band', face: 'sides', at: [7.25, 8.75], to: [10.0, 8.25], c: 'silver' },
            { k: 'stamp', face: 'sides', at: [13.25, 9.75], to: [14.0, 9.0], rows: ['ccc', 'cc', 'c'], keys: { c: 'cream' } },
            { k: 'rivets', face: 'sides', at: [10.5, 9.75], to: [12.75, 9.25], n: 3, c: 'metalL', size: 2 },
            { k: 'inset', face: 'sides', at: [10.5, 7.25], to: [12.75, 6.25], c: 'metal' },
            { k: 'slots', face: 'sides', at: [13.25, 7.25], to: [16.25, 6.25], n: 2 },
            { k: 'rivets', face: 'sides', at: [14.5, 9.75], to: [16.25, 9.25], n: 3, c: 'metalL', size: 1 },
            { k: 'slots', face: 'up', at: [10.75, 7.25], to: [13.0, 8.75], dir: 'v', n: 4 },
            { k: 'band', face: 'up', at: [13.5, 7.0], to: [14.25, 7.5], c: 'cream' },
            { k: 'band', face: 'up', at: [3.75, 7.25], to: [5.25, 8.75], c: 'metalL' }
          ] },
        { from: [3.5, 7.0, 9.25], to: [9.5, 7.5, 9.29], c: 'bore', outline: false, dirs: ['south'] },
        // the magazine well and catch on top
        { from: [5.5, 10.0, 7.0], to: [10.25, 10.5, 9.0], c: 'dark' },
        { from: [10.25, 10.0, 7.5], to: [11.0, 11.0, 8.5], c: 'metalD' },
        // under the receiver: the ejection port cover
        { from: [4.5, 5.5, 7.25], to: [9.25, 6.0, 8.75], c: 'dark' },
        // ---- the rear sight: the range drum on the left (graduated), the aperture ring around the sight line ----
        { from: [13.25, 7.5, 9.25], to: [15.5, 10.0, 10.75], c: 'metalD', deco: [{ k: 'ribs', face: 'south', at: [13.5, 9.75], to: [15.25, 8.0], c: 'metalL' }, { k: 'slots', face: 'up', at: [13.5, 9.5], to: [15.25, 10.5], dir: 'v', n: 3 }] },
        { from: [14.0, 10.0, SZ - 0.85], to: [14.5, SY - 0.5, SZ + 0.85], c: 'sight', outline: false },
        { from: [14.0, SY - 0.5, SZ - 0.85], to: [14.5, SY + 0.5, SZ - 0.45], c: 'sight', outline: false },
        { from: [14.0, SY - 0.5, SZ + 0.45], to: [14.5, SY + 0.5, SZ + 0.85], c: 'sight', outline: false },
        { from: [14.0, SY + 0.5, SZ - 0.85], to: [14.5, SY + 0.85, SZ + 0.85], c: 'sight', outline: false },
        // ---- the trigger housing, the guard, the trigger ----
        { from: [10.5, 5.0, 7.0], to: [16.5, 6.0, 9.0], c: 'metalD', deco: [{ k: 'rivets', face: 'sides', at: [14.0, 5.75], to: [16.25, 5.25], n: 2, c: 'metalL', size: 2 }] },
        { from: [10.5, 3.75, 7.5], to: [13.5, 4.25, 8.5], c: 'metalD' },
        { from: [10.5, 4.25, 7.5], to: [11.0, 5.0, 8.5], c: 'metalD' },
        { from: [11.75, 4.25, 7.75], to: [12.25, 5.0, 8.25], c: 'silver', outline: false },
        // ---- the wooden pistol grip, raked back: an orange frame, a lighter raised panel, finger grooves, a dark cap ----
        { from: [13.0, 0.5, 6.75], to: [15.75, 5.0, 9.25], c: 'woodD', rot: GRIP, deco: [{ k: 'band', face: 'sides', at: [13.5, 4.5], to: [15.25, 1.0], c: 'wood' }, { k: 'slots', face: 'west', at: [7.0, 4.25], to: [9.0, 1.25], n: 3 }] },
        { from: [12.75, 0.0, 6.75], to: [16.0, 0.5, 9.25], c: 'woodD', rot: GRIP }
      ],
      // The stock (hidden while aiming): the buffer cap, the short chunky butt stepping down to its end (a dark-brown
      // staircase underneath), a light streak, the cream star, the thin blue band, a black butt plate.
      stock: [
        { from: [16.5, 6.5, 7.0], to: [18.5, 9.75, 9.0], c: 'metalD', split: { x: [17.5] }, deco: [{ k: 'rivets', face: 'sides', at: [17.75, 9.5], to: [18.25, 7.0], n: 2, c: 'metalL', size: 2 }] },
        { from: [18.5, 4.75, 6.75], to: [BUTT - 1.0, 9.75, 9.25], c: 'wood', deco: [
          { k: 'band', face: 'sides', at: [18.75, 9.5], to: [BUTT - 1.25, 9.25], c: 'woodL' },
          { k: 'stamp', face: 'sides', at: [19.75, 8.75], to: [22.5, 6.25], rows: STAR, keys: { w: 'star' } },
          { k: 'slots', face: 'up', at: [19.0, 7.25], to: [22.5, 8.75], dir: 'v', n: 3 }
        ] },
        { from: [BUTT - 6.25, 3.75, 7.0], to: [BUTT - 1.0, 4.75, 9.0], c: 'woodD' },
        { from: [BUTT - 4.0, 2.75, 7.0], to: [BUTT - 1.0, 3.75, 9.0], c: 'woodD' },
        { from: [BUTT - 3.0, 2.5, 6.5], to: [BUTT - 2.0, 10.0, 9.5], c: 'blue', ink: 'navy', split: { y: [4.75] } },
        { from: [BUTT - 1.0, 2.25, 6.5], to: [BUTT, 10.25, 9.5], c: 'dark', pat: 'plates', grain: 0 }
      ],
      // The cocking handle on the left, at the front of its slot (racked back +x along it, inside the slot 3.5..9.5).
      bolt: [
        { from: [3.75, 7.0, 9.25], to: [4.5, 7.5, 9.75], c: 'metalL', outline: false },
        { from: [3.5, 6.75, 9.75], to: [4.75, 8.0, 10.75], c: { all: 'metal', south: 'metalL', up: 'metalL' } }
      ],
      mag: [
        { from: [5.75, 10.5, 7.0], to: [10.0, 10.75, 9.0], c: 'magD' }, // the lip on the well (its front edge is MAG_LIP)
        { from: [5.75, 10.75, 7.0], to: [10.0, 16.75, 9.0], c: { all: 'mag', north: 'magD', south: 'magD' },
          deco: [
            { k: 'band', face: 'sides', at: [6.0, 16.5], to: [6.5, 11.0], c: 'mag' }, { k: 'band', face: 'sides', at: [9.25, 16.5], to: [9.75, 11.0], c: 'mag' },
            { k: 'band', face: 'sides', at: [7.0, 14.5], to: [8.75, 12.75], c: 'magW' },
            { k: 'band', face: 'sides', at: [7.0, 16.0], to: [8.25, 15.5], c: 'magW' },
            { k: 'band', face: 'ends', at: [MAG.z0 + 0.75, 16.75], to: [MAG.z1 - 0.75, 10.75], c: 'tan' }
          ] },
        // the cap: the back half of the top, a step higher (the top steps down to the front)
        { from: [7.25, 16.75, 7.0], to: [9.75, 17.5, 9.0], c: 'magD', deco: [{ k: 'band', face: 'up', at: [7.25, 7.25], to: [7.75, 8.75], c: 'mag' }] }
      ],
      // The flash (drawn FX back; its frames move it out): a hot core filling the box's mouth, a jet forward, and a
      // star of spikes out of the box (a cross and an X).
      flash: [
        { from: [MUZZLE - 3.0 + FX, BORE_Y - 1.9, 6.1], to: [MUZZLE + FX, BORE_Y + 1.9, 9.9], c: 'flashCore', glow: true },
        { from: [MUZZLE - 7.5 + FX, BORE_Y - 0.6, 7.4], to: [MUZZLE - 3.0 + FX, BORE_Y + 0.6, 8.6], c: 'flash', glow: true },
        { from: [MUZZLE - 2.2 + FX, BORE_Y - 4.6, 7.45], to: [MUZZLE - 1.0 + FX, BORE_Y + 4.6, 8.55], c: 'flash', glow: true },
        { from: [MUZZLE - 2.2 + FX, BORE_Y - 0.55, 3.4], to: [MUZZLE - 1.0 + FX, BORE_Y + 0.55, 12.6], c: 'flash', glow: true },
        { from: [MUZZLE - 2.0 + FX, BORE_Y - 3.8, 7.5], to: [MUZZLE - 1.2 + FX, BORE_Y + 3.8, 8.5], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZZLE - 1.6 + FX, BORE_Y, 8] } },
        { from: [MUZZLE - 2.0 + FX, BORE_Y - 0.5, 4.2], to: [MUZZLE - 1.2 + FX, BORE_Y + 0.5, 11.8], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZZLE - 1.6 + FX, BORE_Y, 8] } }
      ],
      // A smaller flash (the flicker's second size, and the only one aiming shows).
      flash2: [
        { from: [MUZZLE - 2.2 + FX, BORE_Y - 1.5, 6.5], to: [MUZZLE + FX, BORE_Y + 1.5, 9.5], c: 'flashCore', glow: true },
        { from: [MUZZLE - 5.0 + FX, BORE_Y - 0.45, 7.55], to: [MUZZLE - 2.2 + FX, BORE_Y + 0.45, 8.45], c: 'flash', glow: true },
        { from: [MUZZLE - 1.7 + FX, BORE_Y - 2.2, 7.6], to: [MUZZLE - 0.9 + FX, BORE_Y + 2.6, 8.4], c: 'flash', glow: true },
        { from: [MUZZLE - 1.6 + FX, BORE_Y - 2.6, 7.65], to: [MUZZLE - 1.0 + FX, BORE_Y + 2.6, 8.35], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZZLE - 1.3 + FX, BORE_Y, 8] } },
        { from: [MUZZLE - 1.6 + FX, BORE_Y - 0.35, 5.4], to: [MUZZLE - 1.0 + FX, BORE_Y + 0.35, 10.6], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZZLE - 1.3 + FX, BORE_Y, 8] } }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -76, 0], translation: [-4.2, 4.5, -1.6], scale: [0.56, 0.56, 0.56] },
      thirdperson: { rotation: [0, -90, 0], translation: [0, 1.5, -5.6], scale: [0.72, 0.72, 0.72] },
      gui: { rotation: [0, 180, -30], translation: [-0.4, 0.1, 0], scale: [0.4, 0.4, 0.4] },
      ground: { rotation: [0, 0, -45], translation: [-1, 7.5, 0], scale: [0.75, 0.75, 0.75] },
      fixed: { rotation: [0, 0, -45], translation: [-0.75, 0.75, -1], scale: [0.75, 0.75, 0.75] }
    }),
    states: {
      ads: ADS, // the right hand's (the left hand's is written below)
      sprint: { rotation: [-10, -46, 16], translation: [-4.4, 2.6, -2.6], scale: [0.52, 0.52, 0.52] }
    }
  })
  // The aim's models again, each hand its own translation (see ADS above): every part's and the full model's.
  for (const p of [...gun.parts, 'full']) write(`donating/models/item/${name}_${p}_ads.json`, { parent: `donating:item/${name}_${p}`, display: { firstperson_righthand: ADS, firstperson_lefthand: ADS_L } })
  // The shoulder pivot (the grip's top, behind the trigger): kicks turn the muzzle up about it.
  const SHOULDER = [14.3, 5.6, 8]
  const OUT = rig({ t: [-FX, 0, 0] }) // the flash moved out to the muzzle
  // Fire held (full-auto, 9 shots a second: one every 2-3 ticks, so the frames flicker at random each tick): a pose is
  // picked afresh every frame (pg.js firing: wobble off), so they share one heavy, steady kick (1.0 back, 2.0 degrees
  // up: a heavy gun climbs less than the Patriot) with a small jitter, and the flash (one of two sizes, or none for a
  // frame) is what flickers; the magazine trembles on top. k scales the kick (the aim's is smaller); aiming the magazine
  // stays still and only the small flash shows.
  const fire = (k, also = {}) => {
    const aimed = k < 1
    const big = aimed ? 'flash2' : 'flash'
    const shake = (dx, dy) => aimed ? {} : { mag: rig({ t: [dx, dy, 0] }) }
    const kick = (dx, up, yaw) => rig({ t: [(1.0 + dx) * k, 0.1 * k, 0], rot: [[[0, 0, 1], -(2.0 + up) * k], [[0, 1, 0], yaw * k]], pivot: SHOULDER })
    return [
      { ...also, show: [big], flash: OUT, flash2: OUT, gun: kick(0.08, 0.3, 0.25), ...shake(0.06, 0.05) },
      { ...also, show: ['flash2'], flash: OUT, flash2: OUT, gun: kick(-0.06, -0.25, -0.3), ...shake(-0.04, -0.03) },
      { ...also, show: [big], flash: OUT, flash2: OUT, gun: kick(0.1, 0.35, -0.15), ...shake(0.03, 0.06) },
      { ...also, flash: OUT, flash2: OUT, gun: kick(-0.08, -0.3, 0.1), ...shake(-0.05, 0) }
    ]
  }
  // The magazine's front lip in the well: it tips about it (the draw's check and the reload).
  const MAG_LIP = [5.75, 10.5, 8]
  // The draw (GunFx: 40 ticks when it's equipped; MG34.yml Weapon_Equip_Delay 40): the heavy gun swings up from below
  // the screen, muzzle down and rolled out, arrives at p 0.4 and dips under its weight (0.38-0.54); it rolls its top
  // toward you (0.48-0.58) and the magazine is checked: lifted a hair (0.55-0.6) and pressed home (a jolt at 0.645);
  // then it turns its left side to you (0.64-0.7) and the cocking handle is racked: back 0.70-0.76, held, let go
  // 0.80-0.815 (a snap); level again by 0.95. The draw sound follows it (tools\sounds\guns\lmg.js: the settle 0.84 s,
  // the magazine 1.2 s and 1.29 s, the handle 1.4 s, 1.52 s and 1.62 s).
  const draw = p => {
    const e = 1 - ease.out(Math.min(1, p / 0.4))
    const sag = ease.bump(p, 0.38, 0.54, 0.44)
    const top = ease.ramp(p, 0.48, 0.58) * (1 - ease.ramp(p, 0.64, 0.7)) // its top toward you: the magazine checked
    const side = ease.ramp(p, 0.64, 0.7) * (1 - ease.ramp(p, 0.84, 0.95)) // its left side toward you: the handle racked
    const lift = ease.bump(p, 0.55, 0.64, 0.6)
    const seat = ease.bump(p, 0.63, 0.7, 0.645)
    const pull = p < 0.8 ? ease.ramp(p, 0.7, 0.76) : 1 - ease.ramp(p, 0.8, 0.815)
    const snap = ease.bump(p, 0.81, 0.9, 0.83)
    return {
      gun: rig({
        t: [2.2 * e + 0.4 * snap, -11 * e - 0.6 * sag - 0.3 * seat + 0.8 * top + 0.6 * side, 0.7 * top + 0.5 * side],
        rot: [[[1, 0, 0], -16 * e + 15 * top - 14 * side], [[0, 1, 0], 7 * top + 10 * side], [[0, 0, 1], 30 * e - 1.6 * sag - 0.8 * seat + 1.2 * snap]],
        pivot: SHOULDER
      }),
      mag: rig({ t: [0, 0.9 * lift - 0.15 * seat, 0], rot: [[[0, 0, 1], 6 * lift]], pivot: MAG_LIP }),
      bolt: rig({ t: [4.4 * pull, 0, 0] })
    }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' reload: 80 ticks with rounds left, 96 from empty, when the
  // silent Firearm_Action's 8 + 8 come around it). The sounds are timed to it in MG34.yml (Start_Mechanics,
  // delayBeforePlay = 88p - 4, splitting the two clocks): mag_out 10 (p 0.16), mag_in 45 (p 0.555: the hook; its latch
  // 0.2 s and its slap 0.37 s later), charge 59 (p 0.72: caught at the back 0.22 s later, let go 0.4 s later). The gun
  // comes down a little and rolls its top toward you (0-0.1); the magazine's catch is pressed (a tug, 0.1-0.16), the
  // magazine tips forward off its front lip and is lifted up and away toward you (0.16-0.34); gone (0.34-0.44); a new
  // one comes back the same way tipped forward (0.44-0.55), hooks its front lip and rocks back into the well (0.55-0.6,
  // a jolt), slapped down (0.62-0.68); the gun turns its left side to you (0.64-0.72) and the cocking handle is racked:
  // back 0.72-0.77, held, let go 0.80-0.815 (a snap); level again by 0.96.
  // The left hand: below the screen (where the bag was), on the magazine, on the cocking handle from its left side.
  const magRig = (up, tip, tug, slap) => rig({ t: [-3 * up, 9 * up - 0.15 * slap, 7 * up], rot: [[[0, 0, 1], 24 * tip - 4 * tug], [[1, 0, 0], 30 * up]], pivot: MAG_LIP })
  const BELOW = then(LH, rig({ t: [3, -20, 6], rot: [[[1, 0, 0], -20]], pivot: [8.6, 13.2, 8] }))
  const onHandle = pull => rig({ t: [4.1 + 4.4 * pull - OL[0], 7.4 - OL[1], 10.25 + 1.4 - OL[2]], rot: [[[1, 0, 0], -90]], pivot: OL })
  const reload = p => {
    const a = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.62, 0.68)) // its top toward you: the magazine changed
    const b = ease.ramp(p, 0.64, 0.72) * (1 - ease.ramp(p, 0.86, 0.96)) // its left side toward you: the handle racked
    const tug = ease.bump(p, 0.1, 0.16, 0.13)
    const seat = ease.bump(p, 0.58, 0.66, 0.6)
    const slap = ease.bump(p, 0.62, 0.68, 0.64)
    let tip = 0
    let up = 0
    if (p < 0.4) { tip = ease.ramp(p, 0.16, 0.24); up = ease.ramp(p, 0.2, 0.34) } else { up = 1 - ease.ramp(p, 0.44, 0.55); tip = 1 - ease.ramp(p, 0.54, 0.6) }
    const pull = p < 0.8 ? ease.ramp(p, 0.72, 0.77) : 1 - ease.ramp(p, 0.8, 0.815)
    const snap = ease.bump(p, 0.81, 0.9, 0.83)
    // the left hand: up to the magazine (0.02-0.1), with it off and back on, slaps it down (0.62-0.68), down the left
    // side to the cocking handle (0.66-0.72), racks it (0.72-0.815), away (0.82-0.94)
    let place
    if (p < 0.1) place = hands.mix(BELOW, LH, ease.ramp(p, 0.02, 0.1))
    else if (p < 0.66) place = then(then(LH, magRig(up, tip, tug, slap)), rig({ t: [0, -0.8 * slap, 0] }))
    else if (p < 0.72) place = hands.mix(LH, onHandle(0), ease.ramp(p, 0.66, 0.72))
    else if (p < 0.82) place = onHandle(pull)
    else place = hands.mix(onHandle(0), then(onHandle(0), rig({ t: [3, -15, 4] })), ease.ramp(p, 0.82, 0.94))
    return {
      gun: rig({
        t: [0.3 * tug + 0.4 * snap, -0.8 * a + 0.8 * b - 0.4 * seat - 0.3 * slap, 1.4 * a + 0.6 * b],
        rot: [[[1, 0, 0], 20 * a - 16 * b - 2 * slap], [[0, 1, 0], 10 * a + 12 * b], [[0, 0, 1], -6 * a - 2 * b - 1.5 * seat - 1 * slap + 1.5 * snap]],
        pivot: [9, 6, 8]
      }),
      mag: magRig(up, tip, tug, slap),
      bolt: rig({ t: [4.4 * pull, 0, 0] }),
      lhand: hands.pose(LH, place),
      show: p > 0.015 && p < 0.95 ? ['lhand'] : [],
      hide: p > 0.34 && p < 0.44 ? ['mag'] : []
    }
  }
  const AIMED = { hide: ['stock'] }
  // Default: the draw while its cooldown runs, else fire held / the rest pose.
  const drawn = gun.cooldown('', 40, draw)
  drawn.fallback = gun.firing('', fire(1))
  return {
    11: gun.byContext('', drawn),
    1011: gun.byContext('ads', gun.firing('ads', fire(0.45, AIMED), AIMED)),
    2011: gun.byContext('sprint', gun.composite('sprint')),
    3011: gun.byContext('', gun.cooldown('', 96, reload))
  }
}
