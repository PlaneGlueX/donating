// picks.sk: a heist's pick groups, on a glass platform at x 960..980, y 200 ("Pick Vault", no players needed: RCON and the trap probe).
// Variants a and b of the group "vault" each hold a pile, a smash gate and a laser; one pile and one laser belong to no group.
const { sleep } = require('../lib')
const rconLib = require('../rcon')

const H = 'zpick'
const Y = 200

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim().replace(/§./g, '')
  const spots = async () => {
    const out = {}
    for (const part of (await cmd(`zzloot ${H}`)).split(' | ').slice(1)) {
      const [n, kind, st] = part.split(':')
      out[n] = { kind, st, n: Number((part.match(/n=(\d+)/) || [])[1] || 0), hb: Number((part.match(/hb=(\d+)/) || [])[1] || 0) }
    }
    return out
  }
  const head = async () => (await cmd(`zzloot ${H}`)).split(' | ')[0]
  const probe = async z => cmd(`zztrapprobe ${H} 971.5 ${Y} ${z} stand`)
  const hit = async (z, n) => new RegExp(`\\b${n}\\b`).test(await probe(z))
  const force = v => cmd(`dheist pick ${H} force vault ${v}`)
  try {
    await cmd(`dheist delete ${H} confirm`)
    await cmd(`rg remove -w world heist_${H}`)
    await cmd('forceload add 950 950 985 985')
    await cmd(`fill 955 ${Y - 1} 955 985 ${Y - 1} 985 glass`)
    await cmd(`fill 955 ${Y} 955 985 ${Y + 4} 985 air`)
    await cmd(`setblock 966 ${Y} 962 glass`)
    await cmd(`setblock 966 ${Y} 966 glass`)
    await cmd(`zzregion heist_${H} 960 ${Y - 1} 960 980 ${Y + 6} 980`)
    for (const c of [`dheist create ${H} 2`, `dheist set ${H} level 0`, `dheist set ${H} name Pick Vault`, `dheist set ${H} escape 600`, `dheist set ${H} cooldown 5`, `dheist exit ${H} 957.5 ${Y} 970.5`]) await cmd(c)
    // Loot 1-3: pile a, pile b, a pile in no group. 4-5: smash gates a, b.
    await cmd(`dloot add ${H} pile 962 ${Y} 962 963 ${Y} 963 value=200-200 piece=100 pick=vault:a`)
    await cmd(`dloot add ${H} pile 962 ${Y} 966 963 ${Y} 967 value=600-600 piece=100 pick=vault:b`)
    await cmd(`dloot add ${H} pile 962 ${Y} 970 963 ${Y} 971 value=100-100 piece=100`)
    await cmd(`dloot add ${H} smash 966 ${Y} 962 966 ${Y} 962 pick=vault:a`)
    await cmd(`dloot add ${H} smash 966 ${Y} 966 966 ${Y} 966 pick=vault:b`)
    // Traps 1-3: lasers a, b, and one in no group, each across its own lane.
    await cmd(`dtrap add ${H} laser 971.5 ${Y}.9 961 971.5 ${Y}.9 964 pick=vault:a`)
    await cmd(`dtrap add ${H} laser 971.5 ${Y}.9 966 971.5 ${Y}.9 969 pick=vault:b`)
    await cmd(`dtrap add ${H} laser 971.5 ${Y}.9 971 971.5 ${Y}.9 974`)
    check('a bad pick name is refused', /bad value/.test(await cmd(`dloot set ${H}-3 pick a:b:c`)), await cmd(`dloot info ${H}-3`))
    check('a pick that would break a command line is refused', /bad value/.test(await cmd(`dtrap set ${H}-3 pick a-b`)))
    await cmd(`dheist snapshot ${H}`)
    await cmd(`dheist enable ${H}`)
    await sleep(1500)
    await cmd(`dheist open ${H}`)
    await sleep(1500)

    check('info shows what this run drew', /picks vault=\[vault:[ab]\]/.test((await cmd(`dheist info ${H}`))), await cmd(`dheist info ${H}`))

    await force('a')
    let s = await spots()
    check('variant a: its pile has pieces', s[1].n === 2 && s[1].st === 'open', JSON.stringify(s))
    check('...the other pile rolls nothing', s[2].n === 0 && s[2].st === 'empty', JSON.stringify(s))
    check('...a pile in no group always rolls', s[3].n === 1, JSON.stringify(s))
    check('...its gate can be smashed', s[4].st === 'closed' && s[4].hb > 0, JSON.stringify(s))
    check('...the other gate is a plain wall: no hitbox, still solid', s[5].st === 'off' && s[5].hb === 0 && /passed/i.test(await cmd(`execute if block 966 ${Y} 966 minecraft:glass`)), JSON.stringify(s))
    check('...the roll and the spots count only what is live', /rolled=300 /.test(await head()) && /spots=2\/2/.test(await head()), await head())
    check('...its laser hits', await hit(962.5, 1), await probe(962.5))
    check('...the other laser does not', !(await hit(967.5, 2)), await probe(967.5))
    check('...a laser in no group hits', await hit(972.5, 3), await probe(972.5))
    check('...the other laser has no display', /TRAPSTATE/.test(await cmd(`zztrapstate ${H}-2`)) && !/vis=true/.test(await cmd(`zztrapstate ${H}-2`)), await cmd(`zztrapstate ${H}-2`))

    await force('b')
    s = await spots()
    check('variant b swaps all of it', s[1].n === 0 && s[2].n === 6 && s[4].st === 'off' && s[5].st === 'closed' && s[5].hb > 0 && !(await hit(962.5, 1)) && (await hit(967.5, 2)), JSON.stringify(s))

    const seen = new Set()
    for (let i = 0; i < 12; i++) { await cmd(`dheist pick ${H} draw`); seen.add(((await cmd(`dheist pick ${H}`)).match(/vault=\[([^\]]*)\]/) || [])[1]) }
    check('draws reach both variants, one at a time', seen.has('vault:a') && seen.has('vault:b') && seen.size === 2, [...seen].join(' '))

    await cmd(`dheist pick ${H} k vault 2`)
    await cmd(`dheist pick ${H} draw`)
    s = await spots()
    check('k 2: both variants live', s[1].n === 2 && s[2].n === 6, JSON.stringify(s))
    await cmd(`dheist pick ${H} k vault 1`)
    await cmd(`dheist pick ${H} chance vault 0`)
    await cmd(`dheist pick ${H} draw`)
    s = await spots()
    check('chance 0: neither variant, the rest stands', s[1].n === 0 && s[2].n === 0 && s[3].n === 1 && !(await hit(962.5, 1)) && (await hit(972.5, 3)), JSON.stringify(s))
    await cmd(`dheist pick ${H} chance vault 100`)

    const lootDump = await cmd(`dloot dump ${H}`)
    const trapDump = await cmd(`dtrap dump ${H}`)
    check('the dumps keep the picks', (lootDump.match(/pick=vault:/g) || []).length === 4 && (trapDump.match(/pick=vault:/g) || []).length === 2, `${lootDump} ${trapDump}`)
    check('the heist dump keeps k and chance', /dheist pick zpick k vault 1/.test(await cmd(`dheist dump ${H}`)) && /dheist pick zpick chance vault 100/.test(await cmd(`dheist dump ${H}`)), await cmd(`dheist dump ${H}`))
    check('/dloot check tops out at the richest variant', /rolls \$100-\$700/.test(await cmd(`dloot check ${H}`)), await cmd(`dloot check ${H}`))

    // A new opening draws again and keeps every part in step.
    const run0 = (await head()).match(/run=(\d+)/)[1]
    await cmd(`dheist start ${H}`)
    await sleep(500)
    await cmd(`dheist end ${H}`)
    await sleep(1500)
    for (let i = 0; i < 20 && !/state=open/.test(await head()); i++) { await cmd(`dheist open ${H}`); await sleep(1000) }
    await sleep(1000)
    s = await spots()
    const run1 = ((await head()).match(/run=(\d+)/) || [])[1]
    const liveA = s[1].n > 0
    check('a new run draws one variant for its loot, gates and traps alike', run1 !== run0 && liveA === (s[2].n === 0) && (s[4].st === 'closed') === liveA && (s[5].st === 'closed') === !liveA && (await hit(962.5, 1)) === liveA && (await hit(967.5, 2)) === !liveA, `${run0}->${run1} ${JSON.stringify(s)}`)

    check('a heist without picks shows none', !/picks/.test(await cmd('dheist info gas')), await cmd('dheist info gas'))
  } finally {
    await rcon.cmd(`dheist delete ${H} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${H}`).catch(() => {})
    await rcon.cmd(`fill 955 ${Y - 1} 955 985 ${Y + 4} 985 air`).catch(() => {})
    await rcon.cmd('forceload remove 950 950 985 985').catch(() => {})
    rcon.close()
  }
}
