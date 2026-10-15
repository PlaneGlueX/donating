// Shared helpers for the prison-* scenarios (ESCAPE-SPEC 7.2). Not a scenario itself (it lives outside bots\scenarios,
// so run-all.js never runs it). Every helper talks to the local server over RCON and the zz test helpers of
// zz-testkit.sk (/zzjail, /zzjailtp, /zzjaildoor, /zzjailbreach, /zzjailcop, /zzjailcops, /zzjailcopto, /zzjailroster).
const fs = require('fs')
const path = require('path')
const { join, sleep, quit, messagesSince } = require('./lib')
const rconLib = require('./rcon')
const { Vec3 } = require('vec3')

const LOGS = path.join(__dirname, '..', 'server', 'plugins', 'Skript', 'logs')
const readF = f => { try { return fs.readFileSync(f, 'utf8') } catch (e) { return '' } }

// A log reader that only sees what was written after mark() (prison.log, jailcops.log, jailjobs.log).
function logTail (name) {
  const file = path.join(LOGS, `${name}.log`)
  let from = readF(file).length
  return {
    mark () { from = readF(file).length },
    since () { return readF(file).slice(from) },
    has (re) { return re.test(readF(file).slice(from)) }
  }
}

// The first value of key=... in a "k=v k=v" line ('' when missing or <none>).
function field (s, k) {
  const m = String(s).match(new RegExp(`(?:^|\\s)${k}=(\\S*)`))
  if (!m) return ''
  return m[1] === '<none>' ? '' : m[1]
}

async function start () {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).replace(/§./g, '').trim()
  const bots = {}

  const until = async (fn, ms = 5000, step = 250) => {
    const end = Date.now() + ms
    while (Date.now() < end) {
      const v = await fn()
      if (v) return v
      await sleep(step)
    }
    return fn()
  }
  const J = 'execute in minecraft:jailbreak run '
  // A command teleport (minecraft:tp): pvp.sk's 3 s teleport immunity follows it; the prison's gate refuses one that
  // takes an inmate out of the walls.
  const tp = (n, x, y, z, yaw = 0, pitch = 0) => cmd(`${J}minecraft:tp ${n} ${x} ${y} ${z} ${yaw} ${pitch}`)
  // A plugin teleport (zz-testkit /zzjailtp): no immunity, never refused.
  const jtp = (n, x, y, z, yaw = 0) => cmd(`zzjailtp ${n} ${x} ${y} ${z} ${yaw}`)
  const isBlock = async (x, y, z, b) => /passed/i.test(await cmd(`execute in minecraft:jailbreak if block ${x} ${y} ${z} ${b}`))
  const info = n => cmd(`zzjail ${n} info`)
  const state = (n, s) => cmd(`zzjail ${n} state ${s}`)
  const door = async name => cmd(`zzjaildoor ${name}`)
  const doorOpen = async name => /open=true/.test(await door(name))
  const breach = (id, act = '') => cmd(`zzjailbreach ${id} ${act}`.trim())
  const dim = async n => ((await cmd(`minecraft:data get entity ${n} Dimension`)).match(/"([^"]+)"/) || [])[1]
  const pos = async n => {
    const m = (await cmd(`minecraft:data get entity ${n} Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/)
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
  }
  const bal = async n => Number(((await cmd(`zzbal ${n}`)).match(/: (-?\d+)/) || [])[1])
  // A bot into the prison as an inmate: exempt while it moves (an "in" bot in the city is freed every second), a plugin
  // teleport, then "in". calm drops any hunt left from before.
  const into = async (n, x, y, z, yaw = 0, s = 'in') => {
    await state(n, 'off')
    await jtp(n, x, y, z, yaw)
    await sleep(300)
    await state(n, s)
    await cmd(`djailcops calm ${n}`)
  }
  const prisonOn = () => cmd('zzcfgbool prison::enabled true')
  const prisonOff = () => cmd('zzcfgbool prison::enabled false')
  const newBot = async (name, { fresh = false, pack } = {}) => {
    if (fresh) {
      await cmd(`zzforget ${name}`)
    }
    const bot = await join(name, pack ? { pack } : {})
    bots[name] = bot
    // Boss bars as plain text with their colour (bot.bars), the newest last. Colours: 0 pink, 1 blue, 2 red, 3 green,
    // 4 yellow, 5 purple, 6 white (a title update keeps the bar's last colour).
    bot.bars = []
    const shown = {}
    const COLORS = ['pink', 'blue', 'red', 'green', 'yellow', 'purple', 'white']
    const ChatMessage = require('prismarine-chat')(bot.registry)
    bot._client.on('boss_bar', p => {
      const id = String(p.entityUUID)
      const cur = shown[id] || (shown[id] = {})
      if (p.color !== undefined && p.color !== null) cur.color = COLORS[p.color] || String(p.color)
      if (p.title) {
        try { cur.text = ChatMessage.fromNotch(p.title).toString() } catch (e) { }
      }
      if (p.title || p.color !== undefined) bot.bars.push({ t: Date.now(), text: cur.text || '', color: cur.color || '' })
    })
    return bot
  }
  const drop = async name => { if (bots[name]) { await quit(bots[name]); delete bots[name] } }
  const said = (bot, re, since = 0) => messagesSince(bot, since).some(m => re.test(m.text))
  const text = (bot, since = 0) => messagesSince(bot, since).map(m => m.text).join(' | ')
  const barSince = (bot, re, since = 0) => bot.bars.some(b => b.t >= since && re.test(b.text))
  // The entity of a kind nearest to a spot (as the bot sees it).
  const near = (bot, name, at, maxd = 2) => Object.values(bot.entities)
    .filter(e => e.name === name && e.position.distanceTo(new Vec3(...at)) < maxd)
    .sort((a, b) => a.position.distanceTo(new Vec3(...at)) - b.position.distanceTo(new Vec3(...at)))[0]
  const playerEnt = (bot, name) => bot.players[name] && bot.players[name].entity
  // Holding right-click on an interaction box: a click every 200 ms for ms.
  const hold = async (bot, at, ms, maxd = 1.5, name = 'interaction') => {
    const e = near(bot, name, at, maxd)
    if (!e) return false
    const t0 = Date.now()
    while (Date.now() - t0 < ms) { await bot.activateEntity(e).catch(() => {}); await sleep(200) }
    return true
  }
  // A left click on a block (a punch): start and abort digging, as the client sends a click on an unbreakable block.
  let seq = 5000
  const punch = (bot, x, y, z, face = 5) => {
    bot._client.write('block_dig', { status: 0, location: { x, y, z }, face, sequence: seq++ })
    bot._client.write('block_dig', { status: 1, location: { x, y, z }, face, sequence: seq++ })
  }
  // Walks through the points [x, z] in turn (looking at each, forward held); false when a point isn't reached in ms.
  const walk = async (bot, points, ms = 4000) => {
    for (const [x, z] of points) {
      const t0 = Date.now()
      let ok = false
      bot.setControlState('forward', true)
      while (Date.now() - t0 < ms) {
        const p = bot.entity.position
        if (Math.hypot(p.x - x, p.z - z) < 0.35) { ok = true; break }
        await bot.lookAt(new Vec3(x, p.y + 1.62, z), true)
        await sleep(50)
      }
      bot.setControlState('forward', false)
      if (!ok) { bot.clearControlStates(); return false }
    }
    bot.clearControlStates()
    return true
  }
  const clickBlock = async (bot, x, y, z) => {
    const b = bot.blockAt(new Vec3(x, y, z))
    if (b) await bot.activateBlock(b).catch(() => {})
    return !!b
  }
  // Sneaking the way the 1.21.11 client says it (player_input with shift), kept up every 250 ms.
  const sneak = (bot, on) => {
    if (bot.sneakTimer) { clearInterval(bot.sneakTimer); bot.sneakTimer = null }
    const send = v => bot._client.write('player_input', { inputs: { forward: false, backward: false, left: false, right: false, jump: false, shift: v, sprint: false } })
    send(on)
    bot.setControlState('sneak', on)
    if (on) bot.sneakTimer = setInterval(() => send(true), 250)
  }
  // A melee hit the server sees as the bot's (vanilla /damage by the bot): Mineflayer's own swings at a bot often miss.
  const hit = (victim, attacker, hearts = 1) => cmd(`${J}minecraft:damage ${victim} ${hearts * 2} minecraft:player_attack by ${attacker}`)
  const cop = async route => cmd(`zzjailcop ${route}`)
  const copAt = async route => {
    const m = (await cop(route)).match(/at=([-\d.]+) ([-\d.]+) ([-\d.]+)/)
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
  }
  const copTo = (route, x, y, z) => cmd(`zzjailcopto ${route} ${x} ${y} ${z}`)
  // Cops that never notice anyone (no sight, no frisk, no C4 noise): for the scenarios that aren't about them. The
  // numbers come back with copsNormal (or core.sk's next loadSettings).
  const COP_SENSES = ['jailcop::notice::range', 'jailcop::notice::sneak', 'jailcop::notice::frisk', 'jailcop::loud-range']
  const copSenses = {}
  const copsBlind = async () => {
    for (const k of COP_SENSES) {
      if (copSenses[k] === undefined) copSenses[k] = Number(((await cmd(`zzcfg ${k}`)).match(/= (-?[\d.]+)/) || [])[1])
      await cmd(`zzcfgset ${k} 0`)
    }
  }
  const copsNormal = async () => {
    for (const k of COP_SENSES) if (Number.isFinite(copSenses[k])) await cmd(`zzcfgset ${k} ${copSenses[k]}`)
  }
  const close = async () => {
    await copsNormal()
    for (const name of Object.keys(bots)) await quit(bots[name])
    rcon.close()
  }
  return {
    rcon, cmd, bots, until, tp, jtp, isBlock, info, state, door, doorOpen, breach, dim, pos, bal, into, prisonOn, prisonOff,
    newBot, drop, said, text, barSince, near, playerEnt, hold, punch, walk, clickBlock, sneak, hit, cop, copAt, copTo, close, field,
    copsBlind, copsNormal,
    logs: { prison: logTail('prison'), cops: logTail('jailcops'), jobs: logTail('jailjobs') }, sleep, Vec3
  }
}

module.exports = { start, field, sleep, logTail }
