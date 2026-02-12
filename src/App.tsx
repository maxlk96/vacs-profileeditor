import { useState, useCallback, useRef } from 'react'
import type { TabbedProfile, DirectAccessKey, DirectAccessPage } from './types'
import { createDefaultProfile } from './types'
import { validateProfile, normalizeProfile } from './lib/validation'
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

export default function App() {
  const [profile, setProfile] = useState<TabbedProfile>(createDefaultProfile)
  const [selectedTabIndex, setSelectedTabIndex] = useState(0)
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number | null>(null)
  const [subpagePath, setSubpagePath] = useState<SubpagePath>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showNewProfileConfirm, setShowNewProfileConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stationIdInputRef = useRef<HTMLInputElement>(null)

  const currentPage = getPageAtPath(profile, selectedTabIndex, subpagePath)
  const currentKeys = getKeysAtPath(profile, selectedTabIndex, subpagePath)
  const currentRows = getRowsAtPath(profile, selectedTabIndex, subpagePath)
  const isClientPage = currentPage?.client_page != null

  const setProfileId = useCallback((id: string) => {
    setProfile((p) => ({ ...p, id: id.trim() }))
  }, [])

  const setTabLabel = useCallback((tabIndex: number, label: string) => {
    setProfile((p) => ({
      ...p,
      tabs: p.tabs.map((t, i) => (i === tabIndex ? { ...t, label: label.trim() } : t)),
    }))
  }, [])

  const updateKeyAtPath = useCallback(
    (path: SubpagePath, keyIndex: number, updater: (k: DirectAccessKey) => DirectAccessKey) => {
      setProfile((p) => {
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
    [selectedTabIndex]
  )

  const mutatePageAtPath = useCallback(
    (path: SubpagePath, mutate: (page: DirectAccessPage) => DirectAccessPage) => {
      setProfile((p) => {
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
    [selectedTabIndex]
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
    setProfile((p) => ({
      ...p,
      tabs: [...p.tabs, { label: `Tab ${p.tabs.length + 1}`, page: { rows: 4, keys: [] } }],
    }))
    setSelectedTabIndex(profile.tabs.length)
    setSelectedKeyIndex(null)
    setSubpagePath([])
  }, [profile.tabs.length])

  const removeTab = useCallback(() => {
    if (profile.tabs.length <= 1) return
    setProfile((p) => ({ ...p, tabs: p.tabs.filter((_, i) => i !== selectedTabIndex) }))
    setSelectedTabIndex(Math.max(0, selectedTabIndex - 1))
    setSelectedKeyIndex(null)
    setSubpagePath([])
  }, [profile.tabs.length, selectedTabIndex])

  const moveTab = useCallback((from: number, to: number) => {
    if (to < 0 || to >= profile.tabs.length) return
    setProfile((p) => {
      const tabs = [...p.tabs]
      const [removed] = tabs.splice(from, 1)
      tabs.splice(to, 0, removed)
      return { ...p, tabs }
    })
    setSelectedTabIndex(to)
  }, [profile.tabs.length])

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
    (from: number, to: number) => {
      if (to < 0 || to > currentKeys.length) return
      mutatePageAtPath(subpagePath, (page) => {
        const keys = page.keys ?? []
        const nextKeys = [...keys]
        const [removed] = nextKeys.splice(from, 1)
        nextKeys.splice(to, 0, removed)
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
          setProfile(normalizeProfile(result.profile))
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

  const handleSave = useCallback(() => {
    const json = JSON.stringify(profile, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${profile.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [profile])

  const applyNewProfile = useCallback(() => {
    setProfile(createDefaultProfile())
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
    handleSave()
    applyNewProfile()
  }, [handleSave, applyNewProfile])

  const handleNewProfileDiscard = useCallback(() => {
    setShowNewProfileConfirm(false)
    applyNewProfile()
  }, [applyNewProfile])

  const goBackSubpage = useCallback(() => {
    setSubpagePath((path) => path.slice(0, -1))
    setSelectedKeyIndex(null)
  }, [])

  const goToSubpage = useCallback((keyIndex: number) => {
    setSubpagePath((path) => [...path, keyIndex])
    setSelectedKeyIndex(null)
  }, [])

  const handleDoubleClickKey = useCallback((index: number) => {
    setSelectedKeyIndex(index)
    setTimeout(() => stationIdInputRef.current?.focus(), 50)
  }, [])

  const selectedKey = selectedKeyIndex != null ? currentKeys[selectedKeyIndex] ?? null : null

  return (
    <div className="app">
      <Header
        profileId={profile.id}
        onProfileIdChange={setProfileId}
        onNew={newProfile}
        onLoad={handleLoad}
        onSave={handleSave}
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
            Label
            <input
              type="text"
              value={profile.tabs[selectedTabIndex]?.label ?? ''}
              onChange={(e) => setTabLabel(selectedTabIndex, e.target.value)}
              placeholder="Tab label"
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
            subpagePath={subpagePath}
            onBackSubpage={goBackSubpage}
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
          hasSubpage={selectedKey?.page != null}
        />
      </main>
    </div>
  )
}
