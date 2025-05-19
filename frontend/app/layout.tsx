import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Reviewer Generator',
  description: 'Created by John Andrei Lapid',
  generator: 'John Andrei Lapid',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
