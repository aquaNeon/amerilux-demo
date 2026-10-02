// Product catalogue for the 3D carousel.
// Keys match `data-amx-item="<slug>"` on the Webflow accordion items.
// Each builder returns layers: { object, explode: Vector3 } in inches, assembled at explode = 0.
// Procedural builds extrude 2D sections traced from the client's product PDFs
// (see PLACEHOLDERS.md for sources and what is still approximate).
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const MM = 1 / 25.4;

// Tints for the active state. Inactive state is the luminance of these (Figma: mix-blend-luminosity).
// Invented — no colour specs in the client files yet.
export const TINT = {
  clear: 0xa8d8cf,
  bronze: 0xb99d7f,
  opal: 0xe4e6e2,
  profile: 0xcfe3de,
  cladding: 0xdcdad4,
  deck: 0x8f7a68,
  well: 0xc4c8cb,
};

// Materials below are the illustrated (B&W) look; userData.finish names the photoreal one (FINISHES in materials.js).
// glow: which faces of a see-through sheet are its cut edges (see realMaterial)
const withFinish = (m, finish, glow) => Object.assign(m.userData, { finish, glow }) && m;

// Polycarbonate sheet. Clear and bronze are see-through; opal is milky and covers what's behind.
const SEE_THROUGH = new Set(['clear', 'bronze']);

export function polyMaterial(tint, opacity = 0.55, glow) {
  const see = SEE_THROUGH.has(tint);
  return withFinish(new THREE.MeshPhysicalMaterial({
    color: TINT[tint], roughness: 0.16, metalness: 0, transparent: see, opacity: see ? opacity : 1,
    clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide, depthWrite: !see,
  }), `poly-${tint}`, glow);
}

export function solidMaterial(tint, roughness, finish) {
  return withFinish(new THREE.MeshStandardMaterial({ color: TINT[tint], roughness, metalness: 0 }), finish);
}

// `edge`: crisp geometry for the B&W outlines when the rendered one is softened
const mesh = (geo, mat, edge) => {
  const m = new THREE.Mesh(geo, mat);
  if (edge) m.userData.edgeGeo = edge;
  return m;
};

// --- section helpers --------------------------------------------------------
// Sections are drawn in XY (x = across the product, y = thickness) and extruded along Z.

function centered(g) {
  g.computeBoundingBox();
  const c = g.boundingBox.getCenter(new THREE.Vector3());
  return g.translate(-c.x, -c.y, -c.z);
}

function extrude(shape, length) {
  return centered(new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 6 }));
}

const rect = (x, y, w, h, path = new THREE.Shape()) =>
  path.moveTo(x, y).lineTo(x + w, y).lineTo(x + w, y + h).lineTo(x, y + h).closePath();

const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

function shapeFrom(pts, holes = []) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  for (const h of holes) {
    const path = new THREE.Path();
    h.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
    path.closePath();
    s.holes.push(path);
  }
  return s;
}

// Round every corner of a closed polygon (quadratic fillet) so long edges catch a highlight like a real extrusion
function roundPts(pts, r, seg = 4) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    if (l1 < 1e-6 || l2 < 1e-6) { out.push(p); continue; }
    const u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2];
    const ang = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    if (ang > Math.PI - 0.05) { out.push(p); continue; }
    const t = Math.min(r / Math.tan(ang / 2), l1 * 0.45, l2 * 0.45);
    const p1 = [p[0] + u1[0] * t, p[1] + u1[1] * t], p2 = [p[0] + u2[0] * t, p[1] + u2[1] * t];
    for (let k = 0; k <= seg; k++) {
      const s = k / seg, q = 1 - s;
      out.push([q * q * p1[0] + 2 * q * s * p[0] + s * s * p2[0], q * q * p1[1] + 2 * q * s * p[1] + s * s * p2[1]]);
    }
  }
  return out;
}

// Softened extrusion (filleted corners r / hr on holes, bevelled ends) + the crisp one for outlines
function profile(pts, { holes = [], depth, r = 0, hr = 0, bevel = 0 }) {
  const edge = centered(new THREE.ExtrudeGeometry(shapeFrom(pts, holes), { depth, bevelEnabled: false }));
  const soft = new THREE.ExtrudeGeometry(shapeFrom(r ? roundPts(pts, r) : pts, holes.map((h) => (hr ? roundPts(h, hr) : h))), {
    depth: depth - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8,
    bevelOffset: -bevel * 0.8, bevelSegments: 3, curveSegments: 8,
  });
  return { geo: toCreasedNormals(centered(soft), 0.6), edge };
}

// polyline top surface -> sheet of thickness t
function sheetFromLine(pts, t) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  for (let i = pts.length - 1; i >= 0; i--) s.lineTo(pts[i][0], pts[i][1] - t);
  s.closePath();
  return s;
}

// APC multiwall: `walls` skins (2 twinwall, 3 triplewall) + ribs at `pitch`.
// Skins are translucent boxes; ribs are one merged mesh drawn as faint unlit stripes, no outlines
// (real rib faces stack up and shade dark).
function multiwallSheet(width, thick, pitch, walls, length, tint) {
  const skin = 0.9 * MM;
  const g = new THREE.Group();
  const skinGeo = new THREE.BoxGeometry(width, skin, length);
  const skinMat = polyMaterial(tint, 0.5, ['y', 'thin']);
  for (let w = 0; w < walls; w++) {
    const m = mesh(skinGeo, skinMat);
    m.position.y = -thick / 2 + skin / 2 + (w * (thick - skin)) / (walls - 1);
    g.add(m);
  }
  const cells = Math.floor(width / pitch);
  const ribs = [];
  for (let i = 0; i <= cells; i++) {
    const r = new THREE.BoxGeometry(0.7 * MM, thick, length);
    r.translate(-cells * pitch / 2 + i * pitch, 0, 0);
    ribs.push(r);
  }
  const ribMat = withFinish(new THREE.MeshBasicMaterial({ color: 0x1f2a28, transparent: true, opacity: 0.16, depthWrite: false }), `rib-${tint}`, ['x', 'thin']);
  const ribMesh = mesh(mergeGeometries(ribs), ribMat);
  ribMesh.userData.edges = 'none';
  // sketch linework: one line per rib along its top plus a tick at each cut end, and only every k-th rib
  // so lines stay >= ~0.6 in apart (dense ribs drawn as boxes moire into TV stripes)
  const k = Math.max(1, Math.ceil(0.6 / pitch));
  const seg = [];
  for (let i = 0; i <= cells; i += k) {
    const x = -cells * pitch / 2 + i * pitch, y = thick / 2, z = length / 2;
    seg.push(x, y, -z, x, y, z, x, y, z, x, -y, z, x, y, -z, x, -y, -z);
  }
  ribMesh.userData.sketchLines = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  g.add(ribMesh);
  return g;
}

// trapezoidal corrugation: valley, rise, crest, fall per pitch
function trapezoidLine(width, pitch, depth, crest, valley) {
  const run = (pitch - crest - valley) / 2;
  const pts = [];
  for (let x = 0; x < width - 1e-6; x += pitch) {
    pts.push([x, 0], [x + valley / 2, 0], [x + valley / 2 + run, depth], [x + valley / 2 + run + crest, depth], [x + pitch - valley / 2, 0]);
  }
  pts.push([width, 0]);
  return pts;
}

function sineLine(width, pitch, depth) {
  const n = Math.ceil((width / pitch) * 24);
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = (i / n) * width;
    return [x, (depth / 2) * (1 - Math.cos((x / pitch) * Math.PI * 2))];
  });
}

// --- procedural products ----------------------------------------------------

// APC "Amerilux Profiles": 16mm triplewall (20mm cells), 10mm twinwall, 6mm twinwall
function multiwall() {
  const W = 18, L = 14;
  const specs = [
    { t: 6, p: 6, walls: 2, c: 'bronze' },
    { t: 10, p: 10, walls: 2, c: 'opal' },
    { t: 16, p: 20, walls: 3, c: 'clear' },
  ];
  let y = 0;
  return specs.map((sp, i) => {
    const g = multiwallSheet(W, sp.t * MM, sp.p * MM, sp.walls, L, sp.c);
    g.position.set((i - 1) * 0.6, y + (sp.t * MM) / 2, (i - 1) * -0.6);
    y += sp.t * MM + 0.02;
    return { object: g, explode: V((i - 1) * 1.5, (i - 1) * 6, 0) };
  });
}

// APC: P2034 Greca 76 x 13.5, P2053 Sinus 2.67 (67.8 / 22.2), P2069 PBU 36 x 3/4
function corrugated() {
  const W = 18, L = 14, t = 1.4 * MM;
  const lines = [
    { pts: trapezoidLine(W, 304.8 * MM, 19.05 * MM, 25.4 * MM, 200 * MM), c: 'bronze' },
    { pts: sineLine(W, 67.8 * MM, 22.2 * MM), c: 'clear' },
    { pts: trapezoidLine(W, 76 * MM, 13.5 * MM, 25 * MM, 25 * MM), c: 'opal' },
  ];
  return lines.map(({ pts, c }, i) => {
    const edge = extrude(sheetFromLine(pts, t), L);
    const m = mesh(toCreasedNormals(edge.clone(), 0.5), polyMaterial(c, 0.62, ['z', 'caps']), edge);
    m.position.y = (i - 1) * 0.95;
    return { object: m, explode: V((i - 1) * 1.5, (i - 1) * 6, 0) };
  });
}

// No drawings supplied for flat sheet — generic solid sheets
function flatSheets() {
  const geo = new RoundedBoxGeometry(24, 0.4, 16, 3, 0.07);
  const edge = new THREE.BoxGeometry(24, 0.4, 16);
  return ['opal', 'bronze', 'clear'].map((c, i) => {
    const m = mesh(geo, polyMaterial(c, 0.6, ['y', 'thin']), edge);
    m.position.set((i - 1) * 0.4, (i - 1) * 0.3, (i - 1) * -0.4);
    return { object: m, explode: V((i - 1) * 1.5, (i - 1) * 7, 0) };
  });
}

// DuxxBak 1080 board: 7-5/16" overall, 5-3/4" body x 1-1/4", 4 cells, drainage flange under the next board
function duxxbakSection() {
  const H = 1.25, body = 5.75, flange = 7.3125 - body;
  const outer = [[0, 0], [flange + body, 0], [flange + body, H], [flange, H], [flange, 0.3], [0.3, 0.3], [0.3, 0.85], [0, 0.85]];
  const cellW = (body - 0.25 * 5) / 4;
  const holes = [0, 1, 2, 3].map((i) => rectPts(flange + 0.25 + i * (cellW + 0.25), 0.2, cellW, H - 0.4));
  return { outer, holes };
}

function decking() {
  const { outer, holes } = duxxbakSection();
  const { geo, edge } = profile(outer, { holes, depth: 26, r: 0.07, hr: 0.04, bevel: 0.02 });
  return [0, 1, 2, 3].map((i) => {
    const b = mesh(geo, solidMaterial('deck', 0.7, 'deck'), edge); // own material per board: grain differs
    b.position.x = (i - 1.5) * 6;
    return { object: b, explode: V((i - 1.5) * 2.2, (i - 1.5) * 1.6, 0) };
  });
}

// Elite lap siding: 8.31" x 0.795", 7.00" exposure, 1.31" lap
function lapSidingSection() {
  const t = 0.3, W = 8.31;
  return [
    [0, 0.795], [W, 0.795], [W, 0.795 - t * 0.55], [W - 1.31, 0.795 - t * 0.55], [W - 1.31, 0.795 - t], [1.9, 0.795 - t],
    [1.9, 0.06], [1.1, 0], [1.1, 0.12], [1.62, 0.16], [1.62, 0.795 - t], [0.35, 0.795 - t],
    [0.35, 0.795 - t - 0.12], [0.12, 0.795 - t - 0.12], [0, 0.795 - t * 0.2],
  ];
}

function sidingCladding() {
  const { geo, edge } = profile(lapSidingSection(), { depth: 22, r: 0.03, bevel: 0.014 });
  const mat = solidMaterial('cladding', 0.55, 'cladding');
  return [0, 1, 2].map((i) => {
    const m = mesh(geo, mat, edge);
    m.position.set((i - 1) * 7, 0, 0);
    return { object: m, explode: V((i - 1) * 2, (i - 1) * 4, 0) };
  });
}

// --- GLB-backed ------------------------------------------------------------
// Parts come out of tools/optimize.mjs centered, Y-up, in inches.

// Panel Systems (client meeting 2026-10-02): EZ Forms formwork and EZ Liner panels in one view, stacked
// above each other: the 16" / 18" / 16" EZ Liner panels lie flat at the bottom, interlocked edge to edge
// along Z, and the formwork wall (stackZ) stands above them; exploding lifts the formwork apart while the
// liner stays locked together.
const LINER_L = 14; // shown panel length, inches (exported liner section is 6" long, stretched)
function panelSystems(parts) {
  const layers = formwork(parts);
  for (const l of layers) l.explode.y += 6; // formwork lifts clear of the liner
  const cover = { '16-in-inner': 16, '18-in-inner': 18 };
  const names = ['16-in-inner', '18-in-inner', '16-in-inner'];
  const along = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 2); // width (x) -> z
  const total = names.reduce((s, n) => s + cover[n], 0);
  const bottom = parts['8-panel'].boundingBox.min.y;
  let z = -total / 2;
  names.forEach((n, i) => {
    const m = mesh(parts[n], solidMaterial('profile', 0.35, 'pvc-white'));
    m.quaternion.copy(along);
    m.scale.z = LINER_L / 6;
    m.position.set(0, bottom - 3, z + cover[n] / 2); // cover-width pitch: tongues interlock
    z += cover[n];
    layers.push({ object: m, explode: V(0, 0, 0) });
  });
  return layers;
}

// EZ Forms 8" formwork: profiles snap together along their 10.095" module (Z)
function stackZ(parts, names, gap, mat) {
  const sizes = names.map((n) => parts[n].boundingBox.getSize(new THREE.Vector3()));
  const total = sizes.reduce((s, v) => s + v.z, 0);
  let z = -total / 2;
  return names.map((n, i) => {
    const m = mesh(parts[n], mat());
    m.position.z = z + sizes[i].z / 2;
    z += sizes[i].z;
    const k = i - (names.length - 1) / 2;
    return { object: m, explode: V(0, k * gap * 0.35, k * gap) };
  });
}

function formwork(parts) {
  return stackZ(parts, ['8-in-fem', '8-panel', '4.5-in-spacer', '8-panel', '8-in-male'], 7, () => solidMaterial('profile', 0.38, 'pvc-form'));
}

// Specialty (client meeting 2026-10-02): window wells. PLACEHOLDER, no drawings yet: a semicircular
// corrugated steel well (40" wide, 20" projection, 30" tall) with bolt flanges, and a clear
// polycarbonate dome cover that lifts off when exploded. The foundation wall would sit at z = 0.
function windowWell() {
  const R = 20, H = 30, pitch = 3, amp = 0.45;
  const prof = [];
  for (let i = 0; i <= H * 4; i++) {
    const y = i / 4;
    prof.push(new THREE.Vector2(R + amp * Math.sin((y / pitch) * Math.PI * 2), y - H / 2));
  }
  const wallMat = solidMaterial('well', 0.4, 'steel-galv');
  wallMat.side = THREE.DoubleSide;
  const well = new THREE.Group();
  well.add(mesh(new THREE.LatheGeometry(prof, 48, -Math.PI / 2, Math.PI), wallMat));
  for (const sx of [-1, 1]) {
    const flange = mesh(new THREE.BoxGeometry(3.5, H, 0.12), wallMat);
    flange.position.set(sx * (R + 1.75), 0, 0.06);
    well.add(flange);
  }
  // dome: a quarter sphere (half of the upper hemisphere) flattened, closed against the wall by a half disc
  const r = R + 2, flat = 0.38;
  const dome = new THREE.SphereGeometry(r, 48, 14, 0, Math.PI, 0, Math.PI / 2);
  const back = new THREE.CircleGeometry(r, 48, 0, Math.PI);
  const coverGeo = mergeGeometries([dome, back]).scale(1, flat, 1);
  const cover = mesh(coverGeo, polyMaterial('clear', 0.6));
  cover.position.y = H / 2 + 0.3;
  return [
    { object: well, explode: V(0, 0, 0) },
    { object: cover, explode: V(0, 12, 2) },
  ];
}

// yaw: base rotation (rad) giving the Figma three-quarter view
export const PRODUCTS = {
  'multiwall-sheets': { build: multiwall, yaw: -0.62 },
  'corrugated-sheets': { build: corrugated, yaw: -0.62 },
  'flat-sheets': { build: flatSheets, yaw: -0.62 },
  'panel-systems': { build: panelSystems, yaw: 0.72, parts: ['16-in-inner', '18-in-inner', '8-in-fem', '8-panel', '4.5-in-spacer', '8-in-male'] },
  'decking-railing': { build: decking, yaw: -0.62 },
  'siding-cladding': { build: sidingCladding, yaw: -0.62 },
  'specialty-products': { build: windowWell, yaw: 0.55 },
};
