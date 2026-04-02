// 云函数：保存对局记录
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { recordData } = event
  const { OPENID } = cloud.getWXContext()

  console.log('保存记录 - OPENID:', OPENID)
  console.log('保存记录 - recordData:', JSON.stringify(recordData, null, 2))

  // 检查 OPENID
  if (!OPENID) {
    console.error('无法获取用户 OPENID')
    return {
      success: false,
      message: '无法获取用户身份',
      error: 'OPENID is null'
    }
  }

  try {
    // 添加用户openid和创建时间
    const record = {
      ...recordData,
      _openid: OPENID,
      createTime: new Date()
    }

    console.log('准备保存的记录:', JSON.stringify(record, null, 2))

    // 保存到数据库
    const res = await db.collection('records').add({
      data: record
    })

    console.log('保存成功，记录ID:', res._id)

    return {
      success: true,
      message: '对局记录保存成功',
      recordId: res._id
    }
  } catch (err) {
    console.error('保存对局记录失败', err)
    return {
      success: false,
      message: '保存对局记录失败: ' + err.message,
      error: err
    }
  }
}
