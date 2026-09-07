import { useEffect, useRef, useState } from 'react'
import YouTubePlayer from './components/YouTubePlayer.jsx'
import PlaylistView from './components/PlaylistView.jsx'
import AddClipInput from './components/AddClipInput.jsx'
import RawJsonPanel from './components/RawJsonPanel.jsx'
import ShareLink from './components/ShareLink.jsx'
import SharedClock from './components/SharedClock.jsx'
import { decodePlaylistFromUrl } from './lib/shareUrl.js'
import { calculateTotalSeconds } from './lib/time.js'
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
    return { playlist: shared ?? DEFAULT_PLAYLIST, isSharedView: shared != null }
  })
  const [playlist, setPlaylist] = useState(initialState.playlist)
  const [isSharedView] = useState(initialState.isSharedView)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [metadata, setMetadata] = useState({})
  const [theme, setTheme] = useState(getStoredTheme)
  const [autoplayToken, setAutoplayToken] = useState(0)
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
    setPlaylist((current) => [...current, ...newClips])
    setMetadata((current) => ({ ...current, ...newMetadata }))
  }

  function handleLoadPlaylist(newClips, newMetadata) {
    setPlaylist(newClips)
    setMetadata((current) => ({ ...current, ...newMetadata }))
    setCurrentIndex(0)
  }

  function handleUpdateClip(index, changes) {
    setPlaylist((current) =>
      current.map((clip, i) => (i === index ? { ...clip, ...changes } : clip)),
    )
  }

  function handleDeleteClip(index) {
    let newLength = playlist.length
    setPlaylist((current) => {
      const next = current.filter((_, i) => i !== index)
      newLength = next.length
      return next
    })
    setCurrentIndex((current) => {
      const next = index < current ? current - 1 : current
      return Math.min(next, Math.max(newLength - 1, 0))
    })
  }

  function handleMoveClip(index, direction) {
    const target = index + direction
    let didSwap = false
    setPlaylist((current) => {
      if (target < 0 || target >= current.length) return current
      didSwap = true
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setCurrentIndex((current) => (didSwap && index === current ? target : current))
  }

  function handleReplacePlaylist(newPlaylist) {
    setPlaylist(newPlaylist)
    setCurrentIndex(0)
    setAutoplayToken((token) => token + 1)
  }

  function handleReset() {
    setPlaylist([])
    setCurrentIndex(0)
  }

  function handleEnded() {
    setCurrentIndex((current) => current + 1)
  }

  function handleNext() {
    setCurrentIndex((current) => (current + 1) % playlist.length)
  }

  function handlePrevious() {
    setCurrentIndex((current) => (current - 1 + playlist.length) % playlist.length)
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
      start={currentClip.start}
      end={currentClip.end}
      onEnded={handleEnded}
      disableNativeFullscreen={isSharedView}
      autoplayToken={autoplayToken}
    />
  )

  return (
    <div>
      <div className="top-bar">
        <a href="https://github.com/rickyjou/youtube-playlist" rel="noopener noreferrer">
          Github Repository
        </a>
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={handleToggleTheme}
          aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {effectiveTheme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
      <h1>YouTube Playlist Duration Calculator & Player</h1>
      {isSharedView ? (
        <>
          {player && (
            <div
              className={`player-wrapper${isFullscreen ? ' is-fullscreen' : ''}${isFullscreen && !showFullscreenControls ? ' controls-hidden' : ''}`}
              ref={playerWrapperRef}
              onMouseMove={handlePlayerMouseMove}
            >
              {player}
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
          <SharedClock
            totalSeconds={totalSeconds}
            onReachZero={() => setAutoplayToken((token) => token + 1)}
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
    </div>
  )
}
