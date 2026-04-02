// 抛硬币决定先手页面逻辑
const app = getApp()
const audio = require('../../utils/audio.js')

Page({
  data: {
    p1Name: '玩家1',      // 玩家1昵称
    p2Name: '玩家2',      // 玩家2昵称
    isFlipping: false,    // 是否正在抛硬币
    winner: null,         // 获胜者：1=玩家1, 2=玩家2
    isP1Winner: true,     // 是否是玩家1获胜
    rotation: 0           // 硬币旋转角度
  },

  onLoad() {
    // 从全局数据获取玩家昵称
    this.setData({
      p1Name: app.globalData.p1Name || '玩家1',
      p2Name: app.globalData.p2Name || '玩家2'
    })
  },

  // 处理抛硬币
  handleToss() {
    // 如果正在抛硬币，不响应
    if (this.data.isFlipping) return

    // 播放按键音效
    audio.confirmTap()

    // 设置状态为抛硬币中
    this.setData({
      isFlipping: true,
      winner: null
    })

    // 随机决定结果 (1 或 2)，概率 1:1
    const result = Math.random() > 0.5 ? 2 : 1
    const isP1Winner = result === 1

    // 计算旋转角度
    // 基础旋转 3600 度 (10圈)
    const baseRotation = 3600
    // 目标角度：玩家1正面(0度)，玩家2反面(180度)
    const targetAngle = isP1Winner ? 0 : 180
    
    // 累加角度，保证每次都顺着转
    const currentRotation = this.data.rotation
    const newRotation = currentRotation + baseRotation + (targetAngle - (currentRotation % 360))

    // 设置旋转角度，开始动画
    this.setData({ rotation: newRotation })

    // 动画时长 2秒，与 CSS transition 一致
    setTimeout(() => {
      // 保存获胜者信息到全局数据
      app.globalData.currentTurnPlayer = result
      
      this.setData({
        winner: result,
        isP1Winner: isP1Winner,
        isFlipping: false
      })

      // 播放胜利音效
      audio.victoryTap()
    }, 2000)
  },

  // 开始游戏
  startGame() {
    // 播放按键音效
    audio.confirmTap()

    const { isP1Winner, p1Name, p2Name } = this.data
    const firstPlayer = isP1Winner ? 1 : 2
    const firstPlayerName = isP1Winner ? p1Name : p2Name
    const secondPlayer = isP1Winner ? 2 : 1
    const secondPlayerName = isP1Winner ? p2Name : p1Name

    // 清除上一局的猜测历史和记录ID
    app.globalData.p1Guesses = []
    app.globalData.p2Guesses = []
    app.globalData.currentRecordId = null
    app.globalData.winner = null
    // 本地双人模式，设置 isSingleMode 为 false
    app.globalData.isSingleMode = false

    // 保存游戏流程信息到全局数据
    app.globalData.firstSetSecretPlayer = firstPlayer  // 先手设置密码的玩家
    app.globalData.secondSetSecretPlayer = secondPlayer  // 后手设置密码的玩家
    app.globalData.firstGuessPlayer = firstPlayer  // 先手猜密码的玩家

    // 跳转到过渡页，提示先手玩家设置密码
    wx.redirectTo({
      url: `/pages/intermission/intermission?message=${encodeURIComponent(`请 ${firstPlayerName} 设定密码`)}&nextPage=secret&player=${firstPlayer}&nextPlayer=${secondPlayer}&nextPlayerName=${encodeURIComponent(secondPlayerName)}`
    })
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 抛硬币',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 抛硬币',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
