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
├── Code.js                 # Code.gs 備份 [Phase 1]
├── LineHandler.js          # LineHandler.gs 備份 [Phase 1]
├── Config.js               # Config.gs 備份（與GAS相同，透過git ignore保護）[Phase 1]
├── Config.js.example       # 設定檔範例（可進git）[Phase 1]
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
- `code/gas/Code.js` - 與GAS相同
- `code/gas/LineHandler.js` - 與GAS相同
- `code/gas/Config.js` - 與GAS相同（透過git ignore保護）
- `code/gas/Config.js.example` - 設定檔範例（可進git）

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
- [x] ✅ 群組成員都能看到Bot互動（群組測試待完成）
- [x] ✅ 基本錯誤處理（訊息格式錯誤等）
- [x] ✅ 日誌正確記錄所有互動
- [x] ✅ PropertiesService正確存取API Keys

#### 🎯 Phase 1 預期產出
**程式碼檔案**：
- 3個GAS檔案（Code.gs, LineHandler.gs, Config.gs）
- 本地備份的3個.js檔案（Code.js, LineHandler.js, Config.js）

**Config.js 用途說明**：
- 存放非敏感設定：系統常數、錯誤訊息模板、業務邏輯設定
- 提供取得敏感資訊的方法：透過 PropertiesService 存取 API Keys
- 敏感資訊（API Keys）存放在 GAS PropertiesService，不在程式碼中

**設定檔案**：
- LINE Bot設定資訊記錄
- GAS部署資訊記錄

**測試結果**：
- 完整的測試記錄和問題解決方案

### Phase 2: AI語意解析整合 (1-2週)
#### 2.1 OpenAI API整合
- [ ] 申請OpenAI API金鑰並設定額度控制
- [ ] 在GAS中實現API調用邏輯
- [ ] 實現語音錯誤修正功能

#### 2.2 核心指令處理
- [ ] 實現「申請」指令識別（含語音錯誤）
- [ ] 建立信心度評分和確認機制
- [ ] 實現意圖識別（申請、確認、修改）
- [ ] 建立降級機制（關鍵字備案）

#### 2.3 階段測試里程碑
- [ ] ✅ 正確識別「申請」指令（包含「藥申請」等錯誤）
- [ ] ✅ 信心度低時能要求用戶澄清
- [ ] ✅ API失敗時能降級到關鍵字匹配

### Phase 3: 時間和日期邏輯 (1週)
#### 3.1 時間窗口管理
- [ ] 實現申請期間檢查（1-15日規則）
- [ ] 建立月份推算邏輯（當前月+1或+2）
- [ ] 實現申請關閉期提醒功能

#### 3.2 日期計算系統
- [ ] 建立週六週日日期計算函數
- [ ] 實現預設3個週六邏輯（媽媽偏好）
- [ ] 支援自訂日期選擇（含週日）
- [ ] AI日期選擇解析（「第一個週六」等自然語言）

#### 3.3 階段測試里程碑
- [ ] ✅ 不同日期的申請期間判斷準確
- [ ] ✅ 日期計算結果正確
- [ ] ✅ 自然語言日期選擇解析正確

### Phase 4: Google服務整合 (2週)
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

**最後更新**: 2024年1月  
**版本**: v1.0
