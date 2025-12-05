'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { Calendar, Clock, Coffee, User, Building, AlertCircle, Share2 } from 'lucide-react'

interface AttendanceRecord {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
  status: string
}

interface Stats {
  totalWorkMinutes: number
  totalBreakMinutes: number
  daysWorked: number
  totalDays: number
  formattedTotalWork: string
  formattedTotalBreak: string
  formattedAverageWork: string
}

interface ShareData {
  user: { name: string }
  company: { name: string }
  yearMonth: string
  expiresAt: string
  records: AttendanceRecord[]
  stats: Stats
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<ShareData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/attendance/share/${token}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          if (response.status === 404) {
            setError('共有リンクが見つかりません')
          } else if (response.status === 410) {
            setError('この共有リンクは有効期限切れです')
          } else {
            setError(errorData.error || 'データの取得に失敗しました')
          }
          return
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching share data:', err)
        setError('データの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token])

  // 日付のフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    })
  }

  // 時刻のフォーマット
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

  // 勤務時間の計算
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

  // 年月のフォーマット
  const formatYearMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-')
    return `${year}年${parseInt(month)}月`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">読み込み中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">エラー</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Share2 className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">勤怠記録共有</h1>
            </div>
            <span className="text-sm text-gray-500">
              有効期限: {new Date(data.expiresAt).toLocaleDateString('ja-JP')}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
              <User className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">氏名</p>
                <p className="font-semibold text-gray-900">{data.user.name || '未設定'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
              <Building className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">会社</p>
                <p className="font-semibold text-gray-900">{data.company.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">期間</p>
                <p className="font-semibold text-gray-900">{formatYearMonth(data.yearMonth)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">月間サマリー</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-blue-600">{data.stats.daysWorked}</p>
              <p className="text-sm text-gray-600">出勤日数</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-green-600">{data.stats.formattedTotalWork}</p>
              <p className="text-sm text-gray-600">総勤務時間</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-orange-600">{data.stats.formattedTotalBreak}</p>
              <p className="text-sm text-gray-600">総休憩時間</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-purple-600">{data.stats.formattedAverageWork}</p>
              <p className="text-sm text-gray-600">平均勤務時間</p>
            </div>
          </div>
        </div>

        {/* 勤怠記録テーブル */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">勤怠詳細</h2>
          
          {data.records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              この月の勤怠記録はありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">日付</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600">
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>出勤</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600">
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>退勤</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600">
                      <div className="flex items-center justify-center space-x-1">
                        <Coffee className="w-4 h-4" />
                        <span>休憩</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-600">勤務時間</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-sm font-medium text-gray-900">
                        {formatDate(record.date)}
                      </td>
                      <td className="py-3 px-2 text-sm text-center text-gray-700">
                        {formatTime(record.clock_in)}
                      </td>
                      <td className="py-3 px-2 text-sm text-center text-gray-700">
                        {formatTime(record.clock_out)}
                      </td>
                      <td className="py-3 px-2 text-sm text-center text-gray-700">
                        {record.break_start && record.break_end
                          ? `${formatTime(record.break_start)} - ${formatTime(record.break_end)}`
                          : '-'}
                      </td>
                      <td className="py-3 px-2 text-sm text-center font-semibold text-blue-600">
                        {calculateWorkTime(record)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>この勤怠記録は共有リンクを通じて公開されています</p>
        </div>
      </div>
    </div>
  )
}
