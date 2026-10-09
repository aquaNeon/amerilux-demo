// Photoreal render path, per frame:
//   1. scene -> main target
//   2. ambient occlusion from a half-res depth pass, depth-aware blur
//   3. bloom from the brightest highlights, half res
//   4. tone map, AO, bloom, grain, composite over the flat page colour
// Main target is half-float with 4x MSAA. AO reads depth from its own half-res, non-multisampled depth
// pass: multisampled depth lets the thin skins of hollow profiles (EZ Liner) show their inner webs as a
// dot pattern. 1x screens also supersample 1.5x. (FXAA was tried on the final image: it visibly softens
// everything, so it's out.)
import * as THREE from 'three';

const QUAD_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

// 9-tap gaussian as 5 linear-filtered fetches
const BLUR_FS = /* glsl */`
uniform sampler2D t;
uniform vec2 dir;
varying vec2 vUv;
void main() {
  vec4 s = texture2D(t, vUv) * 0.2270270270;
  s += texture2D(t, vUv + dir * 1.3846153846) * 0.3162162162;
  s += texture2D(t, vUv - dir * 1.3846153846) * 0.3162162162;
  s += texture2D(t, vUv + dir * 3.2307692308) * 0.0702702703;
  s += texture2D(t, vUv - dir * 3.2307692308) * 0.0702702703;
  gl_FragColor = s;
}`;

// keep only what's brighter than white (HDR highlights), soft knee
const BRIGHT_FS = /* glsl */`
uniform sampler2D t;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(t, vUv).rgb;
  float pk = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(0.95, 1.6, pk), 1.0);
}`;

// Scalable ambient obscurance in view space, normals rebuilt from depth
const AO_FS = /* glsl */`
uniform sampler2D tDepth;
uniform mat4 uProj, uInvProj;
uniform vec2 uRes;
uniform float uRadius, uIntensity;
varying vec2 vUv;
vec3 viewPos(vec2 uv) {
  vec4 p = uInvProj * vec4(vec3(uv, texture2D(tDepth, uv).r) * 2.0 - 1.0, 1.0);
  return p.xyz / p.w;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float d = texture2D(tDepth, vUv).r;
  if (d >= 1.0) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  vec3 N = normalize(cross(dFdx(P), dFdy(P)));
  if (dot(N, P) > 0.0) N = -N;
  float R2 = uRadius * uRadius;
  float rpx = uRadius * uProj[1][1] * 0.5 * uRes.y / (uProj[3][3] > 0.5 ? 1.0 : -P.z); // radius in pixels (ortho / perspective)
  float spin = hash(gl_FragCoord.xy) * 6.2831853;
  float A = 0.0;
  const int S = 12;
  for (int i = 0; i < S; i++) {
    float f = (float(i) + 0.5) / float(S);
    float ang = f * 6.2831853 * 3.0 + spin;
    vec3 v = viewPos(vUv + vec2(cos(ang), sin(ang)) * f * rpx / uRes) - P;
    float vv = dot(v, v);
    A += max(0.0, dot(v, N) / (sqrt(vv) + 1e-3) - 0.08) * max(0.0, 1.0 - vv / R2);
  }
  gl_FragColor = vec4(vec3(clamp(1.0 - uIntensity * A / float(S) * 2.0, 0.0, 1.0)), 1.0);
}`;

// separable blur that doesn't bleed AO across depth edges
const AO_BLUR_FS = /* glsl */`
uniform sampler2D t, tDepth;
uniform vec2 dir;
uniform float uNear, uFar, uOrtho;
varying vec2 vUv;
float lin(float d) { return uOrtho > 0.5 ? uNear + d * (uFar - uNear) : uNear * uFar / (uFar - d * (uFar - uNear)); }
void main() {
  float z0 = lin(texture2D(tDepth, vUv).r);
  float sum = 0.0, wsum = 0.0;
  for (int i = -3; i <= 3; i++) {
    vec2 uv = vUv + dir * float(i);
    float w = exp(-float(i * i) / 8.0) * exp(-abs(lin(texture2D(tDepth, uv).r) - z0) * 0.08);
    sum += texture2D(t, uv).r * w;
    wsum += w;
  }
  gl_FragColor = vec4(vec3(sum / wsum), 1.0);
}`;

const FINAL_FS = /* glsl */`
uniform sampler2D t, tAO, tBloom;
uniform float uTime, uGrain, uBloom;
uniform vec2 uRes;
uniform vec3 uBg;
varying vec2 vUv;
// Khronos PBR Neutral
vec3 neutral(vec3 c) {
  const float sc = 0.76, ds = 0.15;
  float x = min(c.r, min(c.g, c.b));
  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  c -= off;
  float pk = max(c.r, max(c.g, c.b));
  if (pk < sc) return c;
  const float d = 1.0 - sc;
  float np = 1.0 - d * d / (pk + d - sc);
  c *= np / pk;
  float g = 1.0 - 1.0 / (ds * (pk - np) + 1.0);
  return mix(c, vec3(np), g);
}
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 17.0) * 43758.5453); }
void main() {
  vec4 s = texture2D(t, vUv);
  float a = clamp(s.a, 0.0, 1.0);
  vec3 bloom = texture2D(tBloom, vUv).rgb * uBloom;
  vec3 c = clamp(neutral(s.rgb * texture2D(tAO, vUv).r * 1.02 + bloom), 0.0, 1.0) + uBg * (1.0 - a);
  c = srgb(clamp(c, 0.0, 1.0));
  c += (h(floor(vUv * uRes)) - 0.5) * uGrain * a;
  gl_FragColor = vec4(c, 1.0);
}`;

export class StudioPipeline {
  constructor(renderer) {
    this.r = renderer;
    this.ss = 1.5; // supersampling on <2x screens (on top of MSAA); Stage.adapt() drops it to 1 on slow GPUs
    const hf = { type: THREE.HalfFloatType };
    this.main = new THREE.WebGLRenderTarget(1, 1, { ...hf, samples: 4 });
    this.depth = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1, THREE.FloatType) });
    this.depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
    const half = () => new THREE.WebGLRenderTarget(1, 1, { ...hf, depthBuffer: false });
    this.a1 = half(); this.a2 = half(); // ambient occlusion
    this.b1 = half(); this.b2 = half(); // bloom
    this.white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.white.needsUpdate = this.black.needsUpdate = true;

    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    const mat = (fragmentShader, uniforms) => new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
    const depth = this.depth.depthTexture;
    this.blur = mat(BLUR_FS, { t: { value: null }, dir: { value: new THREE.Vector2() } });
    this.bright = mat(BRIGHT_FS, { t: { value: this.main.texture } });
    this.ao = mat(AO_FS, {
      tDepth: { value: depth }, uProj: { value: new THREE.Matrix4() }, uInvProj: { value: new THREE.Matrix4() },
      uRes: { value: new THREE.Vector2(1, 1) }, uRadius: { value: 16 }, uIntensity: { value: 1 },
    });
    this.aoBlur = mat(AO_BLUR_FS, { t: { value: null }, tDepth: { value: depth }, dir: { value: new THREE.Vector2() }, uNear: { value: 1 }, uFar: { value: 2 }, uOrtho: { value: 0 } });
    this.fin = mat(FINAL_FS, {
      t: { value: this.main.texture }, tAO: { value: this.white }, tBloom: { value: this.black },
      uTime: { value: 0 }, uGrain: { value: 0.022 }, uBloom: { value: 0.14 }, uRes: { value: new THREE.Vector2(1, 1) },
      uBg: { value: new THREE.Color(0xf5f5f5) },
    });
  }

  // w, h: drawing-buffer pixels
  setSize(w, h) {
    this.size = [w, h];
    const ss = devicePixelRatio >= 2 ? 1 : this.ss;
    this.main.setSize(Math.round(w * ss), Math.round(h * ss));
    this.hw = Math.max(1, Math.round(w * ss) >> 1);
    this.hh = Math.max(1, Math.round(h * ss) >> 1);
    for (const t of [this.depth, this.a1, this.a2, this.b1, this.b2]) t.setSize(this.hw, this.hh);
    this.ao.uniforms.uRes.value.set(this.hw, this.hh);
    this.fin.uniforms.uRes.value.set(w, h);
  }

  pass(material, target) {
    this.quad.material = material;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }

  blurPass(src, a, b, px) {
    const u = this.blur.uniforms;
    u.t.value = src; u.dir.value.set(px / this.hw, 0); this.pass(this.blur, a);
    u.t.value = a.texture; u.dir.value.set(0, px / this.hh); this.pass(this.blur, b);
    return b.texture;
  }

  // aoRadius: view-space units (CSS px at the focus plane)
  render(scene, cam, { ao = 1, aoRadius = 16, bloom = 0.14, grain = 0.022, time = 0, out = null } = {}) {
    const r = this.r;
    const autoClear = r.autoClear;
    r.autoClear = false;
    r.setClearColor(0x000000, 0);

    // 1. scene
    r.setRenderTarget(this.main);
    r.clear();
    r.render(scene, cam);

    // 2. ambient occlusion, from a depth-only pass of what the main pass writes depth for
    const f = this.fin.uniforms;
    if (ao > 0) {
      const hidden = [];
      scene.traverseVisible((o) => {
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if ((m && !m.depthWrite) || o.userData.noShadow) { o.visible = false; hidden.push(o); }
      });
      scene.overrideMaterial = this.depthMat;
      r.setRenderTarget(this.depth);
      r.clear();
      r.render(scene, cam);
      scene.overrideMaterial = null;
      for (const o of hidden) o.visible = true;

      const u = this.ao.uniforms;
      u.uProj.value.copy(cam.projectionMatrix);
      u.uInvProj.value.copy(cam.projectionMatrixInverse);
      u.uRadius.value = aoRadius;
      u.uIntensity.value = ao;
      this.pass(this.ao, this.a1);
      const b = this.aoBlur.uniforms;
      b.uNear.value = cam.near; b.uFar.value = cam.far; b.uOrtho.value = cam.isOrthographicCamera ? 1 : 0;
      b.t.value = this.a1.texture; b.dir.value.set(1.5 / this.hw, 0); this.pass(this.aoBlur, this.a2);
      b.t.value = this.a2.texture; b.dir.value.set(0, 1.5 / this.hh); this.pass(this.aoBlur, this.a1);
      f.tAO.value = this.a1.texture;
    } else f.tAO.value = this.white;

    // 3. bloom
    if (bloom > 0) {
      this.pass(this.bright, this.b1);
      this.blurPass(this.b1.texture, this.b2, this.b1, 2);
      f.tBloom.value = this.blurPass(this.b1.texture, this.b2, this.b1, 4);
    } else f.tBloom.value = this.black;

    // 4. final
    f.uBloom.value = bloom;
    f.uGrain.value = grain;
    f.uTime.value = time % 100;
    this.pass(this.fin, out);
    r.autoClear = autoClear;
  }
}
