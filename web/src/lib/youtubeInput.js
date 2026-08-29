export const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/
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
