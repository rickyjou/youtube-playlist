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
