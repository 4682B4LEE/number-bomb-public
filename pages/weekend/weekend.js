// 疯狂周末活动页面逻辑
Page({
  data: {
    // 页面数据
  },

  onLoad() {
    // 页面加载时的逻辑
  },

  onShow() {
    // 页面显示时的逻辑
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  // 复制微信号
  copyWechat() {
    wx.setClipboardData({
      data: 'SSSXW2026',
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 疯狂周末',
      path: '/pages/weekend/weekend',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 疯狂周末',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
