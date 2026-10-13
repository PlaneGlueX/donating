// Builds the AK-48 module with a kit and renders the first-person shots with render-item-clip.js (near-plane
// clipping), plus a labelled contact sheet. node shots.js <module.js> <kit.js> <out dir> [shot,shot,...]
const path = require('path'); const fs = require('fs')
const P = 'C:/Users/matti/AppData/Local/Temp/claude/C--Users-matti-OneDrive-Desktop-Donating-Test-Server/0780fadd-412f-469c-beee-bc8b53ea6313/scratchpad/remake/work/style/proto'
const { build, zipDir } = require(path.join(P, 'harness.js'))
const RI = require('./render-item-clip.js')
const { encode } = require('C:/Users/matti/OneDrive/Desktop/Donating Test Server/tools/png.js')
const [mod, kit, outDir, only] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const assets = path.join(outDir, 'assets-build')
build({ kit: path.resolve(kit), out: assets, guns: ['ak47'], skins: true, modules: { ak47: path.resolve(mod) } })
const zip = path.join(outDir, 'pack.zip'); zipDir(assets, zip)
const SHOTS = {
  hip: ['feather@5', 'fp', {}], fire: ['feather@5', 'fp', { fire: true, time: 0.1 }], ads: ['feather@1005', 'fp', {}], sprint: ['feather@2005', 'fp', {}],
  draw: ['feather@5', 'fp', { cooldown: 0.85 }],
  r100: ['feather@3005', 'fp', { cooldown: 1 }], r080: ['feather@3005', 'fp', { cooldown: 0.8 }], r060: ['feather@3005', 'fp', { cooldown: 0.6 }],
  r040: ['feather@3005', 'fp', { cooldown: 0.4 }], r020: ['feather@3005', 'fp', { cooldown: 0.2 }],
  fpl: ['feather@5', 'fpl', {}], fpl080: ['feather@3005', 'fpl', { cooldown: 0.8 }], fpl040: ['feather@3005', 'fpl', { cooldown: 0.4 }], fpl020: ['feather@3005', 'fpl', { cooldown: 0.2 }],
  golden: ['feather@3005', 'fp', { cooldown: 0.8, skin: 'golden' }]
}
const want = only ? only.split(',') : Object.keys(SHOTS)
const imgs = []
for (const k of want) {
  const [what, view, o] = SHOTS[k]
  const opts = { pack: zip, ...o }
  // a skin's item definition as make-item-art.js writes it (paintSkin's map: the gun's models -> the skin's; hands pass)
  if (o.skin) {
    const items = JSON.parse(fs.readFileSync(path.join(assets, 'assets/minecraft/items/feather.json'), 'utf8'))
    const map = id => id.startsWith('donating:item/hands/') ? id : id.replace('donating:item/gun_ak47_', `donating:item/gunskin/ak47/${o.skin}/`)
    opts.def = JSON.parse(JSON.stringify(items), (k, v) => k === 'model' && typeof v === 'string' ? map(v) : v); opts.cmd = 3005
  }
  const r = RI.render(o.skin ? '(def)' : what, view, +process.env.W || 640, +process.env.HH || 360, opts)
  const file = path.join(outDir, `${k}.png`); fs.writeFileSync(file, r.png); imgs.push([k, file])
}
// contact sheet: 2 columns, labels as a coloured bar (no font: the file names say which)
const dec = imgs.map(([k, f]) => [k, RI.decodePng(fs.readFileSync(f))])
const cols = 2; const w = +process.env.W || 640; const h = +process.env.HH || 360; const rows = Math.ceil(dec.length / cols)
const W = cols * w + (cols + 1) * 6; const Hh = rows * h + (rows + 1) * 6
const px = Buffer.alloc(W * Hh * 4, 255)
for (let i = 0; i < W * Hh; i++) px.set([30, 30, 34, 255], i * 4)
dec.forEach(([k, im], i) => {
  const ox = 6 + (i % cols) * (w + 6); const oy = 6 + Math.floor(i / cols) * (h + 6)
  for (let y = 0; y < h; y++) im.px.copy(px, ((oy + y) * W + ox) * 4, y * w * 4, (y + 1) * w * 4)
})
fs.writeFileSync(path.join(outDir, 'sheet.png'), encode(W, Hh, px))
console.log('order:', dec.map(d => d[0]).join(', '))
