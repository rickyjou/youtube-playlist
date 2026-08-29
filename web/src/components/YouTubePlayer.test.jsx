import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import YouTubePlayer from './YouTubePlayer.jsx'

describe('YouTubePlayer', () => {
  let PlayerMock

  beforeEach(() => {
    PlayerMock = vi.fn().mockImplementation(function (element, config) {
      this.config = config
      this.loadVideoById = vi.fn()
      this.destroy = vi.fn()
    })
    window.YT = {
      Player: PlayerMock,
      PlayerState: { ENDED: 0 },
    }
  })

  it('creates a YT.Player with the given clip on mount', async () => {
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} />)

    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))
    const [, config] = PlayerMock.mock.calls[0]
    expect(config.videoId).toBe('abc123')
    expect(config.playerVars).toEqual({ start: 5, end: 50 })
  })

  it('calls loadVideoById instead of recreating the player when the clip changes', async () => {
    const { rerender } = render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    rerender(<YouTubePlayer videoId="xyz789" start={0} end={30} onEnded={() => {}} />)

    const instance = PlayerMock.mock.instances[0]
    await waitFor(() => expect(instance.loadVideoById).toHaveBeenCalledWith({
      videoId: 'xyz789',
      startSeconds: 0,
      endSeconds: 30,
    }))
    expect(PlayerMock).toHaveBeenCalledTimes(1)
  })

  it('calls onEnded when the player reports the ENDED state', async () => {
    const onEnded = vi.fn()
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={onEnded} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    const [, config] = PlayerMock.mock.calls[0]
    config.events.onStateChange({ data: window.YT.PlayerState.ENDED })

    expect(onEnded).toHaveBeenCalled()
  })
})
