// 云函数：更新对局记录
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { recordId, recordData } = event
  const { OPENID } = cloud.getWXContext()

  console.log('更新记录 - recordId:', recordId)
  console.log('更新记录 - OPENID:', OPENID)

  // 检查 OPENID
  if (!OPENID) {
    console.error('无法获取用户 OPENID')
    return {
      success: false,
      message: '无法获取用户身份',
      error: 'OPENID is null'
    }
  }

  // 检查 recordId
  if (!recordId) {
    return {
      success: false,
      message: '记录ID不能为空',
      error: 'recordId is null'
    }
  }

  try {
    // 更新数据库记录
    const res = await db.collection('records').doc(recordId).update({
      data: {
        ...recordData,
        updateTime: new Date()
      }
    })

    console.log('更新成功:', res)

    return {
      success: true,
      message: '对局记录更新成功',
      recordId: recordId,
      stats: res.stats
    }
  } catch (err) {
    console.error('更新对局记录失败', err)
    return {
      success: false,
      message: '更新对局记录失败: ' + err.message,
      error: err
    }
  }
}
