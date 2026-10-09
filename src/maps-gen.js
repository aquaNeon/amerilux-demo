// Procedural surface maps (tileable; 1 tile = 9 in) as raw RGBA bytes. No three.js here: this runs
// in the maps worker (maps.worker.js) as well as on the main thread as a fallback.

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
export function deckMaps(palette) {
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
  return { S, map: C, normal: normalFrom(H, S, 4) };
}

// Painted cellular PVC: near-uniform colour with embossed cedar grain
export function claddingMaps(color) {
  const S = 512, H = new Float32Array(S * S), C = new Uint8Array(S * S * 4);
  const g1 = noise1(90, 21), g2 = noise1(260, 22), warp = noise2(5, 23), mott = noise2(8, 24), base = hex(color);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = (x + (warp((x / S) * 5, (y / S) * 5) - 0.5) * 60) / S, a = g1(u * 90), b = g2(u * 260), m = mott((x / S) * 8, (y / S) * 8);
    const o = (y * S + x) * 4, k = 1 + (a - 0.5) * 0.0125 + (m - 0.5) * 0.015;
    C[o] = Math.min(255, base[0] * k); C[o + 1] = Math.min(255, base[1] * k); C[o + 2] = Math.min(255, base[2] * k); C[o + 3] = 255;
    H[y * S + x] = Math.pow(a, 3) * 0.8 + b * 0.25;
  }
  return { S, map: C, normal: normalFrom(H, S, 4) };
}

// Hammered HDPE: dense shallow dimples (cell-distance bumps), uniform colour
export function hammeredMaps(color) {
  const S = 512, H = new Float32Array(S * S), C = new Uint8Array(S * S * 4), base = hex(color);
  const N = 48, r = rng(31), jit = Array.from({ length: N * N }, () => [r(), r()]), mott = noise2(8, 32);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const gx = (x / S) * N, gy = (y / S) * N, ix = Math.floor(gx), iy = Math.floor(gy);
    let d = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = (ix + i + N) % N, cy = (iy + j + N) % N, [jx, jy] = jit[cy * N + cx];
      d = Math.min(d, Math.hypot(ix + i + jx - gx, iy + j + jy - gy));
    }
    const o = (y * S + x) * 4, k = 1 + (mott((x / S) * 8, (y / S) * 8) - 0.5) * 0.08;
    C[o] = base[0] * k; C[o + 1] = base[1] * k; C[o + 2] = base[2] * k; C[o + 3] = 255;
    H[y * S + x] = Math.min(1, d) ** 2;
  }
  return { S, map: C, normal: normalFrom(H, S, 3) };
}

export const GENERATORS = { deckMaps, claddingMaps, hammeredMaps };
