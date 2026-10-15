// The rules inside the prison walls (prison.sk; ESCAPE-SPEC 4.6 and 7.2-7; owner, 2026-10-14: melee PvP inside with
// safe spots and spawn protection, plus "cooldown on killing a player unless they hit first, dont want spam killing"):
// no fighting in Hall A, B1, the south of Hall B and on the parkour crates; melee PvP in the yard downs instead of
// killing, and a guard who sees a fight hunts the attacker; 30 s of protection after the course or a cell opening,
// ended by attacking; the knockout cooldown (one way, per pair, cleared by the victim's hit that lands, not by a swing
// in a no-PvP zone); no damage through the fence; no hit from a non-prison NPC; beds are decoration; no Valet, no
// Grappler, no hit contract for a prisoner; /dsetup prison all ✔ after /dprison setup.
const { start, field, sleep } = require('../prisonlib')

const A = 'PcRulA'
const B = 'PcRulB'
const C = 'PcRulC'
const VET_CELLS = ['n89', 'n96', 'n103', 'n110', 's96', 's103', 's110', 's117']

module.exports = async ({ check }) => {
  const t = await start()
  const { cmd, info, into, state, jtp, said, until, hit, copTo, cop } = t
  // Puts two bots next to each other (a plugin teleport: no teleport immunity), facing each other.
  const pair = async (p, q, x, y, z) => {
    await into(p, x, y, z, 90)
    await into(q, x - 1, y, z, -90)
    await cmd(`zzjail ${p} shield clear`)
    await cmd(`zzjail ${q} shield clear`)
    await sleep(500)
  }
  const lands = async (bot, victim, attacker) => {
    const h0 = bot.health
    await hit(victim, attacker, 1)
    await sleep(700)
    return bot.health < h0
  }
  try {
    await t.prisonOn()
    await t.copsBlind()
    const a = await t.newBot(A)
    const b = await t.newBot(B)
    const c = await t.newBot(C)
    await sleep(1500)
    for (const n of [A, B, C]) { await cmd(`zzclear ${n}`); await cmd(`zzhp ${n} 20`) }
    await sleep(10000) // pvp.sk's join shield and the client's "loaded" wait

    // ---------- no fighting here ----------
    const spots = [['Hall A', 100.5, 65, 198.5], ['B1', 90.5, 58, 59.5], ['the south of Hall B', 84.5, 65, 120.5]]
    for (const [name, x, y, z] of spots) {
      await pair(A, B, x, y, z)
      const since = Date.now()
      const landed = await lands(b, B, A)
      check(`no fighting in ${name}: the hit is cancelled ("No fighting here")`, !landed && said(a, /No fighting here/, since), `hp ${b.health}`)
    }
    await into(A, 366.5, 73, 346.5, 0)
    await into(B, 366.5, 72, 343.5, 180)
    await cmd(`zzjail ${A} shield clear`)
    await cmd(`zzjail ${B} shield clear`)
    await sleep(500)
    let since = Date.now()
    check('no fighting on the parkour crates', !(await lands(b, B, A)) && said(a, /No fighting here/, since), `hp ${b.health}`)

    // ---------- protection: after the course, after a cell opens; attacking ends your own ----------
    await pair(A, B, 205.5, 65, 160.5)
    await cmd(`zzjail ${B} shield 30`)
    since = Date.now()
    check('a protected inmate (30 s) can\'t be hit ("They just got here")', !(await lands(b, B, A)) && said(a, /They just got here/, since), `hp ${b.health}`)
    check('...but hits back (the hit lands)', await lands(a, A, B), `hp ${a.health}`)
    check('...and that ends its own protection', field(await info(B), 'shield') === '0', await info(B))
    await cmd(`zzhp ${A} 20`)
    await cmd(`zzhp ${B} 20`)
    await cmd(`dprison course ${C} skip`)
    await sleep(500)
    check('finishing the course gives 30 s of protection', Number(field(await info(C), 'shield')) >= 25, await info(C))
    await cmd(`zzjail ${C} catch`)
    await sleep(1500)
    await cmd(`zzjail ${C} cellopen 1`)
    await until(async () => Number(field(await info(C), 'shield')) >= 25, 4000)
    check('...and so does a cell opening', Number(field(await info(C), 'shield')) >= 25, await info(C))

    // ---------- melee in the yard downs instead of killing; the knockout cooldown ----------
    await pair(A, B, 205.5, 65, 160.5)
    check('melee PvP in the yard: the hit lands', await lands(b, B, A), `hp ${b.health}`)
    since = Date.now()
    let deaths = 0
    b.once('death', () => deaths++)
    await cmd(`execute in minecraft:jailbreak run minecraft:damage ${B} 100 minecraft:player_attack by ${A}`)
    await sleep(1800)
    const sb = await info(B)
    check('a knockout downs instead of killing (DOWNED, a cell, no death)', deaths === 0 && b.health > 0 && said(b, /DOWNED/, since) && VET_CELLS.includes(field(sb, 'cell')), `deaths=${deaths} ${sb}`)
    check('...both are told (the attacker and the one knocked out)', said(a, new RegExp(`You knocked ${B} out`), since) && said(b, new RegExp(`${A} knocked you out`), since), t.text(a, since).slice(0, 200))
    check('...the attacker holds a cooldown on them (ko=)', new RegExp(`ko=${B}:\\d+`).test(await info(A)) && new RegExp(`koby=${A}:\\d+`).test(await info(B)), `${await info(A)} | ${await info(B)}`)
    await sleep(1500)
    await pair(A, B, 205.5, 65, 160.5)
    await cmd(`zzhp ${B} 20`)
    since = Date.now()
    check('the attacker\'s next hit on them is cancelled ("knocked them out already")', !(await lands(b, B, A)) && said(a, /knocked them out already/, since), `hp ${b.health}`)
    await into(C, 206.5, 65, 161.5, 90)
    await cmd(`zzjail ${C} shield clear`)
    await sleep(400)
    check('...a third inmate can still hit them', await lands(b, B, C), `hp ${b.health}`)
    // A swing by the one knocked out inside a no-PvP zone doesn't clear it.
    await pair(B, A, 100.5, 65, 198.5)
    await lands(a, A, B)
    await pair(A, B, 205.5, 65, 160.5)
    check('a swing by them in a no-PvP zone doesn\'t clear the cooldown', !(await lands(b, B, A)) && new RegExp(`ko=${B}:\\d+`).test(await info(A)), await info(A))
    // Their hit that lands does.
    check('their hit on the attacker lands', await lands(a, A, B), `hp ${a.health}`)
    check('...which clears the attacker\'s cooldown on them', !new RegExp(`ko=${B}`).test(await info(A)), await info(A))
    check('...and the attacker\'s next hit lands', await lands(b, B, A), `hp ${b.health}`)
    // The cooldown runs out.
    await cmd(`zzhp ${B} 20`)
    await cmd(`zzjail ${A} ko ${B} 1`)
    check('a 1 s cooldown refuses at once', !(await lands(b, B, A)))
    await sleep(1300)
    check('...and 1 s later the hit lands', await lands(b, B, A), `hp ${b.health}`)

    // ---------- a guard who sees a fight hunts the attacker ----------
    await t.copsNormal()
    await copTo('poldesk', 211.5, 65, 160.5)
    await until(async () => /loaded=yes at=21/.test(await cop('poldesk')), 12000, 500)
    await cmd(`zzconsole npc rotate --body 90 --head 90 --id ${((await cop('poldesk')).match(/id=(\d+)/) || [])[1]}`)
    await pair(A, B, 205.5, 65, 160.5)
    await cmd(`djailcops calm ${A}`)
    t.logs.cops.mark()
    await hit(B, A, 1)
    const fightH = await until(async () => field(await info(A), 'hostile') === 'yes', 3000)
    check('a guard who sees an inmate fight: the attacker is hunted (act fight)', fightH && t.logs.cops.has(/why=seen-act:fight/), t.logs.cops.since().split('\n').filter(x => /hostile/.test(x)).join(' / '))
    check('...not the one who was hit', field(await info(B), 'hostile') === 'no', await info(B))
    await cmd(`djailcops calm ${A}`)
    await copTo('poldesk', 220.5, 65, 304.5)
    await t.copsBlind()

    // ---------- the fence; NPCs; beds ----------
    await into(A, 260.5, 65, 392.5, 0)
    await cmd(`zzhp ${A} 20`)
    await state(C, 'off')
    await jtp(C, 260.5, 65, 398.5, 180)
    await state(C, 'out')
    await sleep(800)
    since = Date.now()
    check('no damage through the fence (a free bot outside hits an inmate inside)', !(await lands(a, A, C)) && said(c, /Not through the fence/, since), `hp ${a.health}`)
    await into(A, 205.5, 65, 160.5, 0)
    await cmd('npc create Visitor Bob --at 206,65,162,jailbreak --type PLAYER')
    await sleep(1500)
    const h0 = a.health
    await cmd(`execute in minecraft:jailbreak run minecraft:damage ${A} 4 minecraft:mob_attack by @e[tag=CITIZENS_NPC,name="Visitor Bob",limit=1,sort=nearest,x=206,y=65,z=162]`)
    await sleep(800)
    check('a non-prison NPC can\'t hurt an inmate', a.health >= h0, `${h0} -> ${a.health}`)
    const nid = ((await cmd('zznpcs')).match(/id=(\d+) Visitor Bob/) || [])[1]
    if (nid) await cmd(`zzconsole npc remove ${nid}`)
    await into(A, 91.5, 58, 51.5, 180)
    await sleep(1500)
    since = Date.now()
    await t.clickBlock(a, 89, 58, 49)
    await sleep(1200)
    check('a bed click in a cell does nothing (no "Respawn point set")', !said(a, /Respawn point|sleep/i, since), t.text(a, since))

    // ---------- the city's features don't work for a prisoner ----------
    await into(A, 205.5, 65, 160.5, 0)
    const el = await cmd(`zzjail ${A} eligible`)
    since = Date.now()
    await cmd(`zzcarcall ${A} ZZTEST`)
    await sleep(600)
    check('Valet (a car call) is refused in the prison ("No cars in the prison")', said(a, /No cars in the prison/, since) && /car=No cars in the prison/.test(el), el)
    await cmd(`zztool ${A} grappler 1 0`)
    a.setQuickBarSlot(0)
    await sleep(600)
    const p0 = await t.pos(A)
    since = Date.now()
    a.activateItem()
    await sleep(1200)
    const p1 = await t.pos(A)
    check('the Grappler is refused in the prison (no pull)', /grapple=No grappling in the prison/.test(el) && Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) < 1 && said(a, /Not inside the walls|No grappling/, since), `${el} ${p0} -> ${p1}`)
    await cmd(`zztool ${A} grappler 0 0`)
    check('a hit contract doesn\'t run for a prisoner (not eligible)', /hit=false/.test(el), el)

    // ---------- /dsetup prison after /dprison setup ----------
    const ps = await cmd('dprison setup')
    await sleep(1500)
    const ds = await cmd('dsetup prison')
    check('/dprison setup, then /dsetup prison: nothing missing (no ✘), no monsters', /SETUP 0 missing/.test(ds) && !/^✘/m.test(ds) && /no monsters/.test(ds), `${ps} | ${ds}`)
  } finally {
    await t.prisonOff()
    for (const n of [A, B, C]) if (t.bots[n]) await cmd(`zzjail ${n} state off`)
    await t.close()
  }
}
