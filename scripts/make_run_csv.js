// 조사 개요(실행 조건) CSV 생성: item,value
// 사용: RANK_MODEL="모델 이름" node scripts/make_run_csv.js results/YYYY-MM-DD.json 출력.csv [비고]
// 대화 전체 사용량: RANK_IN, RANK_OUT, RANK_CACHE_READ, RANK_CACHE_WRITE, RANK_COST(USD) (get_session 의 external_metadata.usage 값, 또는 RANK_USAGE_TEXT)
// 이번 조사 1회분: 같은 5개 값의 조사 시작 전 기록 RANK_BASE_IN, RANK_BASE_OUT, RANK_BASE_CACHE_READ, RANK_BASE_CACHE_WRITE, RANK_BASE_COST (또는 RANK_SURVEY_TEXT) — 전체 값에서 뺀 증가분
// 세 줄 요약: RANK_HISTORY_DIR=이전 조사 기록(history *.json) 폴더. 없으면 요약 행을 만들지 않음
// RANK_MODEL 은 이 조사를 실행한 세션의 모델(get_session 의 session_context.model 등으로 확인한 값)
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const kst = s => new Date(new Date(s).getTime() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
const sec = Math.round((new Date(d.endedAt) - new Date(d.startedAt)) / 1000);
const total = d.results.length;
const un = d.results.filter(x => x.status !== 'ok').length;
const n = v => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v);
const f = v => Number(v).toLocaleString('en-US');
const RATE = Number(process.env.RANK_KRW_RATE) || 1400; // 대략적인 환산용 고정 환율(원/달러)
const money = c => `약 $${Number(c).toFixed(3)} (약 ${f(Math.round(Number(c) * RATE))}원, 환율 ${f(RATE)}원/달러 가정)`;
const text = (i, o, cr, cw, c) => `입력 ${f(i)} · 출력 ${f(o)} · 캐시 읽기 ${f(cr)} · 캐시 쓰기 ${f(cw)} 토큰 / ${c == null ? '금액 확인 불가(이 모델의 단가를 확인하지 못함)' : money(c)}`;
// 대화(세션) 전체 사용량: 보고서 갱신 직전까지의 누적 (추정치)
function totalUsage() {
  const e = process.env;
  if (e.RANK_USAGE_TEXT) return e.RANK_USAGE_TEXT;
  const [i, o, cr, cw, c] = [e.RANK_IN, e.RANK_OUT, e.RANK_CACHE_READ, e.RANK_CACHE_WRITE, e.RANK_COST].map(n);
  if (o == null) return '확인 불가';
  return text(i ?? 0, o, cr ?? 0, cw ?? 0, c) + ' (보고서 갱신 직전까지 이 대화 누적, 세션 로컬 기록 합산 추정)';
}
// 이번 조사 1회분 사용량 = 보고서 갱신 직전 누적 - 조사 시작 전 누적 (추정치)
function surveyUsage() {
  const e = process.env;
  if (e.RANK_SURVEY_TEXT) return e.RANK_SURVEY_TEXT;
  const t = [e.RANK_IN, e.RANK_OUT, e.RANK_CACHE_READ, e.RANK_CACHE_WRITE, e.RANK_COST].map(n);
  const b = [e.RANK_BASE_IN, e.RANK_BASE_OUT, e.RANK_BASE_CACHE_READ, e.RANK_BASE_CACHE_WRITE, e.RANK_BASE_COST].map(n);
  if (t.slice(0, 4).some(x => x == null) || b.slice(0, 4).some(x => x == null)) return '확인 불가 (조사 시작 전 사용량을 기록하지 못함)';
  const d = t.map((x, i) => (x == null || b[i] == null) ? null : Math.max(0, x - b[i]));
  return text(...d) + ' (조사 시작 전 대비 증가분, 추정)';
}
const rows = [
  ['조사 시작', kst(d.startedAt) + ' (KST)'],
  ['조사 종료', kst(d.endedAt) + ' (KST)'],
  ['걸린 시간', `${Math.floor(sec / 60)}분 ${sec % 60}초`],
  ['사용한 브라우저', d.browser],
  ['사용한 모델', process.env.RANK_MODEL || '확인 불가'],
  ['대화 전체 사용 토큰·금액(추정)', totalUsage()],
  ['이번 조사 사용 토큰·금액(추정)', surveyUsage()],
  ['접속 환경', '서버에서 모바일 네이버 검색(로그인 없음, 위치 정보 없음)'],
  ['조사 대상', `${d.regions.length}개 지역 / 전체 ${total}개 키워드`],
  ['조사 완료', `${total - un}개`],
  ['미확인', `${un}개`],
  ['조사 상태', un === 0 ? '전체 완료' : '일부 완료'],
  ['성공 기준', '일반 콘텐츠 카드 순위 5위 이내 (광고·플레이스·이미지 제외)'],
];
if (process.argv[4]) rows.push(['비고', process.argv[4]]);
// 세 줄 요약: RANK_HISTORY_DIR(예: results/prev/history, 이전 조사 기록 폴더)가 있으면 맨 앞에 '요약 1~3' 행으로 넣는다
if (process.env.RANK_HISTORY_DIR !== undefined) {
  const lines = require('./summary_lib').threeLines(d, process.env.RANK_HISTORY_DIR);
  rows.unshift(...lines.map((l, i) => ['요약 ' + (i + 1), l]));
}
fs.writeFileSync(process.argv[3], 'item,value\n' + rows.map(r => r.map(c => /[",\n]/.test(c) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(',')).join('\n') + '\n');
console.log('saved', process.argv[3]);
