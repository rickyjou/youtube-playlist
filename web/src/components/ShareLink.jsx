import { useEffect, useState } from 'react'
import { buildShareUrl } from '../lib/shareUrl.js'

export default function ShareLink({ playlist }) {
  const [link, setLink] = useState('')

  useEffect(() => {
    setLink('')
  }, [playlist])

  function handleGenerate() {
    const baseUrl = window.location.origin + window.location.pathname
    setLink(buildShareUrl(playlist, baseUrl))
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
  }

  function handleOpen() {
    window.open(link, 'sharedPlaylistPreview')
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
        </div>
      )}
    </section>
  )
}
