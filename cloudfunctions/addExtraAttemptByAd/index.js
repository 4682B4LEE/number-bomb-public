const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 用户观看广告后，增加额外挑战次数
 * 每天最多通过广告获得 10 次额外机会
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 【修复 1】生成东八区今日日期字符串 (防止 UTC 0 时区跨天异常)
  const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  
  try {
    // 1. 查询今日记录
    const record = await db.collection('daily_challenges').where({ 
      _openid: openid,  // 使用 _openid 字段名
      date: today 
    }).get();
    
    // 【修复 2】空值校验防崩溃
    if (!record.data || record.data.length === 0) {
      return { success: false, msg: '尚未初始化今日挑战记录' };
    }
    
    const userRecord = record.data[0];
    
    // 2. 防作弊校验：如果 extraAttemptsFromAd 已经 >= 10，拒绝增加
    const currentExtraAttempts = userRecord.extraAttemptsFromAd || 0;
    if (currentExtraAttempts >= 10) {
      return { success: false, msg: '今日广告奖励次数已达上限' };
    }
    
    // 3. 原子操作更新：额外次数标记+1，可用次数+1
    await db.collection('daily_challenges').doc(userRecord._id).update({
      data: {
        extraAttemptsFromAd: _.inc(1),
        attemptsLeft: _.inc(1),
        updateTime: db.serverDate()
      }
    });
    
    return { 
      success: true, 
      msg: '奖励发放成功',
      extraAttemptsFromAd: currentExtraAttempts + 1,
      attemptsLeft: (userRecord.attemptsLeft || 0) + 1
    };
  } catch (error) {
    console.error('发放奖励失败', error);
    return { success: false, msg: '服务器内部错误' };
  }
}
