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

  it('shows the current time and countdown to the playlist start', () => {
    render(<SharedClock totalSeconds={15 * 60} />)

    expect(screen.getByText('Current time: 3:10:00 AM')).toBeInTheDocument()
    expect(screen.getByText('Starts in: 35:00')).toBeInTheDocument()
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
})
