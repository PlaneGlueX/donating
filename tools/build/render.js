// Previews of a build written with tools/build/mcstruct.js, so a build can be judged before (and without) pasting it:
//   node tools/build/render.js <build.js> <outPrefix> [--views top,plan,iso] [--y <y>[,<y>...]] [--px <n>]
// <build.js> exports build() returning a Build. Views (PNG):
//   top   seen from straight above, each column's highest block, shaded by its height (a map)
//   plan  a floor plan at each --y: blocks at that level in color, the level below dimmed (walls, doors, rooms)
//   iso   isometric from the four corners (NE, SE, SW, NW): top faces lit, sides darker
// Block colors are the average of the block's texture in the 26.3 client jar (tools/render-item.js finds it); a name
// is matched to a texture by stripping shape suffixes (stairs, slab, wall, fence, pane...) and trying _top/_side.
const fs = require('fs')
const path = require('path')
const { canvas } = require('../png')
const { decodePng, lazyZip } = require('../render-item')
const { parseState } = require('./mcstruct')

const jarPath = () => {
  const dir = path.join(process.env.APPDATA || '', '.minecraft', 'versions')
  const vs = fs.existsSync(dir) ? fs.readdirSync(dir).filter(v => fs.existsSync(path.join(dir, v, `${v}.jar`))) : []
  const pick = vs.includes('26.3') ? '26.3' : vs.filter(v => /^[\d.]+$/.test(v)).sort().pop()
  return pick ? path.join(dir, pick, `${pick}.jar`) : null
}
let jar = null
const colorCache = new Map()
const texColor = name => {
  if (!jar) { const j = jarPath(); jar = j ? lazyZip(j) : { get: () => null } }
  const b = jar.get(`assets/minecraft/textures/block/${name}.png`)
  if (!b) return null
  const img = decodePng(b)
  let r = 0, g = 0, bl = 0, a = 0, n = 0
  const h = Math.min(img.h, img.w) // the first frame of an animated texture
  for (let i = 0; i < img.w * h; i++) {
    const al = img.px[i * 4 + 3]
    if (al < 16) continue
    r += img.px[i * 4]; g += img.px[i * 4 + 1]; bl += img.px[i * 4 + 2]; a += al; n++
  }
  return n ? [Math.round(r / n), Math.round(g / n), Math.round(bl / n), Math.round(a / n * Math.min(1, n / (img.w * h) + 0.2))] : null
}
const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'bamboo', 'crimson', 'warped', 'pale_oak']
const candidates = n => {
  const out = [n, `${n}_top`, `${n}_side`, `${n}_front`]
  let base = n.replace(/_(stairs|slab|wall|fence_gate|fence|pressure_plate|button|trapdoor|door|carpet|pane|sign|wall_sign|hanging_sign)$/, '')
  if (base !== n) {
    out.push(base, `${base}s`, `${base}_planks`, `${base}_block`, `${base}_top`)
    if (/brick$/.test(base)) out.push(`${base}s`)
    if (/_carpet$/.test(n)) out.push(`${base}_wool`)
    if (/_pane$/.test(n)) out.push(base)
    if (WOODS.includes(base)) out.push(`${base}_planks`)
  }
  if (/^(.*)_log$/.test(n)) out.push(n.replace(/_log$/, '_log_top'))
  if (n.endsWith('_wood')) out.push(n.replace(/_wood$/, '_log'))
  return out
}
const blockColor = state => {
  const name = parseState(state).name.replace('minecraft:', '')
  if (colorCache.has(name)) return colorCache.get(name)
  let c = null
  if (name === 'air' || name === 'cave_air' || name === 'void_air' || name === 'structure_void' || name === 'barrier' || name === 'light') c = null
  else if (name === 'water') c = [52, 92, 196, 200]
  else if (name === 'lava') c = [220, 100, 20, 255]
  else if (name === 'grass_block') c = [110, 160, 70, 255]
  else if (/leaves$/.test(name)) c = [70, 120, 50, 255]
  else {
    for (const t of candidates(name)) { c = texColor(t); if (c) break }
    if (!c) c = [255, 0, 255, 255]
  }
  colorCache.set(name, c)
  return c
}

const shade = (c, f) => [Math.min(255, Math.round(c[0] * f)), Math.min(255, Math.round(c[1] * f)), Math.min(255, Math.round(c[2] * f)), c[3]]
const blend = (img, x, y, c) => {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h || !c) return
  const i = (y * img.w + x) * 4
  const a = (c[3] === undefined ? 255 : c[3]) / 255
  for (let k = 0; k < 3; k++) img.px[i + k] = Math.round(img.px[i + k] * (1 - a) + c[k] * a)
  img.px[i + 3] = 255
}
const newImg = (w, h, bg = [30, 32, 38, 255]) => {
  const c = canvas(w, h)
  for (let i = 0; i < w * h; i++) c.px.set(bg, i * 4)
  return c
}
const cells = build => {
  const out = []
  for (const [k, s] of build.blocks) {
    const col = blockColor(s)
    if (!col) continue
    const [x, y, z] = k.split(',').map(Number)
    out.push({ x, y, z, col })
  }
  return out
}

function top (build, px) {
  const b = build.bounds()
  const W = b.x2 - b.x1 + 1, H = b.z2 - b.z1 + 1
  const img = newImg(W * px, H * px)
  const best = new Map()
  for (const c of cells(build)) {
    const k = `${c.x},${c.z}`
    const o = best.get(k)
    if (!o || c.y > o.y) best.set(k, c)
  }
  for (const c of best.values()) {
    const f = 0.7 + 0.6 * (c.y - b.y1) / Math.max(1, b.y2 - b.y1)
    const col = shade(c.col, f)
    for (let i = 0; i < px; i++) for (let j = 0; j < px; j++) blend(img, (c.x - b.x1) * px + i, (c.z - b.z1) * px + j, [...col.slice(0, 3), 255])
  }
  return img
}

function plan (build, y, px) {
  const b = build.bounds()
  const W = b.x2 - b.x1 + 1, H = b.z2 - b.z1 + 1
  const img = newImg(W * px, H * px, [24, 26, 30, 255])
  for (const c of cells(build)) {
    let col = null
    if (c.y === y) col = [...c.col.slice(0, 3), Math.max(120, c.col[3])]
    else if (c.y === y - 1) col = [...shade(c.col, 0.35).slice(0, 3), 255]
    if (!col) continue
    for (let i = 0; i < px; i++) for (let j = 0; j < px; j++) blend(img, (c.x - b.x1) * px + i, (c.z - b.z1) * px + j, col)
  }
  // grid lines every 8 blocks, to count sizes
  for (let x = 0; x < W; x += 8) for (let yy = 0; yy < img.h; yy += 2) blend(img, x * px, yy, [255, 255, 255, 40])
  for (let z = 0; z < H; z += 8) for (let xx = 0; xx < img.w; xx += 2) blend(img, xx, z * px, [255, 255, 255, 40])
  return img
}

// Isometric: a block at (x, y, z) projects to screen (u, v) = ((x - z) * s, (x + z) * s / 2 - y * s); drawn far to near.
function iso (build, dir, s) {
  const b = build.bounds()
  const rot = ({ x, z }) => {
    const X = x - b.x1, Z = z - b.z1, Wx = b.x2 - b.x1, Wz = b.z2 - b.z1
    if (dir === 'SE') return [X, Z]
    if (dir === 'SW') return [Z, Wx - X]
    if (dir === 'NW') return [Wx - X, Wz - Z]
    return [Wz - Z, X] // NE
  }
  const list = cells(build).map(c => { const [rx, rz] = rot(c); return { ...c, rx, rz, ry: c.y - b.y1 } })
  const set = new Set(list.map(c => `${c.rx},${c.ry},${c.rz}`))
  const maxR = Math.max(b.x2 - b.x1, b.z2 - b.z1) + 1
  const H = b.y2 - b.y1 + 1
  const w = (2 * maxR + 2) * s, h = (maxR + 2) * s + H * s + s
  const img = newImg(w, h)
  const ox = (maxR + 1) * s, oy = H * s + s / 2
  list.sort((a, c) => (a.rx + a.rz) - (c.rx + c.rz) || a.ry - c.ry)
  for (const c of list) {
    const u = ox + (c.rx - c.rz) * s, v = oy + (c.rx + c.rz) * s / 2 - c.ry * s
    const topOpen = !set.has(`${c.rx},${c.ry + 1},${c.rz}`)
    const leftOpen = !set.has(`${c.rx},${c.ry},${c.rz + 1}`)
    const rightOpen = !set.has(`${c.rx + 1},${c.ry},${c.rz}`)
    const tc = shade(c.col, 1.0), lc = shade(c.col, 0.75), rc = shade(c.col, 0.58)
    for (let dy = 0; dy < s; dy++) for (let dx = -s; dx < s; dx++) {
      // top diamond
      if (topOpen && Math.abs(dx) / s + Math.abs(dy - s / 2) / (s / 2) <= 1) blend(img, Math.round(u + dx), Math.round(v + dy - s / 2), tc)
    }
    for (let dx = 0; dx < s; dx++) for (let dy = 0; dy < s; dy++) {
      if (leftOpen) blend(img, Math.round(u - s + dx), Math.round(v + dx / 2 + dy), lc)
      if (rightOpen) blend(img, Math.round(u + dx), Math.round(v + s / 2 - dx / 2 + dy), rc)
    }
  }
  return img
}

async function main () {
  const args = process.argv.slice(2)
  const opt = (k, d) => { const i = args.indexOf(`--${k}`); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v }
  const views = opt('views', 'top,plan,iso').split(',')
  const ys = opt('y', null)
  const px = Number(opt('px', 4))
  const [file, out] = args
  if (!file || !out) { console.log('usage: render.js <build.js> <outPrefix> [--views top,plan,iso] [--y y1,y2] [--px n]'); process.exit(1) }
  const mod = require(path.resolve(file))
  const build = typeof mod === 'function' ? mod() : mod.build()
  const b = build.bounds()
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
  const save = (suffix, img) => { const f = `${out}-${suffix}.png`; fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
  console.log(`${build.blocks.size} blocks, box ${b.x1},${b.y1},${b.z1} to ${b.x2},${b.y2},${b.z2} (${b.x2 - b.x1 + 1} x ${b.y2 - b.y1 + 1} x ${b.z2 - b.z1 + 1})`)
  if (views.includes('top')) save('top', top(build, px))
  if (views.includes('plan')) for (const y of (ys ? ys.split(',').map(Number) : [b.y1 + 1])) save(`plan-y${y}`, plan(build, y, px))
  if (views.includes('iso')) for (const d of ['NE', 'SE', 'SW', 'NW']) save(`iso-${d}`, iso(build, d, Math.max(2, Math.round(px / 2))))
  const missing = [...colorCache].filter(([, c]) => c && c[0] === 255 && c[1] === 0 && c[2] === 255).map(([n]) => n)
  if (missing.length) console.log(`no texture found (drawn magenta): ${missing.join(', ')}`)
}
if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
module.exports = { blockColor, top, plan, iso }
