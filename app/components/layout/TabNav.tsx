'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const tabs = [
  {
    href: '/library',
    label: 'Library',
    icon: () => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
      </svg>
    ),
  },
  {
    href: '/plan',
    label: 'Today',
    icon: () => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.25 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.75 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM10.5 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM12.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM14.25 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 13.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
        <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: () => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.757 17.834a.75.75 0 10-1.061-1.06l-1.59 1.59a.75.75 0 001.06 1.061l1.591-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 7.106a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
      </svg>
    ),
  },
]

export default function TabNav() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const choiceOpen = searchParams.get('choice') === 'open'

  function handleFab() {
    if (choiceOpen) {
      router.replace('/library')
    } else if (pathname === '/library' || pathname.startsWith('/library/')) {
      router.push('/library?choice=open')
    } else {
      router.push('/library/log-component')
    }
  }

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
              background: 'rgba(20,28,50,0.92)',
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
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-200 min-h-0 ${
                    active
                      ? 'bg-accent-fire/[0.13] text-accent-fire'
                      : 'text-text-dim hover:text-text-muted'
                  }`}
                >
                  {tab.icon()}
                  {active && (
                    <span className="text-[11px] font-heading tracking-wide">
                      {tab.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* FAB — + morphs to × when choice overlay is open */}
          <button
            type="button"
            onClick={handleFab}
            className="w-14 h-14 rounded-full bg-accent-fire flex items-center justify-center shadow-glow-fire active:scale-95 transition-transform min-h-0"
          >
            <svg
              className={`w-6 h-6 text-white transition-transform duration-200 ease-in-out ${choiceOpen ? 'rotate-45' : 'rotate-0'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>

        </div>
      </div>
    </nav>
  )
}
