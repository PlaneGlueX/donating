// Builds Donating's server resource pack into extras\packs\Donating-pack.zip:
//   1. WeaponMechanics' official pack (extras\packs\wm\WeaponMechanicsResourcePack-3.0.0.zip, fetched
//      by tools\fetch.ps1): the 3D gun models, gun sounds, crosshair and scope overlay. Its README
//      allows merging it into a server pack and hosting it for our players; not selling it, claiming
//      it as ours, or publishing it inside packs online. So it stays out of git (extras\ is ignored)
//      and its README is kept in the zip as WeaponMechanics-README.yml (credits).
//   2. Our own pack\ on top (the phone, the bag, ammo, the XP bar, the tab-list logo). A file in both
//      comes from pack\.
// Paths inside the zip use forward slashes (Windows PowerShell's Compress-Archive writes backslashes,
// which Minecraft can't read). Same input, same zip: entries are sorted and dated 1980-01-01.
//
// Usage: tools\node\node.exe tools\build-pack.js
// Local test: tools\node\node.exe tools\serve-pack.js extras\packs\Donating-pack.zip
// Still to merge later: MTVehicles' pack (see CLAUDE.md, Later: resource packs).
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const root = path.join(__dirname, '..', 'pack')
const wmZip = path.join(__dirname, '..', 'extras', 'packs', 'wm', 'WeaponMechanicsResourcePack-3.0.0.zip')
const out = path.join(__dirname, '..', 'extras', 'packs', 'Donating-pack.zip')

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

// name (forward slashes) -> file contents
const entries = new Map()

// ---------- 1. WeaponMechanics' pack ----------
// A minimal zip reader: the central directory lists every file and where its data starts.
const readZip = file => {
  const buf = fs.readFileSync(file)
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error(`not a zip: ${file}`)
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const files = []
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
    files.push({ name, data: method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw) })
  }
  return files
}
if (fs.existsSync(wmZip)) {
  let n = 0
  for (const f of readZip(wmZip)) {
    if (f.name === 'pack.mcmeta' || f.name === 'pack.png') continue
    entries.set(f.name === 'README.yml' ? 'WeaponMechanics-README.yml' : f.name, f.data)
    n++
  }
  console.log(`merged ${n} files from ${path.basename(wmZip)}`)
} else {
  console.warn(`WARNING: ${wmZip} is missing (run tools\\fetch.ps1): guns will look like feathers`)
}

// ---------- 2. Our pack ----------
let ours = 0
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full)
    else {
      entries.set(path.relative(root, full).split(path.sep).join('/'), fs.readFileSync(full))
      ours++
    }
  }
}
walk(root)

// ---------- Write ----------
const locals = []
const centrals = []
let offset = 0
const names = [...entries.keys()].sort()
for (const n of names) {
  const name = Buffer.from(n, 'utf8')
  const data = entries.get(n)
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
console.log(`wrote ${out} (${names.length} files, ${ours} ours, ${(zip.length / 1024).toFixed(0)} KB)`)
