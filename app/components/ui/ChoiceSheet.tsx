'use client'

import BottomSheet from './BottomSheet'

export interface ChoiceOption<T extends string = string> {
  value: T
  label: string
  sublabel?: string
  dotClass?: string  // e.g. 'bg-accent-blue' — colored dot indicator
  count?: number     // right-side count badge
}

interface ChoiceSheetProps<T extends string = string> {
  visible: boolean
  title?: string
  options: ChoiceOption<T>[]
  selectedValue?: T | null
  onSelect: (value: T) => void
  onClose: () => void
}

export default function ChoiceSheet<T extends string = string>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: ChoiceSheetProps<T>) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <div className="pt-1 pb-6 flex flex-col divide-y divide-white/[0.06]">
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={[
                'w-full flex items-center gap-3 py-4 pr-5 text-left transition-colors',
                isSelected
                  ? 'border-l-4 border-accent-fire pl-4 bg-accent-fire/[0.05]'
                  : 'border-l-4 border-transparent pl-4',
              ].join(' ')}
            >
              {opt.dotClass && (
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dotClass}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className={[
                  'font-heading text-sm uppercase leading-tight',
                  isSelected ? 'text-text-primary' : 'text-text-muted',
                ].join(' ')}>
                  {opt.label}
                </p>
                {opt.sublabel && (
                  <p className="text-[11px] text-text-dim mt-0.5">{opt.sublabel}</p>
                )}
              </div>
              {opt.count !== undefined && (
                <span className={[
                  'font-heading text-[11px] px-1.5 py-0.5 rounded flex-shrink-0',
                  isSelected ? 'bg-accent-fire/20 text-accent-fire' : 'bg-white/10 text-text-dim',
                ].join(' ')}>
                  {opt.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
