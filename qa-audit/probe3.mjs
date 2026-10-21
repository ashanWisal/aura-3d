import { chromium } from 'playwright';
import { CHROME, HUMAN_UA, BASE } from './lib.mjs';
const sets = { swiftshader: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'], gpuGL: ['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist'], gpuVulkan: ['--use-angle=vulkan','--enable-features=Vulkan','--enable-gpu','--ignore-gpu-blocklist'] };
for (const [name, args] of Object.entries(sets)) {
  const b = await chromium.launch({ executablePath: CHROME, args });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: HUMAN_UA })).newPage();
  await p.goto(BASE + '/'); await p.waitForTimeout(6000);
  const r = await p.evaluate(async () => {
    const c = document.createElement('canvas').getContext('webgl2'); const d = c?.getExtension('WEBGL_debug_renderer_info');
    let n = 0; const t0 = performance.now(); await new Promise(res => { const f = () => { n++; performance.now() - t0 < 4000 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
    return { renderer: d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none', fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), pre: document.querySelector('[data-preloader]')?.innerText.slice(-3) };
  });
  console.log(name, JSON.stringify(r));
  await b.close();
}
