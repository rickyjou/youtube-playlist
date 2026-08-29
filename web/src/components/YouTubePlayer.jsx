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
    const mountPoint = document.createElement('div')
    containerRef.current.appendChild(mountPoint)

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return
      playerRef.current = new YT.Player(mountPoint, {
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
