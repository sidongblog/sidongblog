// 조사 개요(실행 조건) CSV 생성: item,value
// 사용: RANK_MODEL="모델 이름" node scripts/make_run_csv.js results/YYYY-MM-DD.json 출력.csv [비고]
// 사용량: RANK_IN, RANK_OUT, RANK_CACHE_READ, RANK_CACHE_WRITE, RANK_COST(USD) 또는 RANK_USAGE_TEXT (get_session 의 external_metadata.usage 값)
// RANK_MODEL 은 이 조사를 실행한 세션의 모델(get_session 의 session_context.model 등으로 확인한 값)
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const kst = s => new Date(new Date(s).getTime() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
const sec = Math.round((new Date(d.endedAt) - new Date(d.startedAt)) / 1000);
const total = d.results.length;
const un = d.results.filter(x => x.status !== 'ok').length;
const n = v => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v).toLocaleString('en-US');
function usage() {
  const e = process.env;
  if (e.RANK_USAGE_TEXT) return e.RANK_USAGE_TEXT;
  const [i, o, cr, cw] = [e.RANK_IN, e.RANK_OUT, e.RANK_CACHE_READ, e.RANK_CACHE_WRITE].map(n);
  if (!o || e.RANK_COST == null || e.RANK_COST === '') return '확인 불가';
  return `입력 ${i ?? '?'} · 출력 ${o} · 캐시 읽기 ${cr ?? '?'} · 캐시 쓰기 ${cw ?? '?'} 토큰 / 약 $${Number(e.RANK_COST).toFixed(3)} (보고서 갱신 직전까지의 이 세션 누적)`;
}
const rows = [
  ['조사 시작', kst(d.startedAt) + ' (KST)'],
  ['조사 종료', kst(d.endedAt) + ' (KST)'],
  ['걸린 시간', `${Math.floor(sec / 60)}분 ${sec % 60}초`],
  ['사용한 브라우저', d.browser],
  ['사용한 모델', process.env.RANK_MODEL || '확인 불가'],
  ['사용 토큰·금액', usage()],
  ['접속 환경', '서버에서 모바일 네이버 검색(로그인 없음, 위치 정보 없음)'],
  ['조사 대상', `${d.regions.length}개 지역 / 전체 ${total}개 키워드`],
  ['조사 완료', `${total - un}개`],
  ['미확인', `${un}개`],
  ['조사 상태', un === 0 ? '전체 완료' : '일부 완료'],
  ['성공 기준', '일반 콘텐츠 카드 순위 5위 이내 (광고·플레이스·이미지 제외)'],
];
if (process.argv[4]) rows.push(['비고', process.argv[4]]);
fs.writeFileSync(process.argv[3], 'item,value\n' + rows.map(r => r.map(c => /[",\n]/.test(c) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(',')).join('\n') + '\n');
console.log('saved', process.argv[3]);
