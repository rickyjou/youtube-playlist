import { useEffect, useState } from 'react'
import { formatCountdown, secondsUntilPlaylistStart } from '../lib/time.js'

// Display only: SharedClock owns deciding when playback starts.
export default function CountdownOverlay({ totalSeconds }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="countdown-overlay">
      <p className="countdown-overlay-label">Starts in</p>
      <p className="countdown-overlay-time">{formatCountdown(secondsUntilPlaylistStart(totalSeconds, now))}</p>
    </div>
  )
}
