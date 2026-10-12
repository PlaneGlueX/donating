// The Combat Rifle (WeaponMechanics weapons\assault_rifles\M4A1.yml; skins Default 7, Scope +1000, Sprint +2000,
// Reload +3000). 2026-10-06, remade the same day at the Photon Shotgun's level of detail (the kit's PG painter,
// style 'pg', 4 texels a unit): a recreation of Pixel Gun 3D's current "Combat Rifle" (drawn by hand from the wiki's
// "Appearance" picture, nothing taken from the game). A chunky M16 in navy steel with pale blue-steel plates set into
// it: a box compensator with an H plate, a thick barrel with a chrome strip, a tall stepped A front sight, a massive
// handguard (a framed front plate, a row of steel slats over a raised central bar over a row of hooked slats), a box
// scope with a cyan lens, a cyan fiber on top and a rubber eyecup on the carry handle (aiming looks through the hollow
// tube at a black post with an amber tip), an upper receiver with a pale window frame around the bolt, an L-shaped
// pale plate on the lower with the one red selector and the bolt catch under it, a navy magazine with three steel
// ribs, a knurled grip with a pale back strip, the T charging handle at the back, the forward assist on the right, and
// a short tall box stock with a framed window.
// No bayonet and no snow camo (the old looks): the Army skin's camo keys are the pale plates now, and the furniture
// (the handguard, the grip, the stock) has keys of its own (furn, furnT: navy like the body) that a skin can repaint.
// Frames (GunFx: M4A1 shot 4 ticks, draw 26 with flag 2): a 3-round burst restarts the 4-tick shot clock on every
// round (rounds 2 ticks apart), so each round shows a flash (one of two shapes at random) and a 1.2-unit, 3-degree kick
// for its first frame and the gun eases back over the rest; drawn, the gun rises and the T-handle is racked; the reload
// tilts the gun, drops the magazine straight out, seats a new one with a palm slap, then rolls the gun to rack the
// T-handle and knocks it with the forward assist (on the right side, which first person never sees: the gun's nudge and
// the knock's sound carry it; it's a fixed part of the body).
// Built along x, muzzle toward -x, centred on z = 8, every box on the 1/4 grid (a texel); the sight line is the
// scope's axis, y = SY.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_m16'
  const SY = 12
  // A hollow tube along x (the scope's sections): four walls around an opening, so aiming looks through it. The
  // faces inside the tube stay plain (they frame the aimed view); side decals go on the outer faces only.
  const tube = (x0, x1, [y0, y1, z0, z1], [yi0, yi1, zi0, zi1], side = [], top = [], more = {}) => [
    { from: [x0, y0, zi1], to: [x1, y1, z1], c: { all: 'scope', up: 'scopeT' }, grain: 0.06, mat: { all: 'dark', north: 'flat' }, deco: side.map(d => ({ ...d, face: 'south' })), ...more }, // left (z+), full height
    { from: [x0, y0, z0], to: [x1, y1, zi0], c: { all: 'scope', up: 'scopeT' }, grain: 0.06, mat: { all: 'dark', south: 'flat' }, deco: side.map(d => ({ ...d, face: 'north' })), ...more }, // right (z-)
    { from: [x0, yi1, zi0], to: [x1, y1, zi1], c: { all: 'scope', up: 'scopeT' }, grain: 0.06, mat: { all: 'dark', down: 'flat' }, deco: top, ...more }, // top
    { from: [x0, y0, zi0], to: [x1, yi0, zi1], c: 'scope', grain: 0.06, mat: { all: 'dark', up: 'flat' }, ...more } // bottom
  ]
  // The eyecup: a ring of knurled rubber on the eyepiece's back face (outer ±1.75, the opening ±0.75), its edges drawn
  // as decals (outline off: an outlined 4-texel ring would leave 2 texels of rubber and no rim), a lit rim round the
  // opening. Its thin faces are near-ink, so the ring still has a dark silhouette.
  const eyecup = (x0, x1) => {
    const C = { c: { all: 'inkK', east: 'gripP' }, outline: false, bevel: 0 }
    const st = (z0, y0, z1, y1, rows) => [{ k: 'stamp', face: 'east', at: [z0, y0], to: [z1, y1], rows, keys: { k: 'inkK', r: 'gmL' } }]
    const edge = 'kkkkkkkkkkkkkk'; const mid = 'k............k'; const rim = 'k..rrrrrrrr..k'
    return [
      { from: [x0, SY + 0.75, 6.25], to: [x1, SY + 1.75, 9.75], ...C, deco: st(6.25, SY + 1.75, 9.75, SY + 0.75, [edge, mid, mid, rim]) },
      { from: [x0, SY - 1.75, 6.25], to: [x1, SY - 0.75, 9.75], ...C, deco: st(6.25, SY - 0.75, 9.75, SY - 1.75, [rim, mid, mid, edge]) },
      // the sides' east faces read u = 9.75 - z: the left wall's outer edge first, the right wall's rim first
      { from: [x0, SY - 0.75, 8.75], to: [x1, SY + 0.75, 9.75], ...C, deco: st(8.75, SY + 0.75, 9.75, SY - 0.75, Array(6).fill('k..r')) },
      { from: [x0, SY - 0.75, 6.25], to: [x1, SY + 0.75, 7.25], ...C, deco: st(6.25, SY + 0.75, 7.25, SY - 0.75, Array(6).fill('r..k')) }
    ]
  }
  // A pair of plates a texel proud of both side faces of a body whose side planes are zs = [z-, z+] (their backs
  // against the body are left out). more: the rest of the box, or side => box for decals that must mirror.
  const PR = 0.25
  const plates = (x0, x1, y0, y1, [zn, zs], c, more = {}) => {
    const m = typeof more === 'function' ? more : () => more
    return [
      { from: [x0, y0, zs], to: [x1, y1, zs + PR], c, grain: 0.05, dirs: ['south', 'east', 'west', 'up', 'down'], ...m('south') },
      { from: [x0, y0, zn - PR], to: [x1, y1, zn], c, grain: 0.05, dirs: ['north', 'east', 'west', 'up', 'down'], ...m('north') }
    ]
  }
  // Stamp rows drawn for the south face (+z, u along +x); the north face reads u along -x, so its rows are reversed.
  const mirrorRows = (rows, side) => side === 'south' ? rows : rows.map(r => [...r].reverse().join(''))
  // The handguard's ribbed panel, 14 texels wide: a row of steel slats in a dark recess (4 rows), the central bar's
  // place (4 rows, a plate covers it), a row of hooked slats (4 rows: a slat with a foot toward the muzzle).
  const ribRows = (() => {
    const w = 14; const S = new Set([1, 4, 7, 10, 13])
    const row = f => Array.from({ length: w }, (_, c) => f(c)).join('')
    return [
      row(() => 'g'), row(c => S.has(c) ? 'h' : '#'), row(c => S.has(c) ? 'r' : '#'), row(c => S.has(c) ? 'l' : '#'),
      '', '', '', '',
      row(c => S.has(c) ? 'h' : '#'), row(c => S.has(c) ? 'r' : '#'), row(c => S.has(c) || S.has(c + 1) ? 'r' : '#'), row(c => S.has(c) || S.has(c + 1) ? 'l' : '#')
    ]
  })()
  const RIB = { h: 'ribH', r: 'rib', l: 'ribL', g: 'gmL' }
  // A lit edge: one texel of light steel under a face's top outline (PG3D's edge highlights).
  const lit = (x0, x1, y, c = 'gmL') => ({ k: 'band', at: [x0, y], to: [x1, y - 0.25], c })
  const NAVY = { c: { all: 'recv', up: 'recvT' }, grain: 0.08 }
  const FURN = { c: { all: 'furn', up: 'furnT' }, grain: 0.08 }
  const GRIP = { angle: 20, axis: 'z', origin: [18.4, 5.4, 8] }
  const gun = pgGun(name, {
    style: 'pg',
    density: 4,
    ink: [4, 6, 14],
    palette: {
      // navy steel (the body; furn/furnT: the furniture, the same navy, so a skin can paint the handguard, grip and stock
      // apart from the metal), its mid and light steel, the pale edge line
      recv: [31, 38, 54], recvT: [48, 59, 78], furn: { of: 'recv', f: 1 }, furnT: { of: 'recvT', f: 1 }, gmD: [18, 24, 38], gm: [71, 85, 107], gmL: [98, 116, 141], edge: [197, 213, 226],
      // the pale blue-steel plates (the Army skin's camo keys): plate, its light bars, the lower L-plate, a lo, a recess, pins
      camo: [162, 182, 202], camoT: [204, 218, 232], camoB: [140, 174, 200], camoS: [104, 118, 138], camoD: [56, 66, 84], camoW: [226, 236, 246],
      // the handguard's slats (a shade of the L-plate's steel, so a skin that recolors the plates recolors them too: the
      // Army look's olive), their lit top and dark foot
      rib: { of: 'camoB', f: 0.97 }, ribH: { of: 'rib', k: 1 }, ribL: { of: 'rib', k: -1 },
      chrome: [190, 206, 217], red: [174, 65, 72], redH: { of: 'red', k: 1 },
      scope: [38, 47, 66], scopeT: [58, 70, 92], cyan: [90, 216, 240],
      lens: [76, 166, 204], lensB: [200, 244, 255], dot: [255, 176, 48],
      mag: [28, 38, 56], magS: { of: 'camo', f: 0.94 }, magK: [12, 18, 30], butt: [38, 46, 64], gripP: [42, 52, 72],
      bore: [6, 8, 14], inkK: [4, 6, 14], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: {
      recv: 'dark', recvT: 'dark', gmD: 'dark', scope: 'dark', scopeT: 'dark', mag: 'dark', magK: 'dark',
      gm: 'metal', gmL: 'metal', edge: 'metal', rib: 'metal', magS: 'metal',
      camo: 'metal', camoT: 'metal', camoB: 'metal', camoS: 'metal', camoD: 'metal', camoW: 'metal',
      chrome: 'chrome', red: 'paint', gripP: 'rubber', butt: 'rubber',
      lens: 'glass', lensB: 'glass', cyan: 'glow', dot: 'glow', flash: 'glow', flashCore: 'glow', bore: 'flat', inkK: 'flat'
    },
    parts: {
      body: [
        // The box compensator: an H plate on each side, vent slots under it, slots across the top and the bottom, the
        // bore and four ports on the front; a ribbed collar behind it.
        { from: [-5.75, 6.0, 6.5], to: [-2.25, 9.5, 9.5], ...NAVY, split: { x: [-3.5] },
          deco: [
            { k: 'slots', at: [-5.25, 7.0], to: [-4.0, 6.25], n: 2 }, { k: 'slots', at: [-3.25, 7.0], to: [-2.5, 6.25], n: 2 },
            { k: 'slots', face: 'flats', at: [-5.25, 7.0], to: [-2.75, 9.0], dir: 'v', n: 3 },
            { k: 'holes', face: 'ends', at: [6.75, 9.25], to: [9.25, 6.25], pitch: [9, 11] }, lit(-5.5, -2.5, 9.25)
          ] },
        ...plates(-5.25, -2.5, 7.25, 9.0, [6.5, 9.5], 'camo', { deco: [{ k: 'stamp', at: [-5.0, 8.75], to: [-2.75, 7.5], rows: ['..#####..', '..ddddd..', '.........', '..#####..', '..ddddd..'], keys: { d: 'gmD' } }] }),
        { from: [-5.77, 7.25, 7.5], to: [-5.75, 8.25, 8.5], c: 'bore', dirs: ['west'], outline: false },
        { from: [-2.25, 6.5, 7.0], to: [-1.5, 9.0, 9.0], c: { all: 'gm', up: 'gmL' } },
        // The barrel: a chrome strip along its upper half, three dashes under it.
        { from: [-1.5, 7.0, 7.25], to: [3.0, 8.5, 8.75], ...NAVY, dirs: ['north', 'south', 'up', 'down'],
          deco: [{ k: 'band', at: [-1.25, 8.25], to: [1.0, 7.5], c: 'chrome' }, { k: 'rivets', at: [-1.0, 7.5], to: [0.75, 7.25], n: 3, c: 'gmL' }] },
        // The front sight: a sleeve round the barrel, a stepped A each side (outside the aimed view's cone), a post.
        { from: [1.0, 6.5, 5.75], to: [3.0, 9.0, 10.25], ...NAVY, deco: [{ k: 'rivets', at: [1.5, 8.0], to: [2.5, 7.5], n: 1, size: 2, c: 'gmL' }, lit(1.25, 2.75, 8.75)] },
        { from: [1.0, 9.0, 5.75], to: [1.75, 10.25, 10.25], ...NAVY, deco: [{ k: 'band', at: [1.25, 10.0], to: [1.5, 9.0], c: 'gmL' }] },
        { from: [2.25, 9.0, 5.75], to: [3.0, 10.25, 10.25], ...NAVY, deco: [{ k: 'band', at: [2.5, 10.0], to: [2.75, 9.0], c: 'gmL' }] },
        ...[[5.75, 6.25], [9.75, 10.25]].flatMap(([z0, z1]) => [
          { from: [1.25, 10.25, z0], to: [2.75, 11.25, z1], ...NAVY, deco: [lit(1.5, 2.5, 11.0)] },
          { from: [1.5, 11.25, z0], to: [2.5, 12.0, z1], c: 'recvT', deco: [lit(1.75, 2.25, 11.75)] }
        ]),
        // The handguard: a cap and a rear ring a step proud of it, perforated ends; the body (a framed front plate, the
        // ribbed panel, a raised central bar, a plain lower half with a seam and vents); holes either side of a rail on
        // top; slots underneath.
        { from: [3.0, 4.75, 6.0], to: [3.75, 10.0, 10.0], ...NAVY,
          deco: [{ k: 'rivets', at: [3.25, 9.25], to: [3.5, 5.25], n: 3, c: 'gmL' }, lit(3.25, 3.5, 9.75), { k: 'holes', face: 'ends', at: [6.5, 9.75], to: [9.75, 5.0], pitch: [2, 2] }] },
        { from: [3.75, 5.0, 6.25], to: [10.0, 9.75, 9.75], c: { all: 'furn', up: 'furnT' }, dirs: ['north', 'south', 'up', 'down'], split: { y: [6.5] },
          deco: [
            { k: 'stamp', face: 'south', at: [6.25, 9.5], to: [9.75, 6.5], rows: mirrorRows(ribRows, 'south'), keys: RIB },
            { k: 'stamp', face: 'north', at: [6.25, 9.5], to: [9.75, 6.5], rows: mirrorRows(ribRows, 'north'), keys: RIB },
            { k: 'slots', at: [7.75, 6.0], to: [9.75, 5.25], dir: 'v', n: 3 },
            { k: 'holes', face: 'up', at: [4.5, 6.5], to: [9.5, 7.0] }, { k: 'holes', face: 'up', at: [4.5, 9.25], to: [9.5, 9.5] },
            { k: 'slots', face: 'down', at: [4.5, 6.75], to: [9.5, 9.25], dir: 'v', n: 5 }
          ] },
        { from: [4.25, 9.75, 7.25], to: [9.5, 10.5, 8.75], c: 'gm', deco: [{ k: 'rail', face: 'up', at: [4.25, 7.25], to: [9.5, 8.75], c: 'gm' }] },
        ...plates(3.75, 6.25, 6.25, 9.75, [6.25, 9.75], 'camo', { deco: [{ k: 'inset', at: [4.25, 9.25], to: [5.75, 6.75], c: 'camoS' }] }),
        ...plates(6.25, 9.75, 7.5, 8.5, [6.25, 9.75], 'gm', { c: { all: 'gm', up: 'gmL' } }),
        { from: [10.0, 4.75, 6.0], to: [10.75, 10.0, 10.0], ...NAVY, deco: [lit(10.25, 10.5, 9.75), { k: 'holes', face: 'ends', at: [6.5, 9.75], to: [9.75, 5.0], pitch: [2, 2] }] },
        // The upper receiver: a pale window frame round the bolt (the ejection port on the right), a light seam under
        // it; light bars at the back on the left (+z), the forward assist on the right (-z).
        { from: [10.75, 7.25, 6.5], to: [19.75, 9.5, 9.5], ...NAVY, dirs: ['north', 'south', 'east', 'up', 'down'], split: { x: [11.75] },
          deco: [
            { k: 'band', at: [12.0, 7.75], to: [16.5, 7.5], c: 'camoT' }, lit(11.0, 19.5, 9.25),
            { k: 'slots', face: 'up', at: [18.75, 6.75], to: [19.5, 9.25], dir: 'v', n: 1 },
            { k: 'slots', face: 'down', at: [11.0, 6.5], to: [19.5, 9.5], dir: 'v', n: 4 }
          ] },
        ...plates(11.75, 16.5, 7.5, 9.5, [6.5, 9.5], 'camo', { deco: [{ k: 'inset', at: [12.5, 9.0], to: [15.75, 8.0], c: 'camoD' }, { k: 'band', at: [13.0, 8.5], to: [15.25, 8.25], c: 'gm' }] }),
        { from: [16.75, 7.75, 9.5], to: [17.5, 9.25, 9.75], c: 'camoT', dirs: ['south', 'east', 'west', 'up', 'down'] },
        { from: [17.75, 7.75, 9.5], to: [18.75, 9.25, 9.75], c: 'camoT', dirs: ['south', 'east', 'west', 'up', 'down'] },
        { from: [17.0, 7.75, 6.0], to: [19.0, 9.25, 6.5], c: 'camoT', dirs: ['north', 'east', 'west', 'up', 'down'] },
        { from: [17.5, 8.0, 5.5], to: [18.5, 9.0, 6.0], c: { all: 'gmL', north: 'edge' }, dirs: ['north', 'east', 'west', 'up', 'down'] },
        // The lower receiver and the magazine well under a pale L-plate (a block over the well, a band back to the grip
        // with the red selector and two takedown pins), two pins on the block.
        { from: [10.75, 5.5, 6.75], to: [19.5, 7.25, 9.25], ...NAVY, dirs: ['north', 'south', 'east', 'down'] },
        { from: [11.0, 4.25, 6.75], to: [15.0, 5.5, 9.25], ...NAVY, dirs: ['north', 'south', 'east', 'west', 'down'] },
        ...plates(11.25, 14.75, 4.5, 7.0, [6.75, 9.25], 'camoB', { deco: [{ k: 'rivets', at: [12.25, 5.25], to: [13.75, 5.0], n: 2, c: 'camoW' }] }),
        ...plates(14.75, 19.25, 6.0, 7.0, [6.75, 9.25], 'camoB', {
          deco: [
            { k: 'stamp', at: [16.25, 6.75], to: [16.75, 6.25], rows: ['kr', 'rr'], keys: { k: 'redH', r: 'red' } },
            { k: 'rivets', at: [15.0, 6.75], to: [19.0, 6.25], n: 2, size: 2, c: 'gmL' }
          ]
        }),
        // The bolt catch on the left (+z), under the band (its top hides under the plate).
        { from: [15.0, 5.25, 9.25], to: [16.0, 6.0, 9.5], c: 'recv', dirs: ['south', 'east', 'west', 'down'], deco: [{ k: 'band', at: [15.25, 5.75], to: [15.75, 5.5], c: 'gm' }] },
        // The trigger guard and the trigger; the pistol grip raked back: knurled panels, a pale back strip, a cap, a
        // finger bump.
        { from: [14.75, 4.75, 7.5], to: [17.5, 5.25, 8.5], ...NAVY },
        { from: [14.75, 5.25, 7.5], to: [15.25, 5.5, 8.5], ...NAVY },
        { from: [16.0, 5.25, 7.75], to: [16.5, 5.5, 8.25], c: 'gmL', outline: false },
        { from: [17.25, 0.5, 6.75], to: [19.5, 5.5, 9.25], ...FURN, rot: GRIP, deco: [{ k: 'band', at: [19.0, 5.0], to: [19.25, 0.75], c: 'camoT' }, { k: 'band', face: 'east', at: [7.5, 5.0], to: [8.5, 0.75], c: 'camoT' }] },
        { from: [17.0, 0.0, 6.5], to: [19.75, 0.5, 9.5], c: { all: 'gm', up: 'gmL' }, rot: GRIP },
        ...plates(17.5, 19.0, 1.25, 4.75, [6.75, 9.25], 'gripP', { rot: GRIP }),
        { from: [16.75, 2.75, 7.25], to: [17.25, 3.75, 8.75], ...NAVY, rot: GRIP },
        // The carry handle: the front post, the bar (a lighter outline: it's two texels tall), two pale struts under it,
        // the rear sight housing with its aperture.
        { from: [11.75, 9.5, 7.25], to: [12.75, 10.5, 8.75], ...NAVY },
        { from: [12.75, 10.0, 7.25], to: [17.0, 10.5, 8.75], c: 'recv', ink: 'recvT' },
        { from: [13.75, 9.5, 7.75], to: [14.25, 10.0, 8.25], c: 'camoT', outline: false },
        { from: [15.5, 9.5, 7.75], to: [16.0, 10.0, 8.25], c: 'camoT', outline: false },
        { from: [17.0, 9.5, 7.0], to: [18.5, 10.75, 9.0], ...NAVY, deco: [{ k: 'stamp', face: 'east', at: [8.75, 10.5], to: [7.25, 9.75], rows: ['.k##k.', '.k##k.', '.kkkk.'], keys: { k: 'gmL' } }] },
        // The scope: a bezel ring before the lens, the objective housing, the body (a pale strip along each side's top,
        // cooling slots), the eyepiece; the cyan lens (no back face: the aimed view looks through it), the black post
        // with an amber tip inside, a knurled turret on top and on the left, the cyan fiber on top; the rubber eyecup on
        // the back.
        ...tube(9.5, 10.5, [SY - 1.75, SY + 1.75, 6.25, 9.75], [SY - 1.25, SY + 1.25, 6.75, 9.25]),
        ...tube(10.5, 11.5, [SY - 1.75, SY + 1.75, 6.25, 9.75], [SY - 1.0, SY + 1.0, 7.0, 9.0], [lit(9.5, 11.5, SY + 1.5), { k: 'rivets', at: [10.75, SY + 1.0], to: [11.25, SY - 1.25], n: 2, c: 'gmL' }]),
        ...tube(11.5, 16.75, [SY - 1.5, SY + 1.5, 6.5, 9.5], [SY - 1.0, SY + 1.0, 7.0, 9.0],
          [lit(11.75, 16.5, SY + 1.25, 'edge'), { k: 'rivets', at: [11.75, SY - 0.75], to: [13.25, SY - 1.25], n: 2, size: 2, c: 'gmL' }, { k: 'vent', at: [14.75, SY + 0.75], to: [16.75, SY - 1.0], c: 'rib', fin: 1, gap: 1 }], [{ k: 'slots', face: 'up', at: [15.0, 7.0], to: [16.5, 9.0], dir: 'v', n: 3 }]),
        ...tube(16.75, 17.75, [SY - 1.5, SY + 1.5, 6.5, 9.5], [SY - 0.75, SY + 0.75, 7.25, 8.75]),
        ...eyecup(17.75, 18.0),
        { from: [10.0, SY - 1.0, 7.0], to: [10.5, SY + 1.0, 9.0], c: 'lens', glow: true, dirs: ['west', 'north', 'south', 'up', 'down'] },
        { from: [9.96, SY + 0.25, 7.25], to: [10.0, SY + 0.75, 7.75], c: 'lensB', glow: true, dirs: ['west'] },
        { from: [10.95, SY - 1.0, 7.92], to: [11.05, SY - 0.15, 8.08], c: 'bore', outline: false },
        { from: [10.9, SY - 0.15, 7.85], to: [11.1, SY + 0.15, 8.15], c: 'dot', glow: true },
        { from: [13.5, SY + 1.5, 7.5], to: [14.75, SY + 2.25, 8.5], c: 'gripP' },
        { from: [13.5, SY - 0.5, 9.5], to: [14.75, SY + 0.5, 10.0], c: 'gripP', dirs: ['south', 'east', 'west', 'up', 'down'] },
        { from: [11.75, SY + 1.5, 7.5], to: [13.25, SY + 2.0, 8.5], c: 'cyan', glow: true, pat: 'neon', dirs: ['north', 'south', 'east', 'west', 'up'] },
        // The stock: a low neck (vent slots; the T-handle's travel stays clear above it) and a short tall block with a
        // pale-framed window each side, a knurled butt pad with grooves.
        { from: [19.75, 6.0, 7.0], to: [23.5, 8.5, 9.0], ...FURN, deco: [{ k: 'slots', at: [20.25, 7.75], to: [22.75, 6.5], dir: 'v', n: 3 }, lit(20.0, 23.25, 8.25, 'camoT')] },
        { from: [23.5, 4.75, 6.5], to: [27.0, 9.0, 9.5], ...FURN, dirs: ['north', 'south', 'west', 'up', 'down'], split: { x: [25.25] },
          deco: [{ k: 'slots', face: 'down', at: [23.75, 6.75], to: [26.75, 9.25], dir: 'v', n: 3 }, { k: 'holes', face: 'west', at: [7.25, 5.75], to: [8.75, 5.0], pitch: [2, 2] }] },
        ...plates(23.75, 26.75, 5.0, 8.75, [6.5, 9.5], 'camo', { deco: [{ k: 'inset', at: [24.5, 8.0], to: [26.75, 5.0], c: 'camoS' }, { k: 'rivets', at: [24.75, 8.5], to: [26.5, 8.25], n: 2, c: 'camoW' }] }),
        { from: [27.0, 4.5, 6.25], to: [27.75, 9.25, 9.75], c: 'butt', deco: [{ k: 'slots', face: 'east', at: [6.5, 8.75], to: [9.5, 5.0], n: 4 }] }
      ],
      // The T charging handle at the back of the upper receiver (pulled back +x); its stem shows when pulled.
      charge: [
        { from: [17.25, 8.75, 7.75], to: [19.75, 9.25, 8.25], c: 'gmL' },
        { from: [19.75, 8.75, 6.75], to: [20.5, 9.5, 9.25], c: { all: 'gmL', up: 'edge' } },
        { from: [19.75, 8.75, 9.25], to: [20.25, 9.25, 9.75], c: 'gmL' }
      ],
      // The straight magazine: navy, three steel ribs down each side, a seam near the top, a dark floor plate.
      mag: [
        { from: [11.5, -1.0, 7.0], to: [14.5, 4.75, 9.0], c: { all: 'mag', up: 'magK' }, grain: 0.08, split: { y: [3.5] },
          deco: [12.0, 12.75, 13.5].map(x => ({ k: 'band', at: [x, 3.25], to: [x + 0.25, -0.5], c: 'magS' })) },
        { from: [11.25, -1.75, 6.75], to: [14.75, -1.0, 9.25], c: { all: 'magK', up: 'gm' } }
      ],
      // The muzzle flash, about 1.25x the old one's size so it reads in front of the bigger compensator (the core a little
      // bigger than the compensator's front, so its glow frames the muzzle at the hip); its rear faces on the muzzle face
      // (x -5.75).
      flash: [
        { from: [-9.25, 5.5, 6.0], to: [-5.75, 10.0, 10.0], c: 'flashCore', glow: true },
        { from: [-13.0, 7.25, 7.5], to: [-8.5, 8.25, 8.5], c: 'flash', glow: true },
        { from: [-7.75, 9.125, 7.5], to: [-6.5, 11.625, 8.5], c: 'flash', glow: true },
        { from: [-7.75, 3.875, 7.5], to: [-6.5, 6.375, 8.5], c: 'flash', glow: true },
        { from: [-7.75, 7.25, 4.125], to: [-6.5, 8.25, 6.625], c: 'flash', glow: true },
        { from: [-7.75, 7.25, 9.375], to: [-6.5, 8.25, 11.875], c: 'flash', glow: true }
      ],
      // A second flash (an X), so the rounds of a burst differ; it's also the aimed shot's flash. Its arms are 6 units
      // long but set low: 2.25 up, 3.75 down from the bore, so the kick never lifts an upper tip into the scope's view.
      // The X's second arm is a little longer along x, so the two arms' end faces never lie in one plane where they
      // cross.
      flash2: [
        { from: [-8.75, 5.75, 6.25], to: [-5.75, 9.625, 9.75], c: 'flashCore', glow: true },
        { from: [-11.5, 7.25, 7.5], to: [-8.0, 8.25, 8.5], c: 'flash', glow: true },
        { from: [-7.5, 7.25, 5.75], to: [-6.25, 8.25, 11.75], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-6.875, 7.75, 8] } },
        { from: [-7.625, 4.0, 7.5], to: [-6.125, 10.0, 8.5], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-6.875, 7.75, 8] } }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -82, 0], translation: [-5.26, 3.6, -1.79], scale: [0.64, 0.64, 0.64] },
      thirdperson: { rotation: [0, -90, 0], translation: [0, 1.5, -5.5], scale: [0.76, 0.76, 0.76] },
      gui: { rotation: [0, 180, -30], translation: [1.5, 1.8, 0], scale: [0.5, 0.5, 0.5] },
      ground: { rotation: [0, 0, -45], translation: [-3, 8.75, 0], scale: [0.85, 0.85, 0.85] },
      fixed: { rotation: [0, 0, -45], translation: [-2.5, 1.5, -1], scale: [0.85, 0.85, 0.85] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 17.75, rearDepth: 0.8, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [21.5, -25.25, 0], translation: [-10.6, 2.6, 1.38], scale: [0.68, 0.68, 0.68] }
    }
  })

  // The shoulder pivot (the grip's top, behind the trigger): kicks turn the muzzle up about it.
  const SHOULDER = [18.4, 5.6, 8]
  // A round (GunFx: a 4-tick clock on every round; the 26.3 client shows p = 0.125, 0.375, 0.625, 0.875, a frame a
  // tick): the first frame the whole kick (1.2 back, 3 degrees up) and a flash, then it eases back (0.69, 0.25, 0.03).
  // In a burst the next round restarts the clock 2 ticks later, so the gun jolts three times and the flash blinks.
  const kickAt = p => p < 0.25 ? 1 : Math.pow(1 - (p - 0.25) / 0.75, 2)
  const pose = (k, p, yaw = 0, flash = null) => {
    const kk = kickAt(p) * k
    return { ...(flash ? { show: [flash] } : {}), gun: rig({ t: [1.2 * kk, 0.15 * kk, 0], rot: [[[0, 0, 1], -3 * kk], [[0, 1, 0], yaw * kk]], pivot: SHOULDER }) }
  }
  // The shot clock: its first frame picks one of the two flashes at random (minecraft:time, a fresh value each frame,
  // with a small yaw each way), so a burst's flashes differ.
  const shots = (state, k, flashes) => {
    const c = gun.cooldown(state, 4, p => pose(k, p))
    const first = c.entries[c.entries.length - 1]
    first.model = {
      type: 'minecraft:range_dispatch',
      property: 'minecraft:time',
      source: 'random',
      wobble: false,
      entries: flashes.map((f, i) => ({ threshold: i / flashes.length, model: gun.composite(state, pose(k, 0.125, i % 2 ? -0.5 : 0.5, f)) })),
      fallback: gun.composite(state, pose(k, 0.125, 0.5, flashes[0]))
    }
    return c
  }
  // The reload's and the draw's poses: t (model units), then turns about x (the roll: top toward the eye +), y (muzzle
  // inward +) and z (muzzle down +), about the receiver's middle. mag: the gun lifted, its bottom rolled toward the eye
  // and the muzzle turned in, so the magazine shows; handle: lifted, its top rolled toward the eye and turned across, so
  // the T-handle at the back of the receiver comes into view (in the rest pose it's below the screen's edge); assist: a
  // bit more roll, the gun held for the forward assist's knock.
  const POSES = {
    mag: { t: [-2, 5, 1.5], x: -34, y: 16, z: -3 },
    handle: { t: [-4, 4, 1], x: 25, y: 22, z: 4 },
    assist: { t: [-3.5, 4.5, 1.5], x: 42, y: 20, z: 3 }
  }
  const POSE_PIVOT = [14, 7, 8]
  const posed = (q, w) => rig({ t: q.t.map(v => v * w), rot: [[[1, 0, 0], q.x * w], [[0, 1, 0], q.y * w], [[0, 0, 1], q.z * w]], pivot: POSE_PIVOT })
  // The draw (GunFx: 26 ticks with custom_model_data flag 2): the gun comes up from below the screen, muzzle down and
  // rolled out, into the handle pose (by 0.5), the T-handle is racked (pulled 0.58-0.64, let go 0.67-0.70: M4A1.yml
  // plays the charge sound at tick 16, its release click 2.5 ticks later), and the gun snaps back to rest (0.76-0.95).
  const draw = p => {
    const k = 1 - ease.out(Math.min(1, p / 0.45))
    const h = ease.ramp(p, 0.2, 0.5) * (1 - ease.ramp(p, 0.76, 0.95))
    const pull = p < 0.67 ? ease.ramp(p, 0.58, 0.64) : 1 - ease.ramp(p, 0.67, 0.7)
    const snap = ease.bump(p, 0.69, 0.8, 0.72)
    const below = rig({ t: [2 * k + 0.4 * snap, -9 * k, 0], rot: [[[1, 0, 0], -20 * k], [[0, 0, 1], 28 * k + 2 * snap]], pivot: SHOULDER })
    return { gun: pg.then(posed(POSES.handle, h), below), charge: rig({ t: [2.6 * pull, 0, 0] }) }
  }
  // The reload (GunFx: a clock as long as WeaponMechanics' reload: 50 ticks, 62 from empty when the silent SLIDE's
  // Open 6 and Close 6 come with it): the magazine pose (0-0.1), the magazine drops straight out along its well
  // (0.16-0.30), is gone, a new one rises (0.40-0.50) and seats with a jolt (0.52), a palm slap (0.54); the handle pose
  // (0.57-0.64), the T-handle is pulled (0.68-0.70) and let go (0.725-0.74, a snap); the assist pose (0.75-0.8), the
  // forward assist knocks the gun (0.82-0.86: the palm on the far side jolts it toward the eye and rolls it 3 degrees,
  // with the knock's sound), and it settles by 0.97.
  // The sounds (M4A1.yml Start_Mechanics, delayBeforePlay in ticks): from empty the open's 6 ticks come first and the
  // frames run over 62 ticks, so the delays split the difference, d = 56p - 3: mag_out 6 (p 0.16), mag_in 26 (0.52),
  // charge 35 (0.68; its release click 2.5 ticks later), assist 44 (0.84); each within about 3 ticks of its frame.
  const MAG_AXIS = [0, -1, 0]
  const reload = p => {
    const w = {
      mag: ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.57, 0.64)),
      handle: ease.ramp(p, 0.57, 0.64) * (1 - ease.ramp(p, 0.75, 0.8)),
      assist: ease.ramp(p, 0.75, 0.8) * (1 - ease.ramp(p, 0.87, 0.97))
    }
    const sum = k => Object.entries(POSES).reduce((s, [n, q]) => s + q[k] * w[n], 0)
    const sumT = i => Object.entries(POSES).reduce((s, [n, q]) => s + q.t[i] * w[n], 0)
    const seat = ease.bump(p, 0.5, 0.56, 0.52)
    const slap = ease.bump(p, 0.53, 0.6, 0.55)
    let drop = 0
    if (p < 0.4) drop = ease.ramp(p, 0.16, 0.3); else drop = 1 - ease.ramp(p, 0.4, 0.5)
    const d = 14 * drop
    const pull = p < 0.725 ? ease.ramp(p, 0.68, 0.7) : 1 - ease.ramp(p, 0.725, 0.74)
    const snap = ease.bump(p, 0.735, 0.8, 0.75)
    const tap = ease.bump(p, 0.82, 0.86, 0.835)
    return {
      gun: rig({
        t: [0, 1, 2].map(i => sumT(i) + [0.4 * snap - 0.2 * tap, 0.4 * seat + 0.6 * slap + 0.2 * tap, 0.6 * tap][i]),
        rot: [[[1, 0, 0], sum('x') + 3 * tap], [[0, 1, 0], sum('y')], [[0, 0, 1], sum('z') - 2 * seat - 3 * slap + 2 * snap]],
        pivot: POSE_PIVOT
      }),
      mag: rig({ t: [MAG_AXIS[0] * d, MAG_AXIS[1] * d, 0] }),
      charge: rig({ t: [2.6 * pull, 0, 0] }),
      hide: p > 0.3 && p < 0.4 ? ['mag'] : []
    }
  }
  const def = gun.flag(2, gun.cooldown('', 26, draw), shots('', 1, ['flash', 'flash2']))
  const ads = gun.flag(2, gun.composite('ads'), shots('ads', 0.45, ['flash2', 'flash2']))
  return {
    7: gun.byContext('', def),
    1007: gun.byContext('ads', ads),
    2007: gun.byContext('sprint', gun.composite('sprint')),
    3007: gun.byContext('', gun.cooldown('', 50, reload))
  }
}
