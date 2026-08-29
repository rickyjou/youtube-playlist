import { VIDEO_ID_PATTERN } from './youtubeInput.js'

export function isValidPlaylist(value) {
  if (!Array.isArray(value)) return false
  return value.every(
    (clip) =>
      clip !== null &&
      typeof clip === 'object' &&
      typeof clip.videoId === 'string' &&
      VIDEO_ID_PATTERN.test(clip.videoId) &&
      Number.isFinite(clip.start) &&
      Number.isFinite(clip.end) &&
      clip.start >= 0 &&
      clip.end >= clip.start,
  )
}

export function decodePlaylistFromUrl(search) {
  const params = new URLSearchParams(search)
  const playlistParam = params.get('playlist')
  if (!playlistParam) return null
  try {
    const decoded = atob(playlistParam)
    const parsed = JSON.parse(decoded)
    if (!isValidPlaylist(parsed)) return null
    return parsed
  } catch (e) {
    console.error('Error loading playlist from URL:', e)
    return null
  }
}

export function buildShareUrl(playlist, baseUrl) {
  const encoded = btoa(JSON.stringify(playlist))
  return `${baseUrl}?playlist=${encoded}`
}
