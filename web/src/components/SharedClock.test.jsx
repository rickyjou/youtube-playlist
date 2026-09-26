import { render, screen, act, fireEvent } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import SharedClock from './SharedClock.jsx'

describe('SharedClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 3, 10, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the current time, start time, total time and countdown, in that order', () => {
    render(<SharedClock totalSeconds={15 * 60} />)

    const lines = screen.getAllByRole('paragraph').map((p) => p.textContent)
    expect(lines).toEqual([
      'Current time: 3:10:00 AM',
      'Start time: 3:45:00 AM',
      'Total time: 15:00',
      'Starts in: 35:00',
    ])
  })

  it('ticks every second', () => {
    render(<SharedClock totalSeconds={15 * 60} />)
    expect(screen.getByText('Starts in: 35:00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText('Current time: 3:10:01 AM')).toBeInTheDocument()
    expect(screen.getByText('Starts in: 34:59')).toBeInTheDocument()
  })

  it('calls onReachZero once when the countdown reaches zero', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 3, 44, 58))
    const onReachZero = vi.fn()
    render(<SharedClock totalSeconds={15 * 60} onReachZero={onReachZero} />)
    expect(screen.getByText('Starts in: 00:02')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onReachZero).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Starts in: 00:00')).toBeInTheDocument()
    expect(onReachZero).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onReachZero).toHaveBeenCalledTimes(1)
  })

  it('calls onReachZero immediately when the playlist is an hour or longer', () => {
    const onReachZero = vi.fn()
    render(<SharedClock totalSeconds={60 * 60} onReachZero={onReachZero} />)

    expect(onReachZero).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onReachZero).toHaveBeenCalledTimes(1)
  })

  it('still calls onReachZero once if a throttled/backgrounded tab misses the exact zero tick', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 3, 44, 55))
    const onReachZero = vi.fn()
    render(<SharedClock totalSeconds={15 * 60} onReachZero={onReachZero} />)
    expect(screen.getByText('Starts in: 00:05')).toBeInTheDocument()

    // Simulate a background tab whose timer got throttled: real time jumps well
    // past the moment the countdown would have hit exactly 0 before the next
    // tick actually fires.
    vi.setSystemTime(new Date(2026, 0, 1, 3, 45, 10))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onReachZero).toHaveBeenCalledTimes(1)
    // The late tick runs at 3:45:11, eleven seconds after the 3:45:00 start.
    expect(onReachZero).toHaveBeenCalledWith(11)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onReachZero).toHaveBeenCalledTimes(1)
  })

  it('fires at the exact start instant rather than on the next once-a-second tick', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 3, 44, 58, 400))
    const onReachZero = vi.fn()
    render(<SharedClock totalSeconds={15 * 60} onReachZero={onReachZero} />)

    act(() => {
      vi.advanceTimersByTime(1599)
    })
    expect(onReachZero).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onReachZero).toHaveBeenCalledTimes(1)
    expect(onReachZero).toHaveBeenCalledWith(0)
  })

  it.each(['visibilitychange', 'focus'])(
    'fires on %s once the start has passed, even if throttled timers have not run',
    (eventName) => {
      vi.setSystemTime(new Date(2026, 0, 1, 3, 44, 55))
      const onReachZero = vi.fn()
      render(<SharedClock totalSeconds={15 * 60} onReachZero={onReachZero} />)

      // Time passes without any timer firing, as in a heavily throttled window.
      vi.setSystemTime(new Date(2026, 0, 1, 3, 45, 3))
      act(() => {
        fireEvent(eventName === 'focus' ? window : document, new Event(eventName))
      })

      expect(onReachZero).toHaveBeenCalledTimes(1)
      expect(onReachZero).toHaveBeenCalledWith(3)
    },
  )

  it('does not fire early if the system clock is moved back before the start', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 3, 44, 58))
    const onReachZero = vi.fn()
    render(<SharedClock totalSeconds={15 * 60} onReachZero={onReachZero} />)

    vi.setSystemTime(new Date(2026, 0, 1, 3, 44, 0))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onReachZero).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(58_000)
    })
    expect(onReachZero).toHaveBeenCalledTimes(1)
    expect(onReachZero).toHaveBeenCalledWith(0)
  })

  it('fires promptly if the system clock jumps forward past the start', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 3, 40, 0))
    const onReachZero = vi.fn()
    render(<SharedClock totalSeconds={15 * 60} onReachZero={onReachZero} />)

    vi.setSystemTime(new Date(2026, 0, 1, 3, 45, 0, 500))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onReachZero).toHaveBeenCalledTimes(1)
  })

  it('calls the latest onReachZero without restarting the countdown when the callback changes', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 3, 44, 58))
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<SharedClock totalSeconds={15 * 60} onReachZero={first} />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    rerender(<SharedClock totalSeconds={15 * 60} onReachZero={second} />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('fires only once under StrictMode, which runs effects twice in development', () => {
    const onReachZero = vi.fn()
    render(
      <StrictMode>
        <SharedClock totalSeconds={60 * 60} onReachZero={onReachZero} />
      </StrictMode>,
    )

    expect(onReachZero).toHaveBeenCalledTimes(1)
  })
})
