import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Tab } from '../types'

interface TabBarProps {
  tabs: Tab[]
  selectedIndex: number
  onSelectTab: (index: number) => void
  onReorderTabs: (from: number, to: number) => void
  onAddTab: () => void
  onDuplicateTab?: () => void
  onRemoveTab: () => void
}

function SortableTab({
  tab,
  index,
  isSelected,
  onSelect,
}: {
  tab: Tab
  index: number
  isSelected: boolean
  onSelect: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `tab-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`tab ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={style}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      {tab.label.map((line, i) => (
        <div key={i} className="tab-label-line">
          {line}
        </div>
      ))}
    </button>
  )
}

export default function TabBar({ tabs, selectedIndex, onSelectTab, onReorderTabs, onAddTab, onDuplicateTab, onRemoveTab }: TabBarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over == null || active.id === over.id) return
    const from = tabs.findIndex((_, i) => `tab-${i}` === active.id)
    const to = tabs.findIndex((_, i) => `tab-${i}` === over.id)
    if (from >= 0 && to >= 0) onReorderTabs(from, to)
  }

  return (
    <div className="tab-bar">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map((_, i) => `tab-${i}`)} strategy={horizontalListSortingStrategy}>
          {tabs.map((tab, i) => (
            <SortableTab
              key={`${i}-${tab.label}`}
              tab={tab}
              index={i}
              isSelected={i === selectedIndex}
              onSelect={() => onSelectTab(i)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" onClick={onAddTab} className="tab-bar-btn" title="Add tab" aria-label="Add tab">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M8 3v10M3 8h10" />
        </svg>
      </button>
      {onDuplicateTab && (
        <button type="button" onClick={onDuplicateTab} className="tab-bar-btn" title="Duplicate tab" aria-label="Duplicate tab">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
            <rect x="4" y="4" width="9" height="9" rx="1" />
            <path d="M3 12V5a1 1 0 011-1h6" />
          </svg>
        </button>
      )}
      {tabs.length > 1 && (
        <button type="button" onClick={onRemoveTab} className="tab-bar-btn" title="Remove tab" aria-label="Remove tab">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v4M10 7v4M4 4l.5 9a1 1 0 001 1h5a1 1 0 001-1L12 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
