# AUDIXO V61 — Source Package QA

**Scope:** Homepage Live Sound Lab only (6 additional user-supplied tracks and
matching cover art, 2D glass crate with card drop-in, drag/tap/click controls,
and preservation of Studio and existing site features).

**QA performed:** deterministic source-level checks for all six track IDs,
reel timestamps, WebP cover sprite, legacy reel preservation, one persistent
audio player, pointer interactions, reduced-motion CSS, import/export syntax,
ZIP contents and file count. MP3 decode inspection and cover-atlas dimensions
were also checked.

**Environment limitation:** A full `npm ci && npm run build` is not verified
in this container because the npm registry is unreachable and the required
package tarballs are not all cached. Production build success and end-to-end
browser audition require execution in the connected deployment environment.
Do not represent this source ZIP as a verified Vercel production deployment.

**No credentials, session cookies, private tokens, `.env` files or
`node_modules` are included in the ZIP.**
