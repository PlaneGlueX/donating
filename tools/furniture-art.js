// Store furniture (owner, 2026-10-21: "custom furnature for buildings (custom textures)", stores first): box models
// with their own textures, put in the stores as item displays (tools/build/town modules, town.js displays) over
// barrier blocks (they keep the old props' collision and let the light through, so a display isn't dark). Each is a
// case of iron_ingot by its custom model data string donating:furn_<name>. Placed with item_display "none": the
// model's 0..16 is the block the display stands in (it may reach -16..32), its front is -z (north) and the display's
// yaw is the way the front faces (south 0, west 90, north 180, east -90), like the register's (loot.sk).
// Called from make-item-art.js with its helpers.
module.exports = ({ write, canvas, addCase }) => {
  const r = n => Math.round(n * 1000) / 1000
  const rgba = c => c.length === 4 ? c : [...c, 255]
  const GUI = { gui: { rotation: [25, 200, 0], scale: [0.45, 0.45, 0.45] }, fixed: { rotation: [0, 180, 0], scale: [0.5, 0.5, 0.5] } }
  // A model: a 16-color palette (4x4 swatches, faces sample their middle 2x2) and painted textures; a part is
  // { from, to, c: swatch | { all, up, ... }, p: { <dir>: [paint, x0, y0, x1, y1] } (a face from a painted texture, in
  // its pixels), dirs, rot, glow }.
  // dy moves the whole model up or down (in model units).
  const model = (name, colors, parts, paints = {}, dy = 0) => {
    const pal = canvas(16, 16)
    colors.forEach((col, i) => pal.fill((i % 4) * 4, Math.floor(i / 4) * 4, (i % 4) * 4 + 3, Math.floor(i / 4) * 4 + 3, rgba(col)))
    write(`donating/textures/item/furn/${name}.png`, pal.png())
    const textures = { t: `donating:item/furn/${name}`, particle: `donating:item/furn/${name}` }
    const size = {}
    for (const [k, p] of Object.entries(paints)) {
      const n = Math.max(p.w, p.h) // square (tools/render-item.js reads a taller-than-wide texture as frames)
      const c = canvas(n, n)
      p.draw(c)
      write(`donating/textures/item/furn/${name}_${k}.png`, c.png())
      textures[k] = `donating:item/furn/${name}_${k}`
      size[k] = [n, n]
    }
    const uv = i => [(i % 4) * 4 + 1, Math.floor(i / 4) * 4 + 1, (i % 4) * 4 + 3, Math.floor(i / 4) * 4 + 3]
    const elements = parts.map(p => {
      const faces = {}
      for (const dir of p.dirs || ['north', 'south', 'east', 'west', 'up', 'down']) {
        if (p.p && p.p[dir]) {
          const [k, x0, y0, x1, y1] = p.p[dir]
          const [w, h] = size[k]
          faces[dir] = { uv: [x0 * 16 / w, y0 * 16 / h, x1 * 16 / w, y1 * 16 / h].map(r), texture: `#${k}` }
          continue
        }
        const c = typeof p.c === 'number' ? p.c : (p.c[dir] !== undefined ? p.c[dir] : p.c.all)
        faces[dir] = { uv: uv(c), texture: '#t' }
      }
      const e = { from: p.from.map((v, i) => r(i === 1 ? v + dy : v)), to: p.to.map((v, i) => r(i === 1 ? v + dy : v)), faces }
      if (p.rot) e.rotation = p.rot
      if (p.glow) e.light_emission = p.glow
      return e
    })
    write(`donating/models/item/furn/${name}.json`, { textures, elements, display: GUI })
    addCase('iron_ingot', `donating:furn_${name}`, `donating:item/furn/${name}`)
  }
  const box = (x0, y0, z0, x1, y1, z1, c, more = {}) => ({ from: [x0, y0, z0], to: [x1, y1, z1], c, ...more })
  // A deterministic hash (the same art every build).
  const hash = (...a) => { let h = 2166136261; for (const v of a) { h ^= v & 0xffff; h = Math.imul(h, 16777619) >>> 0 } return h }
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
  const STEEL = [[214, 220, 228], [168, 174, 186], [116, 122, 134], [70, 74, 84]] // light, mid, dark, deep

  // ---- Drinks behind the fridge doors (the gas mart's fridge wall): a column one block wide and three tall (the
  // display in the middle block), a dark back, three wire shelves a block, four bottles or cans a shelf.
  const DRINKS = {
    soda: [[214, 44, 44], [40, 92, 196], [246, 132, 26], [88, 180, 64], [236, 210, 52], [140, 64, 170]],
    energy: [[36, 36, 40], [170, 230, 40], [40, 200, 220], [240, 60, 140], [250, 196, 30], [226, 226, 232]],
    water: [[180, 214, 240], [140, 196, 236], [214, 236, 250], [96, 170, 220], [236, 120, 60], [250, 220, 90]]
  }
  for (const [kind, cols] of Object.entries(DRINKS)) {
    const pal = [...STEEL, [28, 30, 36], [52, 56, 66], ...cols.map(c => c), [250, 250, 252], [20, 20, 22], [200, 230, 250, 120]]
    // 0-3 steel, 4 back, 5 shelf lip, 6-11 drink colors, 12 white, 13 black, 14 frost
    const parts = [box(0, -16, 14.5, 16, 32, 16, 4, { dirs: ['north'] })]
    for (let shelf = 0; shelf < 9; shelf++) {
      const y = -16 + shelf * 16 / 3
      parts.push(box(0.2, y, 2, 15.8, y + 0.4, 15, { all: 3, up: 2 }), box(0.2, y, 1.6, 15.8, y + 0.8, 2, 5))
      for (let k = 0; k < 4; k++) {
        const x = 1.2 + k * 3.6, ci = 6 + hash(kind.length, shelf, k) % 6, can = kind === 'energy' || (kind === 'soda' && shelf % 3 === 1)
        if (can) {
          parts.push(box(x, y + 0.4, 3, x + 2.6, y + 4.2, 5.6, { all: ci, up: 1 }), box(x + 0.4, y + 4.2, 3.4, x + 2.2, y + 4.5, 5.2, 0))
          parts.push(box(x + 0.4, y + 1.6, 2.98, x + 2.2, y + 2.6, 3, 12, { dirs: ['north'] }))
        } else {
          parts.push(box(x + 0.2, y + 0.4, 3, x + 2.4, y + 3.6, 5.2, { all: ci, up: ci }), box(x + 0.7, y + 3.6, 3.5, x + 1.9, y + 4.8, 4.7, ci))
          parts.push(box(x + 0.6, y + 4.8, 3.4, x + 2, y + 5.2, 4.8, 13), box(x + 0.2, y + 1.2, 2.98, x + 2.4, y + 2.6, 3, 12, { dirs: ['north'] }))
        }
      }
    }
    model(`drinks_${kind}`, pal, parts)
  }

  // ---- Shelf goods (the gondolas' middle row): two shelves of products a block, the front side facing the aisle, a
  // pegboard back. Product fronts are painted (a label band, a logo blob), so a shelf reads as chips, boxes or cans.
  const GOODS = {
    chips: { pal: [[226, 40, 40], [250, 196, 30], [40, 120, 220], [60, 170, 70], [240, 120, 30]], shape: 'bag' },
    cereal: { pal: [[240, 200, 40], [214, 60, 40], [80, 150, 220], [120, 70, 160], [250, 140, 40]], shape: 'box' },
    cans: { pal: [[200, 40, 40], [236, 236, 240], [60, 140, 60], [240, 170, 40], [70, 90, 200]], shape: 'can' },
    candy: { pal: [[240, 90, 160], [120, 60, 30], [250, 220, 60], [70, 190, 210], [160, 80, 200]], shape: 'bar' }
  }
  for (const [kind, g] of Object.entries(GOODS)) {
    // The label texture: one 8x8 label per product color (4 down the left: a band and a blob), 5 colors -> 40x8.
    const label = {
      w: 40,
      h: 8,
      draw: c => g.pal.forEach((col, i) => {
        const x0 = i * 8, dark = mix(col, [0, 0, 0], 0.35), lite = mix(col, [255, 255, 255], 0.55)
        c.fill(x0, 0, x0 + 7, 7, rgba(col))
        c.fill(x0, 0, x0 + 7, 0, rgba(dark)); c.fill(x0, 7, x0 + 7, 7, rgba(dark))
        if (g.shape === 'bag') { c.fill(x0 + 2, 2, x0 + 5, 5, rgba(lite)); c.fill(x0 + 3, 3, x0 + 4, 4, rgba([250, 250, 250])) }
        else if (g.shape === 'box') { c.fill(x0 + 1, 1, x0 + 6, 2, rgba(lite)); c.fill(x0 + 2, 4, x0 + 5, 6, rgba([250, 246, 230])) }
        else if (g.shape === 'can') { c.fill(x0, 3, x0 + 7, 4, rgba(lite)); c.set(x0 + 3, 2, rgba([255, 255, 255])) }
        else { c.fill(x0 + 1, 3, x0 + 6, 4, rgba(lite)) }
      })
    }
    const pal = [[220, 204, 168], [186, 168, 132], [150, 134, 104], [96, 100, 110], ...g.pal, [248, 248, 248], [40, 40, 44]]
    // 0-2 birch light, mid, dark; 3 pegboard; 4-8 products; 9 white; 10 black
    const parts = [box(0, 0, 15, 16, 16, 16, 3, { dirs: ['north'] }), box(0, 7.6, 1, 16, 8.2, 15, { all: 1, up: 0, down: 2 }), box(0, 0, 1, 16, 0.6, 15, { all: 1, up: 0 })]
    for (const [row, y] of [0.6, 8.2].entries()) {
      for (let k = 0; k < 4; k++) {
        const ci = hash(kind.length, row, k) % 5, x = 0.5 + k * 3.9, lab = ['label', ci * 8, 0, ci * 8 + 8, 8]
        if (g.shape === 'bag') parts.push(box(x, y, 2.5, x + 3.4, y + 6.4, 5.2, { all: 4 + ci, up: 4 + ci }, { p: { north: lab } }), box(x + 0.2, y + 6.4, 3.2, x + 3.2, y + 6.9, 4.6, 4 + ci))
        else if (g.shape === 'box') parts.push(box(x, y, 3, x + 3.4, y + 6.8, 8, { all: 4 + ci }, { p: { north: lab } }))
        else if (g.shape === 'can') for (const dz of [0, 3]) parts.push(box(x + 0.3, y, 2.5 + dz, x + 3.1, y + 3.8, 5.1 + dz, { all: 4 + ci, up: 9 }, { p: { north: lab } }))
        else for (const dy of [0, 1.2, 2.4]) parts.push(box(x, y + dy, 2.5, x + 3.4, y + dy + 1.1, 6, { all: 4 + ci }, { p: { north: lab } }))
      }
      parts.push(box(0, y - 0.6, 0.6, 16, y + 0.6, 1, 9, { dirs: ['north', 'up'] })) // the price strip
    }
    model(`shelf_${kind}`, pal, parts, { label })
  }

  // ---- The slush machine (the gas mart's south counter): a steel base, a clear bowl of slush with an auger, a tap
  // and drip tray, a lit flavour lid. One a flavour; two blocks tall from the counter.
  for (const [kind, col] of Object.entries({ cherry: [220, 40, 60], berry: [50, 90, 220], lime: [90, 210, 70] })) {
    const pal = [...STEEL, col, mix(col, [255, 255, 255], 0.45), mix(col, [0, 0, 0], 0.3), [220, 240, 250, 90], [30, 30, 34], [250, 250, 250], [236, 236, 240, 150]]
    // 0-3 steel, 4 slush, 5 slush light, 6 slush dark, 7 glass, 8 black, 9 white, 10 frost
    model(`slush_${kind}`, pal, [
      box(1, 0, 1, 15, 6, 15, { all: 1, up: 0, down: 2 }), // the base
      box(2, 5.98, 0.98, 14, 6, 1, 8, { dirs: ['north'] }),
      box(6.5, 2, 0.5, 9.5, 5, 1, 2), // the tap
      box(7.2, 1, 0.3, 8.8, 2, 0.6, 8),
      box(4, 0, 0.2, 12, 0.6, 2, 3), // the drip tray
      box(3, 6, 3, 13, 15, 13, 4, { dirs: ['up'] }), // the slush, its top at 15
      box(3.05, 6, 3.05, 12.95, 15, 12.95, { all: 4, north: 5, east: 5, down: 6 }, { dirs: ['north', 'south', 'east', 'west'] }),
      box(2.5, 6, 2.5, 13.5, 22, 13.5, 7, { dirs: ['north', 'south', 'east', 'west'] }), // the bowl
      box(7.4, 6, 7.4, 8.6, 19, 8.6, 9), // the auger
      box(2, 22, 2, 14, 26, 14, { all: 4, up: 5, down: 8 }, { glow: 12 }), // the lit lid
      box(2.3, 23, 1.98, 13.7, 25, 2, 9, { dirs: ['north'], glow: 15 })
    ])
  }

  // ---- The coffee brewer (both stores' back counters): a black brewer, a glass carafe of coffee on the hot plate,
  // a red power light. A block and a half from the counter top.
  model('coffee', [
    [40, 40, 44], [62, 62, 68], [22, 22, 24], [200, 220, 230, 110], [74, 42, 24], [110, 66, 36], [230, 40, 30], ...STEEL, [250, 246, 236]
  ], [
    // 0 black, 1 black light, 2 black deep, 3 glass, 4 coffee, 5 coffee light, 6 red, 7-10 steel, 11 cup white
    box(2, 0, 4, 14, 1.5, 15, { all: 1, up: 0 }), // the base
    box(2, 1.5, 11, 14, 22, 15, { all: 0, north: 1 }), // the tower
    box(2, 18, 2, 14, 22, 11, { all: 0, up: 1, down: 2 }), // the head
    box(5, 17, 4, 11, 18, 10, 9), // the basket
    box(4, 1.5, 3.5, 12, 2, 10.5, 8), // the hot plate
    box(5, 2, 4.5, 11, 9, 9.5, 4, { dirs: ['up'] }), // the coffee, its top at 9
    box(5.05, 2, 4.55, 10.95, 9, 9.45, { all: 4, north: 5 }, { dirs: ['north', 'south', 'east', 'west'] }),
    box(4.5, 2, 4, 11.5, 14, 10, 3, { dirs: ['north', 'south', 'east', 'west'] }), // the carafe
    box(4, 13, 3.5, 12, 15, 10.5, { all: 0, up: 1 }), // its lid
    box(11.5, 4, 6, 13.5, 12, 8, 2), // its handle
    box(10, 20, 1.98, 12, 21, 2, 6, { dirs: ['north'], glow: 15 }) // the light
  ])

  // ---- The hot dog roller (the gas mart's back counter): a steel grill two blocks long (the display on the line
  // between them) with ten rollers and six hot dogs on them, a sneeze guard on top.
  {
    const parts = [
      box(-14, 0, 1, 14, 3, 15, { all: 1, up: 0, down: 2 }), // the body
      box(-13, 3, 1.5, 13, 3.4, 14.5, 3) // the drip pan
    ]
    for (let k = 0; k < 10; k++) parts.push(box(-12.5, 3.4, 2 + k * 1.25, 12.5, 4.4, 2.9 + k * 1.25, { all: 4, up: 5 }))
    for (const k of [1, 2, 4, 5, 7, 8]) parts.push(box(-10 + (k % 2) * 3, 4.4, 2.2 + k * 1.25, 10 + (k % 2) * 3, 5.6, 3.4 + k * 1.25, { all: 6, up: 7, down: 8 }))
    parts.push(box(-14, 3, 0.5, 14, 4.2, 1, 2), box(-14, 4.2, 0.5, -13.6, 11, 1, 0), box(13.6, 4.2, 0.5, 14, 11, 1, 0))
    parts.push(box(-14, 11, 0.5, 14, 11.4, 9, 9), box(-13.6, 4.2, 0.6, 13.6, 11, 0.9, 9, { dirs: ['north', 'south'] })) // the guard
    model('roller', [...STEEL, [196, 200, 210], [236, 238, 242], [190, 80, 50], [214, 112, 70], [140, 56, 34], [214, 236, 246, 70]], parts)
    // 0-3 steel, 4 roller, 5 roller light, 6 sausage, 7 sausage light, 8 sausage dark, 9 glass
  }

  // ---- The microwave (the gas mart's back counter).
  model('microwave', [...STEEL, [24, 24, 28], [40, 60, 70, 210], [120, 230, 120], [236, 236, 240]], [
    box(1, 0, 3, 15, 9, 15, { all: 7, up: 0, down: 2 }), // the case
    box(1.6, 1, 2.6, 10.6, 8, 3, { all: 4, north: 5 }), // the door window
    box(10.8, 1, 2.6, 14.4, 8, 3, 0), // the panel
    box(11.4, 6, 2.5, 13.8, 7.2, 2.6, 6, { dirs: ['north'], glow: 15 }), // its display
    box(11.6, 2, 2.5, 13.6, 5.4, 2.6, 2, { dirs: ['north'] })
  ])

  // ---- A cup and lid dispenser.
  model('cups', [[250, 250, 252], [222, 222, 228], [176, 178, 186], [214, 60, 40], [60, 60, 66], [120, 74, 40]], [
    box(2, 0, 3, 14, 1, 14, { all: 4, up: 4 }), // the stand
    ...[[3, 'a'], [7, 'b'], [11, 'c']].flatMap(([x, k], i) => [
      box(x, 1, 6, x + 3, 10 - i * 1.5, 9, { all: 1, north: 0, up: 2 }), // a stack of cups
      box(x - 0.2, 1, 5.8, x + 3.2, 2, 9.2, i === 1 ? 3 : 5)
    ]),
    box(3, 1, 10, 13, 2.5, 13, { all: 2, up: 0 }) // the lids
  ])

  // ---- The ATM (by the gas mart's windows): three blocks tall from the floor, a screen and a keypad in a lit bezel.
  model('atm', [
    [60, 64, 74], [86, 92, 104], [40, 42, 50], [24, 24, 28], [30, 110, 200], [120, 200, 250], [200, 204, 214], [40, 180, 80], [236, 236, 240], [214, 40, 40]
  ], [
    // 0 body, 1 body light, 2 body dark, 3 black, 4 screen, 5 screen light, 6 keys, 7 green, 8 white, 9 red
    box(1, 0, 3, 15, 40, 15, { all: 0, up: 1, down: 2, north: 1 }),
    box(1.5, 22, 2, 14.5, 32, 3, { all: 2 }), // the bezel
    box(3, 23.5, 1.9, 13, 31, 2, 4, { dirs: ['north'], p: { north: ['screen', 0, 0, 20, 15] }, glow: 13 }),
    box(1, 12, 0, 15, 22, 3, { all: 0, up: 1, down: 2 }), // the console sticking out
    ...[0, 1, 2, 3].flatMap(row => [0, 1, 2].map(col => box(4 + col * 2.2, 14 + row * 1.6, -0.1, 5.6 + col * 2.2, 15.2 + row * 1.6, 0, row === 0 && col === 2 ? 7 : row === 0 && col === 0 ? 9 : 6, { dirs: ['north'] }))),
    box(11, 18.5, -0.1, 13.5, 19.5, 0, 3, { dirs: ['north'] }), // the card slot
    box(11, 15, -0.1, 13.5, 16, 0, 3, { dirs: ['north'] }), // the receipt slot
    box(2, 7, 2.9, 14, 8.5, 3, 3, { dirs: ['north'] }), // the cash slot
    box(1, 34, 2.5, 15, 39, 3, 4, { dirs: ['north'], p: { north: ['sign', 0, 0, 28, 10] }, glow: 15 }) // the lit ATM sign
  ], {
    screen: { w: 20, h: 15, draw: c => { c.fill(0, 0, 19, 14, [30, 110, 200, 255]); c.fill(2, 2, 17, 3, [250, 250, 250, 255]); for (const y of [6, 9, 12]) { c.fill(2, y, 8, y + 1, [120, 200, 250, 255]); c.fill(11, y, 17, y + 1, [120, 200, 250, 255]) } } },
    sign: { w: 28, h: 10, draw: c => { c.fill(0, 0, 27, 9, [30, 110, 200, 255]); glyphs(c, 'ATM', 6, 2, [250, 250, 250, 255]) } }
  }, -16) // drawn from the floor, its display in the middle block

  // ---- The ice cream freezer (the gas mart's north aisle): three blocks long and two deep, a white chest with
  // sliding glass lids, tubs of ice cream under them. The display in the middle of its 3x2 footprint, on the floor.
  {
    const TUB = [[250, 236, 220], [120, 70, 40], [240, 150, 180], [150, 220, 150], [250, 220, 120]]
    const parts = [
      box(-16, 0, -8, 32, 13, 24, { all: 0, up: 1, north: 0, down: 2 }), // the chest
      box(-15, 13, -7, 31, 13.2, 23, 3), // the bottom of the well (seen through the lids)
      box(-16, 0, -8.1, 32, 2, -8, 5, { dirs: ['north'] }), // the kick
      box(-15, 6, -8.1, 31, 7, -8, 6, { dirs: ['north'], glow: 10 }) // a blue stripe
    ]
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      const x = -14 + i * 7.6, z = -5.5 + j * 9.5, ci = 7 + hash(i, j) % 5
      parts.push(box(x, 13.2, z, x + 6.6, 16.5, z + 7.5, { all: 12, up: ci }))
    }
    parts.push(box(-16, 17, -8, 32, 18, 24, 4, { dirs: ['up', 'north', 'south', 'east', 'west'] })) // the glass lids
    parts.push(box(-16, 13, -8, 32, 18, -7, 0), box(-16, 13, 23, 32, 18, 24, 0), box(-16, 13, -7, -15, 18, 23, 0), box(31, 13, -7, 32, 18, 23, 0), box(7.5, 13, -7, 8.5, 18, 23, 0))
    model('icecream', [[246, 246, 248], [255, 255, 255], [196, 198, 206], [120, 170, 200], [200, 230, 245, 90], [90, 94, 104], [60, 150, 230], ...TUB, [236, 236, 240]], parts)
    // 0 white, 1 white light, 2 white dark, 3 well, 4 glass, 5 kick, 6 stripe, 7-11 ice cream, 12 tub white
  }

  // ---- Lottery ticket dispensers (the gas mart's north wall): a block wide and two tall, two rolls of scratch
  // tickets behind a clear front, a lit topper. Four designs.
  const LOTTO = [[[250, 200, 30], [214, 40, 40]], [[60, 190, 90], [250, 250, 250]], [[60, 120, 230], [250, 210, 40]], [[230, 70, 160], [250, 250, 250]]]
  LOTTO.forEach(([a, b], n) => {
    model(`lotto_${n + 1}`, [[30, 30, 34], [50, 50, 56], a, b, mix(a, [0, 0, 0], 0.3), [214, 236, 246, 80], [250, 250, 250]], [
      box(1, 0, 6, 15, 32, 16, { all: 0, north: 1 }),
      ...[2, 17].flatMap(y => [
        box(2, y, 5, 14, y + 12, 6, 2, { dirs: ['north'], p: { north: ['ticket', 0, 0, 12, 12] } }),
        box(2, y - 1, 4.2, 14, y, 6, 4), // the tear slot
        box(1.6, y - 1, 4, 14.4, y + 13, 4.2, 5, { dirs: ['north'] })
      ]),
      box(1, 30, 3.5, 15, 32, 6, 3, { glow: 14 })
    ], { ticket: { w: 12, h: 12, draw: c => { c.fill(0, 0, 11, 11, rgba(a)); c.fill(1, 1, 10, 3, rgba(b)); c.fill(2, 5, 9, 10, [200, 200, 206, 255]); for (const x of [3, 6, 8]) c.set(x, 7, rgba(b)) } } })
  })

  // ---- The magazine rack (by the gas mart's windows): slanted shelves of magazines, one block.
  {
    const MAG = [[214, 40, 40], [40, 100, 200], [250, 200, 40], [30, 30, 34], [230, 230, 236], [60, 170, 90]]
    const parts = [box(0, 0, 10, 16, 16, 16, { all: 1, up: 0 }), box(0, 0, 0, 16, 2, 10, { all: 1, up: 0 })]
    for (let row = 0; row < 3; row++) {
      const y = 2 + row * 4.6, z = 6 - row * 1.6
      parts.push(box(0.5, y, z, 15.5, y + 0.5, z + 3, 2))
      for (let k = 0; k < 3; k++) parts.push(box(0.8 + k * 5, y + 0.5, z + 0.6, 5.4 + k * 5, y + 5.6, z + 1.2, 3 + hash(row, k) % 6, { rot: { angle: -22.5, axis: 'x', origin: [8, y, z + 1] }, p: { north: ['cover', 0, 0, 8, 10] } }))
    }
    model('magrack', [[196, 160, 110], [168, 132, 90], [120, 92, 60], ...MAG], parts, {
      cover: { w: 8, h: 10, draw: c => { c.fill(0, 0, 7, 9, [236, 236, 240, 255]); c.fill(0, 0, 7, 2, [214, 40, 40, 255]); c.fill(1, 4, 6, 8, [120, 150, 190, 255]) } }
    })
  }

  // ---- The Donut Shop's menu boards: two boards of six cells over the clerks, each cell a block of a 96x32-pixel
  // lit board (pink frame, a row of donut pictures, price dots under them), the display per cell.
  const MENU = {
    w: 96,
    h: 32,
    draw: c => {
      c.fill(0, 0, 95, 31, [214, 60, 140, 255])
      c.fill(2, 2, 93, 29, [40, 20, 36, 255])
      const ICING = [[250, 156, 196], [120, 70, 40], [250, 250, 250], [250, 210, 60], [130, 200, 240], [250, 120, 160]]
      for (let i = 0; i < 6; i++) {
        const cx = 8 + i * 16, cy = 12
        for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
          const d = x * x + y * y
          if (d <= 25 && d > 3) c.set(cx + x, cy + y, d > 15 ? [210, 156, 92, 255] : [...ICING[i], 255])
        }
        for (const [sx, sy] of [[-2, -3], [2, -2], [-3, 1], [3, 2]]) c.set(cx + sx, cy + sy, [250, 250, 250, 255])
        c.fill(cx - 4, 21, cx + 4, 22, [250, 230, 240, 255]) // the name line
        c.fill(cx - 2, 25, cx + 2, 26, [250, 210, 60, 255]) // the price
      }
    }
  }
  for (let k = 0; k < 6; k++) {
    model(`dmenu_${k + 1}`, [[30, 30, 34], [214, 60, 140]], [
      box(0, -8, 14, 16, 24, 16, { all: 0, north: 1 }, { p: { north: ['menu', k * 16, 0, k * 16 + 16, 32] }, glow: 14 })
    ], { menu: MENU })
  }

  // ---- The deep fryer (the Donut Shop's kitchen): steel, two vats of oil with wire baskets, two blocks long (the
  // display on the line between them), a counter high.
  {
    const parts = [box(-15, 0, 1, 15, 15, 15, { all: 1, up: 0, down: 2, north: 0 }), box(-15, 6, 0.9, 15, 7, 1, 3, { dirs: ['north'] })]
    for (const x of [-13, 1]) {
      parts.push(box(x, 13, 3, x + 12, 15.02, 13, 4, { dirs: ['up'] })) // the oil
      parts.push(box(x + 1, 15, 4, x + 11, 15.4, 12, 5, { dirs: ['up', 'north', 'south', 'east', 'west'] })) // the basket's rim
      parts.push(box(x + 5, 15, 0.5, x + 7, 18, 4, 3)) // its handle
      parts.push(box(x + 2, 2, 0.9, x + 10, 10, 1, 2, { dirs: ['north'] })) // a door
      parts.push(box(x + 8.5, 6, 0.6, x + 9.5, 7, 0.9, 6)) // its knob
    }
    model('fryer', [...STEEL, [200, 150, 50], [150, 150, 158, 200], [30, 30, 34]], parts)
  }

  // ---- The stand mixer (the Donut Shop's kitchen counter): a pink mixer with a steel bowl.
  model('mixer', [[236, 120, 160], [250, 160, 190], [190, 80, 120], ...STEEL, [250, 240, 220]], [
    box(3, 0, 3, 13, 2, 14, { all: 0, up: 1, down: 2 }), // the base
    box(9, 2, 9, 13, 13, 14, { all: 0, north: 1 }), // the column
    box(3, 11, 6, 13, 15, 14, { all: 0, up: 1, down: 2 }), // the head
    box(4, 2, 4, 10, 8, 10, { all: 4, up: 3 }), // the bowl
    box(4.6, 7.6, 4.6, 9.4, 8.02, 9.4, 7, { dirs: ['up'] }), // the batter
    box(6.5, 8, 6.5, 7.5, 11, 7.5, 5) // the beater's shaft
  ])

  // ---- A bakery box (the Donut Shop's counter): pink, a window in the lid showing donuts.
  model('bakerybox', [[240, 140, 180], [250, 180, 210], [200, 100, 140], [220, 236, 246, 120], [226, 170, 102], [250, 156, 196]], [
    box(2, 0, 3, 14, 4, 13, { all: 0, up: 0, down: 2 }),
    box(4.5, 3, 5, 7.5, 3.9, 8, 4), box(8.5, 3, 5, 11.5, 3.9, 8, 5), box(4.5, 3, 8.5, 7.5, 3.9, 11.5, 5), box(8.5, 3, 8.5, 11.5, 3.9, 11.5, 4),
    box(4, 4, 4.5, 12, 4.05, 11.5, 3, { dirs: ['up'] }), // the window
    box(2, 4, 3, 14, 4.05, 4.5, 1, { dirs: ['up'] }), box(2, 4, 11.5, 14, 4.05, 13, 1, { dirs: ['up'] }),
    box(2, 4, 4.5, 4, 4.05, 11.5, 1, { dirs: ['up'] }), box(12, 4, 4.5, 14, 4.05, 11.5, 1, { dirs: ['up'] })
  ])

  // Block letters (3x5) for the painted signs.
  function glyphs (c, text, x, y, col) {
    const F = { A: ['010', '101', '111', '101', '101'], T: ['111', '010', '010', '010', '010'], M: ['10001', '11011', '10101', '10001', '10001'] }
    for (const ch of text) {
      const g = F[ch]
      g.forEach((row, dy) => [...row].forEach((b, dx) => { if (b === '1') c.set(x + dx, y + dy, col) }))
      x += g[0].length + 1
    }
  }
}
