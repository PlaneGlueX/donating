// nav.sk's points of interest on the locator bar: staff POIs (/dpoi) and every open heist are invisible
// marker armor stands that send a colored waypoint; a missing stand comes back; heists only while open.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const P = 'PoiBot'
const Y = 200
const ID = 'zpoi'
const REGION = 'heist_zpoi'
const CHUNKS = '1040 1040 1070 1070'
const PLATFORM = `1040 ${Y - 1} 1040 1070 ${Y - 1} 1070`
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot
  let poiId = ''
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const count = async tag => Number(((await cmd(`execute if entity @e[tag=${tag}]`)).match(/count: (\d+)/i) || [])[1] || 0)
    const range = async tag => Number(((await cmd(`attribute @e[tag=${tag},limit=1] minecraft:waypoint_transmit_range get`)).match(/is ([\d.E+-]+)/) || [])[1] || -1)

    await cmd(`dheist delete ${ID} confirm`)
    await cmd(`rg remove -w world ${REGION}`)
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    bot = await join(P)
    const waypoints = []
    bot._client.on('tracked_waypoint', p => waypoints.push(p))
    await cmd(`gamemode survival ${P}`)
    await cmd(`zzclear ${P}`)
    await cmd(`lp user ${P} permission set donating.staff true`)
    // A first join gets EssentialsX's newbie teleport to spawn a moment later: wait it out, then move.
    await sleep(2500)
    await cmd(`zzheisttp ${P} 1045.5 ${Y} 1045.5`)
    await sleep(2500)

    // ---------- A staff POI ----------
    let t = Date.now()
    bot.chat('/dpoi add shop Gun Shop')
    await sleep(1500)
    poiId = (text(t).match(/POI (\d+) shop at/) || [])[1] || ''
    const tag = `poi_${poiId}`
    check('/dpoi add: a POI where the staff member stands', poiId !== '' && (await count(tag)) === 1, text(t))
    check('...an invisible marker stand sending a waypoint to everyone', (await range(tag)) > 1e7, `${await range(tag)}`)
    const got = await until(() => waypoints.some(w => JSON.stringify(w).includes('track')), 4000)
    check('...and the player gets it on their locator bar (a tracked waypoint)', got, JSON.stringify(waypoints.slice(-2)).slice(0, 300))
    await cmd(`minecraft:kill @e[tag=${tag}]`)
    const back = await until(async () => (await count(tag)) === 1, 22000)
    check('a missing stand comes back within 10 s (exactly one)', back, `${await count(tag)}`)

    // ---------- Heists: only while open ----------
    await cmd(`zzregion ${REGION} 1055 199 1055 1065 205 1065`)
    await cmd(`dheist create ${ID} 3`)
    await cmd(`dheist set ${ID} level 0`)
    await cmd(`dheist exit ${ID} 1050.5 ${Y} 1060.5`)
    await cmd(`dheist holo ${ID} 1052.5 ${Y} 1058.5`)
    await cmd(`dheist snapshot ${ID}`)
    await until(async () => (await count(`poi_h_${ID}`)) === 1, 12000)
    check('a disabled heist has a stand but sends no waypoint', (await count(`poi_h_${ID}`)) === 1 && (await range(`poi_h_${ID}`)) === 0, `${await count(`poi_h_${ID}`)} ${await range(`poi_h_${ID}`)}`)
    await cmd(`dheist enable ${ID}`)
    const shown = await until(async () => (await range(`poi_h_${ID}`)) > 1e7, 20000)
    check('once it opens, its waypoint shows (in the difficulty\'s color)', shown, `${await range(`poi_h_${ID}`)} ${await cmd(`zzheist ${ID}`)}`)
    await cmd(`dheist disable ${ID}`)
    const hidden = await until(async () => (await range(`poi_h_${ID}`)) === 0, 14000)
    check('disabled again: hidden', hidden, `${await range(`poi_h_${ID}`)}`)

    // ---------- Remove, staff only ----------
    t = Date.now()
    bot.chat(`/dpoi remove ${poiId}`)
    await sleep(1000)
    check('/dpoi remove: gone, and it stays gone', /removed/.test(text(t)) && (await count(tag)) === 0, text(t))
    await sleep(10500)
    check('...after the next reconcile too', (await count(tag)) === 0, `${await count(tag)}`)
    await cmd(`lp user ${P} permission unset donating.staff`)
    await sleep(1500)
    t = Date.now()
    bot.chat('/dpoi list')
    await sleep(800)
    check('/dpoi is staff only', /Staff only/.test(text(t)), text(t))
  } finally {
    if (poiId) await rcon.cmd(`zzconsole dpoi remove ${poiId}`).catch(() => {})
    await rcon.cmd(`dheist delete ${ID} confirm`).catch(() => {})
    await rcon.cmd(`minecraft:kill @e[tag=poi_h_${ID}]`).catch(() => {})
    await rcon.cmd(`rg remove -w world ${REGION}`).catch(() => {})
    await rcon.cmd(`lp user ${P} permission unset donating.staff`).catch(() => {})
    await rcon.cmd(`zzheisttp ${P} ${FAR}`).catch(() => {})
    if (bot) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
