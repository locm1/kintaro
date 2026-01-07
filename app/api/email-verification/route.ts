import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { randomBytes } from 'crypto'

// メール認証トークンを生成してメールを送信
export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 })
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 })
    }

    // ユーザーの存在確認
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, email_verified')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // 認証トークンを生成
    const verificationToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後

    // ユーザー情報を更新
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        email: email,
        email_verified: false,
        email_verification_token: verificationToken,
        email_verification_expires_at: expiresAt.toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({ error: 'ユーザー情報の更新に失敗しました' }, { status: 500 })
    }

    // 認証URLを生成（LINE Mini App内で開く）
    const miniAppUrl = process.env.NEXT_PUBLIC_MINI_APP_URL || ''
    // pathパラメータ内にtokenを含める（Mini Appはpathの内容をそのままリダイレクト先として使用）
    const pathWithToken = encodeURIComponent(`/verify-email?token=${verificationToken}`)
    const verificationUrl = `${miniAppUrl}?path=${pathWithToken}`

    // TODO: 実際のメール送信を実装
    // 現在はコンソールに出力（本番環境ではSendGrid、AWS SES、Resendなどを使用）
    console.log('===========================================')
    console.log('📧 メール認証リクエスト')
    console.log('To:', email)
    console.log('認証URL:', verificationUrl)
    console.log('有効期限:', expiresAt.toLocaleString('ja-JP'))
    console.log('===========================================')

    // メール送信処理（Resendを使用する場合の例）
    // 環境変数にRESEND_API_KEYが設定されている場合のみ送信
    if (process.env.RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
            to: email,
            subject: '【勤怠管理】メールアドレス認証',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">メールアドレス認証のお願い</h2>
                <p>以下のボタンをクリックして、メールアドレスの認証を完了してください。</p>
                <p>
                  <a href="${verificationUrl}" 
                     style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    メールアドレスを認証する
                  </a>
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  このリンクは24時間有効です。<br>
                  もしこのメールに心当たりがない場合は、無視してください。
                </p>
              </div>
            `
          })
        })

        if (!resendResponse.ok) {
          console.error('Failed to send email via Resend:', await resendResponse.text())
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        // メール送信に失敗してもトークン保存は成功しているので続行
      }
    }

    return NextResponse.json({
      success: true,
      message: '認証メールを送信しました。メールをご確認ください。'
    })
  } catch (error) {
    console.error('Error in email verification request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// メール認証の状態を確認
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('email, email_verified')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    return NextResponse.json({
      email: user.email,
      emailVerified: user.email_verified || false
    })
  } catch (error) {
    console.error('Error checking email verification status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
