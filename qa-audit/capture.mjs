// Usage: node capture.mjs <viewport> <startIndex>
// Captures every story state + section for one viewport. IDs continue from startIndex.
import fs from 'fs';
import { chromium } from 'playwright';
import { CHROME, BASE, VIEWPORTS, newContext, INSTRUMENT, waitReady, dismissCookies, storyTo, scrollToSel, shot } from './lib.mjs';

export const GPU = ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'];
const vp = process.argv[2];
let n = Number(process.argv[3] || 0);
const id = () => 'S' + String(++n).padStart(3, '0');
const events = [];
const watch = (page, tag) => {
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) events.push({ tag, type: m.type(), text: m.text().slice(0, 400) }); });
  page.on('pageerror', e => events.push({ tag, type: 'pageerror', text: e.message.slice(0, 400) }));
  page.on('requestfailed', r => events.push({ tag, type: 'requestfailed', text: r.url() + ' ' + r.failure()?.errorText }));
  page.on('response', r => { if (r.status() >= 400) events.push({ tag, type: 'http' + r.status(), text: r.url() }); });
};

const CH = [['01', 'Hero "Silence, made by hand."'], ['02', 'Frame "Every angle considered."'], ['03', 'Materials "Close enough to touch."'], ['04', 'Inside "Forty parts." (explode)'], ['05', 'Together "Back together."']];
const SECTIONS = [['#finishes', 'Finishes (colour picker + turntable)'], ['#sound', 'Sound features'], ['#moments', 'Every day (moments ring)'], ['#specs', 'Specifications'], ['#reviews', 'Reviews + press'], ['#buy', 'Pre-order form'], ['#contact', 'Footer']];

const b = await chromium.launch({ executablePath: CHROME, args: GPU });
const ctx = await newContext(b, vp); await ctx.addInitScript(INSTRUMENT);
const page = await ctx.newPage(); watch(page, vp);
await page.goto(BASE + '/');
await page.waitForTimeout(500);
await shot(page, { id: id(), group: 'Loading', viewport: vp, caption: `${vp} — preloader, ~0.5 s after navigation` });
await waitReady(page);
await shot(page, { id: id(), group: 'Loading', viewport: vp, caption: `${vp} — first screen after preloader, cookie banner up` });
await dismissCookies(page);

for (let c = 0; c < 5; c++) {
  const pts = c === 3
    ? [[0.12, 'start (assembled)'], [0.4, 'coming apart'], [0.55, 'fully apart'], [0.75, 'apart, callouts'], [0.92, 'end (reassembling)']]
    : [[0.15, 'start'], [0.5, 'midpoint'], [0.88, 'end']];
  for (const [local, label] of pts) {
    const p = (c + local) / 5;
    await storyTo(page, p, 2600);
    await shot(page, { id: id(), group: `Story ${CH[c][0]} — ${CH[c][1]}`, viewport: vp, caption: `${vp} — story progress ${(p * 100).toFixed(0)}% (chapter ${CH[c][0]} ${label})` });
  }
}
for (const [sel, name] of SECTIONS) {
  await scrollToSel(page, sel, 0, 2600);
  const h = await page.evaluate(s => document.querySelector(s).offsetHeight, sel);
  await shot(page, { id: id(), group: name, viewport: vp, caption: `${vp} — ${name}, section top (section ${h}px tall)` });
  if (h > VIEWPORTS[vp].height * 1.35) {
    await scrollToSel(page, sel, h - VIEWPORTS[vp].height, 2000);
    await shot(page, { id: id(), group: name, viewport: vp, caption: `${vp} — ${name}, section bottom` });
  }
}

if (vp === 'desktop') {
  await scrollToSel(page, '#finishes', 0, 800);
  await page.locator('#finishes label').nth(1).click(); await page.waitForTimeout(1800);
  await shot(page, { id: id(), group: 'Finishes (colour picker + turntable)', viewport: vp, caption: 'desktop — finish switched to Sand' });
  await page.locator('#finishes label').nth(2).click(); await page.waitForTimeout(1800);
  await shot(page, { id: id(), group: 'Finishes (colour picker + turntable)', viewport: vp, caption: 'desktop — finish switched to Midnight' });
  const cv = await page.locator('#finishes canvas').boundingBox();
  await page.mouse.move(cv.x + cv.width / 2, cv.y + cv.height / 2); await page.mouse.down();
  await page.mouse.move(cv.x + cv.width / 2 + 260, cv.y + cv.height / 2, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(1200);
  await shot(page, { id: id(), group: 'Finishes (colour picker + turntable)', viewport: vp, caption: 'desktop — turntable after a 260 px drag' });
  await page.locator('#finishes label').nth(0).click(); await page.waitForTimeout(600);
  await page.locator('#finishes input[type=radio]').nth(0).focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500);
  await shot(page, { id: id(), group: 'Hover & focus states', viewport: vp, caption: 'desktop — swatch radio after keyboard ArrowRight (focus-visible ring)' });
  await scrollToSel(page, '#moments', 300, 1500);
  await page.locator('#moments li button').nth(6).hover(); await page.waitForTimeout(800);
  await shot(page, { id: id(), group: 'Hover & focus states', viewport: vp, caption: 'desktop — moments ring, hover on "Gaming"' });
  await page.locator('header nav a').nth(1).hover(); await page.waitForTimeout(500);
  await shot(page, { id: id(), group: 'Hover & focus states', viewport: vp, caption: 'desktop — header, hover on "Sound" nav link' });
  await page.locator('header a[href="#buy"]').hover(); await page.waitForTimeout(500);
  await shot(page, { id: id(), group: 'Hover & focus states', viewport: vp, caption: 'desktop — header, hover on Pre-order CTA' });
  await storyTo(page, 0, 1500); await page.mouse.move(5, 5); await page.evaluate(() => document.activeElement?.blur());
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  await shot(page, { id: id(), group: 'Hover & focus states', viewport: vp, caption: 'desktop — third Tab press from page top' });
  await scrollToSel(page, '#buy', 0, 1500);
  await page.locator('#buy button[type=submit]').click(); await page.waitForTimeout(600);
  await shot(page, { id: id(), group: 'Pre-order form', viewport: vp, caption: 'desktop — pre-order submitted empty (native validation bubble is not captured by screenshots)' });
  await page.locator('#buy input[name=name]').fill('QA Tester'); await page.locator('#buy input[name=email]').fill('qa@example.com');
  await page.locator('#buy input[name=email]').focus(); await page.waitForTimeout(300);
  await shot(page, { id: id(), group: 'Pre-order form', viewport: vp, caption: 'desktop — pre-order filled, email field focused' });
  const [resp] = await Promise.all([page.waitForResponse(r => r.url().includes('/api/contact')), page.locator('#buy button[type=submit]').click()]);
  fs.writeFileSync('data/contact-response.json', JSON.stringify({ status: resp.status(), body: await resp.text() }));
  await page.waitForTimeout(800);
  await shot(page, { id: id(), group: 'Pre-order form', viewport: vp, caption: `desktop — pre-order after submit (POST /api/contact → ${resp.status()})` });
}

fs.writeFileSync(`data/gl-${vp}.json`, JSON.stringify(await page.evaluate(() => ({ contexts: window.__gl.contexts, lost: window.__gl.lost, canvases: [...document.querySelectorAll('canvas')].map(c => [c.width, c.height]) }))));
fs.writeFileSync(`data/console-${vp}.json`, JSON.stringify(events, null, 1));
console.log('LAST_ID', n);
await ctx.close(); await b.close();
