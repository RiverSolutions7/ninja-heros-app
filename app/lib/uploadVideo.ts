import { supabase } from './supabase'
import { randomId } from './uuid'

export async function uploadLaneVideo(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  const fileName = `${randomId()}.${ext}`
  const filePath = `lanes/${fileName}`

  const { error } = await supabase.storage
    .from('lane-videos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) throw new Error(`Station video upload failed: ${error.message}`)

  const { data } = supabase.storage
    .from('lane-videos')
    .getPublicUrl(filePath)

  return data.publicUrl
}

export async function uploadComponentVideo(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  const fileName = `${randomId()}.${ext}`
  const filePath = `components/${fileName}`

  const { error } = await supabase.storage
    .from('lane-videos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) throw new Error(`Component video upload failed: ${error.message}`)

  const { data } = supabase.storage
    .from('lane-videos')
    .getPublicUrl(filePath)

  return data.publicUrl
}

export async function uploadGameVideo(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  const fileName = `${randomId()}.${ext}`
  const filePath = `games/${fileName}`

  const { error } = await supabase.storage
    .from('game-videos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) throw new Error(`Game video upload failed: ${error.message}`)

  const { data } = supabase.storage
    .from('game-videos')
    .getPublicUrl(filePath)

  return data.publicUrl
}
