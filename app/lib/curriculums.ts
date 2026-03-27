export const CURRICULUMS = [
  { id: 'junior', label: 'Junior Ninjas', ageGroup: 'Junior Ninjas (5-9)' },
  { id: 'mini',   label: 'Mini Ninjas',   ageGroup: 'Mini Ninjas (3.5-5)' },
] as const

export type CurriculumId = typeof CURRICULUMS[number]['id']
