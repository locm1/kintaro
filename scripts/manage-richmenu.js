#!/usr/bin/env node

// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');
const readline = require('readline');

// 環境変数から取得
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// コンソール入力用のインターフェース
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 環境変数チェック
if (!CHANNEL_ACCESS_TOKEN) {
  console.error('❌ LINE_CHANNEL_ACCESS_TOKEN が設定されていません');
  console.log('💡 .env.local ファイルに以下を設定してください:');
  console.log('LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token');
  process.exit(1);
}

// リッチメニューの一覧を取得
async function getRichMenus() {
  try {
    const response = await axios.get('https://api.line.me/v2/bot/richmenu/list', {
      headers: {
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      }
    });
    
    return response.data.richmenus || [];
  } catch (error) {
    console.error('❌ リッチメニューの取得に失敗しました:', error.response?.data || error.message);
    return [];
  }
}

// 現在のデフォルトリッチメニューを取得
async function getDefaultRichMenu() {
  try {
    const response = await axios.get('https://api.line.me/v2/bot/user/all/richmenu', {
      headers: {
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      }
    });
    
    return response.data.richMenuId || null;
  } catch (error) {
    // デフォルトが設定されていない場合は404エラーになる
    if (error.response?.status === 404) {
      return null;
    }
    console.error('❌ デフォルトリッチメニューの取得に失敗しました:', error.response?.data || error.message);
    return null;
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
    
    return true;
  } catch (error) {
    console.error('❌ デフォルト設定に失敗しました:', error.response?.data || error.message);
    if (error.response?.data?.message?.includes('upload richmenu image')) {
      console.log('💡 このリッチメニューには画像がアップロードされていません');
    }
    return false;
  }
}

// デフォルトリッチメニューを解除
async function removeDefaultRichMenu() {
  try {
    await axios.delete('https://api.line.me/v2/bot/user/all/richmenu', {
      headers: {
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ デフォルト解除に失敗しました:', error.response?.data || error.message);
    return false;
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
    
    return true;
  } catch (error) {
    console.error('❌ 削除に失敗しました:', error.response?.data || error.message);
    return false;
  }
}

// 日付フォーマット
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// リッチメニュー一覧を表示
function displayRichMenus(richMenus, defaultRichMenuId) {
  console.log('\n📋 リッチメニュー一覧:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (richMenus.length === 0) {
    console.log('リッチメニューが見つかりませんでした');
    return;
  }

  richMenus.forEach((menu, index) => {
    const isDefault = menu.richMenuId === defaultRichMenuId;
    const defaultMark = isDefault ? '⭐ ' : '   ';
    const statusText = isDefault ? '(デフォルト)' : '';
    
    console.log(`${defaultMark}${index + 1}. ${menu.name} ${statusText}`);
    console.log(`     ID: ${menu.richMenuId}`);
    console.log(`     チャットバーテキスト: ${menu.chatBarText}`);
    console.log(`     サイズ: ${menu.size.width}×${menu.size.height}`);
    console.log(`     エリア数: ${menu.areas.length}`);
    
    if (menu.areas && menu.areas.length > 0) {
      console.log(`     アクション:`);
      menu.areas.forEach((area, areaIndex) => {
        const action = area.action;
        let actionText = '';
        
        switch (action.type) {
          case 'uri':
            actionText = `URI: ${action.uri}`;
            break;
          case 'message':
            actionText = `メッセージ: ${action.text}`;
            break;
          case 'postback':
            actionText = `ポストバック: ${action.data}`;
            break;
          default:
            actionText = `タイプ: ${action.type}`;
        }
        
        console.log(`       ${areaIndex + 1}. ${actionText}`);
      });
    }
    
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// ユーザー入力を取得
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// メイン処理
async function main() {
  console.log('🤖 LINEリッチメニュー管理ツール');
  console.log('=======================================\n');
  
  while (true) {
    // リッチメニューと現在のデフォルトを取得
    const richMenus = await getRichMenus();
    const defaultRichMenuId = await getDefaultRichMenu();
    
    // リッチメニュー一覧を表示
    displayRichMenus(richMenus, defaultRichMenuId);
    
    if (richMenus.length === 0) {
      console.log('\nリッチメニューがありません。');
      console.log('まず setup-richmenu-miniapp.js を実行してリッチメニューを作成してください。');
      break;
    }
    
    console.log('\n📝 操作を選択してください:');
    console.log('  1. デフォルトリッチメニューを設定');
    console.log('  2. デフォルトリッチメニューを解除');
    console.log('  3. リッチメニューを削除 (例: 1 または 1,2,3 で複数選択)');
    console.log('  4. 最新情報に更新');
    console.log('  5. 終了');
    
    const choice = await askQuestion('\n番号を入力してください (1-5): ');
    
    switch (choice) {
      case '1':
        // デフォルト設定
        console.log('\nデフォルトに設定するリッチメニューの番号を入力してください:');
        const setIndex = await askQuestion('番号: ');
        const setIndexNum = parseInt(setIndex) - 1;
        
        if (setIndexNum >= 0 && setIndexNum < richMenus.length) {
          const selectedMenu = richMenus[setIndexNum];
          console.log(`\n"${selectedMenu.name}" をデフォルトに設定しています...`);
          
          const success = await setDefaultRichMenu(selectedMenu.richMenuId);
          if (success) {
            console.log('✅ デフォルトリッチメニューを設定しました!');
          }
        } else {
          console.log('❌ 無効な番号です');
        }
        break;
        
      case '2':
        // デフォルト解除
        if (defaultRichMenuId) {
          console.log('\nデフォルトリッチメニューを解除しています...');
          const success = await removeDefaultRichMenu();
          if (success) {
            console.log('✅ デフォルトリッチメニューを解除しました');
          }
        } else {
          console.log('❌ 現在デフォルトに設定されているリッチメニューはありません');
        }
        break;
        
      case '3':
        // 削除（複数対応）
        console.log('\n削除するリッチメニューの番号を入力してください:');
        console.log('💡 単体削除の例: 1');
        console.log('💡 複数削除の例: 1,3,5 または 1, 2, 3 (スペースあり可)');
        const deleteInput = await askQuestion('番号: ');
        
        // カンマ区切りで分割して数値に変換
        const deleteNumbers = deleteInput.split(',').map(num => parseInt(num.trim()) - 1);
        const validNumbers = deleteNumbers.filter(num => num >= 0 && num < richMenus.length);
        const invalidNumbers = deleteNumbers.filter(num => num < 0 || num >= richMenus.length);
        
        if (invalidNumbers.length > 0) {
          console.log('❌ 無効な番号があります:', invalidNumbers.map(n => n + 1).join(', '));
          if (validNumbers.length === 0) {
            break;
          }
        }
        
        if (validNumbers.length === 0) {
          console.log('❌ 有効な番号がありません');
          break;
        }
        
        // 選択されたリッチメニューを表示
        const selectedMenus = validNumbers.map(index => richMenus[index]);
        console.log('\n📋 削除対象のリッチメニュー:');
        selectedMenus.forEach((menu, i) => {
          const isDefault = menu.richMenuId === defaultRichMenuId;
          const defaultMark = isDefault ? ' ⭐(デフォルト)' : '';
          console.log(`  ${i + 1}. ${menu.name}${defaultMark}`);
        });
        
        const confirm = await askQuestion(`\n${selectedMenus.length}個のリッチメニューを削除しますか? (y/N): `);
        
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
          console.log(`\n${selectedMenus.length}個のリッチメニューを削除しています...`);
          
          let successCount = 0;
          let failCount = 0;
          
          for (const menu of selectedMenus) {
            console.log(`🗑️  "${menu.name}" を削除中...`);
            const success = await deleteRichMenu(menu.richMenuId);
            
            if (success) {
              successCount++;
              console.log(`   ✅ 削除完了`);
            } else {
              failCount++;
              console.log(`   ❌ 削除失敗`);
            }
          }
          
          console.log(`\n📊 削除結果: 成功 ${successCount}個, 失敗 ${failCount}個`);
          
          if (successCount > 0) {
            console.log('✅ 削除処理が完了しました');
          }
        } else {
          console.log('キャンセルしました');
        }
        break;
        
      case '4':
        // 更新
        console.log('\n🔄 最新情報を取得しています...');
        continue;
        
      case '5':
        // 終了
        console.log('\n👋 終了します');
        rl.close();
        return;
        
      default:
        console.log('❌ 無効な選択です');
    }
    
    // 次の操作のために一時停止
    await askQuestion('\nEnterキーを押して続行...');
    console.clear();
  }
  
  rl.close();
}

// スクリプト実行
if (require.main === module) {
  main().catch((error) => {
    console.error('予期しないエラーが発生しました:', error);
    rl.close();
    process.exit(1);
  });
}

module.exports = {
  getRichMenus,
  getDefaultRichMenu,
  setDefaultRichMenu,
  removeDefaultRichMenu,
  deleteRichMenu
};