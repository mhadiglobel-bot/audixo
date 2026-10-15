# AUDIXO Studio V49.1 - Deployment Hotfix

This is a focused patch to the supplied V49 project. The requested original
YouTube covers are NOT yet populated: the exact source uploads were not verified.
Existing AUDIXO placeholder covers remain until their real YouTube links are set.

## What failed and what changed

The SEO build renders pages through scripts/prerender.tsx, not through src/App.tsx.
V49 mounted SoundExperienceProvider in App, but not in this separate SEO tree.
Home includes SoundPlayground, whose useSound hook requires that provider.
This caused: "Error: AUDIXO sound provider missing" during the SEO build.

The corrected tree in scripts/prerender.tsx is:

    StaticRouter
      SoundExperienceProvider
        Routes
          Page

The sound provider stays inside the router because it uses useLocation.
The existing useSound error guard was retained; no fake fallback state was added.
Browser audio behavior and the existing converter API are preserved.

scripts/seo-build.mjs now reports the failing route if a prerender fails and
contains checks for a homepage render, one demo audio element, no initial
autoplay and all ten tracks. The same checks run on the normal build.

## Installation and deployment

Extract the ZIP and upload its CONTENTS at the repository root.
Do not upload the ZIP itself. Do not add an enclosing project folder.

- Framework: Vite
- Root directory: ./
- Install command: npm ci
- Build command: npm run build
- Output directory: dist

Existing environment variables are unchanged:

    AUDIXO_YTDL_BASE_URL=https://ytdl.tiers.rest
    VITE_SITE_URL=https://audixo.vercel.app

Use the actual domain assigned to the project for VITE_SITE_URL.
Keep any existing backend token secret and server-side:
AUDIXO_YTDL_AUTH_TOKEN must NOT use a VITE_ prefix.
No new environment variables are required for this hotfix or thumbnail lookup.

After dependency installation:

    npm run test:ssr
    npm run build

The first command renders all known pages, tool routes and blog routes using
real React server rendering. It does not create a dist release. The build
command also validates the homepage/provider relationship before generating SEO.
After deployment check meta[name="audixo-release"] for v49.1.
Service worker cache: audixo-shell-v49-1-provider-fix.

## Exact YouTube thumbnails - configuration ready, source links pending

Edit src/config/site.ts and fill demoYoutubeSources with the real YouTube links
for these ten tracks. Leave a value empty when its source is not verified.

| Track ID | Track |
| --- | --- |
| teu-perfume | Teu Perfume (Orch Mix) |
| te-conoci | Te Conoci - bxkq x PXLWYSE Remix |
| aura-farming | Aura Farming |
| montagem-ahora | NUEKI x QMIIR - Montagem Ahora |
| montagem-illuminal | Montagem Illuminal |
| montagem-royal | Montagem Royal (Slowed) |
| baila-lento | Baila Lento |
| tiki-tiki | Tiki Tiki |
| funk-sigilo | Funk Sigilo |
| funk-power | Funk Power |

The loader accepts watch, youtu.be, shorts, live and embed links, extracts a
validated video ID and displays that video's YouTube image in the existing
circular cover frame. It is NOT a YouTube title-search service. No API key is
required. A missing/failed thumbnail safely keeps the original placeholder.
All ten values are deliberately blank in this package. No original YouTube
cover is claimed to be included or verified. Links affect covers only, not
the supplied audio reel or track timing.

The MP3 files do not contain source video IDs or embedded cover art. Matching
only a title does not distinguish remixes, slowed uploads or repost thumbnails.
Use the exact intended source upload rather than an unrelated popular video.

## Scope preserved

- Ten supplied music excerpts and their reel offsets.
- Live Clip, Tone, Space, Echo, Motion and Style controls.
- Continuous playback across content-page navigation.
- Pausing demo audio on editor/tool routes.
- Audio effects, editor pages, YouTube converter API, branding and upload logos.
- Existing source package file count: 99.

## Verification status - read before publishing

PASSED locally: 74 TypeScript/TSX files parse and transpile without syntax
errors; CSS parsing; 32 source/unit checks; correct provider/router AST nesting;
20 YouTube URL-parser cases; local import resolution; version consistency.
These checks do NOT replace a real project TypeScript check or production build.

NOT RUN TO COMPLETION: real React SSR regression, full production build, live
browser audio and live backend downloads. This environment could not install
the dependency tree: npm offline cache lacks yallist@3.1.1, and the registry
hostname could not be resolved. A local build attempt stops at the missing ONNX
runtime asset because dependencies are absent. Vercel must complete npm ci,
then run the real build. No successful production build is claimed here.

After a successful Preview deployment, check:

1. Homepage and /features, /faq and /privacy render without the provider error.
2. Exactly ten song tiles render, and fresh page load does not autoplay sound.
3. Selecting each song plays the correct excerpt; repeat selection resets it.
4. Live effect changes do not restart playback.
5. Navigation between content pages keeps the player; editor routes pause it.
6. YouTube thumbnail links, once supplied, match the correct song/version.
7. Editor import/export and real MP3/MP4 downloads still work.
8. Mobile layouts and PWA refresh use the new deployment.

## Music and artwork

User-supplied excerpts are included. Confirm appropriate rights for public
streaming and artwork use before publishing the bundled media. Audio files and
thumbnails remain subject to their owners' rights; this patch grants no license.

# Third-party components

Audixo Studio V49.1 uses the following third-party software through its package dependencies or optional browser/runtime integrations. Keep upstream notices and license obligations when distributing compiled builds.

## Frontend and audio

- React 18.3.1 / React DOM 18.3.1
- React Router DOM 6.30.1
- Vite 5.4.21 and TypeScript 5.6.3 for build tooling
- `@breezystack/lamejs` 1.2.7 for browser MP3 work. Review the upstream LAME/LGPL-related distribution terms for compiled redistribution.

## Local source separation

- `demucs-web` 1.0.2
- ONNX Runtime Web 1.24.3
- HTDemucs ONNX model converted by timcsy

The model is downloaded on demand from a pinned Hugging Face revision and is not bundled in this ZIP:

https://huggingface.co/timcsy/demucs-web-onnx/resolve/92e33df61cfc9eb820272aaa62d2ef6dcf4d950d/htdemucs_embedded.onnx

Pinned model SHA-256 used by the worker:

`e5e425c17683f163a472462eb5f5a4ffcd11c31858d57fbd0833b012d8b88077`

Relevant upstream projects:

- https://github.com/timcsy/demucs-web
- https://github.com/microsoft/onnxruntime
- https://github.com/facebookresearch/demucs

## Fonts

AUDIXO requests Nunito and Nunito Sans from Google Fonts in `index.html`; font binaries are not bundled in this source package. The CSS includes system-font fallbacks if the remote font request is unavailable.

## Optional media conversion provider

The media converter uses the configured REST YTDL backend through api/media.ts. The project includes the ten user-supplied audio excerpts as one MP3 reel. No server-side FFmpeg executable, yt-dlp executable or AI model weight file is bundled. The conversion backend and its licensing are managed separately by the operator.

Only process media you are permitted to use. Source-media rights remain with their owners.
