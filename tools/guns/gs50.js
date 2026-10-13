// The pistol slot (WeaponMechanics weapons\pistols\50_GS.yml; skins Default 9, Scope +1000, Sprint +2000, Reload
// +3000). A recreation of Pixel Gun 3D's starting pistol (the owner: the sold guns remade as PG3D's, at the Photon
// Shotgun's level of detail; drawn by hand from the wiki's current Appearance picture, nothing taken from the game):
// a banded blue-white chrome slide (the bands step down toward the port) with a framed front panel, the hook-shaped
// ejection port with the barrel hood in it and 5 serration ridges at the back, a muzzle cap (its top under the
// slide's, so the aimed post stands on bright chrome) with a square bore, a rear face with grooves over a striker
// stub, a dark steel frame band, a dust cover with a row of lit plates and rail teeth, a compact squared chrome
// trigger guard right in front of the grip with a dark web (it reads solid, like PG3D's), a raked blood-red grip
// (orange streak, two screws, a palm swell, a maroon front strap with an inset, a plain back strap) on a charcoal
// base plate, and glowing three-dot sights. Its reload doesn't pull the slide (the magazine drops out of the grip
// and a new one goes in, like PG3D's); each shot kicks the gun up and cycles the slide (no empty pose: no No_Ammo
// state).
// Built along x, muzzle toward -x, centred on z = 8; the sight line is y = SY. North (z < 8) is the gun's right side
// (the icon, the ground, third person), south its left side (first person, with the top and the rear face).
// Painted with the kit's PG painter (style 'pg', 4 texels a unit): most faces are pixel art (stamp decals) drawn
// from model coordinates below, so the details sit in the same place whatever the face's orientation.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_gs50'
  const SY = 13.25 // the sight line (on the 1/4 grid; aim() below follows it)
  const D = 4
  const G = { angle: 15, axis: 'z', origin: [12.3, 7.4, 8] } // the grip's rake (the magazine shares it)

  // ---------- pixel art on a face, in model coordinates ----------
  // art(box, face): a char grid the size of the face's tile; rect(a0, b0, a1, b1, ch) fills the texels inside the
  // model rectangle (face plane: [x, y] on north/south, [z, y] on east/west, [x, z] on up/down); deco(keys) returns
  // the stamp decal ('.' keeps the painter's bands, bevel and grain; '#' ink, '+' / '-' the face's hi / lo tone,
  // other chars via keys -> palette keys).
  const AXES = { north: [0, 1], south: [0, 1], east: [2, 1], west: [2, 1], up: [0, 2], down: [0, 2] }
  const art = (b, dir) => {
    const lo = [0, 1, 2].map(i => Math.min(b.from[i], b.to[i])); const hi = [0, 1, 2].map(i => Math.max(b.from[i], b.to[i]))
    const [ua, va] = AXES[dir]
    const w = Math.max(2, Math.ceil((hi[ua] - lo[ua]) * D - 1e-6)); const h = Math.max(2, Math.ceil((hi[va] - lo[va]) * D - 1e-6))
    const U = a => ({ south: a - lo[0], north: hi[0] - a, west: a - lo[2], east: hi[2] - a, up: a - lo[0], down: a - lo[0] })[dir] * D
    const V = c => (dir === 'up' ? c - lo[2] : dir === 'down' ? hi[2] - c : hi[1] - c) * D
    const g = Array.from({ length: h }, () => Array(w).fill('.'))
    const tex = (u0, v0, u1, v1, ch) => { for (let v = v0; v <= v1; v++) for (let u = u0; u <= u1; u++) if (u >= 0 && v >= 0 && u < w && v < h) g[v][u] = ch }
    const rect = (a0, b0, a1, b1, ch) => {
      const u0 = Math.round(Math.min(U(a0), U(a1))); const u1 = Math.round(Math.max(U(a0), U(a1))) - 1
      const v0 = Math.round(Math.min(V(b0), V(b1))); const v1 = Math.round(Math.max(V(b0), V(b1))) - 1
      tex(u0, v0, u1, v1, ch)
    }
    // a 1-texel ring just inside the rectangle
    const ring = (a0, b0, a1, b1, ch = '#') => {
      const u0 = Math.round(Math.min(U(a0), U(a1))); const u1 = Math.round(Math.max(U(a0), U(a1))) - 1
      const v0 = Math.round(Math.min(V(b0), V(b1))); const v1 = Math.round(Math.max(V(b0), V(b1))) - 1
      tex(u0, v0, u1, v0, ch); tex(u0, v1, u1, v1, ch); tex(u0, v0, u0, v1, ch); tex(u1, v0, u1, v1, ch)
    }
    const deco = (keys = {}) => ({ k: 'stamp', face: dir, at: [lo[ua], lo[va]], to: [hi[ua], hi[va]], rows: g.map(r => r.join('')), keys })
    return { w, h, U, V, g, tex, rect, ring, deco }
  }
  // Attach pixel art to a box: paint(box, face, a => { ... }, keys).
  const paint = (b, dir, fn, keys) => { const a = art(b, dir); fn(a); (b.deco = b.deco || []).push(a.deco(keys)); return b }
  // Stamp keys (palette keys: derived tones follow a skin's base color).
  const K = { G: 'cGl', H: 'cHi', J: 'cH2', L: 'cLo', P: 'cDp', b: 'bore', o: 'leatherHi', i: 'leatherIn', r: 'lHi', d: 'lLo', f: 'frame', F: 'frameLight', s: 'fHi', t: 'fLo' }

  // ---------- the slide (moves with the shot) ----------
  const slide = { from: [2.75, 9.25, 6.75], to: [15.25, 12.5, 9.25], c: { all: 'chrome', down: 'chromeDark', east: 'chromeDark', west: 'chromeDark' }, grain: 0 }
  // Right side (north, the icon): a 2-texel frame, the front panel (the painter's chrome bands: white, light, mid
  // blue), the hook-shaped ejection port with the barrel hood in it, 2 ink columns, the rear serrations.
  paint(slide, 'north', a => {
    a.ring(2.75, 9.25, 15.25, 12.5)
    a.rect(10.5, 9.5, 11.0, 12.25, '#') // divider before the serrations
    for (let x = 11.0; x < 14.75; x += 0.75) a.rect(x + 0.5, 9.5, x + 0.75, 12.25, 'L') // serrations: 5 chunky ridges (2 lit texels, a lo groove)
    a.rect(11.0, 9.5, 14.75, 9.75, '-')
    a.rect(3.25, 9.5, 10.5, 9.75, '-') // the panel's lo band
    a.rect(3.25, 12.0, 7.0, 12.25, 'G') // and its white top band, stepping down at the rear end
    a.rect(5.25, 11.25, 7.0, 11.5, 'H') // (H = the band's own white, J = its light blue)
    a.rect(6.25, 10.5, 7.0, 10.75, 'J')
    // the port (PG3D's black hook): its front wall, the foot running back under the hood to the divider, the hood
    a.rect(7.0, 10.75, 7.75, 12.5, '#') // the front wall (the panel's frame, 2 texels like PG3D's)
    a.rect(7.0, 10.75, 10.5, 11.25, '#') // the foot, running back under the hood
    a.rect(7.75, 12.0, 10.5, 12.25, 'G') // the hood: glint, hi, base, a dark lower edge
    a.rect(7.75, 11.5, 10.5, 12.0, 'H')
    a.rect(7.75, 11.25, 10.5, 11.5, 'L')
    a.rect(7.75, 12.25, 10.5, 12.5, '#')
    a.rect(7.75, 11.5, 8.0, 12.0, '+')
  }, K)
  // Left side (south, first person): the long panel and the serrations.
  paint(slide, 'south', a => {
    a.ring(2.75, 9.25, 15.25, 12.5)
    a.rect(10.5, 9.5, 11.0, 12.25, '#')
    for (let x = 11.0; x < 14.75; x += 0.75) a.rect(x + 0.5, 9.5, x + 0.75, 12.25, 'L')
    a.rect(11.0, 9.5, 14.75, 9.75, '-')
    a.rect(3.25, 9.5, 10.5, 9.75, '-')
    a.rect(3.25, 12.0, 10.5, 12.25, 'G')
    a.rect(8.0, 11.25, 10.5, 11.5, 'H') // the bands step down toward the rear
    a.rect(9.25, 10.5, 10.5, 10.75, 'J')
    a.rect(4.0, 10.0, 6.5, 10.25, '#') // a small engraved line on the panel (a maker's mark)
    a.rect(4.0, 10.25, 6.5, 10.5, 'H')
  }, K)
  // The top (first person): the port wrapping onto it with the hood, the seam before the serrations, anti-glare
  // grooves along the rear between the sights.
  paint(slide, 'up', a => {
    a.rect(7.25, 6.75, 10.5, 7.75, '#') // the port, from the right edge in
    a.rect(7.5, 7.0, 9.75, 7.5, 'H') // the hood seen from above
    a.rect(7.5, 7.0, 9.75, 7.25, 'G')
    a.rect(10.5, 7.0, 11.0, 9.0, '#') // the seam (wraps the side dividers)
    for (let x = 11.5; x < 13.5; x += 0.5) a.rect(x, 7.25, x + 0.25, 8.75, 'L') // grooves (ridges, not ink: the sights stay clean)
    a.rect(3.0, 7.75, 7.0, 8.25, 'G') // a glint strip down the front top
  }, K)
  // The rear face (first person all the time): a framed plate; the stub sits in its middle.
  paint(slide, 'east', a => {
    a.ring(6.75, 9.25, 9.25, 12.5)
    a.rect(7.0, 9.5, 9.0, 9.75, '-')
    a.rect(7.0, 12.0, 9.0, 12.25, '+')
    a.rect(7.25, 11.5, 8.75, 11.75, '#') // two grooves above the stub
    a.rect(7.25, 11.75, 8.75, 12.0, 'L')
  }, K)
  const cap = { from: [1.75, 9.0, 6.5], to: [2.75, 12.25, 9.5], c: 'chrome', grain: 0 } // top under the slide's 12.5: aimed, no dark bar under the post
  paint(cap, 'west', a => {
    a.ring(7.0, 9.75, 9.0, 11.75, 'L') // the bore's rim
    a.rect(7.0, 9.5, 9.0, 9.75, '-')
    a.rect(6.75, 11.75, 9.25, 12.0, 'G')
  }, K)
  paint(cap, 'up', a => { a.rect(1.75, 7.75, 2.75, 8.25, 'G') }, K)

  // ---------- the frame (fixed) ----------
  const band = { from: [2.75, 8.5, 7.0], to: [15.0, 9.25, 9.0], c: 'frameLight' } // the frame band under the slide
  const dust = { from: [2.75, 6.75, 6.75], to: [7.75, 8.5, 9.25], c: { all: 'frame', up: 'frameLight' } } // the dust cover
  for (const dir of ['north', 'south']) paint(dust, dir, a => {
    // the plate row (PG3D's): lit navy plates between dark gaps, each with a lit corner, a shadow row under them
    a.rect(3.0, 7.0, 7.5, 7.25, 't')
    for (let k = 0; k < 4; k++) { const x = 3.25 + k; a.rect(x - 0.25, 7.25, x, 8.0, '#'); a.rect(x, 7.25, x + 0.75, 8.0, 'F'); a.rect(x, 7.75, x + 0.25, 8.0, 's') }
    a.rect(7.0, 7.25, 7.25, 8.0, '#')
    a.rect(3.0, 8.0, 7.5, 8.25, 's')
  }, K)
  paint(dust, 'west', a => { a.ring(7.5, 7.25, 8.5, 8.25); a.rect(7.75, 7.5, 8.25, 8.0, 'b') }, K) // the guide rod hole
  dust.deco.push({ k: 'rail', face: 'down', at: [3.0, 7.0], to: [7.5, 9.0], c: 'frame' })
  const frame = { from: [7.75, 7.5, 7.0], to: [15.0, 8.5, 9.0], c: 'frame', split: { x: [13.5] },
    deco: [{ k: 'rivets', face: 'sides', at: [9.25, 8.25], to: [9.75, 7.75], n: 1, size: 2, c: 'chrome' }] } // the takedown pin
  // The grip (raked 15 degrees): blood red, an orange streak, two screws, a palm swell, a maroon front strap.
  const gripCol = { all: 'leather', west: 'leatherDark', east: 'leatherDark', up: 'leatherDark', down: 'leatherDark' }
  const UP5 = ['north', 'south', 'east', 'west', 'up'] // (their undersides sit on the base plate: no face there)
  const grip = { from: [10.25, 1.0, 6.75], to: [14.0, 7.5, 9.25], c: gripCol, rot: G, dirs: UP5 }
  const swell = { from: [13.5, 1.0, 6.5], to: [14.5, 4.25, 9.5], c: gripCol, rot: G, dirs: UP5 } // the palm swell: steps out at the back
  for (const dir of ['north', 'south']) {
    paint(grip, dir, a => {
      a.rect(10.5, 1.25, 10.75, 7.25, 'd') // the front edge, a step darker
      a.rect(11.0, 4.25, 12.0, 7.0, 'r') // the light panel round the streak (it jogs back at the swell)
      a.rect(11.25, 1.5, 12.25, 4.5, 'r')
      a.rect(11.25, 4.5, 11.75, 6.75, 'o') // the orange streak
      a.rect(11.5, 1.75, 12.0, 4.5, 'o')
      a.rect(12.75, 5.75, 13.25, 6.25, 'b') // the upper screw
      a.rect(12.75, 5.5, 13.25, 5.75, 'd')
      a.rect(12.5, 2.25, 13.0, 2.75, 'b') // the lower screw
      a.rect(12.5, 2.0, 13.0, 2.25, 'd')
    }, K)
    paint(swell, dir, a => { a.rect(14.0, 1.25, 14.25, 4.0, '-') }, K)
  }
  grip.deco.push({ k: 'slots', face: 'west', at: [7.0, 7.0], to: [9.0, 3.5], n: 3 }) // finger grooves
  paint(grip, 'west', a => { a.ring(7.25, 1.5, 8.75, 3.0); a.rect(7.5, 1.75, 8.5, 2.75, 'i') }, K) // the front strap's inset
  paint(grip, 'east', a => { a.rect(6.75, 4.25, 9.25, 4.5, 'd') }, K) // the back strap: plain, a shadow row where the swell steps out
  const base = { from: [10.0, 0.0, 6.5], to: [14.75, 1.0, 9.5], c: { all: 'frame', up: 'frameLight' }, rot: G,
    deco: [{ k: 'rivets', face: 'sides', at: [10.75, 0.75], to: [14.0, 0.25], n: 2, size: 2, c: 'frameLight' },
      { k: 'slots', face: 'flats', at: [10.5, 7.0], to: [14.25, 9.0], n: 3, dir: 'v' }] }

  // ---------- the hands (pg.js spec.hands; handoff/2026-10-12/hands/PLAN.md) ----------
  // The right glove on the grip (its top centre under the frame, raked 15 degrees like the grip; the grip is 3.75 deep
  // and 2.5 wide, so the glove is 1.3 times the shared one); the left hand (only in the reload) under the magazine's
  // base plate: it pulls the magazine out, carries it away, brings the new one and slaps it home.
  const { then, hands } = pg
  const { OR, OL } = hands
  const RH = rig({ t: [12.15 - OR[0], 7.45 - OR[1], 8 - OR[2]], rot: [[[0, 0, 1], 15]], pivot: OR })
  const LH = rig({ t: [12.0 - OL[0], -1.4 - OL[1], 8 - OL[2]], rot: [[[0, 0, 1], 15]], pivot: OL })
  const gun = pgGun(name, {
    hands: { right: { at: RH, scale: 1.3, armScale: 0.85 }, left: { at: LH, shown: false, armScale: 0.85 }, leftTree: false },
    style: 'pg',
    density: D,
    ink: [22, 22, 26],
    palette: {
      chrome: [172, 210, 240], chromeDark: [108, 148, 186], frame: [40, 56, 74], frameLight: [76, 98, 120],
      leather: [124, 16, 10], leatherDark: [72, 12, 24], leatherHi: [204, 94, 28], steel: [120, 140, 162],
      bore: [16, 18, 24], sight: [40, 44, 54], post: [34, 38, 46], dot: [150, 255, 120], brass: [226, 182, 76],
      flash: [255, 196, 64], flashCore: [255, 248, 210],
      // derived tones (a skin that recolors the base recolors these too)
      cGl: { of: 'chrome', k: 2 }, cHi: { of: 'chrome', k: 1 }, cH2: { of: 'chrome', f: 1.2 }, cLo: { of: 'chrome', k: -1 }, cDp: { of: 'chrome', k: -2 },
      lHi: { of: 'leather', f: 1.22 }, lLo: { of: 'leather', k: -1 }, leatherIn: { of: 'leatherHi', f: 0.55 },
      fHi: { of: 'frameLight', k: 1 }, fLo: { of: 'frame', k: -1 }, fDp: { of: 'frame', k: -2 }
    },
    mats: {
      chrome: 'chrome', chromeDark: 'chrome', frame: 'metal', frameLight: 'metal', leather: 'paint', leatherDark: 'paint',
      leatherHi: 'paint', steel: 'metal', fDp: 'dark', bore: 'flat', sight: 'flat', post: 'flat', dot: 'glow', brass: 'gold',
      flash: 'glow', flashCore: 'glow'
    },
    parts: {
      body: [
        band, dust,
        { from: [3.0, 6.25, 7.25], to: [3.75, 6.75, 8.75], c: 'frame' }, // rail teeth
        { from: [4.25, 6.25, 7.25], to: [5.0, 6.75, 8.75], c: 'frame' },
        { from: [5.5, 6.25, 7.25], to: [6.25, 6.75, 8.75], c: 'frame' },
        frame,
        { from: [8.75, 8.5, 9.0], to: [11.5, 9.25, 9.25], c: 'steel', dirs: ['south', 'west', 'east', 'down'] }, // slide stop (left side)
        { from: [7.75, 5.5, 7.25], to: [8.75, 7.5, 8.75], c: 'chrome', grain: 0 }, // trigger guard: front
        { from: [7.25, 4.25, 7.25], to: [11.0, 5.5, 8.75], c: 'chrome', grain: 0 }, // its bottom
        { from: [6.75, 4.25, 7.5], to: [7.25, 5.0, 8.5], c: 'chromeDark' }, // the squared guard's front hook
        { from: [9.25, 5.75, 7.5], to: [10.0, 7.5, 8.5], c: 'chromeDark' }, // the trigger
        { from: [8.75, 5.5, 7.75], to: [10.75, 7.5, 8.25], c: 'fDp', dirs: ['north', 'south'] }, // the guard's dark web (PG3D's guard reads solid)
        grip, swell, base,
        { from: [2.0, 10.25, 7.25], to: [6.0, 11.5, 8.75], c: 'chromeDark' }, // the barrel: hidden until the slide recoils
        { from: [1.95, 10.5, 7.5], to: [2.0, 11.25, 8.5], c: 'bore', dirs: ['west'], outline: false }
      ],
      slide: [
        slide, cap,
        { from: [1.7, 10.0, 7.25], to: [1.75, 11.5, 8.75], c: 'bore', dirs: ['west'], outline: false }, // the square bore
        { from: [2.75, 12.5, 7.5], to: [3.5, SY, 8.5], c: 'post' }, // front sight (its own key: skins never recolor it)
        { from: [3.5, 12.75, 7.875], to: [3.55, 13.0, 8.125], c: 'dot', glow: true, dirs: ['east'] }, // its glowing dot
        { from: [13.5, 12.5, 6.75], to: [14.5, SY + 0.25, 7.5], c: 'post' }, // rear sight, two posts
        { from: [13.5, 12.5, 8.5], to: [14.5, SY + 0.25, 9.25], c: 'post' },
        { from: [14.5, 12.875, 7.0], to: [14.55, 13.125, 7.25], c: 'dot', glow: true, dirs: ['east'] },
        { from: [14.5, 12.875, 8.75], to: [14.55, 13.125, 9.0], c: 'dot', glow: true, dirs: ['east'] },
        paint({ from: [15.25, 9.75, 7.25], to: [16.0, 11.25, 8.75], c: 'chrome', grain: 0 }, 'east', a => { a.rect(7.75, 10.25, 8.25, 10.75, 'b') }, K) // the rear stub (3x6 texels deep/wide: its sides aren't all ink), its striker dot
      ],
      mag: [
        // In the grip (hidden inside it) until a reload drops it out.
        { from: [10.75, 1.25, 7.25], to: [13.5, 6.75, 8.75], c: 'steel', rot: G, grain: 0.08,
          deco: [{ k: 'holes', face: 'sides', at: [12.75, 6.0], to: [13.0, 2.0], pitch: [2, 4] }] }, // witness holes
        { from: [10.5, 0.25, 7.25], to: [13.75, 1.25, 8.75], c: { all: 'frame', up: 'frameLight' }, rot: G },
        { from: [11.5, 6.75, 7.75], to: [13.0, 7.25, 8.25], c: 'brass', rot: G, outline: false } // the top round (2 texels: no room for ink)
      ],
      flash: [
        { from: [-0.6, 9.9, 7.1], to: [1.8, 11.9, 8.9], c: 'flashCore', glow: true },
        { from: [-3.2, 10.4, 7.6], to: [-0.6, 11.4, 8.4], c: 'flash', glow: true },
        { from: [-0.1, 12.0, 7.6], to: [0.9, 13.6, 8.4], c: 'flash', glow: true },
        { from: [-0.1, 8.2, 7.6], to: [0.9, 9.8, 8.4], c: 'flash', glow: true },
        { from: [-0.1, 10.4, 5.4], to: [0.9, 11.4, 7.0], c: 'flash', glow: true },
        { from: [-0.1, 10.4, 9.0], to: [0.9, 11.4, 10.6], c: 'flash', glow: true }
      ]
    },
    hidden: ['flash'],
    noFull: ['flash'],
    display: display({
      firstperson: { rotation: [0, -80, 0], translation: [-5.35, 4.44, -1.13], scale: [0.56, 0.56, 0.56] },
      thirdperson: { rotation: [0, -90, -80], translation: [0, 3, 3], scale: [0.7, 0.7, 0.7] },
      gui: { rotation: [0, 180, -32], translation: [0, 0.5, 0], scale: [0.66, 0.66, 0.66] },
      ground: { rotation: [0, 0, -45], translation: [0, 4, 0], scale: [0.7, 0.7, 0.7] },
      fixed: { rotation: [0, 0, -45], translation: [0.25, 1.75, -0.25], scale: [0.7, 0.7, 0.7] },
      head: { rotation: [0, -90, 0], translation: [0, 13, 7], scale: [1, 1, 1] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 14, rearDepth: 2, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [-25, -60, 0], translation: [-6.56, 2.09, -1.96], scale: [0.56, 0.56, 0.56] }
    }
  })
  const GRIP = [12, 6, 8]
  // A shot (GunFx: a 6-tick cooldown after each shot): the flash for the first third, the gun kicks back and its
  // muzzle up, the slide snaps back and returns.
  const shot = (k = 1) => p => {
    const back = 1 - ease.out(Math.min(1, p / 0.85))
    return {
      show: p < 0.34 ? ['flash'] : [],
      gun: rig({ t: [1.1 * k * back, 0.2 * k * back, 0], rot: [[[0, 0, 1], -9 * k * back]], pivot: GRIP }),
      slide: rig({ t: [1.8 * ease.bump(p, 0, 0.75, 0.12), 0, 0] })
    }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' reload): the gun lifts toward the middle and rolls its
  // grip's bottom toward you (out from behind the right arm), the left hand comes up under the grip (0.03-0.12), pulls the magazine
  // down out of it (0.12-0.32) and carries it away, brings a new one (gone 0.4-0.46) and pushes it up in (0.46-0.7),
  // a palm slap (0.7-0.8), the hand drops away (0.8-0.92) and the gun rolls back. No slide pull. The sounds
  // (50_GS.yml): mag_out at tick 3, mag_in at 24.
  const magRig = drop => rig({ t: [-drop * Math.sin(15 * Math.PI / 180), drop, 0] })
  const BELOW = then(LH, rig({ t: [2, -12, 6], rot: [[[1, 0, 0], -20]], pivot: [12, -1.4, 8] })) // off the bottom edge
  const reload = p => {
    const roll = ease.ramp(p, 0, 0.12) * (1 - ease.ramp(p, 0.8, 1))
    const out = ease.ramp(p, 0.12, 0.32)
    const back = ease.ramp(p, 0.46, 0.7)
    const slap = ease.bump(p, 0.7, 0.8, 0.73)
    const drop = p < 0.46 ? -10 * out : -10 * (1 - back)
    // the left hand: up to the base plate, with the magazine, the slap's push, away
    let place
    if (p < 0.12) place = hands.mix(BELOW, LH, ease.ramp(p, 0.03, 0.12))
    else if (p < 0.8) place = then(then(LH, magRig(drop)), rig({ t: [0, 0.6 * slap, 0] }))
    else place = hands.mix(LH, BELOW, ease.ramp(p, 0.8, 0.92))
    return {
      gun: rig({ t: [0, 7 * roll + 0.5 * slap, 3 * roll], rot: [[[1, 0, 0], -35 * roll], [[0, 0, 1], -4 * slap]], pivot: [8, 8, 8] }),
      mag: magRig(drop),
      lhand: hands.pose(LH, place),
      show: p > 0.02 && p < 0.93 ? ['lhand'] : [],
      hide: p > 0.4 && p < 0.46 ? ['mag'] : []
    }
  }
  return {
    9: gun.byContext('', gun.cooldown('', 6, shot(1))),
    1009: gun.byContext('ads', gun.cooldown('ads', 6, shot(0.55))),
    2009: gun.byContext('sprint', gun.composite('sprint')),
    3009: gun.byContext('', gun.cooldown('', 32, reload)),
  }
}
