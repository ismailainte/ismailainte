# Soomaali Weyn map data

Everything the map renders is generated from public sources. Nothing under
`src/app/[locale]/somali-weyn/map*.ts` or `public/map/` should be edited by hand.

```bash
npm run map:fetch      # downloads the sources into scripts/map/.cache (git-ignored)
npm run map:generate   # rewrites the generated files
```

## Output

| File | Contents |
|---|---|
| `src/app/[locale]/somali-weyn/mapGeometry.ts` | Base map: land, the Soomaali Weyn union, provincial borders, rivers, lakes |
| `src/app/[locale]/somali-weyn/mapRegions.ts` | 39 first-level units with bounds and label points |
| `src/app/[locale]/somali-weyn/mapDistricts.ts` | 213 second-level units, keyed by region |
| `public/map/towns/<region>.json` | Towns per region, fetched on drill-down |
| `public/map/towns-index.json` | Flat town index for the search box |

## Sources

- **Natural Earth 1:10m** (public domain) — coastlines, countries, rivers, lakes,
  and the first-level units outside Soomaali Weyn.
- **geoBoundaries gbOpen** (CC BY 4.0) — SOM/KEN/DJI ADM1 and ADM2, ETH ADM2 and
  ADM3, YEM ADM2. Attribution is required if this is published.
- **GeoNames** (CC BY 4.0) — populated places for the town layer.

## Notes

- `aliases.json` maps the source spellings onto the orthography the base map
  uses (`BELET WEYNE` to `Beledweyne`, `Erigavo` to `Ceerigaabo`, and so on).
  Add an entry there rather than editing generated output.
- Coordinates are snapped to roughly a metre before any boolean operation.
  Without that, polygon-clipping throws on about seventy of these outlines.
- Districts are clipped to the *territory*, not to their region: the ADM1 and
  ADM2 layers come from different vintages and do not line up. A district is
  assigned to the region it overlaps most, and newer districts that fall outside
  every old region outline go to the nearest one.
- Known gaps: Djibouti's Arta region has no ADM2 children in gbOpen, so it is a
  leaf. Ethiopia's ADM3 release predates the current woreda list, so the Somali
  Region resolves to 55 units rather than the ~90 it has today.
