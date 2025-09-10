"""
街頭藝人申請系統 - Cloud Run 主程式
Phase 5: 文件處理系統

主要功能：
1. 接收來自 GAS 的申請資料
2. 下載 Word 模板並填寫
3. 轉換為 PDF
4. 上傳到 Google Drive
5. 更新 Google Sheets 狀態
"""

import os
import json
import logging
import tempfile
import subprocess
from datetime import datetime
from flask import Flask, request, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from docx import Document
import io

from config import config

# 設定日誌
logging.basicConfig(
    level=getattr(logging, config.LOGGING["LEVEL"]),
    format=config.LOGGING["FORMAT"]
)
logger = logging.getLogger(__name__)

# 初始化 Flask 應用
app = Flask(__name__)

class DocumentProcessor:
    """文件處理器"""
    
    def __init__(self):
        """初始化 Google API 客戶端"""
        try:
            # 取得服務帳戶憑證
            service_account_info = config.get_service_account_info()
            credentials = service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=[
                    'https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/spreadsheets'
                ]
            )
            
            # 初始化 API 客戶端
            self.drive_service = build('drive', 'v3', credentials=credentials)
            self.sheets_service = build('sheets', 'v4', credentials=credentials)
            
            logger.info("Google API 客戶端初始化成功")
            
        except Exception as e:
            logger.error(f"初始化 Google API 客戶端失敗: {str(e)}")
            raise
    
    def download_template(self, temp_dir):
        """
        從 Google Drive 下載 Word 模板
        
        Args:
            temp_dir (str): 臨時目錄路徑
            
        Returns:
            str: 下載的模板檔案路徑
        """
        try:
            logger.info("開始下載 Word 模板")
            
            # 搜尋模板檔案
            folder_id = config.GOOGLE_DRIVE["TEMPLATE_FOLDER_ID"]
            file_name = config.GOOGLE_DRIVE["TEMPLATE_FILE_NAME"]
            
            query = f"name='{file_name}' and parents in '{folder_id}'"
            results = self.drive_service.files().list(q=query).execute()
            files = results.get('files', [])
            
            if not files:
                raise Exception(f"找不到模板檔案: {file_name}")
            
            file_id = files[0]['id']
            logger.info(f"找到模板檔案: {file_id}")
            
            # 下載檔案
            request = self.drive_service.files().get_media(fileId=file_id)
            template_path = os.path.join(temp_dir, file_name)
            
            with open(template_path, 'wb') as f:
                downloader = MediaIoBaseDownload(f, request)
                done = False
                while done is False:
                    status, done = downloader.next_chunk()
            
            logger.info(f"模板下載完成: {template_path}")
            return template_path
            
        except Exception as e:
            logger.error(f"下載模板失敗: {str(e)}")
            raise
    
    def fill_template(self, template_path, application_data, output_path):
        """
        填寫 Word 模板
        
        Args:
            template_path (str): 模板檔案路徑
            application_data (dict): 申請資料
            output_path (str): 輸出檔案路徑
        """
        try:
            logger.info("開始填寫 Word 模板")
            
            # 開啟 Word 文件
            doc = Document(template_path)
            
            # 準備替換資料
            replacements = {
                config.TEMPLATE_PROCESSING["URL_PLACEHOLDER"]: application_data.get("video_url", ""),
            }
            
            # 處理日期替換
            dates = application_data.get("selected_dates", [])
            for i, placeholder in enumerate(config.TEMPLATE_PROCESSING["DATE_PLACEHOLDERS"]):
                if i < len(dates):
                    # 格式化日期為 YYYY/MM/DD 格式
                    date_obj = dates[i]
                    if isinstance(date_obj, dict):
                        # 如果是字典，提取 display 欄位
                        date_str = date_obj.get("display", "")
                    else:
                        # 如果是字串，直接使用
                        date_str = str(date_obj)
                    replacements[placeholder] = date_str
                else:
                    # 空白處理
                    replacements[placeholder] = ""
            
            logger.info(f"替換資料: {replacements}")
            
            # 執行文字替換
            for paragraph in doc.paragraphs:
                for placeholder, value in replacements.items():
                    if placeholder in paragraph.text:
                        paragraph.text = paragraph.text.replace(placeholder, value)
                        logger.info(f"替換 {placeholder} -> {value}")
            
            # 處理表格中的文字
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for placeholder, value in replacements.items():
                            if placeholder in cell.text:
                                cell.text = cell.text.replace(placeholder, value)
                                logger.info(f"表格中替換 {placeholder} -> {value}")
            
            # 儲存填寫後的文件
            doc.save(output_path)
            logger.info(f"Word 模板填寫完成: {output_path}")
            
        except Exception as e:
            logger.error(f"填寫模板失敗: {str(e)}")
            raise
    
    def convert_to_pdf(self, word_path, temp_dir):
        """
        使用 LibreOffice 將 Word 轉換為 PDF
        
        Args:
            word_path (str): Word 檔案路徑
            temp_dir (str): 臨時目錄路徑
            
        Returns:
            str: PDF 檔案路徑
        """
        try:
            logger.info("開始轉換 PDF")
            
            # 建構 LibreOffice 指令
            cmd = [
                config.LIBREOFFICE["COMMAND"],
                "--headless",
                "--convert-to", "pdf",
                "--outdir", temp_dir,
                word_path
            ]
            
            # 執行轉換
            result = subprocess.run(
                cmd,
                timeout=config.LIBREOFFICE["TIMEOUT_SECONDS"],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"LibreOffice 轉換失敗: {result.stderr}")
            
            # 找到生成的 PDF 檔案
            word_filename = os.path.basename(word_path)
            pdf_filename = os.path.splitext(word_filename)[0] + ".pdf"
            pdf_path = os.path.join(temp_dir, pdf_filename)
            
            if not os.path.exists(pdf_path):
                raise Exception(f"找不到轉換後的 PDF: {pdf_path}")
            
            logger.info(f"PDF 轉換完成: {pdf_path}")
            return pdf_path
            
        except Exception as e:
            logger.error(f"PDF 轉換失敗: {str(e)}")
            raise
    
    def upload_pdf(self, pdf_path, application_data):
        """
        上傳 PDF 到 Google Drive
        
        Args:
            pdf_path (str): PDF 檔案路徑
            application_data (dict): 申請資料
            
        Returns:
            str: 上傳後的檔案連結
        """
        try:
            logger.info("開始上傳 PDF 到 Google Drive")
            
            # 生成檔案名稱
            year = application_data.get("year")
            month = application_data.get("month")
            
            # 檢查必要參數
            if not year or not month:
                raise ValueError(f"缺少必要參數: year={year}, month={month}")
            
            filename = config.generate_pdf_filename(year, month)
            
            # 上傳檔案
            folder_id = config.GOOGLE_DRIVE["GENERATED_FOLDER_ID"]
            media = MediaFileUpload(pdf_path, mimetype='application/pdf')
            
            file_metadata = {
                'name': filename,
                'parents': [folder_id]
            }
            
            file = self.drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,webViewLink'
            ).execute()
            
            file_id = file.get('id')
            file_url = file.get('webViewLink')
            
            logger.info(f"PDF 上傳完成: {file_url}")
            return file_url
            
        except Exception as e:
            logger.error(f"PDF 上傳失敗: {str(e)}")
            raise
    
    def update_sheets_status(self, user_id, pdf_url, status="完成", error_message=""):
        """
        更新 Google Sheets 狀態
        
        Args:
            user_id (str): 用戶 ID
            pdf_url (str): PDF 檔案連結
            status (str): 狀態
            error_message (str): 錯誤訊息
        """
        try:
            logger.info(f"更新 Sheets 狀態: {status}")
            
            spreadsheet_id = config.GOOGLE_SHEETS["APPLICATION_RECORD_ID"]
            sheet_name = config.GOOGLE_SHEETS["SHEET_NAME"]
            
            # 讀取現有資料，找到對應的用戶記錄
            range_name = f"{sheet_name}!A:K"
            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            
            # 找到最新的待處理記錄
            target_row = None
            for i, row in enumerate(values):
                if len(row) > 1 and row[1] == user_id and len(row) > 6 and row[6] == "待處理":
                    target_row = i + 1  # Sheets 行號從 1 開始
                    break
            
            if not target_row:
                raise Exception(f"找不到用戶 {user_id} 的待處理記錄")
            
            # 更新狀態
            now = datetime.now().strftime('%Y/%m/%d %H:%M:%S')
            update_data = []
            
            if status == "完成":
                # 成功完成：更新 PDF路徑、狀態、處理完成時間
                update_data = [
                    [pdf_url, status, "", now]  # I, G, H, K 欄位
                ]
                update_range = f"{sheet_name}!I{target_row}:K{target_row}"
            else:
                # 處理失敗：更新狀態、錯誤訊息
                update_data = [
                    [status, error_message]  # G, H 欄位
                ]
                update_range = f"{sheet_name}!G{target_row}:H{target_row}"
            
            # 執行更新
            self.sheets_service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=update_range,
                valueInputOption='USER_ENTERED',
                body={'values': update_data}
            ).execute()
            
            logger.info(f"Sheets 狀態更新完成: 行 {target_row}")
            
        except Exception as e:
            logger.error(f"更新 Sheets 狀態失敗: {str(e)}")
            raise

# 全域文件處理器實例
doc_processor = DocumentProcessor()

@app.route('/health', methods=['GET'])
def health_check():
    """健康檢查端點"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "document-processor"
    })

@app.route('/process-application', methods=['POST'])
def process_application():
    """
    處理申請文件
    
    預期的 JSON 格式：
    {
        "user_id": "用戶ID",
        "year": "2024",
        "month": "10", 
        "selected_dates": ["2024/10/5", "2024/10/12", "2024/10/19"],
        "video_url": "https://drive.google.com/...",
        "video_source": "常用影片"
    }
    """
    try:
        # 解析請求資料
        application_data = request.get_json()
        if not application_data:
            return jsonify({"error": "缺少申請資料"}), 400
        
        user_id = application_data.get("user_id")
        if not user_id:
            return jsonify({"error": "缺少用戶ID"}), 400
        
        # 提取申請資料
        app_data = application_data.get("application_data")
        if not app_data:
            return jsonify({"error": "缺少申請資料"}), 400
        
        logger.info(f"開始處理申請: 用戶 {user_id}")
        logger.info(f"申請資料: {app_data}")
        
        # 建立臨時目錄
        with tempfile.TemporaryDirectory() as temp_dir:
            logger.info(f"使用臨時目錄: {temp_dir}")
            
            # 1. 下載模板
            template_path = doc_processor.download_template(temp_dir)
            
            # 2. 填寫模板
            filled_word_path = os.path.join(temp_dir, "filled_template.docx")
            doc_processor.fill_template(template_path, app_data, filled_word_path)
            
            # 3. 轉換為 PDF
            pdf_path = doc_processor.convert_to_pdf(filled_word_path, temp_dir)
            
            # 4. 上傳 PDF
            pdf_url = doc_processor.upload_pdf(pdf_path, app_data)
            
            # 5. 更新 Sheets 狀態
            doc_processor.update_sheets_status(user_id, pdf_url, "完成")
        
        logger.info(f"申請處理完成: 用戶 {user_id}")
        
        return jsonify({
            "success": True,
            "message": "申請文件處理完成",
            "pdf_url": pdf_url,
            "user_id": user_id
        })
        
    except Exception as e:
        logger.error(f"處理申請失敗: {str(e)}")
        
        # 更新失敗狀態
        try:
            user_id = application_data.get("user_id") if application_data else "unknown"
            doc_processor.update_sheets_status(user_id, "", "失敗", str(e))
        except:
            pass  # 避免二次錯誤
        
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    logger.info("啟動文件處理服務")
    app.run(host='0.0.0.0', port=config.HTTP["PORT"])
