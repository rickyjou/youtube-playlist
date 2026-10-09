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
  const onReachZeroRef = useRef(onReachZero)
  onReachZeroRef.current = onReachZero
  // Kept outside the effect so StrictMode's dev-only double run can't fire the
  // same start twice.
  const firedStartAtRef = useRef(null)
  const secondsUntilStart = secondsUntilPlaylistStart(totalSeconds, now)

  useEffect(() => {
    const mountedAt = new Date()
    const startAt =
      Math.floor(mountedAt.getTime() / 1000) * 1000 + secondsUntilPlaylistStart(totalSeconds, mountedAt) * 1000
    let timeoutId

    // The timeout aimed at startAt is what guarantees firing; a throttled
    // timer just runs late, and onReachZero is told how many seconds late.
    // The 1s tick and the visibility/focus listeners only catch it sooner,
    // e.g. after the system clock jumps or a covered window is revealed.
    function check() {
      if (firedStartAtRef.current === startAt) return
      const current = Date.now()
      clearTimeout(timeoutId)
      if (current >= startAt) {
        firedStartAtRef.current = startAt
        onReachZeroRef.current?.(Math.floor((current - startAt) / 1000))
        return
      }
      // Re-aim on every check so a clock moved backwards doesn't fire early.
      timeoutId = setTimeout(check, startAt - current)
    }

    function tick() {
      setNow(new Date())
      check()
    }

    check()
    const intervalId = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [totalSeconds])

  return (
    <div className="shared-clock">
      <p>Current time: {formatClockTime(now)}</p>
      <p>Start time: {formatClockTime(getPlaylistStartTime(totalSeconds, now))}</p>
      <p>Total time: {formatTime(totalSeconds)}</p>
      <p>Starts in: {formatCountdown(secondsUntilStart)}</p>
    </div>
  )
}
