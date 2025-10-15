// LINE Mini App SDK
declare global {
  interface Window {
    lineMiniApp?: {
      init: () => Promise<void>
      getUserProfile: () => Promise<{
        userId: string
        displayName: string
        pictureUrl?: string
      }>
      getAccessToken: () => string | null
      shareTargetPicker: (options: any) => Promise<void>
      ready: () => Promise<void>
      platform: string
    }
  }
}

export interface UserProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

export const initLineMiniApp = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined' || !window.lineMiniApp) {
      console.warn('LINE Mini App SDK not available')
      return false
    }
    
    await window.lineMiniApp.init()
    await window.lineMiniApp.ready()
    return true
  } catch (error) {
    console.error('LINE Mini App initialization failed:', error)
    return false
  }
}

export const getLineMiniAppProfile = async (): Promise<UserProfile | null> => {
  try {
    if (typeof window === 'undefined' || !window.lineMiniApp) {
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

// デバッグ用：開発環境でのモック
export const createMockLineMiniApp = () => {
  if (typeof window !== 'undefined' && !window.lineMiniApp) {
    window.lineMiniApp = {
      init: async () => {
        console.log('Mock LINE Mini App initialized')
      },
      getUserProfile: async () => ({
        userId: 'mock-user-id-' + Math.random().toString(36).substr(2, 9),
        displayName: 'テストユーザー',
        pictureUrl: 'https://via.placeholder.com/50'
      }),
      getAccessToken: () => 'mock-access-token',
      shareTargetPicker: async () => {
        console.log('Mock share target picker')
      },
      ready: async () => {
        console.log('Mock LINE Mini App ready')
      },
      platform: 'web'
    }
  }
}