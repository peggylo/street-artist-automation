# 街頭藝人申請系統 - Cloud Run Dockerfile
# Phase 6: 網站自動化系統（包含 Phase 5 文件處理）

# 使用官方 Playwright Python 映像檔作為基底
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

# 設定工作目錄
WORKDIR /app

# 安裝 LibreOffice（文件處理需求）
RUN apt-get update && apt-get install -y \
    libreoffice \
    fonts-noto-cjk \
    fonts-liberation \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 複製 requirements.txt 並安裝 Python 依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程式檔案
COPY . .

# 設定環境變數
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 暴露端口（Cloud Run 會自動設定 PORT 環境變數）
EXPOSE 8080

# 使用 gunicorn 啟動應用程式
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app