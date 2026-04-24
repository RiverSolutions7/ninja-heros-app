'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'
import { supabase } from '@/app/lib/supabase'

// ── Design tokens ─────────────────────────────────────────────
const A    = '#ff5a1f'
const BG   = '#0a1232'
const FG   = '#ffffff'
const MUTED = '#8ea0c4'
const DIM   = '#6b7da3'
const FAINT = '#3e4d70'
const HL    = 'rgba(255,255,255,0.08)'
const HLS   = 'rgba(255,255,255,0.14)'
const D     = "var(--font-russo), 'Russo One', system-ui"
const B     = "var(--font-nunito), 'Nunito', system-ui"

// ── Ripple hook ───────────────────────────────────────────────
function useRipple() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  function launch(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now() + Math.random()
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
    setTimeout(() => setRipples(r => r.filter(x => x.id !== id)), 500)
  }
  function nodes(color: string) {
    return ripples.map(r => (
      <span key={r.id} style={{
        position: 'absolute', left: r.x, top: r.y, width: 8, height: 8,
        background: color, borderRadius: '50%',
        transform: 'translate(-50%,-50%)',
        animation: 'ob-ripple 500ms ease-out forwards',
        pointerEvents: 'none', zIndex: 1,
      }} />
    ))
  }
  return { launch, nodes }
}

// ── Torch SVG ─────────────────────────────────────────────────
function FlatTorch({ size = 200, color = A }: { size?: number; color?: string }) {
  const w = size * (96 / 140)
  return (
    <svg width={w} height={size} viewBox="0 0 96 140" style={{ display: 'block' }}>
      <path d="M48 6 C 40 22, 30 30, 30 46 C 30 58, 38 66, 48 66 C 58 66, 66 58, 66 46 C 66 30, 56 22, 48 6 Z" fill={color} />
      <path d="M26 68 L 70 68 L 64 82 L 32 82 Z" fill={color} />
      <rect x="30" y="84" width="36" height="4" fill={color} />
      <rect x="42" y="90" width="12" height="42" fill={color} />
      <rect x="38" y="132" width="20" height="4" fill={color} />
    </svg>
  )
}

// ── Progress chrome ───────────────────────────────────────────
function Chrome({ step, total, label, onBack }: {
  step: number; total: number; label: string; onBack?: () => void
}) {
  return (
    <>
      <div style={{ position: 'absolute', top: 52, left: 28, right: 28, display: 'flex', gap: 4, zIndex: 20 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 2,
            background: i <= step ? A : HL,
            transition: 'background 300ms',
          }} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: 68, left: 28, right: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 }}>
        <div style={{ fontFamily: D, fontSize: 10, letterSpacing: '0.28em', color: FAINT }}>{label}</div>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'transparent', border: 'none', color: MUTED,
            cursor: 'pointer', fontFamily: D, fontSize: 10, letterSpacing: '0.2em', padding: 0,
          }}>← BACK</button>
        )}
      </div>
    </>
  )
}

// ── Button ────────────────────────────────────────────────────
function CleanBtn({ children, onClick, disabled, variant = 'solid', style }: {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  variant?: 'solid' | 'ghost'
  style?: React.CSSProperties
}) {
  const { launch, nodes } = useRipple()
  const [pressed, setPressed] = useState(false)
  const solid = variant === 'solid'
  return (
    <button
      onClick={e => { if (!disabled) { launch(e); onClick?.(e) } }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        width: '100%', height: 56,
        background: solid ? A : 'transparent',
        color: solid ? '#000' : FG,
        border: solid ? 'none' : `1.5px solid ${HLS}`,
        borderRadius: 4,
        fontFamily: D, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'transform 120ms ease, opacity 200ms',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        opacity: disabled ? 0.3 : 1,
        ...style,
      }}
    >
      <span style={{ position: 'relative', zIndex: 2 }}>{children}</span>
      {nodes(solid ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)')}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────
function FlatInput({ label, value, onChange, placeholder, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const filled = !!value
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        fontFamily: D, fontSize: 10, letterSpacing: '0.28em',
        color: focused ? A : DIM, textTransform: 'uppercase',
        transition: 'color 200ms',
      }}>{label}</div>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ''}
        style={{
          width: '100%', background: 'transparent',
          border: 0, borderBottom: `1px solid ${HLS}`,
          padding: '8px 0 12px',
          fontFamily: D, fontSize: 22, color: FG,
          outline: 'none', letterSpacing: '0.02em', textTransform: 'uppercase',
        }}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 1,
        width: (focused || filled) ? '100%' : '0%',
        background: A,
        transition: 'width 360ms cubic-bezier(.22,1,.36,1)',
      }} />
    </div>
  )
}

// ── Step 0: Welcome ───────────────────────────────────────────
function P0Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 52 }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', animation: 'ob-rise-in 900ms 200ms both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <FlatTorch size={64} />
          <div style={{ fontFamily: D, fontSize: 52, letterSpacing: '0.08em', color: A, lineHeight: 1 }}>IGNITE</div>
        </div>
        <div style={{ fontFamily: D, fontSize: 15, letterSpacing: '0.42em', color: FAINT, marginTop: 10 }}>COACH HUB</div>
      </div>

      <div style={{ height: 1, background: HL, margin: '0 28px', animation: 'ob-rise-in 700ms 500ms both' }} />

      <div style={{ padding: '40px 28px 28px', animation: 'ob-rise-in 900ms 600ms both' }}>
        <div style={{ fontFamily: D, fontSize: 48, lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase', color: FG }}>
          Pass the<br />Torch.
        </div>
        <div style={{ fontFamily: B, fontSize: 15, lineHeight: 1.5, color: MUTED, marginTop: 16 }}>
          Great coaching should transfer. Recorded once, handed down.
        </div>
      </div>

      <div style={{ padding: '0 28px 48px', animation: 'ob-rise-in 800ms 800ms both' }}>
        <CleanBtn onClick={onNext}>Get started</CleanBtn>
        <div style={{ textAlign: 'center', marginTop: 18, fontFamily: D, fontSize: 10, letterSpacing: '0.28em', color: FAINT }}>
          RETURNING?{' '}
          <span style={{ color: '#d1d5db', cursor: 'pointer' }}>SIGN IN</span>
        </div>
      </div>
    </div>
  )
}

// ── Step 1: Who ───────────────────────────────────────────────
function P1Who({ onNext, onBack }: { onNext: (name: string, gym: string) => void; onBack: () => void }) {
  const [name, setName] = useState('')
  const [gym, setGym] = useState('')
  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 52 }} />
      <Chrome step={1} total={5} label="CH · 01 / WHO" onBack={onBack} />

      <div style={{ flex: 1, padding: '120px 28px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ animation: 'ob-rise-in 800ms 100ms both' }}>
          <div style={{ fontFamily: D, fontSize: 40, lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase', color: FG }}>
            Stamp<br />your name.
          </div>
          <div style={{ fontFamily: B, fontSize: 14, color: MUTED, marginTop: 14, lineHeight: 1.5 }}>
            Your name goes on every plan. Your gym gives it a home.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 44, animation: 'ob-rise-in 800ms 300ms both' }}>
          <FlatInput label="Coach name" value={name} onChange={setName} placeholder="Your name" autoFocus />
          <FlatInput label="Home gym" value={gym} onChange={setGym} placeholder="Facility name" />
        </div>
      </div>

      <div style={{ padding: '0 28px 48px', animation: 'ob-rise-in 800ms 500ms both' }}>
        <CleanBtn onClick={() => onNext(name.trim(), gym.trim())} disabled={!name.trim()}>Continue</CleanBtn>
      </div>
    </div>
  )
}

// ── Step 2: Access ────────────────────────────────────────────
function AccessTile({ kind, active, onTap }: { kind: 'mic' | 'cam'; active: boolean; onTap: () => void }) {
  const { launch, nodes } = useRipple()
  return (
    <button
      onClick={e => { launch(e); onTap() }}
      style={{
        position: 'relative', overflow: 'hidden',
        flex: 1, aspectRatio: '1 / 1',
        background: 'transparent',
        border: `1.5px solid ${active ? A : HLS}`,
        borderRadius: 4, padding: 18,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start',
        transition: 'border-color 200ms', textAlign: 'left',
      }}
    >
      {kind === 'mic' ? (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? A : FG} strokeWidth="1.5" style={{ transition: 'stroke 200ms' }}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0014 0" strokeLinecap="square" />
          <line x1="12" y1="18" x2="12" y2="21" strokeLinecap="square" />
        </svg>
      ) : (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? A : FG} strokeWidth="1.5" style={{ transition: 'stroke 200ms' }}>
          <path d="M3 7h4l2-2h6l2 2h4v12H3z" strokeLinejoin="miter" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )}
      <div>
        <div style={{ fontFamily: D, fontSize: 12, letterSpacing: '0.2em', color: FG, textTransform: 'uppercase' }}>
          {kind === 'mic' ? 'Microphone' : 'Camera'}
        </div>
        <div style={{ fontFamily: D, fontSize: 10, letterSpacing: '0.2em', color: active ? A : DIM, marginTop: 6, transition: 'color 200ms' }}>
          {active ? '✓  ENABLED' : 'TAP TO ENABLE'}
        </div>
      </div>
      {nodes(`${A}33`)}
    </button>
  )
}

function P2Access({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [granted, setGranted] = useState({ mic: false, cam: false })
  const both = granted.mic && granted.cam

  async function requestMic() {
    if (granted.mic) return
    if (!navigator.mediaDevices) { setGranted(g => ({ ...g, mic: true })); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setGranted(g => ({ ...g, mic: true }))
    } catch { /* denied — stay untoggled */ }
  }

  async function requestCam() {
    if (granted.cam) return
    if (!navigator.mediaDevices) { setGranted(g => ({ ...g, cam: true })); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(t => t.stop())
      setGranted(g => ({ ...g, cam: true }))
    } catch { /* denied */ }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 52 }} />
      <Chrome step={2} total={5} label="CH · 02 / ACCESS" onBack={onBack} />

      <div style={{ flex: 1, padding: '120px 28px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ animation: 'ob-rise-in 800ms 100ms both' }}>
          <div style={{ fontFamily: D, fontSize: 40, lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase', color: FG }}>
            Voice.<br />Eyes.
          </div>
          <div style={{ fontFamily: B, fontSize: 14, color: MUTED, marginTop: 14, lineHeight: 1.5 }}>
            Speak a station while you set it up. Snap what worked. That&apos;s the loop.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 40, animation: 'ob-rise-in 800ms 300ms both' }}>
          <AccessTile kind="mic" active={granted.mic} onTap={requestMic} />
          <AccessTile kind="cam" active={granted.cam} onTap={requestCam} />
        </div>
      </div>

      <div style={{ padding: '0 28px 48px', animation: 'ob-rise-in 800ms 500ms both' }}>
        <CleanBtn onClick={onNext} disabled={!both}>
          {both ? 'Continue' : 'Tap both to enable'}
        </CleanBtn>
      </div>
    </div>
  )
}

// ── Step 3: First Move ────────────────────────────────────────
function FlatDiagram({ drawn }: { drawn: boolean }) {
  return (
    <svg viewBox="0 0 334 90" width="100%" style={{ display: 'block' }}>
      <rect x="1" y="1" width="332" height="88" fill="none" stroke={HLS} strokeWidth="1" />
      {([[28, 22], [306, 22], [28, 68], [306, 68]] as [number, number][]).map(([x, y], i) => (
        <g key={i} style={{ transition: `opacity 300ms ${i * 80}ms`, opacity: drawn ? 1 : 0.35 }}>
          <rect x={x - 5} y={y - 5} width="10" height="10" fill="none" stroke={A} strokeWidth="1.5" />
        </g>
      ))}
      <g style={{ transition: 'opacity 300ms 400ms', opacity: drawn ? 1 : 0.35 }}>
        <line x1="163" y1="40" x2="171" y2="50" stroke={FG} strokeWidth="1.5" />
        <line x1="171" y1="40" x2="163" y2="50" stroke={FG} strokeWidth="1.5" />
      </g>
      <g fill="none" stroke={A} strokeWidth="1.2" strokeLinecap="square"
        strokeDasharray="120" strokeDashoffset={drawn ? 0 : 120}
        style={{ transition: 'stroke-dashoffset 1.4s ease-out' }}>
        <path d="M 38 22 L 158 42" /><path d="M 296 22 L 176 42" />
        <path d="M 38 68 L 158 48" /><path d="M 296 68 L 176 48" />
        <path d="M 152 40 L 158 42 L 152 45" /><path d="M 182 40 L 176 42 L 182 45" />
        <path d="M 152 50 L 158 48 L 152 45" /><path d="M 182 50 L 176 48 L 182 45" />
      </g>
    </svg>
  )
}

function P3First({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { voiceState, startRecording, stopRecording, parseComponent } = useVoiceNote()
  const [parsed, setParsed] = useState<{ title: string; description: string; skills: string[]; durationMinutes: number | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const parsedRef = useRef(false)

  const isRecording = voiceState === 'recording'
  const isProcessing = voiceState === 'processing'
  const isDone = voiceState === 'done'
  const isError = voiceState === 'error'
  const captured = isDone && !!parsed

  useEffect(() => {
    if (voiceState === 'processing' && !parsedRef.current) {
      parsedRef.current = true
      parseComponent('game').then(result => {
        if (result.title) setParsed(result)
      })
    }
    if (voiceState === 'idle') parsedRef.current = false
  }, [voiceState]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!parsed) return
    setSaving(true)
    try {
      await supabase.from('components').insert({
        type: 'game',
        title: parsed.title,
        description: parsed.description,
        skills: parsed.skills,
        duration_minutes: parsed.durationMinutes,
      })
    } catch { /* non-critical */ }
    setSaving(false)
    onNext()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 52 }} />
      <Chrome step={3} total={5} label="CH · 03 / FIRST MOVE" onBack={onBack} />

      <div style={{ flex: 1, padding: '120px 28px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ animation: 'ob-rise-in 800ms 100ms both' }}>
          <div style={{ fontFamily: D, fontSize: 36, lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase', color: FG }}>
            Describe a game<br />you run all<br />the time.
          </div>
          <div style={{ fontFamily: B, fontSize: 14, color: MUTED, marginTop: 14, lineHeight: 1.5 }}>
            Name it. Length. What you yell. We&apos;ll parse the rest.
          </div>
        </div>

        <div style={{ marginTop: 28, animation: 'ob-rise-in 800ms 300ms both' }}>
          <FlatDiagram drawn={voiceState !== 'idle'} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28, animation: 'ob-rise-in 800ms 400ms both' }}>
          <button
            onClick={() => { if (voiceState === 'idle') startRecording(); else if (isRecording) stopRecording() }}
            style={{
              width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
              background: captured ? 'transparent' : A,
              border: captured ? `1.5px solid ${A}` : 'none',
              cursor: (isProcessing || captured) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 300ms',
            }}
          >
            {captured ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth="2">
                <path d="M5 12l4 4L19 7" strokeLinecap="square" />
              </svg>
            ) : isRecording ? (
              <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 22 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ width: 3, background: '#000', animation: `ob-bar 0.7s ${i * 0.1}s ease-in-out infinite alternate` }} />
                ))}
              </div>
            ) : isProcessing ? (
              <div className="animate-spin" style={{ width: 20, height: 20, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%' }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0014 0" strokeLinecap="square" />
              </svg>
            )}
          </button>
          <div style={{ fontFamily: D, fontSize: 10, letterSpacing: '0.24em', color: captured ? A : MUTED, flex: 1 }}>
            {voiceState === 'idle' && 'TAP TO TALK'}
            {isRecording && 'LISTENING · TAP TO STOP'}
            {isProcessing && 'PARSING...'}
            {captured && `CAPTURED · ${parsed!.title.toUpperCase()}`}
            {isError && 'TRY AGAIN'}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 28px 48px', animation: 'ob-rise-in 800ms 500ms both' }}>
        {captured ? (
          <CleanBtn onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save to library'}
          </CleanBtn>
        ) : (
          <button onClick={onNext} style={{
            width: '100%', background: 'transparent', border: 'none',
            fontFamily: D, fontSize: 11, letterSpacing: '0.24em',
            color: FAINT, textTransform: 'uppercase', padding: 16, cursor: 'pointer',
          }}>Skip for now</button>
        )}
      </div>
    </div>
  )
}

// ── Step 4: Ready ─────────────────────────────────────────────
function P4Ready({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 52 }} />
      <Chrome step={4} total={5} label="CH · 04 / READY" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 40, animation: 'ob-rise-in 900ms 200ms both' }}>
        <FlatTorch size={140} />
      </div>

      <div style={{ height: 1, background: A, margin: '0 28px', animation: 'ob-rise-in 700ms 500ms both' }} />

      <div style={{ padding: '40px 28px 28px', animation: 'ob-rise-in 900ms 600ms both' }}>
        <div style={{ fontFamily: D, fontSize: 54, lineHeight: 0.9, letterSpacing: '-0.03em', textTransform: 'uppercase', color: FG }}>
          Let&apos;s<br />coach.
        </div>
        <div style={{ fontFamily: B, fontSize: 15, color: MUTED, marginTop: 16, lineHeight: 1.5 }}>
          Your first class is waiting. Pull from your library, build a plan, run it.
        </div>
      </div>

      <div style={{ padding: '0 28px 48px', animation: 'ob-rise-in 800ms 900ms both' }}>
        <CleanBtn onClick={onEnter}>Enter the gym</CleanBtn>
      </div>
    </div>
  )
}

// ── Flow controller ───────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [prev, setPrev] = useState(0)
  const [coachName, setCoachName] = useState('')
  const [gymName, setGymName] = useState('')

  useEffect(() => {
    if (localStorage.getItem('ninja-coach-profile')) {
      router.replace('/library')
    }
  }, [router])

  function go(n: number) {
    setPrev(step)
    setStep(n)
  }

  function handleWho(name: string, gym: string) {
    setCoachName(name)
    setGymName(gym)
    go(2)
  }

  function handleEnter() {
    localStorage.setItem('ninja-coach-profile', JSON.stringify({ name: coachName, gym: gymName }))
    router.replace('/library')
  }

  const dir = step >= prev ? 1 : -1

  const screens = [
    <P0Welcome key="0" onNext={() => go(1)} />,
    <P1Who     key="1" onNext={handleWho} onBack={() => go(0)} />,
    <P2Access  key="2" onNext={() => go(3)} onBack={() => go(1)} />,
    <P3First   key="3" onNext={() => go(4)} onBack={() => go(2)} />,
    <P4Ready   key="4" onEnter={handleEnter} />,
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 51, background: BG, overflow: 'hidden' }}>
      <div
        key={step}
        style={{
          position: 'absolute', inset: 0,
          animation: 'ob-slide-in-right 500ms cubic-bezier(.22,1,.36,1) both',
          animationDirection: dir < 0 ? 'reverse' : 'normal',
        }}
      >
        {screens[step]}
      </div>
    </div>
  )
}
