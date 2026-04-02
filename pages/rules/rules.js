Page({
  data: {
    // 控制当前显示的视图：'main' (列表), 'detail-guess', 'detail-color', 'detail-online'
    currentView: 'main' 
  },

  onLoad: function (options) {
    // 支持从外部直接跳转到某个特定的规则详情页
    // 例如：wx.navigateTo({ url: '/pages/rules/rules?view=detail-color' })
    if (options && options.view) {
      this.setData({
        currentView: options.view
      });
    }
  },

  // 切换视图的事件处理函数
  switchView: function (e) {
    const view = e.currentTarget.dataset.view;
    this.setData({
      currentView: view
    });
    // 切换视图后自动滚动到页面顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  },

  // 自定义返回按钮逻辑
  goBack: function () {
    if (this.data.currentView === 'main') {
      // 如果当前在主列表页，直接返回上一页小程序页面
      wx.navigateBack({
        delta: 1,
        fail: () => {
          // 如果没有上一页（比如分享进入的），则跳转到首页
          wx.switchTab({ url: '/pages/index/index' }); 
        }
      });
    } else {
      // 如果当前在详情页，则返回到规则主列表
      this.setData({
        currentView: 'main'
      });
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      });
    }
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 游戏规则',
      path: '/pages/rules/rules',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 游戏规则',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})