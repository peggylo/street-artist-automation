# GAS Web App 授權過期問題

## 問題現象

- **時間線**：上次成功 2026/1/14，今天 2026/1/31（間隔 17 天）
- **錯誤訊息**：`Authorization is required to perform that action`
- **失敗函數**：`dailyKeepAlive` (time-based trigger)
- **影響**：LINE Webhook 無法執行，需手動重新授權

## 目前的處理方式

### dailyKeepAlive 函數（已實作）
- **位置**：`code/gas/Code.js` 第 1891-1949 行
- **觸發**：每天上午 8-9 點（time-based trigger）
- **邏輯**：實際呼叫需授權的 API
  ```javascript
  DriveApp.getFileById(videoFileId)     // Drive API
  SpreadsheetApp.openById(sheetsId)     // Sheets API
  PropertiesService.getScriptProperties() // Properties API
  ```
- **版本**：v1.1 - 修復授權喚醒

### 已知問題
- 2025/11/29 發現：`dailyKeepAlive` 每天執行，但授權仍然過期
- 2026/1/31 再次發生：17 天無真實用戶使用後失效

## Google Apps Script 的兩種授權機制

### 1. Script 授權（API 呼叫權限）
- **控制範圍**：Script 能否呼叫 Drive/Sheets API
- **維持方式**：定時觸發器執行 API 呼叫
- **dailyKeepAlive 是否有效**：✅ 有效

### 2. Web App 部署授權（Webhook 接收權限）
- **控制範圍**：外部服務（LINE）能否呼叫 Web App
- **維持方式**：需要真實用戶互動（點擊部署 URL 或使用 Bot）
- **dailyKeepAlive 是否有效**：❌ 無效
- **Google 政策**：長時間無真實用戶使用（約 2-3 週），自動撤銷授權

## 核心問題

**`dailyKeepAlive` 只能維持「Script 授權」，無法維持「Web App 部署授權」**

即使每天執行 API 呼叫，Google 仍會在無真實用戶互動（LINE 訊息）時撤銷 Web App 授權。

## 使用情境限制

- **實際使用頻率**：一個月申請一次
- **問題**：超過 2-3 週無使用 → 授權自動過期
- **無法改變**：無法要求用戶「每週至少使用一次」

## 待討論問題

1. **是否有方法讓 time-based trigger 維持 Web App 部署授權？**
   - 目前嘗試：實際呼叫 Drive/Sheets API（無效）
   
2. **是否有其他 GAS 授權機制可以繞過此限制？**
   - Service Account？
   - 其他部署方式？

3. **是否能透過程式自動檢測授權狀態？**
   - 提前通知用戶需要重新授權
   - 而非等到失敗才發現

4. **是否有替代架構？**
   - 改用 Cloud Functions + Service Account
   - 但可能失去對個人 Drive/Sheets 的存取權限

## 目前暫時解法

手動重新授權：
1. 前往 https://script.google.com
2. 開啟「松菸申請助手」專案
3. 執行任意函數（觸發授權流程）
4. 點擊「審查權限」→「允許」
5. 確認觸發器狀態正常

## 參考資料

- Gmail 錯誤通知：2026/1/30 下午 8:29
- 相關 Commit：`044aa69` (Chore: 診斷間歇性 SSL 連線失敗問題)
- Code 註解：`code/gas/Code.js` 第 1882-1889 行
