# Cloud Run Archive

## 📦 檔案說明

此資料夾存放 Phase 6（網站自動化）相關的程式碼，這些檔案目前未使用，但保留作為技術參考。

---

## 檔案清單

### 1. reCAPTCHA 處理相關

#### `recaptcha_vision_solver.py`
- **用途**：使用 OpenAI GPT-4.1 Vision API 解決 reCAPTCHA 圖片驗證
- **狀態**：已放棄
- **原因**：reCAPTCHA 圖片驗證無法穩定解決
- **技術價值**：完整的 Vision API 整合實作，包含循環識別邏輯、多次呼叫取並集等優化

---

### 2. 網站自動化相關

#### `website_automation_cloud.py`
- **用途**：Cloud Run 版本的 Playwright 網站自動化（無頭模式）
- **狀態**：已停用
- **原因**：100% 觸發 reCAPTCHA 圖片驗證，無法穩定完成表單提交

#### `website_automation_local.py`
- **用途**：本地測試版本的 Playwright 網站自動化（有頭模式）
- **狀態**：測試工具
- **用途**：本地開發和調試時使用

#### `website_automation_test.py`
- **用途**：網站自動化測試腳本（含 reCAPTCHA 處理測試）
- **狀態**：測試工具

---

### 3. 網站分析相關

#### `analyze_website.py`
- **用途**：一次性工具，分析表演場地網站結構和選擇器
- **狀態**：已完成使用
- **產出**：`website_analysis_result.json`

#### `website_analysis_result.json`
- **用途**：網站表單選擇器配置檔
- **狀態**：已整合到 `config.py`

---

## 🔄 當前解決方案

由於網站自動化方案無法穩定運作，系統已改採 **iOS Shortcut + Safari Bookmarklet 半自動化方案**。

詳見：[ios-shortcut-solution.md](../../../docs/ios-shortcut-solution.md)

---

## 📊 技術價值

這些檔案展示了完整的技術探索過程：

1. **Playwright 網站自動化實作**
   - 表單填寫、檔案上傳、條款勾選
   - 無頭/有頭模式支援
   - 截圖和錯誤處理

2. **Vision API 整合**
   - OpenAI GPT-4.1 Vision API 呼叫
   - 圖片識別和 JSON 解析
   - 循環識別邏輯（最多 8 輪）
   - 多次呼叫取並集優化

3. **問題解決歷程**
   - reCAPTCHA 偵測機制分析
   - 各種繞過嘗試和優化
   - 最終決策過程記錄

---

## 🔮 未來可能用途

- 其他專案參考（Playwright + Vision API 整合）
- reCAPTCHA 演算法改變時重新嘗試
- 教學和技術分享素材

---

**建立日期**：2025-11-28  
**相關文件**：
- [recaptcha-solution.md](../../../docs/recaptcha-solution.md) - 完整技術探索記錄
- [ios-shortcut-solution.md](../../../docs/ios-shortcut-solution.md) - 當前方案
- [development-guide.md](../../../docs/development-guide.md) - 開發指南

