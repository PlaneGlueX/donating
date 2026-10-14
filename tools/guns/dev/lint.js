// A style check for a remade gun module (STYLE.md's rules as numbers): node lint.js <module.js> <gun id> [--kit pg.js]
// Builds the module with the prototype kit (nothing in the repo is touched) and reports: density and texture size,
// boxes off the 1/D grid, big faces with no detail (no split, decal or pattern), thickness, the ink share of the
// inventory icon, and the element count.
const path = require('path'); const fs = require('fs'); const { execFileSync } = require('child_process')
const { build, zipDir, REPO } = require('./harness.js')
const args = process.argv.slice(2)
const ki = args.indexOf('--kit'); const kit = ki >= 0 ? path.resolve(args.splice(ki, 2)[1]) : path.join(__dirname, '..', 'pg.js')
const [mod, id] = args
if (!mod || !id) { console.log('usage: node lint.js <module.js> <gun id> [--kit pg.js]'); process.exit(1) }
const out = path.join(__dirname, 'out-lint-' + id)
let spec = null
const { pg } = build({ kit, out, guns: [id], skins: false, modules: { [id]: mod }, wrap: (n, s) => { spec = s; return s } })
const name = pg.made['gun_' + id] ? 'gun_' + id : 'melee_' + id // a gun, or a pg-kit melee weapon (katana, knuckles, nunchucks)
const g = pg.made[name]
const D = spec.density || (spec.style === 'pg' ? 4 : 2)
const issues = []
console.log(`${name}: style ${spec.style || 'legacy'}, density ${D}, texture ${g.W}x${g.H}, tiles ${g.tiles.length}`)
// 1. the grid: every box corner on a multiple of 1/D (so texels are square and decals line up); rotated boxes too
const off = []
for (const [part, boxes] of Object.entries(spec.parts)) boxes.forEach((b, i) => {
  const bad = [...b.from, ...b.to].filter(v => Math.abs(v * D - Math.round(v * D)) > 1e-3)
  if (bad.length && b.outline !== false && !b.glow) off.push(`${part}#${i} ${JSON.stringify(b.from)}-${JSON.stringify(b.to)}`)
})
console.log(`off-grid outlined boxes: ${off.length}${off.length ? '\n  ' + off.slice(0, 12).join('\n  ') + (off.length > 12 ? '\n  ...' : '') : ''}`)
if (off.length) issues.push(`${off.length} outlined boxes off the 1/${D} grid`)
// 2. big faces with nothing on them: >= 12 texels both ways and no split / decal / pattern
const empty = g.tiles.filter(t => t.pg && !t.glow && t.w >= 12 && t.h >= 12 && !t.cols.length && !t.rows.length && !t.decals.length && (t.pat === 'flat'))
const big = g.tiles.filter(t => !t.glow && t.w >= 12 && t.h >= 12)
console.log(`big faces (>=12x12 texels): ${big.length}, with no seam/decal/pattern: ${empty.length}${empty.length ? '\n  ' + empty.slice(0, 12).map(t => `${t.key} ${t.dir} ${t.w}x${t.h}`).join('\n  ') : ''}`)
if (big.length && empty.length / big.length > 0.25) issues.push(`${empty.length}/${big.length} big faces are empty (rule: at most a quarter)`)
// 3. thickness: the z extent of the full model and of the thickest box
const full = JSON.parse(fs.readFileSync(path.join(out, 'assets', 'donating', 'models', 'item', `${name}_full.json`), 'utf8'))
const ext = i => [Math.min(...full.elements.map(e => Math.min(e.from[i], e.to[i]))), Math.max(...full.elements.map(e => Math.max(e.from[i], e.to[i])))]
const thick = Math.max(...full.elements.map(e => Math.abs(e.to[2] - e.from[2])))
const [x0, x1] = ext(0)
console.log(`length ${(x1 - x0).toFixed(2)} units, thickest box ${thick.toFixed(2)} units (${Math.round(thick * D)} texels), elements in _full ${full.elements.length}`)
if (thick < 3) issues.push(`thickest box ${thick.toFixed(2)} units: a chunky PG3D receiver is >= 3 units (12 texels) thick`)
if (full.elements.length > 160) issues.push(`${full.elements.length} elements in the full model: keep it under ~160 (detail goes in the texture)`)
// 4. the inventory icon's ink share
zipDir(out, out + '.zip')
const png = path.join(__dirname, `lint-${id}-gui.png`)
execFileSync(fs.existsSync(path.join(REPO, 'tools', 'node', 'node.exe')) ? path.join(REPO, 'tools', 'node', 'node.exe') : process.execPath, [path.join(REPO, 'tools', 'render-item.js'), `donating:item/${name}_full`, png, 'gui', 512, 512, '--pack', out + '.zip'])
const l = require('./lib.js'); const img = l.load(png); const bg = l.get(img, 10, 10)
let n = 0; let ink = 0; let deep = 0
for (let y = 0; y < img.h * 0.85; y++) for (let x = 0; x < img.w; x++) { const p = l.get(img, x, y); if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) < 6) continue; n++; const L = l.lum(p); if (L < 22) ink++; else if (L < 50) deep++ }
console.log(`icon: ink ${(100 * ink / n).toFixed(1)}%, deep ${(100 * deep / n).toFixed(1)}% of the gun's pixels (rule: ink + deep 30-55%)`)
const share = (ink + deep) / n
if (share < 0.3) issues.push(`ink + deep ${(100 * share).toFixed(0)}%: too little black (seams, recesses, slots)`)
console.log(issues.length ? 'ISSUES:\n  ' + issues.join('\n  ') : 'OK')
