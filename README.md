# AUDIXO V66 — Cinematic Studio Polish + Freeform Phonk Crate

A complete, single-repository Vite/React source package. **99 files**; no node_modules,
private cookies, tokens, or separate media worker. This ZIP is source code, not a deployed site.

## What changed from V65

- **Open Studio control dock**: curated six-preset first view, expandable **All 36 Presets**
  control, search/group filtering, and an internally scrollable result list. Preset
  tuning also scrolls inside its panel, instead of extending the whole timeline.
- **Natural ↔ Studio FX blend** in Tone controls: 0% routes the original voice;
  100% routes the selected FX chain. The real-time processing and offline export
  share the same blend implementation. A separate dry branch retains the source.
- Two new presets, **Natural Studio Voice** and **Airy Remix**, for 36 total.
  High-density voice presets start gentler, preserving presence rather than
  overwhelming the voice with reverb, bass, or compression.
- **Phonk crate**: one free-positioned glass bin with 19 cards, short drop-and-settle
  entrance, movable cards (mouse/touch/pointer and Alt+arrow keys), saved positions,
  a Reset layout control, and playback on pickup. No moving marquee, double rows,
  New Drop or User Clip labels. All 6 supplied artworks now use matching file names.
- **Navigation**: fully rounded action buttons and consistent focus/hover states.
  Small screens retain a horizontal, accessible Studio action bar.
- **About / Nexivo**: matching visual hierarchy, restrained animated pink/purple/
  cyan/green neon outlines and responsive glass cards.
- Updated service worker cache namespace to V66 to reduce stale-asset surprises.

## Verify before uploading

Node 20+ and an npm registry connection are needed.

```
npm ci
npm run test:ui
npm run build
```

`test:ui` runs 13 malformed-markup/SSR fixture checks plus source regression checks:
freeform pointer dragging, cards, image mappings, real FX blend, presets, and converter
quality components. `npm run build` runs ONNX runtime preparation, TypeScript checks,
Vite bundling, and real route prerender/SEO validation. Keep the project root and all
relative paths when uploading extracted files to GitHub. Vercel framework: Vite,
build: `npm run build`, output: `dist`. No Render/Docker deployment is needed.

## Important technical limits

- This environment could NOT install the complete npm dependency tree (registry/cache
  unavailable), so a full production build and live end-to-end audio audition remain
  unverified here. Do not treat source/syntax tests as proof of a successful deploy.
- YouTube direct media links may be blocked by CORS, source restrictions, expiration,
  or rights limitations. The browser-only MP3/MP4 module does not bypass these limits;
  it exposes only verified resolutions, and local authorized MP3/MP4 processing remains.
- AI stem separation may be memory intensive; reducing percussion or metallic sounds
  in a complete mix is not guaranteed without separate stems.

The audio editor's existing timeline, cuts, fades, Smart Pauses, motion controls,
voice recorder, export routes, and 19-track catalog are preserved. No credentials,
login cookies, node_modules, cache, or generated build output is bundled.
