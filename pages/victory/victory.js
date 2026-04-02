// 胜利结算页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')
const HistoryManager = require('../../utils/historyManager.js')

Page({
  data: {
    winner: 1,              // 获胜者
    isP1Winner: true,       // 是否是玩家1获胜
    winnerName: '',         // 获胜者名称
    loserName: '',          // 失败者名称
    winnerGuesses: 0,       // 获胜者猜测次数
    loserGuesses: 0,        // 失败者猜测次数
    secretDigits: [],       // 密码数字数组
    p1Name: '',             // 玩家1名称
    p2Name: '',             // 玩家2名称
    confettiList: [],       // 彩带数据列表
    isUpdating: false       // 是否正在更新记录
  },

  onLoad() {
    this.generateConfetti()
    this.loadGameData()
  },

  // 生成彩带数据
  generateConfetti() {
    const colors = ['confetti-red', 'confetti-blue', 'confetti-gold', 'confetti-green']
    const confettiList = []
    
    // 生成30个彩带，数量更多更随机
    for (let i = 0; i < 30; i++) {
      confettiList.push({
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,           // 随机水平位置 0-100%
        delay: Math.random() * 5,            // 随机延迟 0-5秒
        duration: 3 + Math.random() * 4      // 随机持续时间 3-7秒
      })
    }
    
    this.setData({ confettiList })
  },

  // 加载游戏数据
  loadGameData() {
    const { 
      winner, 
      p1Name, 
      p2Name, 
      p1Guesses, 
      p2Guesses, 
      p1Secret, 
      p2Secret 
    } = app.globalData

    const isP1Winner = winner === 1
    const winnerName = isP1Winner ? p1Name : p2Name
    const loserName = isP1Winner ? p2Name : p1Name
    const winnerGuesses = isP1Winner ? p1Guesses.length : p2Guesses.length
    const loserGuesses = isP1Winner ? p2Guesses.length : p1Guesses.length
    // 显示获胜者破解的密码
    const secret = isP1Winner ? p2Secret : p1Secret

    this.setData({
      winner,
      isP1Winner,
      winnerName,
      loserName,
      winnerGuesses,
      loserGuesses,
      secretDigits: secret.split(''),
      p1Name,
      p2Name
    })

    // 播放胜利音效和强烈震动
    audio.victoryTap()

    // 更新对局记录为已完成状态（result页面已经保存过记录，这里只更新）
    this.updateGameRecord()
  },

  // 更新对局记录为已完成状态
  updateGameRecord() {
    // 避免重复更新
    if (this.data.isUpdating) return
    this.setData({ isUpdating: true })

    const {
      winner,
      p1Name,
      p2Name,
      winnerGuesses,
      loserGuesses
    } = this.data
    const {
      digitCount,
      p1Guesses,
      p2Guesses,
      p1Secret,
      p2Secret,
      gameType,
      // 获取先后手信息
      firstSetSecretPlayer,
      firstGuessPlayer,
      currentRecordId,  // 从result页面传递过来的记录ID
      // 获取单人模式信息
      isSingleMode,
      singleDigitMode
    } = app.globalData

    // 如果没有记录ID，说明result页面没有保存成功，这里新建记录
    if (!currentRecordId) {
      console.log('没有找到记录ID，跳过更新')
      this.setData({ isUpdating: false })
      return
    }

    // 确定谁先手猜测（如果 firstGuessPlayer 存在则使用，否则根据 firstSetSecretPlayer 推断）
    // 规则：先手设置密码的玩家，后手先猜
    let firstPlayer = 1
    if (firstGuessPlayer) {
      firstPlayer = firstGuessPlayer
    } else if (firstSetSecretPlayer) {
      // 如果P1先设置密码，则P2先猜
      firstPlayer = firstSetSecretPlayer === 1 ? 2 : 1
    }

    // 序列化猜测记录
    const serializeGuesses = (guesses) => {
      if (!guesses || guesses.length === 0) return ''
      return guesses.map(g => `${g.guess}:${g.a || 0}:${g.b || 0}`).join(',')
    }

    // 构建对局数据（精简字段名）
    const recordData = {
      gt: gameType || 'number',        // gameType
      dc: digitCount || 4,             // digitCount
      p1: p1Name,                      // player1Name
      p2: p2Name,                      // player2Name
      w: winner,                       // winner
      gs: 'completed',                 // gameStatus
      gc: winnerGuesses + loserGuesses, // guessCount
      fp: firstPlayer,                 // firstPlayer
      a1: p1Secret || '',              // answer1
      a2: p2Secret || '',              // answer2
      g1: serializeGuesses(p1Guesses), // guesses1
      g2: serializeGuesses(p2Guesses), // guesses2
      sm: isSingleMode || false,       // isSingleMode
      sdm: singleDigitMode || 'repeat', // singleDigitMode
      ts: Date.now(),                  // timestamp
      createTime: new Date()           // 保留创建时间用于排序
    }

    console.log('========== 更新对局记录为已完成 ==========')
    console.log('recordId:', currentRecordId)
    console.log('recordData:', JSON.stringify(recordData, null, 2))

    // 单人模式和本地双人模式使用本地存储
    if (isSingleMode || !app.globalData.isOnlineMode) {
      // 使用本地存储更新
      HistoryManager.updateRecord(currentRecordId, recordData)
      console.log('本地对局记录已更新为已完成')
      // 清除记录ID，防止重复更新
      app.globalData.currentRecordId = null
      this.setData({ isUpdating: false })
    } else {
      // 联机模式使用云端存储（保持原有逻辑）
      wx.cloud.callFunction({
        name: 'updateRecord',
        data: {
          recordId: currentRecordId,
          recordData: recordData
        },
        success: (res) => {
          console.log('对局记录更新成功:', res)
          // 清除记录ID，防止重复更新
          app.globalData.currentRecordId = null
        },
        fail: (err) => {
          console.error('对局记录更新失败:', err)
        },
        complete: () => {
          this.setData({ isUpdating: false })
        }
      })
    }
  },

  // 切换到玩家1（调试用）
  switchToP1() {
    this.setData({ 
      isP1Winner: true,
      winner: 1,
      winnerName: this.data.p1Name,
      loserName: this.data.p2Name
    })
    this.generateConfetti()
  },

  // 切换到玩家2（调试用）
  switchToP2() {
    this.setData({ 
      isP1Winner: false,
      winner: 2,
      winnerName: this.data.p2Name,
      loserName: this.data.p1Name
    })
    this.generateConfetti()
  },

  // 再玩一局
  restartGame() {
    // 播放按键音效和触动反馈
    audio.keyTap()

    // 重置游戏数据但保留玩家名称和游戏设置
    app.globalData.p1Secret = ''
    app.globalData.p2Secret = ''
    app.globalData.p1Guesses = []
    app.globalData.p2Guesses = []
    app.globalData.currentTurnPlayer = 1
    app.globalData.winner = null
    app.globalData.currentRecordId = null  // 清除记录ID
    // 清除抛硬币相关数据
    app.globalData.firstSetSecretPlayer = null
    app.globalData.secondSetSecretPlayer = null
    app.globalData.firstGuessPlayer = null

    // 根据当前游戏类型决定跳转到哪个页面
    const { gameType, isSingleMode } = app.globalData
    
    if (gameType === 'color') {
      // 猜颜色游戏
      // 重置猜颜色数据
      app.globalData.colorSecret = null
      app.globalData.p1ColorSecret = null
      app.globalData.p2ColorSecret = null
      app.globalData.colorGuesses = { p1: [], p2: [] }
      app.globalData.colorCurrentTurn = 1
      app.globalData.colorWinner = null
      
      if (isSingleMode) {
        // 单人模式直接开始游戏
        wx.redirectTo({
          url: '/pages/color-game/color-game'
        })
      } else {
        // 双人模式跳转到抛硬币决定先手
        wx.redirectTo({
          url: '/pages/coin/coin?type=color'
        })
      }
    } else {
      // 猜数字游戏
      if (isSingleMode) {
        // 单人模式直接开始游戏
        wx.redirectTo({
          url: '/pages/game/game'
        })
      } else {
        // 双人模式跳转到抛硬币决定先手
        wx.redirectTo({
          url: '/pages/coin/coin'
        })
      }
    }
  },

  // 返回首页
  goHome() {
    // 播放按键音效和触动反馈
    audio.keyTap()
    // 重置所有游戏数据
    app.globalData.digitCount = 4
    app.globalData.p1Secret = ''
    app.globalData.p2Secret = ''
    app.globalData.p1Guesses = []
    app.globalData.p2Guesses = []
    app.globalData.currentTurnPlayer = 1
    app.globalData.winner = null
    app.globalData.currentRecordId = null  // 清除记录ID

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
