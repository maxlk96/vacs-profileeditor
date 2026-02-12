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

interface KeyGridProps {
  keys: DirectAccessKey[]
  rows: number
  selectedKeyIndex: number | null
  onSelectKey: (index: number | null) => void
  onDoubleClickKey?: (index: number) => void
  onReorderKeys: (from: number, to: number) => void
  onMoveKey: (from: number, to: number, swap?: boolean) => void
  onAddKey: () => void
  onRemoveKey: () => void
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
  onSelect: () => void
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
      {hasSubpage && <span className="key-cell-subpage-indicator" title="Has subpage">▶</span>}
    </div>
  )
}

export default function KeyGrid({
  keys,
  rows,
  selectedKeyIndex,
  onSelectKey,
  onDoubleClickKey,
  onReorderKeys,
  onMoveKey,
  onAddKey,
  onRemoveKey,
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
                isSelected={i === selectedKeyIndex}
                onSelect={() => onSelectKey(i)}
                onDoubleClick={onDoubleClickKey ? () => onDoubleClickKey(i) : undefined}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <div className="key-actions">
        <button type="button" onClick={onAddKey} disabled={isClientPage}>
          Add key
        </button>
        {selectedKeyIndex != null && !isClientPage && (
          <>
            <button type="button" onClick={() => onMoveKey(selectedKeyIndex, selectedKeyIndex - 1)} disabled={selectedKeyIndex <= 0} title="Move up">
              ↑
            </button>
            <button type="button" onClick={() => onMoveKey(selectedKeyIndex, selectedKeyIndex + 1)} disabled={selectedKeyIndex >= keys.length - 1} title="Move down">
              ↓
            </button>
            <button type="button" onClick={() => onMoveKey(selectedKeyIndex, selectedKeyIndex - rows, true)} disabled={selectedKeyIndex < rows} title="Swap left">
              ←
            </button>
            <button type="button" onClick={() => onMoveKey(selectedKeyIndex, selectedKeyIndex + rows, true)} disabled={selectedKeyIndex + rows >= keys.length} title="Swap right">
              →
            </button>
            <button type="button" onClick={onRemoveKey}>
              Remove key
            </button>
          </>
        )}
      </div>
    </div>
  )
}
