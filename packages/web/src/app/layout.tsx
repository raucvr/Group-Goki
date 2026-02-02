import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Group Goki - AI Agent Group Chat',
  description: 'Your MBB consulting team + FAANG tech team: Helping you build your own Fortune 500 company.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
