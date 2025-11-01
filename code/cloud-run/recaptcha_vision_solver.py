"""
reCAPTCHA Vision Solver - 使用 OpenAI GPT-4.1 Vision API 處理 reCAPTCHA 圖片驗證

Phase 6 階段 2B: 本地 headless 測試環境
第 2 步實作範圍：偵測和截圖功能
"""

import os
import base64
from datetime import datetime
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout
from config import Config


class ReCaptchaVisionSolver:
    """reCAPTCHA 圖片驗證處理器"""
    
    # 提示文字解析 Prompt（提取目標物件名稱）
    EXTRACT_PROMPT_TEMPLATE = """
Extract the target object name from this reCAPTCHA challenge instruction.

Instruction text: "{challenge_text}"

Common patterns:
- "Select all images with [object]"
- "Select all squares with [object]"
- "Click on all images containing [object]"
- Multi-line text may include: "If there are none, click skip"

Extract only the object name (e.g., "bicycles", "traffic lights", "buses", "motorcycles", "crosswalks").

Rules:
- If the object is plural, keep it plural
- If there are multiple words (e.g., "traffic lights"), keep them together
- Ignore additional instructions like "If there are none, click skip"

Response format (JSON only):
{{
    "target_object": "extracted object name",
    "confidence": 0.0-1.0
}}

Examples:
Input: "Select all images with bicycles"
Output: {{"target_object": "bicycles", "confidence": 1.0}}

Input: "Select all squares with\\nmotorcycles\\nIf there are none, click skip"
Output: {{"target_object": "motorcycles", "confidence": 1.0}}

Input: "Click verify once there are none left"
Output: {{"target_object": "unknown", "confidence": 0.0}}
"""
    
    # 圖片識別 Prompt（主要 Vision API）
    VISION_PROMPT_TEMPLATE = """
You are a reCAPTCHA image verification expert.

Task: Analyze this grid image and identify which tiles contain "{target_object}".

The grid can be either 3x3 (9 tiles) or 4x4 (16 tiles). Analyze the image to determine the grid size.

3x3 Grid Layout:
┌─────┬─────┬─────┐
│  1  │  2  │  3  │
├─────┼─────┼─────┤
│  4  │  5  │  6  │  (Numbered left to right, top to bottom)
├─────┼─────┼─────┤
│  7  │  8  │  9  │
└─────┴─────┴─────┘

4x4 Grid Layout:
┌─────┬─────┬─────┬─────┐
│  1  │  2  │  3  │  4  │
├─────┼─────┼─────┼─────┤
│  5  │  6  │  7  │  8  │  (Numbered left to right, top to bottom)
├─────┼─────┼─────┼─────┤
│  9  │ 10  │ 11  │ 12  │
├─────┼─────┼─────┼─────┤
│ 13  │ 14  │ 15  │ 16  │
└─────┴─────┴─────┴─────┘

IMPORTANT - Two possible scenarios:

Scenario A: Multiple separate objects
- Each tile contains a complete or partial view of a different {target_object}
- Example: Multiple bicycles, each in different tiles
- Example: Multiple motorcycles scattered across tiles

Scenario B: One large object spanning multiple tiles
- A single large {target_object} is split across multiple adjacent tiles
- Example: One large bus spread across tiles 1,2,3,4,5,6

Scenario C: No target objects present
- If NO tiles contain the target object, return empty array []
- Be certain before returning empty - check all tiles carefully

Instructions:
1. Carefully examine ALL tiles in the grid (9 for 3x3, 16 for 4x4)
2. Identify tiles containing ANY part of the target object
3. Include tiles with:
   ✓ Complete objects (entire {target_object} visible)
   ✓ Partial views (even small parts count, e.g., wheel of a bicycle)
   ✓ Parts of larger objects spanning multiple tiles
4. Exclude tiles with:
   ✗ Similar but different objects (e.g., bicycles when looking for motorcycles, cars when looking for buses)
   ✗ Completely unrelated content (e.g., trees, buildings, roads without target)
   ✗ Background elements (sky, ground, walls)

CRITICAL - Pay special attention to:
- Objects that span multiple tiles (consider all tiles they occupy)
- Partial views at tile edges (even small visible parts count)
- Distinguish similar vehicles: bicycles ≠ motorcycles, cars ≠ buses
- Small or unclear portions that are still part of the target object
- **Include tiles with PARTIAL views of {target_object}**:
  • Even if only a small part is visible (e.g., handlebar, wheel)
  • Even if the object is in the background or far away
  • Even if the object is partially occluded by other elements
- **Include tiles with SMALL objects**:
  • Even if the {target_object} is far away or not the main subject
  • Small portions still count as containing the target
- **When in doubt, INCLUDE the tile**:
  • It's better to select too many than too few
  • reCAPTCHA prefers over-selection to under-selection

Response format (JSON only):
{{
    "selected_cells": [list of tile numbers containing {target_object}, or empty [] if none],
    "confidence": 0.0-1.0 (how confident you are),
    "explanation": "Brief reasoning",
    "pattern": "separate_objects" or "spanning_object" or "none_found"
}}

Example 1 (Separate objects):
If tiles 1, 3, 5, 7 each contain a different motorcycle:
{{"selected_cells": [1, 3, 5, 7], "confidence": 0.95, "explanation": "4 separate motorcycles clearly visible", "pattern": "separate_objects"}}

Example 2 (Spanning object):
If one large bus spans tiles 1, 2, 4, 5, 7, 8:
{{"selected_cells": [1, 2, 4, 5, 7, 8], "confidence": 0.92, "explanation": "One large bus spanning multiple adjacent tiles", "pattern": "spanning_object"}}

Example 3 (No objects):
If no buses are present (only cars, roads, buildings):
{{"selected_cells": [], "confidence": 0.88, "explanation": "No buses found, only cars and roads visible", "pattern": "none_found"}}
"""
    
    # 錯誤訊息格式
    ERROR_MESSAGES = {
        "vision_api_failed": "[網站提交] reCAPTCHA 圖片識別失敗: Vision API 無法識別驗證圖片",
        "verification_timeout": "[網站提交] reCAPTCHA 驗證超時: 驗證碼處理超過指定時間",
        "wrong_selection": "[網站提交] reCAPTCHA 驗證失敗: 圖片選擇不正確，已重試但仍失敗",
        "captcha_not_detected": "[網站提交] reCAPTCHA 偵測失敗: 無法找到驗證元素",
        "low_confidence": "[網站提交] reCAPTCHA 信心度過低: Vision API 無法確定圖片內容"
    }
    
    def __init__(self, page: Page):
        """
        初始化 reCAPTCHA Vision Solver
        
        Args:
            page: Playwright Page 物件
        """
        self.page = page
        self.config = Config.RECAPTCHA_VISION
        self.screenshot_dir = None  # 本地測試時才設定
    
    def set_screenshot_dir(self, screenshot_dir: str):
        """
        設定截圖資料夾（本地測試專用）
        
        Args:
            screenshot_dir: 截圖資料夾完整路徑
        """
        self.screenshot_dir = screenshot_dir
        os.makedirs(screenshot_dir, exist_ok=True)
    
    def detect_image_challenge(self) -> bool:
        """
        偵測是否觸發了 reCAPTCHA 圖片驗證
        
        第 2 步實作範圍：偵測圖片驗證是否出現
        
        偵測邏輯：
        1. 切換到 reCAPTCHA iframe
        2. 查找圖片驗證的關鍵元素（圖片網格）
        3. 回傳是否偵測到圖片驗證
        
        Returns:
            bool: True 表示偵測到圖片驗證，False 表示未偵測到
        """
        try:
            print("\n[reCAPTCHA] 開始偵測圖片驗證...")
            
            # 等待 reCAPTCHA iframe 載入（使用較短的超時時間）
            recaptcha_frame = None
            try:
                # 嘗試找到包含圖片挑戰的 iframe
                # reCAPTCHA 的圖片挑戰通常在標題為 "recaptcha challenge" 的 iframe 中
                frames = self.page.frames
                for frame in frames:
                    if "recaptcha" in frame.url.lower() and "bframe" in frame.url.lower():
                        recaptcha_frame = frame
                        print(f"[reCAPTCHA] 找到 reCAPTCHA iframe: {frame.url}")
                        break
                
                if not recaptcha_frame:
                    print("[reCAPTCHA] 未找到圖片驗證 iframe（可能直接通過驗證）")
                    return False
                
            except Exception as e:
                print(f"[reCAPTCHA] iframe 載入失敗: {str(e)}")
                return False
            
            # 偵測圖片網格元素
            # reCAPTCHA 的圖片網格通常是一個包含 9 個格子的表格
            try:
                # 常見的圖片網格選擇器
                grid_selectors = [
                    ".rc-imageselect-table",           # 圖片網格表格
                    ".rc-imageselect-target",          # 圖片目標區域
                    "table[class*='imageselect']"      # 任何包含 imageselect 的表格
                ]
                
                image_challenge_detected = False
                for selector in grid_selectors:
                    try:
                        element = recaptcha_frame.wait_for_selector(
                            selector, 
                            timeout=3000,  # 3 秒超時（快速檢測）
                            state="visible"
                        )
                        if element:
                            print(f"[reCAPTCHA] ✅ 偵測到圖片驗證網格: {selector}")
                            image_challenge_detected = True
                            break
                    except PlaywrightTimeout:
                        continue
                
                if not image_challenge_detected:
                    print("[reCAPTCHA] 未偵測到圖片網格元素")
                    return False
                
                # 確認是否有提示文字（進一步驗證）
                challenge_text = self._extract_challenge_text_simple(recaptcha_frame)
                if challenge_text:
                    print(f"[reCAPTCHA] 提示文字: {challenge_text}")
                else:
                    print("[reCAPTCHA] ⚠️  未找到提示文字，但偵測到圖片網格")
                
                return True
                
            except Exception as e:
                print(f"[reCAPTCHA] 圖片網格偵測失敗: {str(e)}")
                return False
                
        except Exception as e:
            print(f"[reCAPTCHA] 偵測過程發生錯誤: {str(e)}")
            return False
    
    def _extract_challenge_text_simple(self, frame) -> str:
        """
        簡化版提示文字提取（用於第 2 步快速驗證）
        
        Args:
            frame: reCAPTCHA iframe
            
        Returns:
            str: 提示文字，若未找到則回傳空字串
        """
        try:
            for selector in self.config["CHALLENGE_TEXT_SELECTORS"]:
                try:
                    element = frame.wait_for_selector(selector, timeout=2000, state="visible")
                    if element:
                        text = element.inner_text().strip()
                        if text:
                            return text
                except:
                    continue
            return ""
        except:
            return ""
    
    def take_screenshot(self, filename: str, description: str = ""):
        """
        拍攝整頁截圖（第 2 步實作）
        
        Args:
            filename: 檔案名稱（例如："1_before_recaptcha.png"）
            description: 截圖描述（用於 log）
        """
        if not self.screenshot_dir:
            print(f"[Screenshot] ⚠️  未設定截圖資料夾，跳過截圖: {filename}")
            return
        
        try:
            filepath = os.path.join(self.screenshot_dir, filename)
            self.page.screenshot(path=filepath, full_page=True)
            print(f"[Screenshot] ✅ {description}: {filepath}")
        except Exception as e:
            print(f"[Screenshot] ❌ 截圖失敗 ({filename}): {str(e)}")
    
    def take_element_screenshot(self, selector: str, filename: str, description: str = ""):
        """
        拍攝特定元素的截圖（第 2 步實作，用於圖片網格特寫）
        
        Args:
            selector: 元素選擇器
            filename: 檔案名稱
            description: 截圖描述
        """
        if not self.screenshot_dir:
            print(f"[Screenshot] ⚠️  未設定截圖資料夾，跳過元素截圖: {filename}")
            return
        
        try:
            # 嘗試找到 reCAPTCHA iframe
            frames = self.page.frames
            for frame in frames:
                if "recaptcha" in frame.url.lower() and "bframe" in frame.url.lower():
                    try:
                        element = frame.wait_for_selector(selector, timeout=3000, state="visible")
                        if element:
                            filepath = os.path.join(self.screenshot_dir, filename)
                            element.screenshot(path=filepath)
                            print(f"[Screenshot] ✅ {description}: {filepath}")
                            return
                    except:
                        continue
            
            print(f"[Screenshot] ⚠️  找不到元素 {selector}，無法截圖")
            
        except Exception as e:
            print(f"[Screenshot] ❌ 元素截圖失敗 ({filename}): {str(e)}")
    
    # ==================== 第 3 步功能（核心實作）====================
    
    def extract_target_object(self) -> dict:
        """
        提取 reCAPTCHA 提示文字中的目標物件
        
        第 3 步實作：使用 GPT-4.1 Text API 解析提示文字
        
        Returns:
            dict: {"target_object": "物件名稱", "confidence": 信心度}
        """
        try:
            print("\n[提示文字解析] 開始提取目標物件...")
            
            # 找到 reCAPTCHA iframe
            recaptcha_frame = None
            for frame in self.page.frames:
                if self.config["RECAPTCHA_IFRAME_PATTERN"] in frame.url.lower():
                    recaptcha_frame = frame
                    break
            
            if not recaptcha_frame:
                raise Exception("找不到 reCAPTCHA iframe")
            
            # 提取提示文字
            challenge_text = ""
            for selector in self.config["CHALLENGE_TEXT_SELECTORS"]:
                try:
                    element = recaptcha_frame.wait_for_selector(selector, timeout=3000, state="visible")
                    if element:
                        challenge_text = element.inner_text().strip()
                        if challenge_text:
                            break
                except:
                    continue
            
            if not challenge_text:
                raise Exception("無法提取提示文字")
            
            print(f"[提示文字解析] 原始提示文字: {challenge_text}")
            
            # 呼叫 OpenAI API 解析
            from openai import OpenAI
            client = OpenAI(api_key=Config.get_openai_vision_key())
            
            prompt = self.EXTRACT_PROMPT_TEMPLATE.format(challenge_text=challenge_text)
            
            response = client.chat.completions.create(
                model=self.config["MODEL"],
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50,
                temperature=self.config["TEMPERATURE"],
                response_format={"type": "json_object"}
            )
            
            import json
            result = json.loads(response.choices[0].message.content)
            
            print(f"[提示文字解析] ✅ 目標物件: {result['target_object']} (信心度: {result['confidence']})")
            
            return result
            
        except Exception as e:
            print(f"[提示文字解析] ❌ 失敗: {str(e)}")
            raise
    
    def capture_grid_image(self) -> str:
        """
        截取 reCAPTCHA 圖片網格並轉換為 Base64
        
        第 3 步實作：截取整個 3x3 網格並編碼
        
        Returns:
            str: Base64 編碼的圖片
        """
        try:
            print("\n[圖片截取] 開始截取網格圖片...")
            
            # 找到 reCAPTCHA iframe
            recaptcha_frame = None
            for frame in self.page.frames:
                if self.config["RECAPTCHA_IFRAME_PATTERN"] in frame.url.lower():
                    recaptcha_frame = frame
                    break
            
            if not recaptcha_frame:
                raise Exception("找不到 reCAPTCHA iframe")
            
            # 定位網格元素
            grid_selector = self.config["GRID_SELECTOR"]
            grid_element = recaptcha_frame.wait_for_selector(grid_selector, timeout=5000, state="visible")
            
            if not grid_element:
                raise Exception(f"找不到網格元素: {grid_selector}")
            
            # 截取網格圖片
            screenshot_bytes = grid_element.screenshot()
            
            # 轉換為 Base64
            image_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            
            print(f"[圖片截取] ✅ 成功截取網格圖片 (大小: {len(screenshot_bytes)} bytes)")
            
            return image_base64
            
        except Exception as e:
            print(f"[圖片截取] ❌ 失敗: {str(e)}")
            raise
    
    def call_vision_api(self, image_base64: str, target_object: str) -> dict:
        """
        呼叫 OpenAI GPT-4.1 Vision API 識別圖片
        
        第 3 步實作：呼叫 Vision API 識別哪些格子包含目標物件
        
        Args:
            image_base64: Base64 編碼的圖片
            target_object: 目標物件名稱
            
        Returns:
            dict: {"selected_cells": [格子編號], "confidence": 信心度, ...}
        """
        try:
            print(f"\n[Vision API] 開始識別圖片（目標物件: {target_object}）...")
            
            from openai import OpenAI
            import json
            
            client = OpenAI(api_key=Config.get_openai_vision_key())
            
            # 準備 Vision Prompt
            prompt = self.VISION_PROMPT_TEMPLATE.format(target_object=target_object)
            
            # 呼叫 Vision API
            response = client.chat.completions.create(
                model=self.config["MODEL"],
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_base64}",
                                    "detail": self.config["DETAIL"]
                                }
                            }
                        ]
                    }
                ],
                max_tokens=self.config["MAX_TOKENS"],
                temperature=self.config["TEMPERATURE"],
                response_format={"type": "json_object"}
            )
            
            # 解析回應
            result = json.loads(response.choices[0].message.content)
            
            print(f"[Vision API] ✅ 識別完成:")
            print(f"  - 選擇格子: {result.get('selected_cells', [])}")
            print(f"  - 信心度: {result.get('confidence', 0)}")
            print(f"  - 解釋: {result.get('explanation', '')}")
            print(f"  - 模式: {result.get('pattern', '')}")
            
            # 檢查信心度
            confidence = result.get('confidence', 0)
            if confidence < self.config["CONFIDENCE_THRESHOLD"]:
                raise Exception(f"信心度過低: {confidence} < {self.config['CONFIDENCE_THRESHOLD']}")
            
            return result
            
        except Exception as e:
            print(f"[Vision API] ❌ 失敗: {str(e)}")
            raise
    
    def click_verify_button(self) -> bool:
        """
        點擊 reCAPTCHA Verify 按鈕
        
        第 4.5 步實作：支援多個候選選擇器
        
        Returns:
            bool: 是否成功點擊
        """
        try:
            print("\n[Verify] 開始尋找 Verify 按鈕...")
            
            # 找到 reCAPTCHA iframe
            recaptcha_frame = None
            for frame in self.page.frames:
                if self.config["RECAPTCHA_IFRAME_PATTERN"] in frame.url.lower():
                    recaptcha_frame = frame
                    break
            
            if not recaptcha_frame:
                raise Exception("找不到 reCAPTCHA iframe")
            
            # 嘗試多個選擇器
            for selector in self.config["VERIFY_BUTTON_SELECTORS"]:
                try:
                    button = recaptcha_frame.wait_for_selector(
                        selector, 
                        timeout=3000, 
                        state="visible"
                    )
                    if button and button.is_visible():
                        print(f"[Verify] ✅ 找到按鈕: {selector}")
                        button.click()
                        print(f"[Verify] ✅ 成功點擊 Verify 按鈕")
                        return True
                except:
                    continue
            
            raise Exception("找不到 Verify 按鈕（嘗試了所有選擇器）")
            
        except Exception as e:
            print(f"[Verify] ❌ 點擊失敗: {str(e)}")
            raise
    
    def check_recaptcha_passed(self) -> bool:
        """
        檢查 reCAPTCHA 是否通過（消失）
        
        第 4.5 步實作：檢查 iframe 和網格是否還存在
        
        Returns:
            bool: True 表示通過（reCAPTCHA 已消失）
        """
        try:
            # 檢查 iframe 是否還存在
            recaptcha_frame = None
            for frame in self.page.frames:
                if self.config["RECAPTCHA_IFRAME_PATTERN"] in frame.url.lower():
                    recaptcha_frame = frame
                    break
            
            if not recaptcha_frame:
                print("[驗證] ✅ reCAPTCHA iframe 已消失（驗證通過）")
                return True
            
            # 檢查網格是否還可見
            try:
                grid = recaptcha_frame.locator(self.config["GRID_SELECTOR"])
                if grid.is_visible(timeout=1000):
                    print("[驗證] ❌ reCAPTCHA 網格仍可見（驗證失敗）")
                    return False
            except:
                # 找不到網格 = 已消失
                print("[驗證] ✅ reCAPTCHA 網格已消失（驗證通過）")
                return True
            
            return False
            
        except Exception as e:
            print(f"[驗證] ⚠️  檢查過程發生錯誤: {str(e)}")
            return False
    
    def click_recaptcha_cells(self, selected_cells: list):
        """
        點擊 reCAPTCHA 指定的格子
        
        第 3 步實作：根據 Vision API 結果點擊格子（含 1→0 轉換）
        支援 3x3（9 格）或 4x4（16 格）網格
        
        Args:
            selected_cells: 要點擊的格子編號列表 (1-9 for 3x3, 1-16 for 4x4)
        """
        try:
            print(f"\n[點擊格子] 開始點擊 {len(selected_cells)} 個格子...")
            
            # 找到 reCAPTCHA iframe
            recaptcha_frame = None
            for frame in self.page.frames:
                if self.config["RECAPTCHA_IFRAME_PATTERN"] in frame.url.lower():
                    recaptcha_frame = frame
                    break
            
            if not recaptcha_frame:
                raise Exception("找不到 reCAPTCHA iframe")
            
            # 找到所有格子元素
            tile_selector = self.config["TILE_SELECTOR"]
            tiles = recaptcha_frame.locator(tile_selector).all()
            
            total_tiles = len(tiles)
            print(f"[點擊格子] 偵測到 {total_tiles} 個格子（{'3x3' if total_tiles == 9 else '4x4' if total_tiles == 16 else '未知格式'}）")
            
            if total_tiles not in [9, 16]:
                print(f"  ⚠️  警告：格子數量異常 ({total_tiles} 個)，將嘗試繼續執行")
            
            # 點擊選中的格子
            click_interval = self.config["CLICK_INTERVAL"]
            
            for cell_num in selected_cells:
                if cell_num < 1 or cell_num > total_tiles:
                    print(f"  ⚠️  格子編號超出範圍: {cell_num}（總共 {total_tiles} 格），跳過")
                    continue
                
                # 轉換編號：1-based → 0-based
                tile_index = cell_num - 1
                
                print(f"  - 點擊格子 {cell_num} (索引 {tile_index})")
                tiles[tile_index].click()
                
                # 等待點擊間隔
                self.page.wait_for_timeout(int(click_interval * 1000))
            
            print(f"[點擊格子] ✅ 完成點擊 {len(selected_cells)} 個格子")
            
            # 等待 reCAPTCHA 處理
            print(f"[點擊格子] 等待 reCAPTCHA 驗證結果...")
            self.page.wait_for_timeout(self.config["TIMEOUT_RECAPTCHA_VERIFY"] * 1000)
            
        except Exception as e:
            print(f"[點擊格子] ❌ 失敗: {str(e)}")
            raise
    
    def solve_recaptcha(self, max_retries: int = 2) -> bool:
        """
        完整的 reCAPTCHA 解決流程（含循環識別和重試機制）
        
        第 4.5 步實作：
        - 循環識別邏輯（最多 8 輪）
        - 每輪呼叫 Vision API 兩次取並集
        - 三個提前結束條件
        - 循環結束後點擊 Verify
        - JSON 記錄儲存（點擊前記錄）
        
        Args:
            max_retries: 最大重試次數（預設 2 次）
            
        Returns:
            bool: 是否成功解決 reCAPTCHA
        """
        print("\n" + "=" * 80)
        print("🔓 開始 reCAPTCHA 解決流程（含循環識別）")
        print("=" * 80)
        
        for attempt in range(max_retries + 1):
            try:
                attempt_num = attempt + 1  # 1-based 編號（a1, a2, a3）
                
                if attempt > 0:
                    print(f"\n🔄 重試第 {attempt} 次...")
                    self.page.wait_for_timeout(self.config["RETRY_DELAY"] * 1000)
                
                # 步驟 1: 提取目標物件
                target_result = self.extract_target_object()
                target_object = target_result.get("target_object", "")
                
                if not target_object or target_object == "unknown":
                    raise Exception("無法識別目標物件")
                
                # 截圖提示文字（本地測試時記錄）
                if self.screenshot_dir:
                    self.take_screenshot(
                        f"a{attempt_num}_prompt_{target_object}.png",
                        f"嘗試 {attempt_num} - 提示文字（目標物件: {target_object}）"
                    )
                
                # === 循環識別階段 ===
                max_iterations = self.config["MAX_ITERATIONS"]
                wait_after_click = self.config["WAIT_AFTER_CLICK"]
                
                print(f"\n🔄 開始循環識別（最多 {max_iterations} 輪）")
                
                for iteration in range(1, max_iterations + 1):
                    print(f"\n--- 第 {iteration} 輪識別 ---")
                    
                    # 條件 A：檢查 reCAPTCHA 是否還存在（提前結束）
                    # 
                    # 理論情境：reCAPTCHA 在點擊格子後重新評估用戶行為，判定為人類而自動通過
                    # 實際機率：在 Cloud Run headless 環境幾乎不可能發生
                    # 保留原因：
                    # 1. 防禦性編程 - 避免極端情況導致無限循環
                    # 2. 檢查成本極低 - 只是一個 iframe 和網格可見性檢查
                    # 3. 安全退出機制 - 即使發生預期外情況也能正常結束
                    if not self.check_recaptcha_passed():
                        # reCAPTCHA 還在，繼續處理
                        pass
                    else:
                        # reCAPTCHA 已經消失了（條件 A 觸發）
                        print(f"✅ reCAPTCHA 已自動通過（第 {iteration-1} 輪後）")
                        print("   ℹ️  這種情況在 headless 環境極為罕見")
                        return True  # 提前成功
                    
                    # 步驟 2: 截取網格圖片
                    image_base64 = self.capture_grid_image()
                    
                    # 本地測試：儲存格子截圖
                    if self.screenshot_dir:
                        # 將 base64 圖片儲存為檔案
                        import base64
                        grid_image_bytes = base64.b64decode(image_base64)
                        grid_image_path = os.path.join(self.screenshot_dir, f"a{attempt_num}_i{iteration}_grid.png")
                        with open(grid_image_path, "wb") as f:
                            f.write(grid_image_bytes)
                        print(f"[截圖] 已儲存格子截圖: a{attempt_num}_i{iteration}_grid.png")
                    
                    # 步驟 3: 呼叫 Vision API 兩次，取並集
                    print(f"[Vision API] 呼叫第 1 次...")
                    result_1 = self.call_vision_api(image_base64, target_object)
                    
                    print(f"[Vision API] 呼叫第 2 次...")
                    result_2 = self.call_vision_api(image_base64, target_object)
                    
                    # 取並集
                    cells_1 = set(result_1.get("selected_cells", []))
                    cells_2 = set(result_2.get("selected_cells", []))
                    final_cells = sorted(list(cells_1.union(cells_2)))
                    
                    print(f"[並集] 第 1 次: {sorted(cells_1)}, 第 2 次: {sorted(cells_2)} → 最終: {final_cells}")
                    
                    # 步驟 4: 儲存 JSON 記錄（點擊前記錄）
                    if self.screenshot_dir:
                        import json
                        json_data = {
                            "attempt": attempt_num,
                            "iteration": iteration,
                            "target_object": target_object,
                            "call_1": {
                                "selected_cells": result_1.get("selected_cells", []),
                                "confidence": result_1.get("confidence", 0),
                                "explanation": result_1.get("explanation", ""),
                                "pattern": result_1.get("pattern", "")
                            },
                            "call_2": {
                                "selected_cells": result_2.get("selected_cells", []),
                                "confidence": result_2.get("confidence", 0),
                                "explanation": result_2.get("explanation", ""),
                                "pattern": result_2.get("pattern", "")
                            },
                            "final_result": {
                                "selected_cells": final_cells,
                                "union_of": [sorted(cells_1), sorted(cells_2)]
                            },
                            "timestamp": datetime.now().isoformat()
                        }
                        json_path = os.path.join(self.screenshot_dir, f"a{attempt_num}_i{iteration}.json")
                        with open(json_path, "w", encoding="utf-8") as f:
                            json.dump(json_data, f, indent=2, ensure_ascii=False)
                        print(f"[JSON] 已儲存記錄: a{attempt_num}_i{iteration}.json")
                    
                    # 條件 B：如果沒有目標物件了，跳出循環（提前結束）
                    if not final_cells:
                        print(f"✅ 沒有目標物件了（第 {iteration} 輪）")
                        if iteration == 1:
                            print("   ℹ️  第 1 輪就無物件，可能是誤判，仍將提交（依賴重試機制）")
                        break  # 跳出循環，準備點擊 Verify
                    
                    # 步驟 5: 點擊所有識別到的格子
                    print(f"[點擊] 點擊 {len(final_cells)} 個格子: {final_cells}")
                    
                    # 找到 reCAPTCHA iframe
                    recaptcha_frame = None
                    for frame in self.page.frames:
                        if self.config["RECAPTCHA_IFRAME_PATTERN"] in frame.url.lower():
                            recaptcha_frame = frame
                            break
                    
                    if not recaptcha_frame:
                        raise Exception("找不到 reCAPTCHA iframe")
                    
                    # 找到所有格子元素
                    tiles = recaptcha_frame.locator(self.config["TILE_SELECTOR"]).all()
                    click_interval = self.config["CLICK_INTERVAL"]
                    
                    for cell_num in final_cells:
                        tile_index = cell_num - 1  # 1-based → 0-based
                        if 0 <= tile_index < len(tiles):
                            tiles[tile_index].click()
                            self.page.wait_for_timeout(int(click_interval * 1000))
                    
                    # 步驟 6: 等待圖片更新（點擊後格子會自動更新圖片）
                    print(f"[等待] 等待 {wait_after_click} 秒讓圖片更新...")
                    self.page.wait_for_timeout(int(wait_after_click * 1000))
                    
                    # 步驟 7: 截圖整頁（點擊後狀態）
                    if self.screenshot_dir:
                        self.take_screenshot(
                            f"a{attempt_num}_i{iteration}_after.png",
                            f"嘗試 {attempt_num} - 第 {iteration} 輪點擊後"
                        )
                
                # 條件 C：達到最大迭代次數（循環自然結束）
                if iteration >= max_iterations:
                    print(f"\n⚠️  達到最大迭代次數 {max_iterations} 輪")
                
                # === 提交答案階段 ===
                print("\n=== 點擊 Verify 提交答案 ===")
                self.click_verify_button()
                
                # 等待驗證結果
                print("[等待] 等待 3 秒驗證結果...")
                self.page.wait_for_timeout(3000)
                
                # 檢查驗證是否通過
                if self.check_recaptcha_passed():
                    print("\n✅ reCAPTCHA 驗證通過！")
                    
                    # 最終截圖
                    if self.screenshot_dir:
                        self.take_screenshot("5_final_state.png", "最終狀態（驗證通過）")
                    
                    print("\n" + "=" * 80)
                    print("✅ reCAPTCHA 解決流程完成")
                    print("=" * 80)
                    return True
                else:
                    raise Exception("reCAPTCHA 驗證失敗（Verify 後網格仍存在）")
                
            except Exception as e:
                error_msg = str(e)
                print(f"\n❌ 嘗試 {attempt + 1}/{max_retries + 1} 失敗: {error_msg}")
                
                # 失敗截圖
                if self.screenshot_dir:
                    self.take_screenshot(
                        f"a{attempt_num}_error.png",
                        f"嘗試 {attempt_num} - 錯誤截圖"
                    )
                
                if attempt >= max_retries:
                    print("\n" + "=" * 80)
                    print(f"❌ reCAPTCHA 解決失敗（已重試 {max_retries} 次）")
                    print(f"錯誤原因: {error_msg}")
                    print("=" * 80)
                    return False
                
                continue
        
        return False

