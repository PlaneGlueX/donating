// The real blast doors: a bot plants each, waits out the fuse and checks the door opens with what's behind it. Ends the runs after.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')
const DOORS = [
  { h: 'bank', n: 22, stand: [597.5, 49, 299.5], aim: [595, 299], fuse: 10 },
  { h: 'reserve', n: 17, behind: 14, stand: [698.5, 53, 170.5], aim: [696, 170], fuse: 20 }
]
module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim().replace(/§./g, '')
  const st = async (h, n) => ((await cmd(`zzloot ${h}`)).split('|').map(s => s.trim().split(':')).find(p => p[0] === String(n)) || [])[2]
  const bot = await join('BlastReal')
  let bar = ''
  bot._client.on('action_bar', p => { bar = JSON.stringify(p).replace(/[^ -~]/g, '').slice(-160) })
  try {
    await cmd('gamemode survival BlastReal'); await cmd('zzclear BlastReal'); await cmd('zzpassive BlastReal off'); await cmd('dlevel set BlastReal 100')
    await cmd('minecraft:effect give BlastReal minecraft:regeneration infinite 4 true')
    await sleep(6000)
    for (const D of DOORS) {
      await cmd(`zzheisttp BlastReal ${D.stand.join(' ')}`)
      await sleep(4000)
      // The newest box of the door: a chunk that reloaded can leave the old one in the bot's list (north.js does the same).
      const near = () => Object.values(bot.entities).filter(e => e.name === 'interaction' && Math.abs(e.position.x - (D.aim[0] + 0.5)) < 1.2 && Math.abs(e.position.z - (D.aim[1] + 0.5)) < 3).sort((a, b) => b.id - a.id)[0]
      check(`${D.h}: the bot sees the door's hitbox`, Boolean(near()), String(bot.entity.position))
      for (const end = Date.now() + 3000; Date.now() < end;) { const e = near(); if (e) await bot.activateEntity(e); await sleep(200) }
      check(`${D.h}: holding 2 s plants it`, (await st(D.h, D.n)) === 'planted', `${await st(D.h, D.n)} at ${bot.entity.position} box ${near() && near().position} ${(await cmd(`zzheist ${D.h}`)).slice(0, 90)} bar ${bar}`)
      await sleep((D.fuse + 2) * 1000)
      check(`${D.h}: the fuse opens it`, (await st(D.h, D.n)) === 'open', await st(D.h, D.n))
      if (D.behind) check(`${D.h}: the bullion behind it unlocks`, (await st(D.h, D.behind)) === 'open', await st(D.h, D.behind))
      await cmd('zzclear BlastReal'); await cmd('zzhp BlastReal 20')
      await cmd(`zzheisttp BlastReal ${D.stand.join(' ')}`)
    }
  } finally {
    await quit(bot).catch(() => {})
    await sleep(1500)
    for (const D of DOORS) { await cmd(`dheist end ${D.h}`); await sleep(1000); for (let i = 0; i < 90 && !/state=open/.test(await cmd(`zzheist ${D.h}`)); i++) { await cmd(`dheist open ${D.h}`); await sleep(1000) } }
    rcon.close()
  }
}
