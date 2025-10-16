import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { name, lineUserId } = await request.json()

    // 会社コードを生成（簡単な実装）
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()

    // 会社を登録（admin_idは後で設定）
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        code
      })
      .select()
      .single()

    if (companyError) {
      console.error('Company creation error:', companyError)
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }

    // usersテーブルに管理者ユーザーを作成
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        line_user_id: lineUserId
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 })
    }

    // ユーザーと会社の関連付け（管理者として）
    const { error: userCompanyError } = await supabaseAdmin
      .from('user_companies')
      .insert({
        user_id: user.id,
        company_id: company.id,
        is_admin: true
      })

    if (userCompanyError) {
      console.error('User company association error:', userCompanyError)
      return NextResponse.json({ error: 'Failed to associate user with company' }, { status: 500 })
    }

    // 会社のadmin_idを更新
    const { error: updateCompanyError } = await supabaseAdmin
      .from('companies')
      .update({ admin_id: user.id })
      .eq('id', company.id)

    if (updateCompanyError) {
      console.error('Company admin update error:', updateCompanyError)
      // エラーでもレスポンスは返す（非致命的）
    }

    return NextResponse.json({ 
      company: { 
        id: company.id, 
        name: company.name, 
        code: company.code 
      } 
    })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, code')
      .order('name')

    if (error) {
      console.error('Error fetching companies:', error)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    return NextResponse.json({ companies })
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}