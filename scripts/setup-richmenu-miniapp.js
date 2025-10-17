// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');
const fs = require('fs');
const { createCanvas } = require('canvas');

// 環境変数から取得
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const MINI_APP_ID = process.env.NEXT_PUBLIC_LINE_MINI_APP_ID;
const MINI_APP_BASE_URL = process.env.NEXT_PUBLIC_MINI_APP_URL || `https://miniapp.line.me/${MINI_APP_ID}-4VVZo0oN`;

// デバッグ用：環境変数の確認
console.log('環境変数チェック:');
console.log('MINI_APP_ID:', MINI_APP_ID ? '✓ 設定済み' : '✗ 未設定');
console.log('CHANNEL_ACCESS_TOKEN:', CHANNEL_ACCESS_TOKEN ? '✓ 設定済み' : '✗ 未設定');
console.log('MINI_APP_BASE_URL:', MINI_APP_BASE_URL);
console.log('---');

if (!CHANNEL_ACCESS_TOKEN) {
  console.error('❌ LINE_CHANNEL_ACCESS_TOKEN が設定されていません');
  console.log('💡 .env.local ファイルに以下を設定してください:');
  console.log('LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token');
  process.exit(1);
}

if (!MINI_APP_ID) {
  console.error('❌ NEXT_PUBLIC_LINE_MINI_APP_ID が設定されていません');
  console.log('💡 .env.local ファイルに以下を設定してください:');
  console.log('NEXT_PUBLIC_LINE_MINI_APP_ID=your-mini-app-id');
  process.exit(1);
}

// LINEミニアプリ用リッチメニューの設定
const richMenuData = {
  size: {
    width: 2500,
    height: 1686
  },
  selected: true,
  name: "勤怠太郎ミニアプリメニュー",
  chatBarText: "メニュー",
  areas: [
    {
      bounds: {
        x: 0,
        y: 0,
        width: 833,
        height: 843
      },
      action: {
        type: "uri",
        uri: `${MINI_APP_BASE_URL}/link`
      }
    },
    {
      bounds: {
        x: 833,
        y: 0,
        width: 834,
        height: 843
      },
      action: {
        type: "uri",
        uri: `${MINI_APP_BASE_URL}/attendance`
      }
    },
    {
      bounds: {
        x: 1667,
        y: 0,
        width: 833,
        height: 843
      },
      action: {
        type: "uri",
        uri: `${MINI_APP_BASE_URL}/`
      }
    },
    {
      bounds: {
        x: 0,
        y: 843,
        width: 1250,
        height: 843
      },
      action: {
        type: "message",
        text: "出勤"
      }
    },
    {
      bounds: {
        x: 1250,
        y: 843,
        width: 1250,
        height: 843
      },
      action: {
        type: "message",
        text: "退勤"
      }
    }
  ]
};

// リッチメニュー画像を生成
function generateRichMenuImage() {
  console.log('🎨 リッチメニュー画像を生成中...');
  
  // 2500x1686のキャンバスを作成
  const canvas = createCanvas(2500, 1686);
  const ctx = canvas.getContext('2d');

  // 背景のグラデーション
  const gradient = ctx.createLinearGradient(0, 0, 0, 1686);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2500, 1686);

  // 区切り線を描画
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  
  // 縦の区切り線（上段）
  ctx.beginPath();
  ctx.moveTo(833, 0);
  ctx.lineTo(833, 843);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(1667, 0);
  ctx.lineTo(1667, 843);
  ctx.stroke();

  // 横の区切り線
  ctx.beginPath();
  ctx.moveTo(0, 843);
  ctx.lineTo(2500, 843);
  ctx.stroke();

  // 縦の区切り線（下段）
  ctx.beginPath();
  ctx.moveTo(1250, 843);
  ctx.lineTo(1250, 1686);
  ctx.stroke();

  // 各エリアに背景色を追加
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  
  // 上段エリア（ホバー効果）
  ctx.fillRect(10, 10, 813, 823);
  ctx.fillRect(843, 10, 814, 823);
  ctx.fillRect(1677, 10, 813, 823);
  
  // 下段エリア
  ctx.fillRect(10, 853, 1230, 823);
  ctx.fillRect(1260, 853, 1230, 823);

  // テキストを描画
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 70px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 6;

  // 絵文字を描画
  ctx.font = 'bold 150px sans-serif';
  ctx.fillText('🏢', 416, 320);
  ctx.fillText('📊', 1250, 320);
  ctx.fillText('🏠', 2084, 320);
  ctx.fillText('⏰', 625, 1150);
  ctx.fillText('🌅', 1875, 1150);

  // テキストを描画
  ctx.font = 'bold 65px sans-serif';
  ctx.fillText('会社連携', 416, 500);
  ctx.fillText('勤怠管理', 1250, 500);
  ctx.fillText('ホーム', 2084, 500);

  ctx.font = 'bold 85px sans-serif';
  ctx.fillText('出勤', 625, 1350);
  ctx.fillText('退勤', 1875, 1350);

  // 影をリセット
  ctx.shadowColor = 'transparent';

  return canvas.toBuffer('image/png');
}

// リッチメニューに画像をアップロード
async function uploadRichMenuImage(richMenuId, imageBuffer) {
  console.log('📤 画像をアップロード中...');
  console.log('📁 ファイルサイズ:', Math.round(imageBuffer.length / 1024), 'KB');

  try {
    await axios.post(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
          'Content-Type': 'image/png'
        }
      }
    );

    console.log('✅ 画像アップロード完了');
    return true;
  } catch (error) {
    console.error('❌ 画像アップロードエラー:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.log('💡 画像サイズやフォーマットを確認してください');
      console.log('   - サイズ: 2500×1686px');
      console.log('   - フォーマット: PNG/JPEG');
      console.log('   - ファイルサイズ: 1MB以下');
    }
    return false;
  }
}

async function createRichMenu() {
  try {
    // 1. リッチメニューを作成
    console.log('🔄 リッチメニューを作成中...');
    const response = await axios.post(
      'https://api.line.me/v2/bot/richmenu',
      richMenuData,
      {
        headers: {
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const richMenuId = response.data.richMenuId;
    console.log('✅ リッチメニューが作成されました');
    console.log('📋 リッチメニューID:', richMenuId);

    // 2. 画像を生成
    const imageBuffer = generateRichMenuImage();
    console.log('✅ 画像生成完了');

    // 3. 画像をアップロード
    const uploadSuccess = await uploadRichMenuImage(richMenuId, imageBuffer);
    
    if (!uploadSuccess) {
      console.log('❌ 画像アップロードに失敗しました');
      return;
    }

    // 4. デフォルトリッチメニューに設定
    console.log('🔄 デフォルトリッチメニューに設定中...');
    try {
      await axios.post(
        `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
          }
        }
      );
      
      console.log('✅ デフォルトリッチメニューに設定完了');
    } catch (defaultError) {
      console.error('❌ デフォルト設定エラー:', defaultError.response?.data || defaultError.message);
    }

    // 完了メッセージ
    console.log('');
    console.log('🎉 リッチメニューのセットアップが完了しました！');
    console.log('📱 LINE公式アカウントを確認してください');
    console.log('💡 リッチメニューが表示されるまで数分かかる場合があります');
    console.log('');
    console.log('🔗 設定されたURL:');
    console.log('- 会社連携:', `${MINI_APP_BASE_URL}/link`);
    console.log('- 勤怠管理:', `${MINI_APP_BASE_URL}/attendance`);
    console.log('- ホーム:', `${MINI_APP_BASE_URL}/`);
    console.log('- 出勤: 「出勤」メッセージを送信');
    console.log('- 退勤: 「退勤」メッセージを送信');
    
  } catch (error) {
    console.error('❌ リッチメニュー作成エラー:', error.response?.data || error.message);
  }
}

// リッチメニューの一覧を取得
async function listRichMenus() {
  try {
    const response = await axios.get('https://api.line.me/v2/bot/richmenu/list', {
      headers: {
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      }
    });
    
    console.log('既存のリッチメニュー:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('エラー:', error.response?.data || error.message);
  }
}

// リッチメニューを削除
async function deleteRichMenu(richMenuId) {
  try {
    await axios.delete(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
      headers: {
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      }
    });
    
    console.log(`✅ リッチメニュー ${richMenuId} を削除しました`);
  } catch (error) {
    console.error('❌ エラー:', error.response?.data || error.message);
  }
}

// リッチメニューをデフォルトに設定
async function setDefaultRichMenu(richMenuId) {
  try {
    await axios.post(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
      }
    );
    
    console.log(`✅ リッチメニュー ${richMenuId} をデフォルトに設定しました`);
  } catch (error) {
    console.error('❌ エラー:', error.response?.data || error.message);
    if (error.response?.data?.message?.includes('upload richmenu image')) {
      console.log('💡 画像をアップロードしてから再実行してください');
    }
  }
}

// コマンドライン引数で実行する機能を選択
const command = process.argv[2];
const richMenuId = process.argv[3];

switch (command) {
  case 'create':
    createRichMenu();
    break;
  case 'list':
    listRichMenus();
    break;
  case 'delete':
    if (!richMenuId) {
      console.log('❌ 削除するリッチメニューIDを指定してください');
      console.log('📖 使用方法: node setup-richmenu-miniapp.js delete <richMenuId>');
    } else {
      deleteRichMenu(richMenuId);
    }
    break;
  case 'set-default':
    if (!richMenuId) {
      console.log('❌ デフォルト設定するリッチメニューIDを指定してください');
      console.log('📖 使用方法: node setup-richmenu-miniapp.js set-default <richMenuId>');
    } else {
      setDefaultRichMenu(richMenuId);
    }
    break;
  default:
    console.log('📖 使用方法:');
    console.log('  node scripts/setup-richmenu-miniapp.js create              - リッチメニューを作成（画像付き・デフォルト設定込み）');
    console.log('  node scripts/setup-richmenu-miniapp.js list                - リッチメニュー一覧を表示');
    console.log('  node scripts/setup-richmenu-miniapp.js delete <id>         - リッチメニューを削除');
    console.log('  node scripts/setup-richmenu-miniapp.js set-default <id>    - リッチメニューをデフォルトに設定');
    console.log('');
    console.log('💡 簡単セットアップ:');
    console.log('  1. create でリッチメニューを作成（全て自動）');
    console.log('  2. 数分後にLINE公式アカウントで確認');
    console.log('');
    console.log('🎨 createコマンドの機能:');
    console.log('  ✅ リッチメニュー作成');
    console.log('  ✅ 画像自動生成');
    console.log('  ✅ 画像アップロード');
    console.log('  ✅ デフォルト設定');
}

module.exports = { createRichMenu, listRichMenus, deleteRichMenu };