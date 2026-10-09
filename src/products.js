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
// Hex values from the client's CMF sheet ("AmeriLux – 3D Render Material Specs", 2026-10-09) where it gives
// one; clear / white products are nudged off pure white so the illustrated look keeps some shading.
export const TINT = {
  clear: 0xa8d8cf,
  flat: 0xc4e0dc, // clear flat sheet / cover, 98% light transmission
  bronze: 0x8a7460,
  opal: 0xe4e6e2,
  profile: 0xcfe3de,
  pvc: 0xe8e9e6, // Agrilite MR9 Ultra White
  klar: 0xf5f5f2, // KLAR skin
  core: 0x202020, // KLAR co-extruded thermoacoustic core
  hdpe: 0x151515,
  cladding: 0xefefef,
  deck: 0xb7b7b7, // Driftwood / Boardwalk Gray
  well: 0xbcbbb5,
};

// Materials below are the illustrated (B&W) look; userData.finish names the photoreal one (FINISHES in materials.js).
// glow: which faces of a see-through sheet are its cut edges (see realMaterial)
const withFinish = (m, finish, glow) => Object.assign(m.userData, { finish, glow }) && m;

// Polycarbonate sheet. Clear and bronze are see-through; opal is milky and covers what's behind.
const SEE_THROUGH = new Set(['clear', 'flat', 'bronze']);

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

// Round every corner of a closed polygon (quadratic fillet) so long edges catch a highlight like a real extrusion.
// Open polylines (closed = false) keep their end points.
function roundPts(pts, r, seg = 4, closed = true) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) { out.push(pts[i]); continue; }
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

// polyline moved d along its downward normal (so sloped webs keep their thickness)
function offsetLine(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [p[0] + (ty / l) * d, p[1] - (tx / l) * d];
  });
}

// polyline top surface -> sheet of thickness t
function sheetFromLine(pts, t) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const bottom = offsetLine(pts, t);
  for (let i = bottom.length - 1; i >= 0; i--) s.lineTo(...bottom[i]);
  s.closePath();
  return s;
}

// APC multiwall, cell layout from the APC section DWGs (mm): skins [centre height, thickness], ribs at
// `pitch`, and for X-wall diagonal webs in every bay (mid-height at one rib to the outer skins at the next,
// alternating, so neighbouring bays form diamonds). Walls are drawn at least VIS thick (real ones are
// 0.1-0.6mm, sub-pixel at carousel size).
// Skins are translucent boxes; ribs and webs are one merged mesh drawn as faint unlit stripes, no outlines
// (real rib faces stack up and shade dark).
const VIS = { skin: 0.6, rib: 0.5 };
function multiwallSheet(width, length, tint, { thick, pitch, skins, rib, cross }) {
  const g = new THREE.Group();
  const skinMat = polyMaterial(tint, 0.5, ['y', 'thin']);
  for (const [y, t] of skins) {
    const m = mesh(new THREE.BoxGeometry(width, Math.max(t, VIS.skin) * MM, length), skinMat);
    m.position.y = (y - thick / 2) * MM;
    g.add(m);
  }
  const cells = Math.floor(width / (pitch * MM));
  const x0 = (-cells * pitch * MM) / 2, ribs = [];
  for (let i = 0; i <= cells; i++) {
    const r = new THREE.BoxGeometry(Math.max(rib, VIS.rib) * MM, thick * MM, length);
    r.translate(x0 + i * pitch * MM, 0, 0);
    ribs.push(r);
  }
  if (cross) {
    const inner = (thick / 2 - skins[0][1]) * MM, run = pitch * MM, len = Math.hypot(run, inner), ang = Math.atan2(inner, run);
    for (let i = 0; i < cells; i++) {
      const mid = i % 2 ? x0 + i * run : x0 + (i + 1) * run; // the rib holding the mid-height end
      for (const sy of [1, -1]) {
        const w = new THREE.BoxGeometry(len, Math.max(cross, VIS.rib) * MM, length);
        w.rotateZ((i % 2 ? sy : -sy) * ang);
        w.translate(mid + (i % 2 ? run / 2 : -run / 2), (sy * inner) / 2, 0);
        ribs.push(w);
      }
    }
  }
  const ribMat = withFinish(new THREE.MeshBasicMaterial({ color: 0x1f2a28, transparent: true, opacity: 0.16, depthWrite: false }), `rib-${tint}`, ['x', 'thin']);
  const ribMesh = mesh(mergeGeometries(ribs), ribMat);
  ribMesh.userData.edges = 'none';
  // sketch linework: one line per rib along its top plus a tick at each cut end, and only every k-th rib
  // so lines stay >= ~0.6 in apart (dense ribs drawn as boxes moire into TV stripes)
  const k = Math.max(1, Math.ceil(0.6 / (pitch * MM)));
  const seg = [];
  for (let i = 0; i <= cells; i += k) {
    const x = x0 + i * pitch * MM, y = (thick / 2) * MM, z = length / 2;
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
  // cut the last rib at the sheet edge (it would run past and fold back, z-fighting at the end)
  const i = pts.findIndex(([x]) => x >= width);
  if (i < 0) return [...pts, [width, 0]];
  const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
  return [...pts.slice(0, i), [width, y0 + ((y1 - y0) * (width - x0)) / (x1 - x0)]];
}

// Agrilite MR9 (Vision Dominion X1106, inches): major ribs at 9" (1.806" base, 0.318" crest, 0.785" tall)
// with two minor stiffeners per bay (1.35" base, 0.694" top, 0.114" tall), corners filleted
function mr9Line(width) {
  const bump = (c, base, top, h) => [[c - base / 2, 0], [c - top / 2, h], [c + top / 2, h], [c + base / 2, 0]];
  const pts = [[0, 0]];
  for (let c = 1.5; c < width; c += 9) {
    for (const [cx, rib] of [[c, [1.806, 0.318, 0.785]], [c + 3, [1.35, 0.694, 0.114]], [c + 6, [1.35, 0.694, 0.114]]]) {
      if (cx + rib[0] / 2 < width) pts.push(...bump(cx, ...rib));
    }
  }
  pts.push([width, 0]);
  return roundPts(pts, 0.1, 4, false);
}

function sineLine(width, pitch, depth) {
  const n = Math.ceil((width / pitch) * 24);
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = (i / n) * width;
    return [x, (depth / 2) * (1 - Math.cos((x / pitch) * Math.PI * 2))];
  });
}

// --- procedural products ----------------------------------------------------

// AmeriLite MW Pro (CMF sheet): 25mm 5 X-wall bronze, 16mm triplewall opal, 8mm twinwall clear.
// Cells from the APC DWGs (8mm Twinwall / 16mm Triplewall / 25mm X wall APC.dwg)
function multiwall() {
  const W = 18, L = 14;
  const specs = [
    { c: 'bronze', thick: 25, pitch: 10, rib: 0.3, cross: 0.15, skins: [[0.5, 1], [12.5, 0.1], [24.5, 1]] },
    { c: 'opal', thick: 16, pitch: 20, rib: 0.5, skins: [[0.3, 0.6], [8, 0.2], [15.7, 0.6]] },
    { c: 'clear', thick: 8, pitch: 10, rib: 0.4, skins: [[0.2, 0.4], [7.8, 0.4]] },
  ];
  let y = 0;
  return specs.map((sp, i) => {
    const g = multiwallSheet(W, L, sp.c, sp);
    g.position.set((i - 1) * 0.6, y + (sp.thick * MM) / 2, (i - 1) * -0.6);
    y += sp.thick * MM + 0.02;
    return { object: g, explode: V((i - 1) * 1.5, (i - 1) * 6, 0) };
  });
}

// CMF sheet: Agrilite MR9 (white PVC, 0.89mm), KLAR TK6S (white PVC, black core, 2mm), AmeriLite CS Pro (clear PC, 0.8mm).
// Thickness from the sheet, x1.75 so it reads at carousel size. Profiles: MR9 from Agrilite MR9-X1106.pdf,
// TK6S from TK6S.dwg (176mm ribs, 42.5mm tall, 25mm crest, 116mm valley). CS Pro has no drawing yet:
// stand-in APC P2053 Sinus 2.67
function corrugated() {
  const W = 18, L = 14, EX = 1.75;
  const tk6s = trapezoidLine(W, 176 * MM, 42.5 * MM, 25 * MM, 116 * MM);
  const csPro = sineLine(W, 67.8 * MM, 22.2 * MM);
  const sheet = (pts, t, mat) => {
    const edge = extrude(sheetFromLine(pts, t), L);
    return mesh(toCreasedNormals(edge.clone(), 0.5), mat, edge);
  };
  // KLAR: white skins over a black core (thirds of the 2mm), so the core shows on the cut ends.
  // Layers are offset along the profile normal and centred together (extrude() would centre each alone)
  const klar = new THREE.Group(), kt = (2 * MM * EX) / 3, geos = [];
  [['klar', 'pvc-klar'], ['core', 'pvc-core'], ['klar', 'pvc-klar']].forEach(([tint, finish], k) => {
    const geo = new THREE.ExtrudeGeometry(sheetFromLine(offsetLine(tk6s, k * kt), kt), { depth: L, bevelEnabled: false });
    geos.push(geo);
    const m = klar.add(mesh(geo, solidMaterial(tint, 0.6, finish))).children[k];
    if (k > 0) {
      m.userData.noCast = true; // inner layers would shadow the top skin from inside (acne along the crests)
      m.userData.edges = 'none'; // and their outlines poke through it as dots
    }
  });
  const c = new THREE.Box3().setFromObject(klar).getCenter(new THREE.Vector3());
  for (const geo of geos) geo.translate(-c.x, -c.y, -c.z);
  for (const m of klar.children) { m.userData.edgeGeo = m.geometry; m.geometry = toCreasedNormals(m.geometry.clone(), 0.5); }
  const layers = [
    sheet(mr9Line(W), 0.89 * MM * EX, solidMaterial('pvc', 0.25, 'pvc-gloss')),
    sheet(csPro, 0.8 * MM * EX, polyMaterial('clear', 0.62, ['z', 'caps'])),
    klar,
  ];
  return layers.map((m, i) => {
    m.position.y = (i - 1) * 1.1;
    return { object: m, explode: V((i - 1) * 1.5, (i - 1) * 6, 0) };
  });
}

// CMF sheet: black HDPE 0.220" (hammered), clear polycarbonate 0.093", clear acrylic 0.118".
// No drawings (plain sheet); thickness x1.6 so it reads at carousel size
function flatSheets() {
  const EX = 1.6;
  const specs = [
    { t: 0.22, mat: () => solidMaterial('hdpe', 0.6, 'hdpe-black') },
    { t: 0.118, mat: () => polyMaterial('flat', 0.6, ['y', 'thin']), finish: 'acrylic-clear' },
    { t: 0.093, mat: () => polyMaterial('flat', 0.6, ['y', 'thin']) },
  ];
  return specs.map(({ t, mat, finish }, i) => {
    const h = t * EX, m = mesh(new RoundedBoxGeometry(24, h, 16, 3, Math.min(0.07, h * 0.3)), mat(), new THREE.BoxGeometry(24, h, 16));
    if (finish) m.material.userData.finish = finish;
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
    const b = mesh(geo, solidMaterial('deck', 0.8, 'deck'), edge); // own material per board: grain differs
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
  const mat = solidMaterial('cladding', 0.6, 'cladding');
  return [0, 1, 2].map((i) => {
    const m = mesh(geo, mat, edge);
    m.userData.noShadow = true; // no shadows / AO: the boards' laps read as dark smears
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
// Outline crease angle for the EZ parts: their filleted corners are a few facets each just over the
// default 28 deg, which drew as bundles of near-parallel lines that shimmer while the product sways
const FILLET_EDGE = 50;
// EZ Liner is hollow: its inner webs' edges run just under the thin top skin and leak through cracks
// in the imported mesh as dotted rows. Keep only edges on the outer skins (y) and at the cut ends (z).
const shellEdges = (bb, eps = 0.01) => {
  const outer = (v) => v.y < bb.min.y + eps || v.y > bb.max.y - eps;
  const end = (v) => v.z < bb.min.z + eps || v.z > bb.max.z - eps;
  return (a, b) => (outer(a) && outer(b)) || (end(a) && end(b));
};
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
    m.userData.edgeAngle = FILLET_EDGE;
    m.userData.edgeKeep = shellEdges(parts[n].boundingBox);
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
    m.userData.edgeAngle = FILLET_EDGE;
    m.position.z = z + sizes[i].z / 2;
    z += sizes[i].z;
    const k = i - (names.length - 1) / 2;
    return { object: m, explode: V(0, k * gap * 0.35, k * gap) };
  });
}

function formwork(parts) {
  return stackZ(parts, ['8-in-fem', '8-panel', '4.5-in-spacer', '8-panel', '8-in-male'], 7, () => solidMaterial('profile', 0.38, 'pvc-form'));
}

// Specialty: window wells, from the manufacturer's STEP files (2026-10-09; tessellated by FreeCAD,
// see PLACEHOLDERS.md): egress well 5036 (50" x 36", 58.6" deep) and Premium Square Flat cover 5237,
// a clear polycarbonate panel with a mounting rail + knobs along the wall edge.
// Both files share one frame: foundation wall at z = 0, well projecting to -z, rim at y = 0. Turned
// half a turn so the well projects toward the viewer like the other products.
function windowWell(parts) {
  const turn = (m) => { m.rotation.y = Math.PI; return m; };
  const wallMat = solidMaterial('well', 0.4, 'steel-galv');
  wallMat.side = THREE.DoubleSide;
  const well = turn(mesh(parts['egress-well'], wallMat));
  well.userData.edgeAngle = 40; // rounded corrugations: at 28 deg their outlines break into dashes
  const cover = turn(new THREE.Group());
  // The cover's rounded ribs sit near the 28 deg crease angle, so their outlines follow the tessellation
  // and break into dashes / zigzags: outline only the rim (60 deg), and none in photoreal
  cover.add(Object.assign(mesh(parts['well-cover'], polyMaterial('flat', 0.6, ['y', 'thin'])), { userData: { realEdges: false, edgeAngle: 60 } }));
  cover.add(mesh(parts['well-cover-rail'], solidMaterial('well', 0.4, 'steel-galv')));
  return [
    { object: well, explode: V(0, 0, 0) },
    { object: cover, explode: V(0, 16, 3) },
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
  'specialty-products': { build: windowWell, yaw: 0.55, parts: ['egress-well', 'well-cover', 'well-cover-rail'] },
};
