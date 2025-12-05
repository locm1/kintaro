'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type Page = '/' | '/history' | '/settings' | '/requests' | '/link'

interface SPAContextType {
  currentPage: Page
  navigate: (page: Page) => void
  isReady: boolean
}

const SPAContext = createContext<SPAContextType | null>(null)

export function SPAProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [currentPage, setCurrentPage] = useState<Page>('/')
  const [isReady, setIsReady] = useState(false)

  // 初期化時にURLからページを決定
  useEffect(() => {
    if (pathname) {
      if (pathname === '/history') {
        setCurrentPage('/history')
      } else if (pathname === '/settings') {
        setCurrentPage('/settings')
      } else if (pathname === '/requests') {
        setCurrentPage('/requests')
      } else if (pathname === '/link') {
        setCurrentPage('/link')
      } else {
        setCurrentPage('/')
      }
      setIsReady(true)
    }
  }, [pathname])

  // ナビゲーション関数
  const navigate = useCallback((page: Page) => {
    setCurrentPage(page)
    // URLも更新（履歴をプッシュ）
    window.history.pushState({}, '', page)
  }, [])

  // ブラウザの戻る/進む対応
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname as Page
      if (['/history', '/settings', '/requests', '/link', '/'].includes(path)) {
        setCurrentPage(path as Page)
      } else {
        setCurrentPage('/')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <SPAContext.Provider value={{ currentPage, navigate, isReady }}>
      {children}
    </SPAContext.Provider>
  )
}

export function useSPA() {
  const context = useContext(SPAContext)
  if (!context) {
    throw new Error('useSPA must be used within a SPAProvider')
  }
  return context
}
