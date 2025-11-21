# iOS Shortcut + Bookmarklet 半自動化方案

## 📋 背景

**問題**：Cloud Run 無頭模式在松菸網站 100% 觸發 reCAPTCHA 圖片驗證，Vision API 方案複雜且不穩定。

**解決方案**：iOS Shortcut + Safari Bookmarklet + 人工輔助

---

## 🎯 方案概述

### Shortcut 負責（自動）
1. 從 Google Drive 下載申請 PDF 到 iCloud Drive
2. 從 Google Drive 下載街頭藝人證到 iCloud Drive（證照 URL 固定在 Shortcut 中）
3. 開啟松菸網站首頁
4. 語音提示媽媽點擊書籤

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

### 核心動作（約 10-12 個）
1. **取得捷徑輸入**：從 LINE 接收 PDF URL
2-5. 下載 PDF 到 iCloud Drive（URL 動態，手動設定檔名避免中文亂碼）
6-9. 下載證照到 iCloud Drive（URL 固定，已寫入 Shortcut）
10. 開啟松菸網站首頁
11-12. 語音提示「請點擊松菸申請書籤」

**重點**：
- 證照 URL **不由 LINE 傳入**，直接寫死在 Shortcut 中
- 證照和 PDF 都從 **Google Drive** 下載
- 只有 PDF URL 是動態的，從 LINE 傳入
- **檔名處理**：因 Google Drive 中文檔名會亂碼，需在 Shortcut 手動設定檔名（格式：`申請表_yyyy年MM月_MMdd_HHmm.pdf`）

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
- GAS 設定 PDF 檔案為公開（`anyone with link` = `reader`）
- **證照檔案也需設為公開**（一次設定，永久有效）
- 使用直接下載 URL：`https://drive.google.com/uc?export=download&id=FILE_ID`
- Shortcut 背景下載 PDF 和證照到 iCloud Drive

### 2. Bookmarklet 關鍵技術
- 使用 `.row_rt` 選擇器找計畫區塊
- 先找「街頭藝人」標題，再找該區塊內的按鈕
- 避免點錯其他計畫的按鈕

### 3. GAS 整合
- 函數：`sendShortcutLinkToLine()`
- 只傳送 PDF URL 給 Shortcut（證照 Google Drive URL 已固定在 Shortcut 中）
- LINE Quick Reply 按鈕：「🚀 上網填表」
- URI：`shortcuts://run-shortcut?name=松菸申請&input=text&text={pdf_url}`
- **證照設定**：需一次性將證照檔案設為公開，URL 固定後寫入 Shortcut

---

## 🔑 關鍵設計決策

### 決策 1：Bookmarklet 取代 Shortcut JavaScript
- iOS Shortcut 的「在網頁上執行 JavaScript」動作不穩定
- 改用 Safari Bookmarklet（點兩次）
- 好處：可靠性高、容易除錯、可獨立測試

### 決策 2：個資與證照固定化
- **個資硬編碼在 Bookmarklet**：使用者永遠是同一人
- **證照 URL 固定在 Shortcut**：街頭藝人證不會變更，Google Drive URL 寫死在 Shortcut
- **只傳遞 PDF URL**：LINE 訊息只含當次申請的 PDF 連結
- 簡化流程，減少傳輸資料

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
- 擴充至約 10 個動作
- 下載 PDF（動態）+ 下載證照（固定 URL）
- 兩個檔案都從 Google Drive 下載到 iCloud Drive
- 確認檔案順序正確
- 教學文件：`shortcut-stage1-tutorial.md`
- **Note**：此階段兩個 URL 都是硬編碼測試

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

### 階段 4：參數化改造 ✅
- Shortcut 改用「取得捷徑輸入」接收動態 PDF URL
- 從 LINE 動態傳入 `pdf_url`
- **證照 URL 保持固定**：Google Drive URL 不由 LINE 傳入，直接寫在 Shortcut 中
- **驗收方式**：
  - 方法1：手動構造 Shortcut URL 測試
  - 方法2：用 LINE 傳送測試 URL 給自己
- **重要發現**：Google Drive 中文檔名會產生 UTF-8 亂碼，需在 Shortcut 中手動設定檔名（使用當前日期時間）

### 階段 5：GAS 整合（待實作）
- 新增 GAS 函數：`sendShortcutLinkToLine(userId, pdfFileId)`
- 設定 PDF 檔案公開權限（`anyone with link` = `reader`）
- **一次性設定**：將證照檔案也設為公開，取得固定 URL
- 透過 LINE 發送 Shortcut 按鈕（Quick Reply + URI Action）
- **Note**：階段4完成後即可進行，不需要等其他階段

### 階段 6：端到端測試（待實作）
- LINE 申請 → Shortcut → Bookmarklet → 送出
- 完整流程驗證

### 階段 7：交付使用（待實作）
- 教導媽媽使用
- 優化流程和語音提示

---

## ⚠️ 注意事項

### 檔案順序與命名
- PDF 先準備、證照後準備
- 上傳時順序一致：先 PDF、後證照
- **檔名問題**：Google Drive 中文檔名會產生 UTF-8 編碼亂碼，Shortcut 需手動重建檔名（使用當前日期時間）

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
**最後更新**：2025-11-21  
**當前狀態**：階段 4 完成 ✅，準備進入階段 5

**重要變更 (2025-11-21)**：
- 階段 4 完成：Shortcut 參數化改造成功
- 發現 Google Drive 中文檔名 UTF-8 亂碼問題，已在 Shortcut 中手動設定檔名解決

**重要變更 (2025-11-15)**：
- LINE 只傳遞 PDF URL（Google Drive）
- 證照 URL 固定在 Shortcut 中（Google Drive），不由 LINE 傳入
- 證照和 PDF 都需設為公開，都從 Google Drive 下載

**相關檔案**：
- 階段教學：`shortcut-stage0-tutorial.md` ~ `shortcut-stage2-tutorial.md`
- Bookmarklet：`songshan-bookmarklet.js`, `songshan-bookmarklet-minified.txt`
- 使用說明：`bookmarklet-使用說明.md`

---
