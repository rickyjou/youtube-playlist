import { formatTime, calculateTotalSeconds } from '../lib/time.js'

export default function PlaylistView({ playlist, currentIndex, metadata, onUpdateClip, onDeleteClip, onMoveClip }) {
  const totalSeconds = calculateTotalSeconds(playlist)

  return (
    <section className="playlist-view">
      <ol>
        {playlist.map((clip, index) => {
          const meta = metadata[clip.videoId]
          return (
            <li key={`${clip.videoId}-${index}`} className={index === currentIndex ? 'playing' : ''}>
              {meta?.thumbnail && <img src={meta.thumbnail} alt="" width="60" />}
              <span className="clip-title">{meta?.title ?? clip.videoId}</span>
              <label>
                Start
                <input
                  type="number"
                  min="0"
                  value={clip.start}
                  onChange={(event) => onUpdateClip(index, { start: Number(event.target.value), end: clip.end })}
                />
              </label>
              <label>
                End
                <input
                  type="number"
                  min="0"
                  value={clip.end}
                  onChange={(event) => onUpdateClip(index, { start: clip.start, end: Number(event.target.value) })}
                />
              </label>
              <button type="button" onClick={() => onMoveClip(index, -1)} disabled={index === 0}>
                ↑
              </button>
              <button type="button" onClick={() => onMoveClip(index, 1)} disabled={index === playlist.length - 1}>
                ↓
              </button>
              <button type="button" onClick={() => onDeleteClip(index)}>
                Delete
              </button>
            </li>
          )
        })}
      </ol>
      <p>Total time: {formatTime(totalSeconds)}</p>
    </section>
  )
}
