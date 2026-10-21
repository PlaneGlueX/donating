// The prison's B1 controls course for first-joiners (jailcourse.sk; ESCAPE-SPEC 4.4 and 7.2-1; owner, 2026-10-14: "the
// lower levels learn the controls"). A first join lands in a west-wing cell; the door opens after 5 s and stays open
// while the bot is inside; (no basic-controls steps: owner, 2026-10-14) sneak past the sleeping guard for his keycard, the vent
// reader, the lids that force the crawl, the boiler room, Rusty's knife (the hotbar lesson; from then on his door opens
// from inside: owner, 2026-10-14, "theres no way out back into the hallway"), the phone, the Security
// Office reader, the ladder hatch, the SECURITY door from Hall C, Hall B: done (state in, Lefty's chain starts). Then a
// course bot pushed back from B1's stair, and rejoins at a checkpoint and in a cell (its door opens 3 s after the join).
// The guard wakes for a bot not sneaking within 5 blocks of him, also outside his post (owner, 2026-10-14). B1 has no
// course instruction signs any more (only place names). Every step is told straight to the player (a title, a TUTORIAL
// chat line); /tutorial confirm takes a player back to their step, and after the course back to the start as a
// prisoner again; /tutorial stop (owner, 2026-10-15) ends such a replay, also after a rejoin, and puts the player back as
// they were (an inmate in Hall B with their jail items, or free outside the walls; the lot exit when the old spot is
// blocked; the knife Rusty handed out gone); refused for a first-timer and with no replay running.
// Bots can't crawl: they're teleported past the crawl, and the blocks are checked instead.
const { start, field, sleep } = require('../prisonlib')

const A = 'PcCourseA'
const B = 'PcCourseB'
const COURSE_CELLS = ['n46', 'n53', 'n60', 'n67', 's46', 's53', 's60', 's67']

module.exports = async ({ check }) => {
  const t = await start()
  const { cmd, info, tp, door, doorOpen, isBlock, pos, said, until, sneak, clickBlock, Vec3 } = t
  try {
    await t.prisonOn()
    // ---- A first join: a west-wing course cell, step cell
    const a = await t.newBot(A, { fresh: true })
    await sleep(1500)
    let s = await info(A)
    const cell = field(s, 'cell')
    check('first join: state course, step cell', field(s, 'state') === 'course' && field(s, 'step') === 'cell', s)
    check('first join: in a west-wing course cell in jailbreak', COURSE_CELLS.includes(cell) && (await t.dim(A)) === 'minecraft:jailbreak', `${cell} ${await t.dim(A)}`)
    check('first join: the cell door is shut while the wait runs', !(await doorOpen(`cell_${cell}`)), await door(`cell_${cell}`))
    const opened = await until(() => doorOpen(`cell_${cell}`), 6000)
    check('the cell door opens after ~5 s', opened, await door(`cell_${cell}`))
    await sleep(3500)
    s = await info(A)
    check('...stays open while the bot stands inside, and the step is sneak (no walk/sprint/jump steps)', (await doorOpen(`cell_${cell}`)) && field(s, 'step') === 'sneak', s)
    check('the Locked up prompt in the cell (title and a TUTORIAL chat line)', said(a, /Locked up/) && said(a, /TUTORIAL.*learn the ropes/i))
    check('the sneak step told straight away: "Sneak past the guard" and its TUTORIAL line', said(a, /Sneak past the guard/) && said(a, /TUTORIAL.*Guards notice inmates/))
    check('the boss bar says TUTORIAL', a.bars.some(b => /TUTORIAL/.test(b.text)), (a.bars.slice(-1)[0] || {}).text)
    // The sidebar's quest line (owner, 2026-10-20: "make the active quest and step show up instead of the current 'Meet
    // Mara'"): the course's step and its place; no Jobs or hit line for a prisoner ("dont show /jobs ... until the player
    // escapes": nothing at all, so TAB drops the lines).
    const side0 = await until(async () => /Tutorial: .*Sneak past the guard .*2\/9/.test(await t.papi(A, 'donating_mission')), 3000)
    check('the sidebar\'s quest line on the course: "▶ Tutorial: Sneak past the guard 2/9"', side0, await t.papi(A, 'donating_mission'))
    check('...and no Jobs or hit line while a prisoner (empty: TAB drops them)', (await t.papi(A, 'donating_jobs')) === '' && (await t.papi(A, 'donating_hit')) === '', `${await t.papi(A, 'donating_jobs')} | ${await t.papi(A, 'donating_hit')}`)
    await tp(A, 78.5, 58, 59.5, 180)
    await sleep(3200)

    // ---- the sleeping guard: not sneaking wakes him
    let since = Date.now()
    await tp(A, 84.5, 58, 53.5, 180)
    const woke = await until(async () => said(a, /HEY!/, since), 3000)
    const back = await pos(A)
    check('walking into the guard post without sneaking: HEY! and back to SNEAK_BACK', woke && back && Math.abs(back[0] - 78.5) < 1 && Math.abs(back[2] - 59.5) < 1, `${back}`)
    const signs = await cmd('execute in minecraft:jailbreak if entity @e[type=minecraft:text_display,tag=jail_label,x=43,y=56,z=47,dx=83,dy=8,dz=66]')
    check('B1 keeps only its place names (VENT, MAX SECURITY, the Z, SECURITY OFFICE): no course instruction signs', /Count: 4(?!\d)/.test(signs), signs)
    // The corridor past the guard post (6 blocks from him) without sneaking: he sleeps on.
    await sleep(3200)
    since = Date.now()
    await tp(A, 84.5, 58, 57.5, 0)
    await sleep(1600)
    check('walking past the guard post in the corridor (6 blocks from him) without sneaking: he sleeps on', !said(a, /HEY!/, since), t.text(a, since))
    // Within 5 blocks of him but outside the post (the cell next to it, through the wall): HEY! all the same.
    since = Date.now()
    await tp(A, 89.4, 58, 50.5, -90)
    const woke2 = await until(async () => said(a, /HEY!/, since), 3000)
    const back2 = await pos(A)
    check('within 5 blocks of him outside the guard post, not sneaking: HEY! too (the radius, not only the post)', woke2 && back2 && Math.abs(back2[0] - 78.5) < 1 && Math.abs(back2[2] - 59.5) < 1, `${back2}`)

    // ---- sneaking, the keycard on the desk
    sneak(a, true)
    await sleep(3500)
    await tp(A, 82.5, 58, 53.5, 180, 30)
    await sleep(800)
    const cb = t.near(a, 'interaction', [82.5, 58.5, 51.5], 1.5)
    if (cb) {
      a._client.write('use_entity', { target: cb.id, mouse: 2, sneaking: true, hand: 0, x: 0, y: 0.5, z: 0, location: { x: 0, y: 0.5, z: 0 } })
      a._client.write('use_entity', { target: cb.id, mouse: 0, sneaking: true, hand: 0, location: { x: 0, y: 0, z: 0 } })
    }
    await sleep(900)
    sneak(a, false)
    s = await info(A)
    const items = field(s, 'items')
    // Owner, 2026-10-15: "allow the keycard and quest items to be in the last few locked spots in the hotbar".
    const cardSlot = Number((items.match(/coursecard:(\d+)x1/) || [])[1])
    check('sneaking and clicking the keycard: the coursecard in a quest slot (hotbar 6-8, slots 5-7, not the held one), "The card: hotbar N", step vent', cb && field(s, 'step') === 'vent' && cardSlot >= 5 && cardSlot <= 7 && cardSlot !== a.quickBarSlot && said(a, new RegExp(`The card: hotbar ${cardSlot + 1}`)), `${s} held=${a.quickBarSlot}`)
    check('the vent step told: "Use the keycard"', said(a, /Use the keycard/))
    const dump0 = await cmd(`zzdump ${A}`)
    check('...hotbar 1-5 still empty', !/(DUMP |\| )[0-4]=/.test(dump0), dump0)

    // ---- the vent reader, the lids
    await tp(A, 81.5, 58, 85.5, 90)
    await sleep(900)
    await clickBlock(a, 80, 59, 85)
    await sleep(500)
    check('the vent reader opens the vent door', await doorOpen('vent'), await door('vent'))
    await sleep(3800)
    check('...and it closes after 3 s', !(await doorOpen('vent')), await door('vent'))
    await tp(A, 77.5, 58, 84.5, 90)
    await sleep(900)
    check('standing in the vent chamber closes the lids (the crawl)', await isBlock(77, 59, 84, 'minecraft:iron_trapdoor[open=false]') && await isBlock(78, 59, 84, 'minecraft:iron_trapdoor[open=false]'))
    // Bots can't crawl: into the crawl, then the boiler room by teleport.
    await tp(A, 70.5, 58, 84.5, 90)
    await sleep(900)
    check('in the crawl: step crawl', field(await info(A), 'step') === 'crawl', await info(A))
    check('the crawl is 1 high (x 61..76, z 84, y 59 solid above y 58 air)', await isBlock(70, 58, 84, 'minecraft:air') && !(await isBlock(70, 59, 84, 'minecraft:air')))
    await sleep(2500)
    check('the lids open again 2 s after the chamber is empty', await isBlock(77, 59, 84, 'minecraft:iron_trapdoor[open=true]'))
    await tp(A, 61.5, 58, 80.5, 0)
    await sleep(900)
    check('the boiler room: step boiler', field(await info(A), 'step') === 'boiler', await info(A))

    // ---- Rusty's cell through the broken wall: the knife (not into the held slot)
    a.setQuickBarSlot(0)
    await tp(A, 72.5, 58, 77.5, -90)
    await sleep(3300)
    since = Date.now()
    await a.lookAt(new Vec3(80, 59.6, 77.5), true)
    a.setControlState('forward', true)
    await until(async () => { const p = await pos(A); return p && p[0] >= 75.2 }, 3000, 150)
    a.setControlState('forward', false)
    const knifeSay = await until(() => said(a, /Here, a knife\. Press 2/, since), 5000)
    const dump = await cmd(`zzdump ${A}`)
    s = await info(A)
    check('walking into Rusty\'s cell: step hotbar, Rusty says "Took you long enough"', field(s, 'step') === 'hotbar' && said(a, /Took you long enough/, since), s)
    check('the Combat Knife unlocked and in slot 1 (the bot holds slot 0), "Press 2"', knifeSay && /(WM |\| )1=Combat_Knife:/.test(await cmd(`zzwm ${A}`)) && /= true/.test(await cmd(`zzdata ${A} wpn::Combat_Knife`)), dump.slice(0, 300))
    check('the hotbar step told after the knife: "Hold the knife" and the fixed-hotbar TUTORIAL line', said(a, /Hold the knife/, since) && said(a, /TUTORIAL.*hotbar is fixed/, since))
    check('the bar says "press 2"', await until(() => a.bars.some(b => /Hold the knife: press 2/.test(b.text)), 2000), (a.bars.slice(-1)[0] || {}).text)
    // The way out: from the hotbar step on, Rusty's door opens from inside (the hotbar and phone steps work anywhere).
    check("in Rusty's cell at step hotbar: the door shut until the bot walks up", !(await doorOpen('rusty')), await door('rusty'))
    const atDoor = await t.walk(a, [[78.4, 78.5]], 3000)
    check('...walking up to it opens it', atDoor && await until(() => doorOpen('rusty'), 1500), `${await pos(A)} ${await door('rusty')}`)
    const outside = await t.walk(a, [[81.5, 78.5]], 3000)
    check('...and the bot walks out into the corridor (still step hotbar)', outside && field(await info(A), 'step') === 'hotbar', `${await pos(A)} ${await info(A)}`)
    // The knife moved to slot 3 (hotbar.2), then selected: any slot counts.
    await cmd(`minecraft:item replace entity ${A} hotbar.2 from entity ${A} hotbar.1`)
    await cmd(`minecraft:item replace entity ${A} hotbar.1 with minecraft:air`)
    await sleep(600)
    a.setQuickBarSlot(2)
    const held = await until(async () => field(await info(A), 'step') === 'phone', 3000)
    check('the knife held from another slot: step phone', held, await info(A))

    // ---- the phone: right-click opens the map, Rusty's door opens
    a.setQuickBarSlot(8)
    await sleep(500)
    a.activateItem()
    const phoned = await until(async () => field(await info(A), 'step') === 'office', 3000)
    check('right-clicking the phone: step office', phoned, await info(A))
    check('the office step told: "The Security Office"', await until(() => said(a, /The Security Office/), 2000))
    check('...and Rusty\'s door opens', await doorOpen('rusty'), await door('rusty'))
    a.activateItem()
    await sleep(500)
    a.setQuickBarSlot(2)

    // ---- the Security Office: its outside reader, the ladder hatch, upstairs, the SECURITY door, Hall B
    await tp(A, 81.5, 58, 95.5, 90)
    await sleep(900)
    await clickBlock(a, 80, 59, 95)
    await sleep(500)
    check('the Security Office outside reader opens its gate (course card, step office)', await doorOpen('sogate'), await door('sogate'))
    await tp(A, 64.5, 60, 88.5, 0)
    await sleep(900)
    check('in the ladder column: the hatch opens', await doorOpen('sohatch'), await door('sohatch'))
    await tp(A, 64.5, 65, 89.5, 0)
    await sleep(900)
    check('the Security Office upstairs: step upstairs', field(await info(A), 'step') === 'upstairs', await info(A))
    await tp(A, 76.5, 65, 117.5, -90)
    await sleep(3300)
    check('in Hall C: the SECURITY door opens from inside', await doorOpen('security'), await door('security'))
    since = Date.now()
    await a.lookAt(new Vec3(86, 66.6, 117.5), true)
    a.setControlState('forward', true)
    const done = await until(async () => field(await info(A), 'state') === 'in', 5000, 200)
    a.setControlState('forward', false)
    s = await info(A)
    check('through the SECURITY door into Hall B: state in, the course done, the coursecard gone', done && field(s, 'course') === 'done' && !/coursecard/.test(s), s)
    check('the YOU\'RE IN THE BLOCK title', said(a, /IN THE BLOCK/, since))
    const lefty = await until(async () => /id=l_meet/.test(await cmd(`dstory info ${A} lefty`)), 8000)
    check('Lefty\'s chain starts (l_meet)', lefty, await cmd(`dstory info ${A} lefty`))
    const sideIn = await until(async () => /Lefty: .*Hall B bench/.test(await t.papi(A, 'donating_mission')), 3000)
    check('in the block the sidebar shows Lefty\'s lesson ("▶ Lefty: Meet him on the Hall B bench 0/1")', sideIn, await t.papi(A, 'donating_mission'))

    // ---- /tutorial after the course: the offer, then confirm puts A back in a course cell as a prisoner again. Before
    // it, A stands in Hall B with 2 donuts (a jail item not seen as contraband) and the knife out of hotbar 1-5, so
    // /tutorial stop has something to put back and a knife from Rusty to take away.
    await t.jtp(A, 90.5, 65, 117.5, 90)
    for (let i = 0; i < 5; i++) await cmd(`minecraft:item replace entity ${A} hotbar.${i} with minecraft:air`)
    await cmd(`zzjail ${A} give donut 2`)
    await sleep(1200)
    const before = await pos(A)
    const beforeItems = field(await info(A), 'items')
    since = Date.now()
    a.chat('/tutorial')
    check('/tutorial after the course offers the replay and says /tutorial stop ends it', await until(() => said(a, /tutorial confirm/, since) && said(a, /tutorial stop/, since), 3000), t.text(a, since))
    a.chat('/tutorial confirm')
    const replay = await until(async () => { const r = await info(A); return field(r, 'state') === 'course' && field(r, 'step') === 'cell' }, 4000)
    s = await info(A)
    check('/tutorial confirm after the course: state course, step cell, in a course cell', replay && COURSE_CELLS.includes(field(s, 'cell')), s)
    check('...the replay saved what /tutorial stop puts back (state in), the donuts taken for the course', /donut:\d+x2/.test(beforeItems) && /= in$/.test(await cmd(`zzdata ${A} jail-replay::state`)) && !/donut/.test(field(s, 'items')), `${beforeItems} | ${s}`)
    // Owner, 2026-10-20: "when the player does the tutorial again, the tutorial npcs go back to the quests they give for
    // the tutorial": Lefty's lessons start over (they begin again once the course is done), saved for /tutorial stop.
    const lr = await cmd(`dstory info ${A} lefty`)
    const sideReplay = await until(async () => /Tutorial: .*Locked up .*1\/9/.test(await t.papi(A, 'donating_mission')), 3000)
    check('...Lefty\'s lessons start over (saved: l_meet), the sidebar on the course\'s first step ("Tutorial: Locked up 1/9")', /id= /.test(lr) && /= l_meet$/.test(await cmd(`zzdata ${A} jail-replay::chain::lefty::id`)) && sideReplay, `${lr} | ${await t.papi(A, 'donating_mission')}`)

    // ---- /tutorial stop (owner, 2026-10-15: "have a /tutorial stop command if you already completed it before"): a
    // logout keeps the replay; at the hotbar step Rusty hands A a knife; stop puts A back as before the confirm.
    await t.drop(A)
    await sleep(1500)
    const a2 = await t.newBot(A)
    await sleep(2500)
    s = await info(A)
    check('A rejoins mid-replay: still in the course, the saved data kept', field(s, 'state') === 'course' && /= in$/.test(await cmd(`zzdata ${A} jail-replay::state`)), s)
    since = Date.now()
    a2.chat('/tutorial')
    check('/tutorial during a replay offers /tutorial stop', await until(() => said(a2, /tutorial stop/, since), 3000), t.text(a2, since))
    await cmd(`zzjail ${A} step hotbar`)
    const knifeBack = await until(async () => /Combat_Knife/.test(await cmd(`zzwm ${A}`)), 4000)
    check('the replay at the hotbar step hands A a knife (hotbar 1-5)', knifeBack, await cmd(`zzwm ${A}`))
    since = Date.now()
    a2.chat('/tutorial stop')
    const stopped = await until(async () => field(await info(A), 'state') === 'in', 3000)
    s = await info(A)
    const ps = await pos(A)
    const atBefore = ps && before && Math.hypot(ps[0] - before[0], ps[2] - before[2]) < 0.6 && Math.abs(ps[1] - before[1]) < 0.6
    check('/tutorial stop: an inmate again where A stood before the replay, the step and checkpoint gone', stopped && atBefore && field(s, 'step') === '' && field(s, 'cp') === '' && said(a2, /Replay stopped/, since), `${s} at ${ps} was ${before}`)
    check('...the donuts back in their slot, no course card, the knife Rusty handed out gone (still unlocked)', field(s, 'items') === beforeItems && !/Combat_Knife/.test(await cmd(`zzwm ${A}`)) && /= true/.test(await cmd(`zzdata ${A} wpn::Combat_Knife`)), `${s} | ${await cmd(`zzwm ${A}`)}`)
    check('...the saved replay data cleared', /= <none>/.test(await cmd(`zzdata ${A} jail-replay::state`)), await cmd(`zzdata ${A} jail-replay::state`))
    const lb = await cmd(`dstory info ${A} lefty`)
    const sideBack = await until(async () => /Lefty: .*Hall B bench/.test(await t.papi(A, 'donating_mission')), 3000)
    check('...Lefty\'s lessons back as they were (l_meet, followed on the GPS), the sidebar on his lesson again', /id=l_meet/.test(lb) && /= lefty$/.test(await cmd(`zzdata ${A} quest-track`)) && sideBack, `${lb} | ${await cmd(`zzdata ${A} quest-track`)} | ${await t.papi(A, 'donating_mission')}`)
    since = Date.now()
    a2.chat('/tutorial stop')
    check('/tutorial stop with no replay running: refused', await until(() => said(a2, /not replaying the course/, since), 3000) && field(await info(A), 'state') === 'in', t.text(a2, since))

    // ---- a free player's replay: stop puts A back outside the walls, still free; an old spot that isn't safe any
    // more (a block where the head was): the lot exit (LOT_EXIT)
    await t.state(A, 'off')
    await t.jtp(A, 260.5, 65, 410.5, 0)
    await sleep(300)
    await t.state(A, 'out')
    await sleep(1500)
    const outAt = await pos(A)
    check('A free outside the front gate (not pushed: outside the walls)', outAt && Math.abs(outAt[2] - 410.5) < 0.6 && field(await info(A), 'inside') === 'false', `${outAt} ${await info(A)}`)
    a2.chat('/tutorial confirm')
    await until(async () => field(await info(A), 'state') === 'course', 3000)
    since = Date.now()
    a2.chat('/tutorial stop')
    const freed = await until(async () => field(await info(A), 'state') === 'out', 3000)
    const po = await pos(A)
    check('a free player\'s /tutorial stop: free again at the same spot outside the walls', freed && po && Math.abs(po[0] - 260.5) < 0.6 && Math.abs(po[2] - 410.5) < 0.6 && (await t.dim(A)) === 'minecraft:jailbreak', `${po} ${await info(A)}`)

    // ---- review fixes (2026-10-15): a free player who never finished the course (joined before the prison ran) can
    // stop a replay too; a stop in the 2 s while Rusty talks gives no knife after it; the C4 comes back, but not into the
    // hand held now (it wasn't held then); a job's stash whose job is gone (it ended during the replay) stays gone.
    await cmd(`zzdata ${A} jail-course none`)
    a2.setQuickBarSlot(1)
    await sleep(400)
    await cmd(`zzjail ${A} give c4 1`)
    await cmd(`zzjail ${A} give stash 1`)
    await sleep(300)
    const items3 = field(await info(A), 'items')
    check('...setup: the C4 in hotbar 1 (slot 0, not the held slot 1), a stash with no job', /c4:0x1/.test(items3) && /stash:/.test(items3), items3)
    since = Date.now()
    a2.chat('/tutorial')
    check('/tutorial for a free player who never did the course: the confirm and stop offer, not "You\'ve done the course"', await until(() => said(a2, /tutorial stop/, since), 3000) && !said(a2, /You've done the course/, since), t.text(a2, since))
    a2.chat('/tutorial confirm')
    const rp3 = await until(async () => field(await info(A), 'state') === 'course', 3000)
    check('...confirm saves the replay for them (state out)', rp3 && /= out$/.test(await cmd(`zzdata ${A} jail-replay::state`)), await cmd(`zzdata ${A} jail-replay::state`))
    await cmd(`zzjail ${A} step boiler`)
    since = Date.now()
    await tp(A, 76.5, 58, 77.5, -90)
    const rusty3 = await until(() => said(a2, /Took you long enough/, since), 3000, 50)
    const rustyAt = Date.now()
    a2.setQuickBarSlot(0)
    a2.chat('/tutorial stop')
    const freed3 = await until(async () => field(await info(A), 'state') === 'out', 1500, 100)
    const stopAt = Date.now()
    check('...Rusty starts talking, and /tutorial stop inside his 2 s works for them: free again', rusty3 && freed3 && stopAt - rustyAt < 1700, `${stopAt - rustyAt} ms | ${t.text(a2, since)} ${await info(A)}`)
    await sleep(3000)
    const wm3 = await cmd(`zzwm ${A}`)
    check('...no knife or "Hold the knife" after the stop (Rusty\'s wait ended without it)', !/Combat_Knife/.test(wm3) && !said(a2, /Here, a knife|Hold the knife/, stopAt), `${wm3} | ${t.text(a2, stopAt)}`)
    const items4 = field(await info(A), 'items')
    check('...the C4 back in hotbar 1-5 but not slot 0, now held (it wasn\'t held at confirm)', /c4:[1-4]x1/.test(items4) && a2.quickBarSlot === 0, `${items4} held=${a2.quickBarSlot}`)
    check('...the stash not back (its job isn\'t running)', !/stash/.test(items4), items4)
    await cmd(`zzjail ${A} strip`)
    a2.setQuickBarSlot(1)
    a2.chat('/tutorial confirm')
    await until(async () => field(await info(A), 'state') === 'course', 3000)
    await cmd('execute in minecraft:jailbreak run forceload add 256 400 271 415')
    await cmd('execute in minecraft:jailbreak run setblock 260 66 410 minecraft:stone')
    since = Date.now()
    a2.chat('/tutorial stop')
    const freed2 = await until(async () => field(await info(A), 'state') === 'out', 3000)
    const pu = await pos(A)
    await cmd('execute in minecraft:jailbreak run setblock 260 66 410 minecraft:air')
    await cmd('execute in minecraft:jailbreak run forceload remove 256 400 271 415')
    check('...with a block where its head was: free again at the lot exit, told the old spot isn\'t safe', freed2 && pu && Math.abs(pu[0] - 260.5) < 0.6 && Math.abs(pu[2] - 404.5) < 0.6 && said(a2, /isn't safe any more/, since), `${pu} ${t.text(a2, since)}`)
    await t.drop(A)

    // ---- B: a course bot at step cell logs out and back: its door opens 3 s after the join
    let b = await t.newBot(B, { fresh: true })
    await sleep(1500)
    s = await info(B)
    const bcell = field(s, 'cell')
    check('B: a first join at step cell', field(s, 'step') === 'cell' && COURSE_CELLS.includes(bcell), s)
    since = Date.now()
    b.chat('/tutorial stop')
    check('/tutorial stop for a first-timer: refused (the course is how everyone starts), still in the course', await until(() => said(b, /how everyone starts/, since), 3000) && field(await info(B), 'state') === 'course', t.text(b, since))
    await t.drop(B)
    await sleep(1500)
    b = await t.newBot(B)
    const j0 = Date.now()
    await sleep(1200)
    s = await info(B)
    const shut = !(await doorOpen(`cell_${bcell}`))
    const reopened = await until(() => doorOpen(`cell_${bcell}`), 4500)
    check('B rejoins at step cell in its cell: the door shut at first, open ~3 s after the join', field(s, 'state') === 'course' && shut && reopened && Date.now() - j0 >= 2500, `${s} after ${Date.now() - j0} ms`)

    // ---- B at step boiler logs out somewhere else: it rejoins at BOILER_IN
    await cmd(`zzjail ${B} step boiler`)
    await tp(B, 84.5, 58, 80.5, 180)
    await sleep(1500)
    await t.drop(B)
    await sleep(1500)
    b = await t.newBot(B)
    await sleep(1500)
    const bp = await pos(B)
    check('B at step boiler rejoins at BOILER_IN', bp && Math.abs(bp[0] - 61.5) < 0.6 && Math.abs(bp[2] - 80.5) < 0.6, `${bp}`)

    // ---- /tutorial confirm during the course: back to the step's spot with its prompt
    await tp(B, 84.5, 58, 80.5, 180)
    await sleep(3300)
    since = Date.now()
    b.chat('/tutorial')
    check('/tutorial during the course: the step and the confirm offer', await until(() => said(b, /tutorial confirm/, since), 3000))
    b.chat('/tutorial confirm')
    const backed = await until(async () => { const p = await pos(B); return p && Math.abs(p[0] - 61.5) < 0.6 && Math.abs(p[2] - 80.5) < 0.6 }, 3000)
    check('/tutorial confirm at step boiler: back at BOILER_IN with the prompt again', backed && await until(() => said(b, /Find a way through/, since), 2000), `${await pos(B)}`)

    // ---- B on B1's landing: pushed back to COURSE_PUSH
    await cmd(`zzjail ${B} step office`)
    await tp(B, 84.5, 58, 105.5, 0)
    const pushed = await until(async () => { const p = await pos(B); return p && Math.abs(p[2] - 97.5) < 0.6 }, 3000)
    check('a course bot on B1\'s landing is pushed back to COURSE_PUSH', pushed, `${await pos(B)}`)
    check('...with the hint', said(b, /That stair is the guards' way/))
  } finally {
    await t.prisonRestore()
    for (const n of [A, B]) {
      if (t.bots[n]) await cmd(`zzjail ${n} state off`)
    }
    await t.close()
  }
}
