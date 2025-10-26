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

**Prompt 實作位置**：
- 提示文字解析 Prompt：`recaptcha_vision_solver.py` 中的 `EXTRACT_PROMPT_TEMPLATE`
- 提示文字選擇器：`config.py` 中的 `RECAPTCHA_VISION["CHALLENGE_TEXT_SELECTORS"]`

**成本**：約 100 tokens input + 20 tokens output = $0.0002（可忽略）

---

#### B. 圖片識別 Prompt（主要 Vision API）

**Prompt 實作位置**：
- 圖片識別 Prompt：`recaptcha_vision_solver.py` 中的 `VISION_PROMPT_TEMPLATE`
- 包含 3x3 Grid Layout ASCII 視覺化
- 涵蓋 3 種情境：多個獨立物件、跨格子物件、無物件

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

### 9. 本地測試截圖結構（已確定 - 2025年10月25日更新）

#### 測試資料夾完整結構
```
申請截圖/
├── 圖片選擇驗證1.png（既有）
├── 圖片選擇驗證2.png（既有）
└── recaptcha_test/（新增，本地測試專用）
    └── trigger_test_20251025_185216/（單次測試資料夾）
        ├── 1_before_recaptcha.png             (整頁) 點擊 checkbox 前
        ├── 2_after_click.png                  (整頁) 點擊 checkbox 後
        ├── 3_image_challenge.png              (整頁) 圖片驗證畫面
        ├── 4_prompt_extracted_{object}.png    (整頁) 提示文字提取
        │
        ├── iteration_1_grid.png               (格子) 第 1 輪識別用
        ├── iteration_1.json                   (JSON) 第 1 輪 Vision API 記錄
        ├── iteration_1_after.png              (整頁) 第 1 輪點擊後
        │
        ├── iteration_2_grid.png               (格子) 第 2 輪識別用
        ├── iteration_2.json                   (JSON) 第 2 輪 Vision API 記錄
        ├── iteration_2_after.png              (整頁) 第 2 輪點擊後
        │
        ├── ... (最多 8 輪)
        │
        └── 5_final_state.png                  (整頁) 最終狀態
```

**截圖時機點**：
- T1: 點擊 reCAPTCHA 前（整頁）
- T2: 點擊後檢查狀態（整頁）
- T3: 圖片挑戰畫面（整頁）
- T4: 提示文字提取後（整頁）
- **T5-TN: 每輪循環**（最多 8 輪）
  - 識別前：格子截圖
  - 點擊後：整頁截圖
  - JSON 記錄：Vision API 詳細回應
- T_final: 最終表單狀態（整頁）

**JSON 記錄格式**（每輪一個檔案）：
```json
{
  "iteration": 1,
  "target_object": "bicycles",
  "call_1": {
    "selected_cells": [3, 6, 9],
    "confidence": 0.98,
    "explanation": "...",
    "pattern": "separate_objects"
  },
  "call_2": {
    "selected_cells": [3, 5, 6, 9],
    "confidence": 0.96,
    "explanation": "...",
    "pattern": "separate_objects"
  },
  "final_result": {
    "selected_cells": [3, 5, 6, 9],
    "union_of": [[3,6,9], [3,5,6,9]]
  },
  "timestamp": "2025-10-25T18:52:30"
}
```

**JSON 用途**：
- ✅ 純記錄用（事後人工分析）
- ❌ 程式不讀取（使用記憶體中的變數）
- ✅ 對照截圖分析識別準確度
- ✅ 追蹤信心度變化

**輸出方式**：
- 只用 `print()` 輸出測試結果
- 所有記錄（截圖 + JSON）都預設執行
- 不區分除錯模式（簡化程式碼）

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

### 13. 圖片截取和點擊技術細節（已確定 - 2025年10月25日）

#### A. 圖片截取方式
**決定**：截取整個 3x3 網格（一張圖片）

**實作方式**：
```python
grid_element = frame.locator(".rc-imageselect-target")
screenshot_bytes = grid_element.screenshot()
image_base64 = base64.b64encode(screenshot_bytes).decode()
```

**選擇理由**：
- ✅ 符合 Prompt 設計（「3x3 grid image」）
- ✅ Vision API 可以看到整體佈局
- ✅ 能處理跨格子的大物件（Scenario B）
- ✅ 只需一次 API 調用
- ✅ 程式碼簡單

---

#### B. 點擊方式
**決定**：使用 Playwright locator 定位每個格子元素

**實作方式**：
```python
# 找到所有格子元素
cells = frame.locator(".rc-imageselect-tile").all()

# 根據 Vision API 回傳的 selected_cells 點擊
for cell_num in selected_cells:
    # cell_num 是 1-9，轉換為 0-8
    cells[cell_num - 1].click()
    await asyncio.sleep(0.8)  # 點擊間隔
```

**選擇理由**：
- ✅ 精確定位元素
- ✅ Playwright 自動處理可見性和可點擊性
- ✅ 更穩定（元素位置改變也不影響）
- ✅ 程式碼清晰易懂
- ✅ 與現有偵測邏輯一致

---

#### C. 格子編號系統
**決定**：保持 1-9 編號（程式碼轉換 -1）

**Prompt 視覺化**：
```
┌─────┬─────┬─────┐
│  1  │  2  │  3  │
├─────┼─────┼─────┤
│  4  │  5  │  6  │  ← 人類直覺：第一個是 1
├─────┼─────┼─────┤
│  7  │  8  │  9  │
└─────┴─────┴─────┘
```

**程式碼轉換**：
```python
# Vision API 回傳: [1, 3, 5, 7]
# Playwright 需要: [0, 2, 4, 6]
for cell_num in selected_cells:
    playwright_index = cell_num - 1
    cells[playwright_index].click()
```

**選擇理由**：
- ✅ 符合 GPT 訓練數據習慣（編號從 1 開始）
- ✅ 人類可讀性高（除錯友好）
- ✅ 符合自然語言習慣
- ✅ 轉換成本極低（一行程式碼）

---

### 14. reCAPTCHA 循環識別邏輯（已確定 - 2025年10月25日）

#### 核心概念

**reCAPTCHA 動態更新機制**：
- 點擊包含目標物件的格子後，該格子圖片會自動更新
- 新圖片可能仍包含目標物件，需要繼續識別和點擊
- 循環直到所有格子都不包含目標物件，或達到最大迭代次數

#### 實作規格

**循環參數**：
```python
MAX_ITERATIONS = 8          # 最多 8 輪識別
WAIT_AFTER_CLICK = 3.0      # 點擊後等待圖片更新（秒）
CLICK_INTERVAL = 0.8        # 格子間點擊間隔（秒）
```

**流程設計**：
```python
# === 循環識別階段 ===
for iteration in range(1, MAX_ITERATIONS + 1):
    # 1. 檢查 reCAPTCHA 是否還存在（提前結束條件 A）
    if not recaptcha_still_exists():
        print(f"✅ reCAPTCHA 已自動通過（第 {iteration-1} 輪後）")
        return True  # 提前成功
    
    # 2. 截圖格子（存檔）
    grid_image = capture_grid_image()
    save_screenshot(f"iteration_{iteration}_grid.png")
    
    # 3. 呼叫 Vision API 兩次，取並集
    result_1 = call_vision_api(grid_image, target_object)
    result_2 = call_vision_api(grid_image, target_object)
    final_cells = union(result_1, result_2)
    
    # 4. 儲存 JSON 記錄
    save_json(f"iteration_{iteration}.json", {
        "call_1": result_1,
        "call_2": result_2,
        "final_result": final_cells
    })
    
    # 5. 如果沒有目標物件了，跳出循環（提前結束條件 B）
    if not final_cells:
        print(f"✅ 沒有目標物件了（第 {iteration} 輪）")
        break  # 跳出循環，準備點擊 Verify
    
    # 6. 點擊所有識別到的格子
    for cell_num in final_cells:
        click_cell(cell_num - 1)  # 1-based → 0-based
        wait(CLICK_INTERVAL)
    
    # 7. 等待圖片更新（點擊後格子會自動更新圖片）
    wait(WAIT_AFTER_CLICK)
    
    # 8. 截圖整頁（存檔）
    save_screenshot(f"iteration_{iteration}_after.png")

# === 提交答案階段 ===
# 循環結束後（無論是否達到 8 輪），點擊 Verify 提交答案
print("\n=== 點擊 Verify 提交答案 ===")
click_verify_button()

# 等待驗證結果
wait(3秒)

# 檢查驗證是否通過
if not recaptcha_still_exists():
    print("✅ reCAPTCHA 驗證通過")
    return True
else:
    print("❌ reCAPTCHA 驗證失敗")
    return False  # 觸發重試機制
```

#### 提前結束條件與處理

**條件 A：reCAPTCHA 循環中自動消失**
- **檢查時機**：每輪開始前
- **檢查方法**：
  - iframe 存在：`frame = page.frame(name=pattern("bframe"))`
  - 網格可見：`frame.locator(".rc-imageselect-target").is_visible()`
  - **兩者都滿足** → reCAPTCHA 還在，繼續循環
  - **任一不滿足** → reCAPTCHA 已消失
- **原因**：reCAPTCHA 判定為人類，自動通過（不確定是否會發生，保守檢查）
- **處理**：直接返回成功，不點擊 Verify（因為已經沒有按鈕了）

**條件 B：沒有目標物件**
- **檢查時機**：每輪 Vision API 識別後
- **檢查方法**：`final_cells` 為空陣列 `[]` 或 `None`
- **原因**：所有格子都不包含目標物件
- **處理**：跳出循環，點擊 Verify 提交答案
- **適用場景**：
  - 第 1 輪就沒有目標物件（可能誤判，仍要提交）
  - 第 N 輪後所有目標物件都被選完

**條件 C：達到最大迭代次數（8 輪）**
- **檢查時機**：循環自然結束
- **檢查方法**：`for` 循環執行完 8 輪
- **原因**：可能 reCAPTCHA 刁難，或 Vision API 誤判
- **處理**：跳出循環，點擊 Verify 提交答案（即使可能還有目標物件）
- **後續**：如果驗證失敗，觸發外層重試機制（最多 2 次）

#### 多次呼叫取並集策略

**為什麼呼叫兩次？**
- Vision API 可能遺漏部分格子（如部分可見、小物件）
- 取並集可以減少遺漏風險
- 成本增加 2 倍，但準確度提升

**實作方式**：
```python
# 同一張圖片，呼叫兩次
result_1 = call_vision_api(image_base64, "bicycles")  # [3, 6, 9]
result_2 = call_vision_api(image_base64, "bicycles")  # [3, 5, 6, 9]

# 取並集
final_cells = list(set(result_1 + result_2))  # [3, 5, 6, 9]
```

**並集 vs 交集**：
- ✅ 使用並集（Union）：只要任一次識別到就選
- ❌ 不用交集（Intersection）：會增加遺漏風險
- 理由：reCAPTCHA 允許多選，寧可多選不要漏選

#### Verify 按鈕點擊時機（已確定）

**核心決策**：循環結束後點擊 Verify，不在循環中點擊

**原因**：
1. **reCAPTCHA 的實際行為**：
   - 點擊格子 → 該格子圖片立即自動更新（不需要點擊 Verify）
   - Verify 按鈕用於「提交最終答案」
   
2. **循環邏輯**：
   - 循環識別並點擊所有包含目標物件的格子
   - 每次點擊後格子自動更新，繼續識別新圖片
   - 直到沒有目標物件或達到 8 輪上限
   
3. **提交時機**：
   - 循環結束後（無論提前結束或達到 8 輪）
   - 點擊 Verify 提交答案
   - 等待 3 秒後檢查驗證結果

**特殊情況**：
- 如果循環中 reCAPTCHA 自動消失（條件 A）
- 直接返回成功，不點擊 Verify（因為已經沒有按鈕）

**驗證結果判定**：
- **成功**：Verify 後 3 秒，reCAPTCHA 元素消失
- **失敗**：Verify 後 3 秒，reCAPTCHA 元素仍存在 → 觸發外層重試機制

**不採用的方案**：
- ❌ 每輪點擊格子後都點擊 Verify（錯誤理解 reCAPTCHA 行為）
- ❌ 只在第 1 輪後點擊 Verify（無法處理動態更新）

---

#### Prompt 優化（針對遺漏問題）

**加強指示**：
```python
VISION_PROMPT_TEMPLATE = """
...

CRITICAL INSTRUCTIONS:
1. Include tiles with PARTIAL views of {target_object}
   - Even if only a small part is visible
   - Even if the object is in the background
   - Even if the object is partially occluded
   
2. Include tiles with SMALL objects
   - Even if the {target_object} is far away
   - Even if it's not the main subject of the image
   
3. When in doubt, INCLUDE the tile
   - It's better to select too many than too few
   - reCAPTCHA prefers over-selection to under-selection

...
"""
```

---

### 15. 必須修改的檔案清單（已確定）

**第 3-4 步需要修改的檔案**：

1. **`requirements.txt`** ✅
   - 加入：`openai>=1.0.0`

2. **`config.py`** ✅
   - 補充缺少的選擇器：
     - `GRID_SELECTOR`: ".rc-imageselect-target"（整個網格）
     - `TILE_SELECTOR`: ".rc-imageselect-tile"（單個格子）
     - `VERIFY_BUTTON_SELECTOR`: "#recaptcha-verify-button"（驗證按鈕）
     - `RECAPTCHA_IFRAME_PATTERN`: "bframe"（iframe 識別）

3. **`recaptcha_vision_solver.py`** ✅（基礎版）→ 🔄（循環版）
   - 實作 `extract_target_object()` - 提示文字解析 ✅
   - 實作 `capture_grid_image()` - 圖片截取和 Base64 編碼 ✅
   - 實作 `call_vision_api()` - Vision API 呼叫 ✅
   - 實作 `click_recaptcha_cells()` - 點擊格子（含 1→0 轉換）✅
   - 實作 `solve_recaptcha()` - 完整流程（含重試 2 次）✅
   - **新增**：循環識別邏輯（8 輪迭代）🔄
   - **新增**：多次呼叫取並集（每輪 2 次 Vision API）🔄
   - **新增**：提前結束判斷（三個條件）🔄
     - 條件 A：reCAPTCHA 消失檢查（iframe + 網格可見）
     - 條件 B：無目標物件
     - 條件 C：達到 8 輪上限
   - **新增**：Verify 按鈕點擊邏輯（循環結束後）🔄
   - **新增**：驗證結果判定（reCAPTCHA 是否消失）🔄
   - **新增**：JSON 記錄儲存（每輪一個檔案）🔄
   - **新增**：優化 Prompt（加強部分可見和小物件指示）🔄
   - **移除**：`debug_mode` 參數（簡化設計）🔄
   - **移除**：`click_verify` 參數（改為預設行為）🔄

4. **`website_automation_test.py`** ✅（基礎版）→ 🔄（循環版）
   - 修改測試邏輯：從偵測改為實際解決 ✅
   - 呼叫 `solver.solve_recaptcha(max_retries=2)` ✅
   - **新增**：支援循環截圖（每輪記錄）🔄
   - **移除**：`debug_mode=True` 參數（不再需要）🔄
   - **移除**：`click_verify` 參數（改為預設行為）🔄
   - **簡化**：測試腳本只負責觸發和記錄，循環邏輯在 solver 內🔄

---

## ✅ 決策完成總結

所有技術決策已完成，可以開始實作：

| 項目 | 決策 | 狀態 |
|------|------|------|
| 技術方案 | OpenAI GPT-4.1 Vision API | ✅ |
| 開發分支 | feature/recaptcha-vision-solver | ✅ |
| API Key 管理 | 獨立 Key (openai-api-key-vision) | ✅ |
| 模型參數 | max_tokens=150, temp=0.0, detail=high | ✅ |
| Prompt 設計 | 完整 (含文字解析 + 圖片識別 + 優化) | ✅ |
| 架構模式 | 獨立模組 (recaptcha_vision_solver.py) | ✅ |
| 測試架構 | 選項 B (獨立測試檔案 + 重用既有類別) | ✅ |
| 重試策略 | 重試 2 次，失敗人工處理 | ✅ |
| 超時設定 | 總計 60 秒，Vision API 15 秒 | ✅ |
| 錯誤處理 | 統一記錄，觸發人工處理 | ✅ |
| 測試輸出 | print() 輸出，不區分除錯模式 | ✅ |
| 測試檔案 | PDF + 證照檔案已確認 | ✅ |
| **截圖方式** | **整個 3x3/4x4 網格（一張圖片）** | **✅** |
| **點擊方式** | **Playwright locator** | **✅** |
| **編號系統** | **保持 1-9（程式碼 -1 轉換）** | **✅** |
| **循環邏輯** | **最多 8 輪迭代** | **✅** |
| **多次呼叫** | **每輪 2 次 Vision API 取並集** | **✅** |
| **等待時間** | **點擊後 3 秒，格子間隔 0.8 秒** | **✅** |
| **提前結束** | **reCAPTCHA 消失 + 無目標物件 + 達到 8 輪** | **✅** |
| **Verify 時機** | **循環結束後點擊（不在循環中）** | **✅** |
| **驗證判定** | **Verify 後 reCAPTCHA 消失 = 成功** | **✅** |
| **消失檢查** | **iframe 存在 + 網格可見（兩者都要）** | **✅** |
| **截圖記錄** | **每輪 2 張（grid + after）** | **✅** |
| **JSON 記錄** | **每輪一個檔案（純記錄用）** | **✅** |
| **除錯模式** | **移除 debug_mode（簡化設計）** | **✅** |

---

## 📅 開發順序（建議）

```
[x] 第 1 步：環境準備（已完成）
    ├─ [x] 決定 API Key 策略（獨立 Vision API Key）
    ├─ [ ] 在 Secret Manager 新增對應的 Key（Cloud Run 部署時）
    └─ [x] config.py 新增 Vision API 設定

[x] 第 2 步：建立本地測試環境（已完成）
    ├─ [x] 新增 website_automation_test.py
    ├─ [x] 新增 recaptcha_vision_solver.py（基礎架構 + 偵測功能）
    ├─ [x] 測試 headless 模式能否觸發圖片驗證（✅ 成功觸發）
    ├─ [x] 實作截圖邏輯（5 個時機點）
    └─ [x] 優化 Prompt 設計（根據實際測試截圖調整）

[x] 第 3 步：開發 Vision Solver 核心（已完成 - 2025年10月25日）
    ├─ [x] 實作圖片截取邏輯（Base64 編碼）
    ├─ [x] 實作提示文字解析（GPT-4.1 Text API）
    ├─ [x] 實作 Vision API 呼叫
    ├─ [x] 實作點擊邏輯（根據 selected_cells，含 1→0 轉換）
    ├─ [x] 實作重試機制（2次，含重新截圖和解析）
    ├─ [x] 更新 requirements.txt（加入 openai>=1.0.0）
    ├─ [x] 更新 config.py（補充選擇器配置）
    ├─ [x] 更新 website_automation_test.py（呼叫 solve_recaptcha）
    ├─ [x] 發現並修復：支援動態格子數量（3x3 或 4x4）
    └─ [x] 首次測試成功：3x3 網格 bus 識別（信心度 0.98）

[x] 第 4 步：本地測試和問題發現（已完成 - 2025年10月25日）
    ├─ [x] 使用 website_automation_test.py 測試 ✅
    ├─ [x] 發現格子數量動態變化（3x3/4x4）
    ├─ [x] 驗證成功率：首次測試成功 ✅
    ├─ [x] 錯誤處理測試：格子數量異常處理 ✅
    ├─ [x] 發現問題 1：Vision API 識別不完整（遺漏部分格子）
    ├─ [x] 發現問題 2：reCAPTCHA 動態更新機制（需要循環識別）
    └─ [x] Git commit：記錄當前實作狀態和已知問題

[ ] 第 4.5 步：優化循環邏輯和 Prompt（當前進行中）
    ├─ [ ] 實作循環識別邏輯（8 輪迭代）
    ├─ [ ] 實作多次呼叫取並集（每輪 2 次 Vision API）
    ├─ [ ] 實作提前結束判斷（三個條件）
    │   ├─ 條件 A：reCAPTCHA 消失檢查（iframe + 網格）
    │   ├─ 條件 B：無目標物件
    │   └─ 條件 C：達到 8 輪上限
    ├─ [ ] 實作 Verify 按鈕點擊邏輯（循環結束後）
    ├─ [ ] 實作驗證結果判定（reCAPTCHA 是否消失）
    ├─ [ ] 優化 Prompt（加強部分可見和小物件指示）
    ├─ [ ] 實作完整截圖記錄（每輪 grid + after）
    ├─ [ ] 實作 JSON 記錄儲存（每輪詳細回應）
    ├─ [ ] 移除 debug_mode 參數（簡化設計）
    ├─ [ ] 調整測試腳本（移除 click_verify 參數）
    └─ [ ] 本地測試驗證：完整循環和 Verify 流程

[ ] 第 5 步：整合到 Cloud Run（2 小時）
    ├─ [ ] 在 Secret Manager 新增 openai-api-key-vision
    ├─ [ ] 修改 website_automation_cloud.py（呼叫 solver）
    ├─ [ ] 部署到 Cloud Run
    └─ [ ] 測試完整流程

[ ] 第 6 步：真實提交測試（1 小時）
    └─ [ ] 階段 2C：真實提交
```

**預估總時間**：12-16 小時  
**已完成**：步驟 1-2（約 3 小時）  
**剩餘**：步驟 3-6（約 9-13 小時）

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

---

## 🔍 重大發現與優化（2025年10月25日）

### 測試記錄

#### 測試案例 1：Bus（3x3 網格）
- **時間**：2025-10-25 18:45:54
- **資料夾**：`trigger_test_20251025_184554/`
- **結果**：識別成功（信心度 0.98）
- **網格大小**：4x4（16 格）→ 動態調整成功

#### 測試案例 2：Bicycles（3x3 網格）
- **時間**：2025-10-25 18:52:16
- **資料夾**：`trigger_test_20251025_185216/`
- **結果**：識別不完整（遺漏格子 5, 7）
- **網格大小**：3x3（9 格）
- **信心度**：0.98（高信心但識別不完全）

### 發現的問題

#### 問題 1：Vision API 識別不完整
**現象**：
- Vision API 回傳高信心度（0.98）
- 但實際遺漏部分包含目標物件的格子
- 案例：bicycles 測試遺漏格子 5, 7

**可能原因**：
1. 目標物件在圖片中佔比小
2. 部分遮擋或背景中的小物件
3. Prompt 未強調「部分可見也要選」

**解決方案**：
- ✅ 優化 Prompt（加強部分可見和小物件指示）
- ✅ 每輪呼叫 Vision API 兩次取並集
- ✅ 成本增加 2 倍（可接受）

#### 問題 2：reCAPTCHA 動態更新機制
**現象**：
- 點擊格子後，reCAPTCHA 會更新被點擊格子的圖片
- 新圖片可能仍包含目標物件
- `5_final_state.png` 顯示新的 reCAPTCHA 挑戰

**解決方案**：
- ✅ 實作循環識別邏輯（最多 8 輪）
- ✅ 每輪點擊後等待 3 秒讓圖片更新
- ✅ 檢查提前結束條件（reCAPTCHA 消失或無目標物件）

### 優化策略總結

| 問題 | 解決方案 | 成本影響 |
|------|---------|---------|
| 識別不完整 | 每輪呼叫 2 次取並集 | +100% |
| 動態更新 | 循環識別（最多 8 輪） | +800% 最壞情況 |
| Prompt 優化 | 加強部分可見指示 | 無額外成本 |
| **總計** | **預期 2-4 輪完成** | **+300% ~ +500%** |

**成本估算**：
- 原估算：$0.002-0.003 USD / 次
- 優化後：$0.006-0.015 USD / 次
- 台幣：$0.18-0.45 元 / 次（仍然可忽略）

---

**建立時間**：2025年10月25日  
**最後更新**：2025年10月25日  
**當前階段**：Phase 6 - 第 4.5 步（優化循環邏輯）

