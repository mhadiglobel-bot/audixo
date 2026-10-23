# AUDIXO V56 — One GitHub Repository

This is **one repository** containing both components:

- Root (`package.json`, `src/`, `api/`, `public/`) — existing AUDIXO website on **Vercel**.
- `media-worker/` — self-owned **Docker** yt-dlp + FFmpeg service on a persistent host.

The old `ytdl.tiers.rest` API dependency was removed. All prior Studio,
editor, audio tools, design and 13-song Sound Lab remain in the website.

**Important:** One GitHub repository does not mean one Vercel runtime: Vercel
still serves the Vite app/API proxy, while the CPU-intensive persistent media
worker must run as a separate Docker service **from `media-worker/` in the
same GitHub repository**. Do not point the Vercel root directory at
`media-worker/`.

## Single GitHub-ready upload (99 files)

Extract `AUDIXO-V56-COMBINED-GITHUB-99-FILES.zip` on your computer.
Open the extracted files, select **all 99 files** (including files inside subfolders),
and drag them into **GitHub > repository > Add file > Upload files**.
The upload should show 99 files, not 112. Commit them in one upload.
GitHub's web uploader does NOT automatically unpack a ZIP file.

Keep `package.json`, `src/`, `api/`, `public/`, `scripts/`, and `media-worker/`
at the repository root. The worker is still configured and deployed from its
own subfolder on a Docker-capable host; GitHub/Vercel alone cannot perform yt-dlp conversions.
To update an existing repository, replace matching paths and remove obsolete
unmerged V56 duplicate files if they are still in GitHub. GitHub's web upload
will not automatically delete old files; stale modules left in your repo can
cause the TypeScript build to fail. The exact 13 removed/consolidated paths
are listed at the end of this README.

## Vercel website settings

- Framework: **Vite**
- Root directory: `./` (repository root)
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: `22.x`

Add these variables in Vercel. The token is a **private** secret, not a
`VITE_` variable:

    AUDIXO_WORKER_URL=https://YOUR-WORKER-HTTPS-URL
    AUDIXO_WORKER_TOKEN=THE-SAME-PRIVATE-TOKEN-AS-DOCKER-WORKER
    VITE_SITE_URL=https://audixo.vercel.app

Remove old `AUDIXO_YTDL_BASE_URL`, `AUDIXO_YTDL_AUTH_TOKEN`,
`AUDIXO_YTDL_AUTH_SCHEME` and `AUDIXO_YTDL_COOKIE` from Vercel.

## Docker worker settings

On a Docker-capable server, deploy **the `media-worker/` folder** from this
same repo. Set Docker build context/root directory to `media-worker`.
Configure private environment variables on the worker host:

    AUDIXO_WORKER_TOKEN=LONG-RANDOM-PRIVATE-SECRET-ALSO-USED-IN-VERCEL
    AUDIXO_ADMIN_TOKEN=A-DIFFERENT-LONG-RANDOM-PRIVATE-SECRET
    PORT=8080
    AUDIXO_DATA_DIR=/app/data

Generate private 64-character hex tokens on your own computer (run twice):

    node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"

Use the first value on worker + Vercel; second value only on worker.
Never paste secret values into chats or GitHub.

The worker needs HTTPS, FFmpeg, yt-dlp, and **persistent `/app/data` storage**.
Its Dockerfile installs yt-dlp + FFmpeg; for local Docker Compose usage:

    cd media-worker
    cp .env.example .env
    # replace placeholders in .env on your computer, do NOT commit it
    docker compose up -d --build

Read the **Media Worker Deployment and Cookie Administration Guide** below.
**Cookies are excluded** from the ZIP and must never be committed.
The previously shared all-sites `cookies.txt` was not used.

## Tests

Website root:

    npm ci
    npm run typecheck
    npm run test:converter
    npm run test:tracks
    npm run build

Worker folder:

    cd media-worker
    npm test

Synthetic worker tests check MP3/MP4 conversion without external YouTube
access; actual public-video downloading must be tested on the deployed host.

## Known deployment limitations

- GitHub file limits are for an individual browser upload, not a requirement
  that a repository contain 99 files forever. This compact distribution has 99 files in one archive.
- A static Vite site alone cannot execute the worker's yt-dlp/FFmpeg jobs.
- Build success and real YouTube source access cannot be guaranteed until
  actual cloud deployment, network connectivity and worker health pass.
- Ensure you have permission for downloaded/redistributed media; the bundled
  music demos may require distribution rights for public use.


---

## Media Worker Deployment and Cookie Administration Guide

# AUDIXO Private Media Worker — V56

This is a self-owned processing server. It does **not** call `ytdl.tiers.rest`.
It uses `yt-dlp` + the bundled `yt-dlp-ejs` optional components (the Docker
image installs `yt-dlp[default]`), the built-in Node 22 JavaScript runtime,
and FFmpeg/FFprobe. The existing AUDIXO React/Vite UI remains hosted separately
on Vercel. This worker needs a persistent Docker host and temporary disk.

## Step 1 — Use the media-worker folder in the existing AUDIXO GitHub repository

The project source contains NO credentials. Do not commit any cookies. This
worker is already inside the **same GitHub repository** as the AUDIXO Vercel
website, under `media-worker/`. Deploy **this subfolder** as a Docker service
using a host that supports volumes and HTTPS, for example a managed
container/VPS service. The platform must provide enough disk, RAM and CPU
for your requested video resolutions.

## Step 2 — Configure the worker host

Set two PRIVATE environment variables on the container service:

- `AUDIXO_WORKER_TOKEN` — a unique, cryptographically random 64-hex-character
  token. Must match the one set on Vercel. At least 32 characters are required.
- `AUDIXO_ADMIN_TOKEN` — a DIFFERENT random 64-hex-character token, used only
  to install a YouTube-only cookie export into the worker.

Optional: `AUDIXO_MAX_CONCURRENT=2`, `AUDIXO_MAX_JOBS_PER_10MIN=6`, `AUDIXO_DATA_DIR=/app/data`, `PORT=8080`.

Generate secrets locally with Node:

    node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"

Run twice for separate worker/admin tokens. Never paste them in chat or source
code and do not prefix them with `VITE_`.

For Docker Compose on a private machine:

    cp .env.example .env
    # Edit .env ONLY LOCALLY and replace placeholders with random tokens
    docker compose up -d --build

For a managed platform, configure the service root/build context as
`media-worker/` in the same GitHub repository; the Dockerfile
is `Dockerfile`, the public HTTP service listens on PORT (default 8080), and
its HTTPS URL becomes the Vercel `AUDIXO_WORKER_URL`.

### Persistent storage — required

Mount `/app/data` as a **persistent volume**. This keeps cookie sessions and
finished files across container restarts. Never mount a public bucket in its
place. YouTube private sessions live in `/app/data/private/` (mode 0600).

## Step 3 — Configure the existing AUDIXO Vercel project

Set these PRIVATE environment variables in Vercel:

    AUDIXO_WORKER_URL=https://YOUR-WORKER-HTTPS-DOMAIN
    AUDIXO_WORKER_TOKEN=<SAME-LONG-SECRET-AS-WORKER>

Set this PUBLIC build-time configuration if you know the domain:

    VITE_SITE_URL=https://audixo.vercel.app

Remove the old `AUDIXO_YTDL_BASE_URL`, `AUDIXO_YTDL_AUTH_TOKEN`,
`AUDIXO_YTDL_AUTH_SCHEME`, and `AUDIXO_YTDL_COOKIE` entries; they are NOT used.
Optional Cloudflare Turnstile config is preserved; it needs both its public
site key and private verification key, as in prior AUDIXO versions.

Vercel settings:
- Framework: Vite
- Root directory: project root
- Install: `npm ci`
- Build: `npm run build`
- Output: `dist`
- Node: 22.x

A remote hosting account and the final backend service URL are needed to make
this working source live. Cookies alone cannot run yt-dlp or FFmpeg inside a
static Vite browser page.

## Step 4 — Optional YouTube-only cookies (never put in GitHub)

YouTube authentication is usually not needed for public clips, so **try without
cookies first**. Logged-in cookies can expire or trigger account security
checks and can put the account at risk. If access is restricted:

1. Rotate/revoke sessions that were exposed in previously shared cookie dumps.
2. Obtain a FRESH export with YouTube cookie records only. If your browser
   exported all sites, open `tools/youtube-cookie-only-helper.html` locally,
   choose the fresh export and save the filtered copy. This tool does not send
   data over the network.
3. Open `https://YOUR-WORKER-DOMAIN/admin` in your own browser.
4. Paste your **worker ADMIN token** (not the Vercel worker token), select the
   YouTube-only cookie file and select `Install Private Cookies`.
5. You can now retry one *authorized* test video.

The admin server rejects exports with any non-YouTube cookies. It never returns
cookie values and only stores the file on the persistent worker volume.

## Security boundaries

- Only HTTPS YouTube URLs and exact video IDs accepted (SSRF defense).
- Private worker token required for ALL `/health`, `/preview`, `/jobs` endpoints.
- Unique 128-bit job IDs, separate job directories, max two concurrent jobs.
- The frontend never receives the cookie file or worker token.
- No signed YouTube stream URLs or session values in logs.
- Only `.mp3`/`.mp4` final files pass FFprobe verification before being READY.
- One-time media GET; source and output cleaned after completed file delivery.
- On container restart, undelivered READY jobs with verified local files are
  recoverable; in-progress jobs fail clearly rather than pretending success.
- Start a new job if a file has already been delivered.
- Place a host-level rate limit / abuse protection in front of the public UI.

## Worker HTTP contract (private Vercel-to-worker)

    GET  /health                 Bearer token
    POST /preview                {"url":"https://www.youtube.com/watch?v=..."}
    POST /jobs                   {"url":"...","format":"mp3","bitrate":320}
    POST /jobs                   {"url":"...","format":"mp4","quality":"1080"}
    GET  /jobs/{id}
    GET  /jobs/{id}/events       SSE
    GET  /jobs/{id}/file         One full GET
    GET  /admin                  Browser-only cookie administration UI
    POST /admin/cookies          Requires x-audixo-admin header

MP4 preview is format-driven (not a fabricated global quality list). MP4
requests re-evaluate current formats; unavailable quality returns HTTP 422
`QUALITY_UNAVAILABLE`. FFmpeg final output height must equal requested value.
MP3 bitrates are encoded by FFmpeg at 64/128/192/256/320 kbps and FFprobe
validates actual bitrate before allowing file delivery.

## Testing without YouTube or real cookies

    npm test

Worker regression tests use synthetic generated audio/video and a mock
`yt-dlp` binary; no internet connection or private credentials are used.

## Known limits

- Reliable video conversion needs a persistent server, not Vercel static hosting.
- Large 4K/8K conversions can be CPU-intensive, costly or slow.
- YouTube source restrictions, PO-token requirements and expired sessions can
  still make some authorized videos unavailable.
- A personal authenticated YouTube session should not be shared broadly with
  all visitors to a public downloader. Consider disabling cookies for general
  public usage and rate-limiting the backend.
- Only a successful test on the actual deployed worker can confirm that live
  YouTube downloads and the host's networking work end-to-end.


## Consolidated file map (V56 / GitHub browser upload)

All original website routes and local test suites remain included. Files below
were consolidated or eliminated because they were redundant/unreferenced:

- `src/styles/ax39.css`
- `src/styles/ax40.css`
- `src/pages/EchoTool.tsx`
- `src/pages/SlowedReverbTool.tsx`
- `src/pages/PitchTool.tsx`
- `src/pages/SpatialTool.tsx`
- `src/pages/Privacy.tsx`
- `src/pages/Copyright.tsx`
- `src/pages/NotFound.tsx`
- `src/editor/StudioDisc.tsx`
- `media-worker/.gitignore`
- `media-worker/tests/integration.test.mjs`
- `media-worker/README.md`

Path mapping: quick audio tool pages -> `src/pages/QuickTrim.tsx`; privacy/copyright -> `src/pages/Terms.tsx`; 404 -> `src/pages/Tool.tsx`; worker integration tests -> `media-worker/tests/core.test.mjs`; old CSS layers -> `src/styles/app.css`.
