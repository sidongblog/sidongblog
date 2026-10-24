// 이 세션의 로컬 대화 기록(~/.claude/projects/**/*.jsonl)에서 사용 토큰을 합산해 JSON 으로 출력
// get_session 도구가 없는 예약 세션에서 사용량을 얻기 위한 대체 수단 (추정치)
// 사용: node scripts/usage_local.js [기록.jsonl]  → {"input":..,"output":..,"cache_read":..,"cache_write":..,"messages":..,"file":..}
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
const file = process.argv[2] || (newest(path.join(os.homedir(), '.claude', 'projects')) || {}).p;
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
console.log(JSON.stringify(t));
