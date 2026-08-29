import { useState } from 'react'
import { parseYouTubeInput } from '../lib/youtubeInput.js'
import { fetchVideoMetadata, fetchPlaylistVideoIds } from '../lib/youtubeApi.js'

function toClip(videoId, metadata) {
  return { videoId, start: 0, end: metadata[videoId]?.durationSeconds ?? 0 }
}

export default function AddClipInput({ apiKey, onAddClips, onLoadPlaylist }) {
  const [url, setUrl] = useState('')
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
        onAddClips([toClip(parsed.videoId, metadata)], metadata)
      } else {
        const videoIds = await fetchPlaylistVideoIds(parsed.playlistId, apiKey)
        const metadata = await fetchVideoMetadata(videoIds, apiKey)
        const clips = videoIds.map((videoId) => toClip(videoId, metadata))
        onLoadPlaylist(clips, metadata)
      }
      setUrl('')
    } catch (e) {
      setError(`Could not fetch video info: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add a video or load a playlist</h2>
      <label>
        YouTube link
        <input
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=... or .../playlist?list=..."
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Adding…' : 'Add'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
