/**
 * 街頭藝人申請系統 - 日期計算工具
 * Phase 3: 狀態管理與時間日期邏輯
 */

/**
 * 檢查當前是否在申請時間窗口內（雙時段制：每月1-15日及20-31日）
 * @return {Object} {isOpen: boolean, message: string, nextMonth: string}
 */
function checkApplicationWindow() {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1; // JavaScript 月份從0開始
  const currentYear = now.getFullYear();
  
  const config = CONFIG.PHASE3.APPLICATION_WINDOW;
  
  // 判斷是否在兩個時段之一
  const inPeriod1 = currentDay >= config.PERIOD1_START && currentDay <= config.PERIOD1_END;
  const inPeriod2 = currentDay >= config.PERIOD2_START && currentDay <= config.PERIOD2_END;
  const isOpen = inPeriod1 || inPeriod2;
  
  if (isOpen) {
    // 計算可申請的月份
    const targetMonths = getAvailableMonths();
    return {
      isOpen: true,
      message: `現在可以申請 ${targetMonths.map(m => m.display).join(' 或 ')}`,
      targetMonths: targetMonths
    };
  } else {
    // 計算下次開放時間
    let nextOpenDate;
    if (currentDay < config.PERIOD1_START) {
      // 在第一時段之前（例如：11月還未到1日）
      nextOpenDate = new Date(currentYear, currentMonth - 1, config.PERIOD1_START);
    } else if (currentDay > config.PERIOD1_END && currentDay < config.PERIOD2_START) {
      // 在兩個時段之間（16-19日）
      nextOpenDate = new Date(currentYear, currentMonth - 1, config.PERIOD2_START);
    } else {
      // 在第二時段之後（例如：11月已過31日，等下月1日）
      nextOpenDate = new Date(currentYear, currentMonth, config.PERIOD1_START);
    }
    
    return {
      isOpen: false,
      message: `申請時間為每月 ${config.PERIOD1_START}-${config.PERIOD1_END} 日及 ${config.PERIOD2_START}-${config.PERIOD2_END} 日\n下次開放：${formatDate(nextOpenDate)}`,
      nextOpenDate: nextOpenDate
    };
  }
}

/**
 * 取得可申請的月份（雙時段制）
 * @return {Array} 可申請的月份陣列 [{month: 10, year: 2025, display: "10月"}]
 */
function getAvailableMonths() {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  
  const config = CONFIG.PHASE3.APPLICATION_WINDOW;
  const months = [];
  
  // 判斷當前在哪個時段，並決定推算月份
  let advanceMonths = 0;
  
  if (currentDay >= config.PERIOD1_START && currentDay <= config.PERIOD1_END) {
    // 第一時段（1-15日）：申請下1個月
    advanceMonths = config.PERIOD1_ADVANCE_MONTHS; // 1
  } else if (currentDay >= config.PERIOD2_START && currentDay <= config.PERIOD2_END) {
    // 第二時段（20-31日）：申請下2個月
    advanceMonths = config.PERIOD2_ADVANCE_MONTHS; // 2
  }
  
  // 只返回單一可申請月份
  if (advanceMonths > 0) {
    const targetDate = new Date(currentYear, currentMonth + advanceMonths, 1);
    months.push({
      month: targetDate.getMonth() + 1,
      year: targetDate.getFullYear(),
      display: `${targetDate.getMonth() + 1}月`
    });
  }
  
  return months;
}

/**
 * 取得指定月份的週六日期
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {number} count - 要取得的週六數量（預設全部）
 * @return {Array} 週六日期陣列 [{date: 5, day: "六", display: "10/5(六)"}]
 */
function getSaturdays(year, month, count = 0) {
  const saturdays = [];
  const daysInMonth = new Date(year, month, 0).getDate(); // 取得該月天數
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 6) { // 6 = 星期六
      saturdays.push({
        date: day,
        day: '六',
        display: `${month}月${day}日週六`,
        fullDate: date
      });
    }
  }
  
  // 如果指定數量，返回前N個
  if (count > 0) {
    return saturdays.slice(0, count);
  }
  
  return saturdays;
}

/**
 * 取得指定月份的週日日期
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {number} count - 要取得的週日數量（預設全部）
 * @return {Array} 週日日期陣列
 */
function getSundays(year, month, count = 0) {
  const sundays = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0) { // 0 = 星期日
      sundays.push({
        date: day,
        day: '日',
        display: `${month}月${day}日週日`,
        fullDate: date
      });
    }
  }
  
  if (count > 0) {
    return sundays.slice(0, count);
  }
  
  return sundays;
}

/**
 * 取得預設申請日期（前3個週六）
 * @param {number} targetMonth - 目標月份 (1-12)
 * @param {number} targetYear - 目標年份
 * @return {Object} 預設日期資訊
 */
function getDefaultDates(targetMonth, targetYear) {
  const config = CONFIG.PHASE3.DEFAULTS;
  const saturdays = getSaturdays(targetYear, targetMonth, config.SATURDAY_COUNT);
  
  return {
    month: targetMonth,
    year: targetYear,
    dates: saturdays,
    display: saturdays.map(s => s.display).join('、'),
    description: `${targetMonth}月份前${config.SATURDAY_COUNT}個週六`
  };
}

/**
 * 解析用戶輸入的日期選擇（基礎版）
 * @param {string} userInput - 用戶輸入
 * @param {number} targetMonth - 目標月份
 * @param {number} targetYear - 目標年份
 * @return {Object} 解析結果
 */
function parseDateSelection(userInput, targetMonth, targetYear) {
  // 使用增強版解析
  return parseDateSelectionEnhanced(userInput, targetMonth, targetYear);
}

/**
 * 簡化版日期解析（方案A：只處理具體日期號碼）
 * @param {string} userInput - 用戶輸入
 * @param {number} targetMonth - 目標月份
 * @param {number} targetYear - 目標年份
 * @return {Object} 解析結果
 */
function parseDateSelectionEnhanced(userInput, targetMonth, targetYear) {
  const input = normalizeChineseNumbers(userInput.toLowerCase());
  const result = {
    success: false,
    dates: [],
    message: ''
  };
  
  // 只解析具體日期（支援多種格式）
  // 支援：5號、5日、五號、五日、5、五
  const datePattern = /(\d{1,2})[號号日]?/g;
  const matches = [...input.matchAll(datePattern)];
  
  if (matches.length > 0) {
    const selectedDates = [];
    const addedDays = new Set(); // 避免重複
    const invalidDays = []; // 記錄無效日期
    
    for (const match of matches) {
      const day = parseInt(match[1]);
      if (day >= 1 && day <= 31) {
        // 檢查該日期在目標月份是否存在
        const date = new Date(targetYear, targetMonth - 1, day);
        if (date.getMonth() === targetMonth - 1 && !addedDays.has(day)) {
          addedDays.add(day);
          const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
          selectedDates.push({
            date: day,
            day: dayOfWeek,
            display: `${targetMonth}月${day}日週${dayOfWeek}`,
            fullDate: date
          });
        } else if (day > 31) {
          invalidDays.push(day);
        }
      }
    }
    
    if (selectedDates.length > 0) {
      // 按日期排序
      selectedDates.sort((a, b) => a.date - b.date);
      result.success = true;
      result.dates = selectedDates;
      
      // 如果有無效日期，在訊息中提醒（但不阻止成功）
      let message = `已選擇 ${selectedDates.map(d => d.display).join('、')}`;
      if (invalidDays.length > 0) {
        message += `\n（${targetMonth}月沒有${invalidDays.join('、')}號，已忽略）`;
      }
      result.message = message;
      return result;
    }
  }
  
  // 無法解析到任何有效日期
  result.message = '請說具體的日期號碼，例如「11號、12號、26號」';
  return result;
}

/**
 * 正規化中文數字為阿拉伯數字
 * @param {string} text - 輸入文字
 * @return {string} 轉換後的文字
 */
function normalizeChineseNumbers(text) {
  const chineseNumbers = {
    '零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
    '五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
    '十': '10', '十一': '11', '十二': '12', '十三': '13', '十四': '14',
    '十五': '15', '十六': '16', '十七': '17', '十八': '18', '十九': '19',
    '二十': '20', '二十一': '21', '二十二': '22', '二十三': '23', '二十四': '24',
    '二十五': '25', '二十六': '26', '二十七': '27', '二十八': '28', '二十九': '29',
    '三十': '30', '三十一': '31',
    '兩': '2', '倆': '2' // 常見變體
  };
  
  let result = text;
  
  // 替換中文數字
  for (const [chinese, arabic] of Object.entries(chineseNumbers)) {
    result = result.replace(new RegExp(chinese, 'g'), arabic);
  }
  
  // 處理特殊情況：「十」開頭但不是完整數字的情況
  // 例如：「十號」→「10號」
  result = result.replace(/(?<![一二三四五六七八九])十(?![一二三四五六七八九])/g, '10');
  
  return result;
}

/**
 * 格式化日期顯示
 * @param {Date} date - 日期物件
 * @return {string} 格式化的日期字串
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  
  return `${year}年${month}月${day}日(${dayOfWeek})`;
}

/**
 * 取得所有可選日期（週六和週日）
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @return {Object} 包含週六和週日的日期資訊
 */
function getAllAvailableDates(year, month) {
  const saturdays = getSaturdays(year, month);
  const sundays = getSundays(year, month);
  
  return {
    saturdays: saturdays,
    sundays: sundays,
    saturdayDisplay: saturdays.map(s => s.display).join('、'),
    sundayDisplay: sundays.map(s => s.display).join('、'),
    allDates: [...saturdays, ...sundays].sort((a, b) => a.date - b.date)
  };
}

/**
 * 測試日期工具函數
 */
function testDateUtils() {
  console.log('🧪 測試日期工具...');
  
  // 測試申請窗口
  console.log('1. 測試申請窗口檢查');
  const windowCheck = checkApplicationWindow();
  console.log('申請窗口狀態:', windowCheck);
  
  // 測試可申請月份
  console.log('\n2. 測試可申請月份');
  const availableMonths = getAvailableMonths();
  console.log('可申請月份:', availableMonths);
  
  // 測試週六日期
  if (availableMonths.length > 0) {
    const firstMonth = availableMonths[0];
    console.log(`\n3. 測試 ${firstMonth.display} 的週六`);
    const saturdays = getSaturdays(firstMonth.year, firstMonth.month, 3);
    console.log('前3個週六:', saturdays);
    
    // 測試預設日期
    console.log('\n4. 測試預設日期');
    const defaults = getDefaultDates(firstMonth.month, firstMonth.year);
    console.log('預設日期:', defaults);
    
    // 測試日期解析
    console.log('\n5. 測試日期解析');
    const testCases = [
      '前2個週六',
      '所有週日',
      '5號、12號、19號'
    ];
    
    testCases.forEach(testCase => {
      const parsed = parseDateSelection(testCase, firstMonth.month, firstMonth.year);
      console.log(`輸入「${testCase}」:`, parsed.message);
    });
  }
  
  console.log('\n✅ 日期工具測試完成');
}
