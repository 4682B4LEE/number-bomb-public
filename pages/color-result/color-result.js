// 猜颜色猜测结果页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')

// 最大猜测次数
const MAX_GUESSES = 8

Page({
  data: {
    redCount: 0,      // 红点数量（位置和颜色都对）
    whiteCount: 0,    // 白点数量（颜色对位置错）
    isWin: false,     // 是否获胜
    totalGuesses: 0,  // 总猜测次数
    isGameOver: false // 游戏是否结束（达到最大次数）
  },

  onLoad(options) {
    // 获取结果参数
    const red = parseInt(options.red) || 0
    const white = parseInt(options.white) || 0
    const isWin = options.isWin === 'true'

    // 计算总猜测次数
    const colorGuesses = app.globalData.colorGuesses || { p1: [], p2: [] }
    const totalGuesses = (colorGuesses.p1?.length || 0) + (colorGuesses.p2?.length || 0)

    // 检查是否达到最大次数
    const isGameOver = !isWin && totalGuesses >= MAX_GUESSES

    this.setData({
      redCount: red,
      whiteCount: white,
      isWin: isWin,
      totalGuesses: totalGuesses,
      isGameOver: isGameOver
    })

    // 播放相应音效
    if (isWin) {
      audio.victoryTap()
      // 设置获胜者
      app.globalData.colorWinner = app.globalData.colorCurrentTurn
    } else if (isGameOver) {
      // 达到最大次数，游戏结束
      audio.confirmTap()
    } else {
      audio.confirmTap()
    }
  },

  // 继续游戏（轮到对手）
  continueGame() {
    // 播放确认音效
    audio.confirmTap()

    // 切换回合
    const nextPlayer = app.globalData.colorCurrentTurn === 1 ? 2 : 1
    app.globalData.colorCurrentTurn = nextPlayer

    // 返回游戏页面
    wx.redirectTo({
      url: '/pages/color-game/color-game'
    })
  },

  // 前往胜利页面
  goToVictory() {
    // 播放确认音效
    audio.confirmTap()

    // 跳转到胜利页面
    wx.redirectTo({
      url: '/pages/color-victory/color-victory'
    })
  },

  // 前往游戏结束页面（达到最大次数）
  goToGameOver() {
    // 播放确认音效
    audio.confirmTap()

    // 跳转到游戏结束页面
    wx.redirectTo({
      url: '/pages/color-gameover/color-gameover'
    })
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 猜颜色结果',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 猜颜色结果',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
