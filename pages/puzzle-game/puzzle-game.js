// pages/puzzle-game/puzzle-game.js
// 残局解谜单机闯关模式 - 核心逻辑实现

// ==================== 常量定义 ====================
const LEVELS_PER_BATCH = 50; // 每次加载的关卡数量（分页加载，避免一次性加载过多）
const DB_NAME_LEVELS = 'puzzle_levels'; // 云端题库集合名
const DB_NAME_PROGRESS = 'puzzle_progress'; // 玩家进度存档集合名
const STORAGE_KEY_GUESSES = 'puzzle_guesses_history'; // 本地缓存挑战记录
const STORAGE_KEY_REVIVE = 'puzzle_revive_record';    // 本地缓存复活记录（分享/广告次数）
const STORAGE_KEY_LEVEL_RECORDS = 'puzzle_level_records'; // 本地缓存通关记录（包含星级）
const STORAGE_KEY_STRENGTH = 'puzzle_strength'; // 本地缓存体力数据
const STORAGE_KEY_AB_TIP_SHOWN = 'puzzle_ab_tip_shown'; // 本地缓存AB提示是否已显示

// 体力系统常量
const MAX_STRENGTH = 120; // 体力上限
const STRENGTH_RECOVER_PER_MINUTE = 2; // 每分钟恢复2体力
const STRENGTH_COST_PER_GAME = 20; // 每局消耗20体力
const STRENGTH_REWARD_3STAR = 30; // 3星奖励30体力
const STRENGTH_REWARD_2STAR = 20; // 2星奖励20体力
const STRENGTH_REWARD_1STAR = 10; // 1星奖励10体力

Page({
  // ==================== 数据状态 ====================
  data: {
    // 系统适配
    statusBarHeight: 20,
    
    // 页面切换：'map' 选关地图 / 'game' 游戏对局
    currentPage: 'map',
    
    // ======== 地图与进度数据 ========
    // 玩家进度（排行榜依据 totalCompleted）
    playerProgress: {
      unlockedLevel: 1,       // 最高解锁关卡
      totalCompleted: 0,      // 历史累计闯关成功总数（排行榜排序依据）
      unlockedRangeEnd: 40    // 当前已解锁的区间终点（默认前40关免费）
    },
    mapLevels: [],         // 地图关卡列表（用于渲染）
    rawLevelsCache: [],    // 原始关卡数据缓存
    
    // ======== 游戏对局数据 ========
    currentGameData: null, // 当前关卡数据
    maxSteps: 0,           // 最大容错步数
    usedSteps: 0,          // 已使用步数
    totalUsedSteps: 0,     // 累计使用步数（包含复活前的步数，用于胜利弹窗显示）
    inputBuffer: [],       // 当前输入的数字缓冲区
    playerGuesses: [],     // 玩家的猜测历史记录
    isReadOnly: false,     // 是否只读模式（已过关关卡）

    // ======== 步数来源追踪（用于星级评定） ========
    shareCount: 0,         // 本关已分享次数（最多1次，每次+2步）
    adCount: 0,            // 本关已看广告次数（最多1次，每次+3步）
    originalMaxSteps: 0,   // 原始最大步数（用于计算星级）
    hasUsedShare: false,   // 本关是否已使用分享复活
    hasUsedAd: false,      // 本关是否已使用广告复活
    
    // ======== UI 状态 ========
    scrollToId: '',        // 滚动定位ID
    scrollTop: 0,          // 地图滚动位置
    isWrongShake: false,   // 错误震动动画标记
    showLoseModal: false,      // 失败复活弹窗显示标记
    showWinModal: false,       // 胜利弹窗显示标记
    showUnlockModal: false,    // 关卡解锁弹窗显示标记
    unlockTargetLevel: 0,      // 待解锁的目标关卡
    unlockRangeStart: 0,       // 解锁区间起始
    unlockRangeEnd: 0,         // 解锁区间结束
    autoEnterLevelAfterUnlock: 0, // 解锁后自动进入的关卡ID（0表示不自动进入）
    showAllClues: false,       // 是否显示全部线索
    displayedClues: [],        // 当前显示的线索（默认前3条）
    
    // ======== 关卡滑动选择器 ========
    sliderValue: 1,        // 滑动条当前值
    maxLevel: 1,           // 最大关卡数
    middleMark: 1,         // 中间刻度值
    isSliderCollapsed: true, // 滑动条默认收起
    sliderTouchStartX: 0,  // 滑动条触摸起始X坐标
    totalEarnedStars: 0,   // 累计获得的星星总数（用于顶部显示）
    
    // ======== 分享获得步数标记 ========
    // 利用 onShow 实现分享获得步数机制
    isSharingForSteps: false,
    
    // ======== 用户信息 ========
    userInfo: {
      avatarUrl: '',
      nickName: ''
    },
    
    // ======== 加载状态 ========
    isLoading: false,
    errorMsg: '',

    // ======== 体力系统 ========
    strength: MAX_STRENGTH,        // 当前体力值（可以超过体力槽）
    strengthCap: MAX_STRENGTH,     // 体力槽（时间恢复的上限）
    strengthRecoverTimer: null,    // 体力恢复定时器
    strengthCostPerGame: STRENGTH_COST_PER_GAME,  // 每局消耗体力（供WXML使用）
    strengthRecoverPerMinute: STRENGTH_RECOVER_PER_MINUTE,  // 每分钟恢复体力（供WXML使用）
    strengthRewardAd: 120,         // 看广告奖励体力（供WXML使用）
    isRetryChallenge: false,       // 是否是重新挑战模式

    // ======== 已通关关卡弹窗 ========
    showCompletedLevelModal: false, // 已通关关卡弹窗显示标记
    completedLevelId: 0,            // 当前选中的已通关关卡ID
    completedLevelStars: 0,         // 当前选中关卡的星级

    // ======== 体力不足弹窗 ========
    showStrengthModal: false,       // 体力不足弹窗显示标记

    // ======== 体力确认弹窗 ========
    showStrengthConfirmModal: false, // 体力确认弹窗显示标记
    pendingLevelId: 0,               // 待确认的关卡ID
    pendingGameData: null,           // 待确认的关卡数据

    // ======== 通关奖励 ========
    earnedStars: 0,                 // 本关获得的星级（用于胜利弹窗）
    strengthReward: 0,              // 通关体力奖励

    // ======== AB提示弹窗 ========
    showABTipModal: false,          // AB提示弹窗显示标记
    abTipDoNotShowAgain: false      // 不再提示标记
  },

  // ==================== 广告实例 ====================
  videoAd: null, // 激励视频广告实例

  // ==================== 触摸滑动参数 ====================
  touchStartX: 0, // 触摸起始X坐标
  touchStartY: 0, // 触摸起始Y坐标

  // ==================== 生命周期 ====================

  /**
   * 页面加载
   * 1. 适配刘海屏状态栏高度
   * 2. 加载用户信息
   * 3. 加载玩家进度
   * 4. 加载关卡数据
   * 5. 初始化激励视频广告
   */
  onLoad() {
    // 适配刘海屏，获取状态栏高度
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight });

    // 加载用户信息
    this.loadUserInfo();

    // 初始化加载数据
    this.initData();

    // 初始化激励视频广告
    this.initVideoAd();

    // 初始化体力系统
    this.initStrength();
  },

  /**
   * 触摸开始事件
   * 【修复 iOS 边缘右滑冲突】排除屏幕左侧 40px 边缘区域，避免与系统手势冲突
   */
  onTouchStart(e) {
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    // 如果触摸点在屏幕左侧 40px 边缘区域，不处理（让系统手势接管）
    if (touchX < 40) {
      this.touchStartX = 0;
      this.touchStartY = 0;
      return;
    }
    
    this.touchStartX = touchX;
    this.touchStartY = touchY;
  },

  /**
   * 触摸结束事件
   * 右滑返回关卡地图
   * 【修复 iOS 边缘右滑冲突】只在非边缘区域触发
   */
  onTouchEnd(e) {
    // 如果触摸未记录（在边缘区域开始的触摸），直接返回
    if (this.touchStartX === 0 && this.touchStartY === 0) {
      return;
    }
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    // 判断是否为右滑手势
    // 1. 水平滑动距离大于 50px
    // 2. 垂直滑动距离小于水平滑动距离（避免斜滑）
    // 3. 起始点不在屏幕左侧边缘 40px 内（已在 onTouchStart 中排除）
    if (deltaX > 50 && Math.abs(deltaY) < Math.abs(deltaX)) {
      // 只有在游戏页面时才返回地图
      if (this.data.currentPage === 'game') {
        this.closeGame();
      }
    }
    
    // 重置触摸状态
    this.touchStartX = 0;
    this.touchStartY = 0;
  },

  /**
   * 初始化激励视频广告
   * 【修复】防止重复创建广告实例
   */
  initVideoAd() {
    // 若开发者工具中无法预览广告，请切换开发者工具中的基础库版本
    if (!wx.createRewardedVideoAd) {
      console.log('[激励视频广告] 当前版本不支持激励视频广告');
      return;
    }

    // 【修复】如果广告实例已存在，先销毁再重新创建
    if (this.videoAd) {
      console.log('[激励视频广告] 广告实例已存在，跳过初始化');
      return;
    }

    try {
      this.videoAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-20c2ef166d99ee08'
      });

      this.videoAd.onLoad(() => {
        console.log('[激励视频广告] 加载成功');
      });

      this.videoAd.onError((err) => {
        console.error('[激励视频广告] 加载失败', err);
        // 【修复】广告加载失败时，重置实例以便下次重新创建
        this.videoAd = null;
      });

      this.videoAd.onClose((res) => {
        // 用户点击了【关闭广告】按钮
        if (res && res.isEnded) {
          // 正常播放结束，根据当前状态判断广告用途
          console.log('[激励视频广告] 播放完成');

          // 如果解锁弹窗显示中，说明是解锁广告
          if (this.data.showUnlockModal) {
            this.onUnlockAdComplete();
          } else if (this.data.showStrengthConfirmModal && this.data.strength < STRENGTH_COST_PER_GAME) {
            // 【修改】体力确认弹窗显示中且体力不足，说明是观看广告恢复体力
            this.onAdForStrengthComplete();
          } else if (this.data.showStrengthModal) {
            // 体力不足弹窗显示中（兼容旧逻辑）
            this.onAdForStrengthComplete();
          } else {
            // 否则是广告获得步数
            this.adForSteps();
          }
        } else {
          // 播放中途退出，不下发游戏奖励
          console.log('[激励视频广告] 播放中途退出');
          wx.showToast({ title: '需要看完广告才能获得奖励', icon: 'none' });
        }
      });

      console.log('[激励视频广告] 广告实例创建成功');
    } catch (err) {
      console.error('[激励视频广告] 创建广告实例失败:', err);
      this.videoAd = null;
    }
  },

  /**
   * 加载用户信息
   * 从本地存储获取，与首页保持一致
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.avatarUrl && userInfo.nickName) {
      this.setData({
        userInfo: {
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName
        }
      });
    } else {
      // 未登录状态使用默认头像和昵称
      this.setData({
        userInfo: {
          avatarUrl: '/icons/keji.svg',
          nickName: '神秘玩家'
        }
      });
    }
  },

  // ==================== 体力系统 ====================

  /**
   * 初始化体力系统
   * 从本地缓存读取，计算离线恢复
   * 【修改】体力槽(strengthCap)是时间恢复的上限，但当前体力(strength)可以超过体力槽
   */
  initStrength() {
    const strengthData = wx.getStorageSync(STORAGE_KEY_STRENGTH) || {};
    const lastUpdate = strengthData.lastUpdate || Date.now();
    const savedStrength = strengthData.value || MAX_STRENGTH;

    // 计算离线期间恢复的体力
    const now = Date.now();
    const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
    const recoveredStrength = diffMinutes * STRENGTH_RECOVER_PER_MINUTE;
    
    // 【修复】离线恢复逻辑：
    // 1. 如果当前体力已经超过体力槽，保持当前体力不变（不减少）
    // 2. 如果当前体力未超过体力槽，可以恢复到体力槽
    let newStrength;
    if (savedStrength >= MAX_STRENGTH) {
      // 当前体力已经超过体力槽，保持原值（突破体力槽的体力不会随时间减少）
      newStrength = savedStrength;
    } else {
      // 当前体力未超过体力槽，可以恢复到体力槽
      newStrength = Math.min(savedStrength + recoveredStrength, MAX_STRENGTH);
    }

    this.setData({
      strength: newStrength,       // 当前体力值
      strengthCap: MAX_STRENGTH    // 体力槽（时间恢复的上限）
    });

    // 保存当前状态
    this.saveStrength(newStrength);

    // 启动定时恢复
    this.startStrengthRecovery();

    console.log('[initStrength] 体力初始化:', newStrength, '/', MAX_STRENGTH, '恢复:', recoveredStrength);
  },

  /**
   * 保存体力到本地缓存
   * @param {number} value - 当前体力值
   */
  saveStrength(value) {
    wx.setStorageSync(STORAGE_KEY_STRENGTH, {
      value: value,
      lastUpdate: Date.now()
    });
  },

  /**
   * 启动体力定时恢复
   * 每分钟恢复2体力
   * 【修改】只有当前体力小于体力槽时才恢复，且最多恢复到体力槽
   */
  startStrengthRecovery() {
    // 清除已有定时器
    if (this.data.strengthRecoverTimer) {
      clearInterval(this.data.strengthRecoverTimer);
    }

    // 每分钟检查并恢复体力
    const timer = setInterval(() => {
      const { strength, strengthCap } = this.data;
      // 【修改】只有当前体力小于体力槽时才恢复
      if (strength < strengthCap) {
        // 最多恢复到体力槽
        const newStrength = Math.min(strength + STRENGTH_RECOVER_PER_MINUTE, strengthCap);
        this.setData({ strength: newStrength });
        this.saveStrength(newStrength);
        console.log('[strengthRecovery] 体力恢复:', newStrength, '/', strengthCap);
      }
    }, 60 * 1000); // 每分钟执行一次

    this.setData({ strengthRecoverTimer: timer });
  },

  /**
   * 消耗体力
   * @param {number} cost - 消耗的体力值
   * @returns {boolean} 是否消耗成功
   */
  consumeStrength(cost) {
    const { strength } = this.data;
    if (strength < cost) {
      return false;
    }
    const newStrength = strength - cost;
    this.setData({ strength: newStrength });
    this.saveStrength(newStrength);
    console.log('[consumeStrength] 消耗体力:', cost, '剩余:', newStrength);
    return true;
  },

  /**
   * 增加体力（奖励类，可以突破体力槽）
   * @param {number} amount - 增加的体力值
   */
  addStrength(amount) {
    const { strength } = this.data;
    // 【修改】奖励体力可以突破体力槽限制
    const newStrength = strength + amount;
    this.setData({ strength: newStrength });
    this.saveStrength(newStrength);
    console.log('[addStrength] 增加体力:', amount, '当前:', newStrength);
  },

  /**
   * 检查体力是否足够
   * @param {number} required - 需要的体力值
   * @returns {boolean}
   */
  hasEnoughStrength(required = STRENGTH_COST_PER_GAME) {
    return this.data.strength >= required;
  },

  /**
   * 页面卸载时清除定时器
   */
  onUnload() {
    if (this.data.strengthRecoverTimer) {
      clearInterval(this.data.strengthRecoverTimer);
    }
  },

  /**
   * 体力图标加载失败时的处理
   */
  onStrengthIconError() {
    console.error('[onStrengthIconError] 体力图标加载失败');
    // 图标加载失败时使用备用方案（显示文字）
    this.setData({ strengthIconError: true });
  },

  /**
   * 核心机制：利用 onShow 实现"分享获得步数"
   *
   * 历史背景：微信小程序官方已废弃 wx.onShareAppMessage 的 success 回调
   * 实现方案：在点击分享按钮时设置 isSharingForSteps = true
   *          当用户从分享面板返回时，onShow 被触发，检测到标记后获得步数
   *          无论用户是否真的分享了，只要唤起过面板就算成功
   *
   * 【星级评定】使用 shareForSteps() 方法，会记录分享次数并增加步数
   */
  onShow() {
    if (this.data.isSharingForSteps) {
      this.setData({ isSharingForSteps: false });

      // 调用带次数限制的分享获得步数
      this.shareForSteps();
    }

    // 【修复】重新初始化广告实例（页面从后台返回时可能需要重新创建）
    if (!this.videoAd) {
      console.log('[onShow] 广告实例不存在，重新初始化');
      this.initVideoAd();
    }
  },

  /**
   * 分享卡片配置
   * 当 isSharingForSteps 为 true 时，显示获得步数专用分享文案
   */
  onShareAppMessage() {
    if (this.data.isSharingForSteps) {
      return {
        title: '这道残局太烧脑了，你能解开吗？',
        path: '/pages/puzzle-game/puzzle-game',
        imageUrl: '/images/share.png'
      };
    }
    return {
      title: '谁输谁洗碗 - 残局挑战',
      path: '/pages/puzzle-game/puzzle-game'
    };
  },

  // ==================== 数据初始化 ====================

  /**
   * 初始化数据
   * 先加载玩家进度，再加载关卡数据
   */
  async initData() {
    this.setData({ isLoading: true });
    
    try {
      // 1. 加载玩家进度
      await this.loadPlayerProgress();
      
      // 2. 加载关卡数据
      await this.loadLevels();
      
    } catch (err) {
      console.error('[initData] 初始化失败:', err);
      this.setData({ errorMsg: '加载失败，请下拉刷新重试' });
      // 如果云端加载失败，使用本地模拟数据作为降级方案
      this.initMockData();
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 从云端加载玩家进度
   * 如果玩家没有存档，自动创建初始存档
   * 【关卡解锁】同时加载 unlockedRangeEnd（已解锁区间终点）
   * 【星级同步】同步云端星级数据到本地
   */
  async loadPlayerProgress() {
    try {
      // 先尝试从本地缓存读取
      const localProgress = wx.getStorageSync('puzzle_player_progress');

      const { result } = await wx.cloud.callFunction({
        name: 'syncProgress'
      });

      if (result.success) {
        // 合并云端和本地数据，以较大的 unlockedRangeEnd 为准
        const cloudRangeEnd = result.data.unlockedRangeEnd || 40;
        const localRangeEnd = localProgress?.unlockedRangeEnd || 40;
        const maxRangeEnd = Math.max(cloudRangeEnd, localRangeEnd);

        this.setData({
          playerProgress: {
            unlockedLevel: result.data.unlockedLevel || 1,
            totalCompleted: result.data.totalCompleted || 0,
            unlockedRangeEnd: maxRangeEnd
          }
        });

        // 【简化】不再同步详细的关卡记录，只使用本地数据
        // 云端只保存星星总数用于排行榜展示
        console.log('[loadPlayerProgress] 加载进度成功:', result.data, '解锁区间:', maxRangeEnd);
      } else if (localProgress) {
        // 云端失败但本地有数据，使用本地数据
        this.setData({
          playerProgress: {
            unlockedLevel: localProgress.unlockedLevel || 1,
            totalCompleted: localProgress.totalCompleted || 0,
            unlockedRangeEnd: localProgress.unlockedRangeEnd || 40
          }
        });
      }
    } catch (err) {
      console.error('[loadPlayerProgress] 加载失败:', err);
      // 尝试使用本地缓存
      const localProgress = wx.getStorageSync('puzzle_player_progress');
      if (localProgress) {
        this.setData({
          playerProgress: {
            unlockedLevel: localProgress.unlockedLevel || 1,
            totalCompleted: localProgress.totalCompleted || 0,
            unlockedRangeEnd: localProgress.unlockedRangeEnd || 40
          }
        });
      }
    }
  },

  /**
   * 从云端加载关卡数据
   * 采用分页加载策略，只加载当前解锁关卡前后各 LEVELS_PER_BATCH/2 关
   * 避免一次性加载所有关卡造成性能问题
   */
  async loadLevels() {
    try {
      const { unlockedLevel } = this.data.playerProgress;
      
      // 计算加载范围：当前关卡前后各 25 关
      const startLevel = Math.max(1, unlockedLevel - Math.floor(LEVELS_PER_BATCH / 2));
      const endLevel = unlockedLevel + Math.floor(LEVELS_PER_BATCH / 2);
      
      const { result } = await wx.cloud.callFunction({
        name: 'getLevels',
        data: {
          startLevel,
          endLevel
        }
      });
      
      if (result.success && result.data) {
        this.rawLevelsCache = result.data;
        // 获取最大关卡ID，用于滑动条
        const maxLevelId = Math.max(...result.data.map(l => l.id));
        // 计算中间刻度值
        const middleMark = Math.floor(maxLevelId / 2);
        this.setData({
          maxLevel: maxLevelId,
          middleMark: middleMark,
          sliderValue: this.data.playerProgress.unlockedLevel || 1
        });
        this.renderMap();
        console.log('[loadLevels] 加载关卡成功:', result.data.length, '关，最大关卡:', maxLevelId, '中间刻度:', middleMark);
      }
    } catch (err) {
      console.error('[loadLevels] 加载失败:', err);
      throw err;
    }
  },

  /**
   * 【P1 修复】加载更多关卡（用于连续闯关时缓存续充）
   * 当玩家连续闯关超出当前缓存范围时，无感加载后续关卡
   * @param {number} targetLevel - 需要加载的目标关卡ID
   */
  async loadMoreLevels(targetLevel) {
    try {
      // 计算新的加载范围：以目标关卡为中心，前后各 25 关
      const startLevel = Math.max(1, targetLevel - Math.floor(LEVELS_PER_BATCH / 2));
      const endLevel = targetLevel + Math.floor(LEVELS_PER_BATCH / 2);
      
      const { result } = await wx.cloud.callFunction({
        name: 'getLevels',
        data: { startLevel, endLevel }
      });
      
      if (result.success && result.data) {
        // 合并新加载的数据到缓存，避免重复
        const existingIds = new Set(this.rawLevelsCache.map(l => l.id));
        const newLevels = result.data.filter(l => !existingIds.has(l.id));
        
        this.rawLevelsCache = [...this.rawLevelsCache, ...newLevels];
        // 按关卡ID排序
        this.rawLevelsCache.sort((a, b) => a.id - b.id);
        
        console.log('[loadMoreLevels] 续充缓存成功:', newLevels.length, '关，当前缓存共', this.rawLevelsCache.length, '关');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[loadMoreLevels] 加载更多关卡失败:', err);
      return false;
    }
  },

  /**
   * 本地模拟数据（降级方案）
   * 当云端加载失败时使用，确保玩家可以正常游戏
   */
  initMockData() {
    const rawLevels = [
      { id: 10, difficulty: 'hard', starLevel: 3, answer: '9012', clues: [{guess:'1567',a:0,b:1},{guess:'8267',a:0,b:1},{guess:'4593',a:0,b:1}] },
      { id: 9, difficulty: 'medium', starLevel: 2, answer: '5823', clues: [{guess:'1567',a:1,b:0},{guess:'8267',a:1,b:1},{guess:'4593',a:1,b:1},{guess:'5281',a:1,b:2}] },
      { id: 8, difficulty: 'easy', starLevel: 1, answer: '1234', clues: [{guess:'5678',a:0,b:0},{guess:'9012',a:0,b:2},{guess:'3456',a:0,b:2},{guess:'1278',a:2,b:0},{guess:'8239',a:2,b:0}] },
      { id: 7, difficulty: 'easy', starLevel: 1, answer: '4321', clues: [{guess:'4567',a:1,b:0},{guess:'8901',a:0,b:1},{guess:'4398',a:2,b:0},{guess:'1234',a:0,b:4},{guess:'4231',a:2,b:2}] },
      { id: 6, difficulty: 'medium', starLevel: 2, answer: '8765', clues: [{guess:'1234',a:0,b:0},{guess:'5678',a:0,b:4},{guess:'8756',a:2,b:2},{guess:'8675',a:2,b:2}] },
      { id: 5, difficulty: 'easy', starLevel: 1, answer: '1357', clues: [{guess:'2468',a:0,b:0},{guess:'1902',a:1,b:0},{guess:'1384',a:2,b:0},{guess:'1350',a:3,b:0},{guess:'7531',a:0,b:4}] },
      { id: 4, difficulty: 'hard', starLevel: 3, answer: '2468', clues: [{guess:'1357',a:0,b:0},{guess:'8642',a:0,b:4},{guess:'2648',a:2,b:2}] },
      { id: 3, difficulty: 'medium', starLevel: 2, answer: '9876', clues: [{guess:'1234',a:0,b:0},{guess:'9812',a:2,b:0},{guess:'9867',a:2,b:2},{guess:'6789',a:0,b:4}] },
      { id: 2, difficulty: 'easy', starLevel: 1, answer: '1111', clues: [{guess:'2222',a:0,b:0},{guess:'3333',a:0,b:0},{guess:'1234',a:1,b:0},{guess:'1123',a:2,b:0},{guess:'1112',a:3,b:0}] },
      { id: 1, difficulty: 'easy', starLevel: 1, answer: '0987', clues: [{guess:'1234',a:0,b:0},{guess:'5612',a:0,b:0},{guess:'0912',a:2,b:0},{guess:'0981',a:3,b:0},{guess:'7890',a:0,b:4}] }
    ];

    this.rawLevelsCache = rawLevels;
    this.renderMap();
  },

  // ==================== 地图逻辑 ====================

  /**
   * 滑动条拖动中（实时更新显示值）
   */
  onSliderChanging(e) {
    const value = e.detail.value;
    this.setData({ sliderValue: value });
  },

  /**
   * 滑动条区域触摸开始（用于收起/展开手势）
   */
  onSliderTouchStart(e) {
    this.sliderTouchStartX = e.touches[0].clientX;
  },

  /**
   * 滑动条区域触摸结束（用于收起/展开手势）
   * 左滑收起，右滑展开
   */
  onSliderTouchEnd(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - this.sliderTouchStartX;
    const { isSliderCollapsed } = this.data;

    // 滑动距离阈值
    const threshold = 50;

    if (!isSliderCollapsed && deltaX < -threshold) {
      // 展开状态 + 左滑 = 收起
      this.setData({ isSliderCollapsed: true });
    } else if (isSliderCollapsed && deltaX > threshold) {
      // 收起状态 + 右滑 = 展开
      this.setData({ isSliderCollapsed: false });
    }

    // 重置触摸状态
    this.sliderTouchStartX = 0;
  },

  /**
   * 滑动条拖动完成（松开后滚动到对应关卡）
   */
  onSliderChange(e) {
    const value = e.detail.value;
    const targetLevel = parseInt(value);

    this.setData({ sliderValue: targetLevel });

    // 检查目标关卡是否在缓存中
    const targetInCache = this.rawLevelsCache.find(l => l.id === targetLevel);
    if (!targetInCache) {
      // 不在缓存中，先加载
      wx.showLoading({ title: '加载中...' });
      this.loadMoreLevels(targetLevel).then(() => {
        wx.hideLoading();
        // 【修复】重新渲染地图后再滚动
        this.renderMap();
        // 延迟执行滚动，确保渲染完成
        setTimeout(() => {
          this.scrollToLevel(targetLevel);
        }, 100);
      });
    } else {
      this.scrollToLevel(targetLevel);
    }
  },

  /**
   * 滚动到指定关卡
   * @param {number} levelId - 目标关卡ID
   */
  scrollToLevel(levelId) {
    // 使用 wx.createSelectorQuery 获取元素位置
    const query = wx.createSelectorQuery().in(this);
    
    query.select(`#node-${levelId}`).boundingClientRect();
    query.select('.map-scroll').boundingClientRect();
    query.select('.map-nodes-container').boundingClientRect();
    
    query.exec((res) => {
      if (!res[0] || !res[1] || !res[2]) {
        console.log('[scrollToLevel] 获取元素位置失败', res);
        return;
      }
      
      const nodeRect = res[0];
      const scrollRect = res[1];
      const containerRect = res[2];
      
      // 计算当前关卡在内容容器中的相对位置
      const nodeRelativeTop = nodeRect.top - containerRect.top;
      
      // 计算需要将当前关卡滚动到屏幕中间的位置
      const scrollCenter = scrollRect.height / 2;
      const nodeCenter = nodeRect.height / 2;
      
      // 目标滚动位置 = 节点相对位置 + 节点中心 - 视口中心
      let scrollTop = nodeRelativeTop + nodeCenter - scrollCenter;
      scrollTop = Math.max(0, scrollTop);
      
      this.setData({ scrollTop });
      
      // 显示提示
      wx.showToast({
        title: `已定位到第${levelId}关`,
        icon: 'none',
        duration: 1500
      });
    });
  },

  /**
   * 渲染地图关卡列表
   * 根据玩家进度计算每个关卡的显示状态
   * 使用蜿蜒曲折算法计算关卡节点的水平偏移
   * 【星级评定】已通关关卡显示实际获得的星级（基于复活次数）
   */
  renderMap() {
    const { unlockedLevel, unlockedRangeEnd } = this.data.playerProgress;
    const len = this.rawLevelsCache.length;

    const mapLevels = this.rawLevelsCache.map((level, index) => {
      // 蜿蜒曲折算法：使用正弦函数计算水平偏移，形成蛇形路径
      const reverseIndex = len - 1 - index;
      const offset = Math.sin(reverseIndex * 0.8) * 30; // 30px 偏移量

      // 计算关卡状态（所有未解锁关卡统一显示为 locked，不区分前置未完成和区间锁定）
      let status = 'locked';
      if (level.id < unlockedLevel) status = 'completed';
      if (level.id === unlockedLevel) status = 'current';

      // 【星级评定】读取通关记录，获取实际获得的星级
      // 已通关关卡如果没有星级记录，默认显示3星（假设完美通关）
      let earnedStars = level.starLevel || 1; // 默认使用关卡难度星级
      if (status === 'completed') {
        const record = this.loadLevelRecordFromCache(level.id);
        if (record && record.stars !== undefined) {
          earnedStars = record.stars;
        } else {
          // 已通关但没有星级记录，默认3星
          earnedStars = 3;
        }
      }

      return { ...level, offset, status, earnedStars };
    });

    this.setData({ mapLevels });

    // 计算累计获得的星星总数用于顶部显示
    this.updateTotalEarnedStars();

    // 延迟滚动到当前关卡，确保渲染完成且位于屏幕中间
    setTimeout(() => {
      this.scrollToCurrentLevel();
    }, 300);

    // 【修复】在关键关卡节点（40、60、80...）确保广告已初始化
    // 当用户即将到达需要解锁的关卡时，提前初始化广告
    const nextUnlockLevel = unlockedRangeEnd + 1; // 下一关需要解锁的关卡
    if (unlockedLevel >= nextUnlockLevel - 5 && unlockedLevel <= nextUnlockLevel) {
      // 在解锁前5关到解锁关卡之间，确保广告已初始化
      if (!this.videoAd) {
        console.log(`[renderMap] 接近解锁关卡${nextUnlockLevel}，提前初始化广告`);
        this.initVideoAd();
      }
    }
  },

  /**
   * 更新累计获得的星星总数（用于顶部信息栏）
   * 遍历所有已通关关卡，累加获得的星级
   */
  updateTotalEarnedStars() {
    const { unlockedLevel } = this.data.playerProgress;
    let totalStars = 0;

    // 遍历所有已通关关卡（1 到 unlockedLevel - 1）
    for (let levelId = 1; levelId < unlockedLevel; levelId++) {
      const record = this.loadLevelRecordFromCache(levelId);
      if (record && record.stars !== undefined) {
        totalStars += record.stars;
      } else {
        // 没有记录默认3星
        totalStars += 3;
      }
    }

    this.setData({ totalEarnedStars: totalStars });
  },

  /**
   * 滚动到当前关卡并使其位于屏幕中间
   */
  scrollToCurrentLevel() {
    const { unlockedLevel } = this.data.playerProgress;

    // 使用 wx.createSelectorQuery 获取元素位置
    const query = wx.createSelectorQuery().in(this);

    // 获取当前关卡元素和滚动容器的位置信息
    query.select(`#node-${unlockedLevel}`).boundingClientRect();
    query.select('.map-scroll').boundingClientRect();
    query.select('.map-nodes-container').boundingClientRect();

    query.exec((res) => {
      if (!res[0] || !res[1] || !res[2]) {
        console.log('[scrollToCurrentLevel] 获取元素位置失败', res);
        return;
      }

      const nodeRect = res[0];           // 当前关卡元素位置
      const scrollRect = res[1];         // 滚动容器位置
      const containerRect = res[2];      // 内容容器位置

      console.log('[scrollToCurrentLevel] nodeRect:', nodeRect);
      console.log('[scrollToCurrentLevel] scrollRect:', scrollRect);

      // 计算当前关卡在内容容器中的相对位置
      const nodeRelativeTop = nodeRect.top - containerRect.top;

      // 计算需要将当前关卡滚动到屏幕中间的位置
      const scrollCenter = scrollRect.height / 2;
      const nodeCenter = nodeRect.height / 2;

      // 目标滚动位置 = 节点相对位置 + 节点中心 - 视口中心
      let scrollTop = nodeRelativeTop + nodeCenter - scrollCenter;

      // 确保滚动位置不小于0
      scrollTop = Math.max(0, scrollTop);

      console.log('[scrollToCurrentLevel] 计算滚动位置:', scrollTop);

      // 使用 setData 更新 scroll-top，触发滚动
      this.setData({ scrollTop });
    });
  },

  // ==================== 页面切换 ====================

  /**
   * 打开游戏对局
   * 计算本关的容错步数，根据难度星级动态调整
   *
   * 步数计算规则（来自 puzzle.md）：
   * - 简单（1星）：maxSteps = 线索数量 - 2（至少保留 1 次）
   * - 中等（2星）：maxSteps = 线索数量 - 1（至少保留 1 次）
   * - 困难（3星）：maxSteps = 线索数量（无缩减）
   */
  async openGame(e) {
    const levelId = e.currentTarget.dataset.id;

    // 检查关卡是否已解锁（通关进度）
    if (levelId > this.data.playerProgress.unlockedLevel) {
      wx.showToast({ title: '该关卡尚未解锁', icon: 'none' });
      return;
    }

    // 【关卡解锁】检查关卡是否在已解锁区间内
    const { unlockedRangeEnd } = this.data.playerProgress;
    if (levelId > unlockedRangeEnd) {
      // 需要解锁新区间
      this.showUnlockModalForLevel(levelId);
      return;
    }

    // 查找关卡数据
    let gameData = this.rawLevelsCache.find(l => l.id === levelId);

    // 【修复】如果关卡不在缓存中，尝试加载更多关卡
    if (!gameData) {
      wx.showLoading({ title: '加载关卡中...', mask: true });
      const loadSuccess = await this.loadMoreLevels(levelId);
      wx.hideLoading();

      if (loadSuccess) {
        // 重新查找
        gameData = this.rawLevelsCache.find(l => l.id === levelId);
      }

      if (!gameData) {
        wx.showToast({ title: '关卡数据加载失败', icon: 'none' });
        return;
      }

      // 重新渲染地图以显示新加载的关卡
      this.renderMap();
    }

    // 判断是否已经过关
    const isCompleted = levelId < this.data.playerProgress.unlockedLevel;

    // 【已通关关卡】显示弹窗选择查看答案或重新挑战
    if (isCompleted) {
      // 读取通关记录获取星级
      const record = this.loadLevelRecordFromCache(levelId);
      const stars = record?.stars ?? 3;

      this.setData({
        showCompletedLevelModal: true,
        completedLevelId: levelId,
        completedLevelStars: stars
      });
      return;
    }

    // 【当前关卡】显示体力确认弹窗
    this.setData({
      showStrengthConfirmModal: true,
      pendingLevelId: levelId,
      pendingGameData: gameData
    });
  },

  /**
   * 关闭体力确认弹窗
   * 【修改】如果是从胜利弹窗进入的（当前在游戏页面），返回地图；否则只是关闭弹窗
   */
  closeStrengthConfirmModal() {
    const { currentPage, pendingLevelId } = this.data;

    this.setData({
      showStrengthConfirmModal: false,
      pendingLevelId: 0,
      pendingGameData: null
    });

    // 如果当前在游戏页面且有待确认的关卡（从胜利弹窗进入），返回地图页面
    if (currentPage === 'game' && pendingLevelId > 0) {
      // 返回地图页面
      this.closeGame();
    }
    // 否则在地图页面，只是关闭弹窗，不做其他操作
  },

  /**
   * 确认开始关卡
   * 检查体力并扣除后进入游戏
   */
  confirmStartLevel() {
    const { pendingLevelId, pendingGameData, strength } = this.data;

    // 关闭确认弹窗
    this.setData({ showStrengthConfirmModal: false });

    // 检查体力是否足够
    if (strength < STRENGTH_COST_PER_GAME) {
      // 体力不足，显示体力不足弹窗
      this.setData({ showStrengthModal: true });
      return;
    }

    // 扣除体力
    this.consumeStrength(STRENGTH_COST_PER_GAME);

    // 进入游戏
    this.enterGame(pendingLevelId, pendingGameData);

    // 清空待确认数据
    this.setData({
      pendingLevelId: 0,
      pendingGameData: null
    });
  },

  /**
   * 进入游戏
   * @param {number} levelId - 关卡ID
   * @param {Object} gameData - 关卡数据
   * @param {boolean} isRetry - 是否是重新挑战
   */
  enterGame(levelId, gameData, isRetry = false) {
    // 使用数据库中的 maxSteps（恒定3步）
    const maxSteps = gameData.maxSteps || 3;

    // 默认只显示前3条线索
    const displayedClues = gameData.clues.slice(0, 3);

    // 从本地缓存读取挑战记录
    const cachedGuesses = this.loadGuessesFromCache(levelId);

    // 从本地缓存读取本关的分享/广告使用记录
    const reviveRecord = this.loadReviveRecordFromCache(levelId);

    // 初始化输入框
    let inputBuffer = [];

    // 切换到游戏页面，初始化对局数据
    this.setData({
      currentGameData: gameData,
      maxSteps,
      originalMaxSteps: maxSteps,
      usedSteps: cachedGuesses.length,
      totalUsedSteps: 0,
      inputBuffer,
      playerGuesses: cachedGuesses,
      hasUsedShare: reviveRecord.hasUsedShare || false,
      hasUsedAd: reviveRecord.hasUsedAd || false,
      showAllClues: false,
      displayedClues,
      isReadOnly: false,
      currentPage: 'game'
    });

    // 【修复】进入游戏页面时确保广告已初始化（用于关卡解锁）
    if (!this.videoAd) {
      console.log('[enterGame] 游戏页面广告未初始化，重新初始化');
      this.initVideoAd();
    }

    // 【AB提示】首次进入游戏页面时显示提示
    this.checkAndShowABTip();
  },

  /**
   * 检查并显示AB提示弹窗
   */
  checkAndShowABTip() {
    // 检查本地缓存是否已设置不再提示
    const tipShown = wx.getStorageSync(STORAGE_KEY_AB_TIP_SHOWN);
    if (tipShown) {
      return; // 已设置不再提示，直接返回
    }

    // 显示AB提示弹窗
    this.setData({
      showABTipModal: true,
      abTipDoNotShowAgain: false
    });
  },

  /**
   * 关闭AB提示弹窗
   */
  closeABTipModal() {
    const { abTipDoNotShowAgain } = this.data;

    // 如果勾选了不再提示，保存到本地缓存
    if (abTipDoNotShowAgain) {
      wx.setStorageSync(STORAGE_KEY_AB_TIP_SHOWN, true);
    }

    this.setData({
      showABTipModal: false
    });
  },

  /**
   * 切换不再提示选项
   */
  toggleDoNotShowAgain() {
    this.setData({
      abTipDoNotShowAgain: !this.data.abTipDoNotShowAgain
    });
  },

  /**
   * 【关卡解锁】显示解锁弹窗
   * 计算需要解锁的区间并显示弹窗
   * @param {number} levelId - 目标关卡ID
   */
  showUnlockModalForLevel(levelId) {
    // 计算解锁区间（每20关一个区间）
    // 21-40, 41-60, 61-80, ...
    const rangeStart = Math.floor((levelId - 1) / 20) * 20 + 1;
    const rangeEnd = rangeStart + 19;

    this.setData({
      showUnlockModal: true,
      unlockTargetLevel: levelId,
      unlockRangeStart: rangeStart,
      unlockRangeEnd: rangeEnd
    });

    console.log(`[showUnlockModalForLevel] 关卡${levelId}需要解锁区间 ${rangeStart}-${rangeEnd}`);
  },

  /**
   * 【关卡解锁】观看广告解锁关卡区间
   * 【修复】添加广告状态检查和错误处理
   */
  async watchAdToUnlock() {
    // 【修复】如果广告实例不存在，尝试重新初始化
    if (!this.videoAd) {
      console.log('[watchAdToUnlock] 广告实例不存在，尝试重新初始化');
      this.initVideoAd();
      wx.showToast({ title: '广告加载中，请稍后再试', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载广告中', mask: true });

    try {
      // 【修复】先加载广告，确保广告已准备好
      await this.videoAd.load();
      await this.videoAd.show();
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('[watchAdToUnlock] 广告显示失败:', err);

      // 【修复】根据错误类型处理
      if (err.errCode === 1000 || err.errCode === 1001) {
        // 广告加载失败，尝试重新初始化
        console.log('[watchAdToUnlock] 广告需要重新初始化');
        this.videoAd = null;
        this.initVideoAd();
        wx.showToast({ title: '广告加载中，请稍后再试', icon: 'none' });
      } else {
        // 其他错误，显示通用提示
        wx.showToast({ title: '广告加载失败，请稍后再试', icon: 'none' });
      }
    }
  },

  /**
   * 【关卡解锁】广告观看完成后的回调
   * 解锁关卡区间并更新进度
   * 【自动进入】如果解锁前标记了自动进入关卡，则解锁后自动进入
   */
  async onUnlockAdComplete() {
    const { unlockRangeEnd, playerProgress, autoEnterLevelAfterUnlock } = this.data;

    // 更新已解锁区间
    const newProgress = {
      ...playerProgress,
      unlockedRangeEnd: unlockRangeEnd
    };

    this.setData({
      playerProgress: newProgress,
      showUnlockModal: false
    });

    // 保存到本地缓存
    wx.setStorageSync('puzzle_player_progress', newProgress);

    // 静默上报云端
    this.reportUnlockProgress(newProgress);

    wx.showToast({
      title: `已解锁 ${this.data.unlockRangeStart}-${unlockRangeEnd} 关`,
      icon: 'none',
      duration: 2000
    });

    // 重新渲染地图
    this.renderMap();

    // 【自动进入】如果标记了解锁后自动进入关卡，则自动进入
    if (autoEnterLevelAfterUnlock > 0) {
      const targetLevel = autoEnterLevelAfterUnlock;
      // 清除标记
      this.setData({ autoEnterLevelAfterUnlock: 0 });

      // 延迟一下让用户看到解锁成功的提示
      setTimeout(async () => {
        // 查找关卡数据
        let gameData = this.rawLevelsCache.find(l => l.id === targetLevel);

        // 如果不在缓存中，尝试加载
        if (!gameData) {
          wx.showLoading({ title: '加载关卡...', mask: true });
          const loadSuccess = await this.loadMoreLevels(targetLevel);
          wx.hideLoading();

          if (loadSuccess) {
            gameData = this.rawLevelsCache.find(l => l.id === targetLevel);
          }
        }

        if (gameData) {
          // 显示体力确认弹窗
          this.setData({
            showStrengthConfirmModal: true,
            pendingLevelId: targetLevel,
            pendingGameData: gameData
          });
        } else {
          wx.showToast({ title: '关卡数据加载失败', icon: 'none' });
        }
      }, 500);
    }
  },

  /**
   * 【关卡解锁】静默上报解锁进度到云端
   * @param {Object} newProgress - 新的进度数据
   */
  async reportUnlockProgress(newProgress) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'syncProgress',
        data: {
          unlockedRangeEnd: newProgress.unlockedRangeEnd
        }
      });

      if (result.success) {
        console.log('[reportUnlockProgress] 上报成功:', result);
      }
    } catch (err) {
      // 静默失败
      console.error('[reportUnlockProgress] 上报失败:', err);
    }
  },

  /**
   * 【关卡解锁】关闭解锁弹窗
   * 清除自动进入标记，如果在游戏页面则返回关卡选择页面
   */
  closeUnlockModal() {
    const { currentPage } = this.data;

    this.setData({
      showUnlockModal: false,
      autoEnterLevelAfterUnlock: 0 // 清除自动进入标记
    });

    // 如果在游戏页面，返回到关卡选择页面（地图页面）
    if (currentPage === 'game') {
      this.closeGame();
    }
  },

  /**
   * 从本地缓存读取挑战记录
   * @param {number} levelId - 关卡ID
   * @returns {Array} 挑战记录数组
   */
  loadGuessesFromCache(levelId) {
    try {
      const cache = wx.getStorageSync(STORAGE_KEY_GUESSES) || {};
      return cache[levelId] || [];
    } catch (err) {
      console.error('[loadGuessesFromCache] 读取缓存失败:', err);
      return [];
    }
  },

  /**
   * 保存挑战记录到本地缓存
   * @param {number} levelId - 关卡ID
   * @param {Array} guesses - 挑战记录数组
   */
  saveGuessesToCache(levelId, guesses) {
    try {
      const cache = wx.getStorageSync(STORAGE_KEY_GUESSES) || {};
      cache[levelId] = guesses;
      wx.setStorageSync(STORAGE_KEY_GUESSES, cache);
      console.log('[saveGuessesToCache] 保存缓存成功:', levelId, guesses);
    } catch (err) {
      console.error('[saveGuessesToCache] 保存缓存失败:', err);
    }
  },

  /**
   * 从本地缓存读取复活记录
   * @param {number} levelId - 关卡ID
   * @returns {Object} 复活记录 {shareCount, adCount}
   */
  loadReviveRecordFromCache(levelId) {
    try {
      const cache = wx.getStorageSync(STORAGE_KEY_REVIVE) || {};
      return cache[levelId] || { shareCount: 0, adCount: 0 };
    } catch (err) {
      console.error('[loadReviveRecordFromCache] 读取缓存失败:', err);
      return { shareCount: 0, adCount: 0 };
    }
  },

  /**
   * 保存复活记录到本地缓存
   * @param {number} levelId - 关卡ID
   * @param {Object} record - 复活记录 {shareCount, adCount}
   */
  saveReviveRecordToCache(levelId, record) {
    try {
      const cache = wx.getStorageSync(STORAGE_KEY_REVIVE) || {};
      cache[levelId] = record;
      wx.setStorageSync(STORAGE_KEY_REVIVE, cache);
    } catch (err) {
      console.error('[saveReviveRecordToCache] 保存缓存失败:', err);
    }
  },

  /**
   * 从本地缓存读取通关记录
   * @param {number} levelId - 关卡ID
   * @returns {Object} 通关记录 {stars, shareCount, adCount, completedAt}
   */
  loadLevelRecordFromCache(levelId) {
    try {
      const cache = wx.getStorageSync(STORAGE_KEY_LEVEL_RECORDS) || {};
      return cache[levelId] || null;
    } catch (err) {
      console.error('[loadLevelRecordFromCache] 读取缓存失败:', err);
      return null;
    }
  },

  /**
   * 保存通关记录到本地缓存
   * @param {number} levelId - 关卡ID
   * @param {Object} record - 通关记录 {stars, shareCount, adCount, completedAt}
   */
  saveLevelRecordToCache(levelId, record) {
    try {
      const cache = wx.getStorageSync(STORAGE_KEY_LEVEL_RECORDS) || {};
      cache[levelId] = record;
      wx.setStorageSync(STORAGE_KEY_LEVEL_RECORDS, cache);
    } catch (err) {
      console.error('[saveLevelRecordToCache] 保存缓存失败:', err);
    }
  },

  /**
   * 切换显示全部线索/收起线索
   */
  toggleShowAllClues() {
    const { showAllClues, currentGameData } = this.data;
    const newShowAllClues = !showAllClues;
    
    // 根据状态决定显示全部还是只显示前3条
    const displayedClues = newShowAllClues 
      ? currentGameData.clues 
      : currentGameData.clues.slice(0, 3);
    
    this.setData({
      showAllClues: newShowAllClues,
      displayedClues
    });
  },

  /**
   * 关闭游戏，返回地图
   */
  closeGame() {
    this.setData({ currentPage: 'map' });
    this.renderMap();
  },

  /**
   * 【P0 修复】自定义导航栏返回按钮处理
   * 根据当前页面状态决定返回行为：
   * - 在地图页面：返回首页
   * - 在游戏页面：返回地图
   */
  onNavBack() {
    if (this.data.currentPage === 'game') {
      // 在游戏页面，返回地图
      this.closeGame();
    } else {
      // 在地图页面，返回首页
      wx.navigateBack();
    }
  },

  // ==================== 对局内部逻辑 ====================

  /**
   * 输入数字
   * 限制：最多4位数字
   * 【重要】允许输入重复数字，因为密码可能包含重复数字（如1123）
   */
  inputNum(e) {
    // 只读模式下禁止输入
    if (this.data.isReadOnly) return;

    const num = e.currentTarget.dataset.num;
    const { inputBuffer } = this.data;

    // 只有没猜满才能输入（允许重复数字）
    if (inputBuffer.length < 4) {
      this.setData({ inputBuffer: [...inputBuffer, num] });
    }
  },

  /**
   * 删除最后一个输入的数字
   */
  deleteNum() {
    // 只读模式下禁止删除
    if (this.data.isReadOnly) return;

    const { inputBuffer } = this.data;
    if (inputBuffer.length > 0) {
      inputBuffer.pop();
      this.setData({ inputBuffer: [...inputBuffer] });
    }
  },

  /**
   * 清空输入
   */
  clearInput() {
    // 只读模式下禁止清空
    if (this.data.isReadOnly) return;

    this.setData({ inputBuffer: [] });
  },

  /**
   * 计算 A/B 提示（支持重复数字的正确计算）
   * A：数字和位置都正确
   * B：数字正确但位置错误（防止重复记分）
   * 
   * 【算法警示】必须使用基于哈希计数的双重循环
   * 绝不可以用老式的 includes() 逻辑，否则一旦用户输入重复数字（如 1123）
   * 系统给出的 B 提示就会全部错乱！
   * 
   * @param {string} secret - 正确答案
   * @param {string} guess - 玩家猜测
   * @returns {Object} {a, b} A和B的数量
   */
  calculateAB(secret, guess) {
    let a = 0;
    const secretCounts = {};
    const guessCounts = {};
    
    // 找A并统计剩余未匹配数字的频次
    for (let i = 0; i < 4; i++) {
      const s = secret[i];
      const g = guess[i];
      if (s === g) {
        a++; // 数字和位置都正确
      } else {
        secretCounts[s] = (secretCounts[s] || 0) + 1;
        guessCounts[g] = (guessCounts[g] || 0) + 1;
      }
    }
    
    // 找B，防止多给B提示
    let b = 0;
    for (const k in guessCounts) {
      b += Math.min(guessCounts[k], secretCounts[k] || 0);
    }
    
    return { a, b };
  },

  /**
   * 提交猜测 - 核心逻辑（本地验算，0延迟）
   *
   * 重要：根据 puzzle.md 要求，所有答案比对、A/B提示计算必须在前端本地完成
   * 禁止编写 submitAnswer 云函数进行校验，确保玩家按下【确定】按钮时是0延迟反馈
   *
   * 流程：
   * 1. 本地验算胜利 → 显示胜利弹窗 → 上报进度
   * 2. 本地验算错误 → 显示A/B提示 → 增加已用步数 → 检查是否步数耗尽
   * 3. 步数耗尽 → 显示失败复活弹窗
   */
  submitGuess() {
    const { inputBuffer, currentGameData, usedSteps, maxSteps, playerGuesses, isReadOnly } = this.data;

    // 只读模式下禁止提交
    if (isReadOnly) {
      wx.showToast({ title: '本关已通关，仅可查看', icon: 'none' });
      return;
    }

    // 必须输入4位数字才能提交
    if (inputBuffer.length !== 4) return;

    const guessStr = inputBuffer.join('');

    // ====== 1. 本地验算胜利 ======
    if (guessStr === currentGameData.answer) {
      // 保存挑战记录到本地缓存
      const newGuesses = [...playerGuesses, { guess: guessStr, a: 4, b: 0 }];
      this.saveGuessesToCache(currentGameData.id, newGuesses);
      this.handleWin();
      return;
    }

    // ====== 2. 本地验算错误 ======
    const hints = this.calculateAB(currentGameData.answer, guessStr);
    const newUsedSteps = usedSteps + 1;

    // 添加到玩家猜测历史
    const newGuesses = [...playerGuesses, { guess: guessStr, a: hints.a, b: hints.b }];

    // 保存挑战记录到本地缓存
    this.saveGuessesToCache(currentGameData.id, newGuesses);

    // 更新状态：触发震动动画、清空输入、更新猜测记录
    this.setData({
      isWrongShake: true,
      inputBuffer: [],
      playerGuesses: newGuesses,
      usedSteps: newUsedSteps
    });

    // 滚动到底部显示最新猜测
    setTimeout(() => {
      this.setData({ isWrongShake: false, scrollToId: 'scroll-anchor' });
    }, 400);

    // ====== 3. 判负（步数耗尽）======
    if (newUsedSteps >= maxSteps) {
      setTimeout(() => {
        this.setData({ showLoseModal: true });
      }, 500);
    }
  },

  /**
   * 处理胜利
   * 1. 计算星级评定
   * 2. 保存通关记录（包含星级）
   * 3. 发放通关体力奖励（重新挑战不奖励）
   * 4. 显示胜利弹窗
   * 5. 更新本地进度
   * 6. 静默上报云端
   */
  handleWin() {
    const { currentGameData, playerProgress, hasUsedShare, hasUsedAd, isRetryChallenge } = this.data;

    // 计算本关获得的星级
    const earnedStars = this.calculateStarLevel();

    // 保存通关记录（包含星级、分享次数、广告次数）
    const levelRecord = {
      levelId: currentGameData.id,
      stars: earnedStars,
      hasUsedShare: hasUsedShare,
      hasUsedAd: hasUsedAd,
      completedAt: new Date().toISOString()
    };
    this.saveLevelRecordToCache(currentGameData.id, levelRecord);

    // 【通关体力奖励】根据星级发放体力奖励（重新挑战不奖励）
    let strengthReward = 0;
    if (!isRetryChallenge) {
      // 只有非重新挑战才发放体力奖励
      strengthReward = this.grantStrengthReward(earnedStars);
    }

    // 显示胜利弹窗（传递星级信息和体力奖励）
    this.setData({
      showWinModal: true,
      earnedStars: earnedStars,
      strengthReward: strengthReward,
      isRetryChallenge: false  // 重置重新挑战标记
    });

    // 更新本地进度
    let { unlockedLevel, totalCompleted, unlockedRangeEnd } = playerProgress;

    // 【0星处理】如果获得0星，不解锁下一关，需要重新挑战
    if (earnedStars === 0) {
      // 0星不解锁下一关，只保存通关记录
      totalCompleted++; // 累计通关次数+1
      const newProgress = { unlockedLevel, totalCompleted, unlockedRangeEnd };
      this.setData({
        playerProgress: newProgress
      });

      // 保存到本地缓存
      wx.setStorageSync('puzzle_player_progress', newProgress);

      wx.showToast({
        title: '获得0星，需重新挑战才能解锁下一关',
        icon: 'none',
        duration: 2500
      });

      // 静默上报云端
      this.reportWinToCloud(currentGameData.id, newProgress, levelRecord);
      return;
    }

    // 如果通关的是当前最高解锁关卡，则解锁下一关
    if (currentGameData.id === unlockedLevel) {
      unlockedLevel++;
    }
    // 累计通关次数+1（排行榜依据）
    totalCompleted++;

    const newProgress = { unlockedLevel, totalCompleted, unlockedRangeEnd };

    this.setData({
      playerProgress: newProgress
    });

    // 保存到本地缓存
    wx.setStorageSync('puzzle_player_progress', newProgress);

    // 静默上报云端（不阻塞用户体验）
    // 同时上报星级数据
    this.reportWinToCloud(currentGameData.id, newProgress, levelRecord);
  },

  /**
   * 静默上报通关进度到云端
   * @param {number} levelId - 通关的关卡ID
   * @param {Object} newProgress - 新的进度数据
   * @param {Object} levelRecord - 关卡通关记录（包含星级）
   */
  async reportWinToCloud(levelId, newProgress, levelRecord) {
    try {
      // 【简化】只计算星星总数上报，不上报详细关卡记录
      const totalStars = this.calculateTotalStars();

      const { result } = await wx.cloud.callFunction({
        name: 'reportWin',
        data: {
          levelId,
          unlockedLevel: newProgress.unlockedLevel,
          totalCompleted: newProgress.totalCompleted,
          totalStars: totalStars // 【简化】只上报星星总数
        }
      });

      if (result.success) {
        console.log('[reportWinToCloud] 上报成功:', result);
      }
    } catch (err) {
      // 静默失败，不影响用户体验
      console.error('[reportWinToCloud] 上报失败:', err);
    }
  },

  /**
   * 【简化】计算星星总数
   * 用于云端同步，只返回总数不上报详细记录
   */
  calculateTotalStars() {
    const { unlockedLevel } = this.data.playerProgress;
    let totalStars = 0;

    // 遍历所有已通关关卡（1 到 unlockedLevel - 1）
    for (let levelId = 1; levelId < unlockedLevel; levelId++) {
      const record = this.loadLevelRecordFromCache(levelId);
      if (record && record.stars !== undefined) {
        totalStars += record.stars;
      } else {
        // 没有记录默认3星
        totalStars += 3;
      }
    }

    return totalStars;
  },

  // ==================== 获得步数流转 ====================

  /**
   * 点击分享获得步数按钮
   * 检查次数限制，设置标记等待 onShow 触发获得步数
   */
  onShareForStepsTap() {
    const { hasUsedShare } = this.data;

    // 检查分享次数限制（最多1次）
    if (hasUsedShare) {
      wx.showToast({ title: '本关分享次数已达上限', icon: 'none' });
      return;
    }

    this.setData({ isSharingForSteps: true });
  },

  /**
   * 点击广告获得步数按钮
   * 检查次数限制，然后触发广告
   */
  onAdForStepsTap() {
    const { hasUsedAd } = this.data;

    // 检查广告次数限制（最多1次）
    if (hasUsedAd) {
      wx.showToast({ title: '本关广告次数已达上限', icon: 'none' });
      return;
    }

    // 调用广告显示方法
    this.adForStepsShow();
  },

  /**
   * 看广告获得步数
   * 显示激励视频广告，看完后获得步数
   */
  adForStepsShow() {
    if (!this.videoAd) {
      wx.showToast({ title: '广告加载中，请稍后再试', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载广告中' });

    // 用户触发广告后，显示激励视频广告
    this.videoAd.show()
      .then(() => {
        wx.hideLoading();
        console.log('[激励视频广告] 显示成功');
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('[激励视频广告] 显示失败', err);

        // 失败重试
        this.videoAd.load()
          .then(() => {
            console.log('[激励视频广告] 重新加载成功');
            return this.videoAd.show();
          })
          .catch((retryErr) => {
            console.error('[激励视频广告] 重试显示失败', retryErr);
            wx.showToast({ title: '广告加载失败，请稍后再试', icon: 'none' });
          });
      });
  },

  /**
   * 分享获得步数
   * 每次分享增加2步，最多1次
   * 【修复】获得步数后剩余步数 = 原始步数，不是累加
   */
  shareForSteps() {
    const { hasUsedShare, hasUsedAd, currentGameData, originalMaxSteps, usedSteps } = this.data;

    // 检查分享次数限制（最多1次）
    if (hasUsedShare) {
      wx.showToast({ title: '本关分享次数已达上限', icon: 'none' });
      return false;
    }

    // 【修复】maxSteps保持原始值，通过减少usedSteps来实现增加可用步数
    // 例如：原始3步，已用3步，分享后已用步数变为 3-2=1，剩余可用步数 = 3-1 = 2步
    const newUsedSteps = Math.max(0, usedSteps - 2);

    // 保存记录
    const record = { hasUsedShare: true, hasUsedAd };
    this.saveReviveRecordToCache(currentGameData.id, record);

    // 更新状态：保持maxSteps不变，减少usedSteps
    this.setData({
      hasUsedShare: true,
      maxSteps: originalMaxSteps,  // 保持原始步数不变
      usedSteps: newUsedSteps,      // 减少已用步数，相当于增加可用步数
      totalUsedSteps: this.data.totalUsedSteps + usedSteps, // 累加已用步数（用于统计）
      inputBuffer: [],
      showLoseModal: false
    });

    wx.showToast({
      title: '获得步数+2',
      icon: 'none',
      duration: 2000
    });

    return true;
  },

  /**
   * 广告获得步数
   * 每次观看广告增加3步，最多1次
   * 【修复】获得步数后剩余步数 = 原始步数，不是累加
   */
  adForSteps() {
    const { hasUsedShare, hasUsedAd, currentGameData, originalMaxSteps, usedSteps } = this.data;

    // 检查广告次数限制（最多1次）
    if (hasUsedAd) {
      wx.showToast({ title: '本关广告次数已达上限', icon: 'none' });
      return false;
    }

    // 【修复】maxSteps保持原始值，通过减少usedSteps来实现增加可用步数
    // 例如：原始3步，已用3步，广告后已用步数变为 3-3=0，剩余可用步数 = 3-0 = 3步
    const newUsedSteps = Math.max(0, usedSteps - 3);

    // 保存记录
    const record = { hasUsedShare, hasUsedAd: true };
    this.saveReviveRecordToCache(currentGameData.id, record);

    // 更新状态：保持maxSteps不变，减少usedSteps
    this.setData({
      hasUsedAd: true,
      maxSteps: originalMaxSteps,  // 保持原始步数不变
      usedSteps: newUsedSteps,      // 减少已用步数，相当于增加可用步数
      totalUsedSteps: this.data.totalUsedSteps + usedSteps, // 累加已用步数（用于统计）
      inputBuffer: [],
      showLoseModal: false
    });

    wx.showToast({
      title: '获得步数+3',
      icon: 'none',
      duration: 2000
    });

    return true;
  },

  /**
   * 计算关卡星级（基于复活次数）
   * 3星：无复活（hasUsedShare=false, hasUsedAd=false）
   * 2星：使用分享或广告任意一个
   * 1星：分享+广告都使用
   * 0星：未通过（挑战失败）
   * @returns {number} 星级 0-3
   */
  calculateStarLevel() {
    const { hasUsedShare, hasUsedAd } = this.data;

    // 无复活 = 3星
    if (!hasUsedShare && !hasUsedAd) {
      return 3;
    }

    // 使用了分享或广告其中一个 = 2星
    if ((hasUsedShare && !hasUsedAd) || (!hasUsedShare && hasUsedAd)) {
      return 2;
    }

    // 分享+广告都使用 = 1星
    if (hasUsedShare && hasUsedAd) {
      return 1;
    }

    return 0;
  },

  // ==================== 弹窗操作 ====================

  /**
   * 【P1 修复】进入下一关
   * 先显示体力确认弹窗，确认后再进入下一关
   * 【0星处理】如果当前关是0星，需要重新挑战才能进入下一关
   * 【关卡解锁】检查下一关是否在已解锁区间内
   */
  async nextLevel() {
    const nextId = this.data.currentGameData.id + 1;
    const { earnedStars } = this.data;

    // 【0星处理】如果当前关是0星，提示需要重新挑战
    if (earnedStars === 0) {
      wx.showToast({
        title: '本关获得0星，需重新挑战获得更高星级才能解锁下一关',
        icon: 'none',
        duration: 2500
      });
      return;
    }

    // 检查下一关是否已解锁
    if (nextId > this.data.playerProgress.unlockedLevel) {
      wx.showToast({ title: '下一关尚未解锁', icon: 'none' });
      return;
    }

    // 【关卡解锁】检查下一关是否在已解锁区间内
    const { unlockedRangeEnd } = this.data.playerProgress;
    if (nextId > unlockedRangeEnd) {
      // 需要解锁新区间，显示解锁弹窗
      this.setData({
        showWinModal: false, // 先关闭胜利弹窗
        autoEnterLevelAfterUnlock: nextId // 标记解锁后自动进入下一关
      });
      this.showUnlockModalForLevel(nextId);
      return;
    }

    // 查找下一关数据
    let gameData = this.rawLevelsCache.find(l => l.id === nextId);

    // 【P1 修复】如果下一关不在缓存中，触发无感加载
    if (!gameData) {
      wx.showLoading({ title: '加载下一关...', mask: true });
      const loadSuccess = await this.loadMoreLevels(nextId);
      wx.hideLoading();

      if (!loadSuccess) {
        wx.showToast({ title: '关卡数据加载失败', icon: 'none' });
        return;
      }

      // 重新查找
      gameData = this.rawLevelsCache.find(l => l.id === nextId);
      if (!gameData) {
        wx.showToast({ title: '关卡数据加载失败', icon: 'none' });
        return;
      }
    }

    // 【修改】关闭胜利弹窗，显示体力确认弹窗
    this.setData({
      showWinModal: false,
      showStrengthConfirmModal: true,
      pendingLevelId: nextId,
      pendingGameData: gameData
    });
  },

  /**
   * 放弃挑战，返回地图
   * 清空猜测记录，重置步数，避免重新进入时继续游戏
   */
  giveUpChallenge() {
    const { currentGameData } = this.data;

    // 清空本关的猜测记录
    this.saveGuessesToCache(currentGameData.id, []);

    // 关闭弹窗并返回地图
    this.setData({ showLoseModal: false });
    this.closeGame();

    wx.showToast({
      title: '已放弃挑战，可重新尝试',
      icon: 'none',
      duration: 1500
    });
  },

  /**
   * 胜利后返回地图
   */
  backToMap() {
    this.setData({ showWinModal: false });
    this.closeGame();
  },

  // ==================== 下拉刷新 ====================

  /**
   * 重新挑战本关
   * 清除猜测记录，恢复原始步数，重置复活状态
   */
  retryChallenge() {
    const { currentGameData } = this.data;

    // 清除本关的猜测记录
    this.saveGuessesToCache(currentGameData.id, []);

    // 清除复活记录
    this.saveReviveRecordToCache(currentGameData.id, { hasUsedShare: false, hasUsedAd: false });

    // 重置游戏状态
    const originalMaxSteps = currentGameData.maxSteps || 3;
    this.setData({
      maxSteps: originalMaxSteps,
      originalMaxSteps: originalMaxSteps,
      usedSteps: 0,
      inputBuffer: [],
      playerGuesses: [],
      hasUsedShare: false,
      hasUsedAd: false,
      showLoseModal: false,
      isWrongShake: false
    });

    wx.showToast({
      title: '重新开始挑战',
      icon: 'none',
      duration: 1500
    });
  },

  /**
   * 重新加载玩家进度和关卡数据
   */
  async onPullDownRefresh() {
    await this.initData();
    wx.stopPullDownRefresh();
  },

  // ==================== 已通关关卡弹窗处理 ====================

  /**
   * 关闭已通关关卡弹窗
   */
  closeCompletedLevelModal() {
    this.setData({
      showCompletedLevelModal: false,
      completedLevelId: 0,
      completedLevelStars: 0
    });
  },

  /**
   * 查看已通关关卡的答案
   * 以只读模式进入游戏，显示答案在输入框中
   */
  viewCompletedLevelAnswer() {
    const { completedLevelId } = this.data;
    
    // 查找关卡数据
    const gameData = this.rawLevelsCache.find(l => l.id === completedLevelId);
    if (!gameData) {
      wx.showToast({ title: '关卡数据加载失败', icon: 'none' });
      return;
    }

    // 关闭弹窗
    this.setData({ showCompletedLevelModal: false });

    // 以只读模式进入游戏
    const maxSteps = gameData.maxSteps || 3;
    const displayedClues = gameData.clues.slice(0, 3);

    // 加载该关卡的历史猜测记录（保留本地记录）
    const cachedGuesses = this.loadGuessesFromCache(completedLevelId);

    // 将答案转换为输入框数组，用于显示答案
    const answerArray = gameData.answer.split('');

    this.setData({
      currentGameData: gameData,
      maxSteps,
      originalMaxSteps: maxSteps,
      usedSteps: cachedGuesses.length,
      totalUsedSteps: 0,
      inputBuffer: answerArray,  // 显示正确答案在输入框中
      playerGuesses: cachedGuesses,  // 保留历史猜测记录
      hasUsedShare: false,
      hasUsedAd: false,
      showAllClues: false,
      displayedClues,
      isReadOnly: true,  // 设置为只读模式，禁止修改
      currentPage: 'game'
    });

    wx.showToast({
      title: '只读模式：可查看答案',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 重新挑战已通关关卡
   * 3星关卡不能重新挑战
   * 需要扣除20体力
   */
  retryCompletedLevel() {
    const { completedLevelId, completedLevelStars, strength } = this.data;

    // 检查是否是3星关卡
    if (completedLevelStars >= 3) {
      wx.showToast({
        title: '3星完美通关，无法重新挑战',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 检查体力是否足够
    if (!this.hasEnoughStrength(STRENGTH_COST_PER_GAME)) {
      this.setData({ showCompletedLevelModal: false });
      this.showStrengthModal();
      return;
    }

    // 扣除体力
    this.consumeStrength(STRENGTH_COST_PER_GAME);

    // 查找关卡数据
    const gameData = this.rawLevelsCache.find(l => l.id === completedLevelId);
    if (!gameData) {
      wx.showToast({ title: '关卡数据加载失败', icon: 'none' });
      return;
    }

    // 关闭弹窗并进入游戏（清除历史记录）
    this.setData({ 
      showCompletedLevelModal: false,
      isRetryChallenge: true  // 标记为重新挑战模式
    });

    // 清除本关的历史记录
    this.saveGuessesToCache(completedLevelId, []);
    this.saveReviveRecordToCache(completedLevelId, { hasUsedShare: false, hasUsedAd: false });

    // 进入游戏
    this.enterGame(completedLevelId, gameData, true);

    wx.showToast({
      title: `消耗${STRENGTH_COST_PER_GAME}体力，重新挑战`,
      icon: 'none',
      duration: 2000
    });
  },

  // ==================== 体力确认弹窗 - 观看广告 ====================

  /**
   * 从体力确认弹窗观看广告
   * 体力不足时点击"观看广告"按钮调用
   */
  async watchAdFromConfirmModal() {
    if (!this.videoAd) {
      wx.showToast({ title: '广告加载中，请稍后再试', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载广告中' });

    try {
      await this.videoAd.show();
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      // 失败重试
      try {
        await this.videoAd.load();
        await this.videoAd.show();
      } catch (retryErr) {
        wx.showToast({ title: '广告加载失败，请稍后再试', icon: 'none' });
      }
    }
  },

  // ==================== 体力不足弹窗处理（已废弃，保留方法兼容） ====================

  /**
   * 显示体力不足弹窗（已废弃，现在直接在确认弹窗中显示观看广告按钮）
   */
  showStrengthModal() {
    // 不再使用单独的体力不足弹窗
    console.log('[showStrengthModal] 此方法已废弃，请在体力确认弹窗中使用观看广告按钮');
  },

  /**
   * 关闭体力不足弹窗
   */
  closeStrengthModal() {
    this.setData({ showStrengthModal: false });
  },

  /**
   * 看广告获得体力（保留用于其他场景）
   */
  async watchAdForStrength() {
    if (!this.videoAd) {
      wx.showToast({ title: '广告加载中，请稍后再试', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载广告中' });

    try {
      await this.videoAd.show();
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      // 失败重试
      try {
        await this.videoAd.load();
        await this.videoAd.show();
      } catch (retryErr) {
        wx.showToast({ title: '广告加载失败，请稍后再试', icon: 'none' });
      }
    }
  },

  /**
   * 广告观看完成后的回调（用于体力奖励）
   * 注意：这个方法需要在广告关闭回调中调用
   */
  onAdForStrengthComplete() {
    // 增加120体力
    this.addStrength(120);
    
    this.setData({ showStrengthModal: false });
    
    wx.showToast({
      title: '恢复120体力',
      icon: 'success',
      duration: 2000
    });
  },

  // ==================== 通关体力奖励 ====================

  /**
   * 根据星级计算通关体力奖励
   * 3星：+30体力
   * 2星：+20体力
   * 1星：+10体力
   * 0星：无奖励
   * @param {number} stars - 星级
   * @returns {number} 体力奖励
   */
  calculateStrengthReward(stars) {
    switch (stars) {
      case 3: return STRENGTH_REWARD_3STAR;
      case 2: return STRENGTH_REWARD_2STAR;
      case 1: return STRENGTH_REWARD_1STAR;
      default: return 0;
    }
  },

  /**
   * 发放通关体力奖励
   * @param {number} stars - 星级
   */
  grantStrengthReward(stars) {
    const reward = this.calculateStrengthReward(stars);
    if (reward > 0) {
      this.addStrength(reward);
      console.log('[grantStrengthReward] 发放体力奖励:', reward, '星级:', stars);
    }
    return reward;
  }
});
