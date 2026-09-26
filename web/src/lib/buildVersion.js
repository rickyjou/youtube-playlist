function pad(value) {
  return String(value).padStart(2, '0')
}

export function formatBuildVersion(date, buildNumber) {
  const stamp = `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`
  return `v${stamp} (build ${buildNumber || 'dev'})`
}
