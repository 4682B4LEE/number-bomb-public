// 密码设置页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')

Page({
  data: {
    player: 1,           // 当前设置密码的玩家
    nextPlayer: 2,       // 下一个设置密码的玩家
    nextPlayerName: '',  // 下一个玩家的名称
    isP1: true,          // 是否是玩家1
    playerName: '',      // 玩家名称
    digitCount: 4,       // 密码位数
    inputBuffer: '',     // 输入缓冲区
    displayDigits: [],   // 显示的数字数组
    canConfirm: false,   // 是否可以确认
    hintText: '',        // 提示文字
    editIndex: -1        // 当前编辑的数字索引，-1表示未编辑
  },

  onLoad(options) {
    const player = parseInt(options.player || '1')
    const nextPlayer = parseInt(options.nextPlayer || '2')
    const nextPlayerName = decodeURIComponent(options.nextPlayerName || '')
    const isP1 = player === 1
    const digitCount = app.globalData.digitCount
    const playerName = isP1 ? app.globalData.p1Name : app.globalData.p2Name

    this.setData({
      player,
      nextPlayer,
      nextPlayerName,
      isP1,
      playerName,
      digitCount,
      displayDigits: new Array(digitCount).fill(''),
      hintText: `请输入${digitCount}位数字密码`
    })
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
      canConfirm: inputBuffer.length === digitCount,
      hintText: this.getHintText()
    })
  },

  // 获取提示文字
  getHintText() {
    const { inputBuffer, digitCount, editIndex } = this.data
    if (editIndex >= 0) {
      return `正在编辑第 ${editIndex + 1} 位数字`
    }
    if (inputBuffer.length === digitCount) {
      return '密码已输入完整，点击数字可修改'
    }
    return `还需输入 ${digitCount - inputBuffer.length} 位数字`
  },

  // 点击数字框进入编辑模式
  onDigitTap(e) {
    const index = e.currentTarget.dataset.index
    const { inputBuffer, digitCount } = this.data

    // 只能编辑已输入的数字
    if (index < inputBuffer.length) {
      // 播放按键音效
      audio.keyTap()
      this.setData({
        editIndex: index,
        hintText: `正在编辑第 ${index + 1} 位数字`
      })
    }
  },

  // 取消编辑模式
  cancelEdit() {
    this.setData({
      editIndex: -1
    }, () => {
      this.updateDisplay()
    })
  },

  // 按下数字键
  onKeyPress(e) {
    // 播放按键音效和触动反馈
    audio.keyTap()
    const key = e.currentTarget.dataset.key
    const { inputBuffer, digitCount, editIndex } = this.data

    if (editIndex >= 0) {
      // 编辑模式：替换指定位置的数字
      const newBuffer = inputBuffer.substring(0, editIndex) + key + inputBuffer.substring(editIndex + 1)
      this.setData({
        inputBuffer: newBuffer,
        editIndex: -1  // 编辑完成后退出编辑模式
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
      inputBuffer: ''
    }, () => {
      this.updateDisplay()
    })
  },

  // 确认密码
  onConfirm() {
    // 播放确认音效和触动反馈
    audio.confirmTap()
    const { player, nextPlayer, nextPlayerName, inputBuffer } = this.data
    const { p1Name, p2Name, firstSetSecretPlayer, secondSetSecretPlayer, firstGuessPlayer } = app.globalData

    if (player === firstSetSecretPlayer) {
      // 第一个设置密码的玩家完成设置
      if (player === 1) {
        app.globalData.p1Secret = inputBuffer
      } else {
        app.globalData.p2Secret = inputBuffer
      }
      
      // 跳转到过渡页，提示第二个玩家设置密码
      const secondPlayerName = firstSetSecretPlayer === 1 ? p2Name : p1Name
      wx.redirectTo({
        url: `/pages/intermission/intermission?message=${encodeURIComponent(`请 ${secondPlayerName} 设定密码`)}&nextPage=secret&player=${secondSetSecretPlayer}&phase=second`
      })
    } else {
      // 第二个设置密码的玩家完成设置
      if (player === 1) {
        app.globalData.p1Secret = inputBuffer
      } else {
        app.globalData.p2Secret = inputBuffer
      }
      
      // 双方都完成密码设置，根据抛硬币结果决定谁先猜
      const firstGuessPlayerName = firstGuessPlayer === 1 ? p1Name : p2Name
      app.globalData.currentTurnPlayer = firstGuessPlayer
      
      wx.redirectTo({
        url: `/pages/intermission/intermission?message=${encodeURIComponent(`游戏开始！${firstGuessPlayerName} 先手`)}&nextPage=game&player=${firstGuessPlayer}`
      })
    }
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 设置密码',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 设置密码',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
