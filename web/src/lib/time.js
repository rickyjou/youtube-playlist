function pad(value) {
  return String(value).padStart(2, '0')
}

export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${pad(seconds)}`
}

export function calculateTotalSeconds(playlist) {
  return playlist.reduce((total, clip) => total + (clip.end - clip.start), 0)
}

export function formatClockTime(date) {
  const hours24 = date.getHours()
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  const period = hours24 < 12 ? 'AM' : 'PM'
  return `${hours12}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${period}`
}

export function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${pad(minutes)}:${pad(seconds)}`
}

const SECONDS_PER_HOUR = 3600

export function secondsUntilPlaylistStart(totalSeconds, now) {
  if (totalSeconds >= SECONDS_PER_HOUR) return 0
  const startOffset = SECONDS_PER_HOUR - totalSeconds
  const secondsIntoHour = now.getMinutes() * 60 + now.getSeconds()
  return ((startOffset - secondsIntoHour) % SECONDS_PER_HOUR + SECONDS_PER_HOUR) % SECONDS_PER_HOUR
}

export function getPlaylistStartTime(totalSeconds, now) {
  return new Date(now.getTime() + secondsUntilPlaylistStart(totalSeconds, now) * 1000)
}

// Seconds since this hour's run of the playlist started, or null if it isn't
// running right now. Playlists shorter than an hour end at the top of the hour.
export function secondsSincePlaylistStart(totalSeconds, now) {
  if (totalSeconds <= 0 || totalSeconds >= SECONDS_PER_HOUR) return null
  const secondsIntoHour = now.getMinutes() * 60 + now.getSeconds()
  const elapsed = secondsIntoHour - (SECONDS_PER_HOUR - totalSeconds)
  return elapsed >= 0 ? elapsed : null
}

// Which clip is playing, and from where, once elapsedSeconds of the playlist
// have passed. Returns null when the whole playlist has already played.
export function locatePlaylistPosition(playlist, elapsedSeconds) {
  let remaining = elapsedSeconds
  for (let index = 0; index < playlist.length; index++) {
    const { start, end } = playlist[index]
    if (remaining < end - start) return { index, start: start + remaining }
    remaining -= Math.max(end - start, 0)
  }
  return null
}
