'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { initLineMiniApp, getLineMiniAppProfile, isUserLoggedIn, forceLogin } from '@/lib/liff'
import { Building2 } from 'lucide-react'

interface AuthContextType {
  isAuthenticated: boolean
  userProfile: any
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)

  // デバッグログ追加関数
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    setDebugLogs(prev => [...prev.slice(-9), logMessage]) // 最新10件を保持
    console.log(logMessage)
  }

  // APIルートの場合は認証処理をスキップ
  useEffect(() => {
    // LIFFライブラリのデバッグロガーを設定
    if (typeof window !== 'undefined') {
      window.liffDebugLogger = addDebugLog
      
      const pathname = window.location.pathname
      // APIパスまたはメール認証ページの場合は認証処理を実行しない
      if (pathname.startsWith('/api/') || pathname.startsWith('/verify-email')) {
        addDebugLog(`Auth-skip path detected (${pathname}), skipping auth initialization`)
        setIsLoading(false)
        setIsInitializing(false)
        setIsAuthenticated(true) // 認証不要ページでは認証済みとして扱う
        return
      }
    }
    
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    addDebugLog('=== Starting global authentication ===')
    addDebugLog(`Environment: ${process.env.NODE_ENV}`)
    addDebugLog(`User Agent: ${typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'}`)
    
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') {
      addDebugLog('Server side detected, skipping auth')
      return
    }
    
    // LINEアプリ内かどうかの判定
    const isInLineApp = typeof window !== 'undefined' && 
      (window.navigator.userAgent.includes('Line') || 
       window.location.hostname.includes('line.me') ||
       window.location.search.includes('liff'))
    
    addDebugLog(`Is in LINE app: ${isInLineApp}`)
    
    // 開発環境での処理（LINEアプリ外の場合）
    if (process.env.NODE_ENV === 'development' && !isInLineApp) {
      addDebugLog('🔧 Development mode: Using mock authentication')
      // データベースに存在するユーザーIDを使用
      const mockProfile = {
        userId: 'Uda925faffcc7a7c3e29d546340aeef66',
        displayName: 'Development User'
      }
      setUserProfile(mockProfile)
      setIsAuthenticated(true)
      setIsLoading(false)
      setIsInitializing(false)
      addDebugLog('✅ Development authentication completed')
      return
    }
    
    try {
      // URLパラメータでLIFFリダイレクトを検出
      const urlParams = new URLSearchParams(window.location.search)
      const hasLiffParams = urlParams.has('code') && urlParams.has('liffClientId')
      
      addDebugLog(`URL parameters: ${window.location.search}`)
      addDebugLog(`Has LIFF params: ${hasLiffParams}`)
      
      if (hasLiffParams) {
        addDebugLog('LIFF redirect detected, processing...')
        setIsLoading(true)
        setIsInitializing(true)
      }

      addDebugLog('Initializing LINE Mini App...')
      // LINE Mini App初期化
      const success = await initLineMiniApp()
      if (!success) {
        addDebugLog('❌ Failed to initialize LINE Mini App')
        setIsLoading(false)
        setIsInitializing(false)
        return
      }
      addDebugLog('✅ LINE Mini App initialized successfully')

      // 認証状態をチェック
      await checkAuthStatus(hasLiffParams)
      
    } catch (error) {
      addDebugLog(`❌ Error during auth initialization: ${error}`)
      setIsAuthenticated(false)
      setUserProfile(null)
      setIsLoading(false)
      setIsInitializing(false)
    }
  }

  const checkAuthStatus = async (isRedirect = false) => {
    addDebugLog('=== Checking authentication status ===')
    
    // リダイレクト後の場合は少し待機
    if (isRedirect) {
      addDebugLog('Waiting 2 seconds after redirect...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    try {
      addDebugLog('Checking if user is logged in...')
      if (isUserLoggedIn()) {
        addDebugLog('✅ User is authenticated, getting profile...')
        const profile = await getLineMiniAppProfile()
        
        if (profile) {
          addDebugLog(`✅ Profile loaded: ${profile.displayName}`)
          setUserProfile(profile)
          setIsAuthenticated(true)
          
          // リダイレクト後の場合URLをクリーンアップ
          if (isRedirect && typeof window !== 'undefined') {
            const cleanUrl = window.location.pathname
            window.history.replaceState({}, document.title, cleanUrl)
            addDebugLog('URL cleaned up after redirect')
          }
        } else {
          addDebugLog('❌ Failed to get profile')
          setIsAuthenticated(false)
          setUserProfile(null)
        }
      } else {
        addDebugLog('❌ User not authenticated, attempting automatic login...')
        setIsAuthenticated(false)
        setUserProfile(null)
        
        // 自動的にLINEログインを試行
        try {
          addDebugLog('🔄 Forcing LINE login...')
          await forceLogin()
          addDebugLog('Login redirect initiated')
          return // forceLoginがリダイレクトするのでここで処理終了
        } catch (error) {
          addDebugLog(`❌ Auto-login failed: ${error}`)
        }
      }
    } catch (error) {
      addDebugLog(`❌ Error in checkAuthStatus: ${error}`)
    }
    
    setIsLoading(false)
    setIsInitializing(false)
    addDebugLog('Auth check completed')
  }



  // APIパスの場合は認証処理をスキップして直接childrenを返す
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/api/')) {
    return <>{children}</>
  }

  // 初期化中またはリダイレクト処理中の画面
  if (isInitializing || (isLoading && !isAuthenticated)) {
    // クライアントサイドでのみURLパラメータをチェック
    let hasLiffParams = false
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      hasLiffParams = urlParams.has('code') && urlParams.has('liffClientId')
    }
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {hasLiffParams ? 'ログイン処理中...' : 'LINE Mini App 初期化中...'}
          </p>
        </div>
        
        {/* デバッグパネル */}
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg mb-2 text-sm"
          >
            {showDebug ? 'ログを隠す' : 'デバッグログを表示'} ({debugLogs.length})
          </button>
          
          {showDebug && (
            <div className="bg-black text-green-400 p-4 rounded-lg text-xs font-mono max-h-60 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <div className="text-gray-500">ログはありません</div>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1 break-words">
                    {log}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 未認証の場合のログイン画面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 pt-20">
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">勤太郎</h1>
            <p className="text-gray-600 text-lg">LINE勤怠管理システム</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-4">LINEログイン処理中</h3>
              <p className="text-gray-600">
                自動的にLINEログイン画面に移行します...
              </p>
            </div>
          </div>

          {/* デバッグパネル */}
          <div className="w-full">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg mb-2 text-sm"
            >
              {showDebug ? 'ログを隠す' : 'デバッグログを表示'} ({debugLogs.length})
            </button>
            
            {showDebug && (
              <div className="bg-black text-green-400 p-4 rounded-lg text-xs font-mono max-h-60 overflow-y-auto">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-500">ログはありません</div>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className="mb-1 break-words">
                      {log}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 認証済みの場合、子コンポーネントを表示
  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userProfile,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}