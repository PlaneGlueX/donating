// traps.sk: a test "Trap Hall" (x 768..782, z 768..794, difficulty 2) and an advanced "Camera Room"
// (x 788..804, difficulty 4) on a glass platform, set up with /dheist and /dtrap like staff would.
// Robbers walk east (+x) along lanes (z), from x 765.5 (outside) through the traps at x 771..773.
// Checks: staff setup and refusals, laser displays, laser deaths (cause trap, the heist's p, no bounty,
// the death message), sneaking under a high laser, passive and creative players, dry mode, blinking
// lasers, pressure plates, collapsing floors (fall, strip, restore, restore 0 until the reset,
// disable), cameras (cone, wall, sneaking, creative, turret, alarm plate), and the lifecycle (end,
// reload, dump round trip, remove, delete).
const fs = require('fs')
const path = require('path')
const conv = require('mineflayer/lib/conversions')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'TrapA'
const B = 'TrapB'
const Y = 200
const CHUNKS = '760 764 805 796'
const FAR = '0.5 68 -656.5'
const LOG = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'traps.log')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  const cmd = async c => (await rcon.cmd(c)).trim()
  try {
    // ---------- Helpers ----------
    const member = async name => ((await cmd(`zzinheist ${name}`)).match(/INHEIST \S+ (\S+)/) || [])[1]
    const hunt = async name => ((await cmd(`zzinheist ${name}`)).match(/hunt=(\S+)/) || [])[1]
    const heistField = async (h, k) => ((await cmd(`zzheist ${h}`)).match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const traps = async h => cmd(`zztrap ${h}`)
    const tfield = async (h, k) => ((await traps(h)).match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const state = async id => cmd(`zztrapstate ${id}`)
    const displays = async tag => Number(((await cmd(`execute if entity @e[type=minecraft:block_display,tag=${tag}]`)).match(/Count: (\d+)/i) || [0, 0])[1])
    const hallDisplays = async () => Number(((await cmd('execute if entity @e[type=minecraft:block_display,tag=donating_trap,x=768,y=190,z=768,dx=14,dy=18,dz=26]')).match(/Count: (\d+)/i) || [0, 0])[1])
    const pos = async name => {
      const m = (await cmd(`data get entity ${name} Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/)
      return m ? m.slice(1).map(Number) : [NaN, NaN, NaN]
    }
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const data = async (name, key) => ((await cmd(`zzdata ${name} ${key}`)).match(/= (.*)$/m) || [])[1]
    const isBlock = async (x, y, z, b) => /passed/i.test(await cmd(`execute if block ${x} ${y} ${z} minecraft:${b}`))
    const logLines = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split(/\r?\n/).filter(l => l !== '') : [])
    let mark = 0
    const setMark = () => { mark = logLines().length }
    const logged = re => logLines().slice(mark).filter(l => re.test(l))
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const alive = async name => Number(((await cmd(`data get entity ${name} Health`)).match(/data: ([\d.]+)/) || [])[1]) > 0 && (await pos(name))[1] > 190
    // A death: the bot respawns at once, and Paper ignores all damage until the client says it has
    // loaded (Mineflayer never does; 60-tick fallback), so wait before the next trap test.
    const afterDeath = async () => { await sleep(4000) }
    const reset = async name => {
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzdata ${name} passive-switched none`)
      await cmd(`gamemode survival ${name}`)
    }
    const place = async (name, x, z, y = Y) => { await cmd(`zzheisttp ${name} ${x} ${y} ${z}`); await sleep(1300) }
    const walk = async (name, ms, sneak = false) => {
      const bot = bots[name]
      await bot.look(conv.fromNotchianYaw(-90), 0, true)
      if (sneak) bot.setControlState('sneak', true)
      bot.setControlState('forward', true)
      await sleep(ms)
      bot.setControlState('forward', false)
      bot.setControlState('sneak', false)
      await sleep(700)
    }
    // Walk a lane (z) from outside the hall; returns whether the bot died on the way.
    const lane = async (name, z, { ms = 2000, sneak = false } = {}) => {
      await place(name, 765.5, z)
      setMark()
      await walk(name, ms, sneak)
      const died = logged(new RegExp(`kill ${name} `)).length > 0
      return died
    }

    // ---------- Build ----------
    for (const h of ['ztrap', 'ztrapa']) await cmd(`dheist delete ${h} confirm`)
    for (const r of ['heist_ztrap', 'heist_ztrapa']) await cmd(`rg remove -w world ${r}`)
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 760 ${Y} 764 805 ${Y + 12} 796 air`)
    await cmd(`fill 760 ${Y - 1} 764 805 ${Y - 1} 796 glass`)
    await cmd(`fill 771 199 785 773 199 787 oak_planks`) // ztrap-6 floor, open sky below
    await cmd(`fill 771 199 789 771 199 791 oak_planks`) // ztrap-7 strip
    await cmd(`setblock 771 200 779 stone_pressure_plate`) // ztrap-4
    await cmd(`fill 798 200 781 798 202 783 stone`) // the camera room's wall
    await cmd(`setblock 792 200 790 stone_pressure_plate`) // ztrapa-2 (alarm plate)
    await cmd('zzcfgreload')
    await cmd('zzregion heist_ztrap 768 190 768 782 208 794')
    await cmd('zzregion heist_ztrapa 788 196 768 804 208 796')
    for (const c of ['dheist create ztrap 2', 'dheist set ztrap name Trap Hall', 'dheist set ztrap escape 600', 'dheist set ztrap cooldown 5', 'dheist exit ztrap 764.5 200 781.5 -90', 'dheist snapshot ztrap',
      'dheist create ztrapa 4', 'dheist set ztrapa name Camera Room', 'dheist set ztrapa escape 600', 'dheist set ztrapa cooldown 5', 'dheist exit ztrapa 785.5 200 780.5 -90', 'dheist snapshot ztrapa']) await cmd(c)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await reset(name)
      await cmd(`lp user ${name} permission unset donating.staff`)
    }
    await place(A, 764.5, 766.5)
    await place(B, 764.5, 767.5)
    await sleep(5000) // bots can't be hurt until about 6 s after joining

    // ---------- Staff setup ----------
    check('an unknown heist is refused', /unknown heist/.test(await cmd('dtrap add nosuch laser 1 2 3 4 5 6')))
    check('a laser end outside the heist is refused', /outside the heist/.test(await cmd('dtrap add ztrap laser 766 200.9 770 771.5 200.9 770')))
    check('a laser longer than 32 blocks is refused', /too long/.test(await cmd('dtrap add ztrap laser 771.5 200.9 769 771.5 200.9 810')))
    check('alarm traps need an advanced heist', /needs an advanced heist/.test(await cmd('dtrap add ztrap laser 771.5 200.9 769 771.5 200.9 772 effect=alarm')))
    const adds = [
      'dtrap add ztrap laser 771.5 200.9 769 771.5 200.9 772', // 1: lane 770.5, waist
      'dtrap add ztrap laser 771.5 201.65 772 771.5 201.65 775', // 2: lane 773.5, high (sneak under)
      'dtrap add ztrap laser 771.5 200.4 775 771.5 200.4 778', // 3: lane 776.5, low
      'dtrap add ztrap plate 771 200 779', // 4: lane 779.5
      'dtrap add ztrap laser 769.5 200.5 781 773.5 201.5 784', // 5: lane 782.5, sloped
      'dtrap add ztrap floor 771 199 785 773 199 787', // 6: lane 786.5
      'dtrap add ztrap floor 771 199 789 771 199 791', // 7: lane 790.5, 1-wide strip
      'dtrap add ztrap laser 771.5 200.9 792.2 771.5 200.9 794.8 blink=true', // 8: lane 793.5
      'dtrap add ztrapa camera 803.5 202.5 780.5 90 15', // ztrapa-1, facing west, 15° down
      'dtrap add ztrapa plate 792 200 790 effect=alarm' // ztrapa-2
    ]
    const replies = []
    for (const c of adds) replies.push(await cmd(c))
    const list = await cmd('dtrap list ztrap')
    check('10 traps added with ids <heist>-<n>', replies.every(r => /added/.test(r)) && /ztrap-8 laser/.test(list) && /ztrapa-2 added/.test(replies[9]) && /ztrap-1 laser .* len=3/.test(list), replies.join(' / '))
    let t = Date.now()
    bots[A].chat('/dtrap list ztrap')
    await sleep(800)
    check('/dtrap is staff only', /Staff only/.test(text(A, t)), text(A, t))
    check('no displays while the heist is disabled', (await displays('donating_trap')) === 0 && /armed=false/.test(await traps('ztrap')))
    await cmd('dheist enable ztrap')
    await cmd('dheist enable ztrapa')
    const armed = await until(async () => /armed=true/.test(await traps('ztrap')) && /armed=true/.test(await traps('ztrapa')), 6000)
    await sleep(1000)
    const scale1 = await cmd('data get entity @e[type=minecraft:block_display,tag=donating_trap,limit=1,sort=nearest,x=771.5,y=200.9,z=769] transformation.scale')
    const rot5 = await cmd('data get entity @e[type=minecraft:block_display,tag=donating_trap,limit=1,sort=nearest,x=769.5,y=200.5,z=781] Rotation')
    check('enabled: traps arm, one display per laser and camera (5 + 1)', armed && (await displays('donating_trap')) === 6, `${await traps('ztrap')} / ${await traps('ztrapa')} / ${await displays('donating_trap')}`)
    check('a laser display is a thin rod as long as the beam; a sloped one is turned to match', /\[0\.06f, 0\.06f, 3\.0f\]/.test(scale1) && /\[306\.8\d*f, -11\.3\d*f\]/.test(rot5), `${scale1} / ${rot5}`)
    await place(A, 772.5, 768.5) // inside, clear of every trap
    const addInside = await cmd('dtrap add ztrap laser 771.5 200.9 769 771.5 200.9 772')
    check('adding a trap while robbers are inside is refused', /robbers are inside/.test(addInside), addInside)
    await place(A, 764.5, 766.5)

    // ---------- Lasers ----------
    await cmd(`zztestkit ${A}`)
    await cmd(`eco set ${A} 100000`)
    t = Date.now()
    let died = await lane(A, 770.5)
    check('walking into a laser kills', died && logged(/kill TrapA \S+ ztrap-1 laser/).length === 1 && (await member(A)) === 'none', logLines().slice(mark).join(' / '))
    check('...a trap death at the heist\'s p: L = min(100,000 × 2%, min(6,000, 12,000)) = $2,000', (await bal(A)) === 98000 && (await data(A, 'last-death-cause')) === 'trap', `${await bal(A)} / ${await data(A, 'last-death-cause')}`)
    check('...and everyone reads which trap', /walked into a laser in the Trap Hall/.test(text(B, t)), text(B, t))
    await afterDeath()
    // A player's hit a moment before still counts as the trap (no bounty for the hitter).
    await reset(A)
    await place(A, 765.5, 770.5)
    await sleep(4200) // EssentialsX: no PvP right after a teleport
    await cmd(`zzbountyreset ${B}`)
    await cmd(`zzshieldoff ${A}`)
    await cmd(`damage ${A} 1 minecraft:player_attack by ${B}`)
    const hitLanded = / tagged=true .*cause=player:/.test(await cmd(`zzcombat ${A}`))
    setMark()
    await walk(A, 2000)
    check('shot by a player just before: still a trap death, no bounty for them', hitLanded && logged(/kill TrapA \S+ ztrap-1/).length === 1 && (await data(A, 'last-death-cause')) === 'trap' && Number(((await cmd(`zzbounty ${B}`)).match(/BOUNTY \S+ (\d+)/) || [])[1] || 0) === 0, `${await data(A, 'last-death-cause')} / ${await cmd(`zzbounty ${B}`)}`)
    await afterDeath()
    await reset(A)
    died = await lane(A, 773.5)
    check('a high laser kills a robber walking upright', died, logLines().slice(mark).join(' / '))
    await afterDeath()
    await reset(A)
    died = await lane(A, 773.5, { ms: 6500, sneak: true })
    check('...and sneaking under it is safe', !died && (await member(A)) === 'ztrap' && (await pos(A))[0] > 772, `${await pos(A)}`)
    await place(A, 764.5, 766.5)
    died = await lane(A, 776.5)
    check('a low laser kills a robber who walks into it', died)
    await afterDeath()
    await reset(A)
    const probes = [
      await cmd('zztrapprobe ztrap 771.5 200 776.5 stand'), await cmd('zztrapprobe ztrap 771.5 200.6 776.5 stand'),
      await cmd('zztrapprobe ztrap 771.5 200 770.5 sneak'), await cmd('zztrapprobe ztrap 771.5 200.95 770.5 stand'),
      await cmd('zztrapprobe ztrap 771.5 200 773.5 stand'), await cmd('zztrapprobe ztrap 771.5 200 773.5 sneak')]
    check('heights: a jump clears the low laser, the waist laser hits a sneaker but not a high jump, the high laser only standing', /PROBE 3/.test(probes[0]) && /none/.test(probes[1]) && /PROBE 1/.test(probes[2]) && /none/.test(probes[3]) && /PROBE 2/.test(probes[4]) && /none/.test(probes[5]), probes.join(' / '))
    await cmd(`zzpassive ${A} on`)
    died = await lane(A, 770.5)
    check('passive robbers die to traps too', died)
    await afterDeath()
    await reset(A)
    await cmd(`gamemode creative ${B}`)
    setMark()
    await place(B, 765.5, 770.5)
    await walk(B, 2000)
    check('creative staff walk through (not robbers)', logged(/kill TrapB/).length === 0 && (await member(B)) === 'none')
    await cmd(`gamemode survival ${B}`)
    await place(B, 764.5, 767.5)
    // Sprinting through the sloped laser: sampling the path catches it.
    let sprintDeaths = 0
    for (let i = 0; i < 2; i++) {
      await place(A, 765.5, 782.5)
      setMark()
      bots[A].setControlState('sprint', true)
      await walk(A, 1600)
      bots[A].setControlState('sprint', false)
      if (logged(/kill TrapA \S+ ztrap-5/).length === 1) sprintDeaths++
      await afterDeath()
      await reset(A)
    }
    check('sprinting through a sloped laser still kills (2/2)', sprintDeaths === 2, `${sprintDeaths}/2`)
    await cmd(`dtrap dry ${A} on`)
    t = Date.now()
    died = await lane(A, 770.5)
    check('dry mode: a "DRY HIT" instead of a death', !died && logged(/dry TrapA ztrap-1/).length >= 1 && (await member(A)) === 'ztrap', logLines().slice(mark).join(' / '))
    await cmd(`dtrap dry ${A} off`)
    await place(A, 764.5, 766.5)

    // ---------- Blinking ----------
    let seenOn = false
    let seenOff = false
    for (let i = 0; i < 20 && !(seenOn && seenOff); i++) {
      const st = await state('ztrap-8')
      if (/vis=true/.test(st)) seenOn = true
      if (/vis=false/.test(st)) seenOff = true
      await sleep(300)
    }
    check('a blinking laser turns on and off', seenOn && seenOff)
    // Walk through right after it turns off (2 s off is plenty).
    await place(A, 769.5, 793.5) // 2 blocks before the beam line
    await until(async () => /vis=true/.test(await state('ztrap-8')), 5000)
    await until(async () => /vis=false/.test(await state('ztrap-8')), 5000)
    setMark()
    await walk(A, 900)
    check('walking through while it\'s off is safe', logged(/kill TrapA/).length === 0 && (await pos(A))[0] > 772, `${await pos(A)}`)
    await until(async () => /vis=false/.test(await state('ztrap-8')), 5000)
    setMark()
    await place(A, 771.5, 793.5) // in the beam line while it's off
    const blinkKill = await until(async () => logged(/kill TrapA \S+ ztrap-8/).length === 1, 5000)
    const phase = Number(((logged(/kill TrapA \S+ ztrap-8/)[0] || '').match(/phase=(\d+)/) || [])[1])
    check('standing in the line when it comes back on kills, only after the lead time', blinkKill && phase >= 4, logged(/ztrap-8/).join(' / '))
    await afterDeath()
    await reset(A)

    // ---------- Plates ----------
    await cmd(`gamemode creative ${B}`)
    await place(B, 765.5, 779.5)
    await walk(B, 2000)
    const unpressed = await isBlock(771, 200, 779, 'stone_pressure_plate[powered=false]')
    await cmd(`gamemode survival ${B}`)
    await place(B, 764.5, 767.5)
    t = Date.now()
    died = await lane(A, 779.5)
    check('a creative player walking over a trap plate doesn\'t press it (it still works after)', unpressed && died, `unpressed ${unpressed}`)
    check('stepping on a pressure plate kills', died && logged(/kill TrapA \S+ ztrap-4 plate/).length === 1, logLines().slice(mark).join(' / '))
    check('...the plate never goes down, and the death line says so', await isBlock(771, 200, 779, 'stone_pressure_plate[powered=false]') && /stepped on a trap/.test(text(B, t)), text(B, t))
    await afterDeath()
    await reset(A)

    // ---------- Floors ----------
    died = await lane(A, 786.5)
    check('a collapsing floor drops the robber (the floor is gone, they die below it)', died && logged(/collapse ztrap-6/).length === 1 && logged(/kill TrapA \S+ ztrap-6 floor/).length === 1, logLines().slice(mark).join(' / '))
    const gone = await isBlock(772, 199, 786, 'air')
    await place(B, 770.2, 786.5) // waiting on the west rim, next to the hole
    const back = await until(async () => isBlock(772, 199, 786, 'oak_planks'), 13000)
    check('...and comes back about 10 s later, even with a robber waiting on the rim', gone && back)
    await place(B, 764.5, 767.5)
    await afterDeath()
    await reset(A)
    died = await lane(A, 790.5)
    const stripGone = await until(async () => isBlock(771, 199, 790, 'air'), 2000)
    check('walking over a 1-wide strip without stopping is safe (it falls behind you)', !died && (await member(A)) === 'ztrap' && stripGone, `${await pos(A)}`)
    await place(A, 764.5, 766.5)
    await cmd('dtrap set ztrap-6 delay 3')
    await place(B, 772.5, 786.5, 200)
    await until(async () => /floor=crack/.test(await state('ztrap-6')), 3000)
    const bBefore = await bal(B)
    await cmd(`zzcombatend ${B}`)
    await cmd(`eco set ${B} 100000`)
    await cmd(`zztestkit ${B}`)
    await until(async () => /floor=crack/.test(await state('ztrap-6')), 3000)
    // B is on a cracking floor (tagged "trap"): logging out now is a trap death.
    await sleep(300)
    await quit(bots[B])
    await sleep(1500)
    check('logging out on a cracking floor counts as a trap death', (await data(B, 'last-death-cause')) === 'trap' && (await bal(B)) === 98000, `${bBefore} -> ${await bal(B)}; ${await data(B, 'last-death-cause')}`)
    bots[B] = await join(B)
    await reset(B)
    await cmd('dtrap set ztrap-6 delay default')
    await until(async () => isBlock(772, 199, 786, 'oak_planks'), 13000)
    await cmd('dtrap set ztrap-6 restore 0')
    died = await lane(A, 786.5)
    await sleep(12000)
    const stillGone = await isBlock(772, 199, 786, 'air')
    await cmd('dheist end ztrap')
    const resetBack = await until(async () => (await isBlock(772, 199, 786, 'oak_planks')) && /6:up/.test(await traps('ztrap')), 8000)
    check('restore 0: the floor stays down until the room reset', died && stillGone && resetBack, `${stillGone} ${resetBack} ${await traps('ztrap')}`)
    await cmd('dtrap set ztrap-6 restore default')
    await afterDeath()
    await reset(A)
    check('after the cooldown the heist reopens with its traps armed again', await until(async () => /armed=true/.test(await traps('ztrap')) && (await tfield('ztrap', 'displays')) === '5', 12000), await traps('ztrap'))
    // Collapse a floor, then disable: it comes back at once, and nothing is left.
    await cmd('dtrap set ztrap-6 delay 0')
    await place(A, 772.5, 786.5, 200)
    await until(async () => isBlock(772, 199, 786, 'air'), 3000)
    await cmd('dheist disable ztrap')
    await sleep(1200)
    check('disable: collapsed floors come back at once, no displays left', (await isBlock(772, 199, 786, 'oak_planks')) && (await hallDisplays()) === 0 && /armed=false/.test(await traps('ztrap')), `${await traps('ztrap')} entities=${await hallDisplays()}`)
    await cmd('dtrap set ztrap-6 delay default')
    await afterDeath()
    await reset(A)
    await cmd('dheist enable ztrap')
    await until(async () => /armed=true/.test(await traps('ztrap')), 8000)

    // ---------- Cameras (ztrapa, advanced) ----------
    const watch = async (x, z, { sneak = false, ms = 3000 } = {}) => {
      if (sneak) { bots[A].setControlState('sneak', true); await sleep(300) } // sneaking before it's in view
      await place(A, x, z)
      const tripped = await until(async () => (await heistField('ztrapa', 'alarm')) !== 'none', ms)
      bots[A].setControlState('sneak', false)
      return tripped
    }
    check('outside the camera\'s cone: not seen', !(await watch(797.5, 788.5)))
    check('behind a wall: not seen', !(await watch(795.5, 782.5)))
    check('sneaking far away: not seen', !(await watch(795.5, 780.5, { sneak: true })))
    setMark()
    check('in the cone with a clear view: the alarm trips within a second or two', await watch(796.5, 780.5), await cmd('zzheist ztrapa'))
    check('...logged as the camera, and the robber is hunted', /source=camera:ztrapa-1/.test(fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'heists.log'), 'utf8').split(/\r?\n/).filter(Boolean).slice(-40).join(' ')) && (await hunt(A)) === 'ztrapa')
    await cmd('dheist end ztrapa')
    await until(async () => (await heistField('ztrapa', 'state')) === 'open', 12000)
    check('sneaking close by: seen', await watch(799.5, 780.5, { sneak: true }), await cmd('zzheist ztrapa'))
    await cmd('dheist end ztrapa')
    await until(async () => (await heistField('ztrapa', 'state')) === 'open', 12000)
    await cmd(`gamemode creative ${B}`)
    await place(B, 796.5, 780.5)
    const staffSeen = await until(async () => (await heistField('ztrapa', 'alarm')) !== 'none', 3000)
    check('creative staff aren\'t seen', !staffSeen)
    await cmd(`gamemode survival ${B}`)
    await place(B, 764.5, 767.5)
    await place(A, 764.5, 766.5)
    // A turret: a camera that kills (any heist).
    await cmd('dheist set ztrapa advanced false')
    const inert = /INERT/.test(await cmd('dtrap list ztrapa'))
    await cmd('dtrap set ztrapa-1 effect kill')
    setMark()
    await place(A, 796.5, 780.5)
    const turret = await until(async () => logged(/kill TrapA \S+ ztrapa-1 camera/).length === 1, 5000)
    check('an alarm camera in a heist that isn\'t advanced is marked INERT; effect=kill makes it a turret', inert && turret, logLines().slice(mark).join(' / '))
    await cmd('dtrap set ztrapa-1 effect default')
    await cmd('dheist set ztrapa advanced default')
    await afterDeath()
    await reset(A)
    await until(async () => (await heistField('ztrapa', 'alarm')) === 'none', 3000)
    await place(A, 788.5, 790.5)
    setMark()
    await walk(A, 1500)
    const plateAlarm = await until(async () => (await heistField('ztrapa', 'alarm')) !== 'none', 3000)
    check('an alarm plate trips the alarm and doesn\'t kill', plateAlarm && logged(/alarm TrapA ztrapa-2 tripped=true/).length === 1 && logged(/kill TrapA/).length === 0 && (await hunt(A)) === 'ztrapa', logLines().slice(mark).join(' / '))
    await cmd('dheist end ztrapa')

    // ---------- Lifecycle ----------
    await place(A, 764.5, 766.5)
    await cmd('dheist start ztrap')
    await cmd('dheist end ztrap')
    check('a closed heist has no trap displays', await until(async () => (await hallDisplays()) === 0 && /armed=false/.test(await traps('ztrap')), 3000), `${await traps('ztrap')} entities=${await hallDisplays()}`)
    await until(async () => /armed=true/.test(await traps('ztrap')), 12000)
    await cmd('sk reload traps')
    await sleep(2500)
    check('/sk reload traps: displays come back once, no duplicates', (await displays('donating_trap')) === 6 && /displays=5/.test(await traps('ztrap')), `${await displays('donating_trap')} ${await traps('ztrap')}`)
    const dump = (await cmd('dtrap dump ztrap')).split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('dtrap add'))
    const before = (await cmd('dtrap list ztrap')).replace(/armed=\w+/, '')
    await cmd('dheist disable ztrap')
    await cmd('dtrap clear ztrap confirm')
    await cmd('dheist delete ztrap confirm') // also resets the numbering
    for (const c of ['dheist create ztrap 2', 'dheist set ztrap name Trap Hall']) await cmd(c)
    for (const line of dump) await cmd(line)
    const after = (await cmd('dtrap list ztrap')).replace(/armed=\w+/, '')
    check('dump round trip: replaying the dump recreates the same traps', dump.length === 8 && after === before, `${dump.length} lines; ${before === after}`)
    await cmd('dtrap remove ztrap-8')
    check('remove takes one trap away', !/ztrap-8/.test(await cmd('dtrap list ztrap')))
    await cmd('dheist delete ztrap confirm')
    check('deleting the heist deletes its traps', /unknown heist/.test(await cmd('dtrap list ztrap')) && /traps=0/.test(await traps('ztrap')))
    const bench = await cmd(`zztrapbench ${A} 200`)
    console.error(`bench: ${bench}`)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`dtrap dry ${name} off`).catch(() => {})
      await rcon.cmd(`gamemode survival ${name}`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzdata ${name} passive-switched none`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    for (const h of ['ztrap', 'ztrapa']) await rcon.cmd(`dheist delete ${h} confirm`).catch(() => {})
    for (const r of ['heist_ztrap', 'heist_ztrapa']) await rcon.cmd(`rg remove -w world ${r}`).catch(() => {})
    await rcon.cmd(`fill 760 ${Y} 764 805 ${Y + 12} 796 air`).catch(() => {})
    await rcon.cmd(`fill 760 ${Y - 1} 764 805 ${Y - 1} 796 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
