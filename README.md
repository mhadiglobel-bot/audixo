# AUDIXO V71: ONE VERCEL PROJECT (YouTube MP3 / MP4)

This is the complete AUDIXO V71 Vite/React website plus the YouTube downloader running **inside the same Vercel deployment**. It does not call a separate REST YTDL API, dedicated server, Pterodactyl server, or third-party conversion service. The existing audio editor, demo assets, pages, branding, and local media processing are preserved.

## Fast deploy

1. Extract this entire ZIP. Upload **all root files and directories** (including `api/`, `bin/`, `lib/`, `scripts/`, `src/`, `public/`) to a GitHub repository or deploy the extracted directory using the Vercel CLI. Do not deploy the ZIP as a static-only `dist/` folder.
2. Create/import a Vercel project with **Framework Preset: Vite**, **Node.js: 22.x**, **Build: `npm run build`**, **Output: `dist`**. Enable Fluid Compute (needed for long-running conversions).
3. In Vercel Project Settings → Environment Variables, set `AUDIXO_COOKIE_PASSWORD` to your admin password. For this deployment, use the password you requested in chat. **Do not put it in client-side Vite variables or commit real secrets to Git.** Optionally add `AUDIXO_SIGNING_SECRET` as a random long server secret for download tokens.
4. In Vercel Project → Storage, create and **connect a PRIVATE Vercel Blob store**. It supplies the `BLOB_READ_WRITE_TOKEN` server environment variable automatically. This is persistence for the cookie file only, **not an external media API or worker**. Make sure the store is private; never use a public Blob store for cookies.
5. Redeploy. Visit `https://YOUR-DOMAIN/bhai-cookie-dalde`, enter the admin password, and upload a Netscape-format `cookies.txt` from a YouTube account you are authorized to use.
6. Open `/tools/youtube-to-mp3`, analyze a YouTube video, choose an **actually returned** quality/MP3 bitrate, and download. A new tab starts the Vercel conversion. If the browser blocks the new tab, use the manual download link underneath the button.

## URLs

- `/tools/youtube-to-mp3`: MP3/MP4 converter; local media processing still works offline.
- `/bhai-cookie-dalde`: protected cookie update page. `GET` shows form and `POST` saves to private Blob.
- `/api/media?action=health`: public non-sensitive readiness check (binaries, storage status).
- `/api/media?action=meta`: first-party metadata endpoint (POST).
- `/api/media?action=start`: makes an expiring signed browser download URL (POST).
- `/api/media?action=file&token=...`: same-project FFmpeg streaming download (GET).

**Important:** The browser calls only these first-party routes on your deployed domain. The Vercel function itself connects to YouTube for video metadata/streams; it may fetch yt-dlp's current EJS components from GitHub for compatibility. No separate conversion API/worker is used.

## What's inside

- `api/media.ts`: same-project metadata + signed download + direct FFmpeg streaming.
- `api/bhai-cookie-dalde.ts`: admin cookie update form and validation.
- `lib/youtube.ts`: URL whitelist, metadata selection, source verification, expiring tokens.
- `lib/cookies.ts`: private Blob storage and secure temporary cookie file handling.
- `scripts/prepare-ytdlp.mjs`: downloads the official Linux x64 standalone yt-dlp at **build time**, validates SHA-256 against the official checksum.
- `scripts/prepare-ffmpeg.mjs`: installs the bundled FFmpeg static executable in `bin/` for Vercel.
- `src/`, `public/`: complete AUDIXO V71 site and original media assets.

## Reality check (not a guarantee of every YouTube video)

- Vercel has execution-time and compute limits. This version streams output rather than buffering a full file in a Vercel JSON response. It uses a 300-second max function execution setting, but some downloads can still time out, notably long/high-resolution videos, and videos over 60 minutes are explicitly rejected.
- YouTube may block data-center/Vercel IPs even with valid cookies. **Code cannot guarantee bypassing these restrictions.** Cookie file installed ≠ authenticated extraction success.
- Vercel Blob is required for the **cookie-update website** to persist session data across cold starts/redeploys; it is not required to attempt downloads of public videos.
- The project downloads official yt-dlp at build time. If GitHub releases cannot be fetched during build, deployment fails with a clear build error. The ZIP does not contain a prebuilt executable or any credentials.
- Video resolutions shown reflect formats returned by yt-dlp. Video streams are copied when supported and audio is remuxed/encoded to MP4; MP3 audio is transcoded by FFmpeg. Browser/client playback compatibility depends on source codecs.
- Local tests in this package can confirm routing, security checks, and the streaming pipeline using mock metadata, but **a successful live YouTube download from a deployed Vercel region has not been verified here**.

## Configuration summary

| Variable | Required? | Purpose |
|---|---|---|
| `AUDIXO_COOKIE_PASSWORD` | **Yes** | Protect `/bhai-cookie-dalde`; at least 8 characters. |
| `BLOB_READ_WRITE_TOKEN` | For cookie updates | Automatically set when private Vercel Blob is connected. |
| `AUDIXO_SIGNING_SECRET` | Recommended | Random secret for short-lived signed download links; uses admin password as fallback if absent. |

For secure deployment, rotate exposed passwords and upload cookies only to a trusted domain. Never distribute actual `cookies.txt` files, `BLOB_READ_WRITE_TOKEN`, or secrets in this ZIP.
