// Captures for the AI & Agents mockup, driven through Playwright with the system Chrome.
//   node tools/cap.mjs now                  -> assets/now-*, assets/uc-bottom-*, assets/news-top-*  (the real page, as it is)
//   node tools/cap.mjs shot <page> [theme] [w] [h] [waitMs] [scrollTo]
//                                         -> shots/<page>-<w>-<theme>.png  (a mockup page, viewport only)
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('I:/DEV/artist-tracker/node_modules/playwright');

const M = 'I:/DEV/clockchain/mockups/ai-agents';
const SITE = 'file:///I:/DEV/clockchain/design/index.html';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SIZES = { 1440: [1440, 900], 390: [390, 844] };

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

async function open(url, theme, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 500, hasTouch: w < 500 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('cc-theme', t); } catch (e) {} }, theme === 'dark' ? 'eclipse' : 'daylight');
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  return { ctx, page };
}

async function hideConsent(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.cc-text').forEach((e) => {
      let n = e; while (n.parentElement && n.parentElement !== document.body) n = n.parentElement; n.remove();
    });
  });
}

const mode = process.argv[2];

if (mode === 'now') {
  for (const theme of ['light', 'dark']) {
    for (const w of [1440, 390]) {
      const [W, H] = SIZES[w];
      const { ctx, page } = await open(SITE, theme, W, H);
      await page.waitForTimeout(1500);
      await hideConsent(page);
      const r = await page.evaluate(() => {
        const uc = document.getElementById('use-cases').getBoundingClientRect();
        const nw = document.getElementById('news').getBoundingClientRect();
        const nav = document.querySelector('.nav').getBoundingClientRect();
        return { ucTop: uc.top + scrollY, ucBottom: uc.bottom + scrollY, newsTop: nw.top + scrollY, newsBottom: nw.bottom + scrollY, navH: nav.height };
      });
      console.log(theme, w, JSON.stringify(r));
      // Now: what a visitor sees at the boundary, nav and globe included
      await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, r.newsTop - H * 0.5));
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${M}/assets/now-${w}-${theme}.png` });
      // Slices for the versions, with the fixed globe and nav hidden so the live page supplies them
      await page.addStyleTag({ content: '.hero-earth,.nav,.mobile-menu,.scroll-progress{visibility:hidden!important}' });
      const ucSlice = w < 500 ? 900 : 560, nwSlice = w < 500 ? 760 : 620;
      await page.evaluate((y) => window.scrollTo(0, y), r.ucBottom - ucSlice);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${M}/assets/uc-bottom-${w}-${theme}.png`, clip: { x: 0, y: 0, width: W, height: ucSlice } });
      await page.evaluate((y) => window.scrollTo(0, y), r.newsTop);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${M}/assets/news-top-${w}-${theme}.png`, clip: { x: 0, y: 0, width: W, height: Math.min(nwSlice, H) } });
      await ctx.close();
    }
  }
} else if (mode === 'shot') {
  // [t] freezes the animation at that second (the player's ?t= review mode); [still] shows the reduced-motion list
  const [, , , pg, theme = 'dark', w = '1440', h, waitMs = '6000', scrollTo, t, still] = process.argv;
  const W = +w, H = +(h || SIZES[W]?.[1] || 900);
  const qs = `theme=${theme}` + (t ? `&t=${t}` : '') + (still ? '&still=1' : '');
  const { ctx, page } = await open(`file:///${M}/${pg}.html?${qs}`, theme, W, H);
  if (scrollTo) await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView(); }, scrollTo);
  await page.waitForTimeout(+waitMs);
  const out = `${M}/shots/${path.basename(pg)}-${W}-${theme}` + (t ? `-t${t}` : '') + (still ? '-still' : '') + '.png';
  await page.screenshot({ path: out });
  console.log(out);
  await ctx.close();
}
await browser.close();
