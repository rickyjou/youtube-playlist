import { useEffect, useRef, useState } from 'react'
import { isIOS } from '../lib/platform.js'

const AUTOPLAY_CHECK_DELAY_MS = 3000

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

export default function YouTubePlayer({ videoId, start, end, onEnded, disableNativeFullscreen, autoplayToken }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const clipRef = useRef({ videoId, start, end })
  clipRef.current = { videoId, start, end }
  const hasEndedRef = useRef(false)
  const loadedAtRef = useRef(0)
  const hasPlayedRef = useRef(false)
  const lastAutoplayTokenRef = useRef(autoplayToken)
  const autoplayCheckTimeoutRef = useRef(null)
  const pendingForcedPlayRef = useRef(false)
  const mutedFallbackTriedRef = useRef(false)
  // 'unmute' | 'tap' | null
  const [prompt, setPrompt] = useState(null)

  function startForcedPlay(player) {
    const { videoId, start, end } = clipRef.current
    hasPlayedRef.current = true
    loadedAtRef.current = Date.now()
    mutedFallbackTriedRef.current = false
    setPrompt(null)
    // Try with sound first: a mute left over from an earlier fallback would
    // otherwise start the video silently with no unmute prompt.
    player.unMute?.()
    player.loadVideoById({ videoId, startSeconds: start, endSeconds: end })
    // A forced autoplay (e.g. the shared-view countdown reaching zero) isn't
    // tied to a user gesture, so the browser may silently refuse to play it.
    // onAutoplayBlocked usually reports that; this timer is the backup.
    clearTimeout(autoplayCheckTimeoutRef.current)
    autoplayCheckTimeoutRef.current = setTimeout(() => {
      const state = playerRef.current?.getPlayerState?.()
      const YT = window.YT
      if (state !== YT?.PlayerState?.PLAYING && state !== YT?.PlayerState?.BUFFERING) {
        handleAutoplayBlocked()
      }
    }, AUTOPLAY_CHECK_DELAY_MS)
  }

  function handleAutoplayBlocked() {
    if (!hasPlayedRef.current) return
    clearTimeout(autoplayCheckTimeoutRef.current)
    const player = playerRef.current
    // Browsers always allow muted autoplay, so on desktop start on time without
    // sound rather than wait for a click. iOS keeps the manual tap to start.
    if (isIOS() || mutedFallbackTriedRef.current || !player?.mute) {
      setPrompt('tap')
      return
    }
    mutedFallbackTriedRef.current = true
    player.mute()
    player.playVideo()
    setPrompt('unmute')
  }

  useEffect(() => {
    let cancelled = false
    const mountPoint = document.createElement('div')
    containerRef.current.appendChild(mountPoint)

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return
      loadedAtRef.current = Date.now()
      playerRef.current = new YT.Player(mountPoint, {
        height: '500',
        width: '1000',
        videoId: clipRef.current.videoId,
        playerVars: {
          start: clipRef.current.start,
          end: clipRef.current.end,
          playsinline: 1,
          ...(disableNativeFullscreen ? { fs: 0 } : {}),
        },
        events: {
          onReady: (event) => {
            // A forced play requested before the player could accept commands
            // (API still loading, or player not ready yet) would otherwise be lost.
            if (pendingForcedPlayRef.current) {
              pendingForcedPlayRef.current = false
              startForcedPlay(event.target)
            }
          },
          onAutoplayBlocked: () => handleAutoplayBlocked(),
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              hasPlayedRef.current = true
              clearTimeout(autoplayCheckTimeoutRef.current)
              setPrompt((current) => (current === 'unmute' ? current : null))
            }
            const spurious = Date.now() - loadedAtRef.current < 1500
            if (event.data === YT.PlayerState.ENDED && !hasEndedRef.current && !spurious) {
              hasEndedRef.current = true
              onEnded()
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      clearTimeout(autoplayCheckTimeoutRef.current)
      playerRef.current?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    hasEndedRef.current = false
    loadedAtRef.current = Date.now()
    const forcePlay = autoplayToken !== undefined && autoplayToken !== lastAutoplayTokenRef.current
    lastAutoplayTokenRef.current = autoplayToken
    const player = playerRef.current
    if (forcePlay) {
      if (player?.loadVideoById) {
        startForcedPlay(player)
      } else {
        pendingForcedPlayRef.current = true
      }
    } else if (hasPlayedRef.current) {
      player?.loadVideoById?.({ videoId, startSeconds: start, endSeconds: end })
    } else {
      player?.cueVideoById?.({ videoId, startSeconds: start, endSeconds: end })
    }
  }, [videoId, start, end, autoplayToken])

  function handleTapToStart() {
    clearTimeout(autoplayCheckTimeoutRef.current)
    setPrompt(null)
    playerRef.current?.unMute?.()
    playerRef.current?.playVideo?.()
  }

  function handleUnmute() {
    // Only ever unmute from a click: Chrome pauses a muted autoplaying video
    // that script unmutes without a user gesture.
    setPrompt(null)
    playerRef.current?.unMute?.()
    playerRef.current?.playVideo?.()
  }

  return (
    <div className="player-frame">
      <div ref={containerRef} />
      {prompt === 'tap' && (
        <button type="button" className="tap-to-start-btn" onClick={handleTapToStart}>
          ▶ Tap to start
        </button>
      )}
      {prompt === 'unmute' && (
        <button type="button" className="tap-to-start-btn" onClick={handleUnmute}>
          🔇 Click to unmute
        </button>
      )}
    </div>
  )
}
