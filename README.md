# AUDIXO V57 — GitHub-ready website + private MP3/MP4 worker

**ONE GitHub repository · 99 source files · no cookies or private tokens in GitHub.**

This package combines the previously separate AUDIXO V56 website and media-worker projects. It fixes the large-file download architecture and provides an optional, ready-to-connect Render deployment blueprint. The screenshot's **"processing worker is offline or not configured"** error is a deployment/configuration error: source code cannot start a worker on Vercel automatically.

## 1. What runs where?

| Component | Location in this same repo | Runs on | Purpose |
| --- | --- | --- | --- |
| Website (React/Vite) + private API proxy | `src/`, `api/media.ts`, `package.json` | **Vercel** | Interface, YouTube metadata, conversion requests, job progress, issuing download tickets |
| Media Worker | `media-worker/` | **Render / Docker VPS** | yt-dlp, FFmpeg, verified MP3/MP4, file storage |
| Render blueprint | `render.yaml` | **Render** | Deploys media-worker automatically from same GitHub repository |

**Important:** One *repository/ZIP* does not mean one process or one hosting service. **Vercel cannot run the persistent Docker worker from the root website deployment.** The worker needs its own Docker host with persistent disk. A public/HTTPS worker URL and matching token must be entered in Vercel before the converter can connect.

## 2. Upload ONE ZIP to GitHub (99 files, not the .zip itself)

1. Extract `AUDIXO-V57-ONE-REPO-99-FILES.zip`.
2. Open your existing AUDIXO repository on GitHub → **Add file → Upload files**.
3. Drag the **contents of the extracted directory**, with subfolders intact, not the ZIP itself. Do not create a second nested repository folder.
4. Commit. All 99 files are in one source tree, including `render.yaml` at the root.
5. If this repository already contains obsolete V56 files not in this package, GitHub's web upload **does not delete** them. Remove stale paths listed under the clean-up notes below, or use Git to synchronize the repository. Do not delete unrelated files blindly.

The 99-file count is a constraint for one browser upload, **not** a GitHub repository-wide maximum.

## 3. Deploy the Docker worker FIRST (simple Render blueprint path)

> Render's Standard instance + persistent disk is a paid resource; verify costs before provisioning. For lighter workloads you can choose another persistent Docker host instead.

1. Visit [Render](https://dashboard.render.com/), open **New → Blueprint**, and connect your existing AUDIXO GitHub repository.
2. Select the `render.yaml` Blueprint. It creates an `audixo-media-worker` web service using `media-worker/Dockerfile`, an HTTPS host, a persistent `/app/data` disk, and a public `/live` health check.
3. Render generates private `AUDIXO_WORKER_TOKEN` and `AUDIXO_ADMIN_TOKEN` values independently. **Do not paste either in GitHub, the browser app, a screenshot, or chat.** In Render's service environment settings, securely copy/reveal the **WORKER** token for Vercel (only). Keep the separate **ADMIN** token for the cookie setup page.
4. When deployed, copy the HTTPS service origin, for example `https://audixo-media-worker.onrender.com`. The actual hostname is whatever Render provides you. Visiting `<YOUR-WORKER-URL>/live` should return `{"ok":true,"service":"audixo-media-worker"}`. (No secrets are returned.)

Alternate Docker VPS deployment: create `media-worker/.env` locally using `media-worker/.env.example`, fill two **different** 32+ character secrets, and run:

```bash
docker build -t audixo-media-worker ./media-worker
docker volume create audixo-private-data
docker run -d --name audixo-media-worker --restart unless-stopped \
  --env-file media-worker/.env \
  -v audixo-private-data:/app/data -p 8080:8080 audixo-media-worker
```

Place a **trusted HTTPS reverse proxy** in front of VPS port 8080. Never expose cookies or worker tokens in GitHub.

## 4. Configure Vercel (same GitHub repository)

Keep the Vercel project's **Root Directory** set to repository root, NOT `media-worker/`:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node | 22.x |

In Vercel → Project → Settings → Environment Variables add:

```text
AUDIXO_WORKER_URL=https://YOUR-RENDER-SERVICE.onrender.com
AUDIXO_WORKER_TOKEN=THE_EXACT_SAME_WORKER_TOKEN_GENERATED_ON_RENDER
VITE_SITE_URL=https://audixo.vercel.app
```

The example hostname must be replaced with your **real** worker URL. Use the token **only** in `AUDIXO_WORKER_TOKEN` (without `VITE_` prefix). Set Vercel variables for Production; include Preview only if you intend to enable preview deployments. Redeploy the website so server-side environment changes take effect. The converter now shows a single clear status message and a **Retry connection** button; when configured correctly it shows **Media worker connected**.

Remove unused legacy `AUDIXO_YTDL_BASE_URL`, `AUDIXO_YTDL_AUTH_TOKEN`, `AUDIXO_YTDL_AUTH_SCHEME`, and `AUDIXO_YTDL_COOKIE` variables. This project does **not** use a paid or external YTDL API.

## 5. Optional: YouTube-only cookies (PRIVATE — NOT IN THIS ZIP)

**Do not commit or upload the provided `cookies(1).txt` to GitHub.** The file you supplied contains active Google, YouTube, and unrelated sites' authentication/session tokens (not just YouTube). The original file must not be used directly as a public worker environment file. Because it was shared, revoke/refresh affected login sessions and generate a new YouTube-only cookie export.

For videos you own or are authorized to download, try public access **without cookies first**. If YouTube specifically requires login and you have rights to access the video:

1. Export a **fresh** Netscape-format `cookies.txt` from an account/session you are authorized to use. Avoid browser-wide exports; a separate account or session is safer.
2. Locally open `media-worker/tools/youtube-cookie-only-helper.html` in a browser and select the new export. It creates a filtered YouTube-only file **without uploading it anywhere**.
3. Visit `https://YOUR-ACTUAL-WORKER-URL/admin` in your browser (HTTPS required). Enter the separate `AUDIXO_ADMIN_TOKEN` from Render; choose the filtered local file; click **Install Private Cookies**.
4. The worker validates hostnames and saves the private file only on its persistent volume with file mode 0600. It is never served to clients or stored in the GitHub repository.

**Important:** Cookies expire, YouTube may block datacenter IPs, and login does not guarantee that a source is accessible. Do not expose a personal authenticated YouTube session to untrusted public traffic; consider keeping cookie mode disabled for a publicly accessible downloader.

## 6. End-to-end download workflow (V57 fix)

`Browser → Vercel /api/media (private proxy) → Docker worker` for preview, conversion, and status.

When ready:

1. Worker verifies output MP3 bitrate or exact MP4 resolution with FFprobe.
2. Browser requests a one-time signed download ticket from the Vercel proxy.
3. Browser downloads the **file directly from the worker HTTPS domain**, bypassing the Vercel Function's 4.5 MB response-payload limit.
4. Ticket expires in **2 minutes**, cannot expose the master token, and each job is downloadable only once. The worker deletes delivered output files.

This change is essential for multi-megabyte MP3/MP4 files. The older V56 method streamed the entire output through a Vercel Function.

## 7. Test / troubleshoot

Worker tests use generated synthetic audio/video and a mock yt-dlp executable, **not** Google cookies or external YouTube downloads.

```bash
npm ci
npm run typecheck
npm run test:converter
npm run test:tracks
npm run build
cd media-worker
npm test
```

Health check: `<worker HTTPS URL>/live` (public). Use the **AUDIXO converter connection banner** on the Vercel site to verify authenticated Vercel-to-worker requests. A public `/live` check alone does not prove Vercel credentials are correct.

| UI condition | Likely issue | Action |
| --- | --- | --- |
| Worker setup required | Vercel env missing | Configure the Render worker and both Vercel vars, then redeploy |
| Worker unreachable | Host asleep/down, DNS, TLS, URL mismatch | Inspect Render service and `/live` |
| Worker rejected authentication | Tokens differ | Set identical private WORKER tokens on Render and Vercel |
| YouTube access rejected | Source block/login/expired cookies | Test rights/availability, update yt-dlp or refresh authorized session |
| Requested MP4 unavailable | Exact source resolution missing | Analyze again and choose from real source qualities |
| Download doesn't start | Browser blocked automatic download or worker unavailable | Use the 2-minute manual link if not yet consumed; otherwise retry with a new conversion |

**Verification limits:** An offline local test cannot prove that live YouTube source access or your hosted worker networking succeeds. Only a successful test with an authorized video on the deployed Render/Vercel setup can confirm end-to-end production operation.

## 8. Existing V56 repository clean-up

These obsolete files were consolidated/removed in the previous V56 112→99 merge. If they remain in your **existing GitHub repository**, delete them only after checking that no other local custom code references them:

`src/styles/ax39.css`, `src/styles/ax40.css`, `src/pages/EchoTool.tsx`, `src/pages/SlowedReverbTool.tsx`, `src/pages/PitchTool.tsx`, `src/pages/SpatialTool.tsx`, `src/pages/Privacy.tsx`, `src/pages/Copyright.tsx`, `src/pages/NotFound.tsx`, `src/editor/StudioDisc.tsx`, `media-worker/.gitignore`, `media-worker/tests/integration.test.mjs`, `media-worker/README.md`.

**V57:** `media-worker/docker-compose.yml` is intentionally replaced by the root `render.yaml` to stay within 99 files. The optional manual Docker commands above still work. Website/editor/track assets remain as in V56.

Use only audio/video that you own or are legally permitted to download and transform. Respect platform rules and rights holders.
