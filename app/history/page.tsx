'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Coffee, ChevronLeft, ChevronRight, Send, X, CheckCircle, XCircle, AlertCircle, Users, Edit3, Share2, Copy, Check, ExternalLink, Trash2 } from 'lucide-react'
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

interface CompanyUser {
  id: string
  name: string | null
  email: string | null
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

  // 管理者用：社員選択
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  
  // 管理者用：直接編集モーダル
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<{
    date: string
    clockIn: string
    clockOut: string
    breakStart: string
    breakEnd: string
  } | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // 共有リンク機能
  const [showShareModal, setShowShareModal] = useState(false)
  const [isCreatingShare, setIsCreatingShare] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [existingShares, setExistingShares] = useState<any[]>([])
  const [isLoadingShares, setIsLoadingShares] = useState(false)

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
      // 管理者の場合は社員一覧を読み込む
      if (user.role === 'admin') {
        loadCompanyUsers()
      }
      loadRecordsForMonth()
      loadPendingRequests()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadRecordsForMonth()
      if (!selectedUserId || selectedUserId === user.id) {
        loadPendingRequests()
      } else {
        // 他の社員を見ている場合はリクエスト表示をクリア
        setPendingRequests([])
      }
    }
  }, [selectedYear, selectedMonth, selectedUserId])

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

  const loadCompanyUsers = async () => {
    if (!user) return
    
    setIsLoadingUsers(true)
    try {
      const response = await fetch(`/api/users?companyId=${user.companyId}&listAll=true`)
      const data = await response.json()
      if (data.users) {
        setCompanyUsers(data.users)
      }
    } catch (error) {
      console.error('Error loading company users:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const loadRecordsForMonth = async () => {
    if (!user) return
    
    // 管理者が他の社員を選択している場合はその社員のレコードを取得
    const targetUserId = (user.role === 'admin' && selectedUserId) ? selectedUserId : user.id
    
    try {
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
      const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
      
      const response = await fetch(
        `/api/attendance?userId=${targetUserId}&companyId=${user.companyId}&startDate=${startDate}&endDate=${endDate}`
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

  // 管理者用：直接編集モーダルを開く
  const openEditModal = (dateStr: string, record: AttendanceRecord | undefined) => {
    setEditingRecord({
      date: dateStr,
      clockIn: record ? formatDateTimeLocal(record.clock_in) : '',
      clockOut: record ? formatDateTimeLocal(record.clock_out) : '',
      breakStart: record ? formatDateTimeLocal(record.break_start) : '',
      breakEnd: record ? formatDateTimeLocal(record.break_end) : ''
    })
    setShowEditModal(true)
  }

  // 管理者用：直接編集を保存
  const handleSaveEdit = async () => {
    if (!user || !editingRecord) return
    
    const targetUserId = selectedUserId || user.id
    
    setIsSavingEdit(true)
    try {
      // 既存レコードがあるか確認
      const existingRecord = records.find(r => r.date === editingRecord.date)
      
      if (existingRecord) {
        // 既存レコードを更新
        const response = await fetch(`/api/attendance/${existingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: user.id,
            companyId: user.companyId,
            clockIn: editingRecord.clockIn ? new Date(editingRecord.clockIn).toISOString() : null,
            clockOut: editingRecord.clockOut ? new Date(editingRecord.clockOut).toISOString() : null,
            breakStart: editingRecord.breakStart ? new Date(editingRecord.breakStart).toISOString() : null,
            breakEnd: editingRecord.breakEnd ? new Date(editingRecord.breakEnd).toISOString() : null
          })
        })
        
        if (response.ok) {
          setMessage('勤怠記録を更新しました')
          setShowEditModal(false)
          loadRecordsForMonth()
        } else {
          const data = await response.json()
          setMessage(data.error || '更新に失敗しました')
        }
      } else {
        // 新規レコードを作成
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            companyId: user.companyId,
            adminId: user.id,
            date: editingRecord.date,
            clockIn: editingRecord.clockIn ? new Date(editingRecord.clockIn).toISOString() : null,
            clockOut: editingRecord.clockOut ? new Date(editingRecord.clockOut).toISOString() : null,
            breakStart: editingRecord.breakStart ? new Date(editingRecord.breakStart).toISOString() : null,
            breakEnd: editingRecord.breakEnd ? new Date(editingRecord.breakEnd).toISOString() : null
          })
        })
        
        if (response.ok) {
          setMessage('勤怠記録を作成しました')
          setShowEditModal(false)
          loadRecordsForMonth()
        } else {
          const data = await response.json()
          setMessage(data.error || '作成に失敗しました')
        }
      }
    } catch (error) {
      console.error('Error saving edit:', error)
      setMessage('保存に失敗しました')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // 現在自分自身を見ているかどうか
  const isViewingSelf = !selectedUserId || selectedUserId === user?.id

  // 共有リンク関連の関数
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
    
    // 現在選択中の年月を共有
    const shareYearMonth = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`
    
    try {
      const response = await fetch('/api/attendance/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          companyId: user.companyId,
          yearMonth: shareYearMonth,
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
            <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← 戻る
            </Link>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">{user.company.name}</p>
          
          {/* 管理者用：社員選択 */}
          {user.role === 'admin' && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 mr-1" />
                社員を選択
              </label>
              <select
                value={selectedUserId || user.id}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoadingUsers}
              >
                <option value={user.id}>自分（{user.name || user.email}）</option>
                {companyUsers
                  .filter(u => u.id !== user.id)
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email || '名前未設定'}
                    </option>
                  ))
                }
              </select>
              {!isViewingSelf && (
                <p className="text-xs text-blue-600 mt-1">
                  他の社員の記録を閲覧・編集中
                </p>
              )}
            </div>
          )}
          
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

          {/* 勤怠記録を共有ボタン */}
          {isViewingSelf && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => {
                  setShowShareModal(true)
                  loadExistingShares()
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center"
              >
                <Share2 className="w-4 h-4 mr-2" />
                この月の勤怠記録を共有
              </button>
            </div>
          )}
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
                        {user.role === 'admin' ? (
                          <button
                            onClick={() => openEditModal(dateStr, record)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                            title="直接編集"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        ) : pendingRequest ? (
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

      {/* 管理者用：直接編集モーダル */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Edit3 className="w-5 h-5 mr-2 text-green-600" />
                勤怠記録の編集
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {editingRecord.date}の記録を編集
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  出勤時刻
                </label>
                <input
                  type="datetime-local"
                  value={editingRecord.clockIn}
                  onChange={(e) => setEditingRecord({ ...editingRecord, clockIn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  退勤時刻
                </label>
                <input
                  type="datetime-local"
                  value={editingRecord.clockOut}
                  onChange={(e) => setEditingRecord({ ...editingRecord, clockOut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  休憩開始
                </label>
                <input
                  type="datetime-local"
                  value={editingRecord.breakStart}
                  onChange={(e) => setEditingRecord({ ...editingRecord, breakStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  休憩終了
                </label>
                <input
                  type="datetime-local"
                  value={editingRecord.breakEnd}
                  onChange={(e) => setEditingRecord({ ...editingRecord, breakEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
              >
                {isSavingEdit ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Edit3 className="w-4 h-4 mr-2" />
                )}
                {isSavingEdit ? '保存中...' : '保存する'}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-600 transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              {selectedYear}年{selectedMonth}月の勤怠記録を、パブリックなURLとして共有できます。リンクは30日間有効です。
            </p>

            <div className="space-y-4">
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
    </div>
  )
}
