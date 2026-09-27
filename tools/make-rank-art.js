// make-rank-art.js: the paid ranks' tags as images for the Tebex store (owner, 2026-09-27): "[VIP]", "[VIP+]",
// "[Elite]", "[Legend]" in their chat colors, Minecraft-style pixel text drawn with our own letters (not Mojang's
// font file), with the in-game text shadow (the same text at a quarter of the color, one pixel down and right),
// on a transparent background with a little padding, scaled up 16x with no smoothing. All four are the same height.
// Run: tools\node\node.exe tools\make-rank-art.js   -> extras\store\<rank>.png
const fs = require('fs')
const path = require('path')
const { canvas } = require('./png')

// Our own glyphs, 8 rows each: rows 0-6 stand on the baseline (row 6), row 7 is for descenders (g).
const G = {
  '[': ['###', '#..', '#..', '#..', '#..', '#..', '###', '...'],
  ']': ['###', '..#', '..#', '..#', '..#', '..#', '###', '...'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....', '.....'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..', '.....'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###', '...'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....', '.....'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####', '.....'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####', '.....'],
  l: ['#.', '#.', '#.', '#.', '#.', '#.', '.#', '..'],
  i: ['#', '.', '#', '#', '#', '#', '#', '.'],
  t: ['...', '.#.', '###', '.#.', '.#.', '.#.', '..#', '...'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.####', '.....'],
  g: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '####.'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#', '.....'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####', '.....']
}

const SCALE = 16 // image pixels per font pixel
const PAD = 1 // font pixels of padding on every side
const ROWS = 8 // glyph rows (with the descender row)

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255]
// Minecraft's text shadow: each channel of the color divided by 4.
const quarter = c => [c[0] >> 2, c[1] >> 2, c[2] >> 2, 255]

function tag (text, color) {
  // The text's pixels at font size: one pixel between letters (Minecraft's advance = width + 1).
  const on = []
  let x = 0
  for (const ch of text) {
    const g = G[ch]
    if (!g) throw new Error(`no glyph for "${ch}"`)
    g.forEach((row, y) => [...row].forEach((p, gx) => { if (p === '#') on.push([x + gx, y]) }))
    x += g[0].length + 1
  }
  const textW = x - 1
  // Room for the shadow (one more pixel right and down) and the padding.
  const w = PAD + textW + 1 + PAD
  const h = PAD + ROWS + 1 + PAD
  const small = canvas(w, h)
  const col = hex(color)
  for (const [px, py] of on) small.set(PAD + px + 1, PAD + py + 1, quarter(col))
  for (const [px, py] of on) small.set(PAD + px, PAD + py, col)
  // Scaled up with no smoothing: every font pixel becomes a SCALE x SCALE block.
  const big = canvas(w * SCALE, h * SCALE)
  for (let y = 0; y < h; y++) {
    for (let x2 = 0; x2 < w; x2++) {
      const p = small.get(x2, y)
      if (!p || p[3] === 0) continue
      big.fill(x2 * SCALE, y * SCALE, x2 * SCALE + SCALE - 1, y * SCALE + SCALE - 1, p)
    }
  }
  return { png: big.png(), w: w * SCALE, h: h * SCALE }
}

const out = path.join(__dirname, '..', 'extras', 'store')
fs.mkdirSync(out, { recursive: true })
for (const [file, text, color] of [
  ['vip.png', '[VIP]', '#55FF55'],
  ['vipplus.png', '[VIP+]', '#55FFFF'],
  ['elite.png', '[Elite]', '#FFAA00'],
  ['legend.png', '[Legend]', '#FF55FF']
]) {
  const t = tag(text, color)
  fs.writeFileSync(path.join(out, file), t.png)
  console.log(`${file}: ${t.w}x${t.h}`)
}
