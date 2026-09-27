// Signs the NPC skins (tools\skins\make-*-skins.js draws them into server\plugins\Citizens\skins\<id>.png) through
// Citizens, which uploads each PNG to MineSkin once (like the police skin), and writes the signed textures into
// server\plugins\Skript\scripts\skins.sk between its SKINS-BEGIN/END markers. The local server must be running.
// Usage: tools\node\node.exe tools\sign-skins.js [id ...]   (no ids: every PNG that isn't signed yet)
// Afterwards: /sk reload skins, then /dskins respawn (the mannequins come back with their skins).
const fs = require('fs')
const path = require('path')
const rconLib = require(path.join(__dirname, '..', 'bots', 'rcon'))

const ROOT = path.join(__dirname, '..')
const SKINS = path.join(ROOT, 'server', 'plugins', 'Citizens', 'skins')
const SAVES = path.join(ROOT, 'server', 'plugins', 'Citizens', 'saves.yml')
const LOG = path.join(ROOT, 'server', 'logs', 'latest.log')
const SK = path.join(ROOT, 'server', 'plugins', 'Skript', 'scripts', 'skins.sk')
const IDS = ['mara', 'boss', 'vic', 'broker', 'gun', 'gear', 'bag', 'tools', 'cars', 'garage', 'vinnie', 'dmitri', 'sal', 'rico', 'pike', 'lena', 'guard']
const sleep = ms => new Promise(r => setTimeout(r, ms))

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
const logSince = mark => fs.readFileSync(LOG, 'utf8').slice(mark)

// The skin block of NPC <n> in saves.yml (Citizens writes it on "citizens save").
const savedSkin = n => {
  const s = fs.readFileSync(SAVES, 'utf8')
  const start = s.search(new RegExp(`\\n  '?${n}'?:\\n`))
  if (start < 0) return null
  const rest = s.slice(start + 1)
  const next = rest.slice(1).search(/\n  '?\d+'?:\n/)
  const block = next < 0 ? rest : rest.slice(0, next + 1)
  const tex = (block.match(/textureRaw: '?([A-Za-z0-9+/=]+)'?/) || [])[1]
  const sig = (block.match(/signature: '?([A-Za-z0-9+/=]+)'?/) || [])[1]
  return tex && sig ? { texture: tex, signature: sig } : null
}

;(async () => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const signed = readSigned()
  const want = process.argv.slice(2).length ? process.argv.slice(2) : IDS.filter(id => !signed[id] && fs.existsSync(path.join(SKINS, `${id}.png`)))
  console.log(`signing: ${want.join(', ') || '(nothing)'}`)
  for (const id of want) {
    if (!fs.existsSync(path.join(SKINS, `${id}.png`))) { console.log(`${id}: no PNG`); continue }
    const mark = fs.readFileSync(LOG, 'utf8').length
    await cmd(`zzconsole npc create Skin${id} --at 0.5,68,-650.5,world --type PLAYER --nameplate false`)
    await sleep(1500)
    const made = logSince(mark).match(/Created .*Skin\w* .*?ID (\d+)|ID (\d+)[^\n]*Skin/)
    const n = made ? (made[1] || made[2]) : null
    if (!n) { console.log(`${id}: couldn't read the new NPC's id: ${logSince(mark).slice(-300)}`); continue }
    await cmd(`zzconsole npc skin --file ${id}.png --id ${n}`)
    let skin = null
    for (let i = 0; i < 30 && !skin; i++) {
      await sleep(3000)
      await cmd('zzconsole citizens save')
      await sleep(500)
      skin = savedSkin(n)
    }
    await cmd(`zzconsole npc remove ${n}`)
    if (!skin) { console.log(`${id}: MineSkin gave nothing within 90 s: ${logSince(mark).slice(-400)}`); continue }
    signed[id] = skin
    writeSigned(signed)
    console.log(`${id}: signed (npc ${n})`)
    await sleep(2000) // MineSkin's rate limit
  }
  rcon.close()
})()
