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
        
        await window.liff!.init({ liffId })
        
        // ログインしていない場合はログインページにリダイレクト
        if (!window.liff!.isLoggedIn()) {
          console.log('User not logged in, redirecting to login...')
          window.liff!.login()
          return
        }
        
        console.log('LIFF initialized and user is logged in')
      },
      getUserProfile: async () => {
        if (!window.liff!.isLoggedIn()) {
          throw new Error('User not logged in')
        }
        return await window.liff!.getProfile()
      },
      getAccessToken: () => {
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

    console.log('Attempting to initialize LINE Mini App...')

    // LIFF SDKを使用（開発環境で実際のLINEログインを使用）
    try {
      await loadLiffSDK()
      if (window.liff) {
        console.log('LIFF SDK loaded, creating wrapper...')
        createLiffWrapper()
        
        if (window.lineMiniApp) {
          await window.lineMiniApp.init()
          console.log('LINE Mini App (via LIFF) initialized successfully')
          return true
        }
      }
    } catch (liffError) {
      console.log('LIFF SDK failed, using mock...', liffError)
      
      // LIFF SDK失敗時、開発環境ならモックを使用
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock LINE Mini App for development')
        createMockLineMiniApp()
        if (window.lineMiniApp) {
          await window.lineMiniApp.init()
          return true
        }
      }
    }

    return false
  } catch (error) {
    console.error('Failed to initialize LINE Mini App:', error)
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

export const getLineMiniAppAccessToken = (): string | null => {
  if (typeof window === 'undefined' || !window.lineMiniApp) {
    return null
  }
  
  return window.lineMiniApp.getAccessToken()
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