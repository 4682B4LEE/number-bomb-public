// 玩家名称设置页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')

// 默认角色名称
const DEFAULT_P1_NAME = '马里昂'
const DEFAULT_P2_NAME = '路易喆'

Page({
  data: {
    p1Name: DEFAULT_P1_NAME,
    p2Name: DEFAULT_P2_NAME,
    saveProfile: false  // 是否保存角色档案
  },

  onLoad() {
    // 检查是否有保存的角色档案
    const savedProfile = wx.getStorageSync('savedPlayerProfile')
    
    if (savedProfile) {
      // 有保存的档案，使用保存的值
      this.setData({
        p1Name: savedProfile.p1Name || DEFAULT_P1_NAME,
        p2Name: savedProfile.p2Name || DEFAULT_P2_NAME,
        saveProfile: true  // 默认勾选
      })
    } else {
      // 没有保存的档案，使用默认值
      this.setData({
        p1Name: DEFAULT_P1_NAME,
        p2Name: DEFAULT_P2_NAME,
        saveProfile: false
      })
    }
  },

  // 玩家1名称输入
  onP1Input(e) {
    // 输入时轻反馈
    audio.lightFeedback()
    this.setData({ p1Name: e.detail.value })
  },

  // 玩家2名称输入
  onP2Input(e) {
    // 输入时轻反馈
    audio.lightFeedback()
    this.setData({ p2Name: e.detail.value })
  },

  // 切换保存角色档案
  toggleSaveProfile() {
    // 播放按键音效
    audio.keyTap()
    this.setData({
      saveProfile: !this.data.saveProfile
    })
  },

  // 确认名称
  confirmNames() {
    // 播放确认音效和触动反馈
    audio.confirmTap()

    const { p1Name, p2Name, saveProfile } = this.data

    // 保存名称到全局数据
    app.globalData.p1Name = p1Name || '玩家1'
    app.globalData.p2Name = p2Name || '玩家2'

    // 如果勾选了保存角色档案，保存到本地存储
    if (saveProfile) {
      wx.setStorageSync('savedPlayerProfile', {
        p1Name: p1Name || DEFAULT_P1_NAME,
        p2Name: p2Name || DEFAULT_P2_NAME
      })
    } else {
      // 如果没有勾选，清除已保存的档案
      wx.removeStorageSync('savedPlayerProfile')
    }

    // 根据游戏类型跳转到不同页面
    const gameType = app.globalData.gameType
    if (gameType === 'color') {
      // 猜颜色游戏：初始化数据并直接开始游戏
      this.initColorGame()
      wx.redirectTo({
        url: '/pages/color-game/color-game'
      })
    } else {
      // 猜数字游戏：跳转到抛硬币页面
      wx.redirectTo({
        url: '/pages/coin/coin'
      })
    }
  },

  // 初始化猜颜色游戏数据
  initColorGame() {
    // 重置猜颜色游戏数据
    app.globalData.colorSecret = null
    app.globalData.colorGuesses = { p1: [], p2: [] }
    app.globalData.colorCurrentTurn = 1
    app.globalData.colorWinner = null
    // 设置先手玩家（P1先手）
    app.globalData.colorFirstPlayer = 1
    // 重置双方设置的密码
    app.globalData.p1ColorSecret = null
    app.globalData.p2ColorSecret = null
    // 本地双人模式，设置 isSingleMode 为 false
    app.globalData.isSingleMode = false
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 设置角色',
      path: '/pages/names/names',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 设置角色',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
