// cloudfunctions/getDailyRank/index.js
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;
// 引入匿名工具
const anonymousUtil = require('./anonymousUtil');

/**
 * 获取稳定可靠的北京时间（UTC+8）日期信息
 * 使用 UTC 时间戳偏移法，避免时区问题
 * @returns {Object} 包含年月日和星期几的对象
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
 * 获取今日模式配置
 * 支持6种模式轮换
 *
 * 【过渡期设置】
 * - 2026-03-16：4位数字可重复
 * - 2026-03-17：4位数字不重复
 * - 2026-03-18 起：自定义轮换顺序
 */
function getTodayConfig() {
  // 获取可靠的北京时间信息
  const { dateStr, dayOfWeek } = getBeijingTimeInfo();

  // 【过渡期】今天（3月16日）固定为4位数字可重复
  if (dateStr === '2026-03-16') {
    return {
      mode: 'number',
      digitCount: 4,
      allowRepeat: true,
      modeIndex: 0,
      date: dateStr
    };
  }

  // 【过渡期】明天（3月17日）固定为4位数字不重复
  if (dateStr === '2026-03-17') {
    return {
      mode: 'number',
      digitCount: 4,
      allowRepeat: false,
      modeIndex: 1,
      date: dateStr
    };
  }

  // 6种模式配置
  const modes = [
    { mode: 'number', digitCount: 4, allowRepeat: true },
    { mode: 'number', digitCount: 4, allowRepeat: false },
    { mode: 'number', digitCount: 5, allowRepeat: true },
    { mode: 'number', digitCount: 5, allowRepeat: false },
    { mode: 'color', digitCount: 4, allowRepeat: true },
    { mode: 'color', digitCount: 4, allowRepeat: false }
  ];

  // 【按星期几固定模式】3月19日起
  // 0=周日, 1=周一, 2=周二, 3=周三, 4=周四, 5=周五, 6=周六
  // 要修改某天的模式，只需改下面的数组
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
    modeIndex,
    date: dateStr
  };
}

/**
 * 获取模式显示文本
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

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  const { page = 0 } = event;
  const pageSize = 20;
  const maxRank = 100;
  const skip = page * pageSize;
  
  // 如果已经超过100名，直接返回空
  if (skip >= maxRank) {
    return {
      success: true,
      list: [],
      myRank: null,
      myBestScore: null,
      myAttemptsLeft: null,
      hasRecord: false,
      page,
      hasMore: false
    };
  }
  
  // 获取今日日期（中国时区）
  const { dateStr: today } = getBeijingTimeInfo();

  // 获取今日模式配置
  const todayConfig = getTodayConfig();

  try {
    // 1. 获取今日排行榜（有成绩的）
    // 排序：guessCount 升序 → timeUsed 升序 → achievedAt 升序（同分先达成者胜）
    // 限制最多100条：计算实际limit，确保不超过100名
    const actualLimit = Math.min(pageSize, maxRank - skip);
    
    const rankRes = await db.collection('daily_challenges')
      .where({
        date: today,
        bestScore: _.neq(null)  // 有成绩的才显示
      })
      .orderBy('bestScore.guessCount', 'asc')   // 猜测次数升序
      .orderBy('bestScore.timeUsed', 'asc')     // 用时升序
      .orderBy('bestScore.achievedAt', 'asc')   // 达成时间升序（同分先达成者胜）
      .skip(skip)
      .limit(actualLimit)
      .get();
    
    // 2. 组装列表数据（实时脱敏）
    const list = rankRes.data.map((item, index) => {
      const rank = skip + index + 1;
      const timeUsed = item.bestScore.timeUsed;
      const mins = Math.floor(timeUsed / 60);
      const secs = timeUsed % 60;
      const timeText = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      return {
        id: item._openid,
        rank: rank,
        // 【关键】使用匿名昵称替换真实昵称
        nickname: anonymousUtil.generateAnonymousName(item._openid),
        // 【关键】使用匿名头像替换真实头像
        avatarUrl: anonymousUtil.generateDefaultAvatar(item._openid),
        guessCount: item.bestScore.guessCount,
        timeUsed: timeUsed,
        timeText: timeText,
        // 格式化显示：X次 Y秒
        scoreText: `${item.bestScore.guessCount}次 ${timeUsed}秒`,
        subText: `${item.bestScore.guessCount}次猜中 · ${timeText}`,
        // 根据名次显示称号
        title: getRankTitle(rank),
        isAnonymous: true // 标记为匿名展示
      };
    });
    
    // 3. 查询当前用户的排名和剩余次数（始终返回实时数据）
    let myRank = null;
    let myBestScore = null;
    let myAttemptsLeft = 2;  // 默认2次
    let hasRecord = false;
    
    try {
      const myDoc = await db.collection('daily_challenges').doc(`${today}_${openid}`).get();
      
      if (myDoc.data) {
        hasRecord = true;
        myAttemptsLeft = myDoc.data.attemptsLeft;
        
        if (myDoc.data.bestScore) {
          myBestScore = myDoc.data.bestScore;
          
          // ⚠️ 查询自己名次的语法防坑：
          // 1. 必须使用点表示法如 'bestScore.guessCount'
          // 2. _.or 必须配合 _.and 使用，否则会导致 JS 语法错误（SyntaxError: Unexpected token '.'）
          // 查找当天比我排名高的人数（正确语法：_.and 包裹 _.or）
          const betterCount = await db.collection('daily_challenges').where(
            _.and([
              { date: today },
              { bestScore: _.neq(null) },
              _.or([
                { 'bestScore.guessCount': _.lt(myBestScore.guessCount) },
                { 
                  'bestScore.guessCount': myBestScore.guessCount, 
                  'bestScore.timeUsed': _.lt(myBestScore.timeUsed) 
                },
                {
                  'bestScore.guessCount': myBestScore.guessCount, 
                  'bestScore.timeUsed': myBestScore.timeUsed,
                  'bestScore.achievedAt': _.lt(myBestScore.achievedAt)
                }
              ])
            ])
          ).count();
          
          myRank = betterCount.total + 1;
        }
      }
    } catch (e) {
      // 用户今日无记录，使用默认值（2次机会）
      console.log('用户今日无记录，使用默认值');
      myAttemptsLeft = 2;
    }
    
    // 4. 判断是否还有更多
    const currentMaxRank = skip + list.length;
    const hasMore = list.length === pageSize && currentMaxRank < maxRank;
    
    return {
      success: true,
      list,
      myRank,
      myBestScore,
      myAttemptsLeft,
      hasRecord,
      date: today,
      page,
      hasMore,
      // 新增：今日模式信息
      mode: todayConfig.mode,
      digitCount: todayConfig.digitCount,
      allowRepeat: todayConfig.allowRepeat,
      modeIndex: todayConfig.modeIndex,
      modeDisplayText: getModeDisplayText(todayConfig.modeIndex)
    };
    
  } catch (err) {
    console.error('获取每日排行榜失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * 格式化时间（秒 -> 分:秒）
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 根据名次获取称号
 */
function getRankTitle(rank) {
  if (rank === 1) return '人形自走外挂';
  if (rank >= 2 && rank <= 5) return '次世代速通仙人';
  if (rank >= 6 && rank <= 10) return '大脑已超频';
  if (rank >= 11 && rank <= 30) return '也是个狠人';
  if (rank >= 31 && rank <= 50) return '极致的求生欲';
  if (rank >= 51 && rank <= 99) return '实力有一点但不多';
  if (rank === 100) return '压线狂魔';
  return '挑战者';
}
