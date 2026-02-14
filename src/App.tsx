import { useState, useCallback, useRef, useEffect } from 'react'
import type { TabbedProfile, DirectAccessKey, DirectAccessPage } from './types'
import { createDefaultProfile } from './types'
import { validateProfile, normalizeProfile } from './lib/validation'
import { useProfileHistory } from './hooks/useProfileHistory'
import Header from './components/Header'
import TabBar from './components/TabBar'
import KeyGrid from './components/KeyGrid'
import KeyEditor from './components/KeyEditor'
import { IconUndo, IconRedo } from './components/Icons'

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
  const { profile, mutateProfile, replaceProfile, undo, redo, canUndo, canRedo } = useProfileHistory(createDefaultProfile())
  const [selectedTabIndex, setSelectedTabIndex] = useState(0)
  const [selectedKeyIndices, setSelectedKeyIndices] = useState<number[]>([])
  const [subpagePath, setSubpagePath] = useState<SubpagePath>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showNewProfileConfirm, setShowNewProfileConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stationIdInputRef = useRef<HTMLInputElement>(null)
  const keyClipboardRef = useRef<{ keys: DirectAccessKey[]; cut: boolean } | null>(null)

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
    setSelectedKeyIndices((prev) => prev.filter((i) => i < keys.length))
  }, [profile, selectedTabIndex, subpagePath])

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
    setSelectedKeyIndices([])
    setSubpagePath([])
  }, [mutateProfile, profile.tabs.length])

  const duplicateTab = useCallback(() => {
    const tab = profile.tabs[selectedTabIndex]
    if (!tab) return
    const dup = JSON.parse(JSON.stringify(tab)) as typeof tab
    mutateProfile((p) => {
      const tabs = [...p.tabs]
      tabs.splice(selectedTabIndex + 1, 0, dup)
      return { ...p, tabs }
    })
    setSelectedTabIndex(selectedTabIndex + 1)
    setSelectedKeyIndices([])
    setSubpagePath([])
  }, [mutateProfile, profile.tabs, selectedTabIndex])

  const removeTab = useCallback(() => {
    if (profile.tabs.length <= 1) return
    mutateProfile((p) => ({ ...p, tabs: p.tabs.filter((_, i) => i !== selectedTabIndex) }))
    setSelectedTabIndex(Math.max(0, selectedTabIndex - 1))
    setSelectedKeyIndices([])
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
    setSelectedKeyIndices([currentKeys.length])
  }, [mutatePageAtPath, subpagePath, currentKeys.length])

  const removeKey = useCallback(() => {
    if (selectedKeyIndices.length === 0) return
    mutatePageAtPath(subpagePath, (page) => ({
      ...page,
      keys: (page.keys ?? []).filter((_, i) => !selectedKeyIndices.includes(i)),
    }))
    setSelectedKeyIndices([])
  }, [mutatePageAtPath, subpagePath, selectedKeyIndices])

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
      setSelectedKeyIndices([to])
    },
    [mutatePageAtPath, subpagePath, currentKeys.length]
  )

  const swapSelectedKeys = useCallback(() => {
    if (selectedKeyIndices.length !== 2) return
    const [a, b] = [...selectedKeyIndices].sort((x, y) => x - y)
    mutatePageAtPath(subpagePath, (page) => {
      const keys = [...(page.keys ?? [])]
      ;[keys[a], keys[b]] = [keys[b], keys[a]]
      return { ...page, keys }
    })
  }, [selectedKeyIndices, mutatePageAtPath, subpagePath])

  const moveSelectedKeys = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const sorted = [...selectedKeyIndices].sort((a, b) => a - b)
      if (sorted.length === 0) return
      if (direction === 'left' || direction === 'right') {
        const rows = currentRows
        if (direction === 'left') {
          if (Math.min(...sorted) < rows) return
          if (sorted.length === 1) {
            moveKey(sorted[0], sorted[0] - rows, true)
          } else {
            const keys = [...currentKeys]
            for (const i of sorted) {
              ;[keys[i], keys[i - rows]] = [keys[i - rows], keys[i]]
            }
            mutatePageAtPath(subpagePath, (page) => ({ ...page, keys }))
            setSelectedKeyIndices(sorted.map((i) => i - rows))
          }
        } else {
          if (Math.max(...sorted) + rows >= currentKeys.length) return
          if (sorted.length === 1) {
            moveKey(sorted[0], sorted[0] + rows, true)
          } else {
            const keys = [...currentKeys]
            for (const i of [...sorted].sort((a, b) => b - a)) {
              ;[keys[i], keys[i + rows]] = [keys[i + rows], keys[i]]
            }
            mutatePageAtPath(subpagePath, (page) => ({ ...page, keys }))
            setSelectedKeyIndices(sorted.map((i) => i + rows))
          }
        }
        return
      }
      if (sorted.length === 1) {
        if (direction === 'up' && sorted[0] > 0) moveKey(sorted[0], sorted[0] - 1)
        else if (direction === 'down' && sorted[0] < currentKeys.length - 1) moveKey(sorted[0], sorted[0] + 1)
        return
      }
      const keys = currentKeys
      const min = sorted[0]!
      const max = sorted[sorted.length - 1]!
      if (direction === 'up' && min > 0) {
        const nextKeys = [...keys]
        for (const i of sorted) {
          ;[nextKeys[i - 1], nextKeys[i]] = [nextKeys[i], nextKeys[i - 1]]
        }
        mutatePageAtPath(subpagePath, (page) => ({ ...page, keys: nextKeys }))
        setSelectedKeyIndices(sorted.map((i) => i - 1))
      } else if (direction === 'down' && max < keys.length - 1) {
        const nextKeys = [...keys]
        for (const i of [...sorted].sort((a, b) => b - a)) {
          ;[nextKeys[i], nextKeys[i + 1]] = [nextKeys[i + 1], nextKeys[i]]
        }
        mutatePageAtPath(subpagePath, (page) => ({ ...page, keys: nextKeys }))
        setSelectedKeyIndices(sorted.map((i) => i + 1))
      }
    },
    [selectedKeyIndices, currentKeys, currentRows, mutatePageAtPath, subpagePath, moveKey]
  )

  const copyKeys = useCallback(() => {
    if (selectedKeyIndices.length === 0) return
    const keys = selectedKeyIndices
      .sort((a, b) => a - b)
      .map((i) => currentKeys[i])
      .filter(Boolean)
    if (keys.length > 0) keyClipboardRef.current = { keys: JSON.parse(JSON.stringify(keys)), cut: false }
  }, [selectedKeyIndices, currentKeys])

  const cutKeys = useCallback(() => {
    if (selectedKeyIndices.length === 0) return
    const keys = selectedKeyIndices
      .sort((a, b) => a - b)
      .map((i) => currentKeys[i])
      .filter(Boolean)
    if (keys.length > 0) {
      keyClipboardRef.current = { keys: JSON.parse(JSON.stringify(keys)), cut: true }
      mutatePageAtPath(subpagePath, (page) => ({
        ...page,
        keys: (page.keys ?? []).filter((_, i) => !selectedKeyIndices.includes(i)),
      }))
      setSelectedKeyIndices([])
    }
  }, [selectedKeyIndices, currentKeys, mutatePageAtPath, subpagePath])

  const pasteKeys = useCallback(() => {
    const clip = keyClipboardRef.current
    if (!clip || clip.keys.length === 0) return
    const insertAt = selectedKeyIndices.length > 0 ? Math.max(...selectedKeyIndices) + 1 : currentKeys.length
    mutatePageAtPath(subpagePath, (page) => {
      const keys = page.keys ?? []
      const nextKeys = [...keys.slice(0, insertAt), ...clip.keys, ...keys.slice(insertAt)]
      return { ...page, keys: nextKeys }
    })
    setSelectedKeyIndices(clip.keys.map((_, i) => insertAt + i))
    if (clip.cut) keyClipboardRef.current = null
  }, [selectedKeyIndices, currentKeys.length, mutatePageAtPath, subpagePath])

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
          setSelectedKeyIndices([])
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
    setSelectedKeyIndices([])
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
    setSelectedKeyIndices([])
  }, [])

  const goToSubpage = useCallback((keyIndex: number) => {
    setSubpagePath((path) => [...path, keyIndex])
    setSelectedKeyIndices([])
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as Node
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (selectedKeyIndices.length === 0 || isClientPage) return
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault()
        copyKeys()
      } else if (e.ctrlKey && e.key === 'x') {
        e.preventDefault()
        cutKeys()
      } else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault()
        pasteKeys()
      } else if (e.key === 'Enter') {
        const primary = selectedKeyIndices[0]
        if (primary != null) {
          const key = currentKeys[primary]
          if (key?.page != null) {
            e.preventDefault()
            goToSubpage(primary)
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveSelectedKeys('up')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveSelectedKeys('down')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (selectedKeyIndices.length > 0 && Math.min(...selectedKeyIndices) >= currentRows) {
          moveSelectedKeys('left')
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (selectedKeyIndices.length > 0 && Math.max(...selectedKeyIndices) + currentRows < currentKeys.length) {
          moveSelectedKeys('right')
        }
      } else if (e.key === 'c' || e.key === 'C') {
        if (!e.ctrlKey) {
          e.preventDefault()
          if (selectedKeyIndices.length === 1) updateKeyAtPath(subpagePath, selectedKeyIndices[0]!, () => ({ label: [] }))
        }
      } else if (e.key === 'Delete') {
        e.preventDefault()
        removeKey()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedKeyIndices, currentKeys, currentRows, isClientPage, moveKey, moveSelectedKeys, goToSubpage, updateKeyAtPath, subpagePath, removeKey, copyKeys, cutKeys, pasteKeys])

  const handleSelectKey = useCallback((index: number, addToSelection: boolean, rangeSelect: boolean) => {
    if (rangeSelect && selectedKeyIndices.length > 0) {
      const anchor = selectedKeyIndices[0]!
      const start = Math.min(anchor, index)
      const end = Math.max(anchor, index)
      const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i)
      setSelectedKeyIndices(indices)
    } else if (addToSelection) {
      setSelectedKeyIndices((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index].sort((a, b) => a - b)
      )
    } else {
      setSelectedKeyIndices([index])
    }
  }, [selectedKeyIndices])

  const handleDoubleClickKey = useCallback(
    (index: number) => {
      const key = currentKeys[index]
      if (key?.page != null) {
        goToSubpage(index)
      } else {
        setSelectedKeyIndices([index])
        setTimeout(() => stationIdInputRef.current?.focus(), 50)
      }
    },
    [currentKeys, goToSubpage]
  )

  const primaryKeyIndex = selectedKeyIndices.length > 0 ? selectedKeyIndices[0]! : null
  const selectedKey = primaryKeyIndex != null ? currentKeys[primaryKeyIndex] ?? null : null

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
        onDuplicateTab={duplicateTab}
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
            selectedKeyIndices={selectedKeyIndices}
            onSelectKey={handleSelectKey}
            onDoubleClickKey={handleDoubleClickKey}
            onReorderKeys={reorderKeys}
            onMoveSelectedKeys={moveSelectedKeys}
            onAddKey={addKey}
            onRemoveKey={removeKey}
            onSwapKeys={selectedKeyIndices.length === 2 ? swapSelectedKeys : undefined}
            onCopyKeys={copyKeys}
            onCutKeys={cutKeys}
            onPasteKeys={pasteKeys}
            breadcrumbItems={getBreadcrumbItems(profile, selectedTabIndex, subpagePath)}
            onBackToPath={goBackToPath}
            isClientPage={isClientPage}
          />
        </section>
        <aside className="main-sidebar">
          <div className="undo-redo-bar">
            <button type="button" onClick={undo} disabled={!canUndo} className="undo-redo-btn" title="Undo (Ctrl+Z)" aria-label="Undo">
              <IconUndo />
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} className="undo-redo-btn" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
              <IconRedo />
            </button>
          </div>
          <div className="key-editor-wrap">
            <KeyEditor
              keyData={selectedKey}
              keyIndex={primaryKeyIndex}
              selectedCount={selectedKeyIndices.length}
              stationIdInputRef={stationIdInputRef}
              onUpdateKey={(updater) => {
                if (primaryKeyIndex == null) return
                updateKeyAtPath(subpagePath, primaryKeyIndex, updater)
              }}
              onRemoveKey={removeKey}
              onGoToSubpage={primaryKeyIndex != null ? () => goToSubpage(primaryKeyIndex) : undefined}
              onRemoveSubpage={
                selectedKey?.page != null
                  ? () => {
                      if (primaryKeyIndex == null) return
                      updateKeyAtPath(subpagePath, primaryKeyIndex, (k) => ({ ...k, page: undefined }))
                      setSelectedKeyIndices([])
                    }
                  : undefined
              }
              hasSubpage={selectedKey?.page != null}
            />
          </div>
        </aside>
      </main>
    </div>
  )
}
