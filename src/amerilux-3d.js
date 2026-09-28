// Amerilux product carousel — Webflow embed entry.
//
//   <script type="module" src="https://<host>/amerilux-3d.js"></script>
//
// Auto-initialises every [data-amx-root]:
//   [data-amx-stage]            element the canvas fills (size it in Webflow)
//   [data-amx-item="<slug>"]    accordion items, see tabs.js; order = carousel order
//   [data-amx-prev] [data-amx-next]
// Optional on the root: data-amx-models (GLB folder URL, defaults next to this script),
//   data-amx-center-x / data-amx-center-y (0-1, active slot position in the stage).
// Emits `amx:change` on the root with detail { index, slug }; exposes root.amerilux.go(i)
// (set once the 3D chunk has loaded, i.e. after the section first nears the viewport).
import { Tabs } from './tabs.js';

const MODELS = import.meta.env.DEV ? '/models/' : new URL('./models/', import.meta.url).href;

const CSS = `
:where([data-amx-stage]){position:relative}
[data-amx-stage]{touch-action:pan-y}
.amx-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;outline:none}
.amx-canvas.is-dragging{cursor:grabbing}`;

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
    centerX: num(root.dataset.amxCenterX, 0.505),
    centerY: num(root.dataset.amxCenterY, 0.64),
    onChange: (index) => {
      tabs.set(index);
      root.dispatchEvent(new CustomEvent('amx:change', { detail: { index, slug: slugs[index] } }));
    },
  });

  root.querySelector('[data-amx-prev]')?.addEventListener('click', () => stage.next(-1));
  root.querySelector('[data-amx-next]')?.addEventListener('click', () => stage.next(1));
  tabs.set(0);
  stage.ready.then(() => tabs.fillThumbs((i) => stage.snapshot(i)));

  root.amerilux = { stage, tabs, go: (i) => stage.go(i) };
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
