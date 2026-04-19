import { supabase } from './supabase'
import { randomId } from './uuid'

export async function uploadStationPhoto(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileName = `${randomId()}.${ext}`
  const filePath = `stations/${fileName}`

  const { error } = await supabase.storage
    .from('station-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) throw new Error(`Photo upload failed: ${error.message}`)

  const { data } = supabase.storage
    .from('station-photos')
    .getPublicUrl(filePath)

  return data.publicUrl
}
