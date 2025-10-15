'use client'

import { useState, useEffect } from 'react'
import { initLineMiniApp, getLineMiniAppProfile, isLineMiniAppAvailable, createMockLineMiniApp } from '@/lib/liff'
import { Clock, Coffee, FileText, Users, Edit3 } from 'lucide-react'
import { clsx } from 'clsx'

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
  const [isLineMiniAppReady, setIsLineMiniAppReady] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showRecords, setShowRecords] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [editForm, setEditForm] = useState({
    clockIn: '',
    clockOut: '',
    breakStart: '',
    breakEnd: ''
  })

  useEffect(() => {
    const initializeLineMiniApp = async () => {
      // 開発環境でのモック作成
      if (process.env.NODE_ENV === 'development' && !isLineMiniAppAvailable()) {
        createMockLineMiniApp()
      }
      
      const success = await initLineMiniApp()
      if (success) {
        setIsLineMiniAppReady(true)
        const profile = await getLineMiniAppProfile()
        setUserProfile(profile)
        
        if (profile?.userId) {
          await loadUser(profile.userId)
        }

        // URL パラメータから自動実行するアクションをチェック
        const urlParams = new URLSearchParams(window.location.search)
        const action = urlParams.get('action')
        if (action && (action === 'clock_in' || action === 'clock_out')) {
          // 少し遅延を入れてユーザー情報の読み込み完了を待つ
          setTimeout(() => {
            handleAttendanceAction(action)
          }, 1000)
        }
      }
    }

    initializeLineMiniApp()
  }, [])

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
      setRecords(data.records || [])
    } catch (error) {
      console.error('Error loading records:', error)
    }
  }

  const handleAttendanceAction = async (action: string) => {
    if (!user) return

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

  const handleEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record)
    setEditForm({
      clockIn: record.clock_in ? new Date(record.clock_in).toISOString().slice(0, 16) : '',
      clockOut: record.clock_out ? new Date(record.clock_out).toISOString().slice(0, 16) : '',
      breakStart: record.break_start ? new Date(record.break_start).toISOString().slice(0, 16) : '',
      breakEnd: record.break_end ? new Date(record.break_end).toISOString().slice(0, 16) : ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRecord || !user) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/attendance/${editingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminUserId: user.id,
          companyId: user.companyId,
          clockIn: editForm.clockIn ? new Date(editForm.clockIn).toISOString() : null,
          clockOut: editForm.clockOut ? new Date(editForm.clockOut).toISOString() : null,
          breakStart: editForm.breakStart ? new Date(editForm.breakStart).toISOString() : null,
          breakEnd: editForm.breakEnd ? new Date(editForm.breakEnd).toISOString() : null
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage(data.message)
        setEditingRecord(null)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const getTodayRecord = () => {
    const today = new Date().toISOString().split('T')[0]
    return records.find(record => record.date === today)
  }

  if (!isLineMiniAppReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">LINE Mini App 初期化中...</p>
        </div>
      </div>
    )
  }

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

  const todayRecord = getTodayRecord()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">勤怠太郎</h1>
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

        {todayRecord && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">今日の勤怠</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">出勤:</span>
                <span className="ml-2 font-semibold">{formatTime(todayRecord.clock_in)}</span>
              </div>
              <div>
                <span className="text-gray-600">退勤:</span>
                <span className="ml-2 font-semibold">{formatTime(todayRecord.clock_out)}</span>
              </div>
              <div>
                <span className="text-gray-600">休憩開始:</span>
                <span className="ml-2 font-semibold">{formatTime(todayRecord.break_start)}</span>
              </div>
              <div>
                <span className="text-gray-600">休憩終了:</span>
                <span className="ml-2 font-semibold">{formatTime(todayRecord.break_end)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => handleAttendanceAction('clock_in')}
            disabled={isLoading}
            className={clsx(
              "p-4 rounded-lg font-semibold transition",
              todayRecord?.clock_in
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-green-500 text-white hover:bg-green-600"
            )}
          >
            <Clock className="w-6 h-6 mx-auto mb-2" />
            出勤
          </button>

          <button
            onClick={() => handleAttendanceAction('clock_out')}
            disabled={isLoading || !todayRecord?.clock_in || Boolean(todayRecord?.clock_out)}
            className={clsx(
              "p-4 rounded-lg font-semibold transition",
              (!todayRecord?.clock_in || todayRecord?.clock_out)
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-red-500 text-white hover:bg-red-600"
            )}
          >
            <Clock className="w-6 h-6 mx-auto mb-2" />
            退勤
          </button>

          <button
            onClick={() => handleAttendanceAction('break_start')}
            disabled={isLoading || !todayRecord?.clock_in || Boolean(todayRecord?.break_start && !todayRecord?.break_end)}
            className={clsx(
              "p-4 rounded-lg font-semibold transition",
              (!todayRecord?.clock_in || (todayRecord?.break_start && !todayRecord?.break_end))
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-yellow-500 text-white hover:bg-yellow-600"
            )}
          >
            <Coffee className="w-6 h-6 mx-auto mb-2" />
            休憩開始
          </button>

          <button
            onClick={() => handleAttendanceAction('break_end')}
            disabled={isLoading || !todayRecord?.break_start || Boolean(todayRecord?.break_end)}
            className={clsx(
              "p-4 rounded-lg font-semibold transition",
              (!todayRecord?.break_start || todayRecord?.break_end)
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            )}
          >
            <Coffee className="w-6 h-6 mx-auto mb-2" />
            休憩終了
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowRecords(!showRecords)}
            className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center"
          >
            <FileText className="w-5 h-5 mr-2" />
            勤怠履歴を{showRecords ? '閉じる' : '表示'}
          </button>

          {user.isAdmin && (
            <button
              onClick={() => {
                setShowRecords(true)
                loadRecords(user.id, user.companyId)
              }}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center"
            >
              <Users className="w-5 h-5 mr-2" />
              全社員の勤怠管理
            </button>
          )}
        </div>

        {showRecords && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold text-gray-800 mb-4">勤怠履歴</h3>
            <div className="space-y-3">
              {records.length === 0 ? (
                <p className="text-gray-500 text-center py-4">履歴がありません</p>
              ) : (
                records.map((record) => (
                  <div key={record.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{formatDate(record.date)}</p>
                        {record.user_companies?.users && (
                          <p className="text-sm text-gray-600">
                            {record.user_companies.users.email.split('@')[0]}
                          </p>
                        )}
                      </div>
                      {user.isAdmin && (
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">出勤:</span>
                        <span className="ml-1">{formatTime(record.clock_in)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">退勤:</span>
                        <span className="ml-1">{formatTime(record.clock_out)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">休憩開始:</span>
                        <span className="ml-1">{formatTime(record.break_start)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">休憩終了:</span>
                        <span className="ml-1">{formatTime(record.break_end)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {editingRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="font-semibold text-lg mb-4">勤怠記録を編集</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    出勤時刻
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.clockIn}
                    onChange={(e) => setEditForm({...editForm, clockIn: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    退勤時刻
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.clockOut}
                    onChange={(e) => setEditForm({...editForm, clockOut: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    休憩開始
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.breakStart}
                    onChange={(e) => setEditForm({...editForm, breakStart: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    休憩終了
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.breakEnd}
                    onChange={(e) => setEditForm({...editForm, breakEnd: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  disabled={isLoading}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 hover:bg-purple-700 transition"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingRecord(null)}
                  disabled={isLoading}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-600 transition"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}