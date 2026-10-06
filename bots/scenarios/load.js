// A load test, not a feature test (build plan step 10): the server's tick time (Paper's /mspt) and live heap (after a
// full GC: jcmd GC.class_histogram) with no players, then with 10 bots: 7 hunting Hard hit targets (copies up to
// hit::cap NPCs) and 3 robbers hunted by a difficulty-4 heist's alarm (cop waves). Run it on a server started with
// -Memory 1G to match Minehut's free plan. Every number lands in the report's details; the "checks" only say whether
// the tick stayed under 50 ms (20 TPS) on average and the heap under 75% of the maximum.
const { execSync } = require('child_process')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const JCMD = require('path').join(__dirname, '..', '..', 'tools', 'jdk25', 'bin', 'jcmd.exe') // the server's own JDK (2026-10-05: Java 25)
const Y = 200
const HID = 'zload'
const N = 10
const NODES = [[3100, 3100], [3130, 3100], [3160, 3100], [3160, 3130], [3130, 3130], [3100, 3130]]

// The Paper server's JVM: the java.exe using the most memory (the javapath stub is tiny). Never `jcmd -l`: the server
// runs with -XX:+PerfDisableSharedMem (invisible to it anyway), and it prints other JVMs' command lines, which for a
// running Minecraft client include its login token.
function serverPid () {
  const out = execSync('tasklist /FI "IMAGENAME eq java.exe" /FO CSV /NH', { encoding: 'utf8' })
  let best = { pid: '', kb: -1 }
  for (const line of out.split(/\r?\n/)) {
    const f = line.split('","').map(x => x.replace(/"/g, ''))
    if (f.length < 5) continue
    const kb = Number(f[4].replace(/[^\d]/g, ''))
    if (kb > best.kb) best = { pid: f[1], kb }
  }
  return best.pid
}
function liveHeap (pid) {
  execSync(`"${JCMD}" ${pid} GC.class_histogram`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) // a full GC first
  const info = execSync(`"${JCMD}" ${pid} GC.heap_info`, { encoding: 'utf8' })
  const m = info.match(/total (\d+)K, used (\d+)K/)
  const max = execSync(`"${JCMD}" ${pid} VM.flags`, { encoding: 'utf8' }).match(/MaxHeapSize=(\d+)/)
  return { usedMB: m ? Math.round(+m[2] / 1024) : -1, maxMB: max ? Math.round(+max[1] / 1048576) : -1 }
}

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  const nodes = []
  try {
    // Paper's /mspt: "5s, 10s, 1m" lines of avg/min/max; the 10 s average is the second group.
    const mspt = async () => {
      const r = (await cmd('mspt')).replace(/§./g, '')
      const nums = ((r.split('1m:')[1] || '').match(/[\d.]+/g) || []).map(Number)
      return { raw: r.replace(/\s+/g, ' ').slice(0, 200), avg10: nums.length >= 6 ? nums[3] : NaN, max10: nums.length >= 6 ? nums[5] : NaN }
    }
    const pid = serverPid()
    const base = liveHeap(pid)
    const baseTick = await mspt()

    // Streets for the hunts, a difficulty-4 heist with cop spots.
    await cmd('forceload add 3088 3088 3172 3142')
    await cmd(`fill 3088 ${Y - 1} 3088 3172 ${Y - 1} 3142 glass`)
    for (const [x, z] of NODES) nodes.push(((await cmd(`dhit node addat ${x} ${Y} ${z} Load`)).match(/node (\d+) added/) || [])[1] || '')
    for (let i = 0; i < nodes.length; i++) await cmd(`dhit node link ${nodes[i]} ${nodes[(i + 1) % nodes.length]}`)
    await cmd('zzcfgset hit::start-away 0')
    await cmd('zzcfgset hit::materialize 300')
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    await cmd('forceload add 930 950 990 980')
    await cmd(`fill 930 ${Y - 1} 950 990 ${Y - 1} 980 glass`)
    await cmd('zzcfgtext heist::start-on enter')
    await cmd('zzcfgtime alarm::warning 3 seconds')
    await cmd('zzcfgtime alarm::wave-interval 4 seconds')
    await cmd(`zzregion heist_${HID} 960 199 960 970 205 970`)
    for (const c of [`dheist create ${HID} 4`, `dheist set ${HID} name Load Bank`, `dheist set ${HID} level 0`, `dheist set ${HID} advanced true`, `dheist set ${HID} escape 600`, `dheist exit ${HID} 950.5 ${Y} 965.5`, `dheist snapshot ${HID}`, `dcops ${HID} add 940.5 ${Y} 965.5`, `dcops ${HID} add 940.5 ${Y} 955.5`, `dheist enable ${HID}`]) await cmd(c)
    await sleep(3000)

    for (let i = 0; i < N; i++) {
      const name = `Load${i}`
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dlevel set ${name} 4`)
      await cmd(`dhit reset ${name}`)
      // Unarmed bots would die in seconds and take their load with them: Resistance V keeps them (and the fight) going.
      await cmd(`minecraft:effect give ${name} minecraft:resistance infinite 4 true`)
      if (i < 7) {
        await cmd(`minecraft:tp ${name} ${3100 + i * 8} ${Y} 3115`)
        await cmd(`dhit give ${name} hard`)
      } else {
        await cmd(`zzheisttp ${name} ${962 + (i - 7) * 2}.5 ${Y} 965.5`)
      }
    }
    for (const t of ['easy', 'medium', 'hard']) await cmd(`dhit window ${t} close`)
    await cmd('dhit window hard open 3600')
    await sleep(3000)
    await cmd(`dheist alarm ${HID}`)
    await sleep(25000) // copies made one at a time, the first cop waves
    const samples = []
    const counts = []
    for (let k = 0; k < 5; k++) { samples.push(await mspt()); counts.push(Number(((await cmd('zznpcs')).match(/NPCS (\d+)/) || [])[1])); await sleep(10000) }
    const npcs = `NPCs per sample: ${counts.join(', ')}`
    const loaded = liveHeap(pid)
    const avg = samples.reduce((a, s) => a + s.avg10, 0) / samples.length
    const worst = Math.max(...samples.map(s => s.max10))
    const detail = `base: ${baseTick.raw} heap ${base.usedMB}/${base.maxMB} MB | loaded: avg10 ${samples.map(s => s.avg10).join(', ')} ms (mean ${avg.toFixed(1)}), max10 ${samples.map(s => s.max10).join(', ')} | heap ${loaded.usedMB}/${loaded.maxMB} MB | ${npcs.slice(0, 200)}`
    check('the tick stays under 50 ms on average with 10 players, 5 hit copies and a cop alarm (20 TPS)', avg < 50, detail)
    check('the live heap stays under 75% of the maximum', loaded.usedMB > 0 && loaded.usedMB < 0.75 * loaded.maxMB, detail)
    check(`worst 10-second tick max: ${worst} ms (information)`, true, detail)
  } finally {
    await rcon.cmd(`dheist delete ${HID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${HID}`).catch(() => {})
    for (const t of ['easy', 'medium', 'hard']) await rcon.cmd(`dhit window ${t} close`).catch(() => {})
    for (let i = 0; i < N; i++) {
      await rcon.cmd(`dhit reset Load${i}`).catch(() => {})
      await rcon.cmd(`minecraft:effect clear Load${i}`).catch(() => {})
      await rcon.cmd(`zzclear Load${i}`).catch(() => {})
      await rcon.cmd(`dlevel reset Load${i}`).catch(() => {})
      await rcon.cmd(`minecraft:tp Load${i} 0.5 68 -656.5`).catch(() => {})
    }
    for (const n of nodes) if (n) await rcon.cmd(`dhit node remove ${n}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 3088 ${Y - 1} 3088 3172 ${Y - 1} 3142 air`).catch(() => {})
    await rcon.cmd(`fill 930 ${Y - 1} 950 990 ${Y - 1} 980 air`).catch(() => {})
    await rcon.cmd('forceload remove 3088 3088 3172 3142').catch(() => {})
    await rcon.cmd('forceload remove 930 950 990 980').catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    rcon.close()
  }
}
