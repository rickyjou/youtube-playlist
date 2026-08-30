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

export default function YouTubePlayer({ videoId, start, end, onEnded, disableNativeFullscreen, autoplayToken }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const clipRef = useRef({ videoId, start, end })
  clipRef.current = { videoId, start, end }
  const hasEndedRef = useRef(false)
  const loadedAtRef = useRef(0)
  const hasPlayedRef = useRef(false)
  const lastAutoplayTokenRef = useRef(autoplayToken)

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
          ...(disableNativeFullscreen ? { fs: 0 } : {}),
        },
        events: {
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              hasPlayedRef.current = true
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
      playerRef.current?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    hasEndedRef.current = false
    loadedAtRef.current = Date.now()
    const forcePlay = autoplayToken !== undefined && autoplayToken !== lastAutoplayTokenRef.current
    lastAutoplayTokenRef.current = autoplayToken
    if (hasPlayedRef.current || forcePlay) {
      if (!playerRef.current?.loadVideoById) return
      hasPlayedRef.current = true
      playerRef.current.loadVideoById({ videoId, startSeconds: start, endSeconds: end })
    } else {
      if (!playerRef.current?.cueVideoById) return
      playerRef.current.cueVideoById({ videoId, startSeconds: start, endSeconds: end })
    }
  }, [videoId, start, end, autoplayToken])

  return <div ref={containerRef} className="player-frame" />
}
