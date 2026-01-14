#!/usr/bin/env python3
"""
街頭藝人申請系統 - 網站結構分析工具
Phase 6: 階段1 - 網站結構分析（一次性使用）

此工具用於分析松菸網站的表單結構，找出所有必要的選擇器(selectors)
執行方式：python analyze_website.py

功能說明：
- 自動瀏覽松菸文化園區的徵件活動頁面
- 尋找「街頭藝人」相關的申請連結
- 分析申請表單的所有欄位（姓名、手機、信箱、檔案上傳等）
- 識別 reCAPTCHA 和同意條款等特殊元素
- 輸出完整的選擇器配置，供後續自動化流程使用
"""

import asyncio
from playwright.async_api import async_playwright
import json

class WebsiteAnalyzer:
    """
    松菸網站結構分析器
    
    此類別負責自動化分析松菸文化園區網站的結構，包括：
    - 徵件活動列表頁面的連結定位
    - 申請表單頁面的所有欄位識別
    - 選擇器(selector)的自動發現與記錄
    """
    
    def __init__(self):
        """
        初始化分析器
        
        注意：直接使用配置值，避免依賴 config.py，因為這是獨立的一次性分析工具
        """
        self.base_url = "https://www.songshanculturalpark.org/solicitation"
        self.keyword = "街頭藝人"
        self.selectors = {}  # 儲存所有發現的選擇器
        
    async def analyze_website(self):
        """
        分析網站結構的主要函數
        
        執行流程：
        1. 啟動瀏覽器（有頭模式，方便觀察分析過程）
        2. 分析第一頁：尋找街頭藝人申請連結
        3. 分析第二頁：識別表單所有欄位
        4. 輸出分析結果到 JSON 檔案
        
        Raises:
            Exception: 當分析過程中發生任何錯誤時拋出
        """
        print("🔍 開始分析松菸網站結構...")
        print(f"📍 基礎網址: {self.base_url}")
        print(f"🔎 關鍵字: {self.keyword}")
        print("-" * 50)
        
        async with async_playwright() as p:
            # 使用有頭模式啟動瀏覽器，方便開發者觀察分析過程
            # 注意：生產環境可改為 headless=True 以提升效能
            browser = await p.chromium.launch(headless=False)
            print("✅ 成功啟動 Chromium（有頭模式）")
            
            page = await browser.new_page()
            
            try:
                # 步驟1：分析第一頁（徵件活動列表頁）
                await self._analyze_first_page(page)
                
                # 步驟2：分析第二頁（申請表單頁）
                await self._analyze_form_page(page)
                
                # 步驟3：輸出分析結果
                self._output_results()
                
            except Exception as e:
                print(f"❌ 分析過程發生錯誤: {str(e)}")
                raise
            finally:
                # 確保瀏覽器資源被正確釋放
                await browser.close()
    
    async def _analyze_first_page(self, page):
        """
        分析第一頁：找到街頭藝人申請連結
        
        此方法會：
        1. 訪問徵件活動列表頁面
        2. 尋找包含「街頭藝人」關鍵字的元素
        3. 從這些元素中找出可點擊的申請連結
        4. 使用精確匹配規則確認正確的連結（必須同時包含「街頭藝人」和「申請」相關文字）
        5. 如果找不到直接連結，則嘗試透過「我要申請」按鈕尋找
        
        Args:
            page: Playwright 的頁面物件
            
        Raises:
            Exception: 當找不到街頭藝人申請連結時拋出
        """
        print("📄 步驟1：分析第一頁（徵件活動列表）")
        
        # 訪問徵件活動列表頁面
        await page.goto(self.base_url)
        print(f"✅ 成功訪問: {self.base_url}")
        
        # 等待頁面完全載入（包括所有網路請求完成）
        # networkidle 狀態表示至少 500ms 內沒有網路活動
        await page.wait_for_load_state('networkidle')
        
        # 尋找包含「街頭藝人」關鍵字的連結
        print(f"🔍 尋找包含「{self.keyword}」的連結...")
        
        # 使用 XPath 尋找所有包含關鍵字的文字元素
        # XPath 語法：//*[contains(text(), '街頭藝人')] 表示尋找任何包含該文字的節點
        street_artist_elements = await page.locator(f"xpath=//*[contains(text(), '{self.keyword}')]").all()
        
        if not street_artist_elements:
            raise Exception(f"❌ 第一頁找不到包含「{self.keyword}」的元素")
        
        print(f"✅ 找到 {len(street_artist_elements)} 個包含「{self.keyword}」的元素")
        
        # 從找到的元素中，尋找可點擊的連結
        # 需要更精確的匹配，避免誤選其他相關連結
        application_link = None
        for i, element in enumerate(street_artist_elements):
            # 檢查元素本身或其父元素是否為連結（<a> 標籤）
            # ancestor-or-self::a 會向上查找最近的 <a> 標籤
            parent_link = element.locator('xpath=ancestor-or-self::a').first
            if await parent_link.count() > 0:
                link_text = await element.text_content()
                link_href = await parent_link.get_attribute('href')
                print(f"📝 找到連結文字 {i+1}: {link_text.strip()}")
                print(f"🔗 連結網址: {link_href}")
                
                # 精確匹配規則：必須同時包含「街頭藝人」和「申請」相關文字
                # 這樣可以排除其他不相關的連結（例如：街頭藝人介紹頁面）
                has_street_artist = "街頭藝人" in link_text
                has_application = "展演申請" in link_text or "申請" in link_text
                
                print(f"🔍 連結 {i+1} 匹配檢查:")
                print(f"   包含「街頭藝人」: {has_street_artist}")
                print(f"   包含「申請」相關: {has_application}")
                
                if has_street_artist and has_application:
                    print(f"✅ 確認為街頭藝人申請連結（正面匹配成功）")
                    application_link = link_href
                    await parent_link.click()
                    break
                else:
                    print(f"⚠️ 跳過：不符合街頭藝人申請條件")
                    continue
        
        if not application_link:
            # 備用方案：如果找不到直接包含關鍵字的連結，嘗試透過「我要申請」按鈕尋找
            # 因為有些網站設計會將申請連結放在按鈕中，而不是文字連結
            print("🔍 透過「我要申請」按鈕尋找街頭藝人申請...")
            apply_buttons = await page.locator("xpath=//*[contains(text(), '我要申請')]").all()
            
            for i, button in enumerate(apply_buttons):
                # 檢查按鈕是否為連結或包含在連結中
                parent_link = button.locator('xpath=ancestor-or-self::a').first
                if await parent_link.count() > 0:
                    link_href = await parent_link.get_attribute('href')
                    print(f"📝 分析「我要申請」按鈕 {i+1}")
                    print(f"🔗 按鈕連結: {link_href}")
                    
                    # 分析按鈕所屬的整個內容區塊
                    # 因為按鈕文字只有「我要申請」，無法判斷是哪個活動的申請
                    # 需要向上找到包含完整活動資訊的父容器（例如：卡片、項目區塊）
                    # 優先尋找常見的容器類別名稱
                    container = button.locator('xpath=ancestor::*[contains(@class, "item") or contains(@class, "card") or contains(@class, "content")]').first
                    if await container.count() == 0:
                        # 如果沒有找到特定容器，向上找最近的 div 區塊（最多向上 3 層）
                        # 這是一個備用策略，用於處理沒有明確類別名稱的結構
                        container = button.locator('xpath=ancestor::div[position()<=3]').last
                    
                    if await container.count() > 0:
                        container_text = await container.text_content()
                        print(f"📄 按鈕 {i+1} 完整內容區塊:")
                        print(f"   {container_text.strip()[:200]}...")
                        
                        # 在整個內容區塊中檢查是否包含「街頭藝人」和「申請」相關文字
                        # 這樣可以確認這個「我要申請」按鈕確實是街頭藝人申請的按鈕
                        has_street_artist = "街頭藝人" in container_text
                        has_application = "展演申請" in container_text or "申請" in container_text
                        
                        print(f"🔍 按鈕 {i+1} 匹配檢查:")
                        print(f"   包含「街頭藝人」: {has_street_artist}")
                        print(f"   包含「申請」相關: {has_application}")
                        
                        if has_street_artist and has_application:
                            print(f"✅ 確認為街頭藝人申請按鈕（正面匹配成功）")
                            application_link = link_href
                            await parent_link.click()
                            break
                        else:
                            print(f"⚠️ 跳過：不符合街頭藝人申請條件")
                            continue
                    else:
                        print(f"⚠️ 無法取得按鈕 {i+1} 的內容區塊")
                        continue
        
        if not application_link:
            raise Exception("❌ 找不到街頭藝人申請的可點擊連結")
        
        # 儲存第一頁的選擇器資訊，供後續自動化流程使用
        self.selectors['first_page'] = {
            'street_artist_text_selector': f"xpath=//*[contains(text(), '{self.keyword}')]",  # 尋找包含關鍵字的元素
            'apply_button_selector': "xpath=//*[contains(text(), '我要申請')]",  # 備用的「我要申請」按鈕選擇器
            'found_link': application_link  # 實際找到的申請連結網址
        }
        
        print("✅ 第一頁分析完成")
        print("-" * 30)
    
    async def _analyze_form_page(self, page):
        """
        分析第二頁：申請表單頁面
        
        此方法會：
        1. 導航到申請表單頁面
        2. 識別所有表單欄位（姓名、手機、信箱、檔案上傳等）
        3. 尋找特殊元素（reCAPTCHA、同意條款、提交按鈕）
        4. 記錄所有欄位的選擇器
        
        Args:
            page: Playwright 的頁面物件
        """
        print("📄 步驟2：分析第二頁（申請表單）")
        
        # 從第一頁的分析結果中取得申請連結
        application_link = self.selectors['first_page']['found_link']
        
        # 處理相對路徑：如果連結是相對路徑（以 / 開頭），需要加上基礎網域
        # 如果是絕對路徑（包含 http:// 或 https://），則直接使用
        if application_link.startswith('/'):
            full_url = "https://www.songshanculturalpark.org" + application_link
        else:
            full_url = application_link
            
        print(f"📍 前往申請頁面: {full_url}")
        await page.goto(full_url)
        # 等待頁面完全載入
        await page.wait_for_load_state('networkidle')
        
        # 儲存所有表單欄位的選擇器
        form_selectors = {}
        
        # 1. 姓名欄位
        # 策略：尋找所有文字輸入欄位，檢查 placeholder 或 name 屬性是否包含「姓名」或「name」
        print("🔍 尋找姓名輸入欄位...")
        name_inputs = await page.locator('input[type="text"]').all()
        for i, input_elem in enumerate(name_inputs):
            placeholder = await input_elem.get_attribute('placeholder') or ""
            name_attr = await input_elem.get_attribute('name') or ""
            # 同時檢查中文和英文標識，提高相容性
            if "姓名" in placeholder or "name" in name_attr.lower():
                # 使用 placeholder 屬性選擇器，因為這是最常見的標識方式
                form_selectors['name_input'] = f'input[placeholder*="姓名"]'
                print(f"✅ 找到姓名欄位: {form_selectors['name_input']}")
                break
        
        # 2. 手機欄位
        # 策略：同樣檢查 placeholder 或 name 屬性是否包含「手機」或「phone」
        print("🔍 尋找手機輸入欄位...")
        for i, input_elem in enumerate(name_inputs):
            placeholder = await input_elem.get_attribute('placeholder') or ""
            name_attr = await input_elem.get_attribute('name') or ""
            if "手機" in placeholder or "phone" in name_attr.lower():
                form_selectors['phone_input'] = f'input[placeholder*="手機"]'
                print(f"✅ 找到手機欄位: {form_selectors['phone_input']}")
                break
        
        # 3. 信箱欄位
        # 策略：優先尋找 type="email" 的輸入欄位（HTML5 標準）
        # 如果沒有，則備用方案是尋找包含「信箱」或「email」的文字輸入欄位
        print("🔍 尋找信箱輸入欄位...")
        email_inputs = await page.locator('input[type="email"]').all()
        if email_inputs:
            # 如果有多個 email 欄位，使用第一個（通常表單只有一個信箱欄位）
            form_selectors['email_input'] = 'input[type="email"]'
            print(f"✅ 找到信箱欄位: {form_selectors['email_input']}")
        else:
            # 備用方案：有些舊版網站可能使用 type="text" 搭配 placeholder 標識
            for i, input_elem in enumerate(name_inputs):
                placeholder = await input_elem.get_attribute('placeholder') or ""
                name_attr = await input_elem.get_attribute('name') or ""
                if "信箱" in placeholder or "email" in name_attr.lower():
                    form_selectors['email_input'] = f'input[placeholder*="信箱"]'
                    print(f"✅ 找到信箱欄位: {form_selectors['email_input']}")
                    break
        
        # 4. 檔案上傳欄位
        # 策略：尋找所有 type="file" 的輸入欄位
        # 通常申請表單會有兩個上傳欄位：申請PDF 和 街頭藝人證照
        print("🔍 尋找檔案上傳欄位...")
        file_inputs = await page.locator('input[type="file"]').all()
        
        if len(file_inputs) >= 2:
            # 根據常見的表單設計，第一個通常是申請PDF，第二個是證照
            # 使用 :nth-of-type() 選擇器來區分不同的上傳欄位
            form_selectors['pdf_upload'] = f'input[type="file"]:nth-of-type(1)'
            form_selectors['certificate_upload'] = f'input[type="file"]:nth-of-type(2)'
            print(f"✅ 找到PDF上傳欄位: {form_selectors['pdf_upload']}")
            print(f"✅ 找到證照上傳欄位: {form_selectors['certificate_upload']}")
        else:
            # 如果只有一個或數量不符合預期，記錄所有找到的上傳欄位
            print(f"⚠️ 只找到 {len(file_inputs)} 個檔案上傳欄位")
            for i, file_input in enumerate(file_inputs):
                form_selectors[f'file_upload_{i+1}'] = f'input[type="file"]:nth-of-type({i+1})'
        
        # 5. reCAPTCHA（Google 驗證碼）
        # 策略：reCAPTCHA 通常嵌入在 iframe 中，src 屬性會包含 "recaptcha" 字串
        print("🔍 尋找 reCAPTCHA...")
        recaptcha_frame = page.locator('iframe[src*="recaptcha"]').first
        if await recaptcha_frame.count() > 0:
            # 記錄 iframe 選擇器和內部的 checkbox 選擇器
            # 注意：實際操作時需要先切換到 iframe 內部才能點擊 checkbox
            form_selectors['recaptcha_frame'] = 'iframe[src*="recaptcha"]'
            form_selectors['recaptcha_checkbox'] = '.recaptcha-checkbox-border'
            print(f"✅ 找到 reCAPTCHA: {form_selectors['recaptcha_frame']}")
        else:
            print("⚠️ 未找到 reCAPTCHA iframe")
        
        # 6. 同意條款 checkbox
        # 策略：尋找所有 checkbox，檢查其父元素的文字內容是否包含「同意」或「閱讀」
        # 因為 checkbox 本身通常沒有文字，文字標籤通常在父元素或兄弟元素中
        print("🔍 尋找同意條款...")
        checkboxes = await page.locator('input[type="checkbox"]').all()
        for i, checkbox in enumerate(checkboxes):
            # 取得父元素的文字內容（通常是 <label> 或包含文字的容器）
            # xpath=.. 表示父節點
            parent = checkbox.locator('xpath=..').first
            parent_text = await parent.text_content() or ""
            # 檢查是否包含同意相關的關鍵字
            if "同意" in parent_text or "閱讀" in parent_text:
                form_selectors['agreement_checkbox'] = f'input[type="checkbox"]:nth-of-type({i+1})'
                print(f"✅ 找到同意條款: {form_selectors['agreement_checkbox']}")
                print(f"📝 條款文字: {parent_text.strip()[:50]}...")
                break
        
        # 7. 提交按鈕
        # 策略：尋找包含「確認」或「送出」文字的按鈕，或 type="submit" 的輸入元素
        # 使用多個選擇器組合，提高找到按鈕的成功率
        print("🔍 尋找提交按鈕...")
        submit_buttons = await page.locator('button:has-text("確認"), input[type="submit"], button:has-text("送出")').all()
        if submit_buttons:
            # 取得第一個提交按鈕的文字，根據文字內容選擇最適合的選擇器
            button_text = await submit_buttons[0].text_content() or ""
            if "確認" in button_text:
                form_selectors['submit_button'] = 'button:has-text("確認")'
            elif "送出" in button_text:
                form_selectors['submit_button'] = 'button:has-text("送出")'
            else:
                # 如果按鈕文字不符合預期，使用通用的 submit 選擇器
                form_selectors['submit_button'] = 'input[type="submit"]'
            print(f"✅ 找到提交按鈕: {form_selectors['submit_button']}")
            print(f"📝 按鈕文字: {button_text.strip()}")
        
        # 將所有表單欄位的選擇器儲存到類別屬性中
        self.selectors['form_page'] = form_selectors
        
        print("✅ 第二頁分析完成")
        print("-" * 30)
    
    def _output_results(self):
        """
        輸出分析結果
        
        此方法會：
        1. 在終端機顯示所有找到的選擇器
        2. 提供建議的 config.py 設定格式
        3. 將完整結果保存到 JSON 檔案，供後續使用
        """
        print("📊 網站結構分析結果")
        print("=" * 50)
        
        # 顯示第一頁（徵件活動列表）的分析結果
        print("\n🌐 第一頁（徵件活動列表）:")
        for key, value in self.selectors['first_page'].items():
            print(f"  {key}: {value}")
        
        # 顯示第二頁（申請表單）的分析結果
        print("\n📝 第二頁（申請表單）:")
        for key, value in self.selectors['form_page'].items():
            print(f"  {key}: {value}")
        
        # 提供可直接複製到 config.py 的設定格式
        print("\n💾 建議加入 config.py 的設定:")
        print("-" * 30)
        print("FORM_SELECTORS = {")
        for key, value in self.selectors['form_page'].items():
            print(f'    "{key}": "{value}",')
        print("}")
        
        # 將完整分析結果保存到 JSON 檔案
        # 使用 UTF-8 編碼和 ensure_ascii=False 以正確顯示中文字元
        with open('website_analysis_result.json', 'w', encoding='utf-8') as f:
            json.dump(self.selectors, f, indent=2, ensure_ascii=False)
        print(f"\n✅ 完整分析結果已保存到: website_analysis_result.json")

async def main():
    """
    主要執行函數
    
    此函數是程式的入口點，負責：
    1. 建立 WebsiteAnalyzer 實例
    2. 執行網站結構分析
    3. 處理錯誤並返回適當的退出碼
    
    Returns:
        int: 0 表示成功，1 表示失敗
    """
    try:
        analyzer = WebsiteAnalyzer()
        await analyzer.analyze_website()
        print("\n🎉 網站結構分析完成！")
    except Exception as e:
        print(f"\n❌ 分析失敗: {str(e)}")
        return 1
    return 0

if __name__ == "__main__":
    # 使用 asyncio.run() 執行異步主函數
    # 這會建立事件迴圈、執行 main()，並在完成後關閉事件迴圈
    exit_code = asyncio.run(main())
    exit(exit_code)
