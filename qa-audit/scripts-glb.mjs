import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const path = process.argv[2];
const doc = await io.read(path);
const root = doc.getRoot();
const json = (await io.binaryToJSON(await (await import('fs')).promises.readFile(path))).json;
const out = { asset: json.asset, extensionsUsed: json.extensionsUsed, extensionsRequired: json.extensionsRequired, meshes: [], textures: [], materials: [] };
let tris = 0, verts = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  const idx = p.getIndices(); const pos = p.getAttribute('POSITION');
  const t = idx ? idx.getCount()/3 : pos.getCount()/3; tris += t; verts += pos.getCount();
  out.meshes.push({ mesh: m.getName(), material: p.getMaterial()?.getName(), tris: t, verts: pos.getCount(), attrs: p.listSemantics() });
}
for (const t of root.listTextures()) { const s = t.getSize(); out.textures.push({ name: t.getName(), uri: t.getURI(), mime: t.getMimeType(), size: s, bytes: t.getImage()?.byteLength }); }
for (const m of root.listMaterials()) out.materials.push({ name: m.getName(), base: !!m.getBaseColorTexture(), normal: !!m.getNormalTexture(), mr: !!m.getMetallicRoughnessTexture(), occ: !!m.getOcclusionTexture() });
out.totals = { tris, verts, meshes: root.listMeshes().length, textures: root.listTextures().length, textureBytes: out.textures.reduce((a,t)=>a+(t.bytes||0),0) };
console.log(JSON.stringify(out, null, 1));
