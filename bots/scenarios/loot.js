// loot.sk and bag.sk (part 1): a "Loot Lab" (difficulty 2) and an advanced "Vault Lab" (difficulty 4)
// on a glass platform, set up with /dheist and /dloot like staff would. Robbers stand at z 705 and face
// +z (the loot is at z 706-707). Holding right-click = activating the loot's interaction every 200 ms.
// Checks: staff setup and refusals, rolls (exactly n × piece shown, ranges vary), the displays and
// markers, the hold (rate, slow clicks, fast clicks, damage resets), the clock starting at the first
// take, two robbers racing one pile, partial pieces and a full bag, the gun and phone guard, smashing
// glass, the safe keypad (colors, repeats, Clear, the guess gap, damage, a rival cracker, the head
// start), the drill (mount, a second driller, a jam fixed by someone else, the finish, the head
// start), the alarm, cleaned out, the end of a run (forfeits), disable and delete, the bag (name,
// glint, sale at the base, passive pay, forfeit on logout, death, relog), placeholders, the dump.
const fs = require('fs')
const path = require('path')
const conv = require('mineflayer/lib/conversions')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'LootA'
const B = 'LootB'
const Y = 200
const CHUNKS = '690 690 745 735'
const FAR = '0.5 68 -656.5'
const LOGS = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  const cmd = async c => (await rcon.cmd(c)).trim()
  try {
    // ---------- Helpers ----------
    const logLines = name => { const f = path.join(LOGS, `${name}.log`); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l !== '') : [] }
    let mark = { loot: 0, bag: 0, heists: 0 }
    const setMark = () => { mark = { loot: logLines('loot').length, bag: logLines('bag').length, heists: logLines('heists').length } }
    const logged = (re, name = 'loot') => logLines(name).slice(mark[name]).filter(l => re.test(l))
    const since = (name = 'loot') => logLines(name).slice(mark[name]).join(' / ')
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(200) } return Boolean(await fn()) }
    const zl = async h => cmd(`zzloot ${h}`)
    const spot = async (h, n) => {
      const m = (await zl(h)).match(new RegExp(`\\| ${n}:(\\w+):(\\w*):n=([\\w<>]*):left=([\\w.<>]*):hb=(\\d+):ents=(\\d+):mk=([\\w<>]*):claim=([\\w<>]*):drill=([\\w.<>]*)`))
      if (!m) return {}
      return { kind: m[1], st: m[2], n: Number(m[3]), left: Number(m[4]), hb: Number(m[5]), ents: Number(m[6]), mk: m[7], claim: m[8], drill: m[9] }
    }
    const lootField = async (h, k) => ((await zl(h)).match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const heistField = async (h, k) => ((await cmd(`zzheist ${h}`)).match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const bag = async name => {
      const r = await cmd(`zzbag ${name}`)
      return { raw: r, total: Number((r.match(/total=([\d.]+)/) || [])[1]), room: Number((r.match(/room=([\d.]+)/) || [])[1]), pct: Number((r.match(/pct=(\d+)/) || [])[1]), lines: (r.match(/lines=(\S*)/) || [])[1] || '' }
    }
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const isBlock = async (x, y, z, b) => /passed/i.test(await cmd(`execute if block ${x} ${y} ${z} minecraft:${b}`))
    const count = async (type, box) => Number(((await cmd(`execute if entity @e[type=minecraft:${type},tag=donating_loot,${box}]`)).match(/Count: (\d+)/i) || [0, 0])[1])
    const LAB = 'x=699,y=190,z=699,dx=18,dy=18,dz=18'
    const VAULT = 'x=719,y=190,z=699,dx=18,dy=18,dz=18'
    const offhand = async name => cmd(`zzoffhand ${name}`)
    const pos = async name => { const m = (await cmd(`data get entity ${name} Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/); return m ? m.slice(1).map(Number) : [NaN, NaN, NaN] }
    const place = async (name, x, z, y = Y) => { await cmd(`zzheisttp ${name} ${x} ${y} ${z}`); await sleep(900); await bots[name].look(conv.fromNotchianYaw(0), 0, true) }
    const reset = async name => {
      await cmd(`zzclear ${name}`)
      await cmd(`zzbagclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzdata ${name} passive-switched none`)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zztestkit ${name}`) // bag tier 2 ($6,000)
    }
    // The interaction nearest to a point (its position is the box's bottom centre).
    const box = (bot, x, y, z) => {
      let best = null
      let bd = 1.6
      for (const e of Object.values(bot.entities)) {
        if (e.name !== 'interaction') continue
        const d = Math.hypot(e.position.x - x, e.position.y - y, e.position.z - z)
        if (d < bd) { bd = d; best = e }
      }
      return best
    }
    // Hold right-click on the loot near (x, y, z) for ms (a click every `every` ms, like the client).
    const hold = async (name, x, y, z, ms, every = 200) => {
      const bot = bots[name]
      const end = Date.now() + ms
      let n = 0
      while (Date.now() < end) {
        const e = box(bot, x, y, z)
        if (e) { bot.activateEntity(e).catch(() => {}); n++ }
        await sleep(every)
      }
      return n
    }
    const takes = (name, id) => logged(new RegExp(`take ${name} \\S+ ${id} `))
    const gotSum = lines => lines.reduce((s, l) => s + Number((l.match(/got=([\d.]+)/) || [])[1] || 0), 0)
    const windowOpen = name => new Promise(resolve => { const t = setTimeout(() => resolve(null), 3000); bots[name].once('windowOpen', w => { clearTimeout(t); resolve(w) }) })
    const slotItem = (name, i) => { const w = bots[name].currentWindow; return w ? w.slots[i] : null }
    const key = async (name, digit) => { await bots[name].clickWindow(44 + digit, 0, 0); await sleep(150) }

    // ---------- Build ----------
    for (const h of ['lootlab', 'vaultlab']) await cmd(`dheist delete ${h} confirm`)
    for (const r of ['heist_lootlab', 'heist_vaultlab', 'safe_base_lt', 'safe_lt']) await cmd(`rg remove -w world ${r}`)
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 690 ${Y} 690 745 ${Y + 10} 735 air`)
    await cmd(`fill 690 ${Y - 1} 690 745 ${Y - 1} 735 glass`)
    // Loot Lab: a cash table (1), a jewelry case (2 + 3), a safe (4 + 5), a long cash table (6).
    await cmd('fill 706 200 706 707 200 706 stone')
    await cmd('setblock 710 200 706 stone')
    await cmd('setblock 710 201 706 glass')
    await cmd('setblock 713 200 707 stone')
    await cmd('setblock 713 201 706 iron_block')
    await cmd('fill 703 200 710 704 200 710 stone')
    // Vault Lab: a 2×2 vault door (1) with gold behind it (2), a case with alarm=true (3 + 4).
    await cmd('fill 726 201 706 727 202 706 iron_block')
    await cmd('fill 726 200 707 727 200 707 stone')
    await cmd('setblock 731 200 706 stone')
    await cmd('setblock 731 201 706 glass')
    await cmd('zzcfgreload')
    await cmd('zzregion heist_lootlab 700 190 700 716 208 716')
    await cmd('zzregion heist_vaultlab 720 190 700 736 208 716')
    await cmd('zzregion safe_base_lt 700 190 720 716 208 726')
    await cmd('zzregion safe_lt 720 190 720 736 208 726')
    await cmd('rg flag -w world safe_base_lt passthrough allow')
    await cmd('rg flag -w world safe_lt passthrough allow')
    for (const c of ['dheist create lootlab 2', 'dheist set lootlab name Loot Lab', 'dheist set lootlab escape 600', 'dheist set lootlab cooldown 5', 'dheist exit lootlab 698.5 200 708.5 -90', 'dheist snapshot lootlab',
      'dheist create vaultlab 4', 'dheist set vaultlab name Vault Lab', 'dheist set vaultlab escape 600', 'dheist set vaultlab cooldown 5', 'dheist exit vaultlab 718.5 200 708.5 -90', 'dheist snapshot vaultlab']) await cmd(c)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await reset(name)
      await cmd(`lp user ${name} permission unset donating.staff`)
      await cmd(`eco set ${name} 100000`)
      await cmd(`zzbountyreset ${name}`)
    }
    await place(A, 698.5, 704.5)
    await place(B, 698.5, 703.5)
    await sleep(3000)

    // ---------- Staff setup ----------
    let t = Date.now()
    bots[A].chat('/dloot list lootlab')
    await sleep(800)
    check('/dloot is staff only', /Staff only/.test(text(A, t)), text(A, t))
    const refusals = [
      ['an unknown heist', 'dloot add nosuch pile 1 2 3 4 5 6 value=100', /unknown heist/],
      ['a pile without value=', 'dloot add lootlab pile 706 200 706 707 200 706', /value=MIN-MAX is required/],
      ['a pile over two heights', 'dloot add lootlab pile 706 200 706 707 201 706 value=100', /one layer/],
      ['more loot than the box shows', 'dloot add lootlab pile 706 200 706 707 200 706 value=5000 piece=100', /fits 16 pieces/],
      ['a range with no whole piece', 'dloot add lootlab pile 706 200 706 707 200 706 value=100-200 piece=500', /no whole piece/],
      ['behind= that isn\'t a gate', 'dloot add lootlab pile 706 200 706 707 200 706 value=500 behind=7', /isn't a gate/],
      ['a gate box with air in it', 'dloot add lootlab smash 710 201 706 710 202 706', /has air/],
      ['a corner outside the heist', 'dloot add lootlab pile 698 200 706 701 200 706 value=100', /outside the heist/],
      ['an unknown setting', 'dloot add lootlab pile 706 200 706 707 200 706 value=500 speed=2', /has no setting speed/],
      ['a bad value', 'dloot add lootlab safe 713 201 706 713 201 706 digits=9', /bad value digits=9/]
    ]
    for (const [what, c, re] of refusals) { const r = await cmd(c); check(`refused: ${what}`, re.test(r), r) }
    check('refused adds leave nothing behind', /0 spots/.test(await cmd('dloot list lootlab')), await cmd('dloot list lootlab'))
    const adds = [
      'dloot add lootlab pile 706 200 706 707 200 706 value=500 name=Teller_cash', // 1: 5 × $100
      'dloot add lootlab smash 710 201 706 710 201 706', // 2
      'dloot add lootlab pile 710 200 706 710 200 706 style=jewel value=500 behind=2', // 3: 2 × $250
      'dloot add lootlab safe 713 201 706 713 201 706', // 4
      'dloot add lootlab pile 713 200 707 713 200 707 style=gold value=1000 behind=4', // 5: 2 × $500
      'dloot add lootlab pile 703 200 710 704 200 710 value=1000', // 6: 10 × $100
      'dloot add vaultlab drill 726 201 706 727 202 706 time=6 jams=1', // vaultlab-1
      'dloot add vaultlab pile 726 200 707 727 200 707 style=gold value=1000 behind=1', // vaultlab-2
      'dloot add vaultlab smash 731 201 706 731 201 706 alarm=true', // vaultlab-3
      'dloot add vaultlab pile 731 200 706 731 200 706 style=jewel value=250 behind=3' // vaultlab-4
    ]
    const replies = []
    for (const c of adds) replies.push(await cmd(c))
    check('10 spots added with ids <heist>-<n>', replies.every(r => /added/.test(r)) && /lootlab-6 added/.test(replies[5]) && /vaultlab-4 added/.test(replies[9]), replies.join(' / '))
    check('info shows the pieces and the expected value', /pieces=5-5 E=\$500/.test(await cmd('dloot info lootlab-1')), await cmd('dloot info lootlab-1'))
    const chk = await cmd('dloot check lootlab')
    check('check: the value range and one robber\'s clear time', /rolls \$3,000-\$3,000/.test(chk) && /clears it all in about/.test(chk), chk)
    check('no loot entities while the heists are disabled', (await count('item_display', LAB)) === 0 && (await count('interaction', LAB)) === 0)
    await cmd('dheist enable lootlab')
    await cmd('dheist enable vaultlab')
    const armed = await until(async () => /armed=true/.test(await zl('lootlab')) && /armed=true/.test(await zl('vaultlab')), 10000)
    await sleep(2500)

    // ---------- Roll and visuals ----------
    const s1 = await spot('lootlab', 1)
    const s3 = await spot('lootlab', 3)
    const s2 = await spot('lootlab', 2)
    check('open: a pile shows exactly its pieces (5 × $100), hitboxes on its 2 cells, a yellow marker', armed && s1.st === 'open' && s1.n === 5 && s1.left === 500 && s1.hb === 2 && s1.mk === 'yellow' && s1.ents === 5 + 2 + 1, JSON.stringify(s1))
    check('a pile behind a gate is locked: pieces, no hitbox, no marker', s3.st === 'locked' && s3.n === 2 && s3.hb === 0 && s3.mk === 'none', JSON.stringify(s3))
    check('a gate: a hitbox per block and a white marker', s2.st === 'closed' && s2.hb === 1 && s2.mk === 'white', JSON.stringify(s2))
    // Loot Lab: 5 + 2 + 2 + 10 pieces, and 4 markers (2 piles yellow, the case and the safe white).
    const disp = await count('item_display', LAB)
    check('the world has the displays: 19 pieces + 4 markers', disp === 19 + 4, `${disp}`)
    check('the heist\'s loot pool is what was rolled ($3,000)', /rolled=3000 /.test(await zl('lootlab')) && /pool=3000 /.test(await zl('lootlab')), await zl('lootlab'))
    const nearEdge = await cmd('dloot add lootlab pile 700 200 712 700 200 712 value=100')
    check('staff are warned about loot less than 1 block inside the edge', /less than 1 block/.test(nearEdge), nearEdge)
    await cmd('dloot remove lootlab-7')
    // Ranges vary between rolls: $500-2,000 at $250 = 2..8 pieces.
    await cmd('dloot set lootlab-1 piece 250')
    await cmd('dloot set lootlab-1 value 500-2000')
    const counts = new Set()
    let inRange = true
    for (let i = 0; i < 20; i++) {
      await cmd('dloot roll lootlab')
      const n = (await spot('lootlab', 1)).n
      counts.add(n)
      if (!(n >= 2 && n <= 8)) inRange = false
    }
    check('20 rolls of $500-2,000 at $250: always 2-8 pieces, at least 3 different counts', inRange && counts.size >= 3, [...counts].join(','))
    const tooBig = await cmd('dloot set lootlab-1 piece 50')
    check('a change that doesn\'t fit is refused and nothing changes', /fits 16 pieces/.test(tooBig) && (await spot('lootlab', 1)).left % 250 === 0, tooBig)
    await cmd('dloot set lootlab-1 value 500')
    await cmd('dloot set lootlab-1 piece default')
    const s1b = await spot('lootlab', 1)
    check('a change re-rolls an armed heist nobody is in', s1b.n === 5 && s1b.left === 500, JSON.stringify(s1b))
    const before = (await count('item_display', LAB)) + (await count('interaction', LAB))
    await cmd('sk reload loot')
    await sleep(3500)
    const after = (await count('item_display', LAB)) + (await count('interaction', LAB))
    check('/sk reload loot: the same loot comes back, no duplicates', before === after && (await spot('lootlab', 1)).n === 5, `${before} -> ${after}`)

    // ---------- Grabbing ----------
    await cmd(`zzclear ${A}`) // no bag
    await place(A, 706.5, 705.3)
    setMark()
    t = Date.now()
    await hold(A, 706.5, 201, 706.5, 1200)
    check('no bag: refused', takes(A, 'lootlab-1').length === 0 && /You need a bag/.test(text(A, t)), text(A, t))
    await reset(A)
    await cmd(`gamemode creative ${A}`)
    await place(A, 706.5, 705.3)
    await sleep(1600) // the reset's 'out of combat' line holds the action bar for 1.5 s (hud.sk priorities)
    t = Date.now()
    await hold(A, 706.5, 201, 706.5, 1200)
    check('creative staff: builders can\'t rob', takes(A, 'lootlab-1').length === 0 && /Builder/.test(text(A, t)), text(A, t))
    await cmd(`gamemode survival ${A}`)
    await place(A, 706.5, 705.3)
    const openBefore = await heistField('lootlab', 'state')
    setMark()
    t = Date.now()
    await hold(A, 706.5, 201, 706.5, 1100)
    const one = takes(A, 'lootlab-1')
    const bagA = await bag(A)
    check('a 1 s hold on cash (0.8 s a piece) takes 1 piece: +$100 into the bag, one display less', one.length === 1 && /got=100 /.test(one[0]) && bagA.total === 100 && (await spot('lootlab', 1)).n === 4 && (await count('item_display', LAB)) === 22, `${since()} ${bagA.raw}`)
    check('...the bag\'s name shows it: Duffel Bag (1%)', /Duffel Bag \(1%\) glint=false/.test(await offhand(A)), await offhand(A))
    check('...and the action bar', /\+\$100/.test(text(A, t)), text(A, t))
    check('the escape clock starts at the first robbery, not at the entry', openBefore === 'open' && (await heistField('lootlab', 'state')) === 'active', `${openBefore} -> ${await heistField('lootlab', 'state')}`)
    // The rate: a 4.2 s hold on the long table (10 × $100).
    await place(A, 703.5, 709.3)
    setMark()
    await hold(A, 703.5, 201, 710.5, 4200)
    const rate = takes(A, 'lootlab-6').length
    check('a 4.2 s hold takes 5 ± 1 pieces', rate >= 4 && rate <= 6, `${rate}`)
    await sleep(1500) // the last hold's progress runs out
    setMark()
    await hold(A, 703.5, 201, 710.5, 6000, 1200)
    check('a click every 1.2 s takes nothing (each pause resets it)', takes(A, 'lootlab-6').length === 0, since())
    await sleep(1500)
    setMark()
    await hold(A, 703.5, 201, 710.5, 3000, 50)
    const fast = takes(A, 'lootlab-6').length
    check('clicking every tick for 3 s is no faster than holding (3 ± 1)', fast >= 2 && fast <= 4, `${fast}`)
    await sleep(1200)
    setMark()
    await hold(A, 703.5, 201, 710.5, 600)
    await cmd(`damage ${A} 1 minecraft:generic`)
    await hold(A, 703.5, 201, 710.5, 450)
    check('getting hurt mid-hold starts the piece over', takes(A, 'lootlab-6').length === 0, since())
    await sleep(1200)

    // ---------- The race ----------
    await place(A, 706.3, 705.3)
    await place(B, 707.7, 705.3)
    const raceLeft = (await spot('lootlab', 1)).left
    setMark()
    await Promise.all([hold(A, 706.5, 201, 706.5, 4500), hold(B, 707.5, 201, 706.5, 4500)])
    const ta = takes(A, 'lootlab-1')
    const tb = takes(B, 'lootlab-1')
    const s1c = await spot('lootlab', 1)
    check('two robbers empty one pile: A + B = what was left, both get some, nothing counted twice', gotSum(ta) + gotSum(tb) === raceLeft && raceLeft >= 300 && ta.length >= 1 && tb.length >= 1 && s1c.n === 0 && s1c.left === 0, `left ${raceLeft} A ${gotSum(ta)} B ${gotSum(tb)} ${JSON.stringify(s1c)}`)
    check('...the empty pile has no hitboxes and no marker', s1c.st === 'empty' && s1c.hb === 0 && s1c.mk === 'none' && s1c.ents === 0, JSON.stringify(s1c))
    check('...the heist board counts spots with loot left', /spots=\d\/4 /.test(await zl('lootlab')), await zl('lootlab'))

    // ---------- Partial pieces, a full bag ----------
    await cmd(`zzbagclear ${A}`)
    await cmd(`zzbagadd ${A} other#1 5850`) // room $150
    await place(A, 703.5, 709.3)
    const s6 = await spot('lootlab', 6)
    setMark()
    t = Date.now()
    await hold(A, 704.5, 201, 710.5, 2100)
    const part = takes(A, 'lootlab-6')
    const s6b = await spot('lootlab', 6)
    const bagFull = await bag(A)
    check('less room than a piece: it takes what fits ($100, then $50) and the bag is exactly full', part.length === 2 && /got=100 /.test(part[0]) && /got=50 /.test(part[1]) && bagFull.pct === 100 && bagFull.room === 0, `${since()} ${bagFull.raw}`)
    check('...the partial piece stays (one piece fewer, $150 less)', s6b.n === s6.n - 1 && s6b.left === s6.left - 150, `${JSON.stringify(s6)} -> ${JSON.stringify(s6b)}`)
    check('...a full bag glints and says (100%)', /\(100%\) glint=true/.test(await offhand(A)), await offhand(A))
    setMark()
    t = Date.now()
    await hold(A, 704.5, 201, 710.5, 1200)
    check('...and takes nothing more: BAG FULL', takes(A, 'lootlab-6').length === 0 && /BAG FULL/.test(text(A, t)), text(A, t))
    await cmd(`zzbagclear ${A}`)

    // ---------- The guard: guns and the phone ----------
    await cmd(`wm give ${A} Uzi 1 {slot:0,ammo:10}`)
    bots[A].setQuickBarSlot(0)
    await sleep(2200)
    const loaded = async () => Number(((await cmd(`zzwm ${A}`)).match(/0=Uzi:(\d+)/) || [])[1])
    await place(A, 710.5, 705.3)
    bots[A].setQuickBarSlot(0)
    await sleep(600)
    await hold(A, 710.5, 200.99, 706.5, 1100)
    const l1 = await loaded()
    await sleep(1200)
    const e6 = box(bots[A], 710.5, 200.99, 706.5)
    if (e6) bots[A].activateEntity(e6).catch(() => {})
    await sleep(60)
    bots[A].activateItem()
    await sleep(150)
    bots[A].deactivateItem()
    await sleep(500)
    const l2 = await loaded()
    await sleep(1000)
    bots[A].activateItem()
    await sleep(200)
    bots[A].deactivateItem()
    await sleep(600)
    const l3 = await loaded()
    check('holding right-click on loot with a gun never fires it, not even a click right after (guard)', l1 === 10 && l2 === 10, `${l1} ${l2}`)
    check('...and a second later the gun fires again (control)', l3 < 10, `${l3}`)
    bots[A].setQuickBarSlot(8)
    await sleep(700)
    if (e6) bots[A].activateEntity(e6).catch(() => {})
    await sleep(60)
    bots[A].activateItem()
    await sleep(100)
    bots[A].deactivateItem()
    await sleep(500)
    const phone1 = await cmd(`tag ${A} list`)
    await sleep(1000)
    bots[A].activateItem()
    await sleep(100)
    bots[A].deactivateItem()
    await sleep(600)
    const phone2 = await cmd(`tag ${A} list`)
    check('the phone doesn\'t open from a loot click; a second later it does (control)', !/donating_phone_open/.test(phone1) && /donating_phone_open/.test(phone2), `${phone1} / ${phone2}`)
    await sleep(500)
    bots[A].activateItem()
    await sleep(100)
    bots[A].deactivateItem()
    await sleep(500)
    bots[A].setQuickBarSlot(1)
    check('...the case wasn\'t smashed by those clicks (under 1.5 s)', await isBlock(710, 201, 706, 'glass'))
    await sleep(1200)

    // ---------- Smashing glass ----------
    await cmd(`zzbagclear ${A}`)
    await place(A, 710.5, 705.3)
    setMark()
    await hold(A, 710.5, 201, 706.5, 2000)
    const s3b = await spot('lootlab', 3)
    check('a 1.5 s hold smashes the glass: it\'s air, and the smasher gets a piece behind it at once', (await isBlock(710, 201, 706, 'air')) && logged(/open lootlab-2 smash/).length === 1 && takes(A, 'lootlab-3').length >= 1, since())
    check('...the pile behind it opens (hitbox, yellow marker)', s3b.st === 'open' || s3b.st === 'empty', JSON.stringify(s3b))

    // ---------- The safe ----------
    await place(A, 713.5, 705.3)
    await place(B, 712.5, 705.3)
    t = Date.now()
    await hold(A, 713.5, 200.99, 706.5, 600)
    check('a safe without a Safe Kit: no keypad', !bots[A].currentWindow && /needs a Safe Kit/.test(text(A, t)), text(A, t))
    await cmd(`zztool ${A} safe-kit 1 1`)
    let w = windowOpen(A)
    await hold(A, 713.5, 200.99, 706.5, 300)
    w = await w
    check('with a Safe Kit in hotbar 1-5 a right-click opens the keypad', Boolean(w) && /Safe/.test(JSON.stringify(w && w.title)), JSON.stringify(w && w.title))
    const code = ((await cmd(`zzlootcode lootlab-4 ${A}`)).match(/CODE (\d+)/) || [])[1]
    const others = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !code.includes(String(d)))
    for (const d of others.slice(0, 4)) await key(A, d)
    await sleep(300)
    const grayRow = [27, 28, 29, 30].map(i => slotItem(A, i)).map(s => s && s.name).join(',')
    check('a wrong guess: every digit that isn\'t in the code is gray', /light_gray_concrete,light_gray_concrete,light_gray_concrete,light_gray_concrete/.test(grayRow), `${code} ${grayRow}`)
    await key(A, 1)
    const ignored = !slotItem(A, 38) || slotItem(A, 38).name === 'gray_stained_glass_pane'
    await sleep(1100)
    const rot = code.slice(1) + code[0]
    for (const d of rot) await key(A, Number(d))
    await sleep(300)
    const yellowRow = [27, 28, 29, 30].map(i => slotItem(A, i)).map(s => s && `${s.name}:${s.count}`).join(',')
    check('right digits in the wrong places are yellow, item amount = the digit; the last guess moves up', /yellow_concrete.*yellow_concrete.*yellow_concrete.*yellow_concrete/.test(yellowRow) && yellowRow.includes(`yellow_concrete:${rot[0]}`) && /light_gray/.test([18, 19].map(i => slotItem(A, i)).map(s => s && s.name).join(',')), yellowRow)
    check('keys right after a result are ignored (the 1 s gap)', ignored)
    await sleep(1100)
    await key(A, Number(code[0]))
    await key(A, Number(code[0]))
    const rep1 = [38, 39].map(i => slotItem(A, i)).map(s => s && s.name).join(',')
    await bots[A].clickWindow(44, 0, 0)
    await sleep(300)
    const cleared = slotItem(A, 38) && slotItem(A, 38).name === 'gray_stained_glass_pane'
    check('a digit twice is refused; Clear empties the entry', /white_concrete,gray_stained_glass_pane/.test(rep1) && cleared, rep1)
    // Hurt: the keypad closes; reopening keeps the guesses.
    await cmd(`damage ${A} 1 minecraft:generic`)
    await sleep(400)
    const closedByHit = !bots[A].currentWindow
    await sleep(800)
    w = windowOpen(A)
    await hold(A, 713.5, 200.99, 706.5, 300)
    w = await w
    await sleep(300)
    check('a hit closes the keypad; reopening keeps your guesses', closedByHit && Boolean(w) && slotItem(A, 27) && /concrete/.test(slotItem(A, 27).name), `${closedByHit} ${slotItem(A, 27) && slotItem(A, 27).name}`)
    // B opens its own keypad (its own code), then A cracks it first.
    await cmd(`zztool ${B} safe-kit 1 1`)
    let wb = windowOpen(B)
    await hold(B, 713.5, 200.99, 706.5, 300)
    wb = await wb
    const codeB = ((await cmd(`zzlootcode lootlab-4 ${B}`)).match(/CODE (\d+)/) || [])[1]
    await sleep(1100)
    setMark()
    t = Date.now()
    for (const d of code) await key(A, Number(d))
    await sleep(600)
    const kitA = await cmd(`zzdump ${A}`)
    const kitB = await cmd(`zzdump ${B}`)
    check('the right code opens the safe: the door is air, the Safe Kit is used up', (await isBlock(713, 201, 706, 'air')) && logged(/crack LootA/).length === 1 && !/tool:safe-kit/.test(kitA), `${since()} ${kitA}`)
    check('every robber has their own code; a rival\'s keypad closes and they keep their kit', Boolean(wb) && codeB !== undefined && !bots[B].currentWindow && /tool:safe-kit/.test(kitB) && /cracked it first/.test(text(B, t)), `${codeB} ${kitB} ${text(B, t)}`)
    check('the cracker gets a head start on the piles behind it', (await spot('lootlab', 4)).claim === A, JSON.stringify(await spot('lootlab', 4)))
    t = Date.now()
    await place(B, 713.5, 705.6)
    setMark()
    await hold(B, 713.5, 201, 707.5, 2500)
    check('...others can\'t take from it yet ("Claimed by LootA")', takes(B, 'lootlab-5').length === 0 && /Claimed by LootA/.test(text(B, t)), text(B, t))
    await sleep(3000)
    setMark()
    await hold(B, 713.5, 201, 707.5, 2000)
    check('...after the head start they can', takes(B, 'lootlab-5').length >= 1, since())

    // ---------- The end of a run: forfeits ----------
    await cmd(`zzbagadd ${B} other#1 700`)
    const runLL = await lootField('lootlab', 'run')
    const bBefore = await bag(B)
    setMark()
    await cmd('dheist end lootlab')
    await sleep(1500)
    const bAfter = await bag(B)
    check('the run ends: every loot entity is gone', (await count('item_display', LAB)) === 0 && (await count('interaction', LAB)) === 0)
    check('...robbers still inside lose that run\'s loot; other loot stays', bBefore.lines.includes(`lootlab#${runLL}=`) && !bAfter.lines.includes(`lootlab#${runLL}=`) && bAfter.lines.includes('other#1=700') && logged(/forfeit LootB/, 'bag').length === 1, `${bBefore.raw} -> ${bAfter.raw}`)
    check('...the gates come back at the next opening', await until(async () => (await isBlock(710, 201, 706, 'glass')) && (await isBlock(713, 201, 706, 'iron_block')) && /armed=true/.test(await zl('lootlab')), 15000), await zl('lootlab'))

    // ---------- The drill (Vault Lab, advanced) ----------
    await reset(A)
    await reset(B)
    await place(A, 731.5, 705.3)
    setMark()
    await hold(A, 731.5, 200.99, 706.5, 2000)
    check('smashing a case with alarm=true trips the alarm in an advanced heist', (await heistField('vaultlab', 'alarm')) !== 'none', await cmd('zzheist vaultlab'))
    await place(A, 726.5, 705.3)
    t = Date.now()
    await hold(A, 726.5, 200.99, 706.5, 800)
    check('a vault door without a Drill: refused', (await spot('vaultlab', 1)).st === 'closed' && /needs a Drill/.test(text(A, t)), text(A, t))
    await cmd(`zztool ${A} drill 1 2`)
    await cmd(`zztool ${B} drill 1 2`)
    setMark()
    await hold(A, 726.5, 200.99, 706.5, 2000)
    const d1 = await spot('vaultlab', 1)
    check('a 1.5 s hold mounts the Drill: it\'s used up, and a drill and its text show on the door', d1.st === 'drilling' && !/tool:drill/.test(await cmd(`zzdump ${A}`)) && (await count('text_display', VAULT)) === 1 && logged(/mount LootA/).length === 1, `${JSON.stringify(d1)} ${since()}`)
    await place(B, 727.5, 705.3)
    t = Date.now()
    await hold(B, 727.5, 200.99, 706.5, 1500)
    check('a second driller is refused and keeps their Drill', /tool:drill/.test(await cmd(`zzdump ${B}`)) && logged(/mount LootB/).length === 0 && /LootA's drill/.test(text(B, t)), text(B, t))
    const jammed = await until(async () => (await spot('vaultlab', 1)).st === 'jammed', 6000)
    check('it jams halfway (jams=1): the marker turns red', jammed && (await spot('vaultlab', 1)).mk === 'red', JSON.stringify(await spot('vaultlab', 1)))
    setMark()
    await hold(B, 727.5, 200.99, 706.5, 2600)
    check('anyone can fix a jam with a 2 s hold', logged(/fix LootB/).length === 1 && (await spot('vaultlab', 1)).st !== 'jammed', since())
    const drilled = await until(async () => (await spot('vaultlab', 1)).st === 'open', 8000)
    check('the drill finishes: the door is air, the gold behind it opens, the one who mounted it gets the head start', drilled && (await isBlock(726, 201, 706, 'air')) && (await isBlock(727, 202, 706, 'air')) && (await spot('vaultlab', 2)).st === 'open' && (await spot('vaultlab', 1)).claim === A && (await count('text_display', VAULT)) === 0, `${JSON.stringify(await spot('vaultlab', 2))}`)
    // Cleaned out: take everything left in the Vault Lab.
    await place(A, 726.5, 706.2)
    setMark()
    await hold(A, 726.5, 201, 707.5, 3500)
    await hold(A, 727.5, 201, 707.5, 3500)
    await place(A, 731.5, 705.3)
    await hold(A, 731.5, 201, 706.5, 1500)
    const left = await heistField('vaultlab', 'left')
    check('cleaned out: every pile empty -> the clock drops to 1:00', logged(/cleaned vaultlab/).length === 1 && Number(left) <= 60, `${left} ${since()}`)
    // End mid-drill: entities go, the door is back at the next opening.
    await cmd('dheist end vaultlab')
    await until(async () => /armed=true/.test(await zl('vaultlab')), 15000)
    await reset(A)
    await cmd(`zztool ${A} drill 1 2`)
    await place(A, 726.5, 705.3)
    await hold(A, 726.5, 200.99, 706.5, 2000)
    await cmd('dheist end vaultlab')
    await sleep(1200)
    const endMid = (await count('item_display', VAULT)) === 0 && (await count('text_display', VAULT)) === 0
    const doorBack = await until(async () => (await isBlock(726, 201, 706, 'iron_block')) && (await spot('vaultlab', 1)).st === 'closed', 15000)
    check('/dheist end mid-drill: its displays go; the next run has the door back and no drill', endMid && doorBack, JSON.stringify(await spot('vaultlab', 1)))

    // ---------- The bag: selling, forfeits, death ----------
    await reset(A)
    await reset(B)
    await cmd(`zzbagadd ${B} other#1 2700`)
    await cmd(`zzbountyreset ${B}`)
    const balB = await bal(B)
    setMark()
    t = Date.now()
    await place(B, 708.5, 723.5)
    await sleep(1200)
    const soldB = await bag(B)
    check('reaching the base sells the bag: +$2,700, the bag is empty, bounty +$270', (await bal(B)) === balB + 2700 && soldB.total === 0 && /BOUNTY \S+ 270/.test(await cmd(`zzbounty ${B}`)) && logged(/sell LootB .* pay=2700 /, 'bag').length === 1, `${await bal(B)} ${soldB.raw} ${await cmd(`zzbounty ${B}`)}`)
    check('...with a title and the bag back at 0%', /\+\$2,700/.test(text(B, t)) && /\(0%\)/.test(await offhand(B)), `${text(B, t)} ${await offhand(B)}`)
    await cmd(`zzbagadd ${A} other#1 2700`)
    await cmd(`zzpassive ${A} on`)
    await cmd(`zzbountyreset ${A}`)
    const balA = await bal(A)
    await place(A, 709.5, 723.5)
    await sleep(1200)
    check('a passive robber gets 75% ($2,025) and no bounty', (await bal(A)) === balA + 2025 && (await bag(A)).total === 0 && !/BOUNTY \S+ [1-9]/.test(await cmd(`zzbounty ${A}`)), `${await bal(A)} ${await cmd(`zzbounty ${A}`)}`)
    await cmd(`zzpassive ${A} off`)
    await cmd(`zzbagadd ${B} other#1 500`)
    await place(B, 728.5, 723.5)
    await sleep(1500)
    check('a safe zone that isn\'t a base doesn\'t buy loot', (await bag(B)).total === 500, (await bag(B)).raw)
    check('with loot in the bag: no switching to passive', /Sell your loot/.test(await cmd(`zzpassivewhy ${B}`)), await cmd(`zzpassivewhy ${B}`))
    await place(B, 698.5, 703.5)
    // Logging out inside loses that heist's loot; the rest stays and you rejoin at its exit.
    const runNow = await lootField('lootlab', 'run')
    await place(B, 705.5, 703.5)
    await cmd(`zzbagadd ${B} lootlab#${runNow} 300`)
    setMark()
    await quit(bots[B])
    await sleep(1500)
    bots[B] = await join(B)
    await sleep(2500)
    const bRe = await bag(B)
    const pB = await pos(B)
    check('logging out inside forfeits that run\'s loot, keeps other loot, and you rejoin at the heist\'s exit', !bRe.lines.includes(`lootlab#${runNow}`) && bRe.lines.includes('other#1=500') && Math.abs(pB[0] - 698.5) < 1.5 && Math.abs(pB[2] - 708.5) < 1.5, `${bRe.raw} ${pB}`)
    await quit(bots[B])
    await sleep(1000)
    bots[B] = await join(B)
    await sleep(2000)
    check('loot survives a relog outside a heist', (await bag(B)).lines.includes('other#1=500'), (await bag(B)).raw)
    // A server stop or crash inside: no quit handler ran, so the next join forfeits the run they were in.
    const runCrash = await lootField('lootlab', 'run')
    await cmd(`zzbagadd ${B} lootlab#${runCrash} 400`)
    await cmd(`zzdatatext ${B} heist-in lootlab#${runCrash}`)
    setMark()
    await quit(bots[B])
    await sleep(1000)
    bots[B] = await join(B)
    await sleep(2000)
    const crash = await bag(B)
    check('joining after a stop or crash inside forfeits that run\'s loot; other loot stays', !crash.lines.includes(`lootlab#${runCrash}`) && crash.lines.includes('other#1=500') && logged(/forfeit-stop LootB/, 'heists').length === 1, `${crash.raw} ${since('heists')}`)
    check('the bag placeholders show values, never the raw %placeholder%', /500/.test(await cmd(`zzpapi ${B} donating_bag`)) && /8%/.test(await cmd(`zzpapi ${B} donating_bag_pct`)), `${await cmd(`zzpapi ${B} donating_bag`)} ${await cmd(`zzpapi ${B} donating_bag_pct`)}`)
    setMark()
    await cmd(`kill ${B}`)
    await sleep(1500)
    check('death: the loot leaves the bag and is recorded for the dropped duffel (part 2)', (await bag(B)).total === 0 && logged(/death-lost LootB .*total=500/, 'bag').length === 1, since('bag'))
    await sleep(3000)

    // ---------- Disable, dump, delete ----------
    await place(A, 698.5, 704.5)
    await place(B, 698.5, 703.5)
    await cmd('dheist disable lootlab')
    await sleep(1200)
    check('disable: no loot entities, gates restored', (await count('item_display', LAB)) === 0 && (await isBlock(710, 201, 706, 'glass')) && (await isBlock(713, 201, 706, 'iron_block')))
    const dump1 = (await cmd('dloot dump lootlab')).split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('dloot add'))
    await cmd('dloot clear lootlab confirm')
    for (const line of dump1) await cmd(line)
    const dump2 = (await cmd('dloot dump lootlab')).split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('dloot add'))
    check('dump round trip: gates first, renumbered, behind= mapped; replaying gives the same dump', dump1.length === 6 && /smash/.test(dump1[0]) && /safe/.test(dump1[1]) && /behind=1/.test(dump1.join(' ')) && dump1.join('|') === dump2.join('|'), dump1.join(' / '))
    await cmd('dheist delete lootlab confirm')
    check('deleting the heist deletes its loot', /unknown heist/.test(await cmd('dloot list lootlab')))
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`gamemode survival ${name}`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzdata ${name} passive-switched none`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzbagclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    for (const h of ['lootlab', 'vaultlab']) await rcon.cmd(`dheist delete ${h} confirm`).catch(() => {})
    for (const r of ['heist_lootlab', 'heist_vaultlab', 'safe_base_lt', 'safe_lt']) await rcon.cmd(`rg remove -w world ${r}`).catch(() => {})
    await rcon.cmd(`fill 690 ${Y} 690 745 ${Y + 10} 735 air`).catch(() => {})
    await rcon.cmd(`fill 690 ${Y - 1} 690 745 ${Y - 1} 735 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
