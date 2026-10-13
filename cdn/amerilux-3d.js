//#region src/tabs.js
function e(e, t) {
	e && (/^(A|BUTTON)$/.test(e.tagName) || (e.hasAttribute("role") || e.setAttribute("role", "button"), e.hasAttribute("tabindex") || (e.tabIndex = 0), e.addEventListener("keydown", (e) => {
		(e.key === "Enter" || e.key === " ") && (e.preventDefault(), t());
	})), e.addEventListener("click", (e) => {
		e.preventDefault(), t();
	}));
}
var t = class {
	constructor(t, { onSelect: n }) {
		this.items = t, this.onSelect = n, this.items.forEach((t, r) => {
			e(t.querySelector("[data-amx-trigger]"), () => n(r)), e(t.querySelector("[data-amx-close]"), () => this.set(-1));
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
		let n = this.items[e]?.querySelector("img[data-amx-thumb]"), r = n?.getAttribute("src");
		n && (!r || /\/placeholder\.\w+\.svg$/.test(r) || "amxGen" in n.dataset) && Promise.resolve(t(e)).then((e) => {
			e && (n.src = e, n.dataset.amxGen = "");
		});
	}
}, n = new URL("./models/", "" + import.meta.url).href, r = new URL("./textures/", "" + import.meta.url).href, i = "\n:where([data-amx-stage]){position:relative}\n[data-amx-stage]{touch-action:pan-y}\n.amx-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;outline:none}\n.amx-canvas.is-dragging{cursor:grabbing}\n[data-amx-root][data-amx-style=\"mono\"] [data-amx-thumb]:not([data-amx-gen]){filter:grayscale(1)}", a = (e) => window.requestIdleCallback ? requestIdleCallback(e, { timeout: 500 }) : setTimeout(e, 30), o = { "sliding-cladding": "siding-cladding" }, s = (e) => o[e.trim()] || e.trim(), c = (e) => new URL(e, location.href).pathname.replace(/\/+$/, "") || "/";
function l(e) {
	let t = (e.dataset.amxExclude || "").split(",").filter((e) => e.trim()).map(s);
	for (let e of document.querySelectorAll("[data-amx-current]")) t.push(s(e.dataset.amxCurrent));
	let n = c(location.href);
	for (let r of e.querySelectorAll("[data-amx-item]")) {
		let e = r.dataset.amxHref || r.querySelector("a[href]:not([href=\"#\"]):not([href=\"\"])")?.getAttribute("href");
		(t.includes(r.dataset.amxItem) || e && c(e) === n) && u(r);
	}
}
var u = (e) => {
	e.style.display = "none", e.dataset.amxDropped = "";
};
function d(e) {
	let t = e.querySelector("[data-amx-cta]");
	if (!t) return () => {};
	let n = t.closest("a") || t.querySelector("a"), r = !n && t.querySelector("button");
	if (r) {
		n = document.createElement("a");
		for (let { name: e, value: t } of r.attributes) e !== "type" && n.setAttribute(e, t);
		n.append(...r.childNodes), r.replaceWith(n);
	}
	let i = (e) => [...e.childNodes].find((e) => e.nodeType === 3 && e.textContent.trim()), a = [t, ...t.querySelectorAll("*")].filter(i);
	return (e) => {
		let { amxHref: t, amxCtaText: r } = e?.dataset || {};
		t && n && n.setAttribute("href", t), r && a.forEach((e) => {
			i(e).textContent = r;
		});
	};
}
async function f(i) {
	if (i.amerilux) return i.amerilux;
	let [{ Stage: o }, { PRODUCTS: s }] = await Promise.all([import("./amerilux-stage.js"), import("./amerilux-products.js")]), c = i.querySelector("[data-amx-stage]") || i, l = [...i.querySelectorAll("[data-amx-item]:not([data-amx-dropped])")];
	l.filter((e) => !s[e.dataset.amxItem]).forEach(u);
	let f = new t(l.filter((e) => s[e.dataset.amxItem]), { onSelect: (e) => g.go(e) }), p = f.slugs.length ? f.slugs : Object.keys(s), m = (e) => e == null || e === "" ? void 0 : +e, h = i.dataset.amxLayout || getComputedStyle(i).getPropertyValue("--amx-layout").trim() || "hero";
	i.dataset.amxLayout = h;
	let g = new o(c, {
		slugs: p,
		layout: h,
		modelBase: i.dataset.amxModels || n,
		textureBase: i.dataset.amxTextures || r,
		centerX: m(i.dataset.amxCenterX),
		centerY: m(i.dataset.amxCenterY),
		onChange: (e) => {
			f.set(e), _(f.items[e]), i.dispatchEvent(new CustomEvent("amx:change", { detail: {
				index: e,
				slug: p[e]
			} }));
		},
		onBuilt: (e) => a(() => v(e))
	}), _ = d(i), v = (e) => f.fillThumb(e, (e) => g.snapshot(e));
	e(i.querySelector("[data-amx-prev]"), () => g.next(-1)), e(i.querySelector("[data-amx-next]"), () => g.next(1)), f.set(0), _(f.items[0]);
	let y = [...i.querySelectorAll("[data-amx-set-style]")], b = (e) => {
		i.dataset.amxStyle = e, g.setStyle(e), g.items.forEach((e, t) => e.built && a(() => v(t))), y.forEach((t) => {
			let n = t.dataset.amxSetStyle === e;
			t.classList.toggle("is-active", n), t.setAttribute("aria-pressed", n);
		});
	};
	return y.forEach((t) => e(t, () => b(t.dataset.amxSetStyle))), b(i.dataset.amxStyle || "color"), i.amerilux = {
		stage: g,
		tabs: f,
		go: (e) => g.go(e),
		setStyle: b
	}, i.amerilux;
}
function p() {
	if (!document.getElementById("amx-style")) {
		let e = document.createElement("style");
		e.id = "amx-style", e.textContent = i, document.head.appendChild(e);
	}
	let e = new IntersectionObserver((t) => t.forEach((t) => {
		t.isIntersecting && (e.unobserve(t.target), f(t.target));
	}), { rootMargin: "400px 0px" });
	document.querySelectorAll("[data-amx-root]").forEach((t) => {
		l(t), e.observe(t);
	});
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", p) : p();
//#endregion
export { f as init };
