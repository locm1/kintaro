import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 公開共有用 - トークンから勤怠データを取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // トークンから共有情報を取得
    const { data: share, error: shareError } = await supabaseAdmin
      .from('attendance_shares')
      .select('*')
      .eq('token', token)
      .single()

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 })
    }

    // 有効期限チェック
    if (new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 })
    }

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('id', share.user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 会社情報を取得
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('id', share.company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // 月の開始日と終了日を計算
    const [year, month] = share.year_month.split('-')
    const startDate = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`

    // 勤怠記録を取得
    const { data: records, error: recordsError } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('user_id', share.user_id)
      .eq('company_id', share.company_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (recordsError) {
      console.error('Error fetching attendance records:', recordsError)
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    // 統計情報を計算
    const stats = calculateStats(records || [], startDate, endDate)

    return NextResponse.json({
      user: { name: user.name },
      company: { name: company.name },
      yearMonth: share.year_month,
      expiresAt: share.expires_at,
      records: records || [],
      stats
    })
  } catch (error) {
    console.error('Error in public share fetch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateStats(
  records: any[],
  startDate: string,
  endDate: string
) {
  let totalWorkMinutes = 0
  let totalBreakMinutes = 0
  let daysWorked = 0

  records.forEach(record => {
    if (record.clock_in && record.clock_out) {
      daysWorked++
      const clockIn = new Date(record.clock_in)
      const clockOut = new Date(record.clock_out)
      totalWorkMinutes += Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60))

      if (record.break_start && record.break_end) {
        const breakStart = new Date(record.break_start)
        const breakEnd = new Date(record.break_end)
        const breakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60))
        totalBreakMinutes += breakMinutes
        totalWorkMinutes -= breakMinutes
      }
    }
  })

  // 月の日数を計算
  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  return {
    totalWorkMinutes,
    totalBreakMinutes,
    daysWorked,
    totalDays,
    formattedTotalWork: formatMinutes(totalWorkMinutes),
    formattedTotalBreak: formatMinutes(totalBreakMinutes),
    averageWorkMinutes: daysWorked > 0 ? Math.round(totalWorkMinutes / daysWorked) : 0,
    formattedAverageWork: daysWorked > 0 ? formatMinutes(Math.round(totalWorkMinutes / daysWorked)) : '0:00'
  }
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}:${mins.toString().padStart(2, '0')}`
}
