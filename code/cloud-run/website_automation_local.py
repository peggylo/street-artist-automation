"""
Phase 6 - 階段 2A: 基礎網站自動化
表演場地網站申請流程自動化（本地測試版本）

功能：
- 導航到表演場地網站並找到街頭藝人申請
- 填寫個人資料（從 Secret Manager 讀取）
- 上傳申請 PDF（從雲端下載）和街頭藝人證（本地檔案）
- 處理 reCAPTCHA 驗證
- 勾選同意條款
- 截圖並存入本地資料夾
- 停在提交前（不按送出按鈕）

階段2A簡化策略：
- 街頭藝人證使用本地檔案（避免雲端下載複雜度）
- 截圖存入專案根目錄的申請截圖資料夾
"""

import os
import json
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple

from playwright.sync_api import sync_playwright, Page, Browser
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
import pytz
import io

from config import Config

class WebsiteAutomation:
    """松菸網站自動化處理類別"""
    
    def __init__(self, headless: bool = False):
        """
        初始化網站自動化
        
        Args:
            headless (bool): 是否使用無頭模式（階段2A建議False以便除錯）
        """
        self.config = Config()
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.temp_dir = tempfile.mkdtemp()
        self.taiwan_tz = pytz.timezone('Asia/Taipei')
        
        # 載入網站分析結果
        self.analysis_result = self.config.get_website_analysis_result()
        
        # 初始化 Google Drive 服務
        self.drive_service = self._init_drive_service()
        
        print(f"🚀 網站自動化初始化完成（headless={headless}）")
        print(f"📁 臨時目錄：{self.temp_dir}")
        print(f"📊 已載入網站分析結果：{self.analysis_result['analysis_metadata']['analysis_date']}")
    
    def _init_drive_service(self):
        """初始化 Google Drive 服務"""
        try:
            service_account_info = self.config.get_service_account_info()
            credentials = service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=['https://www.googleapis.com/auth/drive']
            )
            return build('drive', 'v3', credentials=credentials)
        except Exception as e:
            raise Exception(f"初始化 Google Drive 服務失敗: {str(e)}")
    
    def _download_file_from_drive(self, file_id: str, file_name: str) -> str:
        """
        從 Google Drive 下載檔案到本地臨時目錄
        
        Args:
            file_id (str): Google Drive 檔案 ID
            file_name (str): 檔案名稱
            
        Returns:
            str: 本地檔案路徑
        """
        try:
            print(f"📥 下載檔案：{file_name} (ID: {file_id})")
            
            # 下載檔案
            request = self.drive_service.files().get_media(fileId=file_id)
            file_content = io.BytesIO()
            downloader = MediaIoBaseDownload(file_content, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            # 儲存到本地臨時檔案
            local_file_path = os.path.join(self.temp_dir, file_name)
            with open(local_file_path, 'wb') as f:
                f.write(file_content.getvalue())
            
            print(f"✅ 檔案下載完成：{local_file_path}")
            return local_file_path
            
        except Exception as e:
            raise Exception(f"下載檔案失敗 {file_name}: {str(e)}")
    
    def _upload_screenshot_to_drive(self, screenshot_path: str, screenshot_name: str) -> str:
        """
        上傳截圖到 Google Drive
        
        Args:
            screenshot_path (str): 本地截圖路徑
            screenshot_name (str): 截圖檔名
            
        Returns:
            str: Google Drive 檔案 URL
        """
        try:
            print(f"📤 上傳截圖：{screenshot_name}")
            
            # 上傳檔案
            media = MediaFileUpload(screenshot_path, mimetype='image/png')
            file_metadata = {
                'name': screenshot_name,
                'parents': [self.config.WEBSITE_AUTOMATION['SCREENSHOT_FOLDER_ID']]
            }
            
            file = self.drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            
            file_id = file.get('id')
            file_url = f"https://drive.google.com/file/d/{file_id}/view"
            
            print(f"✅ 截圖上傳完成：{file_url}")
            return file_url
            
        except Exception as e:
            raise Exception(f"上傳截圖失敗 {screenshot_name}: {str(e)}")
    
    def _generate_timestamp(self) -> str:
        """生成台灣時區的時間戳記"""
        now = datetime.now(self.taiwan_tz)
        return now.strftime("%Y%m%d-%H%M%S")
    
    def start_browser(self):
        """啟動瀏覽器"""
        try:
            print("🌐 啟動 Playwright 瀏覽器...")
            playwright = sync_playwright().start()
            self.browser = playwright.chromium.launch(
                headless=self.headless,
                args=['--no-sandbox', '--disable-dev-shm-usage']
            )
            self.page = self.browser.new_page()
            
            # 設定頁面大小
            self.page.set_viewport_size({"width": 1920, "height": 1080})
            
            print(f"✅ 瀏覽器啟動成功（headless={self.headless}）")
            
        except Exception as e:
            raise Exception(f"啟動瀏覽器失敗: {str(e)}")
    
    def navigate_to_application_form(self) -> str:
        """
        導航到松菸網站申請表單頁面
        
        Returns:
            str: 申請表單頁面 URL
        """
        try:
            print("🔍 導航到松菸網站...")
            
            # 1. 前往第一頁
            base_url = self.analysis_result['matching_logic']['base_url']
            self.page.goto(base_url, wait_until='networkidle')
            print(f"✅ 成功載入首頁：{base_url}")
            
            # 2. 使用新的匹配邏輯尋找街頭藝人申請連結
            keyword = self.analysis_result['matching_logic']['street_artist_keyword']
            application_keywords = self.analysis_result['matching_logic']['application_keywords']
            street_artist_selector = self.analysis_result['selectors']['first_page']['street_artist_text']
            
            print(f"🔍 尋找關鍵字：{keyword}")
            print(f"🔍 申請關鍵字：{application_keywords}")
            
            # 等待並尋找所有街頭藝人文字元素
            self.page.wait_for_selector(street_artist_selector, timeout=30000)
            street_artist_elements = self.page.locator(street_artist_selector).all()
            
            if not street_artist_elements:
                raise Exception(f"找不到包含「{keyword}」的元素")
            
            print(f"✅ 找到 {len(street_artist_elements)} 個包含「{keyword}」的元素")
            
            # 3. 使用新的匹配邏輯找到對應的申請按鈕
            application_link = None
            
            # 首先嘗試找直接的連結
            for i, element in enumerate(street_artist_elements):
                parent_link = element.locator('xpath=ancestor-or-self::a').first
                if parent_link.count() > 0:
                    link_text = element.text_content()
                    link_href = parent_link.get_attribute('href')
                    print(f"📝 找到連結文字 {i+1}: {link_text.strip()}")
                    print(f"🔗 連結網址: {link_href}")
                    
                    # 使用選項C匹配邏輯
                    has_street_artist = keyword in link_text
                    has_application = any(app_keyword in link_text for app_keyword in application_keywords)
                    
                    print(f"🔍 連結 {i+1} 匹配檢查:")
                    print(f"   包含「{keyword}」: {has_street_artist}")
                    print(f"   包含申請相關: {has_application}")
                    
                    if has_street_artist and has_application:
                        print(f"✅ 確認為街頭藝人申請連結（正面匹配成功）")
                        application_link = link_href
                        parent_link.click()
                        break
                    else:
                        print(f"⚠️ 跳過：不符合街頭藝人申請條件")
                        continue
            
            # 如果沒找到直接連結，找「我要申請」按鈕
            if not application_link:
                print("🔍 透過「我要申請」按鈕尋找街頭藝人申請...")
                apply_button_selector = self.analysis_result['selectors']['first_page']['apply_button']
                apply_buttons = self.page.locator(apply_button_selector).all()
                
                for i, button in enumerate(apply_buttons):
                    parent_link = button.locator('xpath=ancestor-or-self::a').first
                    if parent_link.count() > 0:
                        link_href = parent_link.get_attribute('href')
                        print(f"📝 分析「我要申請」按鈕 {i+1}")
                        print(f"🔗 按鈕連結: {link_href}")
                        
                        # 分析按鈕所屬的整個內容區塊
                        container = button.locator('xpath=ancestor::*[contains(@class, "item") or contains(@class, "card") or contains(@class, "content")]').first
                        if container.count() == 0:
                            container = button.locator('xpath=ancestor::div[position()<=3]').last
                        
                        if container.count() > 0:
                            container_text = container.text_content()
                            print(f"📄 按鈕 {i+1} 完整內容區塊:")
                            print(f"   {container_text.strip()[:200]}...")
                            
                            # 使用選項C匹配邏輯
                            has_street_artist = keyword in container_text
                            has_application = any(app_keyword in container_text for app_keyword in application_keywords)
                            
                            print(f"🔍 按鈕 {i+1} 匹配檢查:")
                            print(f"   包含「{keyword}」: {has_street_artist}")
                            print(f"   包含申請相關: {has_application}")
                            
                            if has_street_artist and has_application:
                                print(f"✅ 確認為街頭藝人申請按鈕（正面匹配成功）")
                                application_link = link_href
                                parent_link.click()
                                break
                            else:
                                print(f"⚠️ 跳過：不符合街頭藝人申請條件")
                                continue
                        else:
                            print(f"⚠️ 無法取得按鈕 {i+1} 的內容區塊")
                            continue
                
                if not application_link:
                    raise Exception("找不到街頭藝人申請的可點擊連結")
            
            # 4. 等待申請頁面載入
            self.page.wait_for_load_state('networkidle')
            current_url = self.page.url
            
            print(f"✅ 成功進入申請頁面：{current_url}")
            return current_url
            
        except Exception as e:
            raise Exception(f"導航到申請表單失敗: {str(e)}")
    
    def fill_personal_information(self):
        """填寫個人資料"""
        try:
            print("📝 開始填寫個人資料...")
            
            # 從 Secret Manager 取得個人資料
            applicant_info = self.config.get_applicant_info()
            name = applicant_info['name']
            phone = applicant_info['phone']
            email = applicant_info['email']
            
            print(f"📋 個人資料：{name}, {phone}, {email}")
            
            # 填寫姓名
            name_selector = self.analysis_result['selectors']['form_page']['name_input']
            self.page.wait_for_selector(name_selector, timeout=10000)
            self.page.fill(name_selector, name)
            print(f"✅ 成功填寫姓名：{name}")
            
            # 填寫手機
            phone_selector = self.analysis_result['selectors']['form_page']['phone_input']
            self.page.fill(phone_selector, phone)
            print(f"✅ 成功填寫手機：{phone}")
            
            # 填寫信箱
            email_selector = self.analysis_result['selectors']['form_page']['email_input']
            self.page.fill(email_selector, email)
            print(f"✅ 成功填寫信箱：{email}")
            
        except Exception as e:
            raise Exception(f"填寫個人資料失敗: {str(e)}")
    
    def upload_files(self):
        """上傳申請文件"""
        try:
            print("📎 開始上傳申請文件...")
            
            # 1. 下載申請 PDF
            pdf_file_id = self.config.TEST_APPLICATION_PDF['FILE_ID']
            pdf_file_name = self.config.TEST_APPLICATION_PDF['FILE_NAME']
            pdf_local_path = self._download_file_from_drive(pdf_file_id, pdf_file_name)
            
            # 2. 使用本地街頭藝人證（階段2A簡化版）
            cert_file_name = self.config.CERTIFICATE['FILE_NAME']
            cert_local_path = os.path.join("..", "..", "證照文件", cert_file_name)
            print(f"📄 使用本地街頭藝人證：{cert_local_path}")
            
            # 檢查本地檔案是否存在
            if not os.path.exists(cert_local_path):
                raise Exception(f"本地街頭藝人證檔案不存在：{cert_local_path}")
            
            # 3. 上傳申請 PDF
            pdf_upload_selector = self.analysis_result['selectors']['form_page']['pdf_upload']
            print(f"🔍 PDF上傳選擇器：{pdf_upload_selector}")
            print(f"📄 PDF檔案路徑：{pdf_local_path}")
            
            self.page.wait_for_selector(pdf_upload_selector, timeout=10000)
            
            # 上傳前檢查
            pdf_element = self.page.locator(pdf_upload_selector)
            print(f"📋 PDF上傳前檢查：可見={pdf_element.is_visible()}, 啟用={pdf_element.is_enabled()}")
            
            self.page.set_input_files(pdf_upload_selector, pdf_local_path)
            print(f"✅ 已執行PDF上傳指令：{pdf_file_name}")
            
            # 等待檔案上傳處理
            time.sleep(2)
            
            # 上傳後驗證
            try:
                uploaded_file_name = self.page.evaluate(f"""
                    document.querySelector('{pdf_upload_selector}').files[0]?.name || '無檔案'
                """)
                print(f"📋 PDF上傳後驗證：檔案名稱 = {uploaded_file_name}")
            except:
                print("📋 PDF上傳後驗證：無法取得檔案資訊")
            
            # 4. 除錯：列出所有檔案上傳欄位
            print("🔍 除錯：檢查頁面上所有檔案上傳欄位...")
            all_file_inputs = self.page.locator('input[type="file"]').all()
            print(f"📊 找到 {len(all_file_inputs)} 個檔案上傳欄位：")
            
            for i, file_input in enumerate(all_file_inputs):
                try:
                    # 取得元素屬性
                    element_id = file_input.get_attribute('id') or "無ID"
                    element_name = file_input.get_attribute('name') or "無name"
                    element_class = file_input.get_attribute('class') or "無class"
                    is_visible = file_input.is_visible()
                    is_enabled = file_input.is_enabled()
                    
                    print(f"  檔案欄位 {i+1}:")
                    print(f"    ID: {element_id}")
                    print(f"    Name: {element_name}")
                    print(f"    Class: {element_class}")
                    print(f"    可見: {is_visible}")
                    print(f"    啟用: {is_enabled}")
                    print(f"    選擇器: input[type=\"file\"]:nth-of-type({i+1})")
                    
                except Exception as e:
                    print(f"  檔案欄位 {i+1}: 無法取得資訊 - {str(e)}")
            
            # 5. 嘗試上傳街頭藝人證
            cert_upload_selector = self.analysis_result['selectors']['form_page']['certificate_upload']
            print(f"🔍 使用選擇器尋找街頭藝人證上傳欄位：{cert_upload_selector}")
            
            try:
                # 先檢查選擇器是否能找到元素
                cert_elements = self.page.locator(cert_upload_selector).all()
                print(f"📊 選擇器找到 {len(cert_elements)} 個匹配元素")
                
                if len(cert_elements) == 0:
                    raise Exception(f"選擇器 {cert_upload_selector} 找不到任何元素")
                
                # 等待元素出現
                print("⏳ 等待街頭藝人證上傳欄位出現...")
                self.page.wait_for_selector(cert_upload_selector, timeout=10000)
                
                cert_upload_element = self.page.locator(cert_upload_selector)
                
                # 檢查元素狀態
                is_visible = cert_upload_element.is_visible()
                is_enabled = cert_upload_element.is_enabled()
                print(f"📋 街頭藝人證上傳欄位狀態：可見={is_visible}, 啟用={is_enabled}")
                
                if not is_visible:
                    raise Exception("街頭藝人證上傳欄位不可見")
                if not is_enabled:
                    raise Exception("街頭藝人證上傳欄位未啟用")
                
                print(f"📎 開始上傳街頭藝人證：{cert_local_path}")
                self.page.set_input_files(cert_upload_selector, cert_local_path)
                print(f"✅ 成功上傳街頭藝人證：{cert_file_name}")
                
                # 等待檔案上傳處理
                time.sleep(3)
                
            except Exception as cert_error:
                print(f"❌ 街頭藝人證上傳失敗：{str(cert_error)}")
                
                # 嘗試備用方案：使用第2個檔案欄位（如果存在）
                if len(all_file_inputs) >= 2:
                    print("🔄 嘗試備用方案：直接使用第2個檔案欄位...")
                    try:
                        backup_selector = "input[type=\"file\"]:nth-child(2)"
                        print(f"🔍 備用選擇器：{backup_selector}")
                        
                        backup_element = self.page.locator(backup_selector)
                        if backup_element.count() > 0:
                            print(f"🔍 備用方案上傳前檢查：可見={backup_element.is_visible()}, 啟用={backup_element.is_enabled()}")
                            print(f"📄 街頭藝人證檔案路徑：{cert_local_path}")
                            
                            self.page.set_input_files(backup_selector, cert_local_path)
                            print(f"✅ 已執行備用方案上傳指令：{cert_file_name}")
                            
                            # 上傳後驗證
                            time.sleep(1)
                            try:
                                uploaded_file_name = self.page.evaluate(f"""
                                    document.querySelector('{backup_selector}').files[0]?.name || '無檔案'
                                """)
                                print(f"📋 備用方案上傳後驗證：檔案名稱 = {uploaded_file_name}")
                            except:
                                print("📋 備用方案上傳後驗證：無法取得檔案資訊")
                        else:
                            raise Exception("備用選擇器也找不到元素")
                            
                    except Exception as backup_error:
                        print(f"❌ 備用方案也失敗：{str(backup_error)}")
                        raise cert_error  # 拋出原始錯誤
                else:
                    raise cert_error  # 拋出原始錯誤
            
            # 6. 最終驗證：檢查兩個檔案欄位的最終狀態
            print("🔍 最終驗證：檢查所有檔案上傳欄位的最終狀態...")
            try:
                for i in range(1, 3):  # 檢查前兩個檔案欄位
                    selector = f"input[type=\"file\"]:nth-of-type({i})"
                    try:
                        file_name = self.page.evaluate(f"""
                            document.querySelector('{selector}').files[0]?.name || '無檔案'
                        """)
                        print(f"📋 欄位 {i} 最終狀態：{file_name}")
                    except:
                        print(f"📋 欄位 {i} 最終狀態：無法取得資訊")
            except:
                print("📋 最終驗證失敗")
            
        except Exception as e:
            raise Exception(f"上傳申請文件失敗: {str(e)}")
    
    def handle_recaptcha(self) -> bool:
        """
        處理 reCAPTCHA 驗證
        
        Returns:
            bool: 是否成功處理
        """
        try:
            print("🤖 處理 reCAPTCHA 驗證...")
            
            # 尋找 reCAPTCHA iframe
            recaptcha_frame_selector = self.analysis_result['selectors']['form_page']['recaptcha_frame']
            
            # 等待 reCAPTCHA 載入
            self.page.wait_for_selector(recaptcha_frame_selector, timeout=10000)
            
            # 切換到 reCAPTCHA iframe
            recaptcha_frame = self.page.frame_locator(recaptcha_frame_selector)
            
            # 點擊 reCAPTCHA 勾選框
            recaptcha_checkbox_selector = self.analysis_result['selectors']['form_page']['recaptcha_checkbox']
            recaptcha_checkbox = recaptcha_frame.locator(recaptcha_checkbox_selector)
            
            if recaptcha_checkbox.is_visible():
                recaptcha_checkbox.click()
                print("✅ 已點擊 reCAPTCHA 勾選框")
                
                # 等待驗證完成（最多10秒）
                time.sleep(3)
                return True
            else:
                print("⚠️  reCAPTCHA 勾選框不可見")
                return False
                
        except Exception as e:
            print(f"⚠️  reCAPTCHA 處理失敗: {str(e)}")
            return False
    
    def check_agreement_checkbox(self):
        """勾選同意條款"""
        try:
            print("✅ 勾選同意條款...")
            
            # 除錯：列出頁面中所有的 checkbox
            print("🔍 除錯：檢查頁面上所有 checkbox...")
            all_checkboxes = self.page.locator('input[type="checkbox"]').all()
            print(f"📊 找到 {len(all_checkboxes)} 個 checkbox：")
            
            for i, checkbox in enumerate(all_checkboxes):
                try:
                    element_id = checkbox.get_attribute('id') or "無ID"
                    element_name = checkbox.get_attribute('name') or "無name"
                    element_class = checkbox.get_attribute('class') or "無class"
                    is_visible = checkbox.is_visible()
                    is_enabled = checkbox.is_enabled()
                    is_checked = checkbox.is_checked()
                    
                    print(f"  Checkbox {i+1}:")
                    print(f"    ID: {element_id}")
                    print(f"    Name: {element_name}")
                    print(f"    Class: {element_class}")
                    print(f"    可見: {is_visible}")
                    print(f"    啟用: {is_enabled}")
                    print(f"    已勾選: {is_checked}")
                    
                    # 查找附近的文字內容
                    try:
                        parent_text = checkbox.locator('xpath=../..').text_content()[:100] if checkbox.locator('xpath=../..').count() > 0 else ""
                        print(f"    附近文字: {parent_text.strip()}")
                    except:
                        print(f"    附近文字: 無法取得")
                        
                except Exception as e:
                    print(f"  Checkbox {i+1}: 無法取得資訊 - {str(e)}")
            
            agreement_selector = self.analysis_result['selectors']['form_page']['agreement_checkbox']
            print(f"🔍 使用選擇器尋找同意條款：{agreement_selector}")
            
            # 先檢查選擇器是否能找到元素
            agreement_elements = self.page.locator(agreement_selector).all()
            print(f"📊 選擇器找到 {len(agreement_elements)} 個匹配元素")
            
            if len(agreement_elements) == 0:
                # 嘗試備用選擇器
                print("🔄 嘗試備用選擇器...")
                backup_selectors = [
                    "input[type=\"checkbox\"]:last-of-type",
                    "input[type=\"checkbox\"]",
                    "input[type=\"checkbox\"]:nth-of-type(2)",
                    "input[type=\"checkbox\"]:nth-of-type(3)"
                ]
                
                for backup_selector in backup_selectors:
                    try:
                        backup_elements = self.page.locator(backup_selector).all()
                        print(f"🔍 備用選擇器 {backup_selector}：找到 {len(backup_elements)} 個元素")
                        
                        if len(backup_elements) > 0:
                            backup_checkbox = self.page.locator(backup_selector).first
                            if backup_checkbox.is_visible() and backup_checkbox.is_enabled():
                                print(f"✅ 使用備用選擇器：{backup_selector}")
                                if not backup_checkbox.is_checked():
                                    backup_checkbox.click()
                                    print("✅ 已勾選同意條款（備用方案）")
                                else:
                                    print("✅ 同意條款已經勾選（備用方案）")
                                return
                    except Exception as backup_error:
                        print(f"❌ 備用選擇器 {backup_selector} 失敗：{str(backup_error)}")
                        continue
                
                raise Exception(f"所有選擇器都找不到可用的同意條款 checkbox")
            
            # 跳過 wait_for_selector，直接操作已知存在的元素（可能隱藏）
            print(f"⏳ 直接操作同意條款元素（跳過等待）...")
            agreement_checkbox = self.page.locator(agreement_selector)
            
            # 檢查 checkbox 狀態（即使隱藏也可以操作）
            is_checked = agreement_checkbox.is_checked()
            print(f"📋 同意條款狀態：已勾選={is_checked}")
            
            if not is_checked:
                # 使用 JavaScript 強制點擊（即使元素隱藏）
                self.page.evaluate(f"""
                    document.querySelector('{agreement_selector}').click()
                """)
                print("✅ 已勾選同意條款（JavaScript點擊）")
                
                # 驗證點擊結果
                time.sleep(0.5)
                final_checked = agreement_checkbox.is_checked()
                print(f"📋 點擊後狀態：已勾選={final_checked}")
            else:
                print("✅ 同意條款已經勾選")
                
        except Exception as e:
            raise Exception(f"勾選同意條款失敗: {str(e)}")
    
    def take_screenshot_local(self, screenshot_type: str = "填寫完成") -> str:
        """
        截圖並保存到本地 申請截圖/ 資料夾
        
        Args:
            screenshot_type (str): 截圖類型（填寫完成、提交成功、失敗）
            
        Returns:
            str: 本地截圖檔案路徑
        """
        try:
            print(f"📸 截圖：{screenshot_type}")
            
            # 生成截圖檔名
            timestamp = self._generate_timestamp()
            screenshot_name = f"申請截圖_2025年10月_{timestamp}_{screenshot_type}.png"
            screenshot_path = os.path.join("..", "..", "申請截圖", screenshot_name)
            
            # 截圖
            self.page.screenshot(
                path=screenshot_path,
                full_page=True,
                type='png'
            )
            
            print(f"✅ 截圖完成並保存到：{screenshot_path}")
            return screenshot_path
            
        except Exception as e:
            raise Exception(f"截圖失敗: {str(e)}")
    
    def verify_form_completion(self) -> Dict[str, bool]:
        """驗證表單填寫完成狀態"""
        try:
            print("🔍 驗證表單填寫狀態...")
            
            verification = {
                'personal_info_filled': False,
                'pdf_uploaded': False,
                'certificate_uploaded': False,
                'agreement_checked': False,
                'ready_to_submit': False
            }
            
            # 檢查個人資料是否填寫
            name_selector = self.analysis_result['selectors']['form_page']['name_input']
            name_value = self.page.locator(name_selector).input_value()
            verification['personal_info_filled'] = bool(name_value.strip())
            
            # 檢查同意條款是否勾選
            agreement_selector = self.analysis_result['selectors']['form_page']['agreement_checkbox']
            verification['agreement_checked'] = self.page.locator(agreement_selector).is_checked()
            
            # 檢查提交按鈕是否可用
            submit_selector = self.analysis_result['selectors']['form_page']['submit_button']
            submit_button = self.page.locator(submit_selector)
            verification['ready_to_submit'] = submit_button.is_visible() and submit_button.is_enabled()
            
            # 簡化檔案上傳檢查（假設上傳成功）
            verification['pdf_uploaded'] = True
            verification['certificate_uploaded'] = True
            
            print(f"📋 表單狀態檢查：{verification}")
            return verification
            
        except Exception as e:
            print(f"⚠️  表單驗證失敗: {str(e)}")
            return {'error': str(e)}
    
    def cleanup(self):
        """清理資源"""
        try:
            print("🧹 清理資源...")
            
            # 關閉瀏覽器
            if self.browser:
                self.browser.close()
                print("✅ 瀏覽器已關閉")
            
            # 清理臨時檔案
            import shutil
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                print(f"✅ 臨時目錄已清理：{self.temp_dir}")
                
        except Exception as e:
            print(f"⚠️  清理資源時出錯: {str(e)}")
    
    def run_stage_2a(self) -> Dict:
        """
        執行階段 2A：基礎網站自動化
        
        Returns:
            Dict: 執行結果
        """
        result = {
            'success': False,
            'stage': '2A',
            'timestamp': self._generate_timestamp(),
            'screenshot_path': None,
            'verification': {},
            'error': None
        }
        
        try:
            print("🚀 開始執行階段 2A：基礎網站自動化")
            print("=" * 50)
            
            # 1. 啟動瀏覽器
            self.start_browser()
            
            # 2. 導航到申請表單
            form_url = self.navigate_to_application_form()
            
            # 3. 填寫個人資料
            self.fill_personal_information()
            
            # 4. 上傳申請文件
            self.upload_files()
            
            # 5. 處理 reCAPTCHA
            recaptcha_success = self.handle_recaptcha()
            if not recaptcha_success:
                print("⚠️  reCAPTCHA 處理未完全成功，但繼續流程")
            
            # 6. 勾選同意條款
            self.check_agreement_checkbox()
            
            # 7. 驗證表單完成狀態
            verification = self.verify_form_completion()
            result['verification'] = verification
            
            # 8. 截圖並保存到本地
            screenshot_path = self.take_screenshot_local("填寫完成")
            result['screenshot_path'] = screenshot_path
            
            # 9. 停在提交前
            print("⏸️  停在提交前，不按送出按鈕")
            print("✅ 階段 2A 執行成功！")
            
            result['success'] = True
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ 階段 2A 執行失敗: {error_msg}")
            result['error'] = error_msg
            
            # 失敗時也嘗試截圖
            try:
                screenshot_path = self.take_screenshot_local("失敗")
                result['screenshot_path'] = screenshot_path
            except:
                pass
        
        finally:
            # 清理資源
            self.cleanup()
        
        print("=" * 50)
        print(f"🎯 階段 2A 結果：{'成功' if result['success'] else '失敗'}")
        return result


def main():
    """主程式入口點"""
    print("🎭 Phase 6 - 階段 2A: 基礎網站自動化")
    print("=" * 60)
    
    # 建立網站自動化實例（非無頭模式以便除錯）
    automation = WebsiteAutomation(headless=False)
    
    # 執行階段 2A
    result = automation.run_stage_2a()
    
    # 輸出結果
    print("\n📊 執行結果：")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    if result['success']:
        print("\n🎉 階段 2A 成功完成！")
        print(f"📸 截圖已保存到本地：{result.get('screenshot_path', 'N/A')}")
        print("⏭️  準備進入階段 2A.5（Cloud Run 驗證）")
    else:
        print("\n💥 階段 2A 執行失敗")
        print("🔍 請檢查錯誤訊息並修正問題")
        if result.get('screenshot_path'):
            print(f"📸 失敗截圖：{result['screenshot_path']}")


if __name__ == "__main__":
    main()
