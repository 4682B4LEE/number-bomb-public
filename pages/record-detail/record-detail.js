// 对局详情页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')
const HistoryManager = require('../../utils/historyManager.js')

Page({
  data: {
    // 控制加载动画的状态
    isLoading: true,

    // 对局数据
    matchData: {
      gameType: '', // 'number' | 'color'
      status: '', // 'win' | 'lose'
      type: '',
      players: { p1: '', p2: '' },
      firstPlayer: 1, // 1 或 2，表示谁先手
      correctAnswerP1: [],
      correctAnswerP2: [],
      correctAnswer: [], // 猜颜色时使用的统一正确答案
      guessCount: { p1: 0, p2: 0 },
      time: '',
      history: []
    }
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.loadRecordDetail(id)
    } else {
      wx.showToast({
        title: '记录ID不存在',
        icon: 'none'
      })
      wx.navigateBack()
    }
  },

  // 加载对局详情
  loadRecordDetail(recordId) {
    // 先尝试从本地存储获取
    const localRecord = HistoryManager.getRecordById(recordId)

    if (localRecord) {
      // 本地记录存在，直接使用
      console.log('从本地加载对局详情:', recordId)
      this.processRecordData(localRecord)
      this.setData({ isLoading: false })
    } else {
      // 本地不存在，尝试从云端获取（联机模式）
      console.log('从云端加载对局详情:', recordId)
      wx.cloud.callFunction({
        name: 'getRecordDetail',
        data: {
          recordId
        },
        success: (res) => {
          if (res.result.success) {
            const record = res.result.data
            this.processRecordData(record)
          } else {
            wx.showToast({
              title: res.result.message || '获取记录失败',
              icon: 'none'
            })
          }
        },
        fail: (err) => {
          console.log('获取对局详情失败', err)
          wx.showToast({
            title: '获取记录失败',
            icon: 'none'
          })
        },
        complete: () => {
          this.setData({ isLoading: false })
        }
      })
    }
  },

  // 解析联机对战的 history 字段
  // 猜数字格式: "playerRole:guess=guessValue:result=aAbB" 例如: "host:guess=1234:result=1A2B"
  // 猜颜色格式: "playerRole:guess=colors:result=xRyW" 例如: "host:guess=red,blue,green,yellow:result=2R1W"
  parseOnlineHistory(historyStr, gameType = 'number') {
    if (!historyStr || typeof historyStr !== 'string') return []
    
    // 使用正则表达式分割历史记录条目
    // 格式: "player:guess=xxx:result=xxx"
    // 注意：猜颜色的 guess 值可能包含逗号，所以不能直接用 split(',')
    const entries = []
    const regex = /(host|guest):guess=([^:]+):result=([^,]+)/g
    let match
    
    while ((match = regex.exec(historyStr)) !== null) {
      const player = match[1]
      const guessValue = match[2]
      const resultStr = match[3]
      
      // 解析 guess
      let guess = ''
      let colors = []
      if (gameType === 'color') {
        // 猜颜色：guess 是逗号分隔的颜色
        colors = guessValue.split(',')
        guess = colors.join('-')
      } else {
        // 猜数字
        guess = guessValue
      }
      
      // 解析 result
      let a = 0, b = 0, red = 0, white = 0
      if (gameType === 'color') {
        // 猜颜色格式: "2R1W"
        const resultMatch = resultStr.match(/(\d+)R(\d+)W/)
        if (resultMatch) {
          red = parseInt(resultMatch[1]) || 0
          white = parseInt(resultMatch[2]) || 0
        }
      } else {
        // 猜数字格式: "1A2B"
        const resultMatch = resultStr.match(/(\d+)A(\d+)B/)
        if (resultMatch) {
          a = parseInt(resultMatch[1]) || 0
          b = parseInt(resultMatch[2]) || 0
        }
      }
      
      entries.push({
        guess,
        colors,
        a,
        b,
        red,
        white,
        player,
        gameType
      })
    }
    
    return entries
  },

  // 解析序列化的猜测记录（猜数字）
  parseSerializedGuesses(guessStr) {
    if (!guessStr || typeof guessStr !== 'string') return []
    return guessStr.split(',').filter(item => item).map(item => {
      const parts = item.split(':')
      return {
        guess: parts[0] || '',
        a: parseInt(parts[1]) || 0,
        b: parseInt(parts[2]) || 0
      }
    })
  },

  // 解析序列化的猜测记录（猜颜色）
  parseSerializedColorGuesses(guessStr) {
    if (!guessStr || typeof guessStr !== 'string') return []
    return guessStr.split(',').filter(item => item).map(item => {
      const parts = item.split(':')
      // 猜颜色的 guess 是颜色数组，用 '-' 连接，如 "red-green-blue-yellow"
      const colors = parts[0] ? parts[0].split('-') : []
      return {
        colors: colors,  // 使用 colors 字段名，与 formatHistory 中的 guess.colors 对应
        red: parseInt(parts[1]) || 0,    // 使用 red 字段名
        white: parseInt(parts[2]) || 0   // 使用 white 字段名
      }
    })
  },

  // 处理对局数据 - 将云函数返回的数据转换为页面需要的格式
  processRecordData(record) {
    // 兼容新旧数据格式
    // 新格式使用短字段名，旧格式使用长字段名
    const isNewFormat = record.gt !== undefined

    // 判断是否为联机对战模式
    const isOnlineMode = record.gm === 'online' || record.isOnlineMode === true

    // 提取字段（兼容新旧格式）
    const gameType = isNewFormat ? record.gt : (record.gameType || 'number')
    const digitCount = isNewFormat ? record.dc : (record.digitCount || 4)
    const player1Name = isNewFormat ? record.p1 : (record.player1Name || '玩家1')
    const player2Name = isNewFormat ? record.p2 : (record.player2Name || '玩家2')
    const winner = isNewFormat ? record.w : record.winner
    // 处理先手玩家：可能是字符串 'host'/'guest' 或数字 1/2
    let firstPlayer = isNewFormat ? record.fp : (record.firstPlayer || 1)
    // 如果是字符串 'host'/'guest'，转换为数字 1/2
    if (firstPlayer === 'host') {
      firstPlayer = 1
    } else if (firstPlayer === 'guest') {
      firstPlayer = 2
    } else {
      firstPlayer = parseInt(firstPlayer) || 1
    }
    const isSingleMode = isNewFormat ? record.sm : (record.isSingleMode || false)

    // 解析猜测记录
    let p1Guesses = []
    let p2Guesses = []

    if (isOnlineMode) {
      // 联机对战模式：使用 h (history) 字段
      const historyStr = record.h || ''
      const allGuesses = this.parseOnlineHistory(historyStr, gameType)
      // p1 是 host，p2 是 guest
      p1Guesses = allGuesses.filter(g => g.player === 'host')
      p2Guesses = allGuesses.filter(g => g.player === 'guest')
    } else if (isNewFormat) {
      // 新格式：根据游戏类型使用不同的解析方法
      if (gameType === 'number') {
        p1Guesses = this.parseSerializedGuesses(record.g1)
        p2Guesses = this.parseSerializedGuesses(record.g2)
      } else {
        // 猜颜色
        p1Guesses = this.parseSerializedColorGuesses(record.g1)
        p2Guesses = this.parseSerializedColorGuesses(record.g2)
      }
    } else {
      // 旧格式：直接使用数组
      if (gameType === 'number') {
        p1Guesses = record.p1Guesses || []
        p2Guesses = record.p2Guesses || []
      } else {
        // 猜颜色旧格式
        p1Guesses = record.colorGuesses?.p1 || []
        p2Guesses = record.colorGuesses?.p2 || []
      }
    }

    // 格式化时间 - 兼容新旧数据格式：旧格式 createTime，新格式 ct
    const timeField = record.createTime || record.ct
    let time = '--'
    if (timeField) {
      const date = new Date(timeField)
      if (!isNaN(date.getTime())) {
        time = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      }
    }

    // 游戏模式文本
    let type = ''
    if (gameType === 'number') {
      type = `${digitCount}位数字`
    } else {
      const colorMode = isNewFormat ? record.cm : record.colorMode
      type = colorMode === 'unique' ? '颜色不重复' : '颜色可重复'
    }

    // 判断胜负状态
    let displayWinner = winner
    // 联机模式：winner 是 'host' 或 'guest'，需要转换为 1 或 2
    if (isOnlineMode) {
      displayWinner = (winner === 'host') ? 1 : 2
    }
    const status = displayWinner === 1 ? 'win' : 'lose'

    // 确定获胜方名称
    const winnerName = displayWinner === 1
      ? (player1Name || '玩家1')
      : (player2Name || '玩家2')

    // 处理正确答案
    let correctAnswerP1 = []
    let correctAnswerP2 = []
    let correctAnswer = [] // 猜颜色时使用的统一正确答案

    if (gameType === 'number') {
      // 猜数字：分别处理P1和P2的正确答案（兼容新旧格式）
      let p1Answer, p2Answer

      if (isOnlineMode) {
        // 联机模式：ms (mySecret) 和 os (opponentSecret) 存储密码
        // p1 是 host，p2 是 guest
        // 当前用户是 host：ms 是 host 的密码，os 是 guest 的密码
        // 当前用户是 guest：ms 是 guest 的密码，os 是 host 的密码
        // 需要根据 mr (myRole) 判断
        const myRole = record.mr || 'host'
        if (myRole === 'host') {
          p1Answer = record.ms  // host 的密码
          p2Answer = record.os  // guest 的密码
        } else {
          p1Answer = record.os  // host 的密码
          p2Answer = record.ms  // guest 的密码
        }
      } else {
        p1Answer = isNewFormat ? record.a1 : record.p1CorrectAnswer
        p2Answer = isNewFormat ? record.a2 : record.p2CorrectAnswer
      }

      if (Array.isArray(p1Answer)) {
        correctAnswerP1 = p1Answer.map(String)
      } else if (typeof p1Answer === 'string') {
        correctAnswerP1 = p1Answer.split('')
      } else if (typeof p1Answer === 'number') {
        correctAnswerP1 = String(p1Answer).split('')
      }

      if (Array.isArray(p2Answer)) {
        correctAnswerP2 = p2Answer.map(String)
      } else if (typeof p2Answer === 'string') {
        correctAnswerP2 = p2Answer.split('')
      } else if (typeof p2Answer === 'number') {
        correctAnswerP2 = String(p2Answer).split('')
      }
    } else {
      // 猜颜色：只显示一个正确答案，从 colorSecret 获取颜色名称数组
      const colors = isNewFormat ? record.cs : record.colorSecret
      if (Array.isArray(colors)) {
        correctAnswer = colors
      } else if (typeof colors === 'string') {
        // 处理逗号分隔的颜色字符串，如 "red,blue,green,yellow"
        correctAnswer = colors.split(',').filter(c => c.trim())
      }
    }

    // 计算猜测次数（使用已解析的 p1Guesses 和 p2Guesses）
    const p1GuessCount = p1Guesses.length
    const p2GuessCount = p2Guesses.length
    
    // 调试日志
    console.log('解析记录:', { isNewFormat, gameType, p1Guesses, p2Guesses, p1GuessCount, p2GuessCount })

    // 处理历史记录 - 按照先后手顺序排列
    const history = this.formatHistory(p1Guesses, p2Guesses, firstPlayer, gameType)

    // 提取头像（兼容新旧格式）
    let p1Avatar = '', p2Avatar = ''
    if (isOnlineMode) {
      // 联机模式：p1a (player1 avatar), p2a (player2 avatar)
      p1Avatar = record.p1a || ''
      p2Avatar = record.p2a || ''
    } else if (isNewFormat) {
      p1Avatar = record.p1a || ''
      p2Avatar = record.p2a || ''
    } else {
      p1Avatar = record.player1Avatar || ''
      p2Avatar = record.player2Avatar || ''
    }

    // 处理 cloud:// 格式的头像：初始显示为空，等转换完成后再显示
    // 因为微信小程序会把 cloud:// 解析为本地路径，导致错误
    let displayP1Avatar = p1Avatar
    let displayP2Avatar = p2Avatar
    
    if (p1Avatar && p1Avatar.startsWith('cloud://')) {
      displayP1Avatar = '' // 先不显示，等转换完成
    }
    if (p2Avatar && p2Avatar.startsWith('cloud://')) {
      displayP2Avatar = '' // 先不显示，等转换完成
    }

    // 设置页面数据（cloud:// 头像先不显示，等转换后再更新）
    this.setData({
      matchData: {
        gameType,
        status,
        winnerName,
        type,
        players: {
          p1: player1Name || '玩家1',
          p2: player2Name || '玩家2',
          p1Avatar: displayP1Avatar,
          p2Avatar: displayP2Avatar
        },
        firstPlayer: firstPlayer,
        correctAnswerP1,
        correctAnswerP2,
        correctAnswer,
        guessCount: { p1: p1GuessCount, p2: p2GuessCount },
        time,
        history,
        isSingleMode: isSingleMode || false
      }
    })

    // 如果有 cloud:// 格式的头像，转换为 https://
    this.convertCloudAvatarToHttps(p1Avatar, p2Avatar)
  },

  // 将 cloud:// 头像转换为 https:// 链接
  convertCloudAvatarToHttps(p1Avatar, p2Avatar) {
    // 收集需要转换的 cloud:// 链接
    const fileList = []
    if (p1Avatar && p1Avatar.startsWith('cloud://')) {
      fileList.push(p1Avatar)
    }
    if (p2Avatar && p2Avatar.startsWith('cloud://')) {
      fileList.push(p2Avatar)
    }

    // 如果没有 cloud:// 链接，直接返回
    if (fileList.length === 0) {
      return
    }

    // 调用云开发接口获取临时链接
    wx.cloud.getTempFileURL({
      fileList: fileList,
      success: (res) => {
        // 更新头像链接 - 使用 fileID 匹配，确保顺序正确
        const updateData = {}
        
        res.fileList.forEach((file) => {
          if (file.fileID === p1Avatar) {
            updateData['matchData.players.p1Avatar'] = file.tempFileURL
          } else if (file.fileID === p2Avatar) {
            updateData['matchData.players.p2Avatar'] = file.tempFileURL
          }
        })
        
        if (Object.keys(updateData).length > 0) {
          this.setData(updateData)
        }
      },
      fail: (err) => {
        // 失败时保持原链接（cloud:// 可能也能显示）
      }
    })
  },

  // 格式化历史记录 - 按照先后手顺序排列
  formatHistory(p1Guesses, p2Guesses, firstPlayer, gameType) {
    const history = []

    if (gameType === 'number') {
      // 猜数字：合并P1和P2的猜测，按照先后手顺序排列
      // 找出最大轮次
      const maxLen = Math.max(p1Guesses.length, p2Guesses.length)
      let round = 1

      for (let i = 0; i < maxLen; i++) {
        // 如果P1先手，先加P1；如果P2先手，先加P2
        if (firstPlayer === 1) {
          // P1先手：P1 -> P2
          if (i < p1Guesses.length) {
            const guess = p1Guesses[i]
            history.push({
              id: `p1-${i}`,
              player: 'p1',
              round: round++,
              guess: this.formatGuess(guess.guess),
              result: {
                a: guess.a || 0,
                b: guess.b || 0
              }
            })
          }
          if (i < p2Guesses.length) {
            const guess = p2Guesses[i]
            history.push({
              id: `p2-${i}`,
              player: 'p2',
              round: round++,
              guess: this.formatGuess(guess.guess),
              result: {
                a: guess.a || 0,
                b: guess.b || 0
              }
            })
          }
        } else {
          // P2先手：P2 -> P1
          if (i < p2Guesses.length) {
            const guess = p2Guesses[i]
            history.push({
              id: `p2-${i}`,
              player: 'p2',
              round: round++,
              guess: this.formatGuess(guess.guess),
              result: {
                a: guess.a || 0,
                b: guess.b || 0
              }
            })
          }
          if (i < p1Guesses.length) {
            const guess = p1Guesses[i]
            history.push({
              id: `p1-${i}`,
              player: 'p1',
              round: round++,
              guess: this.formatGuess(guess.guess),
              result: {
                a: guess.a || 0,
                b: guess.b || 0
              }
            })
          }
        }
      }
    } else {
      // 猜颜色：合并P1和P2的猜测，按照先后手顺序排列
      const maxLen = Math.max(p1Guesses.length, p2Guesses.length)
      let round = 1

      // 辅助函数：获取颜色数组（兼容多种字段名）
      const getColors = (guess) => {
        return guess.colors || guess.guess || []
      }

      // 辅助函数：获取红色提示数（兼容多种字段名）
      const getRed = (guess) => {
        return guess.red ?? guess.hints?.red ?? guess.a ?? 0
      }

      // 辅助函数：获取白色提示数（兼容多种字段名）
      const getWhite = (guess) => {
        return guess.white ?? guess.hints?.white ?? guess.b ?? 0
      }

      for (let i = 0; i < maxLen; i++) {
        if (firstPlayer === 1) {
          // P1先手：P1 -> P2
          if (i < p1Guesses.length) {
            const guess = p1Guesses[i]
            const colors = getColors(guess)
            history.push({
              id: `p1-${i}`,
              player: 'p1',
              round: round++,
              guess: this.formatColorGuess(colors),
              colorArray: colors,
              result: {
                a: getRed(guess),
                b: getWhite(guess)
              }
            })
          }
          if (i < p2Guesses.length) {
            const guess = p2Guesses[i]
            const colors = getColors(guess)
            history.push({
              id: `p2-${i}`,
              player: 'p2',
              round: round++,
              guess: this.formatColorGuess(colors),
              colorArray: colors,
              result: {
                a: getRed(guess),
                b: getWhite(guess)
              }
            })
          }
        } else {
          // P2先手：P2 -> P1
          if (i < p2Guesses.length) {
            const guess = p2Guesses[i]
            const colors = getColors(guess)
            history.push({
              id: `p2-${i}`,
              player: 'p2',
              round: round++,
              guess: this.formatColorGuess(colors),
              colorArray: colors,
              result: {
                a: getRed(guess),
                b: getWhite(guess)
              }
            })
          }
          if (i < p1Guesses.length) {
            const guess = p1Guesses[i]
            const colors = getColors(guess)
            history.push({
              id: `p1-${i}`,
              player: 'p1',
              round: round++,
              guess: this.formatColorGuess(colors),
              colorArray: colors,
              result: {
                a: getRed(guess),
                b: getWhite(guess)
              }
            })
          }
        }
      }
    }

    return history
  },

  // 格式化猜数字的猜测值 - 兼容数组和字符串格式
  formatGuess(guess) {
    if (!guess) return ''
    // 如果是数组，用空格连接
    if (Array.isArray(guess)) {
      return guess.join(' ')
    }
    // 如果是字符串，直接返回
    if (typeof guess === 'string') {
      return guess
    }
    // 如果是数字，转为字符串
    if (typeof guess === 'number') {
      return String(guess)
    }
    return String(guess)
  },

  // 格式化猜颜色的猜测值 - 兼容数组和字符串格式
  formatColorGuess(colors) {
    if (!colors) return ''
    // 如果是数组，转换为emoji后用空格连接
    if (Array.isArray(colors)) {
      return colors.map(this.getColorEmoji).join(' ')
    }
    // 如果是字符串，直接返回
    if (typeof colors === 'string') {
      return colors
    }
    return String(colors)
  },

  // 获取颜色emoji
  getColorEmoji(color) {
    const colorMap = {
      'red': '🔴',
      'yellow': '🟡',
      'blue': '🔵',
      'green': '🟢',
      'purple': '🟣',
      'orange': '🟠'
    }
    return colorMap[color] || '⚪'
  },

  // 返回上一页
  goBack() {
    // 播放返回音效
    audio.deleteTap()
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果是从分享卡片直接进入，没有上一页记录时，回退到首页
        wx.reLaunch({
          url: '/pages/index/index'
        })
      }
    })
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 对局详情',
      path: '/pages/records/records',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 对局详情',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
