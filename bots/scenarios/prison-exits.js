// Veterans are never shut in (ESCAPE-SPEC 4.4, 4.5 and 7.2-2; the critique's points 2 and 3): an inmate ("in")
// teleported into the course rooms walks out of each (the vent chamber's door, the Security Office's inside reader, the
// SECURITY door from Hall C, Rusty's door, the boiler room through Rusty's cell, the yard's keycard-only Gun Shop with no
// keycard: its door opens from inside); an east-wing cell whose wait is over
// opens within 5 ticks and stays open for an AFK inmate; /prison stuck: a calm inmate goes to their cell with
// everything kept (again within 60 s refused), a hunted one is caught (the jail items taken).
const { start, field, sleep } = require('../prisonlib')

const A = 'PcExitA'
const B = 'PcExitB'
const VET_CELLS = ['n89', 'n96', 'n103', 'n110', 's96', 's103', 's110', 's117']

module.exports = async ({ check }) => {
  const t = await start()
  const { cmd, info, into, door, doorOpen, pos, said, until, walk, clickBlock } = t
  try {
    await t.prisonOn()
    await t.copsBlind()
    const a = await t.newBot(A)
    const b = await t.newBot(B)
    await sleep(1500)
    await cmd(`zzclear ${A}`)
    await cmd(`zzclear ${B}`)

    // ---- the vent chamber: its door opens for an inmate inside
    await into(A, 77.5, 58, 84.5, -90)
    const vent = await until(() => doorOpen('vent'), 2000)
    check('an inmate in the vent chamber: the vent door opens', vent, await door('vent'))
    check('...the lids stay up for an inmate (no forced crawl)', await t.isBlock(77, 59, 84, 'minecraft:iron_trapdoor[open=true]'))
    let out = await walk(a, [[80.5, 84.5]])
    check('...and the inmate walks out into the corridor', out && (await pos(A))[0] >= 80, `${await pos(A)}`)

    // ---- the Security Office's lower floor: the inside reader opens the gate
    await into(A, 77.5, 58, 93.5, -90)
    await sleep(800)
    await clickBlock(a, 78, 59, 92)
    const so = await until(() => doorOpen('sogate'), 2000)
    check('an inmate in the Security Office (lower): the inside reader opens the gate', so, await door('sogate'))
    out = await walk(a, [[80.5, 93.5]])
    check('...and the inmate walks out', out && (await pos(A))[0] >= 80, `${await pos(A)}`)

    // ---- Hall C (the Security Office's upper floor side): the SECURITY door opens from inside
    await into(A, 76.5, 65, 117.5, -90)
    const sec = await until(() => doorOpen('security'), 2000)
    check('an inmate in Hall C: the SECURITY door opens', sec, await door('security'))
    out = await walk(a, [[81.5, 117.5]])
    check('...and the inmate walks into Hall B', out && (await pos(A))[0] >= 80, `${await pos(A)}`)

    // ---- Rusty's cell: his door opens from inside for an inmate
    await into(A, 78.5, 58, 78.5, -90)
    const rusty = await until(() => doorOpen('rusty'), 2000)
    check('an inmate at Rusty\'s door inside his cell: the door opens', rusty, await door('rusty'))
    out = await walk(a, [[80.5, 78.5]])
    check('...and the inmate walks out into the corridor', out && (await pos(A))[0] >= 80, `${await pos(A)}`)
    await sleep(3500)

    // ---- the yard's Gun Shop (keycard-only since 2026-10-20): its door opens from inside for anyone
    await into(A, 312.5, 65, 252.5, 0)
    await sleep(500)
    const gsShut = !(await doorOpen('gunshop'))
    out = await walk(a, [[316.5, 256.8]])
    const gsOpen = await until(() => doorOpen('gunshop'), 1500)
    const gsOut = await walk(a, [[316.5, 261.5]], 3000)
    check('an inmate in the Gun Shop with no keycard: the door opens from inside, and the inmate walks out', gsShut && out && gsOpen && gsOut && (await pos(A))[2] > 259, `${gsShut} ${gsOpen} ${await pos(A)} ${await door('gunshop')}`)

    // ---- the boiler room: through the broken wall into Rusty's cell, and out of his door
    await into(A, 72.5, 58, 77.5, -90)
    await sleep(500)
    check('the broken wall into Rusty\'s cell is open (x 73..74, y 58..59, z 77)', await t.isBlock(73, 58, 77, 'minecraft:air') && await t.isBlock(74, 59, 77, 'minecraft:air'))
    out = await walk(a, [[78.5, 77.5], [78.5, 78.5], [80.5, 78.5]], 5000)
    check('an inmate in the boiler room walks out through Rusty\'s cell', out && (await pos(A))[0] >= 80, `${await pos(A)}`)

    // ---- an east-wing cell whose wait is over: open within 5 ticks
    await into(A, 91.5, 58, 51.5, 0)
    await cmd('dprison door cell_n89 close')
    const t0 = Date.now()
    const opened = await until(() => doorOpen('cell_n89'), 2000, 100)
    check('an inmate in an east-wing cell with no wait: the shut door opens within a moment', opened && Date.now() - t0 < 1500, `${Date.now() - t0} ms`)

    // ---- AFK in the cell for 20 s: the door stays open, and the inmate walks out
    await cmd(`zzafk ${A}`)
    let allOpen = true
    for (let i = 0; i < 5; i++) { await sleep(4000); if (!(await doorOpen('cell_n89'))) allOpen = false }
    check('AFK in the cell for 20 s: the door open the whole time', allOpen && /true/.test(await cmd(`zzafkstate ${A}`)), await cmd(`zzafkstate ${A}`))
    out = await walk(a, [[91.5, 54.5], [91.5, 58.5]])
    check('...and the AFK inmate walks out when it moves', out && (await pos(A))[2] >= 56, `${await pos(A)}`)

    // ---- /prison stuck, calm: the cell, everything kept; again within 60 s refused
    await into(A, 200.5, 65, 150.5, 0)
    await cmd(`zzjail ${A} give keycard`)
    await sleep(1500)
    let since = Date.now()
    a.chat('/prison stuck')
    await sleep(2500)
    let s = await info(A)
    const p = await pos(A)
    check('/prison stuck (calm): back to an east-wing cell', VET_CELLS.includes(field(s, 'cell')) && p && p[1] < 60, `${s} at ${p}`)
    check('...the keycard kept (nothing taken)', /keycard:/.test(field(s, 'items')), s)
    check('...the cell opens in 12 s', said(a, /Your cell opens in 12s/, since) && Number(field(s, 'cellwait')) >= 9, s)
    since = Date.now()
    a.chat('/prison stuck')
    await sleep(1500)
    check('/prison stuck again within 60 s: refused ("Too soon")', said(a, /Too soon: \/prison stuck again in/, since))

    // ---- /prison stuck while hunted: a catch (the jail items go)
    await into(B, 205.5, 65, 150.5, 0)
    await cmd(`zzjail ${B} give keycard`)
    await cmd(`zzjail ${B} give putty`)
    await cmd(`zzjail ${B} hostile`)
    await sleep(1200)
    since = Date.now()
    b.chat('/prison stuck')
    await sleep(2500)
    s = await info(B)
    check('/prison stuck while hunted: a catch (BACK TO YOUR CELL), the jail items taken', said(b, /BACK TO YOUR CELL/, since) && field(s, 'items') === '' && field(s, 'hostile') === 'no' && VET_CELLS.includes(field(s, 'cell')), s)
  } finally {
    await t.prisonRestore()
    for (const n of [A, B]) if (t.bots[n]) await cmd(`zzjail ${n} state off`)
    await t.close()
  }
}
