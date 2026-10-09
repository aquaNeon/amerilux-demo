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
var m = (e, t, n, r) => [
	[e, t],
	[e + n, t],
	[e + n, t + r],
	[e, t + r]
];
function h(t, n = []) {
	let r = new e.Shape();
	t.forEach(([e, t], n) => n ? r.lineTo(e, t) : r.moveTo(e, t)), r.closePath();
	for (let t of n) {
		let n = new e.Path();
		t.forEach(([e, t], r) => r ? n.lineTo(e, t) : n.moveTo(e, t)), n.closePath(), r.holes.push(n);
	}
	return r;
}
function g(e, t, n = 4, r = !0) {
	let i = e.length, a = [];
	for (let o = 0; o < i; o++) {
		if (!r && (o === 0 || o === i - 1)) {
			a.push(e[o]);
			continue;
		}
		let s = e[o], c = e[(o - 1 + i) % i], l = e[(o + 1) % i], u = [c[0] - s[0], c[1] - s[1]], d = [l[0] - s[0], l[1] - s[1]], f = Math.hypot(...u), p = Math.hypot(...d);
		if (f < 1e-6 || p < 1e-6) {
			a.push(s);
			continue;
		}
		let m = [u[0] / f, u[1] / f], h = [d[0] / p, d[1] / p], g = Math.acos(Math.max(-1, Math.min(1, m[0] * h[0] + m[1] * h[1])));
		if (g > Math.PI - .05) {
			a.push(s);
			continue;
		}
		let _ = Math.min(t / Math.tan(g / 2), f * .45, p * .45), v = [s[0] + m[0] * _, s[1] + m[1] * _], y = [s[0] + h[0] * _, s[1] + h[1] * _];
		for (let e = 0; e <= n; e++) {
			let t = e / n, r = 1 - t;
			a.push([r * r * v[0] + 2 * r * t * s[0] + t * t * y[0], r * r * v[1] + 2 * r * t * s[1] + t * t * y[1]]);
		}
	}
	return a;
}
function _(t, { holes: r = [], depth: i, r: a = 0, hr: o = 0, bevel: s = 0 }) {
	let c = f(new e.ExtrudeGeometry(h(t, r), {
		depth: i,
		bevelEnabled: !1
	})), l = new e.ExtrudeGeometry(h(a ? g(t, a) : t, r.map((e) => o ? g(e, o) : e)), {
		depth: i - 2 * s,
		bevelEnabled: s > 0,
		bevelThickness: s,
		bevelSize: s * .8,
		bevelOffset: -s * .8,
		bevelSegments: 3,
		curveSegments: 8
	});
	return {
		geo: n(f(l), .6),
		edge: c
	};
}
function v(e, t) {
	return e.map((n, r) => {
		let i = e[Math.max(0, r - 1)], a = e[Math.min(e.length - 1, r + 1)], o = a[0] - i[0], s = a[1] - i[1], c = Math.hypot(o, s) || 1;
		return [n[0] + s / c * t, n[1] - o / c * t];
	});
}
function y(t, n) {
	let r = new e.Shape();
	t.forEach(([e, t], n) => n ? r.lineTo(e, t) : r.moveTo(e, t));
	let i = v(t, n);
	for (let e = i.length - 1; e >= 0; e--) r.lineTo(...i[e]);
	return r.closePath(), r;
}
var b = {
	skin: .6,
	rib: .5
};
function x(n, r, i, { thick: o, pitch: c, skins: u, rib: f, cross: p }) {
	let m = new e.Group(), h = l(i, .5, ["y", "thin"]);
	for (let [t, i] of u) {
		let s = d(new e.BoxGeometry(n, Math.max(i, b.skin) * a, r), h);
		s.position.y = (t - o / 2) * a, m.add(s);
	}
	let g = Math.floor(n / (c * a)), _ = -g * c * a / 2, v = [];
	for (let t = 0; t <= g; t++) {
		let n = new e.BoxGeometry(Math.max(f, b.rib) * a, o * a, r);
		n.translate(_ + t * c * a, 0, 0), v.push(n);
	}
	if (p) {
		let t = (o / 2 - u[0][1]) * a, n = c * a, i = Math.hypot(n, t), s = Math.atan2(t, n);
		for (let o = 0; o < g; o++) {
			let c = o % 2 ? _ + o * n : _ + (o + 1) * n;
			for (let l of [1, -1]) {
				let u = new e.BoxGeometry(i, Math.max(p, b.rib) * a, r);
				u.rotateZ((o % 2 ? l : -l) * s), u.translate(c + (o % 2 ? n / 2 : -n / 2), l * t / 2, 0), v.push(u);
			}
		}
	}
	let y = s(new e.MeshBasicMaterial({
		color: 2042408,
		transparent: !0,
		opacity: .16,
		depthWrite: !1
	}), `rib-${i}`, ["x", "thin"]), x = d(t(v), y);
	x.userData.edges = "none";
	let S = Math.max(1, Math.ceil(.6 / (c * a))), C = [];
	for (let e = 0; e <= g; e += S) {
		let t = _ + e * c * a, n = o / 2 * a, i = r / 2;
		C.push(t, n, -i, t, n, i, t, n, i, t, -n, i, t, n, -i, t, -n, -i);
	}
	return x.userData.sketchLines = new e.BufferGeometry().setAttribute("position", new e.Float32BufferAttribute(C, 3)), m.add(x), m;
}
function S(e, t, n, r, i) {
	let a = (t - r - i) / 2, o = [];
	for (let s = 0; s < e - 1e-6; s += t) o.push([s, 0], [s + i / 2, 0], [s + i / 2 + a, n], [s + i / 2 + a + r, n], [s + t - i / 2, 0]);
	let s = o.findIndex(([t]) => t >= e);
	if (s < 0) return [...o, [e, 0]];
	let [c, l] = o[s - 1], [u, d] = o[s];
	return [...o.slice(0, s), [e, l + (d - l) * (e - c) / (u - c)]];
}
function C(e) {
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
	return n.push([e, 0]), g(n, .1, 4, !1);
}
function w(e, t, n) {
	let r = Math.ceil(e / t * 24);
	return Array.from({ length: r + 1 }, (i, a) => {
		let o = a / r * e;
		return [o, n / 2 * (1 - Math.cos(o / t * Math.PI * 2))];
	});
}
function T() {
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
			]
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
		let r = x(18, 14, e.c, e);
		return r.position.set((n - 1) * .6, t + e.thick * a / 2, (n - 1) * -.6), t += e.thick * a + .02, {
			object: r,
			explode: i((n - 1) * 1.5, (n - 1) * 6, 0)
		};
	});
}
function E() {
	let t = 1.75, r = S(18, 176 * a, 42.5 * a, 25 * a, 116 * a), o = w(18, 67.8 * a, 22.2 * a), s = (e, t, r) => {
		let i = p(y(e, t), 14);
		return d(n(i.clone(), .5), r, i);
	}, c = new e.Group(), f = 2 * a * t / 3, m = [];
	[
		["klar", "pvc-klar"],
		["core", "pvc-core"],
		["klar", "pvc-klar"]
	].forEach(([t, n], i) => {
		let a = new e.ExtrudeGeometry(y(v(r, i * f), f), {
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
		s(C(18), .89 * a * t, u("pvc", .25, "pvc-gloss")),
		s(o, .8 * a * t, l("clear", .62, ["z", "caps"])),
		c
	].map((e, t) => (e.position.y = (t - 1) * 1.1, {
		object: e,
		explode: i((t - 1) * 1.5, (t - 1) * 6, 0)
	}));
}
function D() {
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
function O() {
	let e = 1.25, t = 1.5625;
	return {
		outer: [
			[0, 0],
			[7.3125, 0],
			[7.3125, e],
			[t, e],
			[t, .3],
			[.3, .3],
			[.3, .85],
			[0, .85]
		],
		holes: [
			0,
			1,
			2,
			3
		].map((e) => m(1.8125 + e * 1.375, .2, 1.125, .85))
	};
}
function k() {
	let { outer: e, holes: t } = O(), { geo: n, edge: r } = _(e, {
		holes: t,
		depth: 26,
		r: .07,
		hr: .04,
		bevel: .02
	});
	return [
		0,
		1,
		2,
		3
	].map((e) => {
		let t = d(n, u("deck", .8, "deck"), r);
		return t.position.x = (e - 1.5) * 6, {
			object: t,
			explode: i((e - 1.5) * 2.2, (e - 1.5) * 1.6, 0)
		};
	});
}
function A() {
	let e = .3, t = 8.31;
	return [
		[0, .795],
		[t, .795],
		[t, .795 - e * .55],
		[7, .795 - e * .55],
		[7, .49500000000000005],
		[1.9, .49500000000000005],
		[1.9, .06],
		[1.1, 0],
		[1.1, .12],
		[1.62, .16],
		[1.62, .49500000000000005],
		[.35, .49500000000000005],
		[.35, .37500000000000006],
		[.12, .37500000000000006],
		[0, .795 - e * .2]
	];
}
function j() {
	let { geo: e, edge: t } = _(A(), {
		depth: 22,
		r: .03,
		bevel: .014
	}), n = u("cladding", .6, "cladding");
	return [
		0,
		1,
		2
	].map((r) => {
		let a = d(e, n, t);
		return a.userData.noShadow = !0, a.position.set((r - 1) * 7, 0, 0), {
			object: a,
			explode: i((r - 1) * 2, (r - 1) * 4, 0)
		};
	});
}
var M = 50, N = (e, t = .01) => {
	let n = (n) => n.y < e.min.y + t || n.y > e.max.y - t, r = (n) => n.z < e.min.z + t || n.z > e.max.z - t;
	return (e, t) => n(e) && n(t) || r(e) && r(t);
}, P = 14;
function F(t) {
	let n = L(t);
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
		s.userData.edgeAngle = M, s.userData.edgeKeep = N(t[e].boundingBox), s.quaternion.copy(o), s.scale.z = P / 6, s.position.set(0, c - 3, l + r[e] / 2), l += r[e], n.push({
			object: s,
			explode: i(0, 0, 0)
		});
	}), n;
}
function I(t, n, r, a) {
	let o = n.map((n) => t[n].boundingBox.getSize(new e.Vector3())), s = -o.reduce((e, t) => e + t.z, 0) / 2;
	return n.map((e, c) => {
		let l = d(t[e], a());
		l.userData.edgeAngle = M, l.position.z = s + o[c].z / 2, s += o[c].z;
		let u = c - (n.length - 1) / 2;
		return {
			object: l,
			explode: i(0, u * r * .35, u * r)
		};
	});
}
function L(e) {
	return I(e, [
		"8-in-fem",
		"8-panel",
		"4.5-in-spacer",
		"8-panel",
		"8-in-male"
	], 7, () => u("profile", .38, "pvc-form"));
}
function R(t) {
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
var z = {
	"multiwall-sheets": {
		build: T,
		yaw: -.62
	},
	"corrugated-sheets": {
		build: E,
		yaw: -.62
	},
	"flat-sheets": {
		build: D,
		yaw: -.62
	},
	"panel-systems": {
		build: F,
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
		build: j,
		yaw: -.62
	},
	"specialty-products": {
		build: R,
		yaw: .55,
		parts: [
			"egress-well",
			"well-cover",
			"well-cover-rail"
		]
	}
};
//#endregion
export { z as PRODUCTS, o as TINT, l as polyMaterial, u as solidMaterial };
