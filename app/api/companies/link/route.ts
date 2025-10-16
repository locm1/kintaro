import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { companyCode, lineUserId } = await request.json()

    // 会社コードで会社を検索
    const { data: companies, error: companyError } = await supabase
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

    // すでに連携済みかチェック
    const { data: existingAssociations } = await supabase
      .from('user_companies')
      .select('*')
      .eq('line_user_id', lineUserId)
      .eq('company_id', company.id)

    if (existingAssociations && existingAssociations.length > 0) {
      return NextResponse.json({ error: 'すでに連携済みです' }, { status: 400 })
    }

    // usersテーブルにユーザーを作成
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        line_user_id: lineUserId
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      return NextResponse.json({ error: 'ユーザー作成に失敗しました' }, { status: 500 })
    }

    // ユーザーと会社を連携
    const { error: associationError } = await supabase
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