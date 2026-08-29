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

  return (
    <section>
      <button type="button" onClick={handleGenerate}>
        Generate Shareable Link
      </button>
      {link && (
        <div>
          <input type="text" readOnly value={link} />
          <button type="button" onClick={handleCopy}>
            Copy Link
          </button>
        </div>
      )}
    </section>
  )
}
