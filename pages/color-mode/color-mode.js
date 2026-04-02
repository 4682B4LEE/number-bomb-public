// 猜颜色游戏模式选择页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')

Page({
  data: {
    colorMode: 'repeat',  // 默认颜色可重复模式
    playMode: 'local'     // 游戏玩法模式：local=本地双人, single=单人模式
  },

  onLoad() {
    // 重置猜颜色游戏数据
    this.resetColorGameData()
  },

  // 选择颜色模式
  selectColorMode(e) {
    // 播放按键音效和触动反馈
    audio.keyTap()
    const mode = e.currentTarget.dataset.mode
    this.setData({ colorMode: mode })
  },

  // 选择游戏玩法模式（本地双人/单人模式）
  selectPlayMode(e) {
    // 播放按键音效和触动反馈
    audio.keyTap()
    const mode = e.currentTarget.dataset.mode
    this.setData({ playMode: mode })
  },

  // 开始猜颜色游戏
  startColorGame() {
    // 播放确认音效和触动反馈
    audio.confirmTap()
    // 保存颜色模式到全局数据
    app.globalData.colorMode = this.data.colorMode
    app.globalData.gameType = 'color'  // 标记为猜颜色游戏
    // 保存玩法模式到全局数据
    app.globalData.playMode = this.data.playMode

    // 根据玩法模式进入不同流程
    if (this.data.playMode === 'single') {
      // 单人模式：跳过创建角色，直接进入游戏
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
    const userInfo = wx.getStorageSync('userInfo') || {}
    const playerName = userInfo.nickName || '玩家'

    // 设置单人模式的全局数据
    app.globalData.p1Name = playerName
    app.globalData.p2Name = '系统'
    app.globalData.colorCurrentTurn = 1
    app.globalData.isSingleMode = true

    // 生成系统颜色密码
    this.generateSecret()

    // 初始化猜测记录
    app.globalData.colorGuesses = { p1: [], p2: [] }
    app.globalData.colorWinner = null

    // 跳转到猜颜色游戏页面
    wx.redirectTo({
      url: '/pages/color-game/color-game'
    })
  },

  // 生成秘密颜色组合
  generateSecret() {
    const COLORS = ['red', 'green', 'blue', 'yellow', 'purple', 'gray']
    const { colorMode } = this.data
    let secret = []

    if (colorMode === 'unique') {
      // 颜色不重复模式
      const shuffled = [...COLORS].sort(() => Math.random() - 0.5)
      secret = shuffled.slice(0, 4)
    } else {
      // 颜色可重复模式
      secret = []
      for (let i = 0; i < 4; i++) {
        secret.push(COLORS[Math.floor(Math.random() * COLORS.length)])
      }

      // 检查是否有颜色出现超过2次
      const colorCount = {}
      secret.forEach(c => {
        colorCount[c] = (colorCount[c] || 0) + 1
      })

      const maxCount = Math.max(...Object.values(colorCount))
      if (maxCount > 2) {
        return this.generateSecret()
      }
    }

    app.globalData.colorSecret = secret
  },

  // 返回首页
  goBack() {
    // 播放按键音效和触动反馈
    audio.keyTap()
    wx.navigateBack()
  },

  // 重置猜颜色游戏数据
  resetColorGameData() {
    app.globalData.colorSecret = null
    app.globalData.colorGuesses = []
    app.globalData.colorCurrentTurn = 1
    app.globalData.colorWinner = null
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 猜颜色',
      path: '/pages/color-mode/color-mode',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 猜颜色',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
