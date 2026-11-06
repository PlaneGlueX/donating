// loot.sk's blast charges, on a glass platform at x 960..980, y 200 ("Blast Vault", advanced). A bot holds right-click on a real hitbox.
// Door 1 (x 970, z 965..966, y 200..201) is loud with a pile behind it; door 2 (x 970, z 973..974) is quiet with fuse 3.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const H = 'zblast'
const Y = 200
const A = 'BlastA'
const B = 'BlastB'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim().replace(/§./g, '')
  let bot, botB, barB
  const pieces = async n => Number(((await cmd(`zzloot ${H}`)).match(new RegExp(`\\| ${n}:\\w+:\\w*:n=(\\d+)`)) || [])[1])
  const spot = async n => ((await cmd(`zzloot ${H}`)).match(new RegExp(`\\| ${n}:(\\w+):(\\w*):[^|]*hb=(\\d+)`)) || []).slice(1)
  const state = async () => ((await cmd(`zzheist ${H}`)).match(/state=(\S+)/) || [])[1]
  const isBlock = async (x, y, z, b) => /passed/i.test(await cmd(`execute if block ${x} ${y} ${z} minecraft:${b}`))
  const hp = async () => Number(((await cmd(`zzhp ${A}`)).match(/HP \S+ ([\d.]+)/) || [])[1])
  const alarm = async () => !/alarm=none/.test(await cmd(`dheist info ${H}`))
  const hold = async (x, z, ms, b = bot) => {
    const near = () => b.nearestEntity(e => e.name === 'interaction' && Math.abs(e.position.x - (x + 0.5)) < 1.2 && Math.abs(e.position.z - (z + 0.5)) < 1.2)
    await b.lookAt(b.entity.position.offset(x + 0.5 - b.entity.position.x, Y + 0.5 - b.entity.position.y, z + 0.5 - b.entity.position.z), true)
    for (const end = Date.now() + ms; Date.now() < end;) { const e = near(); if (e) await b.activateEntity(e); await sleep(200) }
    return Boolean(near())
  }
  const openRun = async () => { for (let i = 0; i < 40 && (await state()) !== 'open'; i++) { await cmd(`dheist open ${H}`); await sleep(1000) } await sleep(2500) }
  try {
    await cmd(`dheist delete ${H} confirm`)
    await cmd(`rg remove -w world heist_${H}`)
    await cmd('forceload add 950 950 985 985')
    await cmd(`fill 955 ${Y - 1} 955 985 ${Y - 1} 985 glass`)
    await cmd(`fill 955 ${Y} 955 985 ${Y + 4} 985 air`)
    await cmd(`fill 970 ${Y} 965 970 ${Y + 1} 966 iron_block`)
    await cmd(`fill 970 ${Y} 973 970 ${Y + 1} 974 iron_block`)
    await cmd(`zzregion heist_${H} 960 ${Y - 1} 960 980 ${Y + 6} 980`)
    for (const c of [`dheist create ${H} 3`, `dheist set ${H} level 0`, `dheist set ${H} name Blast Vault`, `dheist set ${H} advanced true`, `dheist set ${H} escape 600`, `dheist set ${H} cooldown 5`, `dheist exit ${H} 957.5 ${Y} 970.5`]) await cmd(c)
    await cmd(`dloot add ${H} blast 970 ${Y} 965 970 ${Y + 1} 966 fuse=4 radius=4 damage=4 claim=6`)
    await cmd(`dloot add ${H} blast 970 ${Y} 973 970 ${Y + 1} 974 fuse=3 alarm=false radius=2 name=Hatch`)
    await cmd(`dloot add ${H} pile 972 ${Y} 965 973 ${Y} 966 value=200-200 piece=100 behind=1`)
    check('a store refuses blast doors', /no safes or vault doors/.test(await cmd('dloot add gas blast 1 2 3 1 2 3')), await cmd('dloot add gas blast 1 2 3 1 2 3'))
    await cmd(`dheist snapshot ${H}`)
    await cmd(`dheist enable ${H}`)
    await sleep(1500)
    await openRun()
    check('closed, with hitboxes and the pile behind it locked', (await spot(1))[1] === 'closed' && Number((await spot(1))[2]) > 0 && (await spot(3))[1] === 'locked', JSON.stringify([await spot(1), await spot(3)]))

    bot = await join(A)
    await cmd(`gamemode survival ${A}`)
    await cmd(`zzclear ${A}`)
    await cmd(`zzpassive ${A} off`)
    await cmd(`dlevel set ${A} 5`)
    await cmd(`zzheisttp ${A} 968.5 ${Y} 965.5`)
    // B waits past the door, out of range, for the head start check.
    botB = await join(B)
    botB._client.on('system_chat', p => { barB = JSON.stringify(p).slice(0, 200) }); botB._client.on('action_bar', p => { barB = JSON.stringify(p).slice(0, 200) })
    await cmd(`gamemode survival ${B}`)
    await cmd(`zzclear ${B}`)
    await cmd(`zzpassive ${B} off`)
    await cmd(`dlevel set ${B} 5`)
    await cmd(`zzheisttp ${B} 975.5 ${Y} 965.5`)
    await sleep(6500) // a new client can't be hurt until it has loaded
    await cmd(`zzhp ${A} 20`)
    await hold(970, 965, 800)
    check('a short hold does not plant', (await spot(1))[1] === 'closed', (await spot(1)).join(':'))
    const saw = await hold(970, 965, 2600)
    check('holding 2 s plants it: the bot sees the hitbox, the state is planted', saw && (await spot(1))[1] === 'planted', (await spot(1)).join(':'))
    check('planting starts the clock', (await state()) === 'active', await state())
    check('a TNT display and the countdown show', /passed/i.test(await cmd(`execute if entity @e[type=minecraft:text_display,tag=donating_loot,x=970,y=${Y},z=965,distance=..4]`)))
    check('the door still stands while the fuse burns', await isBlock(970, Y, 965, 'iron_block'))
    const hp0 = await hp()
    await sleep(4500)
    check('at 0 the door is gone', (await isBlock(970, Y, 965, 'air')) && (await isBlock(970, Y + 1, 966, 'air')) && (await spot(1))[1] === 'open', (await spot(1)).join(':'))
    check('...the pile behind it opens', (await spot(3))[1] === 'open', (await spot(3)).join(':'))
    check('...a robber within radius takes exactly the damage, in HP', Math.abs(hp0 - 4 - (await hp())) < 0.6, `${hp0} -> ${await hp()}`)
    const hpB = Number(((await cmd(`zzhp ${B}`)).match(/HP \S+ ([\d.]+)/) || [])[1])
    check('...one outside the radius takes none', hpB >= 19.5, String(hpB))
    check('...the loud door trips the alarm', await alarm(), await cmd(`dheist info ${H}`))
    check('...nearby blocks are untouched', await isBlock(970, Y - 1, 965, 'glass'))
    const n0 = await pieces(3)
    await hold(972, 965, 2000, botB)
    check('the planter has the head start: another robber can\'t grab yet', (await pieces(3)) === n0 && n0 > 0, `${n0} -> ${await pieces(3)}`)
    await sleep(4500)
    await hold(972, 965, 3000, botB)
    check('...and can once it ends', (await pieces(3)) < n0, `${n0} -> ${await pieces(3)} pos=${botB.entity.position} seen=${Object.values(botB.entities).filter(e=>e.name==='interaction').map(e=>e.position.toString()).join(' ')} bar=${barB} ${await cmd(`zzbag ${B}`)} ${await cmd(`zzloot ${H}`)}`)

    // A fresh run: the door is back, the quiet door stays quiet and a robber out of range is safe.
    await quit(bot); bot = null
    await quit(botB); botB = null
    await sleep(1500)
    await cmd(`dheist end ${H}`)
    await sleep(1500)
    await openRun()
    check('a new run: the door stands again, closed', (await isBlock(970, Y, 965, 'iron_block')) && (await spot(1))[1] === 'closed', `${await state()} ${(await spot(1)).join(':')}`)

    bot = await join(A)
    await cmd(`zzheisttp ${A} 968.5 ${Y} 973.5`)
    await sleep(6500)
    await cmd(`zzhp ${A} 20`)
    const saw2 = await hold(970, 973, 2600)
    check('the quiet door plants', saw2 && (await spot(2))[1] === 'planted', (await spot(2)).join(':'))
    await cmd(`zzheisttp ${A} 962.5 ${Y} 973.5`)
    await sleep(3800)
    check('alarm=false: the door opens with no alarm', (await spot(2))[1] === 'open' && !(await alarm()), `${(await spot(2)).join(':')} ${await cmd(`dheist info ${H}`)}`)
    check('out of range: no damage', (await hp()) >= 19.5, String(await hp()))

    const dump = await cmd(`dloot dump ${H}`)
    check('the dump keeps fuse, radius, damage, alarm', /blast .*fuse=4/.test(dump) && /radius=4/.test(dump) && /damage=4/.test(dump) && /alarm=false/.test(dump), dump)
    check('/dloot check counts it', /clears it all/.test(await cmd(`dloot check ${H}`)))
  } finally {
    if (bot) await quit(bot).catch(() => {})
    if (botB) await quit(botB).catch(() => {})
    await sleep(1500) // a robber who just left still counts as inside: delete would refuse
    await rcon.cmd(`dheist delete ${H} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${H}`).catch(() => {})
    await rcon.cmd(`fill 955 ${Y - 1} 955 985 ${Y + 4} 985 air`).catch(() => {})
    await rcon.cmd('forceload remove 950 950 985 985').catch(() => {})
    rcon.close()
  }
}
