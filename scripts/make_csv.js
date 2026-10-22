// 조사 결과 JSON을 보고서 페이지용 CSV로 변환
// 사용: node scripts/make_csv.js results/YYYY-MM-DD.json 출력.csv
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = [['region', 'keyword', 'mark', 'status', 'rank', 'source']];
for (const x of d.results) {
  if (x.status !== 'ok') rows.push([x.region, x.keyword, '❔', '미확인', '—', '—']);
  else if (!x.hit) rows.push([x.region, x.keyword, '❌', '1p에 없음', '—', '—']);
  else rows.push([x.region, x.keyword, x.hit.rank <= 5 ? '✅' : '❌', x.hit.rank <= 5 ? '성공' : '5위 밖', x.hit.rank, x.hit.source]);
}
fs.writeFileSync(process.argv[3], rows.map(r => r.join(',')).join('\n') + '\n');
console.log('saved', process.argv[3], rows.length - 1, 'rows');
