# Placeholders — flag to client

This file tracks what we invented or approximated, as opposed to what came from the client or the Figma design.
Replace each item before launch, and remove it from this list once it's replaced.

Client source files: `Product Files for 3D/` (Google Drive export, 2026-09-28): PDF drawings, DWG files, one MP4.

## 3D models

| Tab | Product line (from files) | What's in the 3D | Accuracy |
| --- | --- | --- | --- |
| Multiwall Sheets | APC PC multiwall | 6mm + 10mm twinwall, 16mm triplewall (20mm cells), stacked | **Profile from `Amerilux Profiles-Current.pdf`**. Skin/rib wall thickness is our guess |
| Corrugated Sheets | APC / Agrilite / Klar | APC P2069 PBU, P2053 Sinus 2.67, P2034 Greca 76×13.5 | **Profiles from `Amerilux Profiles-Current.pdf`**. Sheet thickness exaggerated for visibility. Agrilite and Klar TK6S/TK9 not modelled |
| Flat Sheets | — | 3 plain sheets | **Placeholder**: no drawings supplied |
| Panel Systems | EZ Liner + EZ Forms | Formwork wall (8" female starter → panel → 4.5" spacer → panel → male starter) standing on 16" / 18" / 16" EZ Liner panels lying flat and interlocked below it (client meeting 2026-10-02) | **Real GLBs**. Liner stretched to 14" long (export is only 6") |
| Decking & Railing | DuxxBak | 4 × DuxxBak 1080 boards | **Section traced from `1080-DuxxBak-Board.pdf`** (7-5/16" × 1-1/4", 4 cells). Flange detail and wall thickness approximate. No railing |
| Siding & Cladding | Elite Cladding | 3 × lap siding courses at 7" exposure | **Section traced from `Lap-Siding-Technical-Specification_EN.pdf`** (8.31" × 0.795"). The PDF says "not to scale", so the hook shape is approximate. Board & batten not modelled |
| Specialty Products | Window wells | Semicircular corrugated galvanized-steel well (40" × 20" × 30") with bolt flanges + clear polycarbonate dome cover | **Placeholder**: no drawings or specs yet. Shape, size and material invented (client meeting 2026-10-02: "change model for window wells") |

Unused GLBs: `8-pin`, `8-pin-corner`, `2.5-in-spacer`.
DWGs not yet exported to GLB: `6in-45deg Corner`, `7.5in Radius`, `8in Cap`, `8in Corner Cap`, `TK6S`, `TK9`. There are also 6" form PDFs, which have no DWG yet.

## Colours / materials

Three looks, toggled top right of the stage (the toggle itself is demo-only):
- **Sketch**: architectural graphite sketch (`src/sketch.js`): wobbly double-stroke outlines, tone hatching, glass as linework. Our own direction, not in Figma.
- **B&W** (illustration with outlines): greys come from the luminance of `TINT` in `src/products.js`.
- **Color** (photoreal): finishes in `FINISHES` in `src/materials.js`, matched to the client's own studio test build: clear and bronze polycarbonate (see-through), opal polycarbonate (milky, covers), white PVC (EZ Liner, EZ Forms), white cellular PVC with an embossed grain (Elite), and oak-veneer photo texture on the DuxxBak decking (Poly Haven CC0 placeholder; the client's light-grey "Cool Sand" is kept as `deck-sand`). Lighting is a procedural softbox studio, not a photographed HDRI.

The client files have no colour or finish specs. Need per product line: colour range (RAL / hex / sample), gloss level, metal finish (brushed / anodised / painted), photos of the real product.

The lighting is a procedural studio (`studioEnvironment` in `src/materials.js`), not a photographed HDRI.

## Copy

- **Multiwall Sheets:** title and description from Figma.
- **Panel Systems / Specialty descriptions:** rewritten by us for the new grouping (needs sign-off).
- **Other descriptions:** written by us, using the product names found in the files. Needs client sign-off.
- **CTA links:** all `#`.

## Images

- **Multiwall thumbnail:** from Figma (`public/img/multiwall.png`).
- **Other 6 thumbnails:** auto-rendered from the 3D.
- **`Elite Cladding Mov.mp4`:** available, not used.

## Design gaps (not in Figma, our call)

- **Tab ↔ product-line mapping:** EZ Forms grouped with EZ Liner under Panel Systems; window wells under Specialty (per client meeting 2026-10-02).
- **Mobile / tablet layout:** the panel stacks below the stage under 900px.
- **The × button:** collapses the tab. Its intended behaviour is unknown.
- **Interactions:** drag/swipe to scrub, click a side item, hover lift, mouse tilt, idle sway.
- **Fonts:** the demo uses a locally installed PP Neue Montreal, and the Semibold upright weight isn't installed. The mono font falls back to IBM Plex Mono.
