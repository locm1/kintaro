# 勤怠太郎 - LINE勤怠管理システム

LINEミニアプリを使用した勤怠管理システムです。Supabaseをバックエンドとして使用し、LINE Mini App SDKを活用しています。

## 機能一覧

### 基本機能
- 📱 LINEミニアプリでの操作
- 🏢 会社の新規登録・連携
- ⏰ 出勤・退勤時刻の記録
- ☕ 休憩開始・終了時刻の記録
- 📊 勤怠履歴の確認

### 管理者機能
- 👥 全社員の勤怠データ管理
- ✏️ 勤怠記録の編集・修正
- 🔧 会社設定の管理

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **LINE連携**: LINE Mini App SDK, LINE Messaging API
- **デプロイ**: Vercel推奨

## セットアップ

### 1. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LINE
NEXT_PUBLIC_LIFF_ID=your-liff-id
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
LINE_CHANNEL_SECRET=your-channel-secret
```

### 2. Supabaseの設定

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. `database/schema.sql`のSQLを実行してテーブルを作成
3. Row Level Security (RLS) が有効化されていることを確認

### 3. LINE Developersの設定

1. [LINE Developers](https://developers.line.biz/)でプロバイダーとチャネルを作成
2. Messaging API設定でWebhook URLを設定: `https://your-domain.com/api/line/webhook`
3. LINE Mini App を作成し、エンドポイント URL を設定: `https://your-domain.com`
4. リッチメニューを設定（`scripts/setup-richmenu-miniapp.js`を参考）

### 4. 依存関係のインストール

```bash
npm install
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

## デプロイ

### Vercelでのデプロイ

1. GitHubリポジトリをVercelに連携
2. 環境変数を設定
3. 自動デプロイを有効化

### その他のプラットフォーム

Next.jsアプリケーションなので、Netlify、Railway、AWS等でもデプロイ可能です。

## 使用方法

### 初回セットアップ
1. LINE公式アカウント「勤怠太郎」を友だち追加
2. 会社連携ボタンから会社コードで連携、または新規会社を登録
3. 管理者の場合は会社登録画面で新しい会社を作成

### 日常の勤怠記録
1. LINEアプリから「勤怠太郎」を開く
2. リッチメニューまたはボタンで出勤・退勤・休憩を記録
3. 勤怠履歴で過去の記録を確認

### 管理者操作
1. 全社員の勤怠データを一覧表示
2. 個別の勤怠記録を編集・修正
3. 会社設定の管理

## ディレクトリ構造

```
kintaro/
├── app/
│   ├── api/                 # APIルート
│   │   ├── companies/       # 会社関連API
│   │   ├── attendance/      # 勤怠記録API
│   │   ├── users/           # ユーザー関連API
│   │   └── line/            # LINE Webhook API
│   ├── link/                # 会社連携画面
│   ├── attendance/          # 勤怠管理画面
│   └── page.tsx             # ホーム画面
├── lib/
│   ├── supabase.ts          # Supabaseクライアント
│   └── liff.ts              # LIFF SDK設定
├── database/
│   └── schema.sql           # データベーススキーマ
├── scripts/
│   └── setup-richmenu-miniapp.js    # リッチメニュー設定
└── .env.local               # 環境変数
```

## 開発・カスタマイズ

### 新しいAPIエンドポイントの追加
`app/api/`ディレクトリに新しいルートハンドラーを作成してください。

### UIのカスタマイズ
Tailwind CSSを使用してスタイリングをカスタマイズできます。

### データベーススキーマの変更
`database/schema.sql`を更新し、`lib/supabase.ts`の型定義も合わせて更新してください。

## トラブルシューティング

### よくある問題

1. **LIFFが初期化されない**
   - LIFF IDが正しく設定されているか確認
   - HTTPSでアクセスしているか確認

2. **Supabaseの接続エラー**
   - URLとAPIキーが正しく設定されているか確認
   - RLSポリシーが適切に設定されているか確認

3. **LINE Webhookが動作しない**
   - Webhook URLが正しく設定されているか確認
   - チャネルシークレットが正しく設定されているか確認

## ライセンス

このプロジェクトはMITライセンスで公開されています。

## 貢献

プルリクエストやイシューの報告を歓迎します。