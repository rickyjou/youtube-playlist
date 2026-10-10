import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PlaylistView from './PlaylistView.jsx'

const playlist = [
  { id: 'clip-a', videoId: 'a', start: 0, end: 60 },
  { id: 'clip-b', videoId: 'b', start: 10, end: 40 },
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
      playbackErrors={{}}
      totalSeconds={90}
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

  it('exposes the full title as a tooltip so truncated titles stay readable', () => {
    const longTitle = 'A very long video title that will be truncated with an ellipsis in the editor row'
    renderView({ metadata: { a: { title: longTitle, thumbnail: '', durationSeconds: 60 } } })
    expect(screen.getByText(longTitle)).toHaveAttribute('title', longTitle)
    expect(screen.getByText('b')).toHaveAttribute('title', 'b')
  })

  it('shows the total duration it is given', () => {
    renderView({ totalSeconds: 125 })
    expect(screen.getByText('Total time: 2:05')).toBeInTheDocument()
  })

  it('does not re-render rows whose clip and props are unchanged when another row is edited', () => {
    // Counts how often row b renders: its title getter is read on every render.
    let rowBRenders = 0
    const metaB = {
      get title() {
        rowBRenders += 1
        return 'B'
      },
    }
    const metadata = { b: metaB }
    const handlers = { onUpdateClip: vi.fn(), onDeleteClip: vi.fn(), onMoveClip: vi.fn() }
    const view = (clips) => (
      <PlaylistView playlist={clips} currentIndex={0} metadata={metadata} totalSeconds={0} {...handlers} />
    )
    const { rerender } = render(view(playlist))
    const rendersAfterMount = rowBRenders

    rerender(view([{ ...playlist[0], end: 61 }, playlist[1]]))

    expect(screen.getAllByLabelText('End seconds')[0]).toHaveValue(1)
    expect(rowBRenders).toBe(rendersAfterMount)
  })

  it('calls onUpdateClip with the new end time when the end seconds input changes', () => {
    const { onUpdateClip } = renderView()
    const endSecondsInputs = screen.getAllByLabelText('End seconds')
    fireEvent.change(endSecondsInputs[0], { target: { value: '30' } })
    expect(onUpdateClip).toHaveBeenCalledWith(0, { start: 0, end: 90 })
  })

  it('calls onUpdateClip with the new end time when the end minutes input changes', () => {
    const { onUpdateClip } = renderView()
    const endMinutesInputs = screen.getAllByLabelText('End minutes')
    fireEvent.change(endMinutesInputs[0], { target: { value: '2' } })
    expect(onUpdateClip).toHaveBeenCalledWith(0, { start: 0, end: 120 })
  })

  it('carries seconds over into minutes when 60 or more is entered', () => {
    const { onUpdateClip } = renderView()
    const endSecondsInputs = screen.getAllByLabelText('End seconds')
    fireEvent.change(endSecondsInputs[0], { target: { value: '75' } })
    expect(onUpdateClip).toHaveBeenCalledWith(0, { start: 0, end: 135 })
  })

  it('shows minutes and seconds split from the stored total seconds', () => {
    renderView()
    expect(screen.getAllByLabelText('Start minutes')[1]).toHaveValue(0)
    expect(screen.getAllByLabelText('Start seconds')[1]).toHaveValue(10)
    expect(screen.getAllByLabelText('End minutes')[1]).toHaveValue(0)
    expect(screen.getAllByLabelText('End seconds')[1]).toHaveValue(40)
  })

  it('selects the existing digits when a time input is focused, so typing overwrites them', () => {
    renderView()
    const input = screen.getAllByLabelText('End seconds')[1]
    const selectSpy = vi.spyOn(input, 'select')

    fireEvent.focus(input)

    expect(selectSpy).toHaveBeenCalled()
  })

  it('resets the start time to 0:00 without touching the end time', () => {
    const { onUpdateClip } = renderView()
    fireEvent.click(screen.getAllByLabelText('Reset Start time')[1])
    expect(onUpdateClip).toHaveBeenCalledWith(1, { start: 0, end: 40 })
  })

  it('resets the end time to the video duration without touching the start time', () => {
    const { onUpdateClip } = renderView({
      metadata: { b: { title: 'B', thumbnail: '', durationSeconds: 200 } },
    })
    fireEvent.click(screen.getAllByLabelText('Reset End time')[1])
    expect(onUpdateClip).toHaveBeenCalledWith(1, { start: 10, end: 200 })
  })

  it('resets the end time to 0:00 when the video duration is not known yet', () => {
    const { onUpdateClip } = renderView()
    fireEvent.click(screen.getAllByLabelText('Reset End time')[1])
    expect(onUpdateClip).toHaveBeenCalledWith(1, { start: 10, end: 0 })
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

  it('flags a clip whose video failed to play with an icon whose hover text names the reason', () => {
    renderView({ playbackErrors: { b: 150 } })
    const rows = screen.getAllByRole('listitem')

    const icon = within(rows[1]).getByRole('img', { name: 'Embedding disabled by the owner' })
    expect(icon).toHaveAttribute('title', 'Embedding disabled by the owner')
    expect(within(rows[0]).queryByRole('img', { name: /embedding/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('flags a clip before playback when its metadata says it cannot be embedded', () => {
    renderView({ metadata: { a: { title: 'A', embeddable: false } } })
    const rows = screen.getAllByRole('listitem')

    expect(within(rows[0]).getByRole('img', { name: 'Embedding disabled by the owner' })).toBeInTheDocument()
  })

  it('flags a clip whose video the Data API could not find', () => {
    renderView({ metadata: { b: { unavailable: true } } })
    const rows = screen.getAllByRole('listitem')

    expect(within(rows[1]).getByRole('img', { name: 'Video not found or private' })).toBeInTheDocument()
  })
})
