// Round 2 captures, driven through Playwright with the system Chrome.
//   node tools/cap2.mjs shot <page.html> "<query>" <theme> <w> <h> <waitMs> [selector] [out-suffix]
//        -> shots/r2-<page>-<w>-<theme><suffix>.png; with a selector, that element only (full height)
//   node tools/cap2.mjs mcpnow
//        -> mcp/assets/now-1440.jpg, mcp/assets/now-390.jpg  (the live MCP page as it is, full length; it has no dark mode)
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('I:/DEV/artist-tracker/node_modules/playwright');

const M = 'I:/DEV/clockchain/mockups/ai-agents';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
async function open(url, theme, w, h, dpr = 2) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 500, hasTouch: w < 500 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('cc-theme', t); } catch (e) {} }, theme === 'dark' ? 'eclipse' : 'daylight');
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/CORS|Failed to load resource|net::ERR/.test(m.text())) console.log('console:', m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  return { ctx, page };
}

const mode = process.argv[2];
if (mode === 'shot') {
  const [, , , pg, query = '', theme = 'light', w = '1440', h = '900', waitMs = '6000', sel, suffix = ''] = process.argv;
  const W = +w, H = +h;
  const qs = 'theme=' + theme + (query ? '&' + query : '');
  const { ctx, page } = await open(`file:///${M}/${pg}?${qs}`, theme, W, H);
  if (sel) await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView(); }, sel);
  await page.waitForTimeout(+waitMs);
  const out = `${M}/shots/r2-${path.basename(pg, '.html')}-${W}-${theme}${suffix}.png`;
  if (sel) await page.locator(sel).first().screenshot({ path: out });
  else await page.screenshot({ path: out });
  console.log(out);
  await ctx.close();
} else if (mode === 'poster') {
  /* the demo film's poster frame as the live page shows it (before play), for Fig 1.1 */
  const { ctx, page } = await open('https://mcp.clockchain.network/', 'light', 1440, 900, 2);
  await page.waitForTimeout(2000);
  const v = page.locator('video').first();
  await v.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  await v.evaluate((el) => { el.pause(); el.currentTime = 0; el.removeAttribute('autoplay'); el.load(); });
  await page.waitForTimeout(1200);
  const out = `${M}/mcp/assets/demo-poster.jpg`;
  await v.screenshot({ path: out, type: 'jpeg', quality: 86 });
  console.log(out);
  await ctx.close();
} else if (mode === 'mcpnow') {
  for (const [w, h, dpr] of [[1440, 900, 1], [390, 844, 2]]) {
    const { ctx, page } = await open('https://mcp.clockchain.network/', 'light', w, h, dpr);
    await page.waitForTimeout(2500);
    /* scroll through once so anything that reveals on scroll is drawn */
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += h * 0.8) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(250); }
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800);
    const out = `${M}/mcp/assets/now-${w}.jpg`;
    await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 82 });
    console.log(out, H);
    await ctx.close();
  }
}
await browser.close();
