// Renders qa-audit/report.html: one self-contained file (inline CSS/JS, images as base64 webp).
// Run from qa-audit/:  node build-report.mjs
// Inputs: report-content.mjs (authored), data/shots.json, data/mockups.json, optional data/*.json measurements.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { meta, scorecard, findings, claims, inventory, proposals, roadmap, commands, topFive } from './report-content.mjs';

// Things that could not be measured. Fill in by hand; rendered as a list in the appendix.
const NOT_MEASURED = [
  'SwiftShader captures: the requested --use-angle=swiftshader mode rendered this page at 0.3 fps (preloader counter at 006 after ~10 s; a screenshot after 45 s timed out at 30 s). All captures and FPS numbers therefore use the real Intel UHD 620 GPU via ANGLE/OpenGL in headless Chromium — headless compositing may cost a little more than a headed browser.',
  'Real phones and Safari/iOS: no physical device or WebKit run. Mobile numbers are Chromium with a 390×844 viewport, DPR 2 and an iPhone UA on a laptop GPU.',
  'PageSpeed Insights: not run (needs the site on a public URL). Its UA is believed to contain "Chrome-Lighthouse", which src/utils/bot-ua.ts would route to the robot view — not verified here.',
  'Local Lighthouse 12 CLI runs used emulated UAs without "Lighthouse" in them, so all four runs audited the real WebGL page (identical 1,197,663 B weight) — the "default" vs "human" UA split did not change what was served.',
  'GPU memory per WebGL context: no reliable browser API; inferred from texture counts only.',
  'Native form-validation bubble text and OS-level screen-reader output (NVDA/VoiceOver) were not captured.',
  'Model licence on Sketchfab and whether the removed "maker\'s mark" belongs to a real brand: no network check performed; credit data taken from the GLB asset.extras.',
  'Trademark availability of "Aura" in the audio category: not searched.',
  'Production hosting headers (Vercel/other CDN): only `next start` locally was tested.',
  'Reduced motion, story canvas: two canvas screenshots 2 s apart differed slightly (321,309 vs 321,365 B) with float/tilt off — cause (damping settle, bloom noise or encoder) not isolated.',
  'Touch: vertical swipes scroll the page (385 px) including on the turntable; horizontal swipe on it does not scroll (data/a11y.json). Momentum, pinch-zoom and iOS rubber-banding were not tested. No viewport-fit=cover is set, so iOS keeps its default safe-area insets — no notch overlap expected, not verified on a device.',
];

const HERE = dirname(fileURLToPath(import.meta.url));
const at = (rel) => join(HERE, rel);

async function readJson(rel) {
  try {
    return JSON.parse(await readFile(at(rel), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw new Error(`${rel}: ${e.message}`);
  }
}

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const vpGroup = (v) => (v.startsWith('tablet') ? 'tablet' : v);
const SEVS = ['P0', 'P1', 'P2', 'P3'];
const SEV_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
const EFF_RANK = { S: 0, M: 1, L: 2 };
const SEV_TEXT = { P0: 'Broken / legal', P1: 'Major', P2: 'Minor', P3: 'Polish' };
const pill = (label, cls) => `<span class="pill ${cls}">${esc(label)}</span>`;
const statusClass = (s) => {
  if (/^(Contradicted|Inaccurate|Fabricated)/.test(s)) return 'st-red';
  if (/^Partly/.test(s)) return 'st-amber';
  if (/^(Consistent|Shown)/.test(s)) return 'st-green';
  return 'st-grey'; // Not shown and anything unrecognised
};

// ---------- images (embedded once, hydrated by the client script) ----------
const shots = (await readJson('data/shots.json')) ?? [];
const mockups = (await readJson('data/mockups.json')) ?? [];
const SHOT_IDS = new Set(shots.map((s) => s.id));
const MOCK_IDS = new Set(mockups.map((m) => m.id));
const IMG = {};
const META = {};
const warnings = [];

async function embed(id, file) {
  try {
    IMG[id] = 'data:image/webp;base64,' + (await readFile(at(file))).toString('base64');
  } catch {
    warnings.push(`missing image ${file}`);
  }
}
for (const s of shots) {
  await embed(s.id, s.file);
  META[s.id] = { label: `${s.id} · ${s.caption}`, group: s.group, vpg: vpGroup(s.viewport) };
}
for (const m of mockups) {
  await embed(m.id, m.file);
  META[m.id] = { label: `MOCKUP, not implemented · ${m.id} · ${m.title}: ${m.caption}`, group: 'Mockups', vpg: '' };
}

// ---------- measurements (all optional) ----------
const MEASURE = [
  { file: 'lighthouse-summary', label: 'Lighthouse' },
  { file: 'fps', label: 'Frame rate (FPS)' },
  { file: 'drawcalls', label: 'Draw calls' },
  { file: 'load', label: 'Load timeline' },
  { file: 'contextloss', label: 'WebGL context loss' },
  { file: 'unmount', label: 'Unmount / disposal' },
  { file: 'a11y', label: 'Accessibility (axe, keyboard, touch)' },
  { file: 'assets', label: 'Asset sizes' },
  { file: 'glb', label: '3D model (GLB)' },
  { file: 'npm-audit-summary', label: 'npm audit' },
  { file: 'contrast', label: 'Colour contrast' },
  { file: 'security-headers', label: 'Security headers' },
];
const M = {};
for (const m of MEASURE) M[m.file] = await readJson(`data/${m.file}.json`);

// ---------- text formatting ----------
const FINDING_IDS = new Set(findings.map((f) => f.id));
const PROPOSAL_IDS = new Set(proposals.map((p) => p.id));

// Plain inline text: backtick code spans only.
function txtPlain(raw) {
  return String(raw ?? '')
    .split(/(`[^`]+`)/)
    .map((part, i) => (i % 2 ? `<code>${esc(part.slice(1, -1))}</code>` : esc(part)))
    .join('');
}

// Full inline text: code spans, S### screenshot links, F##/P# finding and proposal links.
function txt(raw) {
  return String(raw ?? '')
    .split(/(`[^`]+`)/)
    .map((part, i) => {
      if (i % 2) return `<code>${esc(part.slice(1, -1))}</code>`;
      return esc(part).replace(/\b(S\d{3}|F\d{2}|P\d{1,2})\b/g, (id) => {
        if (SHOT_IDS.has(id)) return `<a href="#shot-${id}" class="idlink" data-open="${id}" data-set="${id}">${id}</a>`;
        if (FINDING_IDS.has(id) || PROPOSAL_IDS.has(id)) return `<a href="#${id}" class="idlink">${id}</a>`;
        return id;
      });
    })
    .join('');
}

const thumbBtn = (id, cls, extra = '') =>
  `<button type="button" class="${cls}" data-open="${id}" ${extra} aria-label="Open ${id} full size"><img data-img="${id}" alt="" loading="lazy"></button>`;

// ---------- generic renderer for measurement JSON ----------
function cell(v, depth) {
  if (v === null || v === undefined) return '<span class="muted">n/a</span>';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v !== 'object') return esc(v);
  if (depth > 3) return `<code>${esc(JSON.stringify(v).slice(0, 300))}</code>`;
  if (Array.isArray(v)) {
    if (!v.length) return '<span class="muted">empty</span>';
    if (v.every((x) => x === null || typeof x !== 'object')) return v.map((x) => esc(x ?? 'n/a')).join(', ');
    if (v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) return objTable(v, depth + 1);
    return `<ul>${v.map((x) => `<li>${cell(x, depth + 1)}</li>`).join('')}</ul>`;
  }
  return kvTable(v, depth + 1);
}
function kvTable(o, depth) {
  return `<table class="kv"><tbody>${Object.keys(o)
    .map((k) => `<tr><th scope="row">${esc(k)}</th><td>${cell(o[k], depth)}</td></tr>`)
    .join('')}</tbody></table>`;
}
function objTable(arr, depth) {
  const keys = [...new Set(arr.flatMap((r) => Object.keys(r)))];
  return `<div class="tablewrap"><table><thead><tr>${keys.map((k) => `<th scope="col">${esc(k)}</th>`).join('')}</tr></thead><tbody>${arr
    .map((r) => `<tr>${keys.map((k) => `<td>${cell(r[k], depth)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}
const generic = (v) => `<div class="tablewrap">${Array.isArray(v) && v.every((x) => x && typeof x === 'object') ? objTable(v, 1) : kvTable(v ?? {}, 1)}</div>`;

// ---------- SVG charts (hand-rolled, no libraries) ----------
// groups: [{label, bars:[{name, value, text, cls}]}]; value in chart units, max = top of axis.
function barChart({ aria, groups, max, unit = '' }) {
  const W = 640, H = 280, padL = 48, padR = 12, padT = 24, padB = 56;
  const pw = W - padL - padR, ph = H - padT - padB;
  const gw = pw / Math.max(1, groups.length);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}"><title>${esc(aria)}</title>`;
  for (let t = 0; t <= max; t += max / 4) {
    const y = padT + ph - (t / max) * ph;
    s += `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="grid"/><text x="${padL - 6}" y="${y + 4}" text-anchor="end" class="svgt">${Math.round(t)}${unit}</text>`;
  }
  groups.forEach((g, gi) => {
    const n = Math.max(1, g.bars.length);
    const bw = Math.min(44, (gw * 0.7) / n);
    const x0 = padL + gi * gw + (gw - bw * n) / 2;
    g.bars.forEach((b, bi) => {
      const x = x0 + bi * bw;
      if (b.value == null) {
        s += `<text x="${x + bw / 2}" y="${padT + ph - 6}" text-anchor="middle" class="svgt muted-svg">n/a</text>`;
        return;
      }
      const h = Math.max(0, (b.value / max) * ph);
      const y = padT + ph - h;
      const text = b.text ?? String(b.value);
      s += `<rect class="${b.cls}" x="${x + 2}" y="${y}" width="${bw - 4}" height="${h}" rx="3"><title>${esc(g.label)}, ${esc(b.name)}: ${esc(text)}</title></rect>`;
      s += `<text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" class="svgt">${esc(text)}</text>`;
    });
    const short = g.label.length > 18 ? g.label.slice(0, 17) + '…' : g.label;
    s += `<text x="${padL + gi * gw + gw / 2}" y="${H - padB + 18}" text-anchor="middle" class="svgt">${esc(short)}</text>`;
  });
  return s + '</svg>';
}
const legend = (names) =>
  `<ul class="legend">${names.map((n, i) => `<li><span class="swatch c${i % 4}"></span>${esc(n)}</li>`).join('')}</ul>`;

// ---------- sections ----------
function renderMasthead() {
  return `<header class="masthead" id="top">
  <p class="eyebrow">QA audit · product review</p>
  <h1>${esc(meta.title)}</h1>
  <p class="meta"><time>${esc(meta.date)}</time> · ${txtPlain(meta.target)}</p>
  <p class="method"><strong>Method.</strong> ${txt(meta.method)}</p>
  <p class="disclaimer" role="note">All numbers measured on this machine (Intel UHD 620, Chromium 151). 'Not measured' means exactly that.</p>
</header>`;
}

function renderSummary() {
  const counts = SEVS.map((sev) => ({ sev, n: findings.filter((f) => f.sev === sev).length }));
  const top5 = topFive.map((id) => findings.find((f) => f.id === id)).filter(Boolean);
  const cards = scorecard
    .map(
      (s) => `<article class="card score">
  <h3>${esc(s.cat)}</h3>
  <p class="scoreval">${s.score == null ? '<span class="muted">see §5</span>' : `<strong>${s.score}</strong><span class="muted"> / 10</span>`}</p>
  ${s.score == null ? '' : `<div class="meter" aria-hidden="true"><span style="width:${s.score * 10}%"></span></div>`}
  <p class="note">${txt(s.note)}</p>
</article>`,
    )
    .join('');
  const tiles = counts
    .map(
      ({ sev, n }) => `<div class="tile"><span class="pill sev-${sev}">${sev}</span><strong>${n}</strong><span class="muted">${SEV_TEXT[sev]}</span></div>`,
    )
    .join('');
  const top = top5
    .map((f) => `<li><a href="#${f.id}" class="idlink">${f.id}</a> ${pill(f.sev, 'sev-' + f.sev)} ${txtPlain(f.title)}</li>`)
    .join('');
  return `<section id="summary" class="block">
  <h2><span class="num">§1</span> Executive summary</h2>
  <div class="scorecard">${cards}</div>
  <h3>Findings by severity <span class="muted">(${findings.length} total)</span></h3>
  <div class="tiles">${tiles}</div>
  <h3>Top 5 to fix first</h3>
  <p class="muted">The first five P0/P1 findings in table order. Each links to its row in §4.</p>
  <ol class="top5">${top}</ol>
</section>`;
}

function renderFeatures() {
  const groups = new Map();
  for (const s of shots) {
    if (!groups.has(s.group)) groups.set(s.group, []);
    groups.get(s.group).push(s);
  }
  const body = [...groups.entries()]
    .map(([name, list], gi) => {
      const figs = list
        .map(
          (s) => `<figure class="thumb" id="shot-${s.id}" data-vpg="${esc(vpGroup(s.viewport))}">
  ${thumbBtn(s.id, 'thumb-btn')}
  <figcaption><span class="sid">${s.id}</span> <span class="vp">${esc(s.viewport)}</span> ${esc(s.caption)}</figcaption>
</figure>`,
        )
        .join('');
      return `<section class="group" aria-labelledby="g-${gi}"><h3 id="g-${gi}">${esc(name)} <span class="muted">${list.length}</span></h3><div class="thumbs">${figs}</div></section>`;
    })
    .join('');
  return `<section id="features" class="block">
  <h2><span class="num">§3</span> Existing features</h2>
  <p class="muted">Screenshots of the production build. Click any thumbnail for full size (arrow keys, Esc).</p>
  <div class="tabs" role="group" aria-label="Viewport filter">
    <button type="button" class="tab" data-vp-tab="all" aria-pressed="true">All</button>
    <button type="button" class="tab" data-vp-tab="desktop" aria-pressed="false">Desktop</button>
    <button type="button" class="tab" data-vp-tab="tablet" aria-pressed="false">Tablet</button>
    <button type="button" class="tab" data-vp-tab="mobile" aria-pressed="false">Mobile</button>
    <span id="gallery-count" class="muted" aria-live="polite"></span>
  </div>
  ${body}
</section>`;
}

function findingBlock(f) {
  const shotIds = (f.shots || []).filter((id) => SHOT_IDS.has(id));
  const thumbs = shotIds.length
    ? `<div class="thumbs-sm">${shotIds
        .map((id) => `<figure>${thumbBtn(id, 'thumb-btn', `data-set="${shotIds.join(',')}"`)}<figcaption>${id}</figcaption></figure>`)
        .join('')}</div>`
    : '';
  return `<tbody class="finding" id="${f.id}" data-id="${f.id}" data-sev="${f.sev}" data-cat="${esc(f.cat)}" data-eff="${f.effort}">
  <tr class="frow">
    <th scope="row" class="fid"><a href="#${f.id}" class="idlink">${f.id}</a></th>
    <td>${pill(f.sev, 'sev-' + f.sev)}</td>
    <td>${esc(f.cat)}</td>
    <td><button type="button" class="linkbtn" data-toggle="d-${f.id}" aria-expanded="false" aria-controls="d-${f.id}">${txtPlain(f.title)}</button></td>
    <td>${esc(f.effort)}</td>
    <td class="evidence">${txt(f.evidence)}</td>
  </tr>
  <tr class="detail" id="d-${f.id}" hidden>
    <td colspan="6">
      <div class="detail-grid">
        <div><h4>Why it matters</h4><p>${txt(f.why)}</p></div>
        <div><h4>Fix</h4><p>${txt(f.fix)}</p></div>
      </div>
      ${thumbs}
    </td>
  </tr>
</tbody>`;
}

function renderFindings() {
  const cats = [...new Set(findings.map((f) => f.cat))].sort();
  const catOpts = cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const sevBoxes = SEVS.map(
    (s) => `<label class="check"><input type="checkbox" data-f-sev value="${s}" checked> ${s}</label>`,
  ).join('');
  const sortBtn = (key, label) =>
    `<th scope="col" aria-sort="none"><button type="button" class="sortbtn" data-sort="${key}">${label}</button></th>`;
  return `<section id="findings" class="block">
  <h2><span class="num">§4</span> Findings</h2>
  <p class="muted">Click a title to expand why and fix. Click ID, Severity, Category or Effort headers to sort.</p>
  <div class="controls" id="f-controls">
    <fieldset class="sevset"><legend>Severity</legend>${sevBoxes}</fieldset>
    <label>Category <select id="f-cat"><option value="">All categories</option>${catOpts}</select></label>
    <label>Effort <select id="f-eff"><option value="">All efforts</option><option value="S">S (&lt; 1 h)</option><option value="M">M (&lt; 1 day)</option><option value="L">L (&gt; 1 day)</option></select></label>
    <label class="grow">Search <input type="search" id="f-q" placeholder="Search text" autocomplete="off"></label>
    <button type="button" class="btn" id="f-reset">Reset filters</button>
    <span id="f-count" class="muted" aria-live="polite"></span>
  </div>
  <div class="tablewrap">
    <table class="findings" id="f-table">
      <thead><tr>${sortBtn('id', 'ID')}${sortBtn('sev', 'Severity')}${sortBtn('cat', 'Category')}<th scope="col">Title</th>${sortBtn('eff', 'Effort')}<th scope="col">Evidence</th></tr></thead>
      ${findings.map(findingBlock).join('')}
    </table>
  </div>
</section>`;
}

// Lighthouse: dedicated table. Expected shape (file may not exist yet):
//   { runs: [{ name, scores: {performance, accessibility, bestPractices, seo}  (0-1 or 0-100),
//              metrics: {fcp, lcp, tbt, cls, si (ms), totalBytes}, topRequests: [{url, bytes, type?}] }] }
function renderLighthouse(j) {
  if (!j) return notMeasured('lighthouse-summary.json');
  // perf.mjs writes { "<run>": { categories, fcpMs, lcpMs, … } } — adapt to the runs shape.
  const runs = Array.isArray(j) ? j : j.runs ?? Object.entries(j).filter(([, r]) => r && r.categories).map(([name, r]) => ({
    name,
    scores: { performance: r.categories.performance, accessibility: r.categories.accessibility, bestPractices: r.categories['best-practices'], seo: r.categories.seo },
    metrics: { fcp: r.fcpMs, lcp: r.lcpMs, tbt: r.tbtMs, cls: r.cls, si: r.speedIndexMs, totalBytes: r.totalByteWeight },
    topRequests: r.top5RequestsByTransferSize,
  }));
  if (!runs.length) return notMeasured('lighthouse-summary.json (no runs yet)');
  const num = (v) => (typeof v === 'number' ? (v <= 1 ? v * 100 : v) : null);
  const show = (v, unit = '') => (v == null || Number.isNaN(v) ? '<span class="muted">n/a</span>' : `${esc(Math.round(v * 10) / 10)}${unit}`);
  const kib = (v) => (typeof v === 'number' ? `${(v / 1024).toFixed(1)} KiB` : null);
  const rowsHtml = runs
    .map((r, i) => {
      const sc = r.scores || {};
      const m = r.metrics || {};
      const name = r.name ?? r.config?.name ?? r.label ?? `run ${i + 1}`;
      const reqs = (r.topRequests || r.requests || []).slice().sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0)).slice(0, 5);
      return `<tr><th scope="row">${esc(name)}</th>
        <td>${show(num(sc.performance))}</td><td>${show(num(sc.accessibility))}</td><td>${show(num(sc.bestPractices))}</td><td>${show(num(sc.seo))}</td>
        <td>${show(m.fcp, ' ms')}</td><td>${show(m.lcp, ' ms')}</td><td>${show(m.tbt, ' ms')}</td><td>${show(m.cls)}</td><td>${show(m.si, ' ms')}</td>
        <td>${kib(m.totalBytes) ?? '<span class="muted">n/a</span>'}</td></tr>
        <tr class="subrow"><td colspan="11"><details><summary>Top 5 requests (${esc(name)})</summary>
          ${reqs.length ? `<ol class="reqs">${reqs.map((q) => `<li><code>${esc(q.url)}</code> <span class="muted">${kib(q.bytes) ?? 'n/a'}${q.type ? ' · ' + esc(q.type) : ''}</span></li>`).join('')}</ol>` : '<p class="muted">No request list in this run.</p>'}
        </details></td></tr>`;
    })
    .join('');
  const chart = barChart({
    aria: 'Lighthouse performance score per run',
    max: 100,
    groups: runs.map((r, i) => ({
      label: r.name ?? r.config?.name ?? `run ${i + 1}`,
      bars: [{ name: 'Performance', value: num(r.scores?.performance), text: num(r.scores?.performance) == null ? null : String(Math.round(num(r.scores.performance))), cls: 'bar0' }],
    })),
  });
  return `<div class="tablewrap"><table class="lh"><thead><tr><th scope="col">Run</th><th scope="col">Perf</th><th scope="col">A11y</th><th scope="col">BP</th><th scope="col">SEO</th><th scope="col">FCP</th><th scope="col">LCP</th><th scope="col">TBT</th><th scope="col">CLS</th><th scope="col">SI</th><th scope="col">Total bytes</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
<figure class="chartbox">${chart}<figcaption>Lighthouse performance score per run (0-100).</figcaption></figure>`;
}

function renderFps(j) {
  if (!j) return notMeasured('fps.json');
  const runs = j.runs ?? [];
  const scenarios = [
    ['scroll', 'Scroll through story'],
    ['idle.storyTop', 'Idle, story top'],
    ['idle.progress0.70', 'Idle, progress 0.70'],
    ['idle.finishes', 'Idle, finishes'],
    ['idle.moments', 'Idle, moments'],
  ];
  const pick = (r, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), r);
  const groups = scenarios.map(([path, label]) => ({
    label,
    bars: runs.map((r, i) => {
      const v = pick(r, path)?.avgFps;
      return { name: r.config?.name ?? `run ${i + 1}`, value: typeof v === 'number' ? v : null, text: typeof v === 'number' ? v.toFixed(1) : null, cls: `bar${i % 4}` };
    }),
  }));
  const max = Math.max(60, ...groups.flatMap((g) => g.bars.map((b) => b.value ?? 0)));
  const note = j.note ? `<p class="note-box">${txt(j.note)}</p>` : '';
  return `${note}<figure class="chartbox">${barChart({ aria: 'Average FPS per scenario', max, unit: '', groups })}<figcaption>Average FPS per scenario (higher is better).</figcaption></figure>
${legend(runs.map((r) => r.config?.name ?? 'run'))}
${generic(j)}`;
}

function renderAssets(j) {
  if (!j) return notMeasured('assets.json');
  const pool = [...(j.publicFiles?.top10 ?? []).map((f) => ({ ...f, where: 'public/' })), ...(j.nextStaticJsCss?.top10 ?? []).map((f) => ({ ...f, where: '.next/static' }))];
  const top = pool.sort((a, b) => b.raw - a.raw).slice(0, 5);
  return `<p class="muted">Public files: ${j.publicFiles?.count ?? '?'} files, ${j.publicFiles?.totalRaw ?? '?'} B raw / ${j.publicFiles?.totalGzip ?? '?'} B gzip. Measured ${esc(j.measuredAt ?? '')}.</p>
<div class="tablewrap"><table><thead><tr><th scope="col">Five biggest assets</th><th scope="col">Raw bytes</th><th scope="col">Gzip bytes</th></tr></thead><tbody>
${top.map((f) => `<tr><td><code>${esc(f.file)}</code></td><td>${f.raw.toLocaleString('en-US')}</td><td>${f.gzip.toLocaleString('en-US')}</td></tr>`).join('')}
</tbody></table></div>`;
}

function renderGlb(j) {
  if (!j) return notMeasured('glb.json');
  const t = j.totals ?? {};
  const x = j.asset?.extras ?? {};
  return `<div class="tablewrap"><table class="kv"><tbody>
<tr><th scope="row">Triangles</th><td>${(t.tris ?? 0).toLocaleString('en-US')}</td></tr>
<tr><th scope="row">Vertices</th><td>${(t.verts ?? 0).toLocaleString('en-US')}</td></tr>
<tr><th scope="row">Meshes</th><td>${t.meshes ?? 'n/a'}</td></tr>
<tr><th scope="row">Textures</th><td>${t.textures ?? 'n/a'} (${(t.textureBytes ?? 0).toLocaleString('en-US')} B)</td></tr>
<tr><th scope="row">Title / author</th><td>${esc(x.title ?? '')} by ${esc(x.author ?? '')}</td></tr>
<tr><th scope="row">Licence</th><td>${esc(x.license ?? 'n/a')}</td></tr>
</tbody></table></div>`;
}

function notMeasured(file) {
  return `<p class="notmeasured">Not measured yet <span class="muted">(${esc(file)} missing)</span></p>`;
}

function renderPerformance() {
  const status = MEASURE.map((m) => {
    const j = M[m.file];
    const when = j?.measuredAt ?? j?.note ?? '';
    return `<tr><th scope="row">${esc(m.label)}</th><td><code>data/${m.file}.json</code></td><td>${j ? '<span class="pill st-green">Measured</span>' : '<span class="pill st-grey">Not measured yet</span>'}</td><td class="muted">${j?.measuredAt ? esc(j.measuredAt) : ''}</td></tr>`;
  }).join('');
  const section = (m, body) => `<section class="card measure" id="m-${m.file}"><h3>${esc(m.label)}</h3>${body}</section>`;
  const parts = {
    lighthouse: renderLighthouse(M['lighthouse-summary']),
    fps: renderFps(M.fps),
    assets: renderAssets(M.assets),
    glb: renderGlb(M.glb),
  };
  const generics = MEASURE.filter((m) => !['lighthouse-summary', 'fps', 'assets', 'glb'].includes(m.file))
    .map((m) => section(m, M[m.file] ? generic(M[m.file]) : notMeasured(`${m.file}.json`)))
    .join('');
  return `<section id="performance" class="block">
  <h2><span class="num">§5</span> Performance &amp; Lighthouse</h2>
  <p class="muted">Lab measurements from this machine. Lighthouse and FPS runs are compared on the same build. Anything without a file says "Not measured yet".</p>
  <div class="tablewrap"><table class="status"><thead><tr><th scope="col">Measurement</th><th scope="col">File</th><th scope="col">Status</th><th scope="col">Measured at</th></tr></thead><tbody>${status}</tbody></table></div>
  ${section({ file: 'lighthouse-summary', label: 'Lighthouse' }, parts.lighthouse)}
  ${section({ file: 'fps', label: 'Frame rate (FPS)' }, parts.fps)}
  ${section({ file: 'assets', label: 'Asset sizes' }, parts.assets)}
  ${section({ file: 'glb', label: '3D model (GLB)' }, parts.glb)}
  ${generics}
</section>`;
}

function renderClaims() {
  const rows = claims
    .map(
      ([claim, src, status, note]) => `<tr><td>${txtPlain(claim)}</td><td><code>${esc(src)}</code></td><td><span class="pill ${statusClass(status)}">${esc(status)}</span></td><td>${txt(note)}</td></tr>`,
    )
    .join('');
  return `<section id="claims" class="block">
  <h2><span class="num">§6</span> Content claims</h2>
  <p class="muted">Every claim in the page copy, checked against what is visibly shown.</p>
  <div class="tablewrap"><table class="claims"><thead><tr><th scope="col">Claim</th><th scope="col">Source</th><th scope="col">Status</th><th scope="col">Note</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>`;
}

function impactDots(n) {
  return `<span class="dots" role="img" aria-label="Impact ${n} of 5">${[1, 2, 3, 4, 5].map((i) => `<span class="dot${i <= n ? ' on' : ''}"></span>`).join('')}</span>`;
}

function renderScatter() {
  const cols = { S: 170, M: 380, L: 590 };
  const yFor = (imp) => 300 - ((imp - 1) / 4) * 240;
  const cells = {};
  for (const p of proposals) (cells[`${p.effort}-${p.impact}`] ??= []).push(p);
  let dots = '';
  for (const list of Object.values(cells)) {
    list.forEach((p, i) => {
      const dx = (i - (list.length - 1) / 2) * 52;
      const x = cols[p.effort] + dx;
      const y = yFor(p.impact);
      dots += `<a href="#${p.id}" class="sdot"><circle cx="${x}" cy="${y}" r="14"/><text x="${x}" y="${y + 4}" text-anchor="middle">${p.id}</text><title>${p.id} ${esc(p.title)} (impact ${p.impact}, effort ${p.effort})</title></a>`;
    });
  }
  const yTicks = [1, 2, 3, 4, 5].map((v) => `<line x1="70" x2="640" y1="${yFor(v)}" y2="${yFor(v)}" class="grid"/><text x="58" y="${yFor(v) + 4}" text-anchor="end" class="svgt">${v}</text>`).join('');
  return `<figure class="chartbox scatter">
  <svg viewBox="0 0 660 340" role="img" aria-labelledby="scatter-t scatter-d">
    <title id="scatter-t">Proposals: impact against effort</title>
    <desc id="scatter-d">Each proposal is placed by effort (S, M, L) on the x axis and impact (1 to 5) on the y axis. Dots link to the proposal card.</desc>
    ${yTicks}
    <line x1="70" x2="640" y1="300" y2="300" class="axis"/>
    <line x1="70" x2="70" y1="60" y2="300" class="axis"/>
    <text x="22" y="180" transform="rotate(-90 22 180)" text-anchor="middle" class="svgt">Impact (1-5)</text>
    <text x="${cols.S}" y="326" text-anchor="middle" class="svgt">Effort S (&lt; 1 h)</text>
    <text x="${cols.M}" y="326" text-anchor="middle" class="svgt">Effort M (&lt; 1 day)</text>
    <text x="${cols.L}" y="326" text-anchor="middle" class="svgt">Effort L (&gt; 1 day)</text>
    ${dots}
  </svg>
  <figcaption>Impact against effort. Dots link to the proposal card below.</figcaption>
</figure>`;
}

function renderProposals() {
  const order = [...proposals].sort((a, b) => b.impact - a.impact || EFF_RANK[a.effort] - EFF_RANK[b.effort]);
  const cards = order
    .map((p) => {
      const mocks = (p.mockups || []).filter((id) => MOCK_IDS.has(id));
      const mockHtml = mocks.length
        ? `<div class="mockgrid">${mocks
            .map((id) => {
              const m = mockups.find((x) => x.id === id);
              return `<figure class="mock"><div class="ribbon">MOCKUP, not implemented</div>
  <button type="button" class="mockbtn" data-open="${id}" data-set="${mocks.join(',')}" aria-label="Open mockup ${id} full size"><img data-img="${id}" alt="Mockup ${id}: ${esc(m.title)}" loading="lazy"></button>
  <figcaption><span class="sid">${id}</span> ${esc(m.title)}: ${esc(m.caption)}<br><code>${esc(m.prototype)}</code></figcaption></figure>`;
            })
            .join('')}</div>`
        : '<p class="muted">No mockup for this proposal.</p>';
      return `<article class="card proposal" id="${p.id}">
  <header class="prop-head"><span class="pid">${p.id}</span><h3>${txtPlain(p.title)}</h3></header>
  <p class="chips"><span class="chip">Impact ${impactDots(p.impact)}</span><span class="chip">Effort ${esc(p.effort)}</span></p>
  <dl class="prop-body">
    <dt>Problem</dt><dd>${txt(p.problem)}</dd>
    <dt>Value</dt><dd>${txt(p.value)}</dd>
    <dt>Approach</dt><dd>${txt(p.approach)}</dd>
    <dt>Risks</dt><dd>${txt(p.risks)}</dd>
  </dl>
  ${mockHtml}
</article>`;
    })
    .join('');
  return `<section id="proposals" class="block">
  <h2><span class="num">§7</span> New feature proposals</h2>
  <p class="muted">Ordered by impact, then effort. Nothing here is built; mockups are static prototypes.</p>
  ${renderScatter()}
  <div class="proposals">${cards}</div>
</section>`;
}

function rmItem(id) {
  const f = findings.find((x) => x.id === id);
  if (f) return `<li><a href="#${id}" class="idlink">${id}</a> <span class="rm-title">${txtPlain(f.title)}</span> ${pill(f.sev, 'sev-' + f.sev)}</li>`;
  const p = proposals.find((x) => x.id === id);
  if (p) return `<li><a href="#${id}" class="idlink">${id}</a> <span class="rm-title">${txtPlain(p.title)}</span> <span class="chip">Impact ${p.impact}</span></li>`;
  return `<li><span class="idlink">${esc(id)}</span> <em class="muted">not found in findings or proposals</em></li>`;
}

function renderRoadmap() {
  const cols = Object.entries(roadmap)
    .map(([name, ids]) => `<section class="card rm-col" aria-labelledby="rm-${name.replace(/\W+/g, '-')}"><h3 id="rm-${name.replace(/\W+/g, '-')}">${esc(name)} <span class="muted">${ids.length}</span></h3><ul>${ids.map(rmItem).join('')}</ul></section>`)
    .join('');
  return `<section id="roadmap" class="block">
  <h2><span class="num">§8</span> Roadmap</h2>
  <div class="roadmap">${cols}</div>
</section>`;
}

function renderAppendix() {
  const inv = inventory;
  const list = (items) => `<ul class="plain">${items.map((x) => `<li>${txt(x)}</li>`).join('')}</ul>`;
  return `<section id="appendix" class="block">
  <h2><span class="num">§9</span> Appendix</h2>
  <h3>Inventory</h3>
  <div class="tablewrap"><table><thead><tr><th scope="col">Section</th><th scope="col">What it does</th><th scope="col">Files</th></tr></thead><tbody>
  ${inv.sections.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td>${txt(b)}</td><td><code>${esc(c)}</code></td></tr>`).join('')}
  </tbody></table></div>
  <h4>3D</h4>${list(inv.threeD)}
  <h4>Scroll</h4>${list(inv.scroll)}
  <h4>Controls</h4>${list(inv.controls)}
  <h4>Libraries</h4>${list(inv.libraries)}
  <h3>Commands to reproduce</h3>
  <pre class="code"><code>${esc(commands.join('\n'))}</code></pre>
  <h3>Could not be measured</h3>
  ${NOT_MEASURED.length ? `<ul class="plain">${NOT_MEASURED.map((x) => `<li>${txt(x)}</li>`).join('')}</ul>` : '<p class="muted">Nothing listed yet.</p>'}
</section>`;
}

const TOC = [
  ['summary', '§1 Executive summary'],
  ['features', '§3 Existing features'],
  ['findings', '§4 Findings'],
  ['performance', '§5 Performance & Lighthouse'],
  ['claims', '§6 Content claims'],
  ['proposals', '§7 Feature proposals'],
  ['roadmap', '§8 Roadmap'],
  ['appendix', '§9 Appendix'],
];

const CSS = String.raw`
:root{
  --bg:#0b0a09; --surface:#151311; --raised:#221f1b; --text:#ece5d8;
  --muted:rgba(236,229,216,.65); --accent:#c9a35b; --link:#d9b872; --line:rgba(236,229,216,.12);
  --c0:#c9a35b; --c1:#7fa6c9; --c2:#9fbf7f; --c3:#d98a8a;
  --radius:16px; --display:"Iowan Old Style","Palatino Linotype",Georgia,serif;
  --body:system-ui,-apple-system,"Segoe UI",sans-serif; --mono:ui-monospace,"JetBrains Mono",Menlo,monospace;
  color-scheme:dark;
}
@media (prefers-color-scheme:light){
  :root:not([data-theme="dark"]){
    --bg:#f6f2ea; --surface:#ffffff; --raised:#efe9dd; --text:#1b1916;
    --muted:rgba(27,25,22,.7); --accent:#8a6a2c; --link:#6f5220; --line:rgba(27,25,22,.14);
    --c0:#8a6a2c; --c1:#2f6a8f; --c2:#4f7a3a; --c3:#a4453f; color-scheme:light;
  }
}
:root[data-theme="light"]{
  --bg:#f6f2ea; --surface:#ffffff; --raised:#efe9dd; --text:#1b1916;
  --muted:rgba(27,25,22,.7); --accent:#8a6a2c; --link:#6f5220; --line:rgba(27,25,22,.14);
  --c0:#8a6a2c; --c1:#2f6a8f; --c2:#4f7a3a; --c3:#a4453f; color-scheme:light;
}
:root[data-theme="dark"]{
  --bg:#0b0a09; --surface:#151311; --raised:#221f1b; --text:#ece5d8;
  --muted:rgba(236,229,216,.65); --accent:#c9a35b; --link:#d9b872; --line:rgba(236,229,216,.12);
  --c0:#c9a35b; --c1:#7fa6c9; --c2:#9fbf7f; --c3:#d98a8a; color-scheme:dark;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:400 16px/1.55 var(--body);overflow-wrap:break-word}
h1,h2,h3,h4{font-family:var(--display);font-weight:500;line-height:1.2;margin:0 0 .5em}
h1{font-size:clamp(2rem,5vw,3.4rem);letter-spacing:-.01em;margin-bottom:.4em}
h2{font-size:clamp(1.6rem,3vw,2.2rem);margin:0 0 .6em}
h3{font-size:1.2rem}
h4{font-family:var(--body);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:1.2em 0 .4em}
p{margin:0 0 .8em}
a{color:var(--link);text-underline-offset:3px}
code,pre,.mono{font-family:var(--mono);font-size:.84em}
code{background:var(--raised);padding:.1em .35em;border-radius:6px;overflow-wrap:anywhere}
pre{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:16px;overflow-x:auto;white-space:pre-wrap}
pre code{background:none;padding:0}
img{max-width:100%;height:auto}
.muted{color:var(--muted)}
.skip{position:absolute;left:-9999px}
.skip:focus{left:16px;top:8px;z-index:100;background:var(--surface);padding:8px 12px;border-radius:8px}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:4px}
[id]{scroll-margin-top:24px}
.layout{max-width:1480px;margin:0 auto;padding:0 16px;display:grid;grid-template-columns:minmax(0,1fr)}
main{min-width:0;padding-bottom:64px}
.side{position:sticky;top:0;z-index:40;background:var(--bg);border-bottom:1px solid var(--line);margin:0 -16px 8px;padding:0 16px}
.side-bar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0}
.toc-toggle{display:inline-flex;font:600 .9rem var(--body);color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:6px 14px;cursor:pointer}
.side #toc-list{display:none;list-style:none;margin:0;padding:0 0 12px;max-height:70vh;overflow:auto}
.side.open #toc-list{display:block}
#toc-list a{display:block;padding:7px 10px;border-radius:10px;color:var(--text);text-decoration:none;font-size:.92rem}
#toc-list a:hover{background:var(--raised)}
#toc-list a.on{background:var(--raised);color:var(--accent);font-weight:600}
.btn{font:600 .85rem var(--body);color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:6px 14px;cursor:pointer}
.btn:hover{border-color:var(--accent)}
.masthead{padding:40px 0 28px;border-bottom:1px solid var(--line);margin-bottom:24px}
.eyebrow{font:600 .75rem var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.meta{color:var(--muted)}
.method{max-width:78ch;color:var(--muted);font-size:.95rem}
.disclaimer{display:inline-block;margin-top:8px;padding:10px 14px;border:1px solid var(--accent);border-radius:12px;font-weight:600;max-width:80ch}
.block{padding:40px 0 16px;border-bottom:1px solid var(--line);margin-bottom:24px}
.block>p{max-width:78ch}
.num{font:500 .8em var(--mono);color:var(--accent);margin-right:.35em}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:18px}
.scorecard{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:18px 0 26px}
.score h3{font-size:1rem;margin-bottom:4px}
.scoreval{font-size:1.9rem;font-family:var(--display);margin:0 0 6px;line-height:1.1}
.scoreval .muted{font-size:.9rem;font-family:var(--body)}
.meter{height:6px;border-radius:99px;background:var(--raised);overflow:hidden;margin-bottom:10px}
.meter span{display:block;height:100%;background:var(--accent)}
.note{font-size:.9rem;color:var(--muted);margin:0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:10px 0 24px}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;display:grid;gap:4px;justify-items:start}
.tile strong{font:500 2rem var(--display);line-height:1}
.top5{padding-left:1.4em}
.top5 li{margin:.5em 0;overflow-wrap:anywhere}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font:700 .72rem/1.6 var(--body);letter-spacing:.04em;color:#0b0a09;background:var(--pill,#8b8d98);white-space:nowrap;vertical-align:middle}
.sev-P0{--pill:#e5484d}.sev-P1{--pill:#f2994a}.sev-P2{--pill:#d4b106}.sev-P3{--pill:#8b8d98}
.st-red{--pill:#e5484d}.st-amber{--pill:#f2994a}.st-green{--pill:#46a758}.st-grey{--pill:#8b8d98}
.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-size:.8rem;color:var(--muted);background:var(--raised)}
.idlink{font-family:var(--mono);font-size:.88em;font-weight:600;color:var(--link)}
.tabs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 20px}
.tab{font:600 .9rem var(--body);color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:6px 16px;cursor:pointer}
.tab[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#0b0a09}
.group{margin:26px 0}
.group>h3{font-family:var(--body);font-size:1rem;font-weight:600;margin-bottom:10px}
.thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.thumb{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.thumb-btn{display:block;width:100%;padding:0;border:0;background:var(--raised);cursor:zoom-in;line-height:0}
.thumb-btn img{width:100%;height:230px;object-fit:contain;display:block}
.thumb figcaption{font-size:.8rem;color:var(--muted);padding:8px 10px;line-height:1.35}
.sid{font:700 .78rem var(--mono);color:var(--accent);margin-right:4px}
.vp{font:.7rem var(--mono);color:var(--muted);text-transform:uppercase;margin-right:4px}
.controls{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:flex-end;margin:14px 0;padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius)}
.controls label{display:grid;gap:4px;font-size:.85rem;color:var(--muted)}
.controls .grow{flex:1 1 200px}
.controls select,.controls input[type=search]{font:inherit;color:var(--text);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:7px 10px;min-height:38px}
.controls input[type=search]{width:100%}
.sevset{border:0;padding:0;margin:0;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.sevset legend{font-size:.85rem;color:var(--muted);padding:0;margin-bottom:4px;float:left;width:100%}
.check{display:inline-flex!important;align-items:center;gap:5px;color:var(--text)!important;font-weight:600;min-height:38px}
.check input{width:18px;height:18px;accent-color:var(--accent)}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);max-width:100%;margin:10px 0 18px}
table{border-collapse:collapse;width:100%;font-size:.9rem}
th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line)}
thead th{font:600 .78rem var(--body);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--raised);white-space:nowrap}
tbody tr:last-child td,tbody tr:last-child th{border-bottom:0}
table.findings{min-width:980px}
table.claims{min-width:720px}
table.lh{min-width:1000px}
table.kv th{width:30%;color:var(--muted);font-weight:500}
table.kv{min-width:0}
.sortbtn{font:inherit;text-transform:inherit;letter-spacing:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;font-weight:600}
th[aria-sort="ascending"] .sortbtn::after{content:" \25B2"}
th[aria-sort="descending"] .sortbtn::after{content:" \25BC"}
.linkbtn{font:inherit;color:var(--text);background:none;border:0;padding:0;text-align:left;cursor:pointer;font-weight:600;text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:4px}
.linkbtn::before{content:"+ ";color:var(--accent);font-family:var(--mono)}
.linkbtn[aria-expanded="true"]::before{content:"- "}
.evidence{font-size:.82rem;color:var(--muted);min-width:260px}
.detail td{background:var(--raised)}
.detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:18px}
.detail-grid p{margin:0}
.thumbs-sm{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px}
.thumbs-sm figure{margin:0;width:200px;background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.thumbs-sm .thumb-btn img{height:150px}
.thumbs-sm figcaption{font:600 .78rem var(--mono);color:var(--muted);padding:6px 8px}
td.fid,th.fid{white-space:nowrap}
.chartbox{margin:14px 0 20px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;max-width:760px}
.chartbox figcaption{font-size:.85rem;color:var(--muted);margin-top:6px}
.chart{width:100%;height:auto;display:block}
.chart .grid{stroke:var(--line);stroke-width:1}
.chart .axis{stroke:var(--muted);stroke-width:1.2}
.svgt{fill:var(--text);font:12px var(--body)}
.chart .svgt{font-size:12px}
.muted-svg{fill:var(--muted)}
.chart rect.bar0{fill:var(--c0)}.chart rect.bar1{fill:var(--c1)}.chart rect.bar2{fill:var(--c2)}.chart rect.bar3{fill:var(--c3)}
.legend{list-style:none;display:flex;gap:14px;flex-wrap:wrap;padding:0;margin:4px 0 12px;font-size:.85rem;color:var(--muted)}
.legend li{display:flex;align-items:center;gap:6px}
.swatch{width:12px;height:12px;border-radius:3px;display:inline-block}
.swatch.c0{background:var(--c0)}.swatch.c1{background:var(--c1)}.swatch.c2{background:var(--c2)}.swatch.c3{background:var(--c3)}
.note-box{background:var(--raised);border-radius:12px;padding:10px 14px;font-size:.9rem;max-width:78ch}
.notmeasured{font-weight:600}
.measure{margin:16px 0}
.measure>h3{margin-bottom:10px}
.measure .tablewrap{margin:8px 0 0}
.subrow td{padding:6px 12px;background:var(--raised)}
.reqs{margin:6px 0 0;padding-left:1.3em;font-size:.85rem}
.reqs code{font-size:.8em}
details summary{cursor:pointer;color:var(--muted);font-size:.9rem}
.scatter svg{width:100%;height:auto;display:block;max-width:660px}
.scatter .grid{stroke:var(--line)}
.scatter .axis{stroke:var(--muted)}
.scatter .svgt{font-size:12px}
.sdot{cursor:pointer}
.sdot circle{fill:var(--raised);stroke:var(--accent);stroke-width:2}
.sdot text{fill:var(--text);font:700 11px var(--mono);pointer-events:none}
.sdot:hover circle,.sdot:focus circle{fill:var(--accent)}
.sdot:hover text,.sdot:focus text{fill:#0b0a09}
.sdot:focus{outline:none}
.proposals{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:18px;margin-top:18px}
.proposal{display:flex;flex-direction:column;gap:10px;min-width:0}
.prop-head{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.pid{font:700 .85rem var(--mono);color:var(--accent)}
.proposal h3{margin:0;font-size:1.2rem}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin:0}
.dots{display:inline-flex;gap:3px;margin-left:6px;vertical-align:middle}
.dot{width:9px;height:9px;border-radius:50%;border:1.5px solid var(--accent);display:inline-block}
.dot.on{background:var(--accent)}
.prop-body{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0;font-size:.92rem}
.prop-body dt{font-weight:600;color:var(--muted)}
.prop-body dd{margin:0}
.mockgrid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))}
.mock{margin:0;position:relative;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--raised)}
.ribbon{position:absolute;top:0;left:0;right:0;background:#e5484d;color:#0b0a09;text-align:center;font:800 .95rem var(--body);letter-spacing:.12em;text-transform:uppercase;padding:8px 6px;z-index:2;box-shadow:0 2px 0 rgba(0,0,0,.35)}
.mockbtn{display:block;width:100%;padding:0;border:0;background:none;cursor:zoom-in;line-height:0}
.mockbtn img{width:100%;height:200px;object-fit:contain;object-position:top;display:block;padding-top:36px;box-sizing:border-box}
.mock figcaption{font-size:.8rem;color:var(--muted);padding:8px 10px;line-height:1.35}
.roadmap{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px;margin-top:14px}
.rm-col h3{font-family:var(--body);font-size:1rem;font-weight:700}
.rm-col ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.rm-col li{font-size:.9rem;border-top:1px solid var(--line);padding-top:8px;overflow-wrap:anywhere}
.rm-title{color:var(--text)}
ul.plain{padding-left:1.3em;margin:0 0 1em;font-size:.92rem}
ul.plain li{margin:.3em 0}
dialog#lb{border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);color:var(--text);padding:0;width:min(96vw,1400px);max-width:96vw;max-height:94vh}
dialog#lb::backdrop{background:rgba(0,0,0,.82)}
.lb-body{display:grid;gap:10px;padding:14px}
.lb-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.lb-bar #lb-label{flex:1 1 300px;font-size:.9rem;color:var(--muted);min-width:0}
.lb-bar .btn:disabled{opacity:.4;cursor:default}
#lb-img{display:block;width:100%;max-height:calc(94vh - 130px);object-fit:contain;background:var(--raised);border-radius:12px}
.footer{color:var(--muted);font-size:.85rem;padding:24px 0 40px}
@media (min-width:1100px){
  .layout{grid-template-columns:232px minmax(0,1fr);gap:48px;padding:0 32px}
  .side{position:sticky;top:24px;align-self:start;max-height:calc(100vh - 48px);overflow:auto;margin:0;padding:0;border:0;background:none;z-index:1}
  .side .side-bar{display:block;padding:40px 0 14px}
  .toc-toggle{display:none}
  .side #toc-list{display:block;max-height:none;padding:0}
  .side #toc-list a{padding:6px 10px}
  [id]{scroll-margin-top:24px}
}
@media (max-width:1099px){ [id]{scroll-margin-top:72px} }
@media (max-width:600px){
  .thumb-btn img{height:200px}
  .mockbtn img{height:170px}
  .masthead{padding-top:28px}
}
@media print{
  *{background:transparent!important;color:#111!important;box-shadow:none!important;text-shadow:none!important}
  body{font-size:10pt}
  .side,.controls,.tabs,.linkbtn,.thumb-btn,.mockbtn,dialog,.sortbtn,.toc-toggle,#f-count,#gallery-count,.skip,.btn{display:none!important}
  .side{display:none!important}
  .layout{display:block;padding:0}
  .block{break-after:auto;padding-top:20px}
  h2{break-after:avoid}
  .tablewrap{overflow:visible;border:0}
  table.findings{min-width:0;font-size:8.5pt}
  th,td{padding:4px 6px}
  .detail[hidden]{display:table-row!important}
  .finding[hidden]{display:table-row-group!important}
  .detail{display:table-row!important}
  .detail td{background:none!important}
  .detail-grid{display:block}
  .detail-grid div{margin-bottom:6pt}
  .thumbs-sm .thumb-btn,.thumbs-sm .thumb-btn img,.thumbs .thumb-btn img,.mockbtn img{display:block!important}
  .thumbs-sm figure{display:inline-block;width:45%;margin:0 2% 6pt 0;vertical-align:top}
  .thumbs-sm .thumb-btn img{height:auto;max-height:150pt}
  figure[hidden],.group[hidden]{display:block!important}
  .thumbs{display:grid;grid-template-columns:1fr 1fr 1fr}
  .thumb-btn img{height:auto;max-height:200pt}
  .card,.thumb,.mock{break-inside:avoid;border:1px solid #bbb}
  .proposals{display:block}
  .proposal{margin-bottom:14pt;break-inside:avoid}
  .roadmap{display:grid;grid-template-columns:1fr 1fr 1fr}
  .pill{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .pill,.ribbon{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .ribbon{background:#e5484d!important;color:#0b0a09!important}
  .sdot text{fill:#111!important}
  .sdot circle{stroke:#111}
  .disclaimer{border-color:#111}
  a{text-decoration:none}
  a[href^="#"]::after{content:""}
  details{display:block}
  details>*{display:block}
  details summary{display:none}
  .footer{display:none}
}
`;

const CLIENT_JS = String.raw`
(function () {
  'use strict';
  var root = document.documentElement;
  var DATA = JSON.parse(document.getElementById('report-data').textContent);
  var IMG = DATA.img, META = DATA.meta;

  document.querySelectorAll('img[data-img]').forEach(function (im) {
    var id = im.getAttribute('data-img');
    if (IMG[id]) im.src = IMG[id];
  });

  // Theme: dark by default, follows prefers-color-scheme until the toggle is used.
  var themeBtn = document.getElementById('theme');
  function effectiveTheme() {
    var a = root.getAttribute('data-theme');
    if (a === 'light' || a === 'dark') return a;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function paintTheme() {
    themeBtn.textContent = effectiveTheme() === 'dark' ? 'Switch to light' : 'Switch to dark';
  }
  themeBtn.addEventListener('click', function () {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('qa-report-theme', next); } catch (e) {}
    paintTheme();
  });
  paintTheme();

  // TOC: collapsible on narrow screens, always open on wide ones; scroll-spy highlight.
  var side = document.getElementById('side');
  var tocBtn = side.querySelector('.toc-toggle');
  tocBtn.addEventListener('click', function () {
    var open = side.classList.toggle('open');
    tocBtn.setAttribute('aria-expanded', String(open));
  });
  var links = {};
  side.querySelectorAll('#toc-list a').forEach(function (a) {
    links[a.getAttribute('href').slice(1)] = a;
    a.addEventListener('click', function () {
      side.classList.remove('open');
      tocBtn.setAttribute('aria-expanded', 'false');
    });
  });
  function setCurrent(id) {
    Object.keys(links).forEach(function (k) {
      var on = k === id;
      links[k].classList.toggle('on', on);
      if (on) links[k].setAttribute('aria-current', 'location');
      else links[k].removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setCurrent(en.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { io.observe(s); });
  }

  // Gallery viewport filter.
  function visibleGalleryIds() {
    return Array.prototype.map.call(document.querySelectorAll('figure.thumb:not([hidden])'), function (f) {
      return f.id.replace('shot-', '');
    });
  }
  function setVp(f) {
    document.querySelectorAll('[data-vp-tab]').forEach(function (t) {
      t.setAttribute('aria-pressed', String(t.getAttribute('data-vp-tab') === f));
    });
    document.querySelectorAll('figure.thumb').forEach(function (fig) {
      fig.hidden = !(f === 'all' || fig.getAttribute('data-vpg') === f);
    });
    document.querySelectorAll('.group').forEach(function (g) {
      g.hidden = !g.querySelector('figure.thumb:not([hidden])');
    });
    document.getElementById('gallery-count').textContent = visibleGalleryIds().length + ' screenshots shown';
  }

  // Findings filter, search and sort.
  var SEVO = { P0: 0, P1: 1, P2: 2, P3: 3 }, EFFO = { S: 0, M: 1, L: 2 };
  var sortState = { key: null, dir: 1 };
  function applyFindings() {
    var sevs = Array.prototype.map.call(document.querySelectorAll('input[data-f-sev]:checked'), function (c) { return c.value; });
    var cat = document.getElementById('f-cat').value;
    var eff = document.getElementById('f-eff').value;
    var q = document.getElementById('f-q').value.trim().toLowerCase();
    var shown = 0, all = 0;
    document.querySelectorAll('tbody.finding').forEach(function (tb) {
      all++;
      var ok = sevs.indexOf(tb.getAttribute('data-sev')) >= 0 &&
        (!cat || tb.getAttribute('data-cat') === cat) &&
        (!eff || tb.getAttribute('data-eff') === eff) &&
        (!q || tb.textContent.toLowerCase().indexOf(q) >= 0);
      tb.hidden = !ok;
      if (ok) shown++;
    });
    document.getElementById('f-count').textContent = 'Showing ' + shown + ' of ' + all;
  }
  function sortFindings(key) {
    if (sortState.key === key) sortState.dir = -sortState.dir;
    else { sortState.key = key; sortState.dir = 1; }
    var tbl = document.getElementById('f-table');
    var list = Array.prototype.slice.call(tbl.querySelectorAll('tbody.finding'));
    var val = function (tb) {
      if (key === 'id') return tb.id;
      if (key === 'sev') return SEVO[tb.getAttribute('data-sev')];
      if (key === 'eff') return EFFO[tb.getAttribute('data-eff')];
      return tb.getAttribute('data-cat');
    };
    list.sort(function (a, b) {
      var x = val(a), y = val(b);
      if (x < y) return -sortState.dir;
      if (x > y) return sortState.dir;
      return 0;
    });
    list.forEach(function (tb) { tbl.appendChild(tb); });
    document.querySelectorAll('button[data-sort]').forEach(function (b) {
      var th = b.closest('th');
      var k = b.getAttribute('data-sort');
      th.setAttribute('aria-sort', k === key ? (sortState.dir === 1 ? 'ascending' : 'descending') : 'none');
    });
  }
  document.getElementById('f-controls').addEventListener('input', applyFindings);
  document.getElementById('f-controls').addEventListener('change', applyFindings);

  // Lightbox (native dialog: focus trap and Esc come from the browser).
  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lb-img');
  var lbLabel = document.getElementById('lb-label');
  var lbCount = document.getElementById('lb-count');
  var lbPrev = document.getElementById('lb-prev');
  var lbNext = document.getElementById('lb-next');
  var lbSet = [], lbIdx = 0, lbOpener = null;
  function lbShow() {
    var id = lbSet[lbIdx];
    var label = (META[id] && META[id].label) || id;
    lbImg.src = IMG[id] || '';
    lbImg.alt = label;
    lbLabel.textContent = label;
    lbCount.textContent = (lbIdx + 1) + ' / ' + lbSet.length;
    lbPrev.disabled = lbSet.length < 2;
    lbNext.disabled = lbSet.length < 2;
  }
  function lbOpen(ids, start, opener) {
    if (!ids.length || start < 0) return;
    lbSet = ids; lbIdx = start; lbOpener = opener;
    lbShow();
    if (!lb.open) lb.showModal();
    lbNext.focus();
  }
  function lbStep(d) {
    lbIdx = (lbIdx + d + lbSet.length) % lbSet.length;
    lbShow();
  }
  lbPrev.addEventListener('click', function () { lbStep(-1); });
  lbNext.addEventListener('click', function () { lbStep(1); });
  document.getElementById('lb-close').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); lbStep(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); lbStep(1); }
  });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', function () {
    if (lbOpener && lbOpener.focus) lbOpener.focus();
    lbOpener = null;
  });

  // Delegated clicks.
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-open]');
    if (el) {
      e.preventDefault();
      var set = el.getAttribute('data-set');
      var ids = set ? set.split(',') : visibleGalleryIds();
      lbOpen(ids, ids.indexOf(el.getAttribute('data-open')), el);
      return;
    }
    var vp = e.target.closest('[data-vp-tab]');
    if (vp) { setVp(vp.getAttribute('data-vp-tab')); return; }
    var tg = e.target.closest('[data-toggle]');
    if (tg) {
      var d = document.getElementById(tg.getAttribute('data-toggle'));
      var nowOpen = d.hidden;
      d.hidden = !nowOpen;
      tg.setAttribute('aria-expanded', String(nowOpen));
      return;
    }
    var sb = e.target.closest('button[data-sort]');
    if (sb) { sortFindings(sb.getAttribute('data-sort')); return; }
    if (e.target.closest('#f-reset')) {
      document.querySelectorAll('input[data-f-sev]').forEach(function (c) { c.checked = true; });
      document.getElementById('f-cat').value = '';
      document.getElementById('f-eff').value = '';
      document.getElementById('f-q').value = '';
      applyFindings();
    }
  });

  setVp('all');
  applyFindings();
})();
`;

function page() {
  const shotMeta = Object.fromEntries(Object.entries(META));
  const data = JSON.stringify({ img: IMG, meta: shotMeta }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(meta.title)}: QA report</title>
<link rel="icon" href="data:,">
<script>
try { var t = localStorage.getItem('qa-report-theme'); if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); } catch (e) {}
</script>
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="layout">
  <aside class="side" id="side">
    <div class="side-bar">
      <button type="button" class="toc-toggle" aria-expanded="false" aria-controls="toc-list">Contents</button>
      <button type="button" class="btn" id="theme">Switch to light</button>
    </div>
    <nav aria-label="Report contents">
      <ol id="toc-list" style="padding-left:0">
        ${TOC.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('\n        ')}
      </ol>
    </nav>
  </aside>
  <main id="main">
${renderMasthead()}
${renderSummary()}
${renderFeatures()}
${renderFindings()}
${renderPerformance()}
${renderClaims()}
${renderProposals()}
${renderRoadmap()}
${renderAppendix()}
  <p class="footer">Generated by build-report.mjs from report-content.mjs and data/*.json. Images are embedded; this file makes no network requests.</p>
  </main>
</div>

<dialog id="lb" aria-labelledby="lb-label">
  <div class="lb-body">
    <div class="lb-bar">
      <span id="lb-label"></span>
      <button type="button" class="btn" id="lb-prev" aria-label="Previous image">&larr; Prev</button>
      <span id="lb-count" class="muted" aria-live="polite"></span>
      <button type="button" class="btn" id="lb-next" aria-label="Next image">Next &rarr;</button>
      <button type="button" class="btn" id="lb-close">Close (Esc)</button>
    </div>
    <img id="lb-img" alt="">
  </div>
</dialog>

<script type="application/json" id="report-data">${data}</script>
<script>${CLIENT_JS}</script>
</body>
</html>
`;
}

const html = page();
await writeFile(at('report.html'), html, 'utf8');
const kb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`wrote report.html (${kb} MB, ${shots.length} screenshots, ${mockups.length} mockups, ${findings.length} findings, ${proposals.length} proposals)`);
for (const w of warnings) console.warn('warning:', w);
