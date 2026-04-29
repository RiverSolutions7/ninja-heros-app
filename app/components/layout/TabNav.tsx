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
    href: '/plan',
    label: 'Today',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function TabNav() {
  const pathname = usePathname()

  // Hide nav on public share pages
  if (pathname.startsWith('/class/')) return null
  // Hide nav on shared plan view (but not the main /plan tab)
  if (/^\/plan\/[^/]+/.test(pathname)) return null

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
      <div
        className="max-w-2xl mx-auto flex justify-center items-end px-6"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="pointer-events-auto flex items-center gap-3">

          {/* Floating pill */}
          <div
            className="flex items-center rounded-full px-1.5 py-1.5 gap-0.5"
            style={{
              background: 'rgba(15,22,41,0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            {tabs.map((tab) => {
              const active =
                pathname === tab.href || pathname.startsWith(tab.href + '/')
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 min-h-0 ${
                    active
                      ? 'bg-accent-fire/[0.13] text-accent-fire'
                      : 'text-text-dim hover:text-text-muted'
                  }`}
                >
                  {tab.icon(active)}
                  {active && (
                    <span className="text-[11px] font-heading tracking-wide">
                      {tab.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* FAB */}
          <Link
            href="/library/log-component"
            className="w-14 h-14 rounded-full bg-accent-fire flex items-center justify-center shadow-glow-fire active:scale-95 transition-transform min-h-0"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </Link>

        </div>
      </div>
    </nav>
  )
}
