// node bagfist.js : the bag in the left hand with a gloved fist on its handle and the sleeve (first person, left hand),
// from the mock build (mock/out must hold gs50's hand models: node build.js gs50 first). Writes render/bagfist-*.png.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process')
const PROTO = 'C:/Users/matti/AppData/Local/Temp/claude/C--Users-matti-OneDrive-Desktop-Donating-Test-Server/0780fadd-412f-469c-beee-bc8b53ea6313/scratchpad/remake/work/style/proto'
const { zipDir, REPO } = require(path.join(PROTO, 'harness.js'))
const { place, then, apply, aim } = require('./wrap.js').util
const OUT = path.join(__dirname, 'out'); const PACK = path.join(__dirname, '..', 'pack', 'assets')
const MI = path.join(OUT, 'assets/donating/models/item')
// the bag (its 3D model and texture, from the built pack)
fs.copyFileSync(path.join(PACK, 'donating/models/item/bag_3_3d.json'), path.join(MI, 'bag_3_3d.json'))
fs.mkdirSync(path.join(OUT, 'assets/donating/textures/item'), { recursive: true })
fs.copyFileSync(path.join(PACK, 'donating/textures/item/bag_3_3d.png'), path.join(OUT, 'assets/donating/textures/item/bag_3_3d.png'))
const bagDisplay = JSON.parse(fs.readFileSync(path.join(MI, 'bag_3_3d.json'), 'utf8')).display
// the gs50 mock's left hand and sleeve, as models of their own with the bag's display (2x: the bag is drawn at 0.3,
// the pistol at 0.56)
const K = 1.3
for (const part of ['handL', 'armL']) {
  const m = JSON.parse(fs.readFileSync(path.join(MI, `gun_gs50_${part}.json`), 'utf8'))
  const base = JSON.parse(fs.readFileSync(path.join(MI, 'gun_gs50_base.json'), 'utf8'))
  const els = m.elements.map(e => ({ ...e, from: e.from.map(v => v * K), to: e.to.map(v => v * K) }))
  fs.writeFileSync(path.join(MI, `bag_${part}.json`), JSON.stringify({ textures: base.textures, elements: els, display: bagDisplay }))
}
const ZIP = path.join(__dirname, 'mock-bag.zip'); zipDir(OUT, ZIP)
const round = v => Math.round(v * 10000) / 10000
const tj = m => ({ translation: m.t.map(v => round(v / 16)), left_rotation: m.q.map(round), scale: [1, 1, 1], right_rotation: [0, 0, 0, 1] })
const X = [1, 0, 0]; const Y = [0, 1, 0]
// the fist on the handle (palm down, wrist toward the eye), the sleeve down toward the eye and a little left
const fist = place([8, 12.6, 8.3], [[Y, -90]])
const wrist = apply(fist, [3.25 * K, 0, 0])
const arm = { t: wrist, q: aim([-0.3, -0.45, 0.85]) }
const def = drop => ({ model: { type: 'minecraft:composite', models: [
  { type: 'minecraft:model', model: 'donating:item/bag_3_3d', transformation: tj(place([0, -drop, 0])) },
  { type: 'minecraft:model', model: 'donating:item/bag_handL', transformation: tj(then(fist, place([0, -drop, 0]))) },
  { type: 'minecraft:model', model: 'donating:item/bag_armL', transformation: tj(then(arm, place([0, -drop, 0]))) }
] } })
const N = path.join(REPO, 'tools/node/node.exe'); const RI = path.join(REPO, 'tools/render-item.js')
for (const [name, drop] of [['held', 0], ['lowering', 14], ['gone', 40]]) {
  const f = path.join(__dirname, `bagfist-${name}.json`); fs.writeFileSync(f, JSON.stringify(def(drop)))
  execFileSync(N, [RI, path.join(__dirname, 'render', `bagfist-${name}.png`), 'fpl', 640, 360, '--pack', ZIP, '--def', f], { stdio: 'pipe' })
}
console.log('ok')
