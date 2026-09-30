import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDefaultGeoButton,
  createDefaultGeoContainer,
  createDefaultGeoDivider,
  isGeoPageButton,
  isGeoPageContainer,
  type DirectAccessKey,
  type DirectAccessPage,
  type GeoNode,
  type GeoPageContainer,
  type GeoProfile,
} from '../types'
import type { StationEntry } from '../lib/vacsStations'
import {
  getNodeAtPath,
  insertChildAtPath,
  moveNodeAtPath,
  relocateNode,
  removeNodeAtPath,
  updateProfileAtPath,
  type GeoPath,
} from '../lib/geo'
import {
  expandKeysForMoreRows,
  remapKeyIndexForRowChange,
  removedRowsAreBlank,
  shrinkKeysForFewerRows,
} from '../lib/pageKeys'
import GeoTree from './GeoTree'
import GeoNodeEditor from './GeoNodeEditor'
import GeoLayoutPreview from './GeoLayoutPreview'
import KeyGrid from './KeyGrid'
import KeyEditor from './KeyEditor'
import { IconUndo, IconRedo } from './Icons'

/** Path into nested DA pages under a geo button. Empty = button's top-level page. */
export type SubpagePath = number[]

interface GeoProfileEditorProps {
  profile: GeoProfile
  mutateProfile: (updater: (p: GeoProfile) => GeoProfile) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  stations: StationEntry[] | null
  stationIdsLoadError: string | null
  stationIdsLoading: boolean
  onLoadStations: () => void
}

function getPageAtSubpath(page: DirectAccessPage, path: SubpagePath): DirectAccessPage | null {
  let current = page
  for (const keyIndex of path) {
    const keys = current.keys ?? []
    const key = keys[keyIndex]
    if (!key?.page) return null
    current = key.page
  }
  return current
}

export default function GeoProfileEditor({
  profile,
  mutateProfile,
  undo,
  redo,
  canUndo,
  canRedo,
  stations,
  stationIdsLoadError,
  stationIdsLoading,
  onLoadStations,
}: GeoProfileEditorProps) {
  const [selectedPath, setSelectedPath] = useState<GeoPath>([])
  const [editingPagePath, setEditingPagePath] = useState<GeoPath | null>(null)
  const [subpagePath, setSubpagePath] = useState<SubpagePath>([])
  const [selectedKeyIndices, setSelectedKeyIndices] = useState<number[]>([])
  const stationIdInputRef = useRef<HTMLInputElement>(null)
  const keyClipboardRef = useRef<{ keys: DirectAccessKey[]; cut: boolean } | null>(null)

  const selectedNode = getNodeAtPath(profile, selectedPath)

  // Keep selection valid when tree shrinks
  useEffect(() => {
    if (getNodeAtPath(profile, selectedPath) == null) {
      setSelectedPath([])
    }
  }, [profile, selectedPath])

  useEffect(() => {
    if (editingPagePath != null) {
      const node = getNodeAtPath(profile, editingPagePath)
      if (node == null || !isGeoPageButton(node) || node.page == null) {
        setEditingPagePath(null)
        setSubpagePath([])
        setSelectedKeyIndices([])
      }
    }
  }, [profile, editingPagePath])

  const editingButton =
    editingPagePath != null ? getNodeAtPath(profile, editingPagePath) : null
  const editingPage =
    editingButton != null && isGeoPageButton(editingButton) ? editingButton.page ?? null : null

  const currentPage =
    editingPage != null ? getPageAtSubpath(editingPage, subpagePath) : null
  const currentKeys = currentPage?.client_page != null ? [] : currentPage?.keys ?? []
  const currentRows = currentPage?.rows ?? 4
  const isClientPage = currentPage?.client_page != null

  useEffect(() => {
    setSelectedKeyIndices((prev) => prev.filter((i) => i < currentKeys.length))
  }, [currentKeys.length])

  const mutateGeo = useCallback(
    (updater: (p: GeoProfile) => GeoProfile) => {
      mutateProfile(updater)
    },
    [mutateProfile]
  )

  const handleSelectPath = useCallback((path: GeoPath) => {
    setSelectedPath(path)
    setEditingPagePath(null)
    setSubpagePath([])
    setSelectedKeyIndices([])
  }, [])

  const handleAddChild = useCallback(
    (path: GeoPath, kind: 'button' | 'container' | 'divider') => {
      const node = getNodeAtPath(profile, path)
      const parentPath = node != null && isGeoPageContainer(node) ? path : path.slice(0, -1)
      const parent = getNodeAtPath(profile, parentPath)
      if (parent == null || !isGeoPageContainer(parent)) return

      const child: GeoNode =
        kind === 'button'
          ? createDefaultGeoButton()
          : kind === 'container'
            ? createDefaultGeoContainer('row')
            : createDefaultGeoDivider(
                parent.direction === 'row' ? 'vertical' : 'horizontal'
              )

      const insertAt =
        node != null && isGeoPageContainer(node)
          ? parent.children.length
          : (path[path.length - 1] ?? -1) + 1

      mutateGeo((p) => insertChildAtPath(p, parentPath, insertAt, child))
      setSelectedPath([...parentPath, insertAt])
      setEditingPagePath(null)
    },
    [profile, mutateGeo]
  )

  const handleRemovePath = useCallback(
    (path: GeoPath) => {
      mutateGeo((p) => {
        const next = removeNodeAtPath(p, path)
        return next ?? p
      })
      setSelectedPath(path.slice(0, -1))
      setEditingPagePath(null)
    },
    [mutateGeo]
  )

  const handleMovePath = useCallback(
    (path: GeoPath, direction: 'up' | 'down') => {
      mutateGeo((p) => {
        const next = moveNodeAtPath(p, path, direction)
        if (next == null) return p
        const index = path[path.length - 1]!
        const newIndex = direction === 'up' ? index - 1 : index + 1
        setSelectedPath([...path.slice(0, -1), newIndex])
        return next
      })
    },
    [mutateGeo]
  )

  const handleRelocatePath = useCallback(
    (fromPath: GeoPath, toParentPath: GeoPath, toIndex: number) => {
      mutateGeo((p) => {
        const result = relocateNode(p, fromPath, toParentPath, toIndex)
        if (result == null) return p
        setSelectedPath(result.newPath)
        setEditingPagePath(null)
        return result.profile
      })
    },
    [mutateGeo]
  )

  const handleUpdateSelected = useCallback(
    (updater: (n: GeoNode | GeoPageContainer) => GeoNode | GeoPageContainer) => {
      mutateGeo((p) => updateProfileAtPath(p, selectedPath, updater))
    },
    [mutateGeo, selectedPath]
  )

  const startEditPage = useCallback((path: GeoPath) => {
    setSelectedPath(path)
    setEditingPagePath(path)
    setSubpagePath([])
    setSelectedKeyIndices([])
  }, [])

  const mutatePageAtPath = useCallback(
    (path: SubpagePath, mutate: (page: DirectAccessPage) => DirectAccessPage) => {
      if (editingPagePath == null) return
      mutateGeo((p) =>
        updateProfileAtPath(p, editingPagePath, (node) => {
          if (!isGeoPageButton(node) || node.page == null) return node
          const apply = (page: DirectAccessPage, pathIdx: number): DirectAccessPage => {
            const keys = page.keys ?? []
            if (pathIdx === path.length) return mutate(page)
            const ki = path[pathIdx]!
            const nextKeys = [...keys]
            if (ki >= 0 && ki < nextKeys.length && nextKeys[ki]!.page) {
              nextKeys[ki] = { ...nextKeys[ki]!, page: apply(nextKeys[ki]!.page!, pathIdx + 1) }
            }
            return { ...page, keys: nextKeys }
          }
          return { ...node, page: apply(node.page, 0) }
        })
      )
    },
    [editingPagePath, mutateGeo]
  )

  const updateKeyAtPath = useCallback(
    (path: SubpagePath, keyIndex: number, updater: (k: DirectAccessKey) => DirectAccessKey) => {
      mutatePageAtPath(path, (page) => {
        const keys = [...(page.keys ?? [])]
        if (keyIndex >= 0 && keyIndex < keys.length) {
          keys[keyIndex] = updater(keys[keyIndex]!)
        }
        return { ...page, keys }
      })
    },
    [mutatePageAtPath]
  )

  const setCurrentPageRows = useCallback(
    (rows: number) => {
      const n = Math.max(1, Math.floor(rows))
      const oldRows = currentRows
      mutatePageAtPath(subpagePath, (page) => {
        const fromRows = Math.max(1, page.rows ?? 4)
        if (page.client_page != null || n === fromRows) {
          return { ...page, rows: n }
        }
        const keys = page.keys ?? []
        if (n > fromRows) {
          return { ...page, rows: n, keys: expandKeysForMoreRows(keys, fromRows, n) }
        }
        if (removedRowsAreBlank(keys, fromRows, n)) {
          return { ...page, rows: n, keys: shrinkKeysForFewerRows(keys, fromRows, n) }
        }
        return { ...page, rows: n }
      })
      if (n !== oldRows) {
        const shouldRemap = n > oldRows || removedRowsAreBlank(currentKeys, oldRows, n)
        if (shouldRemap) {
          setSelectedKeyIndices((prev) =>
            prev
              .map((i) => remapKeyIndexForRowChange(i, oldRows, n))
              .filter((i): i is number => i != null)
          )
        }
      }
    },
    [mutatePageAtPath, subpagePath, currentRows, currentKeys]
  )

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

  const clearKeys = useCallback(() => {
    if (selectedKeyIndices.length === 0) return
    const selSet = new Set(selectedKeyIndices)
    mutatePageAtPath(subpagePath, (page) => ({
      ...page,
      keys: (page.keys ?? []).map((k, i) =>
        selSet.has(i)
          ? { ...k, label: [], color: undefined, station_id: undefined }
          : k
      ),
    }))
  }, [mutatePageAtPath, subpagePath, selectedKeyIndices])

  const moveKey = useCallback(
    (from: number, to: number, swap = false) => {
      if (to < 0 || (swap ? to >= currentKeys.length : to > currentKeys.length)) return
      mutatePageAtPath(subpagePath, (page) => {
        const keys = [...(page.keys ?? [])]
        if (swap) {
          ;[keys[from], keys[to]] = [keys[to]!, keys[from]!]
        } else {
          const [removed] = keys.splice(from, 1)
          keys.splice(to, 0, removed!)
        }
        return { ...page, keys }
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
      ;[keys[a!], keys[b!]] = [keys[b!]!, keys[a!]!]
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
          if (sorted.length === 1) moveKey(sorted[0]!, sorted[0]! - rows, true)
          else {
            const keys = [...currentKeys]
            for (const i of sorted) {
              ;[keys[i], keys[i - rows]] = [keys[i - rows]!, keys[i]!]
            }
            mutatePageAtPath(subpagePath, (page) => ({ ...page, keys }))
            setSelectedKeyIndices(sorted.map((i) => i - rows))
          }
        } else {
          if (Math.max(...sorted) + rows >= currentKeys.length) return
          if (sorted.length === 1) moveKey(sorted[0]!, sorted[0]! + rows, true)
          else {
            const keys = [...currentKeys]
            for (const i of [...sorted].sort((a, b) => b - a)) {
              ;[keys[i], keys[i + rows]] = [keys[i + rows]!, keys[i]!]
            }
            mutatePageAtPath(subpagePath, (page) => ({ ...page, keys }))
            setSelectedKeyIndices(sorted.map((i) => i + rows))
          }
        }
        return
      }
      if (sorted.length === 1) {
        if (direction === 'up' && sorted[0]! > 0) moveKey(sorted[0]!, sorted[0]! - 1)
        else if (direction === 'down' && sorted[0]! < currentKeys.length - 1) {
          moveKey(sorted[0]!, sorted[0]! + 1)
        }
        return
      }
      const keys = currentKeys
      const min = sorted[0]!
      const max = sorted[sorted.length - 1]!
      if (direction === 'up' && min > 0) {
        const nextKeys = [...keys]
        for (const i of sorted) {
          ;[nextKeys[i - 1], nextKeys[i]] = [nextKeys[i]!, nextKeys[i - 1]!]
        }
        mutatePageAtPath(subpagePath, (page) => ({ ...page, keys: nextKeys }))
        setSelectedKeyIndices(sorted.map((i) => i - 1))
      } else if (direction === 'down' && max < keys.length - 1) {
        const nextKeys = [...keys]
        for (const i of [...sorted].sort((a, b) => b - a)) {
          ;[nextKeys[i], nextKeys[i + 1]] = [nextKeys[i + 1]!, nextKeys[i]!]
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
      .filter(Boolean) as DirectAccessKey[]
    if (keys.length > 0) keyClipboardRef.current = { keys: JSON.parse(JSON.stringify(keys)), cut: false }
  }, [selectedKeyIndices, currentKeys])

  const cutKeys = useCallback(() => {
    if (selectedKeyIndices.length === 0) return
    const keys = selectedKeyIndices
      .sort((a, b) => a - b)
      .map((i) => currentKeys[i])
      .filter(Boolean) as DirectAccessKey[]
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
    const insertAt =
      selectedKeyIndices.length > 0 ? Math.max(...selectedKeyIndices) + 1 : currentKeys.length
    mutatePageAtPath(subpagePath, (page) => {
      const keys = page.keys ?? []
      return {
        ...page,
        keys: [...keys.slice(0, insertAt), ...clip.keys, ...keys.slice(insertAt)],
      }
    })
    setSelectedKeyIndices(clip.keys.map((_, i) => insertAt + i))
    if (clip.cut) keyClipboardRef.current = null
  }, [selectedKeyIndices, currentKeys.length, mutatePageAtPath, subpagePath])

  const goBackToPath = useCallback((path: SubpagePath) => {
    setSubpagePath(path)
    setSelectedKeyIndices([])
  }, [])

  const goToSubpage = useCallback((keyIndex: number) => {
    setSubpagePath((path) => [...path, keyIndex])
    setSelectedKeyIndices([])
  }, [])

  const getBreadcrumbItems = useCallback(() => {
    if (editingPagePath == null || editingPage == null || editingButton == null || !isGeoPageButton(editingButton)) {
      return []
    }
    const items = [
      {
        label: (editingButton.label[0] ?? '').trim() || 'Button',
        path: [] as SubpagePath,
      },
    ]
    let page = editingPage
    for (let i = 0; i < subpagePath.length; i++) {
      const keys = page.keys ?? []
      const key = keys[subpagePath[i]!]
      if (!key) break
      const line0 = (key.label ?? [])[0] ?? ''
      items.push({
        label: line0.trim() || `Key ${subpagePath[i]! + 1}`,
        path: subpagePath.slice(0, i + 1),
      })
      if (!key.page) break
      page = key.page
    }
    return items
  }, [editingPagePath, editingPage, editingButton, subpagePath])

  useEffect(() => {
    if (editingPagePath == null) return
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
        if (primary != null && currentKeys[primary]?.page != null) {
          e.preventDefault()
          goToSubpage(primary)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveSelectedKeys('up')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveSelectedKeys('down')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (Math.min(...selectedKeyIndices) >= currentRows) moveSelectedKeys('left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (Math.max(...selectedKeyIndices) + currentRows < currentKeys.length) {
          moveSelectedKeys('right')
        }
      } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey) {
        e.preventDefault()
        clearKeys()
      } else if (e.key === 'Delete') {
        e.preventDefault()
        removeKey()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    editingPagePath,
    selectedKeyIndices,
    currentKeys,
    currentRows,
    isClientPage,
    moveSelectedKeys,
    goToSubpage,
    removeKey,
    clearKeys,
    copyKeys,
    cutKeys,
    pasteKeys,
  ])

  const handleSelectKey = useCallback(
    (index: number, addToSelection: boolean, rangeSelect: boolean) => {
      if (rangeSelect && selectedKeyIndices.length > 0) {
        const anchor = selectedKeyIndices[0]!
        const start = Math.min(anchor, index)
        const end = Math.max(anchor, index)
        setSelectedKeyIndices(Array.from({ length: end - start + 1 }, (_, i) => start + i))
      } else if (addToSelection) {
        setSelectedKeyIndices((prev) =>
          prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index].sort((a, b) => a - b)
        )
      } else {
        setSelectedKeyIndices([index])
      }
    },
    [selectedKeyIndices]
  )

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

  if (editingPagePath != null && editingPage != null) {
    return (
      <main className="main-content">
        <section className="tab-editor">
          <h3>Button page</h3>
          <button
            type="button"
            onClick={() => {
              setEditingPagePath(null)
              setSubpagePath([])
              setSelectedKeyIndices([])
            }}
          >
            ← Back to layout
          </button>
          <label>
            Rows
            <input
              type="number"
              min={1}
              value={currentRows}
              onChange={(e) => setCurrentPageRows(parseInt(e.target.value, 10) || 1)}
              disabled={isClientPage}
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
            onReorderKeys={(from, to) => moveKey(from, to)}
            onMoveSelectedKeys={moveSelectedKeys}
            onAddKey={addKey}
            onRemoveKey={removeKey}
            onSwapKeys={selectedKeyIndices.length === 2 ? swapSelectedKeys : undefined}
            onCopyKeys={copyKeys}
            onCutKeys={cutKeys}
            onPasteKeys={pasteKeys}
            breadcrumbItems={getBreadcrumbItems()}
            onBackToPath={goBackToPath}
            isClientPage={isClientPage}
            stations={stations}
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
              stations={stations}
              stationIdsLoadError={stationIdsLoadError}
              stationIdsLoading={stationIdsLoading}
              onLoadStations={onLoadStations}
              onUpdateKey={(updater) => {
                if (primaryKeyIndex == null) return
                updateKeyAtPath(subpagePath, primaryKeyIndex, updater)
              }}
              onClearKeys={clearKeys}
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
    )
  }

  return (
    <main className="main-content geo-main">
      <section className="geo-tree-panel">
        <h3>Layout</h3>
        <GeoTree
          profile={profile}
          selectedPath={selectedPath}
          onSelectPath={handleSelectPath}
          onAddChild={handleAddChild}
          onRemovePath={handleRemovePath}
          onMovePath={handleMovePath}
          onRelocatePath={handleRelocatePath}
        />
      </section>
      <section className="geo-preview-area">
        <GeoLayoutPreview
          profile={profile}
          selectedPath={selectedPath}
          onSelectPath={handleSelectPath}
          onEditButtonPage={startEditPage}
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
          {selectedNode != null ? (
            <GeoNodeEditor
              node={selectedNode}
              isRoot={selectedPath.length === 0}
              onUpdate={handleUpdateSelected}
              onEditPage={
                isGeoPageButton(selectedNode) &&
                selectedNode.page != null &&
                selectedNode.page.client_page == null
                  ? () => startEditPage(selectedPath)
                  : undefined
              }
            />
          ) : (
            <p className="geo-node-editor-empty">Select a node</p>
          )}
        </div>
      </aside>
    </main>
  )
}
