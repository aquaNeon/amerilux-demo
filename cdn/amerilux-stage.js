import { PRODUCTS as e } from "./amerilux-products.js";
import * as t from "https://cdn.jsdelivr.net/npm/three@0.186.1/+esm";
import { GLTFLoader as n } from "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/loaders/GLTFLoader.js/+esm";
import { MeshoptDecoder as r } from "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/libs/meshopt_decoder.module.js/+esm";
import { RoomEnvironment as i } from "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/environments/RoomEnvironment.js/+esm";
//#region src/maps-gen.js
function a(e) {
	return () => {
		e |= 0, e = e + 1831565813 | 0;
		let t = Math.imul(e ^ e >>> 15, 1 | e);
		return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function o(e, t) {
	let n = a(t), r = Array.from({ length: e }, n);
	return (t) => {
		t = (t % e + e) % e;
		let n = Math.floor(t), i = t - n, a = i * i * (3 - 2 * i);
		return r[n] * (1 - a) + r[(n + 1) % e] * a;
	};
}
function s(e, t) {
	let n = a(t), r = Array.from({ length: e * e }, n);
	return (t, n) => {
		t = (t % e + e) % e, n = (n % e + e) % e;
		let i = Math.floor(t), a = Math.floor(n), o = t - i, s = n - a, c = o * o * (3 - 2 * o), l = s * s * (3 - 2 * s), u = (i + 1) % e, d = (a + 1) % e, f = r[a * e + i], p = r[a * e + u], m = r[d * e + i], h = r[d * e + u];
		return (f * (1 - c) + p * c) * (1 - l) + (m * (1 - c) + h * c) * l;
	};
}
function c(e, t, n) {
	let r = new Uint8Array(t * t * 4);
	for (let i = 0; i < t; i++) for (let a = 0; a < t; a++) {
		let o = (e[i * t + (a + 1) % t] - e[i * t + (a - 1 + t) % t]) * n, s = (e[(i + 1) % t * t + a] - e[(i - 1 + t) % t * t + a]) * n, c = Math.hypot(o, s, 1), l = (i * t + a) * 4;
		r[l] = (-o / c * .5 + .5) * 255, r[l + 1] = (-s / c * .5 + .5) * 255, r[l + 2] = (1 / c * .5 + .5) * 255, r[l + 3] = 255;
	}
	return r;
}
var l = (e) => [
	e >> 16 & 255,
	e >> 8 & 255,
	e & 255
];
function u(e, t) {
	t = Math.min(.9999, Math.max(0, t)) * (e.length - 1);
	let n = Math.floor(t), r = t - n, i = e[n], a = e[n + 1];
	return [
		i[0] + (a[0] - i[0]) * r,
		i[1] + (a[1] - i[1]) * r,
		i[2] + (a[2] - i[2]) * r
	];
}
function d(e) {
	let t = 1024, n = new Float32Array(t * t), r = new Uint8Array(t * t * 4), i = o(10, 11), a = o(60, 12), d = o(260, 13), f = o(900, 14), p = s(6, 15), m = s(360, 16), h = s(140, 18), g = s(9, 17), _ = e.map(l);
	for (let e = 0; e < t; e++) for (let o = 0; o < t; o++) {
		let s = (o + (p(o / t * 6, e / t * 6) - .5) * 50) / t, c = i(s * 10), l = a(s * 60), v = d(s * 260), y = f(s * 900), b = m(o / t * 360, e / t * 360), x = h(o / t * 140, e / t * 140), S = g(o / t * 9, e / t * 9), C = u(_, c * .3 + l * .25 + (S - .5) * .35 + .28 + (v - .5) * .18), w = 1 + (y - .5) * .1 + (b - .5) * .16 + (b > .8 ? (b - .8) * .6 : 0), T = (e * t + o) * 4;
		r[T] = Math.min(255, C[0] * w), r[T + 1] = Math.min(255, C[1] * w), r[T + 2] = Math.min(255, C[2] * w), r[T + 3] = 255, n[e * t + o] = v * .25 + y * .45 + b * .55 + x * .3;
	}
	return {
		S: t,
		map: r,
		normal: c(n, t, 4)
	};
}
function f(e) {
	let t = /* @__PURE__ */ new Float32Array(262144), n = /* @__PURE__ */ new Uint8Array(1048576), r = o(90, 21), i = o(260, 22), a = s(5, 23), u = s(8, 24), d = l(e);
	for (let e = 0; e < 512; e++) for (let o = 0; o < 512; o++) {
		let s = (o + (a(o / 512 * 5, e / 512 * 5) - .5) * 60) / 512, c = r(s * 90), l = i(s * 260), f = u(o / 512 * 8, e / 512 * 8), p = (e * 512 + o) * 4, m = 1 + (c - .5) * .0125 + (f - .5) * .015;
		n[p] = Math.min(255, d[0] * m), n[p + 1] = Math.min(255, d[1] * m), n[p + 2] = Math.min(255, d[2] * m), n[p + 3] = 255, t[e * 512 + o] = c ** 3 * .8 + l * .25;
	}
	return {
		S: 512,
		map: n,
		normal: c(t, 512, 4)
	};
}
function p(e) {
	let t = /* @__PURE__ */ new Float32Array(262144), n = /* @__PURE__ */ new Uint8Array(1048576), r = l(e), i = a(31), o = Array.from({ length: 2304 }, () => [i(), i()]), u = s(8, 32);
	for (let e = 0; e < 512; e++) for (let i = 0; i < 512; i++) {
		let a = i / 512 * 48, s = e / 512 * 48, c = Math.floor(a), l = Math.floor(s), d = 9;
		for (let e = -1; e <= 1; e++) for (let t = -1; t <= 1; t++) {
			let n = (c + t + 48) % 48, [r, i] = o[(l + e + 48) % 48 * 48 + n];
			d = Math.min(d, Math.hypot(c + t + r - a, l + e + i - s));
		}
		let f = (e * 512 + i) * 4, p = 1 + (u(i / 512 * 8, e / 512 * 8) - .5) * .08;
		n[f] = r[0] * p, n[f + 1] = r[1] * p, n[f + 2] = r[2] * p, n[f + 3] = 255, t[e * 512 + i] = Math.min(1, d) ** 2;
	}
	return {
		S: 512,
		map: n,
		normal: c(t, 512, 3)
	};
}
var m = {
	deckMaps: d,
	claddingMaps: f,
	hammeredMaps: p
}, h = "(function(){function e(e){return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function t(t,n){let r=e(n),i=Array.from({length:t},r);return e=>{e=(e%t+t)%t;let n=Math.floor(e),r=e-n,a=r*r*(3-2*r);return i[n]*(1-a)+i[(n+1)%t]*a}}function n(t,n){let r=e(n),i=Array.from({length:t*t},r);return(e,n)=>{e=(e%t+t)%t,n=(n%t+t)%t;let r=Math.floor(e),a=Math.floor(n),o=e-r,s=n-a,c=o*o*(3-2*o),l=s*s*(3-2*s),u=(r+1)%t,d=(a+1)%t,f=i[a*t+r],p=i[a*t+u],m=i[d*t+r],h=i[d*t+u];return(f*(1-c)+p*c)*(1-l)+(m*(1-c)+h*c)*l}}function r(e,t,n){let r=new Uint8Array(t*t*4);for(let i=0;i<t;i++)for(let a=0;a<t;a++){let o=(e[i*t+(a+1)%t]-e[i*t+(a-1+t)%t])*n,s=(e[(i+1)%t*t+a]-e[(i-1+t)%t*t+a])*n,c=Math.hypot(o,s,1),l=(i*t+a)*4;r[l]=(-o/c*.5+.5)*255,r[l+1]=(-s/c*.5+.5)*255,r[l+2]=(1/c*.5+.5)*255,r[l+3]=255}return r}let i=e=>[e>>16&255,e>>8&255,e&255];function a(e,t){t=Math.min(.9999,Math.max(0,t))*(e.length-1);let n=Math.floor(t),r=t-n,i=e[n],a=e[n+1];return[i[0]+(a[0]-i[0])*r,i[1]+(a[1]-i[1])*r,i[2]+(a[2]-i[2])*r]}function o(e){let o=1024,s=new Float32Array(o*o),c=new Uint8Array(o*o*4),l=t(10,11),u=t(60,12),d=t(260,13),f=t(900,14),p=n(6,15),m=n(360,16),h=n(140,18),g=n(9,17),_=e.map(i);for(let e=0;e<o;e++)for(let t=0;t<o;t++){let n=(t+(p(t/o*6,e/o*6)-.5)*50)/o,r=l(n*10),i=u(n*60),v=d(n*260),y=f(n*900),b=m(t/o*360,e/o*360),x=h(t/o*140,e/o*140),S=g(t/o*9,e/o*9),C=a(_,r*.3+i*.25+(S-.5)*.35+.28+(v-.5)*.18),w=1+(y-.5)*.1+(b-.5)*.16+(b>.8?(b-.8)*.6:0),T=(e*o+t)*4;c[T]=Math.min(255,C[0]*w),c[T+1]=Math.min(255,C[1]*w),c[T+2]=Math.min(255,C[2]*w),c[T+3]=255,s[e*o+t]=v*.25+y*.45+b*.55+x*.3}return{S:o,map:c,normal:r(s,o,4)}}function s(e){let a=/* @__PURE__ */ new Float32Array(262144),o=/* @__PURE__ */ new Uint8Array(1048576),s=t(90,21),c=t(260,22),l=n(5,23),u=n(8,24),d=i(e);for(let e=0;e<512;e++)for(let t=0;t<512;t++){let n=(t+(l(t/512*5,e/512*5)-.5)*60)/512,r=s(n*90),i=c(n*260),f=u(t/512*8,e/512*8),p=(e*512+t)*4,m=1+(r-.5)*.0125+(f-.5)*.015;o[p]=Math.min(255,d[0]*m),o[p+1]=Math.min(255,d[1]*m),o[p+2]=Math.min(255,d[2]*m),o[p+3]=255,a[e*512+t]=r**3*.8+i*.25}return{S:512,map:o,normal:r(a,512,4)}}function c(t){let a=/* @__PURE__ */ new Float32Array(262144),o=/* @__PURE__ */ new Uint8Array(1048576),s=i(t),c=e(31),l=Array.from({length:2304},()=>[c(),c()]),u=n(8,32);for(let e=0;e<512;e++)for(let t=0;t<512;t++){let n=t/512*48,r=e/512*48,i=Math.floor(n),c=Math.floor(r),d=9;for(let e=-1;e<=1;e++)for(let t=-1;t<=1;t++){let a=(i+t+48)%48,[o,s]=l[(c+e+48)%48*48+a];d=Math.min(d,Math.hypot(i+t+o-n,c+e+s-r))}let f=(e*512+t)*4,p=1+(u(t/512*8,e/512*8)-.5)*.08;o[f]=s[0]*p,o[f+1]=s[1]*p,o[f+2]=s[2]*p,o[f+3]=255,a[e*512+t]=Math.min(1,d)**2}return{S:512,map:o,normal:r(a,512,3)}}let l={deckMaps:o,claddingMaps:s,hammeredMaps:c};self.onmessage=({data:{name:e,fn:t,args:n}})=>{let r=l[t](...n);self.postMessage({name:e,...r},[r.map.buffer,r.normal.buffer])}})();", g = typeof self < "u" && self.Blob && new Blob(["(self.URL || self.webkitURL).revokeObjectURL(self.location.href);", h], { type: "text/javascript;charset=utf-8" });
function _(e) {
	let t;
	try {
		if (t = g && (self.URL || self.webkitURL).createObjectURL(g), !t) throw "";
		let n = new Worker(t, { name: e?.name });
		return n.addEventListener("error", () => {
			(self.URL || self.webkitURL).revokeObjectURL(t);
		}), n;
	} catch {
		return new Worker("data:text/javascript;charset=utf-8," + encodeURIComponent(h), { name: e?.name });
	}
}
//#endregion
//#region src/materials.js
function v(e, n, r) {
	let i = new t.DataTexture(e, n, n, t.RGBAFormat);
	return i.wrapS = i.wrapT = t.RepeatWrapping, i.minFilter = t.LinearMipmapLinearFilter, i.generateMipmaps = !0, i.anisotropy = 8, i.colorSpace = r ? t.SRGBColorSpace : t.NoColorSpace, i.repeat.set(1 / 9, 1 / 9), i.needsUpdate = !0, i;
}
var y = {
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
}, b = {}, x = ({ S: e, map: t, normal: n }) => ({
	map: v(t, e, !0),
	normal: v(n, e, !1)
}), S = (e) => b[e] ?? (b[e] = x(m[y[e][0]](...y[e][1]))), C;
function w() {
	return C ?? (C = new Promise((e) => {
		let t;
		try {
			t = new _();
		} catch {
			return e();
		}
		let n = new Set(Object.keys(y).filter((e) => !y[e][2] && !b[e]));
		if (!n.size) return e();
		t.onmessage = ({ data: r }) => {
			var i;
			b[i = r.name] ?? (b[i] = x(r)), n.delete(r.name), n.size || (t.terminate(), e());
		}, t.onerror = () => {
			t.terminate(), e();
		};
		for (let e of n) t.postMessage({
			name: e,
			fn: y[e][0],
			args: y[e][1]
		});
	}));
}
var T = { "deck-oak": ["deck-oak", 72] }, E = "/textures/", ee = (e) => {
	E = e;
}, te = new t.TextureLoader(), D = {};
function ne(e) {
	return D[e] ?? (D[e] = (() => {
		let [n, r] = T[e], i = (e, i) => {
			let a = [], o = te.load(`${E}${n}_${e}.jpg`, () => a.forEach((e) => {
				e.needsUpdate = !0;
			}));
			return o.clones = a, o.wrapS = o.wrapT = t.RepeatWrapping, o.anisotropy = 8, o.colorSpace = i ? t.SRGBColorSpace : t.NoColorSpace, o.repeat.set(1 / r, 1 / r), o;
		};
		return {
			map: i("color", !0),
			normal: i("normal", !1),
			rough: i("rough", !1)
		};
	})());
}
var O = (e) => ({
	see: !0,
	params: {
		roughness: .03,
		clearcoat: 1,
		clearcoatRoughness: .015,
		envMapIntensity: 1.25,
		...e
	}
}), k = (e) => ({ params: {
	color: 16777215,
	emissive: 16777215,
	emissiveIntensity: .14,
	...e
} }), A = {
	"poly-clear": {
		...O({
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
		...O({
			color: 9073760,
			opacity: .24,
			roughness: .06,
			clearcoatRoughness: .04
		}),
		edge: [7029286, .7]
	},
	"poly-opal": k({
		color: 16119285,
		roughness: .4,
		clearcoat: .5,
		clearcoatRoughness: .15,
		envMapIntensity: 1,
		emissiveIntensity: .22
	}),
	"poly-flat": {
		...O({
			color: 14413546,
			opacity: .05,
			roughness: .02,
			clearcoatRoughness: .01
		}),
		edge: [5933698, .7]
	},
	"acrylic-clear": {
		...O({
			color: 15135472,
			ior: 1.49,
			opacity: .05,
			roughness: .015,
			clearcoatRoughness: .01
		}),
		edge: [7313040, .7]
	},
	"rib-clear": O({
		color: 13493215,
		opacity: .16,
		roughness: .14,
		clearcoat: .4
	}),
	"rib-bronze": O({
		color: 7230532,
		opacity: .22,
		roughness: .12,
		clearcoat: .4
	}),
	"rib-opal": k({
		color: 16119285,
		roughness: .35
	}),
	"pvc-white": k({
		color: 16382716,
		emissive: 16317183,
		emissiveIntensity: .15,
		roughness: .48,
		clearcoat: .12,
		clearcoatRoughness: .45
	}),
	"pvc-form": k({
		roughness: .5,
		clearcoat: .1,
		clearcoatRoughness: .5
	}),
	"pvc-gloss": k({
		color: 16382716,
		emissive: 16317183,
		emissiveIntensity: .15,
		roughness: .2,
		clearcoat: .8,
		clearcoatRoughness: .1
	}),
	"pvc-klar": k({
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
			normalScale: new t.Vector2(.6, .6)
		},
		maps: "hammered"
	},
	"steel-galv": { params: {
		color: 12368821,
		metalness: .65,
		roughness: .42,
		envMapIntensity: 1.5,
		side: t.DoubleSide
	} },
	deck: {
		params: {
			roughness: .85,
			envMapIntensity: .8,
			normalScale: new t.Vector2(.9, .9)
		},
		maps: "deck"
	},
	"deck-oak": {
		params: {
			roughness: 1,
			envMapIntensity: .9,
			clearcoat: .08,
			clearcoatRoughness: .5,
			normalScale: new t.Vector2(1, 1)
		},
		photo: "deck-oak"
	},
	"deck-sand": {
		params: {
			roughness: .8,
			envMapIntensity: .8,
			normalScale: new t.Vector2(.9, .9)
		},
		maps: "deck-sand"
	}
};
function re(e) {
	let { u: t, see: n } = this.userData;
	Object.assign(e.uniforms, t);
	let r = "uniform float amxSat;\n" + e.fragmentShader;
	n && (e.vertexShader = "uniform vec4 amxGlow;\nvarying float vAmxEdge;\nvarying vec3 vAmxObj;\n" + e.vertexShader.replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nfloat amxD = abs(dot(objectNormal, amxGlow.xyz));\nvAmxEdge = amxGlow.w > 0.5 ? amxD : (1.0 - amxD) * step(0.5, length(amxGlow.xyz));").replace("#include <begin_vertex>", "#include <begin_vertex>\nvAmxObj = position;"), r = "varying vec3 vAmxObj;\nfloat amxH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\nfloat amxVN(vec3 x) {\n  vec3 i = floor(x), f = fract(x);\n  f = f * f * (3.0 - 2.0 * f);\n  return mix(mix(mix(amxH(i), amxH(i + vec3(1, 0, 0)), f.x), mix(amxH(i + vec3(0, 1, 0)), amxH(i + vec3(1, 1, 0)), f.x), f.y),\n             mix(mix(amxH(i + vec3(0, 0, 1)), amxH(i + vec3(1, 0, 1)), f.x), mix(amxH(i + vec3(0, 1, 1)), amxH(i + vec3(1, 1, 1)), f.x), f.y), f.z);\n}\n" + r.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nfloat amxSheen = amxVN(vAmxObj * 0.18) * 0.6 + amxVN(vAmxObj * 0.55 + 4.0) * 0.4;\nroughnessFactor = clamp(roughnessFactor * mix(0.55, 1.9, amxSheen), 0.0, 1.0);").replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoatRoughness = clamp(material.clearcoatRoughness * mix(0.5, 3.0, amxSheen), 0.0, 1.0);\n#endif"), r = "varying float vAmxEdge;\n" + r.replace("#include <opaque_fragment>", "float gNV = max(abs(dot(normal, geometryViewDir)), 0.18);\nfloat gPath = 1.0 / gNV;\nfloat gF = pow(1.0 - gNV, 5.0);\nfloat gEdge = smoothstep(0.55, 0.95, vAmxEdge);\nfloat gA = 1.0 - pow(1.0 - diffuseColor.a, gPath);\ngA = mix(gA, max(gA, 0.88), gEdge);\ngA += (1.0 - gA) * gF * 0.35;\nvec3 gTint = pow(max(diffuseColor.rgb, vec3(0.02)), vec3(gPath));\nvec3 gLit = totalDiffuse + totalEmissiveRadiance;\n// faces: tint x the (light) page behind ~ a colour filter over what's seen through the sheet\nvec3 gBody = mix(gTint * 0.88, gLit * gTint * 1.3 + gTint * 0.12, gEdge);\n// curvature (flutes, ribs, rounded edges) concentrates reflections into bright glints\nfloat gCurv = clamp(length(fwidth(normal)) * 6.0, 0.0, 1.0);\ngA += (1.0 - gA) * gCurv * 0.15;\ngl_FragColor = vec4(gBody * gA + max(outgoingLight - gLit, vec3(0.0)) * (1.0 + gCurv * 1.5), gA);").replace("#include <premultiplied_alpha_fragment>", "")), r = r.replace("#include <tonemapping_fragment>", "#include <tonemapping_fragment>\ngl_FragColor.rgb = mix(vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722))), gl_FragColor.rgb, amxSat);"), e.fragmentShader = r;
}
var j = 0;
function M(e, { glow: n } = {}) {
	let r = A[e] || A["pvc-white"], i = new t.MeshPhysicalMaterial({
		metalness: 0,
		ior: 1.585,
		specularIntensity: 1,
		...r.params
	});
	if (r.see && Object.assign(i, {
		transparent: !0,
		depthWrite: !1,
		side: t.DoubleSide,
		premultipliedAlpha: !0
	}), r.maps || r.photo) {
		let e = r.photo ? ne(r.photo) : S(r.maps), t = j++, n = (e) => {
			let n = e.clone();
			return n.offset.set(t * .37 % 1, t * .61 % 1), e.clones?.push(n), n;
		};
		i.map = n(e.map), r.bump !== !1 && (i.normalMap = n(e.normal)), e.rough && (i.roughnessMap = n(e.rough)), r.maps === "cladding" && (i.emissiveMap = i.map);
	}
	let a = { amxSat: { value: 1 } };
	if (r.see) {
		let [e = "x", r = "thin"] = n || [], i = {
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
		}[e];
		a.amxGlow = { value: n ? new t.Vector4(...i, +(r === "caps")) : new t.Vector4(0, 0, 0, 1) };
	}
	return i.userData = {
		u: a,
		see: !!r.see,
		edge: r.edge
	}, i.onBeforeCompile = re, i.customProgramCacheKey = () => r.see ? "amx-see" : "amx-solid", i;
}
function ie() {
	let e = document.createElement("canvas");
	e.width = e.height = 256;
	let n = e.getContext("2d");
	n.fillStyle = "#000", n.fillRect(0, 0, 256, 256);
	let r = n.createRadialGradient(128, 128, 12.8, 128, 128, 158.72);
	r.addColorStop(0, "#fff"), r.addColorStop(.55, "#d9d9d9"), r.addColorStop(1, "#000"), n.fillStyle = r, n.beginPath(), n.roundRect(10.24, 10.24, 235.52, 235.52, 20.48), n.fill();
	let i = new t.CanvasTexture(e);
	return i.colorSpace = t.SRGBColorSpace, i;
}
function ae(e) {
	let n = new t.Scene(), r = ie();
	n.add(new t.Mesh(new t.BoxGeometry(44, 26, 44), new t.MeshBasicMaterial({
		color: new t.Color(.068, .075, .088),
		side: t.BackSide
	})));
	let i = new t.Mesh(new t.PlaneGeometry(44, 44), new t.MeshBasicMaterial({ color: new t.Color(.29, .305, .325) }));
	i.rotation.x = -Math.PI / 2, i.position.y = -7, n.add(i);
	let a = (e, i, a, o) => {
		let s = new t.Mesh(new t.PlaneGeometry(e, i), new t.MeshBasicMaterial({
			map: r,
			color: new t.Color(o * .96, o * .99, o * 1.04),
			side: t.DoubleSide
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
	let o = e.fromScene(n, .02).texture;
	return n.traverse((e) => {
		e.geometry?.dispose(), e.material?.dispose();
	}), r.dispose(), o;
}
//#endregion
//#region src/pipeline.js
var oe = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }", se = "\nuniform sampler2D t;\nuniform vec2 dir;\nvarying vec2 vUv;\nvoid main() {\n  vec4 s = texture2D(t, vUv) * 0.2270270270;\n  s += texture2D(t, vUv + dir * 1.3846153846) * 0.3162162162;\n  s += texture2D(t, vUv - dir * 1.3846153846) * 0.3162162162;\n  s += texture2D(t, vUv + dir * 3.2307692308) * 0.0702702703;\n  s += texture2D(t, vUv - dir * 3.2307692308) * 0.0702702703;\n  gl_FragColor = s;\n}", ce = "\nuniform sampler2D t;\nvarying vec2 vUv;\nvoid main() {\n  vec3 c = texture2D(t, vUv).rgb;\n  float pk = max(c.r, max(c.g, c.b));\n  gl_FragColor = vec4(c * smoothstep(0.95, 1.6, pk), 1.0);\n}", le = "\nuniform sampler2D tDepth;\nuniform mat4 uProj, uInvProj;\nuniform vec2 uRes;\nuniform float uRadius, uIntensity;\nvarying vec2 vUv;\nvec3 viewPos(vec2 uv) {\n  vec4 p = uInvProj * vec4(vec3(uv, texture2D(tDepth, uv).r) * 2.0 - 1.0, 1.0);\n  return p.xyz / p.w;\n}\nfloat hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\nvoid main() {\n  float d = texture2D(tDepth, vUv).r;\n  if (d >= 1.0) { gl_FragColor = vec4(1.0); return; }\n  vec3 P = viewPos(vUv);\n  vec3 N = normalize(cross(dFdx(P), dFdy(P)));\n  if (dot(N, P) > 0.0) N = -N;\n  float R2 = uRadius * uRadius;\n  float rpx = uRadius * uProj[1][1] * 0.5 * uRes.y / (uProj[3][3] > 0.5 ? 1.0 : -P.z); // radius in pixels (ortho / perspective)\n  float spin = hash(gl_FragCoord.xy) * 6.2831853;\n  float A = 0.0;\n  const int S = 12;\n  for (int i = 0; i < S; i++) {\n    float f = (float(i) + 0.5) / float(S);\n    float ang = f * 6.2831853 * 3.0 + spin;\n    vec3 v = viewPos(vUv + vec2(cos(ang), sin(ang)) * f * rpx / uRes) - P;\n    float vv = dot(v, v);\n    A += max(0.0, dot(v, N) / (sqrt(vv) + 1e-3) - 0.08) * max(0.0, 1.0 - vv / R2);\n  }\n  gl_FragColor = vec4(vec3(clamp(1.0 - uIntensity * A / float(S) * 2.0, 0.0, 1.0)), 1.0);\n}", ue = "\nuniform sampler2D t, tDepth;\nuniform vec2 dir;\nuniform float uNear, uFar, uOrtho;\nvarying vec2 vUv;\nfloat lin(float d) { return uOrtho > 0.5 ? uNear + d * (uFar - uNear) : uNear * uFar / (uFar - d * (uFar - uNear)); }\nvoid main() {\n  float z0 = lin(texture2D(tDepth, vUv).r);\n  float sum = 0.0, wsum = 0.0;\n  for (int i = -3; i <= 3; i++) {\n    vec2 uv = vUv + dir * float(i);\n    float w = exp(-float(i * i) / 8.0) * exp(-abs(lin(texture2D(tDepth, uv).r) - z0) * 0.08);\n    sum += texture2D(t, uv).r * w;\n    wsum += w;\n  }\n  gl_FragColor = vec4(vec3(sum / wsum), 1.0);\n}", de = "\nuniform sampler2D t, tAO, tBloom;\nuniform float uTime, uGrain, uBloom;\nuniform vec2 uRes;\nuniform vec3 uBg;\nvarying vec2 vUv;\n// Khronos PBR Neutral\nvec3 neutral(vec3 c) {\n  const float sc = 0.76, ds = 0.15;\n  float x = min(c.r, min(c.g, c.b));\n  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;\n  c -= off;\n  float pk = max(c.r, max(c.g, c.b));\n  if (pk < sc) return c;\n  const float d = 1.0 - sc;\n  float np = 1.0 - d * d / (pk + d - sc);\n  c *= np / pk;\n  float g = 1.0 - 1.0 / (ds * (pk - np) + 1.0);\n  return mix(c, vec3(np), g);\n}\nvec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }\nfloat h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 17.0) * 43758.5453); }\nvoid main() {\n  vec4 s = texture2D(t, vUv);\n  float a = clamp(s.a, 0.0, 1.0);\n  vec3 bloom = texture2D(tBloom, vUv).rgb * uBloom;\n  vec3 c = clamp(neutral(s.rgb * texture2D(tAO, vUv).r * 1.02 + bloom), 0.0, 1.0) + uBg * (1.0 - a);\n  c = srgb(clamp(c, 0.0, 1.0));\n  c += (h(floor(vUv * uRes)) - 0.5) * uGrain * a;\n  gl_FragColor = vec4(c, 1.0);\n}", N = class {
	constructor(e) {
		this.r = e, this.ss = 1.5;
		let n = { type: t.HalfFloatType };
		this.main = new t.WebGLRenderTarget(1, 1, {
			...n,
			samples: 4
		}), this.depth = new t.WebGLRenderTarget(1, 1, { depthTexture: new t.DepthTexture(1, 1, t.FloatType) }), this.depthMat = new t.MeshBasicMaterial({
			colorWrite: !1,
			side: t.DoubleSide
		});
		let r = () => new t.WebGLRenderTarget(1, 1, {
			...n,
			depthBuffer: !1
		});
		this.a1 = r(), this.a2 = r(), this.b1 = r(), this.b2 = r(), this.white = new t.DataTexture(new Uint8Array([
			255,
			255,
			255,
			255
		]), 1, 1), this.black = new t.DataTexture(new Uint8Array([
			0,
			0,
			0,
			255
		]), 1, 1), this.white.needsUpdate = this.black.needsUpdate = !0, this.scene = new t.Scene(), this.cam = new t.OrthographicCamera(-1, 1, 1, -1, 0, 1), this.quad = new t.Mesh(new t.PlaneGeometry(2, 2)), this.quad.frustumCulled = !1, this.scene.add(this.quad);
		let i = (e, n) => new t.ShaderMaterial({
			vertexShader: oe,
			fragmentShader: e,
			uniforms: n,
			depthTest: !1,
			depthWrite: !1,
			toneMapped: !1
		}), a = this.depth.depthTexture;
		this.blur = i(se, {
			t: { value: null },
			dir: { value: new t.Vector2() }
		}), this.bright = i(ce, { t: { value: this.main.texture } }), this.ao = i(le, {
			tDepth: { value: a },
			uProj: { value: new t.Matrix4() },
			uInvProj: { value: new t.Matrix4() },
			uRes: { value: new t.Vector2(1, 1) },
			uRadius: { value: 16 },
			uIntensity: { value: 1 }
		}), this.aoBlur = i(ue, {
			t: { value: null },
			tDepth: { value: a },
			dir: { value: new t.Vector2() },
			uNear: { value: 1 },
			uFar: { value: 2 },
			uOrtho: { value: 0 }
		}), this.fin = i(de, {
			t: { value: this.main.texture },
			tAO: { value: this.white },
			tBloom: { value: this.black },
			uTime: { value: 0 },
			uGrain: { value: .022 },
			uBloom: { value: .14 },
			uRes: { value: new t.Vector2(1, 1) },
			uBg: { value: new t.Color(16119285) }
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
}, P = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }", fe = "\nvarying vec3 vView;\nvoid main() {\n  vec4 mv = modelViewMatrix * vec4(position, 1.0);\n  vView = mv.xyz;\n  gl_Position = projectionMatrix * mv;\n}", F = "\nuniform float uWeight;\nvarying vec3 vView;\nvoid main() {\n  vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));\n  float lam = 0.38 + 0.62 * max(dot(n, normalize(vec3(-0.6, 0.65, 0.5))), 0.0);\n  gl_FragColor = vec4(lam, n.xy * 0.5 + 0.5, uWeight);\n}", I = "uniform float uWeight; void main() { gl_FragColor = vec4(-1.0, 0.5, 0.5, uWeight); }", L = "\nuniform sampler2D tData, tDepth;\nuniform vec2 uRes;      // target pixels\nuniform float uPx;      // target pixels per CSS px\nuniform float uNear, uFar, uOrtho;\nuniform vec3 uBg, uInk, uPaper;\nvarying vec2 vUv;\n\nfloat depthL(vec2 uv) {\n  float d = texture2D(tDepth, uv).r;\n  return uOrtho > 0.5 ? uNear + d * (uFar - uNear) : uNear * uFar / (uFar - d * (uFar - uNear));\n}\n// nearest depth over a pixel and its 4 neighbours: closes 1 px pinholes in imported meshes, which\n// would otherwise each draw a dot (ortho: larger = farther)\nfloat depthC(vec2 uv) {\n  vec2 p = 1.0 / uRes;\n  return min(min(min(depthL(uv), depthL(uv + vec2(p.x, 0.0))), min(depthL(uv - vec2(p.x, 0.0)), depthL(uv + vec2(0.0, p.y)))), depthL(uv - vec2(0.0, p.y)));\n}\n// outline strength around uv: drawn lines (pass B) thickened, plus silhouettes from depth breaks.\n// Breaks are second differences: a sloped face (linear depth) gives none, so the threshold can sit\n// low enough to keep small steps continuous (one corrugation rib passing in front of the next).\n// (No normal-break edges: on curved, tessellated parts they double the feature lines.)\nfloat stroke(vec2 uv) {\n  vec2 o = 0.6 * uPx / uRes;\n  float line = 0.0, hits = 0.0;\n  // 3x3 pixel neighbourhood: thickens the 1 px line, and counts how many pixels it covers\n  vec2 px1 = 1.0 / uRes;\n  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {\n    vec2 q = uv + vec2(float(x), float(y)) * px1;\n    vec4 s = texture2D(tData, q);\n    // skip line pixels seen through a 1 px crack in a nearer face (their depth is well behind the\n    // pixels around them): hidden outlines would leak through as dots\n    if (s.r < -0.5 && depthL(q) - depthC(q) < 3.0) { line = max(line, s.a * (x == 0 && y == 0 ? 1.0 : 0.45)); hits += 1.0; }\n  }\n  line *= step(1.5, hits); // a real line covers neighbouring pixels (incl. diagonal); lone pixels are depth noise\n  float z2 = 2.0 * depthC(uv);\n  vec2 dx = vec2(o.x * 1.3, 0.0), dy = vec2(0.0, o.y * 1.3);\n  float dz = max(abs(depthC(uv + dx) + depthC(uv - dx) - z2), abs(depthC(uv + dy) + depthC(uv - dy) - z2));\n  float w = max(texture2D(tData, uv).a, 0.25);\n  return max(line, smoothstep(2.5, 6.0, dz) * w);\n}\nvoid main() {\n  float ink = stroke(vUv);\n\n  // solid faces: plain paper fill\n  vec4 c = texture2D(tData, vUv);\n  float solid = (c.r > -0.5 && texture2D(tDepth, vUv).r < 1.0) ? 1.0 : 0.0;\n\n  vec3 col = mix(uBg, uPaper, solid * mix(0.35, 0.8, c.a));\n  col = mix(col, uInk, clamp(ink, 0.0, 1.0) * 0.85);\n  gl_FragColor = vec4(col, 1.0);\n}", R = "\nuniform sampler2D t;\nuniform vec2 uStep; // a quarter of an output pixel, in uv\nvarying vec2 vUv;\nvoid main() {\n  gl_FragColor = 0.25 * (texture2D(t, vUv + vec2(-uStep.x, -uStep.y)) + texture2D(t, vUv + vec2(uStep.x, -uStep.y))\n    + texture2D(t, vUv + vec2(-uStep.x, uStep.y)) + texture2D(t, vUv + vec2(uStep.x, uStep.y)));\n}", z = class {
	constructor(e) {
		this.r = e, this.target = new t.WebGLRenderTarget(1, 1, {
			type: t.HalfFloatType,
			minFilter: t.NearestFilter,
			magFilter: t.NearestFilter,
			depthTexture: new t.DepthTexture(1, 1, t.FloatType)
		}), this.meshMat = new t.ShaderMaterial({
			vertexShader: fe,
			fragmentShader: F,
			uniforms: { uWeight: { value: 1 } },
			side: t.DoubleSide
		}), this.lineMat = new t.ShaderMaterial({
			vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z -= 2e-5 * gl_Position.w; }",
			fragmentShader: I,
			uniforms: { uWeight: { value: 1 } },
			depthWrite: !1
		}), this.drawn = new t.WebGLRenderTarget(1, 1, { depthBuffer: !1 }), this.post = new t.ShaderMaterial({
			vertexShader: P,
			fragmentShader: L,
			depthTest: !1,
			depthWrite: !1,
			toneMapped: !1,
			uniforms: {
				tData: { value: this.target.texture },
				tDepth: { value: this.target.depthTexture },
				uRes: { value: new t.Vector2(1, 1) },
				uPx: { value: 1 },
				uNear: { value: 1 },
				uFar: { value: 2 },
				uOrtho: { value: 1 },
				uBg: { value: new t.Color(16119285) },
				uInk: { value: new t.Color(2763308) },
				uPaper: { value: new t.Color(16579834) }
			}
		}), this.down = new t.ShaderMaterial({
			vertexShader: P,
			fragmentShader: R,
			depthTest: !1,
			depthWrite: !1,
			toneMapped: !1,
			uniforms: {
				t: { value: this.drawn.texture },
				uStep: { value: new t.Vector2() }
			}
		}), this.scene = new t.Scene(), this.quad = new t.Mesh(new t.PlaneGeometry(2, 2), this.post), this.quad.frustumCulled = !1, this.scene.add(this.quad), this.cam = new t.OrthographicCamera(-1, 1, 1, -1, 0, 1);
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
}, B = {
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
}, V = t.MathUtils.degToRad(34), H = 18, pe = new t.Vector3(-.42, .82, .38).normalize(), me = .14, U = 26, he = 2 * Math.sqrt(U), W = (e) => Math.min(1, Math.max(0, e)), G = (e) => e * e * (3 - 2 * e), K = (e, t) => ((e + t / 2) % t + t) % t - t / 2, q = /* @__PURE__ */ new WeakMap(), J = new t.Color(2042408), ge = new t.Color(7039851), Y = (e) => .2126 * e.r + .7152 * e.g + .0722 * e.b, X = (e) => {
	let n = Y(e);
	return new t.Color(n, n, n);
}, Z = () => new Promise((e) => window.requestIdleCallback ? requestIdleCallback(() => e(), { timeout: 200 }) : setTimeout(e, 16));
function _e(e) {
	let n = e.geometry, r = new t.BufferGeometry();
	for (let e of ["position", "normal"]) {
		let i = n.getAttribute(e);
		if (!i) continue;
		let a = new Float32Array(i.count * 3);
		for (let e = 0; e < i.count; e++) a[e * 3] = i.getX(e), a[e * 3 + 1] = i.getY(e), a[e * 3 + 2] = i.getZ(e);
		r.setAttribute(e, new t.BufferAttribute(a, 3));
	}
	return n.index && r.setIndex(n.index), r.applyMatrix4(e.matrixWorld), r.getAttribute("normal") || r.computeVertexNormals(), r.computeBoundingBox(), r.userData.quantized = !0, r;
}
function Q(e, n = .03) {
	let r = e.getAttribute("position").array, i = [];
	for (let e = 0; e < r.length; e += 6) if (Math.hypot(r[e + 3] - r[e], r[e + 4] - r[e + 1], r[e + 5] - r[e + 2]) >= n) for (let t = 0; t < 6; t++) i.push(r[e + t]);
	return e.setAttribute("position", new t.Float32BufferAttribute(i, 3)), e;
}
function ve(e, n) {
	let r = e.getAttribute("position").array, i = [], a = new t.Vector3(), o = new t.Vector3();
	for (let e = 0; e < r.length; e += 6) if (a.fromArray(r, e), o.fromArray(r, e + 3), n(a, o)) for (let t = 0; t < 6; t++) i.push(r[e + t]);
	return e.setAttribute("position", new t.Float32BufferAttribute(i, 3)), e;
}
function ye(e, n = 28, r = .006) {
	let i = e.getAttribute("position"), a = e.index ? e.index.array : null, o = a ? a.length : i.count, s = Math.cos(t.MathUtils.degToRad(n)), c = new t.Vector3(), l = new t.Vector3(), u = new t.Vector3(), d = new t.Vector3(), f = new t.Vector3(), p = new t.Vector3(), m = (e) => `${Math.round(e.x * 1e4)},${Math.round(e.y * 1e4)},${Math.round(e.z * 1e4)}`, h = /* @__PURE__ */ new Map();
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
	return new t.BufferGeometry().setAttribute("position", new t.Float32BufferAttribute(g, 3));
}
function be(e) {
	for (let n = e; n; n = n.parentElement) {
		let e = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
		if (e && (e[3] === void 0 || +e[3] > .5)) return new t.Color(`rgb(${e[0]}, ${e[1]}, ${e[2]})`);
	}
	return new t.Color(16777215);
}
function $(e, t, n, r, i) {
	let a = i.uniforms?.uWeight;
	a && (a.value = (this.userData.item?.a ?? 1) * (this.userData.sketchWeight ?? 1), i.uniformsNeedUpdate = !0);
}
function xe(e, n) {
	let r = Math.abs(n), i = Math.min(Math.floor(r), e.length - 2), a = t.MathUtils.lerp(e[i], e[i + 1], r - i);
	return Math.sign(n) * a;
}
var Se = class {
	constructor(e, { slugs: n, modelBase: r, textureBase: i, layout: a = "hero", centerX: o, centerY: s, onChange: c, onBuilt: l }) {
		this.el = e, this.slugs = n, this.modelBase = r, i && ee(i), this.layout = B[a] || B.hero, this.centerX = o ?? this.layout.centerX, this.centerY = s ?? this.layout.centerY, this.onChange = c, this.onBuilt = l, this.style = "color", this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
		let u = this.renderer = new t.WebGLRenderer({
			antialias: !0,
			alpha: !0,
			powerPreference: "high-performance"
		});
		u.setPixelRatio(Math.min(devicePixelRatio, 2)), u.debug.checkShaderErrors = !1, u.toneMapping = t.NeutralToneMapping, u.toneMappingExposure = .95, u.shadowMap.enabled = !0, u.shadowMap.autoUpdate = !1, this.canvas = u.domElement, this.canvas.className = "amx-canvas", e.appendChild(this.canvas), this.scene = new t.Scene(), this.pmrem = new t.PMREMGenerator(u), this.key = new t.DirectionalLight(16777215, 2.2), this.key.shadow.mapSize.set(2048, 2048), this.key.shadow.bias = -3e-4, this.key.shadow.radius = 3, this.hemi = new t.HemisphereLight(16777215, 10134434, .5), this.scene.add(this.key, this.key.target, this.hemi), this.bg = be(e), this.pipe = new N(u), this.pipe.fin.uniforms.uBg.value.copy(this.bg), this.sketch = new z(u), this.sketch.setBackground(this.bg), this.ortho = new t.OrthographicCamera(), this.ortho.position.set(0, Math.sin(V), Math.cos(V)).multiplyScalar(2e3), this.ortho.lookAt(0, 0, 0), this.ortho.near = 1e3, this.ortho.far = 3e3, this.persp = new t.PerspectiveCamera(H, 1, 10, 4e4), this.items = n.map((e, t) => this.createItem(e, t)), this.current = 0, this.target = 0, this.active = 0, this.pointer = new t.Vector2(0, 0), this.follow = new t.Vector2(0, 0), this.followVel = new t.Vector2(0, 0), this.timer = new t.Timer(), this.raycaster = new t.Raycaster(), this._box = new t.Box3(), this._v = new t.Vector3(), this.frames = 0, this.resize(), new ResizeObserver(() => this.resize()).observe(e), this.bindPointer(), this.bindVisibility(), this.applyStyle(), this.ready = this.load(), this.loaded = this.ready.then(() => this.rest), u.setAnimationLoop(() => this.tick());
	}
	get camera() {
		return this.style === "color" ? this.persp : this.ortho;
	}
	get envReal() {
		return this._envReal ?? (this._envReal = ae(this.pmrem));
	}
	get envIllus() {
		return this._envIllus ?? (this._envIllus = this.pmrem.fromScene(new i(), .04).texture);
	}
	createItem(n, r) {
		let i = e[n], a = new t.Group(), o = new t.Group(), s = new t.Group();
		return a.add(o), o.add(s), a.visible = !1, this.scene.add(a), {
			slug: n,
			index: r,
			def: i,
			root: a,
			tilt: o,
			content: s,
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
		let e = new n().setMeshoptDecoder(r);
		this.parts = {};
		let t = {}, i = (n) => t[n] ?? (t[n] = e.loadAsync(`${this.modelBase}${n}.glb`).then((e) => {
			let t;
			e.scene.updateMatrixWorld(!0), e.scene.traverse((e) => {
				e.isMesh && !t && (t = e);
			}), this.parts[n] = _e(t);
		})), a = this.items.length, o = [...this.items].sort((e, t) => Math.abs(K(e.index - this.target, a)) - Math.abs(K(t.index - this.target, a))), s = w(), c = async (e, t) => {
			await Promise.all([...(e.def.parts || []).map(i), t || s]), this.buildItem(e), this.styleItem(e), await this.compileItem(e), e.built = !0, this.onBuilt?.(e.index);
		};
		await c(o[0], !0), this.rest = (async () => {
			for (let e of o.slice(1)) for (let t of e.def.parts || []) i(t);
			for (let e of o.slice(1)) await Z(), await c(e);
			await Z(), this.precompile();
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
	buildItem(e) {
		e.layers = e.def.build(this.parts);
		let n = /* @__PURE__ */ new Set(), r = [];
		for (let t of e.layers) t.home = t.object.position.clone(), e.content.add(t.object), t.object.traverse((e) => {
			e.isMesh && r.push(e);
		});
		e.edgeMat = new t.LineBasicMaterial({
			color: J,
			transparent: !0,
			opacity: .75
		});
		let i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
		for (let o of r) {
			if (o.userData.item = e, n.add(o.material), !i.has(o.material)) {
				let e = M(o.material.userData.finish, o.material.userData);
				i.set(o.material, e);
				let n = e.userData.edge;
				if (n) {
					let r = new t.LineBasicMaterial({
						color: n[0],
						transparent: !0,
						opacity: n[1]
					});
					a.set(e, {
						m: r,
						color: r.color.clone(),
						grey: X(r.color)
					});
				}
			}
			let r = i.get(o.material);
			if (o.userData.illus = o.material, o.userData.real = r, o.userData.see = r.userData.see, o.onBeforeRender = $, o.userData.edges === "none" && !o.userData.see) continue;
			let s = o.userData.edgeGeo || o.geometry, c = o.userData.edges === "none" && o.userData.sketchLines;
			if (!c) {
				let e = o.userData.edgeAngle ?? 28;
				if (!q.has(s)) {
					let n = s.userData.quantized ? ye(s, e) : Q(new t.EdgesGeometry(s, e));
					q.set(s, o.userData.edgeKeep ? ve(n, o.userData.edgeKeep) : n);
				}
				c = q.get(s);
			}
			let l = new t.LineSegments(c, e.edgeMat);
			l.raycast = () => {}, l.onBeforeRender = $, l.layers.enable(1), l.userData.real = o.userData.realEdges === !1 ? null : a.get(r)?.m, l.userData.item = e, l.userData.sketchOnly = o.userData.edges === "none", l.userData.sketchWeight = l.userData.sketchOnly ? .22 : o.userData.see ? .6 : 1, o.add(l), e.edges.push(l);
		}
		e.see = r.filter((e) => e.userData.see), e.meshes = r, e.reals = [...i.values()].map((e) => ({
			m: e,
			color: e.color.clone(),
			grey: X(e.color)
		})), e.realEdges = [...a.values()], e.materials = [...n].map((e) => {
			let n = .62 + Y(e.color) * .3;
			return {
				m: e,
				grey: new t.Color(n, n, n),
				mono: X(e.color),
				opacity: e.opacity
			};
		}), this.measure(e), e.tilt.rotation.y = e.def.yaw;
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
	measure(e) {
		let n = new t.Matrix4().makeRotationFromQuaternion(this.ortho.quaternion.clone().invert()), r = new t.Matrix4().makeRotationY(e.def.yaw), i = n.multiply(r), a = new t.Box3(), o = new t.Vector3();
		e.fit = [0, 1].map((n) => {
			this.setExplode(e, n), e.content.position.set(0, 0, 0), e.content.updateMatrixWorld(!0), a.makeEmpty();
			for (let t of e.layers) a.expandByObject(t.object);
			let r = a.getCenter(new t.Vector3()), s = Infinity, c = -Infinity, l = Infinity, u = -Infinity;
			for (let e = 0; e < 8; e++) o.set(e & 1 ? a.max.x : a.min.x, e & 2 ? a.max.y : a.min.y, e & 4 ? a.max.z : a.min.z).sub(r).applyMatrix4(i), s = Math.min(s, o.x), c = Math.max(c, o.x), l = Math.min(l, o.y), u = Math.max(u, o.y);
			return {
				center: r,
				w: c - s,
				h: u - l
			};
		});
	}
	fitShadow(e) {
		let n = this._box.setFromObject(e.tilt), r = n.getCenter(this._v), i = Math.max(1, n.getSize(new t.Vector3()).length() * .55);
		this.key.target.position.copy(r), this.key.position.copy(r).addScaledVector(pe, i * 4);
		let a = this.key.shadow.camera;
		Object.assign(a, {
			left: -i,
			right: i,
			top: i,
			bottom: -i,
			near: i,
			far: i * 8
		}), a.updateProjectionMatrix(), this.key.shadow.normalBias = e.root.scale.x * .012, this.key.target.updateMatrixWorld(), this.renderer.shadowMap.needsUpdate = !0;
	}
	go(e) {
		let t = this.items.length;
		this.target = this.current + K(e - this.current, t);
	}
	next(e = 1) {
		this.go(Math.round(this.target) + e);
	}
	resize() {
		let { clientWidth: e, clientHeight: n } = this.el;
		if (!e || !n) return;
		this.w = e, this.h = n, this.renderer.setSize(e, n, !1), this.scale = t.MathUtils.clamp(e / this.layout.designW, .45, 1.5);
		let r = e * this.centerX, i = n * this.centerY;
		Object.assign(this.ortho, {
			left: -r,
			right: e - r,
			top: i,
			bottom: i - n
		}), this.ortho.updateProjectionMatrix();
		let a = n / 2 / Math.tan(t.MathUtils.degToRad(H / 2)), o = this.persp;
		o.position.set(0, Math.sin(V), Math.cos(V)).multiplyScalar(a), o.lookAt(0, 0, 0), o.near = a * .72, o.far = a * 1.32, o.setViewOffset(e, n, e / 2 - r, n / 2 - i, e, n), o.updateProjectionMatrix();
		let s = this.renderer.getDrawingBufferSize(new t.Vector2());
		this.pipe.setSize(s.x, s.y), this.sketch.setSize(s.x, s.y, s.x / e);
	}
	bindPointer() {
		let e = this.canvas, n = null, r = (n) => {
			let r = e.getBoundingClientRect();
			return new t.Vector2((n.clientX - r.left) / r.width * 2 - 1, -((n.clientY - r.top) / r.height) * 2 + 1);
		}, i = (e) => {
			this.raycaster.setFromCamera(r(e), this.camera);
			let t = this.raycaster.intersectObjects(this.items.map((e) => e.root), !0)[0];
			return t ? t.object.userData.item : null;
		};
		e.addEventListener("pointerdown", (e) => {
			n = {
				x: e.clientX,
				start: this.current,
				moved: !1,
				id: e.pointerId
			};
		}), e.addEventListener("pointermove", (t) => {
			if (this.pointer.copy(r(t)), n) {
				let r = t.clientX - n.x;
				if (Math.abs(r) > 6 && !n.moved && (n.moved = !0, e.setPointerCapture(n.id), e.classList.add("is-dragging")), n.moved) {
					this.current = this.target = n.start - r / (this.layout.slots[1] * this.scale);
					return;
				}
			}
			t.pointerType === "mouse" && (this.hovered = i(t), e.style.cursor = this.hovered && this.hovered.index !== this.active ? "pointer" : n ? "grabbing" : "grab");
		});
		let a = (t) => {
			if (n) {
				if (n.moved) this.go(Math.round(this.current));
				else {
					let e = i(t);
					e && this.go(e.index);
				}
				e.classList.remove("is-dragging"), n = null;
			}
		};
		e.addEventListener("pointerup", a), e.addEventListener("pointercancel", a), e.addEventListener("pointerleave", () => {
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
		let e = this.timer.getDelta(), n = Math.min(e, .05);
		if (!this.visible || document.hidden || !this.w) return;
		this.adapt(e);
		let r = this.timer.getElapsed(), i = this.items.length, a = this.style === "color";
		this.current += (this.target - this.current) * (1 - Math.exp(-n * 7)), this.followVel.x += ((this.pointer.x - this.follow.x) * 9 - this.followVel.x * 6) * n, this.followVel.y += ((this.pointer.y - this.follow.y) * 9 - this.followVel.y * 6) * n, this.follow.addScaledVector(this.followVel, n);
		let o = (Math.round(this.current) % i + i) % i;
		o !== this.active && (this.active = o, this.onChange?.(o));
		for (let e of this.items) {
			if (!e.built) continue;
			let o = K(e.index - this.current, i), s = G(W(1 - Math.abs(o)));
			e.hover += (+(this.hovered === e && s < .5) - e.hover) * (1 - Math.exp(-n * 5)), e.revealAt ?? (this.lastReveal = e.revealAt = Math.max(r, (this.lastReveal ?? -Infinity) + me)), this.reduced ? e.appear = 1 : r >= e.revealAt && (e.appearVel += ((1 - e.appear) * U - e.appearVel * he) * n, e.appear += e.appearVel * n);
			let c = W(e.appear), l = G(W((s - .25) / .75));
			this.setExplode(e, l), e.content.position.lerpVectors(e.fit[0].center, e.fit[1].center, l).negate();
			let [u, d] = e.fit, { small: f, big: p, slots: m } = this.layout, h = Math.min(f.w / u.w, f.h / u.h), g = Math.min(p.w / d.w, p.h / d.h), _ = t.MathUtils.lerp(h, g, s) * this.scale * c * (1 + e.hover * .04);
			e.root.scale.setScalar(_), e.root.position.set(xe(m, o) * this.scale, e.hover * 6 - (1 - c) * 24 * this.scale, 0), e.root.visible = Math.abs(o) < 3.6 && c > .002, e.a = s;
			let v = this.reduced ? 0 : Math.sin(r * .3) * .07 * s;
			if (e.tilt.rotation.y = e.def.yaw + v + this.follow.x * .09 * s, e.tilt.rotation.x = -this.follow.y * .045 * s, e.tilt.position.y = this.reduced ? 0 : Math.sin(r * .45 + e.index) * 1.5 * s, !a) {
				for (let n of e.materials) n.m.color.lerpColors(n.grey, n.mono, s), n.m.transparent && (n.m.opacity = t.MathUtils.lerp(Math.min(1, n.opacity + .2), n.opacity, s));
				e.edgeMat.color.copy(ge).lerp(J, s), e.edgeMat.opacity = .45 + .35 * s;
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
	snapshot(e, n = 204) {
		let r = this.items[e];
		if (!r?.built) return null;
		let i = this.style === "color", a = this.renderer, o = new t.WebGLRenderTarget(n, n, this.style === "mono" ? { samples: 4 } : {}), s = this.ortho.clone(), c = r.fit[1], l = Math.max(c.w, c.h) * .54;
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
		if (r.edgeMat.color.copy(J), r.edgeMat.opacity = .8, r.a = 1, this.style === "sketch") this.thumbSketch || (this.thumbSketch = new z(a), this.thumbSketch.setSize(n, n, 2), this.thumbSketch.setBackground(new t.Color(15592939))), this.thumbSketch.render(this.scene, s, {
			hide: r.see,
			lines: r.edges,
			out: o
		});
		else if (i) this.thumbPipe || (this.thumbPipe = new N(a), this.thumbPipe.setSize(n, n), this.thumbPipe.fin.uniforms.uBg.value.set(15592939)), this.fitShadow(r), this.thumbPipe.render(this.scene, s, {
			out: o,
			grain: 0,
			bloom: 0,
			aoRadius: l * .05
		});
		else {
			o.texture.colorSpace = t.SRGBColorSpace;
			let e = this.scene.background;
			this.scene.background = new t.Color(15592939), a.setRenderTarget(o), a.render(this.scene, s), this.scene.background = e;
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
//#endregion
export { B as LAYOUTS, Se as Stage };
