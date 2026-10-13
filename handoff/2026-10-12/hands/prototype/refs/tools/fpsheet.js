// node fpsheet.js <gun key|all> : first-person frames of a gun from the built pack (extras\packs\Donating-pack.zip),
// with the heist bag (leather@donating:bag_3, firstperson_lefthand) composited where the client draws it, plus a
// list for compose.ps1. Frames: rest, aimed, sprint, the reload at its beats (cooldown = 1 - p), and the shot or
// action beats for the Shotgun and the Sniper Rifle.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process')
const REPO = 'C:/Users/matti/OneDrive/Desktop/Donating Test Server'
const l = require('../../../work/style/lib.js')
const OUT = path.join(__dirname, '..', 'render')
const ZIP = path.join(REPO, 'extras/packs/Donating-pack.zip')
const N = path.join(REPO, 'tools/node/node.exe'); const RI = path.join(REPO, 'tools/render-item.js')
const W = 640, H = 360
const GUNS = {
  gs50: { n: 9, name: 'Classic Pistol', reload: [0.06, 0.25, 0.43, 0.6, 0.73, 0.9] },
  rev: { n: 8, name: 'Old Revolver', reload: [0.08, 0.17, 0.29, 0.4, 0.5, 0.57, 0.66, 0.75, 0.9] },
  uzi: { n: 1, name: 'Machine Gun', reload: [0.05, 0.2, 0.4, 0.65, 0.8, 0.9] },
  tommy: { n: 15, name: 'Brave Patriot', reload: [0.12, 0.2, 0.28, 0.45, 0.58, 0.72, 0.8, 0.92] },
  r90: { n: 14, name: 'Shotgun', reload: [0.125, 0.375, 0.625, 0.875], shot: [0.1, 0.4, 0.5, 0.7] },
  m16: { n: 7, name: 'Combat Rifle', reload: [0.12, 0.22, 0.45, 0.53, 0.62, 0.7, 0.8, 0.84] },
  ak47: { n: 5, name: 'AK-48', reload: [0.14, 0.25, 0.36, 0.45, 0.57, 0.74, 0.8, 0.92] },
  sniper: { n: 13, name: 'Sniper Rifle', reload: [0.05, 0.13, 0.25, 0.38, 0.5, 0.6, 0.9, 0.96], shot: [0.05, 0.25, 0.35, 0.45, 0.55, 0.65] },
  lmg: { n: 11, name: 'Veteran', reload: [0.13, 0.25, 0.38, 0.5, 0.6, 0.66, 0.74, 0.8, 0.92] }
}
const run = (what, out, view, more = []) => execFileSync(N, [RI, what, out, view, W, H, '--pack', ZIP, ...more].map(String), { stdio: 'pipe' })
// the bag once
const bagF = path.join(OUT, 'bag-fpl.png')
if (!fs.existsSync(bagF)) run('leather@donating:bag_3', bagF, 'fpl')
const bag = l.load(bagF)
const bg = y => l.get(bag, W - 2, y) // the sky: a vertical gradient (column at the right edge is empty)
const close = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 6
const withBag = f => {
  const g = l.load(f)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = l.get(g, x, y); const q = l.get(bag, x, y)
    if (close(p, bg(y)) && !close(q, bg(y))) g.px.set(q, (y * W + x) * 4)
  }
  l.save(g, f)
}
const keys = process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : Object.keys(GUNS)
const list = []
for (const k of keys) {
  const G = GUNS[k]
  const frames = [['rest', G.n, []], ['aimed', G.n + 1000, []], ['sprint', G.n + 2000, []]]
  for (const p of G.reload) frames.push([`reload p${p}`, G.n + 3000, ['--cooldown', +(1 - p).toFixed(4)]])
  for (const p of G.shot || []) frames.push([`shot p${p}`, G.n, ['--cooldown', +(1 - p).toFixed(4)]])
  for (const [label, num, more] of frames) {
    const f = path.join(OUT, `fp-${k}-${label.replace(/[^a-z0-9.]+/gi, '_')}.png`)
    run(`feather@${num}`, f, 'fp', more)
    withBag(f)
    list.push(`${f}|${G.name}: ${label}`)
  }
}
fs.writeFileSync(path.join(OUT, `fp-${keys.length > 1 ? 'all' : keys[0]}-list.txt`), list.join('\n') + '\n')
console.log(list.length, 'frames')
