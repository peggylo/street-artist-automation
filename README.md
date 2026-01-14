# 場地申請自動化系統

為視障使用者開發的自動化系統，透過 LINE Bot 簡化每月場地申請流程。

---

## 🎯 當前方案

**iOS Shortcut + Safari Bookmarklet 半自動化**

使用者透過 LINE 發起申請 → 系統生成 PDF → 一鍵下載 → 書籤自動填表 → VoiceOver 輔助完成

**詳細說明**：📱 [iOS Shortcut 解決方案](docs/ios-shortcut-solution.md)

---

## 🏗️ 系統架構

```
LINE Bot (GAS)
    ↓
OpenAI API 語意解析
    ↓
Cloud Run (Python)
    ↓
Word → PDF 自動生成
    ↓ [上傳到 Google Drive 雲端]
iOS Shortcut 下載檔案
    ↓
Safari Bookmarklet 自動填表
    ↓
使用者完成申請
```


---

## 📚 文件導覽

### 核心文件
- 📋 [產品需求文件 (PRD)](docs/PRD.md) - 完整需求規格
- 🛠️ [開發指南](docs/development-guide.md) - Phase 1-6 開發歷程
- 📱 [iOS Shortcut 解決方案](docs/ios-shortcut-solution.md) - **當前方案**（階段 7 優化中）

### 技術探索
- 🔐 [reCAPTCHA 解決方案](docs/recaptcha-solution.md) - Vision API 方案（已放棄）
- 🎙️ [VoiceOver 問題分析](docs/voiceover-issue-analysis.md) - 無障礙優化
- 🤖 [GPT-4.1 應用](docs/GPT-4.1.md) - AI 語意解析

---

## 🚀 技術棧

| 層級 | 技術 | 用途 |
|------|------|------|
| **前端互動** | LINE Messaging API | 使用者介面 |
| **AI 語意** | OpenAI GPT-4o-mini | 語音輸入處理 |
| **Bot 邏輯** | Google Apps Script | LINE Bot 處理 |
| **文件處理** | Cloud Run (Python) | Word → PDF 轉換 |
| **資料存儲** | Google Drive + Sheets | 檔案和記錄管理 |
| **半自動化** | iOS Shortcut + Bookmarklet | 檔案下載與表單填寫 |

---

## 📂 專案結構

**GitHub 專案內容**（可 clone）：

```
venue-application/
├── README.md           # 專案說明（本檔案）
├── docs/              # 完整文件（PRD、開發指南、技術探索）
│   ├── PRD.md
│   ├── development-guide.md
│   ├── ios-shortcut-solution.md
│   ├── recaptcha-solution.md
│   ├── voiceover-issue-analysis.md
│   └── GPT-4.1.md
└── code/
    ├── gas/           # LINE Bot (Google Apps Script)
    ├── cloud-run/     # PDF 生成服務 (Python + Cloud Run)
    │   └── archive/   # Phase 6 未使用檔案（技術參考）
    ├── shortcut/      # iOS Shortcut 實作
    └── bookmarklet/   # Safari 書籤自動填表
```

**系統運作時的雲端資料**（存於 Google Drive，不在 Git 中）：

- 📄 生成的申請 PDF（Cloud Run → Google Drive API）
- 🎥 上傳的影片檔案（LINE Bot → Google Drive API）
- 📋 申請記錄（Google Sheets API）
- 🎫 申請相關證照（Google Drive）

💡 **所有資料檔案透過 Google Drive API 直接存取雲端，系統本身無狀態。**

---

## 🔄 開發歷程

### Phase 1-4：LINE Bot 基礎 ✅
- LINE Bot + OpenAI 語意解析
- 對話狀態管理
- Google Sheets 記錄

### Phase 5：文件處理系統 ✅
- Cloud Run Python 服務
- Word 模板填寫
- PDF 自動生成

### Phase 6：網站自動化探索 ⚠️
- Playwright 自動化（已停用）
- reCAPTCHA Vision API（已放棄）
- **改採 iOS Shortcut 半自動化方案**

### Phase 7：使用者優化 🔄（當前）
- 簡化 LINE 互動流程
- VoiceOver 語音優化
- 使用者體驗改進

---

## 💡 核心特色

### 1. AI 智能語意解析
- 自動修正語音輸入錯誤
- 理解自然語言指令
- 信心度評分機制

### 2. 無障礙設計
- VoiceOver 完整支援
- 簡化操作流程
- 語音提示友善

### 3. 自動化 + 半自動化混合
- 文件自動生成（Cloud Run）
- 表單半自動填寫（Bookmarklet）
- 人機協作最佳化

---

## 📈 成功指標

- ✅ 申請時間：< 5 分鐘
- ✅ 成功率：> 90%
- ✅ AI 理解準確率：> 95%
- ✅ 獨立完成率：> 90%

---

**專案狀態**：✅ Phase 7 優化中（當前方案穩定運作）  
**最後更新**：2025-11-28

---
---

# Venue Application Automation System

An automation system developed for visually impaired users to simplify the monthly venue application process through a LINE Bot.

---

## 🎯 Current Solution

**iOS Shortcut + Safari Bookmarklet Semi-Automation**

User initiates via LINE → System generates PDF → One-tap download → Bookmarklet auto-fills form → VoiceOver assists completion

**Details**: 📱 [iOS Shortcut Solution](docs/ios-shortcut-solution.md)

---

## 🏗️ System Architecture

```
LINE Bot (GAS)
    ↓
OpenAI API Semantic Parsing
    ↓
Cloud Run (Python)
    ↓
Word → PDF Generation
    ↓ [Upload to Google Drive Cloud]
iOS Shortcut File Download
    ↓
Safari Bookmarklet Auto-Fill
    ↓
User Completes Application
```


---

## 📚 Documentation

### Core Documents
- 📋 [Product Requirements (PRD)](docs/PRD.md) - Complete specifications
- 🛠️ [Development Guide](docs/development-guide.md) - Phase 1-6 development journey
- 📱 [iOS Shortcut Solution](docs/ios-shortcut-solution.md) - **Current Solution** (Phase 7 optimization)

### Technical Exploration
- 🔐 [reCAPTCHA Solution](docs/recaptcha-solution.md) - Vision API approach (abandoned)
- 🎙️ [VoiceOver Issue Analysis](docs/voiceover-issue-analysis.md) - Accessibility optimization
- 🤖 [GPT-4.1 Application](docs/GPT-4.1.md) - AI semantic parsing

---

## 🚀 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **User Interface** | LINE Messaging API | User interaction |
| **AI Semantics** | OpenAI GPT-4o-mini | Voice input processing |
| **Bot Logic** | Google Apps Script | LINE Bot handler |
| **Document Processing** | Cloud Run (Python) | Word → PDF conversion |
| **Data Storage** | Google Drive + Sheets | File and record management |
| **Semi-Automation** | iOS Shortcut + Bookmarklet | File download & form filling |

---

## 📂 Project Structure

**GitHub Repository**（cloneable）：

```
venue-application/
├── README.md           # Project documentation (this file)
├── docs/              # Complete documentation (PRD, guides, technical exploration)
│   ├── PRD.md
│   ├── development-guide.md
│   ├── ios-shortcut-solution.md
│   ├── recaptcha-solution.md
│   ├── voiceover-issue-analysis.md
│   └── GPT-4.1.md
└── code/
    ├── gas/           # LINE Bot (Google Apps Script)
    ├── cloud-run/     # PDF generation service (Python + Cloud Run)
    │   └── archive/   # Phase 6 unused files (technical reference)
    ├── shortcut/      # iOS Shortcut implementation
    └── bookmarklet/   # Safari bookmarklet auto-fill
```

**Cloud Data at Runtime**（stored in Google Drive, not in Git）：

- 📄 Generated application PDFs (Cloud Run → Google Drive API)
- 🎥 Uploaded video files (LINE Bot → Google Drive API)
- 📋 Application records (Google Sheets API)
- 🎫 Application certificates (Google Drive)

💡 **All data files are accessed directly from the cloud via Google Drive API. The system is stateless.**

---

## 🔄 Development Journey

### Phase 1-4: LINE Bot Foundation ✅
- LINE Bot + OpenAI semantic parsing
- Conversation state management
- Google Sheets logging

### Phase 5: Document Processing System ✅
- Cloud Run Python service
- Word template filling
- PDF auto-generation

### Phase 6: Web Automation Exploration ⚠️
- Playwright automation (deprecated)
- reCAPTCHA Vision API (abandoned)
- **Adopted iOS Shortcut semi-automation solution**

### Phase 7: User Experience Optimization 🔄 (Current)
- Simplified LINE interaction flow
- VoiceOver voice optimization
- User experience improvements

---

## 💡 Key Features

### 1. AI Intelligent Semantic Parsing
- Auto-correct voice input errors
- Understand natural language commands
- Confidence scoring mechanism

### 2. Accessibility Design
- Full VoiceOver support
- Simplified operation flow
- Voice-friendly prompts

### 3. Automation + Semi-Automation Hybrid
- Document auto-generation (Cloud Run)
- Form semi-auto filling (Bookmarklet)
- Optimized human-machine collaboration

---

## 📈 Success Metrics

- ✅ Application time: < 5 minutes
- ✅ Success rate: > 90%
- ✅ AI comprehension accuracy: > 95%
- ✅ Independent completion rate: > 90%

---

**Project Status**: ✅ Phase 7 optimization in progress (current solution stable)  
**Last Updated**: 2025-11-28

