import { supabaseAdmin } from '@/lib/supabase-admin'

export interface NotificationData {
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'change_request'
  employeeName: string
  companyName: string
  timestamp: string
  additionalInfo?: string
}

const actionLabels: Record<string, string> = {
  clock_in: '出勤',
  clock_out: '退勤',
  break_start: '休憩開始',
  break_end: '休憩終了',
  change_request: '勤怠変更申請'
}

/**
 * 会社の管理者にメール通知を送信
 */
export async function sendAdminNotification(
  companyId: string,
  data: NotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    // 会社の管理者を取得（メール認証済みの管理者のみ）
    const { data: adminUsers, error: fetchError } = await supabaseAdmin
      .from('user_companies')
      .select(`
        user_id,
        users!inner (
          id,
          name,
          email,
          email_verified
        )
      `)
      .eq('company_id', companyId)
      .eq('is_admin', true)

    if (fetchError) {
      console.error('Error fetching admin users:', fetchError)
      return { success: false, error: 'Failed to fetch admin users' }
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found for company:', companyId)
      return { success: true } // エラーではないので success を返す
    }

    // メール認証済みの管理者のみ抽出
    const verifiedAdmins = adminUsers.filter((uc: any) => {
      const user = uc.users
      return user?.email && user?.email_verified
    })

    if (verifiedAdmins.length === 0) {
      console.log('No verified admin emails for company:', companyId)
      return { success: true }
    }

    // メール送信
    const actionLabel = actionLabels[data.type] || data.type
    const timestamp = new Date(data.timestamp).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const subject = `【${data.companyName}】${data.employeeName}さんが${actionLabel}しました`
    
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
          勤怠通知
        </h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-size: 16px;">
            <strong>${data.employeeName}</strong>さんが<strong style="color: #4F46E5;">${actionLabel}</strong>しました
          </p>
          <p style="margin: 0; color: #666; font-size: 14px;">
            ${timestamp}
          </p>
          ${data.additionalInfo ? `
            <p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #ddd; font-size: 14px;">
              ${data.additionalInfo}
            </p>
          ` : ''}
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 30px;">
          この通知は${data.companyName}の勤怠管理システムから自動送信されています。
        </p>
      </div>
    `

    // Resendでメール送信
    if (process.env.RESEND_API_KEY) {
      for (const admin of verifiedAdmins) {
        const user = admin.users as any
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
              to: user.email,
              subject: subject,
              html: htmlContent
            })
          })

          if (!response.ok) {
            console.error('Failed to send notification email:', await response.text())
          } else {
            console.log('✅ Notification email sent to:', user.email)
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError)
        }
      }
    } else {
      // 開発環境では コンソールに出力
      console.log('===========================================')
      console.log('📧 管理者通知メール')
      console.log('To:', verifiedAdmins.map((a: any) => a.users.email).join(', '))
      console.log('Subject:', subject)
      console.log('Content:', data)
      console.log('===========================================')
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending admin notification:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}

/**
 * 勤怠アクション時に管理者へ通知を送信
 */
export async function notifyAttendanceAction(
  userId: string,
  companyId: string,
  action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
): Promise<void> {
  try {
    // ユーザーと会社情報を取得
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', userId)
      .single()

    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    if (userError || companyError || !userData || !companyData) {
      console.error('Error fetching user/company data for notification')
      return
    }

    await sendAdminNotification(companyId, {
      type: action,
      employeeName: userData.name || 'Unknown',
      companyName: companyData.name,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in notifyAttendanceAction:', error)
  }
}

/**
 * 勤怠変更申請時に管理者へ通知を送信
 */
export async function notifyChangeRequest(
  userId: string,
  companyId: string,
  requestDate: string,
  reason?: string
): Promise<void> {
  try {
    // ユーザーと会社情報を取得
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', userId)
      .single()

    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    if (userError || companyError || !userData || !companyData) {
      console.error('Error fetching user/company data for notification')
      return
    }

    await sendAdminNotification(companyId, {
      type: 'change_request',
      employeeName: userData.name || 'Unknown',
      companyName: companyData.name,
      timestamp: new Date().toISOString(),
      additionalInfo: `対象日: ${requestDate}${reason ? `<br>理由: ${reason}` : ''}`
    })
  } catch (error) {
    console.error('Error in notifyChangeRequest:', error)
  }
}
