// node build.js : builds the hands mock (repo gun modules + the repo kit, read only) into mock/out, zips it, renders
// first-person frames with the bag composited (hidden while the left hand works) and writes compose lists.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process')
const PROTO = 'C:/Users/matti/AppData/Local/Temp/claude/C--Users-matti-OneDrive-Desktop-Donating-Test-Server/0780fadd-412f-469c-beee-bc8b53ea6313/scratchpad/remake/work/style/proto'
const { build, zipDir, REPO } = require(path.join(PROTO, 'harness.js'))
const l = require(path.join(PROTO, '..', 'lib.js'))
const wrap = require('./wrap.js')
const CH = require('./choreo.js')
const OUT = path.join(__dirname, 'out'); const ZIP = path.join(__dirname, 'mock.zip')
const guns = (process.argv[2] || 'ak47,gs50,r90').split(',')
const modules = {}
for (const g of guns) { const f = path.join(__dirname, `mod-${g}.js`); fs.writeFileSync(f, `module.exports = require('./wrap.js')('${g}', require('./choreo.js').${g})\n`); modules[g] = f }
build({ kit: path.join(REPO, 'tools/guns/pg.js'), out: OUT, guns, skins: false, modules })
zipDir(OUT, ZIP)
const N = path.join(REPO, 'tools/node/node.exe'); const RI = path.join(REPO, 'tools/render-item.js')
const W = +(process.env.W || 640), H = +(process.env.H || 360)
const R = path.join(__dirname, 'render'); fs.mkdirSync(R, { recursive: true })
const run = (what, out, view, more = []) => execFileSync(N, [RI, what, out, view, W, H, '--pack', ZIP, ...more].map(String), { stdio: 'pipe' })
const bag = l.load(path.join(__dirname, '..', 'render', 'bag-fpl.png'))
const bg = y => l.get(bag, W - 2, y)
const close = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 6
// bagDrop: 0 = where it is, 1 = gone below the screen
const withBag = (f, drop) => {
  const g = l.load(f); const dy = Math.round(drop * 160)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sy = y - dy; if (sy < 0 || sy >= H) continue
    const p = l.get(g, x, y); const q = l.get(bag, x, sy)
    const nearX = Math.abs(x - W / 2) < 14 && Math.abs(sy - H / 2) < 14
    if (!nearX && close(p, bg(y)) && !close(q, bg(sy))) g.px.set(q, (y * W + x) * 4)
  }
  l.save(g, f)
}
const NUM = { gs50: 9, uzi: 1, r90: 14, ak47: 5, rev: 8, tommy: 15, m16: 7, sniper: 13, lmg: 11 }
const FR = {
  ak47: { reload: [0.04, 0.14, 0.25, 0.36, 0.45, 0.57, 0.66, 0.74, 0.8, 0.95] },
  gs50: { reload: [0.06, 0.25, 0.43, 0.6, 0.73, 0.9], shot: [0.1] },
  r90: { reload: [0.125, 0.375, 0.625, 0.875], shot: [0.4, 0.5, 0.7] }
}
// the bag over a reload: down by p 0.1, gone, back up from p 0.9
const bagAt = p => p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1
const list = []
for (const g of guns) {
  const n = NUM[g]
  const frames = [['rest', n, [], 0], ['aimed', n + 1000, [], 0], ['sprint', n + 2000, [], 0]]
  for (const p of FR[g].reload) frames.push([`reload p${p}`, n + 3000, ['--cooldown', +(1 - p).toFixed(4)], g === 'r90' ? 1 : bagAt(p)])
  for (const p of FR[g].shot || []) frames.push([`${g === 'r90' ? 'closing pump' : 'shot'} p${p}`, n, ['--cooldown', +(1 - p).toFixed(4)], g === 'r90' ? 1 : 0])
  for (const [label, num, more, drop] of frames) {
    const f = path.join(R, `mock-${g}-${label.replace(/[^a-z0-9.]+/gi, '_')}.png`)
    run(`feather@${num}`, f, 'fp', more)
    withBag(f, drop)
    list.push(`${f}|${g}: ${label}${drop >= 1 ? ' (bag away)' : drop > 0 ? ' (bag going)' : ''}`)
  }
  fs.writeFileSync(path.join(R, `list-${g}.txt`), list.filter(s => s.includes(`mock-${g}-`)).join('\n') + '\n')
}
console.log(list.length, 'frames')
