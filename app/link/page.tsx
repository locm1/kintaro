'use client'

import { useState, useEffect } from 'react'
import { initLineMiniApp, getLineMiniAppProfile, isLineMiniAppAvailable, createMockLineMiniApp } from '@/lib/liff'
import { supabase } from '@/lib/supabase'
import { Building2, Users, ShieldCheck } from 'lucide-react'

interface Company {
  id: string
  name: string
  code: string
}

export default function CompanyLinkPage() {
  const [isLineMiniAppReady, setIsLineMiniAppReady] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [companyCode, setCompanyCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const initializeLineMiniApp = async () => {
      // 開発環境でのモック作成
      if (process.env.NODE_ENV === 'development' && !isLineMiniAppAvailable()) {
        createMockLineMiniApp()
      }
      
      const success = await initLineMiniApp()
      if (success) {
        setIsLineMiniAppReady(true)
        const profile = await getLineMiniAppProfile()
        setUserProfile(profile)
        
        // SupabaseでユーザーIDを生成または取得
        const lineUserId = profile?.userId
        if (lineUserId) {
          // 既存ユーザーをチェック
          const response = await fetch(`/api/users?lineUserId=${lineUserId}`)
          const data = await response.json()
          
          if (data.user) {
            setMessage('すでに会社と連携済みです')
            return
          }
          
          // 新規ユーザーの場合、Supabase Authでユーザーを作成
          const { data: authData, error } = await supabase.auth.signUp({
            email: `${lineUserId}@line.local`,
            password: Math.random().toString(36),
          })
          
          if (authData.user) {
            setUserId(authData.user.id)
          }
        }
        
        loadCompanies()
      }
    }

    initializeLineMiniApp()
  }, [])

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies')
      const data = await response.json()
      setCompanies(data.companies || [])
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const handleLinkCompany = async () => {
    if (!companyCode.trim()) {
      setMessage('会社コードを入力してください')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/companies/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          companyCode: companyCode.trim().toUpperCase(),
          lineUserId: userProfile?.userId
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage(`${data.company.name}との連携が完了しました！`)
        setCompanyCode('')
      } else {
        setMessage(data.error || '連携に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      setMessage('会社名を入力してください')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCompanyName.trim(),
          adminUserId: userId,
          lineUserId: userProfile?.userId
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage(`${data.company.name}を登録しました！会社コード: ${data.company.code}`)
        setNewCompanyName('')
        setShowAdminForm(false)
        loadCompanies()
      } else {
        setMessage(data.error || '会社登録に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isLineMiniAppReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">LINE Mini App 初期化中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">勤怠太郎</h1>
          <p className="text-gray-600 mt-2">会社連携</p>
        </div>

        {userProfile && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center space-x-3">
              <img 
                src={userProfile.pictureUrl} 
                alt="Profile" 
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-semibold">{userProfile.displayName}</p>
                <p className="text-sm text-gray-600">ようこそ！</p>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}

        {!showAdminForm ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold">会社と連携</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    会社コード
                  </label>
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    placeholder="会社コードを入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
                
                <button
                  onClick={handleLinkCompany}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700 transition"
                >
                  {isLoading ? '連携中...' : '会社と連携'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <ShieldCheck className="w-5 h-5 text-purple-600 mr-2" />
                <h2 className="text-lg font-semibold">管理者の方</h2>
              </div>
              
              <button
                onClick={() => setShowAdminForm(true)}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                会社を新規登録
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <ShieldCheck className="w-5 h-5 text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold">新しい会社を登録</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会社名
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="会社名を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateCompany}
                  disabled={isLoading}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 hover:bg-purple-700 transition"
                >
                  {isLoading ? '登録中...' : '会社を登録'}
                </button>
                
                <button
                  onClick={() => setShowAdminForm(false)}
                  disabled={isLoading}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-600 transition"
                >
                  戻る
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}