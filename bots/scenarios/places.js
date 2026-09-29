// Places on the phone's map (DonatingPhone /dphone place + nav.sk, 2026-09-28): every POI also shows on the phone as a
// colored banner icon (a shop orange, a heist by its difficulty: difficulty 1 lime), sent by nav.sk within 10 s of a
// change and gone when the POI is removed or the heist closes; the held phone shows no names.
const fs = require('fs')
const path = require('path')
const nbt = require('prismarine-nbt')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const P = 'PlaceBot'
const Y = 150
const HID = 'zplace'
const SERVER = path.join(__dirname, '..', '..', 'server')
const BANNER_ORANGE = 11
const BANNER_LIME = 15
const isBanner = i => i.type >= 10 && i.type <= 25

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  let poiId = ''
  let platform = null
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(300) } return Boolean(await fn()) }
    const list = async () => cmd('dphone place list')

    // ---------- The city (the plugin's config and the map files) ----------
    await cmd('save-all flush')
    const config = fs.readFileSync(path.join(SERVER, 'plugins', 'DonatingPhone', 'config.yml'), 'utf8')
    const grid = JSON.parse((config.match(/^city-maps:\s*(\[.*\])\s*$/m) || [])[1] || '[]')
    check('a city is set (city-maps), so the phone has a map', grid.length > 0, config.match(/^city-maps:.*$/m))
    const first = nbt.simplify((await nbt.parse(fs.readFileSync(path.join(SERVER, 'world', 'data', `map_${grid[0][0]}.dat`)))).parsed).data
    const unit = 1 << (first.scale || 0)
    const cx = first.xCenter
    const cz = first.zCenter
    platform = `${cx + 8} ${Y - 1} ${cz + 8} ${cx + 30} ${Y - 1} ${cz + 23}`

    // ---------- A bot with its phone out ----------
    bot = await join(P)
    const packets = []
    let mapId = null
    bot._client.on('map', p => { if (p.itemDamage === mapId && p.icons) packets.push({ t: Date.now(), icons: p.icons.map(i => ({ type: i.type, x: i.x, z: i.z, name: i.displayName })) }) })
    await cmd(`gamemode survival ${P}`)
    await cmd(`zzclear ${P}`)
    await cmd(`zzpassive ${P} off`)
    await cmd(`lp user ${P} permission set donating.staff true`)
    await cmd(`fill ${platform} glass`)
    await sleep(2500)
    await cmd(`minecraft:tp ${P} ${cx + 12.5} ${Y} ${cz + 12.5} 0 0`)
    await sleep(1500)
    mapId = Number(((await cmd(`dphone status ${P}`)).match(/map=(\d+)/) || [])[1])
    bot.setQuickBarSlot(8)
    await sleep(1500)

    // ---------- A staff POI ----------
    let t = Date.now()
    bot.chat('/dpoi add shop Test Shop')
    await sleep(1000)
    poiId = (text(t).match(/POI (\d+) shop at/) || [])[1] || ''
    const sent = await until(async () => new RegExp(`p${poiId}=banner_orange@-?\\d+,-?\\d+ Test Shop`).test(await list()), 12000)
    check('a staff POI (a shop) reaches the phone\'s map within 10 s: an orange banner with its name', poiId !== '' && sent, `${poiId} ${await list()}`)
    packets.length = 0
    await sleep(1500)
    const last = packets.slice(-1)[0]
    const own = last && last.icons.find(i => i.type === 0)
    const banner = last && last.icons.find(i => i.type === BANNER_ORANGE)
    check('the held phone shows it where the shop is (on the player here, within a block), without its name', own && banner && Math.abs(banner.x - own.x) <= 5 && Math.abs(banner.z - own.z) <= 5 && !banner.name, JSON.stringify(last && last.icons))
    t = Date.now()
    bot.chat(`/dpoi remove ${poiId}`)
    await sleep(500)
    const gone = await until(async () => !new RegExp(`p${poiId}=`).test(await list()), 12000)
    packets.length = 0
    await sleep(1500)
    const after = packets.slice(-1)[0]
    check('removing the POI takes it off the phones', gone && after && !after.icons.some(i => i.type === BANNER_ORANGE), `${await list()} ${JSON.stringify(after && after.icons)}`)
    poiId = ''

    // ---------- A heist: shown while open, by its difficulty ----------
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    await cmd(`zzregion heist_${HID} ${cx + 20} ${Y - 1} ${cz + 16} ${cx + 26} ${Y + 4} ${cz + 22}`)
    for (const c of [`dheist create ${HID} 1`, `dheist set ${HID} level 0`, `dheist exit ${HID} ${cx + 18.5} ${Y} ${cz + 19.5}`, `dheist snapshot ${HID}`, `dheist enable ${HID}`]) await cmd(c)
    const open = await until(async () => /state=open/.test(await cmd(`zzheist ${HID}`)), 15000)
    const hs = await until(async () => new RegExp(`h${HID}=banner_lime@`).test(await list()), 12000)
    check('an open heist of difficulty 1 is a lime banner with the heist\'s name', open && hs, await list())
    await cmd(`dheist disable ${HID}`)
    const hgone = await until(async () => !new RegExp(`h${HID}=`).test(await list()), 12000)
    check('...and a disabled (or closed) heist leaves the map', hgone, await list())
  } finally {
    if (poiId) await rcon.cmd(`zzconsole dpoi remove ${poiId}`).catch(() => {})
    await rcon.cmd(`dheist delete ${HID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${HID}`).catch(() => {})
    await rcon.cmd(`minecraft:kill @e[tag=poi_h_${HID}]`).catch(() => {})
    await rcon.cmd(`lp user ${P} permission unset donating.staff`).catch(() => {})
    if (platform) await rcon.cmd(`fill ${platform} air`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
