# Shortcut 自動化測試記錄

## 測試目標

用 iOS Shortcut 直接完成松菸申請流程：
1. 頁面跳轉（首頁 → 申請表單頁）
2. 基本資料填寫

> 註：Bookmarklet 版本已完成並可正常運作

---

## 測試策略

### 策略 1：Shortcut 啟動 Bookmarklet

**概念**：透過 Shortcut 執行 `javascript:` URL 來觸發 bookmarklet

**結論**：❌ **不可行**
- iOS Safari 基於安全考量，不允許透過 URL scheme 執行 `javascript:` 開頭的 URL
- Apple 刻意封鎖此途徑以防止惡意攻擊

---

### 策略 2：Shortcut 直接執行 JavaScript

使用 iOS Shortcut 的「在網頁上執行 JavaScript」功能

#### 測試方案 A：JS 直接跳轉

**流程**：
```
1. 打開首頁 URL
2. 等待 3 秒
3. 執行 JS：找到按鈕 → window.location.href 跳轉
4. completion() 通知完成
```

**結果**：❌ **失敗**
- JS 有執行（console.log 有輸出）
- 但沒有實際跳轉

---

#### 測試方案 B：JS 返回 URL

**流程**：
```
1. 打開首頁 URL
2. 等待 5 秒
3. 執行 JS：找到按鈕 URL → completion(url) 返回
4. Shortcut 接收 URL 並跳轉
```

**測試 1：基本測試**
```javascript
completion('測試成功');
```
**結果**：❌ 沒有任何顯示訊息

---

**測試 2：檢查問題 - 「打開 URL」+ 「在網頁上執行 JS」**

**發現問題**：
- 「打開 URL」只是在 Safari 打開網頁
- **不會把網頁內容傳給下一個動作**
- 「在網頁上執行 JavaScript」的「網頁」參數是空的

---

**測試 3：改用「取得 URL 的內容」**

**流程**：
```
1. 取得 URL 的內容
2. 等待 5 秒
3. 在「URL 的內容」上執行 JavaScript
```

**結果**：❌ **報錯**
```
在網頁上執行 JavaScript 失敗，因為捷徑
無法從「RTF」轉換到「Safari 網頁」
```

**原因**：
- 「取得 URL 的內容」只是下載 HTML 文字
- 不是真正的瀏覽器環境
- 無法執行需要 DOM 操作的 JavaScript

---

**測試 4：使用「在目前的 App 上執行 JavaScript」**

**流程**：
```
1. 打開 URL（Safari）
2. 等待 5 秒
3. 在「目前的 App」上執行 JavaScript
```

**結果**：❌ **失敗**

**原因**：
- Shortcut 執行時，控制權在 Shortcut App
- 即使中間有「打開 URL」，Safari 只是在背景載入
- 「目前的 App」= Shortcut（不是 Safari）
- 除非 Shortcut 執行完畢，否則不會切換到 Safari

---

## 核心限制

### iOS Shortcut 的「在網頁上執行 JavaScript」功能限制

**設計用途**：
- 對**已經在 Safari 打開的網頁**進行輔助操作
- 需要分兩個步驟：先打開網頁 → 再手動執行 Shortcut

**不適用於**：
- 從頭到尾的自動化流程
- 在 Shortcut 執行過程中對剛打開的網頁進行操作

---

## 結論

### ❌ 無法用 Shortcut 取代 Bookmarklet

**原因**：
1. iOS 不允許透過 Shortcut 觸發 `javascript:` URL
2. Shortcut 的 JS 執行功能需要網頁「已經在 Safari 打開」
3. Shortcut 執行時控制權不在 Safari

### ✅ 最佳方案：維持現狀

**流程**：
1. Shortcut 開啟松菸首頁
2. 手動點擊 Bookmarklet 完成跳轉和填表

**優點**：
- 技術上最可靠
- 在 iOS 限制下已是最簡化流程
- Bookmarklet 版本已完成且穩定

---

## 測試日期

2025-11-29

## 相關檔案

- Bookmarklet 原始碼：`songshan-bookmarklet.js`
- Bookmarklet 壓縮版：`songshan-bookmarklet-minified.txt`

