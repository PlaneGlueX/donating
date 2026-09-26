// hud.sk + placeholders.sk: the XP bar shows the held gun's ammo (level = every round left for it,
// bar = how full the magazine is), melee = full bar, a Stim stack = its count, anything else empty;
// the placeholders the tab list uses (balance, bounty, passive name color, AFK tag); the bag and ammo
// items carry the pack's model tags. The boss bar: the heist you're in and its clock (white while
// open, green / yellow / red as it runs down), red with the alarm (cops in, then waves), and while the
// cops chase you outside, how far you still have to go; gone once you lose them. The alarm's title.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'HudBot'
const Y = 200
const PLATFORM = `770 ${Y - 1} 770 774 ${Y - 1} 774`
const CHUNKS = '770 770 774 774'
// The boss bar's heist: an advanced (difficulty 4) room east of the platform.
const BB = 'hudbb'
const BB_CHUNKS = '776 764 792 784'
const BB_EXIT = '777.5 200 775.5'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    bot = await join(NAME)
    // Boss bars as the client sees them (uuid -> title, health, color).
    const bars = new Map()
    const COLORS = ['pink', 'blue', 'red', 'green', 'yellow', 'purple', 'white']
    bot._client.on('boss_bar', p => {
      if (p.action === 1) { bars.delete(p.entityUUID); return }
      const b = bars.get(p.entityUUID) || {}
      if (p.title !== undefined) b.title = require('prismarine-chat')(bot.registry).fromNotch(p.title).toString()
      if (p.health !== undefined) b.health = p.health
      if (p.color !== undefined) b.color = COLORS[p.color]
      bars.set(p.entityUUID, b)
    })
    const barNow = () => [...bars.values()]
    const barText = () => JSON.stringify(barNow())
    await cmd(`gamemode survival ${NAME}`)
    await cmd(`minecraft:tp ${NAME} 772.5 ${Y} 772.5 0 0`)
    await cmd(`zzclear ${NAME}`)
    await cmd(`zzpassive ${NAME} off`)
    await cmd(`zzbountyreset ${NAME}`)
    await sleep(1000)
    const xp = async () => {
      const level = Number(((await cmd(`data get entity ${NAME} XpLevel`)).match(/data: (-?\d+)/) || [])[1])
      const bar = Number(((await cmd(`data get entity ${NAME} XpP`)).match(/data: (-?[\d.E-]+)f?/) || [])[1])
      return { level, bar }
    }
    const hold = async slot => { bot.setQuickBarSlot(slot); await sleep(600) }
    const papi = async ph => ((await cmd(`zzpapi ${NAME} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const show = v => `level ${v.level}, bar ${v.bar}`

    // ---------- The ammo bar ----------
    await cmd(`wm give ${NAME} AK_47 1 {slot:0,ammo:30}`)
    await cmd(`wm give ${NAME} Combat_Knife 1 {slot:1}`)
    await cmd(`wm give ${NAME} Stim 2 {slot:2}`)
    await cmd(`zzammo ${NAME} rifle 40`)
    await hold(0)
    let v = await xp()
    check('holding the AK-47 (30 loaded, 40 spare): level 70, full bar', v.level === 70 && v.bar > 0.99, show(v))
    await cmd(`wm give ${NAME} AK_47 1 {slot:0,ammo:12}`) // a magazine with 12 of 30
    await sleep(600)
    v = await xp()
    check('a part-empty magazine: level = loaded + spare (52), bar = 12/30', v.level === 52 && Math.abs(v.bar - 0.4) < 0.01, show(v))
    await cmd(`zzammo ${NAME} rifle 8`)
    await sleep(600)
    v = await xp()
    check('buying spare rounds raises the level (60)', v.level === 60, show(v))
    await hold(1)
    v = await xp()
    check('a melee weapon: full bar, no number', v.level === 0 && v.bar > 0.99, show(v))
    await hold(2)
    v = await xp()
    check('a Stim stack: its count, full bar', v.level === 2 && v.bar > 0.99, show(v))
    await hold(8)
    v = await xp()
    check('the phone (not a weapon): empty bar, no number', v.level === 0 && v.bar < 0.01, show(v))

    // ---------- Pack model tags ----------
    const ammoTag = await cmd(`data get entity ${NAME} Inventory[{Slot:9b}].components."minecraft:custom_model_data"`)
    check('ammo carries the pack\'s ammo icon tag', /strings: \["donating:ammo_rifle"\]/.test(ammoTag), ammoTag)
    await cmd(`zzdata ${NAME} bag-tier 3`)
    await cmd(`zzclear ${NAME}`) // re-applies the layout: the bag goes into the offhand
    await cmd(`zzdata ${NAME} bag-tier 3`)
    await cmd(`zzbagapply ${NAME}`)
    await sleep(400)
    const bagTag = await cmd(`data get entity ${NAME} equipment.offhand.components."minecraft:custom_model_data"`)
    check('the bag carries its tier\'s duffel tag', /strings: \["donating:bag_3"\]/.test(bagTag), bagTag)

    // ---------- The boss bar ----------
    await cmd(`dheist delete ${BB} confirm`)
    await cmd(`rg remove -w world heist_${BB}`)
    await cmd(`forceload add ${BB_CHUNKS}`)
    await cmd(`fill 776 ${Y - 1} 764 792 ${Y - 1} 784 glass`)
    await cmd(`zzregion heist_${BB} 780 190 768 790 208 780`)
    for (const c of [`dheist create ${BB} 4`, `dheist set ${BB} rank 0`, `dheist set ${BB} name Hud Lab`, `dheist set ${BB} escape 600`, `dheist set ${BB} cooldown 5`, `dheist exit ${BB} ${BB_EXIT} -90`, `dheist snapshot ${BB}`, `dheist enable ${BB}`]) await cmd(c)
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(200) } return Boolean(await fn()) }
    const opened = await until(async () => /state=open/.test(await cmd(`zzheist ${BB}`)), 15000)
    check('no boss bar outside heists', opened && barNow().length === 0, barText())
    await cmd(`zzheisttp ${NAME} 785.5 ${Y} 774.5`)
    const one = (re, color) => async () => barNow().length === 1 && re.test(barNow()[0].title) && barNow()[0].color === color
    check('inside an open heist: its name and "the clock starts at the first robbery" (white, full)', await until(one(/^Hud Lab · the clock starts at the first robbery$/, 'white'), 4000) && barNow()[0].health > 0.99, barText())
    await cmd(`dheist start ${BB}`)
    check('the clock runs: "Escape 10:00" in green, a full bar', await until(one(/^Hud Lab · Escape (10:00|9:5\d)$/, 'green'), 3000) && barNow()[0].health > 0.98, barText())
    await cmd(`zzheistleft ${BB} 250`)
    check('under half the time: yellow, the bar at T / E', await until(one(/Escape 4:(10|09|08)$/, 'yellow'), 3000) && Math.abs(barNow()[0].health - 250 / 600) < 0.02, barText())
    await cmd(`zzheistleft ${BB} 50`)
    check('the last minute: red', await until(one(/Escape 0:(50|49|48)$/, 'red'), 3000), barText())
    await cmd(`zzheistleft ${BB} 500`)
    await cmd('zzcfgtime alarm::warning 3 seconds')
    let t = Date.now()
    await cmd(`dheist alarm ${BB}`)
    check('the alarm: red, "ALARM · Cops in 3s", counting down to the first wave', await until(one(/^ALARM · Cops in [123]s · Escape 8:[12]\d$/, 'red'), 2000), barText())
    check('...and an ALARM title', messagesSince(bot, t).some(m => m.kind === 'title:title' && /ALARM/.test(m.text)), messagesSince(bot, t).map(m => `${m.kind}:${m.text}`).join(' | '))
    check('then the waves: "WAVE 1 · next in 10s"', await until(one(/^WAVE 1 · next in (10|9|8)s · Escape/, 'red'), 5000), barText())
    await cmd(`zzheisttp ${NAME} ${BB_EXIT}`)
    check('hunted outside: "COPS · wave 1 · N blocks to lose them", N = R − d', await until(async () => barNow().length === 1 && /^COPS · wave \d · next in \d+s · (9[0-9]) blocks to lose them$/.test(barNow()[0].title), 4000), barText())
    t = Date.now()
    await cmd(`zzheisttp ${NAME} ${FAR}`)
    check('out of range: the cops lose you and the bar goes', await until(async () => barNow().length === 0, 4000) && await until(async () => messagesSince(bot, t).some(m => /lost the cops/.test(m.text)), 2000), barText())
    await cmd('zzcfgreload')
    await cmd(`dheist delete ${BB} confirm`)
    await cmd(`rg remove -w world heist_${BB}`)
    await cmd(`minecraft:tp ${NAME} 772.5 ${Y} 772.5 0 0`)
    await sleep(500)

    // ---------- Tab-list placeholders ----------
    await cmd(`eco set ${NAME} 12345`)
    await sleep(1300) // the balance is copied into memory once a second
    check('balance placeholder', (await papi('donating_balance')) === '$12,345', await papi('donating_balance'))
    await cmd(`zzbounty ${NAME} 2500 kill`)
    await sleep(1300) // the bounty's money texts are copied into memory once a second too
    const fancy = await papi('donating_bounty_fancy')
    check('bounty placeholders: the number, the column text, the footer money', (await papi('donating_bounty')) === '2500' && /\$2\.5K/.test(fancy) && (await papi('donating_bounty_money')) === '$2,500', `${await papi('donating_bounty')} / ${fancy} / ${await papi('donating_bounty_money')}`)
    await cmd(`zzbountyreset ${NAME}`)
    await sleep(1300)
    check('no bounty: an empty column (a reset code, never the raw placeholder)', /^\(amp\)r$/.test(await papi('donating_bounty_fancy')) && (await papi('donating_bounty')) === '0', await papi('donating_bounty_fancy'))
    const before = await papi('donating_name_color')
    await cmd(`zzpassive ${NAME} on`)
    const passive = await papi('donating_name_color')
    check('passive players\' names are green in the tab list', /\(amp\)a$/.test(passive) && /\(amp\)f$/.test(before) && (await papi('donating_passive')) === 'yes', `${JSON.stringify(before)} -> ${JSON.stringify(passive)}`)
    await cmd(`zzpassive ${NAME} off`)
    await cmd(`zzafk ${NAME}`)
    await sleep(11000) // afk.sk checks every few seconds
    check('AFK players get " AFK" after their name', /AFK/.test(await papi('donating_tab_suffix')) && (await papi('donating_afk')) === 'yes', await papi('donating_tab_suffix'))
  } finally {
    await rcon.cmd(`zzpassive ${NAME} off`).catch(() => {})
    await rcon.cmd(`zzbountyreset ${NAME}`).catch(() => {})
    await rcon.cmd(`zzdata ${NAME} passive-switched none`).catch(() => {})
    await rcon.cmd(`zzclear ${NAME}`).catch(() => {})
    if (bot) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`dheist delete ${BB} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${BB}`).catch(() => {})
    await rcon.cmd(`fill 776 ${Y - 1} 764 792 ${Y - 1} 784 air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${BB_CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
