// pv.sk + DonatingPhone's hide-at-spawn listener: a personal entity is sent to its owner only (the other player's
// client never gets a spawn packet for it), a new one with the same key replaces the old, it goes when its owner quits,
// and an entity that anyone else could see is removed at once and switches personal views off (fail closed).
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'PvA'
const B = 'PvB'
const Y = 200
const CHUNKS = '2890 2890 2910 2910'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 2892 ${Y - 1} 2892 2908 ${Y - 1} 2908 glass`)
    await cmd('dpv reset')
    const seen = { [A]: new Set(), [B]: new Set() }
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`zzclear ${name}`)
      bots[name]._client.on('spawn_entity', p => seen[name].add(String(p.objectUUID).toLowerCase()))
    }
    await cmd(`minecraft:tp ${A} 2898.5 ${Y} 2900.5`)
    await cmd(`minecraft:tp ${B} 2902.5 ${Y} 2900.5`)
    await sleep(2500)

    const r = await cmd(`zzpv ${A} test 2900.5 ${Y + 1} 2900.5`)
    const uuid = ((r.match(/PVITEM \S+ test (\S+)/) || [])[1] || '').toLowerCase()
    await sleep(1500)
    const pv = await cmd(`dphone pv ${uuid}`)
    check('a personal entity spawns invisible by default and is sent to its owner only', /default=false/.test(pv) && /tracked=PvA( |$)/.test(pv) && /see=PvA( |$)/.test(pv), `${r} | ${pv}`)
    check('...the other player\'s client never receives it (no spawn packet), the owner\'s does', seen[A].has(uuid) && !seen[B].has(uuid), `A=${seen[A].has(uuid)} B=${seen[B].has(uuid)}`)
    const r2 = await cmd(`zzpv ${A} test 2901.5 ${Y + 1} 2900.5`)
    const uuid2 = ((r2.match(/PVITEM \S+ test (\S+)/) || [])[1] || '').toLowerCase()
    await sleep(500)
    const old = await cmd(`dphone pv ${uuid}`)
    check('a new one with the same key replaces the old', /none/.test(old) && uuid2 && uuid2 !== uuid, `${old} | ${r2}`)
    const info = await cmd(`dpv info ${A}`)
    check('/dpv info lists the owner\'s keys', /keys=test/.test(info), info)
    await quit(bots[A])
    delete bots[A]
    await sleep(1500)
    const gone = await cmd(`dphone pv ${uuid2}`)
    check('an owner\'s personal entities go when they quit', /none/.test(gone), gone)
    bots[A] = await join(A)
    await cmd(`minecraft:tp ${A} 2898.5 ${Y} 2900.5`)
    await sleep(2000)
    const leak = await cmd(`zzpvleak ${A}`)
    check('an entity someone else can see is removed at once and switches personal views off', /adopted=false/.test(leak) && /valid=false/.test(leak) && /ready=false/.test(leak), leak)
    const off = await cmd(`zzpv ${A} test2 2900.5 ${Y + 1} 2900.5`)
    await cmd('dpv reset')
    const on = await cmd(`zzpv ${A} test3 2900.5 ${Y + 1} 2900.5`)
    check('...then nothing personal spawns until staff switch it back on (/dpv reset)', /test2 none/.test(off) && /test3 [0-9a-f-]{36}/.test(on), `${off} | ${on}`)
    const t = Date.now()
    bots[B].chat('/dpv info PvA')
    await sleep(800)
    const said = messagesSince(bots[B], t).map(m => m.text).join(' | ')
    check('/dpv is staff only', /Staff only/.test(said), said)
  } finally {
    await rcon.cmd('dpv reset').catch(() => {})
    for (const name of [A, B]) await rcon.cmd(`minecraft:tp ${name} ${FAR}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 2892 ${Y - 1} 2892 2908 ${Y - 1} 2908 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
