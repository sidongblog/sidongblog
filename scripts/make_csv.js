// 조사 결과 JSON을 보고서 페이지용 CSV로 변환
// 사용: node scripts/make_csv.js results/YYYY-MM-DD.json 출력.csv [직전_history.json]
// 직전 기록을 주면 prev_rank, prev_date 열이 추가되어 보고서 그래프에 '이전 조사' 선이 겹쳐 그려진다
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const prev = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4], 'utf8')) : null;
const pm = new Map(prev ? prev.rows.map(r => [r[1], r[2] === 'ok' && r[3] != null ? r[3] : '—']) : []);
const rows = [['region', 'keyword', 'mark', 'status', 'rank', 'source'].concat(prev ? ['prev_rank', 'prev_date'] : [])];
for (const x of d.results) {
  let r;
  if (x.status !== 'ok') r = [x.region, x.keyword, '❔', '미확인', '—', '—'];
  else if (!x.hit) r = [x.region, x.keyword, '❌', '1p에 없음', '—', '—'];
  else r = [x.region, x.keyword, x.hit.rank <= 5 ? '✅' : '❌', x.hit.rank <= 5 ? '성공' : '5위 밖', x.hit.rank, x.hit.source];
  if (prev) r.push(pm.has(x.keyword) ? pm.get(x.keyword) : '—', pm.has(x.keyword) ? prev.date : '');
  rows.push(r);
}
fs.writeFileSync(process.argv[3], rows.map(r => r.join(',')).join('\n') + '\n');
console.log('saved', process.argv[3], rows.length - 1, 'rows');
