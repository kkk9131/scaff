import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scaff Editor',
  description: '2D/3D drawing editor MVP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 日本語コメント: アプリ全体のレイアウトを定義
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
