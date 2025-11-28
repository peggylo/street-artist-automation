/**
 * 街頭藝人申請系統 - LINE API 相關函數
 * Phase 1: 基礎LINE Bot架構
 */

/**
 * 發送回覆訊息給用戶
 * @param {string} replyToken - LINE 提供的回覆 token
 * @param {string} messageText - 要發送的訊息內容
 */
function replyMessage(replyToken, messageText) {
  try {
    console.log('📤 準備發送回覆訊息:', messageText);
    
    const lineConfig = getLineConfig();
    
    if (!replyToken) {
      console.warn('⚠️ 沒有 replyToken，無法發送回覆');
      return false;
    }
    
    const url = 'https://api.line.me/v2/bot/message/reply';
    
    const payload = {
      replyToken: replyToken,
      messages: [{
        type: 'text',
        text: messageText
      }]
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.ACCESS_TOKEN
      },
      payload: JSON.stringify(payload)
    };
    
    console.log('🚀 發送 LINE API 請求...');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('📨 LINE API 回應:', {
      code: responseCode,
      response: responseText
    });
    
    if (responseCode === 200) {
      console.log('✅ 訊息發送成功');
      return true;
    } else {
      console.error('❌ 訊息發送失敗:', responseCode, responseText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 發送回覆訊息錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}

/**
 * 發送推送訊息給指定用戶 (Phase 1 暫不使用，為未來功能預留)
 * @param {string} userId - 用戶 ID
 * @param {string} messageText - 要發送的訊息內容
 */
function pushMessage(userId, messageText) {
  try {
    console.log('📤 準備發送推送訊息給用戶:', userId);
    console.log('📝 訊息內容:', messageText);
    
    const lineConfig = getLineConfig();
    const url = 'https://api.line.me/v2/bot/message/push';
    
    const payload = {
      to: userId,
      messages: [{
        type: 'text',
        text: messageText
      }]
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.ACCESS_TOKEN
      },
      payload: JSON.stringify(payload)
    };
    
    console.log('🚀 發送 LINE Push API 請求...');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('📨 LINE Push API 回應:', {
      code: responseCode,
      response: responseText
    });
    
    if (responseCode === 200) {
      console.log('✅ 推送訊息發送成功');
      return true;
    } else {
      console.error('❌ 推送訊息發送失敗:', responseCode, responseText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 發送推送訊息錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}

/**
 * 取得用戶資料 (Phase 1 暫不使用，為未來功能預留)
 * @param {string} userId - 用戶 ID
 * @return {Object} 用戶資料
 */
function getUserProfile(userId) {
  try {
    console.log('👤 取得用戶資料:', userId);
    
    const lineConfig = getLineConfig();
    const url = `https://api.line.me/v2/bot/profile/${userId}`;
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + lineConfig.ACCESS_TOKEN
      }
    };
    
    console.log('🚀 發送 LINE Profile API 請求...');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('📨 LINE Profile API 回應:', {
      code: responseCode,
      response: responseText
    });
    
    if (responseCode === 200) {
      const userProfile = JSON.parse(responseText);
      console.log('✅ 用戶資料取得成功:', userProfile);
      return userProfile;
    } else {
      console.error('❌ 用戶資料取得失敗:', responseCode, responseText);
      return null;
    }
    
  } catch (error) {
    console.error('❌ 取得用戶資料錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return null;
  }
}

/**
 * 驗證 LINE Webhook 簽章 (Phase 1 暫不實作，為安全性預留)
 * @param {string} body - 請求內容
 * @param {string} signature - LINE 提供的簽章
 * @return {boolean} 簽章是否有效
 */
function validateSignature(body, signature) {
  try {
    console.log('🔒 驗證 LINE Webhook 簽章 (Phase 1 暫時跳過)');
    
    // Phase 1 暫時不實作簽章驗證，直接回傳 true
    // 在生產環境中應該實作完整的簽章驗證
    return true;
    
    // 未來實作參考：
    // const lineConfig = getLineConfig();
    // const channelSecret = lineConfig.CHANNEL_SECRET;
    // const hash = Utilities.computeHmacSha256Signature(body, channelSecret);
    // const computedSignature = Utilities.base64Encode(hash);
    // return signature === 'sha256=' + computedSignature;
    
  } catch (error) {
    console.error('❌ 簽章驗證錯誤:', error);
    return false;
  }
}

/**
 * 格式化訊息為 LINE 支援的格式
 * @param {string} text - 原始訊息文字
 * @return {string} 格式化後的訊息
 */
function formatMessage(text) {
  try {
    // Phase 1 簡單處理，確保訊息不超過 LINE 限制
    let formattedText = text.toString();
    
    // LINE 訊息長度限制為 5000 字元
    if (formattedText.length > 5000) {
      formattedText = formattedText.substring(0, 4950) + '...\n(訊息過長，已截斷)';
      console.log('⚠️ 訊息過長，已截斷');
    }
    
    return formattedText;
    
  } catch (error) {
    console.error('❌ 格式化訊息錯誤:', error);
    return '訊息格式化失敗';
  }
}

/**
 * 建立快速回覆按鈕 (Phase 1 暫不使用，為未來功能預留)
 * @param {Array} options - 選項陣列
 * @return {Object} LINE 快速回覆物件
 */
function createQuickReply(options) {
  try {
    console.log('🔘 建立快速回覆按鈕:', options);
    
    const quickReplyItems = options.map(option => ({
      type: 'action',
      action: {
        type: 'message',
        label: option.label,
        text: option.text || option.label
      }
    }));
    
    return {
      items: quickReplyItems
    };
    
  } catch (error) {
    console.error('❌ 建立快速回覆錯誤:', error);
    return null;
  }
}

/**
 * Phase 6: 發送圖片訊息給指定用戶或群組
 * @param {string} to - 用戶 ID 或群組 ID
 * @param {string} imageUrl - 圖片的公開 URL（或 Signed URL）
 * @param {string} previewImageUrl - 預覽圖片 URL（可選，預設與 imageUrl 相同）
 * @return {boolean} 是否發送成功
 */
function pushImageMessage(to, imageUrl, previewImageUrl = null) {
  try {
    console.log('📤 準備發送圖片訊息給:', to);
    console.log('🖼️ 圖片 URL:', imageUrl);
    
    const lineConfig = getLineConfig();
    const url = 'https://api.line.me/v2/bot/message/push';
    
    // 如果沒有提供預覽圖片，使用原始圖片
    const preview = previewImageUrl || imageUrl;
    
    const payload = {
      to: to,
      messages: [{
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: preview
      }]
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    console.log('🚀 發送 LINE Image Push API 請求...');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('📨 LINE Image Push API 回應:', {
      code: responseCode,
      response: responseText
    });
    
    if (responseCode === 200) {
      console.log('✅ 圖片訊息發送成功');
      return true;
    } else {
      console.error('❌ 圖片訊息發送失敗:', responseCode, responseText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 發送圖片訊息錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}

/**
 * Phase 6: 下載 Signed URL 的圖片並發送到 LINE
 * @param {string} to - 用戶 ID 或群組 ID
 * @param {string} signedUrl - GCS Signed URL
 * @return {boolean} 是否發送成功
 */
function downloadAndPushImage(to, signedUrl) {
  try {
    console.log('📥 從 Signed URL 下載圖片:', signedUrl);
    
    // 從 Signed URL 下載圖片
    const imageResponse = UrlFetchApp.fetch(signedUrl, {
      muteHttpExceptions: true
    });
    
    const responseCode = imageResponse.getResponseCode();
    if (responseCode !== 200) {
      console.error('❌ 下載圖片失敗:', responseCode);
      return false;
    }
    
    const imageBlob = imageResponse.getBlob();
    console.log('✅ 圖片下載成功，大小:', imageBlob.getBytes().length, 'bytes');
    
    // 解碼檔名（處理 URL 編碼）
    let fileName = imageBlob.getName();
    console.log('📝 原始檔名:', fileName);
    
    if (fileName.includes('%')) {
      try {
        fileName = decodeURIComponent(fileName);
        console.log('✅ 檔名解碼成功:', fileName);
      } catch (decodeError) {
        console.warn('⚠️ 檔名解碼失敗，使用原始檔名:', decodeError);
      }
    }
    
    // 設定解碼後的檔名
    imageBlob.setName(fileName);
    
    // 取得截圖資料夾並上傳
    const screenshotFolderId = CONFIG.PHASE3.GOOGLE_DRIVE.SCREENSHOT_FOLDER_ID;
    const screenshotFolder = DriveApp.getFolderById(screenshotFolderId);
    const driveFile = screenshotFolder.createFile(imageBlob);
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const driveUrl = 'https://drive.google.com/uc?export=view&id=' + driveFile.getId();
    console.log('📤 圖片已上傳到 Google Drive 截圖資料夾:', driveUrl);
    console.log('📁 最終檔名:', fileName);
    
    // 發送圖片訊息到 LINE
    const success = pushImageMessage(to, driveUrl);
    
    // 清理：發送成功後可選擇刪除臨時檔案（或保留供日後查看）
    // driveFile.setTrashed(true);
    
    return success;
    
  } catch (error) {
    console.error('❌ 下載並發送圖片錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}

/**
 * 階段 5: 發送 Shortcut 連結訊息（iOS Shortcut 半自動化方案）
 * 使用純文字訊息，LINE 會自動識別 shortcuts:// 為可點擊連結
 * 發送兩個獨立訊息：說明文字 + 連結網址
 * @param {string} to - 用戶 ID 或群組 ID
 * @param {string} shortcutUrl - Shortcut URL
 * @return {boolean} 是否發送成功
 */
function sendShortcutMessage(to, shortcutUrl) {
  try {
    console.log('📤 準備發送 Shortcut 連結訊息給:', to);
    console.log('📱 Shortcut URL:', shortcutUrl);
    
    const lineConfig = getLineConfig();
    const url = 'https://api.line.me/v2/bot/message/push';
    
    // 發送兩個獨立訊息（VoiceOver 友善格式）
    const payload = {
      to: to,
      messages: [
        {
          type: 'text',
          text: '申請表已準備好，請點擊下方連結取得申請書：'
        },
        {
          type: 'text',
          text: shortcutUrl
        }
      ]
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + lineConfig.ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    console.log('🚀 發送 LINE 文字訊息（2 則）...');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('📨 LINE API 回應:', {
      code: responseCode,
      response: responseText
    });
    
    if (responseCode === 200) {
      console.log('✅ Shortcut 連結訊息發送成功（2 則）');
      return true;
    } else {
      console.error('❌ 發送失敗:', responseCode, responseText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 發送 Shortcut 訊息錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}

/**
 * 測試 LINE API 連線
 */
function testLineAPI() {
  try {
    console.log('🧪 測試 LINE API 連線...');
    
    // 測試配置
    const lineConfig = getLineConfig();
    console.log('📋 LINE 配置檢查:', {
      hasChannelId: !!lineConfig.CHANNEL_ID,
      hasChannelSecret: !!lineConfig.CHANNEL_SECRET,
      hasAccessToken: !!lineConfig.ACCESS_TOKEN
    });
    
    // 測試 API 端點 (不實際發送訊息)
    const url = 'https://api.line.me/v2/bot/info';
    const options = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + lineConfig.ACCESS_TOKEN
      }
    };
    
    console.log('🚀 測試 LINE API 連線...');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('📨 LINE API 測試回應:', {
      code: responseCode,
      response: responseText
    });
    
    if (responseCode === 200) {
      console.log('✅ LINE API 連線測試成功');
      return true;
    } else {
      console.error('❌ LINE API 連線測試失敗');
      return false;
    }
    
  } catch (error) {
    console.error('❌ LINE API 測試錯誤:', error);
    console.error('📋 錯誤詳情:', error.stack);
    return false;
  }
}
