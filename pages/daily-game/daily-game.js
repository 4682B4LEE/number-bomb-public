// 每日挑战 - 猜数字页面
// 复刻单机猜数字页面 (pages/game/game)

const app = getApp()
const audio = require('../../utils/audio.js')
const dailyChallenge = require('../../utils/dailyChallenge.js')

Page({
  data: {
    digitCount: 4,           // 密码位数
    currentTurnPlayer: 1,    // 当前回合玩家（单人模式固定为1）
    isP1: true,              // 是否是玩家1的回合
    currentPlayerName: '我', // 当前玩家名称
    opponentName: '',        // 对手名称
    
    // ⚠️ 分离原始数据和显示数据
    rawGuesses: [],          // 原始猜测记录（用于计算和保存）
    playerGuesses: [],       // 格式化后的猜测历史（用于显示）

    inputBuffer: '',         // 输入缓冲区
    displayDigits: [],       // 显示的数字数组
    canConfirm: false,       // 是否可以确认
    editIndex: -1,           // 当前编辑的数字索引，-1表示未编辑
    isEditMode: false,       // 是否处于手动编辑模式（用于区分自动跳转和手动点击）
    isSingleMode: true,      // 是否为单人模式（每日挑战固定为true）
    isGameOver: false,       // 游戏是否结束
    showWinModal: false,     // 是否显示胜利弹窗
    hintMode: false,         // 是否开启提示模式
    scrollTop: 0,            // 滚动位置
    confirmedDigits: [],     // 已确认的正确数字（提示模式自动填写）
    correctAnswer: '',       // 正确答案（用于胜利弹窗显示）

    // 计时器
    startTime: null,         // 游戏开始时间
    timeUsed: 0,             // 已用时间（秒）
    timerInterval: null,     // 计时器

    // 游戏配置
    allowRepeat: true,       // 是否允许重复数字

    // 游戏状态锁
    isSubmitting: false,     // 是否正在提交成绩（防止重复提交）
    
    // 猜测历史展开状态
    showAllHistory: false    // 是否显示全部猜测历史
  },

  onLoad(options) {
    // 从页面参数获取配置
    const { allowRepeat, digitCount, testAnswer } = options || {}

    // 获取位数，支持4位或5位，默认为4位
    const count = parseInt(digitCount) || 4

    this.setData({
      digitCount: count,
      allowRepeat: allowRepeat !== 'false',
      isP1: true,
      currentPlayerName: '我',
      isSingleMode: true,
      displayDigits: new Array(count).fill(''),
      inputBuffer: '',
      canConfirm: false,
      editIndex: -1,
      isEditMode: false,
      isGameOver: false,
      showWinModal: false,
      hintMode: false,
      confirmedDigits: new Array(count).fill(null),
      rawGuesses: [],          // 原始猜测记录
      playerGuesses: [],       // 格式化后的猜测历史
      isSubmitting: false
    })

    // 生成答案
    this.generateSecret()

    // 启动计时器
    this.startTimer()
  },

  onUnload() {
    // 清理计时器
    this.stopTimer()
  },

  // 页面显示时更新计时（处理切屏回来后的时间同步）
  onShow() {
    // 如果游戏进行中，立即更新一次时间显示
    if (!this.data.isGameOver && this.data.startTime) {
      this.updateTimeUsed()
    }
  },

  // 页面隐藏时（切屏或锁屏）不需要特殊处理，因为时间计算基于时间戳

  // 开始计时 - 使用服务器时间戳，防止切屏暂停
  startTimer() {
    // 记录开始时间戳
    const startTime = Date.now()
    this.setData({ startTime })

    // 每秒更新一次显示，但计算基于当前时间戳差值
    const timerInterval = setInterval(() => {
      this.updateTimeUsed()
    }, 1000)

    this.setData({ timerInterval })
  },

  // 更新已用时间
  updateTimeUsed() {
    const { startTime } = this.data
    if (!startTime) return
    
    // 基于当前时间戳计算，不受切屏影响
    const timeUsed = Math.floor((Date.now() - startTime) / 1000)
    this.setData({ timeUsed })
  },

  // 停止计时
  stopTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval)
      this.setData({ timerInterval: null })
    }
  },

  // 生成随机密码
  generateSecret() {
    const { allowRepeat, digitCount } = this.data
    let secret = ''

    if (!allowRepeat) {
      // 数字不重复模式
      const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
      for (let i = 0; i < digitCount; i++) {
        const index = Math.floor(Math.random() * digits.length)
        secret += digits[index]
        digits.splice(index, 1)
      }
    } else {
      // 数字可重复模式：最多只能有1个数字重复（即最多2个相同数字）
      // 且不能有2对重复（如 1122）
      // 所有数字里，至少要有 digitCount-1 个不同的数字
      // 使用循环而不是递归，避免重复执行后续代码
      while (true) {
        secret = ''
        for (let i = 0; i < digitCount; i++) {
          secret += Math.floor(Math.random() * 10)
        }

        // 检查数字分布
        const digitCountMap = {}
        for (let char of secret) {
          digitCountMap[char] = (digitCountMap[char] || 0) + 1
        }

        const counts = Object.values(digitCountMap)
        const maxCount = Math.max(...counts)
        const pairCount = counts.filter(c => c === 2).length

        // 满足条件：没有数字出现3次及以上，且没有2对重复
        if (maxCount <= 2 && pairCount <= 1) {
          break
        }
      }
    }

    // ⚠️ 关键：统一设置正确答案，避免之前的不重复模式BUG
    this.setData({ correctAnswer: secret }, () => {
      // 验证答案已正确设置
      if (!this.data.correctAnswer || this.data.correctAnswer.length !== digitCount) {
        console.error('❌ 答案生成错误:', this.data.correctAnswer)
        // 重新生成
        this.generateSecret()
      } else {
        console.log('✅ 答案已生成，长度:', digitCount)
      }
    })
  },

  // 计算已确认的正确数字（位置和值都正确）
  calculateConfirmedDigits(guesses, digitCount) {
    const confirmed = new Array(digitCount).fill(null)
    if (!guesses || guesses.length === 0) return confirmed

    const secret = this.data.correctAnswer
    if (!secret) return confirmed

    // 遍历所有猜测记录，找出位置正确的数字
    guesses.forEach(guess => {
      const guessStr = guess.guess || guess
      if (!guessStr) return
      for (let i = 0; i < guessStr.length && i < digitCount; i++) {
        // 如果这个数字在这个位置与秘密数字相同，则确认
        if (guessStr[i] === secret[i]) {
          confirmed[i] = guessStr[i]
        }
      }
    })

    return confirmed
  },

  // 格式化猜测记录
  formatGuesses(guesses) {
    if (!guesses || guesses.length === 0) return []
    // 倒序排列，最新的猜测显示在最上面
    const reversedGuesses = [...guesses].reverse()
    return reversedGuesses.map((guess, index) => {
      // 获取猜测字符串
      let guessStr = ''
      if (guess.guess) {
        guessStr = guess.guess.toString()
      } else if (typeof guess === 'string') {
        guessStr = guess
      }
      
      if (!guessStr) return { digits: ['', '', '', ''], score: 0, a: 0, b: 0, hints: [], displayIndex: guesses.length - index }
      
      // 将字符串转为单个字符数组
      const digits = guessStr.split('').map(char => char.toString())
      
      // 计算每个位置的提示（A=正确，B=数字对位置错，X=不对）
      const hints = this.calculatePositionHints(guess)
      return {
        digits: digits,
        score: guess.score || 0,
        a: guess.a !== undefined ? guess.a : (guess.score || 0),
        b: guess.b || 0,
        hints: hints,
        displayIndex: guesses.length - index // 显示的序号（从1开始）
      }
    })
  },

  // 计算每个位置的提示标记
  calculatePositionHints(guessRecord) {
    if (!guessRecord) return []
    const secret = this.data.correctAnswer
    if (!secret) return []

    // 兼容两种数据格式
    const guess = guessRecord.guess || guessRecord
    if (!guess) return []
    
    const guessStr = guess.toString()
    const hints = []

    for (let i = 0; i < guessStr.length; i++) {
      if (i < secret.length && guessStr[i] === secret[i]) {
        hints.push('A')  // 位置和数字都正确
      } else if (secret.includes(guessStr[i])) {
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
    const { inputBuffer, digitCount, hintMode, displayDigits, timeUsed, isSubmitting } = this.data

    // 防止重复提交
    if (isSubmitting) return

    // 获取正确答案
    const correctAnswer = this.data.correctAnswer

    // 构建完整的猜测数字
    // 提示模式下，从 displayDigits 获取完整数字；非提示模式下，使用 inputBuffer
    const fullGuess = hintMode ? displayDigits.join('') : inputBuffer

    // 计算A/B提示
    const hints = this.calculateHints(correctAnswer, fullGuess)
    const isWin = hints.a === digitCount

    // 保存猜测记录（原始数据）
    const guessRecord = {
      guess: fullGuess,     // 使用完整的猜测数字
      a: hints.a,           // 位置和数字都正确
      b: hints.b,           // 数字正确但位置错误
      score: hints.a,       // 兼容旧数据
      isWin: isWin
    }

    // 更新原始猜测历史
    const newRawGuesses = [...this.data.rawGuesses, guessRecord]

    // 单人模式：猜对后直接在页面显示胜利弹窗
    if (isWin) {
      // 停止计时
      this.stopTimer()

      // 播放胜利音效
      audio.victoryTap()

      // 格式化猜测记录用于显示
      const displayGuesses = this.formatGuesses(newRawGuesses)

      // 显示胜利弹窗
      this.setData({
        isGameOver: true,
        showWinModal: true,
        rawGuesses: newRawGuesses,
        playerGuesses: displayGuesses,
        isSubmitting: true
      })

      // 提交成绩到云端
      this.submitResult(newRawGuesses.length, timeUsed)
      return
    }

    // 单人模式：没猜对，继续猜测，更新页面显示
    const { hintMode: currentHintMode } = this.data

    // 重新计算已确认的数字（使用原始数据）
    const confirmedDigits = this.calculateConfirmedDigits(newRawGuesses, digitCount)

    // 如果提示模式开启，自动填写已猜对的数字
    let newDisplayDigits = new Array(digitCount).fill('')
    let newInputBuffer = ''

    if (currentHintMode) {
      for (let i = 0; i < digitCount; i++) {
        if (confirmedDigits[i] !== null) {
          newDisplayDigits[i] = confirmedDigits[i]
          newInputBuffer += confirmedDigits[i]
        }
      }
    }

    // 格式化猜测记录用于显示
    const displayGuesses = this.formatGuesses(newRawGuesses)

    this.setData({
      inputBuffer: newInputBuffer,
      displayDigits: newDisplayDigits,
      canConfirm: newInputBuffer.length === digitCount,
      rawGuesses: newRawGuesses,
      playerGuesses: displayGuesses,
      confirmedDigits: confirmedDigits,
      editIndex: -1
    })
  },

  // 提交成绩到云端
  async submitResult(guessCount, timeUsed) {
    try {
      const result = await dailyChallenge.submitDailyResult('success', guessCount, timeUsed)
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
      // 开启提示模式：使用原始数据重新计算并自动填写已确认的数字
      const confirmedDigits = this.calculateConfirmedDigits(this.data.rawGuesses, digitCount)

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
    // 使用 reLaunch 直接重启到首页
    wx.reLaunch({
      url: '/pages/index/index',
      success: () => {
        console.log('返回首页成功')
      },
      fail: (err) => {
        console.error('返回首页失败', err)
        // 失败时尝试 navigateTo
        wx.navigateTo({
          url: '/pages/index/index'
        })
      }
    })
  },

  // 再来一局（返回首页重新进入）
  playAgain() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  // 查看排行榜
  goToRank() {
    // 使用 navigateTo 跳转
    wx.navigateTo({
      url: '/pages/ranking/ranking',
      success: () => {
        console.log('跳转排行榜成功')
      },
      fail: (err) => {
        console.error('跳转排行榜失败', err)
        // 失败时尝试 redirectTo
        wx.redirectTo({
          url: '/pages/ranking/ranking'
        })
      }
    })
  },

  // 切换猜测历史展开/收起
  toggleHistory() {
    this.setData({
      showAllHistory: !this.data.showAllHistory
    })
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 每日挑战',
      path: '/pages/daily-game/daily-game',
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
