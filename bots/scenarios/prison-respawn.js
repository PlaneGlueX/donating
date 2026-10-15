// Every death sends you to the prison, and nobody dies inside the walls (prison.sk; ESCAPE-SPEC 4.3, 4.5 and 7.2-3): a
// free bot killed in the city respawns at R_SPAWN as an inmate with an empty hotbar 1-5 and its car job ended without
// a cooldown; an exempt bot (data jail "off") respawns at the city spawn; a /kill inside costs nothing and is a downing
// (its cell, the hunt gone); lethal damage inside downs instead of killing (no death, its cell, the door after 12 s,
// the jail items, the weapons in hotbar 1-5 and the search waits gone, no money lost; owner, 2026-10-14: "getting
// arrested in prison takes away your weapons too"; a calm /prison stuck keeps them); the stair gate opens for inmates from
// both sides, for a hunted one only upward, never for the course; a free bot rejoining in the prison world stays there
// (the jailbreak world is the whole map: owner, 2026-10-14); with the prison switched off an inmate is moved to the city
// and freed when it's switched on again.
const { start, field, sleep } = require('../prisonlib')

const A = 'PcRespA'
const B = 'PcRespB'
const VET_CELLS = ['n89', 'n96', 'n103', 'n110', 's96', 's103', 's110', 's117']
const CELL_DOOR = { n89: 'cell_n89', n96: 'cell_n96', n103: 'cell_n103', n110: 'cell_n110', s96: 'cell_s96', s103: 'cell_s103', s110: 'cell_s110', s117: 'cell_s117' }

module.exports = async ({ check }) => {
  const t = await start()
  const { cmd, info, into, state, doorOpen, door, pos, dim, said, until, bal } = t
  try {
    await t.prisonOn()
    await t.copsBlind()
    const a = await t.newBot(A)
    const b = await t.newBot(B)
    await sleep(1500)
    for (const n of [A, B]) {
      await cmd(`zzclear ${n}`)
      await cmd(`zzctreset ${n}`)
    }
    await sleep(6000) // a joined bot can't be hurt until ~6 s after joining

    // ---- a free bot killed in the city: the prison, an inmate, an empty hotbar 1-5, its car job ended (no cooldown)
    await state(A, 'out')
    await cmd(`execute in minecraft:overworld run minecraft:tp ${A} 0.5 120 0.5`)
    await cmd(`wm give ${A} Combat_Knife 1 {slot:0}`)
    const plate = ((await cmd(`zzcarnew ${A} GKAH5U`)).match(/CARNEW (\S+)/) || [])[1]
    await cmd(`zzctfake ${A} street ${plate}`)
    await sleep(500)
    check('setup: a free bot in the city with a car job and a knife', (await dim(A)) === 'minecraft:overworld' && /job=street/.test(await cmd(`zzctstate ${A}`)) && /Combat_Knife/.test(await cmd(`zzwm ${A}`)), await cmd(`zzctstate ${A}`))
    let since = Date.now()
    await cmd(`minecraft:kill ${A}`)
    await until(async () => (await dim(A)) === 'minecraft:jailbreak', 8000)
    await sleep(1500)
    let p = await pos(A)
    let s = await info(A)
    check('killed in the city: respawns in jailbreak at R_SPAWN (86.5, 65, 198.5)', (await dim(A)) === 'minecraft:jailbreak' && p && Math.abs(p[0] - 86.5) <= 1.1 && Math.abs(p[2] - 198.5) <= 1.1, `${await dim(A)} ${p}`)
    check('...as an inmate (state in), "Locked up again"', field(s, 'state') === 'in' && said(a, /Locked up again/, since), s)
    const dump = await cmd(`zzdump ${A}`)
    check('...with hotbar 1-5 empty (the knife gone)', !/(DUMP |\| )[0-4]=/.test(dump), dump)
    const ct = await cmd(`zzctstate ${A}`)
    check('...the car job ended without a cooldown ("You got locked up")', /job=<none>/.test(ct) && /cd=0/.test(ct) && said(a, /You got locked up: the .* job is off/, since), ct)
    check('...protected for 30 s after the respawn', Number(field(s, 'shield')) >= 20, s)

    // ---- an exempt bot (state off) respawns at the city spawn
    await state(B, 'off')
    await cmd(`execute in minecraft:overworld run minecraft:tp ${B} 0.5 120 0.5`)
    await sleep(500)
    await cmd(`minecraft:kill ${B}`)
    await sleep(4000)
    check('an exempt bot (state off) respawns in the city', (await dim(B)) === 'minecraft:overworld' && field(await info(B), 'state') === 'off', `${await dim(B)} ${await info(B)}`)

    // ---- a /kill inside: no money lost, DOWNED in its cell, the hunt gone
    await into(A, 200.5, 65, 150.5, 0)
    await cmd(`zzjail ${A} hostile`)
    await sleep(1500)
    let b0 = await bal(A)
    since = Date.now()
    await cmd(`minecraft:kill ${A}`)
    await until(async () => VET_CELLS.includes(field(await info(A), 'cell')), 8000)
    await sleep(1500)
    s = await info(A)
    p = await pos(A)
    check('a /kill inside: back in an east-wing cell as DOWNED', VET_CELLS.includes(field(s, 'cell')) && said(a, /DOWNED/, since) && p && p[1] < 60, `${s} at ${p}`)
    check('...the hunt gone and no money lost', field(s, 'hostile') === 'no' && (await bal(A)) === b0, `${s} bal ${await bal(A)} vs ${b0}`)

    // ---- lethal damage inside: downed, not dead
    await sleep(12500)
    await into(A, 200.5, 65, 150.5, 0)
    await cmd(`zzjail ${A} give keycard`)
    await cmd(`zzjail ${A} give putty`)
    await cmd(`zzjail ${A} own Combat_Knife`)
    await cmd(`wm give ${A} Combat_Knife 1 {slot:0}`)
    await cmd(`zzdata ${A} jspot-ready::SEARCH_PUTTY ${Math.floor(Date.now() / 1000) + 600}`)
    await sleep(1200)
    b0 = await bal(A)
    t.logs.prison.mark()
    since = Date.now()
    let deaths = 0
    a.once('death', () => deaths++)
    await cmd(`execute in minecraft:jailbreak run minecraft:damage ${A} 100`)
    await sleep(1600)
    s = await info(A)
    const cell = field(s, 'cell')
    check('lethal damage inside: no death (DOWNED instead), the bot stays alive', deaths === 0 && a.health > 0 && said(a, /DOWNED/, since) && !said(a, /died|was slain|fell/, since), `deaths=${deaths} hp=${a.health} ${t.text(a, since)}`)
    check('...back in an east-wing cell, its door shut', VET_CELLS.includes(cell) && !(await doorOpen(CELL_DOOR[cell])), `${s} ${await door(CELL_DOOR[cell] || 'x')}`)
    check('...the jail items gone and the search wait cleared', field(s, 'items') === '' && /= <none>/.test(await cmd(`zzdata ${A} jspot-ready::SEARCH_PUTTY`)), `${s} ${await cmd(`zzdata ${A} jspot-ready::SEARCH_PUTTY`)}`)
    const dumpD = await cmd(`zzdump ${A}`)
    check('...the knife in hotbar 1-5 taken too ("They took your weapons"), still unlocked', !/(DUMP |\| )[0-4]=/.test(dumpD) && said(a, /They took your weapons/, since) && /= true/.test(await cmd(`zzdata ${A} wpn::Combat_Knife`)), dumpD)
    check('...no money lost; logged "catch ... down"', (await bal(A)) === b0 && t.logs.prison.has(new RegExp(`catch ${A} \\S+ down`)), `bal ${await bal(A)} vs ${b0}`)
    const opened = await until(() => doorOpen(CELL_DOOR[cell]), 14000, 300)
    check('...the cell door opens after the 12 s wait', opened && Date.now() - since >= 11000, `${Date.now() - since} ms`)

    // ---- a calm /prison stuck keeps the weapons (it takes nothing); a staff catch takes them
    await into(A, 200.5, 65, 150.5, 0)
    await cmd(`wm give ${A} Combat_Knife 1 {slot:0}`)
    await cmd(`zzjail ${A} unstuck`)
    await sleep(800)
    a.chat('/prison stuck')
    await until(async () => VET_CELLS.includes(field(await info(A), 'cell')), 4000)
    await sleep(1500)
    check('a calm /prison stuck: back to a cell with the knife kept', VET_CELLS.includes(field(await info(A), 'cell')) && /Combat_Knife/.test(await cmd(`zzwm ${A}`)), `${await info(A)} ${await cmd(`zzwm ${A}`)}`)
    await sleep(2500) // jailCatch ignores a second catch within 3 s
    await cmd(`dprison catch ${A}`)
    await sleep(2000)
    check('...an arrest (staff catch) takes it', !/Combat_Knife/.test(await cmd(`zzwm ${A}`)), await cmd(`zzwm ${A}`))

    // ---- the stair gate: up and down for an inmate, only up for a hunted one, never for the course
    const awayFromGate = async n => { await t.jtp(n, 84.5, 65, 130.5, 0); await sleep(400); await cmd('dprison door stairgate close'); await sleep(400) }
    await into(A, 84.5, 65, 114.5, 180)
    check('the stair gate opens for an inmate on the Hall B side', await until(() => doorOpen('stairgate'), 1500), await door('stairgate'))
    await awayFromGate(A)
    await into(A, 84.5, 65, 112.5, 0)
    check('...and on the B1 side (the top step)', await until(() => doorOpen('stairgate'), 1500), await door('stairgate'))
    await awayFromGate(A)
    await into(A, 84.5, 65, 114.5, 180)
    await cmd(`zzjail ${A} hostile`)
    await cmd('dprison door stairgate close')
    since = Date.now()
    await sleep(1200)
    check('a hunted inmate on the Hall B side: the gate stays shut (and says so)', !(await doorOpen('stairgate')) && said(a, /The gate stays shut while the guards are after you/, since), await door('stairgate'))
    await t.jtp(A, 84.5, 65, 112.5, 0)
    check('...on the B1 side it opens (up is always open)', await until(() => doorOpen('stairgate'), 1500), await door('stairgate'))
    await cmd(`zzjail ${A} calm`)
    await awayFromGate(A)
    await into(A, 84.5, 65, 114.5, 180, 'course')
    await cmd(`zzjail ${A} step office`)
    await sleep(1200)
    check('a course bot on the Hall B side: the gate stays shut', !(await doorOpen('stairgate')), await door('stairgate'))
    await state(A, 'in')
    await awayFromGate(A)

    // ---- a free bot rejoining in the prison world stays there (the jailbreak world is the whole map)
    await state(B, 'off')
    await t.jtp(B, 260.5, 65, 404.5, 0)
    await state(B, 'out')
    await sleep(1500)
    check('setup: a free bot outside the front gate in jailbreak', (await dim(B)) === 'minecraft:jailbreak' && field(await info(B), 'inside') === 'false', await info(B))
    await t.drop(B)
    await sleep(1500)
    await t.newBot(B)
    await sleep(4000)
    const pB = await pos(B)
    check('a free bot rejoining in the prison world stays where it was, still free (no teleport to the city)', (await dim(B)) === 'minecraft:jailbreak' && pB && Math.abs(pB[0] - 260.5) < 1 && Math.abs(pB[2] - 404.5) < 1 && field(await info(B), 'state') === 'out', `${await dim(B)} ${pB} ${await info(B)}`)

    // ---- the master switch off: an inmate in jailbreak is moved to the city, freed when it's on again
    await into(A, 200.5, 65, 150.5, 0)
    await sleep(1200)
    await t.prisonOff()
    const moved = await until(async () => (await dim(A)) === 'minecraft:overworld', 34000, 1000)
    check('the prison switched off: an inmate in jailbreak is moved to the city within 30 s (state kept)', moved && field(await info(A), 'state') === 'in', `${await dim(A)} ${await info(A)}`)
    await t.prisonOn()
    const freed = await until(async () => field(await info(A), 'state') === 'out', 4000)
    check('...switched on again: the inmate in the city is freed (state out)', freed, await info(A))
  } finally {
    await t.prisonOff()
    for (const n of [A, B]) if (t.bots[n]) await cmd(`zzjail ${n} state off`)
    await t.close()
  }
}
