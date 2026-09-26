// Draws Donating's item and HUD art into pack\ (all drawn here from scratch, like make-phone-art.js):
//   - the bag, per tier: a 16x16 inventory icon and a 3D duffel (block model + 32x32 texture) shown in
//     the offhand, on the ground (a dropped duffel) and in item frames
//   - ammo icons: light (pistol/SMG rounds), shells (shotgun), rifle
//   - the XP bar as a brass ammo belt (the XP bar shows the held gun's ammo, hud.sk)
//   - tab-list glyphs: the DONATING logo, a coin, a skull (bounty), a person (online), ping bars
// and the JSON that wires them up. Items are picked by their first custom_model_data string
// ("donating:bag_2", "donating:ammo_light"); anything without one keeps the vanilla look, and without
// the pack every item looks vanilla (leather, nuggets).
//
// Usage: tools\node\node.exe tools\make-item-art.js   (then tools\build-pack.js)
const fs = require('fs')
const path = require('path')
const { canvas, shade } = require('./png')

const PACK = path.join(__dirname, '..', 'pack', 'assets')
const write = (rel, data) => {
  const file = path.join(PACK, ...rel.split('/'))
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, typeof data === 'string' ? data : Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n')
}

// ---------- Bags ----------
// O outline, L top light, B body, D bottom dark, S stripe, E/e end caps, H straps and handle, Z zipper.
const OUT = [20, 20, 24, 255]
const BAGS = {
  1: { name: 'Gym Bag', B: [45, 85, 165], L: [80, 120, 200], D: [30, 55, 115], S: [235, 235, 240], E: [35, 65, 130], e: [25, 48, 98], H: [22, 22, 28], Z: [190, 190, 196] },
  2: { name: 'Duffel Bag', B: [96, 104, 58], L: [124, 134, 78], D: [66, 72, 40], S: [176, 154, 98], E: [80, 86, 48], e: [58, 63, 35], H: [98, 64, 36], Z: [206, 172, 78] },
  3: { name: 'Hockey Bag', B: [172, 36, 36], L: [212, 62, 56], D: [116, 22, 22], S: [28, 28, 30], E: [40, 40, 44], e: [26, 26, 29], H: [24, 24, 26], Z: [196, 196, 202] },
  4: { name: 'Armored Duffel', B: [74, 80, 88], L: [104, 111, 121], D: [48, 52, 58], S: [128, 134, 144], E: [122, 128, 138], e: [88, 93, 102], H: [20, 20, 22], Z: [150, 155, 165], rivet: [190, 196, 204] },
  5: { name: 'Vault Bag', B: [34, 32, 36], L: [60, 58, 64], D: [20, 19, 22], S: [222, 182, 62], E: [205, 165, 52], e: [150, 116, 34], H: [140, 104, 36], Z: [236, 200, 90], lock: [236, 200, 90] }
}
const colorsOf = t => {
  const b = BAGS[t]
  const c = { O: OUT }
  for (const k of ['B', 'L', 'D', 'S', 'E', 'e', 'H', 'Z']) c[k] = [...b[k], 255]
  return c
}
const ICON = [
  '................',
  '................',
  '................',
  '.....HHHHHH.....',
  '....H......H....',
  '....H......H....',
  '..OOHOOOOOOHOO..',
  '.OELHLZZZZLHLEO.',
  '.OeLHLLLLLLHLeO.',
  '.OeBHBBBBBBHBeO.',
  '.OeSHSSSSSSHSeO.',
  '.OeBHBBBBBBHBeO.',
  '.OeDHDDDDDDHDeO.',
  '..OOOOOOOOOOOO..',
  '................',
  '................'
]
for (const t of Object.keys(BAGS)) {
  const b = BAGS[t]
  const c = canvas(16, 16)
  c.draw(ICON, colorsOf(t))
  // The handle catches the light on top.
  for (let x = 5; x <= 10; x++) c.set(x, 3, shade([...b.H, 255], 1.6))
  if (b.rivet) for (const x of [3, 6, 9, 12]) c.set(x, 10, [...b.rivet, 255])
  if (b.lock) {
    c.set(7, 9, [...b.lock, 255]); c.set(8, 9, [...b.lock, 255])
    c.set(7, 10, shade([...b.lock, 255], 0.8)); c.set(8, 10, [30, 24, 10, 255])
  }
  write(`donating/textures/item/bag_${t}.png`, c.png())
  write(`donating/models/item/bag_${t}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `donating:item/bag_${t}` } })
}

// 3D duffel texture, 32x32 (2 texels per model unit). Regions, in model UV units:
//   side  [0,0,12,6]   the long sides        top [0,6,12,12]  top and bottom
//   end   [12,0,16,4]  the round end caps    handle [12,4,16,6]
for (const t of Object.keys(BAGS)) {
  const b = BAGS[t]
  const col = k => [...b[k], 255]
  const c = canvas(32, 32)
  // Side: light top rows, body, stripe, dark bottom; straps at 1/4 and 3/4 of the length.
  for (let y = 0; y < 12; y++) {
    const k = y < 2 ? 'L' : y < 5 ? 'B' : y < 7 ? 'S' : y < 10 ? 'B' : 'D'
    c.fill(0, y, 23, y, col(k))
  }
  c.fill(0, 0, 23, 0, shade(col('L'), 1.1))
  c.fill(0, 11, 23, 11, shade(col('D'), 0.8))
  for (const x of [5, 6, 17, 18]) c.fill(x, 0, x, 11, col('H'))
  if (b.rivet) for (let x = 1; x < 24; x += 3) c.set(x, 5, [...b.rivet, 255])
  if (b.lock) { c.fill(11, 4, 12, 7, col('Z')); c.set(11, 6, [30, 24, 10, 255]); c.set(12, 6, [30, 24, 10, 255]) }
  // Top: body with a zipper down the middle and the straps across.
  for (let y = 12; y < 24; y++) c.fill(0, y, 23, y, col(y === 12 || y === 23 ? 'B' : 'L'))
  c.fill(0, 17, 23, 18, col('Z'))
  for (let x = 1; x < 24; x += 2) c.set(x, 17, shade(col('Z'), 0.75))
  for (const x of [5, 6, 17, 18]) c.fill(x, 12, x, 23, col('H'))
  // End cap: a round cap with a darker ring.
  const cap = ['..eeee..', '.eEEEEe.', 'eEEEEEEe', 'eEEOOEEe', 'eEEOOEEe', 'eEEEEEEe', '.eEEEEe.', '..eeee..']
  c.fill(24, 0, 31, 7, col('e'))
  c.draw(cap, { e: col('e'), E: col('E'), O: shade(col('E'), 0.7) }, 24, 0)
  // Handle: strap color with a highlight.
  c.fill(24, 8, 31, 11, col('H'))
  c.fill(24, 8, 31, 8, shade(col('H'), 1.7))
  write(`donating/textures/item/bag_${t}_3d.png`, c.png())
  const face = uv => ({ uv, texture: '#bag' })
  const box = (from, to, uv) => ({ from, to, faces: { north: face(uv), south: face(uv), east: face(uv), west: face(uv), up: face(uv), down: face(uv) } })
  const body = {
    from: [2, 3, 5], to: [14, 9, 11],
    faces: {
      north: face([0, 0, 12, 6]), south: face([0, 0, 12, 6]),
      up: face([0, 6, 12, 12]), down: face([0, 6, 12, 12]),
      east: face([12, 0, 16, 4]), west: face([12, 0, 16, 4])
    }
  }
  write(`donating/models/item/bag_${t}_3d.json`, {
    textures: { bag: `donating:item/bag_${t}_3d`, particle: `donating:item/bag_${t}_3d` },
    elements: [
      body,
      box([1.4, 3.5, 5.5], [2, 8.5, 10.5], [12, 0, 16, 4]), // end caps bulge a little
      box([14, 3.5, 5.5], [14.6, 8.5, 10.5], [12, 0, 16, 4]),
      box([4.6, 9, 7.5], [5.4, 11, 8.5], [12, 4, 16, 6]), // handle posts and bar
      box([10.6, 9, 7.5], [11.4, 11, 8.5], [12, 4, 16, 6]),
      box([4.6, 11, 7.5], [11.4, 11.8, 8.5], [12, 4, 16, 6])
    ],
    // Carried in the offhand like a duffel by its handle; on the ground it's a dropped duffel.
    display: {
      thirdperson_righthand: { rotation: [90, 90, 0], translation: [5, 0, 0], scale: [0.55, 0.55, 0.55] },
      thirdperson_lefthand: { rotation: [90, 90, 0], translation: [5, 0, 0], scale: [0.55, 0.55, 0.55] },
      firstperson_righthand: { rotation: [0, 15, 0], translation: [1, 2.5, 0], scale: [0.3, 0.3, 0.3] },
      firstperson_lefthand: { rotation: [0, 15, 0], translation: [1, 2.5, 0], scale: [0.3, 0.3, 0.3] },
      ground: { translation: [0, 1, 0], scale: [0.6, 0.6, 0.6] },
      fixed: { rotation: [0, 0, 0], scale: [0.9, 0.9, 0.9] },
      head: { translation: [0, 12, 0], scale: [0.8, 0.8, 0.8] }
    }
  })
}
// leather.json: a bag's icon in inventories, the 3D duffel everywhere else.
const bagCase = t => ({
  when: `donating:bag_${t}`,
  model: {
    type: 'minecraft:select',
    property: 'minecraft:display_context',
    cases: [{ when: ['gui'], model: { type: 'minecraft:model', model: `donating:item/bag_${t}` } }],
    fallback: { type: 'minecraft:model', model: `donating:item/bag_${t}_3d` }
  }
})
write('minecraft/items/leather.json', {
  model: {
    type: 'minecraft:select',
    property: 'minecraft:custom_model_data',
    index: 0,
    cases: Object.keys(BAGS).map(bagCase),
    fallback: { type: 'minecraft:model', model: 'minecraft:item/leather' }
  }
})

// ---------- Ammo ----------
// k outline, c/C/d copper tip (light/mid/dark), b/B/n brass (light/mid/dark), r/R rim, s/S/x red hull.
const AMMO_COLORS = {
  k: [44, 30, 18, 255],
  c: [236, 160, 110, 255], C: [190, 110, 66, 255], d: [134, 74, 44, 255],
  b: [246, 218, 128, 255], B: [214, 174, 74, 255], n: [160, 122, 44, 255],
  r: [176, 138, 56, 255], R: [124, 92, 34, 255],
  s: [232, 76, 64, 255], S: [186, 36, 32, 255], x: [120, 20, 20, 255]
}
const PISTOL = ['..k..', '.kck.', 'kcCdk', 'kcCdk', 'kbBnk', 'kbBnk', 'kbBnk', 'kbBnk', 'krRRk', '.kkk.']
const SHELL = ['kkkkk', 'ksSxk', 'ksSxk', 'ksSxk', 'ksSxk', 'ksSxk', 'ksSxk', 'kbBnk', 'kbBnk', 'krRRk', '.kkk.']
const RIFLE = ['..k..', '..k..', '.kck.', '.kCk.', 'kcCdk', 'kcCdk', 'kbBnk', 'kbBnk', 'kbBnk', 'kbBnk', 'kbBnk', 'kbBnk', 'krRRk', '.kkk.']
const ammoIcon = (shape, spots) => {
  const c = canvas(16, 16)
  for (const [x, y] of spots) c.draw(shape, AMMO_COLORS, x, y)
  return c.png()
}
const AMMO = {
  light: { item: 'iron_nugget', png: ammoIcon(PISTOL, [[1, 5], [5, 4], [9, 5]]) },
  shells: { item: 'copper_nugget', png: ammoIcon(SHELL, [[3, 3], [8, 4]]) },
  rifle: { item: 'gold_nugget', png: ammoIcon(RIFLE, [[3, 1], [8, 2]]) }
}
for (const [type, a] of Object.entries(AMMO)) {
  write(`donating/textures/item/ammo_${type}.png`, a.png)
  write(`donating/models/item/ammo_${type}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `donating:item/ammo_${type}` } })
  write(`minecraft/items/${a.item}.json`, {
    model: {
      type: 'minecraft:select',
      property: 'minecraft:custom_model_data',
      index: 0,
      cases: [{ when: `donating:ammo_${type}`, model: { type: 'minecraft:model', model: `donating:item/ammo_${type}` } }],
      fallback: { type: 'minecraft:model', model: `minecraft:item/${a.item}` }
    }
  })
}

// ---------- The XP bar: a brass ammo belt ----------
// 182x5 like vanilla. Every 5 texels a darker seam, like rounds in a belt.
{
  const bg = canvas(182, 5)
  bg.fill(0, 0, 181, 4, [12, 12, 14, 255])
  bg.fill(1, 1, 180, 3, [46, 48, 54, 255])
  for (let x = 5; x < 181; x += 5) bg.fill(x, 1, x, 3, [32, 33, 38, 255])
  write('minecraft/textures/gui/sprites/hud/experience_bar_background.png', bg.png())
  const fg = canvas(182, 5)
  fg.fill(0, 0, 181, 4, [40, 30, 10, 255])
  fg.fill(1, 1, 180, 1, [246, 218, 128, 255])
  fg.fill(1, 2, 180, 2, [214, 174, 74, 255])
  fg.fill(1, 3, 180, 3, [160, 122, 44, 255])
  for (let x = 5; x < 181; x += 5) fg.fill(x, 1, x, 3, [120, 88, 30, 255])
  write('minecraft/textures/gui/sprites/hud/experience_bar_progress.png', fg.png())
}

// ---------- Tab-list glyphs (font) ----------
// U+E000 logo, U+E001 coin, U+E002 skull (bounty), U+E003 person (online), U+E004 ping bars.
{
  const LETTERS = {
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.']
  }
  const word = 'DONATING'
  const S = 2 // texels per letter pixel
  const widths = [...word].map(ch => LETTERS[ch][0].length)
  const W = widths.reduce((a, w) => a + w * S + S, 0) - S + 4
  const H = 7 * S + 4
  const c = canvas(W, H)
  const gold = y => {
    const f = y / (7 * S - 1) // top light gold -> deep orange
    return [Math.round(255 - 30 * f), Math.round(222 - 110 * f), Math.round(96 - 76 * f), 255]
  }
  let x0 = 2
  const on = new Set()
  for (const ch of word) {
    LETTERS[ch].forEach((row, ly) => [...row].forEach((p, lx) => {
      if (p !== '#') return
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) on.add(`${x0 + lx * S + dx},${2 + ly * S + dy}`)
    }))
    x0 += LETTERS[ch][0].length * S + S
  }
  // Outline and a drop shadow first, then the letters.
  for (const k of on) {
    const [x, y] = k.split(',').map(Number)
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [1, 2], [0, 2]]) {
      if (!on.has(`${x + dx},${y + dy}`)) c.set(x + dx, y + dy, [34, 18, 6, 255])
    }
  }
  for (const k of on) { const [x, y] = k.split(',').map(Number); c.set(x, y, gold(y - 2)) }
  write('donating/textures/font/logo.png', c.png())

  const icon = (rows, colors) => { const i = canvas(8, 8); i.draw(rows, colors); return i.png() }
  write('donating/textures/font/coin.png', icon(
    ['..kkkk..', '.kyYYYk.', 'kyYWYYYk', 'kYYYYYYk', 'kYYYYYok', 'kYYYYook', '.kYoook.', '..kkkk..'],
    { k: [90, 60, 10, 255], y: [255, 236, 150, 255], Y: [240, 190, 60, 255], o: [196, 140, 30, 255], W: [255, 255, 230, 255] }))
  write('donating/textures/font/skull.png', icon(
    ['.kkkkkk.', 'kWWWWWWk', 'kWkWWkWk', 'kWkWWkWk', 'kWWWWWWk', '.kWkkWk.', '.kWWWWk.', '..kkkk..'],
    { k: [40, 20, 20, 255], W: [236, 232, 220, 255] }))
  write('donating/textures/font/person.png', icon(
    ['..kkkk..', '..kWWk..', '..kWWk..', '..kkkk..', '.kWWWWk.', 'kWWWWWWk', 'kWWWWWWk', 'kkkkkkkk'],
    { k: [30, 30, 36, 255], W: [210, 214, 222, 255] }))
  write('donating/textures/font/ping.png', icon(
    ['......GG', '......GG', '....GGGG', '....GGGG', '..GGGGGG', '..GGGGGG', 'GGGGGGGG', 'GGGGGGGG'],
    { G: [96, 220, 104, 255] }))
  // The vanilla default font (26.3) plus our glyphs.
  write('minecraft/font/default.json', {
    providers: [
      { type: 'reference', id: 'minecraft:include/space' },
      { type: 'reference', id: 'minecraft:include/default', filter: { uniform: false } },
      { type: 'reference', id: 'minecraft:include/unifont' },
      { type: 'bitmap', file: 'donating:font/logo.png', ascent: 17, height: 18, chars: ['\ue000'] },
      { type: 'bitmap', file: 'donating:font/coin.png', ascent: 7, height: 8, chars: ['\ue001'] },
      { type: 'bitmap', file: 'donating:font/skull.png', ascent: 7, height: 8, chars: ['\ue002'] },
      { type: 'bitmap', file: 'donating:font/person.png', ascent: 7, height: 8, chars: ['\ue003'] },
      { type: 'bitmap', file: 'donating:font/ping.png', ascent: 7, height: 8, chars: ['\ue004'] }
    ]
  })
}
console.log('wrote bag, ammo, XP bar and tab-list art to pack\\assets')
