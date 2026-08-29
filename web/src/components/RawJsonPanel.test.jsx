import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RawJsonPanel from './RawJsonPanel.jsx'

describe('RawJsonPanel', () => {
  it('is collapsed by default', () => {
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={vi.fn()} onReset={vi.fn()} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('parses valid JSON and calls onReplacePlaylist', () => {
    const onReplacePlaylist = vi.fn()
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={onReplacePlaylist} onReset={vi.fn()} />)

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '[{"videoId":"abc12345678","start":0,"end":10}]' },
    })
    fireEvent.click(screen.getByText('Update and Play from beginning'))

    expect(onReplacePlaylist).toHaveBeenCalledWith([{ videoId: 'abc12345678', start: 0, end: 10 }])
  })

  it('shows an error for malformed JSON instead of calling onReplacePlaylist', () => {
    const onReplacePlaylist = vi.fn()
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={onReplacePlaylist} onReset={vi.fn()} />)

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not json' } })
    fireEvent.click(screen.getByText('Update and Play from beginning'))

    expect(screen.getByRole('alert')).toHaveTextContent('JSON format error')
    expect(onReplacePlaylist).not.toHaveBeenCalled()
  })

  it('shows an error for valid JSON with the wrong shape instead of calling onReplacePlaylist', () => {
    const onReplacePlaylist = vi.fn()
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={onReplacePlaylist} onReset={vi.fn()} />)

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{}' } })
    fireEvent.click(screen.getByText('Update and Play from beginning'))

    expect(screen.getByRole('alert')).toHaveTextContent('JSON format error')
    expect(onReplacePlaylist).not.toHaveBeenCalled()
  })

  it('calls onReset after the user confirms clearing the playlist', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onReset = vi.fn()
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={vi.fn()} onReset={onReset} />)

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.click(screen.getByText('Reset and Remove All Videos'))

    expect(onReset).toHaveBeenCalled()
    window.confirm.mockRestore()
  })

  it('does not overwrite unsaved textarea edits when the playlist changes elsewhere while open', () => {
    const playlist = [{ videoId: 'a', start: 0, end: 10 }]
    const { rerender } = render(
      <RawJsonPanel playlist={playlist} onReplacePlaylist={vi.fn()} onReset={vi.fn()} />,
    )

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{"still typing this' } })

    const updatedPlaylist = [{ videoId: 'b', start: 0, end: 20 }]
    rerender(
      <RawJsonPanel playlist={updatedPlaylist} onReplacePlaylist={vi.fn()} onReset={vi.fn()} />,
    )

    expect(screen.getByRole('textbox').value).toBe('{"still typing this')
  })

  it('refreshes the textarea from a new playlist while the panel is closed', () => {
    const playlist = [{ videoId: 'a', start: 0, end: 10 }]
    const { rerender } = render(
      <RawJsonPanel playlist={playlist} onReplacePlaylist={vi.fn()} onReset={vi.fn()} />,
    )

    const updatedPlaylist = [{ videoId: 'b', start: 0, end: 20 }]
    rerender(
      <RawJsonPanel playlist={updatedPlaylist} onReplacePlaylist={vi.fn()} onReset={vi.fn()} />,
    )

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    expect(screen.getByRole('textbox').value).toBe(JSON.stringify(updatedPlaylist))
  })

  it('clears JSON error when resetting after a parse error', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onReset = vi.fn()
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={vi.fn()} onReset={onReset} />)

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not json' } })
    fireEvent.click(screen.getByText('Update and Play from beginning'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Reset and Remove All Videos'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onReset).toHaveBeenCalled()
    window.confirm.mockRestore()
  })
})
