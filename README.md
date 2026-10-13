# AUDIXO Studio V46

Frontend Vite/React/TypeScript application with Vercel serverless proxy for REST YTDL API.

## V46 interface updates

- Native-input continuous MP3/MP4 quality sliders: one white thumb, moving neon fill, click/touch/keyboard support.
- Independent MP3/MP4 format controls with smoothly blended micro-switches.
- Homepage preview cards: horizontal values, 5+ second hold and burst, true shuffled previews of 30 editor presets and 60 sound-bank layers.
- Twelve distinct scene-specific motion loops for How It Works (import, trim, select, stems, pitch, speed, echo, motion, mashup, presets, library, export), without pause toggle.
- Richer animated Features cards and simplified converter copy.
- PWA cache version v46, to refresh older frontend assets.

## Setup

```bash
npm ci
npm run build
```

Vercel framework Vite; root `./`, output `dist`, install command `npm ci`, build command `npm run build`.

Required server variable: `AUDIXO_YTDL_BASE_URL=https://ytdl.tiers.rest`.

Recommended site variable: `VITE_SITE_URL=https://audixo.vercel.app` (only if domain belongs to this project).

Optional secret: `AUDIXO_YTDL_AUTH_TOKEN` only if the backend verifies a token. Do not commit tokens to Git.

MP3 output is requested at a 320 kbps encoding target by default. Lower bitrates can be re-encoded on-device for short eligible files; encoding cannot restore source detail. MP4 resolution requests can fail if not supported by the source and API.

## Verification

Source syntax and CSS validation were performed. The full production build requires `npm ci`; this environment could not reach npm registry and its offline cache lacked `yallist@3.1.1`. After deployment, run real API download, responsive, installability and audio-editor regression tests before considering V46 production-verified.
