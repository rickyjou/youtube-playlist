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

## GitHub / PRs
- Two remotes: `origin` = `rickyjou/youtube-playlist` (this fork, where feature branches
  live and get merged), `upstream` = `cytsunny/youtube-playlist`.
- `gh`'s default repo resolves to `upstream` (cytsunny), NOT origin. Always pass
  `--repo rickyjou/youtube-playlist` to `gh pr create`/`gh pr list`/etc., or `gh pr create`
  fails with a misleading "No commits between main and <branch>" error.
- Feature branches (e.g. `worktree-react-ui-rewrite`) get merged into this fork's own
  `main` via PRs opened on `rickyjou/youtube-playlist`, not upstream.

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
