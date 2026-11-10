// switch.sk: security switches, on a glass platform at x 960..980, y 200 ("Switch Vault", advanced). Two bots pull real switches by clicking their hitboxes;
// the trap probe says whether a laser would hit. Laser 1 is tagged bay (box), laser 2 tagged door (linked levers), laser 3 has no tag.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const H = 'zswitch'
const Y = 200
const A = 'SwitchA'
const B = 'SwitchB'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim().replace(/§./g, '')
  const bots = {}
  const hit = async (z, n) => new RegExp(`PROBE ${n}\\b`).test(await cmd(`zztrapprobe ${H} 971.5 ${Y} ${z} stand`))
  const live = async z => hit(z, z < 965 ? 1 : z < 970 ? 2 : 3)
  const displays = async () => Number(((await cmd('execute if entity @e[type=minecraft:block_display,tag=donating_trap,x=960,y=195,z=960,dx=20,dy=15,dz=20]')).match(/Count: (\d+)/i) || [0, 0])[1])
  const hitbox = async () => Number(((await cmd('execute if entity @e[type=minecraft:interaction,tag=donating_switch,x=960,y=195,z=960,dx=20,dy=15,dz=20]')).match(/Count: (\d+)/i) || [0, 0])[1])
  const state = async () => ((await cmd(`zzheist ${H}`)).match(/state=(\S+)/) || [])[1]
  const stand = async (name, x, z) => { await cmd(`zzheisttp ${name} ${x} ${Y} ${z}`); await sleep(1000) }
  // Right-click the hitbox over a block: the look aims at it, the raw packet is what a client sends.
  const click = async (name, x, z) => {
    const bot = bots[name]
    await bot.lookAt(bot.entity.position.constructor ? new (bot.entity.position.constructor)(x + 0.5, Y + 0.5, z + 0.5) : { x: x + 0.5, y: Y + 0.5, z: z + 0.5 }, true)
    const e = bot.nearestEntity(en => en.name === 'interaction' && Math.abs(en.position.x - (x + 0.5)) < 0.6 && Math.abs(en.position.z - (z + 0.5)) < 0.6)
    if (!e) return false
    await bot.activateEntity(e)
    return true
  }
  const holdClick = async (name, x, z, ms) => { for (const end = Date.now() + ms; Date.now() < end;) { await click(name, x, z); await sleep(200) } }
  try {
    await cmd(`dheist delete ${H} confirm`)
    await cmd(`rg remove -w world heist_${H}`)
    await cmd('forceload add 950 950 985 985')
    await cmd(`fill 955 ${Y - 1} 955 985 ${Y - 1} 985 glass`)
    await cmd(`fill 955 ${Y} 955 985 ${Y + 4} 985 air`)
    await cmd(`zzregion heist_${H} 960 ${Y - 1} 960 980 ${Y + 6} 980`)
    for (const c of [`dheist create ${H} 3`, `dheist set ${H} level 0`, `dheist set ${H} name Switch Vault`, `dheist set ${H} advanced true`, `dheist set ${H} escape 600`, `dheist set ${H} cooldown 5`, `dheist exit ${H} 957.5 ${Y} 970.5`]) await cmd(c)
    await cmd(`dtrap add ${H} laser 971.5 ${Y}.9 961 971.5 ${Y}.9 964 damage=1 tag=bay`)
    await cmd(`dtrap add ${H} laser 971.5 ${Y}.9 966 971.5 ${Y}.9 969 damage=1 tag=door`)
    await cmd(`dtrap add ${H} laser 971.5 ${Y}.9 971 971.5 ${Y}.9 974 damage=1 tag=quiet`)
    check('a bad tag is refused', /bad value/.test(await cmd(`dtrap set ${H}-3 tag a-b`)))
    check('a switch outside the heist is refused', /outside/.test(await cmd(`dswitch add ${H} 950 ${Y} 950 kind=box tags=bay`)))
    check('a lever needs a lever', /needs block/.test(await cmd(`dswitch add ${H} 963 ${Y} 963 kind=lever tags=bay`)))
    check('an unknown setting is refused', /unknown setting/.test(await cmd(`dswitch add ${H} 963 ${Y} 963 kind=box tags=bay wat=1`)))
    await cmd(`setblock 963 ${Y} 963 iron_block`)
    const lever = `block=minecraft:lever[face=floor,facing=north,powered=false]`
    await cmd(`dswitch add ${H} 963 ${Y} 963 kind=box tags=bay hold=1 for=7 rearm=2 name=Breaker`) // 1: box, also the block it keeps
    await cmd(`dswitch add ${H} 963 ${Y} 967 kind=lever tags=door ${lever} link=sec need=2 within=3 for=run miss=alarm name=Reader_A`) // 2
    await cmd(`dswitch add ${H} 967 ${Y} 967 kind=lever tags=door ${lever} link=sec need=2 within=3 for=run miss=alarm name=Reader_B`) // 3
    await cmd(`dswitch add ${H} 967 ${Y} 972 kind=box tags=quiet hold=1 quiet=true name=Quiet`) // 4
    check('list shows all four', /4 switches/.test(await cmd(`dswitch list ${H}`)), await cmd(`dswitch list ${H}`))
    await cmd(`dheist snapshot ${H}`)
    await cmd(`dheist enable ${H}`)
    await sleep(1500)
    for (let i = 0; i < 20 && (await state()) !== 'open'; i++) { await cmd(`dheist open ${H}`); await sleep(1000) }
    await sleep(2500)
    check('open: every switch has its hitbox', (await hitbox()) === 4, String(await hitbox()))
    check('the lasers start live, with displays', (await live(962.5)) && (await live(967.5)) && (await live(972.5)) && (await displays()) === 3, String(await displays()))

    for (const n of [A, B]) {
      bots[n] = await join(n)
      await cmd(`gamemode survival ${n}`)
      await cmd(`zzclear ${n}`)
      await cmd(`zzpassive ${n} off`)
      await cmd(`dlevel set ${n} 5`)
      await cmd(`minecraft:effect give ${n} minecraft:resistance infinite 4 true`)
    }
    await stand(A, 961.5, 963.5)
    await sleep(1500)
    check('the bot sees the box', await click(A, 963, 963))
    await holdClick(A, 963, 963, 2200)
    check('holding the box shuts off its tag', !(await live(962.5)) && (await displays()) === 2, await cmd(`zztrapprobe ${H} 971.5 ${Y} 962.5 stand`))
    check('...and only its tag', (await live(967.5)) && (await live(972.5)))
    check('...and starts the clock', (await state()) === 'active', await state())
    await sleep(3200)
    check('5 s before the power returns the laser flickers but does not hurt', !(await live(962.5)) && (await displays()) === 3, String(await displays()))
    await sleep(5500)
    check('the power comes back', (await live(962.5)) && (await displays()) === 3)

    // rearm=2: usable again.
    await sleep(2500)
    await holdClick(A, 963, 963, 2200)
    check('after its rearm time the box works again', !(await live(962.5)), await cmd(`zztrapprobe ${H} 971.5 ${Y} 962.5 stand`))
    await sleep(8000)
    check('...and the power returns again', await live(962.5))

    // Linked: one pull is not enough, one robber can't pull both, and a miss alarms.
    await stand(A, 965.5, 969.5)
    await stand(B, 969.5, 967.5)
    await sleep(1500)
    await click(A, 963, 967)
    await sleep(500)
    check('one lever alone does nothing yet', (await live(967.5)) && /powered=true|passed/i.test(await cmd(`execute if block 963 ${Y} 967 minecraft:lever[powered=true]`)))
    await click(A, 967, 967)
    await sleep(500)
    check('one robber pulling both levers does not fire them', (await live(967.5)) && /passed/i.test(await cmd(`execute if block 967 ${Y} 967 minecraft:lever[powered=true]`)), await cmd(`execute if block 967 ${Y} 967 minecraft:lever[powered=true]`))
    await sleep(4000)
    check('a missed window resets the lever', /passed/i.test(await cmd(`execute if block 963 ${Y} 967 minecraft:lever[powered=false]`)))
    check('...and trips the alarm in an advanced heist', !/alarm=none/.test(await cmd(`dheist info ${H}`)), await cmd(`dheist info ${H}`))
    await click(A, 963, 967)
    await sleep(300)
    await click(B, 967, 967)
    await sleep(700)
    check('two robbers within the window: off for the run', !(await live(967.5)) && (await live(972.5)), await cmd(`zztrapprobe ${H} 971.5 ${Y} 967.5 stand`))
    check('both levers stay down', /passed/i.test(await cmd(`execute if block 967 ${Y} 967 minecraft:lever[powered=true]`)))

    // quiet: dead once the alarm has tripped.
    await stand(B, 968.5, 974.5)
    await sleep(1500)
    await holdClick(B, 967, 972, 1800)
    check('a quiet box is dead in an alarm: its laser stays live', await live(972.5), await cmd(`zztrapprobe ${H} 971.5 ${Y} 972.5 stand`))

    const dump = await cmd(`dswitch dump ${H}`)
    check('the dump recreates them', (dump.match(/dswitch add zswitch/g) || []).length === 4 && /link=sec/.test(dump) && /name=Reader_A/.test(dump), dump)
    check('the trap dump keeps the tag', /tag=door/.test(await cmd(`dtrap dump ${H}`)))

    // A new run: everything back.
    await quit(bots[A]); await quit(bots[B]); delete bots[A]; delete bots[B]
    await sleep(1500)
    await cmd(`dheist end ${H}`)
    await sleep(1500)
    for (let i = 0; i < 40 && (await state()) !== 'open'; i++) { await cmd(`dheist open ${H}`); await sleep(1000) }
    await sleep(3000)
    check('a new run: the run-long switch is off again, the lever up', (await live(967.5)) && /passed/i.test(await cmd(`execute if block 967 ${Y} 967 minecraft:lever[powered=false]`)), `${await state()} ${await cmd(`zztrapprobe ${H} 971.5 ${Y} 967.5 stand`)}`)

    await cmd(`dswitch remove ${H}-4`)
    // A chunk reload can leave a second, unregistered box (found in the client, 2026-11-04): clicks on it did nothing.
    const before = await hitbox()
    await cmd(`execute in minecraft:overworld run summon minecraft:interaction 963.5 ${Y} 963.5 {Tags:["donating_switch"]}`)
    await sleep(300)
    const withStray = await hitbox()
    await sleep(3000)
    check('a stray box near a switch is removed', withStray === before + 1 && (await hitbox()) === before, `${before} ${withStray} ${await hitbox()}`)
    check('remove', /3 switches/.test(await cmd(`dswitch list ${H}`)))
  } finally {
    for (const n of Object.keys(bots)) await quit(bots[n]).catch(() => {})
    await rcon.cmd(`dheist delete ${H} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${H}`).catch(() => {})
    await rcon.cmd(`fill 955 ${Y - 1} 955 985 ${Y + 4} 985 air`).catch(() => {})
    await rcon.cmd('forceload remove 950 950 985 985').catch(() => {})
    rcon.close()
  }
  check('deleting the heist removes its switches', /unknown heist/.test((await (async () => { const r = await rconLib.connect(); const o = await r.cmd(`dswitch list ${H}`); r.close(); return o })())))
}
