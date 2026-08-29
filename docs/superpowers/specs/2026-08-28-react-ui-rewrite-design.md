# React UI Rewrite — Design

## Context

The current app is a single self-contained `index.html` (inline `<style>`/`<script>`) served directly from `main` via GitHub Pages, with no build step. It lets a user assemble a playlist of YouTube clips (video ID + start/end seconds), play them back-to-back via the YouTube IFrame API, edit the playlist as raw JSON, and share it via a base64-encoded URL query param. There's also a `playlists/` folder of raw JSON exports, not currently wired into the app.

Goal: modernize the UI as a React app with a polished editor, while never touching or breaking the existing `index.html`, and continuing to deploy for free on GitHub Pages.

## Coexistence strategy

The git source tree and the deployed Pages output are different things:

- `index.html` stays exactly where it is in git, untouched, at repo root.
- The new React app's source lives in `web/` (its own `package.json`, `vite.config.js`, `src/`).
- A GitHub Actions workflow builds `web/` and assembles the deploy output so that the new app becomes the site root, and the untouched `index.html` is copied into the deploy output as `/legacy/index.html` — a permanent, unmodified fallback.

Deployed result:
- `https://rickyjou.github.io/youtube-playlist/` → new React app (default).
- `https://rickyjou.github.io/youtube-playlist/legacy/` → old page, byte-for-byte the current `index.html`.

## Stack

React + Vite. Chosen over Svelte and no-framework-vanilla for ecosystem familiarity and component fit for the player/editor.

## Data model

Unchanged from today, for backward compatibility with existing shared links and `playlists/*` files:

```js
{ videoId: string, start: number /* seconds */, end: number /* seconds */ }[]
```

State lives in `App.jsx` via `useState`/`useReducer` (no Redux — too small to warrant it): `playlist` array plus `currentIndex`.

## Components

- **`App`** — owns state; on mount, decodes `?playlist=<base64>` from the URL the same way the current app does; orchestrates children.
- **`YouTubePlayer`** — wraps the YouTube IFrame API (imperative/callback-based) in a `useEffect`/ref; calls back up to `App` on video end to advance `currentIndex`. Isolated here so the rest of the app stays idiomatic React.
- **`PlaylistView`** — interactive ordered list: thumbnail + title per clip (fetched via oEmbed or the Data API), inline-editable start/end, delete, drag-to-reorder, current-clip indicator, running total time — a component replacement for today's `updatePlayList()`/`formatTime()` string-building.
- **`AddClipInput`** — single smart input: paste any YouTube URL.
  - `watch?v=` → adds one clip (same "probe duration via a hidden temp player if no end time given" flow as today).
  - `list=` / `playlist?list=` → fetches every video in the playlist via YouTube Data API v3 `playlistItems.list` (paginated) and adds each as a full-duration clip (`start=0`, `end=`video duration), individually editable afterward in `PlaylistView`.
- **`ShareLink`** — generate/copy the shareable base64 URL; unchanged logic.
- **`RawJsonPanel`** *(collapsed "Advanced" section)* — read/write JSON view, kept as an escape hatch for bulk edits and copy-paste into `playlists/` files; not the primary UI.

## YouTube Data API key handling

Playlist import needs YouTube Data API v3 (the IFrame Player API alone can play a playlist by ID but can't enumerate its videos). Since this stays a static, backend-less site, the key ships in the client bundle:

- Stored as a GitHub Actions repository secret (`YOUTUBE_API_KEY`), never committed to source.
- Injected at build time as `VITE_YOUTUBE_API_KEY`, baked into the bundle by `vite build`.
- Must be **HTTP-referrer-restricted to `rickyjou.github.io`** in Google Cloud Console — the standard mitigation for an inherently-public client-side key.
- Local dev uses a personal key in a gitignored `.env.local`.

## Build & deploy pipeline

`.github/workflows/deploy.yml`, triggered on push to `main`:
1. Checkout, `npm ci` in `web/`.
2. `npm run build` in `web/` with `VITE_YOUTUBE_API_KEY` from secrets → `web/dist/`.
3. Copy root `index.html` into `web/dist/legacy/index.html`.
4. Upload `web/dist/` as a Pages artifact; deploy via `actions/deploy-pages`.

Local dev: `cd web && npm run dev`.

### One-time manual steps (not automatable — the user must do these)
1. Create a YouTube Data API v3 key in Google Cloud Console; restrict it to the `rickyjou.github.io` HTTP referrer.
2. Add it as a GitHub Actions repository secret named `YOUTUBE_API_KEY`.
3. In the repo's Settings → Pages, change the source to "GitHub Actions" (currently "Deploy from a branch").

## Testing / verification

- Vitest unit tests for pure logic: time formatting, total-duration calculation, video-vs-playlist URL detection/parsing.
- Manual post-deploy verification: `/` loads the new app, `/legacy/` loads the old page unchanged, a share link round-trips correctly, and playlist-URL import populates editable clips.
- No heavy e2e suite — scope stays proportionate to a small tool.

## Out of scope

- Any change to `index.html` itself.
- A backend/proxy for the YouTube Data API key (site stays fully static).
- Redesigning the data model or breaking backward compatibility with existing shared links / `playlists/*` files.
