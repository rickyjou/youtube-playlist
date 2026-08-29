import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PlaylistView from './PlaylistView.jsx'

const playlist = [
  { videoId: 'a', start: 0, end: 60 },
  { videoId: 'b', start: 10, end: 40 },
]

function renderView(overrides = {}) {
  const handlers = {
    onUpdateClip: vi.fn(),
    onDeleteClip: vi.fn(),
    onMoveClip: vi.fn(),
    ...overrides,
  }
  render(
    <PlaylistView
      playlist={playlist}
      currentIndex={0}
      metadata={{}}
      {...handlers}
    />
  )
  return handlers
}

describe('PlaylistView', () => {
  it('renders one row per clip with its videoId as a fallback title', () => {
    renderView()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('shows the total formatted duration across all clips', () => {
    renderView()
    expect(screen.getByText('Total time: 1:30')).toBeInTheDocument()
  })

  it('calls onUpdateClip with the new end time when an end input changes', () => {
    const { onUpdateClip } = renderView()
    const endInputs = screen.getAllByLabelText('End')
    fireEvent.change(endInputs[0], { target: { value: '90' } })
    expect(onUpdateClip).toHaveBeenCalledWith(0, { start: 0, end: 90 })
  })

  it('calls onDeleteClip with the row index', () => {
    const { onDeleteClip } = renderView()
    fireEvent.click(screen.getAllByText('Delete')[1])
    expect(onDeleteClip).toHaveBeenCalledWith(1)
  })

  it('disables the up-move button on the first row and the down-move button on the last', () => {
    renderView()
    const upButtons = screen.getAllByText('↑')
    const downButtons = screen.getAllByText('↓')
    expect(upButtons[0]).toBeDisabled()
    expect(downButtons[1]).toBeDisabled()
  })
})
