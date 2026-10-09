// Photoreal ("color") look: studio environment, finishes and their surface maps.
// Lighting and most maps are generated in code; photo textures (public/textures/) load only
// when a finish that uses them is first built.
import * as THREE from 'three';
import { GENERATORS } from './maps-gen.js';
import MapsWorker from './maps.worker.js?worker&inline';

// --- procedural surface maps (generated in maps-gen.js) ------------------------------

function dataTex(data, S, srgb) {
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.repeat.set(1 / 9, 1 / 9);
  t.needsUpdate = true;
  return t;
}

// [generator, args, onDemand] per map; built in the worker during load (prepareMaps), or on the main
// thread if a product needs one before the worker is done (onDemand: alternates no product uses now)
const MAPS = {
  // CMF sheet: Driftwood / Boardwalk Gray #B7B7B7, wire brushed
  deck: ['deckMaps', [[0xc6c6c4, 0xcfcfcd, 0xd7d7d5, 0xe0e0de]]], // lifted: the studio light renders ~0.8x
  'deck-sand': ['deckMaps', [[0xdcdddc, 0xe1e2e1, 0xe5e6e5, 0xe9eae9]], true], // DuxxBak "Cool Sand" (client's test build)
  cladding: ['claddingMaps', [0xefefef]], // Polar White
  hammered: ['hammeredMaps', [0x151515]],
};
const mapCache = {};
const textures = ({ S, map, normal }) => ({ map: dataTex(map, S, true), normal: dataTex(normal, S, false) });
const getMap = (name) => (mapCache[name] ??= textures(GENERATORS[MAPS[name][0]](...MAPS[name][1])));

// generate every procedural map off the main thread; resolves when all are cached
let mapsReady;
export function prepareMaps() {
  return (mapsReady ??= new Promise((resolve) => {
    let worker;
    try { worker = new MapsWorker(); } catch { return resolve(); }
    const todo = new Set(Object.keys(MAPS).filter((n) => !MAPS[n][2] && !mapCache[n]));
    if (!todo.size) return resolve();
    worker.onmessage = ({ data }) => {
      mapCache[data.name] ??= textures(data);
      todo.delete(data.name);
      if (!todo.size) { worker.terminate(); resolve(); }
    };
    worker.onerror = () => { worker.terminate(); resolve(); };
    for (const name of todo) worker.postMessage({ name, fn: MAPS[name][0], args: MAPS[name][1] });
  }));
}

// Photo textures: [file prefix, tile size in inches]. Files: <prefix>_color.jpg, _normal.jpg, _rough.jpg
//   deck-oak: Poly Haven "Oak Veneer 01" (CC0), 1.83 m tile; grain runs along texture v = board length
const PHOTO = { 'deck-oak': ['deck-oak', 72] };
let textureBase = '/textures/';
export const setTextureBase = (url) => { textureBase = url; };
const loader = new THREE.TextureLoader();
const photoCache = {};
function getPhoto(name) {
  return (photoCache[name] ??= (() => {
    const [file, inches] = PHOTO[name];
    const load = (kind, srgb) => {
      // per-board clones (see realMaterial) share the image but need their own upload flag once it arrives
      const clones = [];
      const t = loader.load(`${textureBase}${file}_${kind}.jpg`, () => clones.forEach((c) => { c.needsUpdate = true; }));
      t.clones = clones;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.repeat.set(1 / inches, 1 / inches);
      return t;
    };
    return { map: load('color', true), normal: load('normal', false), rough: load('rough', false) };
  })());
}

// --- finishes ---------------------------------------------------------------------
// Colour, opacity type and gloss from the client's CMF sheet ("AmeriLux – 3D Render Material Specs",
// 2026-10-09). Roughness values are our reading of its finish names (Gloss / Matte-Satin / Mill...).
// Only glass-like finishes (`glass()`: clear, bronze) show what's behind them; everything else covers.
// `edge`: [colour, opacity] of the outline drawn on cut edges of see-through sheets.

const glass = (o) => ({ see: true, params: { roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.015, envMapIntensity: 1.25, ...o } });
const white = (o) => ({ params: { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.14, ...o } });

export const FINISHES = {
  // polycarbonate
  // Matched to the Figma (hero render, AmeriLite MW Pro / Pro 15 / LEXAN photos, home slider):
  // clear = cool teal, lightly frosted, faint iridescence, dark thick edges; bronze = smoked bronze, warm amber only where light comes through (cut edges);
  // opal = soft glowing white
  'poly-clear': {
    ...glass({
      // CMF sheet: clear #FFFFFF, 82% light transmission; its reference photo reads near-neutral, so the
      // Figma teal is toned down to a faint cool cast
      color: 0xcde3df, opacity: 0.09, roughness: 0.1, clearcoatRoughness: 0.07,
      iridescence: 0.35, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 420],
    }),
    edge: [0x3d6b64, 0.75],
  },
  // 5-wall bronze #8A7460, 30% light transmission over five skins
  'poly-bronze': { ...glass({ color: 0x8a7460, opacity: 0.24, roughness: 0.06, clearcoatRoughness: 0.04 }), edge: [0x6b4226, 0.7] },
  'poly-opal': white({ color: 0xf5f5f5, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 1, emissiveIntensity: 0.22 }), // milky, glowing: covers
  // flat sheet and window well cover: 98% light transmission, near water-clear, no frost
  'poly-flat': { ...glass({ color: 0xdbeeea, opacity: 0.05, roughness: 0.02, clearcoatRoughness: 0.01 }), edge: [0x5a8a82, 0.7] },
  'acrylic-clear': { ...glass({ color: 0xe6f2f0, ior: 1.49, opacity: 0.05, roughness: 0.015, clearcoatRoughness: 0.01 }), edge: [0x6f9690, 0.7] },
  // multiwall inner ribs
  'rib-clear': glass({ color: 0xcde3df, opacity: 0.16, roughness: 0.14, clearcoat: 0.4 }),
  'rib-bronze': glass({ color: 0x6e5444, opacity: 0.22, roughness: 0.12, clearcoat: 0.4 }),
  'rib-opal': white({ color: 0xf5f5f5, roughness: 0.35 }),
  // PVC. EZ Liner / EZ Forms: Ultra White, matte / satin; Agrilite MR9: Ultra White, gloss
  'pvc-white': white({ color: 0xf9fafc, emissive: 0xf8faff, emissiveIntensity: 0.15, roughness: 0.48, clearcoat: 0.12, clearcoatRoughness: 0.45 }),
  'pvc-form': white({ roughness: 0.5, clearcoat: 0.1, clearcoatRoughness: 0.5 }),
  'pvc-gloss': white({ color: 0xf9fafc, emissive: 0xf8faff, emissiveIntensity: 0.15, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
  // KLAR TK6S: white #F5F5F2 matte / satin, co-extruded black #202020 thermoacoustic core
  'pvc-klar': white({ color: 0xf5f5f2, emissive: 0xf5f5f2, emissiveIntensity: 0.12, roughness: 0.55, clearcoat: 0.08, clearcoatRoughness: 0.5 }),
  'pvc-core': { params: { color: 0x202020, roughness: 0.75 } },
  // Elite: Polar White #EFEFEF, matte / satin, woodgrain "hardly noticeable unless close"
  // no bump: the 8-bit grain normal map terraces into contour lines on the flat faces
  cladding: { params: { roughness: 0.62, clearcoat: 0.06, clearcoatRoughness: 0.55, emissive: 0xffffff, emissiveIntensity: 0.14 }, maps: 'cladding', bump: false },
  // HDPE: black #151515, textured / hammered, waxy
  'hdpe-black': { params: { roughness: 0.55, envMapIntensity: 1.1, normalScale: new THREE.Vector2(0.6, 0.6) }, maps: 'hammered' },
  // window well: galvanized steel #BCBBB5, mill / metallic
  'steel-galv': { params: { color: 0xbcbbb5, metalness: 0.65, roughness: 0.42, envMapIntensity: 1.5, side: THREE.DoubleSide } },
  // composite decking: Driftwood / Boardwalk Gray #B7B7B7, wire brushed (matte)
  deck: { params: { roughness: 0.85, envMapIntensity: 0.8, normalScale: new THREE.Vector2(0.9, 0.9) }, maps: 'deck' },
  // alternates kept for comparison: oak photo texture (placeholder) and the client's test-build "Cool Sand"
  'deck-oak': { params: { roughness: 1, envMapIntensity: 0.9, clearcoat: 0.08, clearcoatRoughness: 0.5, normalScale: new THREE.Vector2(1, 1) }, photo: 'deck-oak' },
  'deck-sand': { params: { roughness: 0.8, envMapIntensity: 0.8, normalScale: new THREE.Vector2(0.9, 0.9) }, maps: 'deck-sand' },
};

// --- shader patches ---------------------------------------------------------------
// See-through: premultiplied, so reflections add on top while the body only darkens / tints what's behind;
// cut edges (amxGlow: object-space axis + mode, see realMaterial) glow in the sheet colour.
// All: amxSat desaturates for the inactive look (Figma luminosity blend).

function onBeforeCompile(shader) {
  const { u, see } = this.userData;
  Object.assign(shader.uniforms, u);
  let fs = 'uniform float amxSat;\n' + shader.fragmentShader;
  if (see) {
    shader.vertexShader = 'uniform vec4 amxGlow;\nvarying float vAmxEdge;\nvarying vec3 vAmxObj;\n' + shader.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
float amxD = abs(dot(objectNormal, amxGlow.xyz));
vAmxEdge = amxGlow.w > 0.5 ? amxD : (1.0 - amxD) * step(0.5, length(amxGlow.xyz));`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAmxObj = position;');
    // Extruded sheet is never optically flat: faint large-scale waviness in the gloss (object space, inches)
    fs = `varying vec3 vAmxObj;
float amxH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float amxVN(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(amxH(i), amxH(i + vec3(1, 0, 0)), f.x), mix(amxH(i + vec3(0, 1, 0)), amxH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(amxH(i + vec3(0, 0, 1)), amxH(i + vec3(1, 0, 1)), f.x), mix(amxH(i + vec3(0, 1, 1)), amxH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
` + fs
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
float amxSheen = amxVN(vAmxObj * 0.18) * 0.6 + amxVN(vAmxObj * 0.55 + 4.0) * 0.4;
roughnessFactor = clamp(roughnessFactor * mix(0.55, 1.9, amxSheen), 0.0, 1.0);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
material.clearcoatRoughness = clamp(material.clearcoatRoughness * mix(0.5, 3.0, amxSheen), 0.0, 1.0);
#endif`);
    // Light crosses more material at shallow angles: opacity and tint build up along the path
    // (Beer-Lambert over 1 / cos), Fresnel turns the sheet mirror-like toward grazing, and the cut
    // edges glow: light travelling inside the sheet leaves through them, strongly tinted.
    fs = 'varying float vAmxEdge;\n' + fs.replace('#include <opaque_fragment>', `float gNV = max(abs(dot(normal, geometryViewDir)), 0.18);
float gPath = 1.0 / gNV;
float gF = pow(1.0 - gNV, 5.0);
float gEdge = smoothstep(0.55, 0.95, vAmxEdge);
float gA = 1.0 - pow(1.0 - diffuseColor.a, gPath);
gA = mix(gA, max(gA, 0.88), gEdge);
gA += (1.0 - gA) * gF * 0.35;
vec3 gTint = pow(max(diffuseColor.rgb, vec3(0.02)), vec3(gPath));
vec3 gLit = totalDiffuse + totalEmissiveRadiance;
// faces: tint x the (light) page behind ~ a colour filter over what's seen through the sheet
vec3 gBody = mix(gTint * 0.88, gLit * gTint * 1.3 + gTint * 0.12, gEdge);
// curvature (flutes, ribs, rounded edges) concentrates reflections into bright glints
float gCurv = clamp(length(fwidth(normal)) * 6.0, 0.0, 1.0);
gA += (1.0 - gA) * gCurv * 0.15;
gl_FragColor = vec4(gBody * gA + max(outgoingLight - gLit, vec3(0.0)) * (1.0 + gCurv * 1.5), gA);`)
      .replace('#include <premultiplied_alpha_fragment>', '');
  }
  fs = fs.replace('#include <tonemapping_fragment>', `#include <tonemapping_fragment>
gl_FragColor.rgb = mix(vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722))), gl_FragColor.rgb, amxSat);`);
  shader.fragmentShader = fs;
}

// glow: [axis, mode] for see-through sheets: which faces are cut edges, in object space.
//   mode 'thin': the sheet is thin along axis, edges are faces perpendicular to it (boxes, ribs)
//   mode 'caps': edges are faces along axis (end caps of extruded profiles)
let variant = 0;
export function realMaterial(name, { glow } = {}) {
  const f = FINISHES[name] || FINISHES['pvc-white'];
  const m = new THREE.MeshPhysicalMaterial({ metalness: 0, ior: 1.585, specularIntensity: 1, ...f.params });
  if (f.see) {
    Object.assign(m, { transparent: true, depthWrite: false, side: THREE.DoubleSide, premultipliedAlpha: true });
  }
  if (f.maps || f.photo) {
    // each material instance starts at a different spot in the tile, so neighbouring boards differ
    // (clones share the image; only the uv offset differs)
    const t = f.photo ? getPhoto(f.photo) : getMap(f.maps), k = variant++;
    const off = (tex) => {
      const c = tex.clone();
      c.offset.set((k * 0.37) % 1, (k * 0.61) % 1);
      tex.clones?.push(c);
      return c;
    };
    m.map = off(t.map);
    if (f.bump !== false) m.normalMap = off(t.normal);
    if (t.rough) m.roughnessMap = off(t.rough);
    if (f.maps === 'cladding') m.emissiveMap = m.map;
  }
  const u = { amxSat: { value: 1 } };
  if (f.see) {
    const [axis = 'x', mode = 'thin'] = glow || [];
    const a = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[axis];
    u.amxGlow = { value: glow ? new THREE.Vector4(...a, mode === 'caps' ? 1 : 0) : new THREE.Vector4(0, 0, 0, 1) };
  }
  m.userData = { u, see: !!f.see, edge: f.edge };
  m.onBeforeCompile = onBeforeCompile;
  m.customProgramCacheKey = () => (f.see ? 'amx-see' : 'amx-solid');
  return m;
}

// --- studio environment -----------------------------------------------------------
// Near-black room with soft-edged softbox cards, PMREM-filtered once.

function softboxTex() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, S, S);
  const g = x.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.62);
  g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#d9d9d9'); g.addColorStop(1, '#000');
  x.fillStyle = g;
  x.beginPath();
  x.roundRect(S * 0.04, S * 0.04, S * 0.92, S * 0.92, S * 0.08);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// pmrem: a shared PMREMGenerator (its blur shader is the expensive compile; one generator compiles it once)
export function studioEnvironment(pmrem) {
  const s = new THREE.Scene(), tex = softboxTex();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(44, 26, 44), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.068, 0.075, 0.088), side: THREE.BackSide })));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.29, 0.305, 0.325) }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -7;
  s.add(floor);
  const card = (w, h, pos, k) => {
    // slightly cool softboxes, to sit with the navy / grey brand palette
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(k * 0.96, k * 0.99, k * 1.04), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  card(16, 9, [-7, 12, -16], 1.7); // overhead-rear softbox, off-axis so it streaks across top faces
  card(5, 18, [-18, 5, 7], 4.5); // left key strip
  card(1.8, 18, [18, 4, -4], 7); // right rim strip: bright edge lines
  card(26, 26, [0, 12.5, 8], 0.8); // overhead fill
  card(9, 6, [11, 1, 18], 1.6); // front fill card

  const env = pmrem.fromScene(s, 0.02).texture;
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  tex.dispose();
  return env;
}
