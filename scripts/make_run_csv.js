// 조사 개요(실행 조건) CSV 생성: item,value
// 사용: node scripts/make_run_csv.js results/YYYY-MM-DD.json 출력.csv [비고]
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const kst = s => new Date(new Date(s).getTime() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
const sec = Math.round((new Date(d.endedAt) - new Date(d.startedAt)) / 1000);
const total = d.results.length;
const un = d.results.filter(x => x.status !== 'ok').length;
const rows = [
  ['조사 시작', kst(d.startedAt) + ' (KST)'],
  ['조사 종료', kst(d.endedAt) + ' (KST)'],
  ['걸린 시간', `${Math.floor(sec / 60)}분 ${sec % 60}초`],
  ['사용한 브라우저', d.browser],
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
