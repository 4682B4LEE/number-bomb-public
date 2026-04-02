// cloudfunctions/updateLoseScore/index.js
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

/**
 * 安全上报败场（洗碗次数）
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 获取当前周 key（中国时区）
  const now = new Date();
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const weekKey = getWeekKey(chinaTime);

  try {
    // 先尝试更新
    try {
      const userDoc = await db.collection('user_stats').doc(openid).get();
      const userData = userDoc.data;

      const isSameWeek = userData.currentWeek === weekKey;

      await db.collection('user_stats').doc(openid).update({
        data: {
          totalLose: _.inc(1),
          totalMatches: _.inc(1),

          currentWeek: weekKey,
          weeklyLoseCount: isSameWeek ? _.inc(1) : 1,
          weeklyWinCount: isSameWeek ? userData.weeklyWinCount : 0,

          updateTime: db.serverDate()
        }
      });

      return { success: true, message: '败场上报成功' };

    } catch (err) {
      // 用户不存在，创建新记录
      if (err.errCode === -1 || err.message.includes('document not found')) {
        await db.collection('user_stats').add({
          data: {
            _id: openid,
            _openid: openid,
            nickname: event.nickname || '未知玩家',
            avatarUrl: event.avatarUrl || '',

            totalWin: 0,
            totalLose: 1,
            totalMatches: 1,

            currentWeek: weekKey,
            weeklyWinCount: 0,
            weeklyLoseCount: 1,

            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });

        return { success: true, message: '新用户创建成功' };
      }

      throw err;
    }

  } catch (err) {
    console.error('上报败场失败', err);
    return { success: false, error: err.message };
  }
};

function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}_w${week}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
