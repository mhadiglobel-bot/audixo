# AUDIXO Studio V49

Frontend Vite/React/TypeScript application with Vercel serverless proxy for REST YTDL API.

## V49 — User music reel + uninterrupted live effects (October 2026)

- Integrated all **10 user-provided cropped MP3 recordings** into a single 160 kbps CBR audio reel, with timing metadata for individual-track selection and looping. This is a space-efficient **demonstration** audio asset, not full originals.
- Compact horizontally scrollable thumbnail track selector. Thumbnail images are AUDIXO-branded **generated placeholders based on each audio track's waveform**, NOT verified official YouTube thumbnails. Provide exact verified official video IDs or licensed artwork to replace these in a later revision.
- Click any song to start playback; clicking the same song restarts it **without effects** and restores the neutral values. No Reset / Clear button.
- Real-time Web Audio DSP for gain, bass, mids, treble, 8D/16D-style stereo orbit, delay, feedback, reverb, speed and tape-style pitch. React parameters update audio nodes without pausing/restarting. Compare Original vs Processed works as a live blend.
- 30 studio presets read directly from `soundPresets`; presets with unsupported advanced operations such as reverse playback are explicitly labeled as approximations (remaining supported controls still apply).
- A persistent AudioContext and HTMLAudioElement live **above the router**: navigation to content pages does not interrupt playback. Navigation to `/editor`, `/library`, and all `/tools/*` or `/tool/*` routes **pauses** user-selected demo audio.
- Volume, seek and play/pause on a compact floating player when a track is selected. Music is never autoplayed on landing; it begins on explicit song click. Optional UI success cues remain off by default.
- Homepage AUDIXO brand disc is larger and rotates clockwise. No changes to existing YTDL server or actual editor DSP/API contracts.
- MP3 clips and cover sprite are static local assets (`public/demo/`); the service worker intentionally does not cache the MP3 as an offline file.

**LEGAL/PUBLIC DEPLOYMENT:** These ten recordings were supplied by the user, but uploading/possessing MP3 files does NOT prove rights to publish, stream or redistribute them on a public website. Before deploying this release publicly, secure permission/license for the audio and any official YouTube artwork. For a rights-safe public launch, replace the demo reel with music you own or have explicit permission to embed. Third-party software notices remain below.

**Technical limitation:** `preservesPitch` support varies by browser, tape-style pitch changes can also change tempo, and full-editor operations such as reverse/time-stretch are not reproduced exactly in this lightweight playground.

**Production QA status:** A full npm/Vite build was NOT performed in this offline environment because npm cache lacks `yallist@3.1.1`; GitHub/Vercel CI must execute `npm ci && npm run build` and perform actual audio acceptance testing.

## V48 — Interactive Sonic Experience (October 2026)

- New opt-in ambient sound mode for the homepage with no auto-play; when you navigate to an editor, background music stops. Default sound mode OFF.
- Original synthesized audio demonstration in V48; replaced by the user-selected audio reel in V49.
- Sound Playground: live Echo, Reverb, Pitch and Slowed processing, Before/After crossfade, adjustable intensity and short-file upload for private comparison.
- Dynamic preset browser reads the existing `soundPresets` library; click any preset to audition a preview of its supported Web Audio parameters. Full editor remains authoritative for advanced effects.
- Responsive audio-reactive waveform and AUDIXO disc; real analysis only runs during demo playback. Reduced-motion settings respected.
- Rotating original AUDIXO logo and visualizer added to empty audio-upload states in Full Editor, Trim, Echo, Pitch, Slowed + Reverb, Spatial 8D/16D, Mashup and Vocal Extractor.
- Optional short interaction clicks and export-success chimes only when sound mode is manually switched ON; no sound is played on failed exports.
- Branded loader remains available for a first visit with a Skip intro control; repeat visits in the same tab session skip the 7-second wait.
- No new cloud API, streaming service, subscription, user login or new environment variable is required. V49 now includes user-supplied excerpts; public use requires appropriate music rights.
- Removed an unused duplicate old logo file to remain below 100 project files for GitHub web upload.

**Audio demo limitations:** This demo is synthesized and runs on your device. Pitch-lock, some motion/reverse preset modes and custom studio DSP may be approximated in the lightweight preview; export from the Full Editor for the full processing chain. No user-uploaded sound is transmitted by the playground.

**Acceptance:** Run `npm ci && npm run build`, test on a mobile/desktop browser with actual audio playback permissions and verify MP3/MP4 backend downloads before calling the release production-verified.

## Older V46 interface updates

- Native-input continuous MP3/MP4 quality sliders: one white thumb, moving neon fill, click/touch/keyboard support.
- Independent MP3/MP4 format controls with smoothly blended micro-switches.
- Homepage preview cards: horizontal values, 5+ second hold and burst, true shuffled previews of 30 editor presets and 60 sound-bank layers.
- Twelve distinct scene-specific motion loops for How It Works (import, trim, select, stems, pitch, speed, echo, motion, mashup, presets, library, export), without pause toggle.
- Richer animated Features cards and simplified converter copy.
- PWA cache version v48, to refresh older frontend assets.

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


## V47 release notes and acceptance checks

This is the **V47 source release**, not a claim of completed browser acceptance testing. The core audio engine, YTDL API contract and existing editor workflows have been retained.

### UI changes
- Metric cards: eliminate overlapping blur/clip animations and add safe text padding; preserve all 30 editor presets / 60 generated sound-bank choices.
- How Audixo Moves: enlarge and vertically balance the right-hand scene board; retain all 12 functional scenes.
- Home hero: lightweight animated neon audio disc; the original official logo remains the center artwork.
- Tool headers: consistent primary names, shorter quote-style taglines, neon pink/purple/cyan typography.
- Tools menu: replace green button/icon treatments with official AUDIXO brand palette.
- Low-end devices: reduce pointer-bound effects on touch/pointer-coarse devices and support reduced-motion.

### Deploy with Vercel
- Framework: Vite. Root: `./`. Install: `npm ci`. Build: `npm run build`. Output: `dist`.
- Required `AUDIXO_YTDL_BASE_URL`: `https://ytdl.tiers.rest` (your backend service).
- `VITE_SITE_URL`: `https://audixo.vercel.app` (only if this is the actual production domain connected to this project).
- Optional `AUDIXO_YTDL_AUTH_TOKEN` only when backend Bearer-token verification is enabled. Never prefix a browser-exposed environment key with `VITE_` for a secret.
- After deploy verify `view-source:https://audixo.vercel.app` contains `audixo-release=v47.0`, or find `<meta name="audixo-release" content="v47.0">`. Clear stale service worker/browser cache if old version persists.

### SEO: verify indexing, don't assume it
- Verify **https://audixo.vercel.app/** as a URL-prefix property in [Google Search Console](https://search.google.com/search-console/about).
- Open `https://audixo.vercel.app/robots.txt` and `https://audixo.vercel.app/sitemap.xml` **after successful production build**. Sitemap is built by `scripts/seo-build.mjs`; submit the sitemap URL in the Search Console Sitemaps report.
- Use URL Inspection on `/`, `/tools/trim-audio`, `/tools/echo`, `/tools/pitch`, `/tools/vocals` and the other actual pages. Request indexing only after confirming HTTP 200, visible content and expected canonical tags.
- Ensure the `/audixo.vercel.app` host is connected to this Vercel project; changing `VITE_SITE_URL` alone does not connect the domain.
- Being listed in Google Search or AI answer engines cannot be guaranteed by tags/sitemaps. Build useful content, internal links, trustworthy contact and real discoverable page text.

### Release acceptance
1. Build `npm ci && npm run build` successfully on Vercel. Confirm no TypeScript build errors.
2. Check 320px, 375px, 768px and desktop viewports for truncation, horizontal scrolling and header overlap.
3. Leave homepage open for two card cycles. Verify values do not crop at the edges and the unit captions wrap neatly.
4. Scroll through the full 12-stage workflow and click each stage. The right-hand board should remain visible and aligned with the list.
5. Confirm accessible pointer/touch behavior, PWA install prompt/fallback and service-worker update.
6. Test a rights-cleared MP3/MP4 YouTube link and verify actual file qualities; the API may not support every requested resolution.



---

# Third-party components

Audixo Studio V49 uses the following third-party software through its package dependencies or optional browser/runtime integrations. Keep upstream notices and license obligations when distributing compiled builds.

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

The YouTube-to-MP3 API can call an operator-configured Cobalt-compatible HTTPS endpoint or discover compatible community instances. No third-party converter webpage, executable, FFmpeg binary, yt-dlp binary, AI weight file or downloaded media is bundled in this ZIP.

Only process media you are permitted to use. Source-media rights remain with their owners.


---

## AI-friendly project summary (previously llms.txt)

# AUDIXO — Online Audio Studio

Website: https://audixo.vercel.app/
Brand: AUDIXO, a creator-focused, free browser-based audio editor.

## Interactive Sound Playground
- Play an original synthesized AUDIXO demo after clicking Play; background audio never auto-plays.
- Hear real-time Echo, Reverb, Pitch and Slowed effects and compare original versus processed audio via a Before/After slider.
- Optionally preview your own short uploaded audio locally and browse the studio preset gallery.

## What AUDIXO does
- Trim, split, fade and mix audio in the browser.
- Use a full multitrack editor with independent echo, delay, reverb, pitch and stereo motion controls.
- Separate vocals, drums, bass and other source stems using a browser-based AI model; results vary by source audio.
- Download MP3 or MP4 content where the user has permission and the separate REST YTDL API supports the requested format.
- Save finished audio in an optional on-device local Library, not cloud backup.
- Install the web app on compatible Android or desktop browsers using PWA support; mobile audio performance depends on available memory.

## Official pages
- https://audixo.vercel.app/features
- https://audixo.vercel.app/how-it-works
- https://audixo.vercel.app/tools/trim-audio
- https://audixo.vercel.app/tools/echo
- https://audixo.vercel.app/tools/vocals
- https://audixo.vercel.app/tools/youtube-to-mp3
- https://audixo.vercel.app/faq
- https://audixo.vercel.app/help
- https://audixo.vercel.app/privacy
- https://audixo.vercel.app/terms
- https://audixo.vercel.app/copyright

## Accuracy notes
- MP3 encoding target is not evidence of the quality of the original recording.
- MP4 resolutions depend on a video's available formats and backend capabilities; advertised upper bounds are not universal guarantees.
- The official support email has not been configured yet.
- Browser-only processing and third-party conversion server workflows have different privacy implications; see Privacy Policy.
