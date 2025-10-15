// LINEリッチメニュー設定スクリプト
// このファイルはLINE Developersコンソールで手動実行するか、CI/CDで実行します

const CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN'
const LIFF_URL = 'https://your-domain.com' // 実際のドメインに置き換え

// リッチメニューの設定
const richMenu = {
  size: {
    width: 2500,
    height: 1686
  },
  selected: false,
  name: "勤怠太郎メニュー",
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
        type: "postback",
        data: "action=company_link"
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
        uri: `${LIFF_URL}/attendance`
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
        type: "postback",
        data: "action=help"
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
        uri: `${LIFF_URL}/attendance`
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
        uri: `${LIFF_URL}/attendance`
      }
    }
  ]
}

// リッチメニューを作成する関数
async function createRichMenu() {
  try {
    // 1. リッチメニューを作成
    const createResponse = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(richMenu)
    })

    const createResult = await createResponse.json()
    const richMenuId = createResult.richMenuId

    console.log('Created Rich Menu ID:', richMenuId)

    // 2. 画像をアップロード（実際の画像ファイルが必要）
    // const imageData = fs.readFileSync('richmenu-image.jpg')
    // const uploadResponse = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'image/jpeg',
    //     'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
    //   },
    //   body: imageData
    // })

    // 3. デフォルトのリッチメニューに設定
    const setDefaultResponse = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      }
    })

    console.log('Set as default rich menu')

    return richMenuId
  } catch (error) {
    console.error('Error creating rich menu:', error)
  }
}

// 使用例（Node.js環境で実行）
// createRichMenu()

export { createRichMenu, richMenu }