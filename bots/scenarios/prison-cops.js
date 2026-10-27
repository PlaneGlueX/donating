// The prison guards (jailcops.sk; ESCAPE-SPEC 5 and 7.2-5; owner, 2026-10-14: "If the cop is in range, they try to taze
// then arrest you when closer, if too far they shoot you until they get closer ... Prison cops are level 1 so not that
// good aim"): 10 Citizens + Sentinel cops spawn while someone is in the prison and patrol; only rule-breakers are hunted
// (seen in a restricted place (the police station, the lot), an act in view (a search), contraband held out in front
// of a cop (not behind its back; not the note), contraband right past a cop,
// a hit on a cop), and only by the cops that saw it; the lot is no hiding place, the closed gatehouse keeps you safe
// from shots; out of sight for 20 s = lost them (not in B1); gunshots at range (1 heart, some miss, never a bystander),
// the taser's stun, the arrest; Sentinel's own hits never land; two knife hits down a cop (staggered meanwhile), a
// keycard drops, it's back after 60 s, no death message; low health slows you; a hostile logout is a catch at the rejoin;
// strays go home; idle cops are removed; an untracked "Prison Guard" is swept.
// Round 3 (owner, 2026-10-20): the arrest is a clock with the red CUFFING bar (2 s, 2.5 s for a tased grab) and the
// guard holds handcuffs meanwhile ("make the guards hold hand cuffs while arresting you ... show a status bar"); a
// restricted place is one look anywhere in front of a cop, through its windows too ("if a cop sees you inside the area
// while passing by, you get targeted"), SPOTTED names it; the yard's Gun Shop is keycard-only and restricted (seen
// through its windows, its door an act, a hiding place for nobody: no-lose, guards that end up inside go home); the
// lose-cops grace ("once the player loses the cops after getting the keycard, the other cops wont arrest if they see the
// player again, unless he is actively holding contraband in his hand"); Sparks' Scrap Metal held out is contraband, his
// Duct Tape isn't.
// 2026-10-21 (the owner's prison playtest; untested (cloud)): 20 guards (twice the old 10), 30 while more than 3 players
// are in the prison (the busy routes; here the threshold set to 0); guards see through bars and fences (a wall of iron
// bars in the lot hides nobody, stone does); any weapon held out in front of a guard is like contraband; a gun seen makes
// the prisoner ARMED: the hunting guards stronger (armed::health) and 3 extra guards spawn to hunt, all gone again once
// the prisoner is calm. The rest of the checks run on the old 10 routes (they name them).
const { start, field, sleep } = require('../prisonlib')

const A = 'PcCopA'
const B = 'PcCopB'
const L = 'PcCopL' // an exempt bot that keeps chunks loaded where it stands
const VET_CELLS = ['n89', 'n96', 'n103', 'n110', 's96', 's103', 's110', 's117']

module.exports = async ({ check }) => {
  const t = await start()
  const { cmd, info, into, state, jtp, pos, said, until, logs, cop, copAt, copTo } = t
  const copId = async r => ((await cop(r)).match(/id=(\d+)/) || [])[1]
  const hunts = async (r, n) => new RegExp(`hunts=([^ ]*,)?${n}(,|\\s|$)`).test(await cop(r))
  const hostile = async n => field(await info(n), 'hostile') === 'yes'
  const calm = n => cmd(`djailcops calm ${n}`)
  const rotate = async (r, yaw) => cmd(`zzconsole npc rotate --body ${yaw} --head ${yaw} --id ${await copId(r)}`)
  const yawTo = (from, to) => Math.atan2(-(to[0] - from[0]), to[2] - from[2]) * 180 / Math.PI
  const hitCop = (at, n, hp) => cmd(`execute in minecraft:jailbreak run minecraft:damage @e[tag=CITIZENS_NPC,limit=1,sort=nearest,x=${at[0]},y=${at[1]},z=${at[2]}] ${hp} minecraft:player_attack by ${n}`)
  // The exempt bot L stands near a cop's route so its chunk is loaded (Citizens despawns NPCs in unloaded chunks).
  const copHere = async (r, x, z, y = 65) => {
    await state(L, 'off')
    await jtp(L, x, y, z, 0)
    await until(async () => /loaded=yes/.test(await cop(r)), 12000, 500)
    return copAt(r)
  }
  const stunMod = async n => cmd(`minecraft:attribute ${n} minecraft:movement_speed modifier value get donating:jail_stun`)
  const lowMod = async n => cmd(`minecraft:attribute ${n} minecraft:movement_speed modifier value get donating:jail_lowhp`)
  const start0 = Date.now()
  const allLog = require('../prisonlib').logTail('jailcops')
  try {
    await t.prisonOn()
    const a = await t.newBot(A)
    const b = await t.newBot(B)
    const l = await t.newBot(L)
    await sleep(1500)
    for (const n of [A, B, L]) await cmd(`zzclear ${n}`)
    await cmd(`zzjail ${A} own Combat_Knife`)

    // ---------- the roster: 20 cops once someone is in the prison, 30 while it's busy ----------
    await cmd('zzcfgreload') // core.sk's rosters (a test before may have narrowed them)
    await cmd('djailcops removeall')
    await sleep(500)
    check('setup: no prison cops', /known=0/.test(await cmd('zzjailcops')), await cmd('zzjailcops'))
    await into(A, 205.5, 65, 150.5, 0)
    const t0 = Date.now()
    const twenty = await until(async () => /known=20/.test(await cmd('zzjailcops')), 150000, 2000)
    check('an inmate in the prison: 20 cops known within 150 s (twice the old 10)', twenty, `${await cmd('zzjailcops')} after ${Date.now() - t0} ms`)
    // Busy: more prisoners than busy-players (0 here: the one inmate) -> the busy routes get theirs too.
    const busyRoutes = 'fieldr hallar plazar cafer lotw lote annex lotr gater w67r'
    const busySet = await cmd(`zzjailbusy ${busyRoutes} 0`)
    const thirty = await until(async () => /known=30/.test(await cmd('zzjailcops')), 120000, 2000)
    check('busy (more prisoners than busy-players): 30 cops known', /busy=true/.test(busySet) && thirty, `${busySet} | ${await cmd('zzjailcops')}`)
    await cmd('zzjailbusy none 3')
    const back20 = await until(async () => /known=20/.test(await cmd('zzjailcops')), 30000, 1000)
    check('...not busy any more: the busy routes\' guards go (20 again)', back20, await cmd('zzjailcops'))
    // The checks below name the old 10 routes.
    await cmd('zzjailroster yardn yards walk w5 w67 hallb poldesk poloffice gate lot')
    const ten = await until(async () => /known=10/.test(await cmd('zzjailcops')), 20000, 1000)
    check('...a test roster of 10: the others removed', ten, await cmd('zzjailcops'))
    allLog.mark()

    // ---------- patrols; a calm inmate is left alone ----------
    const yn0 = await copHere('yardn', 200.5, 118.5)
    await jtp(A, (yn0[0] + 3).toFixed(1), 65, (yn0[2] + 3).toFixed(1), 0)
    await sleep(2000)
    const p1 = await copAt('yardn')
    await sleep(8000)
    const p2 = await copAt('yardn')
    check('the yard north cop patrols (moves along its route)', p1 && p2 && Math.hypot(p1[0] - p2[0], p1[2] - p2[2]) > 2, `${p1} -> ${p2}`)
    const yn = await copAt('yardn')
    await jtp(A, (yn[0] + 3).toFixed(1), 65, yn[2].toFixed(1), 90)
    const hpA = a.health
    await sleep(4000)
    check('a calm inmate next to a cop: not hostile, not attacked', !(await hostile(A)) && a.health >= hpA, `${await info(A)} hp ${hpA} -> ${a.health}`)

    // ---------- weapons in hand: like contraband; a gun makes you ARMED (stronger hunters, 3 more guards) ----------
    const ynId = await copId('yardn')
    await cmd(`zzconsole npc speed 0.01 --id ${ynId}`)
    await sleep(1000)
    // Even at speed 0.01 it keeps facing its next waypoint (a rotate doesn't stick): stand 6 blocks along its own facing,
    // again until its own sight check sees the spot (it can still turn at a waypoint, or a catch can move the bot).
    const faceGuard = async () => {
      let sees = ''
      for (let i = 0; i < 4; i++) {
        const yw = await copAt('yardn')
        const ywYaw = Number(((await cop('yardn')).match(/yaw=(-?[\d.]+)/) || [])[1] || 0) * Math.PI / 180
        await jtp(A, (yw[0] - Math.sin(ywYaw) * 6).toFixed(1), 65, (yw[2] + Math.cos(ywYaw) * 6).toFixed(1), (ywYaw * 180 / Math.PI + 180).toFixed(0))
        await calm(A)
        await sleep(500)
        sees = await cmd(`zzjailsees yardn ${A}`)
        if (/cone=true/.test(sees) && /los=true/.test(sees)) break
      }
      return sees
    }
    await cmd(`wm give ${A} Combat_Knife 1 {slot:0}`)
    a.setQuickBarSlot(1)
    const knifeSees = await faceGuard()
    logs.cops.mark()
    a.setQuickBarSlot(0)
    const knifeH = await until(() => logs.cops.has(new RegExp(`hostile ${A} \\S+ why=seen-held-wpn:Combat_Knife by=${ynId}`)), 4000, 100)
    check('a melee weapon held out in front of a guard: hostile (why=seen-held-wpn:Combat_Knife), not ARMED', knifeH && !logs.cops.has(new RegExp(`armed ${A}`)), `${logs.cops.since().split('\n').filter(x => /hostile|armed/.test(x)).join(' / ')} | ${knifeSees}`)
    a.setQuickBarSlot(1)
    await calm(A)
    await cmd(`zzjail ${A} own 50_GS`)
    const gunSees = await faceGuard()
    const known0 = Number((await cmd('zzjailcops')).match(/known=(\d+)/)[1])
    logs.cops.mark()
    let since0 = Date.now() // before the give: slot 1 is already in hand, so the guard can see the gun at once
    await cmd(`wm give ${A} 50_GS 1 {slot:1}`)
    a.setQuickBarSlot(1)
    const gunH = await until(() => logs.cops.has(new RegExp(`hostile ${A} \\S+ why=seen-held-wpn:50_GS`)) && logs.cops.has(new RegExp(`armed ${A} \\S+ why=seen-gun`)), 8000, 100) // the 1 s held rule + the 10-tick pass + a guard turning at a waypoint
    const buffed = await until(() => logs.cops.has(new RegExp(`buff id=${ynId}`)), 3000, 100)
    const gunTitle = await until(() => said(a, /ARMED/, since0), 2000, 100)
    check('a gun held out in front of a guard: hostile and ARMED (the title), the hunting guard stronger (buff)', gunH && buffed && gunTitle, `gun=${gunH} buff=${buffed} title=${said(a, /ARMED/, since0)} | ${logs.cops.since().split('\n').filter(x => /hostile|armed|buff/.test(x)).join(' / ')} | ${gunSees}`)
    const extra = await until(async () => Number((await cmd('zzjailcops')).match(/known=(\d+)/)[1]) >= known0 + 3, 30000, 1000)
    check('...and 3 extra guards spawn to hunt them', extra && logs.cops.has(/spawn armed\d+ id=/), `${known0} -> ${await cmd('zzjailcops')} | ${logs.cops.since().split('\n').filter(x => /spawn/.test(x)).slice(-4).join(' / ')}`)
    a.setQuickBarSlot(2)
    await calm(A)
    const extrasGone = await until(() => logs.cops.has(/armed-done/), 6000, 200)
    const unbuffed = await until(() => logs.cops.has(new RegExp(`unbuff id=${ynId}`)), 4000, 200)
    const knownBack = await until(async () => Number((await cmd('zzjailcops')).match(/known=(\d+)/)[1]) === known0, 15000, 1000)
    check('...calm again: the extra guards go and the guard is back to its normal health', extrasGone && unbuffed && knownBack, `${await cmd('zzjailcops')} | ${logs.cops.since().split('\n').filter(x => /armed-done|unbuff/.test(x)).join(' / ')}`)
    await cmd(`minecraft:clear ${A} minecraft:feather`)
    await cmd(`minecraft:clear ${A} minecraft:amethyst_shard`)
    await cmd(`zzconsole npc speed 1 --id ${ynId}`)
    await calm(A)

    // ---------- restricted: the police station ----------
    logs.cops.mark()
    let since = Date.now()
    await into(A, 220.5, 65, 313.5, 180)
    const seen = await until(() => hostile(A), 5000)
    check('in the lobby in front of the desk cop: hostile (seen in a restricted place), SPOTTED "A guard saw you in the police station", zone=police', seen && said(a, /SPOTTED/, since) && said(a, /saw you in the police station/, since) && logs.cops.has(/why=seen-restricted by=\d+ zone=police/), `${logs.cops.since().split('\n').filter(x => /hostile|hunt/.test(x)).join(' / ')} | ${t.text(a, since).slice(0, 200)}`)
    check('...only the cop that saw it hunts (the desk cop, not the yard cop)', await hunts('poldesk', A) && !(await hunts('yardn', A)), `${await cop('poldesk')} | ${await cop('yardn')}`)
    await calm(A)

    // ---------- the lot: restricted in front of the LOT cop, not behind; the lose clock runs there ----------
    await copHere('lot', 170.5, 370.5)
    await copTo('lot', 150.5, 65, 362.5)
    await sleep(600)
    await rotate('lot', -90)
    await sleep(300)
    let lc = await copAt('lot')
    await into(A, (lc[0] - 8).toFixed(1), 65, lc[2].toFixed(1), 0)
    await sleep(1800)
    const behind = await hostile(A)
    lc = await copAt('lot')
    const ly = Number(((await cop('lot')).match(/yaw=(-?\d+)/) || [])[1])
    const fwd = (ly > 180 || ly < 0) ? 1 : -1
    logs.cops.mark()
    await into(A, (lc[0] + fwd * 12).toFixed(1), 65, lc[2].toFixed(1), 0)
    const lotId = await copId('lot')
    const front = await until(() => logs.cops.has(new RegExp(`hostile ${A} \\S+ why=seen-restricted by=${lotId}`)), 4000)
    check('in the lot behind the LOT cop: not hostile', !behind, `${lc} yaw ${ly}`)
    check('...in front of it: hostile (the lot is restricted)', front, logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / '))
    await calm(A)
    // Through bars (owner, 2026-10-21: guards see through gates, fences and bars): a wall of iron bars between the LOT
    // guard and the inmate hides nobody; stone does.
    await cmd(`zzconsole npc speed 0.01 --id ${lotId}`)
    lc = await copAt('lot')
    const bx = Math.round(lc[0] + fwd * 6)
    const lz = Math.floor(lc[2])
    await cmd(`execute in minecraft:jailbreak run fill ${bx} 65 ${lz - 3} ${bx} 68 ${lz + 3} minecraft:iron_bars`)
    await into(A, (lc[0] + fwd * 12).toFixed(1), 65, lc[2].toFixed(1), 0)
    await calm(A)
    logs.cops.mark()
    const sb = await cmd(`zzjailsees lot ${A}`)
    const barsH = await until(() => logs.cops.has(new RegExp(`hostile ${A} \\S+ why=seen-restricted by=${lotId}`)), 4000, 100)
    check('through a wall of iron bars: still seen (los=false, fence=true) and hostile', /los=false/.test(sb) && /fence=true/.test(sb) && barsH, `${sb} | ${logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / ')}`)
    await calm(A)
    await cmd(`execute in minecraft:jailbreak run fill ${bx} 65 ${lz - 3} ${bx} 68 ${lz + 3} minecraft:stone`)
    logs.cops.mark()
    const ss = await cmd(`zzjailsees lot ${A}`)
    await sleep(2500)
    const stoneH = logs.cops.has(new RegExp(`hostile ${A} \\S+ why=seen-restricted by=${lotId}`))
    check('...a stone wall there instead: hidden (fence=false), not hostile', /fence=false/.test(ss) && !stoneH, ss)
    await cmd(`execute in minecraft:jailbreak run fill ${bx} 65 ${lz - 3} ${bx} 68 ${lz + 3} minecraft:air`)
    await cmd(`zzconsole npc speed 1 --id ${lotId}`)
    await calm(A)
    // Hunted in a far corner of the lot nobody sees: calm 20 s later (the lot isn't a no-lose zone).
    await into(A, 125.5, 65, 385.5, 0)
    await cmd(`zzjail ${A} hostile`)
    const tl = Date.now()
    const lost = await until(async () => !(await hostile(A)), 30000, 500)
    check('...hunted out of every guard\'s sight in the lot: calm after ~20 s (the clock runs there)', lost && Date.now() - tl > 15000, `${Date.now() - tl} ms`)

    // ---------- the gatehouse: a cop that ends up inside is home 20 s later; no shots through the glass ----------
    await state(A, 'off')
    await jtp(A, 272.5, 65, 384.5, 0)
    await copHere('gate', 272.5, 380.5)
    logs.cops.mark()
    await copTo('gate', 272.5, 65, 395.5)
    await sleep(1500)
    const inb = await copAt('gate')
    const tb = Date.now()
    const home = await until(() => logs.cops.has(/stray gate/), 30000, 500)
    check('a cop moved into the gatehouse is out of place: home ~20 s later', inb && inb[2] >= 393 && home && Date.now() - tb > 15000, `${inb} ${Date.now() - tb} ms`)
    await into(A, 272.5, 65, 395.5, 180)
    await copTo('gate', 272.5, 65, 389.5)
    await sleep(800)
    await cmd(`djailcops hostile ${A}`)
    logs.cops.mark()
    let inside = false
    for (let i = 0; i < 12; i++) {
      await sleep(1000)
      const gp = await copAt('gate')
      if (gp && gp[0] >= 270 && gp[0] < 275 && gp[2] >= 393 && gp[2] < 398) inside = true
    }
    const gl = logs.cops.since()
    check('a hostile inmate in the closed gatehouse (12 s): no shot or taser through the glass', /hunts=PcCopA/.test(await cop('gate')) && !/(shot|taser) id=\d+ PcCopA/.test(gl), gl.split('\n').filter(x => /shot|taser|arrest/.test(x)).join(' / '))
    check('...and the GATE cop hunting it never gets in', !inside, `${await copAt('gate')}`)
    await calm(A)

    // ---------- hitting a cop: that cop hunts, a cop 100 blocks away doesn't; out of sight 20 s: calm ----------
    const HIDE = [61.5, 65, 54.5] // the workshop: far from every route, behind walls
    const y1 = await copHere('yardn', 200.5, 118.5)
    await into(A, (y1[0] + 2).toFixed(1), 65, y1[2].toFixed(1), 90)
    await sleep(800)
    logs.cops.mark()
    const y2 = await copAt('yardn')
    await hitCop(y2, A, 1)
    const hitH = await until(() => hostile(A), 2000)
    check('hitting a cop: hostile, that cop hunts (why=hit)', hitH && await hunts('yardn', A) && logs.cops.has(/why=hit/), logs.cops.since().split('\n').filter(x => /hit|hunt/.test(x)).join(' / '))
    check('...a cop 100+ blocks away doesn\'t', !(await hunts('poldesk', A)) && !(await hunts('gate', A)), `${await cop('poldesk')}`)
    await jtp(A, ...HIDE, 0)
    const tq = Date.now()
    const quiet = await until(async () => !(await hostile(A)), 30000, 500)
    check('out of every hunter\'s sight for 20 s: calm, the targets removed', quiet && Date.now() - tq > 15000 && !(await hunts('yardn', A)), `${Date.now() - tq} ms ${await cop('yardn')}`)
    check('...lost them empty-handed: no lose-cops grace (it needs contraband on you)', field(await info(A), 'grace') === 'no' && !allLog.has(new RegExp(`grace ${A} `)), await info(A))

    // ---------- B1 doesn't lose them ----------
    await cmd(`zzjail ${A} hostile`)
    await jtp(A, 84.5, 58, 80.5, 0)
    await sleep(30000)
    check('a hostile inmate waiting 30 s in B1 is still hostile', await hostile(A), await info(A))
    await jtp(A, ...HIDE, 0)
    await sleep(12000)
    const still = await hostile(A)
    const tc = Date.now()
    const calmAfter = await until(async () => !(await hostile(A)), 15000, 500)
    check('...back up: still hostile 12 s later (the clock restarted), calm after ~20 s', still && calmAfter, `${still} then ${Date.now() - tc} ms more`)

    // ---------- a search in a cop's view ----------
    await into(A, 82.5, 65, 230.5, 90)
    await copTo('poldesk', 87.5, 65, 230.5)
    await until(async () => /loaded=yes at=8/.test(await cop('poldesk')), 12000, 500)
    await until(async () => !!t.near(a, 'interaction', [81.5, 65.99, 230.5], 1), 4000)
    await rotate('poldesk', 90)
    await sleep(400)
    logs.cops.mark()
    const th = Date.now()
    let hAt = 0
    const watch = (async () => { while (Date.now() - th < 6000 && !hAt) { if (await hostile(A)) hAt = Date.now() - th; await sleep(150) } })()
    const didHold = await t.hold(a, [81.5, 65.99, 230.5], 2600, 1)
    await watch
    check('a search hold in a cop\'s view: hostile within ~2 s of the hold\'s start (why=seen-act:search)', didHold && hAt > 0 && hAt <= 2800 && logs.cops.has(/why=seen-act:search/), `hold=${didHold} after ${hAt} ms ${logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / ')}`)
    await calm(A)
    await cmd(`zzjail ${A} strip`)

    // ---------- contraband: a keycard 10 blocks from a cop is safe, 3 blocks isn't ----------
    await copTo('poldesk', 205.5, 65, 160.5)
    await jtp(A, 215.5, 65, 160.5, 90)
    await until(async () => /loaded=yes at=20/.test(await cop('poldesk')), 12000, 500)
    await rotate('poldesk', 0)
    await state(A, 'off')
    await cmd(`zzjail ${A} give keycard`)
    await jtp(A, 215.5, 65, 160.5, 90)
    await state(A, 'in')
    await calm(A)
    await sleep(3000)
    const far = await hostile(A)
    logs.cops.mark()
    await jtp(A, 208.5, 65, 160.5, 90)
    const frisk = await until(() => hostile(A), 3000)
    check('carrying a keycard 10 blocks from a cop: not hostile', !far, await info(A))
    check('...3 blocks from it: hostile (frisked)', frisk && logs.cops.has(/why=frisk-keycard/), logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / '))
    await calm(A)
    await cmd(`zzjail ${A} strip`)
    // Sparks' Scrap Metal (2026-10-20, the owner's answer): contraband only held out in front of a guard, never frisked.
    await sleep(1000)
    logs.cops.mark()
    await cmd(`zzjail ${A} give scrap`)
    await sleep(3000)
    const scrapPocket = await info(A)
    check('...the Scrap Metal in the pockets 3 blocks from it: not hostile (never frisked)', /scrap:/.test(field(scrapPocket, 'items')) && !(await hostile(A)) && !logs.cops.has(/why=frisk/), `${scrapPocket} | ${logs.cops.since().split('\n').filter(x => /hostile|frisk/.test(x)).join(' / ')}`)
    await calm(A)
    await cmd(`zzjail ${A} strip`)

    // ---------- contraband held out (owner, 2026-10-15: "cops target you if you hold out contraband in front of them"):
    // a keycard in the hand 8 blocks behind a cop's back is safe, the note in the hand in front of it too, the keycard
    // in the hand in front of it isn't (the quest slots, hotbar 6-8) ----------
    const questBrick = () => [5, 6, 7].filter(i => { const it = a.inventory.slots[36 + i]; return it && it.name === 'brick' })
    const giveQuest = async kind => {
      const before = questBrick()
      await cmd(`zzjail ${A} give ${kind}`)
      const got = await until(() => { const s = questBrick().find(i => !before.includes(i)); return s === undefined ? false : { s } }, 2000, 100)
      return got ? got.s : -1
    }
    await state(A, 'off')
    a.setQuickBarSlot(0)
    await sleep(300)
    const noteSlot = await giveQuest('note')
    const cardSlot = await giveQuest('keycard')
    check('setup: the note and the keycard land in the quest slots (hotbar 6-8), not the held one', noteSlot >= 5 && cardSlot >= 5, `note ${noteSlot} card ${cardSlot} ${(await cmd(`zzjail ${A} info`))}`)
    await copTo('poldesk', 205.5, 65, 160.5)
    await until(async () => /loaded=yes at=20/.test(await cop('poldesk')), 12000, 500)
    const pd = await copAt('poldesk')
    await rotate('poldesk', 90) // facing -x: A (+x) is behind its back
    await jtp(A, (pd[0] + 8).toFixed(1), 65, pd[2].toFixed(1), 90)
    if (cardSlot >= 5) a.setQuickBarSlot(cardSlot)
    // Turned again just before A counts (a cop that chased A a moment ago turned back to it once: 2026-10-20).
    await sleep(1200)
    await rotate('poldesk', 90)
    await sleep(300)
    await state(A, 'in')
    await calm(A)
    logs.cops.mark()
    await sleep(2500)
    check('the keycard in the hand 8 blocks behind a cop\'s back: not hostile', !(await hostile(A)) && !logs.cops.has(/why=seen-held/), `${await cop('poldesk')} ${await info(A)}`)
    if (noteSlot >= 5) a.setQuickBarSlot(noteSlot)
    await rotate('poldesk', -90) // facing +x: A in front of it
    await sleep(2500)
    check('...the note in the hand in front of it (the keycard in a quest slot): not hostile (the note isn\'t contraband)', !(await hostile(A)), `${await cop('poldesk')} ${await info(A)}`)
    logs.cops.mark()
    since = Date.now()
    if (cardSlot >= 5) a.setQuickBarSlot(cardSlot)
    const heldH = await until(() => hostile(A), 3000)
    check('...the keycard in the hand in front of it: hostile (why=seen-held-keycard), SPOTTED "saw the Keycard in your hand"', heldH && logs.cops.has(/why=seen-held-keycard/) && said(a, /saw the Keycard in your hand/, since), `${logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / ')} | ${t.text(a, since)}`)
    await calm(A)
    a.setQuickBarSlot(0)
    await cmd(`zzjail ${A} strip`)
    // Sparks' weapon parts (2026-10-20, the owner's answer: the sharp/metal ones are contraband in the hand): the Duct Tape
    // held out in front of the cop is fine, the Scrap Metal isn't.
    const tapeSlot = await giveQuest('tape')
    const scrapSlot = await giveQuest('scrap')
    await rotate('poldesk', -90)
    if (tapeSlot >= 5) a.setQuickBarSlot(tapeSlot)
    await sleep(300)
    await calm(A)
    logs.cops.mark()
    await sleep(2500)
    check('Sparks\' parts: the Duct Tape in the hand in front of a cop: not hostile (not contraband)', tapeSlot >= 5 && !(await hostile(A)) && !logs.cops.has(/why=seen-held/), `tape ${tapeSlot} scrap ${scrapSlot} ${await cop('poldesk')} ${await info(A)}`)
    logs.cops.mark()
    since = Date.now()
    if (scrapSlot >= 5) a.setQuickBarSlot(scrapSlot)
    const heldS = await until(() => hostile(A), 3000)
    check('...the Scrap Metal in the hand in front of it: hostile (why=seen-held-scrap), "saw the Scrap Metal in your hand"', scrapSlot >= 5 && heldS && logs.cops.has(/why=seen-held-scrap/) && said(a, /saw the Scrap Metal in your hand/, since), `${logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / ')} | ${t.text(a, since)}`)
    await calm(A)
    a.setQuickBarSlot(0)
    await cmd(`zzjail ${A} strip`)
    await copTo('poldesk', 220.5, 65, 304.5)

    // ---------- the yard's Gun Shop: keycard-only and restricted (owner, 2026-10-20: "the gun shop is supposed to be
    // keycard access only in the prison, and if a cop sees you inside the area while passing by, you get targeted").
    // The WALK guard (its walkway passes the windows) is off the roster for the first parts, the desk guard is the
    // watcher there, and the stray time is long meanwhile (it stands far from its desk) ----------
    await cmd('zzjailroster yardn yards w5 w67 hallb poldesk poloffice gate lot')
    await cmd('zzcfgtime jailcop::stray::time 120 seconds')
    const pdId = await copId('poldesk')
    const watchFrom = async (x, z, yaw) => {
      await copTo('poldesk', x, 65, z)
      await until(async () => { const p = await copAt('poldesk'); return p && Math.hypot(p[0] - x, p[2] - z) < 1.5 }, 8000, 300)
      await rotate('poldesk', yaw)
      await sleep(500)
    }
    await state(A, 'off')
    await cmd(`zzjail ${A} strip`)
    a.setQuickBarSlot(0)
    await state(L, 'off')
    await jtp(L, 300.5, 65, 274.5, 0) // keeps the shop's chunks loaded
    await jtp(A, 301.5, 65, 252.5, 0)
    await watchFrom(301.5, 268.5, 180)
    const sw1 = await cmd(`zzjailsees poldesk ${A}`)
    check('the Gun Shop through its window, straight on: vanilla line of sight blocked, only glass between (los=false glass=true win=true), the door shut', /zone=gunshop/.test(sw1) && /los=false/.test(sw1) && /glass=true/.test(sw1) && /win=true/.test(sw1) && !(await t.doorOpen('gunshop')), `${sw1} | ${await t.door('gunshop')}`)
    await jtp(A, 313.5, 65, 252.5, 0)
    await watchFrom(313.5, 268.5, 180)
    const sw2 = await cmd(`zzjailsees poldesk ${A}`)
    check('...behind its wall (not a window): hidden (glass=false win=false)', /glass=false/.test(sw2) && /win=false/.test(sw2), sw2)
    // Live: facing away, then turned to the window.
    await jtp(A, 301.5, 65, 252.5, 0)
    await watchFrom(301.5, 268.5, 0)
    await state(A, 'in')
    await calm(A)
    logs.cops.mark()
    since = Date.now()
    await sleep(1800)
    const awayH = await hostile(A)
    await rotate('poldesk', 180)
    const winH = await until(() => logs.cops.has(new RegExp(`hostile ${A} \\S+ why=seen-restricted by=${pdId} zone=gunshop`)), 2500, 100)
    check('...live: the guard facing away 1.8 s: not hostile; turned to the window: hostile at once (zone=gunshop), SPOTTED "in the Gun Shop", the door still shut', !awayH && winH && said(a, /saw you in the Gun Shop/, since) && !(await t.doorOpen('gunshop')), `${awayH} ${winH} | ${logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / ')} | ${t.text(a, since).slice(0, 200)}`)
    // Anywhere in front (owner, 2026-10-20: "while passing by"): the guard facing along the walkway (west), the inmate 85
    // degrees to its side through the window, outside the old 75-degree cone.
    await rotate('poldesk', 0)
    await calm(A)
    await state(A, 'off')
    await jtp(A, 300.1, 65, 252.5, 0)
    await sleep(400)
    await rotate('poldesk', 90)
    await sleep(500)
    await state(A, 'in')
    await calm(A)
    logs.cops.mark()
    const sideH = await until(() => logs.cops.has(new RegExp(`hostile ${A} \\S+ why=seen-restricted by=${pdId} zone=gunshop`)), 3000, 100)
    check('...85 degrees to the side of a guard facing along the walkway (outside the old 75-degree cone): hostile at one look', sideH, `${await cop('poldesk')} ${await cmd(`zzjailsees poldesk ${A}`)}`)
    await rotate('poldesk', 0)
    await calm(A)
    await jtp(A, 301.5, 65, 252.5, 0)
    // One look: the guard glancing at the window 300 ms of every second.
    await rotate('poldesk', 0)
    await calm(A)
    await sleep(800)
    await calm(A)
    let flickH = false
    for (let i = 0; i < 6 && !flickH; i++) {
      await rotate('poldesk', 180)
      await sleep(300)
      await rotate('poldesk', 0)
      await sleep(700)
      flickH = await hostile(A)
    }
    check('...one look: a guard glancing at the window (300 ms of every second) spots the inmate inside', flickH, await info(A))
    await calm(A)
    // The control: contraband held out needs two looks in a row, so the same glances never spot a keycard in the hand.
    await state(A, 'off')
    const cardG = await giveQuest('keycard')
    if (cardG >= 5) a.setQuickBarSlot(cardG)
    await jtp(A, 305.5, 65, 266.5, 0)
    const toA = yawTo([316.5, 65, 268.5], [305.5, 65, 266.5])
    await watchFrom(316.5, 268.5, toA + 180)
    await state(A, 'in')
    await calm(A)
    await sleep(800)
    let flickHeld = false
    for (let i = 0; i < 6 && !flickHeld; i++) {
      await rotate('poldesk', toA)
      await sleep(300)
      await rotate('poldesk', toA + 180)
      await sleep(700)
      flickHeld = await hostile(A)
    }
    check('...the control: the keycard held out on the walkway, the same glances: not hostile (held contraband still needs two looks in a row)', !flickHeld && cardG >= 5, `${cardG} ${await info(A)}`)
    // The door opened with a keycard in a guard's view is an act (the owner's answer, 2026-10-20), like the police doors.
    a.setQuickBarSlot(0)
    await state(A, 'off')
    await jtp(A, 319.5, 65, 261.5, 90)
    await watchFrom(316.5, 268.5, 180)
    await state(A, 'in')
    await calm(A)
    await sleep(1200)
    const preAct = await hostile(A)
    logs.cops.mark()
    await t.walk(a, [[316.5, 260.5]], 3000)
    const gOpen = await until(() => t.doorOpen('gunshop'), 1500)
    const actH = await until(() => logs.cops.has(new RegExp(`hostile ${A} \\S+ why=seen-act:reader by=${pdId}`)), 3000, 100)
    check('...opening its door with a keycard in a guard\'s view: the door opens, and it\'s an act (why=seen-act:reader)', !preAct && gOpen && actH, `${preAct} ${gOpen} | ${logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / ')}`)
    await calm(A)
    await state(A, 'off')
    await cmd(`zzjail ${A} strip`)
    await copTo('poldesk', 220.5, 65, 304.5)
    // The WALK guard back on the roster. (An inmate in the prison first: the WALK guard is only made while someone is
    // in. L by its first point, then by the shop or on the walkway's middle: simulation distance 6 chunks.)
    await into(A, 305.5, 65, 250.5, 0)
    await cmd('zzjailroster yardn yards walk w5 w67 hallb poldesk poloffice gate lot')
    await jtp(L, 182.5, 65, 308.5, 0)
    const walkUp = await until(async () => /loaded=yes/.test(await cop('walk')), 45000, 1000)
    // A calm guard that ends up inside goes home (out of place: jcopOutOfPlace's Gun Shop rule). Checked first, while
    // this WALK guard is new: after a chase (the hunt below) Sentinel teleports a stuck guard back to its path itself,
    // which would stand in for the stray rule. The spot is in the shop's east end, 7.6 blocks from the route's east leg
    // (WALK_10 at 336.5, 258.5), inside the route's 12-block radius: only the Gun Shop rule makes it out of place there.
    // The guard is held there (Citizens' navigator speed 0.01; back to 1 after): left to walk, it heads for its next
    // waypoint along the shop's front wall and leaves that radius by itself (found 2026-10-20: then the radius rule
    // moved it home with the Gun Shop rule removed, and the check couldn't tell).
    const inShop = p => p && p[0] >= 292 && p[0] < 332 && p[2] >= 239 && p[2] < 258
    const walkCop = await copId('walk')
    await state(A, 'off')
    await cmd('zzcfgtime jailcop::stray::time 20 seconds')
    await cmd(`zzconsole npc speed 0.01 --id ${walkCop}`)
    await sleep(1500)
    logs.cops.mark()
    const tMove = Date.now()
    await copTo('walk', 329.5, 65, 255.5)
    await jtp(L, 330.5, 65, 271.5, 0) // on the walkway by the shop, so its east end ticks
    const inW = await until(async () => { const p = await copAt('walk'); return inShop(p) ? p : null }, 8000, 500)
    let farW = 0 // the farthest it got from where it was put (it must stay inside the route's radius)
    const strayW = await until(async () => {
      if (logs.cops.has(/stray walk /)) return true
      const p = await copAt('walk')
      if (inShop(p)) farW = Math.max(farW, Math.hypot(p[0] - 329.5, p[2] - 255.5))
      return false
    }, 35000, 500)
    const strayS = (Date.now() - tMove) / 1000
    await jtp(L, 182.5, 65, 308.5, 0) // the route's first point, where the stray rule sends it
    const homeW = await until(async () => { const p = await copAt('walk'); return p && !inShop(p) }, 12000, 500)
    await cmd(`zzconsole npc speed 1 --id ${walkCop}`)
    check('a calm guard held in the Gun Shop\'s east end (inside its route\'s radius) is out of place: the stray rule takes it home in 15-30 s (`stray walk`)', inShop(inW) && farW < 2 && strayW && strayS >= 15 && strayS <= 30 && homeW, `${inW} (moved ${farW.toFixed(1)} while inside) -> ${await copAt('walk')}; stray logged=${strayW} after ${strayS.toFixed(1)} s | ${logs.cops.since().split('\n').filter(x => /stray|walk/.test(x)).join(' / ')}`)
    // Hunted in the closed shop, the WALK guard outside it: it never gets in, and nobody loses the guards in there (a
    // no-lose zone).
    await into(A, 305.5, 65, 250.5, 0)
    await copTo('walk', 316.5, 65, 264.5)
    await sleep(1000)
    await jtp(L, 240.5, 65, 275.5, 0)
    await cmd(`djailcops hostile ${A}`)
    await sleep(500)
    const walkHunts = await hunts('walk', A)
    let walkIn = false
    const t6 = Date.now()
    while (Date.now() - t6 < 12000) {
      const p = await copAt('walk')
      if (p && p[0] >= 292 && p[0] < 332 && p[2] >= 239 && p[2] < 258) walkIn = true
      await sleep(500)
    }
    check('hunted in the closed Gun Shop: the WALK guard hunting outside never gets in (12 s)', walkUp && walkHunts && !walkIn, `${walkUp} ${walkHunts} ${await cop('walk')}`)
    await sleep(13000)
    check('...and the inmate is still hunted 25 s later (no losing them in the Gun Shop)', await hostile(A), await info(A))
    await calm(A)
    await state(A, 'off')
    // The owner's scenario: the WALK guard on its real patrol passing the windows.
    const walkId = await copId('walk')
    await into(A, 301.5, 65, 252.5, 0)
    logs.cops.mark()
    const t8 = Date.now()
    const byWalk = await until(() => logs.cops.has(new RegExp(`hostile ${A} \\S+ why=seen-restricted by=${walkId} zone=gunshop`)), 120000, 1000)
    check('the WALK guard on its patrol spots an inmate standing in the Gun Shop through its window ("while passing by")', byWalk, `${Date.now() - t8} ms ${await cop('walk')}`)
    await calm(A)
    await state(A, 'off')

    // ---------- the lose-cops grace (owner, 2026-10-20: "once the player loses the cops after getting the keycard, the
    // other cops wont arrest if they see the player again, unless he is actively holding contraband in his hand while in
    // vision of the cop"); lose::time is 3 s here ----------
    await cmd('zzcfgtime jailcop::lose::time 3 seconds')
    await state(L, 'off')
    await jtp(L, 215.5, 65, 165.5, 0)
    await copTo('poldesk', 205.5, 65, 160.5)
    await until(async () => /loaded=yes at=20/.test(await cop('poldesk')), 12000, 500)
    await rotate('poldesk', 0) // facing +z
    a.setQuickBarSlot(0)
    const cardR = await giveQuest('keycard')
    await jtp(A, 225.5, 65, 160.5, 90)
    await state(A, 'in')
    await calm(A)
    logs.cops.mark()
    since = Date.now()
    await cmd(`zzjail ${A} hostile`)
    const graced = await until(async () => field(await info(A), 'grace') === 'yes', 8000, 300)
    check('hunted with a keycard on, then lost the guards: the grace ("They won\'t search you for the Keycard now", logged)', graced && !(await hostile(A)) && said(a, /won't search you for the Keycard/, since) && logs.cops.has(new RegExp(`grace ${A} \\S+ kinds=keycard`)), `${await info(A)} | ${t.text(a, since).slice(0, 200)}`)
    logs.cops.mark()
    await jtp(A, 207.5, 65, 160.5, 90) // 2 blocks beside the guard (not in front of it)
    await sleep(2500)
    check('...graced: the keycard in the pockets 2 blocks from a guard is not searched (frisk-skip, not hostile)', !(await hostile(A)) && logs.cops.has(new RegExp(`frisk-skip ${A} \\S+ keycard grace`)) && !logs.cops.has(/why=frisk/), logs.cops.since().split('\n').filter(x => /frisk|hostile/.test(x)).join(' / '))
    if (cardR >= 5) a.setQuickBarSlot(cardR)
    await jtp(A, 205.5, 65, 168.5, 0) // 8 blocks in front of it
    const heldG = await until(() => hostile(A), 3000)
    check('...but the keycard held out in front of a guard still gets you hunted (why=seen-held-keycard)', heldG && logs.cops.has(/why=seen-held-keycard/), logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / '))
    await calm(A)
    a.setQuickBarSlot(0)
    const stillG = field(await info(A), 'grace') === 'yes'
    await cmd(`dprison catch ${A}`)
    await sleep(2000)
    check('...a staff calm keeps it; a catch ends it (grace=no)', stillG && field(await info(A), 'grace') === 'no', await info(A))
    await sleep(1500) // past the 3 s after a catch
    await state(A, 'off')
    await giveQuest('keycard')
    await jtp(A, 207.5, 65, 160.5, 90)
    logs.cops.mark()
    await state(A, 'in')
    const frAgain = await until(() => hostile(A), 3000)
    check('...after the catch the keycard in the pockets is found again (why=frisk-keycard)', frAgain && logs.cops.has(/why=frisk-keycard/), logs.cops.since().split('\n').filter(x => /hostile|frisk/.test(x)).join(' / '))
    await calm(A)
    await cmd(`zzjail ${A} strip`)
    await cmd('zzcfgtime jailcop::lose::time 20 seconds')
    await copTo('poldesk', 220.5, 65, 304.5)

    // ---------- gunshots at range: 1 heart, some miss, never the calm inmate next to the target ----------
    await into(A, 84.5, 65, 150.5, 0)
    await into(B, 86.0, 65, 150.5, 0)
    await cmd(`zzhp ${A} 20`)
    await cmd(`zzhp ${B} 20`)
    await sleep(1000)
    const keep = async d => {
      const c = await copAt('hallb')
      if (!c) return
      const dir = c[2] < 155 ? 1 : -1
      const z = (c[2] + dir * d).toFixed(1)
      await jtp(A, 84.5, 65, z, dir > 0 ? 180 : 0)
      await jtp(B, 86.0, 65, z, dir > 0 ? 180 : 0)
    }
    await until(async () => /loaded=yes/.test(await cop('hallb')), 12000, 500)
    await keep(14)
    await cmd(`djailcops hostile ${A}`)
    logs.cops.mark()
    const hpLog = []
    let lastHp = a.health
    const onHp = () => { if (a.health < lastHp) hpLog.push(lastHp - a.health); lastHp = a.health }
    a.on('health', onHp)
    const bHp0 = b.health
    const tg = Date.now()
    while (Date.now() - tg < 36000) {
      await keep(14)
      if (a.health <= 8) { await cmd(`zzhp ${A} 20`); lastHp = 20 }
      const n = (logs.cops.since().match(new RegExp(`shot id=\\d+ ${A}`, 'g')) || []).length
      if (n >= 16) break
      await sleep(400)
    }
    a.removeListener('health', onHp)
    const shots = logs.cops.since().split('\n').filter(x => new RegExp(`shot id=\\d+ ${A}`).test(x))
    const hits = shots.filter(x => /hit=true/.test(x)).length
    const misses = shots.filter(x => /hit=false/.test(x)).length
    check('a hostile inmate 14 blocks away is shot: some hit, some miss', shots.length >= 8 && hits >= 1 && misses >= 1, `${shots.length} shots, ${hits} hits, ${misses} misses`)
    check('...each hit takes 1 heart (2 HP)', hpLog.length >= 1 && hpLog.every(d => d === 2), JSON.stringify(hpLog))
    check('...the calm inmate standing next to the target is never hurt', b.health >= bHp0 && !(await hostile(B)), `${bHp0} -> ${b.health}`)

    // ---------- the taser at 5 blocks: the stun; stunned within 2.5 blocks: arrested ----------
    await cmd(`zzhp ${A} 20`)
    const b0 = await t.bal(A)
    logs.cops.mark()
    let mod = ''
    since = Date.now()
    const tt = Date.now()
    while (Date.now() - tt < 25000) {
      await keep(5)
      if (logs.cops.has(new RegExp(`taser id=\\d+ ${A} .*hit=true`))) {
        // Stunned: straight up to the cop (the arrest needs the stun and 2.5 blocks), then read the modifier.
        await keep(1.8)
        mod = await stunMod(A)
        break
      }
      await sleep(250)
    }
    check('a taser hit at ~5 blocks: stunned (the movement modifier -0.6)', /-0\.6/.test(mod), `${mod} ${logs.cops.since().split('\n').filter(x => /taser/.test(x)).join(' / ')}`)
    // A tased grab is a 2.5 s clock within 2.5 blocks (the owner's numbers, 2026-10-20), the CUFFING bar meanwhile. The
    // bot stays next to the cop for it (a standing bot, a cop that moves: it got 2.6 away once and the grab broke).
    const ta = Date.now()
    while (Date.now() - ta < 6000 && !logs.cops.has(new RegExp(`arrest ${A} `))) { await keep(1.4); await sleep(200) }
    const arrested = logs.cops.has(new RegExp(`arrest ${A} .*stunned=true`))
    await sleep(1600)
    let s = await info(A)
    check('...stunned within 2.5 blocks of the cop: arrested (ARRESTED, a cell, no money lost)', arrested && said(a, /ARRESTED/, since) && VET_CELLS.includes(field(s, 'cell')) && (await t.bal(A)) === b0 && a.health > 0, `${s} ${logs.cops.since().split('\n').filter(x => /arrest/.test(x)).join(' / ')}`)
    check('...the stunned grab shows the bar (CUFFING) and takes ~2.5 s (grab= in the log)', said(a, /CUFFING/, since) && logs.cops.has(new RegExp(`arrest ${A} .*stunned=true grab=(2\\.[5-9]|3(\\.\\d)?)(\\s|$)`)), `${logs.cops.since().split('\n').filter(x => /grab|arrest/.test(x)).join(' / ')}`)
    check('...the stun modifier gone after the arrest', !/-0\.6/.test(await stunMod(A)), await stunMod(A))
    await calm(B)

    // ---------- the arrest clock and the handcuffs (owner, 2026-10-20: "make the guards hold hand cuffs while arresting
    // you ... and show a status bar (like how it shows when picking something up) on the timer while the guard is
    // arresting you"); a 4 s clock here so each part shows ----------
    await cmd('zzcfgset jailcop::taser::min 99')
    await cmd('zzcfgset jailcop::gun::range 0')
    await cmd('zzcfgtime jailcop::arrest::grab 4 seconds')
    await sleep(3500) // nothing makes a prisoner hostile in the 3 s after a catch
    const equip = []
    const onEquip = p => equip.push({ t: Date.now(), id: p.entityId, s: JSON.stringify(p.equipments) })
    a._client.on('entity_equipment', onEquip)
    // The guard's entity as the bot sees it: the player-type entity nearest its spot (never by username).
    const copEntId = async route => {
      const at = await copAt(route)
      if (!at) return null
      const e = Object.values(a.entities).filter(x => x.type === 'player' && ![A, B, L].includes(x.username))
        .sort((p, q) => p.position.distanceTo(new t.Vec3(...at)) - q.position.distanceTo(new t.Vec3(...at)))[0]
      return e ? e.id : null
    }
    const hc = await copHere('hallb', 86.5, 140.5)
    await into(A, hc[0].toFixed(1), 65, (hc[2] + 1.2).toFixed(1), 180)
    await cmd(`zzhp ${A} 20`)
    await sleep(800)
    logs.cops.mark()
    since = Date.now()
    await cmd(`djailcops hostile ${A}`)
    const grabbed = await until(() => logs.cops.has(new RegExp(`grab ${A} \\S+ by=\\d+`)), 3000, 100)
    const cuffs = await until(async () => /held=cuffs/.test(await cop('hallb')), 1500, 100)
    const hcEnt = await copEntId('hallb')
    const sentCuffs = await until(() => equip.some(x => x.id === hcEnt && /jail_cuffs/.test(x.s)), 1500, 100)
    check('a hostile inmate within 2 blocks: the grab starts, the guard holds handcuffs (the client is sent them)', grabbed && cuffs && sentCuffs, `${grabbed} ${await cop('hallb')} ent=${hcEnt} ${equip.filter(x => x.id === hcEnt).map(x => x.s.slice(0, 160)).join(' / ')}`)
    await sleep(2200)
    const frames = new Set()
    for (const m of t.text(a, since).split(' | ')) { const f = /CUFFING.*?([▮▯]{5})/.exec(m); if (f) frames.add(f[1]) }
    check('...the bar fills (CUFFING, 3+ meter frames, a countdown in seconds)', frames.size >= 3 && said(a, /CUFFING.*get away!.*\d(\.\d)?s/, since), `${[...frames].join(' ')} | ${t.text(a, since).slice(0, 200)}`)
    // A knife hit on the cuffing guard staggers it: no other hunter in reach, so the grab breaks. The ranges go to 0 at
    // once, so no new grab starts when the stagger ends.
    logs.cops.mark()
    since = Date.now()
    await hitCop(await copAt('hallb'), A, 1)
    await cmd('zzcfgset jailcop::arrest::range 0')
    await cmd('zzcfgset jailcop::arrest::grab-range 0')
    const broke = await until(() => said(a, /broke free/, since), 2000, 100)
    check('...a melee hit on the cuffing guard (staggered): "You broke free!", no arrest', broke && logs.cops.has(new RegExp(`grab-break ${A} \\S+ why=none`)) && !logs.cops.has(new RegExp(`arrest ${A}`)), logs.cops.since().split('\n').filter(x => /grab|arrest|hit id/.test(x)).join(' / '))
    const tGun = Date.now()
    const gunBack = await until(async () => /held=gun/.test(await cop('hallb')), 4000, 200)
    const gunMs = Date.now() - tGun
    await sleep(600)
    const hcEnt2 = await copEntId('hallb')
    const sentGun = equip.some(x => x.t >= tGun - 200 && x.id === hcEnt2 && /floats/.test(x.s) && !/jail_cuffs/.test(x.s))
    check('...out of reach: the guard puts the cuffs away (its gun again within ~2.5 s)', gunBack && gunMs < 3000 && sentGun, `${gunMs} ms ${await cop('hallb')} ${equip.filter(x => x.id === hcEnt2).map(x => x.s.slice(0, 120)).join(' / ')}`)
    // Back in reach for the whole clock: arrested.
    await cmd('zzcfgset jailcop::arrest::range 2.5')
    await cmd('zzcfgset jailcop::arrest::grab-range 2')
    const hc2 = await copAt('hallb')
    await jtp(A, hc2[0].toFixed(1), 65, (hc2[2] + 1.2).toFixed(1), 180)
    logs.cops.mark()
    since = Date.now()
    const arr3 = await until(() => logs.cops.has(new RegExp(`arrest ${A} \\S+ .*grab=4(\\.\\d)?(\\s|$)`)), 8000, 100)
    const arrAt = Date.now()
    const keptCuffs = /held=cuffs/.test(await cop('hallb'))
    await sleep(1600)
    check('...back in reach for the whole clock: arrested (ARRESTED), grab=4 in the log', arr3 && said(a, /ARRESTED/, since), logs.cops.since().split('\n').filter(x => /grab|arrest/.test(x)).join(' / '))
    const gun3 = await until(async () => /held=gun/.test(await cop('hallb')), 4000, 200)
    check('...the guard keeps the cuffs through the catch, then its gun again', keptCuffs && gun3 && Date.now() - arrAt < 5800, `${keptCuffs} ${gun3} ${await cop('hallb')}`)
    a._client.removeListener('entity_equipment', onEquip)
    await cmd('zzcfgset jailcop::taser::min 2.5')
    await cmd('zzcfgset jailcop::gun::range 24')
    await cmd('zzcfgtime jailcop::arrest::grab 2 seconds')

    // ---------- Sentinel's own hits never land ----------
    await cmd('zzcfgset jailcop::arrest::range 0')
    await cmd('zzcfgset jailcop::arrest::grab-range 0')
    await cmd('zzcfgset jailcop::taser::min 99')
    await cmd('zzcfgset jailcop::gun::range 0')
    await sleep(3500)
    const hb = await copHere('hallb', 86.5, 140.5)
    await into(A, hb[0].toFixed(1), 65, (hb[2] + 1.5).toFixed(1), 180)
    await cmd(`zzhp ${A} 20`)
    await sleep(800)
    logs.cops.mark()
    const hpS = a.health
    await cmd(`djailcops hostile ${A}`)
    await sleep(9000)
    check('a hostile inmate hugging a cop: Sentinel\'s hits are all cancelled (logged), no damage', logs.cops.has(new RegExp(`sentinel-hit-cancelled id=\\d+ victim=${A}`)) && a.health >= hpS, `${(logs.cops.since().match(/sentinel-hit-cancelled/g) || []).length} cancelled, hp ${hpS} -> ${a.health}`)
    await calm(A)
    await cmd('zzcfgset jailcop::arrest::range 2.5')
    await cmd('zzcfgset jailcop::arrest::grab-range 2')
    await cmd('zzcfgset jailcop::taser::min 2.5')
    await cmd('zzcfgset jailcop::gun::range 24')

    // ---------- the knife: staggered, two hits down a cop, a keycard, no death message, back after 60 s ----------
    await copTo('poldesk', 220.5, 65, 304.5)
    await copHere('poldesk', 222.5, 300.5)
    await sleep(1000)
    await rotate('poldesk', 0)
    await sleep(500)
    const dk = await copAt('poldesk')
    await into(A, dk[0].toFixed(2), 65, (dk[2] - 1.2).toFixed(2), 0)
    await sleep(3500)
    logs.cops.mark()
    logs.prison.mark()
    since = Date.now()
    const deskId = await copId('poldesk')
    await hitCop(dk, A, 6)
    await sleep(900)
    const after1 = logs.cops.since()
    await hitCop(dk, A, 6)
    await sleep(1200)
    const kl = logs.cops.since()
    check('a melee hit on a cop: hostile, the cop staggered (no grab or arrest)', /why=hit/.test(after1) && /melee=true/.test(after1) && !new RegExp(`arrest ${A}`).test(kl), kl.split('\n').filter(x => /hit id|hunt|arrest|down/.test(x)).join(' / '))
    check('...two hits a second apart down it, a keycard drops', /down id=/.test(kl) && logs.prison.has(/drop keycard why=cop/), kl.split('\n').filter(x => /down/.test(x)).join(' / '))
    check('...no death message for the cop', !t.text(a, since).includes('Prison Guard'), t.text(a, since).slice(0, 300))
    const drop = Object.values(a.entities).filter(e => e.name === 'item').sort((x, y) => x.position.distanceTo(a.entity.position) - y.position.distanceTo(a.entity.position))[0]
    if (drop) await jtp(A, drop.position.x.toFixed(2), drop.position.y.toFixed(2), drop.position.z.toFixed(2), 0)
    const got = await until(async () => /keycard:/.test(field(await info(A), 'items')), 4000)
    check('...the inmate picks the keycard up (into the pockets)', got, await info(A))
    check('...the downed cop is still known (same id) while it waits to respawn', (await copId('poldesk')) === deskId, await cop('poldesk'))
    const downAt = Date.now()
    await calm(A)
    await cmd(`zzjail ${A} strip`)

    // ---------- low health slows; a hostile logout is a catch at the rejoin; leaving drops the targets ----------
    await into(A, 205.5, 65, 150.5, 0)
    await cmd(`zzhp ${A} 6`)
    const slow = await until(async () => /-0\.2/.test(await lowMod(A)), 1500, 150)
    check('at 3 hearts or less: the low-health slow (-20%)', slow, await lowMod(A))
    await cmd(`zzhp ${A} 20`)
    const fast = await until(async () => !/-0\.2/.test(await lowMod(A)), 1500, 150)
    check('...above it: gone', fast, await lowMod(A))
    // The lose-cops grace ends at a rejoin (lost with a keycard, calm, out and back in).
    await state(A, 'off')
    await cmd(`zzjail ${A} give keycard`)
    await jtp(A, ...HIDE, 0)
    await state(A, 'in')
    await calm(A)
    await cmd('zzcfgtime jailcop::lose::time 3 seconds')
    await cmd(`zzjail ${A} hostile`)
    const gR = await until(async () => field(await info(A), 'grace') === 'yes', 8000, 300)
    await cmd('zzcfgtime jailcop::lose::time 20 seconds')
    await t.drop(A)
    await sleep(1500)
    await t.newBot(A)
    await sleep(2500)
    check('the lose-cops grace ends at a rejoin (grace=no after logging back in)', gR && field(await info(A), 'grace') === 'no', await info(A))
    await cmd(`zzjail ${A} strip`)
    const hb2 = await copHere('hallb', 86.5, 160.5)
    await into(A, hb2[0].toFixed(1), 65, (hb2[2] + 6).toFixed(1), 180)
    await cmd(`djailcops hostile ${A}`)
    await sleep(500)
    logs.cops.mark()
    logs.prison.mark()
    await t.drop(A)
    await sleep(1500)
    check('a hostile inmate logs out: the cops drop the target', logs.cops.has(/why=quit/) && !(await hunts('hallb', A)), await cop('hallb'))
    const a2 = await t.newBot(A)
    await sleep(3500)
    s = await info(A)
    check('...the rejoin is a catch (BACK TO YOUR CELL)', logs.prison.has(new RegExp(`catch ${A} \\S+ quit`)) && VET_CELLS.includes(field(s, 'cell')) && said(a2, /BACK TO YOUR CELL/), s)
    const hb3 = await copHere('hallb', 86.5, 160.5)
    await into(A, hb3[0].toFixed(1), 65, (hb3[2] + 6).toFixed(1), 180)
    await sleep(3000) // nothing makes a prisoner hostile in the 3 s after a catch
    const hr = await cmd(`djailcops hostile ${A}`)
    await sleep(500)
    const huntedBefore = await hunts('hallb', A)
    await cmd(`dprison free ${A}`)
    await sleep(1800)
    check('leaving the prison (freed): every cop drops the target', huntedBefore && !(await hunts('hallb', A)) && !(await hostile(A)), `${hr} | ${await cop('hallb')}`)

    // ---------- strays: a wall cop led down is home 20 s later; the W5 cop walking round T5's cab never is ----------
    check('the W5 cop walking its route (round T5\'s cab) was never moved as a stray', !allLog.has(/stray w5/), allLog.since().split('\n').filter(x => /stray/.test(x)).join(' / '))
    await state(L, 'off')
    await jtp(L, 259.5, 65, 140.5, 90) // west of the yard's bleachers (x 265..276): open ground
    logs.cops.mark()
    await until(async () => /loaded=yes/.test(await cop('w5')), 12000, 500)
    const srv = require('../prisonlib').logTail('../../../logs/latest')
    srv.mark()
    await copTo('w5', 262.5, 65, 140.5) // not 268.5: inside the bleachers, where it suffocated and went down
    await sleep(400)
    const down = await copAt('w5')
    const moved = srv.has(/Prison Guard teleported to jailbreak at 262.5, 65, 140.5/)
    const tw = Date.now()
    const back = await until(async () => { const p = await copAt('w5'); return p && p[1] >= 77 }, 30000, 500)
    // Home by the stray rule (20 s), or sooner by Sentinel's own return to its path (a stuck return teleports).
    check('a wall cop led down to the yard is back on its route within ~20 s', moved && back, `teleported=${moved} down=${down} -> ${await copAt('w5')} after ${Date.now() - tw} ms, ${logs.cops.has(/stray w5/) ? 'by the stray rule' : 'by Sentinel'}`)

    // ---------- an untracked Prison Guard is swept ----------
    await into(B, 205.5, 65, 150.5, 0)
    logs.cops.mark()
    await cmd('npc create Prison Guard --at 207,65,152,jailbreak --type PLAYER')
    const swept = await until(() => logs.cops.has(/sweep id=/), 16000, 500)
    check('an untracked "Prison Guard" NPC is swept', swept && /known=10/.test(await cmd('zzjailcops')), `${logs.cops.since().split('\n').filter(x => /sweep/.test(x)).join(' / ')} ${await cmd('zzjailcops')}`)

    // ---------- the downed cop is back after 60 s ----------
    while (Date.now() - downAt < 58000) await sleep(1000)
    await jtp(L, 222.5, 65, 300.5, 0)
    const respawned = await until(async () => /loaded=yes/.test(await cop('poldesk')) && (await copId('poldesk')) === deskId, 15000, 1000)
    check('the downed cop is back about 60 s later (same id)', respawned, `${await cop('poldesk')} after ${Date.now() - downAt} ms`)

    // ---------- nobody in the prison: the cops are removed (idle-despawn shortened) ----------
    await cmd('zzcfgtime jailcop::idle-despawn 15 seconds')
    for (const n of [A, B]) await state(n, 'off')
    const gone = await until(async () => /known=0/.test(await cmd('zzjailcops')), 45000, 1000)
    check('nobody in the prison for the idle time: every cop removed', gone, await cmd('zzjailcops'))
    console.error(`prison-cops took ${Math.round((Date.now() - start0) / 1000)} s`)
  } finally {
    const walkLeft = await copId('walk') // the Gun Shop stray check slows it: never leave it slowed
    if (walkLeft) await cmd(`zzconsole npc speed 1 --id ${walkLeft}`)
    for (const r of ['yardn', 'lot']) { const id = await copId(r); if (id) await cmd(`zzconsole npc speed 1 --id ${id}`) }
    await cmd('zzcfgtime jailcop::idle-despawn 10 minutes')
    await cmd('zzcfgtime jailcop::arrest::grab 2 seconds')
    await cmd('zzcfgtime jailcop::arrest::stun-grab 2.5 seconds')
    await cmd('zzcfgtime jailcop::lose::time 20 seconds')
    await cmd('zzcfgtime jailcop::stray::time 20 seconds')
    await cmd('zzcfgset jailcop::arrest::range 2.5')
    await cmd('zzcfgset jailcop::arrest::grab-range 2')
    await cmd('zzcfgset jailcop::taser::min 2.5')
    await cmd('zzcfgset jailcop::gun::range 24')
    await cmd('zzcfgreload') // core.sk's rosters (20, the busy 10) and numbers again (the prison switch stays)
    await t.prisonRestore()
    for (const n of [A, B, L]) if (t.bots[n]) await cmd(`zzjail ${n} state off`)
    await t.close()
  }
}
