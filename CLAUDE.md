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
2. `node scripts/make_csv.js results/YYYY-MM-DD.json results/ranks.csv` / `RANK_MODEL="<실행 모델>" node scripts/make_run_csv.js results/YYYY-MM-DD.json results/run.csv ["비고"]` — 조사 개요에 항상 **사용한 모델**을 적는다. get_session 으로 확인한 session_context.model 을 RANK_MODEL 에 넣고, 확인하지 못하면 넣지 않는다(개요에 '확인 불가'로 표시). 조사 개요에는 사용량을 **두 줄로 따로** 항상 적는다(추정치): ① **대화 전체 사용 토큰·금액**, ② **이번 조사 사용 토큰·금액**. 조사를 시작하기 **전에** get_session 의 `external_metadata.usage`(input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd)를 기록해 두고(`RANK_BASE_IN/OUT/CACHE_READ/CACHE_WRITE/COST`), 보고서 파일을 만들기 직전에 한 번 더 읽어 `RANK_IN/OUT/CACHE_READ/CACHE_WRITE/COST` 로 넘긴다. ②는 스크립트가 그 차이로 계산한다. 금액은 USD와 원화 환산(기본 1,400원/달러 가정, `RANK_KRW_RATE` 로 변경)을 함께 적는다. 확인하지 못한 값은 '확인 불가'.
3. 아티팩트에 두 CSV를 에셋으로 올리고, ArtifactData 로 `datasets/ranks`, `datasets/run` 의 `source.url`(과 `updated`)만 새 `/_blob/<id>` 로 바꾼다(이전 에셋은 삭제).
4. 전회 비교: ArtifactData `history` 컬렉션에서 오늘 이전 최신 문서를 받아 `node scripts/summary.js results/YYYY-MM-DD.json 그_파일.json`. 그다음 `node scripts/make_history.js results/YYYY-MM-DD.json YYYY-MM-DD hist.json` 로 오늘 기록을 `history/YYYY-MM-DD` 에 저장.
5. 저장소 push 는 하지 않는다(예약 세션에는 권한 없음). 비교 기록은 아티팩트 DB 가 대신한다.

## 토큰 절약
- 결과 JSON·CSV 전체를 읽거나 출력하지 않는다(`head`, 요약 스크립트 사용). 스크립트 출력은 짧게 유지한다.
