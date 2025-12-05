'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, CheckCircle, XCircle, Clock, AlertCircle, User, Calendar, MessageSquare } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useSPA } from '@/components/SPAContext'

interface UserData {
  id: string
  companyId: string
  isAdmin: boolean
  company: {
    id: string
    name: string
  }
}

interface ChangeRequest {
  id: string
  user_id: string
  request_date: string
  status: 'pending' | 'approved' | 'rejected'
  current_clock_in: string | null
  current_clock_out: string | null
  current_break_start: string | null
  current_break_end: string | null
  requested_clock_in: string | null
  requested_clock_out: string | null
  requested_break_start: string | null
  requested_break_end: string | null
  reason: string | null
  review_comment: string | null
  created_at: string
  users: {
    id: string
    name: string | null
    email: string | null
  }
}

export default function RequestsContent() {
  const { isAuthenticated, userProfile, isLoading: authLoading } = useAuth()
  const { navigate } = useSPA()
  const [user, setUser] = useState<UserData | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 承認/却下モーダル
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [reviewComment, setReviewComment] = useState('')

  useEffect(() => {
    if (userProfile?.userId) {
      loadUser(userProfile.userId)
    } else if (!authLoading) {
      setIsPageLoading(false)
    }
  }, [userProfile, authLoading])

  useEffect(() => {
    if (user?.isAdmin) {
      loadRequests()
    }
  }, [user, statusFilter])

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

  const loadRequests = async () => {
    if (!user) return
    
    try {
      let url = `/api/change-requests?userId=${user.id}&companyId=${user.companyId}&isAdmin=true`
      if (statusFilter) {
        url += `&status=${statusFilter}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error loading requests:', error)
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const openReviewModal = (request: ChangeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setReviewAction(action)
    setReviewComment('')
    setShowReviewModal(true)
  }

  const handleReview = async () => {
    if (!user || !selectedRequest) return
    
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/change-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          companyId: user.companyId,
          action: reviewAction,
          comment: reviewComment
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage(data.message)
        setShowReviewModal(false)
        loadRequests()
      } else {
        setMessage(data.error || '処理に失敗しました')
      }
    } catch (error) {
      console.error('Error processing request:', error)
      setMessage('処理に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />承認待ち</span>
      case 'approved':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />承認済み</span>
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />却下</span>
      default:
        return null
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

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
          <button onClick={() => navigate('/')} className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition">
            勤怠ページへ
          </button>
        </div>
      </div>
    )
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 mb-4">このページは管理者のみアクセスできます</p>
          <button onClick={() => navigate('/')} className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition">
            勤怠ページへ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ClipboardList className="w-6 h-6 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-800">変更リクエスト管理</h1>
              {statusFilter === 'pending' && pendingCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {pendingCount}
                </span>
              )}
            </div>
            <button onClick={() => navigate('/')} className="text-blue-600 hover:text-blue-800 text-sm">
              ← 戻る
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">{user.company.name}</p>
          
          {/* ステータスフィルター */}
          <div className="flex space-x-2">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === 'pending'
                  ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              承認待ち
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === 'approved'
                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              承認済み
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === 'rejected'
                  ? 'bg-red-100 text-red-800 border-2 border-red-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              却下
            </button>
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === ''
                  ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              すべて
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
            <button onClick={() => setMessage('')} className="float-right">✕</button>
          </div>
        )}

        {/* リクエスト一覧 */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">変更リクエストはありません</p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-gray-800">
                        {request.users?.name || request.users?.email || 'Unknown'}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>対象日: {formatDate(request.request_date)}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      申請日時: {formatDateTime(request.created_at)}
                    </div>
                  </div>
                </div>

                {/* 変更内容 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2 font-semibold">現在の記録</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">出勤:</span>
                        <span>{formatTime(request.current_clock_in)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">退勤:</span>
                        <span>{formatTime(request.current_clock_out)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">休憩開始:</span>
                        <span>{formatTime(request.current_break_start)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">休憩終了:</span>
                        <span>{formatTime(request.current_break_end)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 mb-2 font-semibold">変更後（リクエスト）</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">出勤:</span>
                        <span className="font-semibold text-blue-700">{formatTime(request.requested_clock_in)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">退勤:</span>
                        <span className="font-semibold text-blue-700">{formatTime(request.requested_clock_out)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">休憩開始:</span>
                        <span className="font-semibold text-blue-700">{formatTime(request.requested_break_start)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">休憩終了:</span>
                        <span className="font-semibold text-blue-700">{formatTime(request.requested_break_end)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 理由 */}
                {request.reason && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-yellow-600 font-semibold mb-1">変更理由</p>
                        <p className="text-sm text-gray-700">{request.reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* レビューコメント */}
                {request.review_comment && (
                  <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">管理者コメント</p>
                        <p className="text-sm text-gray-700">{request.review_comment}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* アクションボタン */}
                {request.status === 'pending' && (
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={() => openReviewModal(request, 'approve')}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      承認
                    </button>
                    <button
                      onClick={() => openReviewModal(request, 'reject')}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      却下
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 承認/却下モーダル */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              {reviewAction === 'approve' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  リクエストを承認
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  リクエストを却下
                </>
              )}
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm">
                <span className="font-semibold">{selectedRequest.users?.name || selectedRequest.users?.email}</span>
                さんの{formatDate(selectedRequest.request_date)}の変更リクエストを
                {reviewAction === 'approve' ? '承認' : '却下'}しますか？
              </p>
            </div>

            {reviewAction === 'approve' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  承認すると、勤怠記録がリクエスト内容に更新されます。
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                コメント（任意）
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="社員に伝えるコメントを入力..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleReview}
                disabled={isProcessing}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition flex items-center justify-center disabled:opacity-50 ${
                  reviewAction === 'approve'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : reviewAction === 'approve' ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                {isProcessing ? '処理中...' : reviewAction === 'approve' ? '承認する' : '却下する'}
              </button>
              <button
                onClick={() => setShowReviewModal(false)}
                disabled={isProcessing}
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
