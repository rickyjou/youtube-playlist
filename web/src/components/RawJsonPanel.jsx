import { useEffect, useState } from 'react'
import { isValidPlaylist } from '../lib/shareUrl.js'

export default function RawJsonPanel({ playlist, onReplacePlaylist, onReset }) {
  const [text, setText] = useState(JSON.stringify(playlist))
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setText(JSON.stringify(playlist))
  }, [playlist])

  function handleUpdate() {
    try {
      const parsed = JSON.parse(text)
      if (!isValidPlaylist(parsed)) {
        setError('JSON format error. Please check your input and try again.')
        return
      }
      setError('')
      onReplacePlaylist(parsed)
    } catch {
      setError('JSON format error. Please check your input and try again.')
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
      <button type="button" className="btn btn-secondary" onClick={() => setOpen((value) => !value)}>
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
