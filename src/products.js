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
  connector: 0x9a9fa2, // AuraLok: aluminium (no spec given), mid grey in the illustrated styles
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
// Open polylines (closed = false) keep their end points. A third value on a point overrides r for that corner.
// `guard`: extra point on each side of a fillet, so creased normals bend only there and long flat faces stay flat
// (otherwise the fillet's normal is interpolated across the whole face and shades it as a gradient).
function roundPts(pts, r, seg = 4, closed = true, guard = false) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) { out.push(pts[i]); continue; }
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    const rr = p[2] ?? r;
    if (l1 < 1e-6 || l2 < 1e-6 || !rr) { out.push([p[0], p[1]]); continue; }
    const u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2];
    const ang = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    if (ang > Math.PI - 0.05) { out.push([p[0], p[1]]); continue; }
    const t = Math.min(rr / Math.tan(ang / 2), l1 * 0.45, l2 * 0.45);
    const p1 = [p[0] + u1[0] * t, p[1] + u1[1] * t], p2 = [p[0] + u2[0] * t, p[1] + u2[1] * t];
    if (guard && 2 * t < l1 * 0.5) out.push([p[0] + u1[0] * 2 * t, p[1] + u1[1] * 2 * t]);
    for (let k = 0; k <= seg; k++) {
      const s = k / seg, q = 1 - s;
      out.push([q * q * p1[0] + 2 * q * s * p[0] + s * s * p2[0], q * q * p1[1] + 2 * q * s * p[1] + s * s * p2[1]]);
    }
    if (guard && 2 * t < l2 * 0.5) out.push([p[0] + u2[0] * 2 * t, p[1] + u2[1] * 2 * t]);
  }
  return out;
}

// Softened extrusion (filleted corners r / hr on holes, bevelled ends) + the crisp one for outlines
function profile(pts, { holes = [], depth, r = 0, hr = 0, bevel = 0 }) {
  const edge = centered(new THREE.ExtrudeGeometry(shapeFrom(pts, holes), { depth, bevelEnabled: false }));
  const round = (p, rr) => (p.some((q) => q[2]) ? roundPts(p, rr, 4, true, true) : rr ? roundPts(p, rr) : p);
  const soft = new THREE.ExtrudeGeometry(shapeFrom(round(pts, r), holes.map((h) => round(h, hr))), {
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
function multiwallSheet(width, length, tint, { thick, pitch, skins, rib, cross, catchShadow }) {
  const g = new THREE.Group();
  const skinMat = polyMaterial(tint, 0.5, ['y', 'thin']);
  skins.forEach(([y, t], i) => {
    const m = mesh(new THREE.BoxGeometry(width, Math.max(t, VIS.skin) * MM, length), skinMat);
    m.position.y = (y - thick / 2) * MM;
    // only the top skin casts (opal): layers a hair apart inside one sheet make it shade itself
    if (i < skins.length - 1) m.userData.noCast = true;
    g.add(m);
  });
  if (catchShadow) {
    // a see-through skin barely shows a shadow (it is mostly what is behind it), so a shadow-only plane
    // on top carries it: the opal sheet above looks solid and should shade the bronze one
    const c = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.ShadowMaterial({ opacity: catchShadow, depthWrite: false }));
    c.rotation.x = -Math.PI / 2;
    c.position.y = (thick / 2) * MM + 0.01;
    c.receiveShadow = true;
    c.userData.catcher = true;
    c.raycast = () => {}; // clicks go to the sheet
    g.add(c);
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
  ribMesh.userData.noCast = true;
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

// "Sine wave" as drawn (Amerilux Profiles-Current.pdf, P2053 Sinus 2.67): crest and valley arcs of
// radius r joined by straight flanks, not a true sine. Starts in a valley at x = 0.
function arcWaveLine(width, pitch, depth, r) {
  // flank = inner tangent of the valley circle (centre (0, r)) and the crest circle
  // (centre (pitch / 2, depth - r)); it touches each circle at horizontal offset a from its centre
  const dx = pitch / 2, dy = depth - 2 * r, d = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx) - Math.acos((2 * r) / d); // valley radius to the tangent point
  const a = r * Math.cos(ang);
  const valley = (v) => r - Math.sqrt(Math.max(0, r * r - v * v));
  const crest = (s) => depth - r + Math.sqrt(Math.max(0, r * r - s * s));
  const y = (x) => {
    const w = ((x % pitch) + pitch) % pitch, v = Math.min(w, pitch - w); // distance to nearest valley
    if (v <= a) return valley(v);
    if (v >= dx - a) return crest(dx - v);
    return valley(a) + ((v - a) / (dx - 2 * a)) * (crest(a) - valley(a));
  };
  const n = Math.ceil((width / pitch) * 48);
  return Array.from({ length: n + 1 }, (_, i) => [(i / n) * width, y((i / n) * width)]);
}

// --- procedural products ----------------------------------------------------

// AmeriLite MW Pro (CMF sheet): 25mm 5 X-wall bronze, 16mm triplewall opal, 8mm twinwall clear.
// Cells from the APC DWGs (8mm Twinwall / 16mm Triplewall / 25mm X wall APC.dwg)
function multiwall() {
  const W = 18, L = 14;
  const specs = [
    { c: 'bronze', thick: 25, pitch: 10, rib: 0.3, cross: 0.15, skins: [[0.5, 1], [12.5, 0.1], [24.5, 1]], catchShadow: 0.45 },
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
// TK6S from TK6S.dwg (176mm ribs, 42.5mm tall, 25mm crest, 116mm valley), CS Pro from the "sine wave"
// P2053 Sinus 2.67 in Amerilux Profiles-Current.pdf (67.8mm pitch, 22.2mm deep, R12.7 crests and valleys;
// the client's pick, 2026-10-09)
function corrugated() {
  const W = 18, L = 14, EX = 1.75;
  const tk6s = trapezoidLine(W, 176 * MM, 42.5 * MM, 25 * MM, 116 * MM);
  const csPro = arcWaveLine(W, 67.8 * MM, 22.2 * MM, 12.7 * MM);
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

// DuxxBak 1080 board, measured off the drawing in `1080-DuxxBak-Board.pdf` (pixel coords of its 1490 px image,
// scaled by the 5-3/4" and 1-1/4" dimensions). 7-5/16" overall, 3 closed cells. The gutter (base plate + fin) runs
// under the next board: the right edge is a hook (open slot over the neighbour's fin, leg standing on its base plate,
// groove taking the tongue), so boards lay at a 5-3/4" pitch with the top faces meeting.
const DUXX_PITCH = 5.75;
function duxxbakSection() {
  const sx = 5.75 / 862, sy = 1.25 / 190;
  const P = ([x, y, r]) => [(x - 93) * sx, (372 - y) * sy, r * sx];
  const outer = [
    [93, 372, 9], [952, 372, 34], [952, 221, 9], [1112, 221, 9], [1112, 333, 9], // base plate, slot over the next fin
    [1188, 333, 9], [1188, 296, 8], [1152, 296, 8], [1152, 258, 8], [1188, 258, 8], // leg + groove
    [1188, 228, 4], [1179, 214, 4], [1179, 182, 29], [326, 182, 28], // drip kink, top face
    [326, 258, 6], [289, 258, 8], [289, 296, 8], [326, 296, 6], // tongue
    [326, 333, 9], [185, 333, 9], [185, 221, 9], [146, 221, 9], [146, 333, 9], [93, 333, 9], // gutter + fin
  ].map(P);
  const holes = [356, 555, 753].map((x) => [[x, 333, 9], [x + 169, 333, 9], [x + 169, 221, 9], [x, 221, 9]].map(P));
  return { outer, holes };
}

function decking() {
  const { outer, holes } = duxxbakSection();
  const { geo, edge } = profile(outer, { holes, depth: 18, bevel: 0.02 });
  return [0, 1, 2].map((i) => { // 3 boards (Dakota, 2026-10-16)
    const b = mesh(geo, solidMaterial('deck', 0.8, 'deck'), edge); // own material per board: grain differs
    b.position.x = (i - 1) * DUXX_PITCH;
    // exploded: same level, spread apart so the gutter + fin under each joint shows. On the way each board rides
    // higher than the one on its right: the hook has to clear the fin (0.74") before sliding 0.43" over it
    return { object: b, explode: V((i - 1) * 1.6, 0, 0), arc: V(0, (1 - i) * 1.1, 0) };
  });
}

// I.Dekk Traditional S4S, from the vector outline in `1012-I.Dekk-Traditional-S4S-.pdf` (drawn 1:1 in PDF points,
// 72 pt = 1"; height scaled to the 1-1/4" dimension): 5-1/2" wide, 4 cells, thicker top wall.
function idekkSection() {
  const sx = 1 / 72, sy = 1.25 / 91.4;
  const P = ([x, y, r]) => [(x - 413.9) * sx, (441.7 - y) * sy, r * sx];
  const outer = [[413.9, 441.7, 18], [809.9, 441.7, 18], [809.9, 350.3, 18], [413.9, 350.3, 18]].map(P);
  const holes = [[423.2, 510.6], [519.8, 607.3], [616.5, 703.9], [713.2, 800.5]]
    .map(([a, b]) => [[a, 430.2, 8.6], [b, 430.2, 8.6], [b, 366.8, 8.6], [a, 366.8, 8.6]].map(P));
  return { outer, holes };
}

// Optima Dekk grooved (hidden fastener) board, `optima-dekk-drawings.pdf` (raster: 5.400" x 1.065" dimensioned,
// groove and corner radius read off the image). Solid.
function optimaSection() {
  const W = 5.4, H = 1.065, r = 0.17, g0 = 0.25, g1 = 0.54, d = 0.23, c = 0.03;
  return {
    outer: [[0, 0, r], [W, 0, r], [W, g0, c], [W - d, g0, c], [W - d, g1, c], [W, g1, c], [W, H, r], [0, H, r],
      [0, g1, c], [d, g1, c], [d, g0, c], [0, g0, c]],
    holes: [],
  };
}

// Range (demo switch): the spreadsheet's three decking lines side by side, DuxxBak first so its open gutter shows at
// the end. Bottoms level (same joists), so the thinner Optima sits lower. Exploded: spread apart.
const DECK_GAP = 0.25;
function deckingRange() {
  const boards = [[duxxbakSection(), 'deck'], [idekkSection(), 'deck'], [optimaSection(), 'deck-capstock']];
  let x = 0;
  const layers = boards.map(([{ outer, holes }, finish], i) => {
    const { geo, edge } = profile(outer, { holes, depth: 18, bevel: 0.02 });
    const xs = outer.map((p) => p[0]), ys = outer.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const b = mesh(geo, solidMaterial('deck', 0.8, finish), edge);
    b.position.set(x + (x1 - x0) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, 0);
    x += x1 - x0 + DECK_GAP;
    return { object: b, explode: V((i - 1) * 1.6, 0, 0) };
  });
  for (const l of layers) l.object.position.x -= (x - DECK_GAP) / 2;
  return layers;
}

// Elite lap siding, from the vector outline in `Lap-Siding-Technical-Specification_EN.pdf` (PDF points; its 8.31"
// and 0.795" dimensions agree on one scale). x runs up the course: drip lip + hook (leg, foot) at the bottom, the
// 1.31" nailing hem with its stepped face at the top. Corner radii from the drawing's fillets.
const LAP_S = 8.31 / 637.05;
function lapSidingSection() {
  const P = ([x, y, r]) => [(x - 109.6) * LAP_S, (379.3 - y) * LAP_S, r * LAP_S];
  return [
    [108.41, 319.02, 4.5], [675.6, 319.02, 1], [675.95, 323.95, 1.4], [712.3, 323.95, 1.5], [712.5, 318.39, 1], // face, hem step
    [745.8, 317.95, 3.5], [746.98, 329.8, 3], [720.3, 332.5, 2], [719.42, 344.02, 2.2], // hem
    [234.48, 344.02, 5], [229.29, 376.59, 8], [186.6, 379.4, 2.5], [187.2, 368.1, 2], [213.17, 365.8, 2], [216.64, 344.02, 5], // hook
    [132.09, 344.02, 2.3], [131.1, 352.7, 2], [116.88, 353, 3.5], // drip lip
  ].map(P);
}

// Courses step 7.00" up the board and 34.3 pt out: the hem then sits in the next course's hook pocket, butting the leg,
// with the lip resting on the face below. So every course leans back by atan(D / E), bottom kicked out, like on a wall.
const LAP_E = 7, LAP_D = 34.3 * LAP_S, LAP_TILT = Math.atan2(LAP_D, LAP_E);
const LAP_L = 22; // shown course length
const LAP_JOINT = 0.03; // butt joint gap in the middle course

// AuraLok panel connector at the middle course's butt joint (Dakota, 2026-10-16; Elite's AuraLok drawings, no
// dimensions given, proportions read off them): two hairpin rails on the back of the panel, one each side of the
// joint, running from the hook up to the hem, and a channel that slides down over both and holds the ends together.
// Built in section coordinates (x up the course, y out through the face, z along it), centred like profile().
const AURA = { railW: 0.36, railWall: 0.08, railH: 0.07, bottom: 2.0, top: 7.7, width: 1.0, plate: 0.06, flange: 0.08, len: 5.4, lift: 1.9 };
function auralok(pts) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const c = V((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, 0);
  const back = (379.3 - 344.02) * LAP_S; // back of the face
  const A = AURA;
  // shape (u, v) in the back plane -> (x = v, y = back - depth, z = -u)
  const onBack = new THREE.Matrix4().set(0, 1, 0, -c.x, 0, 0, -1, back - c.y, -1, 0, 0, 0, 0, 0, 0, 1);
  const hairpin = (u0) => {
    const loop = (u, w, bot) => roundPts([[u, A.top], [u, bot, w / 2], [u + w, bot, w / 2], [u + w, A.top]], 0, 6);
    const w = A.railW, t = A.railWall;
    return shapeFrom(loop(u0, w, A.bottom), [loop(u0 + t, w - 2 * t, A.bottom + t).map(([u, v]) => [u, Math.min(v, A.top - t)])]);
  };
  const gap = LAP_JOINT / 2 + 0.02;
  const rails = new THREE.ExtrudeGeometry([hairpin(gap), hairpin(-gap - A.railW)], { depth: A.railH, bevelEnabled: false, curveSegments: 6 }).applyMatrix4(onBack);
  // channel section (u, depth from the rail tops): plate behind, flanges wrapping the rails' outer sides
  const h = A.width / 2, f = A.flange, y0 = back - A.railH;
  const p = A.plate, r = A.railH;
  const chan = shapeFrom([[-h, -p], [h, -p], [h, r], [h - f, r], [h - f, 0], [-h + f, 0], [-h + f, r], [-h, r]]);
  // (u, d, along) -> (x = along, y = y0 + d, z = -u)
  const along = new THREE.Matrix4().set(0, 0, 1, A.top - A.len - c.x, 0, 1, 0, y0 - c.y, -1, 0, 0, 0, 0, 0, 0, 1);
  const connector = new THREE.ExtrudeGeometry(chan, { depth: A.len, bevelEnabled: false }).applyMatrix4(along);
  // invisible hover / tap target, roomier than the thin channel: its whole travel, padded around it
  const pad = 0.8, x0 = A.bottom - pad, x1 = A.top + A.lift + pad, hw = A.width / 2 + pad, d = 0.4;
  const hit = new THREE.BoxGeometry(x1 - x0, d, 2 * hw).translate((x0 + x1) / 2 - c.x, back - d / 2 - c.y, 0);
  return { rails, connector, hit };
}

// z0: where the wall sits along itself; shift: extra explode along it; joint: AuraLok butt joint in the middle course
function lapWall(z0 = 0, shift = 0, joint = true) {
  const pts = lapSidingSection();
  const { geo, edge } = profile(pts, { depth: LAP_L, bevel: 0.014 });
  const half = profile(pts, { depth: LAP_L / 2, bevel: 0.014 });
  const mat = solidMaterial('cladding', 0.6, 'cladding');
  const rot = Math.PI / 2 - LAP_TILT; // stand up: course step (E, D) -> straight up, face (section +y) -> about world -x
  const up = V(Math.sin(LAP_TILT), Math.cos(LAP_TILT), 0); // section x after the turn
  const lay = (m, i, z = 0, lift = 0) => {
    m.rotation.z = rot;
    m.position.set(0, (i - 1) * Math.hypot(LAP_E, LAP_D), z0 + z);
    // exploded: each course lifts straight up off the one below, easing out from the wall on the way
    const l = { object: m, explode: V(0, (i - 1) * 2.6, shift), arc: V(-0.5, 0, 0) };
    // lift: the lock's own travel up its rails (Stage: rides up while opening, then slides home; hover lifts it)
    if (lift) l.lift = up.clone().multiplyScalar(lift);
    return l;
  };
  if (!joint) return [0, 1, 2].map((i) => lay(mesh(geo, mat, edge), i));
  const layers = [0, 2].map((i) => lay(mesh(geo, mat, edge), i));
  // middle course: two lengths butted end to end, joined by an AuraLok on the back, which rides partway up its
  // rails when open (as in Elite's drawings)
  for (const s of [-1, 1]) layers.push(lay(mesh(half.geo, mat, half.edge), 1, s * (LAP_L / 4 + LAP_JOINT / 2)));
  const { rails, connector, hit } = auralok(pts);
  const cmat = solidMaterial('connector', 0.45, 'connector');
  const target = new THREE.Mesh(hit, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  target.visible = false; // the raycaster still finds it
  target.userData.hitOnly = true;
  const lock = [mesh(rails, cmat), mesh(connector, cmat), target];
  for (const m of lock) m.userData.lock = true; // hover / tap target
  layers.push(lay(lock[0], 1), lay(lock[1], 1, 0, AURA.lift), lay(target, 1));
  return layers;
}

const sidingCladding = () => lapWall();

// Elite board & batten, from the vector outline in `Board-Batten-Technical-Specification_EN.pdf` (PDF points, scaled
// by the 13.70" overall; the 2.00" batten, 10.00" board and 1.70" flange dimensions agree). x runs across the board:
// batten (face +y) with the slot under it at the left, board with V ribs on the back, thin nailing flange at the right.
// Boards repeat every 12": the flange slides into the next board's slot, under its batten.
const BB_S = 13.7 / 658.4, BB_PITCH = 12, BB_L = 22;
function boardBattenSection() {
  const P = ([x, y, r = 0.8]) => [(x - 93.7) * BB_S, (357.1 - y) * BB_S, r * BB_S];
  const rib = (c) => [[c + 7.9, 351], [c, 357.1, 1.4], [c - 7.9, 351]];
  return [
    [93.7, 319, 2.9], [189.8, 319, 2.9], [189.8, 336.8, 2.9], // batten
    [684.4, 336.8], [685, 339.9], [720.9, 339.9], [721, 336.8], [752.1, 336.8, 1.4], [752.1, 343.1, 1.4], // face, flange
    [729.5, 344.6, 1.3], [729.5, 357.3, 2.2], [724, 355.4, 0], [722, 351, 1.5], // flange lip
    [686.8, 351], [682.3, 357.3, 1.5], [677.8, 351], ...rib(557.6), ...rib(432.9), ...rib(308.1), ...rib(183.4), // back
    [153.4, 351, 1.2], [153.2, 345, 1.2], [175.4, 343.5, 1.4], [175.4, 333.2, 1.4], [108.1, 333.2, 1.4], [108.1, 336.5, 1.2], // slot
    [93.7, 336.8, 2.9],
  ].map(P);
}

// two boards on the corner's other wall: section x -> world -x (flange end at the corner), face -> world +z, length up.
// x1: world x of the flange end
function battenWall(x1 = 0) {
  const pts = boardBattenSection();
  const { geo, edge } = profile(pts, { depth: BB_L, bevel: 0.014 });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const c = V((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, 0);
  const basis = new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 0, 1), V(0, 1, 0));
  const mat = solidMaterial('cladding', 0.6, 'cladding');
  const x0 = x1 + BB_PITCH + Math.max(...xs); // world x of section x = 0 on the first board
  return [0, 1].map((i) => {
    const m = mesh(geo, mat, edge);
    m.quaternion.setFromRotationMatrix(basis);
    m.position.set(x0 - i * BB_PITCH - c.x, 0, c.y);
    // exploded: the wall slides straight off the corner along itself, the outer board further, pulling its flange out
    // of the slot (mirrors the lap wall, which slides off the other way)
    return { object: m, explode: V(i ? 2.5 : 4.7, 0, 0) };
  });
}

// Range (demo switch): an outside corner, lap siding on one wall (face -x) and board & batten on the other (face +z).
// The battens' last flange covers the lap's cut end. Opening turns the corner half round to look in from behind, at the
// lap's AuraLok joint, and the walls pull apart.
const sidingRange = () => [...lapWall(-LAP_L / 2 - 0.4, -2.5), ...battenWall(-0.9)];

// --- GLB-backed ------------------------------------------------------------
// Parts come out of tools/optimize.mjs centered, Y-up, in inches.

// Panel Systems (client meeting 2026-10-02): EZ Forms formwork and EZ Liner panels in one view, stacked
// above each other: the 16" / 18" / 16" EZ Liner panels lie flat at the bottom, interlocked edge to edge
// along Z, and the formwork wall (stackZ) stands above them; exploding lifts the formwork apart and slides
// the liner panels apart so their interlock shows (client feedback 2026-10-09).
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
const LINER_GAP = 4; // exploded gap between liner panels, inches
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
    layers.push({ object: m, explode: V(0, 0, (i - 1) * LINER_GAP) }); // slide apart: shows the tongue + groove
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
// range / simple: overrides for the demo's Multi / Simple switch (Multi: the line's other profiles alongside; Simple:
// one product per slide), see Stage.setVariant. Products without one use the default build in both
// openAt / turnAt: [start, end] of the opening the parts move / the product turns in (corner: walls part, then turn,
// so they never pass through each other edge-on); turnRate: slower turn, eased over time (per second)
export const PRODUCTS = {
  'multiwall-sheets': { build: multiwall, yaw: -0.62 },
  'corrugated-sheets': { build: corrugated, yaw: -0.62 },
  'flat-sheets': { build: flatSheets, yaw: -0.62 },
  'panel-systems': { build: panelSystems, yaw: 0.72, parts: ['16-in-inner', '18-in-inner', '8-in-fem', '8-panel', '4.5-in-spacer', '8-in-male'], simple: { build: formwork } },
  'decking-railing': { build: decking, yaw: -0.62, range: { build: deckingRange } },
  'siding-cladding': { build: sidingCladding, yaw: 0.85, openYaw: 0.85 - 1.85, range: { build: sidingRange, yaw: Math.PI / 4, openYaw: Math.PI / 4 - Math.PI, openAt: [0, 0.55], turnAt: [0.3, 1], turnRate: 3.5 } },
  'specialty-products': { build: windowWell, yaw: 0.55, parts: ['egress-well', 'well-cover', 'well-cover-rail'] },
};
