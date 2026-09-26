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
  5: { name: 'Vault Bag', B: [34, 32, 36], L: [60, 58, 64], D: [20, 19, 22], S: [222, 182, 62], E: [205, 165, 52], e: [150, 116, 34], H: [140, 104, 36], Z: [236, 200, 90], lock: [236, 200, 90] },
  // Not a tier: the dropped duffel a death leaves (bag.sk), canvas with a green band and a gold $.
  loot: { name: 'Loot Duffel', B: [150, 122, 74], L: [182, 152, 98], D: [104, 82, 46], S: [52, 128, 64], E: [120, 96, 56], e: [88, 68, 38], H: [44, 34, 24], Z: [206, 188, 120], dollar: [240, 204, 84] },
  // Bag skins (ranks.sk, 2026-09-26): a paid rank's look for whatever tier you carry. Looks only: the
  // capacity is always the tier's. camo = blotch colors over the body; glow = the 3D model lights up.
  camo: { name: 'Camo', B: [92, 104, 60], L: [118, 130, 80], D: [62, 70, 40], S: [70, 58, 40], E: [74, 84, 48], e: [52, 60, 34], H: [40, 34, 26], Z: [150, 140, 100], camo: [[58, 48, 34], [134, 120, 78], [48, 64, 36]] },
  arctic: { name: 'Arctic', B: [226, 232, 238], L: [246, 250, 252], D: [178, 188, 198], S: [120, 186, 222], E: [196, 206, 216], e: [150, 162, 176], H: [72, 80, 92], Z: [120, 186, 222], camo: [[186, 196, 206], [150, 170, 190]] },
  gilded: { name: 'Gilded', B: [236, 232, 222], L: [250, 248, 240], D: [196, 190, 176], S: [214, 170, 52], E: [214, 170, 52], e: [160, 124, 32], H: [120, 90, 30], Z: [232, 196, 80], rivet: [240, 204, 84] },
  neon: { name: 'Neon', B: [52, 22, 78], L: [78, 36, 112], D: [34, 12, 52], S: [255, 64, 200], E: [255, 64, 200], e: [190, 40, 150], H: [40, 230, 240], Z: [40, 230, 240], glow: true }
}
// Blotches over the body color only (straps, zipper and stripe stay clean): a fixed pattern.
const camoPaint = (c, b, x0, y0, x1, y1) => {
  const body = [b.B, b.L, b.D].map(v => v.join(','))
  let seed = 7
  // 32-bit LCG (Math.imul keeps it exact; the high bits are the random ones).
  const rnd = n => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 16) % n }
  const n = Math.floor(((x1 - x0 + 1) * (y1 - y0 + 1)) / 6)
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd(x1 - x0 + 1)
    const y = y0 + rnd(y1 - y0 + 1)
    const col = [...b.camo[rnd(b.camo.length)], 255]
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const px = x + dx; const py = y + dy
      if (px > x1 || py > y1) continue
      if (body.includes(c.get(px, py).slice(0, 3).join(','))) c.set(px, py, col)
    }
  }
}
// A 3x5 dollar sign for the loot duffel.
const DOLLAR = ['.$$', '$$.', '.$.', '.$$', '$$.']
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
  if (b.dollar) c.draw(DOLLAR, { $: [...b.dollar, 255] }, 7, 8)
  if (b.camo) camoPaint(c, b, 2, 7, 13, 12)
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
  // The loot duffel's gold $ on both long sides, over the band.
  if (b.dollar) c.draw(DOLLAR.map(r => [...r].map(ch => ch + ch).join('')), { $: [...b.dollar, 255] }, 9, 3)
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
  if (b.camo) { camoPaint(c, b, 0, 0, 23, 11); camoPaint(c, b, 0, 12, 23, 23) }
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
  const elements = [
    body,
    box([1.4, 3.5, 5.5], [2, 8.5, 10.5], [12, 0, 16, 4]), // end caps bulge a little
    box([14, 3.5, 5.5], [14.6, 8.5, 10.5], [12, 0, 16, 4]),
    box([4.6, 9, 7.5], [5.4, 11, 8.5], [12, 4, 16, 6]), // handle posts and bar
    box([10.6, 9, 7.5], [11.4, 11, 8.5], [12, 4, 16, 6]),
    box([4.6, 11, 7.5], [11.4, 11.8, 8.5], [12, 4, 16, 6])
  ]
  // The Neon skin glows in the dark (26.3 model elements take light_emission).
  if (b.glow) for (const e of elements) e.light_emission = 12
  write(`donating/models/item/bag_${t}_3d.json`, {
    textures: { bag: `donating:item/bag_${t}_3d`, particle: `donating:item/bag_${t}_3d` },
    elements,
    // Carried in the offhand like a duffel by its handle; on the ground it's a dropped duffel.
    display: {
      thirdperson_righthand: { rotation: [90, 90, 0], translation: [0, 0, -1.9], scale: [0.55, 0.55, 0.55] },
      thirdperson_lefthand: { rotation: [90, 90, 0], translation: [0, 0, -1.9], scale: [0.55, 0.55, 0.55] },
      firstperson_righthand: { rotation: [0, 15, 0], translation: [1, 2.5, 0], scale: [0.3, 0.3, 0.3] },
      firstperson_lefthand: { rotation: [0, 15, 0], translation: [1, 2.5, 0], scale: [0.3, 0.3, 0.3] },
      ground: { translation: [0, 1, 0], scale: [0.6, 0.6, 0.6] },
      fixed: { rotation: [0, 0, 0], scale: [0.9, 0.9, 0.9] },
      head: { translation: [0, 12, 0], scale: [0.8, 0.8, 0.8] }
    }
  })
}
// leather.json: a bag's icon in inventories, the 3D duffel everywhere else (bag_loot: the dropped duffel).
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
  // Replacing the offhand bag when its fill changes must not play the re-equip dip (26.3 client).
  hand_animation_on_swap: false,
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
// Each vanilla item's definition picks our model by the first custom_model_data string; several of our
// items can share one base item (the gold nugget is rifle ammo and the loot marker), so the cases are
// collected here and every items/<base>.json is written once at the end.
const itemCases = {}
const addCase = (base, when, model, fallback = `minecraft:item/${base}`) => {
  if (!itemCases[base]) itemCases[base] = { fallback, cases: [] }
  itemCases[base].cases.push({ when, model: { type: 'minecraft:model', model } })
}
const sprite = (name, png) => {
  write(`donating/textures/item/${name}.png`, png)
  write(`donating/models/item/${name}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `donating:item/${name}` } })
}
for (const [type, a] of Object.entries(AMMO)) {
  sprite(`ammo_${type}`, a.png)
  addCase(a.item, `donating:ammo_${type}`, `donating:item/ammo_${type}`)
}

// ---------- Loot pieces, the loot marker, heist tools (loot.sk) ----------
// Loot pieces are item displays lying flat (pitch 90), so a generated sprite reads from above like a
// real stack of bills or a bar. The marker floats over loot you can take (billboarded, glowing). Tools
// sit in hotbar 1-5. Base items (core.sk): cash paper, jewel diamond, gold gold_ingot, goods emerald, art
// gold_block, marker gold_nugget, drill iron_ingot, safe kit flint.
{
  const K = [28, 24, 20, 255]
  const art = (rows, colors) => { const c = canvas(16, 16); c.draw(rows, { k: K, ...colors }); return c.png() }
  sprite('loot_cash', art([
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kLLLLLWWLLLLLk.',
    '.kGGGGGWWGGGGGk.',
    '.kGggGGWwGGggGk.',
    '.kGgdgGWwGgdgGk.',
    '.kGggGGWwGGggGk.',
    '.kGGGGGWwGGGGGk.',
    '.kLLLLLWWLLLLLk.',
    '.kDDDDDwwDDDDDk.',
    '.kDDDDDwwDDDDDk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................'
  ], { L: [150, 214, 140, 255], G: [104, 176, 96, 255], g: [72, 138, 70, 255], d: [44, 96, 46, 255], D: [58, 112, 56, 255], W: [240, 236, 214, 255], w: [196, 190, 162, 255] }))
  addCase('paper', 'donating:loot_cash', 'donating:item/loot_cash')
  sprite('loot_jewel', art([
    '................',
    '................',
    '....kkkkkkkk....',
    '...kwbBBBBbdk...',
    '..kwbbBBBBbbdk..',
    '.kkkkkkkkkkkkkk.',
    '..kbBBbwbbBBdk..',
    '...kbBBbbBBdk...',
    '....kbBbbBdk....',
    '.....kbBBdk.....',
    '......kBdk......',
    '.......kk.......',
    '..........kkk...',
    '.........kRrRk..',
    '..........kkk...',
    '................'
  ], { w: [236, 250, 255, 255], b: [150, 220, 250, 255], B: [72, 170, 236, 255], d: [30, 104, 180, 255], R: [230, 50, 70, 255], r: [255, 160, 170, 255] }))
  addCase('diamond', 'donating:loot_jewel', 'donating:item/loot_jewel')
  sprite('loot_gold', art([
    '................',
    '................',
    '................',
    '................',
    '....kkkkkkkk....',
    '...kWYYYYYYYk...',
    '..kYyyyyyyyyYk..',
    '.kYyyyyYYyyyyYk.',
    '.kkkkkkkkkkkkkk.',
    '.kOOOOOOOOOOOOk.',
    '.kOooooooooooOk.',
    '.kOooooooooooOk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................'
  ], { W: [255, 250, 210, 255], Y: [255, 222, 90, 255], y: [240, 190, 50, 255], O: [214, 150, 30, 255], o: [178, 118, 20, 255] }))
  addCase('gold_ingot', 'donating:loot_gold', 'donating:item/loot_gold')
  sprite('loot_goods', art([
    '......kkkk......',
    '......kSSk......',
    '......kSsk......',
    '....kkkkkkkk....',
    '...kYWWWWWWYk...',
    '..kYWWWkWWWWYk..',
    '..kYWWWkWWWWYk..',
    '..kYWWWkkkWWYkk.',
    '..kYWWWWWWWWYk..',
    '...kYWWWWWWYk...',
    '....kkkkkkkk....',
    '......kSsk......',
    '......kSSk......',
    '......kkkk......',
    '................',
    '................'
  ], { S: [90, 60, 40, 255], s: [60, 40, 26, 255], Y: [236, 190, 70, 255], W: [246, 244, 236, 255] }))
  addCase('emerald', 'donating:loot_goods', 'donating:item/loot_goods')
  sprite('loot_art', art([
    '......kkkk......',
    '.....kYYYYk.....',
    '.....kYkkYk.....',
    '.....kYYYYk.....',
    '......kYYk......',
    '....kkYYYYkk....',
    '...kYYyYYyYYk...',
    '...kYkYYYYkYk...',
    '...kk.kYYk.kk...',
    '......kYYk......',
    '.....kYyyYk.....',
    '....kkkkkkkk....',
    '....kRRRRRRk....',
    '....krrrrrrk....',
    '....kkkkkkkk....',
    '................'
  ], { Y: [250, 204, 70, 255], y: [210, 150, 36, 255], R: [150, 30, 40, 255], r: [110, 20, 30, 255] }))
  addCase('gold_block', 'donating:loot_art', 'donating:item/loot_art', 'minecraft:block/gold_block')
  sprite('marker', art([
    '................',
    '....kkkkkkkk....',
    '....kWWWWWWk....',
    '....kWwwwwWk....',
    '....kWwwwwWk....',
    '.kkkkWwwwwWkkkk.',
    '..kWWwwwwwwWWk..',
    '...kWwwwwwwWk...',
    '....kWwwwwWk....',
    '.....kWwwWk.....',
    '......kWWk......',
    '.......kk.......',
    '................',
    '................',
    '................',
    '................'
  ], { W: [255, 255, 255, 255], w: [255, 236, 150, 255] }))
  addCase('gold_nugget', 'donating:marker', 'donating:item/marker')
  sprite('tool_drill', art([
    '................',
    '................',
    '................',
    '.kkkkkkkkkk.....',
    '.kYYYYYYYYYkkkk.',
    '.kYyyyyyyyYkGGkS',
    '.kYyyyyyyyYkGgkS',
    '.kkkkyyykkkkkkk.',
    '....kyyyk.......',
    '....kyyyk.......',
    '....kDDDk.......',
    '....kDDDk.......',
    '...kkkkkkk......',
    '...kBBBBBk......',
    '...kkkkkkk......',
    '................'
  ], { Y: [250, 200, 40, 255], y: [220, 160, 20, 255], G: [150, 154, 160, 255], g: [110, 114, 120, 255], S: [210, 214, 220, 255], D: [40, 40, 44, 255], B: [70, 70, 76, 255] }))
  addCase('iron_ingot', 'donating:tool_drill', 'donating:item/tool_drill')
  sprite('tool_safe_kit', art([
    '................',
    '................',
    '................',
    '......kkkk......',
    '......k..k......',
    '..kkkkkkkkkkkk..',
    '..kDDDDDDDDDDk..',
    '..kDDDkkkkDDDk..',
    '..kDDkWWWWkDDk..',
    '..kDDkWkWWkDDk..',
    '..kDDkWWWWkDDk..',
    '..kDDDkkkkDDDk..',
    '..kDDDDDDDDDDk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................'
  ], { D: [64, 68, 76, 255], W: [236, 236, 228, 255] }))
  // The tool id is "safe-kit" (shop.sk's toolItem writes donating:tool_<id>).
  addCase('flint', 'donating:tool_safe-kit', 'donating:item/tool_safe_kit')
}
// ---------- Gear: helmets and vests (owner, 2026-09-25: tactical gear art) ----------
// An inventory icon per piece (picked by donating:gear_<id> on the base item) and the look when worn:
// shop.sk gives the item an equippable component with asset_id donating:<asset>, so the client draws
// assets/donating/equipment/<asset>.json -> textures/entity/equipment/humanoid/<asset>.png (the 64x32
// armor layout: head at 0,0, body at 16,16, arms at 40,16; transparent = nothing drawn, so arms and
// the face stay visible).
{
  const K = [22, 22, 24, 255]
  const GEAR = {
    'helmet-1': { asset: 'helmet_1', base: 'iron_helmet', S: [104, 112, 124], H: [140, 148, 160], s: [72, 78, 88], B: [30, 30, 34] },
    'helmet-2': { asset: 'helmet_2', base: 'diamond_helmet', S: [70, 78, 52], H: [96, 106, 72], s: [48, 54, 36], B: [26, 26, 28], G: [70, 190, 226] },
    'vest-1': { asset: 'vest_1', base: 'chainmail_chestplate', V: [44, 60, 96], H: [66, 86, 130], s: [30, 42, 70], P: [36, 50, 82], B: [24, 24, 28] },
    'vest-2': { asset: 'vest_2', base: 'diamond_chestplate', V: [42, 44, 48], H: [66, 68, 74], s: [28, 29, 32], P: [70, 78, 54], B: [18, 18, 20] }
  }
  const rgba = c => [...c, 255]
  for (const [id, g] of Object.entries(GEAR)) {
    const col = {}
    for (const k of ['S', 'H', 's', 'B', 'G', 'V', 'P']) if (g[k]) col[k] = rgba(g[k])
    const icon = canvas(16, 16)
    const tex = canvas(64, 32)
    if (id.startsWith('helmet')) {
      icon.draw([
        '................',
        '................',
        '................',
        '.....kkkkkk.....',
        '....kHHSSSSk....',
        '...kHSSSSSSSk...',
        '..kHSSSSSSSSSk..',
        '..kSSSSSSSSSSk..',
        '..kSSSSSSSSSSk..',
        '..ksssssssssskk.',
        '..kkkkkkkkkkkkk.',
        '..kB.......kB...',
        '...kB.....kB....',
        '....kkkkkkk.....',
        '................',
        '................'
      ], { k: K, ...col })
      if (g.G) icon.draw(['kkkkk', 'kGkGk', 'kkkkk'], { k: K, G: col.G }, 3, 7)
      // Worn: the head box (8x8x8) at 0,0. Top all shell; sides and back the upper part; the front a
      // brim over the forehead (goggles on the tactical one); the face stays open.
      tex.fill(8, 0, 15, 7, col.S)
      tex.fill(9, 1, 14, 2, col.H)
      for (const [x0, x1] of [[0, 7], [16, 23], [24, 31]]) {
        tex.fill(x0, 8, x1, 11, col.S)
        tex.fill(x0, 8, x1, 8, col.H)
        tex.fill(x0, 11, x1, 11, col.s)
      }
      // Ear covers at the back half of each side, and the back comes down further.
      tex.fill(4, 12, 7, 13, col.S); tex.fill(16, 12, 19, 13, col.S)
      tex.fill(24, 12, 31, 13, col.s)
      // Chin straps.
      tex.fill(3, 12, 3, 15, col.B); tex.fill(20, 12, 20, 15, col.B)
      // Front brim.
      tex.fill(8, 8, 15, 10, col.S)
      tex.fill(8, 8, 15, 8, col.H)
      tex.fill(8, 11, 15, 11, col.s)
      if (g.G) {
        tex.fill(8, 10, 15, 11, col.B)
        tex.fill(9, 10, 10, 11, col.G); tex.fill(13, 10, 14, 11, col.G)
        tex.fill(11, 7, 12, 7, col.B) // the night-vision mount on top of the brim
      }
    } else {
      icon.draw([
        '................',
        '................',
        '....kk....kk....',
        '...kVVk..kVVk...',
        '...kVHkkkkHVk...',
        '..kVVVVVVVVVVk..',
        '..kHVVVVVVVVHk..',
        '..kVPPkVVkPPVk..',
        '..kVPPkVVkPPVk..',
        '..kVVVVVVVVVVk..',
        '..kVPPPVVPPPVk..',
        '..kVPPPVVPPPVk..',
        '..ksssssssssk...',
        '..kBBBBBBBBBBk..',
        '..kkkkkkkkkkkk..',
        '................'
      ], { k: K, ...col })
      // Worn: the body box (8x12x4) at 16,16: shoulder straps on top, the vest on front, sides and
      // back down to the belt; pouches on the front (and the back of the heavy one).
      tex.fill(20, 16, 21, 19, col.V); tex.fill(26, 16, 27, 19, col.V)
      for (const [x0, x1] of [[16, 19], [20, 27], [28, 31], [32, 39]]) {
        tex.fill(x0, 20, x1, 29, col.V)
        tex.fill(x0, 20, x1, 20, col.H)
        tex.fill(x0, 29, x1, 29, col.s)
        tex.fill(x0, 30, x1, 30, col.B)
      }
      // The neck opening at the top of the front and back.
      tex.fill(22, 20, 25, 21, [0, 0, 0, 0]); tex.fill(34, 20, 37, 21, [0, 0, 0, 0])
      // Pouches.
      tex.fill(20, 24, 22, 26, col.P); tex.fill(25, 24, 27, 26, col.P)
      tex.fill(20, 27, 27, 28, col.P)
      tex.fill(23, 24, 24, 28, col.V)
      if (id === 'vest-2') { tex.fill(33, 23, 38, 27, col.P); tex.fill(33, 23, 38, 23, shade(col.P, 1.25)) }
      for (const x of [21, 26]) tex.set(x, 24, shade(col.P, 1.3))
    }
    sprite(`gear_${id.replace('-', '_')}`, icon.png())
    addCase(g.base, `donating:gear_${id}`, `donating:item/gear_${id.replace('-', '_')}`)
    write(`donating/textures/entity/equipment/humanoid/${g.asset}.png`, tex.png())
    write(`donating/equipment/${g.asset}.json`, { layers: { humanoid: [{ texture: `donating:${g.asset}` }] } })
  }
}
for (const [base, def] of Object.entries(itemCases)) {
  write(`minecraft/items/${base}.json`, {
    model: {
      type: 'minecraft:select',
      property: 'minecraft:custom_model_data',
      index: 0,
      cases: def.cases,
      fallback: { type: 'minecraft:model', model: def.fallback }
    }
  })
}

// ---------- Bullets: what WeaponMechanics' projectiles look like in flight ----------
// Every sold gun's projectile (WeaponMechanics\projectiles\Donating_Projectiles.yml) is a fake item
// display holding an iron nugget with custom_model_data 7001 (light: Uzi, .50 GS), 7002 (rifle:
// AK-47) or 7003 (pellet: R9-0, 10 a shot); iron_nugget.json picks the tracer for it, and without the
// pack a bullet is just a small flying nugget. The iron nugget is also light ammo (its string case,
// donating:ammo_light), so iron_nugget.json is written again here: the ammo's select first, and its
// fallback dispatches the bullets' numbers. WeaponMechanics turns the display along its flight each
// tick, and an item display points its model's -z side forward (the display renderer turns the entity
// by its yaw/pitch, then the item 180°), so the nose is at low z. The true position is z = 8 and the
// model limit is -16..32 (1 unit = 1/16 block).
// The streak is drawn ahead of the true position, from the nose at z = -16 back to z = 12: for its
// first tick a bullet sits at the shooter's eye (WeaponMechanics moves it on the next tick), and
// anything drawn further back would stick out of the back of their head. The last 0.25 blocks stay
// inside the head. No element has a south (+z, backward) face, so the shooter, looking straight down
// the path, sees nothing of it on that first tick. The display jumps a tick of flight at once (4
// blocks at Projectile_Speed 80, no interpolation), so in flight it reads as fast dashes. Free
// WeaponMechanics 4.3.1 has no particle trails (no Trail classes in its jar). light_emission 15:
// tracers glow at night too.
{
  const TRACERS = {
    light: { cmd: 7001, core: [255, 246, 200], glow: [255, 200, 80, 120], head: [200, 118, 64], tip: [150, 82, 44], nose: -16, headLen: 2.6, headW: 0.9, coreW: 0.4, glowW: 1.1, tail: 12, glowTail: 8 },
    rifle: { cmd: 7002, core: [255, 214, 150], glow: [255, 120, 40, 130], head: [184, 104, 58], tip: [132, 70, 38], nose: -16, headLen: 3.2, headW: 1.0, coreW: 0.5, glowW: 1.3, tail: 12, glowTail: 8 },
    pellet: { cmd: 7003, core: [255, 236, 180], glow: [255, 190, 90, 100], head: [150, 150, 158], tip: [110, 110, 118], nose: -10, headLen: 1.2, headW: 0.7, coreW: 0.3, glowW: 0.8, tail: 12, glowTail: 6 }
  }
  const entries = []
  for (const [kind, t] of Object.entries(TRACERS)) {
    // Four 4x4 swatches; faces sample the middle 2x2 of one, so no neighbour color bleeds in.
    const tex = canvas(16, 16)
    const swatch = (sx, col) => tex.fill(sx, 0, sx + 3, 3, col.length === 4 ? col : [...col, 255])
    swatch(0, t.core); swatch(4, t.glow); swatch(8, t.head); swatch(12, t.tip)
    write(`donating/textures/item/tracer_${kind}.png`, tex.png())
    const uv = sx => [sx + 1, 1, sx + 3, 3]
    const box = (w, z1, z2, sx) => {
      const f = { uv: uv(sx), texture: '#t' }
      const r = n => Math.round(n * 1000) / 1000
      return {
        from: [r(8 - w / 2), r(8 - w / 2), r(z1)], to: [r(8 + w / 2), r(8 + w / 2), r(z2)],
        light_emission: 15,
        faces: { north: f, east: f, west: f, up: f, down: f }
      }
    }
    const tipEnd = t.nose + t.headLen * 0.3
    const headEnd = t.nose + t.headLen
    write(`donating/models/item/tracer_${kind}.json`, {
      textures: { t: `donating:item/tracer_${kind}`, particle: `donating:item/tracer_${kind}` },
      elements: [
        box(t.headW * 0.55, t.nose, tipEnd, 12), // the pointed nose
        box(t.headW, tipEnd, headEnd, 8), // the copper (lead for pellets) bullet
        box(t.coreW, headEnd, t.tail, 0), // the white-hot tracer core
        box(t.glowW, headEnd, t.glowTail, 4) // its see-through glow
      ]
    })
    entries.push({ threshold: t.cmd, model: { type: 'minecraft:model', model: `donating:item/tracer_${kind}` } })
  }
  // Any other number (and none) is a plain iron nugget.
  entries.push({ threshold: 7004, model: { type: 'minecraft:model', model: 'minecraft:item/iron_nugget' } })
  const bullets = {
    type: 'minecraft:range_dispatch',
    property: 'minecraft:custom_model_data',
    index: 0,
    entries,
    fallback: { type: 'minecraft:model', model: 'minecraft:item/iron_nugget' }
  }
  const nugget = itemCases.iron_nugget
  write('minecraft/items/iron_nugget.json', {
    model: nugget
      ? { type: 'minecraft:select', property: 'minecraft:custom_model_data', index: 0, cases: nugget.cases, fallback: bullets }
      : bullets
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
