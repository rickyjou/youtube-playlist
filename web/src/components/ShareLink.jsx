import { useEffect, useState } from 'react'
import { buildShareUrl, isValidPlaylist, MAX_CLIPS } from '../lib/shareUrl.js'
import { shortenUrl } from '../lib/urlShortener.js'

export default function ShareLink({ playlist }) {
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [shortenFailed, setShortenFailed] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setLink('')
    setShortenFailed(false)
    setError('')
  }, [playlist])

  async function handleGenerate() {
    // The shared view rejects these, so the link would silently open the default playlist.
    if (!isValidPlaylist(playlist)) {
      setError(
        `This playlist can't be shared: links allow up to ${MAX_CLIPS} clips, each ending within 24 hours and starting before it ends.`,
      )
      return
    }
    setError('')
    const baseUrl = window.location.origin + window.location.pathname
    const longUrl = buildShareUrl(playlist, baseUrl)
    setGenerating(true)
    const shortUrl = await shortenUrl(longUrl)
    setShortenFailed(!shortUrl)
    setLink(shortUrl || longUrl)
    setGenerating(false)
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
      <div className="input-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Generate Shareable Link'}
        </button>
        {link && (
          <>
            <input
              type="text"
              readOnly
              value={link}
              className="input-row-field input-row-field-compact"
            />
            <button type="button" className="btn btn-secondary" onClick={handleCopy}>
              Copy Link
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleOpen}>
              Open in New Tab
            </button>
          </>
        )}
      </div>
      {shortenFailed && <p>Couldn't shorten link — showing full link</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
