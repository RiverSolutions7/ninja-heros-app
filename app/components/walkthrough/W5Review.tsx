'use client'

import { useState } from 'react'
import Torch from './Torch'
import EditSheetW from './EditSheetW'
import type { WalkthroughParsed, WalkthroughStation } from './types'

interface Props {
  stations: WalkthroughStation[]
  saving: boolean
  onSaveAll: () => void
  onUpdateParsed: (id: string, parsed: WalkthroughParsed) => void
}

const ACCENT = '#ff5a1f'
const CARD_BG = '#0f1734'
const CARD_HI = '#131c3d'
const FAINT = '#3e4d70'
const HAIRLINE = 'rgba(255,255,255,0.08)'
const MUTED = '#8ea0c4'

function SkeletonCard() {
  return (
    <div
      style={{
        background: CARD_BG,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        animation: 'lbRiseIn 400ms both',
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          flexShrink: 0,
          borderRadius: 8,
          background: `linear-gradient(90deg, ${CARD_BG} 25%, #1e2d55 50%, ${CARD_BG} 75%)`,
          backgroundSize: '800px 100%',
          animation: 'lbShimmer 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            width: '58%',
            height: 14,
            background: `linear-gradient(90deg, ${CARD_BG} 25%, #1e2d55 50%, ${CARD_BG} 75%)`,
            backgroundSize: '800px 100%',
            animation: 'lbShimmer 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            width: '75%',
            height: 11,
            background: `linear-gradient(90deg, ${CARD_BG} 25%, #1e2d55 50%, ${CARD_BG} 75%)`,
            backgroundSize: '800px 100%',
            animation: 'lbShimmer 1.5s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  )
}

function ResolvedCard({
  station,
  onTap,
}: {
  station: WalkthroughStation
  onTap: () => void
}) {
  const parsed = station.parsed
  if (!parsed) return null
  const metaParts: string[] = []
  if (parsed.durationMinutes) metaParts.push(`${parsed.durationMinutes} min`)
  metaParts.push(...parsed.skills.slice(0, 3))
  const metaLine = metaParts.join(' · ')

  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        background: CARD_BG,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        animation: 'lbRiseIn 400ms both',
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          flexShrink: 0,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={station.photoUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-russo), sans-serif',
            fontSize: 17,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {parsed.title || 'Untitled'}
        </div>
        {metaLine && (
          <div
            style={{
              fontFamily: 'var(--font-nunito), sans-serif',
              fontSize: 12,
              color: MUTED,
              marginTop: 6,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {metaLine}
          </div>
        )}
      </div>
    </button>
  )
}

export default function W5Review({ stations, saving, onSaveAll, onUpdateParsed }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const resolvedCount = stations.filter((s) => s.parsed).length
  const allDone = stations.length > 0 && resolvedCount === stations.length
  const editing = editingId ? stations.find((s) => s.id === editingId) ?? null : null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0a1232',
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '10px 24px 14px', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-russo), sans-serif',
            fontSize: 9,
            letterSpacing: '0.28em',
            color: FAINT,
            textTransform: 'uppercase',
            textAlign: 'right',
            marginBottom: 12,
          }}
        >
          Walkthrough · Review
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              flexShrink: 0,
              animation: !allDone ? 'lbTorchGlow 2.2s ease-in-out infinite' : undefined,
            }}
          >
            <Torch color={ACCENT} size={40} />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-russo), sans-serif',
                fontSize: 20,
                lineHeight: 0.95,
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
                transition: 'opacity 300ms',
              }}
            >
              {allDone ? `Review · ${stations.length} components` : 'Reading your notes…'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-nunito), sans-serif',
                fontSize: 12.5,
                color: MUTED,
                marginTop: 5,
                minHeight: 18,
              }}
            >
              {allDone ? 'Tap a card to edit.' : 'Pulling out titles, durations, and skills.'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stations.map((station) =>
            station.parsed ? (
              <ResolvedCard
                key={station.id}
                station={station}
                onTap={() => setEditingId(station.id)}
              />
            ) : (
              <SkeletonCard key={station.id} />
            ),
          )}
        </div>
      </div>

      <div
        style={{
          padding: '10px 24px 26px',
          borderTop: `1px solid ${HAIRLINE}`,
          flexShrink: 0,
          background: '#0a1232',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: 10,
            fontFamily: 'var(--font-russo), sans-serif',
            fontSize: 9,
            letterSpacing: '0.26em',
            color: FAINT,
            textTransform: 'uppercase',
            opacity: allDone ? 0 : 1,
            transition: 'opacity 600ms ease',
          }}
        >
          Don&apos;t close the app
        </div>
        <button
          type="button"
          onClick={allDone && !saving ? onSaveAll : undefined}
          disabled={!allDone || saving}
          style={{
            width: '100%',
            height: 56,
            background: allDone ? ACCENT : CARD_HI,
            border: allDone ? 'none' : `1px solid ${FAINT}33`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: allDone ? (saving ? 0.7 : 1) : 0.38,
            boxShadow: allDone ? `0 0 32px ${ACCENT}55` : 'none',
            cursor: allDone && !saving ? 'pointer' : 'not-allowed',
            transition: 'background 500ms, opacity 500ms, box-shadow 500ms',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-russo), sans-serif',
              fontSize: 13,
              letterSpacing: '0.22em',
              color: allDone ? '#000' : MUTED,
              textTransform: 'uppercase',
              transition: 'color 500ms',
            }}
          >
            {saving ? 'Saving…' : 'Save all to library'}
          </span>
        </button>
      </div>

      {editing && (
        <EditSheetW
          station={editing}
          onClose={() => setEditingId(null)}
          onSave={(parsed) => {
            onUpdateParsed(editing.id, parsed)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}
