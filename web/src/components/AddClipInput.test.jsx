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
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/watch?v=abc12345678' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(onAddClips).toHaveBeenCalledWith(
      [{ videoId: 'abc12345678', start: 0, end: 120 }],
      { abc12345678: { title: 'Test', thumbnail: '', durationSeconds: 120 } },
    ))
  })

  it('imports every video in a playlist link', async () => {
    youtubeApi.fetchPlaylistVideoIds.mockResolvedValue(['v1', 'v2'])
    youtubeApi.fetchVideoMetadata.mockResolvedValue({
      v1: { title: 'One', thumbnail: '', durationSeconds: 60 },
      v2: { title: 'Two', thumbnail: '', durationSeconds: 90 },
    })
    const onAddClips = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PLxyz' },
    })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => expect(onAddClips).toHaveBeenCalledWith(
      [
        { videoId: 'v1', start: 0, end: 60 },
        { videoId: 'v2', start: 0, end: 90 },
      ],
      expect.any(Object),
    ))
  })

  it('shows an error and does not call onAddClips for an invalid link', async () => {
    const onAddClips = vi.fn()
    render(<AddClipInput apiKey="test-key" onAddClips={onAddClips} />)

    fireEvent.change(screen.getByLabelText('YouTube link'), { target: { value: 'not a link' } })
    fireEvent.click(screen.getByText('Add'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid YouTube/i)
    expect(onAddClips).not.toHaveBeenCalled()
  })
})
