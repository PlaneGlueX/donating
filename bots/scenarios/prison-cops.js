// The prison guards (jailcops.sk; ESCAPE-SPEC 5 and 7.2-5; owner, 2026-10-14: "If the cop is in range, they try to taze
// then arrest you when closer, if too far they shoot you until they get closer ... Prison cops are level 1 so not that
// good aim"): 10 Citizens + Sentinel cops spawn while someone is in the prison and patrol; only rule-breakers are hunted
// (seen in a restricted place (the police station, the lot), an act in view (a search), contraband right past a cop,
// a hit on a cop), and only by the cops that saw it; the lot is no hiding place, the closed gatehouse is; out of sight
// for 20 s = lost them (not in B1); gunshots at range (1 heart, some miss, never a bystander), the taser's stun, the
// arrest; Sentinel's own hits never land; two knife hits down a cop (staggered meanwhile), a keycard drops, it's back
// after 60 s, no death message; low health slows you; a hostile logout is a catch at the rejoin; strays go home; idle
// cops are removed; an untracked "Prison Guard" is swept.
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

    // ---------- the roster: 10 cops once someone is in the prison ----------
    await cmd('djailcops removeall')
    await sleep(500)
    check('setup: no prison cops', /known=0/.test(await cmd('zzjailcops')), await cmd('zzjailcops'))
    await into(A, 205.5, 65, 150.5, 0)
    const t0 = Date.now()
    const ten = await until(async () => /known=10/.test(await cmd('zzjailcops')), 90000, 2000)
    check('an inmate in the prison: 10 cops known within 90 s', ten, `${await cmd('zzjailcops')} after ${Date.now() - t0} ms`)
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

    // ---------- restricted: the police station ----------
    logs.cops.mark()
    let since = Date.now()
    await into(A, 220.5, 65, 313.5, 180)
    const seen = await until(() => hostile(A), 5000)
    check('in the lobby in front of the desk cop: hostile (seen in a restricted place), SPOTTED', seen && said(a, /SPOTTED/, since) && logs.cops.has(/why=seen-restricted/), logs.cops.since().split('\n').filter(x => /hostile|hunt/.test(x)).join(' / '))
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
    const arrested = await until(() => logs.cops.has(new RegExp(`arrest ${A} .*stunned=true`)), 3000, 100)
    await sleep(1600)
    let s = await info(A)
    check('...stunned within 2.5 blocks of the cop: arrested (ARRESTED, a cell, no money lost)', arrested && said(a, /ARRESTED/, since) && VET_CELLS.includes(field(s, 'cell')) && (await t.bal(A)) === b0 && a.health > 0, `${s} ${logs.cops.since().split('\n').filter(x => /arrest/.test(x)).join(' / ')}`)
    check('...the stun modifier gone after the arrest', !/-0\.6/.test(await stunMod(A)), await stunMod(A))
    await calm(B)

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
    await jtp(L, 266.5, 65, 140.5, 90)
    logs.cops.mark()
    await until(async () => /loaded=yes/.test(await cop('w5')), 12000, 500)
    const srv = require('../prisonlib').logTail('../../../logs/latest')
    srv.mark()
    await copTo('w5', 268.5, 65, 140.5)
    await sleep(400)
    const down = await copAt('w5')
    const moved = srv.has(/Prison Guard teleported to jailbreak at 268.5, 65, 140.5/)
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
    await cmd('zzcfgtime jailcop::idle-despawn 10 minutes')
    await cmd('zzcfgset jailcop::arrest::range 2.5')
    await cmd('zzcfgset jailcop::arrest::grab-range 2')
    await cmd('zzcfgset jailcop::taser::min 2.5')
    await cmd('zzcfgset jailcop::gun::range 24')
    await t.prisonOff()
    for (const n of [A, B, L]) if (t.bots[n]) await cmd(`zzjail ${n} state off`)
    await t.close()
  }
}
