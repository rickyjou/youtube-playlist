import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { vi } from 'vitest'
import App from './App.jsx'
import * as youtubeApi from './lib/youtubeApi.js'

vi.mock('./components/YouTubePlayer.jsx', () => ({
  default: ({ videoId, onEnded }) => (
    <div data-testid="player">
      {videoId}
      <button onClick={onEnded}>simulate ended</button>
    </div>
  ),
}))

vi.mock('./lib/youtubeApi.js')

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    youtubeApi.fetchVideoMetadata.mockReset().mockResolvedValue({})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /youtube playlist/i })).toBeInTheDocument()
  })

  it('opens the GitHub link without exposing window.opener', () => {
    render(<App />)
    expect(screen.getByText('Github Repository')).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('starts with the default demo playlist when no share link is present', () => {
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')
  })

  it('loads the playlist from a shared URL instead of the default', () => {
    const shared = [{ videoId: 'sharedvid01', start: 0, end: 20 }]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)

    render(<App />)

    expect(screen.getByTestId('player')).toHaveTextContent('sharedvid01')
  })

  it('shows only the player, total time, and clock for a shared playlist, hiding all editing controls', () => {
    const shared = [{ videoId: 'sharedvid01', start: 0, end: 20 }]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)

    render(<App />)

    expect(screen.getByText('Total time: 0:20')).toBeInTheDocument()
    expect(screen.getByText(/Current time:/)).toBeInTheDocument()
    expect(screen.getByText(/Starts in:/)).toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/start/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/end/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('YouTube link')).not.toBeInTheDocument()
    expect(screen.queryByText('Generate Shareable Link')).not.toBeInTheDocument()
    expect(screen.queryByText('Show advanced JSON editor')).not.toBeInTheDocument()
  })

  it('shows the full editor (start/end fields, delete, share, add) for the default non-shared playlist', () => {
    render(<App />)

    expect(screen.getAllByLabelText('Start minutes')).not.toHaveLength(0)
    expect(screen.getAllByLabelText('End minutes')).not.toHaveLength(0)
    expect(screen.getAllByText('Delete')).not.toHaveLength(0)
    expect(screen.getByLabelText('YouTube link')).toBeInTheDocument()
    expect(screen.getByText('Generate Shareable Link')).toBeInTheDocument()
    expect(screen.getByText('Show advanced JSON editor')).toBeInTheDocument()
  })

  it('does not show prev/next clip buttons in the default non-shared editing view', () => {
    render(<App />)

    expect(screen.queryByLabelText('Previous clip')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Next clip')).not.toBeInTheDocument()
  })

  it('does not show a fullscreen toggle button in the default non-shared editing view', () => {
    render(<App />)

    expect(screen.queryByLabelText(/fullscreen/i)).not.toBeInTheDocument()
  })

  it('requests fullscreen on the player wrapper when the fullscreen button is clicked in shared view', () => {
    const shared = [{ videoId: 'sharedvid01', start: 0, end: 20 }]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)
    const requestFullscreen = vi.fn()
    HTMLElement.prototype.requestFullscreen = requestFullscreen

    render(<App />)
    fireEvent.click(screen.getByLabelText('Enter fullscreen'))

    expect(requestFullscreen).toHaveBeenCalledTimes(1)
  })

  it('hides the fullscreen toggle after inactivity in fullscreen, and shows it again on mouse movement', () => {
    const shared = [{ videoId: 'sharedvid01', start: 0, end: 20 }]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)
    HTMLElement.prototype.requestFullscreen = vi.fn()

    vi.useFakeTimers()
    const { container } = render(<App />)
    const wrapper = container.querySelector('.player-wrapper')

    Object.defineProperty(document, 'fullscreenElement', { value: wrapper, configurable: true })
    fireEvent(document, new Event('fullscreenchange'))

    expect(wrapper.className).not.toContain('controls-hidden')

    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(wrapper.className).toContain('controls-hidden')

    fireEvent.mouseMove(wrapper)
    expect(wrapper.className).not.toContain('controls-hidden')

    vi.useRealTimers()
  })

  it('switches to Exit fullscreen once fullscreen is entered, and exits it when clicked again', () => {
    const shared = [{ videoId: 'sharedvid01', start: 0, end: 20 }]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)
    HTMLElement.prototype.requestFullscreen = vi.fn()
    const exitFullscreen = vi.fn()
    document.exitFullscreen = exitFullscreen

    const { container } = render(<App />)
    const wrapper = container.querySelector('.player-wrapper')

    Object.defineProperty(document, 'fullscreenElement', { value: wrapper, configurable: true })
    fireEvent(document, new Event('fullscreenchange'))

    const exitButton = screen.getByLabelText('Exit fullscreen')
    fireEvent.click(exitButton)
    expect(exitFullscreen).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
    fireEvent(document, new Event('fullscreenchange'))

    expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument()
  })

  it('advances to the next clip and wraps to the first when Next is clicked past the last clip in shared view', () => {
    const shared = [
      { videoId: 'sharedvid01', start: 0, end: 20 },
      { videoId: 'sharedvid02', start: 0, end: 30 },
    ]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)

    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('sharedvid01')

    fireEvent.click(screen.getByLabelText('Next clip'))
    expect(screen.getByTestId('player')).toHaveTextContent('sharedvid02')

    fireEvent.click(screen.getByLabelText('Next clip'))
    expect(screen.getByTestId('player')).toHaveTextContent('sharedvid01')
  })

  it('goes to the previous clip and wraps to the last when Previous is clicked before the first clip in shared view', () => {
    const shared = [
      { videoId: 'sharedvid01', start: 0, end: 20 },
      { videoId: 'sharedvid02', start: 0, end: 30 },
    ]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)

    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('sharedvid01')

    fireEvent.click(screen.getByLabelText('Previous clip'))
    expect(screen.getByTestId('player')).toHaveTextContent('sharedvid02')
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

  it('replaces the whole playlist and resets to the first clip when a playlist link is submitted', async () => {
    youtubeApi.fetchPlaylistVideoIds.mockResolvedValue(['newVid'])
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      newVid: { title: 'New', thumbnail: '', durationSeconds: 42 },
    })
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PLxyz' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(screen.getByTestId('player')).toHaveTextContent('newVid'))
    expect(screen.queryByText('6MTbZBg9pQc')).not.toBeInTheDocument()
  })

  it('appends a single video to the existing playlist when a video link is submitted', async () => {
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      newVid: { title: 'New', thumbnail: '', durationSeconds: 42 },
    })
    render(<App />)
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/watch?v=newVid12345' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(3))
    expect(screen.getByTestId('player')).toHaveTextContent('6MTbZBg9pQc')
  })

  it('fetches metadata for the default playlist on mount so titles and end-time reset use real video data', async () => {
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      '6MTbZBg9pQc': { title: 'Video One', thumbnail: '', durationSeconds: 761 },
      gUSWWqnOKt0: { title: 'Video Two', thumbnail: '', durationSeconds: 140 },
    })
    render(<App />)

    await waitFor(() => expect(screen.getByText('Video One')).toBeInTheDocument())
    expect(screen.getByText('Video Two')).toBeInTheDocument()
  })

  it('does not fetch metadata when viewing a shared playlist', () => {
    const shared = [{ videoId: 'sharedvid01', start: 0, end: 20 }]
    const encoded = btoa(JSON.stringify(shared))
    window.history.pushState({}, '', `/?playlist=${encoded}`)

    render(<App />)

    expect(youtubeApi.fetchVideoMetadata).not.toHaveBeenCalled()
  })
})
