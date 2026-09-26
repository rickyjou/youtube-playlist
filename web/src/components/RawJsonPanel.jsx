import { useState } from 'react'
import { isValidPlaylist } from '../lib/shareUrl.js'
import { stripClipIds } from '../lib/clipIds.js'

function toJsonText(playlist) {
  return JSON.stringify(stripClipIds(playlist))
}

export default function RawJsonPanel({ playlist, onReplacePlaylist, onReset }) {
  const [text, setText] = useState(() => toJsonText(playlist))
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  function handleToggleOpen() {
    if (!open) setText(toJsonText(playlist))
    setOpen(!open)
  }

  function handleUpdate() {
    try {
      const parsed = JSON.parse(text)
      if (!isValidPlaylist(parsed)) {
        setError('JSON format error. Please check your input and try again.')
        return
      }
      setError('')
      onReplacePlaylist(parsed)
    } catch (e) {
      setError('JSON format error. Please check your input and try again.')
      console.error('Invalid playlist JSON:', e)
    }
  }

  function handleReset() {
    if (window.confirm('Are you sure you want to remove all videos from the playlist?')) {
      setError('')
      onReset()
    }
  }

  return (
    <section>
      <button type="button" className="btn btn-secondary" onClick={handleToggleOpen}>
        {open ? 'Hide advanced JSON editor' : 'Show advanced JSON editor'}
      </button>
      {open && (
        <div>
          <textarea
            rows={10}
            cols={70}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <br />
          <button type="button" className="btn btn-primary" onClick={handleUpdate}>
            Update and Play from beginning
          </button>
          <button type="button" className="btn btn-danger" onClick={handleReset}>
            Reset and Remove All Videos
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </section>
  )
}
