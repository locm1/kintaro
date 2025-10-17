import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('lineUserId')

    console.log('🔍 API: Looking for user with LINE ID:', lineUserId)

    if (!lineUserId) {
      return NextResponse.json({ error: 'LINE User ID is required' }, { status: 400 })
    }

    // LINEユーザーIDからユーザー情報を取得
    const { data: user, error } = await supabaseAdmin
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

    console.log('📊 API: Database query result:', { user, error })

    if (error) {
      console.error('Error fetching user:', error)
      // ユーザーが見つからない場合は正常な応答として扱う
      if (error.code === 'PGRST116') {
        return NextResponse.json({ user: null })
      }
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 })
    }

    // ユーザーが存在しない場合
    if (!user || !user.user_companies || user.user_companies.length === 0) {
      console.log('❌ API: No user or company association found')
      return NextResponse.json({ user: null })
    }

    // 最初の会社情報を返す（複数の会社に所属している場合は最初のもの）
    const userCompany = user.user_companies[0]
    
    console.log('✅ API: User found and returning data')
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
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}