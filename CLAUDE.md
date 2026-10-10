# youtube-playlist

## Dev workflow (in `web/`)
- `npm run dev` → http://localhost:5183/youtube-playlist/ (Vite base path is `/youtube-playlist/`)
- `npm run test` (vitest) — run before claiming any change complete
- `.env.local`'s YouTube API key is HTTP-referrer-restricted to the production domain — video
  metadata fetches always 403 in local dev. Expected, not a bug. To verify metadata-dependent UI
  (titles, durations) in a real browser locally, mock the endpoint: `page.route('**/youtube/v3/videos**', ...)`.
- Deploys to GitHub Pages automatically via `.github/workflows/deploy.yml` on push to `main`.
  Check a specific commit's deploy: `gh run list --repo rickyjou/youtube-playlist --limit 3
  --json headSha,status,conclusion`.

## Git workflow
- One remote: `origin` = `rickyjou/youtube-playlist`; pass `--repo rickyjou/youtube-playlist` to
  `gh` commands when in doubt.
- Solo repo: commit directly on `main`; push only when asked. Pushing to `main` deploys, so local
  commits are the safe holding area.
- Use a branch only to push work-in-progress without deploying, or for an experiment you may discard.
- Use a git worktree only when multiple Claude sessions work on the repo in parallel. A worktree
  can't also check out `main`, so it gets its own branch; fast-forward or merge that into `main`
  locally when done (still no PR).
- No PRs.

## Gotchas
- `App.jsx`'s metadata-fetch effect must (1) skip `setMetadata` when the fetch result is empty
  (else metadata's object reference changes every render → infinite effect loop) and (2) track
  already-requested video ids in a ref with settle-aware cleanup (else React StrictMode's dev-only
  double-invoke either double-fetches or, done wrong, silently blocks the real fetch forever).
- `<input type="number">`: `.select()` visibly highlights the text in real browsers, but
  `selectionStart`/`selectionEnd` always read `null` (jsdom and real browsers alike). Test
  select-on-focus by spying on `.select()` being called, not by reading selection range.
- `vi.mock('./lib/youtubeApi.js')` (in App.test.jsx) keeps call history across tests in the same
  file — call `.mockReset()` in `beforeEach` before asserting on call counts.
