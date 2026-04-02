// 游戏进行页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')
const HistoryManager = require('../../utils/historyManager.js')

Page({
  data: {
    digitCount: 4,           // 密码位数
    currentTurnPlayer: 1,    // 当前回合玩家
    isP1: true,              // 是否是玩家1的回合
    currentPlayerName: '',   // 当前玩家名称
    opponentName: '',        // 对手名称
    playerGuesses: [],       // 当前玩家的猜测历史（全部）

    inputBuffer: '',         // 输入缓冲区
    displayDigits: [],       // 显示的数字数组
    canConfirm: false,       // 是否可以确认
    editIndex: -1,           // 当前编辑的数字索引，-1表示未编辑
    isEditMode: false,       // 是否处于手动编辑模式（用于区分自动跳转和手动点击）
    isSingleMode: false,     // 是否为单人模式
    isGameOver: false,       // 游戏是否结束
    showWinModal: false,     // 是否显示胜利弹窗
    hintMode: false,         // 是否开启提示模式
    scrollTop: 0,            // 滚动位置
    confirmedDigits: [],     // 已确认的正确数字（提示模式自动填写）
    correctAnswer: ''        // 正确答案（用于胜利弹窗显示）
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
      digitCount,
      currentTurnPlayer,
      p1Name,
      p2Name,
      p1Guesses,
      p2Guesses,
      isSingleMode
    } = app.globalData

    const isP1 = currentTurnPlayer === 1
    const currentPlayerName = isP1 ? p1Name : p2Name
    const opponentName = isP1 ? p2Name : p1Name
    // 显示当前玩家自己的猜测历史
    const playerGuesses = isP1 ? p1Guesses : p2Guesses

    // 计算已确认的正确数字（用于提示模式自动填写）
    const confirmedDigits = this.calculateConfirmedDigits(playerGuesses, digitCount)

    // 格式化猜测记录
    const formattedGuesses = this.formatGuesses(playerGuesses)

    this.setData({
      digitCount,
      currentTurnPlayer,
      isP1,
      currentPlayerName,
      opponentName,
      playerGuesses: formattedGuesses,
      displayDigits: new Array(digitCount).fill(''),
      inputBuffer: '',
      canConfirm: false,
      isSingleMode: isSingleMode || false,
      isGameOver: false,
      showWinModal: false,
      hintMode: false,
      confirmedDigits: confirmedDigits
    })
  },

  // 计算已确认的正确数字（位置和值都正确）
  calculateConfirmedDigits(guesses, digitCount) {
    const confirmed = new Array(digitCount).fill(null)
    if (!guesses || guesses.length === 0) return confirmed

    const { p2Secret } = app.globalData
    if (!p2Secret) return confirmed

    // 遍历所有猜测记录，找出位置正确的数字
    guesses.forEach(guess => {
      const guessStr = guess.guess
      for (let i = 0; i < guessStr.length && i < digitCount; i++) {
        // 如果这个数字在这个位置与秘密数字相同，则确认
        if (guessStr[i] === p2Secret[i]) {
          confirmed[i] = guessStr[i]
        }
      }
    })

    return confirmed
  },

  // 格式化猜测记录
  formatGuesses(guesses) {
    if (!guesses) return []
    // 倒序排列，最新的猜测显示在最上面
    const reversedGuesses = [...guesses].reverse()
    return reversedGuesses.map((guess, index) => {
      // 计算每个位置的提示（A=正确，B=数字对位置错，X=不对）
      const hints = this.calculatePositionHints(guess)
      return {
        digits: guess.guess.split(''),
        score: guess.score,
        a: guess.a,
        b: guess.b,
        hints: hints,
        displayIndex: guesses.length - index // 显示的序号（从1开始）
      }
    })
  },

  // 计算每个位置的提示标记
  calculatePositionHints(guessRecord) {
    if (!guessRecord || !guessRecord.guess) return []
    const { p2Secret } = app.globalData
    if (!p2Secret) return []

    const guess = guessRecord.guess
    const secret = p2Secret
    const hints = []

    for (let i = 0; i < guess.length; i++) {
      if (i < secret.length && guess[i] === secret[i]) {
        hints.push('A')  // 位置和数字都正确
      } else if (secret.includes(guess[i])) {
        hints.push('B')  // 数字正确但位置错误
      } else {
        hints.push('X')  // 不正确
      }
    }

    return hints
  },

  // 更新显示
  updateDisplay() {
    const { inputBuffer, digitCount } = this.data
    const displayDigits = new Array(digitCount).fill('')
    for (let i = 0; i < inputBuffer.length; i++) {
      displayDigits[i] = inputBuffer[i]
    }

    this.setData({
      displayDigits,
      canConfirm: inputBuffer.length === digitCount
    })
  },

  // 点击数字框进入编辑模式或设置输入位置
  onDigitTap(e) {
    const index = e.currentTarget.dataset.index
    const { inputBuffer, digitCount, confirmedDigits, hintMode, displayDigits } = this.data

    // 播放按键音效
    audio.keyTap()

    // 如果该位置已有确认的数字（提示模式），不能编辑
    if (hintMode && confirmedDigits[index] !== null) {
      wx.showToast({
        title: '该数字已确认',
        icon: 'none',
        duration: 1000
      })
      return
    }

    // 提示模式下：点击非固定数字位置可以直接切换编辑位置
    if (hintMode) {
      // 检查该位置是否有已输入的数字（非确认）
      if (displayDigits[index] !== '' && confirmedDigits[index] === null) {
        // 该位置有已输入的非确认数字，进入手动编辑模式
        this.setData({
          editIndex: index,
          isEditMode: true
        })
      } else if (displayDigits[index] === '' && confirmedDigits[index] === null) {
        // 该位置是空的，设置输入位置（手动编辑模式）
        this.setData({
          editIndex: index,
          isEditMode: true
        })
      }
      return
    }

    // 非提示模式：原有逻辑
    // 如果该位置已有输入的数字，进入编辑模式
    if (index < inputBuffer.length) {
      this.setData({
        editIndex: index,
        isEditMode: true
      })
    } else {
      // 点击的是空白位置，设置输入位置为当前索引
      // 但只有在前面位置都已填满的情况下才能设置
      if (index === inputBuffer.length) {
        this.setData({
          editIndex: index,
          isEditMode: true
        })
      } else {
        // 前面还有空位，提示用户按顺序输入
        wx.showToast({
          title: '请按顺序输入',
          icon: 'none',
          duration: 1000
        })
      }
    }
  },

  // 取消编辑模式
  cancelEdit() {
    this.setData({
      editIndex: -1,
      isEditMode: false
    })
  },

  // 按下数字键
  onKeyPress(e) {
    // 播放按键音效和触动反馈
    audio.keyTap()
    const key = e.currentTarget.dataset.key
    const { inputBuffer, digitCount, editIndex, confirmedDigits, hintMode, displayDigits } = this.data

    // 提示模式：在指定位置或从左到右填入数字
    if (hintMode) {
      // 确定要填入的位置
      let fillIndex = editIndex

      // 如果没有指定编辑位置，从左到右找到第一个非确认的空位
      if (fillIndex < 0 || fillIndex >= digitCount || confirmedDigits[fillIndex] !== null) {
        fillIndex = 0
        while (fillIndex < digitCount) {
          // 如果该位置已确认，跳过
          if (confirmedDigits[fillIndex] !== null) {
            fillIndex++
            continue
          }
          // 如果该位置已有输入的数字，继续找下一个（除非这是编辑模式）
          if (displayDigits[fillIndex] !== '' && editIndex < 0) {
            fillIndex++
            continue
          }
          // 找到空位，填入数字
          break
        }
      }

      if (fillIndex < digitCount && confirmedDigits[fillIndex] === null) {
        // 在找到的位置填入数字
        const newDisplayDigits = [...displayDigits]
        newDisplayDigits[fillIndex] = key

        // 构建新的 inputBuffer（只包含非确认的数字，按位置顺序）
        let newInputBuffer = ''
        for (let i = 0; i < digitCount; i++) {
          if (confirmedDigits[i] === null && newDisplayDigits[i] !== '') {
            newInputBuffer += newDisplayDigits[i]
          }
        }

        // 检查是否所有位置都已填满
        const isAllFilled = newDisplayDigits.every((digit, idx) => digit !== '' || confirmedDigits[idx] !== null)

        // 计算下一个可编辑位置（如果还有空位）
        let nextEditIndex = -1
        if (!isAllFilled) {
          for (let i = fillIndex + 1; i < digitCount; i++) {
            if (confirmedDigits[i] === null && newDisplayDigits[i] === '') {
              nextEditIndex = i
              break
            }
          }
        }

        this.setData({
          displayDigits: newDisplayDigits,
          inputBuffer: newInputBuffer,
          canConfirm: isAllFilled,
          editIndex: nextEditIndex,
          isEditMode: false  // 自动跳转时不显示编辑指示器
        })
      }
      return
    }

    // 非提示模式：原有逻辑
    if (editIndex >= 0) {
      // 编辑模式：在指定位置插入或替换数字
      let newBuffer
      if (editIndex < inputBuffer.length) {
        // 替换已有数字
        newBuffer = inputBuffer.substring(0, editIndex) + key + inputBuffer.substring(editIndex + 1)
      } else {
        // 在末尾添加
        newBuffer = inputBuffer + key
      }

      this.setData({
        inputBuffer: newBuffer,
        editIndex: -1
      }, () => {
        this.updateDisplay()
      })
    } else if (inputBuffer.length < digitCount) {
      // 正常输入模式
      this.setData({
        inputBuffer: inputBuffer + key
      }, () => {
        this.updateDisplay()
      })
    }
  },

  // 删除一位
  onDelete() {
    // 播放删除音效和触动反馈
    audio.deleteTap()
    const { inputBuffer, editIndex, confirmedDigits, hintMode, displayDigits, digitCount } = this.data

    // 提示模式：从右到左找到第一个非确认的数字删除
    if (hintMode) {
      // 找到最右边可以删除的位置（非确认且有数字）
      let deleteIndex = digitCount - 1
      while (deleteIndex >= 0) {
        // 如果该位置已确认，跳过
        if (confirmedDigits[deleteIndex] !== null) {
          deleteIndex--
          continue
        }
        // 如果该位置有数字，删除它
        if (displayDigits[deleteIndex] !== '') {
          break
        }
        deleteIndex--
      }

      if (deleteIndex >= 0) {
        // 删除找到的位置的数字
        const newDisplayDigits = [...displayDigits]
        newDisplayDigits[deleteIndex] = ''

        // 构建新的 inputBuffer
        let newInputBuffer = ''
        for (let i = 0; i < digitCount; i++) {
          if (confirmedDigits[i] === null && newDisplayDigits[i] !== '') {
            newInputBuffer += newDisplayDigits[i]
          }
        }

        this.setData({
          displayDigits: newDisplayDigits,
          inputBuffer: newInputBuffer,
          canConfirm: newDisplayDigits.every((digit, idx) => digit !== '' || confirmedDigits[idx] !== null)
        })
      }
      return
    }

    // 非提示模式：原有逻辑
    if (editIndex >= 0 && editIndex < inputBuffer.length) {
      // 编辑模式下删除指定位置的数字
      const newBuffer = inputBuffer.substring(0, editIndex) + inputBuffer.substring(editIndex + 1)
      this.setData({
        inputBuffer: newBuffer,
        editIndex: -1
      }, () => {
        this.updateDisplay()
      })
    } else if (inputBuffer.length > 0) {
      // 正常模式下删除最后一位
      this.setData({
        inputBuffer: inputBuffer.slice(0, -1),
        editIndex: -1
      }, () => {
        this.updateDisplay()
      })
    }
  },

  // 清空
  onClear() {
    // 播放删除音效和触动反馈
    audio.deleteTap()
    const { hintMode, confirmedDigits, digitCount } = this.data

    // 提示模式：只清空非确认的数字
    if (hintMode) {
      const newDisplayDigits = [...confirmedDigits].map(digit => digit !== null ? digit : '')
      this.setData({
        displayDigits: newDisplayDigits,
        inputBuffer: '',
        canConfirm: false
      })
      return
    }

    // 非提示模式：全部清空
    this.setData({
      inputBuffer: ''
    }, () => {
      this.updateDisplay()
    })
  },

  // 计算A/B提示
  // a: 位置和数字都正确
  // b: 数字正确但位置错误
  calculateHints(secret, guess) {
    let a = 0  // 位置和数字都正确
    let b = 0  // 数字正确但位置错误
    const secretArr = secret.split('')
    const guessArr = guess.split('')
    const secretUsed = new Array(secretArr.length).fill(false)
    const guessUsed = new Array(guessArr.length).fill(false)

    // 第一轮：计算A（位置和数字都正确）
    for (let i = 0; i < secretArr.length; i++) {
      if (secretArr[i] === guessArr[i]) {
        a++
        secretUsed[i] = true
        guessUsed[i] = true
      }
    }

    // 第二轮：计算B（数字正确但位置错误）
    for (let i = 0; i < guessArr.length; i++) {
      if (!guessUsed[i]) {
        for (let j = 0; j < secretArr.length; j++) {
          if (!secretUsed[j] && secretArr[j] === guessArr[i]) {
            b++
            secretUsed[j] = true
            guessUsed[i] = true
            break
          }
        }
      }
    }

    return { a, b }
  },

  // 确认猜测
  onConfirm() {
    // 播放确认音效和触动反馈
    audio.confirmTap()
    const { currentTurnPlayer, inputBuffer, digitCount, isSingleMode, hintMode, displayDigits } = this.data
    const { p1Secret, p2Secret } = app.globalData

    // 获取对手的密码
    const opponentSecret = currentTurnPlayer === 1 ? p2Secret : p1Secret

    // 构建完整的猜测数字
    // 提示模式下，从 displayDigits 获取完整数字；非提示模式下，使用 inputBuffer
    const fullGuess = hintMode ? displayDigits.join('') : inputBuffer

    // 计算A/B提示
    const hints = this.calculateHints(opponentSecret, fullGuess)
    const isWin = hints.a === digitCount

    // 保存猜测记录
    const guessRecord = {
      guess: fullGuess,     // 使用完整的猜测数字
      a: hints.a,           // 位置和数字都正确
      b: hints.b,           // 数字正确但位置错误
      score: hints.a,       // 兼容旧数据
      isWin: isWin
    }

    if (currentTurnPlayer === 1) {
      app.globalData.p1Guesses.push(guessRecord)
    } else {
      app.globalData.p2Guesses.push(guessRecord)
    }

    // 单人模式：猜对后直接在页面显示胜利弹窗
    if (isSingleMode && isWin) {
      // 保存获胜者信息
      app.globalData.winner = currentTurnPlayer
      // 播放胜利音效
      audio.victoryTap()
      // 保存对局记录
      this.saveSingleModeRecord()
      // 格式化猜测记录
      const formattedGuesses = this.formatGuesses(app.globalData.p1Guesses)
      // 显示胜利弹窗
      this.setData({
        isGameOver: true,
        showWinModal: true,
        // 更新猜测历史显示
        playerGuesses: formattedGuesses,
        // 设置正确答案
        correctAnswer: opponentSecret
      })
      return
    }

    // 单人模式：没猜对，继续猜测，更新页面显示
    if (isSingleMode) {
      const { hintMode } = this.data
      const { p1Guesses } = app.globalData

      // 重新计算已确认的数字
      const confirmedDigits = this.calculateConfirmedDigits(p1Guesses, digitCount)

      // 如果提示模式开启，自动填写已猜对的数字
      let newDisplayDigits = new Array(digitCount).fill('')
      let newInputBuffer = ''

      if (hintMode) {
        for (let i = 0; i < digitCount; i++) {
          if (confirmedDigits[i] !== null) {
            newDisplayDigits[i] = confirmedDigits[i]
            newInputBuffer += confirmedDigits[i]
          }
        }
      }

      // 格式化猜测记录
      const formattedGuesses = this.formatGuesses(p1Guesses)

      this.setData({
        inputBuffer: newInputBuffer,
        displayDigits: newDisplayDigits,
        canConfirm: newInputBuffer.length === digitCount,
        playerGuesses: formattedGuesses,
        confirmedDigits: confirmedDigits,
        editIndex: -1
      })
      return
    }

    // 本地双人模式：跳转到结果页
    wx.redirectTo({
      url: `/pages/result/result?score=${hints.a}&isWin=${isWin}&guess=${inputBuffer}`
    })
  },

  // 保存单人模式对局记录
  saveSingleModeRecord() {
    const {
      digitCount,
      p1Name,
      p2Name,
      p1Guesses,
      p2Secret,
      winner,
      singleDigitMode
    } = app.globalData

    // 序列化猜测记录
    const serializeGuesses = (guesses) => {
      if (!guesses || guesses.length === 0) return ''
      return guesses.map(g => `${g.guess}:${g.a || 0}:${g.b || 0}`).join(',')
    }

    // 计算总轮次
    const guessCount = p1Guesses ? p1Guesses.length : 0

    // 构建对局数据（精简字段名）
    const recordData = {
      gt: 'number',                    // gameType
      dc: digitCount || 4,             // digitCount
      p1: p1Name,                      // player1Name
      p2: p2Name,                      // player2Name
      w: winner,                       // winner
      gs: 'completed',                 // gameStatus
      gc: guessCount,                  // guessCount
      fp: 1,                           // firstPlayer
      a1: '',                          // answer1 (P1无密码)
      a2: p2Secret || '',              // answer2
      g1: serializeGuesses(p1Guesses), // guesses1
      g2: '',                          // guesses2 (P2无猜测)
      sm: true,                        // isSingleMode
      sdm: singleDigitMode || 'repeat', // singleDigitMode
      ts: Date.now(),                  // timestamp
      createTime: new Date()           // 保留创建时间用于排序
    }

    console.log('单人模式保存对局记录:', recordData)

    // 单人模式保存到本地存储
    const newRecordId = HistoryManager.addRecord(recordData)
    if (newRecordId) {
      app.globalData.currentRecordId = newRecordId
      console.log('单人模式对局记录已保存到本地:', newRecordId)
    }
  },

  // 关闭胜利弹窗
  closeWinModal() {
    this.setData({ showWinModal: false })
  },

  // 切换提示模式
  toggleHintMode() {
    // 播放按键音效
    audio.keyTap()

    const { hintMode, digitCount } = this.data
    const newHintMode = !hintMode

    if (newHintMode) {
      // 开启提示模式：重新计算并自动填写已确认的数字
      const { p1Guesses } = app.globalData
      const confirmedDigits = this.calculateConfirmedDigits(p1Guesses, digitCount)

      // 构建显示的数字数组（带位置信息）
      const displayDigits = new Array(digitCount).fill('')
      let autoFillBuffer = ''
      for (let i = 0; i < digitCount; i++) {
        if (confirmedDigits[i] !== null) {
          displayDigits[i] = confirmedDigits[i]
          autoFillBuffer += confirmedDigits[i]
        }
      }

      this.setData({
        hintMode: true,
        confirmedDigits: confirmedDigits,
        displayDigits: displayDigits,
        inputBuffer: autoFillBuffer,
        canConfirm: autoFillBuffer.length === digitCount
      }, () => {
        wx.showToast({
          title: '提示模式已开启',
          icon: 'none',
          duration: 1500
        })
      })
    } else {
      // 关闭提示模式：清空输入
      const { digitCount } = this.data
      this.setData({
        hintMode: false,
        displayDigits: new Array(digitCount).fill(''),
        inputBuffer: '',
        canConfirm: false
      }, () => {
        wx.showToast({
          title: '提示模式已关闭',
          icon: 'none',
          duration: 1500
        })
      })
    }
  },

  // 返回首页
  goHome() {
    // 播放按键音效
    audio.keyTap()
    // 重置游戏数据
    app.globalData.digitCount = 4
    app.globalData.p1Secret = ''
    app.globalData.p2Secret = ''
    app.globalData.p1Guesses = []
    app.globalData.p2Guesses = []
    app.globalData.currentTurnPlayer = 1
    app.globalData.winner = null
    app.globalData.currentRecordId = null
    app.globalData.isSingleMode = false
    // 返回首页
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  // 再来一局（单人模式）
  playAgain() {
    // 播放确认音效
    audio.confirmTap()

    // 清空游戏模式记录缓存
    app.globalData.p1Guesses = []
    app.globalData.p2Guesses = []
    app.globalData.winner = null
    app.globalData.currentRecordId = null
    app.globalData.p2Secret = null
    app.globalData.p1Secret = null

    // 返回首页的位数选择页面
    const pages = getCurrentPages()
    if (pages.length > 1) {
      // 有上一页，使用 navigateBack
      wx.navigateBack({
        delta: 1,
        success: () => {
          // 通知首页重置为难度选择状态
          const indexPage = pages[0]
          if (indexPage && indexPage.resetToDifficultySelect) {
            indexPage.resetToDifficultySelect()
          }
        }
      })
    } else {
      // 没有上一页，使用 redirectTo 返回首页
      wx.redirectTo({
        url: '/pages/index/index'
      })
    }
  },

  // 生成随机密码
  generateRandomSecret(digitCount) {
    let secret = ''
    for (let i = 0; i < digitCount; i++) {
      secret += Math.floor(Math.random() * 10)
    }
    return secret
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 猜数字',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 猜数字',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
