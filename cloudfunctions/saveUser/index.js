// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 云函数入口函数
 * 优化：同步更新 user_stats 和 user_avatars 集合（数据冗余去 Join 化）
 */
exports.main = async (event, context) => {
  const { userInfo, loginTime } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // ========== 1. 更新 users 集合 ==========
    const userRes = await db.collection('users').where({
      _openid: OPENID
    }).get()

    if (userRes.data.length > 0) {
      // 用户已存在，更新登录时间
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: {
          lastLoginTime: loginTime,
          loginCount: db.command.inc(1),
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName
        }
      })
    } else {
      // 新用户，创建记录
      await db.collection('users').add({
        data: {
          _openid: OPENID,
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName,
          gender: userInfo.gender,
          country: userInfo.country,
          province: userInfo.province,
          city: userInfo.city,
          createTime: loginTime,
          lastLoginTime: loginTime,
          loginCount: 1
        }
      })
    }

    // ========== 2. 【新增】同步更新 user_stats 集合（数据冗余去 Join 化）==========
    try {
      const statRes = await db.collection('user_stats').doc(OPENID).get();
      if (statRes && statRes.data) {
        await db.collection('user_stats').doc(OPENID).update({
          data: {
            nickname: userInfo.nickName || statRes.data.nickname || '未知玩家',
            avatarUrl: userInfo.avatarUrl || statRes.data.avatarUrl || '',
            updateTime: db.serverDate()
          }
        });
        console.log('[saveUser] 同步更新 user_stats 成功');
      }
    } catch (statErr) {
      // user_stats 不存在，忽略
      console.log('[saveUser] user_stats 不存在，无需同步');
    }

    // ========== 3. 【新增】同步更新 user_avatars 集合 ==========
    try {
      const avatarRes = await db.collection('user_avatars').doc(OPENID).get();
      if (avatarRes && avatarRes.data) {
        await db.collection('user_avatars').doc(OPENID).update({
          data: {
            avatar: userInfo.avatarUrl,
            name: userInfo.nickName || '',
            updateTime: db.serverDate()
          }
        });
      } else {
        await db.collection('user_avatars').add({
          data: {
            _id: OPENID,
            avatar: userInfo.avatarUrl,
            name: userInfo.nickName || '',
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
      }
      console.log('[saveUser] 同步更新 user_avatars 成功');
    } catch (avatarErr) {
      console.log('[saveUser] 同步 user_avatars 失败:', avatarErr);
    }

    return {
      success: true,
      message: userRes.data.length > 0 ? '用户登录信息已更新' : '新用户创建成功',
      isNewUser: userRes.data.length === 0
    }
  } catch (err) {
    console.error('保存用户信息失败', err)
    return {
      success: false,
      message: '保存用户信息失败',
      error: err
    }
  }
}
