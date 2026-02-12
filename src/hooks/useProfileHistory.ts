import { useState, useCallback } from 'react'
import type { TabbedProfile } from '../types'

export function useProfileHistory(initial: TabbedProfile) {
  const [historyState, setHistoryState] = useState<{ history: TabbedProfile[]; index: number }>({
    history: [initial],
    index: 0,
  })

  const profile = historyState.history[historyState.index]

  const mutateProfile = useCallback((updater: (p: TabbedProfile) => TabbedProfile) => {
    setHistoryState((prev) => {
      const current = prev.history[prev.index]
      const next = updater(current)
      const truncated = prev.history.slice(0, prev.index + 1)
      return { history: [...truncated, next], index: truncated.length }
    })
  }, [])

  const replaceProfile = useCallback((p: TabbedProfile) => {
    setHistoryState({ history: [p], index: 0 })
  }, [])

  const undo = useCallback(() => {
    setHistoryState((prev) => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev))
  }, [])

  const redo = useCallback(() => {
    setHistoryState((prev) =>
      prev.index < prev.history.length - 1 ? { ...prev, index: prev.index + 1 } : prev
    )
  }, [])

  const canUndo = historyState.index > 0
  const canRedo = historyState.index < historyState.history.length - 1

  return { profile, mutateProfile, replaceProfile, undo, redo, canUndo, canRedo }
}
