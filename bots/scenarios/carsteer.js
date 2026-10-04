// Steering by speed (DonatingPhone CarSteer.java; the owner, 2026-09-30: "reduce the turning speed by alot, it doesnt
// match the cars speed and acceleration (test with other cars aswell)"). MTVehicles turned every car 8 degrees a tick
// (160 a second) whatever its speed; CarSteer turns it along a circle that widens with speed (per car family), eases the
// steering in and out, doesn't turn a car standing still, turns the nose the other way in reverse, lets a car stuck on a
// wall creep round, and gives MTVehicles its own steering back when switched off. A bot drives each car with its own
// keys (player_input); /dphone carprobe logs MAIN's position and yaw every tick (carprobe.log), /dphone steer the model.
const fs = require('fs')
const path = require('path')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const D = 'SteerD'
const P = 'SteerP' // a passenger (the head guard)
const Y = 200
const PAD = `5800 ${Y - 1} 5800 5980 ${Y - 1} 5980` // 181 x 181: fill's most
const CHUNKS = '5800 5800 5980 5980'
const START = [5815.5, Y, 5890.5] // facing east: 165 blocks of floor ahead
const PROBE = path.join(__dirname, '..', '..', 'server', 'plugins', 'DonatingPhone', 'carprobe.log')
// model, color, the profile its family must map to (a family that fell back to the default would fail)
const CARS = [['sedan', 'Red', 'sedan'], ['suv', 'Black', 'suv'], ['sports', 'White', 'sports'], ['hotrod', 'Red', 'hotrod'], ['viper', 'Black', 'motor'], ['riviera', 'Red', 'cabrio'], ['apex', 'Black', 'racecar']]
const wrap = a => { a %= 360; if (a >= 180) a -= 360; if (a < -180) a += 360; return a }

function probeRows (plate, ticks) {
  const lines = fs.readFileSync(PROBE, 'utf8').split(/\r?\n/)
  let start = -1
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].startsWith(`# carprobe ${plate} ticks=${ticks} `)) { start = i; break }
  if (start < 0) return []
  const rows = []
  for (let i = start + 1; i < lines.length && !lines[i].startsWith('# carprobe'); i++) {
    if (lines[i].startsWith('#')) continue
    const c = lines[i].split(',')
    if (c.length >= 8) if (Number.isFinite(+c[0])) rows.push({ tick: +c[0], x: +c[4], y: +c[5], z: +c[6], yaw: +c[7] })
  }
  return rows
}

// Over rows a..b: mean speed along the heading (b/s, signed), mean yaw rate (deg/s), total yaw change.
function stats (rows) {
  let n = 0, v = 0, w = 0, total = 0
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i]
    if (b.tick !== a.tick + 1) continue
    const hy = a.yaw * Math.PI / 180
    v += ((b.x - a.x) * -Math.sin(hy) + (b.z - a.z) * Math.cos(hy)) * 20
    const d = wrap(b.yaw - a.yaw)
    w += d * 20
    total += d
    n++
  }
  return n ? { v: v / n, w: w / n, total, n } : { v: NaN, w: NaN, total: NaN, n: 0 }
}

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  let pbot = null
  const plates = []
  const placed = [] // every block this test puts in the world, taken out again by its coordinates
  const posOf = async sel => (String(await cmd(`data get entity ${sel} Pos`)).match(/\[([-\d.]+)d, ([-\d.]+)d, ([-\d.]+)d\]/) || []).slice(1).map(Number)
  // A fill needs its chunks loaded: right after forceload add they may not be yet (it fails whole, "not loaded").
  const fillSure = async (area, block) => {
    for (let i = 0; i < 30; i++) {
      const r = await cmd(`fill ${area} ${block}`)
      if (/Successfully|No blocks were filled/.test(r)) return r
      await sleep(500)
    }
    throw new Error(`fill ${area} ${block}: the area never loaded`)
  }
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await fillSure(PAD, 'gray_concrete')
    for (let y = Y; y <= Y + 3; y++) await fillSure(`5800 ${y} 5800 5980 ${y} 5980`, 'air') // a layer at a time: fill's most is 32,768
    bot = await join(D)
    await cmd(`gamemode survival ${D}`)
    await cmd(`zzclear ${D}`)
    await cmd(`zzcombatend ${D}`)
    await cmd(`dlevel set ${D} 150`)
    await cmd(`tag ${D} add donating_carcam_off`)
    await cmd('dphone steer on')
    for (const m of [...String(await cmd(`dgarage info ${D}`)).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) { await cmd(`dgarage take ${D} ${m[1]}`); await cmd(`zzcardelete ${m[1]}`) }
    const settings = await cmd('dphone steer')
    const num = (s, k) => Number((s.match(new RegExp(`(?:^| )${k}=(-?[\\d.]+)`)) || [])[1])
    const prof = name => { const m = settings.match(new RegExp(` ${name}=([\\d.]+)\\|([\\d.]+)`)); return m ? [Number(m[1]), Number(m[2])] : null }
    const rateScale = num(settings, 'rate-scale'), maxRate = num(settings, 'max-rate'), hGrip = num(settings, 'handling-grip'), hRmin = num(settings, 'handling-rmin')
    const expect = (profile, v, h = 0) => {
      const p = prof(profile)
      if (!p) return NaN
      const rmin = p[0] * (1 - hRmin * h), grip = p[1] * (1 + hGrip * h)
      return Math.min(maxRate, rateScale * Math.abs(v) / (rmin + v * v / grip) * 180 / Math.PI)
    }
    const keys = k => bot._client.write('player_input', { inputs: { forward: k.includes('w'), backward: k.includes('s'), left: k.includes('a'), right: k.includes('d'), jump: false, shift: false, sprint: false } })
    const spawned = new Set()
    const place = async (plate, at = START) => {
      keys('')
      await cmd(`minecraft:ride ${D} dismount`).catch(() => {})
      if (!spawned.has(plate)) { await cmd(`zzcarspawn ${plate} ${at.join(' ')}`); spawned.add(plate) } else await cmd(`zzcartp ${plate} ${at.join(' ')}`)
      await sleep(500)
      await cmd(`zzheisttp ${D} ${at[0] - 2} ${Y} ${at[2]}`)
      await cmd(`zzcarmount ${D} ${plate}`)
      await sleep(500)
      await cmd(`execute as @e[type=armor_stand,name=MTVEHICLES_MAIN_${plate}] at @s run minecraft:tp @s ~ ~ ~ -90 0`)
      await sleep(400)
    }
    // Drive: `first` keys for firstMs, then `then` for thenMs; returns the probe rows of the second part (from +skip ticks).
    const drive = async (plate, first, firstMs, then, thenMs, skip = 12) => {
      const ticks = Math.round((firstMs + thenMs) / 50) + 10
      await cmd(`dphone carprobe ${plate} ${ticks}`)
      keys(first); await sleep(firstMs)
      keys(then); await sleep(thenMs)
      const status = await cmd(`dphone steer ${plate}`)
      keys(''); await sleep(900)
      const rows = probeRows(plate, ticks)
      // The turn, found in the rows themselves (wall-clock sleeps drift from server ticks under load): from the tick
      // before the yaw first moves to the last one it moves in, less the ease-out after the keys' release; `turn` skips
      // the first `skip` ticks (the ease-in and settling).
      let a = -1, b = -1
      for (let i = 1; i < rows.length; i++) if (Math.abs(wrap(rows[i].yaw - rows[i - 1].yaw)) > 0.05) { if (a < 0) a = i - 1; b = i }
      const end = b - 4
      return { rows, turn: a < 0 ? [] : rows.slice(a + skip, end + 1), start: a < 0 ? [] : rows.slice(a, end + 1), status }
    }
    const give = async (model, color, build) => {
      if (build) await cmd(`dgarage build ${D} ${build}`)
      else await cmd(`dgarage give ${D} ${model} ${color}`)
      const all = [...String(await cmd(`dgarage info ${D}`)).matchAll(new RegExp(`([A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2})=${model}\\(`, 'g'))].map(m => m[1])
      const plate = all.find(p => !plates.includes(p))
      if (plate) plates.push(plate)
      return plate
    }

    // ---------- Every car at top speed, full lock: the rate the circle gives, and a lot slower than 160 a second ----------
    const tops = {}
    for (const [model, color, wantProfile] of CARS) {
      const plate = await give(model, color)
      if (!plate) { check(`${model}: a car to drive`, false, 'no plate'); continue }
      await place(plate)
      const r = await drive(plate, 'w', 3500, 'wd', 2500)
      const s = stats(r.turn)
      const profile = (r.status.match(/ profile=(\S+)/) || [])[1]
      const want = expect(wantProfile, s.v)
      const mtv = (r.status.match(/ mtv=(\S+)/) || [])[1]
      tops[model] = { plate, s, profile, want }
      check(`${model} (${profile}) at top speed, full lock right: turns at the circle's rate for its speed (within 12%), between 35 and 90 degrees a second (MTVehicles: 160), MTVehicles' own steering 0`,
        profile === wantProfile && s.n > 20 && Math.abs(Math.abs(s.w) - want) <= Math.max(2, 0.12 * want) && Math.abs(s.w) >= 35 && Math.abs(s.w) <= 90 && s.w > 0 && mtv === '0',
        `v=${s.v.toFixed(2)} b/s, ${s.w.toFixed(1)} deg/s (formula ${want.toFixed(1)}) over ${s.n} ticks | ${r.status}`)
    }

    // ---------- The Sedan: no turning in place, reverse the real way, the steering eases in ----------
    const sedan = tops.sedan && tops.sedan.plate
    if (sedan) {
      await place(sedan)
      let r = await drive(sedan, '', 300, 'a', 2000, 0)
      let s = stats(r.rows)
      check('standing still with A held for 2 s: the car doesn\'t turn on the spot (MTVehicles turned it 80 degrees)', Math.abs(s.total) <= 0.5, `turned ${s.total.toFixed(2)} deg | ${r.status}`)
      // From further in: 15 blocks behind START weren't enough, the reverse could run the car off the pad (review fix).
      await place(sedan, [5860.5, Y, 5890.5])
      r = await drive(sedan, 's', 2500, 'sa', 2000)
      s = stats(r.turn)
      const onPad = r.rows.length > 20 && r.rows.every(row => Math.abs(row.y - Y) < 0.01)
      check('reversing with A held: the nose turns right (the yaw goes up: the real way; forward A lowers it), at the circle\'s rate for the reverse speed (on the pad all along)',
        onPad && s.v < -2 && s.w > 5 && Math.abs(s.w - expect('sedan', s.v)) <= Math.max(2, 0.15 * expect('sedan', s.v)),
        `on the pad ${onPad}, v=${s.v.toFixed(2)} b/s, ${s.w.toFixed(1)} deg/s (formula ${expect('sedan', s.v).toFixed(1)}) | ${r.status}`)
      await place(sedan)
      r = await drive(sedan, 'w', 3500, 'wd', 1500, 0)
      const d = []
      for (let i = 1; i < r.start.length; i++) d.push(wrap(r.start[i].yaw - r.start[i - 1].yaw))
      const steady = d.slice(12).reduce((a, b) => a + b, 0) / Math.max(1, d.slice(12).length)
      const first = Math.abs(d[0] || 0)
      const climbs = d.slice(0, 5).every((x, i, a) => i === 0 || x > a[i - 1])
      check('the steering eases in: the first tick after pressing D turns under 40% of the steady rate and the rate climbs tick by tick (no snap), the steady rate within 0.5 s',
        steady > 0 && first < 0.4 * steady && climbs && d.slice(10, 14).every(x => x > 0.8 * steady),
        `first ticks ${d.slice(0, 6).map(x => x.toFixed(2)).join(',')} | steady ${steady.toFixed(2)} deg/tick`)

      // ---------- A wall: stuck nose-first, W+A creeps it round ----------
      await place(sedan)
      await cmd(`fill 5834 ${Y} 5880 5834 ${Y + 2} 5900 stone`)
      r = await drive(sedan, 'w', 3500, 'wa', 1500, 0)
      s = stats(r.rows)
      check('stuck against a wall with W and A held: the car creeps round (at least 20 degrees in 1.5 s) instead of sitting there',
        Math.abs(s.total) >= 20, `turned ${s.total.toFixed(1)} deg | ${r.status}`)

      // ---------- Never a turn into a wall at head height; nobody suffocates in a car (the owner, 2026-09-30) ----------
      // Every driver's seat is within 0.4 blocks of the car's axis, a passenger's further out (the Sedan's second seat 1
      // block): stone all round a passenger's head (5x5 at eye height, but the cells the head touches now) and the
      // creep's swing would put that head in it.
      // The server's own eye (a marker at `anchored eyes`); stone only into air, each block recorded and taken out again
      // by its coordinates (clearing "round the eye" later missed blocks once the car had crept: a stone left at eye
      // height in the lane every car drives stalled the next run's SUV).
      const eyeOf = async n => {
        await cmd(`execute as ${n} at @s anchored eyes positioned ^ ^ ^ run summon minecraft:marker ~ ~ ~ {Tags:["steer_eye"]}`)
        const e = await posOf('@e[type=marker,tag=steer_eye,limit=1]')
        await cmd('minecraft:kill @e[type=marker,tag=steer_eye]')
        return e
      }
      const put = async (b, block = 'stone') => { const ok = /Changed/.test(await cmd(`setblock ${b.join(' ')} ${block} keep`)); if (ok) placed.push(b); return ok }
      const unput = async () => { for (const b of placed.splice(0)) await cmd(`setblock ${b.join(' ')} air`) }
      const seatName = async n => await cmd(`execute as ${n} on vehicle run data get entity @s CustomName`)
      await place(sedan)
      await drive(sedan, 'w', 3500, '', 300, 0)
      pbot = pbot || await join(P)
      await cmd(`gamemode survival ${P}`)
      await sleep(500)
      const s2 = `@e[type=armor_stand,name=MTVEHICLES_SEAT2_${sedan},limit=1]`
      const at = await posOf(s2)
      if (at.length === 3) await cmd(`minecraft:tp ${P} ${at[0]} ${Y + 0.5} ${at[2]}`) // on the floor beside it (the seat stand sits in the floor)
      await sleep(300)
      await cmd(`ride ${P} mount ${s2}`)
      await sleep(500)
      const pe = await eyeOf(P), de = await eyeOf(D)
      let ring = 0
      if (pe.length === 3 && de.length === 3 && /SEAT2/.test(await seatName(P))) {
        const hw = 0.24, ey = Math.floor(pe[1])
        const touches = (e, cx, cz) => e[0] + hw > cx && e[0] - hw < cx + 1 && e[2] + hw > cz && e[2] - hw < cz + 1
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          const cx = Math.floor(pe[0]) + dx, cz = Math.floor(pe[2]) + dz
          if (touches(pe, cx, cz) || (Math.floor(de[1]) === ey && touches(de, cx, cz))) continue
          if (await put([cx, ey, cz])) ring++
        }
      }
      r = await drive(sedan, '', 100, 'wa', 2000, 0)
      s = stats(r.rows)
      const hb = Number((r.status.match(/ headblocked=(\d+)/) || [])[1])
      const pSeated = /SEAT2/.test(await seatName(P))
      // The property itself: the passenger's eye box (CarSteer.inWall's, 0.24 each side) is in none of the stones.
      const pe2 = await eyeOf(P)
      const inStone = pe2.length === 3 && [-0.24, 0.24].some(ox => [-0.24, 0.24].some(oz => placed.some(b =>
        b[0] === Math.floor(pe2[0] + ox) && b[1] === Math.floor(pe2[1]) && b[2] === Math.floor(pe2[2] + oz))))
      await unput()
      await cmd(`ride ${P} dismount`)
      await cmd(`zzheisttp ${P} 0.5 68 -656.5`)
      check('against the wall with stone round a passenger\'s head: the creep refuses the turns that would swing that head into a block (headblocked counts them; it stops within 22 degrees, 76 without), and the head box ends in no stone',
        ring >= 16 && pSeated && hb >= 5 && Math.abs(s.total) < 22 && !inStone, `${ring} stone at eye y ${pe[1]}, passenger seated ${pSeated}, eye box in stone ${inStone}, turned ${s.total.toFixed(1)} deg | ${r.status}`)
      // A head in a block: no suffocation for carsmooth.wall-grace (40 ticks), then out of the car (not forever: seated
      // in a wall, F5 would see through it). Glowstone: it suffocates, and the old test (the type's default state) missed it.
      const hp = async () => Number(((await cmd(`data get entity ${D} Health`)).match(/([\d.]+)f/) || [])[1])
      await cmd(`zzdmglog ${D} on`) // every hit it takes, with its cause, into the server log
      const hp0 = await hp()
      const dEye = (await eyeOf(D)).map(Math.floor)
      const inBlock = dEye.length === 3 && await put(dEye, 'glowstone')
      await sleep(1200)
      const hpMid = await hp()
      const stillMid = /MAINSEAT/.test(await seatName(D))
      await sleep(1800)
      const hp1 = await hp()
      const outAfter = !/MAINSEAT/.test(await seatName(D))
      const freeAfter = !/Test passed/.test(await cmd(`execute as ${D} at @s anchored eyes positioned ^ ^ ^ if block ~ ~ ~ glowstone`))
      await cmd(`zzdmglog ${D} off`)
      await unput()
      const hits = String(fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'logs', 'latest.log'), 'utf8')).split(/\r?\n/).filter(l => l.includes(`DMG ${D} `)).slice(-3).map(l => l.replace(/^.*?DMG /, '')).join(' | ')
      check('a block (glowstone) right at a seated driver\'s eye: no suffocation damage and still seated after 1.2 s, put out of the car by 3 s (the 40-tick grace) with the head out of the block, still no damage',
        inBlock && hp0 > 0 && hpMid === hp0 && stillMid && outAfter && freeAfter && hp1 === hp0, `glowstone at ${dEye.join(' ')} ${inBlock}, health ${hp0} -> ${hpMid} -> ${hp1}, seated at 1.2 s ${stillMid}, out by 3 s ${outAfter}, head clear ${freeAfter} | hits: ${hits || 'none'}`)
      await cmd(`fill 5834 ${Y} 5880 5834 ${Y + 2} 5900 air`)

      // ---------- Off: MTVehicles steers again (its 8 degrees a tick), with no re-entry in between (an entry resets
      // MTVehicles' value by itself, so a restore that never ran would pass); leaving the car restores it too ----------
      await place(sedan)
      keys('w')
      await sleep(3000)
      const onNow = await cmd(`dphone steer ${sedan}`)
      await cmd('dphone steer off')
      const offNow = await cmd(`dphone steer ${sedan}`)
      await cmd(`dphone carprobe ${sedan} 40`)
      keys('wd')
      await sleep(1500)
      keys('')
      await sleep(900)
      const offRows = probeRows(sedan, 40)
      const offTurn = []
      for (let i = 1; i < offRows.length; i++) { const w = wrap(offRows[i].yaw - offRows[i - 1].yaw); if (Math.abs(w) > 0.05) offTurn.push(w * 20) }
      const offRate = offTurn.length ? offTurn.reduce((a, b) => a + b, 0) / offTurn.length : NaN
      await cmd('dphone steer on')
      check('/dphone steer off while driving gives MTVehicles its steering back at once: its rotation value 8, and 8 degrees a tick (160 a second) again',
        / mtv=0/.test(onNow) && / mtv=8/.test(offNow) && Math.abs(offRate) > 130 && Math.abs(offRate) < 190, `${offRate.toFixed(1)} deg/s | before: ${onNow} | after: ${offNow}`)
      await place(sedan)
      keys('w')
      await sleep(1000)
      const drivenNow = await cmd(`dphone steer ${sedan}`)
      keys('')
      await cmd(`ride ${D} dismount`)
      await sleep(250)
      const leftNow = await cmd(`dphone steer ${sedan}`)
      check('getting out gives MTVehicles its steering back (forget: the rotation value 8 again)',
        / mtv=0/.test(drivenNow) && / mtv=8/.test(leftNow), `driven: ${drivenNow} | out: ${leftNow}`)
    }

    // ---------- Handling III: a tighter circle ----------
    const tuned = await give('apex', 'Black', 'apex|Black|-|0|0|3|-|-')
    if (tuned && tops.apex) {
      await place(tuned)
      const r = await drive(tuned, 'w', 3500, 'wd', 2500)
      const s = stats(r.turn)
      const stat = await cmd(`dphone carstat ${tuned}`)
      const base = Number((r.status.match(/ base=(\d+)/) || [])[1])
      const want = expect('racecar', s.v, base - 8)
      check('an Apex with Handling III (steering 11): CarSteer takes it as its handling base (carstat says so) and turns faster at top speed, as the tighter circle says',
        base === 11 && /turn=11 \(carsteer\)/.test(stat) && Math.abs(s.w - want) <= Math.max(2, 0.12 * want) && s.w > tops.apex.s.w * 1.1,
        `v=${s.v.toFixed(2)} ${s.w.toFixed(1)} deg/s (formula ${want.toFixed(1)}; stock Apex ${tops.apex.s.w.toFixed(1)}) | ${stat} | ${r.status}`)
    }
  } finally {
    if (bot) { try { bot._client.write('player_input', { inputs: { forward: false, backward: false, left: false, right: false, jump: false, shift: false, sprint: false } }) } catch (e) { } }
    await rcon.cmd('dphone steer on').catch(() => {})
    await rcon.cmd(`minecraft:ride ${D} dismount`).catch(() => {})
    for (const p of plates) { await rcon.cmd(`dgarage take ${D} ${p}`).catch(() => {}); await rcon.cmd(`zzcardelete ${p}`).catch(() => {}) }
    await rcon.cmd(`tag ${D} remove donating_carcam_off`).catch(() => {})
    await rcon.cmd(`dlevel reset ${D}`).catch(() => {})
    for (const b of placed.splice(0)) await rcon.cmd(`setblock ${b.join(' ')} air`).catch(() => {})
    await rcon.cmd(`zzdmglog ${D} off`).catch(() => {})
    await rcon.cmd(`fill 5834 ${Y} 5880 5834 ${Y + 2} 5900 air`).catch(() => {})
    await rcon.cmd('minecraft:kill @e[type=marker,tag=steer_eye]').catch(() => {})
    if (pbot) { await rcon.cmd(`ride ${P} dismount`).catch(() => {}); await rcon.cmd(`zzheisttp ${P} 0.5 68 -656.5`).catch(() => {}) } // off the pad before it goes
    await rcon.cmd(`fill ${PAD} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd(`zzheisttp ${D} 0.5 68 -656.5`).catch(() => {})
    if (pbot) { await rcon.cmd(`ride ${P} dismount`).catch(() => {}); await quit(pbot).catch(() => {}) }
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
