import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useClipIndex } from '@features/editor/components/Timeline/useClipIndex'

describe('useClipIndex', () => {
  const createClip = (id, start = 0, duration = 3) => ({
    id,
    start,
    duration,
  })

  const createTrack = (id, clips = []) => ({
    id,
    name: `Track ${id}`,
    clips,
  })

  it('devrait retourner une Map vide si tracks null', () => {
    const { result } = renderHook(() => useClipIndex(null, {}))
    expect(result.current.size).toBe(0)
  })

  it('devrait retourner une Map vide si tracks=[]', () => {
    const { result } = renderHook(() => useClipIndex([], {}))
    expect(result.current.size).toBe(0)
  })

  it('devrait ignorer les tracks sans clips', () => {
    const tracks = [{ id: 't1' }, { id: 't2', clips: [] }]
    const { result } = renderHook(() => useClipIndex(tracks, {}))
    expect(result.current.size).toBe(0)
  })

  it('devrait indexer les clips par id', () => {
    const tracks = [
      createTrack('t1', [createClip('c1', 0, 3), createClip('c2', 5, 4)]),
    ]
    const { result } = renderHook(() => useClipIndex(tracks, {}))
    expect(result.current.size).toBe(2)
    expect(result.current.has('c1')).toBe(true)
    expect(result.current.has('c2')).toBe(true)
  })

  it('devrait stocker clip + track + start + duration', () => {
    const clip = createClip('c1', 2, 5)
    const track = createTrack('t1', [clip])
    const { result } = renderHook(() => useClipIndex([track], {}))
    const entry = result.current.get('c1')

    expect(entry.clip).toBe(clip)
    expect(entry.track).toBe(track)
    expect(entry.start).toBe(2)
    expect(entry.duration).toBe(5)
  })

  it('devrait utiliser clipDurations en priorité', () => {
    const tracks = [createTrack('t1', [createClip('c1', 0, 3)])]
    const clipDurations = { c1: 10 }
    const { result } = renderHook(() => useClipIndex(tracks, clipDurations))
    expect(result.current.get('c1').duration).toBe(10)
  })

  it('devrait fallback sur clip.duration si clipDurations absent', () => {
    const tracks = [createTrack('t1', [createClip('c1', 0, 7)])]
    const { result } = renderHook(() => useClipIndex(tracks, {}))
    expect(result.current.get('c1').duration).toBe(7)
  })

  it('devrait utiliser 3 par défaut si ni duration ni clipDurations', () => {
    const clip = { id: 'c1', start: 0 }
    const tracks = [createTrack('t1', [clip])]
    const { result } = renderHook(() => useClipIndex(tracks, {}))
    expect(result.current.get('c1').duration).toBe(3)
  })

  it('devrait utiliser 0 si clip.start absent', () => {
    const clip = { id: 'c1', duration: 5 }
    const tracks = [createTrack('t1', [clip])]
    const { result } = renderHook(() => useClipIndex(tracks, {}))
    expect(result.current.get('c1').start).toBe(0)
  })

  it('devrait indexer les clips de plusieurs tracks', () => {
    const tracks = [
      createTrack('t1', [createClip('c1'), createClip('c2')]),
      createTrack('t2', [createClip('c3'), createClip('c4')]),
    ]
    const { result } = renderHook(() => useClipIndex(tracks, {}))
    expect(result.current.size).toBe(4)
  })

  it('devrait retourner la bonne track pour chaque clip', () => {
    const track1 = createTrack('t1', [createClip('c1')])
    const track2 = createTrack('t2', [createClip('c2')])
    const { result } = renderHook(() => useClipIndex([track1, track2], {}))

    expect(result.current.get('c1').track).toBe(track1)
    expect(result.current.get('c2').track).toBe(track2)
  })

  it('devrait retourner la MÊME Map si tracks et clipDurations identiques (useMemo)', () => {
    const tracks = [createTrack('t1', [createClip('c1')])]
    const clipDurations = { c1: 3 }

    const { result, rerender } = renderHook(
      ({ t, cd }) => useClipIndex(t, cd),
      { initialProps: { t: tracks, cd: clipDurations } }
    )

    const map1 = result.current
    rerender({ t: tracks, cd: clipDurations })
    expect(result.current).toBe(map1)
  })

  it('devrait recalculer si tracks change', () => {
    const tracks1 = [createTrack('t1', [createClip('c1')])]
    const tracks2 = [createTrack('t1', [createClip('c1'), createClip('c2')])]

    const { result, rerender } = renderHook(
      ({ t }) => useClipIndex(t, {}),
      { initialProps: { t: tracks1 } }
    )

    expect(result.current.size).toBe(1)

    rerender({ t: tracks2 })
    expect(result.current.size).toBe(2)
  })

  it('devrait écraser les clips en cas d\'id dupliqué (dernier gagne)', () => {
    const tracks = [
      createTrack('t1', [createClip('dup', 0, 3)]),
      createTrack('t2', [createClip('dup', 10, 5)]),
    ]
    const { result } = renderHook(() => useClipIndex(tracks, {}))
    expect(result.current.size).toBe(1)
    expect(result.current.get('dup').start).toBe(10)
  })
})