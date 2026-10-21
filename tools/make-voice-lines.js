// The inmates' voice lines (owner, 2026-10-20: "give lefty, rusty, tank and whisper some voice lines for the tutorial").
// Reads tools\voicelines.json (each clip: its file, speaker and the exact text the recording says) and writes:
//   - pack\assets\donating\sounds\voice\<file>.ogg: server\voicelines\<file>.mp3 (the ElevenLabs takes, the source) as
//     mono Ogg Vorbis (ffmpeg's libvorbis; positional sounds must be mono, or the client doesn't fade them with distance),
//     made again only when missing or older than the MP3 (--force: all);
//   - pack\assets\minecraft\sounds.json: one event donating.voice.<file> per clip (stream: true, heard up to
//     ATTENUATION blocks away; the other events are kept as they are);
//   - server\plugins\Skript\scripts\voicelines.sk: voiceClip(speaker, line) (the clip for a line, "" for none),
//     voiceTicks(clip) (its length) and voiceClips() (every clip). voice.sk plays them.
// A clip is found by its speaker and its exact words, so a line changed in a script plays nothing (it shows up below as
// stale) instead of the old recording. The report at the end lists the clips whose text no script says any more and
// the inmates' lines that have no clip.
//
// Usage: tools\node\node.exe tools\make-voice-lines.js [--check] [--force]
//   --check: writes nothing; fails when an OGG, an event or voicelines.sk isn't what this would write.
// ffmpeg and ffprobe: FFMPEG_DIR, else the PATH, else C:\Users\matti\Tools\ffmpeg\bin.
// Then: tools\node\node.exe tools\make-item-art.js, tools\node\node.exe tools\build-pack.js, Playtest.bat pack.
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const repo = path.join(__dirname, '..')
const TABLE = path.join(__dirname, 'voicelines.json')
const SRC = path.join(repo, 'server', 'voicelines')
const OUT = path.join(repo, 'pack', 'assets', 'donating', 'sounds', 'voice')
const SOUNDS = path.join(repo, 'pack', 'assets', 'minecraft', 'sounds.json')
const SCRIPTS = path.join(repo, 'server', 'plugins', 'Skript', 'scripts')
const SK = path.join(SCRIPTS, 'voicelines.sk')
const checkOnly = process.argv.includes('--check')
const force = process.argv.includes('--force')
// Heard up to this many blocks from the NPC at volume 1 (the client fades a sound linearly to 0 there; vanilla's 16
// left a player 10 blocks away, still "in person" for messages.sk, at 38%).
const ATTENUATION = 24
const PREFIX = 'donating.voice.'

// ---------- ffmpeg ----------
const toolPath = name => {
  const dirs = [process.env.FFMPEG_DIR, '', 'C:\\Users\\matti\\Tools\\ffmpeg\\bin'].filter(d => d !== undefined)
  for (const d of dirs) {
    const exe = d ? path.join(d, `${name}.exe`) : name
    const r = spawnSync(exe, ['-version'], { encoding: 'utf8' })
    if (r.status === 0) return exe
  }
  throw new Error(`${name} not found (set FFMPEG_DIR to the folder with ${name}.exe)`)
}
let FFMPEG = null
let FFPROBE = null
const run = (exe, args) => {
  const r = spawnSync(exe, args, { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`${path.basename(exe)} ${args.join(' ')}: ${(r.stderr || r.error || '').toString().trim()}`)
  return r.stdout
}
// The length of an audio file in seconds.
const seconds = file => {
  if (!FFPROBE) FFPROBE = toolPath('ffprobe')
  const s = Number(run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim())
  if (!(s > 0)) throw new Error(`${file}: no duration`)
  return s
}
// What the client checks first: an Ogg page, a Vorbis identification packet, one channel.
const monoVorbis = file => {
  const b = fs.readFileSync(file)
  return b.length > 40 && b.toString('latin1', 0, 4) === 'OggS' && b.toString('latin1', 29, 35) === 'vorbis' && b[39] === 1
}
const encode = (mp3, ogg) => {
  if (!FFMPEG) FFMPEG = toolPath('ffmpeg')
  run(FFMPEG, ['-nostdin', '-v', 'error', '-y', '-i', mp3, '-map_metadata', '-1', '-vn', '-ac', '1', '-ar', '44100',
    '-c:a', 'libvorbis', '-q:a', '4', '-fflags', '+bitexact', '-flags:a', '+bitexact', ogg])
  if (!monoVorbis(ogg)) throw new Error(`${ogg}: not a mono Ogg Vorbis file`)
}

// ---------- The table ----------
const table = JSON.parse(fs.readFileSync(TABLE, 'utf8').replace(/^\uFEFF/, '')).lines
const keyOf = speaker => speaker.toLowerCase().replace(/ /g, '') // messages.sk's msgKey
const problems = []
{
  const seen = new Set()
  for (const l of table) {
    if (!/^[a-z0-9_]+$/.test(l.file)) problems.push(`${l.file}: a clip name is lower-case letters, digits and _ (a resource name)`)
    if (seen.has(l.file)) problems.push(`${l.file}: listed twice`)
    seen.add(l.file)
    if (!l.speaker || !l.text) problems.push(`${l.file}: needs a speaker and a text`)
    if (l.match && l.match !== 'prefix') problems.push(`${l.file}: match is "prefix" or nothing`)
    const twin = table.find(o => o !== l && keyOf(o.speaker) === keyOf(l.speaker) && o.text === l.text)
    if (twin) problems.push(`${l.file}: the same speaker and text as ${twin.file}`)
  }
  if (problems.length) { console.error(problems.join('\n')); process.exit(1) }
}

// ---------- The OGGs ----------
const stale = [] // what --check found out of date
if (!checkOnly) fs.mkdirSync(OUT, { recursive: true })
const ticks = {}
let bytes = 0
for (const l of table) {
  const mp3 = path.join(SRC, `${l.file}.mp3`)
  const ogg = path.join(OUT, `${l.file}.ogg`)
  const have = fs.existsSync(ogg)
  if (checkOnly) {
    if (!have || !monoVorbis(ogg)) { stale.push(`${l.file}.ogg missing or not mono Vorbis`); continue }
    if (fs.existsSync(mp3) && fs.statSync(mp3).mtimeMs > fs.statSync(ogg).mtimeMs + 2000) stale.push(`${l.file}.ogg is older than its MP3`)
  } else {
    const old = have && fs.existsSync(mp3) && fs.statSync(mp3).mtimeMs > fs.statSync(ogg).mtimeMs + 2000
    if (force || !have || old || !monoVorbis(ogg)) {
      if (!fs.existsSync(mp3)) throw new Error(`${mp3} missing (the source of ${l.file})`)
      encode(mp3, ogg)
    }
  }
  bytes += fs.statSync(ogg).size
  ticks[l.file] = Math.ceil(seconds(ogg) * 20)
}

// ---------- sounds.json ----------
const soundsNow = fs.readFileSync(SOUNDS, 'utf8')
const sounds = JSON.parse(soundsNow.replace(/^\uFEFF/, ''))
const nextSounds = {}
for (const [k, v] of Object.entries(sounds)) if (!k.startsWith(PREFIX)) nextSounds[k] = v
for (const l of [...table].sort((a, b) => a.file.localeCompare(b.file))) {
  nextSounds[PREFIX + l.file] = { sounds: [{ name: `donating:voice/${l.file}`, stream: true, attenuation_distance: ATTENUATION }] }
}
const soundsText = JSON.stringify(nextSounds, null, 2) + '\n'

// ---------- voicelines.sk ----------
const q = s => `"${s.replace(/"/g, '""').replace(/%/g, '%%')}"`
const bySpeaker = new Map()
for (const l of table) {
  const k = keyOf(l.speaker)
  if (!bySpeaker.has(k)) bySpeaker.set(k, [])
  bySpeaker.get(k).push(l)
}
const sk = []
sk.push('# voicelines.sk: GENERATED by tools\\make-voice-lines.js from tools\\voicelines.json. Do not edit: change the table and run')
sk.push('# the tool again (it also makes the OGGs and the pack\'s donating.voice.<clip> events).')
sk.push('# Each recorded line is found by its speaker (messages.sk\'s msgKey of the name: "lefty") and the exact words the')
sk.push('# recording says, so a line changed in a script finds no clip and plays nothing, never the old words (the tool\'s')
sk.push('# report lists it as stale). voice.sk plays the clips (voiceSay, from messages.sk\'s msgSpeak).')
sk.push('')
sk.push('# The clip for a line ("" = none).')
sk.push('function voiceClip(who: text, line: text) :: text:')
let first = true
for (const [k, lines] of bySpeaker) {
  sk.push(`\t${first ? 'if' : 'else if'} {_who} is ${q(k)}:`)
  first = false
  for (const l of lines) {
    sk.push(l.match === 'prefix' ? `\t\tif {_line} starts with ${q(l.text)}:` : `\t\tif {_line} is ${q(l.text)}:`)
    sk.push(`\t\t\treturn ${q(l.file)}`)
  }
}
sk.push('\treturn ""')
sk.push('')
sk.push('# A clip\'s length in ticks (rounded up; 0 = no such clip).')
sk.push('function voiceTicks(clip: text) :: number:')
for (const l of table) {
  sk.push(`\tif {_clip} is ${q(l.file)}:`)
  sk.push(`\t\treturn ${ticks[l.file]}`)
}
sk.push('\treturn 0')
sk.push('')
sk.push('# Every clip (the tests).')
sk.push('function voiceClips() :: texts:')
const names = table.map(l => q(l.file))
sk.push(`\treturn ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)
const skText = sk.join('\n') + '\n'

// ---------- Write or check ----------
const skNow = fs.existsSync(SK) ? fs.readFileSync(SK, 'utf8') : ''
if (checkOnly) {
  if (soundsNow.replace(/\r\n/g, '\n') !== soundsText) stale.push('pack\\assets\\minecraft\\sounds.json: the donating.voice events differ')
  if (skNow.replace(/\r\n/g, '\n') !== skText) stale.push('voicelines.sk differs')
} else {
  if (soundsNow !== soundsText) fs.writeFileSync(SOUNDS, soundsText)
  if (skNow !== skText) fs.writeFileSync(SK, skText)
  // An OGG no clip names any more.
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.ogg') && !table.some(l => `${l.file}.ogg` === f)) { fs.rmSync(path.join(OUT, f)); console.log(`removed ${f} (no clip names it)`) }
}

// ---------- The report: stale clips, lines without one ----------
const read = f => fs.readFileSync(path.join(SCRIPTS, f), 'utf8')
const unq = s => s.replace(/""/g, '"')
const literals = []
for (const f of ['core.sk', 'jailjobs.sk', 'jailcourse.sk']) for (const m of read(f).matchAll(/"((?:[^"\n]|"")*)"/g)) literals.push(unq(m[1]))
const said = (l) => literals.some(s => l.match === 'prefix' ? s.startsWith(l.text) : s === l.text)
const gone = table.filter(l => !said(l))
// What the inmates say in person: Lefty's lessons (core.sk), the jjSay lines (jailjobs.sk), Rusty's course lines
// (jailcourse.sk), Sparks' craft lines (core.sk).
const spoken = []
{
  const core = read('core.sk')
  for (const m of core.matchAll(/^\s*set \{-cfg::story::(l_[a-z0-9_]+)::(brief|done|talk::\*)\} to (.*)$/gm)) {
    for (const s of m[3].matchAll(/"((?:[^"]|"")*)"/g)) spoken.push({ who: 'Lefty', where: `core.sk ${m[1]} ${m[2].replace('::*', '')}`, text: unq(s[1]) })
  }
  for (const m of core.matchAll(/^\s*set \{-cfg::craft::([A-Za-z_]+)::line\} to "((?:[^"]|"")*)"/gm)) spoken.push({ who: 'Sparks', where: `core.sk craft ${m[1]}`, text: unq(m[2]) })
  for (const m of read('jailjobs.sk').matchAll(/jjSay\(\{_p\},\s*([^,]+?),\s*"((?:[^"\n]|"")*)"\)/g)) spoken.push({ who: m[1].replace(/^"|"$/g, ''), where: 'jailjobs.sk', text: unq(m[2]) })
  for (const m of read('jailcourse.sk').matchAll(/storySay\(\{_p\},\s*"([A-Za-z]+)",\s*"((?:[^"\n]|"")*)"\)/g)) spoken.push({ who: m[1], where: 'jailcourse.sk', text: unq(m[2]) })
}
const covered = s => table.some(l => l.match === 'prefix' ? s.text.startsWith(l.text) : s.text === l.text)
const missing = spoken.filter(s => !covered(s))

console.log(`${checkOnly ? 'checked' : 'wrote'} ${table.length} voice clips (${Math.round(bytes / 1024)} KB of OGG), their events in sounds.json and voicelines.sk`)
if (gone.length) console.log(`stale (no script says these words any more, so they never play; record the new line):\n  ${gone.map(l => `${l.file}: ${l.where}`).join('\n  ')}`)
if (missing.length) console.log(`inmate lines without a clip (${missing.length}):\n  ${missing.map(s => `${s.who} (${s.where}): ${s.text}`).join('\n  ')}`)
if (stale.length) { console.error(`OUT OF DATE (run tools\\node\\node.exe tools\\make-voice-lines.js):\n  ${stale.join('\n  ')}`); process.exit(1) }
