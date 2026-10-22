// 지역별 5위 이내 성공 키워드 수 선그래프(PNG) 생성
// 사용: NODE_PATH=$(npm root -g) node scripts/make_chart.js results/YYYY-MM-DD.json 출력.png
const { chromium } = require('playwright');
const fs = require('fs');
const [inp, out] = [process.argv[2], process.argv[3] || 'results/chart.png'];
const d = JSON.parse(fs.readFileSync(inp, 'utf8'));
const pts = d.regions.map(r => {
  const rs = d.results.filter(x => x.region === r);
  const done = rs.filter(x => x.status === 'ok').length;
  const ok = rs.filter(x => x.status === 'ok' && x.hit && x.hit.rank <= 5).length;
  return { r, ok, done, total: rs.length };
});
const W = 1170, H = 960, L = 150, R = 110, T = 190, B = 200;
const max = Math.max(5, Math.ceil(Math.max(...pts.map(p => p.ok)) / 5) * 5 + 0);
const x = i => L + (W - L - R) * i / (pts.length - 1);
const y = v => T + (H - T - B) * (1 - v / max);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="sans-serif" fill="#111">
<rect width="${W}" height="${H}" fill="#fcfcfc"/>
<text x="48" y="90" font-size="46" font-weight="700">지역별 5위 이내 키워드 수</text>
<text x="90" y="${T - 40}" font-size="32">성공(개)</text>`;
for (let v = 0; v <= max; v += 5) svg += `<line x1="${L}" x2="${W - R + 40}" y1="${y(v)}" y2="${y(v)}" stroke="#e2e2e2" stroke-width="3"/><text x="${L - 25}" y="${y(v) + 11}" font-size="34" text-anchor="end">${v}</text>`;
svg += `<polyline fill="none" stroke="#4f9cf5" stroke-width="10" stroke-linejoin="round" points="${pts.map((p, i) => x(i) + ',' + y(p.ok)).join(' ')}"/>`;
pts.forEach((p, i) => {
  const partial = p.done < p.total;
  svg += `<circle cx="${x(i)}" cy="${y(p.ok)}" r="15" fill="#4f9cf5"/>
<text x="${x(i)}" y="${y(p.ok) - 34}" font-size="38" text-anchor="middle">${p.ok}</text>
<text x="${x(i)}" y="${H - B + 60}" font-size="36" text-anchor="middle">${p.r}</text>` + (partial ? `<text x="${x(i)}" y="${H - B + 100}" font-size="26" text-anchor="middle" fill="#c0392b">${p.done}/${p.total} 완료</text>` : '');
});
const allDone = pts.every(p => p.done === p.total);
svg += `<text x="${W / 2}" y="${H - 50}" font-size="32" text-anchor="middle">지역 · ${allDone ? '각 ' + pts[0].total + '개 조사 완료' : '일부 미확인 포함(빨간 글씨는 조사 완료 수)'}</text></svg>`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.setContent('<body style="margin:0">' + svg + '</body>');
  await p.screenshot({ path: out });
  await b.close();
  console.log('saved', out);
})();
