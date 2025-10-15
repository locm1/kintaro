// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');

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
  selected: false,
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
        type: "uri",
        uri: `${MINI_APP_BASE_URL}/attendance?action=clock_in`
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
        type: "uri",
        uri: `${MINI_APP_BASE_URL}/attendance?action=clock_out`
      }
    }
  ]
};

async function createRichMenu() {
  try {
    // リッチメニューを作成
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

    // 注意: 画像をアップロード後にデフォルト設定が必要
    console.log('⚠️  画像をアップロードするまでデフォルト設定はできません');
    console.log('');
    console.log('📸 次の手順:');
    console.log('1. LINE Developersコンソールにアクセス');
    console.log('2. チャネル設定 → リッチメニュー');
    console.log(`3. リッチメニューID: ${richMenuId} に画像をアップロード`);
    console.log('4. 画像サイズ: 2500×1686px (PNG/JPEG, 1MB以下)');
    console.log('');
    console.log('🔗 設定されたURL:');
    console.log('- 会社連携:', `${MINI_APP_BASE_URL}/link`);
    console.log('- 勤怠管理:', `${MINI_APP_BASE_URL}/attendance`);
    console.log('- ホーム:', `${MINI_APP_BASE_URL}/`);
    console.log('- 出勤:', `${MINI_APP_BASE_URL}/attendance?action=clock_in`);
    console.log('- 退勤:', `${MINI_APP_BASE_URL}/attendance?action=clock_out`);
  } catch (error) {
    console.error('エラー:', error.response?.data || error.message);
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
    console.log('  node setup-richmenu-miniapp.js create              - リッチメニューを作成');
    console.log('  node setup-richmenu-miniapp.js list                - リッチメニュー一覧を表示');
    console.log('  node setup-richmenu-miniapp.js delete <id>         - リッチメニューを削除');
    console.log('  node setup-richmenu-miniapp.js set-default <id>    - リッチメニューをデフォルトに設定');
    console.log('');
    console.log('💡 手順:');
    console.log('  1. create でリッチメニューを作成');
    console.log('  2. LINE Developersで画像をアップロード');
    console.log('  3. set-default でデフォルト設定');
}

module.exports = { createRichMenu, listRichMenus, deleteRichMenu };