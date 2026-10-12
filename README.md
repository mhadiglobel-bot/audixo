# AUDIXO Studio V44 — GitHub-ready source

**Project:** https://audixo.vercel.app  
**Stack:** React 18 + TypeScript + Vite + Vercel API adapter  
**Edition:** 99 source and asset files, with `node_modules` excluded entirely.

## What's new in V44

- Premium MP3/MP4 selection rail: the 16px white dots now sit **inside** the 22px neon track, not outside it. Selected and API-reported qualities remain visually distinct.
- Removed full-width top/bottom blur overlays that were hiding content. The sticky navbar itself retains restrained backdrop blur.
- Redesigned the “How Audixo Moves” demonstration: one clean waveform timeline, seven selectable stages, a working Play/Pause walkthrough control, contextual explanation, and links to real tools. Decorative nested faux forms are gone.
- Four independent homepage metric animations, each with staggered start, typewriter text, ~5-second hold, and soft burst removal. Stem numbers map to real five stem categories, and displayed preset numbers/names come directly from `src/editor/project.ts`.
- Features page has four different workspace illustrations (Trim, Effects, Stems, Library) instead of one repeated waveform. “Only what you need” links remain clickable.
- Mobile PWA helper appears on mobile even if Chrome/Edge does not fire the `beforeinstallprompt` event. It attempts native installation when offered and otherwise provides browser-specific Add to Home Screen instructions. Installed standalone mode hides the helper.
- 7-second intro loader retains the exact official AUDIXO symbol and name; its surrounding liquid-neon ring has improved motion. This does not modify the logo artwork.
- Updated SW cache identifier, manifest shortcuts, meta release marker, modestly faster moving gallery, and small-spacing refinements.
- `Mp3QualityRail` and converter bitrate state now share the exact `Mp3Bitrate` TypeScript union type, addressing the earlier TS2322 mismatch.

## New GitHub repository upload

Extract the ZIP locally. Upload the contents of the extracted folder **directly to the root** of your repository, including hidden `.gitignore`, `src`, `public`, `api`, `scripts`, `package.json`, `package-lock.json`, `vite.config.ts`, and `vercel.json`. Do not upload the ZIP itself. The package deliberately omits `node_modules` and `dist`.

## Vercel deployment

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Root directory | `./` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm ci` |
| Node | 20 or newer |

Set Environment Variables (Production and Preview):

1. `AUDIXO_YTDL_BASE_URL` = `https://ytdl.tiers.rest` (**required**, no `/download` suffix).
2. `VITE_SITE_URL` = `https://audixo.vercel.app` (**only after the new project actually owns this domain**; otherwise use its temporary Vercel domain and later redeploy after transfer).
3. `AUDIXO_YTDL_AUTH_TOKEN` = your *existing backend-issued secret*, only when your REST YTDL API enforces it. Do not invent a token or expose it in GitHub.

The conversion API and two-hour jobs still depend on the external backend's actual capabilities. MP4 resolutions are requests, not promises. The MP3 server targets 320 kbps; 64/192/240 kbps are possible only by local re-encoding for eligible **short and small** files. Long media will remain at the server's 320 kbps target even if a lower UI point is selected; this is labelled in the converter.

## Mobile PWA installation

- Check `https://audixo.vercel.app/site.webmanifest`, `/sw.js`, `/pwa/icon-192.png`, `/pwa/icon-512.png` load successfully over HTTPS.
- On Android Chrome/Edge, choose **Install app** or **Add to Home screen** in the browser menu. AUDIXO's mobile Install app chip also calls the native prompt if offered.
- On iPhone Safari, choose **Share → Add to Home Screen**. iOS does not guarantee the same Chrome install icon or install prompt behavior as Android.
- Check installed navigation, Studio access, audio importing, and converter requests on a physical phone. Online conversion needs a network connection.

## Acceptance tests after Vercel deploy

1. Confirm `meta[name=audixo-release]` is `v44.0` in page source and `data-audixo-release` appears in the footer.
2. Verify MP3 (64/192/240/320) and MP4 (240–2160p) selector dots stay contained within the track and respond to taps/clicks.
3. Analyze a permitted media URL, verify preview, select an API-supported resolution, submit download, and confirm the saved filename and actual output quality.
4. Check metric cards don't change simultaneously and use real stem/preset names. Test the workflow demo pause/play and actual editor links.
5. Verify sticky navbar, Features page, mobile install instructions, and PWA install flow on a real device.
6. Check sitemap, canonical URLs and Google Search Console. Improved markup does not guarantee Google Search or AI-search ranking.

## Local development

```bash
npm ci
npm run typecheck
npm run build
```

**QA scope in this environment:** 70 TypeScript/TSX sources transpiled with zero syntax errors; CSS parsed; relative imports, manifest icons, and ZIP integrity checked. Full `npm ci`/Vite build was **not verified here** because a required npm tarball (`yallist@3.1.1`) was unavailable in the offline cache. Run the actual production build and real API/mobile acceptance checks on Vercel before treating this as production verified.
