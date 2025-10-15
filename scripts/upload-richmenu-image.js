// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const RICHMENU_ID = 'richmenu-14053b4e7c7fc558f12e390f2e7a2ac0';

async function uploadRichMenuImage() {
  try {
    // 画像ファイルを読み込み
    const imageBuffer = fs.readFileSync('richmenu_image.png');
    
    console.log('📸 画像をアップロード中...');
    console.log('📋 リッチメニューID:', RICHMENU_ID);
    console.log('📁 ファイルサイズ:', Math.round(imageBuffer.length / 1024), 'KB');

    // 画像をアップロード
    const response = await axios.post(
      `https://api-data.line.me/v2/bot/richmenu/${RICHMENU_ID}/content`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
          'Content-Type': 'image/png'
        }
      }
    );

    console.log('✅ 画像アップロード完了');

    // デフォルトリッチメニューに設定
    console.log('🔄 デフォルトリッチメニューに設定中...');
    await axios.post(
      `https://api.line.me/v2/bot/user/all/richmenu/${RICHMENU_ID}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    console.log('🎉 デフォルトリッチメニューに設定完了');
    console.log('');
    console.log('📱 LINE公式アカウントを確認してください');
    console.log('💡 リッチメニューが表示されるまで数分かかる場合があります');

  } catch (error) {
    console.error('❌ エラー:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('💡 画像サイズやフォーマットを確認してください');
      console.log('   - サイズ: 2500×1686px');
      console.log('   - フォーマット: PNG/JPEG');
      console.log('   - ファイルサイズ: 1MB以下');
    }
  }
}

// 実行
uploadRichMenuImage();