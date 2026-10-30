# AUDIXO V60 — Regression / Deployment QA

## Status

**Source package prepared, not declared live-production validated.** The screenshot's root cause is fixed by restoring `localMetadata`. Source syntax, cross-file imports, converter tests, actual WebAudio tone attenuation and compact CTA layouts were checked. A complete dependency-backed TypeScript/Vite build could not run in this isolated container; run it in Vercel Preview before promotion.

## Changed vs. original V59

- `src/services/media.ts` — restore `localMetadata` used by three editors.
- `src/editor/types.ts`, `src/editor/project.ts`, `src/editor/editRack.ts` — four DSP control definitions/defaults, effect grouping, four extra presets (34 total).
- `src/editor/audioEngine.ts` — working spectral reduction, lo-fi rolloff and transient compression in the shared playback/export WebAudio graph.
- `src/editor/Inspector.tsx` — real control dock sliders and quick options.
- `src/editor/AudioStudio.tsx` — existing local stem-separation engine exposed in Full Studio, independent track mute buttons; cancellation/error states.
- `src/components/SoundExperience.tsx` — realtime tone/reverb DSP; phrase-pause gated echo; dedicated slider/tab settings; phonk song strip hover/drag without accidental clicks.
- `src/pages/Home.tsx` — accurate downloader/format FAQ wording, existing page identity preserved.
- `src/styles/app.css` — scoped metric-card sizes, phonk interactions, Live Sound Lab tab responsiveness and compact Stem & percussion toolbar.
- `scripts/studio-v60-tests.cjs` — new Studio + whole-repository local-import/export regression suite.
- `package.json`, `package-lock.json` — matching V60 version/test script.
- `README.md`, `AUDIXO-V60-QA.md` — rollout and limitations.

## Automated checks (local)

| Check | Result |
|---|---|
| Studio tests | 9/9 pass |
| Browser-first downloader/API tests | 12/12 pass |
| TypeScript/TSX parser across source modules | 68+ modules checked, no parse errors |
| Relative TypeScript import/export resolver | Pass (includes the previously missing `localMetadata`) |
| Real Chromium OfflineAudioContext 4500Hz notch comparison | -15 dB, as intended |
| Scoped CTA card horizontal overflow at 1280, 760, 390, 320 px | None in CSS fixture |
| Production `npm ci` + `npm run build` | Not executed successfully: npm registry dependency tarballs not cached/accessible |
| Deployed Vercel preview + audio listening on actual song | Not performed |

## Required release acceptance tests

- [ ] Run `npm ci` and `npm run build` in a network-enabled build environment. Confirm `tsc --noEmit` passes and `dist` is generated.
- [ ] Open the site's `/editor` route. Upload MP3 and WAV, import audio, preview, select a clip, toggle Studio FX, and export MP3/WAV.
- [ ] Confirm `Tone` lo-fi, metallic ring reduction and transient softener change audible sound; check no crackle/hissing added by controls and no clipping.
- [ ] On an authorized short vocal source, run `AI stem split` and `Fast preview`; verify precise mode limitations, source preservation, independent Drums/Bass/Other muting, undo, and cancellation.
- [ ] On homepage, check phonk strip autoscroll pauses on hover, pointer-drag works, clicking song controls still works and no unintended click fires after drag.
- [ ] In Live Sound Lab, test Room size/brightness, Smart Pauses and repeat taps. Check no false claim that word-by-word lyrical text is analyzed.
- [ ] Validate compact CTA cards + seven Live Sound Lab tabs on desktop Chrome/Edge, Android Chrome and installed PWA.
- [ ] Test existing pages, converter (browser CORS restrictions expected), navigation, PWA install and SEO pages for regressions.

## Security / architecture

- Does not bundle cookies or site credentials.
- No external worker, Docker, Render, server-side large media proxy, or third-party conversion API.
- `demucs-web` AI stem model downloads to the user's browser from existing asset/module facilities; speed and memory depend on device.
- Browser-only conversion remains subject to CORS, source permissions and local device memory.
