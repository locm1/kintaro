import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!

// Supabaseクライアント設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// LINE Webhook署名検証
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64')
  
  return signature === hash
}

// 勤怠記録をデータベースに保存
async function recordAttendance(lineUserId: string, action: string) {
  try {
    console.log('🔍 Looking for user with LINE ID:', lineUserId)
    
    // LINE User IDからユーザー情報を取得
    const { data: user, error: userError } = await supabase
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

    console.log('🔍 User query result:', { user, error: userError })

    if (userError || !user) {
      console.log('❌ User not found. Error:', userError)
      
      // デバッグ用：全ユーザーを確認
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, name, line_user_id')
      console.log('📊 All users:', allUsers)
      
      return {
        success: false,
        error: `❌ ユーザーが見つかりません。\nLINE ID: ${lineUserId}\n会社連携を行ってください。`
      }
    }

    // 最初の会社情報を使用
    const userCompany = user.user_companies?.[0]
    
    if (!userCompany || !userCompany.companies) {
      return {
        success: false,
        error: '❌ 会社との連携が確認できません。\n会社連携を行ってください。'
      }
    }

    // 勤怠記録の種別を確認
    const attendanceType = action === 'clock_in' ? 'clock_in' : 
                          action === 'clock_out' ? 'clock_out' : null

    if (!attendanceType) {
      return {
        success: false,
        error: '❌ 無効なアクションです。'
      }
    }

    // 今日の日付を取得（UTC→JSTに変換）
    const now = new Date()
    const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000))
    const todayStr = jstDate.toISOString().split('T')[0]

    // 今日の最新の勤怠記録を確認
    const { data: latestRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .order('created_at', { ascending: false })
      .limit(1)

    // 出勤の場合：今日の出勤記録がないかチェック
    if (attendanceType === 'clock_in') {
      if (latestRecord && latestRecord.length > 0 && latestRecord[0].clock_in) {
        return {
          success: false,
          error: '❌ 本日はすでに出勤済みです。'
        }
      }
    }

    // 退勤の場合：出勤記録があるかチェック
    if (attendanceType === 'clock_out') {
      if (!latestRecord || latestRecord.length === 0 || !latestRecord[0]?.clock_in) {
        return {
          success: false,
          error: '❌ 出勤記録がありません。\n先に出勤記録を行ってください。'
        }
      }
      if (latestRecord[0].clock_out) {
        return {
          success: false,
          error: '❌ 本日はすでに退勤済みです。'
        }
      }
    }

    // 勤怠記録を保存
    let attendanceRecord
    if (attendanceType === 'clock_in') {
      // 新しい出勤記録を作成
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          user_id: user.id,
          company_id: userCompany.company_id,
          date: todayStr,
          clock_in: jstDate.toISOString(),
          status: 'present'
        })
        .select('*')
        .single()

      if (error) throw error
      attendanceRecord = data
    } else {
      // 既存の記録に退勤時刻を更新
      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          clock_out: jstDate.toISOString(),
          status: 'present'
        })
        .eq('id', latestRecord![0].id)
        .select('*')
        .single()

      if (error) throw error
      attendanceRecord = data
    }

    return {
      success: true,
      record: attendanceRecord,
      user: user,
      company: userCompany.companies
    }

  } catch (error) {
    console.error('勤怠記録エラー:', error)
    return {
      success: false,
      error: '❌ 記録の保存に失敗しました。'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')
    
    if (!signature || !verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const events = JSON.parse(body).events

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        await handleTextMessage(event)
      } else if (event.type === 'postback') {
        await handlePostback(event)
      } else if (event.type === 'follow') {
        await handleFollow(event)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('LINE Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleTextMessage(event: any) {
  const { replyToken, source, message } = event
  const text = message.text.trim()
  const textLower = text.toLowerCase()
  
  // 勤怠記録のテキストメッセージ処理
  if (text === '出勤' || textLower === 'clock in' || textLower === 'clock_in') {
    await quickAttendanceAction(event, 'clock_in')
    return
  }
  
  if (text === '退勤' || textLower === 'clock out' || textLower === 'clock_out') {
    await quickAttendanceAction(event, 'clock_out')
    return
  }
  
  // 簡単な応答例
  if (textLower.includes('こんにちは') || textLower.includes('hello')) {
    await replyMessage(replyToken, '勤怠太郎です！\n会社連携はこちらから行えます。', true)
  } else if (textLower.includes('ヘルプ') || textLower.includes('help')) {
    await replyMessage(replyToken, 
      '🤖 勤怠太郎の使い方\n\n' +
      '1️⃣ 会社連携ボタンから会社と連携\n' +
      '2️⃣ 「出勤」「退勤」で勤怠記録\n' +
      '3️⃣ 管理者は全社員の勤怠管理が可能\n\n' +
      '「出勤」「退勤」とメッセージを送るか\n' +
      'リッチメニューをご利用ください。', 
      true
    )
  }
}

async function handlePostback(event: any) {
  const { replyToken, postback } = event
  const data = postback.data

  switch (data) {
    case 'action=company_link':
      await sendMiniAppMessage(replyToken, 'company_link', '会社連携')
      break
    case 'action=attendance':
      await sendMiniAppMessage(replyToken, 'attendance', '勤怠管理')
      break
    case 'action=help':
      await replyMessage(replyToken, 
        '🤖 勤怠太郎の使い方\n\n' +
        '📋 会社連携: 勤務先の会社と連携\n' +
        '⏰ 勤怠管理: 出勤・退勤・休憩の記録\n' +
        '📊 履歴確認: 過去の勤怠データを表示\n\n' +
        'ボタンをタップして機能をご利用ください。'
      )
      break
    case 'action=clock_in':
      await quickAttendanceAction(event, 'clock_in')
      break
    case 'action=clock_out':
      await quickAttendanceAction(event, 'clock_out')
      break
    default:
      break
  }
}

async function sendMiniAppMessage(replyToken: string, page: string, title: string) {
  const MINI_APP_URL = process.env.VERCEL_URL ? 
    `https://${process.env.VERCEL_URL}` : 
    'https://your-vercel-app.vercel.app'

  const message = {
    type: 'template',
    altText: `${title}を開く`,
    template: {
      type: 'buttons',
      text: `${title}画面を開きますか？`,
      actions: [
        {
          type: 'uri',
          label: `${title}を開く`,
          uri: `${MINI_APP_URL}/${page}`
        }
      ]
    }
  }

  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN!}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [message]
      })
    })
  } catch (error) {
    console.error('Failed to send LINE message:', error)
  }
}

async function quickAttendanceAction(event: any, action: string) {
  const { replyToken, source } = event
  const userId = source.userId

  try {
    // データベースに勤怠記録を保存
    const result = await recordAttendance(userId, action)
    
    if (result.success) {
      const actionNames: { [key: string]: string } = {
        'clock_in': '出勤',
        'clock_out': '退勤'
      }
      
      const actionName = actionNames[action] || action
      const timestamp = new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      const message = `✅ ${actionName}記録が完了しました\n\n` +
        `📅 日時: ${timestamp}\n` +
        `👤 ユーザー: ${result.user?.name || '名前未設定'}\n` +
        `🏢 会社: ${result.company?.name || '未連携'}\n\n` +
        `詳細な勤怠管理は画面でご確認ください。`
      
      await replyMessage(replyToken, message)
    } else {
      await replyMessage(replyToken, result.error || '記録に失敗しました。会社連携を確認してください。')
    }
  } catch (error) {
    console.error('勤怠記録エラー:', error)
    await replyMessage(replyToken, 'エラーが発生しました。しばらく後にもう一度お試しください。')
  }
}

async function handleFollow(event: any) {
  const { replyToken } = event
  
  await replyMessage(replyToken,
    '勤怠太郎をご利用いただき、ありがとうございます！\n\n' +
    '📋 まずは会社連携から始めましょう\n' +
    '⏰ 出勤・退勤の記録が簡単にできます\n' +
    '👥 管理者機能もご利用いただけます\n\n' +
    'メニューボタンからご利用ください。',
    true
  )
}

async function replyMessage(replyToken: string, text: string, showLinkButton = false) {
  const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!
  
  let message: any = {
    type: 'text',
    text
  }

  if (showLinkButton) {
    message = {
          type: 'template',
          altText: text,
          template: {
            type: 'buttons',
            text: text,
            actions: [
              {
                type: 'postback',
                label: '会社連携',
                data: 'action=company_link'
              },
              {
                type: 'postback',
                label: '勤怠記録',
                data: 'action=attendance'
              }
            ]
          }
        }
  }

  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [message]
      })
    })
  } catch (error) {
    console.error('Failed to send LINE message:', error)
  }
}