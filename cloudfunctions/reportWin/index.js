// 云函数：reportWin
// 功能：玩家通关后静默上报进度，更新 puzzle_progress 集合
// 注意：此函数仅用于上报进度，所有答案校验都在前端本地完成

const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 云函数入口函数
 * @param {Object} event - 调用参数
 *   @param {number} event.levelId - 通关的关卡ID
 *   @param {number} event.unlockedLevel - 新的最高解锁关卡
 *   @param {number} event.totalCompleted - 新的累计通关总数
 *   @param {number} event.totalStars - 【简化】星星总数（用于排行榜）
 * @param {Object} context - 云函数上下文
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { levelId, unlockedLevel, totalCompleted, totalStars } = event;

  // 参数校验
  if (!levelId || typeof unlockedLevel !== 'number' || typeof totalCompleted !== 'number') {
    return {
      success: false,
      message: '参数错误：levelId, unlockedLevel, totalCompleted 不能为空'
    };
  }

  try {
    // 查询玩家是否已有进度记录
    const progressRes = await db.collection('puzzle_progress').doc(OPENID).get();

    if (progressRes.data) {
      // 已有记录，更新进度
      // 使用 _.max 确保 unlockedLevel 只增不减
      // 使用 _.inc 确保 totalCompleted 正确累加
      const updateData = {
        unlockedLevel: _.max(unlockedLevel),
        totalCompleted: _.inc(1), // 云端安全地累加1
        updateTime: db.serverDate()
      };

      // 【简化】如果有星星总数，保存到 totalStars 字段（用于排行榜）
      if (typeof totalStars === 'number') {
        updateData.totalStars = totalStars;
      }

      await db.collection('puzzle_progress').doc(OPENID).update({
        data: updateData
      });
    } else {
      // 新玩家，创建初始记录
      const newData = {
        _id: OPENID,
        unlockedLevel: unlockedLevel,
        totalCompleted: 1, // 首次通关
        updateTime: db.serverDate()
      };

      // 【简化】如果有星星总数，保存到 totalStars 字段
      if (typeof totalStars === 'number') {
        newData.totalStars = totalStars;
      }

      await db.collection('puzzle_progress').add({
        data: newData
      });
    }

    console.log('[reportWin] 上报成功:', {
      openid: OPENID,
      levelId,
      unlockedLevel,
      totalCompleted,
      totalStars
    });

    return {
      success: true,
      message: '进度上报成功',
      data: {
        levelId,
        unlockedLevel,
        totalCompleted,
        totalStars
      }
    };

  } catch (err) {
    console.error('[reportWin] 上报失败:', err);
    return {
      success: false,
      message: '进度上报失败',
      error: err.message
    };
  }
};
