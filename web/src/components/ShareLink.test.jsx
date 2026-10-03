import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ShareLink from './ShareLink.jsx'
import { shortenUrl } from '../lib/urlShortener.js'

vi.mock('../lib/urlShortener.js', () => ({ shortenUrl: vi.fn() }))

const SHORT_URL = 'http://go.apexarkai.com/AbCd1234'

const playlist = [{ videoId: 'abcdefghijk', start: 0, end: 10 }]
const otherPlaylist = [{ videoId: 'xyz78901234', start: 0, end: 20 }]

async function generate() {
  await act(async () => {
    fireEvent.click(screen.getByText('Generate Shareable Link'))
  })
}

describe('ShareLink', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    shortenUrl.mockReset()
    shortenUrl.mockResolvedValue(SHORT_URL)
  })

  it('does not show the link input until generated', () => {
    render(<ShareLink playlist={playlist} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows the shortened link once generated', async () => {
    render(<ShareLink playlist={playlist} />)
    await generate()

    expect(screen.getByRole('textbox').value).toBe(SHORT_URL)
  })

  it('falls back to the long link and shows a note when shortening fails', async () => {
    shortenUrl.mockResolvedValue(null)
    render(<ShareLink playlist={playlist} />)
    await generate()

    const input = screen.getByRole('textbox')
    expect(input.value).toContain(btoa(JSON.stringify(playlist)))
    expect(screen.getByText(/couldn.t shorten link/i)).toBeInTheDocument()
  })

  it('copies the generated link to the clipboard', async () => {
    render(<ShareLink playlist={playlist} />)
    await generate()
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Link'))
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SHORT_URL)
  })

  it('opens the generated link in a reusable named tab without leaking window.opener', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    render(<ShareLink playlist={playlist} />)
    await generate()

    const link = screen.getByRole('textbox').value
    fireEvent.click(screen.getByText('Open in New Tab'))

    expect(openSpy).toHaveBeenCalledWith(link, 'sharedPlaylistPreview', 'noopener,noreferrer')
  })

  it('shows an error if copying to the clipboard fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    render(<ShareLink playlist={playlist} />)
    await generate()
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Link'))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Could not copy link: denied')
  })

  it('clears the generated link once the playlist prop changes', async () => {
    const { rerender } = render(<ShareLink playlist={playlist} />)
    await generate()
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    rerender(<ShareLink playlist={otherPlaylist} />)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('disables the generate button while shortening is in flight', async () => {
    let resolveShorten
    shortenUrl.mockReturnValue(
      new Promise((resolve) => {
        resolveShorten = resolve
      }),
    )
    render(<ShareLink playlist={playlist} />)
    fireEvent.click(screen.getByText('Generate Shareable Link'))

    expect(screen.getByText('Generating...')).toBeDisabled()

    resolveShorten(SHORT_URL)
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())
  })

  it('refuses to build a link the shared view would reject, and says why', async () => {
    const tooLong = Array.from({ length: 501 }, () => ({ videoId: 'abcdefghijk', start: 0, end: 1 }))
    render(<ShareLink playlist={tooLong} />)
    await generate()

    expect(shortenUrl).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/can.t be shared/i)
  })

  it('refuses a clip whose start is after its end', async () => {
    render(<ShareLink playlist={[{ videoId: 'abcdefghijk', start: 30, end: 10 }]} />)
    await generate()

    expect(shortenUrl).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/can.t be shared/i)
  })

  it('clears the share error once the playlist prop changes', async () => {
    const { rerender } = render(<ShareLink playlist={[{ videoId: 'abcdefghijk', start: 30, end: 10 }]} />)
    await generate()
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(<ShareLink playlist={playlist} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
