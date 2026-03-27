import type { Metadata, Viewport } from 'next'
import { Russo_One, Nunito } from 'next/font/google'
import './globals.css'
import TabNav from './components/layout/TabNav'

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
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#080c1a',
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
        <div className="max-w-2xl mx-auto px-4 pb-24 pt-4">
          {children}
        </div>
        <TabNav />
      </body>
    </html>
  )
}
