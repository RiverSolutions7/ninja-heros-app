'use client'

import { useState } from 'react'

interface Props {
  classId: string
  title: string
  ageGroup: string
  date: string
}

export default function ShareClassButton({ classId, title, ageGroup, date }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = `${window.location.origin}/class/${classId}`
    const text = `${title} — ${ageGroup} · ${date}`
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="w-full inline-flex items-center justify-center gap-2 border border-bg-border text-text-muted font-heading text-base px-4 py-3.5 rounded-xl active:scale-95 transition-all hover:bg-white/5 min-h-[52px]"
    >
      {copied ? (
        <>
          <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Link Copied
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Share with Coaches
        </>
      )}
    </button>
  )
}
