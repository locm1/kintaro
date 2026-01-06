import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// メール認証トークンを検証
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: '認証トークンが必要です' }, { status: 400 })
    }

    // トークンでユーザーを検索
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, email_verification_token, email_verification_expires_at')
      .eq('email_verification_token', token)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: '無効な認証トークンです' }, { status: 400 })
    }

    // 有効期限のチェック
    const expiresAt = new Date(user.email_verification_expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: '認証トークンの有効期限が切れています' }, { status: 400 })
    }

    // メール認証を完了
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_expires_at: null
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating email verification:', updateError)
      return NextResponse.json({ error: '認証の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'メールアドレスの認証が完了しました',
      email: user.email
    })
  } catch (error) {
    console.error('Error in email verification confirm:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// トークンからユーザー情報を取得（認証ページでの表示用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: '認証トークンが必要です' }, { status: 400 })
    }

    // トークンでユーザーを検索
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('email, email_verification_expires_at')
      .eq('email_verification_token', token)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: '無効な認証トークンです', valid: false }, { status: 400 })
    }

    // 有効期限のチェック
    const expiresAt = new Date(user.email_verification_expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: '認証トークンの有効期限が切れています', valid: false, expired: true }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      email: user.email
    })
  } catch (error) {
    console.error('Error checking token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
