# AUDIXO Studio — V40 Responsive Edition

**Official website:** https://audixo.vercel.app  
**Stack:** React 18, Vite 5, TypeScript 5, Vercel Node.js API proxy, browser Web Audio and optional ONNX local AI.

This package updates the uploaded **AUDIXO V39.1 MP4 Hotfix** source. It is designed to preserve its editing engines while adding mobile/PWA layout, a deliberate seven-second introductory loader, a real independent Echo control dock, quality sliders, route metadata and navigable tool cards.

## Main updates

- The introductory branded loader remains for **at least 7 seconds after application startup**, once per full-page load, not per internal navigation. It uses the supplied official AUDIXO symbol and lettering. This deliberate wait can affect initial UX performance and Core Web Vitals.
- Full Studio Inspector has **Presets / Tone / Echo / Space / Motion / Clip** tabs. Echo has On/Off, independent mix, time and feedback, plus Slapback, Vocal Echo, and Deep Space starters. Every preset supports an optional Echo layer. These parameters connect to the existing Web Audio DelayNode processing, not a fake UI state.
- One YouTube converter presents an MP3/MP4 toggle. MP4 includes a stepped slider at **240 / 360 / 480 / 720 / 1080 / 1440 / 2160p**; verified availability depends on `/api/preview`, and unverified qualities are labelled accordingly. The server ultimately decides whether a video is available at the selected resolution.
- MP3 defaults to a **320 kbps target**. The browser can *actually re-encode* some short files (up to five minutes, 24 MB MP3 input) to 128/192/256 kbps. Otherwise those options are disabled; no fake bitrate choice silently downloads 320 kbps.
- A bottom navigation for touch devices, responsive workspaces, installable standalone PWA shell with official brand icons, touch-friendly controls, static help and tools galleries on mobile, mobile install guidance and safe caching (excludes API and private media).
- Footer sections: Audio Tools, More Tools, Explore, Help & Support, Legal. A Copyright & Media Rights page joins the existing Terms and Privacy pages.
- Search-oriented content improvements: distinct route titles/descriptions/canonicals/OG metadata, HTML pre-rendering, XML sitemap, robots.txt, software application JSON-LD, official icon and human-readable FAQs. **Search rankings/AI mentions are never guaranteed.**
- The Contact page has no form and displays **Official email coming soon** until the address is entered in `src/config/site.ts` as `manualSupportEmail`.

## Vercel / GitHub deployment

1. Extract this ZIP, create a **new GitHub repository** and upload the **files inside the ZIP** into the repository root (`src`, `api`, `public`, `package.json`, `vercel.json` should all be in root). Do not upload the ZIP itself.
2. Vercel > New Project > import your new GitHub repository. Use **Vite** preset; Root `./`; Build `npm run build`; Output `dist`; Install `npm ci`; Node 20 or newer.
3. Vercel > Environment Variables:

| Variable key | Value | Notes |
| --- | --- | --- |
| `AUDIXO_YTDL_BASE_URL` | `https://ytdl.tiers.rest` | Required. **No `/download` suffix.** |
| `VITE_SITE_URL` | `https://audixo.vercel.app` | Use only once this domain belongs to the new Vercel project. Prior to transfer use the new project's actual hostname. |
| `AUDIXO_YTDL_AUTH_TOKEN` | *your private API token* | Optional. Add only if the backend verifies an API token. Never place it in GitHub or a `VITE_` prefixed variable. |

4. Select **Production and Preview** and deploy. If the preferred URL is still attached to the old Vercel project, transfer the domain in Vercel's project Domains settings, then update `VITE_SITE_URL` and redeploy.
5. Check `/tools/youtube-to-mp3`, `/editor`, `/copyright`, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt` and `/site.webmanifest` on the live deployment.
6. Use Google Search Console to verify your domain, submit `https://audixo.vercel.app/sitemap.xml` and inspect representative pages. Give search engines time to index; appearance in Google AI Overviews or ChatGPT citations is not assured.

### Optional API authentication

- `AUDIXO_YTDL_AUTH_TOKEN`: Private bearer token **only when the YTDL backend implements matching token verification**.
- `AUDIXO_YTDL_AUTH_SCHEME`: Defaults to `Bearer` when token is present. Change only if your own API uses another supported Authorization scheme.
- `AUDIXO_YTDL_COOKIE`: Only if your backend requires an explicit cookie; store privately in Vercel, not in the frontend.

### Future contact email

Edit **`src/config/site.ts`**, change `const manualSupportEmail=''` to your official address, commit to GitHub, redeploy. Do not use a fake Gmail or contact form.

## Local development and build

```bash
npm ci
npm run typecheck
npm run build
```

The repository upload edition omits optional diagnostic test harness files and previous-version QA notes to remain below the GitHub web uploader's 100-file limit. This does not alter the production `npm run build` pipeline or the web app, audio editor, media proxy, PWA, or SEO generation scripts. Run live browser/mobile and API acceptance testing after deployment.

## Limitations and operational reality

- MP3 request bitrate does not improve source audio quality. Confirm actual media bitrate using `ffprobe` on downloaded content.
- 1440p/2160p cannot be manufactured if the source video or the owner's YTDL API does not support it. Unverified selections may fail with a server message.
- A two-hour video job can exceed the backend storage limits or Vercel streaming/function duration even if API metadata reports two hours. A dedicated streaming/object-storage delivery channel may be required.
- ONNX local vocal separation estimates stems; stem bleed is normal, and mobile GPUs/RAM may be insufficient. Fast Preview is approximate and clearly labelled.
- PWA install prompts depend on browser support. iOS uses Safari > Share > Add to Home Screen. The installed app does not make server-driven downloads or large AI models work offline.
- Use converters only for content you own or are otherwise authorized to download or transform. Check platform terms and applicable copyright rules.
