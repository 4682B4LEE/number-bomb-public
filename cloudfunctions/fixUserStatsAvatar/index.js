const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

/**
 * 修复 user_stats 集合中的头像数据
 * 从 user_avatars 集合同步头像到 user_stats
 */
exports.main = async (event, context) => {
  try {
    // 1. 获取所有需要修复的 user_stats 记录（avatarUrl 为空或不存在的）
    const statsRes = await db.collection('user_stats')
      .where({
        $or: [
          { avatarUrl: _.exists(false) },
          { avatarUrl: '' },
          { avatarUrl: null }
        ]
      })
      .limit(100)
      .get();

    console.log(`找到 ${statsRes.data.length} 条需要修复的记录`);

    let fixedCount = 0;
    let failedCount = 0;

    // 2. 逐个修复
    for (const stat of statsRes.data) {
      try {
        // 从 user_avatars 获取头像
        const avatarRes = await db.collection('user_avatars').doc(stat._id).get();
        
        if (avatarRes.data && avatarRes.data.avatar) {
          // 更新 user_stats
          await db.collection('user_stats').doc(stat._id).update({
            data: {
              avatarUrl: avatarRes.data.avatar,
              updateTime: db.serverDate()
            }
          });
          fixedCount++;
          console.log(`修复成功: ${stat._id}`);
        } else {
          console.log(`user_avatars 中没有头像: ${stat._id}`);
        }
      } catch (err) {
        failedCount++;
        console.error(`修复失败: ${stat._id}`, err);
      }
    }

    return {
      success: true,
      total: statsRes.data.length,
      fixed: fixedCount,
      failed: failedCount
    };
  } catch (err) {
    console.error('修复头像失败:', err);
    return { success: false, error: err.message };
  }
};
