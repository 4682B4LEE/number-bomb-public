// 猜颜色胜利页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')
const HistoryManager = require('../../utils/historyManager.js')

Page({
  data: {
    winnerName: '',
    secretColors: [],
    guessCount: 0,
    gameModeText: '',
    isP1: true
  },

  onLoad() {
    // 播放胜利音效
    audio.victoryTap()

    const {
      colorWinner,
      p1Name,
      p2Name,
      colorSecret,
      colorGuesses,
      colorMode,
      // 获取先后手信息
      colorFirstPlayer
    } = app.globalData

    const winnerName = colorWinner === 1 ? p1Name : p2Name
    const guessCount = colorWinner === 1
      ? (colorGuesses?.p1?.length || 0)
      : (colorGuesses?.p2?.length || 0)
    const gameModeText = colorMode === 'unique' ? '颜色不重复' : '颜色可重复'
    const isP1 = colorWinner === 1

    this.setData({
      winnerName,
      secretColors: colorSecret || [],
      guessCount,
      gameModeText,
      isP1
    })

    // 保存对局记录
    this.saveGameRecord()
  },

  // 保存对局记录
  saveGameRecord() {
    const {
      colorWinner,
      p1Name,
      p2Name,
      colorSecret,
      colorGuesses,
      colorMode,
      // 获取先后手信息
      colorFirstPlayer,
      // 获取是否为单人模式
      isSingleMode
    } = app.globalData

    const winnerGuesses = colorWinner === 1
      ? (colorGuesses?.p1?.length || 0)
      : (colorGuesses?.p2?.length || 0)
    const loserGuesses = colorWinner === 1
      ? (colorGuesses?.p2?.length || 0)
      : (colorGuesses?.p1?.length || 0)

    // 确定谁先手（如果没有则默认P1先手）
    const firstPlayer = colorFirstPlayer || 1

    // 计算当前用户是否获胜
    // 单人模式：玩家1获胜即当前用户获胜
    // 本地双人模式：当前用户视角，获胜者即当前用户
    const currentUserWin = isSingleMode ? colorWinner === 1 : true

    // 序列化猜颜色记录
    const serializeColorGuesses = (guesses) => {
      if (!guesses || guesses.length === 0) return ''
      return guesses.map(g => {
        // 猜颜色记录的格式：colors 是颜色数组，hints 包含 red 和 white
        const colors = g.colors || g.guess || []
        const a = g.hints?.red ?? g.a ?? 0
        const b = g.hints?.white ?? g.b ?? 0
        return `${colors.join('-')}:${a}:${b}`
      }).join(',')
    }

    // 构建对局数据（精简字段名）
    const recordData = {
      gt: 'color',                     // gameType
      cm: colorMode || 'repeat',       // colorMode
      p1: p1Name,                      // player1Name
      p2: p2Name,                      // player2Name
      w: colorWinner,                  // winner
      iw: currentUserWin,              // isWin - 当前用户是否获胜
      gc: winnerGuesses + loserGuesses, // guessCount
      fp: firstPlayer,                 // firstPlayer
      cs: colorSecret?.join(',') || '', // colorSecret 统一为字符串格式
      g1: serializeColorGuesses(colorGuesses?.p1 || []), // guesses1
      g2: serializeColorGuesses(colorGuesses?.p2 || []), // guesses2
      sm: isSingleMode || false,       // isSingleMode
      ts: Date.now(),                  // timestamp
      createTime: new Date()           // 保留创建时间用于排序
    }

    console.log('保存猜颜色对局记录:', recordData)

    // 单人模式和本地双人模式使用本地存储
    if (isSingleMode || !app.globalData.isOnlineMode) {
      // 使用本地存储
      HistoryManager.addRecord(recordData)
      console.log('猜颜色对局记录已保存到本地')
    } else {
      // 联机模式使用云端存储（保持原有逻辑）
      wx.cloud.callFunction({
        name: 'saveRecord',
        data: {
          recordData: recordData
        },
        success: (res) => {
          console.log('对局记录保存成功', res)
        },
        fail: (err) => {
          console.log('对局记录保存失败', err)
          wx.showToast({
            title: '记录保存失败',
            icon: 'none'
          })
        }
      })
    }
  },

  // 再来一局
  restartGame() {
    // 播放确认音效
    audio.confirmTap()

    // 重置游戏数据但保留玩家名称
    const { p1Name, p2Name, colorMode, isSingleMode } = app.globalData
    app.globalData.colorSecret = null
    app.globalData.p1ColorSecret = null
    app.globalData.p2ColorSecret = null
    app.globalData.colorGuesses = { p1: [], p2: [] }
    app.globalData.colorCurrentTurn = 1
    app.globalData.colorWinner = null
    app.globalData.colorFirstPlayer = null
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
    app.globalData.p1ColorSecret = null
    app.globalData.p2ColorSecret = null
    app.globalData.colorGuesses = { p1: [], p2: [] }
    app.globalData.colorCurrentTurn = 1
    app.globalData.colorWinner = null
    app.globalData.colorFirstPlayer = null
    app.globalData.gameType = null

    // 返回首页
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 胜利',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 胜利',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
