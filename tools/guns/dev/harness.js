// Runs the repo's gun modules (tools\guns\<id>.js) with a chosen pg kit into an out dir (assets/...), like
// make-item-art.js does, without touching the repo. Also zips the out dir for render-item.js --pack.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const REPO = path.resolve(__dirname, '../../..')
const TOOLS = path.join(REPO, 'tools')
const { canvas, shade } = require(path.join(TOOLS, 'png.js'))
// make-item-art.js's mirror/both/display/aim (copied: lines 1089-1153).
const src = fs.readFileSync(path.join(TOOLS, 'make-item-art.js'), 'utf8')
const a = src.indexOf('  const round = v => Math.round(v * 1000) / 1000')
const b = src.indexOf('  const pg = require(path.join(__dirname')
const helperSrc = src.slice(a, b)
const mk = new Function('write', 'canvas', 'shade', helperSrc + '\n return { round, norm, mirror, both, display, state, aim }')
const GUNS = ['gs50', 'uzi', 'r90', 'ak47', 'rev', 'tommy', 'm16', 'sniper', 'lmg']
const build = ({ kit, out, guns = GUNS, skins = true, wrap = null, modules = {} }) => {
  fs.rmSync(out, { recursive: true, force: true })
  const write = (rel, data) => {
    const file = path.join(out, 'assets', ...rel.split('/'))
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, typeof data === 'string' ? data : Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n')
  }
  const h = mk(write, canvas, shade)
  const pg = require(kit)({ write, canvas, shade, display: h.display, both: h.both })
  const pgUse = wrap ? { ...pg, pgGun: (name, spec) => pg.pgGun(name, wrap(name, spec)) } : pg
  const results = {}
  for (const id of guns) {
    const modFile = modules[id] ? path.resolve(modules[id]) : path.join(TOOLS, 'guns', id + '.js')
    delete require.cache[require.resolve(modFile)]
    const got = require(modFile)({ pg: pgUse, aim: h.aim, display: h.display, both: h.both, mirror: h.mirror, state: h.state, shade, canvas, write, id })
    results[id] = got
    // the item definition (feather-like) so render-item can draw feather@N with --pack: one file per gun
    write(`minecraft/items/feather.json`, { model: { type: 'minecraft:range_dispatch', property: 'minecraft:custom_model_data', index: 0, entries: Object.entries(Object.assign({}, ...Object.values(results))).map(([n, m]) => ({ threshold: +n, model: typeof m === 'string' ? { type: 'minecraft:model', model: m } : m })).sort((x, y) => x.threshold - y.threshold), fallback: { type: 'minecraft:model', model: 'minecraft:item/feather' } } })
  }
  if (skins) for (const sk of require(path.join(TOOLS, 'guns', 'skins.js'))) if (guns.includes(sk.gun)) pg.paintSkin('gun_' + sk.gun, sk.look, sk.theme)
  return { pg, results }
}
// A stored zip of a directory (for render-item.js --pack).
const zipDir = (dir, file) => {
  const files = []
  const walk = d => fs.readdirSync(d).forEach(n => { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : files.push(p) })
  walk(dir)
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc32 = buf => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const parts = []; const central = []; let off = 0
  for (const f of files) {
    const name = Buffer.from(path.relative(dir, f).split(path.sep).join('/'))
    const data = fs.readFileSync(f); const crc = crc32(data)
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26)
    parts.push(lh, name, data)
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42)
    central.push(ch, name)
    off += 30 + name.length + data.length
  }
  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16)
  fs.writeFileSync(file, Buffer.concat([...parts, cd, end]))
}
module.exports = { build, zipDir, GUNS, REPO, TOOLS }
