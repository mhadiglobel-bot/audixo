# AUDIXO V59 · Browser-First Media Converter

Single GitHub repository, 99-file upload compatible. Based on the provided AUDIXO V58 package. **Other site pages, Open Studio, presets, vocal FX, editor and site visuals are preserved.**

## Architecture: before / after

| | Before (V58) | Now (V59) |
|---|---|---|
| Page | AUDIXO React/Vite | Same existing AUDIXO page and 3 steps |
| Analyze | Calls a separate authenticated worker | Lightweight `POST /api/media?action=meta` on Vercel, retrieving public YouTube metadata and checking browser-direct format access |
| MP3 | Requires a persistent Docker encoder | Bundled LAME encoder runs in a web worker on user's device, for *browser-accessible audio* or imported local media |
| MP4 | Requires a persistent Docker merger | Downloads only a verified, progressive MP4 source directly to browser; local MP4 is saved unchanged |
| Large media | Worker-host payload | Browser fetches permitted source directly; Vercel never proxies media bytes |
| Secrets/cookies | Worker tokens and optional private cookies | **No user cookies or worker secrets** |

## Important technical limit

**A normal website cannot universally download YouTube media in the browser.** YouTube's media servers frequently disallow cross-origin fetches or issue source URLs that only work in their own player/network context. Browser CORS protections cannot be changed from AUDIXO, a cookie file cannot fix CORS, and no worker/proxy/extension means certain (or most) YouTube downloads will remain unavailable. AUDIXO now reports this clearly rather than showing fake quality or promising a download. We intentionally do not bypass login, protected content, signatures or platform restrictions.

**What works without external infrastructure:**

1. Public YouTube metadata analysis (title, thumbnail, uploader, duration when genuinely reported) through YouTube's own public pages/oEmbed. Live source availability is not guaranteed.
2. Source quality discovery only when a native, progressive `video/mp4` URL actually exists and HEAD advertises browser CORS access. Even then, direct fetch can fail due to expiring/IP-bound URLs; the UI handles errors.
3. Browser-side MP3 encoding of imported local audio/video (where the browser can decode it), at **actual selected encoding targets 64, 128, 192, 256, or 320 kbps**. A higher target cannot improve source fidelity.
4. MP4 copy/export at the original local MP4 resolution; no invented 480p/720p/1080p upscaling. Browser-direct MP4 uses the native `showSaveFilePicker` streaming path when supported; memory-limited Blob fallback elsewhere.
5. Accurate progress where supported, cancellation, Unicode-friendly safe titles and clear unsupported-source errors.

## 1000 concurrent visitors

Vercel only performs lightweight metadata/format discovery. Metadata for one public ID is deduplicated in one function instance and cached ~35 seconds, without credentials. This **reduces** repeated work but is not a global cache; 1000 active visitors will still trigger Vercel requests and public YouTube rate limits. Browser conversion runs on the clients' devices. No guarantee of 1000 concurrent success is made without load testing and upstream permission.

## Deploy to GitHub + Vercel

1. Extract ZIP and upload the **contents**, not the ZIP, to the existing GitHub repository root (under 100 files). Do not upload `node_modules`, cookies or `.env`.
2. In Vercel, select the same repository root as the **Root Directory**. Framework Vite; install command `npm ci`, build command `npm run build`, output directory `dist`.
3. `api/media.ts` is the sole lightweight metadata function. It does not need any `AUDIXO_WORKER_*` variables, media host or cookie setup. Remove obsolete worker variables from Vercel settings only after confirming nothing else uses them.
4. Deploy as Preview first; inspect build logs, test desktop and Android, and then promote only a verified build. The included source does **not** automatically deploy or change your live production site.

## User acceptance tests

- Type invalid or local/private URL: immediate friendly refusal, no server fetch.
- Paste public YouTube URL: Analyze returns only source-derived details. No assumed resolution. On restricted sources, disabled Download with clear reason.
- Select local WAV/MP3/M4A: choose 64, 128, 192, 256, 320; convert to MP3 and verify file plays at requested kbps (where player reports it).
- Select local MP4: MP4 toggle shows only source's actual pixel height. Download original file unchanged; MP3 toggle encodes audio when browser decoder supports it.
- Direct source with CORS, when available: browser downloads data directly from origin, not via `/api/media`.
- Cancel during transfer or encode: operation stops and UI resets without fabricated completion.
- Check responsive layout, existing Audio Studio, PWA and other pages.

## Tests and QA

`npm run test:converter` runs deterministic metadata, validation, caching, format availability and no-heavy-proxy tests. `npm run build` runs the TypeScript typecheck, Vite and SEO generation. Full build needs project dependencies; do not claim deployment success without running build on Vercel and a real-browser smoke test.

### Changed files

- Replaced: `api/media.ts`, `src/pages/YouTubeConverter.tsx`, `src/services/media.ts`, `src/components/QualityRail.tsx`, `scripts/converter-tests.mjs`, `README.md`.
- Added: `src/services/browserMedia.ts`, `src/services/converter.worker.ts`.
- Scoped CSS appended: `src/styles/app.css`.
- Removed obsolete, unrelated-to-studio worker deployment: `media-worker/`, `render.yaml`.
- All other AUDIXO source assets remain byte-for-byte unchanged from V58.

No third-party conversion APIs, extra hosting, browser extensions, cloud payload queues, user cookie extraction, or permanent media server.
