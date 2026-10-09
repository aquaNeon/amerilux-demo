# amerilux-demo

3D product carousel for the Amerilux "Our Products" section (Figma: *AmeriLux – Design → Concept 17*).
Vanilla three.js, built as a drop-in script for Webflow. The Webflow designer builds the layout
natively; the script only drives the canvas and syncs the accordion tabs.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (demo page replicating Figma)
npm run build      # -> dist/
npm run models     # re-optimise GLBs from ../export into public/models
```

STEP models (window well) go straight to `public/models`, keeping their own coordinates:

```bash
STEP_IN=in.STEP OBJ_OUT=out.obj LIN=0.6 ANG=0.35 "C:/Program Files/FreeCAD 1.0/bin/freecadcmd.exe" tools/step2obj.py
node tools/obj2glb.mjs out.obj public/models/<name>.glb [part indices | all]
```

`step2obj.py` prints each solid's size, so you can split a STEP file into separate GLBs by part index.

## How it works

- One WebGL canvas behind the left column. The orthographic camera maps 1 world unit to 1 CSS px,
  so the carousel slots match Figma exactly (active 326×318, side items 174×114, scaled with column width).
- 7 carousel items = 7 accordion tabs, synced both ways. The active item scales up, takes its colour
  and explodes into layers; inactive items are shown in greyscale (Figma's luminosity blend).
- Input: click an item, drag/swipe to scrub, prev/next buttons, or click a tab.
- Loading: `amerilux-3d.js` is ~2 KB. three.js and the models (~170 KB gzip JS + ~400 KB GLB)
  load only when the section comes within 400px of the viewport. Rendering pauses off-screen.

### Models

| Tab | 3D |
| --- | --- |
| Multiwall / Corrugated | extruded from APC profile drawings, lineup + materials from the CMF sheet |
| Flat Sheets | HDPE / PC / acrylic, sizes from the CMF sheet |
| Panel Systems | GLB: EZ Liner 16" / 18" + EZ Forms 8" formwork |
| Decking & Railing | extruded DuxxBak 1080 section |
| Siding & Cladding | extruded Elite lap siding section |
| Specialty Products | GLB from STEP: egress well 5036 + Premium Square Flat cover 5237 |

See [PLACEHOLDERS.md](PLACEHOLDERS.md) for everything invented for the demo.

`tools/optimize.mjs` resets stray node transforms (the 2.5" spacer was exported at 0.29 scale),
bakes the Y-up rotation, centres each part and meshopt-compresses it (2.5 MB → 400 KB).

## Webflow setup

**1. Script.** Page settings → Custom code → *Before `</body>`*:

```html
<script type="module" src="https://amerilux-demo.vercel.app/amerilux-3d.js"></script>
```

Models load from `models/` next to the script. To host them elsewhere, set `data-amx-models="https://…/models/"` on the root.

**2. Attributes.** Build the section in the Designer, then add these custom attributes:

| Attribute | Element |
| --- | --- |
| `data-amx-root` | section wrapper (one per carousel) |
| `data-amx-stage` | div the canvas fills. Give it a size (for example absolute, inset 0, in the left column) |
| `data-amx-item="<slug>"` | each accordion item. Order = carousel order |
| `data-amx-trigger` | collapsed header inside an item (click selects it) |
| `data-amx-close` | optional × inside the open item |
| `data-amx-thumb` | optional `<img>` in the item. If its src is empty, a 3D render is used |
| `data-amx-prev` / `data-amx-next` | arrow buttons |

Slugs: `multiwall-sheets`, `corrugated-sheets`, `flat-sheets`, `panel-systems`,
`decking-railing`, `siding-cladding`, `specialty-products`.

Optional on the root: `data-amx-center-x` and `data-amx-center-y` (0–1). These set where the active item sits in the stage. Defaults are `0.505` and `0.64`.

**3. Open/closed state.** The script toggles the combo class **`is-active`** on the open item.
Style the open and closed states with that class. `src/demo.css` has a reference version
(`.tab`, `.tab.is-active`) that uses a CSS grid-rows height transition.

**4. Events** (for Webflow interactions or custom code):

```js
root.addEventListener('amx:change', (e) => console.log(e.detail)); // { index, slug }
root.amerilux.go(3); // available once the 3D chunk has loaded
```

## Deploy

Static `dist/`. `vercel.json` adds the CORS headers that a cross-origin module script and the GLB fetches need.
Files are unhashed (so the Webflow URL stays stable), with a short cache (5 min browser / 1 h CDN).
