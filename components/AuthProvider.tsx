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

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    console.log('=== Starting global authentication ===')
    
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      // URLパラメータでLIFFリダイレクトを検出
      const urlParams = new URLSearchParams(window.location.search)
      const hasLiffParams = urlParams.has('code') && urlParams.has('liffClientId')
      
      if (hasLiffParams) {
        console.log('LIFF redirect detected, processing...')
        setIsLoading(true)
        setIsInitializing(true)
      }

      // LINE Mini App初期化
      const success = await initLineMiniApp()
      if (!success) {
        console.error('Failed to initialize LINE Mini App')
        setIsLoading(false)
        setIsInitializing(false)
        return
      }

      // 認証状態をチェック
      await checkAuthStatus(hasLiffParams)
      
    } catch (error) {
      console.error('Error during auth initialization:', error)
      setIsAuthenticated(false)
      setUserProfile(null)
      setIsLoading(false)
      setIsInitializing(false)
    }
  }

  const checkAuthStatus = async (isRedirect = false) => {
    console.log('=== Checking authentication status ===')
    
    // リダイレクト後の場合は少し待機
    if (isRedirect) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    if (isUserLoggedIn()) {
      console.log('User is authenticated, getting profile...')
      const profile = await getLineMiniAppProfile()
      
      if (profile) {
        console.log('Profile loaded:', profile.displayName)
        setUserProfile(profile)
        setIsAuthenticated(true)
        
        // リダイレクト後の場合URLをクリーンアップ
        if (isRedirect && typeof window !== 'undefined') {
          const cleanUrl = window.location.pathname
          window.history.replaceState({}, document.title, cleanUrl)
        }
      } else {
        console.log('Failed to get profile')
        setIsAuthenticated(false)
        setUserProfile(null)
      }
    } else {
      console.log('User not authenticated, attempting automatic login...')
      setIsAuthenticated(false)
      setUserProfile(null)
      
      // 自動的にLINEログインを試行
      try {
        console.log('Forcing LINE login...')
        await forceLogin()
        return // forceLoginがリダイレクトするのでここで処理終了
      } catch (error) {
        console.error('Auto-login failed:', error)
      }
    }
    
    setIsLoading(false)
    setIsInitializing(false)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {hasLiffParams ? 'ログイン処理中...' : 'LINE Mini App 初期化中...'}
          </p>
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
            <h1 className="text-4xl font-bold text-gray-800 mb-2">勤怠太郎</h1>
            <p className="text-gray-600 text-lg">LINE勤怠管理システム</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-4">LINEログイン処理中</h3>
              <p className="text-gray-600">
                自動的にLINEログイン画面に移行します...
              </p>
            </div>
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