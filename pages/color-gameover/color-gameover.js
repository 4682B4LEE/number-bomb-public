// 猜颜色游戏结束页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')
const HistoryManager = require('../../utils/historyManager.js')

Page({
  data: {
    secretColors: [],
    totalGuesses: 0,
    gameModeText: ''
  },

  onLoad() {
    // 播放游戏结束音效
    audio.confirmTap()

    const {
      colorSecret,
      colorGuesses,
      colorMode,
      isSingleMode,
      p1Name,
      p2Name
    } = app.globalData

    const totalGuesses = (colorGuesses?.p1?.length || 0) + (colorGuesses?.p2?.length || 0)
    const gameModeText = colorMode === 'unique' ? '颜色不重复' : '颜色可重复'

    this.setData({
      secretColors: colorSecret || [],
      totalGuesses,
      gameModeText
    })

    // 保存对局记录（单人/本地双人模式保存到本地）
    this.saveGameRecord(totalGuesses)
  },

  // 保存对局记录
  saveGameRecord(totalGuesses) {
    const { isSingleMode, p1Name, p2Name, colorMode, colorSecret, colorGuesses } = app.globalData

    // 序列化猜测记录
    // 格式: "color1-color2-color3-color4:red:white"
    const serializeColorGuesses = (guesses) => {
      if (!guesses || !Array.isArray(guesses) || guesses.length === 0) {
        console.log('序列化猜测记录：空数组或无效数据', guesses)
        return ''
      }
      return guesses.map(g => {
        const colors = g.colors?.join('-') || ''
        // 兼容 hints 对象和直接的 red/white 字段
        const red = g.hints?.red ?? g.red ?? 0
        const white = g.hints?.white ?? g.white ?? 0
        return `${colors}:${red}:${white}`
      }).join(',')
    }

    // 调试日志
    console.log('colorGuesses:', colorGuesses)
    console.log('colorGuesses?.p1:', colorGuesses?.p1)
    console.log('colorGuesses?.p2:', colorGuesses?.p2)

    // 构建记录数据
    const recordData = {
      gt: 'color',
      cm: colorMode,
      p1: p1Name,
      p2: isSingleMode ? '系统' : p2Name,
      w: 0, // 0 表示无人获胜（失败）
      iw: false, // 当前用户失败
      gs: 'completed',
      gc: totalGuesses,
      fp: 1,
      sm: isSingleMode,
      cs: colorSecret?.join(',') || '',
      g1: serializeColorGuesses(colorGuesses?.p1),
      g2: serializeColorGuesses(colorGuesses?.p2),
      ts: Date.now()
    }

    console.log('猜颜色失败保存对局记录:', recordData)

    // 单人/本地双人模式保存到本地存储
    if (isSingleMode || !app.globalData.isOnlineMode) {
      HistoryManager.addRecord(recordData)
      console.log('猜颜色失败对局记录已保存到本地')
    }
  },

  // 再来一局
  restartGame() {
    // 播放确认音效
    audio.confirmTap()

    // 重置游戏数据但保留玩家名称和模式
    const { p1Name, p2Name, colorMode, isSingleMode } = app.globalData
    app.globalData.colorSecret = null
    app.globalData.colorGuesses = { p1: [], p2: [] }
    app.globalData.colorCurrentTurn = 1
    app.globalData.colorWinner = null
    app.globalData.p1Name = p1Name
    app.globalData.p2Name = p2Name
    app.globalData.colorMode = colorMode

    // 单人模式直接重新开始游戏，不需要重新选择模式
    if (isSingleMode) {
      wx.redirectTo({
        url: '/pages/color-game/color-game'
      })
    } else {
      // 双人模式返回颜色模式选择页
      wx.redirectTo({
        url: '/pages/color-mode/color-mode'
      })
    }
  },

  // 返回首页
  goHome() {
    // 播放按键音效
    audio.keyTap()

    // 清除所有游戏数据
    app.globalData.colorSecret = null
    app.globalData.colorGuesses = { p1: [], p2: [] }
    app.globalData.colorCurrentTurn = 1
    app.globalData.colorWinner = null
    app.globalData.gameType = null

    // 返回首页
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 游戏结束',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 游戏结束',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
