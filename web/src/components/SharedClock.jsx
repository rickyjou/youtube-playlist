import { useEffect, useRef, useState } from 'react'
import {
  formatClockTime,
  formatCountdown,
  formatTime,
  getPlaylistStartTime,
  secondsUntilPlaylistStart,
} from '../lib/time.js'

export default function SharedClock({ totalSeconds, onReachZero }) {
  const [now, setNow] = useState(() => new Date())
  const hasFiredRef = useRef(false)
  const prevSecondsRef = useRef(null)
  const secondsUntilStart = secondsUntilPlaylistStart(totalSeconds, now)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const prev = prevSecondsRef.current
    // A backgrounded/throttled tab can skip the single tick where the countdown
    // hits exactly 0. Detect that we passed it anyway by noticing the countdown
    // jumped back up (wrapped) instead of continuing to count down.
    const wrapped = prev !== null && secondsUntilStart > prev
    prevSecondsRef.current = secondsUntilStart
    if ((secondsUntilStart === 0 || wrapped) && !hasFiredRef.current) {
      hasFiredRef.current = true
      onReachZero?.()
    }
  }, [secondsUntilStart, onReachZero])

  return (
    <div className="shared-clock">
      <p>Current time: {formatClockTime(now)}</p>
      <p>Start time: {formatClockTime(getPlaylistStartTime(totalSeconds, now))}</p>
      <p>Total time: {formatTime(totalSeconds)}</p>
      <p>Starts in: {formatCountdown(secondsUntilStart)}</p>
    </div>
  )
}
