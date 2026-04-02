// cloudfunctions/startDailyChallenge/index.js
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

/**
 * 获取稳定可靠的北京时间（UTC+8）日期字符串
 * 使用 UTC 时间戳偏移法，避免时区问题
 * @returns {string} YYYY-MM-DD 格式日期
 */
function getBeijingDateString() {
  const now = new Date();

  // 核心逻辑：获取当前 UTC 时间戳，并强制加上 8 小时（北京时间偏移量）
  const beijingTimestamp = now.getTime() + (8 * 60 * 60 * 1000);

  // 创建一个"概念上"的北京时间 Date 对象
  const beijingDate = new Date(beijingTimestamp);

  // 必须使用 getUTC* 方法来获取对应的值
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  const today = getBeijingDateString();
  const docId = `${today}_${openid}`;
  
  try {
    // ⚠️ 安全逻辑：必须使用原子更新，禁止先 get() 后 update()
    // 并发锁：剩余次数必须大于0才能更新
    const res = await db.collection('daily_challenges').where({
      _id: docId,
      attemptsLeft: _.gt(0) // 并发锁条件
    }).update({
      data: { 
        attemptsLeft: _.inc(-1),
        lastAttemptTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });
    
    // 检查是否成功更新
    if (res.stats.updated === 0) {
      return {
        success: false,
        error: '今日挑战次数已用尽或操作频繁'
      };
    }
    
    // 获取更新后的记录
    const doc = await db.collection('daily_challenges').doc(docId).get();

    return {
      success: true,
      attemptsLeft: doc.data.attemptsLeft,
      mode: doc.data.mode,
      digitCount: doc.data.digitCount || 4,  // 新增：返回位数信息
      allowRepeat: doc.data.allowRepeat,
      modeIndex: doc.data.modeIndex !== undefined ? doc.data.modeIndex : 0  // 新增：返回模式索引
    };
    
  } catch (err) {
    console.error('开始挑战失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
