# Placeholders — flag to client

This file tracks what we invented or approximated, as opposed to what came from the client or the Figma design.
Replace each item before launch, and remove it from this list once it's replaced.

Client source files: `Product Files for 3D/` (Google Drive export, 2026-09-28): PDF drawings, DWG files, one MP4.
CMF sheet: `AmeriLux – 3D Render Material Specs.xlsx` (2026-10-09, Google Sheet export): colour hex, opacity, light transmission, finish and size per product line. Its "Profile / CAD" Drive links weren't opened.
Second asset drop: `Assets for Frida` (Drive export, 2026-10-09): APC multiwall DWGs, TK6S / TK9 DWGs, Agrilite MR9 / Greca PDFs, EZ Liner / EZ Forms DWGs + PDFs, decking PDFs, board & batten PDF, and **STEP models of the window well and cover**. The DWGs are 2D shop drawings (sections + dimensions), not 3D models (only `8in Cap` contains a solid).

## 3D models

| Tab | Product line (from files) | What's in the 3D | Accuracy |
| --- | --- | --- | --- |
| Multiwall Sheets | AmeriLite MW Pro | 8mm twinwall clear, 16mm triplewall opal, 25mm Five X-Wall bronze, stacked | **Lineup and colours from the CMF sheet; cells (pitch, skin / rib thickness, X-wall diagonals) from the APC DWGs**. Walls drawn at least 0.6mm (skins) / 0.5mm (ribs) so they read on screen |
| Corrugated Sheets | Agrilite / KLAR / AmeriLite CS Pro | Agrilite MR9 white PVC, AmeriLite CS Pro clear PC, KLAR TK6S white PVC with black core | **Lineup, colours, thickness from the CMF sheet** (thickness ×1.75 for visibility). **MR9 profile from `Agrilite MR9-X1106.pdf`, TK6S from `TK6S.dwg`**. **CS Pro from P2053 Sinus 2.67 in `Amerilux Profiles-Current.pdf`** (client's pick, 2026-10-09). Core split (thirds) is our guess. TK9 / Agrilite Greca supplied but not in the CMF lineup |
| Flat Sheets | HDPE / Polycarbonate / Acrylic | Black hammered HDPE 0.220", clear PC 0.093", clear acrylic 0.118" | **From the CMF sheet** (thickness ×1.6). Its second tab lists HDPE 0.50" and acrylic 0.080" instead: we used the main tab. Hammered texture is procedural |
| Panel Systems | EZ Liner + EZ Forms | Formwork wall (8" female starter → panel → 4.5" spacer → panel → male starter) standing on 16" / 18" / 16" EZ Liner panels lying flat and interlocked below it (client meeting 2026-10-02) | **Real GLBs**. Liner stretched to 14" long (export is only 6") |
| Decking & Railing | DuxxBak | 4 × DuxxBak 1080 boards, Driftwood grey | **Section traced from `1080-DuxxBak-Board.pdf`** (7-5/16" × 1-1/4", 4 cells). Flange detail and wall thickness approximate. No railing. I.Dekk / Optima Dekk (in the CMF sheet) not modelled |
| Siding & Cladding | Elite Cladding | 3 × lap siding courses at 7" exposure, Polar White | **Section traced from `Lap-Siding-Technical-Specification_EN.pdf`** (8.31" × 0.795"). The PDF says "not to scale", so the hook shape is approximate. Board & batten (in the CMF sheet) not modelled |
| Specialty Products | Window wells | Egress well 5036 + Premium Square Flat cover 5237 (panel + rail with 5 knobs) | **Real models from the STEP files** (`Egress-5036SPC.STEP`, `Cover-5237SPE.STEP`), tessellated by `tools/step2obj.py` + `tools/obj2glb.mjs`. The STEP well is 58.6" deep; the CMF sheet says 72": we kept the model. Rail material unknown (rendered galvanized like the well). The sheet says both "Stainless Steel" and "Silver (Galvanized)": we rendered galvanized |

Unused GLBs: `8-pin`, `8-pin-corner`, `2.5-in-spacer`.
DWGs not yet exported to GLB: `6in-45deg Corner`, `7.5in Radius`, `8in Cap`, `8in Corner Cap`, `TK6S`, `TK9`. There are also 6" form PDFs, which have no DWG yet.

## Colours / materials

Three looks, toggled top right of the stage (the toggle itself is demo-only):
- **Sketch**: clean technical line drawing (`src/sketch.js`): single anti-aliased ink lines (feature edges + silhouettes) on paper-white faces, glass as linework. Our own direction, not in Figma.
- **B&W** (illustration with outlines): greys come from the luminance of `TINT` in `src/products.js`.
- **Color** (photoreal): finishes in `FINISHES` in `src/materials.js`, matched to the client's own studio test build: clear and bronze polycarbonate (see-through), opal polycarbonate (milky, covers), white PVC (EZ Liner, EZ Forms), white cellular PVC (Elite; no grain texture: the sheet calls it "hardly noticeable", and our bump map banded into contour lines), and Driftwood grey composite on the DuxxBak decking (the oak photo texture and the client's test-build "Cool Sand" are kept as `deck-oak` / `deck-sand`), white gloss / matte PVC for Agrilite / KLAR (black core), black hammered HDPE, mill galvanized steel. Lighting is a procedural softbox studio, not a photographed HDRI.

Colours, opacity and finish names now come from the CMF sheet. Still ours: roughness / clearcoat values (our reading of "Gloss", "Matte / Satin", "Mill"), clear polycarbonate's faint cool cast (the sheet says #FFFFFF; we toned the Figma teal down to match its reference photo), the opal glow, and the decking grain (procedural, wire-brushed, lifted above #B7B7B7 so it renders at about that grey under the studio light). Still need: photos of the real products, and colour ranges beyond the one variant per line in the sheet.

The lighting is a procedural studio (`studioEnvironment` in `src/materials.js`), not a photographed HDRI.

## Copy

- **Multiwall Sheets:** title and description from Figma.
- **Panel Systems / Specialty descriptions:** rewritten by us for the new grouping (needs sign-off).
- **Other descriptions:** written by us, using the product names found in the files. Needs client sign-off. Flat Sheets now mentions HDPE (CMF sheet).
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
