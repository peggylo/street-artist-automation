/**
 * 街頭藝人申請系統 - OpenAI API 處理
 * Phase 2: AI語意解析整合
 */

/**
 * 主要的 OpenAI 語意解析函數
 * @param {string} userInput - 用戶輸入的原始文字
 * @param {string} context - 對話上下文（如：'application', 'date_selection', 'video_choice'）
 * @return {Object} 解析結果 {intent, confidence, correctedText, data}
 */
function analyzeUserIntent(userInput, context = 'general') {
  try {
    console.log('🤖 開始 OpenAI 語意解析:', userInput);
    console.log('📋 對話上下文:', context);
    
    // 建構 prompt 根據不同上下文
    const prompt = buildPromptByContext(userInput, context);
    
    // 調用 OpenAI API
    const openaiResponse = callOpenAI(prompt);
    
    if (!openaiResponse) {
      console.log('🔄 OpenAI 失敗，降級到關鍵字匹配');
      return fallbackKeywordMatching(userInput, context);
    }
    
    // 解析回應
    const result = parseOpenAIResponse(openaiResponse, userInput);
    
    console.log('✅ OpenAI 解析完成:', result);
    return result;
    
  } catch (error) {
    console.error('❌ OpenAI 語意解析錯誤:', error);
    return fallbackKeywordMatching(userInput, context);
  }
}

/**
 * 根據上下文建構不同的 prompt
 * @param {string} userInput - 用戶輸入
 * @param {string} context - 上下文
 * @return {string} 建構好的 prompt
 */
function buildPromptByContext(userInput, context) {
  const basePrompt = `你是一個專門處理盲人語音輸入錯誤的AI助手。盲人語音輸入常見錯誤模式：

數字錯誤：
- 「時」通常是「十」的錯誤（6時6日 = 6月16日，三月時五日 = 三月十五日）
- 「一」可能是「醫」、「二」可能是「而」
- 「三」可能是「山」、「四」可能是「是」
- 「五」可能是「無」、「六」可能是「路」
- 「七」可能是「期」、「八」可能是「把」
- 「九」可能是「酒」

日期月份錯誤（極重要）：
- 「越」、「樂」、「約」都是「月」的錯誤
- 「六越」= 「六月」
- 「七越」= 「七月」
- 「十越」= 「十月」

日期日號錯誤：
- 「好」、「號」、「日」常混淆
- 「二十三好」= 「二十三號」
- 「十六日」= 「十六日」（正確）
- 「號」和「日」都可以接受

申請相關錯誤：
- 「藥」、「要」、「腰」常混淆
- 「我藥申請」= 「我要申請」
- 「藥聲請」= 「要申請」
- 「聲請」、「身請」= 「申請」

重要範例：
- 「六越十六日」= 「六月十六日」
- 「六越二十三號」= 「六月二十三號」
- 「我藥聲請」= 「我要申請」

請特別注意這些語音錯誤，並提供正確的理解。

用戶輸入：「${userInput}」
對話情境：${context}

請以JSON格式回應，包含：
{
  "intent": "用戶意圖",
  "confidence": 0.0-1.0的信心度分數,
  "correctedText": "修正後的文字",
  "explanation": "簡短解釋"
}`;

  switch (context) {
    case 'application':
      return basePrompt + `

可能的意圖類型：
- "apply": 用戶想要申請場地（包含「申請」、「藥申請」、「伸請」、「聲請」、「身請」、「要申請」、「我要申請」等變體）
- "confirm": 用戶確認或同意（「好」、「對」、「確認」、「可以」、「正確」、「是的」、「沒錯」等）
- "modify": 用戶想要修改或重選（「修改」、「不對」、「重選」、「不要」等）
- "unclear": 無法確定意圖

範例：
輸入「聲請」→ {"intent":"apply","confidence":0.9,"correctedText":"申請","explanation":"語音錯誤修正：聲請→申請"}
輸入「正確」→ {"intent":"confirm","confidence":0.9,"correctedText":"確認","explanation":"用戶確認理解正確"}`;

    case 'date_selection':
      return basePrompt + `

可能的意圖類型：
- "confirm": 確認預設日期
- "modify": 要修改日期選擇
- "select_dates": 選擇特定日期（如「前兩個週六」、「第一和第三個」）
- "unclear": 無法理解選擇

範例：
輸入「前兩個週六」→ {"intent":"select_dates","confidence":0.8,"correctedText":"前兩個週六","explanation":"選擇前兩個週六日期"}`;

    case 'video_choice':
      return basePrompt + `

可能的意圖類型：
- "use_default": 使用常用影片（「常用」、「預設」、「常用影片」等）
- "upload_new": 上傳新影片（「新影片」、「上傳」、「新的」等）
- "unclear": 無法確定選擇

範例：
輸入「常用的」→ {"intent":"use_default","confidence":0.9,"correctedText":"常用影片","explanation":"選擇使用常用影片"}`;

    default:
      return basePrompt + `

一般對話可能的意圖：
- "apply": 申請相關（包含「申請」、「藥申請」、「伸請」、「聲請」、「身請」、「我藥申請」等）
- "date": 日期相關（包含月份日期，如「六月十六日」、「七月二十一」等）
- "confirm": 確認同意（包含「好」、「對」、「確認」、「可以」、「正確」、「是的」、「沒錯」等）
- "help": 尋求幫助
- "test": 測試系統
- "greeting": 打招呼
- "unclear": 無法理解

請根據輸入內容判斷最合適的意圖。

重要範例：
輸入「我藥聲請」→ {"intent":"apply","confidence":0.95,"correctedText":"我要申請","explanation":"語音錯誤修正：藥→要、聲請→申請"}
輸入「六越十六日」→ {"intent":"date","confidence":0.95,"correctedText":"六月十六日","explanation":"語音錯誤修正：越→月"}
輸入「聲請」→ {"intent":"apply","confidence":0.9,"correctedText":"申請","explanation":"語音錯誤修正"}
輸入「正確」→ {"intent":"confirm","confidence":0.9,"correctedText":"確認","explanation":"用戶表示確認"}`;
  }
}

/**
 * 調用 OpenAI API
 * @param {string} prompt - 要發送的 prompt
 * @return {Object|null} API 回應結果
 */
function callOpenAI(prompt) {
  const config = getOpenAIConfig();
  
  if (!config.API_KEY) {
    console.error('❌ OpenAI API Key 未設定');
    return null;
  }
  
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const payload = {
    model: config.MODEL,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: config.TEMPERATURE,
    max_tokens: config.MAX_TOKENS,
    response_format: { type: 'json_object' }
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.API_KEY
    },
    payload: JSON.stringify(payload)
  };
  
  // 重試機制
  for (let attempt = 1; attempt <= config.RETRY_COUNT; attempt++) {
    try {
      console.log(`🚀 調用 OpenAI API (嘗試 ${attempt}/${config.RETRY_COUNT})`);
      
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      console.log('📨 OpenAI API 回應:', {
        code: responseCode,
        response: responseText.substring(0, 200) + '...'
      });
      
      if (responseCode === 200) {
        const result = JSON.parse(responseText);
        return result.choices[0].message.content;
      } else {
        console.error(`❌ OpenAI API 錯誤 (${responseCode}):`, responseText);
        if (attempt < config.RETRY_COUNT) {
          console.log('⏳ 等待重試...');
          Utilities.sleep(1000 * attempt); // 遞增延遲
        }
      }
    } catch (error) {
      console.error(`❌ OpenAI API 調用失敗 (嘗試 ${attempt}):`, error);
      if (attempt < config.RETRY_COUNT) {
        Utilities.sleep(1000 * attempt);
      }
    }
  }
  
  console.error('❌ OpenAI API 重試失敗，將使用降級機制');
  return null;
}

/**
 * 解析 OpenAI 的回應
 * @param {string} response - OpenAI 回應的 JSON 字串
 * @param {string} originalInput - 原始用戶輸入
 * @return {Object} 標準化的解析結果
 */
function parseOpenAIResponse(response, originalInput) {
  try {
    const parsed = JSON.parse(response);
    
    return {
      intent: parsed.intent || 'unclear',
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
      correctedText: parsed.correctedText || originalInput,
      explanation: parsed.explanation || '無解釋',
      source: 'openai'
    };
  } catch (error) {
    console.error('❌ 解析 OpenAI 回應失敗:', error);
    return {
      intent: 'unclear',
      confidence: 0,
      correctedText: originalInput,
      explanation: '解析失敗',
      source: 'error'
    };
  }
}

/**
 * 降級機制：關鍵字匹配
 * @param {string} userInput - 用戶輸入
 * @param {string} context - 上下文
 * @return {Object} 匹配結果
 */
function fallbackKeywordMatching(userInput, context) {
  console.log('🔄 使用關鍵字匹配降級機制');
  
  const keywords = CONFIG.FALLBACK_KEYWORDS;
  const input = userInput.toLowerCase().trim();
  
  // 根據上下文調整匹配邏輯
  switch (context) {
    case 'application':
      return matchApplicationKeywords(input, keywords);
    case 'date_selection':
      return matchDateSelectionKeywords(input, keywords);
    case 'video_choice':
      return matchVideoChoiceKeywords(input, keywords);
    default:
      return matchGeneralKeywords(input, keywords);
  }
}

/**
 * 申請相關關鍵字匹配
 */
function matchApplicationKeywords(input, keywords) {
  // 申請意圖匹配
  for (const keyword of keywords.apply) {
    if (input.includes(keyword)) {
      return {
        intent: 'apply',
        confidence: 0.8,
        correctedText: '申請',
        explanation: '關鍵字匹配：申請',
        source: 'fallback'
      };
    }
  }
  
  // 確認意圖匹配
  for (const keyword of keywords.confirm) {
    if (input.includes(keyword)) {
      return {
        intent: 'confirm',
        confidence: 0.7,
        correctedText: '確認',
        explanation: '關鍵字匹配：確認',
        source: 'fallback'
      };
    }
  }
  
  // 修改意圖匹配
  for (const keyword of keywords.modify) {
    if (input.includes(keyword)) {
      return {
        intent: 'modify',
        confidence: 0.7,
        correctedText: '修改',
        explanation: '關鍵字匹配：修改',
        source: 'fallback'
      };
    }
  }
  
  return {
    intent: 'unclear',
    confidence: 0.2,
    correctedText: input,
    explanation: '無匹配關鍵字',
    source: 'fallback'
  };
}

/**
 * 日期選擇關鍵字匹配
 */
function matchDateSelectionKeywords(input, keywords) {
  // 確認預設日期
  for (const keyword of keywords.confirm) {
    if (input.includes(keyword)) {
      return {
        intent: 'confirm',
        confidence: 0.8,
        correctedText: '確認',
        explanation: '確認預設日期',
        source: 'fallback'
      };
    }
  }
  
  // 修改日期
  for (const keyword of keywords.modify) {
    if (input.includes(keyword)) {
      return {
        intent: 'modify',
        confidence: 0.8,
        correctedText: '修改',
        explanation: '修改日期選擇',
        source: 'fallback'
      };
    }
  }
  
  return {
    intent: 'unclear',
    confidence: 0.3,
    correctedText: input,
    explanation: '日期選擇不明確',
    source: 'fallback'
  };
}

/**
 * 影片選擇關鍵字匹配
 */
function matchVideoChoiceKeywords(input, keywords) {
  // 常用影片
  if (input.includes('常用') || input.includes('預設') || input.includes('原本')) {
    return {
      intent: 'use_default',
      confidence: 0.8,
      correctedText: '常用影片',
      explanation: '選擇常用影片',
      source: 'fallback'
    };
  }
  
  // 新影片
  if (input.includes('新') || input.includes('上傳') || input.includes('換')) {
    return {
      intent: 'upload_new',
      confidence: 0.8,
      correctedText: '新影片',
      explanation: '上傳新影片',
      source: 'fallback'
    };
  }
  
  return {
    intent: 'unclear',
    confidence: 0.3,
    correctedText: input,
    explanation: '影片選擇不明確',
    source: 'fallback'
  };
}

/**
 * 一般關鍵字匹配
 */
function matchGeneralKeywords(input, keywords) {
  // 測試
  if (input.includes('測試') || input.includes('test')) {
    return {
      intent: 'test',
      confidence: 0.9,
      correctedText: '測試',
      explanation: '系統測試',
      source: 'fallback'
    };
  }
  
  // 幫助
  if (input.includes('幫助') || input.includes('說明') || input.includes('help')) {
    return {
      intent: 'help',
      confidence: 0.9,
      correctedText: '幫助',
      explanation: '尋求幫助',
      source: 'fallback'
    };
  }
  
  // 申請
  for (const keyword of keywords.apply) {
    if (input.includes(keyword)) {
      return {
        intent: 'apply',
        confidence: 0.7,
        correctedText: '申請',
        explanation: '關鍵字匹配：申請',
        source: 'fallback'
      };
    }
  }
  
  return {
    intent: 'unclear',
    confidence: 0.1,
    correctedText: input,
    explanation: '無法理解意圖',
    source: 'fallback'
  };
}

/**
 * 根據信心度決定是否需要確認
 * @param {Object} analysisResult - 分析結果
 * @return {boolean} 是否需要確認
 */
function shouldConfirm(analysisResult) {
  // Phase 2 簡化：不處理確認邏輯
  // Phase 3 將加入狀態管理後再實現確認機制
  return false;
}

/**
 * 生成確認訊息
 * @param {Object} analysisResult - 分析結果
 * @param {string} context - 上下文
 * @return {string} 確認訊息
 */
function generateConfirmationMessage(analysisResult, context) {
  // Phase 2 簡化：不生成確認訊息
  // 這個函數在 Phase 3 才會實現完整的確認邏輯
  return `Phase 2 專注語音修正，確認機制將在 Phase 3 實現`;
}

/**
 * 處理用戶的否定回應，避免確認循環
 * @param {string} userInput - 用戶輸入
 * @return {string} 適當的回應訊息
 */
function handleNegativeResponse(userInput) {
  // Phase 2 簡化：不處理否定回應
  // Phase 3 將根據狀態管理來正確處理
  return null;
}

/**
 * 測試 OpenAI 連線
 */
function testOpenAIConnection() {
  try {
    console.log('🧪 測試 OpenAI API 連線...');
    
    const testInput = '測試';
    const result = analyzeUserIntent(testInput, 'general');
    
    console.log('📊 測試結果:', result);
    
    if (result.source === 'openai') {
      console.log('✅ OpenAI API 連線成功');
      return true;
    } else if (result.source === 'fallback') {
      console.log('⚠️ OpenAI API 失敗，但降級機制正常');
      return false;
    } else {
      console.log('❌ 系統錯誤');
      return false;
    }
  } catch (error) {
    console.error('❌ OpenAI 連線測試失敗:', error);
    return false;
  }
}
