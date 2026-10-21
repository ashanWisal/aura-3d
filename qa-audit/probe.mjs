import { launch, newContext, INSTRUMENT, waitReady, BASE } from './lib.mjs';
const b = await launch();
const ctx = await newContext(b, 'desktop'); await ctx.addInitScript(INSTRUMENT);
const page = await ctx.newPage();
const logs = []; page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message));
const t0 = Date.now(); await page.goto(BASE + '/'); await waitReady(page);
console.log('ready ms', Date.now() - t0);
console.log(await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2'); const d = c.getExtension('WEBGL_debug_renderer_info');
  return { renderer: d && c.getParameter(d.UNMASKED_RENDERER_WEBGL), canvases: document.querySelectorAll('canvas').length, gl: window.__gl && { contexts: window.__gl.contexts, draws: window.__gl.draws }, robot: !!document.querySelector('meta[name=x-robot-view]'), dpr: devicePixelRatio, canvasSizes: [...document.querySelectorAll('canvas')].map(c => c.width + 'x' + c.height) };
}));
await page.screenshot({ path: '/tmp/claude-1000/probe.png' }).catch(()=>page.screenshot({ path: 'logs/probe.png' }));
console.log(logs.join('\n'));
await b.close();
