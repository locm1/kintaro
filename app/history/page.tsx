'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Coffee, ChevronLeft, ChevronRight, Send, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
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
}

interface ChangeRequest {
  id: string
  request_date: string
  status: 'pending' | 'approved' | 'rejected'
  requested_clock_in: string | null
  requested_clock_out: string | null
  requested_break_start: string | null
  requested_break_end: string | null
  reason: string | null
  created_at: string
}

export default function HistoryPage() {
  const { isAuthenticated, userProfile, isLoading: authLoading } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([])
  const [message, setMessage] = useState('')
  
  // 年月選択
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  
  // 変更リクエストモーダル
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [requestForm, setRequestForm] = useState({
    clockIn: '',
    clockOut: '',
    breakStart: '',
    breakEnd: '',
    reason: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 年の選択肢を生成（現在年から5年前まで）
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentDate.getFullYear() - i)
  
  // 月の選択肢
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  useEffect(() => {
    if (userProfile?.userId) {
      loadUser(userProfile.userId)
    } else if (!authLoading) {
      setIsPageLoading(false)
    }
  }, [userProfile, authLoading])

  useEffect(() => {
    if (user) {
      loadRecordsForMonth()
      loadPendingRequests()
    }
  }, [user, selectedYear, selectedMonth])

  const loadUser = async (lineUserId: string) => {
    try {
      const response = await fetch(`/api/users?lineUserId=${lineUserId}`)
      const data = await response.json()
      
      if (data.user) {
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setIsPageLoading(false)
    }
  }

  const loadRecordsForMonth = async () => {
    if (!user) return
    
    try {
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
      const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
      
      const response = await fetch(
        `/api/attendance?userId=${user.id}&companyId=${user.companyId}&startDate=${startDate}&endDate=${endDate}`
      )
      const data = await response.json()
      setRecords(data.records || [])
    } catch (error) {
      console.error('Error loading records:', error)
    }
  }

  const loadPendingRequests = async () => {
    if (!user) return
    
    try {
      const response = await fetch(
        `/api/change-requests?userId=${user.id}&companyId=${user.companyId}`
      )
      const data = await response.json()
      setPendingRequests(data.requests || [])
    } catch (error) {
      console.error('Error loading pending requests:', error)
    }
  }

  const getDaysInMonth = () => {
    const days = []
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
    
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      const record = records.find(r => r.date === dateStr)
      const pendingRequest = pendingRequests.find(r => r.request_date === dateStr && r.status === 'pending')
      const date = new Date(selectedYear, selectedMonth - 1, day)
      const dayOfWeek = date.getDay()
      
      days.push({
        day,
        dateStr,
        record,
        pendingRequest,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      })
    }
    
    return days
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    try {
      return new Date(timeString).toLocaleTimeString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  const formatDateTimeLocal = (timeString: string | null) => {
    if (!timeString) return ''
    try {
      const date = new Date(timeString)
      // JST用に調整
      const offset = date.getTimezoneOffset() * 60000
      const localDate = new Date(date.getTime() - offset)
      return localDate.toISOString().slice(0, 16)
    } catch {
      return ''
    }
  }

  const getDayName = (dayOfWeek: number) => {
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return days[dayOfWeek]
  }

  const calculateWorkTime = (record: AttendanceRecord) => {
    if (!record.clock_in || !record.clock_out) return '-'
    
    const clockIn = new Date(record.clock_in)
    const clockOut = new Date(record.clock_out)
    let workMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60))
    
    if (record.break_start && record.break_end) {
      const breakStart = new Date(record.break_start)
      const breakEnd = new Date(record.break_end)
      workMinutes -= Math.floor((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60))
    }
    
    const hours = Math.floor(workMinutes / 60)
    const mins = workMinutes % 60
    return `${hours}:${mins.toString().padStart(2, '0')}`
  }

  const openRequestModal = (dateStr: string, record: AttendanceRecord | undefined) => {
    setSelectedDate(dateStr)
    setSelectedRecord(record || null)
    setRequestForm({
      clockIn: record ? formatDateTimeLocal(record.clock_in) : '',
      clockOut: record ? formatDateTimeLocal(record.clock_out) : '',
      breakStart: record ? formatDateTimeLocal(record.break_start) : '',
      breakEnd: record ? formatDateTimeLocal(record.break_end) : '',
      reason: ''
    })
    setShowRequestModal(true)
  }

  const handleSubmitRequest = async () => {
    if (!user || !selectedDate) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          companyId: user.companyId,
          attendanceRecordId: selectedRecord?.id || null,
          requestDate: selectedDate,
          currentClockIn: selectedRecord?.clock_in || null,
          currentClockOut: selectedRecord?.clock_out || null,
          currentBreakStart: selectedRecord?.break_start || null,
          currentBreakEnd: selectedRecord?.break_end || null,
          requestedClockIn: requestForm.clockIn ? new Date(requestForm.clockIn).toISOString() : null,
          requestedClockOut: requestForm.clockOut ? new Date(requestForm.clockOut).toISOString() : null,
          requestedBreakStart: requestForm.breakStart ? new Date(requestForm.breakStart).toISOString() : null,
          requestedBreakEnd: requestForm.breakEnd ? new Date(requestForm.breakEnd).toISOString() : null,
          reason: requestForm.reason
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage('変更リクエストを送信しました')
        setShowRequestModal(false)
        loadPendingRequests()
      } else {
        setMessage(data.error || '変更リクエストの送信に失敗しました')
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      setMessage('変更リクエストの送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/change-requests/${requestId}?userId=${user.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setMessage('変更リクエストを取り消しました')
        loadPendingRequests()
      } else {
        const data = await response.json()
        setMessage(data.error || '取り消しに失敗しました')
      }
    } catch (error) {
      console.error('Error canceling request:', error)
      setMessage('取り消しに失敗しました')
    }
  }

  const getRequestStatus = (dateStr: string) => {
    const request = pendingRequests.find(r => r.request_date === dateStr)
    if (!request) return null
    return request.status
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />申請中</span>
      case 'approved':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />承認済</span>
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />却下</span>
      default:
        return null
    }
  }

  if (authLoading || isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 mb-4">ログインが必要です</p>
          <Link href="/attendance" className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition">
            勤怠ページへ
          </Link>
        </div>
      </div>
    )
  }

  const days = getDaysInMonth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">勤怠履歴</h1>
            </div>
            <Link href="/attendance" className="text-blue-600 hover:text-blue-800 text-sm">
              ← 戻る
            </Link>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">{user.company.name}</p>
          
          {/* 年月選択 */}
          <div className="flex items-center justify-center space-x-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {monthOptions.map(month => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
            <button onClick={() => setMessage('')} className="float-right">✕</button>
          </div>
        )}

        {/* 勤怠履歴テーブル */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">日付</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">
                    <div className="flex items-center justify-center">
                      <Clock className="w-3 h-3 mr-1" />出勤
                    </div>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">
                    <div className="flex items-center justify-center">
                      <Clock className="w-3 h-3 mr-1" />退勤
                    </div>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 hidden sm:table-cell">
                    <div className="flex items-center justify-center">
                      <Coffee className="w-3 h-3 mr-1" />休憩
                    </div>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">勤務時間</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {days.map(({ day, dateStr, record, pendingRequest, dayOfWeek, isWeekend }) => {
                  const requestStatus = getRequestStatus(dateStr)
                  
                  return (
                    <tr key={dateStr} className={isWeekend ? 'bg-gray-50' : ''}>
                      <td className="px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${dayOfWeek === 0 ? 'text-red-600' : dayOfWeek === 6 ? 'text-blue-600' : 'text-gray-900'}`}>
                            {day}日
                          </span>
                          <span className={`text-xs ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                            ({getDayName(dayOfWeek)})
                          </span>
                          {requestStatus && getStatusBadge(requestStatus)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700">
                        {formatTime(record?.clock_in || null)}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700">
                        {formatTime(record?.clock_out || null)}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700 hidden sm:table-cell">
                        {record?.break_start && record?.break_end
                          ? `${formatTime(record.break_start)}-${formatTime(record.break_end)}`
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-center text-sm font-semibold text-blue-600">
                        {record ? calculateWorkTime(record) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {pendingRequest ? (
                          <button
                            onClick={() => handleCancelRequest(pendingRequest.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                            title="リクエストを取り消し"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openRequestModal(dateStr, record)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="変更リクエスト"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 凡例 */}
        <div className="mt-4 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">ステータス説明</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">変更リクエストを送る</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge('pending')}
              <span className="text-gray-600">承認待ち</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge('approved')}
              <span className="text-gray-600">承認済み</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge('rejected')}
              <span className="text-gray-600">却下</span>
            </div>
          </div>
        </div>
      </div>

      {/* 変更リクエストモーダル */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">変更リクエスト</h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              {selectedDate}の勤怠記録の変更をリクエストします。
            </p>

            {selectedRecord && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-2">現在の記録</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>出勤: {formatTime(selectedRecord.clock_in)}</div>
                  <div>退勤: {formatTime(selectedRecord.clock_out)}</div>
                  <div>休憩開始: {formatTime(selectedRecord.break_start)}</div>
                  <div>休憩終了: {formatTime(selectedRecord.break_end)}</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  出勤時刻
                </label>
                <input
                  type="datetime-local"
                  value={requestForm.clockIn}
                  onChange={(e) => setRequestForm({ ...requestForm, clockIn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  退勤時刻
                </label>
                <input
                  type="datetime-local"
                  value={requestForm.clockOut}
                  onChange={(e) => setRequestForm({ ...requestForm, clockOut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  休憩開始
                </label>
                <input
                  type="datetime-local"
                  value={requestForm.breakStart}
                  onChange={(e) => setRequestForm({ ...requestForm, breakStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  休憩終了
                </label>
                <input
                  type="datetime-local"
                  value={requestForm.breakEnd}
                  onChange={(e) => setRequestForm({ ...requestForm, breakEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  変更理由
                </label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  rows={3}
                  placeholder="変更理由を入力してください..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? '送信中...' : 'リクエストを送信'}
              </button>
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-600 transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
