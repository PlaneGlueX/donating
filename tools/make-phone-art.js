// Draws the phone art in Donating's resource pack (all drawn here from scratch):
//   - the phone frame that replaces the map background, so every held map (the phone) looks like a
//     phone: a dark rounded bezel with side buttons, and a dark screen that shows wherever the phone
//     plugin leaves the map see-through (outside the city)
//   - two small arrows (2/3 of the normal size) for the zoomed-out big map: white = you, green = a
//     passive player. They replace two map icons the server never uses otherwise (jungle temple,
//     swamp hut); the phone plugin sends those types on the big map.
//   - the phone's inventory icon (16x16), see "Phone icon" below.
//
// Usage: tools\node\node.exe tools\make-phone-art.js   (writes the PNGs under pack\)
//
// The client draws the map background as one square from -7 to 135 map pixels, and the 128x128 map
// on top of it from 0 to 128. So in a 142x142 image the outer 7 pixels are the frame. This draws it
// at 2 texels per map pixel (284x284) for smoother corners.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const S = 2 // texels per map pixel
const SIZE = 142 * S
const BORDER = 7 * S

// Colors (RGBA)
const BEZEL = [28, 31, 36, 255]
const BEZEL_EDGE = [62, 68, 78, 255]
const BUTTON = [44, 48, 56, 255]
const SCREEN = [16, 20, 24, 255]
const SLOT = [8, 9, 11, 255]
const CAMERA = [22, 30, 44, 255]

// ---------- PNG ----------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = buf => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
// RGBA pixels (w x h) -> PNG file bytes.
const encode = (w, h, rgba) => {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(h * (w * 4 + 1))
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------- Phone frame ----------
const px = Buffer.alloc(SIZE * SIZE * 4) // transparent
const set = (x, y, c) => {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  c.forEach((v, i) => { px[(y * SIZE + x) * 4 + i] = v })
}
// Inside a rounded rectangle (x0..x1, y0..y1 inclusive, corner radius r)?
const inRound = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}
const fillRound = (x0, y0, x1, y1, r, c) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inRound(x, y, x0, y0, x1, y1, r)) set(x, y, c)
}

// Side buttons first, so the body covers their inner half: power on the right, volume on the left.
const IN = 2 * S // how far the body is inset from the image edge (the buttons stick out there)
fillRound(SIZE - IN - 2, 34 * S, SIZE - 1, 52 * S, S, BUTTON) // power
fillRound(0, 30 * S, IN + 2, 42 * S, S, BUTTON) // volume up
fillRound(0, 46 * S, IN + 2, 58 * S, S, BUTTON) // volume down

// Body: an edge line, then the bezel.
fillRound(IN, 0, SIZE - 1 - IN, SIZE - 1, 12 * S, BEZEL_EDGE)
fillRound(IN + 1, 1, SIZE - 2 - IN, SIZE - 2, 12 * S - 1, BEZEL)

// Screen (under the map), with slightly rounded corners.
fillRound(BORDER - 1, BORDER - 1, SIZE - BORDER, SIZE - BORDER, 2 * S, SCREEN)

// Speaker slot and camera in the top bezel.
fillRound(SIZE / 2 - 10 * S, 2 * S + 1, SIZE / 2 + 10 * S, 3 * S + 2, S, SLOT)
fillRound(SIZE / 2 + 14 * S, 2 * S, SIZE / 2 + 16 * S, 4 * S, S, CAMERA)

// map_background_checkerboard.png: behind a map that has data (the normal case).
// map_background.png: before the first map packet arrives.
const dir = path.join(__dirname, '..', 'pack', 'assets', 'minecraft', 'textures', 'map')
fs.mkdirSync(dir, { recursive: true })
const frame = encode(SIZE, SIZE, px)
for (const name of ['map_background_checkerboard.png', 'map_background.png']) fs.writeFileSync(path.join(dir, name), frame)
console.log(`wrote ${SIZE}x${SIZE} phone frame (${frame.length} bytes) to ${dir}`)

// ---------- Small arrows ----------
// A 16x16 icon draws at the same size as vanilla's 8x8 ones, so an 11-pixel arrow in it is about 2/3
// of a normal arrow. It points up, like vanilla's (the icon's rotation turns it).
const ARROW = [
  '...K...',
  '..KLK..',
  '..KLK..',
  '.KLLLK.',
  '.KLLLK.',
  'KLLLLLK',
  'KLLLLLK',
  'KLLLLLK',
  'KLLLLLK',
  'KDLLLDK',
  '.KKKKK.'
]
const arrow = (light, dark) => {
  const rgba = Buffer.alloc(16 * 16 * 4)
  const colors = { K: [0, 0, 0, 255], L: light, D: dark }
  ARROW.forEach((row, y) => [...row].forEach((ch, x) => {
    if (colors[ch]) colors[ch].forEach((v, i) => { rgba[((y + 2) * 16 + x + 5) * 4 + i] = v })
  }))
  return encode(16, 16, rgba)
}
const deco = path.join(dir, 'decorations')
fs.mkdirSync(deco, { recursive: true })
fs.writeFileSync(path.join(deco, 'jungle_temple.png'), arrow([250, 250, 250, 255], [185, 185, 185, 255])) // you
fs.writeFileSync(path.join(deco, 'swamp_hut.png'), arrow([40, 230, 90, 255], [20, 160, 60, 255])) // passive players
console.log(`wrote the small arrows to ${deco}`)

// ---------- Phone icon ----------
// The phone item's look in the inventory, on the ground and in other players' hands: a small phone
// with a map on its screen. pack\assets\minecraft\items\filled_map.json picks it for maps whose
// first custom_model_data string is "donating:phone" (inventory.sk's phoneItem); every other map
// keeps the vanilla look, and without the pack the phone looks like a normal map. Held in first
// person it's still drawn as the map (the client draws any map in hand that way).
const PHONE = [
  '................',
  '....KKKKKKKK....',
  '...KBBBBBBBBK...',
  '...KBBBssBBBK...',
  '...KBGGGyWWBK...',
  '...KBGgGyWWBK...',
  '...KByyyyyWBK...',
  '...KBGGGyGGBK...',
  '...KBGRGyGgBK...',
  '...KBGGGyGGBK...',
  '...KBgGGyyyBK...',
  '...KBGGGyGGBK...',
  '...KBBBBBBBBK...',
  '...KBBBooBBBK...',
  '....KKKKKKKK....',
  '................'
]
const PHONE_COLORS = {
  K: [12, 13, 16, 255], // outline
  B: [36, 40, 47, 255], // bezel
  s: [10, 11, 13, 255], // speaker
  o: [70, 76, 88, 255], // home button
  G: [96, 140, 72, 255], // land
  g: [70, 110, 56, 255], // park
  W: [64, 112, 180, 255], // water
  y: [200, 196, 180, 255], // road
  R: [220, 50, 50, 255] // pin
}
const icon = Buffer.alloc(16 * 16 * 4)
PHONE.forEach((row, y) => [...row].forEach((ch, x) => {
  if (PHONE_COLORS[ch]) PHONE_COLORS[ch].forEach((v, i) => { icon[(y * 16 + x) * 4 + i] = v })
}))
const itemDir = path.join(__dirname, '..', 'pack', 'assets', 'donating', 'textures', 'item')
fs.mkdirSync(itemDir, { recursive: true })
fs.writeFileSync(path.join(itemDir, 'phone.png'), encode(16, 16, icon))
console.log(`wrote the phone icon to ${itemDir}`)
