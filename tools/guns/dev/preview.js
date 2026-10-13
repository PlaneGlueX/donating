// Preview a gun module (a draft tools\guns\<id>.js kept outside the repo) with the prototype kit, without touching
// the repo: node preview.js <module.js> <gun id> <out prefix> [--kit pg.js] [--no-skins] [--views gui,side,fp,fpads,fpreload,tp]
// Writes <prefix>-<view>.png (+ <prefix>-tex.png, the gun's texture) and <prefix>.zip (the assets, for render-item --pack).
const path = require('path'); const fs = require('fs'); const { execFileSync } = require('child_process')
const { build, zipDir, REPO } = require('./harness.js')
const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v }
const kit = path.resolve(opt('--kit', path.join(__dirname, '..', 'pg.js')))
const views = opt('--views', 'gui,side,fp').split(',')
const noSkins = args.includes('--no-skins'); if (noSkins) args.splice(args.indexOf('--no-skins'), 1)
const [mod, id, prefix] = args
if (!mod || !id || !prefix) { console.log('usage: node preview.js <module.js> <gun id> <out prefix> [--kit pg.js] [--no-skins] [--views gui,side,fp,fpads,fpreload,tp]'); process.exit(1) }
const NUM = { gs50: 9, uzi: 1, r90: 14, ak47: 5, rev: 8, tommy: 15, m16: 7, sniper: 13, lmg: 11, minigun: 6 }
const out = path.resolve(prefix + '-assets')
build({ kit, out, guns: [id], skins: !noSkins, modules: { [id]: mod } })
zipDir(out, path.resolve(prefix + '.zip'))
const PORTABLE = path.join(REPO, 'tools', 'node', 'node.exe'); const N = fs.existsSync(PORTABLE) ? PORTABLE : process.execPath; const R = path.join(REPO, 'tools', 'render-item.js')
const V = { gui: [`donating:item/gun_${id}_full`, 'gui', 512, 512], side: [`donating:item/gun_${id}_full`, 'side', 640, 480], tp: [`donating:item/gun_${id}_full`, 'tp', 640, 640], fp: [`feather@${NUM[id]}`, 'fp', 960, 540], fpads: [`feather@${NUM[id] + 1000}`, 'fp', 960, 540], fpreload: [`feather@${NUM[id] + 3000}`, 'fp', 960, 540, '--cooldown', 0.5] }
for (const v of views) { const [what, view, W, H, ...more] = V[v]; console.log(execFileSync(N, [R, what, path.resolve(`${prefix}-${v}.png`), view, W, H, '--pack', path.resolve(prefix + '.zip'), ...more].map(String)).toString().trim().split('\n').pop()) }
fs.copyFileSync(path.join(out, 'assets', 'donating', 'textures', 'item', `gun_${id}_tex.png`), path.resolve(prefix + '-tex.png'))
