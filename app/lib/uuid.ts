// ============================================================
// randomId — drop-in replacement for crypto.randomUUID()
// ------------------------------------------------------------
// Why this exists:
//   crypto.randomUUID() only works in "secure contexts" (HTTPS
//   or localhost). Accessing the dev server from a LAN IP over
//   plain HTTP (e.g. http://192.168.4.32:3001 from a phone)
//   leaves it undefined, and every call throws
//   "crypto.randomUUID is not a function" — breaking photo
//   upload, plan item creation, etc.
//
//   crypto.getRandomValues() IS available in non-secure
//   contexts, so we use it to hand-roll an RFC-4122 v4 UUID
//   when randomUUID isn't available. Final fallback is
//   Math.random for truly ancient / locked-down environments.
//
// Use this everywhere instead of crypto.randomUUID().
// ============================================================

export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    // Set version (4) and variant bits per RFC 4122.
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // Last-resort Math.random fallback. Not cryptographically strong,
  // but fine for client-side React keys and storage filenames.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
