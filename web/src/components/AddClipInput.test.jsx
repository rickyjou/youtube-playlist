import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AddClipInput from './AddClipInput.jsx'
import * as youtubeApi from '../lib/youtubeApi.js'

vi.mock('../lib/youtubeApi.js')

describe('AddClipInput', () => {
  it('adds a single clip using the fetched duration when no end time is given', async () => {
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      abc12345678: { title: 'Test', thumbnail: '', durationSeconds: 120 },
    })
    const onAddClips = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} onLoadPlaylist={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/watch?v=abc12345678' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(onAddClips).toHaveBeenCalledWith(
      [{ videoId: 'abc12345678', start: 0, end: 120 }],
      { abc12345678: { title: 'Test', thumbnail: '', durationSeconds: 120 } },
    ))
  })

  it('loads every video in a playlist link via onLoadPlaylist, replacing the current list', async () => {
    youtubeApi.fetchPlaylistVideoIds.mockResolvedValue(['v1', 'v2'])
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      v1: { title: 'One', thumbnail: '', durationSeconds: 60 },
      v2: { title: 'Two', thumbnail: '', durationSeconds: 90 },
    })
    const onAddClips = vi.fn()
    const onLoadPlaylist = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} onLoadPlaylist={onLoadPlaylist} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PLxyz' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(onLoadPlaylist).toHaveBeenCalledWith(
      [
        { videoId: 'v1', start: 0, end: 60 },
        { videoId: 'v2', start: 0, end: 90 },
      ],
      expect.any(Object),
    ))
    expect(onAddClips).not.toHaveBeenCalled()
  })

  it('shows an error and does not call onAddClips for an invalid link', async () => {
    const onAddClips = vi.fn()
    const onLoadPlaylist = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} onLoadPlaylist={onLoadPlaylist} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), { target: { value: 'not a link' } })
    fireEvent.click(screen.getByText('Add'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid YouTube/i)
    expect(onAddClips).not.toHaveBeenCalled()
    expect(onLoadPlaylist).not.toHaveBeenCalled()
  })

  it('does not render manual start/end fields', () => {
    render(<AddClipInput apiKey="test-key" onAddClips={vi.fn()} onLoadPlaylist={vi.fn()} />)

    expect(screen.queryByLabelText(/start/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/end/i)).not.toBeInTheDocument()
  })

  it('warns which added videos cannot be played here, while still adding them', async () => {
    youtubeApi.fetchPlaylistVideoIds.mockResolvedValue(['v1', 'v2', 'v3'])
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      v1: { title: 'One', thumbnail: '', durationSeconds: 60, embeddable: true },
      v2: { title: 'Two', thumbnail: '', durationSeconds: 90, embeddable: false },
      v3: { unavailable: true },
    })
    const onLoadPlaylist = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={vi.fn()} onLoadPlaylist={onLoadPlaylist} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PLxyz' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(onLoadPlaylist).toHaveBeenCalled())
    const warning = screen.getByRole('status')
    expect(warning).toHaveTextContent("2 videos can't be played here")
    expect(warning).toHaveTextContent('Two — Embedding disabled by the owner')
    expect(warning).toHaveTextContent('v3 — Video not found or private')
    expect(warning).not.toHaveTextContent('One')
  })

  it('shows no warning when every added video is playable', async () => {
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      abc12345678: { title: 'Test', thumbnail: '', durationSeconds: 120, embeddable: true },
    })
    const onAddClips = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} onLoadPlaylist={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/watch?v=abc12345678' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(onAddClips).toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
