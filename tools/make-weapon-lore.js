// Writes server\plugins\Skript\scripts\weaponlore.sk: wpnLore(title), the lore every weapon and consumable the shops
// sell carries in its WeaponMechanics file (Info.Weapon_Item.Lore: what it is and its stats), turned from MiniMessage
// into & colors, for the shop's hover details (shop.sk; owner, 2026-10-13: "display weapon and consumable details while
// hovering over the item in the shop page"). The titles are core.sk's shop::weapons, then shop::consumables, then
// craft::weapons (Sparks' makeshift weapons in the prison, 2026-10-20: his menu shows them too).
//
// Usage: tools\node\node.exe tools\make-weapon-lore.js [--check]
//   (no flag)  writes weaponlore.sk when it changed ("wrote ... (N titles)" or "up to date")
//   --check    writes nothing; exit 1 when weaponlore.sk differs from what the files say (naming the titles)
// A title with no weapon file, or a weapon file with no lore, always exits 1. So do colors the shop can't show:
// dark gray (<dark_gray>, &8: CLAUDE.md's text colors), closing tags, hex colors, unknown tags and section signs.
// Node built-ins only. Run it after changing a listed weapon's lore or the lists, then /sk reload weaponlore.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const CORE = path.join(ROOT, 'server', 'plugins', 'Skript', 'scripts', 'core.sk')
const WEAPONS = path.join(ROOT, 'server', 'plugins', 'WeaponMechanics', 'weapons')
const OUT = path.join(ROOT, 'server', 'plugins', 'Skript', 'scripts', 'weaponlore.sk')
const CHECK = process.argv.includes('--check')

const fail = msg => {
  console.error(`make-weapon-lore: ${msg}`)
  process.exit(1)
}
const rel = f => path.relative(ROOT, f).split(path.sep).join('\\')

// ---------- core.sk: the titles the shops sell ----------
// A list setting's titles by its full key ("shop::weapons").
const shopList = (core, key) => {
  const lines = core.split(/\r?\n/).filter(l => l.match(new RegExp(`^\\s*set \\{-cfg::${key}::\\*\\} to `)))
  if (lines.length !== 1) fail(`core.sk has ${lines.length} lines setting ${key} (expected 1)`)
  const items = [...lines[0].replace(/^.*?\} to /, '').matchAll(/"((?:[^"]|"")*)"/g)].map(m => m[1].replace(/""/g, '"'))
  if (!items.length) fail(`core.sk's ${key} names no titles`)
  return items
}

// ---------- WeaponMechanics' files: every top-level key, and its Info.Weapon_Item.Lore ----------
const ymlFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const f = path.join(dir, e.name)
  return e.isDirectory() ? ymlFiles(f) : /\.ya?ml$/i.test(e.name) ? [f] : []
})

// One list item's scalar: "double" (escapes \" and \\ only), 'single' ('' = '), or plain (a trailing # comment cut).
const scalar = (raw, where) => {
  const s = raw.trim()
  const rest = (tail, what) => {
    if (tail.trim() !== '' && !/^\s+#/.test(tail)) fail(`${where}: text after the ${what}: ${tail.trim()}`)
  }
  if (s.startsWith('"')) {
    let out = ''
    for (let i = 1; i < s.length; i++) {
      const c = s[i]
      if (c === '\\') {
        const n = s[i + 1]
        if (n !== '"' && n !== '\\') fail(`${where}: the escape \\${n ?? ''} (only \\" and \\\\ are read)`)
        out += n
        i++
      } else if (c === '"') {
        rest(s.slice(i + 1), 'closing quote')
        return out
      } else out += c
    }
    fail(`${where}: no closing "`)
  }
  if (s.startsWith("'")) {
    let out = ''
    for (let i = 1; i < s.length; i++) {
      const c = s[i]
      if (c === "'") {
        if (s[i + 1] === "'") { out += "'"; i++; continue }
        rest(s.slice(i + 1), 'closing quote')
        return out
      }
      out += c
    }
    fail(`${where}: no closing '`)
  }
  if (s === '' || s === '~' || s === 'null') fail(`${where}: an empty item (write "" for an empty line)`)
  if (/^[&*!|>%@`{[]/.test(s)) fail(`${where}: quote this item: ${s}`)
  return s.replace(/\s+#.*$/, '').trim()
}

const readWeapons = () => {
  const index = new Map() // title -> { file, lore: [..] | null }
  for (const file of ymlFiles(WEAPONS).sort()) {
    const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)
    let title = null
    let stack = []
    for (let n = 0; n < lines.length; n++) {
      const line = lines[n]
      if (/^\s*(#.*)?$/.test(line)) continue
      const top = line.match(/^([A-Za-z0-9_.\-]+):\s*(#.*)?$/)
      if (top) {
        title = top[1]
        if (index.has(title)) fail(`${title} is a top-level key in both ${rel(index.get(title).file)} and ${rel(file)}`)
        index.set(title, { file, lore: null })
        stack = []
        continue
      }
      if (!/^\s/.test(line)) { title = null; continue } // some other top-level line (---): not a weapon
      if (!title) continue
      const key = line.match(/^(\s+)([A-Za-z0-9_.\-]+):(.*)$/)
      if (!key) continue
      const indent = key[1].length
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop()
      stack.push({ indent, key: key[2] })
      if (stack.map(k => k.key).join('.') !== 'Info.Weapon_Item.Lore') continue
      const where = `${rel(file)}:${n + 1} (${title})`
      if (!/^\s*(#.*)?$/.test(key[3])) fail(`${where}: Lore must be a list of lines, one "- " item each`)
      const lore = []
      let m = n + 1
      for (; m < lines.length; m++) {
        const l = lines[m]
        if (/^\s*(#.*)?$/.test(l)) continue
        const item = l.match(/^(\s*)-(?:\s(.*))?$/)
        if (!item || item[1].length < indent) break
        lore.push(scalar(item[2] ?? '', `${rel(file)}:${m + 1} (${title})`))
      }
      if (index.get(title).lore) fail(`${where}: a second Info.Weapon_Item.Lore`)
      index.get(title).lore = lore
      n = m - 1
    }
  }
  return index
}

// ---------- MiniMessage -> & codes ----------
const COLORS = {
  black: '0', dark_blue: '1', dark_green: '2', dark_aqua: '3', dark_red: '4', dark_purple: '5', gold: '6', gray: '7',
  grey: '7', blue: '9', green: 'a', aqua: 'b', red: 'c', light_purple: 'd', yellow: 'e', white: 'f'
}
const DECORATIONS = {
  bold: 'l', b: 'l', italic: 'o', i: 'o', em: 'o', underlined: 'n', u: 'n', strikethrough: 'm', st: 'm',
  obfuscated: 'k', obf: 'k', reset: 'r'
}
const toLegacy = (text, where) => {
  if (text.includes('§')) fail(`${where}: a section sign (use <color> or & codes)`)
  if (/&8/i.test(text)) fail(`${where}: &8 (dark gray is hard to read in lore: use &7 / <gray>)`)
  const out = text.replace(/<([^<>]*)>/g, (all, inner) => {
    const tag = inner.trim().toLowerCase()
    if (tag.startsWith('/')) fail(`${where}: the closing tag ${all} (& codes can't close a style: start the next part with its own color)`)
    if (tag.startsWith('#') || tag.startsWith('color:#')) fail(`${where}: the hex color ${all} (only the 16 named colors)`)
    if (tag === 'dark_gray' || tag === 'dark_grey') fail(`${where}: ${all} (dark gray is hard to read in lore: use <gray>)`)
    if (COLORS[tag]) return `&${COLORS[tag]}`
    if (DECORATIONS[tag]) return `&${DECORATIONS[tag]}`
    fail(`${where}: the tag ${all} (only the named colors, bold, italic, underlined, strikethrough, obfuscated, reset)`)
  })
  if (out.includes('<')) fail(`${where}: a < that isn't a tag`)
  return out === '' ? '&r' : out
}
const skriptString = s => `"${s.replace(/"/g, '""').replace(/%/g, '%%')}"`

// ---------- weaponlore.sk ----------
const HEADER = [
  '# weaponlore.sk: GENERATED by tools\\make-weapon-lore.js from the WeaponMechanics files: never edit it by hand.',
  '# After changing a sold weapon\'s or consumable\'s lore (Info.Weapon_Item.Lore in plugins\\WeaponMechanics\\weapons\\)',
  '# or core.sk\'s shop::weapons / shop::consumables / craft::weapons, run tools\\node\\node.exe tools\\make-weapon-lore.js and',
  '# /sk reload weaponlore (--check tells whether this file is up to date; bots\\run.js shop runs it).',
  '#',
  '# wpnLore(title) = that weapon\'s own lore (what it is and its stats) in & colors, for the shop\'s hover details',
  '# (shop.sk\'s Weapons tab and the Items tab\'s consumables; owner, 2026-10-13: "display weapon and consumable details',
  '# while hovering over the item in the shop page"). Empty lines are &r. A title it doesn\'t know returns nothing.',
  '# A pure function: no variables, so it can be called from anywhere.',
  ''
]

const build = () => {
  if (!fs.existsSync(CORE)) fail(`missing ${rel(CORE)}`)
  const core = fs.readFileSync(CORE, 'utf8')
  const titles = [...new Set([...shopList(core, 'shop::weapons'), ...shopList(core, 'shop::consumables'), ...shopList(core, 'craft::weapons')])]
  const index = readWeapons()
  const returns = new Map()
  for (const t of titles) {
    const w = index.get(t)
    if (!w) fail(`${t} (core.sk's lists) has no WeaponMechanics file under ${rel(WEAPONS)}`)
    if (!w.lore || !w.lore.length) fail(`${t} (${rel(w.file)}) has no Info.Weapon_Item.Lore`)
    const lines = w.lore.map((l, i) => skriptString(toLegacy(l, `${rel(w.file)} (${t}) lore line ${i + 1}`)))
    returns.set(t, lines.length === 1 ? lines[0] : `${lines.slice(0, -1).join(', ')} and ${lines[lines.length - 1]}`)
  }
  const body = ['function wpnLore(w: text) :: texts:']
  for (const [t, r] of returns) body.push(`\tif {_w} is ${skriptString(t)}:`, `\t\treturn ${r}`)
  return { text: [...HEADER, ...body, ''].join('\n'), titles }
}

// The return line per title of a weaponlore.sk text (for --check's report).
const returnsOf = text => {
  const map = new Map()
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\tif \{_w\} is "((?:[^"]|"")*)":$/)
    if (m) map.set(m[1].replace(/""/g, '"'), lines[i + 1] ?? '')
  }
  return map
}

const { text, titles } = build()
const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : null
if (CHECK) {
  if (old === null) fail(`${rel(OUT)} is missing: run tools\\node\\node.exe tools\\make-weapon-lore.js`)
  if (old === text) {
    console.log(`${rel(OUT)} is up to date (${titles.length} titles)`)
    process.exit(0)
  }
  const want = returnsOf(text)
  const have = returnsOf(old)
  const differ = [...new Set([...want.keys(), ...have.keys()])].filter(t => want.get(t) !== have.get(t))
  console.error(`make-weapon-lore: ${rel(OUT)} is out of date` +
    (differ.length ? ` (${differ.join(', ')})` : ' (its header or layout)') +
    ': run tools\\node\\node.exe tools\\make-weapon-lore.js')
  process.exit(1)
}
if (old === text) {
  console.log(`${rel(OUT)} is up to date (${titles.length} titles)`)
} else {
  fs.writeFileSync(OUT, text, 'utf8')
  console.log(`wrote ${rel(OUT)} (${titles.length} titles)`)
}
