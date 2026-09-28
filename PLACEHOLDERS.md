# Placeholders — flag to client

Everything below is made up by us, not supplied by Amerilux or in the Figma design.
Replace each item before launch, and remove it from this list once it's replaced.

## 3D models

| Tab | Status | What we did | Needed from client |
| --- | --- | --- | --- |
| Multiwall Sheets | **placeholder** | Procedural: 2 skins + 16 ribs + mid layer (`src/products.js` → `multiwall`) | Real profile / section drawing (wall count, thickness) |
| Corrugated Sheets | **placeholder** | Procedural sine-wave sheet ×3 (clear / bronze / opal) | Profile (pitch, depth), colour range |
| Flat Sheets | **placeholder** | Procedural thin boxes ×3 | Colour/finish range |
| Decking & Railing | **placeholder** | Procedural 4 boards + 2 joists, invented brown | Board profile, railing parts, colours |
| Panel Systems | real GLBs, **assembly guessed** | fem starter → panel → 4.5" spacer → panel → male starter, stacked on depth | Confirm how parts actually connect |
| Siding & Cladding | real GLBs, **mapping guessed** | 16"/18" EZ Liner boards side by side | Confirm EZ Liner belongs in this category |
| Specialty Products | real GLBs, **mapping guessed** | 8" pin corner + pin + 2.5" spacer | Confirm which products belong here |

Real GLBs not yet used: none. CAD in `../cad` not yet exported to GLB: `6in-45deg Corner`, `7.5in Radius`, `8in Cap`, `8in Corner Cap`, `TK6S`, `TK9` (`8_cap.fbx` exists in `converted/`). Unclear: which CAD file the `8-pin` / `8-pin-corner` GLBs came from.

## Colours / materials

Active tints (`TINT` in `src/products.js`) are invented: mint-clear, bronze, opal, profile mint, deck brown.
Need: real product colours and finishes.

## Copy

Only **Multiwall Sheets** title and description come from Figma. The descriptions for the other 6 tabs were written by us (`index.html`).
CTA links are all `#`.

## Images

Only the Multiwall thumbnail is from Figma (`public/img/multiwall.png`). The other 6 tab thumbnails are auto-rendered from the 3D models.

## Design gaps (not in Figma, our call)

- Mobile / tablet layout (panel stacks below the stage under 900px)
- The × close button collapses the tab. Its intended behaviour is unknown
- Interactions: drag/swipe to scrub, click side item, hover lift, mouse tilt, idle sway
- Font: the demo uses a locally installed PP Neue Montreal, and the Semibold upright weight isn't installed. The mono font falls back to IBM Plex Mono
