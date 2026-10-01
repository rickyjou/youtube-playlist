// Shortens share links with the tinyurl app on Volcano (go.apexarkai.com).
// These are public values: the anon key is a publishable, auth-only key, and
// row-level security on the `links` table limits what a guest can do.
const VOLCANO_API_URL = 'https://api.volcano.dev'
const VOLCANO_ANON_KEY =
  'ak-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYmYiOjE3OTA4NTMxODgsImlhdCI6MTc5MDg1MzE4OCwianRpIjoiOTBiNmM3OTc3MmIwYWFiMGMyMDBhNjkzNTliZjhkMGMyMTBhMjc2ODZhMTM0NWMzNjFkOTg1ZWEzYWFiYWRkZSIsInByb2plY3RfaWQiOiIzNzhmODhlNi0wMTZjLTQ2ODUtOTRjZC00NDk0ZjkwYWM1NjciLCJrZXlfaWQiOiJhODc3ZmE0Yy01ZWE4LTQzYmItYWQ1Zi02OWI1MWZhODM3MGMiLCJyb2xlIjoiYW5vbiIsInBlcm1pc3Npb25zIjpbImF1dGguc2lnbnVwIiwiYXV0aC5zaWduaW4iLCJhdXRoLnJlZnJlc2giLCJhdXRoLmxvZ291dCIsImF1dGgucGFzc3dvcmRfcmVzZXQiLCJhdXRoLmNvbmZpcm1fZW1haWwiLCJhdXRoLnJlc2VuZF9jb25maXJtYXRpb24iXX0.18qaNxpNVpQNotLzj2WHPf7M5Pj25c-ZemA6ZMA2QHs'
const VOLCANO_DATABASE = 'app'
const SHORT_URL_BASE = 'http://go.apexarkai.com'

// Must match the tinyurl `links` table constraints.
const MAX_URL_LENGTH = 8192
const CODE_LENGTH = 8
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const MAX_ATTEMPTS = 5

let clientPromise = null

// The SDK is loaded on first use so it stays out of the initial page bundle.
async function createClient() {
  const { VolcanoAuth } = await import('@volcano.dev/sdk')
  const client = new VolcanoAuth({ apiUrl: VOLCANO_API_URL, anonKey: VOLCANO_ANON_KEY })
  client.database(VOLCANO_DATABASE)
  const { user } = await client.initialize()
  if (!user) {
    const { error } = await client.auth.signUpAnonymous()
    if (error) throw error
  }
  return client
}

function getClient() {
  if (!clientPromise) {
    clientPromise = createClient().catch((e) => {
      clientPromise = null
      throw e
    })
  }
  return clientPromise
}

// Cryptographically random code over [A-Za-z0-9]; rejection sampling keeps
// every character equally likely (256 is not a multiple of 62).
function generateCode() {
  const limit = 256 - (256 % ALPHABET.length)
  let code = ''
  while (code.length < CODE_LENGTH) {
    for (const b of crypto.getRandomValues(new Uint8Array(CODE_LENGTH * 2))) {
      if (b < limit && code.length < CODE_LENGTH) code += ALPHABET[b % ALPHABET.length]
    }
  }
  return code
}

function isDuplicateCode(error) {
  return /duplicate key|unique constraint/i.test(error?.message ?? '')
}

export async function shortenUrl(longUrl) {
  if (longUrl.length > MAX_URL_LENGTH) return null
  try {
    const client = await getClient()
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const code = generateCode()
      const { error } = await client.insert('links', { code, url: longUrl })
      if (!error) return `${SHORT_URL_BASE}/${code}`
      if (!isDuplicateCode(error)) throw error
    }
    throw new Error('Could not generate a unique short code')
  } catch (e) {
    console.error('Error shortening URL:', e)
    return null
  }
}
