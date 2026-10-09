const API_BASE = 'https://www.googleapis.com/youtube/v3'
const ISO_DURATION_PATTERN = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/

function parseIsoDuration(iso) {
  const match = ISO_DURATION_PATTERN.exec(iso)
  if (!match) return 0
  const [, hours, minutes, seconds] = match
  return (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0)
}

function assertOk(response) {
  if (!response.ok) {
    throw new Error(`YouTube Data API error: ${response.status}`)
  }
}

function chunk(array, size) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export async function fetchVideoMetadata(videoIds, apiKey) {
  const batches = await Promise.all(
    chunk(videoIds, 50).map(async (batch) => {
      const url = `${API_BASE}/videos?part=snippet,contentDetails&id=${batch.join(',')}&key=${apiKey}`
      const response = await fetch(url)
      assertOk(response)
      const data = await response.json()
      return data.items ?? []
    }),
  )
  const metadata = {}
  for (const item of batches.flat()) {
    metadata[item.id] = {
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.default?.url ?? '',
      durationSeconds: parseIsoDuration(item.contentDetails.duration),
    }
  }
  return metadata
}

export async function fetchPlaylistVideoIds(playlistId, apiKey) {
  const videoIds = []
  let pageToken = ''
  do {
    const url = `${API_BASE}/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`
    const response = await fetch(url)
    assertOk(response)
    const data = await response.json()
    for (const item of data.items ?? []) {
      videoIds.push(item.contentDetails.videoId)
    }
    pageToken = data.nextPageToken ?? ''
  } while (pageToken)
  return videoIds
}
