"""
Phase 6 - 階段 2B: reCAPTCHA 圖片驗證測試
本地 headless 環境測試 reCAPTCHA 觸發、偵測和解決

第 2 步實作範圍：偵測和截圖功能 ✅
第 3 步實作範圍：完整解決流程 ✅
- 重用 WebsiteAutomation 類別（headless=True）
- 測試 reCAPTCHA 圖片驗證觸發機率
- 驗證偵測邏輯是否正確
- 實際呼叫 Vision API 解決 reCAPTCHA
- 截圖記錄測試過程
- print() 輸出測試結果
"""

import os
import sys
from datetime import datetime
from pathlib import Path

# 導入既有的自動化類別
from website_automation_local import WebsiteAutomation
from recaptcha_vision_solver import ReCaptchaVisionSolver
from config import Config


def run_recaptcha_trigger_test():
    """
    執行 reCAPTCHA 觸發測試
    
    測試流程：
    1. 建立 headless 自動化實例
    2. 導航到表單頁面
    3. 填寫個人資料
    4. 上傳檔案
    5. 點擊 reCAPTCHA checkbox
    6. 偵測是否觸發圖片驗證
    7. 截圖記錄
    8. 輸出測試結果
    """
    
    print("=" * 80)
    print("🧪 reCAPTCHA 圖片驗證測試 - 第 4.5 步：完整循環識別測試")
    print("⚠️  完整流程：循環識別 + 點擊 Verify（真實測試）")
    print("=" * 80)
    print()
    
    # 建立測試資料夾
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_folder_name = f"trigger_test_{timestamp}"
    
    # 專案根目錄
    project_root = Path(__file__).parent.parent.parent
    screenshot_base_dir = project_root / Config.RECAPTCHA_VISION["LOCAL_SCREENSHOT_DIR"]
    test_screenshot_dir = screenshot_base_dir / test_folder_name
    
    print(f"📁 測試截圖資料夾: {test_screenshot_dir}")
    os.makedirs(test_screenshot_dir, exist_ok=True)
    print()
    
    automation = None
    image_challenge_detected = False
    
    try:
        # 1. 初始化自動化實例（headless=True）
        print("🚀 初始化 WebsiteAutomation (headless=True)...")
        automation = WebsiteAutomation(headless=True)
        
        # 2. 啟動瀏覽器
        print("\n📦 啟動 Playwright 瀏覽器...")
        automation.start_browser()
        
        # 3. 導航到表單頁面
        print("\n🔍 導航到表演場地網站...")
        form_url = automation.navigate_to_application_form()
        print(f"✅ 成功導航到表單頁面: {form_url}")
        
        # 4. 填寫個人資料
        print("\n📝 填寫個人資料...")
        automation.fill_personal_information()
        print("✅ 個人資料填寫完成")
        
        # 5. 上傳檔案
        print("\n📎 上傳申請 PDF 和街頭藝人證...")
        automation.upload_files()
        print("✅ 檔案上傳完成")
        
        # 6. 初始化 reCAPTCHA Solver
        print("\n🔧 初始化 reCAPTCHA Vision Solver...")
        solver = ReCaptchaVisionSolver(automation.page)
        solver.set_screenshot_dir(str(test_screenshot_dir))
        
        # T1: 點擊 reCAPTCHA 前
        print("\n📸 T1: 點擊 reCAPTCHA 前的截圖...")
        solver.take_screenshot("0_before_recaptcha.png", "T1: 點擊前")
        
        # 7. 點擊 reCAPTCHA checkbox
        print("\n☑️  點擊 reCAPTCHA checkbox...")
        automation.handle_recaptcha()
        print("✅ reCAPTCHA checkbox 已點擊")
        
        # 等待 reCAPTCHA 反應
        print("\n⏳ 等待 3 秒讓 reCAPTCHA 反應...")
        automation.page.wait_for_timeout(3000)
        
        # T2: 點擊後檢查狀態
        print("\n📸 T2: 點擊後的截圖...")
        solver.take_screenshot("0_after_click.png", "T2: 點擊後")
        
        # 8. 偵測圖片驗證
        print("\n🔍 偵測是否觸發圖片驗證...")
        image_challenge_detected = solver.detect_image_challenge()
        
        solve_success = False
        
        if image_challenge_detected:
            print("\n✅ 偵測到圖片驗證！")
            
            # T3: 圖片挑戰畫面
            print("\n📸 T3: 圖片驗證畫面...")
            solver.take_screenshot("0_image_challenge.png", "T3: 圖片驗證")
            
            # T4: 圖片網格特寫
            print("\n📸 T4: 圖片網格特寫...")
            solver.take_element_screenshot(
                ".rc-imageselect-target",
                "0_grid_close_up.png",
                "T4: 圖片網格特寫"
            )
            
            # 第 4.5 步：實際解決 reCAPTCHA（完整流程）
            print("\n🔧 開始解決 reCAPTCHA 圖片驗證...")
            print("✅ 完整流程：循環識別 + 點擊 Verify")
            print("   包含：8 輪循環、每輪 2 次 Vision API、JSON 記錄\n")
            solve_success = solver.solve_recaptcha(max_retries=2)
            
        else:
            print("\n❌ 未偵測到圖片驗證（reCAPTCHA 直接通過）")
            solve_success = True  # 直接通過也算成功
        
        # T5: 最終表單狀態（等待一下確保畫面穩定）
        print("\n⏳ 等待 2 秒確保畫面穩定...")
        automation.page.wait_for_timeout(2000)
        
        print("\n📸 T5: 最終表單狀態...")
        solver.take_screenshot("9_final_state.png", "T5: 最終狀態")
        
        # 9. 輸出測試結果
        print("\n" + "=" * 80)
        print("📊 測試結果總結")
        print("=" * 80)
        print(f"測試時間: {timestamp}")
        print(f"截圖資料夾: {test_screenshot_dir}")
        print(f"圖片驗證觸發: {'✅ 是' if image_challenge_detected else '❌ 否'}")
        
        if image_challenge_detected:
            print(f"reCAPTCHA 解決: {'✅ 成功' if solve_success else '❌ 失敗'}")
            print(f"\n📸 截圖清單：")
            print(f"  1. 0_before_recaptcha.png - 點擊前")
            print(f"  2. 0_after_click.png - 點擊後")
            print(f"  3. 0_image_challenge.png - 圖片驗證畫面")
            print(f"  4. 0_grid_close_up.png - 圖片網格特寫")
            print(f"  5. a{{N}}_prompt_*.png - 嘗試 {{N}} 提示文字截圖")
            print(f"  6. a{{N}}_i{{M}}_grid.png - 嘗試 {{N}} 第 {{M}} 輪格子截圖")
            print(f"  7. a{{N}}_i{{M}}.json - 嘗試 {{N}} 第 {{M}} 輪 Vision API 記錄")
            print(f"  8. a{{N}}_i{{M}}_after.png - 嘗試 {{N}} 第 {{M}} 輪點擊後截圖")
            print(f"  9. a{{N}}_error.png - 嘗試 {{N}} 錯誤截圖")
            print(f" 10. 9_final_state.png - 最終狀態")
        
        print()
        
        if not image_challenge_detected:
            print("⚠️  測試結果：本次未觸發圖片驗證（直接通過）")
            print("💡 建議：多次執行測試，或等待部署到 Cloud Run（100%觸發）")
        elif solve_success:
            print("✅ 完整流程測試成功：循環識別 + Verify 提交")
            print("📝 測試記錄：")
            print("   - a{{N}}_i{{M}}_grid.png: 嘗試 {{N}} 第 {{M}} 輪識別的圖片")
            print("   - a{{N}}_i{{M}}.json: 嘗試 {{N}} 第 {{M}} 輪 Vision API 詳細回應（含並集）")
            print("   - a{{N}}_i{{M}}_after.png: 嘗試 {{N}} 第 {{M}} 輪點擊後的狀態")
            print("   - 9_final_state.png: 驗證通過的最終狀態")
        else:
            print("❌ 測試失敗：reCAPTCHA 解決失敗")
            print("📝 建議：檢查錯誤日誌和截圖，分析失敗原因")
        
        print("=" * 80)
        
        return solve_success if image_challenge_detected else True
        
    except KeyboardInterrupt:
        print("\n\n⚠️  測試被使用者中斷")
        
    except Exception as e:
        print(f"\n\n❌ 測試過程發生錯誤: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        # 清理資源
        if automation:
            print("\n🧹 清理瀏覽器資源...")
            try:
                automation.cleanup()
                print("✅ 資源清理完成")
            except:
                pass
    
    return image_challenge_detected


if __name__ == "__main__":
    """
    執行測試
    
    使用方式：
        python website_automation_test.py
    
    注意事項：
        1. 確保已在 config.py 中設定 RECAPTCHA_VISION["API_KEY"]
        2. 本地 headless 環境觸發率較低，可多次執行
        3. Cloud Run 環境 100% 觸發，屆時可穩定測試
        4. 第 4.5 步為完整流程測試，包含循環識別和 Verify 提交
    """
    
    print("\n" + "🎯 " * 40)
    print("Phase 6 - 階段 2B: reCAPTCHA 本地測試")
    print("第 4.5 步：完整循環識別測試（含 Verify 提交）")
    print("🎯 " * 40 + "\n")
    
    try:
        result = run_recaptcha_trigger_test()
        sys.exit(0 if result else 1)
    except Exception as e:
        print(f"\n❌ 測試執行失敗: {str(e)}")
        sys.exit(1)

