// node obj2glb.mjs <in.obj> <out.glb> [partIndices comma list | all]
// OBJ (inches, Y-up) -> welded, meshopt-compressed GLB, one mesh, original coordinates (no centering)
const NM = new URL('../node_modules/', import.meta.url).href;
const { Document, NodeIO } = await import(NM + '@gltf-transform/core/dist/index.js');
const { EXTMeshoptCompression, KHRMeshQuantization } = await import(NM + '@gltf-transform/extensions/dist/index.js');
const { prune, meshopt } = await import(NM + '@gltf-transform/functions/dist/index.js');
const { MeshoptEncoder, MeshoptDecoder } = await import(NM + 'meshoptimizer/index.js');
import fs from 'node:fs';

const [, , src, out, sel = 'all'] = process.argv;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const parts = []; let cur = null; const V = [];
for (const l of fs.readFileSync(src, 'utf8').split('\n')) {
  if (l.startsWith('o ')) parts.push(cur = { name: l.slice(2), f: [] });
  else if (l.startsWith('v ')) V.push(l.slice(2).split(' ').map(Number));
  else if (l.startsWith('f ')) cur.f.push(l.slice(2).split(' ').map((n) => +n - 1));
}
const pick = sel === 'all' ? parts.map((_, i) => i) : sel.split(',').map(Number);
for (const [i, p] of parts.entries()) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const f of p.f) for (const v of f) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], V[v][k]); mx[k] = Math.max(mx[k], V[v][k]); }
  console.log(pick.includes(i) ? '*' : ' ', p.name, 'tris', p.f.length, 'min', mn.map((x) => x.toFixed(2)).join(','), 'size', mx.map((x, k) => (x - mn[k]).toFixed(2)).join(','));
}
// crease-angle normals: each corner averages the (area-weighted) normals of faces at that vertex
// within 30 deg of its own face; corners with equal position + normal share one vertex
const faces = pick.flatMap((i) => parts[i].f);
const fn = faces.map(([a, b, c]) => {
  const u = V[b].map((x, k) => x - V[a][k]), w = V[c].map((x, k) => x - V[a][k]);
  return [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
});
const unit = (n) => { const l = Math.hypot(...n) || 1; return n.map((x) => x / l); };
const fu = fn.map(unit), byVert = new Map();
faces.forEach((f, i) => f.forEach((v) => (byVert.get(v) ?? byVert.set(v, []).get(v)).push(i)));
const COS = Math.cos(Math.PI / 6), pos = [], nor = [], index = [], seen = new Map();
faces.forEach((f, i) => f.forEach((v) => {
  const n = [0, 0, 0];
  for (const j of byVert.get(v)) if (fu[j][0] * fu[i][0] + fu[j][1] * fu[i][1] + fu[j][2] * fu[i][2] >= COS) for (let k = 0; k < 3; k++) n[k] += fn[j][k];
  const nn = unit(n), key = `${v}|${nn.map((x) => Math.round(x * 200)).join(',')}`;
  let id = seen.get(key);
  if (id === undefined) { seen.set(key, id = pos.length / 3); pos.push(...V[v]); nor.push(...nn); }
  index.push(id);
}));
const doc = new Document();
const buf = doc.createBuffer();
const prim = doc.createPrimitive()
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buf))
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(index)).setBuffer(buf))
  .setMaterial(doc.createMaterial('part'));
const mesh = doc.createMesh('part').addPrimitive(prim);
doc.createScene().addChild(doc.createNode('part').setMesh(mesh));
console.log('verts', pos.length / 3, 'tris', index.length / 3);
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
await io.write(out, doc);
console.log('->', out, (fs.statSync(out).size / 1024).toFixed(0) + 'KB');
