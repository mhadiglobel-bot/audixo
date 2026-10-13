# AUDIXO Studio V48

Frontend Vite/React/TypeScript application with Vercel serverless proxy for REST YTDL API.

## V48 — Interactive Sonic Experience (October 2026)

- New opt-in ambient sound mode for the homepage with no auto-play; when you navigate to an editor, background music stops. Default sound mode OFF.
- Original synthesized audio demonstration, built in Web Audio API and played locally after pressing Play.
- Sound Playground: live Echo, Reverb, Pitch and Slowed processing, Before/After crossfade, adjustable intensity and short-file upload for private comparison.
- Dynamic preset browser reads the existing `soundPresets` library; click any preset to audition a preview of its supported Web Audio parameters. Full editor remains authoritative for advanced effects.
- Responsive audio-reactive waveform and AUDIXO disc; real analysis only runs during demo playback. Reduced-motion settings respected.
- Rotating original AUDIXO logo and visualizer added to empty audio-upload states in Full Editor, Trim, Echo, Pitch, Slowed + Reverb, Spatial 8D/16D, Mashup and Vocal Extractor.
- Optional short interaction clicks and export-success chimes only when sound mode is manually switched ON; no sound is played on failed exports.
- Branded loader remains available for a first visit with a Skip intro control; repeat visits in the same tab session skip the 7-second wait.
- No new cloud API, streaming service, subscription, user login, copyrighted background recording or new environment variable is required.
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

