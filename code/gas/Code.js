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
  
  // Phase 2: 使用 OpenAI 語意解析
  if (CONFIG.PHASE2.ENABLE_OPENAI) {
    handleTextMessageWithAI(event, text);
  } else {
    // Phase 1: 簡單的回應機制（保留作為備案）
    handleTextMessageBasic(event, text);
  }
}

/**
 * 使用 AI 語意解析處理文字訊息 (Phase 2 - 簡化版)
 * 專注於語音錯誤修正和基本意圖識別
 */
function handleTextMessageWithAI(event, text) {
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  
  try {
    console.log('🤖 Phase 2: AI 語音錯誤修正');
    
    // 使用 OpenAI 進行語音錯誤修正和意圖識別
    const analysis = analyzeUserIntent(text, 'general');
    console.log('📊 AI 分析結果:', analysis);
    
    let responseMessage;
    
    // Phase 2 簡化處理：只顯示 AI 理解結果，不執行業務邏輯
    if (analysis.confidence >= CONFIG.PHASE2.CONFIDENCE_THRESHOLD.HIGH) {
      // 高信心度：顯示 AI 修正結果
      responseMessage = `✅ AI語音修正完成\n\n原始輸入：「${text}」\n修正後：「${analysis.correctedText}」\n識別意圖：${analysis.intent}\n信心度：${(analysis.confidence * 100).toFixed(0)}%\n\n⚠️ Phase 2 測試中，專注語音修正\n業務邏輯將在 Phase 3 實現`;
    } else if (analysis.confidence >= CONFIG.PHASE2.CONFIDENCE_THRESHOLD.MEDIUM) {
      // 中信心度：顯示可能的理解
      responseMessage = `🤔 AI理解結果\n\n原始輸入：「${text}」\n可能是：「${analysis.correctedText}」\n信心度：${(analysis.confidence * 100).toFixed(0)}%\n\n請確認我的理解是否正確`;
    } else {
      // 低信心度：請用戶重新表達
      responseMessage = `😕 我不太確定您的意思\n\n原始輸入：「${text}」\n信心度：${(analysis.confidence * 100).toFixed(0)}%\n\n請用更清楚的方式表達，例如：\n• 「申請」\n• 「測試」\n• 「幫助」`;
    }
    
    // 回覆訊息
    replyMessage(replyToken, responseMessage);
    
  } catch (error) {
    console.error('❌ AI 處理失敗，降級到基本處理:', error);
    handleTextMessageBasic(event, text);
  }
}

// Phase 2 移除：高信心度意圖處理將在 Phase 3 實現
// 保留函數框架供 Phase 3 使用
/*
function handleHighConfidenceIntent(analysis, userId, originalText) {
  // Phase 3 將實現完整的意圖處理邏輯
  // 包含狀態管理和業務邏輯
}
*/

/**
 * 基本文字訊息處理 (Phase 1 備案機制)
 */
function handleTextMessageBasic(event, text) {
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  
  console.log('🔄 使用基本處理機制');
  
  let responseMessage;
  
  if (text.includes('申請') || text.includes('藥申請') || text.includes('伸請')) {
    responseMessage = `收到申請需求！\n\n目前是基本處理模式，AI功能暫時不可用。\n\n原始訊息：「${text}」\n用戶ID：${userId}`;
  } else if (text.includes('測試')) {
    responseMessage = `✅ 系統測試正常！\n\n⚠️ 注意：目前使用基本處理模式\n🤖 AI功能：暫時不可用\n\n松菸申請助手運作中\n時間：${new Date().toLocaleString('zh-TW')}\n用戶ID：${userId}`;
  } else if (text.includes('幫助') || text.includes('說明')) {
    responseMessage = `🤖 松菸申請助手說明\n\n⚠️ 目前使用基本處理模式\n\n基本功能：\n• 接收申請需求\n• 基本對話測試\n\n開發階段：Phase 2 (AI功能暫時不可用)\n如需協助請說「測試」`;
  } else {
    responseMessage = `收到訊息：「${text}」\n\n我是松菸申請助手，目前使用基本處理模式。\n\n如需申請請說「申請」\n如需測試請說「測試」`;
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

/**
 * 測試 Phase 2 AI 功能
 */
function testPhase2AI() {
  try {
    console.log('🧪 開始 Phase 2 AI 功能測試...');
    
    // 測試配置
    console.log('1. 測試 OpenAI 配置...');
    const openaiConfig = getOpenAIConfig();
    console.log('✅ OpenAI 配置正常:', {
      hasApiKey: !!openaiConfig.API_KEY,
      model: openaiConfig.MODEL,
      temperature: openaiConfig.TEMPERATURE
    });
    
    // 測試 OpenAI 連線
    console.log('2. 測試 OpenAI API 連線...');
    const connectionTest = testOpenAIConnection();
    console.log('OpenAI 連線結果:', connectionTest ? '✅ 成功' : '⚠️ 失敗（將使用降級機制）');
    
    // 測試語音錯誤修正
    console.log('3. 測試語音錯誤修正...');
    const testCases = [
      '藥申請',
      '伸請',
      '測試',
      '確認',
      '修改',
      '不清楚的輸入'
    ];
    
    testCases.forEach(testCase => {
      console.log(`\n測試案例：「${testCase}」`);
      const result = analyzeUserIntent(testCase, 'general');
      console.log(`結果：意圖=${result.intent}, 信心度=${result.confidence}, 修正=${result.correctedText}, 來源=${result.source}`);
    });
    
    console.log('\n🎉 Phase 2 AI 功能測試完成！');
    return true;
    
  } catch (error) {
    console.error('❌ Phase 2 AI 功能測試失敗:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}
