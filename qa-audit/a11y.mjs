// Accessibility audit: axe, keyboard, reduced motion, touch, and two focus screenshots.
// Usage (from qa-audit/): node a11y.mjs [section ...]   (no args = all sections, one browser)
// Writes data/a11y.json (keys: axe, keyboard, reducedMotion, touch) and appends shots to data/shots.json.
import fs from 'fs';
import AxeBuilder from '@axe-core/playwright';
import { launch, newContext, waitReady, dismissCookies, scrollToSel, shot, BASE } from './lib.mjs';

const GPU_ARGS = ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'];
const OUT = 'data/a11y.json';
const ONLY = process.argv.slice(2);
const want = (k) => ONLY.length === 0 || ONLY.includes(k);
const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const sleep = (page, ms) => page.waitForTimeout(ms);

// ---------- 1. axe ----------
function summarizeAxe(r) {
  const v = r.violations.map((x) => ({
    id: x.id,
    impact: x.impact ?? null,
    help: x.help,
    nodes: x.nodes.length,
    targets: x.nodes.slice(0, 5).map((n) => (n.target || []).join(' ')),
    html: (x.nodes[0]?.html || '').slice(0, 200),
  }));
  return { violations: v, passes: r.passes.length, incomplete: r.incomplete.length };
}
async function scrollThrough(page, steps = 12) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((y) => (window.lenis ? window.lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), Math.round((h * i) / steps));
    await sleep(page, 400);
  }
}
async function scrollTop(page) {
  await page.evaluate(() => (window.lenis ? window.lenis.scrollTo(0, { immediate: true, force: true }) : window.scrollTo(0, 0)));
}
async function axeRun(browser, { vp, path, dismiss = true, scroll = false, model = true }) {
  const ctx = await newContext(browser, vp);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));
  const resp = await page.goto(BASE + path, { waitUntil: 'load' });
  await waitReady(page, { model });
  const cookieBannerVisible = await page.getByRole('button', { name: 'Reject all' }).isVisible().catch(() => false);
  if (dismiss) await dismissCookies(page);
  if (scroll) {
    await scrollThrough(page, 12);
    await sleep(page, 3000);
    await scrollTop(page);
    await sleep(page, 2000);
  }
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const out = { path, viewport: vp, status: resp?.status() ?? null, cookieBannerVisibleBeforeDismiss: cookieBannerVisible, ...summarizeAxe(r), pageErrors };
  await ctx.close();
  return out;
}
async function runAxe(browser) {
  const axe = {};
  axe.homeDesktop = await axeRun(browser, { vp: 'desktop', path: '/', scroll: true });
  console.log('axe homeDesktop', axe.homeDesktop.violations.length, 'violations');
  axe.homeMobile = await axeRun(browser, { vp: 'mobile', path: '/', scroll: true });
  console.log('axe homeMobile', axe.homeMobile.violations.length, 'violations');
  axe.homeCookieOpen = await axeRun(browser, { vp: 'desktop', path: '/', dismiss: false, scroll: false });
  console.log('axe homeCookieOpen', axe.homeCookieOpen.violations.length, 'violations');
  axe.privacyPolicy = await axeRun(browser, { vp: 'desktop', path: '/privacy-policy', scroll: false, model: false });
  console.log('axe privacyPolicy', axe.privacyPolicy.violations.length, 'violations');
  axe.notFound = await axeRun(browser, { vp: 'desktop', path: '/this-page-does-not-exist', scroll: false, model: false });
  console.log('axe notFound', axe.notFound.violations.length, 'violations');
  result.axe = axe;
  save();
}

// ---------- 2. keyboard ----------
// Runs in the page: describe document.activeElement.
const DESCRIBE = () => {
  const el = document.activeElement;
  const path = (node) => {
    const parts = [];
    for (let n = node; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      const idx = Array.from(n.parentElement?.children || []).filter((c) => c.tagName === n.tagName).indexOf(n);
      parts.unshift(n.tagName.toLowerCase() + (idx > 0 ? `:${idx}` : ''));
    }
    return parts.join('>');
  };
  if (!el || el === document.body) return { tag: 'BODY', path: 'body', text: '', href: null, visible: false, coveredByHeader: false, outlineStyle: null, outlineWidth: null, outlineColor: null, boxShadow: null, hasIndicator: false, hiddenVisually: false, inAriaHidden: false, scrollY: window.scrollY };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const header = document.querySelector('header');
  const hr = header ? header.getBoundingClientRect() : null;
  const visible = r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
  const hiddenVisually = r.width <= 1 || r.height <= 1 || cs.visibility === 'hidden' || cs.opacity === '0' || cs.clipPath === 'inset(50%)' || cs.clip === 'rect(0px, 0px, 0px, 0px)';
  const transparent = (c) => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);
  const outlineVisible = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !transparent(cs.outlineColor);
  const shadowVisible = cs.boxShadow && cs.boxShadow !== 'none';
  return {
    tag: el.tagName,
    path: path(el),
    text: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('alt') || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    href: el.getAttribute('href'),
    visible,
    rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) },
    coveredByHeader: !!(hr && r.top < hr.bottom && !header.contains(el)),
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    outlineColor: cs.outlineColor,
    boxShadow: cs.boxShadow,
    hasIndicator: !!(outlineVisible || shadowVisible),
    hiddenVisually,
    inAriaHidden: !!el.closest('[aria-hidden="true"]'),
    scrollY: Math.round(window.scrollY),
  };
};
async function runKeyboard(browser) {
  const ctx = await newContext(browser, 'desktop');
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitReady(page);
  await dismissCookies(page);
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  await sleep(page, 500);
  const steps = [];
  let firstPath = null;
  let closedAt = null;
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    await sleep(page, 150);
    const d = await page.evaluate(DESCRIBE);
    steps.push({ n: i + 1, ...d });
    if (i === 0) firstPath = d.path;
    else if (d.path === firstPath) { closedAt = i + 1; steps.pop(); break; }
  }
  const stops = steps;
  const first = stops[0] || {};
  const hidden = stops.filter((s) => s.hiddenVisually).map((s) => ({ n: s.n, tag: s.tag, text: s.text }));
  const ariaHidden = stops.filter((s) => s.inAriaHidden).map((s) => ({ n: s.n, tag: s.tag, text: s.text }));
  const noIndicator = stops.filter((s) => !s.hasIndicator).map((s) => ({ n: s.n, tag: s.tag, text: s.text, path: s.path }));
  const structure = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')).map((c) => ({
      parent: c.parentElement?.tagName.toLowerCase(),
      inAriaHidden: !!c.closest('[aria-hidden="true"]'),
      section: c.closest('section')?.id || c.closest('section')?.getAttribute('aria-label') || null,
    }));
    const story = document.querySelector('main > section');
    return {
      canvases,
      storySection: story ? { id: story.id || null, ariaLabel: story.getAttribute('aria-label'), ariaLabelledby: story.getAttribute('aria-labelledby'), role: story.getAttribute('role') } : null,
    };
  });
  result.keyboard = {
    tabStops: stops.length,
    closedCycle: closedAt !== null,
    firstFocus: { tag: first.tag, text: first.text, href: first.href, path: first.path },
    skipLinkExists: /skip/i.test(first.text || ""),
    focusedWhileVisuallyHidden: hidden,
    focusedInsideAriaHidden: ariaHidden,
    noVisibleIndicatorCount: noIndicator.length,
    noVisibleIndicator: noIndicator,
    focusedOutOfViewportCount: stops.filter((s) => !s.visible).length,
    coveredByHeaderCount: stops.filter((s) => s.coveredByHeader).length,
    ...structure,
    steps: stops,
  };
  console.log('keyboard stops', stops.length, 'closedCycle', closedAt !== null, 'noIndicator', noIndicator.length);
  await ctx.close();
  save();
}

// ---------- 3. reduced motion ----------
async function runReducedMotion(browser) {
  const ctx = await newContext(browser, 'desktop', { reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitReady(page);
  await dismissCookies(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(page, 1000);
  const media = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const storyCanvas = page.locator('main > section canvas').first();
  const finCanvas = page.locator('#finishes canvas').first();
  const canvasCount = { story: await storyCanvas.count(), finishes: await finCanvas.count() };
  const cmp = async (loc) => {
    if (!(await loc.count())) return { present: false };
    const a = await loc.screenshot({ animations: 'allow' });
    await sleep(page, 2000);
    const b = await loc.screenshot({ animations: 'allow' });
    return { present: true, bytesA: a.length, bytesB: b.length, identical: Buffer.compare(a, b) === 0 };
  };
  const story = await cmp(storyCanvas);
  const finishes = await cmp(finCanvas);
  const marqueeSnap = () => page.evaluate(() => Array.from(document.querySelectorAll('ul')).filter((ul) => ul.closest('[class*="marquee" i]') || getComputedStyle(ul).animationName !== 'none' || getComputedStyle(ul).transform !== 'none' || ul.style.transform).map((ul, i) => ({
    i, cls: (ul.className && String(ul.className).slice(0, 80)) || null, transform: getComputedStyle(ul).transform, animationName: getComputedStyle(ul).animationName, animationPlayState: getComputedStyle(ul).animationPlayState,
  })));
  const m1 = await marqueeSnap();
  await sleep(page, 2000);
  const m2 = await marqueeSnap();
  const marquees = m1.map((a, i) => ({ ...a, transformAfter2s: m2[i]?.transform, moved: m2[i] ? m2[i].transform !== a.transform : null }));
  result.reducedMotion = { reducedMotionMatches: media, canvasCount, storyCanvas: story, finishesCanvas: finishes, marqueeCount: marquees.length, marqueesMoved: marquees.filter((m) => m.moved).length, marquees };
  console.log('reducedMotion story identical', story.identical, 'finishes identical', finishes.identical, 'marquees moved', result.reducedMotion.marqueesMoved, '/', marquees.length);
  await ctx.close();
  save();
}

// ---------- 4. touch ----------
async function runTouch(browser) {
  const ctx = await newContext(browser, 'mobile');
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitReady(page);
  await dismissCookies(page);
  const cdp = await ctx.newCDPSession(page);
  const swipe = async (x0, y0, x1, y1) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 10, y: y0 + ((y1 - y0) * i) / 10 }] });
      await sleep(page, 16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
  const pageTop = { before: await scrollY() };
  await swipe(195, 600, 195, 200);
  await sleep(page, 1500);
  pageTop.after = await scrollY();
  pageTop.delta = pageTop.after - pageTop.before;

  await scrollToSel(page, '#finishes', 0, 1500);
  // Start the vertical swipe on the canvas: choose a point inside it and inside the viewport.
  const canvasPoint = () => page.evaluate(() => {
    const c = document.querySelector('#finishes canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(Math.max(r.top + 10, Math.min(r.bottom - 10, 650)));
    const hit = document.elementFromPoint(x, y);
    return { x, y, canvasRect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }, hitTag: hit?.tagName, hitIsCanvas: hit === c };
  });
  const cp = await canvasPoint();
  const finishesVertical = { point: cp, before: await scrollY() };
  if (cp) {
    await swipe(cp.x, cp.y, cp.x, cp.y - 400);
    await sleep(page, 1500);
  }
  finishesVertical.after = await scrollY();
  finishesVertical.delta = finishesVertical.after - finishesVertical.before;

  const cp2 = await canvasPoint();
  const finishesHorizontal = { point: cp2, before: await scrollY() };
  if (cp2) {
    await swipe(100, cp2.y, 300, cp2.y);
    await sleep(page, 1500);
  }
  finishesHorizontal.after = await scrollY();
  finishesHorizontal.delta = finishesHorizontal.after - finishesHorizontal.before;

  const styles = await page.evaluate(() => {
    let safeArea = 0; const sheetErrors = [];
    for (const sh of Array.from(document.styleSheets)) {
      try { for (const rule of Array.from(sh.cssRules)) if ((rule.cssText || '').includes('env(safe-area-inset')) safeArea++; }
      catch (e) { sheetErrors.push(String(sh.href || 'inline')); }
    }
    const inlineSafe = Array.from(document.querySelectorAll('[style]')).filter((e) => (e.getAttribute('style') || '').includes('env(safe-area-inset')).length;
    return {
      htmlPaddingTop: getComputedStyle(document.documentElement).paddingTop,
      rulesWithSafeAreaEnv: safeArea,
      inlineStyleSafeArea: inlineSafe,
      unreadableSheets: sheetErrors,
      viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || null,
    };
  });
  result.touch = {
    pageTopSwipe: pageTop,
    finishesVerticalSwipe: finishesVertical,
    finishesHorizontalSwipe: finishesHorizontal,
    htmlPaddingTop: styles.htmlPaddingTop,
    envSafeAreaRules: styles.rulesWithSafeAreaEnv,
    envSafeAreaInlineStyles: styles.inlineStyleSafeArea,
    unreadableSheets: styles.unreadableSheets,
    viewportMeta: styles.viewportMeta,
    viewportFitCover: /viewport-fit\s*=\s*cover/.test(styles.viewportMeta || ''),
  };
  console.log('touch pageTop delta', pageTop.delta, 'finishes vertical delta', finishesVertical.delta, 'horizontal delta', finishesHorizontal.delta);
  await ctx.close();
  save();
}

// ---------- 5. focus screenshots ----------
async function runShots(browser) {
  const ctx = await newContext(browser, 'desktop');
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitReady(page);
  await dismissCookies(page);
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  await sleep(page, 800);
  // Header CTA = last link inside the fixed <header>.
  const ctaIndex = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('header a[href]'));
    return links.length ? links.length - 1 : -1;
  });
  const cta = page.locator('header a[href]').nth(ctaIndex);
  // Tab until the CTA has focus (keyboard-driven focus, so :focus-visible applies).
  let tabs = 0;
  for (; tabs < 40; tabs++) {
    const isCta = await page.evaluate((i) => document.activeElement === document.querySelectorAll('header a[href]')[i], ctaIndex);
    if (isCta) break;
    await page.keyboard.press('Tab');
    await sleep(page, 100);
  }
  await sleep(page, 400);
  const ctaBox = await cta.boundingBox();
  const pad = 24;
  const clipShot = (box) => ({
    screenshot: (o) => page.screenshot({ ...o, clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 } }),
  });
  const ctaFocused = await cta.evaluate((el) => document.activeElement === el);
  const ctaStyle = await cta.evaluate((el) => { const cs = getComputedStyle(el); return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, outlineOffset: cs.outlineOffset }; });
  console.log('cta focused', ctaFocused, 'tabs', tabs, 'box', ctaBox, ctaStyle);
  const ids = (() => { try { return JSON.parse(fs.readFileSync('data/shots.json', 'utf8')).map((m) => +m.id.slice(1)); } catch { return [0]; } })();
  const nextId = (n) => `S${String(n).padStart(3, '0')}`;
  // Next ID after the last S-number in the manifest. S149.webp exists on disk but is not in the manifest, so it is skipped to avoid overwriting it.
  const reserved = Math.max(...ids, 149);
  const ctaId = nextId(reserved + 1);
  if (ctaBox) await shot(clipShot(ctaBox), { id: ctaId, group: 'Accessibility', viewport: 'desktop', caption: `desktop — keyboard focus on header CTA (outline 2px accent, offset 4px); computed outline-style ${ctaStyle.outlineStyle}, width ${ctaStyle.outlineWidth}` });

  // Moments ring button: first focusable in #moments, focused via keyboard after scrolling there.
  await page.evaluate(() => { const s = document.querySelector('#moments'); const y = s.getBoundingClientRect().top + window.scrollY; window.lenis ? window.lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y); });
  await sleep(page, 1200);
  const momentIndex = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('#moments button, #moments a[href]'));
    return els.length ? 0 : -1;
  });
  const momentBtn = page.locator('#moments button, #moments a[href]').nth(momentIndex);
  const momentText = momentIndex >= 0 ? (await momentBtn.innerText().catch(() => '')).trim().slice(0, 60) : null;
  if (momentIndex >= 0) {
    await momentBtn.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await sleep(page, 400);
  }
  const momentBox = momentIndex >= 0 ? await momentBtn.boundingBox() : null;
  const momentFocused = momentIndex >= 0 ? await momentBtn.evaluate((el) => document.activeElement === el) : false;
  const momentStyle = momentIndex >= 0 ? await momentBtn.evaluate((el) => { const cs = getComputedStyle(el); return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, boxShadow: cs.boxShadow }; }) : null;
  console.log('moment focused', momentFocused, momentText, momentBox, momentStyle);
  const momentId = nextId(reserved + 2);
  if (momentBox) await shot(clipShot(momentBox), { id: momentId, group: 'Accessibility', viewport: 'desktop', caption: `desktop — moments ring button focus state ("${momentText}"); outline ${momentStyle.outlineStyle} ${momentStyle.outlineWidth}, shadow ${momentStyle.boxShadow}` });
  result.focusShots = { ctaId, ctaFocused, ctaTabs: tabs, ctaStyle, momentId: momentBox ? momentId : null, momentText, momentFocused, momentStyle };
  await ctx.close();
  save();
}

const browser = await launch(GPU_ARGS);
try {
  if (want('axe')) await runAxe(browser);
  if (want('keyboard')) await runKeyboard(browser);
  if (want('reducedMotion')) await runReducedMotion(browser);
  if (want('touch')) await runTouch(browser);
  if (want('shots')) await runShots(browser);
} finally {
  await browser.close();
}
console.log('done');
