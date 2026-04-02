const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

// 更新排行榜缓存
// 触发器配置: 0 */30 * * * * * (每30分钟执行一次)
// 优化：头像从 user_avatars 集合获取（保持原有方式）

exports.main = async (event, context) => {
  const now = new Date();
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const weekKey = getWeekKey(chinaTime);

  try {
    // 1. 计算全服胜场榜前 100 名
    const winRes = await db.collection('user_stats')
      .where({
        currentWeek: weekKey,
        weeklyWinCount: _.gte(10)
      })
      .orderBy('weeklyWinCount', 'desc')
      .orderBy('updateTime', 'desc')
      .limit(100)
      .get();

    // 获取所有用户的头像（从 user_avatars 集合获取 - 保持原有方式）
    const winUserIds = winRes.data.map(user => user._id);
    const winAvatarMap = {};
    
    if (winUserIds.length > 0) {
      try {
        // 分批查询，每批最多20个
        const batchSize = 20;
        for (let i = 0; i < winUserIds.length; i += batchSize) {
          const batch = winUserIds.slice(i, i + batchSize);
          const avatarRes = await db.collection('user_avatars')
            .where({ _id: _.in(batch) })
            .get();
          avatarRes.data.forEach(item => {
            winAvatarMap[item._id] = item.avatar || '';
          });
        }
      } catch (e) {
        console.error('[updateRankCache] 获取胜场榜头像失败:', e);
      }
    }

    // 2. 组装胜场榜缓存数据
    const winCache = winRes.data.map((user, index) => ({
      id: user._id,
      rank: index + 1,
      nickname: user.nickname,
      avatarUrl: winAvatarMap[user._id] || '',  // 从 user_avatars 获取头像
      totalWin: user.weeklyWinCount,
      subText: getWinSubText(user.weeklyWinCount)
    }));

    // 3. 计算洗碗王榜前 100 名
    const loseRes = await db.collection('user_stats')
      .where({
        currentWeek: weekKey,
        weeklyLoseCount: _.gte(10)
      })
      .orderBy('weeklyLoseCount', 'desc')
      .limit(100)
      .get();

    // 获取所有用户的头像（从 user_avatars 集合获取 - 保持原有方式）
    const loseUserIds = loseRes.data.map(user => user._id);
    const loseAvatarMap = {};
    
    if (loseUserIds.length > 0) {
      try {
        // 分批查询，每批最多20个
        const batchSize = 20;
        for (let i = 0; i < loseUserIds.length; i += batchSize) {
          const batch = loseUserIds.slice(i, i + batchSize);
          const avatarRes = await db.collection('user_avatars')
            .where({ _id: _.in(batch) })
            .get();
          avatarRes.data.forEach(item => {
            loseAvatarMap[item._id] = item.avatar || '';
          });
        }
      } catch (e) {
        console.error('[updateRankCache] 获取洗碗榜头像失败:', e);
      }
    }

    // 4. 组装洗碗榜缓存数据
    const loseCache = loseRes.data.map((user, index) => ({
      id: user._id,
      rank: index + 1,
      nickname: user.nickname,
      avatarUrl: loseAvatarMap[user._id] || '',  // 从 user_avatars 获取头像
      weeklyLoseCount: user.weeklyLoseCount,
      subText: getLoserSubText(user.weeklyLoseCount)
    }));

    // 5. 保存到缓存集合
    await db.collection('rank_cache').doc('win_' + weekKey).set({
      data: {
        list: winCache,
        updateTime: db.serverDate(),
        weekKey: weekKey
      }
    });

    await db.collection('rank_cache').doc('lose_' + weekKey).set({
      data: {
        list: loseCache,
        updateTime: db.serverDate(),
        weekKey: weekKey
      }
    });

    console.log(`[updateRankCache] 缓存更新成功: win=${winCache.length}, lose=${loseCache.length}`);
    return { success: true, winCount: winCache.length, loseCount: loseCache.length };
  } catch (err) {
    console.error('[updateRankCache] 缓存更新失败:', err);
    return { success: false, error: err.message };
  }
};

function getWinSubText(count) {
  if (count > 100) return '绝世·不洗碗传奇';
  if (count > 90) return '距离封神只差一碗';
  if (count > 80) return '宗师级家务刺客';
  if (count > 50) return '洗洁精一生之敌';
  if (count > 30) return '厨房物理绝缘体';
  if (count > 10) return '成功逃离水槽';
  return '新晋高手';
}

function getLoserSubText(count) {
  if (count > 100) return '感动中国·绝世好伴侣';
  if (count > 90) return '全自动人形洗碗机';
  if (count > 80) return '厨房常驻 NPC';
  if (count > 50) return '洗洁精品鉴师';
  if (count > 30) return '橡胶手套焊死';
  if (count > 10) return '海绵宝宝附体';
  return '被迫营业';
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}_w${week}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
