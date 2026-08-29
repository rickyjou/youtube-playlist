import { useEffect, useState } from 'react'
import { formatClockTime, formatCountdown, secondsUntilPlaylistStart } from '../lib/time.js'

export default function SharedClock({ totalSeconds }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="shared-clock">
      <p>Current time: {formatClockTime(now)}</p>
      <p>Starts in: {formatCountdown(secondsUntilPlaylistStart(totalSeconds, now))}</p>
    </div>
  )
}
