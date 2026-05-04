import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-russo)', 'sans-serif'],
        body: ['var(--font-nunito)', 'sans-serif'],
      },
      colors: {
        bg: {
          primary: '#0f1629',
          secondary: '#0f1629',
          card: '#141c32',
          input: '#0b1020',
          border: '#1e2d4a',
        },
        accent: {
          fire: '#ff5a1f',
          orange: '#ff5a1f',
          gold: '#f59e0b',
          green: '#22c55e',
          blue: '#3b82f6',
          purple: '#a855f7',
        },
        text: {
          primary: '#f1f5f9',
          muted: '#94a3b8',
          dim: '#475569',
        },
        log: {
          bg: '#0a1232',
          card: '#0f1734',
          muted: '#8ea0c4',
          dim: '#6b7da3',
          faint: '#3e4d70',
        },
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'glow-fire': '0 0 24px rgba(255, 90, 31, 0.25), 0 4px 12px rgba(255, 90, 31, 0.15)',
        'glow-gold': '0 0 24px rgba(245, 158, 11, 0.25), 0 4px 12px rgba(245, 158, 11, 0.15)',
        'glow-green': '0 0 24px rgba(100, 116, 139, 0.25), 0 4px 12px rgba(100, 116, 139, 0.15)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.5), 0 4px 20px rgba(0, 0, 0, 0.25)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Post-voice field highlight — green ring pulses out then fades.
        // Signals to the coach "this was just filled in" without moving layout.
        'fill-pulse': {
          '0%':   { boxShadow: '0 0 0 0 rgba(255, 90, 31, 0.45)' },
          '40%':  { boxShadow: '0 0 0 6px rgba(255, 90, 31, 0.22)' },
          '100%': { boxShadow: '0 0 0 0 rgba(255, 90, 31, 0)' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'fill-pulse': 'fill-pulse 1.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

export default config
