// Writes server\plugins\Skript\scripts\zz-tab.sk: tab completion for every local test helper (/zz*) in zz-*.sk, for
// the owner only (owner.sk ownerIs, by UUID; the owner, 2026-10-21: "allow user Explosde to use all zz commands (have
// tab fill for arguments too)"). Each argument's list comes from its type in the command line (players, online names),
// else from SPEC below (heist ids, plates, routes, words the helper takes). Run it after adding or changing a zz helper;
// --check fails when zz-tab.sk is out of date. zz-tab.sk is a local test file like the helpers: never upload it.
const fs = require('fs')
const path = require('path')
const dir = path.join(__dirname, '..', 'server', 'plugins', 'Skript', 'scripts')
const out = path.join(dir, 'zz-tab.sk')

// Per command: one entry per argument position. A kind (zzTab in the output: p players, heist, plate, ...), "x"/"y"/"z"/
// "cx"/"cz"/"yaw" your own spot, "L:a|b" these words, "" nothing (free text or a number).
const XYZ = ['cx', 'y', 'cz']
const SPEC = {
  zzperm: ['p', 'L:donating.staff|donating.inventory.bypass|donating.wanted|donating.store|donating.quests.admin|donating.season.admin'],
  zzcfg: ['L:money::start|prison::enabled|clock::world'],
  zzcfgbool: ['L:prison::enabled|fuel::enabled|tool::grappler::enabled', 'L:true|false'],
  zzdata: ['p', '', 'L:none'],
  zzdatatext: ['p'],
  zzpassive: ['p', 'L:on|off'],
  zzhide: ['p', 'L:donating_poi|donating_gps|donating_loot'],
  zzshow: ['p', 'L:donating_poi|donating_gps|donating_loot'],
  zzregion: ['', 'x', 'y', 'z', 'x', 'y', 'z'],
  zzshopact: ['p', 'L:tab:loadout|tab:weapons|tab:ammo|tab:items|save|restore'],
  zzammo: ['p', 'ammo', 'L:30|60|120'],
  zzbounty: ['p', 'L:1000|5000', 'L:robbery|kill'],
  zzbountyip: ['L:on|off'],
  zzheist: ['heist'],
  zzheisttp: ['p', ...XYZ],
  zzheistleft: ['heist', 'L:60|300'],
  zzcfgtime: ['', 'L:10s|1m|5m'],
  zzpapi: ['p', 'L:%%donating_level%%|%%donating_mission%%|%%donating_clock%%|%%donating_bag%%'],
  zzheistforget: ['heist'],
  zzhp: ['p', 'L:20|10|1'],
  zztrap: ['heist'],
  zztrapstate: ['trap'],
  zztrapprobe: ['heist', ...XYZ, 'L:stand|sneak|swim'],
  zzloot: ['heist'],
  zzlootcode: ['loot', 'p'],
  zzbagadd: ['p', 'run', 'L:1000|0', 'L:own'],
  zzgear: ['p', 'gear'],
  zztool: ['p', 'tool', 'L:1|3|0', 'L:0|1|2|3|4'],
  zzicon: ['L:wpn|gear|ammo|bag', 'wpn'],
  zzcratereset: ['p'],
  zzcratelines: ['crate'],
  zzcrateroll: ['crate', 'L:100|1000'],
  zzcosgive: ['p', 'cos'],
  zzgunskinicon: ['wpn', 'L:-'],
  zzheistvar: ['heist', 'L:alarm|wave|until', 'L:none'],
  zzheistwave: ['heist', 'L:1|2|0'],
  zzcops: ['heist'],
  zzcarnew: ['p'],
  zzcarspawn: ['plate', ...XYZ],
  zzcarinfo: ['plate'],
  zzcardelete: ['plate'],
  zzseatonjoin: ['p', 'plate'],
  zzcarmount: ['p', 'plate'],
  zzcartp: ['plate', ...XYZ],
  zzcarcall: ['p', 'plate'],
  zzcarclimb: ['plate'],
  zzcarflags: ['model'],
  zzcrategrant: ['p', 'crate'],
  zzinrange: ['p', 'heist'],
  zzhunt: ['p', 'heist', 'L:release'],
  zzctdir: ['p'],
  zzctoffer: ['p', 'tier', 'model', '', 'L:1|2|3'],
  zzcttake: ['p', 'tier'],
  zzcttime: ['p', 'L:60|10'],
  zzpick: ['p', 'tier', 'L:1|3|0|-1'],
  zzprog: ['p', 'L:rob|sell|crack|drill|getaway|contract|crate', 'L:1|1000'],
  zzrun: ['p', 'run'],
  zzweek: ['L:off'],
  zzheat: ['heist'],
  zzrunset: ['p', 'run', 'L:loud|left|touched|car', 'L:true|false'],
  zzctdeliver: ['p', 'tier', 'model', 'L:60', 'L:0'],
  zzpv: ['p', '', 'cx', 'y', 'cz'],
  zzctofferget: ['p', 'tier'],
  zzctpark: [''],
  zzhitwin: ['L:easy|medium|hard', 'L:clear'],
  zzheistreopen: ['heist'],
  zztext: ['p', 'contact'],
  zzmsg: ['p', 'L:say|text|keep|quest', 'contact'],
  zzvoice: ['p', 'L:clip', 'L:Lefty|Rusty|Tank|Whisper'],
  zzinbox: ['p', 'L:flush'],
  zzinboxraw: ['p', 'L:60|3600', 'contact'],
  zzdmglog: ['p', 'L:on|off'],
  zzjail: ['p', 'L:state|step|give|strip|info|catch|escape-check|cellopen|ko|shield|hostile|calm|unstuck|own|tag|mark|eligible|stepnum', 'jailarg'],
  zzjailtp: ['p', ...XYZ, 'yaw'],
  zzjaildoor: ['door'],
  zzjailbreach: ['L:gate|punch|front|dig', 'L:open|close|due|cool'],
  zzjailcop: ['route'],
  zzjailsees: ['route', 'p'],
  zzjailcopto: ['route', ...XYZ],
  zzjailroster: ['L:none|yardn|walk'],
  zzjailbusy: ['L:none|fieldr|annex', 'L:3|0'],
  zzctfake: ['p', 'tier', 'plate'],
  zzbikelook: ['L:set|clear'],
  zzclerkhit: ['heist', 'p'],
  zzalarm: ['heist', 'L:end'],
  zzclock: ['world'],
  zzfill: ['p'],
  zzboosterleft: ['L:60|0'],
  zznpctool: [''],
  zzcleancalc: [''],
  zzseasonmins: ['p', 'L:300|0'],
  zztrapbench: ['p', 'L:1000'],
  zzcarpool: ['L:supercar|hypercar'],
}

// Words the third argument of /zzjail takes (the line can't be read, so every subcommand's words at once).
const jailpoints = fs.readFileSync(path.join(dir, 'jailpoints.sk'), 'utf8')
const names = re => [...new Set([...jailpoints.matchAll(re)].map(m => m[1]))].sort()
const LISTS = {
  route: names(/\{-jailroute::(\w+)::\*\}/g),
  door: names(/\{-jaildoor::(\w+)::\*\}/g),
  jailarg: ['course', 'in', 'out', 'off', 'none', 'keycard', 'c4', 'putty', 'wires', 'timer', 'donut', 'scrap', 'tape', 'handle', 'clear', '30', 'c4lot', 'card', 'parkour', 'dig'],
}

const cmds = []
for (const f of fs.readdirSync(dir).filter(f => /^zz-.*\.sk$/.test(f) && f !== 'zz-tab.sk').sort()) {
  for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/^command \/(zz\w+)(.*):\s*$/gm)) {
    cmds.push({ name: m[1], args: [...m[2].matchAll(/<([^>]+)>/g)].map(a => a[1]) })
  }
}
const unknown = Object.keys(SPEC).filter(n => !cmds.some(c => c.name === n))
if (unknown.length) { console.error('SPEC names no such helper: ' + unknown.join(', ')); process.exit(1) }

const q = s => '"' + s.replace(/"/g, '""') + '"'
const lines = [
  '# zz-tab.sk: GENERATED by tools\\make-zz-tab.js from the zz-*.sk helpers: do not edit, run the script again.',
  '# The owner (owner.sk ownerIs, by UUID) runs every local test helper in game and gets their arguments completed; to',
  '# everyone else they are "Unknown command", missing from the command list and never completed. LOCAL ONLY: never upload.',
  '',
  'on command:',
  '\tplayer is set',
  '\tset {_c} to command',
  '\tif {_c} contains ":":',
  '\t\tset {_c} to last element of ({_c} split at ":")',
  '\t{_c} starts with "zz"',
  '\townerIs(player) is false',
  '\tcancel event',
  '\tsend "Unknown command. Type ""/help"" for help." to player',
  '',
  'on send command list:',
  '\townerIs(player) is false',
  `\tremove ${cmds.flatMap(c => [q(c.name), q('skript:' + c.name)]).join(', ').replace(/, ([^,]*)$/, ' and $1')} from command list`,
  '',
  '# One list per kind of argument.',
  'function zzTab(p: player, kind: text) :: texts:',
  '\tif {_kind} is "p":',
  '\t\treturn tabPlayerNames({_p})',
  '\tif {_kind} is "x", "y", "z", "cx", "cz" or "yaw":',
  '\t\treturn tabPos({_p}, {_kind})',
  '\tif {_kind} is "heist":',
  '\t\treturn tabHeists()',
  '\tif {_kind} is "trap" or "loot":',
  '\t\treturn tabSpots({_kind})',
  '\tif {_kind} is "world":',
  '\t\treturn tabWorlds()',
  '\tif {_kind} is "plate":',
  '\t\tloop {car::owner::*}:',
  '\t\t\tset {_u} to loop-index in upper case',
  '\t\t\tadd {_u} to {_out::*}',
  '\t\treturn {_out::*}',
  '\tif {_kind} is "run":',
  '\t\tloop {heists::*}:',
  '\t\t\tadd "%loop-index%#%{heist::%loop-index%::run}%" to {_out::*}',
  '\t\treturn {_out::*}',
  '\tif {_kind} is "crate":',
  '\t\treturn {-cfg::crates::*}',
  '\tif {_kind} is "cos":',
  '\t\treturn {-cfg::cosmetics::*}',
  '\tif {_kind} is "wpn":',
  '\t\treturn {-cfg::shop::weapons::*} and {-cfg::shop::consumables::*}',
  '\tif {_kind} is "ammo":',
  '\t\treturn {-cfg::shop::ammo::*}',
  '\tif {_kind} is "gear":',
  '\t\treturn {-cfg::shop::gear::*}',
  '\tif {_kind} is "tool":',
  '\t\treturn {-cfg::shop::tools::*}',
  '\tif {_kind} is "tier":',
  '\t\treturn "starter" and {-cfg::contract::tiers::*}',
  '\tif {_kind} is "model":',
  '\t\treturn {-cfg::cars::*}',
  '\tif {_kind} is "contact":',
  '\t\treturn "Mara", "Boss", "Vic", "Broker", "Lefty", "Rusty", "Tank" and "Whisper"',
  ...Object.entries(LISTS).flatMap(([k, v]) => [`\tif {_kind} is ${q(k)}:`, `\t\treturn ${v.map(q).join(', ').replace(/, ([^,]*)$/, ' and $1')}`]),
  '\tif {_kind} starts with "L:":',
  '\t\treturn (subtext of {_kind} from characters 3 to length of {_kind}) split at "|"',
  '',
]

let n = 0
for (const c of cmds) {
  if (!c.args.length) continue
  const spec = SPEC[c.name] || []
  const kinds = Array.from({ length: Math.max(c.args.length, spec.length) }, (_, i) => spec[i] !== undefined ? spec[i] : (/player/.test(c.args[i] || '') ? 'p' : ''))
  lines.push(`on tab complete of "/${c.name}" and "/skript:${c.name}":`, '\tif ownerIs(player) is false:', '\t\tcancel event', '\t\tstop')
  kinds.forEach((k, i) => {
    if (!k) return
    lines.push(`\tset {_l::*} to zzTab(player, ${q(k)})`, '\tif {_l::*} is set:', `\t\tset tab completions for position ${i + 1} to {_l::*}`, '\tdelete {_l::*}')
  })
  lines.push('')
  n++
}
const text = lines.join('\n')
if (process.argv.includes('--check')) {
  const old = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  if (old !== text) { console.error('zz-tab.sk is out of date: run tools\\node\\node.exe tools\\make-zz-tab.js'); process.exit(1) }
  console.log('zz-tab.sk is current')
} else {
  fs.writeFileSync(out, text)
  console.log(`zz-tab.sk: ${cmds.length} helpers, ${n} with arguments`)
}
