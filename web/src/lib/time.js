export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`
}

export function calculateTotalSeconds(playlist) {
  return playlist.reduce((total, clip) => total + (clip.end - clip.start), 0)
}

function pad(value) {
  return String(value).padStart(2, '0')
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
