import { VIDEO_ID_PATTERN } from './youtubeInput.js'
import { stripClipIds } from './clipIds.js'

const STORAGE_KEY = 'playlist'

// Looser than isValidPlaylist: an end before its start is a normal mid-edit
// state, and rejecting it would throw away the whole playlist on reload.
function isRestorableClip(clip) {
  return (
    clip !== null &&
    typeof clip === 'object' &&
    typeof clip.videoId === 'string' &&
    VIDEO_ID_PATTERN.test(clip.videoId) &&
    Number.isFinite(clip.start) &&
    Number.isFinite(clip.end) &&
    clip.start >= 0 &&
    clip.end >= 0
  )
}

// The editor's playlist from the last visit, or null if none was saved.
export function loadSavedPlaylist() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return null
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return null
    return parsed.filter(isRestorableClip).map(({ videoId, start, end }) => ({ videoId, start, end }))
  } catch (e) {
    console.error('Error loading saved playlist:', e)
    return null
  }
}

export function savePlaylist(playlist) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripClipIds(playlist)))
  } catch (e) {
    console.error('Error saving playlist:', e)
  }
}
