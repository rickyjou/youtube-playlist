---
name: verify
description: Verify a change to the youtube-playlist web app by driving the real UI (local dev server or the live GitHub Pages site) with Playwright.
---

# Verifying youtube-playlist changes

## Handles
- **Live site (preferred once deployed):** https://rickyjou.github.io/youtube-playlist/ — the only
  place the YouTube API key works (referrer-restricted), so real titles/thumbnails/durations load.
  Confirm the deploy for your commit first:
  `gh run list --repo rickyjou/youtube-playlist --limit 1 --json headSha,status,conclusion`.
  The footer shows the deployed build: `v<UTC yyyy.mm.dd-hhmm> (build <run#>)`.
- **Local:** `cd web && npm run dev` → http://localhost:5183/youtube-playlist/. Metadata calls 403
  here; stub them with `page.route('**/youtube/v3/videos**', ...)` (and `playlistItems**` for
  playlist loads).

## Flows worth driving
- Editor vs share view: share view = `?playlist=<base64 JSON [{videoId,start,end}]>`. Share view must
  show no editor, no footer/GitHub link/version.
- Build a multi-clip playlist quickly via "Show advanced JSON editor" → paste JSON → "Update and Play
  from beginning".
- Row identity on delete/move: tag `<li>`s with `dataset` before acting, read tags after — same tags
  in the new order means no remount.
- "Playing" clip = `li.playing` in the editor. The iframe `src` does NOT change when the player
  switches videos (`loadVideoById`), so don't use it; screenshot the player instead.
- Load a big playlist through the real "YouTube link" form with stubbed `playlistItems` returning
  >50 ids, and count concurrent `videos` requests.

## Gotchas
- Playwright MCP `browser_run_code_unsafe` runs in a sandbox without `btoa`, `Buffer`, `URL`,
  `setTimeout` — use `page.evaluate(() => btoa(...))`, regex on URLs, `page.waitForTimeout`.
- Route handlers from a previous `browser_run_code_unsafe` call persist on the page; call
  `page.unrouteAll({ behavior: 'ignoreErrors' })` first.
- Share links are shortened via da.gd (`https://da.gd/s?url=...`, CORS `*`). TinyURL's
  `api-create.php` stopped working from browsers (its CORS header only allows tinyurl.com). If you
  see "Couldn't shorten link — showing full link", check the shortener's CORS headers with
  `curl -i -H "Origin: https://rickyjou.github.io" ...` before touching app code.
- `https://rickyjou.github.io/favicon.ico` 404s in the console — unrelated noise.
