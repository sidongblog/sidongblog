// 조사 결과 JSON을 전회 비교용 간략 기록(JSON)으로 변환
// 사용: node scripts/make_history.js results/YYYY-MM-DD.json YYYY-MM-DD 출력.json
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = d.results.map(x => [x.region, x.keyword, x.status === 'ok' ? 'ok' : 'unconfirmed', x.hit ? x.hit.rank : null, x.hit ? x.hit.source : null]);
fs.writeFileSync(process.argv[4], JSON.stringify({ date: process.argv[3], endedAt: d.endedAt, columns: ['region', 'keyword', 'status', 'rank', 'source'], rows }));
console.log('saved', process.argv[4], rows.length);
