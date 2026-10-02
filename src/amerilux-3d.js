// Amerilux product carousel — Webflow embed entry.
//
//   <script type="module" src="https://<host>/amerilux-3d.js"></script>
//
// Auto-initialises every [data-amx-root]:
//   [data-amx-stage]            element the canvas fills (size it in Webflow)
//   [data-amx-item="<slug>"]    accordion items, see tabs.js; order = carousel order
//   [data-amx-prev] [data-amx-next]
// Optional on the root: data-amx-models / data-amx-textures (GLB / texture folder URLs, default next to this script),
//   data-amx-center-x / data-amx-center-y (0-1, active slot position in the stage),
//   data-amx-style ("color" | "mono" | "sketch", initial visual style).
//   [data-amx-set-style="<style>"] buttons switch style; the active one gets .is-active.
// Emits `amx:change` on the root with detail { index, slug }; exposes root.amerilux.go(i)
// and root.amerilux.setStyle(s)
// (set once the 3D chunk has loaded, i.e. after the section first nears the viewport).
import { Tabs } from './tabs.js';

const MODELS = import.meta.env.DEV ? '/models/' : new URL('./models/', import.meta.url).href;
const TEXTURES = import.meta.env.DEV ? '/textures/' : new URL('./textures/', import.meta.url).href;

const CSS = `
:where([data-amx-stage]){position:relative}
[data-amx-stage]{touch-action:pan-y}
.amx-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;outline:none}
.amx-canvas.is-dragging{cursor:grabbing}
[data-amx-root][data-amx-style="mono"] [data-amx-thumb]:not([data-amx-gen]){filter:grayscale(1)}`;

// three.js + models load only once the section approaches the viewport
async function init(root) {
  if (root.amerilux) return root.amerilux;
  const [{ Stage }, { PRODUCTS }] = await Promise.all([import('./stage.js'), import('./products.js')]);
  const stageEl = root.querySelector('[data-amx-stage]') || root;
  const tabs = new Tabs(root, { onSelect: (i) => stage.go(i) });
  const slugs = tabs.slugs.length ? tabs.slugs : Object.keys(PRODUCTS);
  const num = (v, d) => (v == null || v === '' ? d : +v);

  const stage = new Stage(stageEl, {
    slugs,
    modelBase: root.dataset.amxModels || MODELS,
    textureBase: root.dataset.amxTextures || TEXTURES,
    centerX: num(root.dataset.amxCenterX, 0.505),
    centerY: num(root.dataset.amxCenterY, 0.67),
    onChange: (index) => {
      tabs.set(index);
      root.dispatchEvent(new CustomEvent('amx:change', { detail: { index, slug: slugs[index] } }));
    },
  });

  root.querySelector('[data-amx-prev]')?.addEventListener('click', () => stage.next(-1));
  root.querySelector('[data-amx-next]')?.addEventListener('click', () => stage.next(1));
  tabs.set(0);

  const styleBtns = [...root.querySelectorAll('[data-amx-set-style]')];
  const setStyle = (s) => {
    root.dataset.amxStyle = s;
    stage.setStyle(s);
    stage.ready.then(() => setTimeout(() => tabs.fillThumbs((i) => stage.snapshot(i)), 50));
    styleBtns.forEach((b) => {
      const on = b.dataset.amxSetStyle === s;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
  };
  styleBtns.forEach((b) => b.addEventListener('click', () => setStyle(b.dataset.amxSetStyle)));
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
  document.querySelectorAll('[data-amx-root]').forEach((el) => io.observe(el));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

export { init };
