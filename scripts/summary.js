// 조사 결과 요약(집계 + 전회 비교)을 짧게 출력 — 보고서 채팅용
// 사용: node scripts/summary.js results/YYYY-MM-DD.json [직전_history.json]
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const st = x => x.status !== 'ok' ? 'un' : !x.hit ? 'none' : x.hit.rank <= 5 ? 'ok' : 'out';
const c = { ok: 0, out: 0, none: 0, un: 0 };
const by = {};
for (const x of d.results) { c[st(x)]++; by[x.region] = by[x.region] || { ok: 0, n: 0, un: 0 }; by[x.region].n++; if (st(x) === 'ok') by[x.region].ok++; if (st(x) === 'un') by[x.region].un++; }
const total = d.results.length;
console.log(`전체 ${total} = 5위 이내 ${c.ok} + 5위 밖 ${c.out} + 1p에 없음 ${c.none} + 미확인 ${c.un} (합계 ${c.ok + c.out + c.none + c.un === total ? '일치' : '불일치'})`);
console.log('지역별 5위 이내: ' + Object.entries(by).map(([r, v]) => `${r} ${v.ok}/${v.n}${v.un ? '(미확인 ' + v.un + ')' : ''}`).join(', '));
const low = d.results.filter(x => x.status === 'ok' && x.cards < 6).length, retried = d.results.filter(x => (x.attempts || 1) > 1).length;
console.log(`읽기 점검: 카드 6개 미만 ${low}개, 재시도 후 성공 ${retried}개${low > 15 ? ' ⚠ 카드 수가 적은 키워드가 많음(로딩 이상 가능)' : ''}`);
if (process.argv[3]) {
  const prevRaw = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const prev = prevRaw.data && prevRaw.data.rows ? prevRaw.data : prevRaw;
  const pm = new Map(prev.rows.map(r => [r[1], { s: r[2], rank: r[3] }]));
  const ent = [], ext = [], mov = [];
  for (const x of d.results) {
    const p = pm.get(x.keyword);
    if (!p || p.s !== 'ok' || x.status !== 'ok') continue;
    const nr = x.hit ? x.hit.rank : null, pr = p.rank;
    const nin = nr != null && nr <= 5, pin = pr != null && pr <= 5;
    if (nin && !pin) ent.push(`${x.keyword}(${pr ?? '없음'}→${nr})`);
    else if (!nin && pin) ext.push(`${x.keyword}(${pr}→${nr ?? '없음'})`);
    else if (nr != null && pr != null && Math.abs(nr - pr) >= 3) mov.push(`${x.keyword}(${pr}→${nr})`);
  }
  console.log(`전회(${prev.date}) 대비 5위 이내 진입 ${ent.length}: ${ent.join(', ') || '-'}`);
  console.log(`전회 대비 5위 이내 이탈 ${ext.length}: ${ext.join(', ') || '-'}`);
  console.log(`순위 3칸 이상 변동 ${mov.length}: ${mov.slice(0, 12).join(', ') || '-'}${mov.length > 12 ? ' 외 ' + (mov.length - 12) + '건' : ''}`);
} else console.log('전회 기록 없음: 최초 기준 보고');
