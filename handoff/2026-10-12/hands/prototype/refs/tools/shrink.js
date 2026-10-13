// node shrink.js <in.png> <out.png> <width> : a box-filtered downscale to the given width
const path = require('path')
const l = require(path.join(__dirname, '../../../work/style/lib.js'))
const [i, o, w] = process.argv.slice(2)
const s = l.load(i); const W = +w; const f = s.w / W; const H = Math.round(s.h / f)
const out = { w: W, h: H, px: Buffer.alloc(W * H * 4) }
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const acc = [0, 0, 0, 0]; let n = 0
  for (let yy = Math.floor(y * f); yy < Math.min(s.h, Math.floor((y + 1) * f)); yy++) for (let xx = Math.floor(x * f); xx < Math.min(s.w, Math.floor((x + 1) * f)); xx++) { const p = l.get(s, xx, yy); for (let k = 0; k < 4; k++) acc[k] += p[k]; n++ }
  out.px.set(acc.map(v => Math.round(v / Math.max(1, n))), (y * W + x) * 4)
}
l.save(out, o); console.log(o, W, H)
