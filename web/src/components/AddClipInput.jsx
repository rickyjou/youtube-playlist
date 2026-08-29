import { useState } from 'react'
import { parseYouTubeInput } from '../lib/youtubeInput.js'
import { fetchVideoMetadata, fetchPlaylistVideoIds } from '../lib/youtubeApi.js'

export default function AddClipInput({ apiKey, onAddClips }) {
  const [url, setUrl] = useState('')
  const [start, setStart] = useState('0')
  const [end, setEnd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const parsed = parseYouTubeInput(url)
    if (parsed.type === 'invalid') {
      setError('Please enter a valid YouTube video or playlist link.')
      return
    }

    setLoading(true)
    try {
      if (parsed.type === 'video') {
        const metadata = await fetchVideoMetadata([parsed.videoId], apiKey)
        const meta = metadata[parsed.videoId]
        const startSeconds = Number(start) || 0
        const endSeconds = end !== '' ? Number(end) : meta?.durationSeconds ?? 0
        onAddClips([{ videoId: parsed.videoId, start: startSeconds, end: endSeconds }], metadata)
      } else {
        const videoIds = await fetchPlaylistVideoIds(parsed.playlistId, apiKey)
        const metadata = await fetchVideoMetadata(videoIds, apiKey)
        const clips = videoIds.map((videoId) => ({
          videoId,
          start: 0,
          end: metadata[videoId]?.durationSeconds ?? 0,
        }))
        onAddClips(clips, metadata)
      }
      setUrl('')
      setStart('0')
      setEnd('')
    } catch (e) {
      setError(`Could not fetch video info: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add a video or playlist</h2>
      <label>
        YouTube link
        <input
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=... or .../playlist?list=..."
        />
      </label>
      <label>
        Start (seconds, video links only)
        <input type="number" min="0" value={start} onChange={(event) => setStart(event.target.value)} />
      </label>
      <label>
        End (seconds, blank = full duration, video links only)
        <input type="number" min="0" value={end} onChange={(event) => setEnd(event.target.value)} />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Adding…' : 'Add'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
