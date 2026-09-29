// Car wraps (skins) for MTVehicles cars, drawn and wired up here:
//   1. Per car geometry (one voxel model per MTVehicles car family), finds the PAINT by comparing 2-5 plain
//      colors of it: a voxel face that has each color's body color in most of them is paint; tires, glass,
//      lights, chrome and seats keep their colors. Decals (white racing stripes) are painted over where they
//      touch the paint; wheel rims painted like the body go back to trim. Voxel boxes whose faces mix paint
//      and trim are split, so every face is all paint or all trim, and faces inside the body are left out.
//   2. Writes a wrappable copy of the geometry, pack\assets\minecraft\models\custom\wraps\<geom>_base.json:
//      paint faces get the texture #wrap with new uvs (a planar projection over the paint's bounding box:
//      the sides, the top, the front and the back each use their own region of the wrap texture), trim
//      keeps a plain color's atlas. <geom>_glow.json is the same with light_emission on the paint.
//   3. Draws the wraps (tools\car-wraps.json) as 128x128 textures in textures\custom\wraps\ (animated ones
//      stack their frames, with a .png.mcmeta). One texture per wrap, shared by every car: the block atlas
//      only grows by 128x128 per wrap (an animated texture takes one frame's room in it).
//   4. One model per geometry and wrap (<geom>_<wrap>.json: the base + the wrap texture), a new variant
//      per wrap in server\plugins\MTVehicles\vehicles.yml (its own itemDamage and uuid: MTVehicles finds
//      a car's model by its look), tools\car-wraps.generated.json for build-pack.js (the diamond hoe
//      dispatch entries) and server\plugins\Skript\scripts\carwraps.sk ({-carwrap::<car>::<wrap>}).
// Also adds the new families (SUV Cabrio, Racecar, Motor) to vehicles.yml with their plain colors.
// Never change an itemDamage or uuid once cars of it exist: they are fixed by the variant's name here
// (the damage stays where it is once it's in vehicles.yml; the uuid is a hash of the name).
//
// Usage: tools\node\node.exe tools\make-car-wraps.js   (then tools\build-pack.js)
//        tools\node\node.exe tools\render-car.js <model id> <out.png>   (a preview, e.g. custom/wraps/sedan_camo)
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const crypto = require('crypto')
const { encode } = require('./png')

const REPO = path.join(__dirname, '..')
const PACK = path.join(REPO, 'pack', 'assets', 'minecraft')
const MTV_ZIP = path.join(REPO, 'extras', 'packs', 'MTVehicles_Pack_v0.2.3_1.21.4.zip')
const VEHICLES = path.join(REPO, 'server', 'plugins', 'MTVehicles', 'vehicles.yml')
const SKRIPT = path.join(REPO, 'server', 'plugins', 'Skript', 'scripts', 'carwraps.sk')
const WRAPS_JSON = path.join(__dirname, 'car-wraps.json')
const GENERATED = path.join(__dirname, 'car-wraps.generated.json')

// ---------- Reading the packs ----------
// A minimal zip reader (the same as build-pack.js's).
const readZip = file => {
  const buf = fs.readFileSync(file)
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error(`not a zip: ${file}`)
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const files = new Map()
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`bad central directory in ${file}`)
    const method = buf.readUInt16LE(p + 10)
    const size = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen).split('\\').join('/')
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) continue
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const raw = buf.subarray(start, start + size)
    files.set(name, method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw))
  }
  return files
}

// A minimal PNG decoder (8-bit RGB or RGBA, not interlaced; from sign-skins.js): the pixels as RGBA.
const decodePng = buf => {
  let p = 8, w, h, ct
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.slice(p + 8, p + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9] } else if (type === 'IDAT') idat.push(data)
    p += 12 + len
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0
  if (!bpp) return null
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(w * h * 4)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = Buffer.from(raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1)))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      line[x] = v & 255
    }
    for (let x = 0; x < w; x++) { for (let k = 0; k < 3; k++) out[(y * w + x) * 4 + k] = line[x * bpp + k]; out[(y * w + x) * 4 + 3] = bpp === 4 ? line[x * 4 + 3] : 255 }
    prev = line
  }
  return { w, h, px: out }
}
const parseJson = b => JSON.parse(b.toString('utf8').replace(/^\uFEFF/, ''))

// Models and textures by id ("custom/cars/sedan_red"): our pack\ first, then MTVehicles' pack.
const openAssets = () => {
  const mtv = fs.existsSync(MTV_ZIP) ? readZip(MTV_ZIP) : null
  if (!mtv) throw new Error(`${MTV_ZIP} is missing (run tools\\fetch.ps1)`)
  const strip = id => id.replace(/^minecraft:/, '')
  const file = rel => {
    const f = path.join(PACK, ...rel.split('/'))
    return fs.existsSync(f) ? fs.readFileSync(f) : mtv.get(`assets/minecraft/${rel}`)
  }
  const cache = new Map()
  return {
    mtv,
    model: id => { const b = file(`models/${strip(id)}.json`); return b ? parseJson(b) : null },
    texture: id => {
      id = strip(id)
      if (!cache.has(id)) { const b = file(`textures/${id}.png`); cache.set(id, b ? decodePng(b) : null) }
      return cache.get(id)
    }
  }
}
// A model with its parents: the elements of the nearest one that has them, the textures merged (a child
// wins), and tex('#voxels_atlas') follows #references to a texture id.
const resolveModel = (A, id) => {
  const chain = []
  for (let cur = id; cur;) {
    const j = A.model(cur)
    if (!j) throw new Error(`missing model ${cur}`)
    chain.push(j)
    cur = j.parent && !/^(minecraft:)?(item|block)\//.test(j.parent) ? j.parent : null
  }
  const textures = {}
  for (const j of [...chain].reverse()) Object.assign(textures, j.textures || {})
  const elements = (chain.find(j => j.elements) || {}).elements || []
  const display = (chain.find(j => j.display) || {}).display
  const tex = ref => {
    let r = ref
    for (let i = 0; i < 10 && r && r.startsWith('#'); i++) r = textures[r.slice(1)]
    return r && !r.startsWith('#') ? r : null
  }
  return { elements, textures, display, tex }
}

// A face's four corners, in Minecraft's order (FaceInfo), and the uv each corner gets (BlockFaceUV with
// its rotation): corner i takes u from uv[0] or uv[2] and v from uv[1] or uv[3].
const CORNERS = {
  down: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
  up: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
  north: [[1, 1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]],
  south: [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]],
  west: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]],
  east: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]]
}
const corners = (from, to, dir) => CORNERS[dir].map(c => c.map((k, i) => k ? to[i] : from[i]))
const cornerUv = (uv, rotation, i) => {
  const j = (i + (rotation || 0) / 90) % 4
  return [j === 0 || j === 1 ? uv[0] : uv[2], j === 0 || j === 3 ? uv[1] : uv[3]]
}

const axisOf = (p, q) => [0, 1, 2].find(k => Math.abs(p[k] - q[k]) > 1e-9)
const r5 = v => Math.round(v * 1e5) / 1e5

// ---------- 1. Paint: which atlas pixels are the body's paint ----------
// The cars are voxel art with flat colors: each plain color has one body color (the color most of the pixels that
// differ between every two plain colors have). Per atlas pixel the model uses:
//   2 = body paint: it has its car's body color in most of the compared colors,
//   1 = a decal: one of the geometry's decal colors in the kept atlas (car-wraps.json "decals": white racing
//       stripes), with one same color in most of the compared colors; it only counts where it touches the body's
//       paint on the same surface (paintCells). Seats can look like that too (tan in most colors, black in the black
//       car), which is why decals go by their color,
//   0 = trim: everything else (tires, glass, lights, seats, chrome),
//  -1 = see-through in one of them (trim; a cabrio's missing roof).
const PAINT_DIFF = 60 // |dR| + |dG| + |dB| over this is another color, not noise
const SAME = 30 // and up to this the same color
const dist = (t, i, c) => Math.abs(t.px[i] - c[0]) + Math.abs(t.px[i + 1] - c[1]) + Math.abs(t.px[i + 2] - c[2])
const paintClasses = (A, g, used) => {
  const T = g.compare.map(v => {
    const t = A.texture(`custom/cars/${v}`)
    if (!t) throw new Error(`${g.id}: missing texture custom/cars/${v}`)
    return t
  })
  const W = T[0].w
  if (T.some(t => t.w !== W)) throw new Error(`${g.id}: the compared atlases differ in size`)
  const N = T.length
  const rgb = (t, i) => [t.px[i], t.px[i + 1], t.px[i + 2]]
  // Each plain color's body color.
  const counts = T.map(() => new Map())
  for (let p = 0; p < W * W; p++) {
    const i = p * 4
    if (!used[p] || T.some(t => t.px[i + 3] < 128)) continue
    let all = true
    for (let a = 0; a < N && all; a++) for (let b = a + 1; b < N && all; b++) if (dist(T[a], i, rgb(T[b], i)) <= PAINT_DIFF) all = false
    if (all) T.forEach((t, v) => { const k = `${rgb(t, i)}`; counts[v].set(k, (counts[v].get(k) || 0) + 1) })
  }
  const body = counts.map((c, v) => {
    if (!c.size) throw new Error(`${g.id}: ${g.compare[v]} has no pixel of its own color`)
    return [...c].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number)
  })
  const atlas = A.texture(`custom/cars/${g.atlas}`)
  if (!atlas || atlas.w !== W) throw new Error(`${g.id}: atlas custom/cars/${g.atlas} is missing or another size than the compared colors`)
  const decals = g.decals || []
  const cls = new Int8Array(W * W)
  for (let p = 0; p < W * W; p++) {
    const i = p * 4
    if (T.some(t => t.px[i + 3] < 128)) { cls[p] = -1; continue }
    const onBody = T.filter((t, v) => dist(t, i, body[v]) <= SAME).length
    if (onBody * 2 > N) { cls[p] = 2; continue }
    if (!decals.some(c => dist(atlas, i, c) <= SAME)) continue
    // A decal: one same color (not the body's) in at least two of the colors and half of them.
    let most = 0
    for (const t of T) most = Math.max(most, T.filter(u => dist(u, i, rgb(t, i)) <= SAME).length)
    cls[p] = most >= 2 && most * 2 >= N ? 1 : 0
  }
  return { W, cls, body, atlas }
}
// The atlas pixels a model's faces use (with texture #<atlasVar>).
const usedPixels = (m, atlasVar, W) => {
  const used = new Uint8Array(W * W)
  for (const e of m.elements) {
    for (const f of Object.values(e.faces || {})) {
      if (f.texture !== `#${atlasVar}`) continue
      const s = W / 16
      const x0 = Math.floor(Math.min(f.uv[0], f.uv[2]) * s + 1e-6)
      const x1 = Math.max(x0 + 1, Math.ceil(Math.max(f.uv[0], f.uv[2]) * s - 1e-6))
      const y0 = Math.floor(Math.min(f.uv[1], f.uv[3]) * s + 1e-6)
      const y1 = Math.max(y0 + 1, Math.ceil(Math.max(f.uv[1], f.uv[3]) * s - 1e-6))
      for (let y = y0; y < Math.min(W, y1); y++) for (let x = x0; x < Math.min(W, x1); x++) used[y * W + x] = 1
    }
  }
  return used
}

// ---------- 2. The wrappable geometry ----------
// A face on its element's voxel grid (one atlas pixel per voxel face): s runs from corner 0 to 3, t from corner 0 to 1.
// cls[vs * nt + vt] = the pixel's class (paintClasses) at voxel vs along aS and vt along aT; paintCells fills in mask
// (1 = paint).
const faceGrid = (e, dir, f, atlasVar, P) => {
  const c = corners(e.from, e.to, dir)
  const uv = [0, 1, 2, 3].map(i => cornerUv(f.uv, f.rotation, i))
  const aS = axisOf(c[0], c[3])
  const aT = axisOf(c[0], c[1])
  const grid = { c, uv, aS, aT, f, dir }
  if (f.texture !== atlasVar || aS === undefined || aT === undefined) { grid.uniform = 0; return grid }
  const span = (q, r) => Math.abs(q[0] - r[0]) + Math.abs(q[1] - r[1])
  const ns = Math.max(1, Math.round(span(uv[3], uv[0]) * P.W / 16))
  const nt = Math.max(1, Math.round(span(uv[1], uv[0]) * P.W / 16))
  const cls = new Int8Array(ns * nt)
  const sUp = c[3][aS] > c[0][aS]
  const tUp = c[1][aT] > c[0][aT]
  let opaque = true // in the kept atlas
  for (let is = 0; is < ns; is++) {
    for (let it = 0; it < nt; it++) {
      const u = uv[0][0] + (is + 0.5) / ns * (uv[3][0] - uv[0][0]) + (it + 0.5) / nt * (uv[1][0] - uv[0][0])
      const v = uv[0][1] + (is + 0.5) / ns * (uv[3][1] - uv[0][1]) + (it + 0.5) / nt * (uv[1][1] - uv[0][1])
      const px = Math.min(P.W - 1, Math.max(0, Math.floor(u * P.W / 16)))
      const py = Math.min(P.W - 1, Math.max(0, Math.floor(v * P.W / 16)))
      cls[(sUp ? is : ns - 1 - is) * nt + (tUp ? it : nt - 1 - it)] = P.cls[py * P.W + px]
      if (P.atlas.px[(py * P.W + px) * 4 + 3] < 128) opaque = false
    }
  }
  Object.assign(grid, { ns, nt, cls, opaque, mask: new Uint8Array(ns * nt) })
  return grid
}

// Which voxel faces are paint, over the whole model (its voxels are all one size): the body's paint (class 2), then
// the decals (class 1) that touch it on the same surface. Last, the wheels: small pieces of paint low on the car that
// are about as long as they are tall (rims in the body's color) go back to trim.
const NORMAL_AXIS = { down: 1, up: 1, north: 2, south: 2, west: 0, east: 0 }
const paintCells = (elements, gridsOf) => {
  // The voxel size (the most common one) and the grid's origin.
  const sizes = new Map()
  for (const grids of gridsOf) {
    for (const G of Object.values(grids)) {
      if (!G.cls) continue
      const k = Math.abs((G.c[3][G.aS] - G.c[0][G.aS]) / G.ns).toFixed(4)
      sizes.set(k, (sizes.get(k) || 0) + 1)
    }
  }
  const size = +[...sizes].sort((a, b) => b[1] - a[1])[0][0]
  const origin = [0, 1, 2].map(k => Math.min(...elements.map(e => e.from[k])))
  const idx = (v, k) => Math.round((v - origin[k]) / size)
  const cells = new Map() // "dir:x,y,z" -> { G, i, v, cls, paint }
  gridsOf.forEach((grids, n) => {
    const e = elements[n]
    const lo = [0, 1, 2].map(k => idx(e.from[k], k))
    for (const G of Object.values(grids)) {
      if (!G.cls) continue
      const na = NORMAL_AXIS[G.dir]
      const layer = ['up', 'south', 'east'].includes(G.dir) ? idx(e.to[na], na) - 1 : idx(e.from[na], na)
      for (let vs = 0; vs < G.ns; vs++) {
        for (let vt = 0; vt < G.nt; vt++) {
          const v = [0, 0, 0]
          v[na] = layer
          v[G.aS] = lo[G.aS] + vs
          v[G.aT] = lo[G.aT] + vt
          const i = vs * G.nt + vt
          cells.set(`${G.dir}:${v}`, { G, i, v, cls: G.cls[i], paint: G.cls[i] === 2 })
        }
      }
    }
  })
  // The car's top surface (seen from above): the highest face up in each column that isn't see-through (a cabrio's
  // roof).
  const topY = new Map()
  for (const c of cells.values()) {
    if (c.G.dir !== 'up' || c.cls < 0) continue
    const k = `${c.v[0]},${c.v[2]}`
    if (!topY.has(k) || topY.get(k) < c.v[1]) topY.set(k, c.v[1])
  }
  const onTop = c => c.G.dir === 'up' && topY.get(`${c.v[0]},${c.v[2]}`) === c.v[1]
  // Flood from the paint into the decals next to it on the same surface: faces the same way side by side in their
  // plane, also over a one voxel line of trim (stripes edged by a black line), and on the top surface one step up
  // or down (a hood or a trunk that slopes in steps; only there: stepping around elsewhere reaches rims and the
  // underbody).
  const queue = [...cells.values()].filter(c => c.paint)
  while (queue.length) {
    const c = queue.pop()
    const { aS, aT, dir } = c.G
    const na = NORMAL_AXIS[dir]
    const top = onTop(c)
    for (const [ax, d] of [[aS, 1], [aS, -1], [aT, 1], [aT, -1], [aS, 2], [aS, -2], [aT, 2], [aT, -2]]) {
      for (const step of top ? [0, 1, -1] : [0]) {
        const v = c.v.slice()
        v[ax] += d
        v[na] += step
        const nb = cells.get(`${dir}:${v}`)
        if (!nb || nb.paint || nb.cls !== 1 || (step && !onTop(nb))) continue
        nb.paint = true
        queue.push(nb)
      }
    }
  }
  // Islands: paint on voxels that touch (26 neighbors) is one piece.
  const byVoxel = new Map()
  for (const c of cells.values()) {
    if (!c.paint) continue
    const k = `${c.v}`
    if (!byVoxel.has(k)) byVoxel.set(k, [])
    byVoxel.get(k).push(c)
  }
  const parent = new Map([...byVoxel.keys()].map(k => [k, k]))
  const find = k => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k) } return k }
  for (const k of byVoxel.keys()) {
    const [x, y, z] = k.split(',').map(Number)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const o = `${x + dx},${y + dy},${z + dz}`
          if (!parent.has(o)) continue
          const ra = find(k)
          const rb = find(o)
          if (ra !== rb) parent.set(ra, rb)
        }
      }
    }
  }
  const pieces = new Map()
  let top = -Infinity
  let bottom = Infinity
  for (const [k, list] of byVoxel) {
    const r = find(k)
    if (!pieces.has(r)) pieces.set(r, { cells: [], top: -Infinity, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] })
    const p = pieces.get(r)
    p.cells.push(...list)
    const v = k.split(',').map(Number)
    for (let a = 0; a < 3; a++) { p.lo[a] = Math.min(p.lo[a], v[a]); p.hi[a] = Math.max(p.hi[a], v[a]) }
    p.top = Math.max(p.top, v[1])
    top = Math.max(top, v[1])
    bottom = Math.min(bottom, v[1])
  }
  // A wheel's rim: a small piece low on the car, about as long as it is tall (a strip along the sills stays paint).
  const total = [...pieces.values()].reduce((a, p) => a + p.cells.length, 0)
  let dropped = 0
  for (const p of pieces.values()) {
    const long = p.hi[0] - p.lo[0] + 1
    const tall = p.hi[1] - p.lo[1] + 1
    if (p.cells.length < total * 0.08 && p.top - bottom < (top - bottom) * 0.45 && long <= tall * 1.6) {
      for (const c of p.cells) c.paint = false
      dropped += p.cells.length
    }
  }
  for (const c of cells.values()) c.G.mask[c.i] = c.paint ? 1 : 0
  return { size, origin, pieces: pieces.size, dropped, total, pieceList: [...pieces.values()].map(p => ({ n: p.cells.length, lo: p.lo, hi: p.hi })) }
}
// Whether a box (voxel index ranges lo..hi) of an element with n voxels per axis reaches the element's side dir.
const touches = (dir, lo, hi, n) => ({ down: lo[1] === 0, up: hi[1] === n[1], north: lo[2] === 0, south: hi[2] === n[2], west: lo[0] === 0, east: hi[0] === n[0] })[dir]

// Splits an element into boxes whose faces are each all paint or all trim: cuts where the paint changes, the cut
// the most rows agree on first. Faces inside the element (between two boxes) are left out, as they were.
const splitElement = (e, grids) => {
  const n = [1, 1, 1]
  for (const g of Object.values(grids)) if (g.mask) { n[g.aS] = g.ns; n[g.aT] = g.nt }
  for (const g of Object.values(grids)) {
    if (g.mask && (n[g.aS] !== g.ns || n[g.aT] !== g.nt)) throw new Error(`an element's faces disagree on its voxel grid (${JSON.stringify(e.from)})`)
  }
  const out = []
  const rec = (lo, hi) => {
    const faces = []
    const votes = new Map()
    let mixed = false
    for (const [dir, g] of Object.entries(grids)) {
      if (!touches(dir, lo, hi, n)) continue
      if (!g.mask) { faces.push([dir, g.uniform]); continue }
      let first = -1
      let same = true
      const nt = n[g.aT]
      for (let vs = lo[g.aS]; vs < hi[g.aS]; vs++) {
        for (let vt = lo[g.aT]; vt < hi[g.aT]; vt++) {
          const m = g.mask[vs * nt + vt]
          if (first < 0) first = m
          else if (m !== first) same = false
          if (vs > lo[g.aS] && g.mask[(vs - 1) * nt + vt] !== m) votes.set(g.aS * 1000 + vs, (votes.get(g.aS * 1000 + vs) || 0) + 1)
          if (vt > lo[g.aT] && g.mask[vs * nt + vt - 1] !== m) votes.set(g.aT * 1000 + vt, (votes.get(g.aT * 1000 + vt) || 0) + 1)
        }
      }
      if (same) faces.push([dir, first])
      else mixed = true
    }
    if (!mixed) { out.push({ lo, hi, faces, n }); return }
    let best = -1
    let bestVotes = 0
    for (const [k, v] of votes) if (v > bestVotes) { best = k; bestVotes = v }
    const axis = Math.floor(best / 1000)
    const at = best % 1000
    const hi1 = hi.slice()
    hi1[axis] = at
    const lo2 = lo.slice()
    lo2[axis] = at
    rec(lo, hi1)
    rec(lo2, hi)
  }
  rec([0, 0, 0], n.slice())
  return out
}

// Where each part of the car lands in a wrap texture (uv units, 16 = the whole texture): the sides get the top half,
// the top (hood, roof, trunk) the bottom left, the front and the back the bottom right. M keeps a half texel off the
// edges, so mipmaps don't bleed one part into the next.
const REGION = { side: [0, 0, 16, 8], top: [0, 8, 8, 16], front: [8, 8, 16, 12], back: [8, 12, 16, 16] }
const M = 1 / 16
// A point on the car -> the part it's on and where in that part (a, b in 0..1). L runs from the nose (0) to the tail
// (1), H from the bottom (0) to the top (1), D across from the driver's left (0) to right (1). The front and back are
// seen from outside (not mirrored), the top as the driver sees the hood.
const partOf = (g, dir) => {
  const nose = g.front === '+x' ? 'east' : 'west'
  const tail = g.front === '+x' ? 'west' : 'east'
  return dir === nose ? 'front' : dir === tail ? 'back' : dir === 'up' || dir === 'down' ? 'top' : 'side'
}
const project = (g, box, P, dir) => {
  const clamp = v => Math.min(1, Math.max(0, v))
  const L = clamp(g.front === '+x' ? (box.hi[0] - P[0]) / (box.hi[0] - box.lo[0]) : (P[0] - box.lo[0]) / (box.hi[0] - box.lo[0]))
  const H = clamp((P[1] - box.lo[1]) / (box.hi[1] - box.lo[1]))
  const Wd = clamp((P[2] - box.lo[2]) / (box.hi[2] - box.lo[2]))
  const D = g.front === '+x' ? Wd : 1 - Wd // facing east, the driver's left is north (-z)
  const part = partOf(g, dir)
  const [a, b] = part === 'side' ? [L, 1 - H] : part === 'top' ? [D, L] : part === 'front' ? [1 - D, 1 - H] : [D, 1 - H]
  const R = REGION[part]
  return [R[0] + M + a * (R[2] - R[0] - 2 * M), R[1] + M + b * (R[3] - R[1] - 2 * M)]
}
// The uv array (and rotation) that gives each corner of a face the uv D[i] wants: corner i gets (uv[0] | uv[2],
// uv[1] | uv[3]) by j = (i + rotation / 90) % 4 (cornerUv), so the corner with j = 0 sets uv[0..1], j = 2 sets uv[2..3].
const uvFor = (D, rotations = [0, 90, 180, 270]) => {
  const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6
  for (const rot of rotations) {
    const r = rot / 90
    const [i0, i1, i2, i3] = [0, 1, 2, 3].map(j => (j - r + 4) % 4)
    const uv = [D[i0][0], D[i0][1], D[i2][0], D[i2][1]]
    if (near(D[i1], [uv[0], uv[3]]) && near(D[i3], [uv[2], uv[1]])) return { uv: uv.map(r5), rotation: rot }
  }
  return null
}

// Builds <geom>_base (and the same with light_emission on the paint, for glowing wraps) from the geometry model.
const RENAME = { 'blocks/glass_gray': 'block/gray_stained_glass' } // pre-1.13 paths, as build-pack.js fixes them
const buildBase = (A, g) => {
  const m = resolveModel(A, g.model)
  const head = ((m.display || {}).head || {}).rotation || [0, 0, 0]
  if ((head[1] > 0 ? '+x' : '-x') !== g.front) console.warn(`WARNING: ${g.id}: display.head turns the model by ${head[1]}, so the front looks like ${head[1] > 0 ? '+x' : '-x'}, not ${g.front}`)
  const atlasVar = Object.keys(m.textures).find(k => /^custom\/cars\//.test(m.tex(`#${k}`) || '') && k !== 'particle')
  if (!atlasVar) throw new Error(`${g.id}: no car atlas in ${g.model}`)
  const atlas = A.texture(`custom/cars/${g.atlas}`)
  if (!atlas) throw new Error(`${g.id}: atlas custom/cars/${g.atlas} is missing`)
  const P = paintClasses(A, g, usedPixels(m, atlasVar, atlas.w))
  const boxes = []
  let paintFaces = 0
  let trimFaces = 0
  const gridsOf = m.elements.map(e => {
    if (e.rotation) throw new Error(`${g.id}: rotated elements aren't supported`)
    const grids = {}
    for (const [dir, f] of Object.entries(e.faces || {})) {
      if (!f.uv) throw new Error(`${g.id}: a face without uv`)
      grids[dir] = faceGrid(e, dir, f, `#${atlasVar}`, P)
    }
    return grids
  })
  const cellStats = paintCells(m.elements, gridsOf)
  // Faces nobody can see: every voxel of the face has a solid voxel right in front of it. A voxel is solid when
  // its element has all six faces, each of the car's atlas and opaque there (no glass, no see-through pixel): the
  // outline of the solid voxels is always drawn, so what's inside it can go. MTVehicles' models keep such faces;
  // leaving them out makes a wrapped car much lighter (the client bakes a car's model once per wrap).
  const { size, origin } = cellStats
  const onGrid = (v, k) => { const q = (v - origin[k]) / size; return Math.abs(q - Math.round(q)) < 0.01 ? Math.round(q) : null }
  const voxels = (from, to) => {
    const lo = [0, 1, 2].map(k => onGrid(from[k], k))
    const hi = [0, 1, 2].map(k => onGrid(to[k], k))
    return lo.includes(null) || hi.includes(null) ? null : { lo, hi }
  }
  const solid = new Set()
  m.elements.forEach((e, n) => {
    const grids = Object.values(gridsOf[n])
    const r = voxels(e.from, e.to)
    if (!r || grids.length < 6 || !grids.every(G => G.cls && G.opaque)) return
    for (let x = r.lo[0]; x < r.hi[0]; x++) for (let y = r.lo[1]; y < r.hi[1]; y++) for (let z = r.lo[2]; z < r.hi[2]; z++) solid.add(`${x},${y},${z}`)
  })
  const hidden = (from, to, dir) => {
    const r = voxels(from, to)
    if (!r) return false
    const na = NORMAL_AXIS[dir]
    const range = [0, 1, 2].map(k => [r.lo[k], r.hi[k]])
    if (range.some(([a, b], k) => k !== na && b <= a)) return false
    range[na] = ['up', 'south', 'east'].includes(dir) ? [r.hi[na], r.hi[na] + 1] : [r.lo[na] - 1, r.lo[na]]
    for (let x = range[0][0]; x < range[0][1]; x++) {
      for (let y = range[1][0]; y < range[1][1]; y++) {
        for (let z = range[2][0]; z < range[2][1]; z++) if (!solid.has(`${x},${y},${z}`)) return false
      }
    }
    return true
  }
  let culled = 0
  m.elements.forEach((e, n) => {
    const grids = gridsOf[n]
    for (const b of splitElement(e, grids)) {
      const from = [0, 1, 2].map(k => e.from[k] + (e.to[k] - e.from[k]) * b.lo[k] / b.n[k])
      const to = [0, 1, 2].map(k => e.from[k] + (e.to[k] - e.from[k]) * b.hi[k] / b.n[k])
      const faces = b.faces.filter(([dir]) => !hidden(from, to, dir))
      culled += b.faces.length - faces.length
      boxes.push({ from, to, faces: faces.map(([dir, paint]) => ({ dir, paint, grid: grids[dir] })) })
    }
  })
  // The paint's bounding box: the projection spreads each part over its whole region.
  const box = { lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }
  for (const b of boxes) {
    for (const f of b.faces) {
      if (!f.paint) continue
      for (const p of corners(b.from, b.to, f.dir)) for (let k = 0; k < 3; k++) { box.lo[k] = Math.min(box.lo[k], p[k]); box.hi[k] = Math.max(box.hi[k], p[k]) }
    }
  }
  const elements = []
  for (const b of boxes) {
    const faces = {}
    let painted = false
    for (const f of b.faces) {
      const c = corners(b.from, b.to, f.dir)
      if (f.paint) {
        const t = uvFor(c.map(p => project(g, box, p, f.dir)))
        if (!t) throw new Error(`${g.id}: no uv rotation fits a ${f.dir} face`)
        faces[f.dir] = t.rotation ? { uv: t.uv, rotation: t.rotation, texture: '#wrap' } : { uv: t.uv, texture: '#wrap' }
        painted = true
        paintFaces++
      } else {
        // The same part of the atlas as before: the old face's corners -> uv map, at the new face's corners.
        const G = f.grid
        const at = p => {
          const s = G.aS === undefined ? 0 : (p[G.aS] - G.c[0][G.aS]) / (G.c[3][G.aS] - G.c[0][G.aS])
          const t = G.aT === undefined ? 0 : (p[G.aT] - G.c[0][G.aT]) / (G.c[1][G.aT] - G.c[0][G.aT])
          return [0, 1].map(k => G.uv[0][k] + s * (G.uv[3][k] - G.uv[0][k]) + t * (G.uv[1][k] - G.uv[0][k]))
        }
        const t = uvFor(c.map(at), [G.f.rotation || 0])
        if (!t) throw new Error(`${g.id}: a trim face lost its uv`)
        const face = { ...G.f, uv: t.uv }
        delete face.__comment
        faces[f.dir] = face
        trimFaces++
      }
    }
    if (!Object.keys(faces).length) continue
    elements.push({ from: b.from.map(r5), to: b.to.map(r5), faces, painted })
  }
  const textures = { particle: `#${atlasVar}` }
  for (const [k, v] of Object.entries(m.textures)) {
    if (k === 'particle' || typeof v !== 'string' || v.startsWith('#')) continue
    const t = v.replace(/^minecraft:/, '')
    if (k === atlasVar) textures[k] = `custom/cars/${g.atlas}`
    else if (RENAME[t]) textures[k] = RENAME[t]
    else if (!t.startsWith('items/')) textures[k] = t // items/: unused placeholders
  }
  textures.wrap = 'custom/wraps/matte'
  const credit = `Wrappable copy of MTVehicles' ${g.model} (${(A.model(g.model) || {}).__comment || 'MTVehicles'}), by tools/make-car-wraps.js`
  // Glowing wraps: light_emission is per element, so an element with paint and trim is two (the same box), and only
  // the paint glows (not the tires or the glass).
  const model = glow => ({
    __comment: credit,
    textures,
    elements: elements.flatMap(e => {
      if (!glow || !e.painted) return [{ from: e.from, to: e.to, faces: e.faces }]
      const pick = paint => Object.fromEntries(Object.entries(e.faces).filter(([, f]) => (f.texture === '#wrap') === paint))
      const trim = pick(false)
      const out = [{ from: e.from, to: e.to, light_emission: 15, faces: pick(true) }]
      if (Object.keys(trim).length) out.push({ from: e.from, to: e.to, faces: trim })
      return out
    }),
    display: m.display
  })
  const facesBefore = m.elements.reduce((a, e) => a + Object.keys(e.faces || {}).length, 0)
  return { base: model(false), glow: model(true), box, stats: { before: m.elements.length, after: elements.length, facesBefore, paintFaces, trimFaces, culled, ...cellStats } }
}

// ---------- 3. The wrap textures ----------
// A car of about LEN x HGT x WID model units: patterns are drawn in those units, so they look the same size everywhere.
const LEN = 34
const HGT = 14
const WID = 17
const SIZE = 128
const hash = (x, y, s = 0) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const vnoise = (x, y, s) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, s)
  const b = hash(xi + 1, yi, s)
  const c = hash(xi, yi + 1, s)
  const d = hash(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x, y, s, oct = 4) => {
  let t = 0
  let amp = 0.5
  let f = 1
  let n = 0
  for (let i = 0; i < oct; i++) { t += amp * vnoise(x * f, y * f, s + i * 17); n += amp; amp *= 0.5; f *= 2 }
  return t / n
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.min(1, Math.max(0, t)))
const mul = (c, f) => c.map(v => v * f)
const smooth = (v, a, b) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }

// A texel of a wrap texture -> what it shows: its part and where on the car (see project), in 0..1 and in model units
// (sx, sy: across the part, isotropic), and its texel position (x, y).
const texel = (x, y) => {
  const u = (x + 0.5) * 16 / SIZE
  const v = (y + 0.5) * 16 / SIZE
  const part = v < 8 ? 'side' : u < 8 ? 'top' : v < 12 ? 'front' : 'back'
  const R = REGION[part]
  const a = Math.min(1, Math.max(0, (u - R[0] - M) / (R[2] - R[0] - 2 * M)))
  const b = Math.min(1, Math.max(0, (v - R[1] - M) / (R[3] - R[1] - 2 * M)))
  const t = { part, x, y, a, b }
  if (part === 'side') Object.assign(t, { L: a, H: 1 - b, D: 0, sx: a * LEN, sy: b * HGT })
  else if (part === 'top') Object.assign(t, { L: b, H: 1, D: a, sx: a * WID, sy: b * LEN })
  else Object.assign(t, { L: part === 'front' ? 0 : 1, H: 1 - b, D: part === 'front' ? 1 - a : a, sx: a * WID, sy: b * HGT })
  return t
}

// The patterns: (texel, parameters, frame 0..F-1, F) -> RGB. Common wraps are flat and simple, rare ones detailed,
// exotic ones rich (animated, glowing, metallic).
const PATTERNS = {
  matte: (t, p) => {
    const g = (hash(t.x, t.y, 1) - 0.5) * p.grain + (fbm(t.sx * 0.5, t.sy * 0.5, 2) - 0.5) * 6
    return p.base.map(v => v + g)
  },
  primer: (t, p) => {
    let c = mul(p.base, 0.95 + 0.1 * fbm(t.sx * 0.7, t.sy * 0.7, 3))
    let r = fbm(t.sx * 0.3 + 7, t.sy * 0.3 + 3, 5, 5) + 0.2 * (fbm(t.sx * 1.6, t.sy * 1.6, 9) - 0.5)
    if (t.part !== 'top') r += (0.35 - t.H) * 0.25 // rust starts at the sills
    const thr = 0.66 - p.amount * 0.3
    if (r > thr) {
      const k = hash(t.x, t.y, 4)
      c = k < 0.18 ? p.rust[2] : k > 0.85 ? p.rust[1] : mix(p.rust[0], p.rust[1], fbm(t.sx * 2, t.sy * 2, 6))
    } else if (r > thr - 0.025) c = mul(c, 0.78) // flaking edge
    return c
  },
  twotone: (t, p) => {
    // The top part has no height: the hood, roof and trunk are upper, the steps along the sides (the outer tenth of
    // the width, below the belt line on most cars) lower.
    if (t.part === 'top') return mul(Math.abs(t.D - 0.5) > 0.4 ? p.lower : p.upper, 0.99 + 0.02 * hash(t.x, t.y, 1))
    const d = (t.H - p.split) * (t.part === 'side' ? 64 : 32) // texels from the split
    if (Math.abs(d) < 0.6) return p.line
    return mul(t.H > p.split ? p.upper : p.lower, 0.99 + 0.02 * hash(t.x, t.y, 1))
  },
  stripes: (t, p) => {
    const c = mul(p.base, 0.98 + 0.04 * hash(t.x, t.y, 1))
    if (t.part === 'side') return c
    const w = Math.abs(t.D - 0.5)
    return w >= p.gap / 2 && w <= p.gap / 2 + p.width ? p.stripe : c
  },
  checker: (t, p) => {
    const k = (Math.floor(t.sx / p.size) + Math.floor(t.sy / p.size)) & 1
    return mul(k ? p.a : p.b, 0.98 + 0.04 * hash(t.x, t.y, 1))
  },
  camo: (t, p) => {
    let x = t.sx
    let y = t.sy
    if (p.digital) { x = Math.floor(x / p.digital) * p.digital; y = Math.floor(y / p.digital) * p.digital } else {
      const wx = fbm(x * 0.3, y * 0.3, 5) - 0.5
      const wy = fbm(x * 0.3 + 9, y * 0.3, 6) - 0.5
      x += wx * 3
      y += wy * 3
    }
    let c = p.colors[0]
    if (fbm(x / p.scale, y / p.scale, 11) > 0.52) c = p.colors[1]
    if (fbm(x / p.scale + 31, y / p.scale, 23) > 0.56) c = p.colors[2]
    if (fbm(x / p.scale, y / p.scale + 17, 37) > 0.61) c = p.colors[3]
    return mul(c, 0.96 + 0.08 * hash(t.x, t.y, 2))
  },
  carbon: (t, p) => {
    // A 2x2 twill of tows, each lit like a little cylinder, under a clear coat's broad sheen.
    const i = Math.floor(t.x / p.cell)
    const j = Math.floor(t.y / p.cell)
    const across = (((i + j) % 4) + 4) % 4 < 2
    const l = across ? t.y % p.cell : t.x % p.cell
    const lit = Math.sin(Math.PI * (l + 0.5) / p.cell)
    const c = mix(p.dark, p.mid, lit * 0.95)
    const sheen = Math.pow(0.5 + 0.5 * Math.sin((t.x + t.y * 1.3) * 0.045), 3)
    return mix(c, p.sheen, sheen * 0.45 * lit)
  },
  flames: (t, p) => {
    const gloss = mul(p.base, 0.92 + 0.16 * t.H)
    const fire = r => r < 0.42 ? p.colors[0] : r < 0.68 ? p.colors[1] : r < 0.9 ? p.colors[2] : p.colors[3]
    if (t.part === 'back') return gloss
    if (t.part === 'front') return fire(0.2 + 0.8 * t.H + 0.25 * (fbm(t.sx, t.sy, 3) - 0.5))
    // Tongues licking back from the nose: along the height on the sides, across the hood on the top.
    const q = t.part === 'side' ? t.H : t.D
    const reach = p.reach * (t.part === 'top' ? 0.75 : 1)
    const len = reach * (0.3 + 0.7 * Math.pow(Math.abs(Math.sin(Math.PI * p.tongues * q + 0.4)), 2.2)) + 0.05 * (fbm(q * 9, 1, 7) - 0.5)
    const edge = 1.2 / SIZE // an outline about a texel wide
    if (t.L < len) return fire(t.L / len)
    if (t.L < len + edge) return mul(p.colors[3], 0.7)
    return gloss
  },
  tiger: (t, p) => {
    let c = mix(p.base, p.light, t.part === 'top' ? 0.35 : Math.pow(t.H, 1.5) * 0.6)
    c = mul(c, 0.97 + 0.06 * fbm(t.sx * 0.8, t.sy * 0.8, 3))
    // Stripes: along the length on the sides and the top (thick at the edges of the roof, gone in the middle), across
    // the width on the front and back; each one wavy and tapered.
    const along = t.part === 'side' || t.part === 'top'
    const pos = along ? t.L : t.D
    const across = t.part === 'side' ? t.H : t.part === 'top' ? t.D : t.H
    const count = along ? p.count : Math.round(p.count / 2)
    for (let k = 0; k < count; k++) {
      const at = (k + 0.5 + 0.35 * (hash(k, 3, 9) - 0.5)) / count
      const wob = 0.022 * Math.sin(across * 7 + k * 1.7) + 0.02 * (fbm(across * 5, k, 4) - 0.5)
      const taper = t.part === 'top' ? Math.pow(Math.abs(2 * across - 1), 1.3) : 1 - Math.pow(Math.abs(2 * across - 1), 2)
      const w = (0.3 / count) * taper * (0.6 + 0.7 * hash(k, 5, 9))
      if (Math.abs(pos - at - wob) < w) return p.stripe
    }
    return c
  },
  code: (t, p, frame) => {
    // Falling code: columns 2 texels wide; each has a head moving down 2 or 4 texels a frame (loops after F frames:
    // p.period = F x 2) with a fading trail, over dim glyphs (2x3 texel cells, random bits).
    const col = Math.floor(t.x / 2)
    const glyph = hash(col, Math.floor(t.y / 3), 7)
    const bit = (Math.floor(glyph * 64) >> ((t.x % 2) + 2 * (t.y % 3))) & 1
    const speed = hash(col, 1, 3) < 0.5 ? 2 : 4
    const head = Math.floor(hash(col, 2, 3) * p.period) + frame * speed
    const d = (((head - t.y) % p.period) + p.period) % p.period
    const trail = 8 + Math.floor(hash(col, 4, 3) * 14)
    let c = mix(p.base, p.color, bit ? 0.1 : 0.03)
    if (d < trail) {
      const k = 1 - d / trail
      c = d < 1 ? p.head : mix(c, p.color, (bit ? 1 : 0.3) * k)
    }
    return c
  },
  galaxy: (t, p, frame, F) => {
    const x = t.sx
    const y = t.sy
    const n1 = fbm(x * 0.16, y * 0.16, 3, 5)
    const n2 = fbm(x * 0.22 + 40, y * 0.22, 8, 5)
    const n3 = fbm(x * 0.45, y * 0.45, 13, 4)
    let c = p.deep
    c = mix(c, p.colors[0], smooth(n1, 0.45, 0.78))
    c = mix(c, p.colors[1], smooth(n2, 0.5, 0.8) * 0.8)
    c = mix(c, p.colors[2], smooth(n3, 0.58, 0.82) * 0.7)
    c = mix(c, p.colors[3], smooth(n1 * n2, 0.3, 0.45) * 0.6)
    c = mul(c, 0.6 + 0.5 * smooth(fbm(x * 0.3 + 5, y * 0.3, 21), 0.3, 0.7)) // dust lanes
    const tw = (x, y) => 0.55 + 0.45 * Math.sin(2 * Math.PI * (frame / F + hash(x, y, 31)))
    const s = hash(t.x, t.y, 30)
    if (s < 0.02) c = mix(c, p.star, (s < 0.006 ? 1 : 0.6) * tw(t.x, t.y))
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (hash(t.x + dx, t.y + dy, 30) < 0.003) c = mix(c, p.star, 0.4 * tw(t.x + dx, t.y + dy)) // a big star's cross
    }
    return c
  },
  goldleaf: (t, p) => {
    // Brushed gold under a broad diagonal shine, with an engraved diamond lattice and a raised dot where lines cross.
    const shine = 0.5 + 0.5 * Math.sin((t.x * 0.8 + t.y * 1.6) * 0.06)
    const brush = fbm(t.x * 0.05, t.y * 0.7, 3)
    let c = mix(p.dark, p.gold, 0.45 + 0.35 * shine + 0.25 * (brush - 0.5))
    if (shine > 0.86) c = mix(c, p.light, (shine - 0.86) * 5)
    const u = ((t.x % p.tile) + 0.5) / p.tile
    const v = ((t.y % p.tile) + 0.5) / p.tile
    const r = Math.hypot(u - 0.5, v - 0.5)
    if (r < 0.14) return mix(p.light, p.gold, r * 3)
    if (r < 0.24) return p.ornament
    if (Math.min(Math.abs(u - v), Math.abs(u + v - 1)) < 0.09) return mix(p.ornament, p.dark, 0.3)
    return c
  },
  neon: (t, p) => {
    let c = p.base
    if (t.part !== 'top') c = mix(p.base, p.haze, Math.pow(1 - t.H, 2) * 0.7)
    const cell = 12 // texels
    const dx = Math.min(t.x % cell, cell - (t.x % cell))
    const dy = Math.min(t.y % cell, cell - (t.y % cell))
    const glow = d => d === 0 ? 1 : d === 1 ? 0.4 : d === 2 ? 0.12 : 0
    const a = glow(dx)
    const b = glow(dy)
    c = mix(c, p.a, a)
    c = mix(c, p.b, b * (1 - a * 0.5))
    if (a === 1 && b === 1) c = [255, 255, 255]
    return c
  },
  inferno: (t, p, frame, F) => {
    // Cooled rock split by glowing cracks (the edges between random cells), the heat pulsing back along the car.
    const cx = t.sx / p.cell
    const cy = t.sy / p.cell
    const ix = Math.floor(cx)
    const iy = Math.floor(cy)
    let f1 = 9
    let f2 = 9
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const px = ix + dx + hash(ix + dx, iy + dy, 41)
        const py = iy + dy + hash(ix + dx, iy + dy, 42)
        const d = Math.hypot(cx - px, cy - py)
        if (d < f1) { f2 = f1; f1 = d } else if (d < f2) f2 = d
      }
    }
    const edge = (f2 - f1) * p.cell // model units from the crack's middle
    const pulse = 0.72 + 0.28 * Math.sin(2 * Math.PI * frame / F - t.sx * 0.45 + 3 * fbm(t.sx * 0.2, t.sy * 0.2, 44))
    let c = mix(p.rock, p.crust, fbm(t.sx * 0.9, t.sy * 0.9, 45))
    c = mix(c, p.hot, 0.45 * Math.exp(-edge * 3) * pulse) // hot near the cracks
    const w = 0.3
    if (edge < w) {
      const g = 1 - edge / w
      c = mul(mix(p.hot, p.core, g * g), 0.55 + 0.45 * pulse * (0.6 + 0.4 * g))
    } else if (hash(t.x, t.y, 46) < 0.012) c = mix(c, p.hot, 0.6 * pulse) // embers
    return c
  }
}
// Some shading, so a wrapped car doesn't look flat: a bit darker toward the bottom of the sides.
const shadeAt = t => t.part === 'top' ? 1.03 : 0.9 + 0.14 * t.H
const drawWrap = w => {
  const F = w.frames || 1
  const draw = PATTERNS[w.pattern.type]
  if (!draw) throw new Error(`wrap ${w.id}: unknown pattern ${w.pattern.type}`)
  const px = Buffer.alloc(SIZE * SIZE * F * 4)
  for (let f = 0; f < F; f++) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const t = texel(x, y)
        const c = mul(draw(t, w.pattern, f, F), shadeAt(t))
        const i = ((f * SIZE + y) * SIZE + x) * 4
        for (let k = 0; k < 3; k++) px[i + k] = Math.max(0, Math.min(255, Math.round(c[k])))
        px[i + 3] = 255
      }
    }
  }
  return { png: encode(SIZE, SIZE * F, px), px: SIZE * SIZE * F }
}

// ---------- 4. vehicles.yml, the dispatch list and carwraps.sk ----------
const unq = s => s.trim().replace(/^"(.*)"$/, '$1')
// vehicles.yml, line by line: the header, then one block per family ("  - name: ..."), each with its cars
// ("      - name: ..."). Enough for the file's own regular layout; the result is checked by parsing it.
const readVehicles = () => {
  const lines = fs.readFileSync(VEHICLES, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n')
  const top = lines.findIndex(l => /^voertuigen:/.test(l))
  if (top < 0) throw new Error('vehicles.yml has no voertuigen:')
  const fams = []
  for (const l of lines.slice(top + 1)) {
    if (/^ {2}- name: /.test(l)) fams.push({ name: unq(l.slice(10)), lines: [l] })
    else if (fams.length) fams[fams.length - 1].lines.push(l)
    else throw new Error(`vehicles.yml: unexpected line before the first family: ${l}`)
  }
  for (const f of fams) {
    const at = f.lines.indexOf('    cars:')
    if (at < 0) throw new Error(`vehicles.yml: family ${f.name} has no cars:`)
    f.head = f.lines.slice(0, at + 1)
    f.cars = []
    for (const l of f.lines.slice(at + 1)) {
      if (/^ {6}- name: /.test(l)) f.cars.push({ name: unq(l.slice(14)), lines: [l] })
      else if (/^ {6}# /.test(l)) continue // our comment lines, written again below
      else if (f.cars.length && /^ {8}\S/.test(l)) f.cars[f.cars.length - 1].lines.push(l)
      else if (l.trim()) throw new Error(`vehicles.yml: unexpected line in ${f.name}: ${l}`)
    }
    for (const c of f.cars) {
      const get = k => (c.lines.find(l => l.trim().startsWith(`${k}:`)) || '').split(':').slice(1).join(':').trim()
      c.damage = +get('itemDamage')
      c.uuid = get('uuid')
    }
  }
  return { header: lines.slice(0, top + 1), fams }
}
const carLines = (name, damage, uuid, price) => [
  `      - name: "${name}"`,
  '        SkinItem: DIAMOND_HOE',
  `        itemDamage: ${damage}`,
  `        uuid: ${uuid}`,
  `        price: ${Number(price).toFixed(1)}`
]
const familyHead = f => [
  `  - name: "${f.name}"`,
  `    # Donating: made by tools/make-car-wraps.js from tools/car-wraps.json (the ${f.car}): change it there.`,
  '    vehicleType: CAR',
  '    skinItem: DIAMOND_HOE',
  `    itemDamage: ${f.itemDamage}`,
  '    benzineEnabled: false',
  '    kofferbakEnabled: false',
  '    hornEnabled: true',
  `    maxHealth: ${Number(f.maxHealth).toFixed(1)}`,
  `    acceleratieSpeed: ${f.acceleratieSpeed}`,
  `    maxSpeed: ${f.maxSpeed}`,
  '    brakingSpeed: 0.03',
  '    aftrekkenSpeed: 0.005',
  `    rotateSpeed: ${f.rotateSpeed}`,
  '    maxSpeedBackwards: 0.35',
  '    seats:',
  ...f.seats.flatMap(([x, y, z]) => [`      - x: ${x.toFixed(1)}`, `        y: ${y.toFixed(2).replace(/0$/, '')}`, `        z: ${z.toFixed(1)}`]),
  '    cars:'
]
// A uuid MTVehicles has never seen: 6 of A-Z0-9 from a hash of the variant's name (the same name, the same uuid).
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const uuidFor = (name, taken) => {
  for (let n = 0; ; n++) {
    const h = crypto.createHash('sha1').update(n ? `${name}#${n}` : name).digest()
    const id = [...h.subarray(0, 6)].map(b => ALPHABET[b % 36]).join('')
    if (!taken.has(id)) return id
  }
}
// MTVehicles' default vehicles.yml (inside its jar): its uuids and damages stay reserved.
const defaultVehicles = () => {
  const jar = path.join(REPO, 'server', 'plugins', 'MTVehicles.jar')
  if (!fs.existsSync(jar)) { console.warn('WARNING: server\\plugins\\MTVehicles.jar is missing: new uuids are only checked against our vehicles.yml'); return '' }
  const b = readZip(jar).get('vehicles.yml')
  return b ? b.toString('utf8') : ''
}

const writeSkript = (lines) => {
  const begin = '\t# WRAPS-BEGIN (tools\\make-car-wraps.js writes the lines between these markers)'
  const end = '\t# WRAPS-END'
  let s = fs.existsSync(SKRIPT) ? fs.readFileSync(SKRIPT, 'utf8').replace(/\r\n/g, '\n') : [
    '# carwraps.sk: car wraps (skins). Generated by tools\\make-car-wraps.js from tools\\car-wraps.json: don\'t edit the lines',
    '# between WRAPS-BEGIN and WRAPS-END (change car-wraps.json and run the script again).',
    '# A wrap is its own MTVehicles variant (MTVehicles finds a car\'s model by its look), so a wrapped car is a car of',
    '# that variant: a new plate made with its uuid, like a repaint.',
    '#   {-carwrap::<car id>::<wrap id>} = "<MTVehicles uuid>=<itemDamage>" for every car id and wrap',
    '#   {-carwrapname::<wrap id>} = the name, {-carwraptier::<wrap id>} = common | rare | exotic (bad, good, super rare)',
    '#   {-carwraps::<n>} = the wrap ids in order, 1 = the first',
    '# Memory only, set on load (like skins.sk).',
    '',
    'on load:',
    '\tcarWrapsLoad()',
    '',
    'function carWrapsLoad():',
    '\tdelete {-carwrap::*}',
    '\tdelete {-carwrapname::*}',
    '\tdelete {-carwraptier::*}',
    '\tdelete {-carwraps::*}',
    begin,
    end,
    ''
  ].join('\n')
  const a = s.indexOf(begin)
  const b = s.indexOf(end)
  if (a < 0 || b < a) throw new Error(`${SKRIPT}: the WRAPS-BEGIN/END markers are missing`)
  s = s.slice(0, a + begin.length) + '\n' + lines.map(l => `\t${l}`).join('\n') + '\n' + s.slice(b)
  fs.writeFileSync(SKRIPT, s)
}

module.exports = { readZip, decodePng, parseJson, openAssets, resolveModel, corners, cornerUv, CORNERS, paintClasses, usedPixels, faceGrid, paintCells }

if (require.main === module) main()
function main () {
  const cfg = parseJson(fs.readFileSync(WRAPS_JSON))
  const A = openAssets()
  const write = (rel, data) => {
    const file = path.join(PACK, ...rel.split('/'))
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, data)
  }
  // Start clean: models and textures of wraps or geometries that were removed from car-wraps.json go too.
  for (const d of ['models/custom/wraps', 'textures/custom/wraps']) fs.rmSync(path.join(PACK, ...d.split('/')), { recursive: true, force: true })

  // Wrap textures.
  let texPx = 0
  let atlasPx = 0
  for (const w of cfg.wraps) {
    const { png, px } = drawWrap(w)
    write(`textures/custom/wraps/${w.id}.png`, png)
    if (w.frames > 1) write(`textures/custom/wraps/${w.id}.png.mcmeta`, JSON.stringify({ animation: { frametime: w.frametime || 2, interpolate: w.pattern.type !== 'code' } }, null, 2) + '\n')
    texPx += px
    atlasPx += SIZE * SIZE // an animation takes one frame's room in the atlas
  }
  // Wrappable geometries and one model per geometry and wrap.
  const anyGlow = cfg.wraps.some(w => w.glow)
  for (const [id, g] of Object.entries(cfg.geometries)) {
    g.id = id
    const b = buildBase(A, g)
    write(`models/custom/wraps/${id}_base.json`, JSON.stringify(b.base))
    if (anyGlow) write(`models/custom/wraps/${id}_glow.json`, JSON.stringify(b.glow))
    for (const w of cfg.wraps) {
      write(`models/custom/wraps/${id}_${w.id}.json`, JSON.stringify({ parent: `custom/wraps/${id}_${w.glow ? 'glow' : 'base'}`, textures: { wrap: `custom/wraps/${w.id}` } }))
    }
    const s = b.stats
    console.log(`${id}: ${s.before} -> ${s.after} elements, ${s.facesBefore} -> ${s.paintFaces + s.trimFaces} faces (${s.paintFaces} paint, ${s.trimFaces} trim, ${s.culled} hidden ones left out); voxel ${s.size}, paint in ${s.pieces} pieces (${s.dropped} of ${s.total} voxel faces in wheels went back to trim)`)
  }

  // vehicles.yml: our families keep every variant; wrap variants ("Wrap ...") and the generated families are written
  // again, each variant with the damage and uuid it had (a new one gets the next free damage from 1300 and a new uuid).
  const yml = readVehicles()
  const dflt = defaultVehicles()
  const hoe = parseJson(A.mtv.get('assets/minecraft/items/diamond_hoe.json'))
  const known = new Map() // name -> { damage, uuid }
  for (const f of yml.fams) for (const c of f.cars) known.set(c.name, { damage: c.damage, uuid: c.uuid })
  const taken = new Set([...dflt.matchAll(/uuid:\s*(\S+)/g)].map(m => m[1]))
  const used = new Set(hoe.model.on_false.entries.map(e => Math.round(e.threshold * 1562)))
  const generatedNames = new Set(cfg.families.map(f => f.name))
  for (const k of known.values()) { taken.add(k.uuid); used.add(k.damage) } // everything vehicles.yml has now
  for (const f of cfg.families) for (const c of f.cars) { if (c.uuid) taken.add(c.uuid); if (c.itemDamage) used.add(c.itemDamage) }
  let next = 1300
  const assign = name => {
    const k = known.get(name)
    if (k && k.damage && k.uuid) return k
    while (used.has(next)) next++
    if (next > 1560) throw new Error('no free itemDamage left in 1300-1560')
    used.add(next)
    const uuid = uuidFor(name, taken)
    taken.add(uuid)
    const out = { damage: next, uuid }
    known.set(name, out)
    return out
  }
  const generated = []
  const skript = []
  const report = {}
  // The new families (plain colors), then the wraps, family by family.
  const newFams = cfg.families.map(f => {
    const lines = familyHead(f)
    report[f.car] = []
    for (const c of f.cars) {
      let damage = c.itemDamage
      let uuid = c.uuid
      if (!damage || !uuid) {
        const k = c.itemDamage ? { damage: c.itemDamage, uuid: (known.get(c.name) || {}).uuid || uuidFor(c.name, taken) } : assign(c.name)
        damage = k.damage
        uuid = k.uuid
        taken.add(uuid)
        known.set(c.name, { damage, uuid })
        if (c.model) generated.push({ damage, model: `minecraft:${c.model}` })
      }
      lines.push(...carLines(c.name, damage, uuid, c.price))
      report[f.car].push(`${c.label}=${uuid}=${damage}`)
    }
    return { name: f.name, head: lines, cars: [] }
  })
  const fams = yml.fams.filter(f => !generatedNames.has(f.name)).map(f => ({ name: f.name, head: f.head, cars: f.cars.filter(c => !c.name.startsWith('Wrap ')) }))
  const all = [...fams, ...newFams]
  const wrapOf = {} // geometry -> wrap -> "uuid=damage"
  for (const [id, g] of Object.entries(cfg.geometries)) {
    const fam = all.find(f => f.name === g.family)
    if (!fam) throw new Error(`${id}: vehicles.yml has no family ${g.family}`)
    fam.wraps = fam.wraps || []
    wrapOf[id] = {}
    for (const w of cfg.wraps) {
      const name = `Wrap ${g.label} ${w.name}`
      const k = assign(name)
      fam.wraps.push(carLines(name, k.damage, k.uuid, g.price))
      generated.push({ damage: k.damage, model: `minecraft:custom/wraps/${id}_${w.id}` })
      wrapOf[id][w.id] = `${k.uuid}=${k.damage}`
    }
  }
  const out = [...yml.header]
  for (const f of all) {
    out.push(...f.head)
    for (const c of f.cars) out.push(...c.lines)
    if (f.wraps) {
      out.push('      # Wraps (tools/make-car-wraps.js): a variant\'s itemDamage and uuid never change once cars of it exist.')
      for (const l of f.wraps) out.push(...l)
    }
  }
  fs.writeFileSync(VEHICLES, out.join('\n') + '\n')
  generated.sort((a, b) => a.damage - b.damage)
  fs.writeFileSync(GENERATED, JSON.stringify(generated, null, 1) + '\n')

  // carwraps.sk
  for (const [car, id] of Object.entries(cfg.cars)) {
    if (!wrapOf[id]) throw new Error(`car ${car}: no geometry ${id}`)
    for (const w of cfg.wraps) skript.push(`set {-carwrap::${car}::${w.id}} to "${wrapOf[id][w.id]}"`)
  }
  cfg.wraps.forEach((w, i) => {
    skript.push(`set {-carwrapname::${w.id}} to "${w.name}"`)
    skript.push(`set {-carwraptier::${w.id}} to "${w.tier}"`)
    skript.push(`set {-carwraps::${i + 1}} to "${w.id}"`)
  })
  writeSkript(skript)

  console.log(`wraps: ${cfg.wraps.length} textures (${texPx} px, ${atlasPx} px in the block atlas), ${Object.keys(cfg.geometries).length} geometries, ${generated.length} dispatch entries`)
  for (const [car, list] of Object.entries(report)) console.log(`colors ${car}: ${list.join(', ')}`)
}
