// pages/ranking/ranking.js
const app = getApp();

// 引入每日挑战工具模块
const dailyChallenge = require('../../utils/dailyChallenge.js');

// 缓存键名（添加 _anonymous 后缀，确保切换到匿名展示后使用新缓存）
const CACHE_KEYS = {
  daily: 'dailyRankCache_anonymous',
  globalWin: 'globalWinRankCache_anonymous',
  loser: 'loserRankCache_anonymous'
};

Page({
  data: {
    currentTab: 1, // 默认显示每日挑战榜（Tab 1）
    userInfo: {
      nickName: '李逍遥',
      avatarUrl: ''
    },
    
    // 默认头像（使用 base64 编码的灰色头像）
    defaultAvatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2UwZTRlYiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+8J+UqzwvdGV4dD48L3N2Zz4=',
    
    // 当前用户排名信息（底部栏展示）
    currentMyRank: {
      rank: '-',
      subText: '加载中...'
    },

    // 每日挑战榜数据
    dailyRankList: [],
    myDailyRank: null,
    dailyGameType: '', // 今日游戏类型
    dailyDateStr: '', // 今日日期字符串
    
    // 全服胜场榜数据
    globalRankList: [],
    myGlobalRank: null,
    
    // 洗碗王榜数据
    loserRankList: [],
    myLoserRank: null,
    
    // 分页控制
    pageSize: 20,
    dailyPage: 0,
    globalPage: 0,
    loserPage: 0,
    isLoading: false,
    hasMoreDaily: true,
    hasMoreGlobal: true,
    hasMoreLoser: true,
    
    // 下拉刷新状态
    isRefreshing: false
  },

  onLoad(options) {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-7g1vns1o997d1307', // 云开发环境ID
      traceUser: true
    });
    
    // 获取用户信息（优先从本地存储获取）
    const storedUserInfo = wx.getStorageSync('userInfo');
    const userInfo = storedUserInfo || app.globalData.userInfo || this.data.userInfo;
    this.setData({
      userInfo: userInfo
    });
    
    // 设置今日游戏类型和日期
    const gameType = dailyChallenge.getTodayGameType();
    const dateStr = dailyChallenge.getTodayDateString();
    this.setData({
      dailyGameType: gameType,
      dailyDateStr: dateStr
    });
    
    // 默认加载每日挑战榜（实时刷新）
    this.loadDailyRankFromCloud(true);
  },

  onShow() {
    // 页面显示时检查是否跨天，并实时刷新每日挑战榜
    if (this.data.currentTab === 1) {
      const todayStr = dailyChallenge.getTodayDateString();
      if (todayStr !== this.data.dailyDateStr) {
        // 跨天了，更新日期和游戏类型
        this.setData({
          dailyDateStr: todayStr,
          dailyGameType: dailyChallenge.getTodayGameType()
        });
      }
      // 每次显示页面都实时刷新榜单
      this.loadDailyRankFromCloud(true);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ isRefreshing: true });
    
    // 根据当前Tab刷新对应榜单
    switch(this.data.currentTab) {
      case 1:
        this.loadDailyRankFromCloud(true);
        break;
      case 2:
        this.loadGlobalRankFromCloud(true);
        break;
      case 3:
        this.loadLoserRankFromCloud(true);
        break;
    }
    
    // 1秒后关闭刷新状态
    setTimeout(() => {
      this.setData({ isRefreshing: false });
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 切换 Tab
  switchTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);

    this.setData({ currentTab: index });

    // 根据 Tab 加载对应数据（每日挑战榜实时刷新，其他带缓存）
    switch(index) {
      case 1:
        this.loadDailyRankFromCloud(true);
        break;
      case 2:
        this.loadGlobalRankWithCache();
        break;
      case 3:
        this.loadLoserRankWithCache();
        break;
    }

    wx.pageScrollTo({ scrollTop: 0, duration: 300 });
  },

  // ==================== 每日挑战榜（实时刷新）====================

  // 从云端加载每日挑战榜
  async loadDailyRankFromCloud(reset = false) {
    if (this.data.isLoading) return;
    if (!reset && !this.data.hasMoreDaily) return;

    this.setData({ isLoading: true });
    const page = reset ? 0 : this.data.dailyPage;

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getDailyRank',
        data: { page, pageSize: this.data.pageSize }
      });

      if (result.error) {
        console.error('获取每日挑战榜失败', result.error);
        this.setData({ isLoading: false });
        return;
      }

      const newList = reset ? result.list : [...this.data.dailyRankList, ...result.list];

      // 构建底部栏显示文本
      let subText = '今日未挑战';
      if (result.hasRecord) {
        if (result.myBestScore) {
          subText = `最好成绩：${result.myBestScore.guessCount}次 · ${this.formatTime(result.myBestScore.timeUsed)}`;
        } else {
          subText = `剩余${result.myAttemptsLeft}次机会`;
        }
      }

      const currentMyRank = {
        rank: result.myRank || '-',
        subText: subText
      };

      this.setData({
        dailyRankList: newList,
        dailyPage: page + 1,
        hasMoreDaily: result.list.length === this.data.pageSize,
        myDailyRank: result.myRank,
        myAttemptsLeft: result.myAttemptsLeft,
        hasRecord: result.hasRecord,
        currentMyRank: currentMyRank,
        'userInfo.avatarUrl': result.myAvatar || this.data.userInfo.avatarUrl,
        isLoading: false
      });

      // 【实时刷新】不缓存每日挑战榜数据
      console.log('每日挑战榜已实时刷新:', newList.length, '条');
    } catch (err) {
      console.error('加载每日挑战榜失败', err);
      this.setData({
        isLoading: false,
        currentMyRank: {
          rank: '-',
          subText: '加载失败，请重试'
        }
      });
    }
  },

  // ==================== 全服胜场榜（带缓存）====================
  
  // 加载全服胜场榜（带缓存逻辑）
  loadGlobalRankWithCache() {
    const today = dailyChallenge.getTodayDateString();
    const cacheKey = CACHE_KEYS.globalWin;
    const lastFetchDate = wx.getStorageSync(`${cacheKey}_date`);
    
    if (lastFetchDate !== today) {
      console.log('全服胜场榜今天首次访问，从云端获取');
      this.loadGlobalRankFromCloud(true);
    } else {
      console.log('全服胜场榜今天已缓存，从本地缓存加载');
      const cachedData = wx.getStorageSync(cacheKey);
      if (cachedData && cachedData.list && cachedData.list.length > 0) {
        console.log('获取本地缓存全服胜场榜:', cachedData.list.length, '条');
        this.setData({
          globalRankList: cachedData.list,
          globalPage: cachedData.page || 1,
          hasMoreGlobal: cachedData.hasMore !== false,
          // ⚠️ 不缓存我的排名，设为 null 稍后从云端获取
          myGlobalRank: null,
          currentMyRank: { rank: '-', subText: '加载中...' },
          isLoading: false
        });
        // 从云端获取我的排名（实时数据）
        this.loadMyRankOnly('global');
      } else {
        this.loadGlobalRankFromCloud(true);
      }
    }
  },

  // 仅加载我的排名（用于缓存命中时补充实时数据）
  async loadMyRankOnly(type) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: type === 'global' ? 'getGlobalRank' : 'getLoserRank',
        data: { page: 0, pageSize: 1 }
      });

      if (result.error) return;

      if (type === 'global') {
        const myRank = result.myRank;
        const myScore = result.myScore;
        this.setData({
          myGlobalRank: myRank,
          currentMyRank: {
            rank: myRank || '-',
            subText: myRank
              ? `本周胜场 ${myScore || 0}`
              : (myScore > 0 ? `本周胜场 ${myScore}（未进前100）` : '多玩游戏提升排名！')
          },
          'userInfo.avatarUrl': result.myAvatar || this.data.userInfo.avatarUrl
        });
      } else {
        const myRank = result.myRank;
        const myLoseCount = result.myLoseCount;
        this.setData({
          myLoserRank: myRank,
          currentMyRank: {
            rank: myRank || '-',
            subText: myRank
              ? `本周洗碗 ${myLoseCount} 次`
              : (myLoseCount > 0 ? `本周洗碗 ${myLoseCount} 次（未进前100）` : '你很安全，继续保持！')
          },
          'userInfo.avatarUrl': result.myAvatar || this.data.userInfo.avatarUrl
        });
      }
    } catch (err) {
      console.error('加载我的排名失败', err);
    }
  },

  // 从云端加载全服胜场榜
  async loadGlobalRankFromCloud(reset = false) {
    if (this.data.isLoading) return;
    if (!reset && !this.data.hasMoreGlobal) return;

    this.setData({ isLoading: true });
    const page = reset ? 0 : this.data.globalPage;

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getGlobalRank',
        data: { page, pageSize: this.data.pageSize }
      });

      if (result.error) {
        console.error('获取全服榜失败', result.error);
        this.setData({ isLoading: false });
        return;
      }

      const newList = reset ? result.list : [...this.data.globalRankList, ...result.list];

      // ========== ⚠️ 重要：直接使用后端返回的实时数据 ==========
      // 不缓存我的排名，确保玩家每赢一局都能看到分数上涨
      const myRank = result.myRank;
      const myScore = result.myScore;

      const currentMyRank = {
        rank: myRank || '-',
        subText: myRank
          ? `本周胜场 ${myScore || 0}`
          : (myScore > 0 ? `本周胜场 ${myScore}（未进前100）` : '多玩游戏提升排名！')
      };

      this.setData({
        globalRankList: newList,
        globalPage: page + 1,
        hasMoreGlobal: result.hasMore,
        myGlobalRank: myRank,
        currentMyRank: currentMyRank,
        'userInfo.avatarUrl': result.myAvatar || this.data.userInfo.avatarUrl,
        isLoading: false
      });

      // 缓存到本地（仅缓存列表数据，不缓存我的排名）
      if (reset) {
        const today = dailyChallenge.getTodayDateString();
        wx.setStorageSync(CACHE_KEYS.globalWin, {
          list: newList,
          page: page + 1,
          hasMore: result.hasMore
          // ⚠️ 不缓存 myRank 和 myScore，确保每次都能看到实时数据
        });
        wx.setStorageSync(`${CACHE_KEYS.globalWin}_date`, today);
        console.log('全服胜场榜已缓存到本地:', newList.length, '条');
      }
    } catch (err) {
      console.error('加载全服榜失败', err);
      this.setData({ isLoading: false });
    }
  },

  // ==================== 洗碗王榜（带缓存）====================
  
  // 加载洗碗王榜（带缓存逻辑）
  loadLoserRankWithCache() {
    const today = dailyChallenge.getTodayDateString();
    const cacheKey = CACHE_KEYS.loser;
    const lastFetchDate = wx.getStorageSync(`${cacheKey}_date`);
    
    if (lastFetchDate !== today) {
      console.log('洗碗王榜今天首次访问，从云端获取');
      this.loadLoserRankFromCloud(true);
    } else {
      console.log('洗碗王榜今天已缓存，从本地缓存加载');
      const cachedData = wx.getStorageSync(cacheKey);
      if (cachedData && cachedData.list && cachedData.list.length > 0) {
        console.log('获取本地缓存洗碗王榜:', cachedData.list.length, '条');
        this.setData({
          loserRankList: cachedData.list,
          loserPage: cachedData.page || 1,
          hasMoreLoser: cachedData.hasMore !== false,
          // ⚠️ 不缓存我的排名，设为 null 稍后从云端获取
          myLoserRank: null,
          currentMyRank: { rank: '-', subText: '加载中...' },
          isLoading: false
        });
        // 从云端获取我的排名（实时数据）
        this.loadMyRankOnly('loser');
      } else {
        this.loadLoserRankFromCloud(true);
      }
    }
  },

  // 从云端加载洗碗王榜
  async loadLoserRankFromCloud(reset = false) {
    if (this.data.isLoading) return;
    if (!reset && !this.data.hasMoreLoser) return;

    this.setData({ isLoading: true });
    const page = reset ? 0 : this.data.loserPage;

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getLoserRank',
        data: { page, pageSize: this.data.pageSize }
      });

      if (result.error) {
        console.error('获取洗碗榜失败', result.error);
        this.setData({ isLoading: false });
        return;
      }

      const newList = reset ? result.list : [...this.data.loserRankList, ...result.list];

      // ========== ⚠️ 重要：直接使用后端返回的实时数据 ==========
      // 不缓存我的排名，确保玩家每赢一局都能看到分数上涨
      const myRank = result.myRank;
      const myLoseCount = result.myLoseCount;

      const currentMyRank = {
        rank: myRank || '-',
        subText: myRank
          ? `本周洗碗 ${myLoseCount} 次`
          : (myLoseCount > 0 ? `本周洗碗 ${myLoseCount} 次（未进前100）` : '你很安全，继续保持！')
      };

      this.setData({
        loserRankList: newList,
        loserPage: page + 1,
        hasMoreLoser: result.hasMore,
        myLoserRank: myRank,
        currentMyRank: currentMyRank,
        'userInfo.avatarUrl': result.myAvatar || this.data.userInfo.avatarUrl,
        isLoading: false
      });

      // 缓存到本地（仅缓存列表数据，不缓存我的排名）
      if (reset) {
        const today = dailyChallenge.getTodayDateString();
        wx.setStorageSync(CACHE_KEYS.loser, {
          list: newList,
          page: page + 1,
          hasMore: result.hasMore
          // ⚠️ 不缓存 myRank 和 myLoseCount，确保每次都能看到实时数据
        });
        wx.setStorageSync(`${CACHE_KEYS.loser}_date`, today);
        console.log('洗碗王榜已缓存到本地:', newList.length, '条');
      }
    } catch (err) {
      console.error('加载洗碗榜失败', err);
      this.setData({ isLoading: false });
    }
  },

  // 清除榜单缓存
  clearRankCache(type) {
    const cacheKey = CACHE_KEYS[type];
    if (cacheKey) {
      wx.removeStorageSync(cacheKey);
      wx.removeStorageSync(`${cacheKey}_date`);
      console.log(`已清除 ${type} 榜单缓存`);
    }
  },

  // 格式化时间（秒 -> 分:秒）
  formatTime(seconds) {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // 滚动到底部加载更多
  onScrollToLower() {
    if (this.data.currentTab === 1) {
      this.loadDailyRankFromCloud();
    } else if (this.data.currentTab === 2) {
      this.loadGlobalRankFromCloud();
    } else if (this.data.currentTab === 3) {
      this.loadLoserRankFromCloud();
    }
  },

  goBack() {
    // 尝试返回上一页，如果没有上一页则返回首页
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      // 从分享链接直接进入，没有上一页，返回首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  // 跳转到首页修改资料
  goToEditProfile() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 在排行榜页面直接修改头像
  onChooseAvatarForRanking(e) {
    const { avatarUrl } = e.detail;
    // 保存临时头像，跳转到首页后显示昵称输入弹窗
    wx.setStorageSync('tempAvatarFromRanking', avatarUrl);
    // 跳转到首页
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 跳转到每日挑战（和首页每日挑战按钮逻辑一致）
  async goToDailyChallenge() {
    // 引入工具模块
    const dailyChallengeUtil = require('../../utils/dailyChallenge.js');

    // 获取今日配置
    const config = dailyChallengeUtil.getTodayConfig();
    const modeText = config.mode === 'number' ? '猜数字' : '猜颜色';
    const repeatText = config.allowRepeat ? '可重复' : '不重复';

    wx.showModal({
      title: '每日挑战',
      content: `今日模式：${modeText}（${repeatText}）\n\n进入游戏将扣除1次机会，是否继续？`,
      confirmText: '开始挑战',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '加载中...' });

          // 调用云函数原子扣减次数
          const result = await dailyChallengeUtil.startDailyChallenge();

          wx.hideLoading();

          if (result.success) {
            // 跳转到对应的每日挑战页面
            const targetPage = result.mode === 'number'
              ? `/pages/daily-game/daily-game?allowRepeat=${result.allowRepeat}`
              : `/pages/daily-color/daily-color?allowRepeat=${result.allowRepeat}`;

            wx.navigateTo({ url: targetPage });
          } else {
            wx.showToast({
              title: result.error || '开始失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 点击：请他洗碗
  onWashDishTap(e) {
    const targetUser = e.currentTarget.dataset.user;
    wx.showToast({
      title: `请 ${targetUser.nickname} 洗碗！`,
      icon: 'none'
    });
  },

  // 用户点击右上角或底部的分享按钮
  onShareAppMessage() {
    const msgs = [
      `今日${this.data.dailyGameType === 'number' ? '猜数字' : '猜颜色'}挑战，来比比谁更快！`,
      "全服胜场榜，看看你能排第几！",
      "本周洗碗王诞生了，快来围观！"
    ];
    return {
      title: msgs[this.data.currentTab - 1],
      path: '/pages/ranking/ranking',
      imageUrl: ''
    };
  }
});
