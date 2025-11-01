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
        
        # ========== 表單提交測試（驗證 reCAPTCHA 是否真的通過）==========
        print("\n" + "=" * 80)
        print("🧪 表單提交測試 - 驗證 reCAPTCHA 是否真正通過")
        print("=" * 80)
        
        final_success = False
        dialog_detected = False
        dialog_message = None
        popup_found = False
        popup_info = ""
        
        try:
            # 1. 嘗試勾選 checkbox
            print("\n📋 步驟 1: 勾選「我已充分閱讀申請事項...」checkbox")
            checkbox = automation.page.locator("input#signup")
            checkbox.check(timeout=5000)
            print("   ✅ 成功勾選 checkbox")
            
            # 2. 截圖：checkbox 勾選後
            automation.page.wait_for_timeout(1000)
            solver.take_screenshot("10_after_checkbox.png", "Checkbox 勾選後")
            
            # 3. 設置原生 dialog 監聽
            def handle_dialog(dialog):
                nonlocal dialog_detected, dialog_message
                dialog_detected = True
                dialog_message = dialog.message
                print(f"\n[彈窗] 偵測到原生 dialog:")
                print(f"   類型: {dialog.type}")
                print(f"   訊息: {dialog.message}")
                # 立即關閉，讓程式繼續（不真的提交）
                dialog.dismiss()
            
            automation.page.on("dialog", handle_dialog)
            
            # 4. 嘗試點擊「確認送出」按鈕
            print("\n📤 步驟 2: 點擊「確認送出」按鈕")
            submit_button = automation.page.locator("button:has-text('確認')")
            
            # 檢查按鈕是否存在且可點擊
            if submit_button.count() == 0:
                raise Exception("找不到確認送出按鈕")
            
            submit_button.click(timeout=5000)
            print("   ✅ 成功點擊確認送出按鈕")
            
            # 5. 等待彈窗出現
            print("\n⏳ 等待 2 秒（彈窗出現時間）...")
            automation.page.wait_for_timeout(2000)
            
            # 6. 截圖：點擊後（含可能的彈窗）
            solver.take_screenshot("11_after_submit.png", "點擊送出後（含彈窗）")
            
            # 7. 檢查自定義彈窗（如果沒有原生 dialog）
            if not dialog_detected:
                print("\n🔍 檢查自定義彈窗...")
                popup_selectors = [
                    ".modal", ".popup", ".dialog", ".swal2-container",
                    "[role='dialog']", ".overlay", ".modal-dialog"
                ]
                
                for selector in popup_selectors:
                    try:
                        popup = automation.page.locator(selector).first
                        if popup.count() > 0 and popup.is_visible():
                            popup_found = True
                            popup_text = popup.inner_text()
                            popup_info = f"{selector}: {popup_text[:100]}"
                            print(f"   ✅ 偵測到自定義彈窗: {selector}")
                            print(f"   內容預覽: {popup_text[:100]}...")
                            break
                    except:
                        continue
                
                if not popup_found:
                    print("   ⚠️  未偵測到任何彈窗")
            
            # 8. 判定成功
            if dialog_detected:
                print("\n✅✅✅ reCAPTCHA 驗證成功！")
                print("   判定依據: 成功點擊送出按鈕並出現原生確認彈窗")
                print(f"   彈窗訊息: {dialog_message}")
                final_success = True
            elif popup_found:
                print("\n✅✅✅ reCAPTCHA 驗證成功！")
                print("   判定依據: 成功點擊送出按鈕並出現自定義彈窗")
                print(f"   彈窗資訊: {popup_info}")
                final_success = True
            else:
                print("\n⚠️  點擊送出後未出現確認彈窗")
                print("   建議: 查看 11_after_submit.png 截圖分析原因")
                final_success = False
            
        except Exception as e:
            print(f"\n❌❌❌ reCAPTCHA 驗證失敗")
            print(f"   錯誤訊息: {str(e)}")
            print("   建議: 查看以下截圖分析原因")
            print("     - 9_final_state.png: reCAPTCHA 結束狀態")
            print("     - 10_after_checkbox.png: checkbox 勾選後（如果有生成）")
            final_success = False
        
        print("=" * 80)
        
        # ========== 表單提交測試結束 ==========
        
        # 9. 輸出測試結果
        print("\n" + "=" * 80)
        print("📊 最終測試結果")
        print("=" * 80)
        print(f"測試時間: {timestamp}")
        print(f"截圖資料夾: {test_screenshot_dir}")
        print(f"圖片驗證觸發: {'✅ 是' if image_challenge_detected else '❌ 否'}")
        print(f"reCAPTCHA 驗證: {'✅ 成功' if final_success else '❌ 失敗'}")
        
        if final_success:
            if dialog_detected:
                print(f"判定依據: 成功點擊確認送出並出現原生彈窗")
            elif popup_found:
                print(f"判定依據: 成功點擊確認送出並出現自定義彈窗")
            else:
                print(f"判定依據: 成功點擊確認送出")
        else:
            print(f"判定依據: 無法完成表單提交流程")
        
        print(f"\n📸 完整截圖清單：")
        print(f"  初始階段:")
        print(f"    1. 0_before_recaptcha.png - 點擊 reCAPTCHA 前")
        print(f"    2. 0_after_click.png - 點擊 reCAPTCHA 後")
        print(f"    3. 0_image_challenge.png - 圖片驗證畫面")
        print(f"    4. 0_grid_close_up.png - 圖片網格特寫")
        
        if image_challenge_detected:
            print(f"  reCAPTCHA 識別階段:")
            print(f"    5. a{{N}}_prompt_*.png - 嘗試 {{N}} 的提示文字")
            print(f"    6. a{{N}}_i{{M}}_grid.png - 嘗試 {{N}} 第 {{M}} 輪的格子圖片")
            print(f"    7. a{{N}}_i{{M}}.json - 嘗試 {{N}} 第 {{M}} 輪的 Vision API 記錄")
            print(f"    8. a{{N}}_i{{M}}_after.png - 嘗試 {{N}} 第 {{M}} 輪點擊後")
            print(f"    9. a{{N}}_error.png - 嘗試 {{N}} 的錯誤截圖（如果失敗）")
        
        print(f"  最終驗證階段:")
        print(f"   10. 9_final_state.png - reCAPTCHA 處理完成")
        print(f"   11. 10_after_checkbox.png - 勾選 checkbox 後")
        print(f"   12. 11_after_submit.png - 點擊確認送出後（含彈窗）")
        
        print()
        
        if final_success:
            print("✅✅✅ 測試成功：reCAPTCHA 驗證通過，成功進入提交流程")
            print("📝 完整記錄：")
            print("   - reCAPTCHA 識別過程完整記錄（grid, json, after 截圖）")
            print("   - 表單提交流程成功（checkbox + 送出 + 彈窗）")
        else:
            print("❌ 測試失敗：reCAPTCHA 驗證未通過或無法提交")
            print("📝 除錯建議：")
            print("   1. 查看 9_final_state.png 確認 reCAPTCHA 狀態")
            print("   2. 查看 10_after_checkbox.png 確認 checkbox 是否成功勾選")
            print("   3. 查看 11_after_submit.png 確認是否有錯誤訊息")
            print("   4. 查看錯誤日誌分析失敗原因")
        
        print("=" * 80)
        
        return final_success
        
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

