// 云函数：获取对局记录
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { mode = 'all' } = event  // 模式: 'number' | 'color' | 'online' | 'all'

  console.log('获取记录 - OPENID:', OPENID, '模式:', mode)

  if (!OPENID) {
    console.error('无法获取用户 OPENID')
    return {
      success: false,
      message: '无法获取用户身份',
      error: 'OPENID is null'
    }
  }

  try {
    // 构建查询条件
    let whereCondition = {
      _openid: OPENID
    }

    // 根据模式添加筛选条件
    if (mode === 'number') {
      // 猜数字模式: gt='number' 且 gm!='online'
      whereCondition = {
        _openid: OPENID,
        gt: 'number',
        gm: _.neq('online')
      }
    } else if (mode === 'color') {
      // 猜颜色模式: gt='color' 且 gm!='online'
      whereCondition = {
        _openid: OPENID,
        gt: 'color',
        gm: _.neq('online')
      }
    } else if (mode === 'online') {
      // 联机模式: gm='online' 或 gt='online'
      whereCondition = {
        _openid: OPENID,
        $or: [
          { gm: 'online' },
          { gt: 'online' }
        ]
      }
    }

    // 查询当前用户的对局记录
    // 先按 ct 降序排序，再限制20条（确保获取最新的20条）
    const res = await db.collection('records')
      .where(whereCondition)
      .orderBy('ct', 'desc')
      .limit(20)
      .get()

    // 返回查询结果
    const sortedData = res.data

    console.log('获取记录成功，数量:', sortedData.length, '模式:', mode)
    if (sortedData.length > 0) {
      console.log('第一条记录:', JSON.stringify(sortedData[0], null, 2))
      // 检查是否有 timeout 记录
      const timeoutRecords = sortedData.filter(r => r.rs === 'timeout' || r.reason === 'timeout')
      console.log('时间到记录数量:', timeoutRecords.length)
    }

    return {
      success: true,
      data: sortedData,
      count: sortedData.length
    }
  } catch (err) {
    console.error('获取对局记录失败', err)
    return {
      success: false,
      message: '获取对局记录失败: ' + err.message,
      error: err
    }
  }
}
