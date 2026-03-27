'use client'

import { clsx } from 'clsx'

interface SkillChipProps {
  skill: string
  selected: boolean
  onToggle: (skill: string) => void
}

export default function SkillChip({ skill, selected, onToggle }: SkillChipProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(skill)}
      className={clsx('skill-chip', selected ? 'skill-chip-on' : 'skill-chip-off')}
    >
      {skill}
    </button>
  )
}
