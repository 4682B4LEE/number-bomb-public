// 云函数：getLevels
// 功能：分页获取关卡数据，避免一次性加载过多数据造成性能问题

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
 *   @param {number} event.startLevel - 起始关卡ID（包含）
 *   @param {number} event.endLevel - 结束关卡ID（包含）
 * @param {Object} context - 云函数上下文
 */
exports.main = async (event, context) => {
  const { startLevel = 1, endLevel = 50 } = event;

  try {
    // 从云端题库集合查询指定范围的关卡
    // 使用 levelId 字段进行范围查询
    const levelsRes = await db.collection('puzzle_levels')
      .where({
        levelId: _.gte(startLevel).and(_.lte(endLevel))
      })
      .orderBy('levelId', 'asc')
      .get();

    // 格式化返回数据，适配前端使用的字段名
    const formattedLevels = levelsRes.data.map(item => ({
      id: item.levelId,
      difficulty: item.difficulty,
      starLevel: item.starLevel,
      maxSteps: item.maxSteps,
      answer: item.answer,
      clues: item.clues || []
    }));

    console.log('[getLevels] 查询成功:', {
      startLevel,
      endLevel,
      count: formattedLevels.length
    });

    return {
      success: true,
      message: '获取关卡成功',
      data: formattedLevels
    };

  } catch (err) {
    console.error('[getLevels] 查询失败:', err);
    return {
      success: false,
      message: '获取关卡失败',
      error: err.message
    };
  }
};
