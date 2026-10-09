import { memo } from 'react'
import { formatTime } from '../lib/time.js'

function secondsToParts(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0
  return { minutes: Math.floor(safeSeconds / 60), seconds: safeSeconds % 60 }
}

function TimeField({ label, totalSeconds, onChange, resetTo = 0 }) {
  const { minutes, seconds } = secondsToParts(totalSeconds)

  function handleMinutesChange(event) {
    const value = Number(event.target.value)
    if (!Number.isFinite(value) || value < 0) return
    onChange(value * 60 + seconds)
  }

  function handleSecondsChange(event) {
    const value = Number(event.target.value)
    if (!Number.isFinite(value) || value < 0) return
    onChange(minutes * 60 + value)
  }

  return (
    <span className="clip-field clip-time-field">
      {label}
      <input
        type="number"
        min="0"
        className="clip-time-input"
        aria-label={`${label} minutes`}
        value={minutes}
        onChange={handleMinutesChange}
        onFocus={(event) => event.target.select()}
      />
      <span className="clip-time-sep">:</span>
      <input
        type="number"
        min="0"
        max="59"
        className="clip-time-input"
        aria-label={`${label} seconds`}
        value={seconds}
        onChange={handleSecondsChange}
        onFocus={(event) => event.target.select()}
      />
      <button
        type="button"
        className="btn btn-secondary btn-icon-reset"
        aria-label={`Reset ${label} time`}
        onClick={() => onChange(resetTo)}
      >
        ↺
      </button>
    </span>
  )
}

// Memoized so typing in one row's time field doesn't re-render every other row;
// callers must pass stable callbacks for that to hold.
const ClipRow = memo(function ClipRow({ index, clip, meta, isPlaying, isLast, onUpdateClip, onDeleteClip, onMoveClip }) {
  const title = meta?.title ?? clip.videoId
  return (
    <li className={isPlaying ? 'playing' : ''}>
      <div className="clip-row">
        <span className="clip-index">{index + 1}.</span>
        {meta?.thumbnail && <img src={meta.thumbnail} alt="" width="60" height="45" loading="lazy" />}
        <span className="clip-title" title={title}>
          {title}
        </span>
        <TimeField
          label="Start"
          totalSeconds={clip.start}
          onChange={(value) => onUpdateClip(index, { start: value, end: clip.end })}
        />
        <TimeField
          label="End"
          totalSeconds={clip.end}
          onChange={(value) => onUpdateClip(index, { start: clip.start, end: value })}
          resetTo={meta?.durationSeconds ?? 0}
        />
        <div className="clip-actions">
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => onMoveClip(index, -1)}
            disabled={index === 0}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => onMoveClip(index, 1)}
            disabled={isLast}
          >
            ↓
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onDeleteClip(index)}>
            Delete
          </button>
        </div>
      </div>
    </li>
  )
})

export default function PlaylistView({
  playlist,
  currentIndex,
  metadata,
  totalSeconds,
  onUpdateClip,
  onDeleteClip,
  onMoveClip,
}) {
  return (
    <section className="playlist-view">
      <ol>
        {playlist.map((clip, index) => (
          <ClipRow
            key={clip.id}
            index={index}
            clip={clip}
            meta={metadata[clip.videoId]}
            isPlaying={index === currentIndex}
            isLast={index === playlist.length - 1}
            onUpdateClip={onUpdateClip}
            onDeleteClip={onDeleteClip}
            onMoveClip={onMoveClip}
          />
        ))}
      </ol>
      <p>Total time: {formatTime(totalSeconds)}</p>
    </section>
  )
}
