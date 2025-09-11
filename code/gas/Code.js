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
  
  // Phase 3: 狀態管理和業務邏輯
  if (CONFIG.PHASE3.ENABLE_STATE_MANAGEMENT) {
    handleTextMessageWithState(event, text);
  }
  // Phase 2: 使用 OpenAI 語意解析
  else if (CONFIG.PHASE2.ENABLE_OPENAI) {
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
      return '您好！我是松菸申請助手 🎭\n\n請說「申請」開始申請流程';
    
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
  
  // 檢查申請時間窗口
  const windowCheck = checkApplicationWindow();
  if (!windowCheck.isOpen) {
    return `⏰ 現在不是申請時間\n\n${windowCheck.message}`;
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
  return `📅 申請 ${targetMonth.display} 份場地

📍 預設日期：${defaultDates.display}
🎬 影片：使用常用影片

✅ 確認請說「好」或「對」
📝 修改請說「改日期」或「改影片」`;
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
  return `🤖 松菸申請助手使用說明

📌 主要功能：
• 申請松山文創園區街頭藝人場地
• 自動計算可申請日期
• 處理申請文件

💬 指令說明：
• 「申請」- 開始申請流程
• 「測試」- 測試系統狀態
• 「幫助」- 顯示此說明

📅 申請規則：
• 每月 1-15 日可申請
• 可申請未來 1-2 個月場地
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
function handleStateBasedInput(userState, text, userId) {
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
        return confirmApplication(userId);
      } else if (normalizedText.includes('改日期') || normalizedText.includes('修改日期')) {
        return startDateModification(userId);
      } else if (normalizedText.includes('改影片') || normalizedText.includes('修改影片')) {
        return startVideoModification(userId);
      } else if (normalizedText.includes('修改') || normalizedText.includes('改')) {
        return '要修改什麼？\n\n請說「改日期」或「改影片」';
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
        return '已取消日期修改\n\n' + getApplicationSummary(state);
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
        
        return getApplicationSummary(state) + '\n\n✅ 確認請說「好」\n📝 繼續修改請說「改日期」或「改影片」';
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
        return '已取消影片修改\n\n' + getApplicationSummary(state);
      }
      return '請直接傳送影片檔案，或說「取消」放棄修改';
    
    case 'final_confirmation':
      // 最終確認狀態
      if (['對', '好', '確定', '確認', '可以', 'ok'].includes(normalizedText)) {
        return executeFinalApplication(userId);
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
 */
function confirmApplication(userId) {
  const state = getUserState(userId);
  if (!state) {
    return '請先說「申請」開始申請流程';
  }
  
  const dateDisplay = state.selectedDates.map(d => d.display).join('、');
  const videoDisplay = state.useDefaultVideo ? '常用影片' : '新上傳影片';
  
  // 最終確認提示
  const confirmMessage = `📋 最終確認：

📅 申請月份：${state.targetMonth.display}
📍 申請日期：${dateDisplay}
🎬 表演影片：${videoDisplay}

✅ 確定請說「好」開始申請
❌ 還要修改請說「改日期」或「改影片」`;
  
  // 設定狀態為等待最終確認
  state.currentStep = 'final_confirmation';
  setUserState(userId, state);
  
  return confirmMessage;
}

/**
 * 執行最終申請（Phase 4 版本 - 含 Sheets 記錄）
 */
function executeFinalApplication(userId) {
  const state = getUserState(userId);
  if (!state) {
    return '請先說「申請」開始申請流程';
  }
  
  const dateDisplay = state.selectedDates.map(d => d.display).join('、');
  const videoDisplay = state.useDefaultVideo ? '常用影片' : '新上傳影片';
  
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
    
    // Phase 5: 自動呼叫 Cloud Run 處理文件（方案 B：GAS 複製 + Cloud Run 編輯）
    let documentProcessingMessage = '';
    if (CONFIG.PHASE5.ENABLE_DOCUMENT_PROCESSING) {
      console.log('🚀 Phase 5: 自動呼叫 Cloud Run 處理文件（方案 B）');
      
      if (!applicationData) {
        applicationData = prepareApplicationData(state);
      }
      
      // 步驟 1: GAS 複製 Word 模板
      const copyResult = copyWordTemplate(applicationData);
      
      if (copyResult.success) {
        console.log('✅ 模板複製成功，開始呼叫 Cloud Run');
        
        // 步驟 2: 呼叫 Cloud Run，傳送複製檔案的 ID 和時間戳記
        const cloudRunData = {
          timestamp: applicationData.timestamp,  // 新增：用於精確識別記錄
          user_id: userId,                       // 保留：向後相容
          application_data: {
            ...applicationData,
            copiedFileId: copyResult.copiedFileId,
            pdfFileId: copyResult.pdfFileId,
            copiedFileName: copyResult.wordFileName,
            pdfFileName: copyResult.pdfFileName
          }
        };
        
        const cloudRunResult = callCloudRunForDocumentProcessing(userId, cloudRunData);
        
        if (cloudRunResult.success) {
          documentProcessingMessage = '\n🔄 文件處理已啟動，系統正在生成 PDF\n📄 Word 檔案：' + copyResult.wordFileName + '\n📄 PDF 檔案：' + copyResult.pdfFileName;
        } else {
          documentProcessingMessage = '\n⚠️ 文件處理啟動失敗，但檔案已準備\n📄 Word：' + copyResult.wordFileName + '\n📄 PDF：' + copyResult.pdfFileName;
          console.error('❌ Cloud Run 呼叫失敗:', cloudRunResult.error);
        }
      } else {
        documentProcessingMessage = '\n❌ 模板複製失敗，無法啟動文件處理\n🔧 ' + copyResult.message;
        console.error('❌ 模板複製失敗:', copyResult.message);
      }
    }
    
    // 清除對話狀態
    clearUserState(userId);
    
    return `✅ 申請已送出並記錄！

📅 申請月份：${state.targetMonth.display}
📍 申請日期：${dateDisplay}
🎬 表演影片：${videoDisplay}

📊 申請資訊已記錄到系統${documentProcessingMessage}
🔔 處理完成後會更新狀態

🎉 Phase 5 自動化流程已啟動！`;
    
  } catch (error) {
    console.error('❌ 申請記錄過程發生錯誤:', error);
    
    // 即使記錄失敗也要清除狀態
    clearUserState(userId);
    
    return `✅ 申請已送出！

📅 申請月份：${state.targetMonth.display}
📍 申請日期：${dateDisplay}
🎬 表演影片：${videoDisplay}

⚠️ 資料記錄可能有問題，請聯繫管理員
📧 系統將自動處理您的申請`;
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
  
  return `📅 ${state.targetMonth.display} 可選日期：

週六：${allDates.saturdayDisplay}
週日：${allDates.sundayDisplay}

請告訴我您要哪幾天（例如：11號、12號、26號）`;
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
  
  return `請直接傳送影片檔案`;
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
    
    return `✅ 日期已更新！

📍 目前選擇：${directParseResult.dates.map(d => d.display).join('、')}

🔄 還要改嗎？直接說新的日期
✅ 滿意請說「好」完成選擇`;
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
    
    const response = `✅ 影片上傳成功！

${getApplicationSummary(state)}

✅ 確認請說「好」
📝 繼續修改請說「改日期」或「改影片」`;
    
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
  
  const welcomeMessage = `歡迎使用松菸申請助手！🎭

我可以協助您：
• 申請松山文創園區街頭藝人場地
• 自動計算可申請日期
• 處理申請文件

📌 使用方式：
說「申請」開始申請流程
說「測試」測試系統狀態
說「幫助」查看使用說明

目前處於 Phase 3 開發階段`;
  
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
  
  return getApplicationSummary(state) + '\n\n✅ 確認請說「好」\n📝 繼續修改請說「改日期」或「改影片」';
}

/**
 * 取得申請摘要
 */
function getApplicationSummary(state) {
  const dateDisplay = state.selectedDates.map(d => d.display).join('、');
  const videoDisplay = state.useDefaultVideo ? '常用影片' : '新上傳影片';
  
  return `📋 目前申請資訊：
📅 月份：${state.targetMonth.display}
📍 日期：${dateDisplay}
🎬 影片：${videoDisplay}`;
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
  
  return `🤖 我理解您要「${aiUnderstood}」

📍 選擇日期：${parsedDates.map(d => d.display).join('、')}

✅ 正確請說「對」或「好」
❌ 錯誤請重新說一次您要的日期`;
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
    
    const response = `❌ ${errorMessage}

💡 目前先使用常用影片繼續申請

${getApplicationSummary(state)}

✅ 確認請說「好」
📝 重新上傳請說「改影片」`;
    
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
      const stateResponse = handleStateBasedInput(userState, text, userId);
      if (stateResponse) {
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
      const response = `😕 不太確定您的意思\n\n請用更清楚的方式表達，例如：\n• 「申請」開始申請\n• 「幫助」查看說明`;
      replyMessage(replyToken, response);
    }
    
  } catch (error) {
    console.error('❌ Phase 3 處理失敗:', error);
    handleTextMessageWithAI(event, text); // 降級到 Phase 2
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
    // 將 display 格式 "10/4(六)" 轉換為完整日期 "2024/10/4"
    const dateParts = date.display.match(/(\d+)\/(\d+)/);
    if (dateParts) {
      const month = dateParts[1];
      const day = dateParts[2];
      
      // 處理 fullDate 可能是字串的情況（Cache Service 序列化問題）
      let year;
      try {
        if (date.fullDate) {
          if (typeof date.fullDate === 'string') {
            // 如果是字串，轉換為 Date 物件
            const fullDate = new Date(date.fullDate);
            year = fullDate.getFullYear();
          } else {
            // 如果是 Date 物件
            year = date.fullDate.getFullYear();
          }
        } else {
          // 如果沒有 fullDate，使用當前年份或下一年
          const now = new Date();
          year = now.getFullYear();
          if (parseInt(month) < now.getMonth() + 1) {
            year += 1; // 如果月份小於當前月份，假設是下一年
          }
        }
      } catch (error) {
        console.error('❌ 日期解析錯誤:', error);
        // 降級：使用當前年份
        year = new Date().getFullYear();
      }
      
      return `${year}/${month}/${day}`;
    }
    return date.display;
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
    video_url = CONFIG.PHASE3.GOOGLE_DRIVE.DEFAULT_VIDEO_URL;
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
 * 呼叫 Cloud Run 進行文件處理
 * @param {string} userId - 用戶ID
 * @param {Object} cloudRunData - 完整的 Cloud Run 請求資料
 * @return {Object} 處理結果 {success: boolean, message: string, error?: string}
 */
function callCloudRunForDocumentProcessing(userId, cloudRunData) {
  try {
    console.log('🚀 Phase 5: 呼叫 Cloud Run 處理文件');
    
    const config = CONFIG.PHASE5.CLOUD_RUN;
    const url = config.SERVICE_URL + config.PROCESS_ENDPOINT;
    
    // 直接使用已準備好的 cloudRunData（格式已經正確）
    const requestData = cloudRunData;
    
    console.log('📤 發送請求到 Cloud Run:', url);
    console.log('📋 請求資料:', JSON.stringify(requestData, null, 2));
    
    // 發送 HTTP 請求
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
          message: '文件處理已啟動',
          result: result
        };
      } catch (parseError) {
        console.error('❌ 解析 Cloud Run 回應失敗:', parseError);
        return {
          success: false,
          message: '文件處理服務回應格式錯誤',
          error: parseError.message
        };
      }
    } else {
      console.error('❌ Cloud Run 呼叫失敗:', responseCode, responseText);
      return {
        success: false,
        message: `文件處理服務暫時無法使用 (${responseCode})`,
        error: responseText
      };
    }
    
  } catch (error) {
    console.error('❌ 呼叫 Cloud Run 時發生錯誤:', error);
    return {
      success: false,
      message: '文件處理服務連線失敗',
      error: error.message
    };
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
