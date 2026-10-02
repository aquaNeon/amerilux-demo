// Photoreal ("color") look: studio environment, finishes and their surface maps.
// Lighting and most maps are generated in code; photo textures (public/textures/) load only
// when a finish that uses them is first built.
import * as THREE from 'three';

// --- procedural surface maps (tileable; 1 tile = 9 in) -------------------------------

function rng(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function noise1(n, seed) {
  const r = rng(seed), v = Array.from({ length: n }, r);
  return (x) => {
    x = ((x % n) + n) % n;
    const i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f);
    return v[i] * (1 - t) + v[(i + 1) % n] * t;
  };
}
function noise2(n, seed) {
  const r = rng(seed), v = Array.from({ length: n * n }, r);
  return (x, y) => {
    x = ((x % n) + n) % n; y = ((y % n) + n) % n;
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), i1 = (i + 1) % n, j1 = (j + 1) % n;
    const a = v[j * n + i], b = v[j * n + i1], c = v[j1 * n + i], d = v[j1 * n + i1];
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  };
}
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
function normalFrom(H, S, strength) {
  const d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H[y * S + ((x + 1) % S)] - H[y * S + ((x - 1 + S) % S)]) * strength;
    const dy = (H[((y + 1) % S) * S + x] - H[((y - 1 + S) % S) * S + x]) * strength;
    const l = Math.hypot(dx, dy, 1), o = (y * S + x) * 4;
    d[o] = (-dx / l * 0.5 + 0.5) * 255; d[o + 1] = (-dy / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255;
  }
  return d;
}
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
function ramp(stops, t) {
  t = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(t), f = t - i, a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// Composite decking: low-contrast brushed streaks along the board (texture v = board length), sandy stipple
function deckMaps(palette) {
  const S = 1024, H = new Float32Array(S * S), C = new Uint8Array(S * S * 4);
  const band = noise1(10, 11), mid = noise1(60, 12), fine = noise1(260, 13), hair = noise1(900, 14);
  const warp = noise2(6, 15), grit = noise2(360, 16), grit2 = noise2(140, 18), mott = noise2(9, 17);
  const pal = palette.map(hex);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = (x + (warp((x / S) * 6, (y / S) * 6) - 0.5) * 50) / S;
    const b = band(u * 10), m = mid(u * 60), f = fine(u * 260), h = hair(u * 900);
    const g = grit((x / S) * 360, (y / S) * 360), g2 = grit2((x / S) * 140, (y / S) * 140), mo = mott((x / S) * 9, (y / S) * 9);
    const c = ramp(pal, b * 0.3 + m * 0.25 + (mo - 0.5) * 0.35 + 0.28 + (f - 0.5) * 0.18);
    const k = 1 + (h - 0.5) * 0.1 + (g - 0.5) * 0.16 + (g > 0.8 ? (g - 0.8) * 0.6 : 0), o = (y * S + x) * 4;
    C[o] = Math.min(255, c[0] * k); C[o + 1] = Math.min(255, c[1] * k); C[o + 2] = Math.min(255, c[2] * k); C[o + 3] = 255;
    H[y * S + x] = f * 0.25 + h * 0.45 + g * 0.55 + g2 * 0.3;
  }
  return { map: dataTex(C, S, true), normal: dataTex(normalFrom(H, S, 4), S, false) };
}

// Painted cellular PVC: near-uniform colour with embossed cedar grain
function claddingMaps(color) {
  const S = 512, H = new Float32Array(S * S), C = new Uint8Array(S * S * 4);
  const g1 = noise1(90, 21), g2 = noise1(260, 22), warp = noise2(5, 23), mott = noise2(8, 24), base = hex(color);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = (x + (warp((x / S) * 5, (y / S) * 5) - 0.5) * 60) / S, a = g1(u * 90), b = g2(u * 260), m = mott((x / S) * 8, (y / S) * 8);
    const o = (y * S + x) * 4, k = 1 + (a - 0.5) * 0.0125 + (m - 0.5) * 0.015;
    C[o] = Math.min(255, base[0] * k); C[o + 1] = Math.min(255, base[1] * k); C[o + 2] = Math.min(255, base[2] * k); C[o + 3] = 255;
    H[y * S + x] = Math.pow(a, 3) * 0.8 + b * 0.25;
  }
  return { map: dataTex(C, S, true), normal: dataTex(normalFrom(H, S, 4), S, false) };
}

// generated on first use only (each costs a few ms to tens of ms on the CPU)
const MAPS = {
  deck: () => deckMaps([0xdcdddc, 0xe1e2e1, 0xe5e6e5, 0xe9eae9]), // DuxxBak "Cool Sand" (client's test build)
  cladding: () => claddingMaps(0xfcfcfc),
};
const mapCache = {};
const getMap = (name) => (mapCache[name] ??= MAPS[name]());

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
// Swap values for the client's specs (colour, gloss) as they arrive.
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
      color: 0xb3d6cf, opacity: 0.1, roughness: 0.1, clearcoatRoughness: 0.07,
      iridescence: 0.35, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 420],
    }),
    edge: [0x3d6b64, 0.75],
  },
  'poly-bronze': { ...glass({ color: 0x8c6e58, opacity: 0.5, roughness: 0.06, clearcoatRoughness: 0.04 }), edge: [0x6b4226, 0.7] },
  'poly-opal': white({ roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 1, emissiveIntensity: 0.22 }), // milky, glowing: covers
  // multiwall inner ribs
  'rib-clear': glass({ color: 0xb3d6cf, opacity: 0.16, roughness: 0.14, clearcoat: 0.4 }),
  'rib-bronze': glass({ color: 0x6e5444, opacity: 0.22, roughness: 0.12, clearcoat: 0.4 }),
  'rib-opal': white({ roughness: 0.35 }),
  // PVC
  'pvc-white': white({ color: 0xf9fafc, emissive: 0xf8faff, emissiveIntensity: 0.15, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.22 }),
  'pvc-form': white({ roughness: 0.42, clearcoat: 0.15, clearcoatRoughness: 0.4 }),
  cladding: { params: { roughness: 0.58, clearcoat: 0.1, clearcoatRoughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.14, normalScale: new THREE.Vector2(0.275, 0.275) }, maps: 'cladding' },
  // galvanized steel (window wells: placeholder until specs)
  'steel-galv': { params: { color: 0xc3c7ca, metalness: 1, roughness: 0.36, side: THREE.DoubleSide } },
  // composite
  deck: { params: { roughness: 1, envMapIntensity: 0.9, clearcoat: 0.08, clearcoatRoughness: 0.5, normalScale: new THREE.Vector2(1, 1) }, photo: 'deck-oak' },
  'deck-sand': { params: { roughness: 0.8, envMapIntensity: 0.8, normalScale: new THREE.Vector2(0.9, 0.9) }, maps: 'deck' },
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
    m.normalMap = off(t.normal);
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

export function studioEnvironment(renderer) {
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

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(s, 0.02).texture;
  pmrem.dispose();
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  tex.dispose();
  return env;
}
