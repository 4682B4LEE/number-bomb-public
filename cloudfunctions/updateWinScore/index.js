// cloudfunctions/updateWinScore/index.js
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

/**
 * 安全上报胜场
 * 使用 _id: openid 作为主键，防止高并发重复创建
 * 扁平化周统计字段，避免动态 Key 索引问题
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 获取当前周 key（中国时区）
  const now = new Date();
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const weekKey = getWeekKey(chinaTime);

  try {
    // 先尝试更新（用户已存在的情况，高并发安全）
    try {
      const userDoc = await db.collection('user_stats').doc(openid).get();
      const userData = userDoc.data;

      // 检查是否需要重置周统计（跨周了）
      const isSameWeek = userData.currentWeek === weekKey;

      await db.collection('user_stats').doc(openid).update({
        data: {
          // 总统计累加
          totalWin: _.inc(1),
          totalMatches: _.inc(1),

          // 扁平化周统计处理
          currentWeek: weekKey,
          weeklyWinCount: isSameWeek ? _.inc(1) : 1,
          // 如果跨周，重置本周败场为 0；否则保持不变
          weeklyLoseCount: isSameWeek ? userData.weeklyLoseCount : 0,

          updateTime: db.serverDate()
        }
      });

      return { success: true, message: '胜场上报成功' };

    } catch (err) {
      // 用户不存在，需要创建（进入 catch 说明 doc 不存在）
      if (err.errCode === -1 || err.message.includes('document not found')) {
        await db.collection('user_stats').add({
          data: {
            _id: openid,              // 使用 openid 作为主键
            _openid: openid,          // 同时保存到 _openid 字段
            nickname: event.nickname || '未知玩家',
            avatarUrl: event.avatarUrl || '',

            // 总统计
            totalWin: 1,
            totalLose: 0,
            totalMatches: 1,

            // 扁平化周统计
            currentWeek: weekKey,
            weeklyWinCount: 1,
            weeklyLoseCount: 0,

            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });

        return { success: true, message: '新用户创建成功' };
      }

      // 其他错误抛出
      throw err;
    }

  } catch (err) {
    console.error('上报胜场失败', err);
    return { success: false, error: err.message };
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
