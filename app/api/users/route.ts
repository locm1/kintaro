import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('lineUserId')

    if (!lineUserId) {
      return NextResponse.json({ error: 'LINE User ID is required' }, { status: 400 })
    }

    // LINEユーザーIDから関連付けされたユーザー情報を取得
    const { data: userCompany, error } = await supabase
      .from('user_companies')
      .select(`
        *,
        companies(*)
      `)
      .eq('line_user_id', lineUserId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ 
      user: {
        id: userCompany.user_id,
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