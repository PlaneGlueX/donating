// The ladder over the lot's south fence (owner, 2026-10-22: "a ladder on the ramp side of the prison parking lot so
// people can escape without a card and also get rid of the big ramp (make sure theres a gps waypoint the first time the
// player gets into the parking lot in the tutorial, there can be two waypoints to the gate control or the ladder, they
// both disappear when you escape)"): the ramp gone and the ladder built (tools/build/jail/outdoors.js lotLadder); an
// inmate on Lefty's l_out has a GPS target of two spots (the booth and the ladder); climbing it from the lot is an
// escape ("Over the lot fence") and the target goes; nobody climbs in from the road (the outside ladder starts 2 up).
const { start, field, sleep } = require('../prisonlib')

const A = 'PcLadderA'

module.exports = async ({ check }) => {
  const t = await start()
  const { cmd, info, into, pos, said, until, isBlock } = t
  const story = async (n, c) => cmd(`dstory info ${n} ${c}`)
  try {
    await t.prisonOn()
    await t.copsBlind()
    const a = await t.newBot(A, { fresh: true })
    await sleep(2500)
    await cmd(`dprison course ${A} skip`)
    await into(A, 205.5, 65, 160.5, 0)
    await until(async () => /id=l_meet/.test(await story(A, 'lefty')), 12000, 500)
    await cmd(`zzdatatext ${A} lefty-way keycard`)
    await cmd(`dstory set ${A} l_out`)
    await into(A, 150.0, 65, 393.5, 0)
    await sleep(1500) // the chunks load around the bot
    check('the ramp is gone (air where it stood)', await isBlock(150, 67, 380, 'minecraft:air') && await isBlock(140, 66, 380, 'minecraft:air'))
    check('the ladder: up the lot side (z 395) and down the road side from y 67 (z 397)', await isBlock(149, 68, 395, 'minecraft:ladder') && await isBlock(150, 70, 397, 'minecraft:ladder') && await isBlock(150, 66, 397, 'minecraft:air'))
    const gps = await until(async () => { const g = await cmd(`dphone gps ${A}`); return /active=quest/.test(g) && /spots=2 /.test(g) ? g : null }, 6000, 300)
    check('l_out in the lot: the GPS has two spots (the booth\'s gate control and the ladder)', !!gps, gps || await cmd(`dphone gps ${A}`))

    // Up the ladder (forward and jump against it), over the top, down the road side.
    t.logs.prison.mark()
    const since = Date.now()
    await a.lookAt(a.entity.position.offset(0, 1.6, 5), true)
    a.setControlState('forward', true)
    a.setControlState('jump', true)
    const top = await until(async () => { const p = await pos(A); return p && p[1] >= 72.5 }, 8000, 200)
    a.setControlState('jump', false)
    const out = await until(async () => { const p = await pos(A); return p && p[2] > 397.2 }, 5000, 200)
    a.clearControlStates()
    check('...the inmate climbs the ladder and over the top', top && out, `${await pos(A)}`)
    const esc = await until(() => t.logs.prison.has(new RegExp(`escape ${A} `)), 5000)
    check('...outside: ESCAPED, "Over the lot fence"', esc && field(await info(A), 'state') === 'out' && said(a, /Over the lot fence/, since), `${t.logs.prison.since()} | ${await info(A)}`)
    const gone = await until(async () => !/label=Out_the_front_gate/.test(await cmd(`dphone gps ${A}`)), 6000, 300)
    check('...and the lot\'s waypoints are gone (Lefty\'s chain done)', gone && /id=done/.test(await story(A, 'lefty')), `${await cmd(`dphone gps ${A}`)} | ${await story(A, 'lefty')}`)

    // From the road: the outside ladder starts 2 blocks up, so nobody climbs in.
    await into(A, 150.0, 65, 398.6, 180)
    await sleep(500)
    await a.lookAt(a.entity.position.offset(0, 1.6, -5), true)
    a.setControlState('forward', true)
    a.setControlState('jump', true)
    await sleep(3500)
    a.clearControlStates()
    const p2 = await pos(A)
    check('from the road nobody climbs in (still outside, below the top)', p2 && p2[2] > 396.5 && p2[1] < 68, `${p2}`)
  } finally {
    await cmd(`zzjail ${A} state off`)
    await t.prisonRestore()
    await t.close()
  }
}
