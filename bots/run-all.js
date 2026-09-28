// Runs every scenario one after another (or the ones named) and writes a summary: bots\results\summary.json and a
// line per scenario on the console. Usage: tools\node\node.exe bots\run-all.js [name ...]   (load is a benchmark:
// never run here).
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, 'scenarios')
const names = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).filter(n => n !== 'load').sort()
const out = path.join(__dirname, 'results')
fs.mkdirSync(out, { recursive: true })
const summary = []
for (const name of names) {
  const t = Date.now()
  const r = spawnSync(process.execPath, [path.join(__dirname, 'run.js'), name], { encoding: 'utf8', timeout: 15 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 })
  const text = (r.stdout || '') + (r.stderr || '')
  fs.writeFileSync(path.join(out, `${name}.txt`), text)
  let rep = null
  try { rep = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) } catch (e) { }
  const row = rep
    ? { name, passed: rep.passed, failed: rep.failed, error: rep.error, secs: Math.round((Date.now() - t) / 1000), failures: rep.checks.filter(c => !c.pass).map(c => c.label) }
    : { name, passed: 0, failed: 0, error: 'no report: ' + text.slice(-300), secs: Math.round((Date.now() - t) / 1000), failures: [] }
  summary.push(row)
  console.log(`${row.failed || row.error ? 'FAIL' : 'ok  '} ${name} ${row.passed}/${row.passed + row.failed}${row.error ? ' error: ' + String(row.error).slice(0, 120) : ''} (${row.secs}s)`)
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1))
}
const total = summary.reduce((a, r) => a + r.passed, 0)
const bad = summary.reduce((a, r) => a + r.failed, 0)
console.log(`TOTAL ${total} passed, ${bad} failed, ${summary.filter(r => r.error).length} errors`)
