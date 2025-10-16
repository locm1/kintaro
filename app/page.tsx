'use client'

import { Building2, Users, Clock } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

export default function Home() {
  const { userProfile } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8 pt-20">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">勤怠太郎</h1>
          <p className="text-gray-600 text-lg">LINE勤怠管理システム</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">会社連携</h2>
            <p className="text-gray-600 mb-4">
              まずは勤務先の会社と連携しましょう
            </p>
            <Link
              href="/link"
              className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              会社連携を開始
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">勤怠管理</h2>
            <p className="text-gray-600 mb-4">
              出勤・退勤・休憩の記録ができます
            </p>
            <Link
              href="/attendance"
              className="inline-block bg-green-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              勤怠記録へ
            </Link>
          </div>

          {userProfile && (
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex items-center space-x-3">
                <img 
                  src={userProfile.pictureUrl || 'https://via.placeholder.com/50'} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-semibold text-gray-800">{userProfile.displayName}</p>
                  <p className="text-sm text-gray-600">LINEユーザー</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">機能一覧</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                会社の新規登録（管理者）
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                会社コードでの連携
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                出勤・退勤の記録
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                休憩時間の管理
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                勤怠履歴の確認・編集（管理者）
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}