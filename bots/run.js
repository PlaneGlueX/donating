// Runs one test scenario: prints the count and the failures, and saves the whole report (bots\results\<scenario>.last.json).
// Usage: node bots/run.js <scenario> [args] [--json]   e.g. node bots/run.js join     --json prints the whole report too
const fs = require('fs')
const path = require('path')

async function main () {
  const argv = process.argv.slice(2)
  const json = argv.includes('--json')
  const [name, ...args] = argv.filter(a => a !== '--json')
  if (!name) {
    console.error('usage: node bots/run.js <scenario> [args] [--json]  (files in bots/scenarios)')
    process.exit(2)
  }
  const scenario = require(path.join(__dirname, 'scenarios', `${name}.js`))
  const checks = []
  const check = (label, pass, detail = '') => {
    checks.push({ label, pass: Boolean(pass), detail })
  }

  let error = null
  try {
    await scenario({ check, args })
  } catch (err) {
    error = err.stack || String(err)
  }

  const failed = checks.filter(c => !c.pass).length
  const report = JSON.stringify({ scenario: name, passed: checks.length - failed, failed, error, checks }, null, 2)
  const file = path.join(__dirname, 'results', `${name}.last.json`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, report)
  if (json) console.log(report)
  else {
    console.log(`${name}: ${checks.length - failed}/${checks.length} passed (report: bots/results/${name}.last.json)`)
    for (const c of checks) if (!c.pass) console.log(`FAIL ${c.label}: ${String(c.detail).slice(0, 400)}`)
    if (error) console.log(`ERROR ${error}`)
  }
  process.exit(failed || error ? 1 : 0)
}

main()
