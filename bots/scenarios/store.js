// Stores and hands (owner, 2026-09-27): a store is a heist of difficulty 0 ("easy money for people starting off"):
// no escape clock, not announced, only robbers up to level 9, no fighting into or out of it (store::no-pvp), no safes or
// vault doors; it closes when cleaned out (the robbers inside keep their loot and are moved out after store::empty-grace)
// or when nobody has been inside for store::idle-close. A robber with no bag carries up to $1,000 in their hands: the
// cash shows in the offhand, "HANDS FULL" when it's full, it sells at the base, the phone's big map takes it off and
// puts it back, and a death drops it as a duffel and costs L = min(B × p, C) with C = the hands' $1,000.
const conv = require('mineflayer/lib/conversions')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'StoreA'
const B = 'StoreB'
const Y = 200
const ID = 'zstore'
const CHUNKS = '3290 3290 3330 3335'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(200) } return Boolean(await fn()) }
    const heist = async () => cmd(`zzheist ${ID}`)
    const field = (s, k) => (s.match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const bag = async name => { const r = await cmd(`zzbag ${name}`); return { raw: r, total: Number((r.match(/total=([\d.]+)/) || [])[1]), room: Number((r.match(/room=([\d.]+)/) || [])[1]), tier: Number((r.match(/tier=(\d+)/) || [])[1]) } }
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const offhand = async name => cmd(`zzoffhand ${name}`)
    const health = async name => Number(((await cmd(`data get entity ${name} Health`)).match(/data: ([\d.]+)/) || [])[1])
    const place = async (name, x, z) => { await cmd(`zzheisttp ${name} ${x} ${Y} ${z}`); await sleep(1000); await bots[name].look(conv.fromNotchianYaw(0), 0, true) }
    // Hold right-click on the loot hitbox nearest a point.
    const box = (bot, x, y, z) => {
      let best = null
      let bd = 1.6
      for (const e of Object.values(bot.entities)) {
        if (e.name !== 'interaction') continue
        const d = Math.hypot(e.position.x - x, e.position.y - y, e.position.z - z)
        if (d < bd) { bd = d; best = e }
      }
      return best
    }
    const hold = async (name, x, y, z, ms) => {
      const end = Date.now() + ms
      while (Date.now() < end) { const e = box(bots[name], x, y, z); if (e) bots[name].activateEntity(e).catch(() => {}); await sleep(200) }
    }
    // Boss bar titles as A's client sees them.
    const bars = new Map()

    // ---------- Build ----------
    await cmd(`dheist delete ${ID} confirm`)
    for (const r of [`heist_${ID}`, 'safe_base_zst']) await cmd(`rg remove -w world ${r}`)
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 3290 ${Y} 3290 3330 ${Y + 8} 3335 air`)
    await cmd(`fill 3290 ${Y - 1} 3290 3330 ${Y - 1} 3335 glass`)
    await cmd(`fill 3306 ${Y} 3306 3307 ${Y} 3306 stone`) // the cash table
    await cmd(`zzregion heist_${ID} 3300 ${Y - 1} 3300 3314 ${Y + 6} 3314`)
    await cmd(`zzregion safe_base_zst 3300 ${Y - 1} 3322 3314 ${Y + 6} 3330`)
    await cmd('rg flag -w world safe_base_zst passthrough allow')
    const created = await cmd(`dheist create ${ID} 0`)
    for (const c of [`dheist set ${ID} name Corner Store`, `dheist exit ${ID} 3307.5 ${Y} 3317.5 180`, `dheist snapshot ${ID}`]) await cmd(c)
    const safeRefused = await cmd(`dloot add ${ID} safe 3306 ${Y} 3306 3306 ${Y} 3306`)
    const pile = await cmd(`dloot add ${ID} pile 3306 ${Y} 3306 3307 ${Y} 3306 value=1500 style=cash take=0.2`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzbagclear ${name}`)
      await cmd(`zzdata ${name} bag-tier none`)
      await cmd(`zzdata ${name} bag-best none`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dlevel reset ${name}`)
      await cmd(`eco set ${name} 1000`)
      await cmd(`minecraft:effect give ${name} minecraft:saturation 1 20 true`)
    }
    bots[A]._client.on('boss_bar', p => {
      if (p.action === 1) { bars.delete(p.entityUUID); return }
      const b = bars.get(p.entityUUID) || {}
      if (p.title !== undefined) b.title = require('prismarine-chat')(bots[A].registry).fromNotch(p.title).toString()
      bars.set(p.entityUUID, b)
    })
    await place(A, 3307.5, 3318.5)
    await place(B, 3309.5, 3318.5)
    await sleep(3000)
    check('staff make a store with difficulty 0; safes and vault doors are refused in one, piles are fine', /created/.test(created) && /piles and glass only/.test(safeRefused) && /added/.test(pile), `${created} | ${safeRefused} | ${pile}`)

    let t = Date.now()
    await cmd(`dheist enable ${ID}`)
    const opened = await until(async () => field(await heist(), 'state') === 'open', 10000)
    await sleep(1000)
    check('it opens without telling everyone (stores are never announced)', opened && !/Corner Store is open/.test(text(B, t)), `${await heist()} | ${text(B, t)}`)

    // ---------- Robbing it with bare hands ----------
    await place(A, 3307.5, 3308.5)
    t = Date.now()
    await hold(A, 3307, Y + 1, 3306.5, 4500)
    await sleep(500)
    let b = await bag(A)
    const oh = await offhand(A)
    check('no bag: the hands take $1,000 and no more, "HANDS FULL"', b.tier === 0 && b.total === 1000 && b.room === 0 && /HANDS FULL/.test(text(A, t)), `${b.raw} | ${text(A, t).slice(0, 300)}`)
    check('...and the cash sits in the offhand where a bag would be', /Cash in hand/.test(oh), oh)
    const h1 = await heist()
    await sleep(3000)
    const h2 = await heist()
    check('the first robbery starts the run, but there\'s no clock (still running seconds later)', field(h1, 'state') === 'active' && field(h2, 'state') === 'active' && field(h2, 'left') === '-1', `${h1} | ${h2}`)
    check('the boss bar says there\'s no clock and what\'s left', [...bars.values()].some(x => /Corner Store . no clock . \$500 left/.test(x.title || '')), JSON.stringify([...bars.values()]))

    // ---------- Only new robbers; no fighting into it ----------
    await cmd(`dlevel set ${B} 10`)
    t = Date.now()
    await bots[B].look(conv.fromNotchianYaw(180), 0, true) // north, into the store
    bots[B].setControlState('forward', true)
    await sleep(2500)
    bots[B].setControlState('forward', false)
    await sleep(700)
    check('level 10 can\'t go in: "for new robbers (up to level 9)"', field(await cmd(`zzinheist ${B}`), 'hunt') !== undefined && !/zstore hunt/.test(await cmd(`zzinheist ${B}`)) && /for new robbers \(up to level 9\)/.test(text(B, t)), `${await cmd(`zzinheist ${B}`)} | ${text(B, t)}`)
    await place(B, 3307.5, 3315.5)
    await place(A, 3307.5, 3313.5)
    await sleep(3500) // the teleports' immunity (pvp.sk, 3 s)
    const before = await health(A)
    const aEnt = bots[B].players[A] && bots[B].players[A].entity
    if (aEnt) { await bots[B].lookAt(aEnt.position.offset(0, 1.4, 0), true); bots[B].attack(aEnt) }
    await sleep(700)
    check('a player outside can\'t hurt a robber in the store (store::no-pvp)', Boolean(aEnt) && (await health(A)) === before, `ent=${Boolean(aEnt)} ${before} -> ${await health(A)}`)

    // ---------- Buying a bag with cash in hand; the store cleaned out ----------
    await cmd(`zzdata ${A} bag-tier 1`)
    await cmd(`zzdata ${A} bag-best 1`)
    await cmd(`zzbagapply ${A}`)
    await cmd('zzcfgtime store::empty-grace 3 seconds')
    await place(A, 3307.5, 3308.5)
    t = Date.now()
    await hold(A, 3307, Y + 1, 3306.5, 3000)
    b = await bag(A)
    const cleaned = await until(async () => /cleaned out/.test(text(A, t)), 3000)
    check('with a bag the rest fits (the hands\' $1,000 moved into it), and the store says it\'s cleaned out', b.tier === 1 && b.total === 1500 && cleaned, `${b.raw} | ${text(A, t).slice(0, 300)}`)
    const closed = await until(async () => field(await heist(), 'state') === 'cooldown', 8000)
    await sleep(800)
    b = await bag(A)
    check('a few seconds later it closes: the robber is moved out and keeps the loot', closed && !/zstore hunt/.test(await cmd(`zzinheist ${A}`)) && b.total === 1500 && /You keep your loot/.test(text(A, t)), `${await heist()} | ${await cmd(`zzinheist ${A}`)} | ${b.raw} | ${text(A, t).slice(-200)}`)

    // ---------- Selling at the base ----------
    const bal0 = await bal(A)
    await place(A, 3307.5, 3318.5)
    await bots[A].look(conv.fromNotchianYaw(0), 0, true)
    bots[A].setControlState('forward', true)
    await sleep(1800)
    bots[A].setControlState('forward', false)
    const sold = await until(async () => (await bag(A)).total === 0, 5000)
    check('the loot sells at the base', sold && (await bal(A)) - bal0 === 1500, `${await bag(A).then(x => x.raw)} +${(await bal(A)) - bal0}`)

    // ---------- Left empty: it closes ----------
    await cmd(`dheist open ${ID}`)
    await until(async () => field(await heist(), 'state') === 'open', 10000)
    await cmd(`zzdata ${A} bag-tier none`)
    await cmd(`zzbagapply ${A}`)
    await place(A, 3307.5, 3308.5)
    await hold(A, 3307, Y + 1, 3306.5, 800)
    const started = field(await heist(), 'state') === 'active'
    await place(A, 3307.5, 3318.5)
    await cmd('zzcfgtime store::idle-close 3 seconds')
    const idle = await until(async () => field(await heist(), 'state') === 'cooldown', 8000)
    check('a store nobody is in closes after store::idle-close (no stuck half-robbed store)', started && idle, await heist())
    await cmd('zzcfgreload')

    // ---------- The phone and the hands ----------
    await cmd(`zzbagclear ${A}`)
    await cmd(`zzbagadd ${A} zother#1 800`)
    await sleep(500)
    const cashBefore = /Cash in hand/.test(await offhand(A))
    bots[A].setQuickBarSlot(8)
    await sleep(400)
    bots[A].activateItem()
    await sleep(800)
    const mapOpen = /donating_phone_open/.test(await cmd(`tag ${A} list`))
    const emptyOff = !/Cash in hand/.test(await offhand(A))
    bots[A].activateItem()
    await sleep(800)
    const back = /Cash in hand/.test(await offhand(A))
    check('the phone\'s big map takes the cash out of the offhand and puts it back', cashBefore && mapOpen && emptyOff && back, `before=${cashBefore} open=${mapOpen} empty=${emptyOff} back=${back}`)
    bots[A].setQuickBarSlot(0)

    // ---------- A death with cash in hand ----------
    await cmd(`eco set ${A} 300000`)
    await place(A, 3295.5, 3295.5)
    await sleep(3500)
    await cmd(`minecraft:kill ${A}`)
    await sleep(1500)
    const loss = Number(((await cmd(`zzdata ${A} last-death-loss`)).match(/= ([\d.]+)/) || [])[1])
    const duffels = await cmd('zzduffels')
    // L = min(B × p, C) = min($300,000 × 1%, $1,000 of hands) = $1,000 (it was $0 with no bag before).
    check('a death drops the hands\' loot as a duffel and costs min(B × p, $1,000)', loss === 1000 && /800/.test(duffels) && (await bag(A)).total === 0, `loss=${loss} ${duffels.slice(0, 300)}`)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`dheist delete ${ID} confirm`).catch(() => {})
    for (const r of [`heist_${ID}`, 'safe_base_zst']) await rcon.cmd(`rg remove -w world ${r}`).catch(() => {})
    await rcon.cmd(`minecraft:kill @e[tag=poi_h_${ID}]`).catch(() => {})
    await rcon.cmd('minecraft:kill @e[type=item,x=3285,y=190,z=3285,dx=50,dy=30,dz=55]').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzbagclear ${name}`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 3290 ${Y - 1} 3290 3330 ${Y + 8} 3335 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
