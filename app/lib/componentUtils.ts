import type {
  ComponentRow,
  DraftBlock,
  DraftWarmupBlock,
  DraftLaneBlock,
  DraftGameBlock,
  DraftStation,
  WarmupTime,
} from './database.types'

export function componentToDraftBlock(component: ComponentRow): DraftBlock {
  if (component.type === 'warmup') {
    const mins = component.duration_minutes
    const time: WarmupTime =
      mins && mins >= 1 && mins <= 10 ? (`${mins} min` as WarmupTime) : '5 min'
    return {
      type: 'warmup',
      localId: crypto.randomUUID(),
      description: component.description || '',
      time,
      skill_focus: component.skills?.[0] || '',
    } satisfies DraftWarmupBlock
  }
  if (component.type === 'game') {
    return {
      type: 'game',
      localId: crypto.randomUUID(),
      name: component.title,
      description: component.description || '',
      video_link: '',
      videoFile: null,
      videoPreview: null,
    } satisfies DraftGameBlock
  }
  // station → lane block with one pre-filled station
  return {
    type: 'lane',
    localId: crypto.randomUUID(),
    instructor_name: '',
    core_skills: component.skills || [],
    stations: [
      {
        localId: crypto.randomUUID(),
        sort_order: 0,
        equipment: component.equipment || component.title,
        description: component.description || '',
        photos: (component.photos || []).map((url) => ({
          localId: crypto.randomUUID(),
          photoFile: null,
          photoPreview: url,
          photo_url: url,
        })),
      } satisfies DraftStation,
    ],
    videoFile: null,
    videoPreview: null,
  } satisfies DraftLaneBlock
}
