import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LoL Friends Leaderboard · EUW',
  description: 'Track your League of Legends ranked progress with friends on EUW',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
