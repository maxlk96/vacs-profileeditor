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

export default function TabBar({ tabs, selectedIndex, onSelectTab, onReorderTabs, onAddTab, onRemoveTab }: TabBarProps) {
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
      <button type="button" onClick={onAddTab} style={{ marginLeft: '0.5rem' }}>
        + Tab
      </button>
      {tabs.length > 1 && (
        <button type="button" onClick={onRemoveTab} style={{ marginLeft: '0.25rem' }}>
          Remove tab
        </button>
      )}
    </div>
  )
}
