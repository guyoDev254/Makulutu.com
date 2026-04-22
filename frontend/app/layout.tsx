import type { Metadata, Viewport } from 'next'
import { Bungee, Inter } from 'next/font/google'
import './globals.css'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site-brand'

const inter = Inter({ subsets: ['latin'] })

const bungee = Bungee({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bungee',
})

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  icons: {
    icon: '/makulutu-logo.png',
    apple: '/makulutu-logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#111827' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={bungee.variable}>
      <body className={`${inter.className} min-h-dvh overflow-x-hidden antialiased`}>
        {children}
      </body>
    </html>
  )
}
