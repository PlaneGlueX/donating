// quests.sk: quest givers you visit in person (owner, 2026-09-26: an NPC at a place like a scrap yard gives
// the car jobs; the idea for future quests too). Staff place a giver (/dquest), it's a named NPC with what it
// gives under its name, a blue dot on the locator bar and a place in /gps. Away from it, /contracts shows the
// offers but a click pins the nearest giver on the GPS (no job, no lockpick); the pin clears on arrival. A
// right-click on the NPC opens its menu, where jobs and lockpicks work; the held phone doesn't open its map
// with that click. A missing NPC comes back; remove takes the NPC and its dot; dump prints the addat line.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const Q = 'QuestA'
const R = 'QuestB'
const Y = 200
const CHUNKS = '1990 1990 2050 2040'
const PLATFORM = `1990 ${Y - 1} 1990 2050 ${Y - 1} 2040`
const FAR = '0.5 68 -656.5'
const GIVER = [2010.5, Y, 2010.5]
const SPOT = [2040.5, Y, 2030.5]
const AWAY = [2010.5, Y, 2030.5] // 20 blocks from the giver: outside its reach (6) and the pin's area (8)

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let giverN = ''
  let spotN = ''
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const field = (s, k) => (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const picks = async (name, tier) => Number(((await cmd(`zzpick ${name} ${tier} -1`)).match(/ (\d+) slot/) || [])[1] || 0)
    const gps = async name => cmd(`dphone gps ${name}`)
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const closeAll = async name => { if (bots[name].currentWindow) { bots[name].closeWindow(bots[name].currentWindow); await sleep(300) } }
    const title = w => (w ? JSON.stringify(w.title) : '')
    const itemText = i => (i ? JSON.stringify(i) : '')
    const menu = async name => {
      await closeAll(name)
      const o = windowOpen(bots[name])
      bots[name].chat('/contracts')
      const w = await o
      await sleep(300)
      return w
    }
    const uuidOf = async sel => {
      const m = (await cmd(`data get entity ${sel} UUID`)).match(/\[I; (-?\d+), (-?\d+), (-?\d+), (-?\d+)\]/)
      if (!m) return ''
      const hex = m.slice(1).map(n => (Number(n) >>> 0).toString(16).padStart(8, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
    const npc = name => Object.values(bots[name].entities).find(e => e.name === 'mannequin' && e.position.distanceTo(new (require('vec3').Vec3)(...GIVER)) < 1)
    const tp = async (name, [x, y, z], yaw = 0) => { await cmd(`zzheisttp ${name} ${x} ${y} ${z}`); await sleep(300); await cmd(`minecraft:tp ${name} ${x} ${y} ${z} ${yaw} 0`) }
    const phoneOpen = async name => /Test passed/.test(await cmd(`execute if entity @a[name=${name},tag=donating_phone_open]`))

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    for (const name of [Q, R]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzctreset ${name}`)
      await cmd(`dlevel set ${name} 1`)
      await cmd(`eco set ${name} 100000`)
      for (const t of ['basic', 'pro', 'master']) await cmd(`zzpick ${name} ${t} 0`)
    }
    const waypoints = []
    bots[Q]._client.on('tracked_waypoint', p => waypoints.push(p))
    await tp(Q, AWAY)
    await tp(R, [AWAY[0] + 3, Y, AWAY[2]])
    await sleep(1500)

    // ---------- Staff: placing a giver ----------
    let t = Date.now()
    bots[R].chat('/dquest list')
    await sleep(800)
    check('/dquest is staff only', /Staff only/.test(text(R, t)), text(R, t))
    const refused = [await cmd(`dquest addat nope ${GIVER.join(' ')} 90`), await cmd(`dquest addat contracts ${GIVER.join(' ')} 90 Bad|Name`)]
    check('unknown quest kinds and place names with | are refused', /no quest kind nope/.test(refused[0]) && /can't contain \|/.test(refused[1]), refused.join(' | '))
    let r = await cmd(`dquest addat contracts ${GIVER.join(' ')} 90 Quest Yard`)
    giverN = (r.match(/giver (\d+) \(contracts\) added/) || [])[1] || ''
    const name = await cmd(`data get entity @e[tag=questg_${giverN},limit=1] CustomName`)
    const desc = await cmd(`data get entity @e[tag=questg_${giverN},limit=1] description`)
    const hand = await cmd(`data get entity @e[tag=questg_${giverN},limit=1] equipment.mainhand`)
    check('a giver is a named NPC ("Quest Yard Boss", "Car contracts · right-click") holding a lockpick', giverN !== '' && /Quest Yard Boss/.test(name) && /Car contracts . right-click/.test(desc) && /flint/.test(hand) && /lockpick_basic/.test(hand), `${r} | ${name} | ${desc} | ${hand}`)
    await until(async () => Boolean(npc(Q)), 3000)
    check('players see it (a mannequin)', Boolean(npc(Q)), Object.values(bots[Q].entities).map(e => e.name).filter(n => n !== 'player').join(','))
    await until(async () => /Test passed/.test(await cmd(`execute if entity @e[tag=poi_q_${giverN}]`)), 12000)
    const dotId = await uuidOf(`@e[tag=poi_q_${giverN},limit=1]`)
    await until(async () => waypoints.some(p => p.waypoint && p.waypoint.uuid === dotId), 12000)
    const dot = waypoints.filter(p => p.waypoint && p.waypoint.uuid === dotId && p.waypoint.icon && p.waypoint.icon.color).pop()
    const c = dot && dot.waypoint.icon.color
    check('it is a blue dot on the locator bar', Boolean(c) && c.red === 85 && c.green === 85 && c.blue === 255, `${dotId} ${JSON.stringify(c)}`)
    r = await cmd(`dcontract spot addat ${SPOT.join(' ')} 90`)
    spotN = (r.match(/spot (\d+) added/) || [])[1] || ''
    await cmd(`zzctoffer ${Q} basic sedan Red ${spotN}`)

    // ---------- Away from it ----------
    let w = await menu(Q)
    const offerAway = itemText(w && w.slots[11])
    const findBtn = itemText(w && w.slots[31])
    check('/contracts away from a giver: the offers show, a click leads to a giver, and a "Find a contract giver" button says where', /Red Sedan/.test(offerAway) && /Take it from a contract giver/.test(offerAway) && !/take this job/.test(offerAway) && /Find a contract giver/.test(findBtn) && /Quest Yard \(20m\)/.test(findBtn), `${offerAway.slice(0, 400)} | ${findBtn.slice(0, 300)}`)
    const bal0 = await bal(Q)
    bots[Q].clickWindow(20, 0, 0).catch(() => {})
    await sleep(1200)
    let g = await gps(Q)
    check('clicking a lockpick there buys nothing and pins the giver on the GPS', (await bal(Q)) === bal0 && (await picks(Q, 'basic')) === 0 && !bots[Q].currentWindow && field(g, 'active') === 'pin' && field(g, 'label') === 'Quest_Yard', `${await bal(Q)} ${g}`)
    bots[Q].chat('/gps clear')
    await sleep(600)
    w = await menu(Q)
    t = Date.now()
    bots[Q].clickWindow(11, 0, 0).catch(() => {})
    await sleep(1200)
    g = await gps(Q)
    check('clicking an offer there takes no job and pins it too ("Talk to Quest Yard Boss there")', field(await cmd(`zzctstate ${Q}`), 'job') === '<none>' && field(g, 'active') === 'pin' && field(g, 'label') === 'Quest_Yard' && /Talk to Quest Yard Boss/.test(text(Q, t)), `${g} ${text(Q, t)}`)
    t = Date.now()
    await cmd(`zzcttake ${Q} basic`)
    await sleep(500)
    check('taking a job away from a giver is refused', /Jobs are given by contract givers/.test(text(Q, t)) && field(await cmd(`zzctstate ${Q}`), 'job') === '<none>', text(Q, t))
    await closeAll(Q)
    let o = windowOpen(bots[Q])
    bots[Q].chat('/gps')
    const gw = await o
    await sleep(300)
    const places = gw ? gw.slots.filter(Boolean).map(i => itemText(i)).filter(s => /Quest Yard/.test(s)) : []
    check('/gps lists the giver as a place', places.length >= 1, `${title(gw)} ${places.join(' ').slice(0, 300)}`)
    await closeAll(Q)

    // ---------- Arriving and talking to it ----------
    t = Date.now()
    await tp(Q, [GIVER[0] + 2, Y, GIVER[2]], 90)
    const arrived = await until(async () => !/slots=\S*pin/.test(await gps(Q)), 4000)
    check('walking up to it clears the pin ("Arrived · Quest Yard")', arrived && /Arrived . Quest Yard/.test(text(Q, t)), `${await gps(Q)} ${text(Q, t)}`)
    // The phone in hand: a right-click on the NPC comes with the phone's own click right after (the client's
    // use of the held item). The NPC's menu opens and the phone's map doesn't.
    bots[Q].setQuickBarSlot(8)
    await sleep(400)
    const e = npc(Q)
    o = windowOpen(bots[Q])
    try { await bots[Q].lookAt(e.position.offset(0, 1.5, 0), true) } catch (err) {}
    // The real client's order: the click on the entity, then the held item's use. In the same tick Skript's
    // click tracker already cancels the use with the NPC click, so the use comes 150 ms (3 ticks) later, as
    // when the two packets straddle ticks: only quests.sk's guard stops it then (checked: without the guard
    // this check fails; review fix, the use used to go first and the check passed without the guard).
    if (e) { await bots[Q].activateEntity(e).catch(() => {}); await sleep(150); bots[Q].activateItem() }
    w = await o
    await sleep(500)
    const phoneAfterNpc = await phoneOpen(Q)
    const offerAt = itemText(w && w.slots[11])
    check('a right-click on the NPC opens "Car contracts · Quest Yard" with "Click: take this job"', /Car contracts . Quest Yard/.test(title(w)) && /Click: take this job/.test(offerAt), `${title(w)} ${offerAt.slice(0, 300)}`)
    // Buying a lockpick works here.
    bots[Q].clickWindow(20, 0, 0).catch(() => {})
    await sleep(900)
    check('...and a Basic Lockpick can be bought there', (await bal(Q)) === bal0 - 500 && (await picks(Q, 'basic')) === 1, `${await bal(Q)} ${await picks(Q, 'basic')}`)
    await closeAll(Q)
    bots[Q].deactivateItem()
    await sleep(1200)
    // The control: the same use of the phone on its own opens the map.
    bots[Q].activateItem()
    await sleep(700)
    const phoneAlone = await phoneOpen(Q)
    bots[Q].deactivateItem()
    await sleep(400)
    if (phoneAlone) { bots[Q].activateItem(); await sleep(500); bots[Q].deactivateItem() }
    check('the phone in hand doesn\'t open its map with that click (it does on its own)', !phoneAfterNpc && phoneAlone, `afterNpc=${phoneAfterNpc} alone=${phoneAlone}`)
    t = Date.now()
    await cmd(`zzcttake ${Q} basic`)
    await sleep(800)
    check('next to the giver the job is taken', field(await cmd(`zzctstate ${Q}`), 'job') === 'basic' && /steal the Red Sedan/.test(text(Q, t)), `${await cmd(`zzctstate ${Q}`)} ${text(Q, t)}`)
    await cmd(`zzctreset ${Q}`)

    // ---------- It stays; staff remove it ----------
    await cmd(`minecraft:kill @e[tag=questg_${giverN}]`)
    // ...and an NPC whose giver has no record (a world uploaded with its NPCs, the records made anew).
    await cmd(`summon minecraft:mannequin ${GIVER[0] + 6} ${Y} ${GIVER[2]} {Tags:["donating_quest","quest_contracts","questg_99999"],Invulnerable:1b,PersistenceRequired:1b}`)
    await sleep(500)
    const gone = !/Test passed/.test(await cmd(`execute if entity @e[tag=questg_${giverN}]`))
    const orphan = /Test passed/.test(await cmd('execute if entity @e[tag=questg_99999]'))
    const back = await until(async () => /Count: 1\b/.test(await cmd(`execute if entity @e[tag=questg_${giverN}]`)) && !/Test passed/.test(await cmd('execute if entity @e[tag=questg_99999]')), 33000)
    check('a missing NPC comes back and one with no giver record goes (within 30 s)', gone && orphan && back, `gone=${gone} orphan=${orphan} back=${back}`)
    const dump = await cmd('dquest dump')
    check('/dquest dump prints the line that recreates it', dump.includes(`dquest addat contracts ${GIVER.join(' ')} 90 Quest Yard`), dump)
    r = await cmd(`dquest remove ${giverN}`)
    await sleep(500)
    const list = await cmd('dquest list')
    check('/dquest remove takes the NPC and its dot', /removed/.test(r) && !/Test passed/.test(await cmd(`execute if entity @e[tag=questg_${giverN}]`)) && !/Test passed/.test(await cmd(`execute if entity @e[tag=poi_q_${giverN}]`)) && !new RegExp(`^QUEST ${giverN}:`, 'm').test(list), `${r} ${list}`)
    const giverGone = giverN
    giverN = ''
    await tp(Q, AWAY)
    await sleep(500)
    w = await menu(Q)
    // Other contract givers on this server (a real one built locally): then it points at one of those.
    const others = /contracts\|world\|/.test(list)
    check('with no giver left, the menu says so (or points at another giver)', others ? !/Quest Yard/.test(itemText(w && w.slots[31])) && /Find a contract giver/.test(itemText(w && w.slots[31])) : /No contract giver yet/.test(itemText(w && w.slots[31])), `others=${others} ${itemText(w && w.slots[31]).slice(0, 200)}`)
    await closeAll(Q)
    void giverGone
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    if (giverN) await rcon.cmd(`dquest remove ${giverN}`).catch(() => {})
    if (spotN) await rcon.cmd(`dcontract spot remove ${spotN}`).catch(() => {})
    for (const name of [Q, R]) {
      await rcon.cmd(`zzctreset ${name}`).catch(() => {})
      for (const t of ['basic', 'pro', 'master']) await rcon.cmd(`zzpick ${name} ${t} 0`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
