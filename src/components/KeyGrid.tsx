import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DirectAccessKey } from '../types'
import type { BreadcrumbItem, SubpagePath } from '../App'
import { IconPlus, IconChevronUp, IconChevronDown, IconChevronLeft, IconChevronRight, IconCopy, IconCut, IconPaste, IconTrash, IconSwap } from './Icons'

interface KeyGridProps {
  keys: DirectAccessKey[]
  rows: number
  selectedKeyIndices: number[]
  onSelectKey: (index: number, addToSelection: boolean, rangeSelect: boolean) => void
  onDoubleClickKey?: (index: number) => void
  onReorderKeys: (from: number, to: number) => void
  onMoveSelectedKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void
  onAddKey: () => void
  onRemoveKey: () => void
  onSwapKeys?: () => void
  onCopyKeys?: () => void
  onCutKeys?: () => void
  onPasteKeys?: () => void
  breadcrumbItems: BreadcrumbItem[]
  onBackToPath: (path: SubpagePath) => void
  isClientPage?: boolean
}

function SortableKeyCell({
  keyData,
  index,
  isSelected,
  onSelect,
  onDoubleClick,
}: {
  keyData: DirectAccessKey
  index: number
  isSelected: boolean
  onSelect: (e: React.MouseEvent) => void
  onDoubleClick?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `key-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const lines = keyData.label ?? []
  const line0 = (lines[0] ?? '').trim()
  const line1 = (lines[1] ?? '').trim()
  const line2 = (lines[2] ?? '').trim()
  const isEmpty = lines.length === 0 || (line0 === '' && line1 === '' && line2 === '')
  const hasNoStation = !keyData.station_id || keyData.station_id.trim() === ''
  const hasSubpage = keyData.page != null

  return (
    <div
      ref={setNodeRef}
      className={`key-cell ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isEmpty ? 'key-cell-empty' : ''} ${hasNoStation ? 'key-cell-no-station' : ''} ${hasSubpage ? 'key-cell-has-subpage' : ''}`}
      style={style}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      {...attributes}
      {...listeners}
    >
      {isEmpty ? (
        '(blank)'
      ) : (
        <>
          {line0 && <span className="key-cell-line">{line0}</span>}
          {line1 && <span className="key-cell-line">{line1}</span>}
          {line2 && <span className="key-cell-line">{line2}</span>}
        </>
      )}
      {hasSubpage && (
        <span className="key-cell-subpage-indicator" title="Has subpage">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 4l4 4-4 4" />
          </svg>
        </span>
      )}
    </div>
  )
}

export default function KeyGrid({
  keys,
  rows,
  selectedKeyIndices,
  onSelectKey,
  onDoubleClickKey,
  onReorderKeys,
  onMoveSelectedKeys,
  onAddKey,
  onRemoveKey,
  onSwapKeys,
  onCopyKeys,
  onCutKeys,
  onPasteKeys,
  breadcrumbItems,
  onBackToPath,
  isClientPage = false,
}: KeyGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over == null || active.id === over.id) return
    const from = keys.findIndex((_, i) => `key-${i}` === active.id)
    const to = keys.findIndex((_, i) => `key-${i}` === over.id)
    if (from >= 0 && to >= 0) onReorderKeys(from, to)
  }

  const cols = rows > 0 ? Math.ceil(keys.length / rows) || 1 : 1

  return (
    <div>
      {breadcrumbItems.length > 1 && (
        <nav className="breadcrumb" aria-label="Breadcrumb">
          {breadcrumbItems.map((item, i) => (
            <span key={i} className="breadcrumb-segment">
              {i > 0 && <span className="breadcrumb-sep"> › </span>}
              {i < breadcrumbItems.length - 1 ? (
                <button type="button" onClick={() => onBackToPath(item.path)}>
                  {item.label}
                </button>
              ) : (
                <span className="breadcrumb-current">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {isClientPage && (
        <p>
          <span className="client-page-badge">Client page (read-only)</span>
        </p>
      )}
      <div
        className="key-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(80px, 1fr))`,
          gridTemplateRows: `repeat(${rows}, auto)`,
          gridAutoFlow: 'column',
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={keys.map((_, i) => `key-${i}`)} strategy={rectSortingStrategy}>
            {keys.map((keyData, i) => (
              <SortableKeyCell
                key={i}
                keyData={keyData}
                index={i}
                isSelected={selectedKeyIndices.includes(i)}
                onSelect={(e) => onSelectKey(i, e.ctrlKey || e.metaKey, e.shiftKey)}
                onDoubleClick={onDoubleClickKey ? () => onDoubleClickKey(i) : undefined}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <div className="key-actions">
        <button type="button" onClick={onAddKey} disabled={isClientPage} className="key-action-btn" title="Add key" aria-label="Add key">
          <IconPlus />
        </button>
        {selectedKeyIndices.length > 0 && !isClientPage && (
          <>
            <div className="move-pad">
              <button type="button" onClick={() => onMoveSelectedKeys?.('up')} disabled={!onMoveSelectedKeys || Math.min(...selectedKeyIndices) <= 0} className="key-action-btn move-pad-btn" title="Move up" aria-label="Move up">
                <IconChevronUp />
              </button>
              <button type="button" onClick={() => onMoveSelectedKeys?.('down')} disabled={!onMoveSelectedKeys || Math.max(...selectedKeyIndices) >= keys.length - 1} className="key-action-btn move-pad-btn" title="Move down" aria-label="Move down">
                <IconChevronDown />
              </button>
              <button type="button" onClick={() => onMoveSelectedKeys?.('left')} disabled={!onMoveSelectedKeys || Math.min(...selectedKeyIndices) < rows} className="key-action-btn move-pad-btn" title="Move left" aria-label="Move left">
                <IconChevronLeft />
              </button>
              <button type="button" onClick={() => onMoveSelectedKeys?.('right')} disabled={!onMoveSelectedKeys || Math.max(...selectedKeyIndices) + rows >= keys.length} className="key-action-btn move-pad-btn" title="Move right" aria-label="Move right">
                <IconChevronRight />
              </button>
            </div>
            {onSwapKeys && (
              <button type="button" onClick={onSwapKeys} className="key-action-btn" title="Swap positions" aria-label="Swap">
                <IconSwap />
              </button>
            )}
            {onCopyKeys && (
              <button type="button" onClick={onCopyKeys} className="key-action-btn" title="Copy (Ctrl+C)" aria-label="Copy">
                <IconCopy />
              </button>
            )}
            {onCutKeys && (
              <button type="button" onClick={onCutKeys} className="key-action-btn" title="Cut (Ctrl+X)" aria-label="Cut">
                <IconCut />
              </button>
            )}
            {onPasteKeys && (
              <button type="button" onClick={onPasteKeys} className="key-action-btn" title="Paste (Ctrl+V)" aria-label="Paste">
                <IconPaste />
              </button>
            )}
            <button type="button" onClick={onRemoveKey} className="key-action-btn" title="Remove key" aria-label="Remove key">
              <IconTrash />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
