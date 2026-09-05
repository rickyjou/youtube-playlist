import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ShareLink from './ShareLink.jsx'

const playlist = [{ videoId: 'abc123', start: 0, end: 10 }]
const otherPlaylist = [{ videoId: 'xyz789', start: 0, end: 20 }]

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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('https://tinyurl.com/abc123'),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not show the link input until generated', () => {
    render(<ShareLink playlist={playlist} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows the shortened link once generated', async () => {
    render(<ShareLink playlist={playlist} />)
    await generate()

    expect(screen.getByRole('textbox').value).toBe('https://tinyurl.com/abc123')
  })

  it('falls back to the long link and shows a note when shortening fails', async () => {
    fetch.mockResolvedValue({ ok: false, text: () => Promise.resolve('') })
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

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://tinyurl.com/abc123')
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
    let resolveFetch
    fetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    render(<ShareLink playlist={playlist} />)
    fireEvent.click(screen.getByText('Generate Shareable Link'))

    expect(screen.getByText('Generating...')).toBeDisabled()

    resolveFetch({ ok: true, text: () => Promise.resolve('https://tinyurl.com/abc123') })
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())
  })
})
