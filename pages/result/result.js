// 回合结果页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')
const HistoryManager = require('../../utils/historyManager.js')

Page({
  data: {
    score: 0,             // 匹配数
    isWin: false,         // 是否获胜
    guess: '',            // 猜测的数字
    guessDigits: [],      // 猜测数字的数组
    digitCount: 4,        // 密码位数
    isP1: true,           // 是否是玩家1
    currentTurnPlayer: 1, // 当前回合玩家
    winnerName: '',       // 获胜玩家名称
    winnerIsP1: true,     // 获胜玩家是否是玩家1
    isSaving: false       // 是否正在保存
  },

  onLoad(options) {
    const score = parseInt(options.score || '0')
    const isWin = options.isWin === 'true'
    const guess = options.guess || ''
    const { digitCount, currentTurnPlayer, p1Name, p2Name } = app.globalData
    const isP1 = currentTurnPlayer === 1

    // 当前玩家和获胜玩家信息
    const currentPlayerName = isP1 ? p1Name : p2Name
    const winnerName = isP1 ? p1Name : p2Name

    this.setData({
      score,
      isWin,
      guess,
      guessDigits: guess.split(''),
      digitCount,
      isP1,
      currentTurnPlayer,
      currentPlayerName,
      winnerName,
      winnerIsP1: isP1
    })

    // 如果获胜，保存获胜者信息并播放胜利音效
    if (isWin) {
      app.globalData.winner = currentTurnPlayer
      audio.victoryTap()
    }

    // 保存对局记录（每轮都保存，防止退出丢失数据）
    this.saveGameRecord()
  },

  // 保存对局记录
  saveGameRecord() {
    // 避免重复保存
    if (this.data.isSaving) return
    this.setData({ isSaving: true })

    const {
      currentTurnPlayer,
      isWin
    } = this.data

    const {
      digitCount,
      p1Name,
      p2Name,
      p1Guesses,
      p2Guesses,
      p1Secret,
      p2Secret,
      winner,
      firstSetSecretPlayer,
      firstGuessPlayer,
      isSingleMode,
      singleDigitMode
    } = app.globalData

    // 确定谁先手猜测
    let firstPlayer = 1
    if (firstGuessPlayer) {
      firstPlayer = firstGuessPlayer
    } else if (firstSetSecretPlayer) {
      firstPlayer = firstSetSecretPlayer === 1 ? 2 : 1
    }

    // 将密码字符串转为数组
    const p1CorrectAnswer = p1Secret ? p1Secret.split('').map(Number) : []
    const p2CorrectAnswer = p2Secret ? p2Secret.split('').map(Number) : []

    // 确定游戏状态：如果已分出胜负则为 completed，否则为 ongoing
    const gameStatus = winner ? 'completed' : 'ongoing'

    // 计算总轮次
    const p1GuessCount = p1Guesses ? p1Guesses.length : 0
    const p2GuessCount = p2Guesses ? p2Guesses.length : 0
    const guessCount = p1GuessCount + p2GuessCount

    // 序列化猜测记录："guess:a:b,guess:a:b"
    // 例如："1234:1:0,5678:0:2" 表示 1234猜中1A0B，5678猜中0A2B
    const serializeGuesses = (guesses) => {
      if (!guesses || guesses.length === 0) return ''
      return guesses.map(g => `${g.guess}:${g.a || 0}:${g.b || 0}`).join(',')
    }

    // 计算当前用户是否获胜
    let currentUserWin = false
    if (isSingleMode) {
      // 单人模式：玩家1获胜即当前用户获胜
      currentUserWin = winner === 1
    } else {
      // 本地双人模式：当前回合玩家获胜
      currentUserWin = winner === currentTurnPlayer
    }

    // 构建对局数据（精简字段名）
    // 保留 createTime 字段用于排序
    const recordData = {
      gt: 'number',                    // gameType
      dc: digitCount || 4,             // digitCount
      p1: p1Name,                      // player1Name
      p2: p2Name,                      // player2Name
      w: winner || null,               // winner
      iw: currentUserWin,              // isWin - 当前用户是否获胜
      gs: gameStatus,                  // gameStatus
      gc: guessCount,                  // guessCount
      fp: firstPlayer,                 // firstPlayer
      a1: p1Secret || '',              // answer1 (P1正确答案字符串)
      a2: p2Secret || '',              // answer2 (P2正确答案字符串)
      g1: serializeGuesses(p1Guesses), // guesses1 (P1猜测记录序列化)
      g2: serializeGuesses(p2Guesses), // guesses2 (P2猜测记录序列化)
      sm: isSingleMode || false,       // isSingleMode
      sdm: singleDigitMode || 'repeat', // singleDigitMode
      ts: Date.now(),                  // timestamp (时间戳)
      createTime: new Date()           // 保留创建时间用于排序
    }

    console.log('result页面保存对局记录:', recordData)

    // 单人模式和本地双人模式使用本地存储
    if (isSingleMode || !app.globalData.isOnlineMode) {
      // 使用本地存储
      const recordId = app.globalData.currentRecordId
      if (recordId) {
        // 更新已有记录
        HistoryManager.updateRecord(recordId, recordData)
      } else {
        // 新增记录
        const newRecordId = HistoryManager.addRecord(recordData)
        if (newRecordId) {
          app.globalData.currentRecordId = newRecordId
        }
      }
      this.setData({ isSaving: false })
    } else {
      // 联机模式使用云端存储（保持原有逻辑）
      const recordId = app.globalData.currentRecordId
      if (recordId) {
        // 更新已有记录
        wx.cloud.callFunction({
          name: 'updateRecord',
          data: {
            recordId: recordId,
            recordData: recordData
          },
          success: (res) => {
            console.log('对局记录更新成功', res)
          },
          fail: (err) => {
            console.log('对局记录更新失败', err)
          },
          complete: () => {
            this.setData({ isSaving: false })
          }
        })
      } else {
        // 新增记录
        wx.cloud.callFunction({
          name: 'saveRecord',
          data: {
            recordData: recordData
          },
          success: (res) => {
            console.log('对局记录保存成功', res)
            if (res.result && res.result.recordId) {
              app.globalData.currentRecordId = res.result.recordId
            }
          },
          fail: (err) => {
            console.log('对局记录保存失败', err)
          },
          complete: () => {
            this.setData({ isSaving: false })
          }
        })
      }
    }
  },

  // 下一轮
  nextTurn() {
    const { currentTurnPlayer, isWin } = this.data
    const { p1Name, p2Name, isSingleMode } = app.globalData

    // 单人模式下，如果玩家猜对了，直接结束游戏
    if (isSingleMode && isWin) {
      this.goToVictory()
      return
    }

    // 切换玩家
    const nextPlayer = currentTurnPlayer === 1 ? 2 : 1
    app.globalData.currentTurnPlayer = nextPlayer

    const nextPlayerName = nextPlayer === 1 ? p1Name : p2Name

    // 跳转到过渡页
    wx.redirectTo({
      url: `/pages/intermission/intermission?message=${encodeURIComponent(`轮到 ${nextPlayerName} 猜测`)}&nextPage=game&player=${nextPlayer}`
    })
  },

  // 前往胜利页
  goToVictory() {
    // 播放确认音效和触动反馈
    audio.confirmTap()
    wx.redirectTo({
      url: '/pages/victory/victory'
    })
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
      title: '谁输谁洗碗 - 回合结果',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 回合结果',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
