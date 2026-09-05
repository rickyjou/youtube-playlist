export async function shortenUrl(longUrl) {
  try {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`,
    )
    if (!response.ok) return null
    const shortUrl = (await response.text()).trim()
    if (!/^https?:\/\//.test(shortUrl)) return null
    return shortUrl
  } catch (e) {
    console.error('Error shortening URL:', e)
    return null
  }
}
