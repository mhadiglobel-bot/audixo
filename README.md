# AUDIXO V51 - 13-track artwork and deployment repair

## Status

This is an updated source release, not a claim that the separate Python
conversion server has been repaired or that a full production build ran locally.
The V50 `20 !== 10` build assertion has been replaced by a catalog-aware check.
The 13 supplied audio clips and 13 supplied covers are included.

## The deployment failure

The scrolling song strip has a primary row and a hidden visual clone. V50 rendered
10 + 10 tiles but its SEO regression test expected 10 DOM tiles total.

V51 exports DEMO_TRACKS to the SEO renderer. The build asserts:
- one persistent audio element, without initial autoplay;
- every catalog ID once, in order, in the primary row;
- every catalog ID once, in order, in the visual clone;
- no duplicate catalog IDs, and no extra/missing tiles;
- the clone hidden from assistive technology and outside keyboard tab order.

For this release that means 13 unique tracks and 26 visual tiles, not 26 songs.
The test remains enabled. It is not disabled or replaced by a hard-coded 26.
The V49.1 SoundExperienceProvider fix is also retained in the SEO renderer.

## Included artwork and audio

New clips: VEKI VEKI, SIENTO CONMIGO (Slowed TikTok), MONTAGEM ALQUIMIA.
All ten earlier clips remain. The user's original crops were decoded and combined
once into a seekable 192-kbps stereo MP3 reel, with a small guard between clips.
The exact timing offsets and cover-cell mapping live in:

    src/components/SoundExperience.tsx -> DEMO_TRACKS

Artwork is the user's supplied material, not AI-generated replacements:

    public/demo/audixo-cover-sprite.webp
    public/demo/audixo-sample-reel.mp3

The atlas is 5 columns x 3 rows, with 360px square cells for crisp small circular
DPs. Supplied source images are approximately 453-666 pixels wide; they are NOT
native 4K. Enlarging them would not add missing detail. Landscape covers are
center-cropped for circular use. All supplied artwork labels are preserved;
Montagem Royal's supplied image says Super Slowed, while the audio filename says
Slowed. The audio itself has not been changed to match that label.

Local assets do not require YouTube thumbnail keys, title searches or hotlinks.
Audio and atlas URLs have V51 cache-busting identifiers.

## Converter changes

1. MP4 sends exactly the selected `quality` to the existing `/api/download` route.
   Automatic silent resolution fallback has been removed. The initial UI choice
   prefers 1080p when reported available; otherwise it selects an available size.
2. The proxy supports HEAD and byte-range requests. It rejects login pages, JSON
   responses, wrong media types and denied file endpoints instead of treating them
   as successful media downloads.
3. Before MP4 saving, browser-readable encoded file dimensions are inspected.
   A 240p file returned for a 1080p selection is rejected. Portrait/Shorts quality
   uses the shorter encoded edge. Unsupported codecs or uninspectable file URLs
   produce a verification error instead of a made-up quality success message.
4. Source-platform 403 errors, service authentication errors and file endpoint
   denial are distinguished. Repeated jobs at progressively lower resolutions
   are NOT used as a supposed fix for a source 403.
5. MP3 uses the documented `{url, format:"mp3"}` backend contract. Short clips up
   to five minutes and 24 MB are encoded on-device at 64/128/192/256/320 kbps.
   This replaces the previous 240 setting with the supported 256 choice.
   Long files rely on the backend encoder; missing bitrate evidence is disclosed.
6. Stop/Resume does not create new remote jobs. A terminal failed job does not
   loop indefinitely through progress polling. The same validation is used for
   Download again.

A quality selector is NOT a quality API. No new quality endpoint was supplied.
The browser still uses `/api/preview`, `/api/download`, the status route and file
route from the owner's existing REST YTDL service.

## Vercel environment variables

Required, server-only:

    AUDIXO_YTDL_BASE_URL=https://ytdl.tiers.rest

Recommended public site identity:

    VITE_SITE_URL=https://audixo.vercel.app

Optional UI initial selection (1080 is also the code default):

    VITE_AUDIXO_DEFAULT_MP4_QUALITY=1080

This last variable does not grant access or set the server's encoder. The old
VITE_AUDIXO_MP4_FALLBACKS is no longer read and may be removed.

Keep AUDIXO_YTDL_AUTH_TOKEN only if the service verifies that token. Keep its value
private, never with a VITE_ prefix. AUDIXO_YTDL_AUTH_SCHEME defaults to Bearer.
AUDIXO_YTDL_COOKIE, when already used, is only a Cookie header for the REST service.
It is NOT a YouTube cookie-file installer and is NOT a generic 403 fix. Do not paste
Google-account cookies into public variables or commit credentials to GitHub.

## Deployment

Extract the ZIP and replace the project contents at the repository ROOT:

    Framework: Vite
    Root: ./
    Install: npm ci
    Build: npm run build
    Output: dist

The current GitHub repository and Vercel project can be reused. Do not upload the
ZIP itself to the source root. No extra enclosing project folder is needed.
The archive has 99 files; node_modules, .build, dist and test captures are excluded.

Run these on a machine with the project dependencies installed:

    npm run test:tracks
    npm run typecheck
    npm run test:ssr
    npm run build

`test:tracks` itself needs only Node and exercises the actual production markup
validator with passing and intentionally broken 10/20 and 13/26 cases.
After deployment, HTML meta[name="audixo-release"] must equal v51.0.
Service worker cache: audixo-shell-v51-13-tracks.

## Remote backend boundary - important

The Python REST YTDL source and authenticated backend access were not supplied.
Its live `/download`, `/ytdl/status` and `/openapi.json` were not accessible from
the available tools. This ZIP cannot update its yt-dlp, ffmpeg, source-access
configuration or actual file encoder.

For an existing `unable to download video data: HTTP 403 Forbidden`, inspect the
Python worker log and source access. Check the installed yt-dlp release, supported
JS runtime/EJS setup, ffmpeg and ffprobe. Do not assume a Vercel variable or lower
resolution solves a remote 403.

For exact MP4 quality, the worker must choose a matching available format,
merge video/audio as needed, and fail clearly when that quality is unavailable.
It should inspect the finished file, not echo the requested quality as proof.
Useful completed-job fields:

    actual_width, actual_height, actual_audio_bitrate_kbps

An efficient MP4 should support metadata/byte-range reads. Large/long downloads
also require checking hosting streaming limits, ideally with a properly secured
file-delivery endpoint. The final server MP3 encoder must produce the intended
bitrate for long files that cannot be safely re-encoded in a browser.

Official references (checked during this repair):
- https://github.com/yt-dlp/yt-dlp
- https://github.com/yt-dlp/yt-dlp/issues/15012
- https://github.com/yt-dlp/yt-dlp/wiki/EJS
- https://vercel.com/docs/functions/limitations

## Verification actually completed

PASS: 10 catalog/clone regression cases using the production assertion function.
PASS: source-derived JSX structural fixture: 13 primary + 13 hidden clones.
PASS: 33 mocked HTTP / converter unit cases, including exact quality payloads,
      source vs service 403, HEAD/Range, wrong file types and terminal failures.
PASS: 13/13 original-to-reel audio correlation checks (minimum 0.99439).
PASS: native Chromium metadata checks for landscape/portrait 720p and rejection
      of a real 240p fixture presented as 1080p.
PASS: source-derived static layout at 320, 390, 768 and 1440px; no page overflow.
PASS: 73 TypeScript/TSX syntax-transpile checks and 3 CSS parser checks.

These fixtures do not replace real React SSR, a Vite build or live backend tests.
BLOCKED: npm ci, because npm registry DNS is unavailable and the offline cache
         lacks yallist@3.1.1. Full dependency-backed build/typecheck remain pending.
NOT VERIFIED: real external YouTube conversion, Vercel file streaming, browser MP3
              worker encoding with installed npm dependencies, physical mobile QA.

## Acceptance after a successful Preview build

- All 13 songs show the matching supplied cover and play the intended excerpt.
- Same-song selection resets effects; content-page navigation preserves playback.
- Entering an audio editor pauses demo music. No initial autoplay.
- CTA cards appear before the live sound lab; existing editor layouts remain.
- Check supported 720p/1080p outputs, including Shorts, using actual file dimensions.
- Unsupported resolution or a backend 403 must not silently produce a lower file.
- Check short MP3 outputs at each of the five listed bitrates.
- Verify prior editor playback/export and PWA behavior on real target devices.

The supplied music and artwork remain user-owned inputs for this task. Confirm
appropriate publication rights before serving them on a public production site.
