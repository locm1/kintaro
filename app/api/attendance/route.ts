import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { userId, companyId, action } = await request.json()
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // 今日の勤怠記録を取得または作成
    let { data: record, error: fetchError } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('date', today)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching attendance record:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch attendance record' }, { status: 500 })
    }

    // 記録が存在しない場合は新規作成
    if (!record) {
      const { data: newRecord, error: createError } = await supabaseAdmin
        .from('attendance_records')
        .insert({
          user_id: userId,
          company_id: companyId,
          date: today,
          status: 'present'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating attendance record:', createError)
        return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 })
      }

      record = newRecord
    }

    // アクションに応じて更新
    let updateData: any = { updated_at: now }

    switch (action) {
      case 'clock_in':
        if (record.clock_in) {
          return NextResponse.json({ error: 'すでに出勤済みです' }, { status: 400 })
        }
        updateData.clock_in = now
        break
      case 'clock_out':
        if (!record.clock_in) {
          return NextResponse.json({ error: '出勤記録がありません' }, { status: 400 })
        }
        if (record.clock_out) {
          return NextResponse.json({ error: 'すでに退勤済みです' }, { status: 400 })
        }
        updateData.clock_out = now
        break
      case 'break_start':
        if (!record.clock_in) {
          return NextResponse.json({ error: '出勤記録がありません' }, { status: 400 })
        }
        if (record.break_start && !record.break_end) {
          return NextResponse.json({ error: 'すでに休憩中です' }, { status: 400 })
        }
        updateData.break_start = now
        updateData.break_end = null // 新しい休憩開始時は終了時刻をリセット
        break
      case 'break_end':
        if (!record.break_start) {
          return NextResponse.json({ error: '休憩開始記録がありません' }, { status: 400 })
        }
        if (record.break_end) {
          return NextResponse.json({ error: 'すでに休憩終了済みです' }, { status: 400 })
        }
        updateData.break_end = now
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // 記録を更新
    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('attendance_records')
      .update(updateData)
      .eq('id', record.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating attendance record:', updateError)
      return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: '記録が更新されました',
      record: updatedRecord
    })
  } catch (error) {
    console.error('Error recording attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const companyId = searchParams.get('companyId')

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

    let query = supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        users!inner(
          id,
          line_user_id,
          email,
          name
        )
      `)
      .eq('company_id', companyId)

    // 管理者でない場合は自分の記録のみ
    if (!userCompany?.is_admin) {
      query = query.eq('user_id', userId)
    }

    const { data: records, error } = await query
      .order('date', { ascending: false })
      .limit(30)

    if (error) {
      console.error('Error fetching attendance records:', error)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    return NextResponse.json({ records })
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}