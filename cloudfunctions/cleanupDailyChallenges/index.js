// cloudfunctions/cleanupDailyChallenges/index.js
// 定时清理每日挑战历史记录
// 每天北京时间9:00执行，清理前两天及之前的数据，保留最近两天的数据

const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

/**
 * 获取中国时区今日日期字符串（YYYY-MM-DD）
 */
function getChinaDateString() {
  const now = new Date();
  // 转换为中国时区（UTC+8）
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return chinaTime.toISOString().split('T')[0];
}

/**
 * 获取前两天的日期字符串
 * @param {string} todayStr - 今天日期字符串 '2026-03-12'
 * @returns {string} 前两天日期字符串 '2026-03-10'
 */
function getTwoDaysAgo(todayStr) {
  const date = new Date(todayStr + 'T00:00:00.000Z');
  date.setDate(date.getDate() - 2);
  return date.toISOString().split('T')[0];
}

exports.main = async (event, context) => {
  console.log('开始清理每日挑战历史记录...');

  // 获取今日日期（中国时区）
  const today = getChinaDateString();
  // 获取前两天日期（保留昨天和今天的数据）
  const twoDaysAgo = getTwoDaysAgo(today);

  console.log(`今日日期: ${today}，清理截止日期: ${twoDaysAgo}（含）`);
  console.log('保留数据: 昨天和今天的挑战记录');

  try {
    // 查询需要删除的记录数（用于日志）
    const countRes = await db.collection('daily_challenges')
      .where({
        date: _.lte(twoDaysAgo)  // 清理前两天及之前的记录，保留昨天和今天的数据
      })
      .count();

    const totalToDelete = countRes.total;
    console.log(`待清理记录数: ${totalToDelete}`);

    if (totalToDelete === 0) {
      return {
        success: true,
        message: '无需清理',
        deletedCount: 0,
        today,
        twoDaysAgo,
        keepDays: '昨天和今天'
      };
    }

    // 批量删除（每次最多100条）
    let deletedCount = 0;
    let batchCount = 0;
    const maxBatches = 50;  // 最多50批次，防止无限循环

    while (deletedCount < totalToDelete && batchCount < maxBatches) {
      // 获取一批记录
      const batchRes = await db.collection('daily_challenges')
        .where({
          date: _.lte(twoDaysAgo)
        })
        .limit(100)
        .get();

      if (batchRes.data.length === 0) {
        break;
      }

      // 批量删除
      const deletePromises = batchRes.data.map(item => {
        return db.collection('daily_challenges').doc(item._id).remove();
      });

      await Promise.all(deletePromises);

      deletedCount += batchRes.data.length;
      batchCount++;

      console.log(`第 ${batchCount} 批清理完成，已删除 ${deletedCount}/${totalToDelete} 条`);
    }

    console.log(`清理完成，共删除 ${deletedCount} 条记录`);

    return {
      success: true,
      message: '清理成功',
      deletedCount,
      today,
      twoDaysAgo,
      batchCount,
      keepDays: '昨天和今天'
    };

  } catch (err) {
    console.error('清理失败:', err);
    return {
      success: false,
      error: err.message,
      today,
      twoDaysAgo
    };
  }
};
