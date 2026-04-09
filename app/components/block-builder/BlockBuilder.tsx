'use client'

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraftBlock, DraftLaneBlock, BlockType, ComponentRow } from '@/app/lib/database.types'
import AddBlockMenu from './AddBlockMenu'
import WarmupBlockForm from './WarmupBlockForm'
import LaneBlockForm from './LaneBlockForm'
import GameBlockForm from './GameBlockForm'

interface BlockBuilderProps {
  blocks: DraftBlock[]
  onAdd: (type: BlockType, afterIndex?: number) => void
  onAddFromLibrary: (component: ComponentRow, afterIndex?: number) => void
  onChange: (localId: string, changes: Partial<DraftBlock>) => void
  onRemove: (localId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  availableSkills: string[]
  onAddSkill: (name: string) => void
  ageGroup: string
}

function BlockConnector({ fromType, toType }: { fromType?: string; toType?: string }) {
  const dotColor = (type?: string) => {
    if (type === 'warmup') return 'bg-accent-gold'
    if (type === 'lane') return 'bg-accent-fire'
    if (type === 'game') return 'bg-accent-green'
    return 'bg-bg-border'
  }

  return (
    <div className="flex flex-col items-center py-1">
      <div className={`block-connector-dot ${dotColor(fromType)}`} />
      <div className="block-connector-line" />
      <div className={`block-connector-dot ${dotColor(toType)}`} />
    </div>
  )
}

function GripIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" className="text-text-dim/40">
      {([3, 10, 17] as const).flatMap((cx) =>
        ([3, 11] as const).map((cy) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2} fill="currentColor" />
        ))
      )}
    </svg>
  )
}

interface SortableBlockItemProps {
  id: string
  block: DraftBlock
  index: number
  blocks: DraftBlock[]
  onChange: (localId: string, changes: Partial<DraftBlock>) => void
  onRemove: (localId: string) => void
  onAdd: (type: BlockType, afterIndex?: number) => void
  onAddFromLibrary: (component: ComponentRow, afterIndex?: number) => void
  availableSkills: string[]
  onAddSkill: (name: string) => void
  ageGroup: string
}

function SortableBlockItem({
  id,
  block,
  index,
  blocks,
  onChange,
  onRemove,
  onAdd,
  onAddFromLibrary,
  availableSkills,
  onAddSkill,
  ageGroup,
}: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function getStationNumber(): number {
    return blocks.slice(0, index).filter((b) => b.type === 'lane').length + 1
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Connector between blocks */}
      {index > 0 && (
        <BlockConnector
          fromType={blocks[index - 1].type}
          toType={block.type}
        />
      )}

      {/* Drag handle — full-width strip above the card, 44px touch target */}
      <div
        className="flex justify-center items-center w-full h-8 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        aria-label="Drag to reorder block"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </div>

      {/* Block form */}
      {block.type === 'warmup' && (
        <WarmupBlockForm
          block={block}
          onChange={(changes) => onChange(block.localId, changes)}
          onRemove={() => onRemove(block.localId)}
        />
      )}
      {block.type === 'lane' && (
        <LaneBlockForm
          block={block}
          laneNumber={getStationNumber()}
          onChange={(changes) => onChange(block.localId, changes as Partial<DraftLaneBlock>)}
          onRemove={() => onRemove(block.localId)}
          availableSkills={availableSkills}
          onAddSkill={onAddSkill}
          ageGroup={ageGroup}
        />
      )}
      {block.type === 'game' && (
        <GameBlockForm
          block={block}
          onChange={(changes) => onChange(block.localId, changes)}
          onRemove={() => onRemove(block.localId)}
          availableSkills={availableSkills}
          onAddSkill={onAddSkill}
          ageGroup={ageGroup}
        />
      )}

      {/* Add button AFTER each block */}
      <div className="mt-3">
        <AddBlockMenu
          onAdd={(type) => onAdd(type, index)}
          onAddFromLibrary={(c) => onAddFromLibrary(c, index)}
          ageGroup={ageGroup}
        />
      </div>
    </div>
  )
}

export default function BlockBuilder({
  blocks,
  onAdd,
  onAddFromLibrary,
  onChange,
  onRemove,
  onReorder,
  availableSkills,
  onAddSkill,
  ageGroup,
}: BlockBuilderProps) {
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = blocks.findIndex((b) => b.localId === active.id)
    const toIndex = blocks.findIndex((b) => b.localId === over.id)
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex)
    }
  }

  return (
    <div className="space-y-0">
      {/* Initial add button (when no blocks yet) */}
      {blocks.length === 0 && (
        <AddBlockMenu
          onAdd={(type) => onAdd(type, -1)}
          onAddFromLibrary={(c) => onAddFromLibrary(c, -1)}
          ageGroup={ageGroup}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.localId)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => (
            <SortableBlockItem
              key={block.localId}
              id={block.localId}
              block={block}
              index={index}
              blocks={blocks}
              onChange={onChange}
              onRemove={onRemove}
              onAdd={onAdd}
              onAddFromLibrary={onAddFromLibrary}
              availableSkills={availableSkills}
              onAddSkill={onAddSkill}
              ageGroup={ageGroup}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
