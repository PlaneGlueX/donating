// patrols.sk: N = min(cap, ceil(A / 2)) street patrols; they chase only a player with loot, on the street, in sight; losing them
// or the loot ends it. Run.js leaves patrols on for this scenario only.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')
const NAMES = ['PatrolA', 'PatrolB', 'PatrolC']

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).replace(/§./g, '').trim()
  const info = () => cmd('dpatrol info')
  const until = async (f, ms) => { for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) if (await f()) return true; return false }
  const bots = []
  try {
    check('N = min(4, ceil(A / 2))', [[0, 0], [1, 1], [2, 1], [3, 2], [8, 4], [10, 4]].every(([a]) => true) && /want=0/.test(await cmd('dpatrol want 0')) && /want=1/.test(await cmd('dpatrol want 2')) && /want=2/.test(await cmd('dpatrol want 3')) && /want=4/.test(await cmd('dpatrol want 10')))
    for (const n of NAMES) {
      bots.push(await join(n))
      await cmd(`zzjail ${n} state out`)
      await cmd(`zzbagclear ${n}`)
      await cmd(`execute in minecraft:overworld run minecraft:tp ${n} 618.5 65 115.5`)
    }
    check('three active players: two patrols out', await until(async () => /alive=2/.test(await info()), 25000), await info())
    await cmd(`minecraft:tp ${NAMES[1]} 0.5 200 0.5`)
    const [A] = NAMES
    let i = await info()
    const at = (i.match(/at=(-?\d+),(-?\d+),(-?\d+)/) || []).slice(1).map(Number)
    check('...standing somewhere in the city', at.length === 3, i)
    await cmd(`execute in minecraft:overworld run minecraft:tp ${A} ${at[0] + 4} ${at[1]} ${at[2]}`)
    await sleep(7000)
    check('no loot: the patrol leaves them alone', !new RegExp(`chased=.*${A}`).test(await info()), await info())
    await cmd(`zzbagadd ${A} pawn#1 500`)
    check('loot in sight of a patrol: chased', await until(async () => new RegExp(`chased=.*${A}`).test(await info()), 8000), await info())
    await cmd(`zzbagclear ${A}`)
    check('the loot gone: chase over', await until(async () => !new RegExp(`chased=.*${A}`).test(await info()), 8000), await info())
    await cmd(`zzbagadd ${A} pawn#1 500`)
    await until(async () => new RegExp(`chased=.*${A}`).test(await info()), 8000)
    await cmd(`minecraft:tp ${A} 0.5 200 0.5`)
    check('far away: lost them', await until(async () => !new RegExp(`chased=.*${A}`).test(await info()), 8000), await info())
    await cmd(`zzbagclear ${A}`)
  } finally {
    for (const b of bots) await quit(b).catch(() => {})
    await sleep(500)
  }
  check('nobody online: no patrol left', await until(async () => /alive=0/.test(await info()), 10000), await info())
  rcon.close && rcon.close()
}
