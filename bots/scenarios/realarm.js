// DonatingPhone's RealArm (2026-11-04; gunfx.real-arm): while a magazine gun reloads, its holder alone is told their main hand is
// empty, their main arm the other way round and the gun in their offhand, so the client draws their real arm beside the gun. Bots
// can't see the arm: this checks the packets the holder's client gets and that the server's inventory and the watcher see nothing.
const { Vec3 } = require('vec3')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'ArmBot'
const OTHER = 'ArmWatch'
const X = 7780; const Y = 160; const Z = 7780
const CHUNKS = `${X - 8} ${Z - 8} ${X + 8} ${Z + 8}`
const kind = item => {
  if (!item || !item.itemCount) return 'empty'
  return /donating:hand_nothing/.test(JSON.stringify(item)) ? 'nothing' : 'gun'
}

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  let bot = null
  let other = null
  const arms = [] // { t, v }: the main arm the holder's told
  const hands = { main: [], off: [] } // what the holder's told is in each hand
  const seen = [] // the watcher: the holder's main hand, and any arm flip
  const fold = a => a.map(v => v.k).filter((k, i, s) => i === 0 || s[i - 1] !== k)
  const dump = async () => (await rcon.cmd(`zzdump ${NAME}`)).trim()
  const dig = status => bot._client.write('block_dig', { status, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
  const armOf = md => { const e = (md || []).find(m => m.key === 15); return e ? String(e.value) : null }
  const clear = () => { arms.length = 0; hands.main.length = 0; hands.off.length = 0 }
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 4} ${Y - 1} ${Z + 4} glass`)
    bot = await join(NAME, { pack: 'loaded' }) // only players whose pack loaded: the frames with no glove are in it
    other = await join(OTHER)
    bot._client.on('entity_metadata', p => { if (p.entityId === bot.entity.id && armOf(p.metadata) !== null) arms.push({ t: Date.now(), v: armOf(p.metadata) }) })
    bot._client.on('entity_equipment', p => {
      if (p.entityId !== bot.entity.id) return
      for (const e of p.equipments) { if (e.slot === 0) hands.main.push({ t: Date.now(), k: kind(e.item) }); if (e.slot === 1) hands.off.push({ t: Date.now(), k: kind(e.item) }) }
    })
    other._client.on('entity_equipment', p => {
      const e = other.players[NAME] && other.players[NAME].entity
      if (!e || p.entityId !== e.id) return
      for (const q of p.equipments) if (q.slot === 0) seen.push(kind(q.item))
    })
    other._client.on('entity_metadata', p => { const e = other.players[NAME] && other.players[NAME].entity; if (e && p.entityId === e.id && armOf(p.metadata) !== null) seen.push('arm') })
    await sleep(1000)
    for (const n of [NAME, OTHER]) { await rcon.cmd(`zzclear ${n}`); await rcon.cmd(`gamemode survival ${n}`) }
    await rcon.cmd(`zzheisttp ${NAME} ${X + 0.5} ${Y} ${Z + 0.5}`)
    await rcon.cmd(`zzheisttp ${OTHER} ${X + 0.5} ${Y} ${Z + 3.5}`)
    await sleep(1500)
    await bot.look(0, Math.PI / 4, true)
    await rcon.cmd(`zzammo ${NAME} rifle 64`)
    await rcon.cmd(`zzdata ${NAME} bag-tier 1`)
    await rcon.cmd(`zzbagapply ${NAME}`)
    await rcon.cmd(`wm give ${NAME} AK_47 1 {slot:0,ammo:5}`)
    bot.setQuickBarSlot(0)
    await sleep(1800)
    const before = await dump()

    // A whole reload: the AK-48 with 5 rounds, 57 ticks.
    clear(); seen.length = 0
    dig(4)
    await sleep(600)
    check('the reload empties the main hand for its holder', hands.main.some(v => v.k === 'empty'), JSON.stringify(fold(hands.main)))
    check('the main arm flips to the left', arms.length === 1, JSON.stringify(arms))
    const flipped = arms.length && arms[arms.length - 1].v
    check('the gun goes to the offhand', hands.off.some(v => v.k === 'gun'), JSON.stringify(fold(hands.off)))
    const mid = await dump()
    check("the server's inventory never changes", /0=feather/.test(mid) && mid.includes('40=') && mid.split('40=')[1].split('|')[0] === before.split('40=')[1].split('|')[0], `${mid.slice(0, 200)}`)
    await sleep(2800)
    check('near the end an invisible copy takes the arm down', hands.main.some(v => v.k === 'nothing'), JSON.stringify(fold(hands.main)))
    await sleep(800)
    check('at the end the arm is back', arms.length >= 2 && arms[arms.length - 1].v !== flipped, JSON.stringify(arms))
    const ammoLine = await rcon.cmd(`data get entity ${NAME} Inventory[{Slot:0b}].components."minecraft:custom_data".PublicBukkitValues."weaponmechanics:ammo-left"`)
    check('and the reload filled the magazine', /data: 30\b/.test(ammoLine), ammoLine.slice(0, 120))
    check('the other player never saw any of it', !seen.includes('empty') && !seen.includes('nothing') && !seen.includes('arm'), JSON.stringify(seen.slice(0, 12)))

    // A slot change stops it at once.
    await rcon.cmd(`wm give ${NAME} AK_47 1 {slot:0,ammo:5}`)
    await rcon.cmd(`zzammo ${NAME} rifle 64`)
    await sleep(1800)
    clear()
    dig(4)
    await sleep(600)
    const flips = arms.length
    bot.setQuickBarSlot(3)
    await sleep(500)
    check('a slot change flips the arm straight back', flips === 1 && arms.length === 2 && arms[1].v !== arms[0].v, JSON.stringify(arms))
    const n = hands.main.length
    await sleep(600)
    check('and the empty hand stops being sent', hands.main.length === n, `${n} ${hands.main.length}`)
    const st = await rcon.cmd('dphone gunfx')
    check('/dphone gunfx: nothing playing', /real-arm=.* playing=0 /.test(st), st.slice(0, 260))

    // A shotgun's shells chain: the glove and the bag's slide, not the arm.
    await rcon.cmd(`zzammo ${NAME} shells 20`)
    await rcon.cmd(`wm give ${NAME} R9_0 1 {slot:1,ammo:2}`)
    bot.setQuickBarSlot(1)
    await sleep(1800)
    clear()
    dig(4)
    await sleep(800)
    check('the Shotgun keeps its own reload', arms.length === 0 && !hands.main.some(v => v.k === 'empty'), JSON.stringify(arms))

    // Off and on, for comparing it (and for the bag-hide scenario).
    const off = await rcon.cmd('dphone gunfx realarm off')
    bot.setQuickBarSlot(0)
    await sleep(1000)
    await rcon.cmd(`wm give ${NAME} AK_47 1 {slot:0,ammo:5}`)
    await rcon.cmd(`zzammo ${NAME} rifle 64`)
    await sleep(1800)
    clear()
    dig(4)
    await sleep(600)
    check('/dphone gunfx realarm off stops it', arms.length === 0, `${off} ${JSON.stringify(arms)}`)
    await rcon.cmd('dphone gunfx realarm on')
  } finally {
    await rcon.cmd('dphone gunfx realarm on').catch(() => {})
    await rcon.cmd(`zzbagclear ${NAME}`).catch(() => {})
    for (const n of [NAME, OTHER]) await rcon.cmd(`zzclear ${n}`).catch(() => {})
    await quit(bot)
    await quit(other)
    await rcon.cmd(`fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 4} ${Y + 2} ${Z + 4} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
