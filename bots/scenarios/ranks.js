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

    // ---------- One rank at a time ----------
    await cmd(`dranks give ${M} elite`)
    await sleep(2500)
    const list = await cmd('dranks list')
    check('giving another rank replaces the old one (one paid rank at a time)', /\[Elite\] TabMid/.test(shown(M)) && !/VIP/.test(shown(M)) && /RANKS TabMid elite/.test(list) && !/TabMid vip/.test(list), `${shown(M)} / ${list}`)
    await cmd(`dranks give ${M} vipplus`)
    await sleep(2500)
    let t = Date.now()
    bots[M].chat('/ranks')
    await sleep(900)
    const plus = messagesSince(bots[M], t).map(m => m.text).join(' | ')
    check('VIP+ is found too (LuckPerms gives Vault the display name "VIP+")', /\[VIP\+\] TabMid/.test(shown(M)) && /Yours: \[VIP\+\] VIP\+/.test(plus) && /RANKS TabMid vipplus/.test(await cmd('dranks list')), `${shown(M)} / ${plus}`)
    await cmd(`dranks give ${M} none`)
    await sleep(2500)
    got = sorted([A, M, Z])
    check('"none" takes it away: the tag goes, and the bounty decides among players without a rank', !/\[/.test(shown(M)) && got.join(',') === `${Z},${A},${M}`, `${got} ${why([Z, M, A])}`)
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
    check('/ranks lists them highest first, says they\'re cosmetic, and shows yours', /\[Legend\] Legend.*\[Elite\] Elite.*\[VIP\+\] VIP\+.*\[VIP\] VIP/.test(out) && /Nothing else: no money, guns or bags/.test(out) && /Yours: \[Legend\] Legend/.test(out) && /\/level/.test(out), out)
    t = Date.now()
    bots[M].chat('/dranks list')
    await sleep(900)
    check('/dranks is staff only', messagesSince(bots[M], t).some(m => /Staff only/.test(m.text)), messagesSince(bots[M], t).map(m => m.text).join(' | '))
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
