import { useState, useCallback, useEffect, useRef } from 'react'
import { ApiError } from '../api/client'

export function useEntityResource<T extends { id: string }>(
  key: string,
  apiList: () => Promise<T[]>,
  apiCreate: (body: T) => Promise<{ ok: true }>,
  apiUpdate: (id: string, body: Partial<T>) => Promise<{ ok: true }>,
  apiDelete: (id: string) => Promise<{ ok: true }>,
  initialData: T[],
) {
  const [items, setItems] = useState<T[]>(initialData)
  const [isHydrated, setIsHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(false)
  // Use ref to always have latest items for rollback
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  })

  // Sync to localStorage whenever items change (cache for offline fallback).
  // Supports both direct array and functional updater to avoid concurrent-overwrite.
  const commitItems = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      setItems(prev => {
        const next = typeof updater === 'function' ? (updater as (prev: T[]) => T[])(prev) : updater
        itemsRef.current = next
        localStorage.setItem(`cache_${key}`, JSON.stringify(next))
        return next
      })
    },
    [key],
  )

  // Fetch from API on mount, fall back to localStorage cache
  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    apiList()
      .then(fresh => {
        if (!cancelled) {
          setItems(fresh)
          setError(null)
          setIsHydrated(true)
          localStorage.setItem(`cache_${key}`, JSON.stringify(fresh))
        }
      })
      .catch(() => {
        if (!cancelled) {
          const cached = localStorage.getItem(`cache_${key}`)
          if (cached) {
            try {
              setItems(JSON.parse(cached))
            } catch {
              /* ignore */
            }
          }
          setIsHydrated(true)
        }
      })

    return () => {
      mountedRef.current = false
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const create = useCallback(
    async (body: T) => {
      commitItems(prev => [...prev, body])
      try {
        await apiCreate(body)
      } catch (err) {
        // Rollback: remove the item we just added
        commitItems(prev => prev.filter(x => x.id !== body.id))
        setError(err instanceof ApiError ? err.message : 'Create failed')
        throw err
      }
    },
    [apiCreate, commitItems],
  )

  const update = useCallback(
    async (id: string, body: Partial<T>) => {
      // Snapshot from ref for rollback (always latest)
      const snapshot = itemsRef.current
      commitItems(prev => prev.map(x => (x.id === id ? { ...x, ...body } : x)))
      try {
        await apiUpdate(id, body)
      } catch (err) {
        // Rollback to snapshot
        commitItems(snapshot)
        setError(err instanceof ApiError ? err.message : 'Update failed')
        throw err
      }
    },
    [apiUpdate, commitItems],
  )

  const remove = useCallback(
    async (id: string) => {
      const snapshot = itemsRef.current
      commitItems(prev => prev.filter(x => x.id !== id))
      try {
        await apiDelete(id)
      } catch (err) {
        commitItems(snapshot)
        setError(err instanceof ApiError ? err.message : 'Delete failed')
        throw err
      }
    },
    [apiDelete, commitItems],
  )

  return { items, setItems: commitItems, isHydrated, error, create, update, remove }
}
