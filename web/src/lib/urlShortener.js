// Shortens share links with the tinyurl app on Volcano (go.apexarkai.com).
// The API only accepts requests whose Origin is on its allowlist, which
// includes https://rickyjou.github.io.
const TINYURL_API = 'https://222b03b1-9b0e-45e8-8d20-a97e8a494853.frontends.volcano.run/api/links'

// Must match the tinyurl `links` table constraint.
const MAX_URL_LENGTH = 8192

export async function shortenUrl(longUrl) {
  if (longUrl.length > MAX_URL_LENGTH) return null
  try {
    const response = await fetch(TINYURL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longUrl }),
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`)
    if (!/^https?:\/\//.test(body?.shortUrl ?? '')) throw new Error('Response has no short URL')
    return body.shortUrl
  } catch (e) {
    console.error('Error shortening URL:', e)
    return null
  }
}
