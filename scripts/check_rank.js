// 모바일 네이버 통합검색 1페이지의 일반 콘텐츠 카드(카페/블로그/동영상) 순위 조사
// 사용: NODE_PATH=$(npm root -g) node scripts/check_rank.js [출력.json] [지역]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || 'results/latest.json';
const ONLY = process.argv[3];
const CONC = 4;
const BLOGS = ['silicondoctor', 'myhousedoctor'];

function parseList() {
  // 원본 md 그대로 사용: 마크다운 이스케이프(\\.)를 제거하고 읽는다
  const t = fs.readFileSync('키워드 목록 1순위.md', 'utf8').replace(/\\(.)/g, '$1').split('\n');
  const part2 = t.findIndex(l => /^#\s*2항/.test(l));
  const regions = [], kws = {}, cafe = {};
  let cur = null;
  for (const l of t.slice(0, part2)) {
    let m = l.match(/^#{2,}\s*\d+\.\s*(\S+)/);
    if (m) { cur = m[1]; regions.push(cur); kws[cur] = []; continue; }
    m = l.match(/^\d+\. (\S+)$/);
    if (m && cur) kws[cur].push(m[1]);
  }
  cur = null;
  for (const l of t.slice(part2)) {
    const h = l.match(/^#{2,}\s*(\S+)/);
    if (h) { cur = h[1]; cafe[cur] = []; continue; }
    const m = l.match(/cafe\.naver\.com\/([A-Za-z0-9_]+)\/(\d+)/);
    if (m && cur) cafe[cur].push(m[1] + '/' + m[2]);
  }
  return { regions, kws, cafe };
}

async function readCards(page) {
  return page.evaluate(() => {
    const out = [];
    for (const a of document.querySelectorAll('a[href]')) {
      const r = a.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || !(a.innerText || '').trim()) continue;
      const cs = getComputedStyle(a);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      out.push({ h: a.href, y: Math.round(r.top + scrollY), t: (a.innerText || '').trim().slice(0, 40) });
    }
    return out;
  });
}

function rankCards(links) {
  // 광고(ader.naver.com 등)·플레이스·지도·네이버 서비스 링크는 제외하고,
  // 카페/블로그/동영상 카드와 일반 웹사이트(개인 홈페이지) 카드를 화면 순서대로 센다
  const seen = new Set(), cards = [];
  let lastHost = null;
  for (const x of links.sort((a, b) => a.y - b.y)) {
    let m, key, type;
    if ((m = x.h.match(/^https?:\/\/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9_]+)\/(\d+)/))) { type = 'blog'; key = 'blog/' + m[1] + '/' + m[2]; }
    else if ((m = x.h.match(/^https?:\/\/(?:m\.)?cafe\.naver\.com\/([A-Za-z0-9_]+)\/(\d+)/))) { type = 'cafe'; key = 'cafe/' + m[1] + '/' + m[2]; }
    else if ((m = x.h.match(/^https?:\/\/(?:m\.)?tv\.naver\.com\/v\/(\d+)/))) { type = 'video'; key = 'video/' + m[1]; }
    else {
      let host;
      try { host = new URL(x.h).hostname; } catch (e) { continue; }
      if (!/^https?:/.test(x.h) || /(^|\.)(naver\.com|naver\.net|pstatic\.net|navercorp\.com)$/.test(host)) continue;
      type = 'web';
      key = 'web/' + host;
      if (host === lastHost) continue; // 같은 카드 안의 사이트 링크·제목 링크 중복
    }
    if (seen.has(key)) continue;
    seen.add(key);
    lastHost = type === 'web' ? key.slice(4) : null;
    cards.push({ rank: cards.length + 1, type, key, title: x.t });
  }
  return cards;
}

async function check(ctx, region, kw, cafeList) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const page = await ctx.newPage();
    try {
      await page.goto('https://m.search.naver.com/search.naver?where=m&query=' + encodeURIComponent(kw), { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1500);
      const cards = rankCards(await readCards(page));
      if (cards.length < 1) throw new Error('결과 카드를 읽지 못함(' + cards.length + ')');
      let hit = null;
      for (const c of cards) {
        const [, a, b] = c.key.split('/');
        if (c.type === 'blog' && BLOGS.includes(a)) { hit = { rank: c.rank, source: a, title: c.title }; break; }
        if (c.type === 'cafe' && cafeList.includes(a + '/' + b)) { hit = { rank: c.rank, source: '인기통 카페', title: c.title }; break; }
      }
      await page.close();
      return { region, keyword: kw, status: 'ok', cards: cards.length, hit };
    } catch (e) {
      await page.close().catch(() => {});
      if (attempt === 1) return { region, keyword: kw, status: 'unconfirmed', error: String(e.message).slice(0, 100) };
    }
  }
}

(async () => {
  const startedAt = new Date().toISOString();
  const { regions, kws, cafe } = parseList();
  const jobs = [];
  for (const r of regions) if (!ONLY || r === ONLY) for (const k of kws[r]) jobs.push([r, k]);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const results = new Array(jobs.length);
  let i = 0;
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (i < jobs.length) {
      const n = i++;
      results[n] = await check(ctx, jobs[n][0], jobs[n][1], cafe[jobs[n][0]] || []);
    }
  }));
  await browser.close();
  const doc = { startedAt, endedAt: new Date().toISOString(), browser: 'Playwright Chromium (iPhone 14 에뮬레이션)', regions, counts: Object.fromEntries(regions.map(r => [r, kws[r].length])), results };
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 1));
  console.log('done', results.length, 'unconfirmed', results.filter(x => x.status !== 'ok').length);
})();
