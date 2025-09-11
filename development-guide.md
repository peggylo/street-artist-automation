# 街頭藝人申請系統開發指南

## 📁 專案檔案結構

### GAS專案檔案結構
```
街頭藝人申請系統 (GAS專案)
├── Code.gs                 # 主要邏輯、Webhook、狀態管理、影片處理 [Phase 1-4]
├── LineHandler.gs          # LINE API 相關函數 [Phase 1]
├── Config.gs               # 設定和常數 [Phase 1-4]
├── OpenAIHandler.gs        # OpenAI API 處理 [Phase 2]
├── DateUtils.gs            # 日期計算工具 [Phase 3]
└── (Phase 5+ 檔案將根據需要新增)
```

### 本地備份檔案結構
```
code/gas/
├── Code.js                 # Code.gs 備份（主要邏輯、狀態管理、影片處理、Sheets記錄）
├── LineHandler.js          # LineHandler.gs 備份
├── Config.js               # Config.gs 備份（透過git ignore保護敏感資訊）
├── OpenAIHandler.js        # OpenAIHandler.gs 備份
├── DateUtils.js            # DateUtils.gs 備份
└── (Phase 5+ 檔案備份將根據需要新增)
```

### Cloud Run 專案檔案結構
```
code/cloud-run/
├── main.py                 # 主要邏輯和 HTTP 服務 [Phase 5]
├── config.py               # 設定檔和常數 [Phase 5]
├── requirements.txt        # Python 套件清單 [Phase 5]
├── Dockerfile             # 容器化設定 [Phase 5]
└── (根據實際複雜度決定是否拆分更多檔案)
```

### 檔案結構設計原則
- **最小化原則**：避免過度設計，功能簡單的直接放在 main.py
- **獨立性原則**：複雜功能（如文件處理、Drive操作）如超過200行且獨立性強則拆分
- **判斷標準**：複雜度 > 200行 + 獨立性強 → 獨立檔案

## 🚀 開發階段規劃

### Phase 1: 基礎LINE Bot架構 (1-2週)

#### 🎯 Phase 1 開發決策
- **Bot名稱**：松菸申請助手
- **測試群組**：2人群組（開發者+協助者）
- **GAS權限設定**：
  - 執行權限：「以我的身分執行」
  - 存取權限：「任何人，甚至是匿名使用者」
- **日誌記錄**：記錄所有訊息和處理結果（方便除錯）
- **API Keys存放**：使用 PropertiesService
- **開發策略**：完整檔案結構開發（避免後續重構）


#### 🎯 Phase 1 需要建立的檔案
**GAS專案中**：
- `Code.gs` - 主要邏輯和 Webhook 處理
- `LineHandler.gs` - LINE API 相關函數
- `Config.gs` - 設定和常數

**本地備份**：
- `code/gas/Code.js` - 與GAS相同 ✅
- `code/gas/LineHandler.js` - 與GAS相同 ✅
- `code/gas/Config.js` - 與GAS相同（透過git ignore保護）✅

#### 1.1 LINE Bot基本設置 ✅ **已完成**
- [x] 建立LINE Developer帳號和Bot
  - Bot名稱：松菸申請助手
  - Bot描述：協助視障用戶申請松山文創園區街頭藝人場地
- [x] 設定Webhook URL（使用Google Apps Script）
- [x] 實現基本訊息接收和回覆功能
- [x] 設定2人測試群組（開發者+協助者+Bot）

#### 1.2 Google Apps Script環境建置 ✅ **已完成**
- [x] 建立GAS專案：「街頭藝人申請系統」
- [x] 建立Phase 1需要的檔案結構（3個.gs檔案）
  - `Code.gs` - 主要邏輯和 Webhook 處理
  - `LineHandler.gs` - LINE API 相關函數
  - `Config.gs` - 設定和常數
- [x] 設定PropertiesService存放API Keys
- [x] 設定權限：執行身分「以我的身分執行」，存取權限「任何人，甚至是匿名使用者」
- [x] 整合LINE Messaging API
- [x] 實現詳細日誌記錄機制（記錄所有訊息和處理結果）

#### 1.3 階段測試里程碑 ✅ **已完成**
- [x] ✅ 能接收訊息並正確回覆（個人聊天測試完成）
- [x] ✅ 群組成員都能看到Bot互動（群組測試完成）
- [x] ✅ 基本錯誤處理（訊息格式錯誤等）
- [x] ✅ 日誌正確記錄所有互動
- [x] ✅ PropertiesService正確存取API Keys

#### 🎯 Phase 1 預期產出 ✅ **已完成**
**程式碼檔案**：
- 3個GAS檔案（Code.gs, LineHandler.gs, Config.gs）✅
- 本地備份的3個.js檔案（Code.js, LineHandler.js, Config.js）✅

**Config.js 用途說明**：
- 存放非敏感設定：系統常數、錯誤訊息模板、業務邏輯設定 ✅
- 提供取得敏感資訊的方法：透過 PropertiesService 存取 API Keys ✅
- 敏感資訊（API Keys）存放在 GAS PropertiesService，不在程式碼中 ✅

**設定檔案**：
- LINE Bot設定資訊記錄 ✅
- GAS部署資訊記錄 ✅

**測試結果**：
- 完整的測試記錄和問題解決方案 ✅

### Phase 2: AI語意解析整合 (1-2週) ✅ **已完成**

#### 📋 Phase 2 範疇定義
**Phase 2 專注於**：
- **語音錯誤修正**：處理盲人語音輸入的常見錯誤（如「時」→「十」、「藥申請」→「申請」）
- **基本意圖識別**：識別用戶想做什麼（申請、測試、幫助）
- **信心度評分**：判斷AI理解的準確度
- **降級機制**：API失敗時的關鍵字備案

**Phase 2 不處理**：
- ❌ 複雜的確認邏輯（留給 Phase 3 的狀態管理）
- ❌ 日期時間處理（Phase 3）
- ❌ 業務邏輯（Phase 3-5）
- ❌ 多輪對話（Phase 3）

#### 🎯 Phase 2 開發決策
- **OpenAI 模型**：gpt-4o-mini（成本低，性能足夠語音處理需求）
- **API 調用參數**：
  - Temperature: 0.1（低創造性，提高準確性）
  - Max Tokens: 300（夠用且省成本）
  - Timeout: 10秒
  - Retry: 2次
- **成本控制**：每月調用上限3000次，預估成本約台幣15-30元
- **API Key 存放**：PropertiesService 屬性名稱 `OPENAI_API_KEY`
- **信心度門檻**：
  - 高信心度 (≥0.9)：直接執行（提高準確性要求）
  - 中信心度 (0.7-0.9)：請用戶確認（提高準確性要求）
  - 低信心度 (<0.7)：請用戶重新表達

#### 🎯 Phase 2 需要建立的檔案 ✅ **已完成**
**GAS專案中新增**：
- `OpenAIHandler.gs` - OpenAI API 處理邏輯 ✅

**本地備份新增**：
- `code/gas/OpenAIHandler.js` - 與GAS相同內容 ✅

**現有檔案修改**：
- `Config.gs/Config.js` - 新增 OpenAI 相關設定 ✅
- `Code.gs/Code.js` - 整合 OpenAI 處理邏輯 ✅

#### 2.1 OpenAI API整合 ✅ **已完成**
- [x] 申請OpenAI API金鑰並設定額度控制
- [x] 在GAS中實現API調用邏輯
- [x] 實現語音錯誤修正功能

#### 2.2 核心指令處理 ✅ **已完成**
- [x] 實現「申請」指令識別（含語音錯誤）
- [x] 建立信心度評分和確認機制
- [x] 實現意圖識別（申請、確認、修改）
- [x] 建立降級機制（關鍵字備案）

#### 2.3 階段測試里程碑 ✅ **已完成**
- [x] ✅ 正確識別「申請」指令（包含「藥申請」等錯誤）
- [x] ✅ 信心度低時能要求用戶澄清
- [x] ✅ API失敗時能降級到關鍵字匹配

#### 🎯 Phase 2 預期產出 ✅ **已完成**
**程式碼檔案**：
- 1個新增GAS檔案（OpenAIHandler.gs）
- 本地備份的1個.js檔案（OpenAIHandler.js）
- 修改現有檔案（Config.gs/Config.js, Code.gs/Code.js）

**功能實現**：
- AI語意解析和語音錯誤修正
- 信心度評分系統
- 降級機制（關鍵字匹配）
- 完整的錯誤處理和重試機制

**測試結果**：
- OpenAI API連線穩定（偶發401但重試成功）
- LINE Bot AI功能正常運作
- 語音錯誤修正準確（「藥申請」→「申請」）
- 信心度評分運作正常
- 盲人語音錯誤處理優化（「時」→「十」等數字錯誤修正）

#### 📝 媽媽的使用模式觀察（2025年9月測試）
**語音輸入特點**：
- **表達清楚**：實際測試中沒有明顯語音錯誤，不像預期的有很多錯誤
- **習慣用「我想」**：常說「我想申請」而非「我要申請」（都是正確的）
- **完整句子**：習慣說完整句子，包含月份、日期、星期幾
- **複雜需求**：能表達「雙周」、「前三周」、「第二周」等複雜概念

**重要發現**：
- 媽媽是**可以溝通調整**的用戶
- 可以根據系統需求調整說話方式（如只說日期、短句）
- 語音輸入比預期準確，主要問題可能在特定詞彙

**Phase 3 設計參考**：
- 可以引導媽媽使用更簡短的指令
- 系統提示可以教育用戶最佳輸入方式
- 不需要過度處理語音錯誤，專注業務邏輯

#### 🔧 Phase 2 穩定性優化建議（暫不執行）
**目前系統運作穩定，以下優化建議可於未來需要時實施**：

1. **日誌加強**：
   - 在呼叫 OpenAI API 前記錄金鑰前綴（前8碼）
   - 記錄 `OpenAI-Project` 值以便除錯

2. **固定 Project 路由**：
   - 在 headers 加上 `OpenAI-Project` 參數
   - 避免 API 在不同 Project 間跳轉導致權限問題

3. **優化錯誤重試機制**：
   - 對 401 錯誤不重試（權限問題重試無效）
   - 只對 429/5xx/超時進行重試
   - 使用 `muteHttpExceptions: true` 獲取完整錯誤訊息

4. **部署管理**：
   - 保持單一正式部署
   - 確保 LINE Webhook 指向正確的 `/exec` URL
   - 定期檢查部署權限設定

### Phase 3: 狀態管理與時間日期邏輯 (1-2週)

#### 📋 Phase 3 範疇定義
**Phase 3 專注於**：
- **對話狀態管理**：追蹤用戶在申請流程的哪個步驟
- **智能確認機制**：根據上下文理解「對」「不對」的意思
- **時間窗口管理**：1-15日申請規則
- **日期計算**：週六週日的計算和選擇
- **分層處理架構**：優先處理簡單指令，減少AI依賴

#### 🎯 Phase 3 開發決策（2025年9月）

**檔案結構（最小化原則）**：
- 新增檔案：`DateUtils.gs` - 日期計算工具
- 狀態管理和對話流程直接在 `Code.gs` 實現
- 簡單的影片上傳功能也在 `Code.gs` 實現（Phase 4 才獨立成 DriveHandler.gs）
- 避免過度設計，保持簡單

**狀態儲存方案**：
- 使用 GAS Cache Service 做短期對話狀態（30分鐘過期）
- Google Sheets 只用於完成後的永久記錄
- 兩者目的不同：Cache 是暫存，Sheets 是歷史記錄

**極簡對話流程**：
```
1. 用戶：「申請」
2. Bot：「申請10月份
         日期：10/5、10/12、10/19（前3個週六）
         影片：使用常用影片
         確認請說『好』，要修改請說『改日期』或『改影片』」
3. 用戶：「好」→ 開始處理
   或
   用戶：「改日期」→ 進入日期修改
   用戶：「改影片」→ 進入影片上傳
```

**修改流程設計**：
- 分開處理日期和影片修改
- 用戶說「修改」時，Bot 詢問要改什麼
- 直接識別「改日期」「改影片」等明確指令

**預設值策略**：
- 日期：前3個週六（媽媽的固定偏好）
- 影片：常用影片（但保留上傳新影片選項）
- 優先使用預設，減少對話輪次

**錯誤預防機制**：
- 明確顯示所有申請資訊供確認
- 關鍵操作前多次確認
- 日期計算後立即驗證正確性
- 錯誤時通知家人協助

**分層處理架構設計**：
```javascript
// 第一層：狀態相關處理（知道上下文）
if (currentState === 'waiting_confirmation') {
  if (text === '對' || text === '好') return confirmAction();
  if (text === '不對' || text === '不要') return rejectAction();
}

// 第二層：關鍵字快速匹配（不需要AI）
if (simpleKeywords[text]) return handleSimpleCommand(text);

// 第三層：AI語音修正（Phase 2的功能）
return analyzeWithAI(text);
```
#### 🎯 Phase 3 需要建立/修改的檔案
**新增檔案**：
- `DateUtils.gs/DateUtils.js` - 日期計算工具

**修改檔案**：
- `Code.gs/Code.js` - 加入狀態管理、對話流程、簡單影片上傳
- `Config.gs/Config.js` - 新增 Phase 3 相關設定
- `OpenAIHandler.gs/OpenAIHandler.js` - 新增日期相關意圖處理

#### 3.1 對話狀態管理系統 ✅ **已完成**
- [x] 建立用戶狀態追蹤機制（Cache Service）
- [x] 實現多輪對話支援
- [x] 建立狀態轉換邏輯
- [x] 實現上下文記憶功能（30分鐘過期）

#### 3.2 智能確認機制 ✅ **已完成**
- [x] 根據狀態理解確認詞（對、好、是）
- [x] 根據狀態理解否定詞（不對、不要、錯）
- [x] 避免確認循環問題
- [x] 建立清晰的確認流程

#### 3.3 時間窗口管理 ✅ **已完成**
- [x] 實現申請期間檢查（1-15日規則）
- [x] 建立月份推算邏輯（當前月+1或+2）
- [x] 實現申請關閉期提醒功能

#### 3.4 日期計算系統 ✅ **已完成**
- [x] 建立週六週日日期計算函數
- [x] 實現預設3個週六邏輯（媽媽偏好）
- [x] 支援自訂日期選擇（含週日）
- [x] AI日期選擇解析（專注具體日期號碼，優化語音錯誤處理）

#### 3.5 影片處理（完整版） ✅ **已完成**
- [x] 接收 LINE 傳送的影片檔案
- [x] 上傳影片到 Google Drive 指定資料夾
- [x] 返回影片連結供後續使用
- [x] 完善錯誤處理（檔案太大200MB、格式錯誤、網路問題等）
- [x] 時間戳檔案命名避免衝突
- [x] 自動設定檔案權限（知道連結的任何人可檢視）

#### 3.6 分層處理優化 ✅ **已完成**
- [x] 建立簡單指令快速處理機制
- [x] 減少不必要的AI調用
- [x] 優化處理效率
- [x] 降低錯誤率

#### 3.7 階段測試里程碑 ✅ **已完成**
- [x] ✅ 狀態管理正確追蹤對話流程
- [x] ✅ 「對」「不對」能根據上下文正確理解
- [x] ✅ 無確認循環問題
- [x] ✅ 不同日期的申請期間判斷準確
- [x] ✅ 日期計算結果正確
- [x] ✅ 語音錯誤日期選擇解析正確（專注具體日期號碼）
- [x] ✅ 影片上傳到 Google Drive 成功
- [x] ✅ 完整對話流程可以走完

#### 🎯 Phase 3 實際產出 ✅ **已完成**
**程式碼檔案**：
- 1個新增GAS檔案（DateUtils.gs）✅
- 本地備份的1個.js檔案（DateUtils.js）✅
- 修改現有檔案（Code.gs/Code.js, Config.gs/Config.js, OpenAIHandler.gs/OpenAIHandler.js）✅

**功能實現**：
- 完整的對話流程（申請→確認→修改→完成）✅
- 時間窗口判斷（1-15日可申請）✅
- 日期計算和選擇（專注具體日期號碼）✅
- 影片上傳到 Google Drive（完整版，含錯誤處理）✅
- 狀態管理和上下文記憶（Cache Service 30分鐘）✅

**用戶體驗**：
- 媽媽可以用「申請」開始流程 ✅
- 預設值讓流程快速完成（前3個週六）✅
- 可以修改日期或上傳新影片 ✅
- AI 理解結果確認機制 ✅
- 語音錯誤智能修正（時越→十月、蝕二→十二）✅

**關鍵優化決策**：
- **方案A實施**：專注日期號碼處理，移除複雜指令
- **AI確認機制**：顯示理解結果供用戶確認
- **簡化確認流程**：減少多餘確認步驟
- **智能錯誤降級**：上傳失敗自動使用常用影片
- **時間戳命名**：避免檔案衝突，保留所有版本

### Phase 4: Google Sheets 資料記錄 (1週)

#### 📋 Phase 4 範疇定義
**Phase 4 專注於**：
- **申請資料持久化**：將申請資訊記錄到 Google Sheets
- **狀態初始記錄**：記錄「待處理」狀態
- **資料完整性**：確保所有申請資訊正確記錄

#### 🎯 Phase 4 開發決策（2025年9月）

**檔案結構（最小化原則）**：
- 不新增檔案：Sheets 功能直接在 `Code.gs` 實現
- 預期程式碼量：50-100行（相對簡單）
- 與申請流程緊密結合，適合放在主檔案

**Google Sheets 設定**：
- Sheets ID: `1xZT5sqTTTrDxycPbJb9cuFPn59FY6m13srIkHYs3GdI`
- 位置：街頭藝人登記/系統記錄/申請記錄
- 權限：編輯權限僅限擁有者

**資料記錄策略**：
- **Phase 4 記錄**：「待處理」狀態
- **Phase 5 更新**：「處理中」→「完成」或「失敗」
- **用戶名稱**：不處理（LINE群組可看到操作者）

#### 🎯 Phase 4 需要建立/修改的檔案
**修改檔案**：
- `Code.gs/Code.js` - 加入 Google Sheets 記錄功能
- `Config.gs/Config.js` - 新增 Sheets ID 設定

#### 4.1 Google Sheets 資料記錄 ✅ **已完成**
- [x] 建立申請記錄寫入功能
- [x] 實現 Sheets API 基本讀寫
- [x] 記錄完整申請資訊（日期、影片、狀態）
- [x] 初始狀態設為「待處理」

#### 4.2 資料結構實作 ✅ **已完成**
**Sheets 欄位結構**：
```
A. 時間戳記 (自動產生)
B. 用戶ID (LINE userId)
C. 申請月份 (2025/10)
D. 選擇日期 (2025/10/4,2025/10/11,2025/10/18)
E. 影片來源 (常用影片/新上傳)
F. 影片連結 (Google Drive URL)
G. 狀態 (待處理)
H. 錯誤訊息 (空白)
I. PDF路徑 (空白，Phase 5 填入)
J. 處理開始時間 (空白，Phase 5 填入)
K. 處理完成時間 (空白，Phase 5 填入)
```

#### 4.3 階段測試里程碑 ✅ **已完成**
- [x] ✅ 申請記錄能正確寫入 Sheets
- [x] ✅ 資料格式正確（日期、影片連結等）
- [x] ✅ 狀態正確設為「待處理」
- [x] ✅ 完整申請流程含 Sheets 記錄

#### 🔧 Phase 4 重要 Debug 經驗
**Cache Service Date 序列化問題**：
- **問題**：Cache Service 將 Date 物件序列化為字串，取回時不再是 Date 物件
- **錯誤**：`TypeError: date.fullDate.getFullYear is not a function`
- **現象**：GAS 編輯器測試成功，LINE Bot 實際使用失敗
- **原因**：狀態儲存時 `fullDate: Date` → 取回時 `fullDate: '2025-10-03T16:00:00.000Z'`
- **解決**：檢查 fullDate 類型，字串時轉換為 Date 物件
- **教訓**：Cache Service 的 JSON 序列化會改變資料類型

#### 🎯 Phase 4 實際產出 ✅ **已完成**
**功能實現**：
- 申請完成時自動記錄到 Google Sheets ✅
- 包含完整申請資訊和影片連結 ✅
- 初始狀態為「待處理」✅
- Date 序列化問題完全解決 ✅
- 為 Phase 5 的狀態更新做準備 ✅

**程式碼更新**：
- Code.js 新增 Sheets 記錄功能（約100行）✅
- Config.js 新增 Sheets 相關設定 ✅
- 完善的錯誤處理和資料類型轉換 ✅

**測試驗證**：
- 完整申請流程 + Sheets 記錄成功 ✅
- 資料格式和完整性驗證 ✅
- 真實 LINE Bot 使用驗證 ✅

### Phase 5: 文件處理系統 (1-2週) ✅ **已完成**

#### 📋 Phase 5 範疇定義
**Phase 5 專注於**：
- **Cloud Run 環境建置**：Python 服務基礎架構 ✅
- **文件處理系統**：Word 模板填寫和 PDF 轉換 ✅
- **與 GAS 通信**：API 介接和狀態回報 ✅
- **完整自動化流程**：LINE 申請 → Sheets 記錄 → 自動觸發 Cloud Run → 文件處理完成 ✅

#### 5.1 Google Cloud Run 環境建置 ✅ **已完成**
- [x] 建立最小化 Python 專案結構
- [x] 設定 Dockerfile 和部署設定
- [x] 實現基本 HTTP 服務和健康檢查
- [x] 設定與 GAS 的 API 通信協議

#### 5.2 文件處理核心功能 ✅ **已完成**
- [x] 實現 Word 模板下載（從 Google Drive）
- [x] 建立 Word 文件自動填寫功能
- [x] 實現 PDF 轉換（LibreOffice headless）
- [x] 建立檔案上傳回 Google Drive 功能
- [x] 實現檔案命名規則（申請表_YYYY年MM月.pdf）

#### 5.3 資料整合和狀態管理 ✅ **已完成**
- [x] 整合申請資訊（日期、影片連結、個人資料）
- [x] 實現 Google Sheets 狀態更新（處理中→完成/失敗）
- [x] 建立錯誤處理和重試機制
- [x] 實現處理結果回報給 GAS

#### 🎯 Phase 5 開發決策（2025年9月）

**最小化架構決策**：
- **檔案結構**：main.py + config.py + requirements.txt + Dockerfile
- **遵循 GAS 原則**：複雜度 < 200行先不拆分，避免過度設計
- **預算考量**：Cloud Run 免費額度足夠（每月 < 500 次請求 vs 200萬次免費額度）

**Word 模板處理策略**：
- **標記方式**：`<url>`, `<date1>`, `<date2>`, `<date3>` 文字替換
- **日期處理**：支援 1-3 個日期，空白處保持空白
- **圖片保留**：印章圖片在文字替換和 PDF 轉換時自動保留
- **檔案流程**：GAS 複製模板 → Cloud Run 編輯複製檔案 → 文字替換 → PDF 轉換 → 覆蓋原檔案

**Service Account 權限設定**：
- **概念**：機器人帳號讓 Cloud Run 存取 Google Drive/Sheets
- **設定流程**：Google Cloud Console → 建立 Service Account → 下載 JSON 金鑰 → 設定 Drive 權限
- **安全性**：JSON 金鑰透過 Google Secret Manager 存放
- **權限解決方案**：採用「GAS 複製 + Cloud Run 編輯」避免 Service Account 儲存配額限制

**需要開啟的 GCP APIs**：
- **Cloud Run API**：執行 Python 服務
- **Google Drive API v3**：檔案下載和上傳
- **Google Sheets API v4**：狀態更新
- **Secret Manager API**：機密管理（推薦）
- **Cloud Build API**：自動部署（選用）

#### 5.4 技術實作細節

**Word 文件處理技術棧**：
- **python-docx**：Word 文件讀寫和文字替換
- **LibreOffice headless**：Word 轉 PDF（使用 soffice 命令行工具）
- **Google Drive API v3**：檔案下載和上傳
- **Google Sheets API v4**：狀態更新

**API 通信協議**：
- **GAS → Cloud Run**：HTTP POST 請求，傳送申請資料
- **Cloud Run → GAS**：HTTP 回應，回報處理結果和狀態
- **錯誤處理**：失敗時回報詳細錯誤訊息給 GAS

**GAS 啟動機制（自動觸發決策）**：
- **觸發時機**：在 `executeFinalApplication()` 函數中，申請確認後立即自動呼叫
- **設計決策**：採用自動觸發而非手動觸發，原因：
  - 一次到位，避免重複開發手動觸發界面
  - 測試真正的使用情境，發現實際問題
  - 免費額度充足（200萬次/月 vs 預估數百次測試）
  - 風險可控，失敗只影響文件處理，不影響主要功能
- **識別欄位**：使用 `timestamp`（申請時間戳記）作為主要識別，解決同用戶多筆申請的問題
- **狀態管理**：透過 Google Sheets 的「狀態」欄位追蹤處理進度
- **呼叫方式**：`UrlFetchApp.fetch()` 發送 HTTP POST 請求到 Cloud Run
- **錯誤處理**：Cloud Run 呼叫失敗時降級到手動處理模式

**Google Drive 資料夾配置**：
- **Word 模板檔案 ID**：`1OyDVT24n5INLcymXWBpDFHlKBbV_QZQE` (申請表模板.docx)
- **PDF 模板檔案 ID**：`19rgpiPJPrf_ZWDTBa-wn3ipnS1QXdlVg` (申請表模板.pdf)
- **模板資料夾 ID**：`1mceVVtspzw9ZnP1094FC30fj0H3fFPAq` (申請文件/模板)
- **生成文件資料夾 ID**：`1gVbcQRru4gBlhIyawELVnYmaDwqLNtGd` (申請文件/生成文件)

**檔案命名規則**：
- **Word 複製檔名**：`申請表_YYYY年MM月_YYYYMMDD-HHmmss_待處理.docx`（如：申請表_2025年10月_20250912-022107_待處理.docx）
- **PDF 檔名**：`申請表_YYYY年MM月_YYYYMMDD-HHmmss.pdf`（如：申請表_2025年10月_20250912-022107.pdf）
- **時間戳記**：使用 `YYYYMMDD-HHmmss` 格式，避免測試期間產生重複檔名
- **參考 GAS**：採用與影片檔案相同的時間戳記格式
- **存放位置**：生成文件資料夾
- **檔案保留**：保留可編輯的 Word 檔案，方便人工檢查和修改

**GAS 複製 + Cloud Run 編輯方案（最終版）**：
1. **GAS 階段**：
   - 申請確認後，複製 Word 模板和 PDF 模板到生成文件資料夾
   - **方案 B 命名策略**：複製時就改名為最終檔案名稱
   - Word 檔名：`申請表_YYYY年MM月_YYYYMMDD-HHmmss_待處理.docx`
   - PDF 檔名：`申請表_YYYY年MM月_YYYYMMDD-HHmmss.pdf`
   - 傳送複製檔案的 ID 和 PDF 檔案 ID 給 Cloud Run
2. **Cloud Run 階段**：
   - 接收複製檔案 ID，直接編輯已存在的 Word 檔案
   - 執行文字替換（URL、日期）
   - 轉換為 PDF
   - **覆蓋已存在的 PDF 檔案**（保持檔案名稱不變）
   - 更新 Google Sheets 狀態
3. **技術優勢**：
   - **完全避免 Service Account 儲存配額限制**（Word 和 PDF 都不建立新檔案）
   - **檔案名稱一致性**：GAS 階段確定名稱，Cloud Run 無需處理命名邏輯
   - **保留中間檔案**：Word 檔案供人工檢查，PDF 檔案供正式使用
   - **權限需求簡單**：只需編輯者權限
   - **每個申請獨立檔案**：便於追蹤和管理

#### 5.4.1 重要問題解決記錄

**時間戳記識別方案**（2025年9月11日解決）：
- **問題**：同一 LINE 用戶多次申請時，使用 `userId` 無法區分不同申請記錄
- **現象**：Cloud Run 找不到正確的待處理記錄，導致狀態更新失敗
- **解決方案**：改用 `timestamp`（申請時間戳記）作為唯一識別
- **技術實作**：
  - GAS 傳送申請時間戳記給 Cloud Run
  - Cloud Run 用時間戳記精確搜尋 Google Sheets 記錄
  - 保留 userId 傳送以維持向後相容性
- **優勢**：時間戳記天然唯一，避免記錄混淆，邏輯更簡潔

**Sheets 寫入範圍修正**：
- **問題**：寫入範圍 `I2:K2` 但嘗試寫入到 L 欄位，且遺漏處理完成時間
- **解決**：調整寫入範圍為 `G2:K2`，正確對應狀態、錯誤訊息、PDF路徑、處理開始時間、處理完成時間欄位

**時間戳記格式統一**（2025年9月11日解決）：
- **問題**：GAS 產生 `2025/9/11 上午 7:24:49` 格式，Cloud Run 期待 `2025-09-10 23:18:00` 格式
- **解決方案**：統一使用 `YYYY/M/D H:m:s` 格式（24小時制，不補零）
- **技術實作**：
  - GAS：改用手動格式化時間戳記，避免本地化差異，不補零符合 Sheets 自然顯示
  - Cloud Run：使用相同的不補零格式 `f"{year}/{month}/{day} {hour}:{minute}:{second}"`
- **優勢**：消除時區、本地化、12/24小時制、補零差異的所有格式問題

**時間戳記補零問題**（2025年9月12日解決）：
- **問題**：GAS 產生補零格式 `2025/09/12 01:03:07`，但 Sheets 顯示不補零 `2025/9/12 1:3:7`
- **解決方案**：統一使用不補零格式，符合 Google Sheets 自然顯示習慣

**GAS-Cloud Run 資料格式不匹配問題**（2025年9月12日解決）：
- **問題**：手動測試成功，但 LINE 申請失敗
  - 測試函數使用：`{timestamp, user_id, application_data}`
  - 實際函數使用：`{userId, applicationData, timestamp: ISO格式}`
- **根本原因**：`callCloudRunForDocumentProcessing()` 函數的資料格式與 Cloud Run API 期待不一致
- **解決方案**：
  1. 修改 `callCloudRunForDocumentProcessing()` 直接使用預先準備的 `cloudRunData`
  2. 確保資料格式與測試函數一致：`user_id`, `application_data`, `timestamp`（Sheets 格式）
- **技術細節**：`executeFinalApplication()` 中已正確準備 `cloudRunData` 格式，函數只需直接使用

**PDF 內容空白問題**（2025年9月12日解決）：
- **問題**：PDF 生成成功但內容（URL、日期）變成空白，手動測試正常但實際 LINE 申請失敗
- **根本原因**：`prepareApplicationData()` 產生的資料結構與 Cloud Run 期待不匹配
  - 欄位名稱：`selectedDates` vs `selected_dates`、`videoUrl` vs `video_url`
  - 缺少 `timestamp` 欄位
- **Cloud Run 日誌證實**：`替換資料: {'<url>': '', '<date1>': '', '<date2>': '', '<date3>': ''}`
- **解決方案**：
  1. 修正 `prepareApplicationData()` 欄位名稱：`selected_dates`, `video_url`
  2. 加入統一時間戳記生成：`timestamp`
  3. 修正 `recordApplicationToSheets()` 對應欄位名稱
  4. 移除重複的時間戳記生成邏輯

**時間戳記格式最終統一**（2025年9月12日解決）：
- **問題**：`YYYY/M/D H:m:s` 格式仍有補零不一致問題（`2:21:7` vs `2:21:07`）
- **最終解決方案**：統一改為 `YYYYMMDD-HHmmss` 格式
  - **優勢**：固定位數、無特殊字元、排序友好、檔名友好
  - **範例**：`20250912-022107`
- **修改範圍**：
  - GAS `prepareApplicationData()`：時間戳記生成
  - Cloud Run `update_sheets_status()`：搜尋和回填時間戳記
- **部署**：Cloud Run 記憶體提升至 1GB，避免記憶體超限
- **影響欄位**：年/月/日 時:分:秒 所有時間欄位
- **優勢**：完全消除補零差異，確保 GAS 生成與 Sheets 顯示一致

#### 5.5 階段完成定義

**Phase 5 的「完成」標準**：
- ✅ Word 模板填寫完成（url, date1-3 正確替換）
- ✅ PDF 轉換成功（LibreOffice headless 轉換）
- ✅ PDF 上傳到 Google Drive 成功
- ✅ PDF 連結寫入 Google Sheets 的「PDF路徑」欄位
- ✅ 狀態更新為「完成」（Phase 5 層級的完成）

**Phase 6 的「完成」標準**：
- ✅ Playwright 網站提交成功
- ✅ 真正的申請完成（最終完成）

**重要說明**：
- **Phase 5 完成** = 文件處理完成，可供人工下載使用
- **Phase 6 完成** = 整個申請流程完成，真正提交到松菸網站

#### 5.6 階段測試里程碑 ✅ **已完成**
- [x] ✅ Cloud Run 服務能正常部署和運行
- [x] ✅ Service Account 權限設定成功，能存取 Google Drive
- [x] ✅ Word 模板能正確填寫（url, date1-3）和轉換 PDF
- [x] ✅ 與 GAS 通信正常，狀態更新成功
- [x] ✅ 完整文件處理流程測試通過

#### 🎯 Phase 5 實際產出 ✅ **已完成**
**程式碼檔案**：
- 4個新增 Cloud Run 檔案（main.py, config.py, requirements.txt, Dockerfile）✅
- 本地開發和測試環境設定 ✅

**功能實現**：
- 完整的 Word → PDF 文件處理流程 ✅
- Google Drive 檔案下載和上傳功能 ✅
- 與 GAS 的 HTTP API 通信 ✅
- Google Sheets 狀態更新機制 ✅
- Service Account 權限管理 ✅

**基礎設施**：
- Google Cloud Run 服務部署 ✅
- Service Account 和權限設定 ✅
- 環境變數和機密管理 ✅
- 基本監控和日誌記錄 ✅

**測試驗證**：
- 文件處理功能完整測試 ✅
- API 通信穩定性驗證 ✅
- 錯誤處理機制驗證 ✅
- 為 Phase 6 網站自動化做準備 ✅

**重要成就**：
- 解決了多個技術難題：時間戳記格式統一、資料格式匹配、PDF 內容填寫
- 實現了完整的自動化流程：LINE 申請 → GAS 處理 → Cloud Run 文件生成 → Sheets 狀態更新
- 建立了穩定的服務架構，為 Phase 6 奠定了堅實基礎

### Phase 6: 網站自動化與整合測試 (2-3週)

#### 📋 Phase 6 範疇定義
**Phase 6 專注於**：
- **網站自動化**：松菸網站申請流程自動化
- **端到端整合**：完整申請流程串接
- **用戶測試**：實際使用驗證和優化
- **上線準備**：生產環境部署

#### 6.1 網站自動化（Playwright）
- [ ] 分析松菸網站申請表單結構
- [ ] 實現表單自動填寫功能
- [ ] 實現雙檔案上傳（申請PDF+街頭藝人證照）
- [ ] 建立提交確認和結果驗證
- [ ] 實現重試機制（失敗時重試3次，間隔30秒）

#### 6.2 端到端整合測試
- [ ] 完整申請流程串接（LINE對話→文件處理→網站提交）
- [ ] 錯誤處理和通知機制完善
- [ ] 超時處理機制（5分鐘超時）
- [ ] 人工處理流程（失敗時通知+PDF下載）

#### 6.3 用戶體驗測試和優化
- [ ] 媽媽實際使用測試（語音輸入）
- [ ] 語音錯誤修正準確度測試
- [ ] 申請流程完整性測試
- [ ] 家人協助功能測試

#### 6.4 監控系統和上線準備
- [ ] 建立系統運行監控和日誌
- [ ] 設定 API 使用量警報
- [ ] 建立申請成功率統計
- [ ] 生產環境最終部署
- [ ] 用戶操作手冊和緊急處理流程

---

## 🔧 API設置指南

### LINE Messaging API 設置
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立新的 Provider（如果還沒有）
3. 建立新的 Messaging API Channel
4. 記錄以下資訊：
   - Channel Secret
   - Channel Access Token
5. 設定 Webhook URL（指向 Google Apps Script）

### OpenAI API 設置
1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 建立 API Key
3. 設定使用限制（建議每月30美元）
4. 記錄 API Key

### Google APIs 設置
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用以下 APIs：
   - Google Sheets API
   - Google Drive API
4. 建立 Service Account
5. 下載 credentials.json

---

## 🚨 常見問題排解

### LINE Bot 無法接收訊息
1. 檢查 Webhook URL 是否正確
2. 確認 GAS 專案已部署為網頁應用程式
3. 檢查權限設定是否允許匿名存取

### OpenAI API 調用失敗
1. 檢查 API Key 是否正確
2. 確認帳戶餘額是否足夠
3. 檢查請求格式是否正確

### Google APIs 認證失敗
1. 確認 Service Account 金鑰檔案正確
2. 檢查 API 是否已啟用
3. 確認權限設定正確

---

## 🚀 部署指南

### Google Apps Script 部署
1. 開啟 Google Apps Script 專案
2. 點擊「部署」→「新增部署作業」
3. 選擇「網頁應用程式」
4. 設定執行身分和存取權限
5. 複製網頁應用程式 URL 作為 LINE Webhook URL

### Google Cloud Run 部署
1. 建立 Dockerfile
2. 建置 Docker 映像檔
3. 推送到 Google Container Registry
4. 部署到 Cloud Run
5. 設定環境變數和權限

---

**最後更新**: 2025年9月12日  
**版本**: v5.0 - Phase 5 完成
