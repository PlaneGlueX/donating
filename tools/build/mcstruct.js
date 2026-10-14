// Builds in code (2026-10-14; the owner: the Jailbreak map, starting with the prison). A build script fills a Build
// (a sparse block buffer in world coordinates), then place() writes it as vanilla structure files (gzip NBT,
// DataVersion 4790 = 26.1.2) under server/world/generated/donating/structure/build/ and pastes them over RCON with
// `place template` in the target world, piece by piece (48x48 columns each, every chunk force-loaded while it pastes).
// Blocks are block-state strings: "stone", "oak_stairs[facing=north,half=bottom]", "air" (air is placed, so a build
// can carve). A template name is used once (the server caches templates by name), so each paste gets a fresh suffix.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const ROOT = path.join(__dirname, '..', '..')
const nbt = require(path.join(ROOT, 'bots', 'node_modules', 'prismarine-nbt'))
const rcon = require(path.join(ROOT, 'bots', 'rcon.js'))

const DATA_VERSION = 4790
const STRUCT_DIR = path.join(ROOT, 'server', 'world', 'generated', 'donating', 'structure', 'build')
const PIECE = 48
const ATTACHED = /(_bed|:ladder|_button|tripwire_hook|:lever|wall_torch|:lantern|_carpet|_candle|short_grass|tall_grass)$/

const parseState = s => {
  const m = /^(?:minecraft:)?([a-z0-9_]+)(?:\[(.*)\])?$/.exec(s)
  if (!m) throw new Error(`bad block state: ${s}`)
  const props = {}
  if (m[2]) for (const kv of m[2].split(',')) { const [k, v] = kv.split('='); props[k.trim()] = v.trim() }
  return { name: `minecraft:${m[1]}`, props }
}

class Build {
  constructor () { this.blocks = new Map() } // "x,y,z" -> state
  set (x, y, z, state) { this.blocks.set(`${x},${y},${z}`, state); return this }
  get (x, y, z) { return this.blocks.get(`${x},${y},${z}`) }
  // A filled box (corners inclusive, any order).
  fill (x1, y1, z1, x2, y2, z2, state) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) this.set(x, y, z, state)
    return this
  }
  // Only the shell of a box (walls, floor and ceiling); inside = a state for the inside or null to leave it.
  box (x1, y1, z1, x2, y2, z2, state, inside = null) {
    const [ax, bx, ay, by, az, bz] = [Math.min(x1, x2), Math.max(x1, x2), Math.min(y1, y2), Math.max(y1, y2), Math.min(z1, z2), Math.max(z1, z2)]
    for (let x = ax; x <= bx; x++) for (let y = ay; y <= by; y++) for (let z = az; z <= bz; z++) {
      const edge = x === ax || x === bx || y === ay || y === by || z === az || z === bz
      if (edge) this.set(x, y, z, state)
      else if (inside) this.set(x, y, z, inside)
    }
    return this
  }
  // Four walls only (no floor or ceiling).
  walls (x1, y1, z1, x2, y2, z2, state) {
    const [ax, bx, az, bz] = [Math.min(x1, x2), Math.max(x1, x2), Math.min(z1, z2), Math.max(z1, z2)]
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      for (let x = ax; x <= bx; x++) { this.set(x, y, az, state); this.set(x, y, bz, state) }
      for (let z = az; z <= bz; z++) { this.set(ax, y, z, state); this.set(bx, y, z, state) }
    }
    return this
  }
  // Another Build (or a function placing into this one) moved by dx, dy, dz.
  add (other, dx = 0, dy = 0, dz = 0) {
    for (const [k, s] of other.blocks) { const [x, y, z] = k.split(',').map(Number); this.set(x + dx, y + dy, z + dz, s) }
    return this
  }
  bounds () {
    let b = null
    for (const k of this.blocks.keys()) {
      const [x, y, z] = k.split(',').map(Number)
      if (!b) b = { x1: x, y1: y, z1: z, x2: x, y2: y, z2: z }
      else { b.x1 = Math.min(b.x1, x); b.y1 = Math.min(b.y1, y); b.z1 = Math.min(b.z1, z); b.x2 = Math.max(b.x2, x); b.y2 = Math.max(b.y2, y); b.z2 = Math.max(b.z2, z) }
    }
    return b
  }
}

// One structure file from the blocks inside [x0, x0+PIECE) x [z0, z0+PIECE).
function pieceNbt (blocks, ox, oy, oz, sx, sy, sz) {
  const palette = []
  const index = new Map()
  const list = []
  for (const { x, y, z, state } of blocks) {
    if (!index.has(state)) {
      const { name, props } = parseState(state)
      const entry = { Name: nbt.string(name) }
      if (Object.keys(props).length) entry.Properties = nbt.comp(Object.fromEntries(Object.entries(props).map(([k, v]) => [k, nbt.string(v)])))
      index.set(state, palette.length)
      palette.push(entry)
    }
    list.push({ pos: nbt.list(nbt.int([x - ox, y - oy, z - oz])), state: nbt.int(index.get(state)) })
  }
  const root = nbt.comp({
    DataVersion: nbt.int(DATA_VERSION),
    size: nbt.list(nbt.int([sx, sy, sz])),
    palette: nbt.list(nbt.comp(palette)),
    blocks: nbt.list(nbt.comp(list)),
    entities: nbt.list(nbt.comp([]))
  }, '')
  return zlib.gzipSync(nbt.writeUncompressed(root))
}

// Writes the build's pieces and pastes them into `world` (a Multiverse world name, e.g. "jailbreak"). Returns stats.
async function place (build, { world = 'jailbreak', name = 'build', log = console.log } = {}) {
  const b = build.bounds()
  if (!b) return { pieces: 0, blocks: 0 }
  fs.mkdirSync(STRUCT_DIR, { recursive: true })
  const stamp = Date.now().toString(36)
  // Two passes: blocks that hang on a neighbour (beds, ladders, hooks, buttons...) go after everything else, or a shape
  // update turns them to air when their support lands in a piece pasted later. A bed's foot goes with its head's piece.
  const groups = new Map()
  for (const [k, state] of build.blocks) {
    const [x, y, z] = k.split(',').map(Number)
    const { name, props } = parseState(state)
    const late = ATTACHED.test(name)
    let gx = x, gz = z
    if (/_bed$/.test(name) && props.part === 'foot') {
      const d = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[props.facing] || [0, 0]
      gx += d[0]; gz += d[1]
    }
    const key = `${late ? 1 : 0},${Math.floor((gx - b.x1) / PIECE)},${Math.floor((gz - b.z1) / PIECE)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ x, y, z, state })
  }
  const r = await rcon.connect()
  try {
    let n = 0
    const keys = [...groups.keys()].sort((p, q) => Number(p[0]) - Number(q[0])) // pass 0 first
    for (const key of keys) {
      const blocks = groups.get(key)
      const [pass, gx, gz] = key.split(',').map(Number)
      // the piece's own box (a bed's foot may sit one block past the grid cell)
      let ox = Infinity, oz = Infinity, mx = -Infinity, mz = -Infinity
      for (const p of blocks) { ox = Math.min(ox, p.x); oz = Math.min(oz, p.z); mx = Math.max(mx, p.x); mz = Math.max(mz, p.z) }
      const sx = mx - ox + 1, sz = mz - oz + 1
      const sy = b.y2 - b.y1 + 1
      const file = `${name}_${stamp}_${pass}_${gx}_${gz}`
      fs.writeFileSync(path.join(STRUCT_DIR, `${file}.nbt`), pieceNbt(blocks, ox, b.y1, oz, sx, sy, sz))
      const ex = `execute in minecraft:${world} run`
      await r.cmd(`${ex} forceload add ${ox} ${oz} ${ox + sx - 1} ${oz + sz - 1}`)
      let out = ''
      for (let t = 0; t < 40; t++) { // a force-loaded chunk loads a tick or more later
        out = await r.cmd(`${ex} place template donating:build/${file} ${ox} ${b.y1} ${oz}`)
        if (!/not loaded/i.test(out)) break
        await new Promise(res => setTimeout(res, 100))
      }
      await r.cmd(`${ex} forceload remove ${ox} ${oz} ${ox + sx - 1} ${oz + sz - 1}`)
      if (!/loaded template|placed/i.test(out)) throw new Error(`piece ${file}: ${out.trim()}`)
      n++
    }
    log(`placed ${build.blocks.size} blocks in ${n} piece(s), box ${b.x1},${b.y1},${b.z1} to ${b.x2},${b.y2},${b.z2} in ${world}`)
    return { pieces: n, blocks: build.blocks.size, bounds: b }
  } finally {
    r.close()
  }
}

module.exports = { Build, place, parseState }

// Self-check: node tools/build/mcstruct.js selftest -> pastes a 3x3x3 hollow stone cube with a glass center at 100 65 100.
if (require.main === module && process.argv[2] === 'selftest') {
  const b = new Build().box(100, 65, 100, 102, 67, 102, 'stone_bricks').set(101, 66, 101, 'glass')
    .set(101, 68, 101, 'oak_stairs[facing=north,half=bottom]')
  place(b, { name: 'selftest' }).then(s => { if (s.blocks !== 28) throw new Error(`expected 28 blocks, got ${s.blocks}`); console.log('selftest ok') }).catch(e => { console.error(e.message); process.exit(1) })
}
