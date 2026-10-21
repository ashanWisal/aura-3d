// Performance / GL measurements for the QA audit.
// Usage (from qa-audit/): node perf.mjs <fps|drawcalls|load|contextloss|unmount>
// Runs one browser per invocation; never run two at once (shared GPU).
import fs from 'fs';
import { launch, newContext, INSTRUMENT, waitReady, dismissCookies, storyTo, scrollToSel, shot, BASE } from './lib.mjs';

const GPU_ARGS = ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'];
const section = process.argv[2];

const save = (name, obj) => fs.writeFileSync(`data/${name}`, JSON.stringify(obj, null, 2));
const round = (x) => (x == null || Number.isNaN(x) ? null : +x.toFixed(2));
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : null);

// Records triangles per frame (delta of cumulative __gl.tris between rAF callbacks) and
// the preloader timeline. Injected after INSTRUMENT so __gl exists.
const LOAD_PROBE = () => {
  window.__lt = { preloaderSeen: null, preloaderGone: null, trisFirst50k: null, frameIdx: null, trisInFrame: null };
  const t = () => performance.now();
  const iv = setInterval(() => {
    const p = document.querySelector('[data-preloader]');
    if (p && window.__lt.preloaderSeen === null) window.__lt.preloaderSeen = t();
    if (!p && window.__lt.preloaderSeen !== null && window.__lt.preloaderGone === null) {
      window.__lt.preloaderGone = t();
      clearInterval(iv);
    }
  }, 10);
  let prev = 0, fr = 0;
  const f = () => {
    fr++;
    const g = window.__gl;
    if (g) {
      const d = g.tris - prev;
      prev = g.tris;
      if (d > 50000 && window.__lt.trisFirst50k === null) {
        window.__lt.trisFirst50k = t(); window.__lt.frameIdx = fr; window.__lt.trisInFrame = d;
      }
    }
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
};

const collectErrors = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push({ type: 'pageerror', text: String(e) }));
  page.on('console', (m) => { if (m.type() === 'error') errors.push({ type: 'console.error', text: m.text() }); });
  return errors;
};

const glInfo = (page) => page.evaluate(() => {
  // Reuses the existing context of the first canvas (does not create a new one).
  const c = document.querySelector('canvas');
  if (!c) return null;
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return null;
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    version: gl.getParameter(gl.VERSION),
    renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : null,
    vendor: d ? gl.getParameter(d.UNMASKED_VENDOR_WEBGL) : null,
  };
});

const startRec = (page) => page.evaluate(() => {
  window.__ft = []; window.__rec = true; window.__t0 = performance.now();
  const f = (t) => { if (window.__rec) { window.__ft.push(t); requestAnimationFrame(f); } };
  requestAnimationFrame(f);
});
const stopRec = (page) => page.evaluate(() => {
  window.__rec = false;
  return { ts: window.__ft, t0: window.__t0, t1: performance.now() };
});

function frameStats({ ts, t0, t1 }) {
  const d = [];
  for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
  const s = [...d].sort((a, b) => a - b);
  const secs = (t1 - t0) / 1000;
  return {
    frames: ts.length,
    windowS: round(secs),
    avgFps: round(ts.length / secs),
    p50Ms: round(pct(s, 50)),
    p95Ms: round(pct(s, 95)),
    maxMs: round(s.length ? s[s.length - 1] : null),
    pctFramesOver33ms: round(d.length ? (100 * d.filter((x) => x > 33).length) / d.length : null),
    pctFramesOver50ms: round(d.length ? (100 * d.filter((x) => x > 50).length) / d.length : null),
  };
}

// Counts rAF frames and __gl deltas over `ms` in one page task.
const drawWindow = (page, ms) => page.evaluate(async (ms) => {
  const snap = () => ({ draws: __gl.draws, tris: __gl.tris, lost: __gl.lost, contexts: __gl.contexts });
  const g0 = snap();
  let n = 0, on = true;
  const f = () => { if (on) { n++; requestAnimationFrame(f); } };
  requestAnimationFrame(f);
  await new Promise((r) => setTimeout(r, ms));
  on = false;
  const g1 = snap();
  return { frames: n, g0, g1, drawsDelta: g1.draws - g0.draws, trisDelta: g1.tris - g0.tris };
}, ms);

const sel = async (page, s) => {
  if (!(await page.$(s))) return false;
  await scrollToSel(page, s, 0, 2000);
  return true;
};

const drawsRow = (w) => ({
  frames: w.frames,
  drawsPerFrame: round(w.frames ? w.drawsDelta / w.frames : null),
  trisPerFrame: round(w.frames ? w.trisDelta / w.frames : null),
  drawsDelta: w.drawsDelta,
  trisDelta: w.trisDelta,
  lost: w.g1.lost,
  contexts: w.g1.contexts,
});

// ---------- 1. FPS ----------
async function fpsConfig(browser, name, vp, dpr, throttle) {
  const ctx = await newContext(browser, vp, { deviceScaleFactor: dpr });
  await ctx.addInitScript(INSTRUMENT);
  const page = await ctx.newPage();
  const errors = collectErrors(page);
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await waitReady(page, { timeout: 90000 });
  await dismissCookies(page);
  const gpu = await glInfo(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await storyTo(page, 0, 1500);

  await startRec(page);
  await page.evaluate(async ({ steps, ms }) => {
    const s = document.querySelector('main > section');
    const top = s.getBoundingClientRect().top + window.scrollY;
    const range = s.offsetHeight - window.innerHeight;
    for (let i = 0; i <= steps; i++) {
      const y = top + (i / steps) * range;
      window.lenis ? window.lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, ms));
    }
  }, { steps: 200, ms: 100 });
  const scroll = frameStats(await stopRec(page));

  const idle = {};
  const positions = [
    ['storyTop', () => storyTo(page, 0, 2000).then(() => true)],
    ['progress0.70', () => storyTo(page, 0.7, 2000).then(() => true)],
    ['finishes', () => sel(page, '#finishes')],
    ['moments', () => sel(page, '#moments')],
  ];
  for (const [label, go] of positions) {
    const present = await go();
    if (!present) { idle[label] = { present: false }; continue; }
    await startRec(page);
    await page.waitForTimeout(5000);
    idle[label] = { present: true, ...frameStats(await stopRec(page)) };
  }
  await ctx.close();
  return {
    config: { name, viewport: vp, dpr, throttle, gpu },
    scroll: { steps: 200, stepMs: 100, progress: '0 -> 1', ...scroll },
    idle,
    errors,
  };
}

async function fps() {
  const browser = await launch(GPU_ARGS);
  const runs = [];
  const plan = [
    ['desktop-1x', 'desktop', 1, 1], ['desktop-4x', 'desktop', 1, 4],
    ['mobile-1x', 'mobile', 2, 1], ['mobile-4x', 'mobile', 2, 4],
  ];
  for (const [name, vp, dpr, thr] of plan) {
    runs.push(await fpsConfig(browser, name, vp, dpr, thr));
    save('fps.json', { runs, note: 'partial until all 4 configs finish' });
    console.log('done', name, JSON.stringify(runs.at(-1).scroll));
  }
  save('fps.json', { runs, runAt: new Date().toISOString() });
  await browser.close();
}

// ---------- 2. Draw calls ----------
async function drawcalls() {
  const browser = await launch(GPU_ARGS);
  const ctx = await newContext(browser, 'desktop');
  await ctx.addInitScript(INSTRUMENT);
  const page = await ctx.newPage();
  const errors = collectErrors(page);
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await waitReady(page, { timeout: 90000 });
  await dismissCookies(page);
  const gpu = await glInfo(page);
  const positions = [
    ['progress0', () => storyTo(page, 0)],
    ['progress0.3', () => storyTo(page, 0.3)],
    ['progress0.5', () => storyTo(page, 0.5)],
    ['progress0.70', () => storyTo(page, 0.7)],
    ['progress0.95', () => storyTo(page, 0.95)],
    ['finishes', () => sel(page, '#finishes')],
    ['moments', () => sel(page, '#moments')],
  ];
  const rows = [];
  for (const [name, go] of positions) {
    const present = await go();
    if (present === false) { rows.push({ position: name, present: false }); continue; }
    const w = await drawWindow(page, 3000);
    const canvases = await page.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => ({
      width: c.width, height: c.height, cssWidth: c.clientWidth, cssHeight: c.clientHeight,
    })));
    rows.push({ position: name, present: true, ...drawsRow(w), canvases });
    console.log(name, JSON.stringify(rows.at(-1)));
  }
  const contexts = await page.evaluate(() => ({ contexts: __gl.contexts, lost: __gl.lost, draws: __gl.draws, tris: __gl.tris }));
  const canvasesFinal = await page.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => ({ width: c.width, height: c.height })));
  save('drawcalls.json', { gpu, rows, glTotals: contexts, canvasesFinal, errors, runAt: new Date().toISOString(),
    note: 'drawsPerFrame = rAF-counted frames in a 3 s window; deltas of cumulative __gl counters' });
  await browser.close();
}

// ---------- 3. Load timeline ----------
async function loadConfig(browser, name, vp, dpr) {
  const ctx = await newContext(browser, vp, { deviceScaleFactor: dpr });
  await ctx.addInitScript(INSTRUMENT);
  await ctx.addInitScript(LOAD_PROBE);
  const page = await ctx.newPage();
  const errors = collectErrors(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const navStart = Date.now();
  await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 120000 });
  await waitReady(page, { timeout: 90000 });
  await page.waitForFunction(() => window.__lt && window.__lt.trisFirst50k !== null, null, { timeout: 60000 }).catch(() => {});
  const timing = await page.evaluate(() => {
    const round = (x) => (x == null ? null : Math.round(x * 100) / 100);
    const n = performance.getEntriesByType('navigation')[0];
    const g = performance.getEntriesByType('resource').find((e) => e.name.includes('aura-one.glb'));
    return {
      domContentLoadedMs: round(n.domContentLoadedEventEnd),
      loadMs: round(n.loadEventEnd),
      glb: g ? { url: g.name, responseEndMs: round(g.responseEnd), transferSize: g.transferSize, encodedBodySize: g.encodedBodySize, decodedBodySize: g.decodedBodySize, startTimeMs: round(g.startTime) } : null,
      preloaderSeenMs: window.__lt.preloaderSeen == null ? null : round(window.__lt.preloaderSeen),
      preloaderGoneMs: window.__lt.preloaderGone == null ? null : round(window.__lt.preloaderGone),
      firstFrameTrisOver50kMs: window.__lt.trisFirst50k == null ? null : round(window.__lt.trisFirst50k),
      firstFrameTrisOver50kIndex: window.__lt.frameIdx,
      trisInThatFrame: window.__lt.trisInFrame,
      trisTotal: __gl.tris,
      drawsTotal: __gl.draws,
      contexts: __gl.contexts,
    };
  });
  const { metrics } = await cdp.send('Performance.getMetrics');
  const heap = metrics.find((m) => m.name === 'JSHeapUsedSize');
  const gpu = await glInfo(page);
  await ctx.close();
  return { config: { name, viewport: vp, dpr, throttle: 1, gpu }, navigationStartWallClock: navStart, ...timing,
    jsHeapUsedBytes: heap ? heap.value : null, errors };
}

async function load() {
  const browser = await launch(GPU_ARGS);
  const runs = [];
  runs.push(await loadConfig(browser, 'desktop-1x', 'desktop', 1));
  save('load.json', { runs, partial: true });
  runs.push(await loadConfig(browser, 'mobile-1x', 'mobile', 2));
  save('load.json', { runs, runAt: new Date().toISOString() });
  console.log(JSON.stringify(runs, null, 1));
  await browser.close();
}

// ---------- 4. WebGL context loss ----------
async function contextloss() {
  const browser = await launch(GPU_ARGS);
  const ctx = await newContext(browser, 'desktop');
  await ctx.addInitScript(INSTRUMENT);
  const page = await ctx.newPage();
  const errors = collectErrors(page);
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await waitReady(page, { timeout: 90000 });
  await dismissCookies(page);
  await storyTo(page, 0, 1500);
  const gpu = await glInfo(page);
  const pre = await drawWindow(page, 3000);

  await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    window.__loseExt = gl.getExtension('WEBGL_lose_context');
    window.__loseExt.loseContext();
  });
  await page.waitForTimeout(2000);
  const lostState = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return { isContextLost: gl.isContextLost(), lostCounter: __gl.lost, draws: __gl.draws };
  });
  await shot(page, { id: 'S148', group: 'WebGL context loss', viewport: 'desktop', caption: 'desktop — story top, 2 s after WEBGL_lose_context.loseContext()' });

  await page.evaluate(() => window.__loseExt.restoreContext());
  await page.waitForTimeout(4000);
  const restoredState = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return { isContextLost: gl.isContextLost(), lostCounter: __gl.lost, contexts: __gl.contexts, draws: __gl.draws };
  });
  await shot(page, { id: 'S149', group: 'WebGL context loss', viewport: 'desktop', caption: 'desktop — story top, 4 s after restoreContext()' });
  const post = await drawWindow(page, 3000);

  save('contextloss.json', {
    gpu,
    canvasCountBeforeLoss: await page.evaluate(() => document.querySelectorAll('canvas').length),
    preLossWindow: drawsRow(pre),
    afterLoseContext2s: lostState,
    afterRestore4s: restoredState,
    postRestoreWindow: { ...drawsRow(post), drawsPerFrame: round(post.frames ? post.drawsDelta / post.frames : null) },
    modelCameBack: post.drawsDelta > 0,
    errors,
    shots: ['S148', 'S149'],
    runAt: new Date().toISOString(),
  });
  await browser.close();
}

// ---------- 5. Unmount / disposal ----------
async function unmount() {
  const browser = await launch(GPU_ARGS);
  const ctx = await newContext(browser, 'desktop');
  await ctx.addInitScript(INSTRUMENT);
  const page = await ctx.newPage();
  const errors = collectErrors(page);
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await waitReady(page, { timeout: 90000 });
  await dismissCookies(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const heap = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'JSHeapUsedSize').value;
  const snap = () => page.evaluate(() => ({
    path: location.pathname,
    lost: __gl.lost, contexts: __gl.contexts, draws: __gl.draws,
    canvases: document.querySelectorAll('canvas').length,
  }));

  const before = { ...(await snap()), jsHeapUsedBytes: await heap() };
  await scrollToSel(page, 'footer', 0, 1500);
  const link = page.locator('footer a', { hasText: /privacy/i }).first();
  const linkText = (await link.textContent())?.trim();
  await page.evaluate(() => { window.__noReloadMarker = 1; });
  await link.click();
  await page.waitForTimeout(3000);
  const after = { ...(await snap()), jsHeapUsedBytes: await heap(),
    clientSideNavNoReload: (await page.evaluate(() => window.__noReloadMarker ?? null)) === 1, linkText };

  await page.goBack();
  let backWaitError = null;
  try { await waitReady(page, { timeout: 90000 }); } catch (e) { backWaitError = String(e).slice(0, 300); }
  await page.waitForTimeout(1000);
  const back = { ...(await snap()), jsHeapUsedBytes: await heap(), backWaitError };
  const gpu = await glInfo(page).catch(() => null);

  save('unmount.json', {
    gpu, before, afterPrivacyNav3s: after, afterGoBack: back,
    newContextsCreatedOnBack: back.contexts - after.contexts,
    errors, runAt: new Date().toISOString(),
  });
  await browser.close();
}

const SECTIONS = { fps, drawcalls, load, contextloss, unmount };
if (!SECTIONS[section]) { console.error('usage: node perf.mjs <' + Object.keys(SECTIONS).join('|') + '>'); process.exit(2); }
await SECTIONS[section]();
console.log('section done:', section);
