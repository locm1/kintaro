import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const companyId = searchParams.get('companyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!userId || !companyId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // ユーザーが管理者かチェック
    const { data: userCompanies } = await supabaseAdmin
      .from('user_companies')
      .select('is_admin')
      .eq('user_id', userId)
      .eq('company_id', companyId)
    
    const userCompany = userCompanies?.[0]

    if (!userCompany?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    // 勤怠記録を取得
    let query = supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        users!inner(
          id,
          name,
          email,
          line_user_id
        )
      `)
      .eq('company_id', companyId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    // 日付範囲フィルター
    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data: records, error } = await query

    if (error) {
      console.error('Error fetching attendance records:', error)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    // CSVデータを生成
    const csvHeader = [
      'ユーザー名',
      'メールアドレス',
      '日付',
      '出勤時刻',
      '退勤時刻',
      '休憩開始',
      '休憩終了',
      '勤務時間',
      '休憩時間',
      'ステータス'
    ].join(',')

    const csvRows = records?.map(record => {
      // 時刻フォーマット関数
      const formatTime = (timeString: string | null) => {
        if (!timeString) return ''
        try {
          return new Date(timeString).toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        } catch {
          return timeString
        }
      }

      // 勤務時間計算
      const calculateWorkTime = () => {
        if (!record.clock_in || !record.clock_out) return ''
        
        const clockIn = new Date(record.clock_in)
        const clockOut = new Date(record.clock_out)
        let workMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60))
        
        // 休憩時間を引く
        if (record.break_start && record.break_end) {
          const breakStart = new Date(record.break_start)
          const breakEnd = new Date(record.break_end)
          const breakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60))
          workMinutes -= breakMinutes
        }
        
        const hours = Math.floor(workMinutes / 60)
        const minutes = workMinutes % 60
        return `${hours}:${minutes.toString().padStart(2, '0')}`
      }

      // 休憩時間計算
      const calculateBreakTime = () => {
        if (!record.break_start || !record.break_end) return ''
        
        const breakStart = new Date(record.break_start)
        const breakEnd = new Date(record.break_end)
        const breakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60))
        
        const hours = Math.floor(breakMinutes / 60)
        const minutes = breakMinutes % 60
        return `${hours}:${minutes.toString().padStart(2, '0')}`
      }

      // CSVエスケープ関数
      const escapeCSV = (value: string | null) => {
        if (!value) return ''
        // カンマや改行、ダブルクォートが含まれている場合はダブルクォートで囲む
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }

      return [
        escapeCSV(record.users?.name || '名前未設定'),
        escapeCSV(record.users?.email || ''),
        record.date,
        formatTime(record.clock_in),
        formatTime(record.clock_out),
        formatTime(record.break_start),
        formatTime(record.break_end),
        calculateWorkTime(),
        calculateBreakTime(),
        escapeCSV(record.status || 'present')
      ].join(',')
    }) || []

    const csvContent = [csvHeader, ...csvRows].join('\n')

    // ファイル名生成
    const now = new Date()
    const dateStr = now.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }).replace(/\//g, '-')
    const filename = `attendance_records_${dateStr}.csv`

    // CSVファイルとしてレスポンス
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error exporting attendance records:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}