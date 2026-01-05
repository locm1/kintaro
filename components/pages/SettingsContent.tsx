'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, Clock, Copy, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useSPA } from '@/components/SPAContext'

interface User {
  id: string
  name: string
  email: string
  lineUserId: string
  companyId: string
  isAdmin: boolean
  company: {
    id: string
    name: string
    code: string
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
}

export default function SettingsContent() {
  const { userProfile } = useAuth()
  const { navigate } = useSPA()
  const [user, setUser] = useState<User | null>(null)
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<string>('未出勤')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  useEffect(() => {
    if (userProfile?.userId) {
      loadUserAndTodayRecord(userProfile.userId)
    }
  }, [userProfile])

  const loadUserAndTodayRecord = async (lineUserId: string) => {
    try {
      setIsLoading(true)
      console.log('Loading user data for LINE ID:', lineUserId)
      
      // ユーザー情報を取得
      const userResponse = await fetch(`/api/users?lineUserId=${lineUserId}`)
      if (userResponse.ok) {
        const userData = await userResponse.json()
        console.log('User data response:', userData)
        
        if (userData.user) {
          setUser(userData.user)
          
          // 今日の勤怠記録を取得
          await loadTodayRecord(userData.user.id, userData.user.companyId)
        } else {
          // ユーザーが見つからない＝会社連携していない
          console.log('User not found or not linked to company')
          setUser(null)
        }
      } else {
        console.error('Failed to fetch user:', userResponse.status)
        setUser(null)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTodayRecord = async (userId: string, companyId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/attendance?userId=${userId}&companyId=${companyId}&date=${today}`)
      
      if (response.ok) {
        const data = await response.json()
        const record = data.records?.[0]
        setTodayRecord(record)
        updateAttendanceStatus(record)
      }
    } catch (error) {
      console.error('Error loading today record:', error)
    }
  }

  const updateAttendanceStatus = (record: AttendanceRecord | null) => {
    if (!record || !record.clock_in) {
      setAttendanceStatus('未出勤')
      return
    }

    if (record.clock_out) {
      setAttendanceStatus('退勤済み')
      return
    }

    if (record.break_start && !record.break_end) {
      setAttendanceStatus('休憩中')
      return
    }

    setAttendanceStatus('出勤中')
  }

  const copyCompanyCode = async () => {
    if (user?.company?.code) {
      try {
        await navigator.clipboard.writeText(user.company.code)
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '出勤中': return 'text-green-600 bg-green-100'
      case '休憩中': return 'text-yellow-600 bg-yellow-100'
      case '退勤済み': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // ローディング状態のレンダリング
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto">

          <div className="space-y-6">
            {/* ステータスカードのスケルトン */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center mb-4">
                <div className="h-8 bg-gray-200 rounded-full w-24 mx-auto animate-pulse"></div>
              </div>
              <div className="space-y-2">
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

            {/* 会社情報カードのスケルトン */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Building2 className="w-5 h-5 mr-2 text-gray-300" />
                <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="flex items-center space-x-2">
                  <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* アクションカードのスケルトン */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-24 mx-auto mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-4 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-28 mx-auto animate-pulse"></div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-20 mx-auto mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-36 mx-auto mb-4 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-24 mx-auto animate-pulse"></div>
              </div>
            </div>

            {/* プロフィールカードのスケルトン */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* 機能一覧カードのスケルトン */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-6 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center">
                    <div className="w-2 h-2 bg-gray-200 rounded-full mr-3 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">

        <div className="space-y-6">
          {/* 勤怠ステータス表示 */}
          {user && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center mb-4">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(attendanceStatus)}`}>
                  <Clock className="w-4 h-4 mr-2" />
                  {attendanceStatus}
                </div>
              </div>
              
              {todayRecord && (
                <div className="space-y-2 text-sm text-gray-600">
                  {todayRecord.clock_in && (
                    <div className="flex justify-between">
                      <span>出勤時刻:</span>
                      <span className="font-medium">
                        {new Date(todayRecord.clock_in).toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                  {todayRecord.break_start && (
                    <div className="flex justify-between">
                      <span>休憩開始:</span>
                      <span className="font-medium">
                        {new Date(todayRecord.break_start).toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                  {todayRecord.break_end && (
                    <div className="flex justify-between">
                      <span>休憩終了:</span>
                      <span className="font-medium">
                        {new Date(todayRecord.break_end).toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                  {todayRecord.clock_out && (
                    <div className="flex justify-between">
                      <span>退勤時刻:</span>
                      <span className="font-medium">
                        {new Date(todayRecord.clock_out).toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 会社情報表示 */}
          {user?.company && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                所属会社
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">会社名</span>
                  <p className="font-medium text-gray-800">{user.company.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">会社コード</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm">
                      {user.company.code}
                    </code>
                    <button
                      onClick={copyCompanyCode}
                      className="p-1 text-gray-500 hover:text-blue-600 transition"
                      title="コピー"
                    >
                      {copiedCode ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {copiedCode && (
                    <p className="text-xs text-green-600 mt-1">コピーしました！</p>
                  )}
                </div>
                {user.isAdmin && (
                  <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block">
                    管理者
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {user ? '会社設定' : '会社連携'}
            </h2>
            <p className="text-gray-600 mb-4">
              {user ? '会社情報の確認・変更ができます' : 'まずは勤務先の会社と連携しましょう'}
            </p>
            <a
              href="/link"
              className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {user ? '会社設定' : '会社連携を開始'}
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">勤怠管理</h2>
            <p className="text-gray-600 mb-4">
              出勤・退勤・休憩の記録ができます
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-block bg-green-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              勤怠記録へ
            </button>
          </div>

          {userProfile && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center space-x-3">
                <img 
                  src={userProfile.pictureUrl || 'https://via.placeholder.com/50'} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{userProfile.displayName}</p>
                  <p className="text-sm text-gray-600">LINEユーザー</p>
                  {user && (
                    <p className="text-xs text-blue-600 mt-1">
                      {user.company?.name || '会社未連携'}
                    </p>
                  )}
                </div>
                {isLoading && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">機能一覧</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                会社の新規登録（管理者）
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                会社コードでの連携
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                出勤・退勤の記録
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                休憩時間の管理
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                勤怠履歴の確認・編集（管理者）
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
