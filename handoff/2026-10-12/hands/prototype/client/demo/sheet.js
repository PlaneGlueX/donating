// A grid of PNGs (rows separated by "+"), half size, 6 px gaps. usage: node sheet.js <out.png> a.png b.png / c.png d.png
const fs = require('fs')
const path = require('path')
const REPO = 'C:/Users/matti/OneDrive/Desktop/Donating Test Server/tools'
const { decodePng } = require(path.join(REPO, 'render-item.js'))
const { encode } = require(path.join(REPO, 'png.js'))
const [out, ...args] = process.argv.slice(2)
const rows = [[]]
for (const a of args) a === '+' ? rows.push([]) : rows[rows.length - 1].push(decodePng(fs.readFileSync(a)))
const half = im => { const w = im.w >> 1; const h = im.h >> 1; const px = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) im.px.copy(px, (y * w + x) * 4, ((2 * y) * im.w + 2 * x) * 4, ((2 * y) * im.w + 2 * x) * 4 + 4); return { w, h, px } }
const R = rows.map(r => r.map(half))
const G = 6
const W = Math.max(...R.map(r => r.reduce((s, im) => s + im.w + G, G)))
const H = R.reduce((s, r) => s + Math.max(...r.map(im => im.h)) + G, G)
const px = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) px.set([40, 40, 40, 255], i * 4)
let y0 = G
for (const r of R) {
  let x0 = G
  for (const im of r) { for (let y = 0; y < im.h; y++) im.px.copy(px, ((y0 + y) * W + x0) * 4, y * im.w * 4, (y + 1) * im.w * 4); x0 += im.w + G }
  y0 += Math.max(...r.map(im => im.h)) + G
}
fs.writeFileSync(out, encode(W, H, px))
console.log('wrote', out, W + 'x' + H)
