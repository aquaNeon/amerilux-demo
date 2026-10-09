# Where the 3D comes from

| Tab | Source | Status |
| --- | --- | --- |
| Multiwall Sheets | CMF sheet (lineup, colour) + APC DWGs (`8mm Twinwall`, `16mm Triplewall`, `25mm X wall APC.dwg`: cells) | From drawings. Walls thickened for visibility |
| Corrugated Sheets | CMF sheet (colour, thickness) + `Agrilite MR9-X1106.pdf` + `TK6S.dwg` | From drawings. **CS Pro profile is a stand-in** (APC Sinus), thickness exaggerated |
| Flat Sheets | CMF sheet (HDPE 0.220", PC 0.093", acrylic 0.118") | From specs. Thickness exaggerated |
| Panel Systems | Prepped GLBs: EZ Liner 16" + 18" | Real model. Length stretched |
| Decking & Railing | Traced from PDF (`1080-DuxxBak-Board.pdf`) | Traced. Flange detail winged, no railing |
| Siding & Cladding | Traced from PDF (`Lap-Siding-Technical-Specification_EN.pdf`) | Traced. Hook detail winged (PDF not to scale) |
| Panel Systems (formwork) | Prepped GLBs: EZ Forms 8" fem starter, panel, 4.5" spacer, male starter | Real model. Assembly checked against `8in Panel 3in Insulation.pdf` |
| Specialty Products | STEP models: `Egress-5036SPC.STEP`, `Cover-5237SPE.STEP` | Real model |

**Winged everywhere:**
- Roughness / gloss values (the CMF sheet gives only finish names)
- 6 of 7 descriptions (only Multiwall's comes from Figma)
- 6 of 7 thumbnails (auto-rendered from the 3D)
- Which product line sits under which tab (e.g. EZ Forms under Specialty)
- Mobile layout
- Interactions

Details: [PLACEHOLDERS.md](PLACEHOLDERS.md)

## Textures

- `public/textures/deck-oak_*`: "Oak Veneer 01" by Poly Haven (https://polyhaven.com/a/oak_veneer_01), CC0. No longer used by default (the decking is now the CMF sheet's Driftwood grey, procedural). Kept as the `deck-oak` finish. Recompressed: colour 1k JPEG, normal + roughness 512 px (~225 KB total).
