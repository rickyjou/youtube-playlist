export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`
}

export function calculateTotalSeconds(playlist) {
  return playlist.reduce((total, clip) => total + (clip.end - clip.start), 0)
}
