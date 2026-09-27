// make-store-art.js: art for the Tebex store's crate keys and boosters (owner, 2026-09-27: "can you make more art
// for the rest of the things on the storefront (the crate keys and boosters)"). Pixel sprites drawn here from simple
// shapes (no game textures): a key per crate in its rarity's in-game color (sparkles for Rare and up), and bills
// with a coin (money), an XP orb (XP) and a stopwatch (Heist Rush) with the booster bolt. Each sprite is lit from the
// top, gets a one-pixel dark outline, sits on a transparent background with a little padding, and is scaled up 16x
// with no smoothing. Also the DONATING logo for the store's header (owner, 2026-09-27), the tab-list logo scaled up.
// The rank tags are tools\make-rank-art.js.
// Run: tools\node\node.exe tools\make-store-art.js
//   -> extras\store\key_<crate>.png, booster_<kind>.png, logo.png (846x162), logo_large.png (1692x324)
const fs = require('fs')
const path = require('path')
const { canvas } = require('./png')

const N = 18 // sprite size in pixels (a 16-pixel drawing and room for its outline)
const PAD = 1 // pixels of padding around it
const SCALE = 16

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255]
const mix = (c, f) => [0, 1, 2].map(i => Math.max(0, Math.min(255, Math.round(c[i] * f)))).concat(255)
const toward = (c, t, f) => [0, 1, 2].map(i => Math.round(c[i] + (t[i] - c[i]) * f)).concat(255)

// A sprite: a map "x,y" -> color. Parts are painted in order, each with its own outline under later parts.
function sprite () {
  const px = new Map()
  const s = {
    px,
    // Paints every pixel whose center passes inside(x, y) (canvas pixel coordinates), colored by color(x, y).
    paint (inside, color) {
      const part = new Map()
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (inside(x + 0.5, y + 0.5)) part.set(`${x},${y}`, color(x + 0.5, y + 0.5))
      }
      s.add(part)
      return part
    },
    // Adds a part with its outline (4 neighbours) in a dark shade of the part's own darkest color.
    add (part, outline) {
      const dark = outline || [22, 18, 26, 255]
      for (const k of part.keys()) {
        const [x, y] = k.split(',').map(Number)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = `${x + dx},${y + dy}`
          if (!part.has(n) && x + dx >= 0 && y + dy >= 0 && x + dx < N && y + dy < N) px.set(n, dark)
        }
      }
      for (const [k, c] of part) px.set(k, c)
    },
    dot (x, y, c) { px.set(`${x},${y}`, c) },
    png () {
      const w = (N + 2 * PAD) * SCALE
      const big = canvas(w, w)
      for (const [k, c] of px) {
        const [x, y] = k.split(',').map(Number)
        big.fill((x + PAD) * SCALE, (y + PAD) * SCALE, (x + PAD) * SCALE + SCALE - 1, (y + PAD) * SCALE + SCALE - 1, c)
      }
      return big.png()
    }
  }
  return s
}

// Top-lit shading between a highlight and a shadow over a vertical span.
const lit = (base, y0, y1) => y => {
  const f = Math.max(0, Math.min(1, (y - y0) / Math.max(1, y1 - y0)))
  return f < 0.5 ? toward(mix(base, 1.25), base, f * 2) : toward(base, mix(base, 0.55), (f - 0.5) * 2)
}

// ---------- Crate keys ----------

function key (base, sparkles) {
  const s = sprite()
  const c = N / 2
  // The key along the diagonal: the bow up and left, the tip down and right, the teeth on the lower side.
  const local = (x, y) => {
    const dx = x - c
    const dy = y - c
    return [(dx + dy) / Math.SQRT2, (dy - dx) / Math.SQRT2]
  }
  const shade = lit(base, -4, 4)
  const inside = (x, y) => {
    const [lx, ly] = local(x, y)
    const bow = Math.hypot(lx + 5.2, ly) // the ring
    if (bow <= 3.9 && bow >= 1.7) return true
    if (lx >= -1.8 && lx <= 7.6 && Math.abs(ly) <= 1.05) return true // the shaft
    if (lx >= 2.6 && lx <= 4.4 && ly >= 0.5 && ly <= 3.4) return true // a tooth
    if (lx >= 5.6 && lx <= 7.6 && ly >= 0.5 && ly <= 2.7) return true // the other tooth
    return false
  }
  s.paint(inside, (x, y) => shade(local(x, y)[1]), mix(base, 0.25))
  // A bright glint on the ring.
  s.dot(5, 4, mix(base, 1.45))
  const white = [255, 255, 255, 255]
  const gold = [255, 246, 190, 255]
  const star = (x, y, col) => {
    s.dot(x, y, col)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.dot(x + dx, y + dy, mix(col, 0.8))
  }
  if (sparkles >= 1) star(14, 3, white)
  if (sparkles >= 2) star(3, 14, white)
  if (sparkles >= 3) { star(16, 9, gold); s.dot(11, 1, gold); s.dot(1, 9, gold) }
  return s
}

// ---------- Boosters ----------

// The booster bolt (the footer's ⚡), top right.
function bolt (s) {
  const rows = ['..###', '.###.', '#####', '..##.', '.##..', '##...']
  const part = new Map()
  const yellow = [255, 221, 51, 255]
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '#') part.set(`${12 + x},${y}`, y < 2 ? mix(yellow, 1.15) : y > 3 ? mix(yellow, 0.85) : yellow)
  }))
  s.add(part, [70, 45, 0, 255])
}

function coins () {
  const s = sprite()
  const bill = hex('#5DBB4A')
  const out = [14, 44, 10, 255]
  // Three bills, the lower ones peeking out below the top one.
  s.paint((x, y) => x >= 2 && x <= 15 && y >= 12 && y <= 15, () => mix(bill, 0.62), out)
  s.paint((x, y) => x >= 1 && x <= 14 && y >= 10 && y <= 13, () => mix(bill, 0.8), out)
  const top = s.paint((x, y) => x >= 1 && x <= 15 && y >= 5 && y <= 11, (x, y) => (y < 6 ? mix(bill, 1.18) : bill), out)
  void top
  // The top bill's inner border and its middle, with a $.
  const dark = mix(bill, 0.6)
  for (let x = 2; x <= 14; x++) { s.dot(x, 6, dark); s.dot(x, 10, dark) }
  for (let y = 6; y <= 10; y++) { s.dot(2, y, dark); s.dot(14, y, dark) }
  const light = mix(bill, 1.3)
  for (let y = 7; y <= 9; y++) for (let x = 6; x <= 10; x++) s.dot(x, y, light)
  const ink = hex('#1F5A16')
  for (const [x, y] of [[8, 5], [8, 6], [9, 6], [7, 7], [8, 8], [9, 9], [7, 10], [8, 10], [8, 11]]) s.dot(x, y, ink)
  s.dot(4, 8, light)
  s.dot(12, 8, light)
  // A gold coin in front, bottom left.
  const gold = hex('#F4C542')
  s.paint((x, y) => Math.hypot(x - 4.2, y - 14.2) <= 2.9, (x, y) => (y < 13.5 ? mix(gold, 1.2) : y > 15 ? mix(gold, 0.75) : gold), [70, 45, 0, 255])
  s.dot(4, 14, mix(gold, 0.7))
  bolt(s)
  return s
}

function orb () {
  const s = sprite()
  const cx = 8.3
  const cy = 9.6
  s.paint((x, y) => Math.hypot(x - cx, y - cy) <= 6.0, (x, y) => {
    const d = Math.hypot(x - cx + 1.6, y - cy + 1.8) / 7.5 // light from the top left
    const inner = hex('#E8FF7A')
    const mid = hex('#7BE52A')
    const outer = hex('#2F8F12')
    return d < 0.45 ? toward(inner, mid, d / 0.45) : toward(mid, outer, Math.min(1, (d - 0.45) / 0.55))
  }, [16, 48, 6, 255])
  s.dot(6, 6, [255, 255, 230, 255])
  s.dot(7, 6, [240, 255, 170, 255])
  s.dot(6, 7, [240, 255, 170, 255])
  bolt(s)
  return s
}

function stopwatch () {
  const s = sprite()
  const cx = 8.6
  const cy = 10.4
  const rim = hex('#C9CED6')
  // The crown and button on top.
  s.paint((x, y) => Math.abs(x - cx) <= 1.2 && y >= 2.6 && y <= 4.4, () => mix(rim, 0.85), [30, 32, 40, 255])
  s.paint((x, y) => Math.abs(x - cx) <= 2.1 && y >= 2.0 && y <= 3.0, () => mix(rim, 1.1), [30, 32, 40, 255])
  // The case and the face.
  s.paint((x, y) => Math.hypot(x - cx, y - cy) <= 5.9, (x, y) => {
    const d = Math.hypot(x - cx, y - cy)
    if (d > 4.6) return y < cy ? mix(rim, 1.12) : mix(rim, 0.7)
    return y < cy - 1 ? [255, 255, 255, 255] : [232, 236, 242, 255]
  }, [30, 32, 40, 255])
  // The hands (up and to the right), the ticks and the center.
  const dark = [40, 42, 52, 255]
  const red = hex('#D8342C')
  for (const [x, y] of [[8, 7], [8, 8], [8, 9]]) s.dot(x, y, dark)
  for (const [x, y] of [[9, 9], [10, 8], [11, 7]]) s.dot(x, y, red)
  s.dot(8, 10, dark)
  for (const [x, y] of [[8, 5], [13, 10], [8, 15], [3, 10]]) s.dot(x, y, [150, 156, 170, 255])
  // Speed lines on the left.
  const blue = hex('#7FD3FF')
  for (const [x0, x1, y] of [[0, 1, 8], [0, 0, 11], [0, 1, 14]]) for (let x = x0; x <= x1; x++) s.dot(x, y, blue)
  bolt(s)
  return s
}

// ---------- The logo, big (owner, 2026-09-27: the store's header) ----------
// The exact tab-list logo texture (make-item-art.js, U+E000: DONATING in our own letters, a gold gradient, a dark
// outline and a drop shadow), scaled up with no smoothing.
function logo (scale) {
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
  const S = 2
  const W = [...word].map(ch => LETTERS[ch][0].length).reduce((a, w) => a + w * S + S, 0) - S + 4
  const H = 7 * S + 4
  const small = canvas(W, H)
  const gold = y => {
    const f = y / (7 * S - 1)
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
  for (const k of on) {
    const [x, y] = k.split(',').map(Number)
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [1, 2], [0, 2]]) {
      if (!on.has(`${x + dx},${y + dy}`)) small.set(x + dx, y + dy, [34, 18, 6, 255])
    }
  }
  for (const k of on) { const [x, y] = k.split(',').map(Number); small.set(x, y, gold(y - 2)) }
  const big = canvas(W * scale, H * scale)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = small.get(x, y)
    if (p[3] > 0) big.fill(x * scale, y * scale, x * scale + scale - 1, y * scale + scale - 1, p)
  }
  return { png: big.png(), w: W * scale, h: H * scale }
}

const out = path.join(__dirname, '..', 'extras', 'store')
fs.mkdirSync(out, { recursive: true })
const jobs = [
  ['key_common.png', key(hex('#E6E6E6'), 0)],
  ['key_uncommon.png', key(hex('#55FF55'), 0)],
  ['key_rare.png', key(hex('#5555FF'), 1)],
  ['key_epic.png', key(hex('#AA00AA'), 2)],
  ['key_legendary.png', key(hex('#FFAA00'), 3)],
  ['booster_money.png', coins()],
  ['booster_xp.png', orb()],
  ['booster_rush.png', stopwatch()]
]
for (const [file, s] of jobs) {
  fs.writeFileSync(path.join(out, file), s.png())
  console.log(`${file}: ${(N + 2 * PAD) * SCALE}x${(N + 2 * PAD) * SCALE}`)
}
// The header logo: 9x (846 px wide) and 18x (1692 px wide, for wide or high-DPI headers).
for (const [file, scale] of [['logo.png', 9], ['logo_large.png', 18]]) {
  const l = logo(scale)
  fs.writeFileSync(path.join(out, file), l.png)
  console.log(`${file}: ${l.w}x${l.h}`)
}
