// zz-tab.sk (tools\make-zz-tab.js): the local test helpers in game for the owner only (owner.sk ownerIs, by UUID). Anyone
// else gets "Unknown command", no completions and no /zz* in their command list. The owner's side needs a bot named
// Explosde (offline mode gives it the owner's local UUID), so it's skipped while the owner is online.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const B = 'ZzTabby'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
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
    const none = async (name, line) => {
      const p = ask(name, line, 4000)
      if (!(await ask(name, '/gps ', 4000))) return ['ERR the probe got no reply']
      return (await Promise.race([p, sleep(300).then(() => null)])) || []
    }
    let declared = null
    const watch = bot => bot._client.on('declare_commands', p => {
      declared = (p.nodes || []).map(n => n.extraNodeData && n.extraNodeData.name).filter(Boolean)
    })

    bots[B] = await join(B)
    watch(bots[B])
    await cmd(`lp user ${B} permission unset donating.staff`)
    await sleep(500)
    let t = Date.now()
    bots[B].chat(`/zzbal ${B}`)
    await sleep(900)
    const said = messagesSince(bots[B], t).map(m => m.text).join(' | ')
    check('a player who isn\'t the owner gets "Unknown command" for a zz helper', /Unknown command/.test(said) && !/BAL/.test(said), said)
    const sug = await none(B, '/zzheist ')
    check('...and no completions for its arguments', sug.length === 0, JSON.stringify(sug))
    check('...and no /zz* in their command list', declared && declared.length > 50 && !declared.some(n => /^(skript:)?zz/.test(n)), declared ? declared.filter(n => /zz/.test(n)).join(',') || `${declared.length} names` : 'no declare_commands')

    const online = (await cmd('minecraft:list')).includes('Explosde')
    if (online) {
      console.log('SKIP the owner\'s side: Explosde is online')
    } else {
      bots.Explosde = await join('Explosde')
      declared = null
      watch(bots.Explosde)
      await sleep(1500)
      t = Date.now()
      bots.Explosde.chat('/zzbal Explosde')
      await sleep(900)
      const own = messagesSince(bots.Explosde, t).map(m => m.text).join(' | ')
      check('the owner runs a zz helper in game', /BAL/.test(own), own)
      const heists = await ask('Explosde', '/zzhunt Explosde ', 4000)
      const list = (await cmd('dheist list')).toLowerCase()
      check('...and gets its arguments completed (heist ids)', heists && heists.length > 0 && heists.every(h => list.includes(h.toLowerCase())), JSON.stringify(heists))
      const subs = await ask('Explosde', '/zzjail Explosde ', 4000)
      check('...and the words a helper takes', subs && subs.includes('info') && subs.includes('state'), JSON.stringify(subs))
    }
  } finally {
    for (const b of Object.values(bots)) await quit(b)
    rcon.close()
  }
}
