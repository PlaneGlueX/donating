// bag.sk part 2: the dropped duffel. A death drops the bag's loot as one duffel (an item entity with
// everything in its item's custom data) where they died; walking over it takes as much as fits in your
// own bag (owner, 2026-09-25) and the rest stays; no bag, passive players (someone else's duffel) and
// anyone but the owner of a passive player's duffel get nothing, and the owner only in the passive mode
// they died in; it never lands in an inventory or a hopper, two duffels never merge, it runs out after
// cfg duffel::despawn, and a heist's 0:00 treats the duffels inside like its robbers (that run's loot is
// lost, the rest goes out to the exit spot).
const fs = require('fs')
const path = require('path')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'DuffelA'
const B = 'DuffelB'
const Y = 200
const CHUNKS = '796 796 816 816'
const FAR = '0.5 68 -656.5'
const LOGS = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  const cmd = async c => (await rcon.cmd(c)).trim()
  try {
    // ---------- Helpers ----------
    const logLines = name => { const f = path.join(LOGS, `${name}.log`); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l !== '') : [] }
    let mark = { bag: 0 }
    const setMark = () => { mark = { bag: logLines('bag').length } }
    const logged = (re, name = 'bag') => logLines(name).slice(mark[name]).filter(l => re.test(l))
    const since = (name = 'bag') => logLines(name).slice(mark[name]).join(' / ')
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(200) } return Boolean(await fn()) }
    const bag = async name => {
      const r = await cmd(`zzbag ${name}`)
      return { raw: r, total: Number((r.match(/total=([\d.]+)/) || [])[1]), lines: (r.match(/lines=(\S*)/) || [])[1] || '' }
    }
    const duffels = async () => {
      const raw = await cmd('zzduffels')
      const list = raw.split(' | ').slice(1).map(p => ({
        id: (p.match(/^(\S+)/) || [])[1],
        lines: (p.match(/lines=(\S*)/) || [])[1] || '',
        owner: (p.match(/owner=(\S*)/) || [])[1],
        passive: (p.match(/passive=(\S*)/) || [])[1],
        left: Number((p.match(/left=(-?\d+)/) || [])[1]),
        at: ((p.match(/at=(-?\d+),(-?\d+),(-?\d+)/) || []).slice(1)).map(Number),
        inv: (p.match(/inv=(\S*)/) || [])[1],
        name: (p.match(/name=(.*)$/) || [])[1] || ''
      }))
      return { n: Number((raw.match(/DUFFELS (\d+)/) || [])[1]), list, raw }
    }
    const barSince = (name, t) => messagesSince(bots[name], t).filter(m => m.kind === 'game_info').map(m => m.text).join(' | ')
    const tp = async (name, x, z) => { await cmd(`zzheisttp ${name} ${x} ${Y} ${z}`); await sleep(300) }
    const reset = async name => {
      await cmd(`zzclear ${name}`)
      await cmd(`zzbagclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzdata ${name} passive-switched none`)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zztestkit ${name}`) // bag tier 2 ($6,000)
    }
    // Dies at (x, z) with these loot lines, and respawns far away.
    const dieWith = async (name, x, z, lines) => {
      for (const [tag, v] of lines) await cmd(`zzbagadd ${name} ${tag} ${v}`)
      await tp(name, x, z)
      await cmd(`minecraft:kill ${name}`)
      await sleep(1500)
    }
    const at = (d, x, z) => d && Math.abs(d.at[0] - x) <= 1 && d.at[1] === Y && Math.abs(d.at[2] - z) <= 1
    const clearItems = () => cmd('minecraft:kill @e[type=item,x=794,y=190,z=794,dx=24,dy=24,dz=24]')

    // ---------- Setup ----------
    await cmd('dheist delete dtest confirm')
    await cmd('rg remove -w world heist_dtest')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 796 ${Y} 796 816 ${Y + 8} 816 air`)
    await cmd(`fill 796 ${Y - 1} 796 816 ${Y - 1} 816 glass`)
    await clearItems()
    await cmd('zzcfgreload')
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await reset(name)
    }
    await tp(B, 812.5, 798.5)
    await sleep(2500)

    // ---------- A death drops the loot ----------
    setMark()
    await dieWith(A, 800.5, 800.5, [['dtest#1', 1500], ['other#2', 700]])
    const d1 = await duffels()
    check('a death drops the bag\'s loot as one duffel where they died, every line with its tag', d1.n === 1 && d1.list[0].lines === 'dtest#1=1500;other#2=700' && at(d1.list[0], 800, 800) && d1.list[0].owner === A && d1.list[0].passive === 'false', d1.raw)
    check('...and the bag is empty: the loot exists once', (await bag(A)).total === 0 && logged(/death-lost DuffelA .*total=2200 .*duffel=true/).length === 1 && logged(/duffel-drop DuffelA /).length === 1, since())
    check('it shows its value and time left, can\'t be destroyed, and lasts 2 minutes', /Loot duffel \$2,200 · (2:00|1:5\d)/.test(d1.list[0].name) && d1.list[0].inv === 'true' && d1.list[0].left > 110 && d1.list[0].left <= 120, d1.raw)
    const model = await cmd('data get entity @e[type=item,x=800,y=200,z=800,distance=..3,limit=1] Item.components."minecraft:custom_model_data"')
    check('the pack draws it as the loot duffel (donating:bag_loot)', /donating:bag_loot/.test(model), model)

    // ---------- Who can take it ----------
    await cmd(`zzdata ${B} bag-tier none`)
    await cmd(`zzbagapply ${B}`)
    let t = Date.now()
    await tp(B, 800.5, 800.5)
    await sleep(1500)
    check('no bag: nothing taken ("You need a bag")', /need a bag/.test(barSince(B, t)) && (await duffels()).list[0].lines === 'dtest#1=1500;other#2=700', `${barSince(B, t)} ${(await duffels()).raw}`)
    await cmd(`zzdata ${B} bag-tier 1`) // Gym Bag: $2,000
    await cmd(`zzbagapply ${B}`)
    await cmd(`zzpassive ${B} on`)
    t = Date.now()
    await sleep(1500)
    check('passive players can\'t take someone else\'s loot', /Passive players can't take/.test(barSince(B, t)) && (await bag(B)).total === 0 && (await duffels()).list[0].lines === 'dtest#1=1500;other#2=700', barSince(B, t))
    setMark()
    await cmd(`zzpassive ${B} off`)
    t = Date.now()
    await sleep(1500)
    const bB = await bag(B)
    const d2 = await duffels()
    check('takes as much as fits ($2,000 of $2,200), each line keeps its tag, the rest stays in the duffel', bB.total === 2000 && bB.lines.includes('dtest#1=1500') && bB.lines.includes('other#2=500') && d2.n === 1 && d2.list[0].lines === 'other#2=200' && /Loot duffel \$200 /.test(d2.list[0].name), `${bB.raw} ${d2.raw}`)
    check('...with a message and a log line', /\+\$2,000 from a loot duffel/.test(barSince(B, t)) && logged(/duffel-take DuffelB .*took=2000 rest=other#2=200/).length === 1, `${barSince(B, t)} ${since()}`)
    t = Date.now()
    await sleep(1500)
    check('a full bag takes nothing more (BAG FULL)', /BAG FULL/.test(barSince(B, t)) && (await bag(B)).total === 2000 && (await duffels()).list[0].lines === 'other#2=200', barSince(B, t))
    await cmd(`zzbagclear ${B}`)
    await sleep(1500)
    const bB2 = await bag(B)
    check('with room again it takes the rest, and the duffel is gone', bB2.lines === 'other#2=200,' && (await duffels()).n === 0, `${bB2.raw} ${(await duffels()).raw}`)
    const inv = await cmd(`zzdump ${B}`)
    check('the duffel never lands in an inventory', !/(^DUMP |\| )(\d|[1-3]\d)=leather/.test(inv), inv)

    // ---------- A passive player's duffel ----------
    await reset(A)
    await cmd(`zzpassive ${A} on`)
    await dieWith(A, 804.5, 800.5, [['dtest#1', 800]])
    const d3 = await duffels()
    check('a passive player\'s death marks the duffel as theirs alone', d3.n === 1 && d3.list[0].passive === 'true' && d3.list[0].owner === A, d3.raw)
    await cmd(`zzbagclear ${B}`)
    t = Date.now()
    await tp(B, 804.5, 800.5)
    await sleep(1500)
    check('nobody else can take a passive player\'s loot', /passive player's loot/.test(barSince(B, t)) && (await bag(B)).total === 0 && (await duffels()).n === 1, barSince(B, t))
    await tp(B, 812.5, 798.5)
    await cmd(`zztestkit ${A}`)
    await cmd(`zzpassive ${A} off`)
    t = Date.now()
    await tp(A, 804.5, 800.5)
    await sleep(1500)
    check('the owner can\'t take it back in the other passive mode (no switching the payout after robbing)', /switched passive mode/.test(barSince(A, t)) && (await bag(A)).total === 0 && (await duffels()).n === 1, `${barSince(A, t)} ${(await bag(A)).raw}`)
    await cmd(`zzpassive ${A} on`)
    await sleep(1500)
    check('...but can in the mode they died in, with a new bag', (await bag(A)).lines === 'dtest#1=800,' && (await duffels()).n === 0, `${(await bag(A)).raw} ${(await duffels()).raw}`)
    await cmd(`zzpassive ${A} off`)
    await cmd(`zzdata ${A} passive-switched none`)
    await cmd(`zzbagclear ${A}`)

    // ---------- Hoppers ----------
    await cmd(`setblock 812 ${Y - 1} 812 hopper`)
    await dieWith(A, 812.5, 812.5, [['h#1', 90]])
    await sleep(1500)
    const hop = await cmd('data get block 812 199 812 Items')
    const d7 = await duffels()
    check('a hopper can\'t pull a duffel in', d7.n === 1 && d7.list[0].lines === 'h#1=90' && !/leather/.test(hop), `${d7.raw} hopper: ${hop}`)
    await clearItems()
    await cmd(`setblock 812 ${Y - 1} 812 glass`)

    // ---------- Two duffels on one spot ----------
    await dieWith(A, 808.5, 800.5, [['x#1', 100]])
    await dieWith(A, 808.5, 800.5, [['y#1', 100]])
    const d4 = await duffels()
    check('two duffels on the same spot stay two (they never merge)', d4.n === 2 && d4.list.every(d => at(d, 808, 800)) && new Set(d4.list.map(d => d.id)).size === 2, d4.raw)
    await clearItems()

    // ---------- It runs out ----------
    await cmd('zzcfgtime duffel::despawn 3 seconds')
    setMark()
    await dieWith(A, 800.5, 804.5, [['z#1', 100]])
    const alive = (await duffels()).n === 1
    const gone = await until(async () => (await duffels()).n === 0, 6000)
    check('it runs out after its time (cfg duffel::despawn)', alive && gone && logged(/duffel-expired duffel:\d+ lines=z#1=100/).length === 1, since())
    await cmd('zzcfgreload')

    // ---------- A heist's end removes the duffels inside it ----------
    await cmd('zzregion heist_dtest 806 190 806 814 208 814')
    for (const c of ['dheist create dtest 1', 'dheist set dtest name Duffel Test', 'dheist set dtest escape 600', 'dheist set dtest cooldown 5', 'dheist exit dtest 800.5 200 810.5 -90', 'dheist snapshot dtest', 'dheist enable dtest']) await cmd(c)
    const open = await until(async () => /state=open/.test(await cmd('zzheist dtest')), 15000)
    await cmd('dheist start dtest')
    const run = ((await cmd('zzheist dtest')).match(/run=(\d+)/) || [])[1]
    await reset(A)
    await dieWith(A, 810.5, 810.5, [[`dtest#${run}`, 300]])
    await dieWith(A, 812.5, 812.5, [[`dtest#${run}`, 200], ['jewel#3', 400]])
    await dieWith(A, 800.5, 806.5, [['q#1', 50]])
    const d5 = await duffels()
    setMark()
    await cmd('dheist end dtest')
    await sleep(500)
    const d6 = await duffels()
    const moved = d6.list.find(d => d.lines === 'jewel#3=400')
    check('0:00: a duffel inside loses that run\'s loot (gone when that was all of it)', open && d5.n === 3 && d6.n === 2 && logged(new RegExp(`duffel-cleared dtest time duffel:\\d+ lost=300 lines=dtest#${run}=300`)).length === 1, `${d5.raw} -> ${d6.raw} ${since()}`)
    check('...the rest goes out to the exit spot like a robber, and duffels outside stay', moved && at(moved, 800, 810) && d6.list.some(d => d.lines === 'q#1=50' && at(d, 800, 806)) && logged(/duffel-moved dtest time duffel:\d+ lost=200 rest=jewel#3=400/).length === 1, `${d6.raw} ${since()}`)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzdata ${name} passive-switched none`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzbagclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    await rcon.cmd('dheist delete dtest confirm').catch(() => {})
    await rcon.cmd('rg remove -w world heist_dtest').catch(() => {})
    await rcon.cmd('minecraft:kill @e[type=item,x=794,y=190,z=794,dx=24,dy=24,dz=24]').catch(() => {})
    await rcon.cmd(`fill 796 ${Y} 796 816 ${Y + 8} 816 air`).catch(() => {})
    await rcon.cmd(`fill 796 ${Y - 1} 796 816 ${Y - 1} 816 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
