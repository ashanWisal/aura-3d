// One-shot: screenshot each mockup, convert to WebP, write data/mockups.json.
// Run from qa-audit: node prototypes/_shoot-mockups.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const VP = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const SHOTS = [
  { id: 'M01', file: '01-finish-configurator.html', vp: 'desktop', title: 'Finish configurator', caption: 'Product with finish swatches, cushion switch and live price' },
  { id: 'M02', file: '02-frequency-response.html', vp: 'desktop', title: 'Frequency response', caption: 'Illustrative curve vs Harman target, ANC and transparency toggles' },
  { id: 'M03', file: '03-hotspots.html', vp: 'desktop', title: 'Hotspots', caption: 'Five keyboard-focusable pins with an open detail card' },
  { id: 'M04', file: '04-loading-and-performance.html', vp: 'desktop', title: 'Loading and performance', caption: 'Byte-driven loader, skip intro, quality and reduce-motion popover, live FPS chip' },
  { id: 'M05', file: '05-case-study.html', vp: 'desktop', title: 'Case study', caption: 'How we built Aura One: stack chips, three-step process, metrics left as placeholders' },
  { id: 'M06', file: '06-preorder-flow.html', vp: 'desktop', title: 'Pre-order drawer', caption: 'Three-step pre-order drawer with order summary and consent' },
  { id: 'M07', file: '01-finish-configurator.html', vp: 'mobile', title: 'Finish configurator (mobile)', caption: 'Configurator at 390 px, stacked layout' },
  { id: 'M08', file: '06-preorder-flow.html', vp: 'mobile', title: 'Pre-order drawer (mobile)', caption: 'Pre-order drawer at 390 px, full-width sheet' },
];

fs.mkdirSync(path.join(ROOT, 'shots'), { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ['--disable-gpu'] });
const out = [];
try {
  for (const s of SHOTS) {
    const ctx = await browser.newContext({ viewport: VP[s.vp], deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(HERE, s.file)).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const png = await page.screenshot({ type: 'png' });
    const dest = path.join(ROOT, 'shots', s.id + '.webp');
    await sharp(png).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 75 }).toFile(dest);
    out.push({
      id: s.id,
      file: 'shots/' + s.id + '.webp',
      prototype: 'prototypes/' + s.file,
      title: s.title,
      viewport: `${VP[s.vp].width}x${VP[s.vp].height}`,
      caption: s.caption,
    });
    console.log(s.id, s.file, s.vp, errors.length ? 'JS errors: ' + errors.join(' | ') : 'ok');
    await ctx.close();
  }
} finally {
  await browser.close();
}
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'mockups.json'), JSON.stringify(out, null, 2) + '\n');
console.log('wrote data/mockups.json with', out.length, 'entries');
