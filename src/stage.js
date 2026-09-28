// WebGL carousel. Orthographic camera at 1 world unit = 1 CSS px so slot
// positions/sizes map straight onto the Figma layout (Concept 17, 1512 x 940).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PRODUCTS } from './products.js';

// Figma measurements, relative to the 1141px-wide left column
const DESIGN_W = 1141;
const SLOT_X = [0, 302, 528, 754, 980]; // distance of slot centre from active centre
const SMALL = { w: 174, h: 114 };
const BIG = { w: 326, h: 318 };
const ELEVATION = THREE.MathUtils.degToRad(34);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);
const wrap = (v, n) => ((((v + n / 2) % n) + n) % n) - n / 2;
const edgeCache = new WeakMap();
const EDGE_ON = new THREE.Color(0x1f2a28);
const EDGE_OFF = new THREE.Color(0x6b6b6b);
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

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
  return geo;
}

function slotX(p) {
  const a = Math.abs(p);
  const i = Math.min(Math.floor(a), SLOT_X.length - 2);
  const x = THREE.MathUtils.lerp(SLOT_X[i], SLOT_X[i + 1], a - i);
  return Math.sign(p) * x;
}

export class Stage {
  constructor(el, { slugs, modelBase, centerX = 0.505, centerY = 0.64, onChange }) {
    this.el = el;
    this.slugs = slugs;
    this.modelBase = modelBase;
    this.centerX = centerX;
    this.centerY = centerY;
    this.onChange = onChange;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'amx-canvas';
    el.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environmentIntensity = 0.55;
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-300, 600, 400);
    this.scene.add(key, new THREE.HemisphereLight(0xffffff, 0x9aa3a2, 0.5));

    this.camera = new THREE.OrthographicCamera();
    this.camera.position.set(0, Math.sin(ELEVATION), Math.cos(ELEVATION)).multiplyScalar(2000);
    this.camera.lookAt(0, 0, 0);
    this.camera.near = 1;
    this.camera.far = 5000;

    this.items = slugs.map((slug, index) => this.createItem(slug, index));
    this.current = 0;
    this.target = 0;
    this.active = 0;
    this.pointer = new THREE.Vector2(0, 0); // raw, NDC
    this.follow = new THREE.Vector2(0, 0); // spring-smoothed pointer driving the tilt
    this.followVel = new THREE.Vector2(0, 0);
    this.timer = new THREE.Timer();
    this.raycaster = new THREE.Raycaster();

    this.resize();
    new ResizeObserver(() => this.resize()).observe(el);
    this.bindPointer();
    this.bindVisibility();
    this.ready = this.loadParts().then(() => this.items.forEach((it) => this.buildItem(it)));
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // --- items ----------------------------------------------------------------

  createItem(slug, index) {
    const def = PRODUCTS[slug] || PRODUCTS['flat-sheets'];
    const root = new THREE.Group(); // slot position + scale
    const tilt = new THREE.Group(); // yaw + motion
    const content = new THREE.Group(); // centering
    root.add(tilt);
    tilt.add(content);
    root.visible = false;
    this.scene.add(root);
    return { slug, index, def, root, tilt, content, layers: [], materials: [], built: false, hover: 0, pop: 0 };
  }

  async loadParts() {
    const names = new Set(Object.values(PRODUCTS).flatMap((p) => p.parts || []));
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.parts = {};
    await Promise.all([...names].map(async (n) => {
      const gltf = await loader.loadAsync(`${this.modelBase}${n}.glb`);
      let mesh;
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
      this.parts[n] = bakeGeometry(mesh);
    }));
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
    // crisp outline pass: reads as a product illustration on the light background
    it.edgeMat = new THREE.LineBasicMaterial({ color: EDGE_ON, transparent: true, opacity: 0.75 });
    for (const o of meshes) {
      o.userData.item = it;
      mats.add(o.material);
      if (!edgeCache.has(o.geometry)) edgeCache.set(o.geometry, new THREE.EdgesGeometry(o.geometry, 28));
      const edges = new THREE.LineSegments(edgeCache.get(o.geometry), it.edgeMat);
      edges.raycast = () => {};
      o.add(edges);
    }
    it.materials = [...mats].map((m) => {
      const color = m.color.clone();
      const g = 0.62 + lum(color) * 0.3;
      return { m, color, grey: new THREE.Color(g, g, g), opacity: m.opacity };
    });
    this.measure(it);
    it.tilt.rotation.y = it.def.yaw;
    it.built = true;
    it.root.visible = true;
  }

  setExplode(it, e) {
    for (const l of it.layers) l.object.position.copy(l.home).addScaledVector(l.explode, e);
  }

  // screen-space extents (px per inch at scale 1) for assembled and exploded states
  measure(it) {
    const view = new THREE.Matrix4().makeRotationFromQuaternion(this.camera.quaternion.clone().invert());
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
    this.scale = THREE.MathUtils.clamp(w / DESIGN_W, 0.45, 1.5);
    const cx = w * this.centerX;
    const cy = h * this.centerY;
    Object.assign(this.camera, { left: -cx, right: w - cx, top: cy, bottom: cy - h });
    this.camera.updateProjectionMatrix();
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
          this.current = this.target = drag.start - dx / (SLOT_X[1] * this.scale);
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

  tick() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    if (!this.visible || document.hidden || !this.w) return;
    const t = this.timer.getElapsed();
    const n = this.items.length;

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
      it.pop += (1 - it.pop) * (1 - Math.exp(-dt * 4));

      // explode + recentre
      const e = ease(clamp01((a - 0.25) / 0.75));
      this.setExplode(it, e);
      it.content.position.lerpVectors(it.fit[0].center, it.fit[1].center, e).negate();

      // fit into slot
      const [f0, f1] = it.fit;
      const s0 = Math.min(SMALL.w / f0.w, SMALL.h / f0.h);
      const s1 = Math.min(BIG.w / f1.w, BIG.h / f1.h);
      const s = THREE.MathUtils.lerp(s0, s1, a) * this.scale * (0.85 + 0.15 * it.pop) * (1 + it.hover * 0.04);
      it.root.scale.setScalar(s);
      it.root.position.set(slotX(p) * this.scale, it.hover * 6, 0);
      it.root.visible = Math.abs(p) < 3.6;

      // motion: gentle idle sway on active, pointer parallax
      const sway = this.reduced ? 0 : Math.sin(t * 0.5) * 0.18 * a;
      it.tilt.rotation.y = it.def.yaw + sway + this.follow.x * 0.09 * a;
      it.tilt.rotation.x = -this.follow.y * 0.045 * a;
      it.tilt.position.y = this.reduced ? 0 : Math.sin(t * 0.9 + it.index) * 4 * a;

      // luminosity -> tint
      for (const m of it.materials) {
        m.m.color.copy(m.grey).lerp(m.color, a);
        if (m.m.transparent) m.m.opacity = THREE.MathUtils.lerp(Math.min(1, m.opacity + 0.2), m.opacity, a);
      }
      it.edgeMat.color.copy(EDGE_OFF).lerp(EDGE_ON, a);
      it.edgeMat.opacity = 0.45 + 0.35 * a;
    }
    this.renderer.render(this.scene, this.camera);
  }

  // --- thumbnails -------------------------------------------------------------
  // Renders one item in its active look to a data URL (used when a thumb has no src).

  snapshot(index, size = 204) {
    const it = this.items[index];
    if (!it?.built) return null;
    const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const cam = this.camera.clone();
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
    for (const m of it.materials) { m.m.color.copy(m.color); m.m.opacity = m.opacity; }
    const bg = this.scene.background;
    this.scene.background = new THREE.Color(0xededeb);

    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.scene, cam);
    const px = new Uint8Array(size * size * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
    this.renderer.setRenderTarget(null);

    this.scene.background = bg;
    this.items.forEach((i, k) => { i.root.visible = saved[k]; });
    it.root.position.copy(pose.p);
    it.root.scale.setScalar(pose.s);
    it.tilt.rotation.set(pose.rx, pose.ry, 0);
    it.tilt.position.y = pose.ty;
    rt.dispose();

    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/webp', 0.9);
  }
}
