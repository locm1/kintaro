'use client'

import { useState, useEffect } from 'react'
import { Clock, Coffee, ClipboardList } from 'lucide-react'
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

export default function Home() {
  const { isAuthenticated, userProfile, isLoading: authLoading } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPageLoading, setIsPageLoading] = useState(true) // ページ全体のローディング状態
  const [message, setMessage] = useState('')


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
                {user.isAdmin && (
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mt-1">
                    管理者
                  </span>
                )}
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

        {user.isAdmin && (
          <div className="space-y-3">
            <Link
              href="/requests"
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center"
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              変更リクエスト管理
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
