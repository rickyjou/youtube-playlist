const API_BASE = 'https://www.googleapis.com/youtube/v3'

function parseIsoDuration(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  if (!match) return 0
  const [, hours, minutes, seconds] = match
  return (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0)
}

function chunk(array, size) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export async function fetchVideoMetadata(videoIds, apiKey) {
  const metadata = {}
  for (const batch of chunk(videoIds, 50)) {
    const url = `${API_BASE}/videos?part=snippet,contentDetails&id=${batch.join(',')}&key=${apiKey}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`YouTube Data API error: ${response.status}`)
    }
    const data = await response.json()
    for (const item of data.items) {
      metadata[item.id] = {
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.default?.url ?? '',
        durationSeconds: parseIsoDuration(item.contentDetails.duration),
      }
    }
  }
  return metadata
}
