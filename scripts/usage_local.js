// 이 세션의 로컬 대화 기록(~/.claude/projects/**/*.jsonl)에서 사용 토큰을 합산해 JSON 으로 출력
// get_session 도구가 없는 예약 세션에서 사용량을 얻기 위한 대체 수단 (추정치)
// 사용: node scripts/usage_local.js [--model 모델ID] [--prefix RANK_BASE_] [기록.jsonl]
//   기본: JSON 한 줄 출력. --prefix 를 주면 `PREFIXIN=.. PREFIXOUT=.. PREFIXCACHE_READ=.. PREFIXCACHE_WRITE=.. PREFIXCOST=..` 줄을 출력(.env 로 저장해 source 용)
// 금액(USD)은 단가를 아는 모델만 계산(아래 PRICES, 100만 토큰당 USD). 모르는 모델은 금액을 비워 둔다.
// claude-haiku-5-5 단가는 실제 세션 비용 3건과 대조해 검증함(출력 0.5, 캐시 읽기 0.01, 캐시 쓰기(1시간) 0.2, 입력 0.1)
const fs = require('fs'), path = require('path'), os = require('os');
function newest(dir) {
  let best = null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { const r = newest(p); if (r && (!best || r.m > best.m)) best = r; }
    else if (e.name.endsWith('.jsonl') && !p.includes('subagents')) { const m = fs.statSync(p).mtimeMs; if (!best || m > best.m) best = { p, m }; }
  }
  return best;
}
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const model = opt('--model'), prefix = opt('--prefix');
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const PRICES = { 'claude-haiku-5-5': { i: 0.1, o: 0.5, cr: 0.01, cw: 0.2 } };
const file = pos[0] || (newest(path.join(os.homedir(), '.claude', 'projects')) || {}).p;
if (!file) { console.log(JSON.stringify({ error: 'no transcript' })); process.exit(0); }
const byId = new Map();
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let o; try { o = JSON.parse(line); } catch { continue; }
  const m = o.message;
  if (!m || !m.usage || !m.id) continue;
  const u = m.usage, prev = byId.get(m.id);
  const cur = { i: u.input_tokens || 0, o: u.output_tokens || 0, cr: u.cache_read_input_tokens || 0, cw: u.cache_creation_input_tokens || 0 };
  if (!prev || cur.o >= prev.o) byId.set(m.id, cur); // 같은 메시지가 여러 번 기록되면 마지막(가장 큰) 값만
}
const t = { input: 0, output: 0, cache_read: 0, cache_write: 0, messages: byId.size, file };
for (const c of byId.values()) { t.input += c.i; t.output += c.o; t.cache_read += c.cr; t.cache_write += c.cw; }
const pr = PRICES[model];
const cost = pr ? (t.input * pr.i + t.output * pr.o + t.cache_read * pr.cr + t.cache_write * pr.cw) / 1e6 : null;
if (prefix) {
  console.log(`${prefix}IN=${t.input}\n${prefix}OUT=${t.output}\n${prefix}CACHE_READ=${t.cache_read}\n${prefix}CACHE_WRITE=${t.cache_write}\n${prefix}COST=${cost == null ? '' : cost.toFixed(6)}`);
} else console.log(JSON.stringify({ ...t, cost_usd: cost }));
