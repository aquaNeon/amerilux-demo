import * as e from "three";
import { GLTFLoader as t } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder as n } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment as r } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries as i, toCreasedNormals as a } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry as o } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
//#region \0rolldown/runtime.js
var s = Object.defineProperty, c = (e, t, n) => () => {
	if (n) throw n[0];
	try {
		return e && (t = e(e = 0)), t;
	} catch (e) {
		throw n = [e], e;
	}
}, l = (e, t) => {
	let n = {};
	for (var r in e) s(n, r, {
		get: e[r],
		enumerable: !0
	});
	return t || s(n, Symbol.toStringTag, { value: "Module" }), n;
};
//#endregion
//#region src/tabs.js
function u(e, t) {
	e && (/^(A|BUTTON)$/.test(e.tagName) || (e.hasAttribute("role") || e.setAttribute("role", "button"), e.hasAttribute("tabindex") || (e.tabIndex = 0), e.addEventListener("keydown", (e) => {
		(e.key === "Enter" || e.key === " ") && (e.preventDefault(), t());
	})), e.addEventListener("click", (e) => {
		e.preventDefault(), t();
	}));
}
var d = class {
	constructor(e, { onSelect: t }) {
		this.items = e, this.onSelect = t, this.items.forEach((e, n) => {
			u(e.querySelector("[data-amx-trigger]"), () => t(n)), u(e.querySelector("[data-amx-close]"), () => this.set(-1));
		});
	}
	get slugs() {
		return this.items.map((e) => e.dataset.amxItem);
	}
	set(e) {
		this.items.forEach((t, n) => {
			let r = n === e;
			t.classList.toggle("is-active", r), t.querySelector("[data-amx-trigger]")?.setAttribute("aria-expanded", r);
		});
	}
	fillThumb(e, t) {
		let n = this.items[e]?.querySelector("img[data-amx-thumb]");
		n && (!n.getAttribute("src") || "amxGen" in n.dataset) && Promise.resolve(t(e)).then((e) => {
			e && (n.src = e, n.dataset.amxGen = "");
		});
	}
}, f = /* @__PURE__ */ l({
	PRODUCTS: () => A,
	TINT: () => E,
	polyMaterial: () => p,
	solidMaterial: () => m
});
function p(t, n = .55, r) {
	let i = pe.has(t);
	return D(new e.MeshPhysicalMaterial({
		color: E[t],
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
function m(t, n, r) {
	return D(new e.MeshStandardMaterial({
		color: E[t],
		roughness: n,
		metalness: 0
	}), r);
}
function h(t) {
	t.computeBoundingBox();
	let n = t.boundingBox.getCenter(new e.Vector3());
	return t.translate(-n.x, -n.y, -n.z);
}
function g(t, n) {
	return h(new e.ExtrudeGeometry(t, {
		depth: n,
		bevelEnabled: !1,
		curveSegments: 6
	}));
}
function _(t, n = []) {
	let r = new e.Shape();
	t.forEach(([e, t], n) => n ? r.lineTo(e, t) : r.moveTo(e, t)), r.closePath();
	for (let t of n) {
		let n = new e.Path();
		t.forEach(([e, t], r) => r ? n.lineTo(e, t) : n.moveTo(e, t)), n.closePath(), r.holes.push(n);
	}
	return r;
}
function v(e, t, n = 4, r = !0) {
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
function y(t, { holes: n = [], depth: r, r: i = 0, hr: o = 0, bevel: s = 0 }) {
	let c = h(new e.ExtrudeGeometry(_(t, n), {
		depth: r,
		bevelEnabled: !1
	})), l = new e.ExtrudeGeometry(_(i ? v(t, i) : t, n.map((e) => o ? v(e, o) : e)), {
		depth: r - 2 * s,
		bevelEnabled: s > 0,
		bevelThickness: s,
		bevelSize: s * .8,
		bevelOffset: -s * .8,
		bevelSegments: 3,
		curveSegments: 8
	});
	return {
		geo: a(h(l), .6),
		edge: c
	};
}
function b(e, t) {
	return e.map((n, r) => {
		let i = e[Math.max(0, r - 1)], a = e[Math.min(e.length - 1, r + 1)], o = a[0] - i[0], s = a[1] - i[1], c = Math.hypot(o, s) || 1;
		return [n[0] + s / c * t, n[1] - o / c * t];
	});
}
function ee(t, n) {
	let r = new e.Shape();
	t.forEach(([e, t], n) => n ? r.lineTo(e, t) : r.moveTo(e, t));
	let i = b(t, n);
	for (let e = i.length - 1; e >= 0; e--) r.lineTo(...i[e]);
	return r.closePath(), r;
}
function x(t, n, r, { thick: a, pitch: o, skins: s, rib: c, cross: l }) {
	let u = new e.Group(), d = p(r, .5, ["y", "thin"]);
	for (let [r, i] of s) {
		let o = O(new e.BoxGeometry(t, Math.max(i, k.skin) * T, n), d);
		o.position.y = (r - a / 2) * T, u.add(o);
	}
	let f = Math.floor(t / (o * T)), m = -f * o * T / 2, h = [];
	for (let t = 0; t <= f; t++) {
		let r = new e.BoxGeometry(Math.max(c, k.rib) * T, a * T, n);
		r.translate(m + t * o * T, 0, 0), h.push(r);
	}
	if (l) {
		let t = (a / 2 - s[0][1]) * T, r = o * T, i = Math.hypot(r, t), c = Math.atan2(t, r);
		for (let a = 0; a < f; a++) {
			let o = a % 2 ? m + a * r : m + (a + 1) * r;
			for (let s of [1, -1]) {
				let u = new e.BoxGeometry(i, Math.max(l, k.rib) * T, n);
				u.rotateZ((a % 2 ? s : -s) * c), u.translate(o + (a % 2 ? r / 2 : -r / 2), s * t / 2, 0), h.push(u);
			}
		}
	}
	let g = D(new e.MeshBasicMaterial({
		color: 2042408,
		transparent: !0,
		opacity: .16,
		depthWrite: !1
	}), `rib-${r}`, ["x", "thin"]), _ = O(i(h), g);
	_.userData.edges = "none";
	let v = Math.max(1, Math.ceil(.6 / (o * T))), y = [];
	for (let e = 0; e <= f; e += v) {
		let t = m + e * o * T, r = a / 2 * T, i = n / 2;
		y.push(t, r, -i, t, r, i, t, r, i, t, -r, i, t, r, -i, t, -r, -i);
	}
	return _.userData.sketchLines = new e.BufferGeometry().setAttribute("position", new e.Float32BufferAttribute(y, 3)), u.add(_), u;
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
	return n.push([e, 0]), v(n, .1, 4, !1);
}
function te(e, t, n) {
	let r = Math.ceil(e / t * 24);
	return Array.from({ length: r + 1 }, (i, a) => {
		let o = a / r * e;
		return [o, n / 2 * (1 - Math.cos(o / t * Math.PI * 2))];
	});
}
function ne() {
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
		return r.position.set((n - 1) * .6, t + e.thick * T / 2, (n - 1) * -.6), t += e.thick * T + .02, {
			object: r,
			explode: w((n - 1) * 1.5, (n - 1) * 6, 0)
		};
	});
}
function re() {
	let t = 1.75, n = S(18, 176 * T, 42.5 * T, 25 * T, 116 * T), r = te(18, 67.8 * T, 22.2 * T), i = (e, t, n) => {
		let r = g(ee(e, t), 14);
		return O(a(r.clone(), .5), n, r);
	}, o = new e.Group(), s = 2 * T * t / 3, c = [];
	[
		["klar", "pvc-klar"],
		["core", "pvc-core"],
		["klar", "pvc-klar"]
	].forEach(([t, r], i) => {
		let a = new e.ExtrudeGeometry(ee(b(n, i * s), s), {
			depth: 14,
			bevelEnabled: !1
		});
		c.push(a);
		let l = o.add(O(a, m(t, .6, r))).children[i];
		i > 0 && (l.userData.noCast = !0, l.userData.edges = "none");
	});
	let l = new e.Box3().setFromObject(o).getCenter(new e.Vector3());
	for (let e of c) e.translate(-l.x, -l.y, -l.z);
	for (let e of o.children) e.userData.edgeGeo = e.geometry, e.geometry = a(e.geometry.clone(), .5);
	return [
		i(C(18), .89 * T * t, m("pvc", .25, "pvc-gloss")),
		i(r, .8 * T * t, p("clear", .62, ["z", "caps"])),
		o
	].map((e, t) => (e.position.y = (t - 1) * 1.1, {
		object: e,
		explode: w((t - 1) * 1.5, (t - 1) * 6, 0)
	}));
}
function ie() {
	return [
		{
			t: .22,
			mat: () => m("hdpe", .6, "hdpe-black")
		},
		{
			t: .118,
			mat: () => p("flat", .6, ["y", "thin"]),
			finish: "acrylic-clear"
		},
		{
			t: .093,
			mat: () => p("flat", .6, ["y", "thin"])
		}
	].map(({ t, mat: n, finish: r }, i) => {
		let a = t * 1.6, s = O(new o(24, a, 16, 3, Math.min(.07, a * .3)), n(), new e.BoxGeometry(24, a, 16));
		return r && (s.material.userData.finish = r), s.position.set((i - 1) * .4, (i - 1) * .3, (i - 1) * -.4), {
			object: s,
			explode: w((i - 1) * 1.5, (i - 1) * 7, 0)
		};
	});
}
function ae() {
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
		].map((e) => me(1.8125 + e * 1.375, .2, 1.125, .85))
	};
}
function oe() {
	let { outer: e, holes: t } = ae(), { geo: n, edge: r } = y(e, {
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
		let t = O(n, m("deck", .8, "deck"), r);
		return t.position.x = (e - 1.5) * 6, {
			object: t,
			explode: w((e - 1.5) * 2.2, (e - 1.5) * 1.6, 0)
		};
	});
}
function se() {
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
function ce() {
	let { geo: e, edge: t } = y(se(), {
		depth: 22,
		r: .03,
		bevel: .014
	}), n = m("cladding", .6, "cladding");
	return [
		0,
		1,
		2
	].map((r) => {
		let i = O(e, n, t);
		return i.userData.noShadow = !0, i.position.set((r - 1) * 7, 0, 0), {
			object: i,
			explode: w((r - 1) * 2, (r - 1) * 4, 0)
		};
	});
}
function le(t) {
	let n = de(t);
	for (let e of n) e.explode.y += 6;
	let r = {
		"16-in-inner": 16,
		"18-in-inner": 18
	}, i = [
		"16-in-inner",
		"18-in-inner",
		"16-in-inner"
	], a = new e.Quaternion().setFromAxisAngle(w(0, 1, 0), Math.PI / 2), o = i.reduce((e, t) => e + r[t], 0), s = t["8-panel"].boundingBox.min.y, c = -o / 2;
	return i.forEach((e, i) => {
		let o = O(t[e], m("profile", .35, "pvc-white"));
		o.userData.edgeAngle = he, o.userData.edgeKeep = ge(t[e].boundingBox), o.quaternion.copy(a), o.scale.z = _e / 6, o.position.set(0, s - 3, c + r[e] / 2), c += r[e], n.push({
			object: o,
			explode: w(0, 0, 0)
		});
	}), n;
}
function ue(t, n, r, i) {
	let a = n.map((n) => t[n].boundingBox.getSize(new e.Vector3())), o = -a.reduce((e, t) => e + t.z, 0) / 2;
	return n.map((e, s) => {
		let c = O(t[e], i());
		c.userData.edgeAngle = he, c.position.z = o + a[s].z / 2, o += a[s].z;
		let l = s - (n.length - 1) / 2;
		return {
			object: c,
			explode: w(0, l * r * .35, l * r)
		};
	});
}
function de(e) {
	return ue(e, [
		"8-in-fem",
		"8-panel",
		"4.5-in-spacer",
		"8-panel",
		"8-in-male"
	], 7, () => m("profile", .38, "pvc-form"));
}
function fe(t) {
	let n = (e) => (e.rotation.y = Math.PI, e), r = m("well", .4, "steel-galv");
	r.side = e.DoubleSide;
	let i = n(O(t["egress-well"], r));
	i.userData.edgeAngle = 40;
	let a = n(new e.Group());
	return a.add(Object.assign(O(t["well-cover"], p("flat", .6, ["y", "thin"])), { userData: {
		realEdges: !1,
		edgeAngle: 60
	} })), a.add(O(t["well-cover-rail"], m("well", .4, "steel-galv"))), [{
		object: i,
		explode: w(0, 0, 0)
	}, {
		object: a,
		explode: w(0, 16, 3)
	}];
}
var w, T, E, D, pe, O, me, k, he, ge, _e, A, ve = c((() => {
	w = (t, n, r) => new e.Vector3(t, n, r), T = 1 / 25.4, E = {
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
	}, D = (e, t, n) => Object.assign(e.userData, {
		finish: t,
		glow: n
	}) && e, pe = /* @__PURE__ */ new Set([
		"clear",
		"flat",
		"bronze"
	]), O = (t, n, r) => {
		let i = new e.Mesh(t, n);
		return r && (i.userData.edgeGeo = r), i;
	}, me = (e, t, n, r) => [
		[e, t],
		[e + n, t],
		[e + n, t + r],
		[e, t + r]
	], k = {
		skin: .6,
		rib: .5
	}, he = 50, ge = (e, t = .01) => {
		let n = (n) => n.y < e.min.y + t || n.y > e.max.y - t, r = (n) => n.z < e.min.z + t || n.z > e.max.z - t;
		return (e, t) => n(e) && n(t) || r(e) && r(t);
	}, _e = 14, A = {
		"multiwall-sheets": {
			build: ne,
			yaw: -.62
		},
		"corrugated-sheets": {
			build: re,
			yaw: -.62
		},
		"flat-sheets": {
			build: ie,
			yaw: -.62
		},
		"panel-systems": {
			build: le,
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
			build: oe,
			yaw: -.62
		},
		"siding-cladding": {
			build: ce,
			yaw: -.62
		},
		"specialty-products": {
			build: fe,
			yaw: .55,
			parts: [
				"egress-well",
				"well-cover",
				"well-cover-rail"
			]
		}
	};
}));
//#endregion
//#region src/maps-gen.js
function ye(e) {
	return () => {
		e |= 0, e = e + 1831565813 | 0;
		let t = Math.imul(e ^ e >>> 15, 1 | e);
		return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function j(e, t) {
	let n = ye(t), r = Array.from({ length: e }, n);
	return (t) => {
		t = (t % e + e) % e;
		let n = Math.floor(t), i = t - n, a = i * i * (3 - 2 * i);
		return r[n] * (1 - a) + r[(n + 1) % e] * a;
	};
}
function M(e, t) {
	let n = ye(t), r = Array.from({ length: e * e }, n);
	return (t, n) => {
		t = (t % e + e) % e, n = (n % e + e) % e;
		let i = Math.floor(t), a = Math.floor(n), o = t - i, s = n - a, c = o * o * (3 - 2 * o), l = s * s * (3 - 2 * s), u = (i + 1) % e, d = (a + 1) % e, f = r[a * e + i], p = r[a * e + u], m = r[d * e + i], h = r[d * e + u];
		return (f * (1 - c) + p * c) * (1 - l) + (m * (1 - c) + h * c) * l;
	};
}
function N(e, t, n) {
	let r = new Uint8Array(t * t * 4);
	for (let i = 0; i < t; i++) for (let a = 0; a < t; a++) {
		let o = (e[i * t + (a + 1) % t] - e[i * t + (a - 1 + t) % t]) * n, s = (e[(i + 1) % t * t + a] - e[(i - 1 + t) % t * t + a]) * n, c = Math.hypot(o, s, 1), l = (i * t + a) * 4;
		r[l] = (-o / c * .5 + .5) * 255, r[l + 1] = (-s / c * .5 + .5) * 255, r[l + 2] = (1 / c * .5 + .5) * 255, r[l + 3] = 255;
	}
	return r;
}
function be(e, t) {
	t = Math.min(.9999, Math.max(0, t)) * (e.length - 1);
	let n = Math.floor(t), r = t - n, i = e[n], a = e[n + 1];
	return [
		i[0] + (a[0] - i[0]) * r,
		i[1] + (a[1] - i[1]) * r,
		i[2] + (a[2] - i[2]) * r
	];
}
function xe(e) {
	let t = 1024, n = new Float32Array(t * t), r = new Uint8Array(t * t * 4), i = j(10, 11), a = j(60, 12), o = j(260, 13), s = j(900, 14), c = M(6, 15), l = M(360, 16), u = M(140, 18), d = M(9, 17), f = e.map(P);
	for (let e = 0; e < t; e++) for (let p = 0; p < t; p++) {
		let m = (p + (c(p / t * 6, e / t * 6) - .5) * 50) / t, h = i(m * 10), g = a(m * 60), _ = o(m * 260), v = s(m * 900), y = l(p / t * 360, e / t * 360), b = u(p / t * 140, e / t * 140), ee = d(p / t * 9, e / t * 9), x = be(f, h * .3 + g * .25 + (ee - .5) * .35 + .28 + (_ - .5) * .18), S = 1 + (v - .5) * .1 + (y - .5) * .16 + (y > .8 ? (y - .8) * .6 : 0), C = (e * t + p) * 4;
		r[C] = Math.min(255, x[0] * S), r[C + 1] = Math.min(255, x[1] * S), r[C + 2] = Math.min(255, x[2] * S), r[C + 3] = 255, n[e * t + p] = _ * .25 + v * .45 + y * .55 + b * .3;
	}
	return {
		S: t,
		map: r,
		normal: N(n, t, 4)
	};
}
function Se(e) {
	let t = /* @__PURE__ */ new Float32Array(262144), n = /* @__PURE__ */ new Uint8Array(1048576), r = j(90, 21), i = j(260, 22), a = M(5, 23), o = M(8, 24), s = P(e);
	for (let e = 0; e < 512; e++) for (let c = 0; c < 512; c++) {
		let l = (c + (a(c / 512 * 5, e / 512 * 5) - .5) * 60) / 512, u = r(l * 90), d = i(l * 260), f = o(c / 512 * 8, e / 512 * 8), p = (e * 512 + c) * 4, m = 1 + (u - .5) * .0125 + (f - .5) * .015;
		n[p] = Math.min(255, s[0] * m), n[p + 1] = Math.min(255, s[1] * m), n[p + 2] = Math.min(255, s[2] * m), n[p + 3] = 255, t[e * 512 + c] = u ** 3 * .8 + d * .25;
	}
	return {
		S: 512,
		map: n,
		normal: N(t, 512, 4)
	};
}
function Ce(e) {
	let t = /* @__PURE__ */ new Float32Array(262144), n = /* @__PURE__ */ new Uint8Array(1048576), r = P(e), i = ye(31), a = Array.from({ length: 2304 }, () => [i(), i()]), o = M(8, 32);
	for (let e = 0; e < 512; e++) for (let i = 0; i < 512; i++) {
		let s = i / 512 * 48, c = e / 512 * 48, l = Math.floor(s), u = Math.floor(c), d = 9;
		for (let e = -1; e <= 1; e++) for (let t = -1; t <= 1; t++) {
			let n = (l + t + 48) % 48, [r, i] = a[(u + e + 48) % 48 * 48 + n];
			d = Math.min(d, Math.hypot(l + t + r - s, u + e + i - c));
		}
		let f = (e * 512 + i) * 4, p = 1 + (o(i / 512 * 8, e / 512 * 8) - .5) * .08;
		n[f] = r[0] * p, n[f + 1] = r[1] * p, n[f + 2] = r[2] * p, n[f + 3] = 255, t[e * 512 + i] = Math.min(1, d) ** 2;
	}
	return {
		S: 512,
		map: n,
		normal: N(t, 512, 3)
	};
}
var P, we, Te = c((() => {
	P = (e) => [
		e >> 16 & 255,
		e >> 8 & 255,
		e & 255
	], we = {
		deckMaps: xe,
		claddingMaps: Se,
		hammeredMaps: Ce
	};
}));
//#endregion
//#region src/maps.worker.js?worker&inline
function Ee(e) {
	let t;
	try {
		if (t = I && (self.URL || self.webkitURL).createObjectURL(I), !t) throw "";
		let n = new Worker(t, { name: e?.name });
		return n.addEventListener("error", () => {
			(self.URL || self.webkitURL).revokeObjectURL(t);
		}), n;
	} catch {
		return new Worker("data:text/javascript;charset=utf-8," + encodeURIComponent(F), { name: e?.name });
	}
}
var F, I, De = c((() => {
	F = "(function(){function e(e){return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function t(t,n){let r=e(n),i=Array.from({length:t},r);return e=>{e=(e%t+t)%t;let n=Math.floor(e),r=e-n,a=r*r*(3-2*r);return i[n]*(1-a)+i[(n+1)%t]*a}}function n(t,n){let r=e(n),i=Array.from({length:t*t},r);return(e,n)=>{e=(e%t+t)%t,n=(n%t+t)%t;let r=Math.floor(e),a=Math.floor(n),o=e-r,s=n-a,c=o*o*(3-2*o),l=s*s*(3-2*s),u=(r+1)%t,d=(a+1)%t,f=i[a*t+r],p=i[a*t+u],m=i[d*t+r],h=i[d*t+u];return(f*(1-c)+p*c)*(1-l)+(m*(1-c)+h*c)*l}}function r(e,t,n){let r=new Uint8Array(t*t*4);for(let i=0;i<t;i++)for(let a=0;a<t;a++){let o=(e[i*t+(a+1)%t]-e[i*t+(a-1+t)%t])*n,s=(e[(i+1)%t*t+a]-e[(i-1+t)%t*t+a])*n,c=Math.hypot(o,s,1),l=(i*t+a)*4;r[l]=(-o/c*.5+.5)*255,r[l+1]=(-s/c*.5+.5)*255,r[l+2]=(1/c*.5+.5)*255,r[l+3]=255}return r}let i=e=>[e>>16&255,e>>8&255,e&255];function a(e,t){t=Math.min(.9999,Math.max(0,t))*(e.length-1);let n=Math.floor(t),r=t-n,i=e[n],a=e[n+1];return[i[0]+(a[0]-i[0])*r,i[1]+(a[1]-i[1])*r,i[2]+(a[2]-i[2])*r]}function o(e){let o=1024,s=new Float32Array(o*o),c=new Uint8Array(o*o*4),l=t(10,11),u=t(60,12),d=t(260,13),f=t(900,14),p=n(6,15),m=n(360,16),h=n(140,18),g=n(9,17),_=e.map(i);for(let e=0;e<o;e++)for(let t=0;t<o;t++){let n=(t+(p(t/o*6,e/o*6)-.5)*50)/o,r=l(n*10),i=u(n*60),v=d(n*260),y=f(n*900),b=m(t/o*360,e/o*360),x=h(t/o*140,e/o*140),S=g(t/o*9,e/o*9),C=a(_,r*.3+i*.25+(S-.5)*.35+.28+(v-.5)*.18),w=1+(y-.5)*.1+(b-.5)*.16+(b>.8?(b-.8)*.6:0),T=(e*o+t)*4;c[T]=Math.min(255,C[0]*w),c[T+1]=Math.min(255,C[1]*w),c[T+2]=Math.min(255,C[2]*w),c[T+3]=255,s[e*o+t]=v*.25+y*.45+b*.55+x*.3}return{S:o,map:c,normal:r(s,o,4)}}function s(e){let a=/* @__PURE__ */ new Float32Array(262144),o=/* @__PURE__ */ new Uint8Array(1048576),s=t(90,21),c=t(260,22),l=n(5,23),u=n(8,24),d=i(e);for(let e=0;e<512;e++)for(let t=0;t<512;t++){let n=(t+(l(t/512*5,e/512*5)-.5)*60)/512,r=s(n*90),i=c(n*260),f=u(t/512*8,e/512*8),p=(e*512+t)*4,m=1+(r-.5)*.0125+(f-.5)*.015;o[p]=Math.min(255,d[0]*m),o[p+1]=Math.min(255,d[1]*m),o[p+2]=Math.min(255,d[2]*m),o[p+3]=255,a[e*512+t]=r**3*.8+i*.25}return{S:512,map:o,normal:r(a,512,4)}}function c(t){let a=/* @__PURE__ */ new Float32Array(262144),o=/* @__PURE__ */ new Uint8Array(1048576),s=i(t),c=e(31),l=Array.from({length:2304},()=>[c(),c()]),u=n(8,32);for(let e=0;e<512;e++)for(let t=0;t<512;t++){let n=t/512*48,r=e/512*48,i=Math.floor(n),c=Math.floor(r),d=9;for(let e=-1;e<=1;e++)for(let t=-1;t<=1;t++){let a=(i+t+48)%48,[o,s]=l[(c+e+48)%48*48+a];d=Math.min(d,Math.hypot(i+t+o-n,c+e+s-r))}let f=(e*512+t)*4,p=1+(u(t/512*8,e/512*8)-.5)*.08;o[f]=s[0]*p,o[f+1]=s[1]*p,o[f+2]=s[2]*p,o[f+3]=255,a[e*512+t]=Math.min(1,d)**2}return{S:512,map:o,normal:r(a,512,3)}}let l={deckMaps:o,claddingMaps:s,hammeredMaps:c};self.onmessage=({data:{name:e,fn:t,args:n}})=>{let r=l[t](...n);self.postMessage({name:e,...r},[r.map.buffer,r.normal.buffer])}})();", I = typeof self < "u" && self.Blob && new Blob(["(self.URL || self.webkitURL).revokeObjectURL(self.location.href);", F], { type: "text/javascript;charset=utf-8" });
}));
//#endregion
//#region src/materials.js
function Oe(t, n, r) {
	let i = new e.DataTexture(t, n, n, e.RGBAFormat);
	return i.wrapS = i.wrapT = e.RepeatWrapping, i.minFilter = e.LinearMipmapLinearFilter, i.generateMipmaps = !0, i.anisotropy = 8, i.colorSpace = r ? e.SRGBColorSpace : e.NoColorSpace, i.repeat.set(1 / 9, 1 / 9), i.needsUpdate = !0, i;
}
function ke() {
	return Le ?? (Le = new Promise((e) => {
		let t;
		try {
			t = new Ee();
		} catch {
			return e();
		}
		let n = new Set(Object.keys(L).filter((e) => !L[e][2] && !R[e]));
		if (!n.size) return e();
		t.onmessage = ({ data: r }) => {
			var i;
			R[i = r.name] ?? (R[i] = Fe(r)), n.delete(r.name), n.size || (t.terminate(), e());
		}, t.onerror = () => {
			t.terminate(), e();
		};
		for (let e of n) t.postMessage({
			name: e,
			fn: L[e][0],
			args: L[e][1]
		});
	}));
}
function Ae(t) {
	return He[t] ?? (He[t] = (() => {
		let [n, r] = Re[t], i = (t, i) => {
			let a = [], o = Ve.load(`${ze}${n}_${t}.jpg`, () => a.forEach((e) => {
				e.needsUpdate = !0;
			}));
			return o.clones = a, o.wrapS = o.wrapT = e.RepeatWrapping, o.anisotropy = 8, o.colorSpace = i ? e.SRGBColorSpace : e.NoColorSpace, o.repeat.set(1 / r, 1 / r), o;
		};
		return {
			map: i("color", !0),
			normal: i("normal", !1),
			rough: i("rough", !1)
		};
	})());
}
function je(e) {
	let { u: t, see: n } = this.userData;
	Object.assign(e.uniforms, t);
	let r = "uniform float amxSat;\n" + e.fragmentShader;
	n && (e.vertexShader = "uniform vec4 amxGlow;\nvarying float vAmxEdge;\nvarying vec3 vAmxObj;\n" + e.vertexShader.replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nfloat amxD = abs(dot(objectNormal, amxGlow.xyz));\nvAmxEdge = amxGlow.w > 0.5 ? amxD : (1.0 - amxD) * step(0.5, length(amxGlow.xyz));").replace("#include <begin_vertex>", "#include <begin_vertex>\nvAmxObj = position;"), r = "varying vec3 vAmxObj;\nfloat amxH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\nfloat amxVN(vec3 x) {\n  vec3 i = floor(x), f = fract(x);\n  f = f * f * (3.0 - 2.0 * f);\n  return mix(mix(mix(amxH(i), amxH(i + vec3(1, 0, 0)), f.x), mix(amxH(i + vec3(0, 1, 0)), amxH(i + vec3(1, 1, 0)), f.x), f.y),\n             mix(mix(amxH(i + vec3(0, 0, 1)), amxH(i + vec3(1, 0, 1)), f.x), mix(amxH(i + vec3(0, 1, 1)), amxH(i + vec3(1, 1, 1)), f.x), f.y), f.z);\n}\n" + r.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nfloat amxSheen = amxVN(vAmxObj * 0.18) * 0.6 + amxVN(vAmxObj * 0.55 + 4.0) * 0.4;\nroughnessFactor = clamp(roughnessFactor * mix(0.55, 1.9, amxSheen), 0.0, 1.0);").replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoatRoughness = clamp(material.clearcoatRoughness * mix(0.5, 3.0, amxSheen), 0.0, 1.0);\n#endif"), r = "varying float vAmxEdge;\n" + r.replace("#include <opaque_fragment>", "float gNV = max(abs(dot(normal, geometryViewDir)), 0.18);\nfloat gPath = 1.0 / gNV;\nfloat gF = pow(1.0 - gNV, 5.0);\nfloat gEdge = smoothstep(0.55, 0.95, vAmxEdge);\nfloat gA = 1.0 - pow(1.0 - diffuseColor.a, gPath);\ngA = mix(gA, max(gA, 0.88), gEdge);\ngA += (1.0 - gA) * gF * 0.35;\nvec3 gTint = pow(max(diffuseColor.rgb, vec3(0.02)), vec3(gPath));\nvec3 gLit = totalDiffuse + totalEmissiveRadiance;\n// faces: tint x the (light) page behind ~ a colour filter over what's seen through the sheet\nvec3 gBody = mix(gTint * 0.88, gLit * gTint * 1.3 + gTint * 0.12, gEdge);\n// curvature (flutes, ribs, rounded edges) concentrates reflections into bright glints\nfloat gCurv = clamp(length(fwidth(normal)) * 6.0, 0.0, 1.0);\ngA += (1.0 - gA) * gCurv * 0.15;\ngl_FragColor = vec4(gBody * gA + max(outgoingLight - gLit, vec3(0.0)) * (1.0 + gCurv * 1.5), gA);").replace("#include <premultiplied_alpha_fragment>", "")), r = r.replace("#include <tonemapping_fragment>", "#include <tonemapping_fragment>\ngl_FragColor.rgb = mix(vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722))), gl_FragColor.rgb, amxSat);"), e.fragmentShader = r;
}
function Me(t, { glow: n } = {}) {
	let r = V[t] || V["pvc-white"], i = new e.MeshPhysicalMaterial({
		metalness: 0,
		ior: 1.585,
		specularIntensity: 1,
		...r.params
	});
	if (r.see && Object.assign(i, {
		transparent: !0,
		depthWrite: !1,
		side: e.DoubleSide,
		premultipliedAlpha: !0
	}), r.maps || r.photo) {
		let e = r.photo ? Ae(r.photo) : Ie(r.maps), t = Ue++, n = (e) => {
			let n = e.clone();
			return n.offset.set(t * .37 % 1, t * .61 % 1), e.clones?.push(n), n;
		};
		i.map = n(e.map), r.bump !== !1 && (i.normalMap = n(e.normal)), e.rough && (i.roughnessMap = n(e.rough)), r.maps === "cladding" && (i.emissiveMap = i.map);
	}
	let a = { amxSat: { value: 1 } };
	if (r.see) {
		let [t = "x", r = "thin"] = n || [], i = {
			x: [
				1,
				0,
				0
			],
			y: [
				0,
				1,
				0
			],
			z: [
				0,
				0,
				1
			]
		}[t];
		a.amxGlow = { value: n ? new e.Vector4(...i, +(r === "caps")) : new e.Vector4(0, 0, 0, 1) };
	}
	return i.userData = {
		u: a,
		see: !!r.see,
		edge: r.edge
	}, i.onBeforeCompile = je, i.customProgramCacheKey = () => r.see ? "amx-see" : "amx-solid", i;
}
function Ne() {
	let t = document.createElement("canvas");
	t.width = t.height = 256;
	let n = t.getContext("2d");
	n.fillStyle = "#000", n.fillRect(0, 0, 256, 256);
	let r = n.createRadialGradient(128, 128, 12.8, 128, 128, 158.72);
	r.addColorStop(0, "#fff"), r.addColorStop(.55, "#d9d9d9"), r.addColorStop(1, "#000"), n.fillStyle = r, n.beginPath(), n.roundRect(10.24, 10.24, 235.52, 235.52, 20.48), n.fill();
	let i = new e.CanvasTexture(t);
	return i.colorSpace = e.SRGBColorSpace, i;
}
function Pe(t) {
	let n = new e.Scene(), r = Ne();
	n.add(new e.Mesh(new e.BoxGeometry(44, 26, 44), new e.MeshBasicMaterial({
		color: new e.Color(.068, .075, .088),
		side: e.BackSide
	})));
	let i = new e.Mesh(new e.PlaneGeometry(44, 44), new e.MeshBasicMaterial({ color: new e.Color(.29, .305, .325) }));
	i.rotation.x = -Math.PI / 2, i.position.y = -7, n.add(i);
	let a = (t, i, a, o) => {
		let s = new e.Mesh(new e.PlaneGeometry(t, i), new e.MeshBasicMaterial({
			map: r,
			color: new e.Color(o * .96, o * .99, o * 1.04),
			side: e.DoubleSide
		}));
		s.position.set(...a), s.lookAt(0, 0, 0), n.add(s);
	};
	a(16, 9, [
		-7,
		12,
		-16
	], 1.7), a(5, 18, [
		-18,
		5,
		7
	], 4.5), a(1.8, 18, [
		18,
		4,
		-4
	], 7), a(26, 26, [
		0,
		12.5,
		8
	], .8), a(9, 6, [
		11,
		1,
		18
	], 1.6);
	let o = t.fromScene(n, .02).texture;
	return n.traverse((e) => {
		e.geometry?.dispose(), e.material?.dispose();
	}), r.dispose(), o;
}
var L, R, Fe, Ie, Le, Re, ze, Be, Ve, He, z, B, V, Ue, We = c((() => {
	Te(), De(), L = {
		deck: ["deckMaps", [[
			13027012,
			13619149,
			14145493,
			14737630
		]]],
		"deck-sand": [
			"deckMaps",
			[[
				14474716,
				14803681,
				15066853,
				15330025
			]],
			!0
		],
		cladding: ["claddingMaps", [15724527]],
		hammered: ["hammeredMaps", [1381653]]
	}, R = {}, Fe = ({ S: e, map: t, normal: n }) => ({
		map: Oe(t, e, !0),
		normal: Oe(n, e, !1)
	}), Ie = (e) => R[e] ?? (R[e] = Fe(we[L[e][0]](...L[e][1]))), Re = { "deck-oak": ["deck-oak", 72] }, ze = "/textures/", Be = (e) => {
		ze = e;
	}, Ve = new e.TextureLoader(), He = {}, z = (e) => ({
		see: !0,
		params: {
			roughness: .03,
			clearcoat: 1,
			clearcoatRoughness: .015,
			envMapIntensity: 1.25,
			...e
		}
	}), B = (e) => ({ params: {
		color: 16777215,
		emissive: 16777215,
		emissiveIntensity: .14,
		...e
	} }), V = {
		"poly-clear": {
			...z({
				color: 13493215,
				opacity: .09,
				roughness: .1,
				clearcoatRoughness: .07,
				iridescence: .35,
				iridescenceIOR: 1.3,
				iridescenceThicknessRange: [180, 420]
			}),
			edge: [4025188, .75]
		},
		"poly-bronze": {
			...z({
				color: 9073760,
				opacity: .24,
				roughness: .06,
				clearcoatRoughness: .04
			}),
			edge: [7029286, .7]
		},
		"poly-opal": B({
			color: 16119285,
			roughness: .4,
			clearcoat: .5,
			clearcoatRoughness: .15,
			envMapIntensity: 1,
			emissiveIntensity: .22
		}),
		"poly-flat": {
			...z({
				color: 14413546,
				opacity: .05,
				roughness: .02,
				clearcoatRoughness: .01
			}),
			edge: [5933698, .7]
		},
		"acrylic-clear": {
			...z({
				color: 15135472,
				ior: 1.49,
				opacity: .05,
				roughness: .015,
				clearcoatRoughness: .01
			}),
			edge: [7313040, .7]
		},
		"rib-clear": z({
			color: 13493215,
			opacity: .16,
			roughness: .14,
			clearcoat: .4
		}),
		"rib-bronze": z({
			color: 7230532,
			opacity: .22,
			roughness: .12,
			clearcoat: .4
		}),
		"rib-opal": B({
			color: 16119285,
			roughness: .35
		}),
		"pvc-white": B({
			color: 16382716,
			emissive: 16317183,
			emissiveIntensity: .15,
			roughness: .48,
			clearcoat: .12,
			clearcoatRoughness: .45
		}),
		"pvc-form": B({
			roughness: .5,
			clearcoat: .1,
			clearcoatRoughness: .5
		}),
		"pvc-gloss": B({
			color: 16382716,
			emissive: 16317183,
			emissiveIntensity: .15,
			roughness: .2,
			clearcoat: .8,
			clearcoatRoughness: .1
		}),
		"pvc-klar": B({
			color: 16119282,
			emissive: 16119282,
			emissiveIntensity: .12,
			roughness: .55,
			clearcoat: .08,
			clearcoatRoughness: .5
		}),
		"pvc-core": { params: {
			color: 2105376,
			roughness: .75
		} },
		cladding: {
			params: {
				roughness: .62,
				clearcoat: .06,
				clearcoatRoughness: .55,
				emissive: 16777215,
				emissiveIntensity: .14
			},
			maps: "cladding",
			bump: !1
		},
		"hdpe-black": {
			params: {
				roughness: .55,
				envMapIntensity: 1.1,
				normalScale: new e.Vector2(.6, .6)
			},
			maps: "hammered"
		},
		"steel-galv": { params: {
			color: 12368821,
			metalness: .65,
			roughness: .42,
			envMapIntensity: 1.5,
			side: e.DoubleSide
		} },
		deck: {
			params: {
				roughness: .85,
				envMapIntensity: .8,
				normalScale: new e.Vector2(.9, .9)
			},
			maps: "deck"
		},
		"deck-oak": {
			params: {
				roughness: 1,
				envMapIntensity: .9,
				clearcoat: .08,
				clearcoatRoughness: .5,
				normalScale: new e.Vector2(1, 1)
			},
			photo: "deck-oak"
		},
		"deck-sand": {
			params: {
				roughness: .8,
				envMapIntensity: .8,
				normalScale: new e.Vector2(.9, .9)
			},
			maps: "deck-sand"
		}
	}, Ue = 0;
})), Ge, Ke, qe, Je, Ye, Xe, H, Ze = c((() => {
	Ge = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }", Ke = "\nuniform sampler2D t;\nuniform vec2 dir;\nvarying vec2 vUv;\nvoid main() {\n  vec4 s = texture2D(t, vUv) * 0.2270270270;\n  s += texture2D(t, vUv + dir * 1.3846153846) * 0.3162162162;\n  s += texture2D(t, vUv - dir * 1.3846153846) * 0.3162162162;\n  s += texture2D(t, vUv + dir * 3.2307692308) * 0.0702702703;\n  s += texture2D(t, vUv - dir * 3.2307692308) * 0.0702702703;\n  gl_FragColor = s;\n}", qe = "\nuniform sampler2D t;\nvarying vec2 vUv;\nvoid main() {\n  vec3 c = texture2D(t, vUv).rgb;\n  float pk = max(c.r, max(c.g, c.b));\n  gl_FragColor = vec4(c * smoothstep(0.95, 1.6, pk), 1.0);\n}", Je = "\nuniform sampler2D tDepth;\nuniform mat4 uProj, uInvProj;\nuniform vec2 uRes;\nuniform float uRadius, uIntensity;\nvarying vec2 vUv;\nvec3 viewPos(vec2 uv) {\n  vec4 p = uInvProj * vec4(vec3(uv, texture2D(tDepth, uv).r) * 2.0 - 1.0, 1.0);\n  return p.xyz / p.w;\n}\nfloat hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\nvoid main() {\n  float d = texture2D(tDepth, vUv).r;\n  if (d >= 1.0) { gl_FragColor = vec4(1.0); return; }\n  vec3 P = viewPos(vUv);\n  vec3 N = normalize(cross(dFdx(P), dFdy(P)));\n  if (dot(N, P) > 0.0) N = -N;\n  float R2 = uRadius * uRadius;\n  float rpx = uRadius * uProj[1][1] * 0.5 * uRes.y / (uProj[3][3] > 0.5 ? 1.0 : -P.z); // radius in pixels (ortho / perspective)\n  float spin = hash(gl_FragCoord.xy) * 6.2831853;\n  float A = 0.0;\n  const int S = 12;\n  for (int i = 0; i < S; i++) {\n    float f = (float(i) + 0.5) / float(S);\n    float ang = f * 6.2831853 * 3.0 + spin;\n    vec3 v = viewPos(vUv + vec2(cos(ang), sin(ang)) * f * rpx / uRes) - P;\n    float vv = dot(v, v);\n    A += max(0.0, dot(v, N) / (sqrt(vv) + 1e-3) - 0.08) * max(0.0, 1.0 - vv / R2);\n  }\n  gl_FragColor = vec4(vec3(clamp(1.0 - uIntensity * A / float(S) * 2.0, 0.0, 1.0)), 1.0);\n}", Ye = "\nuniform sampler2D t, tDepth;\nuniform vec2 dir;\nuniform float uNear, uFar, uOrtho;\nvarying vec2 vUv;\nfloat lin(float d) { return uOrtho > 0.5 ? uNear + d * (uFar - uNear) : uNear * uFar / (uFar - d * (uFar - uNear)); }\nvoid main() {\n  float z0 = lin(texture2D(tDepth, vUv).r);\n  float sum = 0.0, wsum = 0.0;\n  for (int i = -3; i <= 3; i++) {\n    vec2 uv = vUv + dir * float(i);\n    float w = exp(-float(i * i) / 8.0) * exp(-abs(lin(texture2D(tDepth, uv).r) - z0) * 0.08);\n    sum += texture2D(t, uv).r * w;\n    wsum += w;\n  }\n  gl_FragColor = vec4(vec3(sum / wsum), 1.0);\n}", Xe = "\nuniform sampler2D t, tAO, tBloom;\nuniform float uTime, uGrain, uBloom;\nuniform vec2 uRes;\nuniform vec3 uBg;\nvarying vec2 vUv;\n// Khronos PBR Neutral\nvec3 neutral(vec3 c) {\n  const float sc = 0.76, ds = 0.15;\n  float x = min(c.r, min(c.g, c.b));\n  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;\n  c -= off;\n  float pk = max(c.r, max(c.g, c.b));\n  if (pk < sc) return c;\n  const float d = 1.0 - sc;\n  float np = 1.0 - d * d / (pk + d - sc);\n  c *= np / pk;\n  float g = 1.0 - 1.0 / (ds * (pk - np) + 1.0);\n  return mix(c, vec3(np), g);\n}\nvec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }\nfloat h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 17.0) * 43758.5453); }\nvoid main() {\n  vec4 s = texture2D(t, vUv);\n  float a = clamp(s.a, 0.0, 1.0);\n  vec3 bloom = texture2D(tBloom, vUv).rgb * uBloom;\n  vec3 c = clamp(neutral(s.rgb * texture2D(tAO, vUv).r * 1.02 + bloom), 0.0, 1.0) + uBg * (1.0 - a);\n  c = srgb(clamp(c, 0.0, 1.0));\n  c += (h(floor(vUv * uRes)) - 0.5) * uGrain * a;\n  gl_FragColor = vec4(c, 1.0);\n}", H = class {
		constructor(t) {
			this.r = t, this.ss = 1.5;
			let n = { type: e.HalfFloatType };
			this.main = new e.WebGLRenderTarget(1, 1, {
				...n,
				samples: 4
			}), this.depth = new e.WebGLRenderTarget(1, 1, { depthTexture: new e.DepthTexture(1, 1, e.FloatType) }), this.depthMat = new e.MeshBasicMaterial({
				colorWrite: !1,
				side: e.DoubleSide
			});
			let r = () => new e.WebGLRenderTarget(1, 1, {
				...n,
				depthBuffer: !1
			});
			this.a1 = r(), this.a2 = r(), this.b1 = r(), this.b2 = r(), this.white = new e.DataTexture(new Uint8Array([
				255,
				255,
				255,
				255
			]), 1, 1), this.black = new e.DataTexture(new Uint8Array([
				0,
				0,
				0,
				255
			]), 1, 1), this.white.needsUpdate = this.black.needsUpdate = !0, this.scene = new e.Scene(), this.cam = new e.OrthographicCamera(-1, 1, 1, -1, 0, 1), this.quad = new e.Mesh(new e.PlaneGeometry(2, 2)), this.quad.frustumCulled = !1, this.scene.add(this.quad);
			let i = (t, n) => new e.ShaderMaterial({
				vertexShader: Ge,
				fragmentShader: t,
				uniforms: n,
				depthTest: !1,
				depthWrite: !1,
				toneMapped: !1
			}), a = this.depth.depthTexture;
			this.blur = i(Ke, {
				t: { value: null },
				dir: { value: new e.Vector2() }
			}), this.bright = i(qe, { t: { value: this.main.texture } }), this.ao = i(Je, {
				tDepth: { value: a },
				uProj: { value: new e.Matrix4() },
				uInvProj: { value: new e.Matrix4() },
				uRes: { value: new e.Vector2(1, 1) },
				uRadius: { value: 16 },
				uIntensity: { value: 1 }
			}), this.aoBlur = i(Ye, {
				t: { value: null },
				tDepth: { value: a },
				dir: { value: new e.Vector2() },
				uNear: { value: 1 },
				uFar: { value: 2 },
				uOrtho: { value: 0 }
			}), this.fin = i(Xe, {
				t: { value: this.main.texture },
				tAO: { value: this.white },
				tBloom: { value: this.black },
				uTime: { value: 0 },
				uGrain: { value: .022 },
				uBloom: { value: .14 },
				uRes: { value: new e.Vector2(1, 1) },
				uBg: { value: new e.Color(16119285) }
			});
		}
		setSize(e, t) {
			this.size = [e, t];
			let n = devicePixelRatio >= 2 ? 1 : this.ss;
			this.main.setSize(Math.round(e * n), Math.round(t * n)), this.hw = Math.max(1, Math.round(e * n) >> 1), this.hh = Math.max(1, Math.round(t * n) >> 1);
			for (let e of [
				this.depth,
				this.a1,
				this.a2,
				this.b1,
				this.b2
			]) e.setSize(this.hw, this.hh);
			this.ao.uniforms.uRes.value.set(this.hw, this.hh), this.fin.uniforms.uRes.value.set(e, t);
		}
		pass(e, t) {
			this.quad.material = e, this.r.setRenderTarget(t), this.r.render(this.scene, this.cam);
		}
		blurPass(e, t, n, r) {
			let i = this.blur.uniforms;
			return i.t.value = e, i.dir.value.set(r / this.hw, 0), this.pass(this.blur, t), i.t.value = t.texture, i.dir.value.set(0, r / this.hh), this.pass(this.blur, n), n.texture;
		}
		render(e, t, { ao: n = 1, aoRadius: r = 16, bloom: i = .14, grain: a = .022, time: o = 0, out: s = null } = {}) {
			let c = this.r, l = c.autoClear;
			c.autoClear = !1, c.setClearColor(0, 0), c.setRenderTarget(this.main), c.clear(), c.render(e, t);
			let u = this.fin.uniforms;
			if (n > 0) {
				let i = [];
				e.traverseVisible((e) => {
					let t = Array.isArray(e.material) ? e.material[0] : e.material;
					(t && !t.depthWrite || e.userData.noShadow) && (e.visible = !1, i.push(e));
				}), e.overrideMaterial = this.depthMat, c.setRenderTarget(this.depth), c.clear(), c.render(e, t), e.overrideMaterial = null;
				for (let e of i) e.visible = !0;
				let a = this.ao.uniforms;
				a.uProj.value.copy(t.projectionMatrix), a.uInvProj.value.copy(t.projectionMatrixInverse), a.uRadius.value = r, a.uIntensity.value = n, this.pass(this.ao, this.a1);
				let o = this.aoBlur.uniforms;
				o.uNear.value = t.near, o.uFar.value = t.far, o.uOrtho.value = +!!t.isOrthographicCamera, o.t.value = this.a1.texture, o.dir.value.set(1.5 / this.hw, 0), this.pass(this.aoBlur, this.a2), o.t.value = this.a2.texture, o.dir.value.set(0, 1.5 / this.hh), this.pass(this.aoBlur, this.a1), u.tAO.value = this.a1.texture;
			} else u.tAO.value = this.white;
			i > 0 ? (this.pass(this.bright, this.b1), this.blurPass(this.b1.texture, this.b2, this.b1, 2), u.tBloom.value = this.blurPass(this.b1.texture, this.b2, this.b1, 4)) : u.tBloom.value = this.black, u.uBloom.value = i, u.uGrain.value = a, u.uTime.value = o % 100, this.pass(this.fin, s), c.autoClear = l;
		}
	};
})), U, Qe, $e, et, tt, nt, W, rt = c((() => {
	U = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }", Qe = "\nvarying vec3 vView;\nvoid main() {\n  vec4 mv = modelViewMatrix * vec4(position, 1.0);\n  vView = mv.xyz;\n  gl_Position = projectionMatrix * mv;\n}", $e = "\nuniform float uWeight;\nvarying vec3 vView;\nvoid main() {\n  vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));\n  float lam = 0.38 + 0.62 * max(dot(n, normalize(vec3(-0.6, 0.65, 0.5))), 0.0);\n  gl_FragColor = vec4(lam, n.xy * 0.5 + 0.5, uWeight);\n}", et = "uniform float uWeight; void main() { gl_FragColor = vec4(-1.0, 0.5, 0.5, uWeight); }", tt = "\nuniform sampler2D tData, tDepth;\nuniform vec2 uRes;      // target pixels\nuniform float uPx;      // target pixels per CSS px\nuniform float uNear, uFar, uOrtho;\nuniform vec3 uBg, uInk, uPaper;\nvarying vec2 vUv;\n\nfloat depthL(vec2 uv) {\n  float d = texture2D(tDepth, uv).r;\n  return uOrtho > 0.5 ? uNear + d * (uFar - uNear) : uNear * uFar / (uFar - d * (uFar - uNear));\n}\n// nearest depth over a pixel and its 4 neighbours: closes 1 px pinholes in imported meshes, which\n// would otherwise each draw a dot (ortho: larger = farther)\nfloat depthC(vec2 uv) {\n  vec2 p = 1.0 / uRes;\n  return min(min(min(depthL(uv), depthL(uv + vec2(p.x, 0.0))), min(depthL(uv - vec2(p.x, 0.0)), depthL(uv + vec2(0.0, p.y)))), depthL(uv - vec2(0.0, p.y)));\n}\n// outline strength around uv: drawn lines (pass B) thickened, plus silhouettes from depth breaks.\n// Breaks are second differences: a sloped face (linear depth) gives none, so the threshold can sit\n// low enough to keep small steps continuous (one corrugation rib passing in front of the next).\n// (No normal-break edges: on curved, tessellated parts they double the feature lines.)\nfloat stroke(vec2 uv) {\n  vec2 o = 0.6 * uPx / uRes;\n  float line = 0.0, hits = 0.0;\n  // 3x3 pixel neighbourhood: thickens the 1 px line, and counts how many pixels it covers\n  vec2 px1 = 1.0 / uRes;\n  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {\n    vec2 q = uv + vec2(float(x), float(y)) * px1;\n    vec4 s = texture2D(tData, q);\n    // skip line pixels seen through a 1 px crack in a nearer face (their depth is well behind the\n    // pixels around them): hidden outlines would leak through as dots\n    if (s.r < -0.5 && depthL(q) - depthC(q) < 3.0) { line = max(line, s.a * (x == 0 && y == 0 ? 1.0 : 0.45)); hits += 1.0; }\n  }\n  line *= step(1.5, hits); // a real line covers neighbouring pixels (incl. diagonal); lone pixels are depth noise\n  float z2 = 2.0 * depthC(uv);\n  vec2 dx = vec2(o.x * 1.3, 0.0), dy = vec2(0.0, o.y * 1.3);\n  float dz = max(abs(depthC(uv + dx) + depthC(uv - dx) - z2), abs(depthC(uv + dy) + depthC(uv - dy) - z2));\n  float w = max(texture2D(tData, uv).a, 0.25);\n  return max(line, smoothstep(2.5, 6.0, dz) * w);\n}\nvoid main() {\n  float ink = stroke(vUv);\n\n  // solid faces: plain paper fill\n  vec4 c = texture2D(tData, vUv);\n  float solid = (c.r > -0.5 && texture2D(tDepth, vUv).r < 1.0) ? 1.0 : 0.0;\n\n  vec3 col = mix(uBg, uPaper, solid * mix(0.35, 0.8, c.a));\n  col = mix(col, uInk, clamp(ink, 0.0, 1.0) * 0.85);\n  gl_FragColor = vec4(col, 1.0);\n}", nt = "\nuniform sampler2D t;\nuniform vec2 uStep; // a quarter of an output pixel, in uv\nvarying vec2 vUv;\nvoid main() {\n  gl_FragColor = 0.25 * (texture2D(t, vUv + vec2(-uStep.x, -uStep.y)) + texture2D(t, vUv + vec2(uStep.x, -uStep.y))\n    + texture2D(t, vUv + vec2(-uStep.x, uStep.y)) + texture2D(t, vUv + vec2(uStep.x, uStep.y)));\n}", W = class {
		constructor(t) {
			this.r = t, this.target = new e.WebGLRenderTarget(1, 1, {
				type: e.HalfFloatType,
				minFilter: e.NearestFilter,
				magFilter: e.NearestFilter,
				depthTexture: new e.DepthTexture(1, 1, e.FloatType)
			}), this.meshMat = new e.ShaderMaterial({
				vertexShader: Qe,
				fragmentShader: $e,
				uniforms: { uWeight: { value: 1 } },
				side: e.DoubleSide
			}), this.lineMat = new e.ShaderMaterial({
				vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z -= 2e-5 * gl_Position.w; }",
				fragmentShader: et,
				uniforms: { uWeight: { value: 1 } },
				depthWrite: !1
			}), this.drawn = new e.WebGLRenderTarget(1, 1, { depthBuffer: !1 }), this.post = new e.ShaderMaterial({
				vertexShader: U,
				fragmentShader: tt,
				depthTest: !1,
				depthWrite: !1,
				toneMapped: !1,
				uniforms: {
					tData: { value: this.target.texture },
					tDepth: { value: this.target.depthTexture },
					uRes: { value: new e.Vector2(1, 1) },
					uPx: { value: 1 },
					uNear: { value: 1 },
					uFar: { value: 2 },
					uOrtho: { value: 1 },
					uBg: { value: new e.Color(16119285) },
					uInk: { value: new e.Color(2763308) },
					uPaper: { value: new e.Color(16579834) }
				}
			}), this.down = new e.ShaderMaterial({
				vertexShader: U,
				fragmentShader: nt,
				depthTest: !1,
				depthWrite: !1,
				toneMapped: !1,
				uniforms: {
					t: { value: this.drawn.texture },
					uStep: { value: new e.Vector2() }
				}
			}), this.scene = new e.Scene(), this.quad = new e.Mesh(new e.PlaneGeometry(2, 2), this.post), this.quad.frustumCulled = !1, this.scene.add(this.quad), this.cam = new e.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		}
		setBackground(e) {
			this.post.uniforms.uBg.value.copy(e).convertLinearToSRGB();
		}
		setSize(e, t, n = 1) {
			let r = n >= 2 ? 1.5 : 2, i = Math.round(e * r), a = Math.round(t * r);
			this.target.setSize(i, a), this.drawn.setSize(i, a), this.post.uniforms.uRes.value.set(i, a), this.post.uniforms.uPx.value = n * r, this.down.uniforms.uStep.value.set(.25 / e, .25 / t);
		}
		render(e, t, { hide: n = [], lines: r = [], out: i = null } = {}) {
			let a = this.r, o = this.post.uniforms;
			o.uNear.value = t.near, o.uFar.value = t.far, o.uOrtho.value = +!!t.isOrthographicCamera;
			let s = r.map((e) => e.visible), c = a.shadowMap.enabled;
			a.shadowMap.enabled = !1, a.setRenderTarget(this.target), a.setClearColor(0, 0), a.clear(), n.forEach((e) => {
				e.visible = !1;
			}), r.forEach((e) => {
				e.visible = !1;
			}), e.overrideMaterial = this.meshMat, a.render(e, t), n.forEach((e) => {
				e.visible = !0;
			}), r.forEach((e) => {
				e.visible = !0;
			}), e.overrideMaterial = this.lineMat;
			let l = t.layers.mask;
			t.layers.set(1);
			let u = a.autoClear;
			a.autoClear = !1, a.render(e, t), a.autoClear = u, t.layers.mask = l, e.overrideMaterial = null, r.forEach((e, t) => {
				e.visible = s[t];
			}), a.shadowMap.enabled = c, this.quad.material = this.post, a.setRenderTarget(this.drawn), a.render(this.scene, this.cam), this.quad.material = this.down, a.setRenderTarget(i), a.render(this.scene, this.cam);
		}
	};
})), it = /* @__PURE__ */ l({
	LAYOUTS: () => G,
	Stage: () => yt
});
function at(t) {
	let n = t.geometry, r = new e.BufferGeometry();
	for (let t of ["position", "normal"]) {
		let i = n.getAttribute(t);
		if (!i) continue;
		let a = new Float32Array(i.count * 3);
		for (let e = 0; e < i.count; e++) a[e * 3] = i.getX(e), a[e * 3 + 1] = i.getY(e), a[e * 3 + 2] = i.getZ(e);
		r.setAttribute(t, new e.BufferAttribute(a, 3));
	}
	return n.index && r.setIndex(n.index), r.applyMatrix4(t.matrixWorld), r.getAttribute("normal") || r.computeVertexNormals(), r.computeBoundingBox(), r.userData.quantized = !0, r;
}
function ot(t, n = .03) {
	let r = t.getAttribute("position").array, i = [];
	for (let e = 0; e < r.length; e += 6) if (Math.hypot(r[e + 3] - r[e], r[e + 4] - r[e + 1], r[e + 5] - r[e + 2]) >= n) for (let t = 0; t < 6; t++) i.push(r[e + t]);
	return t.setAttribute("position", new e.Float32BufferAttribute(i, 3)), t;
}
function st(t, n) {
	let r = t.getAttribute("position").array, i = [], a = new e.Vector3(), o = new e.Vector3();
	for (let e = 0; e < r.length; e += 6) if (a.fromArray(r, e), o.fromArray(r, e + 3), n(a, o)) for (let t = 0; t < 6; t++) i.push(r[e + t]);
	return t.setAttribute("position", new e.Float32BufferAttribute(i, 3)), t;
}
function ct(t, n = 28, r = .006) {
	let i = t.getAttribute("position"), a = t.index ? t.index.array : null, o = a ? a.length : i.count, s = Math.cos(e.MathUtils.degToRad(n)), c = new e.Vector3(), l = new e.Vector3(), u = new e.Vector3(), d = new e.Vector3(), f = new e.Vector3(), p = new e.Vector3(), m = (e) => `${Math.round(e.x * 1e4)},${Math.round(e.y * 1e4)},${Math.round(e.z * 1e4)}`, h = /* @__PURE__ */ new Map();
	for (let e = 0; e < o; e += 3) {
		let t = [
			0,
			1,
			2
		].map((t) => a ? a[e + t] : e + t);
		c.fromBufferAttribute(i, t[0]), l.fromBufferAttribute(i, t[1]), u.fromBufferAttribute(i, t[2]), d.subVectors(l, c), f.subVectors(u, c), p.crossVectors(d, f);
		let n = p.length();
		if (n < 1e-12) continue;
		p.divideScalar(n);
		let o = n / Math.max(d.length(), f.length(), l.distanceTo(u)) < r, g = [
			c.clone(),
			l.clone(),
			u.clone()
		];
		for (let e = 0; e < 3; e++) {
			let t = g[e], n = g[(e + 1) % 3], r = m(t), i = m(n);
			if (r === i) continue;
			let a = r < i ? `${r}|${i}` : `${i}|${r}`, c = h.get(a);
			c ? (c.faces++, c.keep = !c.sliver && !o && c.n.dot(p) <= s) : h.set(a, {
				p0: t,
				p1: n,
				n: p.clone(),
				sliver: o,
				faces: 1,
				keep: !1
			});
		}
	}
	let g = [];
	for (let e of h.values()) (e.faces === 1 ? !e.sliver : e.keep) && g.push(e.p0.x, e.p0.y, e.p0.z, e.p1.x, e.p1.y, e.p1.z);
	return new e.BufferGeometry().setAttribute("position", new e.Float32BufferAttribute(g, 3));
}
function lt(t) {
	for (let n = t; n; n = n.parentElement) {
		let t = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
		if (t && (t[3] === void 0 || +t[3] > .5)) return new e.Color(`rgb(${t[0]}, ${t[1]}, ${t[2]})`);
	}
	return new e.Color(16777215);
}
function ut(e, t, n, r, i) {
	let a = i.uniforms?.uWeight;
	a && (a.value = (this.userData.item?.a ?? 1) * (this.userData.sketchWeight ?? 1), i.uniformsNeedUpdate = !0);
}
function dt(t, n) {
	let r = Math.abs(n), i = Math.min(Math.floor(r), t.length - 2), a = e.MathUtils.lerp(t[i], t[i + 1], r - i);
	return Math.sign(n) * a;
}
var G, K, q, ft, pt, J, mt, Y, ht, X, Z, Q, gt, _t, $, vt, yt, bt = c((() => {
	ve(), We(), Ze(), rt(), G = {
		hero: {
			designW: 1141,
			slots: [
				0,
				375,
				610,
				845,
				1080
			],
			small: {
				w: 160,
				h: 104
			},
			big: {
				w: 470,
				h: 410
			},
			centerX: .505,
			centerY: .67
		},
		strip: {
			designW: 1384,
			slots: [
				0,
				302,
				528,
				754,
				980
			],
			small: {
				w: 174,
				h: 114
			},
			big: {
				w: 330,
				h: 320
			},
			centerX: .5,
			centerY: .47
		}
	}, K = e.MathUtils.degToRad(34), q = 18, ft = new e.Vector3(-.42, .82, .38).normalize(), pt = .14, J = 26, mt = 2 * Math.sqrt(J), Y = (e) => Math.min(1, Math.max(0, e)), ht = (e) => e * e * (3 - 2 * e), X = (e, t) => ((e + t / 2) % t + t) % t - t / 2, Z = /* @__PURE__ */ new WeakMap(), Q = new e.Color(2042408), gt = new e.Color(7039851), _t = (e) => .2126 * e.r + .7152 * e.g + .0722 * e.b, $ = (t) => {
		let n = _t(t);
		return new e.Color(n, n, n);
	}, vt = () => new Promise((e) => window.requestIdleCallback ? requestIdleCallback(() => e(), { timeout: 200 }) : setTimeout(e, 16)), yt = class {
		constructor(t, { slugs: n, modelBase: r, textureBase: i, layout: a = "hero", centerX: o, centerY: s, onChange: c, onBuilt: l }) {
			this.el = t, this.slugs = n, this.modelBase = r, i && Be(i), this.layout = G[a] || G.hero, this.centerX = o ?? this.layout.centerX, this.centerY = s ?? this.layout.centerY, this.onChange = c, this.onBuilt = l, this.style = "color", this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
			let u = this.renderer = new e.WebGLRenderer({
				antialias: !0,
				alpha: !0,
				powerPreference: "high-performance"
			});
			u.setPixelRatio(Math.min(devicePixelRatio, 2)), u.debug.checkShaderErrors = !1, u.toneMapping = e.NeutralToneMapping, u.toneMappingExposure = .95, u.shadowMap.enabled = !0, u.shadowMap.autoUpdate = !1, this.canvas = u.domElement, this.canvas.className = "amx-canvas", t.appendChild(this.canvas), this.scene = new e.Scene(), this.pmrem = new e.PMREMGenerator(u), this.key = new e.DirectionalLight(16777215, 2.2), this.key.shadow.mapSize.set(2048, 2048), this.key.shadow.bias = -3e-4, this.key.shadow.radius = 3, this.hemi = new e.HemisphereLight(16777215, 10134434, .5), this.scene.add(this.key, this.key.target, this.hemi), this.bg = lt(t), this.pipe = new H(u), this.pipe.fin.uniforms.uBg.value.copy(this.bg), this.sketch = new W(u), this.sketch.setBackground(this.bg), this.ortho = new e.OrthographicCamera(), this.ortho.position.set(0, Math.sin(K), Math.cos(K)).multiplyScalar(2e3), this.ortho.lookAt(0, 0, 0), this.ortho.near = 1e3, this.ortho.far = 3e3, this.persp = new e.PerspectiveCamera(q, 1, 10, 4e4), this.items = n.map((e, t) => this.createItem(e, t)), this.current = 0, this.target = 0, this.active = 0, this.pointer = new e.Vector2(0, 0), this.follow = new e.Vector2(0, 0), this.followVel = new e.Vector2(0, 0), this.timer = new e.Timer(), this.raycaster = new e.Raycaster(), this._box = new e.Box3(), this._v = new e.Vector3(), this.frames = 0, this.resize(), new ResizeObserver(() => this.resize()).observe(t), this.bindPointer(), this.bindVisibility(), this.applyStyle(), this.ready = this.load(), this.loaded = this.ready.then(() => this.rest), u.setAnimationLoop(() => this.tick());
		}
		get camera() {
			return this.style === "color" ? this.persp : this.ortho;
		}
		get envReal() {
			return this._envReal ?? (this._envReal = Pe(this.pmrem));
		}
		get envIllus() {
			return this._envIllus ?? (this._envIllus = this.pmrem.fromScene(new r(), .04).texture);
		}
		createItem(t, n) {
			let r = A[t], i = new e.Group(), a = new e.Group(), o = new e.Group();
			return i.add(a), a.add(o), i.visible = !1, this.scene.add(i), {
				slug: t,
				index: n,
				def: r,
				root: i,
				tilt: a,
				content: o,
				layers: [],
				materials: [],
				reals: [],
				meshes: [],
				edges: [],
				built: !1,
				hover: 0,
				appear: 0,
				appearVel: 0
			};
		}
		async load() {
			let e = new t().setMeshoptDecoder(n);
			this.parts = {};
			let r = {}, i = (t) => r[t] ?? (r[t] = e.loadAsync(`${this.modelBase}${t}.glb`).then((e) => {
				let n;
				e.scene.updateMatrixWorld(!0), e.scene.traverse((e) => {
					e.isMesh && !n && (n = e);
				}), this.parts[t] = at(n);
			})), a = this.items.length, o = [...this.items].sort((e, t) => Math.abs(X(e.index - this.target, a)) - Math.abs(X(t.index - this.target, a))), s = ke(), c = async (e, t) => {
				await Promise.all([...(e.def.parts || []).map(i), t || s]), this.buildItem(e), this.styleItem(e), await this.compileItem(e), e.built = !0, this.onBuilt?.(e.index);
			};
			await c(o[0], !0), this.rest = (async () => {
				for (let e of o.slice(1)) for (let t of e.def.parts || []) i(t);
				for (let e of o.slice(1)) await vt(), await c(e);
				await vt(), this.precompile();
			})();
		}
		compileItem(e) {
			e.root.visible = !0;
			let t = this.compile(e.root);
			return e.root.visible = !1, t;
		}
		compile(e) {
			let t = this.renderer, n = t.getRenderTarget();
			t.setRenderTarget(this.style === "color" ? this.pipe.main : null);
			let r = t.compileAsync(e, this.camera, this.scene).catch(() => {});
			return t.setRenderTarget(n), r;
		}
		buildItem(t) {
			t.layers = t.def.build(this.parts);
			let n = /* @__PURE__ */ new Set(), r = [];
			for (let e of t.layers) e.home = e.object.position.clone(), t.content.add(e.object), e.object.traverse((e) => {
				e.isMesh && r.push(e);
			});
			t.edgeMat = new e.LineBasicMaterial({
				color: Q,
				transparent: !0,
				opacity: .75
			});
			let i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
			for (let o of r) {
				if (o.userData.item = t, n.add(o.material), !i.has(o.material)) {
					let t = Me(o.material.userData.finish, o.material.userData);
					i.set(o.material, t);
					let n = t.userData.edge;
					if (n) {
						let r = new e.LineBasicMaterial({
							color: n[0],
							transparent: !0,
							opacity: n[1]
						});
						a.set(t, {
							m: r,
							color: r.color.clone(),
							grey: $(r.color)
						});
					}
				}
				let r = i.get(o.material);
				if (o.userData.illus = o.material, o.userData.real = r, o.userData.see = r.userData.see, o.onBeforeRender = ut, o.userData.edges === "none" && !o.userData.see) continue;
				let s = o.userData.edgeGeo || o.geometry, c = o.userData.edges === "none" && o.userData.sketchLines;
				if (!c) {
					let t = o.userData.edgeAngle ?? 28;
					if (!Z.has(s)) {
						let n = s.userData.quantized ? ct(s, t) : ot(new e.EdgesGeometry(s, t));
						Z.set(s, o.userData.edgeKeep ? st(n, o.userData.edgeKeep) : n);
					}
					c = Z.get(s);
				}
				let l = new e.LineSegments(c, t.edgeMat);
				l.raycast = () => {}, l.onBeforeRender = ut, l.layers.enable(1), l.userData.real = o.userData.realEdges === !1 ? null : a.get(r)?.m, l.userData.item = t, l.userData.sketchOnly = o.userData.edges === "none", l.userData.sketchWeight = l.userData.sketchOnly ? .22 : o.userData.see ? .6 : 1, o.add(l), t.edges.push(l);
			}
			t.see = r.filter((e) => e.userData.see), t.meshes = r, t.reals = [...i.values()].map((e) => ({
				m: e,
				color: e.color.clone(),
				grey: $(e.color)
			})), t.realEdges = [...a.values()], t.materials = [...n].map((t) => {
				let n = .62 + _t(t.color) * .3;
				return {
					m: t,
					grey: new e.Color(n, n, n),
					mono: $(t.color),
					opacity: t.opacity
				};
			}), this.measure(t), t.tilt.rotation.y = t.def.yaw;
		}
		setStyle(e) {
			this.style = ["mono", "sketch"].includes(e) ? e : "color", this.applyStyle();
		}
		applyStyle() {
			let e = this.style === "color";
			this.scene.environment = e ? this.envReal : this.envIllus, this.scene.environmentIntensity = e ? 1 : .55, this.key.intensity = e ? 2.3 : 2.2, this.key.color.set(e ? 15988735 : 16777215), this.key.castShadow = e, e || (this.key.position.set(-300, 600, 400), this.key.target.position.set(0, 0, 0)), this.hemi.visible = !e;
			for (let e of this.items) this.styleItem(e);
		}
		styleItem(e) {
			let t = this.style === "color", n = this.style === "sketch";
			for (let n of e.meshes) n.material = t ? n.userData.real : n.userData.illus, n.castShadow = n.receiveShadow = t && !n.userData.see, n.userData.noCast && (n.castShadow = !1), n.userData.noShadow && (n.castShadow = n.receiveShadow = !1);
			for (let r of e.edges) r.material = t && r.userData.real || e.edgeMat, r.visible = !n && !r.userData.sketchOnly && (!t || !!r.userData.real);
		}
		precompile() {
			let e = this.style;
			this.style = e === "color" ? "mono" : "color", this.applyStyle();
			let t = this.items.map((e) => e.root.visible);
			this.items.forEach((e) => {
				e.root.visible = e.built;
			}), this.compile(this.scene), this.items.forEach((e, n) => {
				e.root.visible = t[n];
			}), this.style = e, this.applyStyle();
		}
		sketchLists() {
			let e = this.items.filter((e) => e.built);
			return {
				lines: e.flatMap((e) => e.edges),
				hide: e.flatMap((e) => e.see)
			};
		}
		setExplode(e, t) {
			for (let n of e.layers) n.object.position.copy(n.home).addScaledVector(n.explode, t);
		}
		measure(t) {
			let n = new e.Matrix4().makeRotationFromQuaternion(this.ortho.quaternion.clone().invert()), r = new e.Matrix4().makeRotationY(t.def.yaw), i = n.multiply(r), a = new e.Box3(), o = new e.Vector3();
			t.fit = [0, 1].map((n) => {
				this.setExplode(t, n), t.content.position.set(0, 0, 0), t.content.updateMatrixWorld(!0), a.makeEmpty();
				for (let e of t.layers) a.expandByObject(e.object);
				let r = a.getCenter(new e.Vector3()), s = Infinity, c = -Infinity, l = Infinity, u = -Infinity;
				for (let e = 0; e < 8; e++) o.set(e & 1 ? a.max.x : a.min.x, e & 2 ? a.max.y : a.min.y, e & 4 ? a.max.z : a.min.z).sub(r).applyMatrix4(i), s = Math.min(s, o.x), c = Math.max(c, o.x), l = Math.min(l, o.y), u = Math.max(u, o.y);
				return {
					center: r,
					w: c - s,
					h: u - l
				};
			});
		}
		fitShadow(t) {
			let n = this._box.setFromObject(t.tilt), r = n.getCenter(this._v), i = Math.max(1, n.getSize(new e.Vector3()).length() * .55);
			this.key.target.position.copy(r), this.key.position.copy(r).addScaledVector(ft, i * 4);
			let a = this.key.shadow.camera;
			Object.assign(a, {
				left: -i,
				right: i,
				top: i,
				bottom: -i,
				near: i,
				far: i * 8
			}), a.updateProjectionMatrix(), this.key.shadow.normalBias = t.root.scale.x * .012, this.key.target.updateMatrixWorld(), this.renderer.shadowMap.needsUpdate = !0;
		}
		go(e) {
			let t = this.items.length;
			this.target = this.current + X(e - this.current, t);
		}
		next(e = 1) {
			this.go(Math.round(this.target) + e);
		}
		resize() {
			let { clientWidth: t, clientHeight: n } = this.el;
			if (!t || !n) return;
			this.w = t, this.h = n, this.renderer.setSize(t, n, !1), this.scale = e.MathUtils.clamp(t / this.layout.designW, .45, 1.5);
			let r = t * this.centerX, i = n * this.centerY;
			Object.assign(this.ortho, {
				left: -r,
				right: t - r,
				top: i,
				bottom: i - n
			}), this.ortho.updateProjectionMatrix();
			let a = n / 2 / Math.tan(e.MathUtils.degToRad(q / 2)), o = this.persp;
			o.position.set(0, Math.sin(K), Math.cos(K)).multiplyScalar(a), o.lookAt(0, 0, 0), o.near = a * .72, o.far = a * 1.32, o.setViewOffset(t, n, t / 2 - r, n / 2 - i, t, n), o.updateProjectionMatrix();
			let s = this.renderer.getDrawingBufferSize(new e.Vector2());
			this.pipe.setSize(s.x, s.y), this.sketch.setSize(s.x, s.y, s.x / t);
		}
		bindPointer() {
			let t = this.canvas, n = null, r = (n) => {
				let r = t.getBoundingClientRect();
				return new e.Vector2((n.clientX - r.left) / r.width * 2 - 1, -((n.clientY - r.top) / r.height) * 2 + 1);
			}, i = (e) => {
				this.raycaster.setFromCamera(r(e), this.camera);
				let t = this.raycaster.intersectObjects(this.items.map((e) => e.root), !0)[0];
				return t ? t.object.userData.item : null;
			};
			t.addEventListener("pointerdown", (e) => {
				n = {
					x: e.clientX,
					start: this.current,
					moved: !1,
					id: e.pointerId
				};
			}), t.addEventListener("pointermove", (e) => {
				if (this.pointer.copy(r(e)), n) {
					let r = e.clientX - n.x;
					if (Math.abs(r) > 6 && !n.moved && (n.moved = !0, t.setPointerCapture(n.id), t.classList.add("is-dragging")), n.moved) {
						this.current = this.target = n.start - r / (this.layout.slots[1] * this.scale);
						return;
					}
				}
				e.pointerType === "mouse" && (this.hovered = i(e), t.style.cursor = this.hovered && this.hovered.index !== this.active ? "pointer" : n ? "grabbing" : "grab");
			});
			let a = (e) => {
				if (n) {
					if (n.moved) this.go(Math.round(this.current));
					else {
						let t = i(e);
						t && this.go(t.index);
					}
					t.classList.remove("is-dragging"), n = null;
				}
			};
			t.addEventListener("pointerup", a), t.addEventListener("pointercancel", a), t.addEventListener("pointerleave", () => {
				this.hovered = null, this.pointer.set(0, 0);
			});
		}
		bindVisibility() {
			this.visible = !0, new IntersectionObserver(([e]) => {
				this.visible = e.isIntersecting;
			}).observe(this.el);
		}
		adapt(e) {
			if (this.ema = this.ema == null ? .016 : this.ema * .95 + Math.min(e, .2) * .05, !(++this.frames <= 90 || this.ema <= .034)) {
				if (this.pipe.ss > 1 && this.style === "color") this.pipe.ss = 1, this.pipe.setSize(...this.pipe.size);
				else if (this.renderer.getPixelRatio() > 1) this.renderer.setPixelRatio(1), this.resize();
				else return;
				this.ema = .016, this.frames = 0;
			}
		}
		tick() {
			this.timer.update();
			let t = this.timer.getDelta(), n = Math.min(t, .05);
			if (!this.visible || document.hidden || !this.w) return;
			this.adapt(t);
			let r = this.timer.getElapsed(), i = this.items.length, a = this.style === "color";
			this.current += (this.target - this.current) * (1 - Math.exp(-n * 7)), this.followVel.x += ((this.pointer.x - this.follow.x) * 9 - this.followVel.x * 6) * n, this.followVel.y += ((this.pointer.y - this.follow.y) * 9 - this.followVel.y * 6) * n, this.follow.addScaledVector(this.followVel, n);
			let o = (Math.round(this.current) % i + i) % i;
			o !== this.active && (this.active = o, this.onChange?.(o));
			for (let t of this.items) {
				if (!t.built) continue;
				let o = X(t.index - this.current, i), s = ht(Y(1 - Math.abs(o)));
				t.hover += (+(this.hovered === t && s < .5) - t.hover) * (1 - Math.exp(-n * 5)), t.revealAt ?? (this.lastReveal = t.revealAt = Math.max(r, (this.lastReveal ?? -Infinity) + pt)), this.reduced ? t.appear = 1 : r >= t.revealAt && (t.appearVel += ((1 - t.appear) * J - t.appearVel * mt) * n, t.appear += t.appearVel * n);
				let c = Y(t.appear), l = ht(Y((s - .25) / .75));
				this.setExplode(t, l), t.content.position.lerpVectors(t.fit[0].center, t.fit[1].center, l).negate();
				let [u, d] = t.fit, { small: f, big: p, slots: m } = this.layout, h = Math.min(f.w / u.w, f.h / u.h), g = Math.min(p.w / d.w, p.h / d.h), _ = e.MathUtils.lerp(h, g, s) * this.scale * c * (1 + t.hover * .04);
				t.root.scale.setScalar(_), t.root.position.set(dt(m, o) * this.scale, t.hover * 6 - (1 - c) * 24 * this.scale, 0), t.root.visible = Math.abs(o) < 3.6 && c > .002, t.a = s;
				let v = this.reduced ? 0 : Math.sin(r * .3) * .07 * s;
				if (t.tilt.rotation.y = t.def.yaw + v + this.follow.x * .09 * s, t.tilt.rotation.x = -this.follow.y * .045 * s, t.tilt.position.y = this.reduced ? 0 : Math.sin(r * .45 + t.index) * 1.5 * s, !a) {
					for (let n of t.materials) n.m.color.lerpColors(n.grey, n.mono, s), n.m.transparent && (n.m.opacity = e.MathUtils.lerp(Math.min(1, n.opacity + .2), n.opacity, s));
					t.edgeMat.color.copy(gt).lerp(Q, s), t.edgeMat.opacity = .45 + .35 * s;
				}
			}
			this.style === "sketch" ? this.sketch.render(this.scene, this.ortho, {
				...this.sketchLists(),
				time: r
			}) : a ? (this.items[this.active].built && this.fitShadow(this.items[this.active]), this.pipe.render(this.scene, this.persp, {
				aoRadius: 34 * this.scale,
				ao: 1.6,
				time: r
			})) : this.renderer.render(this.scene, this.ortho);
		}
		snapshot(t, n = 204) {
			let r = this.items[t];
			if (!r?.built) return null;
			let i = this.style === "color", a = this.renderer, o = new e.WebGLRenderTarget(n, n, this.style === "mono" ? { samples: 4 } : {}), s = this.ortho.clone(), c = r.fit[1], l = Math.max(c.w, c.h) * .54;
			Object.assign(s, {
				left: -l,
				right: l,
				top: l,
				bottom: -l
			}), s.updateProjectionMatrix();
			let u = this.items.map((e) => e.root.visible), d = {
				p: r.root.position.clone(),
				s: r.root.scale.x,
				ry: r.tilt.rotation.y,
				rx: r.tilt.rotation.x,
				ty: r.tilt.position.y
			};
			this.items.forEach((e) => {
				e.root.visible = e === r;
			}), this.setExplode(r, 1), r.content.position.copy(c.center).negate(), r.root.position.set(0, 0, 0), r.root.scale.setScalar(1), r.tilt.rotation.set(0, r.def.yaw, 0), r.tilt.position.y = 0;
			for (let e of r.materials) e.m.color.copy(e.mono), e.m.opacity = e.opacity;
			for (let e of r.reals) e.m.color.copy(e.color), e.m.userData.u.amxSat.value = 1;
			for (let e of r.realEdges) e.m.color.copy(e.color);
			if (r.edgeMat.color.copy(Q), r.edgeMat.opacity = .8, r.a = 1, this.style === "sketch") this.thumbSketch || (this.thumbSketch = new W(a), this.thumbSketch.setSize(n, n, 2), this.thumbSketch.setBackground(new e.Color(15592939))), this.thumbSketch.render(this.scene, s, {
				hide: r.see,
				lines: r.edges,
				out: o
			});
			else if (i) this.thumbPipe || (this.thumbPipe = new H(a), this.thumbPipe.setSize(n, n), this.thumbPipe.fin.uniforms.uBg.value.set(15592939)), this.fitShadow(r), this.thumbPipe.render(this.scene, s, {
				out: o,
				grain: 0,
				bloom: 0,
				aoRadius: l * .05
			});
			else {
				o.texture.colorSpace = e.SRGBColorSpace;
				let t = this.scene.background;
				this.scene.background = new e.Color(15592939), a.setRenderTarget(o), a.render(this.scene, s), this.scene.background = t;
			}
			a.setRenderTarget(null), this.items.forEach((e, t) => {
				e.root.visible = u[t];
			}), r.root.position.copy(d.p), r.root.scale.setScalar(d.s), r.tilt.rotation.set(d.rx, d.ry, 0), r.tilt.position.y = d.ty;
			let f = new Uint8Array(n * n * 4);
			return a.readRenderTargetPixelsAsync(o, 0, 0, n, n, f).then(() => {
				o.dispose();
				let e = document.createElement("canvas");
				e.width = e.height = n;
				let t = e.getContext("2d"), r = t.createImageData(n, n);
				for (let e = 0; e < n; e++) r.data.set(f.subarray((n - 1 - e) * n * 4, (n - e) * n * 4), e * n * 4);
				return t.putImageData(r, 0, 0), e.toDataURL("image/webp", .9);
			});
		}
	};
})), xt = new URL("./models/", "" + import.meta.url).href, St = new URL("./textures/", "" + import.meta.url).href, Ct = "\n:where([data-amx-stage]){position:relative}\n[data-amx-stage]{touch-action:pan-y}\n.amx-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;outline:none}\n.amx-canvas.is-dragging{cursor:grabbing}\n[data-amx-root][data-amx-style=\"mono\"] [data-amx-thumb]:not([data-amx-gen]){filter:grayscale(1)}", wt = (e) => window.requestIdleCallback ? requestIdleCallback(e, { timeout: 500 }) : setTimeout(e, 30), Tt = (e) => new URL(e, location.href).pathname.replace(/\/+$/, "") || "/";
function Et(e) {
	let t = (e.dataset.amxExclude || "").split(",").map((e) => e.trim()).filter(Boolean), n = Tt(location.href);
	for (let r of e.querySelectorAll("[data-amx-item]")) {
		let e = r.querySelector("a[href]:not([href=\"#\"]):not([href=\"\"])");
		(t.includes(r.dataset.amxItem) || e && Tt(e.getAttribute("href")) === n) && Dt(r);
	}
}
var Dt = (e) => {
	e.style.display = "none", e.dataset.amxDropped = "";
};
async function Ot(e) {
	if (e.amerilux) return e.amerilux;
	let [{ Stage: t }, { PRODUCTS: n }] = await Promise.all([Promise.resolve().then(() => (bt(), it)), Promise.resolve().then(() => (ve(), f))]), r = e.querySelector("[data-amx-stage]") || e, i = [...e.querySelectorAll("[data-amx-item]:not([data-amx-dropped])")];
	i.filter((e) => !n[e.dataset.amxItem]).forEach(Dt);
	let a = new d(i.filter((e) => n[e.dataset.amxItem]), { onSelect: (e) => l.go(e) }), o = a.slugs.length ? a.slugs : Object.keys(n), s = (e) => e == null || e === "" ? void 0 : +e, c = e.dataset.amxLayout || getComputedStyle(e).getPropertyValue("--amx-layout").trim() || "hero";
	e.dataset.amxLayout = c;
	let l = new t(r, {
		slugs: o,
		layout: c,
		modelBase: e.dataset.amxModels || xt,
		textureBase: e.dataset.amxTextures || St,
		centerX: s(e.dataset.amxCenterX),
		centerY: s(e.dataset.amxCenterY),
		onChange: (t) => {
			a.set(t), e.dispatchEvent(new CustomEvent("amx:change", { detail: {
				index: t,
				slug: o[t]
			} }));
		},
		onBuilt: (e) => wt(() => p(e))
	}), p = (e) => a.fillThumb(e, (e) => l.snapshot(e));
	u(e.querySelector("[data-amx-prev]"), () => l.next(-1)), u(e.querySelector("[data-amx-next]"), () => l.next(1)), a.set(0);
	let m = [...e.querySelectorAll("[data-amx-set-style]")], h = (t) => {
		e.dataset.amxStyle = t, l.setStyle(t), l.items.forEach((e, t) => e.built && wt(() => p(t))), m.forEach((e) => {
			let n = e.dataset.amxSetStyle === t;
			e.classList.toggle("is-active", n), e.setAttribute("aria-pressed", n);
		});
	};
	return m.forEach((e) => u(e, () => h(e.dataset.amxSetStyle))), h(e.dataset.amxStyle || "color"), e.amerilux = {
		stage: l,
		tabs: a,
		go: (e) => l.go(e),
		setStyle: h
	}, e.amerilux;
}
function kt() {
	if (!document.getElementById("amx-style")) {
		let e = document.createElement("style");
		e.id = "amx-style", e.textContent = Ct, document.head.appendChild(e);
	}
	let e = new IntersectionObserver((t) => t.forEach((t) => {
		t.isIntersecting && (e.unobserve(t.target), Ot(t.target));
	}), { rootMargin: "400px 0px" });
	document.querySelectorAll("[data-amx-root]").forEach((t) => {
		Et(t), e.observe(t);
	});
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", kt) : kt();
//#endregion
export { Ot as init };
