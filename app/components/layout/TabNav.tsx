'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/library',
    label: 'Library',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    href: '/skills',
    label: 'Skills',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: '/handoff',
    label: 'Handoff',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function TabNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 glass safe-area-pb">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex-1 flex flex-col items-center justify-center py-4 gap-1 transition-all duration-200 ${
                active ? 'text-accent-fire' : 'text-text-dim hover:text-text-muted'
              }`}
            >
              {/* Active indicator — fire line at top of tab */}
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-accent-fire transition-all duration-300 ${
                  active ? 'w-8 opacity-100' : 'w-0 opacity-0'
                }`}
              />
              {tab.icon(active)}
              <span className={`text-xs font-heading tracking-wide transition-colors duration-200 ${
                active ? 'text-accent-fire' : 'text-text-dim'
              }`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
