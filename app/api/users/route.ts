import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('lineUserId')

    if (!lineUserId) {
      return NextResponse.json({ error: 'LINE User ID is required' }, { status: 400 })
    }

    // LINEユーザーIDからユーザー情報を取得
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        user_companies (
          *,
          companies (*)
        )
      `)
      .eq('line_user_id', lineUserId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // ユーザーが存在しない場合
    if (!user || !user.user_companies || user.user_companies.length === 0) {
      return NextResponse.json({ user: null })
    }

    // 最初の会社情報を返す（複数の会社に所属している場合は最初のもの）
    const userCompany = user.user_companies[0]
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        lineUserId: user.line_user_id,
        companyId: userCompany.company_id,
        isAdmin: userCompany.is_admin,
        company: userCompany.companies
      }
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}