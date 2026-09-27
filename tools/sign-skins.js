// Signs the NPC skins (tools\skins\make-*-skins.js draws them into server\plugins\Citizens\skins\<id>.png) through
// Citizens, which uploads each PNG to MineSkin once (like the police skin), and writes the signed textures into
// server\plugins\Skript\scripts\skins.sk between its SKINS-BEGIN/END markers. The local server must be running.
// Usage: tools\node\node.exe tools\sign-skins.js [id ...]   (no ids: every PNG that isn't signed yet)
//        tools\node\node.exe tools\sign-skins.js --check    (compares every signed skin with its PNG)
// Afterwards: /sk reload skins, then /dskins respawn (the mannequins come back with their skins).
// A signed skin is only kept when its texture's pixels match the PNG: the signing NPC's name has a space ("Skin bag"),
// so Citizens never fetches a real Minecraft account's skin for it (review, 2026-09-27: "Skinbag" and "skinguard" are
// real accounts, and their skins were saved before the upload finished).
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const http = require('http')
const rconLib = require(path.join(__dirname, '..', 'bots', 'rcon'))

const ROOT = path.join(__dirname, '..')
const SKINS = path.join(ROOT, 'server', 'plugins', 'Citizens', 'skins')
const SAVES = path.join(ROOT, 'server', 'plugins', 'Citizens', 'saves.yml')
const LOG = path.join(ROOT, 'server', 'logs', 'latest.log')
const SK = path.join(ROOT, 'server', 'plugins', 'Skript', 'scripts', 'skins.sk')
const IDS = ['mara', 'boss', 'vic', 'broker', 'gun', 'gear', 'bag', 'tools', 'cars', 'garage', 'vinnie', 'dmitri', 'sal', 'rico', 'pike', 'lena', 'guard']
const sleep = ms => new Promise(r => setTimeout(r, ms))

// A minimal PNG decoder (8-bit RGB or RGBA, not interlaced): the pixels as RGBA.
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
const get = url => new Promise((res, rej) => http.get(url, r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => res(Buffer.concat(c))) }).on('error', rej))
// Whether a signed texture shows exactly our PNG (transparent pixels in both count as equal).
const matches = async (id, texture) => {
  try {
    const j = JSON.parse(Buffer.from(texture, 'base64').toString())
    const remote = decodePng(await get(j.textures.SKIN.url))
    const mine = decodePng(fs.readFileSync(path.join(SKINS, `${id}.png`)))
    if (!remote || !mine || remote.w !== mine.w || remote.h !== mine.h) return false
    for (let i = 0; i < mine.px.length; i += 4) {
      if (mine.px[i + 3] === 0 && remote.px[i + 3] === 0) continue
      for (let k = 0; k < 4; k++) if (mine.px[i + k] !== remote.px[i + k]) return false
    }
    return true
  } catch (e) { return false }
}

// The skins already in skins.sk: id -> { texture, signature }.
const readSigned = () => {
  const s = fs.readFileSync(SK, 'utf8')
  const out = {}
  for (const m of s.matchAll(/set \{-skin::([a-z]+)::(texture|signature)\} to "([^"]+)"/g)) {
    out[m[1]] = out[m[1]] || {}
    out[m[1]][m[2]] = m[3]
  }
  return out
}
const writeSigned = signed => {
  let s = fs.readFileSync(SK, 'utf8')
  const lines = Object.keys(signed).filter(id => signed[id].texture && signed[id].signature).sort()
    .flatMap(id => [`\tset {-skin::${id}::texture} to "${signed[id].texture}"`, `\tset {-skin::${id}::signature} to "${signed[id].signature}"`])
  s = s.replace(/(\t# SKINS-BEGIN[^\n]*\n)[\s\S]*?(\t# SKINS-END)/, (_, a, b) => a + lines.map(l => l + '\n').join('') + b)
  fs.writeFileSync(SK, s)
}
const logSince = mark => { const s = fs.readFileSync(LOG, 'utf8'); return s.length >= mark ? s.slice(mark) : s }

// The NPC blocks of saves.yml: [{ n, name, texture, signature }] (Citizens writes it on "citizens save").
const savedNpcs = () => {
  const s = fs.readFileSync(SAVES, 'utf8')
  const out = []
  const re = /\n  '?(\d+)'?:\n/g
  const starts = []
  let m
  while ((m = re.exec(s))) starts.push({ n: m[1], at: m.index })
  for (let i = 0; i < starts.length; i++) {
    const block = s.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : s.length)
    out.push({
      n: starts[i].n,
      name: (block.match(/\n    name: '?([^'\n]+)'?/) || [])[1] || '',
      texture: (block.match(/textureRaw: '?([A-Za-z0-9+/=]+)'?/) || [])[1],
      signature: (block.match(/signature: '?([A-Za-z0-9+/=]+)'?/) || [])[1],
    })
  }
  return out
}

;(async () => {
  if (process.argv[2] === '--check') {
    const signed = readSigned()
    for (const id of Object.keys(signed).sort()) console.log(`${id.padEnd(8)} ${(await matches(id, signed[id].texture)) ? 'MATCH' : 'DIFFERENT'}`)
    return
  }
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const signed = readSigned()
  const want = process.argv.slice(2).length ? process.argv.slice(2) : IDS.filter(id => !signed[id] && fs.existsSync(path.join(SKINS, `${id}.png`)))
  console.log(`signing: ${want.join(', ') || '(nothing)'}`)
  for (const id of want) {
    if (!fs.existsSync(path.join(SKINS, `${id}.png`))) { console.log(`${id}: no PNG`); continue }
    const name = `Skin ${id}` // a space: never a real Minecraft account (Citizens would show that account's skin)
    let n = null
    try {
      const mark = fs.readFileSync(LOG, 'utf8').length
      await cmd(`zzconsole npc create ${name} --at 0.5,68,-650.5,world --type PLAYER --nameplate false`)
      await sleep(1500)
      await cmd('zzconsole citizens save')
      await sleep(500)
      const made = logSince(mark).match(/ID (\d+)/)
      n = made ? made[1] : ((savedNpcs().filter(x => x.name === name).pop() || {}).n || null)
      if (!n) { console.log(`${id}: couldn't find the new NPC`); continue }
      await cmd(`zzconsole npc skin --file ${id}.png --id ${n}`)
      let skin = null
      for (let i = 0; i < 30 && !skin; i++) {
        await sleep(3000)
        await cmd('zzconsole citizens save')
        await sleep(500)
        const x = savedNpcs().find(y => y.n === n)
        if (x && x.texture && x.signature && await matches(id, x.texture)) skin = { texture: x.texture, signature: x.signature }
      }
      if (!skin) { console.log(`${id}: no matching signed skin within 90 s: ${logSince(mark).slice(-300)}`); continue }
      signed[id] = skin
      writeSigned(signed)
      console.log(`${id}: signed and checked (npc ${n})`)
    } finally {
      // Never leave a signing NPC behind (also one whose id came from saves.yml), and save its removal.
      for (const x of savedNpcs().filter(y => y.name === name || y.n === n)) await cmd(`zzconsole npc remove ${x.n}`)
      await cmd('zzconsole citizens save')
    }
    await sleep(2000) // MineSkin's rate limit
  }
  rcon.close()
})()
