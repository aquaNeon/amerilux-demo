// Product catalogue for the 3D carousel.
// Keys match `data-amx-item="<slug>"` on the Webflow accordion items.
// Each builder returns layers: { object, explode: Vector3 } in inches, assembled at explode = 0.
// Procedural builds are stand-ins until client models exist for those categories.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Tints for the active state. Inactive state is the luminance of these (Figma: mix-blend-luminosity).
export const TINT = {
  clear: 0xa8d8cf,
  bronze: 0xb99d7f,
  opal: 0xe4e6e2,
  profile: 0xcfe3de,
  deck: 0x8f7a68,
  joist: 0x5d5a57,
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

// --- procedural ------------------------------------------------------------

function multiwall() {
  const W = 24, D = 16, T = 1, skin = 0.14;
  const skinGeo = new THREE.BoxGeometry(W, skin, D);
  const bottom = mesh(skinGeo, polyMaterial(TINT.clear, 0.6));
  bottom.position.y = -T / 2;
  const top = mesh(skinGeo, polyMaterial(TINT.clear, 0.6));
  top.position.y = T / 2;

  const ribs = new THREE.Group();
  const ribMat = polyMaterial(TINT.clear, 0.45);
  const ribGeo = new THREE.BoxGeometry(0.05, T, D);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const r = mesh(ribGeo, ribMat);
    r.position.x = -W / 2 + (i + 0.5) * (W / n);
    ribs.add(r);
  }
  const mid = mesh(new THREE.BoxGeometry(W, skin * 0.8, D), polyMaterial(TINT.opal, 0.5));

  return [
    { object: bottom, explode: V(-1.5, -9, 0) },
    { object: mid, explode: V(-0.5, -3, 0) },
    { object: ribs, explode: V(0.5, 3, 0) },
    { object: top, explode: V(1.5, 9, 0) },
  ];
}

function corrugatedGeometry(W, D, amp, pitch) {
  const g = new THREE.PlaneGeometry(W, D, Math.round(W * 8), 1);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, amp * Math.sin((p.getX(i) / pitch) * Math.PI * 2));
  g.computeVertexNormals();
  return g;
}

function corrugated() {
  const geo = corrugatedGeometry(24, 16, 0.45, 2.6);
  return [TINT.bronze, TINT.clear, TINT.opal].map((c, i) => {
    const m = mesh(geo, polyMaterial(c, 0.6));
    m.position.y = (i - 1) * 0.95;
    return { object: m, explode: V((i - 1) * 1.5, (i - 1) * 7, 0) };
  });
}

function flatSheets() {
  const geo = new THREE.BoxGeometry(24, 0.4, 16);
  return [TINT.opal, TINT.bronze, TINT.clear].map((c, i) => {
    const m = mesh(geo, polyMaterial(c, 0.6));
    m.position.set((i - 1) * 0.4, (i - 1) * 0.3, (i - 1) * -0.4);
    return { object: m, explode: V((i - 1) * 1.5, (i - 1) * 7, 0) };
  });
}

function decking() {
  const layers = [];
  const board = new THREE.BoxGeometry(5.5, 1, 26);
  const deckMat = solidMaterial(TINT.deck, 0.7);
  for (let i = 0; i < 4; i++) {
    const b = mesh(board, deckMat);
    b.position.set((i - 1.5) * 5.75, 0.5, 0);
    layers.push({ object: b, explode: V((i - 1.5) * 1.2, 6 + i * 0.6, 0) });
  }
  const joist = new THREE.BoxGeometry(23, 3, 1.5);
  const joistMat = solidMaterial(TINT.joist, 0.6);
  [-8, 8].forEach((z, i) => {
    const j = mesh(joist, joistMat);
    j.position.set(0, -1.5, z);
    layers.push({ object: j, explode: V(0, -3, i ? 3 : -3) });
  });
  return layers;
}

// --- GLB-backed ------------------------------------------------------------
// Parts come out of tools/optimize.mjs centered, Y-up, in inches.
// Wall profiles are all 8.24" wide (X) and stack along Z by their thickness.

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

function panelSystem(parts) {
  return stackZ(parts, ['8-in-fem', '8-panel', '4.5-in-spacer', '8-panel', '8-in-male'], 7, () => solidMaterial(TINT.profile, 0.38));
}

function sidingCladding(parts) {
  // EZ liner boards laid as siding courses, overlapping slightly
  return ['16-in-inner', '18-in-inner', '16-in-inner'].map((n, i) => {
    const m = mesh(parts[n], solidMaterial(TINT.profile, 0.35));
    m.position.set(0, 0, (i - 1) * 5.8);
    return { object: m, explode: V((i - 1) * 2, (i - 1) * 7, (i - 1) * 3) };
  });
}

function specialty(parts) {
  const corner = mesh(parts['8-pin-corner'], solidMaterial(TINT.profile, 0.38));
  const pin = mesh(parts['8-pin'], solidMaterial(TINT.profile, 0.38));
  pin.position.set(-7.5, 0, 0);
  const spacer = mesh(parts['2.5-in-spacer'], solidMaterial(TINT.profile, 0.38));
  spacer.position.set(0, 0, 6);
  return [
    { object: pin, explode: V(-6, 3, 0) },
    { object: corner, explode: V(0, 0, 0) },
    { object: spacer, explode: V(3, -2, 7) },
  ];
}

// yaw: base rotation (rad) giving the Figma three-quarter view
export const PRODUCTS = {
  'multiwall-sheets': { build: multiwall, yaw: -0.62 },
  'corrugated-sheets': { build: corrugated, yaw: -0.62 },
  'flat-sheets': { build: flatSheets, yaw: -0.62 },
  'panel-systems': { build: panelSystem, yaw: 0.72, parts: ['8-in-fem', '8-panel', '4.5-in-spacer', '8-in-male'] },
  'decking-railing': { build: decking, yaw: -0.62 },
  'siding-cladding': { build: sidingCladding, yaw: -0.62, parts: ['16-in-inner', '18-in-inner'] },
  'specialty-products': { build: specialty, yaw: 0.6, parts: ['8-pin-corner', '8-pin', '2.5-in-spacer'] },
};
