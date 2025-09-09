# 街頭藝人申請系統開發指南

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

#### 📁 GAS專案檔案結構
```
街頭藝人申請系統 (GAS專案)
├── Code.gs                 # 主要邏輯和 Webhook 處理 [Phase 1]
├── LineHandler.gs          # LINE API 相關函數 [Phase 1]
├── Config.gs               # 設定和常數 [Phase 1]
├── OpenAIHandler.gs        # OpenAI API 處理 [Phase 2]
├── DateUtils.gs            # 日期計算工具 [Phase 3]
├── SheetsHandler.gs        # Google Sheets 操作 [Phase 4]
└── DriveHandler.gs         # Google Drive 操作 [Phase 4]
```

#### 📁 本地備份檔案結構
```
code/gas/
├── Code.js                 # Code.gs 備份 [Phase 1] ✅
├── LineHandler.js          # LineHandler.gs 備份 [Phase 1] ✅
├── Config.js               # Config.gs 備份（與GAS相同，透過git ignore保護）[Phase 1] ✅
├── OpenAIHandler.js        # OpenAIHandler.gs 備份 [Phase 2]
├── DateUtils.js            # DateUtils.gs 備份 [Phase 3]
├── SheetsHandler.js        # SheetsHandler.gs 備份 [Phase 4]
└── DriveHandler.js         # DriveHandler.gs 備份 [Phase 4]
```

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

### Phase 4: Google服務整合 (2週)

#### 📋 Phase 4 範疇定義
**Phase 4 專注於**：
- **資料持久化**：使用 Google Sheets 記錄申請
- **檔案管理**：使用 Google Drive 存放文件
- **狀態追蹤**：申請進度管理
- **用戶資料**：記錄用戶偏好和歷史
#### 4.1 Google Sheets資料管理
- [ ] 建立申請記錄表格結構
- [ ] 實現Sheets API讀寫功能
- [ ] 建立狀態管理機制（待處理→處理中→完成/失敗）
- [ ] 實現用戶ID和名稱記錄

#### 4.2 Google Drive檔案系統
- [ ] 建立完整資料夾結構（證照/影片/申請文件）
- [ ] 實現檔案上傳下載功能
- [ ] 設定檔案權限（有連結者可檢視）
- [ ] 實現影片上傳處理（常用影片+新上傳）

#### 4.3 階段測試里程碑
- [ ] ✅ 申請記錄能正確寫入Sheets
- [ ] ✅ 影片檔案能成功上傳到Drive
- [ ] ✅ 狀態更新機制運作正常

### Phase 5: 文件處理和網站自動化 (2-3週)

#### 📋 Phase 5 範疇定義
**Phase 5 專注於**：
- **自動化申請**：完成實際的網站申請流程
- **文件生成**：自動填寫申請表
- **檔案上傳**：處理證照和申請文件
- **結果通知**：申請結果回報
#### 5.1 Google Cloud Run環境
- [ ] 建立Python專案和Dockerfile
- [ ] 部署基本HTTP服務
- [ ] 設定與GAS的API通信
- [ ] 建立處理狀態回報機制

#### 5.2 文件處理系統
- [ ] 實現Word模板下載和填寫
- [ ] 建立PDF轉換功能（LibreOffice headless）
- [ ] 實現檔案命名規則（申請表_YYYY年MM月.pdf）
- [ ] 整合個人資料、日期、影片連結

#### 5.3 網站自動化（Playwright）
- [ ] 分析松菸網站申請表單結構
- [ ] 實現表單自動填寫
- [ ] 實現雙檔案上傳（申請PDF+街頭藝人證照）
- [ ] 建立提交確認和結果驗證
- [ ] 實現重試機制（失敗時重試3次，間隔30秒）

#### 5.4 階段測試里程碑
- [ ] ✅ PDF文件能正確生成
- [ ] ✅ 網站能成功自動填寫和提交
- [ ] ✅ 雙檔案上傳功能正常

### Phase 6: 完整整合和用戶測試 (1-2週)

#### 📋 Phase 6 範疇定義
**Phase 6 專注於**：
- **端到端測試**：完整流程驗證
- **用戶體驗優化**：根據實際使用調整
- **錯誤處理完善**：處理各種異常情況
- **上線準備**：生產環境部署
#### 6.1 端到端整合
- [ ] 完整申請流程串接（從LINE對話到網站提交）
- [ ] 錯誤處理和通知機制
- [ ] 超時處理機制（5分鐘超時）
- [ ] 人工處理流程（失敗時通知+PDF下載）

#### 6.2 用戶體驗測試
- [ ] 媽媽實際使用測試（語音輸入）
- [ ] 語音錯誤修正準確度測試
- [ ] 申請流程完整性測試
- [ ] 家人協助功能測試

#### 6.3 監控和日誌系統
- [ ] 建立系統運行監控
- [ ] 設定API使用量警報
- [ ] 完善錯誤日誌記錄
- [ ] 建立申請成功率統計

#### 6.4 上線準備
- [ ] 生產環境最終部署
- [ ] 用戶操作手冊準備
- [ ] 緊急處理流程文檔
- [ ] 備援方案設置

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

**最後更新**: 2025年9月  
**版本**: v3.0 - Phase 3 完成
