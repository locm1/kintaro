'use client'

import { useState, useEffect } from 'react'
import { Clock, Coffee, Users, Share2, Copy, Check, ExternalLink, Trash2, History, ClipboardList } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'

interface User {
  id: string
  companyId: string
  isAdmin: boolean
  company: {
    id: string
    name: string
  }
}

interface AttendanceRecord {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
  status: string
  user_companies?: {
    users?: {
      email: string
    }
  }
}

export default function AttendancePage() {
  const { isAuthenticated, userProfile, isLoading: authLoading } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPageLoading, setIsPageLoading] = useState(true) // ページ全体のローディング状態
  const [message, setMessage] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareMonth, setShareMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  })
  const [isCreatingShare, setIsCreatingShare] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [existingShares, setExistingShares] = useState<any[]>([])
  const [isLoadingShares, setIsLoadingShares] = useState(false)
  // 管理者用：社員共有リンク管理
  const [showAdminShareModal, setShowAdminShareModal] = useState(false)
  const [companyUsers, setCompanyUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [adminShareMonth, setAdminShareMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  })
  const [allCompanyShares, setAllCompanyShares] = useState<any[]>([])
  const [isLoadingCompanyUsers, setIsLoadingCompanyUsers] = useState(false)
  const [adminShareUrl, setAdminShareUrl] = useState<string | null>(null)
  const [adminCopiedToClipboard, setAdminCopiedToClipboard] = useState(false)

  useEffect(() => {
    // 認証は AuthProvider で処理済み
    console.log('🔄 useEffect triggered, userProfile:', userProfile)
    if (userProfile?.userId) {
      console.log('👤 Loading records for user ID:', userProfile.userId)
      loadUserAndRecords(userProfile.userId)
    } else if (!authLoading) {
      // 認証が完了しているがuserProfileがない場合
      setIsPageLoading(false)
    }
  }, [userProfile, authLoading])

  const loadUserAndRecords = async (lineUserId: string) => {
    try {
      setIsLoading(true)
      setIsPageLoading(true)
      console.log('🔍 Loading user with LINE ID:', lineUserId)
      
      const response = await fetch(`/api/users?lineUserId=${lineUserId}`)
      console.log('📡 API Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 API Response data:', data)
      
      if (data.user) {
        setUser(data.user)
        await loadRecords(data.user.id, data.user.companyId)
      } else {
        setMessage('会社との連携が必要です')
        console.log('❌ No user found in API response')
      }
    } catch (error) {
      console.error('Error loading user:', error)
      setMessage('ユーザー情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
      setIsPageLoading(false)
    }
  }

  const loadUser = async (lineUserId: string) => {
    try {
      const response = await fetch(`/api/users?lineUserId=${lineUserId}`)
      const data = await response.json()
      
      if (data.user) {
        setUser(data.user)
        await loadRecords(data.user.id, data.user.companyId)
      } else {
        setMessage('会社との連携が必要です')
      }
    } catch (error) {
      console.error('Error loading user:', error)
      setMessage('ユーザー情報の取得に失敗しました')
    }
  }

  const loadRecords = async (userId: string, companyId: string) => {
    try {
      const response = await fetch(`/api/attendance?userId=${userId}&companyId=${companyId}`)
      const data = await response.json()
      setAttendanceRecords(data.records || [])
    } catch (error) {
      console.error('Error loading records:', error)
    }
  }

  const loadExistingShares = async () => {
    if (!user) return
    setIsLoadingShares(true)
    try {
      const response = await fetch(`/api/attendance/share?userId=${user.id}&companyId=${user.companyId}`)
      const data = await response.json()
      setExistingShares(data.shares || [])
    } catch (error) {
      console.error('Error loading shares:', error)
    } finally {
      setIsLoadingShares(false)
    }
  }

  const handleCreateShareLink = async () => {
    if (!user) return
    setIsCreatingShare(true)
    setShareUrl(null)
    setCopiedToClipboard(false)
    try {
      const response = await fetch('/api/attendance/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          companyId: user.companyId,
          yearMonth: shareMonth,
          expiresInDays: 30
        })
      })
      const data = await response.json()
      if (response.ok) {
        const url = `${window.location.origin}/share/${data.share.token}`
        setShareUrl(url)
        setMessage('共有リンクを作成しました')
        loadExistingShares()
      } else {
        setMessage(data.error || '共有リンクの作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating share link:', error)
      setMessage('共有リンクの作成に失敗しました')
    } finally {
      setIsCreatingShare(false)
    }
  }

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const handleDeleteShare = async (shareId: string) => {
    if (!user) return
    try {
      const response = await fetch(`/api/attendance/share?shareId=${shareId}&userId=${user.id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setMessage('共有リンクを削除しました')
        loadExistingShares()
      } else {
        const data = await response.json()
        setMessage(data.error || '削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting share:', error)
      setMessage('削除に失敗しました')
    }
  }

  const formatYearMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-')
    return `${year}年${parseInt(month)}月`
  }

  // 管理者用：会社の全ユーザーを取得
  const loadCompanyUsers = async () => {
    if (!user || !user.isAdmin) return
    setIsLoadingCompanyUsers(true)
    try {
      const response = await fetch(`/api/users?companyId=${user.companyId}&listAll=true`)
      const data = await response.json()
      setCompanyUsers(data.users || [])
    } catch (error) {
      console.error('Error loading company users:', error)
    } finally {
      setIsLoadingCompanyUsers(false)
    }
  }

  // 管理者用：全社員の共有リンクを取得
  const loadAllCompanyShares = async () => {
    if (!user || !user.isAdmin) return
    setIsLoadingShares(true)
    try {
      const response = await fetch(`/api/attendance/share?userId=${user.id}&companyId=${user.companyId}&allUsers=true`)
      const data = await response.json()
      setAllCompanyShares(data.shares || [])
    } catch (error) {
      console.error('Error loading company shares:', error)
    } finally {
      setIsLoadingShares(false)
    }
  }

  // 管理者用：社員の共有リンクを作成
  const handleCreateAdminShareLink = async () => {
    if (!user || !selectedUserId) return
    setIsCreatingShare(true)
    setAdminShareUrl(null)
    setAdminCopiedToClipboard(false)
    try {
      const response = await fetch('/api/attendance/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          requestUserId: user.id,
          companyId: user.companyId,
          yearMonth: adminShareMonth,
          expiresInDays: 30
        })
      })
      const data = await response.json()
      if (response.ok) {
        const url = `${window.location.origin}/share/${data.share.token}`
        setAdminShareUrl(url)
        setMessage('共有リンクを作成しました')
        loadAllCompanyShares()
      } else {
        setMessage(data.error || '共有リンクの作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating share link:', error)
      setMessage('共有リンクの作成に失敗しました')
    } finally {
      setIsCreatingShare(false)
    }
  }

  // 管理者用：クリップボードにコピー
  const handleCopyAdminShareUrl = async () => {
    if (!adminShareUrl) return
    try {
      await navigator.clipboard.writeText(adminShareUrl)
      setAdminCopiedToClipboard(true)
      setTimeout(() => setAdminCopiedToClipboard(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  // 管理者用：社員の共有リンクを削除
  const handleDeleteAdminShare = async (shareId: string) => {
    if (!user) return
    try {
      const response = await fetch(`/api/attendance/share?shareId=${shareId}&userId=${user.id}&companyId=${user.companyId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setMessage('共有リンクを削除しました')
        loadAllCompanyShares()
      } else {
        const data = await response.json()
        setMessage(data.error || '削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting share:', error)
      setMessage('削除に失敗しました')
    }
  }

  const handleAttendanceAction = async (action: string) => {
    if (!user) return

    // 現在の記録を取得
    const currentRecord = getTodayRecord()
    
    // アクション別のガード処理
    switch (action) {
      case 'clock_in':
        if (currentRecord?.clock_in) {
          setMessage('すでに出勤済みです')
          return
        }
        break
      case 'clock_out':
        if (!currentRecord?.clock_in || currentRecord?.clock_out) {
          setMessage('出勤記録がないか、すでに退勤済みです')
          return
        }
        break
      case 'break_start':
        if (!currentRecord?.clock_in) {
          setMessage('出勤記録がありません')
          return
        }
        if (currentRecord?.clock_out) {
          setMessage('すでに退勤済みです')
          return
        }
        if (currentRecord?.break_start && !currentRecord?.break_end) {
          setMessage('すでに休憩中です')
          return
        }
        break
      case 'break_end':
        if (!currentRecord?.break_start || currentRecord?.break_end) {
          setMessage('休憩開始記録がないか、すでに休憩終了済みです')
          return
        }
        if (currentRecord?.clock_out) {
          setMessage('すでに退勤済みです')
          return
        }
        break
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          companyId: user.companyId,
          action
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage(data.message)
        await loadRecords(user.id, user.companyId)
      } else {
        setMessage(data.error || 'エラーが発生しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    return new Date(timeString).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTodayRecord = () => {
    const today = new Date().toISOString().split('T')[0]
    return attendanceRecords.find((record: AttendanceRecord) => record.date === today)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">初期化中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">LINEログイン中...</p>
        </div>
      </div>
    )
  }

  if (!user && !isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 mb-4">会社との連携が必要です</p>
          <a 
            href="/link" 
            className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            会社連携画面へ
          </a>
        </div>
      </div>
    )
  }

  const currentRecord = getTodayRecord()

  // ローディング状態のレンダリング
  if (authLoading || isPageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto">
          {/* ヘッダーのスケルトン */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-32 mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-24 mx-auto animate-pulse"></div>
          </div>

          {/* プロフィールカードのスケルトン */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* ボタンエリアのスケルトン */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>

          {/* 今日の記録カードのスケルトン */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* 管理者エリアのスケルトン */}
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  // userがnullかつページロードが完了している場合のみ「会社との連携が必要です」を表示
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 mb-4">会社との連携が必要です</p>
          <a 
            href="/link" 
            className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            会社連携画面へ
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">勤太郎</h1>
          <p className="text-gray-600">{user.company.name}</p>
          {user.isAdmin && (
            <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mt-1">
              管理者
            </span>
          )}
        </div>

        {userProfile && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center space-x-3">
              <img 
                src={userProfile.pictureUrl} 
                alt="Profile" 
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-semibold">{userProfile.displayName}</p>
                <p className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('ja-JP', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}

        {currentRecord && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-6 border border-blue-200/50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">今日の勤怠状況</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">出勤時刻:</span>
                <span className="ml-2 font-semibold">{formatTime(currentRecord?.clock_in)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">退勤時刻:</span>
                <span className="ml-2 font-semibold">{formatTime(currentRecord?.clock_out)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">休憩開始:</span>
                <span className="ml-2 font-semibold">{formatTime(currentRecord?.break_start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">休憩終了:</span>
                <span className="ml-2 font-semibold">{formatTime(currentRecord?.break_end)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => handleAttendanceAction('clock_in')}
            disabled={isLoading || Boolean(currentRecord?.clock_in)}
            className={clsx(
              "p-4 rounded-lg font-semibold transition",
              currentRecord?.clock_in
                ? "bg-gray-100 text-gray-500 cursor-not-allowed pointer-events-none"
                : "bg-green-500 text-white hover:bg-green-600"
            )}
          >
            <Clock className="w-6 h-6 mx-auto mb-2" />
            出勤
          </button>

          <button
            onClick={() => handleAttendanceAction('clock_out')}
            disabled={isLoading || !currentRecord?.clock_in || Boolean(currentRecord?.clock_out)}
            className={clsx(
              "p-4 rounded-lg font-semibold transition",
              (!currentRecord?.clock_in || currentRecord?.clock_out)
                ? "bg-gray-100 text-gray-500 cursor-not-allowed pointer-events-none"
                : "bg-red-500 text-white hover:bg-red-600"
            )}
          >
            <Clock className="w-6 h-6 mx-auto mb-2" />
            退勤
          </button>

          <button
            onClick={() => handleAttendanceAction('break_start')}
            disabled={isLoading || !currentRecord?.clock_in || Boolean(currentRecord?.clock_out) || Boolean(currentRecord?.break_start && !currentRecord?.break_end)}
            className={clsx(
              "p-4 rounded-lg font-semibold transition",
              (!currentRecord?.clock_in || currentRecord?.clock_out || (currentRecord?.break_start && !currentRecord?.break_end))
                ? "bg-gray-100 text-gray-500 cursor-not-allowed pointer-events-none"
                : "bg-yellow-500 text-white hover:bg-yellow-600"
            )}
          >
            <Coffee className="w-6 h-6 mx-auto mb-2" />
            休憩開始
          </button>

          <button
            onClick={() => handleAttendanceAction('break_end')}
            disabled={isLoading || !currentRecord?.break_start || Boolean(currentRecord?.break_end) || Boolean(currentRecord?.clock_out)}
            className={clsx(
              "p-4 rounded-lg font-semibold transition",
              (!currentRecord?.break_start || currentRecord?.break_end || currentRecord?.clock_out)
                ? "bg-gray-100 text-gray-500 cursor-not-allowed pointer-events-none"
                : "bg-blue-500 text-white hover:bg-blue-600"
            )}
          >
            <Coffee className="w-6 h-6 mx-auto mb-2" />
            休憩終了
          </button>
        </div>

        <div className="space-y-3">
          <Link
            href="/history"
            className="w-full bg-slate-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-slate-700 transition flex items-center justify-center"
          >
            <History className="w-5 h-5 mr-2" />
            履歴・変更リクエスト
          </Link>

          <button
            onClick={() => {
              setShowShareModal(true)
              loadExistingShares()
            }}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center"
          >
            <Share2 className="w-5 h-5 mr-2" />
            勤怠記録を共有
          </button>

          {user.isAdmin && (
            <>
              {/* 管理者用：社員の共有リンク管理 */}
              <button
                onClick={() => {
                  setShowAdminShareModal(true)
                  loadCompanyUsers()
                  loadAllCompanyShares()
                }}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center"
              >
                <Share2 className="w-5 h-5 mr-2" />
                社員の共有リンク管理
              </button>
              
              <Link
                href="/requests"
                className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center"
              >
                <ClipboardList className="w-5 h-5 mr-2" />
                変更リクエスト管理
              </Link>
            </>
          )}
        </div>

        {/* 共有リンク作成モーダル */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <Share2 className="w-5 h-5 mr-2" />
                  勤怠記録を共有
                </h3>
                <button
                  onClick={() => {
                    setShowShareModal(false)
                    setShareUrl(null)
                    setCopiedToClipboard(false)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                指定した月の勤怠記録を、パブリックなURLとして共有できます。リンクは30日間有効です。
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    共有する月
                  </label>
                  <input
                    type="month"
                    value={shareMonth}
                    onChange={(e) => setShareMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleCreateShareLink}
                  disabled={isCreatingShare}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {isCreatingShare ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  {isCreatingShare ? '作成中...' : '共有リンクを作成'}
                </button>

                {shareUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 mb-2 font-semibold">共有リンクが作成されました！</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                      <button
                        onClick={handleCopyShareUrl}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        {copiedToClipboard ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    {copiedToClipboard && (
                      <p className="text-xs text-green-600 mt-1">クリップボードにコピーしました</p>
                    )}
                  </div>
                )}

                {/* 既存の共有リンク一覧 */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-sm text-gray-800 mb-3">既存の共有リンク</h4>
                  {isLoadingShares ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : existingShares.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">共有リンクはありません</p>
                  ) : (
                    <div className="space-y-2">
                      {existingShares.map((share) => (
                        <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-sm">{formatYearMonth(share.year_month)}</p>
                            <p className="text-xs text-gray-500">
                              有効期限: {new Date(share.expires_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <a
                              href={`${window.location.origin}/share/${share.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteShare(share.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 管理者用：社員の共有リンク管理モーダル */}
        {showAdminShareModal && user?.isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  社員の共有リンク管理
                </h3>
                <button
                  onClick={() => {
                    setShowAdminShareModal(false)
                    setAdminShareUrl(null)
                    setAdminCopiedToClipboard(false)
                    setSelectedUserId('')
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                社員を選択して勤怠記録の共有リンクを作成できます。
              </p>

              <div className="space-y-4">
                {/* 社員選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    社員を選択
                  </label>
                  {isLoadingCompanyUsers ? (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                    </div>
                  ) : (
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">社員を選択してください</option>
                      {companyUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email || 'Unknown'} {u.id === user.id ? '(自分)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 月選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    共有する月
                  </label>
                  <input
                    type="month"
                    value={adminShareMonth}
                    onChange={(e) => setAdminShareMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleCreateAdminShareLink}
                  disabled={isCreatingShare || !selectedUserId}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {isCreatingShare ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  {isCreatingShare ? '作成中...' : '共有リンクを作成'}
                </button>

                {adminShareUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 mb-2 font-semibold">共有リンクが作成されました！</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={adminShareUrl}
                        className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                      <button
                        onClick={handleCopyAdminShareUrl}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        {adminCopiedToClipboard ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={adminShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    {adminCopiedToClipboard && (
                      <p className="text-xs text-green-600 mt-1">クリップボードにコピーしました</p>
                    )}
                  </div>
                )}

                {/* 全社員の共有リンク一覧 */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-sm text-gray-800 mb-3">全社員の共有リンク一覧</h4>
                  {isLoadingShares ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                    </div>
                  ) : allCompanyShares.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">共有リンクはありません</p>
                  ) : (
                    <div className="space-y-2">
                      {allCompanyShares.map((share) => (
                        <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-sm">
                              {share.users?.name || share.users?.email || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-600">{formatYearMonth(share.year_month)}</p>
                            <p className="text-xs text-gray-500">
                              有効期限: {new Date(share.expires_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <a
                              href={`${window.location.origin}/share/${share.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteAdminShare(share.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}