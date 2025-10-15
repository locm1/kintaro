import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { adminUserId, companyId, clockIn, clockOut, breakStart, breakEnd } = await request.json()

    // 管理者権限をチェック
    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('is_admin')
      .eq('user_id', adminUserId)
      .eq('company_id', companyId)
      .single()

    if (!userCompany?.is_admin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 記録を更新
    const { data: updatedRecord, error } = await supabase
      .from('attendance_records')
      .update({
        clock_in: clockIn,
        clock_out: clockOut,
        break_start: breakStart,
        break_end: breakEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('Error updating attendance record:', error)
      return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: '記録が更新されました',
      record: updatedRecord
    })
  } catch (error) {
    console.error('Error updating attendance record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}