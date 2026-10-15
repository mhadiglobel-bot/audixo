# AUDIXO Studio V50 - Converter and Sound Lab Hotfix

This package starts from the supplied V49.1 deployment hotfix and adds the
next requested round of changes for converter behavior, MP4 quality handling,
the sound-strip motion and homepage neon-card polish.

## Main changes in this package

### 1) MP4 / MP3 converter improvements
- MP4 now defaults to **1080p** (or the best configured available fallback),
  instead of always landing on a higher value like 1440p.
- Added **automatic MP4 fallback retries**. If the conversion API rejects the
  chosen resolution with an upstream error such as **HTTP 403 Forbidden**,
  the client automatically steps down through lower resolutions.
- The notice text is clearer when the remote conversion API is the real source
  of failure.
- MP3 behavior remains the same: 320 kbps server output target, with local
  re-encode for lower bitrates when supported.

### 2) Quality environment variables
New optional Vite variables are supported:

    VITE_AUDIXO_DEFAULT_MP4_QUALITY=1080
    VITE_AUDIXO_MP4_FALLBACKS=1080,720,480,360,240

These are **frontend build-time** variables. They control the initial MP4
selection and the fallback order used by the converter UI.

Backend variables are still required as before:

    AUDIXO_YTDL_BASE_URL=https://your-rest-ytdl-host.example
    AUDIXO_YTDL_AUTH_TOKEN=...
    AUDIXO_YTDL_AUTH_SCHEME=Bearer
    AUDIXO_YTDL_COOKIE=...   (if your YTDL service needs source cookies)
    VITE_SITE_URL=https://your-site.example

### 3) Sound strip behavior
- The ten-song strip in the live sound lab now **moves continuously**.
- It does **not pause on hover**.
- Track buttons remain clickable while the strip keeps running.

### 4) Homepage visuals
- Improved the moving outline around the record / logo zone.
- CTA / metric cards now use stronger neon outline motion with the requested
  neon pink, neon cyan, neon purple and neon green palette.

## Exact YouTube thumbnails
The code still supports exact original YouTube thumbnails through:

    src/config/site.ts

Fill `demoYoutubeSources` with the real upload URLs for the ten songs. This
package intentionally does **not** guess or fake unverified source links.
If you want every card to show the exact original thumbnail, provide the exact
YouTube links for those uploads and redeploy.

## Deployment
Upload the extracted project contents to your repository root.

- Framework: Vite
- Root directory: ./
- Install command: npm ci
- Build command: npm run build
- Output directory: dist

## Notes about the 403 error
If your converter still returns something like:

    ERROR unable to download video data HTTP Error 403 Forbidden

that usually means the **remote REST YTDL API** could not fetch the source
media from YouTube. The frontend now retries lower MP4 resolutions, but if the
upstream API itself is blocked, you still need to verify server-side auth,
cookies and source access on the YTDL service.

## Quick changed files
- `src/pages/YouTubeConverter.tsx`
- `src/components/QualityRail.tsx`
- `src/config/site.ts`
- `src/components/SoundExperience.tsx`
- `src/styles/ax40.css`

## Local verification done here
- TypeScript transpile syntax check passed for all edited TS/TSX files.
- A full production build was **not completed in this environment**.
- Real live download behavior still depends on your external REST YTDL API and
  its environment variables.
