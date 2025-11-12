# iOS Shortcut 半自動化方案

## 📋 背景

**問題**：Cloud Run 無頭模式在松菸網站 100% 觸發 reCAPTCHA 圖片驗證，Vision API 方案複雜且不穩定。

**新方案**：改用 iOS Shortcut + 人工輔助，善用媽媽的 VoiceOver 操作能力。

---

## 🎯 方案概述

### 自動化部分（Shortcut）
1. 從 Google Drive 下載申請 PDF 和街頭藝人證到 iCloud「下載項目」
2. 自動開啟松菸網站第一頁
3. 自動點擊「我要申請」進入第二頁
4. 自動預填個人資料（姓名、電話、信箱）

### 人工操作部分（媽媽用 VoiceOver）
1. 上傳申請 PDF（下載項目第一個檔案）
2. 上傳街頭藝人證（下載項目第二個檔案）
3. 勾選「我不是機器人」
4. 點擊「確認送出」

**預估操作時間**：2-3 分鐘

---

## 🏗️ 技術架構

```
LINE 申請 
  ↓
GAS 處理 + Cloud Run 生成 PDF
  ↓
LINE 發送 Shortcut 啟動連結
  ↓
媽媽點擊按鈕 → iOS Shortcut 執行
  ↓
自動下載檔案 + 開啟網站 + 預填表單
  ↓
媽媽接手完成上傳和提交
```

---

## 📱 iOS Shortcut 流程

### Shortcut 名稱
`街頭藝人申請`

### 輸入資料（從 LINE 傳入）
```json
{
  "pdf_url": "https://drive.google.com/uc?export=download&id=XXX",
  "cert_url": "https://drive.google.com/uc?export=download&id=YYY",
  "name": "羅佩琪",
  "phone": "0912345678",
  "email": "example@gmail.com"
}
```

### 執行步驟

**步驟 1-7：下載檔案**
1. 取得捷徑輸入
2. 從字典取 `pdf_url`
3. 朗讀：「開始下載申請 PDF」
4. 取得 URL 內容（下載 PDF）
5. 設定名稱：`申請表_2025年11月.pdf`
6. 儲存到 iCloud Drive/Downloads
7. 朗讀：「PDF 下載完成」

**步驟 8-13：複製街頭藝人證**
8. 取得捷徑輸入
9. 從字典取 `cert_url`
10. 取得 URL 內容（下載證照）
11. 設定名稱：`街頭藝人證.jpg`
12. 儲存到 iCloud Drive/Downloads
13. 朗讀：「街頭藝人證已準備完成」

**步驟 14-16：開啟網站**
14. 朗讀：「即將開啟申請網站」
15. 等待 2 秒
16. 開啟 URL：`https://www.songshanculturalpark.org/solicitation`

**步驟 17-18：點擊申請按鈕**
17. 等待 2 秒（第一頁載入）
18. 在網頁上執行 JavaScript（點擊「我要申請」）

**步驟 19-23：預填表單並勾選同意**
19. 等待 4 秒（第二頁載入）
20. 取得捷徑輸入
21. 從字典取 `name`, `phone`, `email`
22. 在網頁上執行 JavaScript（填寫表單 + 勾選同意條款）
23. 朗讀：「個人資料已填寫完成，同意條款已勾選」

**步驟 24：語音指引**
24. 朗讀：「接下來請你完成以下步驟。第一，上傳申請 PDF，檔案在下載項目的第一個。第二，上傳街頭藝人證，檔案在下載項目的第二個。第三，勾選我不是機器人。第四，點擊確認送出。祝你順利完成申請！」

---

## 🔧 JavaScript 腳本

### 腳本 1：點擊「我要申請」

```javascript
(function() {
  try {
    const links = Array.from(document.querySelectorAll('a'));
    const applyBtn = links.find(btn => {
      const container = btn.closest('div');
      if (!container) return false;
      const btnText = btn.textContent || '';
      const containerText = container.textContent || '';
      return btnText.includes('我要申請') && 
             containerText.includes('街頭藝人') &&
             (containerText.includes('展演申請') || containerText.includes('申請'));
    });
    if (applyBtn) {
      applyBtn.click();
      return 'success';
    } else {
      return 'error: 找不到申請按鈕';
    }
  } catch (e) {
    return 'error: ' + e.message;
  }
})();
```

### 腳本 2：預填表單並勾選同意條款

```javascript
(function() {
  try {
    const nameInput = document.querySelector('input[placeholder*="姓名"]');
    if (!nameInput) return 'error: 表單尚未載入';
    
    const phoneInput = document.querySelector('input[placeholder*="手機"]');
    const emailInput = document.querySelector('input[type="email"]');
    
    // 填寫個人資料（從 Shortcut 傳入的值）
    if (nameInput) nameInput.value = "羅佩琪";
    if (phoneInput) phoneInput.value = "0912345678";
    if (emailInput) emailInput.value = "example@gmail.com";
    
    // 勾選同意條款 checkbox
    const agreementCheckbox = document.querySelector('input#signup');
    if (agreementCheckbox && !agreementCheckbox.checked) {
      agreementCheckbox.click();
    }
    
    return 'success: 已填寫完成並勾選同意條款';
  } catch (e) {
    return 'error: ' + e.message;
  }
})();
```

---

## 💻 GAS 程式碼修改

### 新增函數：發送 Shortcut 連結

```javascript
function sendShortcutLinkToLine(applicationData, pdfFileId, certFileId) {
  // 1. 設定檔案權限為公開
  setFilePublicPermission(pdfFileId);
  setFilePublicPermission(certFileId);
  
  // 2. 產生直接下載連結
  const pdfUrl = `https://drive.google.com/uc?export=download&id=${pdfFileId}`;
  const certUrl = `https://drive.google.com/uc?export=download&id=${certFileId}`;
  
  // 3. 組合 Shortcut 資料
  const shortcutInput = {
    pdf_url: pdfUrl,
    cert_url: certUrl,
    name: "羅佩琪",
    phone: "0912345678",
    email: "example@gmail.com"
  };
  
  // 4. 產生 Shortcut URL
  const shortcutUrl = 'shortcuts://run-shortcut?name=' + 
                      encodeURIComponent('街頭藝人申請') + 
                      '&input=' + 
                      encodeURIComponent(JSON.stringify(shortcutInput));
  
  // 5. 發送 LINE 訊息
  const message = {
    type: 'text',
    text: `✅ ${applicationData.month}申請檔案已準備完成\n\n` +
          `📅 日期：${applicationData.selected_dates.join(', ')}\n` +
          `📄 PDF 已生成\n` +
          `🏆 街頭藝人證已備妥\n\n` +
          `👇 點擊下方按鈕開始申請`,
    quickReply: {
      items: [{
        type: 'action',
        action: {
          type: 'uri',
          label: '🚀 開始申請',
          uri: shortcutUrl
        }
      }]
    }
  };
  
  LineHandler.pushMessage(Config.LINE_GROUP_ID, message);
}

function setFilePublicPermission(fileId) {
  /**
   * 設定 Google Drive 檔案權限：知道連結的任何人可檢視
   */
  try {
    Drive.Permissions.insert({
      role: 'reader',
      type: 'anyone'
    }, fileId);
    console.log(`✅ 檔案 ${fileId} 權限已設為公開`);
  } catch (e) {
    console.error(`❌ 設定檔案權限失敗: ${e.message}`);
  }
}
```

### 呼叫時機

在 Cloud Run 處理完成、PDF 生成後呼叫：

```javascript
// 在 main.py 回傳成功後
const cloudRunResponse = callCloudRunForDocumentProcessing(...);

if (cloudRunResponse.status === 'success') {
  sendShortcutLinkToLine(
    applicationData, 
    cloudRunResponse.pdf_file_id,
    Config.CERTIFICATE.FILE_ID
  );
}
```

---

## 🔑 關鍵技術細節

### Google Drive 下載

**不需要 Google Drive App**
- 使用直接下載連結：`https://drive.google.com/uc?export=download&id=FILE_ID`
- Shortcut 的「取得 URL 內容」動作直接下載
- 背景執行，不開啟瀏覽器

**檔案權限設定**
- 類型：`anyone`（任何人）
- 角色：`reader`（唯讀）
- 結果：知道連結的任何人可檢視

### Shortcut 等待時間

- 第一頁載入：2 秒
- 第二頁載入：4 秒
- 總等待：6 秒（足夠 99% 情況）

### VoiceOver 相容性

- ✅ LINE 訊息和按鈕：完全支援
- ✅ Shortcut 語音提示：與 VoiceOver 相容
- ✅ Safari 表單操作：完全支援

---

## 📝 實作步驟

### 階段 1：建立 Shortcut（人工）

1. 在 iPhone「捷徑」App 中建立新捷徑
2. 依照上述 24 個步驟加入動作
3. 複製貼上 JavaScript 腳本
4. 測試運作

### 階段 2：修改 GAS 程式碼

1. 在 `Code.js` 加入 `sendShortcutLinkToLine()` 和 `setFilePublicPermission()`
2. 在適當位置呼叫（Cloud Run 成功後）
3. 測試 LINE 訊息發送

### 階段 3：端到端測試

1. LINE 發起申請
2. 收到 Shortcut 按鈕
3. 點擊執行 Shortcut
4. 確認檔案下載成功
5. 確認網站開啟和預填正常
6. 手動完成上傳和提交

### 階段 4：給媽媽使用

1. 分享 Shortcut 給媽媽（iCloud 連結或 .shortcut 檔案）
2. 教導操作流程
3. 陪同完成第一次申請
4. 收集反饋並優化

---

## ⚠️ 注意事項

### 檔案順序

媽媽上傳檔案時，確保檔案順序：
1. 第一個：申請表 PDF（最新下載）
2. 第二個：街頭藝人證（次新）

### JavaScript 失敗處理

如果等待時間不夠，JavaScript 可能失敗：
- Shortcut 會朗讀錯誤訊息
- 媽媽可以手動操作（表單欄位、點擊申請按鈕）

### 網站改版

如果松菸網站改版，選擇器可能失效：
- 需要更新 JavaScript 腳本
- 短期內可以完全人工操作

---

## 📊 優缺點評估

### 優點
- ✅ 繞過 reCAPTCHA 圖片驗證問題
- ✅ 善用媽媽的 VoiceOver 能力
- ✅ 大部分流程自動化（個人資料 + 同意條款）
- ✅ 媽媽只需操作 2-3 分鐘（只需上傳檔案 + 勾 reCAPTCHA）
- ✅ 不需要複雜的 Vision API

### 缺點
- ⚠️ 需要媽媽手動操作（但可接受）
- ⚠️ 需要建立和維護 Shortcut
- ⚠️ 網站改版需要更新腳本

---

## 🎯 成功標準

1. 媽媽能獨立完成申請（成功率 > 90%）
2. 操作時間 < 5 分鐘
3. VoiceOver 體驗流暢
4. 語音提示清楚明確

---

**建立日期**：2025年11月12日  
**當前狀態**：規劃階段，待實作

