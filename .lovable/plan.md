

# Colored Map Tiles

Currently using CARTO Light (grayscale) tiles. I'll switch to a colorful tile provider.

## Options

| Provider | Style | URL |
|----------|-------|-----|
| **OpenStreetMap Standard** | Classic colorful | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| **CARTO Voyager** | Colorful + clean/modern | `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` |
| **Stadia Alidade Smooth** | Soft pastel colors | Requires API key |

## Plan

**File: `src/components/MapView.tsx`**
- Replace the CARTO Light tile URL with **CARTO Voyager** — it's colorful, modern, clean, and free (no API key needed)

**File: `src/index.css`**
- Remove or adjust the `filter: brightness/contrast/saturate` on `.leaflet-tile-pane` since Voyager tiles already look great without manipulation

One file change, instant result.

