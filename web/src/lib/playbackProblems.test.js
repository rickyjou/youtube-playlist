import { describe, it, expect } from 'vitest'
import { describeClipProblem } from './playbackProblems.js'

describe('describeClipProblem', () => {
  it('returns null for a playable video', () => {
    expect(describeClipProblem({ title: 'ok', embeddable: true }, undefined)).toBeNull()
    expect(describeClipProblem(undefined, undefined)).toBeNull()
  })

  it.each([
    [101, 'Embedding disabled by the owner'],
    [150, 'Embedding disabled by the owner'],
    [100, 'Video not found or private'],
    [2, 'Invalid video ID'],
    [5, "Can't be played in the HTML5 player"],
    [999, "Can't be played here (error 999)"],
  ])('describes player error %i', (code, message) => {
    expect(describeClipProblem(undefined, code)).toBe(message)
  })

  it('flags videos the Data API reports as not embeddable', () => {
    expect(describeClipProblem({ embeddable: false }, undefined)).toBe('Embedding disabled by the owner')
  })

  it('flags videos the Data API did not return', () => {
    expect(describeClipProblem({ unavailable: true }, undefined)).toBe('Video not found or private')
  })

  it('prefers the actual player error over the metadata guess', () => {
    expect(describeClipProblem({ embeddable: true }, 100)).toBe('Video not found or private')
  })
})
