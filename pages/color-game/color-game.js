// 猜颜色游戏进行页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')

// 颜色常量
const COLORS = ['red', 'green', 'blue', 'yellow', 'purple', 'gray']

Page({
  data: {
    colorMode: 'repeat',     // 颜色模式：repeat(可重复) / unique(不重复)
    currentTurnPlayer: 1,    // 当前回合玩家
    isP1: true,              // 是否是玩家1的回合
    currentPlayerName: '',   // 当前玩家名称
    opponentName: '',        // 对手名称
    playerGuesses: [],       // 当前玩家的猜测历史
    inputBuffer: [],         // 输入缓冲区（颜色数组）
    displayColors: [],       // 显示的颜色数组
    canConfirm: false,       // 是否可以确认
    editIndex: -1,           // 当前编辑的颜色索引，-1表示未编辑
    secretColors: [],        // 【测试用】正确答案
    isSingleMode: false      // 是否为单人模式
  },

  onLoad() {
    this.initGame()
  },

  onShow() {
    this.initGame()
  },

  // 初始化游戏状态
  initGame() {
    const {
      colorMode,
      colorCurrentTurn,
      p1Name,
      p2Name,
      colorGuesses,
      isSingleMode
    } = app.globalData

    const isP1 = colorCurrentTurn === 1
    const currentPlayerName = isP1 ? p1Name : p2Name
    const opponentName = isP1 ? p2Name : p1Name
    // 显示所有玩家的猜测历史（共享）
    const allGuesses = this.getAllGuesses(colorGuesses)

    this.setData({
      colorMode: colorMode || 'repeat',
      currentTurnPlayer: colorCurrentTurn || 1,
      isP1,
      currentPlayerName,
      opponentName,
      playerGuesses: allGuesses,
      displayColors: new Array(4).fill(''),
      inputBuffer: [],
      canConfirm: false,
      editIndex: -1,
      secretColors: app.globalData.colorSecret || [],
      isSingleMode: isSingleMode || false
    })

    // 如果没有秘密颜色，生成一个
    if (!app.globalData.colorSecret) {
      this.generateSecret()
    }
  },

  // 获取所有猜测记录（按时间顺序合并）
  getAllGuesses(colorGuesses) {
    if (!colorGuesses) return []

    const p1Guesses = (colorGuesses.p1 || []).map((g, i) => ({...g, player: 1, index: i}))
    const p2Guesses = (colorGuesses.p2 || []).map((g, i) => ({...g, player: 2, index: i}))

    // 按回合顺序合并（P1和P2交替）
    const allGuesses = []
    const maxLen = Math.max(p1Guesses.length, p2Guesses.length)

    for (let i = 0; i < maxLen; i++) {
      if (i < p1Guesses.length) {
        allGuesses.push(p1Guesses[i])
      }
      if (i < p2Guesses.length) {
        allGuesses.push(p2Guesses[i])
      }
    }

    return this.formatGuesses(allGuesses)
  },

  // 生成秘密颜色组合
  generateSecret() {
    const { colorMode } = this.data
    let secret = []

    if (colorMode === 'unique') {
      // 颜色不重复模式：从6个颜色中随机选4个不重复的
      const shuffled = [...COLORS].sort(() => Math.random() - 0.5)
      secret = shuffled.slice(0, 4)
    } else {
      // 颜色可重复模式：最多只能有1个颜色重复（即最多2个珠子颜色相同）
      // 且不能有2对重复（如 red,red,green,green）
      // 四个珠子里，至少要有3个不同的颜色
      secret = []
      for (let i = 0; i < 4; i++) {
        secret.push(COLORS[Math.floor(Math.random() * COLORS.length)])
      }

      // 检查颜色分布
      const colorCount = {}
      secret.forEach(c => {
        colorCount[c] = (colorCount[c] || 0) + 1
      })

      const counts = Object.values(colorCount)
      const maxCount = Math.max(...counts)
      const pairCount = counts.filter(c => c === 2).length

      // 不满足条件的情况：
      // 1. 有颜色出现3次或4次
      // 2. 有2对重复（如 red,red,green,green）
      if (maxCount > 2 || pairCount > 1) {
        return this.generateSecret()
      }
    }

    app.globalData.colorSecret = secret
    console.log('Secret color:', secret) // 调试用，发布时删除
  },

  // 格式化猜测记录
  formatGuesses(guesses) {
    if (!guesses) return []
    return guesses.map((guess, index) => {
      // 如果已经计算过 hints 则直接使用，否则重新计算
      const hints = guess.hints || this.calculateHints(guess.colors, app.globalData.colorSecret)
      return {
        colors: guess.colors,
        player: guess.player,
        redHints: new Array(hints.red).fill(1),
        whiteHints: new Array(hints.white).fill(1),
        index: index + 1
      }
    })
  },

  // 计算提示（红点和白点）
  calculateHints(guess, secret) {
    let red = 0  // 位置和颜色都对
    let white = 0  // 颜色对位置错

    const secretCopy = [...secret]
    const guessCopy = [...guess]

    // 先计算红点（位置和颜色都对）
    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] === secretCopy[i]) {
        red++
        secretCopy[i] = null
        guessCopy[i] = null
      }
    }

    // 再计算白点（颜色对位置错）
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

    // 只能编辑已输入的颜色
    if (index < inputBuffer.length) {
      // 播放按键音效
      audio.keyTap()
      this.setData({
        editIndex: index
      })
    }
  },

  // 取消编辑模式
  cancelEdit() {
    this.setData({
      editIndex: -1
    })
  },

  // 按下颜色键
  onColorPress(e) {
    // 播放按键音效和触动反馈
    audio.keyTap()
    const color = e.currentTarget.dataset.color
    const { inputBuffer, editIndex } = this.data

    // 注意：不重复模式的限制已取消，允许选择重复颜色

    if (editIndex >= 0) {
      // 编辑模式：替换指定位置的颜色
      const newBuffer = [...inputBuffer]
      newBuffer[editIndex] = color
      this.setData({
        inputBuffer: newBuffer,
        editIndex: -1  // 编辑完成后退出编辑模式
      }, () => {
        this.updateDisplay()
      })
    } else if (inputBuffer.length < 4) {
      // 正常输入模式
      this.setData({
        inputBuffer: [...inputBuffer, color]
      }, () => {
        this.updateDisplay()
      })
    }
  },

  // 删除一位
  onDelete() {
    // 播放删除音效和触动反馈
    audio.deleteTap()
    const { inputBuffer } = this.data
    if (inputBuffer.length > 0) {
      this.setData({
        inputBuffer: inputBuffer.slice(0, -1)
      }, () => {
        this.updateDisplay()
      })
    }
  },

  // 清空
  onClear() {
    // 播放删除音效和触动反馈
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
    // 播放确认音效和触动反馈
    audio.confirmTap()
    const { currentTurnPlayer, inputBuffer } = this.data
    const { colorSecret } = app.globalData

    // 计算提示
    const hints = this.calculateHints(inputBuffer, colorSecret)
    const isWin = hints.red === 4

    // 保存猜测记录
    const guessRecord = {
      colors: [...inputBuffer],
      hints: hints,
      isWin: isWin
    }

    if (!app.globalData.colorGuesses) {
      app.globalData.colorGuesses = { p1: [], p2: [] }
    }

    if (currentTurnPlayer === 1) {
      app.globalData.colorGuesses.p1.push(guessRecord)
    } else {
      app.globalData.colorGuesses.p2.push(guessRecord)
    }

    // 计算总猜测次数
    const colorGuesses = app.globalData.colorGuesses
    const totalGuesses = (colorGuesses.p1?.length || 0) + (colorGuesses.p2?.length || 0)
    const MAX_GUESSES = 8
    const isGameOver = !isWin && totalGuesses >= MAX_GUESSES

    // 如果获胜或游戏结束，跳转到对应页面
    if (isWin) {
      // 设置获胜者
      app.globalData.colorWinner = currentTurnPlayer
      // 播放胜利音效
      audio.victoryTap()
      wx.redirectTo({
        url: '/pages/color-victory/color-victory'
      })
    } else if (isGameOver) {
      // 达到最大次数，游戏结束
      wx.redirectTo({
        url: '/pages/color-gameover/color-gameover'
      })
    } else {
      // 未猜对
      const { isSingleMode } = this.data

      if (isSingleMode) {
        // 单人模式：不切换回合，玩家继续猜
        // 清空输入，刷新页面
        this.setData({
          inputBuffer: [],
          displayColors: new Array(4).fill(''),
          canConfirm: false,
          editIndex: -1,
          playerGuesses: this.getAllGuesses(app.globalData.colorGuesses)
        })
      } else {
        // 双人模式：切换回合
        const nextPlayer = currentTurnPlayer === 1 ? 2 : 1
        app.globalData.colorCurrentTurn = nextPlayer

        // 直接返回游戏页
        wx.redirectTo({
          url: '/pages/color-game/color-game'
        })
      }
    }
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 猜颜色',
      path: '/pages/color-game/color-game',
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
