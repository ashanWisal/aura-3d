import sharp from 'sharp'; import fs from 'fs';
const [from, to, out, cols = 4, w = 460] = process.argv.slice(2);
const ids = []; for (let i = +from; i <= +to; i++) ids.push('S' + String(i).padStart(3, '0'));
const tiles = []; let maxH = 0;
for (const id of ids) { if (!fs.existsSync(`shots/${id}.webp`)) continue;
  const img = sharp(`shots/${id}.webp`).resize({ width: +w }); const { data, info } = await img.png().toBuffer({ resolveWithObject: true });
  const label = Buffer.from(`<svg width="${w}" height="22"><rect width="100%" height="100%" fill="#c9a35b"/><text x="6" y="16" font-size="15" font-family="monospace" fill="#000">${id}</text></svg>`);
  tiles.push({ id, data, h: info.height }); maxH = Math.max(maxH, info.height); }
const C = +cols, rows = Math.ceil(tiles.length / C), cellH = maxH + 24;
const comp = []; tiles.forEach((t, i) => { const x = (i % C) * (+w + 6), y = Math.floor(i / C) * cellH;
  comp.push({ input: t.data, left: x, top: y + 22 }, { input: Buffer.from(`<svg width="${w}" height="22"><rect width="100%" height="100%" fill="#c9a35b"/><text x="6" y="16" font-size="15" font-family="monospace" fill="#000">${t.id}</text></svg>`), left: x, top: y }); });
await sharp({ create: { width: C * (+w + 6), height: rows * cellH, channels: 3, background: '#444' } }).composite(comp).webp({ quality: 70 }).toFile(out);
console.log(out, tiles.length);
