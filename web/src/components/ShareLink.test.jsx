import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ShareLink from './ShareLink.jsx'

const playlist = [{ videoId: 'abc123', start: 0, end: 10 }]
const otherPlaylist = [{ videoId: 'xyz789', start: 0, end: 20 }]

describe('ShareLink', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  it('does not show the link input until generated', () => {
    render(<ShareLink playlist={playlist} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('generates a link containing the base64-encoded playlist', () => {
    render(<ShareLink playlist={playlist} />)
    fireEvent.click(screen.getByText('Generate Shareable Link'))

    const input = screen.getByRole('textbox')
    expect(input.value).toContain(btoa(JSON.stringify(playlist)))
  })

  it('copies the generated link to the clipboard', () => {
    render(<ShareLink playlist={playlist} />)
    fireEvent.click(screen.getByText('Generate Shareable Link'))
    fireEvent.click(screen.getByText('Copy Link'))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining(btoa(JSON.stringify(playlist))),
    )
  })

  it('clears the generated link once the playlist prop changes', () => {
    const { rerender } = render(<ShareLink playlist={playlist} />)
    fireEvent.click(screen.getByText('Generate Shareable Link'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    rerender(<ShareLink playlist={otherPlaylist} />)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
