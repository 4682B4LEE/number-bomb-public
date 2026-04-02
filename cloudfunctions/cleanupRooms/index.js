// 云函数：定时清理过期房间
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  console.log('开始清理过期房间...')
  
  const now = new Date()
  
  try {
    // 1. 清理过期的 waiting 状态房间（超过5分钟未加入）
    const waitingRes = await db.collection('rooms')
      .where({
        status: 'waiting',
        expireAt: _.lt(now)
      })
      .get()
    
    console.log(`找到 ${waitingRes.data.length} 个过期的 waiting 房间`)
    
    for (const room of waitingRes.data) {
      try {
        await db.collection('rooms').doc(room._id).remove()
        try { await db.collection('room_secrets').doc(room._id).remove() } catch(e) {}
        console.log(`已删除过期 waiting 房间: ${room._id}`)
      } catch (e) {
        console.error(`删除房间失败 ${room._id}:`, e)
      }
    }
    
    // 2. 清理长期 stuck 的 setting/playing 房间（超过30分钟无活动）
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const stuckRes = await db.collection('rooms')
      .where({
        status: _.in(['setting', 'playing']),
        updateTime: _.lt(thirtyMinutesAgo)
      })
      .get()
    
    console.log(`找到 ${stuckRes.data.length} 个长期无活动的房间`)
    
    for (const room of stuckRes.data) {
      try {
        await db.collection('rooms').doc(room._id).remove()
        try { await db.collection('room_secrets').doc(room._id).remove() } catch(e) {}
        console.log(`已删除长期无活动房间: ${room._id}`)
      } catch (e) {
        console.error(`删除房间失败 ${room._id}:`, e)
      }
    }
    
    // 3. 清理双方离线的房间（超过5分钟双方都不在线）
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const offlineRes = await db.collection('rooms')
      .where({
        status: _.in(['setting', 'playing']),
        updateTime: _.lt(fiveMinutesAgo)
      })
      .get()
    
    let offlineCleaned = 0
    for (const room of offlineRes.data) {
      // 检查双方是否都不在线
      const hostOffline = room.players.host && room.players.host.isOnline === false
      const guestOffline = room.players.guest && room.players.guest.isOnline === false
      
      if (hostOffline && guestOffline) {
        try {
          await db.collection('rooms').doc(room._id).remove()
          try { await db.collection('room_secrets').doc(room._id).remove() } catch(e) {}
          console.log(`已删除双方离线房间: ${room._id}`)
          offlineCleaned++
        } catch (e) {
          console.error(`删除房间失败 ${room._id}:`, e)
        }
      }
    }
    
    console.log(`找到 ${offlineCleaned} 个双方离线的房间`)
    
    return {
      success: true,
      cleanedWaiting: waitingRes.data.length,
      cleanedStuck: stuckRes.data.length
    }
  } catch (err) {
    console.error('清理房间失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
