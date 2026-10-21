import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
export const BASE = process.env.BASE || 'http://localhost:3456';
export const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
// A normal desktop Chrome UA: the default HeadlessChrome UA matches src/utils/bot-ua.ts and gets /robot-view.
export const HUMAN_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
export const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
export const WEBGL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  'tablet-landscape': { width: 1024, height: 768 },
  'tablet-portrait': { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};
export const launch = (args = WEBGL_ARGS) => chromium.launch({ executablePath: CHROME, args });
export const newContext = (browser, vp, extra = {}) => browser.newContext({
  viewport: VIEWPORTS[vp], userAgent: vp === 'mobile' ? MOBILE_UA : HUMAN_UA,
  isMobile: vp === 'mobile', hasTouch: vp === 'mobile' || vp.startsWith('tablet'), deviceScaleFactor: 1, ...extra,
});
// Counts draw calls / triangles / contexts per canvas, per frame.
export const INSTRUMENT = () => {
  const stats = { contexts: 0, lost: 0, frames: 0, draws: 0, tris: 0, perFrame: [] };
  window.__gl = stats;
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = orig.call(this, type, ...rest);
    if (ctx && /webgl/.test(type) && !this.__counted) { this.__counted = true; stats.contexts++; this.addEventListener('webglcontextlost', () => stats.lost++); }
    return ctx;
  };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    const p = C.prototype;
    for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
      const o = p[fn]; if (!o) continue;
      p[fn] = function (...a) {
        stats.draws++;
        const mode = a[0]; const count = fn.startsWith('drawArrays') ? a[2] : (fn === 'drawRangeElements' ? a[3] : a[1]);
        if (mode === 4) stats.tris += count / 3;
        return o.apply(this, a);
      };
    }
  }
};
export async function waitReady(page, { model = true, timeout = 60000 } = {}) {
  await page.waitForLoadState('load');
  await page.waitForFunction(() => !document.querySelector('[data-preloader]'), null, { timeout });
  if (model) {
    await page.waitForFunction(() => {
      const r = performance.getEntriesByType('resource').find(e => e.name.includes('aura-one.glb'));
      return r && r.responseEnd > 0 && document.querySelector('canvas');
    }, null, { timeout });
    // Give the loader + fitModel + first frames time on software GL.
    await page.waitForTimeout(2500);
  }
}
export async function dismissCookies(page) {
  const btn = page.getByRole('button', { name: 'Reject all' });
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(500); }
}
/** Scroll so the story reports `p` (0-1). */
export async function storyTo(page, p, settle = 2200) {
  await page.evaluate((p) => {
    const s = document.querySelector('main > section');
    const top = s.getBoundingClientRect().top + window.scrollY;
    const y = top + p * (s.offsetHeight - window.innerHeight);
    window.lenis ? window.lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
  }, p);
  await page.waitForTimeout(settle);
}
export async function scrollToSel(page, sel, offset = 0, settle = 1800) {
  await page.evaluate(([sel, offset]) => {
    const el = document.querySelector(sel);
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.lenis ? window.lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
  }, [sel, offset]);
  await page.waitForTimeout(settle);
}
const MANIFEST = 'data/shots.json';
export const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST)) : [];
export async function shot(target, { id, group, viewport, caption, fullPage = false }) {
  const buf = await target.screenshot(fullPage ? { fullPage: true } : {});
  const img = sharp(buf); const meta = await img.metadata();
  const out = `shots/${id}.webp`;
  await img.resize({ width: Math.min(1400, meta.width), withoutEnlargement: true }).webp({ quality: 72 }).toFile(out);
  const i = manifest.findIndex(m => m.id === id); const rec = { id, group, viewport, caption, file: out };
  if (i >= 0) manifest[i] = rec; else manifest.push(rec);
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(id, caption);
}
