'use client'

import type { DraftBlock, DraftLaneBlock, BlockType } from '@/app/lib/database.types'
import AddBlockMenu from './AddBlockMenu'
import WarmupBlockForm from './WarmupBlockForm'
import LaneBlockForm from './LaneBlockForm'
import GameBlockForm from './GameBlockForm'

interface BlockBuilderProps {
  blocks: DraftBlock[]
  onAdd: (type: BlockType, afterIndex?: number) => void
  onChange: (localId: string, changes: Partial<DraftBlock>) => void
  onRemove: (localId: string) => void
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

export default function BlockBuilder({
  blocks,
  onAdd,
  onChange,
  onRemove,
  availableSkills,
  onAddSkill,
  ageGroup,
}: BlockBuilderProps) {
  // Count lane blocks before a given index for lane numbering
  function getLaneNumber(index: number): number {
    return blocks.slice(0, index).filter((b) => b.type === 'lane').length + 1
  }

  return (
    <div className="space-y-0">
      {/* Initial add button (when no blocks yet) */}
      {blocks.length === 0 && (
        <AddBlockMenu onAdd={(type) => onAdd(type, -1)} />
      )}

      {blocks.map((block, index) => (
        <div key={block.localId}>
          {/* Connector between blocks */}
          {index > 0 && (
            <BlockConnector
              fromType={blocks[index - 1].type}
              toType={block.type}
            />
          )}

          {/* The block itself */}
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
              laneNumber={getLaneNumber(index)}
              onChange={(changes) =>
                onChange(block.localId, changes as Partial<DraftLaneBlock>)
              }
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
            />
          )}

          {/* Add button AFTER each block */}
          <div className="mt-3">
            <AddBlockMenu onAdd={(type) => onAdd(type, index)} />
          </div>
        </div>
      ))}
    </div>
  )
}
