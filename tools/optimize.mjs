// Normalize + compress raw Blender GLB exports -> public/models
// - resets stray node scale/translation (2.5in spacer shipped with 0.29 scale)
// - bakes the Z-up -> Y-up rotation into vertices, centers each part on origin
// - weld + meshopt compression (decoded at runtime by three's MeshoptDecoder)
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { clearNodeTransform, center, dedup, weld, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] || '../export';
const OUT = 'public/models';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.glb'))) {
  const doc = await io.read(path.join(SRC, f));
  for (const node of doc.getRoot().listNodes()) {
    node.setScale([1, 1, 1]).setTranslation([0, 0, 0]);
    if (node.getMesh()) clearNodeTransform(node);
  }
  for (const mat of doc.getRoot().listMaterials()) mat.setName('part');
  await doc.transform(center({ pivot: 'center' }), dedup(), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = path.join(OUT, f);
  await io.write(out, doc);
  const a = doc.getRoot().listAccessors().find((a) => a.getType() === 'VEC3');
  console.log(f.padEnd(20), (fs.statSync(path.join(SRC, f)).size / 1024).toFixed(0) + 'KB ->', (fs.statSync(out).size / 1024).toFixed(0) + 'KB');
}
