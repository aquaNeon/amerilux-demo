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
}, n = new URL("./models/", "" + import.meta.url).href, r = new URL("./textures/", "" + import.meta.url).href, i = "\n:where([data-amx-stage]){position:relative}\n[data-amx-stage]{touch-action:pan-y}\n.amx-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;outline:none}\n.amx-canvas.is-dragging{cursor:grabbing}\n[data-amx-root][data-amx-style=\"mono\"] [data-amx-thumb]:not([data-amx-gen]){filter:grayscale(1)}", a = (e) => window.requestIdleCallback ? requestIdleCallback(e, { timeout: 500 }) : setTimeout(e, 30), o = (e) => new URL(e, location.href).pathname.replace(/\/+$/, "") || "/";
function s(e) {
	let t = (e.dataset.amxExclude || "").split(",").map((e) => e.trim()).filter(Boolean), n = o(location.href);
	for (let r of e.querySelectorAll("[data-amx-item]")) {
		let e = r.querySelector("a[href]:not([href=\"#\"]):not([href=\"\"])");
		(t.includes(r.dataset.amxItem) || e && o(e.getAttribute("href")) === n) && c(r);
	}
}
var c = (e) => {
	e.style.display = "none", e.dataset.amxDropped = "";
};
async function l(i) {
	if (i.amerilux) return i.amerilux;
	let [{ Stage: o }, { PRODUCTS: s }] = await Promise.all([import("./amerilux-stage.js"), import("./amerilux-products.js")]), l = i.querySelector("[data-amx-stage]") || i, u = [...i.querySelectorAll("[data-amx-item]:not([data-amx-dropped])")];
	u.filter((e) => !s[e.dataset.amxItem]).forEach(c);
	let d = new t(u.filter((e) => s[e.dataset.amxItem]), { onSelect: (e) => h.go(e) }), f = d.slugs.length ? d.slugs : Object.keys(s), p = (e) => e == null || e === "" ? void 0 : +e, m = i.dataset.amxLayout || getComputedStyle(i).getPropertyValue("--amx-layout").trim() || "hero";
	i.dataset.amxLayout = m;
	let h = new o(l, {
		slugs: f,
		layout: m,
		modelBase: i.dataset.amxModels || n,
		textureBase: i.dataset.amxTextures || r,
		centerX: p(i.dataset.amxCenterX),
		centerY: p(i.dataset.amxCenterY),
		onChange: (e) => {
			d.set(e), i.dispatchEvent(new CustomEvent("amx:change", { detail: {
				index: e,
				slug: f[e]
			} }));
		},
		onBuilt: (e) => a(() => g(e))
	}), g = (e) => d.fillThumb(e, (e) => h.snapshot(e));
	e(i.querySelector("[data-amx-prev]"), () => h.next(-1)), e(i.querySelector("[data-amx-next]"), () => h.next(1)), d.set(0);
	let _ = [...i.querySelectorAll("[data-amx-set-style]")], v = (e) => {
		i.dataset.amxStyle = e, h.setStyle(e), h.items.forEach((e, t) => e.built && a(() => g(t))), _.forEach((t) => {
			let n = t.dataset.amxSetStyle === e;
			t.classList.toggle("is-active", n), t.setAttribute("aria-pressed", n);
		});
	};
	return _.forEach((t) => e(t, () => v(t.dataset.amxSetStyle))), v(i.dataset.amxStyle || "color"), i.amerilux = {
		stage: h,
		tabs: d,
		go: (e) => h.go(e),
		setStyle: v
	}, i.amerilux;
}
function u() {
	if (!document.getElementById("amx-style")) {
		let e = document.createElement("style");
		e.id = "amx-style", e.textContent = i, document.head.appendChild(e);
	}
	let e = new IntersectionObserver((t) => t.forEach((t) => {
		t.isIntersecting && (e.unobserve(t.target), l(t.target));
	}), { rootMargin: "400px 0px" });
	document.querySelectorAll("[data-amx-root]").forEach((t) => {
		s(t), e.observe(t);
	});
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", u) : u();
//#endregion
export { l as init };
