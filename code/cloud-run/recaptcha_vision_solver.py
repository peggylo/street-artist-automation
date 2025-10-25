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

Task: Analyze this 3x3 grid image (9 tiles total) and identify which tiles contain "{target_object}".

Grid Layout:
┌─────┬─────┬─────┐
│  1  │  2  │  3  │
├─────┼─────┼─────┤
│  4  │  5  │  6  │  (Numbered left to right, top to bottom)
├─────┼─────┼─────┤
│  7  │  8  │  9  │
└─────┴─────┴─────┘

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
1. Carefully examine ALL 9 tiles in the grid
2. Identify tiles containing ANY part of the target object
3. Include tiles with:
   ✓ Complete objects (entire {target_object} visible)
   ✓ Partial views (even small parts count, e.g., wheel of a bicycle)
   ✓ Parts of larger objects spanning multiple tiles
4. Exclude tiles with:
   ✗ Similar but different objects (e.g., bicycles when looking for motorcycles, cars when looking for buses)
   ✗ Completely unrelated content (e.g., trees, buildings, roads without target)
   ✗ Background elements (sky, ground, walls)

Pay special attention to:
- Objects that span multiple tiles (consider all tiles they occupy)
- Partial views at tile edges (even small visible parts count)
- Distinguish similar vehicles: bicycles ≠ motorcycles, cars ≠ buses
- Small or unclear portions that are still part of the target object

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
    
    # ==================== 第 3 步+ 功能（未來實作）====================
    
    def extract_target_object(self) -> dict:
        """
        提取 reCAPTCHA 提示文字中的目標物件
        
        第 3 步實作：使用 GPT-4.1 Text API 解析提示文字
        
        Returns:
            dict: {"target_object": "物件名稱", "confidence": 信心度}
        """
        raise NotImplementedError("第 3 步實作：提示文字解析")
    
    def capture_grid_image(self) -> str:
        """
        截取 reCAPTCHA 圖片網格並轉換為 Base64
        
        第 3 步實作：截取圖片網格並編碼
        
        Returns:
            str: Base64 編碼的圖片
        """
        raise NotImplementedError("第 3 步實作：圖片截取和編碼")
    
    def call_vision_api(self, image_base64: str, target_object: str) -> dict:
        """
        呼叫 OpenAI GPT-4.1 Vision API 識別圖片
        
        第 3 步實作：呼叫 Vision API
        
        Args:
            image_base64: Base64 編碼的圖片
            target_object: 目標物件名稱
            
        Returns:
            dict: {"selected_cells": [格子編號], "confidence": 信心度, ...}
        """
        raise NotImplementedError("第 3 步實作：Vision API 呼叫")
    
    def click_recaptcha_cells(self, selected_cells: list):
        """
        點擊 reCAPTCHA 指定的格子
        
        第 3 步實作：根據 Vision API 結果點擊格子
        
        Args:
            selected_cells: 要點擊的格子編號列表 (1-9)
        """
        raise NotImplementedError("第 3 步實作：點擊格子邏輯")
    
    def solve_recaptcha(self, max_retries: int = 2) -> bool:
        """
        完整的 reCAPTCHA 解決流程（含重試機制）
        
        第 3 步+ 實作：整合所有功能
        
        Args:
            max_retries: 最大重試次數
            
        Returns:
            bool: 是否成功解決 reCAPTCHA
        """
        raise NotImplementedError("第 3 步+ 實作：完整解決流程")

