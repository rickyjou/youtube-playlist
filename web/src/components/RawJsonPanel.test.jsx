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
      target: { value: '[{"videoId":"a","start":0,"end":10}]' },
    })
    fireEvent.click(screen.getByText('Update and Play from beginning'))

    expect(onReplacePlaylist).toHaveBeenCalledWith([{ videoId: 'a', start: 0, end: 10 }])
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

  it('calls onReset after the user confirms clearing the playlist', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onReset = vi.fn()
    render(<RawJsonPanel playlist={[]} onReplacePlaylist={vi.fn()} onReset={onReset} />)

    fireEvent.click(screen.getByText('Show advanced JSON editor'))
    fireEvent.click(screen.getByText('Reset and Remove All Videos'))

    expect(onReset).toHaveBeenCalled()
    window.confirm.mockRestore()
  })
})
