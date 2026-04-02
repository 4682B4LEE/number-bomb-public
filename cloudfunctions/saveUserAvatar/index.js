const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 保存用户头像
 * 优化：同步更新 user_stats 和 daily_challenges 集合（数据冗余去 Join 化）
 */
exports.main = async (event, context) => {
  const { avatar, name } = event
  const { OPENID } = cloud.getWXContext()

  console.log('保存用户头像:', { OPENID, avatar, name })

  if (!OPENID) {
    console.log('未获取到用户openid')
    return { success: false, error: '未获取到用户openid' }
  }

  if (!avatar) {
    console.log('头像为空，不保存')
    return { success: false, error: '头像为空' }
  }

  try {
    // ========== 1. 更新 user_avatars 集合 ==========
    const userRes = await db.collection('user_avatars').doc(OPENID).get()
      .catch(() => null)

    console.log('查询现有记录:', userRes)

    if (userRes && userRes.data) {
      // 更新现有记录
      console.log('更新现有记录')
      await db.collection('user_avatars').doc(OPENID).update({
        data: {
          avatar: avatar,
          name: name || '',
          updateTime: db.serverDate()
        }
      })
    } else {
      // 创建新记录
      console.log('创建新记录')
      await db.collection('user_avatars').add({
        data: {
          _id: OPENID,
          avatar: avatar,
          name: name || '',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    }

    // ========== 2. 【新增】同步更新 user_stats 集合（数据冗余去 Join 化）==========
    // 这样排行榜查询时就不需要再查 user_avatars 了
    try {
      const statRes = await db.collection('user_stats').doc(OPENID).get();
      if (statRes && statRes.data) {
        await db.collection('user_stats').doc(OPENID).update({
          data: {
            nickname: name || statRes.data.nickname || '未知玩家',
            avatarUrl: avatar,
            updateTime: db.serverDate()
          }
        });
        console.log('[saveUserAvatar] 同步更新 user_stats 成功');
      }
    } catch (statErr) {
      // user_stats 不存在（用户还没打过游戏），忽略
      console.log('[saveUserAvatar] user_stats 不存在，无需同步');
    }

    // ========== 3. 【新增】同步更新 daily_challenges 集合 ==========
    // 更新今日的挑战记录（如果存在）
    try {
      const now = new Date();
      const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const today = chinaTime.toISOString().split('T')[0];
      const docId = `${today}_${OPENID}`;
      
      await db.collection('daily_challenges').doc(docId).update({
        data: {
          nickname: name || '',
          avatarUrl: avatar,
          updateTime: db.serverDate()
        }
      });
      console.log('[saveUserAvatar] 同步更新 daily_challenges 成功');
    } catch (dailyErr) {
      // 今日挑战记录不存在，忽略
      console.log('[saveUserAvatar] 今日 daily_challenges 不存在，无需同步');
    }

    console.log('保存用户头像成功')
    return { success: true }
  } catch (err) {
    console.error('保存用户头像失败:', err)
    return { success: false, error: err.message }
  }
}
