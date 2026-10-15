// The prison's inmates and their missions (jailjobs.sk, story.sk's lefty chain, quests.sk; ESCAPE-SPEC 6 and 7.2-6;
// owner, 2026-10-14: "NPCs with small missions for money or items: a one-time chain for new players, then short
// repeatable jobs"). The four givers stand after /djailjobs setup; Lefty's lessons for a course graduate, each paying
// once (meet him, the Prison Gun Shop, a donut ("Hold right-click · Take a donut" at the counter), a C4 with the GPS on
// the nearest missing part and then on Lefty, who puts the three parts together, a keycard, the escape);
// an escape mid-chain finishes it; a veteran sent in by a death never gets it; Mara's chain only after the first escape
// (WELCOME TO THE CITY, the "broke out" brief); c1_knife completes silently for a bot holding the knife; Lefty's bar is
// blue; each job (Yard Run, Special Delivery, The Stash, Distraction) pays once and then waits; Rusty's donut trade
// through the bars (a keycard, then a C4 part); a calm /prison stuck keeps his wait, a catch clears it and fails a job.
const { start, field, sleep } = require('../prisonlib')

const M1 = 'PcMisA' // the whole chain, then Mara
const M2 = 'PcMisB' // an escape during l_shop
const M3 = 'PcMisC' // a veteran (no course), the jobs
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
  const { cmd, info, into, state, jtp, bal, said, until, hold, near, breach, walk } = t
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
    check('/djailjobs setup: Lefty, Rusty, Tank and Whisper stand in the prison world', ['lefty', 'rusty', 'tank', 'whisper'].every(k => new RegExp(`${k}[^\\n]*jailbreak`, 'i').test(list) || new RegExp(`Lefty|Rusty|Tank|Whisper`).test(setup)), `${setup} | ${list.slice(0, 400)}`)

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
    const meet = await until(async () => /id=l_shop/.test(await story(M1, 'lefty')), 16000, 500)
    check('talking to Lefty: his lines, l_meet passes (+$50, next l_shop)', meet && said(m1, /Nobody stays in here forever/, since) && (await bal(M1)) === b0 + 50, `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0}`)
    b0 = await bal(M1)
    await cmd(`dshop open ${M1} gun`)
    await sleep(1200)
    await closeWin(m1)
    const shop = await until(async () => /id=l_donut/.test(await story(M1, 'lefty')), 8000, 500)
    check('opening the Prison Gun Shop: l_shop passes (+$50)', shop && (await bal(M1)) === b0 + 50, `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0}`)
    since = Date.now()
    await donut(m1, M1)
    await sleep(600)
    check('a donut from the cafeteria counter (into the pockets), "Hold right-click · Take a donut" next to it', /donut:/.test(field(await info(M1), 'items')) && said(m1, /Hold right-click . Take a donut/, since), `${await info(M1)} ${t.text(m1, since)}`)
    await jtp(M1, ...LEFTY_STAND)
    await sleep(1500)
    b0 = await bal(M1)
    since = Date.now()
    await talk(m1, LEFTY)
    await sleep(400)
    await talk(m1, LEFTY)
    const dn = await until(async () => /id=l_c4/.test(await story(M1, 'lefty')), 8000, 500)
    check('the donut to Lefty: "Mm, chocolate.", l_donut passes once (+$75, one donut taken)', dn && said(m1, /Mm, chocolate/, since) && (await bal(M1)) === b0 + 75 && !/donut:/.test(field(await info(M1), 'items')), `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0} ${await info(M1)}`)
    // l_c4: the GPS on the nearest part the bot lacks, then on Lefty, who puts it together.
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
    const c4 = await until(async () => /id=l_card/.test(await story(M1, 'lefty')), 8000, 500)
    check('the three parts to Lefty: a C4 back, l_c4 passes (+$100)', c4 && (await bal(M1)) === b0 + 100 && /c4:/.test(field(await info(M1), 'items')) && !/(putty|wires|timer):/.test(field(await info(M1), 'items')) && said(m1, /Give me those/, since), `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0} ${await info(M1)}`)
    await cmd(`zzjail ${M1} strip`)
    b0 = await bal(M1)
    await cmd(`zzjail ${M1} give keycard`)
    const card = await until(async () => /id=l_out/.test(await story(M1, 'lefty')), 8000, 500)
    check('a keycard: l_card passes (+$100)', card && (await bal(M1)) === b0 + 100, `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0}`)
    b0 = await bal(M1)
    const xp0 = Number(((await cmd(`zzdata ${M1} level-xp`)).match(/= (\d+)/) || [])[1] || 0)
    since = Date.now()
    await escape(m1, M1)
    const out = await until(async () => /id=done/.test(await story(M1, 'lefty')), 10000, 500)
    const xp1 = Number(((await cmd(`zzdata ${M1} level-xp`)).match(/= (\d+)/) || [])[1] || 0)
    check('the escape: l_out passes (+$250, +50 XP), the chain done', out && (await bal(M1)) === b0 + 250 && xp1 - xp0 >= 50, `${await story(M1, 'lefty')} bal ${await bal(M1)} vs ${b0} xp ${xp0} -> ${xp1}`)
    const mara = await until(async () => /id=c1_meet/.test(await story(M1, 'story')), 10000, 500)
    await until(() => said(m1, /WELCOME TO THE CITY/, since), 8000) // 4 s after the escape, where it stands (the jailbreak world)
    check('...then Mara\'s chain starts (c1_meet) with WELCOME TO THE CITY and the "broke out" brief', mara && said(m1, /WELCOME TO THE CITY/, since) && said(m1, /Heard you broke out/, since), `${await story(M1, 'story')} ${t.text(m1, since).slice(0, 300)}`)
    // c1_knife: a state|weapon mission, done at once for a bot holding the knife.
    await cmd(`zzjail ${M1} own Combat_Knife`)
    await cmd(`wm give ${M1} Combat_Knife 1 {slot:0}`)
    m1.setQuickBarSlot(0)
    await sleep(800)
    await cmd(`dstory set ${M1} c1_knife`)
    const knife = await until(async () => { const s = await story(M1, 'story'); return /id=\S+/.test(s) && !/id=c1_knife/.test(s) }, 10000, 500)
    check('c1_knife completes silently for a bot holding the knife', knife, await story(M1, 'story'))

    // ---------- M2: an escape during l_shop finishes the chain (l_out paid) ----------
    const m2 = await t.newBot(M2, { fresh: true })
    await sleep(2500)
    await cmd(`dprison course ${M2} skip`)
    await into(M2, 205.5, 65, 160.5, 0)
    await until(async () => /id=l_meet/.test(await story(M2, 'lefty')), 12000, 500)
    await cmd(`dstory set ${M2} l_shop`)
    await sleep(1500)
    b0 = await bal(M2)
    t.logs.prison.mark()
    await escape(m2, M2)
    const fin = await until(async () => /id=done/.test(await story(M2, 'lefty')), 12000, 500)
    check('an escape during l_shop finishes Lefty\'s chain: l_out paid (+$250)', fin && (await bal(M2)) === b0 + 250, `${await story(M2, 'lefty')} bal ${await bal(M2)} vs ${b0}`)

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
    await until(async () => (await t.dim(M3)) === 'minecraft:jailbreak', 8000)
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
    check('Lefty\'s job menu: the Yard Run', w && /Lefty/.test(JSON.stringify(w.title)) && w.slots[13] && w.slots[13].name === 'feather', w ? JSON.stringify(w.slots[13]).slice(0, 200) : 'no window')
    if (w) m3.clickWindow(13, 0, 0).catch(() => {})
    await sleep(1200)
    j = await jobs(M3)
    check('...taken: the GPS on mark 1', field(j, 'job') === 'yardrun' && /^172\.5,65,103\.5/.test(field(j, 'qt')), j)
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
  } finally {
    await breach('front', 'close')
    await t.prisonOff()
    for (const n of [M1, M2, M3]) if (t.bots[n]) await cmd(`zzjail ${n} state off`)
    await t.close()
  }
}
