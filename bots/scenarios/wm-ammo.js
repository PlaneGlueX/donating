// WeaponMechanics item ammo for shop.sk: every gun we sell reloads only from ammo items that shop.sk
// builds (Skript items with the weaponmechanics:ammo-name tag, in the upper inventory), takes exactly
// a magazine's worth, ignores the wrong ammo type, and F doesn't stop a reload. Also: a new gun
// starts full unless given {ammo:0} (why the shop always passes it), Stims stack and leave nothing
// behind, the knife stays put on Q/F, and the config files have no forbidden keys. Every sold gun fires
// and reloads with the bag in the offhand (WeaponMechanics counts any offhand item as dual wielding,
// and its default guns deny shooting while dual wielding: nobody could shoot until 2026-09-25).
const fs = require('fs')
const path = require('path')
const { Vec3 } = require('vec3')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'AmmoBot'
const Y = 200
const PLATFORM = `660 ${Y - 1} 660 664 ${Y - 1} 664`
const CHUNKS = '660 660 664 664'
const WM = path.join(__dirname, '..', '..', 'server', 'plugins', 'WeaponMechanics')
// Sold guns: file, ammo type, magazine, a mistaken ammo type.
const GUNS = [
  { w: '50_GS', file: 'weapons/pistols/50_GS.yml', type: 'light', mag: 7, wrong: 'rifle' },
  { w: 'Uzi', file: 'weapons/sub_machine_guns/Uzi.yml', type: 'light', mag: 32, wrong: 'shells' },
  { w: 'R9_0', file: 'weapons/shotguns/R9_0.yml', type: 'shells', mag: 14, wrong: 'light' },
  { w: 'AK_47', file: 'weapons/assault_rifles/AK_47.yml', type: 'rifle', mag: 30, wrong: 'light' }
]

module.exports = async ({ check }) => {
  // ---------- The config files ----------
  const read = f => fs.readFileSync(path.join(WM, f), 'utf8')
  const forbidden = /Ammo_Switch_Trigger|Unload_Ammo_On_Reload: *true|Weapon_Converter_Check|Ammo_Converter_Check|Destroy_When_Empty|Magazine_Item/
  const files = [...GUNS.map(g => g.file), 'weapons/melee/Combat_Knife.yml', 'weapons/consumables/Stim.yml', 'ammos/Donating_Ammos.yml']
  const bad = files.filter(f => forbidden.test(read(f).split('\n').filter(l => !l.trim().startsWith('#')).join('\n')))
  check('no forbidden WeaponMechanics keys in what we sell', bad.length === 0, bad.join(', '))
  const gunsOk = GUNS.filter(g => new RegExp(`Ammos:\\s*\\n\\s*- "Donating_${g.type[0].toUpperCase() + g.type.slice(1)}"`).test(read(g.file)) && /Swap_Hands: true/.test(read(g.file)))
  check('every sold gun has item ammo and Swap_Hands', gunsOk.length === GUNS.length, `${gunsOk.map(g => g.w)}`)
  check('the knife and the Stim cancel Q and F too', ['weapons/melee/Combat_Knife.yml', 'weapons/consumables/Stim.yml'].every(f => /Drop_Item: true/.test(read(f)) && /Swap_Hands: true/.test(read(f))))
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
  const dual = walk(path.join(WM, 'weapons')).filter(p => /^\s*Dual_Wielding:/m.test(fs.readFileSync(p, 'utf8')))
  check('no weapon has a Dual_Wielding rule (the bag is always in the offhand)', dual.length === 0, dual.map(p => path.basename(p)).join(', '))
  check('Donating_Ammos.yml defines the three ammo types', ['Donating_Light:', 'Donating_Shells:', 'Donating_Rifle:'].every(t => read('ammos/Donating_Ammos.yml').includes(t)))

  const rcon = await rconLib.connect()
  let bot = null
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${PLATFORM} glass`)
    bot = await join(NAME)
    await rcon.cmd(`gamemode survival ${NAME}`)
    await rcon.cmd(`minecraft:tp ${NAME} 662.5 ${Y} 662.5`)
    const dig = status => bot._client.write('block_dig', { status, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
    const wm = async () => (await rcon.cmd(`zzwm ${NAME}`)).trim()
    const loaded = async slot => Number(((await wm()).match(new RegExp(`(?:^WM |\\| )${slot}=[^:]+:(\\d+)x`)) || [])[1])
    const ammo = async type => Number(((await wm()).match(new RegExp(`ammo ${type}=(\\d+)`)) || [])[1])
    const fresh = async () => {
      await rcon.cmd(`zzclear ${NAME}`)
      await rcon.cmd('minecraft:kill @e[type=item,x=662,y=200,z=662,distance=..20]')
    }
    const give = async (w, data) => {
      await rcon.cmd(`wm give ${NAME} ${w} 1 ${data}`)
      bot.setQuickBarSlot(0)
      await sleep(2000) // Weapon_Equip_Delay
    }

    // ---------- A new gun starts full ----------
    await fresh()
    await give('50_GS', '{slot:0}')
    check('control: a gun given without {ammo:0} starts full (so the shop always passes it)', (await loaded(0)) === 7, await wm())

    for (const g of GUNS) {
      // No ammo: Q reloads nothing.
      await fresh()
      await give(g.w, '{slot:0,ammo:0}')
      dig(4)
      await sleep(4500)
      check(`${g.w}: no free reloads (Q with no ammo stays at 0)`, (await loaded(0)) === 0, await wm())
      // The wrong type does nothing either.
      await rcon.cmd(`zzammo ${NAME} ${g.wrong} 40`)
      dig(4)
      await sleep(4500)
      check(`${g.w}: the wrong ammo type isn't used`, (await loaded(0)) === 0 && (await ammo(g.wrong)) === 40, await wm())
      // The right type: exactly one magazine, and F halfway doesn't stop it.
      await rcon.cmd(`zzammo ${NAME} ${g.type} ${g.mag + 10}`)
      dig(4)
      await sleep(500)
      dig(6) // F
      await sleep(4500)
      check(`${g.w}: Q loads a magazine from the shop's ammo items (F doesn't stop it)`, (await loaded(0)) === g.mag && (await ammo(g.type)) === 10, await wm())
    }

    // ---------- Two stacks ----------
    await fresh()
    await give('AK_47', '{slot:0,ammo:0}')
    // WeaponMechanics walks slots 0-35 and takes a magazine from the first stack big enough, so the
    // small stack goes first: 10 rounds in slot 9, 64 in slot 20.
    await rcon.cmd(`zzfill ${NAME} 9 19`)
    await rcon.cmd(`zzammo ${NAME} rifle 64`) // lands in slot 20
    await rcon.cmd(`minecraft:item replace entity ${NAME} container.9 with air`)
    await rcon.cmd(`zzammo ${NAME} rifle 10`) // slot 20 is full: lands in slot 9
    const stacks = (await rcon.cmd(`zzdump ${NAME}`)).trim()
    dig(4)
    await sleep(4500)
    const after = (await rcon.cmd(`zzdump ${NAME}`)).trim()
    check('a reload takes rounds from several stacks', /(^DUMP |\| )9=gold nugget x10 /.test(stacks) && /(^DUMP |\| )20=gold nugget x64 /.test(stacks) && (await loaded(0)) === 30 && !/(^DUMP |\| )9=gold nugget/.test(after) && /(^DUMP |\| )20=gold nugget x44 /.test(after), `before ${stacks}; after ${after}`)

    // ---------- Stims ----------
    await fresh()
    await rcon.cmd(`wm give ${NAME} Stim 3 {slot:1}`)
    await rcon.cmd(`damage ${NAME} 8 minecraft:generic`)
    await sleep(500)
    const hurt = bot.health
    bot.setQuickBarSlot(1)
    await sleep(1500)
    bot.activateItem()
    await sleep(2500)
    const stimLine = await wm()
    const ground = await rcon.cmd(`execute at ${NAME} if entity @e[type=item,distance=..20]`)
    check('a Stim heals, uses one of the stack and leaves nothing behind', /1=Stim:\d+x2/.test(stimLine) && bot.health > hurt && !/passed/i.test(ground), `${stimLine}; health ${hurt} -> ${bot.health}; ground ${ground.trim()}`)

    // ---------- Knife ----------
    await fresh()
    await rcon.cmd(`wm give ${NAME} Combat_Knife 1 {slot:0}`)
    bot.setQuickBarSlot(0)
    await sleep(1500)
    dig(4)
    await sleep(300)
    dig(6)
    await sleep(800)
    const knife = await wm()
    const ground2 = await rcon.cmd(`execute at ${NAME} if entity @e[type=item,distance=..20]`)
    check('Q and F leave the knife in place and drop nothing', /(^WM |\| )0=Combat_Knife:/.test(knife) && !/passed/i.test(ground2), `${knife}; ground ${ground2.trim()}`)

    // ---------- With the bag in the offhand ----------
    for (const g of GUNS) {
      await rcon.cmd(`zztestkit ${NAME}`) // bag tier 2 in the offhand
      await rcon.cmd(`minecraft:item replace entity ${NAME} hotbar.0 with air`)
      await give(g.w, '{slot:0}')
      const before = await loaded(0)
      for (let i = 0; i < 4; i++) { bot.activateItem(); await sleep(200); bot.deactivateItem(); await sleep(400) }
      await sleep(600)
      const after = await loaded(0)
      const off = (await rcon.cmd(`zzdump ${NAME}`)).trim()
      check(`${g.w} fires with the bag in the offhand`, /40=leather x1 \[bag:2\]/.test(off) && after < before, `${before} -> ${after}; ${off}`)
    }
    await rcon.cmd(`zztestkit ${NAME}`)
    await rcon.cmd(`minecraft:item replace entity ${NAME} hotbar.0 with air`)
    await give('AK_47', '{slot:0,ammo:0}')
    await rcon.cmd(`zzammo ${NAME} rifle 40`)
    dig(4)
    await sleep(4500)
    check('...and reloads with the bag in the offhand', (await loaded(0)) === 30 && (await ammo('rifle')) === 10, await wm())

    // ---------- Ammo never in the hotbar ----------
    await fresh()
    await rcon.cmd(`zzammo ${NAME} light 300`)
    const dump = (await rcon.cmd(`zzdump ${NAME}`)).trim()
    check('ammo only goes to the upper inventory', !/(^DUMP |\| )[0-7]=[a-z ]*nugget/.test(dump) && (await ammo('light')) === 300, dump)
  } finally {
    await rcon.cmd(`zzclear ${NAME}`).catch(() => {})
    await rcon.cmd(`minecraft:tp ${NAME} 0.5 68 -656.5`).catch(() => {})
    if (bot) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
