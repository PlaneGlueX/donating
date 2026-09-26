// hud.sk + placeholders.sk: the XP bar shows the held gun's ammo (level = every round left for it,
// bar = how full the magazine is), melee = full bar, a Stim stack = its count, anything else empty;
// the placeholders the tab list uses (balance, bounty, passive name color, AFK tag); the bag and ammo
// items carry the pack's model tags.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'HudBot'
const Y = 200
const PLATFORM = `770 ${Y - 1} 770 774 ${Y - 1} 774`
const CHUNKS = '770 770 774 774'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    bot = await join(NAME)
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

    // ---------- Tab-list placeholders ----------
    await cmd(`eco set ${NAME} 12345`)
    await sleep(1300) // the balance is copied into memory once a second
    check('balance placeholder', (await papi('donating_balance')) === '$12,345', await papi('donating_balance'))
    await cmd(`zzbounty ${NAME} 2500 kill`)
    const fancy = await papi('donating_bounty_fancy')
    check('bounty placeholders: the number, the column text, the footer money', (await papi('donating_bounty')) === '2500' && /\$2\.5K/.test(fancy) && (await papi('donating_bounty_money')) === '$2,500', `${await papi('donating_bounty')} / ${fancy} / ${await papi('donating_bounty_money')}`)
    await cmd(`zzbountyreset ${NAME}`)
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
    rcon.close()
  }
}
