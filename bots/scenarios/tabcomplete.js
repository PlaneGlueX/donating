// tabcomplete.sk (+ DonatingPhone's /dphone): commands complete their arguments (owner, 2026-09-27: "make sure all
// commands have tab fill feature for args and names (where applicable)"). Players get the lists the command would
// accept (the players next to them for /trade, no passive players for /bounty and amounts they can pay, only players
// they can see, their own titles, the leaderboards, the heists their Heist Refresh would take); nothing for commands
// without arguments, free text and console-only commands, and never a blank entry that would erase the typed word;
// the namespaced labels (/skript:bounty) behave the same; staff get subcommands, heists in the state each subcommand
// takes, trap and loot ids, crates they can give, cars and their colors, missions, booster kinds, seasons, and
// /dphone's parts and worlds.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'TabA'
const B = 'TabB'
const Y = 200
const CHUNKS = '2480 2480 2530 2530'
const HERE = [2494.5, Y, 2494.5]
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let broker = ''
  try {
    // A suggestion request with its own transaction id, answered only by the reply with that id (Mineflayer's own
    // tabComplete takes whatever reply comes next). Paper sends no reply at all for an empty list.
    let txn = 0
    const ask = (name, line, timeout) => new Promise(resolve => {
      const client = bots[name]._client
      const id = ++txn
      let timer = null
      const on = p => { if (p.transactionId === id) done((p.matches || []).map(m => (typeof m === 'string' ? m : m.match))) }
      const done = r => { clearTimeout(timer); client.removeListener('tab_complete', on); resolve(r) }
      timer = setTimeout(() => done(null), timeout)
      client.on('tab_complete', on)
      client.write('tab_complete', { transactionId: id, text: line })
    })
    const tab = async (name, line) => (await ask(name, line, 4000)) || []
    // "Nothing suggested": no reply, proven by a request that always gets one (/gps) coming back first.
    const none = async (name, line) => {
      const p = ask(name, line, 4000)
      if (!(await ask(name, '/gps ', 4000))) return ['ERR the probe got no reply (bot gone?)']
      return (await Promise.race([p, sleep(300).then(() => null)])) || []
    }
    const has = (list, ...want) => want.every(w => list.includes(w))
    const perm = async (name, node, on) => cmd(`lp user ${name} permission ${on ? 'set' : 'unset'} ${node}${on ? ' true' : ''}`)
    const next = async (who, x, z) => { await cmd(`minecraft:tp ${who} ${x} ${Y} ${z}`); await sleep(400) }
    const hstate = async () => ((await cmd('dheist info ztab')).match(/state=(\w+)/) || [])[1]

    // ---------- Setup: a platform, a test heist with a trap and a loot pile, a new heist region ----------
    for (const c of ['dtrap clear ztab confirm', 'dloot clear ztab confirm', 'dheist delete ztab confirm']) await cmd(c)
    for (const r of ['heist_ztab', 'heist_ztabnew']) await cmd(`rg remove -w world ${r}`)
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 2485 ${Y} 2485 2525 ${Y + 6} 2525 air`)
    await cmd(`fill 2485 ${Y - 1} 2485 2525 ${Y - 1} 2525 glass`)
    await cmd('zzregion heist_ztab 2500 190 2500 2512 208 2512')
    await cmd('zzregion heist_ztabnew 2488 190 2488 2498 208 2498')
    await cmd('setblock 2505 200 2505 stone_pressure_plate')
    await cmd('fill 2507 200 2507 2508 200 2507 stone')
    await cmd('dheist create ztab 1')
    await cmd('dheist set ztab level 0')
    const trapAdd = await cmd('dtrap add ztab plate 2505 200 2505')
    const lootAdd = await cmd('dloot add ztab pile 2507 200 2507 2508 200 2507 value=500')
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      for (const n of ['donating.staff', 'donating.store', 'donating.phone.admin', 'donating.season.admin']) await perm(name, n, false)
      await cmd(`dranks give ${name} none`)
      await cmd(`zzpassive ${name} off`)
    }
    await cmd(`eco set ${A} 20000`)
    await next(A, HERE[0], HERE[2])
    await next(B, HERE[0] + 1.5, HERE[2])
    await sleep(2500)

    // ---------- Players ----------
    let t = await tab(A, '/trade ')
    check('/trade suggests "cancel" and the player next to you (not yourself)', has(t, 'cancel', B) && !t.includes(A), t.join(','))
    await next(B, HERE[0] + 30, HERE[2])
    t = await tab(A, '/trade ')
    check('...but not a player out of reach (trading is in person)', has(t, 'cancel') && !t.includes(B), t.join(','))
    await next(B, HERE[0] + 1.5, HERE[2])

    // Bounties are posted with the Broker: away from him /bounty suggests nobody; next to him it does.
    broker = ((await cmd(`dquest addat hits ${HERE[0] + 30} ${Y} ${HERE[2]} 0 Tab Desk`)).match(/giver (\d+) \(hits\) added/) || [])[1] || ''
    const away = await tab(A, '/bounty ')
    check('/bounty suggests nobody away from the Broker (bounties are posted with him)', broker !== '' && !away.includes(B), `${broker} | ${away.join(',')}`)
    await cmd(`dquest remove ${broker}`)
    broker = ((await cmd(`dquest addat hits ${HERE[0]} ${Y} ${HERE[2] + 3} 0 Tab Desk`)).match(/giver (\d+) \(hits\) added/) || [])[1] || ''
    let bn = await tab(A, '/bounty ')
    let amounts = await tab(A, `/bounty ${B} `)
    check('/bounty suggests other players (not yourself), then amounts from the minimum', has(bn, B) && !bn.includes(A) && has(amounts, '1000', '5000', '10000'), `${bn.join(',')} | ${amounts.join(',')}`)
    await cmd(`eco set ${A} 2000`)
    amounts = await tab(A, `/bounty ${B} `)
    await cmd(`eco set ${A} 20000`)
    check('...only the amounts you can pay ($2,000: just the $1,000 minimum)', has(amounts, '1000') && !amounts.includes('5000'), amounts.join(','))
    await cmd(`zzpassive ${B} on`)
    bn = await none(A, '/bounty ')
    const bnNs = await none(A, '/skript:bounty ')
    await cmd(`zzpassive ${B} off`)
    check('...never a passive player (nobody can place a bounty on them), also as /skript:bounty', !bn.includes(B) && !bn.includes(A) && !bnNs.includes(B) && !bnNs.includes(A), `${bn} | ${bnNs}`)
    await cmd(`zzpassive ${A} on`)
    bn = await none(A, '/bounty ')
    await cmd(`zzpassive ${A} off`)
    check('...and nobody at all while you are passive (you can\'t place one)', bn.length === 0, JSON.stringify(bn))

    await cmd(`minecraft:tag ${B} add zztabhide`)
    await cmd(`zzhide ${A} zztabhide`)
    await sleep(300)
    const hidT = await tab(A, '/trade ')
    const hidB = await none(A, '/bounty ')
    await cmd(`zzshow ${A} zztabhide`)
    await cmd(`minecraft:tag ${B} remove zztabhide`)
    check('a player hidden from you (vanished staff) is never suggested', !hidT.includes(B) && !hidB.includes(B), `${hidT.join(',')} | ${hidB.join(',')}`)

    const lb = await tab(A, '/lb ')
    const gps = await tab(A, '/gps ')
    const ti = await tab(A, '/title ')
    const ke = await tab(A, '/killeffect ')
    const bs = await tab(A, '/bagskin ')
    check('/lb the three boards, /gps clear and off, /title and /killeffect none, /bagskin default', has(lb, 'earners', 'heisters', 'wheelmen') && has(gps, 'clear', 'off') && has(ti, 'none') && has(ke, 'none') && has(bs, 'default'), `${lb} | ${gps} | ${ti} | ${ke} | ${bs}`)
    const hr = await none(A, '/heistrefresh ')
    check('/heistrefresh suggests no heist without the rank', hr.length === 0, JSON.stringify(hr))
    // With Elite and a ready refresh: a heist cooling down, never a disabled one.
    await cmd(`dranks give ${A} elite`)
    await cmd(`zzdata ${A} refresh-at none`)
    await sleep(2000)
    const hrOff = await none(A, '/heistrefresh ')
    await cmd('dheist exit ztab 2495.5 200 2505.5')
    await cmd('dheist snapshot ztab')
    await cmd('dheist enable ztab')
    for (let i = 0; i < 50 && (await hstate()) !== 'open'; i++) await sleep(200)
    await cmd('dheist start ztab')
    await cmd('dheist end ztab')
    await sleep(300)
    const cooling = await hstate()
    const hrOn = await tab(A, '/heistrefresh ')
    await cmd('dheist disable ztab')
    await sleep(300)
    const hrOff2 = await none(A, '/heistrefresh ')
    await cmd(`dranks give ${A} none`)
    check('/heistrefresh with a ready refresh: a heist cooling down, never a disabled one', !hrOff.includes('ztab') && cooling === 'cooldown' && hrOn.includes('ztab') && !hrOff2.includes('ztab'), JSON.stringify([hrOff, cooling, hrOn, hrOff2]))
    const afk = await none(A, '/afk x')
    const gar = await none(A, '/garage x')
    const help = await none(A, '/help 2')
    check('commands without arguments suggest nothing, also after a typed word (no blank entry)', afk.length === 0 && gar.length === 0 && help.length === 0, JSON.stringify([afk, gar, help]))
    const dshop = await none(A, '/dshop open ')
    const pick = await none(A, '/gpspick ')
    const pickNs = await none(A, '/skript:gpspick ')
    check('console-only commands suggest nothing to players (also as /skript:gpspick)', dshop.length === 0 && pick.length === 0 && pickNs.length === 0, JSON.stringify([dshop, pick, pickNs]))

    // ---------- Staff ----------
    await perm(A, 'donating.staff', true)
    await perm(A, 'donating.store', true)
    await perm(A, 'donating.phone.admin', true)
    await sleep(2500)
    const dh = await tab(A, '/dheist ')
    const keys = await tab(A, '/dheist set ztab ')
    const nm = await none(A, '/dheist set ztab name ')
    check('/dheist: subcommands, the settings, and no "default" after name (it would rename the heist)', has(dh, 'create', 'set', 'enable', 'snapshot', 'delete') && has(keys, 'name', 'cooldown', 'level', 'advanced') && !nm.includes('default'), `${dh} | ${keys} | ${nm}`)
    const lock = await tab(A, '/dheist lock ztab ')
    const holo = await tab(A, '/dheist holo ztab ')
    const create = await tab(A, '/dheist create ')
    const info = await tab(A, '/dheist info zt')
    check('/dheist lock add|list|clear|test, holo remove, create the heist region you stand in, info the heists', has(lock, 'add', 'list', 'clear', 'test') && has(holo, 'remove') && has(create, 'ztabnew') && has(info, 'ztab'), `${lock} | ${holo} | ${create} | ${info}`)
    const en = await tab(A, '/dheist enable ')
    const st = await none(A, '/dheist start ')
    const kick = await none(A, '/dheist kick ')
    check('/dheist offers a heist only where its state allows it (enable a disabled one, not start), kick only robbers in a heist', has(en, 'ztab') && !st.includes('ztab') && !kick.includes(B) && !kick.includes(A), `${en} | ${st} | ${kick}`)
    // Standing in a heist region that is a heist already: nothing to create (the guard, not a blank entry).
    await cmd(`gamemode creative ${A}`)
    await next(A, 2502.5, 2502.5)
    const createIn = await none(A, '/dheist create ')
    await next(A, HERE[0], HERE[2])
    await cmd(`gamemode survival ${A}`)
    const filtered = await none(A, '/dheist info qqq')
    const noCar = await none(A, `/dgarage give ${B} nosuchcar x`)
    check('a list with nothing in it sends nothing (no blank entry erasing the typed word)', createIn.length === 0 && filtered.length === 0 && noCar.length === 0, JSON.stringify([createIn, filtered, noCar]))
    const tr = await tab(A, '/dtrap info ')
    const tre = await tab(A, '/dtrap set ztab-1 effect ')
    const trs = await tab(A, '/dtrap show ztab ')
    await cmd('dheist set ztab advanced true')
    const treAdv = await tab(A, '/dtrap set ztab-1 effect ')
    await cmd('dheist set ztab advanced default')
    check('/dtrap: the trap ids, effect=alarm only in an advanced heist, show seconds|off', has(tr, 'ztab-1') && has(tre, 'damage') && !tre.includes('alarm') && has(treAdv, 'alarm') && has(trs, 'off'), `${trapAdd} | ${tr} | ${tre} | ${treAdv} | ${trs}`)
    const lo = await tab(A, '/dloot info ')
    const lok = await tab(A, '/dloot set ztab-1 ')
    const los = await tab(A, '/dloot set ztab-1 style ')
    const lopc = await tab(A, '/dloot set ztab-1 per-cell ')
    const rg = await none(A, '/dloot regate ')
    const pv = await tab(A, '/dloot preview ')
    const rl = await none(A, '/dloot roll ')
    check('/dloot: the loot ids, a pile\'s settings and their values, regate only gates, preview a disabled heist, roll only an open one', has(lo, 'ztab-1') && has(lok, 'value', 'style', 'piece') && !lok.includes('digits') && has(los, 'cash', 'gold') && has(lopc, '1', '2', '4') && !rg.includes('ztab-1') && has(pv, 'ztab') && !rl.includes('ztab'), `${lootAdd} | ${lo} | ${lok} | ${los} | ${lopc} | ${rg} | ${pv} | ${rl}`)
    const give = await tab(A, `/dcrate give ${B} `)
    const take = await tab(A, `/dcrate take ${B} `)
    check('/dcrate give suggests the crates it gives (never Season), take all of them', has(give, 'common', 'legendary', 'hacked') && !give.includes('season') && has(take, 'season'), `${give} | ${take}`)
    const colors = await tab(A, `/dgarage give ${B} sedan `)
    const gcars = await tab(A, `/dgarage give ${B} `)
    const tcars = await none(A, `/dgarage take ${B} `)
    check('/dgarage give <player> suggests the cars they don\'t own and the Sedan\'s colors, take none (they own none)', has(colors, 'Red', 'Navy') && has(gcars, 'sedan') && tcars.length === 0, `${colors} | ${gcars} | ${tcars}`)
    const missions = await tab(A, `/dstory set ${B} `)
    check('/dstory set <player> suggests the mission ids', has(missions, 'c1_meet', 'c5_end'), missions.join(','))
    const k3 = await tab(A, `/dbooster add ${B} `)
    const k4 = await tab(A, `/dbooster add ${B} xp `)
    const m4 = await tab(A, `/dbooster add ${B} 1.5 `)
    check('/dbooster add: kinds or a multiplier, then the multiplier after a kind, the minutes after a multiplier', has(k3, 'money', 'xp', 'rush', '1.5') && has(k4, '1.5', '2') && has(m4, '5', '30'), `${k3} | ${k4} | ${m4}`)
    const more = {
      ranks: await tab(A, `/dranks give ${B} `),
      cops: await tab(A, '/dcops '),
      cops2: await tab(A, '/dcops ztab '),
      poi: await tab(A, '/dpoi add '),
      quest: await tab(A, '/dquest add '),
      keeper: await tab(A, '/dshopkeeper add '),
      ct: await tab(A, '/dcontract spot '),
      ctEnd: await none(A, '/dcontract end '),
      tut: await tab(A, `/dtutorial ${B} `),
      lvl: await tab(A, `/dlevel set ${B} `),
      laser: await tab(A, '/dtrap add ztab laser here ')
    }
    check('staff lists: ranks, cops, POI types, quest kinds, shopkeepers, contract spots (end only players with a job), tutorial, levels, laser heights',
      has(more.ranks, 'legend', 'vip', 'none') && has(more.cops, 'ztab') && has(more.cops2, 'add', 'spawn') && has(more.poi, 'base', 'landmark') &&
      has(more.quest, 'contracts', 'story') && has(more.keeper, 'gun', 'cars') && has(more.ct, 'add', 'remove') && !more.ctEnd.includes(B) &&
      has(more.tut, 'reset', 'done') && has(more.lvl, '6') && has(more.laser, 'low', 'high'), JSON.stringify(more))
    const ds = await tab(A, '/dseason ')
    await perm(A, 'donating.season.admin', true)
    await sleep(2000)
    const dsAdmin = await tab(A, '/dseason ')
    const holoB = await tab(A, '/dseason holo ')
    check('/dseason: start, end, void... only for season admins; holo the boards', has(ds, 'info', 'finals', 'rank') && !ds.includes('start') && has(dsAdmin, 'start', 'end', 'void', 'approve') && has(holoB, 'earners'), `${ds} | ${dsAdmin} | ${holoB}`)
    const sc = await none(A, '/sc hello')
    const bc = await none(A, '/bc restart soon')
    check('staff chat and broadcasts suggest nothing while typing', sc.length === 0 && bc.length === 0, JSON.stringify([sc, bc]))
    await cmd(`minecraft:tag ${B} add zztabhide`)
    await cmd(`zzhide ${A} zztabhide`)
    await sleep(300)
    const lv = await tab(A, '/dlevel info ')
    const ph = await tab(A, '/dphone status ')
    await cmd(`zzshow ${A} zztabhide`)
    await cmd(`minecraft:tag ${B} remove zztabhide`)
    check('staff lists (and /dphone) skip hidden players too, and include yourself', !lv.includes(B) && lv.includes(A) && !ph.includes(B) && ph.includes(A), `${lv} | ${ph}`)
    const phone = await tab(A, '/dphone ')
    const roads = await tab(A, '/dphone roads ')
    const worlds = await tab(A, `/dphone gps ${B} set pin `)
    check('/dphone (the phone plugin) suggests its parts and the worlds for gps set', has(phone, 'reload', 'status', 'roads', 'gps') && has(roads, 'info', 'scan', 'cancel', 'show') && has(worlds, 'world'), `${phone} | ${roads} | ${worlds}`)
  } finally {
    for (const name of [A, B]) {
      for (const n of ['donating.staff', 'donating.store', 'donating.phone.admin', 'donating.season.admin']) await rcon.cmd(`lp user ${name} permission unset ${n}`).catch(() => {})
      await rcon.cmd(`zzshow ${name} zztabhide`).catch(() => {})
      await rcon.cmd(`minecraft:tag ${name} remove zztabhide`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`dranks give ${name} none`).catch(() => {})
      await rcon.cmd(`zzdata ${name} refresh-at none`).catch(() => {})
      await rcon.cmd(`gamemode survival ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} ${FAR}`).catch(() => {})
    }
    if (broker) await rcon.cmd(`dquest remove ${broker}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    for (const c of ['dtrap clear ztab confirm', 'dloot clear ztab confirm', 'dheist delete ztab confirm']) await rcon.cmd(c).catch(() => {})
    for (const r of ['heist_ztab', 'heist_ztabnew']) await rcon.cmd(`rg remove -w world ${r}`).catch(() => {})
    await rcon.cmd('minecraft:kill @e[tag=poi_h_ztab]').catch(() => {})
    await rcon.cmd(`fill 2485 ${Y - 1} 2485 2525 ${Y + 6} 2525 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    rcon.close()
  }
}
