'use client'

import { History, Home, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { useSPA } from './SPAContext'

export default function BottomNavigation() {
  const { currentPage, navigate } = useSPA()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-end justify-around h-16 relative">
          {/* 履歴 */}
          <button
            onClick={() => navigate('/history')}
            className={clsx(
              "flex flex-col items-center justify-center w-16 h-full transition-colors",
              currentPage === '/history'
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <History className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">履歴</span>
          </button>

          {/* HOME - 中央の飛び出しボタン */}
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center justify-center -mt-6 relative"
          >
            <div
              className={clsx(
                "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105",
                currentPage === '/'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-400 text-white"
              )}
              style={{
                boxShadow: '0 -4px 20px rgba(59, 130, 246, 0.4)'
              }}
            >
              <Home className="w-7 h-7" />
            </div>
            <span className={clsx(
              "text-xs mt-1 font-medium",
              currentPage === '/' ? "text-blue-600" : "text-gray-500"
            )}>
              HOME
            </span>
          </button>

          {/* 設定 */}
          <button
            onClick={() => navigate('/settings')}
            className={clsx(
              "flex flex-col items-center justify-center w-16 h-full transition-colors",
              currentPage === '/settings'
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">設定</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
