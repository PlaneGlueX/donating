// Image helpers for the style study: decode PNG (render-item.js's decoder), encode, crop, scale, stats.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const TOOLS = require('path').resolve(__dirname, '../..')
const src = fs.readFileSync(path.join(TOOLS, 'render-item.js'), 'utf8')
const a = src.indexOf('const decodePng = buf => {')
const b = src.indexOf('\n}\n', a) + 3
const decodePng = eval('(' + src.slice(a + 'const decodePng = '.length, b - 1) + ')')
const { encode } = require(path.join(TOOLS, 'png.js'))
const load = f => decodePng(fs.readFileSync(f))
const save = (img, f) => fs.writeFileSync(f, encode(img.w, img.h, img.px))
const get = (img, x, y) => { const i = (y * img.w + x) * 4; return [img.px[i], img.px[i + 1], img.px[i + 2], img.px[i + 3]] }
const crop = (img, x0, y0, w, h) => {
  const out = { w, h, px: Buffer.alloc(w * h * 4) }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x0 + x; const sy = y0 + y
    if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue
    img.px.copy(out.px, (y * w + x) * 4, (sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4)
  }
  return out
}
const scale = (img, k, bg = [255, 255, 255]) => {
  const out = { w: img.w * k, h: img.h * k, px: Buffer.alloc(img.w * k * img.h * k * 4) }
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const p = get(img, Math.floor(x / k), Math.floor(y / k))
    const al = p[3] / 255
    const q = [0, 1, 2].map(i => Math.round(p[i] * al + bg[i] * (1 - al)))
    out.px.set([...q, 255], (y * out.w + x) * 4)
  }
  return out
}
const hex = p => '#' + p.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('')
const lum = p => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]
module.exports = { load, save, get, crop, scale, hex, lum, encode }
