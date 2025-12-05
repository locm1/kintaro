import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { randomBytes } from 'crypto'

// 共有リンクを作成
export async function POST(request: NextRequest) {
  try {
    const { userId, companyId, yearMonth, expiresInDays = 30, targetUserId, requestUserId } = await request.json()

    // targetUserId: 共有リンクを作成する対象のユーザー（管理者が他の社員用に作成する場合）
    // requestUserId: リクエストを送信しているユーザー
    const actualTargetUserId = targetUserId || userId
    const actualRequestUserId = requestUserId || userId

    if (!actualTargetUserId || !companyId || !yearMonth) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // yearMonth形式チェック (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json({ error: 'Invalid yearMonth format. Use YYYY-MM' }, { status: 400 })
    }

    // リクエストユーザーがその会社に所属しているかチェック
    const { data: requestUserCompany, error: requestUserCompanyError } = await supabaseAdmin
      .from('user_companies')
      .select('*')
      .eq('user_id', actualRequestUserId)
      .eq('company_id', companyId)
      .single()

    if (requestUserCompanyError || !requestUserCompany) {
      return NextResponse.json({ error: 'Request user is not associated with this company' }, { status: 403 })
    }

    // 他人の共有リンクを作成する場合は管理者権限が必要
    if (actualTargetUserId !== actualRequestUserId && !requestUserCompany.is_admin) {
      return NextResponse.json({ error: 'Admin access required to create share links for other users' }, { status: 403 })
    }

    // 対象ユーザーがその会社に所属しているかチェック
    const { data: targetUserCompany, error: targetUserCompanyError } = await supabaseAdmin
      .from('user_companies')
      .select('*')
      .eq('user_id', actualTargetUserId)
      .eq('company_id', companyId)
      .single()

    if (targetUserCompanyError || !targetUserCompany) {
      return NextResponse.json({ error: 'Target user is not associated with this company' }, { status: 403 })
    }

    // 既存の共有リンクがあれば削除（同じユーザー、会社、月の組み合わせ）
    await supabaseAdmin
      .from('attendance_shares')
      .delete()
      .eq('user_id', actualTargetUserId)
      .eq('company_id', companyId)
      .eq('year_month', yearMonth)

    // トークンを生成
    const token = randomBytes(32).toString('hex')
    
    // 有効期限を計算
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // 共有リンクを作成
    const { data: share, error: createError } = await supabaseAdmin
      .from('attendance_shares')
      .insert({
        user_id: actualTargetUserId,
        company_id: companyId,
        token,
        year_month: yearMonth,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating attendance share:', createError)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        token: share.token,
        yearMonth: share.year_month,
        expiresAt: share.expires_at
      }
    })
  } catch (error) {
    console.error('Error in share creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 共有リンク一覧を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const companyId = searchParams.get('companyId')
    const targetUserId = searchParams.get('targetUserId') // 管理者が特定社員の共有リンクを取得する場合
    const allUsers = searchParams.get('allUsers') === 'true' // 管理者が全社員の共有リンクを取得する場合

    if (!userId || !companyId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // リクエストユーザーがその会社に所属しているかチェック
    const { data: requestUserCompany, error: requestUserCompanyError } = await supabaseAdmin
      .from('user_companies')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single()

    if (requestUserCompanyError || !requestUserCompany) {
      return NextResponse.json({ error: 'User is not associated with this company' }, { status: 403 })
    }

    let query = supabaseAdmin
      .from('attendance_shares')
      .select(`
        *,
        users!inner(id, name, email)
      `)
      .eq('company_id', companyId)
      .order('year_month', { ascending: false })

    // 管理者の場合
    if (requestUserCompany.is_admin) {
      if (targetUserId) {
        // 特定のユーザーの共有リンクのみ
        query = query.eq('user_id', targetUserId)
      } else if (!allUsers) {
        // デフォルトは自分のもののみ
        query = query.eq('user_id', userId)
      }
      // allUsers=true の場合は全社員の共有リンクを取得
    } else {
      // 一般ユーザーは自分のもののみ
      query = query.eq('user_id', userId)
    }

    const { data: shares, error } = await query

    if (error) {
      console.error('Error fetching attendance shares:', error)
      return NextResponse.json({ error: 'Failed to fetch share links' }, { status: 500 })
    }

    return NextResponse.json({ shares: shares || [] })
  } catch (error) {
    console.error('Error in share fetch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 共有リンクを削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('shareId')
    const userId = searchParams.get('userId')
    const companyId = searchParams.get('companyId')

    if (!shareId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 削除対象の共有リンクを取得
    const { data: share, error: fetchError } = await supabaseAdmin
      .from('attendance_shares')
      .select('*')
      .eq('id', shareId)
      .single()

    if (fetchError || !share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    // 自分のリンクかチェック
    if (share.user_id === userId) {
      // 自分のリンクは削除可能
    } else if (companyId) {
      // 他人のリンクの場合は管理者権限が必要
      const { data: requestUserCompany, error: requestUserCompanyError } = await supabaseAdmin
        .from('user_companies')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .single()

      if (requestUserCompanyError || !requestUserCompany || !requestUserCompany.is_admin) {
        return NextResponse.json({ error: 'Admin access required to delete other users share links' }, { status: 403 })
      }

      // 共有リンクが同じ会社のものかチェック
      if (share.company_id !== companyId) {
        return NextResponse.json({ error: 'Share link does not belong to this company' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('attendance_shares')
      .delete()
      .eq('id', shareId)

    if (deleteError) {
      console.error('Error deleting attendance share:', deleteError)
      return NextResponse.json({ error: 'Failed to delete share link' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in share deletion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
