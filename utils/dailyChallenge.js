/**
 * ============================================================================
 * 双人猜数对决 - 每日挑战工具模块
 * ============================================================================
 *
 * 【文件说明】
 * 本模块提供每日挑战相关的工具函数，包括：
 * 1. 获取今日挑战配置（模式、位数、是否可重复）
 * 2. 生成每日挑战答案
 * 3. 调用云函数获取/提交每日挑战数据
 * 4. 处理北京时间计算（避免时区问题）
 *
 * 【每日挑战模式】
 * - 6种模式按星期几轮换：
 *   0: 4位数字可重复
 *   1: 4位数字不重复
 *   2: 5位数字可重复
 *   3: 5位数字不重复
 *   4: 4色可重复
 *   5: 4色不重复
 *
 * 【使用方法】
 * const daily = require('../../utils/dailyChallenge.js')
 * const config = daily.getTodayConfig()  // 获取今日配置
 * const answer = daily.generateDailyAnswer('number', 4, true)  // 生成答案
 * ============================================================================
 */

// 颜色常量（与 color-game 页面保持一致）
const COLORS = ['red', 'green', 'blue', 'yellow', 'purple', 'gray'];

/**
 * 获取稳定可靠的北京时间（UTC+8）日期信息
 * 使用 UTC 时间戳偏移法，避免时区问题
 * @returns {Object} 包含年月日和星期几的对象
 *   - dateStr: 日期字符串 'YYYY-MM-DD'
 *   - dayOfWeek: 星期几 (0=周日, 6=周六)
 */
function getBeijingTimeInfo() {
  const now = new Date();

  // 核心逻辑：获取当前 UTC 时间戳，并强制加上 8 小时（北京时间偏移量）
  const beijingTimestamp = now.getTime() + (8 * 60 * 60 * 1000);

  // 创建一个"概念上"的北京时间 Date 对象
  const beijingDate = new Date(beijingTimestamp);

  // 必须使用 getUTC* 方法来获取对应的值，完美避开运行环境时区
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');

  // getUTCDay() 返回原生的 0-6（0=周日，6=周六），完美对应 weeklyModeMap
  const dayOfWeek = beijingDate.getUTCDay();

  return {
    dateStr: `${year}-${month}-${day}`, // 格式: YYYY-MM-DD
    dayOfWeek: dayOfWeek
  };
}

/**
 * 获取今日题目配置（前端用，与云函数保持一致）
 * 支持6种模式轮换：4位数字(可重复/不重复)、5位数字(可重复/不重复)、4色(可重复/不重复)
 *
 * 【模式轮换规则】按星期几固定模式
 * - 周日: 5位数字不重复
 * - 周一: 4色可重复
 * - 周二: 4位数字不重复
 * - 周三: 4位数字可重复
 * - 周四: 5位数字不重复
 * - 周五: 4色不重复
 * - 周六: 5位数字可重复
 *
 * @returns {Object} 今日挑战配置
 *   - mode: 'number' | 'color' 游戏类型
 *   - digitCount: 4 | 5 位数/颜色数
 *   - allowRepeat: boolean 是否允许重复
 *   - modeIndex: 0-5 模式索引
 *   - date: string 日期字符串
 */
function getTodayConfig() {
  // 获取可靠的北京时间信息
  const { dateStr, dayOfWeek } = getBeijingTimeInfo();

  // 6种模式配置
  const modes = [
    { mode: 'number', digitCount: 4, allowRepeat: true },   // 0: 4位数字可重复
    { mode: 'number', digitCount: 4, allowRepeat: false },  // 1: 4位数字不重复
    { mode: 'number', digitCount: 5, allowRepeat: true },   // 2: 5位数字可重复
    { mode: 'number', digitCount: 5, allowRepeat: false },  // 3: 5位数字不重复
    { mode: 'color', digitCount: 4, allowRepeat: true },    // 4: 4色可重复
    { mode: 'color', digitCount: 4, allowRepeat: false }    // 5: 4色不重复
  ];

  // 【按星期几固定模式】
  // 0=周日, 1=周一, 2=周二, 3=周三, 4=周四, 5=周五, 6=周六
  const weeklyModeMap = [
    3,  // 周日: 5位数字不重复
    4,  // 周一: 4色可重复
    1,  // 周二: 4位数字不重复
    0,  // 周三: 4位数字可重复
    3,  // 周四: 5位数字不重复
    5,  // 周五: 4色不重复
    2,  // 周六: 5位数字可重复
  ];

  // 直接通过 0-6 的 index 获取今日模式
  const modeIndex = weeklyModeMap[dayOfWeek];

  return {
    ...modes[modeIndex],
    modeIndex, // 用于显示"今日模式X"
    date: dateStr
  };
}

/**
 * 获取指定日期的模式配置（用于测试）
 * @param {string} dateStr - 日期字符串 '2026-03-16'
 * @returns {Object} 模式配置
 */
function getTodayConfigForDate(dateStr) {
  // 6种模式配置
  const modes = [
    { mode: 'number', digitCount: 4, allowRepeat: true },
    { mode: 'number', digitCount: 4, allowRepeat: false },
    { mode: 'number', digitCount: 5, allowRepeat: true },
    { mode: 'number', digitCount: 5, allowRepeat: false },
    { mode: 'color', digitCount: 4, allowRepeat: true },
    { mode: 'color', digitCount: 4, allowRepeat: false }
  ];

  // 【按星期几固定模式】
  const weeklyModeMap = [
    3,  // 周日: 5位数字不重复
    4,  // 周一: 4色可重复
    1,  // 周二: 4位数字不重复
    0,  // 周三: 4位数字可重复
    3,  // 周四: 5位数字不重复
    5,  // 周五: 4色不重复
    2,  // 周六: 5位数字可重复
  ];

  // 根据日期字符串计算星期几
  const [year, month, day] = dateStr.split('-').map(Number);
  // 创建北京时间对应的 UTC 时间戳（北京时间 = UTC+8）
  const beijingTimestamp = Date.UTC(year, month - 1, day, 0, 0, 0) - (8 * 60 * 60 * 1000);
  const beijingDate = new Date(beijingTimestamp);
  const dayOfWeek = beijingDate.getUTCDay();
  const modeIndex = weeklyModeMap[dayOfWeek];

  return {
    ...modes[modeIndex],
    modeIndex,
    date: dateStr
  };
}

/**
 * 获取模式显示文本
 * @param {number} modeIndex - 模式索引 0-5
 * @returns {string} 模式描述文本
 */
function getModeDisplayText(modeIndex) {
  const modeDisplayText = {
    0: '4位数字（可重复）',
    1: '4位数字（不重复）',
    2: '5位数字（可重复）',
    3: '5位数字（不重复）',
    4: '4色猜谜（可重复）',
    5: '4色猜谜（不重复）'
  };
  return modeDisplayText[modeIndex] || '未知模式';
}

/**
 * 生成符合要求的答案
 * @param {string} mode - 'number' | 'color' 游戏类型
 * @param {number} digitCount - 位数/颜色数 4 或 5
 * @param {boolean} allowRepeat - 是否允许重复
 * @returns {Array} 答案数组
 */
function generateDailyAnswer(mode, digitCount = 4, allowRepeat = true) {
  const pool = mode === 'number'
    ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    : COLORS;

  while (true) {
    let answer = [];
    for (let i = 0; i < digitCount; i++) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      answer.push(pool[randomIndex]);
    }

    const uniqueCount = new Set(answer).size;

    if (allowRepeat) {
      // 可重复：去重后长度必须 >= digitCount - 1
      // 4位时 >=3，5位时 >=4
      if (uniqueCount >= digitCount - 1) return answer;
    } else {
      // 不重复：去重后长度必须等于 digitCount
      if (uniqueCount === digitCount) return answer;
    }
  }
}

/**
 * 获取用户每日挑战信息
 * 调用云函数 getDailyInfo 获取今日挑战状态和剩余次数
 * @returns {Promise<Object>} 包含挑战信息的对象
 */
async function getDailyInfo() {
  try {
    const { result } = await wx.cloud.callFunction({
      name: 'getDailyInfo'
    });
    return result;
  } catch (err) {
    console.error('获取每日挑战信息失败:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 开始每日挑战（原子扣减次数）
 * 调用云函数 startDailyChallenge 开始挑战并扣减次数
 * @returns {Promise<Object>} 包含挑战信息的对象
 */
async function startDailyChallenge() {
  try {
    const { result } = await wx.cloud.callFunction({
      name: 'startDailyChallenge'
    });
    return result;
  } catch (err) {
    console.error('开始挑战失败:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 提交每日挑战结果
 * @param {string} status - 'success' | 'quit' 挑战结果状态
 * @param {number} guessCount - 猜测次数
 * @param {number} timeUsed - 用时（秒）
 * @returns {Promise<Object>} 提交结果
 */
async function submitDailyResult(status, guessCount = 0, timeUsed = 0) {
  try {
    const { result } = await wx.cloud.callFunction({
      name: 'submitDailyResult',
      data: { status, guessCount, timeUsed }
    });
    return result;
  } catch (err) {
    console.error('提交结果失败:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 获取今日游戏类型
 * @returns {string} 'number' | 'color'
 */
function getTodayGameType() {
  const config = getTodayConfig();
  return config.mode;
}

/**
 * 获取今日日期字符串（中国时区）
 * @returns {string} '2026-03-10'
 */
function getTodayDateString() {
  // 使用 UTC 时间戳偏移法获取北京时间
  const { dateStr } = getBeijingTimeInfo();
  return dateStr;
}

// ==================== 模块导出 ====================

module.exports = {
  // 配置获取
  getTodayConfig,
  getTodayConfigForDate,
  getTodayGameType,
  getTodayDateString,

  // 答案生成
  generateDailyAnswer,

  // 显示文本
  getModeDisplayText,

  // 云函数调用
  getDailyInfo,
  startDailyChallenge,
  submitDailyResult,

  // 常量
  COLORS
};
