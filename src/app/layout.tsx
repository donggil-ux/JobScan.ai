import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JDSite — 5년차 이상 프로덕트 디자이너 채용',
  description: '주요 플랫폼의 5년차 이상 프로덕트 디자이너 채용 공고를 한곳에서. AI가 내 경력에 맞는 포지션을 추천합니다.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
