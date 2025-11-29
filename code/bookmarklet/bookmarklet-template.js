/**
 * 場地申請表單自動填寫 - 智能書籤 Template
 * 
 * 功能：
 * 1. 自動判斷當前頁面（首頁 / 表單頁）
 * 2. 首頁：自動導航到申請表單
 * 3. 表單頁：自動填寫個人資料並勾選同意條款
 * 
 * 版本：v1.0
 * 
 * 使用方式：
 * 1. 修改 CONFIG 中的配置（個人資訊、選擇器、路徑）
 * 2. 壓縮為單行（可用 bookmarklet-minified.txt）
 * 3. 建立書籤，URL 填入：javascript:(function(){...})();
 * 4. 在目標網站的首頁或表單頁點擊書籤
 * 
 * 無障礙設計：
 * - 語音播報（Speech Synthesis API）
 * - 視覺通知（大字體、高對比）
 * - VoiceOver 友善
 */

(function() {
  'use strict';
  
  // ===== 配置參數 =====
  const CONFIG = {
    // 個人資訊（請填入實際資料）
    personalInfo: {
      name: 'YOUR_NAME',           // 姓名
      phone: 'YOUR_PHONE',          // 手機
      email: 'YOUR_EMAIL'           // 信箱
    },
    
    // 網站路徑配置
    paths: {
      homePage: '/solicitation',              // 首頁路徑（範例）
      formPage: '/solicitation/submission/'   // 表單頁路徑（範例，支援部分匹配）
    },
    
    // 頁面識別關鍵字
    keywords: {
      targetProject: '街頭藝人'    // 首頁中要尋找的專案關鍵字（範例）
    },
    
    // CSS 選擇器配置
    selectors: {
      // 首頁選擇器
      homepage: {
        projectBlock: '.row_rt',      // 專案區塊容器（範例）
        applyButton: 'a.btn'          // 申請按鈕（範例）
      },
      
      // 表單頁選擇器
      formPage: {
        nameInput: 'input[placeholder*="姓名"]',      // 姓名欄位（範例）
        phoneInput: 'input[placeholder*="手機"]',     // 手機欄位（範例）
        emailInput: 'input[placeholder*="信箱"]',     // 信箱欄位（範例）
        agreementCheckbox: 'input#signup'            // 同意條款 checkbox（範例）
      }
    },
    
    // 語音訊息配置（可自訂）
    messages: {
      homepage: {
        success: '請再點一次書籤',
        notFound: '找不到申請按鈕'
      },
      formPage: {
        success: '填寫完成，請上傳檔案並完成驗證',
        partial: '已填寫部分欄位',
        failed: '填寫失敗，請檢查網頁結構'
      },
      error: {
        wrongPage: '請在正確的頁面執行此書籤'
      }
    }
  };
  
  // ===== 工具函數 =====
  
  /**
   * 語音播報
   * 使用 Speech Synthesis API（iOS Safari 支援）
   */
  function speak(message) {
    console.log(`🔊 ${message}`);
    try {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'zh-TW';  // 可改為其他語言
      utterance.rate = 0.9;       // 語速（0.1-10）
      utterance.volume = 1.0;     // 音量（0-1）
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('語音播報失敗：', error);
    }
  }
  
  /**
   * 視覺通知
   * 顯示大型居中通知框（對視障使用者友善）
   */
  function notify(message, isSuccess = true) {
    const bgColor = isSuccess ? 'rgba(0, 150, 0, 0.95)' : 'rgba(200, 0, 0, 0.95)';
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${bgColor};
      color: white;
      padding: 30px 40px;
      font-size: 24px;
      border-radius: 15px;
      z-index: 99999;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      font-weight: bold;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 3 秒後自動消失
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  
  /**
   * 語音 + 視覺通知（雙重反饋）
   */
  function alert(message, isSuccess = true) {
    speak(message);
    notify(message, isSuccess);
  }
  
  // ===== 主要功能 =====
  
  /**
   * 首頁功能：找到目標專案的申請按鈕並導航
   */
  function handleHomePage() {
    console.log('📍 偵測到首頁，開始尋找申請按鈕...');
    
    try {
      // 找出所有專案區塊
      const blocks = document.querySelectorAll(CONFIG.selectors.homepage.projectBlock);
      console.log(`找到 ${blocks.length} 個專案區塊`);
      
      // 遍歷每個區塊，尋找包含目標關鍵字的區塊
      for (let block of blocks) {
        const blockText = block.textContent || block.innerText;
        
        // 檢查是否包含目標關鍵字
        if (blockText.includes(CONFIG.keywords.targetProject)) {
          console.log('✅ 找到目標專案區塊');
          
          // 在這個區塊內找申請按鈕
          const button = block.querySelector(CONFIG.selectors.homepage.applyButton);
          
          if (button && button.href) {
            const targetUrl = button.href;
            console.log(`✅ 找到申請按鈕：${targetUrl}`);
            
            // 語音 + 視覺提示
            alert(CONFIG.messages.homepage.success);
            
            // 延遲 1 秒後跳轉（讓使用者看到提示）
            setTimeout(() => {
              window.location.href = targetUrl;
            }, 1000);
            
            return;
          } else {
            console.error('❌ 找到目標區塊，但找不到申請按鈕');
            alert(CONFIG.messages.homepage.notFound, false);
            return;
          }
        }
      }
      
      // 如果沒找到目標區塊
      console.error('❌ 找不到目標專案區塊');
      alert(CONFIG.messages.homepage.notFound, false);
      
    } catch (error) {
      console.error('❌ 執行錯誤：', error);
      alert('執行失敗：' + error.message, false);
    }
  }
  
  /**
   * 表單頁功能：填寫個人資料並勾選同意條款
   */
  function handleFormPage() {
    console.log('📍 偵測到表單頁，開始填寫資料...');
    
    try {
      const { name, phone, email } = CONFIG.personalInfo;
      let filledCount = 0;
      
      // 1. 填寫姓名
      const nameInput = document.querySelector(CONFIG.selectors.formPage.nameInput);
      if (nameInput) {
        nameInput.value = name;
        console.log(`✅ 已填寫姓名：${name}`);
        filledCount++;
      } else {
        console.warn('⚠️  找不到姓名欄位');
      }
      
      // 2. 填寫手機
      const phoneInput = document.querySelector(CONFIG.selectors.formPage.phoneInput);
      if (phoneInput) {
        phoneInput.value = phone;
        console.log(`✅ 已填寫手機：${phone}`);
        filledCount++;
      } else {
        console.warn('⚠️  找不到手機欄位');
      }
      
      // 3. 填寫信箱
      const emailInput = document.querySelector(CONFIG.selectors.formPage.emailInput);
      if (emailInput) {
        emailInput.value = email;
        console.log(`✅ 已填寫信箱：${email}`);
        filledCount++;
      } else {
        console.warn('⚠️  找不到信箱欄位');
      }
      
      // 4. 勾選同意條款
      const checkbox = document.querySelector(CONFIG.selectors.formPage.agreementCheckbox);
      if (checkbox) {
        checkbox.checked = true;
        console.log('✅ 已勾選同意條款');
        filledCount++;
      } else {
        console.warn('⚠️  找不到同意條款 checkbox');
      }
      
      // 5. 顯示結果
      const totalFields = 4;
      if (filledCount === totalFields) {
        console.log('✅ 所有欄位填寫完成');
        alert(CONFIG.messages.formPage.success);
      } else if (filledCount > 0) {
        console.log(`⚠️  部分欄位填寫完成（${filledCount}/${totalFields}）`);
        alert(`${CONFIG.messages.formPage.partial}（${filledCount}/${totalFields}）`, false);
      } else {
        console.error('❌ 沒有成功填寫任何欄位');
        alert(CONFIG.messages.formPage.failed, false);
      }
      
    } catch (error) {
      console.error('❌ 填寫錯誤：', error);
      alert('填寫失敗：' + error.message, false);
    }
  }
  
  // ===== 主程式：判斷當前頁面 =====
  
  function main() {
    console.log('🎯 表單自動填寫書籤啟動');
    console.log(`當前 URL：${window.location.href}`);
    console.log(`當前 pathname：${window.location.pathname}`);
    
    const pathname = window.location.pathname;
    
    // 判斷 1：是否在首頁
    if (pathname === CONFIG.paths.homePage || pathname === CONFIG.paths.homePage + '/') {
      console.log('📍 判斷結果：首頁');
      handleHomePage();
      return;
    }
    
    // 判斷 2：是否在表單頁（支援部分匹配）
    if (pathname.includes(CONFIG.paths.formPage)) {
      console.log('📍 判斷結果：表單頁');
      handleFormPage();
      return;
    }
    
    // 判斷 3：不在正確的頁面
    console.error('❌ 不在正確的頁面');
    alert(CONFIG.messages.error.wrongPage, false);
  }
  
  // 啟動主程式
  main();
  
})();

