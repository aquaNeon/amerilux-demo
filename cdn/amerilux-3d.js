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
	let n = c(location.href), r = [...e.querySelectorAll("[data-amx-item]")];
	r.forEach((i, a) => {
		let o = i.dataset.amxHref || i.querySelector("a[href]:not([href=\"#\"]):not([href=\"\"])")?.getAttribute("href");
		(t.includes(i.dataset.amxItem) || o && c(o) === n) && (u(i), e.amxStart ?? (e.amxStart = r[(a + 1) % r.length]));
	});
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
	let [{ Stage: o }, { PRODUCTS: s }] = await Promise.all([import("./amerilux-stage.js"), import("./amerilux-products.js")]), c = i.querySelector("[data-amx-stage]") || i, l = [...i.querySelectorAll("[data-amx-item]:not([data-amx-dropped])")], f = i.amxStart, p = f ? l.findIndex((e) => e === f || e.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_PRECEDING) : 0;
	p > 0 && (l = [...l.slice(p), ...l.slice(0, p)]), l.filter((e) => !s[e.dataset.amxItem]).forEach(u);
	let m = new t(l.filter((e) => s[e.dataset.amxItem]), { onSelect: (e) => v.go(e) }), h = m.slugs.length ? m.slugs : Object.keys(s), g = (e) => e == null || e === "" ? void 0 : +e, _ = i.dataset.amxLayout || getComputedStyle(i).getPropertyValue("--amx-layout").trim() || "hero";
	i.dataset.amxLayout = _;
	let v = new o(c, {
		slugs: h,
		layout: _,
		modelBase: i.dataset.amxModels || n,
		textureBase: i.dataset.amxTextures || r,
		centerX: g(i.dataset.amxCenterX),
		centerY: g(i.dataset.amxCenterY),
		onChange: (e) => {
			m.set(e), y(m.items[e]), i.dispatchEvent(new CustomEvent("amx:change", { detail: {
				index: e,
				slug: h[e]
			} }));
		},
		onBuilt: (e) => a(() => b(e))
	}), y = d(i), b = (e) => m.fillThumb(e, (e) => v.snapshot(e));
	e(i.querySelector("[data-amx-prev]"), () => v.next(-1)), e(i.querySelector("[data-amx-next]"), () => v.next(1)), m.set(0), y(m.items[0]);
	let x = [...i.querySelectorAll("[data-amx-set-style]")], S = (e) => {
		i.dataset.amxStyle = e, v.setStyle(e), v.items.forEach((e, t) => e.built && a(() => b(t))), x.forEach((t) => {
			let n = t.dataset.amxSetStyle === e;
			t.classList.toggle("is-active", n), t.setAttribute("aria-pressed", n);
		});
	};
	return x.forEach((t) => e(t, () => S(t.dataset.amxSetStyle))), S(i.dataset.amxStyle || "color"), i.amerilux = {
		stage: v,
		tabs: m,
		go: (e) => v.go(e),
		setStyle: S
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
