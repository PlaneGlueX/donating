// inventory.sk runs after WeaponMechanics: Q must still reload a gun, and the gun must stay in its slot.
const { Vec3 } = require('vec3')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'GunBot'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bot = await join(NAME)
  const ammoLeft = async () => {
    const out = await rcon.cmd(`data get entity ${NAME} Inventory[{Slot:0b}].components."minecraft:custom_data".PublicBukkitValues."weaponmechanics:ammo-left"`)
    const m = out.match(/data: (-?\d+)/)
    return m ? Number(m[1]) : out
  }
  const dig = status => bot._client.write('block_dig', { status, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
  try {
    await sleep(1000)
    // Leftover persistent mobs near spawn would kill the bot mid-test.
    await rcon.cmd('minecraft:kill @e[type=!player,tag=!donating_shop]') // not the shopkeepers
    await sleep(200)
    await rcon.cmd('minecraft:kill @e[type=item]') // loot from the mobs killed above
    await rcon.cmd(`gamemode survival ${NAME}`)
    await rcon.cmd(`zzclear ${NAME}`)
    // Start with 5 of 30 rounds so a reload is visible.
    const give = await rcon.cmd(`wm give ${NAME} AK_47 1 {slot:0,ammo:5}`)
    bot.setQuickBarSlot(0)
    await sleep(2500) // Weapon_Equip_Delay is 30 ticks
    const start = await ammoLeft()
    check('AK-47 given into hotbar 1 with 5 rounds', start === 5, `give: ${give.trim()} | ammo: ${start}`)

    bot.activateItem() // right click = shoot
    await sleep(300)
    bot.deactivateItem()
    await sleep(700)
    const afterShot = await ammoLeft()
    check('right click shoots (ammo goes down)', typeof afterShot === 'number' && afterShot < 5, `ammo: ${afterShot}`)

    // Guns reload only from ammo items (shop.sk builds them; bots\run.js wm-ammo covers the details).
    await rcon.cmd(`zzammo ${NAME} rifle 64`)
    const pressedAt = Date.now()
    dig(4) // Q = reload
    await sleep(4500) // Reload_Duration is 57 ticks
    const afterReload = await ammoLeft()
    const bars = bot.log.filter(m => m.t >= pressedAt - 100).map(m => `${m.kind}: ${m.text}`)
    check('Q reloads the gun (WeaponMechanics saw the key)', afterReload === 30, `ammo: ${afterReload} | messages: ${JSON.stringify(bars.slice(0, 12))}`)

    const dump = await rcon.cmd(`zzdump ${NAME}`)
    check('gun is still in hotbar 1', /(^|DUMP )0=feather x1/.test(dump), dump)
    const ground = await rcon.cmd(`execute at ${NAME} if entity @e[type=item,distance=..20]`)
    check('nothing dropped on the ground', !/passed/i.test(ground), ground)
  } finally {
    await rcon.cmd(`zzclear ${NAME}`).catch(() => {})
    await quit(bot)
    rcon.close()
  }
}
