import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Glyph — A calm workspace for developers building with AI',
  description: 'A 3-panel macOS workspace for solo developers building with AI coding agents. Editor, terminal, and browser — all in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-zinc-950 text-zinc-100">
      <body>{children}</body>
    </html>
  )
}
