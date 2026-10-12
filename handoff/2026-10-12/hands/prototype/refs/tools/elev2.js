// node elev2.js <gun key> <out.png> [left|right] [model suffix=full]: an orthographic elevation of donating:item/gun_<key>_<suffix>
// with a 1-unit grid (magenta every 5, blue at 0), through render-item's gui view, cancelling the gun's own gui display.
// Adapted from work\minigun\elev.js (which assumed the minigun's gui transform).
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process')
const REPO = 'C:/Users/matti/OneDrive/Desktop/Donating Test Server'
const l = require('../../../work/style/lib.js')
const [key, out, side = 'left', suf = 'full'] = process.argv.slice(2)
const PACK = path.join(__dirname, '..', 'pack')
const base = JSON.parse(fs.readFileSync(path.join(PACK, 'assets/donating/models/item', `gun_${key}_base.json`), 'utf8'))
const gd = base.display.gui
const GUI = { rz: gd.rotation[2], s: gd.scale[0], tx: gd.translation[0], ty: gd.translation[1] }
const R = Math.PI / 180
const qAxis = (ax, d) => { const a = d * R / 2; const n = Math.hypot(...ax); return [ax[0] / n * Math.sin(a), ax[1] / n * Math.sin(a), ax[2] / n * Math.sin(a), Math.cos(a)] }
const qMul = (a, b) => [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1], a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0], a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3], a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]
const qRot = (q, v) => { const p = qMul(qMul(q, [...v, 0]), [-q[0], -q[1], -q[2], q[3]]); return p.slice(0, 3) }
const s = 0.85 * 0.36 / GUI.s * 1.3
let q = qMul(qAxis([0, 0, 1], -GUI.rz), qAxis([0, 1, 0], 180))
if (side === 'right') q = qAxis([0, 0, 1], -GUI.rz)
const p = [0.5, 0.5, 0.5]; const rp = qRot(q, p).map(v => v * s); const t = p.map((v, i) => v - rp[i])
const def = path.resolve(out + '.def.json')
fs.writeFileSync(def, JSON.stringify({ model: { type: 'minecraft:model', model: `donating:item/gun_${key}_${suf}`, transformation: { translation: t, left_rotation: q, scale: [s, s, s], right_rotation: [0, 0, 0, 1] } } }))
const SZ = 1600
execFileSync(path.join(REPO, 'tools/node/node.exe'), [path.join(REPO, 'tools/render-item.js'), path.resolve(out + '.raw.png'), 'gui', SZ, SZ, '--pack', path.join(REPO, 'extras/packs/Donating-pack.zip'), '--def', def])
const img = l.load(out + '.raw.png')
const k = SZ / 16 * GUI.s * s // px per model unit
const cx = SZ / 2 + GUI.tx * SZ / 16; const cy = SZ / 2 - GUI.ty * SZ / 16
const flip = side === 'right' ? -1 : 1
const X = x => cx + flip * (x - 8) * k; const Y = y => cy - (y - 8) * k
for (let u = -16; u <= 32; u++) {
  const c = u === 0 ? [0, 140, 255, 255] : u % 5 === 0 ? [230, 0, 230, 255] : [255, 170, 255, 120]
  const xp = Math.round(X(u)); const yp = Math.round(Y(u))
  for (let y = 0; y < SZ; y++) if (xp >= 0 && xp < SZ) { const o = l.get(img, xp, y); if (o[3] < 255 || u % 5 === 0) img.px.set(c[3] < 255 ? [o[0] * 0.5 + c[0] * 0.5, o[1] * 0.5 + c[1] * 0.5, o[2] * 0.5 + c[2] * 0.5, 255].map(Math.round) : c, (y * SZ + xp) * 4) }
  for (let x = 0; x < SZ; x++) if (yp >= 0 && yp < SZ) { const o = l.get(img, x, yp); if (o[3] < 255 || u % 5 === 0) img.px.set(c[3] < 255 ? [o[0] * 0.5 + c[0] * 0.5, o[1] * 0.5 + c[1] * 0.5, o[2] * 0.5 + c[2] * 0.5, 255].map(Math.round) : c, (yp * SZ + x) * 4) }
}
// crop to the -16..32 x -8..24 box
const x0 = Math.max(0, Math.round(Math.min(X(-16), X(32)))); const x1 = Math.min(SZ, Math.round(Math.max(X(-16), X(32))))
const y0 = Math.max(0, Math.round(Y(22))); const y1 = Math.min(SZ, Math.round(Y(-6)))
l.save(l.crop(img, x0, y0, x1 - x0, y1 - y0), out)
console.log(out, 'px/unit', k.toFixed(2), 'x0', x0, 'unit0 at', Math.round(X(-16)) - x0)
