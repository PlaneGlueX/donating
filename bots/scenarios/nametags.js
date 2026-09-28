// DonatingPhone's Nametags (owner, 2026-09-27: "hide nametags for players behind walls, keep them if out in the
// open"): TAB hides a player's name from a viewer while full opaque blocks stand between them, and shows it again at
// once in the open. Glass doesn't hide it, a low wall that leaves the head visible doesn't either, and the viewer's
// client gets TAB's team update (the name's visibility) both ways.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'TagA'
const B = 'TagB'
const Y = 200
const CHUNKS = '3090 3090 3110 3110'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  const wall = (block, top = Y + 3) => cmd(`fill 3100 ${Y} 3096 3100 ${top} 3104 ${block}`)
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 3092 ${Y - 1} 3092 3108 ${Y - 1} 3108 glass`)
    await wall('air', Y + 4)
    // Every team packet each bot gets: the name's visibility for a team (TAB gives each player their own team).
    const teams = { [A]: [], [B]: [] }
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`zzclear ${name}`)
      await cmd(`gamemode survival ${name}`)
      bots[name]._client.on('teams', p => teams[name].push({ at: Date.now(), ...p }))
    }
    await cmd(`minecraft:tp ${A} 3096.5 ${Y} 3100.5 -90 0`)
    await cmd(`minecraft:tp ${B} 3104.5 ${Y} 3100.5 90 0`)
    await sleep(3000)
    const st = async (v, t) => cmd(`dphone nametag ${v} ${t}`)
    const hidden = s => (s.match(/hidden=(\S+)/) || [])[1]

    let a = await st(A, B)
    let b = await st(B, A)
    check('in the open, 8 blocks apart: both names show (a clear line of sight)', hidden(a) === 'false' && hidden(b) === 'false' && /los=true/.test(a) && /running=true/.test(a), `${a} | ${b}`)

    // A stone wall between them: hidden from both within about half a second.
    let t = Date.now()
    await wall('stone')
    await sleep(1200)
    a = await st(A, B)
    b = await st(B, A)
    check('a stone wall between them: each name is hidden from the other', hidden(a) === 'true' && hidden(b) === 'true' && /los=false/.test(a), `${a} | ${b}`)
    const hideSent = teams[A].filter(p => p.at >= t && String(p.team).includes(B) && p.nameTagVisibility === 'never')
    check('...and A\'s client got TAB\'s team update for it (the name\'s visibility changed)', hideSent.length > 0, JSON.stringify(hideSent).slice(0, 400))

    // Glass: you can see through it, so the name shows.
    t = Date.now()
    await wall('glass')
    await sleep(1000)
    a = await st(A, B)
    check('the wall turned to glass: the name shows again at once', hidden(a) === 'false' && /los=true/.test(a), a)
    const showSent = teams[A].filter(p => p.at >= t && String(p.team).includes(B) && p.nameTagVisibility === 'always')
    check('...with another team update to A\'s client', showSent.length > 0, JSON.stringify(showSent).slice(0, 400))

    // A waist-high wall: the legs are hidden, the head isn't, so the name shows.
    await wall('air', Y + 4)
    await wall('stone', Y)
    await sleep(1200)
    a = await st(A, B)
    check('a one-block-high wall (the head in sight): the name still shows', hidden(a) === 'false', a)

    // Hidden again, then out in the open: shown.
    await wall('stone')
    await sleep(1200)
    const hid = await st(A, B)
    await wall('air', Y + 4)
    await sleep(700)
    a = await st(A, B)
    check('the wall gone: the name is back within a check (no waiting)', hidden(hid) === 'true' && hidden(a) === 'false', `${hid} | ${a}`)
  } finally {
    await wall('air', Y + 4).catch(() => {})
    for (const name of [A, B]) await rcon.cmd(`minecraft:tp ${name} ${FAR}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 3092 ${Y - 1} 3092 3108 ${Y - 1} 3108 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
