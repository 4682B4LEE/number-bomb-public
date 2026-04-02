// 过渡页逻辑
const app = getApp()
const audio = require('../../utils/audio.js')

Page({
  data: {
    message: '',
    nextPage: '',
    player: 1,
    isP1: true,
    bgClass: 'bg-p1'
  },

  onLoad(options) {
    // 解析页面参数
    const message = decodeURIComponent(options.message || '')
    const nextPage = options.nextPage || ''
    const player = parseInt(options.player || '1')

    const isP1 = player === 1

    this.setData({
      message,
      nextPage,
      player,
      isP1,
      bgClass: isP1 ? 'bg-p1' : 'bg-p2'
    })
  },

  // 点击继续
  continue() {
    // 播放确认音效和触动反馈
    audio.confirmTap()
    const { nextPage, player } = this.data

    if (nextPage === 'secret') {
      // 跳转到密码设置页
      wx.redirectTo({
        url: `/pages/secret/secret?player=${player}`
      })
    } else if (nextPage === 'game') {
      // 跳转到游戏页
      wx.redirectTo({
        url: '/pages/game/game'
      })
    }
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 游戏进行中',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 游戏进行中',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
