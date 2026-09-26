// ranks.sk: paid ranks (cosmetic LuckPerms groups). Their tag shows before the name in the tab list and
// in chat, and they sort players higher in the tab list: staff, then the paid ranks highest first, then
// the biggest bounty, then A-Z (TAB). /ranks lists them; /dranks (staff) sets them up and gives them,
// one at a time. The footer shows the robber level (levels.sk), not the rank. Robber levels themselves
// are bots\run.js levels.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

// Names picked so A-Z and the bounty would both put them the other way round.
const Z = 'TabZed' // legend
const M = 'TabMid' // vip, then elite, then none
const A = 'TabAbe' // no rank, the biggest bounty (and the observer)
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    for (const name of [Z, M, A]) {
      bots[name] = await join(name)
      await cmd(`dranks give ${name} none`)
      await cmd(`zzbountyreset ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`lp user ${name} permission unset donating.staff`)
    }
    // The observer's view of the tab list: list order (1.21.2+) and team names from the packets.
    const obs = bots[A]
    const order = {}
    obs._client.on('player_info', p => {
      for (const e of p.data || []) {
        for (const [k, v] of Object.entries(e)) if (/order|priority/i.test(k) && typeof v === 'number') order[e.uuid] = v
      }
    })
    await cmd('dranks setup')
    await cmd(`zzbounty ${A} 5000 kill`)
    await cmd(`dranks give ${Z} legend`)
    await cmd(`dranks give ${M} vip`)
    await sleep(3000)
    const shown = name => { const p = obs.players[name]; return p && p.displayName ? p.displayName.toString() : '' }
    // The client's own order (26.3 PlayerTabOverlay): list order (high first), then team name, then name.
    const sorted = names => names.slice().sort((a, b) => {
      const pa = obs.players[a]; const pb = obs.players[b]
      const oa = order[pa && pa.uuid] || 0; const ob = order[pb && pb.uuid] || 0
      if (oa !== ob) return ob - oa
      const ta = (obs.teamMap[a] && obs.teamMap[a].team) || ''; const tb = (obs.teamMap[b] && obs.teamMap[b].team) || ''
      if (ta !== tb) return ta < tb ? -1 : 1
      return a.toLowerCase() < b.toLowerCase() ? -1 : 1
    })
    const why = names => names.map(n => `${n}[order=${order[obs.players[n] && obs.players[n].uuid]} team=${obs.teamMap[n] && obs.teamMap[n].team} name=${shown(n)}]`).join(' ')

    // ---------- Tags and order ----------
    check('the paid rank\'s tag is before the name in the tab list, none without one', /\[Legend\] TabZed/.test(shown(Z)) && /\[VIP\] TabMid/.test(shown(M)) && !/\[/.test(shown(A)) && /TabAbe/.test(shown(A)), why([Z, M, A]))
    let got = sorted([A, M, Z])
    check('higher ranks sit higher: Legend, then VIP, then no rank (even with the biggest bounty and A-Z first)', got.join(',') === `${Z},${M},${A}`, `${got} ${why([Z, M, A])}`)
    const online = Object.keys(obs.players)
    if (online.includes('Explosde')) {
      got = sorted(['Explosde', Z, M, A])
      check('staff stay above every paid rank', got[0] === 'Explosde', `${got}`)
    }

    // ---------- Rank bags: the look and more room on any tier ----------
    const bagOf = async name => {
      const r = await cmd(`zzbag ${name}`)
      const model = await cmd(`data get entity ${name} equipment.offhand.components."minecraft:custom_model_data"`)
      return { room: Number((r.match(/room=([\d.]+)/) || [])[1]), model: (model.match(/donating:bag_\w+/) || [''])[0], name: await cmd(`zzoffhand ${name}`) }
    }
    for (const name of [Z, M, A]) await cmd(`zztestkit ${name}`) // a Duffel Bag ($6,000)
    await sleep(1500)
    let bz = await bagOf(Z)
    let bm = await bagOf(M)
    let ba = await bagOf(A)
    check('a Legend\'s Duffel Bag holds 25% more ($7,500) and looks Neon; a VIP\'s 5% ($6,300), Camo', bz.room === 7500 && bz.model === 'donating:bag_neon' && /Neon Duffel Bag/.test(bz.name) && bm.room === 6300 && bm.model === 'donating:bag_camo', `${JSON.stringify(bz)} ${JSON.stringify(bm)}`)
    check('...no rank: the normal Duffel Bag ($6,000)', ba.room === 6000 && ba.model === 'donating:bag_2', JSON.stringify(ba))
    let t = Date.now()
    bots[M].chat('/bagskin neon')
    await sleep(800)
    check('a VIP can\'t pick a higher rank\'s skin', /don't have that skin/.test(messagesSince(bots[M], t).map(m => m.text).join(' ')) && (await bagOf(M)).model === 'donating:bag_camo')
    bots[Z].chat('/bagskin camo')
    await sleep(800)
    const zc = await bagOf(Z)
    bots[Z].chat('/bagskin default')
    await sleep(800)
    const zd = await bagOf(Z)
    check('a Legend can pick any lower skin, or the tier\'s own look; the room stays', zc.model === 'donating:bag_camo' && zd.model === 'donating:bag_2' && zd.room === 7500, `${JSON.stringify(zc)} ${JSON.stringify(zd)}`)
    bots[Z].chat('/bagskin neon')
    await sleep(500)

    // ---------- One rank at a time ----------
    await cmd(`dranks give ${M} elite`)
    await sleep(2500)
    const list = await cmd('dranks list')
    check('giving another rank replaces the old one (one paid rank at a time)', /\[Elite\] TabMid/.test(shown(M)) && !/VIP/.test(shown(M)) && /RANKS TabMid elite/.test(list) && !/TabMid vip/.test(list), `${shown(M)} / ${list}`)
    await cmd(`dranks give ${M} none`) // "give" never downgrades: Elite to VIP+ needs a clear first
    await cmd(`dranks give ${M} vipplus`)
    await sleep(2500)
    t = Date.now()
    bots[M].chat('/ranks')
    await sleep(900)
    const plus = messagesSince(bots[M], t).map(m => m.text).join(' | ')
    check('VIP+ is found too (LuckPerms gives Vault the display name "VIP+")', /\[VIP\+\] TabMid/.test(shown(M)) && /Yours: \[VIP\+\] VIP\+/.test(plus) && /RANKS TabMid vipplus/.test(await cmd('dranks list')), `${shown(M)} / ${plus}`)
    await cmd(`dranks give ${M} none`)
    await sleep(2500)
    got = sorted([A, M, Z])
    check('"none" takes it away: the tag goes, and the bounty decides among players without a rank', !/\[/.test(shown(M)) && got.join(',') === `${Z},${A},${M}`, `${got} ${why([Z, M, A])}`)
    await sleep(4000) // the bag follows within 5 s
    bm = await bagOf(M)
    check('...and the bag goes back to the normal look and room ($6,000)', bm.model === 'donating:bag_2' && bm.room === 6000, JSON.stringify(bm))
    check('an unknown rank is refused', /no rank gold/.test(await cmd(`dranks give ${M} gold`)))

    // ---------- Chat, /ranks, the footer ----------
    t = Date.now()
    bots[Z].chat('hello from a legend')
    await sleep(1200)
    const line = messagesSince(obs, t).map(m => m.text).find(x => /hello from a legend/.test(x)) || ''
    check('the tag shows in chat too, then a space and the name', /\[Legend\] TabZed: hello from a legend/.test(line), line)
    t = Date.now()
    bots[Z].chat('/ranks')
    await sleep(900)
    const out = messagesSince(bots[Z], t).map(m => m.text).join(' | ')
    check('/ranks lists them highest first, says what they give, and shows yours', /\[Legend\] Legend.*\[Elite\] Elite.*\[VIP\+\] VIP\+.*\[VIP\] VIP/.test(out) && /gives your bag its look and more room/.test(out) && /Neon bag, \+25% room, daily Common, Uncommon, Rare keys, Heist Refresh every 6h/.test(out) && /VIP · Camo bag, \+5% room \|/.test(out) && /Yours: \[Legend\] Legend/.test(out) && /\/level/.test(out), out)
    t = Date.now()
    bots[M].chat('/dranks list')
    await sleep(900)
    check('/dranks is the owner\'s and the store\'s only', messagesSince(bots[M], t).some(m => /Only the owner and the store/.test(m.text)), messagesSince(bots[M], t).map(m => m.text).join(' | '))
    // Refunds: "take" removes that rank only if it's the player's; "give" never downgrades.
    await cmd(`dranks give ${Z} vip`)
    const kept = await cmd(`dranks list`)
    const skipped = await cmd(`dranks take ${Z} vip`)
    await sleep(1500)
    check('buying a lower rank keeps the higher one, and refunding a rank they don\'t have takes nothing', /TabZed legend/.test(kept) && /nothing taken/.test(skipped) && /\[Legend\] TabZed/.test(shown(Z)), `${kept} / ${skipped} / ${shown(Z)}`)
    const took = await cmd(`dranks take ${Z} legend`)
    await sleep(2000)
    check('refunding their rank takes exactly that one', /lost legend/.test(took) && !/\[/.test(shown(Z)), `${took} / ${shown(Z)}`)
    await cmd(`dranks give ${Z} legend`)
    await sleep(1500)
    // The Legend's own footer: it must show their level, not their rank.
    const footer = bots[Z].tablist && bots[Z].tablist.footer ? bots[Z].tablist.footer.toString() : ''
    check('the footer shows the robber level, not the rank', /Level 0 Pickpocket/.test(footer) && /\/level/.test(footer) && !/Legend|VIP/.test(footer), footer)
  } finally {
    for (const name of [Z, M, A]) {
      await rcon.cmd(`dranks give ${name} none`).catch(() => {})
      await rcon.cmd(`zzbountyreset ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    await sleep(1000)
    for (const bot of Object.values(bots)) await quit(bot)
    rcon.close()
  }
}
