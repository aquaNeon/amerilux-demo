// WebGL carousel. 1 world unit = 1 CSS px at the z = 0 plane so slot positions/sizes map
// straight onto the Figma layout (Concept 17, 1512 x 940).
// Three looks:
//   'mono'   B&W illustration: orthographic camera, outlines, direct render
//   'color'  photoreal: long-lens perspective matched to the same scale, studio environment,
//            key-light self-shadowing on the active product, HDR pipeline (pipeline.js)
//   'sketch' architectural graphite sketch, orthographic (sketch.js)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PRODUCTS } from './products.js';
import { prepareMaps, realMaterial, setTextureBase, studioEnvironment } from './materials.js';
import { StudioPipeline } from './pipeline.js';
import { SketchPipeline } from './sketch.js';

// Slot layouts, in px of the Figma frame they were measured on (scaled with the stage width).
//   hero   home "Our products": 1141px-wide left column, larger hero from the client's studio build
//   strip  product page "Other products to consider": 1384px-wide full-width stage
// slots: distance of each slot centre from the active centre. small / big: fit box of side / active items
export const LAYOUTS = {
  hero: { designW: 1141, slots: [0, 375, 610, 845, 1080], small: { w: 160, h: 104 }, big: { w: 470, h: 410 }, centerX: 0.505, centerY: 0.67 },
  strip: { designW: 1384, slots: [0, 302, 528, 754, 980], small: { w: 174, h: 114 }, big: { w: 330, h: 320 }, centerX: 0.5, centerY: 0.47 },
};
const ELEVATION = THREE.MathUtils.degToRad(34);
const LENS_FOV = 18; // photoreal camera, vertical degrees
const KEY_DIR = new THREE.Vector3(-0.42, 0.82, 0.38).normalize(); // photoreal key light
const STAGGER = 0.14; // s between product entrances, so late builds arrive one by one
const APPEAR_K = 26, APPEAR_C = 2 * Math.sqrt(APPEAR_K); // entrance spring: critically damped, no overshoot

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);
const wrap = (v, n) => ((((v + n / 2) % n) + n) % n) - n / 2;
const edgeCache = new WeakMap();
const EDGE_ON = new THREE.Color(0x1f2a28);
const EDGE_OFF = new THREE.Color(0x6b6b6b);
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const grey = (c) => { const l = lum(c); return new THREE.Color(l, l, l); };
// next idle moment (one frame at most), so background work never stacks into one long task
const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 200 }) : setTimeout(r, 16)));

// meshopt output is quantized (int16 positions, dequant scale on the node):
// copy to float attributes and bake the node transform so parts are in inches
function bakeGeometry(mesh) {
  const src = mesh.geometry;
  const geo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal']) {
    const a = src.getAttribute(name);
    if (!a) continue;
    const out = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) {
      out[i * 3] = a.getX(i);
      out[i * 3 + 1] = a.getY(i);
      out[i * 3 + 2] = a.getZ(i);
    }
    geo.setAttribute(name, new THREE.BufferAttribute(out, 3));
  }
  if (src.index) geo.setIndex(src.index);
  geo.applyMatrix4(mesh.matrixWorld);
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.userData.quantized = true;
  return geo;
}

// Leaves out outline segments shorter than `min` inches: crumbs from tiny faces of extruded profiles,
// drawn as stray dots across flat faces.
function dropShort(geo, min = 0.03) {
  const p = geo.getAttribute('position').array, out = [];
  for (let i = 0; i < p.length; i += 6) {
    if (Math.hypot(p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]) >= min) for (let k = 0; k < 6; k++) out.push(p[i + k]);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  return geo;
}

// Keeps the outline segments for which keep(a, b) is true (a, b: endpoints, geometry space)
function keepEdges(geo, keep) {
  const p = geo.getAttribute('position').array, out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < p.length; i += 6) {
    a.fromArray(p, i); b.fromArray(p, i + 3);
    if (keep(a, b)) for (let k = 0; k < 6; k++) out.push(p[i + k]);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  return geo;
}

// Feature edges for quantized imported meshes. Their long, thin sliver triangles get noisy face
// normals, which EdgesGeometry reads as creases in the middle of flat faces (drawn as dotted lines
// that flicker against the face). Same rule as EdgesGeometry, but edges touching a sliver are skipped.
function cleanEdges(geo, angle = 28, minAltitude = 0.006) {
  const pos = geo.getAttribute('position');
  const idx = geo.index ? geo.index.array : null;
  const count = idx ? idx.length : pos.count;
  const cos = Math.cos(THREE.MathUtils.degToRad(angle));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  const key = (v) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
  const edges = new Map(); // "k0|k1" -> { v0, v1, n, sliver, faces }
  for (let i = 0; i < count; i += 3) {
    const vi = [0, 1, 2].map((k) => (idx ? idx[i + k] : i + k));
    a.fromBufferAttribute(pos, vi[0]); b.fromBufferAttribute(pos, vi[1]); c.fromBufferAttribute(pos, vi[2]);
    ab.subVectors(b, a); ac.subVectors(c, a);
    n.crossVectors(ab, ac);
    const area2 = n.length();
    if (area2 < 1e-12) continue;
    n.divideScalar(area2);
    const longest = Math.max(ab.length(), ac.length(), b.distanceTo(c));
    const sliver = area2 / longest < minAltitude; // altitude onto the longest side
    const vs = [a.clone(), b.clone(), c.clone()];
    for (let e = 0; e < 3; e++) {
      const p0 = vs[e], p1 = vs[(e + 1) % 3];
      const k0 = key(p0), k1 = key(p1);
      if (k0 === k1) continue;
      const k = k0 < k1 ? `${k0}|${k1}` : `${k1}|${k0}`;
      const ed = edges.get(k);
      if (!ed) edges.set(k, { p0, p1, n: n.clone(), sliver, faces: 1, keep: false });
      else {
        ed.faces++;
        ed.keep = !ed.sliver && !sliver && ed.n.dot(n) <= cos;
      }
    }
  }
  const out = [];
  for (const ed of edges.values()) {
    if (ed.faces === 1 ? !ed.sliver : ed.keep) out.push(ed.p0.x, ed.p0.y, ed.p0.z, ed.p1.x, ed.p1.y, ed.p1.z);
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
}

// first opaque background behind the stage (the photoreal pipeline composites onto it)
function backdropColor(el) {
  for (let n = el; n; n = n.parentElement) {
    const m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
    if (m && (m[3] === undefined || +m[3] > 0.5)) return new THREE.Color(`rgb(${m[0]}, ${m[1]}, ${m[2]})`);
  }
  return new THREE.Color(0xffffff);
}

// per-object focus weight for the sketch pass (the override materials carry uWeight)
function setWeight(renderer, scene, camera, geometry, material) {
  const u = material.uniforms?.uWeight;
  if (!u) return;
  u.value = (this.userData.item?.a ?? 1) * (this.userData.sketchWeight ?? 1);
  material.uniformsNeedUpdate = true;
}

function slotX(slots, p) {
  const a = Math.abs(p);
  const i = Math.min(Math.floor(a), slots.length - 2);
  const x = THREE.MathUtils.lerp(slots[i], slots[i + 1], a - i);
  return Math.sign(p) * x;
}

export class Stage {
  constructor(el, { slugs, modelBase, textureBase, layout = 'hero', centerX, centerY, onChange, onBuilt }) {
    this.el = el;
    this.slugs = slugs;
    this.modelBase = modelBase;
    if (textureBase) setTextureBase(textureBase);
    this.layout = LAYOUTS[layout] || LAYOUTS.hero;
    this.centerX = centerX ?? this.layout.centerX;
    this.centerY = centerY ?? this.layout.centerY;
    this.onChange = onChange;
    this.onBuilt = onBuilt;
    this.style = 'color';
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    // reading shader logs forces the driver to finish compiling on the spot (seconds of main-thread
    // stalls at startup); only worth it while developing
    r.debug.checkShaderErrors = import.meta.env.DEV;
    r.toneMapping = THREE.NeutralToneMapping; // mono only: render targets skip it, the pipeline tones photoreal
    r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = true;
    r.shadowMap.autoUpdate = false;
    this.canvas = r.domElement;
    this.canvas.className = 'amx-canvas';
    el.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    // environment maps are built on first use of their style (each is a PMREM render)
    this.pmrem = new THREE.PMREMGenerator(r);
    this.key = new THREE.DirectionalLight(0xffffff, 2.2);
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0003;
    this.key.shadow.radius = 3; // PCF softness: hard 1-texel edges stair-step and crawl as the product sways
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x9aa3a2, 0.5);
    this.scene.add(this.key, this.key.target, this.hemi);

    this.bg = backdropColor(el);
    this.pipe = new StudioPipeline(r);
    this.pipe.fin.uniforms.uBg.value.copy(this.bg);
    this.sketch = new SketchPipeline(r);
    this.sketch.setBackground(this.bg);

    this.ortho = new THREE.OrthographicCamera();
    this.ortho.position.set(0, Math.sin(ELEVATION), Math.cos(ELEVATION)).multiplyScalar(2000);
    this.ortho.lookAt(0, 0, 0);
    this.ortho.near = 1000; // tight range around the 2000 px camera distance: depth precision for thin skins (sketch outlines)
    this.ortho.far = 3000;
    this.persp = new THREE.PerspectiveCamera(LENS_FOV, 1, 10, 40000);

    this.items = slugs.map((slug, index) => this.createItem(slug, index));
    this.current = 0;
    this.target = 0;
    this.active = 0;
    this.pointer = new THREE.Vector2(0, 0); // raw, NDC
    this.follow = new THREE.Vector2(0, 0); // spring-smoothed pointer driving the tilt
    this.followVel = new THREE.Vector2(0, 0);
    this.timer = new THREE.Timer();
    this.raycaster = new THREE.Raycaster();
    this._box = new THREE.Box3();
    this._v = new THREE.Vector3();
    this.frames = 0;

    this.resize();
    new ResizeObserver(() => this.resize()).observe(el);
    this.bindPointer();
    this.bindVisibility();
    this.applyStyle();
    this.ready = this.load(); // resolves once the first (active) product is on screen
    this.loaded = this.ready.then(() => this.rest);
    r.setAnimationLoop(() => this.tick());
  }

  get camera() { return this.style === 'color' ? this.persp : this.ortho; }

  get envReal() { return (this._envReal ??= studioEnvironment(this.pmrem)); }
  get envIllus() { return (this._envIllus ??= this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture); }

  // --- items ----------------------------------------------------------------

  createItem(slug, index) {
    const def = PRODUCTS[slug];
    const root = new THREE.Group(); // slot position + scale
    const tilt = new THREE.Group(); // yaw + motion
    const content = new THREE.Group(); // centering
    root.add(tilt);
    tilt.add(content);
    root.visible = false;
    this.scene.add(root);
    return { slug, index, def, root, tilt, content, layers: [], materials: [], reals: [], meshes: [], edges: [], built: false, hover: 0, appear: 0, appearVel: 0 };
  }

  // Active product first: fetch its GLBs, build it, compile its shaders off the main thread
  // (KHR_parallel_shader_compile), then show it. Every other product follows in idle time, nearest
  // first, one per idle slot, so startup never blocks on the whole catalogue.
  async load() {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.parts = {};
    const pending = {};
    const part = (n) => (pending[n] ??= loader.loadAsync(`${this.modelBase}${n}.glb`).then((gltf) => {
      let mesh;
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
      this.parts[n] = bakeGeometry(mesh);
    }));
    const n = this.items.length;
    const order = [...this.items].sort((a, b) => Math.abs(wrap(a.index - this.target, n)) - Math.abs(wrap(b.index - this.target, n)));
    const maps = prepareMaps(); // procedural textures, in a worker meanwhile
    const show = async (it, first) => {
      await Promise.all([...(it.def.parts || []).map(part), first || maps]);
      this.buildItem(it);
      this.styleItem(it);
      await this.compileItem(it);
      it.built = true;
      this.onBuilt?.(it.index);
    };
    await show(order[0], true); // never waits on the worker (builds a missing map inline instead)
    this.rest = (async () => {
      for (const it of order.slice(1)) for (const p of it.def.parts || []) part(p); // fetch the rest in parallel
      for (const it of order.slice(1)) { await idle(); await show(it); }
      await idle();
      this.precompile();
    })();
  }

  // compile one product's programs for the current style without stalling the frame
  compileItem(it) {
    it.root.visible = true;
    const done = this.compile(it.root);
    it.root.visible = false;
    return done;
  }

  // compileAsync against the target the style really draws into: programs bake in the target's
  // colour space and tone mapping (photoreal draws to the linear HDR target, no tone mapping), and a
  // program compiled for the screen would be thrown away and recompiled on first draw
  compile(object) {
    const r = this.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(this.style === 'color' ? this.pipe.main : null);
    const done = r.compileAsync(object, this.camera, this.scene).catch(() => {});
    r.setRenderTarget(prev);
    return done;
  }

  buildItem(it) {
    it.layers = it.def.build(this.parts);
    const mats = new Set();
    const meshes = [];
    for (const l of it.layers) {
      l.home = l.object.position.clone();
      it.content.add(l.object);
      l.object.traverse((o) => { if (o.isMesh) meshes.push(o); });
    }
    // B&W outlines; photoreal keeps outlines only on see-through sheets (tinted cut edges)
    it.edgeMat = new THREE.LineBasicMaterial({ color: EDGE_ON, transparent: true, opacity: 0.75 });
    const realOf = new Map();
    const edgeOf = new Map();
    for (const o of meshes) {
      o.userData.item = it;
      mats.add(o.material);
      // photoreal twin of each illustrated material, shared the same way
      if (!realOf.has(o.material)) {
        const real = realMaterial(o.material.userData.finish, o.material.userData);
        realOf.set(o.material, real);
        const ed = real.userData.edge;
        if (ed) {
          const m = new THREE.LineBasicMaterial({ color: ed[0], transparent: true, opacity: ed[1] });
          edgeOf.set(real, { m, color: m.color.clone(), grey: grey(m.color) });
        }
      }
      const real = realOf.get(o.material);
      o.userData.illus = o.material;
      o.userData.real = real;
      o.userData.see = real.userData.see;
      o.onBeforeRender = setWeight;
      // inner parts (multiwall ribs) only get sketch outlines when the sheet around them is see-through
      if (o.userData.edges === 'none' && !o.userData.see) continue;
      // ready-made sketch linework (multiwall ribs) or the mesh's feature edges
      const src = o.userData.edgeGeo || o.geometry;
      let lineGeo = o.userData.edges === 'none' && o.userData.sketchLines;
      if (!lineGeo) {
        const angle = o.userData.edgeAngle ?? 28;
        if (!edgeCache.has(src)) {
          const g = src.userData.quantized ? cleanEdges(src, angle) : dropShort(new THREE.EdgesGeometry(src, angle));
          edgeCache.set(src, o.userData.edgeKeep ? keepEdges(g, o.userData.edgeKeep) : g);
        }
        lineGeo = edgeCache.get(src);
      }
      const line = new THREE.LineSegments(lineGeo, it.edgeMat);
      line.raycast = () => {};
      line.onBeforeRender = setWeight;
      line.layers.enable(1); // sketch outline pass
      line.userData.real = o.userData.realEdges === false ? null : edgeOf.get(real)?.m;
      line.userData.item = it;
      line.userData.sketchOnly = o.userData.edges === 'none'; // e.g. multiwall ribs: drawn only in the sketch
      // lighter pencil for inner ribs and see-through sheets
      line.userData.sketchWeight = line.userData.sketchOnly ? 0.22 : o.userData.see ? 0.6 : 1;
      o.add(line);
      it.edges.push(line);
    }
    it.see = meshes.filter((o) => o.userData.see);
    it.meshes = meshes;
    it.reals = [...realOf.values()].map((m) => ({ m, color: m.color.clone(), grey: grey(m.color) }));
    it.realEdges = [...edgeOf.values()];
    it.materials = [...mats].map((m) => {
      const g = 0.62 + lum(m.color) * 0.3;
      return { m, grey: new THREE.Color(g, g, g), mono: grey(m.color), opacity: m.opacity };
    });
    this.measure(it);
    it.tilt.rotation.y = it.def.yaw;
  }

  // --- style ----------------------------------------------------------------

  setStyle(style) {
    this.style = ['mono', 'sketch'].includes(style) ? style : 'color';
    this.applyStyle();
  }

  applyStyle() {
    const real = this.style === 'color';
    this.scene.environment = real ? this.envReal : this.envIllus;
    this.scene.environmentIntensity = real ? 1 : 0.55;
    this.key.intensity = real ? 2.3 : 2.2;
    this.key.color.set(real ? 0xf3f7ff : 0xffffff); // photoreal: slightly cool daylight
    this.key.castShadow = real;
    if (!real) { this.key.position.set(-300, 600, 400); this.key.target.position.set(0, 0, 0); }
    this.hemi.visible = !real;
    for (const it of this.items) this.styleItem(it);
  }

  styleItem(it) {
    const real = this.style === 'color';
    const sketch = this.style === 'sketch';
    for (const o of it.meshes) {
      o.material = real ? o.userData.real : o.userData.illus;
      o.castShadow = o.receiveShadow = real && !o.userData.see;
      if (o.userData.noCast) o.castShadow = false;
      if (o.userData.noShadow) o.castShadow = o.receiveShadow = false;
    }
    for (const l of it.edges) {
      l.material = real ? l.userData.real || it.edgeMat : it.edgeMat;
      l.visible = !sketch && !l.userData.sketchOnly && (!real || !!l.userData.real);
    }
  }

  // compile the other style's programs now (in parallel where supported) so the switch doesn't hitch
  precompile() {
    const style = this.style;
    this.style = style === 'color' ? 'mono' : 'color';
    this.applyStyle();
    const shown = this.items.map((it) => it.root.visible);
    this.items.forEach((it) => { it.root.visible = it.built; }); // compile skips hidden objects
    this.compile(this.scene);
    this.items.forEach((it, i) => { it.root.visible = shown[i]; });
    this.style = style;
    this.applyStyle();
  }

  // every outline object, and the see-through meshes the sketch draws as linework only
  sketchLists() {
    const built = this.items.filter((i) => i.built);
    return { lines: built.flatMap((i) => i.edges), hide: built.flatMap((i) => i.see) };
  }

  setExplode(it, e) {
    for (const l of it.layers) l.object.position.copy(l.home).addScaledVector(l.explode, e);
  }

  // screen-space extents (px per inch at scale 1) for assembled and exploded states
  measure(it) {
    const view = new THREE.Matrix4().makeRotationFromQuaternion(this.ortho.quaternion.clone().invert());
    const yaw = new THREE.Matrix4().makeRotationY(it.def.yaw);
    const m = view.multiply(yaw);
    const box = new THREE.Box3();
    const corner = new THREE.Vector3();
    it.fit = [0, 1].map((e) => {
      this.setExplode(it, e);
      it.content.position.set(0, 0, 0);
      it.content.updateMatrixWorld(true);
      box.makeEmpty();
      for (const l of it.layers) box.expandByObject(l.object);
      const center = box.getCenter(new THREE.Vector3());
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
          .sub(center).applyMatrix4(m);
        minX = Math.min(minX, corner.x); maxX = Math.max(maxX, corner.x);
        minY = Math.min(minY, corner.y); maxY = Math.max(maxY, corner.y);
      }
      return { center, w: maxX - minX, h: maxY - minY };
    });
  }

  // key light + shadow frustum wrapped tightly around one item
  fitShadow(it) {
    const b = this._box.setFromObject(it.tilt);
    const c = b.getCenter(this._v);
    const R = Math.max(1, b.getSize(new THREE.Vector3()).length() * 0.55);
    this.key.target.position.copy(c);
    this.key.position.copy(c).addScaledVector(KEY_DIR, R * 4);
    const sc = this.key.shadow.camera;
    Object.assign(sc, { left: -R, right: R, top: R, bottom: -R, near: R, far: R * 8 });
    sc.updateProjectionMatrix();
    // ~0.012 in: must stay under the wall thickness of hollow profiles or inner webs shadow the face
    this.key.shadow.normalBias = it.root.scale.x * 0.012;
    this.key.target.updateMatrixWorld();
    this.renderer.shadowMap.needsUpdate = true;
  }

  // --- navigation -------------------------------------------------------------

  go(index) {
    const n = this.items.length;
    this.target = this.current + wrap(index - this.current, n);
  }

  next(step = 1) { this.go(Math.round(this.target) + step); }

  // --- layout -----------------------------------------------------------------

  resize() {
    const { clientWidth: w, clientHeight: h } = this.el;
    if (!w || !h) return;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.scale = THREE.MathUtils.clamp(w / this.layout.designW, 0.45, 1.5);
    const cx = w * this.centerX;
    const cy = h * this.centerY;
    Object.assign(this.ortho, { left: -cx, right: w - cx, top: cy, bottom: cy - h });
    this.ortho.updateProjectionMatrix();
    // long lens whose z = 0 plane matches the ortho pixel scale, centred on the same point
    const D = h / 2 / Math.tan(THREE.MathUtils.degToRad(LENS_FOV / 2));
    const P = this.persp;
    P.position.set(0, Math.sin(ELEVATION), Math.cos(ELEVATION)).multiplyScalar(D);
    P.lookAt(0, 0, 0);
    P.near = D * 0.72;
    P.far = D * 1.32;
    P.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
    P.updateProjectionMatrix();
    const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.pipe.setSize(db.x, db.y);
    this.sketch.setSize(db.x, db.y, db.x / w);
  }

  // --- input ------------------------------------------------------------------

  bindPointer() {
    const c = this.canvas;
    let drag = null;
    const toNdc = (e) => {
      const r = c.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const pick = (e) => {
      this.raycaster.setFromCamera(toNdc(e), this.camera);
      const hit = this.raycaster.intersectObjects(this.items.map((i) => i.root), true)[0];
      return hit ? hit.object.userData.item : null;
    };

    c.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, start: this.current, moved: false, id: e.pointerId };
    });
    c.addEventListener('pointermove', (e) => {
      this.pointer.copy(toNdc(e));
      if (drag) {
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 6 && !drag.moved) {
          drag.moved = true;
          c.setPointerCapture(drag.id);
          c.classList.add('is-dragging');
        }
        if (drag.moved) {
          this.current = this.target = drag.start - dx / (this.layout.slots[1] * this.scale);
          return;
        }
      }
      if (e.pointerType === 'mouse') {
        this.hovered = pick(e);
        c.style.cursor = this.hovered && this.hovered.index !== this.active ? 'pointer' : drag ? 'grabbing' : 'grab';
      }
    });
    const end = (e) => {
      if (!drag) return;
      if (drag.moved) {
        this.go(Math.round(this.current));
      } else {
        const it = pick(e);
        if (it) this.go(it.index);
      }
      c.classList.remove('is-dragging');
      drag = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { this.hovered = null; this.pointer.set(0, 0); });
  }

  bindVisibility() {
    this.visible = true;
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(this.el);
  }

  // --- frame ------------------------------------------------------------------

  // if frames run long (photoreal on weak GPUs): first drop supersampling, then the pixel ratio
  // (a 1x canvas on a 1.25-1.5x screen is upscaled by the browser: soft and jagged)
  adapt(raw) {
    this.ema = this.ema == null ? 0.016 : this.ema * 0.95 + Math.min(raw, 0.2) * 0.05;
    if (++this.frames <= 90 || this.ema <= 0.034) return;
    if (this.pipe.ss > 1 && this.style === 'color') {
      this.pipe.ss = 1;
      this.pipe.setSize(...this.pipe.size);
    } else if (this.renderer.getPixelRatio() > 1) {
      this.renderer.setPixelRatio(1);
      this.resize();
    } else return;
    this.ema = 0.016;
    this.frames = 0;
  }

  tick() {
    this.timer.update();
    const raw = this.timer.getDelta();
    const dt = Math.min(raw, 0.05);
    if (!this.visible || document.hidden || !this.w) return;
    this.adapt(raw);
    const t = this.timer.getElapsed();
    const n = this.items.length;
    const real = this.style === 'color';

    this.current += (this.target - this.current) * (1 - Math.exp(-dt * 7));

    // critically damped spring: heavy, lagging follow with no overshoot
    const K = 9, C = 2 * Math.sqrt(K);
    this.followVel.x += ((this.pointer.x - this.follow.x) * K - this.followVel.x * C) * dt;
    this.followVel.y += ((this.pointer.y - this.follow.y) * K - this.followVel.y * C) * dt;
    this.follow.addScaledVector(this.followVel, dt);
    const active = ((Math.round(this.current) % n) + n) % n;
    if (active !== this.active) {
      this.active = active;
      this.onChange?.(active);
    }

    for (const it of this.items) {
      if (!it.built) continue;
      const p = wrap(it.index - this.current, n);
      const a = ease(clamp01(1 - Math.abs(p)));
      it.hover += ((this.hovered === it && a < 0.5 ? 1 : 0) - it.hover) * (1 - Math.exp(-dt * 5));
      // entrance: grow in from nothing with a slight rise, each product STAGGER after the previous one
      if (it.revealAt == null) this.lastReveal = it.revealAt = Math.max(t, (this.lastReveal ?? -Infinity) + STAGGER);
      if (this.reduced) it.appear = 1;
      else if (t >= it.revealAt) {
        it.appearVel += ((1 - it.appear) * APPEAR_K - it.appearVel * APPEAR_C) * dt;
        it.appear += it.appearVel * dt;
      }
      const grow = clamp01(it.appear);

      // explode + recentre
      const e = ease(clamp01((a - 0.25) / 0.75));
      this.setExplode(it, e);
      it.content.position.lerpVectors(it.fit[0].center, it.fit[1].center, e).negate();

      // fit into slot
      const [f0, f1] = it.fit;
      const { small, big, slots } = this.layout;
      const s0 = Math.min(small.w / f0.w, small.h / f0.h);
      const s1 = Math.min(big.w / f1.w, big.h / f1.h);
      const s = THREE.MathUtils.lerp(s0, s1, a) * this.scale * grow * (1 + it.hover * 0.04);
      it.root.scale.setScalar(s);
      it.root.position.set(slotX(slots, p) * this.scale, it.hover * 6 - (1 - grow) * 24 * this.scale, 0);
      it.root.visible = Math.abs(p) < 3.6 && grow > 0.002;
      it.a = a;

      // motion: gentle idle sway on active, pointer parallax
      const sway = this.reduced ? 0 : Math.sin(t * 0.3) * 0.07 * a;
      it.tilt.rotation.y = it.def.yaw + sway + this.follow.x * 0.09 * a;
      it.tilt.rotation.x = -this.follow.y * 0.045 * a;
      it.tilt.position.y = this.reduced ? 0 : Math.sin(t * 0.45 + it.index) * 1.5 * a;

      // inactive -> active: B&W light grey -> mid grey (photoreal keeps full colour on every product)
      if (!real) {
        for (const m of it.materials) {
          m.m.color.lerpColors(m.grey, m.mono, a);
          if (m.m.transparent) m.m.opacity = THREE.MathUtils.lerp(Math.min(1, m.opacity + 0.2), m.opacity, a);
        }
        it.edgeMat.color.copy(EDGE_OFF).lerp(EDGE_ON, a);
        it.edgeMat.opacity = 0.45 + 0.35 * a;
      }
    }

    if (this.style === 'sketch') {
      this.sketch.render(this.scene, this.ortho, { ...this.sketchLists(), time: t });
    } else if (real) {
      if (this.items[this.active].built) this.fitShadow(this.items[this.active]);
      this.pipe.render(this.scene, this.persp, { aoRadius: 34 * this.scale, ao: 1.6, time: t });
    } else {
      this.renderer.render(this.scene, this.ortho);
    }
  }

  // --- thumbnails -------------------------------------------------------------
  // Renders one item in its active look; resolves to a data URL (used when a thumb has no src).
  // The pixel readback is async so the GPU never stalls the frame.

  snapshot(index, size = 204) {
    const it = this.items[index];
    if (!it?.built) return null;
    const real = this.style === 'color';
    const r = this.renderer;
    const rt = new THREE.WebGLRenderTarget(size, size, this.style === 'mono' ? { samples: 4 } : {});
    const cam = this.ortho.clone();
    const f = it.fit[1];
    const half = Math.max(f.w, f.h) * 0.54;
    Object.assign(cam, { left: -half, right: half, top: half, bottom: -half });
    cam.updateProjectionMatrix();

    const saved = this.items.map((i) => i.root.visible);
    const pose = { p: it.root.position.clone(), s: it.root.scale.x, ry: it.tilt.rotation.y, rx: it.tilt.rotation.x, ty: it.tilt.position.y };
    this.items.forEach((i) => { i.root.visible = i === it; });
    this.setExplode(it, 1);
    it.content.position.copy(f.center).negate();
    it.root.position.set(0, 0, 0);
    it.root.scale.setScalar(1);
    it.tilt.rotation.set(0, it.def.yaw, 0);
    it.tilt.position.y = 0;
    for (const m of it.materials) { m.m.color.copy(m.mono); m.m.opacity = m.opacity; }
    for (const m of it.reals) { m.m.color.copy(m.color); m.m.userData.u.amxSat.value = 1; }
    for (const m of it.realEdges) m.m.color.copy(m.color);
    it.edgeMat.color.copy(EDGE_ON);
    it.edgeMat.opacity = 0.8;

    it.a = 1;
    if (this.style === 'sketch') {
      if (!this.thumbSketch) {
        this.thumbSketch = new SketchPipeline(r);
        this.thumbSketch.setSize(size, size, 2);
        this.thumbSketch.setBackground(new THREE.Color(0xededeb));
      }
      this.thumbSketch.render(this.scene, cam, { hide: it.see, lines: it.edges, out: rt });
    } else if (real) {
      if (!this.thumbPipe) {
        this.thumbPipe = new StudioPipeline(r);
        this.thumbPipe.setSize(size, size);
        this.thumbPipe.fin.uniforms.uBg.value.set(0xededeb);
      }
      this.fitShadow(it);
      this.thumbPipe.render(this.scene, cam, { out: rt, grain: 0, bloom: 0, aoRadius: half * 0.05 });
    } else {
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      const bg = this.scene.background;
      this.scene.background = new THREE.Color(0xededeb);
      r.setRenderTarget(rt);
      r.render(this.scene, cam);
      this.scene.background = bg;
    }
    r.setRenderTarget(null);

    this.items.forEach((i, k) => { i.root.visible = saved[k]; });
    it.root.position.copy(pose.p);
    it.root.scale.setScalar(pose.s);
    it.tilt.rotation.set(pose.rx, pose.ry, 0);
    it.tilt.position.y = pose.ty;

    const px = new Uint8Array(size * size * 4);
    return r.readRenderTargetPixelsAsync(rt, 0, 0, size, size, px).then(() => {
      rt.dispose();
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(size, size);
      for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
      ctx.putImageData(img, 0, 0);
      return cv.toDataURL('image/webp', 0.9);
    });
  }
}
