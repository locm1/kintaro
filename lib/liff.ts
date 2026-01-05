// LINE Mini App と LIFF の型定義
declare global {
  interface Window {
    lineMiniApp?: LineMiniApp
    liff?: Liff
    liffDebugLogger?: (message: string) => void
  }
}

interface LineMiniApp {
  init(): Promise<void>
  getUserProfile(): Promise<{
    userId: string
    displayName: string
    pictureUrl?: string
  }>
  getAccessToken(): string | null
  shareTargetPicker(options?: any): Promise<any>
  ready(): Promise<void>
  platform: string
}

interface Liff {
  init(config: { liffId: string }): Promise<void>
  isLoggedIn(): boolean
  login(): void
  logout(): void
  getProfile(): Promise<{
    userId: string
    displayName: string
    pictureUrl?: string
  }>
  getAccessToken(): string | null
}

// ログ関数のヘルパー
const debugLog = (message: string) => {
  console.log(message)
  if (typeof window !== 'undefined' && window.liffDebugLogger) {
    window.liffDebugLogger(message)
  }
}

// LIFF SDKの読み込み（開発環境で実際のLINEログインを使用）
export const loadLiffSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.liff) {
      debugLog('✅ LIFF SDK already loaded')
      resolve()
      return
    }

    debugLog('📥 Creating LIFF SDK script element')
    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.async = true
    
    script.onload = () => {
      debugLog('✅ LIFF SDK script loaded successfully')
      debugLog(`window.liff available: ${!!window.liff}`)
      resolve()
    }
    
    script.onerror = (error) => {
      debugLog(`❌ Failed to load LIFF SDK: ${error}`)
      reject(error)
    }

    debugLog('🌐 Appending LIFF SDK script to document head')
    document.head.appendChild(script)
  })
}

// 認証状態をローカルストレージに保存
const saveAuthState = (profile: any, accessToken: string | null) => {
  if (typeof window !== 'undefined') {
    console.log('=== Saving auth state ===')
    console.log('Profile:', profile)
    console.log('Has access token:', !!accessToken)
    
    try {
      localStorage.setItem('line_auth_profile', JSON.stringify(profile))
      if (accessToken) {
        localStorage.setItem('line_auth_token', accessToken)
      }
      localStorage.setItem('line_auth_timestamp', Date.now().toString())
      
      console.log('Auth state saved successfully')
      
      // 保存後に確認
      console.log('Verification - stored profile:', localStorage.getItem('line_auth_profile'))
    } catch (error) {
      console.error('Error saving auth state:', error)
    }
  }
}

// 認証状態をローカルストレージから復元
const loadAuthState = () => {
  if (typeof window === 'undefined') return null
  
  try {
    const profile = localStorage.getItem('line_auth_profile')
    const token = localStorage.getItem('line_auth_token')
    const timestamp = localStorage.getItem('line_auth_timestamp')
    
    console.log('Loading auth state:', { hasProfile: !!profile, hasToken: !!token, timestamp })
    
    if (profile && timestamp) {
      const authTime = parseInt(timestamp)
      const currentTime = Date.now()
      
      // 2時間以内なら有効（24時間から短縮）
      if (currentTime - authTime < 2 * 60 * 60 * 1000) {
        const authState = {
          profile: JSON.parse(profile),
          token: token,
          timestamp: authTime
        }
        console.log('Valid auth state found:', authState)
        return authState
      } else {
        console.log('Auth state expired, clearing...')
        clearAuthState()
      }
    }
  } catch (error) {
    console.error('Error loading auth state:', error)
  }
  
  return null
}

// 認証状態をクリア
const clearAuthState = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('line_auth_profile')
    localStorage.removeItem('line_auth_token')
    localStorage.removeItem('line_auth_timestamp')
  }
}

// LIFF SDKをMini App風にラップする関数
const createLiffWrapper = () => {
  if (typeof window !== 'undefined' && window.liff && !window.lineMiniApp) {
    debugLog('🔧 Creating LIFF wrapper for Mini App compatibility')
    
    window.lineMiniApp = {
      init: async () => {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) {
          debugLog('❌ LIFF ID not found in environment variables')
          throw new Error('LIFF ID not found in environment variables')
        }
        
        debugLog(`🆔 Initializing LIFF with ID: ${liffId}`)
        
        // LIFF初期化を待機
        try {
          await window.liff!.init({ liffId })
          debugLog('✅ LIFF SDK initialized successfully')
        } catch (initError) {
          debugLog(`❌ LIFF init failed: ${initError}`)
          throw initError
        }
        
        // URLパラメータにLIFFのコードがある場合（リダイレクト後）
        const urlParams = new URLSearchParams(window.location.search)
        const hasLiffCode = urlParams.has('code') && urlParams.has('liffClientId')
        
        debugLog(`🔍 URL search params: ${window.location.search}`)
        debugLog(`📋 Has LIFF redirect code: ${hasLiffCode}`)
        
        if (hasLiffCode) {
          debugLog('🔄 LIFF redirect detected, cleaning up URL...')
          // URLパラメータをクリーンアップ
          window.history.replaceState({}, document.title, window.location.pathname)
          
          // 少し待ってからログイン状態をチェック（LIFFのトークン交換完了を待つ）
          debugLog('⏳ Waiting 1 second for token exchange...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // 初期化後のログイン状態をチェック
        const isLoggedIn = window.liff!.isLoggedIn()
        debugLog(`🔐 LIFF login status after init: ${isLoggedIn}`)
        
        if (isLoggedIn) {
          console.log('User is logged in to LIFF')
          
          // ログイン済みの場合、認証状態を保存
          try {
            console.log('Getting user profile...')
            const profile = await window.liff!.getProfile()
            const accessToken = window.liff!.getAccessToken()
            
            console.log('Profile retrieved:', profile)
            saveAuthState(profile, accessToken)
            console.log('Auth state saved successfully for:', profile.displayName)
            
            // リダイレクト後の場合はページをリロードして最新状態を反映
            if (hasLiffCode) {
              console.log('Reloading page to reflect login state...')
              window.location.reload()
              return
            }
          } catch (error) {
            console.error('Error getting profile for logged in user:', error)
          }
        } else {
          console.log('User is not logged in to LIFF')
          clearAuthState()
        }
      },
      getUserProfile: async () => {
        // まず保存された認証状態をチェック
        const savedAuth = loadAuthState()
        if (savedAuth && savedAuth.profile) {
          console.log('Using cached profile')
          return savedAuth.profile
        }
        
        // LIFFから直接取得
        if (!window.liff!.isLoggedIn()) {
          throw new Error('User not logged in')
        }
        
        const profile = await window.liff!.getProfile()
        // 取得したプロファイルを保存
        const accessToken = window.liff!.getAccessToken()
        saveAuthState(profile, accessToken)
        
        return profile
      },
      getAccessToken: () => {
        // 保存されたトークンをチェック
        const savedAuth = loadAuthState()
        if (savedAuth && savedAuth.token) {
          return savedAuth.token
        }
        
        return window.liff!.getAccessToken()
      },
      shareTargetPicker: async (options?: any) => {
        console.log('Share target picker not available in LIFF')
        return Promise.resolve()
      },
      ready: async () => {
        console.log('LIFF wrapper ready')
      },
      platform: 'liff'
    }
  }
}

// 統合初期化関数
export const initLineMiniApp = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      debugLog('❌ Window is undefined, cannot initialize')
      return false
    }

    debugLog('=== Starting LINE Mini App initialization ===')
    debugLog(`Environment: ${process.env.NODE_ENV}`)
    debugLog(`LIFF ID: ${process.env.NEXT_PUBLIC_LIFF_ID}`)

    // LIFF SDKを優先的に使用
    try {
      debugLog('📡 Loading LIFF SDK...')
      await loadLiffSDK()
      debugLog('✅ LIFF SDK load completed')
      
      if (window.liff) {
        debugLog('🔧 LIFF SDK loaded successfully, creating wrapper...')
        createLiffWrapper()
        
        if (window.lineMiniApp) {
          debugLog('🚀 Initializing LIFF wrapper...')
          await window.lineMiniApp.init()
          debugLog('✅ LIFF initialization completed successfully')
          return true
        } else {
          debugLog('❌ Failed to create lineMiniApp wrapper')
        }
      } else {
        debugLog('❌ LIFF SDK loaded but window.liff not available')
      }
    } catch (liffError) {
      debugLog(`❌ LIFF SDK initialization failed: ${liffError}`)
      debugLog(`Error details: ${liffError instanceof Error ? liffError.message : String(liffError)}`)
      
      // LIFF SDK失敗時、開発環境ならモックを使用
      if (process.env.NODE_ENV === 'development') {
        debugLog('🔄 Falling back to mock LINE Mini App for development')
        createMockLineMiniApp()
        if (window.lineMiniApp) {
          await window.lineMiniApp.init()
          debugLog('✅ Mock initialization completed')
          return true
        } else {
          debugLog('❌ Failed to create mock LineMiniApp')
        }
      }
    }

    debugLog('❌ All initialization attempts failed')
    return false
  } catch (error) {
    debugLog(`❌ Critical error in LINE Mini App initialization: ${error}`)
    debugLog(`Critical error details: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

export const getLineMiniAppProfile = async () => {
  try {
    if (typeof window === 'undefined' || !window.lineMiniApp) {
      console.error('LINE Mini App not available')
      return null
    }

    const profile = await window.lineMiniApp.getUserProfile()
    return profile
  } catch (error) {
    console.error('Failed to get LINE Mini App profile:', error)
    return null
  }
}

export const isLineMiniAppAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.lineMiniApp
}

export const isUserLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false
  
  // LIFF SDK が利用可能で初期化済みの場合、その状態を信頼
  if (window.liff) {
    const isLiffLoggedIn = window.liff.isLoggedIn()
    console.log('LIFF login status:', isLiffLoggedIn)
    
    // LIFFの状態とキャッシュを同期
    const savedAuth = loadAuthState()
    
    if (!isLiffLoggedIn) {
      // LIFFでログアウトしている場合はキャッシュもクリア
      if (savedAuth) {
        console.log('LIFF logged out but cache exists, clearing cache')
        clearAuthState()
      }
      return false
    }
    
    // LIFFでログイン済みだがキャッシュがない場合は再取得
    if (isLiffLoggedIn && !savedAuth) {
      console.log('LIFF logged in but no cache, need to refresh profile')
      // プロファイルを非同期で取得してキャッシュ（バックグラウンドで実行）
      window.liff.getProfile().then(profile => {
        const accessToken = window.liff!.getAccessToken()
        saveAuthState(profile, accessToken)
        console.log('Profile refreshed and cached')
      }).catch(error => {
        console.error('Failed to refresh profile:', error)
      })
    }
    
    return isLiffLoggedIn
  }
  
  // LIFF未初期化の場合は保存された認証状態をチェック
  const savedAuth = loadAuthState()
  const hasSavedAuth = !!savedAuth
  console.log('Has saved auth (LIFF not initialized):', hasSavedAuth)
  
  return hasSavedAuth
}

// 強制ログイン関数を追加
export const forceLogin = async (): Promise<void> => {
  if (typeof window !== 'undefined' && window.liff) {
    console.log('Starting LIFF login process...')
    clearAuthState()
    
    // 現在のログイン状態を確認
    if (window.liff.isLoggedIn()) {
      console.log('Already logged in, getting fresh profile...')
      try {
        const profile = await window.liff.getProfile()
        const accessToken = window.liff.getAccessToken()
        saveAuthState(profile, accessToken)
        console.log('Fresh auth state saved')
        
        // ページをリロードして最新の状態を反映
        window.location.reload()
        return
      } catch (error) {
        console.error('Error getting fresh profile:', error)
        // エラーの場合はログアウトしてから再ログイン
        window.liff.logout()
      }
    }
    
    // ログインしていない場合はログインページにリダイレクト
    console.log('Redirecting to LIFF login...')
    console.log('Current URL for redirect:', window.location.href)
    
    // リダイレクト先を現在のページに設定してログイン
    window.liff.login()
  } else {
    console.error('LIFF SDK not available for login')
  }
}

export const getLineMiniAppAccessToken = (): string | null => {
  if (typeof window === 'undefined' || !window.lineMiniApp) {
    return null
  }
  
  return window.lineMiniApp.getAccessToken()
}

export const logoutLineMiniApp = () => {
  clearAuthState()
  
  if (typeof window !== 'undefined' && window.liff && window.liff.isLoggedIn()) {
    window.liff.logout()
  }
  
  // ページをリロードして初期状態に戻す
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

// デバッグ用：開発環境でのモック（LINEアプリ外でのテスト用）
export const createMockLineMiniApp = () => {
  if (typeof window !== 'undefined' && !window.lineMiniApp) {
    debugLog('⚠️ Creating mock LINE Mini App for development (outside LINE app)')
    
    window.lineMiniApp = {
      init: async () => {
        debugLog('✅ Mock LINE Mini App initialized')
      },
      getUserProfile: async () => {
        const mockProfile = {
          userId: 'dev-mock-user-' + Math.random().toString(36).substr(2, 9),
          displayName: '開発テストユーザー',
          pictureUrl: 'https://via.placeholder.com/50'
        }
        debugLog(`👤 Mock profile created: ${mockProfile.displayName}`)
        return mockProfile
      },
      getAccessToken: () => {
        debugLog('🔑 Returning mock access token')
        return 'mock-access-token'
      },
      shareTargetPicker: async () => {
        debugLog('📤 Mock share target picker called')
        return Promise.resolve()
      },
      ready: async () => {
        debugLog('✅ Mock LINE Mini App ready')
      },
      platform: 'mock'
    }
    debugLog('✅ Mock LINE Mini App wrapper created successfully')
  } else if (typeof window !== 'undefined' && window.lineMiniApp) {
    debugLog('ℹ️ LineMiniApp already exists, skipping mock creation')
  } else {
    debugLog('❌ Cannot create mock - window is undefined')
  }
}