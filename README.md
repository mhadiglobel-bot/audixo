# AUDIXO Studio V55 - New YTDL REST API Integration

This is the complete V54 source with a converter-only adapter upgrade for the
YTDL API at https://ytdl.tiers.rest. AUDIXO's Studio, editor, effects, hero,
MP3 and MP4 quality sliders, music samples, 13 song covers, typography,
Turnstile, SEO, SSR, PWA and design assets were not redesigned or removed.

## Origin endpoints used

- `POST /api/preview` - YouTube metadata and `qualities` (or `available_qualities`)
- `POST /api/download` - `{url,format:'mp3'}` or `{url,format:'mp4',quality:'1080'}`
- `GET /api/download/status/:jobId` - `queued`, `processing`, `ready`, `failed`
- `GET /api/download/events/:jobId` - SSE progress, retry, merge, completion events
- `GET /api/download/file/:jobId` - ONE-TIME file delivery
- `GET /ytdl/status` - health/auth/concurrency

The origin also publishes `GET /api`, `/0auth` management, etc. Those are
origin-only routes and AUDIXO does not expose your backend admin secrets.

## Key fixes

1. **One-time delivery:** V54 made HEAD / Range / browser-metadata requests
   before the final GET, which could consume the server's one-time file.
   V55 never probes the origin media file. A `ready` job returns a download
   URL and the browser requests it exactly once through a streaming Vercel
   proxy. Range and HEAD requests are rejected at the proxy before origin.
2. **Live progress:** V55 proxies SSE at `/api/media?action=events&id=...`.
   The frontend prefers SSE and falls back to 45-second status polling if SSE
   is unavailable, reducing risk of the 20-requests-per-10-minute origin limit.
3. **Video quality:** The existing 240p-2160p visual rail stays unchanged.
   The slider starts at the highest backend-reported compatible resolution;
   above-maximum and unreported levels are locked. No quality is fabricated.
4. **MP3:** Default target stays 320 kbps, with actual local 64/128/192/256/
   320 kbps encoding for eligible short media. Long media gets the origin MP3
   without falsely claiming a bitrate that the origin has not reported.
5. **Job progress:** `stage`, `download.percent`, stream part, speed and ETA
   are displayed in the existing progress panel when reported by the origin.
6. **Resume:** In-progress jobs can resume. The server deletes completed files
   after delivery; therefore, downloading a second time starts a NEW job.

If the origin lacks `actual_height` / `output_height`, AUDIXO can verify the
requested MP4 quality choice but cannot independently guarantee the final
file dimensions without consuming the one-time file. It labels that case
clearly instead of falsely stating the output was verified.

## Vercel settings

    Framework Preset: Vite
    Root Directory: ./
    Node Version: 22.x
    Install Command: npm ci
    Build Command: npm run build
    Output Directory: dist

Minimum environment variables:

    AUDIXO_YTDL_BASE_URL=https://ytdl.tiers.rest
    VITE_SITE_URL=https://audixo.vercel.app

No separate "quality API" environment variable exists. Do NOT set
`AUDIXO_YTDL_BASE_URL` to `0.0.0.0:2052`; that's the private origin binding,
not a URL accessible to Vercel.

Optional origin authentication, only when required by your REST server:

    AUDIXO_YTDL_AUTH_TOKEN=<real-private-token>
    AUDIXO_YTDL_AUTH_SCHEME=Bearer

Optional Turnstile, only when BOTH keys are configured:

    VITE_AUDIXO_TURNSTILE_SITE_KEY=<real-public-site-key>
    AUDIXO_TURNSTILE_SECRET_KEY=<real-private-secret>

All private keys must stay server-side. Do not put credentials in `VITE_*`.

## Testing

    npm ci
    npm run typecheck
    npm run test:converter
    npm run test:tracks
    npm run test:ssr
    npm run build

This development environment could not resolve `registry.npmjs.org`, and
`npm ci` was blocked by the missing `yallist-3.1.1.tgz`. Consequently the full
production build and live YTDL conversion could not be completed here. The
converter mock suite, music-strip regression, source syntax checks, and
standalone strict adapter/media-service typecheck passed. Always deploy first
to a Vercel Preview environment and test a permitted YouTube URL.

If Cloudflare returns 520/522/524, or yt-dlp gets YouTube SOURCE_FORBIDDEN,
the upstream YTDL origin needs investigation. The Vercel adapter cannot repair
unavailable Python/yt-dlp/FFmpeg workers or expired /0auth cookies.
