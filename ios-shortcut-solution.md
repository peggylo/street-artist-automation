# iOS Shortcut + Bookmarklet 半自動化方案

## 📋 背景

**問題**：Cloud Run 無頭模式在松菸網站 100% 觸發 reCAPTCHA 圖片驗證，Vision API 方案複雜且不穩定。

**解決方案**：iOS Shortcut + Safari Bookmarklet + 人工輔助

---

## 🎯 方案概述

### Shortcut 負責（自動）
1. 從 Google Drive 下載申請 PDF 和街頭藝人證到 iCloud Drive
2. 開啟松菸網站首頁
3. 語音提示媽媽點擊書籤

### Bookmarklet 負責（點兩次）
1. **第一次點擊**：自動導航到街頭藝人申請表單頁
2. **第二次點擊**：自動填寫姓名、手機、信箱、勾選同意條款

### 媽媽負責（VoiceOver 操作）
1. 點擊「松菸申請」書籤兩次
2. 上傳 PDF 和證照
3. 勾選 reCAPTCHA
4. 送出

**總操作時間**：約 3 分鐘

---

## 🏗️ 技術架構

```
LINE 申請 
  ↓
GAS + Cloud Run 生成 PDF
  ↓
LINE 發送 Shortcut 按鈕
  ↓
媽媽點擊 → Shortcut 下載檔案 + 開啟網站
  ↓
媽媽點擊書籤 (1) → 進入表單頁
  ↓
媽媽點擊書籤 (2) → 自動填表
  ↓
媽媽上傳檔案 + reCAPTCHA + 送出
```

---

## 📱 Shortcut 實作（簡化版）

### Shortcut 名稱
`松菸申請`

### 核心動作（13 個）
1-5. 下載 PDF 到 iCloud Drive
6-10. 下載證照到 iCloud Drive  
11. 開啟松菸網站首頁
12-13. 語音提示「請點擊松菸申請書籤」

**重點**：不使用「在網頁上執行 JavaScript」動作（iOS 限制）

---

## 🔖 Bookmarklet 實作

### 檔案位置
- 原始碼：`songshan-bookmarklet.js`
- 壓縮版：`songshan-bookmarklet-minified.txt`
- 使用說明：`bookmarklet-使用說明.md`

### 核心功能
```javascript
// 智能判斷當前頁面
if (在首頁) {
  找到街頭藝人按鈕 → 導航到表單頁
}
if (在表單頁) {
  填寫姓名、手機、信箱 → 勾選同意
}
```

---

## 🔧 技術實作要點

### 1. Google Drive 下載
- GAS 設定檔案為公開（`anyone`, `reader`）
- 使用直接下載 URL：`https://drive.google.com/uc?export=download&id=FILE_ID`
- Shortcut 背景下載到 iCloud Drive

### 2. Bookmarklet 關鍵技術
- 使用 `.row_rt` 選擇器找計畫區塊
- 先找「街頭藝人」標題，再找該區塊內的按鈕
- 避免點錯其他計畫的按鈕

### 3. GAS 整合
- 函數：`sendShortcutLinkToLine()`
- 傳送兩個檔案 URL 給 Shortcut
- LINE Quick Reply 按鈕：「🚀 上網填表」
- URI：`shortcuts://run-shortcut?name=松菸申請&input={pdf_url, cert_url}`

---

## 🔑 關鍵設計決策

### 決策 1：Bookmarklet 取代 Shortcut JavaScript
- iOS Shortcut 的「在網頁上執行 JavaScript」動作不穩定
- 改用 Safari Bookmarklet（點兩次）
- 好處：可靠性高、容易除錯、可獨立測試

### 決策 2：個資硬編碼在 Bookmarklet
- 使用者永遠是同一人
- LINE 訊息不含個資
- 簡化流程

### 決策 3：智能書籤（單一書籤兩個功能）
- 自動判斷當前頁面（首頁 vs 表單頁）
- 執行對應操作（導航 vs 填表）
- 媽媽只需記住一個書籤

---

## 📝 實作步驟

### 階段 0：單檔下載測試 ✅
- 建立測試 Shortcut（5 個動作）
- 驗證從 Google Drive 下載 PDF 到 iCloud Drive
- 教學文件：`shortcut-stage0-tutorial.md`

### 階段 1：雙檔下載測試 ✅
- 擴充至 10 個動作
- 下載 PDF + 證照圖片
- 確認檔案順序正確
- 教學文件：`shortcut-stage1-tutorial.md`

### 階段 2：網站開啟測試 ✅
- 新增「開啟 URL」動作
- Safari 自動開啟松菸網站首頁
- 語音提示已開啟網站
- 教學文件：`shortcut-stage2-tutorial.md`
- **重要發現**：iOS Shortcut 的 JavaScript 動作不穩定 → 改用 Bookmarklet

### 階段 3：Bookmarklet 開發 ✅
- 建立智能書籤 JavaScript（`songshan-bookmarklet.js`）
- 壓縮版本（`songshan-bookmarklet-minified.txt`）
- 使用說明（`bookmarklet-使用說明.md`）
- 功能：自動判斷頁面 + 導航/填表

### 階段 4：參數化改造（待實作）
- Shortcut 改用「取得捷徑輸入」
- 從 LINE 動態傳入 `pdf_url` 和 `cert_url`

### 階段 5：GAS 整合（待實作）
- 實作 `sendShortcutLinkToLine()`
- 設定檔案公開權限
- 透過 LINE 發送 Shortcut 按鈕

### 階段 6：端到端測試（待實作）
- LINE 申請 → Shortcut → Bookmarklet → 送出
- 完整流程驗證

### 階段 7：交付使用（待實作）
- 教導媽媽使用
- 優化流程和語音提示

---

## ⚠️ 注意事項

### 檔案順序
- PDF 先下載、證照後下載
- 上傳時順序一致

### 網站改版
- 松菸網站改版時需更新 Bookmarklet 選擇器
- Bookmarklet 可獨立測試和更新（不需改 Shortcut）

### Bookmarklet 維護
- 修改 `songshan-bookmarklet.js`
- 重新壓縮產生新的 minified 版本
- 更新 Safari 書籤內容

---

## 📊 優缺點

### 優點
- ✅ 繞過 reCAPTCHA 自動化問題
- ✅ 流程簡化：下載 → 書籤 × 2 → 上傳
- ✅ Bookmarklet 可獨立測試維護
- ✅ VoiceOver 友善

### 缺點
- ⚠️ 需點擊書籤兩次（可接受）
- ⚠️ 網站改版需更新選擇器
- ⚠️ 僅支援 iOS Safari

---

## 🎯 成功標準

1. **操作時間** < 5 分鐘
2. **成功率** > 90%
3. **VoiceOver 友善**

---

## 📝 文件資訊

**建立日期**：2025-11-12  
**最後更新**：2025-11-15  
**當前狀態**：階段 3 完成（Bookmarklet 開發完成）

**相關檔案**：
- 階段教學：`shortcut-stage0-tutorial.md` ~ `shortcut-stage2-tutorial.md`
- Bookmarklet：`songshan-bookmarklet.js`, `songshan-bookmarklet-minified.txt`
- 使用說明：`bookmarklet-使用說明.md`

---
