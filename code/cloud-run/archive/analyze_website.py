#!/usr/bin/env python3
"""
街頭藝人申請系統 - 網站結構分析工具
Phase 6: 階段1 - 網站結構分析（一次性使用）

此工具用於分析松菸網站的表單結構，找出所有必要的選擇器(selectors)
執行方式：python analyze_website.py
"""

import asyncio
from playwright.async_api import async_playwright
import json

class WebsiteAnalyzer:
    """松菸網站結構分析器"""
    
    def __init__(self):
        # 直接使用配置值，避免依賴 config.py
        self.base_url = "https://www.songshanculturalpark.org/solicitation"
        self.keyword = "街頭藝人"
        self.selectors = {}
        
    async def analyze_website(self):
        """分析網站結構的主要函數"""
        print("🔍 開始分析松菸網站結構...")
        print(f"📍 基礎網址: {self.base_url}")
        print(f"🔎 關鍵字: {self.keyword}")
        print("-" * 50)
        
        async with async_playwright() as p:
            # 啟動瀏覽器（使用有頭模式以便觀察）
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
                await browser.close()
    
    async def _analyze_first_page(self, page):
        """分析第一頁：找到街頭藝人申請連結"""
        print("📄 步驟1：分析第一頁（徵件活動列表）")
        
        # 訪問第一頁
        await page.goto(self.base_url)
        print(f"✅ 成功訪問: {self.base_url}")
        
        # 等待頁面載入
        await page.wait_for_load_state('networkidle')
        
        # 尋找包含「街頭藝人」關鍵字的連結
        print(f"🔍 尋找包含「{self.keyword}」的連結...")
        
        # 方法1：尋找包含關鍵字的文字元素（使用 XPath）
        street_artist_elements = await page.locator(f"xpath=//*[contains(text(), '{self.keyword}')]").all()
        
        if not street_artist_elements:
            raise Exception(f"❌ 第一頁找不到包含「{self.keyword}」的元素")
        
        print(f"✅ 找到 {len(street_artist_elements)} 個包含「{self.keyword}」的元素")
        
        # 尋找可點擊的連結（需要更精確的匹配）
        application_link = None
        for i, element in enumerate(street_artist_elements):
            # 檢查是否為連結或包含連結
            parent_link = element.locator('xpath=ancestor-or-self::a').first
            if await parent_link.count() > 0:
                link_text = await element.text_content()
                link_href = await parent_link.get_attribute('href')
                print(f"📝 找到連結文字 {i+1}: {link_text.strip()}")
                print(f"🔗 連結網址: {link_href}")
                
                # 選項C：更精確匹配 - 包含「街頭藝人」和（「展演申請」或「申請」）
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
            # 嘗試找「我要申請」按鈕（分析每個按鈕對應的內容）
            print("🔍 透過「我要申請」按鈕尋找街頭藝人申請...")
            apply_buttons = await page.locator("xpath=//*[contains(text(), '我要申請')]").all()
            
            for i, button in enumerate(apply_buttons):
                parent_link = button.locator('xpath=ancestor-or-self::a').first
                if await parent_link.count() > 0:
                    link_href = await parent_link.get_attribute('href')
                    print(f"📝 分析「我要申請」按鈕 {i+1}")
                    print(f"🔗 按鈕連結: {link_href}")
                    
                    # 分析按鈕所屬的整個內容區塊
                    # 向上找到包含完整資訊的父容器
                    container = button.locator('xpath=ancestor::*[contains(@class, "item") or contains(@class, "card") or contains(@class, "content")]').first
                    if await container.count() == 0:
                        # 如果沒有找到特定容器，向上找較大的區塊
                        container = button.locator('xpath=ancestor::div[position()<=3]').last
                    
                    if await container.count() > 0:
                        container_text = await container.text_content()
                        print(f"📄 按鈕 {i+1} 完整內容區塊:")
                        print(f"   {container_text.strip()[:200]}...")
                        
                        # 選項C：更精確匹配 - 包含「街頭藝人」和（「展演申請」或「申請」）
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
        
        # 儲存第一頁的選擇器
        self.selectors['first_page'] = {
            'street_artist_text_selector': f"xpath=//*[contains(text(), '{self.keyword}')]",
            'apply_button_selector': "xpath=//*[contains(text(), '我要申請')]",
            'found_link': application_link
        }
        
        print("✅ 第一頁分析完成")
        print("-" * 30)
    
    async def _analyze_form_page(self, page):
        """分析第二頁：申請表單頁面"""
        print("📄 步驟2：分析第二頁（申請表單）")
        
        # 點擊進入申請頁面
        application_link = self.selectors['first_page']['found_link']
        
        # 處理相對路徑
        if application_link.startswith('/'):
            full_url = "https://www.songshanculturalpark.org" + application_link
        else:
            full_url = application_link
            
        print(f"📍 前往申請頁面: {full_url}")
        await page.goto(full_url)
        await page.wait_for_load_state('networkidle')
        
        # 分析表單欄位
        form_selectors = {}
        
        # 1. 姓名欄位
        print("🔍 尋找姓名輸入欄位...")
        name_inputs = await page.locator('input[type="text"]').all()
        for i, input_elem in enumerate(name_inputs):
            placeholder = await input_elem.get_attribute('placeholder') or ""
            name_attr = await input_elem.get_attribute('name') or ""
            if "姓名" in placeholder or "name" in name_attr.lower():
                form_selectors['name_input'] = f'input[placeholder*="姓名"]'
                print(f"✅ 找到姓名欄位: {form_selectors['name_input']}")
                break
        
        # 2. 手機欄位
        print("🔍 尋找手機輸入欄位...")
        for i, input_elem in enumerate(name_inputs):
            placeholder = await input_elem.get_attribute('placeholder') or ""
            name_attr = await input_elem.get_attribute('name') or ""
            if "手機" in placeholder or "phone" in name_attr.lower():
                form_selectors['phone_input'] = f'input[placeholder*="手機"]'
                print(f"✅ 找到手機欄位: {form_selectors['phone_input']}")
                break
        
        # 3. 信箱欄位
        print("🔍 尋找信箱輸入欄位...")
        email_inputs = await page.locator('input[type="email"]').all()
        if email_inputs:
            form_selectors['email_input'] = 'input[type="email"]'
            print(f"✅ 找到信箱欄位: {form_selectors['email_input']}")
        else:
            # 備用方案：找包含email的文字欄位
            for i, input_elem in enumerate(name_inputs):
                placeholder = await input_elem.get_attribute('placeholder') or ""
                name_attr = await input_elem.get_attribute('name') or ""
                if "信箱" in placeholder or "email" in name_attr.lower():
                    form_selectors['email_input'] = f'input[placeholder*="信箱"]'
                    print(f"✅ 找到信箱欄位: {form_selectors['email_input']}")
                    break
        
        # 4. 檔案上傳欄位
        print("🔍 尋找檔案上傳欄位...")
        file_inputs = await page.locator('input[type="file"]').all()
        
        if len(file_inputs) >= 2:
            # 通常第一個是申請PDF，第二個是街頭藝人證
            form_selectors['pdf_upload'] = f'input[type="file"]:nth-of-type(1)'
            form_selectors['certificate_upload'] = f'input[type="file"]:nth-of-type(2)'
            print(f"✅ 找到PDF上傳欄位: {form_selectors['pdf_upload']}")
            print(f"✅ 找到證照上傳欄位: {form_selectors['certificate_upload']}")
        else:
            print(f"⚠️ 只找到 {len(file_inputs)} 個檔案上傳欄位")
            for i, file_input in enumerate(file_inputs):
                form_selectors[f'file_upload_{i+1}'] = f'input[type="file"]:nth-of-type({i+1})'
        
        # 5. reCAPTCHA
        print("🔍 尋找 reCAPTCHA...")
        recaptcha_frame = page.locator('iframe[src*="recaptcha"]').first
        if await recaptcha_frame.count() > 0:
            form_selectors['recaptcha_frame'] = 'iframe[src*="recaptcha"]'
            form_selectors['recaptcha_checkbox'] = '.recaptcha-checkbox-border'
            print(f"✅ 找到 reCAPTCHA: {form_selectors['recaptcha_frame']}")
        else:
            print("⚠️ 未找到 reCAPTCHA iframe")
        
        # 6. 同意條款 checkbox
        print("🔍 尋找同意條款...")
        checkboxes = await page.locator('input[type="checkbox"]').all()
        for i, checkbox in enumerate(checkboxes):
            # 查找附近的文字內容
            parent = checkbox.locator('xpath=..').first
            parent_text = await parent.text_content() or ""
            if "同意" in parent_text or "閱讀" in parent_text:
                form_selectors['agreement_checkbox'] = f'input[type="checkbox"]:nth-of-type({i+1})'
                print(f"✅ 找到同意條款: {form_selectors['agreement_checkbox']}")
                print(f"📝 條款文字: {parent_text.strip()[:50]}...")
                break
        
        # 7. 提交按鈕
        print("🔍 尋找提交按鈕...")
        submit_buttons = await page.locator('button:has-text("確認"), input[type="submit"], button:has-text("送出")').all()
        if submit_buttons:
            # 取得第一個提交按鈕的文字
            button_text = await submit_buttons[0].text_content() or ""
            if "確認" in button_text:
                form_selectors['submit_button'] = 'button:has-text("確認")'
            elif "送出" in button_text:
                form_selectors['submit_button'] = 'button:has-text("送出")'
            else:
                form_selectors['submit_button'] = 'input[type="submit"]'
            print(f"✅ 找到提交按鈕: {form_selectors['submit_button']}")
            print(f"📝 按鈕文字: {button_text.strip()}")
        
        # 儲存表單選擇器
        self.selectors['form_page'] = form_selectors
        
        print("✅ 第二頁分析完成")
        print("-" * 30)
    
    def _output_results(self):
        """輸出分析結果"""
        print("📊 網站結構分析結果")
        print("=" * 50)
        
        print("\n🌐 第一頁（徵件活動列表）:")
        for key, value in self.selectors['first_page'].items():
            print(f"  {key}: {value}")
        
        print("\n📝 第二頁（申請表單）:")
        for key, value in self.selectors['form_page'].items():
            print(f"  {key}: {value}")
        
        print("\n💾 建議加入 config.py 的設定:")
        print("-" * 30)
        print("FORM_SELECTORS = {")
        for key, value in self.selectors['form_page'].items():
            print(f'    "{key}": "{value}",')
        print("}")
        
        # 將結果保存到 JSON 檔案
        with open('website_analysis_result.json', 'w', encoding='utf-8') as f:
            json.dump(self.selectors, f, indent=2, ensure_ascii=False)
        print(f"\n✅ 完整分析結果已保存到: website_analysis_result.json")

async def main():
    """主要執行函數"""
    try:
        analyzer = WebsiteAnalyzer()
        await analyzer.analyze_website()
        print("\n🎉 網站結構分析完成！")
    except Exception as e:
        print(f"\n❌ 分析失敗: {str(e)}")
        return 1
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
