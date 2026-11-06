// nav.sk's points of interest on the locator bar: staff POIs (/dpoi) and every open heist are waypoints DonatingPhone
// sends straight to each client (Waypoints.java), with no stand and no forced chunk; heists only while open; none for
// robbers in a heist (the receive-range attribute).
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const P = 'PoiBot'
const Q = 'PoiBot2'
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
  let bot2
  let poiId = ''
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const count = async tag => Number(((await cmd(`execute if entity @e[tag=${tag}]`)).match(/count: (\d+)/i) || [])[1] || 0)
    // id=uuid@x,y,z#rrggbb/style, from the plugin's own list.
    const way = async name => {
      const m = (await cmd('dphone way list')).match(new RegExp(`(?:^|[ :|] ?)${name}=([0-9a-f-]+)@(-?\\d+),(-?\\d+),(-?\\d+)#([0-9a-f]+)/(\\S+)`))
      return m ? { uuid: m[1], x: Number(m[2]), y: Number(m[3]), z: Number(m[4]), rgb: m[5], style: m[6] } : null
    }
    const packets = []
    const seen = (op, uuid, list = packets) => list.some(w => w.operation === op && w.waypoint && w.waypoint.uuid === uuid)
    const trackedAs = (uuid, rgb, style) => packets.some(w => w.operation === 'track' && w.waypoint && w.waypoint.uuid === uuid &&
      w.waypoint.icon && w.waypoint.icon.color && w.waypoint.icon.color.red === rgb[0] && w.waypoint.icon.color.green === rgb[1] && w.waypoint.icon.color.blue === rgb[2] &&
      (!style || String(w.waypoint.icon.style) === style))

    await cmd(`dheist delete ${ID} confirm`)
    await cmd(`rg remove -w world ${REGION}`)
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    bot = await join(P)
    bot._client.on('tracked_waypoint', p => packets.push(p))
    await cmd(`gamemode survival ${P}`)
    await cmd(`zzclear ${P}`)
    await cmd(`lp user ${P} permission set donating.staff true`)
    // A first join gets EssentialsX's newbie teleport to spawn a moment later: wait it out, then move.
    await sleep(2500)
    await cmd(`zzheisttp ${P} 1045.5 ${Y} 1045.5`)
    await sleep(2500)
    const joined = packets.filter(w => w.operation === 'track').length
    const listed = Number(((await cmd('dphone way list')).match(/WAYS (\d+)/) || [])[1] || 0)
    check('a player who joins gets every waypoint in the plugin\'s list', listed > 0 && joined >= listed, `${joined} track packets, ${listed} listed`)

    // ---------- A staff POI ----------
    let t = Date.now()
    bot.chat('/dpoi add shop Gun Shop')
    await sleep(1500)
    poiId = (text(t).match(/POI (\d+) shop at/) || [])[1] || ''
    check('/dpoi add: a POI where the staff member stands', poiId !== '', text(t))
    const w1 = await way(poiId)
    check('...a waypoint in the plugin\'s list at that spot', w1 && w1.x === 1045 && w1.y === Y && w1.z === 1045, JSON.stringify(w1))
    check('...with no stand', (await count(`poi_${poiId}`)) === 0 && (await count('donating_poi')) === 0, `${await count('donating_poi')}`)
    // Shops are yellow (core.sk poi::shop::color): /waypoint's yellow is 255, 255, 85.
    const got = w1 && await until(() => trackedAs(w1.uuid, [255, 255, 85], 'donating:shop'), 4000)
    check('...and the player gets it on their locator bar, in the shop color with the shop icon', got, JSON.stringify(packets.slice(-1)[0] || {}).slice(0, 300))
    const p1 = w1 && packets.filter(w => w.operation === 'track' && w.waypoint.uuid === w1.uuid).pop()
    check('...as a position, not a direction (the client works out the rest)', p1 && JSON.stringify(p1.waypoint).includes('1045') && /vec3i/i.test(JSON.stringify(p1.waypoint)), JSON.stringify(p1 || {}).slice(0, 300))
    check('...and its chunk isn\'t force-loaded for it', /not marked|isn't marked|is not/i.test(await cmd('forceload query 900 900')), await cmd('forceload query 900 900'))

    // ---------- Robbers in a heist receive none, and get them back ----------
    packets.length = 0
    await cmd(`attribute ${P} minecraft:waypoint_receive_range base set 0`)
    check('receive range 0 (in a heist): it\'s taken off their bar', await until(() => w1 && seen('untrack', w1.uuid), 3000), JSON.stringify(packets.slice(-1)).slice(0, 200))
    packets.length = 0
    await sleep(2200)
    check('...and nothing comes back while it stays 0', packets.filter(w => w.operation === 'track').length === 0, `${packets.length}`)
    await cmd(`attribute ${P} minecraft:waypoint_receive_range base reset`)
    check('out again: back on their bar', await until(() => w1 && seen('track', w1.uuid), 3000), JSON.stringify(packets.slice(-1)).slice(0, 200))

    // ---------- A second player sees it too, and a change reaches both ----------
    bot2 = await join(Q)
    const packets2 = []
    bot2._client.on('tracked_waypoint', p => packets2.push(p))
    await sleep(3500)
    check('a second player gets the POI as well', w1 && seen('track', w1.uuid, packets2), `${packets2.length}`)

    // ---------- Heists: only while open ----------
    await cmd(`zzregion ${REGION} 1055 199 1055 1065 205 1065`)
    await cmd(`dheist create ${ID} 3`)
    await cmd(`dheist set ${ID} level 0`)
    await cmd(`dheist exit ${ID} 1050.5 ${Y} 1060.5`)
    await cmd(`dheist holo ${ID} 1052.5 ${Y} 1058.5`)
    await cmd(`dheist snapshot ${ID}`)
    await sleep(11000)
    check('a disabled heist has no waypoint', (await way(`h_${ID}`)) === null, JSON.stringify(await way(`h_${ID}`)))
    packets.length = 0
    await cmd(`dheist enable ${ID}`)
    const shown = await until(async () => (await way(`h_${ID}`)) !== null, 20000)
    const wh = await way(`h_${ID}`)
    // Difficulty 3's color is gold (0xFFAA00): the safe icon (core.sk poi::heist::style).
    check('once it opens, its waypoint shows in the difficulty\'s color with the safe icon', shown && wh.rgb === 'ffaa00' && await until(() => trackedAs(wh.uuid, [255, 170, 0], wh.style), 3000) && wh.style !== 'default', JSON.stringify(wh))
    packets.length = 0
    await cmd(`dheist disable ${ID}`)
    const hidden = await until(async () => (await way(`h_${ID}`)) === null, 14000)
    check('disabled again: hidden, on every client', hidden && wh && seen('untrack', wh.uuid) && seen('untrack', wh.uuid, packets2), `${JSON.stringify(await way(`h_${ID}`))}`)

    // Moving the hologram moves the POI.
    await cmd(`dheist enable ${ID}`)
    await until(async () => (await way(`h_${ID}`)) !== null, 20000)
    packets.length = 0
    await cmd(`dheist holo ${ID} 1047.5 ${Y} 1062.5`)
    const moved = await until(async () => { const w = await way(`h_${ID}`); return w && w.x === 1047 && w.z === 1062 }, 24000)
    check('moving a heist\'s hologram moves its waypoint: one entry, sent again at the new spot, still gold', moved && seen('track', wh.uuid) && JSON.stringify(packets).includes('1047'), `${JSON.stringify(await way(`h_${ID}`))}`)
    packets.length = 0
    await cmd(`dheist delete ${ID} confirm`)
    check('a deleted heist\'s waypoint goes', await until(async () => (await way(`h_${ID}`)) === null, 14000) && seen('untrack', wh.uuid), `${JSON.stringify(await way(`h_${ID}`))}`)

    // ---------- Remove, staff only ----------
    packets.length = 0
    t = Date.now()
    bot.chat(`/dpoi remove ${poiId}`)
    await sleep(1000)
    check('/dpoi remove: gone', /removed/.test(text(t)) && (await way(poiId)) === null && w1 && seen('untrack', w1.uuid), text(t))
    await sleep(10500)
    check('...and it stays gone after the next reconcile', (await way(poiId)) === null, JSON.stringify(await way(poiId)))
    poiId = ''
    await cmd(`lp user ${P} permission unset donating.staff`)
    await sleep(1500)
    t = Date.now()
    bot.chat('/dpoi list')
    await sleep(800)
    check('/dpoi is staff only', /Staff only/.test(text(t)), text(t))
  } finally {
    if (poiId) await rcon.cmd(`zzconsole dpoi remove ${poiId}`).catch(() => {})
    await rcon.cmd(`dheist delete ${ID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world ${REGION}`).catch(() => {})
    await rcon.cmd(`lp user ${P} permission unset donating.staff`).catch(() => {})
    await rcon.cmd(`zzheisttp ${P} ${FAR}`).catch(() => {})
    await rcon.cmd(`attribute ${P} minecraft:waypoint_receive_range base reset`).catch(() => {})
    if (bot) await quit(bot)
    if (bot2) await quit(bot2)
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
