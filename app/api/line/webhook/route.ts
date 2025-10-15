import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!

// LINE Webhook署名検証
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64')
  
  return signature === hash
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
  const text = message.text.toLowerCase()
  
  // 簡単な応答例
  if (text.includes('こんにちは') || text.includes('hello')) {
    await replyMessage(replyToken, '勤怠太郎です！\n会社連携はこちらから行えます。', true)
  } else if (text.includes('ヘルプ') || text.includes('help')) {
    await replyMessage(replyToken, 
      '🤖 勤怠太郎の使い方\n\n' +
      '1️⃣ 会社連携ボタンから会社と連携\n' +
      '2️⃣ 出勤・退勤ボタンで勤怠記録\n' +
      '3️⃣ 管理者は全社員の勤怠管理が可能\n\n' +
      '詳しくはリッチメニューをご利用ください。', 
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

  // 簡易的な勤怠記録処理（実際のユーザー認証が必要）
  const actionNames: { [key: string]: string } = {
    'clock_in': '出勤',
    'clock_out': '退勤'
  }

  const actionName = actionNames[action] || action
  const message = `${actionName}記録を受け付けました。\n詳細な管理は勤怠管理画面をご利用ください。`
  await replyMessage(replyToken, message)
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