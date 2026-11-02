# AUDIXO V68 — UI Refinement & Source/Preview Compare

This ZIP contains the complete editable Vite/React app (not a mockup). It builds on the V67 code and retains the 19-track phonk slider, 36 Studio presets, original editing engines, existing export filename fix, and browser-first converter architecture. It does **not** deploy anything automatically.

## Changes

- **Tools navigation:** compact three-column dropdown (two on small screens), names-only entries, neon-ring circular tool icons, keyboard and mouse access, and staggered entrance animation. Original routes and names remain unchanged.
- **Quick audio workspaces (Trim, Pitch, Echo, Slowed + Reverb, 8D/16D):** unified white-glass surfaces, compact presets/buttons, corrected decorative upload panel, branded white logo plate, and real drag-and-drop file import.
- **Original vs processed:** one consistently sized, responsive A/B listening comparison section, separated by an animated VS symbol. Each audio player pauses the other when played. Processed playback is generated only after clicking Preview; if settings change, the UI warns that preview must be refreshed.
- **Nexivo & About:** deliberate spacing below the menu, readable text hierarchy, cleaner cards, and four-color animated borders without a rotating decorative wedge.
- **Home and Features:** restrained glass cards and animated neon green/cyan/purple/pink outlines. No original buttons, CTAs, or destinations were removed.
- **Footer:** calmer background, more consistent spacing and links.
- **Build identity:** package version and service worker cache namespace updated to V68; Node.js stays pinned to 22.x.

## Verification and limits

The source contracts (`npm run test:tracks`), TypeScript/TSX syntax parsing, stylesheet parsing and ZIP integrity can be validated without downloading packages. A complete `npm ci && npm run build` and live interactive browser E2E still need to pass in a network-enabled environment; the packaging environment could not complete npm installation. Do not interpret source checks as proof of an error-free production deployment. Browser-only YouTube downloads remain subject to access/CORS restrictions.

For preview: extract ZIP contents to the repository root, run `npm ci`, `npm run test:tracks`, `npm run build`, and verify each Quick Tool before promoting.

---

# AUDIXO V67 — Source ZIP for GitHub / Vercel

This is an **editable Vite/React project**, not an image or mockup. The archive contains 99 project files (excluding dependencies). Extract and upload the **contents** to the GitHub repository root; do not upload the ZIP as a single file. Deployment remains under your control.

## V67 updates

- **Phonk Live Sound Lab:** Continuous, slow, 19-song auto slider using three reusable lanes; mouse hover pauses, mouse/touch drag browses, Shift + wheel or held-mouse + wheel moves in either direction, and song click plays the actual media. Hidden scrollbar, compact original-style rectangular cards, no additional toggle bar. Six supplied covers remain correctly mapped. No extra media service.
- **Full Studio file rename fix:** The Export dialog has an independent download filename input that works even when saving to the local Library is disabled. It produces `Your Chosen Name (Audixo).mp3` (or `.wav`). The same naming scheme is available in the streaming editor. Unicode and normal spaces are retained; invalid filesystem characters are removed.
- **Homepage metrics:** The four rotating value cards advance every **1.25 seconds**, with shorter visual transitions and more compact card dimensions.
- **UI restoration:** Quiet white/glass background, restrained 4-color neon rim (green, cyan, purple, pink) around relevant surfaces, no rotating conic wedge in upload areas, white logo backing, compact polished Studio headers, pill-shaped primary navigation action, softer Nexivo/About, rounded feature cards, and a simplified responsive footer. No new picture assets.
- **Preserved:** 36 presets, Natural/Studio FX blend, editor effects (reverb, echo, Lo-fi, Smart Repeats), waveform editing, MP3/MP4 quality selection, and all 19 songs. No new Render/Docker worker. Source access restrictions on YouTube cannot be bypassed by a browser-only converter.

## QA and deployment expectations

Run `npm ci`, `npm run test:tracks`, and `npm run build` on Node 22.x. On Vercel, set the framework to Vite and output directory to `dist`. A Preview build should be checked before promoting. Source syntax checks, markup regressions, ZIP integrity, artwork existence, and sample filename tests were performed. The **complete npm/Vite production build remains unverified in this execution environment**, because npm registry package retrieval failed. Do not assume live media E2E success before testing it on your deployed preview.

---

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


## V66.1 — Node.js 26 build compatibility guard

The earlier V66 package declared `engines.node: ">=20"`. On October 29, 2026, Vercel made Node.js 26 its default and automatically upgraded builds whose semver range allowed 26. A deployment screenshot then showed Node.js v26.13.0 terminating with an ESM `SyntaxError: Invalid or unexpected token`.

**Change:** `package.json` and `package-lock.json` now both pin `node: "22.x"` (Node.js 22 LTS), matching the stable Node major used for local JS syntax and SSR self-tests. This prevents the unreviewed Node 26 upgrade without changing the website, media, audio effects or UI. The pin overrides the Vercel project Node setting during the next new build.

**Check:** Vercel build logs should now show Node 22.x. After uploading, redeploy a *new* Preview build and confirm `npm run build` completes. If a syntax error still appears, capture the full build logs above its stack trace, especially the first file/module path. This source-only repair cannot independently certify the full Vite production build here because npm dependency packages are not available in the local sandbox.
