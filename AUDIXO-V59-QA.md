# AUDIXO V59 — Release QA and limitations

## Scope
Targeted `/tools/youtube-to-mp3`. Preserved unrelated pages, existing Audio Studio, presets, Vocal FX, artwork and layout system from user-provided V58 archive.

## Checks completed in packaging environment

- Converter API/security/quality tests: **12/12 pass** (`npm run test:converter`).
- Existing homepage track-markup regression: **10/10 scenarios pass** (`npm run test:tracks`).
- Changed TypeScript sources: **0 errors in targeted TS semantic check**, using temporary TypeScript React/dependency type shims because full package installation was blocked. This is not equivalent to production typecheck.
- TypeScript/TSX syntax transpilation: **66 modules, 0 parsing errors**.
- Static layout QA in Chromium at widths **1280, 390 and 320 px**: no horizontal overflow; five MP3 bitrate options rendered.
- Original V58 source preserved outside scoped changes. ZIP contains no cookies, `.env`, `node_modules`, Docker worker or Render deployment.

## Not verified and must not be advertised as verified

- Full `npm ci` / `npm run build` / production Vite+SSR build: **not run successfully**. The packaging environment cannot resolve `registry.npmjs.org` and npm cache is incomplete. Run these in Vercel's build environment before production.
- Real YouTube access, video availability, source restrictions, CORS, signing or IP-bound URL behavior: **not validated against live YouTube**.
- Production-level test of 1000 simultaneous users: **not performed**.
- End-to-end native browser MP3 encoding and MP4 file-save, especially Android/PWA compatibility: **requires testing in a deployed HTTPS browser with real authorized files**. Program code was inspected and typechecked using shims, not real media fixtures.

## Correctness/security commitments

- `api/media.ts` never proxies full video/audio bytes to Vercel; Googlevideo access is HEAD-only for CORS metadata checks.
- User uploads/Google cookies are never sent to AUDIXO.
- Format choices are only from source-reported, browser-CORS-approved, progressive MP4 candidates; no fake resolutions.
- MP3 bitrate options map directly to local LAME encoder parameters; a higher bitrate does not improve poor input quality.
- Unsupported sources remain unavailable with a clear reason; this architecture **does not bypass YouTube CORS** and is not a universal YouTube downloader.
- Portable browser media conversion has duration/memory limits to prevent freezing low-memory devices.

## Required deployment smoke tests

1. Deploy preview from `main` and inspect `npm ci` + `npm run build` logs.
2. Verify `/tools/youtube-to-mp3` loads in Chrome/Edge/Brave and Android Chrome.
3. Select each bitrate using keyboard, touch and buttons; verify 64/128/192/256/320 are actually encoded with a local audio clip.
4. Local MP4: verify source resolution only is offered and file is saved unchanged.
5. YouTube public video: analyze title / author and confirm graceful unavailable state if source restricts browser fetch.
6. Reject local network URLs and malformed YouTube links.
7. Test cancellation, incompatible codecs, long clips, no memory, offline/network errors.
8. Confirm no other AUDIXO pages changed and PWA cache refresh works.
9. Only then promote preview to production; keep rollback available.
