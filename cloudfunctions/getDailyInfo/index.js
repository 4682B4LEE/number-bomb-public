// cloudfunctions/getDailyInfo/index.js
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

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
 * 支持6种模式轮换：4位数字(可重复/不重复)、5位数字(可重复/不重复)、4色(可重复/不重复)
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
    { mode: 'number', digitCount: 4, allowRepeat: true },   // 0: 4位数字可重复
    { mode: 'number', digitCount: 4, allowRepeat: false },  // 1: 4位数字不重复
    { mode: 'number', digitCount: 5, allowRepeat: true },   // 2: 5位数字可重复
    { mode: 'number', digitCount: 5, allowRepeat: false },  // 3: 5位数字不重复
    { mode: 'color', digitCount: 4, allowRepeat: true },    // 4: 4色可重复
    { mode: 'color', digitCount: 4, allowRepeat: false }    // 5: 4色不重复
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
 * 确保集合存在（自动创建）
 */
async function ensureCollection(today) {
  try {
    // 使用带条件的查询代替全表查询，避免慢查询
    // 利用 date 字段索引提高查询效率
    await db.collection('daily_challenges')
      .where({ date: today || '2026-01-01' })
      .limit(1)
      .get();
  } catch (err) {
    // 集合不存在，尝试创建
    if (err.errCode === -502005 || err.message.includes('not exist')) {
      console.log('集合不存在，尝试创建...');
      try {
        await db.createCollection('daily_challenges');
        console.log('集合创建成功');
      } catch (createErr) {
        // 可能是权限问题或集合已存在
        console.log('创建集合失败（可能已存在）:', createErr.message);
      }
    }
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 获取今日日期（中国时区）
  const { dateStr: today } = getBeijingTimeInfo();
  const docId = `${today}_${openid}`;

  // 获取今日模式配置
  const config = getTodayConfig();
  
  try {
    // 首先确保集合存在（传入today以优化查询）
    await ensureCollection(today);
    
    // 尝试获取今日记录
    let doc;
    try {
      doc = await db.collection('daily_challenges').doc(docId).get();
    } catch (err) {
      // 记录不存在，需要创建
      doc = null;
    }
    
    if (!doc) {
      // 获取用户信息
      let userInfo = null;
      try {
        const userRes = await db.collection('user_avatars').doc(openid).get();
        if (userRes.data && userRes.data.name && userRes.data.avatar) {
          userInfo = {
            nickname: userRes.data.name,
            avatarUrl: userRes.data.avatar
          };
        }
      } catch (e) {
        // 用户头像不存在
      }
      
      // 如果用户信息不完整，返回错误要求先登录
      if (!userInfo) {
        return {
          success: false,
          error: '请先登录并授权头像和昵称',
          needLogin: true
        };
      }
      
      // 创建新记录
      await db.collection('daily_challenges').add({
        data: {
          _id: docId,
          _openid: openid,
          date: today,
          dateKey: today.replace(/-/g, ''),
          nickname: userInfo.nickname,
          avatarUrl: userInfo.avatarUrl,
          mode: config.mode,
          digitCount: config.digitCount,  // 新增：位数/颜色数
          allowRepeat: config.allowRepeat,
          modeIndex: config.modeIndex,  // 新增：模式索引
          attemptsLeft: 2,
          totalAttempts: 2,
          extraAttemptsFromAd: 0,  // 新增：通过广告获得的额外次数
          bestScore: null,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          lastAttemptTime: null
        }
      });

      return {
        success: true,
        isNew: true,
        attemptsLeft: 2,
        extraAttemptsFromAd: 0,  // 新增：返回广告次数
        mode: config.mode,
        digitCount: config.digitCount,  // 新增：返回位数
        allowRepeat: config.allowRepeat,
        modeIndex: config.modeIndex,  // 新增：返回模式索引
        bestScore: null,
        date: today
      };
    }
    
    // 返回已有记录
    return {
      success: true,
      isNew: false,
      attemptsLeft: doc.data.attemptsLeft,
      extraAttemptsFromAd: doc.data.extraAttemptsFromAd || 0,  // 新增：返回广告次数（兼容旧数据）
      mode: doc.data.mode,
      digitCount: doc.data.digitCount || 4,  // 新增：返回位数（兼容旧数据）
      allowRepeat: doc.data.allowRepeat,
      modeIndex: doc.data.modeIndex !== undefined ? doc.data.modeIndex : 0,  // 新增：返回模式索引（兼容旧数据）
      bestScore: doc.data.bestScore,
      date: today
    };
    
  } catch (err) {
    console.error('获取每日挑战信息失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
