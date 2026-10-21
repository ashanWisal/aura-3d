import { launch, newContext, INSTRUMENT, BASE } from './lib.mjs';
const b = await launch();
const ctx = await newContext(b, 'desktop'); await ctx.addInitScript(INSTRUMENT);
const page = await ctx.newPage();
const logs = []; page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message));
page.on('requestfailed', r => logs.push('FAILED ' + r.url() + ' ' + r.failure()?.errorText));
await page.goto(BASE + '/');
for (const t of [1000, 3000, 6000, 10000]) {
  await page.waitForTimeout(t === 1000 ? 1000 : 3000);
  console.log(t, await page.evaluate(() => ({ pre: !!document.querySelector('[data-preloader]'), preText: document.querySelector('[data-preloader]')?.innerText.slice(-30), canv: document.querySelectorAll('canvas').length, glb: performance.getEntriesByType('resource').filter(e => e.name.includes('glb')).map(e => [e.name, e.responseEnd|0]), robot: !!document.querySelector('meta[name=x-robot-view]'), gl: window.__gl?.contexts, ready: document.readyState })));
}
await page.screenshot({ path: 'logs/probe.png' });
console.log(logs.slice(0, 30).join('\n'));
await b.close();
