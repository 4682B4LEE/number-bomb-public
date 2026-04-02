// cloudfunctions/resetWeeklyRank/index.js
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

/**
 * 每周重置排行榜数据
 * 定时触发：每周一 00:00 执行（中国时区）
 */
exports.main = async (event, context) => {
  // 使用中国时区（东八区）
  const now = new Date();
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const weekKey = getWeekKey(chinaTime);
  
  console.log(`开始重置排行榜数据，当前周标记: ${weekKey}`);
  
  try {
    // 1. 获取所有用户数据
    const batchSize = 100;
    let offset = 0;
    let totalReset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const usersRes = await db.collection('user_stats')
        .skip(offset)
        .limit(batchSize)
        .get();
      
      const users = usersRes.data;
      if (users.length === 0) {
        hasMore = false;
        break;
      }
      
      // 2. 批量更新需要重置的用户
      const updatePromises = users.map(async (user) => {
        // 检查是否需要重置（跨周了）
        if (user.currentWeek !== weekKey) {
          try {
            await db.collection('user_stats').doc(user._id).update({
              data: {
                currentWeek: weekKey,
                weeklyWinCount: 0,
                weeklyLoseCount: 0,
                updateTime: db.serverDate()
              }
            });
            return 1;
          } catch (err) {
            console.error(`重置用户 ${user._id} 失败:`, err);
            return 0;
          }
        }
        return 0;
      });
      
      const results = await Promise.all(updatePromises);
      const resetCount = results.reduce((sum, r) => sum + r, 0);
      totalReset += resetCount;
      
      console.log(`处理 ${users.length} 个用户，重置 ${resetCount} 个`);
      
      offset += batchSize;
      hasMore = users.length === batchSize;
    }
    
    console.log(`排行榜重置完成，共重置 ${totalReset} 个用户`);
    
    return {
      success: true,
      weekKey: weekKey,
      resetCount: totalReset,
      message: `排行榜重置完成，共重置 ${totalReset} 个用户`
    };
    
  } catch (err) {
    console.error('排行榜重置失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

// 获取当前周标记，格式：2026_w10
function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}_w${week}`;
}

// 获取当前周数
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
