// Writes pg.js = the repo's tools\guns\pg.js (copied as pg-orig.js) + the hands (HANDS PROTOTYPE, 2026-10-12).
// node patch-kit.js   (reads pg-orig.js and hands-kit.js next to it; writes pg.js and pg.diff-summary.txt)
const fs = require('fs'); const path = require('path')
const D = __dirname
let s = fs.readFileSync(path.join(D, 'pg-orig.js'), 'utf8')
const sub = (a, b) => { if (!s.includes(a)) throw new Error('anchor missing: ' + a.slice(0, 80)); s = s.replace(a, b) }
const H = fs.readFileSync(path.join(D, 'hands-kit.js'), 'utf8')
const part = name => { const m = new RegExp(`// <${name}>\\n([\\s\\S]*?)// </${name}>`).exec(H); if (!m) throw new Error('no ' + name); return m[1] }

// 1. per gun: the hands' children (after made[name]) ...
sub("    made[name] = { tiles, W, H, pal, ink, models, ...(PG ? { keep: spec.keep || [] } : {}) }\n",
  "    made[name] = { tiles, W, H, pal, ink, models, ...(PG ? { keep: spec.keep || [] } : {}) }\n" + part('pergun'))
// 2. ... drawn by the composites
sub(`        return { type: 'minecraft:model', model: id(p, state), ...(isId(m) ? {} : { transformation: json(m) }) }
      })
    })`, `        return { type: 'minecraft:model', model: id(p, state), ...(isId(m) ? {} : { transformation: json(m) }) }
      }).concat(handModels(state, pose))
    })`)
// 3. the shared hands (before the ease curves)
sub('  // Ease curves for frames.\n', part('shared') + '\n  // Ease curves for frames.\n')
// 4. skins pass the hands through
sub("    const map = id => {\n", "    const map = id => {\n      if (id.startsWith('donating:item/hands/')) return id // the hands look the same on every skin (their own texture)\n")
// 5. byContext: the left hand's own tree when the gun has hands
sub(`      cases: [{ when: ['firstperson_righthand', 'firstperson_lefthand'], model: fp }],`, `      cases: handList.length && spec.hands.leftTree !== false ? [{ when: ['firstperson_righthand'], model: fp }, { when: ['firstperson_lefthand'], model: forLeft(fp) }] : [{ when: ['firstperson_righthand', 'firstperson_lefthand'], model: fp }],`)
// 6. export
sub('  return { pgGun, ease, rig, then, display, paintSkin, made, MAT, tone, hot }', '  return { pgGun, ease, rig, then, display, paintSkin, made, MAT, tone, hot, HANDS }')
fs.writeFileSync(path.join(D, 'pg.js'), s)
console.log('pg.js written', s.length, 'bytes')
