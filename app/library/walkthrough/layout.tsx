import { WalkthroughProvider } from '@/app/components/walkthrough/WalkthroughContext'

const KEYFRAMES = `
@keyframes lbRiseIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
@keyframes lbFadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes lbSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
@keyframes lbPulseRing { from { transform: scale(1); opacity: 0.8 } to { transform: scale(1.7); opacity: 0 } }
@keyframes lbWave { from { transform: scaleY(0.4) } to { transform: scaleY(1.2) } }
@keyframes lbFlicker { 0%, 100% { opacity: 1; transform: scale(1) } 45% { opacity: 0.85; transform: scale(0.985) } 55% { opacity: 1; transform: scale(1.005) } }
@keyframes lbSlideIn { from { opacity: 0; transform: translateX(18px) scale(0.82) } to { opacity: 1; transform: translateX(0) scale(1) } }
@keyframes lbTorchIn { from { opacity: 0; transform: translateY(28px) scale(0.9) } to { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes lbLineGrow { from { width: 0%; opacity: 0 } to { width: 60%; opacity: 1 } }
@keyframes lbBlink { 0%, 100% { opacity: 1 } 50% { opacity: 0.2 } }
@keyframes lbShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
@keyframes lbTorchGlow { 0%, 100% { opacity: 1; transform: scale(1) } 50% { opacity: 0.72; transform: scale(0.93) } }
`

export default function WalkthroughLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalkthroughProvider>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0a1232',
          zIndex: 50,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </WalkthroughProvider>
  )
}
