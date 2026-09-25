// Zips Donating's own resource pack (pack\) into extras\packs\Donating-pack.zip.
// Paths inside the zip use forward slashes (Windows PowerShell's Compress-Archive writes
// backslashes, which Minecraft can't read).
//
// Usage: tools\node\node.exe tools\build-pack.js
// Local test: tools\node\node.exe tools\serve-pack.js extras\packs\Donating-pack.zip
// Minehut takes one pack: merge these files with the MTVehicles and WeaponMechanics packs first
// (see CLAUDE.md, Later: resource packs).
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const root = path.join(__dirname, '..', 'pack')
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

const files = []
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full)
    else files.push(full)
  }
}
walk(root)

const locals = []
const centrals = []
let offset = 0
for (const full of files) {
  const name = Buffer.from(path.relative(root, full).split(path.sep).join('/'), 'utf8')
  const data = fs.readFileSync(full)
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
end.writeUInt16LE(files.length, 8)
end.writeUInt16LE(files.length, 10)
end.writeUInt32LE(central.length, 12)
end.writeUInt32LE(offset, 16)

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, Buffer.concat([...locals, central, end]))
console.log(`wrote ${out} (${files.length} files)`)
