'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { History, Home, Settings } from 'lucide-react'
import { clsx } from 'clsx'

export default function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-end justify-around h-16 relative">
          {/* 履歴 */}
          <Link
            href="/history"
            className={clsx(
              "flex flex-col items-center justify-center w-16 h-full transition-colors",
              pathname === '/history'
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <History className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">履歴</span>
          </Link>

          {/* HOME - 中央の飛び出しボタン */}
          <Link
            href="/"
            className="flex flex-col items-center justify-center -mt-6 relative"
          >
            <div
              className={clsx(
                "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105",
                pathname === '/'
                  ? "bg-blue-600 text-white"
                  : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
              )}
              style={{
                boxShadow: '0 -4px 20px rgba(59, 130, 246, 0.4)'
              }}
            >
              <Home className="w-7 h-7" />
            </div>
            <span className={clsx(
              "text-xs mt-1 font-medium",
              pathname === '/' ? "text-blue-600" : "text-gray-500"
            )}>
              HOME
            </span>
          </Link>

          {/* 設定 */}
          <Link
            href="/settings"
            className={clsx(
              "flex flex-col items-center justify-center w-16 h-full transition-colors",
              pathname === '/settings'
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">設定</span>
          </Link>
        </div>
      </div>

      {/* 背景の半円カットアウト効果 */}
      <div className="absolute bottom-0 left-0 right-0 h-full pointer-events-none overflow-hidden -z-10">
        <div className="max-w-md mx-auto relative h-full">
          <div 
            className="absolute left-1/2 -translate-x-1/2 -top-4 w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full"
            style={{
              boxShadow: '0 0 0 20px white'
            }}
          />
        </div>
      </div>
    </nav>
  )
}
