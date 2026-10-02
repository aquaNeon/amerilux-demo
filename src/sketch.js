// "Sketch" look: architectural graphite sketch, drawn in screen space.
//   pass A  solid products -> data target: R = simple lambert tone, GB = view normal xy, A = focus weight
//   pass B  every outline (incl. see-through sheets, multiwall ribs) -> same target, marked R = -1
//   post    wobbly double-stroke outlines (from pass B + depth/normal edges) on paper-filled faces,
//           chalky breakup
// Focus weight per object is set by Stage via onBeforeRender (uWeight).
import * as THREE from 'three';

const QUAD_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

// flat per-face normals from screen derivatives: smooth vertex normals on imported meshes wobble
// near inner webs, and the edge detector would draw that wobble as dotted lines
const MESH_VS = /* glsl */`
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const MESH_FS = /* glsl */`
uniform float uWeight;
varying vec3 vView;
void main() {
  vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
  float lam = 0.38 + 0.62 * max(dot(n, normalize(vec3(-0.6, 0.65, 0.5))), 0.0);
  gl_FragColor = vec4(lam, n.xy * 0.5 + 0.5, uWeight);
}`;
const LINE_FS = 'uniform float uWeight; void main() { gl_FragColor = vec4(-1.0, 0.5, 0.5, uWeight); }';

const POST_FS = /* glsl */`
uniform sampler2D tData, tDepth;
uniform vec2 uRes;      // target pixels
uniform float uPx;      // target pixels per CSS px
uniform float uSeed, uNear, uFar, uOrtho;
uniform vec3 uBg, uInk, uPaper;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float depthL(vec2 uv) {
  float d = texture2D(tDepth, uv).r;
  return uOrtho > 0.5 ? uNear + d * (uFar - uNear) : uNear * uFar / (uFar - d * (uFar - uNear));
}
// hand wobble: low-frequency displacement in CSS px, re-seeded per "frame" of the boil
vec2 wobble(vec2 uv, float seed, float amp) {
  vec2 p = uv * uRes / uPx / 70.0 + seed * 17.13;
  return uv + (vec2(vnoise(p), vnoise(p + 31.7)) - 0.5) * amp * uPx / uRes;
}
// outline strength around uv: drawn lines (pass B) thickened, plus depth / normal breaks
float stroke(vec2 uv) {
  vec2 o = 0.6 * uPx / uRes;
  float line = 0.0, hits = 0.0;
  vec4 c = texture2D(tData, uv);
  // 3x3 pixel neighbourhood: thickens the 1 px line, and counts how many pixels it covers
  vec2 px1 = 1.0 / uRes;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec4 s = texture2D(tData, uv + vec2(float(x), float(y)) * px1);
    if (s.r < -0.5) { line = max(line, s.a * (x == 0 && y == 0 ? 1.0 : 0.45)); hits += 1.0; }
  }
  line *= step(1.5, hits); // a real line covers neighbouring pixels (incl. diagonal); lone pixels are depth noise
  float z = depthL(uv), dz = 0.0, dn = 0.0;
  vec2 n0 = c.gb;
  for (int i = 0; i < 4; i++) {
    vec2 d = vec2(i == 0 ? 1.0 : i == 1 ? -1.0 : 0.0, i == 2 ? 1.0 : i == 3 ? -1.0 : 0.0) * o * 1.3;
    dz = max(dz, abs(depthL(uv + d) - z));
    vec4 s = texture2D(tData, uv + d);
    if (s.r > -0.5 && c.r > -0.5) dn = max(dn, length(s.gb - n0));
  }
  float w = max(c.a, 0.25);
  float edge = max(smoothstep(6.0, 14.0, dz), smoothstep(0.18, 0.35, dn)) * w;
  return max(line, edge);
}
void main() {
  vec2 px = vUv * uRes / uPx; // CSS px
  float grain = vnoise(px * 1.3) * 0.6 + vnoise(px * 0.37 + 5.0) * 0.4;
  float tooth = smoothstep(0.18, 0.55, grain);

  // two slightly different passes of the pencil
  float s1 = stroke(wobble(vUv, uSeed, 2.2));
  float s2 = stroke(wobble(vUv, uSeed + 3.7, 2.6) + vec2(0.6, -0.4) * uPx / uRes);
  float ink = max(s1, s2 * 0.45) * mix(0.5, 1.0, tooth);

  // solid faces: plain paper fill (no hatching)
  vec4 c = texture2D(tData, vUv);
  float solid = (c.r > -0.5 && texture2D(tDepth, vUv).r < 1.0) ? 1.0 : 0.0;

  vec3 col = mix(uBg, uPaper, solid * mix(0.35, 0.8, c.a));
  col = mix(col, uInk, clamp(ink, 0.0, 1.0) * 0.8);
  gl_FragColor = vec4(col, 1.0);
}`;

export class SketchPipeline {
  constructor(renderer) {
    this.r = renderer;
    // nearest: line markers (R = -1) must not blend with neighbours when sampled
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.FloatType),
    });
    this.meshMat = new THREE.ShaderMaterial({
      vertexShader: MESH_VS, fragmentShader: MESH_FS, uniforms: { uWeight: { value: 1 } },
      side: THREE.DoubleSide,
    });
    this.lineMat = new THREE.ShaderMaterial({
      // a hair toward the camera so outlines win against their own faces, but far less than the
      // 0.035 in skins of hollow profiles, so inner webs stay hidden
      vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z -= 2e-5 * gl_Position.w; }',
      fragmentShader: LINE_FS, uniforms: { uWeight: { value: 1 } }, depthWrite: false,
    });
    this.post = new THREE.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: {
        tData: { value: this.target.texture }, tDepth: { value: this.target.depthTexture },
        uRes: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 }, uSeed: { value: 0 },
        uNear: { value: 1 }, uFar: { value: 2 }, uOrtho: { value: 1 },
        uBg: { value: new THREE.Color(0xf5f5f5) }, uInk: { value: new THREE.Color(0x2a2a2c) }, uPaper: { value: new THREE.Color(0xfcfcfa) },
      },
    });
    this.scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    quad.frustumCulled = false;
    this.scene.add(quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  // colours are display (sRGB) values; the post pass writes them straight out
  setBackground(color) { this.post.uniforms.uBg.value.copy(color).convertLinearToSRGB(); }

  // w, h: drawing-buffer pixels; px: drawing-buffer pixels per CSS px
  setSize(w, h, px = 1) {
    this.target.setSize(w, h);
    this.post.uniforms.uRes.value.set(w, h);
    this.post.uniforms.uPx.value = px;
  }

  // hide: objects to leave out of pass A (see-through sheets); lines: every outline object
  render(scene, cam, { hide = [], lines = [], time = 0, boil = false, out = null } = {}) {
    const r = this.r;
    const u = this.post.uniforms;
    u.uSeed.value = boil ? Math.floor(time * 6) : 0; // optional hand-drawn "boil": 6 redraws a second
    u.uNear.value = cam.near; u.uFar.value = cam.far; u.uOrtho.value = cam.isOrthographicCamera ? 1 : 0;

    const linesVis = lines.map((l) => l.visible);
    const shadow = r.shadowMap.enabled;
    r.shadowMap.enabled = false;
    r.setRenderTarget(this.target);
    r.setClearColor(0x000000, 0);
    r.clear();

    hide.forEach((o) => { o.visible = false; });
    lines.forEach((l) => { l.visible = false; });
    scene.overrideMaterial = this.meshMat;
    r.render(scene, cam);
    hide.forEach((o) => { o.visible = true; });

    lines.forEach((l) => { l.visible = true; });
    scene.overrideMaterial = this.lineMat;
    const layers = cam.layers.mask;
    cam.layers.set(1);
    const autoClear = r.autoClear;
    r.autoClear = false;
    r.render(scene, cam);
    r.autoClear = autoClear;
    cam.layers.mask = layers;
    scene.overrideMaterial = null;
    lines.forEach((l, i) => { l.visible = linesVis[i]; });
    r.shadowMap.enabled = shadow;

    r.setRenderTarget(out);
    r.render(this.scene, this.cam);
  }
}
