import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLatestRef, useLatestRefs } from '@shared/hooks/useLatestRefs'

describe('useLatestRef', () => {
  it('devrait retourner un ref initialisé avec la valeur', () => {
    const { result } = renderHook(({ value }) => useLatestRef(value), {
      initialProps: { value: 'initial' },
    })

    expect(result.current.current).toBe('initial')
  })

  it('devrait mettre à jour le ref au changement de valeur', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: 'a' } }
    )

    expect(result.current.current).toBe('a')

    rerender({ value: 'b' })
    expect(result.current.current).toBe('b')
  })

  it('devrait garder la même référence de ref (pas de recréation)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: 1 } }
    )

    const refA = result.current
    rerender({ value: 2 })
    expect(result.current).toBe(refA)
  })

  it('devrait accepter des valeurs complexes (objet, fonction)', () => {
    const obj = { a: 1 }
    const fn = vi.fn()
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: obj } }
    )

    expect(result.current.current).toBe(obj)

    rerender({ value: fn })
    expect(result.current.current).toBe(fn)
  })
})

describe('useLatestRefs', () => {
  it('devrait créer un ref par clé', () => {
    const { result } = renderHook(() =>
      useLatestRefs({ a: 1, b: 'hello', c: true })
    )

    expect(result.current.a.current).toBe(1)
    expect(result.current.b.current).toBe('hello')
    expect(result.current.c.current).toBe(true)
  })

  it('devrait mettre à jour les refs au changement de valeurs', () => {
    const { result, rerender } = renderHook(
      ({ values }) => useLatestRefs(values),
      { initialProps: { values: { x: 10, y: 20 } } }
    )

    expect(result.current.x.current).toBe(10)
    expect(result.current.y.current).toBe(20)

    rerender({ values: { x: 100, y: 200 } })
    expect(result.current.x.current).toBe(100)
    expect(result.current.y.current).toBe(200)
  })

  it('devrait préserver les refs si les clés ne changent pas', () => {
    const { result, rerender } = renderHook(
      ({ values }) => useLatestRefs(values),
      { initialProps: { values: { a: 1, b: 2 } } }
    )

    const refsA = result.current
    rerender({ values: { a: 99, b: 100 } })

    // Même objet de refs
    expect(result.current).toBe(refsA)
  })

  it('devrait recréer les refs si les clés changent', () => {
    const { result, rerender } = renderHook(
      ({ values }) => useLatestRefs(values),
      { initialProps: { values: { a: 1, b: 2 } } }
    )

    const refsA = result.current
    rerender({ values: { a: 1, b: 2, c: 3 } })

    expect(result.current).not.toBe(refsA)
    expect(result.current.c.current).toBe(3)
  })

  it('devrait gérer un objet vide sans planter', () => {
    const { result } = renderHook(() => useLatestRefs({}))
    expect(result.current).toEqual({})
  })

  it('devrait synchroniser les refs en cas d\'accès pendant un callback', () => {
    const callbackRef = { current: null }

    const { result, rerender } = renderHook(
      ({ value }) => {
        const refs = useLatestRefs({ value })
        callbackRef.current = () => refs.value.current
        return refs
      },
      { initialProps: { value: 'first' } }
    )

    // Appel du "callback" stocké
    expect(callbackRef.current()).toBe('first')

    rerender({ value: 'second' })
    expect(callbackRef.current()).toBe('second')
  })
})