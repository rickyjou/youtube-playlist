import { useEffect, useRef, useState } from 'react'

const AUTOPLAY_CHECK_DELAY_MS = 1500

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
  const [showTapToStart, setShowTapToStart] = useState(false)

  function startForcedPlay(player) {
    const { videoId, start, end } = clipRef.current
    hasPlayedRef.current = true
    loadedAtRef.current = Date.now()
    player.loadVideoById({ videoId, startSeconds: start, endSeconds: end })
    // A forced autoplay (e.g. the shared-view countdown reaching zero) isn't
    // tied to a user gesture, so the browser may silently refuse to play it.
    // Fall back to a manual prompt if it doesn't actually start.
    clearTimeout(autoplayCheckTimeoutRef.current)
    autoplayCheckTimeoutRef.current = setTimeout(() => {
      const state = playerRef.current?.getPlayerState?.()
      const YT = window.YT
      if (state !== YT?.PlayerState?.PLAYING && state !== YT?.PlayerState?.BUFFERING) {
        setShowTapToStart(true)
      }
    }, AUTOPLAY_CHECK_DELAY_MS)
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
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              hasPlayedRef.current = true
              clearTimeout(autoplayCheckTimeoutRef.current)
              setShowTapToStart(false)
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
    setShowTapToStart(false)
    playerRef.current?.playVideo?.()
  }

  return (
    <div className="player-frame">
      <div ref={containerRef} />
      {showTapToStart && (
        <button type="button" className="tap-to-start-btn" onClick={handleTapToStart}>
          ▶ Tap to start
        </button>
      )}
    </div>
  )
}
