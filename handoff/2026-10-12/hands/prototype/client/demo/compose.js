// Overlays first-person renders (same size) into one screen: later images drawn over earlier ones wherever they
// aren't render-item.js's sky. The offhand bag (fpl) and the gun (fp) come from separate renders because render-item
// draws one hand at a time; the client draws both in one depth-tested pass (GameRenderer.render3dHud), so where the
// two overlap the nearer one wins there, not the later one here.
// usage: node compose.js <out.png> <base.png> <over.png>...
const fs = require('fs')
const path = require('path')
const REPO = 'C:/Users/matti/OneDrive/Desktop/Donating Test Server/tools'
const { decodePng } = require(path.join(REPO, 'render-item.js'))
const { encode } = require(path.join(REPO, 'png.js'))
const [out, ...ins] = process.argv.slice(2)
const imgs = ins.map(f => decodePng(fs.readFileSync(f)))
const { w, h } = imgs[0]
const px = Buffer.from(imgs[0].px)
const sky = (y) => { const t = y / h; return [Math.round(150 - 40 * t), Math.round(186 - 30 * t), Math.round(222 - 20 * t)] }
for (const im of imgs.slice(1)) {
  for (let y = 0; y < h; y++) {
    const s = sky(y)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (Math.abs(im.px[i] - s[0]) + Math.abs(im.px[i + 1] - s[1]) + Math.abs(im.px[i + 2] - s[2]) > 3) im.px.copy(px, i, i, i + 4)
    }
  }
}
fs.writeFileSync(out, encode(w, h, px))
console.log('wrote', out)
