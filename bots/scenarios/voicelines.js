// The inmates' voice lines (voice.sk, voicelines.sk, tools\make-voice-lines.js; owner, 2026-10-20: "give lefty, rusty,
// tank and whisper some voice lines for the tutorial", /voiceline off mentioned on the first join and on a tutorial
// redo). A line an inmate says in person plays its clip (the sound event donating.voice.<clip>) to that player only,
// from where the NPC stands (a player out of range: from the player), in the voice category, instead of the chat ping;
// only with the server pack loaded and /voiceline on. Never two at once: the same speaker within 2.5 s waits for the
// clip before (no stop), another speaker (or the same one later) stops it first (a stop_sound packet), and a stop
// drops the ones waiting. Lefty's l_meet talk lines wait for each clip to end. The notice "Inmates talk out loud here.
// Don't want it? /voiceline off" once on the first join into the course (not again at a rejoin) and at every
// /tutorial confirm replay. /voiceline on|off, its tab completion, /help commands. The pack's events and OGGs.
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { start, field, sleep } = require('../prisonlib')

const A = 'PcVoiceA' // pack loaded: hears them
const B = 'PcVoiceB' // pack loaded: the bystander, then a course graduate (l_meet's lines, the replay notice)
const C = 'PcVoiceC' // pack declined: hears nothing
const LEFTY = [80.5, 65.5, 151.5]
const NOTICE = /Inmates talk out loud here\. Don't want it\? \/voiceline off/
const REPO = path.join(__dirname, '..', '..')

module.exports = async ({ check }) => {
  const t = await start()
  const { cmd, info, into, said, until } = t
  // Every sound and stop_sound packet a bot gets: { t, name, x, y, z, cat } / { t, stop, cat }.
  const listen = bot => {
    bot.sounds = []
    bot._client.on('sound_effect', p => {
      let name = ''
      if (p.sound && p.sound.data) name = p.sound.data.soundName
      else if (p.sound) name = (bot.registry.sounds[p.sound.soundId] || {}).name || `#${p.sound.soundId}`
      bot.sounds.push({ t: Date.now(), name: String(name), x: p.x / 8, y: p.y / 8, z: p.z / 8, cat: p.soundCategory })
    })
    bot._client.on('stop_sound', p => bot.sounds.push({ t: Date.now(), stop: true, cat: p.source, name: p.sound || '' }))
  }
  const voices = (bot, since = 0) => bot.sounds.filter(s => s.t >= since && !s.stop && /donating\.voice\./.test(s.name))
  const stops = (bot, since = 0) => bot.sounds.filter(s => s.t >= since && s.stop)
  // The chat ping (block.note_block.bit at the player): through ViaBackwards a vanilla sound's id can come out as a
  // neighbour of it in the bot's 1.21.11 registry (didgeridoo), so any note block sound in the master category counts.
  const pings = (bot, since = 0) => bot.sounds.filter(s => s.t >= since && /note_block/.test(s.name) && (s.cat === 'master' || s.cat === 0))
  const clip = s => (s ? s.name.replace(/^.*donating\.voice\./, '') : '')
  const dist = (s, at) => Math.hypot(s.x - at[0], s.y - at[1], s.z - at[2])
  let txn = 0
  const tab = (bot, line) => new Promise(resolve => {
    const id = ++txn
    const on = p => { if (p.transactionId === id) { clearTimeout(timer); bot._client.removeListener('tab_complete', on); resolve((p.matches || []).map(m => (typeof m === 'string' ? m : m.match))) } }
    const timer = setTimeout(() => { bot._client.removeListener('tab_complete', on); resolve([]) }, 4000)
    bot._client.on('tab_complete', on)
    bot._client.write('tab_complete', { transactionId: id, text: line })
  })
  const voice = async n => cmd(`zzvoice ${n}`)
  try {
    // ---------- the pack ----------
    const tool = spawnSync(path.join(REPO, 'tools', 'node', 'node.exe'), [path.join(REPO, 'tools', 'make-voice-lines.js'), '--check'], { encoding: 'utf8' })
    check('make-voice-lines.js --check: the OGGs, the events and voicelines.sk are current', tool.status === 0, (tool.stdout + tool.stderr).slice(0, 400))
    const table = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'voicelines.json'), 'utf8')).lines
    const sounds = JSON.parse(fs.readFileSync(path.join(REPO, 'pack', 'assets', 'minecraft', 'sounds.json'), 'utf8'))
    const oggOk = f => { try { const b = fs.readFileSync(path.join(REPO, 'pack', 'assets', 'donating', 'sounds', 'voice', `${f}.ogg`)); return b.toString('latin1', 0, 4) === 'OggS' && b.toString('latin1', 29, 35) === 'vorbis' && b[39] === 1 } catch (e) { return false } }
    const badEv = table.filter(l => { const e = sounds[`donating.voice.${l.file}`]; const s = e && e.sounds && e.sounds[0]; return !s || s.name !== `donating:voice/${l.file}` || s.stream !== true || !oggOk(l.file) })
    check(`every clip (${table.length}) is a mono Ogg Vorbis file with its streamed event donating.voice.<clip>`, table.length >= 30 && badEv.length === 0, badEv.map(l => l.file).join(', '))
    let zipEv = []
    try {
      const { readZip } = require('../../tools/make-car-wraps')
      const zip = readZip(path.join(REPO, 'extras', 'packs', 'Donating-pack.zip'))
      const zs = JSON.parse(zip.get('assets/minecraft/sounds.json').toString('utf8'))
      zipEv = table.filter(l => !zs[`donating.voice.${l.file}`] || !zip.has(`assets/donating/sounds/voice/${l.file}.ogg`)).map(l => l.file)
    } catch (e) { zipEv = [`ERR ${e.message}`] }
    check('...and the built pack (Donating-pack.zip) has every event and OGG', zipEv.length === 0, zipEv.join(', '))

    await t.prisonOn()
    await t.copsBlind()
    await cmd('djailjobs setup')
    const list = await cmd('dquest list')
    const leftyN = (list.match(/QUEST (\d+): lefty\|jailbreak/) || [])[1]
    check('Lefty stands in the prison world (a quest giver)', !!leftyN, list.slice(0, 300))

    // ---------- the first join into the course: the notice, once ----------
    const a = await t.newBot(A, { fresh: true, pack: 'loaded' })
    listen(a)
    const told = await until(() => said(a, NOTICE), 9000)
    check('a first join into the course: "Inmates talk out loud here. Don\'t want it? /voiceline off"', told && field(await info(A), 'state') === 'course', t.text(a).slice(-400))
    const v0 = await voice(A)
    check('...on, with the server pack loaded (it hears them); the notice remembered', /on=true/.test(v0) && /hears=true/.test(v0) && /told=true/.test(v0), v0)
    const b = await t.newBot(B, { fresh: true, pack: 'loaded' })
    listen(b)
    const c = await t.newBot(C, { fresh: true })
    listen(c)
    await sleep(5000)
    check('a bot that declined the pack doesn\'t hear them (hears=false)', /hears=false/.test(await voice(C)), await voice(C))

    // ---------- a line from Lefty: the clip, from Lefty, to that player only, no ping ----------
    await into(A, 82.5, 65, 151.5, 90, 'course')
    await into(B, 83.5, 65, 151.5, 90, 'course')
    await into(C, 82.5, 65, 152.5, 90, 'course')
    await sleep(1500)
    let since = Date.now()
    await cmd(`dquest open ${A} ${leftyN}`)
    await until(() => voices(a, since).length > 0, 3000)
    let va = voices(a, since)[0]
    check('Lefty to a course player: "You\'re not done down there yet." with its clip (lefty_not_done)', said(a, /Lefty: You're not done down there yet/, since) && clip(va) === 'lefty_not_done', `${JSON.stringify(va)} | ${t.text(a, since).slice(0, 200)}`)
    check('...from where Lefty stands (his head), in the voice category', va && dist(va, [LEFTY[0], LEFTY[1] + 1.6, LEFTY[2]]) < 1.5 && (va.cat === 'voice' || va.cat === 9), JSON.stringify(va))
    check('...instead of the chat ping', pings(a, since).length === 0, JSON.stringify(pings(a, since)))
    await sleep(800)
    check('...to that player only: the bot next to them gets no voice', voices(b, since).length === 0 && !said(b, /not done down there/, since), JSON.stringify(voices(b, since)))
    since = Date.now()
    await cmd(`dquest open ${C} ${leftyN}`)
    await until(() => said(c, /not done down there/, since), 3000)
    await sleep(800)
    check('without the pack: the line and the ping, no voice', said(c, /not done down there/, since) && voices(c, since).length === 0 && pings(c, since).length === 1, JSON.stringify(c.sounds.filter(s => s.t >= since)))

    // ---------- never two at once ----------
    await sleep(2500)
    since = Date.now()
    await cmd(`zzmsg ${A} say Lefty Nobody stays in here forever.`)
    await cmd(`zzmsg ${A} say Lefty First, get yourself sorted.`)
    await until(() => voices(a, since).length >= 2, 5000)
    let vs = voices(a, since)
    const gap = vs.length >= 2 ? vs[1].t - vs[0].t : -1
    check('two lines from Lefty at once: the second waits for the first (2.4 s), nothing stopped', clip(vs[0]) === 'lefty_nobody_stays' && clip(vs[1]) === 'lefty_get_sorted' && gap >= 2000 && gap < 3500 && stops(a, since).length === 0, `gap ${gap} ms ${vs.map(clip)} stops ${stops(a, since).length}`)
    await sleep(3000)
    since = Date.now()
    await cmd(`zzmsg ${A} say Lefty Three ways past the fences: a keycard through the police station, C4 on the vehicle gate, or over the fence by the Gun Shop.`)
    await cmd(`zzmsg ${A} say Lefty Nobody stays in here forever.`)
    await sleep(1000)
    const tr = Date.now()
    await cmd(`zzmsg ${A} say Rusty Ahh. Here.`)
    await until(() => voices(a, tr).length > 0, 3000)
    const st = stops(a, tr)[0]
    const rv = voices(a, tr)[0]
    check('another speaker mid-clip: the clip stops first (stop_sound, the voice category), then Rusty\'s plays at once', st && rv && clip(rv) === 'rusty_trade' && st.t <= rv.t && rv.t - tr < 800 && (st.cat === 9 || st.cat === 'voice'), `${JSON.stringify(st)} ${JSON.stringify(rv)}`)
    check('...Rusty is too far away (B1): his voice comes from the player', rv && dist(rv, [82.5, 66.6, 151.5]) < 2, JSON.stringify(rv))
    await sleep(9000)
    vs = voices(a, since)
    check('...and Lefty\'s line that was waiting never plays', !vs.some(s => clip(s) === 'lefty_nobody_stays'), vs.map(clip).join(', '))
    since = Date.now()
    await cmd(`zzmsg ${A} say Lefty Then the lot. The front gate opens from the gatehouse booth: a keycard gets you in, or punch its fuse box when the guards look away.`)
    await sleep(3000)
    const tl = Date.now()
    await cmd(`zzmsg ${A} say Lefty Mm, chocolate.`)
    await until(() => voices(a, tl).length > 0, 3000)
    check('Lefty again 3 s later (past the 2.5 s chain): his clip stops, the new one plays at once', stops(a, tl).length >= 1 && clip(voices(a, tl)[0]) === 'lefty_chocolate' && voices(a, tl)[0].t - tl < 800, `${JSON.stringify(stops(a, tl))} ${voices(a, tl).map(clip)}`)
    // The chocolate's packets can land in the same millisecond as this window opens (a fast server): wait a bit, the 2.9 s clip still plays.
    await sleep(300)
    since = Date.now()
    await cmd(`zzmsg ${A} say Lefty Free advice? Not today.`)
    await sleep(1500)
    check('a line with no recording: the ping, no voice, and the clip playing isn\'t stopped', voices(a, since).length === 0 && pings(a, since).length === 1 && stops(a, since).length === 0, a.sounds.filter(s => s.t >= tl - 3000 && !/pressure_plate/.test(s.name)).map(s => `${s.t - tl} ${s.stop ? 'STOP' : s.name}`).join(' | ') + ` (since=${since - tl})`)

    // ---------- /voiceline off and on ----------
    await sleep(3200)
    since = Date.now()
    a.chat('/voiceline off')
    await until(() => said(a, /Voice lines: off/, since), 3000)
    check('/voiceline off: "Voice lines: off", the setting saved', said(a, /Voice lines: off/, since) && /on=false/.test(await voice(A)), await voice(A))
    since = Date.now()
    await cmd(`dquest open ${A} ${leftyN}`)
    await until(() => said(a, /not done down there/, since), 3000)
    await sleep(1000)
    check('...then Lefty\'s line is said with the ping, no voice', said(a, /not done down there/, since) && voices(a, since).length === 0 && pings(a, since).length === 1, JSON.stringify(a.sounds.filter(s => s.t >= since)))
    since = Date.now()
    a.chat('/voiceline on')
    await until(() => said(a, /Voice lines: on/, since), 3000)
    check('/voiceline on: "Voice lines: on"', said(a, /Voice lines: on/, since) && /on=true/.test(await voice(A)), await voice(A))
    const t1 = await tab(a, '/voiceline ')
    const t2 = await tab(a, '/voiceline o')
    const t3 = await tab(a, '/skript:voiceline ')
    check('tab completion: /voiceline on and off (also /skript:voiceline)', ['on', 'off'].every(w => t1.includes(w) && t2.includes(w) && t3.includes(w)), `${t1} | ${t2} | ${t3}`)
    since = Date.now()
    a.chat('/help commands')
    await until(() => said(a, /\/voiceline/, since), 3000)
    check('/help commands lists /voiceline', said(a, /\/voiceline \[on\/off\]/, since), t.text(a, since).slice(0, 300))

    // ---------- the notice only once: a rejoin says nothing ----------
    await t.drop(A)
    await sleep(1500)
    const a2 = await t.newBot(A, { pack: 'loaded' })
    await sleep(7000)
    check('a rejoin on the course: no notice again', field(await info(A), 'state') === 'course' && !said(a2, NOTICE), t.text(a2).slice(-300))

    // ---------- Lefty's l_meet lines wait for each clip ----------
    await cmd(`dprison course ${B} skip`)
    await into(B, 82.5, 65, 151.5, 90)
    const meet = await until(async () => /id=l_meet/.test(await cmd(`dstory info ${B} lefty`)), 12000, 500)
    check('a course graduate: Lefty\'s l_meet', meet, await cmd(`dstory info ${B} lefty`))
    await sleep(6000)
    since = Date.now()
    await cmd(`dquest open ${B} ${leftyN}`)
    const done = await until(async () => !/id=l_meet/.test(await cmd(`dstory info ${B} lefty`)), 40000, 500)
    vs = voices(b, since)
    const want = ['lefty_nobody_stays', 'lefty_three_ways', 'lefty_the_lot', 'lefty_get_sorted']
    const len = { lefty_nobody_stays: 2400, lefty_three_ways: 8640, lefty_the_lot: 8480 }
    const order = want.every((w, i) => clip(vs.filter(s => want.includes(clip(s)))[i]) === w)
    const talk = vs.filter(s => want.includes(clip(s)))
    const gapsOk = talk.length === 4 && [0, 1, 2].every(i => talk[i + 1].t - talk[i].t >= len[want[i]] - 300)
    const chatAt = re => { const m = b.log.find(l => l.t >= since && re.test(l.text)); return m ? m.t : 0 }
    const sync = talk.length === 4 && [/Nobody stays in here/, /Three ways past the fences/, /Then the lot/, /First, get yourself sorted/].every((re, i) => Math.abs(chatAt(re) - talk[i].t) < 700)
    check('talking to Lefty (l_meet): his four lines in order, each after the last ended, never two at once', done && order && gapsOk && stops(b, since).length === 0, `${talk.map(s => `${clip(s)}@${s.t - since}`).join(' ')} stops ${stops(b, since).length}`)
    check('...each chat line comes with its clip (the talk waits for the voice, ~22 s instead of 8)', sync, talk.map((s, i) => `${s.t - since}/${chatAt([/Nobody stays in here/, /Three ways past the fences/, /Then the lot/, /First, get yourself sorted/][i]) - since}`).join(' '))

    // ---------- a task done mid-line: the mission waits for the clip (owner, 2026-10-22) ----------
    await sleep(3000)
    await cmd(`dstory set ${B} lefty l_way`)
    await sleep(11000) // l_way's brief is voiced (~9 s): let it end, or the next line cuts it
    since = Date.now()
    await cmd(`zzmsg ${B} say Lefty Three ways past the fences: a keycard through the police station, C4 on the vehicle gate, or over the fence by the Gun Shop.`)
    await cmd(`zzdatatext ${B} lefty-way c4`)
    await sleep(4000)
    const held = /id=l_way/.test(await cmd(`dstory info ${B} lefty`))
    const moved = await until(async () => !/id=l_way/.test(await cmd(`dstory info ${B} lefty`)), 12000, 250)
    const passAt = Date.now() - since
    check('a task done while Lefty still talks: the mission passes only after his line (8.6 s), not mid-clip', held && moved && passAt >= 8400 && stops(b, since).length === 0, `held ${held} moved ${moved} at ${passAt} ms; stops ${stops(b, since).length}; ${await cmd(`dstory info ${B} lefty`)}`)

    // ---------- a /tutorial confirm replay: the notice again ----------
    await sleep(3000)
    since = Date.now()
    b.chat('/tutorial confirm')
    const replay = await until(async () => field(await info(B), 'state') === 'course', 6000)
    const again = await until(() => said(b, NOTICE, since), 4000)
    check('/tutorial confirm (a replay): the notice again', replay && again, `${await info(B)} | ${t.text(b, since).slice(0, 300)}`)
    since = Date.now()
    b.chat('/tutorial stop')
    await until(() => said(b, /Replay stopped/, since), 5000)
    check('...(/tutorial stop puts B back: an inmate)', field(await info(B), 'state') === 'in', await info(B))
  } finally {
    for (const n of [A, B, C]) await cmd(`zzjail ${n} state off`).catch(() => {})
    await t.prisonRestore()
    await t.close()
  }
}
