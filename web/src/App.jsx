import { useState } from 'react'
import YouTubePlayer from './components/YouTubePlayer.jsx'
import PlaylistView from './components/PlaylistView.jsx'
import AddClipInput from './components/AddClipInput.jsx'
import RawJsonPanel from './components/RawJsonPanel.jsx'
import ShareLink from './components/ShareLink.jsx'
import { decodePlaylistFromUrl } from './lib/shareUrl.js'

const DEFAULT_PLAYLIST = [
  { videoId: '6MTbZBg9pQc', start: 0, end: 761 },
  { videoId: 'gUSWWqnOKt0', start: 0, end: 140 },
]

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

export default function App() {
  const [playlist, setPlaylist] = useState(
    () => decodePlaylistFromUrl(window.location.search) ?? DEFAULT_PLAYLIST,
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [metadata, setMetadata] = useState({})

  function handleAddClips(newClips, newMetadata) {
    setPlaylist((current) => [...current, ...newClips])
    setMetadata((current) => ({ ...current, ...newMetadata }))
  }

  function handleUpdateClip(index, changes) {
    setPlaylist((current) =>
      current.map((clip, i) => (i === index ? { ...clip, ...changes } : clip)),
    )
  }

  function handleDeleteClip(index) {
    const newLength = playlist.length - 1
    setPlaylist((current) => current.filter((_, i) => i !== index))
    setCurrentIndex((current) => {
      const next = index < current ? current - 1 : current
      return Math.min(next, Math.max(newLength - 1, 0))
    })
  }

  function handleMoveClip(index, direction) {
    const target = index + direction
    const inBounds = target >= 0 && target < playlist.length
    setPlaylist((current) => {
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    if (inBounds) {
      setCurrentIndex((current) => (index === current ? target : current))
    }
  }

  function handleReplacePlaylist(newPlaylist) {
    setPlaylist(newPlaylist)
    setCurrentIndex(0)
  }

  function handleReset() {
    setPlaylist([])
    setCurrentIndex(0)
  }

  function handleEnded() {
    setCurrentIndex((current) => current + 1)
  }

  const currentClip = playlist[currentIndex]

  return (
    <div>
      <a href="https://github.com/rickyjou/youtube-playlist">Github Repository</a>
      <h1>YouTube Playlist Duration Calculator & Player</h1>
      {currentClip && (
        <YouTubePlayer
          videoId={currentClip.videoId}
          start={currentClip.start}
          end={currentClip.end}
          onEnded={handleEnded}
        />
      )}
      <PlaylistView
        playlist={playlist}
        currentIndex={currentIndex}
        metadata={metadata}
        onUpdateClip={handleUpdateClip}
        onDeleteClip={handleDeleteClip}
        onMoveClip={handleMoveClip}
      />
      <AddClipInput apiKey={API_KEY} onAddClips={handleAddClips} />
      <ShareLink playlist={playlist} />
      <RawJsonPanel playlist={playlist} onReplacePlaylist={handleReplacePlaylist} onReset={handleReset} />
    </div>
  )
}
