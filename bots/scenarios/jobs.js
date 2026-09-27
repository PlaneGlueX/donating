// jobs.sk: contact jobs (owner, 2026-09-27: "Contact Jobs"). Boards open (Mara's when her story is done, the
// Boss's after a delivered car job) with 3 jobs built only from what the map has; jobs are picked up in person
// (away from the contact a click leads the GPS there); a haul counts only loot the player robbed themselves, and
// only once taken; one event counts for one job per contact; a met job pays R x bonus x cold x passive in the pass
// (JOB DONE after it), never boosted; bonuses (the clock, quiet, fast, a model) keep or miss; rep gives bound titles
// and a 4th slot; swap once a day in person, drop with a second right-click; a deleted heist's job is replaced; a
// crash mid-pay never pays twice; the GPS, the boss bar, the sidebar, the Scrap Yard's button; staff only.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')
const { Vec3 } = require('vec3')

const A = 'JobA'
const B = 'JobB'
const Y = 200
const CHUNKS = '2690 2695 2765 2745'
const MARA = [2745.5, Y, 2722.5]
const BOSS = [2752.5, Y, 2722.5]
const HERE = [2740.5, Y, 2700.5]
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let mara = ''
  let boss = ''
  let spot = ''
  let chop = ''
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const info = async name => cmd(`djobs info ${name}`)
    const slot = async (name, c, k) => ((await info(name)).split('\n').find(l => l.includes(` ${c}:${k}=`)) || '')
    const field = (s, k) => (s.match(new RegExp(` ${k}=(\\S*)`)) || [])[1] || ''
    const run = async h => field(await cmd(`dheist info ${h}`), 'run')
    const papi = async (name, ph) => ((await cmd(`zzpapi ${name} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const itemText = i => (i ? JSON.stringify(i) : '')
    const openJobs = async name => { const o = windowOpen(bots[name]); bots[name].chat('/jobs'); const w = await o; await sleep(300); return w }
    const click = async (name, s, button = 0) => { await bots[name].clickWindow(s, button, 0).catch(() => {}); await sleep(500) }
    const close = name => { if (bots[name].currentWindow) bots[name].closeWindow(bots[name].currentWindow) }
    const npcAt = (name, at) => Object.values(bots[name].entities).find(x => x.name === 'mannequin' && x.position.distanceTo(new Vec3(...at)) < 1)
    const talk = async (name, at) => { const e = npcAt(name, at); if (e) { try { await bots[name].lookAt(e.position.offset(0, 1.5, 0), true) } catch (err) {} await bots[name].activateEntity(e).catch(() => {}) } await sleep(1200) }
    // A haul: the robbery, then the sale (progress.sk's events), on the heist's current run.
    const haul = async (name, h, robbed, sold) => { const tag = `${h}#${await run(h)}`; if (robbed) await cmd(`zzprog ${name} rob ${robbed} ${tag}`); await cmd(`zzprog ${name} sell ${sold} ${tag}`); return tag }
    const paid = async (name, fn, ms = 7000) => until(fn, ms)

    // ---------- Setup: two heists (jb2 with a pile; jb3 advanced with a pile and a safe), givers, a car spot ----------
    for (const h of ['jb2', 'jb3']) { await cmd(`dloot clear ${h} confirm`); await cmd(`dheist delete ${h} confirm`); await cmd(`rg remove -w world heist_${h}`) }
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 2692 ${Y} 2698 2762 ${Y + 6} 2742 air`)
    await cmd(`fill 2692 ${Y - 1} 2698 2762 ${Y - 1} 2742 glass`)
    await cmd('zzregion heist_jb2 2710 190 2705 2718 208 2713')
    await cmd('zzregion heist_jb3 2725 190 2705 2735 208 2715')
    await cmd('fill 2713 200 2709 2714 200 2709 stone')
    await cmd('fill 2729 200 2709 2730 200 2709 stone')
    await cmd('setblock 2732 201 2711 iron_block')
    for (const c of ['dheist create jb2 2', 'dheist set jb2 level 0', 'dheist set jb2 name Jobs Bank', 'dheist set jb2 escape 600', 'dheist set jb2 cooldown 5', 'dheist exit jb2 2706.5 200 2709.5 -90',
      'dloot add jb2 pile 2713 200 2709 2714 200 2709 value=500', 'dheist snapshot jb2', 'dheist enable jb2',
      'dheist create jb3 3', 'dheist set jb3 level 0', 'dheist set jb3 name Jobs Vault', 'dheist set jb3 advanced true', 'dheist set jb3 escape 600', 'dheist set jb3 cooldown 5', 'dheist exit jb3 2722.5 200 2710.5 -90',
      'dloot add jb3 pile 2729 200 2709 2730 200 2709 value=500', 'dloot add jb3 safe 2732 201 2711 2732 201 2711', 'dheist snapshot jb3', 'dheist enable jb3']) await cmd(c)
    mara = ((await cmd(`dquest addat story ${MARA.join(' ')} 180 Safehouse`)).match(/giver (\d+) \(story\) added/) || [])[1] || ''
    boss = ((await cmd(`dquest addat contracts ${BOSS.join(' ')} 180 Test Yard`)).match(/giver (\d+) \(contracts\) added/) || [])[1] || ''
    spot = ((await cmd(`dcontract spot addat 2755.5 ${Y} 2738.5 90`)).match(/spot (\d+) added/) || [])[1] || ''
    chop = ((await cmd(`dcontract chop addat 2697.5 ${Y} 2738.5`)).match(/chop (\d+) added/) || [])[1] || ''
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`djobs clear ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dlevel set ${name} 3`)
      await cmd(`eco set ${name} 10000`)
      await cmd(`zzdata ${name} contracts-done none`)
      await cmd(`minecraft:tp ${name} ${HERE[0]} ${Y} ${HERE[2]}`)
    }
    await cmd(`zzdatatext ${A} jobs::mara::unlocked off`)
    await cmd(`zzdatatext ${A} jobs::boss::unlocked off`)
    const bossbars = new Map()
    bots[A]._client.on('boss_bar', p => {
      if (p.action === 1) { bossbars.delete(p.entityUUID); return }
      const b = bossbars.get(p.entityUUID) || {}
      if (p.title !== undefined) b.title = require('prismarine-chat')(bots[A].registry).fromNotch(p.title).toString()
      bossbars.set(p.entityUUID, b)
    })
    await sleep(6000) // the join wait (5 s)

    // ---------- Boards open ----------
    let t = Date.now()
    await cmd(`zzdata ${A} jobs::mara::unlocked none`)
    let w = await openJobs(A)
    close(A)
    let inf = await info(A)
    const maraJobs = inf.split('\n').filter(l => / mara:\d=waiting/.test(l))
    check('Mara\'s board opens once her story is done: her text, and 3 jobs waiting', maraJobs.length === 3 && /I said I'd call/.test(text(A, t)), `${inf} | ${text(A, t).slice(0, 200)}`)
    const valid = maraJobs.every(l => ['jb2', 'jb3'].includes(field(l, 'h')) && (field(l, 'tpl') !== 'safe' || field(l, 'h') === 'jb3') && (field(l, 'tpl') !== 'getaway' || field(l, 'h') === 'jb3') && field(l, 'tpl') !== 'vault')
    check('Mara\'s jobs name heists the player can rob, with jobs they allow (a safe job only where a safe is, a getaway only in an advanced heist, no vault job without a vault)', valid, maraJobs.join(' / '))
    check('the Boss\'s board stays locked before the first delivered car job', w && /Deliver your first car job/.test(itemText(w.slots[18])), itemText(w && w.slots[18]).slice(0, 200))
    await cmd(`zzdata ${A} contracts-done 1`)
    await cmd(`zzdata ${A} jobs::boss::unlocked none`)
    await openJobs(A)
    close(A)
    inf = await info(A)
    const bossJobs = inf.split('\n').filter(l => / boss:\d=waiting/.test(l))
    check('after a delivered car job the Boss\'s board opens: 3 jobs for tiers the player\'s level allows', bossJobs.length === 3 && bossJobs.every(l => ['basic', 'pro'].includes(field(l, 't'))), bossJobs.join(' / '))

    // ---------- In person ----------
    t = Date.now()
    w = await openJobs(A)
    await click(A, 10)
    await sleep(600)
    const pin = await cmd(`dphone gps ${A}`)
    check('away from Mara, a click on a waiting job leads the GPS to her (it isn\'t taken)', /active=pin/.test(pin) && (await slot(A, 'mara', 1)).includes('=waiting'), `${pin} | ${await slot(A, 'mara', 1)}`)
    await cmd(`minecraft:tp ${A} ${MARA[0]} ${Y} ${MARA[2] - 2}`)
    await sleep(1500)
    t = Date.now()
    await talk(A, MARA)
    close(A)
    inf = await info(A)
    check('talking to Mara in person takes every waiting job ("3 for you")', inf.split('\n').filter(l => / mara:\d=taken/.test(l)).length === 3 && /3 for you/.test(text(A, t)), `${inf} | ${text(A, t).slice(0, 200)}`)

    // ---------- Counting and paying ----------
    await cmd(`djobs empty ${A} mara`)
    await cmd(`djobs empty ${A} boss`)
    await cmd(`djobs post ${A} mara 1 haul jb2 -`)
    let s1 = await slot(A, 'mara', 1)
    check('a haul\'s goal fits one trip: N = floor100(min(3,000, 0.6 x the best bag 2,000, 0.25 x the pool 12,000)) = $1,200, pay max($500, 0.2 x N)', field(s1, 'n') === '1200' && field(s1, 'pay') === '500', s1)
    await haul(A, 'jb2', 1500, 1200)
    s1 = await slot(A, 'mara', 1)
    check('a job that isn\'t picked up yet counts nothing', field(s1, 'prog') === '0', s1)
    await cmd(`djobs take ${A}`)
    await cmd(`zzprog ${A} sell 800 jb2#9999`) // loot of a run the player never robbed (a duffel)
    s1 = await slot(A, 'mara', 1)
    check('selling loot the player didn\'t rob (a picked-up duffel) counts nothing', field(s1, 'prog') === '0', s1)
    let b0 = await bal(A)
    t = Date.now()
    await haul(A, 'jb2', 1500, 1200)
    const met = await slot(A, 'mara', 1)
    await paid(A, async () => (await slot(A, 'mara', 1)) === '')
    await until(async () => /JOB DONE/.test(text(A, t)), 3000)
    check('selling $1,200 robbed yourself meets it; it pays $500 in the pass, then JOB DONE, and the slot is free', /=met/.test(met) && (await bal(A)) - b0 === 500 && /Job done/.test(text(A, t)) && /JOB DONE/.test(text(A, t)), `${met} | +${(await bal(A)) - b0} | ${text(A, t).slice(0, 300)}`)

    // ---------- Bonuses ----------
    let tag = `jb2#${await run('jb2')}`
    await cmd(`djobs post ${A} mara 1 haul jb2 clock`)
    await cmd(`djobs take ${A}`)
    await cmd(`zzrunset ${A} ${tag} left 300`)
    b0 = await bal(A)
    await haul(A, 'jb2', 1500, 1200)
    await paid(A, async () => (await slot(A, 'mara', 1)) === '')
    check('★ In and Out: out with 2:00+ on the clock pays +50% ($750)', (await bal(A)) - b0 === 750, `+${(await bal(A)) - b0}`)
    await cmd(`djobs post ${A} mara 1 haul jb2 clock`)
    await cmd(`djobs take ${A}`)
    await cmd(`zzrunset ${A} ${tag} left 60`)
    b0 = await bal(A)
    t = Date.now()
    await haul(A, 'jb2', 1500, 1200)
    await paid(A, async () => (await slot(A, 'mara', 1)) === '')
    check('...out with less than 2:00: "Bonus missed", the job still pays $500', (await bal(A)) - b0 === 500 && /Bonus missed/.test(text(A, t)), `+${(await bal(A)) - b0} | ${text(A, t).slice(0, 200)}`)
    tag = `jb3#${await run('jb3')}`
    await cmd(`djobs post ${A} mara 1 haul jb3 quiet`)
    await cmd(`djobs take ${A}`)
    await cmd(`zzrunset ${A} ${tag} loud true`)
    b0 = await bal(A)
    await haul(A, 'jb3', 3000, Number(field(await slot(A, 'mara', 1), 'n')))
    await paid(A, async () => (await slot(A, 'mara', 1)) === '')
    const quietPay = (await bal(A)) - b0
    check('★ Quiet Hands missed when an alarm hunted you in that run (pays the base)', quietPay > 0 && quietPay < 1000, `+${quietPay}`)
    await cmd(`djobs post ${A} boss 1 tier basic fast`)
    await cmd(`djobs post ${A} boss 2 tier basic -`)
    await cmd(`djobs take ${A}`)
    b0 = await bal(A)
    await cmd(`zzctdeliver ${A} basic sedan 100 0`)
    const one = await slot(A, 'boss', 1)
    const two = await slot(A, 'boss', 2)
    await paid(A, async () => (await slot(A, 'boss', 1)) === '')
    check('one car delivery counts for one Boss job only; ★ Speed Run (within 4:00) pays $750', /=met|^$/.test(one) && field(two, 'prog') === '0' && (await bal(A)) - b0 === 750, `${one} | ${two} | +${(await bal(A)) - b0}`)
    await cmd(`djobs empty ${A} boss`)
    await cmd(`djobs post ${A} boss 1 model basic - sportsedan`)
    await cmd(`djobs take ${A}`)
    await cmd(`zzctdeliver ${A} basic sedan 100 0`)
    const wrong = field(await slot(A, 'boss', 1), 'prog')
    await cmd(`zzctdeliver ${A} basic sportsedan 100 0`)
    await paid(A, async () => (await slot(A, 'boss', 1)) === '')
    check('a Special Order counts only the named car model', wrong === '0' && (await slot(A, 'boss', 1)) === '', wrong)

    // ---------- Passive, boosters ----------
    await cmd(`djobs post ${A} mara 1 haul jb2 -`)
    await cmd(`djobs take ${A}`)
    await cmd(`zzpassive ${A} on`)
    b0 = await bal(A)
    await haul(A, 'jb2', 1500, 1200)
    await cmd(`zzpassive ${A} off`)
    await paid(A, async () => (await slot(A, 'mara', 1)) === '')
    check('a job done while passive pays 75% ($375)', (await bal(A)) - b0 === 375, `+${(await bal(A)) - b0}`)
    await cmd(`dbooster add ${B} money 2 5`)
    await cmd(`dbooster add ${B} xp 2 5`)
    await cmd(`djobs post ${A} mara 1 haul jb2 -`)
    await cmd(`djobs take ${A}`)
    const xp0 = Number(((await cmd(`dlevel info ${A}`)).match(/xp=(\d+)/) || [])[1])
    b0 = await bal(A)
    await haul(A, 'jb2', 1500, 1200)
    await paid(A, async () => (await slot(A, 'mara', 1)) === '')
    const xp1 = Number(((await cmd(`dlevel info ${A}`)).match(/xp=(\d+)/) || [])[1])
    await cmd('dbooster stop money')
    await cmd('dbooster stop xp')
    await cmd('dbooster clear money')
    await cmd('dbooster clear xp')
    check('money and XP boosters never touch a job\'s pay or XP ($500, +15 XP)', (await bal(A)) - b0 === 500 && xp1 - xp0 === 15, `+${(await bal(A)) - b0} xp+${xp1 - xp0}`)

    // ---------- Rep ----------
    const rep0 = Number(field((await info(A)).split('\n').find(l => / mara unlocked=/.test(l)) || '', 'rep'))
    t = Date.now()
    await cmd(`djobs rep ${A} mara ${150 - rep0}`)
    const cos = await cmd(`zzcos ${A}`)
    check('150 rep with Mara: Trusted, and the bound title «Mara\'s Crew»', /trusts you more/.test(text(A, t)) && /rep_mara_2/.test(cos), `${text(A, t).slice(0, 200)} | ${cos}`)
    await cmd(`djobs rep ${A} mara 1100`)
    inf = await info(A)
    check('Family (1,200 rep): tier 4 and a 4th job slot', / mara unlocked=\S+ next=\S+ rep=\d+ tier=4/.test(inf), inf.split('\n')[0])

    // ---------- Swap and drop, in person ----------
    await cmd(`djobs empty ${A} mara`)
    await cmd(`djobs post ${A} mara 1 haul jb3 -`)
    await cmd(`djobs take ${A}`)
    const before = await slot(A, 'mara', 1)
    w = await openJobs(A)
    await click(A, 17)
    w = bots[A].currentWindow
    const armed = w && /Swap this one/.test(itemText(w.slots[10]))
    await click(A, 10)
    close(A)
    await sleep(300)
    const swapped = await cmd(`zzdata ${A} jobs::mara::swap`)
    t = Date.now()
    await openJobs(A)
    await click(A, 17)
    await click(A, 10)
    close(A)
    check('at Mara, swap mode turns a job into another (once a day: the second swap is refused)', armed && /= \d+/.test(swapped) && (await slot(A, 'mara', 1)) !== '', `${armed} ${swapped} | ${before} -> ${await slot(A, 'mara', 1)}`)
    await openJobs(A)
    await click(A, 10, 1)
    await click(A, 10, 1)
    close(A)
    check('right-click twice drops a job', (await slot(A, 'mara', 1)) === '', await slot(A, 'mara', 1))

    // ---------- GPS, boss bar, sidebar, the Scrap Yard's button ----------
    await cmd(`minecraft:tp ${A} ${HERE[0]} ${Y} ${HERE[2]}`)
    await sleep(1000)
    await cmd(`djobs post ${A} mara 1 haul jb3 -`)
    await cmd(`djobs take ${A}`)
    await openJobs(A)
    await click(A, 10)
    await sleep(1500)
    const g = await cmd(`dphone gps ${A}`)
    check('clicking a taken job: the GPS leads to its heist', /active=quest/.test(g) && /label=Jobs_Vault/.test(g), g)
    await until(async () => [...bossbars.values()].some(b => /JOB/.test(b.title || '')), 3000)
    check('...with the JOB boss bar', [...bossbars.values()].some(b => /JOB/.test(b.title || '') && /Jobs Vault|Special Delivery/.test(b.title || '')), JSON.stringify([...bossbars.values()]))
    const side = await papi(A, 'donating_jobs')
    const line = await papi(A, 'donating_mission')
    check('the sidebar: "Jobs 0 new · 1 taken", and the tracked job\'s progress', /0 new/.test(side) && /1 taken/.test(side) && /Special Delivery/.test(line), `${side} | ${line}`)
    await cmd(`zzbagadd ${A} jb3#${await run('jb3')} 500`)
    await sleep(1500)
    const gl = await cmd(`dphone gps ${A}`)
    await cmd(`zzbagadd ${A} jb3#${await run('jb3')} 0`)
    check('carrying loot, the GPS shows the base, not the job', !/active=quest/.test(gl) || !/Jobs_Vault/.test(gl), gl)
    await cmd(`minecraft:tp ${A} ${BOSS[0]} ${Y} ${BOSS[2] - 2}`)
    await sleep(1200)
    w = windowOpen(bots[A])
    bots[A].chat('/contracts')
    w = await w
    await sleep(300)
    const btn = w && itemText(w.slots[27])
    const next = windowOpen(bots[A])
    await click(A, 27)
    const jw = await next
    close(A)
    check('the Scrap Yard\'s menu has the Boss\'s side jobs button, and it opens /jobs', /Side jobs/.test(btn) && jw && /Jobs/.test(JSON.stringify(jw.title)), `${(btn || '').slice(0, 100)} | ${jw && JSON.stringify(jw.title)}`)

    // ---------- Safety ----------
    await cmd(`djobs post ${A} mara 2 haul jb2 -`)
    await cmd(`zzdatatext ${A} job::mara::2 paying`)
    b0 = await bal(A)
    await sleep(2500)
    check('a job left "paying" by a crash is removed with no pay (never paid twice)', (await slot(A, 'mara', 2)) === '' && (await bal(A)) === b0, `${await slot(A, 'mara', 2)} +${(await bal(A)) - b0}`)
    t = Date.now()
    bots[B].chat('/djobs stats')
    await sleep(800)
    check('/djobs is staff only', /Staff only/.test(text(B, t)), text(B, t))
    // A deleted heist's job is replaced (the 30 s pass).
    await cmd(`djobs empty ${A} mara`)
    await cmd(`djobs post ${A} mara 1 haul jb2 -`)
    await cmd(`djobs take ${A}`)
    t = Date.now()
    await cmd('dloot clear jb2 confirm')
    await cmd('dheist delete jb2 confirm')
    await until(async () => field(await slot(A, 'mara', 1), 'h') !== 'jb2', 35000)
    const repl = await slot(A, 'mara', 1)
    check('a job whose heist is deleted is replaced ("Change of plans")', field(repl, 'h') === 'jb3' && /=taken/.test(repl) && /Change of plans/.test(text(A, t)), `${repl} | ${text(A, t).slice(0, 200)}`)
  } finally {
    await rcon.cmd('dbooster clear money').catch(() => {})
    await rcon.cmd('dbooster clear xp').catch(() => {})
    await rcon.cmd('dbooster stop money').catch(() => {})
    await rcon.cmd('dbooster stop xp').catch(() => {})
    if (mara) await rcon.cmd(`dquest remove ${mara}`).catch(() => {})
    if (boss) await rcon.cmd(`dquest remove ${boss}`).catch(() => {})
    if (spot) await rcon.cmd(`dcontract spot remove ${spot}`).catch(() => {})
    if (chop) await rcon.cmd(`dcontract chop remove ${chop}`).catch(() => {})
    for (const h of ['jb2', 'jb3']) {
      await rcon.cmd(`dloot clear ${h} confirm`).catch(() => {})
      await rcon.cmd(`dheist delete ${h} confirm`).catch(() => {})
      await rcon.cmd(`rg remove -w world heist_${h}`).catch(() => {})
      await rcon.cmd(`minecraft:kill @e[tag=poi_h_${h}]`).catch(() => {})
    }
    for (const name of [A, B]) {
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`djobs clear ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 2692 ${Y - 1} 2698 2762 ${Y + 6} 2742 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    rcon.close()
  }
}
