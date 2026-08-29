import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import App from './App.jsx'

vi.mock('./components/YouTubePlayer.jsx', () => ({
  default: ({ videoId, onEnded }) => (
    <div data-testid="player">
      {videoId}
      <button onClick={onEnded}>simulate ended</button>
    </div>
  ),
}))

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renders the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /youtube playlist/i })).toBeInTheDocument()
  })

  it('starts with the default demo playlist when no share link is present', () => {
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')
  })

  it('loads the playlist from a shared URL instead of the default', () => {
    const shared = [{ videoId: 'shared1', start: 0, end: 20 }]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)

    render(<App />)

    expect(screen.getByTestId('player')).toHaveTextContent('shared1')
  })

  it('advances to the next clip when the player reports the current clip ended', () => {
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')

    fireEvent.click(screen.getByText('simulate ended'))

    expect(screen.getByTestId('player')).toHaveTextContent('gUSWWqnOKt0')
  })

  it('shows the next clip after deleting the currently playing one', () => {
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')

    fireEvent.click(screen.getAllByText('Delete')[0])

    expect(screen.getByTestId('player')).toHaveTextContent('gUSWWqnOKt0')
  })

  it('does not leave currentIndex out of bounds when deleting the last clip', () => {
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')

    // Advance to the second clip (which is also the last)
    fireEvent.click(screen.getByText('simulate ended'))
    expect(screen.getByTestId('player')).toHaveTextContent('gUSWWqnOKt0')

    // Delete the currently playing (last) clip
    fireEvent.click(screen.getAllByText('Delete')[1])

    // Should now show the remaining first clip, not disappear
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')
  })

  it('keeps following the currently-playing clip when it is moved down', () => {
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')

    fireEvent.click(screen.getAllByText('↓')[0])

    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')
  })
})
