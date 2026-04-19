// ============================================================
// ChoiceSheet — single-select picker on a bottom sheet.
// ------------------------------------------------------------
// Replaces native <select> elements and any one-off "pick one
// of these" lists. Renders each option as a big tappable row
// with label + optional sublabel + selected-state checkmark.
// Emits onSelect(value) and auto-closes via onClose.
//
// Intentionally presentational + dumb: parent owns the state.
// ============================================================

'use client'

import BottomSheet from './BottomSheet'

export interface ChoiceOption<T extends string = string> {
  value: T
  label: string
  sublabel?: string
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
      <div className="px-4 pt-2 pb-6 flex flex-col gap-2">
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={[
                'w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all',
                isSelected
                  ? 'bg-accent-fire/10 border border-accent-fire/40'
                  : 'bg-bg-input border border-bg-border hover:border-accent-fire/30 active:scale-[0.99]',
              ].join(' ')}
            >
              <div className="flex-1 min-w-0">
                <p className={['font-heading text-[15px] leading-tight', isSelected ? 'text-accent-fire' : 'text-text-primary'].join(' ')}>
                  {opt.label}
                </p>
                {opt.sublabel && (
                  <p className="text-[11px] text-text-dim mt-0.5">{opt.sublabel}</p>
                )}
              </div>
              {isSelected && (
                <svg className="w-5 h-5 text-accent-fire flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
