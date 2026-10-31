# AUDIXO V60 — Studio Audio & Homepage UI Repair

**GitHub/Vercel deployment package | 94 files | Based on the user's V59 source.**

This patch fixes the TypeScript build blocker visible in the supplied Vercel screenshot and improves *existing* Open Studio FX, the homepage Live Sound Lab, phonk carousel usability and the four homepage metrics/CTA cards. It does **not** redesign the website, replace the V59 browser-first downloader, or add any hosted media worker.

## 1. Build blocker fixed

V59 removed `localMetadata` from `src/services/media.ts`, but three existing screens still imported it:

- `src/editor/AudioStudio.tsx`
- `src/pages/Vocals.tsx`
- `src/quick/QuickAudioWorkbench.tsx`

V60 restores `export function localMetadata(file: File): Promise<number>` using a temporary local object URL, an HTML audio element, a 15-second timeout and cleanup. No audio is uploaded to a server. A new regression test checks **all local TypeScript imports against their actual exports**, so the same missing-export mistake is easier to catch before the next deploy.

## 2. Studio sound changes

The original timeline, fades, speed, pan, 8D/16D motion, per-clip FX, undo/edit history and export code remain intact.

- **Lo-fi warmth**: low-pass color, without adding crackle, artificial vinyl noise or tabla-like sounds.
- **Metallic ring reduction**: adjustable frequency (1.8–9 kHz) and up to -15 dB cut via a peaking filter. It suppresses a frequency band, not an individual sound source.
- **Transient softening**: fast attack compressor to reduce harsh percussive peaks, not a selective drum remover.
- **Vocal warmth and harshness**: existing EQ improvements retained.
- **Reverb**: continued spacious non-rhythmic room sound, separate from delay repeats.
- **Phrase-end Smart Echo**: existing Studio pause detection retained, with adjustable pause threshold, tap count, delay and decay.
- **Four additional presets**, for **34** total: Cave Whisper, Clean Lo-fi, Metallic Softener, Deep Drum Bass.

### Voice vs. drums/instruments — accurate separation

In **Open Studio**, select a decoded clip and use **Stem & percussion control**:

1. **AI stem split** runs the existing `demucs-web` model *locally in the browser* where supported. Initial model download is large (approximately 172 MB); performance and success depend on device memory, GPU/WASM support and network.
2. **Fast preview** is a local frequency-based approximation. It is *not* real drum/instrument isolation.
3. Generated `Lyrics / Vocals`, `Drums`, `Bass`, and `Other instruments` tracks have separate **mute/playing** buttons. The original is muted, not erased. A separate full `Music` stem is initially muted because it overlaps the other instrumental stems; this avoids doubling the sound.

**Limits:** This workflow supports selected source clips up to five minutes (two minutes on mobile), and requires a selected source starting near time zero for precise timing. True removal of a specific cymbal, tabla, or steel strike from a fully mixed song is not guaranteed. Use AI stems and adjust `Other instruments`/`Drums` to audition what is separable.

## 3. Homepage changes

- Four homepage metric/action cards are **compact**, with 2×2 layout on tablets/phones, without changing their navigation links or global styles.
- Phonk/song strip **stops its automatic scrolling on hover**, and resumes after mouse leaves. Mouse, touch and pointer **grab/drag** can browse songs immediately; drags suppress accidental song-clicks. Keyboard arrows can scroll when the strip has focus.
- **Live Sound Lab** adds the Studio Tone/Polish controls, including Lo-fi, ring cut, transient softening, smooth room size/tone, and Echo `Continuous` vs `Smart pauses` (with adjustable threshold and finite repeat taps).
- Live Smart Pause uses **audio-energy gaps**, not lyric transcription; dense backing music can prevent reliable phrase detection. Full Studio works on the imported source waveform with more detailed phrase detection.

## 4. Existing downloader architecture retained

V59's browser-first MP3/MP4 tool remains as it was: Vercel handles only lightweight metadata; browser-side download/encode is limited by source access and CORS. V60 does **not** reintroduce Docker, Render, external download APIs, a media proxy or secrets. **A browser-only website still cannot guarantee YouTube downloads** when a source blocks cross-origin access; such requests must fail safely and accurately.

## 5. Install, QA and deployment

Use **Node.js 20+** with registry access:

```bash
npm ci
npm run test:tracks
npm run build
```

`npm run build` includes ONNX runtime asset preparation, `tsc --noEmit`, Vite output and SEO page generation. For Vercel:

1. Extract the ZIP and upload its **contents** into your current GitHub repository root (not the ZIP itself).
2. Preserve project root in Vercel; framework **Vite**; install `npm ci`; build `npm run build`; output `dist`.
3. **Preview deploy first**. Confirm TypeScript output no longer reports `localMetadata` TS2305 errors.
4. Test Studio import/play, FX on/off and WAV/MP3 export; test AI/Fast stems separately; test hover/drag and CTA layout on desktop + mobile.
5. Only promote/redeploy production after preview validation.

No `.env`, Google/YouTube cookies, user session data or credentials are bundled.

## 6. Validation completed here

- **9/9 Studio automated checks passed** (syntax, missing export, local-import compatibility, presets, WebAudio mock graph, stems, carousel, CTA, live controls).
- **12/12 converter regression tests passed.**
- **Real headless Chromium WebAudio offline rendering**: a 4.5-kHz generated test tone was reduced by approximately **15 dB** with metallic cut 100%.
- **CSS-only Chromium layout fixture**: 1280, 760, 390, 320px, with no horizontal overflow and compact cards.
- **Full `npm ci` + production `npm run build`: NOT VERIFIED in this container**, because the npm registry package tarballs were unavailable locally (`ENOTCACHED` in offline mode and prior DNS failures). No real full-site browser E2E/audio audition or live Vercel preview was performed. These are release gates, not assumed passes.

See `AUDIXO-V60-QA.md` for the changed-file list and final acceptance checklist.

## AUDIXO V61 — Glass Crate Sound Lab (production-source package)

This source release preserves the V60 Open Studio, presets, DSP voice effects,
existing navigation, and the YouTube MP3/MP4 browser-first page. It only updates
the homepage Live Sound Lab and its audio/thumbnail assets.

- Includes six uploaded phonk tracks alongside the original thirteen.
- Uses one optimized MP3 reel for the new six tracks, with 180 ms inter-track
  spacing; the original demonstration reel remains unchanged.
- Uses six individually named WebP thumbnails for the new tracks, ensuring
  each title gets its matching image without sprite-position mixups.
- Replaces the continuously moving song strip with one glass-effect card bin;
  compact track cards can be reordered by desktop drag-and-drop, clicked to
  play, and arrive with a lightweight drop-in entrance animation.
- Retains full live effects, including Smart Pause echo, Vocal Aura/Reverb,
  Lo-fi and metallic-harshness controls, and the 34 Studio presets.
- No Docker or Render service was introduced. The original browser-first
  MP3/MP4 limitations still apply. This package does **not** guarantee
  universal YouTube video downloading.

`npm run test:tracks` validates the glass-bin track markup; the omitted
standalone V60/V61 test scripts are not advertised as runnable.

The new phonk preview audio is encoded as 160 kbps MP3 to keep the static
asset practical for website usage; the six original audio files were supplied
by the user and not included separately in the GitHub ZIP. Ensure publication
rights for tracks and cover art before public release.


## V62.1 — Vercel prerender / SSR build repair

The reported `deepStrictEqual` failure came from `scripts/seo-build.mjs`
still requiring the removed two-lane animated marquee. This release checks
**one draggable card per track in the glass bin**, instead. The real
production prerender still runs the same assertion; it was not disabled.
The HTML now exposes stable `data-demo-bin` / `data-demo-track-id` markers.
Also fixed a drag-end callback that could access `event.currentTarget`
after React had cleared it. The rest of the design, 19-track catalog,
cover mappings, audio and Open Studio code are unchanged.

Run `npm ci`, `npm run test:tracks`, then `npm run build` in an environment
with npm registry access. The full build could not be executed in the
authoring environment because registry DNS resolution was unavailable.
