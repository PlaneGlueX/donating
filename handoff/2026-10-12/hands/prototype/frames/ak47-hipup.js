// The rifle slot (WeaponMechanics weapons\assault_rifles\AK_47.yml, the strongest gun: full-auto 10 shots a second,
// 30 rounds; skins Default 5, Scope +1000, Sprint +2000, Reload +3000). A recreation of Pixel Gun 3D's scoped AK, the
// "AK-48" in its current look (the owner: the sold guns remade as PG3D's; 2026-10-06 at the Photon Shotgun's level of
// detail; drawn by hand from the wiki's pictures, nothing taken from the game), painted with pg.js's PG style (density
// 4, material ramps, bevels, seams and decals): a black receiver with a red side stripe, a vent plate and rivets; a
// thick barrel bar striped red and steel, ending in a stepped front sight; a black handguard with steel bands and studs;
// a big grenade launcher under it (black front cap with its bore, a grey tube banded red and white, the breech and its
// trigger) with the laser on its top front and the red beam; an ACOG on clamps (a hollow tube: aiming looks through it
// at a red dot; its blue lens with no back face, so from inside every face of it is culled; red side bars, a black
// turret, a blue ocular rim); a banana magazine in four steps, black with white and grey ribs; a ribbed black grip; a
// black slab stock with a grey inset frame and a stepped butt. Cops of difficulty 4 hold it (third person matters).
// Frames (pg.js): drawn (GunFx's 30-tick draw cooldown) it rises from below and levels out; fire held flickers a
// muzzle flash and kicks (and the charging handle cycles); the reload rocks the magazine out forward, a new one in,
// then pulls the charging handle on the right (the gun rolls so it shows). No empty pose (no No_Ammo state:
// WeaponMechanics puts it over Scope and Sprint).
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the scope's axis, y = SY. z+ is the gun's left
// (the side first person shows), z- its right (the ejection port and the charging handle).
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_ak47'
  const SY = 10.2
  // A hollow tube along x (the scope's sections): four walls around an opening, so aiming looks through it. deco: decals
  // per wall (the outer face only: left 'south', right 'north').
  const tube = (x0, x1, [y0, y1, z0, z1], [yi0, yi1, zi0, zi1], c, more = {}, deco = {}) => [
    { from: [x0, y0, zi1], to: [x1, y1, z1], c, ...more, deco: deco.left }, // left (z+), full height: one face from the side
    { from: [x0, y0, z0], to: [x1, y1, zi0], c, ...more, deco: deco.right }, // right (z-)
    { from: [x0, yi1, zi0], to: [x1, y1, zi1], c, ...more }, // top
    { from: [x0, y0, zi0], to: [x1, yi0, zi1], c, ...more } // bottom
  ]
  const K = { c: { all: 'recv', up: 'recvT' } } // black parts: a lighter top
  const ST = { c: { all: 'gm', up: 'gmL' } } // steel
  // The scope's tube: the same black under keys of its own, which skins never recolor (aiming looks through it).
  const SCOPE = { c: { all: 'scope', up: 'scopeT' } }
  const GRIP = { angle: 20, axis: 'z', origin: [17.6, 5.0, 8] }
  // Decal helpers (model units; on north/south faces [x, y], on up/down [x, z], on east/west [z, y]).
  // A stripe across a side (inside the outline, so its own lit top row and dark bottom row show).
  const band = (x0, x1, y0, y1, c, face) => ({ k: 'band', at: [x0, y1], to: [x1, y0], c, ...(face ? { face } : {}) })
  // A ring of color c around a box along x, on its sides and its top and bottom (inside the outline).
  const ring = (b, x0, x1, c) => [band(x0, x1, b.from[1] + 0.25, b.to[1] - 0.25, c), { k: 'band', face: 'flats', at: [x0, b.from[2] + 0.25], to: [x1, b.to[2] - 0.25], c }]
  const stud = (x, y, c = 'gmL', face) => ({ k: 'rivets', at: [x, y + 0.5], to: [x + 0.5, y], n: 1, size: 2, c, ...(face ? { face } : {}) })
  const hole = (a0, b0, a1, b1, face) => ({ k: 'holes', at: [a0, b0], to: [a1, b1], pitch: [1, 1], ...(face ? { face } : {}) })
  // A magazine step: black, a rib across both sides near its top (a white line over two grey rows), the front face grey
  // (the spine); turned by angle about origin [x, y] (the back corner above it).
  const magSeg = (x0, x1, y0, y1, angle, origin) => ({
    from: [x0, y0, 7.0], to: [x1, y1, 9.0], c: { all: 'magK', west: 'magG' },
    ...(origin ? { rot: { angle, axis: 'z', origin: [origin[0], origin[1], 8] } } : {}),
    deco: [band(x0 + 0.5, x1 - 0.25, y1 - 1.0, y1 - 0.5, 'magG'), band(x0 + 1.25, x1 - 0.25, y1 - 0.5, y1 - 0.25, 'magW')]
  })

  // ---------- the boxes ----------
  // The barrel bar: barrel and gas tube as one thick black bar, striped red and steel down each side and underneath
  // (end to end, no gaps), two light lines along its top. Its top stays under the aim's limit (y 8.25).
  const BAR = { from: [-4.75, 6.25, 7.0], to: [3.5, 8.25, 9.0], c: { all: 'recv', up: 'recvT' }, split: { z: [8] } }
  const barStripes = [[2.25, 3.5, 'red'], [1.0, 2.25, 'gmL'], [-0.25, 1.0, 'red'], [-1.5, -0.25, 'gmL'], [-2.75, -1.5, 'red'], [-4.0, -2.75, 'gmL']]
  BAR.deco = [
    ...barStripes.map(([a, b, c]) => band(a, b, 6.75, 7.75, c)),
    ...barStripes.map(([a, b, c]) => ({ k: 'band', face: 'down', at: [a, 7.25], to: [b, 8.75], c })),
    { k: 'band', face: 'up', at: [-4.5, 7.25], to: [3.5, 7.5], c: 'gmL' },
    { k: 'band', face: 'up', at: [-4.5, 8.5], to: [3.5, 8.75], c: 'gmL' }
  ]
  // The grenade launcher's tube: light grey, one piece (no seams; little grain), banded red, red, white, white.
  const GLT = { from: [-0.25, 2.5, 6.75], to: [7.25, 5.25, 9.25], c: 'gl', grain: 0.05 }
  GLT.deco = [...ring(GLT, 0.5, 1.0, 'red'), ...ring(GLT, 1.5, 2.0, 'red'), ...ring(GLT, 3.0, 3.5, 'white'), ...ring(GLT, 5.5, 6.0, 'white')]

  // ---------- hands (HANDS PROTOTYPE) ----------
  // The right glove on the grip: the shared hand's grip frame (top centre, raked like the grip: 20 degrees) at the
  // grip's top centre. The left hand (shown only by the reload's frames): round the magazine's second step.
  const { then } = pg
  const OR = [-8, 16, 8]; const OL = [8, 12, 8]
  const RH = rig({ t: [17.54 - OR[0], 5.24 - OR[1], 8 - OR[2]], rot: [[[0, 0, 1], 20]], pivot: OR })
  const LH = then(rig({ t: [14 - OL[0], 2.25 - OL[1], 8 - OL[2]] }), rig({ rot: [[[0, 0, 1], -6]], pivot: [15.5, 3.25, 8] }))
  const gun = pgGun(name, {
    hands: { right: { at: RH }, left: { at: LH, shown: false }, leftTree: false },
    style: 'pg',
    density: 4,
    palette: {
      recv: [38, 39, 44], recvT: [64, 67, 74], scope: [38, 39, 44], scopeT: [64, 67, 74], gm: [86, 91, 100], gmD: [46, 49, 58], gmL: [122, 128, 138], edge: [214, 222, 230],
      red: [226, 24, 20], redB: [255, 74, 60], dot: [255, 60, 60], white: [244, 246, 248], gl: [172, 174, 178],
      beam: [255, 32, 32], lens: [46, 120, 216], lensB: [110, 176, 248],
      magG: [150, 152, 156], magW: [240, 242, 244], magK: [22, 24, 28], gripP: [112, 118, 128],
      railL: { of: 'edge', f: 0.78 }, bore: [10, 10, 12], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: {
      recv: 'dark', recvT: 'dark', scope: 'dark', scopeT: 'dark', magK: 'dark',
      gm: 'metal', gmD: 'metal', gmL: 'metal', edge: 'metal', gl: 'metal', magG: 'metal', gripP: 'metal',
      red: 'paint', redB: 'paint', white: 'paint', magW: 'paint',
      lens: 'glass', lensB: 'glass', dot: 'glow', beam: 'glow', flash: 'glow', flashCore: 'glow', bore: 'flat'
    },
    parts: {
      // Ahead of the scope and above the aim's limit (the front sight, the muzzle, the handguard's top cover): shown
      // everywhere but aimed (in the scope's view they'd sit on the dot; the scope's walls hide where they were).
      fore: [
        // The front sight: a stair of three steps up toward the muzzle to a tall post, a light glint panel on its back.
        { from: [-7.0, 6.25, 7.25], to: [-6.25, 10.5, 8.75], c: { all: 'recv', up: 'recvT', east: 'gmL' } },
        { from: [-6.25, 6.25, 7.0], to: [-5.5, 9.75, 9.0], ...K, deco: [{ k: 'slots', face: 'sides', at: [-6.25, 9.25], to: [-5.5, 8.5], n: 1 }] },
        { from: [-5.5, 6.25, 7.0], to: [-4.75, 9.0, 9.0], ...K },
        // The muzzle: a black lip with the square bore in its end.
        { from: [-7.5, 6.5, 7.25], to: [-7.0, 9.0, 8.75], ...K, deco: [hole(7.75, 8.0, 8.25, 7.5, 'west')] },
        // The handguard's top cover: steel, grooves across its top.
        { from: [4.0, 8.75, 7.25], to: [8.75, 9.5, 8.75], ...ST, deco: [{ k: 'slots', face: 'up', at: [4.25, 7.5], to: [8.5, 8.5], dir: 'v', n: 5 }] }
      ],
      body: [
        BAR,
        // The handguard: black, studs in two rows of three on each side, steel bands at both ends.
        { from: [4.0, 5.25, 6.75], to: [8.75, 8.75, 9.25], ...K, deco: [{ k: 'rivets', at: [4.5, 7.75], to: [8.25, 7.25], n: 3, size: 2, c: 'gm' }, { k: 'rivets', at: [4.5, 6.5], to: [8.25, 6.0], n: 3, size: 2, c: 'gm' }, { k: 'slots', face: 'up', at: [4.25, 7.0], to: [8.5, 9.0], n: 2 }] },
        { from: [3.5, 5.0, 6.5], to: [4.0, 8.75, 9.5], ...ST, outline: false, deco: [{ k: 'rivets', face: 'ends', at: [6.75, 8.5], to: [9.25, 8.0], n: 2, size: 2, c: 'gmL' }, { k: 'slots', face: 'ends', at: [6.75, 6.75], to: [9.25, 5.25], n: 2 }] },
        { from: [8.75, 5.0, 6.5], to: [9.25, 8.75, 9.5], ...ST, outline: false, deco: [{ k: 'rivets', face: 'ends', at: [6.75, 8.5], to: [9.25, 8.0], n: 2, size: 2, c: 'gmL' }, { k: 'slots', face: 'ends', at: [6.75, 6.75], to: [9.25, 5.25], n: 2 }] },
        // The grenade launcher: the black front cap (its bore in a steel frame), the tube, the breech with a latch,
        // the trigger housing with its guard and trigger, and the mount up to the barrel (two screws).
        { from: [-2.5, 2.25, 6.5], to: [-0.25, 5.5, 9.5], ...K, split: { x: [-1.25] }, deco: [{ k: 'slots', face: 'east', at: [7.0, 4.75], to: [9.0, 3.0], n: 2 },{ k: 'inset', face: 'west', at: [7.0, 5.0], to: [9.0, 2.75], c: 'gm' }, hole(7.5, 4.5, 8.5, 3.25, 'west'), { k: 'rivets', at: [-2.25, 3.0], to: [-0.5, 2.5], n: 2, c: 'gm' }] },
        GLT,
        { from: [7.25, 2.75, 6.75], to: [8.75, 5.5, 9.25], ...ST, deco: [stud(7.75, 4.25, 'gmL', 'south')] },
        { from: [8.75, 3.5, 7.25], to: [11.25, 5.0, 8.75], c: 'gl', deco: [{ k: 'slots', at: [9.0, 4.75], to: [11.0, 3.75], n: 1 }] },
        { from: [9.0, 2.75, 7.5], to: [11.0, 3.0, 8.5], c: 'gm', outline: false },
        { from: [9.0, 3.0, 7.5], to: [9.25, 3.5, 8.5], c: 'gm', outline: false },
        { from: [10.0, 3.0, 7.75], to: [10.5, 3.5, 8.25], c: 'gmL', outline: false },
        { from: [0.0, 5.25, 7.25], to: [3.5, 6.25, 8.75], ...ST, deco: [stud(0.5, 6.0), stud(2.5, 6.0)] },
        // The laser on the launcher's top front (left), its emitter and the beam (always on).
        { from: [-2.0, 5.5, 8.5], to: [0.0, 6.5, 9.5], ...K, deco: [band(-1.0, -0.5, 5.5, 6.5, 'gm'), { k: 'band', face: 'up', at: [-1.0, 8.5], to: [-0.5, 9.5], c: 'gm' }] },
        { from: [-2.05, 5.75, 8.75], to: [-2.0, 6.25, 9.25], c: 'redB', mat: 'glow', glow: true, dirs: ['west'] },
        { from: [-12.6, 5.875, 8.875], to: [-2.05, 6.125, 9.125], c: 'beam', glow: true },
        // The receiver: black and chunky; a steel rail on top (two light lines, a step dimmer than the glints: they sit
        // under the eyepiece in the scope's view; no outline, so the 0.5-tall rail stays steel, not ink) ending at a
        // rear latch with a glint; on the left a grey vent plate (four dark vents), the red stripe and two chunky glint
        // blocks above it; studs at the corners; on the right a grey vent plate (two vents) at the front, the red stripe
        // behind it, the ejection port above the stripe (the charging handle at its front), a glint block behind the
        // port and the selector lever under the stripe.
        {
          from: [9.25, 5.0, 6.5], to: [19.5, 8.25, 9.5], ...K, split: { x: [12.75, 16.5], z: [8] },
          deco: [
            { k: 'inset', face: 'south', at: [9.5, 8.0], to: [12.5, 5.25], c: 'gm' }, { k: 'inset', face: 'north', at: [9.5, 8.0], to: [12.25, 6.0], c: 'gm' }, hole(10.0, 7.5, 10.75, 6.75, 'north'), hole(11.0, 7.5, 11.75, 6.75, 'north'),
            hole(10.0, 7.5, 10.75, 6.75, 'south'), hole(11.25, 7.5, 12.0, 6.75, 'south'), hole(10.0, 6.5, 10.75, 5.75, 'south'), hole(11.25, 6.5, 12.0, 5.75, 'south'),
            // the red stripe behind the vent plate on both sides (on the right under the ejection port)
            band(13.0, 19.25, 6.75, 7.5, 'red', 'south'), band(12.5, 19.25, 6.25, 7.0, 'red', 'north'),
            // the white glint blocks under the rail (the right one behind the port)
            band(13.0, 15.25, 7.75, 8.0, 'edge', 'south'), band(15.5, 18.5, 7.5, 8.0, 'edge', 'south'), band(16.5, 19.0, 7.25, 8.0, 'edge', 'north'),
            stud(13.0, 5.5, 'gmL', 'south'), stud(18.75, 5.5), stud(18.75, 7.75 - 0.25, 'gmL', 'south'),
            { k: 'inset', face: 'north', at: [12.5, 8.0], to: [16.25, 7.25], c: 'gm' },
            { k: 'slots', face: 'down', at: [9.5, 7.0], to: [12.5, 9.0], dir: 'v', n: 3 },
            { k: 'slots', face: 'ends', at: [6.75, 7.75], to: [9.25, 5.5], n: 2 }
          ]
        },
        { from: [9.5, 8.25, 7.0], to: [18.0, 8.75, 9.0], c: { all: 'gmL', up: 'gm' }, outline: false, deco: [{ k: 'band', face: 'up', at: [9.5, 7.25], to: [18.0, 7.5], c: 'railL' }, { k: 'band', face: 'up', at: [9.5, 8.5], to: [18.0, 8.75], c: 'railL' }] },
        { from: [18.0, 8.25, 7.25], to: [19.5, 9.0, 8.75], ...K, deco: [{ k: 'band', face: 'up', at: [18.5, 7.75], to: [19.25, 8.25], c: 'gmL' }] },
        { from: [11.5, 5.5, 6.25], to: [17.5, 6.25, 6.5], c: 'gmL', dirs: ['north', 'up', 'down', 'east', 'west'] }, // the selector lever (right)
        // The trigger and its guard, between the magazine and the grip.
        { from: [15.75, 4.25, 7.75], to: [16.25, 5.0, 8.25], c: 'gmL', outline: false },
        { from: [15.5, 3.75, 7.5], to: [16.75, 4.0, 8.5], c: 'recv', outline: false },
        // The grip, raked back: four grey ribs a side, palm steps on its back, a steel cap.
        { from: [16.5, 0.5, 7.0], to: [18.75, 5.25, 9.0], ...K, rot: GRIP, deco: [1.25, 2.25, 3.25, 4.25].map(y => band(16.75, 18.5, y, y + 0.5, 'gripP')) },
        ...[1.0, 2.25, 3.5].map(y => ({ from: [18.75, y, 7.25], to: [19.0, y + 0.5, 8.75], c: 'recv', outline: false, rot: GRIP })),
        { from: [16.25, 0.0, 6.75], to: [19.0, 0.5, 9.25], ...ST, rot: GRIP },
        // The ACOG: clamps on the rail, the objective bell with the blue lens, the body, the eyepiece (its rear rim blue);
        // the red dot and its post inside (aiming looks through the tube); red bars along its sides, a black turret on
        // top with a red cap (the red bars run unbroken along both sides, like the reference).
        { from: [10.5, 8.25, 6.75], to: [11.5, 9.0, 9.25], ...ST, deco: [{ k: 'rivets', at: [10.75, 8.75], to: [11.25, 8.5], n: 1, c: 'gmL' }] },
        { from: [13.0, 8.25, 6.75], to: [14.0, 9.0, 9.25], ...ST, deco: [{ k: 'rivets', at: [13.25, 8.75], to: [13.75, 8.5], n: 1, c: 'gmL' }] },
        ...tube(9.2, 10.0, [SY - 1.45, SY + 1.45, 6.55, 9.45], [SY - 1.05, SY + 1.05, 6.95, 9.05], SCOPE.c),
        ...tube(10.0, 14.6, [SY - 1.2, SY + 1.2, 6.8, 9.2], [SY - 0.85, SY + 0.85, 7.15, 8.85], SCOPE.c, {}, {
          left: [{ ...band(10.5, 14.25, 10.0, 10.75, 'red'), face: 'south' }, { k: 'slots', face: 'south', at: [10.5, 9.75], to: [14.25, 9.25], n: 1 }],
          right: [{ ...band(10.5, 14.25, 10.0, 10.75, 'red'), face: 'north' }]
        }),
        ...tube(14.6, 15.4, [SY - 0.95, SY + 0.95, 7.05, 8.95], [SY - 0.75, SY + 0.75, 7.25, 8.75], SCOPE.c),
        // the blue ocular: a rim on the eyepiece's rear faces, round the opening (0.02 proud; the hole stays open)
        ...[[SY - 0.95, SY + 0.95, 8.75, 8.95], [SY - 0.95, SY + 0.95, 7.05, 7.25], [SY + 0.75, SY + 0.95, 7.25, 8.75], [SY - 0.95, SY - 0.75, 7.25, 8.75]].map(([y0, y1, z0, z1]) =>
          ({ from: [15.4, y0, z0], to: [15.42, y1, z1], c: 'lens', glow: true, pat: 'flat', dirs: ['east'] })),
        { from: [8.7, SY - 1.05, 6.95], to: [9.2, SY + 1.05, 9.05], c: 'lens', glow: true, dirs: ['west', 'north', 'south', 'up', 'down'] },
        { from: [8.62, SY + 0.25, 7.35], to: [8.66, SY + 0.7, 7.85], c: 'lensB', glow: true, dirs: ['west'] },
        { from: [9.5, SY - 0.15, 7.85], to: [9.7, SY + 0.15, 8.15], c: 'dot', glow: true }, // the red dot (its own key: skins never recolor it)
        { from: [9.55, SY - 1.05, 7.95], to: [9.65, SY - 0.15, 8.05], c: 'bore', outline: false },
        { from: [11.5, 11.25, 7.5], to: [12.75, 12.0, 8.5], c: { all: 'recv', up: 'redB' } },
        // The stock: a hinge block (a steel pin), a black slab (a grey inset frame round a dark window), the bottom rail
        // slanting down to the butt (a stepped top, a grooved steel pad).
        { from: [19.5, 4.5, 7.0], to: [20.5, 8.5, 9.0], ...K, deco: [stud(19.75, 6.25)] },
        { from: [20.5, 5.0, 7.0], to: [26.5, 8.25, 9.0], ...K, split: { x: [23.5] }, deco: [{ k: 'inset', at: [21.0, 7.75], to: [26.0, 5.5], c: 'gm' }, { k: 'inset', at: [22.0, 7.0], to: [25.0, 6.25], c: 'recv' }] },
        // (the lower part: one turned block from the hinge down to the butt, a step narrower than the slab, under it)
        { from: [20.5, 4.5, 7.25], to: [27.0, 7.0, 8.75], ...K, rot: { angle: -17, axis: 'z', origin: [20.5, 5.0, 8] }, deco: [band(21.0, 26.5, 4.75, 5.0, 'gmD')] },
        { from: [26.5, 2.75, 7.0], to: [27.5, 7.5, 9.0], c: { all: 'recv', up: 'recvT', east: 'gm' }, split: { y: [5.0] }, deco: [{ k: 'slots', face: 'east', at: [7.25, 7.25], to: [8.75, 3.0], n: 4 }] },
        { from: [26.5, 7.5, 7.0], to: [27.25, 8.5, 9.0], ...K }
      ],
      // The charging handle on the right, at the front of the ejection port (pulled back +x along it).
      bolt: [
        { from: [12.75, 7.25, 6.0], to: [13.25, 7.75, 6.75], c: 'gmL' },
        { from: [12.5, 7.0, 5.25], to: [13.75, 8.25, 6.0], c: { all: 'gm', up: 'gmL', west: 'gmL' }, deco: [{ k: 'slots', face: 'north', at: [12.75, 8.0], to: [13.5, 7.25], dir: 'v', n: 2 }] }
      ],
      // The banana magazine: four black steps curving forward (0, -6, -12, -18 degrees), each with a rib across its
      // sides (a grey band, a white line over its rear part, then black), a grey spine down the front face, a wider
      // floor plate. Each step turns about the back corner of the one above it (snapped to the grid, inside it); the
      // curve clears the launcher's trigger housing by 0.3 through the whole reload (rock and drop).
      mag: [
        magSeg(12.5, 15.5, 3.25, 5.0, 0, null),
        magSeg(12.5, 15.5, 1.25, 3.25, -6, [15.5, 3.25]),
        magSeg(12.25, 15.25, -0.75, 1.25, -12, [15.25, 1.25]),
        magSeg(11.75, 14.75, -2.75, -0.75, -18, [14.75, -0.75]),
        { from: [11.25, -3.25, 6.75], to: [15.0, -2.75, 9.25], c: 'magK', ink: 'gm', rot: { angle: -18, axis: 'z', origin: [14.75, -0.75, 8] }, deco: [{ k: 'slots', face: 'down', at: [11.5, 7.25], to: [14.75, 8.75], n: 1 }] }
      ],
      flash: [
        { from: [-9.4, 6.6, 6.8], to: [-7, 8.9, 9.2], c: 'flashCore', glow: true },
        { from: [-13.4, 7.3, 7.55], to: [-9.4, 8.2, 8.45], c: 'flash', glow: true },
        { from: [-8.8, 8.9, 7.55], to: [-7.6, 11.2, 8.45], c: 'flash', glow: true },
        { from: [-8.8, 4.3, 7.55], to: [-7.6, 6.6, 8.45], c: 'flash', glow: true },
        { from: [-8.8, 7.3, 4.6], to: [-7.6, 8.2, 6.8], c: 'flash', glow: true },
        { from: [-8.8, 7.3, 9.2], to: [-7.6, 8.2, 11.4], c: 'flash', glow: true }
      ],
      // A second flash (an X), so the flicker changes shape.
      flash2: [
        { from: [-9, 6.85, 7.05], to: [-7, 8.65, 8.95], c: 'flashCore', glow: true },
        { from: [-12, 7.35, 7.6], to: [-9, 8.15, 8.4], c: 'flash', glow: true },
        { from: [-8.5, 7.35, 4.8], to: [-7.5, 8.15, 11.2], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-8, 7.75, 8] } },
        { from: [-8.5, 4.55, 7.6], to: [-7.5, 10.95, 8.4], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-8, 7.75, 8] } }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -82, 0], translation: [-4.0, 6.6, -2.6], scale: [0.68, 0.68, 0.68] },
      thirdperson: { rotation: [0, -90, 0], translation: [0, 1.5, -5.5], scale: [0.8, 0.8, 0.8] },
      gui: { rotation: [0, 180, -40], translation: [-0.2, 0.6, 0], scale: [0.47, 0.47, 0.47] },
      ground: { rotation: [0, 0, -45], translation: [-1, 8.25, 0], scale: [0.9, 0.9, 0.9] },
      fixed: { rotation: [0, 0, -45], translation: [-0.5, 1, -1], scale: [0.9, 0.9, 0.9] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 15.4, rearDepth: 0.8, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [21.5, -25.25, 0], translation: [-10.6, 2.84, 1.38], scale: [0.72, 0.72, 0.72] }
    }
  })

  // The shoulder pivot (the grip's top, behind the trigger): kicks turn the muzzle up about it.
  const SHOULDER = [17.6, 5.4, 8]
  // Fire held (no cooldown: a full-auto gun's shots come every 2 ticks, so the frames flicker at random each tick):
  // a flash (one of two shapes, or none for a tick), the gun pushed back with its muzzle up and a little yaw, the
  // handle cycling. k scales the kick (the aim's is smaller); aiming the handle stays put (it's in view there, beside
  // the scope, and would flicker), the front sight and muzzle are hidden (in the scope's view) and only the X flash
  // shows (the star's top spike would cross the dot). A bit more than the SMG's (its push 0.2-0.55 at a smaller
  // scale): the shoulder pivot is far behind the muzzle, so the same angles already lift the muzzle about twice as far.
  const FIRE = (k, big = 'flash') => {
    const cycle = v => k < 1 ? {} : { bolt: rig({ t: [v, 0, 0] }) }
    const hide = k < 1 ? { hide: ['fore'] } : {}
    // A pose is picked afresh every frame (pg.js firing: wobble off), so they share one kick (0.7 back, 2.8 degrees
    // up) with a small jitter; the flash is what flickers.
    const kick = (dx, up, yaw) => rig({ t: [(0.7 + dx) * k, 0.14 * k, 0], rot: [[[0, 0, 1], -(2.8 + up) * k], [[0, 1, 0], yaw * k]], pivot: SHOULDER })
    return [
      { show: [big], gun: kick(0.08, 0.4, 0.3), ...cycle(2.6), ...hide },
      { show: ['flash2'], gun: kick(-0.06, -0.3, -0.4), ...cycle(1.4), ...hide },
      { show: [big], gun: kick(0.1, 0.6, -0.2), ...cycle(2.8), ...hide },
      { gun: kick(-0.12, -0.5, 0.1), ...cycle(0.6), ...hide }
    ]
  }
  // The draw (GunFx: a 30-tick cooldown on equip): the gun comes up fast from below, muzzle down and rolled out,
  // slows as it levels out (by two thirds of the way); a small settle at the end.
  const draw = p => {
    const k = 1 - ease.out(Math.min(1, p / 0.65))
    const settle = ease.bump(p, 0.75, 1, 0.85)
    return { gun: rig({ t: [2 * k, -9 * k - 0.3 * settle, 0], rot: [[[0, 0, 1], 28 * k + 1.5 * settle], [[1, 0, 0], -20 * k]], pivot: SHOULDER }) }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' reload, 57 ticks; 73 from empty, when the Firearm_Action
  // adds its 8 + 8). Two poses: for the magazine the gun comes up, turns its muzzle a little inward and rolls its
  // bottom toward you; the magazine rocks forward about its front top and drops out along its own axis, is gone, a
  // new one rises along the same path and rocks back in (a jolt as it seats). Then the gun rolls the other way (over
  // 8 ticks) so the charging handle on the right sticks up, the handle is pulled back and let go (a snap); the gun
  // settles back.
  // The sounds are timed to it in AK_47.yml (Start_Mechanics, delayBeforePlay in ticks after the reload starts):
  // mag_out 4 (p 0.12, the rock out), mag_in 33 (p 0.57, the seat), bolt 43 (p 0.725, the pull; its second click
  // 2.6 ticks later, the release at p 0.775-0.79). With rounds left the frames run over 57 ticks; from empty over 73
  // and the sounds start 8 ticks later (after the Firearm_Action's open): the delays split the difference (65p - 4),
  // each within about 3 ticks of its frame either way.
  const MAG_PIVOT = [12.5, 5.0, 8] // the magazine's front top
  const ROCK = -25 // degrees: the magazine's bottom forward
  const AXIS = [Math.sin(ROCK * Math.PI / 180), -Math.cos(ROCK * Math.PI / 180), 0] // down its own (rocked) axis
  // The two poses: t (model units), then turns about x (the roll first, about the barrel: top toward you +), y (muzzle
  // inward +) and z (muzzle down +). The magazine pose lifts the gun higher and rolls it further (the magazine sits
  // under the grip's front, low on the screen: lower, its rock and drop would happen below the screen's edge). In the
  // handle pose the gun also turns across the screen (y 25), so its length reads (seen end-on behind the scope it was
  // a black pipe), and its top rolls toward you so the handle sticks up.
  const MAGPOSE = { t: [0, 4.5, 2.5], y: 10, x: -40, z: -6 }
  const BOLTPOSE = { t: [0, 0.5, 1], y: 25, x: 45, z: -2 }
  // ---------- the reload with the left hand (HANDS PROTOTYPE) ----------
  // The same gun moves and the same sound ticks (mag_out 0.12, mag_in 0.57, bolt 0.725) as before; now the left hand
  // does the work. It rises from below the screen to the magazine (0.03-0.12; the bag has dropped out of view by then:
  // GunFx's bag clock), rocks it out and pulls it down out of view (0.12-0.30), comes back with a fresh one (0.34-0.50),
  // rocks it in and slaps it home (0.50-0.62), lets go, reaches over the top to the charging handle as the gun rolls
  // (0.62-0.72), pulls it back (0.725-0.755), lets it snap forward (0.775-0.79) and drops out of view (0.80-0.92).
  // A hand's pose is an absolute placement (hand model -> gun model units) turned into pose.lhand (applied on top of
  // the hand's at): pose.lhand = place o at^-1.
  const inv = m => { const q = [-m.q[0], -m.q[1], -m.q[2], m.q[3]]; const t = pg.then({ t: m.t, q: [0, 0, 0, 1] }, { t: [0, 0, 0], q }).t.map(v => -v); return { t, q } }
  const nlerp = (a, b, k) => { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; const s2 = d < 0 ? -1 : 1; const q = a.map((v, i) => v + (s2 * b[i] - v) * k); const n = Math.hypot(...q); return q.map(v => v / n) }
  const mixRig = (A, B, k) => ({ t: A.t.map((v, i) => v + (B.t[i] - v) * k), q: nlerp(A.q, B.q, k) })
  const LH_INV = inv(LH)
  const asPose = place => then(LH_INV, place)
  const magRig = (rock, d) => rig({ t: [AXIS[0] * d, AXIS[1] * d, 0], rot: [[[0, 0, 1], ROCK * rock]], pivot: MAG_PIVOT })
  const onMag = (rock, d) => then(LH, magRig(rock, d))
  // below the screen (the hand's start and end): down along the magazine and toward the camera
  const BELOW = then(LH, rig({ t: [1.0, -13, 5], rot: [[[1, 0, 0], -25]], pivot: [14, 2.25, 8] }))
  // round the charging handle's knob (13.1, 7.6, 5.6) from above: the C's axis along the handle (-z), the back of the
  // hand up, the wrist toward the camera (+z); pull: the knob's travel back (+x)
  const KNOB = [13.1, 7.35, 5.3]
  const onKnob = pull => rig({ t: [KNOB[0] - OL[0] + 2.8 * pull, KNOB[1] - OL[1], KNOB[2] - OL[2]], rot: [[[1, 0, 0], -90]], pivot: OL })
  // off the knob after the snap: back and up a little, then down out of view
  const OFFKNOB = then(onKnob(1), rig({ t: [1.2, 1.4, 1.5] }))
  const AWAY = then(onKnob(1), rig({ t: [3, -12, 10] }))
  const reload = p => {
    const a = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.58, 0.72)) // the magazine pose
    const b = ease.ramp(p, 0.58, 0.72) * (1 - ease.ramp(p, 0.86, 0.98)) // the handle pose
    const seat = ease.bump(p, 0.56, 0.62, 0.58)
    // The magazine: rock out 0.12-0.17, drop 0.17-0.30, gone 0.30-0.34 (the new one), rise 0.34-0.45, held 0.45-0.50, rock in 0.50-0.56.
    let rock = 0
    let drop = 0
    if (p < 0.3) { rock = ease.ramp(p, 0.12, 0.17); drop = ease.ramp(p, 0.17, 0.3) } else if (p < 0.5) { rock = 1; drop = 1 - ease.ramp(p, 0.34, 0.45) } else rock = 1 - ease.ramp(p, 0.5, 0.56)
    const d = 17 * drop
    // The handle: back 0.725-0.755, held, let go 0.775-0.79 (it snaps).
    const pull = p < 0.775 ? ease.ramp(p, 0.725, 0.755) : 1 - ease.ramp(p, 0.775, 0.79)
    const snap = ease.bump(p, 0.785, 0.86, 0.8)
    // the left hand's placement
    let place
    if (p < 0.12) place = mixRig(BELOW, onMag(0, 0), ease.ramp(p, 0.02, 0.12))
    else if (p < 0.6) place = then(onMag(rock, d), rig({ t: [0, 0.8 * ease.bump(p, 0.55, 0.62, 0.57), 0] })) // the slap: the palm pushes up
    else if (p < 0.725) {
      const off = then(onMag(0, 0), rig({ t: [0.5, -2.5, 3.5] }))
      place = p < 0.65 ? mixRig(onMag(0, 0), off, ease.ramp(p, 0.6, 0.65)) : mixRig(off, onKnob(0), ease.ramp(p, 0.65, 0.72))
    } else if (p < 0.775) place = onKnob(pull)
    else if (p < 0.8) place = mixRig(onKnob(1), OFFKNOB, ease.ramp(p, 0.775, 0.8))
    else place = mixRig(OFFKNOB, AWAY, ease.ramp(p, 0.8, 0.9))
    const showL = p > 0.02 && p < 0.92
    return {
      gun: rig({
        t: [0, 1, 2].map(i => MAGPOSE.t[i] * a + BOLTPOSE.t[i] * b + [0.5 * snap, 0.5 * seat, 0][i]),
        rot: [[[1, 0, 0], MAGPOSE.x * a + BOLTPOSE.x * b], [[0, 1, 0], MAGPOSE.y * a + BOLTPOSE.y * b], [[0, 0, 1], MAGPOSE.z * a + BOLTPOSE.z * b - 3 * seat + 2 * snap]],
        pivot: [12, 6, 8]
      }),
      mag: magRig(rock, d),
      lhand: asPose(place),
      show: showL ? ['lhand'] : [],
      bolt: rig({ t: [2.8 * pull, 0, 0] }),
      hide: p > 0.3 && p < 0.34 ? ['mag'] : []
    }
  }
  const drawn = gun.cooldown('', 30, draw)
  drawn.fallback = gun.firing('', FIRE(1))
  return {
    5: gun.byContext('', drawn),
    1005: gun.byContext('ads', gun.firing('ads', FIRE(0.4, 'flash2'), { hide: ['fore'] })),
    2005: gun.byContext('sprint', gun.composite('sprint')),
    3005: gun.byContext('', gun.cooldown('', 57, reload)),
  }
}
