// Reads a spark .sparkprofile saved with 'spark profiler stop --save-to-file' (nothing uploaded) and prints the
// Server thread's hot paths (the tree above minPct %), or with "self" the self time per method and per Skript element.
// Usage: tools/node/node.exe tools/sparkread.js <file> [minPct] [self]
const fs = require('fs');
let buf = fs.readFileSync(process.argv[2]);
const minPct = +(process.argv[3] || 2);
function fields(b) {
  const out = []; let i = 0;
  const varint = () => { let r = 0n, s = 0n; for (;;) { const x = b[i++]; r |= BigInt(x & 127) << s; s += 7n; if (!(x & 128)) return r; } };
  while (i < b.length) {
    const key = Number(varint()), f = key >> 3, t = key & 7;
    if (t === 0) out.push([f, t, varint()]);
    else if (t === 1) { out.push([f, t, b.readDoubleLE(i)]); i += 8; }
    else if (t === 2) { const n = Number(varint()); out.push([f, t, b.subarray(i, i + n)]); i += n; }
    else if (t === 5) { out.push([f, t, b.readFloatLE(i)]); i += 4; }
    else throw new Error('wire type ' + t + ' at ' + i);
  }
  return out;
}
const packedInts = b => { const r = []; let i = 0; while (i < b.length) { let v = 0, s = 0; for (;;) { const x = b[i++]; v |= (x & 127) << s; s += 7; if (!(x & 128)) break; } r.push(v); } return r; };
const top = fields(buf);
// SamplerData: 2 = threads (ThreadNode)
for (const [f, , tb] of top.filter(x => x[0] === 2)) {
  const th = fields(tb);
  const name = th.find(x => x[0] === 1)[2].toString();
  if (!/Server thread/.test(name)) continue;
  // ThreadNode: 3 children (StackTraceNode, flattened), 4 times, 5 children_refs
  const nodes = th.filter(x => x[0] === 3).map(x => {
    const n = fields(x[2]); const g = k => n.find(y => y[0] === k);
    const times = n.filter(y => y[0] === 8).map(y => y[1] === 2 ? [...Array(y[2].length / 8)].map((_, j) => y[2].readDoubleLE(j * 8)) : [y[2]]).flat();
    const refs = n.filter(y => y[0] === 9).map(y => y[1] === 2 ? packedInts(y[2]) : [Number(y[2])]).flat();
    return { cls: g(3) ? g(3)[2].toString() : '?', m: g(4) ? g(4)[2].toString() : '?', t: times.reduce((a, b) => a + b, 0), refs };
  });
  const rootRefs = th.filter(x => x[0] === 5).map(y => y[1] === 2 ? packedInts(y[2]) : [Number(y[2])]).flat();
  const total = rootRefs.reduce((a, r) => a + nodes[r].t, 0);
  console.log(name, 'nodes', nodes.length, 'total ms', total.toFixed(0));
  // Walk: print nodes above minPct, collapsing single-child chains of JDK/MC plumbing.
  const walk = (r, d) => {
    const n = nodes[r]; const pct = 100 * n.t / total;
    if (pct < minPct || d > 90) return;
    const kids = n.refs.filter(k => 100 * nodes[k].t / total >= minPct);
    if (kids.length !== 1 || d % 1 === 0) console.log(' '.repeat(Math.min(d, 60)) + pct.toFixed(1) + '% ' + n.cls.replace(/^.*\.(\w+\.\w+)$/, '$1') + '.' + n.m);
    for (const k of kids) walk(k, kids.length > 1 ? d + 1 : d);
  };
  for (const r of rootRefs) walk(r, 0);
}
// Self time per method and per deepest Skript element.
if (process.argv[4] === 'self') {
  const th = fields(top.filter(x => x[0] === 2).map(x => x[2]).find(tb => /Server thread/.test(fields(tb).find(x => x[0] === 1)[2].toString())));
  const nodes = th.filter(x => x[0] === 3).map(x => { const n = fields(x[2]); const g = k => n.find(y => y[0] === k);
    const times = n.filter(y => y[0] === 8).map(y => y[1] === 2 ? [...Array(y[2].length / 8)].map((_, j) => y[2].readDoubleLE(j * 8)) : [y[2]]).flat();
    const refs = n.filter(y => y[0] === 9).map(y => y[1] === 2 ? packedInts(y[2]) : [Number(y[2])]).flat();
    return { name: (g(3) ? g(3)[2].toString() : '?') + '.' + (g(4) ? g(4)[2].toString() : '?'), t: times.reduce((a, b) => a + b, 0), refs }; });
  const roots = th.filter(x => x[0] === 5).map(y => y[1] === 2 ? packedInts(y[2]) : [Number(y[2])]).flat();
  const self = {}, sk = {};
  const walk = (r, lastSk) => { const n = nodes[r]; const kidT = n.refs.reduce((a, k) => a + nodes[k].t, 0);
    let s = lastSk; if (/^(ch\.njol|org\.skriptlang|com\.shanebeestudios)/.test(n.name) && !/TriggerItem|Trigger\.execute|Effect\.run|FunctionReference|ScriptFunction|EffFunctionCall|ExprFunctionCall|SimpleExpression|Variable\.|VariableString|Condition\.|Statement|SecLoop|SecConditional|Section/.test(n.name)) s = n.name;
    self[n.name] = (self[n.name] || 0) + n.t - kidT; if (s) sk[s] = (sk[s] || 0) + n.t - kidT;
    for (const k of n.refs) walk(k, s); };
  roots.forEach(r => walk(r, null));
  const pr = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).forEach(([k, v]) => console.log(v.toFixed(0).padStart(6), k));
  console.log('--- self'); pr(self, 25); console.log('--- by deepest skript element'); pr(sk, 25);
}
