'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      // URLからトークンを取得（LIFFリダイレクト後のクエリパラメータから）
      const urlParams = new URLSearchParams(window.location.search)
      let token = urlParams.get('token')
      
      // pathパラメータからトークンを取得（Mini Appリダイレクト経由）
      const path = urlParams.get('path')
      if (path?.includes('token=')) {
        const pathParams = new URLSearchParams(path.split('?')[1])
        token = pathParams.get('token') || token
      }

      // liff.stateからもトークンを検索
      const liffState = urlParams.get('liff.state')
      if (liffState) {
        try {
          const decodedState = decodeURIComponent(liffState)
          const stateParams = new URLSearchParams(decodedState.replace(/^\?/, ''))
          token = stateParams.get('token') || token
        } catch (e) {
          console.error('Error decoding liff.state:', e)
        }
      }

      if (!token) {
        setStatus('error')
        setErrorMessage('認証トークンが見つかりません')
        return
      }

      try {
        // トークンの検証
        const response = await fetch('/api/email-verification/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const data = await response.json()

        if (!response.ok) {
          if (data.expired) {
            setStatus('expired')
          } else {
            setStatus('error')
            setErrorMessage(data.error || '認証に失敗しました')
          }
          return
        }

        setEmail(data.email)
        setStatus('success')
      } catch (error) {
        console.error('Verification error:', error)
        setStatus('error')
        setErrorMessage('通信エラーが発生しました')
      }
    }

    verifyEmail()
  }, [])

  const handleContinue = () => {
    // Mini AppのホームURLにリダイレクト
    const miniAppUrl = process.env.NEXT_PUBLIC_MINI_APP_URL
    if (miniAppUrl) {
      window.location.href = miniAppUrl
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">認証中...</h2>
            <p className="text-gray-600">メールアドレスを確認しています</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">認証完了！</h2>
            <p className="text-gray-600 mb-2">
              メールアドレスの認証が完了しました
            </p>
            {email && (
              <p className="text-indigo-600 font-medium mb-6">{email}</p>
            )}
            <button
              onClick={handleContinue}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              アプリに戻る
            </button>
          </div>
        )}

        {status === 'expired' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-12 h-12 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">有効期限切れ</h2>
            <p className="text-gray-600 mb-6">
              認証リンクの有効期限が切れています。
              <br />
              アプリから再度メールアドレスを登録してください。
            </p>
            <button
              onClick={handleContinue}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              アプリに戻る
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">認証エラー</h2>
            <p className="text-gray-600 mb-2">{errorMessage}</p>
            <p className="text-gray-500 text-sm mb-6">
              もう一度お試しいただくか、アプリから再度メールアドレスを登録してください。
            </p>
            <button
              onClick={handleContinue}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              アプリに戻る
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
