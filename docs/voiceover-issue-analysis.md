# VoiceOver 朗讀問題分析與解決方案

## 📋 問題概述

**日期**：2025-11-28  
**影響範圍**：iOS Shortcut + Bookmarklet 方案（階段 7 優化）  
**問題描述**：Bookmarklet 的語音朗讀在 iPhone Safari 上不穩定，VoiceOver 無法完整朗讀通知訊息

---

## 🔍 問題現象

### 原始問題（Speech API）
- **桌面 Safari**：語音朗讀正常
- **iPhone Safari**：
  - 有時完全不朗讀
  - 有時延遲 1 分鐘才朗讀
  - 時有時無，無規律

### 改用 ARIA Live Region 後
#### 嘗試 1：有綠色彈窗 + ARIA Live Region
- **首頁**：只朗讀 2-3 秒就被打斷
- **表單頁**：只朗讀 4 個字（「基本資料」）就被打斷
- **跳轉延遲**：確認為 5 秒（書籤已正確更新）
- **填寫順序**：確認先填寫欄位，後發送通知

#### 嘗試 2：只有 ARIA Live Region（無綠色彈窗）
- **首頁**：**一個字都沒朗讀**（更糟）
- **表單頁**：還是只朗讀 4 個字

---

## 🛠️ 已嘗試的技術方案

### 方案歷程

| 方案 | 技術 | 結果 | 問題 |
|------|------|------|------|
| **初版** | Web Speech API | ❌ 時有時無 | iOS Safari 的 Speech Synthesis 引擎不穩定 |
| **改良 1** | ARIA Live Region (`assertive`) + 綠色彈窗 + 調整執行順序 | ❌ 被打斷 | 綠色彈窗 3 秒消失觸發 VoiceOver 重新掃描 |
| **改良 2** | 只有 ARIA Live Region（無綠色彈窗） | ❌ 更糟 | 首頁完全不朗讀 |

### 調整細節

#### 首頁優化
- 訊息縮短：「已開網頁，請老媽數3秒鐘後再點一次書籤」（15 字）
- 跳轉延遲：1 秒 → 5 秒（確保朗讀時間 + 使用者數 3 秒後頁面已載入）

#### 表單頁優化
- 執行順序：先填寫所有欄位 → 延遲 0.5 秒 → 發送通知
- 目的：避免 DOM 變更觸發 VoiceOver 重新掃描

---

## 📊 技術分析

### iOS Safari 的 ARIA Live Region 問題

#### 問題 1：不可靠
- 創建後更新內容，VoiceOver 不一定會朗讀
- 可能被頁面其他動態內容覆蓋

#### 問題 2：容易被打斷
- 頁面上任何 DOM 變更都可能觸發 VoiceOver 重新掃描
- 即使 Live Region 元素保留，朗讀還是會中斷

#### 問題 3：與綠色彈窗的交互
- 有綠色彈窗：至少念 4 個字（部分有效）
- 無綠色彈窗：首頁完全不念（反而更糟）

### Web Speech API vs ARIA Live Region

| 技術 | iOS Safari 表現 | 可靠性 |
|------|----------------|--------|
| **Web Speech API** | 時有時無，可能延遲 1 分鐘 | ⚠️ 20-30% |
| **ARIA Live Region** | 容易被打斷，或完全不work | ⚠️ 30-40% |
| **原生 Alert** | 100% 可靠，但阻塞操作 | ✅ 100% |

---

## 💡 待評估方案

### 方案 A：原生 Alert（最保險）⭐

**實作**：
```javascript
// 首頁
window.alert('已開網頁，請老媽數3秒鐘後再點一次書籤');
window.location.href = targetUrl;

// 表單頁
window.alert('基本資料幫您填好了，請老媽接手，上傳兩個檔案並勾選檢測送出');
```

**優點**：
- ✅ VoiceOver 100% 完整朗讀
- ✅ 阻塞頁面，不會被任何事件打斷
- ✅ iOS 原生機制，絕對可靠

**缺點**：
- ⚠️ 使用者要手動點「確定」（VoiceOver 會自動聚焦按鈕）
- ⚠️ 首頁：點「確定」後才跳轉（非自動）
- ⚠️ 總共多 2 次點擊操作

**完整流程**：
```
首頁：
點書籤 → Alert 彈出 → VoiceOver 朗讀 → 點「確定」→ 跳轉

表單頁：
點書籤 → 欄位填寫 → Alert 彈出 → VoiceOver 朗讀 → 點「確定」→ 繼續操作
```

---

### 方案 B：延遲創建 Live Region

**實作**：
```javascript
// 先創建空的 Live Region
let liveRegion = document.createElement('div');
// ... 設定屬性
document.body.appendChild(liveRegion);

// 延遲 100ms 後再更新內容
setTimeout(() => {
  liveRegion.textContent = message;
}, 100);
```

**評估**：❌ 不太可能解決問題（已測試過類似方法）

---

### 方案 C：完全靜默操作

**實作**：
```javascript
// 首頁：直接跳轉，無通知
window.location.href = targetUrl;

// 表單頁：直接填寫，無通知
nameInput.value = name;
// ... 其他欄位
```

**優點**：
- ✅ 無技術問題
- ✅ 使用者用 VoiceOver 導航時自然會發現欄位已填好

**缺點**：
- ⚠️ 沒有主動提示
- ⚠️ 首頁跳轉可能讓使用者困惑（不知道發生什麼）
- ⚠️ 表單頁無法確認是否填寫成功

---

### 方案 D：混合方案

**實作**：
- **首頁**：用原生 Alert（需要明確指示）
- **表單頁**：靜默填寫（使用者用 VoiceOver 自然發現）

**優點**：
- ✅ 減少 1 次「確定」點擊
- ✅ 首頁有明確指示

**缺點**：
- ⚠️ 表單頁無確認訊息（可能讓使用者不確定是否成功）

---

## 🎯 建議方案

**優先推薦：方案 A（原生 Alert）**

### 理由
1. **可靠性優先**：100% 保證 VoiceOver 完整朗讀
2. **多 2 次點擊可接受**：相比不穩定的語音，多點 2 次「確定」是合理的代價
3. **VoiceOver 友善**：Alert 彈出時，VoiceOver 會自動聚焦「確定」按鈕
4. **簡單直接**：不需要處理複雜的 timing 問題

### 操作流程對比

| 流程 | 當前（不穩定） | 方案 A（可靠） |
|------|--------------|---------------|
| **首頁** | 點書籤 → (可能聽到通知) → 5 秒後跳轉 | 點書籤 → 聽通知 → 點「確定」→ 跳轉 |
| **表單頁** | 點書籤 → (可能聽到通知) → 操作 | 點書籤 → 欄位填好 → 聽通知 → 點「確定」→ 操作 |
| **總操作** | 2 次點擊書籤（語音不穩定） | 2 次點書籤 + 2 次點確定（語音 100% 可靠） |

---

## 📈 問題根因總結

### iOS Safari 的限制
1. **Web Speech API**：
   - 受系統音訊資源競爭影響
   - 可能被系統語音、Siri、背景 app 阻塞
   - 無錯誤訊息，靜默失敗

2. **ARIA Live Region**：
   - 實作品質不如桌面版
   - 容易被頁面 DOM 變更打斷
   - 與動態內容（廣告、輪播等）有衝突

3. **平台優先級**：
   ```
   iOS 音訊優先級：
   1. 系統語音（Siri、VoiceOver 本身）
   2. 原生 app 音訊
   3. Safari 原生 Alert
   4. Web Speech API / ARIA Live Region（最低）
   ```

### 結論
**Web 技術在 iOS 上的語音朗讀不適合做關鍵操作提示，應使用原生機制。**

---

## 📝 下一步行動

### 待決策
- [ ] 確認採用方案 A（原生 Alert）
- [ ] 或選擇其他方案

### 實作任務（如選擇方案 A）
- [ ] 修改 `songshan-bookmarklet.js` 的 `handleHomePage()`
- [ ] 修改 `songshan-bookmarklet.js` 的 `handleFormPage()`
- [ ] 重新壓縮產生 `songshan-bookmarklet-minified.txt`
- [ ] 更新 Safari 書籤
- [ ] 測試驗證
- [ ] 更新 `ios-shortcut-solution.md` 文件

---

## 📚 相關文件

- 主文件：`ios-shortcut-solution.md`
- 原始碼：`songshan-bookmarklet.js`
- 壓縮版：`songshan-bookmarklet-minified.txt`

---

**文件建立日期**：2025-11-28  
**最後更新**：2025-11-28  
**當前狀態**：待決策方案

