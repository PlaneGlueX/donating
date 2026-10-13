// The Brave Patriot (WeaponMechanics weapons\assault_rifles\STG44.yml, title STG44, shown as "Brave Patriot"; skins
// Default 15, Scope +1000, Sprint +2000, Reload +3000; 2026-10-06, remade at the Photon Shotgun's level of detail the
// same day). A recreation of Pixel Gun 3D's WWII tommy gun, the "Brave Patriot" (drawn by hand from the wiki's
// pictures, nothing taken from the game), with a round drum instead of its stick magazine (50 rounds): neutral grey
// metal (a Cutts compensator slotted on top over a dark muzzle cap, a finned barrel, a ringed receiver in two plates
// with a long side groove, an ejection port on the right, a brass star and two levers on the left, a brass cocking
// knob in its slot, an aperture rear sight with ears and a blade front sight), a long wooden handguard in three bands
// (orange with a peach streak, red, a deep red bottom, its front end and bottom stepping up toward the muzzle), a big
// raked wooden grip in voxel steps (a lit front edge, a palm swell, a red toe, a screw) and PG3D's dropped, fanning
// "banana" stock in voxel steps (orange over red, a peach band along its stepped top, lit stair risers, a black butt
// plate with two screws), the drum (a dark rim, a grey face, a dark ring, a centre plate, four bolts, a brass winding
// key) on a riveted rail under the receiver. Painted with the kit's PG painter (style 'pg', density 4: materials with
// 4-5 tones, bevels, seams and decals). Full-auto, 9 rounds a second: fire held flickers the flash (out of the muzzle
// and up out of the compensator's slots) over a steady kick, the knob cycling. The Default state's cooldown is the
// draw (GunFx: 22 ticks when it's equipped). Hit-contract bodyguards hold it (third person matters).
// Built along x, muzzle toward -x, centred on z = 8 (+z is the gun's left: the side first person sees; the inventory
// icon and third person show the right side, -z); the sight line is y = SY, through the rear aperture to the front
// blade's tip.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_tommy'
  const SY = 11.2
  const BORE_Y = 8.0
  // The drum: stepped round discs about (DX, DY) in the x-y plane (each a pixel circle of four boxes, each a hair
  // thinner in z than the one before: no coplanar faces where they overlap; no outline: the dark rim is its edge).
  const DX = 7.5
  const DY = 2.75
  const SIDES = ['north', 'south']
  // A disc's light (the same rows on its four boxes: model coordinates): its top rows a step lighter ('+'), its bottom
  // rows a step darker ('-'), on the side faces.
  const lit = (r, top, bot) => [
    { k: 'stamp', at: [DX - r - 1, DY + r], to: [DX + r + 1, DY + r - top], rows: Array.from({ length: Math.round(top * 4) }, () => '+'.repeat(40)) },
    ...(bot ? [{ k: 'stamp', at: [DX - r - 1, DY - r + bot], to: [DX + r + 1, DY - r], rows: Array.from({ length: Math.round(bot * 4) }, () => '-'.repeat(40)) }] : [])
  ]
  const disc = (r, z0, z1, c, more = {}) => [[1, 0.44], [0.86, 0.72], [0.72, 0.86], [0.44, 1]].map(([hx, hy], k) =>
    ({ from: [DX - r * hx, DY - r * hy, z0 + 0.025 * k], to: [DX + r * hx, DY + r * hy, z1 - 0.025 * k], c, outline: false, bands: false, bevel: 0, ...more }))
  // An ink rectangle on a box's side faces (model x/y; 4 texels a unit), drawn with the gun's (or a skin's) outline
  // color: the stock's slabs draw their own outline only where the union's edge is, so their side faces join with no
  // seam (the kit outlines every face of a box all round).
  const inkRect = (x0, y0, x1, y1, face) => {
    const w = Math.round(Math.abs(x1 - x0) * 4); const h = Math.round(Math.abs(y1 - y0) * 4)
    return { k: 'stamp', face, at: [Math.min(x0, x1), Math.max(y0, y1)], to: [Math.max(x0, x1), Math.min(y0, y1)], rows: Array.from({ length: h }, () => '#'.repeat(w)) }
  }
  // The stock's side faces as cells [x0, x1, bottom, top] (the wrist, then cells stepping down and fanning out): no
  // outline of their own (ink only on the union's edge), a peach band under the top, the lower part red. Its other
  // faces come from the treads and the underside steps (stockFaces).
  const Z0 = 6.75
  const Z1 = 9.25
  const stockOf = cells => cells.flatMap(([x0, x1, b, t], i) => {
    const prev = cells[i - 1]; const next = cells[i + 1]
    const deco = [inkRect(x0, t - 0.25, x1, t), inkRect(x0, b, x1, b + 0.25)]
    // the west and east edges: ink where this cell sticks out past its neighbour (all of it at the ends)
    const edge = (x, nb) => {
      if (!nb) return [inkRect(x, b, x + 0.25, t)]
      const out = []
      if (t > nb[3]) out.push(inkRect(x, nb[3], x + 0.25, t))
      if (b < nb[2]) out.push(inkRect(x, b, x + 0.25, nb[2]))
      return out
    }
    deco.push(...edge(x0, prev), ...edge(x1 - 0.25, next))
    // a peach band under the top edge, the lower ~40% red, a lit texel row on top of the red
    deco.unshift({ k: 'band', at: [x0, t - 0.25], to: [x1, t - 0.75], c: 'woodL' })
    const rb = b + Math.max(0.5, Math.round(0.4 * (t - b) * 4) / 4)
    deco.unshift({ k: 'band', at: [x0, rb], to: [x1, b], c: 'woodD' })
    return [{ from: [x0, b, Z0], to: [x1, t, Z1], c: 'wood', dirs: SIDES, outline: false, bands: false, bevel: 0, pat: 'flat', grain: 0.05, deco }]
  })
  // The handguard as one wooden piece in profile cells [x0, x1, bottom, top] (its bottom stepping up toward the muzzle):
  // side faces with ink only on the union's edge and 1-texel seams between the bands (orange, red, deep red), the top
  // one box (no seams across it), each cell's front riser and underside outlined.
  const HG = [[-5.0, -4.5, 6.0, 7.25], [-4.5, -3.75, 4.75, 7.25], [-3.75, -1.25, 4.0, 7.25], [-1.25, 2.5, 3.5, 7.25]]
  const handOf = cells => [
    ...cells.flatMap(([x0, x1, b, t], i) => {
      const prev = cells[i - 1]; const next = cells[i + 1]
      const deco = [inkRect(x0, t - 0.25, x1, t), inkRect(x0, b, x1, b + 0.25)]
      if (!prev) deco.push(inkRect(x0, b, x0 + 0.25, t)); else if (b < prev[2]) deco.push(inkRect(x0, b, x0 + 0.25, prev[2]))
      if (!next) deco.push(inkRect(x1 - 0.25, b, x1, t))
      const bands = []
      if (b < 6.0) { bands.push({ k: 'band', at: [x0, 6.0], to: [x1, Math.max(b, 4.75)], c: 'woodD' }); deco.push(inkRect(x0, 6.0, x1, 6.25)) }
      if (b < 4.75) { bands.push({ k: 'band', at: [x0, 4.75], to: [x1, b], c: 'woodDD' }); deco.push(inkRect(x0, 4.75, x1, 5.0)) }
      const sx0 = Math.max(x0, -2.5); const sx1 = Math.min(x1, 1.5)
      // the orange band's lit top row (under the top ink), the peach streak under it near the rear
      bands.push({ k: 'stamp', at: [x0, 7.0], to: [x1, 6.75], rows: ['+'.repeat(Math.round((x1 - x0) * 4))] })
      if (sx1 > sx0) bands.push({ k: 'band', at: [sx0, 6.75], to: [sx1, 6.5], c: 'woodL' })
      const west = !prev ? 'woodL' : b >= 4.75 ? 'wood' : 'woodD'
      return [
        { from: [x0, b, 6.75], to: [x1, t, 9.25], c: 'wood', dirs: SIDES, outline: false, bands: false, bevel: 0, pat: 'flat', grain: 0.05, deco: [...bands, ...deco] },
        { from: [x0, b, 6.75], to: [x1, t, 9.25], c: { all: 'woodDD', down: 'woodDD', west }, dirs: ['down', 'west'], pat: 'flat' }
      ]
    }),
    { from: [cells[0][0], 6.0, 6.75], to: [cells[cells.length - 1][1], 7.25, 9.25], c: 'woodL', dirs: ['up'], pat: 'flat' }
  ]
  // The stock's top in treads [x0, x1, top] (a long one under the receiver's end, then 1-unit drops: each riser shows
  // two lit texels) and its underside in steps [x0, x1, bottom] (falling steeply, then flattening into the tall butt: a
  // banana that fans out); the side cells are cut at every x where either changes.
  const TOP = [[15.75, 18.75, 9.0], [18.75, 21.0, 8.0], [21.0, 23.0, 7.0], [23.0, 24.75, 6.0], [24.75, 26.25, 5.0], [26.25, 27.5, 4.0]]
  const BOT = [[15.75, 17.0, 5.5], [17.0, 18.25, 4.5], [18.25, 19.5, 3.25], [19.5, 20.75, 2.0], [20.75, 22.0, 0.75], [22.0, 23.25, -0.25], [23.25, 24.5, -1.0], [24.5, 25.75, -1.5], [25.75, 27.5, -2.0]]
  const at = (list, x) => list.find(([x0, x1]) => x >= x0 - 1e-9 && x < x1 - 1e-9)[2]
  const xs = [...new Set([...TOP, ...BOT].flatMap(([x0, x1]) => [x0, x1]))].sort((p, q) => p - q)
  const STOCK = xs.slice(0, -1).map((x0, i) => [x0, xs[i + 1], at(BOT, x0), at(TOP, x0)])
  const stockFaces = cells => {
    const sides = stockOf(cells)
    const treads = TOP.map(([x0, x1, t], j) => {
      const nt = TOP[j + 1] ? TOP[j + 1][2] : t - 1
      // the first tread (the long flat one under the receiver's end, big at hip): two peach grain streaks
      const deco = j === 0 ? [
        { k: 'band', face: 'up', at: [16.25, 8.25], to: [18.25, 8.5], c: 'woodL' },
        { k: 'band', face: 'up', at: [17.25, 7.5], to: [18.5, 7.75], c: 'woodL' }
      ] : []
      return { from: [x0, nt, Z0], to: [x1, t, Z1], c: { all: 'wood', up: 'wood', east: 'woodL' }, dirs: TOP[j + 1] ? ['up', 'east'] : ['up'], pat: 'flat', grain: 0.05, deco }
    })
    const unders = BOT.map(([x0, x1, bb], j) => {
      const pb = BOT[j - 1] ? BOT[j - 1][2] : bb + 1
      return { from: [x0, bb, Z0], to: [x1, pb, Z1], c: { all: 'woodDD', down: 'woodDD', west: 'woodL' }, dirs: BOT[j - 1] ? ['down', 'west'] : ['down'], pat: 'flat' }
    })
    return [...sides, ...treads, ...unders]
  }
  // The pistol grip the same way, as layers stacked top to bottom [bottom, top, front x, rear x]: each a step further
  // back than the one above (raked like PG3D's, in voxel steps like the stock), a palm swell at the back, a toe at the
  // bottom. Its side faces: ink only on the union's edge, a lit strip down the front edge, the lower layers red; its
  // other faces outlined (the front risers lit, the ledges, the deep red underside).
  const G0 = 6.75
  const G1 = 9.25
  const gripOf = cells => cells.flatMap(([b, t, f, r], i) => {
    const up = cells[i - 1]; const dn = cells[i + 1]
    const deco = [inkRect(f, b, f + 0.25, t), inkRect(r - 0.25, b, r, t)]
    // the top and bottom edges: ink where this layer sticks out past its neighbour (all of it at the ends)
    const edge = (y, nb) => {
      if (!nb) return [inkRect(f, y, r, y + 0.25)]
      const out = []
      if (f < nb[2]) out.push(inkRect(f, y, Math.min(r, nb[2]), y + 0.25))
      if (r > nb[3]) out.push(inkRect(Math.max(f, nb[3]), y, r, y + 0.25))
      return out
    }
    deco.push(...edge(t - 0.25, up), ...edge(b, dn))
    // the grip screw (both sides)
    if (b <= 3.0 && t >= 3.0) deco.unshift({ k: 'rivets', at: [14.75, 3.25], to: [15.25, 2.75], n: 1, size: 2, c: 'metalL' })
    // a lit strip down the front edge, the lower layers red (deep red at the toe)
    deco.unshift({ k: 'band', at: [f + 0.25, t], to: [f + 0.5, b], c: 'woodL' })
    const last = i === cells.length - 1
    if (last) deco.unshift({ k: 'band', at: [f, b + 0.5], to: [r, b + 0.25], c: 'woodDD' })
    if (last || i === cells.length - 2) deco.unshift({ k: 'band', at: [f, last ? t : b + 0.5], to: [r, b], c: 'woodD' })
    return [
      { from: [f, b, G0], to: [r, t, G1], c: 'wood', dirs: SIDES, outline: false, bands: false, bevel: 0, pat: 'flat', grain: 0.06, deco },
      { from: [f, b, G0], to: [r, t, G1], c: { all: 'wood', up: 'wood', down: 'woodDD', east: 'woodD', west: 'woodL' }, dirs: ['up', 'down', 'east', 'west'], pat: 'flat' }
    ]
  })
  const GRIPL = [
    [4.75, 5.5, 12.75, 15.25],
    [4.0, 4.75, 13.0, 15.5],
    [3.25, 4.0, 13.25, 15.75],
    [2.5, 3.25, 13.5, 16.25],
    [1.75, 2.5, 13.75, 16.5],
    [1.0, 1.75, 14.0, 16.5],
    [0.25, 1.0, 14.0, 16.75],
    [-0.75, 0.25, 13.75, 17.0]
  ]
  // A bolt on the drum's face at 45 degrees (3 texels square: a lit centre in its outline).
  const bolt45 = (sx, sy, z0, z1) => ({ from: [DX + sx * 1.875 - 0.375, DY + sy * 1.875 - 0.375, z0], to: [DX + sx * 1.875 + 0.375, DY + sy * 1.875 + 0.375, z1], c: 'metalL', ink: 'dark', bands: false })
  // The reference's metal is clean (a lit top band, a dark bottom, the odd lighter or darker block): grain on the
  // metal and dark parts lower than the kit's default (0.18 / 0.14, measured on the Photon's plated metal).
  const GRAIN = { metal: 0.06, dark: 0.07 }
  const tune = spec => {
    for (const boxes of Object.values(spec.parts)) {
      for (const b of boxes) {
        if (b.grain !== undefined || b.glow) continue
        const key = typeof b.c === 'string' ? b.c : b.c.all
        const g = GRAIN[spec.mats[key]]
        if (g !== undefined) b.grain = g
      }
    }
    return spec
  }
  // ---------- the hands (pg.js spec.hands; handoff/2026-10-12/hands/PLAN.md) ----------
  // The right glove on the grip (its top centre, raked 13 degrees like the stepped grip's middle; 2.5 deep and wide:
  // 1.1 times the shared glove); the left hand (only in the reload) round the drum's lower front rim: it tugs the drum,
  // slides it out toward you and lets it drop away, brings the new one, slides it in, slaps it home with the heel and
  // racks the knob on top.
  const { then, hands } = pg
  const { OR, OL } = hands
  const RH = rig({ t: [14.0 - OR[0], 5.5 - OR[1], 8 - OR[2]], rot: [[[0, 0, 1], 13]], pivot: OR })
  const LH = rig({ t: [DX - 2.6 - OL[0], DY - 2.0 - OL[1], 8 - OL[2]], rot: [[[0, 0, 1], -40]], pivot: OL })
  const gun = pgGun(name, tune({
    hands: { right: { at: RH, scale: 1.1, armScale: 0.9 }, left: { at: LH, shown: false, scale: 1.15, armScale: 0.9 }, leftTree: false },
    style: 'pg',
    density: 4,
    palette: {
      // PG3D's greys are neutral (sampled: #282828 #464646 #646464-#6e6e6e #969696-#a0a0a0); the receiver's front
      // plate a step lighter (the reference's lighter block over the magazine).
      metal: [104, 104, 108], metalL: [158, 158, 162], metalD: [70, 70, 74], dark: [38, 38, 42],
      recvF: { of: 'metal', f: 1.16 },
      // The aim points (keys no skin recolors): the front blade and the rear aperture's ring.
      post: [28, 29, 34], sight: [34, 34, 38],
      // PG3D's wood (sampled: peach #ffb482, orange #f05a28/#e65a28, red #aa3232, deep #5a1e1e); the deep red derives
      // from the red, so a skin that recolors woodD recolors it too.
      wood: [236, 92, 42], woodD: [168, 50, 46], woodL: [255, 178, 128], woodDD: { of: 'woodD', f: 0.55 },
      brass: [232, 184, 74], brassD: [158, 112, 36],
      drum: [100, 100, 104], drumD: [40, 40, 44],
      bore: [10, 10, 12], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: { metal: 'metal', metalL: 'metal', metalD: 'metal', recvF: 'metal', drum: 'metal', dark: 'dark', drumD: 'dark', wood: 'wood', woodD: 'wood', woodL: 'wood', woodDD: 'wood', brass: 'metal', brassD: 'metal', post: 'flat', sight: 'flat', bore: 'flat', flash: 'glow', flashCore: 'glow' },
    keep: ['sight'],
    parts: {
      body: [
        // The Cutts compensator: three ink slots across its top (the flash jets out of them), the bore on its end.
        { from: [-8.75, 7.0, 7.0], to: [-6.5, 9.0, 9.0], c: { all: 'metal', up: 'metalL' },
          deco: [
            { k: 'stamp', face: 'up', at: [-8.25, 7.5], to: [-6.75, 8.5], rows: Array.from({ length: 4 }, () => '#.#.#.') },
            { k: 'stamp', face: 'west', at: [7.5, 8.5], to: [8.5, 7.5], rows: ['.##.', '####', '####', '.##.'] },
            { k: 'slots', face: 'sides', at: [-8.5, 8.0], to: [-6.75, 7.5], n: 1 }
          ] },
        // A dark lip ring where it meets the barrel (a black ring: a step in the silhouette).
        { from: [-6.5, 6.75, 6.75], to: [-6.25, 9.25, 9.25], c: 'metalD', ink: 'dark' },
        // A dark muzzle cap under the compensator (the reference's tall front block: it caps the handguard's line).
        { from: [-8.5, 5.5, 7.25], to: [-6.5, 7.0, 8.75], c: { all: 'metalD', up: 'metal' }, ink: 'dark',
          deco: [{ k: 'slots', face: 'west', at: [7.5, 6.5], to: [8.5, 6.0], n: 1 }] },
        // The front barrel, the front sight's base and blade (the blade's tip on the sight line; no outline: it's an aim
        // point, one dark color).
        { from: [-6.25, 7.25, 7.25], to: [-3.0, 8.75, 8.75], c: 'metal', deco: [{ k: 'band', at: [-4.5, 8.5], to: [-3.5, 7.5], c: 'metalD' }] },
        { from: [-6.25, 8.75, 7.25], to: [-5.25, 9.25, 8.75], c: 'metalD', ink: 'dark' },
        { from: [-5.95, 9.25, 7.78], to: [-5.45, SY, 8.22], c: 'post', outline: false },
        // The barrel band round the handguard's nose.
        { from: [-5.5, 4.5, 6.5], to: [-5.0, 9.0, 9.5], c: { all: 'metalD', up: 'metal' }, ink: 'dark',
          deco: [{ k: 'rivets', face: 'ends', at: [6.75, 8.75], to: [9.25, 8.25], n: 2, c: 'metalL', size: 2 }, { k: 'rivets', face: 'ends', at: [6.75, 5.25], to: [9.25, 4.75], n: 2, c: 'metalL', size: 2 }] },
        // The cooling fins back into the receiver ring: slats on the sides, grooves across the top.
        { from: [-3.0, 7.0, 7.0], to: [2.5, 9.0, 9.0], c: { all: 'metal', up: 'metalL' },
          deco: [{ k: 'ribs', at: [-2.75, 8.75], to: [2.25, 7.25], c: 'metal', fin: 2 }, { k: 'slots', face: 'up', at: [-2.75, 7.25], to: [2.25, 8.75], dir: 'v', n: 10 }] },
        // The handguard, one piece in three bands (1-texel black seams between them): a bright orange strip with a lit top
        // row and a peach streak, a red middle, a deep red bottom stepping up toward the muzzle (lit risers).
        ...handOf(HG),
        // The receiver ring (a step up in front of the knob's slot), two rivets down each side.
        { from: [2.5, 6.25, 6.5], to: [4.25, 9.75, 9.5], c: { all: 'metalD', up: 'metal' }, ink: 'dark',
          deco: [{ k: 'rivets', at: [3.0, 9.25], to: [3.75, 6.75], n: 2, c: 'metalL', size: 2 }, { k: 'rivets', face: 'ends', at: [7.0, 9.25], to: [9.0, 6.75], n: 2, c: 'metalL', size: 2 }] },
        // The receiver's front plate (lighter, over the drum): the knob's slot on top, a brass star and a row of
        // rivets on the left (what first person sees), the ejection port on the right.
        { from: [4.25, 6.5, 6.75], to: [10.0, 9.5, 9.25], c: { all: 'recvF', up: 'metalL' },
          deco: [
            { k: 'band', at: [4.5, 9.25], to: [9.75, 9.0], c: 'metalL' },
            { k: 'stamp', face: 'up', at: [4.5, 7.75], to: [9.75, 8.25], rows: ['#'.repeat(21), '#'.repeat(21)] },
            { k: 'rivets', face: 'up', at: [4.75, 7.0], to: [9.75, 7.25], n: 4, c: 'metal' },
            { k: 'rivets', face: 'up', at: [4.75, 8.75], to: [9.75, 9.0], n: 4, c: 'metal' },
            { k: 'stamp', face: 'south', at: [6.5, 8.75], to: [7.75, 7.5], rows: ['..b..', 'bbbbb', '.bbb.', '.b.b.', 'b...b'], keys: { b: 'brass' } },
            { k: 'rivets', face: 'south', at: [4.75, 7.25], to: [9.5, 6.75], n: 4, c: 'metalL', size: 2 },
            { k: 'inset', face: 'north', at: [5.75, 8.75], to: [9.25, 7.5], c: 'metalD' },
            { k: 'rivets', face: 'north', at: [4.75, 7.25], to: [9.5, 6.75], n: 2, c: 'metalL', size: 2 }
          ] },
        // The receiver's rear plate: the long groove along both sides (the reference's one panel detail).
        { from: [10.0, 6.5, 6.75], to: [15.0, 9.5, 9.25], c: { all: 'metal', up: 'metalL' },
          deco: [{ k: 'band', at: [10.25, 9.25], to: [14.75, 9.0], c: 'metalL' }, { k: 'slots', at: [10.5, 8.25], to: [14.75, 7.75], n: 1 }, { k: 'band', at: [10.5, 7.75], to: [14.75, 7.5], c: 'metalL' }, { k: 'rivets', at: [14.0, 7.25], to: [14.75, 6.75], n: 1, c: 'metalL', size: 2 },
            { k: 'slots', face: 'up', at: [13.5, 7.5], to: [14.75, 8.5], dir: 'v', n: 2 }] },
        // The fire selector and the safety (left side): chunky levers, each with a dark pivot.
        { from: [11.0, 6.5, 9.25], to: [12.25, 7.5, 9.5], c: 'metalL' },
        { from: [11.25, 6.75, 9.5], to: [11.75, 7.25, 9.6], c: 'dark', outline: false },
        { from: [12.75, 6.5, 9.25], to: [14.0, 7.5, 9.5], c: 'metalL' },
        { from: [13.0, 6.75, 9.5], to: [13.5, 7.25, 9.6], c: 'dark', outline: false },
        // The drum's rail, riveted.
        { from: [3.75, 5.75, 6.75], to: [11.25, 6.5, 9.25], c: 'metalD', ink: 'dark', deco: [{ k: 'rivets', at: [4.25, 6.25], to: [10.75, 6.0], n: 5, c: 'metalL' }] },
        // The aperture rear sight (its ring a key no skin recolors, no outline) on a base, with ears.
        { from: [12.0, 9.5, 7.25], to: [13.25, 10.0, 8.75], c: 'metal' },
        { from: [12.3, 10.0, 7.35], to: [12.9, SY - 0.5, 8.65], c: 'sight', outline: false },
        { from: [12.3, SY - 0.5, 7.35], to: [12.9, SY + 0.5, 7.65], c: 'sight', outline: false },
        { from: [12.3, SY - 0.5, 8.35], to: [12.9, SY + 0.5, 8.65], c: 'sight', outline: false },
        { from: [12.3, SY + 0.5, 7.35], to: [12.9, SY + 0.8, 8.65], c: 'sight', outline: false },
        { from: [12.25, 10.0, 7.0], to: [13.0, 11.0, 7.25], c: 'metalD' },
        { from: [12.25, 10.0, 8.75], to: [13.0, 11.0, 9.0], c: 'metalD' },
        // The trigger frame, a chunky guard (into the grip's front), the trigger.
        { from: [10.25, 5.5, 7.0], to: [15.0, 6.5, 9.0], c: 'metalD' },
        { from: [10.75, 4.0, 7.5], to: [13.25, 4.75, 8.5], c: 'metal' },
        { from: [10.75, 4.75, 7.5], to: [11.5, 5.5, 8.5], c: 'metal' },
        { from: [12.0, 4.75, 7.75], to: [12.5, 5.5, 8.25], c: 'metalL', outline: false },
        // The pistol grip: wooden layers stepping back (raked), a palm swell, a toe.
        ...gripOf(GRIPL),
        // The receiver's back end (what aiming sees under the rear sight: a plate with two screws).
        { from: [15.0, 6.0, 7.0], to: [16.0, 9.5, 9.0], c: { all: 'metalD', up: 'metal' },
          deco: [{ k: 'rivets', face: 'east', at: [7.5, 9.0], to: [8.5, 8.5], n: 2, c: 'metalL', size: 2 }, { k: 'slots', face: 'east', at: [7.5, 7.75], to: [8.5, 7.25], n: 1 }] }
      ],
      // The stock (its own part: hidden while aiming, where it would sit against the cheek): a wooden wrist, then treads
      // stepping down over an underside that falls steeply and fans out (PG3D's dropped "banana" stock), a black butt
      // plate with two screws.
      stock: [
        ...stockFaces(STOCK),
        { from: [27.5, -2.5, 6.5], to: [28.5, 4.25, 9.5], c: 'dark', ink: 'metalD', pat: { east: 'knurl', west: 'knurl', all: 'flat' },
          deco: [{ k: 'rivets', face: 'east', at: [7.75, 3.5], to: [8.25, -1.75], n: 2, c: 'metalL', size: 2 }] }
      ],
      // The brass cocking knob (racked +x along its slot), knurled.
      bolt: [
        { from: [5.0, 9.5, 7.5], to: [6.25, 10.25, 8.5], c: 'brass', ink: 'brassD' }
      ],
      // The drum: the feed tab, a dark rim, the face, a dark ring and a centre plate (each a hair prouder), four bolts,
      // the brass winding key (both sides).
      mag: [
        { from: [6.25, 6.0, 7.25], to: [8.75, 6.5, 8.75], c: 'metalD', ink: 'dark' },
        // the rim: a groove round its edge (the drum's two halves), knurled where it shows round the face
        ...disc(3.6, 6.5, 9.5, 'drumD', { grain: 0.06,
          deco: [{ k: 'slots', face: 'flats', at: [0, 7.75], to: [16, 8.25], n: 1 }, { k: 'slots', face: 'ends', at: [7.75, 8], to: [8.25, -3], dir: 'v', n: 1 }, ...lit(3.6, 0.5)] }),
        ...disc(3.15, 6.42, 9.58, 'drum', { dirs: SIDES, grain: 0.05, deco: lit(3.15, 0.5, 0.5) }),
        ...disc(2.15, 6.32, 9.68, 'drumD', { dirs: SIDES, deco: lit(2.15, 0.25) }),
        ...disc(1.75, 6.22, 9.78, 'drum', { dirs: SIDES, grain: 0.05, deco: lit(1.75, 0.5, 0.25) }),
        bolt45(1, 1, 9.5, 9.75), bolt45(-1, 1, 9.5, 9.75), bolt45(1, -1, 9.5, 9.75), bolt45(-1, -1, 9.5, 9.75),
        bolt45(1, 1, 6.25, 6.5), bolt45(-1, 1, 6.25, 6.5), bolt45(1, -1, 6.25, 6.5), bolt45(-1, -1, 6.25, 6.5),
        { from: [DX - 0.75, DY - 0.75, 9.75], to: [DX + 0.75, DY + 0.75, 10.0], c: 'brass', ink: 'brassD' },
        { from: [DX - 1.5, DY - 0.5, 10.0], to: [DX + 1.5, DY + 0.5, 10.25], c: 'brass', ink: 'brassD' },
        { from: [DX - 0.75, DY - 0.75, 5.75], to: [DX + 0.75, DY + 0.75, 6.0], c: 'brass', ink: 'brassD' }
      ],
      // The flash: a burst out of the muzzle and two jets up out of the compensator's slots.
      flash: [
        { from: [-11.2, BORE_Y - 1.2, 6.8], to: [-8.75, BORE_Y + 1.2, 9.2], c: 'flashCore', glow: true },
        { from: [-15.0, BORE_Y - 0.5, 7.5], to: [-11.2, BORE_Y + 0.5, 8.5], c: 'flash', glow: true },
        { from: [-10.4, BORE_Y - 0.4, 4.8], to: [-9.6, BORE_Y + 0.4, 6.8], c: 'flash', glow: true },
        { from: [-10.4, BORE_Y - 0.4, 9.2], to: [-9.6, BORE_Y + 0.4, 11.2], c: 'flash', glow: true },
        { from: [-8.25, 9.02, 7.55], to: [-8.0, 11.6, 8.45], c: 'flash', glow: true },
        { from: [-7.75, 9.02, 7.55], to: [-7.5, 11.0, 8.45], c: 'flash', glow: true }
      ],
      // A smaller flash (the flicker's second size; the one aiming shows: its jets stay under the sight line).
      flash2: [
        { from: [-10.4, BORE_Y - 0.9, 7.1], to: [-8.75, BORE_Y + 0.9, 8.9], c: 'flashCore', glow: true },
        { from: [-13.0, BORE_Y - 0.4, 7.6], to: [-10.4, BORE_Y + 0.4, 8.4], c: 'flash', glow: true },
        { from: [-8.25, 9.02, 7.65], to: [-8.0, 10.3, 8.35], c: 'flash', glow: true },
        { from: [-7.25, 9.02, 7.65], to: [-7.0, 10.0, 8.35], c: 'flash', glow: true }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -76, 0], translation: [-4.4, 4.6, -1.6], scale: [0.62, 0.62, 0.62] },
      thirdperson: { rotation: [0, -90, 8], translation: [0, 1.5, -5.5], scale: [0.8, 0.8, 0.8] },
      gui: { rotation: [0, 180, -35], translation: [-0.1, 2.42, 0], scale: [0.5, 0.5, 0.5] },
      ground: { rotation: [0, 0, -45], translation: [-1, 8.25, 0], scale: [0.85, 0.85, 0.85] },
      fixed: { rotation: [0, 0, -45], translation: [-0.5, 1, -1], scale: [0.85, 0.85, 0.85] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 12.9, rearDepth: 1.0, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [-8, -48, 18], translation: [-4.2, 3.4, -2.4], scale: [0.58, 0.58, 0.58] }
    }
  }))
  // The shoulder pivot (the grip's top, behind the trigger): kicks turn the muzzle up about it.
  const SHOULDER = [14.1, 5.6, 8]
  // Fire held (full-auto, 9 shots a second: one every 2-3 ticks, so the frames flicker at random each tick): a pose is
  // picked afresh every frame (pg.js firing: wobble off), so they share one kick (0.8 back, 2.6 degrees up) with a
  // small jitter, and the flash (one of two sizes, or none for a frame) is what flickers; the knob cycles. k scales
  // the kick (the aim's is smaller); aiming the knob stays put (it would flicker just under the sights) and only the
  // small flash shows (its jets stay under the sight line).
  const fire = (k, also = {}) => {
    const aimed = k < 1
    const cycle = v => aimed ? {} : { bolt: rig({ t: [v, 0, 0] }) }
    const big = aimed ? 'flash2' : 'flash'
    const kick = (dx, up, yaw) => rig({ t: [(0.8 + dx) * k, 0.12 * k, 0], rot: [[[0, 0, 1], -(2.6 + up) * k], [[0, 1, 0], yaw * k]], pivot: SHOULDER })
    return [
      { ...also, show: [big], gun: kick(0.08, 0.4, 0.3), ...cycle(2.8) },
      { ...also, show: ['flash2'], gun: kick(-0.06, -0.3, -0.4), ...cycle(1.6) },
      { ...also, show: [big], gun: kick(0.1, 0.5, -0.2), ...cycle(3.0) },
      { ...also, gun: kick(-0.1, -0.4, 0.1), ...cycle(0.8) }
    ]
  }
  // The draw (GunFx: 22 ticks when it's equipped; STG44.yml Weapon_Equip_Delay 22): the gun comes up from below the
  // screen, muzzle down and rolled out, levelling out by half way; then (p 0.55-0.8) it rolls its top toward you and the
  // knob is racked: back at 0.55-0.62 (held), let go at 0.72-0.75 (a jolt), the roll back by 0.92. The draw sound's two
  // clicks follow it (tools\sounds\guns\tommy.js: 0.66 s and 0.82 s).
  const draw = p => {
    const e = 1 - ease.out(Math.min(1, p / 0.5))
    const roll = ease.ramp(p, 0.48, 0.58) * (1 - ease.ramp(p, 0.8, 0.92))
    const pull = p < 0.72 ? ease.ramp(p, 0.55, 0.62) : 1 - ease.ramp(p, 0.72, 0.75)
    const snap = ease.bump(p, 0.73, 0.86, 0.76)
    return {
      gun: rig({ t: [1.8 * e + 0.4 * snap, -9 * e + 0.8 * roll, 0.6 * roll], rot: [[[1, 0, 0], -18 * e + 14 * roll], [[0, 1, 0], 6 * roll], [[0, 0, 1], 26 * e + 1.5 * snap]], pivot: SHOULDER }),
      bolt: rig({ t: [3.4 * pull, 0, 0] })
    }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' reload: 50 ticks with rounds left, 60 from empty, when the
  // silent Firearm_Action's 5 + 5 come around it). The sounds are timed to it in STG44.yml (Start_Mechanics,
  // delayBeforePlay = 55p - 2.5, splitting the two clocks): mag_out 6 (p 0.155), mag_in 28 (p 0.555), bolt 38 (p 0.736,
  // its second click 2.6 ticks later). The gun comes up and rolls its underside toward you (0-0.1); the drum is tugged
  // (0.1-0.155), unlatches and slides out sideways along its rail (+z, toward you), then drops away (0.155-0.32); gone
  // (0.32-0.4); a new one rises and slides in (0.4-0.555), seats and is slapped home from the side (0.555-0.62, a jolt);
  // the gun rolls its top toward you (0.6-0.7) and the knob is racked: back 0.70-0.736, held, let go 0.77-0.785 (a
  // snap); the gun settles back level by 0.96.
  const SLIDE = 6.5 // how far the drum slides out along the rail before it drops
  // The left hand: below the screen (where the bag was), on the drum, on the knob from above (the palm down), away.
  const magRig = (side, drop, tug, slap) => rig({ t: [0, -12 * drop - 0.3 * tug, SLIDE * side - 0.25 * slap] })
  const BELOW = then(LH, rig({ t: [3, -12, 7], rot: [[[1, 0, 0], -20]], pivot: [DX, DY, 8] }))
  const KNOB = [5.6, 10.6, 8]
  const onKnob = pull => rig({ t: [KNOB[0] + 3.4 * pull - OL[0], KNOB[1] + 1.0 - OL[1], KNOB[2] - OL[2]], rot: [[[1, 0, 0], -90]], pivot: OL })
  const reload = p => {
    const a = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.6, 0.7)) // the drum pose
    const b = ease.ramp(p, 0.6, 0.7) * (1 - ease.ramp(p, 0.86, 0.96)) // the knob pose
    const tug = ease.bump(p, 0.1, 0.16, 0.135)
    const slap = ease.bump(p, 0.555, 0.63, 0.575)
    let side = 0
    let drop = 0
    if (p < 0.4) { side = ease.ramp(p, 0.155, 0.23); drop = ease.ramp(p, 0.22, 0.32) } else { drop = 1 - ease.ramp(p, 0.4, 0.47); side = 1 - ease.ramp(p, 0.46, 0.545) }
    const pull = p < 0.77 ? ease.ramp(p, 0.70, 0.736) : 1 - ease.ramp(p, 0.77, 0.785)
    const snap = ease.bump(p, 0.78, 0.86, 0.8)
    // the left hand: up to the drum (0.02-0.1), with it out and back in, the heel's push on the slap (0.555-0.63), over
    // the top to the knob (0.62-0.7), racks it (0.7-0.736), lets go (0.77-0.785), away (0.8-0.92)
    let place
    if (p < 0.1) place = hands.mix(BELOW, LH, ease.ramp(p, 0.02, 0.1))
    else if (p < 0.62) place = then(then(LH, magRig(side, drop, tug, slap)), rig({ t: [0, 0, -0.5 * slap] }))
    else if (p < 0.7) place = hands.mix(then(LH, magRig(0, 0, 0, 0)), onKnob(0), ease.ramp(p, 0.62, 0.7))
    else if (p < 0.785) place = onKnob(pull)
    else place = hands.mix(onKnob(0), then(onKnob(0), rig({ t: [3, -14, 5] })), ease.ramp(p, 0.8, 0.92))
    return {
      gun: rig({
        t: [0.3 * tug + 0.4 * snap, 2.2 * a + 1.0 * b + 0.3 * slap, 1.6 * a + 0.8 * b - 0.4 * slap],
        rot: [[[1, 0, 0], -26 * a + 30 * b + 4 * slap], [[0, 1, 0], 12 * a + 14 * b], [[0, 0, 1], 3 * a - 2 * b - 2 * slap + 1.5 * snap]],
        pivot: [9, 6, 8]
      }),
      mag: magRig(side, drop, tug, slap),
      bolt: rig({ t: [3.4 * pull, 0, 0] }),
      lhand: hands.pose(LH, place),
      show: p > 0.015 && p < 0.93 ? ['lhand'] : [],
      hide: p > 0.32 && p < 0.4 ? ['mag'] : []
    }
  }
  const AIMED = { hide: ['stock'] }
  // Default: the draw while its cooldown runs, else fire held / the rest pose.
  const drawn = gun.cooldown('', 22, draw)
  drawn.fallback = gun.firing('', fire(1))
  return {
    15: gun.byContext('', drawn),
    1015: gun.byContext('ads', gun.firing('ads', fire(0.45, AIMED), AIMED)),
    2015: gun.byContext('sprint', gun.composite('sprint')),
    3015: gun.byContext('', gun.cooldown('', 60, reload))
  }
}
