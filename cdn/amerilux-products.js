import * as e from "https://cdn.jsdelivr.net/npm/three@0.186.1/+esm";
import { mergeGeometries as t, toCreasedNormals as n } from "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/utils/BufferGeometryUtils.js/+esm";
import { RoundedBoxGeometry as r } from "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/geometries/RoundedBoxGeometry.js/+esm";
//#region src/products.js
var i = (t, n, r) => new e.Vector3(t, n, r), a = 1 / 25.4, o = {
	clear: 11065551,
	flat: 12902620,
	bronze: 9073760,
	opal: 15001314,
	profile: 13624286,
	pvc: 15264230,
	klar: 16119282,
	core: 2105376,
	hdpe: 1381653,
	cladding: 15724527,
	deck: 12040119,
	well: 12368821
}, s = (e, t, n) => Object.assign(e.userData, {
	finish: t,
	glow: n
}) && e, c = /* @__PURE__ */ new Set([
	"clear",
	"flat",
	"bronze"
]);
function l(t, n = .55, r) {
	let i = c.has(t);
	return s(new e.MeshPhysicalMaterial({
		color: o[t],
		roughness: .16,
		metalness: 0,
		transparent: i,
		opacity: i ? n : 1,
		clearcoat: 1,
		clearcoatRoughness: .08,
		side: e.DoubleSide,
		depthWrite: !i
	}), `poly-${t}`, r);
}
function u(t, n, r) {
	return s(new e.MeshStandardMaterial({
		color: o[t],
		roughness: n,
		metalness: 0
	}), r);
}
var d = (t, n, r) => {
	let i = new e.Mesh(t, n);
	return r && (i.userData.edgeGeo = r), i;
};
function f(t) {
	t.computeBoundingBox();
	let n = t.boundingBox.getCenter(new e.Vector3());
	return t.translate(-n.x, -n.y, -n.z);
}
function p(t, n) {
	return f(new e.ExtrudeGeometry(t, {
		depth: n,
		bevelEnabled: !1,
		curveSegments: 6
	}));
}
function m(t, n = []) {
	let r = new e.Shape();
	t.forEach(([e, t], n) => n ? r.lineTo(e, t) : r.moveTo(e, t)), r.closePath();
	for (let t of n) {
		let n = new e.Path();
		t.forEach(([e, t], r) => r ? n.lineTo(e, t) : n.moveTo(e, t)), n.closePath(), r.holes.push(n);
	}
	return r;
}
function h(e, t, n = 4, r = !0, i = !1) {
	let a = e.length, o = [];
	for (let s = 0; s < a; s++) {
		if (!r && (s === 0 || s === a - 1)) {
			o.push(e[s]);
			continue;
		}
		let c = e[s], l = e[(s - 1 + a) % a], u = e[(s + 1) % a], d = [l[0] - c[0], l[1] - c[1]], f = [u[0] - c[0], u[1] - c[1]], p = Math.hypot(...d), m = Math.hypot(...f), h = c[2] ?? t;
		if (p < 1e-6 || m < 1e-6 || !h) {
			o.push([c[0], c[1]]);
			continue;
		}
		let g = [d[0] / p, d[1] / p], _ = [f[0] / m, f[1] / m], v = Math.acos(Math.max(-1, Math.min(1, g[0] * _[0] + g[1] * _[1])));
		if (v > Math.PI - .05) {
			o.push([c[0], c[1]]);
			continue;
		}
		let y = Math.min(h / Math.tan(v / 2), p * .45, m * .45), b = [c[0] + g[0] * y, c[1] + g[1] * y], x = [c[0] + _[0] * y, c[1] + _[1] * y];
		i && 2 * y < p * .5 && o.push([c[0] + g[0] * 2 * y, c[1] + g[1] * 2 * y]);
		for (let e = 0; e <= n; e++) {
			let t = e / n, r = 1 - t;
			o.push([r * r * b[0] + 2 * r * t * c[0] + t * t * x[0], r * r * b[1] + 2 * r * t * c[1] + t * t * x[1]]);
		}
		i && 2 * y < m * .5 && o.push([c[0] + _[0] * 2 * y, c[1] + _[1] * 2 * y]);
	}
	return o;
}
function g(t, { holes: r = [], depth: i, r: a = 0, hr: o = 0, bevel: s = 0 }) {
	let c = f(new e.ExtrudeGeometry(m(t, r), {
		depth: i,
		bevelEnabled: !1
	})), l = (e, t) => e.some((e) => e[2]) ? h(e, t, 4, !0, !0) : t ? h(e, t) : e, u = new e.ExtrudeGeometry(m(l(t, a), r.map((e) => l(e, o))), {
		depth: i - 2 * s,
		bevelEnabled: s > 0,
		bevelThickness: s,
		bevelSize: s * .8,
		bevelOffset: -s * .8,
		bevelSegments: 3,
		curveSegments: 8
	});
	return {
		geo: n(f(u), .6),
		edge: c
	};
}
function _(e, t) {
	return e.map((n, r) => {
		let i = e[Math.max(0, r - 1)], a = e[Math.min(e.length - 1, r + 1)], o = a[0] - i[0], s = a[1] - i[1], c = Math.hypot(o, s) || 1;
		return [n[0] + s / c * t, n[1] - o / c * t];
	});
}
function v(t, n) {
	let r = new e.Shape();
	t.forEach(([e, t], n) => n ? r.lineTo(e, t) : r.moveTo(e, t));
	let i = _(t, n);
	for (let e = i.length - 1; e >= 0; e--) r.lineTo(...i[e]);
	return r.closePath(), r;
}
var y = {
	skin: .6,
	rib: .5
};
function b(n, r, i, { thick: o, pitch: c, skins: u, rib: f, cross: p, catchShadow: m }) {
	let h = new e.Group(), g = l(i, .5, ["y", "thin"]);
	if (u.forEach(([t, i], s) => {
		let c = d(new e.BoxGeometry(n, Math.max(i, y.skin) * a, r), g);
		c.position.y = (t - o / 2) * a, s < u.length - 1 && (c.userData.noCast = !0), h.add(c);
	}), m) {
		let t = new e.Mesh(new e.PlaneGeometry(n, r), new e.ShadowMaterial({
			opacity: m,
			depthWrite: !1
		}));
		t.rotation.x = -Math.PI / 2, t.position.y = o / 2 * a + .01, t.receiveShadow = !0, t.userData.catcher = !0, t.raycast = () => {}, h.add(t);
	}
	let _ = Math.floor(n / (c * a)), v = -_ * c * a / 2, b = [];
	for (let t = 0; t <= _; t++) {
		let n = new e.BoxGeometry(Math.max(f, y.rib) * a, o * a, r);
		n.translate(v + t * c * a, 0, 0), b.push(n);
	}
	if (p) {
		let t = (o / 2 - u[0][1]) * a, n = c * a, i = Math.hypot(n, t), s = Math.atan2(t, n);
		for (let o = 0; o < _; o++) {
			let c = o % 2 ? v + o * n : v + (o + 1) * n;
			for (let l of [1, -1]) {
				let u = new e.BoxGeometry(i, Math.max(p, y.rib) * a, r);
				u.rotateZ((o % 2 ? l : -l) * s), u.translate(c + (o % 2 ? n / 2 : -n / 2), l * t / 2, 0), b.push(u);
			}
		}
	}
	let x = s(new e.MeshBasicMaterial({
		color: 2042408,
		transparent: !0,
		opacity: .16,
		depthWrite: !1
	}), `rib-${i}`, ["x", "thin"]), S = d(t(b), x);
	S.userData.edges = "none", S.userData.noCast = !0;
	let C = Math.max(1, Math.ceil(.6 / (c * a))), w = [];
	for (let e = 0; e <= _; e += C) {
		let t = v + e * c * a, n = o / 2 * a, i = r / 2;
		w.push(t, n, -i, t, n, i, t, n, i, t, -n, i, t, n, -i, t, -n, -i);
	}
	return S.userData.sketchLines = new e.BufferGeometry().setAttribute("position", new e.Float32BufferAttribute(w, 3)), h.add(S), h;
}
function x(e, t, n, r, i) {
	let a = (t - r - i) / 2, o = [];
	for (let s = 0; s < e - 1e-6; s += t) o.push([s, 0], [s + i / 2, 0], [s + i / 2 + a, n], [s + i / 2 + a + r, n], [s + t - i / 2, 0]);
	let s = o.findIndex(([t]) => t >= e);
	if (s < 0) return [...o, [e, 0]];
	let [c, l] = o[s - 1], [u, d] = o[s];
	return [...o.slice(0, s), [e, l + (d - l) * (e - c) / (u - c)]];
}
function S(e) {
	let t = (e, t, n, r) => [
		[e - t / 2, 0],
		[e - n / 2, r],
		[e + n / 2, r],
		[e + t / 2, 0]
	], n = [[0, 0]];
	for (let r = 1.5; r < e; r += 9) for (let [i, a] of [
		[r, [
			1.806,
			.318,
			.785
		]],
		[r + 3, [
			1.35,
			.694,
			.114
		]],
		[r + 6, [
			1.35,
			.694,
			.114
		]]
	]) i + a[0] / 2 < e && n.push(...t(i, ...a));
	return n.push([e, 0]), h(n, .1, 4, !1);
}
function C(e, t, n, r) {
	let i = t / 2, a = n - 2 * r, o = Math.hypot(i, a), s = Math.atan2(a, i) - Math.acos(2 * r / o), c = r * Math.cos(s), l = (e) => r - Math.sqrt(Math.max(0, r * r - e * e)), u = (e) => n - r + Math.sqrt(Math.max(0, r * r - e * e)), d = (e) => {
		let n = (e % t + t) % t, r = Math.min(n, t - n);
		return r <= c ? l(r) : r >= i - c ? u(i - r) : l(c) + (r - c) / (i - 2 * c) * (u(c) - l(c));
	}, f = Math.ceil(e / t * 48);
	return Array.from({ length: f + 1 }, (t, n) => [n / f * e, d(n / f * e)]);
}
function w() {
	let e = [
		{
			c: "bronze",
			thick: 25,
			pitch: 10,
			rib: .3,
			cross: .15,
			skins: [
				[.5, 1],
				[12.5, .1],
				[24.5, 1]
			],
			catchShadow: .45
		},
		{
			c: "opal",
			thick: 16,
			pitch: 20,
			rib: .5,
			skins: [
				[.3, .6],
				[8, .2],
				[15.7, .6]
			]
		},
		{
			c: "clear",
			thick: 8,
			pitch: 10,
			rib: .4,
			skins: [[.2, .4], [7.8, .4]]
		}
	], t = 0;
	return e.map((e, n) => {
		let r = b(18, 14, e.c, e);
		return r.position.set((n - 1) * .6, t + e.thick * a / 2, (n - 1) * -.6), t += e.thick * a + .02, {
			object: r,
			explode: i((n - 1) * 1.5, (n - 1) * 6, 0)
		};
	});
}
function T() {
	let t = 1.75, r = x(18, 176 * a, 42.5 * a, 25 * a, 116 * a), o = C(18, 67.8 * a, 22.2 * a, 12.7 * a), s = (e, t, r) => {
		let i = p(v(e, t), 14);
		return d(n(i.clone(), .5), r, i);
	}, c = new e.Group(), f = 2 * a * t / 3, m = [];
	[
		["klar", "pvc-klar"],
		["core", "pvc-core"],
		["klar", "pvc-klar"]
	].forEach(([t, n], i) => {
		let a = new e.ExtrudeGeometry(v(_(r, i * f), f), {
			depth: 14,
			bevelEnabled: !1
		});
		m.push(a);
		let o = c.add(d(a, u(t, .6, n))).children[i];
		i > 0 && (o.userData.noCast = !0, o.userData.edges = "none");
	});
	let h = new e.Box3().setFromObject(c).getCenter(new e.Vector3());
	for (let e of m) e.translate(-h.x, -h.y, -h.z);
	for (let e of c.children) e.userData.edgeGeo = e.geometry, e.geometry = n(e.geometry.clone(), .5);
	return [
		s(S(18), .89 * a * t, u("pvc", .25, "pvc-gloss")),
		s(o, .8 * a * t, l("clear", .62, ["z", "caps"])),
		c
	].map((e, t) => (e.position.y = (t - 1) * 1.1, {
		object: e,
		explode: i((t - 1) * 1.5, (t - 1) * 6, 0)
	}));
}
function E() {
	return [
		{
			t: .22,
			mat: () => u("hdpe", .6, "hdpe-black")
		},
		{
			t: .118,
			mat: () => l("flat", .6, ["y", "thin"]),
			finish: "acrylic-clear"
		},
		{
			t: .093,
			mat: () => l("flat", .6, ["y", "thin"])
		}
	].map(({ t, mat: n, finish: a }, o) => {
		let s = t * 1.6, c = d(new r(24, s, 16, 3, Math.min(.07, s * .3)), n(), new e.BoxGeometry(24, s, 16));
		return a && (c.material.userData.finish = a), c.position.set((o - 1) * .4, (o - 1) * .3, (o - 1) * -.4), {
			object: c,
			explode: i((o - 1) * 1.5, (o - 1) * 7, 0)
		};
	});
}
var D = 5.75;
function O() {
	let e = 5.75 / 862, t = ([t, n, r]) => [
		(t - 93) * e,
		(372 - n) * .006578947368421052,
		r * e
	];
	return {
		outer: [
			[
				93,
				372,
				9
			],
			[
				952,
				372,
				34
			],
			[
				952,
				221,
				9
			],
			[
				1112,
				221,
				9
			],
			[
				1112,
				333,
				9
			],
			[
				1188,
				333,
				9
			],
			[
				1188,
				296,
				8
			],
			[
				1152,
				296,
				8
			],
			[
				1152,
				258,
				8
			],
			[
				1188,
				258,
				8
			],
			[
				1188,
				228,
				4
			],
			[
				1179,
				214,
				4
			],
			[
				1179,
				182,
				29
			],
			[
				326,
				182,
				28
			],
			[
				326,
				258,
				6
			],
			[
				289,
				258,
				8
			],
			[
				289,
				296,
				8
			],
			[
				326,
				296,
				6
			],
			[
				326,
				333,
				9
			],
			[
				185,
				333,
				9
			],
			[
				185,
				221,
				9
			],
			[
				146,
				221,
				9
			],
			[
				146,
				333,
				9
			],
			[
				93,
				333,
				9
			]
		].map(t),
		holes: [
			356,
			555,
			753
		].map((e) => [
			[
				e,
				333,
				9
			],
			[
				e + 169,
				333,
				9
			],
			[
				e + 169,
				221,
				9
			],
			[
				e,
				221,
				9
			]
		].map(t))
	};
}
function k() {
	let { outer: e, holes: t } = O(), { geo: n, edge: r } = g(e, {
		holes: t,
		depth: 18,
		bevel: .02
	});
	return [
		0,
		1,
		2,
		3
	].map((e) => {
		let t = d(n, u("deck", .8, "deck"), r);
		return t.position.x = (e - 1.5) * D, {
			object: t,
			explode: i((e - 1.5) * 1.6, 0, 0),
			arc: i(0, (1.5 - e) * 1.1, 0)
		};
	});
}
var A = 8.31 / 637.05;
function j() {
	return [
		[
			108.41,
			319.02,
			4.5
		],
		[
			675.6,
			319.02,
			1
		],
		[
			675.95,
			323.95,
			1.4
		],
		[
			712.3,
			323.95,
			1.5
		],
		[
			712.5,
			318.39,
			1
		],
		[
			745.8,
			317.95,
			3.5
		],
		[
			746.98,
			329.8,
			3
		],
		[
			720.3,
			332.5,
			2
		],
		[
			719.42,
			344.02,
			2.2
		],
		[
			234.48,
			344.02,
			5
		],
		[
			229.29,
			376.59,
			8
		],
		[
			186.6,
			379.4,
			2.5
		],
		[
			187.2,
			368.1,
			2
		],
		[
			213.17,
			365.8,
			2
		],
		[
			216.64,
			344.02,
			5
		],
		[
			132.09,
			344.02,
			2.3
		],
		[
			131.1,
			352.7,
			2
		],
		[
			116.88,
			353,
			3.5
		]
	].map(([e, t, n]) => [
		(e - 109.6) * A,
		(379.3 - t) * A,
		n * A
	]);
}
var M = 7, N = 34.3 * A, P = Math.atan2(N, M);
function F() {
	let { geo: e, edge: t } = g(j(), {
		depth: 22,
		bevel: .014
	}), n = u("cladding", .6, "cladding"), r = Math.PI / 2 - P;
	return [
		0,
		1,
		2
	].map((a) => {
		let o = d(e, n, t);
		return o.userData.noAO = !0, o.rotation.z = r, o.position.set(0, (a - 1) * Math.hypot(M, N), 0), {
			object: o,
			explode: i(0, (a - 1) * 2.6, 0),
			arc: i(-.5, 0, 0)
		};
	});
}
var I = 50, L = (e, t = .01) => {
	let n = (n) => n.y < e.min.y + t || n.y > e.max.y - t, r = (n) => n.z < e.min.z + t || n.z > e.max.z - t;
	return (e, t) => n(e) && n(t) || r(e) && r(t);
}, R = 14, z = 4;
function B(t) {
	let n = H(t);
	for (let e of n) e.explode.y += 6;
	let r = {
		"16-in-inner": 16,
		"18-in-inner": 18
	}, a = [
		"16-in-inner",
		"18-in-inner",
		"16-in-inner"
	], o = new e.Quaternion().setFromAxisAngle(i(0, 1, 0), Math.PI / 2), s = a.reduce((e, t) => e + r[t], 0), c = t["8-panel"].boundingBox.min.y, l = -s / 2;
	return a.forEach((e, a) => {
		let s = d(t[e], u("profile", .35, "pvc-white"));
		s.userData.edgeAngle = I, s.userData.edgeKeep = L(t[e].boundingBox), s.quaternion.copy(o), s.scale.z = R / 6, s.position.set(0, c - 3, l + r[e] / 2), l += r[e], n.push({
			object: s,
			explode: i(0, 0, (a - 1) * z)
		});
	}), n;
}
function V(t, n, r, a) {
	let o = n.map((n) => t[n].boundingBox.getSize(new e.Vector3())), s = -o.reduce((e, t) => e + t.z, 0) / 2;
	return n.map((e, c) => {
		let l = d(t[e], a());
		l.userData.edgeAngle = I, l.position.z = s + o[c].z / 2, s += o[c].z;
		let u = c - (n.length - 1) / 2;
		return {
			object: l,
			explode: i(0, u * r * .35, u * r)
		};
	});
}
function H(e) {
	return V(e, [
		"8-in-fem",
		"8-panel",
		"4.5-in-spacer",
		"8-panel",
		"8-in-male"
	], 7, () => u("profile", .38, "pvc-form"));
}
function U(t) {
	let n = (e) => (e.rotation.y = Math.PI, e), r = u("well", .4, "steel-galv");
	r.side = e.DoubleSide;
	let a = n(d(t["egress-well"], r));
	a.userData.edgeAngle = 40;
	let o = n(new e.Group());
	return o.add(Object.assign(d(t["well-cover"], l("flat", .6, ["y", "thin"])), { userData: {
		realEdges: !1,
		edgeAngle: 60
	} })), o.add(d(t["well-cover-rail"], u("well", .4, "steel-galv"))), [{
		object: a,
		explode: i(0, 0, 0)
	}, {
		object: o,
		explode: i(0, 16, 3)
	}];
}
var W = {
	"multiwall-sheets": {
		build: w,
		yaw: -.62
	},
	"corrugated-sheets": {
		build: T,
		yaw: -.62
	},
	"flat-sheets": {
		build: E,
		yaw: -.62
	},
	"panel-systems": {
		build: B,
		yaw: .72,
		parts: [
			"16-in-inner",
			"18-in-inner",
			"8-in-fem",
			"8-panel",
			"4.5-in-spacer",
			"8-in-male"
		]
	},
	"decking-railing": {
		build: k,
		yaw: -.62
	},
	"siding-cladding": {
		build: F,
		yaw: .85,
		openYaw: 3.6 - Math.PI * 2
	},
	"specialty-products": {
		build: U,
		yaw: .55,
		parts: [
			"egress-well",
			"well-cover",
			"well-cover-rail"
		]
	}
};
//#endregion
export { W as PRODUCTS, o as TINT, l as polyMaterial, u as solidMaterial };
