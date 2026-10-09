// Builds the Webflow paste for the 3D slider from webflow/section.html (parser and copy page from the
// Shuttlerock build-webflow.mjs).
//
//   npm run build:webflow && git commit + push cdn/     (the embed loads the cdn/ build from jsDelivr)
//   node tools/build-webflow.mjs                         -> dist/webflow/
//       paste.html       Copy buttons: put the section on the clipboard in Webflow's format
//       embed-css.txt    CSS embed, to replace the embed's code on later updates
//       embed-js.txt     JS embed
//       preview.html     the section on a page with the live site CSS, running the local cdn/ build
//   python -m http.server 5174   (from the repo root) -> http://127.0.0.1:5174/dist/webflow/paste.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const EMBED_MAX = 50000;
// Webflow's default image placeholder (the thumbs stay on it: the script renders them from the 3D)
const PLACEHOLDER = 'https://cdn.prod.website-files.com/plugins/Basic/assets/placeholder.60f9b1840c.svg';
const SITE = 'https://amerilux.webflow.io/';

// ---- JS: the cdn/ build at the last commit that touched it ----------------------------------
const git = (...args) => execFileSync('git', ['-c', 'safe.directory=*', ...args], { cwd: root, encoding: 'utf8' }).trim();
const commit = git('log', '-1', '--format=%H', '--', 'cdn');
if (git('status', '--porcelain', '--', 'cdn')) console.warn('! cdn/ has uncommitted changes: the embed points at', commit.slice(0, 7), '(commit + push cdn/, then rebuild)');
const JS_SRC = `https://cdn.jsdelivr.net/gh/aquaNeon/amerilux-demo@${commit}/cdn/amerilux-3d.js`;

// ---- Source ---------------------------------------------------------------------------------
// Carousel order = tab order; slugs must match PRODUCTS in src/products.js. Names and copy are the
// demo's (index.html), used only to fill the preview: in the paste the wraps stay empty.
const TABS = [
  ['multiwall-sheets', 'Multiwall Sheets', 'Lightweight, virtually unbreakable glazing panels, cut to size for high light transmission and low-maintenance performance.'],
  ['corrugated-sheets', 'Corrugated Sheets', 'Polycarbonate Greca, Sine Wave and PBU profiles, plus Agrilite PVC and Klar thermoacoustic sheet for roofing and walls.'],
  ['flat-sheets', 'Flat Sheets', 'Solid polycarbonate, acrylic and HDPE sheet stock, cut, drilled and formed in-house to your drawings.'],
  ['panel-systems', 'Panel Systems', 'EZ Liner PVC panels in 16&quot; and 18&quot; widths for washable, moisture-proof interior walls, and EZ Forms stay-in-place PVC concrete formwork.'],
  ['decking-railing', 'Decking &amp; Railing', 'DuxxBak decking with a built-in drainage flange, plus I.Dekk, GeoDeck and Optima Dekk boards and matching fascia.'],
  ['siding-cladding', 'Siding &amp; Cladding', 'Elite cellular PVC cladding in lap siding and board &amp; batten profiles. The look of painted wood without the upkeep.'],
  ['specialty-products', 'Specialty Products', 'Window wells and clear polycarbonate window well covers, fabricated to fit.'],
];
const SLUGS = TABS.map((t) => t[0]);
// fill: preview only, puts demo copy into the wraps (Webflow gets them empty for the site's components)
const wrap = (cls, html, fill) => `<div class="${cls}">${fill ? html : ''}</div>`;
// one name per tab: the head row is the collapsed row and the open title
const tab = ([slug, name, text], fill) => `      <div class="three_tab" data-amx-item="${slug}">
        <div class="three_tab_top">
          <div class="three_tab_top_inner">
            <img class="three_tab_thumb" data-amx-thumb alt="">
            <div class="three_tab_close" data-amx-close aria-label="Close"></div>
          </div>
        </div>
        <div class="three_tab_head" data-amx-trigger>
          ${wrap('three_tab_title_wrap', `<h3 class="pv_tab_name">${name}</h3>`, fill)}
          <div class="three_tab_caret"></div>
        </div>
        <div class="three_tab_body">
          <div class="three_tab_inner">
            ${wrap('three_tab_text_wrap', `<p class="pv_tab_text">${text}</p>`, fill)}
            ${wrap('three_tab_actions_wrap', `<a class="pv_cta" href="#">Explore ${name}</a>`, fill)}
          </div>
        </div>
      </div>`;
const PREVIEW_FILL = {
  three_eyebrow_wrap: '<div class="pv_eyebrow">Our products</div>',
  three_title_wrap: '<h2 class="pv_title">Building materials for every environment. Made to measure.</h2>',
  three_text_wrap: '<p class="pv_text">Domestic polycarbonate manufacturing, nationwide plastic and building materials distribution, and in-house fabrication. All under one roof. From greenhouse walls to stadium canopies, we&#39;ve got you covered.</p>',
};

// Webflow gets the CSS without comments (the source keeps them); embeds are ASCII only
const stripCss = (t) => t.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n');
const ascii = (t) => t.replace(/[^\x00-\x7f]/g, (c) => `\\${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const build = (fill) => read('webflow/section.html')
  .replace(/^<!--[\s\S]*?-->\s*/, '')
  .replace('__TABS__', TABS.map((t) => tab(t, fill)).join('\n'))
  .replace('__JS_SRC__', JS_SRC)
  .replace(/<style>([\s\S]*?)<\/style>/g, (m, css) => `<style>${ascii(stripCss(css))}</style>`);
const source = build(false);

// ---- Tiny HTML parser (enough for our own source) ------------------------------------------
const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link']);
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

function parse(html) {
  const top0 = { tag: '#root', attrs: {}, children: [] };
  const stack = [top0];
  const re = /<!--[\s\S]*?-->|<wf-embed(?:\s+class="([^"]*)")?>([\s\S]*?)<\/wf-embed>|<\/([a-z0-9-]+)\s*>|<([a-z0-9-]+)((?:\s+[^\s=>]+(?:="[^"]*")?)*)\s*\/?>|([^<]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[2] != null) top.children.push({ tag: '#embed', attrs: { class: m[1] || '' }, html: m[2].trim() });
    else if (m[3]) {
      if (top.tag !== m[3].toLowerCase()) throw new Error(`Unexpected </${m[3]}> inside <${top.tag}>`);
      stack.pop();
    } else if (m[4]) {
      const attrs = {};
      for (const a of m[5].matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) attrs[a[1]] = decode(a[2] ?? '');
      const el = { tag: m[4].toLowerCase(), attrs, children: [] };
      top.children.push(el);
      if (!VOID.has(el.tag)) stack.push(el);
    } else if (m[6] && m[6].trim()) top.children.push({ tag: '#text', text: decode(m[6].replace(/\s+/g, ' ').trim()) });
  }
  if (stack.length !== 1) throw new Error(`Unclosed <${stack[stack.length - 1].tag}>`);
  return top0.children;
}

// ---- XscpData ------------------------------------------------------------------------------
function toXscp(tree) {
  const nodes = [], styles = new Map();
  const styleId = (name) => {
    if (!styles.has(name)) styles.set(name, {
      _id: randomUUID(), fake: false, type: 'class', name, namespace: '',
      comb: '', styleLess: '', variants: {}, children: [], selector: null,
    });
    return styles.get(name)._id;
  };
  const SKIP = new Set(['class', 'href', 'src', 'alt']);

  function add(el) {
    const _id = randomUUID();
    if (el.tag === '#text') { nodes.push({ _id, text: true, v: el.text }); return _id; }
    if (el.tag === '#embed') {
      if (el.html.length > EMBED_MAX) throw new Error(`Embed is ${el.html.length} chars (Webflow max ${EMBED_MAX})`);
      const classes = el.attrs.class.split(/\s+/).filter(Boolean).map(styleId);
      nodes.push({ _id, type: 'HtmlEmbed', tag: 'div', classes, children: [], v: el.html, data: {
        embed: { meta: { html: el.html, div: false, iframe: false, script: /<script/i.test(el.html), compilable: false }, type: 'html' },
        insideRTE: false,
      } });
      return _id;
    }
    const { tag } = el;
    const attrs = { ...el.attrs };
    const cls = (attrs.class || '').split(/\s+/).filter(Boolean);
    if (cls.length > 1) throw new Error(`One class per element (Webflow makes the rest combo classes): ${cls.join(' ')}`);
    const classes = cls.map(styleId);
    const xattr = Object.entries(attrs).filter(([k]) => !SKIP.has(k)).map(([name, value]) => ({ name, value }));
    const node = { _id, tag, classes, children: [], data: { tag, xattr } };
    nodes.push(node); // parent before children
    node.children = el.children.map(add);
    if (tag === 'section') Object.assign(node, { type: 'Section', data: { ...node.data, grid: { type: 'section' } } });
    else if (/^h[1-6]$/.test(tag)) node.type = 'Heading';
    else if (tag === 'p') node.type = 'Paragraph';
    else if (tag === 'a') {
      node.type = 'Link';
      const block = el.children.some((c) => c.tag !== '#text');
      Object.assign(node.data, { button: false, block: block ? 'block' : '', link: { mode: 'external', url: attrs.href || '#' } });
    } else if (tag === 'img') {
      node.type = 'Image';
      Object.assign(node.data, { img: { id: '' }, srcsetDisabled: false, sizes: [],
        attr: { src: PLACEHOLDER, alt: attrs.alt ?? '', loading: 'lazy', width: 'auto', height: 'auto' } });
    } else {
      node.type = 'Block';
      node.data.text = el.children.length > 0 && el.children.every((c) => c.tag === '#text');
    }
    return _id;
  }
  tree.forEach(add);
  return {
    type: '@webflow/XscpData',
    payload: { nodes, styles: [...styles.values()], assets: [], ix1: [], ix2: { interactions: [], events: [], actionLists: [] } },
    meta: { unlinkedSymbolCount: 0, droppedLinks: 0, dynBindRemovedCount: 0, dynListBindRemovedCount: 0, paginationRemovedCount: 0 },
  };
}

// ---- Output --------------------------------------------------------------------------------
const tree = parse(source);
const find = (nodes, test) => {
  for (const el of nodes) {
    if (test(el)) return el;
    const hit = el.children && find(el.children, test);
    if (hit) return hit;
  }
};
const embedHtml = (cls) => find(tree, (el) => el.tag === '#embed' && el.attrs.class === cls).html;
const variants = [
  { key: 'smoke', label: 'Smoke test', note: 'One div with a class, a custom attribute and some text. Paste this first to check the clipboard works.',
    data: toXscp(parse('<div class="three_test" data-amx-test="ok">Paste works</div>')) },
  { key: 'full', label: '3D slider section', note: 'Section + CSS embed (first child) + JS embed (last child). Paste into Body, or replace the existing three_wrap.',
    data: toXscp(tree) },
  { key: 'tabs', label: 'Tabs only (three_tabs)', note: 'The tab list with all 7 tabs, to replace three_tabs inside three_panel in an existing section.',
    data: toXscp([find(tree, (el) => el.attrs?.class === 'three_tabs')]) },
  { key: 'css', label: 'CSS embed code', note: 'Plain text: open the section\'s u-embed-css embed, select all, paste. Same as embed-css.txt.',
    text: embedHtml('u-embed-css') },
];

const out = join(root, 'dist', 'webflow');
mkdirSync(out, { recursive: true });
for (const v of variants) if (v.data) writeFileSync(join(out, `${v.key}.json`), JSON.stringify(v.data));
const embeds = [...source.matchAll(/<wf-embed class="([^"]*)">([\s\S]*?)<\/wf-embed>/g)];
for (const [, cls, html] of embeds) writeFileSync(join(out, cls === 'u-embed-css' ? 'embed-css.txt' : 'embed-js.txt'), html.trim() + '\n');

const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
writeFileSync(join(out, 'paste.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Webflow Paste</title>
<style>
  :root{--bg:#f4f4f7;--fg:#121319;--mute:#5b5d68;--card:#fff;--line:#e2e2e8;--accent:#4353ff}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121319;--fg:#f4f4f7;--mute:#a0a2ad;--card:#1d1f26;--line:#2c2e37}}
  body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
  main{max-width:640px;margin:0 auto;padding:48px 16px}
  h1{font-size:24px;margin:0 0 8px}p{margin:0;color:var(--mute)}
  .row{display:flex;gap:16px;align-items:center;justify-content:space-between;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:12px}
  .row b{display:block;color:var(--fg)}
  button{flex:none;font:inherit;font-weight:600;padding:10px 18px;border:0;border-radius:8px;background:var(--accent);color:#fff;cursor:pointer}
  button.ok{background:#2f9e5b}
  ol{color:var(--mute);padding-left:20px;margin:24px 0 0}
  code{font-size:14px}
</style></head><body><main>
<h1>Copy to Webflow: 3D slider</h1>
<p>Click Copy, then select Body (or the element to paste after) in the Webflow Designer and press Ctrl/Cmd+V.</p>
${variants.map((v) => `<div class="row"><div><b>${v.label}</b><p>${v.note}</p></div><button data-key="${v.key}" data-type="${v.text ? 'text/plain' : 'application/json'}">Copy</button></div>
<script type="application/json" id="d-${v.key}">${json(v.text ?? v.data)}</script>`).join('\n')}
<ol>
  <li>Classes carry no styles: everything is in the CSS embed (first child), styled like the demo. <code>three_wrap</code> is the section; delete the old empty <code>three_wrap</code> section in the site.</li>
  <li>Drop the site's components into the empty wraps: <code>three_eyebrow_wrap</code>, <code>three_title_wrap</code>, <code>three_text_wrap</code>, and per tab <code>three_tab_title_wrap</code> (product name: the collapsed row and the open title), <code>three_tab_text_wrap</code>, <code>three_tab_actions_wrap</code> (button).</li>
  <li>The JS embed (last child) loads the slider from jsDelivr at commit <code>${commit.slice(0, 7)}</code>; three.js and the models load when the section nears the viewport.</li>
  <li>Tab order = carousel order. Each tab's <code>data-amx-item</code> must stay one of: ${SLUGS.map((s) => `<code>${s}</code>`).join(', ')}.</li>
  <li>Thumbnails are Image elements: set an image (or link it to a component property) to use it, or leave Webflow's placeholder and the script renders one from the 3D.</li>
  <li>The 3D, the open tab and the arrows only work on the published site (or Preview): scripts don't run in the Designer canvas.</li>
</ol>
</main>
<script>
  document.querySelectorAll('button[data-key]').forEach(function (b) {
    b.addEventListener('click', function () {
      var data = document.getElementById('d-' + b.dataset.key).textContent;
      if (b.dataset.type === 'text/plain') data = JSON.parse(data); // stored as a JSON string
      function onCopy(e) { e.clipboardData.setData(b.dataset.type, data); e.preventDefault(); }
      document.addEventListener('copy', onCopy);
      var ok = document.execCommand('copy');
      document.removeEventListener('copy', onCopy);
      b.textContent = ok ? 'Copied' : 'Copy failed'; b.classList.toggle('ok', ok);
      setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('ok'); }, 2000);
    });
  });
</script>
</body></html>
`);

// ---- Local preview: the section on a page with the live site's CSS and global embeds ---------
const site = (() => { try { return read('webflow/site.html'); } catch { return ''; } })();
const siteCss = [...site.matchAll(/<link href="(https:\/\/cdn\.prod\.website-files\.com\/[^"]+\.css)"/g)].map((m) => m[1]);
// the site's global CSS embeds: whole <style> blocks only (an embed can contain other markup)
const siteEmbeds = [...site.matchAll(/<div class="u-embed-css w-embed">\s*(<style>[\s\S]*?<\/style>)/g)].map((m) => m[1]).join('\n');
const previewSection = build(true)
  .replace(/<div class="(three_[a-z_]+_wrap)"><\/div>/g, (m, c) => `<div class="${c}">${PREVIEW_FILL[c] || ''}</div>`)
  .replace(/<wf-embed class="u-embed-js">[\s\S]*?<\/wf-embed>/, '<div class="u-embed-js w-embed"><script type="module" src="../../cdn/amerilux-3d.js"></script></div>')
  .replace(/<wf-embed(?:\s+class="([^"]*)")?>([\s\S]*?)<\/wf-embed>/g, (m, c, html) => `<div class="${c} w-embed">${html}</div>`)
  .replace(/<img class="three_tab_thumb"/g, `<img class="three_tab_thumb" src="${PLACEHOLDER}"`);
writeFileSync(join(out, 'preview.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>3D Slider Preview</title>
${siteCss.map((h) => `<link href="${h}" rel="stylesheet">`).join('\n')}
${siteEmbeds}
<style>${read('webflow/preview.css')}</style>
</head><body>
${previewSection}
</body></html>
`);

const full = variants[1].data.payload;
console.log(`dist/webflow/paste.html: ${full.nodes.length} nodes, ${full.styles.length} classes, embeds ${embeds.map((e) => e[2].trim().length).join(' + ')} chars (max ${EMBED_MAX} each)`);
console.log(`JS embed: ${JS_SRC}`);
if (!site) console.warn('! webflow/site.html missing: preview has no site CSS (curl -sL ' + SITE + ' -o webflow/site.html)');
