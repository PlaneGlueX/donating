// inventory.sk: every way a player can move an item must leave the server-side inventory unchanged.
// Server truth comes from "data get entity" over RCON, not from the bot's own (optimistic) view.
const { Vec3 } = require('vec3')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'InvBot'

// Window slot numbers in the player inventory window (not Skript slot numbers).
const W = { hotbar1: 36, hotbar2: 37, hotbar8: 43, hotbar9: 44, upper1: 9, upper2: 10, upper3: 11, offhand: 45 }

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bot = await join(NAME)
  // Every non-empty slot (0-40) plus the cursor, from zz-testkit.sk's /zzdump.
  const snapshot = async () => (await rcon.cmd(`zzdump ${NAME}`)).trim()
  const PHONE = /(^|\| )8=paper x1 \[phone\]/
  const BAG = /(^|\| )40=leather x1 \[bag:2\]/
  const dig = status => bot._client.write('block_dig', { status, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })

  const groundItems = () => rcon.cmd(`execute at ${NAME} if entity @e[type=item,distance=..20]`)

  // Runs one action and checks the server-side inventory is exactly what it was before,
  // and that no item appeared on the ground (an unchanged inventory plus a dropped item is a dupe).
  // `setup` (optional) changes the test kit before the "before" snapshot.
  const expectUnchanged = async (label, action, setup) => {
    await rcon.cmd(`lp user ${NAME} permission unset donating.inventory.bypass`)
    await rcon.cmd(`zztestkit ${NAME}`)
    if (setup) await setup()
    await rcon.cmd('minecraft:kill @e[type=item]')
    await sleep(400)
    const before = await snapshot()
    try {
      await action()
    } catch (err) {
      // Mineflayer may time out waiting for a slot update the server never sends; the check below decides.
    }
    await sleep(600)
    const after = await snapshot()
    const ground = await groundItems()
    const same = before === after
    const clean = !/passed/i.test(ground)
    check(label, same && clean, (same ? '' : `before:\n${before}\nafter:\n${after}\n`) + (clean ? '' : `ground: ${ground}`))
  }

  try {
    await sleep(1000)
    await rcon.cmd(`gamemode survival ${NAME}`)
    await rcon.cmd(`zztestkit ${NAME}`)
    await sleep(500)
    const layout = await snapshot()
    check('dump sees the whole inventory', /0=iron sword x1 \[test:sword\]/.test(layout) && /10=gold nugget x32 \[test:ammo\]/.test(layout), layout)
    check('layout: phone in hotbar 9', PHONE.test(layout), layout)
    check('layout: bag in offhand', BAG.test(layout), layout)

    await expectUnchanged('pick up phone and put it in hotbar 8', async () => {
      await bot.clickWindow(W.hotbar9, 0, 0)
      await bot.clickWindow(W.hotbar8, 0, 0)
    })
    await expectUnchanged('shift-click sword', () => bot.clickWindow(W.hotbar1, 0, 1))
    await expectUnchanged('number key 5 on ammo', () => bot.clickWindow(W.upper1, 4, 2))
    await expectUnchanged('offhand key (F) on sword inside inventory', () => bot.clickWindow(W.hotbar1, 40, 2))
    await expectUnchanged('offhand key (F) on bag slot', () => bot.clickWindow(W.offhand, 40, 2))
    await expectUnchanged('Q on sword inside inventory', () => bot.clickWindow(W.hotbar1, 0, 4))
    await expectUnchanged('Ctrl+Q on ammo inside inventory', () => bot.clickWindow(W.upper1, 1, 4))
    await expectUnchanged('double-click collect ammo', () => bot.clickWindow(W.upper1, 0, 6))
    await expectUnchanged('pick up ammo and click outside', async () => {
      await bot.clickWindow(W.upper1, 0, 0)
      await bot.clickWindow(-999, 0, 0)
    })
    await expectUnchanged('drag ammo across slots', async () => {
      await bot.clickWindow(W.upper1, 0, 0)
      await bot.clickWindow(-999, 0, 5)
      await bot.clickWindow(W.upper2, 1, 5)
      await bot.clickWindow(W.upper3, 1, 5)
      await bot.clickWindow(-999, 2, 5)
    })
    await expectUnchanged('F key outside inventory (sword held)', async () => {
      bot.setQuickBarSlot(0)
      await sleep(200)
      dig(6)
    })
    await expectUnchanged('F key outside inventory (empty hand)', async () => {
      bot.setQuickBarSlot(3)
      await sleep(200)
      dig(6)
    })
    await expectUnchanged('Q outside inventory (sword held)', async () => {
      bot.setQuickBarSlot(0)
      await sleep(200)
      dig(4)
    })
    await expectUnchanged('Ctrl+Q outside inventory (phone held)', async () => {
      bot.setQuickBarSlot(8)
      await sleep(200)
      dig(3)
    })

    // World props next to the bot for the pick-block, armor stand and item frame tests.
    const p = bot.entity.position.floored()
    const stonePos = p.offset(2, 1, 0)
    await rcon.cmd(`setblock ${stonePos.x} ${stonePos.y} ${stonePos.z} stone`)
    await rcon.cmd(`setblock ${p.x} ${p.y} ${p.z + 2} stone`)
    await sleep(300)
    const pickStone = () => bot._client.write('pick_item_from_block', { position: stonePos, includeData: false })

    await expectUnchanged('middle-click pick block (stone from upper inventory)', async () => {
      bot.setQuickBarSlot(3)
      await sleep(200)
      pickStone()
    })

    const summonStand = async () => {
      await rcon.cmd('minecraft:kill @e[type=armor_stand,tag=zztest]')
      await rcon.cmd(`summon armor_stand ${p.x - 2} ${p.y} ${p.z} {Tags:["zztest"],ShowArms:1b}`)
      await sleep(500)
      return bot.nearestEntity(e => e.name === 'armor_stand')
    }
    await expectUnchanged('right-click armor stand holding the sword', async () => {
      const stand = await summonStand()
      bot.setQuickBarSlot(0)
      await sleep(200)
      await bot.activateEntityAt(stand, stand.position.offset(0, 1, 0))
    })

    const summonFrame = async () => {
      await rcon.cmd('minecraft:kill @e[type=item_frame,tag=zztest]')
      await rcon.cmd(`summon item_frame ${p.x} ${p.y} ${p.z + 1} {Tags:["zztest"],Facing:2b}`)
      await sleep(500)
      return bot.nearestEntity(e => e.name === 'item_frame')
    }
    await expectUnchanged('right-click item frame holding the sword', async () => {
      const frame = await summonFrame()
      bot.setQuickBarSlot(0)
      await sleep(200)
      await bot.activateEntity(frame)
    })

    // Blocks and mobs that take or give items on right-click.
    const potPos = p.offset(-1, 0, -2)
    const plantPos = p.offset(1, 0, -2)
    const placeProps = async () => {
      // Replace, don't keep: the world persists between runs and a pot from a bypass control
      // still holds a sword (a decorated pot holds one stack).
      await rcon.cmd(`setblock ${potPos.x} ${potPos.y} ${potPos.z} air`)
      await rcon.cmd(`setblock ${potPos.x} ${potPos.y} ${potPos.z} decorated_pot`)
      await rcon.cmd(`setblock ${plantPos.x} ${plantPos.y} ${plantPos.z} potted_dandelion`)
      await sleep(300)
    }
    const clickBlock = async pos => {
      const block = bot.blockAt(pos)
      await bot.activateBlock(block)
    }
    const summonAllay = async () => {
      await rcon.cmd('minecraft:kill @e[type=allay,tag=zztest]')
      await rcon.cmd(`summon allay ${p.x + 1} ${p.y} ${p.z + 1} {Tags:["zztest"],NoAI:1b}`)
      await sleep(800)
      // The newest allay: the bot may still list the one that was just killed.
      const allay = Object.values(bot.entities).filter(e => e.name === 'allay').sort((a, b) => b.id - a.id)[0]
      if (!allay) {
        const seen = [...new Set(Object.values(bot.entities).map(e => e.name))].join(',')
        check('allay visible to the bot', false, `entities: ${seen}`)
      }
      return allay
    }
    await placeProps()
    await expectUnchanged('right-click decorated pot holding the sword', async () => {
      bot.setQuickBarSlot(0)
      await sleep(200)
      await clickBlock(potPos)
    })
    await expectUnchanged('right-click potted plant with an empty hand', async () => {
      await placeProps()
      bot.setQuickBarSlot(3)
      await sleep(200)
      await clickBlock(plantPos)
    })
    await expectUnchanged('right-click allay holding the sword', async () => {
      const allay = await summonAllay()
      bot.setQuickBarSlot(0)
      await sleep(200)
      await bot.activateEntity(allay)
    })

    // A candle on a cake is not a block place event in Paper; WeaponMechanics' default grenades are candles.
    const cakePos = p.offset(2, 0, 2)
    const placeCake = async () => {
      await rcon.cmd(`setblock ${cakePos.x} ${cakePos.y} ${cakePos.z} air`)
      await rcon.cmd(`setblock ${cakePos.x} ${cakePos.y} ${cakePos.z} cake`)
      await sleep(300)
    }
    const holdCandle = () => rcon.cmd(`minecraft:item replace entity ${NAME} hotbar.1 with red_candle`)
    const candleOnCake = async () => {
      await placeCake()
      bot.setQuickBarSlot(1)
      await sleep(200)
      await clickBlock(cakePos)
    }
    await expectUnchanged('right-click cake holding a candle', candleOnCake, holdCandle)

    await expectUnchanged('arrow on the ground is not picked up', async () => {
      await rcon.cmd(`execute at ${NAME} run summon arrow ~ ~0.5 ~ {pickup:1b,Tags:["zztest"]}`)
      await sleep(1500)
    })
    await rcon.cmd('minecraft:kill @e[type=arrow,tag=zztest]')

    // Positive controls: with the bypass permission the same actions DO move items,
    // which proves the tests above really exercise those paths.
    const withBypass = async (label, action, setup) => {
      await rcon.cmd(`zztestkit ${NAME}`)
      if (setup) await setup()
      await rcon.cmd(`lp user ${NAME} permission set donating.inventory.bypass true`)
      await sleep(1200)
      const before = await snapshot()
      await action().catch(() => {})
      await sleep(800)
      const after = await snapshot()
      await rcon.cmd(`lp user ${NAME} permission unset donating.inventory.bypass`)
      check(`control (bypass): ${label}`, before !== after, after)
    }
    await withBypass('middle-click pick block moves the stone', async () => {
      bot.setQuickBarSlot(3)
      await sleep(200)
      pickStone()
    })
    await withBypass('right-click armor stand takes the sword', async () => {
      const stand = await summonStand()
      bot.setQuickBarSlot(0)
      await sleep(200)
      await bot.activateEntityAt(stand, stand.position.offset(0, 1, 0))
    })
    await withBypass('right-click item frame takes the sword', async () => {
      const frame = await summonFrame()
      bot.setQuickBarSlot(0)
      await sleep(200)
      await bot.activateEntity(frame)
    })
    await withBypass('right-click decorated pot takes the sword', async () => {
      await placeProps()
      bot.setQuickBarSlot(0)
      await sleep(200)
      await clickBlock(potPos)
    })
    await withBypass('right-click potted plant gives the plant', async () => {
      await placeProps()
      bot.setQuickBarSlot(3)
      await sleep(200)
      await clickBlock(plantPos)
    })
    await withBypass('right-click allay takes the sword', async () => {
      const allay = await summonAllay()
      bot.setQuickBarSlot(0)
      await sleep(200)
      await bot.activateEntity(allay)
    })
    await withBypass('right-click cake uses up the candle', candleOnCake, holdCandle)
    await rcon.cmd(`setblock ${cakePos.x} ${cakePos.y} ${cakePos.z} air`)
    await rcon.cmd('minecraft:kill @e[tag=zztest]')

    // Watchdog: if something moves the bag or phone anyway, it is swapped back.
    await rcon.cmd(`zztestkit ${NAME}`)
    await sleep(300)
    await rcon.cmd(`item replace entity ${NAME} hotbar.5 from entity ${NAME} weapon.offhand`)
    await rcon.cmd(`item replace entity ${NAME} weapon.offhand with air`)
    await sleep(800)
    const afterBagMove = await snapshot()
    check('watchdog puts a moved bag back in the offhand', BAG.test(afterBagMove) && !/(^|\| )5=/.test(afterBagMove), afterBagMove)
    await rcon.cmd(`item replace entity ${NAME} inventory.11 from entity ${NAME} hotbar.8`)
    await rcon.cmd(`item replace entity ${NAME} hotbar.8 with air`)
    await sleep(800)
    const afterPhoneMove = await snapshot()
    check('watchdog puts a moved phone back in hotbar 9', PHONE.test(afterPhoneMove) && !/(^|\| )20=paper/.test(afterPhoneMove), afterPhoneMove)

    // Items on the ground can't be picked up.
    await rcon.cmd(`zztestkit ${NAME}`)
    await sleep(300)
    const beforePickup = await snapshot()
    await rcon.cmd(`execute at ${NAME} run summon item ~ ~ ~ {Item:{id:"minecraft:diamond",count:1},PickupDelay:0s,Tags:["zztest"]}`)
    await sleep(1500)
    const afterPickup = await snapshot()
    const stillThere = await rcon.cmd('execute if entity @e[type=item,tag=zztest]')
    check('ground item is not picked up', beforePickup === afterPickup, afterPickup)
    check('ground item stays on the ground', /passed/i.test(stillThere), stillThere)
    await rcon.cmd('minecraft:kill @e[type=item,tag=zztest]')

    // Death drops nothing (keepInventory) and the layout is back after respawn.
    await rcon.cmd(`zztestkit ${NAME}`)
    await rcon.cmd('minecraft:kill @e[type=item]')
    await sleep(300)
    const pos = bot.entity.position.floored()
    const at = `execute positioned ${pos.x} ${pos.y} ${pos.z}`
    const beforeDeath = await rcon.cmd(`${at} if entity @e[type=item,distance=..10]`)
    await rcon.cmd(`minecraft:kill ${NAME}`)
    await sleep(2500)
    const drops = await rcon.cmd(`${at} if entity @e[type=item,distance=..10]`)
    const what = /passed/i.test(drops) ? await rcon.cmd(`${at} run data get entity @e[type=item,distance=..10,limit=1,sort=nearest]`) : ''
    check('death drops no items', !/passed/i.test(drops), `before death: ${beforeDeath} | after: ${drops} | ${what}`)
    const afterDeath = await snapshot()
    check('phone back in hotbar 9 after respawn', PHONE.test(afterDeath), afterDeath)
    check('bag back in offhand after respawn', BAG.test(afterDeath), afterDeath)

    // Ops are still locked (the default group sets donating.inventory.bypass to false; an
    // unregistered permission would otherwise default to true for ops).
    await rcon.cmd(`minecraft:op ${NAME}`)
    await sleep(500)
    await expectUnchanged('an opped player is still locked (shift-click sword)', () => bot.clickWindow(W.hotbar1, 0, 1))
    await rcon.cmd(`minecraft:deop ${NAME}`)

    // Staff bypass: the same move works with donating.inventory.bypass.
    await rcon.cmd(`zztestkit ${NAME}`)
    await rcon.cmd(`lp user ${NAME} permission set donating.inventory.bypass true`)
    await sleep(1500)
    const beforeBypass = await snapshot()
    await bot.clickWindow(W.hotbar1, 0, 1).catch(() => {})
    await sleep(600)
    const afterBypass = await snapshot()
    check('bypass permission allows moving items', beforeBypass !== afterBypass, afterBypass)
    await rcon.cmd(`lp user ${NAME} permission unset donating.inventory.bypass`)
  } finally {
    await rcon.cmd(`zzclear ${NAME}`).catch(() => {})
    await quit(bot)
    rcon.close()
  }
}
