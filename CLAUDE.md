# youtube-playlist

## Dev workflow (in `web/`)
- `npm run dev` → http://localhost:5183/youtube-playlist/ (Vite base path is `/youtube-playlist/`)
- `npm run test` (vitest) — run before claiming any change complete

## GitHub / PRs
- Two remotes: `origin` = `rickyjou/youtube-playlist` (this fork, where feature branches
  live and get merged), `upstream` = `cytsunny/youtube-playlist`.
- `gh`'s default repo resolves to `upstream` (cytsunny), NOT origin. Always pass
  `--repo rickyjou/youtube-playlist` to `gh pr create`/`gh pr list`/etc., or `gh pr create`
  fails with a misleading "No commits between main and <branch>" error.
- Feature branches (e.g. `worktree-react-ui-rewrite`) get merged into this fork's own
  `main` via PRs opened on `rickyjou/youtube-playlist`, not upstream.
