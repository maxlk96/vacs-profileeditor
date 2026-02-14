import { useState, useCallback, useRef, useEffect } from 'react'
import type { TabbedProfile, DirectAccessKey, DirectAccessPage } from './types'
import { createDefaultProfile } from './types'
import { validateProfile, normalizeProfile } from './lib/validation'
import { useProfileHistory } from './hooks/useProfileHistory'
import Header from './components/Header'
import TabBar from './components/TabBar'
import KeyGrid from './components/KeyGrid'
import KeyEditor from './components/KeyEditor'

/** Path into nested pages: [keyIndex, keyIndex, ...] to reach the current page. Empty = top-level tab page. */
export type SubpagePath = number[]

function getPageAtPath(profile: TabbedProfile, tabIndex: number, path: SubpagePath): DirectAccessPage | null {
  const tab = profile.tabs[tabIndex]
  if (!tab) return null
  let page: DirectAccessPage = tab.page
  for (const keyIndex of path) {
    const keys = page.keys ?? []
    const key = keys[keyIndex]
    if (!key?.page) return null
    page = key.page
  }
  return page
}

function getKeysAtPath(profile: TabbedProfile, tabIndex: number, path: SubpagePath): DirectAccessKey[] {
  const page = getPageAtPath(profile, tabIndex, path)
  if (page?.client_page != null) return []
  return page?.keys ?? []
}

function getRowsAtPath(profile: TabbedProfile, tabIndex: number, path: SubpagePath): number {
  const page = getPageAtPath(profile, tabIndex, path)
  return page?.rows ?? 4
}

export interface BreadcrumbItem {
  label: string
  path: SubpagePath
}

function getBreadcrumbItems(profile: TabbedProfile, tabIndex: number, path: SubpagePath): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = []
  const tab = profile.tabs[tabIndex]
  if (!tab) return items
  // Use first line of label for breadcrumb
  items.push({ label: tab.label[0] || 'Tab', path: [] })
  let page = tab.page
  for (let i = 0; i < path.length; i++) {
    const keys = page.keys ?? []
    const key = keys[path[i]]
    if (!key) break
    const line0 = (key.label ?? [])[0] ?? ''
    const label = line0.trim() || `Key ${path[i] + 1}`
    items.push({ label, path: path.slice(0, i + 1) })
    if (!key.page) break
    page = key.page
  }
  return items
}

export default function App() {
  const { profile, mutateProfile, replaceProfile, undo, redo } = useProfileHistory(createDefaultProfile())
  const [selectedTabIndex, setSelectedTabIndex] = useState(0)
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number | null>(null)
  const [subpagePath, setSubpagePath] = useState<SubpagePath>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showNewProfileConfirm, setShowNewProfileConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stationIdInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as Node
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  useEffect(() => {
    if (profile.tabs.length > 0 && selectedTabIndex >= profile.tabs.length) {
      setSelectedTabIndex(profile.tabs.length - 1)
    }
  }, [profile.tabs.length, selectedTabIndex])

  useEffect(() => {
    const keys = getKeysAtPath(profile, selectedTabIndex, subpagePath)
    if (selectedKeyIndex != null && selectedKeyIndex >= keys.length) {
      setSelectedKeyIndex(null)
    }
  }, [profile, selectedTabIndex, subpagePath, selectedKeyIndex])

  const currentPage = getPageAtPath(profile, selectedTabIndex, subpagePath)
  const currentKeys = getKeysAtPath(profile, selectedTabIndex, subpagePath)
  const currentRows = getRowsAtPath(profile, selectedTabIndex, subpagePath)
  const isClientPage = currentPage?.client_page != null

  const setProfileId = useCallback((id: string) => {
    mutateProfile((p) => ({ ...p, id: id.trim() }))
  }, [mutateProfile])

  const setTabLabelLine = useCallback(
    (tabIndex: number, lineIndex: number, value: string) => {
      mutateProfile((p) => ({
        ...p,
        tabs: p.tabs.map((t, i) => {
          if (i !== tabIndex) return t
          const newLabel = [...t.label]
          while (newLabel.length <= lineIndex) newLabel.push('')
          newLabel[lineIndex] = value
          return { ...t, label: newLabel.slice(0, 3) }
        }),
      }))
    },
    [mutateProfile]
  )

  const updateKeyAtPath = useCallback(
    (path: SubpagePath, keyIndex: number, updater: (k: DirectAccessKey) => DirectAccessKey) => {
      mutateProfile((p) => {
        const tab = p.tabs[selectedTabIndex]
        if (!tab) return p
        const apply = (page: DirectAccessPage, pathIdx: number): DirectAccessPage => {
          const keys = page.keys ?? []
          if (pathIdx === path.length) {
            const nextKeys = [...keys]
            if (keyIndex >= 0 && keyIndex < nextKeys.length) {
              nextKeys[keyIndex] = updater(nextKeys[keyIndex])
            }
            return { ...page, keys: nextKeys }
          }
          const ki = path[pathIdx]
          const nextKeys = [...keys]
          if (ki >= 0 && ki < nextKeys.length && nextKeys[ki].page) {
            nextKeys[ki] = { ...nextKeys[ki], page: apply(nextKeys[ki].page!, pathIdx + 1) }
          }
          return { ...page, keys: nextKeys }
        }
        return {
          ...p,
          tabs: p.tabs.map((t, i) =>
            i === selectedTabIndex ? { ...t, page: apply(t.page, 0) } : t
          ),
        }
      })
    },
    [selectedTabIndex, mutateProfile]
  )

  const mutatePageAtPath = useCallback(
    (path: SubpagePath, mutate: (page: DirectAccessPage) => DirectAccessPage) => {
      mutateProfile((p) => {
        const tab = p.tabs[selectedTabIndex]
        if (!tab) return p
        const apply = (page: DirectAccessPage, pathIdx: number): DirectAccessPage => {
          const keys = page.keys ?? []
          if (pathIdx === path.length) return mutate(page)
          const ki = path[pathIdx]
          const nextKeys = [...keys]
          if (ki >= 0 && ki < nextKeys.length && nextKeys[ki].page) {
            nextKeys[ki] = { ...nextKeys[ki], page: apply(nextKeys[ki].page!, pathIdx + 1) }
          }
          return { ...page, keys: nextKeys }
        }
        return {
          ...p,
          tabs: p.tabs.map((t, i) =>
            i === selectedTabIndex ? { ...t, page: apply(t.page, 0) } : t
          ),
        }
      })
    },
    [selectedTabIndex, mutateProfile]
  )

  /** Set rows on the current page (at subpagePath). Use this for the Rows input so it affects the visible grid. */
  const setCurrentPageRows = useCallback(
    (rows: number) => {
      const n = Math.max(1, Math.floor(rows))
      mutatePageAtPath(subpagePath, (page) => ({ ...page, rows: n }))
    },
    [mutatePageAtPath, subpagePath]
  )

  const addTab = useCallback(() => {
    mutateProfile((p) => ({
      ...p,
      tabs: [...p.tabs, { label: [`Tab ${p.tabs.length + 1}`], page: { rows: 4, keys: [] } }],
    }))
    setSelectedTabIndex(profile.tabs.length)
    setSelectedKeyIndex(null)
    setSubpagePath([])
  }, [mutateProfile, profile.tabs.length])

  const removeTab = useCallback(() => {
    if (profile.tabs.length <= 1) return
    mutateProfile((p) => ({ ...p, tabs: p.tabs.filter((_, i) => i !== selectedTabIndex) }))
    setSelectedTabIndex(Math.max(0, selectedTabIndex - 1))
    setSelectedKeyIndex(null)
    setSubpagePath([])
  }, [mutateProfile, profile.tabs.length, selectedTabIndex])

  const moveTab = useCallback((from: number, to: number) => {
    if (to < 0 || to >= profile.tabs.length) return
    mutateProfile((p) => {
      const tabs = [...p.tabs]
      const [removed] = tabs.splice(from, 1)
      tabs.splice(to, 0, removed)
      return { ...p, tabs }
    })
    setSelectedTabIndex(to)
  }, [mutateProfile, profile.tabs.length])

  const reorderTabs = useCallback((from: number, to: number) => {
    moveTab(from, to)
  }, [moveTab])

  const addKey = useCallback(() => {
    mutatePageAtPath(subpagePath, (page) => ({
      ...page,
      keys: [...(page.keys ?? []), { label: [] }],
    }))
    setSelectedKeyIndex(currentKeys.length)
  }, [mutatePageAtPath, subpagePath, currentKeys.length])

  const removeKey = useCallback(() => {
    if (selectedKeyIndex == null) return
    mutatePageAtPath(subpagePath, (page) => ({
      ...page,
      keys: (page.keys ?? []).filter((_, i) => i !== selectedKeyIndex),
    }))
    setSelectedKeyIndex(null)
  }, [mutatePageAtPath, subpagePath, selectedKeyIndex])

  const moveKey = useCallback(
    (from: number, to: number, swap = false) => {
      if (to < 0 || (swap ? to >= currentKeys.length : to > currentKeys.length)) return
      mutatePageAtPath(subpagePath, (page) => {
        const keys = page.keys ?? []
        const nextKeys = [...keys]
        if (swap) {
          ;[nextKeys[from], nextKeys[to]] = [nextKeys[to], nextKeys[from]]
        } else {
          const [removed] = nextKeys.splice(from, 1)
          nextKeys.splice(to, 0, removed)
        }
        return { ...page, keys: nextKeys }
      })
      setSelectedKeyIndex(to)
    },
    [mutatePageAtPath, subpagePath, currentKeys.length]
  )

  const reorderKeys = useCallback(
    (from: number, to: number) => {
      moveKey(from, to)
    },
    [moveKey]
  )

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLoadError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        const data = JSON.parse(text) as unknown
        const result = validateProfile(data)
        if (result.ok) {
          replaceProfile(normalizeProfile(result.profile))
          setSelectedTabIndex(0)
          setSelectedKeyIndex(null)
          setSubpagePath([])
        } else {
          setLoadError(result.errors.map((err) => `${err.path}: ${err.message}`).join('; '))
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Invalid JSON')
      }
    }
    reader.readAsText(file)
  }, [])

  const downloadProfile = useCallback(
    (filename: string) => {
      const json = JSON.stringify(profile, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename.endsWith('.json') ? filename : `${filename}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    [profile]
  )

  const handleSaveAs = useCallback(() => {
    const name = window.prompt('Filename', `${profile.id}.json`)?.trim()
    if (name) downloadProfile(name)
  }, [downloadProfile, profile.id])

  const applyNewProfile = useCallback(() => {
    replaceProfile(createDefaultProfile())
    setSelectedTabIndex(0)
    setSelectedKeyIndex(null)
    setSubpagePath([])
    setLoadError(null)
    setShowNewProfileConfirm(false)
  }, [])

  const newProfile = useCallback(() => {
    setShowNewProfileConfirm(true)
  }, [])

  const handleNewProfileSaveAndNew = useCallback(() => {
    setShowNewProfileConfirm(false)
    downloadProfile(`${profile.id}.json`)
    applyNewProfile()
  }, [downloadProfile, profile.id, applyNewProfile])

  const handleNewProfileDiscard = useCallback(() => {
    setShowNewProfileConfirm(false)
    applyNewProfile()
  }, [applyNewProfile])

  const goBackToPath = useCallback((path: SubpagePath) => {
    setSubpagePath(path)
    setSelectedKeyIndex(null)
  }, [])

  const goToSubpage = useCallback((keyIndex: number) => {
    setSubpagePath((path) => [...path, keyIndex])
    setSelectedKeyIndex(null)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as Node
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (selectedKeyIndex == null || isClientPage) return
      if (e.key === 'Enter') {
        const key = currentKeys[selectedKeyIndex]
        if (key?.page != null) {
          e.preventDefault()
          goToSubpage(selectedKeyIndex)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (selectedKeyIndex > 0) moveKey(selectedKeyIndex, selectedKeyIndex - 1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (selectedKeyIndex < currentKeys.length - 1) moveKey(selectedKeyIndex, selectedKeyIndex + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (selectedKeyIndex >= currentRows) moveKey(selectedKeyIndex, selectedKeyIndex - currentRows, true)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (selectedKeyIndex + currentRows < currentKeys.length) moveKey(selectedKeyIndex, selectedKeyIndex + currentRows, true)
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        if (selectedKeyIndex != null) updateKeyAtPath(subpagePath, selectedKeyIndex, () => ({ label: [] }))
      } else if (e.key === 'Delete') {
        e.preventDefault()
        if (selectedKeyIndex != null) removeKey()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedKeyIndex, currentKeys.length, currentRows, isClientPage, moveKey, goToSubpage, updateKeyAtPath, subpagePath, removeKey])

  const handleDoubleClickKey = useCallback(
    (index: number) => {
      const key = currentKeys[index]
      if (key?.page != null) {
        goToSubpage(index)
      } else {
        setSelectedKeyIndex(index)
        setTimeout(() => stationIdInputRef.current?.focus(), 50)
      }
    },
    [currentKeys, goToSubpage]
  )

  const selectedKey = selectedKeyIndex != null ? currentKeys[selectedKeyIndex] ?? null : null

  return (
    <div className="app">
      <Header
        profileId={profile.id}
        onProfileIdChange={setProfileId}
        onNew={newProfile}
        onLoad={handleLoad}
        onSaveAs={handleSaveAs}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
      />
      {loadError && (
        <div className="load-error" role="alert">
          {loadError}
        </div>
      )}
      {showNewProfileConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-profile-dialog-title">
          <div className="modal">
            <h2 id="new-profile-dialog-title">Create new profile?</h2>
            <p>Save the current profile first or discard changes?</p>
            <div className="modal-actions">
              <button type="button" onClick={handleNewProfileSaveAndNew}>
                Save & new
              </button>
              <button type="button" onClick={handleNewProfileDiscard}>
                New (discard)
              </button>
              <button type="button" onClick={() => setShowNewProfileConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <TabBar
        tabs={profile.tabs}
        selectedIndex={selectedTabIndex}
        onSelectTab={setSelectedTabIndex}
        onReorderTabs={reorderTabs}
        onAddTab={addTab}
        onRemoveTab={removeTab}
      />
      <main className="main-content">
        <section className="tab-editor">
          <h3>Tab</h3>
          <label>
            Label line 1
            <input
              type="text"
              value={profile.tabs[selectedTabIndex]?.label[0] ?? ''}
              onChange={(e) => setTabLabelLine(selectedTabIndex, 0, e.target.value)}
              placeholder="First line"
            />
          </label>
          <label>
            Label line 2
            <input
              type="text"
              value={profile.tabs[selectedTabIndex]?.label[1] ?? ''}
              onChange={(e) => setTabLabelLine(selectedTabIndex, 1, e.target.value)}
              placeholder="Second line (optional)"
            />
          </label>
          <label>
            Label line 3
            <input
              type="text"
              value={profile.tabs[selectedTabIndex]?.label[2] ?? ''}
              onChange={(e) => setTabLabelLine(selectedTabIndex, 2, e.target.value)}
              placeholder="Third line (optional)"
            />
          </label>
          <label>
            Rows
            <input
              type="number"
              min={1}
              value={currentRows}
              onChange={(e) => setCurrentPageRows(parseInt(e.target.value, 10) || 1)}
            />
          </label>
        </section>
        <section className="grid-area">
          <KeyGrid
            keys={currentKeys}
            rows={currentRows}
            selectedKeyIndex={selectedKeyIndex}
            onSelectKey={setSelectedKeyIndex}
            onDoubleClickKey={handleDoubleClickKey}
            onReorderKeys={reorderKeys}
            onMoveKey={moveKey}
            onAddKey={addKey}
            onRemoveKey={removeKey}
            breadcrumbItems={getBreadcrumbItems(profile, selectedTabIndex, subpagePath)}
            onBackToPath={goBackToPath}
            isClientPage={isClientPage}
          />
        </section>
        <KeyEditor
          keyData={selectedKey}
          keyIndex={selectedKeyIndex}
          stationIdInputRef={stationIdInputRef}
          onUpdateKey={(updater) => {
            if (selectedKeyIndex == null) return
            updateKeyAtPath(subpagePath, selectedKeyIndex, updater)
          }}
          onRemoveKey={removeKey}
          onGoToSubpage={selectedKeyIndex != null ? () => goToSubpage(selectedKeyIndex) : undefined}
          onRemoveSubpage={
            selectedKey?.page != null
              ? () => {
                  if (selectedKeyIndex == null) return
                  updateKeyAtPath(subpagePath, selectedKeyIndex, (k) => ({ ...k, page: undefined }))
                  setSelectedKeyIndex(null)
                }
              : undefined
          }
          hasSubpage={selectedKey?.page != null}
        />
      </main>
    </div>
  )
}
