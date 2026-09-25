// death.sk: what a death costs. Lost: hotbar 1-5, all ammo, helmet, vest, the bag (its tier stays
// unlocked); kept: quest items and the phone. Balance: L = min(B × p, C), p = 1% (difficulty 1) or 5%
// for cop deaths, C = the bag's capacity (no bag: nothing lost). The cause is saved for bounty.sk.
// Deaths outside heists only (heists.sk doesn't exist yet). Duffels come with bag.sk.
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const D = 'DeathBot'
const K = 'DeathKiller'
const Y = 200
const PLATFORM = `620 ${Y - 1} 620 630 ${Y - 1} 630`
const CHUNKS = '620 620 630 630'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${PLATFORM} glass`)
    for (const name of [D, K]) {
      bots[name] = await join(name)
      await rcon.cmd(`gamemode survival ${name}`)
      await rcon.cmd(`zzclear ${name}`)
      await rcon.cmd(`zzpassive ${name} off`)
    }
    const data = async key => ((await rcon.cmd(`zzdata ${D} ${key}`)).match(/= (.*)$/m) || [])[1]
    const bal = async () => Number(((await rcon.cmd(`zzbal ${D}`)).match(/: (-?\d+)/) || [])[1])
    const dump = async () => (await rcon.cmd(`zzdump ${D}`)).trim()
    const uuidK = await (async () => {
      const n = ((await rcon.cmd(`data get entity ${K} UUID`)).match(/\[I; (-?\d+), (-?\d+), (-?\d+), (-?\d+)\]/) || []).slice(1).map(Number)
      const hex = n.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    })()
    // A full kit: sword (hotbar 1), ammo and a block (upper inventory), tier-2 bag, a quest item
    // (hotbar 6), helmet and vest, and the balance.
    const kit = async (balance, bag = true) => {
      await rcon.cmd(bag ? `zztestkit ${D}` : `zzclear ${D}`)
      await rcon.cmd(`minecraft:item replace entity ${D} hotbar.5 with paper[custom_data={donating_id:'quest:test'}]`)
      await rcon.cmd(`minecraft:item replace entity ${D} armor.head with iron_helmet`)
      await rcon.cmd(`minecraft:item replace entity ${D} armor.chest with iron_chestplate`)
      await rcon.cmd(`eco set ${D} ${balance}`)
      await rcon.cmd(`minecraft:tp ${D} 625.5 ${Y} 625.5`)
      await sleep(500)
    }
    const die = async how => {
      const t = Date.now()
      await rcon.cmd(how)
      await sleep(2000) // the bot respawns at once
      return t
    }
    const said = (t, re) => messagesSince(bots[D], t).some(m => re.test(m.text))

    // ---------- What's lost and kept ----------
    await kit(100000)
    const before = await dump()
    check('the kit is in place', /0=iron sword/.test(before) && /9=gold nugget/.test(before) && /5=paper x1 \[quest:test\]/.test(before) && /38=iron chestplate/.test(before) && /39=iron helmet/.test(before) && /40=leather x1 \[bag:2\]/.test(before) && (await bal()) === 100000, `${before}; balance ${await bal()}`)
    let t = await die(`minecraft:kill ${D}`)
    const after = await dump()
    check('lost: hotbar 1-5, ammo, helmet, vest and the bag', !/(^| )(0|9|10|20|38|39|40)=/.test(after), after)
    check('kept: the quest item and the phone', /5=paper x1 \[quest:test\]/.test(after) && /(^| )8=filled map x1 \[phone\]/.test(after), after)
    check('the bag\'s tier stays unlocked', (await data('bag-tier')) === '<none>' && (await data('bag-best')) === '2', `bag-tier ${await data('bag-tier')}, bag-best ${await data('bag-best')}`)
    // L = min(100000 × 1%, 6000) = 1000
    check('balance: L = min(B × p, C) = min(100000 × 1%, 6000) = $1,000', (await bal()) === 99000 && said(t, /You died and lost \$1,000/), `balance ${await bal()}; ${messagesSince(bots[D], t).map(m => m.text).join(' | ')}`)
    check('the cause is saved (a /kill: other)', (await data('last-death-cause')) === 'other', await data('last-death-cause'))

    // ---------- The bag caps the loss ----------
    await kit(1000000)
    await die(`minecraft:kill ${D}`)
    check('the bag capacity caps it: min(1000000 × 1%, 6000) = $6,000', (await bal()) === 994000, `balance ${await bal()}`)
    await kit(100000, false)
    await die(`minecraft:kill ${D}`)
    check('no bag: nothing lost (C = 0)', (await bal()) === 100000, `balance ${await bal()}`)

    // ---------- Killed by a player ----------
    await kit(100000)
    await rcon.cmd(`minecraft:tp ${K} 623.5 ${Y} 625.5`)
    // D just respawned: pvp.sk's spawn shield and EssentialsX's teleport protection block player hits.
    await rcon.cmd(`zzshieldoff ${D}`)
    await sleep(5000)
    await die(`damage ${D} 1000 minecraft:player_attack by ${K}`)
    check('killed by a player: credited to them, p = 1%', (await data('last-death-cause')) === `player:${uuidK}` && (await bal()) === 99000, `cause ${await data('last-death-cause')} (killer ${uuidK}); balance ${await bal()}`)

    // ---------- Cop death: a wanted player logs out ----------
    await kit(100000)
    await rcon.cmd(`lp user ${D} permission set donating.wanted true`)
    let perm = ''
    for (let i = 0; i < 12 && !/: true/.test(perm); i++) {
      await sleep(500)
      perm = await rcon.cmd(`zzperm ${D} donating.wanted`)
    }
    await quit(bots[D])
    await sleep(1500)
    check('a cop death costs cop-p: min(100000 × 5%, 6000) = $5,000', /: true/.test(perm) && (await data('last-death-cause')) === 'cop' && (await bal()) === 95000, `wanted ${perm.trim()}; cause ${await data('last-death-cause')}; balance ${await bal()}`)
    await rcon.cmd(`lp user ${D} permission unset donating.wanted`)
    for (let i = 0; i < 12; i++) {
      await sleep(500)
      if (/: false/.test(await rcon.cmd(`zzperm ${D} donating.wanted`))) break
    }
    bots[D] = await join(D)
    t = Date.now() - 3000
    await sleep(2000)
    check('coming back after a combat log tells you what it cost', said(t, /logged out in combat, so you died and lost \$5,000/), messagesSince(bots[D], t).map(m => m.text).join(' | '))
  } finally {
    await rcon.cmd(`lp user ${D} permission unset donating.wanted`).catch(() => {})
    for (const name of [D, K]) {
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} 0.5 68 -656.5`).catch(() => {}) // solid ground near spawn
    }
    for (const bot of Object.values(bots)) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
