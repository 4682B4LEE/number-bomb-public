// 首页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')

Page({
  data: {
    digitCount: 4,          // 默认选择4位数
    bgmEnabled: false,      // BGM 默认关闭
    vibrationEnabled: false, // 震动默认关闭
    soundEffectEnabled: false, // 按钮音效默认关闭
    showSettingsModal: false,  // 是否显示设置弹窗
    showModeSelect: true,   // 显示游戏模式选择
    gameMode: 'local',      // 默认本地游戏模式
    playMode: 'local',      // 游戏玩法模式：local=本地双人, single=单人模式
    showSingleSubModes: false, // 是否显示单人模式子选项
    singleDigitMode: 'repeat', // 单人模式数字规则：repeat=可重复, unique=不重复
    userInfo: {},           // 用户信息
    isLoggedIn: false,      // 登录状态
    showNickNameInput: false, // 是否显示昵称输入弹窗
    tempAvatarUrl: '',      // 临时头像地址
    tempNickName: '',       // 临时昵称
    // 公告栏数据
    announcement: {
      text: 'v2.2.6 残局模式上线，联机再来一局可直接重开',
      url: '',              // 点击跳转链接（可选）
      version: '2.2.6.3',     // 当前版本号
      show: false           // 是否显示公告栏（根据本地存储决定）
    },
    // 反馈未读状态
    hasUnreadFeedback: false, // 是否有未读的反馈回复
    // ========== 联机对战数据 ==========
    showOnlineMode: false,   // 是否显示联机对战界面
    onlineState: 'hall',     // 联机状态：hall=大厅, waiting=等待中, setting=设置密码, playing=对战中, result=结算
    roomId: '',              // 当前房间号（底层 UUID）
    roomNumber: '',          // 对外展示的6位房间号
    roomInfo: null,          // 房间信息
    isHost: false,           // 是否为房主
    isWin: false,            // 是否获胜
    finishReason: '',        // 结束原因
    mySecretBuffer: '',      // 我的密码输入缓冲
    myGuessBuffer: '',       // 我的猜测输入缓冲
    joinRoomId: '',          // 加入房间时输入的房间号
    watcher: null,           // 数据库监听器
    heartbeatTimer: null,    // 心跳定时器
    offlineCountdownTimer: null, // 对方离线倒计时定时器
    myOpenid: '',            // 当前用户的openid，用于身份识别
    digitRule: 'repeat',     // 数字规则：repeat=可重复, unique=不重复
    timeLimit: 10,           // 时间限制：10=10分钟, 15=15分钟, 0=不限时
    quickDrawMode: false,    // 快枪手模式：false=关闭, true=开启
    gameEndTime: 0,          // 游戏结束时间戳
    countdownTimer: null,    // 倒计时定时器
    remainingTime: 0,        // 剩余时间（秒）
    turnCountdown: 0,        // 每轮倒计时（快枪手模式使用）
    turnTimer: null,         // 每轮倒计时定时器
    parsedHistory: [],       // 解析后的历史记录
    filteredHistory: [],     // 过滤后的历史记录
    myTurnCount: 0,          // 我的回合数
    roundCount: 0,           // 游戏轮次（两名玩家各猜一次为一轮）
    showOnlyMyHistory: false, // 是否只看自己的历史
    historyExpanded: false,   // 猜测记录是否展开
    onlineDisplayDigits: [], // 联机密码设置显示数字
    onlineGuessDisplayDigits: [], // 联机猜测显示数字
    onlineHintText: '',      // 联机提示文字
    opponentName: '',        // 对手昵称
    myName: '',              // 我的昵称
    
    // ========== 联机猜颜色数据（新增） ==========
    onlineGameType: 'number',    // 联机游戏类型：number=猜数字, color=猜颜色
    colorMode: 'repeat',         // 颜色模式：repeat=可重复, unique=不重复
    colorFirstPlayer: 'host',    // 先手玩家：host=房主先手, guest=房主后手
    duelMode: false,             // 对决模式
    turnTimeLimit: 10,           // 猜数字快枪手模式每轮时间限制（秒）
    colorDuelTimeLimit: 30,      // 猜颜色对决模式每轮时间限制（秒）
    // 颜色输入相关
    colorInputBuffer: [],        // 颜色输入缓冲
    colorDisplayColors: [],      // 颜色显示数组
    colorEditIndex: -1,          // 当前编辑的颜色索引
    // 颜色常量
    COLOR_OPTIONS: ['red', 'green', 'blue', 'yellow', 'purple', 'gray'],
    // 猜颜色历史记录
    parsedColorHistory: [],      // 解析后的颜色猜测历史
    myRemainingGuesses: 4,       // 我的剩余猜测次数
    totalRounds: 0,              // 总回合数（猜颜色用）
    // 猜颜色倒计时
    colorGameEndTime: 0,         // 猜颜色游戏结束时间戳
    colorRemainingTime: 0,       // 猜颜色剩余时间（秒）
    colorCountdownTimer: null,   // 猜颜色倒计时定时器
    // 结算页面特殊状态
    isDraw: false,               // 是否平局（8次都没猜对）

    // ========== 再来一局相关数据 ==========
    rematchStatus: 'none',       // 再来一局状态：none/pending/accepted/rejected/cancelled/expired
    rematchCountdown: 0,         // 再来一局倒计时（秒）
    rematchTimer: null,          // 再来一局倒计时定时器
    showRematchInvite: false,    // 是否显示再来一局邀请弹窗
    isRematchInitiator: false,   // 是否是发起方
    rematchLoading: false,       // 再来一局按钮 Loading 状态

    // ========== 每日挑战数据 ==========
    dailyChallenge: {
      attemptsLeft: 2,
      mode: 'number',
      allowRepeat: false,
      bestScore: null,
      fetchDate: '',      // 数据获取日期，用于跨天校验
      loading: false,
      hasLoaded: false,   // 标记是否已加载真实数据
      extraAttemptsFromAd: 0  // 通过广告获得的额外次数
    },
    // ========== 防连点锁 ==========
    isFetchingDaily: false,  // 每日挑战请求锁
    isGrantingReward: false,  // 发奖接口防抖锁，防止回调双闪
    // ========== 广告状态 ==========
    isAdReady: false,  // 广告是否加载成功，用于控制按钮显示
    // ========== 疯狂周末活动 ==========
    showWeekendEvent: false  // 控制跑马灯按钮是否显示
  },

  onLoad(options) {
    // 页面加载时重置游戏数据
    this.resetGameData()
    // 初始化音频
    audio.initAudio()
    // 获取 BGM 状态（默认关闭）
    const bgmStatus = audio.getBGMStatus()
    // 获取震动状态（默认关闭）
    const vibrationStatus = audio.getVibrationEnabled()
    // 获取按钮音效状态（默认关闭）
    const soundEffectStatus = audio.getSoundEffectEnabled()
    // 从本地存储恢复 myOpenid
    const savedOpenid = wx.getStorageSync('myOpenid') || ''
    this.setData({
      bgmEnabled: bgmStatus.enabled,
      vibrationEnabled: vibrationStatus,
      soundEffectEnabled: soundEffectStatus,
      myOpenid: savedOpenid
    })
    // 如果 BGM 开启，自动播放
    if (bgmStatus.enabled) {
      audio.playBGM()
    }
    // 检查用户登录状态
    this.checkLoginStatus()
    // 检查并显示公告栏
    this.checkAnnouncement()
    // 检查是否有未读的反馈回复
    this.checkUnreadFeedback()
    // 开启右上角分享菜单
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    })

    // 处理分享链接参数 - 如果有房间号，自动进入联机模式并填写房间号
    if (options && options.roomId) {
      this.handleShareRoom(options.roomId)
    }
    
    // 【优化】不再主动加载每日挑战信息，改为懒加载模式
    // 只有点击每日挑战按钮时才加载，节省云函数调用
    // this.loadDailyChallengeInfo()

    // 初始化激励视频广告
    this.initRewardedVideoAd()
  },

  /**
   * 处理分享链接中的房间号
   * 自动进入联机模式并自动加入房间
   */
  async handleShareRoom(roomId) {
    // 防御性清理：去掉可能的残留前缀或空格
    const cleanRoomId = String(roomId).replace('ROOM_', '').trim()

    // 检查是否已登录
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '加入房间需要先登录，是否立即登录？',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({
              title: '请点击左上角头像登录',
              icon: 'none'
            })
          }
        }
      })
      return
    }

    // 设置游戏类型为猜数字
    app.globalData.gameType = 'number'
    app.globalData.digitCount = 4

    // 显示联机对战界面
    this.setData({
      showOnlineMode: true,
      onlineState: 'hall',
      joinRoomId: cleanRoomId,
      roomId: '',
      roomInfo: null,
      isHost: false,
      isWin: false,
      finishReason: '',
      mySecretBuffer: '',
      myGuessBuffer: ''
    })

    // 自动加入房间
    wx.showLoading({ title: '正在加入房间...' })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'joinRoom',
          roomId: cleanRoomId,
          userInfo: {
            name: this.data.userInfo.nickName || '神秘玩家',
            avatar: this.data.userInfo.avatarUrl || ''
          }
        }
      })
      wx.hideLoading()


      if (result.success) {
        // 使用返回的 roomId（UUID）和 openid
        const { roomId: joinedRoomId, openid, room } = result
        this.setData({
          roomId: joinedRoomId,
          myOpenid: openid,
          isHost: false,
          roomInfo: room,
          onlineState: 'waiting'
        })
        // 保存到本地存储
        wx.setStorageSync('onlineRoomId', joinedRoomId)
        wx.setStorageSync('myOpenid', openid)
        // 开始监听房间变化
        this.startWatcher(joinedRoomId)
      } else {
        wx.showToast({
          title: result.error || '加入房间失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '加入房间失败，请手动加入',
        icon: 'none'
      })
    }
  },

  // 分享给好友/群
  onShareAppMessage() {
    // 如果在联机对战等待中，分享带上6位房间号
    if (this.data.showOnlineMode && this.data.onlineState === 'waiting' && this.data.roomNumber) {
      // 快枪手模式特殊文案
      const title = this.data.quickDrawMode
        ? `快枪手决斗！房间号：${this.data.roomNumber}`
        : `来对战！房间号：${this.data.roomNumber}`
      return {
        title: title,
        path: `/pages/index/index?roomId=${this.data.roomNumber}`,
        imageUrl: '/assets/images/share-cover.png'
      }
    }

    return {
      title: '谁输谁洗碗 - 猜数字游戏神器',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-cover.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '谁输谁洗碗 - 猜数字游戏神器',
      query: '',
      imageUrl: '/assets/images/share-cover.png'
    }
  },

  onShow() {
    // 页面显示时更新 BGM 状态
    const bgmStatus = audio.getBGMStatus()
    this.setData({
      bgmEnabled: bgmStatus.enabled
    })
    // 如果 BGM 开启且未播放，自动播放
    if (bgmStatus.enabled && !bgmStatus.playing) {
      audio.playBGM()
    }

    // 如果在联机对战房间中，尝试重连
    if (this.data.showOnlineMode && this.data.roomId) {
      this.tryReconnect()
    }
    
    // 【优化】不再在 onShow 时刷新每日挑战信息，改为懒加载模式
    // 只有点击每日挑战按钮时才加载，节省云函数调用
    // this.loadDailyChallengeInfo()

    // 检查疯狂周末活动时间
    this.checkEventTime()
  },

  /**
   * 检查疯狂周末活动时间
   * 仅在指定时间段内显示按钮
   */
  checkEventTime() {
    const now = new Date().getTime()
    // 设定活动起止时间（注意：小程序环境为了兼容 iOS，日期字符串推荐使用 '/' 分隔）
    const startTime = new Date('2026/03/19 00:00:00').getTime()
    const endTime = new Date('2026/03/23 12:00:00').getTime()

    // 判断当前时间是否在活动期间内
    if (now >= startTime && now <= endTime) {
      this.setData({ showWeekendEvent: true })
    } else {
      this.setData({ showWeekendEvent: false })
    }
  },

  /**
   * 跳转到疯狂周末活动页面
   */
  goToWeekend() {
    // 播放按键音效和触动反馈
    audio.keyTap()

    wx.navigateTo({
      url: '/pages/weekend/weekend'
    })
  },

  /**
   * 尝试断线重连
   */
  async tryReconnect() {
    const { roomId } = this.data
    if (!roomId) return

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'reconnect',
          roomId: roomId
        }
      })

      if (result.success) {
        // 更新房间信息
        this.setData({
          roomInfo: result.room,
          isHost: result.myRole === 'host'
        })
        // 重新启动监听
        this.startWatcher(roomId)
        wx.showToast({
          title: '已重新连接房间',
          icon: 'none'
        })
      } else {
        // 重连失败，退出房间
        if (result.error && result.error.includes('超过 60 秒')) {
          wx.showModal({
            title: '提示',
            content: '离开时间超过 60 秒，房间已结束',
            showCancel: false,
            success: () => {
              this.exitOnlineMode()
            }
          })
        }
      }
    } catch (err) {
    }
  },

  // 选择难度
  selectDifficulty(e) {
    // 播放按键音效和触动反馈
    audio.keyTap()
    const count = parseInt(e.currentTarget.dataset.count)
    this.setData({ digitCount: count })
  },

  // 选择游戏玩法模式（本地双人/单人模式）
  selectPlayMode(e) {
    // 播放按键音效和触动反馈
    audio.keyTap()
    const mode = e.currentTarget.dataset.mode
    this.setData({
      playMode: mode,
      showSingleSubModes: false // 切换其他模式时隐藏单人子选项
    })
  },

  // 点击单人模式按钮
  onSingleModeTap() {
    // 播放按键音效和触动反馈
    audio.keyTap()
    this.setData({
      playMode: 'single',
      showSingleSubModes: true
    })
  },

  // 选择单人模式数字规则（可重复/不重复）
  selectSingleDigitMode(e) {
    // 播放按键音效和触动反馈
    audio.keyTap()
    const mode = e.currentTarget.dataset.mode
    this.setData({ singleDigitMode: mode })
  },

  // 开始游戏
  startGame() {
    // 播放确认音效和触动反馈
    audio.confirmTap()
    // 保存选择的位数到全局数据
    app.globalData.digitCount = this.data.digitCount
    // 保存玩法模式到全局数据
    app.globalData.playMode = this.data.playMode

    // 根据玩法模式进入不同流程
    if (this.data.playMode === 'single') {
      // 单人模式：跳过创建角色和抛硬币，直接进入游戏
      this.startSinglePlayerMode()
    } else {
      // 本地双人模式：跳转到名称设置页
      wx.navigateTo({
        url: '/pages/names/names'
      })
    }
  },

  // 开始单人模式
  startSinglePlayerMode() {
    // 获取当前用户信息作为玩家名称
    const userInfo = this.data.userInfo
    const playerName = userInfo.nickName || '玩家'

    // 设置单人模式的全局数据
    app.globalData.p1Name = playerName
    app.globalData.p2Name = '系统'  // 对手是系统
    app.globalData.currentTurnPlayer = 1  // 玩家先手猜
    app.globalData.isSingleMode = true  // 标记为单人模式
    app.globalData.singleDigitMode = this.data.singleDigitMode  // 单人模式数字规则

    // 生成系统密码（随机数字）
    const digitCount = this.data.digitCount
    const systemSecret = this.generateRandomSecret(digitCount)
    app.globalData.p2Secret = systemSecret  // 系统的密码
    app.globalData.p1Secret = ''  // 玩家不需要设置密码

    // 初始化猜测记录
    app.globalData.p1Guesses = []
    app.globalData.p2Guesses = []
    app.globalData.winner = null
    app.globalData.currentRecordId = null

    // 跳转到游戏页面
    wx.redirectTo({
      url: '/pages/game/game'
    })
  },

  // 生成随机密码
  generateRandomSecret(digitCount) {
    const { singleDigitMode } = this.data
    let secret = ''

    if (singleDigitMode === 'unique') {
      // 数字不重复模式
      const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
      // 随机打乱数组
      for (let i = digits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [digits[i], digits[j]] = [digits[j], digits[i]]
      }
      // 取前 digitCount 个
      secret = digits.slice(0, digitCount).join('')
    } else {
      // 数字可重复模式（默认）
      for (let i = 0; i < digitCount; i++) {
        secret += Math.floor(Math.random() * 10)
      }
    }

    return secret
  },

  // 重置游戏数据
  resetGameData() {
    app.globalData.p1Secret = ''
    app.globalData.p2Secret = ''
    app.globalData.p1Guesses = []
    app.globalData.p2Guesses = []
    app.globalData.currentTurnPlayer = 1
    app.globalData.winner = null
  },

  // 跳转到对局记录页
  goToRecords() {
    // 播放按键音效和触动反馈
    audio.keyTap()

    // 检查是否已登录
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '查看对局记录需要先登录，是否立即登录？',
        success: (res) => {
          if (res.confirm) {
            // 触发登录流程 - 显示头像选择
            wx.showToast({
              title: '请点击头像登录',
              icon: 'none'
            })
          }
        }
      })
      return
    }

    // 已登录，跳转到对局记录页
    wx.navigateTo({
      url: '/pages/records/records'
    })
  },

  // 跳转到问题反馈页
  goToFeedback() {
    // 播放按键音效和触动反馈
    audio.keyTap()

    // 检查是否已登录
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '提交问题反馈需要先登录，是否立即登录？',
        success: (res) => {
          if (res.confirm) {
            // 触发登录流程 - 显示头像选择
            wx.showToast({
              title: '请点击头像登录',
              icon: 'none'
            })
          }
        }
      })
      return
    }

    // 已登录，跳转到反馈页面，带上当前版本号
    const { announcement } = this.data
    wx.navigateTo({
      url: `/pages/feedback/feedback?version=${announcement.version}`
    })

    // 标记反馈为已读
    this.markFeedbackRead()
  },

  // 跳转到游戏规则页面
  goToRules() {
    // 播放按键音效和触动反馈
    audio.keyTap()

    wx.navigateTo({
      url: '/pages/rules/rules'
    })
  },

  // 跳转到残局解谜闯关模式
  goToPuzzleGame() {
    // 播放按键音效和触动反馈
    audio.keyTap()

    wx.navigateTo({
      url: '/pages/puzzle-game/puzzle-game'
    })
  },

  // 跳转到排行榜页面
  goToRanking() {
    // 播放按键音效和触动反馈
    audio.keyTap()

    wx.navigateTo({
      url: '/pages/ranking/ranking'
    })
  },

  // 检查是否有未读的反馈回复
  async checkUnreadFeedback() {
    // 如果未登录，不检查
    if (!this.data.isLoggedIn) {
      return
    }

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'feedback_api',
        data: {
          action: 'checkUnread'
        }
      })

      if (result.success && result.hasUnread) {
        // 获取已读的反馈ID列表
        const readFeedbackIds = wx.getStorageSync('readFeedbackIds') || []
        // 获取有回复的反馈ID列表
        const repliedFeedbackIds = result.repliedIds || []
        
        // 检查是否有新的未读回复（不在已读列表中）
        const hasNewUnread = repliedFeedbackIds.some(id => !readFeedbackIds.includes(id))
        
        if (hasNewUnread) {
          this.setData({
            hasUnreadFeedback: true
          })
        }
      }
    } catch (err) {
      // 静默处理错误
      console.error('检查未读反馈失败:', err)
    }
  },

  // 标记反馈为已读
  markFeedbackRead() {
    this.setData({
      hasUnreadFeedback: false
    })
    // 保存当前所有有回复的反馈ID到已读列表
    this.saveReadFeedbackIds()
  },

  // 保存已读的反馈ID列表
  async saveReadFeedbackIds() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'feedback_api',
        data: {
          action: 'getRepliedIds'
        }
      })
      
      if (result.success && result.repliedIds) {
        wx.setStorageSync('readFeedbackIds', result.repliedIds)
      }
    } catch (err) {
      console.error('保存已读反馈ID失败:', err)
    }
  },

  // 切换 BGM
  toggleBGM() {
    // 播放按键音效和触动反馈
    audio.keyTap()
    const newStatus = audio.toggleBGM()
    this.setData({
      bgmEnabled: newStatus
    })
    // 如果开启 BGM，立即播放
    if (newStatus) {
      audio.playBGM()
    }
  },

  // 切换震动
  toggleVibration() {
    // 播放按键音效
    audio.keyTap()
    const newStatus = audio.toggleVibration()
    this.setData({
      vibrationEnabled: newStatus
    })
    // 如果开启震动，立即触发一次震动反馈
    if (newStatus) {
      audio.lightFeedback()
    }
  },

  // ========== 设置弹窗相关 ==========
  // 显示设置弹窗
  showSettingsModal() {
    audio.keyTap()
    this.setData({
      showSettingsModal: true
    })
  },

  // 关闭设置弹窗
  closeSettingsModal() {
    audio.keyTap()
    this.setData({
      showSettingsModal: false
    })
  },

  // 游戏风格 - 切换BGM
  toggleBGMGame() {
    audio.keyTap()
    const newStatus = audio.toggleBGM()
    this.setData({
      bgmEnabled: newStatus
    })
    if (newStatus) {
      audio.playBGM()
    } else {
      audio.pauseBGM()
    }
  },

  // 游戏风格 - 切换震动
  toggleVibrationGame() {
    audio.keyTap()
    const newStatus = audio.toggleVibration()
    this.setData({
      vibrationEnabled: newStatus
    })
    // 如果开启震动，立即触发一次震动反馈
    if (newStatus) {
      audio.lightFeedback()
    }
  },

  // 游戏风格 - 切换按钮音效
  toggleSoundEffectGame() {
    const newStatus = audio.toggleSoundEffect()
    this.setData({
      soundEffectEnabled: newStatus
    })
    // 如果开启，播放一次音效作为反馈
    if (newStatus) {
      audio.keyTap()
    }
  },

  // 显示单机模式选择弹窗
  showSinglePlayerModal() {
    // 播放按键音效
    audio.keyTap()
    this.setData({
      showSinglePlayerModal: true
    })
  },

  // 关闭单机模式选择弹窗
  closeSinglePlayerModal() {
    // 播放删除音效
    audio.deleteTap()
    this.setData({
      showSinglePlayerModal: false
    })
  },

  // 选择本地游戏模式（猜数字）
  selectLocalMode() {
    // 播放确认音效和触动反馈
    audio.confirmTap()

    // 关闭弹窗
    this.setData({
      showSinglePlayerModal: false
    })

    // 检查是否已登录
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '开始游戏需要先登录，是否立即登录？',
        success: (res) => {
          if (res.confirm) {
            // 触发登录流程 - 提示点击头像
            wx.showToast({
              title: '请点击左上角头像登录',
              icon: 'none'
            })
          }
        }
      })
      return
    }

    // 设置游戏类型为猜数字
    app.globalData.gameType = 'number'
    // 隐藏模式选择，显示位数选择
    this.setData({
      showModeSelect: false,
      gameMode: 'local'
    })
  },

  // 选择猜颜色模式
  selectColorMode() {
    // 播放确认音效和触动反馈
    audio.confirmTap()

    // 关闭弹窗
    this.setData({
      showSinglePlayerModal: false
    })

    // 检查是否已登录
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '开始游戏需要先登录，是否立即登录？',
        success: (res) => {
          if (res.confirm) {
            // 触发登录流程 - 提示点击头像
            wx.showToast({
              title: '请点击左上角头像登录',
              icon: 'none'
            })
          }
        }
      })
      return
    }

    // 设置游戏类型为猜颜色
    app.globalData.gameType = 'color'
    // 跳转到猜颜色模式选择页
    wx.navigateTo({
      url: '/pages/color-mode/color-mode'
    })
  },

  // 进入残局模式
  enterPuzzleMode() {
    // 播放确认音效和触动反馈
    audio.confirmTap()

    // 检查是否已登录
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '进入残局模式需要先登录，是否立即登录？',
        success: (res) => {
          if (res.confirm) {
            // 触发登录流程 - 提示点击头像
            wx.showToast({
              title: '请点击左上角头像登录',
              icon: 'none'
            })
          }
        }
      })
      return
    }

    // 跳转到残局模式页面
    wx.navigateTo({
      url: '/pages/puzzle-game/puzzle-game'
    })
  },

  // 禁用按钮点击提示
  onDisabledTap() {
    // 播放删除音效表示不可用
    audio.deleteTap()
    wx.showToast({
      title: '即将推出，敬请期待',
      icon: 'none',
      duration: 1500
    })
  },

  // 返回游戏模式选择
  backToModeSelect() {
    // 播放按键音效和触动反馈
    audio.keyTap()
    // 显示模式选择，隐藏位数选择
    this.setData({
      showModeSelect: true
    })
  },

  // 重置为难度选择状态（用于游戏结束后"再来一局"）
  resetToDifficultySelect() {
    // 清空游戏相关缓存
    app.globalData.p1Guesses = []
    app.globalData.p2Guesses = []
    app.globalData.winner = null
    app.globalData.currentRecordId = null
    app.globalData.p2Secret = null
    app.globalData.p1Secret = null

    // 显示位数选择，隐藏模式选择
    this.setData({
      showModeSelect: false
    })
  },

  // 检查用户登录状态
  async checkLoginStatus() {
    // 先从本地存储获取用户信息
    let userInfo = wx.getStorageSync('userInfo')

    // 【合规改造】如果没有头像或昵称，分配默认兜底状态，而不是强制登录
    if (!userInfo || !userInfo.avatarUrl || !userInfo.nickName) {
      // 获取用户 OpenID 用于生成固定的默认头像和昵称
      let openid = wx.getStorageSync('openid')
      if (!openid) {
        try {
          const { result } = await wx.cloud.callFunction({ name: 'getOpenId' })
          openid = result.openid
          wx.setStorageSync('openid', openid)
        } catch (err) {
          console.error('获取 OpenID 失败:', err)
          openid = 'unknown'
        }
      }

      // 使用 OpenID 哈希算法生成固定的默认头像和昵称（与排行榜一致）
      const defaultAvatar = this.generateDefaultAvatar(openid)
      const anonymousName = this.generateAnonymousName(openid)

      userInfo = {
        avatarUrl: defaultAvatar, // 使用哈希算法生成的默认头像
        nickName: anonymousName,  // 使用哈希算法生成的匿名昵称
        isDefault: true // 标记这是一个兜底状态，用户尚未自定义
      }
      // 保存这个兜底状态，让用户能正常玩游戏和上榜
      wx.setStorageSync('userInfo', userInfo)
    }

    // 默认放行，视为已登录/已准备就绪状态
    this.setData({
      userInfo,
      isLoggedIn: true
    })
  },

  /**
   * 生成默认头像（与排行榜匿名头像算法一致）
   * @param {string} userId - 用户ID
   * @returns {string} 默认头像URL
   */
  generateDefaultAvatar(userId) {
    const DEFAULT_AVATARS = [
      '/images/default-avatar-1.png',
      '/images/default-avatar-2.png',
      '/images/default-avatar-3.png',
      '/images/default-avatar-4.png'  // 新增第4个头像
    ]
    if (!userId) return DEFAULT_AVATARS[0]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash = hash & hash
    }
    return DEFAULT_AVATARS[Math.abs(hash) % DEFAULT_AVATARS.length]
  },

  /**
   * 生成匿名昵称（与排行榜匿名昵称算法一致）
   * @param {string} userId - 用户ID
   * @returns {string} 匿名昵称
   */
  generateAnonymousName(userId) {
    const ANONYMOUS_PREFIX = '玩家'
    if (!userId) return `${ANONYMOUS_PREFIX}000`
    const suffix = userId.slice(-4).toUpperCase()
    return `${ANONYMOUS_PREFIX}${suffix}`
  },

  /**
   * 获取头像类型
   * @param {string} url - 头像URL
   * @returns {string} - 头像类型：temp/cloud/https/local/unknown
   */
  getAvatarType(url) {
    if (!url) return 'unknown'
    if (url.startsWith('http://tmp/') || url.startsWith('wxfile://tmp_')) return 'temp'
    if (url.startsWith('cloud://')) return 'cloud'
    if (url.startsWith('https://') || url.startsWith('http://')) return 'https'
    if (url.startsWith('wxfile://')) return 'local'
    return 'unknown'
  },



  // 选择头像回调 - 微信小程序新接口
  onChooseAvatar(e) {
    // 播放按键音效
    audio.keyTap()

    const { avatarUrl } = e.detail

    // 显示昵称输入弹窗
    this.setData({
      showNickNameInput: true,
      tempAvatarUrl: avatarUrl,
      tempNickName: ''
    })
  },

  // 昵称输入事件
  onNickNameInput(e) {
    this.setData({
      tempNickName: e.detail.value
    })
  },

  // 昵称输入框失去焦点
  onNickNameBlur(e) {
    // type="nickname" 会自动获取微信昵称
    if (e.detail.value) {
      this.setData({
        tempNickName: e.detail.value
      })
    }
  },

  // 关闭昵称输入弹窗
  closeNickNameInput() {
    this.setData({
      showNickNameInput: false,
      tempAvatarUrl: '',
      tempNickName: ''
    })
  },

  // 确认昵称
  async confirmNickName() {
    const { tempAvatarUrl, tempNickName } = this.data

    if (!tempNickName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    // 【关键】先将临时头像上传到云存储，获取永久链接
    let permanentAvatarUrl = tempAvatarUrl
    
    if (tempAvatarUrl && 
        (tempAvatarUrl.startsWith('http://tmp/') || 
         tempAvatarUrl.startsWith('wxfile://'))) {
      wx.showLoading({ title: '保存头像中', mask: true })
      
      try {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}_${Math.random().toString().slice(2, 8)}.png`,
          filePath: tempAvatarUrl
        })
        permanentAvatarUrl = uploadRes.fileID
        console.log('头像上传到云存储成功:', permanentAvatarUrl)
      } catch (err) {
        console.error('上传头像失败:', err)
        wx.hideLoading()
        wx.showToast({ title: '头像保存失败，请重试', icon: 'none' })
        return
      } finally {
        wx.hideLoading()
      }
    }

    // 【合规改造】用户主动自定义的真实/个性化数据（使用永久链接）
    const userInfo = {
      avatarUrl: permanentAvatarUrl,
      nickName: tempNickName.trim(),
      isDefault: false // 标记用户已自定义
    }

    // 关闭弹窗并更新状态
    this.setData({
      userInfo,
      showNickNameInput: false
    })

    // 保存到本地存储
    wx.setStorageSync('userInfo', userInfo)

    // 保存到云开发数据库，更新排行榜数据
    this.saveUserToCloud(userInfo)

    wx.showToast({
      title: '名片设置成功',
      icon: 'success'
    })
  },

  // 完成登录流程
  completeLogin(userInfo) {
    // 保存到本地存储
    wx.setStorageSync('userInfo', userInfo)
    // 更新页面数据
    this.setData({
      userInfo,
      isLoggedIn: true
    })
    // 保存到云开发数据库
    this.saveUserToCloud(userInfo)
    // 显示成功提示
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    })
  },

  // 显示退出登录选项
  showLogoutOptions() {
    wx.showActionSheet({
      itemList: ['退出登录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 确认退出登录
          this.confirmLogout()
        }
      }
    })
  },

  // 确认退出登录
  confirmLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo')
          // 重置页面数据
          this.setData({
            userInfo: {},
            isLoggedIn: false
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 保存用户信息到云开发数据库
  saveUserToCloud(userInfo) {
    // 调用云函数保存用户信息
    wx.cloud.callFunction({
      name: 'saveUser',
      data: {
        userInfo: userInfo,
        loginTime: new Date()
      },
      success: (res) => {
      },
      fail: (err) => {
      }
    })

    // 保存用户头像到 user_avatars 表（用于历史记录显示）
    this.saveUserAvatar(userInfo)
  },

  // 保存用户头像到云端
  async saveUserAvatar(userInfo) {
    console.log('准备保存用户头像:', userInfo)

    if (!userInfo.avatarUrl) {
      console.log('用户头像为空，跳过保存')
      return
    }

    let avatarUrl = userInfo.avatarUrl

    // 【重构】遇到临时文件，必须上传云端，并加上 loading 遮罩防止误触
    if (avatarUrl.startsWith('http://tmp/')) {
      console.log('检测到临时文件，上传到云存储')
      // 【关键修复】加上 loading 遮罩，防止这期间用户去点每日挑战
      wx.showLoading({ title: '保存头像中', mask: true })

      try {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}_${Math.random().toString().slice(2, 8)}.jpg`,
          filePath: avatarUrl
        })
        console.log('头像上传到云存储成功:', uploadRes)
        avatarUrl = uploadRes.fileID // 拿到稳定的 cloud:// 路径

        // 【关键修复】永远只把 cloud:// 存入本地，彻底抛弃 wxfile://
        const updatedUserInfo = { ...userInfo, avatarUrl }
        wx.setStorageSync('userInfo', updatedUserInfo)
        this.setData({ userInfo: updatedUserInfo })
        console.log('已更新本地存储的头像URL为云存储fileID:', avatarUrl)
      } catch (err) {
        console.error('上传头像到云存储失败:', err)
        // 上传失败，使用原URL（可能会失效）
      } finally {
        wx.hideLoading()
      }
    }

    console.log('调用 saveUserAvatar 云函数:', {
      avatar: avatarUrl,
      name: userInfo.nickName
    })

    // 保存到数据库
    wx.cloud.callFunction({
      name: 'saveUserAvatar',
      data: {
        avatar: avatarUrl,
        name: userInfo.nickName || ''
      },
      success: (res) => {
        console.log('保存用户头像成功:', res)
      },
      fail: (err) => {
        console.error('保存用户头像失败:', err)
      }
    })
  },

  // 点击公告栏
  onAnnouncementTap() {
    // 播放按键音效
    audio.keyTap()

    const { announcement } = this.data

    // 如果有链接则跳转，否则显示完整公告内容
    if (announcement.url) {
      wx.navigateTo({
        url: announcement.url
      })
    } else {
      // 显示公告详情弹窗
      wx.showModal({
        title: '🎉 版本更新公告',
        content: announcement.text.replace('🎉 ', ''),
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#E60012'
      })
    }
  },

  // 更新公告内容（供外部调用）
  updateAnnouncement(text, url = '') {
    this.setData({
      'announcement.text': text,
      'announcement.url': url
    })
  },

  // 检查是否需要显示公告栏
  checkAnnouncement() {
    const { announcement } = this.data
    // 从本地存储获取已关闭的公告版本
    const closedVersion = wx.getStorageSync('announcementClosedVersion')

    // 如果当前版本与已关闭版本不同，则显示公告
    if (closedVersion !== announcement.version) {
      this.setData({
        'announcement.show': true
      })
    }
  },

  // 关闭公告栏
  onCloseAnnouncement() {
    // 播放删除音效
    audio.deleteTap()

    const { announcement } = this.data

    // 隐藏公告栏
    this.setData({
      'announcement.show': false
    })

    // 将当前版本号保存到本地存储
    wx.setStorageSync('announcementClosedVersion', announcement.version)

    // 显示提示
    wx.showToast({
      title: '已关闭公告',
      icon: 'none',
      duration: 1500
    })
  },

  // 点击复制微信号
  copyWechatId() {
    // 播放按键音效
    audio.keyTap()

    // 复制微信号到剪贴板
    wx.setClipboardData({
      data: 'SSSXW2026',
      success: () => {
        // 显示复制成功提示
        wx.showToast({
          title: '微信号已复制',
          icon: 'success',
          duration: 2000
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // ========== 联机对战方法 ==========

  /**
   * 进入联机对战模式
   * 检查登录状态后显示联机大厅
   */
  async enterOnlineMode() {
    // 播放确认音效和触动反馈
    audio.confirmTap()

    // 检查是否已登录
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '联机对战需要先登录，是否立即登录？',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({
              title: '请点击左上角头像登录',
              icon: 'none'
            })
          }
        }
      })
      return
    }

    // 显示联机对战界面
    this.setData({
      showOnlineMode: true,
      onlineState: 'hall',
      roomId: '',
      roomInfo: null,
      isHost: false,
      isWin: false,
      finishReason: '',
      mySecretBuffer: '',
      myGuessBuffer: '',
      // 重置联机游戏设置默认值
      onlineGameType: 'number',    // 默认猜数字
      digitCount: 4,               // 默认4位
      digitRule: 'repeat',         // 默认可重复
      timeLimit: 10,               // 默认10分钟（猜数字）
      quickDrawMode: false,        // 默认关闭快枪手
      // 重置猜颜色数据
      colorMode: 'repeat',         // 颜色模式默认可重复
      colorFirstPlayer: 'host',    // 默认房主先手
      duelMode: false,             // 默认关闭对决模式
      turnTimeLimit: 10,           // 猜数字快枪手模式每轮10秒
      // 重置颜色输入相关
      colorInputBuffer: [],
      colorDisplayColors: [],
      colorEditIndex: -1,
      parsedColorHistory: [],
      myRemainingGuesses: 4,
      totalRounds: 0
    })

    // 检查本地存储的未完成房间号
    const savedRoomNumber = wx.getStorageSync('onlineRoomNumber') || ''
    const savedRoomId = wx.getStorageSync('onlineRoomId') || ''

    if (savedRoomNumber && savedRoomId) {
      // 查询房间状态
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'battleController',
          data: {
            action: 'getRoomStatus',
            roomId: savedRoomId
          }
        })

        if (result.success) {
          if (result.status === 'finished' || result.status === 'not_found') {
            // 房间已结束或不存在，清空缓存
            wx.removeStorageSync('onlineRoomId')
            wx.removeStorageSync('onlineRoomNumber')
            this.setData({ joinRoomId: '' })
          } else {
            // 房间进行中，恢复房间号
            this.setData({
              joinRoomId: savedRoomNumber
            })
          }
        } else {
          // 查询失败，清空缓存
          wx.removeStorageSync('onlineRoomId')
          wx.removeStorageSync('onlineRoomNumber')
          this.setData({ joinRoomId: '' })
        }
      } catch (err) {
        // 查询失败，清空缓存
        wx.removeStorageSync('onlineRoomId')
        wx.removeStorageSync('onlineRoomNumber')
        this.setData({ joinRoomId: '' })
      }
    }
  },

  /**
   * 检查是否需要断线重连
   * 查询用户当前是否已在某个房间中
   */
  async checkReconnect() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: { action: 'checkRoom' }
      })

      if (result.code === 0 && result.data && result.data.roomId) {
        // 发现未完成的房间，询问是否重连
        wx.showModal({
          title: '发现未完成的房间',
          content: `房间号: ${result.data.roomId}，是否重新进入？`,
          success: (res) => {
            if (res.confirm) {
              // 重新进入房间
              this.setData({
                roomId: result.data.roomId,
                isHost: result.data.isHost
              })
              this.startWatcher(result.data.roomId)
            }
          }
        })
      }
    } catch (err) {
    }
  },

  /**
   * 选择联机游戏类型
   */
  selectOnlineGameType(e) {
    audio.keyTap()
    const type = e.currentTarget.dataset.type
    // 根据游戏类型设置默认时间：猜数字10分钟，猜颜色10分钟
    const timeLimit = 10
    this.setData({
      onlineGameType: type,
      timeLimit: timeLimit
    })
  },

  /**
   * 选择颜色模式（联机设置用）
   */
  selectOnlineColorMode(e) {
    audio.keyTap()
    const mode = e.currentTarget.dataset.mode
    this.setData({ colorMode: mode })
  },

  /**
   * 选择先手玩家
   */
  selectFirstPlayer(e) {
    audio.keyTap()
    const player = e.currentTarget.dataset.player
    this.setData({ colorFirstPlayer: player })
  },

  /**
   * 选择猜颜色时间限制
   */
  selectColorTimeLimit(e) {
    audio.keyTap()
    const limit = parseInt(e.currentTarget.dataset.limit)
    this.setData({ timeLimit: limit })
  },

  /**
   * 切换对决模式
   */
  toggleDuelMode() {
    audio.keyTap()
    this.setData({ duelMode: !this.data.duelMode })
  },

  /**
   * 创建房间
   * 调用云函数创建新房间并成为房主
   */
  async createOnlineRoom() {
    // 播放按键音效
    audio.keyTap()

    // 清空上一局缓存
    this.resetOnlineGameData()

    wx.showLoading({ title: '创建中...' })

    try {
      // 根据游戏类型构建参数
      const isColorGame = this.data.onlineGameType === 'color'
      const params = {
        action: 'createRoom',
        gameType: this.data.onlineGameType,
        timeLimit: this.data.timeLimit,
        userInfo: {
          name: this.data.userInfo.nickName || '神秘玩家',
          avatar: this.data.userInfo.avatarUrl || ''
        }
      }

      // 猜数字参数
      if (!isColorGame) {
        params.digitCount = this.data.digitCount
        params.digitRule = this.data.digitRule
        params.quickDrawMode = this.data.quickDrawMode
      }
      // 猜颜色参数
      else {
        params.colorMode = this.data.colorMode
        params.firstPlayer = this.data.colorFirstPlayer
        params.duelMode = this.data.duelMode
        params.turnTimeLimit = this.data.duelMode ? this.data.turnTimeLimit : 0
      }

      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: params
      })

      wx.hideLoading()

      if (result.success) {
        // 创建成功，使用返回的 roomId（UUID）和 roomNumber（6位数字）
        const { roomId, roomNumber, openid } = result

        // 构建初始房间信息
        const initialRoomInfo = {
          _id: roomId,
          roomNumber: roomNumber,
          status: 'waiting',
          gameType: this.data.onlineGameType,
          // 猜数字字段
          digitCount: this.data.digitCount,
          digitRule: this.data.digitRule,
          quickDrawMode: this.data.quickDrawMode,
          // 猜颜色字段
          colorMode: this.data.colorMode,
          firstPlayer: this.data.colorFirstPlayer,
          duelMode: this.data.duelMode,
          turnTimeLimit: this.data.duelMode ? this.data.turnTimeLimit : 0,
          players: {
            host: {
              openid: openid,
              name: this.data.userInfo.nickName || '神秘玩家',
              avatar: this.data.userInfo.avatarUrl || '',
              isOnline: true,
              isReady: isColorGame  // 猜颜色时房主直接准备
            },
            guest: null
          }
        }

        this.setData({
          roomId: roomId,
          roomNumber: roomNumber,
          myOpenid: openid,
          isHost: true,
          onlineState: 'waiting',
          roomInfo: initialRoomInfo
        })

        // 保存到本地存储
        wx.setStorageSync('onlineRoomId', roomId)
        wx.setStorageSync('onlineRoomNumber', roomNumber)
        wx.setStorageSync('myOpenid', openid)

        // 开始监听房间变化
        this.startWatcher(roomId)

        wx.showToast({
          title: '房间创建成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.error || '创建失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showModal({
        title: '创建失败',
        content: err.message || '请检查云函数是否已部署',
        showCancel: false
      })
    }
  },

  /**
   * 输入房间号
   * 处理用户输入的房间号
   */
  onJoinRoomInput(e) {
    this.setData({
      joinRoomId: e.detail.value
    })
  },

  /**
   * 选择位数
   */
  selectDigitCount(e) {
    audio.keyTap()
    const count = parseInt(e.currentTarget.dataset.count)
    // 支持3/4/5位选择
    this.setData({
      digitCount: count
    })
  },

  /**
   * 选择数字规则
   */
  selectDigitRule(e) {
    audio.keyTap()
    const rule = e.currentTarget.dataset.rule
    // 支持可重复/不重复选择
    this.setData({
      digitRule: rule
    })
  },

  /**
   * 选择时间限制
   */
  selectTimeLimit(e) {
    audio.keyTap()
    const limit = parseInt(e.currentTarget.dataset.limit)
    this.setData({
      timeLimit: limit
    })
  },

  /**
   * 切换快枪手模式
   */
  toggleQuickDrawMode() {
    audio.keyTap()
    this.setData({
      quickDrawMode: !this.data.quickDrawMode
    })
  },

  /**
   * 头像加载错误处理
   */
  onAvatarError(e) {
    const type = e.currentTarget.dataset.type
    // 头像加载失败时，清空对应的头像 URL，让页面显示默认头像
    if (type === 'user') {
      this.setData({
        'userInfo.avatarUrl': ''
      })
    } else if (type === 'guest' && this.data.roomInfo && this.data.roomInfo.players.guest) {
      this.setData({
        'roomInfo.players.guest.avatar': ''
      })
    } else if (type === 'host-playing' && this.data.roomInfo && this.data.roomInfo.players.host) {
      this.setData({
        'roomInfo.players.host.avatar': ''
      })
    } else if (type === 'guest-playing' && this.data.roomInfo && this.data.roomInfo.players.guest) {
      this.setData({
        'roomInfo.players.guest.avatar': ''
      })
    }
  },

  /**
   * 加入房间
   * 根据输入的房间号加入已有房间
   */
  async joinRoom() {
    // 播放按键音效
    audio.keyTap()

    // 前端防御性清理：去掉可能的残留前缀或空格
    const roomId = String(this.data.joinRoomId).replace('ROOM_', '').trim()

    if (!roomId) {
      wx.showToast({
        title: '请输入房间号',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '加入中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'joinRoom',
          roomId: roomId,
          userInfo: {
            name: this.data.userInfo.nickName || '神秘玩家',
            avatar: this.data.userInfo.avatarUrl || ''
          }
        }
      })

      wx.hideLoading()


      if (result.success) {
        // 使用返回的 roomId（UUID）和 openid
        const { roomId, openid, room } = result
        const roomNumber = room.roomNumber || roomId
        this.setData({
          roomId: roomId,
          roomNumber: roomNumber,
          myOpenid: openid,
          isHost: false,
          roomInfo: room  // 保存房间信息（包含双方头像）
        })

        // 保存到本地存储，用于断线重连
        wx.setStorageSync('onlineRoomId', roomId)
        wx.setStorageSync('onlineRoomNumber', roomNumber)
        wx.setStorageSync('myOpenid', openid)

        // 开始监听房间变化
        this.startWatcher(roomId)

        wx.showToast({
          title: '加入成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.error || '加入失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showModal({
        title: '加入失败',
        content: err.message || '请检查云函数是否已部署',
        showCancel: false
      })
    }
  },

  /**
   * 开始监听房间数据变化
   * 使用云数据库实时推送功能监听房间状态
   */
  startWatcher(roomId) {
    // 先停止之前的监听
    this.stopWatcher()

    // 创建数据库监听器
    const db = wx.cloud.database()
    const watcher = db.collection('rooms')
      .doc(roomId)
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs && snapshot.docs.length > 0) {
            const roomData = snapshot.docs[0]
            this.handleRoomChange(roomData)
          }
        },
        onError: (err) => {
        }
      })

    this.setData({ watcher })

    // 启动心跳定时器
    this.startHeartbeat(roomId)
  },

  /**
   * 停止监听房间数据
   */
  stopWatcher() {
    this.cleanupRoom()
  },

  /**
   * 上报排行榜分数
   * @param {boolean} isWin - 是否获胜
   */
  reportRankScore(isWin) {
    // 初始化云开发（如果还没初始化）
    if (!wx.cloud) {
      console.error('云开发未初始化')
      return
    }

    const userInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo || {}

    if (isWin) {
      // 上报胜场
      wx.cloud.callFunction({
        name: 'updateWinScore',
        data: {
          nickname: userInfo.nickName || '未知玩家',
          avatarUrl: userInfo.avatarUrl || ''
        }
      }).then(res => {
        console.log('胜场上报成功', res)
      }).catch(err => {
        console.error('胜场上报失败', err)
      })
    } else {
      // 上报败场（洗碗）
      wx.cloud.callFunction({
        name: 'updateLoseScore',
        data: {
          nickname: userInfo.nickName || '未知玩家',
          avatarUrl: userInfo.avatarUrl || ''
        }
      }).then(res => {
        console.log('败场上报成功', res)
      }).catch(err => {
        console.error('败场上报失败', err)
      })
    }
  },

  /**
   * 清理监听器 (修复 sessionInfo lost 报错)
   */
  cleanupRoom(clearStorage = false) {
    if (this.data.watcher) {
      const watcher = this.data.watcher
      // 延时释放，让底层 SDK 跑完当前帧的事件队列
      setTimeout(() => { watcher.close() }, 200)
    }
    if (this.data.heartbeatTimer) {
      clearInterval(this.data.heartbeatTimer)
    }
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
    }
    if (this.data.turnTimer) {
      clearInterval(this.data.turnTimer)
    }
    this.setData({ watcher: null, heartbeatTimer: null, countdownTimer: null, turnTimer: null })
    if (clearStorage) {
      wx.removeStorageSync('onlineRoomId')
      wx.removeStorageSync('onlineRoomNumber')
    }
  },

  /**
   * 启动心跳定时器
   * 只在 playing 状态发送心跳，间隔 90 秒
   */
  startHeartbeat(roomId) {
    // 先清除旧定时器
    if (this.data.heartbeatTimer) {
      clearInterval(this.data.heartbeatTimer)
    }

    // 每 90 秒发送一次心跳
    const timer = setInterval(() => {
      // 只在 playing 状态发送心跳
      if (this.data.onlineState !== 'playing') {
        return
      }

      wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'heartbeat',
          roomId: roomId
        }
      }).catch(err => {
      })
    }, 90000) // 90 秒

    this.setData({ heartbeatTimer: timer })
  },

  /**
   * 启动倒计时
   * @param {number} timeLimit - 时间限制（分钟）
   */
  startCountdown(timeLimit) {
    // 正常模式：10分=10分钟，15分=15分钟
    const seconds = timeLimit * 60
    const gameEndTime = Date.now() + seconds * 1000
    
    
    // 先清除旧定时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
    }

    // 更新服务器上的结束时间（只有房主设置）
    if (this.data.isHost) {
      wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'setGameEndTime',
          roomId: this.data.roomId,
          gameEndTime: gameEndTime
        }
      }).catch(err => {
      })
    }

    // 启动本地倒计时
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((gameEndTime - Date.now()) / 1000))
      this.setData({ remainingTime: remaining })

      // 时间到，自动结算
      if (remaining <= 0) {
        this.handleTimeUp()
      }
    }, 1000)

    this.setData({ 
      countdownTimer: timer, 
      gameEndTime: gameEndTime,
      remainingTime: seconds 
    })
  },

  /**
   * 同步服务器倒计时
   */
  syncCountdown() {
    const { gameEndTime, countdownTimer } = this.data
    if (!gameEndTime || countdownTimer) return

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((gameEndTime - Date.now()) / 1000))
      this.setData({ remainingTime: remaining })

      if (remaining <= 0) {
        this.handleTimeUp()
      }
    }, 1000)

    this.setData({ countdownTimer: timer })
  },

  /**
   * 启动猜颜色房间倒计时
   * @param {number} timeLimit - 时间限制（分钟）
   */
  startColorCountdown(timeLimit) {
    // 先清除旧定时器
    if (this.data.colorCountdownTimer) {
      clearInterval(this.data.colorCountdownTimer)
    }

    // 计算结束时间
    let gameEndTime = this.data.colorGameEndTime
    if (!gameEndTime && timeLimit) {
      const seconds = timeLimit * 60
      gameEndTime = Date.now() + seconds * 1000
      
      // 房主设置服务器结束时间
      if (this.data.isHost) {
        wx.cloud.callFunction({
          name: 'battleController',
          data: {
            action: 'setGameEndTime',
            roomId: this.data.roomId,
            gameEndTime: gameEndTime
          }
        }).catch(err => {
        })
      }
    }

    if (!gameEndTime) return

    // 启动本地倒计时
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((gameEndTime - Date.now()) / 1000))
      this.setData({ colorRemainingTime: remaining })

      // 时间到，自动结算
      if (remaining <= 0) {
        this.handleColorTimeUp()
      }
    }, 1000)

    this.setData({ 
      colorCountdownTimer: timer, 
      colorGameEndTime: gameEndTime,
      colorRemainingTime: Math.max(0, Math.floor((gameEndTime - Date.now()) / 1000))
    })
  },

  /**
   * 处理猜颜色时间到
   */
  handleColorTimeUp() {
    // 清除倒计时
    if (this.data.colorCountdownTimer) {
      clearInterval(this.data.colorCountdownTimer)
      this.setData({ colorCountdownTimer: null })
    }

    // 只有房主调用 finishByTimeout，避免双方同时保存重复记录
    if (!this.data.isHost) {
      return
    }

    // 调用云函数结束游戏
    wx.cloud.callFunction({
      name: 'battleController',
      data: {
        action: 'finishByTimeout',
        roomId: this.data.roomId
      }
    }).catch(err => {
    })
  },

  /**
   * 启动每轮倒计时（快枪手模式/对决模式）
   * @param {string} gameType - 游戏类型：'number' 或 'color'
   * @param {number} serverTurnStartTime - 服务器记录的新轮次开始时间（毫秒）
   */
  startTurnCountdown(gameType, serverTurnStartTime) {
    // 清除旧定时器
    if (this.data.turnTimer) {
      clearInterval(this.data.turnTimer)
    }

    // 根据游戏类型使用不同的时间限制
    const timeLimit = gameType === 'color'
      ? (this.data.colorDuelTimeLimit || 30)
      : (this.data.turnTimeLimit || 10)

    // 计算剩余时间：如果有服务器时间，基于服务器时间计算
    let remaining = timeLimit
    if (serverTurnStartTime) {
      const elapsed = Math.floor((Date.now() - serverTurnStartTime) / 1000)
      remaining = Math.max(0, timeLimit - elapsed)
    }

    this.setData({ turnCountdown: remaining })

    // 记录本轮结束时间，用于精确计算
    const turnEndTime = Date.now() + remaining * 1000

    const timer = setInterval(() => {
      // 基于结束时间计算剩余时间，避免 setInterval 累积误差
      remaining = Math.max(0, Math.floor((turnEndTime - Date.now()) / 1000))
      this.setData({ turnCountdown: remaining })

      if (remaining <= 0) {
        // 时间到，清除定时器并判负
        this.clearTurnCountdown()
        this.handleTurnTimeout()
      }
    }, 1000)

    this.setData({ turnTimer: timer })
  },

  /**
   * 清除每轮倒计时
   */
  clearTurnCountdown() {
    if (this.data.turnTimer) {
      clearInterval(this.data.turnTimer)
      this.setData({ turnTimer: null, turnCountdown: 0 })
    }
  },

  /**
   * 处理每轮超时（快枪手模式）
   */
  async handleTurnTimeout() {

    // 调用云函数结束游戏，当前玩家判负
    try {
      await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'finishRoom',
          roomId: this.data.roomId,
          winner: this.data.isHost ? 'guest' : 'host', // 对方获胜
          reason: 'quick_draw_timeout'
        }
      })
    } catch (err) {
    }
  },

  /**
   * 处理时间到
   */
  handleTimeUp() {
    // 清除倒计时
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
      this.setData({ countdownTimer: null })
    }

    // 只有房主调用 finishByTimeout，避免双方同时保存重复记录
    if (!this.data.isHost) {
      return
    }

    // 调用云函数结束游戏
    wx.cloud.callFunction({
      name: 'battleController',
      data: {
        action: 'finishByTimeout',
        roomId: this.data.roomId
      }
    }).catch(err => {
    })
  },

  /**
   * 处理房间数据变化
   * 根据房间状态更新界面
   */
  handleRoomChange(roomData) {

    // 检查必要数据是否存在
    if (!roomData.players || !roomData.players.host) {
      return
    }

    // 强制比对 openid，不再依赖会丢失的 isHost 状态
    const isHost = roomData.players.host.openid === this.data.myOpenid
    const myRole = isHost ? 'host' : 'guest'
    let { onlineState, isWin, finishReason } = this.data

    // 获取对手昵称
    const opponentName = isHost 
      ? (roomData.players.guest?.name || '对手')
      : (roomData.players.host?.name || '对手')
    const myName = isHost
      ? (roomData.players.host?.name || this.data.userInfo.nickName || '我')
      : (roomData.players.guest?.name || this.data.userInfo.nickName || '我')

    // 解析历史记录
    let parsedHistory = []
    let myTurnCount = 0
    
    // 确保 history 是数组
    let historyArray = roomData.history
    if (typeof historyArray === 'string') {
      // 如果是字符串（逗号分隔），转换为数组
      historyArray = historyArray.split(',').filter(h => h.trim())
    } else if (!Array.isArray(historyArray)) {
      historyArray = []
    }
    
    if (historyArray.length > 0) {
      parsedHistory = historyArray.map((h, idx) => {
        // 解析 "host:guess=1234:result=1A2B" 格式
        const parts = h.split(':')
        let player = parts[0]
        let guess = ''
        let a = 0
        let b = 0
        
        // 检查是否是新格式 (host:guess=1234:result=1A2B)
        if (parts[1] && parts[1].includes('guess=')) {
          const guessMatch = parts[1].match(/guess=(\d+)/)
          const resultMatch = parts[2] ? parts[2].match(/result=(\d+)A(\d+)B/) : null
          guess = guessMatch ? guessMatch[1] : ''
          a = resultMatch ? parseInt(resultMatch[1]) : 0
          b = resultMatch ? parseInt(resultMatch[2]) : 0
        } else {
          // 兼容旧格式 (1234:1:2:host)
          guess = parts[0] || ''
          a = parseInt(parts[1]) || 0
          b = parseInt(parts[2]) || 0
          player = parts[3] || 'host'
        }
        
        const isMyGuess = player === myRole
        
        return {
          player: player,
          guess: guess,
          guessArr: guess.split(''),
          a: a,
          b: b,
          isMyGuess: isMyGuess,
          roundNum: idx + 1  // 猜测序号
        }
      })
      
      // 倒序排列，新的在前
      parsedHistory = parsedHistory.reverse()
      
      // 计算我的回合数
      myTurnCount = parsedHistory.filter(h => h.isMyGuess).length
    }

    // 判断当前是否轮到自己
    const isMyTurn = roomData.currentGuesser === myRole
    const digitCount = roomData.digitCount || this.data.digitCount
    
    // 更新显示数字
    const onlineDisplayDigits = this.updateOnlineDisplayDigits(this.data.mySecretBuffer, digitCount)
    
    // 如果是新的一轮开始（轮到自己且之前不是自己的回合），清空猜测输入
    const wasMyTurn = this.data.roomInfo?.currentGuesser === myRole
    let onlineGuessDisplayDigits = this.updateOnlineDisplayDigits(this.data.myGuessBuffer, digitCount)
    let myGuessBuffer = this.data.myGuessBuffer
    
    // 当轮到自己且之前不是自己的回合时，清空输入框
    if (isMyTurn && !wasMyTurn && this.data.onlineState === 'playing') {
      myGuessBuffer = ''
      onlineGuessDisplayDigits = this.updateOnlineDisplayDigits('', digitCount)
    }

    // 计算轮次：两名玩家各完成一次猜测为一轮
    const totalGuesses = parsedHistory.length
    const roundCount = Math.ceil(totalGuesses / 2)

    // 过滤历史记录
    const filteredHistory = this.data.showOnlyMyHistory 
      ? parsedHistory.filter(h => h.isMyGuess)
      : parsedHistory

    // 更新房间信息
    this.setData({ 
      roomInfo: roomData, 
      digitCount: roomData.digitCount || this.data.digitCount,
      digitRule: roomData.digitRule || this.data.digitRule,
      timeLimit: roomData.timeLimit || this.data.timeLimit,
      parsedHistory, 
      filteredHistory,
      roundCount,
      myTurnCount,
      onlineDisplayDigits,
      onlineGuessDisplayDigits,
      myGuessBuffer,
      onlineHintText: this.getOnlineHintText(this.data.mySecretBuffer, digitCount),
      opponentName,
      myName
    })

    // 检查对方是否离线（setting 或 playing 状态）
    if (roomData.status === 'setting' || roomData.status === 'playing') {
      const opponentRole = myRole === 'host' ? 'guest' : 'host'
      const opponent = roomData.players[opponentRole]
      const me = roomData.players[myRole]

      // 检查双方是否都离线
      const bothOffline = me && me.isOnline === false && opponent && opponent.isOnline === false
      if (bothOffline && me.offlineAt && opponent.offlineAt) {
        // 取较晚的离线时间
        const myOfflineTime = Date.now() - new Date(me.offlineAt).getTime()
        const opponentOfflineTime = Date.now() - new Date(opponent.offlineAt).getTime()
        const maxOfflineTime = Math.max(myOfflineTime, opponentOfflineTime)
        
        if (maxOfflineTime > 60000) {
          // 双方都离线超过60秒，自动结束房间（不计入战绩）
          this.autoFinishRoom('both_offline')
          return
        }
      }

      if (opponent && opponent.isOnline === false && opponent.offlineAt) {
        // 对方离线，计算剩余时间
        const offlineTime = Date.now() - new Date(opponent.offlineAt).getTime()
        const remainingTime = Math.max(0, 60000 - offlineTime) // 60秒倒计时

        if (remainingTime > 0) {
          // 对方在 60 秒内，显示倒计时
          this.startOfflineCountdown(opponentName, remainingTime)
        } else {
          // 超过 60 秒，自动结束房间
          this.autoFinishRoom('opponent_left')
        }
      } else {
        // 对方在线，清除倒计时
        this.clearOfflineCountdown()
      }
    } else {
      // 其他状态清除倒计时
      this.clearOfflineCountdown()
    }

    // 根据房间状态处理
    let isDraw = this.data.isDraw  // 保留当前的 isDraw 状态
    
    switch (roomData.status) {
      case 'waiting':
        onlineState = 'waiting'
        isDraw = false  // 重置平局状态
        break

      case 'setting':
        onlineState = 'setting'
        isDraw = false  // 重置平局状态
        // 进入设置状态时，根据房间位数初始化显示数组
        const settingDigitCount = roomData.digitCount || 4
        if (this.data.mySecretBuffer === '') {
          this.setData({
            onlineDisplayDigits: this.updateOnlineDisplayDigits('', settingDigitCount),
            onlineHintText: this.getOnlineHintText('', settingDigitCount)
          })
        }
        break

      case 'playing':
        onlineState = 'playing'
        isDraw = false  // 重置平局状态
        // 检查是否有新消息（猜中、对方逃跑等）
        if (roomData.message) {
          this.handleRoomMessage(roomData.message)
        }
        // 启动倒计时（如果有限时且未启动）
        if (roomData.timeLimit > 0 && !this.data.countdownTimer && !roomData.gameEndTime) {
          this.startCountdown(roomData.timeLimit)
        }
        // 如果服务器已经设置了结束时间，同步到本地
        if (roomData.gameEndTime && !this.data.gameEndTime) {
          this.setData({ gameEndTime: roomData.gameEndTime })
          this.syncCountdown()
        }
        // 快枪手模式（猜数字）：启动每轮倒计时
        if (roomData.quickDrawMode && roomData.currentGuesser === myRole) {
          // 使用服务器记录的 turnStartTime 同步倒计时
          const serverTurnStartTime = roomData.turnStartTime
            ? new Date(roomData.turnStartTime).getTime()
            : null
          this.startTurnCountdown('number', serverTurnStartTime)
        } else {
          this.clearTurnCountdown()
        }
        // 猜颜色游戏：处理倒计时
        if (roomData.gameType === 'color') {
          // 对决模式：启动每轮倒计时
          if (roomData.duelMode && roomData.currentGuesser === myRole) {
            // 使用服务器记录的 turnStartTime 同步倒计时
            const serverTurnStartTime = roomData.turnStartTime
              ? new Date(roomData.turnStartTime).getTime()
              : null
            this.startTurnCountdown('color', serverTurnStartTime)
          } else if (!roomData.duelMode) {
            // 非对决模式：启动房间倒计时
            if (roomData.timeLimit > 0) {
              // 如果服务器已经设置了结束时间，同步到本地
              if (roomData.gameEndTime && !this.data.colorGameEndTime) {
                this.setData({ colorGameEndTime: roomData.gameEndTime })
              }
              // 如果未启动倒计时，启动倒计时
              if (!this.data.colorCountdownTimer) {
                this.startColorCountdown(roomData.timeLimit)
              }
            }
          }
        }
        break

      case 'finished':
        // 游戏结束
        onlineState = 'result'
        // 使用 openid 精准判断胜负
        isWin = (roomData.winner === myRole)
        finishReason = roomData.reason || ''
        // 判断是否是平局（8次都没猜对，winner为null）
        isDraw = roomData.winner === null || roomData.winner === undefined

        // 上报排行榜数据（非平局情况下）
        if (!isDraw) {
          this.reportRankScore(isWin)
        }

        // 【再来一局改造】不再清理 Watcher，保留监听以接收再来一局邀请
        // 只清理定时器和存储，保留 watcher 监听 rematch 相关字段变化
        if (this.data.heartbeatTimer) {
          clearInterval(this.data.heartbeatTimer)
        }
        if (this.data.countdownTimer) {
          clearInterval(this.data.countdownTimer)
        }
        if (this.data.turnTimer) {
          clearInterval(this.data.turnTimer)
        }
        this.setData({
          heartbeatTimer: null,
          countdownTimer: null,
          turnTimer: null,
          rematchStatus: roomData.rematchStatus || 'none'
        })
        // 清理本地存储的房间信息
        wx.removeStorageSync('onlineRoomId')
        wx.removeStorageSync('onlineRoomNumber')

        // 检查是否有待处理的再来一局邀请
        this.handleRematchStatus(roomData, myRole)
        break
    }

    // 如果是猜颜色游戏，解析颜色历史记录
    if (roomData.gameType === 'color') {
      this.parseColorHistory(roomData, myRole)
    }

    // 更新状态，包括 isDraw
    this.setData({ onlineState, isHost, isWin, finishReason, isDraw })
  },

  /**
   * 解析颜色猜测历史记录
   */
  parseColorHistory(roomData, myRole) {
    const historyArray = roomData.history || []
    const parsedColorHistory = []
    let myGuessCount = 0
    
    // 正序遍历，用于计算序号（1-8）
    historyArray.forEach((h, idx) => {
      // 解析 "host:guess=red,blue,green,yellow:result=2R1W" 格式
      const parts = h.split(':')
      if (parts.length >= 3) {
        const player = parts[0]
        const guessMatch = parts[1].match(/guess=(.+)/)
        const resultMatch = parts[2].match(/result=(\d+)R(\d+)W/)
        
        if (guessMatch && resultMatch) {
          const colors = guessMatch[1].split(',')
          const red = parseInt(resultMatch[1])
          const white = parseInt(resultMatch[2])
          const isMyGuess = player === myRole
          
          if (isMyGuess) myGuessCount++
          
          // 计算序号：总共8次猜测，按顺序分配1-8
          const seqNum = idx + 1
          
          parsedColorHistory.push({
            player,
            colors,
            red,
            white,
            redHints: new Array(red).fill(1),
            whiteHints: new Array(white).fill(1),
            isMyGuess,
            seqNum,  // 序号1-8
            roundNum: Math.ceil((idx + 1) / 2)
          })
        }
      }
    })
    
    // 倒序排列，新的在前
    parsedColorHistory.reverse()
    
    // 计算剩余次数
    const myRoleKey = myRole === 'host' ? 'hostGuesses' : 'guestGuesses'
    const myUsedGuesses = roomData[myRoleKey] || 0
    const myRemainingGuesses = 4 - myUsedGuesses
    
    // 计算总回合数
    const totalRounds = Math.ceil(historyArray.length / 2)
    
    this.setData({
      parsedColorHistory,
      myRemainingGuesses: Math.max(0, myRemainingGuesses),
      totalRounds,
      colorDisplayColors: new Array(4).fill('')  // 重置颜色显示
    })
  },

  /**
   * 处理房间消息
   * 显示游戏过程中的提示消息
   */
  handleRoomMessage(message) {
    // 根据消息类型显示不同提示
    if (message.type === 'guess_result') {
      // 猜测结果消息 - 不显示弹窗，历史记录会实时更新
      // 删除弹窗，避免干扰游戏体验
    } else if (message.type === 'player_left') {
      // 玩家离开
      wx.showModal({
        title: '游戏结束',
        content: '对方已离开房间',
        showCancel: false,
        success: () => {
          this.exitOnlineMode()
        }
      })
    }
  },

  /**
   * 处理游戏结束
   * 根据结果更新界面状态
   */
  handleGameFinish(roomData) {
    const { isHost } = this.data
    const { winner, finishReason } = roomData

    // 判断自己是否获胜
    const isWin = (winner === 1 && isHost) || (winner === 2 && !isHost)

    // 转换结束原因文本
    let reasonText = ''
    switch (finishReason) {
      case 'guess_correct':
        reasonText = isWin ? '你猜中了对方密码！' : '对方猜中了你的密码！'
        break
      case 'player_left':
        reasonText = isWin ? '对方逃跑，你获胜了！' : '你已离开房间'
        break
      case 'timeout':
        reasonText = '房间超时关闭'
        break
      default:
        reasonText = '游戏结束'
    }

    this.setData({
      onlineState: 'result',
      isWin: isWin,
      finishReason: reasonText
    })

    // 停止监听和心跳
    this.stopWatcher()
  },

  /**
   * 更新联机显示数字数组
   */
  updateOnlineDisplayDigits(buffer, digitCount) {
    const displayDigits = new Array(digitCount).fill('')
    for (let i = 0; i < buffer.length && i < digitCount; i++) {
      displayDigits[i] = buffer[i]
    }
    return displayDigits
  },

  /**
   * 获取联机提示文字
   */
  getOnlineHintText(buffer, digitCount) {
    if (buffer.length === 0) {
      return `请输入${digitCount}位数字密码`
    }
    if (buffer.length === digitCount) {
      return '密码已输入完整，点击确认'
    }
    return `还需输入 ${digitCount - buffer.length} 位数字`
  },

  /**
   * 启动对方离线倒计时
   */
  startOfflineCountdown(opponentName, remainingTime) {
    // 清除旧定时器
    this.clearOfflineCountdown()

    let remaining = Math.ceil(remainingTime / 1000)

    // 显示倒计时提示
    wx.showToast({
      title: `${opponentName}已离线，${remaining}秒后结束`,
      icon: 'none',
      duration: 2000
    })

    // 启动倒计时
    const timer = setInterval(() => {
      remaining--
      if (remaining <= 0) {
        this.clearOfflineCountdown()
        // 60秒后自动结束房间
        this.autoFinishRoom('opponent_left')
        return
      }

      // 每10秒更新一次提示
      if (remaining % 10 === 0) {
        wx.showToast({
          title: `${opponentName}已离线，${remaining}秒后结束`,
          icon: 'none',
          duration: 2000
        })
      }
    }, 1000)

    this.setData({ offlineCountdownTimer: timer })
  },

  /**
   * 自动结束房间（对方离线超时或双方离线）
   * 结算但不保存战绩记录
   */
  async autoFinishRoom(reason) {

    const { roomId, roomInfo, isHost } = this.data
    const myRole = isHost ? 'host' : 'guest'

    // 根据原因判断胜负和提示信息
    let isWin = false
    let finishReason = ''
    let cloudReason = ''

    if (reason === 'both_offline') {
      // 双方都离线，平局，不计入战绩
      isWin = false
      finishReason = '双方都离线超过60秒，游戏结束（不计入战绩）'
      cloudReason = 'both_offline_timeout'
    } else {
      // 对方离线，当前玩家获胜
      isWin = true
      finishReason = '对方离线超时，你获胜了！'
      cloudReason = 'opponent_left_timeout'
    }

    // 调用云函数结束房间
    try {
      await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'finishRoom',
          roomId: roomId,
          winner: reason === 'both_offline' ? null : myRole,
          reason: cloudReason
        }
      })
    } catch (err) {
    }

    // 更新状态为结果页
    this.setData({
      onlineState: 'result',
      isWin: isWin,
      finishReason: finishReason
    })

    // 不保存战绩记录（意外退出不计入战绩）
    // 只清理房间资源
    this.cleanupRoom(true)

    wx.showModal({
      title: '游戏结束',
      content: finishReason,
      showCancel: false,
      success: () => {
        // 保持在结果页面，用户可以点击按钮返回或再来一局
      }
    })
  },

  /**
   * 清除对方离线倒计时
   */
  clearOfflineCountdown() {
    if (this.data.offlineCountdownTimer) {
      clearInterval(this.data.offlineCountdownTimer)
      this.setData({ offlineCountdownTimer: null })
    }
  },

  /**
   * 数字键盘输入 - 设置密码
   */
  onKeypadInput(e) {
    audio.keyTap()
    const num = e.currentTarget.dataset.num
    const current = this.data.mySecretBuffer
    const digitCount = this.data.roomInfo?.digitCount || this.data.digitCount
    const digitRule = this.data.roomInfo?.digitRule || this.data.digitRule || 'repeat'

    if (current.length < digitCount) {
      // 检查规则：如果不允许重复，检查数字是否已存在
      if (digitRule === 'unique' && current.includes(num)) {
        wx.showToast({
          title: '密码位数不可重复',
          icon: 'none'
        })
        return
      }

      const newBuffer = current + num
      this.setData({
        mySecretBuffer: newBuffer,
        onlineDisplayDigits: this.updateOnlineDisplayDigits(newBuffer, digitCount),
        onlineHintText: this.getOnlineHintText(newBuffer, digitCount)
      })
    }
  },

  /**
   * 数字键盘清除
   */
  onKeypadClear() {
    audio.keyTap()
    const digitCount = this.data.roomInfo?.digitCount || this.data.digitCount
    this.setData({
      mySecretBuffer: '',
      onlineDisplayDigits: this.updateOnlineDisplayDigits('', digitCount),
      onlineHintText: this.getOnlineHintText('', digitCount)
    })
  },

  /**
   * 数字键盘退格
   */
  onKeypadBackspace() {
    audio.keyTap()
    const current = this.data.mySecretBuffer
    const digitCount = this.data.roomInfo?.digitCount || this.data.digitCount
    if (current.length > 0) {
      const newBuffer = current.slice(0, -1)
      this.setData({
        mySecretBuffer: newBuffer,
        onlineDisplayDigits: this.updateOnlineDisplayDigits(newBuffer, digitCount),
        onlineHintText: this.getOnlineHintText(newBuffer, digitCount)
      })
    }
  },

  /**
   * 输入密码（兼容旧版本）
   */
  onSecretInput(e) {
    const value = e.detail.value
    // 只保留数字
    const digitsOnly = value.replace(/\D/g, '')
    // 限制长度
    const limited = digitsOnly.slice(0, this.data.digitCount)
    
    this.setData({
      mySecretBuffer: limited
    })
  },

  /**
   * 提交密码
   * 将设置的密码提交到服务器
   */
  async submitSecret() {
    // 播放确认音效
    audio.confirmTap()

    const secret = this.data.mySecretBuffer
    // 获取当前位数设置（优先使用房间设置，否则使用全局设置）
    const digitCount = this.data.roomInfo?.digitCount || this.data.digitCount
    const digitRule = this.data.roomInfo?.digitRule || this.data.digitRule || 'repeat'

    // 验证密码格式
    if (secret.length !== digitCount) {
      wx.showToast({
        title: `请输入${digitCount}位数字密码`,
        icon: 'none'
      })
      return
    }

    // 验证密码规则：如果不允许重复，检查是否有重复数字
    if (digitRule === 'unique') {
      const uniqueDigits = new Set(secret.split(''))
      if (uniqueDigits.size !== secret.length) {
        wx.showToast({
          title: '密码中不能有重复数字',
          icon: 'none'
        })
        return
      }
    }

    wx.showLoading({ title: '提交中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'setSecret',
          roomId: this.data.roomId,
          secret: secret
        }
      })

      wx.hideLoading()

      // 检查返回结果 - setSecret 返回 { success: true }
      // 注意：不显示任何错误弹窗，只在控制台记录
      if (!result || result.success === false) {
        return
      }

      // 更新本地房间信息
      if (result.room) {
        this.setData({
          roomInfo: result.room
        })
      }
    } catch (err) {
      wx.hideLoading()
      // 不显示任何错误弹窗，只在控制台记录
    }
  },

  /**
   * 猜测数字键盘输入
   */
  onGuessKeypadInput(e) {
    audio.keyTap()
    const num = e.currentTarget.dataset.num
    const current = this.data.myGuessBuffer
    const digitCount = this.data.roomInfo?.digitCount || this.data.digitCount
    
    if (current.length < digitCount) {
      const newBuffer = current + num
      this.setData({
        myGuessBuffer: newBuffer,
        onlineGuessDisplayDigits: this.updateOnlineDisplayDigits(newBuffer, digitCount)
      })
    }
  },

  /**
   * 猜测数字键盘清除
   */
  onGuessKeypadClear() {
    audio.keyTap()
    const digitCount = this.data.roomInfo?.digitCount || this.data.digitCount
    this.setData({
      myGuessBuffer: '',
      onlineGuessDisplayDigits: this.updateOnlineDisplayDigits('', digitCount)
    })
  },

  /**
   * 猜测数字键盘退格
   */
  onGuessKeypadBackspace() {
    audio.keyTap()
    const current = this.data.myGuessBuffer
    const digitCount = this.data.roomInfo?.digitCount || this.data.digitCount
    if (current.length > 0) {
      const newBuffer = current.slice(0, -1)
      this.setData({
        myGuessBuffer: newBuffer,
        onlineGuessDisplayDigits: this.updateOnlineDisplayDigits(newBuffer, digitCount)
      })
    }
  },

  /**
   * 输入猜测数字
   * 处理猜测输入框的数字输入
   */
  onGuessInput(e) {
    const value = e.detail.value
    // 只允许输入4位数字
    if (/^\d{0,4}$/.test(value)) {
      this.setData({ myGuessBuffer: value })
    }
  },

  /**
   * 提交猜测
   * 将猜测结果提交到服务器
   */
  async submitGuess() {
    // 播放确认音效
    audio.confirmTap()

    const guess = this.data.myGuessBuffer
    // 获取当前位数设置（优先使用房间设置，否则使用全局设置）
    const digitCount = this.data.roomInfo?.digitCount || this.data.digitCount

    // 验证猜测格式
    if (guess.length !== digitCount) {
      wx.showToast({
        title: `请输入${digitCount}位数字`,
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '提交中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'submitGuess',
          roomId: this.data.roomId,
          guess: guess
        }
      })

      wx.hideLoading()

      if (result.code === 0) {
        // 清空输入缓冲和显示
        const digitCount = this.data.roomInfo?.digitCount || this.data.digitCount
        this.setData({
          myGuessBuffer: '',
          onlineGuessDisplayDigits: this.updateOnlineDisplayDigits('', digitCount)
        })

        // 如果猜中了，更新房间信息
        if (result.data.finished) {
          this.setData({
            roomInfo: result.data.room
          })
        }
      } else {
        // 不显示错误弹窗，只在控制台记录
      }
    } catch (err) {
      wx.hideLoading()
      // 不显示任何错误弹窗
    }
  },

  // ========== 猜颜色交互方法（新增） ==========

  /**
   * 点击颜色框进入编辑模式
   */
  onOnlineColorBoxTap(e) {
    const index = e.currentTarget.dataset.index
    const { colorInputBuffer } = this.data

    // 只能编辑已输入的颜色
    if (index < colorInputBuffer.length) {
      audio.keyTap()
      this.setData({
        colorEditIndex: index
      })
    }
  },

  /**
   * 按下颜色键
   */
  onOnlineColorPress(e) {
    audio.keyTap()
    const color = e.currentTarget.dataset.color
    const { colorInputBuffer, colorEditIndex } = this.data

    // 注意：不重复模式的限制已取消，允许选择重复颜色

    if (colorEditIndex >= 0) {
      // 编辑模式：替换指定位置的颜色
      const newBuffer = [...colorInputBuffer]
      newBuffer[colorEditIndex] = color
      this.setData({
        colorInputBuffer: newBuffer,
        colorEditIndex: -1
      }, () => {
        this.updateColorDisplay()
      })
    } else if (colorInputBuffer.length < 4) {
      // 正常输入模式
      this.setData({
        colorInputBuffer: [...colorInputBuffer, color]
      }, () => {
        this.updateColorDisplay()
      })
    }
  },

  /**
   * 更新颜色显示
   */
  updateColorDisplay() {
    const { colorInputBuffer } = this.data
    const colorDisplayColors = new Array(4).fill('')
    for (let i = 0; i < colorInputBuffer.length; i++) {
      colorDisplayColors[i] = colorInputBuffer[i]
    }

    this.setData({
      colorDisplayColors,
      canConfirmColor: colorInputBuffer.length === 4
    })
  },

  /**
   * 颜色键盘删除
   */
  onOnlineColorDelete() {
    audio.deleteTap()
    const { colorInputBuffer } = this.data
    if (colorInputBuffer.length > 0) {
      this.setData({
        colorInputBuffer: colorInputBuffer.slice(0, -1),
        colorEditIndex: -1
      }, () => {
        this.updateColorDisplay()
      })
    }
  },

  /**
   * 颜色键盘清空
   */
  onOnlineColorClear() {
    audio.deleteTap()
    this.setData({
      colorInputBuffer: [],
      colorEditIndex: -1
    }, () => {
      this.updateColorDisplay()
    })
  },

  /**
   * 提交颜色猜测
   */
  async submitColorGuess() {
    audio.confirmTap()

    const { colorInputBuffer, roomId } = this.data

    // 验证猜测格式
    if (colorInputBuffer.length !== 4) {
      wx.showToast({
        title: '请选择4个颜色',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '提交中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'submitColorGuess',
          roomId: roomId,
          guessColors: colorInputBuffer
        }
      })

      wx.hideLoading()

      if (result.code === 0) {
        // 清空输入缓冲
        this.setData({
          colorInputBuffer: [],
          colorDisplayColors: new Array(4).fill(''),
          canConfirmColor: false,
          colorEditIndex: -1
        })

        // 如果猜中了或游戏结束，播放音效
        if (result.data.isWin) {
          audio.victoryTap()
        }
      } else {
        wx.showToast({
          title: result.error || '提交失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      })
    }
  },

  /**
   * 复制房间号
   * 将房间号复制到剪贴板
   */
  copyRoomId() {
    // 播放按键音效
    audio.keyTap()

    wx.setClipboardData({
      data: this.data.roomId,
      success: () => {
        wx.showToast({
          title: '房间号已复制',
          icon: 'success'
        })
      }
    })
  },

  /**
   * 分享房间
   * 生成分享卡片邀请好友加入
   */
  onShareRoom() {
    // 播放按键音效
    audio.keyTap()

    // 使用系统分享
    // 实际分享逻辑在 onShareAppMessage 中处理
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
  },

  /**
   * 退出联机模式
   * 清理资源并返回大厅
   */
  /**
   * 重置联机游戏数据
   * 用于再来一局时清空上一局缓存
   */
  resetOnlineGameData() {
    // 清除离线倒计时
    this.clearOfflineCountdown()

    this.setData({
      mySecretBuffer: '',
      myGuessBuffer: '',
      parsedHistory: [],
      filteredHistory: [],
      myTurnCount: 0,
      roundCount: 0,
      showOnlyMyHistory: false,
      onlineDisplayDigits: [],
      onlineGuessDisplayDigits: [],
      onlineHintText: '',
      isWin: false,
      finishReason: ''
    })
  },

  /**
   * 切换历史记录过滤
   * 只看自己 / 全局
   */
  toggleHistoryFilter() {
    const showOnlyMyHistory = !this.data.showOnlyMyHistory
    const filteredHistory = showOnlyMyHistory
      ? this.data.parsedHistory.filter(h => h.isMyGuess)
      : this.data.parsedHistory

    this.setData({
      showOnlyMyHistory,
      filteredHistory
    })
  },

  /**
   * 切换猜测记录展开/收起
   */
  toggleHistoryExpand() {
    this.setData({
      historyExpanded: !this.data.historyExpanded
    })
  },

  async exitOnlineMode() {
    // 播放按键音效和触动反馈
    audio.keyTap()

    // 如果还在房间中，先离开房间
    if (this.data.roomId && this.data.onlineState !== 'result') {
      await this.leaveRoom()
    }

    // 停止监听和心跳
    this.stopWatcher()

    // 重置联机数据
    this.setData({
      showOnlineMode: false,
      onlineState: 'hall',
      roomId: '',
      roomInfo: null,
      isHost: false,
      isWin: false,
      finishReason: '',
      mySecretBuffer: '',
      myGuessBuffer: '',
      joinRoomId: '',
      parsedHistory: [],
      filteredHistory: [],
      myTurnCount: 0,
      roundCount: 0,
      showOnlyMyHistory: false,
      onlineDisplayDigits: [],
      onlineGuessDisplayDigits: [],
      onlineHintText: ''
    })
  },

  /**
   * 离开房间
   * 调用云函数离开当前房间
   */
  async leaveRoom() {
    if (!this.data.roomId) return

    try {
      await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'leaveRoom',
          roomId: this.data.roomId
        }
      })
    } catch (err) {
    }
  },

  /**
   * 再来一局
   * 游戏结束后返回到游戏模式选择页面（大厅）
   */
  async playAgain() {
    // 播放按键音效
    audio.keyTap()

    // 先退出当前房间
    await this.leaveRoom()

    // 停止监听
    this.stopWatcher()

    // 重置状态并返回到大厅（游戏模式选择页面）
    this.setData({
      onlineState: 'hall',
      roomId: '',
      roomInfo: null,
      isHost: false,
      isWin: false,
      finishReason: '',
      mySecretBuffer: '',
      myGuessBuffer: '',
      // 重置联机游戏设置默认值
      onlineGameType: 'number',    // 默认猜数字
      digitCount: 4,               // 默认4位
      digitRule: 'repeat',         // 默认可重复
      timeLimit: 10,               // 默认10分钟（猜数字）
      quickDrawMode: false,        // 默认关闭快枪手
      // 重置猜颜色数据
      colorMode: 'repeat',         // 颜色模式默认可重复
      colorFirstPlayer: 'host',    // 默认房主先手
      duelMode: false,             // 默认关闭对决模式
      turnTimeLimit: 10,           // 猜数字快枪手模式每轮10秒
      // 重置颜色输入相关
      colorInputBuffer: [],
      colorDisplayColors: [],
      colorEditIndex: -1,
      parsedColorHistory: [],
      myRemainingGuesses: 4,
      totalRounds: 0
    })
  },

  /**
   * 再来一局（结算页面使用）
   * 调用云函数创建再来一局房间
   */
  async playAgainToHall() {
    // 播放按键音效
    audio.keyTap()

    // 防止重复点击
    if (this.data.rematchLoading) return
    this.setData({ rematchLoading: true })

    const { roomId } = this.data
    if (!roomId) {
      this.setData({ rematchLoading: false })
      return
    }

    wx.showLoading({ title: '创建中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'rematch',
          roomId: roomId
        }
      })

      wx.hideLoading()

      if (result.success) {
        // 标记为发起方
        this.setData({
          isRematchInitiator: true,
          rematchStatus: result.rematchStatus || 'pending',
          rematchLoading: false
        })

        // 如果对方已经创建房间（并发情况），直接加入
        if (result.isJoinMode && result.nextRoomId) {
          this.joinRematchRoom(result.nextRoomId)
          return
        }

        // 启动 16 秒倒计时（给 B 15秒 + 1秒容错）
        this.startRematchCountdown(16)
      } else {
        this.setData({ rematchLoading: false })
        wx.showToast({
          title: result.error || '创建失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ rematchLoading: false })
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      })
    }
  },

  /**
   * 启动再来一局倒计时
   * @param {number} seconds - 倒计时秒数
   */
  startRematchCountdown(seconds) {
    // 清除旧定时器
    if (this.data.rematchTimer) {
      clearInterval(this.data.rematchTimer)
    }

    this.setData({
      rematchCountdown: seconds,
      rematchTimer: setInterval(() => {
        const newCount = this.data.rematchCountdown - 1
        this.setData({ rematchCountdown: newCount })

        // 倒计时结束
        if (newCount <= 0) {
          this.clearRematchCountdown()
          // 调用云函数标记为过期
          this.expireRematch()
        }
      }, 1000)
    })
  },

  /**
   * 清除再来一局倒计时
   */
  clearRematchCountdown() {
    if (this.data.rematchTimer) {
      clearInterval(this.data.rematchTimer)
      this.setData({ rematchTimer: null, rematchCountdown: 0 })
    }
  },

  /**
   * 标记再来一局邀请过期
   */
  async expireRematch() {
    const { roomId } = this.data
    if (!roomId) return

    try {
      await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'expireRematch',
          roomId: roomId
        }
      })
    } catch (err) {
      // 静默处理
    }

    // 清理并返回大厅
    this.cleanupRematchAndExit()
  },

  /**
   * 处理再来一局状态变化
   * @param {Object} roomData - 房间数据
   * @param {string} myRole - 我的角色
   */
  handleRematchStatus(roomData, myRole) {
    const { rematchStatus, nextRoomId, rematchInitiator } = roomData

    switch (rematchStatus) {
      case 'pending':
        // 如果是接收方，显示邀请弹窗
        if (rematchInitiator !== this.data.myOpenid) {
          this.setData({
            showRematchInvite: true,
            isRematchInitiator: false
          })
          // 启动 15 秒倒计时（纯 UI 倒计时）
          this.startRematchCountdown(15)
        }
        break

      case 'accepted':
        // 双方都要加入新房间
        if (nextRoomId) {
          this.clearRematchCountdown()
          this.joinRematchRoom(nextRoomId)
        }
        break

      case 'rejected':
        // 发起方收到拒绝
        if (rematchInitiator === this.data.myOpenid) {
          this.clearRematchCountdown()
          wx.showToast({
            title: '对方婉拒了您的再战邀请',
            icon: 'none',
            duration: 2000
          })
          setTimeout(() => {
            this.cleanupRematchAndExit()
          }, 2000)
        }
        break

      case 'cancelled':
        // 接收方收到取消
        if (rematchInitiator !== this.data.myOpenid) {
          this.clearRematchCountdown()
          this.setData({ showRematchInvite: false })
          wx.showToast({
            title: '对方已取消邀请',
            icon: 'none'
          })
        }
        break

      case 'expired':
        // 超时处理
        this.clearRematchCountdown()
        this.setData({ showRematchInvite: false })
        if (rematchInitiator === this.data.myOpenid) {
          wx.showToast({
            title: '对方无响应',
            icon: 'none'
          })
        }
        setTimeout(() => {
          this.cleanupRematchAndExit()
        }, 1500)
        break
    }
  },

  /**
   * 接受再来一局邀请
   */
  async acceptRematch() {
    // 防止重复点击
    if (this.data.rematchLoading) return
    this.setData({ rematchLoading: true })

    const { roomId } = this.data
    if (!roomId) {
      this.setData({ rematchLoading: false })
      return
    }

    // 清除倒计时
    this.clearRematchCountdown()

    wx.showLoading({ title: '加入中...' })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'acceptRematch',
          roomId: roomId
        }
      })

      wx.hideLoading()

      if (result.success) {
        // 关闭弹窗
        this.setData({
          showRematchInvite: false,
          rematchLoading: false
        })
        // 加入新房间
        this.joinRematchRoom(result.nextRoomId)
      } else {
        this.setData({ rematchLoading: false })
        wx.showToast({
          title: result.error || '加入失败',
          icon: 'none'
        })
        // 关闭弹窗并清理
        this.setData({ showRematchInvite: false })
        setTimeout(() => {
          this.cleanupRematchAndExit()
        }, 1500)
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ rematchLoading: false })
      wx.showToast({
        title: '加入失败',
        icon: 'none'
      })
      this.setData({ showRematchInvite: false })
    }
  },

  /**
   * 拒绝再来一局邀请
   */
  async rejectRematch() {
    // 防止重复点击
    if (this.data.rematchLoading) return
    this.setData({ rematchLoading: true })

    // 清除倒计时
    this.clearRematchCountdown()

    // 关闭弹窗
    this.setData({
      showRematchInvite: false,
      rematchLoading: false
    })

    // 清理并返回大厅
    this.cleanupRematchAndExit()
  },

  /**
   * 取消再来一局邀请（发起方调用）
   */
  async cancelRematch() {
    // 防止重复点击
    if (this.data.rematchLoading) return

    const { roomId } = this.data
    if (!roomId) return

    // 清除倒计时
    this.clearRematchCountdown()

    try {
      await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'cancelRematch',
          roomId: roomId
        }
      })
    } catch (err) {
      // 静默处理
    }

    // 清理并返回大厅
    this.cleanupRematchAndExit()
  },

  /**
   * 加入再来一局新房间
   * @param {string} newRoomId - 新房间ID
   */
  async joinRematchRoom(newRoomId) {
    // 防止重复调用
    if (this.data._isJoiningRematch) {
      console.log('[joinRematchRoom] 正在加入中，忽略重复调用')
      return
    }
    this.data._isJoiningRematch = true

    // 【关键】释放老房间的 Watcher
    this.stopWatcher()

    wx.showLoading({ title: '进入房间...', mask: true })

    try {
      console.log('[joinRematchRoom] 加入房间:', newRoomId, '是否发起方:', this.data.isRematchInitiator)
      // 加入新房间
      const { result } = await wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'joinRoom',
          roomId: newRoomId,
          userInfo: {
            name: this.data.userInfo.nickName || '神秘玩家',
            avatar: this.data.userInfo.avatarUrl || ''
          }
        }
      })

      console.log('[joinRematchRoom] 云函数返回:', result)

      if (result.success) {
        wx.hideLoading()

        // 判断是否是新房主（发起方）
        const isNewHost = result.room.players.host && result.room.players.host.openid === this.data.myOpenid

        // 获取房间号（优先使用 roomNumber，如果没有则使用 roomId）
        const newRoomNumber = result.room.roomNumber || result.roomId

        // 更新状态为新房间
        this.setData({
          roomId: result.roomId,
          roomNumber: newRoomNumber,
          roomInfo: result.room,
          isHost: isNewHost,  // 根据 openid 判断是否是新房主
          onlineState: isNewHost ? 'waiting' : (result.room.gameType === 'color' ? 'playing' : 'setting'),
          rematchStatus: 'none',
          isRematchInitiator: false,
          rematchLoading: false,
          mySecretBuffer: '',  // 清空上一局的密码
          myGuessBuffer: ''    // 清空上一局的猜测
        })

        // 保存到本地存储
        wx.setStorageSync('onlineRoomId', result.roomId)
        wx.setStorageSync('onlineRoomNumber', newRoomNumber)

        // 开始监听新房间
        this.startWatcher(result.roomId)

        wx.showToast({
          title: '进入房间成功',
          icon: 'success'
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: result.error || '进入房间失败',
          icon: 'none'
        })
        this.cleanupRematchAndExit()
      }
    } catch (err) {
      console.error('[joinRematchRoom] 调用失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '进入房间失败',
        icon: 'none'
      })
      this.cleanupRematchAndExit()
    } finally {
      this.data._isJoiningRematch = false
    }
  },

  /**
   * 清理再来一局状态并返回大厅
   */
  cleanupRematchAndExit() {
    // 【关键】释放 Watcher
    this.stopWatcher()

    // 清除倒计时
    this.clearRematchCountdown()

    // 重置所有状态
    this.setData({
      onlineState: 'hall',
      roomId: '',
      roomInfo: null,
      isHost: false,
      isWin: false,
      finishReason: '',
      mySecretBuffer: '',
      myGuessBuffer: '',
      rematchStatus: 'none',
      showRematchInvite: false,
      isRematchInitiator: false,
      rematchLoading: false,
      // 重置联机游戏设置默认值
      onlineGameType: 'number',
      digitCount: 4,
      digitRule: 'repeat',
      timeLimit: 10,
      quickDrawMode: false,
      colorMode: 'repeat',
      colorFirstPlayer: 'host',
      duelMode: false,
      turnTimeLimit: 10,
      colorInputBuffer: [],
      colorDisplayColors: [],
      colorEditIndex: -1,
      parsedColorHistory: [],
      myRemainingGuesses: 4,
      totalRounds: 0
    })
  },

  /**
   * 返回大厅
   * 游戏结束后返回联机大厅
   */
  backToHall() {
    // 播放按键音效
    audio.keyTap()

    // 先退出当前房间
    this.leaveRoom()

    // 停止监听
    this.stopWatcher()

    // 重置状态
    this.setData({
      onlineState: 'hall',
      roomId: '',
      roomInfo: null,
      isHost: false,
      isWin: false,
      finishReason: '',
      mySecretBuffer: '',
      myGuessBuffer: '',
      // 重置联机游戏设置默认值
      onlineGameType: 'number',    // 默认猜数字
      digitCount: 4,               // 默认4位
      digitRule: 'repeat',         // 默认可重复
      timeLimit: 10,               // 默认10分钟（猜数字）
      quickDrawMode: false,        // 默认关闭快枪手
      // 重置猜颜色数据
      colorMode: 'repeat',         // 颜色模式默认可重复
      colorFirstPlayer: 'host',    // 默认房主先手
      duelMode: false,             // 默认关闭对决模式
      turnTimeLimit: 10,           // 猜数字快枪手模式每轮10秒
      // 重置颜色输入相关
      colorInputBuffer: [],
      colorDisplayColors: [],
      colorEditIndex: -1,
      parsedColorHistory: [],
      myRemainingGuesses: 4,
      totalRounds: 0
    })
  },

  /**
   * 页面卸载时清理资源
   */
  onUnload() {
    // 停止房间监听
    this.stopWatcher()

    // 如果还在房间中，离开房间
    if (this.data.roomId) {
      this.leaveRoom()
    }

    // 【P1 修复】清理再来一局倒计时，防止内存泄漏
    if (this.data.rematchTimer) {
      clearInterval(this.data.rematchTimer)
      this.setData({ rematchTimer: null })
    }

    // 【P1 修复】如果是发起方主动退出，调用 cancelRematch 取消邀请
    if (this.data.rematchStatus === 'pending' && this.data.isRematchInitiator && this.data.roomId) {
      wx.cloud.callFunction({
        name: 'battleController',
        data: {
          action: 'cancelRematch',
          roomId: this.data.roomId
        }
      }).catch(() => {
        // 静默处理
      })
    }
  },

  // ========== 每日挑战相关方法 ==========

  /**
   * 加载每日挑战信息
   */
  async loadDailyChallengeInfo() {
    const dailyChallenge = require('../../utils/dailyChallenge.js')
    const result = await dailyChallenge.getDailyInfo()

    if (result.success) {
      this.setData({
        dailyChallenge: {
          attemptsLeft: result.attemptsLeft,
          mode: result.mode,
          digitCount: result.digitCount || 4,  // 新增：位数信息
          allowRepeat: result.allowRepeat,
          modeIndex: result.modeIndex,  // 新增：模式索引
          bestScore: result.bestScore,
          fetchDate: result.date,  // ⚠️ 保存数据获取日期，用于跨天校验
          loading: false
        }
      })
    } else if (result.needLogin) {
      // 需要登录，提示用户
      wx.showModal({
        title: '需要登录',
        content: '参与每日挑战需要先登录并授权头像和昵称',
        showCancel: false,
        confirmText: '去登录',
        success: () => {
          // 触发登录流程
          wx.showToast({
            title: '请点击左上角头像登录',
            icon: 'none',
            duration: 2000
          })
        }
      })
    }
  },

  /**
   * 点击每日挑战按钮 - 懒加载模式 + 防连点锁 + 广告激励
   * 只有在点击时才加载数据并展示弹窗
   * ⚠️ 关键：必须使用 await wx.showModal 阻塞，防止 finally 提前解锁
   */
  async onDailyChallengeTap() {
    // ========== 1. 防连点锁（进入即锁死）==========
    if (this.data.isFetchingDaily) return;
    this.setData({ isFetchingDaily: true });

    audio.confirmTap();

    // 检查登录状态 - 每日挑战只需要昵称，头像不是必须的
    const { userInfo, isLoggedIn } = this.data;
    if (!isLoggedIn || !userInfo.nickName) {
      await wx.showModal({
        title: '需要登录',
        content: '参与每日挑战需要先登录并授权昵称',
        showCancel: false,
        confirmText: '去登录'
      });
      wx.showToast({
        title: '请点击左上角头像登录',
        icon: 'none',
        duration: 2000
      });
      this.setData({ isFetchingDaily: false });  // 释放锁
      return;
    }

    // 【优化】头像不是必须的，但如果头像正在上传中，给个提示但不阻断
    if (userInfo.avatarUrl) {
      const avatarType = this.getAvatarType(userInfo.avatarUrl);
      console.log('[每日挑战] 头像类型:', avatarType, 'URL:', userInfo.avatarUrl);

      if (avatarType === 'temp') {
        // 头像正在上传中，给个提示但继续执行
        console.log('[每日挑战] 头像正在同步中，但不影响每日挑战');
      }
    }

    // ========== 2. 懒加载：点击时才获取数据 ==========
    wx.showLoading({ title: '加载中...' });

    try {
      const dailyChallengeUtil = require('../../utils/dailyChallenge.js');
      const result = await dailyChallengeUtil.getDailyInfo();

      wx.hideLoading();

      if (!result.success) {
        if (result.needLogin) {
          await wx.showModal({
            title: '需要登录',
            content: '参与每日挑战需要先登录并授权头像和昵称',
            showCancel: false,
            confirmText: '去登录'
          });
        } else {
          wx.showToast({
            title: result.error || '加载失败',
            icon: 'none'
          });
        }
        return;
      }

      // 更新本地数据（包含广告次数）
      this.setData({
        dailyChallenge: {
          attemptsLeft: result.attemptsLeft,
          extraAttemptsFromAd: result.extraAttemptsFromAd || 0,
          mode: result.mode,
          allowRepeat: result.allowRepeat,
          bestScore: result.bestScore,
          fetchDate: result.date,
          loading: false,
          hasLoaded: true
        }
      });

      const { attemptsLeft, extraAttemptsFromAd } = this.data.dailyChallenge;

      // ========== 3. 判断是否有剩余次数 ==========
      if (attemptsLeft > 0) {
        // 有剩余次数，显示正常开始弹窗
        await this.showNormalStartModal(result);
      } else {
        // 次数用尽，判断广告次数
        if (extraAttemptsFromAd >= 10) {
          // 广告次数也用尽了
          await wx.showModal({
            title: '今日挑战已结束',
            content: '您今日的挑战次数（含广告奖励）已全部用完，请明天再来！',
            showCancel: false
          });
        } else {
          // 还没看满10次广告，提示看广告
          const remainAdTimes = 10 - extraAttemptsFromAd;
          const { isAdReady } = this.data;
          
          // 根据广告加载状态显示不同的提示
          const modalRes = await wx.showModal({
            title: '次数已用完',
            content: isAdReady 
              ? `今日免费次数已用完，观看广告可获取 1 次额外挑战机会(今日还可获取${remainAdTimes}次)`
              : `今日免费次数已用完，广告加载中请稍后再试(今日还可获取${remainAdTimes}次)`,
            confirmText: isAdReady ? '看广告' : '知道了',
            showCancel: isAdReady,
            cancelText: '取消'
          });
          
          // 只有广告准备好且用户确认时才展示广告
          if (isAdReady && modalRes.confirm) {
            this.showAd();
          }
        }
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      // ========== 4. 只有当网络请求全结束，且弹窗彻底关闭后，锁才会安全释放！==========
      this.setData({ isFetchingDaily: false });
    }
  },

  /**
   * 显示正常开始游戏的确认弹窗
   */
  async showNormalStartModal(result) {
    // 获取模式显示文本
    const dailyChallengeUtil = require('../../utils/dailyChallenge.js');
    const modeDisplayText = dailyChallengeUtil.getModeDisplayText(result.modeIndex);

    const modalRes = await wx.showModal({
      title: '每日挑战',
      content: `今日模式：${modeDisplayText}\n剩余次数：${result.attemptsLeft}次\n\n进入游戏将扣除1次机会，是否继续？`,
      confirmText: '开始挑战'
    });

    // 只有玩家点击确认，才走后续流程
    if (modalRes.confirm) {
      wx.showLoading({ title: '加载中...' });

      try {
        const dailyChallengeUtil = require('../../utils/dailyChallenge.js');
        const startResult = await dailyChallengeUtil.startDailyChallenge();

        wx.hideLoading();

        if (startResult.success) {
          // 更新本地数据
          this.setData({
            'dailyChallenge.attemptsLeft': startResult.attemptsLeft
          });

          // 跳转到对应的每日挑战页面，传递 digitCount 参数
          const targetPage = startResult.mode === 'number'
            ? `/pages/daily-game/daily-game?allowRepeat=${startResult.allowRepeat}&digitCount=${startResult.digitCount || 4}`
            : `/pages/daily-color/daily-color?allowRepeat=${startResult.allowRepeat}`;

          wx.navigateTo({ url: targetPage });
        } else {
          wx.showToast({
            title: startResult.error || '开始失败',
            icon: 'none'
          });
        }
      } catch (err) {
        wx.hideLoading();
        wx.showToast({
          title: '开始失败',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 初始化激励视频广告
   */
  initRewardedVideoAd() {
    if (wx.createRewardedVideoAd) {
      this.videoAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-79f648b9857aa25e'
      });
      
      // 【终极防御】生成一个唯一的、绑定了 this 的引用，用于事件的绑定和解绑
      // 避免直接传 this.onAdClose 导致 this 丢失报错
      if (!this._onAdCloseCallback) {
        this._onAdCloseCallback = this.onAdClose.bind(this);
        this._onAdLoadCallback = () => {
          console.log('激励视频广告加载成功');
          // 标记广告已准备好
          this.setData({ isAdReady: true });
        };
        this._onAdErrorCallback = (err) => {
          console.error('激励视频广告加载失败', err);
          // 标记广告未准备好
          this.setData({ isAdReady: false });
        };
      }
      
      // 先统一解绑，再绑定，防止进出页面导致日志和回调倍数递增
      this.videoAd.offLoad(this._onAdLoadCallback);
      this.videoAd.onLoad(this._onAdLoadCallback);
      
      this.videoAd.offError(this._onAdErrorCallback);
      this.videoAd.onError(this._onAdErrorCallback);

      this.videoAd.offClose(this._onAdCloseCallback); 
      this.videoAd.onClose(this._onAdCloseCallback);
    }
  },

  /**
   * 广告关闭回调
   */
  onAdClose(res) {
    if (res && res.isEnded) {
      // 正常播放结束，下发奖励
      this.grantAdReward();
    } else {
      // 播放中途退出
      wx.showToast({ title: '需完整观看才能获得次数哦', icon: 'none' });
    }
  },

  /**
   * 展示广告
   */
  showAd() {
    if (this.videoAd) {
      wx.showLoading({ title: '加载中...' });
      this.videoAd.show().then(() => {
        wx.hideLoading();
      }).catch((err) => {
        // 失败重试
        this.videoAd.load()
          .then(() => {
            wx.hideLoading();
            this.videoAd.show();
          })
          .catch(err => {
            wx.hideLoading();
            console.error('激励视频广告显示失败', err);
            // 判断错误类型，给用户友好提示
            const errMsg = err && err.errMsg ? err.errMsg : '';
            if (errMsg.includes('no ad return') || errMsg.includes('1004')) {
              wx.showModal({
                title: '广告加载失败',
                content: '当前暂无可用广告，请稍后重试或明天再来',
                showCancel: false
              });
            } else {
              wx.showToast({ title: '广告准备中，请稍后再试', icon: 'none' });
            }
          });
      });
    } else {
      wx.showToast({ title: '微信版本过低，不支持广告', icon: 'none' });
    }
  },

  /**
   * 发放广告奖励
   */
  grantAdReward() {
    // 防御客户端偶发的 onClose 双重触发 Bug
    if (this.data.isGrantingReward) return; 
    this.setData({ isGrantingReward: true });

    wx.showLoading({ title: '获取奖励中...', mask: true });
    
    wx.cloud.callFunction({
      name: 'addExtraAttemptByAd',
      data: {}
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        // 同步本地数据（云函数已增加次数，直接使用返回的最新值）
        const newAttemptsLeft = res.result.attemptsLeft;
        const newExtraAttempts = res.result.extraAttemptsFromAd;
        
        this.setData({
          'dailyChallenge.attemptsLeft': newAttemptsLeft,
          'dailyChallenge.extraAttemptsFromAd': newExtraAttempts
        });
        
        wx.showToast({ title: '获得1次机会！', icon: 'success', duration: 1500 });
        
        // 延迟后直接显示开始游戏确认框（不需要重新获取数据）
        setTimeout(() => {
          // 构造 result 对象传递给 showNormalStartModal
          const result = {
            attemptsLeft: newAttemptsLeft,
            mode: this.data.dailyChallenge.mode,
            digitCount: this.data.dailyChallenge.digitCount || 4,
            allowRepeat: this.data.dailyChallenge.allowRepeat,
            modeIndex: this.data.dailyChallenge.modeIndex || 0
          };
          this.showNormalStartModal(result);
        }, 1500);

      } else {
        wx.showToast({ title: res.result.msg || '获取失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    }).finally(() => {
      // 释放防抖锁
      this.setData({ isGrantingReward: false });
    });
  },

  /**
   * 清除异常状态
   * 清除本地缓存数据（保留单机战绩），重置登录状态，解决匹配、每日挑战等功能异常
   */
  async clearAbnormalState() {
    // 播放按键音效
    audio.keyTap();

    // 显示确认弹窗，防止误触
    const confirmRes = await wx.showModal({
      title: '清除异常状态',
      content: '这将清除登录状态、游戏设置等数据，但会保留本地单机战绩。确定要继续吗？',
      confirmText: '确定清除',
      confirmColor: '#E60012',
      cancelText: '取消'
    });

    if (!confirmRes.confirm) {
      return;
    }

    wx.showLoading({ title: '清除中...', mask: true });

    try {
      // 1. 先保存需要保留的数据（本地单机战绩）
      const localGameHistory = wx.getStorageSync('LOCAL_GAME_HISTORY');

      // 2. 清除所有本地存储数据（使用微信小程序官方API）
      // 官方文档：https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.clearStorageSync.html
      wx.clearStorageSync();

      // 3. 恢复需要保留的数据（本地单机战绩）
      if (localGameHistory && localGameHistory.length > 0) {
        wx.setStorageSync('LOCAL_GAME_HISTORY', localGameHistory);
      }

      // 4. 停止所有定时器和监听
      this.cleanupRoom(true);

      // 5. 隐藏设置弹窗
      this.setData({
        showSettingsModal: false
      });

      wx.hideLoading();

      // 6. 显示成功提示
      await wx.showModal({
        title: '清除成功',
        content: '异常状态已清除，本地单机战绩已保留。小程序将重新启动，请重新登录后使用。',
        showCancel: false,
        confirmText: '立即重启'
      });

      // 7. 重启小程序到首页
      wx.reLaunch({
        url: '/pages/index/index'
      });

    } catch (err) {
      wx.hideLoading();
      console.error('清除异常状态失败:', err);
      wx.showToast({
        title: '清除失败，请重试',
        icon: 'none'
      });
    }
  }
})
