# reCAPTCHA 圖片驗證處理方案

## 📋 問題描述

### 當前狀況
- **階段**：Phase 6 階段 2B（測試模式，停在提交前）
- **問題**：表演場地網站的 reCAPTCHA 驗證會觸發圖片選擇驗證
- **關鍵發現**：**透過 Cloud Run 執行時，目前 100% 觸發圖片驗證**
  - Cloud Run 環境的自動化特徵被 reCAPTCHA 識別
  - 每次執行都會要求選擇圖片
  - **當前無法處理圖片選擇驗證**
  - 本地測試環境多數不觸發（僅開發過渡階段，非重點）

### 實際觸發案例
**Cloud Run 環境**測試過程中遇到的圖片驗證類型：

#### 案例 1：選擇自行車（bicycles）
![圖片選擇驗證1](申請截圖/圖片選擇驗證1.png)
- **要求**：選擇所有包含自行車的圖片
- **格式**：3×3 網格圖片
- **語言**：英文界面

#### 案例 2：選擇公交車（bus）
![圖片選擇驗證2](申請截圖/圖片選擇驗證2.png)
- **要求**：選擇所有包含公交車的圖片
- **格式**：3×3 網格圖片
- **語言**：英文界面

**觀察**：
- 驗證物體類型動態變化（自行車、公交車等交通工具）
- 每次觸發都是不同的挑戰題目
- 介面統一（3×3 網格 + "VERIFY" 按鈕）

### 技術背景
- **reCAPTCHA 類型**：包含勾選框和圖片挑戰
- **觸發模式**：**Cloud Run 環境 100% 觸發**
- **觸發原因分析**：
  - Cloud Run 無頭瀏覽器特徵明顯
  - GCP 數據中心 IP 地址被識別為非住宅 IP
  - 自動化工具指紋（Playwright）被檢測
  - 缺乏真實用戶行為模式（滑鼠移動、瀏覽歷史等）
  - Google 的風險評估算法判定為高風險

### 當前實作狀態
- ✅ 可以點擊 reCAPTCHA 勾選框
- ❌ **無法處理圖片選擇驗證**（Cloud Run 100% 觸發）
- ❌ **無法偵測是否觸發了圖片驗證**
- ❌ **程式會在圖片驗證處卡住**

### 影響範圍
- **主流程完全中斷**：Cloud Run 執行時 100% 無法完成提交
- **用戶體驗**：系統無回應，必須人工介入
- **測試優勢**：穩定觸發，容易重現和測試解決方案

---

## 🎯 解決方案決策（2025年10月25日）

### ✅ 已確定方案：OpenAI GPT-4.1 Vision API

**核心決策**：
- **技術選型**：使用 OpenAI GPT-4.1 Vision API 識別 reCAPTCHA 圖片
- **開發分支**：`feature/recaptcha-vision-solver`
- **架構模式**：新增獨立模組 `recaptcha_vision_solver.py`

---

## 📋 實作規格

### 1. API Key 管理
- **待決策**：使用獨立 API Key 或與 GAS 共用同一把？
  - 選項 A：Google Secret Manager 新增獨立 `openai-api-key-vision`（建議）
  - 選項 B：與 GAS 共用同一個 `openai-api-key`

### 2. GPT-4.1 模型參數（已確定）
```python
RECAPTCHA_VISION_CONFIG = {
    "model": "gpt-4.1",
    "max_tokens": 150,      # 圖片識別不需要太多
    "temperature": 0.0,     # 最低創造性，追求準確
    "detail": "high"        # 高細節模式，準確識別圖片
}
```

**成本分析**：
- 每次 reCAPTCHA（9張圖片 + 提示文字解析）：約 $0.002-0.003 USD（台幣 0.06-0.09 元）
- 每月成本（1 次申請，最多重試 2 次）：台幣 0.06-0.18 元（幾乎可忽略）

### 3. 架構設計（已確定）
```
code/cloud-run/
├── main.py                          (既有，不改動)
├── config.py                        (既有，新增 Vision API 設定)
├── website_automation_cloud.py      (既有，呼叫 solver)
├── website_automation_local.py      (既有，不改動)
├── website_automation_test.py       (新增：本地 headless 測試)
└── recaptcha_vision_solver.py       (新增：Vision API 處理核心)
```

**測試流程**：
- `website_automation_test.py` → 調用 → `recaptcha_vision_solver.py`
- **不包含**完整流程測試（完整流程在 `website_automation_cloud.py`）

### 4. 重試策略（已確定）
- **重試次數**：2 次
- **失敗處理**：報錯並觸發人工處理流程
- **邏輯**：
  1. 第 1 次：Vision API 識別 + 點擊
  2. 第 2 次：如果失敗，重試一次
  3. 失敗後：記錄錯誤，通知 LINE，提供檔案連結供人工提交

### 5. Prompt 設計（已確定）

#### A. 提示文字解析 Prompt（提取目標物件）

**目的**：從 "Select all images with bicycles" 提取 "bicycles"

**提示文字元素探測邏輯**（多選擇器嘗試）：
```python
# 按優先順序嘗試以下選擇器，直到找到為止
CHALLENGE_TEXT_SELECTORS = [
    '.rc-imageselect-desc-no-canonical',  # 最常見
    '.rc-imageselect-desc',               # 備選1
    '.rc-imageselect-instructions',       # 備選2
    '.rc-imageselect-desc-wrapper'        # 備選3
]
```

**GPT-4.1 Text 解析 Prompt**：
```python
extract_prompt = f"""
Extract the target object name from this reCAPTCHA challenge instruction.

Instruction text: "{challenge_text}"

Common patterns:
- "Select all images with [object]"
- "Select all squares with [object]"
- "Click on all images containing [object]"

Extract only the object name (e.g., "bicycles", "traffic lights", "buses", "crosswalks").

If the object is plural, keep it plural.
If there are multiple words (e.g., "traffic lights"), keep them together.

Response format (JSON only):
{{
    "target_object": "extracted object name",
    "confidence": 0.0-1.0
}}

Example:
Input: "Select all images with bicycles"
Output: {{"target_object": "bicycles", "confidence": 1.0}}

Input: "Click verify once there are none left"
Output: {{"target_object": "unknown", "confidence": 0.0}}
"""
```

**成本**：約 100 tokens input + 20 tokens output = $0.0002（可忽略）

---

#### B. 圖片識別 Prompt（主要 Vision API）

**Grid Layout 視覺化**（ASCII Art）：
```
┌─────┬─────┬─────┐
│  1  │  2  │  3  │
├─────┼─────┼─────┤
│  4  │  5  │  6  │  (Numbered left to right, top to bottom)
├─────┼─────┼─────┤
│  7  │  8  │  9  │
└─────┴─────┴─────┘
```

**完整 Vision Prompt**：
```python
vision_prompt = f"""
You are a reCAPTCHA image verification expert.

Task: Analyze this 3x3 grid image (9 tiles total) and identify which tiles contain "{target_object}".

Grid Layout:
┌─────┬─────┬─────┐
│  1  │  2  │  3  │
├─────┼─────┼─────┤
│  4  │  5  │  6  │  (Numbered left to right, top to bottom)
├─────┼─────┼─────┤
│  7  │  8  │  9  │
└─────┴─────┴─────┘

IMPORTANT - Two possible scenarios:

Scenario A: Multiple separate objects
- Each tile contains a complete or partial view of a different {target_object}
- Example: Multiple bicycles, each in different tiles

Scenario B: One large object spanning multiple tiles
- A single large {target_object} is split across multiple adjacent tiles
- Example: One large bicycle spread across tiles 1,2,4,5

Instructions:
1. Carefully examine ALL 9 tiles in the grid
2. Identify tiles containing ANY part of the target object
3. Include tiles with:
   ✓ Complete objects
   ✓ Partial views (even small parts count)
   ✓ Parts of larger objects spanning multiple tiles
4. Exclude tiles with:
   ✗ Similar but different objects (e.g., motorcycles when looking for bicycles)
   ✗ Completely unrelated content

Pay special attention to:
- Objects that span multiple tiles (consider all tiles they occupy)
- Partial views at tile edges
- Small or unclear portions that are still part of the target object
- Each tile may contain part of an object or no object at all

Response format (JSON only):
{{
    "selected_cells": [list of tile numbers containing {target_object}],
    "confidence": 0.0-1.0 (how confident you are),
    "explanation": "Brief reasoning",
    "pattern": "separate_objects" or "spanning_object"
}}

Example 1 (Separate objects):
If tiles 1, 3, 5, 7 each contain a different bicycle:
{{"selected_cells": [1, 3, 5, 7], "confidence": 0.95, "explanation": "4 separate bicycles clearly visible", "pattern": "separate_objects"}}

Example 2 (Spanning object):
If one large bicycle spans tiles 1, 2, 4, 5:
{{"selected_cells": [1, 2, 4, 5], "confidence": 0.92, "explanation": "One large bicycle spanning adjacent tiles", "pattern": "spanning_object"}}
"""
```

**Prompt 存放位置**：
- 直接放在 `recaptcha_vision_solver.py` 中作為類別常數或方法內字串
- 不獨立成檔案（避免過度設計）

**信心度門檻**：
- 低於 0.7（70%）則放棄，觸發人工處理

### 6. 錯誤訊息格式（已確定）
```python
ERROR_MESSAGES = {
    "vision_api_failed": "[網站提交] reCAPTCHA 圖片識別失敗: Vision API 無法識別驗證圖片",
    "verification_timeout": "[網站提交] reCAPTCHA 驗證超時: 驗證碼處理超過 30 秒",
    "wrong_selection": "[網站提交] reCAPTCHA 驗證失敗: 圖片選擇不正確，已重試 2 次但仍失敗",
    "captcha_not_detected": "[網站提交] reCAPTCHA 偵測失敗: 無法找到驗證元素"
}
```

### 7. 超時和重試設定（已確定）

```python
TIMEOUT_CONFIG = {
    "VISION_API_SINGLE_CALL": 15,   # Vision API 單次調用（含網路延遲）
    "RECAPTCHA_VERIFICATION": 10,   # reCAPTCHA 驗證等待時間
    "TOTAL_PROCESS": 60,             # 整個流程（含重試2次）
    "CLICK_INTERVAL": 0.8,           # 點擊格子之間的間隔
    "RETRY_DELAY": 3                 # 重試前的等待時間
}
```

**計算邏輯**：
- 單次處理：截圖(1秒) + Vision API(15秒) + 點擊(7秒) + 驗證(10秒) ≈ 33秒
- 含重試2次：最多 60 秒

**重試策略**：
- 重試時重新截圖：✅ 是（圖片可能改變）
- 重試時重新呼叫 Vision API：✅ 是（新圖片需重新分析）
- 重試時重新解析提示文字：✅ 是（可能變更）
- 超時處理：記錄錯誤，觸發人工處理

### 8. 測試檔案確認（已確認）
- ✅ 測試 PDF：`申請表_2025年11月_1106_2358.pdf`（FILE_ID: ***REMOVED***）
- ✅ 街頭藝人證：`街頭藝人證.jpg`（FILE_ID: ***REMOVED***）

### 9. 本地測試截圖結構（已確定）

#### 第 2 步測試資料夾結構
```
申請截圖/
├── 圖片選擇驗證1.png（既有）
├── 圖片選擇驗證2.png（既有）
└── recaptcha_test/（新增，本地測試專用）
    └── trigger_test_20251025_151022/（第 2 步：觸發測試）
        ├── 1_before_recaptcha.png
        ├── 2_after_click.png
        ├── 3_image_challenge.png      （條件性：有圖片驗證才截）
        ├── 4_grid_close_up.png        （條件性：有圖片驗證才截）
        └── 5_final_state.png
```

**第 2 步截圖時機點**：
- T1: 點擊 reCAPTCHA 前
- T2: 點擊後檢查狀態
- T3: 圖片挑戰畫面（條件性：偵測到圖片驗證）
- T4: 圖片網格特寫（條件性：偵測到圖片驗證）
- T5: 最終表單狀態

**輸出方式**：
- 第 2 步：只用 `print()` 輸出測試結果
- 第 3 步+：視需求決定是否加入 `test_result.json`

### 10. 錯誤處理策略（已確定）

**所有錯誤統一處理**：記錄錯誤，觸發人工處理

**錯誤分類**：
```
1. Vision API 調用失敗（API Key、網路、額度）
2. Vision API 回應格式錯誤（無法解析 JSON）
3. Vision API 信心度過低（< 0.7）
4. 點擊操作失敗（元素找不到、iframe 切換失敗）
5. reCAPTCHA 驗證失敗（選擇不正確）
6. 超時錯誤（各階段超時）
```

**本地測試**：print() 輸出詳細錯誤訊息
**Cloud Run**：記錄日誌 + 回調 GAS + LINE 通知

---

### 11. API Key 管理（已確定）

**決定**：使用獨立的 OpenAI API Key

**設定方式**：
```
本地測試：
- 直接寫在 config.py 中
- API Key: 已建立獨立的 Vision 專用 Key
- config.py 已在 .gitignore 中，安全

Cloud Run 部署：
- 使用 Google Secret Manager
- Secret 名稱：openai-api-key-vision
- 透過 get_openai_vision_key() 方法動態載入
```

**優勢**：
- ✅ 權限分離（GAS 文字處理 vs Cloud Run 圖片識別）
- ✅ 成本追蹤清楚（可在 OpenAI Dashboard 分別查看）
- ✅ 安全性更高（Key 洩露影響範圍小）
- ✅ 未來擴展靈活（可加入更多 Vision 功能）

---

### 12. 測試架構設計（已確定）

**檔案架構**：選項 B - 建立獨立測試檔案，重用既有類別

```
code/cloud-run/
├── website_automation_local.py      (既有，不改動)
├── website_automation_test.py       (新建：測試專用腳本)
└── recaptcha_vision_solver.py       (新建：reCAPTCHA 偵測邏輯)
```

**實作策略**：
1. **重用 `WebsiteAutomation` 類別**
   - 避免重複程式碼
   - 重用導航、填寫、上傳邏輯
   - 只改變 `headless=True` 參數

2. **新增測試專用邏輯**
   - reCAPTCHA 偵測功能
   - 條件性截圖（有圖片驗證才截）
   - 測試結果 print 輸出

3. **第 2 步實作範圍**
   - `recaptcha_vision_solver.py`：`detect_image_challenge()`, `take_screenshot()`
   - `website_automation_test.py`：完整測試流程
   - `config.py`：新增 `RECAPTCHA_VISION` 配置

---

## ✅ 決策完成總結

所有技術決策已完成，可以開始實作：

| 項目 | 決策 | 狀態 |
|------|------|------|
| 技術方案 | OpenAI GPT-4.1 Vision API | ✅ |
| 開發分支 | feature/recaptcha-vision-solver | ✅ |
| API Key 管理 | 獨立 Key (openai-api-key-vision) | ✅ |
| 模型參數 | max_tokens=150, temp=0.0, detail=high | ✅ |
| Prompt 設計 | 完整 (含文字解析 + 圖片識別) | ✅ |
| 架構模式 | 獨立模組 (recaptcha_vision_solver.py) | ✅ |
| 測試架構 | 選項 B (獨立測試檔案 + 重用既有類別) | ✅ |
| 重試策略 | 重試 2 次，失敗人工處理 | ✅ |
| 超時設定 | 總計 60 秒，Vision API 15 秒 | ✅ |
| 截圖策略 | 5 個時機點（2 個條件性） | ✅ |
| 錯誤處理 | 統一記錄，觸發人工處理 | ✅ |
| 測試輸出 | 第 2 步用 print，第 3 步+ 再評估 JSON | ✅ |
| 測試檔案 | PDF + 證照檔案已確認 | ✅ |

---

## 📅 開發順序（建議）

```
第 1 步：環境準備（1 小時）
├─ 決定 API Key 策略
├─ 在 Secret Manager 新增對應的 Key
└─ config.py 新增 Vision API 設定

第 2 步：建立本地測試環境（2 小時）
├─ 新增 website_automation_test.py
├─ 新增 recaptcha_vision_solver.py（基礎架構）
└─ 測試 headless 模式能否觸發圖片驗證

第 3 步：開發 Vision Solver 核心（4-6 小時）
├─ 實作圖片截取邏輯
├─ 實作提示文字解析（GPT-4.1）
├─ 實作 Vision API 呼叫
├─ 實作點擊邏輯
└─ 實作重試機制（2次）

第 4 步：本地測試和調整（2-4 小時）
├─ 使用 website_automation_test.py 測試
├─ 調整 prompt 和參數
├─ 驗證成功率
└─ 錯誤處理測試

第 5 步：整合到 Cloud Run（2 小時）
├─ 修改 website_automation_cloud.py（呼叫 solver）
├─ 部署到 Cloud Run
└─ 測試完整流程

第 6 步：真實提交測試（1 小時）
└─ 階段 2C：真實提交
```

**預估總時間**：12-16 小時

---

**測試環境優勢**：
- ✅ Cloud Run 100% 穩定觸發，方便測試
- ✅ 可以快速驗證解決方案是否有效
- ✅ 不需要等待隨機觸發

---

## 🔗 相關資源

### 專案檔案
- `code/cloud-run/website_automation_cloud.py` - 當前 reCAPTCHA 處理邏輯（第 358-394 行）
- `code/cloud-run/main.py` - 錯誤處理和降級機制
- `code/gas/Code.js` - LINE 通知邏輯
- `申請截圖/圖片選擇驗證1.png` - 自行車驗證案例
- `申請截圖/圖片選擇驗證2.png` - 公交車驗證案例

---

**建立時間**：2025年10月25日  
**狀態**：問題分析階段，解決方案待討論  
**負責階段**：Phase 6 階段 2C

