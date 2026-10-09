let lastClipId = 0

export function withClipIds(clips) {
  return clips.map((clip) => ({ ...clip, id: `clip-${++lastClipId}` }))
}

export function stripClipIds(clips) {
  return clips.map(({ id: _id, ...clip }) => clip)
}
