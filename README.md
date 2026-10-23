# AUDIXO Studio V56 - Independent MP3/MP4 Processing

The original AUDIXO React/Vite UI, audio Studio, 13-demo-song Sound Lab, neon
MP3/MP4 quality rails, Resume and Turnstile are preserved.

**Old third-party YTDL API removed.** This frontend now talks only to the
private AUDIXO media worker included as a SECOND download ZIP. The worker
uses yt-dlp + FFmpeg on a persistent Docker server. The browser does not
process YouTube cookies.

## Hosting

1. Deploy the **separate AUDIXO V56 Private Media Worker ZIP** to a Docker
   host with HTTPS and a persistent storage volume.
2. On that worker, set `AUDIXO_WORKER_TOKEN` and `AUDIXO_ADMIN_TOKEN` to
   strong different secret values.
3. In Vercel, add:

       AUDIXO_WORKER_URL=https://YOUR-PRIVATE-WORKER-DOMAIN
       AUDIXO_WORKER_TOKEN=THE_SAME_SECRET_AS_WORKER
       VITE_SITE_URL=https://audixo.vercel.app

4. Remove older YTDL API environment variables; they are not used.
5. Upload this frontend ZIP's contents to the existing GitHub repository.
6. Vercel: Vite; `npm ci`; `npm run build`; output `dist`; Node 22.x.

For cookie handling, open the **worker README** and use the secure admin
page only after generating a new YouTube-only cookie export. Never publish
cookies in GitHub, Vercel `VITE_*`, chat, or ZIPs.

## Frontend flows

- Analyze -> private worker `/preview` -> actual quality choices.
- MP4 -> exact selected resolution -> yt-dlp + FFmpeg -> ffprobe verify ->
  ready -> single streamed GET.
- MP3 -> selected 64/128/192/256/320 bitrate -> FFmpeg CBR MP3 -> ffprobe
  verify -> ready -> single streamed GET. The default selected bitrate is 320.
- Live stage/progress events via SSE with status polling fallback.
- Independent worker protects original audio Studio and all other pages.

## Tests

    npm ci
    npm run typecheck
    npm run test:converter
    npm run test:tracks
    npm run build

The converter test script runs a mocked private worker API (no YouTube
cookies or remote network). A successful build and final live worker smoke
test on your hosting are still essential production release gates.
