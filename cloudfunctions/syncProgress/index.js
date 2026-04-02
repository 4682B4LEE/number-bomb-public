// 云函数：syncProgress
// 功能：获取或初始化玩家进度存档

const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 云函数入口函数
 * 如果玩家没有进度记录，自动创建初始记录
 * @param {Object} event - 调用参数
 * @param {Object} context - 云函数上下文
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  try {
    // 查询玩家进度
    const progressRes = await db.collection('puzzle_progress').doc(OPENID).get();

    if (progressRes.data) {
      // 已有记录，直接返回
      // 【简化】不再返回 levelRecords，只返回进度和星星总数
      console.log('[syncProgress] 获取进度成功:', progressRes.data);
      return {
        success: true,
        message: '获取进度成功',
        data: {
          unlockedLevel: progressRes.data.unlockedLevel || 1,
          totalCompleted: progressRes.data.totalCompleted || 0,
          unlockedRangeEnd: progressRes.data.unlockedRangeEnd || 40,
          totalStars: progressRes.data.totalStars || 0, // 【简化】只返回星星总数
          updateTime: progressRes.data.updateTime
        }
      };
    }

  } catch (err) {
    // 记录不存在，需要创建新记录
    if (err.errCode === -1 || err.message.includes('document not found')) {
      console.log('[syncProgress] 新玩家，创建初始进度');
      
      try {
        // 创建初始进度记录
        await db.collection('puzzle_progress').add({
          data: {
            _id: OPENID,
            unlockedLevel: 1,      // 初始解锁第1关
            totalCompleted: 0,     // 初始通关次数为0
            updateTime: db.serverDate()
          }
        });

        return {
          success: true,
          message: '初始化进度成功',
          data: {
            unlockedLevel: 1,
            totalCompleted: 0
          }
        };
      } catch (createErr) {
        console.error('[syncProgress] 创建进度失败:', createErr);
        return {
          success: false,
          message: '创建进度失败',
          error: createErr.message
        };
      }
    }

    // 其他错误
    console.error('[syncProgress] 查询失败:', err);
    return {
      success: false,
      message: '获取进度失败',
      error: err.message
    };
  }
};
