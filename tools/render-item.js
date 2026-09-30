// Renders an item the way the 26.3 client places it, as a PNG preview (a local check for pack art; the
// outputs are previews, keep them out of git). What to draw:
//   - a model id: donating:item/gun_ak47, item/weapons/ak47 (WeaponMechanics'), minecraft:item/apple
//   - an item with its custom model data, resolved through its items/<item>.json like the client does:
//     feather@1009 (a float: a range_dispatch picks the last entry whose threshold <= the value),
//     breeze_rod@donating:tool_grappler (a string), feather (none); the display_context select picks the
//     icon in gui and the 3D model elsewhere.
// Views:
//   gui   the inventory slot (orthographic, the model's gui transform), with the real-size slot at 1x, 2x
//         and 3x in the corner
//   fp    first person, right hand: 70° vertical HUD field of view (zooming never changes it), the arm
//         offset 0.56 / -0.52 / -0.72, firstperson_righthand; the crosshair is drawn
//   fpl   first person, left hand (-0.56, firstperson_lefthand applied with (-tx, ty, tz), (rx, -ry, -rz))
//   side  third person, right hand, seen from the player's right (orthographic), with the player
//   tp    another player holding it in the right hand, seen from the front-left (perspective)
//   all   every view: <out> is then a prefix, <out>-<view>.png
// Sources, first found wins: pack\assets (ours), WeaponMechanics' pack zip (extras\packs\wm), the local
// Minecraft client jar (vanilla models and textures, previews only; %APPDATA%\.minecraft\versions).
// items/feather.json is ours merged into WeaponMechanics' like build-pack.js does (tools\merge-dispatch.js).
// --pack <zip>: read ours and WeaponMechanics' from a built pack instead (extras\packs\Donating-pack.zip).
// Element rotations (axis/angle/origin/rescale and 26.x x/y/z), per-file lefthand fallback (a missing
// lefthand copies the righthand one, as the client's deserializer does), per-context parent display,
// generated (flat sprite) items extruded, textures, face shade (up 1, down 0.5, N/S 0.8, E/W 0.6),
// light_emission, a depth buffer. Not drawn: the hand bob, the equip dip, tints, special models.
//
// Usage: tools\node\node.exe tools\render-item.js <model id | item[@cmd]> <out.png> [view] [W H] [--pack zip]
//   e.g. tools\node\node.exe tools\render-item.js feather@1009 %TEMP%\gs50-ads.png fp
//        tools\node\node.exe tools\render-item.js breeze_rod@donating:tool_grappler %TEMP%\grappler all
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { encode } = require('./png')
// A PNG decoder for every non-interlaced kind the packs use: gray, RGB, palette (with tRNS), gray+alpha,
// RGBA; bit depth 8, or 1/2/4 for gray and palette (vanilla's textures are often paletted). -> RGBA.
const decodePng = buf => {
  let p = 8
  let w, h, depth, ct, interlace
  let palette = null
  let trns = null
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ct = data[9]; interlace = data[12] }
    else if (type === 'PLTE') palette = data
    else if (type === 'tRNS') trns = data
    else if (type === 'IDAT') idat.push(data)
    p += 12 + len
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct]
  if (!channels || interlace || (depth !== 8 && !(depth < 8 && (ct === 0 || ct === 3)))) return null
  const bitsPx = channels * depth
  const stride = Math.ceil(w * bitsPx / 8)
  const bpp = Math.max(1, bitsPx >> 3)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const out = Buffer.alloc(w * h * 4)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0
      const b = prev[x]
      const c = x >= bpp ? prev[x - bpp] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) { const q = a + b - c; const pa = Math.abs(q - a); const pb = Math.abs(q - b); const pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      line[x] = v & 255
    }
    const sample = (x, k) => depth === 8 ? line[x * channels + k] : (line[(x * depth) >> 3] >> (8 - depth - ((x * depth) & 7))) & ((1 << depth) - 1)
    for (let x = 0; x < w; x++) {
      let px
      if (ct === 3) {
        const i = sample(x, 0)
        px = [palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2], trns && i < trns.length ? trns[i] : 255]
      } else if (ct === 0) {
        const g = depth === 8 ? sample(x, 0) : Math.round(sample(x, 0) * 255 / ((1 << depth) - 1))
        px = [g, g, g, 255]
      } else if (ct === 4) px = [line[x * 2], line[x * 2], line[x * 2], line[x * 2 + 1]]
      else if (ct === 2) px = [line[x * 3], line[x * 3 + 1], line[x * 3 + 2], 255]
      else px = [line[x * 4], line[x * 4 + 1], line[x * 4 + 2], line[x * 4 + 3]]
      out.set(px, (y * w + x) * 4)
    }
    prev = line
  }
  return { w, h, px: out }
}
const { mergeRangeDispatch } = require('./merge-dispatch')

const REPO = path.join(__dirname, '..')
const WM_ZIP = path.join(REPO, 'extras', 'packs', 'wm', 'WeaponMechanicsResourcePack-3.0.0.zip')

// ---------- Sources ----------
// A zip read lazily (the client jar is big): the central directory first, a file inflated when asked.
const lazyZip = file => {
  const buf = fs.readFileSync(file)
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error(`not a zip: ${file}`)
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const index = new Map()
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10)
    const size = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen).split('\\').join('/')
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32)
    if (!name.endsWith('/')) index.set(name, { method, size, local })
  }
  return {
    name: path.basename(file),
    get (rel) {
      const e = index.get(rel)
      if (!e) return null
      const start = e.local + 30 + buf.readUInt16LE(e.local + 26) + buf.readUInt16LE(e.local + 28)
      const raw = buf.subarray(start, start + e.size)
      return e.method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw)
    }
  }
}
const dirSource = dir => ({
  name: path.relative(REPO, dir) || dir,
  get: rel => { const f = path.join(dir, ...rel.split('/')); return fs.existsSync(f) ? fs.readFileSync(f) : null }
})
// The client jar: 26.3 (the owner's client) if it's there, else the newest release.
const vanillaJar = () => {
  const dir = path.join(process.env.APPDATA || '', '.minecraft', 'versions')
  if (!fs.existsSync(dir)) return null
  const vs = fs.readdirSync(dir).filter(v => fs.existsSync(path.join(dir, v, `${v}.jar`)))
  const pick = vs.includes('26.3') ? '26.3' : vs.filter(v => /^[\d.]+$/.test(v)).sort().pop()
  return pick ? path.join(dir, pick, `${pick}.jar`) : null
}
const parseJson = b => JSON.parse(b.toString('utf8').replace(/^\uFEFF/, ''))

const openSources = (packZip) => {
  const ours = packZip ? lazyZip(packZip) : dirSource(path.join(REPO, 'pack'))
  const wm = !packZip && fs.existsSync(WM_ZIP) ? lazyZip(WM_ZIP) : null
  const jarFile = vanillaJar()
  const jar = jarFile ? lazyZip(jarFile) : null
  const list = [ours, wm, jar].filter(Boolean)
  const cache = new Map()
  const get = rel => {
    if (cache.has(rel)) return cache.get(rel)
    let data = null
    for (const s of list) { data = s.get(rel); if (data) break }
    // Ours merged into WeaponMechanics' feather.json by threshold, as build-pack.js does.
    if (!packZip && rel === 'assets/minecraft/items/feather.json' && wm) {
      const a = wm.get(rel)
      const b = ours.get(rel)
      if (a && b) data = Buffer.from(JSON.stringify(mergeRangeDispatch(parseJson(a), parseJson(b), rel).json))
    }
    cache.set(rel, data)
    return data
  }
  return { get, names: list.map(s => s.name) }
}

// ---------- Item definitions ----------
const split = id => id.includes(':') ? id.split(':') : ['minecraft', id]
const typeIs = (t, name) => t === name || t === `minecraft:${name}`
// The models an item model draws in a display context (a composite draws several).
const resolveItemModel = (m, ctx, out = []) => {
  if (!m) return out
  if (typeIs(m.type, 'model')) out.push(m.model)
  else if (typeIs(m.type, 'composite')) (m.models || []).forEach(x => resolveItemModel(x, ctx, out))
  // view_entity: the holder is the camera (true in a preview, as in normal first person; build-pack.js hides
  // first-person items under the car camera with it); other conditions: not using, not broken...
  else if (typeIs(m.type, 'condition')) resolveItemModel(typeIs(m.property, 'view_entity') && ctx.viewEntity !== false ? m.on_true : m.on_false, ctx, out)
  else if (typeIs(m.type, 'select')) {
    let v = null
    if (typeIs(m.property, 'display_context')) v = ctx.display
    else if (typeIs(m.property, 'custom_model_data')) v = ctx.strings[m.index || 0]
    const hit = (m.cases || []).find(c => (Array.isArray(c.when) ? c.when : [c.when]).includes(v))
    resolveItemModel(hit ? hit.model : m.fallback, ctx, out)
  } else if (typeIs(m.type, 'range_dispatch')) {
    let v = 0
    if (typeIs(m.property, 'custom_model_data')) v = ctx.floats[m.index || 0] || 0
    v *= m.scale === undefined ? 1 : m.scale
    const entries = [...(m.entries || [])].sort((a, b) => a.threshold - b.threshold)
    let hit = null
    for (const e of entries) if (e.threshold <= v) hit = e
    resolveItemModel(hit ? hit.model : m.fallback, ctx, out)
  } else if (!typeIs(m.type, 'empty')) console.warn(`note: item model type ${m.type} isn't drawn`)
  return out
}

// ---------- Models ----------
const CONTEXTS = ['thirdperson_righthand', 'thirdperson_lefthand', 'firstperson_righthand', 'firstperson_lefthand', 'head', 'gui', 'ground', 'fixed']
// Vanilla's generated and handheld displays, for when the client jar isn't there.
const BUILTIN_DISPLAY = {
  'minecraft:item/generated': {
    ground: { translation: [0, 2, 0], scale: [0.5, 0.5, 0.5] },
    head: { rotation: [0, 180, 0], translation: [0, 13, 7], scale: [1, 1, 1] },
    thirdperson_righthand: { translation: [0, 3, 1], scale: [0.55, 0.55, 0.55] },
    firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
    fixed: { rotation: [0, 180, 0] }
  },
  'minecraft:item/handheld': {
    thirdperson_righthand: { rotation: [0, -90, 55], translation: [0, 4, 0.5], scale: [0.85, 0.85, 0.85] },
    thirdperson_lefthand: { rotation: [0, 90, -55], translation: [0, 4, 0.5], scale: [0.85, 0.85, 0.85] },
    firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
    firstperson_lefthand: { rotation: [0, 90, -25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] }
  }
}
const fullId = id => { const [ns, p] = split(id); return `${ns}:${p}` }
const makeLoader = S => {
  const texCache = new Map()
  const texture = id => {
    if (!id) return null
    id = fullId(id)
    if (!texCache.has(id)) {
      const [ns, p] = split(id)
      const b = S.get(`assets/${ns}/textures/${p}.png`)
      texCache.set(id, b ? decodePng(b) : null)
    }
    return texCache.get(id)
  }
  // A model with its parents: elements (or a generated sprite), textures, and one transform per context.
  const loadModel = id => {
    const chain = []
    let generated = false
    const missing = []
    for (let cur = id; cur;) {
      const full = fullId(cur)
      if (full === 'minecraft:builtin/generated') { generated = true; break }
      if (full === 'minecraft:builtin/entity') break
      const [ns, p] = split(full)
      const b = S.get(`assets/${ns}/models/${p}.json`)
      if (!b) {
        if (BUILTIN_DISPLAY[full]) { // no client jar: vanilla's displays from memory
          const withLeft = d => { d = { ...d }; for (const k of ['thirdperson', 'firstperson']) if (!d[`${k}_lefthand`] && d[`${k}_righthand`]) d[`${k}_lefthand`] = d[`${k}_righthand`]; return d }
          chain.push({ display: withLeft(BUILTIN_DISPLAY[full]) })
          if (full === 'minecraft:item/handheld') chain.push({ display: withLeft(BUILTIN_DISPLAY['minecraft:item/generated']) })
          generated = true
          break
        }
        if (!chain.length) throw new Error(`missing model ${cur}`)
        missing.push(full)
        break
      }
      const j = parseJson(b)
      // The client's ItemTransforms deserializer, per file: a missing lefthand copies the righthand one.
      if (j.display) {
        j.display = { ...j.display }
        for (const k of ['thirdperson', 'firstperson']) if (!j.display[`${k}_lefthand`] && j.display[`${k}_righthand`]) j.display[`${k}_lefthand`] = j.display[`${k}_righthand`]
      }
      chain.push(j)
      cur = j.parent
    }
    if (missing.length) console.warn(`note: parent ${missing.join(', ')} of ${id} not found`)
    const textures = {}
    for (const j of [...chain].reverse()) Object.assign(textures, j.textures || {})
    const display = {}
    for (const ctx of CONTEXTS) { const j = chain.find(x => x.display && x.display[ctx]); if (j) display[ctx] = j.display[ctx] }
    const withElements = chain.find(j => j.elements)
    const tex = ref => { let r = ref; for (let i = 0; i < 10 && r && r.startsWith('#'); i++) r = textures[r.slice(1)]; return r }
    const guiLight = (chain.find(j => j.gui_light) || {}).gui_light || 'side'
    let quads
    if (withElements) quads = elementQuads(withElements.elements, f => texture(tex(f.texture)))
    else if (generated) quads = generatedQuads(Object.keys(textures).filter(k => /^layer\d+$/.test(k)).sort().map(k => texture(tex('#' + k))).filter(Boolean))
    else quads = []
    return { id, quads, display, generated: !withElements && generated, guiLight }
  }
  return { loadModel }
}

// ---------- Geometry (model units: 16 = one block) ----------
const mul3 = (a, b) => a.map((r, i) => [0, 1, 2].map(j => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]))
const app3 = (m, v) => m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
const RAD = Math.PI / 180
const rx3 = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[1, 0, 0], [0, c, -s], [0, s, c]] }
const ry3 = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[c, 0, s], [0, 1, 0], [-s, 0, c]] }
const rz3 = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[c, -s, 0], [s, c, 0], [0, 0, 1]] }
const rotXYZ = r => mul3(mul3(rx3(r[0] || 0), ry3(r[1] || 0)), rz3(r[2] || 0)) // JOML rotationXYZ
// Minecraft's FaceInfo corner order; a face's uv [u0 v0 u1 v1] goes to corners 0-3 as (u0,v0) (u0,v1) (u1,v1) (u1,v0).
const CORN = {
  down: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
  up: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
  north: [[1, 1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]],
  south: [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]],
  west: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]],
  east: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]]
}
const SHADE = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.6, west: 0.6 }
const cornerUv = (uv, rot, i) => { const j = (i + (rot || 0) / 90) % 4; return [j === 0 || j === 1 ? uv[0] : uv[2], j === 0 || j === 3 ? uv[1] : uv[3]] }
// A face without uv takes its element's own box (BlockElement's default uvs).
const defaultUv = (dir, f, t) => ({
  down: [f[0], 16 - t[2], t[0], 16 - f[2]],
  up: [f[0], f[2], t[0], t[2]],
  north: [16 - t[0], 16 - t[1], 16 - f[0], 16 - f[1]],
  south: [f[0], 16 - t[1], t[0], 16 - f[1]],
  west: [f[2], 16 - t[1], t[2], 16 - f[1]],
  east: [16 - t[2], 16 - t[1], 16 - f[2], 16 - f[1]]
})[dir]
const elemRot = e => {
  const r = e.rotation
  if (!r) return p => p
  const o = r.origin || [8, 8, 8]
  const m = r.axis ? ({ x: rx3, y: ry3, z: rz3 })[r.axis](r.angle || 0) : rotXYZ([r.x || 0, r.y || 0, r.z || 0])
  let sc = [1, 1, 1]
  if (r.rescale && r.axis) {
    const f = 1 / Math.cos(Math.abs(r.angle) * RAD)
    sc = { x: [1, f, f], y: [f, 1, f], z: [f, f, 1] }[r.axis]
  }
  return p => { const q = app3(m, [p[0] - o[0], p[1] - o[1], p[2] - o[2]]); return [q[0] * sc[0] + o[0], q[1] * sc[1] + o[1], q[2] * sc[2] + o[2]] }
}
// A quad: 4 points (model units), their uvs (0-16), a texture (or a flat color), its face (for shade).
const elementQuads = (elements, texOf) => {
  const quads = []
  for (const e of elements) {
    const er = elemRot(e)
    for (const [dir, fc] of Object.entries(e.faces || {})) {
      const pts = CORN[dir].map(c => c.map((k, i) => k ? e.to[i] : e.from[i])).map(er)
      const uv = fc.uv || defaultUv(dir, e.from, e.to)
      quads.push({ pts, uvs: [0, 1, 2, 3].map(i => cornerUv(uv, fc.rotation, i)), tex: texOf(fc), dir, glow: (e.light_emission || 0) > 0 })
    }
  }
  return quads
}
// A generated item (a flat sprite) is extruded 1 unit thick like the client does: front and back, and an
// edge wherever an opaque pixel meets a transparent one. One quad per pixel face, in the pixel's color.
const generatedQuads = layers => {
  const quads = []
  layers.forEach((t, li) => {
    const n = t.w
    const z0 = 7.5 - li * 0.01
    const z1 = 8.5 + li * 0.01
    const at = (x, y) => x >= 0 && y >= 0 && x < n && y < n && t.px[(y * n + x) * 4 + 3] >= 26
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!at(x, y)) continue
        const i = (y * n + x) * 4
        const color = [t.px[i], t.px[i + 1], t.px[i + 2]]
        const s = 16 / n
        const f = [x * s, 16 - (y + 1) * s, z0]
        const to = [(x + 1) * s, 16 - y * s, z1]
        const box = dir => ({ pts: CORN[dir].map(c => c.map((k, j) => k ? to[j] : f[j])), color, dir })
        quads.push(box('south'), box('north'))
        if (!at(x - 1, y)) quads.push(box('west'))
        if (!at(x + 1, y)) quads.push(box('east'))
        if (!at(x, y - 1)) quads.push(box('up'))
        if (!at(x, y + 1)) quads.push(box('down'))
      }
    }
  })
  return quads
}

// ---------- 4x4 transforms (row-major, column vectors) ----------
const M4 = {
  id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  mul: (a, b) => { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j]; return o },
  t: (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1],
  s: (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1],
  r3: m => [m[0][0], m[0][1], m[0][2], 0, m[1][0], m[1][1], m[1][2], 0, m[2][0], m[2][1], m[2][2], 0, 0, 0, 0, 1],
  app: (m, p) => [0, 1, 2].map(i => m[i * 4] * p[0] + m[i * 4 + 1] * p[1] + m[i * 4 + 2] * p[2] + m[i * 4 + 3])
}
const chain = (...ms) => ms.reduce((a, b) => M4.mul(a, b))
// ItemTransform.apply: translate (x0.0625, clamped to ±5 blocks; -tx in the left hand), rotationXYZ (ry and
// rz negated in the left hand), scale (clamped to ±4); then the item is moved by -0.5 (its centre). Model
// units are 1/16 block.
const itemMatrix = (t, left) => {
  t = t || {}
  const tr = (t.translation || [0, 0, 0]).map(v => Math.max(-80, Math.min(80, v)) / 16)
  const ro = t.rotation || [0, 0, 0]
  const sc = (t.scale || [1, 1, 1]).map(v => Math.max(-4, Math.min(4, v)))
  return chain(
    M4.t(left ? -tr[0] : tr[0], tr[1], tr[2]),
    M4.r3(rotXYZ([ro[0], left ? -ro[1] : ro[1], left ? -ro[2] : ro[2]])),
    M4.s(sc[0], sc[1], sc[2]),
    M4.t(-0.5, -0.5, -0.5),
    M4.s(1 / 16, 1 / 16, 1 / 16)
  )
}
// The player (wide arms), as the entity renderer places it: facing +z (south), feet at y = 0.
// LivingEntityRenderer: rotate Y (180 - body yaw), scale (-1, -1, 1), the player's 0.9375, translate
// (0, -1.501, 0); model parts in pixels, y down; ModelPart.translateAndRotate = translate(pivot / 16),
// rotationZYX(z, y, x). Holding an item the right arm's xRot is -18° (ArmPose.ITEM).
const ENTITY = chain(M4.r3(ry3(180)), M4.s(-1, -1, 1), M4.s(0.9375, 0.9375, 0.9375), M4.t(0, -1.501, 0))
const partMatrix = (pivot, xRot = 0) => chain(ENTITY, M4.t(pivot[0] / 16, pivot[1] / 16, pivot[2] / 16), M4.r3(rx3(xRot)))
const RIGHT_ARM = partMatrix([-5, 2, 0], -18)
// ItemInHandLayer: the arm, rotate X -90, rotate Y 180, translate (±1/16, 0.125, -0.625).
const HAND_RIGHT = chain(RIGHT_ARM, M4.r3(rx3(-90)), M4.r3(ry3(180)), M4.t(1 / 16, 0.125, -0.625))
const PLAYER_PARTS = [
  { m: partMatrix([0, 0, 0]), from: [-4, -8, -4], to: [4, 0, 4], color: [206, 158, 118], front: [120, 84, 60] }, // head (front darker)
  { m: partMatrix([0, 0, 0]), from: [-4, 0, -2], to: [4, 12, 2], color: [64, 118, 170] }, // body
  { m: RIGHT_ARM, from: [-3, -2, -2], to: [1, 10, 2], color: [196, 150, 112] },
  { m: partMatrix([5, 2, 0]), from: [-1, -2, -2], to: [3, 10, 2], color: [196, 150, 112] },
  { m: partMatrix([-1.9, 12, 0]), from: [-2, 0, -2], to: [2, 12, 2], color: [52, 56, 120] },
  { m: partMatrix([1.9, 12, 0]), from: [-2, 0, -2], to: [2, 12, 2], color: [52, 56, 120] }
]

// ---------- The rasterizer ----------
const newImage = (W, H, bg) => {
  const px = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = typeof bg === 'function' ? bg(x, y) : bg
      px.set([c[0], c[1], c[2], 255], (y * W + x) * 4)
    }
  }
  return { W, H, px, depth: new Float32Array(W * H).fill(Infinity), tris: 0 }
}
// Draws quads through world matrix M and a projection proj(p) -> [sx, sy, depth] | null. flat: no shade.
const drawQuads = (img, quads, M, proj, flat = false) => {
  const { W, H, px, depth } = img
  for (const q of quads) {
    const pts = q.pts.map(p => proj(M4.app(M, p)))
    if (pts.some(p => !p)) continue
    const sh = flat || q.glow ? 1 : SHADE[q.dir]
    for (const tri of [[0, 1, 2], [0, 2, 3]]) {
      const [a, b, c] = tri.map(i => pts[i])
      const uv = q.uvs ? tri.map(i => q.uvs[i]) : null
      const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
      if (Math.abs(den) < 1e-9) continue
      img.tris++
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])))
      const x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])))
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])))
      const y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])))
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const sx = x + 0.5
          const sy = y + 0.5
          const wa = ((b[1] - c[1]) * (sx - c[0]) + (c[0] - b[0]) * (sy - c[1])) / den
          const wb = ((c[1] - a[1]) * (sx - c[0]) + (a[0] - c[0]) * (sy - c[1])) / den
          const wc = 1 - wa - wb
          if (wa < -1e-6 || wb < -1e-6 || wc < -1e-6) continue
          const z = wa * a[2] + wb * b[2] + wc * c[2]
          const di = y * W + x
          if (z >= depth[di]) continue
          let col = q.color ? [...q.color, 255] : [255, 0, 255, 255] // magenta: a missing texture
          if (q.tex) {
            const t = q.tex
            const u = wa * uv[0][0] + wb * uv[1][0] + wc * uv[2][0]
            const v = wa * uv[0][1] + wb * uv[1][1] + wc * uv[2][1]
            // An animated texture stacks square frames: frame 0 (v / 16 of its width).
            const tx = Math.min(t.w - 1, Math.max(0, Math.floor(u / 16 * t.w)))
            const ty = Math.min(t.w - 1, Math.max(0, Math.floor(v / 16 * t.w)))
            const i = (ty * t.w + tx) * 4
            col = [t.px[i], t.px[i + 1], t.px[i + 2], t.px[i + 3]]
          }
          if (col[3] < 26) continue
          depth[di] = z
          px.set([col[0] * sh, col[1] * sh, col[2] * sh].map(Math.round).concat(255), di * 4)
        }
      }
    }
  }
}
const playerQuads = () => PLAYER_PARTS.map(p => ({
  m: p.m,
  quads: Object.keys(CORN).map(dir => ({
    pts: CORN[dir].map(c => c.map((k, i) => (k ? p.to[i] : p.from[i]) / 16)),
    color: dir === 'north' && p.front ? p.front : p.color,
    dir: { north: 'south', south: 'north', up: 'down', down: 'up', east: 'east', west: 'west' }[dir] // the entity flips y and z
  }))
}))
// A perspective camera at eye looking at target: world -> [sx, sy, depth].
const lookAt = (eye, target, fovDeg, W, H) => {
  const f = [0, 1, 2].map(i => target[i] - eye[i])
  const n = Math.hypot(...f)
  const fw = f.map(v => v / n)
  const up = [0, 1, 0]
  let rt = [fw[1] * up[2] - fw[2] * up[1], fw[2] * up[0] - fw[0] * up[2], fw[0] * up[1] - fw[1] * up[0]]
  const rn = Math.hypot(...rt)
  rt = rt.map(v => v / rn)
  const u = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]]
  const k = 1 / Math.tan(fovDeg / 2 * RAD) * H / 2
  return p => {
    const d = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]]
    const z = d[0] * fw[0] + d[1] * fw[1] + d[2] * fw[2]
    if (z < 0.05) return null
    return [W / 2 + (d[0] * rt[0] + d[1] * rt[1] + d[2] * rt[2]) / z * k, H / 2 - (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z * k, z]
  }
}

// ---------- Views ----------
const SKY = (W, H) => (x, y) => { const t = y / H; return [Math.round(150 - 40 * t), Math.round(186 - 30 * t), Math.round(222 - 20 * t)] }
const SIZES = { gui: [256, 256], fp: [640, 400], fpl: [640, 400], side: [480, 400], tp: [480, 480] }
const CONTEXT_OF = { gui: 'gui', fp: 'firstperson_righthand', fpl: 'firstperson_lefthand', side: 'thirdperson_righthand', tp: 'thirdperson_righthand' }

const renderView = (items, view, W, H) => {
  const ctx = CONTEXT_OF[view]
  const models = items(ctx)
  if (view === 'gui') {
    const img = newImage(W, H, (x, y) => (x < 4 || y < 4 || x >= W - 4 || y >= H - 4) ? [55, 55, 55] : [139, 139, 139])
    const draw = (im, size, ox, oy) => {
      for (const m of models) {
        const M = itemMatrix(m.display.gui, false)
        // 1 block = size px, looking toward -z; a generated item (or gui_light front) is lit flat.
        drawQuads(im, m.quads, M, p => [ox + size / 2 + p[0] * size, oy + size / 2 - p[1] * size, -p[2]], m.generated || m.guiLight === 'front')
      }
    }
    draw(img, Math.min(W, H) - 8, (W - Math.min(W, H) + 8) / 2, (H - Math.min(W, H) + 8) / 2)
    // The real slot: 16 px, shown at 1x, 2x and 3x (GUI scales) in the bottom-left corner.
    const slot = newImage(16, 16, [139, 139, 139])
    draw(slot, 16, 0, 0)
    let ox = 6
    for (const k of [1, 2, 3]) {
      for (let y = 0; y < 16 * k; y++) {
        for (let x = 0; x < 16 * k; x++) {
          const s = (Math.floor(y / k) * 16 + Math.floor(x / k)) * 4
          const d = ((H - 6 - 16 * k + y) * W + ox + x) * 4
          if (d >= 0) img.px.set(slot.px.subarray(s, s + 4), d)
        }
      }
      ox += 16 * k + 4
    }
    return img
  }
  if (view === 'fp' || view === 'fpl') {
    const left = view === 'fpl'
    const img = newImage(W, H, SKY(W, H))
    const k = 1 / Math.tan(35 * RAD) * H / 2 // 70° vertical field of view
    const proj = p => p[2] > -0.05 ? null : [W / 2 + p[0] / -p[2] * k, H / 2 - p[1] / -p[2] * k, -p[2]]
    // ItemInHandRenderer.applyItemArmTransform: (±0.56, -0.52, -0.72), no swing, no equip dip.
    for (const m of models) drawQuads(img, m.quads, chain(M4.t(left ? -0.56 : 0.56, -0.52, -0.72), itemMatrix(m.display[ctx], left)), proj)
    for (let d = -8; d <= 8; d++) {
      if (Math.abs(d) < 3) continue
      for (const [x, y] of [[W / 2 + d, H / 2], [W / 2, H / 2 + d]]) img.px.set([255, 255, 255, 255], (Math.floor(y) * W + Math.floor(x)) * 4)
    }
    return img
  }
  // Third person: the player and the item in the right hand.
  const img = newImage(W, H, SKY(W, H))
  let proj
  if (view === 'side') {
    // From the player's right (-x) looking +x: screen right = forward (+z), up = +y; y 0.3-2.0 fits.
    const k = H / 1.9
    proj = p => [W * 0.42 + p[2] * k, H - (p[1] - 0.2) * k, p[0] + 10]
  } else {
    proj = lookAt([1.35, 1.55, 2.3], [-0.15, 0.95, 0.25], 45, W, H)
  }
  for (const part of playerQuads()) drawQuads(img, part.quads, part.m, proj)
  for (const m of models) drawQuads(img, m.quads, chain(HAND_RIGHT, itemMatrix(m.display[ctx], false)), proj)
  return img
}

// what: a model id, or item[@cmd]. Returns ctx -> [loaded models].
const makeItems = (S, what) => {
  const L = makeLoader(S)
  const m = what.match(/^([a-z0-9_.:-]+?)(?:@(.+))?$/)
  const isModel = what.includes('/')
  if (isModel || !m) {
    const model = L.loadModel(what)
    return () => [model]
  }
  const [ns, item] = split(m[1])
  const b = S.get(`assets/${ns}/items/${item}.json`)
  if (!b) throw new Error(`no item definition for ${m[1]} (assets/${ns}/items/${item}.json)`)
  const def = parseJson(b)
  const cmd = m[2]
  const data = { floats: [], strings: [] }
  if (cmd !== undefined) (isNaN(Number(cmd)) ? data.strings : data.floats).push(isNaN(Number(cmd)) ? cmd : Number(cmd))
  const cache = new Map()
  return ctx => {
    const display = ctx === 'gui' ? 'gui' : ctx
    const ids = resolveItemModel(def.model, { display, ...data })
    console.log(`${what} [${display}] -> ${ids.join(' + ') || 'nothing'}`)
    return ids.map(id => { if (!cache.has(id)) cache.set(id, L.loadModel(id)); return cache.get(id) })
  }
}

const render = (what, view, W, H, opts = {}) => {
  const S = openSources(opts.pack)
  const items = makeItems(S, what)
  const [dw, dh] = SIZES[view]
  const img = renderView(items, view, W || dw, H || dh)
  return { png: encode(img.W, img.H, img.px), tris: img.tris }
}
module.exports = { render, openSources, makeLoader, resolveItemModel, decodePng }

if (require.main === module) {
  const args = process.argv.slice(2)
  const opts = {}
  const pi = args.indexOf('--pack')
  if (pi >= 0) { opts.pack = args[pi + 1]; args.splice(pi, 2) }
  const [what, out, view = 'fp', W, H] = args
  if (!what || !out) {
    console.log('usage: render-item.js <model id | item[@cmd]> <out.png | prefix> [gui|fp|fpl|side|tp|all] [W H] [--pack zip]')
    process.exit(1)
  }
  const views = view === 'all' ? ['gui', 'fp', 'fpl', 'side', 'tp'] : [view]
  if (!views.every(v => SIZES[v])) throw new Error(`unknown view ${view}`)
  for (const v of views) {
    const file = view === 'all' ? `${out.replace(/\.png$/, '')}-${v}.png` : out
    const r = render(what, v, +W || 0, +H || 0, opts)
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true })
    fs.writeFileSync(file, r.png)
    console.log(`wrote ${file} (${r.tris} triangles)`)
  }
}
