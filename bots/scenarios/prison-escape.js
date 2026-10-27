// The ways out of the prison (jailescape.sk, prison.sk; ESCAPE-SPEC 4.3, 4.6-4.8 and 7.2-4; owner, 2026-10-14: "a few
// escape methods like blowing up a gate, a keycard from a cop and out through the cop station, parkour"; revision 3:
// "Lot is one more step"). Every method ends in the lot, still the prison; the front gate, opened from the gatehouse
// booth's console, is the way out. Checked here: the closed prison holds; the keycard through the police station (the
// doors open as you walk up, a follower gets the method too); the gatehouse door (keycard, the fuse box refused near
// the GATE cop, its inside exit); the console and the front gate (open 15 s for everyone, the escape with its method,
// the close moving whoever stands in the gateway, the 30 s cooldown; an escape leaves the player in the jailbreak world:
// owner, 2026-10-14, "the jailbreak map is supposed to be the entire map"); the C4 (the three parts with their markers on
// the spots and "Hold right-click" prompts, Lefty putting them together (owner, 2026-10-14: "give it to lefty"), the
// plant, the blast, the rubble path, the rebuild warning and the hole rule, the chalk hint on W5); the parkour (the punch box
// refused near the WALK cop, the punch gate, the crates, over the fence); free players kept out; teleport commands and
// guns refused inside; the Prison Gun Shop (melee you own only; its door keycard-only since 2026-10-20: the reader, the
// door opening as a keycard holder walks up, shut again 3 s later); combat-logging inside; a catch clears the method.
// The jail items carry their icons (custom model data the pack draws).
// The cops are blinded for this scenario (prison-cops tests what they see); their positions still matter (the boxes).
const fs = require('fs')
const path = require('path')
const { start, field, sleep } = require('../prisonlib')

const E1 = 'PcEscA'
const E2 = 'PcEscB'
const E3 = 'PcEscC'
const VET_CELLS = ['n89', 'n96', 'n103', 'n110', 's96', 's103', 's110', 's117']
const CONSOLE = [272.5, 65, 397.5]
const LEFTY = [80.5, 65.5, 151.5]
const PACK = path.join(__dirname, '..', '..', 'pack', 'assets')
const KINDS = ['coursecard', 'keycard', 'putty', 'wires', 'timer', 'c4', 'donut', 'note', 'stash']
const near = (p, x, z, d = 1) => p && Math.abs(p[0] - x) <= d && Math.abs(p[2] - z) <= d

module.exports = async ({ check }) => {
  const t = await start()
  const { cmd, info, into, state, jtp, door, doorOpen, breach, pos, dim, said, until, walk, hold, punch, clickBlock, logs } = t
  try {
    await t.prisonOn()
    await t.copsBlind()
    const e1 = await t.newBot(E1)
    const e2 = await t.newBot(E2)
    const e3 = await t.newBot(E3)
    await sleep(1500)
    for (const n of [E1, E2, E3]) {
      await cmd(`zzclear ${n}`)
      await cmd(`zzdata ${n} last-combat-log none`)
      await cmd(`zzjail ${n} strip`)
    }
    await cmd('dprison setup')
    await into(E1, 200.5, 65, 150.5)
    // The cops these checks move must exist (they spawn while someone is in the prison).
    const copsOk = await until(async () => !/none/.test(await t.cop('gate')) && !/none/.test(await t.cop('walk')), 90000, 2000)
    check('setup: the GATE and WALK cops exist', copsOk, `${await t.cop('gate')} | ${await t.cop('walk')}`)
    await sleep(500)

    // ---------- the jail items' icons (owner, 2026-10-14: "add icon textures to donuts, keycards, etc.") ----------
    const brick = JSON.parse(fs.readFileSync(path.join(PACK, 'minecraft', 'items', 'brick.json'), 'utf8'))
    const cases = (brick.model.cases || []).map(c => c.when)
    const bad = []
    for (const k of KINDS) {
      await cmd(`zzjail ${E1} strip`)
      await cmd(`zzjail ${E1} give ${k}`)
      const cmdData = await cmd(`minecraft:data get entity ${E1} Inventory[{components:{"minecraft:custom_data":{donating_id:"jail:${k}"}}}].components."minecraft:custom_model_data"`)
      if (!cmdData.includes(`"donating:jail_${k}"`)) bad.push(`${k}: ${cmdData}`)
      if (!cases.includes(`donating:jail_${k}`)) bad.push(`${k}: not in brick.json`)
      if (!fs.existsSync(path.join(PACK, 'donating', 'textures', 'item', `jail_${k}.png`))) bad.push(`${k}: no texture`)
    }
    await cmd(`zzjail ${E1} strip`)
    check('every jail item carries its icon (custom model data donating:jail_<kind>), and the pack draws each of the 9', bad.length === 0, bad.join(' / '))

    // ---------- the closed prison: no inner barrier or gate lets an inmate through ----------
    const tries = [
      ['the police yard door', [210.5, 65, 283.5, 0], [210.5, 290.5], p => p[2] < 286.9],
      ['the POLICE doors', [210.5, 65, 319.5, 0], [210.5, 325.5], p => p[2] < 321.0],
      ['the vehicle gate', [178.5, 65, 320.5, 0], [178.5, 326.5], p => p[2] < 322.5],
      ['the punch gate', [336.5, 65, 264.5, -90], [342.5, 264.5], p => p[0] < 339.5],
      ['the gatehouse door', [272.5, 65, 389.5, 0], [272.5, 395.5], p => p[2] < 392.9],
      ['the front gate', [260.5, 65, 393.5, 0], [260.5, 400.5], p => p[2] < 396.5],
      ['the Gun Shop door (keycard-only)', [316.5, 65, 262.5, 180], [316.5, 252.5], p => p[2] > 258.1],
      ['the dugout\'s dirt plug (2026-10-21)', [112.5, 62, 360.5, 90], [106.5, 360.5], p => p[0] > 111.2]
    ]
    for (const [name, at, to, inside] of tries) {
      await jtp(E1, ...at)
      await sleep(900)
      await walk(e1, [to], 2500)
      const p = await pos(E1)
      check(`closed: an inmate can't walk through ${name}`, p && inside(p) && field(await info(E1), 'state') === 'in', `${p}`)
    }
    // The lot was reached on the way (the last two tries): a staff catch starts the run over (no lot flag, no method).
    await cmd(`zzjail ${E1} catch`)
    await sleep(1600)

    // ---------- the keycard through the police station ----------
    await jtp(E1, 210.5, 65, 283.5, 0)
    await sleep(900)
    let since = Date.now()
    await clickBlock(e1, 209, 66, 284)
    await sleep(800)
    check('no keycard: the police reader refuses ("You need a keycard"), the door stays shut', said(e1, /You need a keycard/, since) && !(await doorOpen('poln')), await door('poln'))
    // ---------- the yard's Gun Shop: keycard-only (owner, 2026-10-20: "the gun shop is supposed to be keycard access only
    // in the prison") ----------
    await jtp(E1, 316.5, 65, 261.5, 180)
    await sleep(900)
    since = Date.now()
    await clickBlock(e1, 317, 66, 260)
    await sleep(800)
    check('the Gun Shop with no keycard: its reader refuses ("You need a keycard"), the door stays shut', said(e1, /You need a keycard/, since) && !(await doorOpen('gunshop')), await door('gunshop'))
    await cmd(`zzjail ${E1} give keycard`)
    await jtp(E1, 316.5, 65, 263.5, 180)
    await sleep(900)
    logs.prison.mark()
    await walk(e1, [[316.5, 260.2]])
    check('...with a keycard in the pockets, walking up opens it', await until(() => doorOpen('gunshop'), 1500), await door('gunshop'))
    const inGs = await walk(e1, [[316.5, 256.5], [316.5, 250.5]], 5000)
    check('...the inmate walks in (the reader logged: reader E1 GUN_READER)', inGs && logs.prison.has(new RegExp(`reader ${E1} GUN_READER`)), `${await pos(E1)} | ${logs.prison.since().slice(-300)}`)
    await jtp(E1, 305.5, 65, 250.5, 0)
    await sleep(3800)
    check('...inside away from the door: it shuts 3 s after it last opened', !(await doorOpen('gunshop')), await door('gunshop'))
    // Just outside the approach (z 263 and on), so only the click opens it.
    await jtp(E1, 316.5, 65, 263.6, 180)
    await sleep(2500)
    logs.prison.mark()
    await clickBlock(e1, 317, 66, 260)
    check('...its reader clicked with the keycard opens it too (logged)', await until(() => doorOpen('gunshop'), 1500) && logs.prison.has(new RegExp(`reader ${E1} GUN_READER`)), `${await door('gunshop')} | ${logs.prison.since().slice(-200)}`)
    await jtp(E1, 316.5, 65, 266.5, 180)
    await sleep(3800)
    await jtp(E1, 210.5, 65, 281.5, 0)
    await sleep(900)
    await walk(e1, [[210.5, 283.6]])
    check('with a keycard in the pockets, walking up opens the yard door', await until(() => doorOpen('poln'), 1500), await door('poln'))
    let ok = await walk(e1, [[210.5, 288.5], [210.5, 300.5], [210.5, 316.5]], 6000)
    check('...the inmate walks through the briefing room into the lobby', ok, `${await pos(E1)}`)
    await into(E2, 210.5, 65, 315.5, 0)
    await sleep(600)
    since = Date.now()
    await walk(e1, [[210.5, 319.0]])
    check('walking up to the POLICE doors with the keycard opens them', await until(() => doorOpen('pols'), 1500), await door('pols'))
    await Promise.all([walk(e1, [[210.5, 325.5]]), (async () => { await sleep(300); await walk(e2, [[210.5, 319.5], [211.0, 326.5]], 3000) })()])
    await sleep(1500)
    let s1 = await info(E1)
    check('out of the POLICE doors: in the lot, still an inmate, THE LOT title, method keycard', field(s1, 'state') === 'in' && field(s1, 'lot') === 'true' && field(s1, 'lotflag') === 'true' && field(s1, 'mark') === 'keycard' && said(e1, /THE LOT/, since), s1)
    let s2 = await info(E2)
    check('a bot without a card following through the open POLICE doors: in the lot, method keycard too', field(s2, 'lot') === 'true' && field(s2, 'mark') === 'keycard', s2)

    // ---------- the gatehouse ----------
    await jtp(E2, 272.5, 65, 389.5, 0)
    await sleep(1200)
    since = Date.now()
    await clickBlock(e2, 271, 66, 390)
    await sleep(700)
    check('no keycard at the gatehouse: walking up does nothing, the reader refuses', !(await doorOpen('booth')) && said(e2, /You need a keycard/, since), await door('booth'))
    await jtp(E2, 272.5, 65, 384.5, 0)
    await jtp(E1, 272.5, 65, 389.5, 0)
    check('with a keycard, walking up opens the gatehouse door', await until(() => doorOpen('booth'), 1500), await door('booth'))
    await jtp(E1, 272.5, 65, 380.5, 0)
    await sleep(3800)
    check('...and it shuts 3 s after the inmate leaves', !(await doorOpen('booth')), await door('booth'))
    await jtp(E2, 272.5, 65, 393.5, 180)
    check('an inmate inside the gatehouse: its door opens (the inside exit)', await until(() => doorOpen('booth'), 1500), await door('booth'))
    ok = await walk(e2, [[272.5, 389.5]])
    check('...and the inmate walks out', ok, `${await pos(E2)}`)

    // ---------- the console and the front gate ----------
    since = Date.now()
    await jtp(E1, 272.5, 65, 395.5, 0)
    await sleep(1500)
    check('inside the booth: "Hold right-click on the console"', said(e1, /Hold right-click on the console/, since))
    const held = await hold(e1, CONSOLE, 3800, 1)
    const opened = await until(async () => /state=open/.test(await breach('front')), 1500)
    await until(async () => /air=210/.test(await breach('front')), 1500) // the panels slide 15 ticks
    let fr = await breach('front')
    const openedAt = Date.now()
    check('holding the console 3 s opens the front gate (every panel cell air within 1 s)', held && opened && /air=210/.test(fr), fr)
    // (THE FRONT GATE IS OPEN holds the action bar for 1.5 s.)
    await sleep(1600)
    since = Date.now()
    await hold(e1, CONSOLE, 400, 1)
    await sleep(300)
    check('a second hold while it\'s open: "already open"', said(e1, /already open/, since))
    logs.prison.mark()
    await jtp(E1, 260.5, 65, 392.5, 0)
    await jtp(E2, 284.5, 65, 392.5, 0)
    await sleep(900)
    since = Date.now()
    await Promise.all([walk(e1, [[260.5, 400.5]], 3500), (async () => { await sleep(400); await walk(e2, [[284.5, 400.5]], 3500) })()])
    await sleep(1500)
    s1 = await info(E1)
    check('out through the front gate: ESCAPED, state out, method keycard, the jail items gone', field(s1, 'state') === 'out' && said(e1, /ESCAPED/, since) && logs.prison.has(new RegExp(`escape ${E1} \\S+ keycard`)) && field(s1, 'items') === '', s1)
    check('the follower out the other lane: method keycard (no escape-unknown)', logs.prison.has(new RegExp(`escape ${E2} \\S+ keycard`)) && !logs.prison.has(new RegExp(`escape-unknown ${E2}`)), logs.prison.since().split('\n').filter(l => /escape/.test(l)).join(' / '))
    await sleep(4500)
    s1 = await info(E1)
    check('...and stays where it is in the jailbreak world, outside the walls (no teleport to another world)', (await dim(E1)) === 'minecraft:jailbreak' && field(s1, 'inside') === 'false' && field(s1, 'state') === 'out', `${await dim(E1)} ${s1}`)
    ok = await walk(e1, [[262.5, 404.5], [262.5, 410.5]], 4000)
    await sleep(1200)
    const pFree = await pos(E1)
    check('...walks on freely outside (not pulled back, still free)', ok && pFree && pFree[2] > 409 && field(await info(E1), 'state') === 'out', `${pFree} ${await info(E1)}`)
    const closed = await until(async () => /state=closed/.test(await breach('front')), 18000, 300)
    const closeMs = Date.now() - openedAt
    fr = await breach('front')
    check('the front gate closes ~15 s after it opened, every block back', closed && closeMs > 11000 && /built=210\/210/.test(fr), `${closeMs} ms ${fr}`)
    await into(E2, 272.5, 65, 395.5, 0)
    await sleep(1200)
    since = Date.now()
    await hold(e2, CONSOLE, 600, 1)
    await sleep(300)
    check('the console while the gate cools down: refused ("cooling down")', said(e2, /cooling down/, since) && /state=closed/.test(await breach('front')))
    await breach('front', 'cool')
    await hold(e2, CONSOLE, 3800, 1)
    check('after the cooldown it works again', await until(async () => /state=open/.test(await breach('front')), 1500), await breach('front'))
    // The close with bots in the gateway: an inmate north of the row's middle back to FRONT_IN, a free bot out to LOT_EXIT.
    await jtp(E2, 262.5, 65, 395.6, 0)
    await state(E3, 'out')
    await jtp(E3, 284.5, 65, 396.8, 0)
    await until(async () => /state=closed/.test(await breach('front')), 18000, 300)
    await sleep(600)
    const p2 = await pos(E2)
    const p3 = await pos(E3)
    fr = await breach('front')
    check('the gate closing: the inmate in the gateway is put at FRONT_IN (not escaped)', near(p2, 260.5, 392.5) && field(await info(E2), 'state') === 'in', `${p2}`)
    check('...the free bot in the gateway is put out at LOT_EXIT', near(p3, 260.5, 404.5) && (await dim(E3)) === 'minecraft:jailbreak', `${p3}`)
    check('...and every gate block is back', /built=210\/210/.test(fr), fr)

    // ---------- the fuse box ----------
    await into(E1, 266.5, 65, 395.5, -90)
    await t.copTo('gate', 272.5, 65, 389.5)
    await sleep(1500)
    let hp0 = e1.health
    since = Date.now()
    for (let i = 0; i < 3; i++) { punch(e1, 267, 66, 395, 4); await sleep(250) }
    await sleep(500)
    check('the fuse box with the GATE cop at the booth door: "A guard\'s watching", no shock', said(e1, /A guard's watching/, since) && e1.health >= hp0 && !(await doorOpen('booth')), `hp ${hp0} -> ${e1.health}`)
    await t.copTo('gate', 340.5, 65, 389.5)
    await sleep(1500)
    hp0 = e1.health
    for (let i = 0; i < 10; i++) { punch(e1, 267, 66, 395, 4); await sleep(250) }
    const fuseOpen = await until(() => doorOpen('booth'), 1500)
    check('the GATE cop away: 10 punches shock and open the gatehouse door', fuseOpen && e1.health <= hp0 - 2, `hp ${hp0} -> ${e1.health} ${await door('booth')}`)
    await jtp(E1, 266.5, 65, 384.5, 0)
    await sleep(5500)
    check('...for 5 s', !(await doorOpen('booth')), await door('booth'))

    // ---------- C4 ----------
    await cmd(`zzjail ${E1} strip`)
    since = Date.now()
    await into(E1, 61.5, 65, 54.5, 180)
    await sleep(1500)
    const mark = await until(() => t.near(e1, 'item_display', [60.88, 65.5, 53.5], 0.3), 4000)
    check('the workshop barrel\'s glowing marker sits on its front face (owner: "on the same block"), not over it', !!mark && !t.near(e1, 'item_display', [61.5, 66.6, 53.5], 0.4), mark ? `${mark.position}` : 'none')
    check('...next to it: "Hold right-click · Search here"', await until(() => said(e1, /Hold right-click . Search here/, since), 2000))
    since = Date.now()
    await hold(e1, [61.5, 64.99, 53.5], 2600, 1)
    await sleep(400)
    let s = await info(E1)
    check('searching the workshop barrel (hold 2 s, "Hold right-click · Searching"): the C4 putty', /putty:/.test(field(s, 'items')) && said(e1, /Hold right-click . Searching/, since), s)
    await cmd(`zzjail ${E1} strip`)
    since = Date.now()
    await hold(e1, [61.5, 64.99, 53.5], 600, 1)
    await sleep(400)
    check('...searching it again: "Try again in"', said(e1, /Try again in/, since) && !/putty:/.test(field(await info(E1), 'items')))
    await cmd(`zzjail ${E1} give putty`)
    await jtp(E1, 82.5, 65, 90.5, 90)
    await sleep(1500)
    await hold(e1, [81.5, 64.99, 90.5], 2600, 1)
    await jtp(E1, 82.5, 65, 230.5, 90)
    await sleep(1500)
    since = Date.now()
    await hold(e1, [81.5, 65.99, 230.5], 2600, 1)
    await sleep(400)
    s = await info(E1)
    check('the supply closet and the infirmary: the wires and the timer; with all three, "bring them to Lefty"', /wires:/.test(s) && /timer:/.test(s) && said(e1, /bring them to Lefty/, since), s)
    await jtp(E1, 49.5, 65, 52.5, 180)
    await sleep(1500)
    since = Date.now()
    // Sparks works the old bench since 2026-10-20 (his makeshift weapons): a click opens his menu, never the C4.
    const benchWin = new Promise(resolve => { const tm = setTimeout(() => resolve(null), 3000); e1.once('windowOpen', w => { clearTimeout(tm); resolve(w) }) })
    await hold(e1, [49.5, 64.99, 51.5], 600, 1)
    const bw = await benchWin
    await sleep(400)
    if (e1.currentWindow) e1.closeWindow(e1.currentWindow)
    s = await info(E1)
    check('the old workshop bench opens Sparks\' menu (makeshift weapons), nothing made: the C4 parts kept', bw && /Sparks · Makeshift/.test(JSON.stringify(bw.title)) && !/c4:/.test(field(s, 'items')) && /putty:/.test(s), `${bw ? JSON.stringify(bw.title).slice(0, 200) : 'no window'} | ${s}`)
    await cmd('djailjobs setup')
    await jtp(E1, 82.5, 65, 151.5, 90)
    await cmd(`zzfill ${E1} 0 4`)
    const lefty = await until(() => t.near(e1, 'mannequin', LEFTY), 30000, 500)
    since = Date.now()
    if (lefty) await e1.activateEntity(lefty).catch(() => {})
    await sleep(900)
    s = await info(E1)
    check('Lefty with hotbar 1-5 full: refused ("Free a slot in hotbar 1-5"), the parts kept', !!lefty && said(e1, /Free a slot in hotbar 1-5/, since) && /putty:/.test(s) && /wires:/.test(s) && /timer:/.test(s) && !/c4:/.test(s), s)
    await cmd(`minecraft:clear ${E1} minecraft:stone`)
    await sleep(500)
    logs.prison.mark()
    since = Date.now()
    if (lefty) await e1.activateEntity(lefty).catch(() => {})
    await sleep(900)
    s = await info(E1)
    const c4slot = Number((field(s, 'items').match(/c4:(\d+)/) || [])[1])
    // Not into the slot the bot holds (review fix, 2026-10-15: a C4 put into the hand is held out in front of the guards).
    check('the three parts to Lefty: a C4 into hotbar 1-5 (not the held slot), the parts gone, "Give me those"', c4slot >= 0 && c4slot <= 4 && c4slot !== e1.quickBarSlot && !/putty|wires|timer/.test(field(s, 'items')) && said(e1, /Give me those/, since) && logs.prison.has(new RegExp(`c4 ${E1} by=lefty`)), `${s} held=${e1.quickBarSlot}`)
    e1.setQuickBarSlot(c4slot >= 0 && c4slot <= 4 ? c4slot : 0)
    // An inmate at 1 heart next to the gate, and a free bot at 2 blocks while it blows.
    await into(E2, 179.5, 65, 319.9, 0)
    await cmd(`zzhp ${E2} 2`)
    await state(E3, 'out')
    since = Date.now()
    await jtp(E1, 178.5, 65, 320.5, 0)
    await cmd(`zzhp ${E1} 20`)
    await sleep(1500)
    check('at the vehicle gate holding the C4: "Hold right-click on the gate · plant the C4"', said(e1, /Hold right-click on the gate . plant the C4/, since))
    const hpE1 = e1.health
    await hold(e1, [178.5, 66, 321.9], 3800, 1)
    check('planting the C4 on the vehicle gate (hold 3 s): armed', /state=armed/.test(await breach('gate')), await breach('gate'))
    let e3hp = e3.health
    const blown = await until(async () => {
      await jtp(E3, 177.5, 65, 319.6, 0)
      return /state=open/.test(await breach('gate'))
    }, 8000, 150)
    await sleep(700)
    const gb = await breach('gate')
    check('5 s later the gate is blown (its cells air, rubble around)', blown && /air=3[0-5]/.test(gb) && await t.isBlock(179, 65, 323, 'minecraft:polished_andesite_slab'), gb)
    check('...the free bot 2 blocks away takes no damage', e3.health >= e3hp, `${e3hp} -> ${e3.health}`)
    check('...the inmate at 1 heart keeps it (never downed by a blast)', e2.health >= 2 && field(await info(E2), 'state') === 'in' && !VET_CELLS.includes(field(await info(E2), 'cell')), `hp ${e2.health} ${await info(E2)}`)
    check('...the planter next to it is hurt but not downed', e1.health < hpE1 && e1.health > 0 && !said(e1, /DOWNED/), `${hpE1} -> ${e1.health}`)
    since = Date.now()
    ok = await walk(e1, [[177.5, 322.5], [177.5, 326.5]], 3000)
    await sleep(1300)
    s = await info(E1)
    check('walking through the hole: in the lot with method c4 (not escaped)', ok && field(s, 'lot') === 'true' && field(s, 'mark') === 'c4' && field(s, 'state') === 'in', `${s} ${await pos(E1)}`)
    // Out through the front gate.
    await breach('front', 'cool')
    await jtp(E1, 272.5, 65, 395.5, 0)
    await sleep(1500)
    await hold(e1, CONSOLE, 3800, 1)
    await until(async () => /state=open/.test(await breach('front')), 1500)
    logs.prison.mark()
    await jtp(E1, 260.5, 65, 392.5, 0)
    await sleep(800)
    await walk(e1, [[260.5, 400.5]], 3500)
    check('...then the booth\'s console and out: method c4', await until(() => logs.prison.has(new RegExp(`escape ${E1} \\S+ c4`)), 3000), logs.prison.since())
    // The rebuild: a warning, then the hole rule (an inmate to PLANT_GATE, a free bot out to LOT_EXIT).
    await cmd(`zzhp ${E2} 20`)
    await jtp(E2, 177.5, 65, 322.5, 0)
    await sleep(500)
    since = Date.now()
    await breach('gate', 'due')
    await until(async () => /state=closing/.test(await breach('gate')), 2500, 100)
    check('the breach due: "Rebuilding the vehicle gate in 5s" to the bot next to it', await until(() => said(e2, /Rebuilding the vehicle gate in 5s/, since), 1500))
    const rebuilt = await until(async () => /state=intact/.test(await breach('gate')), 7000, 200)
    await sleep(600)
    const pe2 = await pos(E2)
    check('...the inmate standing in the hole is moved to PLANT_GATE', rebuilt && near(pe2, 178.5, 320.5), `${pe2}`)
    check('...and the gate is whole again 5 s later (a bot next to it)', /built=35\/35/.test(await breach('gate')), await breach('gate'))
    // A free bot in the hole (it can only be there for the second before it's moved out): blown again, the bot put in
    // the hole and the gate closed in the same moment (the rebuild's own hole rule).
    await jtp(E3, 240.5, 65, 410.5, 0)
    await sleep(1500)
    await breach('gate', 'open')
    await sleep(600)
    await jtp(E3, 180.5, 65, 323.4, 0)
    await breach('gate', 'close')
    await sleep(800)
    const pe3 = await pos(E3)
    check('...a free bot in the hole when it closes is put out at LOT_EXIT (its last spot outside was elsewhere)', near(pe3, 260.5, 404.5), `${pe3}`)
    // The chalk on W5: the vehicle gate is the weak spot.
    await cmd(`zzjail ${E2} give c4`)
    const s2c = Number((field(await info(E2), 'items').match(/c4:(\d+)/) || [])[1])
    e2.setQuickBarSlot(s2c >= 0 && s2c <= 4 ? s2c : 0)
    since = Date.now()
    await jtp(E2, 277.5, 65, 145.5, -90)
    check('holding a C4 by W5\'s chalk: the "vehicle gate" hint', await until(() => said(e2, /The vehicle gate by the plaza is the weak spot/, since), 2500))
    await cmd(`zzjail ${E2} strip`)

    // ---------- the parkour ----------
    // Since 2026-10-21 (the owner's playtest): the gate fills the gap between the Gun Shop and the police station (x 339,
    // z 260-284, 25 columns), opens with a slide from the police end (a column every 2 ticks, inside its 12 s), and the
    // punch box stands on the police apron to the right of it (PUNCH_STAND 335.5 65 282.5, the box at z 284). Untested (cloud).
    await cmd(`zzhp ${E2} 20`)
    await jtp(E2, 335.5, 65, 282.5, 0)
    await t.copTo('walk', 334.5, 65, 274.5)
    await sleep(1500)
    hp0 = e2.health
    since = Date.now()
    for (let i = 0; i < 3; i++) { punch(e2, 335, 66, 284, 2); await sleep(250) }
    await sleep(500)
    check('the punch box with the WALK cop next to it: "A guard\'s watching", no shock', said(e2, /A guard's watching/, since) && e2.health >= hp0, `hp ${hp0} -> ${e2.health}`)
    await t.copTo('walk', 180.5, 65, 310.5)
    // the police yard's guard (route poleast, on the roster since 2026-10-21) passes 14 blocks from the stand
    await t.copTo('poleast', 182.5, 65, 312.5)
    await sleep(1500)
    hp0 = e2.health
    for (let i = 0; i < 10; i++) { punch(e2, 335, 66, 284, 2); await sleep(250) }
    const pg = await until(async () => /state=open/.test(await breach('punch')), 1500)
    const pg1 = await breach('punch')
    const partly = Number(field(pg1, 'air')) < Number((pg1.match(/built=\d+\/(\d+)/) || [])[1])
    const slid = await until(async () => { const b = await breach('punch'); const m = b.match(/built=\d+\/(\d+) air=(\d+)/); return m && m[1] === m[2] }, 4000, 200)
    check('the WALK cop away: 10 punches shock and open the punch gate, sliding open (not all at once, all of it within 4 s)', pg && e2.health <= hp0 - 2 && partly && slid && /\/175 /.test(pg1), `hp ${hp0} -> ${e2.health} | ${pg1} | ${await breach('punch')}`)
    await jtp(E2, 336.5, 65, 264.5, -90)
    await sleep(600)
    ok = await walk(e2, [[342.5, 264.5]], 3500)
    check('...the inmate walks through the punch gate into the annex (method parkour)', ok && field(await info(E2), 'mark') === 'parkour', `${await pos(E2)} ${await info(E2)}`)
    const crate = async (x, y, z) => await t.isBlock(x, y, z, 'minecraft:stripped_oak_wood') || await t.isBlock(x, y, z, 'minecraft:packed_mud')
    const props = [await crate(360, 68, 340), await crate(363, 69, 341), await t.isBlock(366, 70, 340, 'minecraft:light_gray_concrete'), await crate(366, 71, 343), await crate(367, 72, 348), await crate(366, 69, 351), await crate(367, 67, 352), await crate(366, 65, 353)]
    check('the parkour props stand: P1-P5 and L1-L3 at their heights', props.every(Boolean), JSON.stringify(props))
    for (const [x, y, z] of [[357.5, 68, 340.5], [360.5, 69, 340.5], [363.5, 70, 340.5], [366.5, 71, 340.5], [366.5, 72, 343.5], [366.5, 73, 346.5]]) {
      await jtp(E2, x, y, z, 0)
      await sleep(350)
    }
    since = Date.now()
    ok = await walk(e2, [[366.5, 349.5], [366.5, 356.5]], 4000)
    await sleep(1300)
    s = await info(E2)
    check('over the annex fence and down the crates: in the lot with method parkour', field(s, 'lot') === 'true' && field(s, 'mark') === 'parkour' && field(s, 'state') === 'in', `${s} ${await pos(E2)}`)
    await breach('front', 'cool')
    await jtp(E2, 272.5, 65, 395.5, 0)
    await sleep(1500)
    await hold(e2, CONSOLE, 3800, 1)
    await until(async () => /state=open/.test(await breach('front')), 1500)
    logs.prison.mark()
    await jtp(E2, 260.5, 65, 392.5, 0)
    await sleep(800)
    await walk(e2, [[260.5, 400.5]], 3500)
    check('...the console and out: method parkour', await until(() => logs.prison.has(new RegExp(`escape ${E2} \\S+ parkour`)), 3000), logs.prison.since())
    // The punch gate by keycard (walking up to it).
    await until(async () => /state=closed/.test(await breach('punch')), 10000, 300)
    await breach('punch', 'cool')
    await state(E1, 'off')
    await cmd(`zzjail ${E1} give keycard`)
    await jtp(E1, 336.5, 65, 264.5, -90)
    await sleep(300)
    await state(E1, 'in')
    check('walking up to the punch gate with a keycard opens it too (method parkour)', await until(async () => /state=open/.test(await breach('punch')), 1500) && field(await info(E1), 'mark') === 'parkour', `${await breach('punch')} ${await info(E1)}`)
    // It slides shut at its time (the slide inside the 12 s): "closing" first, closed with every block back.
    await breach('punch', 'due')
    const closingP = await until(async () => /state=closing/.test(await breach('punch')), 2500, 100)
    const closedP = await until(async () => { const b = await breach('punch'); return /state=closed/.test(b) && /built=175\/175/.test(b) }, 6000, 200)
    check('...and slides shut at its time ("closing", then every block back)', closingP && closedP, await breach('punch'))

    // ---------- the dugout under the lot's west fence (2026-10-21; untested (cloud)): no keycard, no front gate ----------
    await state(E1, 'off')
    await cmd(`zzjail ${E1} strip`)
    await breach('dig', 'cool')
    const dg0 = await breach('dig')
    check('the dugout: its dirt plug stands (state=closed, every block built)', /state=closed/.test(dg0) && /built=(\d+)\/\1 /.test(dg0), dg0)
    await into(E1, 112.5, 62, 360.5, 90) // DUG_FACE: down the ladder, in the tunnel facing the plug
    await sleep(1200)
    since = Date.now()
    await sleep(800)
    check('in the tunnel: "Hold right-click on the dirt under the fence"', said(e1, /dirt under the fence/, since - 800), field(await info(E1), 'lot'))
    logs.prison.mark()
    await hold(e1, [111.5, 62.99, 360.5], 6800, 1.5)
    const dug = await until(async () => /state=open/.test(await breach('dig')), 1500)
    check('holding right-click 6 s: DUG THROUGH, the plug gone', dug && /air=(\d+)/.test(await breach('dig')) && field(await breach('dig'), 'air') !== '0', await breach('dig'))
    await walk(e1, [[106.5, 360.5]], 4000)
    await sleep(800)
    check('...through the tunnel past the fence line: escaped, method dig', await until(() => logs.prison.has(new RegExp(`escape ${E1} \\S+ dig`)), 3000) && field(await info(E1), 'state') === 'out', `${logs.prison.since()} | ${await info(E1)}`)
    // The hole rule: an inmate still in the tunnel on the lot side when it caves in goes back to the lot side.
    await into(E2, 112.5, 62, 360.5, 90)
    await sleep(600)
    await breach('dig', 'due')
    const caving = await until(async () => /state=closing/.test(await breach('dig')), 2500, 100)
    const shut = await until(async () => /state=closed/.test(await breach('dig')), 6000, 200)
    const pTun = await pos(E2)
    check('...caving in: "closing", then shut; an inmate in the tunnel stays on the lot side, still in', caving && shut && pTun && pTun[0] > 111 && field(await info(E2), 'state') === 'in', `${await breach('dig')} ${pTun}`)
    since = Date.now()
    await hold(e2, [111.5, 62.99, 360.5], 1500, 1.5)
    check('...and just after, it refuses ("It just caved in")', said(e2, /just caved in/, since), field(await breach('dig'), 'cool'))
    await breach('dig', 'cool')

    // ---------- free players ----------
    await t.drop(E3)
    await sleep(1000)
    const e3b = await t.newBot(E3)
    await sleep(1500)
    await state(E3, 'out')
    since = Date.now()
    await jtp(E3, 200.5, 65, 150.5, 0)
    await sleep(1600)
    check('a free bot put in the yard (no last spot outside) is moved out to LOT_EXIT', near(await pos(E3), 260.5, 404.5) && said(e3b, /That's the prison/, since), `${await pos(E3)}`)
    await jtp(E3, 210.5, 65, 330.5, 0)
    await sleep(1600)
    check('...put in the lot, it\'s moved back out (to its last spot outside)', field(await info(E3), 'inside') === 'false', await info(E3))
    await breach('front', 'cool')
    await breach('front', 'open')
    await sleep(1200)
    await jtp(E3, 260.5, 65, 400.5, 180)
    await sleep(1300)
    since = Date.now()
    await walk(e3b, [[260.5, 390.5]], 3000)
    await sleep(1300)
    check('a free bot walking in through the open front gate is moved back out', field(await info(E3), 'inside') === 'false' && said(e3b, /That's the prison/, since), `${await pos(E3)}`)
    await breach('front', 'close')

    // ---------- rules inside: teleport commands, guns, the Prison Gun Shop ----------
    await into(E1, 205.5, 65, 160.5, 0)
    await sleep(800)
    since = Date.now()
    e1.chat('/spawn')
    await sleep(1500)
    check('a teleport command inside is refused ("Not from in here")', said(e1, /Not from in here/, since) && (await dim(E1)) === 'minecraft:jailbreak')
    await cmd(`zzjail ${E1} own 50_GS`)
    await cmd(`zzjail ${E1} own Combat_Knife`)
    await cmd(`minecraft:clear ${E1}`)
    await cmd(`zzclear ${E1}`)
    await state(E1, 'in')
    await cmd(`wm give ${E1} 50_GS 1 {slot:0}`)
    e1.setQuickBarSlot(0)
    await sleep(800)
    const r0 = ((await cmd(`zzwm ${E1}`)).match(/0=50_GS:(\d+)/) || [])[1]
    // At the floor: a straight shot down Hall B hit a passing guard (20 since 2026-10-21) and tagged the bot in combat.
    await e1.look(e1.entity.yaw, -Math.PI / 2, true)
    since = Date.now()
    e1.activateItem()
    await sleep(300)
    e1.deactivateItem()
    await sleep(800)
    const r1 = ((await cmd(`zzwm ${E1}`)).match(/0=50_GS:(\d+)/) || [])[1]
    // Since 2026-10-21 owned guns work inside the walls (the owner: "used INSIDE the walls").
    check('a gun inside fires (owned guns work inside the walls since 2026-10-21)', r0 !== undefined && Number(r1) < Number(r0) && !said(e1, /No guns inside the walls/, since), `${r0} -> ${r1}`)
    await cmd(`djailcops calm ${E1}`)
    await cmd(`zzcombatend ${E1}`)
    await cmd(`minecraft:clear ${E1}`)
    await cmd(`zzclear ${E1}`)
    await state(E1, 'in')
    await cmd(`zzdatatext ${E1} loadout::1 wpn:AK_47`)
    await sleep(600)
    const shopStatus = async () => (await cmd(`zzshop ${E1}`))
    const openShop = async () => {
      const o = new Promise(resolve => { const tm = setTimeout(() => resolve(null), 3000); e1.once('windowOpen', w => { clearTimeout(tm); resolve(w) }) })
      await cmd(`dshop open ${E1} gun`)
      return o
    }
    const slotNamed = re => {
      const w = e1.currentWindow
      if (!w) return -1
      for (let i = 0; i < 54; i++) { const it = w.slots[i]; if (it && re.test(JSON.stringify(it.customName || it.displayName || ''))) return i }
      return -1
    }
    const click = async (slot, mode = 0) => { e1.clickWindow(slot, 0, mode).catch(() => {}); await sleep(800) }
    const w = await openShop()
    await sleep(500)
    const knife = slotNamed(/Combat Knife/)
    await click(knife, 1)
    check('the Prison Gun Shop: shift-clicking an owned knife equips it', w && knife >= 0 && /Combat_Knife/.test(await cmd(`zzwm ${E1}`)), `${knife} ${await cmd(`zzwm ${E1}`)}`)
    const pistol = slotNamed(/Classic Pistol/)
    await click(pistol, 1)
    check('...an owned gun is taken out too (since 2026-10-21)', pistol >= 0 && /50_GS/.test(await cmd(`zzwm ${E1}`)), `${await shopStatus()} | ${await cmd(`zzwm ${E1}`)}`)
    await click(2)
    check('...Save refused, the saved loadout unchanged', /Save it once you're out/.test(await shopStatus()) && /= wpn:AK_47/.test(await cmd(`zzdata ${E1} loadout::1`)), `${await shopStatus()} ${await cmd(`zzdata ${E1} loadout::1`)}`)
    // Guns more than phone::reveal-levels above the inmate's level aren't listed (2026-10-22): show the whole catalogue.
    await cmd('zzcfgset phone::reveal-levels 1000')
    await click(47)
    await sleep(300)
    const uzi = slotNamed(/Machine Gun/)
    const b0 = await t.bal(E1)
    await click(uzi)
    check('...buying refused ("Unlock weapons once you\'re out"), no money spent', uzi >= 0 && /Unlock weapons once you're out/.test(await shopStatus()) && (await t.bal(E1)) === b0, `slot ${uzi} | ${await shopStatus()}`)
    await cmd('zzcfgset phone::reveal-levels 5')
    await click(49)
    await sleep(300)
    await click(21)
    check('...ammo refused ("Not inside the walls")', /Not inside the walls/.test(await shopStatus()), await shopStatus())
    if (e1.currentWindow) e1.closeWindow(e1.currentWindow)

    // ---------- combat-logging inside, then a catch clears the method ----------
    await into(E2, 205.5, 65, 162.5, 0)
    await cmd(`zzjail ${E2} tag`)
    await cmd(`zzjail ${E2} hostile`)
    await sleep(500)
    since = Date.now()
    await t.drop(E2)
    await sleep(1500)
    check('combat-logging inside while hunted: no death ("logged out in combat" not broadcast, no combat-log record)', !said(e1, /logged out in combat/, since) && /= <none>/.test(await cmd(`zzdata ${E2} last-combat-log`)) && /= true/.test(await cmd(`zzdata ${E2} jail-quit-hostile`)), await cmd(`zzdata ${E2} last-combat-log`))
    const e2b = await t.newBot(E2)
    await sleep(3000)
    s2 = await info(E2)
    check('...caught at the rejoin (BACK TO YOUR CELL, still an inmate)', field(s2, 'state') === 'in' && VET_CELLS.includes(field(s2, 'cell')) && said(e2b, /BACK TO YOUR CELL/), s2)
    await into(E1, 210.5, 65, 330.5, 0)
    await cmd(`zzjail ${E1} mark keycard`)
    await sleep(1500)
    await cmd(`zzjail ${E1} catch`)
    await sleep(1500)
    s1 = await info(E1)
    check('a catch in the lot clears the escape method', field(s1, 'mark') === '' && field(s1, 'lotflag') === '' && VET_CELLS.includes(field(s1, 'cell')), s1)
    await breach('front', 'cool')
    await breach('front', 'open')
    await sleep(1000)
    logs.prison.mark()
    await jtp(E1, 260.5, 65, 392.5, 0)
    await sleep(800)
    await walk(e1, [[260.5, 400.5]], 3500)
    check('...an escape right after logs as "other" (escape-unknown)', await until(() => logs.prison.has(new RegExp(`escape ${E1} \\S+ other`)) && logs.prison.has(new RegExp(`escape-unknown ${E1}`)), 3000), logs.prison.since())
    await breach('front', 'close')
  } finally {
    await cmd('zzjailbreach front close')
    await cmd('zzjailbreach gate close')
    await cmd('zzjailbreach front cool')
    await t.prisonRestore()
    for (const n of [E1, E2, E3]) if (t.bots[n]) await cmd(`zzjail ${n} state off`)
    await t.close()
  }
}
