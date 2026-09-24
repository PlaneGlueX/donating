// Runs one test scenario and prints a JSON report (checks passed/failed).
// Usage: node bots/run.js <scenario>   e.g. node bots/run.js join
const path = require('path')

async function main () {
  const name = process.argv[2]
  if (!name) {
    console.error('usage: node bots/run.js <scenario>  (files in bots/scenarios)')
    process.exit(2)
  }
  const scenario = require(path.join(__dirname, 'scenarios', `${name}.js`))
  const checks = []
  const check = (label, pass, detail = '') => {
    checks.push({ label, pass: Boolean(pass), detail })
  }

  let error = null
  try {
    await scenario({ check, args: process.argv.slice(3) })
  } catch (err) {
    error = err.stack || String(err)
  }

  const failed = checks.filter(c => !c.pass).length
  console.log(JSON.stringify({ scenario: name, passed: checks.length - failed, failed, error, checks }, null, 2))
  process.exit(failed || error ? 1 : 0)
}

main()
