// Draws Donating's item and HUD art into pack\ (all drawn here from scratch, like make-phone-art.js):
//   - the bag, per tier: a 16x16 inventory icon and a 3D duffel (block model + 32x32 texture) shown in
//     the offhand, on the ground (a dropped duffel) and in item frames
//   - ammo icons: light (pistol/SMG rounds), shells (shotgun), rifle
//   - the XP bar as a brass ammo belt (the XP bar shows the held gun's ammo, hud.sk)
//   - tab-list glyphs: the DONATING logo, a coin, a skull (bounty), a person (online), ping bars
//   - melee weapons and consumables (dagger, bat, throwing knife, energy drink, bandage) and the Grappler:
//     icons and 3D models, and the thrown knife in flight
//   - the sold WeaponMechanics guns (.50 GS, Uzi, AK-47, R9-0), the Combat Knife and the Stim, each in its
//     own module in tools\guns\ (items/feather.json; preview with tools\render-item.js)
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
  neon: { name: 'Neon', B: [52, 22, 78], L: [78, 36, 112], D: [34, 12, 52], S: [255, 64, 200], E: [255, 64, 200], e: [190, 40, 150], H: [40, 230, 240], Z: [40, 230, 240], glow: true },
  // Crate bag skins (cosmetics.sk, 2026-09-26), by rarity. pattern = drawn over the body color only:
  // checker, stripes (every n columns, jag = wobbly, wide = 2 px), dollars, code (falling dashes).
  // animate = frames of an animated texture (owner, 2026-09-26: the Matrix skin's code falls; a frame
  // every 2 ticks, the dashes move down a pixel or two per frame and loop).
  denim: { name: 'Denim', B: [58, 90, 150], L: [86, 118, 178], D: [38, 62, 110], S: [220, 196, 140], E: [48, 76, 130], e: [34, 56, 98], H: [150, 104, 60], Z: [200, 200, 210], pattern: { type: 'stripes', every: 3, color: [70, 104, 166] } },
  sand: { name: 'Desert', B: [196, 170, 120], L: [216, 194, 148], D: [150, 124, 82], S: [120, 96, 60], E: [176, 150, 102], e: [140, 116, 78], H: [96, 74, 46], Z: [230, 214, 170], camo: [[160, 130, 90], [222, 204, 160], [176, 146, 100]] },
  urban: { name: 'Urban', B: [110, 112, 118], L: [140, 142, 148], D: [76, 78, 84], S: [40, 40, 44], E: [96, 98, 104], e: [70, 72, 78], H: [30, 30, 34], Z: [190, 190, 196], camo: [[60, 60, 66], [168, 168, 174], [86, 88, 94]] },
  cherry: { name: 'Cherry', B: [200, 50, 80], L: [232, 92, 120], D: [140, 30, 56], S: [250, 244, 246], E: [180, 40, 70], e: [130, 26, 50], H: [60, 20, 30], Z: [250, 220, 230] },
  cashprint: { name: 'Cash Print', B: [72, 138, 78], L: [100, 166, 104], D: [50, 104, 56], S: [236, 226, 180], E: [62, 120, 68], e: [44, 90, 50], H: [40, 60, 40], Z: [220, 200, 120], pattern: { type: 'dollars', color: [44, 96, 52] } },
  crimson: { name: 'Crimson', B: [128, 18, 28], L: [160, 34, 44], D: [86, 10, 18], S: [24, 22, 24], E: [110, 14, 24], e: [76, 8, 16], H: [22, 20, 22], Z: [200, 180, 180], pattern: { type: 'stripes', every: 4, wide: true, color: [28, 24, 26] } },
  tiger: { name: 'Tiger', B: [232, 132, 34], L: [248, 164, 70], D: [184, 96, 20], S: [250, 240, 220], E: [210, 116, 28], e: [160, 84, 18], H: [30, 22, 16], Z: [250, 230, 200], pattern: { type: 'stripes', every: 3, jag: true, color: [30, 22, 16] } },
  carbon: { name: 'Carbon', B: [42, 42, 46], L: [64, 64, 70], D: [26, 26, 30], S: [200, 40, 40], E: [52, 52, 58], e: [34, 34, 38], H: [18, 18, 20], Z: [170, 170, 180], pattern: { type: 'checker', color: [58, 58, 64] } },
  diamond: { name: 'Diamond', B: [90, 214, 226], L: [170, 244, 250], D: [40, 150, 168], S: [250, 254, 255], E: [70, 190, 206], e: [36, 136, 152], H: [30, 90, 104], Z: [240, 252, 255], pattern: { type: 'checker', color: [130, 232, 242] }, glow: true },
  molten: { name: 'Molten', B: [34, 24, 22], L: [56, 40, 34], D: [20, 14, 12], S: [255, 128, 24], E: [48, 32, 28], e: [28, 20, 18], H: [255, 90, 20], Z: [255, 180, 60], pattern: { type: 'stripes', every: 4, jag: true, color: [255, 120, 20] }, glow: true },
  matrix: { name: 'Matrix', B: [10, 18, 12], L: [18, 30, 20], D: [4, 10, 6], S: [40, 230, 90], E: [14, 24, 16], e: [8, 14, 10], H: [40, 230, 90], Z: [120, 255, 150], pattern: { type: 'code', color: [40, 230, 90], head: [190, 255, 205] }, glow: true, animate: 12 }
}
// Patterns over the body color only (straps, zipper and stripe stay clean), like camoPaint.
const patternPaint = (c, b, x0, y0, x1, y1, frame = 0) => {
  const body = [b.B, b.L, b.D].map(v => v.join(','))
  const p = b.pattern
  const col = [...p.color, 255]
  let seed = 11
  const rnd = n => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 16) % n }
  const put = (x, y, color = col) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return
    if (body.includes(c.get(x, y).slice(0, 3).join(','))) c.set(x, y, color)
  }
  if (p.type === 'checker') {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x + y) % 2 === 0) put(x, y)
  } else if (p.type === 'stripes') {
    for (let x = x0; x <= x1; x += p.every) {
      for (let y = y0; y <= y1; y++) {
        const dx = p.jag ? rnd(3) - 1 : 0
        put(x + dx, y)
        if (p.wide) put(x + dx + 1, y)
      }
    }
  } else if (p.type === 'dollars') {
    let row = 0
    for (let y = y0; y <= y1 - 4; y += 6, row++) {
      for (let x = x0 + (row % 2) * 3; x <= x1 - 2; x += 6) {
        DOLLAR.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch === '$') put(x + dx, y + dy) }))
      }
    }
  } else if (p.type === 'code') {
    // Each column's dashes repeat every H pixels, so shifting them down by frame × speed loops.
    const H = y1 - y0 + 1
    const head = p.head ? [...p.head, 255] : col
    for (let x = x0; x <= x1; x += 2) {
      const lit = new Array(H).fill(0)
      let y = rnd(4)
      while (y < H) {
        const len = 1 + rnd(3)
        for (let k = 0; k < len && y + k < H; k++) lit[y + k] = k === len - 1 ? 2 : 1
        y += len + 1 + rnd(3)
      }
      const speed = 1 + (x % 4 === 0 ? 1 : 0)
      for (let yy = 0; yy < H; yy++) {
        const v = lit[(((yy - frame * speed) % H) + H) % H]
        if (v) put(x, y0 + yy, v === 2 ? head : col)
      }
    }
  }
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
// A texture of size w x w: one frame, or b.animate frames stacked (a vanilla animated texture).
const writeTex = (rel, b, w, draw) => {
  if (!b.animate) { write(rel, draw(0).png()); return }
  const out = canvas(w, w * b.animate)
  for (let f = 0; f < b.animate; f++) {
    const c = draw(f)
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) out.set(x, f * w + y, c.get(x, y))
  }
  write(rel, out.png())
  write(rel + '.mcmeta', { animation: { frametime: 2 } })
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
  writeTex(`donating/textures/item/bag_${t}.png`, b, 16, frame => {
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
  if (b.pattern) patternPaint(c, b, 2, 7, 13, 12, frame)
  return c
  })
  write(`donating/models/item/bag_${t}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `donating:item/bag_${t}` } })
}

// 3D duffel texture, 32x32 (2 texels per model unit). Regions, in model UV units:
//   side  [0,0,12,6]   the long sides        top [0,6,12,12]  top and bottom
//   end   [12,0,16,4]  the round end caps    handle [12,4,16,6]
for (const t of Object.keys(BAGS)) {
  const b = BAGS[t]
  const col = k => [...b[k], 255]
  writeTex(`donating/textures/item/bag_${t}_3d.png`, b, 32, frame => {
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
  if (b.pattern) { patternPaint(c, b, 0, 0, 23, 11, frame); patternPaint(c, b, 0, 12, 23, 23, frame) }
  return c
  })
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
// model: a model id, or a whole item model (e.g. a select between an icon and a 3D model).
const addCase = (base, when, model, fallback = `minecraft:item/${base}`) => {
  if (!itemCases[base]) itemCases[base] = { fallback, cases: [] }
  itemCases[base].cases.push({ when, model: typeof model === 'string' ? { type: 'minecraft:model', model } : model })
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
  // Lockpicks for car-theft contracts (contracts.sk's lockpickItem writes donating:lockpick_<tier>): a steel
  // pick with a hook, the handle in the tier's color (basic bronze, pro blue, master gold).
  const PICKS = { basic: [[196, 124, 64], [140, 86, 40]], pro: [[96, 156, 226], [58, 104, 172]], master: [[252, 204, 44], [206, 150, 20]] }
  for (const [tier, [hi, lo]] of Object.entries(PICKS)) {
    sprite('lockpick_' + tier, art([
      '................',
      '.............kk.',
      '............kSSk',
      '...........kSkk.',
      '..........kSk...',
      '.........kSk....',
      '........kSk.....',
      '.......kSk......',
      '......kSk.......',
      '....kkkk........',
      '...kHHhk........',
      '..kHHhk.........',
      '.kHHhk..........',
      '.khhk...........',
      '..kk............',
      '................'
    ], { S: [206, 210, 216, 255], H: [...hi, 255], h: [...lo, 255] }))
    addCase('flint', 'donating:lockpick_' + tier, 'donating:item/lockpick_' + tier)
  }
}
// ---------- The car key as a tripwire hook ----------
// While the car camera is on, DonatingPhone swaps the map key (filled map + map_id: the client's map path
// would draw arms whatever the model) for a tripwire hook with the same donating:carkey string. Same model
// as filled_map.json's carkey case, so the key looks the same either way.
addCase('tripwire_hook', 'donating:carkey', 'minecraft:item/tripwire_hook')
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
// ---------- Melee weapons, consumables and the Grappler (owner, 2026-09-28) ----------
// The WeaponMechanics items (weapons\melee\Dagger.yml and Baseball_Bat.yml, weapons\consumables\
// Throwing_Knife.yml, Energy_Drink.yml and Bandage.yml) are amethyst shards, not feathers (feather.json's
// numbers are WeaponMechanics' own guns: we only redraw the sold ones, see "The sold guns" at the end of
// this section): their Skin.Default.Custom_Model_Data 1-5 is the custom_model_data float
// amethyst_shard.json dispatches on, a 16x16 icon in inventories and a 3D model everywhere else. The
// Grappler (grapple.sk, a heist tool like the Drill) is a breeze rod picked by the string
// donating:tool_grappler (shop.sk's toolItem) and held like a pistol; its hook (donating:grapple_hook)
// and a rope (donating:grapple_rope) are breeze rods too, for item displays. A thrown knife in flight is
// the bullets' iron nugget with custom model data 7004 (see Bullets).
// Models are boxes (1 unit = 1/16 block). The dagger, the bat and the knife are built upright and turned
// 45° to lie where a sword sprite does, with vanilla's handheld display, so they sit in the hand like a
// sword; the can and the bandage are held like any item (vanilla's generated display).
{
  const K = [28, 24, 20, 255]
  const art = (rows, colors) => { const c = canvas(16, 16); c.draw(rows, { k: K, ...colors }); return c.png() }
  const rgba = c => c.length === 4 ? c : [...c, 255]
  const r = n => Math.round(n * 1000) / 1000
  // A box model: each part is a box with one swatch on every face (or { all, up, ... } per face, or its
  // own faces), dirs = the faces it has. Swatches are 4x4 texels of a 16x16 texture and faces sample
  // their middle 2x2, so no neighbour color bleeds in.
  const solid = (name, colors, parts, display, textures = {}) => {
    const tex = canvas(16, 16)
    colors.forEach((col, i) => tex.fill((i % 4) * 4, Math.floor(i / 4) * 4, (i % 4) * 4 + 3, Math.floor(i / 4) * 4 + 3, rgba(col)))
    write(`donating/textures/item/${name}_3d.png`, tex.png())
    const uv = i => [(i % 4) * 4 + 1, Math.floor(i / 4) * 4 + 1, (i % 4) * 4 + 3, Math.floor(i / 4) * 4 + 3]
    const elements = parts.map(p => {
      const faces = {}
      for (const dir of p.dirs || ['north', 'south', 'east', 'west', 'up', 'down']) {
        if (p.faces && p.faces[dir]) { faces[dir] = p.faces[dir]; continue }
        const c = typeof p.c === 'number' ? p.c : (p.c[dir] !== undefined ? p.c[dir] : p.c.all)
        faces[dir] = { uv: uv(c), texture: '#t' }
      }
      const e = { from: p.from.map(r), to: p.to.map(r), faces }
      if (p.rot) e.rotation = p.rot
      return e
    })
    write(`donating/models/item/${name}.json`, {
      textures: { t: `donating:item/${name}_3d`, particle: `donating:item/${name}_3d`, ...textures },
      elements,
      display
    })
  }
  // A box around the model's middle axis (x = z = 8): half widths w (x) and d (z), from y0 to y1.
  const bar = (w, d, y0, y1, c, more = {}) => ({ from: [8 - w, y0, 8 - d], to: [8 + w, y1, 8 + d], c, ...more })
  // Upright parts turned 45° about the middle: local +y becomes a sword sprite's diagonal (grip lower
  // left, tip upper right), and local y = 0 is where a sword's grip is.
  const diag = parts => parts.map(p => ({ ...p, rot: { angle: -45, axis: 'z', origin: [8, 8, 8] } }))
  // Vanilla's item/handheld (a sword) and item/generated (an apple), with generated's ground and frame.
  const HANDHELD = {
    thirdperson_righthand: { rotation: [0, -90, 55], translation: [0, 4, 0.5], scale: [0.85, 0.85, 0.85] },
    thirdperson_lefthand: { rotation: [0, 90, -55], translation: [0, 4, 0.5], scale: [0.85, 0.85, 0.85] },
    firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
    firstperson_lefthand: { rotation: [0, 90, -25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
    ground: { translation: [0, 2, 0], scale: [0.5, 0.5, 0.5] },
    fixed: { rotation: [0, 180, 0] }
  }
  const HELD = {
    thirdperson_righthand: { translation: [0, 3, 1], scale: [0.55, 0.55, 0.55] },
    firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
    ground: { translation: [0, 2, 0], scale: [0.5, 0.5, 0.5] },
    fixed: { rotation: [0, 180, 0] }
  }
  // The icon in inventories (donating:item/<name>_icon), the 3D model (donating:item/<name>) elsewhere.
  const icon = (name, png) => {
    write(`donating/textures/item/${name}_icon.png`, png)
    write(`donating/models/item/${name}_icon.json`, { parent: 'minecraft:item/generated', textures: { layer0: `donating:item/${name}_icon` } })
  }
  // model: the 3D model to show outside inventories (default: the model of the same name).
  const iconOr3d = (name, model = name) => ({
    type: 'minecraft:select',
    property: 'minecraft:display_context',
    cases: [{ when: ['gui'], model: { type: 'minecraft:model', model: `donating:item/${name}_icon` } }],
    fallback: { type: 'minecraft:model', model: `donating:item/${model}` }
  })
  const STEEL = { W: [236, 240, 246, 255], S: [182, 188, 200, 255], D: [112, 118, 132, 255] }
  const steel = [[236, 240, 246], [182, 188, 200], [112, 118, 132]] // swatches 0-2: light, mid, dark
  const edge = { all: 1, east: 0, west: 2 } // a blade: light cutting edge, darker back

  // Dagger: a short double-edged blade with a brass guard and a leather grip.
  icon('dagger', art([
    '................',
    '................',
    '................',
    '............kkk.',
    '...........kWWDk',
    '..........kWSWDk',
    '.........kWSWDk.',
    '........kWSWDk..',
    '...kk..kWSWDk...',
    '...kYkkWSWDk....',
    '....kYkSWDk.....',
    '....kkYyDk......',
    '...kGgkYyk......',
    '..kGgkkkYk......',
    '.kPGk...kk......',
    '.kkk............'
  ], { ...STEEL, Y: [226, 182, 76, 255], y: [160, 118, 40, 255], G: [96, 60, 34, 255], g: [140, 94, 56, 255], P: [150, 156, 168, 255] }))
  solid('dagger', [...steel, [140, 146, 160], [214, 170, 70], [160, 118, 40], [96, 60, 34], [140, 94, 56], [150, 156, 168]], diag([
    bar(0.8, 0.8, -3.2, -2, 8), // pommel
    bar(0.6, 0.6, -2, 2.4, 6), // grip
    bar(0.68, 0.68, -1.2, -0.7, 7), // grip wraps
    bar(0.68, 0.68, 0.6, 1.1, 7),
    bar(2.2, 0.9, 2.4, 3.2, { all: 4, up: 5, down: 5 }), // guard
    bar(1.2, 0.25, 3.2, 9.5, edge), // blade, narrowing to the tip
    bar(0.85, 0.25, 9.5, 11.4, edge),
    bar(0.45, 0.2, 11.4, 12.6, edge),
    bar(0.15, 0.3, 3.5, 9.2, 3) // the fuller down the middle
  ]), HANDHELD)

  // Baseball bat: ash wood, black grip tape, a red band.
  icon('bat', art([
    '...........kkk..',
    '..........kLLWk.',
    '.........kLLWWDk',
    '........kLLWWDDk',
    '.......kLLWWDDk.',
    '......kLLWWDDk..',
    '......kLWWDDk...',
    '.....kLRRDDk....',
    '....kLRRDk......',
    '...kLWDk........',
    '...kLDk.........',
    '..kTtk..........',
    '.kTtk...........',
    'kTtk............',
    'kkTk............',
    '.kk.............'
  ], { L: [236, 206, 150, 255], W: [210, 170, 110, 255], D: [160, 118, 70, 255], R: [170, 36, 40, 255], T: [44, 44, 50, 255], t: [80, 80, 90, 255] }))
  const wood = { all: 1, east: 0, west: 2 }
  solid('bat', [[232, 198, 140], [206, 166, 106], [166, 126, 76], [186, 146, 92], [40, 40, 46], [72, 72, 82], [170, 36, 40]], diag([
    bar(1.1, 1.1, -3.6, -2.8, 4), // knob
    bar(0.7, 0.7, -2.8, 2.2, 4), // grip tape
    bar(0.75, 0.75, -2, -1.6, 5),
    bar(0.75, 0.75, -0.4, 0, 5),
    bar(0.75, 0.75, 1.2, 1.6, 5),
    bar(0.7, 0.7, 2.2, 5, wood), // handle, widening to the barrel
    bar(0.95, 0.95, 5, 8.5, wood),
    bar(1.25, 1.25, 8.5, 11.5, wood),
    bar(1.6, 1.6, 11.5, 16.8, wood),
    bar(1.3, 1.3, 16.8, 17.3, 3), // end grain
    bar(1.65, 1.65, 13.2, 14.2, 6) // band
  ]), HANDHELD)

  // Throwing knife: slim, no guard, a cord-wrapped handle and a ring at the end.
  icon('throwing_knife', art([
    '................',
    '.............kk.',
    '............kWDk',
    '...........kWSDk',
    '..........kWSDk.',
    '.........kWSDk..',
    '........kWSDk...',
    '.......kWSDk....',
    '......kkSDk.....',
    '.....kBBkk......',
    '....kBbBk.......',
    '...kBbBk........',
    '..kkSkk.........',
    '.kSk.kSk........',
    '..kSkSk.........',
    '...kkk..........'
  ], { ...STEEL, B: [40, 40, 46, 255], b: [170, 40, 44, 255] }))
  const knifeColors = [...steel, [40, 40, 46], [170, 40, 44], [150, 156, 168]]
  solid('throwing_knife', knifeColors, diag([
    bar(1, 0.3, -3.4, -2.9, 5), // the ring
    bar(1, 0.3, -1.9, -1.4, 5),
    { from: [7, -2.9, 7.7], to: [7.5, -1.9, 8.3], c: 5 },
    { from: [8.5, -2.9, 7.7], to: [9, -1.9, 8.3], c: 5 },
    bar(0.55, 0.4, -1.4, 2.6, 3), // cord-wrapped handle
    bar(0.6, 0.45, 0.2, 0.7, 4),
    bar(0.8, 0.2, 2.6, 7.5, edge), // blade
    bar(0.55, 0.2, 7.5, 9.2, edge),
    bar(0.25, 0.15, 9.2, 10.2, edge)
  ]), HANDHELD)

  // Energy drink: a black can with a lime bolt. The label and lid are drawn on their own 32x32 texture
  // (2 texels per unit): the side at uv 0,0-6,11 (12x22), the lid at 6,0-12,6 (12x12). The side is shaded
  // by column so the square can reads round.
  {
    const c = canvas(32, 32)
    const col = { S: [196, 202, 210, 255], s: [150, 156, 166, 255], B: [24, 28, 26, 255], L: [124, 252, 60, 255], W: [236, 240, 236, 255] }
    c.draw([
      'SSSSSSSSSSSS',
      'ssssssssssss',
      'BBBBBBBBBBBB',
      'LLLLLLLLLLLL',
      'BBBBBBBBBBBB',
      'BBBBBBBLLBBB',
      'BBBBBBLLBBBB',
      'BBBBBLLLBBBB',
      'BBBBLLLBBBBB',
      'BBBLLLLLLLBB',
      'BBBBBBLLLBBB',
      'BBBBBLLLBBBB',
      'BBBBLLLBBBBB',
      'BBBBLLBBBBBB',
      'BBBLLBBBBBBB',
      'BBBLBBBBBBBB',
      'BBBBBBBBBBBB',
      'BWWWWWWWWWWB',
      'BBBBBBBBBBBB',
      'LLLLLLLLLLLL',
      'ssssssssssss',
      'SSSSSSSSSSSS'
    ], col, 0, 0)
    const round = [0.62, 0.8, 0.95, 1.15, 1.08, 1, 1, 0.96, 0.9, 0.84, 0.74, 0.6]
    for (let y = 0; y < 22; y++) for (let x = 0; x < 12; x++) c.set(x, y, shade(c.get(x, y), round[x]))
    c.draw([
      'SSSSSSSSSSSS',
      'SssssssssssS',
      'SsddddddddsS',
      'SsdmmmmmmdsS',
      'SsdmmmmmmdsS',
      'SsdmmKKmmdsS',
      'SsdmmKKmmdsS',
      'SsdmmmmmmdsS',
      'SsdmmmmmmdsS',
      'SsddddddddsS',
      'SssssssssssS',
      'SSSSSSSSSSSS'
    ], { S: [214, 220, 228, 255], s: [176, 182, 192, 255], d: [140, 146, 156, 255], m: [192, 198, 208, 255], K: [40, 40, 44, 255] }, 12, 0)
    write('donating/textures/item/energy_drink_label.png', c.png())
  }
  icon('energy_drink', art([
    '................',
    '.....kkkkkk.....',
    '....kSWSSSDk....',
    '....kkkkkkkk....',
    '....kBBBBBBk....',
    '....kBBBBLLk....',
    '....kBBBLLBk....',
    '....kBBLLBBk....',
    '....kBLLLLBk....',
    '....kBBLLBBk....',
    '....kBLLBBBk....',
    '....kBLBBBBk....',
    '....kBBBBBBk....',
    '....kkkkkkkk....',
    '....kSWSSSDk....',
    '.....kkkkkk.....'
  ], { S: [178, 184, 194, 255], W: [236, 240, 246, 255], D: [120, 126, 138, 255], B: [26, 30, 28, 255], L: [124, 252, 60, 255] }))
  {
    const side = { uv: [0, 0, 6, 11], texture: '#l' }
    solid('energy_drink', [[196, 202, 210], [150, 156, 166], [226, 230, 236]], [
      { from: [5, 0.5, 5], to: [11, 11.5, 11], c: 1, faces: { north: side, south: side, east: side, west: side, up: { uv: [6, 0, 12, 6], texture: '#l' } } },
      { from: [5.4, 0, 5.4], to: [10.6, 0.5, 10.6], c: { all: 1, down: 0 } }, // bottom rim
      { from: [5, 11.5, 5], to: [11, 11.9, 5.4], c: 0 }, // the lid's raised rim
      { from: [5, 11.5, 10.6], to: [11, 11.9, 11], c: 0 },
      { from: [5, 11.5, 5.4], to: [5.4, 11.9, 10.6], c: 0 },
      { from: [10.6, 11.5, 5.4], to: [11, 11.9, 10.6], c: 0 },
      { from: [7, 11.5, 6.2], to: [9, 11.7, 8.6], c: 2 } // pull tab
    ], HELD, { l: 'donating:item/energy_drink_label' })
  }

  // Bandage: a roll of white gauze with red edge stripes and a loose end held by a clip. The roll's axis
  // runs front to back, so the spiral shows in the hand. Round from three boxes; the spiral is one 14x14
  // picture (uv 0,0-7,7 of a 32x32 texture) that every box's end face maps into by position.
  {
    const c = canvas(32, 32)
    for (let ty = 0; ty < 14; ty++) {
      for (let tx = 0; tx < 14; tx++) {
        const dx = tx + 0.5 - 7
        const dy = ty + 0.5 - 7
        const rr = Math.sqrt(dx * dx + dy * dy)
        const turn = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1
        const f = ((rr / 2.4 - turn) % 1 + 1) % 1
        let col = [246, 246, 240, 255]
        if (f < 0.34 && rr > 0.8) col = [178, 178, 168, 255]
        if (rr > 6.3) col = [214, 214, 204, 255]
        c.set(tx, ty, col)
      }
    }
    write('donating/textures/item/bandage_end.png', c.png())
  }
  icon('bandage', art([
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '....kWWWWWWk....',
    '...kWWggggWWk...',
    '..kWWgWWWWgWWk..',
    '..kWgWWggWWgWk..',
    '..kWgWgWWgWgWk..',
    '..kWgWWgWWWgWk..',
    '..kWWgWWWWgWWkk.',
    '...kWWggggWWkWk.',
    '....kWWWWWWkWWk.',
    '.....kkkkkkkWWk.',
    '...........kRRk.',
    '...........kkkk.'
  ], { W: [244, 244, 240, 255], g: [196, 196, 190, 255], R: [214, 48, 52, 255] }))
  {
    // The roll: centre (8, 6.5), radius 3.5, z 5.5-10.5. Each box's end faces show its part of the spiral
    // (south as seen from the front, north mirrored); the three are nested a little in z so their end
    // faces never share a plane.
    const X0 = 4.5
    const Y1 = 10
    const ends = (x0, y0, x1, y1) => ({
      south: { uv: [r(x0 - X0), r(Y1 - y1), r(x1 - X0), r(Y1 - y0)], texture: '#e' },
      north: { uv: [r(X0 + 7 - x1), r(Y1 - y1), r(X0 + 7 - x0), r(Y1 - y0)], texture: '#e' }
    })
    const roll = [[4.5, 4.75, 11.5, 8.25, 0], [6.25, 3, 9.75, 10, 0.02], [5.4, 3.9, 10.6, 9.1, 0.04]]
    const parts = []
    for (const [x0, y0, x1, y1, inset] of roll) {
      parts.push({ from: [x0, y0, 5.5 + inset], to: [x1, y1, 10.5 - inset], c: 0, faces: ends(x0, y0, x1, y1) })
      // Red stripes near both edges (sides only).
      for (const [z0, z1] of [[6.1, 6.5], [9.5, 9.9]]) {
        parts.push({ from: [x0 - 0.05, y0 - 0.05, z0], to: [x1 + 0.05, y1 + 0.05, z1], c: 2, dirs: ['east', 'west', 'up', 'down'] })
      }
    }
    parts.push({ from: [11.4, 1.6, 5.8], to: [11.9, 6.5, 10.2], c: { all: 0, east: 1 } }) // the loose end
    parts.push({ from: [11.25, 1.4, 7], to: [12.05, 2.2, 9], c: 3 }) // its clip
    solid('bandage', [[244, 244, 238], [220, 220, 212], [206, 44, 48], [176, 182, 192]], parts, HELD, { e: 'donating:item/bandage_end' })
  }

  // The Grappler: a pistol-grip launcher, an orange launch tube with the hook in its muzzle and a rope drum
  // under it. Built and held like WeaponMechanics' .50 GS (the muzzle toward -x, its display).
  icon('tool_grappler', art([
    '................',
    '................',
    '.kkkk...........',
    'kHHHHk..........',
    'kHkkk.....kkkkk.',
    'kHk.kkkkkkkGGGGk',
    'kHHkOOOOOOoGGGGk',
    'kHHkOOOOOOoGggGk',
    'kHk.kkkkkkkGGGGk',
    'kHkkk.kRRRkkGGk.',
    'kHHHHkkRRRk.kKKk',
    '.kkkk..kkk.kkKKk',
    '...........kKKk.',
    '...........kKKk.',
    '...........kkkk.',
    '................'
  ], { H: [200, 204, 212, 255], O: [236, 124, 36, 255], o: [180, 84, 20, 255], G: [70, 74, 84, 255], g: [110, 114, 124, 255], K: [36, 36, 40, 255], R: [206, 176, 118, 255] }))
  solid('tool_grappler', [
    [70, 74, 84], [104, 110, 122], [46, 49, 56], [36, 36, 40], // 0-3 frame, frame light, frame dark, grip
    [58, 58, 64], [236, 124, 36], [180, 84, 20], [190, 196, 206], // 4-7 grip light, tube, tube dark, steel
    [130, 136, 148], [206, 176, 118], [160, 132, 82] // 8-10 steel dark, rope, rope dark
  ], [
    { from: [5, 4.2, 7.1], to: [16, 7.8, 8.9], c: { all: 0, up: 1, down: 2 } }, // frame
    { from: [9, 7.8, 7.6], to: [15, 8.4, 8.4], c: 1 }, // top rail and rear sight
    { from: [14.2, 8.4, 7.7], to: [15, 9, 8.3], c: 2 },
    { from: [-0.5, 4.6, 6.9], to: [9, 7.6, 9.1], c: { all: 5, down: 6 } }, // launch tube with dark bands
    { from: [1.5, 4.55, 6.85], to: [2.2, 7.65, 9.15], c: 6 },
    { from: [6, 4.55, 6.85], to: [6.7, 7.65, 9.15], c: 6 },
    { from: [-1, 4.4, 6.7], to: [-0.5, 7.8, 9.3], c: 7 }, // muzzle ring
    { from: [11.5, -1.5, 7.25], to: [15, 4.2, 8.75], c: { all: 3, up: 4 }, rot: { angle: 22.5, axis: 'z', origin: [13.25, 4.2, 8] } }, // grip, raked back
    { from: [8.6, 2.2, 7.6], to: [11.8, 2.7, 8.4], c: 2 }, // trigger guard and trigger
    { from: [8.6, 2.7, 7.6], to: [9.1, 4.2, 8.4], c: 2 },
    { from: [10.1, 2.9, 7.75], to: [10.6, 4.2, 8.25], c: 7 },
    { from: [2.2, 2.6, 6.8], to: [6.2, 4.6, 9.2], c: { all: 9, down: 10 } }, // rope drum
    { from: [2, 2.4, 6.6], to: [2.2, 4.6, 9.4], c: 2 },
    { from: [6.2, 2.4, 6.6], to: [6.4, 4.6, 9.4], c: 2 },
    { from: [-3.5, 5.8, 7.7], to: [-0.5, 6.4, 8.3], c: 7 }, // the hook: shaft, four prongs bent back
    { from: [-3.6, 6.4, 7.7], to: [-3, 8.3, 8.3], c: 7 },
    { from: [-3, 7.8, 7.7], to: [-2, 8.3, 8.3], c: 8 },
    { from: [-3.6, 3.9, 7.7], to: [-3, 5.8, 8.3], c: 7 },
    { from: [-3, 3.9, 7.7], to: [-2, 4.4, 8.3], c: 8 },
    { from: [-3.6, 5.8, 6.1], to: [-3, 6.4, 7.7], c: 7 },
    { from: [-3, 5.8, 6.1], to: [-2, 6.4, 6.6], c: 8 },
    { from: [-3.6, 5.8, 8.3], to: [-3, 6.4, 9.9], c: 7 },
    { from: [-3, 5.8, 9.4], to: [-2, 6.4, 9.9], c: 8 }
  ], {
    thirdperson_righthand: { rotation: [0, -90, 0], translation: [0, 1.25, -1.25], scale: [0.7, 0.7, 0.7] },
    thirdperson_lefthand: { rotation: [0, 90, 0], translation: [0, 1.25, -1.25], scale: [0.7, 0.7, 0.7] },
    firstperson_righthand: { rotation: [0, -90, 0], translation: [-5.75, 5.75, -2.25], scale: [0.7, 0.7, 0.7] },
    firstperson_lefthand: { rotation: [0, 90, 0], translation: [-5.75, 5.75, -2.25], scale: [0.7, 0.7, 0.7] },
    ground: { rotation: [0, 0, -45], translation: [0, 4, 0], scale: [0.7, 0.7, 0.7] },
    fixed: { rotation: [0, 0, -45], translation: [0.25, 1.75, -0.25], scale: [0.7, 0.7, 0.7] }
  })

  // The grapple hook, for an item display where the rope holds (no display transform: the model sits
  // on the entity as built, 1 unit = 1/16 block): four prongs up and bent down, 0.2-0.25 blocks above the
  // display's position, and the rope eye 0.3 below it.
  {
    const prongs = []
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      // Built pointing +x, then mirrored to -x or moved onto the z axis.
      const box = (a, b, c) => {
        const map = p => sx !== 0 ? [8 + (p[0] - 8) * sx, p[1], p[2]] : [p[2], p[1], 8 + (p[0] - 8) * sz]
        const pa = map(a)
        const pb = map(b)
        return { from: [0, 1, 2].map(i => Math.min(pa[i], pb[i])), to: [0, 1, 2].map(i => Math.max(pa[i], pb[i])), c }
      }
      prongs.push(box([8.7, 11.1, 7.7], [11.2, 11.7, 8.3], 0), box([10.6, 9.3, 7.7], [11.2, 11.1, 8.3], 0), box([10.7, 8.8, 7.8], [11.1, 9.3, 8.2], 2))
    }
    solid('grapple_hook', [[190, 196, 206], [120, 126, 138], [226, 230, 236]], [
      { from: [7.2, 3, 7.7], to: [8.8, 3.4, 8.3], c: 1 }, // rope eye
      { from: [7.2, 4.6, 7.7], to: [8.8, 5, 8.3], c: 1 },
      { from: [7.2, 3.4, 7.7], to: [7.6, 4.6, 8.3], c: 1 },
      { from: [8.4, 3.4, 7.7], to: [8.8, 4.6, 8.3], c: 1 },
      { from: [7.6, 5, 7.6], to: [8.4, 11, 8.4], c: { all: 0, up: 2 } }, // shaft and crown
      { from: [7.3, 11, 7.3], to: [8.7, 11.8, 8.7], c: 2 },
      ...prongs
    ], {
      gui: { rotation: [30, 45, 0], scale: [1, 1, 1] },
      ground: { translation: [0, 2, 0], scale: [0.5, 0.5, 0.5] },
      fixed: { scale: [1, 1, 1] }
    })
  }

  // A rope, for an item display: 1 block long from the display's position forward (an item display
  // shows its model's -z side forward, like the bullets) and 0.05 thick, twisted in two tones. Stretch it
  // with the display's scale (1, 1, length) and turn it with its yaw and pitch.
  solid('grapple_rope', [[206, 176, 118], [160, 132, 82]], Array.from({ length: 8 }, (_, i) => (
    { from: [7.6, 7.6, 6 - 2 * i], to: [8.4, 8.4, 8 - 2 * i], c: i % 2, dirs: ['east', 'west', 'up', 'down'] }
  )), {})

  addCase('breeze_rod', 'donating:tool_grappler', iconOr3d('tool_grappler'))
  addCase('breeze_rod', 'donating:grapple_hook', 'donating:item/grapple_hook')
  addCase('breeze_rod', 'donating:grapple_rope', 'donating:item/grapple_rope')

  // amethyst_shard.json: WeaponMechanics' skin number picks the item; any other number is a plain shard.
  const SHARD = [['dagger', 1], ['bat', 2], ['throwing_knife', 3], ['energy_drink', 4], ['bandage', 5]]
  write('minecraft/items/amethyst_shard.json', {
    // A drink or a throw lowers the stack: no re-equip dip (like WeaponMechanics' feather.json).
    hand_animation_on_swap: false,
    model: {
      type: 'minecraft:range_dispatch',
      property: 'minecraft:custom_model_data',
      index: 0,
      entries: [
        ...SHARD.map(([name, n]) => ({ threshold: n, model: iconOr3d(name) })),
        { threshold: SHARD.length + 1, model: { type: 'minecraft:model', model: 'minecraft:item/amethyst_shard' } }
      ],
      fallback: { type: 'minecraft:model', model: 'minecraft:item/amethyst_shard' }
    }
  })

  // The thrown knife in flight (iron_nugget.json, custom model data 7004, see Bullets): point first
  // along -z like the bullets, the blade upright, 10.5 units from the point (z = -3) to the ring (z =
  // 7.5, just ahead of the true position at z = 8), and no south (backward) faces, so the thrower sees
  // nothing of it on its first tick at their eye.
  const back = ['north', 'east', 'west', 'up', 'down']
  solid('thrown_knife', knifeColors, [
    { from: [7.85, 7.8, -3], to: [8.15, 8.2, -2], c: 1, dirs: back },
    { from: [7.8, 7.55, -2], to: [8.2, 8.45, 0], c: { all: 1, up: 0, down: 2 }, dirs: back },
    { from: [7.8, 7.2, 0], to: [8.2, 8.8, 3.5], c: { all: 1, up: 0, down: 2 }, dirs: back },
    { from: [7.6, 7.45, 3.5], to: [8.4, 8.55, 6.5], c: 3, dirs: back },
    { from: [7.55, 7.4, 4.6], to: [8.45, 8.6, 5.1], c: 4, dirs: back },
    { from: [7.7, 7.1, 7.1], to: [8.3, 8.9, 7.5], c: 5, dirs: back },
    { from: [7.7, 8.5, 6.5], to: [8.3, 8.9, 7.1], c: 5, dirs: back },
    { from: [7.7, 7.1, 6.5], to: [8.3, 7.5, 7.1], c: 5, dirs: back }
  ], {})

  // ---------- The sold guns, the Combat Knife and the Stim (feather.json) ----------
  // WeaponMechanics picks a weapon's look with its skin number, written as the custom_model_data float of
  // the feather (weapons\*\*.yml Skin: Default N, Scope ADD 1000 while aiming, Sprint ADD 2000 while
  // sprinting; the Stim's Skin turns its lightning rod into a feather with -1). Each item is drawn by a
  // module, tools\guns\<id>.js, exporting a function that gets the helpers below and returns its entries,
  // { <number>: <item model> }. items/feather.json here holds only ours; build-pack.js merges it into
  // WeaponMechanics' feather.json by threshold (ours win) and stops unless every number below is ours.
  // Same numbers, so nothing on the server changes (shop icons, cops' and bodyguards' guns, crates).
  // Since 2026-10-05 the guns are Pixel Gun 3D recreations built with the kit in tools\guns\pg.js, with one more
  // state: Reload (+3000) (no No_Ammo: WeaponMechanics puts it over Scope and Sprint), and first-person frames
  // (pg.js: cooldown, fire held).
  const GUNS = { gs50: [9, 1009, 2009, 3009], uzi: [1, 1001, 2001, 3001], ak47: [5, 1005, 2005, 3005], r90: [14, 1014, 2014, 3014], rev: [8, 1008, 2008, 3008], tommy: [15, 1015, 2015, 3015], m16: [7, 1007, 2007, 3007], sniper: [13, 1013, 2013, 3013], knife: [-10], stim: [-1] }
  // The shared palette (the melee weapons' and the Grappler's colors), [r, g, b].
  const PAL = {
    outline: K.slice(0, 3),
    steel: [[236, 240, 246], [182, 188, 200], [112, 118, 132]], // light, mid, dark
    brass: [[226, 182, 76], [160, 118, 40]],
    wood: [[232, 198, 140], [206, 166, 106], [166, 126, 76]],
    grip: [[36, 36, 40], [58, 58, 64], [44, 44, 50]], // black, its light face, tape
    frame: [[70, 74, 84], [104, 110, 122], [46, 49, 56]], // the Grappler's gunmetal: mid, light, dark
    orange: [[236, 124, 36], [180, 84, 20]],
    red: [170, 36, 40],
    lime: [124, 252, 60],
    olive: [70, 78, 52],
    navy: [44, 60, 96],
    black: [42, 44, 48],
    brassAmmo: [[224, 178, 72], [176, 138, 56]]
  }
  const round = v => Math.round(v * 1000) / 1000
  const norm = a => { let d = ((a % 360) + 360) % 360; if (d > 180) d -= 360; return round(d) || 0 }
  // One hand's transform mirrored for the other hand. The client applies a left hand's transform with
  // (-tx, ty, tz) and (rx, -ry, -rz); a missing lefthand copies the righthand one as it is (in the same
  // file), and the gun would point backward: every model here writes both hands. The stored lefthand is
  // the mirror image of the righthand pose (muzzle mirrored across the screen, sights still up): for a gun
  // pointing along the view (Default, Scope, a straight Sprint) that is exactly (rx, -ry, -rz) with the
  // same translation; for a pose turned sideways (the Uzi, AK-47 and R9-0 sprints) (rx, -ry, -rz) would
  // keep it pointing the same way (outward from the left hand), so the gun is also turned over, as
  // WeaponMechanics' own lefthand sprints are (its Uzi's [0, 170, -15] is exactly this).
  const RAD = Math.PI / 180
  const m3 = (a, b) => a.map((row, i) => [0, 1, 2].map(j => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]))
  const rot = rr => {
    const [a, b, c] = rr.map(v => v * RAD)
    const X = [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]]
    const Y = [[Math.cos(b), 0, Math.sin(b)], [0, 1, 0], [-Math.sin(b), 0, Math.cos(b)]]
    const Z = [[Math.cos(c), -Math.sin(c), 0], [Math.sin(c), Math.cos(c), 0], [0, 0, 1]]
    return m3(m3(X, Y), Z) // JOML rotationXYZ
  }
  const sameRot = (p, q) => { const A = rot(p); const B = rot(q); return A.every((row, i) => row.every((v, j) => Math.abs(v - B[i][j]) < 1e-6)) }
  // plain: always (rx, -ry, -rz) (an item with no front, like the Stim held upright).
  const mirror = (t, plain = false) => {
    const [x, y, z] = t.rotation || [0, 0, 0]
    const rule = [norm(x), norm(-y), norm(-z)]
    if (plain) return { ...t, rotation: rule }
    // Wanted on screen: Mx · R · Mx · Ry(180) (Mx = the x mirror); stored = its XYZ angles with y, z negated.
    const Mx = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]]
    const L = m3(m3(m3(Mx, rot([x, y, z])), Mx), rot([0, 180, 0]))
    const b = Math.asin(Math.max(-1, Math.min(1, L[0][2]))) / RAD
    const a = Math.abs(Math.abs(L[0][2]) - 1) < 1e-9 ? Math.atan2(L[2][1], L[1][1]) / RAD : Math.atan2(-L[1][2], L[2][2]) / RAD
    const c = Math.abs(Math.abs(L[0][2]) - 1) < 1e-9 ? 0 : Math.atan2(-L[0][1], L[0][0]) / RAD
    const applied = [a, b, c]
    const flipped = [a + 180, 180 - b, c + 180] // the same rotation, other angles
    const pick = [applied, flipped].map(v => v.map(norm)).sort((p, q) => (Math.abs(p[0]) + Math.abs(p[2])) - (Math.abs(q[0]) + Math.abs(q[2])))[0]
    const stored = [pick[0], norm(-pick[1]), norm(-pick[2])]
    // What the client will apply for each candidate: (sx, -sy, -sz). Prefer the plain rule when it's the same.
    return { ...t, rotation: sameRot([rule[0], -rule[1], -rule[2]], applied) ? rule : stored }
  }
  // both('firstperson', t) -> { firstperson_righthand: t, firstperson_lefthand: mirror(t) }
  const both = (ctx, t, plain = false) => ({ [`${ctx}_righthand`]: t, [`${ctx}_lefthand`]: mirror(t, plain) })
  // display({ firstperson, thirdperson, gui, ground, fixed, head }, plain): a whole display with both hands.
  const display = (d, plain = false) => {
    const out = {}
    for (const [k, t] of Object.entries(d)) {
      if (!t) continue
      if (k === 'firstperson' || k === 'thirdperson') Object.assign(out, both(k, t, plain))
      else out[k] = t
    }
    return out
  }
  // A state (Scope or Sprint): a child of the gun's model that only moves it in first person (both hands);
  // third person, the ground and frames keep the parent's.
  const state = (name, parent, firstperson, plain = false) => write(`donating/models/item/${name}.json`, {
    parent: `donating:item/${parent}`,
    display: both('firstperson', firstperson, plain)
  })
  // The aim (Scope) transform that puts the sight line on the crosshair (the first-person gun is drawn at a
  // fixed 70° field of view, zooming doesn't scale it). The gun is built along x (muzzle toward -x) with its
  // sight line at height sightY on z = 8; rearX = the rear sight's x; rearDepth = how far in front of the
  // eye the rear sight sits (blocks). Screen centre: tx = -8.96, ty = 8.32 - Sy × (sightY - 8).
  const aim = ({ sightY, rearX, rearDepth = 0.45, scale = [2, 3, 3] }) => ({
    rotation: [0, -90, 0],
    translation: [-8.96, round(8.32 - scale[1] * (sightY - 8)), round(16 * (0.72 - rearDepth - scale[0] * (rearX - 8) / 16))],
    scale
  })
  const pg = require(path.join(__dirname, 'guns', 'pg.js'))({ write, canvas, shade, display, both })
  const helpers = { solid, icon, iconOr3d, art, canvas, shade, write, rgba, r, bar, diag, K, STEEL, steel, edge, PAL, HELD, HANDHELD, both, mirror, display, state, aim, pg }
  const feather = []
  // --only <id>[,<id>]: build just these gun modules (previews while drawing one gun: tools\render-item.js on its
  // donating:item/<name>_full); feather.json isn't written then.
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null
  for (const [id, numbers] of Object.entries(GUNS)) {
    if (only && !only.includes(id)) continue
    const got = require(path.join(__dirname, 'guns', `${id}.js`))({ ...helpers, id })
    const keys = Object.keys(got).map(Number)
    const missing = numbers.filter(n => !keys.includes(n))
    const extra = keys.filter(n => !numbers.includes(n))
    if (missing.length || extra.length) throw new Error(`tools\\guns\\${id}.js must return exactly ${numbers.join(', ')} (missing ${missing.join(', ') || '-'}, extra ${extra.join(', ') || '-'})`)
    for (const n of numbers) feather.push({ threshold: n, model: typeof got[n] === 'string' ? { type: 'minecraft:model', model: got[n] } : got[n] })
  }
  // Every model the entries name must exist (and be ours), and so must its parents.
  const modelFile = id => { const [ns, p] = id.split(':'); return path.join(PACK, ns, 'models', ...p.split('/')) + '.json' }
  const checkModel = id => {
    if (!id.startsWith('donating:')) throw new Error(`feather.json: ${id} isn't one of our models`)
    if (!fs.existsSync(modelFile(id))) throw new Error(`feather.json: the model ${id} wasn't written`)
    const j = JSON.parse(fs.readFileSync(modelFile(id), 'utf8'))
    if (j.parent && j.parent.startsWith('donating:')) checkModel(j.parent)
  }
  const walkModels = m => {
    if (!m || typeof m !== 'object') return
    if (/(^|:)model$/.test(m.type)) checkModel(m.model)
    for (const v of Object.values(m)) if (typeof v === 'object') Array.isArray(v) ? v.forEach(walkModels) : walkModels(v)
  }
  feather.forEach(e => walkModels(e.model))
  // Gun skins (tools\guns\skins.js, 2026-10-06): each look repaints its gun's tiles (pg.js paintSkin) and gets an item
  // definition of its own, donating:gunskin_<gun>_<look> (assets/donating/items/), with the gun's entries (the same
  // states and frames) on the skin's models; DonatingPhone's GunFx puts it on a player's guns as their item_model.
  const SKINS = require(path.join(__dirname, 'guns', 'skins.js'))
  const seenSkins = new Set()
  for (const sk of SKINS) {
    if (!GUNS[sk.gun]) throw new Error(`skins.js: no gun ${sk.gun}`)
    if (only && !only.includes(sk.gun)) continue
    const key = `${sk.gun}_${sk.look}`
    if (seenSkins.has(key)) throw new Error(`skins.js: ${key} twice`)
    seenSkins.add(key)
    const map = pg.paintSkin(`gun_${sk.gun}`, sk.look, sk.theme)
    const remap = m => JSON.parse(JSON.stringify(m), (k, v) => k === 'model' && typeof v === 'string' ? map(v) : v)
    const entries = GUNS[sk.gun].map(n => ({ threshold: n, model: remap(feather.find(e => e.threshold === n).model) }))
    entries.forEach(e => walkModels(e.model))
    write(`donating/items/gunskin_${key}.json`, {
      hand_animation_on_swap: false,
      model: { type: 'minecraft:range_dispatch', property: 'minecraft:custom_model_data', index: 0, entries, fallback: { type: 'minecraft:model', model: map(`donating:item/gun_${sk.gun}_full`) } }
    })
  }
  if (!only) {
  feather.sort((a, b) => a.threshold - b.threshold)
  write('minecraft/items/feather.json', {
    // Every Scope or Sprint toggle rewrites the item: no re-equip dip (WeaponMechanics' file has it too).
    hand_animation_on_swap: false,
    model: {
      type: 'minecraft:range_dispatch',
      property: 'minecraft:custom_model_data',
      index: 0,
      entries: feather,
      fallback: { type: 'minecraft:model', model: 'minecraft:item/feather' }
    }
  })
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
    pellet: { cmd: 7003, core: [255, 236, 180], glow: [255, 190, 90, 100], head: [150, 150, 158], tip: [110, 110, 118], nose: -10, headLen: 1.2, headW: 0.7, coreW: 0.3, glowW: 0.8, tail: 12, glowTail: 6 },
    // The Sniper Rifle (2026-10-06): at 10 blocks a tick the short tracers can't be seen, so its model is stretched 3x
    // along its flight by the item definition (a transformation about z = 12, the tail, so nothing reaches back past
    // the shooter's eye): from 4.5 blocks ahead to the tail, a thin blue-white streak.
    sniper: { cmd: 7005, core: [235, 245, 255], glow: [140, 200, 255, 120], head: [190, 160, 90], tip: [150, 120, 60], nose: -16, headLen: 1.4, headW: 0.7, coreW: 0.3, glowW: 0.8, tail: 12, glowTail: 10, stretch: 3 }
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
    const stretch = t.stretch || 1
    // Scale z about the tail (12/16 blocks): translation = p - S p.
    const tf = stretch === 1 ? {} : { transformation: { translation: [0, 0, +(0.75 - stretch * 0.75).toFixed(4)], left_rotation: [0, 0, 0, 1], scale: [1, 1, stretch], right_rotation: [0, 0, 0, 1] } }
    entries.push({ threshold: t.cmd, model: { type: 'minecraft:model', model: `donating:item/tracer_${kind}`, ...tf } })
  }
  // 7004: a thrown knife (the Throwing Knife's donating_throwing_knife, drawn in the section above). Any
  // other number (and none) is a plain iron nugget.
  entries.push({ threshold: 7004, model: { type: 'minecraft:model', model: 'donating:item/thrown_knife' } })
  entries.sort((a, b) => a.threshold - b.threshold)
  entries.push({ threshold: 7006, model: { type: 'minecraft:model', model: 'minecraft:item/iron_nugget' } })
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

// ---------- Cop bullets: the arrow as a tracer (cops.sk) ----------
// Cops (Citizens + Sentinel) fire arrows, and nothing else in Donating does (bows aren't sold), so the
// vanilla arrow becomes a bullet streak. The 26.3 arrow.png is 32x32: row 2 is the side view drawn twice,
// mirrored (x 0-15 tail -> head, x 16-31 head -> tail, so the head is in the middle), rows 0-4 around it
// hold the head and feathers, and (0-4, 5-9) / (5-9, 5-9) are the two back crosses. Arrows render cutout:
// a pixel is shown or not, so the glow is solid pixels. Without the pack cops shoot plain arrows.
{
  const c = canvas(32, 32)
  const CORE = [255, 244, 196, 255]
  const EDGE = [255, 176, 64, 255]
  const COPPER = [196, 112, 60, 255]
  const TIP = [150, 82, 44, 255]
  const half = (dir, x0) => {
    // i = 0 at the tail, 15 at the head
    for (let i = 0; i < 16; i++) {
      const x = x0 + dir * i
      if (i >= 13) {
        c.set(x, 2, i === 15 ? TIP : COPPER)
        if (i === 13 || i === 14) { c.set(x, 1, COPPER); c.set(x, 3, COPPER) }
      } else if (i >= 4) {
        const f = (i - 4) / 8 // 0 at the fading tail, 1 by the head
        c.set(x, 2, [255, Math.round(170 + 74 * f), Math.round(60 + 136 * f), 255])
        if (i >= 8) { c.set(x, 1, EDGE); c.set(x, 3, EDGE) }
      }
    }
  }
  half(1, 0)
  half(-1, 31)
  // The back crosses: a small hot dot (what you see of a bullet flying straight away from you).
  for (const cx of [2, 7]) {
    c.set(cx, 7, CORE); c.set(cx - 1, 7, EDGE); c.set(cx + 1, 7, EDGE); c.set(cx, 6, EDGE); c.set(cx, 8, EDGE)
  }
  write('minecraft/textures/entity/projectiles/arrow.png', c.png())
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
      { type: 'bitmap', file: 'donating:font/ping.png', ascent: 7, height: 8, chars: ['\ue004'] },
      // The phone menus' backgrounds and spaces (tools\make-phone-ui.js writes donating:phone_ui).
      { type: 'reference', id: 'donating:phone_ui' }
    ]
  })
}
console.log('wrote bag, ammo, weapon, XP bar and tab-list art to pack\\assets')
