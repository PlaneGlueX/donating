// node zoom.js <out.png> <x> <y> <w> <h> <k> <in1> [<in2> ...] : the same crop of each input, scaled k, side by side
const path = require('path')
const l = require(path.join(__dirname, '../../../work/style/lib.js'))
const [out, x, y, w, h, k, ...ins] = process.argv.slice(2)
const W = +w * +k; const Hh = +h * +k
const img = { w: W * ins.length + 4 * (ins.length - 1), h: Hh, px: Buffer.alloc((W * ins.length + 4 * (ins.length - 1)) * Hh * 4) }
ins.forEach((f, i) => {
  const s = l.scale(l.crop(l.load(f), +x, +y, +w, +h), +k)
  for (let yy = 0; yy < Hh; yy++) for (let xx = 0; xx < W; xx++) img.px.set(l.get(s, xx, yy), (yy * img.w + i * (W + 4) + xx) * 4)
})
l.save(img, out); console.log(out, img.w, img.h)
