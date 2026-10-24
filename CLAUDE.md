# 네이버 모바일 순위 조사 (sidongblog / myhousedoctor / 카페)

## 보고 방식 (항상)
- 순위 조사 보고서는 채팅에 긴 표로 쓰지 않고 **아티팩트로 보고한다**. 새로 만들지 말고 아래 주소의 같은 아티팩트에 매번 새 결과를 덮어쓴다.
  - 보고서: https://claude.ai/artifact/V4kBzDQVZsfoC6y3ND9k12 (Dashboard 타입. 페이지 코드는 그대로 두고 데이터 문서만 갱신)
- 채팅에는 조사 개요(시작·종료·걸린 시간·브라우저·대상·완료·미확인·상태·성공 기준), 링크, `scripts/summary.js` 가 출력한 3줄 요약만 짧게 적는다. 키워드별 전체 표는 채팅에 출력하지 않는다.

## 실행 모델
- 순위 조사의 예약 실행 모델은 **Haiku 5.5(claude-haiku-5-5)로 고정**한다(10/24 비교 시험에서 Sonnet과 152개 중 147개 동일, 비용은 약 1/15). 사용자가 명시적으로 바꾸라고 할 때만 바꾼다.

## 조사 기준
- 모바일 네이버 통합검색 첫 페이지만. 광고·플레이스·이미지를 뺀 일반 콘텐츠 카드(카페·블로그·동영상·일반 웹사이트)를 화면 순서대로 센다. 5위 이내가 성공.
- 추적 대상: 블로그 silicondoctor, myhousedoctor, 「키워드 목록 1순위.md」의 내 카페 글. 키워드는 같은 파일에서 매번 읽는다.
- 못 읽으면 '미확인'(실패로 세지 않음). 과거 결과나 웹 검색으로 대신하지 않는다.

## 절차 (스크립트가 대부분 처리)
1. `NODE_PATH=$(npm root -g) node scripts/check_rank.js results/YYYY-MM-DD.json` (약 4분)
2. 보고용 CSV 만들기. 모델·사용량은 `get_session` 이 없는 예약 세션에서도 얻을 수 있게 **로컬 기록 합산 스크립트**를 쓴다(`get_session` 은 예약 세션에 없어 쓰지 않는다).
   - 모델 ID: 시스템 프롬프트의 "configured for the model `...`" 문구에서 읽는다(예: `claude-haiku-5-5`). 읽지 못하면 모델 줄이 '확인 불가'로 표시된다(추측 금지).
   - 조사를 **시작하기 전에**(저장소를 받은 직후): `node scripts/usage_local.js --model <모델ID> --prefix RANK_BASE_ > results/usage_start.env`
   - 보고서 파일을 만들기 직전: `node scripts/usage_local.js --model <모델ID> --prefix RANK_ > results/usage_end.env` 그다음 `set -a; . results/usage_start.env; . results/usage_end.env; set +a`
   - (먼저) ArtifactData 로 history 컬렉션의 직전 문서를 `out_dir=results/prev` 로 받아 PREV 로 쓴다(없으면 생략).
   - `node scripts/make_csv.js results/YYYY-MM-DD.json results/ranks.csv <PREV>` (PREV 를 주면 보고서 그래프에 이전 조사 선이 겹쳐 그려진다) 와 `RANK_MODEL="<모델ID>" node scripts/make_run_csv.js results/YYYY-MM-DD.json results/run.csv ["비고"]`
   - 조사 개요에는 항상 세 줄: **사용한 모델**, **대화 전체 사용 토큰·금액(추정)**, **이번 조사 사용 토큰·금액(추정)**(시작 전 대비 증가분). 금액은 USD와 원화 환산(기본 1,400원/달러 가정, `RANK_KRW_RATE` 로 변경)을 함께 적는다. 단가를 아는 모델(현재 claude-haiku-5-5, 실측 3건과 대조해 검증)만 금액을 계산하고, 모르는 모델은 토큰만 적고 '금액 확인 불가'로 표시한다.
3. 아티팩트에 두 CSV를 에셋으로 올리고, ArtifactData 로 `datasets/ranks`, `datasets/run` 의 `source.url`(과 `updated`)만 새 `/_blob/<id>` 로 바꾼다(이전 에셋은 삭제).
4. 전회 비교: ArtifactData `history` 컬렉션에서 오늘 이전 최신 문서를 받아 `node scripts/summary.js results/YYYY-MM-DD.json 그_파일.json`. 그다음 `node scripts/make_history.js results/YYYY-MM-DD.json YYYY-MM-DD hist.json` 로 오늘 기록을 `history/YYYY-MM-DD` 에 저장.
5. 저장소 push 는 하지 않는다(예약 세션에는 권한 없음). 비교 기록은 아티팩트 DB 가 대신한다.

## 토큰 절약
- 결과 JSON·CSV 전체를 읽거나 출력하지 않는다(`head`, 요약 스크립트 사용). 스크립트 출력은 짧게 유지한다.
