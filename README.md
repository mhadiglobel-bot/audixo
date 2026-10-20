# AUDIXO Studio V53 — Strict MP4 Discovery & Converter Reliability Patch

This is a focused converter patch against the user's V52 source. UI, editors,
13 music tracks and supplied covers, Turnstile, Resume, title preservation,
progress, animation, SEO and PWA remain present. No YTDL backend source code
was supplied, so **the external origin server has not been modified**.

## Fixed in the uploaded AUDIXO project

1. The MP4 rail derives selectable choices only from the normalized server
   preview qualities, not a seven-item hard-coded list. Empty preview →
   no quality selected and MP4 download disabled. Highest confirmed quality
   is selected by default. MP3 is unaffected when no MP4 formats exist.
2. The Vercel adapter accepts only explicitly `downloadable: true` MP4 video
   entries with valid width/height, video evidence and MP4 output container.
   It rejects generic raw formats, audio-only entries, unavailable items,
   DRM, missing dimensions, and bare numeric quality lists. A DASH video-only
   stream with `acodec: none` is accepted only if the backend explicitly
   affirms that a downloadable MP4 can be produced (including audio muxing).
3. `POST /api/media?action=convert` re-requests `/api/preview` and returns
   HTTP 422 `QUALITY_UNAVAILABLE` before creating a job if exact selected
   resolution is not confirmed. No silent quality downgrade.
4. Upstream structured error codes remain intact. Status error codes,
   permanent Resume job cleanup, trusted output dimensions (with browser
   fallback), and honest MP3 bitrate reporting are retained/improved.
5. Upstream media file is probed by HEAD or one-byte Range GET before
   completion; an output marked `done` is not treated as finished until a
   nonempty readable media file exists. Browser download endpoint preserves
   byte-range responses and streams rather than buffering MP4 files.
6. Incompatible MIME types, disguised HTML/JSON and invalid output file
   signatures are blocked before starting a download.
7. `npm run test:converter` now runs mocked adapter/client/UI contract tests.

## Required YTDL backend change (source not provided)

The upstream `POST /api/preview` must be authoritative and return the actual
MP4 formats that your own yt-dlp + FFmpeg backend can download and produce.
Example:

```json
{
  "ok": true,
  "data": {
    "title": "Example authorized video",
    "author": "Creator",
    "duration": 123,
    "available_qualities": [
      {"quality":"360","width":640,"height":360,"format_id":"18","container":"mp4","downloadable":true},
      {"quality":"1080","width":1920,"height":1080,"format_id":"137","container":"mp4","downloadable":true,"vcodec":"avc1","acodec":"none","audio_downloadable":true}
    ]
  }
}
```

The backend must implement this contract itself. AUDIXO deliberately ignores
unverified, historical preview payloads such as `qualities: ["720","1080"]`,
`resolutions` and raw `formats` because these are **not proof of downloadability**.
If your current backend still responds with unverified lists, MP4 quality
selection will be EMPTY rather than misleading users. Update the YTDL server
and deploy it before expecting MP4 choices to appear.

Backend yt-dlp/FFmpeg requirements:

- Discover video + compatible audio streams with current yt-dlp metadata.
- Check each desired exact height and that the video stream is usable.
- Check a usable audio stream is present even if the video stream is video-only
  (`acodec=none` on DASH video is normal).
- Check actual muxing/transcoding support with FFmpeg and MP4 output. Only
  advertise `downloadable:true` when the pipeline supports that stream pair.
- Re-discover/revalidate on `POST /api/download`, then choose exact video
  stream + audio. Never change to another resolution silently.
- If unavailable, return HTTP 422 JSON `{"code":"QUALITY_UNAVAILABLE",
  "error":"1080p is not available for this video.",
  "available_qualities":["360","720"]}` before starting a job.
- Run jobs in isolated job-ID directories; report `complete` only after FFmpeg
  exits successfully, ffprobe verifies actual dimensions and the final nonzero
  media file exists. Use status `failed` on yt-dlp/FFmpeg errors.
- Preserve `/0auth`, validate the session/cookie health without logging any
  cookie or token content; do not expose credentials to the browser.
- Use current stable yt-dlp and a correctly installed compatible JavaScript
  challenge runtime, and diagnose expired cookies / `SOURCE_FORBIDDEN` separately
  from quality selection. Authentication problems cannot be fixed by UI code.
- `0.0.0.0:2052` is the backend listener/bind address; the Cloudflare-facing
  public service must still be reachable and healthy at `https://ytdl.tiers.rest`.
- Ensure HEAD and Range on `/api/download/file/:jobId` work and return correct
  `Content-Length`, `Content-Range`, `Accept-Ranges`, and media MIME type.

## Environment variables

Vercel → Settings → Environment Variables:

```
AUDIXO_YTDL_BASE_URL=https://ytdl.tiers.rest
VITE_SITE_URL=https://audixo.vercel.app
```

Optional private Vercel server-only variables, **only when supported by the
external origin**:

```
AUDIXO_YTDL_AUTH_TOKEN=YOUR_PRIVATE_TOKEN
AUDIXO_YTDL_AUTH_SCHEME=Bearer
AUDIXO_YTDL_COOKIE=YOUR_PRIVATE_SERVER_COOKIE_IF_NEEDED
AUDIXO_TURNSTILE_SECRET_KEY=YOUR_PRIVATE_TURNSTILE_SECRET
```

Optional browser-public Turnstile setting:

```
VITE_AUDIXO_TURNSTILE_SITE_KEY=YOUR_PUBLIC_TURNSTILE_SITE_KEY
```

Only configure BOTH Turnstile keys if you enable Turnstile. Never use `VITE_`
for server tokens/cookies/secrets. `VITE_AUDIXO_DEFAULT_MP4_QUALITY` no longer
controls the MP4 rail: the preview result is the sole source of choices.

## Build & test

```
npm ci
npm run typecheck
npm run test:converter
npm run test:tracks
npm run test:ssr
npm run build
```

Vercel settings: Framework **Vite**, Install **npm ci**, Build **npm run build**,
Output **dist**, root `/`. Keep the existing GitHub repo/project.

## Local execution in this assistant environment

- `npm ci --offline`: failed (`yallist@3.1.1` not cached).
- `npm ci` using network: failed (npm installation incomplete).
- `npm run typecheck`: blocked by the incomplete dependencies, e.g.
  missing `@types/react`, `@types/node`; this does NOT mean the edited code
  received a successful full-project typecheck.
- An independent strict targeted typecheck for `api/media.ts` and
  `QualityRail.tsx` passed with temporary ambient module shims.
- An independent targeted client-service typecheck passed with temporary shims.
- `npm run test:converter`: mocked API/client/quality UI tests passed using
  the system-installed TypeScript compiler. These tests do not call YouTube.
- Full production Vite build and live YTDL origin tests were unavailable here.

## Changed paths

- `api/media.ts`
- `src/services/media.ts`
- `src/pages/YouTubeConverter.tsx`
- `src/components/QualityRail.tsx`
- `src/config/site.ts`
- `src/styles/ax40.css` (one narrow single-quality rail rule)
- `scripts/converter-tests.mjs` (new)
- `scripts/seo-build.mjs` (remove stale static quality default)
- `package.json`, `package-lock.json`
- `index.html`, `public/sw.js` (release/cache version)
- `README.md`

All music content, artwork, editors and unrelated UI components remain unchanged.
