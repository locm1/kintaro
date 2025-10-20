import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { companyCode, lineUserId, displayName } = await request.json()

    // 会社コードで会社を検索
    const { data: companies, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('code', companyCode)

    if (companyError) {
      console.error('Company fetch error:', companyError)
      return NextResponse.json({ error: 'データベースエラー' }, { status: 500 })
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({ error: '会社コードが見つかりません' }, { status: 404 })
    }

    const company = companies[0]

    // 既存のユーザーをline_user_idで検索
    const { data: existingUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('line_user_id', lineUserId)

    // すでに連携済みかチェック（ユーザーが存在する場合のみ）
    let existingAssociations = null
    if (existingUsers && existingUsers.length > 0) {
      const { data } = await supabaseAdmin
        .from('user_companies')
        .select('*')
        .eq('user_id', existingUsers[0].id)
        .eq('company_id', company.id)
      existingAssociations = data
    }

    if (existingAssociations && existingAssociations.length > 0) {
      return NextResponse.json({ error: 'すでに連携済みです' }, { status: 400 })
    }

    // 既存ユーザーがいる場合はそれを使用、いない場合は新規作成
    let user
    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0]
      
      // 既存ユーザーのnameが空でdisplayNameがある場合は更新
      if (displayName) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()
        
        if (userData && !userData.name) {
          await supabaseAdmin
            .from('users')
            .update({ name: displayName })
            .eq('id', user.id)
        }
      }
    } else {
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          line_user_id: lineUserId,
          name: displayName || null // LINEのニックネームをnameフィールドに挿入
        })
        .select()
        .single()

      if (userError) {
        console.error('User creation error:', userError)
        return NextResponse.json({ error: 'ユーザー作成に失敗しました' }, { status: 500 })
      }
      user = newUser
    }

    // ユーザーと会社を連携
    const { error: associationError } = await supabaseAdmin
      .from('user_companies')
      .insert({
        user_id: user.id,
        company_id: company.id,
        is_admin: false
      })

    if (associationError) {
      console.error('User company association error:', associationError)
      return NextResponse.json({ error: '連携に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: '連携が完了しました',
      company: {
        id: company.id,
        name: company.name
      }
    })
  } catch (error) {
    console.error('Error linking company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}