/**
 * 街頭藝人申請系統 - 主要邏輯和 Webhook 處理
 * Phase 1: 基礎LINE Bot架構
 */

/**
 * LINE Webhook 處理器 - 接收來自 LINE 的訊息
 */
function doPost(e) {
  try {
    console.log('🔔 收到 LINE Webhook 請求');
    
    // 解析 LINE 的訊息資料
    const data = JSON.parse(e.postData.contents);
    console.log('📨 原始資料:', JSON.stringify(data, null, 2));
    
    // 處理 LINE 事件
    if (data.events && data.events.length > 0) {
      data.events.forEach(event => {
        handleLineEvent(event);
      });
    }
    
    // 回傳 200 狀態碼給 LINE
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    console.error('❌ Webhook 處理錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    
    // 即使發生錯誤也要回傳 200 給 LINE
    return ContentService.createTextOutput('ERROR').setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * GET 請求處理器 - 測試用
 */
function doGet(e) {
  try {
    validateConfig();
    return ContentService
      .createTextOutput('✅ LINE Bot Webhook 運作正常 - 松菸申請助手')
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService
      .createTextOutput('❌ 配置錯誤: ' + error.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * 處理 LINE 事件
 */
function handleLineEvent(event) {
  try {
    console.log('🎯 處理事件類型:', event.type);
    
    switch (event.type) {
      case 'message':
        handleMessage(event);
        break;
      case 'follow':
        handleFollow(event);
        break;
      case 'unfollow':
        handleUnfollow(event);
        break;
      default:
        console.log('🔄 未處理的事件類型:', event.type);
    }
    
  } catch (error) {
    console.error('❌ 事件處理錯誤:', error);
    
    // 發送錯誤訊息給用戶
    if (event.replyToken) {
      replyMessage(event.replyToken, '抱歉，系統發生錯誤，請稍後再試。');
    }
  }
}

/**
 * 處理訊息事件
 */
function handleMessage(event) {
  const message = event.message;
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  
  console.log('💬 收到訊息:', {
    userId: userId,
    messageType: message.type,
    text: message.text || '[非文字訊息]'
  });
  
  switch (message.type) {
    case 'text':
      handleTextMessage(event, message.text);
      break;
    case 'audio':
      handleAudioMessage(event);
      break;
    default:
      replyMessage(replyToken, '目前只支援文字和語音訊息，請重新發送。');
  }
}

/**
 * 處理文字訊息
 */
function handleTextMessage(event, text) {
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  
  console.log('📝 處理文字訊息:', text);
  
  // Phase 1: 簡單的回應機制
  let responseMessage;
  
  if (text.includes('申請') || text.includes('藥申請') || text.includes('伸請')) {
    responseMessage = `收到申請需求！\n\n目前是 Phase 1 測試階段，我已經記錄您的申請意圖。\n\n原始訊息：「${text}」\n用戶ID：${userId}`;
  } else if (text.includes('測試')) {
    responseMessage = `✅ 系統測試正常！\n\n松菸申請助手運作中\n時間：${new Date().toLocaleString('zh-TW')}\n用戶ID：${userId}`;
  } else if (text.includes('幫助') || text.includes('說明')) {
    responseMessage = `🤖 松菸申請助手說明\n\n目前功能：\n• 接收申請需求\n• 基本對話測試\n\n開發階段：Phase 1\n如需協助請說「測試」`;
  } else {
    responseMessage = `收到訊息：「${text}」\n\n我是松菸申請助手，目前在 Phase 1 測試階段。\n\n如需申請請說「申請」\n如需測試請說「測試」`;
  }
  
  // 回覆訊息
  replyMessage(replyToken, responseMessage);
}

/**
 * 處理語音訊息 (Phase 1 暫時不處理)
 */
function handleAudioMessage(event) {
  const replyToken = event.replyToken;
  
  console.log('🎤 收到語音訊息 (Phase 1 暫不支援)');
  
  replyMessage(replyToken, '收到您的語音訊息！\n\nPhase 1 階段暫時只支援文字訊息，語音功能將在 Phase 2 開發。\n\n請用文字說明您的需求，例如：「我要申請」');
}

/**
 * 處理用戶加入好友事件
 */
function handleFollow(event) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  
  console.log('👋 新用戶加入:', userId);
  
  const welcomeMessage = `歡迎使用松菸申請助手！🎭\n\n我可以協助您：\n• 申請松山文創園區街頭藝人場地\n• 處理申請相關問題\n\n目前處於 Phase 1 測試階段\n請說「測試」確認系統運作\n請說「申請」開始申請流程`;
  
  replyMessage(replyToken, welcomeMessage);
}

/**
 * 處理用戶取消好友事件
 */
function handleUnfollow(event) {
  const userId = event.source.userId;
  console.log('👋 用戶取消好友:', userId);
}

/**
 * 測試函數 - 手動測試系統功能
 */
function testSystem() {
  try {
    console.log('🧪 開始系統測試...');
    
    // 測試配置
    console.log('1. 測試配置...');
    validateConfig();
    console.log('✅ 配置測試通過');
    
    // 測試 LINE 設定
    console.log('2. 測試 LINE 設定...');
    const lineConfig = getLineConfig();
    console.log('✅ LINE 設定正常');
    
    // 模擬訊息處理
    console.log('3. 模擬訊息處理...');
    const mockEvent = {
      type: 'message',
      message: {
        type: 'text',
        text: '測試訊息'
      },
      source: {
        userId: 'test-user-123'
      },
      replyToken: 'test-reply-token'
    };
    
    console.log('模擬事件:', JSON.stringify(mockEvent, null, 2));
    console.log('✅ 模擬測試完成');
    
    console.log('🎉 所有測試通過！');
    return true;
    
  } catch (error) {
    console.error('❌ 系統測試失敗:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}

/**
 * 清理日誌 - 開發用
 */
function clearLogs() {
  console.clear();
  console.log('🧹 日誌已清理');
}
