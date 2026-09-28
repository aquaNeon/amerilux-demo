// Product catalogue for the 3D carousel.
// Keys match `data-amx-item="<slug>"` on the Webflow accordion items.
// Each builder returns layers: { object, explode: Vector3 } in inches, assembled at explode = 0.
// Procedural builds extrude 2D sections traced from the client's product PDFs
// (see PLACEHOLDERS.md for sources and what is still approximate).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
};

export function polyMaterial(color, opacity = 0.55) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.16, metalness: 0, transparent: true, opacity,
    clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide, depthWrite: false,
  });
}

export function solidMaterial(color, roughness = 0.42) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

const mesh = (geo, mat) => new THREE.Mesh(geo, mat);

// --- section helpers --------------------------------------------------------
// Sections are drawn in XY (x = across the product, y = thickness) and extruded along Z.

function extrude(shape, length) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 6 });
  g.computeBoundingBox();
  const c = g.boundingBox.getCenter(new THREE.Vector3());
  g.translate(-c.x, -c.y, -c.z);
  return g;
}

const rect = (x, y, w, h, path = new THREE.Shape()) =>
  path.moveTo(x, y).lineTo(x + w, y).lineTo(x + w, y + h).lineTo(x, y + h).closePath();

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
function multiwallSheet(width, thick, pitch, walls, length, color) {
  const skin = 0.9 * MM;
  const g = new THREE.Group();
  const skinGeo = new THREE.BoxGeometry(width, skin, length);
  const skinMat = polyMaterial(color, 0.5);
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
  const ribMesh = mesh(mergeGeometries(ribs), new THREE.MeshBasicMaterial({ color: 0x1f2a28, transparent: true, opacity: 0.16, depthWrite: false }));
  ribMesh.userData.edges = 'none';
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
    { t: 6, p: 6, walls: 2, c: TINT.bronze },
    { t: 10, p: 10, walls: 2, c: TINT.opal },
    { t: 16, p: 20, walls: 3, c: TINT.clear },
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
    { pts: trapezoidLine(W, 304.8 * MM, 19.05 * MM, 25.4 * MM, 200 * MM), c: TINT.bronze },
    { pts: sineLine(W, 67.8 * MM, 22.2 * MM), c: TINT.clear },
    { pts: trapezoidLine(W, 76 * MM, 13.5 * MM, 25 * MM, 25 * MM), c: TINT.opal },
  ];
  return lines.map(({ pts, c }, i) => {
    const m = mesh(extrude(sheetFromLine(pts, t), L), polyMaterial(c, 0.62));
    m.position.y = (i - 1) * 0.95;
    return { object: m, explode: V((i - 1) * 1.5, (i - 1) * 6, 0) };
  });
}

// No drawings supplied for flat sheet — generic solid sheets
function flatSheets() {
  const geo = new THREE.BoxGeometry(24, 0.4, 16);
  return [TINT.opal, TINT.bronze, TINT.clear].map((c, i) => {
    const m = mesh(geo, polyMaterial(c, 0.6));
    m.position.set((i - 1) * 0.4, (i - 1) * 0.3, (i - 1) * -0.4);
    return { object: m, explode: V((i - 1) * 1.5, (i - 1) * 7, 0) };
  });
}

// DuxxBak 1080 board: 7-5/16" overall, 5-3/4" body x 1-1/4", 4 cells, drainage flange under the next board
function duxxbakSection() {
  const H = 1.25, body = 5.75, flange = 7.3125 - body;
  const s = new THREE.Shape()
    .moveTo(0, 0).lineTo(flange + body, 0).lineTo(flange + body, H).lineTo(flange, H)
    .lineTo(flange, 0.3).lineTo(0.3, 0.3).lineTo(0.3, 0.85).lineTo(0, 0.85).closePath();
  const cellW = (body - 0.25 * 5) / 4;
  for (let i = 0; i < 4; i++) s.holes.push(rect(flange + 0.25 + i * (cellW + 0.25), 0.2, cellW, H - 0.4, new THREE.Path()));
  return s;
}

function decking() {
  const geo = extrude(duxxbakSection(), 26);
  const mat = solidMaterial(TINT.deck, 0.7);
  return [0, 1, 2, 3].map((i) => {
    const b = mesh(geo, mat);
    b.position.x = (i - 1.5) * 6;
    return { object: b, explode: V((i - 1.5) * 2.2, (i - 1.5) * 1.6, 0) };
  });
}

// Elite lap siding: 8.31" x 0.795", 7.00" exposure, 1.31" lap
function lapSidingSection() {
  const t = 0.3, W = 8.31;
  return new THREE.Shape()
    .moveTo(0, 0.795).lineTo(W, 0.795).lineTo(W, 0.795 - t * 0.55).lineTo(W - 1.31, 0.795 - t * 0.55)
    .lineTo(W - 1.31, 0.795 - t).lineTo(1.9, 0.795 - t).lineTo(1.9, 0.06).lineTo(1.1, 0)
    .lineTo(1.1, 0.12).lineTo(1.62, 0.16).lineTo(1.62, 0.795 - t).lineTo(0.35, 0.795 - t)
    .lineTo(0.35, 0.795 - t - 0.12).lineTo(0.12, 0.795 - t - 0.12).lineTo(0, 0.795 - t * 0.2).closePath();
}

function sidingCladding() {
  const geo = extrude(lapSidingSection(), 22);
  const mat = solidMaterial(TINT.cladding, 0.55);
  return [0, 1, 2].map((i) => {
    const m = mesh(geo, mat);
    m.position.set((i - 1) * 7, 0, 0);
    return { object: m, explode: V((i - 1) * 2, (i - 1) * 4, 0) };
  });
}

// --- GLB-backed ------------------------------------------------------------
// Parts come out of tools/optimize.mjs centered, Y-up, in inches.

// EZ Liner: 16" / 18" cover widths, boards interlock edge to edge
function panelSystem(parts) {
  const names = ['16-in-inner', '18-in-inner', '16-in-inner'];
  const cover = { '16-in-inner': 16, '18-in-inner': 18 };
  const total = names.reduce((s, n) => s + cover[n], 0);
  let x = -total / 2;
  return names.map((n, i) => {
    const m = mesh(parts[n], solidMaterial(TINT.profile, 0.35));
    m.scale.z = 3; // exported extrusion is only 6" long
    m.position.x = x + cover[n] / 2;
    x += cover[n];
    return { object: m, explode: V((i - 1) * 3, (i - 1) * 5, 0) };
  });
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
  return stackZ(parts, ['8-in-fem', '8-panel', '4.5-in-spacer', '8-panel', '8-in-male'], 7, () => solidMaterial(TINT.profile, 0.38));
}

// yaw: base rotation (rad) giving the Figma three-quarter view
export const PRODUCTS = {
  'multiwall-sheets': { build: multiwall, yaw: -0.62 },
  'corrugated-sheets': { build: corrugated, yaw: -0.62 },
  'flat-sheets': { build: flatSheets, yaw: -0.62 },
  'panel-systems': { build: panelSystem, yaw: -0.62, parts: ['16-in-inner', '18-in-inner'] },
  'decking-railing': { build: decking, yaw: -0.62 },
  'siding-cladding': { build: sidingCladding, yaw: -0.62 },
  'specialty-products': { build: formwork, yaw: 0.72, parts: ['8-in-fem', '8-panel', '4.5-in-spacer', '8-in-male'] },
};
