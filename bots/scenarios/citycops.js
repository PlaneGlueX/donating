// PLAN section 12 (d), cops.sk's walk: do cops reach a robber deep in a heist? `bots/run.js citycops [heist...]`. A tough robber
// waits inside with the way open (the gates a robber must open first, opened by zzlootopen), the alarm is raised, and a cop
// must come within 8 blocks.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')
const P = 'CopWalk'
const HEISTS = {
  bank: { level: 20, wait: [612.5, 49, 300.5], gates: [3, 4] },
  casino: { level: 45, wait: [864.5, 57, 354.5], gates: [] },
  // shortcut: Reserve cops stop at the teller counter (x 718), so they hold the hall and never reach the vault; a route for them needs a gap in the counter
  reserve: { level: 50, wait: [712.5, 65, 176.5], gates: [] },
  power: { level: 25, wait: [1055.5, 65, 329.5], gates: [] },
  evidence: { level: 30, wait: [1010.5, 57, 474.5], gates: [] },
  mansion: { level: 60, wait: [1230.5, 91, 657.5], gates: [1] }
}
const WAYS = {
  bank: '640.5 65 300.5, 625.5 65 300.5, 610.5 65 312.5, 600.5 65 313.5, 600.5 65 318.5, 600.5 57 310.5, 603.5 57 294.5, 610.5 49 296.5',
  reserve: '678.5 65 176.5, 700.5 65 176.5, 716.5 65 176.5, 718.5 66 176.5, 720.5 65 176.5, 729.5 65 176.5, 743.5 53 176.5, 744.5 53 170.5, 730.5 53 170.5',
  evidence: '1009.5 65 458.5, 1026.5 65 467.5, 1026.5 65 473.5, 1010.5 65 473.5, 1010.5 65 480.5, 1009.5 65 498.5, 1009.5 65 503.5, 1009.5 57 513.5, 1015.5 57 513.5, 1015.5 57 495.5, 1015.5 57 480.5',
  mansion: '1250.5 91 615.5, 1250.5 91 628.5, 1241.5 91 623.5, 1230.5 91 622.5, 1222.5 91 623.5, 1222.5 91 630.5, 1222.5 91 649.5, 1229.5 91 650.5, 1229.5 91 654.5'
}
module.exports = async ({ check, args }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null, id = null
  try {
    bot = await join(P)
    for (id of (args.filter(a => HEISTS[a]).length ? args.filter(a => HEISTS[a]) : Object.keys(HEISTS))) {
      const H = HEISTS[id]
      await cmd(`zzjail ${P} state none`)
      await cmd(`zzclear ${P}`)
      await cmd(`zzbagclear ${P}`)
      await cmd(`gamemode survival ${P}`)
      await cmd(`zzpassive ${P} off`)
      await cmd(`dlevel set ${P} ${H.level}`)
      await cmd(`effect give ${P} minecraft:resistance 300 4 true`)
      await cmd(`effect give ${P} minecraft:regeneration 300 4 true`)
      await cmd(`zzheisttp ${P} ${H.wait.join(' ')}`)
      for (let i = 0; i < 16 && !new RegExp(` ${id} `).test(await cmd(`zzinheist ${P}`)); i++) await sleep(500)
      check(`${id}: the robber is inside`, new RegExp(` ${id} `).test(await cmd(`zzinheist ${P}`)), `${await cmd(`zzinheist ${P}`)} ${await cmd(`data get entity ${P} Pos`)}`.slice(0, 200))
      if (WAYS[id]) { await cmd(`dcops ${id} way clear`); for (const w of WAYS[id].split(', ')) await cmd(`dcops ${id} way ${w}`) }
      for (const g of H.gates) await cmd(`zzlootopen ${id} ${g}`)
      const reply = await cmd(`dheist alarm ${id}`)
      const [wx, wy, wz] = H.wait
            // Cops are the only NPCs here: count them near the vault and round the walk out by rings.
      const near = async r => Number(((await cmd(`execute if entity @e[tag=CITIZENS_NPC,x=${wx},y=${wy},z=${wz},distance=..${r}]`)).match(/Count: (\d+)/) || [0, 0])[1])
      const track = []
      let best = Infinity, sameLevel = false, seen = 0, last = ''
      const end = Date.now() + 120000
      while (Date.now() < end && !sameLevel) {
        await sleep(3000)
        seen++
        if (seen % 5 === 0) track.push(`t=${seen * 3}: ${(await cmd(`zzcoppos ${id}`)).slice(7, 70)}`)
        for (const r of [8, 16, 24, 32, 48, 64]) if (await near(r) && r < best) { best = r; last = `t=${seen * 3}`; break }
        if (await near(8)) sameLevel = true
      }
      check(`${id}: a cop reaches the robber at the vault`, sameLevel, `samples ${seen}, ring ${best} at ${last} | ${track.join(' ; ')}`.slice(0, 900))
      await cmd(`dheist end ${id}`)
      await sleep(1500)
      await cmd(`dheist open ${id}`)
    }
  } finally {
    if (bot) await quit(bot).catch(() => {})
    if (id) { await rcon.cmd(`dheist end ${id}`).catch(() => {}); await rcon.cmd(`dheist open ${id}`).catch(() => {}) }
    rcon.close()
  }
}
