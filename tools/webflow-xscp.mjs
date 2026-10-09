// Builds tools/webflow-copy.html: copy buttons that put the carousel markup on the clipboard in
// Webflow's paste format (@webflow/XscpData). Paste into the Designer, then make it a component.
//
//   node tools/webflow-xscp.mjs
//
// Static styles become Webflow classes. Rules Webflow can't express (descendant-of-combo states,
// :first-child, grid-row collapse) go in one Code Embed <style> inside the hero.
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// --- tiny XscpData builder ---------------------------------------------------

function build(rootFn) {
  const nodes = [];
  const styles = new Map(); // name -> style

  const style = (name, def = {}, comboOf) => {
    if (styles.has(name + (comboOf || ''))) return styles.get(name + (comboOf || ''))._id;
    const variants = {};
    for (const [k, v] of Object.entries(def)) if (k !== 'base') variants[k] = { styleLess: less(v) };
    const s = { _id: randomUUID(), fake: false, type: 'class', name, namespace: '', comb: comboOf ? '&' : '', styleLess: less(def.base || {}), variants, children: [], selector: null };
    styles.set(name + (comboOf || ''), s);
    if (comboOf) styles.get(comboOf).children.push(s._id);
    return s._id;
  };
  // cls: 'name' | ['name', 'combo'] with defs registered via S()
  const classes = (cls) => {
    if (!cls) return [];
    const [base, ...combos] = [].concat(cls);
    const ids = [style(base, DEFS[base])];
    for (const c of combos) ids.push(style(c, DEFS[`${base}.${c}`] || {}, base));
    return ids;
  };
  const add = (n) => { nodes.push(n); return n._id; };
  const text = (v) => add({ _id: randomUUID(), text: true, v });
  const xattr = (attrs = {}) => Object.entries(attrs).map(([name, value]) => ({ name, value: String(value) }));

  const h = {
    block: (cls, attrs, kids = [], tag = 'div') => add({ _id: randomUUID(), type: 'Block', tag, classes: classes(cls), children: kids, data: { tag, text: false, xattr: xattr(attrs) } }),
    textBlock: (cls, v, attrs) => add({ _id: randomUUID(), type: 'Block', tag: 'div', classes: classes(cls), children: [text(v)], data: { tag: 'div', text: true, xattr: xattr(attrs) } }),
    heading: (tag, cls, v) => add({ _id: randomUUID(), type: 'Heading', tag, classes: classes(cls), children: [text(v)], data: { tag } }),
    para: (cls, v) => add({ _id: randomUUID(), type: 'Paragraph', tag: 'p', classes: classes(cls), children: [text(v)], data: {} }),
    linkBlock: (cls, attrs, kids = [], url = '#') => add({ _id: randomUUID(), type: 'Link', tag: 'a', classes: classes(cls), children: kids, data: { block: 'block', button: false, link: { mode: 'external', url }, xattr: xattr(attrs) } }),
    embed: (cls, html) => add({ _id: randomUUID(), type: 'HtmlEmbed', tag: 'div', classes: classes(cls), children: [], v: html, data: { embed: { meta: { html, div: false, iframe: false, script: false, compilable: false }, type: 'html' }, insideRTE: false } }),
  };

  const rootId = rootFn(h);
  // root first: Webflow treats the first node as the pasted element
  nodes.sort((a, b) => (a._id === rootId ? -1 : b._id === rootId ? 1 : 0));
  return {
    type: '@webflow/XscpData',
    payload: { nodes, styles: [...styles.values()], assets: [], ix1: [], ix2: { interactions: [], events: [], actionLists: [] } },
    meta: { unlinkedSymbolCount: 0, droppedLinks: 0, dynBindRemovedCount: 0, dynListBindRemovedCount: 0, paginationRemovedCount: 0 },
  };
}

// CSS object -> Webflow styleLess, shorthands expanded to the longhands Webflow stores
const SIDES = ['top', 'right', 'bottom', 'left'];
const four = (v) => { const p = String(v).split(/\s+/); return [p[0], p[1] ?? p[0], p[2] ?? p[0], p[3] ?? p[1] ?? p[0]]; };
function less(o) {
  const out = [];
  for (const [k, v] of Object.entries(o)) {
    if (k === 'padding' || k === 'margin') four(v).forEach((x, i) => out.push(`${k}-${SIDES[i]}: ${x}`));
    else if (k === 'inset') four(v).forEach((x, i) => out.push(`${SIDES[i]}: ${x}`));
    else if (k === 'gap') { const [r, c] = String(v).split(/\s+/); out.push(`grid-row-gap: ${r}`, `grid-column-gap: ${c ?? r}`); }
    else if (k === 'border-radius') ['top-left', 'top-right', 'bottom-right', 'bottom-left'].forEach((c) => out.push(`border-${c}-radius: ${v}`));
    else if (/^border(-(top|right|bottom|left))?$/.test(k)) {
      const [w, s, c] = String(v).split(/\s+/);
      for (const side of k === 'border' ? SIDES : [k.slice(7)]) out.push(`border-${side}-width: ${w}`, `border-${side}-style: ${s}`, `border-${side}-color: ${c}`);
    } else out.push(`${k}: ${v}`);
  }
  return out.map((l) => l + ';').join(' ');
}

// --- styles (Figma: AmeriLux Design, Concept 17 + 14172:51607) ---------------
// Font family is left to the site's body font. Variant keys: medium = tablet and below, tiny = phone.

const INK = '#000', TEXT = '#212121', RED = '#af2234', LINE = 'rgba(0,0,0,0.12)', BG = '#f5f5f5';
const DEFS = {
  // shared
  'amx-eyebrow': { base: { display: 'inline-flex', 'align-items': 'center', gap: '10px', height: '34px', padding: '10px 15px', 'background-color': RED, color: '#fff', 'font-size': '14px', 'font-weight': '500', 'line-height': '1', 'letter-spacing': '0.7px', 'text-transform': 'uppercase' } },
  'amx-eyebrow__dot': { base: { width: '10px', height: '10px', 'border-radius': '2px', 'background-color': '#fff' } },
  'amx-nav': { base: { position: 'absolute', 'z-index': '1', display: 'flex', gap: '7px' } },
  'amx-nav-btn': {
    base: { display: 'flex', 'justify-content': 'center', 'align-items': 'center', width: '46px', height: '66px', 'padding-top': '20px', 'border-radius': '2px', 'background-color': 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.2)', 'backdrop-filter': 'blur(25px)', color: INK, transition: 'background-color 200ms ease 0ms' },
    main_hover: { 'background-color': 'rgba(0,0,0,0.18)' },
  },
  'amx-icon': { base: { display: 'flex', 'line-height': '0' } },

  // hero (home)
  products: { base: { position: 'relative', display: 'flex', height: 'max(760px, 100svh)', 'background-color': BG, overflow: 'hidden' }, medium: { 'flex-direction': 'column', height: 'auto' } },
  products__main: { base: { position: 'relative', flex: '1 1 0%', 'min-width': '0px' }, medium: { flex: '0 0 auto', height: '78svh', 'min-height': '560px' } },
  products__stage: { base: { position: 'absolute', inset: '0px' } },
  products__intro: { base: { position: 'absolute', 'z-index': '1', left: '64px', top: '99px', width: 'min(585px, calc(100% - 128px))', display: 'flex', 'flex-direction': 'column', 'align-items': 'flex-start', gap: '16px', 'pointer-events': 'none' }, medium: { left: '20px', top: '40px', width: 'calc(100% - 40px)' } },
  products__title: { base: { 'margin-top': '0px', 'margin-bottom': '0px', 'font-size': '42px', 'font-weight': '600', 'line-height': '1', 'letter-spacing': '-1.26px', color: INK }, medium: { 'font-size': '32px', 'letter-spacing': '-0.9px' } },
  products__rule: { base: { position: 'absolute', 'z-index': '1', left: '0px', right: '0px', top: '267px', 'border-top': `1px solid ${LINE}` }, medium: { top: '180px' } },
  products__lede: { base: { position: 'absolute', 'z-index': '1', left: '64px', top: '291px', width: '350px', 'margin-bottom': '0px', 'font-size': '16px', 'font-weight': '600', 'line-height': '1.25', 'letter-spacing': '-0.16px', color: INK, 'pointer-events': 'none' }, medium: { left: '20px', top: '200px', width: 'min(350px, calc(100% - 40px))', 'font-size': '15px' } },
  'products__nav': { base: { position: 'absolute', 'z-index': '1', right: '62px', bottom: '67px', display: 'flex', gap: '7px' }, medium: { right: '20px', bottom: '24px' } },
  products__panel: { base: { width: '371px', flex: '0 0 auto', 'background-color': '#fff', 'border-left': `1px solid ${LINE}`, 'overflow-y': 'auto' }, medium: { width: '100%', 'border-left': '0px none transparent', 'border-top': `1px solid ${LINE}` } },
  tab: { base: { 'border-top': `1px solid ${LINE}` } },
  tab__head: { base: { width: '100%', padding: '24px 31.5px', color: INK, 'font-size': '20px', 'font-weight': '600', 'line-height': '1', 'letter-spacing': '-0.2px', 'text-decoration': 'none' }, main_hover: { opacity: '0.6' } },
  tab__inner: { base: { 'min-height': '0px', overflow: 'hidden', padding: '0px 31.5px' } },
  tab__top: { base: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-top': '24px', 'margin-bottom': '24px' } },
  tab__thumb: { base: { width: '102px', height: '102px', 'border-radius': '2px', overflow: 'hidden', 'background-color': '#ededeb' } },
  tab__close: { base: { display: 'block', width: '10px', height: '10px', color: INK } },
  tab__title: { base: { 'margin-top': '0px', 'margin-bottom': '16px', 'font-size': '20px', 'font-weight': '600', 'line-height': '1', 'letter-spacing': '-0.2px', color: TEXT } },
  tab__text: { base: { 'margin-bottom': '0px', 'font-size': '14px', 'line-height': '1.3', color: TEXT } },
  tab__cta: {
    base: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', height: '66px', margin: '27px -5px', padding: '37px 20.77px 13px', 'background-color': TEXT, 'border-radius': '2px', color: '#fff', 'font-size': '16px', 'font-weight': '600', 'line-height': '1', 'letter-spacing': '-0.16px', 'text-decoration': 'none', transition: 'background-color 200ms ease 0ms' },
    main_hover: { 'background-color': '#000' },
  },

  // strip (product page)
  'products-strip': { base: { 'padding-top': '80px', 'padding-bottom': '80px', 'background-color': '#fff' }, medium: { 'padding-top': '48px', 'padding-bottom': '48px' } },
  'products-strip__intro': { base: { display: 'flex', 'flex-direction': 'column', 'align-items': 'flex-start', gap: '16px', padding: '0px 64px 32px', 'border-bottom': `1px solid ${LINE}` }, medium: { padding: '0px 20px 24px' } },
  'products-strip__lede': { base: { 'max-width': '485px', 'margin-bottom': '0px', 'font-size': '16px', 'line-height': '1.33', color: TEXT } },
  'products-strip__frame': { base: { position: 'relative', margin: '32px 64px 0px', height: '429px', 'background-color': BG }, medium: { margin: '24px 20px 0px', height: '400px' }, tiny: { height: '560px' } },
  'products-strip__stage': { base: { position: 'absolute', inset: '0px' }, tiny: { bottom: '170px' } },
  'products-strip__item': { base: { display: 'none' } },
  'products-strip__item.is-active': { base: { display: 'block' } },
  'products-strip__caption': { base: { position: 'absolute', left: '35px', bottom: '34px', width: '300px', display: 'flex', 'flex-direction': 'column', gap: '16px', 'pointer-events': 'none' }, medium: { left: '20px', bottom: '110px', width: 'calc(100% - 40px)' } },
  'products-strip__title': { base: { 'margin-top': '0px', 'margin-bottom': '0px', 'font-size': '20px', 'font-weight': '600', 'line-height': '1', 'letter-spacing': '-0.4px', color: INK } },
  'products-strip__text': { base: { 'margin-bottom': '0px', 'font-size': '14px', 'line-height': '1.3', color: TEXT } },
  'products-strip__cta': {
    base: { position: 'absolute', right: '161px', bottom: '34px', width: '318px', height: '66px', display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-end', padding: '0px 16px 15px', 'background-color': '#04152b', color: '#fff', 'font-size': '16px', 'font-weight': '600', 'line-height': '1', 'text-decoration': 'none', transition: 'background-color 200ms ease 0ms' },
    main_hover: { 'background-color': '#000' },
    medium: { left: '20px', right: '128px', bottom: '20px', width: 'auto' },
  },
  'products-strip__nav': { base: { position: 'absolute', 'z-index': '1', right: '38px', bottom: '34px', display: 'flex', gap: '8px' }, medium: { right: '20px', bottom: '20px' } },

  // format test
  'amx-test': { base: { display: 'flex', 'flex-direction': 'column', gap: '12px', padding: '24px', 'background-color': BG, border: `1px solid ${LINE}` } },
  'amx-test.is-active': { base: { 'background-color': '#e6f0ee' } },
  'amx-test__link': { base: { color: '#fff', 'background-color': RED, padding: '12px 16px', 'text-decoration': 'none' }, main_hover: { 'background-color': '#000' }, medium: { 'align-self': 'stretch' } },
};

// --- content -------------------------------------------------------------------

const PRODUCTS = [
  ['multiwall-sheets', 'Multiwall Sheets', 'Lightweight, virtually unbreakable glazing panels, cut to size for high light transmission and low-maintenance performance.'],
  ['corrugated-sheets', 'Corrugated Sheets', 'Polycarbonate Greca, Sine Wave and PBU profiles, plus Agrilite PVC and Klar thermoacoustic sheet for roofing and walls.'],
  ['flat-sheets', 'Flat Sheets', 'Solid polycarbonate and acrylic sheet stock, cut, drilled and formed in-house to your drawings.'],
  ['panel-systems', 'Panel Systems', 'EZ Liner PVC panels in 16" and 18" widths for washable, moisture-proof interior walls, and EZ Forms stay-in-place PVC concrete formwork.'],
  ['decking-railing', 'Decking & Railing', 'DuxxBak decking with a built-in drainage flange, plus I.Dekk, GeoDeck and Optima Dekk boards and matching fascia.'],
  ['siding-cladding', 'Siding & Cladding', 'Elite cellular PVC cladding in lap siding and board & batten profiles. The look of painted wood without the upkeep.'],
  ['specialty-products', 'Specialty Products', 'Window wells and clear polycarbonate window well covers, fabricated to fit.'],
];
const url = (slug) => `/products/${slug}`; // placeholder: set each CTA to the real product page (it also drives auto-exclude)

const ARROW_R = '<svg width="6" height="12" viewBox="0 0 6 12" fill="currentColor"><path d="M6 6 0 0v12z"/></svg>';
const ARROW_L = '<svg width="6" height="12" viewBox="0 0 6 12" fill="currentColor"><path d="M0 6 6 0v12z"/></svg>';
const CARET = '<svg width="12" height="6" viewBox="0 0 12 6" fill="currentColor"><path d="M6 6 0 0h12z"/></svg>';
const CLOSE = '<svg width="10" height="10" viewBox="0 0 10 10" style="display:block;overflow:visible"><path d="M9 1 1 9M1 1l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>';
// thumb is filled with a 3D render by the script; swap for an Image element with data-amx-thumb to use a photo
const THUMB = '<img data-amx-thumb alt="" style="display:block;width:100%;height:100%;object-fit:cover">';

const HERO_CSS = `<style>
/* Amerilux hero: accordion states (script toggles .is-active on .tab) */
.tab:first-child{border-top:0}
.tab:last-child{border-bottom:1px solid rgba(0,0,0,.12)}
.tab__head,.tab__body{display:grid;transition:grid-template-rows .45s cubic-bezier(.6,0,.2,1),padding .45s cubic-bezier(.6,0,.2,1),opacity .3s}
.tab__head{grid-template-rows:1fr;grid-template-columns:1fr 12px;column-gap:24px;align-items:center}
.tab__head>*{overflow:hidden}
.tab__body{grid-template-rows:0fr;opacity:0}
.tab:first-child .tab__top{margin-top:39px}
.tab.is-active .tab__head{grid-template-rows:0fr;padding-top:0;padding-bottom:0;opacity:0;pointer-events:none;overflow:hidden}
.tab.is-active .tab__head>*{min-height:0}
.tab.is-active .tab__body{grid-template-rows:1fr;opacity:1}
</style>`;

const navButtons = (h, cls) => h.block(cls, {}, [
  h.linkBlock(['amx-nav-btn'], { 'data-amx-prev': 'true', 'aria-label': 'Previous product' }, [h.embed('amx-icon', ARROW_L)]),
  h.linkBlock(['amx-nav-btn'], { 'data-amx-next': 'true', 'aria-label': 'Next product' }, [h.embed('amx-icon', ARROW_R)]),
]);
const eyebrow = (h, label) => h.block('amx-eyebrow', {}, [h.block('amx-eyebrow__dot'), h.textBlock(null, label)]);

const hero = build((h) => h.block('products', { 'data-amx-root': 'true', 'data-amx-layout': 'hero', 'data-amx-style': 'color' }, [
  h.embed(null, HERO_CSS),
  h.block('products__main', {}, [
    h.block('products__stage', { 'data-amx-stage': 'true' }),
    h.block('products__intro', {}, [eyebrow(h, 'Our products'), h.heading('h2', 'products__title', 'Building materials for every environment. Made to measure.')]),
    h.block('products__rule'),
    h.para('products__lede', 'Domestic polycarbonate manufacturing, nationwide plastic and building materials distribution, and in-house fabrication. All under one roof. From greenhouse walls to stadium canopies, we’ve got you covered.'),
    navButtons(h, 'products__nav'),
  ]),
  h.block('products__panel', {}, PRODUCTS.map(([slug, title, text], i) =>
    h.block(i === 0 ? ['tab', 'is-active'] : 'tab', { 'data-amx-item': slug }, [
      h.linkBlock('tab__head', { 'data-amx-trigger': 'true' }, [h.textBlock(null, title), h.embed('amx-icon', CARET)]),
      h.block('tab__body', {}, [h.block('tab__inner', {}, [
        h.block('tab__top', {}, [
          h.embed('tab__thumb', THUMB),
          h.linkBlock('tab__close', { 'data-amx-close': 'true', 'aria-label': 'Close' }, [h.embed('amx-icon', CLOSE)]),
        ]),
        h.heading('h3', 'tab__title', title),
        h.para('tab__text', text),
        h.linkBlock('tab__cta', {}, [h.textBlock(null, `Explore ${title}`), h.embed('amx-icon', ARROW_R)], url(slug)),
      ])]),
    ]))),
]));

const strip = build((h) => h.block('products-strip', { 'data-amx-root': 'true', 'data-amx-layout': 'strip', 'data-amx-style': 'color' }, [
  h.block('products-strip__intro', {}, [
    eyebrow(h, 'Our products'),
    h.heading('h2', 'products__title', 'Other products to consider'),
    h.para('products-strip__lede', 'If your build calls for more than one material, AmeriLux has the sheets, accessories, and expertise to handle it. Reach out and see how our extensive range and people-first approach can make a real difference.'),
  ]),
  h.block('products-strip__frame', {}, [
    h.block('products-strip__stage', { 'data-amx-stage': 'true' }),
    ...PRODUCTS.map(([slug, title, text], i) =>
      h.block(i === 0 ? ['products-strip__item', 'is-active'] : 'products-strip__item', { 'data-amx-item': slug }, [
        h.block('products-strip__caption', {}, [h.heading('h3', 'products-strip__title', title), h.para('products-strip__text', text)]),
        h.linkBlock('products-strip__cta', {}, [h.textBlock(null, `Explore ${title}`), h.embed('amx-icon', ARROW_R)], url(slug)),
      ])),
    navButtons(h, 'products-strip__nav'),
  ]),
]));

const test = build((h) => h.block(['amx-test', 'is-active'], { 'data-amx-test': 'hello' }, [
  h.heading('h3', null, 'Paste test'),
  h.para(null, 'Check: grey-green box (combo class is-active), 24px padding, custom attribute data-amx-test="hello", red link turns black on hover, arrow icon embed.'),
  h.linkBlock('amx-test__link', {}, [h.textBlock(null, 'Link block'), h.embed('amx-icon', ARROW_R)]),
]));

// --- copy page -------------------------------------------------------------------

const payloads = { test, hero, strip };
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Amerilux Webflow Copy</title>
<style>
:root{--bg:#f5f5f5;--ink:#111;--muted:#666;--line:rgba(0,0,0,.12);--accent:#af2234}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#151515;--ink:#eee;--muted:#999;--line:rgba(255,255,255,.14)}}
:root[data-theme="dark"]{--bg:#151515;--ink:#eee;--muted:#999;--line:rgba(255,255,255,.14)}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
main{max-width:640px;margin:0 auto;padding:48px 16px}
h1{font-size:24px;margin:0 0 8px}p{color:var(--muted);margin:0 0 24px}
.row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;border-top:1px solid var(--line)}
.row b{display:block}.row span{color:var(--muted);font-size:13px}
button{font:inherit;font-weight:600;padding:10px 18px;border:0;border-radius:4px;background:var(--accent);color:#fff;cursor:pointer;min-width:110px}
button.ok{background:#2e7d32}
</style></head><body><main>
<h1>Amerilux → Webflow</h1>
<p>Click Copy, then select a parent element in the Webflow Designer and press Ctrl/Cmd+V. Paste <b>Test</b> first to check the format.</p>
<div class="row"><div><b>Test</b><span>Small box: classes, combo class, hover, attribute, embed</span></div><button data-k="test">Copy</button></div>
<div class="row"><div><b>Products – Hero</b><span>Home: stage + accordion, 7 products</span></div><button data-k="hero">Copy</button></div>
<div class="row"><div><b>Products – Strip</b><span>Product page: “Other products to consider”</span></div><button data-k="strip">Copy</button></div>
</main>
<script>
const DATA = ${JSON.stringify(payloads)};
let pending = null;
document.addEventListener('copy', (e) => {
  if (!pending) return;
  e.clipboardData.setData('application/json', pending);
  e.clipboardData.setData('text/plain', pending);
  e.preventDefault();
});
document.querySelectorAll('button[data-k]').forEach((b) => b.addEventListener('click', () => {
  pending = JSON.stringify(DATA[b.dataset.k]);
  const ok = document.execCommand('copy');
  pending = null;
  b.textContent = ok ? 'Copied ✓' : 'Failed';
  b.classList.toggle('ok', ok);
  setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('ok'); }, 1800);
}));
</script></body></html>`;

writeFileSync(new URL('./webflow-copy.html', import.meta.url), page);
for (const [k, v] of Object.entries(payloads)) console.log(k, v.payload.nodes.length, 'nodes', v.payload.styles.length, 'classes');
