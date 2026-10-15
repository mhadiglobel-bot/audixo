# AUDIXO Studio V52 — Converter API + Cinematic UI Patch

This source release preserves the V51 project, 13 bundled phonk/funk excerpts, artwork, editor tooling, vocal separation and Studio, while refining the converter and home UI.

## Direct Vercel settings

Repository root contains `package.json`, `src/`, `api/`, and `public/`.

- Framework: **Vite**
- Root Directory: **./**
- Install Command: **npm ci**
- Build Command: **npm run build**
- Output Directory: **dist**
- Node.js: >=20

Required environment values (put each as a separate Vercel variable):

```
AUDIXO_YTDL_BASE_URL=https://ytdl.tiers.rest
VITE_SITE_URL=https://audixo.vercel.app
```

`VITE_SITE_URL` must be your **actual** production domain, if it differs. The original custom backend may be behind Cloudflare. If that origin returns 520/522/524/403, the new Vercel project **cannot** repair it. Fix upstream API availability and source-access rules first.

### Optional service authentication

Set **only** if your backend expects them, and never use a `VITE_` prefix for secrets:

```
AUDIXO_YTDL_AUTH_TOKEN=<backend-issued-private-token>
AUDIXO_YTDL_AUTH_SCHEME=Bearer
```

`AUDIXO_YTDL_COOKIE` forwards one HTTP Cookie header to the REST service. It is not a YouTube cookies-file loader and should not be assumed to solve YouTube 403s. Never expose or commit session cookies.

### Optional REAL human verification

The previous long permission checkbox is removed. The interface does **not** pretend that a frontend-only checkbox is a bot check. To enable actual Cloudflare Turnstile, register the site in Cloudflare and add **both**:

```
VITE_AUDIXO_TURNSTILE_SITE_KEY=<public-site-key>
AUDIXO_TURNSTILE_SECRET_KEY=<private-secret-key>
```

With neither variable set, no bot-verification control is shown and the converter is usable without one. If only one is set, correct the configuration: the backend will reject invalid/incomplete verification.

### MP4 quality

The UI supports **240p / 360p / 480p / 720p / 1080p / 1440p / 2160p**. After analyzing a video the default is the **highest resolution actually reported by** `/api/preview`. It is not locked at 1080p. The chosen quality is passed exactly to the backend's documented `/api/download` request:

```
POST /api/download
{"url":"https://www.youtube.com/watch?v=...","format":"mp4","quality":"2160"}
```

If no quality metadata is provided by the API, the provisional initial selection is 720p; this is a **request**, not a guarantee. Optional `VITE_AUDIXO_DEFAULT_MP4_QUALITY` can change the fallback selection but does **not** affect the server encoder, supported quality list, or 403 access errors.

### MP3 quality

Documented explicit and legacy forms are supported. The adapter sends `{ "url": "...", "format": "mp3" }` by default and retries `{ "url": "..." }` **only when the backend explicitly rejects the additional field** as a 400/422 schema issue. Short files under the on-device limits can be encoded locally as 64/128/192/256/320 kbps; long files need the backend's actual encoding support. Re-encoding cannot restore quality missing from a low-quality original.

### Diagnostic code meanings

- `ORIGIN_UNAVAILABLE`: conversion API/Cloudflare origin is failing or unavailable. **Fix backend service.**
- `SOURCE_FORBIDDEN`: the source platform refused the backend a media stream (YouTube 403). **Fix backend yt-dlp / service access.**
- `SERVICE_AUTH`: API rejected the service token or login.
- `QUALITY_UNAVAILABLE`: requested quality is not reported by the source.
- `WRONG_FILE_TYPE` / `FILE_FORBIDDEN`: wrong response or inaccessible backend file endpoint.

### UI changes

- Big, continuously clockwise-rotating original AUDIXO symbol as the hero disc, with no ornamental rings; compact waveform below.
- Moving music strip is a gradient/glass shadow surface, not a clipping outline; tiles remain clickable, all 13 songs and supplied DP artwork preserved.
- More space after the four metrics cards; no pill-outline artifacts on their links.
- Short first-visit intro with no Skip button. Loader percentage drives the track instead of a seven-second CSS timer.
- The long download-permission checkbox is removed, replaced with a small lawful-use note and optional real Turnstile.

## Tests and limitations

Source syntax, import and CSS checks; 10/20 and 13/26 strip regression; and mocked REST YTDL contract tests passed in the creation environment. Full `npm ci && npm run build` could not complete because the runtime lacks `yallist@3.1.1` in its npm cache and the registry was inaccessible. Full live YouTube MP3/MP4 downloads were not validated. Treat this as a **release candidate** until Vercel Preview build and live backend tests pass.

The 13 supplied music clips/artwork are included unchanged. Rights to distribute them on a public website are **not** guaranteed; obtain permission from the relevant rights holders before publishing.
