// LINE Mini App と LIFF の型定義
declare global {
  interface Window {
    lineMiniApp?: LineMiniApp
    liff?: Liff
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

// LIFF SDKの読み込み（開発環境で実際のLINEログインを使用）
export const loadLiffSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.liff) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.async = true
    
    script.onload = () => {
      console.log('LIFF SDK loaded successfully')
      resolve()
    }
    
    script.onerror = (error) => {
      console.error('Failed to load LIFF SDK:', error)
      reject(error)
    }

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
      
      // 24時間以内なら有効
      if (currentTime - authTime < 24 * 60 * 60 * 1000) {
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
    console.log('Creating LIFF wrapper for Mini App compatibility')
    
    window.lineMiniApp = {
      init: async () => {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) {
          throw new Error('LIFF ID not found in environment variables')
        }
        
        console.log('Initializing LIFF with ID:', liffId)
        
        // LIFF初期化を待機
        await window.liff!.init({ liffId })
        console.log('LIFF SDK initialized successfully')
        
        // URLパラメータにLIFFのコードがある場合（リダイレクト後）
        const urlParams = new URLSearchParams(window.location.search)
        const hasLiffCode = urlParams.has('code') && urlParams.has('liffClientId')
        
        if (hasLiffCode) {
          console.log('LIFF redirect detected, cleaning up URL...')
          // URLパラメータをクリーンアップ
          window.history.replaceState({}, document.title, window.location.pathname)
          
          // 少し待ってからログイン状態をチェック（LIFFのトークン交換完了を待つ）
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // 初期化後のログイン状態をチェック
        const isLoggedIn = window.liff!.isLoggedIn()
        console.log('LIFF login status after init:', isLoggedIn)
        
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
      return false
    }

    console.log('=== Starting LINE Mini App initialization ===')

    // LIFF SDKを優先的に使用
    try {
      console.log('Loading LIFF SDK...')
      await loadLiffSDK()
      
      if (window.liff) {
        console.log('LIFF SDK loaded successfully, creating wrapper...')
        createLiffWrapper()
        
        if (window.lineMiniApp) {
          console.log('Initializing LIFF wrapper...')
          await window.lineMiniApp.init()
          console.log('=== LIFF initialization completed ===')
          return true
        } else {
          console.error('Failed to create lineMiniApp wrapper')
        }
      } else {
        console.error('LIFF SDK loaded but window.liff not available')
      }
    } catch (liffError) {
      console.error('LIFF SDK initialization failed:', liffError)
      
      // LIFF SDK失敗時、開発環境ならモックを使用
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock LINE Mini App for development')
        createMockLineMiniApp()
        if (window.lineMiniApp) {
          await window.lineMiniApp.init()
          console.log('=== Mock initialization completed ===')
          return true
        }
      }
    }

    console.error('=== All initialization attempts failed ===')
    return false
  } catch (error) {
    console.error('Critical error in LINE Mini App initialization:', error)
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
    
    if (!isLiffLoggedIn) {
      // LIFFでログアウトしている場合はキャッシュもクリア
      clearAuthState()
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
    console.warn('LINE Mini App: 開発環境でモック使用中 (LINEアプリ外)')
    
    window.lineMiniApp = {
      init: async () => {
        console.log('Mock LINE Mini App initialized')
      },
      getUserProfile: async () => ({
        userId: 'dev-mock-user-' + Math.random().toString(36).substr(2, 9),
        displayName: '開発テストユーザー',
        pictureUrl: 'https://via.placeholder.com/50'
      }),
      getAccessToken: () => 'mock-access-token',
      shareTargetPicker: async () => {
        console.log('Mock share target picker')
        return Promise.resolve()
      },
      ready: async () => {
        console.log('Mock LINE Mini App ready')
      },
      platform: 'mock'
    }
  }
}