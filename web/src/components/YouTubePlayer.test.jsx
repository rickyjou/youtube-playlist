import { render, waitFor, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import YouTubePlayer from './YouTubePlayer.jsx'

describe('YouTubePlayer', () => {
  let PlayerMock
  let now

  beforeEach(() => {
    PlayerMock = vi.fn().mockImplementation(function (element, config) {
      this.config = config
      this.cueVideoById = vi.fn()
      this.loadVideoById = vi.fn()
      this.playVideo = vi.fn()
      this.getPlayerState = vi.fn(() => window.YT.PlayerState.PAUSED)
      this.destroy = vi.fn()
    })
    window.YT = {
      Player: PlayerMock,
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 },
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
    expect(config.playerVars).toEqual({ start: 5, end: 50, playsinline: 1 })
  })

  it('hides the native fullscreen button when disableNativeFullscreen is set', async () => {
    render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} disableNativeFullscreen />)

    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))
    const [, config] = PlayerMock.mock.calls[0]
    expect(config.playerVars).toEqual({ start: 5, end: 50, playsinline: 1, fs: 0 })
  })

  it('cues (rather than autoplays) a new clip before the player has ever played', async () => {
    const { rerender } = render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    rerender(<YouTubePlayer videoId="xyz789" start={0} end={30} onEnded={() => {}} />)

    const instance = PlayerMock.mock.instances[0]
    await waitFor(() => expect(instance.cueVideoById).toHaveBeenCalledWith({
      videoId: 'xyz789',
      startSeconds: 0,
      endSeconds: 30,
    }))
    expect(instance.loadVideoById).not.toHaveBeenCalled()
    expect(PlayerMock).toHaveBeenCalledTimes(1)
  })

  it('autoplays the next clip once the player has played at least once', async () => {
    const { rerender } = render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} />)
    await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

    const [, config] = PlayerMock.mock.calls[0]
    config.events.onStateChange({ data: window.YT.PlayerState.PLAYING })

    rerender(<YouTubePlayer videoId="xyz789" start={0} end={30} onEnded={() => {}} />)

    const instance = PlayerMock.mock.instances[0]
    await waitFor(() => expect(instance.loadVideoById).toHaveBeenCalledWith({
      videoId: 'xyz789',
      startSeconds: 0,
      endSeconds: 30,
    }))
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

  describe('forced autoplay requested before the player is ready', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('plays once the player becomes ready if the request arrived while its methods were not yet available', async () => {
      // The real YT.Player only exposes loadVideoById etc. after onReady fires.
      PlayerMock.mockImplementation(function (element, config) {
        this.config = config
        this.destroy = vi.fn()
        this.becomeReady = () => {
          this.loadVideoById = vi.fn()
          this.cueVideoById = vi.fn()
          this.playVideo = vi.fn()
          this.getPlayerState = vi.fn(() => window.YT.PlayerState.PAUSED)
          config.events.onReady?.({ target: this })
        }
      })
      const { rerender } = render(
        <YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={0} />,
      )
      await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

      rerender(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={1} />)

      const instance = PlayerMock.mock.instances[0]
      act(() => {
        instance.becomeReady()
      })

      expect(instance.loadVideoById).toHaveBeenCalledWith({
        videoId: 'abc123',
        startSeconds: 5,
        endSeconds: 50,
      })
    })

    it('plays once the player is created and ready if the request arrived before the IFrame API loaded', async () => {
      const YT = window.YT
      delete window.YT
      const { rerender } = render(
        <YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={0} />,
      )
      rerender(<YouTubePlayer videoId="xyz789" start={0} end={30} onEnded={() => {}} autoplayToken={1} />)
      expect(PlayerMock).not.toHaveBeenCalled()

      window.YT = YT
      window.onYouTubeIframeAPIReady()
      await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

      const [, config] = PlayerMock.mock.calls[0]
      const instance = PlayerMock.mock.instances[0]
      act(() => {
        config.events.onReady({ target: instance })
      })

      expect(instance.loadVideoById).toHaveBeenCalledWith({
        videoId: 'xyz789',
        startSeconds: 0,
        endSeconds: 30,
      })
    })

    it('still falls back to the tap-to-start prompt if the deferred play does not start', async () => {
      const { rerender } = render(
        <YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={0} />,
      )
      await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))
      const instance = PlayerMock.mock.instances[0]
      const loadVideoById = instance.loadVideoById
      delete instance.loadVideoById

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      rerender(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={1} />)

      instance.loadVideoById = loadVideoById
      const [, config] = PlayerMock.mock.calls[0]
      act(() => {
        config.events.onReady({ target: instance })
      })
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(loadVideoById).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/tap to start/i)).toBeInTheDocument()
    })

    it('does not load anything on ready when no forced play is pending', async () => {
      render(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={0} />)
      await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

      const [, config] = PlayerMock.mock.calls[0]
      const instance = PlayerMock.mock.instances[0]
      act(() => {
        config.events.onReady?.({ target: instance })
      })

      expect(instance.loadVideoById).not.toHaveBeenCalled()
    })
  })

  describe('tap-to-start fallback', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows a tap-to-start prompt if a forced autoplay does not actually start playing', async () => {
      const { rerender } = render(
        <YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={0} />,
      )
      await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      rerender(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={1} />)

      const instance = PlayerMock.mock.instances[0]
      expect(instance.loadVideoById).toHaveBeenCalledWith({
        videoId: 'abc123',
        startSeconds: 5,
        endSeconds: 50,
      })
      expect(screen.queryByText(/tap to start/i)).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(screen.getByText(/tap to start/i)).toBeInTheDocument()
    })

    it('does not show the tap-to-start prompt if playback actually starts in time', async () => {
      const { rerender } = render(
        <YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={0} />,
      )
      await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      rerender(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={1} />)

      const [, config] = PlayerMock.mock.calls[0]
      act(() => {
        config.events.onStateChange({ data: window.YT.PlayerState.PLAYING })
      })

      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(screen.queryByText(/tap to start/i)).not.toBeInTheDocument()
    })

    it('calls playVideo and hides the prompt when tapped', async () => {
      const { rerender } = render(
        <YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={0} />,
      )
      await waitFor(() => expect(PlayerMock).toHaveBeenCalledTimes(1))

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      rerender(<YouTubePlayer videoId="abc123" start={5} end={50} onEnded={() => {}} autoplayToken={1} />)
      act(() => {
        vi.advanceTimersByTime(1500)
      })
      const button = screen.getByText(/tap to start/i)

      const instance = PlayerMock.mock.instances[0]
      fireEvent.click(button)

      expect(instance.playVideo).toHaveBeenCalledTimes(1)
      expect(screen.queryByText(/tap to start/i)).not.toBeInTheDocument()
    })
  })
})
