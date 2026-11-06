// 20 players at once on the real map, each doing something else (owner, 2026-11-04: "test everything with 20 people on the
// server all at once doing different things ... try to find anything that breaks when multiple people use it").
// `bots/run.js swarm [minutes=8] [role prefixes...]`: not in run-all (a benchmark, like load).
//   Sw C1-3   fresh players on the prison course, then escaping       Sw E1-3  escaping (ladder, keycard, keycard: one front gate)
//   Sw D1-3   robbing the Donut Shop together                         Sw T1-2  car contracts to the one chop shop
//   Sw H1-7   crews (three pairs and one alone) through every other heist      Sw S1-2  phones, shops, ATMs, the casino, trades
// A role's own failures are one kind of finding. The monitors look for what only shows with several players: a pile paying
// twice, a robber the heist has lost count of, script errors, kicks, placeholders in chat, heists that never come back.
// A cop catching a bot is a normal outcome, not a finding. Every detail lands in bots/results/swarm.findings.json.
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { quit } = require('../lib')
const rconLib = require('../rcon')
const { start, field, sleep } = require('../prisonlib')
const { Vec3 } = require('vec3')
const NORTH = require('./north').HEISTS
const CITY = require('./city').HEISTS
const IRON = require('./iron').HEISTS

const ROOT = path.join(__dirname, '..', '..')
const SERVER_LOG = path.join(ROOT, 'server', 'logs', 'latest.log')
const LOOT_LOG = path.join(ROOT, 'server', 'plugins', 'Skript', 'logs', 'loot.log')
const CT_LOG = path.join(ROOT, 'server', 'plugins', 'Skript', 'logs', 'contracts.log')
const PRISON_LOG = path.join(ROOT, 'server', 'plugins', 'Skript', 'logs', 'prison.log')
const BAG_LOG = path.join(ROOT, 'server', 'plugins', 'Skript', 'logs', 'bag.log')
const JCMD = path.join(ROOT, 'tools', 'jdk25', 'bin', 'jcmd.exe')
const size = f => (fs.existsSync(f) ? fs.statSync(f).size : 0)
const since = (f, from) => (fs.existsSync(f) ? fs.readFileSync(f).subarray(from).toString('utf8') : '')

const HEISTS = {
  ...NORTH, ...CITY, ...IRON,
  gas: { level: 1, clerk: true, inside: [388.5, 65, 915.5], take: { stand: [388.5, 65, 915.5], aim: [386.5, 66, 915.5] } }
}
const DONUT = { stand: [414.5, 65, 801.5], aim: [412.5, 66, 801.5] }
const ALL = [...Object.keys(HEISTS), 'donut']
// What else a crew does in a heist: the new mechanics, which are shared by design (blast range, one switch, two readers).
const EXTRA = {
  bank: [{ name: 'the Breaker', stand: [604.5, 58, 311.5], aim: [606.5, 58.5, 311.5], ms: 3600 }, { name: 'the blast door', stand: [597.5, 49, 299.5], aim: [595.5, 50, 300], ms: 2800 }],
  reserve: [{ name: 'the blast door', stand: [698.5, 53, 170.5], aim: [696.5, 55, 170.5], ms: 2800 }],
  jewelry: [{ name: 'the Fuse box', stand: [627.5, 81, 389.5], aim: [629.5, 81.5, 389.5], ms: 3600 }],
  casino: [{ name: 'the Security PC', stand: [852.5, 66, 344.5], aim: [851.5, 66.5, 344.5], ms: 3600 }]
}
const CREWS = [
  ['jewelry', 'club', 'gallery', 'pawn', 'power', 'bank', 'casino', 'gas', 'reserve', 'carwash', 'evidence', 'mansion'],
  ['bank', 'reserve', 'carwash', 'evidence', 'mansion', 'gas', 'jewelry', 'club', 'gallery', 'pawn', 'power', 'casino'],
  ['casino', 'mansion', 'power', 'gas', 'club', 'reserve', 'gallery', 'bank', 'jewelry', 'evidence', 'pawn', 'carwash'],
  ['reserve', 'gallery', 'jewelry', 'bank', 'pawn', 'evidence', 'carwash', 'casino', 'mansion', 'club', 'power', 'gas']
]
const SAFEHOUSE = [255.5, 66, 900.5]
const STREET = [284.5, 65, 900.5] // just outside the Safehouse's safe zone, out of the cops' range
const GIVER = [595.5, 65, 1028.5]
const CHOP = [632.5, 65, 1068.5]
const CAR_SPOTS = [[16, 17, 18, 19], [12, 13, 14, 15]]
const ATMS = [[536, 65, 134], [612, 65, 107], [639, 65, 60], [700, 65, 110]]
const COMMANDS = ['/jobs', '/heists', '/daily', '/messages', '/money', '/level']

module.exports = async ({ check, args }) => {
  const minutes = Number(args.find(a => /^\d+(\.\d+)?$/.test(a))) || 8
  const only = args.filter(a => !/^\d/.test(a))
  const t = await start()
  // RCON takes one packet at a time per connection: four connections, each a queue, so the roles don't wait on each other.
  const pool = await Promise.all([1, 2, 3, 4].map(() => rconLib.connect()))
  const chains = pool.map(() => Promise.resolve())
  let turn = 0
  t.rcon.cmd = c => { const i = turn++ % pool.length; const p = chains[i].then(() => pool[i].cmd(c)); chains[i] = p.catch(() => {}); return p }
  const { cmd, until, walk, into, jtp, tp, info, near, sneak, clickBlock, hold: t0hold } = t

  const marks = { server: size(SERVER_LOG), loot: size(LOOT_LOG), ct: size(CT_LOG), prison: size(PRISON_LOG), bag: size(BAG_LOG) }
  const deadline = Date.now() + minutes * 60000
  const live = () => Date.now() < deadline
  const finds = {}
  const tally = {}
  const samples = []
  const B = {}
  const planned = new Set()
  const deaths = []
  const reopens = {}
  const ghosts0 = {}
  const bad = (role, label, detail = '') => { const k = `${role}: ${label}`; const f = finds[k] || (finds[k] = { n: 0, detail: '' }); f.n++; f.detail = String(detail).slice(0, 400) }
  const good = (role, label) => { const k = `${role}: ${label}`; tally[k] = (tally[k] || 0) + 1 }
  const inHeist = async P => ((await cmd(`zzinheist ${P}`)).match(/INHEIST \S+ (\S+)/) || [])[1]
  const bagOf = async P => { const s = await cmd(`zzbag ${P}`); return { total: Number(field(s, 'total')) || 0, room: Number(field(s, 'room')), pct: Number(field(s, 'pct')), raw: s } }
  const stateOf = async h => field(await cmd(`zzheist ${h}`), 'state')

  // ---- players
  const enter = async (P, fresh = true) => {
    const bot = await t.newBot(P, { fresh })
    B[P] = bot
    bot.once('kicked', r => { if (!planned.has(P)) bad('server', `${P} was kicked`, typeof r === 'string' ? r : JSON.stringify(r)) })
    bot.on('error', e => bad('bot', `${P} client error`, e.message))
    bot.on('death', () => { good(P.slice(0, 3), 'deaths'); deaths.push(`${P} at ${bot.entity.position.floored()} ${(bot.log.slice(-1)[0] || {}).text || ''}`.slice(0, 160)) })
    bot.once('end', () => {
      if (planned.has(P) || !live()) return
      bad('server', `${P} lost its connection`)
      setTimeout(() => enter(P, false).catch(() => {}), 3000)
    })
    return bot
  }
  const robber = async (P, tier = 3) => {
    await cmd(`zzclear ${P}`)
    await cmd(`zzbagclear ${P}`)
    await cmd(`zzcombatend ${P}`)
    await cmd(`gamemode survival ${P}`)
    await cmd(`zzpassive ${P} off`)
    await cmd(`dlevel set ${P} 100`)
    await cmd(`zztestkit ${P}`)
    await cmd(`zzdata ${P} bag-tier ${tier}`)
    await cmd(`effect give ${P} minecraft:instant_health 1 10 true`)
  }
  const box = (bot, [x, y, z], max = 6) => Object.values(bot.entities).filter(e => e.name === 'interaction').map(e => [Math.hypot(e.position.x - x, e.position.y - y, e.position.z - z), e]).filter(p => p[0] < max).sort((a, b) => Math.round(a[0] * 100) - Math.round(b[0] * 100) || b[1].id - a[1].id)[0]?.[1]
  const hold = async (bot, aim, ms) => {
    let hit = false
    const end = Date.now() + ms
    while (Date.now() < end) { const e = box(bot, aim); if (e) { hit = true; bot.activateEntity(e).catch(() => {}) } await sleep(200) }
    return hit
  }
  const goto = async (P, [x, y, z], wait = 2500) => { await cmd(`zzheisttp ${P} ${x} ${y} ${z}`); await sleep(wait) }
  const sell = async (role, P) => {
    const before = await bagOf(P)
    await cmd(`zzheisttp ${P} ${STREET.join(' ')}`)
    const out = await until(async () => (await inHeist(P)) === 'none', 8000, 500)
    if (!out) bad(role, 'still counted in a heist after stepping out', `${await cmd(`zzinheist ${P}`)} ${await t.pos(P)}`)
    const hunted = await cmd(`zzinheist ${P}`)
    if (!/hunt=none/.test(hunted) && !await until(async () => /hunt=none/.test(await cmd(`zzinheist ${P}`)), 8000, 500)) bad(role, 'the cops still hunt a robber out of their range', `${await cmd(`zzinheist ${P}`)} ${await t.pos(P)}`)
    if (/tagged=true/.test(await cmd(`zzcombat ${P}`))) {
      await cmd(`zzheisttp ${P} ${SAFEHOUSE.join(' ')}`)
      await sleep(600)
      const [x, , z] = await t.pos(P)
      if (Math.abs(x - SAFEHOUSE[0]) < 3 && Math.abs(z - SAFEHOUSE[2]) < 3) bad(role, 'a tagged robber got into the Safehouse', await cmd(`zzcombat ${P}`)); else good(role, 'the Safehouse refused a tagged robber')
    }
    await cmd(`zzcombatend ${P}`)
    await cmd(`zzheisttp ${P} ${SAFEHOUSE.join(' ')}`)
    if (before.total > 0) {
      const sold = await until(async () => (await bagOf(P)).total === 0, 8000, 500)
      if (sold) good(role, `sold a bag ($${Math.round(before.total / 5000) * 5}K band)`)
      else bad(role, 'a bag at the Safehouse was not sold', `${(await bagOf(P)).raw} ${await cmd(`zzcombat ${P}`)} ${await cmd(`zzinheist ${P}`)} ${await t.pos(P)}`)
    }
  }
  const chatter = async (P, bot) => {
    bot.chat(COMMANDS[Math.floor(Math.random() * COMMANDS.length)])
    await sleep(400)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
  }
  const openPhone = async (role, bot) => {
    bot.setQuickBarSlot(8)
    await sleep(300)
    const w = new Promise(resolve => { const timer = setTimeout(() => resolve(null), 4000); bot.once('windowOpen', win => { clearTimeout(timer); resolve(win) }) })
    bot._client.write('block_dig', { status: 6, location: { x: 0, y: 0, z: 0 }, face: 0, sequence: 0 })
    const win = await w
    if (win) good(role, 'phone opened'); else bad(role, 'the phone menu did not open')
    await sleep(600)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    bot.setQuickBarSlot(0)
  }

  // ---- the prison
  const escapeKeycard = async (P, role, lane) => {
    const bot = B[P]
    await into(P, 210.5, 65, 281.5, 0)
    await cmd(`zzjail ${P} give keycard`)
    await sleep(900)
    const out = await walk(bot, [[210.5, 283.6], [210.5, 288.5], [210.5, 300.5], [210.5, 316.5], [210.5, 319.0], [210.5, 325.5]], 7000)
    if (!out) { const s = await info(P); if (field(s, 'state') === 'in' && !field(s, 'hunters')) bad(role, 'keycard route: did not get through the POLICE doors', s); else good(role, 'stopped on the way out (a guard)'); return false }
    await jtp(P, 272.5, 65, 395.5, 0)
    await sleep(1500)
    let open = false
    for (let i = 0; i < 12 && live() && !open; i++) {
      if (!/state=open/.test(await t.breach('front'))) await t0hold(bot, [272.5, 65, 397.5], 3800, 1.5)
      open = await until(async () => /state=open/.test(await t.breach('front')), 1500)
      if (!open) { good(role, 'waited for the gate cooldown'); await sleep(4000) }
    }
    if (!open) { if (live()) bad(role, 'the front gate never opened for this bot', await t.breach('front')); return false }
    await jtp(P, lane, 65, 392.5, 0)
    await sleep(800)
    await walk(bot, [[lane, 400.5]], 3500)
    const ok = await until(async () => field(await info(P), 'state') === 'out', 3000, 300)
    if (ok) good(role, 'escaped by keycard'); else good(role, 'missed the open gate (only 15 s, shared)')
    return ok
  }
  const escapeLadder = async (P, role) => {
    const bot = B[P]
    await into(P, 150.0, 65, 393.5, 0)
    await sleep(1500)
    await bot.lookAt(bot.entity.position.offset(0, 1.6, 5), true)
    bot.setControlState('forward', true)
    bot.setControlState('jump', true)
    await until(async () => bot.entity.position.y >= 72.5, 9000, 100)
    bot.setControlState('jump', false)
    await until(async () => bot.entity.position.z > 397.2, 8000, 100)
    bot.clearControlStates()
    const ok = await until(async () => field(await info(P), 'state') === 'out', 3000, 300)
    if (ok) good(role, 'escaped by ladder'); else bad(role, 'the ladder route did not get out', `${bot.entity.position} ${await info(P)}`)
    return ok
  }
  const escapeLoop = async (P, role, way, lane) => {
    while (live()) {
      await cmd(`effect give ${P} minecraft:instant_health 1 10 true`)
      if (way === 'ladder') await escapeLadder(P, role); else await escapeKeycard(P, role, lane)
      await sleep(4000)
    }
  }
  const courseCells = {}
  const course = async (P, role) => {
    const a = B[P]
    const stepIs = want => until(async () => field(await info(P), 'step') === want, 6000, 300)
    const fail = async at => { bad(role, `the course stopped at "${at}"`, await info(P)); return false }
    await sleep(1500)
    let s = await info(P)
    if (field(s, 'state') !== 'course') return fail('a first join')
    courseCells[P] = field(s, 'cell')
    if (!await until(() => t.doorOpen(`cell_${field(s, 'cell')}`), 9000)) return fail('the cell door')
    if (!await stepIs('sneak')) return fail('cell')
    sneak(a, true)
    await sleep(3500)
    await tp(P, 82.5, 58, 53.5, 180, 30)
    await sleep(800)
    const cb = near(a, 'interaction', [82.5, 58.5, 51.5], 1.5)
    if (cb) {
      a._client.write('use_entity', { target: cb.id, mouse: 2, sneaking: true, hand: 0, x: 0, y: 0.5, z: 0, location: { x: 0, y: 0.5, z: 0 } })
      a._client.write('use_entity', { target: cb.id, mouse: 0, sneaking: true, hand: 0, location: { x: 0, y: 0, z: 0 } })
    }
    await sleep(900)
    sneak(a, false)
    if (!await stepIs('vent')) return fail('the keycard on the desk')
    await tp(P, 81.5, 58, 85.5, 90)
    await sleep(900)
    await clickBlock(a, 80, 59, 85)
    await sleep(500)
    await tp(P, 77.5, 58, 84.5, 90)
    await sleep(900)
    await tp(P, 70.5, 58, 84.5, 90)
    if (!await stepIs('crawl')) return fail('the vent')
    await tp(P, 61.5, 58, 80.5, 0)
    if (!await stepIs('boiler')) return fail('the crawl')
    a.setQuickBarSlot(0)
    await tp(P, 72.5, 58, 77.5, -90)
    await sleep(3300)
    await a.lookAt(new Vec3(80, 59.6, 77.5), true)
    a.setControlState('forward', true)
    await until(async () => a.entity.position.x >= 75.2, 3000, 150)
    a.setControlState('forward', false)
    if (!await stepIs('hotbar')) return fail("Rusty's cell")
    await until(() => t.said(a, /Here, a knife\. Press 2/), 6000)
    await sleep(300)
    a.setQuickBarSlot(1)
    if (!await stepIs('phone')) return fail('holding the knife')
    a.setQuickBarSlot(8)
    await sleep(500)
    a.activateItem()
    if (!await stepIs('office')) return fail('the phone')
    a.activateItem()
    await sleep(500)
    a.setQuickBarSlot(1)
    await tp(P, 81.5, 58, 95.5, 90)
    await sleep(900)
    await clickBlock(a, 80, 59, 95)
    await sleep(500)
    await tp(P, 64.5, 60, 88.5, 0)
    await sleep(900)
    await tp(P, 64.5, 65, 89.5, 0)
    if (!await stepIs('upstairs')) return fail('the Security Office')
    await tp(P, 76.5, 65, 117.5, -90)
    await sleep(3300)
    await a.lookAt(new Vec3(86, 66.6, 117.5), true)
    a.setControlState('forward', true)
    const done = await until(async () => field(await info(P), 'state') === 'in', 6000, 200)
    a.clearControlStates()
    s = await info(P)
    if (!done || field(s, 'course') !== 'done') return fail('Hall B')
    good(role, 'finished the course')
    return true
  }

  // ---- heists
  const waitOpen = (h, ms = 60000) => until(async () => ['open', 'active'].includes(await stateOf(h)), ms, 2000)
  const pileOf = async (h, n) => { const m = (await cmd(`zzloot ${h}`)).match(new RegExp(`\\| ${n}:\\w+:(\\w*):n=\\d+:left=(-?\\d+):hb=(\\d+)`)); return m ? { state: m[1], left: Number(m[2]), hb: Number(m[3]) } : null }
  const robOnce = async (role, P, id, mate) => {
    const bot = B[P]
    const H = HEISTS[id]
    if (!await waitOpen(id)) { if (live()) bad(role, `${id} stayed closed for a minute`, `${await cmd(`zzheist ${id}`)} ${JSON.stringify(reopens[id] || [])}`); return }
    if (H.door) await goto(P, H.door, 1500) // the area loaded first, as walking up does
    await goto(P, H.inside)
    if (!await until(async () => (await inHeist(P)) === id, 8000, 500)) {
      const st = await stateOf(id)
      const left = Number(field(await cmd(`zzheist ${id}`), 'left'))
      if (st === 'open' || (st === 'active' && left > 30)) bad(role, `${id}: not counted inside after walking in`, `${await cmd(`zzinheist ${P}`)} ${await cmd(`zzheist ${id}`)}`)
      return
    }
    good(role, 'entered a heist')
    if (H.clerk) { await cmd(`zzclerkhit ${id} ${P}`); await sleep(400) }
    for (const S of [H.entry, H.smash].filter(Boolean)) {
      await goto(P, S.stand, 1800)
      if (H.clerk) await cmd(`zzclerkhit ${id} ${P}`)
      await hold(bot, S.aim, 3500)
    }
    let took = false
    for (const T of [H.take, H.open].filter(Boolean)) {
      await goto(P, T.stand, 1800)
      const b0 = await bagOf(P)
      if (H.clerk) await cmd(`zzclerkhit ${id} ${P}`)
      const hit = await hold(bot, T.aim, 5000)
      const b1 = await bagOf(P)
      if (b1.total > b0.total) { took = true; good(role, 'took loot') } else if (hit) good(role, 'held loot with nothing to show (taken by a mate, a trap or the clerk)')
      else if (T.pile && (await inHeist(P)) === id) {
        const pile = await pileOf(id, T.pile)
        // Empty, not rolled this run, or its gate still shut: no box is right. An open pile with money and no box isn't.
        if (pile && pile.state === 'open' && pile.left > 0) bad(role, `${id}: an open pile with money shows this bot no hitbox`, `${JSON.stringify(pile)} at ${bot.entity.position}`)
      }
      if (b1.pct > 100.5) bad('invariant', 'a bag over 100%', b1.raw)
    }
    if (mate && took) good(role, 'robbed with a mate')
    for (const X of EXTRA[id] || []) {
      if ((await inHeist(P)) !== id) break
      await goto(P, X.stand, 1500)
      await hold(bot, X.aim, X.ms)
    }
    // Half the advanced runs go loud: real cops for everyone inside.
    if (H.level >= 20 && Math.random() < 0.5) { await cmd(`dheist alarm ${id}`); await sleep(9000) }
    await sell(role, P)
    await chatter(P, bot)
  }
  const crew = async (P, role, order, mate) => {
    let i = 0
    while (live()) {
      await robber(P)
      await robOnce(role, P, order[i++ % order.length], mate)
      if (i % 3 === 0) await openPhone(role, B[P])
      await sleep(1000)
    }
  }
  const donut = async (P, role) => {
    while (live()) {
      await robber(P, 2)
      if (!await waitOpen('donut', 90000)) { if (live()) bad(role, 'the Donut Shop stayed closed', `${await cmd('zzheist donut')} ${JSON.stringify(reopens.donut || [])}`); continue }
      await goto(P, DONUT.stand)
      if (!await until(async () => (await inHeist(P)) === 'donut', 8000, 500)) continue
      good(role, 'entered the Donut Shop')
      const b0 = await bagOf(P)
      for (let i = 0; i < 5 && live() && (await inHeist(P)) === 'donut'; i++) {
        await cmd(`zzclerkhit donut ${P}`)
        await hold(B[P], DONUT.aim, 2000)
      }
      const b1 = await bagOf(P)
      if (b1.total > b0.total) good(role, 'took from the register'); else good(role, 'got nothing from the register (a crewmate was faster)')
      await sell(role, P)
      await sleep(1500)
    }
  }

  // ---- cars
  const clickCar = async (bot, plate) => {
    const pos = async kind => { const m = (await cmd(`data get entity @e[type=armor_stand,name="MTVEHICLES_${kind}_${plate}",limit=1] Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/); return m ? new Vec3(+m[1], +m[2], +m[3]) : null }
    const at = await pos('MAINSEAT') || await pos('MAIN')
    if (!at) return false
    const e = Object.values(bot.entities).filter(x => x.name === 'armor_stand' && x.position.distanceTo(at) < 3).sort((a, b) => a.position.distanceTo(at) - b.position.distanceTo(at))[0]
    if (!e) return false
    await bot.lookAt(at.offset(0, 1, 0), true).catch(() => {})
    await bot.activateEntityAt(e, at.offset(0, 1, 0)).catch(() => {})
    return true
  }
  const thief = async (P, role, spots, dz) => {
    let i = 0
    while (live()) {
      const bot = B[P]
      await robber(P, 1)
      await cmd(`zzctreset ${P}`)
      await cmd(`dlevel set ${P} 5`)
      await cmd(`zzdatatext ${P} ct-starter done`)
      await cmd(`zzpick ${P} basic 1`)
      await goto(P, GIVER)
      const spot = spots[i++ % spots.length]
      await cmd(`zzctoffer ${P} basic sedan Red ${spot}`)
      await cmd(`zzcttake ${P} basic`)
      await sleep(600)
      const s = await cmd(`zzctstate ${P}`)
      const plate = field(s, 'plate')
      if (!plate || field(s, 'job') !== 'basic') { bad(role, 'a car job could not be taken', s); await sleep(5000); continue }
      good(role, 'took a car job')
      await cmd(`zzctpick ${P}`)
      await sleep(600)
      await cmd(`zzcartp ${plate} ${CHOP[0] - 2} ${CHOP[1]} ${CHOP[2] + dz}`)
      await goto(P, [CHOP[0] - 4.5, CHOP[1], CHOP[2] + dz], 2000)
      const end = Date.now() + 45000
      let done = false
      while (Date.now() < end && !done) { await clickCar(bot, plate); await sleep(3000); done = field(await cmd(`zzctstate ${P}`), 'job') === '' }
      if (done) good(role, 'delivered a car'); else bad(role, 'a car at the chop shop was never delivered', `${await cmd(`zzctstate ${P}`)} ${await cmd(`zzcarseat ${P}`)}`)
      await sleep(7000)
    }
  }

  // ---- the rest of town
  const social = async (P, role, mate, first) => {
    const bot = B[P]
    await robber(P, 1)
    await cmd(`eco set ${P} 100000`)
    let n = 0
    while (live()) {
      n++
      await openPhone(role, bot)
      await chatter(P, bot)
      if (first) {
        // A shop window while everything else runs, and an ATM.
        const w = new Promise(resolve => { const timer = setTimeout(() => resolve(null), 4000); bot.once('windowOpen', win => { clearTimeout(timer); resolve(win) }) })
        await cmd(`dshop open ${P} gun`)
        if (await w) good(role, 'a shop opened'); else bad(role, 'dshop gun did not open')
        await sleep(800)
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
        const [x, y, z] = ATMS[n % ATMS.length]
        await robber(P, 1)
        await cmd(`zztestkit ${P}`)
        await goto(P, [x + 2.5, y, z + 0.5], 4000)
        const b0 = await bagOf(P)
        const hit = await hold(bot, [x + 0.5, y + 1, z + 0.5], 7000)
        if ((await bagOf(P)).total > b0.total) good(role, 'cracked an ATM'); else if (hit) good(role, 'held an ATM with nothing to show'); else good(role, 'no ATM box where expected')
        await sell(role, P)
      } else {
        await cmd(`zzclear ${P}`)
        await cmd(`eco set ${P} 10000`)
        await goto(P, [860.5, 73, 354.5], 3000)
        const cashier = bot.blockAt(new Vec3(858, 73, 354))
        const w = new Promise(resolve => { const timer = setTimeout(() => resolve(null), 4000); bot.once('windowOpen', win => { clearTimeout(timer); resolve(win) }) })
        if (cashier) await bot.activateBlock(cashier).catch(() => {})
        if (await w) {
          await bot.clickWindow(10, 0, 0).catch(() => {})
          await sleep(500)
          await bot.clickWindow(10, 0, 0).catch(() => {})
          await sleep(500)
          if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
          good(role, 'used the casino cashier')
        } else bad(role, 'the casino cashier did not open')
        await goto(P, [862.5, 73, 341.5], 1500)
        await bot.lookAt(new Vec3(862.5, 74.5, 339.77), true).catch(() => {})
        const slot = bot.blockAt(new Vec3(862, 73, 339))
        if (slot) await bot.activateBlock(slot).catch(() => {})
        await sleep(3000)
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
      }
      // A trade offer between the two, every few rounds.
      if (first && n % 3 === 0 && B[mate]) {
        await goto(P, [250.5, 66, 900.5], 800)
        await cmd(`zzheisttp ${mate} 251.5 66 900.5`)
        await sleep(1500)
        bot.chat(`/trade ${mate}`)
        await sleep(600)
        B[mate].chat(`/trade ${P}`)
        await sleep(1800)
        const opened = Boolean(bot.currentWindow && B[mate].currentWindow)
        if (opened) good(role, 'a trade window opened for both')
        else good(role, 'no trade window (a mate was busy)')
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
        if (B[mate].currentWindow) B[mate].closeWindow(B[mate].currentWindow)
      }
      await sleep(2000)
    }
  }

  // ---- monitors
  const heistsDesync = {}
  const monitor = async () => {
    let n = 0
    const pid = fs.existsSync(path.join(ROOT, 'server', 'server.pid')) ? fs.readFileSync(path.join(ROOT, 'server', 'server.pid'), 'utf8').trim() : ''
    while (live()) {
      n++
      const raw = (await cmd('mspt')).replace(/\s+/g, ' ')
      const nums = ((raw.split('1m:')[1] || '').match(/[\d.]+/g) || []).map(Number)
      const tps = ((await cmd('tps')).split(':').pop().match(/[\d.]+/g) || []).map(Number)[0]
      const npcs = Number(((await cmd('zznpcs')).match(/NPCS (\d+)/) || [])[1])
      const online = Number(((await cmd('list')).match(/There are (\d+)/) || [])[1])
      let heap = -1
      if (pid && n % 3 === 0) { try { heap = Math.round(Number((execSync(`"${JCMD}" ${pid} GC.heap_info`, { encoding: 'utf8' }).match(/heap\s+total.*?used (\d+)K/) || [])[1]) / 1024) } catch (e) { } }
      samples.push({ at: Math.round((Date.now() - (deadline - minutes * 60000)) / 1000), avg10: nums[3], max10: nums[5], tps, npcs, online, heap })
      for (const h of ALL) {
        const z = await cmd(`zzheist ${h}`)
        const inside = Number(field(z, 'inside'))
        const names = field(z, 'names')
        const listed = names ? names.split(',').filter(Boolean) : []
        if (inside !== listed.length) bad('invariant', `${h}: inside=${inside} but it names ${listed.length}`, z)
        for (const name of listed) {
          const key = `${h}/${name}`
          if ((await inHeist(name)) !== h) { heistsDesync[key] = (heistsDesync[key] || 0) + 1; if (heistsDesync[key] >= 2) bad('invariant', `${h} counts a robber who says they're elsewhere`, `${name} ${await cmd(`zzinheist ${name}`)} ${z}`) } else heistsDesync[key] = 0
        }
        const l = await cmd(`zzloot ${h}`)
        const rolled = Number(field(l, 'rolled'))
        const left = Number(field(l, 'left'))
        if (left < 0 || left > rolled) bad('invariant', `${h}: loot left outside 0..rolled`, l.slice(0, 200))
      }
      await sleep(15000)
    }
  }
  const director = async () => {
    // Real cooldowns are 15 minutes: a robber would go elsewhere. Here the heist comes back as soon as its reset is done.
    while (live()) {
      for (const h of ALL) {
        const z = await cmd(`zzheist ${h}`)
        if (field(z, 'state') === 'cooldown') {
          const reply = await cmd(`dheist open ${h}`)
          const r = reopens[h] || (reopens[h] = [])
          r.push(`${Math.round((Date.now() - (deadline - minutes * 60000)) / 1000)}s left=${field(z, 'left')} reset=${field(z, 'reset')}: ${reply.slice(0, 40)}`)
          if (r.length > 12) r.shift()
        }
      }
      await sleep(20000)
    }
  }

  // ---- the roles
  const ROLES = []
  const add = (P, role, fn) => { if (!only.length || only.some(o => P.startsWith(o) || role.startsWith(o))) ROLES.push({ P, role, fn }) }
  add('SwC1', 'course', async P => { await course(P, 'course'); await escapeLoop(P, 'course', 'keycard', 264.5) })
  add('SwC2', 'course', async P => { await course(P, 'course'); await escapeLoop(P, 'course', 'keycard', 280.5) })
  add('SwC3', 'course', async P => { await course(P, 'course'); await escapeLoop(P, 'course', 'ladder') })
  for (const [P, way, lane] of [['SwE1', 'ladder'], ['SwE2', 'keycard', 262.5], ['SwE3', 'keycard', 282.5]]) add(P, 'escape', async () => { await sleep(2000); await cmd(`dprison course ${P} skip`); await escapeLoop(P, 'escape', way, lane) })
  for (const P of ['SwD1', 'SwD2', 'SwD3']) add(P, 'donut', p => donut(p, 'donut'))
  add('SwT1', 'cars', p => thief(p, 'cars', CAR_SPOTS[0], -2))
  add('SwT2', 'cars', p => thief(p, 'cars', CAR_SPOTS[1], 2))
  for (let c = 0; c < 4; c++) for (const m of c < 3 ? [0, 1] : [0]) add(`SwH${c * 2 + m + 1}`, 'crew', p => crew(p, 'crew', CREWS[c], c < 3))
  add('SwS1', 'social', p => social(p, 'social', 'SwS2', true))
  add('SwS2', 'social', p => social(p, 'social', 'SwS1', false))

  const npcs0 = Number(((await cmd('zznpcs')).match(/NPCS (\d+)/) || [])[1])
  let prof = ''
  try {
    await t.prisonOn()
    const running = ROLES.map(async ({ P, role, fn }, i) => {
      await sleep(i * 1500)
      try { await enter(P) } catch (e) { bad('server', `${P} could not join`, e.message); return }
      if (!['course', 'escape'].includes(role)) await sleep(1500)
      while (live()) {
        try { await fn(P); return } catch (e) { bad(role, `exception in ${P}`, e.stack || e); await sleep(3000) }
      }
    })
    const watchers = [monitor(), director()]
    await sleep(60000)
    await cmd('dphone prof start')
    await Promise.all(running)
    await Promise.all(watchers)
    prof = await cmd('dphone prof stop')
    const peak = samples.reduce((a, s) => Math.max(a, s.online || 0), 0)
    check(`${ROLES.length} players on at once`, peak >= ROLES.length, `peak ${peak}`)
  } finally {
    for (const r of ROLES) planned.add(r.P)
    const report = {}
    for (const { P } of ROLES) { const b = B[P]; if (b) report[P] = b.log }
    // Placeholders and raw values the players saw.
    const shown = {}
    for (const [P, lines] of Object.entries(report)) {
      for (const m of lines) {
        if (/<none>|%[a-zA-Z_{]|\{_|\bnull\b|\bNaN\b|\bundefined\b|\[object/.test(m.text)) { const k = m.text.replace(/Sw[A-Z]\d/g, '<bot>').replace(/\d+/g, '#').slice(0, 160); shown[k] = shown[k] || { n: 0, who: P }; shown[k].n++ }
      }
    }
    for (const { P } of ROLES) if (B[P]) { await quit(B[P]).catch(() => {}) }
    await sleep(4000)
    // Everyone's gone: every heist has to come back on its own, clean.
    for (const h of ALL) { await cmd(`dheist end ${h}`); }
    await sleep(3000)
    const back = {}
    for (let i = 0; i < 45; i++) {
      let all = true
      for (const h of ALL) { const st = await stateOf(h); back[h] = st; if (st !== 'open') { all = false; await cmd(`dheist open ${h}`) } }
      if (all) break
      await sleep(4000)
    }
    const stuck = Object.entries(back).filter(([, st]) => st !== 'open')
    check('every heist reopens after everyone leaves', stuck.length === 0, JSON.stringify(stuck))
    const ghosts = []
    for (const h of ALL) { const z = await cmd(`zzheist ${h}`); if (Number(field(z, 'inside')) !== 0 || !/alarm=none/.test(z)) ghosts.push(z.slice(0, 120)) }
    check('nobody is left inside, and no alarm still running', ghosts.length === 0, ghosts.join(' / '))
    await sleep(8000)
    const npcs1 = Number(((await cmd('zznpcs')).match(/NPCS (\d+)/) || [])[1])
    const npcsBase = Math.max(npcs0, (samples[2] || {}).npcs || 0)
    check('the NPC count settles back near where it started', npcs1 <= npcsBase + 6, `${npcs0} before, ${npcsBase} with everyone on, ${npcs1} after`)

    // The loot ledger: within a run, a pile's left falls by exactly what each take got.
    const piles = {}
    let takes = 0
    let got = 0
    let pays = 0
    const gotBy = {}
    const soldBy = {}
    const breaks = []
    for (const line of since(LOOT_LOG, marks.loot).split('\n')) {
      const m = line.match(/take (\S+) \S+ (\S+) cell=\S+ slot=\S+ got=(-?\d+) left=(-?\d+) pieces=(-?\d+) run=(\d+)/)
      if (m) {
        takes++
        got += Number(m[3])
        gotBy[m[1]] = (gotBy[m[1]] || 0) + Number(m[3])
        const k = `${m[2]}#${m[6]}`
        if (piles[k] !== undefined && piles[k] - Number(m[3]) !== Number(m[4])) breaks.push(`${k}: ${piles[k]} - ${m[3]} != ${m[4]} (${m[1]})`)
        if (Number(m[4]) < 0 || Number(m[3]) <= 0) breaks.push(`${k}: got=${m[3]} left=${m[4]} (${m[1]})`)
        piles[k] = Number(m[4])
      }
    }
    for (const line of since(BAG_LOG, marks.bag).split('\n')) {
      const p = line.match(/sell (\S+) \S+ total=(\d+) pay=(\d+)/)
      if (p && !p[1].startsWith('SwS')) { soldBy[p[1]] = (soldBy[p[1]] || 0) + Number(p[2]); pays += Number(p[3]) } // SwS: ATMs aren't in the loot log
      const d = line.match(/duffel-take (\S+) .*took=(\d+)/)
      if (d) gotBy[d[1]] = (gotBy[d[1]] || 0) + Number(d[2])
    }
    const oversold = Object.entries(soldBy).filter(([n, v]) => v > (gotBy[n] || 0)).map(([n, v]) => `${n} sold ${v}, took ${gotBy[n] || 0}`)
    check(`the loot ledger adds up across ${takes} takes in ${Object.keys(piles).length} pile-runs`, breaks.length === 0, breaks.slice(0, 8).join(' / '))
    check(`nobody sold more than they took ($${got} taken, $${pays} paid)`, oversold.length === 0, oversold.join(' / '))
    check('the three on the course got separate cells', new Set(Object.values(courseCells)).size === Object.keys(courseCells).length, JSON.stringify(courseCells))

    // Errors in the server log. A tebex line is never read out (it holds the key).
    const seen = {}
    let movedOdd = 0
    let noise = 0
    for (const line of since(SERVER_LOG, marks.server).split('\n')) {
      if (/tebex/i.test(line)) continue
      if (/Sw[A-Z]\d moved too quickly|Sw[A-Z]\d moved wrongly/.test(line)) { movedOdd++; continue }
      if (/location cannot be null|Failed to read from https:\/\/sessionserver|SocketTimeoutException|Read timed out|authlib\.exceptions|look up profile properties/.test(line)) { noise++; continue }
      if (/ERROR|Exception|\[Skript\].*(error|Line \d)|Can't keep up|moved too quickly|moved wrongly|Disconnecting|lost connection: (?!Disconnected)/.test(line) && !/Sw[A-Z]\d (lost connection|left the game)/.test(line)) {
        const k = line.replace(/^\[[\d:]+\] /, '').replace(/\d+/g, '#').slice(0, 170)
        seen[k] = (seen[k] || 0) + 1
      }
    }
    const avg = samples.length ? samples.reduce((a, s) => a + (s.avg10 || 0), 0) / samples.length : NaN
    const worst = samples.reduce((a, s) => Math.max(a, s.max10 || 0), 0)
    const low = samples.reduce((a, s) => Math.min(a, s.tps || 20), 20)
    const heap = samples.reduce((a, s) => Math.max(a, s.heap || 0), 0)
    check(`the tick stays under 50 ms on average (mean ${avg.toFixed(1)} ms, worst ${worst} ms, lowest TPS ${low}, heap ${heap} MB)`, avg < 50)
    check('no role reported a problem', Object.keys(finds).length === 0, Object.entries(finds).map(([k, f]) => `${k} x${f.n}`).join(' / '))
    check('no script or Java errors in the server log', Object.keys(seen).length === 0, Object.entries(seen).slice(0, 10).map(([k, n]) => `x${n} ${k}`).join(' / '))
    check('no placeholder or raw value reached a player', Object.keys(shown).length === 0, Object.keys(shown).slice(0, 8).join(' / '))
    fs.writeFileSync(path.join(ROOT, 'bots', 'results', 'swarm.findings.json'), JSON.stringify({ minutes, roles: ROLES.length, finds, tally, deaths, reopens, movedOdd, noise, shown, serverLog: seen, samples, courseCells, prof, breaks, takes, got, pays, ctLog: since(CT_LOG, marks.ct).split('\n').slice(-60), prisonLog: since(PRISON_LOG, marks.prison).split('\n').slice(-120) }, null, 1))
    for (const { P } of ROLES) { await cmd(`zzctreset ${P}`).catch(() => {}); await cmd(`zzforget ${P}`).catch(() => {}) }
    await cmd('zzjailbreach front cool').catch(() => {})
    await t.prisonRestore().catch(() => {})
    for (const p of pool) p.close()
    await t.close().catch(() => {})
  }
}
