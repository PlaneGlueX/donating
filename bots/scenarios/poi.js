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
    // The stand's UUID ("[I; a, b, c, d]" -> "xxxxxxxx-xxxx-..."), and the color set by /waypoint modify.
    const uuidOf = async tag => {
      const m = (await cmd(`data get entity @e[tag=${tag},limit=1] UUID`)).match(/\[I; (-?\d+), (-?\d+), (-?\d+), (-?\d+)\]/)
      if (!m) return ''
      const hex = m.slice(1).map(n => (Number(n) >>> 0).toString(16).padStart(8, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
    const colorOf = async tag => Number(((await cmd(`data get entity @e[tag=${tag},limit=1] locator_bar_icon.color`)).match(/data: (-?\d+)/) || [])[1] || -1)
    // A track packet for exactly this stand, in this color (/waypoint's colors as red, green, blue).
    // With a style: also that icon (core.sk poi::<kind>::style: the pack's waypoint styles).
    const tracked = (uuid, rgb, style) => waypoints.some(w => w.operation === 'track' && w.waypoint && w.waypoint.uuid === uuid &&
      w.waypoint.icon && w.waypoint.icon.color && w.waypoint.icon.color.red === rgb[0] && w.waypoint.icon.color.green === rgb[1] && w.waypoint.icon.color.blue === rgb[2] &&
      (!style || String(w.waypoint.icon.style) === style))
    const styleOf = async tag => ((await cmd(`data get entity @e[tag=${tag},limit=1] locator_bar_icon.style`)).match(/data: "([^"]+)"/) || [])[1] || ''

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
    const standId = await uuidOf(tag)
    // Shops are yellow (core.sk poi::shop::color): /waypoint's yellow is 255, 255, 85.
    const got = await until(() => tracked(standId, [255, 255, 85], 'donating:shop'), 4000)
    check('...and the player gets that stand on their locator bar, in the shop color with the shop icon (a track packet with its UUID and the style donating:shop)', standId !== '' && got, `${standId} ${JSON.stringify(waypoints.slice(-2)).slice(0, 300)}`)
    await cmd(`minecraft:kill @e[tag=${tag}]`)
    waypoints.length = 0
    const back = await until(async () => (await count(tag)) === 1, 22000)
    await sleep(1500)
    const newId = await uuidOf(tag)
    check('a missing stand comes back within 10 s (exactly one)', back, `${await count(tag)}`)
    check('...and the new stand is a waypoint again (range and color set on the new stand)', newId !== '' && newId !== standId && (await range(tag)) > 1e7 && tracked(newId, [255, 255, 85]), `${newId} range ${await range(tag)} ${JSON.stringify(waypoints.slice(-2)).slice(0, 300)}`)

    // ---------- Heists: only while open ----------
    await cmd(`zzregion ${REGION} 1055 199 1055 1065 205 1065`)
    await cmd(`dheist create ${ID} 3`)
    await cmd(`dheist set ${ID} level 0`)
    await cmd(`dheist exit ${ID} 1050.5 ${Y} 1060.5`)
    await cmd(`dheist holo ${ID} 1052.5 ${Y} 1058.5`)
    await cmd(`dheist snapshot ${ID}`)
    await until(async () => (await count(`poi_h_${ID}`)) === 1, 12000)
    await sleep(1000)
    // Difficulty 3's color is gold (0xFFAA00 = 16755200): proof the commands ran, not just an armor stand's default range.
    check('a disabled heist has a stand, in its difficulty\'s color with the safe icon, but sends no waypoint', (await count(`poi_h_${ID}`)) === 1 && (await range(`poi_h_${ID}`)) === 0 && (await colorOf(`poi_h_${ID}`)) === 16755200 && (await styleOf(`poi_h_${ID}`)) === 'donating:heist', `style ${await styleOf(`poi_h_${ID}`)} ${await count(`poi_h_${ID}`)} range ${await range(`poi_h_${ID}`)} color ${await colorOf(`poi_h_${ID}`)}`)
    await cmd(`dheist enable ${ID}`)
    const shown = await until(async () => (await range(`poi_h_${ID}`)) > 1e7, 20000)
    check('once it opens, its waypoint shows (in the difficulty\'s color)', shown, `${await range(`poi_h_${ID}`)} ${await cmd(`zzheist ${ID}`)}`)
    await cmd(`dheist disable ${ID}`)
    const hidden = await until(async () => (await range(`poi_h_${ID}`)) === 0, 14000)
    check('disabled again: hidden', hidden, `${await range(`poi_h_${ID}`)}`)

    // Moving the hologram moves the POI: the old stand goes, one new stand at the new spot.
    await cmd(`dheist holo ${ID} 1047.5 ${Y} 1062.5`)
    const moved = await until(async () => /1047\.5/.test(await cmd(`data get entity @e[tag=poi_h_${ID},limit=1] Pos[0]`)) && (await count(`poi_h_${ID}`)) === 1, 24000)
    check('moving a heist\'s hologram moves its POI: exactly one stand, at the new spot, still gold', moved && (await colorOf(`poi_h_${ID}`)) === 16755200, `${await count(`poi_h_${ID}`)} ${await cmd(`data get entity @e[tag=poi_h_${ID},limit=1] Pos`)} color ${await colorOf(`poi_h_${ID}`)}`)

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
