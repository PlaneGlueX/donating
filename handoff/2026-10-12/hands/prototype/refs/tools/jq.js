// node jq.js <file.json> : prints parent, display and element boxes of a model
const j = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'))
console.log('parent', j.parent); console.log('display', JSON.stringify(j.display))
for (const e of j.elements || []) console.log(JSON.stringify(e.from), JSON.stringify(e.to), e.rotation ? JSON.stringify(e.rotation) : '')
