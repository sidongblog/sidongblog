// 보고서 맨 위에 넣는 '세 줄 요약' 생성 (규칙 기반, 매일 같은 형식)
// 사용: require('./summary_lib').threeLines(결과JSON객체, history 폴더 경로) → 문장 3개 배열
const fs = require('fs'), path = require('path');
const kstDate = iso => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
function loadHist(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const h = j.data && j.data.rows ? j.data : j;
      if (h.rows && h.date) out.push(h);
    } catch { /* 읽지 못한 파일은 건너뜀 */ }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
const BIG = 999;
const names = (a, n = 3) => a.length ? a.slice(0, n).join(', ') + (a.length > n ? ` 외 ${a.length - n}개` : '') : '';
function threeLines(d, dir) {
  const today = kstDate(d.endedAt);
  const cur = new Map(d.results.map(x => [x.keyword, { reg: x.region, ok: x.status === 'ok', rank: x.hit ? x.hit.rank : null }]));
  const inTop = r => r != null && r <= 5;
  const curTop = [...cur.values()].filter(v => v.ok && inTop(v.rank)).length;
  const hist = loadHist(dir).filter(h => h.date < today);
  if (!hist.length) return [`첫 기준 조사입니다. 5위 이내는 ${curTop}/${cur.size}개입니다.`, '비교할 이전 조사가 없어 변화 판단은 다음 조사부터 합니다.', '다음 조사부터 지역별 변화와 최근 변동 범위를 함께 보여 드립니다.'];
  const prev = hist[hist.length - 1];
  const pm = new Map(prev.rows.map(r => [r[1], { reg: r[0], ok: r[2] === 'ok', rank: r[3] }]));
  const common = [...cur.keys()].filter(k => pm.has(k) && cur.get(k).ok && pm.get(k).ok);
  const pos = v => v.rank == null ? BIG : v.rank;
  let better = 0, worse = 0, same = 0, ct = 0, pt = 0; const ent = [], ext = [];
  const reg = {};
  for (const k of common) {
    const c = cur.get(k), p = pm.get(k);
    const a = pos(p), b = pos(c);
    if (b < a) better++; else if (b > a) worse++; else same++;
    const ci = inTop(c.rank), pi = inTop(p.rank);
    if (ci) ct++; if (pi) pt++;
    if (ci && !pi) ent.push(k); if (!ci && pi) ext.push(k);
    reg[c.reg] = reg[c.reg] || { c: 0, p: 0 }; reg[c.reg].c += ci ? 1 : 0; reg[c.reg].p += pi ? 1 : 0;
  }
  const dl = ct - pt;
  const verdict = dl >= 5 ? '좋아졌습니다' : dl >= 1 ? '소폭 좋아졌습니다' : dl === 0 ? '큰 변화가 없습니다' : dl > -5 ? '소폭 나빠졌습니다' : '나빠졌습니다';
  const sign = dl > 0 ? `+${dl}` : String(dl);
  const l1 = `이전 조사(${prev.date}) 대비 ${verdict}. 5위 이내 ${pt}→${ct}개(${sign}), 순위가 오른 키워드 ${better}개·내려간 키워드 ${worse}개·그대로 ${same}개입니다.` +
    (ent.length ? ` 새로 5위 이내: ${names(ent)}.` : '') + (ext.length ? ` 5위 이내에서 빠짐: ${names(ext)}.` : '');
  // 2) 최근 변동 범위 (키워드 수가 같은 조사만 비교)
  const same_n = hist.filter(h => h.rows.length === cur.size).slice(-6);
  const counts = same_n.map(h => h.rows.filter(r => r[2] === 'ok' && inTop(r[3])).length);
  let l2;
  if (counts.length >= 2) {
    const lo = Math.min(...counts), hi = Math.max(...counts);
    const inside = curTop >= lo && curTop <= hi;
    l2 = `최근 ${counts.length + 1}회 5위 이내 개수: ${counts.join('→')}→${curTop}. ` + (inside ? `오늘 값은 최근 변동 범위(${lo}~${hi}개) 안이라 의미 있는 변화로 보기 어렵습니다.` : `오늘 값은 최근 범위(${lo}~${hi}개)를 ${curTop > hi ? '위로' : '아래로'} 벗어난 변화입니다. 며칠 더 지켜볼 필요가 있습니다.`);
  } else l2 = '같은 키워드 수로 비교할 이전 조사가 부족해 최근 변동 범위는 아직 판단하지 않습니다.';
  // 3) 지역별 + 주의
  const diffs = Object.entries(reg).map(([r, v]) => [r, v.p, v.c, v.c - v.p]).filter(x => x[3] !== 0).sort((a, b) => b[3] - a[3]);
  let l3 = diffs.length ? `지역별로는 ${diffs[0][3] > 0 ? `${diffs[0][0]} ${diffs[0][1]}→${diffs[0][2]}개로 가장 많이 늘었고` : '늘어난 지역은 없고'}${diffs[diffs.length - 1][3] < 0 ? `, ${diffs[diffs.length - 1][0]} ${diffs[diffs.length - 1][1]}→${diffs[diffs.length - 1][2]}개로 가장 많이 줄었습니다` : ', 줄어든 지역은 없습니다'}.` : '지역별 5위 이내 개수는 모두 그대로입니다.';
  if (cur.size !== prev.rows.length) l3 += ` 조사 키워드 수가 ${prev.rows.length}→${cur.size}개로 달라져 공통 ${common.length}개 기준으로 비교했습니다.`;
  const low = d.results.filter(x => x.status === 'ok' && x.cards < 6).length;
  const un = d.results.filter(x => x.status !== 'ok').length;
  if (low > 15) l3 += ' ⚠ 읽은 카드 수가 적은 키워드가 많아 페이지 로딩 이상일 수 있습니다.';
  if (un > 0) l3 += ` 미확인 ${un}개는 비교에서 제외했습니다.`;
  return [l1, l2, l3];
}
module.exports = { threeLines, kstDate };
