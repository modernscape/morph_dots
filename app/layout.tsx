import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Point Cloud Morph',
  description: 'GLBモデルの点群モーフィング',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
