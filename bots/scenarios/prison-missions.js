// The prison's inmates and their missions (jailjobs.sk, story.sk's lefty chain, quests.sk; ESCAPE-SPEC 6 and 7.2-6;
// owner, 2026-10-14: "NPCs with small missions for money or items: a one-time chain for new players, then short
// repeatable jobs"). The five givers stand after /djailjobs setup; Lefty's lessons for a course graduate, each paying
// once (meet him, a weapon from Sparks (2026-10-20: the GPS on the nearest weapon part, then on Sparks), a donut ("Hold
// right-click · Take a donut" at the counter), a C4 with the GPS on the nearest missing part and then on Lefty, who puts
// the three parts together, a keycard, the Prison Gun Shop (keycard-only since 2026-10-20, so after the keycard), the
// escape);
// an escape mid-chain finishes it; a veteran sent in by a death never gets it; Mara's chain only after the first escape
// (WELCOME TO THE CITY, the "broke out" brief); c1_knife completes silently for a bot holding the knife; Lefty's bar is
// blue; each job (Yard Run, Special Delivery, The Stash, Distraction) pays once and then waits; Rusty's donut trade
// through the bars (a keycard, then a C4 part); a calm /prison stuck keeps his wait, a catch clears it and fails a job.
// The job menus' icons are drawn by the pack (owner, 2026-10-15: "feather placeholder for lefty mission").
// Sparks (2026-10-20, the owner: "an npc that allows you to collect a couple items around the prison and give it to him
// to make a makeshift weapon (you can choose which one to make when interacting with him)"; the owner's answers: a part
// search isn't suspicious, a 3-minute wait a spot, kept until a death): his menu (the three weapons, each part ✔ or ✘
// with where it's found), the three search spots (the prompt, a marker, the 2 s hold, the wait, no act), the part that
// completes a recipe says so, a made Shiv (the weapon first, then the parts), refusals (one each, hotbar 1-5 full, from
// afar, while hunted), the old bench opening his menu, a rejoin and the city keeping it (the audit), the Gun Shop's
// hotbar mirror (throw away, moved aside, never in the Loadout tab), a catch taking it with the parts and the waits, an
// escape and /dprison free keeping it, a death taking it, a course player turned away, and the pack's art.
const fs = require('fs')
const path = require('path')
const { start, field, sleep } = require('../prisonlib')

const PACK = path.join(__dirname, '..', '..', 'pack', 'assets')
// A menu icon's look: its item and its custom model data string ("brick@donating:jail_yardrun"), else the item alone.
const art = i => {
  if (!i) return 'empty'
  const c = (i.components || []).find(x => x.type === 'custom_model_data')
  const s = c && c.data && c.data.strings ? c.data.strings[0] : ''
  return s ? `${i.name}@${s}` : i.name
}
// That look is jail art the pack draws (a case in brick.json and its texture).
const drawn = a => {
  const m = /^brick@donating:(jail_[a-z0-9]+)$/.exec(a)
  if (!m) return false
  const brick = JSON.parse(fs.readFileSync(path.join(PACK, 'minecraft', 'items', 'brick.json'), 'utf8'))
  return (brick.model.cases || []).some(c => c.when === `donating:${m[1]}`) && fs.existsSync(path.join(PACK, 'donating', 'textures', 'item', `${m[1]}.png`))
}

const M1 = 'PcMisA' // the whole chain, then Mara
const M2 = 'PcMisB' // an escape mid-chain (l_c4lot)
const M3 = 'PcMisC' // a veteran (no course), the jobs
const M5 = 'PcMisE' // Sparks and the makeshift weapons
// The pack draws the item (a case in the item's definition) and the model or texture exists.
const caseOf = (item, when) => {
  const d = JSON.parse(fs.readFileSync(path.join(PACK, 'minecraft', 'items', `${item}.json`), 'utf8'))
  return (d.model.cases || []).find(c => c.when === when)
}
const SPARKS = [49.5, 65, 49.5]
const SPARKS_STAND = [49.5, 65, 52.5, 180] // across the old bench
const BENCH = [49.5, 65, 51.5] // its click box (ASSEMBLE)
const SPARKS_FAR = [53.5, 65, 59.5, 0] // 11 blocks from him (questNear's 6)
// The weapon parts' search spots: their click boxes, where to stand, and where the glowing marker sits (jeMarkAt).
const SCRAP = { box: [47.5, 66, 160.5], stand: [47.5, 65, 159.5, 0], mark: [47.5, 67.2, 160.5] } // the gym's dumbbell rack (a heavy core)
const TAPE = { box: [78.5, 65, 227.5], stand: [77.5, 65, 227.5, -90], mark: [77.88, 65.5, 227.5] } // the storage room's east shelf barrel
const HANDLE = { box: [86.5, 65, 63.5], stand: [85.5, 65, 63.5, -90], mark: [86.5, 66.2, 63.5] } // a laundry cart
const LEFTY = [80.5, 65.5, 151.5]
const LEFTY_STAND = [82.5, 65, 151.5, 90]
const TANK = [181.5, 65, 156.5]
const TANK_STAND = [179.5, 65, 156.5, -90]
const WHISPER = [108.5, 65, 209.5]
const WHISPER_STAND = [110.5, 65, 209.5, 90]
const CAFE = [100.5, 66, 137.5]
const CAFE_STAND = [100.5, 65, 138.5, 180]
const RUSTY_TALK = [80.25, 58, 77.5]
const CORRIDOR = [81.5, 58, 77.5, 90]
const RUN = [[172.5, 65, 103.5], [238.5, 65, 103.5], [227.5, 65, 243.5], [140.5, 65, 240.5]]
const STASH = { STASH_1: [273.5, 65, 180.5], STASH_2: [238.5, 65, 94.5], STASH_3: [162.5, 65, 245.5], STASH_4: [190.5, 65, 318.5] }

module.exports = async ({ check }) => {
  const t = await start()
  const { cmd, info, into, state, jtp, bal, papi, said, until, hold, near, breach, walk } = t
  const story = async (n, c) => cmd(`dstory info ${n} ${c}`)
  const jobs = n => cmd(`djailjobs info ${n}`)
  const ready = (s, id) => Number((String(s).match(new RegExp(`${id}:(\\d+)`)) || [])[1] || -1)
  const talk = async (bot, at) => { const e = near(bot, 'mannequin', at); if (e) await bot.activateEntity(e).catch(() => {}); return !!e }
  const windowOpen = bot => new Promise(resolve => {
    const tm = setTimeout(() => resolve(null), 4000)
    bot.once('windowOpen', w => { clearTimeout(tm); resolve(w) })
  })
  const menu = async (bot, at) => { const o = windowOpen(bot); await talk(bot, at); return o }
  const closeWin = async bot => { if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(300) } }
  const donut = async (bot, n) => {
    await cmd(`zzdata ${n} jspot-ready::DONUT_CAFE none`)
    await jtp(n, ...CAFE_STAND)
    await until(async () => !!near(bot, 'interaction', CAFE, 1.2), 4000)
    await sleep(2000) // the "Hold right-click" prompt comes every 10 ticks (a "New mission" line holds the action bar 1.5 s)
    return hold(bot, CAFE, 1200, 1.2)
  }
  const gps = async n => cmd(`dphone gps ${n}`)
  const escape = async (bot, n) => {
    await into(n, 260.5, 65, 392.5, 0)
    // Shut first: an open gate ignores "open" (its clock keeps running), and the last escape's 15 s could end mid-walk.
    await breach('front', 'close')
    await breach('front', 'cool')
    await breach('front', 'open')
    await sleep(1200)
    await walk(bot, [[260.5, 400.5]], 3500)
    await until(async () => field(await info(n), 'state') === 'out', 3000)
  }
  try {
    await t.prisonOn()
    await t.copsBlind()
    // ---------- the givers ----------
    const setup = await cmd('djailjobs setup')
    const list = await cmd('dquest list')
    check('/djailjobs setup: Lefty, Rusty, Tank, Whisper and Sparks stand in the prison world', ['lefty', 'rusty', 'tank', 'whisper', 'sparks'].every(k => new RegExp(`${k}\\|: sparks|world`, 'i').test(list)), `${setup} | ${list.slice(0, 500)}`)
    const sparksN = (list.match(/QUEST (\d+): sparks\|world/) || [])[1]

    // ---------- M1: a course graduate gets Lefty's lessons; Mara waits for the first escape ----------
    const m1 = await t.newBot(M1, { fresh: true })
    await sleep(2500)
    await cmd(`dprison course ${M1} skip`)
    await into(M1, ...LEFTY_STAND)
    const started = await until(async () => /id=l_meet/.test(await story(M1, 'lefty')), 12000, 500)
    check('a course graduate: Lefty\'s chain starts (l_meet)', started, await story(M1, 'lefty'))
    check('...and Mara\'s doesn\'t (not before the first escape)', !/id=c1/.test(await story(M1, 'story')), await story(M1, 'story'))
    const blue = await until(() => m1.bars.some(b => /LEFTY/.test(b.text) && b.color === 'blue'), 6000)
    check('Lefty\'s boss bar is blue', blue, JSON.stringify(m1.bars.slice(-3)))
    let b0 = await bal(M1)
    let since = Date.now()
    check('Lefty stands on the Hall B bench (a mannequin the bot sees)', await talk(m1, LEFTY))
    // (2026-10-21, the owner's playtest: "talking to Lefty lets the player pick the escape way (C4, keycard, parkour, the
    // new lot fence) and his lessons follow it"; and the optional jobs as a head-start checklist. Untested (cloud).)
    const meet = await until(async () => /id=l_way/.test(await story(M1, 'lefty')), 16000, 500)
    check('talking to Lefty: his lines (the dugout too), l_meet passes (+$50, next l_way: pick your way out)', meet && said(m1, /Nobody stays in here forever/, since) && said(m1, /Dig under it/, since) && (await bal(M1)) === b0 + 50, `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0}`)
    await sleep(1500)
    b0 = await bal(M1)
    const wm = await menu(m1, LEFTY)
    const wayNames = wm ? [10, 12, 14, 16].map(i => JSON.stringify(wm.slots[i] || '')) : []
    check('l_way: talking to Lefty opens his menu: C4, a keycard, the parkour, the dugout, and the head start 0/5', wm && /C4/.test(wayNames[0]) && /keycard/.test(wayNames[1]) && /fence by the Gun Shop/.test(wayNames[2]) && /Dig under/.test(wayNames[3]) && /Head start/.test(JSON.stringify(wm.slots[22] || '')) && /"0\/5"/.test(JSON.stringify(wm.slots[22] || '')), `${wm ? [10, 12, 14, 16, 22].map(i => `${i}:` + [...JSON.stringify(wm.slots[i] || '').matchAll(/"value":"([^"]{3,})"/g)].map(m => m[1]).filter(v => !/^(dark_gray|red|gray|yellow|aqua|green|gold|white)$/.test(v)).join('~')).join(' / ') : 'no menu'}`)
    if (wm) m1.clickWindow(10, 0, 0).catch(() => {})
    const way = await until(async () => /id=l_c4/.test(await story(M1, 'lefty')), 8000, 500)
    check('...picking C4: l_way passes (+$50), next l_c4 (data lefty-way = c4)', way && (await bal(M1)) === b0 + 50 && /= c4$/.test(await cmd(`zzdata ${M1} lefty-way`)), `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0} ${await cmd(`zzdata ${M1} lefty-way`)}`)
    await closeWin(m1)
    // A change of mind: the keycard (l_card, no second pay for l_way), then C4 again (l_c4).
    await sleep(1200)
    b0 = await bal(M1)
    const wm2 = await menu(m1, LEFTY)
    if (wm2) m1.clickWindow(12, 0, 0).catch(() => {})
    const toCard = await until(async () => /id=l_card/.test(await story(M1, 'lefty')), 6000, 500)
    await closeWin(m1)
    await sleep(1200)
    const wm3 = await menu(m1, LEFTY)
    if (wm3) m1.clickWindow(10, 0, 0).catch(() => {})
    const toC4 = await until(async () => /id=l_c4/.test(await story(M1, 'lefty')), 6000, 500)
    await closeWin(m1)
    check('...another way in his menu restarts his lessons at that way\'s first (l_card), and back (l_c4), paying nothing twice', toCard && toC4 && (await bal(M1)) === b0, `${toCard} ${toC4} ${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0}`)
    // A head-start job: a weapon from Sparks (the scrap and the tape, his Shiv): "Head start 1/5", in /prison too.
    for (const sp of ['SEARCH_SCRAP', 'SEARCH_TAPE', 'SEARCH_HANDLE']) await cmd(`zzdata ${M1} jspot-ready::${sp} none`)
    await cmd(`zzjail ${M1} give scrap`)
    await cmd(`zzjail ${M1} give tape`)
    await jtp(M1, ...SPARKS_STAND)
    await until(() => !!near(m1, 'mannequin', SPARKS, 1.5), 6000)
    await sleep(800)
    since = Date.now()
    const sw1 = await menu(m1, SPARKS)
    if (sw1) m1.clickWindow(11, 0, 0).catch(() => {})
    const crafted = await until(async () => /=Shiv:/.test(await cmd(`zzwm ${M1}`)), 6000, 500)
    await closeWin(m1)
    m1.chat('/prison')
    await sleep(800)
    check('...Sparks makes a Shiv: a head-start job ticked ("Head start 1/5"), in /prison too, the lesson still l_c4', crafted && said(m1, /Head start 1\/5/, since) && /id=l_c4/.test(await story(M1, 'lefty')), `${t.text(m1, since).slice(0, 400)} | ${await story(M1, 'lefty')}`)
    // The Shiv out of hotbar 1-5 again (the C4 below needs the room).
    for (const sl of [0, 1, 2, 3, 4]) await cmd(`minecraft:item replace entity ${M1} hotbar.${sl} with minecraft:air`)
    // l_c4: the GPS on the nearest part the bot lacks, then on Lefty, who puts it together (from Lefty's spot: the
    // wires, then the timer; at Sparks the putty would be nearest).
    await jtp(M1, ...LEFTY_STAND)
    await sleep(2000)
    const g1 = await gps(M1)
    await cmd(`zzjail ${M1} give wires`)
    await sleep(2500)
    const g2 = await gps(M1)
    check('l_c4: the GPS leads to the nearest missing part (the supply closet), then the next (the infirmary)', /target=81(\.\d+)?,65(\.\d+)?,90/.test(g1) && /target=81(\.\d+)?,66(\.\d+)?,230/.test(g2), `${g1} | ${g2}`)
    await cmd(`zzjail ${M1} give putty`)
    await cmd(`zzjail ${M1} give timer`)
    await sleep(2500)
    const g3 = await gps(M1)
    check('...with all three parts: Lefty (he puts it together)', /target=80(\.\d+)?,65(\.\d+)?,151/.test(g3), g3)
    b0 = await bal(M1)
    await jtp(M1, ...LEFTY_STAND)
    await sleep(1500)
    since = Date.now()
    await talk(m1, LEFTY)
    const c4 = await until(async () => /id=l_c4lot/.test(await story(M1, 'lefty')), 8000, 500)
    check('the three parts to Lefty: a C4 back, l_c4 passes (+$100), next l_c4lot (blow the gate, into the lot)', c4 && (await bal(M1)) === b0 + 100 && /c4:/.test(field(await info(M1), 'items')) && !/(putty|wires|timer):/.test(field(await info(M1), 'items')) && said(m1, /Give me those/, since), `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0} ${await info(M1)}`)
    await cmd(`zzjail ${M1} strip`)
    b0 = await bal(M1)
    await into(M1, 210.5, 65, 335.5, 0)
    const inLot = await until(async () => /id=l_out/.test(await story(M1, 'lefty')), 8000, 500)
    check('in the lot: l_c4lot passes (+$100), next the escape (l_out)', inLot && (await bal(M1)) === b0 + 100, `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0} ${await info(M1)}`)
    b0 = await bal(M1)
    const xp0 = Number(((await cmd(`zzdata ${M1} level-xp`)).match(/= (\d+)/) || [])[1] || 0)
    since = Date.now()
    await escape(m1, M1)
    const out = await until(async () => /id=done/.test(await story(M1, 'lefty')), 10000, 500)
    const xp1 = Number(((await cmd(`zzdata ${M1} level-xp`)).match(/= (\d+)/) || [])[1] || 0)
    check('the escape: l_out passes (+$250, +50 XP), the chain done', out && (await bal(M1)) === b0 + 250 && xp1 - xp0 >= 50, `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0} xp ${xp0} -> ${xp1}`)
    const mara = await until(async () => /id=c1_meet/.test(await story(M1, 'story')), 10000, 500)
    await until(() => said(m1, /WELCOME TO THE CITY/, since), 8000) // 4 s after the escape, where it stands (the : sparks|world world)
    check('...then Mara\'s chain starts (c1_meet) with WELCOME TO THE CITY and the "broke out" brief', mara && said(m1, /WELCOME TO THE CITY/, since) && said(m1, /Heard you broke out/, since), `${await story(M1, 'story')} ${t.text(m1, since).slice(0, 300)}`)
    // c1_knife: a state|weapon mission, done at once for a bot holding the knife.
    await cmd(`zzjail ${M1} own Combat_Knife`)
    await cmd(`wm give ${M1} Combat_Knife 1 {slot:0}`)
    m1.setQuickBarSlot(0)
    await sleep(800)
    await cmd(`dstory set ${M1} c1_knife`)
    const knife = await until(async () => { const s = await story(M1, 'story'); return /id=\S+/.test(s) && !/id=c1_knife/.test(s) }, 10000, 500)
    check('c1_knife completes silently for a bot holding the knife', knife, await story(M1, 'story'))

    // ---------- M1 replays the tutorial (owner, 2026-10-20: "when the player does the tutorial again, the tutorial npcs
    // go back to the quests they give for the tutorial"): Lefty's lessons start over and pay nothing twice; the sidebar
    // shows the quest that's on (Mara's out here, Lefty's inside: "make the active quest and step show up instead of the
    // current 'Meet Mara'"); no Jobs line in the jail ("dont show /jobs in the leaderboard until the player escapes") ----------
    await cmd(`djobs empty ${M1} boss`)
    await sleep(1500)
    const sideOut = await papi(M1, 'donating_mission')
    const jobsOut = await papi(M1, 'donating_jobs')
    check('free: the sidebar\'s quest line is Mara\'s mission ("▶ Mara: ..."), and the Jobs line shows', /Mara: /.test(sideOut) && /Jobs/.test(jobsOut), `${sideOut} | ${jobsOut}`)
    since = Date.now()
    m1.chat('/tutorial confirm')
    const rp = await until(async () => field(await info(M1), 'state') === 'course', 4000)
    check('M1 replays the course: Lefty\'s lessons start over (/tutorial stop would put back "done")', rp && /id= /.test(await story(M1, 'lefty')) && /= done$/.test(await cmd(`zzdata ${M1} jail-replay::chain::lefty::id`)), `${await info(M1)} | ${await story(M1, 'lefty')}`)
    // Both lines are copied once a second by different passes: wait for both (the quest line came a pass later once).
    const jobsIn = await until(async () => (await papi(M1, 'donating_jobs')) === '' && /Tutorial: /.test(await papi(M1, 'donating_mission')), 4000)
    check('...a prisoner again: no Jobs line (empty: TAB drops it), the sidebar on the course', jobsIn, `${await papi(M1, 'donating_jobs')} | ${await papi(M1, 'donating_mission')}`)
    await cmd(`dprison course ${M1} skip`)
    await into(M1, ...LEFTY_STAND)
    const again = await until(async () => /id=l_meet/.test(await story(M1, 'lefty')), 12000, 500)
    check('the course done again: Lefty\'s lessons back at l_meet, told it\'s a replay that pays nothing', again && await until(() => said(m1, /Replay.*pays nothing this time/, since), 3000), `${await story(M1, 'lefty')} | ${t.text(m1, since).slice(0, 300)}`)
    const sideJail = await until(async () => /Lefty: .*Hall B bench/.test(await papi(M1, 'donating_mission')), 3000)
    check('...the sidebar shows Lefty\'s lesson, not Mara\'s mission (hers still runs), and still no Jobs line', sideJail && /id=c\d/.test(await story(M1, 'story')) && (await papi(M1, 'donating_jobs')) === '', `${await papi(M1, 'donating_mission')} | ${await story(M1, 'story')} | ${await papi(M1, 'donating_jobs')}`)
    await sleep(1500)
    b0 = await bal(M1)
    since = Date.now()
    await talk(m1, LEFTY)
    const met = await until(async () => /id=l_way/.test(await story(M1, 'lefty')), 16000, 500)
    check('talking to Lefty again: his lines, l_meet passes with no money ("a replay: no rewards")', met && said(m1, /Nobody stays in here forever/, since) && (await bal(M1)) === b0 && said(m1, /a replay: no rewards/, since), `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0} | ${t.text(m1, since).slice(0, 300)}`)
    // Review fix (2026-10-20): freed without escaping (staff /dprison free) with a lesson still running and followed:
    // the sidebar and the GPS skip Lefty's prison lesson (story.sk questFreeOk) and show Mara's mission.
    await cmd(`zzdatatext ${M1} quest-track lefty`)
    await cmd(`dprison free ${M1}`)
    const sideFree = await until(async () => /Mara: /.test(await papi(M1, 'donating_mission')), 4000)
    await sleep(1500)
    const gFree = await gps(M1)
    check('freed by staff mid-lesson (l_way, tracked): the sidebar shows Mara\'s mission, the GPS isn\'t on Lefty', sideFree && /id=l_way/.test(await story(M1, 'lefty')) && !/target=80(\.\d+)?,65(\.\d+)?,151/.test(gFree), `${await papi(M1, 'donating_mission')} | ${await story(M1, 'lefty')} | ${gFree}`)
    // Review fix (2026-10-20): a replay ended by staff (/dprison state in) instead of /tutorial stop or finishing puts the
    // quests back (jailcourse.sk jcReplayStale, from the story pass): Lefty's lesson and the tracked quest as they were,
    // never his lessons from the start ("New fish?").
    since = Date.now()
    m1.chat('/tutorial confirm')
    const rp2 = await until(async () => field(await info(M1), 'state') === 'course', 4000)
    const reset2 = /id= /.test(await story(M1, 'lefty')) && /= l_way$/.test(await cmd(`zzdata ${M1} jail-replay::chain::lefty::id`))
    await cmd(`dprison state ${M1} in`)
    const back = await until(async () => /id=l_way/.test(await story(M1, 'lefty')), 5000, 500)
    await sleep(1500)
    check('a replay ended by /dprison state in: Lefty\'s lesson back at l_way (not l_meet), still followed, the saved data gone', rp2 && reset2 && back && /id=l_way/.test(await story(M1, 'lefty')) && /= lefty$/.test(await cmd(`zzdata ${M1} quest-track`)) && /= <none>/.test(await cmd(`zzdata ${M1} jail-replay::state`)) && !said(m1, /New fish\?/, since), `${rp2} ${reset2} | ${await story(M1, 'lefty')} | ${await cmd(`zzdata ${M1} quest-track`)} | ${await cmd(`zzdata ${M1} jail-replay::state`)} | ${t.text(m1, since).slice(0, 300)}`)
    await state(M1, 'off')

    // ---------- M2: an escape mid-chain (the C4 way, at l_c4lot) finishes the chain (l_out paid) ----------
    const m2 = await t.newBot(M2, { fresh: true })
    await sleep(2500)
    await cmd(`dprison course ${M2} skip`)
    await into(M2, 205.5, 65, 160.5, 0)
    await until(async () => /id=l_meet/.test(await story(M2, 'lefty')), 12000, 500)
    await cmd(`zzdatatext ${M2} lefty-way c4`)
    await cmd(`dstory set ${M2} l_c4lot`)
    await sleep(1500)
    b0 = await bal(M2)
    t.logs.prison.mark()
    await escape(m2, M2)
    const fin = await until(async () => /id=done/.test(await story(M2, 'lefty')), 12000, 500)
    // The escape crosses the lot first, so l_c4lot may pay its $100 before l_out's $250.
    check('an escape during l_c4lot finishes Lefty\'s chain: l_out paid (+$250; l_c4lot\'s $100 too when the way out crossed the lot)', fin && [b0 + 250, b0 + 350].includes(await bal(M2)), `${await story(M2, 'lefty')} bal ${await bal(M2)} vs ${b0}`)
    // Replayed: l_meet, skipped (never paid: the staff set and the escape jumped past it), pays the first time.
    await sleep(1500)
    since = Date.now()
    m2.chat('/tutorial confirm')
    await until(async () => field(await info(M2), 'state') === 'course', 4000)
    await cmd(`dprison course ${M2} skip`)
    await into(M2, ...LEFTY_STAND)
    await until(async () => /id=l_meet/.test(await story(M2, 'lefty')), 12000, 500)
    await sleep(1500)
    b0 = await bal(M2)
    await talk(m2, LEFTY)
    const m2met = await until(async () => /id=l_way/.test(await story(M2, 'lefty')), 16000, 500)
    check('M2 replays: l_meet (never paid before) pays the first time (+$50), with no "replay" note', m2met && (await bal(M2)) === b0 + 50 && !said(m2, /pays nothing this time|a replay: no rewards/, since), `${await story(M2, 'lefty')} bal ${await bal(M2)} vs ${b0} | ${t.text(m2, since).slice(0, 300)}`)
    await state(M2, 'off')

    // ---------- M3: a veteran sent in by a death never gets the chain ----------
    const m3 = await t.newBot(M3)
    await sleep(1500)
    await cmd(`zzclear ${M3}`)
    await cmd(`zzdata ${M3} jail-course none`)
    await cmd(`zzctreset ${M3}`)
    await cmd(`djailjobs ready ${M3}`)
    await state(M3, 'out')
    await cmd(`execute in minecraft:overworld run minecraft:tp ${M3} 0.5 120 0.5`)
    await sleep(6000)
    await cmd(`minecraft:kill ${M3}`)
    await until(async () => (await t.dim(M3)) === 'minecraft:overworld', 8000)
    await sleep(7000)
    check('a veteran sent in by a death (no course): no Lefty chain', field(await info(M3), 'state') === 'in' && !/id=l_/.test(await story(M3, 'lefty')), `${await info(M3)} ${await story(M3, 'lefty')}`)

    // ---------- Rusty's donut trade through the bars: a keycard, then a C4 part ----------
    await cmd(`zzjail ${M3} give donut`)
    await into(M3, ...CORRIDOR)
    await until(async () => !!near(m3, 'interaction', RUSTY_TALK, 1), 4000)
    since = Date.now()
    await t.hold(m3, RUSTY_TALK, 200, 1)
    await sleep(1500)
    let p = await info(M3)
    let j = await jobs(M3)
    check('Rusty through the bars with a donut: a keycard, "Ahh. Here.", his 10-minute wait', said(m3, /Ahh\. Here\./, since) && /keycard:/.test(field(p, 'items')) && !/donut:/.test(field(p, 'items')) && ready(j, 'donut') > 500, `${p} ${j}`)
    // A calm /prison stuck keeps his wait (it takes nothing); a real catch clears it.
    since = Date.now()
    m3.chat('/prison stuck')
    await sleep(3000)
    j = await jobs(M3)
    check('a calm /prison stuck: the keycard kept, Rusty\'s wait kept', /keycard:/.test(field(await info(M3), 'items')) && ready(j, 'donut') > 500, `${await info(M3)} ${j}`)
    await sleep(1000)
    await cmd(`dprison catch ${M3}`)
    await sleep(2500)
    j = await jobs(M3)
    check('a real catch clears Rusty\'s wait', ready(j, 'donut') === 0, j)
    await cmd(`zzjail ${M3} give keycard`)
    await cmd(`zzjail ${M3} give donut`)
    await into(M3, ...CORRIDOR)
    await until(async () => !!near(m3, 'interaction', RUSTY_TALK, 1), 4000)
    since = Date.now()
    await t.hold(m3, RUSTY_TALK, 200, 1)
    await sleep(1500)
    p = await info(M3)
    check('...a second trade with a keycard already carried: a C4 part', said(m3, /Ahh\. Here\./, since) && /(putty|wires|timer):/.test(field(p, 'items')), p)
    await cmd(`zzjail ${M3} strip`)

    // ---------- the jobs ----------
    // The Yard Run (Lefty, after his lessons: M3 never had them).
    await into(M3, ...LEFTY_STAND)
    await sleep(1500)
    let w = await menu(m3, LEFTY)
    check('Lefty\'s job menu: the Yard Run, a running shoe the pack draws (not a plain feather)', w && /Lefty/.test(JSON.stringify(w.title)) && art(w.slots[13]) === 'brick@donating:jail_yardrun' && drawn(art(w.slots[13])), w ? `${art(w.slots[13])} ${JSON.stringify(w.slots[13]).slice(0, 200)}` : 'no window')
    if (w) m3.clickWindow(13, 0, 0).catch(() => {})
    await sleep(1200)
    j = await jobs(M3)
    check('...taken: the GPS on mark 1', field(j, 'job') === 'yardrun' && /^172\.5,65,103\.5/.test(field(j, 'qt')), j)
    const sideJob = await until(async () => /Yard Run: .*To mark 1 .*\d:\d\d/.test(await papi(M3, 'donating_mission')), 3000)
    check('...and the sidebar\'s quest line is the job: "▶ Yard Run: To mark 1 · 4:59"', sideJob, await papi(M3, 'donating_mission'))
    b0 = await bal(M3)
    for (const r of RUN) { await jtp(M3, ...r); await sleep(900) }
    await sleep(800)
    j = await jobs(M3)
    check('...the 4 marks in order: +$150 once, then a 10-minute wait', (await bal(M3)) === b0 + 150 && field(j, 'job') === '' && ready(j, 'yardrun') > 500, `${j} bal ${await bal(M3)} vs ${b0}`)
    await jtp(M3, ...LEFTY_STAND)
    await sleep(1200)
    w = await menu(m3, LEFTY)
    since = Date.now()
    if (w) m3.clickWindow(13, 0, 0).catch(() => {})
    await sleep(1200)
    check('...taking it again: refused ("Again in")', said(m3, /Again in/, since) && field(await jobs(M3), 'job') === '')
    await closeWin(m3)
    // Special Delivery (Whisper): a note to another inmate.
    await jtp(M3, ...WHISPER_STAND)
    await sleep(1500)
    w = await menu(m3, WHISPER)
    const wa = w ? [art(w.slots[12]), art(w.slots[14])] : []
    check('Whisper\'s job menu: Special Delivery the note, The Stash the stash (both drawn by the pack)', wa[0] === 'brick@donating:jail_note' && wa[1] === 'brick@donating:jail_stash' && wa.every(drawn), wa.join(' / ') || 'no window')
    if (w) m3.clickWindow(12, 0, 0).catch(() => {})
    await sleep(1200)
    j = await jobs(M3)
    const target = field(j, 'target')
    check('Special Delivery (Whisper): a note, a receiver, the GPS on them', field(j, 'job') === 'delivery' && /note:/.test(field(await info(M3), 'items')) && ['lefty', 'rusty', 'tank'].includes(target) && !!field(j, 'qt'), j)
    await closeWin(m3)
    b0 = await bal(M3)
    since = Date.now()
    if (target === 'rusty') {
      await jtp(M3, ...CORRIDOR)
      await until(async () => !!near(m3, 'interaction', RUSTY_TALK, 1), 4000)
      await t.hold(m3, RUSTY_TALK, 200, 1)
    } else {
      const g = target === 'lefty' ? [LEFTY, LEFTY_STAND] : [TANK, TANK_STAND]
      await jtp(M3, ...g[1])
      await sleep(1500)
      await talk(m3, g[0])
    }
    await sleep(1500)
    j = await jobs(M3)
    check(`...the note to ${target}: +$150 once, the note gone, a 10-minute wait`, (await bal(M3)) === b0 + 150 && !/note:/.test(field(await info(M3), 'items')) && ready(j, 'delivery') > 500 && said(m3, /Job done: Special Delivery/, since), `${j} bal ${await bal(M3)} vs ${b0}`)
    // The Stash (Whisper): dig it up, bring it back: a keycard.
    await jtp(M3, ...WHISPER_STAND)
    await sleep(1500)
    w = await menu(m3, WHISPER)
    if (w) m3.clickWindow(14, 0, 0).catch(() => {})
    await sleep(1200)
    j = await jobs(M3)
    const SP = STASH[field(j, 'target')]
    check('The Stash (Whisper): a spot, the GPS search area on it', field(j, 'job') === 'stash' && !!SP && !!field(j, 'qt'), j)
    await closeWin(m3)
    if (SP) {
      await jtp(M3, SP[0] + 1.5, SP[1], SP[2], 90)
      await until(async () => !!near(m3, 'interaction', SP, 1), 4000)
      await hold(m3, SP, 2800, 1)
      await sleep(500)
      check('...dug up (hold 2 s): the stash in the pockets', /step=back/.test(await jobs(M3)) && /stash:/.test(field(await info(M3), 'items')), await jobs(M3))
      await jtp(M3, ...WHISPER_STAND)
      await sleep(1500)
      since = Date.now()
      await talk(m3, WHISPER)
      await sleep(1500)
      j = await jobs(M3)
      p = await info(M3)
      check('...brought to Whisper: a keycard, the stash gone, a 15-minute wait', /keycard:/.test(field(p, 'items')) && !/stash:/.test(field(p, 'items')) && ready(j, 'stash') > 800 && said(m3, /Here's your cut/, since), `${j} ${p}`)
    }
    await cmd(`zzjail ${M3} strip`)
    // Distraction (Tank): get hunted, then calm without a catch: $200 and a C4 part.
    await jtp(M3, ...TANK_STAND)
    await sleep(1500)
    w = await menu(m3, TANK)
    if (w) m3.clickWindow(13, 0, 0).catch(() => {})
    await sleep(1200)
    check('Distraction (Tank): taken (step heat)', field(await jobs(M3), 'job') === 'distraction' && field(await jobs(M3), 'step') === 'heat', await jobs(M3))
    await closeWin(m3)
    await cmd(`zzjail ${M3} hostile`)
    const lose = await until(async () => /step=lose/.test(await jobs(M3)), 3000)
    b0 = await bal(M3)
    await cmd(`zzjail ${M3} calm`)
    await sleep(2500)
    j = await jobs(M3)
    check('...hunted ("Now lose them"), then calm with no catch: +$200 and a C4 part, a 15-minute wait', lose && (await bal(M3)) === b0 + 200 && /(putty|wires|timer):/.test(field(await info(M3), 'items')) && ready(j, 'distraction') > 800, `${j} bal ${await bal(M3)} vs ${b0} ${await info(M3)}`)
    // A catch fails an active job.
    await cmd(`zzjail ${M3} strip`)
    await cmd(`djailjobs ready ${M3}`)
    await jtp(M3, ...WHISPER_STAND)
    await sleep(1500)
    w = await menu(m3, WHISPER)
    if (w) m3.clickWindow(12, 0, 0).catch(() => {})
    await sleep(1200)
    await closeWin(m3)
    since = Date.now()
    await cmd(`dprison catch ${M3}`)
    await sleep(2500)
    j = await jobs(M3)
    check('a catch fails an active job ("The job\'s off"), no wait, the note gone', field(j, 'job') === '' && ready(j, 'delivery') === 0 && said(m3, /The job's off/, since) && !/note:/.test(field(await info(M3), 'items')), j)
    await state(M3, 'off')

    // ---------- M5: Sparks and the makeshift weapons (owner, 2026-10-20) ----------
    const itemText = i => (i ? JSON.stringify(i) : '')
    const comp = (i, type) => i && (i.components || []).find(x => x.type === type)
    const floatOf = i => { const c = comp(i, 'custom_model_data'); return c && c.data && c.data.floats ? c.data.floats[0] : null }
    const glints = i => Boolean(comp(i, 'enchantment_glint_override'))
    const wm5 = () => cmd(`zzwm ${M5}`)
    const shivSlot = s => Number((String(s).match(/(?:^WM |\| )([0-4])=Shiv:/) || [])[1] ?? -1)
    const items5 = async () => field(await info(M5), 'items')
    const sparksMenu = async () => { await closeWin(m5); const w = await menu(m5, SPARKS); await sleep(300); return w }
    const readyIn = async s => Number(((await cmd(`zzdata ${M5} jspot-ready::${s}`)).match(/= (\d+)/) || [])[1] || 0) - Math.floor(Date.now() / 1000)
    let m5 = await t.newBot(M5)
    await sleep(1500)
    await cmd(`zzclear ${M5}`)
    for (const s of ['SEARCH_SCRAP', 'SEARCH_TAPE', 'SEARCH_HANDLE']) await cmd(`zzdata ${M5} jspot-ready::${s} none`)
    await into(M5, ...SPARKS_STAND)
    await until(() => !!near(m5, 'mannequin', SPARKS, 1.5), 6000)
    check('Sparks stands behind the workshop\'s old bench (a mannequin the bot sees)', !!near(m5, 'mannequin', SPARKS, 1.5) && !!sparksN, `giver ${sparksN}`)
    let sw = await sparksMenu()
    const shards = sw ? [11, 13, 15].map(s => `${sw.slots[s] && sw.slots[s].name}@${floatOf(sw.slots[s])}`) : []
    check('talking to Sparks: "Sparks · Makeshift", the Shiv, the Mop Spear and the Taped Club (amethyst shards 8, 9, 10) at 11, 13, 15', sw && /Sparks · Makeshift/.test(JSON.stringify(sw.title)) && shards.join() === 'amethyst_shard@8,amethyst_shard@9,amethyst_shard@10', sw ? `${JSON.stringify(sw.title)} ${shards.join()}` : 'no window')
    const shiv0 = sw ? itemText(sw.slots[11]) : ''
    check('...no parts: each one ✘ with where it\'s found (the Shiv: the gym\'s weights, the storage room), no "Click: make it", its details (Weapon Statistics)', /✘ Scrap Metal/.test(shiv0) && /the gym's weights/.test(shiv0) && /✘ Duct Tape/.test(shiv0) && /the storage room/.test(shiv0) && !/Click: make it/.test(shiv0) && /Weapon Statistics/.test(shiv0) && !glints(sw && sw.slots[11]), shiv0.slice(0, 600))
    since = Date.now()
    if (sw) m5.clickWindow(11, 0, 0).catch(() => {})
    await sleep(1200)
    check('...a click makes nothing ("Bring me the Scrap Metal and the Duct Tape.")', said(m5, /Bring me the Scrap Metal and the Duct Tape/, since) && shivSlot(await wm5()) < 0, `${t.text(m5, since).slice(0, 300)} | ${await wm5()}`)
    await closeWin(m5)

    // The parts: a 2 s hold at each spot; the wait is 3 minutes; not an act; the part that completes a recipe says so.
    since = Date.now()
    await jtp(M5, ...SCRAP.stand)
    await until(async () => !!near(m5, 'interaction', SCRAP.box, 1.2), 4000)
    await sleep(2000)
    const prompt = said(m5, /Hold right-click . Search here/, since)
    await hold(m5, SCRAP.box, 2800, 1.2)
    await sleep(500)
    let p5 = await info(M5)
    const rs = await readyIn('SEARCH_SCRAP')
    check('SEARCH_SCRAP (the gym\'s weights): "Hold right-click · Search here", a 2 s hold gives the Scrap Metal, the spot waits 3 minutes', prompt && /scrap:/.test(field(p5, 'items')) && rs >= 170 && rs <= 182, `prompt ${prompt} ready in ${rs}s | ${p5}`)
    check('...searching for a weapon part isn\'t an act the guards notice (the owner\'s answer): no "search" act', !/search/.test(field(p5, 'acts')), p5)
    await cmd(`zzjail ${M5} strip`)
    since = Date.now()
    await hold(m5, SCRAP.box, 600, 1.2)
    await sleep(500)
    check('...the same spot right away: refused ("Nothing here right now"), nothing given', said(m5, /Nothing here right now/, since) && !/scrap:/.test(await items5()), `${t.text(m5, since).slice(0, 300)} | ${await items5()}`)
    await cmd(`zzjail ${M5} give scrap`)
    since = Date.now()
    await jtp(M5, ...TAPE.stand)
    const tapeMark = await until(() => !!near(m5, 'item_display', TAPE.mark, 0.8), 6000)
    await until(async () => !!near(m5, 'interaction', TAPE.box, 1.2), 4000)
    await hold(m5, TAPE.box, 2800, 1.2)
    await sleep(500)
    check('SEARCH_TAPE (the storage room): its marker shows; a hold gives the Duct Tape, and with the scrap: "Sparks in the workshop can make you a Shiv"', tapeMark && /tape:/.test(await items5()) && said(m5, /Sparks in the workshop can make you a Shiv/, since), `marker ${tapeMark} | ${await items5()} | ${t.text(m5, since).slice(0, 300)}`)
    await jtp(M5, ...HANDLE.stand)
    const handleMark = await until(() => !!near(m5, 'item_display', HANDLE.mark, 0.8), 6000)
    await until(async () => !!near(m5, 'interaction', HANDLE.box, 1.2), 4000)
    await hold(m5, HANDLE.box, 2800, 1.2)
    await sleep(500)
    check('SEARCH_HANDLE (the laundry): its marker shows, a hold gives the Mop Handle', handleMark && /handle:/.test(await items5()), `marker ${handleMark} | ${await items5()}`)

    // The Shiv: the weapon first, then the parts (the handle stays).
    await jtp(M5, ...SPARKS_STAND)
    await sleep(1500)
    sw = await sparksMenu()
    const shiv1 = sw ? itemText(sw.slots[11]) : ''
    check('Sparks\' menu with the parts: the Shiv ✔ ✔, "Click: make it", glinting', /✔ Scrap Metal/.test(shiv1) && /✔ Duct Tape/.test(shiv1) && /Click: make it/.test(shiv1) && glints(sw && sw.slots[11]), shiv1.slice(0, 500))
    t.logs.jobs.mark()
    since = Date.now()
    if (sw) m5.clickWindow(11, 0, 0).catch(() => {})
    await sleep(1500)
    let w5 = await wm5()
    p5 = await info(M5)
    check('...a click: a WeaponMechanics Shiv in hotbar 1-5, the scrap and the tape taken, the handle kept, "craft" in jailjobs.log, Sparks\' line', shivSlot(w5) >= 0 && !/scrap:|tape:/.test(field(p5, 'items')) && /handle:/.test(field(p5, 'items')) && t.logs.jobs.has(new RegExp(`craft ${M5} \\S+ Shiv slot=\\d`)) && said(m5, /Sharp end out/, since), `${w5} | ${p5} | ${t.logs.jobs.since().slice(-200)}`)
    await cmd(`zzjail ${M5} give scrap`)
    await cmd(`zzjail ${M5} give tape`)
    sw = await sparksMenu()
    const shiv2 = sw ? itemText(sw.slots[11]) : ''
    since = Date.now()
    if (sw) m5.clickWindow(11, 0, 0).catch(() => {})
    await sleep(1200)
    w5 = await wm5()
    check('a second Shiv: the menu says "Carrying one", a click is refused ("You\'ve got a Shiv already"), the parts kept', /Carrying one/.test(shiv2) && said(m5, /You've got a Shiv already/, since) && /scrap:/.test(await items5()) && /tape:/.test(await items5()) && (w5.match(/=Shiv:/g) || []).length === 1, `${t.text(m5, since).slice(0, 300)} | ${w5} | ${await items5()}`)
    // Hotbar 1-5 full: the Mop Spear (handle + scrap) can't be made.
    const sh = shivSlot(w5)
    const others = [0, 1, 2, 3, 4].filter(s => s !== sh)
    const fillers = ['Combat_Knife', 'Baseball_Bat', 'Brass_Knuckles', 'Gold_Nunchucks']
    for (let i = 0; i < 4; i++) await cmd(`wm give ${M5} ${fillers[i]} 1 {slot:${others[i]}}`)
    sw = await sparksMenu()
    const spearFull = sw ? itemText(sw.slots[13]) : ''
    since = Date.now()
    if (sw) m5.clickWindow(13, 0, 0).catch(() => {})
    await sleep(1200)
    check('hotbar 1-5 full: the Mop Spear says "Hotbar 1-5 full", a click is refused ("Free a slot in hotbar 1-5"), the parts kept', /Hotbar 1-5 full/.test(spearFull) && said(m5, /Free a slot in hotbar 1-5/, since) && /handle:/.test(await items5()) && /scrap:/.test(await items5()) && !/=Mop_Spear:/.test(await wm5()), `${spearFull.slice(0, 300)} | ${t.text(m5, since).slice(0, 200)} | ${await wm5()}`)
    for (const s of others) await cmd(`minecraft:item replace entity ${M5} hotbar.${s} with minecraft:air`)
    await closeWin(m5)
    // Not from afar (a remote /dquest open), not while hunted.
    await jtp(M5, ...SPARKS_FAR)
    await sleep(800)
    const far = windowOpen(m5)
    await cmd(`dquest open ${M5} ${sparksN}`)
    sw = await far
    since = Date.now()
    if (sw) m5.clickWindow(13, 0, 0).catch(() => {})
    await sleep(1200)
    check('his menu opened from 11 blocks away (/dquest open): a click is refused ("Talk to Sparks in person"), nothing made or taken', sw && said(m5, /Talk to Sparks in person/, since) && !/=Mop_Spear:/.test(await wm5()) && /handle:/.test(await items5()), `${sw ? 'menu' : 'no menu'} | ${t.text(m5, since).slice(0, 200)}`)
    await closeWin(m5)
    await jtp(M5, ...SPARKS_STAND)
    await sleep(1000)
    await cmd(`zzjail ${M5} hostile`)
    sw = await sparksMenu()
    since = Date.now()
    if (sw) m5.clickWindow(13, 0, 0).catch(() => {})
    await sleep(1200)
    check('...while the guards are after him: refused ("Not while the guards are after you")', said(m5, /Not while the guards are after you/, since) && !/=Mop_Spear:/.test(await wm5()), t.text(m5, since).slice(0, 200))
    await closeWin(m5)
    await cmd(`djailcops calm ${M5}`)
    await sleep(500)
    // The old bench opens his menu.
    const viaBench = windowOpen(m5)
    await hold(m5, BENCH, 200, 1.2)
    sw = await viaBench
    check('a click on the old workshop bench opens Sparks\' menu', sw && /Sparks · Makeshift/.test(JSON.stringify(sw.title)), sw ? JSON.stringify(sw.title) : 'no window')
    await closeWin(m5)
    // Kept through a relog, and outside the prison (the shop's audit leaves it: kept until a death).
    await t.drop(M5)
    await sleep(1500)
    m5 = await t.newBot(M5)
    await sleep(3000)
    check('a rejoin keeps the Shiv', shivSlot(await wm5()) >= 0, await wm5())
    const shopLog = require('../prisonlib').logTail('shop')
    await state(M5, 'out')
    await sleep(2500)
    await cmd(`zzjail ${M5} own Combat_Knife`)
    const shopOpen = windowOpen(m5)
    await cmd(`dshop open ${M5} gun`)
    sw = await shopOpen
    await sleep(500)
    w5 = await wm5()
    check('free and out of the prison, a shop opening (its audit) keeps the Shiv (never unlocked, kept until a death)', shivSlot(w5) >= 0 && !shopLog.has(/audit removed Shiv/), `${w5} | ${shopLog.since().slice(-200)}`)
    // The Gun Shop's hotbar mirror: "Click: throw away" (a second click), moved aside, never in the Loadout tab.
    const mirror = 11 + shivSlot(w5)
    const hint = sw ? itemText(sw.slots[mirror]) : ''
    const loadoutShiv = sw ? [19, 20, 21, 22, 23, 24, 25].some(s => /Shiv/.test(itemText(sw.slots[s]))) : true
    check('the Gun Shop\'s hotbar mirror: the Shiv says "Click: throw away" (never "take out"); the Loadout tab lists the Combat Knife, never the Shiv', /Click: throw away/.test(hint) && !/take out/.test(hint) && !loadoutShiv && /Combat Knife/.test(itemText(sw && sw.slots[19])), `${hint.slice(0, 200)} | 19: ${itemText(sw && sw.slots[19]).slice(0, 120)}`)
    m5.clickWindow(19, 0, 0).catch(() => {}) // select the Combat Knife
    await sleep(700)
    m5.clickWindow(mirror, 0, 0).catch(() => {}) // ...and put it on the Shiv's slot
    await sleep(900)
    w5 = await wm5()
    const knifeAt = Number((w5.match(/(?:^WM |\| )([0-4])=Combat_Knife:/) || [])[1] ?? -1)
    check('...the Combat Knife selected, a click on the Shiv\'s slot: the knife there, the Shiv moved aside (still in hotbar 1-5)', knifeAt === mirror - 11 && shivSlot(w5) >= 0 && shivSlot(w5) !== knifeAt, w5)
    const mirror2 = 11 + shivSlot(w5)
    m5.clickWindow(mirror2, 0, 0).catch(() => {})
    await sleep(900)
    const kept = shivSlot(await wm5()) >= 0
    m5.clickWindow(mirror2, 0, 0).catch(() => {})
    await sleep(900)
    check('...one click on the Shiv keeps it ("Click again"), a second throws it away', kept && shivSlot(await wm5()) < 0, await wm5())
    await closeWin(m5)

    // A catch takes it (hotbar 1-5), the parts and the waits; an escape and /dprison free keep it; a death takes it.
    await into(M5, ...SPARKS_STAND)
    await cmd(`wm give ${M5} Shiv 1 {slot:0}`)
    await cmd(`zzjail ${M5} give scrap`)
    await cmd(`zzjail ${M5} give handle`)
    const later = Math.floor(Date.now() / 1000) + 600
    for (const s of ['SEARCH_SCRAP', 'SEARCH_TAPE', 'SEARCH_HANDLE']) await cmd(`zzdata ${M5} jspot-ready::${s} ${later}`)
    await sleep(800)
    await cmd(`dprison catch ${M5}`)
    await sleep(2500)
    w5 = await wm5()
    const waits = []
    for (const s of ['SEARCH_SCRAP', 'SEARCH_TAPE', 'SEARCH_HANDLE']) waits.push(await readyIn(s))
    check('a catch: the Shiv gone (hotbar 1-5), the parts taken, every weapon part spot ready again', shivSlot(w5) < 0 && !/scrap:|handle:/.test(await items5()) && waits.every(x => x <= 0), `${w5} | ${await items5()} | waits ${waits.join(',')}`)
    await cmd(`wm give ${M5} Shiv 1 {slot:0}`)
    since = Date.now()
    await escape(m5, M5)
    w5 = await wm5()
    check('an escape keeps the Shiv (the owner: kept until you die)', field(await info(M5), 'state') === 'out' && shivSlot(w5) >= 0 && !said(m5, /left the makeshift weapon/, since), `${await info(M5)} | ${w5}`)
    await cmd(`minecraft:kill ${M5}`)
    await until(async () => field(await info(M5), 'state') === 'in', 8000)
    await sleep(2500)
    check('...a death takes it (back in the prison, empty-handed)', shivSlot(await wm5()) < 0, await wm5())
    await sleep(3000)
    await cmd(`wm give ${M5} Shiv 1 {slot:0}`)
    await cmd(`dprison free ${M5}`)
    await sleep(1500)
    check('/dprison free keeps it', field(await info(M5), 'state') === 'out' && shivSlot(await wm5()) >= 0, `${await info(M5)} | ${await wm5()}`)
    // A course player is turned away.
    await cmd(`zzjail ${M5} state course`)
    since = Date.now()
    await cmd(`dquest open ${M5} ${sparksN}`)
    await sleep(1000)
    check('a player still on the course: "You\'re not done down there yet." (no menu)', said(m5, /You're not done down there yet/, since) && !m5.currentWindow, t.text(m5, since).slice(0, 200))
    await state(M5, 'off')
    // The pack: shards 8-10 drawn as the three weapons (3D, the plain shard from 11), the parts and the guards' cuffs.
    const shardDef = JSON.parse(fs.readFileSync(path.join(PACK, 'minecraft', 'items', 'amethyst_shard.json'), 'utf8'))
    const entry = n => (shardDef.model.entries || []).find(e => e.threshold === n)
    const modelOf = e => e && e.model && e.model.model
    const models = [8, 9, 10].map(n => modelOf(entry(n)))
    const art3d = ['shiv', 'mop_spear', 'taped_club'].every(m => fs.existsSync(path.join(PACK, 'donating', 'models', 'item', `${m}.json`)))
    const parts = ['jail_scrap', 'jail_tape', 'jail_handle'].every(k => drawn(`brick@donating:${k}`))
    const cuffs = !!caseOf('brick', 'donating:jail_cuffs') && fs.existsSync(path.join(PACK, 'donating', 'models', 'item', 'jail_cuffs.json'))
    check('the pack: amethyst shards 8, 9, 10 draw the Shiv, the Mop Spear and the Taped Club (3D models), the plain shard from 11; the parts and the guards\' cuffs on brick', models.join() === 'donating:item/shiv,donating:item/mop_spear,donating:item/taped_club' && /amethyst_shard/.test(modelOf(entry(11)) || '') && art3d && parts && cuffs, `${models.join()} 11=${modelOf(entry(11))} 3d=${art3d} parts=${parts} cuffs=${cuffs}`)
  } finally {
    await breach('front', 'close')
    await t.prisonRestore()
    for (const n of [M1, M2, M3, M5]) if (t.bots[n]) await cmd(`zzjail ${n} state off`)
    await t.close()
  }
}
