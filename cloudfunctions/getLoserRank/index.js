// cloudfunctions/getLoserRank/index.js
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;
// 引入匿名工具
const anonymousUtil = require('./anonymousUtil');

/**
 * 获取洗碗王榜（优化版）
 * 优化1：优先读取 rank_cache 缓存
 * 优化2：头像从 user_avatars 集合获取（保持原有方式）
 * 优化3：我的排名只读取用户文档，不计算精确排名（未进前100返回 null）
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { page = 0 } = event;
  // 每页20条，最多100名（5页）
  const pageSize = 20;
  const maxRank = 100;
  const skip = page * pageSize;

  // 获取当前周标记（中国时区）
  const now = new Date();
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const weekKey = getWeekKey(chinaTime);

  try {
    // ========== 1. 优先读取缓存 ==========
    let list = [];
    let hasMore = false;
    let fromCache = false;

    try {
      const cacheRes = await db.collection('rank_cache').doc('lose_' + weekKey).get();
      if (cacheRes.data && cacheRes.data.list) {
        const allList = cacheRes.data.list;
        // 【关键】即使从缓存读取，也要进行匿名化处理
        list = allList.slice(skip, skip + pageSize).map((user, index) => ({
          ...user,
          nickname: anonymousUtil.generateAnonymousName(user.id),
          avatarUrl: anonymousUtil.generateDefaultAvatar(user.id),
          isAnonymous: true
        }));
        hasMore = skip + list.length < allList.length && skip + pageSize < maxRank;
        fromCache = true;
        console.log('[getLoserRank] 命中缓存，已匿名化处理');
      }
    } catch (e) {
      console.log('[getLoserRank] 缓存不存在，回退到原逻辑');
    }

    // ========== 2. 缓存未命中，回退到原查询 ==========
    if (!fromCache) {
      // 从 user_stats 读取排名数据
      const rankRes = await db.collection('user_stats')
        .where({
          currentWeek: weekKey,
          weeklyLoseCount: _.gte(10)
        })
        .orderBy('weeklyLoseCount', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();

      // 获取所有用户的头像（从 user_avatars 集合获取 - 保持原有方式）
      const userIds = rankRes.data.map(user => user._id);
      const avatarMap = {};
      
      if (userIds.length > 0) {
        try {
          // 分批查询，每批最多20个
          const batchSize = 20;
          for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            const avatarRes = await db.collection('user_avatars')
              .where({ _id: _.in(batch) })
              .get();
            avatarRes.data.forEach(item => {
              avatarMap[item._id] = item.avatar || '';
            });
          }
        } catch (e) {
          console.error('[getLoserRank] 获取头像失败:', e);
        }
      }

      // 组装列表数据（实时脱敏）
      list = rankRes.data.map((user, index) => ({
        id: user._id,
        rank: skip + index + 1,
        // 【关键】使用匿名昵称替换真实昵称
        nickname: anonymousUtil.generateAnonymousName(user._id),
        // 【关键】使用匿名头像替换真实头像
        avatarUrl: anonymousUtil.generateDefaultAvatar(user._id),
        weeklyLoseCount: user.weeklyLoseCount,
        subText: getLoserSubText(user.weeklyLoseCount),
        isAnonymous: true // 标记为匿名展示
      }));

      const currentMaxRank = skip + list.length;
      hasMore = list.length === pageSize && currentMaxRank < maxRank;
    }

    // ========== 3. 查询当前用户的排名和分数（始终返回实时数据）==========
    let myRank = null;
    let myLoseCount = 0;
    let myAvatar = '';
    let myNickname = '';

    try {
      // 获取用户统计信息
      const myStat = await db.collection('user_stats').doc(openid).get();
      if (myStat.data) {
        myLoseCount = myStat.data.weeklyLoseCount || 0;
        
        // 【关键】使用匿名头像和昵称（排行榜展示用）
        myAvatar = anonymousUtil.generateDefaultAvatar(openid);
        myNickname = anonymousUtil.generateAnonymousName(openid);

        // 如果用户有分数，计算排名（只计算前100名内）
        if (myLoseCount > 0) {
          // 先检查是否在已加载的列表中
          const inList = list.find(u => u.id === openid);
          if (inList) {
            myRank = inList.rank;
          } else {
            // 不在当前列表中，查询用户在前100名中的位置
            try {
              const rankQuery = await db.collection('user_stats')
                .where({
                  currentWeek: weekKey,
                  weeklyLoseCount: _.gt(myLoseCount)
                })
                .count();
              
              const rank = rankQuery.total + 1;
              // 只返回前100名内的排名
              if (rank <= 100) {
                myRank = rank;
              }
              // 超过100名返回null，前端显示"未进前100"
            } catch (e) {
              console.log('[getLoserRank] 计算排名失败:', e);
            }
          }
        }
      }
    } catch (err) {
      console.log('[getLoserRank] 用户暂无洗碗数据');
    }

    return {
      list,
      myRank,      // 前100名返回具体排名，超过100名返回null
      myLoseCount, // 始终返回实时分数
      myAvatar,    // 匿名头像
      myNickname,  // 匿名昵称
      page,
      hasMore,
      fromCache
    };
  } catch (err) {
    console.error('[getLoserRank] 获取洗碗榜失败', err);
    return { error: err.message };
  }
};

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
