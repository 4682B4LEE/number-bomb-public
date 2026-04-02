// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, payload } = event

  try {
    // 1. 获取当前用户的反馈列表
    if (action === 'getFeedbackList') {
      const result = await db.collection('feedbacks')
        .where({
          _openid: openid
        })
        .orderBy('createTime', 'desc')
        .get()
      
      // 格式化时间给前端
      const list = result.data.map(item => {
        const date = new Date(item.createTime);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        
        return {
          ...item,
          time: `${yyyy}-${mm}-${dd}`,
          fullTime: `${yyyy}-${mm}-${dd} ${hh}:${min}`
        }
      });
      return { success: true, data: list }
    }

    // 2. 提交新的反馈
    if (action === 'submitFeedback') {
      const { nickname, type, typeClass, content, version } = payload

      const insertResult = await db.collection('feedbacks').add({
        data: {
          _openid: openid,
          nickname,
          type,
          typeClass,
          content,
          version: version || 'v1.0.0',
          status: '待处理',
          reply: null,
          createTime: db.serverDate() // 使用数据库时间
        }
      })
      return { success: true, id: insertResult._id }
    }

    // 3. 检查是否有未读的反馈回复
    if (action === 'checkUnread') {
      // 查询用户所有 reply 字段不为空的反馈
      const result = await db.collection('feedbacks')
        .where({
          _openid: openid,
          reply: db.command.neq(null)
        })
        .get()

      // 返回有回复的反馈ID列表
      const repliedIds = result.data.map(item => item._id)

      return {
        success: true,
        hasUnread: result.data.length > 0,
        repliedIds: repliedIds
      }
    }

    // 4. 获取有回复的反馈ID列表
    if (action === 'getRepliedIds') {
      // 查询用户所有 reply 字段不为空的反馈
      const result = await db.collection('feedbacks')
        .where({
          _openid: openid,
          reply: db.command.neq(null)
        })
        .get()

      // 返回有回复的反馈ID列表
      const repliedIds = result.data.map(item => item._id)

      return {
        success: true,
        repliedIds: repliedIds
      }
    }

    return { success: false, msg: '未知的 action' }

  } catch (err) {
    console.error(err)
    return { success: false, msg: err.message }
  }
}
