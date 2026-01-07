import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyChangeRequest } from '@/lib/email-notifications'

// 変更リクエストを作成
export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      companyId,
      attendanceRecordId,
      requestDate,
      currentClockIn,
      currentClockOut,
      currentBreakStart,
      currentBreakEnd,
      requestedClockIn,
      requestedClockOut,
      requestedBreakStart,
      requestedBreakEnd,
      reason
    } = await request.json()

    if (!userId || !companyId || !requestDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // ユーザーがその会社に所属しているかチェック
    const { data: userCompany, error: userCompanyError } = await supabaseAdmin
      .from('user_companies')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'User is not associated with this company' }, { status: 403 })
    }

    // 同じ日付で保留中のリクエストがあるかチェック
    const { data: existingRequest } = await supabaseAdmin
      .from('change_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('request_date', requestDate)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json({ error: 'この日付には既に保留中の変更リクエストがあります' }, { status: 400 })
    }

    // 変更リクエストを作成
    const { data: changeRequest, error: createError } = await supabaseAdmin
      .from('change_requests')
      .insert({
        user_id: userId,
        company_id: companyId,
        attendance_record_id: attendanceRecordId || null,
        request_date: requestDate,
        current_clock_in: currentClockIn || null,
        current_clock_out: currentClockOut || null,
        current_break_start: currentBreakStart || null,
        current_break_end: currentBreakEnd || null,
        requested_clock_in: requestedClockIn || null,
        requested_clock_out: requestedClockOut || null,
        requested_break_start: requestedBreakStart || null,
        requested_break_end: requestedBreakEnd || null,
        reason: reason || null,
        status: 'pending'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating change request:', createError)
      return NextResponse.json({ error: 'Failed to create change request' }, { status: 500 })
    }

    // 管理者にメール通知を送信（レスポンス前に完了させる）
    try {
      await notifyChangeRequest(userId, companyId, requestDate, reason)
    } catch (err) {
      console.error('Failed to send change request notification:', err)
      // 通知失敗しても変更リクエストは成功しているので続行
    }

    return NextResponse.json({
      success: true,
      message: '変更リクエストを送信しました',
      changeRequest
    })
  } catch (error) {
    console.error('Error in change request creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 変更リクエスト一覧を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const isAdmin = searchParams.get('isAdmin') === 'true'

    if (!userId || !companyId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('change_requests')
      .select(`
        *,
        users!change_requests_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    // 管理者でない場合は自分のリクエストのみ
    if (!isAdmin) {
      query = query.eq('user_id', userId)
    }

    // ステータスフィルター
    if (status) {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error fetching change requests:', error)
      return NextResponse.json({ error: 'Failed to fetch change requests' }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Error in change request fetch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
