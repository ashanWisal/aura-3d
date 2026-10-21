// QA extras: edge-case states. IDs continue from 130 (after mobile LAST_ID 129).
import fs from 'fs';
import { chromium } from 'playwright';
import { CHROME, BASE, newContext, waitReady, dismissCookies, storyTo, scrollToSel, shot } from './lib.mjs';

const GPU = ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'];
const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const NOGL = ['--disable-webgl', '--disable-3d-apis', '--disable-gpu'];
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

let n = 129;
const id = () => 'S' + String(++n).padStart(3, '0');
let group = '';
const events = [];
const failures = [];
const misc = {};
const save = (name, obj) => fs.writeFileSync(`data/${name}.json`, JSON.stringify(obj, null, 1));
const saveMisc = () => save('misc', misc);
const watch = (page, vp) => {
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) events.push({ tag: vp, group, type: m.type(), text: m.text().slice(0, 400) }); });
  page.on('pageerror', e => events.push({ tag: vp, group, type: 'pageerror', text: e.message.slice(0, 400) }));
  page.on('requestfailed', r => events.push({ tag: vp, group, type: 'requestfailed', text: r.url() + ' ' + r.failure()?.errorText }));
  page.on('response', r => { if (r.status() >= 400) events.push({ tag: vp, group, type: 'http' + r.status(), text: r.url() }); });
};
const safe = async (label, fn) => { try { return await fn(); } catch (e) { failures.push({ step: label, error: e.message.slice(0, 300) }); console.log('FAIL', label, e.message.slice(0, 200)); } };
const run = async (name, args, fn) => {
  group = name;
  console.log('== group', name);
  const b = await chromium.launch({ executablePath: CHROME, args });
  try { await fn(b); } catch (e) { failures.push({ group: name, error: e.message.slice(0, 300) }); console.log('FAIL group', name, e.message.slice(0, 200)); }
  finally { await b.close(); }
};
const words = s => s.trim().split(/\s+/).filter(Boolean).length;

// ---------- Reduced motion ----------
await run('Reduced motion', GPU, async (b) => {
  const ctx = await newContext(b, 'desktop', { reducedMotion: 'reduce' });
  const page = await ctx.newPage(); watch(page, 'desktop');
  await page.goto(BASE + '/');
  await page.waitForTimeout(500);
  const pre = page.locator('[data-preloader]');
  const rm = { preloaderCountAt500ms: await pre.count(), preloaderVisibleAt500ms: await pre.first().isVisible().catch(() => false) };
  await safe('rm waitReady', () => waitReady(page));
  await dismissCookies(page);
  rm.preloaderCountAfterLoad = await pre.count();
  rm.reducedMotionMatches = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop, reduced motion — page top after load' });
  await safe('rm story', async () => {
    await storyTo(page, 0.70, 2600);
    await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop, reduced motion — story progress 70% (explode)' });
  });
  await safe('rm finishes', async () => {
    await scrollToSel(page, '#finishes', 0, 2000);
    await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop, reduced motion — #finishes' });
  });
  misc.reducedMotion = rm;
  saveMisc();
  await ctx.close();
});

// ---------- WebGL disabled ----------
{
  const out = {};
  await run('WebGL disabled', NOGL, async (b) => {
    for (const vp of ['desktop', 'mobile']) {
      const ctx = await newContext(b, vp); const page = await ctx.newPage();
      const consoleErrors = [], pageErrors = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
      page.on('pageerror', e => pageErrors.push(e.message.slice(0, 300)));
      const resp = await page.goto(BASE + '/');
      await page.waitForTimeout(8000);
      await safe('nogl top ' + vp, () => shot(page, { id: id(), group, viewport: vp, caption: `${vp} — WebGL disabled, page top after ~8 s` }));
      await safe('nogl finishes ' + vp, async () => {
        await scrollToSel(page, '#finishes', 0, 1500);
        await shot(page, { id: id(), group, viewport: vp, caption: `${vp} — WebGL disabled, #finishes` });
      });
      await safe('nogl moments ' + vp, async () => {
        await scrollToSel(page, '#moments', 0, 1500);
        await shot(page, { id: id(), group, viewport: vp, caption: `${vp} — WebGL disabled, #moments` });
      });
      out[vp] = {
        httpStatus: resp?.status(),
        consoleErrors: [...new Set(consoleErrors)].slice(0, 30),
        pageErrors: [...new Set(pageErrors)].slice(0, 30),
        errorBoundaryTextPresent: (await page.getByText('Something went wrong').count()) > 0,
        canvasCount: await page.locator('canvas').count(),
        h1Text: await page.locator('h1').first().textContent().catch(() => null),
        h1Visible: await page.locator('h1').first().isVisible().catch(() => false),
        preloaderStillPresent: (await page.locator('[data-preloader]').count()) > 0,
        bodyWordCount: words(await page.evaluate(() => document.body.innerText)),
      };
      await ctx.close();
    }
  });
  save('nowebgl', out);
}

// ---------- JavaScript disabled ----------
await run('JavaScript disabled', GPU, async (b) => {
  const ctx = await newContext(b, 'desktop', { javaScriptEnabled: false });
  const page = await ctx.newPage();
  const resp = await page.goto(BASE + '/');
  await page.waitForTimeout(1500);
  const html = await page.content();
  const body = (html.match(/<body[\s\S]*<\/body>/i) || [html])[0];
  const text = body.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  const pre = page.locator('[data-preloader]');
  const preloaderVisible = await pre.first().isVisible({ timeout: 2000 }).catch(e => 'error: ' + e.message.slice(0, 120));
  await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop, JavaScript disabled — page top' });
  await safe('nojs specs', async () => {
    await page.locator('#specs').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop, JavaScript disabled — #specs scrolled into view' });
  });
  save('nojs', {
    httpStatus: resp?.status(),
    bodyWordCount: words(text),
    wordCountMethod: 'server HTML from page.content() (body tag, script/style/noscript stripped, tags removed); document.body.innerText is not available without JS',
    preloaderElementsInHtml: await pre.count(),
    preloaderVisible,
    noscriptHidesPreloaderInHtml: html.includes('[data-preloader]{display:none}'),
    specsSectionInHtml: html.includes('id="specs"'),
  });
  await ctx.close();
});

// ---------- Robot view (crawler UA) ----------
await run('Robot view (crawler UA)', GPU, async (b) => {
  const ctx = await newContext(b, 'desktop', { userAgent: BOT_UA });
  const page = await ctx.newPage(); watch(page, 'desktop');
  const resp = await page.goto(BASE + '/');
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  misc.robotView = {
    httpStatus: resp?.status(),
    finalUrl: page.url(),
    title: await page.title(),
    h1: await page.locator('h1').first().textContent().catch(() => null),
    canvasCount: await page.locator('canvas').count(),
    cookieBannerPresent: (await page.getByRole('button', { name: 'Manage preferences' }).count()) > 0,
  };
  saveMisc();
  await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop, Googlebot UA — robot view, page top' });
  await ctx.close();
});

// ---------- Cookie consent ----------
await run('Cookie consent', GPU, async (b) => {
  const cookie = {};
  let ctx = await newContext(b, 'desktop');
  let page = await ctx.newPage(); watch(page, 'desktop');
  await page.goto(BASE + '/');
  const manage = page.getByRole('button', { name: 'Manage preferences' });
  await manage.waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop, fresh visit — cookie banner' });
  await manage.click();
  await page.waitForTimeout(1000);
  await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop — Manage preferences modal open' });
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
  cookie.focusAfterThreeTabs = await page.evaluate(() => {
    const a = document.activeElement;
    return {
      tag: a?.tagName,
      text: (a?.innerText || a?.getAttribute('aria-label') || '').trim().slice(0, 80),
      insideDialog: !!a?.closest('[role=dialog]'),
      dialogPresent: !!document.querySelector('[role=dialog][aria-modal=true]'),
    };
  });
  await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop — modal after 3 Tab presses (focus check)' });
  await ctx.close();

  ctx = await newContext(b, 'desktop');
  page = await ctx.newPage(); watch(page, 'desktop');
  await page.goto(BASE + '/');
  await page.getByRole('button', { name: 'Accept all' }).first().click();
  await page.waitForTimeout(1000);
  cookie.localStorageAfterAcceptAll = await page.evaluate(() => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); }
    return o;
  });
  cookie.bannerStillVisibleAfterAccept = (await page.getByRole('button', { name: 'Manage preferences' }).isVisible().catch(() => false));
  cookie.consentKey = 'cookie-consent-v1';
  save('cookie', cookie);
  await ctx.close();
});

// ---------- 404 + privacy policy ----------
await run('404 page', GPU, async (b) => {
  const res = {};
  for (const vp of ['desktop', 'mobile']) {
    const ctx = await newContext(b, vp); const page = await ctx.newPage(); watch(page, vp);
    const resp = await page.goto(BASE + '/this-page-does-not-exist');
    await page.waitForLoadState('load'); await page.waitForTimeout(1000);
    res[vp] = { httpStatus: resp?.status(), finalUrl: page.url(), h1: await page.locator('h1').first().textContent().catch(() => null) };
    await shot(page, { id: id(), group, viewport: vp, caption: `${vp} — /this-page-does-not-exist (HTTP ${resp?.status()})` });
    await ctx.close();
  }
  misc.notFound = res;
  saveMisc();
});
await run('Privacy policy', GPU, async (b) => {
  const res = {};
  for (const vp of ['desktop', 'mobile']) {
    const ctx = await newContext(b, vp); const page = await ctx.newPage(); watch(page, vp);
    const resp = await page.goto(BASE + '/privacy-policy');
    await page.waitForLoadState('load'); await page.waitForTimeout(1000);
    res[vp] = { httpStatus: resp?.status(), finalUrl: page.url(), h1: await page.locator('h1').first().textContent().catch(() => null) };
    await shot(page, { id: id(), group, viewport: vp, caption: `${vp} — /privacy-policy top (HTTP ${resp?.status()})` });
    await ctx.close();
  }
  misc.privacyPolicy = res;
  saveMisc();
});

// ---------- Header & nav at narrow widths ----------
await run('Header & nav', GPU, async (b) => {
  const res = {};
  for (const vp of ['mobile', 'tablet-portrait']) {
    const ctx = await newContext(b, vp); const page = await ctx.newPage(); watch(page, vp);
    await page.goto(BASE + '/');
    await safe('nav waitReady ' + vp, () => waitReady(page, { model: false, timeout: 90000 }));
    await page.waitForTimeout(2500);
    res[vp] = await page.evaluate(() => {
      const links = [...document.querySelectorAll('header nav a')];
      const visible = links.filter(a => { const r = a.getBoundingClientRect(); const s = getComputedStyle(a); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; });
      const headerButtons = [...document.querySelectorAll('header button')].map(b => ({ text: b.innerText.trim().slice(0, 40), ariaLabel: b.getAttribute('aria-label') }));
      return {
        navLinksInDom: links.length,
        navLinksVisible: visible.length,
        navLinkTexts: links.map(a => a.innerText.trim()),
        headerButtons,
        menuButtonFound: headerButtons.some(x => /menu|nav/i.test((x.text || '') + (x.ariaLabel || ''))),
        headerCtaVisible: !!document.querySelector('header a[href="#buy"]') && document.querySelector('header a[href="#buy"]').getBoundingClientRect().width > 0,
      };
    });
    await shot(page, { id: id(), group, viewport: vp, caption: `${vp} — page top, header nav/menu check` });
    await ctx.close();
  }
  misc.headerNav = res;
  saveMisc();
});

// ---------- Loading on SwiftShader (no GPU) ----------
await run('Loading', SWIFTSHADER, async (b) => {
  const ctx = await newContext(b, 'desktop'); const page = await ctx.newPage(); watch(page, 'desktop');
  await page.goto(BASE + '/');
  await page.waitForTimeout(45000);
  const pre = page.locator('[data-preloader]');
  const sw = {
    preloaderPresentAfter45s: (await pre.count()) > 0,
    preloaderVisibleAfter45s: await pre.first().isVisible().catch(() => false),
    preloaderCounterText: (await pre.count()) ? (await pre.first().textContent())?.replace(/\s+/g, ' ').trim().slice(0, 200) : null,
  };
  await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop, SwiftShader (no GPU) — 45 s after navigation' });
  sw.rafFramesIn5s = await page.evaluate(() => new Promise(res => {
    let c = 0; const t0 = performance.now();
    const f = () => { c++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else res(c); };
    requestAnimationFrame(f);
  }));
  sw.approxFps = sw.rafFramesIn5s / 5;
  sw.canvasCount = await page.locator('canvas').count();
  sw.glbResponseEnded = await page.evaluate(() => { const r = performance.getEntriesByType('resource').find(e => e.name.includes('aura-one.glb')); return r ? r.responseEnd > 0 : false; });
  save('swiftshader', sw);
  await ctx.close();
});

// ---------- Header nav anchors, clock, footer links (GPU, desktop) ----------
const anchors = { rows: [], footerLinks: [] };
const SECTION_IDS = ['finishes', 'sound', 'moments', 'specs', 'reviews', 'buy', 'contact'];
await run('Anchors & clock', GPU, async (b) => {
  const ctx = await newContext(b, 'desktop'); const page = await ctx.newPage(); watch(page, 'desktop');
  await page.goto(BASE + '/');
  await safe('anchors waitReady', () => waitReady(page));
  await dismissCookies(page);
  const toTop = () => page.evaluate(() => (window.lenis ? window.lenis.scrollTo(0, { immediate: true, force: true }) : window.scrollTo(0, 0)));

  // Live clock (group "Live clock") at page top.
  await toTop(); await page.waitForTimeout(1200);
  const clockEl = (await page.locator('header time').count()) ? page.locator('header time').first() : page.locator('time').first();
  const t1 = await clockEl.textContent().catch(e => 'error: ' + e.message.slice(0, 120));
  await page.waitForTimeout(3000);
  const t2 = await clockEl.textContent().catch(e => 'error: ' + e.message.slice(0, 120));
  misc.liveClock = { selector: (await page.locator('header time').count()) ? 'header time' : 'time (first)', first: t1, afterThreeSeconds: t2, changed: t1 !== t2 };
  saveMisc();
  group = 'Live clock';
  await shot(page, { id: id(), group, viewport: 'desktop', caption: 'desktop — header clock at page top (read twice, 3 s apart)' });
  group = 'Header & nav anchors';

  const navCases = [
    ['Nav: Finishes', page.locator('header nav a[href="#finishes"]'), '#finishes'],
    ['Nav: Sound', page.locator('header nav a[href="#sound"]'), '#sound'],
    ['Nav: Specs', page.locator('header nav a[href="#specs"]'), '#specs'],
    ['Nav: Reviews', page.locator('header nav a[href="#reviews"]'), '#reviews'],
    ['Header CTA: Pre-order', page.locator('header a[href="#buy"]'), '#buy'],
  ];
  for (const [label, loc, href] of navCases) {
    const row = { label, href };
    await toTop(); await page.waitForTimeout(1200);
    row.scrollYBefore = await page.evaluate(() => Math.round(window.scrollY));
    row.linkCount = await loc.count();
    if (!row.linkCount) { row.error = 'link not found'; anchors.rows.push(row); continue; }
    await safe('click ' + label, () => loc.first().click({ timeout: 5000 }));
    await page.waitForTimeout(2000);
    row.scrollYAfter = await page.evaluate(() => Math.round(window.scrollY));
    row.sectionTops = await page.evaluate((ids) => {
      const out = {};
      for (const id of ids) { const el = document.getElementById(id); if (el) out[id] = Math.round(el.getBoundingClientRect().top); }
      return out;
    }, SECTION_IDS);
    const nearest = Object.entries(row.sectionTops).sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0];
    row.nearestSectionToViewportTop = nearest ? { id: nearest[0], top: nearest[1] } : null;
    row.targetTop = row.sectionTops[href.slice(1)] ?? null;
    anchors.rows.push(row);
  }

  anchors.footerLinks = await page.evaluate(() => [...document.querySelectorAll('footer a')].map(a => ({
    text: a.innerText.trim().slice(0, 80), href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'),
  })));
  anchors.backToTop = anchors.footerLinks.find(l => /back to the top/i.test(l.text)) ?? null;
  anchors.modelCreditLinks = anchors.footerLinks.filter(l => /sketchfab|creativecommons/i.test(l.href || ''));
  save('anchors', anchors);
  await ctx.close();
});

// Extras console events
save('console-extras', events);
save('extras-failures', failures);
console.log('LAST_ID', n, 'failures', failures.length);
