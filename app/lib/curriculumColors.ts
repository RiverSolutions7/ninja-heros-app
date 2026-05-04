export function curriculumDotColor(ageGroup: string | null | undefined): string {
  if (!ageGroup) return '#6b7da3'
  const k = ageGroup.toLowerCase()
  if (k.includes('mini')) return '#a855f7'
  if (k.includes('junior')) return '#3b82f6'
  if (k.includes('play') || k.includes('toddler')) return '#22c55e'
  return '#6b7da3'
}
