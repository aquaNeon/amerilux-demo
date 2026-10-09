// "Sketch" look: clean technical line drawing, drawn in screen space.
//   pass A  solid products -> data target: R = simple lambert tone, GB = view normal xy, A = focus weight
//   pass B  every outline (incl. see-through sheets, multiwall ribs) -> same target, marked R = -1
//   post    single ink line (pass B feature lines + depth silhouettes) over paper-filled faces
//   down    the data target is supersampled (2x, 1.5x on 2x screens); this box-filters it to the
//           screen, which is what anti-aliases the lines
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
uniform float uNear, uFar, uOrtho;
uniform vec3 uBg, uInk, uPaper;
varying vec2 vUv;

float depthL(vec2 uv) {
  float d = texture2D(tDepth, uv).r;
  return uOrtho > 0.5 ? uNear + d * (uFar - uNear) : uNear * uFar / (uFar - d * (uFar - uNear));
}
// nearest depth over a pixel and its 4 neighbours: closes 1 px pinholes in imported meshes, which
// would otherwise each draw a dot (ortho: larger = farther)
float depthC(vec2 uv) {
  vec2 p = 1.0 / uRes;
  return min(min(min(depthL(uv), depthL(uv + vec2(p.x, 0.0))), min(depthL(uv - vec2(p.x, 0.0)), depthL(uv + vec2(0.0, p.y)))), depthL(uv - vec2(0.0, p.y)));
}
// outline strength around uv: drawn lines (pass B) thickened, plus silhouettes from depth breaks.
// Breaks are second differences: a sloped face (linear depth) gives none, so the threshold can sit
// low enough to keep small steps continuous (one corrugation rib passing in front of the next).
// (No normal-break edges: on curved, tessellated parts they double the feature lines.)
float stroke(vec2 uv) {
  vec2 o = 0.6 * uPx / uRes;
  float line = 0.0, hits = 0.0;
  // 3x3 pixel neighbourhood: thickens the 1 px line, and counts how many pixels it covers
  vec2 px1 = 1.0 / uRes;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 q = uv + vec2(float(x), float(y)) * px1;
    vec4 s = texture2D(tData, q);
    // skip line pixels seen through a 1 px crack in a nearer face (their depth is well behind the
    // pixels around them): hidden outlines would leak through as dots
    if (s.r < -0.5 && depthL(q) - depthC(q) < 3.0) { line = max(line, s.a * (x == 0 && y == 0 ? 1.0 : 0.45)); hits += 1.0; }
  }
  line *= step(1.5, hits); // a real line covers neighbouring pixels (incl. diagonal); lone pixels are depth noise
  float z2 = 2.0 * depthC(uv);
  vec2 dx = vec2(o.x * 1.3, 0.0), dy = vec2(0.0, o.y * 1.3);
  float dz = max(abs(depthC(uv + dx) + depthC(uv - dx) - z2), abs(depthC(uv + dy) + depthC(uv - dy) - z2));
  float w = max(texture2D(tData, uv).a, 0.25);
  return max(line, smoothstep(2.5, 6.0, dz) * w);
}
void main() {
  float ink = stroke(vUv);

  // solid faces: plain paper fill
  vec4 c = texture2D(tData, vUv);
  float solid = (c.r > -0.5 && texture2D(tDepth, vUv).r < 1.0) ? 1.0 : 0.0;

  vec3 col = mix(uBg, uPaper, solid * mix(0.35, 0.8, c.a));
  col = mix(col, uInk, clamp(ink, 0.0, 1.0) * 0.85);
  gl_FragColor = vec4(col, 1.0);
}`;

// 2x2 box over the supersampled drawing (4 bilinear taps, also fine for non-integer ratios)
const DOWN_FS = /* glsl */`
uniform sampler2D t;
uniform vec2 uStep; // a quarter of an output pixel, in uv
varying vec2 vUv;
void main() {
  gl_FragColor = 0.25 * (texture2D(t, vUv + vec2(-uStep.x, -uStep.y)) + texture2D(t, vUv + vec2(uStep.x, -uStep.y))
    + texture2D(t, vUv + vec2(-uStep.x, uStep.y)) + texture2D(t, vUv + vec2(uStep.x, uStep.y)));
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
    this.drawn = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }); // post output, before the downsample
    this.post = new THREE.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: {
        tData: { value: this.target.texture }, tDepth: { value: this.target.depthTexture },
        uRes: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 },
        uNear: { value: 1 }, uFar: { value: 2 }, uOrtho: { value: 1 },
        uBg: { value: new THREE.Color(0xf5f5f5) }, uInk: { value: new THREE.Color(0x2a2a2c) }, uPaper: { value: new THREE.Color(0xfcfcfa) },
      },
    });
    this.down = new THREE.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: DOWN_FS, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { t: { value: this.drawn.texture }, uStep: { value: new THREE.Vector2() } },
    });
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  // colours are display (sRGB) values; the post pass writes them straight out
  setBackground(color) { this.post.uniforms.uBg.value.copy(color).convertLinearToSRGB(); }

  // w, h: drawing-buffer pixels; px: drawing-buffer pixels per CSS px
  setSize(w, h, px = 1) {
    const ss = px >= 2 ? 1.5 : 2, W = Math.round(w * ss), H = Math.round(h * ss);
    this.target.setSize(W, H);
    this.drawn.setSize(W, H);
    this.post.uniforms.uRes.value.set(W, H);
    this.post.uniforms.uPx.value = px * ss;
    this.down.uniforms.uStep.value.set(0.25 / w, 0.25 / h);
  }

  // hide: objects to leave out of pass A (see-through sheets); lines: every outline object
  render(scene, cam, { hide = [], lines = [], out = null } = {}) {
    const r = this.r;
    const u = this.post.uniforms;
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

    this.quad.material = this.post;
    r.setRenderTarget(this.drawn);
    r.render(this.scene, this.cam);
    this.quad.material = this.down;
    r.setRenderTarget(out);
    r.render(this.scene, this.cam);
  }
}
