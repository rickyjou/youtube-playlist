# React UI Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new React + Vite app in `web/` that becomes the GitHub Pages site root (playlist editor with drag-free reordering, inline clip editing, and YouTube-playlist import), while the existing root `index.html` stays byte-for-byte untouched and is deployed unmodified at `/legacy/`.

**Architecture:** A single-page React app with all state in `App.jsx`, driving pure-function utilities (`lib/`) and presentational components (`components/`). YouTube Data API v3 (a referrer-restricted client-side key, injected at build time) replaces the old app's "spin up a hidden player to probe duration" hack and adds playlist-URL import. A GitHub Actions workflow builds `web/`, copies the untouched root `index.html` into the build output as `legacy/index.html`, and deploys the result to Pages.

**Tech Stack:** React 18, Vite 6, Vitest + @testing-library/react for tests, YouTube IFrame Player API (playback) + YouTube Data API v3 (metadata/playlist import), GitHub Actions (`actions/deploy-pages`).

**Spec:** `docs/superpowers/specs/2026-08-28-react-ui-rewrite-design.md`

## Global Constraints

- Never modify, move, or rename the root `index.html` — it is copied verbatim into the deploy output as `legacy/index.html`.
- Playlist data shape stays `{ videoId: string, start: number, end: number }[]` — existing shared links and `playlists/*` files must keep decoding correctly.
- The site remains fully static (no backend/proxy) — the YouTube Data API key is a build-time-injected client key, restricted by HTTP referrer.
- All new source lives under `web/`; nothing at repo root except `.gitignore` and `.github/workflows/deploy.yml` is added.
- Vite `base` must be `/youtube-playlist/` (GitHub Pages project-page path).

---

## Task 1: Scaffold the Vite + React app

**Files:**
- Create: `.gitignore`
- Create: `web/package.json`
- Create: `web/vite.config.js`
- Create: `web/vitest.setup.js`
- Create: `web/index.html`
- Create: `web/src/main.jsx`
- Create: `web/src/App.jsx`
- Create: `web/src/App.css`
- Test: `web/src/App.test.jsx`

**Interfaces:**
- Produces: `App` default-exported React component from `web/src/App.jsx`, rendering a page heading containing "YouTube Playlist" — later tasks replace its body but keep this heading.

- [ ] **Step 1: Create the scaffolding files**

`.gitignore` (repo root):
```
web/node_modules/
web/dist/
web/.env.local
```

`web/package.json`:
```json
{
  "name": "youtube-playlist-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

`web/vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/youtube-playlist/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    globals: true,
  },
})
```

`web/vitest.setup.js`:
```js
import '@testing-library/jest-dom/vitest'
```

`web/index.html` (Vite's own entry template — separate from, and unrelated to, the root `index.html` this project leaves untouched):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>YouTube Playlist Duration Calculator & Player</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`web/src/main.jsx`:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './App.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`web/src/App.css`:
```css
body {
  font-family: system-ui, sans-serif;
  max-width: 1000px;
  margin: 0 auto;
  padding: 16px;
}

.playing {
  font-weight: bold;
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd web && npm install`
Expected: install succeeds, creates `web/node_modules/` and `web/package-lock.json`.

- [ ] **Step 3: Write the failing test**

`web/src/App.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App.jsx'

describe('App', () => {
  it('renders the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /youtube playlist/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd web && npm test -- src/App.test.jsx`
Expected: FAIL — `web/src/App.jsx` does not exist yet.

- [ ] **Step 5: Write minimal implementation**

`web/src/App.jsx`:
```jsx
export default function App() {
  return (
    <div>
      <h1>YouTube Playlist Duration Calculator & Player</h1>
    </div>
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd web && npm test -- src/App.test.jsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add .gitignore web/package.json web/package-lock.json web/vite.config.js web/vitest.setup.js web/index.html web/src/main.jsx web/src/App.jsx web/src/App.css web/src/App.test.jsx
git commit -m "Scaffold Vite + React app in web/"
```

---

## Task 2: Time formatting and total-duration utilities

**Files:**
- Create: `web/src/lib/time.js`
- Test: `web/src/lib/time.test.js`

**Interfaces:**
- Produces: `formatTime(totalSeconds: number): string` — `"M:SS"`, seconds zero-padded.
- Produces: `calculateTotalSeconds(playlist: {start:number,end:number}[]): number`.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/time.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { formatTime, calculateTotalSeconds } from './time.js'

describe('formatTime', () => {
  it('formats seconds under a minute', () => {
    expect(formatTime(45)).toBe('0:45')
  })

  it('pads seconds under 10', () => {
    expect(formatTime(65)).toBe('1:05')
  })

  it('formats multiple minutes', () => {
    expect(formatTime(725)).toBe('12:05')
  })
})

describe('calculateTotalSeconds', () => {
  it('sums durations across clips', () => {
    const playlist = [
      { videoId: 'a', start: 0, end: 100 },
      { videoId: 'b', start: 10, end: 40 },
    ]
    expect(calculateTotalSeconds(playlist)).toBe(130)
  })

  it('returns 0 for an empty playlist', () => {
    expect(calculateTotalSeconds([])).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/lib/time.test.js`
Expected: FAIL — `./time.js` does not exist.

- [ ] **Step 3: Write the implementation**

`web/src/lib/time.js`:
```js
export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`
}

export function calculateTotalSeconds(playlist) {
  return playlist.reduce((total, clip) => total + (clip.end - clip.start), 0)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- src/lib/time.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/time.js web/src/lib/time.test.js
git commit -m "Add time formatting and total-duration utilities"
```

---

## Task 3: Share-link encode/decode utilities

**Files:**
- Create: `web/src/lib/shareUrl.js`
- Test: `web/src/lib/shareUrl.test.js`

**Interfaces:**
- Produces: `decodePlaylistFromUrl(search: string): Array|null` — reads `?playlist=<base64 JSON>`, mirrors the current app's format exactly.
- Produces: `buildShareUrl(playlist: Array, baseUrl: string): string`.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/shareUrl.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { decodePlaylistFromUrl, buildShareUrl } from './shareUrl.js'

describe('decodePlaylistFromUrl', () => {
  it('returns null when there is no playlist param', () => {
    expect(decodePlaylistFromUrl('')).toBeNull()
  })

  it('decodes a base64-encoded JSON playlist', () => {
    const playlist = [{ videoId: 'abc123', start: 0, end: 10 }]
    const encoded = btoa(JSON.stringify(playlist))
    expect(decodePlaylistFromUrl(`?playlist=${encoded}`)).toEqual(playlist)
  })

  it('returns null and logs an error for malformed base64', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(decodePlaylistFromUrl('?playlist=not-valid-base64!!!')).toBeNull()
    spy.mockRestore()
  })
})

describe('buildShareUrl', () => {
  it('encodes the playlist as base64 in the query string', () => {
    const playlist = [{ videoId: 'abc123', start: 0, end: 10 }]
    const url = buildShareUrl(playlist, 'https://example.com/app')
    expect(url).toBe(`https://example.com/app?playlist=${btoa(JSON.stringify(playlist))}`)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/lib/shareUrl.test.js`
Expected: FAIL — `./shareUrl.js` does not exist.

- [ ] **Step 3: Write the implementation**

`web/src/lib/shareUrl.js`:
```js
export function decodePlaylistFromUrl(search) {
  const params = new URLSearchParams(search)
  const playlistParam = params.get('playlist')
  if (!playlistParam) return null
  try {
    const decoded = atob(playlistParam)
    return JSON.parse(decoded)
  } catch (e) {
    console.error('Error loading playlist from URL:', e)
    return null
  }
}

export function buildShareUrl(playlist, baseUrl) {
  const encoded = btoa(JSON.stringify(playlist))
  return `${baseUrl}?playlist=${encoded}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- src/lib/shareUrl.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/shareUrl.js web/src/lib/shareUrl.test.js
git commit -m "Add share-link encode/decode utilities"
```

---

## Task 4: YouTube URL parsing (video vs. playlist)

**Files:**
- Create: `web/src/lib/youtubeInput.js`
- Test: `web/src/lib/youtubeInput.test.js`

**Interfaces:**
- Produces: `parseYouTubeInput(input: string): { type: 'video', videoId: string } | { type: 'playlist', playlistId: string } | { type: 'invalid' }`. A `watch?v=` link wins over a `list=` param on the same URL (adds one clip, matching today's behavior), a bare `playlist?list=` link is treated as a playlist import.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/youtubeInput.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { parseYouTubeInput } from './youtubeInput.js'

describe('parseYouTubeInput', () => {
  it('detects a standard watch URL as a video', () => {
    expect(parseYouTubeInput('https://www.youtube.com/watch?v=6MTbZBg9pQc'))
      .toEqual({ type: 'video', videoId: '6MTbZBg9pQc' })
  })

  it('detects a youtu.be short URL as a video', () => {
    expect(parseYouTubeInput('https://youtu.be/6MTbZBg9pQc'))
      .toEqual({ type: 'video', videoId: '6MTbZBg9pQc' })
  })

  it('detects a playlist URL as a playlist', () => {
    expect(parseYouTubeInput('https://www.youtube.com/playlist?list=PLabcDEF1234567890'))
      .toEqual({ type: 'playlist', playlistId: 'PLabcDEF1234567890' })
  })

  it('prefers the video when a watch URL also has a list param', () => {
    expect(parseYouTubeInput('https://www.youtube.com/watch?v=6MTbZBg9pQc&list=PLabcDEF1234567890'))
      .toEqual({ type: 'video', videoId: '6MTbZBg9pQc' })
  })

  it('rejects a non-YouTube URL', () => {
    expect(parseYouTubeInput('https://example.com/watch?v=6MTbZBg9pQc'))
      .toEqual({ type: 'invalid' })
  })

  it('rejects a plain non-URL string', () => {
    expect(parseYouTubeInput('not a url')).toEqual({ type: 'invalid' })
  })

  it('rejects empty input', () => {
    expect(parseYouTubeInput('')).toEqual({ type: 'invalid' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/lib/youtubeInput.test.js`
Expected: FAIL — `./youtubeInput.js` does not exist.

- [ ] **Step 3: Write the implementation**

`web/src/lib/youtubeInput.js`:
```js
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/
const PLAYLIST_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export function parseYouTubeInput(input) {
  if (!input || typeof input !== 'string') return { type: 'invalid' }

  let url
  try {
    url = new URL(input.trim())
  } catch {
    return { type: 'invalid' }
  }

  if (!/(^|\.)youtube\.com$/.test(url.hostname) && url.hostname !== 'youtu.be') {
    return { type: 'invalid' }
  }

  const playlistId = url.searchParams.get('list')
  const videoId = url.hostname === 'youtu.be'
    ? url.pathname.slice(1)
    : url.searchParams.get('v')

  if (videoId && VIDEO_ID_PATTERN.test(videoId)) {
    return { type: 'video', videoId }
  }

  if (playlistId && PLAYLIST_ID_PATTERN.test(playlistId)) {
    return { type: 'playlist', playlistId }
  }

  return { type: 'invalid' }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- src/lib/youtubeInput.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/youtubeInput.js web/src/lib/youtubeInput.test.js
git commit -m "Add YouTube video/playlist URL parsing"
```

---

## Task 5: YouTube Data API — video metadata lookup

**Files:**
- Create: `web/src/lib/youtubeApi.js`
- Test: `web/src/lib/youtubeApi.test.js`

**Interfaces:**
- Produces: `fetchVideoMetadata(videoIds: string[], apiKey: string): Promise<Record<string, {title: string, thumbnail: string, durationSeconds: number}>>`. Batches requests in groups of 50 IDs (the Data API limit) and throws `Error('YouTube Data API error: <status>')` on a non-OK response.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/youtubeApi.test.js`:
```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchVideoMetadata } from './youtubeApi.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchVideoMetadata', () => {
  it('maps API response items into a videoId-keyed metadata record', async () => {
    const mockResponse = {
      items: [
        {
          id: 'abc123',
          snippet: { title: 'Test Video', thumbnails: { default: { url: 'https://img/abc123.jpg' } } },
          contentDetails: { duration: 'PT1M5S' },
        },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    const result = await fetchVideoMetadata(['abc123'], 'test-key')

    expect(result).toEqual({
      abc123: { title: 'Test Video', thumbnail: 'https://img/abc123.jpg', durationSeconds: 65 },
    })
  })

  it('batches requests in groups of 50 video IDs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) })
    vi.stubGlobal('fetch', fetchMock)

    const videoIds = Array.from({ length: 75 }, (_, i) => `id${i}`)
    await fetchVideoMetadata(videoIds, 'test-key')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws when the API responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(fetchVideoMetadata(['abc123'], 'bad-key')).rejects.toThrow('YouTube Data API error: 403')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/lib/youtubeApi.test.js`
Expected: FAIL — `./youtubeApi.js` does not exist.

- [ ] **Step 3: Write the implementation**

`web/src/lib/youtubeApi.js`:
```js
const API_BASE = 'https://www.googleapis.com/youtube/v3'

function parseIsoDuration(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  if (!match) return 0
  const [, hours, minutes, seconds] = match
  return (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0)
}

function chunk(array, size) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export async function fetchVideoMetadata(videoIds, apiKey) {
  const metadata = {}
  for (const batch of chunk(videoIds, 50)) {
    const url = `${API_BASE}/videos?part=snippet,contentDetails&id=${batch.join(',')}&key=${apiKey}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`YouTube Data API error: ${response.status}`)
    }
    const data = await response.json()
    for (const item of data.items) {
      metadata[item.id] = {
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.default?.url ?? '',
        durationSeconds: parseIsoDuration(item.contentDetails.duration),
      }
    }
  }
  return metadata
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- src/lib/youtubeApi.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/youtubeApi.js web/src/lib/youtubeApi.test.js
git commit -m "Add YouTube Data API video metadata lookup"
```

---

## Task 6: YouTube Data API — playlist enumeration

**Files:**
- Modify: `web/src/lib/youtubeApi.js` (add export, keep `fetchVideoMetadata` and helpers unchanged)
- Modify: `web/src/lib/youtubeApi.test.js` (add tests, keep existing ones)

**Interfaces:**
- Consumes: `API_BASE` constant already defined in this file (Task 5).
- Produces: `fetchPlaylistVideoIds(playlistId: string, apiKey: string): Promise<string[]>` — paginates through `playlistItems.list` and returns every video ID in playlist order.

- [ ] **Step 1: Write the failing test**

Append to `web/src/lib/youtubeApi.test.js`:
```js
import { fetchPlaylistVideoIds } from './youtubeApi.js'
```
(add this named import to the existing `import { fetchVideoMetadata } from './youtubeApi.js'` line instead of a separate line)

```js
describe('fetchPlaylistVideoIds', () => {
  it('collects video IDs across paginated responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ contentDetails: { videoId: 'a' } }, { contentDetails: { videoId: 'b' } }],
          nextPageToken: 'PAGE2',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ contentDetails: { videoId: 'c' } }],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPlaylistVideoIds('PLxxxx', 'test-key')

    expect(result).toEqual(['a', 'b', 'c'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `cd web && npm test -- src/lib/youtubeApi.test.js`
Expected: FAIL — `fetchPlaylistVideoIds` is not exported.

- [ ] **Step 3: Add the implementation**

Add to `web/src/lib/youtubeApi.js` (after `fetchVideoMetadata`):
```js
export async function fetchPlaylistVideoIds(playlistId, apiKey) {
  const videoIds = []
  let pageToken = ''
  do {
    const url = `${API_BASE}/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`YouTube Data API error: ${response.status}`)
    }
    const data = await response.json()
    for (const item of data.items) {
      videoIds.push(item.contentDetails.videoId)
    }
    pageToken = data.nextPageToken ?? ''
  } while (pageToken)
  return videoIds
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `cd web && npm test -- src/lib/youtubeApi.test.js`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/youtubeApi.js web/src/lib/youtubeApi.test.js
git commit -m "Add YouTube Data API playlist enumeration"
```

---

## Task 7: YouTubePlayer component

**Files:**
- Create: `web/src/components/YouTubePlayer.jsx`
- Test: `web/src/components/YouTubePlayer.test.jsx`

**Interfaces:**
- Produces: `YouTubePlayer({ videoId: string, start: number, end: number, onEnded: () => void })` default export. Creates the YT player once on mount; subsequent prop changes call `loadVideoById` on the existing player instead of recreating it.

- [ ] **Step 1: Write the failing tests**

`web/src/components/YouTubePlayer.test.jsx`:
```jsx
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import YouTubePlayer from './YouTubePlayer.jsx'

describe('YouTubePlayer', () => {
  let PlayerMock

  beforeEach(() => {
    PlayerMock = vi.fn().mockImplementation(function (element, config) {
      this.config = config
      this.loadVideoById = vi.fn()
      this.destroy = vi.fn()
    })
    window.YT = {
      Player: PlayerMock,
      PlayerState: { ENDED: 0 },
    }
  })

  it('creates a YT.Player with the given clip on mount', async () => {
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} />)

    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))
    const [, config] = PlayerMock.mock.calls[0]
    expect(config.videoId).toBe('abc123')
    expect(config.playerVars).toEqual({ start: 5, end: 50 })
  })

  it('calls loadVideoById instead of recreating the player when the clip changes', async () => {
    const { rerender } = render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    rerender(<YouTubePlayer videoId="xyz789" start={0} end={30} onEnded={() => {}} />)

    const instance = PlayerMock.mock.instances[0]
    await waitFor(() => expect(instance.loadVideoById).toHaveBeenCalledWith({
      videoId: 'xyz789',
      startSeconds: 0,
      endSeconds: 30,
    }))
    expect(PlayerMock).toHaveBeenCalledTimes(1)
  })

  it('calls onEnded when the player reports the ENDED state', async () => {
    const onEnded = vi.fn()
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={onEnded} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    const [, config] = PlayerMock.mock.calls[0]
    config.events.onStateChange({ data: window.YT.PlayerState.ENDED })

    expect(onEnded).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/components/YouTubePlayer.test.jsx`
Expected: FAIL — `./YouTubePlayer.jsx` does not exist.

- [ ] **Step 3: Write the implementation**

`web/src/components/YouTubePlayer.jsx`:
```jsx
import { useEffect, useRef } from 'react'

let iframeApiPromise = null

function loadYouTubeIframeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT)
  }
  if (!iframeApiPromise) {
    iframeApiPromise = new Promise((resolve) => {
      window.onYouTubeIframeAPIReady = () => resolve(window.YT)
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
    })
  }
  return iframeApiPromise
}

export default function YouTubePlayer({ videoId, start, end, onEnded }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const clipRef = useRef({ videoId, start, end })
  clipRef.current = { videoId, start, end }

  useEffect(() => {
    let cancelled = false

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return
      playerRef.current = new YT.Player(containerRef.current, {
        height: '500',
        width: '1000',
        videoId: clipRef.current.videoId,
        playerVars: {
          start: clipRef.current.start,
          end: clipRef.current.end,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) {
              onEnded()
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      playerRef.current?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!playerRef.current?.loadVideoById) return
    playerRef.current.loadVideoById({
      videoId,
      startSeconds: start,
      endSeconds: end,
    })
  }, [videoId, start, end])

  return <div ref={containerRef} />
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- src/components/YouTubePlayer.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/YouTubePlayer.jsx web/src/components/YouTubePlayer.test.jsx
git commit -m "Add YouTubePlayer component wrapping the YouTube IFrame API"
```

---

## Task 8: PlaylistView component

**Files:**
- Create: `web/src/components/PlaylistView.jsx`
- Test: `web/src/components/PlaylistView.test.jsx`

**Interfaces:**
- Consumes: `formatTime`, `calculateTotalSeconds` from `../lib/time.js` (Task 2).
- Produces: `PlaylistView({ playlist, currentIndex, metadata, onUpdateClip, onDeleteClip, onMoveClip })` default export.
  - `onUpdateClip(index: number, changes: {start: number, end: number}): void`
  - `onDeleteClip(index: number): void`
  - `onMoveClip(index: number, direction: -1 | 1): void`
  - `metadata: Record<videoId, {title, thumbnail, durationSeconds}>` — optional per entry; falls back to showing the raw `videoId` when absent.

- [ ] **Step 1: Write the failing tests**

`web/src/components/PlaylistView.test.jsx`:
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PlaylistView from './PlaylistView.jsx'

const playlist = [
  { videoId: 'a', start: 0, end: 60 },
  { videoId: 'b', start: 10, end: 40 },
]

function renderView(overrides = {}) {
  const handlers = {
    onUpdateClip: vi.fn(),
    onDeleteClip: vi.fn(),
    onMoveClip: vi.fn(),
    ...overrides,
  }
  render(
    <PlaylistView
      playlist={playlist}
      currentIndex={0}
      metadata={{}}
      {...handlers}
    />
  )
  return handlers
}

describe('PlaylistView', () => {
  it('renders one row per clip with its videoId as a fallback title', () => {
    renderView()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('shows the total formatted duration across all clips', () => {
    renderView()
    expect(screen.getByText('Total time: 1:30')).toBeInTheDocument()
  })

  it('calls onUpdateClip with the new end time when an end input changes', () => {
    const { onUpdateClip } = renderView()
    const endInputs = screen.getAllByLabelText('End')
    fireEvent.change(endInputs[0], { target: { value: '90' } })
    expect(onUpdateClip).toHaveBeenCalledWith(0, { start: 0, end: 90 })
  })

  it('calls onDeleteClip with the row index', () => {
    const { onDeleteClip } = renderView()
    fireEvent.click(screen.getAllByText('Delete')[1])
    expect(onDeleteClip).toHaveBeenCalledWith(1)
  })

  it('disables the up-move button on the first row and the down-move button on the last', () => {
    renderView()
    const upButtons = screen.getAllByText('↑')
    const downButtons = screen.getAllByText('↓')
    expect(upButtons[0]).toBeDisabled()
    expect(downButtons[1]).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/components/PlaylistView.test.jsx`
Expected: FAIL — `./PlaylistView.jsx` does not exist.

- [ ] **Step 3: Write the implementation**

`web/src/components/PlaylistView.jsx`:
```jsx
import { formatTime, calculateTotalSeconds } from '../lib/time.js'

export default function PlaylistView({ playlist, currentIndex, metadata, onUpdateClip, onDeleteClip, onMoveClip }) {
  const totalSeconds = calculateTotalSeconds(playlist)

  return (
    <section className="playlist-view">
      <ol>
        {playlist.map((clip, index) => {
          const meta = metadata[clip.videoId]
          return (
            <li key={`${clip.videoId}-${index}`} className={index === currentIndex ? 'playing' : ''}>
              {meta?.thumbnail && <img src={meta.thumbnail} alt="" width="60" />}
              <span className="clip-title">{meta?.title ?? clip.videoId}</span>
              <label>
                Start
                <input
                  type="number"
                  min="0"
                  value={clip.start}
                  onChange={(event) => onUpdateClip(index, { start: Number(event.target.value), end: clip.end })}
                />
              </label>
              <label>
                End
                <input
                  type="number"
                  min="0"
                  value={clip.end}
                  onChange={(event) => onUpdateClip(index, { start: clip.start, end: Number(event.target.value) })}
                />
              </label>
              <button type="button" onClick={() => onMoveClip(index, -1)} disabled={index === 0}>
                ↑
              </button>
              <button type="button" onClick={() => onMoveClip(index, 1)} disabled={index === playlist.length - 1}>
                ↓
              </button>
              <button type="button" onClick={() => onDeleteClip(index)}>
                Delete
              </button>
            </li>
          )
        })}
      </ol>
      <p>Total time: {formatTime(totalSeconds)}</p>
    </section>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- src/components/PlaylistView.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/PlaylistView.jsx web/src/components/PlaylistView.test.jsx
git commit -m "Add interactive PlaylistView component"
```

---

## Task 9: AddClipInput component

**Files:**
- Create: `web/src/components/AddClipInput.jsx`
- Test: `web/src/components/AddClipInput.test.jsx`

**Interfaces:**
- Consumes: `parseYouTubeInput` (Task 4), `fetchVideoMetadata`/`fetchPlaylistVideoIds` (Tasks 5–6).
- Produces: `AddClipInput({ apiKey: string, onAddClips: (clips: {videoId,start,end}[], metadata: Record<videoId, meta>) => void })` default export. A blank "End" field means "use the full fetched duration"; typing an explicit value (including `0`) is taken literally.

- [ ] **Step 1: Write the failing tests**

`web/src/components/AddClipInput.test.jsx`:
```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AddClipInput from './AddClipInput.jsx'
import * as youtubeApi from '../lib/youtubeApi.js'

vi.mock('../lib/youtubeApi.js')

describe('AddClipInput', () => {
  it('adds a single clip using the fetched duration when no end time is given', async () => {
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      abc123: { title: 'Test', thumbnail: '', durationSeconds: 120 },
    })
    const onAddClips = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/watch?v=abc123' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(onAddClips).toHaveBeenCalledWith(
      [{ videoId: 'abc123', start: 0, end: 120 }],
      { abc123: { title: 'Test', thumbnail: '', durationSeconds: 120 } },
    ))
  })

  it('imports every video in a playlist link', async () => {
    youtubeApi.fetchPlaylistVideoIds.mockResolvedValue(['v1', 'v2'])
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      v1: { title: 'One', thumbnail: '', durationSeconds: 60 },
      v2: { title: 'Two', thumbnail: '', durationSeconds: 90 },
    })
    const onAddClips = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PLxyz' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(onAddClips).toHaveBeenCalledWith(
      [
        { videoId: 'v1', start: 0, end: 60 },
        { videoId: 'v2', start: 0, end: 90 },
      ],
      expect.any(Object),
    ))
  })

  it('shows an error and does not call onAddClips for an invalid link', async () => {
    const onAddClips = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), { target: { value: 'not a link' } })
    fireEvent.click(screen.getByText('Add'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid YouTube/i)
    expect(onAddClips).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/components/AddClipInput.test.jsx`
Expected: FAIL — `./AddClipInput.jsx` does not exist.

- [ ] **Step 3: Write the implementation**

`web/src/components/AddClipInput.jsx`:
```jsx
import { useState } from 'react'
import { parseYouTubeInput } from '../lib/youtubeInput.js'
import { fetchVideoMetadata, fetchPlaylistVideoIds } from '../lib/youtubeApi.js'

export default function AddClipInput({ apiKey, onAddClips }) {
  const [url, setUrl] = useState('')
  const [start, setStart] = useState('0')
  const [end, setEnd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const parsed = parseYouTubeInput(url)
    if (parsed.type === 'invalid') {
      setError('Please enter a valid YouTube video or playlist link.')
      return
    }

    setLoading(true)
    try {
      if (parsed.type === 'video') {
        const metadata = await fetchVideoMetadata([parsed.videoId], apiKey)
        const meta = metadata[parsed.videoId]
        const startSeconds = Number(start) || 0
        const endSeconds = end !== '' ? Number(end) : meta?.durationSeconds ?? 0
        onAddClips([{ videoId: parsed.videoId, start: startSeconds, end: endSeconds }], metadata)
      } else {
        const videoIds = await fetchPlaylistVideoIds(parsed.playlistId, apiKey)
        const metadata = await fetchVideoMetadata(videoIds, apiKey)
        const clips = videoIds.map((videoId) => ({
          videoId,
          start: 0,
          end: metadata[videoId]?.durationSeconds ?? 0,
        }))
        onAddClips(clips, metadata)
      }
      setUrl('')
      setStart('0')
      setEnd('')
    } catch (e) {
      setError(`Could not fetch video info: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add a video or playlist</h2>
      <label>
        YouTube link
        <input
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=... or .../playlist?list=..."
        />
      </label>
      <label>
        Start (seconds, video links only)
        <input type="number" min="0" value={start} onChange={(event) => setStart(event.target.value)} />
      </label>
      <label>
        End (seconds, blank = full duration, video links only)
        <input type="number" min="0" value={end} onChange={(event) => setEnd(event.target.value)} />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Adding…' : 'Add'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- src/components/AddClipInput.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/AddClipInput.jsx web/src/components/AddClipInput.test.jsx
git commit -m "Add smart video/playlist input component"
```

---

## Task 10: RawJsonPanel component (advanced escape hatch)

**Files:**
- Create: `web/src/components/RawJsonPanel.jsx`
- Test: `web/src/components/RawJsonPanel.test.jsx`

**Interfaces:**
- Produces: `RawJsonPanel({ playlist, onReplacePlaylist, onReset })` default export.
  - `onReplacePlaylist(newPlaylist: Array): void`
  - `onReset(): void`
  - Collapsed by default; textarea always mirrors the current `playlist` prop.

- [ ] **Step 1: Write the failing tests**

`web/src/components/RawJsonPanel.test.jsx`:
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RawJsonPanel from './RawJsonPanel.jsx'

describe('RawJsonPanel', () => {
  it('is collapsed by default', () => {
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={vi.fn()} onReset={vi.fn()} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('parses valid JSON and calls onReplacePlaylist', () => {
    const onReplacePlaylist = vi.fn()
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={onReplacePlaylist} onReset={vi.fn()} />)

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '[{"videoId":"a","start":0,"end":10}]' },
    })
    fireEvent.click(screen.getByText('Update and Play from beginning'))

    expect(onReplacePlaylist).toHaveBeenCalledWith([{ videoId: 'a', start: 0, end: 10 }])
  })

  it('shows an error for malformed JSON instead of calling onReplacePlaylist', () => {
    const onReplacePlaylist = vi.fn()
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={onReplacePlaylist} onReset={vi.fn()} />)

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not json' } })
    fireEvent.click(screen.getByText('Update and Play from beginning'))

    expect(screen.getByRole('alert')).toHaveTextContent('JSON format error')
    expect(onReplacePlaylist).not.toHaveBeenCalled()
  })

  it('calls onReset after the user confirms clearing the playlist', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onReset = vi.fn()
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={vi.fn()} onReset={onReset} />)

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.click(screen.getByText('Reset and Remove All Videos'))

    expect(onReset).toHaveBeenCalled()
    window.confirm.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/components/RawJsonPanel.test.jsx`
Expected: FAIL — `./RawJsonPanel.jsx` does not exist.

- [ ] **Step 3: Write the implementation**

`web/src/components/RawJsonPanel.jsx`:
```jsx
import { useEffect, useState } from 'react'

export default function RawJsonPanel({ playlist, onReplacePlaylist, onReset }) {
  const [text, setText] = useState(JSON.stringify(playlist))
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setText(JSON.stringify(playlist))
  }, [playlist])

  function handleUpdate() {
    try {
      const parsed = JSON.parse(text)
      setError('')
      onReplacePlaylist(parsed)
    } catch {
      setError('JSON format error. Please check your input and try again.')
    }
  }

  function handleReset() {
    if (window.confirm('Are you sure you want to remove all videos from the playlist?')) {
      onReset()
    }
  }

  return (
    <section>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide advanced JSON editor' : 'Show advanced JSON editor'}
      </button>
      {open && (
        <div>
          <textarea
            rows={10}
            cols={70}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <br />
          <button type="button" onClick={handleUpdate}>
            Update and Play from beginning
          </button>
          <button type="button" onClick={handleReset}>
            Reset and Remove All Videos
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- src/components/RawJsonPanel.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/RawJsonPanel.jsx web/src/components/RawJsonPanel.test.jsx
git commit -m "Add collapsible raw-JSON advanced editor panel"
```

---

## Task 11: ShareLink component

**Files:**
- Create: `web/src/components/ShareLink.jsx`
- Test: `web/src/components/ShareLink.test.jsx`

**Interfaces:**
- Consumes: `buildShareUrl` from `../lib/shareUrl.js` (Task 3).
- Produces: `ShareLink({ playlist })` default export.

- [ ] **Step 1: Write the failing tests**

`web/src/components/ShareLink.test.jsx`:
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ShareLink from './ShareLink.jsx'

const playlist = [{ videoId: 'abc123', start: 0, end: 10 }]

describe('ShareLink', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  it('does not show the link input until generated', () => {
    render(<ShareLink playlist={playlist} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('generates a link containing the base64-encoded playlist', () => {
    render(<ShareLink playlist={playlist} />)
    fireEvent.click(screen.getByText('Generate Shareable Link'))

    const input = screen.getByRole('textbox')
    expect(input.value).toContain(btoa(JSON.stringify(playlist)))
  })

  it('copies the generated link to the clipboard', () => {
    render(<ShareLink playlist={playlist} />)
    fireEvent.click(screen.getByText('Generate Shareable Link'))
    fireEvent.click(screen.getByText('Copy Link'))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining(btoa(JSON.stringify(playlist))),
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/components/ShareLink.test.jsx`
Expected: FAIL — `./ShareLink.jsx` does not exist.

- [ ] **Step 3: Write the implementation**

`web/src/components/ShareLink.jsx`:
```jsx
import { useState } from 'react'
import { buildShareUrl } from '../lib/shareUrl.js'

export default function ShareLink({ playlist }) {
  const [link, setLink] = useState('')

  function handleGenerate() {
    const baseUrl = window.location.origin + window.location.pathname
    setLink(buildShareUrl(playlist, baseUrl))
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
  }

  return (
    <section>
      <button type="button" onClick={handleGenerate}>
        Generate Shareable Link
      </button>
      {link && (
        <div>
          <input type="text" readOnly value={link} />
          <button type="button" onClick={handleCopy}>
            Copy Link
          </button>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test -- src/components/ShareLink.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ShareLink.jsx web/src/components/ShareLink.test.jsx
git commit -m "Add ShareLink component"
```

---

## Task 12: Wire everything together in App

**Files:**
- Modify: `web/src/App.jsx`
- Modify: `web/src/App.test.jsx`

**Interfaces:**
- Consumes: `YouTubePlayer` (Task 7), `PlaylistView` (Task 8), `AddClipInput` (Task 9), `RawJsonPanel` (Task 10), `ShareLink` (Task 11), `decodePlaylistFromUrl` (Task 3).
- Produces: the full `App` component — default demo playlist `[{videoId:'6MTbZBg9pQc',start:0,end:761},{videoId:'gUSWWqnOKt0',start:0,end:140}]` (same as today's app) used only when no `?playlist=` param is present.

- [ ] **Step 1: Write the failing tests**

Replace `web/src/App.test.jsx` entirely:
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import App from './App.jsx'

vi.mock('./components/YouTubePlayer.jsx', () => ({
  default: ({ videoId, onEnded }) => (
    <div data-testid="player">
      {videoId}
      <button onClick={onEnded}>simulate ended</button>
    </div>
  ),
}))

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renders the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /youtube playlist/i })).toBeInTheDocument()
  })

  it('starts with the default demo playlist when no share link is present', () => {
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')
  })

  it('loads the playlist from a shared URL instead of the default', () => {
    const shared = [{ videoId: 'shared1', start: 0, end: 20 }]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)

    render(<App />)

    expect(screen.getByTestId('player')).toHaveTextContent('shared1')
  })

  it('advances to the next clip when the player reports the current clip ended', () => {
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')

    fireEvent.click(screen.getByText('simulate ended'))

    expect(screen.getByTestId('player')).toHaveTextContent('gUSWWqnOKt0')
  })

  it('shows the next clip after deleting the currently playing one', () => {
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')

    fireEvent.click(screen.getAllByText('Delete')[0])

    expect(screen.getByTestId('player')).toHaveTextContent('gUSWWqnOKt0')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- src/App.test.jsx`
Expected: FAIL — current `App.jsx` has no playlist/player wiring.

- [ ] **Step 3: Write the implementation**

Replace `web/src/App.jsx` entirely:
```jsx
import { useState } from 'react'
import YouTubePlayer from './components/YouTubePlayer.jsx'
import PlaylistView from './components/PlaylistView.jsx'
import AddClipInput from './components/AddClipInput.jsx'
import RawJsonPanel from './components/RawJsonPanel.jsx'
import ShareLink from './components/ShareLink.jsx'
import { decodePlaylistFromUrl } from './lib/shareUrl.js'

const DEFAULT_PLAYLIST = [
  { videoId: '6MTbZBg9pQc', start: 0, end: 761 },
  { videoId: 'gUSWWqnOKt0', start: 0, end: 140 },
]

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

export default function App() {
  const [playlist, setPlaylist] = useState(
    () => decodePlaylistFromUrl(window.location.search) ?? DEFAULT_PLAYLIST,
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [metadata, setMetadata] = useState({})

  function handleAddClips(newClips, newMetadata) {
    setPlaylist((current) => [...current, ...newClips])
    setMetadata((current) => ({ ...current, ...newMetadata }))
  }

  function handleUpdateClip(index, changes) {
    setPlaylist((current) =>
      current.map((clip, i) => (i === index ? { ...clip, ...changes } : clip)),
    )
  }

  function handleDeleteClip(index) {
    setPlaylist((current) => current.filter((_, i) => i !== index))
    setCurrentIndex((current) => (index < current ? current - 1 : current))
  }

  function handleMoveClip(index, direction) {
    setPlaylist((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function handleReplacePlaylist(newPlaylist) {
    setPlaylist(newPlaylist)
    setCurrentIndex(0)
  }

  function handleReset() {
    setPlaylist([])
    setCurrentIndex(0)
  }

  function handleEnded() {
    setCurrentIndex((current) => current + 1)
  }

  const currentClip = playlist[currentIndex]

  return (
    <div>
      <a href="https://github.com/rickyjou/youtube-playlist">Github Repository</a>
      <h1>YouTube Playlist Duration Calculator & Player</h1>
      {currentClip && (
        <YouTubePlayer
          videoId={currentClip.videoId}
          start={currentClip.start}
          end={currentClip.end}
          onEnded={handleEnded}
        />
      )}
      <PlaylistView
        playlist={playlist}
        currentIndex={currentIndex}
        metadata={metadata}
        onUpdateClip={handleUpdateClip}
        onDeleteClip={handleDeleteClip}
        onMoveClip={handleMoveClip}
      />
      <AddClipInput apiKey={API_KEY} onAddClips={handleAddClips} />
      <ShareLink playlist={playlist} />
      <RawJsonPanel playlist={playlist} onReplacePlaylist={handleReplacePlaylist} onReset={handleReset} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm test`
Expected: PASS — every test file in the project (all tasks so far) passes.

- [ ] **Step 5: Commit**

```bash
git add web/src/App.jsx web/src/App.test.jsx
git commit -m "Wire playlist state and all components together in App"
```

---

## Task 13: GitHub Actions build & deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `web/.env.local.example`

**Interfaces:**
- Consumes: `web/package.json` build script (Task 1), root `index.html` (untouched, pre-existing).
- Produces: on push to `main`, a Pages deployment where `/` serves `web/dist` and `/legacy/` serves the untouched root `index.html`.

- [ ] **Step 1: Write the workflow file**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        working-directory: web
        run: npm ci

      - name: Build
        working-directory: web
        env:
          VITE_YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
        run: npm run build

      - name: Copy legacy page into build output
        run: |
          mkdir -p web/dist/legacy
          cp index.html web/dist/legacy/index.html

      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`web/.env.local.example`:
```
VITE_YOUTUBE_API_KEY=your-api-key-here
```

- [ ] **Step 2: Verify the workflow YAML is well-formed**

Run: `python3 -c "import json,sys; import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" 2>/dev/null || node -e "require('fs').readFileSync('.github/workflows/deploy.yml','utf8')"`
Expected: no syntax errors reported. (Full end-to-end verification — the workflow actually running and deploying — happens once the three manual one-time steps below are complete and this is pushed; that part is out of scope for this repo-local plan and will be done by the user.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml web/.env.local.example
git commit -m "Add GitHub Actions build/deploy workflow for Pages"
```

- [ ] **Step 4: Note the manual steps for the user (not automatable)**

Tell the user, after this task is committed:
1. Create a YouTube Data API v3 key in Google Cloud Console; restrict it to the `rickyjou.github.io` HTTP referrer.
2. Add it as a GitHub Actions repository secret named `YOUTUBE_API_KEY` (Settings → Secrets and variables → Actions).
3. In the repo's Settings → Pages, change the source to "GitHub Actions".
4. For local testing: `cp web/.env.local.example web/.env.local` and fill in a personal (unrestricted or localhost-restricted) API key, then `cd web && npm run dev`.

---

## Final verification

- [ ] Run the full test suite: `cd web && npm test` — expect all tests across all `lib/` and `components/` files plus `App.test.jsx` to pass.
- [ ] Run the production build: `cd web && npm run build` — expect it to succeed and produce `web/dist/index.html` plus JS/CSS assets.
- [ ] Confirm root `index.html` is unchanged: `git log --follow -p -- index.html` shows no commits from this plan touching it.
- [ ] Confirm the legacy-copy step: after a build, manually run `mkdir -p web/dist/legacy && cp index.html web/dist/legacy/index.html` and diff `web/dist/legacy/index.html` against the root `index.html` — they must be identical.
