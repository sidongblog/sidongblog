// 사용: node scripts/kw_count.js 글.txt 키워드1 키워드2 ...
// 띄어쓰기를 무시하고 키워드가 제목·본문에 몇 번 나오는지 센다.
// posts/*.md 처럼 "- 제목: ..." 줄과 "---" 줄이 있으면 제목은 그 줄, 본문은 "---" 아래만 센다.
// 그런 형식이 없으면 첫 줄을 제목, 나머지를 본문으로 본다.
const fs = require('fs');
const [file, ...kws] = process.argv.slice(2);
if (!file || !kws.length) { console.log('사용: node scripts/kw_count.js 글.txt 키워드...'); process.exit(1); }
const raw = fs.readFileSync(file, 'utf8');
let title, body;
const sep = raw.indexOf('\n---\n');
const tm = raw.match(/^- 제목:\s*(.+)$/m);
if (sep >= 0 && tm) { title = tm[1]; body = raw.slice(sep + 5); }
else { const nl = raw.indexOf('\n'); title = raw.slice(0, nl); body = raw.slice(nl + 1); }
const flat = s => s.replace(/\s+/g, '');
const cnt = (s, k) => { const f = flat(s), kk = flat(k); let n = 0, i = 0; while ((i = f.indexOf(kk, i)) >= 0) { n++; i += kk.length; } return n; };
console.log('키워드 | 제목 | 본문 | 합계');
for (const k of kws) {
  const t = cnt(title, k), b = cnt(body, k);
  console.log(`${k} | ${t} | ${b} | ${t + b}${t + b >= 3 ? '' : '  (3번 미만)'}`);
}
