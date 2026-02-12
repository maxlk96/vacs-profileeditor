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
import type { SubpagePath } from '../App'

interface KeyGridProps {
  keys: DirectAccessKey[]
  rows: number
  selectedKeyIndex: number | null
  onSelectKey: (index: number | null) => void
  onDoubleClickKey?: (index: number) => void
  onReorderKeys: (from: number, to: number) => void
  onMoveKey: (from: number, to: number) => void
  onAddKey: () => void
  onRemoveKey: () => void
  subpagePath: SubpagePath
  onBackSubpage: () => void
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

  return (
    <div
      ref={setNodeRef}
      className={`key-cell ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isEmpty ? 'key-cell-empty' : ''}`}
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
  subpagePath,
  onBackSubpage,
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
      {subpagePath.length > 0 && (
        <div className="breadcrumb">
          <button type="button" onClick={onBackSubpage}>
            ← Back to tab
          </button>
        </div>
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
            <button type="button" onClick={() => onMoveKey(selectedKeyIndex, selectedKeyIndex - 1)} disabled={selectedKeyIndex <= 0}>
              Move left
            </button>
            <button type="button" onClick={() => onMoveKey(selectedKeyIndex, selectedKeyIndex + 1)} disabled={selectedKeyIndex >= keys.length - 1}>
              Move right
            </button>
            <button type="button" onClick={() => onMoveKey(selectedKeyIndex, Math.max(0, selectedKeyIndex - cols))} disabled={selectedKeyIndex < cols}>
              Move up
            </button>
            <button type="button" onClick={() => onMoveKey(selectedKeyIndex, Math.min(keys.length, selectedKeyIndex + cols))} disabled={selectedKeyIndex >= keys.length - cols}>
              Move down
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
