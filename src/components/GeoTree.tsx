import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  isGeoPageButton,
  isGeoPageContainer,
  isGeoPageDivider,
  type GeoNode,
  type GeoPageContainer,
  type GeoProfile,
} from '../types'
import {
  buttonSummary,
  idToPath,
  isAncestorPath,
  nodeLabel,
  pathToId,
  type GeoPath,
} from '../lib/geo'
import { IconChevronDown, IconChevronRight, IconPlus, IconTrash } from './Icons'

interface GeoTreeProps {
  profile: GeoProfile
  selectedPath: GeoPath
  onSelectPath: (path: GeoPath) => void
  onAddChild: (parentPath: GeoPath, kind: 'button' | 'container' | 'divider') => void
  onRemovePath: (path: GeoPath) => void
  onMovePath: (path: GeoPath, direction: 'up' | 'down') => void
  onRelocatePath: (fromPath: GeoPath, toParentPath: GeoPath, toIndex: number) => void
}

function pathsEqual(a: GeoPath, b: GeoPath): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

type DropMode = 'before' | 'inside'

interface DropTarget {
  overId: string
  mode: DropMode
}

function parseDropId(id: string): { path: GeoPath; mode: DropMode } | null {
  if (id.startsWith('before:')) {
    const path = idToPath(id.slice('before:'.length))
    return path != null ? { path, mode: 'before' } : null
  }
  if (id.startsWith('inside:')) {
    const path = idToPath(id.slice('inside:'.length))
    return path != null ? { path, mode: 'inside' } : null
  }
  return null
}

export default function GeoTree({
  profile,
  selectedPath,
  onSelectPath,
  onAddChild,
  onRemovePath,
  onMovePath,
  onRelocatePath,
}: GeoTreeProps) {
  const [activePath, setActivePath] = useState<GeoPath | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const resolveLabel = (path: GeoPath): string => {
    if (path.length === 0) return `Root (${profile.direction})`
    let container: GeoPageContainer = profile
    for (let i = 0; i < path.length; i++) {
      const child = container.children[path[i]!]
      if (child == null) return 'Node'
      if (i === path.length - 1) {
        return isGeoPageButton(child) ? buttonSummary(child) : nodeLabel(child)
      }
      if (!isGeoPageContainer(child)) return 'Node'
      container = child
    }
    return 'Node'
  }

  const handleDragStart = (event: DragStartEvent) => {
    const path = idToPath(String(event.active.id))
    if (path == null || path.length === 0) return
    setActivePath(path)
    setDropTarget(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over == null) {
      setDropTarget(null)
      return
    }
    const parsed = parseDropId(String(over.id))
    if (parsed == null) {
      setDropTarget(null)
      return
    }
    setDropTarget({ overId: String(over.id), mode: parsed.mode })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActivePath(null)
    setDropTarget(null)
    if (over == null) return

    const fromPath = idToPath(String(active.id))
    const parsed = parseDropId(String(over.id))
    if (fromPath == null || fromPath.length === 0 || parsed == null) return

    const { path: overPath, mode } = parsed
    if (isAncestorPath(fromPath, overPath)) return

    if (mode === 'inside') {
      onRelocatePath(fromPath, overPath, Number.MAX_SAFE_INTEGER)
      return
    }

    if (overPath.length === 0) return
    const toParentPath = overPath.slice(0, -1)
    const toIndex = overPath[overPath.length - 1]!
    if (pathsEqual(fromPath, overPath)) return
    onRelocatePath(fromPath, toParentPath, toIndex)
  }

  const handleDragCancel = () => {
    setActivePath(null)
    setDropTarget(null)
  }

  return (
    <div className="geo-tree">
      <div className="geo-tree-toolbar">
        <span className="geo-tree-toolbar-label">Add to selection · drag to reorder</span>
        <button type="button" title="Add button" onClick={() => onAddChild(selectedPath, 'button')}>
          <IconPlus /> Button
        </button>
        <button type="button" title="Add container" onClick={() => onAddChild(selectedPath, 'container')}>
          <IconPlus /> Container
        </button>
        <button type="button" title="Add divider" onClick={() => onAddChild(selectedPath, 'divider')}>
          <IconPlus /> Divider
        </button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <ul className="geo-tree-list" role="tree">
          <GeoTreeNode
            node={profile}
            path={[]}
            depth={0}
            selectedPath={selectedPath}
            activePath={activePath}
            dropTarget={dropTarget}
            onSelectPath={onSelectPath}
            onRemovePath={onRemovePath}
            onMovePath={onMovePath}
            isRoot
          />
        </ul>
        <DragOverlay dropAnimation={null}>
          {activePath != null ? (
            <div className="geo-tree-row geo-tree-drag-overlay">
              <span className="geo-tree-row-label">{resolveLabel(activePath)}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

interface GeoTreeNodeProps {
  node: GeoNode | GeoPageContainer
  path: GeoPath
  depth: number
  selectedPath: GeoPath
  activePath: GeoPath | null
  dropTarget: DropTarget | null
  onSelectPath: (path: GeoPath) => void
  onRemovePath: (path: GeoPath) => void
  onMovePath: (path: GeoPath, direction: 'up' | 'down') => void
  isRoot?: boolean
}

function GeoTreeNode({
  node,
  path,
  depth,
  selectedPath,
  activePath,
  dropTarget,
  onSelectPath,
  onRemovePath,
  onMovePath,
  isRoot = false,
}: GeoTreeNodeProps) {
  const selected = pathsEqual(path, selectedPath)
  const isContainer = isGeoPageContainer(node)
  const label = isRoot
    ? `Root (${(node as GeoPageContainer).direction})`
    : isGeoPageButton(node)
      ? buttonSummary(node)
      : nodeLabel(node as GeoNode)

  let kindClass = 'geo-tree-kind-container'
  if (!isRoot) {
    if (isGeoPageButton(node)) kindClass = 'geo-tree-kind-button'
    else if (isGeoPageDivider(node)) kindClass = 'geo-tree-kind-divider'
  }

  const pathId = pathToId(path)
  const beforeId = `before:${pathId}`
  const insideId = `inside:${pathId}`
  const dragging = activePath != null
  const cannotNestHere =
    activePath != null && (pathsEqual(activePath, path) || isAncestorPath(activePath, path))

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: pathId,
    disabled: isRoot,
  })

  // Non-root rows accept "insert before" drops (reorder / move to this parent).
  const { setNodeRef: setBeforeRef, isOver: isOverBefore } = useDroppable({
    id: beforeId,
    disabled: isRoot,
  })

  // Containers accept "nest inside as last child":
  // - root: drop on the root row
  // - nested: drop on the append zone under children
  const { setNodeRef: setInsideRef, isOver: isOverInside } = useDroppable({
    id: insideId,
    disabled: !isContainer || cannotNestHere,
  })

  const showBefore =
    !isRoot && (isOverBefore || (dropTarget?.overId === beforeId && dropTarget.mode === 'before'))
  const showInside =
    isContainer &&
    !cannotNestHere &&
    (isOverInside || (dropTarget?.overId === insideId && dropTarget.mode === 'inside'))

  const setRowRef = (el: HTMLDivElement | null) => {
    if (isRoot) {
      setInsideRef(el)
      return
    }
    setDragRef(el)
    setBeforeRef(el)
  }

  return (
    <li role="treeitem" aria-selected={selected} className={selected ? 'selected' : undefined}>
      <div
        ref={setRowRef}
        className={[
          'geo-tree-row',
          kindClass,
          selected ? 'selected' : '',
          isDragging ? 'dragging' : '',
          showBefore ? 'drop-before' : '',
          isRoot && showInside ? 'drop-inside' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
        onClick={() => onSelectPath(path)}
        title={
          isRoot
            ? 'Drop here to move into root'
            : isContainer
              ? 'Drag to move · drop on row to insert before · use nest zone to move inside'
              : 'Drag to move · drop on a row to insert before it'
        }
        {...(isRoot ? {} : { ...attributes, ...listeners })}
      >
        <span className="geo-tree-row-icon" aria-hidden>
          {isContainer ? <IconChevronDown /> : <IconChevronRight />}
        </span>
        <span className="geo-tree-row-label">{label}</span>
        {!isRoot && (
          <span
            className="geo-tree-row-actions"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" title="Move up" onClick={() => onMovePath(path, 'up')}>
              ↑
            </button>
            <button type="button" title="Move down" onClick={() => onMovePath(path, 'down')}>
              ↓
            </button>
            <button type="button" title="Remove" onClick={() => onRemovePath(path)}>
              <IconTrash />
            </button>
          </span>
        )}
      </div>
      {isContainer && (
        <ul role="group" className="geo-tree-children">
          {(node as GeoPageContainer).children.map((child, i) => (
            <GeoTreeNode
              key={pathToId([...path, i])}
              node={child}
              path={[...path, i]}
              depth={depth + 1}
              selectedPath={selectedPath}
              activePath={activePath}
              dropTarget={dropTarget}
              onSelectPath={onSelectPath}
              onRemovePath={onRemovePath}
              onMovePath={onMovePath}
            />
          ))}
          {dragging && !cannotNestHere && !isRoot && (
            <li
              ref={setInsideRef}
              className={`geo-tree-nest-zone ${showInside ? 'active' : ''}`}
              style={{ paddingLeft: `${0.5 + (depth + 1) * 0.85}rem` }}
              aria-hidden
            >
              Nest inside
            </li>
          )}
        </ul>
      )}
    </li>
  )
}
