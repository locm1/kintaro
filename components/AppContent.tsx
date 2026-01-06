'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { SPAProvider } from './SPAContext'
import SPALayout from './SPALayout'

interface AppContentProps {
  children: ReactNode
}

// SPA以外のパス（これらは通常のNext.jsルーティングを使用）
const NON_SPA_PATHS = ['/link', '/share', '/verify-email']

export default function AppContent({ children }: AppContentProps) {
  const pathname = usePathname()
  
  // 現在のパスがSPA以外のパスかどうかチェック
  const isNonSPAPath = NON_SPA_PATHS.some(path => pathname?.startsWith(path))
  
  // SPA以外のパスの場合は通常のレンダリング
  if (isNonSPAPath) {
    return <main>{children}</main>
  }
  
  // SPAページの場合はSPALayoutを使用
  return (
    <SPAProvider>
      <SPALayout />
    </SPAProvider>
  )
}
