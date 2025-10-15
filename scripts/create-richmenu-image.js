const fs = require('fs');
const { createCanvas } = require('canvas');

// Canvas がインストールされていない場合は npm install canvas が必要
// この関数は簡単なリッチメニュー画像を生成します

function createRichMenuImage() {
  // 2500x1686のキャンバスを作成
  const canvas = createCanvas(2500, 1686);
  const ctx = canvas.getContext('2d');

  // 背景色を設定
  ctx.fillStyle = '#2563eb'; // 青色
  ctx.fillRect(0, 0, 2500, 1686);

  // 区切り線を描画
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  
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

  // テキストを描画
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';

  // 上段のテキスト
  ctx.fillText('会社連携', 416, 450);
  ctx.fillText('勤怠管理', 1250, 450);
  ctx.fillText('ホーム', 2084, 450);

  // 下段のテキスト
  ctx.fillText('出勤', 625, 1300);
  ctx.fillText('退勤', 1875, 1300);

  // 絵文字を描画
  ctx.font = 'bold 120px sans-serif';
  ctx.fillText('🏢', 416, 350);
  ctx.fillText('⏰', 1250, 350);
  ctx.fillText('🏠', 2084, 350);
  ctx.fillText('☀️', 625, 1200);
  ctx.fillText('🌙', 1875, 1200);

  // PNGとして保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('richmenu_image.png', buffer);
  console.log('✅ リッチメニュー画像を生成しました: richmenu_image.png');
  console.log('📏 サイズ: 2500x1686px');
  console.log('📁 ファイルサイズ:', Math.round(buffer.length / 1024), 'KB');
}

// 実行
try {
  createRichMenuImage();
} catch (error) {
  console.error('❌ 画像生成エラー:', error.message);
  console.log('💡 以下のコマンドでcanvasパッケージをインストールしてください:');
  console.log('npm install canvas');
  console.log('');
  console.log('🎨 または、オンラインツールで手動作成してください:');
  console.log('- サイズ: 2500 × 1686 pixels');
  console.log('- フォーマット: PNG または JPEG');
  console.log('- ファイルサイズ: 1MB以下');
}