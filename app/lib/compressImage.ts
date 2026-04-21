/**
 * Compress a photo File using the Canvas API before upload.
 *
 * - Max dimension: 1200px (longer side), aspect ratio preserved
 * - Output format: JPEG at 0.82 quality
 * - Skip if already ≤ 300 KB — no point recompressing small files
 * - Always falls back to the original File on any error — never blocks an upload
 */
export async function compressImage(file: File): Promise<File> {
  if (file.size <= 300 * 1024) return file

  return new Promise((resolve) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(blobUrl)

      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const name = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.82
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      resolve(file)
    }

    img.src = blobUrl
  })
}
