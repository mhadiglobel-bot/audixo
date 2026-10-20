# AUDIXO Studio V54 — MP4 Quality Rail and Legacy Preview Compatibility

This release is a targeted follow-up to the V53 converter. It DOES NOT replace
or redesign AUDIXO: home page, Studio, editing tools, PWA, SEO, music tracks,
13 supplied covers, Turnstile, Resume, source title handling and animations
stay unchanged. The Vercel adapter and existing YTDL origin remain separate.

## Fixed

- Restored the complete **240p / 360p / 480p / 720p / 1080p / 1440p / 2160p**
  visual rail with the existing neon thumb and gradient. On analysis the thumb
  starts at the highest quality *reported as downloadable by the YTDL preview*.
  Qualities above that maximum are locked. Users may move downward among the
  actual qualities the server reported; unreported qualities inside the range
  are also disabled rather than falsely promising unsupported transcoding.
  If no quality is reported the rail stays visible but unavailable and MP4
  download is disabled; MP3 is independent.
- Fixed the real V53 regression that incorrectly discarded the documented
  older API preview response `qualities: ["360", "720", "1080"]` or
  `qualities: [{"value":"720","label":"720p"}]`. The adapter now accepts
  these explicit quality lists as declarations from /api/preview while still
  rejecting raw extractor `formats`, DRM/audio-only entries, malformed data,
  and explicit `downloadable:false` values. New structured `available_qualities`
  takes precedence and remains strictly checked.
- Fresh upstream preview validation remains required on **every MP4 convert**;
  the API still receives the user's selected exact quality unchanged.
  The adapter will not silently downgrade 1080p to 720p or invent a resolution.
- For older YTDL file servers whose `HEAD /api/download/file/:id` incorrectly
  returns 403/404 while `GET` works, status verification and the Vercel file
  endpoint now try a tiny GET with Range. This can unblock completed MP3/MP4
  jobs that V53 left on "Finalizing output file...". It does not invent an
  output when GET also fails or returns an incompatible MIME type.
- Clearer download button label when analyzed video has no available MP4.
- More automated preview/slider/API/file-probe regression tests.

## Critical YTDL backend requirements (not included in the uploaded frontend ZIP)

`https://ytdl.tiers.rest` must actually respond to:

- `GET /ytdl/status`
- `POST /api/preview` with `{ "url": "https://www.youtube.com/watch?v=..." }`
- `POST /api/download` with `{ "url": "...", "format":"mp3" }` or
  `{ "url": "...", "format":"mp4", "quality":"1080" }`
- `GET /api/download/status/:id` and `GET /api/download/file/:id`

`/api/preview` must report the real downloadable qualities for the URL. V54
accepts either modern `available_qualities` objects or the earlier `qualities`
array contract. The origin must do the yt-dlp+FFmpeg discovery and exact output
encoding. An explicit `supports_downscaling:true` feature must be implemented
on the backend before lower missing qualities can truthfully be promised; V54
does not fabricate support for missing resolutions.

A Cloudflare 520/522/524, a YouTube 403/source challenge, a failed yt-dlp job,
missing files, or a broken `/api/download/file/:id` cannot be repaired by
changing only the React slider or a Vercel environment variable. Debug the
YTDL origin (worker, FFmpeg, yt-dlp, JS challenge runtime, `/0auth` cookies and
job storage) and do not expose secrets to the browser.

## Vercel — copy/paste

Required environment variables:

```
AUDIXO_YTDL_BASE_URL=https://ytdl.tiers.rest
VITE_SITE_URL=https://audixo.vercel.app
```

Optional `AUDIXO_YTDL_AUTH_TOKEN`, `AUDIXO_YTDL_AUTH_SCHEME` and
`AUDIXO_YTDL_COOKIE` only if the origin requires them. If Turnstile is used,
configure BOTH `VITE_AUDIXO_TURNSTILE_SITE_KEY` and the server-side
`AUDIXO_TURNSTILE_SECRET_KEY`. Never place a private secret under `VITE_`.

- Framework: Vite
- Root: `./`
- Node.js: 22.x
- Install: `npm ci`
- Build: `npm run build`
- Output: `dist`

Local verification commands:

```
npm ci
npm run typecheck
npm run test:converter
npm run test:tracks
npm run test:ssr
npm run build
```

## Validation in this environment

- Mocked converter tests: 34 of 34 passed.
- TS/TSX syntax, CSS parser, import-path and ZIP integrity were checked.
- Full `npm ci` was unable to complete (npm registry was inaccessible and
  required cached packages were missing). Therefore the project-wide TypeScript
  build and full Vite output are NOT claimed to have passed here.
- The external `ytdl.tiers.rest` DNS lookup also failed in this environment,
  so live source download, yt-dlp/FFmpeg output and `/0auth` were NOT verified.

## Changed paths compared to V53

- `api/media.ts`
- `src/components/QualityRail.tsx`
- `src/pages/YouTubeConverter.tsx`
- `src/styles/ax40.css`
- `scripts/converter-tests.mjs`
- `README.md`
- `index.html`, `public/sw.js`, `package.json`, `package-lock.json` (version)
