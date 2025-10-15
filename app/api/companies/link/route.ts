import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, companyCode, lineUserId } = await request.json()

    // 会社コードで会社を検索
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('code', companyCode)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: '会社コードが見つかりません' }, { status: 404 })
    }

    // すでに連携済みかチェック
    const { data: existingAssociation } = await supabase
      .from('user_companies')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', company.id)
      .single()

    if (existingAssociation) {
      return NextResponse.json({ error: 'すでに連携済みです' }, { status: 400 })
    }

    // ユーザーと会社を連携
    const { error: associationError } = await supabase
      .from('user_companies')
      .insert({
        user_id: userId,
        company_id: company.id,
        is_admin: false,
        line_user_id: lineUserId
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