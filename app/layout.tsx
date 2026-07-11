import type { Metadata, Viewport } from 'next'
import { Russo_One, Nunito } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import TabNav from './components/layout/TabNav'
import DevErrorForwarder from './components/DevErrorForwarder'
import { ToastProvider } from './components/ui/Toast'

const russoOne = Russo_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-russo',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ninja H.E.R.O.S. Coach Hub',
  description: 'Class planning and skill tracking for Just Tumble Ninja H.E.R.O.S. coaches',
  // CHUNK 11 ①(c): let iOS launch the Add-to-Home-Screen instance standalone (no Safari URL/tool bars,
  // which is what pushed the URL pill over the keyboard while typing). Pairs with app/manifest.ts.
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Coach Hub',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f1629',
  // CHUNK 11 ③: opt the page into the safe area so env(safe-area-inset-*) resolves to real notch/
  // home-indicator insets on iOS — without this the PhotoViewer ✕'s safe-area max() collapses to the
  // bare 46/12 baseline and the notch collision returns.
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${russoOne.variable} ${nunito.variable}`}
    >
      <body className="bg-bg-primary font-body text-text-primary min-h-screen">
        {process.env.NODE_ENV !== 'production' && <DevErrorForwarder />}
        <ToastProvider>
          <div className="max-w-2xl mx-auto px-4 pb-28 pt-4">
            {children}
          </div>
          <Suspense fallback={null}><TabNav /></Suspense>
        </ToastProvider>
      </body>
    </html>
  )
}
