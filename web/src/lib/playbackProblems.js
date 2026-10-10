const EMBEDDING_DISABLED = 'Embedding disabled by the owner'
const NOT_FOUND = 'Video not found or private'

// YouTube IFrame API onError codes.
const PLAYER_ERROR_MESSAGES = {
  2: 'Invalid video ID',
  5: "Can't be played in the HTML5 player",
  100: NOT_FOUND,
  101: EMBEDDING_DISABLED,
  150: EMBEDDING_DISABLED,
}

// Why a clip can't play in the embedded player, or null if nothing is known to
// be wrong. A real player error beats the Data API's guess from metadata.
export function describeClipProblem(meta, playerErrorCode) {
  if (playerErrorCode !== undefined) {
    return PLAYER_ERROR_MESSAGES[playerErrorCode] ?? `Can't be played here (error ${playerErrorCode})`
  }
  if (meta?.unavailable) return NOT_FOUND
  if (meta?.embeddable === false) return EMBEDDING_DISABLED
  return null
}
