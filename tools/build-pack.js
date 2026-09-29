// Builds Donating's server resource pack into extras\packs\Donating-pack.zip:
//   1. WeaponMechanics' official pack (extras\packs\wm\WeaponMechanicsResourcePack-3.0.0.zip, fetched
//      by tools\fetch.ps1): the 3D gun models, gun sounds, crosshair and scope overlay. Its README
//      allows merging it into a server pack and hosting it for our players; not selling it, claiming
//      it as ours, or publishing it inside packs online. So it stays out of git (extras\ is ignored)
//      and its README is kept in the zip as WeaponMechanics-README.yml (credits).
//   2. MTVehicles' pack (extras\packs\MTVehicles_Pack_v0.2.3_1.21.4.zip, fetched by tools\fetch.ps1):
//      the car models, only the ones server\plugins\MTVehicles\vehicles.yml lists (a car is a diamond
//      hoe whose damage picks its model), plus the horn. The owner chose (2026-09-26) to merge and host
//      it like WeaponMechanics': only as Donating's pack, credits kept in the zip
//      (MTVehicles-credits.txt), never sold or published on its own. Fixes to its files: window
//      textures that point at pre-1.13 paths (blocks/glass_*) and unused placeholder slots; its own
//      atlas file is replaced by one that adds textures/custom/ to the block atlas. The car wraps
//      (tools\make-car-wraps.js: models in pack\, their damages in tools\car-wraps.generated.json) get
//      entries of their own in the car dispatch.
//   3. Our own pack\ on top (the phone, the bag, ammo, the XP bar, the tab-list logo, the car wraps).
// Merging: sounds.json is joined event by event, atlases and fonts list by list (a clash stops the
// build); any other file in two sources stops the build unless it's ours (pack\ wins, with a note).
// Paths inside the zip use forward slashes (Windows PowerShell's Compress-Archive writes backslashes,
// which Minecraft can't read). Same input, same zip: entries are sorted and dated 1980-01-01.
//
// Usage: tools\node\node.exe tools\build-pack.js [--cars all]   (all = every car in MTVehicles' pack)
// Local test: tools\node\node.exe tools\serve-pack.js extras\packs\Donating-pack.zip
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const repo = path.join(__dirname, '..')
const root = path.join(repo, 'pack')
const wmZip = path.join(repo, 'extras', 'packs', 'wm', 'WeaponMechanicsResourcePack-3.0.0.zip')
const mtvZip = path.join(repo, 'extras', 'packs', 'MTVehicles_Pack_v0.2.3_1.21.4.zip')
const vehiclesYml = path.join(repo, 'server', 'plugins', 'MTVehicles', 'vehicles.yml')
const mtvConfig = path.join(repo, 'server', 'plugins', 'MTVehicles', 'config.yml')
const mtvCredits = path.join(repo, 'server', 'plugins', 'MTVehicles', 'credits.txt')
const carWraps = path.join(__dirname, 'car-wraps.generated.json')
const out = path.join(repo, 'extras', 'packs', 'Donating-pack.zip')
const allCars = process.argv.includes('--cars') && process.argv[process.argv.indexOf('--cars') + 1] === 'all'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = buf => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// A minimal zip reader: the central directory lists every file and where its data starts.
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
const parseJson = b => JSON.parse(b.toString('utf8').replace(/^\uFEFF/, ''))
const toJson = o => Buffer.from(JSON.stringify(o))

// ---------- Entries, with the merge guard ----------
const entries = new Map() // name -> { data, from }
const merged = []
const MERGE = {
  // sounds.json: one object of sound events per namespace; the union of keys, a clash stops the build.
  sounds: (a, b, name, fa, fb) => {
    const A = parseJson(a)
    const B = parseJson(b)
    for (const k of Object.keys(B)) if (k in A) throw new Error(`${name}: sound event ${k} is in both ${fa} and ${fb}`)
    return toJson({ ...A, ...B })
  },
  atlas: (a, b) => toJson({ sources: [...parseJson(a).sources, ...parseJson(b).sources] }),
  font: (a, b) => toJson({ providers: [...parseJson(a).providers, ...parseJson(b).providers] })
}
const kindOf = n => /^assets\/[^/]+\/sounds\.json$/.test(n) ? 'sounds'
  : /^assets\/[^/]+\/atlases\/[^/]+\.json$/.test(n) ? 'atlas'
    : /^assets\/[^/]+\/font\/[^/]+\.json$/.test(n) ? 'font' : null
const put = (name, data, from, ours = false) => {
  const prev = entries.get(name)
  if (!prev) { entries.set(name, { data, from }); return }
  const kind = kindOf(name)
  if (kind) {
    entries.set(name, { data: MERGE[kind](prev.data, data, name, prev.from, from), from: `${prev.from}+${from}` })
    merged.push(`${name} (${prev.from} + ${from})`)
    return
  }
  if (/^assets\/[^/]+\/items\/[^/]+\.json$/.test(name) && !ours) throw new Error(`${name} comes from ${prev.from} and ${from}: item definitions need a hand-written merge`)
  if (!ours) throw new Error(`${name} comes from ${prev.from} and ${from}`)
  console.warn(`note: ${name} from ${prev.from} replaced by ours`)
  entries.set(name, { data, from })
}

// ---------- 1. WeaponMechanics' pack ----------
if (fs.existsSync(wmZip)) {
  let n = 0
  for (const [name, data] of readZip(wmZip)) {
    if (name === 'pack.mcmeta' || name === 'pack.png') continue
    put(name === 'README.yml' ? 'WeaponMechanics-README.yml' : name, data, 'wm')
    n++
  }
  console.log(`merged ${n} files from ${path.basename(wmZip)}`)
} else {
  console.warn(`WARNING: ${wmZip} is missing (run tools\\fetch.ps1): guns will look like feathers`)
}

// ---------- 2. MTVehicles' pack (the cars vehicles.yml lists) ----------
if (fs.existsSync(mtvZip)) {
  const mtv = readZip(mtvZip)
  const yml = fs.readFileSync(vehiclesYml, 'utf8')
  const cfg = fs.readFileSync(mtvConfig, 'utf8')
  const keep = new Set([...yml.matchAll(/itemDamage:\s*(\d+)/g)].map(m => +m[1]))
  if (/vehicleType:\s*HELICOPTER/.test(yml)) keep.add(1058) // the blades (VehicleUtils.spawnVehicle)
  if (/^fuelEnabled:\s*true/m.test(cfg)) { keep.add(58); keep.add(59) } // jerry cans (VehicleFuel)
  const horn = (cfg.match(/^hornType:\s*"?([^"\s]+)"?/m) || [])[1]
  const MAX_DAMAGE = 1561 // a diamond hoe's
  const hoe = parseJson(mtv.get('assets/minecraft/items/diamond_hoe.json'))
  const dispatch = hoe.model.on_false
  // Thresholds are damage / 1562; the client picks by damage / 1561 (verified: every car maps to itself).
  const damageOf = e => Math.round(e.threshold * (MAX_DAMAGE + 1))
  const kept = dispatch.entries.filter(e => e.threshold === 0 || allCars || keep.has(damageOf(e)))
  // Car wraps and colors MTVehicles' dispatch doesn't have (tools\make-car-wraps.js writes the list): entries of
  // their own, the same way, in threshold order with the others. Their models are ours (pack\, step 3) or MTVehicles'.
  const extra = fs.existsSync(carWraps) ? JSON.parse(fs.readFileSync(carWraps, 'utf8')) : []
  const inDispatch = new Set(dispatch.entries.map(damageOf))
  let extraKept = 0
  for (const w of extra) {
    if (!Number.isInteger(w.damage) || w.damage < 1 || w.damage >= MAX_DAMAGE) throw new Error(`car-wraps.generated.json: bad damage ${w.damage}`)
    if (inDispatch.has(w.damage)) throw new Error(`car-wraps.generated.json: damage ${w.damage} is in MTVehicles' dispatch already`)
    inDispatch.add(w.damage)
    if (!allCars && !keep.has(w.damage)) continue
    kept.push({ threshold: w.damage / (MAX_DAMAGE + 1), model: { type: 'model', model: w.model } })
    extraKept++
  }
  kept.sort((a, b) => a.threshold - b.threshold)
  put('assets/minecraft/items/diamond_hoe.json', toJson({ ...hoe, model: { ...hoe.model, on_false: { ...dispatch, entries: kept } } }), 'mtv')
  // Pre-1.13 texture paths -> today's vanilla textures (the pack's own blocks/ copies are in no atlas).
  const RENAME = {
    'blocks/glass_gray': 'block/gray_stained_glass',
    'blocks/glass_light_blue': 'block/light_blue_stained_glass',
    'blocks/glass_lime': 'block/lime_stained_glass',
    'blocks/glass_yellow': 'block/yellow_stained_glass',
    'blocks/mushroom_block_skin_red': 'block/red_mushroom_block',
    'blocks/concrete_yellow': 'block/yellow_concrete',
    'blocks/concrete_black': 'block/black_concrete',
    'blocks/water_still': 'block/water_still'
  }
  const models = new Map()
  const textures = new Set()
  const problems = []
  const oursUsed = new Set()
  const ourFile = rel => path.join(root, ...rel.split('/'))
  const addModel = id => {
    id = id.replace(/^minecraft:/, '')
    if (models.has(id) || oursUsed.has(id) || id.startsWith('item/') || id.startsWith('block/')) return
    // Ours (a car wrap): step 3 adds it; here only the MTVehicles textures and models it uses.
    if (fs.existsSync(ourFile(`assets/minecraft/models/${id}.json`))) {
      oursUsed.add(id)
      const j = parseJson(fs.readFileSync(ourFile(`assets/minecraft/models/${id}.json`)))
      for (const v of Object.values(j.textures || {})) {
        if (typeof v !== 'string' || v.startsWith('#')) continue
        const t = v.replace(/^minecraft:/, '')
        if (!fs.existsSync(ourFile(`assets/minecraft/textures/${t}.png`)) && mtv.has(`assets/minecraft/textures/${t}.png`)) textures.add(t)
      }
      if (j.parent) addModel(j.parent)
      return
    }
    const file = `assets/minecraft/models/${id}.json`
    if (!mtv.has(file)) { problems.push(`missing model ${id}`); models.set(id, null); return }
    const j = parseJson(mtv.get(file))
    for (const [k, v] of Object.entries(j.textures || {})) {
      if (typeof v !== 'string' || v.startsWith('#')) continue
      const t = v.replace(/^minecraft:/, '')
      if (RENAME[t]) j.textures[k] = RENAME[t]
      else if (t.startsWith('items/')) { // unused placeholders (particle, texture): the model's own skin
        if (k === 'particle' && j.textures.voxels_atlas) j.textures[k] = '#voxels_atlas'
        else delete j.textures[k]
      } else textures.add(t)
    }
    // A model with textures but no particle one logs "Missing texture references": use its first texture.
    if (j.textures && !j.textures.particle) {
      const first = Object.keys(j.textures).find(k => typeof j.textures[k] === 'string')
      if (first) j.textures.particle = `#${first}`
    }
    models.set(id, j)
    if (j.parent) addModel(j.parent)
  }
  for (const e of kept) addModel(e.model.model)
  for (const [id, j] of models) if (j) put(`assets/minecraft/models/${id}.json`, toJson(j), 'mtv')
  let px = 0
  for (const t of textures) {
    const f = `assets/minecraft/textures/${t}.png`
    if (!mtv.has(f)) { problems.push(`missing texture ${t}`); continue }
    const png = mtv.get(f)
    px += png.readUInt32BE(16) * png.readUInt32BE(20)
    put(f, png, 'mtv')
    if (mtv.has(f + '.mcmeta')) put(f + '.mcmeta', mtv.get(f + '.mcmeta'), 'mtv')
  }
  // The car textures live in textures/custom/: add that folder to the (mipmapped) block atlas.
  put('assets/minecraft/atlases/blocks.json', toJson({ sources: [{ type: 'directory', source: 'custom', prefix: 'custom/' }] }), 'mtv')
  // Sounds: only events whose files the pack ships, and only the configured horn (--cars all: every horn).
  const snd = parseJson(mtv.get('assets/minecraft/sounds.json'))
  const keepSnd = {}
  for (const [k, v] of Object.entries(snd)) {
    const files = v.sounds.map(s => typeof s === 'string' ? s : s.name)
    if (files.every(n => mtv.has(`assets/minecraft/sounds/${n}.ogg`)) && (allCars || k === horn)) {
      keepSnd[k] = v
      for (const n of files) put(`assets/minecraft/sounds/${n}.ogg`, mtv.get(`assets/minecraft/sounds/${n}.ogg`), 'mtv')
    }
  }
  put('assets/minecraft/sounds.json', toJson(keepSnd), 'mtv')
  const credits = fs.existsSync(mtvCredits) ? fs.readFileSync(mtvCredits, 'utf8') : ''
  put('MTVehicles-credits.txt', Buffer.from(credits +
    '\nVEHICLE MODELS (from the models\' own comments): Spooky_538 and Groanz (Cubik Studio), sebxter (boats).\n' +
    'MTVehicles: https://github.com/MTVehicles/MinetopiaVehicles (MIT, Copyright (c) 2020 GamerJoep_), pack: https://mtvehicles.nl/#resource-pack\n' +
    'Merged into the Donating server pack for its players only; not sold or published on its own.\n'), 'mtv')
  console.log(`merged ${kept.length - 1 - extraKept} cars from ${path.basename(mtvZip)}: ${models.size} models, ${textures.size} textures (${px} px), horn ${Object.keys(keepSnd).join(',') || 'none'}`)
  if (extra.length) console.log(`car wraps and extra colors: ${extraKept} dispatch entries (${oursUsed.size} of our models)`)
  // The wrap models are generated, not tracked in git: without them every wrapped car would be a missing model.
  if (problems.some(p => p.includes('custom/wraps/'))) throw new Error('car wrap models are missing: run tools\\node\\node.exe tools\\make-car-wraps.js first')
  if (problems.length) console.warn(`MTVehicles pack problems: ${problems.join(', ')}`)
} else {
  console.warn(`WARNING: ${mtvZip} is missing (run tools\\fetch.ps1): cars will look like diamond hoes`)
}

// ---------- 3. Our pack (wins over everything but merged JSON) ----------
let ours = 0
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full)
    else {
      put(path.relative(root, full).split(path.sep).join('/'), fs.readFileSync(full), 'ours', true)
      ours++
    }
  }
}
walk(root)
if (merged.length) console.log(`merged JSON: ${merged.join(', ')}`)

// ---------- Write ----------
const locals = []
const centrals = []
let offset = 0
const names = [...entries.keys()].sort()
for (const n of names) {
  const name = Buffer.from(n, 'utf8')
  const data = entries.get(n).data
  const packed = zlib.deflateRawSync(data, { level: 9 })
  const crc = crc32(data)
  const head = Buffer.alloc(30)
  head.writeUInt32LE(0x04034b50, 0)
  head.writeUInt16LE(20, 4) // version needed
  head.writeUInt16LE(0x0800, 6) // UTF-8 names
  head.writeUInt16LE(8, 8) // deflate
  head.writeUInt32LE(0x00210000, 10) // time 00:00, date 1980-01-01 (fixed: same input, same zip)
  head.writeUInt32LE(crc, 14)
  head.writeUInt32LE(packed.length, 18)
  head.writeUInt32LE(data.length, 22)
  head.writeUInt16LE(name.length, 26)
  locals.push(head, name, packed)
  const cen = Buffer.alloc(46)
  cen.writeUInt32LE(0x02014b50, 0)
  cen.writeUInt16LE(20, 4)
  cen.writeUInt16LE(20, 6)
  cen.writeUInt16LE(0x0800, 8)
  cen.writeUInt16LE(8, 10)
  cen.writeUInt32LE(0x00210000, 12)
  cen.writeUInt32LE(crc, 16)
  cen.writeUInt32LE(packed.length, 20)
  cen.writeUInt32LE(data.length, 24)
  cen.writeUInt16LE(name.length, 28)
  cen.writeUInt32LE(offset, 42)
  centrals.push(cen, name)
  offset += head.length + name.length + packed.length
}
const central = Buffer.concat(centrals)
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0)
end.writeUInt16LE(names.length, 8)
end.writeUInt16LE(names.length, 10)
end.writeUInt32LE(central.length, 12)
end.writeUInt32LE(offset, 16)

fs.mkdirSync(path.dirname(out), { recursive: true })
const zip = Buffer.concat([...locals, central, end])
fs.writeFileSync(out, zip)
console.log(`wrote ${out} (${names.length} files, ${ours} ours, ${(zip.length / 1048576).toFixed(2)} MB)`)
