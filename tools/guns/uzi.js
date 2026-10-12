// The SMG slot (WeaponMechanics weapons\sub_machine_guns\Uzi.yml, title Uzi, shown as "Machine Gun"; skins Default 1,
// Scope +1000, Sprint +2000, Reload +3000). A recreation of Pixel Gun 3D's default primary, the "Machine Gun" (the
// owner, 2026-10-05: the sold guns remade as PG3D's; 2026-10-06: at the Photon Shotgun's level of detail; drawn by
// hand from the wiki's pictures, nothing taken from the game): an MP5A3-style SMG, matte navy-black, with a chunky
// muzzle block (a silver window), a hooded front sight, a long handguard (a light rail over a band of bevelled tiles,
// a thick near-black lower), a ring at the magazine well, light-slate receiver plates with stamped slots, a rear drum
// sight over the trigger (a pale drum), the red fire selector and its F mark, a long, gently curved black magazine with
// a wide light stripe on its rear half (as on the icon), a flared black grip, a chunky trigger guard, and an A3 stock
// (light struts over a dark web, a tall butt).
// Painted with the kit's PG3D painter (style 'pg', 4 texels a unit: material ramps, bands, bevels, seams, decals).
// Full-auto: fire held flickers the flash over a steady kick (first person); the Default state's cooldown is the draw
// (GunFx: 20 ticks when it's equipped); the reload follows WeaponMechanics' empty reload (Firearm_Action Open, the
// reload, Close: the charging handle is pulled back and locked first, the curved magazine is swapped along its own
// axis, the handle is slapped home last). Empty, it rests as usual (an MP5's bolt doesn't lock back), so the reload's
// first frame follows on from it. No cop holds it (cops: core.sk cop-model 9 / 8 / 7 / 5).
// Built along x, muzzle toward -x, centred on z = 8 (+z is the gun's left: the side first person sees; -z the right,
// the side the inventory icon shows); the sight line is y = SY.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_uzi'
  const SY = 11.8
  const BORE_Y = 8.4
  const DX = -2.05 // the muzzle face sits 2.05 further forward than the first version's (x -6.3): the flash moved with it
  const NS = ['north', 'south']
  // ---------- texture helpers (decals: model units in the face's plane, [x, y] on the sides) ----------
  // A pixel-art stamp sized to a rect (4 texels a unit), from a function of (column, row) -> a character.
  const stampRect = (x0, y0, x1, y1, fn, keys, more = {}) => {
    const w = Math.round(Math.abs(x1 - x0) * 4); const h = Math.round(Math.abs(y1 - y0) * 4)
    const rows = Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => fn(c, r, w, h)).join(''))
    return { k: 'stamp', at: [x0, y0], to: [x1, y1], rows, keys, ...more }
  }
  // The same stamp on both sides, its columns running along +x on each (the north face's u runs along -x).
  const stampNS = (x0, y0, x1, y1, fn, keys, more = {}) => [
    stampRect(x0, y0, x1, y1, fn, keys, { ...more, face: 'south' }),
    stampRect(x0, y0, x1, y1, (c, r, w, h) => fn(w - 1 - c, r, w, h), keys, { ...more, face: 'north' })
  ]
  // The handguard's tile band (the reference's two rows of bevelled squares): 3x3-texel tiles in a checker, the light
  // ones with a glint top-left and a shade along their bottom and right, the dark ones a deep edge there; tones derived
  // from bodyLight.
  const QUILT = { G: 'tileG', L: 'tileL', l: 'tileM', D: 'tileD', d: 'tileDD' }
  const quilt = (x0, y0, x1, y1, more) => stampRect(x0, y0, x1, y1, (c, r) => {
    const light = (Math.floor(c / 3) + Math.floor(r / 3)) % 2 === 0
    const tl = c % 3 === 0 && r % 3 === 0; const br = c % 3 === 2 || r % 3 === 2
    return light ? (tl ? 'G' : br ? 'l' : 'L') : (br ? 'd' : 'D')
  }, QUILT, more)
  // The light rail along the top of both sides (under the outline row): a lit row over the rail color.
  const rail = (x0, x1) => [
    { k: 'band', at: [x0, 10.25], to: [x1, 9.75], c: 'bodyHi' },
    { k: 'band', at: [x0 + 0.25, 10.25], to: [x1 - 0.25, 10.0], c: 'railHi' }
  ]
  // A "+" drum profile (the rear sight's knob from the side): the pale drum, lit top and front, in the navy housing
  // (the face's own ink outline round it).
  const PLUS = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => {
    const inP = (cc, rr) => cc >= 0 && rr >= 0 && cc < 7 && rr < 7 && ((cc >= 2 && cc <= 4) || (rr >= 2 && rr <= 4))
    if (!inP(c, r)) return 'K' // the navy housing around the drum (the reference's), the face's own ink outline round it
    if (r === 0 || c === 0) return 'h' // the lit top and front ends
    if (r === 6 || c === 6) return 'l' // the shaded bottom and rear ends
    return 's'
  }).join(''))
  const PLUSK = { s: 'sight', h: 'sightHi', l: 'sightLo', K: 'body' }
  // ---------- the magazine: long, gently curved (a slight banana), black with a wide light stripe on its rear half
  const MAG_TOP = [6.875, 6.5]
  const MAG_SEG = [[-4, 2.5], [-9, 2.25], [-15, 2.25]] // [angle about z (negative: the bottom forward), length]
  const magBoxes = []
  {
    let [cx, cy] = MAG_TOP
    MAG_SEG.forEach(([a, len], k) => {
      const z0 = 7.0 + 0.04 * k; const z1 = 9.0 - 0.04 * k // a hair narrower each step: no coplanar faces where they overlap
      const rot = { angle: a, axis: 'z', origin: [cx, cy, 8] }
      const top = cy + (k ? 0.25 : 0) // overlap the segment above (no gap on the outside of the bend)
      const sTop = k ? top : cy - 1.0 // the stripe starts under the well
      const last = k === MAG_SEG.length - 1
      magBoxes.push({ from: [cx - 1.375, cy - len, z0], to: [cx + 1.375, top, z1], c: 'magDark', rot })
      // The wide light stripe over the rear half: an unoutlined skin 0.06 proud on both sides, so it runs on across
      // the joints: an ink line on its front, the brightest edge next to it, the stripe, a shaded rear edge (texels 4..9
      // of the 11 across the body, so it lines up with the body's own texels); a bright tip at the bottom.
      magBoxes.push({
        from: [cx - 0.375, cy - len, z0 - 0.06], to: [cx + 1.125, sTop, z1 + 0.06], c: 'mag', dirs: NS, rot, outline: false, bands: false, bevel: 0,
        deco: stampNS(cx - 0.375, sTop, cx + 1.125, cy - len, (c, r, w, h) => c === 0 ? '#' : last && r === h - 1 ? 'H' : c === 1 ? 'H' : c === w - 1 ? 'm' : 'M', { H: 'magHi', M: 'mag', m: 'magMid' })
      })
      // The black front half gets a skin too (so the segments' joints don't show as ink rows): a faint lit line by the
      // front edge, then the black (the body's own outline stays on the front edge, the stripe's ink line on the rear).
      magBoxes.push({
        from: [cx - 1.125, cy - len, z0 - 0.06], to: [cx - 0.375, sTop, z1 + 0.06], c: 'magDark', dirs: NS, rot, outline: false, bands: false, bevel: 0, grain: 0,
        deco: stampNS(cx - 1.125, sTop, cx - 0.375, cy - len, c => c === 0 ? 'k' : 'K', { k: 'magDarkHi', K: 'magDark' })
      })
      const r = a * Math.PI / 180
      cx = Math.round((cx + len * Math.sin(r)) * 4) / 4; cy = Math.round((cy - len * Math.cos(r)) * 4) / 4 // on the 1/4 grid (the 1/4 overlap hides the step)
      if (k === MAG_SEG.length - 1) {
        const pr = { angle: a, axis: 'z', origin: [cx, cy, 8] }
        magBoxes.push({ from: [cx - 1.625, cy - 0.75, 6.875], to: [cx + 1.625, cy + 0.0, 9.125], c: 'magDark', rot: pr, deco: [{ k: 'band', at: [cx - 1.375, cy - 0.25], to: [cx - 0.625, cy - 0.5], c: 'magHi' }, { k: 'band', face: 'west', at: [7.125, cy - 0.25], to: [8.875, cy - 0.5], c: 'magDarkHi' }] }) // the floor plate, a light chip front-bottom
      }
    })
  }
  const gun = pgGun(name, {
    style: 'pg',
    density: 4,
    ink: [8, 9, 13],
    palette: {
      // navy body (the receiver, the housing, the front tube), its slate trims and the light rail (skins recolor these)
      body: [46, 54, 86], bodyLight: [112, 121, 150], bodyHi: [172, 179, 198], dark: [26, 29, 40],
      // derived (a skin that recolors the base recolors these): the near-black handguard and its top strip, the ledge,
      // the rail's lit row, the tile band
      bodyDeep: { of: 'body', f: 0.42 }, hgTop: { of: 'body', f: 0.62 }, bodyMid: { of: 'bodyLight', f: 0.56 }, railHi: { of: 'bodyHi', k: 1 },
      tileD: { of: 'bodyLight', f: 0.56 }, tileDD: { of: 'bodyLight', f: 0.42 }, tileL: { of: 'bodyLight', f: 1.0 }, tileM: { of: 'bodyLight', f: 0.84 }, tileG: { of: 'bodyLight', f: 1.3 },
      grip: [26, 30, 43], gripHi: { of: 'grip', k: 1 }, stock: [30, 33, 45],
      mag: [113, 121, 137], magHi: [160, 168, 186], magDark: [30, 32, 38], magDarkHi: { of: 'magDark', f: 1.5 }, magMid: { of: 'mag', f: 0.78 },
      red: [176, 36, 38], redHi: [236, 76, 70],
      // natural metal in every look
      steel: [124, 131, 156], muzzle: [24, 24, 29], silver: [168, 172, 186], silverHi: { of: 'silver', k: 2 }, silverLo: { of: 'silver', k: -1 }, slot: [60, 61, 68],
      // aimed through / never recolored (pg.js KEEP): the post, the sights' pale steel, the bore, the flash
      post: [22, 25, 34], sight: [168, 184, 202], sightHi: { of: 'sight', k: 1 }, sightLo: { of: 'sight', k: -1 }, bore: [10, 11, 15],
      flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: {
      body: 'metal', bodyLight: 'metal', bodyHi: 'metal', dark: 'dark', bodyDeep: 'dark', hgTop: 'dark', bodyMid: 'metal', railHi: 'metal',
      tileD: 'metal', tileDD: 'metal', tileL: 'metal', tileM: 'metal', tileG: 'metal',
      grip: 'dark', gripHi: 'dark', stock: 'dark', mag: 'metal', magHi: 'metal', magDark: 'dark', magDarkHi: 'dark', magMid: 'metal',
      red: 'paint', redHi: 'paint', steel: 'metal', muzzle: 'dark', silver: 'chrome', silverHi: 'chrome', silverLo: 'chrome', slot: 'dark',
      post: 'flat', sight: 'metal', sightHi: 'metal', sightLo: 'metal', bore: 'flat', flash: 'glow', flashCore: 'glow'
    },
    parts: {
      body: [
        // ---- the muzzle block: black, a silver window over a dark slot, a bevelled face round the bore
        { from: [-6.25, 7.0, 6.75], to: [-4.25, 9.75, 9.25], c: 'muzzle',
          deco: [
            { k: 'stamp', at: [-6.0, 9.25], to: [-4.5, 8.25], rows: ['######', 'hhhhhs', 'sssssl', '######'], keys: { h: 'silverHi', s: 'silver', l: 'silverLo' } },
            { k: 'band', at: [-6.0, 7.75], to: [-4.5, 7.25], c: 'slot' },
            { k: 'inset', face: 'west', at: [7.0, 9.5], to: [9.0, 7.25], c: 'slot' },
            { k: 'slots', face: 'up', at: [-6.0, 7.5], to: [-4.5, 8.5], n: 2 }
          ] },
        { from: [-6.3, BORE_Y - 0.5, 7.5], to: [-6.25, BORE_Y + 0.5, 8.5], c: 'bore', dirs: ['west'], outline: false },
        // ---- the front sight block, the hood and the post (its own key: never recolored), a pale chip on the hood
        { from: [-4.25, 7.25, 6.75], to: [-2.75, 11.0, 9.25], c: 'dark', split: { y: [10.5] },
          deco: [{ k: 'rivets', at: [-3.75, 8.5], to: [-3.25, 8.0], n: 1, size: 2, c: 'steel' }, { k: 'slots', at: [-4.0, 9.75], to: [-3.0, 9.25], n: 1 }] },
        { from: [-4.25, 11.0, 7.0], to: [-2.75, 12.5, 7.5], c: 'dark' },
        { from: [-4.25, 11.0, 8.5], to: [-2.75, 12.5, 9.0], c: 'dark' },
        { from: [-4.25, 12.5, 7.0], to: [-2.75, 13.0, 9.0], c: 'dark' },
        { from: [-3.5, 12.5, 6.75], to: [-2.5, 13.5, 9.25], c: 'sight' }, // the pale chip on the hood's top rear
        { from: [-3.75, 11.0, 7.75], to: [-3.25, SY, 8.25], c: 'post', outline: false },
        // ---- the front tube: the light rail along the top, a seam, the band of bevelled tiles; light lips on the top
        { from: [-2.75, 7.75, 6.75], to: [4.5, 10.5, 9.25], c: 'body', split: { y: [9.75] },
          deco: [
            ...rail(-2.75, 4.5),
            quilt(-2.5, 9.5, 4.25, 8.0),
            { k: 'band', face: 'up', at: [-2.75, 6.75], to: [4.5, 7.25], c: 'bodyHi' },
            { k: 'band', face: 'up', at: [-2.75, 8.75], to: [4.5, 9.25], c: 'bodyHi' },
            { k: 'slots', face: 'up', at: [-2.5, 7.875], to: [4.25, 8.125], n: 1 }
          ] },
        // the charging handle's tube on the left (+z): the rail's lit rows run on along it (as on the receiver), the slot
        // the handle runs in a dark row (4 texels tall: an inset would be all ink)
        { from: [-2.75, 9.5, 9.25], to: [4.25, 10.5, 9.75], c: 'body', bevel: 0,
          deco: [
            { k: 'band', face: 'south', at: [-2.75, 10.25], to: [4.25, 10.0], c: 'railHi' },
            { k: 'band', face: 'south', at: [-2.75, 10.0], to: [4.25, 9.75], c: 'bodyHi' },
            { k: 'band', face: 'south', at: [-2.0, 10.0], to: [2.75, 9.75], c: 'bodyDeep' }
          ] },
        // ---- the thick near-black handguard (wider than the tube: its top is a ledge), a seam under its top strip
        { from: [-2.75, 5.5, 6.25], to: [4.5, 7.75, 9.75], c: { all: 'bodyDeep', up: 'bodyMid' }, split: { y: [7.0] }, grain: 0.05,
          deco: [
            { k: 'band', at: [-2.75, 7.75], to: [4.5, 7.0], c: 'hgTop' },
            { k: 'slots', face: 'up', at: [-2.5, 6.25], to: [4.25, 6.75], n: 1 }, { k: 'slots', face: 'up', at: [-2.5, 9.25], to: [4.25, 9.75], n: 1 },
            { k: 'slots', face: 'down', at: [-2.5, 6.5], to: [4.25, 9.5], n: 3 }
          ] },
        { from: [-2.5, 4.75, 6.75], to: [4.25, 5.5, 9.25], c: 'bodyDeep', deco: [{ k: 'slots', face: 'down', at: [-2.25, 7.0], to: [4.0, 9.0], n: 2 }] }, // the bevel under it
        // the band (the handguard's rear ring) with a light edge
        { from: [4.5, 4.75, 6.0], to: [5.5, 10.75, 10.0], c: 'dark', split: { y: [8.0] }, deco: [{ k: 'band', at: [4.75, 10.5], to: [5.0, 5.0], c: 'bodyLight' }] },
        // ---- the receiver: the rail, a light-slate plate with a stamped slot (the ejection port on the right), pins
        { from: [5.5, 8.0, 6.75], to: [13.75, 10.5, 9.25], c: 'body', split: { y: [9.75] },
          deco: [
            ...rail(5.5, 13.75),
            { k: 'band', at: [5.75, 9.5], to: [13.5, 8.25], c: 'bodyLight' },
            { k: 'slots', face: 'south', at: [6.5, 9.0], to: [10.5, 8.75], n: 1 },
            { k: 'inset', face: 'north', at: [6.25, 9.25], to: [10.5, 8.75], c: 'bodyDeep' },
            { k: 'slots', at: [11.0, 9.0], to: [13.0, 8.75], n: 1 },
            { k: 'band', face: 'up', at: [5.5, 6.75], to: [13.75, 7.25], c: 'bodyHi' },
            { k: 'band', face: 'up', at: [5.5, 8.75], to: [13.75, 9.25], c: 'bodyHi' },
            { k: 'ribs', face: 'up', at: [5.75, 7.5], to: [10.5, 8.5], c: 'bodyLight' }
          ] },
        // ---- the magazine well, its light lip; the paddle release behind it
        { from: [5.5, 5.5, 6.75], to: [8.25, 8.0, 9.25], c: 'body', deco: [{ k: 'band', at: [5.5, 6.25], to: [8.25, 5.5], c: 'bodyLight' }, { k: 'slots', at: [5.75, 7.75], to: [8.0, 7.25], n: 1 }] },
        { from: [8.25, 5.25, 7.25], to: [9.0, 6.0, 8.75], c: 'dark' },
        // ---- the trigger housing: a light top strip, the red selector and its F mark, stepped trims, push pins
        { from: [8.25, 6.0, 6.75], to: [13.75, 8.0, 9.25], c: 'body',
          deco: [
            { k: 'band', at: [8.25, 8.0], to: [13.75, 7.5], c: 'bodyLight' },
            { k: 'band', at: [8.25, 6.5], to: [12.25, 6.0], c: 'bodyLight' },
            { k: 'band', at: [9.0, 7.5], to: [10.25, 6.75], c: 'red' }, // the selector lever
            { k: 'stamp', at: [9.75, 7.25], to: [10.0, 7.0], rows: ['r'], keys: { r: 'redHi' } },
            { k: 'band', at: [10.25, 7.0], to: [10.75, 6.5], c: 'steel' }, // a light chip under its rear
            { k: 'band', at: [11.25, 7.25], to: [12.0, 6.75], c: 'red' }, // the F mark
            { k: 'rivets', at: [12.5, 7.25], to: [13.5, 6.75], n: 2, size: 2, c: 'steel' } // push pins
          ] },
        // ---- the end cap: a latch slot and a pin
        { from: [13.75, 6.5, 6.75], to: [14.75, 10.75, 9.25], c: 'dark',
          deco: [{ k: 'inset', at: [13.75, 9.25], to: [14.75, 7.75], c: 'bodyDeep' }, { k: 'rivets', at: [14.0, 10.25], to: [14.5, 9.75], n: 1, size: 2, c: 'steel' }] },
        // ---- the rear drum sight over the trigger: a base, navy housing ears (0.5 thick, a step in front) with the drum's "+", the pale ring
        //      (its rear face is the aim's rearX 12.5; its opening y 11.25..12.5, z 7.5..8.5 holds the sight line)
        { from: [10.75, 10.5, 7.0], to: [12.75, 11.25, 9.0], c: 'body' },
        { from: [9.75, 10.5, 6.5], to: [10.5, 11.5, 7.0], c: 'body' },
        { from: [10.5, 10.5, 6.5], to: [12.75, 12.75, 7.0], c: 'body', deco: [{ k: 'stamp', face: 'north', at: [10.75, 12.5], to: [12.5, 10.75], rows: PLUS, keys: PLUSK }] },
        { from: [9.75, 10.5, 9.0], to: [10.5, 11.5, 9.5], c: 'body' },
        { from: [10.5, 10.5, 9.0], to: [12.75, 12.75, 9.5], c: 'body', deco: [{ k: 'stamp', face: 'south', at: [10.75, 12.5], to: [12.5, 10.75], rows: PLUS, keys: PLUSK }] },
        { from: [11.0, 11.25, 7.0], to: [12.5, 12.5, 7.5], c: 'sight' },
        { from: [11.0, 11.25, 8.5], to: [12.5, 12.5, 9.0], c: 'sight' },
        { from: [11.0, 12.5, 7.0], to: [12.5, 13.0, 9.0], c: 'sight' },
        // ---- the trigger guard (chunky) and the trigger
        { from: [8.25, 4.25, 7.25], to: [9.0, 6.0, 8.75], c: 'body' },
        { from: [8.25, 4.25, 7.25], to: [11.5, 5.0, 8.75], c: 'body' },
        { from: [9.75, 5.0, 7.75], to: [10.25, 6.0, 8.25], c: 'steel', outline: false },
        // ---- the grip, raked 15 degrees: a top, a palm swell flaring to the rear, a base; a stepped light front edge, a dark panel
        ...[
          { from: [10.75, 3.5, 7.0], to: [13.25, 6.25, 9.0], c: 'grip',
            deco: [{ k: 'band', at: [10.75, 6.0], to: [11.25, 3.5], c: 'gripHi' }, { k: 'inset', at: [11.5, 5.75], to: [13.0, 3.75], c: 'grip' }] },
          { from: [10.5, 1.75, 6.75], to: [14.0, 3.5, 9.25], c: 'grip', pat: { north: 'knurl', south: 'knurl', all: 'flat' },
            deco: [{ k: 'band', at: [10.5, 3.5], to: [11.0, 1.75], c: 'gripHi' }] },
          { from: [10.25, 1.25, 6.75], to: [14.25, 1.75, 9.25], c: 'dark' }
        ].map(b => ({ ...b, rot: { angle: 15, axis: 'z', origin: [12.0, 6.25, 8] } }))
      ],
      // The A3 stock (its own part: hidden while aiming, where it would sit against the cheek): two dark struts with
      // light top edges, a recessed dark web between them, a tall butt plate with a light front edge, a pad, a sling chip.
      stock: [
        { from: [14.75, 9.0, 7.0], to: [20.0, 10.0, 9.0], c: 'stock', rot: { angle: -12, axis: 'z', origin: [14.75, 9.75, 8] },
          deco: [{ k: 'band', at: [14.75, 10.0], to: [20.0, 9.5], c: 'bodyLight' }, { k: 'band', face: 'up', at: [14.75, 7.25], to: [20.0, 7.5], c: 'bodyLight' }, { k: 'band', face: 'up', at: [14.75, 8.5], to: [20.0, 8.75], c: 'bodyLight' }, { k: 'slots', face: 'up', at: [15.0, 7.75], to: [19.75, 8.25], n: 1 }] },
        { from: [14.75, 6.5, 7.0], to: [20.25, 7.5, 9.0], c: 'stock', rot: { angle: -24, axis: 'z', origin: [14.75, 7.0, 8] },
          deco: [{ k: 'band', at: [14.75, 7.5], to: [20.25, 7.0], c: 'bodyLight' }] },
        { from: [14.75, 7.25, 7.5], to: [19.75, 9.25, 8.5], c: 'stock', grain: 0.05, rot: { angle: -12, axis: 'z', origin: [14.75, 9.75, 8] }, deco: [{ k: 'inset', at: [15.0, 9.0], to: [19.5, 7.5], c: 'stock' }] },
        { from: [14.75, 7.5, 7.5], to: [19.75, 8.75, 8.5], c: 'stock', grain: 0.05, rot: { angle: -24, axis: 'z', origin: [14.75, 7.0, 8] } },
        { from: [19.5, 4.25, 6.75], to: [20.5, 9.5, 9.25], c: 'stock',
          deco: [{ k: 'band', at: [19.75, 9.25], to: [20.0, 4.5], c: 'bodyLight' }, { k: 'rivets', at: [20.0, 9.0], to: [20.5, 8.5], n: 1, size: 2, c: 'steel' }] },
        { from: [20.5, 4.0, 6.75], to: [21.0, 9.75, 9.25], c: 'dark', deco: [{ k: 'slots', face: 'east', at: [7.0, 9.5], to: [9.0, 4.25], n: 5 }] }
      ],
      bolt: [
        // The charging handle: a stem out of the tube's slot and a knurled knob.
        { from: [-1.75, 9.75, 9.75], to: [-1.25, 10.25, 10.5], c: 'steel', outline: false },
        { from: [-2.25, 9.25, 10.5], to: [-0.5, 10.5, 11.75], c: 'steel', pat: 'knurl' }
      ],
      mag: magBoxes,
      flash: [
        { from: [-7.4 + DX, BORE_Y - 1.4, 6.6], to: [-4.3 + DX, BORE_Y + 1.4, 9.4], c: 'flashCore', glow: true },
        { from: [-11.4 + DX, BORE_Y - 0.6, 7.4], to: [-7.4 + DX, BORE_Y + 0.6, 8.6], c: 'flash', glow: true },
        { from: [-6.5 + DX, BORE_Y + 1.4, 7.4], to: [-5.3 + DX, BORE_Y + 4.0, 8.6], c: 'flash', glow: true },
        { from: [-6.5 + DX, BORE_Y - 4.0, 7.4], to: [-5.3 + DX, BORE_Y - 1.4, 8.6], c: 'flash', glow: true },
        { from: [-6.5 + DX, BORE_Y - 0.6, 4.0], to: [-5.3 + DX, BORE_Y + 0.6, 6.6], c: 'flash', glow: true },
        { from: [-6.5 + DX, BORE_Y - 0.6, 9.4], to: [-5.3 + DX, BORE_Y + 0.6, 12.0], c: 'flash', glow: true }
      ],
      // A smaller flash (the flicker's second size).
      flash2: [
        { from: [-6.5 + DX, BORE_Y - 1.0, 7.0], to: [-4.3 + DX, BORE_Y + 1.0, 9.0], c: 'flashCore', glow: true },
        { from: [-9.3 + DX, BORE_Y - 0.45, 7.55], to: [-6.5 + DX, BORE_Y + 0.45, 8.45], c: 'flash', glow: true },
        { from: [-5.9 + DX, BORE_Y + 1.0, 7.55], to: [-5.0 + DX, BORE_Y + 2.8, 8.45], c: 'flash', glow: true },
        { from: [-5.9 + DX, BORE_Y - 2.8, 7.55], to: [-5.0 + DX, BORE_Y - 1.0, 8.45], c: 'flash', glow: true }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -78, 0], translation: [-4.6, 3.1, -0.8], scale: [0.52, 0.52, 0.52] },
      thirdperson: { rotation: [0, -90, -80], translation: [0, 3, 3], scale: [0.66, 0.66, 0.66] },
      gui: { rotation: [0, 180, -35], translation: [0.2, 0.4, 0], scale: [0.6, 0.6, 0.6] },
      ground: { rotation: [0, 0, -45], translation: [0, 4, 0], scale: [0.56, 0.56, 0.56] },
      fixed: { rotation: [0, 0, -45], translation: [0, 1, 0], scale: [0.56, 0.56, 0.56] },
      head: { rotation: [0, -90, 0], translation: [0, 13, 7], scale: [1, 1, 1] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 12.5, rearDepth: 1.1, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [-15, -40, 20], translation: [-4.0, 2.0, -1.6], scale: [0.52, 0.52, 0.52] }
    }
  })
  const GRIP = [12, 5.5, 8]
  const MUZZLE = [-5.5 + DX, BORE_Y, 8]
  // Fire held (full-auto, 11 shots a second): the gun sits kicked back (k scales it: aiming, less) and each rendered
  // frame shows one of these at random: the flash in two sizes and two turns, or none, over a small jitter. The
  // client re-rolls a non-wobbling random every frame, so the kick is the same in each and only the jitter and the
  // flash change (a whole kick re-rolled every frame would shake).
  const fire = (k, also = {}) => {
    const kick = (dx, dz, up, yaw) => rig({ t: [(0.45 + dx) * k, 0.1 * k, dz * k], rot: [[[0, 0, 1], -(2.8 + up) * k], [[0, 1, 0], yaw * k]], pivot: GRIP })
    return [
      { ...also, show: ['flash'], gun: kick(0.08, 0.05, 0.4, 0.3) },
      { ...also, show: ['flash2'], gun: kick(-0.06, -0.06, -0.3, -0.4), flash2: rig({ rot: [[[1, 0, 0], 45]], pivot: MUZZLE }) },
      { ...also, show: ['flash'], gun: kick(0.1, 0.02, 0.6, -0.2), flash: rig({ rot: [[[1, 0, 0], 45]], pivot: MUZZLE }) },
      { ...also, gun: kick(-0.12, 0, -0.5, 0.1) }
    ]
  }
  // The draw (GunFx: 20 ticks when it's equipped): the gun comes up from below the screen, muzzle down and canted,
  // and levels out.
  const draw = p => {
    const e = 1 - ease.out(Math.min(1, p / 0.9))
    return { gun: rig({ t: [1.5 * e, -8 * e, 0], rot: [[[1, 0, 0], -14 * e], [[0, 0, 1], 30 * e]], pivot: GRIP }) }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' whole reload: 41 ticks empty = Firearm_Action Open 5,
  // the reload 31, Close 5; 31 ticks with rounds left). Timed to the empty one and its sounds (Uzi.yml): p = 0 Open
  // (the handle back and locked, two clicks), 5/41 = 0.12 mag_out, 32/41 = 0.78 mag_in (Start_Mechanics, 27 ticks
  // late), 36/41 = 0.88 Close (the handle slapped home): the gun cants (its top to the right, the magazine side toward
  // the player) and turns to the handle, which is pulled back and held; the curved magazine slides out along its own
  // axis, a new one slides in and is slapped home, the handle is let go (a jolt), the gun comes back level by p = 0.96
  // (the last frame is sampled at 0.99). With rounds left the same moves run in 31 ticks: mag_out at 0, the click 3
  // ticks after the seat, the handle silent.
  const MAG_DIR = (a => [Math.sin(a), -Math.cos(a)])(-4 * Math.PI / 180) // the well's axis (the top segment's): down, a bit forward
  const reload = p => {
    const cant = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.86, 0.96))
    const pull = ease.ramp(p, 0.01, 0.07) * (1 - ease.ramp(p, 0.88, 0.92))
    const tug = ease.bump(p, 0.02, 0.12, 0.06)
    const look = ease.bump(p, 0.01, 0.17, 0.05, 0.1) + ease.bump(p, 0.84, 0.95, 0.87, 0.9) // a look at the handle
    const out = ease.ramp(p, 0.12, 0.3)
    const back = ease.ramp(p, 0.5, 0.78)
    const slap = ease.bump(p, 0.78, 0.85, 0.8)
    const kick = ease.bump(p, 0.89, 0.95, 0.905)
    const d = p < 0.5 ? 12 * out : 12 * (1 - back) // 12: the longer magazine clears the well
    return {
      gun: rig({ t: [0.4 * tug + 0.6 * kick, 1.2 * cant + 0.5 * slap, 0], rot: [[[1, 0, 0], -22 * cant], [[0, 1, 0], 9 * cant + 8 * look], [[0, 0, 1], -3 * slap - 2.5 * kick + 1.5 * tug]], pivot: GRIP }),
      mag: rig({ t: [d * MAG_DIR[0], d * MAG_DIR[1], 0] }),
      bolt: rig({ t: [3.8 * pull, 0, 0] }),
      hide: p > 0.3 && p < 0.5 ? ['mag'] : []
    }
  }
  const AIMED = { hide: ['stock'] }
  // Default: the draw while its cooldown runs, else fire held / the rest pose.
  const drawn = gun.cooldown('', 20, draw)
  drawn.fallback = gun.firing('', fire(1))
  return {
    1: gun.byContext('', drawn),
    1001: gun.byContext('ads', gun.firing('ads', fire(0.45, AIMED), AIMED)),
    2001: gun.byContext('sprint', gun.composite('sprint')),
    3001: gun.byContext('', gun.cooldown('', 41, reload))
  }
}
