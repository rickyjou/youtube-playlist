import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import YouTubePlayer from './YouTubePlayer.jsx'

describe('YouTubePlayer', () => {
  let PlayerMock
  let now

  beforeEach(() => {
    PlayerMock = vi.fn().mockImplementation(function (element, config) {
      this.config = config
      this.cueVideoById = vi.fn()
      this.destroy = vi.fn()
    })
    window.YT = {
      Player: PlayerMock,
      PlayerState: { ENDED: 0 },
    }
    now = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function advancePastSpuriousGuard() {
    now += 2000
  }

  it('creates a YT.Player with the given clip on mount', async () => {
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} />)

    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))
    const [, config] = PlayerMock.mock.calls[0]
    expect(config.videoId).toBe('abc123')
    expect(config.playerVars).toEqual({ start: 5, end: 50 })
  })

  it('hides the native fullscreen button when disableNativeFullscreen is set', async () => {
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} disableNativeFullscreen />)

    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))
    const [, config] = PlayerMock.mock.calls[0]
    expect(config.playerVars).toEqual({ start: 5, end: 50, fs: 0 })
  })

  it('calls cueVideoById instead of recreating the player when the clip changes', async () => {
    const { rerender } = render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    rerender(<YouTubePlayer videoId="xyz789" start={0} end={30} onEnded={() => {}} />)

    const instance = PlayerMock.mock.instances[0]
    await waitFor(() => expect(instance.cueVideoById).toHaveBeenCalledWith({
      videoId: 'xyz789',
      startSeconds: 0,
      endSeconds: 30,
    }))
    expect(PlayerMock).toHaveBeenCalledTimes(1)
  })

  it('calls onEnded when the player reports the ENDED state after real playback time has passed', async () => {
    const onEnded = vi.fn()
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={onEnded} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    const [, config] = PlayerMock.mock.calls[0]
    advancePastSpuriousGuard()
    config.events.onStateChange({ data: window.YT.PlayerState.ENDED })

    expect(onEnded).toHaveBeenCalled()
  })

  it('ignores an ENDED event that fires immediately after loading a clip', async () => {
    const onEnded = vi.fn()
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={onEnded} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    const [, config] = PlayerMock.mock.calls[0]
    // No time advance: simulates the YouTube IFrame API race where ENDED
    // is reported before the clip ever actually plays.
    config.events.onStateChange({ data: window.YT.PlayerState.ENDED })

    expect(onEnded).not.toHaveBeenCalled()
  })

  it('does not call onEnded twice if the player reports ENDED twice for the same clip', async () => {
    const onEnded = vi.fn()
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={onEnded} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    const [, config] = PlayerMock.mock.calls[0]
    advancePastSpuriousGuard()
    config.events.onStateChange({ data: window.YT.PlayerState.ENDED })
    config.events.onStateChange({ data: window.YT.PlayerState.ENDED })

    expect(onEnded).toHaveBeenCalledTimes(1)
  })

  it('calls onEnded again for a new clip after a previous clip already ended', async () => {
    const onEnded = vi.fn()
    const { rerender } = render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={onEnded} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    const [, config] = PlayerMock.mock.calls[0]
    advancePastSpuriousGuard()
    config.events.onStateChange({ data: window.YT.PlayerState.ENDED })
    expect(onEnded).toHaveBeenCalledTimes(1)

    rerender(<YouTubePlayer videoId="xyz789" start={0} end={30} onEnded={onEnded} />)
    const instance = PlayerMock.mock.instances[0]
    await waitFor(() => expect(instance.cueVideoById).toHaveBeenCalledWith({
      videoId: 'xyz789',
      startSeconds: 0,
      endSeconds: 30,
    }))

    advancePastSpuriousGuard()
    config.events.onStateChange({ data: window.YT.PlayerState.ENDED })

    expect(onEnded).toHaveBeenCalledTimes(2)
  })
})
