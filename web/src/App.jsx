import { useEffect, useRef, useState } from 'react'
import YouTubePlayer from './components/YouTubePlayer.jsx'
import PlaylistView from './components/PlaylistView.jsx'
import AddClipInput from './components/AddClipInput.jsx'
import RawJsonPanel from './components/RawJsonPanel.jsx'
import ShareLink from './components/ShareLink.jsx'
import SharedClock from './components/SharedClock.jsx'
import CountdownOverlay from './components/CountdownOverlay.jsx'
import { decodePlaylistFromUrl } from './lib/shareUrl.js'
import { withClipIds } from './lib/clipIds.js'
import { calculateTotalSeconds, locatePlaylistPosition } from './lib/time.js'
import { fetchVideoMetadata } from './lib/youtubeApi.js'

const DEFAULT_PLAYLIST = [
  { videoId: '6MTbZBg9pQc', start: 0, end: 761 },
  { videoId: 'gUSWWqnOKt0', start: 0, end: 140 },
]

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

function prefersDarkScheme() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getStoredTheme() {
  const stored = localStorage.getItem('theme')
  return stored === 'light' || stored === 'dark' ? stored : null
}

function getEffectiveTheme(theme) {
  return theme ?? (prefersDarkScheme() ? 'dark' : 'light')
}

export default function App() {
  const [initialState] = useState(() => {
    const shared = decodePlaylistFromUrl(window.location.search)
    return { playlist: withClipIds(shared ?? DEFAULT_PLAYLIST), isSharedView: shared != null }
  })
  const [playlist, setPlaylist] = useState(initialState.playlist)
  const [isSharedView] = useState(initialState.isSharedView)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [metadata, setMetadata] = useState({})
  const [theme, setTheme] = useState(getStoredTheme)
  const [autoplayToken, setAutoplayToken] = useState(0)
  // Where to start a clip when joining a shared playlist partway through:
  // { index, start }. Cleared as soon as playback moves to another clip.
  const [joinPosition, setJoinPosition] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenControls, setShowFullscreenControls] = useState(true)
  const playerWrapperRef = useRef(null)
  const requestedMetadataIdsRef = useRef(new Set())
  const hideControlsTimeoutRef = useRef(null)

  function scheduleHideControls() {
    setShowFullscreenControls(true)
    clearTimeout(hideControlsTimeoutRef.current)
    hideControlsTimeoutRef.current = setTimeout(() => setShowFullscreenControls(false), 2000)
  }

  useEffect(() => {
    function handleFullscreenChange() {
      const nowFullscreen = document.fullscreenElement === playerWrapperRef.current
      setIsFullscreen(nowFullscreen)
      if (nowFullscreen) {
        scheduleHideControls()
      } else {
        clearTimeout(hideControlsTimeoutRef.current)
        setShowFullscreenControls(true)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => clearTimeout(hideControlsTimeoutRef.current)
  }, [])

  useEffect(() => {
    if (isSharedView) return
    const requested = requestedMetadataIdsRef.current
    const missingIds = [...new Set(playlist.map((clip) => clip.videoId))].filter(
      (id) => !(id in metadata) && !requested.has(id),
    )
    if (missingIds.length === 0) return
    missingIds.forEach((id) => requested.add(id))
    let settled = false
    fetchVideoMetadata(missingIds, API_KEY)
      .then((fetched) => {
        settled = true
        if (Object.keys(fetched).length > 0) {
          setMetadata((current) => ({ ...current, ...fetched }))
        }
      })
      .catch((e) => {
        settled = true
        console.error('Error fetching video metadata:', e)
      })
    return () => {
      if (!settled) missingIds.forEach((id) => requested.delete(id))
    }
  }, [playlist, metadata, isSharedView])

  function handlePlayerMouseMove() {
    scheduleHideControls()
  }

  useEffect(() => {
    if (theme) {
      document.documentElement.dataset.theme = theme
      localStorage.setItem('theme', theme)
    } else {
      delete document.documentElement.dataset.theme
    }
  }, [theme])

  function handleToggleTheme() {
    const current = getEffectiveTheme(theme)
    setTheme(current === 'dark' ? 'light' : 'dark')
  }

  function handleAddClips(newClips, newMetadata) {
    const clipsWithIds = withClipIds(newClips)
    setPlaylist((current) => [...current, ...clipsWithIds])
    setMetadata((current) => ({ ...current, ...newMetadata }))
  }

  function handleLoadPlaylist(newClips, newMetadata) {
    setPlaylist(withClipIds(newClips))
    setMetadata((current) => ({ ...current, ...newMetadata }))
    setCurrentIndex(0)
  }

  function handleUpdateClip(index, changes) {
    setPlaylist((current) =>
      current.map((clip, i) => (i === index ? { ...clip, ...changes } : clip)),
    )
  }

  function handleDeleteClip(index) {
    const newLength = playlist.length - 1
    setPlaylist((current) => current.filter((_, i) => i !== index))
    setCurrentIndex((current) => {
      const next = index < current ? current - 1 : current
      return Math.min(next, Math.max(newLength - 1, 0))
    })
  }

  function handleMoveClip(index, direction) {
    const target = index + direction
    if (target < 0 || target >= playlist.length) return
    setPlaylist((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setCurrentIndex((current) => {
      if (current === index) return target
      if (current === target) return index
      return current
    })
  }

  function handleReplacePlaylist(newPlaylist) {
    setPlaylist(withClipIds(newPlaylist))
    setCurrentIndex(0)
    setAutoplayToken((token) => token + 1)
  }

  function handleReset() {
    setPlaylist([])
    setCurrentIndex(0)
  }

  function handleEnded() {
    setJoinPosition(null)
    setCurrentIndex((current) => current + 1)
  }

  function handleNext() {
    setJoinPosition(null)
    setCurrentIndex((current) => (current + 1) % playlist.length)
  }

  function handlePrevious() {
    setJoinPosition(null)
    setCurrentIndex((current) => (current - 1 + playlist.length) % playlist.length)
  }

  function handleReachZero(secondsLate) {
    // The countdown can fire late (throttled timer, page opened mid-playlist),
    // so start wherever the playlist should be by now to stay in sync.
    const position = locatePlaylistPosition(playlist, secondsLate)
    if (!position) return
    setHasStarted(true)
    setJoinPosition(position)
    setCurrentIndex(position.index)
    setAutoplayToken((token) => token + 1)
  }

  function handleToggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      playerWrapperRef.current?.requestFullscreen()
    }
  }

  const currentClip = playlist[currentIndex]
  const effectiveTheme = getEffectiveTheme(theme)
  const totalSeconds = calculateTotalSeconds(playlist)
  const player = currentClip && (
    <YouTubePlayer
      videoId={currentClip.videoId}
      start={joinPosition?.index === currentIndex ? joinPosition.start : currentClip.start}
      end={currentClip.end}
      onEnded={handleEnded}
      disableNativeFullscreen={isSharedView}
      autoplayToken={autoplayToken}
    />
  )

  return (
    <div>
      <div className="top-bar">
        <h1>YouTube Playlist Duration Calculator & Player</h1>
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={handleToggleTheme}
          aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {effectiveTheme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
      {isSharedView ? (
        <>
          {player && (
            <div
              className={`player-wrapper${isFullscreen ? ' is-fullscreen' : ''}${isFullscreen && !showFullscreenControls ? ' controls-hidden' : ''}`}
              ref={playerWrapperRef}
              onMouseMove={handlePlayerMouseMove}
            >
              {player}
              {isFullscreen && !hasStarted && <CountdownOverlay totalSeconds={totalSeconds} />}
              <button
                type="button"
                className="player-nav player-nav-prev"
                onClick={handlePrevious}
                aria-label="Previous clip"
              >
                {isFullscreen ? '' : '◀'}
              </button>
              <button
                type="button"
                className="player-nav player-nav-next"
                onClick={handleNext}
                aria-label="Next clip"
              >
                {isFullscreen ? '' : '▶'}
              </button>
              <button
                type="button"
                className="player-nav player-fullscreen-toggle"
                onClick={handleToggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? '⤡' : '⤢'}
              </button>
            </div>
          )}
          {player && !isFullscreen && !hasStarted && (
            // Entering fullscreen needs a click, and that same click lets the
            // browser autoplay with sound when the countdown reaches zero.
            <button type="button" className="btn btn-primary go-fullscreen-btn" onClick={handleToggleFullscreen}>
              ⤢ Go fullscreen
            </button>
          )}
          <SharedClock
            totalSeconds={totalSeconds}
            onReachZero={handleReachZero}
          />
        </>
      ) : (
        <>
          {player}
          <div className="page-sections">
            <PlaylistView
              playlist={playlist}
              currentIndex={currentIndex}
              metadata={metadata}
              onUpdateClip={handleUpdateClip}
              onDeleteClip={handleDeleteClip}
              onMoveClip={handleMoveClip}
            />
            <AddClipInput apiKey={API_KEY} onAddClips={handleAddClips} onLoadPlaylist={handleLoadPlaylist} />
            <ShareLink playlist={playlist} />
            <RawJsonPanel playlist={playlist} onReplacePlaylist={handleReplacePlaylist} onReset={handleReset} />
          </div>
        </>
      )}
      {!isSharedView && (
        <footer className="page-footer">
          <a href="https://github.com/rickyjou/youtube-playlist" rel="noopener noreferrer">
            Github Repository
          </a>
          <span className="app-version">{__APP_VERSION__}</span>
        </footer>
      )}
    </div>
  )
}
