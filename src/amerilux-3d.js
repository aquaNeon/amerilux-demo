// Amerilux product carousel — Webflow embed entry.
//
//   <script type="module" src="https://<host>/amerilux-3d.js"></script>
//
// Auto-initialises every [data-amx-root]:
//   [data-amx-stage]            element the canvas fills (size it in Webflow)
//   [data-amx-item="<slug>"]    accordion items, see tabs.js; order = carousel order
//   [data-amx-prev] [data-amx-next]
// Optional on the root: data-amx-models / data-amx-textures (GLB / texture folder URLs, default next to this script),
//   data-amx-layout ("hero" | "strip", slot layout; or set CSS custom property --amx-layout on the root,
//     so a Webflow component variant can switch it), default "hero",
//   data-amx-exclude (comma-separated slugs to leave out),
//   data-amx-center-x / data-amx-center-y (0-1, active slot position in the stage, default per layout),
//   data-amx-style ("color" | "mono" | "sketch", initial visual style).
//   [data-amx-set-style="<style>"] buttons switch style; the active one gets .is-active.
// Items whose link (any a[href] inside) points at the current page are left out, so the
// product-page instance never shows the product you are on. Items with no 3D model are left out too.
// Emits `amx:change` on the root with detail { index, slug }; exposes root.amerilux.go(i)
// and root.amerilux.setStyle(s)
// (set once the 3D chunk has loaded, i.e. after the section first nears the viewport).
import { Tabs, onPress } from './tabs.js';

const MODELS = import.meta.env.DEV ? '/models/' : new URL('./models/', import.meta.url).href;
const TEXTURES = import.meta.env.DEV ? '/textures/' : new URL('./textures/', import.meta.url).href;

const CSS = `
:where([data-amx-stage]){position:relative}
[data-amx-stage]{touch-action:pan-y}
.amx-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;outline:none}
.amx-canvas.is-dragging{cursor:grabbing}
[data-amx-root][data-amx-style="mono"] [data-amx-thumb]:not([data-amx-gen]){filter:grayscale(1)}`;

// one thumbnail per idle moment: each is a full offscreen render + pixel readback
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 30));

const path = (href) => new URL(href, location.href).pathname.replace(/\/+$/, '') || '/';

// runs on page load, before any 3D, so excluded items never flash
function prune(root) {
  const skip = (root.dataset.amxExclude || '').split(',').map((v) => v.trim()).filter(Boolean);
  const here = path(location.href);
  for (const el of root.querySelectorAll('[data-amx-item]')) {
    const a = el.querySelector('a[href]:not([href="#"]):not([href=""])');
    if (skip.includes(el.dataset.amxItem) || (a && path(a.getAttribute('href')) === here)) drop(el);
  }
}
const drop = (el) => { el.style.display = 'none'; el.dataset.amxDropped = ''; };

// three.js + models load only once the section approaches the viewport
async function init(root) {
  if (root.amerilux) return root.amerilux;
  const [{ Stage }, { PRODUCTS }] = await Promise.all([import('./stage.js'), import('./products.js')]);
  const stageEl = root.querySelector('[data-amx-stage]') || root;
  const items = [...root.querySelectorAll('[data-amx-item]:not([data-amx-dropped])')];
  items.filter((el) => !PRODUCTS[el.dataset.amxItem]).forEach(drop);
  const tabs = new Tabs(items.filter((el) => PRODUCTS[el.dataset.amxItem]), { onSelect: (i) => stage.go(i) });
  const slugs = tabs.slugs.length ? tabs.slugs : Object.keys(PRODUCTS);
  const num = (v) => (v == null || v === '' ? undefined : +v);
  const layout = root.dataset.amxLayout || getComputedStyle(root).getPropertyValue('--amx-layout').trim() || 'hero';
  root.dataset.amxLayout = layout;

  const stage = new Stage(stageEl, {
    slugs,
    layout,
    modelBase: root.dataset.amxModels || MODELS,
    textureBase: root.dataset.amxTextures || TEXTURES,
    centerX: num(root.dataset.amxCenterX),
    centerY: num(root.dataset.amxCenterY),
    onChange: (index) => {
      tabs.set(index);
      root.dispatchEvent(new CustomEvent('amx:change', { detail: { index, slug: slugs[index] } }));
    },
    onBuilt: (i) => idle(() => thumb(i)),
  });
  const thumb = (i) => tabs.fillThumb(i, (k) => stage.snapshot(k));

  onPress(root.querySelector('[data-amx-prev]'), () => stage.next(-1));
  onPress(root.querySelector('[data-amx-next]'), () => stage.next(1));
  tabs.set(0);

  const styleBtns = [...root.querySelectorAll('[data-amx-set-style]')];
  const setStyle = (s) => {
    root.dataset.amxStyle = s;
    stage.setStyle(s);
    stage.items.forEach((it, i) => it.built && idle(() => thumb(i))); // unbuilt ones get theirs from onBuilt
    styleBtns.forEach((b) => {
      const on = b.dataset.amxSetStyle === s;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
  };
  styleBtns.forEach((b) => onPress(b, () => setStyle(b.dataset.amxSetStyle)));
  setStyle(root.dataset.amxStyle || 'color');

  root.amerilux = { stage, tabs, go: (i) => stage.go(i), setStyle };
  return root.amerilux;
}

function boot() {
  if (!document.getElementById('amx-style')) {
    const s = document.createElement('style');
    s.id = 'amx-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    init(e.target);
  }), { rootMargin: '400px 0px' });
  document.querySelectorAll('[data-amx-root]').forEach((el) => { prune(el); io.observe(el); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

export { init };
