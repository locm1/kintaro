import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 変更リクエストを承認/却下
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId, companyId, action, comment } = await request.json()

    if (!userId || !companyId || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // ユーザーが管理者かチェック
    const { data: userCompany, error: userCompanyError } = await supabaseAdmin
      .from('user_companies')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single()

    if (userCompanyError || !userCompany || !userCompany.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 変更リクエストを取得
    const { data: changeRequest, error: fetchError } = await supabaseAdmin
      .from('change_requests')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (fetchError || !changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 })
    }

    if (changeRequest.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // 承認の場合、勤怠記録を更新
    if (action === 'approve') {
      // 既存の勤怠記録があるかチェック
      let attendanceRecordId = changeRequest.attendance_record_id

      if (attendanceRecordId) {
        // 既存の記録を更新
        const { error: updateAttendanceError } = await supabaseAdmin
          .from('attendance_records')
          .update({
            clock_in: changeRequest.requested_clock_in,
            clock_out: changeRequest.requested_clock_out,
            break_start: changeRequest.requested_break_start,
            break_end: changeRequest.requested_break_end,
            updated_at: new Date().toISOString()
          })
          .eq('id', attendanceRecordId)

        if (updateAttendanceError) {
          console.error('Error updating attendance record:', updateAttendanceError)
          return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 })
        }
      } else {
        // 新規作成
        const { data: newRecord, error: createAttendanceError } = await supabaseAdmin
          .from('attendance_records')
          .insert({
            user_id: changeRequest.user_id,
            company_id: changeRequest.company_id,
            date: changeRequest.request_date,
            clock_in: changeRequest.requested_clock_in,
            clock_out: changeRequest.requested_clock_out,
            break_start: changeRequest.requested_break_start,
            break_end: changeRequest.requested_break_end,
            status: 'present'
          })
          .select()
          .single()

        if (createAttendanceError) {
          // UNIQUE制約違反の場合は既存レコードを更新
          if (createAttendanceError.code === '23505') {
            const { error: upsertError } = await supabaseAdmin
              .from('attendance_records')
              .update({
                clock_in: changeRequest.requested_clock_in,
                clock_out: changeRequest.requested_clock_out,
                break_start: changeRequest.requested_break_start,
                break_end: changeRequest.requested_break_end,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', changeRequest.user_id)
              .eq('company_id', changeRequest.company_id)
              .eq('date', changeRequest.request_date)

            if (upsertError) {
              console.error('Error upserting attendance record:', upsertError)
              return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 })
            }
          } else {
            console.error('Error creating attendance record:', createAttendanceError)
            return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 })
          }
        } else {
          attendanceRecordId = newRecord.id
        }
      }
    }

    // 変更リクエストのステータスを更新
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('change_requests')
      .update({
        status: newStatus,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_comment: comment || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating change request:', updateError)
      return NextResponse.json({ error: 'Failed to update change request' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? '変更リクエストを承認しました' : '変更リクエストを却下しました',
      changeRequest: updatedRequest
    })
  } catch (error) {
    console.error('Error in change request update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 変更リクエストを削除（本人のみ、保留中のみ）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 変更リクエストを取得
    const { data: changeRequest, error: fetchError } = await supabaseAdmin
      .from('change_requests')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single()

    if (fetchError || !changeRequest) {
      return NextResponse.json({ error: 'Change request not found or cannot be deleted' }, { status: 404 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('change_requests')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting change request:', deleteError)
      return NextResponse.json({ error: 'Failed to delete change request' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '変更リクエストを取り消しました'
    })
  } catch (error) {
    console.error('Error in change request deletion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
