# リッチメニュー画像アップロード手順

## 🎯 現在の状況
- ✅ リッチメニュー作成済み
- ❌ 画像未アップロード
- ❌ デフォルト設定未完了

## 📸 画像アップロード手順

### 1. LINE Developersコンソールにアクセス
1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. プロバイダーを選択
3. 「勤太郎」チャネルを選択

### 2. リッチメニューページへ移動
1. 左メニューから「リッチメニュー」を選択
2. 作成済みのリッチメニューが表示されているか確認

### 3. 画像のアップロード
1. リッチメニューID: `richmenu-14053b4e7c7fc558f12e390f2e7a2ac0` を選択
2. 「画像をアップロード」ボタンをクリック
3. 2500×1686pxの画像ファイル（PNG/JPEG、1MB以下）を選択

### 4. デフォルト設定
画像アップロード後、以下のコマンドでデフォルトに設定：
```bash
node scripts/setup-richmenu-miniapp.js set-default richmenu-14053b4e7c7fc558f12e390f2e7a2ac0
```

## 🎨 簡単なリッチメニュー画像の作成

画像がない場合は、シンプルなテスト画像を作成できます：

### オンラインツール
- [Canva](https://www.canva.com/) - 2500×1686pxで作成
- [Figma](https://www.figma.com/) - 無料で使用可能
- [GIMP](https://www.gimp.org/) - 無料の画像編集ソフト

### レイアウト参考
```
┌─────────────┬─────────────┬─────────────┐
│   会社連携   │   勤怠管理   │   ホーム    │ 843px
│    🏢       │    ⏰       │    🏠      │
└─────────────┼─────────────┴─────────────┤
│      出勤     │         退勤            │ 843px  
│      ☀️      │         🌙             │
└─────────────┴─────────────────────────────┘
   833px    834px    833px    1250px   1250px
```

## ⚡ クイック画像作成コマンド

ImageMagickがインストールされている場合：
```bash
# 背景色付きの簡単なテスト画像を作成
convert -size 2500x1686 -background '#2563eb' \
  -fill white -font Arial -pointsize 72 \
  -draw "text 150,400 '会社連携'" \
  -draw "text 980,400 '勤怠管理'" \
  -draw "text 1850,400 'ホーム'" \
  -draw "text 400,1300 '出勤'" \
  -draw "text 1650,1300 '退勤'" \
  richmenu_test.png
```

## 🔍 トラブルシューティング

### リッチメニューが表示されない場合
1. **画像サイズ確認**: 必ず2500×1686px
2. **ファイルサイズ**: 1MB以下
3. **フォーマット**: PNG または JPEG
4. **デフォルト設定**: 画像アップロード後に必ず実行

### 確認コマンド
```bash
# リッチメニュー一覧
node scripts/setup-richmenu-miniapp.js list

# デフォルト設定確認
node -e "
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
axios.get('https://api.line.me/v2/bot/user/all/richmenu', {
  headers: { 'Authorization': \`Bearer \${process.env.LINE_CHANNEL_ACCESS_TOKEN}\` }
}).then(res => console.log('デフォルト:', res.data.richMenuId))
.catch(err => console.log('デフォルトなし'))
"
```