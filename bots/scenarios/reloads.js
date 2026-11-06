// Chunks unload now that no POI pins them (2026-11-05). Every heist runs and resets with nobody near; then a bot visits
// each one: it must have opened again, with nothing left doubled once the sweeps have run.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'ReloadBot'
const Y = 130
const FAR = '0.5 130 -656.5'
const COUNT = 64 // blocks around a spot that are counted (all of it is within the bot's loaded chunks)

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).replace(/§./g, '').trim()
  const bot = await join(NAME)
  try {
    await sleep(2500) // a first join's newbie teleport
    await cmd(`gamemode spectator ${NAME}`)
    const heists = (await cmd('dheist list')).split('\n').map(l => l.match(/^HEIST (\S+) state=(\S+)/)).filter(m => m && m[2] !== 'disabled').map(m => m[1])
    const ways = [...(await cmd('dphone way list')).matchAll(/([\w-]+)=[0-9a-f-]+@(-?\d+),(-?\d+),(-?\d+)#/g)].map(m => ({ id: m[1], x: Number(m[2]), z: Number(m[4]) }))
    const spots = ways.filter(w => w.id.startsWith('h_'))
    check('there are places to visit', spots.length > 5 && heists.length > 5, `${spots.length} spots, ${heists.length} heists`)

    const away = async () => {
      await cmd(`zzheisttp ${NAME} ${FAR}`)
      await sleep(16000) // Paper holds a chunk 10 s after the last player leaves
    }

    await away()

    // ---------- Every heist runs and resets with nobody near ----------
    for (const h of heists) {
      await cmd(`dheist start ${h}`)
      await cmd(`dheist end ${h}`)
      await cmd(`dheist open ${h}`)
    }
    const stateOf = async h => ((await cmd(`zzheist ${h}`)).match(/state=(\w+)/) || [])[1]
    const end = Date.now() + 120000
    let stuck = heists
    while (stuck.length && Date.now() < end) {
      await sleep(3000)
      const open = []
      for (const h of stuck) if ((await stateOf(h)) === 'open') open.push(h)
      stuck = stuck.filter(h => !open.includes(h))
    }
    check('every heist resets and opens again with nobody near', stuck.length === 0, stuck.join(','))

    // A chunk reload can leave a second copy for a moment; the sweeps (every 10 s, two passes) must have cleared it.
    // Loot displays are left out: a pile's model stacks several at one origin.
    const stacked = []
    for (const s of spots) {
      await cmd(`zzheisttp ${NAME} ${s.x} ${Y} ${s.z}`)
      await sleep(22000)
      const d = ((await cmd(`zzents ${s.x} ${s.z} ${COUNT}`)).split(' DUPES ')[1] || '').split(';').filter(p => p && !p.startsWith('display[donating_loot'))
      for (const p of d) stacked.push(`${s.id} ${p}`)
      await cmd(`zzheisttp ${NAME} ${FAR}`)
      await sleep(6000)
    }
    check('22 s after a player arrives, no click box, trap or ATM stands doubled', stacked.length === 0, stacked.join(' | '))
  } finally {
    await rcon.cmd(`gamemode survival ${NAME}`).catch(() => {})
    await rcon.cmd(`zzheisttp ${NAME} ${FAR.replace('130', '68')}`).catch(() => {})
    await quit(bot)
    rcon.close()
  }
}
