// 每日挑战 - 猜颜色页面
// 复刻单机猜颜色页面，集成结算弹窗

const app = getApp()
const audio = require('../../utils/audio.js')
const dailyChallenge = require('../../utils/dailyChallenge.js')

// 颜色常量
const COLORS = ['red', 'green', 'blue', 'yellow', 'purple', 'gray']

Page({
  data: {
    // 游戏配置
    colorMode: 'repeat',
    allowRepeat: true,

    // 游戏状态
    currentTurnPlayer: 1,
    isP1: true,
    currentPlayerName: '我',

    // 输入和显示
    playerGuesses: [],
    inputBuffer: [],
    displayColors: [],
    canConfirm: false,
    editIndex: -1,

    // 计时器
    startTime: null,
    elapsedTime: 0,
    formattedTime: '0:00',
    timerInterval: null,

    // 游戏状态锁
    isGameOver: false,

    // 正确答案
    secretColors: [],

    // 结算弹窗状态
    showResultModal: false,
    resultType: '', // 'win' | 'lose'
    resultData: {
      guessCount: 0,
      timeUsed: 0
    }
  },

  onLoad(options) {
    const { allowRepeat, testAnswer } = options || {}

    this.setData({
      colorMode: allowRepeat === 'false' ? 'unique' : 'repeat',
      allowRepeat: allowRepeat !== 'false',
      isP1: true,
      currentPlayerName: '我',
      displayColors: new Array(4).fill(''),
      inputBuffer: [],
      canConfirm: false,
      editIndex: -1,
      isGameOver: false,
      showResultModal: false,
      playerGuesses: []
    })

    // 生成答案
    this.generateSecret()

    // 开始计时
    this.startTimer()
  },

  onUnload() {
    this.stopTimer()
  },

  // 开始计时
  startTimer() {
    const startTime = Date.now()
    this.setData({ startTime })

    const timerInterval = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTime) / 1000)
      const mins = Math.floor(elapsedTime / 60)
      const secs = elapsedTime % 60
      const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`
      this.setData({ elapsedTime, formattedTime })
    }, 1000)

    this.setData({ timerInterval })
  },

  // 停止计时
  stopTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval)
      this.setData({ timerInterval: null })
    }
  },

  // 生成秘密颜色组合
  generateSecret() {
    const { allowRepeat } = this.data
    let secret = []

    if (!allowRepeat) {
      // 不重复模式：随机打乱后取前4个
      const shuffled = [...COLORS].sort(() => Math.random() - 0.5)
      secret = shuffled.slice(0, 4)
    } else {
      // 可重复模式：使用while循环避免递归
      while (true) {
        secret = []
        for (let i = 0; i < 4; i++) {
          secret.push(COLORS[Math.floor(Math.random() * COLORS.length)])
        }

        const colorCount = {}
        secret.forEach(c => {
          colorCount[c] = (colorCount[c] || 0) + 1
        })

        const counts = Object.values(colorCount)
        const maxCount = Math.max(...counts)
        const pairCount = counts.filter(c => c === 2).length

        // 满足条件：没有颜色出现3次及以上，且没有2对重复
        if (maxCount <= 2 && pairCount <= 1) {
          break
        }
      }
    }

    // ⚠️ 关键：统一设置正确答案，避免递归导致的BUG
    this.setData({ secretColors: secret }, () => {
      // 验证答案已正确设置
      if (!this.data.secretColors || this.data.secretColors.length !== 4) {
        console.error('❌ 颜色答案生成错误:', this.data.secretColors)
        // 重新生成
        this.generateSecret()
      } else {
        console.log('✅ 颜色答案已生成:', this.data.secretColors)
      }
    })
  },

  // 计算提示（红点和白点）
  calculateHints(guess, secret) {
    let red = 0
    let white = 0

    const secretCopy = [...secret]
    const guessCopy = [...guess]

    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] === secretCopy[i]) {
        red++
        secretCopy[i] = null
        guessCopy[i] = null
      }
    }

    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] !== null) {
        const index = secretCopy.indexOf(guessCopy[i])
        if (index !== -1) {
          white++
          secretCopy[index] = null
        }
      }
    }

    return { red, white }
  },

  // 更新显示
  updateDisplay() {
    const { inputBuffer } = this.data
    const displayColors = new Array(4).fill('')
    for (let i = 0; i < inputBuffer.length; i++) {
      displayColors[i] = inputBuffer[i]
    }

    this.setData({
      displayColors,
      canConfirm: inputBuffer.length === 4
    })
  },

  // 点击颜色框进入编辑模式
  onColorBoxTap(e) {
    const index = e.currentTarget.dataset.index
    const { inputBuffer } = this.data

    if (index < inputBuffer.length) {
      audio.keyTap()
      this.setData({
        editIndex: index
      })
    }
  },

  // 按下颜色键
  onColorPress(e) {
    audio.keyTap()
    const color = e.currentTarget.dataset.color
    const { inputBuffer, editIndex } = this.data

    if (editIndex >= 0) {
      const newBuffer = [...inputBuffer]
      newBuffer[editIndex] = color
      this.setData({
        inputBuffer: newBuffer,
        editIndex: -1
      }, () => {
        this.updateDisplay()
      })
    } else if (inputBuffer.length < 4) {
      this.setData({
        inputBuffer: [...inputBuffer, color]
      }, () => {
        this.updateDisplay()
      })
    }
  },

  // 清空
  onClear() {
    audio.deleteTap()
    this.setData({
      inputBuffer: [],
      editIndex: -1
    }, () => {
      this.updateDisplay()
    })
  },

  // 确认猜测
  onConfirm() {
    if (this.data.isGameOver) return

    audio.confirmTap()

    const { inputBuffer, secretColors, playerGuesses } = this.data

    const hints = this.calculateHints(inputBuffer, secretColors)
    const isWin = hints.red === 4

    const guessRecord = {
      colors: [...inputBuffer],
      hints: hints,
      redHints: new Array(hints.red).fill(1),
      whiteHints: new Array(hints.white).fill(1),
      isWin: isWin,
      player: 1,
      index: playerGuesses.length + 1
    }

    const newGuesses = [...playerGuesses, guessRecord]

    this.setData({
      playerGuesses: newGuesses,
      inputBuffer: [],
      displayColors: new Array(4).fill(''),
      canConfirm: false,
      editIndex: -1
    })

    const totalGuesses = newGuesses.length
    const MAX_GUESSES = 8
    const isGameOver = !isWin && totalGuesses >= MAX_GUESSES

    if (isWin) {
      this.onWin(totalGuesses)
    } else if (isGameOver) {
      this.onGameOver()
    }
  },

  // 获胜处理
  async onWin(guessCount) {
    if (this.data.isGameOver) return
    this.setData({ isGameOver: true })

    this.stopTimer()

    const { elapsedTime, secretColors } = this.data

    // 先显示结算弹窗
    this.setData({
      showResultModal: true,
      resultType: 'win',
      resultData: {
        guessCount: guessCount,
        timeUsed: elapsedTime,
        secretColors: secretColors
      }
    })

    // 播放胜利音效
    audio.victoryTap()

    // 提交成绩到云端
    try {
      const result = await dailyChallenge.submitDailyResult('success', guessCount, elapsedTime)
      console.log('提交成绩结果:', result)

      if (!result.success) {
        console.error('提交成绩失败:', result.error)
        wx.showToast({
          title: '成绩保存失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('提交成绩异常:', err)
      wx.showToast({
        title: '成绩保存失败',
        icon: 'none'
      })
    }
  },

  // 游戏结束（8次未猜中）
  async onGameOver() {
    if (this.data.isGameOver) return
    this.setData({ isGameOver: true })

    this.stopTimer()

    const { elapsedTime, playerGuesses, secretColors } = this.data

    // 显示失败弹窗
    this.setData({
      showResultModal: true,
      resultType: 'lose',
      resultData: {
        guessCount: playerGuesses.length,
        timeUsed: elapsedTime,
        secretColors: secretColors
      }
    })

    // 提交失败结果
    try {
      await dailyChallenge.submitDailyResult('quit', playerGuesses.length, elapsedTime)
    } catch (err) {
      console.error('提交失败结果异常:', err)
    }
  },

  // 放弃挑战
  onQuitTap() {
    if (this.data.isGameOver) return

    wx.showModal({
      title: '确认放弃',
      content: '放弃后将扣除1次挑战机会，确定要放弃吗？',
      confirmColor: '#ff3c28',
      success: (res) => {
        if (res.confirm) {
          this.quitChallenge()
        }
      }
    })
  },

  // 执行放弃
  async quitChallenge() {
    if (this.data.isGameOver) return
    this.setData({ isGameOver: true })

    this.stopTimer()

    const { elapsedTime, playerGuesses } = this.data

    try {
      await dailyChallenge.submitDailyResult('quit', playerGuesses.length, elapsedTime)
    } catch (err) {
      console.error('放弃挑战失败:', err)
    }

    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 结算弹窗 - 查看排行榜
  goToRank() {
    wx.redirectTo({
      url: '/pages/ranking/ranking'
    })
  },

  // 结算弹窗 - 返回首页
  goHome() {
    console.log('【返回首页】按钮被点击')
    wx.reLaunch({
      url: '/pages/index/index',
      success: () => {
        console.log('【返回首页】成功')
      },
      fail: (err) => {
        console.error('【返回首页】失败:', err)
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 阻止触摸穿透
  preventTouchMove() {
    return
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 每日挑战',
      path: '/pages/daily-color/daily-color',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 每日挑战',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
