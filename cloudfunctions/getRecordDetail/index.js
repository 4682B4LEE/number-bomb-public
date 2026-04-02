// 云函数：获取对局详情
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { recordId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 查询对局记录
    const res = await db.collection('records').doc(recordId).get()

    if (!res.data) {
      return {
        success: false,
        message: '对局记录不存在'
      }
    }

    // 验证是否是当前用户的记录
    if (res.data._openid !== OPENID) {
      return {
        success: false,
        message: '无权查看此记录'
      }
    }

    return {
      success: true,
      data: res.data
    }
  } catch (err) {
    console.error('获取对局详情失败', err)
    return {
      success: false,
      message: '获取对局详情失败',
      error: err
    }
  }
}
