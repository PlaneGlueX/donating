// Shared pieces for the phone UI art (tools\make-phone-ui.js): colors, the app tile, blending.
// Every icon is a 16x16 canvas drawn at 1 texel per GUI pixel (items render 16x16 in a menu slot).
const { canvas, shade } = require('../png.js')

const hex = (h, a = 255) => { const v = parseInt(h.replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255, a] }
// Straight alpha blend of `top` over `under` (both RGBA).
const over = (under, top) => {
  const a = top[3] / 255
  if (a >= 1) return top.slice()
  const ua = under[3] / 255
  const oa = a + ua * (1 - a)
  if (oa <= 0) return [0, 0, 0, 0]
  return [0, 1, 2].map(i => Math.round((top[i] * a + under[i] * ua * (1 - a)) / oa)).concat([Math.round(oa * 255)])
}
const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)).concat([Math.round((a[3] ?? 255) + ((b[3] ?? 255) - (a[3] ?? 255)) * t)])

// Paints `col` over the pixel (x, y) with alpha blending.
const paint = (c, x, y, col) => { if (x < 0 || y < 0 || x >= c.w || y >= c.h) return; c.set(x, y, over(c.get(x, y), col)) }

// Is (x, y) inside a w x h rounded rectangle at (0, 0) with corner radius r? (r 2 = two corner texels cut)
const inRound = (x, y, w, h, r) => {
  const cx = x < r ? r - 0.5 : x >= w - r ? w - r - 0.5 : x + 0.5 - 0.5
  const cy = y < r ? r - 0.5 : y >= h - r ? h - r - 0.5 : y + 0.5 - 0.5
  if ((x >= r && x < w - r) || (y >= r && y < h - r)) return true
  return (x - cx) ** 2 + (y - cy) ** 2 <= (r - 0.25) ** 2 + 0.5
}

// The app tile every app and GPS icon sits on (iOS-like): a 16x16 rounded square (2-texel corners), a vertical
// gradient of `color` (lighter at the top, darker at the bottom) and a 1-texel darker rim along the bottom.
// Draw the symbol on top with `glyph` (rows of chars, colors per char) or by hand.
const tile = (c, color, opts = {}) => {
  const top = shade(color, opts.light ?? 1.18), bottom = shade(color, opts.dark ?? 0.82)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!inRound(x, y, 16, 16, 2)) continue
    let col = mix(top, bottom, y / 15)
    if (y === 15 || (y === 14 && (x === 0 || x === 15))) col = shade(color, 0.62)
    c.set(x, y, col)
  }
}
// Draws a centered symbol: rows of characters, colors per character; a soft shadow one texel down unless shadow: false.
const glyph = (c, rows, colors, opts = {}) => {
  const h = rows.length, w = Math.max(...rows.map(r => r.length))
  const ox = opts.x ?? Math.floor((16 - w) / 2), oy = opts.y ?? Math.floor((16 - h) / 2)
  if (opts.shadow !== false) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (colors[ch] && (colors[ch][3] ?? 255) > 0) paint(c, ox + x, oy + y + 1, [0, 0, 0, opts.shadowAlpha ?? 70])
    }))
  }
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) paint(c, ox + x, oy + y, colors[ch]) }))
}

// The palette (the owner can retune colors here).
const PAL = {
  white: hex('#FFFFFF'), ink: hex('#1C1C1E'), gray: hex('#8E8E93'),
  messages: hex('#34C759'), gps: hex('#0A84FF'), missions: hex('#AF52DE'), garage: hex('#30B0C7'), bag: hex('#A2845E'),
  crates: hex('#FFB800'), cosmetics: hex('#FF2D55'), season: hex('#FF9500'), bounties: hex('#FF3B30'),
  passiveOn: hex('#34C759'), passiveOff: hex('#8E8E93'), help: hex('#636366'),
  quests: hex('#FF9F0A'), heists: hex('#1E8E3E'), shops: hex('#5856D6'), places: hex('#FF375F'), pin: hex('#D040E0'),
  heist0: hex('#9E9E9E'), heist1: hex('#7ED321'), heist2: hex('#F5C518'), heist3: hex('#E74C3C'), heist4: hex('#2B2B2B'),
  base: hex('#5AC8FA'), spawn: hex('#E5E5EA'), landmark: hex('#BF5AF2'), crate: hex('#FFB800'),
  shopGun: hex('#3A3A3C'), shopGear: hex('#6B8E23'), shopBag: hex('#A2845E'), shopTools: hex('#8E8E93'), shopCars: hex('#0A84FF'), shopOther: hex('#5856D6')
}

module.exports = { canvas, shade, hex, over, mix, paint, inRound, tile, glyph, PAL }
