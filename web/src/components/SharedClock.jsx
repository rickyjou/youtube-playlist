import { useEffect, useState } from 'react'
import {
  formatClockTime,
  formatCountdown,
  formatTime,
  getPlaylistStartTime,
  secondsUntilPlaylistStart,
} from '../lib/time.js'

export default function SharedClock({ totalSeconds }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="shared-clock">
      <p>Current time: {formatClockTime(now)}</p>
      <p>Start time: {formatClockTime(getPlaylistStartTime(totalSeconds, now))}</p>
      <p>Total time: {formatTime(totalSeconds)}</p>
      <p>Starts in: {formatCountdown(secondsUntilPlaylistStart(totalSeconds, now))}</p>
    </div>
  )
}
