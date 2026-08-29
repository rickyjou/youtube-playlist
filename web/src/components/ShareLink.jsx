import { useEffect, useState } from 'react'
import { buildShareUrl } from '../lib/shareUrl.js'

export default function ShareLink({ playlist }) {
  const [link, setLink] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLink('')
  }, [playlist])

  function handleGenerate() {
    const baseUrl = window.location.origin + window.location.pathname
    setLink(buildShareUrl(playlist, baseUrl))
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setError('')
    } catch (e) {
      setError(`Could not copy link: ${e.message}`)
    }
  }

  function handleOpen() {
    window.open(link, 'sharedPlaylistPreview', 'noopener,noreferrer')
  }

  return (
    <section>
      <button type="button" className="btn btn-primary" onClick={handleGenerate}>
        Generate Shareable Link
      </button>
      {link && (
        <div>
          <input type="text" readOnly value={link} />
          <button type="button" className="btn btn-secondary" onClick={handleCopy}>
            Copy Link
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleOpen}>
            Open in New Tab
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </section>
  )
}
