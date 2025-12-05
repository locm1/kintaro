'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import BottomNavigation from './BottomNavigation'
import { useSPA } from './SPAContext'

// 動的にページコンポーネントをインポート（プリロード用）
const HomePage = dynamic(() => import('@/components/pages/HomeContent'), { ssr: false })
const HistoryPage = dynamic(() => import('@/components/pages/HistoryContent'), { ssr: false })
const SettingsPage = dynamic(() => import('@/components/pages/SettingsContent'), { ssr: false })
const RequestsPage = dynamic(() => import('@/components/pages/RequestsContent'), { ssr: false })

// プリロード用
const preloadPages = () => {
  import('@/components/pages/HomeContent')
  import('@/components/pages/HistoryContent')
  import('@/components/pages/SettingsContent')
  import('@/components/pages/RequestsContent')
}

export default function SPALayout() {
  const { currentPage, isReady } = useSPA()
  const [pagesLoaded, setPagesLoaded] = useState(false)

  // 初回マウント時に全ページをプリロード
  useEffect(() => {
    preloadPages()
    setPagesLoaded(true)
  }, [])

  if (!isReady || !pagesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="pb-16">
        {/* 全ページを常にマウントし、表示/非表示を切り替え */}
        <div style={{ display: currentPage === '/' ? 'block' : 'none' }}>
          <HomePage />
        </div>
        <div style={{ display: currentPage === '/history' ? 'block' : 'none' }}>
          <HistoryPage />
        </div>
        <div style={{ display: currentPage === '/settings' ? 'block' : 'none' }}>
          <SettingsPage />
        </div>
        <div style={{ display: currentPage === '/requests' ? 'block' : 'none' }}>
          <RequestsPage />
        </div>
      </main>
      <BottomNavigation />
    </>
  )
}
