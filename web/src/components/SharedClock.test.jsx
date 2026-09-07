import { render, screen, act } from '@testing-library/react'
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
})
