import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const doc = await io.read(process.argv[2]);
const used = new Map();
for (const m of doc.getRoot().listMaterials()) {
  const slots = { base: m.getBaseColorTexture(), normal: m.getNormalTexture(), mr: m.getMetallicRoughnessTexture(), occ: m.getOcclusionTexture() };
  for (const [k, t] of Object.entries(slots)) if (t) used.set(t, [...(used.get(t)||[]), m.getName()+':'+k]);
}
let baseOnly = 0, n = 0;
for (const [t, s] of used) if (s.every(x=>x.endsWith(':base'))) { baseOnly += t.getImage().byteLength; n++; }
const plain = doc.getRoot().listMaterials().find(m=>m.getName()==='cirkel').getNormalTexture();
console.log(JSON.stringify({ baseColorOnlyTextures: n, baseColorOnlyBytes: baseOnly, cirkelNormalBytes: plain?.getImage().byteLength, totalBin: (await import('fs')).statSync(process.argv[2]).size }));
