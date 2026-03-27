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
          primary: '#080c1a',
          secondary: '#0f1629',
          card: '#141c32',
          input: '#0b1020',
          border: '#1e2d4a',
        },
        accent: {
          fire: '#e84040',
          orange: '#f97316',
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
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'glow-fire': '0 0 24px rgba(232, 64, 64, 0.25), 0 4px 12px rgba(232, 64, 64, 0.15)',
        'glow-gold': '0 0 24px rgba(245, 158, 11, 0.25), 0 4px 12px rgba(245, 158, 11, 0.15)',
        'glow-green': '0 0 24px rgba(34, 197, 94, 0.25), 0 4px 12px rgba(34, 197, 94, 0.15)',
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
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

export default config
