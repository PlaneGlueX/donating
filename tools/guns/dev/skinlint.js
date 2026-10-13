// Skin-readiness lint (2026-10-12; the owner: "most of these guns will have additional skins in the future"): a gun skin
// (tools\guns\skins.js, pg.js paintSkin) can only recolor what comes from a palette key or the outline ink. This paints
// each gun twice more with every recolorable key (not KEEP, not the gun's own keep list) and the ink moved far away
// (+128 and +64 on each channel), and lists every texel that changed in neither pass: a color baked in that no skin can
// reach. Texels of KEEP tiles (the sights, the lens, the flash, the bore, the lights a gun keeps) are allowed, and so are
// texels under a decal painted with a KEEP key (a bore hole stamped into the frame, a sight mark, a lit window).
// node tools/guns/dev/skinlint.js [gun,...] [--kit pg.js] [--mod <gun>=<module.js>]   (exit code 1 when any gun fails)
const path = require('path'); const fs = require('fs'); const os = require('os')
const { build, GUNS, TOOLS } = require('./harness.js')
const { decodePng } = require(path.join(TOOLS, 'render-item.js'))
const args = process.argv.slice(2)
const opt = k => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v }
const kit = path.resolve(opt('--kit') || path.join(TOOLS, 'guns', 'pg.js'))
const modules = {}
for (let m; (m = opt('--mod'));) { const [g, f] = m.split('='); modules[g] = path.resolve(f) }
const want = args[0] ? args[0].split(',') : [...GUNS, 'minigun']
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'skinlint-'))
const { pg } = build({ kit, out, guns: want, skins: false, modules })
const KEEP = ['flash', 'flashCore', 'flash2', 'beam', 'lens', 'lensB', 'bore', 'scope', 'scopeT', 'scopeIn', 'glass', 'glassB', 'reticle', 'dot', 'post', 'sight', 'bead', 'beadHi']
const png = rel => decodePng(fs.readFileSync(path.join(out, 'assets', 'donating', 'textures', 'item', rel)))
const shift = (c, d) => c.map(v => (v + d) % 256)
let failed = 0
for (const g of want) {
  const name = `gun_${g}`
  const made = pg.made[name]
  if (!made) { console.log(`${g}: not built`); continue }
  const kept = new Set([...KEEP, ...(made.keep || [])])
  // a derived key ({ of: base }) of a kept key follows it: kept too
  const rootOf = k => { let v = made.pal[k]; let n = 0; while (v && !Array.isArray(v) && v.of && n++ < 8) { k = v.of; v = made.pal[k] } return k }
  for (const k of Object.keys(made.pal)) if (kept.has(rootOf(k))) kept.add(k)
  // the keys a skin may set: the palette's own colors (derived keys follow their base)
  const keys = Object.keys(made.pal).filter(k => !kept.has(k) && Array.isArray(made.pal[k]))
  const theme = d => ({ palette: Object.fromEntries(keys.map(k => [k, shift(made.pal[k], d)])), ink: shift([10, 10, 12], d) })
  pg.paintSkin(name, 'linta', theme(128))
  pg.paintSkin(name, 'lintb', theme(64))
  const base = png(`${name}_tex.png`); const A = png(`gunskin/${g}/linta.png`); const B = png(`gunskin/${g}/lintb.png`)
  const at = (im, x, y) => im.px.readUInt32BE((y * im.w + x) * 4)
  // a texel's tile (the tiles never overlap)
  const tileAt = new Map()
  for (const t of made.tiles) for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) tileAt.set(y * made.W + x, t)
  // the texels under decals in a KEEP key's color (decal rects are in tile texels, inclusive)
  const keptDecal = new Set()
  for (const t of made.tiles) for (const d of t.decals || []) {
    if (!d.rect) continue
    const [x0, y0, x1, y1] = d.rect
    // a stamp: only its characters drawn in a KEEP key; any other decal: all of it when its color is a KEEP key
    if (d.k === 'stamp') d.rows.forEach((row, yy) => [...row].forEach((ch, xx) => { if (d.keys && kept.has(d.keys[ch])) keptDecal.add((t.y + y0 + yy) * made.W + t.x + x0 + xx) }))
    else if (kept.has(d.c)) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) keptDecal.add((t.y + y) * made.W + t.x + x)
  }
  let painted = 0; let fixed = 0; const byKey = new Map()
  for (const [i, t] of tileAt) {
    const x = i % made.W; const y = Math.floor(i / made.W)
    const b = at(base, x, y)
    if ((b & 0xff) === 0) continue // transparent
    if (kept.has(t.key) || keptDecal.has(i)) continue
    painted++
    if (at(A, x, y) === b && at(B, x, y) === b) {
      fixed++
      const k = `${t.key} (${t.mat || t.pat || '?'}) ${t.dir}`
      byKey.set(k, (byKey.get(k) || 0) + 1)
    }
  }
  if (fixed) failed++
  console.log(`${g}: ${painted} recolorable texels, ${fixed} fixed${fixed ? ':' : ''}`)
  for (const [k, n] of [...byKey].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${n} in ${k}`)
}
fs.rmSync(out, { recursive: true, force: true })
process.exitCode = failed ? 1 : 0
