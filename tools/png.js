// Tiny PNG writer and pixel canvas for the pack art scripts (no dependencies).
const zlib = require('zlib')

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

// A transparent w x h canvas.
const canvas = (w, h) => {
  const px = Buffer.alloc(w * h * 4)
  const c = {
    w, h, px,
    set (x, y, col) {
      if (!col || x < 0 || y < 0 || x >= w || y >= h) return
      col.forEach((v, i) => { px[(y * w + x) * 4 + i] = v })
    },
    get (x, y) { const i = (y * w + x) * 4; return [px[i], px[i + 1], px[i + 2], px[i + 3]] },
    fill (x0, y0, x1, y1, col) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c.set(x, y, col) },
    // Draws rows of characters; each character is looked up in `colors` (others are left alone).
    draw (rows, colors, ox = 0, oy = 0) {
      rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) c.set(ox + x, oy + y, colors[ch]) }))
    },
    png () { return encode(w, h, px) }
  }
  return c
}

// Darker / lighter shades of an RGB(A) color.
const shade = (col, f) => [...col.slice(0, 3).map(v => Math.max(0, Math.min(255, Math.round(v * f)))), col[3] === undefined ? 255 : col[3]]

module.exports = { encode, canvas, shade }
