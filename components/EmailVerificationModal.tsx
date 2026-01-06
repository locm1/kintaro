'use client'

import { useState, useEffect } from 'react'
import { Mail, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface EmailVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  currentEmail?: string | null
  emailVerified?: boolean
  onVerified?: () => void
}

export default function EmailVerificationModal({
  isOpen,
  onClose,
  userId,
  currentEmail,
  emailVerified,
  onVerified
}: EmailVerificationModalProps) {
  const [email, setEmail] = useState(currentEmail || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState<'input' | 'sent'>('input')

  useEffect(() => {
    if (currentEmail) {
      setEmail(currentEmail)
    }
  }, [currentEmail])

  useEffect(() => {
    // モーダルが開いた時、既に認証済みの場合は閉じる
    if (isOpen && emailVerified) {
      onClose()
    }
  }, [isOpen, emailVerified, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'エラーが発生しました')
        return
      }

      setSuccess(true)
      setStep('sent')
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'エラーが発生しました')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        {/* 閉じるボタン（スキップ可能な場合のみ表示） */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'input' ? (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                メールアドレスの登録
              </h2>
              <p className="text-gray-600 text-sm">
                勤怠情報の通知を受け取るためにメールアドレスを登録してください
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  placeholder="example@email.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    送信中...
                  </>
                ) : (
                  '認証メールを送信'
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition"
              >
                後で登録する
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                認証メールを送信しました
              </h2>
              <p className="text-gray-600 text-sm mb-2">
                <span className="font-medium text-gray-800">{email}</span>
                <br />
                宛に認証メールを送信しました
              </p>
              <p className="text-gray-500 text-xs">
                メール内のリンクをクリックして認証を完了してください。
                <br />
                リンクは24時間有効です。
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    送信中...
                  </>
                ) : (
                  'メールを再送信'
                )}
              </button>

              <button
                onClick={() => setStep('input')}
                className="w-full py-2 text-indigo-600 text-sm hover:text-indigo-700 transition"
              >
                メールアドレスを変更
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition"
              >
                閉じる
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
