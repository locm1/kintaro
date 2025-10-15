# LINEミニアプリ エンドポイントURL設定ガイド

## 🎯 設定場所

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. プロバイダーを選択
3. 「勤太郎 ~勤怠管理KINTARO~」チャネルを選択
4. 左メニューから「LINE Mini App」を選択

## 🌐 エンドポイントURL設定

### 本番環境（推奨）
```
https://your-app-name.vercel.app
```

### 開発環境（テスト用）
```
https://abc123.ngrok.io
```

## 📋 設定項目

### 基本設定
- **エンドポイントURL**: デプロイ先のURL
- **説明**: 勤怠管理システム
- **アイコン**: アプリアイコン（任意）

### 権限設定
- ✅ `profile` - ユーザープロフィール情報
- ✅ `openid` - OpenID Connect

### スコープ設定
- ✅ プロフィール情報の取得
- ✅ ユーザーID取得

## 🔄 本番デプロイ手順

### 1. Vercelにデプロイ

```bash
# Vercel CLIをインストール
npm install -g vercel

# プロジェクトをデプロイ
vercel

# 環境変数を設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_LINE_MINI_APP_ID
vercel env add NEXT_PUBLIC_MINI_APP_URL
vercel env add LINE_CHANNEL_ACCESS_TOKEN
vercel env add LINE_CHANNEL_SECRET

# 再デプロイ
vercel --prod
```

### 2. エンドポイントURL更新

デプロイ完了後のURL（例：`https://kintaro-abc123.vercel.app`）を
LINE DevelopersのミニアプリエンドポイントURLに設定

### 3. 環境変数の更新

`.env.local`の本番URL更新:
```bash
NEXT_PUBLIC_MINI_APP_URL=https://miniapp.line.me/2008291793-4VVZo0oN
```

VercelのURL更新:
```bash
NEXT_PUBLIC_VERCEL_URL=https://kintaro-abc123.vercel.app
```

## 🧪 開発環境での設定

### ngrok使用時

```bash
# 1. Next.jsアプリを起動
npm run dev

# 2. 別ターミナルでngrok起動
ngrok http 3000

# 3. 表示されたHTTPS URLをコピー
# 例: https://abc123.ngrok.io

# 4. LINE Developersでエンドポイントを更新
```

### ローカルホスト（非推奨）

LINEミニアプリはHTTPSが必須のため、`http://localhost:3000`は使用できません。

## ⚠️ 注意事項

### セキュリティ
- 必ずHTTPS URLを使用
- 本番環境では独自ドメインを推奨
- 環境変数は適切に管理

### キャッシュ
- エンドポイントURL変更後、反映に時間がかかる場合あり
- LINEアプリのキャッシュクリアが必要な場合あり

### テスト
- エンドポイントURL変更後は必ずテスト実行
- リッチメニューからの遷移確認
- ユーザープロフィール取得テスト

## 🔍 確認方法

### 1. エンドポイントURLテスト
```bash
curl -I https://your-app-name.vercel.app
# HTTP/2 200 が返ることを確認
```

### 2. LINEミニアプリ動作確認
- LINE公式アカウントからリッチメニューをタップ
- ミニアプリが正常に開くことを確認
- ユーザープロフィールが取得できることを確認

### 3. 各機能テスト
- 会社連携機能
- 勤怠記録機能  
- 履歴表示機能