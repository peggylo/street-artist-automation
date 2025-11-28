/**
 * 街頭藝人申請系統 - 主要邏輯和 Webhook 處理
 * Phase 1: 基礎LINE Bot架構
 */

/**
 * LINE Webhook 處理器 - 接收來自 LINE 的訊息 或 Cloud Run 回調
 */
function doPost(e) {
  try {
    console.log('🔔 收到 POST 請求');
    
    // 解析請求資料
    const data = JSON.parse(e.postData.contents);
    console.log('📨 原始資料:', JSON.stringify(data, null, 2));
    
    // Phase 6: 判斷是 LINE Webhook 還是 Cloud Run 回調
    if (data.events && data.events.length > 0) {
      // LINE Webhook - 處理 LINE 事件
      console.log('📱 LINE Webhook 事件');
      data.events.forEach(event => {
        handleLineEvent(event);
      });
      
      // 回傳 200 狀態碼給 LINE
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
      
    } else if (data.user_id && data.timestamp) {
      // Cloud Run 回調 - 處理網站自動化結果
      console.log('🌐 Cloud Run 回調');
      handleCloudRunCallback(data);
      
      // 回傳 200 狀態碼給 Cloud Run
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Callback received'
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else {
      console.warn('⚠️ 未知的 POST 請求格式');
      return ContentService.createTextOutput('UNKNOWN').setMimeType(ContentService.MimeType.TEXT);
    }
    
  } catch (error) {
    console.error('❌ POST 請求處理錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    
    // 即使發生錯誤也要回傳 200
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
 * 驗證系統配置
 * 檢查必要的配置是否正確載入
 */
function validateConfig() {
  try {
    // 檢查 CONFIG 是否存在
    if (typeof CONFIG === 'undefined') {
      throw new Error('CONFIG 未定義');
    }
    
    // 檢查 LINE 配置
    const lineConfig = getLineConfig();
    if (!lineConfig) {
      throw new Error('LINE 配置未載入');
    }
    
    // 檢查 ACCESS_TOKEN（對應 Config.js 中 getLineConfig() 返回的屬性名稱）
    if (!lineConfig.ACCESS_TOKEN) {
      throw new Error('LINE Access Token 未設定');
    }
    
    // 配置檢查通過
    return true;
    
  } catch (error) {
    console.error('❌ 配置驗證失敗:', error.message);
    throw error;
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
    case 'video':
      handleVideoMessage(event);
      break;
    default:
      replyMessage(replyToken, '目前支援文字、語音和影片訊息，請重新發送。');
  }
}

/**
 * 處理文字訊息
 */
function handleTextMessage(event, text) {
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  
  console.log('📝 處理文字訊息:', text);
  
  // 🔍 DEBUG: 驗證配置載入
  console.log('🔍 DEBUG - CONFIG 物件:', typeof CONFIG);
  console.log('🔍 DEBUG - PHASE3:', JSON.stringify(CONFIG.PHASE3, null, 2));
  console.log('🔍 DEBUG - ENABLE_STATE_MANAGEMENT:', CONFIG.PHASE3.ENABLE_STATE_MANAGEMENT);
  console.log('🔍 DEBUG - ENABLE_OPENAI:', CONFIG.PHASE2.ENABLE_OPENAI);
  
  // Phase 3: 狀態管理和業務邏輯
  if (CONFIG.PHASE3.ENABLE_STATE_MANAGEMENT) {
    console.log('✅ 進入 Phase 3 狀態管理流程');
    handleTextMessageWithState(event, text);
  }
  // Phase 2: 使用 OpenAI 語意解析
  else if (CONFIG.PHASE2.ENABLE_OPENAI) {
    console.log('⚠️ 進入 Phase 2 AI 流程');
    handleTextMessageWithAI(event, text);
  } else {
    console.log('⚠️ 進入 Phase 1 基本流程');
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
      responseMessage = `我聽不太懂，請再說一次，要開始申請請說「我要申請」這四個字\n\n原始輸入：「${text}」\n信心度：${(analysis.confidence * 100).toFixed(0)}%`;
    }
    
    // 回覆訊息
    replyMessage(replyToken, responseMessage);
    
  } catch (error) {
    console.error('❌ AI 處理失敗，降級到基本處理:', error);
    handleTextMessageBasic(event, text);
  }
}

/**
 * Phase 3: 處理高信心度意圖
 */
function handleHighConfidenceIntent(analysis, userId, originalText) {
  console.log('✅ 處理高信心度意圖:', analysis.intent);
  
  switch (analysis.intent) {
    case 'apply':
      return handleApplicationIntent(userId);
    
    case 'test':
      return handleTestIntent(userId);
    
    case 'help':
      return handleHelpIntent();
    
    case 'greeting':
      return 'Hi老媽，我來幫你申請松菸場地，請說：「我要申請！」這四個字開始吧！';
    
    case 'date':
      // 如果在等待日期選擇狀態
      const state = getUserState(userId);
      if (state && state.currentStep === 'waiting_date_selection') {
        return handleDateSelection(userId, analysis.correctedText);
      }
      return '請先說「申請」開始申請流程，再選擇日期';
    
    default:
      return `理解您的意思：「${analysis.correctedText}」\n\n請說「申請」開始申請流程`;
  }
}

/**
 * 處理申請意圖
 */
function handleApplicationIntent(userId) {
  console.log('🎭 開始申請流程');
  
  // 清除舊狀態（重新開始申請）
  const oldState = getUserState(userId);
  if (oldState) {
    console.log('🗑️ 清除舊狀態，重新開始申請');
    clearUserState(userId);
  }
  
  // 檢查申請時間窗口
  const windowCheck = checkApplicationWindow();
  if (!windowCheck.isOpen) {
    return `現在不是申請時間\n\n${windowCheck.message}`;
  }
  
  // 取得預設申請資訊（預設下個月）
  const targetMonth = windowCheck.targetMonths[0];
  const defaultDates = getDefaultDates(targetMonth.month, targetMonth.year);
  
  // 設定用戶狀態
  setUserState(userId, {
    currentStep: 'application_started',
    targetMonth: targetMonth,
    selectedDates: defaultDates.dates,
    useDefaultVideo: true,
    context: 'application'
  });
  
  // 回覆預設選項
  return `老媽，現在可申請${targetMonth.display}場地。

我會用預設影片，幫您登記${defaultDates.display}。

OK請說：「好」，

想改請說：「改日期」，或「改影片」。`;
}

/**
 * 處理測試意圖
 */
function handleTestIntent(userId) {
  const now = new Date();
  const windowCheck = checkApplicationWindow();
  
  return `✅ 系統測試正常！

🤖 Phase 3 功能：
• AI語意解析：運作中
• 狀態管理：運作中
• 日期計算：運作中
• 申請窗口：${windowCheck.isOpen ? '開放中' : '已關閉'}

⏰ 時間：${now.toLocaleString('zh-TW')}
👤 用戶ID：${userId}`;
}

/**
 * 處理幫助意圖
 */
function handleHelpIntent() {
  return `松菸申請助手使用說明

主要功能：
• 申請松山文創園區街頭藝人場地
• 自動計算可申請日期
• 處理申請文件

指令說明：
• 「申請」- 開始申請流程
• 「測試」- 測試系統狀態
• 「幫助」- 顯示此說明

申請規則：
• 每月 1-15 日及 20-31 日可申請
• 1-15日申請下個月，20-31日申請下下個月
• 預設選擇前 3 個週六

目前為 Phase 3 開發階段`;
}

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
 * 處理基於狀態的輸入
 */
function handleStateBasedInput(userState, text, userId, event) {
  const normalizedText = text.trim().toLowerCase();
  console.log('🎯 狀態處理:', userState.currentStep, normalizedText);
  
  switch (userState.currentStep) {
    case 'waiting_confirmation':
      // 等待確認狀態
      if (['對', '好', '是', '確認', '可以', '沒錯', '正確'].includes(normalizedText)) {
        // 確認 - 執行待處理的意圖
        clearUserState(userId);
        return handleHighConfidenceIntent({
          intent: userState.pendingIntent,
          correctedText: userState.pendingText,
          confidence: 1.0
        }, userId, userState.pendingText);
      } else if (['不對', '不是', '錯', '不要', '重來'].includes(normalizedText)) {
        // 否定 - 清除狀態
        clearUserState(userId);
        return '好的，請重新說明您的需求';
      }
      break;
    
    case 'application_started':
      // 已開始申請，等待確認或修改
      if (['對', '好', '確認', '可以'].includes(normalizedText)) {
        // 簡化流程：跳過最終確認，直接執行申請
        console.log('✅ 用戶確認，直接執行申請（跳過最終確認）');
        const groupId = event.source && event.source.type === 'group' ? event.source.groupId : null;
        return executeFinalApplication(userId, groupId);
      } else if (normalizedText.includes('改日期') || normalizedText.includes('修改日期')) {
        return startDateModification(userId);
      } else if (normalizedText.includes('改影片') || normalizedText.includes('修改影片')) {
        return startVideoModification(userId);
      } else if (normalizedText.includes('修改') || normalizedText.includes('改')) {
        return '要修改什麼？\n\n請說「改日期」，或「改影片」';
      }
      break;
    
    case 'selecting_date':
      // 持續日期選擇狀態（可多次修改）
      // 完成選擇
      if (['好', '好了', '完成', '確定', '滿意', 'ok'].includes(normalizedText)) {
        return finishDateSelection(userId);
      }
      // 取消選擇
      else if (['取消', '不要了', '算了'].includes(normalizedText)) {
        const state = getUserState(userId);
        state.currentStep = 'application_started';
        setUserState(userId, state);
        return '已取消日期修改。\n\n' + getApplicationSummary(state) + '\n\nOK請說：「好」，\n想改請說：「改日期」，或「改影片」。';
      }
      // 繼續選擇日期
      else {
        return handleDateSelection(userId, text);
      }
    
    case 'confirming_dates':
      // 確認 AI 理解的日期
      if (['對', '好', '正確', '是', '確認', 'ok'].includes(normalizedText)) {
        // 確認正確，直接完成日期選擇並回到申請摘要
        const state = getUserState(userId);
        state.selectedDates = state.pendingDates;
        state.currentStep = 'application_started';
        state.context = 'application';
        delete state.pendingDates;
        delete state.pendingOriginalInput;
        setUserState(userId, state);
        
        return getApplicationSummary(state) + '\n\nOK請說：「好」，\n想改請說：「改日期」，或「改影片」。';
      } else {
        // 不正確，回到日期選擇狀態重新輸入
        const state = getUserState(userId);
        state.currentStep = 'selecting_date';
        delete state.pendingDates;
        delete state.pendingOriginalInput;
        setUserState(userId, state);
        
        // 將新輸入當作日期選擇處理
        return handleDateSelection(userId, text);
      }
    
    case 'waiting_video_upload':
      // 等待影片上傳
      if (['取消', '不要了', '算了'].includes(normalizedText)) {
        const state = getUserState(userId);
        state.currentStep = 'application_started';
        setUserState(userId, state);
        return '已取消影片修改。\n\n' + getApplicationSummary(state) + '\n\nOK請說：「好」開始申請，\n想改請說：「改日期」或「改影片」。';
      }
      return '請直接傳送影片檔案，或說「取消」放棄修改';
    
    case 'final_confirmation':
      // 最終確認狀態
      // @deprecated 2025-11-26 - 已簡化流程，此狀態不再使用
      // 保留此處理邏輯以防需要回復舊流程
      console.log('📋 處理最終確認狀態（已棄用），輸入:', normalizedText);
      if (['對', '好', '確定', '確認', '可以', 'ok'].includes(normalizedText)) {
        console.log('✅ 用戶確認，開始執行最終申請');
        // Phase 6: 取得 groupId（如果有）
        const groupId = event.source && event.source.type === 'group' ? event.source.groupId : null;
        console.log('📋 groupId:', groupId);
        const result = executeFinalApplication(userId, groupId);
        console.log('📤 executeFinalApplication 返回結果長度:', result ? result.length : 'null');
        return result;
      } else if (normalizedText.includes('改日期')) {
        return startDateModification(userId);
      } else if (normalizedText.includes('改影片')) {
        return startVideoModification(userId);
      } else if (['取消', '不要了', '算了'].includes(normalizedText)) {
        clearUserState(userId);
        return '已取消申請，請說「申請」重新開始';
      }
      return '請確認申請資訊，說「好」開始申請，或說「改日期」、「改影片」修改';
  }
  
  return null; // 沒有匹配的狀態處理
}

/**
 * 處理簡單關鍵字
 */
function handleSimpleKeywords(text, userId) {
  const normalizedText = text.trim().toLowerCase();
  
  // 直接匹配的簡單指令
  if (normalizedText === '申請') {
    return handleApplicationIntent(userId);
  }
  if (normalizedText === '測試') {
    return handleTestIntent(userId);
  }
  if (normalizedText === '幫助' || normalizedText === '說明') {
    return handleHelpIntent();
  }
  
  return null; // 沒有匹配的關鍵字
}

/**
 * 確認申請（最終確認）
 * @deprecated 2025-11-26 - 已簡化流程，跳過最終確認步驟
 * 保留此函數以防需要回復舊流程
 */
function confirmApplication(userId) {
  const state = getUserState(userId);
  if (!state) {
    return '請先說「申請」開始申請流程';
  }
  
  const dateDisplay = state.selectedDates.map(d => d.display).join('、');
  const videoDisplay = state.useDefaultVideo ? '預設影片' : '新上傳影片';
  
  // 最終確認提示
  const confirmMessage = `最終確認：

確定請說「好」開始申請
還要修改請說「改日期」，或「改影片」`;
  
  // 設定狀態為等待最終確認
  state.currentStep = 'final_confirmation';
  setUserState(userId, state);
  
  return confirmMessage;
}

/**
 * Phase 5-6: 執行最終申請（含 Sheets 記錄 + 文件處理 + 網站自動化）
 * @param {string} userId - 用戶 ID
 * @param {string} groupId - 群組 ID（可選）
 */
function executeFinalApplication(userId, groupId = null) {
  console.log('🚀 開始執行最終申請');
  console.log('📋 userId:', userId);
  console.log('📋 groupId:', groupId);
  
  // ✨ 新增：立即發送確認訊息（用 pushMessage 主動發送）
  const targetId = groupId || userId;
  pushMessage(targetId, '收到，我正在幫老媽填申請表了，請稍等一分鐘，完成後叫老媽。');
  console.log('✅ 已發送確認訊息給:', targetId);
  
  const state = getUserState(userId);
  console.log('📊 用戶狀態:', JSON.stringify(state, null, 2));
  
  if (!state) {
    console.error('❌ 找不到用戶狀態');
    return '請先說「申請」開始申請流程';
  }
  
  const dateDisplay = state.selectedDates.map(d => d.display).join('、');
  const videoDisplay = state.useDefaultVideo ? '預設影片' : '新上傳影片';
  
  console.log('📅 日期顯示:', dateDisplay);
  console.log('🎬 影片顯示:', videoDisplay);
  
  try {
    // Phase 4: 記錄申請資訊到 Google Sheets
    let applicationData;
    if (CONFIG.PHASE4.ENABLE_SHEETS_RECORDING) {
      console.log('📊 Phase 4: 記錄申請資訊到 Sheets');
      
      applicationData = prepareApplicationData(state);
      const recordSuccess = recordApplicationToSheets(userId, applicationData);
      
      if (!recordSuccess) {
        console.error('⚠️ Sheets 記錄失敗，但繼續流程');
      }
    }
    
    // Phase 5-6: 自動呼叫 Cloud Run 處理文件 + 網站自動化
    let documentProcessingMessage = '';
    if (CONFIG.PHASE6.ENABLE_WEBSITE_AUTOMATION) {
      console.log('🚀 Phase 5-6: 自動呼叫 Cloud Run 處理文件和網站自動化');
      
      if (!applicationData) {
        applicationData = prepareApplicationData(state);
      }
      
      // 步驟 1: GAS 複製 Word 模板
      const copyResult = copyWordTemplate(applicationData);
      
      if (copyResult.success) {
        console.log('✅ 模板複製成功，開始呼叫 Cloud Run');
        
        // 步驟 2: 呼叫 Cloud Run，傳送複製檔案的 ID、時間戳記和群組 ID
        const cloudRunData = {
          timestamp: applicationData.timestamp,  // 用於精確識別記錄
          user_id: userId,                       // 用戶 ID
          application_data: {
            ...applicationData,
            copiedFileId: copyResult.copiedFileId,
            pdfFileId: copyResult.pdfFileId,
            copiedFileName: copyResult.wordFileName,
            pdfFileName: copyResult.pdfFileName
          }
        };
        
        // Phase 6: 傳入 groupId
        const cloudRunResult = callCloudRunForDocumentProcessing(userId, cloudRunData, groupId);
        
        if (cloudRunResult.success) {
          documentProcessingMessage = '\n🔄 文件處理和網站自動化已啟動\n📄 Word 檔案：' + copyResult.wordFileName + '\n📄 PDF 檔案：' + copyResult.pdfFileName + '\n🌐 系統將自動填寫表單，完成後會發送截圖';
        } else {
          documentProcessingMessage = '\n⚠️ 自動化啟動失敗，但檔案已準備\n📄 Word：' + copyResult.wordFileName + '\n📄 PDF：' + copyResult.pdfFileName;
          console.error('❌ Cloud Run 呼叫失敗:', cloudRunResult.error);
        }
      } else {
        documentProcessingMessage = '\n❌ 模板複製失敗，無法啟動自動化\n🔧 ' + copyResult.message;
        console.error('❌ 模板複製失敗:', copyResult.message);
      }
    }
    
    // 清除對話狀態
    clearUserState(userId);
    
    // 階段 5：不發送確認訊息，只等 Cloud Run 完成後的 Shortcut 連結
    // 返回特殊標記表示已處理但不需要回覆
    return '__HANDLED__';
    
  } catch (error) {
    console.error('❌ 申請記錄過程發生錯誤:', error);
    
    // 即使記錄失敗也要清除狀態
    clearUserState(userId);
    
    // 發生錯誤時通知用戶
    return '❌ 系統發生錯誤，請老媽聯繫peggy協助處理';
  }
}

/**
 * 開始日期修改流程
 */
function startDateModification(userId) {
  const state = getUserState(userId);
  if (!state) {
    return '請先說「申請」開始申請流程';
  }
  
  // 取得所有可選日期
  const allDates = getAllAvailableDates(state.targetMonth.year, state.targetMonth.month);
  
  // 更新狀態為持續選擇模式
  state.currentStep = 'selecting_date';
  state.context = 'date_selection';
  setUserState(userId, state);
  
  return `${state.targetMonth.display}可選日期，全部念給老媽聽：
${allDates.saturdayDisplay}。

還有：
${allDates.sundayDisplay}。

請問要選哪三天，請說日期就好，例如老媽可以說：「1號、8號、15號」。`;
}

/**
 * 開始影片修改流程
 */
function startVideoModification(userId) {
  const state = getUserState(userId);
  if (!state) {
    return '請先說「申請」開始申請流程';
  }
  
  // 更新狀態
  state.currentStep = 'waiting_video_upload';
  state.context = 'video_upload';
  state.useDefaultVideo = false;
  setUserState(userId, state);
  
  return `請老媽傳影片給我，影片上傳大約需1到2分鐘，請耐心等待。`;
}

/**
 * 處理日期選擇（AI 確認版）
 */
function handleDateSelection(userId, userInput) {
  const state = getUserState(userId);
  if (!state || !state.targetMonth) {
    return '請先說「申請」開始申請流程';
  }
  
  console.log('📅 處理日期選擇:', userInput);
  
  // 先用 AI 理解用戶的日期表達
  const aiAnalysis = analyzeUserIntent(userInput, 'date_selection');
  console.log('🤖 AI 日期理解:', aiAnalysis);
  
  // 如果 AI 有足夠信心度，顯示理解結果給用戶確認
  if (aiAnalysis.confidence >= 0.6) {
    // 嘗試解析 AI 理解的結果
    const parseResult = parseDateSelectionEnhanced(aiAnalysis.correctedText, state.targetMonth.month, state.targetMonth.year);
    
    if (parseResult.success) {
      // AI 理解成功且解析成功，顯示確認
      return showDateConfirmation(userId, userInput, aiAnalysis.correctedText, parseResult.dates);
    }
  }
  
  // AI 信心度不夠或解析失敗，嘗試直接解析原文
  const directParseResult = parseDateSelectionEnhanced(userInput, state.targetMonth.month, state.targetMonth.year);
  
  if (directParseResult.success) {
    // 直接解析成功
    state.selectedDates = directParseResult.dates;
    setUserState(userId, state);
    
    return `日期已更新！

目前選擇：${directParseResult.dates.map(d => d.display).join('、')}

還要改嗎？直接說新的日期
滿意請說「好」完成選擇`;
  }
  
  // 完全無法理解，提供降級幫助
  return handleDateParseFailure(userInput, state.targetMonth);
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
 * 處理影片訊息 (Phase 3 完整版)
 */
function handleVideoMessage(event) {
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  const messageId = event.message.id;
  
  console.log('🎬 收到影片訊息:', messageId);
  
  // 檢查用戶狀態
  const state = getUserState(userId);
  if (!state || state.currentStep !== 'waiting_video_upload') {
    replyMessage(replyToken, '請先說「申請」開始申請流程，並選擇「改影片」上傳新影片');
    return;
  }
  
  try {
    console.log('📹 開始處理影片上傳');
    
    // 1. 從 LINE 下載影片
    const videoBlob = downloadVideoFromLine(messageId);
    if (!videoBlob) {
      const errorResponse = handleVideoUploadError('network_error', '影片下載失敗（網路問題），請稍後重試', userId);
      replyMessage(replyToken, errorResponse);
      return;
    }
    
    // 2. 檢查檔案類型
    const contentType = videoBlob.getContentType();
    if (!contentType.startsWith('video/')) {
      const errorResponse = handleVideoUploadError('invalid_format', '請上傳影片檔案（MP4、MOV等格式）', userId);
      replyMessage(replyToken, errorResponse);
      return;
    }
    
    // 3. 生成檔案名稱
    const fileName = generateVideoFileName(state.targetMonth.month, state.targetMonth.year);
    console.log('📝 生成檔案名稱:', fileName);
    
    // 4. 上傳到 Google Drive
    const uploadResult = uploadVideoToDrive(videoBlob, fileName);
    
    if (!uploadResult.success) {
      const errorResponse = handleVideoUploadError(uploadResult.error, uploadResult.message, userId);
      replyMessage(replyToken, errorResponse);
      return;
    }
    
    // 5. 上傳成功，更新狀態
    state.useDefaultVideo = false;
    state.newVideoId = uploadResult.fileId;
    state.newVideoUrl = uploadResult.fileUrl;
    state.currentStep = 'application_started';
    state.context = 'application';
    setUserState(userId, state);
    
    // ✨ 新增：更新「最新影片」設定到 PropertiesService
    try {
      PropertiesService.getScriptProperties()
        .setProperty('LATEST_VIDEO_URL', uploadResult.fileUrl);
      console.log('✅ 已更新常用影片 URL:', uploadResult.fileUrl);
    } catch (propError) {
      console.warn('⚠️ 更新常用影片 URL 失敗（不影響本次申請）:', propError);
    }
    
    const response = `影片上傳成功！

${getApplicationSummary(state)}

OK請說：「好」，
想改請說：「改日期」，或「改影片」。`;
    
    replyMessage(replyToken, response);
    
  } catch (error) {
    console.error('❌ 影片處理失敗:', error);
    const errorResponse = handleVideoUploadError('system_error', '系統錯誤，請稍後重試', userId);
    replyMessage(replyToken, errorResponse);
  }
}

/**
 * 處理用戶加入好友事件
 */
function handleFollow(event) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  
  console.log('👋 新用戶加入:', userId);
  
  const welcomeMessage = `您好！我是松菸申請助手。

請說「我要申請」這四個字開始吧！`;
  
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

// =====================================================
// Phase 3: 狀態管理函數
// =====================================================

/**
 * 取得用戶狀態
 * @param {string} userId - 用戶ID
 * @return {Object|null} 用戶狀態物件
 */
function getUserState(userId) {
  try {
    const cache = CacheService.getScriptCache();
    const key = CONFIG.PHASE3.STATE_MANAGEMENT.STATE_PREFIX + userId;
    const stateJson = cache.get(key);
    
    if (stateJson) {
      const state = JSON.parse(stateJson);
      console.log('📊 取得用戶狀態:', state);
      return state;
    }
    
    return null;
  } catch (error) {
    console.error('❌ 取得用戶狀態失敗:', error);
    return null;
  }
}

/**
 * 設定用戶狀態
 * @param {string} userId - 用戶ID
 * @param {Object} state - 狀態物件
 */
function setUserState(userId, state) {
  try {
    const cache = CacheService.getScriptCache();
    const key = CONFIG.PHASE3.STATE_MANAGEMENT.STATE_PREFIX + userId;
    const stateJson = JSON.stringify(state);
    
    // 設定快取，使用配置的過期時間
    cache.put(key, stateJson, CONFIG.PHASE3.STATE_MANAGEMENT.CACHE_DURATION_SECONDS);
    console.log('💾 儲存用戶狀態:', state);
    
  } catch (error) {
    console.error('❌ 設定用戶狀態失敗:', error);
  }
}

/**
 * 清除用戶狀態
 * @param {string} userId - 用戶ID
 */
function clearUserState(userId) {
  try {
    const cache = CacheService.getScriptCache();
    const key = CONFIG.PHASE3.STATE_MANAGEMENT.STATE_PREFIX + userId;
    cache.remove(key);
    console.log('🗑️ 清除用戶狀態');
    
  } catch (error) {
    console.error('❌ 清除用戶狀態失敗:', error);
  }
}

/**
 * 完成日期選擇
 */
function finishDateSelection(userId) {
  const state = getUserState(userId);
  if (!state) {
    return '請先說「申請」開始申請流程';
  }
  
  // 改回 application_started 狀態
  state.currentStep = 'application_started';
  state.context = 'application';
  setUserState(userId, state);
  
  return getApplicationSummary(state) + '\n\nOK請說：「好」，\n想改請說：「改日期」，或「改影片」。';
}

/**
 * 取得申請摘要
 */
function getApplicationSummary(state) {
  const dateDisplay = state.selectedDates.map(d => d.display).join('、');
  const videoText = state.useDefaultVideo ? '預設影片' : '新上傳影片';
  
  return `我們將登記：${dateDisplay}，並會用${videoText}。`;
}

/**
 * 顯示日期確認（AI 理解結果）
 */
function showDateConfirmation(userId, originalInput, aiUnderstood, parsedDates) {
  const state = getUserState(userId);
  
  // 暫存待確認的日期
  state.pendingDates = parsedDates;
  state.pendingOriginalInput = originalInput;
  state.currentStep = 'confirming_dates';
  setUserState(userId, state);
  
  return `我聽到您選：${parsedDates.map(d => d.display).join('、')}

正確請說：「對」。

若我有聽錯，請重新說一遍您要的三個日期，例如老媽可以說：1號、8號、15號。`;
}

/**
 * 處理日期解析完全失敗（方案A：只提示日期號碼）
 */
function handleDateParseFailure(userInput, targetMonth) {
  return `😕 我聽不太清楚「${userInput}」

請說具體的日期號碼，例如：
• 「11號、12號、26號」
• 「4號、18號」

${targetMonth.display}有這些日期：
週六：10/4、10/11、10/18、10/25
週日：10/5、10/12、10/19、10/26`;
}

/**
 * 測試 Phase 3 功能
 */
function testPhase3() {
  try {
    console.log('🧪 開始 Phase 3 功能測試...');
    
    // 測試日期工具
    console.log('1. 測試日期工具...');
    testDateUtils();
    
    // 測試狀態管理
    console.log('\n2. 測試狀態管理...');
    const testUserId = 'test-user-phase3';
    
    // 設定狀態
    setUserState(testUserId, {
      currentStep: 'test',
      data: '測試資料'
    });
    
    // 取得狀態
    const state = getUserState(testUserId);
    console.log('取得的狀態:', state);
    
    // 清除狀態
    clearUserState(testUserId);
    const clearedState = getUserState(testUserId);
    console.log('清除後的狀態:', clearedState);
    
    // 測試申請流程
    console.log('\n3. 模擬申請流程...');
    const windowCheck = checkApplicationWindow();
    console.log('申請窗口:', windowCheck);
    
    if (windowCheck.isOpen) {
      const targetMonth = windowCheck.targetMonths[0];
      const defaultDates = getDefaultDates(targetMonth.month, targetMonth.year);
      console.log('預設日期:', defaultDates);
    }
    
  console.log('\n🎉 Phase 3 功能測試完成！');
  return true;
  
} catch (error) {
  console.error('❌ Phase 3 功能測試失敗:', error);
  console.error('📋 錯誤詳情:', error.stack);
  return false;
}
}

// =====================================================
// Phase 3: 影片處理函數
// =====================================================

/**
 * 生成帶時間戳的影片檔名
 * @param {number} month - 申請月份
 * @param {number} year - 申請年份
 * @return {string} 檔案名稱
 */
function generateVideoFileName(month, year) {
  const now = new Date();
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = now.getDate().toString().padStart(2, '0');
  const hourStr = now.getHours().toString().padStart(2, '0');
  const minuteStr = now.getMinutes().toString().padStart(2, '0');
  
  return `表演影片_${year}年${monthStr}月_${monthStr}${dayStr}_${hourStr}${minuteStr}.mp4`;
}

/**
 * 從 LINE 下載影片內容
 * @param {string} messageId - LINE 訊息 ID
 * @return {Blob|null} 影片檔案 Blob
 */
function downloadVideoFromLine(messageId) {
  try {
    console.log('📥 開始從 LINE 下載影片:', messageId);
    
    const lineConfig = getLineConfig();
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + lineConfig.ACCESS_TOKEN
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const videoBlob = response.getBlob();
      console.log('✅ 影片下載成功，大小:', Math.round(videoBlob.getBytes().length / 1024 / 1024) + 'MB');
      return videoBlob;
    } else {
      console.error('❌ LINE 影片下載失敗:', responseCode);
      return null;
    }
    
  } catch (error) {
    console.error('❌ 下載影片時發生錯誤:', error);
    return null;
  }
}

/**
 * 上傳影片到 Google Drive
 * @param {Blob} videoBlob - 影片檔案 Blob
 * @param {string} fileName - 檔案名稱
 * @return {Object} {success: boolean, fileId: string, fileUrl: string, error: string}
 */
function uploadVideoToDrive(videoBlob, fileName) {
  try {
    console.log('📤 開始上傳影片到 Drive:', fileName);
    
    const config = CONFIG.PHASE3.GOOGLE_DRIVE;
    
    // 檢查檔案大小
    const fileSizeMB = videoBlob.getBytes().length / 1024 / 1024;
    if (fileSizeMB > config.MAX_VIDEO_SIZE_MB) {
      return {
        success: false,
        error: 'file_too_large',
        message: `影片檔案太大（${Math.round(fileSizeMB)}MB），請壓縮後重新上傳`
      };
    }
    
    // 上傳到 Drive
    const file = DriveApp.getFolderById(config.VIDEO_FOLDER_ID)
      .createFile(videoBlob.setName(fileName));
    
    // 設定檔案權限：知道連結的任何人都能檢視
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
    
    console.log('✅ 影片上傳成功:', fileId);
    
    return {
      success: true,
      fileId: fileId,
      fileUrl: fileUrl,
      fileName: fileName,
      fileSizeMB: Math.round(fileSizeMB)
    };
    
  } catch (error) {
    console.error('❌ 上傳影片到 Drive 失敗:', error);
    return {
      success: false,
      error: 'drive_error',
      message: '上傳服務暫時無法使用，請稍後重試'
    };
  }
}

/**
 * 處理影片上傳錯誤
 * @param {string} errorType - 錯誤類型
 * @param {string} errorMessage - 錯誤訊息
 * @param {string} userId - 用戶ID
 * @return {string} 錯誤回應訊息
 */
function handleVideoUploadError(errorType, errorMessage, userId) {
  const state = getUserState(userId);
  if (state) {
    // 降級到常用影片
    state.useDefaultVideo = true;
    state.currentStep = 'application_started';
    state.context = 'application';
    setUserState(userId, state);
    
    const response = `${errorMessage}

目前先使用預設影片繼續申請。

${getApplicationSummary(state)}

OK請說：「好」，
重新上傳請說：「改影片」。`;
    
    return response;
  }
  
  return `❌ ${errorMessage}\n\n請先說「申請」重新開始流程`;
}

/**
 * 測試影片處理功能
 */
function testVideoHandling() {
  try {
    console.log('🧪 開始影片處理功能測試...');
    
    // 1. 測試檔案命名
    console.log('1. 測試檔案命名...');
    const fileName = generateVideoFileName(10, 2024);
    console.log('生成檔案名稱:', fileName);
    
    // 2. 測試 Drive 權限
    console.log('2. 測試 Drive 存取權限...');
    const config = CONFIG.PHASE3.GOOGLE_DRIVE;
    
    try {
      const folder = DriveApp.getFolderById(config.VIDEO_FOLDER_ID);
      console.log('✅ Drive 資料夾存取正常:', folder.getName());
      
      // 測試常用影片存取
      const defaultVideo = DriveApp.getFileById(config.DEFAULT_VIDEO_ID);
      console.log('✅ 常用影片存取正常:', defaultVideo.getName());
      
    } catch (driveError) {
      console.error('❌ Drive 存取失敗:', driveError);
      return false;
    }
    
    // 3. 測試錯誤處理
    console.log('3. 測試錯誤處理機制...');
    const testUserId = 'test-video-user';
    
    // 模擬用戶狀態
    setUserState(testUserId, {
      currentStep: 'waiting_video_upload',
      targetMonth: { month: 10, display: '10月' },
      selectedDates: [{ display: '10/4(六)' }]
    });
    
    const errorResponse = handleVideoUploadError('file_too_large', '測試錯誤訊息', testUserId);
    console.log('錯誤處理回應:', errorResponse);
    
    // 清理測試狀態
    clearUserState(testUserId);
    
    console.log('\n🎉 影片處理功能測試完成！');
    return true;
    
  } catch (error) {
    console.error('❌ 影片處理功能測試失敗:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}

/**
 * Phase 3: 狀態管理的文字訊息處理
 */
function handleTextMessageWithState(event, text) {
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  
  try {
    console.log('🎯 Phase 3: 狀態管理處理');
    
    // 取得用戶狀態
    const userState = getUserState(userId);
    console.log('📊 用戶狀態:', userState);
    
    // 第一層：根據狀態處理（知道上下文）
    if (userState && userState.currentStep) {
      const stateResponse = handleStateBasedInput(userState, text, userId, event);
      if (stateResponse) {
        // 檢查是否為特殊標記（已處理但不需要回覆）
        if (stateResponse === '__HANDLED__') {
          console.log('✅ 訊息已處理，無需回覆');
          return;
        }
        // 一般情況：發送回覆訊息
        replyMessage(replyToken, stateResponse);
        return;
      }
    }
    
    // 第二層：簡單關鍵字快速匹配
    const simpleResponse = handleSimpleKeywords(text, userId);
    if (simpleResponse) {
      replyMessage(replyToken, simpleResponse);
      return;
    }
    
    // 第三層：使用 AI 語音修正和意圖識別
    const analysis = analyzeUserIntent(text, userState ? userState.context : 'general');
    console.log('🤖 AI 分析結果:', analysis);
    
    // 根據 AI 分析結果處理
    if (analysis.confidence >= CONFIG.PHASE2.CONFIDENCE_THRESHOLD.HIGH) {
      const response = handleHighConfidenceIntent(analysis, userId, text);
      replyMessage(replyToken, response);
    } else if (analysis.confidence >= CONFIG.PHASE2.CONFIDENCE_THRESHOLD.MEDIUM) {
      // 中信心度：請確認
      const response = `🤔 我理解您想要「${analysis.correctedText}」\n\n這樣正確嗎？請說「對」或「不對」`;
      // 設定等待確認狀態
      setUserState(userId, {
        currentStep: 'waiting_confirmation',
        pendingIntent: analysis.intent,
        pendingText: analysis.correctedText,
        context: 'confirmation'
      });
      replyMessage(replyToken, response);
    } else {
      // 低信心度：請重新表達
      const response = `請老媽說：
我要申請！
這四個字開始`;
      replyMessage(replyToken, response);
    }
    
  } catch (error) {
    console.error('❌ Phase 3 處理失敗:', error);
    console.error('📋 錯誤詳情:', error.stack);
    console.error('📋 錯誤名稱:', error.name);
    console.error('📋 錯誤訊息:', error.message);
    
    // 通知用戶發生錯誤
    replyMessage(replyToken, `Phase 3 系統異常，已自動切換到備用模式
    
錯誤類型：${error.name}
錯誤訊息：${error.message}

請截圖此訊息並聯繫管理員`);
  }
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

// =====================================================
// Phase 4: Google Sheets 資料記錄函數
// =====================================================

/**
 * 記錄申請資訊到 Google Sheets
 * @param {string} userId - 用戶ID
 * @param {Object} applicationData - 申請資料
 * @return {boolean} 記錄是否成功
 */
function recordApplicationToSheets(userId, applicationData) {
  try {
    console.log('📊 開始記錄申請資訊到 Sheets');
    
    const config = CONFIG.PHASE4.GOOGLE_SHEETS;
    const sheet = SpreadsheetApp.openById(config.APPLICATION_RECORD_ID)
      .getSheetByName(config.SHEET_NAME);
    
    if (!sheet) {
      console.error('❌ 找不到指定的工作表:', config.SHEET_NAME);
      return false;
    }
    
    // 準備資料列（時間戳記已在 applicationData 中生成）
    const rowData = [
      applicationData.timestamp,    // A. 時間戳記 (使用 applicationData 中的統一時間戳記)
      userId,                       // B. 用戶ID
      `${applicationData.year}/${applicationData.month}`,  // C. 申請月份
      formatDatesForSheet(applicationData.selected_dates),  // D. 選擇日期 (修正欄位名稱)
      applicationData.videoSource,  // E. 影片來源
      applicationData.video_url,    // F. 影片連結 (修正欄位名稱)
      '待處理',                     // G. 狀態
      '',                          // H. 錯誤訊息
      '',                          // I. PDF路徑
      '',                          // J. 處理開始時間
      ''                           // K. 處理完成時間
    ];
    
    // 寫入資料
    sheet.appendRow(rowData);
    console.log('✅ 申請資訊已記錄到 Sheets');
    
    return true;
    
  } catch (error) {
    console.error('❌ 記錄申請資訊失敗:', error);
    return false;
  }
}

/**
 * 格式化日期陣列為 Sheets 儲存格式
 * @param {Array} selectedDates - 選擇的日期陣列
 * @return {string} 逗號分隔的日期字串
 */
function formatDatesForSheet(selectedDates) {
  return selectedDates.map(date => {
    try {
      // 優先使用 fullDate 物件（不依賴 display 格式）
      if (date.fullDate) {
        // 處理 fullDate 可能是字串的情況（Cache Service 序列化問題）
        const dateObj = typeof date.fullDate === 'string' 
          ? new Date(date.fullDate) 
          : date.fullDate;
        
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        
        return `${year}/${month}/${day}`;
      }
      
      // 降級方案：從完整格式 display 提取（格式：1月4日週六）
      const dateParts = date.display.match(/(\d+)月(\d+)日/);
      if (dateParts) {
        const month = dateParts[1];
        const day = dateParts[2];
        
        // 推測年份
        const now = new Date();
        let year = now.getFullYear();
        if (parseInt(month) < now.getMonth() + 1) {
          year += 1; // 如果月份小於當前月份，假設是下一年
        }
        
        return `${year}/${month}/${day}`;
      }
      
      // 最後降級：返回原始 display
      console.warn('⚠️ 無法解析日期格式，使用原始 display:', date.display);
      return date.display;
      
    } catch (error) {
      console.error('❌ 日期格式化錯誤:', error, date);
      return date.display;
    }
  }).join(',');
}

/**
 * 準備申請資料物件
 * @param {Object} state - 用戶狀態
 * @return {Object} 申請資料物件
 */
function prepareApplicationData(state) {
  // 決定影片來源和連結
  let videoSource, video_url;
  
  if (state.useDefaultVideo) {
    videoSource = '常用影片';
    
    // ✨ 修改：優先使用最新上傳的影片
    try {
      const latestVideoUrl = PropertiesService.getScriptProperties()
        .getProperty('LATEST_VIDEO_URL');
      
      video_url = latestVideoUrl || CONFIG.PHASE3.GOOGLE_DRIVE.DEFAULT_VIDEO_URL;
      console.log('📹 使用影片 URL:', latestVideoUrl ? '最新上傳' : '預設影片', video_url);
    } catch (propError) {
      console.warn('⚠️ 讀取最新影片 URL 失敗，使用預設影片:', propError);
      video_url = CONFIG.PHASE3.GOOGLE_DRIVE.DEFAULT_VIDEO_URL;
    }
  } else {
    videoSource = '新上傳';
    video_url = state.newVideoUrl || '';
  }
  
  // 生成統一時間戳記格式 (YYYYMMDD-HHmmss) - 固定位數，避免補零問題
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
  
  return {
    timestamp: timestamp,                    // 新增：與 Sheets 記錄一致的時間戳記
    year: state.targetMonth.year,
    month: state.targetMonth.month,
    selected_dates: state.selectedDates,     // 修正：改為 selected_dates（符合 Cloud Run 期待）
    videoSource: videoSource,                // 保留：用於 Sheets 記錄
    video_url: video_url                     // 修正：改為 video_url（符合 Cloud Run 期待）
  };
}

/**
 * 測試 Google Sheets 記錄功能
 */
function testSheetsRecording() {
  try {
    console.log('🧪 開始 Sheets 記錄功能測試...');
    
    // 1. 測試 Sheets 存取權限
    console.log('1. 測試 Sheets 存取權限...');
    const config = CONFIG.PHASE4.GOOGLE_SHEETS;
    
    try {
      const spreadsheet = SpreadsheetApp.openById(config.APPLICATION_RECORD_ID);
      const sheet = spreadsheet.getSheetByName(config.SHEET_NAME);
      console.log('✅ Sheets 存取正常:', spreadsheet.getName());
      console.log('✅ 工作表存取正常:', sheet.getName());
    } catch (sheetsError) {
      console.error('❌ Sheets 存取失敗:', sheetsError);
      return false;
    }
    
    // 2. 測試資料記錄
    console.log('2. 測試資料記錄...');
    const testData = {
      year: 2024,
      month: 10,
      selectedDates: [
        { display: '10/4(六)', fullDate: new Date(2024, 9, 4) },
        { display: '10/11(六)', fullDate: new Date(2024, 9, 11) }
      ],
      videoSource: '常用影片',
      videoUrl: CONFIG.PHASE3.GOOGLE_DRIVE.DEFAULT_VIDEO_URL
    };
    
    const recordResult = recordApplicationToSheets('test-user-phase4', testData);
    console.log('記錄結果:', recordResult ? '✅ 成功' : '❌ 失敗');
    
    console.log('\n🎉 Sheets 記錄功能測試完成！');
    return recordResult;
    
  } catch (error) {
    console.error('❌ Sheets 記錄功能測試失敗:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}

// =====================================================
// Phase 5: Cloud Run 文件處理函數
// =====================================================

/**
 * Phase 5-6: 呼叫 Cloud Run 進行文件處理 + 網站自動化
 * @param {string} userId - 用戶ID
 * @param {Object} cloudRunData - 完整的 Cloud Run 請求資料
 * @param {string} groupId - 群組ID（用於回調通知）
 * @return {Object} 處理結果 {success: boolean, message: string, error?: string}
 */
function callCloudRunForDocumentProcessing(userId, cloudRunData, groupId = null) {
  try {
    console.log('🚀 Phase 5-6: 呼叫 Cloud Run 處理文件和網站自動化');
    
    const config = CONFIG.PHASE6.CLOUD_RUN;
    const url = config.SERVICE_URL + config.PROCESS_ENDPOINT;
    
    // Phase 6: 加入 GAS 回調 URL 和群組 ID
    const requestData = {
      ...cloudRunData,
      gas_callback_url: CONFIG.PHASE6.GAS_CALLBACK_URL,
      group_id: groupId  // 傳送群組 ID 供回調時使用
    };
    
    console.log('📤 發送請求到 Cloud Run:', url);
    console.log('📋 請求資料:', JSON.stringify(requestData, null, 2));
    
    // 發送 HTTP 請求（Phase 6: 增加超時時間支援網站自動化）
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true  // 獲取完整錯誤訊息
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('📥 Cloud Run 回應狀態:', responseCode);
    console.log('📄 Cloud Run 回應內容:', responseText);
    
    if (responseCode === 200) {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ Cloud Run 呼叫成功');
        return {
          success: true,
          message: '文件處理和網站自動化已啟動',
          result: result
        };
      } catch (parseError) {
        console.error('❌ 解析 Cloud Run 回應失敗:', parseError);
        return {
          success: false,
          message: '服務回應格式錯誤',
          error: parseError.message
        };
      }
    } else {
      console.error('❌ Cloud Run 呼叫失敗:', responseCode, responseText);
      return {
        success: false,
        message: `服務暫時無法使用 (${responseCode})`,
        error: responseText
      };
    }
    
  } catch (error) {
    console.error('❌ 呼叫 Cloud Run 時發生錯誤:', error);
    return {
      success: false,
      message: '服務連線失敗',
      error: error.message
    };
  }
}

/**
 * 階段 5: 處理來自 Cloud Run 的回調（Shortcut 半自動化方案）
 * @param {Object} callbackData - Cloud Run 回傳的資料
 */
function handleCloudRunCallback(callbackData) {
  try {
    console.log('🌐 階段 5: 處理 Cloud Run 回調');
    console.log('📋 回調資料:', JSON.stringify(callbackData, null, 2));
    
    const success = callbackData.success;
    const userId = callbackData.user_id;
    const groupId = callbackData.group_id;
    const pdfFileId = callbackData.pdf_file_id;
    const message = callbackData.message || '';
    
    // 決定發送對象（優先使用群組，否則使用用戶）
    const targetId = groupId || userId;
    
    if (!targetId) {
      console.error('❌ 缺少發送對象（user_id 或 group_id）');
      return false;
    }
    
    if (success) {
      // ===== 成功：發送 Shortcut 連結 =====
      console.log('✅ 文件處理成功，準備發送 Shortcut 連結');
      
      // 檢查必要參數
      if (!pdfFileId) {
        console.error('❌ 缺少 pdf_file_id');
        pushMessage(targetId, '❌ 系統錯誤：缺少檔案資訊，請老媽聯繫peggy協助處理');
        return false;
      }
      
      // 1. 設定 PDF 為公開
      console.log('🔓 步驟 1: 設定 PDF 為公開');
      const publicSuccess = setFilePublic(pdfFileId);
      if (!publicSuccess) {
        console.error('❌ 設定檔案權限失敗');
        pushMessage(targetId, '❌ 檔案權限設定失敗，請老媽聯繫peggy協助處理');
        return false;
      }
      
      // 2. 構建 Shortcut URL
      console.log('📱 步驟 2: 構建 Shortcut URL');
      const shortcutUrl = buildShortcutUrl(pdfFileId);
      
      // 3. 發送 Shortcut 連結訊息
      console.log('📤 步驟 3: 發送 Shortcut 連結訊息');
      const sendSuccess = sendShortcutMessage(targetId, shortcutUrl);
      
      if (sendSuccess) {
        console.log('✅ Shortcut 連結已成功發送');
      } else {
        console.error('❌ Shortcut 連結發送失敗');
        return false;
      }
      
    } else {
      // ===== 失敗：發送錯誤訊息 =====
      console.error('❌ 文件處理失敗');
      
      const errorMessage = message || '處理失敗，請稍後重試';
      pushMessage(targetId, `❌ 申請處理失敗\n\n${errorMessage}\n\n請老媽聯繫peggy協助處理`);
    }
    
    console.log('🎯 Cloud Run 回調處理完成');
    return true;
    
  } catch (error) {
    console.error('❌ 處理 Cloud Run 回調時發生錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    
    // 嘗試通知用戶
    try {
      const targetId = callbackData.group_id || callbackData.user_id;
      if (targetId) {
        pushMessage(targetId, '❌ 系統發生錯誤，請老媽聯繫peggy協助處理');
      }
    } catch (notifyError) {
      console.error('❌ 通知用戶失敗:', notifyError);
    }
    
    return false;
  }
}

/**
 * 測試 Cloud Run 連線
 */
function testCloudRunConnection() {
  try {
    console.log('🧪 開始 Cloud Run 連線測試...');
    
    const config = CONFIG.PHASE5.CLOUD_RUN;
    const healthUrl = config.SERVICE_URL + '/health';
    
    console.log('🔗 測試健康檢查端點:', healthUrl);
    
    const options = {
      method: 'GET',
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(healthUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('📥 健康檢查回應:', responseCode, responseText);
    
    if (responseCode === 200) {
      console.log('✅ Cloud Run 服務正常');
      return true;
    } else {
      console.error('❌ Cloud Run 服務異常');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Cloud Run 連線測試失敗:', error);
    return false;
  }
}

/**
 * 複製 Word 模板檔案並建立 PDF 佔位檔案（Phase 5 方案 B）
 * @param {Object} applicationData - 申請資料
 * @return {Object} {success: boolean, copiedFileId: string, pdfFileId: string, message: string}
 */
function copyWordTemplate(applicationData) {
  try {
    console.log('📄 Phase 5: 複製 Word 模板檔案並建立 PDF 佔位檔案');
    
    const templateConfig = CONFIG.PHASE5.TEMPLATE;
    const wordTemplateId = templateConfig.WORD_FILE_ID;
    const pdfTemplateId = templateConfig.PDF_FILE_ID;
    const generatedFolderId = templateConfig.GENERATED_FOLDER_ID;
    
    // 生成檔案名稱（包含時間戳記）
    const now = new Date();
    const year = applicationData.year;
    const month = applicationData.month;
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = now.getDate().toString().padStart(2, '0');
    const hourStr = now.getHours().toString().padStart(2, '0');
    const minuteStr = now.getMinutes().toString().padStart(2, '0');
    
    const baseFileName = `申請表_${year}年${monthStr}月_${monthStr}${dayStr}_${hourStr}${minuteStr}`;
    const wordFileName = `${baseFileName}_待處理`;
    const pdfFileName = `${baseFileName}`;
    
    console.log('📝 生成檔案名稱:', wordFileName, pdfFileName);
    
    // 取得模板檔案和目標資料夾
    const wordTemplateFile = DriveApp.getFileById(wordTemplateId);
    const pdfTemplateFile = DriveApp.getFileById(pdfTemplateId);
    const generatedFolder = DriveApp.getFolderById(generatedFolderId);
    
    // 1. 複製 Word 檔案（方案 B：複製時就改名）
    const copiedWordFile = wordTemplateFile.makeCopy(wordFileName, generatedFolder);
    const copiedFileId = copiedWordFile.getId();
    
    // 2. 複製 PDF 檔案（方案 B：複製時就改名）
    const copiedPdfFile = pdfTemplateFile.makeCopy(pdfFileName, generatedFolder);
    const pdfFileId = copiedPdfFile.getId();
    
    console.log('✅ Word 複製成功:', copiedFileId);
    console.log('✅ PDF 複製成功:', pdfFileId);
    
    return {
      success: true,
      copiedFileId: copiedFileId,
      pdfFileId: pdfFileId,
      wordFileName: wordFileName + '.docx',
      pdfFileName: pdfFileName + '.pdf',
      message: 'Word 模板和 PDF 模板複製成功'
    };
    
  } catch (error) {
    console.error('❌ 複製模板失敗:', error);
    return {
      success: false,
      copiedFileId: null,
      pdfFileId: null,
      message: '模板複製失敗: ' + error.message
    };
  }
}

// =====================================================
// 系統維護函數
// =====================================================

/**
 * 每日自動喚醒函數 - 保持服務活躍和授權
 * 防止 GAS 部署和授權因長時間未使用而失效
 * 
 * 設定方式：
 * 1. GAS 編輯器 → 觸發條件 → 新增觸發條件
 * 2. 函數：dailyKeepAlive
 * 3. 事件來源：時間驅動 → 日計時器
 * 4. 時間：每天上午 8-9 點
 * 
 * 關鍵：此函數必須實際調用需要授權的 API（Drive/Sheets），
 * 才能真正「喚醒」授權，防止授權過期。
 */
function dailyKeepAlive() {
  try {
    console.log('🔄 每日自動喚醒執行 - ' + new Date());
    
    // ===== 關鍵修復：實際調用需要授權的 API =====
    
    // 1. 測試 Drive 授權（讀取常用影片檔案資訊）
    try {
      const videoFileId = CONFIG.PHASE3.GOOGLE_DRIVE.DEFAULT_VIDEO_ID;
      const videoFile = DriveApp.getFileById(videoFileId);
      const videoName = videoFile.getName();
      console.log('✅ Drive 授權正常 - 常用影片:', videoName);
    } catch (driveError) {
      console.error('❌ Drive 授權失敗:', driveError.message);
      // 不中斷流程，繼續測試其他服務
    }
    
    // 2. 測試 Sheets 授權（讀取申請記錄表格）
    try {
      const sheetsId = CONFIG.PHASE4.GOOGLE_SHEETS.APPLICATION_RECORD_ID;
      const sheet = SpreadsheetApp.openById(sheetsId).getSheetByName(CONFIG.PHASE4.GOOGLE_SHEETS.SHEET_NAME);
      const lastRow = sheet.getLastRow();
      console.log('✅ Sheets 授權正常 - 記錄筆數:', lastRow);
    } catch (sheetsError) {
      console.error('❌ Sheets 授權失敗:', sheetsError.message);
      // 不中斷流程
    }
    
    // 3. 測試 PropertiesService 授權
    try {
      const properties = PropertiesService.getScriptProperties();
      const lineToken = properties.getProperty('LINE_ACCESS_TOKEN');
      console.log('✅ PropertiesService 授權正常 - LINE Token:', lineToken ? '已設定' : '未設定');
    } catch (propsError) {
      console.error('❌ PropertiesService 授權失敗:', propsError.message);
    }
    
    // 4. 檢查系統配置
    try {
      validateConfig();
      console.log('✅ 系統配置檢查通過');
    } catch (configError) {
      console.warn('⚠️ 系統配置檢查失敗:', configError.message);
    }
    
    const testData = {
      timestamp: new Date(),
      status: 'alive',
      message: '系統和授權正常運作',
      version: 'v1.1 - 修復授權喚醒'
    };
    
    console.log('✅ 喚醒成功:', JSON.stringify(testData));
    return testData;
    
  } catch (error) {
    console.error('❌ 喚醒失敗:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return {
      timestamp: new Date(),
      status: 'error',
      message: '喚醒失敗',
      error: error.message
    };
  }
}

/**
 * 🔍 DEBUG: 測試配置載入狀況
 * 用於診斷為什麼 LINE Bot 走到 Phase 2
 */
function debugPhaseConfig() {
  console.log('========================================');
  console.log('🔍 DEBUG: 配置診斷測試');
  console.log('========================================');
  
  console.log('');
  console.log('📋 CONFIG 物件類型:', typeof CONFIG);
  
  console.log('');
  console.log('📋 PHASE2 設定:');
  console.log('   ENABLE_OPENAI:', CONFIG.PHASE2.ENABLE_OPENAI);
  
  console.log('');
  console.log('📋 PHASE3 設定:');
  console.log('   ENABLE_STATE_MANAGEMENT:', CONFIG.PHASE3.ENABLE_STATE_MANAGEMENT);
  console.log('   ENABLE_BUSINESS_LOGIC:', CONFIG.PHASE3.ENABLE_BUSINESS_LOGIC);
  
  console.log('');
  console.log('📋 完整 PHASE3 設定:');
  console.log(JSON.stringify(CONFIG.PHASE3, null, 2));
  
  console.log('');
  console.log('========================================');
  console.log('✅ 診斷測試完成');
  console.log('========================================');
  
  return {
    success: true,
    phase2_enabled: CONFIG.PHASE2.ENABLE_OPENAI,
    phase3_enabled: CONFIG.PHASE3.ENABLE_STATE_MANAGEMENT
  };
}

/**
 * 🔍 診斷授權狀態
 * 用於確認當前 GAS 的授權狀態和問題
 */
function diagnoseAuthorizationStatus() {
  console.log('========================================');
  console.log('🔍 授權狀態診斷');
  console.log('========================================');
  
  const results = {
    timestamp: new Date(),
    tests: {}
  };
  
  // 測試 1: DriveApp 授權
  console.log('\n📁 測試 1: DriveApp 授權');
  try {
    const videoFileId = CONFIG.PHASE3.GOOGLE_DRIVE.DEFAULT_VIDEO_ID;
    const videoFile = DriveApp.getFileById(videoFileId);
    const videoName = videoFile.getName();
    const videoSize = videoFile.getSize();
    console.log('✅ DriveApp 授權正常');
    console.log('   - 檔案名稱:', videoName);
    console.log('   - 檔案大小:', Math.round(videoSize / 1024 / 1024) + ' MB');
    results.tests.drive = { success: true, fileName: videoName };
  } catch (error) {
    console.error('❌ DriveApp 授權失敗:', error.message);
    results.tests.drive = { success: false, error: error.message };
  }
  
  // 測試 2: SpreadsheetApp 授權
  console.log('\n📊 測試 2: SpreadsheetApp 授權');
  try {
    const sheetsId = CONFIG.PHASE4.GOOGLE_SHEETS.APPLICATION_RECORD_ID;
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    const sheet = spreadsheet.getSheetByName(CONFIG.PHASE4.GOOGLE_SHEETS.SHEET_NAME);
    const lastRow = sheet.getLastRow();
    console.log('✅ SpreadsheetApp 授權正常');
    console.log('   - 試算表名稱:', spreadsheet.getName());
    console.log('   - 工作表名稱:', sheet.getName());
    console.log('   - 資料列數:', lastRow);
    results.tests.sheets = { success: true, lastRow: lastRow };
  } catch (error) {
    console.error('❌ SpreadsheetApp 授權失敗:', error.message);
    results.tests.sheets = { success: false, error: error.message };
  }
  
  // 測試 3: PropertiesService 授權
  console.log('\n🔑 測試 3: PropertiesService 授權');
  try {
    const properties = PropertiesService.getScriptProperties();
    const lineToken = properties.getProperty('LINE_ACCESS_TOKEN');
    const openaiKey = properties.getProperty('OPENAI_API_KEY');
    console.log('✅ PropertiesService 授權正常');
    console.log('   - LINE Token:', lineToken ? '已設定' : '未設定');
    console.log('   - OpenAI Key:', openaiKey ? '已設定' : '未設定');
    results.tests.properties = { 
      success: true, 
      hasLineToken: !!lineToken,
      hasOpenAIKey: !!openaiKey
    };
  } catch (error) {
    console.error('❌ PropertiesService 授權失敗:', error.message);
    results.tests.properties = { success: false, error: error.message };
  }
  
  // 測試 4: UrlFetchApp 授權（測試 Cloud Run 連線）
  console.log('\n🌐 測試 4: UrlFetchApp 授權');
  try {
    const testUrl = 'https://www.google.com';
    const response = UrlFetchApp.fetch(testUrl, { muteHttpExceptions: true });
    const statusCode = response.getResponseCode();
    console.log('✅ UrlFetchApp 授權正常');
    console.log('   - 測試 URL:', testUrl);
    console.log('   - 回應狀態:', statusCode);
    results.tests.urlFetch = { success: true, statusCode: statusCode };
  } catch (error) {
    console.error('❌ UrlFetchApp 授權失敗:', error.message);
    results.tests.urlFetch = { success: false, error: error.message };
  }
  
  // 測試 5: CacheService 授權
  console.log('\n💾 測試 5: CacheService 授權');
  try {
    const cache = CacheService.getScriptCache();
    const testKey = 'auth_test_' + new Date().getTime();
    const testValue = 'test_value';
    cache.put(testKey, testValue, 60);
    const retrievedValue = cache.get(testKey);
    console.log('✅ CacheService 授權正常');
    console.log('   - 寫入測試:', retrievedValue === testValue ? '成功' : '失敗');
    cache.remove(testKey);
    results.tests.cache = { success: true };
  } catch (error) {
    console.error('❌ CacheService 授權失敗:', error.message);
    results.tests.cache = { success: false, error: error.message };
  }
  
  console.log('\n========================================');
  console.log('📋 診斷摘要:');
  console.log('   - DriveApp:', results.tests.drive.success ? '✅' : '❌');
  console.log('   - SpreadsheetApp:', results.tests.sheets.success ? '✅' : '❌');
  console.log('   - PropertiesService:', results.tests.properties.success ? '✅' : '❌');
  console.log('   - UrlFetchApp:', results.tests.urlFetch.success ? '✅' : '❌');
  console.log('   - CacheService:', results.tests.cache.success ? '✅' : '❌');
  console.log('========================================');
  
  return results;
}

// =====================================================
// 階段 5: iOS Shortcut 半自動化方案工具函數
// =====================================================

/**
 * 階段 5: 設定 Drive 檔案為公開
 * @param {string} fileId - 檔案 ID
 * @return {boolean} 是否設定成功
 */
function setFilePublic(fileId) {
  try {
    console.log('🔓 設定檔案為公開:', fileId);
    const file = DriveApp.getFileById(fileId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    console.log('✅ 檔案已設為公開');
    return true;
  } catch (error) {
    console.error('❌ 設定檔案權限失敗:', error);
    return false;
  }
}

/**
 * 階段 5: 構建 Shortcut URL
 * @param {string} pdfFileId - PDF 檔案 ID
 * @return {string} Shortcut URL
 */
function buildShortcutUrl(pdfFileId) {
  try {
    const shortcutConfig = CONFIG.SHORTCUT;
    const downloadUrl = shortcutConfig.DRIVE_DOWNLOAD_BASE + pdfFileId;
    const encodedUrl = encodeURIComponent(downloadUrl);
    
    const shortcutUrl = `${shortcutConfig.BASE_URL}?name=${encodeURIComponent(shortcutConfig.NAME)}&input=text&text=${encodedUrl}`;
    
    console.log('📱 Shortcut URL 已構建:', shortcutUrl);
    return shortcutUrl;
  } catch (error) {
    console.error('❌ 構建 Shortcut URL 失敗:', error);
    throw error;
  }
}

/**
 * 🧪 測試階段 5 步驟 1：基礎設定與工具函數
 * 保留供未來測試使用
 */
function testPhase5Step1() {
  console.log('========================================');
  console.log('🧪 階段 5 步驟 1 測試開始');
  console.log('========================================');
  
  try {
    // 測試 1: 讀取 Shortcut 設定
    console.log('\n📋 測試 1: 讀取 Shortcut 設定');
    console.log('Shortcut NAME:', CONFIG.SHORTCUT.NAME);
    console.log('Shortcut BASE_URL:', CONFIG.SHORTCUT.BASE_URL);
    console.log('Shortcut DRIVE_DOWNLOAD_BASE:', CONFIG.SHORTCUT.DRIVE_DOWNLOAD_BASE);
    console.log('✅ Shortcut 設定讀取成功');
    
    // 測試 2: 找到測試用 PDF
    console.log('\n📄 測試 2: 從生成文件資料夾找測試 PDF');
    const generatedFolderId = CONFIG.PHASE5.TEMPLATE.GENERATED_FOLDER_ID;
    const folder = DriveApp.getFolderById(generatedFolderId);
    const files = folder.getFilesByType(MimeType.PDF);
    
    if (!files.hasNext()) {
      console.error('❌ 資料夾內找不到 PDF 檔案');
      return { success: false, error: '找不到測試 PDF' };
    }
    
    const testPdf = files.next();
    const testFileId = testPdf.getId();
    const testFileName = testPdf.getName();
    
    console.log('找到測試 PDF:', testFileName);
    console.log('檔案 ID:', testFileId);
    console.log('✅ 測試 PDF 找到');
    
    // 測試 3: 設定檔案公開
    console.log('\n🔓 測試 3: 設定檔案為公開');
    const publicSuccess = setFilePublic(testFileId);
    if (!publicSuccess) {
      return { success: false, error: '設定公開失敗' };
    }
    console.log('✅ 檔案權限設定成功');
    
    // 測試 4: 構建 Shortcut URL
    console.log('\n📱 測試 4: 構建 Shortcut URL');
    const shortcutUrl = buildShortcutUrl(testFileId);
    console.log('✅ Shortcut URL 構建成功');
    console.log('完整 URL:', shortcutUrl);
    
    // 測試 5: 驗證 URL 格式
    console.log('\n🔍 測試 5: 驗證 URL 格式');
    if (!shortcutUrl.startsWith('shortcuts://run-shortcut?')) {
      console.error('❌ URL 格式錯誤');
      return { success: false, error: 'URL 格式不正確' };
    }
    if (!shortcutUrl.includes('name=')) {
      console.error('❌ URL 缺少 name 參數');
      return { success: false, error: 'URL 缺少必要參數' };
    }
    if (!shortcutUrl.includes('text=')) {
      console.error('❌ URL 缺少 text 參數');
      return { success: false, error: 'URL 缺少必要參數' };
    }
    console.log('✅ URL 格式驗證通過');
    
    console.log('\n========================================');
    console.log('🎉 階段 5 步驟 1 測試完成！');
    console.log('========================================');
    console.log('📋 測試摘要:');
    console.log('   - 測試檔案:', testFileName);
    console.log('   - 檔案 ID:', testFileId);
    console.log('   - Shortcut URL 長度:', shortcutUrl.length, '字元');
    console.log('========================================');
    
    return {
      success: true,
      testFileId: testFileId,
      testFileName: testFileName,
      shortcutUrl: shortcutUrl
    };
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    console.error('錯誤詳情:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🧪 測試階段 5 步驟 2：LINE 按鈕功能
 * 保留供未來測試使用
 */
function testPhase5Step2() {
  console.log('========================================');
  console.log('🧪 階段 5 步驟 2 測試開始');
  console.log('========================================');
  
  try {
    // 測試用戶 ID
    const testUserId = 'Ue75403f8c9bfc49141bf88072646eacf';
    
    console.log('\n👤 測試對象:', testUserId);
    
    // 測試 1: 找到測試用 PDF
    console.log('\n📄 測試 1: 從生成文件資料夾找測試 PDF');
    const generatedFolderId = CONFIG.PHASE5.TEMPLATE.GENERATED_FOLDER_ID;
    const folder = DriveApp.getFolderById(generatedFolderId);
    const files = folder.getFilesByType(MimeType.PDF);
    
    if (!files.hasNext()) {
      console.error('❌ 資料夾內找不到 PDF 檔案');
      return { success: false, error: '找不到測試 PDF' };
    }
    
    const testPdf = files.next();
    const testFileId = testPdf.getId();
    const testFileName = testPdf.getName();
    
    console.log('找到測試 PDF:', testFileName);
    console.log('檔案 ID:', testFileId);
    console.log('✅ 測試 PDF 找到');
    
    // 測試 2: 設定檔案公開（確保可下載）
    console.log('\n🔓 測試 2: 確保檔案為公開');
    const publicSuccess = setFilePublic(testFileId);
    if (!publicSuccess) {
      return { success: false, error: '設定公開失敗' };
    }
    console.log('✅ 檔案權限確認');
    
    // 測試 3: 構建 Shortcut URL
    console.log('\n📱 測試 3: 構建 Shortcut URL');
    const shortcutUrl = buildShortcutUrl(testFileId);
    console.log('Shortcut URL:', shortcutUrl);
    console.log('✅ URL 構建成功');
    
    // 測試 4: 發送 LINE 連結訊息
    console.log('\n📤 測試 4: 發送 LINE 連結訊息');
    const sendSuccess = sendShortcutMessage(testUserId, shortcutUrl);
    
    if (!sendSuccess) {
      console.error('❌ LINE 訊息發送失敗');
      return { success: false, error: 'LINE 訊息發送失敗' };
    }
    
    console.log('✅ LINE 訊息發送成功');
    
    console.log('\n========================================');
    console.log('🎉 階段 5 步驟 2 測試完成！');
    console.log('========================================');
    console.log('📋 測試摘要:');
    console.log('   - 接收對象:', testUserId);
    console.log('   - 測試檔案:', testFileName);
    console.log('   - 檔案 ID:', testFileId);
    console.log('   - LINE 訊息:', '已發送純文字訊息（含 Shortcut 連結）');
    console.log('\n📱 請到 LINE 確認:');
    console.log('   1. 是否收到訊息');
    console.log('   2. 訊息包含: ✅ 申請表已準備好！');
    console.log('   3. Shortcut URL 是否為可點擊連結');
    console.log('   4. 點擊連結是否能啟動 Shortcut app');
    console.log('========================================');
    
    return {
      success: true,
      testUserId: testUserId,
      testFileId: testFileId,
      testFileName: testFileName,
      shortcutUrl: shortcutUrl,
      lineSent: true
    };
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    console.error('錯誤詳情:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🧪 測試階段 5 步驟 3：Cloud Run 回調整合
 * 測試 handleCloudRunCallback() 能否正確串接步驟 1-2 的函數
 * 保留供未來測試使用
 */
function testPhase5Step3() {
  console.log('========================================');
  console.log('🧪 階段 5 步驟 3 測試開始');
  console.log('========================================');
  
  try {
    // 測試用戶 ID
    const testUserId = 'Ue75403f8c9bfc49141bf88072646eacf';
    
    console.log('\n👤 測試對象:', testUserId);
    
    // 準備測試用 PDF
    console.log('\n📄 準備測試 PDF');
    const generatedFolderId = CONFIG.PHASE5.TEMPLATE.GENERATED_FOLDER_ID;
    const folder = DriveApp.getFolderById(generatedFolderId);
    const files = folder.getFilesByType(MimeType.PDF);
    
    if (!files.hasNext()) {
      console.error('❌ 資料夾內找不到 PDF 檔案');
      return { success: false, error: '找不到測試 PDF' };
    }
    
    const testPdf = files.next();
    const testFileId = testPdf.getId();
    const testFileName = testPdf.getName();
    
    console.log('找到測試 PDF:', testFileName);
    console.log('檔案 ID:', testFileId);
    
    // ===== 測試情況 1：成功回調 =====
    console.log('\n========================================');
    console.log('📋 測試情況 1: 模擬成功回調');
    console.log('========================================');
    
    const successCallbackData = {
      success: true,
      user_id: testUserId,
      group_id: null,
      pdf_file_id: testFileId,
      timestamp: '20251222-0800',
      message: '✅ 申請表已準備好'
    };
    
    console.log('模擬回調資料:', JSON.stringify(successCallbackData, null, 2));
    console.log('\n🚀 呼叫 handleCloudRunCallback()...');
    
    const successResult = handleCloudRunCallback(successCallbackData);
    
    if (successResult) {
      console.log('✅ 成功回調處理完成');
    } else {
      console.error('❌ 成功回調處理失敗');
      return { success: false, error: '成功回調處理失敗' };
    }
    
    console.log('\n📱 請到 LINE 確認:');
    console.log('   - 應該收到 2 則訊息');
    console.log('   - 第 1 則: ✅ 申請表已準備好，請點擊下方連結取得申請書：');
    console.log('   - 第 2 則: shortcuts://... (可點擊連結)');
    
    // 等待 3 秒讓 LINE 訊息送達
    console.log('\n⏳ 等待 3 秒...');
    Utilities.sleep(3000);
    
    // ===== 測試情況 2：失敗回調 =====
    console.log('\n========================================');
    console.log('📋 測試情況 2: 模擬失敗回調');
    console.log('========================================');
    
    const failureCallbackData = {
      success: false,
      user_id: testUserId,
      group_id: null,
      timestamp: '20251222-0801',
      message: '測試錯誤：這是模擬的錯誤訊息'
    };
    
    console.log('模擬回調資料:', JSON.stringify(failureCallbackData, null, 2));
    console.log('\n🚀 呼叫 handleCloudRunCallback()...');
    
    const failureResult = handleCloudRunCallback(failureCallbackData);
    
    if (failureResult) {
      console.log('✅ 失敗回調處理完成');
    } else {
      console.error('❌ 失敗回調處理失敗');
      return { success: false, error: '失敗回調處理失敗' };
    }
    
    console.log('\n📱 請到 LINE 確認:');
    console.log('   - 應該收到 1 則錯誤訊息');
    console.log('   - 內容包含: ❌ 申請處理失敗');
    console.log('   - 不應該有 Shortcut 連結');
    
    // ===== 測試完成 =====
    console.log('\n========================================');
    console.log('🎉 階段 5 步驟 3 測試完成！');
    console.log('========================================');
    console.log('📋 測試摘要:');
    console.log('   - 測試檔案:', testFileName);
    console.log('   - 檔案 ID:', testFileId);
    console.log('   - 成功回調: 已處理');
    console.log('   - 失敗回調: 已處理');
    console.log('\n✅ 驗證清單:');
    console.log('   1. LINE 收到成功訊息 (2 則)');
    console.log('   2. Shortcut 連結可點擊');
    console.log('   3. LINE 收到失敗訊息 (1 則)');
    console.log('   4. 失敗訊息不含連結');
    console.log('========================================');
    
    return {
      success: true,
      testUserId: testUserId,
      testFileId: testFileId,
      testFileName: testFileName,
      successCallback: successResult,
      failureCallback: failureResult
    };
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    console.error('錯誤詳情:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}
